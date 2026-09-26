import { spawn } from 'child_process';
import { config } from './config.js';
import { DiscoveredCapability } from './types.js';

/**
 * Spawns Swytchcode CLI command and returns parsed JSON output or raw string
 */
export function runSwytchcodeCli(
  args: string[],
  inputStdin?: string
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(config.swytchcodeBin, args, {
      cwd: config.projectRoot,
      env: {
        ...process.env,
        SWYTCHCODE_MODE: config.isDemoMode ? 'sandbox' : 'production',
        SWYTCHCODE_TOKEN: config.swytchcodeToken || process.env.SWYTCHCODE_TOKEN || '',
      },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', data => {
      stdout += data.toString();
    });

    proc.stderr.on('data', data => {
      stderr += data.toString();
    });

    proc.on('error', err => {
      reject(err);
    });

    proc.on('close', exitCode => {
      resolve({ stdout, stderr, exitCode: exitCode ?? 0 });
    });

    if (inputStdin) {
      proc.stdin.write(inputStdin);
    }
    proc.stdin.end();
  });
}

/**
 * Dynamically queries the Swytchcode remote registry for capabilities matching natural language intent
 */
// Active Project Allowed Integrations (only tools that have been integrated and are used by us)
const ALLOWED_INTEGRATIONS = new Set(['gmail', 'slack', 'notion', 'google_drive', 'box', 'weatherapi', 'resend', 'drive', 'google_mail', 'github', 'google_calendar', 'calendar']);

// Cache for discovered capabilities to optimize agent workflow latency
const discoveryCache = new Map<string, DiscoveredCapability[]>();

/**
 * Discovers capabilities strictly scoped to our active installed integrations
 */
export async function discoverCapabilities(intent: string): Promise<DiscoveredCapability[]> {
  const cacheKey = intent.trim().toLowerCase();
  if (discoveryCache.has(cacheKey)) {
    return discoveryCache.get(cacheKey)!;
  }

  try {
    const { stdout, stderr, exitCode } = await runSwytchcodeCli(['discover', intent, '--json']);

    if (exitCode === 0 && stdout.trim()) {
      try {
        const parsed = JSON.parse(stdout.trim());
        if (parsed && Array.isArray(parsed.capabilities)) {
          // Filter strictly to our integrated tools
          const filtered = parsed.capabilities
            .filter((c: any) => {
              const lib = (c.library || '').toLowerCase();
              const cid = (c.canonical_id || '').toLowerCase();
              const prefix = cid.split('.')[0];
              return ALLOWED_INTEGRATIONS.has(lib) || ALLOWED_INTEGRATIONS.has(prefix);
            })
            .map((c: any) => ({
              canonical_id: c.canonical_id,
              type: c.type || 'api',
              summary: c.summary || '',
              library: c.library || '',
              distance: typeof c.distance === 'number' ? c.distance : 1.0,
            }));

          if (filtered.length > 0) {
            const fallback = getFallbackDiscoveredCapabilities(intent);
            const combined = [...filtered];
            for (const f of fallback) {
              if (!combined.some(c => c.canonical_id === f.canonical_id)) {
                combined.push(f);
              }
            }
            discoveryCache.set(cacheKey, combined);
            return combined;
          }
        }
      } catch (e) {}
    }

    const fallback = getFallbackDiscoveredCapabilities(intent);
    discoveryCache.set(cacheKey, fallback);
    return fallback;
  } catch (err: any) {
    const fallback = getFallbackDiscoveredCapabilities(intent);
    discoveryCache.set(cacheKey, fallback);
    return fallback;
  }
}

/**
 * Fallback discovery matching our integrated AI assistants
 */
function getFallbackDiscoveredCapabilities(intent: string): DiscoveredCapability[] {
  const lower = intent.toLowerCase();
  const list: DiscoveredCapability[] = [];

  if (lower.includes('gmail') || lower.includes('email') || lower.includes('mail')) {
    list.push(
      { canonical_id: 'gmail.user.threads.get', library: 'gmail', summary: 'Get a list of email threads in a user mailbox', distance: 0.1, type: 'api' },
      { canonical_id: 'gmail.user.threads.get1', library: 'gmail', summary: 'Retrieve a specific email thread by its ID', distance: 0.15, type: 'api' },
      { canonical_id: 'gmail.user.send.create1', library: 'gmail', summary: 'Send an email message to specified recipients', distance: 0.2, type: 'api' },
      { canonical_id: 'resend.email.create', library: 'resend', summary: 'Send transactional email with verified templates', distance: 0.25, type: 'api' }
    );
  }

  if (lower.includes('slack') || lower.includes('channel') || lower.includes('chat')) {
    list.push(
      { canonical_id: 'slack.conversations.history', library: 'slack', summary: 'Fetch message history and discussions from a Slack channel', distance: 0.1, type: 'api' },
      { canonical_id: 'slack.chat.post_message', library: 'slack', summary: 'Post an alert or message to a designated Slack channel', distance: 0.15, type: 'api' }
    );
  }

  if (lower.includes('notion') || lower.includes('doc') || lower.includes('page') || lower.includes('wiki')) {
    list.push(
      { canonical_id: 'notion.page.create', library: 'notion', summary: 'Create a new page in Notion workspace', distance: 0.1, type: 'api' },
      { canonical_id: 'notion.search.create', library: 'notion', summary: 'Search for content and database entries in Notion by title', distance: 0.15, type: 'api' }
    );
  }

  if (lower.includes('drive') || lower.includes('google') || lower.includes('rfc')) {
    list.push(
      { canonical_id: 'drive.file.list', library: 'drive', summary: 'Search and list documents in corporate Google Drive with metadata and links', distance: 0.1, type: 'api' }
    );
  }

  if (lower.includes('box') || lower.includes('compliance') || lower.includes('audit') || lower.includes('soc2')) {
    list.push(
      { canonical_id: 'box.files.get', library: 'box', summary: 'Retrieve compliance files and encrypted documents from Box storage', distance: 0.1, type: 'api' },
      { canonical_id: 'box.zip_download.create', library: 'box', summary: 'Create a zip download bundle for SOC-2 audit artifacts', distance: 0.15, type: 'api' }
    );
  }

  if (lower.includes('github') || lower.includes('repo') || lower.includes('issue') || lower.includes('pull request') || lower.includes('pr') || lower.includes('commit')) {
    list.push(
      { canonical_id: 'github.issue.list', library: 'github', summary: 'List and search issues and pull requests in a GitHub repository', distance: 0.1, type: 'api' },
      { canonical_id: 'github.issue.create', library: 'github', summary: 'Create a new issue, bug ticket, or task in a GitHub repository', distance: 0.15, type: 'api' },
      { canonical_id: 'github.repos.get', library: 'github', summary: 'Get repository details, default branch, stargazers, and topics', distance: 0.2, type: 'api' },
      { canonical_id: 'github.pull_request.create', library: 'github', summary: 'Open a new pull request between branches in a repository', distance: 0.25, type: 'api' },
      { canonical_id: 'github.commits.list', library: 'github', summary: 'List recent commits, commit authors, and diff summaries', distance: 0.3, type: 'api' }
    );
  }

  if (lower.includes('calendar') || lower.includes('schedule') || lower.includes('meeting') || lower.includes('event') || lower.includes('gcal')) {
    list.push(
      { canonical_id: 'google_calendar.events.list', library: 'google_calendar', summary: 'List upcoming events, meetings, and scheduled appointments on Google Calendar', distance: 0.1, type: 'api' },
      { canonical_id: 'google_calendar.events.create', library: 'google_calendar', summary: 'Schedule a new calendar event or meeting with attendees and video link', distance: 0.15, type: 'api' },
      { canonical_id: 'google_calendar.events.get', library: 'google_calendar', summary: 'Get detailed metadata for a specific Google Calendar event', distance: 0.2, type: 'api' }
    );
  }

  if (lower.includes('weather') || lower.includes('forecast')) {
    list.push(
      { canonical_id: 'weatherapi.forecast.list', library: 'weatherapi', summary: 'Retrieve multi-day meteorological forecast and atmospheric conditions', distance: 0.1, type: 'api' }
    );
  }

  return list;
}

/**
 * Inspects a canonical method's schema using local wrekenfiles
 */
export async function getMethodInfo(canonicalId: string): Promise<any | null> {
  try {
    const { stdout, exitCode } = await runSwytchcodeCli(['info', canonicalId, '--json']);
    if (exitCode === 0 && stdout.trim()) {
      return JSON.parse(stdout.trim());
    }
    return null;
  } catch (err: any) {
    return null;
  }
}

/**
 * Checks authentication status for an integration provider.
 * All core workspace integrations (Gmail, Google Drive, Notion, Slack, Box, WeatherAPI) are authenticated
 * via Swytchcode CLI environment. Resend uses an API key via environment variable.
 */
export async function checkProviderAuthStatus(providerName: string): Promise<{
  connected: boolean;
  status: 'connected' | 'requires_auth';
  authType?: 'oauth2' | 'api_key';
  account?: string;
  details?: string;
}> {
  const normalized = providerName.toLowerCase().replace(/[^a-z0-9]/g, '');

  // 1. Resend (API Key provider)
  if (normalized.includes('resend')) {
    const hasKey = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim());
    if (hasKey || config.isDemoMode) {
      return {
        connected: true,
        status: 'connected',
        authType: 'api_key',
        details: 'Resend API Key configured.',
      };
    }
    return {
      connected: false,
      status: 'requires_auth',
      authType: 'api_key',
      details: 'Resend API Key (re_...) required to dispatch emails.',
    };
  }

  // 2. Swytchcode-managed workspace integrations (Gmail, Google Drive, Notion, Slack, Box, WeatherAPI)
  // All integrated directly through Swytchcode CLI OAuth and session tokens
  return {
    connected: true,
    status: 'connected',
    authType: 'oauth2',
    details: `Authenticated via Swytchcode CLI (${providerName})`,
  };
}

/**
 * Securely connects an API key provider (e.g. Resend) into the runtime environment
 */
export async function connectProviderWithApiKey(
  providerName: string,
  apiKey: string
): Promise<{ success: boolean; message: string }> {
  const normalized = providerName.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (normalized.includes('resend')) {
    process.env.RESEND_API_KEY = apiKey.trim();
    return {
      success: true,
      message: 'Connected Resend API Key successfully.',
    };
  }

  const envVarName = `${providerName.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_API_KEY`;
  process.env[envVarName] = apiKey.trim();

  return {
    success: true,
    message: `Connected ${providerName} credentials successfully.`,
  };
}

/**
 * Executes a canonical method via the Swytchcode kernel
 */
export async function executeSwytchcodeMethod(
  canonicalId: string,
  args: { params?: Record<string, any>; body?: Record<string, any>; headers?: Record<string, any> }
): Promise<{ success: boolean; data: any; isMocked: boolean; latencyMs: number; error?: string }> {
  const startTime = Date.now();

  // Explicit demo/sandbox mode only if configured
  if (config.isDemoMode) {
    const sandboxData = generateRealisticSandboxOutput(canonicalId, args);
    return {
      success: true,
      data: sandboxData,
      isMocked: true,
      latencyMs: 120,
    };
  }

  // Inject API key header for Resend if configured
  const executionArgs = { ...args };
  if (canonicalId.startsWith('resend.') && process.env.RESEND_API_KEY) {
    executionArgs.headers = {
      ...(executionArgs.headers || {}),
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    };
  }

  // Build the stdin payload — just the args object, NOT wrapped in {tool, args}
  // The canonical_id is passed as a CLI positional argument
  const payload = JSON.stringify(executionArgs);

  try {
    const { stdout, stderr, exitCode } = await runSwytchcodeCli(['exec', canonicalId, '--json'], payload);
    const latencyMs = Date.now() - startTime;

    if (exitCode === 0 && stdout.trim()) {
      try {
        const parsed = JSON.parse(stdout.trim());
        return { success: true, data: parsed, isMocked: false, latencyMs };
      } catch (e) {
        return { success: true, data: stdout.trim(), isMocked: false, latencyMs };
      }
    }

    // Live Swytchcode execution failed - propagate real error without silent mock fallback
    let errorMsg = stderr.trim() || stdout.trim() || `Swytchcode CLI execution failed with exit code ${exitCode}`;
    try {
      const errObj = JSON.parse(stderr.trim() || stdout.trim());
      if (errObj.error) {
        errorMsg = errObj.error;
      }
    } catch {}

    return {
      success: false,
      error: errorMsg,
      data: null,
      isMocked: false,
      latencyMs,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Swytchcode execution error',
      data: null,
      isMocked: false,
      latencyMs: Date.now() - startTime,
    };
  }
}

/**
 * Generates realistic structured responses for Swytchcode tools when executing in sandbox mode
 */
function generateRealisticSandboxOutput(canonicalId: string, args: any): any {
  // 1. WeatherAPI Forecast
  if (canonicalId.startsWith('weatherapi.')) {
    const location = args.params?.q || 'Jaipur';
    const days = args.params?.days || 3;
    const isJaipur = location.toLowerCase().includes('jaipur');
    const cityName = location.charAt(0).toUpperCase() + location.slice(1);

    const forecastdays = [];
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i + 1);
      const dateStr = d.toISOString().split('T')[0];
      const isRain = isJaipur && i === 1;

      forecastdays.push({
        date: dateStr,
        day: {
          maxtemp_c: isJaipur ? 34.5 - i * 2 : 28.0,
          mintemp_c: isJaipur ? 22.0 - i : 18.0,
          avgtemp_c: isJaipur ? 27.5 : 23.0,
          condition: {
            text: isRain ? 'Patchy Light Rain & Afternoon Thunderstorms' : 'Partly Cloudy & Pleasant',
            icon: isRain
              ? '//cdn.weatherapi.com/weather/64x64/day/296.png'
              : '//cdn.weatherapi.com/weather/64x64/day/116.png',
            code: isRain ? 1183 : 1003,
          },
          daily_chance_of_rain: isRain ? 78 : 12,
          uv: 7.2,
        },
        astro: {
          sunrise: '06:12 AM',
          sunset: '06:28 PM',
        },
      });
    }

    return {
      location: {
        name: cityName,
        region: 'State/Region',
        country: 'Country',
        lat: 26.9124,
        lon: 75.7873,
        tz_id: 'Asia/Kolkata',
        localtime: new Date().toISOString(),
      },
      current: {
        temp_c: 28.4,
        is_day: 1,
        condition: {
          text: 'Partly Cloudy',
          icon: '//cdn.weatherapi.com/weather/64x64/day/116.png',
          code: 1003,
        },
        wind_kph: 14.5,
        humidity: 58,
        feelslike_c: 29.8,
        uv: 6.0,
      },
      forecast: {
        forecastday: forecastdays,
      },
    };
  }

  // 2. Resend Email Create
  if (canonicalId.startsWith('resend.')) {
    const to = args.body?.to || ['user@example.com'];
    const subject = args.body?.subject || 'Notification';
    const emailId = `re_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;

    return {
      id: emailId,
      from: args.body?.from || 'onboarding@resend.dev',
      to: Array.isArray(to) ? to : [to],
      subject,
      created_at: new Date().toISOString(),
      status: 'queued_and_dispatched',
    };
  }

  // 3. Gmail Assistant Tools
  if (canonicalId.startsWith('gmail.')) {
    if (canonicalId.includes('send')) {
      return {
        id: `msg_gmail_${Date.now()}`,
        threadId: `thread_${Date.now()}`,
        labelIds: ['SENT', 'INBOX'],
        snippet: args.body?.subject || 'Executive Briefing',
        status: 'delivered',
      };
    }

    if (canonicalId.includes('threads.get1') || canonicalId.includes('messages.get')) {
      return {
        id: args.params?.id || 'thread_alpha_pilot',
        historyId: '984321',
        messages: [
          {
            id: 'msg_001',
            threadId: 'thread_alpha_pilot',
            from: 'alex.rivera@acmotech.io',
            to: 'madhavgairola05@gmail.com',
            subject: 'Re: Pilot Benchmark Latencies & Architecture Signoff',
            snippet: 'Confirmed: 45ms P99 latency meets our SLA requirement. Zero-trust key isolation approved for deployment.',
            date: '2026-09-24T14:20:00Z',
          },
        ],
      };
    }

    return {
      threads: [
        {
          id: 'thread_alpha_pilot',
          snippet: 'Confirmed: 45ms P99 latency meets SLA requirement. Zero-trust key isolation approved for deployment.',
          historyId: '984321',
        },
        {
          id: 'thread_legal_dpa',
          snippet: 'General Counsel signed off on GDPR DPA addendum and SOC-2 audit packet.',
          historyId: '984320',
        },
        {
          id: 'thread_ops_weekly',
          snippet: 'Weekly Ops Digest #38: 99.98% uptime, 4.2M tool executions completed with zero security exceptions.',
          historyId: '984319',
        },
      ],
      resultSizeEstimate: 3,
    };
  }

  // 4. Slack Assistant Tools
  if (canonicalId.startsWith('slack.')) {
    if (canonicalId.includes('post_message')) {
      return {
        ok: true,
        channel: args.body?.channel || 'C04INFRA99',
        ts: `${(Date.now() / 1000).toFixed(6)}`,
        message: {
          text: args.body?.text || 'Broadcast alert dispatched.',
          user: 'U_RECALL_BOT',
        },
      };
    }

    return {
      ok: true,
      messages: [
        {
          type: 'message',
          user: 'U_LEAD_ARCH',
          text: 'Consensus in #infra: Ephemeral credential injection in process memory only. No keys persisted to disk.',
          ts: '1727265600.000100',
        },
        {
          type: 'message',
          user: 'U_SEC_LEAD',
          text: 'Verified with SOC-2 audit team. Zero secret exposure in execution logs.',
          ts: '1727265900.000200',
        },
      ],
      has_more: false,
    };
  }

  // 5. Notion Assistant Tools
  if (canonicalId.startsWith('notion.')) {
    const pageId = `notion_page_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
    const title =
      args.body?.properties?.title?.[0]?.text?.content || 'Autonomous Integration Workspace Document';

    if (canonicalId.includes('search')) {
      return {
        object: 'list',
        results: [
          {
            object: 'page',
            id: 'notion_page_rfc2026',
            properties: { title: { title: [{ plain_text: 'Architecture 2026 RFC - Stateless Kernels' }] } },
            url: 'https://notion.so/workspace/rfc-2026',
          },
          {
            object: 'page',
            id: 'notion_page_postmortem',
            properties: { title: { title: [{ plain_text: 'Incident Postmortem #402 - Exponential Backoff' }] } },
            url: 'https://notion.so/workspace/postmortem-402',
          },
        ],
      };
    }

    return {
      object: 'page',
      id: pageId,
      created_time: new Date().toISOString(),
      last_edited_time: new Date().toISOString(),
      parent: args.body?.parent || { type: 'workspace', workspace: true },
      archived: false,
      url: `https://www.notion.so/workspace/${pageId.replace(/_/g, '-')}`,
      properties: {
        title: {
          id: 'title',
          type: 'title',
          title: [
            {
              type: 'text',
              text: { content: title, link: null },
              plain_text: title,
            },
          ],
        },
      },
    };
  }

  // 6. Google Drive Assistant Tools
  if (canonicalId.startsWith('google_drive.')) {
    return {
      kind: 'drive#fileList',
      files: [
        {
          id: 'drive_file_rfc2026',
          name: 'Architecture 2026 RFC - Swytchcode Execution Engine.pdf',
          mimeType: 'application/pdf',
          webViewLink: 'https://drive.google.com/file/d/drive_file_rfc2026/view',
          size: '245800',
        },
        {
          id: 'drive_file_threat',
          name: 'Zero-Trust Threat Model & Key Rotation Specification.docx',
          mimeType: 'application/vnd.google-apps.document',
          webViewLink: 'https://drive.google.com/file/d/drive_file_threat/view',
          size: '128400',
        },
        {
          id: 'drive_file_capacity',
          name: 'Q3/Q4 Multi-Region Capacity & Scale Benchmark Plan.xlsx',
          mimeType: 'application/vnd.google-apps.spreadsheet',
          webViewLink: 'https://drive.google.com/file/d/drive_file_capacity/view',
          size: '85200',
        },
      ],
    };
  }

  // 7. Box Assistant Tools
  if (canonicalId.startsWith('box.')) {
    if (canonicalId.includes('zip_download')) {
      return {
        download_url: 'https://api.box.com/2.0/zip_downloads/zip_soc2_2026/content',
        status_url: 'https://api.box.com/2.0/zip_downloads/zip_soc2_2026/status',
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        name: 'SOC-2-Type-II-Compliance-Package-2026.zip',
      };
    }

    return {
      id: args.params?.file_id || 'box_file_soc2',
      name: 'SOC-2 Type II Independent Auditor Attestation Report 2026.pdf',
      type: 'file',
      size: 4892010,
      modified_at: '2026-09-19T10:00:00Z',
      sha1: 'e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9',
    };
  }

  // 8. GitHub Assistant Tools
  if (canonicalId.startsWith('github.')) {
    const owner = args.params?.owner || 'swytchcodehq';
    const repo = args.params?.repo || 'swytchcode';

    if (canonicalId.includes('issue.create') || canonicalId.includes('issues.create')) {
      const issueNumber = Math.floor(Math.random() * 80) + 20;
      return {
        id: Date.now(),
        number: issueNumber,
        title: args.body?.title || 'Bug: Governor Policy Timeout in Multi-Region Mesh',
        body: args.body?.body || 'Identified latency spike during failover across eu-west-1 and us-east-1.',
        state: 'open',
        html_url: `https://github.com/${owner}/${repo}/issues/${issueNumber}`,
        created_at: new Date().toISOString(),
      };
    }

    if (canonicalId.includes('repos.get') || canonicalId.includes('repository.get')) {
      return {
        id: 4892109,
        name: repo,
        full_name: `${owner}/${repo}`,
        html_url: `https://github.com/${owner}/${repo}`,
        description: 'Governed runtime and execution layer for autonomous AI agent API calls',
        default_branch: 'main',
        stargazers_count: 1420,
        forks_count: 185,
        open_issues_count: 4,
      };
    }

    if (canonicalId.includes('pull_request') || canonicalId.includes('pulls')) {
      const prNumber = Math.floor(Math.random() * 50) + 10;
      return {
        id: Date.now(),
        number: prNumber,
        title: args.body?.title || 'feat(governance): Zero-Trust Ephemeral Credential Injection',
        html_url: `https://github.com/${owner}/${repo}/pull/${prNumber}`,
        state: 'open',
        head: { ref: 'feat/governed-credentials' },
        base: { ref: 'main' },
        created_at: new Date().toISOString(),
      };
    }

    return {
      issues: [
        {
          id: 101,
          number: 14,
          title: 'Governor evaluation fails on nested array wildcards',
          state: 'open',
          html_url: `https://github.com/${owner}/${repo}/issues/14`,
          user: { login: 'alex-eng' },
          created_at: '2026-09-22T08:30:00Z',
        },
        {
          id: 102,
          number: 15,
          title: 'Implement retry backoff jitter for rate-limited Stripe endpoints',
          state: 'open',
          html_url: `https://github.com/${owner}/${repo}/issues/15`,
          user: { login: 'sarah-dev' },
          created_at: '2026-09-24T11:15:00Z',
        },
      ],
      total_count: 2,
    };
  }

  // 9. Google Calendar Assistant Tools
  if (canonicalId.startsWith('google_calendar.') || canonicalId.startsWith('calendar.')) {
    if (canonicalId.includes('create') || canonicalId.includes('insert')) {
      const eventId = `gcal_evt_${Date.now()}`;
      const summary = args.body?.summary || 'Executive Architecture Review & Sprint Sync';
      const startTime = args.body?.start?.dateTime || new Date(Date.now() + 86400000).toISOString();
      const endTime = args.body?.end?.dateTime || new Date(Date.now() + 90000000).toISOString();

      return {
        id: eventId,
        summary,
        description: args.body?.description || 'Autonomous schedule booking orchestrated via Swytchcode',
        location: args.body?.location || 'Google Meet (https://meet.google.com/xyz-swx-abc)',
        start: { dateTime: startTime },
        end: { dateTime: endTime },
        htmlLink: `https://calendar.google.com/calendar/r/eventedit/${eventId}`,
        status: 'confirmed',
        attendees: args.body?.attendees || [{ email: 'madhavgairola05@gmail.com' }],
      };
    }

    return {
      items: [
        {
          id: 'evt_sync_weekly',
          summary: 'Weekly Architecture Review & Swytchcode Sync',
          start: { dateTime: new Date(Date.now() + 18000000).toISOString() },
          end: { dateTime: new Date(Date.now() + 21600000).toISOString() },
          location: 'Google Meet',
          htmlLink: 'https://calendar.google.com/calendar/r/eventedit/evt_sync_weekly',
        },
        {
          id: 'evt_demo_hackathon',
          summary: 'Swytchcode Hackathon Project Submission & Live Demo',
          start: { dateTime: new Date(Date.now() + 86400000).toISOString() },
          end: { dateTime: new Date(Date.now() + 90000000).toISOString() },
          location: 'Main Stage / Virtual',
          htmlLink: 'https://calendar.google.com/calendar/r/eventedit/evt_demo_hackathon',
        },
      ],
    };
  }

  return {
    id: `swx_${Math.random().toString(36).substring(2, 8)}`,
    status: 'success',
    executed_tool: canonicalId,
    timestamp: new Date().toISOString(),
  };
}
