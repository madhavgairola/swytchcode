import fs from 'fs';
import path from 'path';
import { config } from './config.js';
import { ValidatedMethod } from './types.js';

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
    const to = explicitTo !== undefined ? explicitTo : (fallbackContext.recipient || fallbackContext.to || 'user@example.com');
    const from = body.from || 'onboarding@resend.dev';
    const subject = body.subject || fallbackContext.subject || fallbackContext.title || 'Notification from Swytchcode Agent';
    const text = body.text || body.content || fallbackContext.text || fallbackContext.summary || 'Task completed successfully.';
    const html = body.html || undefined;

    if (!to || (Array.isArray(to) && to.length === 0) || (typeof to === 'string' && !to.trim())) {
      return {
        isValid: false,
        error: 'Recipient email address (to) is required.',
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
