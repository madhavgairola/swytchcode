export type SourceType = 
  | 'gmail' 
  | 'notion' 
  | 'slack' 
  | 'google_drive' 
  | 'box' 
  | 'weatherapi' 
  | 'resend' 
  | 'github'
  | 'google_calendar'
  | 'derived';

export type NodeType = 
  | 'project' 
  | 'document' 
  | 'task' 
  | 'decision' 
  | 'person' 
  | 'channel' 
  | 'external_api' 
  | 'email';

export type RelationshipType = 
  | 'dependency' 
  | 'provenance' 
  | 'mention' 
  | 'assignment' 
  | 'decision_outcome' 
  | 'references';

export interface EvidenceReference {
  source: SourceType;
  snippet: string;
  date?: string;
  url?: string;
  author?: string;
}

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  source: SourceType;
  sourceRecordId?: string;
  externalUrl?: string;
  summary: string;
  content?: string;
  relevanceScore?: number; // 0 - 100
  timestamp?: string;
  evidenceReferences?: EvidenceReference[];
  metadata?: Record<string, any>;
  degree?: number;
  group?: number;
  val?: number;
  color?: string;
  
  // Dynamic layout positioning
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphEdge {
  id: string;
  source: string; // node id
  target: string; // node id
  label: string;
  relationshipType: RelationshipType;
  strength?: number;
}

export interface KnowledgeGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface WorkContext {
  id: string;
  name: string;
  description: string;
  sources: SourceType[];
  filters: {
    allowedDomains?: string[];
    slackChannels?: string[];
    notionDatabases?: string[];
    driveFolders?: string[];
    boxFolders?: string[];
    keywords?: string[];
  };
}

export interface IndexingConfig {
  extractTasks: boolean;
  extractDecisions: boolean;
  extractDeadlines: boolean;
  extractPeople: boolean;
  relevanceThreshold: number; // 0 to 100
  autoSyncOnAction: boolean;
}

export interface IntegrationConnection {
  id: string;
  name: string;
  provider: string;
  category: 'workspace' | 'communication' | 'storage' | 'utility';
  status: 'connected' | 'pending_auth' | 'disconnected';
  accountEmail?: string;
  lastSynced?: string;
  itemsCount: number;
  swytchcodeTool: string;
  iconName: string;
}

export interface InvestigationHistoryItem {
  id: string;
  prompt: string;
  timestamp: string;
  status: 'COMPLETED' | 'PAUSED' | 'FAILED' | 'RUNNING';
  summary?: string;
  toolsUsed: string[];
  nodesReferenced: string[];
  workflowId?: string;
}

export type {
  SyncCategoryFilters,
  SyncFilterConfig,
  SyncRunResult,
  SyncAgentStatus
} from '../../../server/types.js';


