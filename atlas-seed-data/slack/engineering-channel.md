---
id: "slack-chan-eng"
source: "slack"
channel_name: "#engineering"
channel_id: "C08ENG1122"
topic: "General engineering discussions, code reviews, Swytchcode tool bindings & ADRs"
member_count: 42
date_range: "2026-05-18 to 2026-09-25"
cross_references:
  - "notion-adr-004 (ADR-004 Backend Framework)"
  - "gmail-001 (Architecture Decision)"
  - "gdrive-arch-002 (Atlas Architecture v2.0)"
entities:
  people:
    - "Devon Chen (@devon)"
    - "David Ross (@david)"
    - "Elena Rostova (@elena)"
    - "Kai Takahashi (@kai)"
  decisions:
    - "Confirmed Decision 1: Backend Framework (FastAPI + Node.js Microservices)"
---

# Slack Channel: #engineering (Engineering Team)

### 2026-05-18

**[2026-05-18 16:30:00] @devon:** Team, the architecture review for Project Atlas backend is complete! We have formally decided on **Node.js (Express) for Gateway & SSE streaming + Python (FastAPI) for AI reasoning and graph calculations**.

**[2026-05-18 16:32:15] @david:** Love this. Being able to use native TypeScript on the frontend and gateway while Python handles the heavy vector embeddings makes life so much easier.

**[2026-05-18 16:35:00] @elena:** Confirmed. This gives us clear service separation and allows us to scale reasoning pods independently from websocket/SSE connection gateways.

---

### 2026-09-23

**[2026-09-23 11:10:00] @david:** Just pushed PR #142 for the Knowledge Graph canvas visualizer. Now nodes render with their exact source provenance colors (Gmail: Sky Blue, Drive: Gold, Notion: Purple, Slack: Green, Box: Orange, Decisions: Red, Tools: Cyan).

**[2026-09-23 11:15:20] @devon:** Tested locally. When you hover over a node, only then the full title and floating card appear, keeping the idle graph clean and constellation-like. Physics feel super loose and responsive with the -380 charge strength!

**[2026-09-23 11:20:00] @kai:** Merged PR #142 into `main`. Clean build on CI.
