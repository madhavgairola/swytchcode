---
id: "gdrive-arch-001"
source: "google_drive"
folder: "Google Drive / Acme Labs / Project Atlas / Architecture"
title: "Atlas Architecture Specification v1.0 (DEPRECATED)"
author: "Devon Chen <devon.chen@acmelabs.io>"
status: "DEPRECATED"
created_date: "2026-03-12T10:00:00Z"
modified_date: "2026-04-15T14:30:00Z"
superseded_by: "gdrive-arch-002"
tags: ["architecture", "deprecated", "monolith", "atlas"]
entities:
  people:
    - "Devon Chen (Principal Architect)"
    - "Elena Rostova (VP Engineering)"
  projects:
    - "Project Atlas"
  systems:
    - "Atlas Monolith"
    - "Ruby on Rails API"
    - "Single MySQL Instance"
    - "Memcached"
---

# Atlas Architecture Specification v1.0 (DEPRECATED)

> **WARNING — OUTDATED SPECIFICATION:** This document describes the initial monolithic prototype designed in Q1 2026. It has been formally superseded by **Atlas Architecture Specification v2.0** (`gdrive-arch-002`) following Architecture Review on May 18, 2026.

---

## 1. Executive Overview
Project Atlas was initially conceived as a centralized internal automation service hosted as a monolithic Rails application. 

### Initial Components:
- **Core API:** Ruby on Rails 8.0 running Puma web servers.
- **Primary Database:** Single master MySQL 8.0 without read replicas.
- **Caching Layer:** Memcached cluster (2 nodes, `cache-01`, `cache-02`).
- **External Integrations:** Direct in-process HTTP client calls using vendor Ruby gems (Stripe, Twilio, SendGrid).
- **Target SLA:** 99.5% uptime, 250ms P95 latency.

---

## 2. Identified Architectural Bottlenecks & Deprecation Rationale
During stress tests in April 2026, the following architectural flaws were discovered:
1. **Third-Party API Drift & Blocking:** Direct vendor HTTP SDKs caused thread exhaustion in Puma workers when external APIs experienced transient rate limiting.
2. **Secret Persistence Risk:** Vendor API keys were stored in environment variables persisted on disk in config files.
3. **Database Contention:** Heavy analytical queries on the single MySQL master blocked transactional customer traffic.
4. **Residency Constraints:** Monolithic architecture could not support regional data residency requirements for EU enterprise clients.

---

## 3. Decision Log
- **2026-04-20:** Architecture Committee voted unanimously to retire the Rails monolith in favor of stateless microservices orchestrated via Swytchcode tool kernels. See `notion-adr-004` and `gdrive-arch-002`.
