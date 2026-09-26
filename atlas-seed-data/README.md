# 🗺️ Acme Labs — Project Atlas Synthetic Knowledge Dataset

This directory contains a complete, interconnected synthetic dataset for **Acme Labs** and its flagship initiative, **Project Atlas**. It is designed to benchmark and test autonomous AI knowledge-worker agents integrating across **Gmail, Google Drive, Notion, Slack, and Box** via Swytchcode.

---

## 📁 1. Directory Structure & Upload Mapping

```
atlas-seed-data/
│
├── google-drive/                          # Upload to: Google Drive ("Acme Labs / Project Atlas")
│   ├── Architecture/
│   │   ├── Atlas_Architecture_v1.md       # Outdated monolithic prototype (deprecated)
│   │   └── Atlas_Architecture_v2.md       # Current approved architecture baseline
│   ├── Product/
│   │   └── Atlas_PRD.md                   # Product requirements document (contains old launch date)
│   ├── Security/
│   │   └── Atlas_Threat_Model_v1.md       # Threat model & zero-trust vault specifications
│   └── Planning/
│       └── Atlas_Roadmap.md               # Q3/Q4 engineering milestone roadmap
│
├── box/                                   # Upload to: Box ("Acme Labs Compliance & Legal")
│   ├── Compliance/
│   │   ├── Atlas_DPA.md                   # Initial DPA draft (contains legacy 30-day retention clause)
│   │   └── Vendor_Security_Assessment.md  # Swytchcode & CloudForge security assessment
│   └── Legal/
│       ├── CloudForge_Agreement.md        # Master hosting contract (0-day ephemeral retention)
│       └── Frankfurt_Data_Center_Addendum_UNSIGNED.md # Schedule D (Blocked dependency)
│
├── notion/                                # Upload to: Notion Workspace ("Engineering Wiki")
│   ├── Atlas_Project_Overview.md          # Central project wiki and navigation hub
│   ├── Atlas_Milestones.md                # Milestones & deadlines tracker
│   ├── ADR-004_Backend_Framework.md       # ADR: FastAPI + Node.js (Confirmed Decision 1)
│   ├── ADR-005_Database_Read_Replicas.md  # ADR: Aurora PostgreSQL + Replicas (Confirmed Decision 3)
│   ├── ADR-003_Caching_Strategy_OUTDATED.md # ADR: Memcached (Outdated Contradiction 2)
│   ├── Atlas_Security_Review.md           # Security review & zero-trust signoff (Confirmed Decision 2)
│   ├── Incident_Postmortem_402.md         # Postmortem on rate limiting & exponential backoff
│   └── Sprint_39_Planning.md              # Active sprint board (contains IAM role blocker)
│
├── gmail/                                 # Upload to: Mailbox / Workspace Mail (sarah.lin@enterprise.com)
│   ├── 001_architecture_decision.md      # Dual microservices signoff email
│   ├── 002_security_review_blocker.md     # Urgent IAM role approval request (Blocker 2)
│   ├── 003_launch_timeline_update.md      # Official launch rescheduled to Nov 12 (Contradiction 1)
│   ├── 004_unrelated_pizza_lunch.md       # Noise: All-hands pizza lunch
│   ├── 005_client_pilot_feedback_acmo.md  # Acmo Corp CTO latency benchmark confirmation
│   ├── 006_legal_dpa_signoff.md           # Legal signoff on 0-day ephemeral retention
│   ├── 007_frankfurt_datacenter_delay.md  # Frankfurt CloudForge delay notice (Blocker 1)
│   ├── 008_unrelated_fantasy_football.md  # Noise: Fantasy football draft
│   ├── 009_quarterly_budget_approval.md   # Q4 budget approval from VP Engineering
│   ├── 010_incident_402_postmortem_signoff.md # Security signoff on exponential backoff
│   ├── 011_pentest_vendor_findings.md     # Vanguard Security clean pen-test summary
│   ├── 012_unrelated_office_keycard.md    # Noise: Lost badge in elevator lobby
│   └── 013_weekly_engineering_ops_digest.md # Weekly 99.98% uptime and tool volume digest
│
├── slack/                                 # Upload to: Slack Enterprise Export / Channel History
│   ├── atlas-channel.md                   # #atlas: Coordination, launch reschedule discussion
│   ├── security-channel.md                # #security: Zero-trust vault, IAM blocker discussion
│   ├── engineering-channel.md             # #engineering: Architecture review, D3 visualizer PR
│   ├── infra-channel.md                   # #infra: Aurora Postgres consensus, Redis adoption
│   └── general-channel.md                 # #general: Company announcements & social chatter
│
└── README.md                              # This benchmark documentation & truth matrix
```

---

## 🎯 2. Ground Truth Matrix: Deliberate Contradictions & Blockers

### ⚡ 3 Deliberately Introduced Cross-Source Contradictions

| Contradiction | Outdated / Stale Record | Authoritative Current Truth | Cross-Source Evidence |
|---|---|---|---|
| **1. Alpha Launch Date** | **October 15, 2026** (stated in Google Drive PRD `gdrive-prod-001`) | **November 12, 2026** (approved by VP Engineering) | • Slack `#atlas` discussion on 2026-09-18<br>• Executive memo in Gmail `gmail-003`<br>• Notion Milestones tracker `notion-mile-001` |
| **2. Primary Cache Provider** | **Memcached Cluster** (stated in Notion `notion-adr-003`) | **Redis Enterprise Cluster** (128GB, pub/sub, vector indexing) | • Google Drive `gdrive-arch-002`<br>• Slack `#infra` consensus on 2026-06-25<br>• Weekly Ops Digest `gmail-013` |
| **3. Customer Data Retention Policy** | **30 Calendar Days** in cold audit storage (draft DPA `box-comp-001`) | **0 Days (Immediate Ephemeral Memory Purge)** | • CloudForge Agreement Section 8.4 `box-legal-001`<br>• Legal Counsel signoff email `gmail-006`<br>• Atlas Threat Model `gdrive-sec-001` |

---

### 🚧 2 Missing / Blocked Dependencies

| Blocker ID | Blocked Task / System | Root Blocker & Missing Item | Blocking Person / Vendor | Cross-Source Evidence |
|---|---|---|---|---|
| **Blocker 1: EU Residency Gateway** | Deployment of `eu-central-1` (Frankfurt) read replicas and data residency gateway | Outstanding countersignature on Schedule D Frankfurt Addendum | **Arthur Pendelton** (VP Sales / Legal @ CloudForge) | • Box `box-legal-003`<br>• Slack `#infra` 2026-09-21<br>• Gmail `gmail-007`<br>• Notion `notion-sprint-39` (Ticket ENG-843) |
| **Blocker 2: SOC-2 Automated Audit Log Pipeline** | Deployment of automated log pipeline to immutable S3 audit bucket (`s3://acmelabs-soc2-audit-2026`) | Pending IAM cross-account role approval: `arn:aws:iam::112233445566:role/AtlasSOC2LogExporter` | **Marcus Vance** (Head of Information Security) | • Gmail `gmail-002`<br>• Slack `#security` 2026-09-22<br>• Notion `notion-sprint-39` (Ticket ENG-842) |

---

### ✅ 3 Confirmed Decisions Appearing Across Multiple Sources

| Confirmed Decision | Core Specification | Supporting Sources & Cross-Links |
|---|---|---|
| **1. Dual Backend Microservices** | Node.js (Express/TS) Gateway for SSE streaming + Python (FastAPI) for Gemini reasoning | • Notion `notion-adr-004`<br>• Google Drive `gdrive-arch-002`<br>• Gmail `gmail-001`<br>• Slack `#engineering` 2026-05-18 |
| **2. Zero-Trust Ephemeral Secret Vault** | Credentials injected into memory on-demand via Swytchcode and wiped upon connection close; zero disk storage | • Google Drive `gdrive-sec-001`<br>• Notion `notion-sec-001`<br>• Box `box-comp-002`<br>• Slack `#security` 2026-09-15 |
| **3. Database Topology: Multi-Region PostgreSQL** | AWS Aurora PostgreSQL 16 primary in `us-east-1` with regional read replicas in Frankfurt & Singapore | • Notion `notion-adr-005`<br>• Google Drive `gdrive-arch-002`<br>• Slack `#infra` 2026-06-25 |

---

## 👥 3. Consistent Personas & Responsibilities

| Name | Role / Title | Email | Slack Handle |
|---|---|---|---|
| **Elena Rostova** | VP of Engineering & Executive Sponsor | `elena.rostova@acmelabs.io` | `@elena` |
| **Devon Chen** | Principal Architect & Tech Lead | `devon.chen@acmelabs.io` | `@devon` |
| **Marcus Vance** | Head of Information Security & Compliance Officer | `marcus.vance@acmelabs.io` | `@marcus` |
| **Priya Sharma** | Lead Product Manager (Project Atlas) | `priya.sharma@acmelabs.io` | `@priya` |
| **Kai Takahashi** | Staff SRE & Infrastructure Lead | `kai.takahashi@acmelabs.io` | `@kai` |
| **Sarah Jenkins** | Legal Counsel & Data Protection Officer | `sarah.jenkins@acmelabs.io` | `@sarah` |
| **David Ross** | Senior Frontend & Graph UI Lead | `david.ross@acmelabs.io` | `@david` |
| **Chloe Bennett** | Customer Success & Enterprise Pilot Lead | `chloe.bennett@acmelabs.io` | `@chloe` |
| **Alex Rivera** | CTO @ Acmo Tech Corp (Design Partner Lead) | `alex.rivera@acmotech.io` | External Email |
| **Arthur Pendelton** | VP Sales @ CloudForge Infrastructure | `arthur.p@cloudforge.io` | External Email |

---

## 🗑️ 4. Relevant vs. Irrelevant (Noise) Records

- **Business Critical Records:** All Architecture RFCs, Threat Models, DPA agreements, Sprint boards, Pilot benchmark confirmations, and incident postmortems.
- **Intentional Distractor / Noise Records:**
  - `gmail/004_unrelated_pizza_lunch.md`: All-hands Friday artisan pizza lunch invitation.
  - `gmail/008_unrelated_fantasy_football.md`: Company fantasy football draft notice.
  - `gmail/012_unrelated_office_keycard.md`: Lost physical keycard notice in 3rd-floor lobby.
  - `slack/general-channel.md`: Social breakroom and sports banter.
