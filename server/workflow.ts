import { analyzeGoalAndRequirements, createExecutionPlan, synthesizeTaskResult } from './gemini.js';
import { discoverCapabilities, checkProviderAuthStatus } from './swytchcode.js';
import {
  getRegisteredTools,
  validateMethodAgainstTooling,
  validateAndFormatMethodInputs,
  detectMissingFieldsForStep,
  getProviderForCanonicalId,
  isConsequentialMethod,
} from './validator.js';
import { executeToolWithRetry } from './executor.js';
import {
  WorkflowState,
  WorkflowEvent,
  UserGoalAnalysis,
  DiscoveredCapability,
  TaskPlan,
  PlanStep,
  ConfirmationRequest,
  MissingInputRequest,
  AuthRequest,
  TaskResult,
  AgentResponse,
} from './types.js';
import { workflowStore } from './workflowStore.js';
import { config } from './config.js';

export interface WorkflowRunOptions {
  autoApproveSideEffects?: boolean;
  onEvent?: (event: WorkflowEvent) => void;
  bypassAuth?: boolean;
  preApprovedConfirmationId?: string;
}

/**
 * Initiates or resumes the General-Purpose Autonomous Agent Orchestration Pipeline
 */
export async function startOrResumeWorkflow(
  userMessageOrState: string | WorkflowState,
  options: WorkflowRunOptions = {}
): Promise<AgentResponse> {
  let state: WorkflowState;

  if (typeof userMessageOrState === 'string') {
    const workflowId = `wf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    state = {
      workflowId,
      status: 'ANALYZING',
      userMessage: userMessageOrState,
      currentStepIndex: 0,
      context: {},
      stepOutputs: {},
      events: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    workflowStore.save(state);
  } else {
    state = userMessageOrState;
  }

  const emit = (event: Omit<WorkflowEvent, 'timestamp'>) => {
    const fullEvent: WorkflowEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };
    state = workflowStore.save(state, fullEvent);
    if (options.onEvent) {
      try {
        options.onEvent(fullEvent);
      } catch (err) {
        // ignore stream disconnects
      }
    }
  };

  try {
    // ----------------------------------------------------
    // STEP 1: Understanding Request (Gemini)
    // ----------------------------------------------------
    if (!state.goalAnalysis) {
      state.status = 'ANALYZING';
      emit({
        step: 'understanding',
        status: 'in_progress',
        message: 'Analyzing user request, identifying intent, and extracting parameters...',
      });

      state.goalAnalysis = await analyzeGoalAndRequirements(state.userMessage);
      state.context = { ...state.context, ...state.goalAnalysis.entities };

      emit({
        step: 'understanding',
        status: 'success',
        message: `Identified goal: "${state.goalAnalysis.goal}" [Category: ${state.goalAnalysis.intentCategory}]`,
        payload: state.goalAnalysis,
      });
    }

    // ----------------------------------------------------
    // STEP 2: Swytchcode Capability Discovery
    // ----------------------------------------------------
    if (!state.discoveredCapabilities || state.discoveredCapabilities.length === 0) {
      state.status = 'DISCOVERING_TOOLS';
      emit({
        step: 'discovering',
        status: 'in_progress',
        message: `Searching Swytchcode remote registry for capabilities matching intent queries: [${state.goalAnalysis.requiredCapabilities.join(', ')}]...`,
      });

      const allCaps: DiscoveredCapability[] = [];
      for (const query of state.goalAnalysis.requiredCapabilities) {
        const discovered = await discoverCapabilities(query);
        for (const cap of discovered) {
          if (!allCaps.some(c => c.canonical_id === cap.canonical_id)) {
            allCaps.push(cap);
          }
        }
      }

      if (allCaps.length === 0) {
        const fallbackCapabilities = await discoverCapabilities('weather forecast');
        allCaps.push(...fallbackCapabilities);
      }

      state.discoveredCapabilities = allCaps;
      emit({
        step: 'discovering',
        status: 'success',
        message: `Discovered ${allCaps.length} candidate capabilities from Swytchcode registry.`,
        payload: { capabilities: allCaps },
      });
    }

    // ----------------------------------------------------
    // STEP 3: Execution Planning
    // ----------------------------------------------------
    if (!state.plan) {
      state.status = 'PLANNING';
      emit({
        step: 'planning',
        status: 'in_progress',
        message: 'Constructing multi-step execution plan against registered Swytchcode tools...',
      });

      const registeredTools = getRegisteredTools();
      state.plan = await createExecutionPlan(state.goalAnalysis, state.discoveredCapabilities, registeredTools);

      emit({
        step: 'planning',
        status: 'success',
        message: `Created plan "${state.plan.title}" with ${state.plan.steps.length} sequential execution step(s).`,
        payload: state.plan,
      });
    }

    // ----------------------------------------------------
    // STEP 4: Step-by-Step Execution Loop with State Machine Gating
    // ----------------------------------------------------
    const plan = state.plan;

    for (let i = state.currentStepIndex; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      state.currentStepIndex = i;

      // Skip already completed steps on resume
      if (step.status === 'completed') {
        continue;
      }

      // 4A. Validate Method Against Tooling Registry
      const validation = validateMethodAgainstTooling(step.canonicalId);
      if (!validation.isValid) {
        throw new Error(`Security validation failed for '${step.canonicalId}': ${validation.reason}`);
      }
      step.integrationName = validation.integrationName;
      step.isSideEffect = validation.isSideEffect || false;

      // 4B. Context Binding & Enrichment from previous step outputs
      if (i > 0 && Object.keys(state.stepOutputs).length > 0) {
        step.inputs = enrichStepInputsWithPreviousOutputs(step, state.stepOutputs, state.goalAnalysis, state.context);
      }

      // 4C. Check Missing Required Information
      const missingFields = detectMissingFieldsForStep(step.canonicalId, step.inputs, state.context);
      if (missingFields.length > 0) {
        step.status = 'waiting_for_input';
        step.missingFields = missingFields;
        state.status = 'WAITING_FOR_INPUT';

        const missingRequest: MissingInputRequest = {
          requestId: `req_input_${Date.now()}`,
          stepId: step.id,
          stepOrder: step.order,
          canonicalId: step.canonicalId,
          actionDescription: step.action,
          fields: missingFields,
        };

        state.missingInputRequest = missingRequest;
        emit({
          step: 'waiting_for_input',
          status: 'waiting_for_input',
          message: `Required information missing for step ${step.order} (${step.action}). Awaiting user input.`,
          payload: missingRequest,
        });

        return buildAgentResponse(state);
      }

      // Format validated inputs
      const formatResult = validateAndFormatMethodInputs(step.canonicalId, step.inputs, state.context);
      if (!formatResult.isValid) {
        throw new Error(`Parameter validation failed for ${step.canonicalId}: ${formatResult.error}`);
      }
      step.inputs = formatResult.formattedArgs;

      // 4D. Check Authentication / Provider Authorization Status
      const provider = getProviderForCanonicalId(step.canonicalId);
      const authStatus = await checkProviderAuthStatus(provider);

      if (authStatus.status === 'requires_auth' && !options.bypassAuth) {
        step.status = 'waiting_for_auth';
        state.status = 'WAITING_FOR_AUTH';

        const authRequest: AuthRequest = {
          authId: `auth_${Date.now()}`,
          stepId: step.id,
          provider,
          canonicalId: step.canonicalId,
          status: 'unauthenticated',
          instructions: authStatus.details || `Please authenticate provider '${provider}' via Swytchcode.`,
          authCommand: `swytchcode auth connect ${provider}`,
        };

        state.authRequest = authRequest;
        emit({
          step: 'waiting_for_auth',
          status: 'waiting_for_auth',
          message: `Provider authentication required for ${provider} (${step.canonicalId}).`,
          payload: authRequest,
        });

        return buildAgentResponse(state);
      }

      // 4E. Consequential Action Gating (Human Confirmation)
      if (
        step.isSideEffect &&
        !options.autoApproveSideEffects &&
        step.status !== 'waiting_for_confirmation'
      ) {
        step.status = 'waiting_for_confirmation';
        state.status = 'WAITING_FOR_CONFIRMATION';

        const confirmationRequest: ConfirmationRequest = {
          confirmationId: `conf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          stepId: step.id,
          canonicalId: step.canonicalId,
          actionDescription: step.action,
          targetResource:
            step.inputs?.body?.to ||
            step.inputs?.body?.properties?.title?.[0]?.text?.content ||
            step.integrationName,
          parameters: step.inputs,
          expectedEffect: `Will execute external operation '${step.canonicalId}' via Swytchcode.`,
          subsequentSteps: plan.steps.slice(i + 1).map(s => s.action),
          severity: step.canonicalId.includes('email') ? 'high' : 'medium',
        };

        state.confirmationRequest = confirmationRequest;
        emit({
          step: 'awaiting_confirmation',
          status: 'awaiting_confirmation',
          message: `Action requires human confirmation: ${step.action}`,
          payload: confirmationRequest,
        });

        return buildAgentResponse(state);
      }

      // 4F. Execute Step via Swytchcode Kernel
      state.status = 'EXECUTING';
      step.status = 'executing';

      emit({
        step: 'executing',
        status: 'in_progress',
        message: `[Step ${step.order}/${plan.steps.length}] Executing ${step.canonicalId} (${step.action})...`,
        payload: { step },
      });

      const execResult = await executeToolWithRetry(step.canonicalId, step.inputs);

      if (!execResult.success) {
        step.status = 'failed';
        step.error = execResult.error;
        state.status = 'FAILED';
        state.error = execResult.error;
        throw new Error(`Tool execution failed for ${step.canonicalId}: ${execResult.error}`);
      }

      step.status = 'completed';
      step.output = execResult.data;
      step.latencyMs = execResult.latencyMs;
      step.isMocked = execResult.isMocked;
      state.stepOutputs[step.canonicalId] = execResult.data;

      emit({
        step: 'executing',
        status: 'success',
        message: `[Step ${step.order}/${plan.steps.length}] Successfully executed ${step.canonicalId} (${execResult.latencyMs}ms)${execResult.isMocked ? ' [Sandbox Execution]' : ' [Live Kernel]'}`,
        payload: {
          stepOrder: step.order,
          canonicalId: step.canonicalId,
          output: execResult.data,
          latencyMs: execResult.latencyMs,
          isMocked: execResult.isMocked,
        },
      });

      // Clear any pending requests
      state.missingInputRequest = undefined;
      state.authRequest = undefined;
      state.confirmationRequest = undefined;
    }

    // ----------------------------------------------------
    // STEP 5: Task Result Synthesis (Gemini)
    // ----------------------------------------------------
    emit({
      step: 'synthesizing',
      status: 'in_progress',
      message: 'Synthesizing final verified response from all tool execution outputs...',
    });

    state.taskResult = await synthesizeTaskResult(
      state.userMessage,
      state.goalAnalysis,
      state.plan,
      state.stepOutputs
    );

    state.status = 'COMPLETED';
    emit({
      step: 'synthesizing',
      status: 'success',
      message: 'Workflow completed successfully.',
      payload: state.taskResult,
    });

    workflowStore.save(state);
    return buildAgentResponse(state);
  } catch (err: any) {
    const errorMessage = err.message || 'An unexpected error occurred during autonomous workflow execution.';
    console.error('[Autonomous Workflow Error]:', err);

    state.status = 'FAILED';
    state.error = errorMessage;

    emit({
      step: 'error',
      status: 'error',
      message: errorMessage,
      payload: { error: errorMessage },
    });

    workflowStore.save(state);
    return buildAgentResponse(state);
  }
}

/**
 * Resumes workflow when user submits missing dynamic form inputs
 */
export async function resumeWorkflowWithInputs(
  workflowId: string,
  inputValues: Record<string, any>,
  options: WorkflowRunOptions = {}
): Promise<AgentResponse> {
  const state = workflowStore.get(workflowId);
  if (!state) {
    throw new Error(`Workflow '${workflowId}' not found.`);
  }

  // Update context with provided inputs
  state.context = { ...state.context, ...inputValues };

  // If current step had missing fields, merge them into step inputs
  if (state.plan && state.plan.steps[state.currentStepIndex]) {
    const currentStep = state.plan.steps[state.currentStepIndex];
    currentStep.inputs = { ...currentStep.inputs, ...inputValues };
    currentStep.status = 'pending';
    currentStep.missingFields = undefined;
  }

  state.missingInputRequest = undefined;
  state.status = 'EXECUTING';

  return startOrResumeWorkflow(state, options);
}

/**
 * Resumes workflow when user approves or rejects consequential action confirmation
 */
export async function resumeWorkflowWithConfirmation(
  workflowId: string,
  approved: boolean,
  options: WorkflowRunOptions = {}
): Promise<AgentResponse> {
  const state = workflowStore.get(workflowId);
  if (!state) {
    throw new Error(`Workflow '${workflowId}' not found.`);
  }

  if (!approved) {
    state.status = 'CANCELLED';
    state.confirmationRequest = undefined;
    if (state.plan && state.plan.steps[state.currentStepIndex]) {
      state.plan.steps[state.currentStepIndex].status = 'skipped';
    }
    workflowStore.save(state);
    return buildAgentResponse(state);
  }

  state.confirmationRequest = undefined;
  state.status = 'EXECUTING';
  if (state.plan && state.plan.steps[state.currentStepIndex]) {
    state.plan.steps[state.currentStepIndex].status = 'pending';
  }

  return startOrResumeWorkflow(state, { ...options, autoApproveSideEffects: true });
}

/**
 * Resumes workflow after user completes provider authentication
 */
export async function resumeWorkflowWithAuth(
  workflowId: string,
  options: WorkflowRunOptions = {}
): Promise<AgentResponse> {
  const state = workflowStore.get(workflowId);
  if (!state) {
    throw new Error(`Workflow '${workflowId}' not found.`);
  }

  state.authRequest = undefined;
  state.status = 'EXECUTING';
  if (state.plan && state.plan.steps[state.currentStepIndex]) {
    state.plan.steps[state.currentStepIndex].status = 'pending';
  }

  return startOrResumeWorkflow(state, { ...options, bypassAuth: true });
}

function buildAgentResponse(state: WorkflowState): AgentResponse {
  return {
    success: state.status !== 'FAILED' && state.status !== 'CANCELLED',
    workflowId: state.workflowId,
    status: state.status,
    userMessage: state.userMessage,
    goalAnalysis: state.goalAnalysis,
    discoveredCapabilities: state.discoveredCapabilities,
    plan: state.plan,
    missingInputRequest: state.missingInputRequest,
    authRequest: state.authRequest,
    confirmationRequest: state.confirmationRequest,
    taskResult: state.taskResult,
    events: state.events,
    error: state.error,
  };
}

/**
 * Enriches downstream step payloads with results from earlier upstream steps
 */
function enrichStepInputsWithPreviousOutputs(
  step: PlanStep,
  previousOutputs: Record<string, any>,
  goal: UserGoalAnalysis,
  context: Record<string, any>
): any {
  const currentInputs = { ...step.inputs };

  const weatherOutput = Object.entries(previousOutputs).find(([key]) => key.includes('weatherapi'))?.[1];
  const notionOutput = Object.entries(previousOutputs).find(([key]) => key.includes('notion'))?.[1];

  if (weatherOutput) {
    const location = weatherOutput?.location?.name || context.location || goal.entities.location || 'Location';
    const temp = weatherOutput?.current?.temp_c;
    const condition = weatherOutput?.current?.condition?.text;
    const weatherSummary = `Forecast for ${location}: ${condition}, ${temp}°C.`;

    if (step.canonicalId.startsWith('notion.')) {
      if (!currentInputs.body) currentInputs.body = {};
      if (!currentInputs.body.properties) {
        currentInputs.body.properties = {
          title: [{ text: { content: `${location} Travel & Strategic Intelligence` } }],
        };
      }
    }

    if (step.canonicalId.startsWith('resend.')) {
      if (!currentInputs.body) currentInputs.body = {};
      const notionLink = notionOutput?.url ? `\n\n📄 Notion Workspace Document: ${notionOutput.url}` : '';
      if (!currentInputs.body.text || currentInputs.body.text.length < 10) {
        currentInputs.body.text = `${weatherSummary}${notionLink}\n\nGenerated autonomously by Swytchcode Agent for ${location}.`;
      }
    }
  }

  return currentInputs;
}

export const runAutonomousAgentWorkflow = startOrResumeWorkflow;
