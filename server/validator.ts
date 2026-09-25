import fs from 'fs';
import path from 'path';
import { config } from './config.js';
import { ValidatedMethod, DynamicFormField } from './types.js';

/**
 * Load locally registered tooling from .swytchcode/tooling.json
 */
export function getRegisteredTools(): Record<string, any> {
  try {
    const toolingPath = path.join(config.projectRoot, '.swytchcode', 'tooling.json');
    if (fs.existsSync(toolingPath)) {
      const content = fs.readFileSync(toolingPath, 'utf8');
      const parsed = JSON.parse(content);
      return parsed.tools || {};
    }
  } catch (e) {
    console.warn('[Validator] Failed to read tooling.json:', e);
  }
  return {};
}

/**
 * Validates whether a method is registered in local tooling and extracts its contract
 */
export function validateMethodAgainstTooling(canonicalId: string): ValidatedMethod {
  if (!canonicalId || typeof canonicalId !== 'string') {
    return {
      canonicalId: canonicalId || '',
      isValid: false,
      isRegisteredLocally: false,
      requiredInputs: [],
      integrationName: '',
      reason: 'Invalid canonical ID format',
    };
  }

  const tools = getRegisteredTools();
  const toolEntry = tools[canonicalId];

  if (!toolEntry) {
    return {
      canonicalId,
      isValid: false,
      isRegisteredLocally: false,
      requiredInputs: [],
      integrationName: '',
      reason: `Method '${canonicalId}' is NOT registered in local .swytchcode/tooling.json. Security policy forbids executing unverified tools.`,
    };
  }

  const requiredInputs: string[] = [];
  if (Array.isArray(toolEntry.inputs)) {
    for (const inputObj of toolEntry.inputs) {
      for (const [key, details] of Object.entries<any>(inputObj)) {
        if (details?.REQUIRED) {
          requiredInputs.push(key);
        }
      }
    }
  }

  const isSideEffect = isConsequentialMethod(canonicalId);

  return {
    canonicalId,
    isValid: true,
    isRegisteredLocally: true,
    requiredInputs,
    integrationName: toolEntry.integration || 'Custom',
    summary: toolEntry.summary || '',
    isSideEffect,
  };
}

/**
 * Determines if a tool performs a side-effect (create, send, update, delete, charge)
 */
export function isConsequentialMethod(canonicalId: string): boolean {
  const sideEffectPatterns = [
    'create',
    'send',
    'update',
    'delete',
    'charge',
    'post',
    'put',
    'dispatch',
    'email',
    'publish',
  ];
  const lower = canonicalId.toLowerCase();
  return sideEffectPatterns.some(pattern => lower.includes(pattern));
}

/**
 * Extracts provider integration name from canonical ID
 */
export function getProviderForCanonicalId(canonicalId: string): string {
  const tools = getRegisteredTools();
  const entry = tools[canonicalId];
  if (entry?.integration) {
    const parts = entry.integration.split('.');
    return parts[0] || 'Swytchcode';
  }
  if (canonicalId.startsWith('weatherapi.')) return 'WeatherAPI';
  if (canonicalId.startsWith('notion.')) return 'Notion';
  if (canonicalId.startsWith('resend.')) return 'Resend';
  return 'Swytchcode';
}

export function isPlaceholderOrEmptyEmail(email: any): boolean {
  if (!email) return true;
  const str = Array.isArray(email) ? String(email[0] || '') : String(email);
  const trimmed = str.trim().toLowerCase();
  if (!trimmed) return true;
  if (
    trimmed === 'me' ||
    trimmed === 'user@example.com' ||
    trimmed === 'recipient@example.com' ||
    trimmed === 'your-email@example.com' ||
    trimmed === 'name@example.com' ||
    trimmed === 'your email' ||
    trimmed === 'recipient'
  ) {
    return true;
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return !emailRegex.test(trimmed);
}

/**
 * Dynamically detects missing parameters for a method based on its Swytchcode contract and current context
 */
export function detectMissingFieldsForStep(
  canonicalId: string,
  currentInputs: any = {},
  entities: Record<string, any> = {}
): DynamicFormField[] {
  const missing: DynamicFormField[] = [];

  // 1. WeatherAPI Forecast
  if (canonicalId.startsWith('weatherapi.')) {
    const q = currentInputs.params?.q || currentInputs.q || entities.location || entities.destination;
    if (!q || String(q).trim().length < 2) {
      missing.push({
        id: 'location',
        name: 'q',
        label: 'Target Location / City',
        type: 'text',
        placeholder: 'e.g. Tokyo, Jaipur, London, San Francisco',
        whyRequired: 'WeatherAPI requires a city name, postal code, or coordinates to retrieve forecast data.',
        required: true,
      });
    }
  }

  // 2. Resend Email Create
  if (canonicalId.startsWith('resend.')) {
    const to = currentInputs.body?.to || currentInputs.to || entities.recipient || entities.to;
    if (isPlaceholderOrEmptyEmail(to)) {
      missing.push({
        id: 'recipient',
        name: 'to',
        label: 'Recipient Email Address',
        type: 'email',
        placeholder: 'name@example.com',
        whyRequired: 'Resend API requires at least one verified destination email address to dispatch the notification.',
        required: true,
      });
    }

    const subject = currentInputs.body?.subject || currentInputs.subject || entities.subject || entities.title;
    if (!subject || !String(subject).trim()) {
      missing.push({
        id: 'subject',
        name: 'subject',
        label: 'Email Subject Line',
        type: 'text',
        placeholder: 'e.g. Swytchcode Autonomous Task Briefing',
        whyRequired: 'Resend email schema requires a subject line.',
        required: true,
      });
    }
  }

  // 3. Notion Page Create
  if (canonicalId.startsWith('notion.')) {
    const title =
      currentInputs.body?.properties?.title?.[0]?.text?.content ||
      currentInputs.title ||
      entities.title ||
      entities.destination;
    if (!title || !String(title).trim()) {
      missing.push({
        id: 'title',
        name: 'title',
        label: 'Notion Page Title',
        type: 'text',
        placeholder: 'e.g. Project Integration Workspace Notes',
        whyRequired: 'Notion requires a title property to create and index the new workspace document.',
        required: true,
      });
    }
  }

  return missing;
}

/**
 * Validates and normalizes inputs for specific canonical methods
 */
export function validateAndFormatMethodInputs(
  canonicalId: string,
  rawArgs: any = {},
  fallbackContext: Record<string, any> = {}
): { isValid: boolean; error?: string; formattedArgs: any } {
  // 1. WeatherAPI Forecast
  if (canonicalId === 'weatherapi.forecast.list' || canonicalId.startsWith('weatherapi.')) {
    const explicitQ =
      rawArgs.params?.q !== undefined
        ? rawArgs.params.q
        : rawArgs.q !== undefined
        ? rawArgs.q
        : undefined;
    const q = explicitQ !== undefined ? explicitQ : (fallbackContext.location || fallbackContext.destination || 'Jaipur');
    const rawDays = rawArgs.params?.days !== undefined ? rawArgs.params.days : (rawArgs.days !== undefined ? rawArgs.days : fallbackContext.durationDays);
    const days = Math.max(1, Math.min(Number(rawDays) || 3, 10));

    if (!q || String(q).trim().length < 2) {
      return {
        isValid: false,
        error: 'Location query (q) must be at least 2 characters long.',
        formattedArgs: null,
      };
    }

    return {
      isValid: true,
      formattedArgs: {
        params: {
          q: String(q).trim(),
          days,
        },
      },
    };
  }

  // 2. Resend Email Dispatch
  if (canonicalId === 'resend.email.create' || canonicalId.startsWith('resend.')) {
    const body = rawArgs.body || rawArgs;
    const explicitTo = body.to !== undefined ? body.to : (rawArgs.to !== undefined ? rawArgs.to : undefined);
    const to = explicitTo !== undefined ? explicitTo : (fallbackContext.recipient || fallbackContext.to);
    const from = body.from || 'onboarding@resend.dev';
    const subject = body.subject || fallbackContext.subject || fallbackContext.title || 'Notification from Swytchcode Agent';
    const text = body.text || body.content || fallbackContext.text || fallbackContext.summary || 'Task completed successfully.';
    const html = body.html || undefined;

    if (isPlaceholderOrEmptyEmail(to)) {
      return {
        isValid: false,
        error: 'Valid recipient email address (to) is required.',
        formattedArgs: null,
      };
    }

    return {
      isValid: true,
      formattedArgs: {
        body: {
          from,
          to: Array.isArray(to) ? to : [String(to).trim()],
          subject: String(subject).trim(),
          text: String(text).trim(),
          ...(html ? { html: String(html) } : {}),
        },
      },
    };
  }

  // 3. Notion Page Create
  if (canonicalId === 'notion.page.create' || canonicalId.startsWith('notion.')) {
    const body = rawArgs.body || rawArgs;
    const title = body.title || fallbackContext.title || fallbackContext.destination || 'Swytchcode Autonomous Workspace Document';
    const pageId = body.parent?.page_id || fallbackContext.pageId || 'mock_workspace_root_id';

    return {
      isValid: true,
      formattedArgs: {
        body: {
          parent: {
            page_id: pageId,
          },
          properties: {
            title: [
              {
                text: {
                  content: String(title),
                },
              },
            ],
          },
          ...(body.children ? { children: body.children } : {}),
        },
      },
    };
  }

  // Generic fallback formatting
  return {
    isValid: true,
    formattedArgs: rawArgs || {},
  };
}
