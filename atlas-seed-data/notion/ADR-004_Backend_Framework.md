---
id: "notion-adr-004"
source: "notion"
workspace: "Acme Labs Engineering Wiki / Architecture Decision Records"
title: "ADR-004: Backend Framework & Microservice Architecture"
author: "Devon Chen <devon.chen@acmelabs.io>"
status: "ACCEPTED"
decided_date: "2026-05-18T16:00:00Z"
cross_references:
  - "gdrive-arch-002 (Atlas Architecture v2.0)"
  - "gmail-001 (Architecture Decision Email)"
  - "slack-eng-001 (#engineering discussion)"
tags: ["adr", "backend", "fastapi", "nodejs", "confirmed-decision", "atlas"]
entities:
  people:
    - "Devon Chen (Principal Architect)"
    - "Elena Rostova (VP Engineering)"
    - "Kai Takahashi (Staff SRE)"
  decisions:
    - "Confirmed Decision 1: Backend Framework (FastAPI + Node.js Microservices)"
---

# ADR-004: Backend Framework & Microservice Architecture

* **Status:** ACCEPTED (Confirmed Decision across Google Drive, Gmail, Slack, and Notion)
* **Date:** May 18, 2026
* **Deciders:** Devon Chen, Elena Rostova, Kai Takahashi

---

## 1. Context & Problem Statement
The initial Ruby on Rails monolith (`gdrive-arch-001`) suffered from high latency during vector graph calculations and thread starvation when executing external third-party API calls. We needed a split-architecture that provides:
1. High-throughput asynchronous SSE event streaming for UI clients.
2. High-performance asynchronous AI reasoning and prompt synthesis.
3. Native integration with `@swytchcode/runtime`.

---

## 2. Decision Outcome
We decided to adopt a **dual-service microservice topology**:
- **Gateway Service:** Node.js / Express 5 with strict TypeScript to handle client authentication, SSE streaming, and Swytchcode tool bindings.
- **Reasoning Service:** Python 3.12 / FastAPI to handle Gemini 3.5 Flash prompt synthesis, embedding generation, and graph reasoning.

### Consequences:
- **Positive:** Sub-10ms gateway routing overhead; Python native ecosystem for vector mathematics; process isolation for Swytchcode tool executions.
- **Negative:** Requires managing gRPC communication contracts between Node.js and FastAPI services.
