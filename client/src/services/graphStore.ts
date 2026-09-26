import { 
  GraphNode, 
  GraphEdge, 
  KnowledgeGraphData, 
  WorkContext, 
  IndexingConfig, 
  IntegrationConnection, 
  InvestigationHistoryItem,
  SyncFilterConfig,
  SyncRunResult,
  SyncAgentStatus,
  SourceType,
  NodeType 
} from '../types/graph.js';

// Enterprise Source Provenance Colors
export const SOURCE_COLORS: Record<string, string> = {
  core: '#38bdf8',         // Center Origin: Sky Blue
  gmail: '#38bdf8',        // Gmail: Sky Blue
  google_drive: '#fbbf24', // Google Drive: Amber / Gold
  notion: '#a855f7',       // Notion: Purple / Violet
  slack: '#22c55e',        // Slack: Emerald / Green
  box: '#f97316',          // Box: Orange
  derived: '#ef4444',      // Decisions / Synthesis: Crimson
  decision: '#ef4444',     // Crimson
  weatherapi: '#06b6d4',   // Swytchcode WeatherAPI: Cyan
  resend: '#ec4899',       // Swytchcode Resend: Pink
  tools: '#06b6d4',        // Swytchcode Tools: Cyan
  github: '#6366f1',       // GitHub: Indigo
  google_calendar: '#ec4899', // Google Calendar: Pink
  calendar: '#ec4899',     // Calendar: Pink
};

// Authoritative Knowledge Graph Dataset with Real Enterprise Sources & Interconnections
const INITIAL_NODES: GraphNode[] = [
  // Center Root Origin (Locked at coordinate 0,0)
  { 
    id: "hub-core", 
    label: "RECALL Core", 
    group: 0, 
    val: 20, 
    fx: 0, 
    fy: 0,
    type: "project",
    source: "derived",
    color: "#38bdf8",
    summary: "Autonomous Knowledge Intelligence Core connecting enterprise silos, decisions, and runtime tools.",
    content: "Unified indexing kernel orchestrating cross-workspace graph provenance, semantic retrieval, and Swytchcode tool execution across Gmail, Google Drive, Notion, Slack, Box, and Tool APIs.",
    relevanceScore: 100,
    timestamp: "2026-09-25T18:00:00Z"
  },
  
  // 1. Gmail Hub (group 1, val: 10)
  { 
    id: "hub-gmail", 
    label: "Gmail", 
    group: 1, 
    val: 10,
    type: "channel",
    source: "gmail",
    color: "#38bdf8",
    summary: "Executive communications, client pilot feedback, and transactional email threads.",
    content: "Live indexed mailbox spanning customer signoffs, weekly ops digests, and contract approvals.",
    relevanceScore: 95,
    timestamp: "2026-09-25T17:30:00Z"
  },

  // 2. Google Drive Hub (group 2, val: 10)
  { 
    id: "hub-gdrive", 
    label: "Google Drive", 
    group: 2, 
    val: 10,
    type: "channel",
    source: "google_drive",
    color: "#fbbf24",
    summary: "Engineering RFCs, security architecture specs, and infrastructure capacity roadmaps.",
    content: "Corporate cloud storage repository containing technical whitepapers and system diagrams.",
    relevanceScore: 96,
    timestamp: "2026-09-25T17:15:00Z"
  },

  // 3. Notion Hub (group 3, val: 10)
  { 
    id: "hub-notion", 
    label: "Notion", 
    group: 3, 
    val: 10,
    type: "channel",
    source: "notion",
    color: "#a855f7",
    summary: "Engineering wiki, postmortems, product epics, and runtime API contracts.",
    content: "Collaborative knowledge workspace containing sprint roadmaps and JSON schema specifications.",
    relevanceScore: 94,
    timestamp: "2026-09-25T17:45:00Z"
  },

  // 4. Slack Hub (group 4, val: 10)
  { 
    id: "hub-slack", 
    label: "Slack", 
    group: 4, 
    val: 10,
    type: "channel",
    source: "slack",
    color: "#22c55e",
    summary: "Real-time engineering discussions, incident channels, and launch war-rooms.",
    content: "Enterprise communication threads covering architecture debates, live logs, and rollout checklists.",
    relevanceScore: 95,
    timestamp: "2026-09-25T17:50:00Z"
  },

  // 5. Box Storage Hub (group 5, val: 10)
  { 
    id: "hub-box", 
    label: "Box Storage", 
    group: 5, 
    val: 10,
    type: "channel",
    source: "box",
    color: "#f97316",
    summary: "SOC-2 Type II audit packages, vendor DPAs, and compliance artifacts.",
    content: "Encrypted enterprise storage housing regulatory filings, penetration reports, and legal agreements.",
    relevanceScore: 91,
    timestamp: "2026-09-25T16:00:00Z"
  },

  // 6. Decisions & Consensus Hub (group 6, val: 10)
  { 
    id: "hub-decisions", 
    label: "Decisions", 
    group: 6, 
    val: 10,
    type: "decision",
    source: "derived",
    color: "#ef4444",
    summary: "Approved architectural decisions, consensus logs, and technical signoffs.",
    content: "High-confidence synthesized decisions linking technical specs with executive stakeholder signoff.",
    relevanceScore: 98,
    timestamp: "2026-09-25T18:00:00Z"
  },

  // 7. Swytchcode Tools Hub (group 7, val: 10)
  { 
    id: "hub-tools", 
    label: "Tools", 
    group: 7, 
    val: 10,
    type: "external_api",
    source: "derived",
    color: "#06b6d4",
    summary: "Swytchcode runtime integration methods, MCP tools, and external APIs.",
    content: "Production-ready runtime methods with verified schemas and zero-trust key isolation.",
    relevanceScore: 97,
    timestamp: "2026-09-25T18:00:00Z"
  },

  // --- GMAIL SATELLITE KNOWLEDGE NODES ---
  { 
    id: "leaf-gmail-pilot", 
    label: "Pilot Feedback (Alpha)", 
    group: 1, 
    val: 6.5, 
    type: "email", 
    source: "gmail", 
    color: "#38bdf8",
    summary: "CTO email from Acmo Corp validating 45ms P99 API response time on Swytchcode tool execution.",
    content: "Acmo Corp feedback thread confirmed that zero-trust key isolation satisfied their enterprise audit requirements. Requested automatic Notion postmortem exports and live Slack status updates.",
    relevanceScore: 96,
    timestamp: "2026-09-24T14:20:00Z",
    evidenceReferences: [
      { source: "gmail", snippet: "45ms P99 API response time confirmed on the Swytchcode tool execution loop.", author: "CTO @ Acmo Corp", date: "2026-09-24" }
    ]
  },
  { 
    id: "leaf-gmail-legal", 
    label: "Legal & DPA Signoff", 
    group: 1, 
    val: 6, 
    type: "email", 
    source: "gmail", 
    color: "#38bdf8",
    summary: "General Counsel approval on enterprise data isolation and SOC-2 DPA addendum.",
    content: "Formal signoff email confirming compliance with GDPR standard contractual clauses and end-to-end secret encryption.",
    relevanceScore: 92,
    timestamp: "2026-09-23T11:15:00Z",
    evidenceReferences: [
      { source: "gmail", snippet: "DPA addendum approved with zero-trust storage clause.", author: "Legal Counsel", date: "2026-09-23" }
    ]
  },
  { 
    id: "leaf-gmail-weekly", 
    label: "Weekly Ops Digest #38", 
    group: 1, 
    val: 5.5, 
    type: "email", 
    source: "gmail", 
    color: "#38bdf8",
    summary: "Weekly automated digest detailing 99.98% uptime, Redis cache hit ratio, and tool execution metrics.",
    content: "Infrastructure performance summary reporting 4.2M tool requests executed with zero security exceptions.",
    relevanceScore: 88,
    timestamp: "2026-09-25T08:00:00Z"
  },

  // --- GOOGLE DRIVE SATELLITE KNOWLEDGE NODES ---
  { 
    id: "leaf-drive-rfc2026", 
    label: "Architecture 2026 RFC", 
    group: 2, 
    val: 7.2, 
    type: "document", 
    source: "google_drive", 
    color: "#fbbf24",
    summary: "Core architectural blueprint defining stateless Swytchcode tool kernel execution and graph indexing.",
    content: "Full RFC document detailing ephemeral runtime memory sandboxing, zero-trust token injection, and D3 force simulation parameters.",
    relevanceScore: 98,
    timestamp: "2026-09-25T10:00:00Z",
    evidenceReferences: [
      { source: "google_drive", snippet: "Tool kernels run statelessly and decrypt environment secrets in memory only.", author: "Lead Architect", date: "2026-09-25" }
    ]
  },
  { 
    id: "leaf-drive-threat", 
    label: "Threat Model & Security Spec", 
    group: 2, 
    val: 6.5, 
    type: "document", 
    source: "google_drive", 
    color: "#fbbf24",
    summary: "Zero-trust credential isolation model and API key vault rotation specification.",
    content: "Complete threat matrix detailing attack vectors, rate limiting safeguards, and hardware security module integrations.",
    relevanceScore: 95,
    timestamp: "2026-09-22T09:30:00Z",
    evidenceReferences: [
      { source: "google_drive", snippet: "All third-party credentials rotate automatically every 90 days with audit logging.", author: "Security Officer", date: "2026-09-22" }
    ]
  },
  { 
    id: "leaf-drive-capacity", 
    label: "Capacity & Scale Plan", 
    group: 2, 
    val: 5.5, 
    type: "document", 
    source: "google_drive", 
    color: "#fbbf24",
    summary: "Multi-region failover and distributed Redis cache capacity planning for Q3/Q4.",
    content: "Load simulation results across 50,000 concurrent agent execution turns.",
    relevanceScore: 89,
    timestamp: "2026-09-21T15:00:00Z"
  },

  // --- NOTION SATELLITE KNOWLEDGE NODES ---
  { 
    id: "leaf-notion-postmortem", 
    label: "Incident Postmortem #402", 
    group: 3, 
    val: 6.8, 
    type: "document", 
    source: "notion", 
    color: "#a855f7",
    summary: "Root-cause analysis on upstream rate limits; instituted exponential backoff in Swytchcode execution.",
    content: "Postmortem documentation analyzing transient 429 errors from external APIs, resulting in automatic retry category classification.",
    relevanceScore: 94,
    timestamp: "2026-09-23T16:45:00Z",
    evidenceReferences: [
      { source: "notion", snippet: "Added category: 'rate_limit', retryable: true to structured error responses.", author: "SRE Team", date: "2026-09-23" }
    ]
  },
  { 
    id: "leaf-notion-spec", 
    label: "Tool Execution API Spec", 
    group: 3, 
    val: 6.2, 
    type: "document", 
    source: "notion", 
    color: "#a855f7",
    summary: "Formal JSON schema contracts and error category classifications for runtime integration methods.",
    content: "Documentation of input/output contracts, validation schemas, and side-effect approval gates.",
    relevanceScore: 96,
    timestamp: "2026-09-24T18:20:00Z"
  },
  { 
    id: "leaf-notion-roadmap", 
    label: "Product Roadmap 2026", 
    group: 3, 
    val: 6.0, 
    type: "document", 
    source: "notion", 
    color: "#a855f7",
    summary: "Quarterly milestones: autonomous graph discovery, multi-modal evidence synthesis, and instant tool compiling.",
    content: "Product backlog detailing next-generation knowledge linking and zero-latency agent tool orchestration.",
    relevanceScore: 91,
    timestamp: "2026-09-20T12:00:00Z"
  },

  // --- SLACK SATELLITE KNOWLEDGE NODES ---
  { 
    id: "leaf-slack-infra", 
    label: "#infra-vault-discussion", 
    group: 4, 
    val: 6.8, 
    type: "channel", 
    source: "slack", 
    color: "#22c55e",
    summary: "Slack thread debating ephemeral secret caching vs on-demand vault retrieval.",
    content: "Staff engineers concluded that holding decrypted credentials in memory for the duration of a single execution turn minimizes exposure surface.",
    relevanceScore: 95,
    timestamp: "2026-09-25T11:05:00Z",
    evidenceReferences: [
      { source: "slack", snippet: "Ephemeral secret injection won consensus in #infra meeting.", author: "Dan K. (Staff Infra)", date: "2026-09-25" }
    ]
  },
  { 
    id: "leaf-slack-proj", 
    label: "#proj-alpha-launch", 
    group: 4, 
    val: 6.2, 
    type: "channel", 
    source: "slack", 
    color: "#22c55e",
    summary: "Live launch coordination and validation logs for Swytchcode agent workflow rollout.",
    content: "Cross-functional channel tracking pilot deployment gates, test suites, and client onboardings.",
    relevanceScore: 93,
    timestamp: "2026-09-25T13:40:00Z"
  },
  { 
    id: "leaf-slack-incidents", 
    label: "#war-room-latencies", 
    group: 4, 
    val: 5.6, 
    type: "channel", 
    source: "slack", 
    color: "#22c55e",
    summary: "Active diagnostics thread during synthetic benchmark load testing and P99 monitoring.",
    content: "Real-time logs showing sub-50ms graph query response times under high concurrency.",
    relevanceScore: 90,
    timestamp: "2026-09-23T15:10:00Z"
  },

  // --- BOX STORAGE SATELLITE KNOWLEDGE NODES ---
  { 
    id: "leaf-box-soc2", 
    label: "SOC-2 Type II Audit Package", 
    group: 5, 
    val: 6.8, 
    type: "document", 
    source: "box", 
    color: "#f97316",
    summary: "Certified auditor compliance report and access control log artifacts for 2026.",
    content: "Complete SOC-2 Type II attestation package signed by Ernst & Young certifying security, confidentiality, and availability controls.",
    relevanceScore: 95,
    timestamp: "2026-09-19T10:00:00Z",
    evidenceReferences: [
      { source: "box", snippet: "Unqualified clean SOC-2 Type II report issued for 2026.", author: "EY Lead Auditor", date: "2026-09-19" }
    ]
  },
  { 
    id: "leaf-box-dpa", 
    label: "Customer Data Agreement (DPA)", 
    group: 5, 
    val: 6.0, 
    type: "document", 
    source: "box", 
    color: "#f97316",
    summary: "Executed enterprise vendor security agreement with GDPR & CCPA compliance schedules.",
    content: "Standard master service agreement addendum ensuring customer data is never retained for AI model training.",
    relevanceScore: 92,
    timestamp: "2026-09-18T14:30:00Z"
  },
  { 
    id: "leaf-box-pen", 
    label: "Penetration Test Report 2026", 
    group: 5, 
    val: 5.6, 
    type: "document", 
    source: "box", 
    color: "#f97316",
    summary: "Third-party penetration test verifying zero unauthorized credential disclosures.",
    content: "Independent security assessment confirming strict runtime parameter sanitization and prompt injection defenses.",
    relevanceScore: 91,
    timestamp: "2026-09-17T09:00:00Z"
  },

  // --- DECISIONS & CONSENSUS SATELLITE NODES ---
  { 
    id: "leaf-dec-vault", 
    label: "Zero-Trust Secret Vault", 
    group: 6, 
    val: 7.2, 
    type: "decision", 
    source: "derived", 
    color: "#ef4444",
    summary: "Consensus: Runtime keys decrypt in ephemeral memory only and are never persisted to disk or logs.",
    content: "Architecture committee unanimous decision: Swytchcode tool runner requests credentials on demand with process-isolated cleanup.",
    relevanceScore: 99,
    timestamp: "2026-09-25T11:30:00Z",
    evidenceReferences: [
      { source: "derived", snippet: "Adopted zero-trust vault memory cleanup policy.", author: "Security Architecture Guild", date: "2026-09-25" }
    ]
  },
  { 
    id: "leaf-dec-replicas", 
    label: "Database Read Replicas", 
    group: 6, 
    val: 6.0, 
    type: "decision", 
    source: "derived", 
    color: "#ef4444",
    summary: "Policy to route graph topology queries to regional read replicas for <20ms latency.",
    content: "Decided following Postmortem #402 to eliminate primary database read contention during high-frequency graph rendering.",
    relevanceScore: 92,
    timestamp: "2026-09-24T09:15:00Z"
  },
  { 
    id: "leaf-dec-tooling", 
    label: "Swytchcode Kernel Sandboxing", 
    group: 6, 
    val: 6.6, 
    type: "decision", 
    source: "derived", 
    color: "#ef4444",
    summary: "Policy requiring all external API calls to compile against verified Swytchcode tooling schemas.",
    content: "Ensures no speculative or invented API calls are executed; every integration is statically verified in tooling.json.",
    relevanceScore: 97,
    timestamp: "2026-09-25T10:45:00Z"
  },

  // --- SWYTCHCODE TOOLS SATELLITE NODES ---
  { 
    id: "leaf-tool-weather", 
    label: "weatherapi.forecast.list", 
    group: 7, 
    val: 6.2, 
    type: "external_api", 
    source: "weatherapi", 
    color: "#06b6d4",
    summary: "Swytchcode executable tool: Retrieve atmospheric conditions and multi-day forecasts.",
    content: "Canonically registered Swytchcode method providing real-time meteorological metrics, temperature, humidity, and alerts.",
    relevanceScore: 94,
    timestamp: "2026-09-25T18:00:00Z"
  },
  { 
    id: "leaf-tool-resend", 
    label: "resend.email.create", 
    group: 7, 
    val: 6.2, 
    type: "external_api", 
    source: "resend", 
    color: "#06b6d4",
    summary: "Swytchcode executable tool: Dispatch formatted transactional HTML emails with side-effect safety gate.",
    content: "Canonically registered Swytchcode email delivery method with recipient validation and delivery receipt logging.",
    relevanceScore: 95,
    timestamp: "2026-09-25T18:00:00Z"
  },
  { 
    id: "leaf-tool-slack", 
    label: "slack.conversations.history", 
    group: 7, 
    val: 6.0, 
    type: "external_api", 
    source: "slack", 
    color: "#06b6d4",
    summary: "Swytchcode executable tool: Fetch enterprise channel messages and conversation history.",
    content: "Canonically registered Swytchcode method for semantic indexing of channel discussions and threads.",
    relevanceScore: 93,
    timestamp: "2026-09-25T18:00:00Z"
  },
  { 
    id: "leaf-tool-notion", 
    label: "notion.page.create", 
    group: 7, 
    val: 6.0, 
    type: "external_api", 
    source: "notion", 
    color: "#06b6d4",
    summary: "Swytchcode executable tool: Create structured workspace documents and database pages.",
    content: "Canonically registered Swytchcode method for auto-generating formatted briefing summaries and investigation reports.",
    relevanceScore: 94,
    timestamp: "2026-09-25T18:00:00Z"
  },
  { 
    id: "leaf-tool-box", 
    label: "box.files.get", 
    group: 7, 
    val: 5.5, 
    type: "external_api", 
    source: "box", 
    color: "#06b6d4",
    summary: "Swytchcode executable tool: Retrieve encrypted compliance files and metadata.",
    content: "Canonically registered Swytchcode method for auditing secure vault storage.",
    relevanceScore: 90,
    timestamp: "2026-09-25T18:00:00Z"
  },
  { 
    id: "leaf-tool-gdrive", 
    label: "google_drive.files.list", 
    group: 7, 
    val: 5.5, 
    type: "external_api", 
    source: "google_drive", 
    color: "#06b6d4",
    summary: "Swytchcode executable tool: Search and list documents in enterprise Google Drive.",
    content: "Canonically registered Swytchcode method for querying engineering RFC folders.",
    relevanceScore: 92,
    timestamp: "2026-09-25T18:00:00Z"
  }
];

// Rich Interconnected Graph Edges (Hub-tree links + Cross-domain knowledge links)
const INITIAL_EDGES: GraphEdge[] = [
  // 1. Central Origin Core to all 7 Category Hubs
  { id: "e-core-gmail", source: "hub-core", target: "hub-gmail", label: "source", relationshipType: "provenance", strength: 2 },
  { id: "e-core-gdrive", source: "hub-core", target: "hub-gdrive", label: "source", relationshipType: "provenance", strength: 2 },
  { id: "e-core-notion", source: "hub-core", target: "hub-notion", label: "source", relationshipType: "provenance", strength: 2 },
  { id: "e-core-slack", source: "hub-core", target: "hub-slack", label: "source", relationshipType: "provenance", strength: 2 },
  { id: "e-core-box", source: "hub-core", target: "hub-box", label: "source", relationshipType: "provenance", strength: 2 },
  { id: "e-core-decisions", source: "hub-core", target: "hub-decisions", label: "synthesis", relationshipType: "decision_outcome", strength: 2 },
  { id: "e-core-tools", source: "hub-core", target: "hub-tools", label: "runtime", relationshipType: "dependency", strength: 2 },

  // 2. Hub to Child Knowledge Nodes
  // Gmail
  { id: "e-gmail-pilot", source: "hub-gmail", target: "leaf-gmail-pilot", label: "thread", relationshipType: "references" },
  { id: "e-gmail-legal", source: "hub-gmail", target: "leaf-gmail-legal", label: "approval", relationshipType: "references" },
  { id: "e-gmail-weekly", source: "hub-gmail", target: "leaf-gmail-weekly", label: "digest", relationshipType: "references" },

  // Google Drive
  { id: "e-gdrive-rfc", source: "hub-gdrive", target: "leaf-drive-rfc2026", label: "rfc", relationshipType: "references" },
  { id: "e-gdrive-threat", source: "hub-gdrive", target: "leaf-drive-threat", label: "security", relationshipType: "references" },
  { id: "e-gdrive-capacity", source: "hub-gdrive", target: "leaf-drive-capacity", label: "infra", relationshipType: "references" },

  // Notion
  { id: "e-notion-pm", source: "hub-notion", target: "leaf-notion-postmortem", label: "incident", relationshipType: "references" },
  { id: "e-notion-spec", source: "hub-notion", target: "leaf-notion-spec", label: "schema", relationshipType: "references" },
  { id: "e-notion-road", source: "hub-notion", target: "leaf-notion-roadmap", label: "roadmap", relationshipType: "references" },

  // Slack
  { id: "e-slack-infra", source: "hub-slack", target: "leaf-slack-infra", label: "channel", relationshipType: "references" },
  { id: "e-slack-proj", source: "hub-slack", target: "leaf-slack-proj", label: "channel", relationshipType: "references" },
  { id: "e-slack-incidents", source: "hub-slack", target: "leaf-slack-incidents", label: "channel", relationshipType: "references" },

  // Box
  { id: "e-box-soc2", source: "hub-box", target: "leaf-box-soc2", label: "audit", relationshipType: "references" },
  { id: "e-box-dpa", source: "hub-box", target: "leaf-box-dpa", label: "dpa", relationshipType: "references" },
  { id: "e-box-pen", source: "hub-box", target: "leaf-box-pen", label: "pentest", relationshipType: "references" },

  // Decisions
  { id: "e-dec-vault", source: "hub-decisions", target: "leaf-dec-vault", label: "decision", relationshipType: "decision_outcome" },
  { id: "e-dec-replicas", source: "hub-decisions", target: "leaf-dec-replicas", label: "decision", relationshipType: "decision_outcome" },
  { id: "e-dec-tooling", source: "hub-decisions", target: "leaf-dec-tooling", label: "decision", relationshipType: "decision_outcome" },

  // Tools
  { id: "e-tool-w", source: "hub-tools", target: "leaf-tool-weather", label: "tool", relationshipType: "dependency" },
  { id: "e-tool-r", source: "hub-tools", target: "leaf-tool-resend", label: "tool", relationshipType: "dependency" },
  { id: "e-tool-s", source: "hub-tools", target: "leaf-tool-slack", label: "tool", relationshipType: "dependency" },
  { id: "e-tool-n", source: "hub-tools", target: "leaf-tool-notion", label: "tool", relationshipType: "dependency" },
  { id: "e-tool-b", source: "hub-tools", target: "leaf-tool-box", label: "tool", relationshipType: "dependency" },
  { id: "e-tool-gd", source: "hub-tools", target: "leaf-tool-gdrive", label: "tool", relationshipType: "dependency" },

  // 3. RICH CROSS-DOMAIN KNOWLEDGE INTERCONNECTIONS (The files are interconnected)
  { id: "e-cross-slack-drive", source: "leaf-slack-infra", target: "leaf-drive-rfc2026", label: "debated in", relationshipType: "references" },
  { id: "e-cross-drive-dec", source: "leaf-drive-rfc2026", target: "leaf-dec-vault", label: "synthesized to", relationshipType: "decision_outcome" },
  { id: "e-cross-dec-box", source: "leaf-dec-vault", target: "leaf-box-soc2", label: "verified in", relationshipType: "provenance" },
  { id: "e-cross-box-legal", source: "leaf-box-dpa", target: "leaf-gmail-legal", label: "signed via", relationshipType: "references" },
  { id: "e-cross-gmail-notion", source: "leaf-gmail-pilot", target: "leaf-notion-roadmap", label: "prioritizes", relationshipType: "references" },
  { id: "e-cross-postmortem-slack", source: "leaf-notion-postmortem", target: "leaf-slack-incidents", label: "investigated in", relationshipType: "references" },
  { id: "e-cross-postmortem-dec", source: "leaf-notion-postmortem", target: "leaf-dec-replicas", label: "triggered", relationshipType: "decision_outcome" },
  { id: "e-cross-spec-tooling", source: "leaf-notion-spec", target: "leaf-dec-tooling", label: "enforces", relationshipType: "dependency" },
  { id: "e-cross-tooling-notion", source: "leaf-dec-tooling", target: "leaf-tool-notion", label: "executes", relationshipType: "dependency" },
  { id: "e-cross-threat-pen", source: "leaf-drive-threat", target: "leaf-box-pen", label: "tested against", relationshipType: "references" },
  { id: "e-cross-threat-vault", source: "leaf-drive-threat", target: "leaf-dec-vault", label: "specifies", relationshipType: "dependency" },
  { id: "e-cross-weekly-slack", source: "leaf-gmail-weekly", target: "leaf-slack-proj", label: "shared to", relationshipType: "mention" },
  { id: "e-cross-weather-resend", source: "leaf-tool-weather", target: "leaf-tool-resend", label: "piped to", relationshipType: "dependency" },
  { id: "e-cross-tool-slack", source: "leaf-tool-slack", target: "leaf-slack-infra", label: "queries", relationshipType: "dependency" },
  { id: "e-cross-tool-gdrive", source: "leaf-tool-gdrive", target: "leaf-drive-rfc2026", label: "indexes", relationshipType: "dependency" },
  { id: "e-cross-tool-box", source: "leaf-tool-box", target: "leaf-box-soc2", label: "fetches", relationshipType: "dependency" }
];

export const WORK_CONTEXTS: WorkContext[] = [
  {
    id: 'all',
    name: 'All Sources & Workspaces',
    description: 'Unified cross-enterprise knowledge scope across Gmail, Google Drive, Notion, Slack, Box, and Tools.',
    sources: ['gmail', 'google_drive', 'notion', 'slack', 'box', 'weatherapi', 'resend', 'derived'],
    filters: {
      allowedDomains: ['enterprise.com', 'swytchcode.dev'],
      slackChannels: ['#general', '#proj-alpha', '#product', '#infra'],
      notionDatabases: ['Engineering RFCs', 'Product Strategy', 'Incident Reviews'],
      driveFolders: ['Architecture 2026', 'Security Reviews'],
      boxFolders: ['Compliance Artifacts 2026', 'Legal & DPA']
    }
  },
  {
    id: 'engineering',
    name: 'Engineering & Architecture',
    description: 'Technical specs, architecture RFCs, infrastructure channels, and developer decisions.',
    sources: ['slack', 'notion', 'google_drive', 'derived'],
    filters: {
      slackChannels: ['#proj-alpha', '#infra', '#dev-team'],
      notionDatabases: ['Engineering RFCs', 'Technical Specs'],
      driveFolders: ['Architecture 2026', 'Security Reviews'],
      keywords: ['architecture', 'vault', 'runtime', 'latency', 'api', 'schema']
    }
  },
  {
    id: 'product',
    name: 'Product & Customer Strategy',
    description: 'Roadmaps, customer pilot feedback, feature specs, and release plans.',
    sources: ['notion', 'slack', 'gmail', 'derived'],
    filters: {
      slackChannels: ['#product', '#feedback', '#announcements'],
      notionDatabases: ['Product Strategy', 'Sprint Roadmaps'],
      allowedDomains: ['customer-pilots.com'],
      keywords: ['roadmap', 'feedback', 'user experience', 'deliverable']
    }
  },
  {
    id: 'compliance',
    name: 'Security & Compliance',
    description: 'SOC2 audit controls, privacy policies, executive signoffs, and credential protection.',
    sources: ['box', 'google_drive', 'gmail', 'derived'],
    filters: {
      boxFolders: ['Compliance Artifacts 2026', 'Legal & DPA'],
      driveFolders: ['Security Reviews'],
      keywords: ['soc2', 'audit', 'compliance', 'threat model', 'signoff']
    }
  }
];

export const INITIAL_CONNECTIONS: IntegrationConnection[] = [
  {
    id: 'conn-gmail',
    name: 'Gmail & Workspace Mail',
    provider: 'google',
    category: 'communication',
    status: 'connected',
    accountEmail: 'madhavgairola05@gmail.com',
    lastSynced: '10 mins ago',
    itemsCount: 142,
    swytchcodeTool: 'google.mail.threads.list',
    iconName: 'Mail'
  },
  {
    id: 'conn-gdrive',
    name: 'Google Drive',
    provider: 'google_drive',
    category: 'storage',
    status: 'connected',
    accountEmail: 'madhavgairola05@gmail.com',
    lastSynced: '25 mins ago',
    itemsCount: 384,
    swytchcodeTool: 'google_drive.files.list',
    iconName: 'FolderArchive'
  },
  {
    id: 'conn-notion',
    name: 'Notion Workspace',
    provider: 'notion',
    category: 'workspace',
    status: 'connected',
    accountEmail: 'madhavgairola05@gmail.com',
    lastSynced: 'Just now',
    itemsCount: 215,
    swytchcodeTool: 'notion.page.create',
    iconName: 'BookOpen'
  },
  {
    id: 'conn-slack',
    name: 'Slack Enterprise',
    provider: 'slack',
    category: 'communication',
    status: 'connected',
    accountEmail: 'madhavgairola05@gmail.com',
    lastSynced: '2 mins ago',
    itemsCount: 1250,
    swytchcodeTool: 'slack.conversations.history',
    iconName: 'MessageSquare'
  },
  {
    id: 'conn-box',
    name: 'Box Enterprise Storage',
    provider: 'box',
    category: 'storage',
    status: 'connected',
    accountEmail: 'madhavgairola05@gmail.com',
    lastSynced: '1 hour ago',
    itemsCount: 89,
    swytchcodeTool: 'box.files.get',
    iconName: 'Box'
  },
  {
    id: 'conn-weather',
    name: 'WeatherAPI Forecasts',
    provider: 'weatherapi',
    category: 'utility',
    status: 'connected',
    accountEmail: 'swytchcode-vault-key',
    lastSynced: 'Live',
    itemsCount: 24,
    swytchcodeTool: 'weatherapi.forecast.list',
    iconName: 'CloudSun'
  },
  {
    id: 'conn-resend',
    name: 'Resend Transactional Mail',
    provider: 'resend',
    category: 'utility',
    status: 'connected',
    accountEmail: 'madhavgairola05@gmail.com',
    lastSynced: 'Live',
    itemsCount: 65,
    swytchcodeTool: 'resend.email.create',
    iconName: 'Send'
  },
  {
    id: 'conn-github',
    name: 'GitHub Repositories & PRs',
    provider: 'github',
    category: 'workspace',
    status: 'connected',
    accountEmail: 'madhavgairola05@gmail.com',
    lastSynced: 'Live',
    itemsCount: 48,
    swytchcodeTool: 'github.issue.list',
    iconName: 'GitBranch'
  },
  {
    id: 'conn-calendar',
    name: 'Google Calendar Events',
    provider: 'google_calendar',
    category: 'communication',
    status: 'connected',
    accountEmail: 'madhavgairola05@gmail.com',
    lastSynced: 'Live',
    itemsCount: 32,
    swytchcodeTool: 'google_calendar.events.list',
    iconName: 'Calendar'
  }
];

export const DEFAULT_INDEXING_CONFIG: IndexingConfig = {
  extractTasks: true,
  extractDecisions: true,
  extractDeadlines: true,
  extractPeople: true,
  relevanceThreshold: 75,
  autoSyncOnAction: true,
};

const STORAGE_KEYS = {
  NODES: 'recall_kg_nodes_v4',
  EDGES: 'recall_kg_edges_v4',
  ACTIVE_CONTEXT: 'recall_kg_active_context_v4',
  INDEXING_CONFIG: 'recall_kg_indexing_config_v4',
  CONNECTIONS: 'recall_kg_connections_v4',
  HISTORY: 'recall_kg_history_v4',
};

class GraphStore {
  private nodes: GraphNode[] = [];
  private edges: GraphEdge[] = [];
  private activeContextId: string = 'all';
  private indexingConfig: IndexingConfig = DEFAULT_INDEXING_CONFIG;
  private connections: IntegrationConnection[] = INITIAL_CONNECTIONS;
  private history: InvestigationHistoryItem[] = [];
  private listeners: Array<() => void> = [];

  constructor() {
    this.load();
  }

  private load(): void {
    if (typeof window === 'undefined') {
      this.nodes = [...INITIAL_NODES];
      this.edges = [...INITIAL_EDGES];
      return;
    }

    try {
      const savedNodes = localStorage.getItem(STORAGE_KEYS.NODES);
      const savedEdges = localStorage.getItem(STORAGE_KEYS.EDGES);
      const savedContext = localStorage.getItem(STORAGE_KEYS.ACTIVE_CONTEXT);
      const savedConfig = localStorage.getItem(STORAGE_KEYS.INDEXING_CONFIG);
      const savedConns = localStorage.getItem(STORAGE_KEYS.CONNECTIONS);
      const savedHistory = localStorage.getItem(STORAGE_KEYS.HISTORY);

      this.nodes = savedNodes ? JSON.parse(savedNodes) : [...INITIAL_NODES];
      this.edges = savedEdges ? JSON.parse(savedEdges) : [...INITIAL_EDGES];
      this.activeContextId = savedContext || 'all';
      this.indexingConfig = savedConfig ? JSON.parse(savedConfig) : DEFAULT_INDEXING_CONFIG;
      if (savedConns) {
        let parsedConns: IntegrationConnection[] = JSON.parse(savedConns);
        // Migrate any outdated demo/enterprise email addresses
        parsedConns = parsedConns.map(conn => {
          if (conn.accountEmail && (conn.accountEmail.includes('sarah.lin') || conn.accountEmail.includes('enterprise.com'))) {
            return { ...conn, accountEmail: 'madhavgairola05@gmail.com' };
          }
          return conn;
        });
        // Ensure all standard initial connections are present even if storage is from earlier version
        const missingConns = INITIAL_CONNECTIONS.filter(ic => !parsedConns.some(pc => pc.id === ic.id));
        this.connections = [...parsedConns, ...missingConns];
      } else {
        this.connections = INITIAL_CONNECTIONS;
      }
      this.history = savedHistory ? JSON.parse(savedHistory) : this.getDefaultHistory();
    } catch (e) {
      console.warn('Failed to load knowledge graph from localStorage:', e);
      this.nodes = [...INITIAL_NODES];
      this.edges = [...INITIAL_EDGES];
      this.activeContextId = 'all';
      this.indexingConfig = DEFAULT_INDEXING_CONFIG;
      this.connections = INITIAL_CONNECTIONS;
      this.history = this.getDefaultHistory();
    }
  }

  private save(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.NODES, JSON.stringify(this.nodes));
      localStorage.setItem(STORAGE_KEYS.EDGES, JSON.stringify(this.edges));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_CONTEXT, this.activeContextId);
      localStorage.setItem(STORAGE_KEYS.INDEXING_CONFIG, JSON.stringify(this.indexingConfig));
      localStorage.setItem(STORAGE_KEYS.CONNECTIONS, JSON.stringify(this.connections));
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(this.history));
    } catch (e) {
      console.warn('Failed to save knowledge graph:', e);
    }
    this.notify();
  }

  private getDefaultHistory(): InvestigationHistoryItem[] {
    return [
      {
        id: 'hist-1',
        prompt: 'Check tomorrow weather in Gurgaon, create a Notion summary page, and email brief to team.',
        timestamp: '1 hour ago',
        status: 'COMPLETED',
        summary: 'Weather forecast retrieved, Notion page created in Engineering workspace, confirmation-gated email dispatched.',
        toolsUsed: ['weatherapi.forecast.list', 'notion.page.create', 'resend.email.create'],
        nodesReferenced: ['hub-tools', 'leaf-tool-weather', 'leaf-tool-notion', 'leaf-tool-resend']
      },
      {
        id: 'hist-2',
        prompt: 'Investigate SOC2 compliance audit readiness across Google Drive and Box legal artifacts.',
        timestamp: '3 hours ago',
        status: 'COMPLETED',
        summary: 'Cross-referenced threat model RFC in Drive with Box compliance audit package; verified all side-effect tool gates.',
        toolsUsed: ['box.files.get', 'google_drive.files.list'],
        nodesReferenced: ['hub-box', 'leaf-box-soc2', 'hub-gdrive', 'leaf-drive-threat']
      },
      {
        id: 'hist-3',
        prompt: 'Extract latest engineering decisions on Swytchcode encrypted vault architecture.',
        timestamp: 'Yesterday',
        status: 'COMPLETED',
        summary: 'Synthesized consensus from Slack #infra and Google Drive architecture RFC; linked VP Engineering signoff.',
        toolsUsed: ['slack.conversations.history'],
        nodesReferenced: ['hub-decisions', 'leaf-dec-vault', 'hub-slack', 'leaf-slack-infra']
      }
    ];
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach(l => l());
  }

  public getGraphData(): KnowledgeGraphData {
    return {
      nodes: [...this.nodes],
      edges: [...this.edges],
    };
  }

  public getActiveContext(): WorkContext {
    const found = WORK_CONTEXTS.find(c => c.id === this.activeContextId);
    return found || WORK_CONTEXTS[0];
  }

  public setActiveContext(contextId: string): void {
    this.activeContextId = contextId;
    this.save();
  }

  public getIndexingConfig(): IndexingConfig {
    return { ...this.indexingConfig };
  }

  public updateIndexingConfig(config: Partial<IndexingConfig>): void {
    this.indexingConfig = { ...this.indexingConfig, ...config };
    this.save();
  }

  public getConnections(): IntegrationConnection[] {
    return [...this.connections];
  }

  public updateConnection(id: string, updates: Partial<IntegrationConnection>): void {
    this.connections = this.connections.map(c => c.id === id ? { ...c, ...updates } : c);
    this.save();
  }

  public getHistory(): InvestigationHistoryItem[] {
    return [...this.history];
  }

  public addHistoryItem(item: InvestigationHistoryItem): void {
    this.history = [item, ...this.history.filter(h => h.id !== item.id)].slice(0, 30);
    this.save();
  }

  public addNode(node: GraphNode): void {
    if (!this.nodes.some(n => n.id === node.id)) {
      this.nodes.push(node);
      this.save();
    }
  }

  public addEdge(edge: GraphEdge): void {
    if (!this.edges.some(e => e.id === edge.id || (e.source === edge.source && e.target === edge.target && e.label === edge.label))) {
      this.edges.push(edge);
      this.save();
    }
  }

  /**
   * Ingest a batch of nodes and edges generated by the Autonomous Background Sync Loop
   */
  public ingestSyncBatch(nodes: GraphNode[], edges: GraphEdge[]): { newNodesCount: number; newEdgesCount: number } {
    let newNodesCount = 0;
    let newEdgesCount = 0;

    if (nodes && Array.isArray(nodes)) {
      nodes.forEach(node => {
        if (!this.nodes.some(n => n.id === node.id)) {
          this.nodes.push(node);
          newNodesCount++;
        }
      });
    }

    if (edges && Array.isArray(edges)) {
      edges.forEach(edge => {
        if (!this.edges.some(e => e.id === edge.id || (e.source === edge.source && e.target === edge.target && e.label === edge.label))) {
          this.edges.push(edge);
          newEdgesCount++;
        }
      });
    }

    if (newNodesCount > 0 || newEdgesCount > 0) {
      this.save();
    }

    return { newNodesCount, newEdgesCount };
  }


  /**
   * Ingest newly discovered knowledge entities & relationships from an agent execution into the live graph.
   * Dynamically constructs an interconnected topology:
   * - Action Root Node linking to hub-core and primary source hub
   * - Individual Email nodes (for Gmail executions) linking to hub-gmail and the Action Node
   * - Individual Document nodes (for Drive/Box executions) linking to hub-gdrive/hub-box
   * - Notion Document node linking to hub-notion and connected to source entities
   */
  public ingestWorkflowResults(
    goalOrState: string | any, 
    toolNamesArg?: string[], 
    resultSummaryArg?: string,
    extractedEntities?: Array<{ label: string; type: NodeType; source: SourceType; summary: string }>,
    workflowStateArg?: any
  ): { newNodesCount: number; newEdgesCount: number } {
    let goal = typeof goalOrState === 'string' ? goalOrState : goalOrState?.goalAnalysis?.goal || goalOrState?.userMessage || 'Autonomous Action';
    let toolNames = Array.isArray(toolNamesArg) ? toolNamesArg : (typeof goalOrState === 'object' && goalOrState?.plan?.steps ? goalOrState.plan.steps.map((s: any) => s.canonicalId) : []);
    let resultSummary = resultSummaryArg || (typeof goalOrState === 'object' ? goalOrState?.taskResult?.summary || '' : '');
    const workflowState = workflowStateArg || (typeof goalOrState === 'object' && 'status' in goalOrState ? goalOrState : null);

    const timestamp = new Date().toISOString();
    const runKey = Date.now();
    let newNodesCount = 0;
    let newEdgesCount = 0;

    // Determine primary category domain
    const hasGmail = toolNames.some((t: string) => t.startsWith('gmail.'));
    const hasDrive = toolNames.some((t: string) => t.startsWith('drive.') || t.startsWith('google_drive.'));
    const hasNotion = toolNames.some((t: string) => t.startsWith('notion.'));
    const hasSlack = toolNames.some((t: string) => t.startsWith('slack.'));
    const hasBox = toolNames.some((t: string) => t.startsWith('box.'));
    const hasWeather = toolNames.some((t: string) => t.startsWith('weatherapi.'));
    const hasResend = toolNames.some((t: string) => t.startsWith('resend.'));
    const hasGithub = toolNames.some((t: string) => t.startsWith('github.'));
    const hasCalendar = toolNames.some((t: string) => t.startsWith('google_calendar.') || t.startsWith('calendar.'));

    let primaryHub = 'hub-tools';
    let primarySource: SourceType = 'derived';
    let primaryGroup = 7;
    let actionLabel = goal.length > 28 ? goal.slice(0, 25) + '...' : goal;

    if (hasGmail) {
      primaryHub = 'hub-gmail';
      primarySource = 'gmail';
      primaryGroup = 1;
      actionLabel = goal.toLowerCase().includes('mail') || goal.toLowerCase().includes('email') ? 'Gmail Mailbox Briefing' : actionLabel;
    } else if (hasDrive) {
      primaryHub = 'hub-gdrive';
      primarySource = 'google_drive';
      primaryGroup = 2;
      actionLabel = 'Google Drive Index';
    } else if (hasBox) {
      primaryHub = 'hub-box';
      primarySource = 'box';
      primaryGroup = 5;
      actionLabel = 'Box Storage Audit';
    } else if (hasSlack) {
      primaryHub = 'hub-slack';
      primarySource = 'slack';
      primaryGroup = 4;
      actionLabel = 'Slack Discussion Digest';
    } else if (hasNotion) {
      primaryHub = 'hub-notion';
      primarySource = 'notion';
      primaryGroup = 3;
      actionLabel = 'Notion Workspace Briefing';
    } else if (hasGithub) {
      primaryHub = 'hub-tools';
      primarySource = 'github';
      primaryGroup = 7;
      actionLabel = 'GitHub Operations Briefing';
    } else if (hasCalendar) {
      primaryHub = 'hub-tools';
      primarySource = 'google_calendar';
      primaryGroup = 7;
      actionLabel = 'Google Calendar Briefing';
    }

    // 1. Create Main Action Cluster Node
    const actionNodeId = `leaf-action-${runKey}`;
    const actionNode: GraphNode = {
      id: actionNodeId,
      label: actionLabel,
      group: primaryGroup,
      val: 7.8,
      type: 'decision',
      source: primarySource,
      color: SOURCE_COLORS[primarySource] || '#ef4444',
      summary: resultSummary || `Completed autonomous action: ${goal}`,
      content: workflowState?.taskResult?.markdown || resultSummary,
      timestamp,
      relevanceScore: 95,
      evidenceReferences: toolNames.map((tool: string) => ({
        source: primarySource,
        snippet: `Executed verified tool [${tool}] via Swytchcode kernel.`
      }))
    };

    this.nodes.push(actionNode);
    newNodesCount++;

    // Edge from Core to Action Node
    this.edges.push({
      id: `e-core-action-${runKey}`,
      source: 'hub-core',
      target: actionNodeId,
      label: 'executed',
      relationshipType: 'provenance',
      strength: 2
    });
    newEdgesCount++;

    // Edge from Primary Hub to Action Node
    this.edges.push({
      id: `e-hub-action-${runKey}`,
      source: primaryHub,
      target: actionNodeId,
      label: 'workflow',
      relationshipType: 'references',
      strength: 2
    });
    newEdgesCount++;

    const createdSatelliteNodeIds: string[] = [];

    // 2. Ingest Satellite Nodes for Gmail Threads
    const emailSynthesis = workflowState?.taskResult?.structuredData?.emailSynthesis || workflowState?.context?.emailSynthesis;
    const gmailEntry = workflowState?.stepOutputs ? Object.entries(workflowState.stepOutputs).find(([k]) => k.startsWith('gmail.')) : null;
    const gmailOutput: any = gmailEntry ? gmailEntry[1] : null;
    const rawThreads = gmailOutput?.data?.threads || gmailOutput?.threads || (Array.isArray(gmailOutput?.data) ? gmailOutput.data : []);

    if (emailSynthesis && Array.isArray(emailSynthesis.emailSummaries) && emailSynthesis.emailSummaries.length > 0) {
      emailSynthesis.emailSummaries.slice(0, 8).forEach((item: any, idx: number) => {
        const mailNodeId = `leaf-email-${runKey}-${idx}`;
        const cleanTopic = item.senderOrTopic || `Email Thread #${item.index || idx + 1}`;
        const shortLabel = cleanTopic.length > 26 ? cleanTopic.slice(0, 23) + '...' : cleanTopic;

        const emailNode: GraphNode = {
          id: mailNodeId,
          label: shortLabel,
          group: 1,
          val: 5.8,
          type: 'email',
          source: 'gmail',
          color: '#38bdf8',
          summary: item.summary || 'Email summary',
          content: `Category: ${item.category || 'General Communication'}\nUrgency: ${item.urgency || 'INFO'}\nAction: ${item.actionRequired || 'None'}\n\n${item.summary}`,
          timestamp,
          relevanceScore: item.urgency === 'HIGH' ? 96 : item.urgency === 'MEDIUM' ? 90 : 82,
          evidenceReferences: [{
            source: 'gmail',
            snippet: item.summary,
            date: 'Recent'
          }]
        };

        this.nodes.push(emailNode);
        newNodesCount++;
        createdSatelliteNodeIds.push(mailNodeId);

        // Edge from hub-gmail to email node
        this.edges.push({
          id: `e-gmail-leaf-${runKey}-${idx}`,
          source: 'hub-gmail',
          target: mailNodeId,
          label: 'thread',
          relationshipType: 'references'
        });
        newEdgesCount++;

        // Edge from Action Node to email node
        this.edges.push({
          id: `e-action-email-${runKey}-${idx}`,
          source: actionNodeId,
          target: mailNodeId,
          label: 'ingested',
          relationshipType: 'references'
        });
        newEdgesCount++;
      });
    } else if (rawThreads && Array.isArray(rawThreads) && rawThreads.length > 0) {
      rawThreads.slice(0, 6).forEach((t: any, idx: number) => {
        const mailNodeId = `leaf-email-${runKey}-${idx}`;
        const snippet = (t.snippet || 'Email Thread').replace(/[\u034f\u00ad\u200b\u200c\u200d\ufeff\s]+/g, ' ').trim();
        const shortLabel = snippet.length > 24 ? snippet.slice(0, 21) + '...' : snippet;

        const emailNode: GraphNode = {
          id: mailNodeId,
          label: shortLabel,
          group: 1,
          val: 5.5,
          type: 'email',
          source: 'gmail',
          color: '#38bdf8',
          summary: snippet,
          content: snippet,
          timestamp,
          relevanceScore: 85,
          evidenceReferences: [{
            source: 'gmail',
            snippet,
            date: 'Recent'
          }]
        };

        this.nodes.push(emailNode);
        newNodesCount++;
        createdSatelliteNodeIds.push(mailNodeId);

        this.edges.push({
          id: `e-gmail-leaf-${runKey}-${idx}`,
          source: 'hub-gmail',
          target: mailNodeId,
          label: 'thread',
          relationshipType: 'references'
        });
        this.edges.push({
          id: `e-action-email-${runKey}-${idx}`,
          source: actionNodeId,
          target: mailNodeId,
          label: 'ingested',
          relationshipType: 'references'
        });
        newEdgesCount += 2;
      });
    }

    // 3. Ingest Satellite Nodes for Google Drive Files
    const driveEntry = workflowState?.stepOutputs ? Object.entries(workflowState.stepOutputs).find(([k]) => k.startsWith('drive.') || k.startsWith('google_drive.')) : null;
    const driveOutput: any = driveEntry ? driveEntry[1] : null;
    const driveFiles = driveOutput?.data?.files || driveOutput?.files || (Array.isArray(driveOutput?.data) ? driveOutput.data : []);

    if (driveFiles && Array.isArray(driveFiles) && driveFiles.length > 0) {
      driveFiles.slice(0, 6).forEach((f: any, idx: number) => {
        const driveNodeId = `leaf-drive-${runKey}-${idx}`;
        const name = f.name || f.title || `Drive Document #${idx + 1}`;
        const shortLabel = name.length > 25 ? name.slice(0, 22) + '...' : name;

        const fileNode: GraphNode = {
          id: driveNodeId,
          label: shortLabel,
          group: 2,
          val: 5.8,
          type: 'document',
          source: 'google_drive',
          color: '#fbbf24',
          summary: `Google Drive file: ${name} (${f.mimeType || 'document'})`,
          content: `MIME Type: ${f.mimeType || 'unknown'}\nFile Link: ${f.webViewLink || 'Not available'}`,
          externalUrl: f.webViewLink,
          timestamp,
          relevanceScore: 90,
          evidenceReferences: [{
            source: 'google_drive',
            snippet: `Discovered file: ${name}`,
            url: f.webViewLink
          }]
        };

        this.nodes.push(fileNode);
        newNodesCount++;
        createdSatelliteNodeIds.push(driveNodeId);

        this.edges.push({
          id: `e-gdrive-leaf-${runKey}-${idx}`,
          source: 'hub-gdrive',
          target: driveNodeId,
          label: 'file',
          relationshipType: 'references'
        });
        this.edges.push({
          id: `e-action-drive-${runKey}-${idx}`,
          source: actionNodeId,
          target: driveNodeId,
          label: 'indexed',
          relationshipType: 'references'
        });
        newEdgesCount += 2;
      });
    }

    // 4. Ingest Satellite Node for Created Notion Document
    const notionArtifact = workflowState?.taskResult?.artifacts?.find((a: any) => a.type === 'notion') ||
      (workflowState?.stepOutputs && Object.entries(workflowState.stepOutputs).find(([k]) => k.startsWith('notion.'))?.[1]);

    let notionDocNodeId: string | null = null;
    if (notionArtifact) {
      const artData = notionArtifact.data || notionArtifact;
      const url = artData.url || (artData.id ? `https://app.notion.com/p/${String(artData.id).replace(/-/g, '')}` : null);
      const title = artData.title || artData.properties?.title?.title?.[0]?.plain_text || artData.properties?.title?.[0]?.text?.content || 'Notion Briefing Document';

      if (url) {
        notionDocNodeId = `leaf-notion-doc-${runKey}`;
        const notionNode: GraphNode = {
          id: notionDocNodeId,
          label: title.length > 25 ? title.slice(0, 22) + '...' : title,
          group: 3,
          val: 6.8,
          type: 'document',
          source: 'notion',
          color: '#a855f7',
          summary: `Notion Document: ${title}`,
          content: `URL: ${url}\n\n${resultSummary}`,
          externalUrl: url,
          timestamp,
          relevanceScore: 96,
          evidenceReferences: [{
            source: 'notion',
            snippet: `Created Notion document: ${title}`,
            url
          }]
        };

        this.nodes.push(notionNode);
        newNodesCount++;

        // Link Notion Hub to Notion Document Node
        this.edges.push({
          id: `e-notion-leaf-${runKey}`,
          source: 'hub-notion',
          target: notionDocNodeId,
          label: 'document',
          relationshipType: 'references'
        });
        newEdgesCount++;

        // Link Action Node to Notion Document Node
        this.edges.push({
          id: `e-action-notion-${runKey}`,
          source: actionNodeId,
          target: notionDocNodeId,
          label: 'documented in',
          relationshipType: 'decision_outcome',
          strength: 2
        });
        newEdgesCount++;

        // 5. Cross-domain knowledge links from source satellite nodes to Notion doc node
        createdSatelliteNodeIds.forEach((satId, sIdx) => {
          this.edges.push({
            id: `e-cross-sat-notion-${runKey}-${sIdx}`,
            source: satId,
            target: notionDocNodeId!,
            label: 'compiled into',
            relationshipType: 'decision_outcome'
          });
          newEdgesCount++;
        });
      }
    }

    // 6. Ingest any additional manual extractedEntities
    if (extractedEntities && extractedEntities.length > 0) {
      extractedEntities.forEach((ent, idx) => {
        const entId = `leaf-ent-${runKey}-${idx}`;
        this.nodes.push({
          id: entId,
          label: ent.label,
          type: ent.type,
          source: ent.source,
          color: SOURCE_COLORS[ent.source] || '#38bdf8',
          summary: ent.summary,
          timestamp,
          relevanceScore: 85
        });
        newNodesCount++;

        this.edges.push({
          id: `e-ent-${runKey}-${idx}`,
          source: actionNodeId,
          target: entId,
          label: 'entity',
          relationshipType: 'mention'
        });
        newEdgesCount++;
      });
    }

    this.save();
    return { newNodesCount, newEdgesCount };
  }

  public resetToDefaults(): void {
    this.nodes = [...INITIAL_NODES];
    this.edges = [...INITIAL_EDGES];
    this.activeContextId = 'all';
    this.indexingConfig = { ...DEFAULT_INDEXING_CONFIG };
    this.connections = [...INITIAL_CONNECTIONS];
    this.history = this.getDefaultHistory();
    this.save();
  }
}

export const graphStore = new GraphStore();
