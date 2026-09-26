import { executeSwytchcodeMethod } from './swytchcode.js';
import { ToolExecutionResult } from './types.js';

/**
 * Executes a Swytchcode tool with bounded retries and exponential backoff for transient issues
 */
export async function executeToolWithRetry(
  canonicalId: string,
  args: any,
  maxRetries: number = 2
): Promise<ToolExecutionResult> {
  let attempts = 0;
  let lastError = '';

  while (attempts <= maxRetries) {
    attempts++;
    const result = await executeSwytchcodeMethod(canonicalId, args);

    if (result.success) {
      return {
        canonicalId,
        success: true,
        data: result.data,
        latencyMs: result.latencyMs,
        isMocked: result.isMocked,
      };
    }

    lastError = result.error || 'Execution failed';

    // Do NOT retry deterministic validation errors or unauthorized tool errors
    if (
      lastError.includes('input validation failed') ||
      lastError.includes('missing required field') ||
      lastError.includes('is NOT registered') ||
      lastError.includes('missing credentials') ||
      lastError.includes('unauthorized') ||
      lastError.includes('No connected account found') ||
      lastError.includes('refresh credential') ||
      lastError.includes('"category":"auth"') ||
      lastError.includes('swytchcode login')
    ) {
      return {
        canonicalId,
        success: false,
        data: null,
        latencyMs: result.latencyMs,
        isMocked: false,
        error: lastError,
      };
    }

    if (attempts <= maxRetries) {
      console.warn(`[Executor] Retry attempt ${attempts}/${maxRetries} for ${canonicalId} after error: ${lastError}`);
      await new Promise(resolve => setTimeout(resolve, 400 * Math.pow(2, attempts - 1)));
    }
  }

  return {
    canonicalId,
    success: false,
    data: null,
    latencyMs: 0,
    isMocked: false,
    error: `Execution failed after ${maxRetries} retries: ${lastError}`,
  };
}
