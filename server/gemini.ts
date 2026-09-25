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
const MODEL_NAME = 'gemini-2.5-flash';

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
    "location": "Target location or city if applicable (e.g. Jaipur, Tokyo, Agra), or null",
    "destination": "Destination city if travel/route related, or null",
    "durationDays": Number of days if trip or schedule related, or null,
    "recipient": "Email address if email dispatch is requested, or null",
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
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const text = response.text || '{}';
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
    // Heuristic fallback
    const isEmail = userMessage.toLowerCase().includes('email') || userMessage.toLowerCase().includes('send');
    const isNotion = userMessage.toLowerCase().includes('notion') || userMessage.toLowerCase().includes('page');
    const isWeather = userMessage.toLowerCase().includes('weather') || userMessage.toLowerCase().includes('trip') || userMessage.toLowerCase().includes('jaipur');

    const queries: string[] = [];
    if (isWeather) queries.push('get weather forecast');
    if (isNotion) queries.push('create notion page');
    if (isEmail) queries.push('send email');
    if (queries.length === 0) queries.push('lookup information');

    return {
      goal: userMessage,
      intentCategory: queries.length > 1 ? 'multi_step_workflow' : (isEmail || isNotion ? 'action_dispatch' : 'information_retrieval'),
      entities: {
        location: userMessage.match(/\b(?:to|in|at)\s+([A-Z][a-z]+)/)?.[1] || 'Jaipur',
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

RULES:
1. You MUST ONLY select tools from the AVAILABLE REGISTERED SWYTCHCODE TOOLS list: [${registeredIds.join(', ')}].
2. For Weather queries, use 'weatherapi.forecast.list'.
3. For Notion document/page creation, use 'notion.page.create'.
4. For sending emails or notifications, use 'resend.email.create'.
5. If the user requested a multi-step workflow (e.g. check weather -> save to Notion / send email), create multiple ordered steps.
6. Provide concrete realistic input arguments for each step based on the user's entities.

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
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const text = response.text || '{}';
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

    // If no steps generated, fallback to default single-step
    if (steps.length === 0) {
      const defaultId = registeredIds[0] || 'weatherapi.forecast.list';
      steps.push({
        id: `step_1_${Date.now()}`,
        order: 1,
        action: `Execute ${defaultId}`,
        canonicalId: defaultId,
        integrationName: registeredTools[defaultId]?.integration || 'Custom',
        isSideEffect: false,
        status: 'pending',
        inputs: { params: { q: goal.entities.location || 'Jaipur', days: goal.entities.durationDays || 3 } },
      });
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
    const goalText = (goal.goal + ' ' + goal.requiredCapabilities.join(' ')).toLowerCase();
    let selectedId = registeredIds[0] || 'weatherapi.forecast.list';
    let isSideEffect = false;
    let inputs: any = {};

    if (goalText.includes('email') || goalText.includes('send') || goalText.includes('mail')) {
      selectedId = registeredIds.find(id => id.includes('resend') || id.includes('email')) || 'resend.email.create';
      isSideEffect = true;
      inputs = {
        body: {
          to: goal.entities.recipient || 'team@swytchcode.dev',
          subject: goal.entities.subject || 'Autonomous Task Notification',
          text: `Notification regarding: ${goal.goal}`,
        },
      };
    } else if (goalText.includes('notion') || goalText.includes('page') || goalText.includes('document')) {
      selectedId = registeredIds.find(id => id.includes('notion') || id.includes('page')) || 'notion.page.create';
      isSideEffect = true;
      inputs = {
        body: {
          parent: { page_id: 'workspace_root_id' },
          properties: { title: [{ text: { content: goal.entities.title || goal.goal } }] },
        },
      };
    } else {
      selectedId = registeredIds.find(id => id.includes('weatherapi')) || registeredIds[0] || 'weatherapi.forecast.list';
      isSideEffect = false;
      inputs = { params: { q: goal.entities.location || goal.entities.destination || 'Jaipur', days: goal.entities.durationDays || 3 } };
    }

    return {
      planId: `plan_${Date.now()}`,
      title: goal.goal,
      description: `Autonomous execution of ${selectedId}`,
      steps: [
        {
          id: `step_1_${Date.now()}`,
          order: 1,
          action: `Execute ${selectedId}`,
          canonicalId: selectedId,
          integrationName: registeredTools[selectedId]?.integration || 'Custom',
          isSideEffect,
          status: 'pending',
          inputs,
        },
      ],
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
2. If weather data was retrieved, clearly explain the temperature, sky conditions, and any practical recommendations or advisories.
3. If a Notion page or document was created, display its title, link/URL, and structured outline.
4. If an email was dispatched, display the recipient, subject, and confirmation status.
5. If multiple steps were executed, show how the data from earlier steps informed the later steps.
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
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);

    return {
      summary: parsed.summary || 'Task completed successfully.',
      markdown: parsed.markdown || generateFallbackMarkdown(goal, plan, executionOutputs),
      structuredData: parsed.structuredData || {},
      actionsTaken,
    };
  } catch (err: any) {
    console.error('[Gemini] Result synthesis failed:', err.message);
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
  md += `The autonomous agent successfully executed **${plan.steps.filter(s => s.status === 'completed').length}** step(s) via Swytchcode kernel:\n\n`;

  for (const step of plan.steps) {
    md += `### Step ${step.order}: ${step.action}\n`;
    md += `- **Tool Canonical ID:** \`${step.canonicalId}\`\n`;
    md += `- **Status:** ${step.status === 'completed' ? '🟢 Completed' : '🔴 Failed'} (${step.latencyMs || 0}ms)\n`;
    if (step.output) {
      md += `\`\`\`json\n${JSON.stringify(step.output, null, 2).substring(0, 500)}\n\`\`\`\n\n`;
    }
  }

  return md;
}
