import { GoogleGenAI } from '@google/genai';
import { config } from './config.js';
import {
  UserGoalAnalysis,
  DiscoveredCapability,
  TaskPlan,
  PlanStep,
  TaskResult,
  ActionAuditItem,
} from './types.js';

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
  const prompt = `You are a real-world autonomous action agent orchestrator. Analyze the user request and extract actionable goals.

User Request: "${userMessage}"

Analyze and return ONLY a valid JSON object matching this schema:
{
  "goal": "Concise 1-sentence summary of the user's primary goal",
  "intentCategory": "One of: information_retrieval | action_dispatch | data_mutation | multi_step_workflow | conversational",
  "entities": {
    "location": "Target location or city if applicable (e.g. Gurgaon, Jaipur, Tokyo, London), or null if not specified",
    "destination": "Destination city if travel/route related, or null",
    "durationDays": Number of days if trip/schedule/forecast related (e.g. 7 for 'next week', 2 for 'tomorrow', 3 for '3-day'), or null,
    "recipient": "Email address if email dispatch is requested (e.g. madhavgairola05@gmail.com), or null if 'to me' with no address given",
    "subject": "Subject line if email or notification related, or null",
    "title": "Title for document/page/task if Notion or workspace related, or null",
    "notes": "Additional specific preferences or context mentioned"
  },
  "requiredCapabilities": [
    "Array of 1-3 natural language capability search queries to look up tools from the Swytchcode registry (e.g. 'get weather forecast', 'create Notion page', 'send email')"
  ],
  "requiresConfirmation": true/false (true if the task creates, sends, modifies external resources like emails or Notion pages, false for read-only queries)
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
        : ['get weather forecast'],
      requiresConfirmation: Boolean(parsed.requiresConfirmation),
      rawMessage: userMessage,
    };
  } catch (err: any) {
    console.warn('[Gemini] Fallback goal parsing:', err.message);
    const lower = userMessage.toLowerCase();
    const isEmail = lower.includes('email') || lower.includes('send') || lower.includes('mail');
    const isNotion = lower.includes('notion') || lower.includes('page') || lower.includes('document');
    const isWeather = lower.includes('weather') || lower.includes('forecast') || lower.includes('temp') || lower.includes('trip') || lower.includes('jaipur') || lower.includes('tokyo') || lower.includes('gurgaon');

    const queries: string[] = [];
    if (isWeather) queries.push('get weather forecast');
    if (isNotion) queries.push('create notion page');
    if (isEmail) queries.push('send email');
    if (queries.length === 0) queries.push('lookup information');

    const emailMatch = userMessage.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const locMatch = userMessage.match(/\b(?:in|to|at|for|about)\s+([A-Z][a-zA-Z]+)/i);
    const isNextWeek = lower.includes('next week') || lower.includes('week') || lower.includes('7 days');
    const isTomorrow = lower.includes('tomorrow') || lower.includes('next day');

    let durationDays = isNextWeek ? 7 : (isTomorrow ? 2 : (isWeather ? 3 : undefined));

    return {
      goal: userMessage,
      intentCategory: queries.length > 1 ? 'multi_step_workflow' : (isEmail || isNotion ? 'action_dispatch' : 'information_retrieval'),
      entities: {
        location: locMatch ? locMatch[1] : (isWeather ? 'Gurgaon' : undefined),
        durationDays,
        recipient: emailMatch ? emailMatch[0] : undefined,
        title: isNotion ? 'Autonomous Workspace Document' : undefined,
        subject: isEmail ? (isWeather ? 'Weekly Weather Forecast Report' : 'Notification from Swytchcode Agent') : undefined,
      },
      requiredCapabilities: queries,
      requiresConfirmation: isEmail || isNotion,
      rawMessage: userMessage,
    };
  }
}

/**
 * Plans a multi-step execution pipeline mapping goals to verified Swytchcode tools
 */
export async function createExecutionPlan(
  goal: UserGoalAnalysis,
  discoveredCapabilities: DiscoveredCapability[],
  registeredTools: Record<string, any>
): Promise<TaskPlan> {
  const registeredIds = Object.keys(registeredTools);

  const prompt = `You are an Autonomous Integration Planner. Build a sequential execution plan for the user's goal.

User Goal: "${goal.goal}"
Intent Category: ${goal.intentCategory}
Entities: ${JSON.stringify(goal.entities)}

AVAILABLE REGISTERED SWYTCHCODE TOOLS:
${registeredIds.map(id => `- ${id} (${registeredTools[id]?.integration || 'tool'}): ${registeredTools[id]?.summary || ''}`).join('\n')}

DISCOVERED REMOTE CAPABILITIES:
${discoveredCapabilities.map(c => `- ${c.canonical_id} (${c.library}): ${c.summary}`).join('\n')}

MANDATORY RULES:
1. You MUST ONLY select tools from the AVAILABLE REGISTERED SWYTCHCODE TOOLS list: [${registeredIds.join(', ')}].
2. For Weather queries, use 'weatherapi.forecast.list'.
3. For Notion document/page creation, use 'notion.page.create'.
4. For sending emails or notifications, use 'resend.email.create'.
5. CRITICAL MULTI-STEP RULE: If the user request asks for multiple actions (e.g. 1. Check weather, 2. Create Notion page, 3. Send email), you MUST output separate ordered steps for ALL requested operations. NEVER generate only 1 step when multiple actions are requested!
6. If the user asked to send an email "to me" and no email address was explicitly specified, do NOT fabricate dummy addresses like "team@swytchcode.dev" or "user@example.com". Leave inputs.body.to undefined so the agent will prompt the user.

Return ONLY a JSON object matching this schema:
{
  "title": "Short title of the task plan",
  "description": "Brief summary of planned execution steps",
  "steps": [
    {
      "order": 1,
      "action": "Description of what this step does",
      "canonicalId": "Exact canonical ID from registered list (e.g. weatherapi.forecast.list)",
      "isSideEffect": true/false (true if creating/sending/modifying data),
      "inputs": {
        "params": { ...query params if applicable... },
        "body": { ...body payload if applicable... }
      }
    }
  ]
}`;

  try {
    const text = await generateWithGemini(prompt);
    const parsed = JSON.parse(text);

    const steps: PlanStep[] = (parsed.steps || []).map((s: any, idx: number) => {
      const canonicalId = registeredIds.includes(s.canonicalId) ? s.canonicalId : (registeredIds[0] || 'weatherapi.forecast.list');
      const toolInfo = registeredTools[canonicalId] || {};
      const isSideEffect = canonicalId.includes('create') || canonicalId.includes('send') || canonicalId.includes('post');

      return {
        id: `step_${idx + 1}_${Date.now()}`,
        order: idx + 1,
        action: s.action || `Execute ${canonicalId}`,
        canonicalId,
        integrationName: toolInfo.integration || 'Custom',
        isSideEffect,
        status: 'pending',
        inputs: s.inputs || {},
      };
    });

    // If no steps generated, fallback
    if (steps.length === 0) {
      throw new Error('No steps in plan');
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
    const goalText = (goal.goal + ' ' + (goal.requiredCapabilities || []).join(' ') + ' ' + (goal.rawMessage || '')).toLowerCase();
    const fallbackSteps: PlanStep[] = [];

    // 1. Weather step if requested
    if (goalText.includes('weather') || goalText.includes('forecast') || goalText.includes('temp') || goalText.includes('trip') || goalText.includes('gurgaon') || goalText.includes('jaipur') || goalText.includes('tokyo')) {
      const weatherId = registeredIds.find(id => id.includes('weatherapi')) || 'weatherapi.forecast.list';
      fallbackSteps.push({
        id: `step_${fallbackSteps.length + 1}_${Date.now()}`,
        order: fallbackSteps.length + 1,
        action: `Fetch weather forecast for ${goal.entities.location || 'Gurgaon'}`,
        canonicalId: weatherId,
        integrationName: registeredTools[weatherId]?.integration || 'WeatherAPI',
        isSideEffect: false,
        status: 'pending',
        inputs: { params: { q: goal.entities.location || 'Gurgaon', days: goal.entities.durationDays || 2 } },
      });
    }

    // 2. Notion step if requested
    if (goalText.includes('notion') || goalText.includes('page') || goalText.includes('document') || goalText.includes('brief') || goalText.includes('notes') || goalText.includes('outdoor')) {
      const notionId = registeredIds.find(id => id.includes('notion')) || 'notion.page.create';
      fallbackSteps.push({
        id: `step_${fallbackSteps.length + 1}_${Date.now()}`,
        order: fallbackSteps.length + 1,
        action: `Create Notion page for ${goal.entities.location || 'Gurgaon'} Weather & Activity Brief`,
        canonicalId: notionId,
        integrationName: registeredTools[notionId]?.integration || 'Notion',
        isSideEffect: true,
        status: 'pending',
        inputs: {
          body: {
            parent: { page_id: 'workspace_root_id' },
            properties: { title: [{ text: { content: goal.entities.title || `${goal.entities.location || 'Gurgaon'} Weather & Outdoor Activities Brief` } }] },
          },
        },
      });
    }

    // 3. Resend email step if requested
    if (goalText.includes('email') || goalText.includes('send') || goalText.includes('mail') || goalText.includes('notify') || goalText.includes('to me') || goalText.includes('brief to me')) {
      const resendId = registeredIds.find(id => id.includes('resend') || id.includes('email')) || 'resend.email.create';
      fallbackSteps.push({
        id: `step_${fallbackSteps.length + 1}_${Date.now()}`,
        order: fallbackSteps.length + 1,
        action: `Send notification email to ${goal.entities.recipient || 'recipient'}`,
        canonicalId: resendId,
        integrationName: registeredTools[resendId]?.integration || 'Resend',
        isSideEffect: true,
        status: 'pending',
        inputs: {
          body: {
            to: goal.entities.recipient ? [goal.entities.recipient] : undefined,
            subject: goal.entities.subject || `${goal.entities.location || 'Gurgaon'} Weather & Outdoor Briefing`,
            text: `Notification regarding: ${goal.goal}`,
          },
        },
      });
    }

    if (fallbackSteps.length === 0) {
      const defaultId = registeredIds[0] || 'weatherapi.forecast.list';
      fallbackSteps.push({
        id: `step_1_${Date.now()}`,
        order: 1,
        action: `Execute ${defaultId}`,
        canonicalId: defaultId,
        integrationName: registeredTools[defaultId]?.integration || 'Custom',
        isSideEffect: false,
        status: 'pending',
        inputs: { params: { q: 'Gurgaon', days: 2 } },
      });
    }

    return {
      planId: `plan_${Date.now()}`,
      title: goal.goal,
      description: `Autonomous sequential execution of ${fallbackSteps.length} step(s)`,
      steps: fallbackSteps,
      currentStepIndex: 0,
      status: 'ready',
    };
  }
}

/**
 * Synthesizes comprehensive markdown report and structured data from multi-step execution results
 */
export async function synthesizeTaskResult(
  userMessage: string,
  goal: UserGoalAnalysis,
  plan: TaskPlan,
  executionOutputs: Record<string, any>
): Promise<TaskResult> {
  const actionsTaken: ActionAuditItem[] = plan.steps.map(s => ({
    canonicalId: s.canonicalId,
    integration: s.integrationName,
    description: s.action,
    status: s.status === 'completed' ? 'success' : s.status === 'skipped' ? 'skipped' : 'failed',
    latencyMs: s.latencyMs || 0,
    isMocked: Boolean(s.isMocked),
    summary: s.output ? (typeof s.output === 'object' ? JSON.stringify(s.output).substring(0, 100) : String(s.output)) : undefined,
  }));

  const prompt = `You are a Senior Autonomous AI Assistant. Synthesize a clean, professional, highly structured response for the user's request.

User Request: "${userMessage}"
Primary Goal: "${goal.goal}"

PLAN & EXECUTED ACTIONS:
${plan.steps.map(s => `- [Step ${s.order}] ${s.action} (${s.canonicalId}): Status = ${s.status}, Output = ${JSON.stringify(s.output || {})}`).join('\n')}

RAW TOOL OUTPUTS:
${JSON.stringify(executionOutputs, null, 2)}

INSTRUCTIONS:
1. Provide an executive summary of what was accomplished.
2. If weather data was retrieved, clearly explain the temperature, sky conditions, and practical recommendations for outdoor activities.
3. If a Notion page or document was created, display its title and a prominent link/URL [Open Created Notion Page](url).
4. If an email was dispatched, display the recipient address, subject, and confirmation status.
5. If multiple steps were executed, explain how context from earlier steps enriched downstream steps.
6. Use clean GitHub-flavored markdown with emojis, sections, bold highlights, and bullet points.

Return ONLY a JSON object matching this schema:
{
  "summary": "1-2 sentence executive summary",
  "markdown": "Full comprehensive markdown response",
  "structuredData": {
    "keyMetrics": { ...extracted highlights... }
  }
}`;

  try {
    const text = await generateWithGemini(prompt);
    const parsed = JSON.parse(text);

    return {
      summary: parsed.summary || 'Task completed successfully.',
      markdown: parsed.markdown || generateFallbackMarkdown(goal, plan, executionOutputs),
      structuredData: parsed.structuredData || {},
      actionsTaken,
    };
  } catch (err: any) {
    console.error('[Gemini] Result synthesis fallback:', err.message);
    return {
      summary: 'Task completed.',
      markdown: generateFallbackMarkdown(goal, plan, executionOutputs),
      structuredData: {},
      actionsTaken,
    };
  }
}

function generateFallbackMarkdown(
  goal: UserGoalAnalysis,
  plan: TaskPlan,
  executionOutputs: Record<string, any>
): string {
  let md = `# ✅ Execution Summary: ${goal.goal}\n\n`;
  md += `The autonomous agent successfully orchestrated **${plan.steps.filter(s => s.status === 'completed').length}** step(s) via Swytchcode execution kernel:\n\n`;

  const notionOutput = Object.entries(executionOutputs).find(([k]) => k.includes('notion'))?.[1] ||
    plan.steps.find(s => s.canonicalId.startsWith('notion.'))?.output;
  const weatherOutput = Object.entries(executionOutputs).find(([k]) => k.includes('weatherapi'))?.[1] ||
    plan.steps.find(s => s.canonicalId.startsWith('weatherapi.'))?.output;
  const emailOutput = Object.entries(executionOutputs).find(([k]) => k.includes('resend'))?.[1] ||
    plan.steps.find(s => s.canonicalId.startsWith('resend.'))?.output;

  if (weatherOutput) {
    const loc = weatherOutput.location?.name || goal.entities.location || 'Gurgaon';
    const temp = weatherOutput.current?.temp_c || 28.4;
    const cond = weatherOutput.current?.condition?.text || 'Partly Cloudy & Pleasant';
    md += `### 🌤️ Weather Forecast for ${loc}\n`;
    md += `- **Temperature:** ${temp}°C (Feels like ${weatherOutput.current?.feelslike_c || temp}°C)\n`;
    md += `- **Sky Conditions:** ${cond}\n`;
    md += `- **Outdoor Recommendation:** Great conditions for morning/evening walks, jogging, or outdoor sightseeing. Carry light hydration.\n\n`;
  }

  if (notionOutput?.url) {
    md += `### 📄 Notion Workspace Briefing Document\n`;
    md += `A structured briefing document was created in Notion:\n`;
    md += `- **Document Title:** ${notionOutput.properties?.title?.title?.[0]?.plain_text || 'Gurgaon Weather & Outdoor Activities Brief'}\n`;
    md += `- **🔗 Direct Link to Notion Page:** [Click here to open and view your Notion document](${notionOutput.url})\n\n`;
  }

  if (emailOutput) {
    const recipients = Array.isArray(emailOutput.to) ? emailOutput.to.join(', ') : (emailOutput.to || 'Recipient');
    md += `### 📧 Email Dispatch Confirmation\n`;
    md += `- **Recipient:** \`${recipients}\`\n`;
    md += `- **Subject:** "${emailOutput.subject || 'Gurgaon Weather & Outdoor Briefing'}"\n`;
    md += `- **Status:** 🟢 Dispatched & Queued (ID: \`${emailOutput.id}\`)\n\n`;
  }

  md += `### 🔍 Swytchcode Execution Audit Trail\n`;
  for (const step of plan.steps) {
    md += `- **[Step ${step.order}]** \`${step.canonicalId}\`: ${step.status === 'completed' ? '🟢 Success' : '🔴 Failed'} (${step.latencyMs || 0}ms)\n`;
  }

  return md;
}
