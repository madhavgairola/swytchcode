import { analyzeGoalAndRequirements, createExecutionPlan, synthesizeTaskResult } from './gemini.js';
import { discoverCapabilities } from './swytchcode.js';
import {
  getRegisteredTools,
  validateMethodAgainstTooling,
  validateAndFormatMethodInputs,
  isConsequentialMethod,
} from './validator.js';
import { executeToolWithRetry } from './executor.js';
import {
  AgentResponse,
  WorkflowEvent,
  UserGoalAnalysis,
  DiscoveredCapability,
  TaskPlan,
  PlanStep,
  ConfirmationRequest,
  TaskResult,
} from './types.js';
import { config } from './config.js';

export type EventEmitter = (event: WorkflowEvent) => void;

export interface WorkflowOptions {
  autoApproveSideEffects?: boolean;
  preApprovedConfirmationId?: string;
  onEvent?: EventEmitter;
}

/**
 * Main General-Purpose Autonomous Agent Orchestration Pipeline:
 * User Request -> Gemini Goal Analysis -> Swytchcode Dynamic Discovery -> Plan Creation -> Tool Validation -> Confirmation Check -> Swytchcode Execution -> Result Synthesis
 */
export async function runAutonomousAgentWorkflow(
  userMessage: string,
  options: WorkflowOptions = {}
): Promise<AgentResponse> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const events: WorkflowEvent[] = [];

  const emit = (event: Omit<WorkflowEvent, 'timestamp'>) => {
    const fullEvent: WorkflowEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };
    events.push(fullEvent);
    if (options.onEvent) {
      try {
        options.onEvent(fullEvent);
      } catch (err) {
        // ignore stream disconnects
      }
    }
  };

  let goal: UserGoalAnalysis | undefined;
  let allDiscoveredCapabilities: DiscoveredCapability[] = [];
  let plan: TaskPlan | undefined;
  let taskResult: TaskResult | undefined;
  const stepOutputs: Record<string, any> = {};

  try {
    // ----------------------------------------------------
    // STEP 1: Understanding Request (Gemini)
    // ----------------------------------------------------
    emit({
      step: 'understanding',
      status: 'in_progress',
      message: 'Analyzing user request to extract goal, intent classification, and entity parameters...',
    });

    goal = await analyzeGoalAndRequirements(userMessage);

    emit({
      step: 'understanding',
      status: 'success',
      message: `Identified goal: "${goal.goal}" [Category: ${goal.intentCategory}]`,
      payload: goal,
    });

    // ----------------------------------------------------
    // STEP 2: Swytchcode Capability Discovery
    // ----------------------------------------------------
    emit({
      step: 'discovering',
      status: 'in_progress',
      message: `Searching Swytchcode remote registry for capabilities matching intent queries: [${goal.requiredCapabilities.join(', ')}]...`,
    });

    for (const query of goal.requiredCapabilities) {
      const discovered = await discoverCapabilities(query);
      for (const cap of discovered) {
        if (!allDiscoveredCapabilities.some(c => c.canonical_id === cap.canonical_id)) {
          allDiscoveredCapabilities.push(cap);
        }
      }
    }

    // Fallback baseline discovery if queries returned empty
    if (allDiscoveredCapabilities.length === 0) {
      const fallbackCapabilities = await discoverCapabilities('weather forecast');
      allDiscoveredCapabilities.push(...fallbackCapabilities);
    }

    emit({
      step: 'discovering',
      status: 'success',
      message: `Discovered ${allDiscoveredCapabilities.length} candidate capabilities from Swytchcode registry.`,
      payload: {
        queries: goal.requiredCapabilities,
        capabilities: allDiscoveredCapabilities,
      },
    });

    // ----------------------------------------------------
    // STEP 3: Execution Planning
    // ----------------------------------------------------
    emit({
      step: 'planning',
      status: 'in_progress',
      message: 'Constructing sequential execution plan against locally registered Swytchcode tools...',
    });

    const registeredTools = getRegisteredTools();
    plan = await createExecutionPlan(goal, allDiscoveredCapabilities, registeredTools);

    emit({
      step: 'planning',
      status: 'success',
      message: `Created plan "${plan.title}" with ${plan.steps.length} execution step(s).`,
      payload: plan,
    });

    // ----------------------------------------------------
    // STEP 4: Method & Input Validation
    // ----------------------------------------------------
    emit({
      step: 'validating',
      status: 'in_progress',
      message: 'Validating plan steps against security policies and tooling.json schemas...',
    });

    for (const step of plan.steps) {
      const validation = validateMethodAgainstTooling(step.canonicalId);
      if (!validation.isValid) {
        throw new Error(`Security validation failed for step '${step.action}': ${validation.reason}`);
      }

      const inputValidation = validateAndFormatMethodInputs(step.canonicalId, step.inputs, goal.entities);
      if (!inputValidation.isValid) {
        throw new Error(`Parameter validation failed for step '${step.action}': ${inputValidation.error}`);
      }

      step.inputs = inputValidation.formattedArgs;
      step.integrationName = validation.integrationName;
      step.isSideEffect = validation.isSideEffect || false;
    }

    emit({
      step: 'validating',
      status: 'success',
      message: `All ${plan.steps.length} step(s) verified against local tooling.json and security policies.`,
      payload: { steps: plan.steps },
    });

    // ----------------------------------------------------
    // STEP 5: Consequential Action Gating (Confirmation Check)
    // ----------------------------------------------------
    const requiresExplicitConfirmation =
      !options.autoApproveSideEffects &&
      !config.isDemoMode &&
      plan.steps.some(s => s.isSideEffect);

    if (requiresExplicitConfirmation && !options.preApprovedConfirmationId) {
      const sideEffectStep = plan.steps.find(s => s.isSideEffect)!;
      sideEffectStep.status = 'awaiting_confirmation';

      const confirmationRequest: ConfirmationRequest = {
        confirmationId: `conf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        stepId: sideEffectStep.id,
        canonicalId: sideEffectStep.canonicalId,
        actionDescription: sideEffectStep.action,
        targetResource:
          sideEffectStep.inputs?.body?.to ||
          sideEffectStep.inputs?.body?.properties?.title?.[0]?.text?.content ||
          sideEffectStep.integrationName,
        parameters: sideEffectStep.inputs,
        severity: sideEffectStep.canonicalId.includes('email') ? 'high' : 'medium',
      };

      emit({
        step: 'awaiting_confirmation',
        status: 'awaiting_confirmation',
        message: `Action requires human confirmation before proceeding: ${sideEffectStep.action}`,
        payload: confirmationRequest,
      });

      return {
        success: true,
        requestId,
        userMessage,
        goalAnalysis: goal,
        discoveredCapabilities: allDiscoveredCapabilities,
        plan,
        confirmationRequest,
        events,
      };
    }

    // ----------------------------------------------------
    // STEP 6: Multi-Step Tool Execution via Swytchcode
    // ----------------------------------------------------
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      step.status = 'executing';
      plan.currentStepIndex = i;

      emit({
        step: 'executing',
        status: 'in_progress',
        message: `[Step ${step.order}/${plan.steps.length}] Executing ${step.canonicalId} (${step.action})...`,
        payload: { step },
      });

      // Context enrichment: feed previous step output into downstream step if appropriate
      if (i > 0 && Object.keys(stepOutputs).length > 0) {
        step.inputs = enrichStepInputsWithPreviousOutputs(step, stepOutputs, goal);
      }

      const execResult = await executeToolWithRetry(step.canonicalId, step.inputs);

      if (!execResult.success) {
        step.status = 'failed';
        step.error = execResult.error;
        throw new Error(`Tool execution failed for ${step.canonicalId}: ${execResult.error}`);
      }

      step.status = 'completed';
      step.output = execResult.data;
      step.latencyMs = execResult.latencyMs;
      step.isMocked = execResult.isMocked;
      stepOutputs[step.canonicalId] = execResult.data;

      emit({
        step: 'executing',
        status: 'success',
        message: `[Step ${step.order}/${plan.steps.length}] Successfully executed ${step.canonicalId} (${execResult.latencyMs}ms)${execResult.isMocked ? ' [Sandbox Mode]' : ' [Live API]'}`,
        payload: {
          stepOrder: step.order,
          canonicalId: step.canonicalId,
          output: execResult.data,
          latencyMs: execResult.latencyMs,
          isMocked: execResult.isMocked,
        },
      });
    }

    // ----------------------------------------------------
    // STEP 7: Result Synthesis (Gemini)
    // ----------------------------------------------------
    emit({
      step: 'synthesizing',
      status: 'in_progress',
      message: 'Synthesizing comprehensive response and structuring execution artifacts...',
    });

    taskResult = await synthesizeTaskResult(userMessage, goal, plan, stepOutputs);

    emit({
      step: 'synthesizing',
      status: 'success',
      message: 'Synthesis complete.',
      payload: taskResult,
    });

    // ----------------------------------------------------
    // STEP 8: Completion
    // ----------------------------------------------------
    emit({
      step: 'completed',
      status: 'success',
      message: 'Autonomous workflow executed successfully.',
    });

    return {
      success: true,
      requestId,
      userMessage,
      goalAnalysis: goal,
      discoveredCapabilities: allDiscoveredCapabilities,
      plan,
      taskResult,
      events,
    };
  } catch (err: any) {
    const errorMessage = err.message || 'An unexpected error occurred during autonomous workflow execution.';
    console.error('[Autonomous Workflow Error]:', err);

    emit({
      step: 'error',
      status: 'error',
      message: errorMessage,
      payload: { error: errorMessage },
    });

    return {
      success: false,
      requestId,
      userMessage,
      goalAnalysis: goal,
      discoveredCapabilities: allDiscoveredCapabilities,
      plan,
      events,
      error: errorMessage,
    };
  }
}

/**
 * Enriches downstream step payloads with results from earlier upstream steps
 */
function enrichStepInputsWithPreviousOutputs(
  step: PlanStep,
  previousOutputs: Record<string, any>,
  goal: UserGoalAnalysis
): any {
  const currentInputs = { ...step.inputs };

  // If previous step was weather forecast and current step is Notion or Email
  const weatherOutput = Object.entries(previousOutputs).find(([key]) => key.includes('weatherapi'))?.[1];

  if (weatherOutput) {
    const location = weatherOutput?.location?.name || goal.entities.location || 'Location';
    const temp = weatherOutput?.current?.temp_c;
    const condition = weatherOutput?.current?.condition?.text;
    const weatherSummary = `Current conditions for ${location}: ${condition}, ${temp}°C.`;

    if (step.canonicalId.startsWith('notion.')) {
      if (!currentInputs.body) currentInputs.body = {};
      if (!currentInputs.body.properties) {
        currentInputs.body.properties = {
          title: [{ text: { content: `${location} Travel & Weather Briefing` } }],
        };
      }
    }

    if (step.canonicalId.startsWith('resend.')) {
      if (!currentInputs.body) currentInputs.body = {};
      if (!currentInputs.body.text || currentInputs.body.text.length < 10) {
        currentInputs.body.text = `${weatherSummary}\n\nGenerated autonomously by Swytchcode Agent for ${location}.`;
      }
    }
  }

  return currentInputs;
}
