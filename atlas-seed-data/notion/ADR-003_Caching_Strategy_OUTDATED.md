---
id: "notion-adr-003"
source: "notion"
workspace: "Acme Labs Engineering Wiki / Architecture Decision Records"
title: "ADR-003: Caching Strategy — Memcached Cluster (DEPRECATED / OUTDATED)"
author: "Devon Chen <devon.chen@acmelabs.io>"
status: "SUPERSEDED"
decided_date: "2026-03-20T10:00:00Z"
superseded_by: "gdrive-arch-002"
tags: ["adr", "caching", "deprecated", "contradiction", "atlas"]
entities:
  people:
    - "Devon Chen (Principal Architect)"
  systems:
    - "Memcached Cluster"
---

# ADR-003: Caching Strategy — Memcached Cluster (OUTDATED)

> **⚠️ SUPERSEDED RECORD:** This ADR originally recommended Memcached in March 2026.  
> **CONTRADICTION NOTE:** This document conflicts with the approved **Atlas Architecture Specification v2.0** (`gdrive-arch-002`) and `#infra-channel` consensus, which formally transitioned the entire caching architecture to **Redis Enterprise Cluster** with pub/sub and vector indexing capabilities.

---

## 1. Original Decision (March 2026)
Selected a 2-node Memcached cluster for simple key-value HTML fragment caching.

## 2. Superseded Notice
Retired in May 2026 because Memcached does not support persistent vector data structures, distributed locking for tool execution idempotency, or pub/sub cache invalidation.
