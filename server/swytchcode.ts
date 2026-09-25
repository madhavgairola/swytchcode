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
export async function discoverCapabilities(intent: string): Promise<DiscoveredCapability[]> {
  try {
    const { stdout, stderr, exitCode } = await runSwytchcodeCli(['discover', intent, '--json']);

    if (exitCode !== 0 && !stdout) {
      console.warn('[Swytchcode] Discovery warning:', stderr);
      return [];
    }

    const parsed = JSON.parse(stdout.trim());
    if (parsed && Array.isArray(parsed.capabilities)) {
      return parsed.capabilities.map((c: any) => ({
        canonical_id: c.canonical_id,
        type: c.type || 'api',
        summary: c.summary || '',
        library: c.library || '',
        distance: typeof c.distance === 'number' ? c.distance : 1.0,
      }));
    }

    return [];
  } catch (err: any) {
    console.error('[Swytchcode] Discovery failed:', err.message);
    return [];
  }
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
 * Checks authentication and authorization status for a specific integration provider via Swytchcode CLI
 */
export async function checkProviderAuthStatus(providerName: string): Promise<{
  connected: boolean;
  status: 'connected' | 'requires_auth';
  authType?: 'oauth2' | 'api_key';
  account?: string;
  details?: string;
}> {
  const normalized = providerName.toLowerCase().replace(/[^a-z0-9]/g, '');

  try {
    // 1. Inspect table from `swytchcode auth connect`
    const { stdout } = await runSwytchcodeCli(['auth', 'connect']);
    const lines = stdout.split('\n').filter(l => l.trim().length > 0);
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 3) {
        const pName = parts[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        const pType = parts[1] as 'oauth2' | 'api_key';
        const pStatus = parts[2].toLowerCase();
        const pAccount = parts[3] || '-';

        if (pName.includes(normalized) || normalized.includes(pName)) {
          if (pStatus === 'connected') {
            return {
              connected: true,
              status: 'connected',
              authType: pType,
              account: pAccount,
              details: `Connected via Swytchcode ${pType.toUpperCase()} (Account: ${pAccount})`,
            };
          } else {
            return {
              connected: false,
              status: 'requires_auth',
              authType: pType,
              details: pType === 'oauth2'
                ? `Provider '${providerName}' requires OAuth2 browser authorization. Run 'swytchcode auth connect ${providerName.toLowerCase()}' in your terminal to authenticate.`
                : `Provider '${providerName}' requires authentication. Run 'swytchcode auth connect ${providerName.toLowerCase()}' in your terminal to securely link your credentials into Swytchcode.`,
            };
          }
        }
      }
    }
  } catch (err) {
    // ignore
  }

  // 2. Also check `swytchcode auth status`
  try {
    const { stdout } = await runSwytchcodeCli(['auth', 'status']);
    if (stdout.toLowerCase().includes(normalized) && stdout.toLowerCase().includes('connected')) {
      return { connected: true, status: 'connected', details: 'Authenticated in Swytchcode Workspace' };
    }
  } catch (err) {}

  return {
    connected: false,
    status: 'requires_auth',
    details: `Provider '${providerName}' is not connected. Run 'swytchcode auth connect ${providerName.toLowerCase()}' in your terminal.`,
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

  const payload = JSON.stringify({
    tool: canonicalId,
    args,
  });

  try {
    const { stdout, stderr, exitCode } = await runSwytchcodeCli(['exec', '--json'], payload);
    const latencyMs = Date.now() - startTime;

    if (exitCode === 0 && stdout.trim()) {
      try {
        const parsed = JSON.parse(stdout.trim());
        return { success: true, data: parsed, isMocked: false, latencyMs };
      } catch (e) {
        return { success: true, data: stdout.trim(), isMocked: false, latencyMs };
      }
    }

    // Extract structured error directly from Swytchcode CLI output
    let errorMsg = stderr.trim() || stdout.trim() || `Swytchcode execution failed with exit code ${exitCode}`;
    try {
      const errObj = JSON.parse(stderr.trim() || stdout.trim());
      if (errObj?.error) {
        errorMsg = errObj.error;
      }
    } catch {}

    return {
      success: false,
      data: null,
      isMocked: false,
      latencyMs,
      error: errorMsg,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      data: null,
      isMocked: false,
      latencyMs,
      error: err.message,
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

  // 3. Notion Page Create
  if (canonicalId.startsWith('notion.')) {
    const pageId = `notion_page_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
    const title =
      args.body?.properties?.title?.[0]?.text?.content || 'Autonomous Integration Workspace Document';

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

  return {
    id: `swx_${Math.random().toString(36).substring(2, 8)}`,
    status: 'success',
    executed_tool: canonicalId,
    timestamp: new Date().toISOString(),
  };
}
