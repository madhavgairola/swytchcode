---
id: "gdrive-arch-002"
source: "google_drive"
folder: "Google Drive / Acme Labs / Project Atlas / Architecture"
title: "Atlas Architecture Specification v2.0 (CURRENT)"
author: "Devon Chen <devon.chen@acmelabs.io>"
status: "APPROVED"
created_date: "2026-05-18T11:00:00Z"
modified_date: "2026-09-15T16:45:00Z"
replaces: "gdrive-arch-001"
related_documents:
  - "notion-adr-004 (Backend Framework Decision)"
  - "notion-adr-005 (Database Read Replicas)"
  - "gdrive-sec-001 (Atlas Threat Model v1.0)"
  - "box-comp-001 (Atlas DPA)"
tags: ["architecture", "current", "microservices", "swytchcode", "postgres", "redis", "atlas"]
entities:
  people:
    - "Devon Chen (Principal Architect)"
    - "Elena Rostova (VP Engineering)"
    - "Marcus Vance (Head of Security)"
    - "Kai Takahashi (Staff SRE)"
  projects:
    - "Project Atlas"
  systems:
    - "Atlas Gateway (Node.js/Express)"
    - "Reasoning Engine (Python/FastAPI)"
    - "Swytchcode Tool Kernel"
    - "PostgreSQL 16 Multi-Region Cluster"
    - "Redis Enterprise Cluster (Primary Cache)"
    - "Zero-Trust Ephemeral Secret Vault"
---

# Atlas Architecture Specification v2.0 (CURRENT)

> **STATUS:** APPROVED & CURRENT ARCHITECTURAL BASELINE  
> **Target Production Launch:** Q4 2026  
> **Lead Architect:** Devon Chen (`devon.chen@acmelabs.io`)  
> **Executive Sponsor:** Elena Rostova (`elena.rostova@acmelabs.io`)

---

## 1. System Philosophy & Objectives
Project Atlas is Acme Labs' next-generation autonomous knowledge worker platform. It bridges enterprise knowledge silos (Gmail, Google Drive, Notion, Slack, Box) with actionable tool execution via governed Swytchcode kernels.

### Core Architectural Guarantees:
1. **Zero Raw Vendor SDKs:** All third-party integrations (Gmail, Slack, Notion, Box, Drive) compile and execute strictly through the Swytchcode kernel (`@swytchcode/runtime`).
2. **Zero-Trust Ephemeral Secrets:** Vendor credentials and OAuth tokens are injected into ephemeral worker process memory on-demand and wiped immediately after execution. No secrets persist on disk or in log streams.
3. **Stateless Scale:** API gateways and agent orchestration pods scale horizontally on Kubernetes (EKS / GKE).

---

## 2. Component Topology

```
┌─────────────────────────────────────────────────────────────┐
│                 Client Layer (Web UI / IDE)                 │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / SSE Stream
                               ▼
┌─────────────────────────────────────────────────────────────┐
│          Atlas Gateway Service (Node.js / Express)          │
│   • JWT Authentication & Work Context Filtering             │
│   • Server-Sent Events (SSE) Event Dispatcher               │
└──────────────────────────────┬──────────────────────────────┘
                               │ gRPC
                               ▼
┌─────────────────────────────────────────────────────────────┐
│        Atlas Agent Reasoning Engine (Python / FastAPI)       │
│   • Gemini 3.5 Flash Reasoning & Plan Synthesis             │
│   • Knowledge Graph Traversal & Entity Linking              │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               ▼                               ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│   PostgreSQL 16 Cluster      │ │   Redis Enterprise Cluster │
│   • Primary: us-east-1       │ │   • Primary Cache & Locks  │
│   • Read Replicas: eu-west-1 │ │   • Vector Index Caching   │
└──────────────────────────────┘ └────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│             Swytchcode Execution Kernel (Sandbox)           │
│   • Tool Allowlist Resolution (`tooling.json`)               │
│   • Policy Enforcement (`policies.json`)                    │
│   • Side-Effect Safety Gating (Human-in-the-Loop)           │
│   • Executable Tools: Gmail, Slack, Notion, Box, Drive      │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Storage & Caching Layer (Confirmed Decision)
- **Primary Relational Store:** PostgreSQL 16 on AWS Aurora Multi-AZ with JSONB vector extensions.
  - Primary write instance: `us-east-1` (N. Virginia).
  - Read replicas: `eu-central-1` (Frankfurt) and `ap-southeast-1` (Singapore) to ensure P99 latency $<25\text{ms}$ for global queries (see `notion-adr-005`).
- **Primary Caching Layer:** Redis Enterprise Cluster (replaces deprecated Memcached per Architecture Consensus 2026-05-18).
  - Used for session graphs, distributed idempotency locks, and ephemeral token caching.

---

## 4. Third-Party Integration Governance
External API interactions are strictly delegated to Swytchcode canonical IDs:
- **Email Operations:** `gmail.user.threads.get`, `gmail.user.send.create1`
- **Chat Collaboration:** `slack.conversations.history`, `slack.chat.post_message`
- **Workspace Documents:** `notion.page.create`, `notion.search.create`
- **File & RFC Storage:** `google_drive.files.list`, `google_drive.files.get`
- **Compliance Artifacts:** `box.files.get`, `box.zip_download.create`

Mutating operations (`send`, `post_message`, `delete`) must pass through the Swytchcode human confirmation gate before execution unless auto-approved by policy.
