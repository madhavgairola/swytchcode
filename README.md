# Swytchcode Autonomous Action Agent

> A production-ready, general-purpose Autonomous Action & Integration Agent powered by **Google Gemini (Reasoning & Planning)** and **Swytchcode (Execution Authority & Security Kernel)**.

---

## 🌟 Overview

The **Swytchcode Autonomous Action Agent** accepts natural-language requests for arbitrary real-world tasks, analyzes intent and parameters, dynamically discovers verified API capabilities from Swytchcode's integration registry, validates methods against `.swytchcode/tooling.json`, gates consequential side-effecting operations behind human-in-the-loop confirmation, executes multi-step workflows through the Swytchcode kernel, and synthesizes structured executive responses with complete auditability.

### Autonomous Action Pipeline
```text
User Request ("Check the weather in Tokyo for tomorrow, summarize recommendations, and draft a Notion trip page")
  ↓
Gemini 2.5 Flash (Goal Analysis, Entity Extraction & Capability Intent Generation)
  ↓
Swytchcode Dynamic Discovery (`swytchcode discover "<intent>" --json`)
  ↓
Execution Planner (Constructs ordered multi-step task plan matching local tooling.json)
  ↓
Security & Method Validator (Validates canonical IDs and parameter schemas against tooling.json)
  ↓
Consequential Action Gate (Halts and prompts for human confirmation on side-effects like emails/pages)
  ↓
Swytchcode Execution Kernel (Executes `weatherapi.forecast.list`, `notion.page.create`, `resend.email.create`)
  ↓
Context Chaining (Pipes intermediate outputs from earlier steps into downstream tool arguments)
  ↓
Gemini Task Synthesizer (Generates executive summary, structured data, and audit trail)
  ↓
Interactive Web UI (Real-time SSE progress tracker, confirmation banner, audit log, and raw payload trace)
```

---

## 🚀 Key Features

1. **General-Purpose Reasoning**: Understands diverse user intents across information retrieval, workspace management, transactional messaging, and multi-step tasks without hardcoding domains.
2. **Dynamic Semantic Discovery**: Queries Swytchcode's live registry dynamically to identify relevant canonical IDs for any natural language intent.
3. **Strict Policy & Allowlist Validation**: Authoritatively enforces that only methods explicitly registered in `.swytchcode/tooling.json` are permitted to execute. Unregistered or malicious methods are rejected immediately.
4. **Human-in-the-Loop Confirmation Gating**: Consequential actions (e.g. sending emails via `resend.email.create`, creating workspace pages via `notion.page.create`) require explicit user approval before execution unless configured for auto-approval.
5. **Context Chaining**: Data from upstream steps (e.g. weather forecast metrics) is passed as enriched context to downstream steps (e.g. Notion page body, email text).
6. **Dual Execution Mode**: Supports live API execution with secure credentials or realistic deterministic sandbox simulation for testing and demos.
7. **Complete Auditability**: Every executed step records latency, execution status, input/output schemas, and sandbox flags for full developer transparency.

---

## 🛠️ Prerequisites

- **Node.js**: v18+ (tested on Node v24.11.1)
- **Swytchcode CLI**: v2.20.4 (`npm install -g swytchcode`)
- **Google Gemini API Key**: `GEMINI_API_KEY`

---

## ⚡ Quickstart

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure your `GEMINI_API_KEY` is set in `.env`:
```env
PORT=3001
GEMINI_API_KEY=your_gemini_api_key_here
SWYTCHCODE_MODE=sandbox
WEATHER_API_KEY=
RESEND_API_KEY=
NOTION_API_KEY=
```

### 3. Start Development Server
Run backend (:3001) and frontend (:5173) concurrently:
```bash
npm run dev
```

Open your browser at `http://localhost:5173`.

---

## 🧪 Comprehensive Automated Test Matrix

The project includes an end-to-end automated verification test matrix covering discovery, validation, kernel execution, reasoning, safety gating, and error handling:

```bash
npm test
```

### Individual Test Suites
- **Dynamic Discovery Test**: `npm run test:discovery`
- **Method & Parameter Validation Test**: `npm run test:validation`
- **Multi-Tool Kernel Execution Test**: `npm run test:execution`
- **Gemini Reasoning & Planning Test**: `npm run test:gemini`
- **Consequential Action Gating Test**: `npm run test:confirmation`
- **Error Handling & Security Boundaries**: `npm run test:errors`

---

## 🏛️ Project Architecture

```text
├── .swytchcode/
│   ├── integrations/
│   │   ├── WeatherAPI/           # WeatherAPI wrekenfiles (.dahlia)
│   │   ├── Notion/               # Notion wrekenfiles (.dahlia)
│   │   └── Resend/               # Resend wrekenfiles (.dahlia)
│   ├── manifest.json             # Bundle manifest
│   └── tooling.json              # Registered tool schemas & configuration
├── server/
│   ├── types.ts                  # Domain models, plans, and workflow events
│   ├── config.ts                 # Environment & binary resolution
│   ├── gemini.ts                 # Google GenAI reasoning & multi-step planning
│   ├── swytchcode.ts             # Swytchcode CLI bridge, discovery & kernel executor
│   ├── validator.ts              # Canonical ID validation, side-effect detection & schemas
│   ├── executor.ts               # Bounded retries and exponential backoff
│   ├── workflow.ts               # Domain-agnostic multi-step orchestrator & safety gate
│   ├── routes.ts                 # Express REST, SSE streaming & confirmation endpoints
│   └── index.ts                  # Express server entrypoint (:3001)
├── client/
│   ├── src/
│   │   ├── App.tsx               # Interactive chat UI, stepper, confirmation modal & tabs
│   │   ├── main.tsx              # React bootstrap
│   │   └── index.css             # Tailwind dark-theme styling
│   └── index.html
├── tests/
│   ├── swytchcode_discovery.test.ts
│   ├── method_validation.test.ts
│   ├── tool_execution.test.ts
│   ├── gemini_reasoning.test.ts
│   ├── confirmation_gating.test.ts
│   ├── error_handling.test.ts
│   └── run_all.ts                # Master test runner
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 🔒 Security Model

1. **Zero Hardcoded Tool Lists**: Tooling discovery happens dynamically against Swytchcode semantic registries.
2. **Explicit Tooling Allowlist**: Only tools registered in `.swytchcode/tooling.json` are permitted to execute. Arbitrary tool IDs injected into the LLM context fail validation before reaching the execution kernel.
3. **No Credential Exposure**: API keys and OAuth tokens are strictly managed server-side and never exposed in prompts, logs, or client responses.
4. **Consequential Side-Effect Gating**: Operations modifying external state (sending emails, creating pages, processing charges) require human confirmation before dispatch.
