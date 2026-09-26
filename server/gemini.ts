import { GoogleGenAI } from '@google/genai';
import { config } from './config.js';
import {
  UserGoalAnalysis,
  DiscoveredCapability,
  TaskPlan,
  PlanStep,
  TaskResult,
  ActionAuditItem,
  ArtifactLink,
} from './types.js';
import {
  detectRequestedProviders,
  isPureReadOrListRequest,
  getProviderForCanonicalId,
  isConsequentialMethod,
  validateStepAgainstUserIntent,
} from './validator.js';

const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
const PRIMARY_MODEL = 'gemini-3.5-flash-lite';
const SECONDARY_MODEL = 'gemini-3.1-flash-lite';

async function generateWithGemini(prompt: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });
    return response.text || '{}';
  } catch (primaryErr: any) {
    console.warn(`[Gemini] Primary model ${PRIMARY_MODEL} failed, trying ${SECONDARY_MODEL}:`, primaryErr.message);
    const response = await ai.models.generateContent({
      model: SECONDARY_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });
    return response.text || '{}';
  }
}

/**
 * Analyzes arbitrary user requests to extract goal, intent category, entities, and capability search queries
 */
export async function analyzeGoalAndRequirements(userMessage: string): Promise<UserGoalAnalysis> {
  const prompt = `You are a real-world autonomous action agent orchestrator. Analyze the user request and extract actionable goals across Gmail, Slack, Notion, Google Drive, Box, and Weather/Email tools.

User Request: "${userMessage}"

Analyze and return ONLY a valid JSON object matching this schema:
{
  "goal": "Concise 1-sentence summary of the user's primary goal",
  "intentCategory": "One of: information_retrieval | action_dispatch | data_mutation | multi_step_workflow | conversational",
  "entities": {
    "location": "Target location or city if applicable (e.g. Gurgaon, Jaipur, Tokyo, London), or null if not specified",
    "destination": "Destination city if travel/route related, or null",
    "durationDays": Number of days if trip/schedule/forecast related (e.g. 7 for 'next week', 2 for 'tomorrow', 3 for '3-day'), or null,
    "recipient": "Email address if email dispatch is requested (e.g. user@example.com), or null if 'to me' with no address given",
    "channel": "Slack channel if Slack related (e.g. #infra, #general, #proj-alpha), or null",
    "subject": "Subject line if email or notification related, or null",
    "title": "Title for document/page/task if Notion, Drive, or Box related, or null",
    "fileQuery": "File search term if searching Drive, Box, or Notion",
    "notes": "Additional specific preferences or context mentioned"
  },
  "requiredCapabilities": [
    "Array of 1-3 natural language capability search queries (e.g. 'search google drive files', 'search gmail threads', 'slack conversations history', 'create Notion page', 'box get file')"
  ],
  "requiresConfirmation": true/false (true if the task creates, sends, modifies external resources like sending emails, posting messages, deleting threads, false for read-only queries)
}`;

  try {
    const text = await generateWithGemini(prompt);
    const parsed = JSON.parse(text);

    return {
      goal: parsed.goal || userMessage,
      intentCategory: parsed.intentCategory || 'information_retrieval',
      entities: parsed.entities || {},
      requiredCapabilities: Array.isArray(parsed.requiredCapabilities) && parsed.requiredCapabilities.length > 0
        ? parsed.requiredCapabilities
        : ['lookup enterprise information'],
      requiresConfirmation: Boolean(parsed.requiresConfirmation),
      rawMessage: userMessage,
    };
  } catch (err: any) {
    console.warn('[Gemini] Fallback goal parsing:', err.message);
    const lower = userMessage.toLowerCase();
    const isDrive = lower.includes('drive') || lower.includes('gdrive') || lower.includes('files');
    const isGmail = lower.includes('gmail') || lower.includes('inbox') || lower.includes('thread') || lower.includes('mail');
    const isSlack = lower.includes('slack') || lower.includes('channel') || lower.includes('#');
    const isNotion = lower.includes('notion') || lower.includes('page') || lower.includes('wiki');
    const isBox = lower.includes('box') || lower.includes('soc2') || lower.includes('audit') || lower.includes('dpa');
    const isGithub = lower.includes('github') || lower.includes('repo') || lower.includes('issue') || lower.includes('pull request') || lower.includes('pr');
    const isCalendar = lower.includes('calendar') || lower.includes('meeting') || lower.includes('schedule') || lower.includes('appointment');
    const isWeather = lower.includes('weather') || lower.includes('forecast') || lower.includes('temp');

    const queries: string[] = [];
    if (isDrive) queries.push('google drive search and list user files');
    if (isGmail) queries.push('gmail search threads read email');
    if (isSlack) queries.push('slack conversations history post message');
    if (isNotion) queries.push('notion create page search database');
    if (isBox) queries.push('box storage get file audit package');
    if (isGithub) queries.push('github list issues create issue repository');
    if (isCalendar) queries.push('google calendar list events schedule meeting');
    if (isWeather) queries.push('get weather forecast');
    if (queries.length === 0) queries.push('lookup information');

    return {
      goal: userMessage,
      intentCategory: isPureReadOrListRequest(userMessage) ? 'information_retrieval' : 'action_dispatch',
      entities: {},
      requiredCapabilities: queries,
      requiresConfirmation: isConsequentialMethod(userMessage),
      rawMessage: userMessage,
    };
  }
}

/**
 * Plans a multi-step execution pipeline strictly mapping goals to verified Swytchcode tools matching provider and operation semantics
 */
export async function createExecutionPlan(
  goal: UserGoalAnalysis,
  discoveredCapabilities: DiscoveredCapability[],
  registeredTools: Record<string, any>
): Promise<TaskPlan> {
  const userText = goal.rawMessage || goal.goal;
  const requestedProviders = detectRequestedProviders(userText);
  const isReadIntent = isPureReadOrListRequest(userText);

  // 1. Constrain candidate tools by provider and operation type
  let eligibleDiscovered = discoveredCapabilities;
  if (requestedProviders.length > 0) {
    eligibleDiscovered = discoveredCapabilities.filter(cap => {
      const toolProvider = getProviderForCanonicalId(cap.canonical_id);
      return requestedProviders.includes(toolProvider);
    });
  }

  if (isReadIntent) {
    eligibleDiscovered = eligibleDiscovered.filter(cap => !isConsequentialMethod(cap.canonical_id));
  }

  // 2. Build candidate tools list for Gemini prompt
  const candidateToolSummary = eligibleDiscovered.length > 0
    ? eligibleDiscovered.map(c => `- ${c.canonical_id} (${getProviderForCanonicalId(c.canonical_id)}): ${c.summary}`).join('\n')
    : `- drive.file.list (Google Drive): Lists user files in Google Drive\n- google_drive.files.list (Google Drive): Search and list user files\n- gmail.user.threads.get (Gmail): Search and get email threads\n- slack.conversations.history (Slack): Read messages in channel\n- notion.search.create (Notion): Search pages\n- box.files.get (Box): Get file details`;

  const prompt = `You are an Autonomous Integration Planner. Build a sequential execution plan for the user's goal strictly selecting from the eligible tools below.

User Goal: "${goal.goal}"
Target Providers: [${requestedProviders.length > 0 ? requestedProviders.join(', ') : 'Any'}]
Operation Type: ${isReadIntent ? 'READ/LIST ONLY' : 'WRITE/MUTATION OR READ'}

ELIGIBLE CANDIDATE TOOLS:
${candidateToolSummary}

CRITICAL RULES:
1. MULTI-STEP DATA PIPELINE: If the user wants to process, summarize, compile, or report data into a destination (e.g., summarize emails on Notion, index Google Drive files in Notion, send weather updates via Email/Notion/Slack):
   - You MUST create a MULTI-STEP plan:
     * Step 1: Query/fetch the source data (e.g., gmail.user.threads.get, drive.file.list, weatherapi.forecast.list, slack.conversations.history)
     * Step 2: Create or update the destination resource (e.g., notion.page.create, slack.chat.post_message, resend.email.create)
   - NEVER skip the data-gathering step when creating a document or summary based on live external data!
2. STRICT PROVIDER BOUNDARY: If user asked for Google Drive, select ONLY Google Drive tools (drive.file.list). If user asked for Gmail, select ONLY Gmail tools (gmail.user.threads.get). NEVER substitute unrelated tools!
3. OPERATION SEMANTICS: If the user asked to list/read/search files only, NEVER select a create/send/zip_download/delete tool.
4. PARAMETER INTEGRITY: Do not include unrelated parameters in tool inputs.

Return ONLY a JSON object matching this schema:
{
  "title": "Short title of the task plan",
  "description": "Brief summary of planned execution steps",
  "steps": [
    {
      "order": 1,
      "action": "Description of what this step does",
      "canonicalId": "Selected canonical ID from eligible tools (e.g. gmail.user.threads.get)",
      "isSideEffect": false,
      "inputs": {
        "params": { ...query params... }
      }
    },
    {
      "order": 2,
      "action": "Description of what this step does",
      "canonicalId": "Selected canonical ID from eligible tools (e.g. notion.page.create)",
      "isSideEffect": true,
      "inputs": {
        "params": { ...query params or body... }
      }
    }
  ]
}`;

  try {
    const text = await generateWithGemini(prompt);
    const parsed = JSON.parse(text);

    let steps: PlanStep[] = (parsed.steps || []).map((s: any, idx: number) => {
      let rawId = String(s.canonicalId || '').trim();
      
      // Normalize to authoritative registered Swytchcode tools
      if (rawId.startsWith('drive.') || rawId.startsWith('google_drive.') || rawId.startsWith('googledrive.')) {
        rawId = rawId.includes('get') ? 'drive.file.get' : 'drive.file.list';
      } else if (rawId.startsWith('gmail.')) {
        rawId = rawId.includes('send') ? 'gmail.user.send.create1' : 'gmail.user.threads.get';
      } else if (rawId.startsWith('notion.')) {
        rawId = (isReadIntent && !userText.toLowerCase().includes('doc') && !userText.toLowerCase().includes('page')) 
          ? 'notion.search.create' 
          : 'notion.page.create';
      } else if (rawId.startsWith('resend.')) {
        rawId = 'resend.email.create';
      } else if (rawId.startsWith('weatherapi.')) {
        rawId = 'weatherapi.forecast.list';
      } else if (rawId.startsWith('box.')) {
        rawId = rawId.includes('zip') ? 'box.zip_download.create' : 'box.files.get';
      } else if (rawId.startsWith('slack.')) {
        rawId = rawId.includes('post') || rawId.includes('send') ? 'slack.chat.post_message' : 'slack.conversations.history';
      }

      const canonicalId = rawId || (requestedProviders.includes('Google Drive') ? 'drive.file.list' : 'gmail.user.threads.get');
      const toolProvider = getProviderForCanonicalId(canonicalId);
      const isSideEffect = isConsequentialMethod(canonicalId);

      return {
        id: `step_${idx + 1}_${Date.now()}`,
        order: idx + 1,
        action: s.action || `Execute ${canonicalId}`,
        canonicalId,
        integrationName: toolProvider,
        isSideEffect,
        status: 'pending',
        inputs: s.inputs || {},
      };
    });

    // Ensure all requested source providers have a fetch step
    if (requestedProviders.includes('Gmail') && !steps.some(s => s.canonicalId.startsWith('gmail.'))) {
      steps.push({
        id: `step_gmail_${Date.now()}`,
        order: 1,
        action: 'Retrieve latest email threads from Gmail mailbox',
        canonicalId: 'gmail.user.threads.get',
        integrationName: 'Gmail',
        isSideEffect: false,
        status: 'pending',
        inputs: { params: { userId: 'me', maxResults: 10 } },
      });
    }

    if (requestedProviders.includes('Google Drive') && !steps.some(s => s.canonicalId.startsWith('drive.') || s.canonicalId.startsWith('google_drive.'))) {
      steps.push({
        id: `step_drive_${Date.now()}`,
        order: 1,
        action: 'Search and list user files stored in Google Drive',
        canonicalId: 'drive.file.list',
        integrationName: 'Google Drive',
        isSideEffect: false,
        status: 'pending',
        inputs: { params: { pageSize: 15, q: goal.entities?.fileQuery ? `title contains '${goal.entities.fileQuery}' or fullText contains '${goal.entities.fileQuery}'` : undefined } },
      });
    }

    if (requestedProviders.includes('GitHub') && !steps.some(s => s.canonicalId.startsWith('github.'))) {
      const isCreate = userText.toLowerCase().includes('create') || userText.toLowerCase().includes('open') || userText.toLowerCase().includes('file');
      const tool = isCreate ? 'github.issue.create' : 'github.issue.list';
      steps.push({
        id: `step_github_${Date.now()}`,
        order: 1,
        action: isCreate ? 'Create a new issue in GitHub repository' : 'List and search issues in GitHub repository',
        canonicalId: tool,
        integrationName: 'GitHub',
        isSideEffect: isCreate,
        status: 'pending',
        inputs: {
          params: { owner: 'swytchcodehq', repo: 'swytchcode' },
          ...(isCreate ? { body: { title: goal.entities?.title || 'Governed Agent Task Report' } } : {}),
        },
      });
    }

    if (requestedProviders.includes('Google Calendar') && !steps.some(s => s.canonicalId.startsWith('google_calendar.') || s.canonicalId.startsWith('calendar.'))) {
      const isCreate = userText.toLowerCase().includes('create') || userText.toLowerCase().includes('schedule') || userText.toLowerCase().includes('book');
      const tool = isCreate ? 'google_calendar.events.create' : 'google_calendar.events.list';
      steps.push({
        id: `step_calendar_${Date.now()}`,
        order: 1,
        action: isCreate ? 'Schedule a new calendar event with attendees' : 'List upcoming calendar events and meetings',
        canonicalId: tool,
        integrationName: 'Google Calendar',
        isSideEffect: isCreate,
        status: 'pending',
        inputs: {
          params: { calendarId: 'primary' },
          ...(isCreate ? { body: { summary: goal.entities?.title || 'Executive Strategy Sync' } } : {}),
        },
      });
    }

    if (requestedProviders.includes('WeatherAPI') && !steps.some(s => s.canonicalId.startsWith('weatherapi.'))) {
      steps.push({
        id: `step_weather_${Date.now()}`,
        order: 1,
        action: 'Retrieve verified meteorological forecast data',
        canonicalId: 'weatherapi.forecast.list',
        integrationName: 'WeatherAPI',
        isSideEffect: false,
        status: 'pending',
        inputs: { params: { q: goal.entities.location || 'Jaipur', days: 3 } },
      });
    }

    // Ensure destination providers have corresponding steps
    if (requestedProviders.includes('Notion') && !isReadIntent && !steps.some(s => s.canonicalId.startsWith('notion.'))) {
      steps.push({
        id: `step_notion_${Date.now()}`,
        order: 2,
        action: 'Create structured document in Notion workspace',
        canonicalId: 'notion.page.create',
        integrationName: 'Notion',
        isSideEffect: true,
        status: 'pending',
        inputs: { body: { title: goal.entities?.title || 'Swytchcode Document' } },
      });
    }

    const needsEmailSend =
      userText.toLowerCase().includes('mail me') ||
      userText.toLowerCase().includes('email me') ||
      userText.toLowerCase().includes('send me an email') ||
      userText.toLowerCase().includes('send email') ||
      requestedProviders.includes('Resend');

    if (needsEmailSend && !isReadIntent && !steps.some(s => s.canonicalId.startsWith('resend.') || s.canonicalId.startsWith('gmail.user.send'))) {
      const isExplicitResend = userText.toLowerCase().includes('resend');
      const emailTool = isExplicitResend ? 'resend.email.create' : 'gmail.user.send.create1';
      const emailProvider = isExplicitResend ? 'Resend' : 'Gmail';

      steps.push({
        id: `step_email_${Date.now()}`,
        order: 3,
        action: `Send email summary to recipient via ${emailProvider}`,
        canonicalId: emailTool,
        integrationName: emailProvider,
        isSideEffect: true,
        status: 'pending',
        inputs: {
          to: goal.entities?.recipient || 'madhavgairola05@gmail.com',
          subject: goal.entities?.subject || 'Swytchcode Hackathon Document Summary & Workspace Briefing',
        },
      });
    }

    // Deduplicate steps with identical canonical IDs
    const seenTools = new Set<string>();
    steps = steps.filter(s => {
      if (seenTools.has(s.canonicalId)) return false;
      seenTools.add(s.canonicalId);
      return true;
    });

    // Sort steps in logical data pipeline order:
    // 1. Data Retrieval (Gmail, Drive, WeatherAPI, Slack history, Box)
    // 2. Document Creation (Notion)
    // 3. Notification Dispatch (Resend, Slack post, Gmail send)
    const getOrderWeight = (cid: string) => {
      if (cid.startsWith('gmail.user.threads') || cid.startsWith('drive.') || cid.startsWith('weatherapi.') || cid === 'slack.conversations.history' || cid === 'box.files.get') return 1;
      if (cid.startsWith('notion.')) return 2;
      if (cid.startsWith('resend.') || cid.startsWith('slack.chat') || cid.startsWith('gmail.user.send')) return 3;
      return 2;
    };

    steps.sort((a, b) => getOrderWeight(a.canonicalId) - getOrderWeight(b.canonicalId));

    // Re-index steps order sequentially
    steps = steps.map((s, idx) => ({ ...s, order: idx + 1 }));

    if (steps.length === 0) {
      throw new Error('No valid steps produced');
    }

    return {
      planId: `plan_${Date.now()}`,
      title: parsed.title || goal.goal,
      description: parsed.description || `Execute ${steps.length} tool step(s) via Swytchcode`,
      steps,
      currentStepIndex: 0,
      status: 'ready',
    };
  } catch (err: any) {
    console.warn('[Gemini] Plan generation fallback:', err.message);
    const fallbackSteps: PlanStep[] = [];

    // 1. Google Drive search/list
    if (requestedProviders.includes('Google Drive') || userText.toLowerCase().includes('drive')) {
      fallbackSteps.push({
        id: `step_1_${Date.now()}`,
        order: 1,
        action: 'Search and list user files stored in Google Drive',
        canonicalId: 'drive.file.list',
        integrationName: 'Google Drive',
        isSideEffect: false,
        status: 'pending',
        inputs: { params: { pageSize: 10 } },
      });
    }

    // 2. Gmail threads
    else if (requestedProviders.includes('Gmail') || userText.toLowerCase().includes('gmail') || userText.toLowerCase().includes('inbox')) {
      fallbackSteps.push({
        id: `step_1_${Date.now()}`,
        order: 1,
        action: 'Search email threads in Gmail',
        canonicalId: 'gmail.user.threads.get',
        integrationName: 'Gmail',
        isSideEffect: false,
        status: 'pending',
        inputs: { params: { maxResults: 10 } },
      });
    }

    // 3. Slack messages
    else if (requestedProviders.includes('Slack') || userText.toLowerCase().includes('slack')) {
      fallbackSteps.push({
        id: `step_1_${Date.now()}`,
        order: 1,
        action: 'Fetch discussion messages from Slack channel',
        canonicalId: 'slack.conversations.history',
        integrationName: 'Slack',
        isSideEffect: false,
        status: 'pending',
        inputs: { params: { channel: '#infra' } },
      });
    }

    // 4. Box files
    else if (requestedProviders.includes('Box') || userText.toLowerCase().includes('box')) {
      fallbackSteps.push({
        id: `step_1_${Date.now()}`,
        order: 1,
        action: 'Retrieve compliance document from Box storage',
        canonicalId: 'box.files.get',
        integrationName: 'Box',
        isSideEffect: false,
        status: 'pending',
        inputs: { params: { file_id: 'box_soc2_2026' } },
      });
    }

    // Default fallback
    else {
      fallbackSteps.push({
        id: `step_1_${Date.now()}`,
        order: 1,
        action: 'Search and list files in Google Drive',
        canonicalId: 'drive.file.list',
        integrationName: 'Google Drive',
        isSideEffect: false,
        status: 'pending',
        inputs: { params: { pageSize: 10 } },
      });
    }

    return {
      planId: `plan_${Date.now()}`,
      title: goal.goal,
      description: `Execute ${fallbackSteps.length} step(s) for ${goal.goal}`,
      steps: fallbackSteps,
      currentStepIndex: 0,
      status: 'ready',
    };
  }
}

/**
 * Synthesizes final verified task results from multi-step execution outputs
 */
export async function synthesizeTaskResult(
  userMessageOrGoal: string | UserGoalAnalysis,
  goalOrPlan: UserGoalAnalysis | TaskPlan,
  planOrOutputs?: TaskPlan | Record<string, any>,
  stepOutputsArg?: Record<string, any>,
  contextArg?: Record<string, any>
): Promise<TaskResult> {
  const goal: UserGoalAnalysis = typeof userMessageOrGoal === 'object' 
    ? userMessageOrGoal 
    : (typeof goalOrPlan === 'object' && 'goal' in goalOrPlan ? goalOrPlan as UserGoalAnalysis : { goal: String(userMessageOrGoal), intentCategory: 'information_retrieval', entities: {}, requiredCapabilities: [], requiresConfirmation: false, rawMessage: String(userMessageOrGoal) });
  
  const plan: TaskPlan = ('steps' in goalOrPlan ? goalOrPlan : planOrOutputs) as TaskPlan;
  const stepOutputs: Record<string, any> = (stepOutputsArg || (planOrOutputs && !('steps' in planOrOutputs) ? planOrOutputs : {})) as Record<string, any>;
  const context: Record<string, any> = contextArg || {};

  const stepsTaken = (plan?.steps || []).map(s => {
    return `Step ${s.order} [${s.canonicalId}] (${s.integrationName}): ${s.action}\nStatus: ${s.status}\nOutput: ${JSON.stringify(stepOutputs[s.canonicalId] || s.output || 'No output recorded')}`;
  }).join('\n\n');

  // Extract artifact links from tool execution outputs
  const artifacts: ArtifactLink[] = [];
  
  for (const [cid, output] of Object.entries(stepOutputs)) {
    if (!output) continue;
    const outData = (output as any).data || output;

    // Notion Page Created / Found
    if (cid.startsWith('notion.')) {
      const rawUrl = outData.url;
      const pageId = outData.id || '';
      const formattedUrl = rawUrl || (pageId ? `https://app.notion.com/p/${pageId.replace(/-/g, '')}` : null);
      const title =
        outData.properties?.title?.title?.[0]?.plain_text ||
        outData.properties?.title?.[0]?.text?.content ||
        outData.properties?.title?.[0]?.plain_text ||
        'Notion Document';
      if (formattedUrl) {
        artifacts.push({
          title: String(title),
          url: formattedUrl,
          type: 'notion',
          description: `Notion Document (ID: ${pageId})`,
        });
      }
    }

    // Google Drive File
    if (cid.startsWith('drive.') || cid.startsWith('google_drive.')) {
      const rawList = Array.isArray(outData.items)
        ? outData.items
        : Array.isArray(outData.files)
        ? outData.files
        : Array.isArray(outData.data?.items)
        ? outData.data.items
        : Array.isArray(outData.data?.files)
        ? outData.data.files
        : [];

      if (rawList.length > 0) {
        rawList.slice(0, 5).forEach((f: any) => {
          const fileUrl = f.alternateLink || f.webViewLink || f.exportLinks?.['text/html'] || f.link || (f.id ? `https://docs.google.com/document/d/${f.id}/edit` : undefined);
          const fileName = f.title || f.name || 'Google Drive Document';
          if (fileUrl) {
            artifacts.push({
              title: fileName,
              url: fileUrl,
              type: 'drive',
              description: `Drive document (${f.mimeType || 'file'}${f.owners?.[0]?.displayName ? ` by ${f.owners[0].displayName}` : ''})`,
            });
          }
        });
      } else if (outData.webViewLink || outData.alternateLink || outData.id) {
        artifacts.push({
          title: outData.title || outData.name || 'Google Drive Document',
          url: outData.alternateLink || outData.webViewLink || `https://docs.google.com/document/d/${outData.id}/edit`,
          type: 'drive',
          description: `Google Drive file`,
        });
      }
    }

    // Gmail Email Sent
    if (cid.startsWith('gmail.user.send')) {
      const threadId = outData.threadId || outData.id || outData.data?.threadId || outData.data?.id;
      const recipient = context.recipient || 'madhavgairola05@gmail.com';
      artifacts.push({
        title: `Gmail Dispatch Confirmation (Thread ID: ${threadId || 'Sent'})`,
        url: threadId ? `https://mail.google.com/mail/u/0/#inbox/${threadId}` : 'https://mail.google.com',
        type: 'email',
        description: `Summary email successfully sent to ${recipient} via Gmail`,
      });
    }

    // Resend Email Sent
    if (cid.startsWith('resend.')) {
      const msgId = outData.id || outData.data?.id;
      const recipient = context.recipient || 'madhavgairola05@gmail.com';
      artifacts.push({
        title: `Resend Email Notification (ID: ${msgId || 'Dispatched'})`,
        url: `https://resend.com/emails`,
        type: 'email',
        description: `Notification email dispatched to ${recipient} via Resend`,
      });
    }

    // Slack Channel
    if (cid.startsWith('slack.')) {
      if (outData.channel) {
        artifacts.push({
          title: `Slack Channel (${outData.channel})`,
          url: `https://slack.com/app_redirect?channel=${outData.channel}`,
          type: 'slack',
          description: 'Broadcast message dispatched to Slack',
        });
      }
    }

    // GitHub Issue / PR / Repo
    if (cid.startsWith('github.')) {
      const issueUrl = outData.html_url || outData.url;
      const title = outData.title || outData.name || 'GitHub Repository / Issue';
      if (issueUrl) {
        artifacts.push({
          title: `GitHub: ${title}`,
          url: issueUrl,
          type: 'web',
          description: `GitHub artifact created or retrieved via Swytchcode`,
        });
      }
    }

    // Google Calendar Event
    if (cid.startsWith('google_calendar.') || cid.startsWith('calendar.')) {
      const eventLink = outData.htmlLink || outData.link || (outData.id ? `https://calendar.google.com/calendar/r/eventedit/${outData.id}` : null);
      const summary = outData.summary || 'Google Calendar Event';
      if (eventLink) {
        artifacts.push({
          title: `Calendar: ${summary}`,
          url: eventLink,
          type: 'web',
          description: `Google Calendar event scheduled via Swytchcode`,
        });
      }
    }
  }

  const structuredData: Record<string, any> = {
    emailSynthesis: context.emailSynthesis || null,
    driveSynthesis: context.driveSynthesis || null,
  };

  const prompt = `You are the RECALL Executive Intelligence Synthesizer. Synthesize a comprehensive briefing report for the user's goal based on actual verified Swytchcode tool execution outputs.

User Goal: "${goal.goal}"
Executed Steps and Data:
${stepsTaken}

CRITICAL RULES:
1. EXECUTIVE SUMMARY: Direct, clear answer and summary of accomplishments.
2. VERIFIED FACTS & ARTIFACTS: Specific filenames, dates, thread IDs, latencies, and findings.
3. DIRECT CLICKABLE LINKS & COMPLETE COVERAGE: For every created Notion document, Google Drive file, and dispatched email, you MUST include the full HTTPS URL as a clickable Markdown link: e.g. "[Open Notion Page: (Title)](https://app.notion.com/p/...)", "[Open Document: (Title)](https://docs.google.com/...)", and explicit confirmation of email dispatch to the user's email (e.g. "Delivered to madhavgairola05@gmail.com via Gmail"). NEVER put just plain text or omit requested items!
4. ACCURATE URGENCY & NATURE: Accurately describe notifications (LinkedIn network invites, event passes, newsletters) as general/informational communications rather than urgent emergencies.

Return ONLY a valid JSON object:
{
  "summary": "Concise 2-3 sentence executive summary",
  "markdown": "Full formatted Markdown briefing with headings, bullet points, and clickable links [Title](URL)",
  "actionsTaken": [
    {
      "canonicalId": "canonical.id",
      "integration": "Google Drive",
      "description": "Short description of what was accomplished",
      "status": "success",
      "latencyMs": 120,
      "isMocked": false
    }
  ]
}`;

  try {
    const text = await generateWithGemini(prompt);
    const parsed = JSON.parse(text);

    let finalMarkdown = parsed.markdown || `### Executive Briefing\n\n${parsed.summary || 'Task completed successfully.'}`;

    // Guarantee that all created/retrieved artifact links are prominently featured in the briefing
    if (artifacts.length > 0) {
      const topArtifactsHeader = `### 🔗 Workspace Artifacts & Direct Links\n` +
        artifacts.map(art => {
          const icon = art.type === 'notion' ? '📝' : art.type === 'drive' ? '📁' : art.type === 'email' ? '✉️' : art.type === 'slack' ? '💬' : '🔗';
          return `- ${icon} **${art.title}:** [Open in ${art.type.charAt(0).toUpperCase() + art.type.slice(1)} ↗](${art.url})`;
        }).join('\n') + `\n\n---\n\n`;

      if (!finalMarkdown.includes('### 🔗 Workspace Artifacts & Direct Links')) {
        finalMarkdown = topArtifactsHeader + finalMarkdown;
      }
    }

    return {
      summary: parsed.summary || `Completed ${plan?.steps?.length || 0} actions for goal: ${goal.goal}`,
      markdown: finalMarkdown,
      artifacts,
      structuredData,
      actionsTaken: (plan?.steps || []).map(s => ({
        canonicalId: s.canonicalId,
        integration: s.integrationName,
        description: s.action,
        status: (s.status === 'completed' ? 'success' : s.status === 'failed' ? 'failed' : 'skipped') as 'success' | 'failed' | 'skipped',
        latencyMs: s.latencyMs || 100,
        isMocked: Boolean(s.isMocked),
      })),
    };
  } catch (err: any) {
    console.warn('[Gemini] Synthesis fallback:', err.message);
    const completedSteps = (plan?.steps || []).filter(s => s.status === 'completed');
    let fallbackMarkdown = `### Executive Briefing: ${goal.goal}\n\n- Executed ${completedSteps.length} tools via Swytchcode kernel.\n- Verified outputs across ${[...new Set((plan?.steps || []).map(s => s.integrationName))].join(', ')}.`;
    
    if (artifacts.length > 0) {
      fallbackMarkdown += `\n\n### 🔗 Workspace Artifacts & Links\n` +
        artifacts.map(art => `- **${art.title}:** [Open in ${art.type.charAt(0).toUpperCase() + art.type.slice(1)} ↗](${art.url})`).join('\n');
    }

    return {
      summary: `Successfully executed ${completedSteps.length}/${plan?.steps?.length || 0} steps for: ${goal.goal}`,
      markdown: fallbackMarkdown,
      artifacts,
      structuredData,
      actionsTaken: (plan?.steps || []).map(s => ({
        canonicalId: s.canonicalId,
        integration: s.integrationName,
        description: s.action,
        status: (s.status === 'completed' ? 'success' : s.status === 'failed' ? 'failed' : 'skipped') as 'success' | 'failed' | 'skipped',
        latencyMs: s.latencyMs || 100,
        isMocked: Boolean(s.isMocked),
      })),
    };
  }
}

export interface SynthesizedEmailDoc {
  pageTitle: string;
  executiveSummary: string;
  keyActionItems: string[];
  emailSummaries: Array<{
    index: number;
    senderOrTopic: string;
    category: string;
    summary: string;
    urgency: 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
    actionRequired?: string;
  }>;
}

/**
 * Uses Gemini to intelligently summarize and categorize live Gmail threads for Notion documents
 */
export async function synthesizeEmailSummaryForNotion(
  threads: any[],
  goalText: string = 'Summarize latest emails'
): Promise<SynthesizedEmailDoc> {
  const sanitizedThreads = threads.slice(0, 10).map((t, idx) => {
    const rawSnippet = t.snippet || t.snippet_text || '';
    const cleanSnippet = rawSnippet.replace(/[\u034f\u00ad\u200b\u200c\u200d\ufeff\s]+/g, ' ').trim();
    return `[Email #${idx + 1}] Thread ID: ${t.id || idx + 1} | Preview Content: ${cleanSnippet}`;
  }).join('\n');

  const prompt = `You are an elite Executive Assistant and Intelligence Synthesizer.
Analyze the following 10 recent email threads retrieved live from the user's Gmail mailbox.
For each email, provide a SMART, meaningful 1-2 sentence executive summary explaining who it is from, what it is about, urgency, and any required action.

CRITICAL CLASSIFICATION & URGENCY RULES (STRICT):
1. RECOGNIZE EMAIL TYPE & SENDER ACCURATELY:
   - Social Network Notifications (e.g. LinkedIn invitations like "X is waiting for your response", DeviantArt birthday alerts, Twitter/Instagram notifications):
     * Category: "Social Networking"
     * Urgency: MUST BE "INFO" or "LOW" (NEVER "HIGH"!)
     * Action: "Connect on platform / Optional" or "None / Reference only"
   - Newsletters & Promotional Digests (e.g. Medium daily digest, Python/Tech updates, Marketing "See what's unlocked", "Apply Now"):
     * Category: "Newsletter & Digest" or "Promotional"
     * Urgency: MUST BE "INFO" or "LOW"
     * Action: "None / Reference only"
   - Event Registrations & Passes (e.g. Hackathon pass, "Build With Swytchcode" entry pass, conference ticket):
     * Category: "Event & Conference Pass"
     * Urgency: "INFO" or "MEDIUM"
     * Action: "Save entry pass / QR code for event attendance"
   - Institutional & Academic Opportunities (e.g. College / Campus placement circulars, Schneider Electric Yuva Yodha competition):
     * Category: "Campus Opportunity & Circular"
     * Urgency: "INFO" or "MEDIUM"
     * Action: "Review eligibility and participation guidelines"
   - Security & Critical Alerts (e.g. unauthorized logins, password resets):
     * Category: "Security Alert"
     * Urgency: "HIGH" only if suspicious
   - Direct Personal / Work Messages (direct email from an individual regarding an active project or scheduled meeting):
     * Category: "Direct Communication"
     * Urgency: "HIGH" or "MEDIUM" based on actual deadline

2. STRICT URGENCY CONSTRAINT: NEVER label automated platform invites or digests as 🚨 [HIGH]. Reserve HIGH strictly for critical security emergencies or direct, urgent human inquiries.

User Goal: "${goalText}"

LIVE EMAIL THREADS:
${sanitizedThreads}

Return ONLY a valid JSON object matching this schema:
{
  "pageTitle": "Concise professional title (e.g. Executive Mailbox Intelligence Briefing)",
  "executiveSummary": "A crisp 2-3 sentence executive overview categorizing the key themes across these emails (e.g. event passes, college competitions, professional network requests, and tech digests)",
  "keyActionItems": [
    "Specific real action item 1 (e.g. Save Build With Swytchcode Gurgaon Entry Pass for event access)",
    "Specific real action item 2 (e.g. Review Schneider Electric Yuva Yodha competition guidelines)"
  ],
  "emailSummaries": [
    {
      "index": 1,
      "senderOrTopic": "Name of sender or platform topic (e.g. LinkedIn Network Invitation / Schneider Electric Campus Competition)",
      "category": "Social Networking | Event Pass | Campus Opportunity | Newsletter | Direct Communication | Security Alert",
      "summary": "Clear 1-2 sentence summary explaining what this email is actually communicating.",
      "urgency": "INFO | LOW | MEDIUM | HIGH",
      "actionRequired": "Concrete action required or 'None / Reference only'"
    }
  ]
}`;

  try {
    const text = await generateWithGemini(prompt);
    const parsed = JSON.parse(text);
    return {
      pageTitle: parsed.pageTitle || 'Executive Mailbox Intelligence Briefing',
      executiveSummary: parsed.executiveSummary || 'Summary of recent mailbox communications compiled via Swytchcode agent.',
      keyActionItems: Array.isArray(parsed.keyActionItems) ? parsed.keyActionItems : [],
      emailSummaries: Array.isArray(parsed.emailSummaries) ? parsed.emailSummaries.map((s: any, i: number) => ({
        index: s.index || (i + 1),
        senderOrTopic: s.senderOrTopic || `Email #${i + 1}`,
        category: s.category || 'General Communication',
        summary: s.summary || 'Summary not provided.',
        urgency: (['HIGH', 'MEDIUM', 'LOW', 'INFO'].includes(s.urgency) ? s.urgency : 'INFO') as 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO',
        actionRequired: s.actionRequired || 'None / Reference only',
      })) : [],
    };
  } catch (err: any) {
    console.warn('[Gemini] Email synthesis fallback:', err.message);
    return {
      pageTitle: 'Executive Mailbox Intelligence Briefing',
      executiveSummary: 'Summary of 10 recent email threads from mailbox.',
      keyActionItems: ['Review pending emails and follow up on time-sensitive messages.'],
      emailSummaries: threads.slice(0, 10).map((t, idx) => {
        const snippet = (t.snippet || 'No message content').replace(/[\u034f\u00ad\u200b\u200c\u200d\ufeff\s]+/g, ' ').trim();
        const isLinkedIn = snippet.toLowerCase().includes('waiting for your response') || snippet.toLowerCase().includes('linkedin');
        const isEvent = snippet.toLowerCase().includes('swytchcode') || snippet.toLowerCase().includes('registration') || snippet.toLowerCase().includes('pass');
        const isCampus = snippet.toLowerCase().includes('schneider') || snippet.toLowerCase().includes('b.tech') || snippet.toLowerCase().includes('graduating');
        const isMedium = snippet.toLowerCase().includes('medium') || snippet.toLowerCase().includes('digest');

        let category = 'General Communication';
        let senderOrTopic = `Email Thread #${idx + 1}`;
        let urgency: 'INFO' | 'MEDIUM' | 'LOW' = 'INFO';
        let actionRequired = 'None / Reference only';

        if (isLinkedIn) {
          category = 'Social Networking';
          senderOrTopic = 'LinkedIn Network Notification';
          urgency = 'INFO';
          actionRequired = 'Connect on platform (Optional)';
        } else if (isEvent) {
          category = 'Event & Conference Pass';
          senderOrTopic = 'Build With Swytchcode Event Pass';
          urgency = 'MEDIUM';
          actionRequired = 'Save entry pass for event attendance';
        } else if (isCampus) {
          category = 'Campus Opportunity';
          senderOrTopic = 'Schneider Electric Yuva Yodha Circular';
          urgency = 'INFO';
          actionRequired = 'Review student participation guidelines';
        } else if (isMedium) {
          category = 'Newsletter & Digest';
          senderOrTopic = 'Medium Daily Tech Digest';
          urgency = 'LOW';
          actionRequired = 'None / Reference only';
        }

        return {
          index: idx + 1,
          senderOrTopic,
          category,
          summary: snippet,
          urgency,
          actionRequired,
        };
      }),
    };
  }
}

export interface SynthesizedDriveDoc {
  pageTitle: string;
  executiveSummary: string;
  keyCategories: Array<{
    category: string;
    files: Array<{
      name: string;
      description: string;
    }>;
  }>;
}

/**
 * Uses Gemini to intelligently categorize Google Drive files into a structured Notion document index
 */
export async function synthesizeDriveIndexForNotion(
  files: any[],
  goalText: string = 'Index Google Drive files'
): Promise<SynthesizedDriveDoc> {
  const sanitizedFiles = files.slice(0, 15).map((f, idx) => {
    const name = f.title || f.name || `File_${idx + 1}`;
    const mime = f.mimeType || 'unknown';
    return `[File #${idx + 1}] Name: ${name} (${mime})`;
  }).join('\n');

  const prompt = `You are an Enterprise Architecture Document Indexer.
Analyze the following Google Drive files and organize them into an executive index with logical categories and clear descriptions.

User Goal: "${goalText}"

WORKSPACE FILES:
${sanitizedFiles}

Return ONLY a valid JSON object matching this schema:
{
  "pageTitle": "Professional title (e.g. Google Drive Architecture & Document Index)",
  "executiveSummary": "2-3 sentence overview of the workspace document landscape",
  "keyCategories": [
    {
      "category": "Category name (e.g. Technical Specifications, Presentations, Data Sheets)",
      "files": [
        {
          "name": "File name",
          "description": "Short explanation of the document's purpose based on its title and format"
        }
      ]
    }
  ]
}`;

  try {
    const text = await generateWithGemini(prompt);
    const parsed = JSON.parse(text);
    return {
      pageTitle: parsed.pageTitle || 'Google Drive Document Index',
      executiveSummary: parsed.executiveSummary || 'Index of files discovered in user Google Drive workspace.',
      keyCategories: Array.isArray(parsed.keyCategories) ? parsed.keyCategories : [],
    };
  } catch (err: any) {
    console.warn('[Gemini] Drive synthesis fallback:', err.message);
    return {
      pageTitle: 'Google Drive Document Index',
      executiveSummary: 'Index of active workspace files in Google Drive.',
      keyCategories: [
        {
          category: 'Workspace Documents',
          files: files.slice(0, 10).map((f, idx) => ({
            name: f.title || f.name || `Document_${idx + 1}`,
            description: `Type: ${f.mimeType || 'file'}`,
          })),
        },
      ],
    };
  }
}

/**
 * Uses Gemini to generate semantically related search terms and synonyms for user-provided keywords
 */
export async function expandKeywordsWithSemantics(keywords: string[]): Promise<string[]> {
  const cleanKeywords = keywords.map(k => k.trim()).filter(Boolean);
  if (cleanKeywords.length === 0) return [];

  const prompt = `You are an AI Search & Information Retrieval Specialist.
Given the following user search keywords:
${JSON.stringify(cleanKeywords)}

Generate 3-5 highly relevant semantic synonyms, related search phrases, sub-topics, or abbreviations for each keyword that commonly appear in emails, documents, and notifications.

Return ONLY a valid JSON object matching this schema:
{
  "expandedTerms": ["term1", "term2", "term3", "term4", "term5"]
}`;

  try {
    const text = await generateWithGemini(prompt);
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed.expandedTerms)) {
      return parsed.expandedTerms
        .map((t: string) => String(t).trim().toLowerCase())
        .filter((t: string) => t.length > 1 && !cleanKeywords.map(k => k.toLowerCase()).includes(t));
    }
    return [];
  } catch (err: any) {
    console.warn('[Gemini] Keyword expansion fallback:', err.message);
    // Simple heuristic fallback for known domains
    const fallback: string[] = [];
    cleanKeywords.forEach(k => {
      const lower = k.toLowerCase();
      if (lower.includes('hackathon')) fallback.push('competition', 'pass', 'submission', 'swytchcode edition');
      if (lower.includes('travel')) fallback.push('flight', 'hotel', 'itinerary', 'boarding pass');
      if (lower.includes('security')) fallback.push('2fa', 'verification code', 'login alert', 'password reset');
      if (lower.includes('campus')) fallback.push('placement', 'internship', 'circular', 'yuva yodha');
    });
    return Array.from(new Set(fallback));
  }
}

/**
 * Classifies a batch of raw email threads or documents for the background sync loop
 */
export async function classifyBatchForSync(
  items: Array<{ id: string; from: string; subject: string; snippet: string }>
): Promise<Array<{ id: string; category: string; urgency: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH'; summary: string }>> {
  if (!items || items.length === 0) return [];

  const formattedItems = items.map((item, idx) => 
    `[Item #${idx + 1} - ID: ${item.id}]
From: ${item.from || 'Unknown'}
Subject: ${item.subject || 'No Subject'}
Snippet: ${item.snippet || ''}`
  ).join('\n\n');

  const prompt = `You are an AI Information Classifier. Classify these communications into categories and assign realistic urgency levels.

TAXONOMY CATEGORIES (MUST BE ONE OF):
- Social Networking (LinkedIn connection requests, follower updates, platform notifications) -> Urgency MUST be INFO or LOW
- Event & Conference Pass (Hackathons, conferences, tickets, passes) -> Urgency INFO or LOW
- Campus Opportunity & Circular (University circulars, batch drives, volunteer alerts) -> Urgency LOW or MEDIUM
- Newsletter & Digest (Medium digests, DeviantArt, blogs, promotional newsletters) -> Urgency INFO
- Direct Communication (1-on-1 personal or professional correspondence) -> Urgency MEDIUM or HIGH
- Security Alert (2FA codes, account alerts, password resets) -> Urgency HIGH

ITEMS TO CLASSIFY:
${formattedItems}

Return ONLY a valid JSON array of objects matching this schema:
[
  {
    "id": "item-id",
    "category": "Social Networking | Event & Conference Pass | Campus Opportunity & Circular | Newsletter & Digest | Direct Communication | Security Alert",
    "urgency": "INFO | LOW | MEDIUM | HIGH",
    "summary": "1-sentence executive summary"
  }
]`;

  try {
    const text = await generateWithGemini(prompt);
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed.map((res: any, idx: number) => ({
        id: res.id || items[idx]?.id || `item_${idx}`,
        category: res.category || 'Direct Communication',
        urgency: ['INFO', 'LOW', 'MEDIUM', 'HIGH'].includes(res.urgency) ? res.urgency : 'INFO',
        summary: res.summary || items[idx]?.subject || 'Email notification'
      }));
    }
  } catch (err: any) {
    console.warn('[Gemini] Batch sync classification fallback:', err.message);
  }

  // Fallback heuristic classification
  return items.map((item) => {
    const combined = `${item.from} ${item.subject} ${item.snippet}`.toLowerCase();
    let category = 'Direct Communication';
    let urgency: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';

    if (combined.includes('linkedin') || combined.includes('invitation') || combined.includes('connection')) {
      category = 'Social Networking';
      urgency = 'INFO';
    } else if (combined.includes('hackathon') || combined.includes('knotic') || combined.includes('ticket') || combined.includes('pass')) {
      category = 'Event & Conference Pass';
      urgency = 'INFO';
    } else if (combined.includes('b.tech') || combined.includes('schneider') || combined.includes('yuva yodha') || combined.includes('placement')) {
      category = 'Campus Opportunity & Circular';
      urgency = 'LOW';
    } else if (combined.includes('medium') || combined.includes('digest') || combined.includes('deviantart')) {
      category = 'Newsletter & Digest';
      urgency = 'INFO';
    } else if (combined.includes('security') || combined.includes('verify') || combined.includes('2fa') || combined.includes('password')) {
      category = 'Security Alert';
      urgency = 'HIGH';
    }

    return {
      id: item.id,
      category,
      urgency,
      summary: item.subject || 'Discovered communication thread'
    };
  });
}

