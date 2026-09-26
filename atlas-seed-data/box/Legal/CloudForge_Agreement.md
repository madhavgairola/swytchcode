---
id: "box-legal-001"
source: "box"
folder: "Box / Acme Labs Legal / Executed Vendor Contracts / 2026"
title: "CloudForge Infrastructure Master Services Agreement"
author: "Sarah Jenkins <sarah.jenkins@acmelabs.io>"
status: "EXECUTED"
created_date: "2026-05-30T10:00:00Z"
modified_date: "2026-06-12T14:20:00Z"
tags: ["legal", "contracts", "cloudforge", "retention-policy", "atlas"]
entities:
  people:
    - "Sarah Jenkins (Legal Counsel)"
    - "Elena Rostova (VP Engineering)"
    - "Arthur Pendelton (VP Sales, CloudForge)"
  organizations:
    - "Acme Labs Inc."
    - "CloudForge Infrastructure Ltd."
  decisions:
    - "Confirmed Policy: Zero-Day Ephemeral Retention on Raw Session Streams"
---

# CloudForge Infrastructure Master Services Agreement

> **CONTRACT ID:** CF-ACM-2026-9812  
> **EFFECTIVE DATE:** June 15, 2026  
> **SIGNATORIES:** Elena Rostova (Acme Labs), Arthur Pendelton (CloudForge)

---

## 1. Hosting Services & Dedicated Enclaves
CloudForge provides Acme Labs with dedicated, isolated Kubernetes compute nodes (AWS/GCP underlying) and managed Aurora PostgreSQL clusters in `us-east-1` and `eu-west-1`.

---

## 2. Data Protection & Ephemeral Processing Clause
- **Section 8.4 (Data Processing Guarantee):**
  > *"CloudForge shall operate all Project Atlas worker pods in ephemeral memory mode. Under no circumstances shall CloudForge write, persist, cache, or mirror raw user prompts, tool payload arguments, or execution transcripts to persistent disk or external analytics pipelines. The retention window for execution payloads is explicitly defined as **Zero (0) Days (Immediate Ephemeral Memory Purge)** upon HTTP connection close."*

*(This clause supersedes the preliminary 30-day language in draft DPA `box-comp-001`)*.

---

## 3. Service Level Agreement (SLA)
- 99.95% monthly uptime guarantee.
- P99 inter-region network latency $<45\text{ms}$ between US and EU clusters.
