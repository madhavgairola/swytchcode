export type IntentCategory =
  | 'information_retrieval'
  | 'action_dispatch'
  | 'data_mutation'
  | 'multi_step_workflow'
  | 'conversational';

export interface UserGoalAnalysis {
  goal: string;
  intentCategory: IntentCategory;
  entities: Record<string, any>;
  requiredCapabilities: string[];
  requiresConfirmation: boolean;
  rawMessage: string;
}

export interface DiscoveredCapability {
  canonical_id: string;
  type: string;
  summary: string;
  library: string;
  distance: number;
}

export interface ValidatedMethod {
  canonicalId: string;
  isValid: boolean;
  isRegisteredLocally: boolean;
  requiredInputs: string[];
  integrationName: string;
  summary?: string;
  isSideEffect?: boolean;
  reason?: string;
}

export interface PlanStep {
  id: string;
  order: number;
  action: string;
  canonicalId: string;
  integrationName: string;
  isSideEffect: boolean;
  status: 'pending' | 'awaiting_confirmation' | 'executing' | 'completed' | 'skipped' | 'failed';
  inputs: Record<string, any>;
  output?: any;
  error?: string;
  latencyMs?: number;
  isMocked?: boolean;
}

export interface TaskPlan {
  planId: string;
  title: string;
  description: string;
  steps: PlanStep[];
  currentStepIndex: number;
  status: 'planning' | 'ready' | 'awaiting_confirmation' | 'executing' | 'completed' | 'failed';
}

export interface ConfirmationRequest {
  confirmationId: string;
  stepId: string;
  canonicalId: string;
  actionDescription: string;
  targetResource: string;
  parameters: Record<string, any>;
  severity: 'low' | 'medium' | 'high';
}

export interface ToolExecutionResult {
  canonicalId: string;
  success: boolean;
  data: any;
  latencyMs: number;
  isMocked: boolean;
  error?: string;
}

export interface ActionAuditItem {
  canonicalId: string;
  integration: string;
  description: string;
  status: 'success' | 'failed' | 'skipped';
  latencyMs: number;
  isMocked: boolean;
  summary?: string;
}

export interface TaskResult {
  summary: string;
  structuredData?: Record<string, any>;
  markdown: string;
  actionsTaken: ActionAuditItem[];
}

export type WorkflowStepType =
  | 'understanding'
  | 'discovering'
  | 'planning'
  | 'validating'
  | 'awaiting_confirmation'
  | 'executing'
  | 'synthesizing'
  | 'completed'
  | 'error';

export interface WorkflowEvent {
  step: WorkflowStepType;
  status: 'pending' | 'in_progress' | 'success' | 'warning' | 'error' | 'awaiting_confirmation';
  message: string;
  timestamp: string;
  payload?: any;
}

export interface AgentResponse {
  success: boolean;
  requestId: string;
  userMessage: string;
  goalAnalysis?: UserGoalAnalysis;
  discoveredCapabilities?: DiscoveredCapability[];
  plan?: TaskPlan;
  confirmationRequest?: ConfirmationRequest;
  taskResult?: TaskResult;
  events: WorkflowEvent[];
  error?: string;
}
