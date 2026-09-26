---
id: "notion-adr-005"
source: "notion"
workspace: "Acme Labs Engineering Wiki / Architecture Decision Records"
title: "ADR-005: Database Topology — PostgreSQL with Regional Read Replicas"
author: "Kai Takahashi <kai.takahashi@acmelabs.io>"
status: "ACCEPTED"
decided_date: "2026-06-25T11:00:00Z"
cross_references:
  - "gdrive-arch-002 (Atlas Architecture v2.0)"
  - "slack-infra-001 (#infra consensus)"
tags: ["adr", "database", "postgres", "read-replicas", "confirmed-decision", "atlas"]
entities:
  people:
    - "Kai Takahashi (Staff SRE)"
    - "Devon Chen (Principal Architect)"
    - "Elena Rostova (VP Engineering)"
  decisions:
    - "Confirmed Decision 3: Database Topology (PostgreSQL with Regional Read Replicas)"
---

# ADR-005: Database Topology — PostgreSQL with Regional Read Replicas

* **Status:** ACCEPTED (Confirmed Decision across Google Drive, Slack, and Notion)
* **Date:** June 25, 2026
* **Deciders:** Kai Takahashi, Devon Chen, Elena Rostova

---

## 1. Context & Problem Statement
With customer pilots launching across North America and Europe, global knowledge graph traversal queries generated high cross-Atlantic latency ($>180\text{ms}$) when routed to a single database master in `us-east-1`.

---

## 2. Decision Outcome
We adopted **AWS Aurora Multi-Region PostgreSQL 16**:
- **Primary Write Node:** AWS `us-east-1` (N. Virginia).
- **Regional Read Replica 1:** AWS `eu-central-1` (Frankfurt) for European enterprise clients.
- **Regional Read Replica 2:** AWS `ap-southeast-1` (Singapore) for APAC pilot partners.

### Target Performance:
- Read queries for local workspace knowledge graphs execute in $<15\text{ms}$.
- Asynchronous replication lag $<80\text{ms}$.
