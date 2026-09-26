export type WorkflowStatus =
  | 'ANALYZING'
  | 'DISCOVERING_TOOLS'
  | 'PLANNING'
  | 'WAITING_FOR_INPUT'
  | 'WAITING_FOR_AUTH'
  | 'WAITING_FOR_CONFIRMATION'
  | 'EXECUTING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

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

export interface DynamicFormField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'email' | 'url' | 'date' | 'number' | 'select' | 'multiline' | 'password';
  placeholder?: string;
  whyRequired: string;
  options?: Array<{ label: string; value: string }>;
  defaultValue?: any;
  required: boolean;
}

export interface MissingInputRequest {
  requestId: string;
  stepId: string;
  stepOrder: number;
  canonicalId: string;
  actionDescription: string;
  fields: DynamicFormField[];
}

export interface AuthRequest {
  authId: string;
  stepId: string;
  provider: string;
  canonicalId: string;
  status: 'unauthenticated' | 'expired' | 'missing_credentials';
  instructions: string;
  authCommand?: string;
}

export interface ConfirmationRequest {
  confirmationId: string;
  stepId: string;
  canonicalId: string;
  actionDescription: string;
  targetResource: string;
  parameters: Record<string, any>;
  expectedEffect: string;
  subsequentSteps: string[];
  severity: 'low' | 'medium' | 'high';
}

export interface PlanStep {
  id: string;
  order: number;
  action: string;
  canonicalId: string;
  integrationName: string;
  isSideEffect: boolean;
  status: 'pending' | 'waiting_for_input' | 'waiting_for_auth' | 'waiting_for_confirmation' | 'executing' | 'completed' | 'skipped' | 'failed';
  inputs: Record<string, any>;
  output?: any;
  error?: string;
  latencyMs?: number;
  isMocked?: boolean;
  missingFields?: DynamicFormField[];
}

export interface TaskPlan {
  planId: string;
  title: string;
  description: string;
  steps: PlanStep[];
  currentStepIndex: number;
  status: 'planning' | 'ready' | 'in_progress' | 'paused' | 'completed' | 'failed' | 'cancelled';
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
  inputs?: any;
  output?: any;
}

export interface ArtifactLink {
  title: string;
  url: string;
  type: 'notion' | 'drive' | 'slack' | 'email' | 'box' | 'web';
  description?: string;
}

export interface TaskResult {
  summary: string;
  structuredData?: Record<string, any>;
  markdown: string;
  actionsTaken: ActionAuditItem[];
  artifacts?: ArtifactLink[];
}

export interface WorkflowEvent {
  step: string;
  status: 'pending' | 'in_progress' | 'success' | 'warning' | 'error' | 'awaiting_confirmation' | 'waiting_for_input' | 'waiting_for_auth';
  message: string;
  timestamp: string;
  payload?: any;
}

export interface WorkflowState {
  workflowId: string;
  status: WorkflowStatus;
  userMessage: string;
  goalAnalysis?: UserGoalAnalysis;
  discoveredCapabilities?: DiscoveredCapability[];
  plan?: TaskPlan;
  currentStepIndex: number;
  context: Record<string, any>;
  stepOutputs: Record<string, any>;
  missingInputRequest?: MissingInputRequest;
  authRequest?: AuthRequest;
  confirmationRequest?: ConfirmationRequest;
  taskResult?: TaskResult;
  events: WorkflowEvent[];
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentResponse {
  success: boolean;
  workflowId: string;
  status: WorkflowStatus;
  userMessage: string;
  goalAnalysis?: UserGoalAnalysis;
  discoveredCapabilities?: DiscoveredCapability[];
  plan?: TaskPlan;
  missingInputRequest?: MissingInputRequest;
  authRequest?: AuthRequest;
  confirmationRequest?: ConfirmationRequest;
  taskResult?: TaskResult;
  events: WorkflowEvent[];
  error?: string;
}

export interface SyncCategoryFilters {
  socialNetworking: boolean;
  eventConferencePass: boolean;
  campusOpportunity: boolean;
  newsletterDigest: boolean;
  directCommunication: boolean;
  securityAlert: boolean;
}

export interface SyncFilterConfig {
  enabled: boolean;
  intervalMinutes: number; // 0 = manual, 15, 30, 60, 360, 1440
  allowedDomains: string[];
  allowedSenders: string[];
  blockedDomains: string[];
  categoryFilters: SyncCategoryFilters;
  keywords: string[];
  semanticExpansion: boolean;
  expandedKeywords?: string[];
  minUrgencyLevel: 'ALL' | 'LOW' | 'MEDIUM' | 'HIGH';
  minRelevanceScore: number;
  sendSummaryEmail?: boolean;
  recipientEmail?: string;
}

export interface SyncRunResult {
  runId: string;
  timestamp: string;
  totalFetched: number;
  totalPassedFilters: number;
  totalRejected: number;
  nodesCreated: number;
  edgesCreated: number;
  createdNodeLabels: string[];
  rejectionBreakdown: {
    domainFiltered: number;
    categoryFiltered: number;
    keywordFiltered: number;
    duplicate: number;
    urgencyFiltered: number;
  };
  durationMs: number;
}

export interface SyncAgentStatus {
  isRunning: boolean;
  enabled: boolean;
  intervalMinutes: number;
  lastSyncTimestamp: string | null;
  nextSyncTimestamp: string | null;
  totalProcessedCount: number;
  totalNodesIngested: number;
  lastRunResult: SyncRunResult | null;
  config: SyncFilterConfig;
}

