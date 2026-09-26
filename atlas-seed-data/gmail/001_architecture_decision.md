---
id: "gmail-001"
source: "gmail"
message_id: "<msg.20260518.arch.01@acmelabs.io>"
thread_id: "thread_arch_framework_2026"
date: "2026-05-18T17:15:00Z"
from: "Devon Chen <devon.chen@acmelabs.io>"
to:
  - "Elena Rostova <elena.rostova@acmelabs.io>"
  - "Engineering Team <eng-all@acmelabs.io>"
subject: "Architecture Decision Signoff: Dual FastAPI + Node.js Microservices"
labels: ["ARCHITECTURE", "SIGN-OFF", "PROJECT-ATLAS"]
cross_references:
  - "notion-adr-004 (ADR-004 Backend Framework)"
  - "gdrive-arch-002 (Atlas Architecture v2.0)"
entities:
  people:
    - "Devon Chen (Principal Architect)"
    - "Elena Rostova (VP Engineering)"
    - "Kai Takahashi (Staff SRE)"
  decisions:
    - "Confirmed Decision 1: Backend Framework (FastAPI + Node.js Microservices)"
---

Hi Elena and team,

Following our architecture committee meeting this afternoon, we have formally accepted **ADR-004: Backend Framework & Microservice Architecture** for Project Atlas.

### Summary of Consensus:
1. **API Gateway & Streaming:** Node.js / Express with TypeScript for client websocket/SSE transport and Swytchcode tool execution bindings (`@swytchcode/runtime`).
2. **AI Reasoning Engine:** Python 3.12 / FastAPI for prompt synthesis, Gemini reasoning loops, and knowledge graph vector calculations.
3. **Legacy Monolith Retirement:** The Ruby on Rails monolith prototype (`gdrive-arch-001`) is officially deprecated.

Elena has given executive budget signoff for the required CloudForge Kubernetes pod allocations. Full decision documentation is published in Notion at `notion-adr-004`.

Best regards,  
**Devon Chen**  
Principal Architect, Acme Labs
