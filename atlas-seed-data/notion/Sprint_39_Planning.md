---
id: "notion-sprint-39"
source: "notion"
workspace: "Acme Labs Engineering Wiki / Sprints / Sprint 39"
title: "Sprint 39 Planning & Blocker Board"
author: "Priya Sharma <priya.sharma@acmelabs.io>"
sprint_period: "September 21, 2026 – October 02, 2026"
last_edited: "2026-09-24T17:00:00Z"
blocker_details:
  blocked_ticket: "ENG-842: Automated SOC-2 Audit Export Pipeline"
  waiting_on: "Marcus Vance (Head of Security)"
  reason: "Marcus Vance needs to approve the IAM cross-account role `arn:aws:iam::112233445566:role/AtlasSOC2LogExporter` before deployment."
tags: ["sprint", "planning", "blockers", "jira", "atlas"]
entities:
  people:
    - "Priya Sharma (Lead PM)"
    - "Kai Takahashi (Staff SRE)"
    - "Marcus Vance (Head of Security)"
    - "David Ross (Senior Frontend Lead)"
---

# Sprint 39 Planning & Blocker Board

> **Sprint Goal:** Complete Swytchcode tool stabilization, finalize API freeze ahead of Sept 30 deadline, and resolve open compliance blockers.

---

## 1. Active Sprint Tickets

| Ticket | Description | Assignee | Status | Notes / Blockers |
|---|---|---|---|---|
| **ENG-840** | Finalize Swytchcode Tooling JSON for Gmail & Slack | Devon Chen | 🟢 IN PROGRESS | On track for Sept 30 API freeze. |
| **ENG-841** | D3 Knowledge Graph Hover Glow & Provenance Colors | David Ross | 🟢 IN REVIEW | PR #142 submitted. |
| **ENG-842** | **Automated SOC-2 Audit Export Pipeline** | Kai Takahashi | 🔴 **BLOCKED** | **Waiting on Marcus Vance for IAM Cross-Account Role Approval.** Ticket blocked since Sept 22 (`gmail-002`). |
| **ENG-843** | EU Frankfurt Read Replica Provisioning | Kai Takahashi | 🔴 **BLOCKED** | **Blocked on CloudForge signed Schedule D (`box-legal-003`).** |
| **ENG-844** | Acmo Corp Pilot Data Ingestion Scripts | Chloe Bennett | 🟢 READY | Scheduled for Nov 12 launch. |
