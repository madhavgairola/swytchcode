---
id: "box-comp-001"
source: "box"
folder: "Box / Acme Labs Compliance / Customer DPAs / 2026"
title: "Data Processing Agreement (DPA) — Project Atlas (Draft v1.0)"
author: "Sarah Jenkins <sarah.jenkins@acmelabs.io>"
status: "DRAFT_UNDER_REVISION"
created_date: "2026-04-18T15:00:00Z"
modified_date: "2026-05-02T11:45:00Z"
superseded_notes: "Draft contains legacy 30-day retention clause; updated to 0-day ephemeral memory retention in CloudForge Agreement (box-legal-001) and final DPA addendum (gmail-006)."
tags: ["compliance", "dpa", "gdpr", "retention-policy", "atlas"]
entities:
  people:
    - "Sarah Jenkins (Legal Counsel)"
    - "Marcus Vance (Head of Security)"
  organizations:
    - "Acme Labs Inc."
    - "Enterprise Pilot Customers"
---

# Data Processing Agreement (DPA) — Project Atlas (Draft v1.0)

> **NOTICE:** This document is an initial legal draft from May 2026.  
> **Clause 4.2 CONTRADICTION NOTE:** This draft states customer execution query data is retained in cold storage for **30 calendar days**. However, this was subsequently revised to **0 days (Ephemeral Memory Only)** per Executive Consensus and the finalized CloudForge Master Agreement (`box-legal-001`).

---

## 1. Scope and Applicability
This Data Processing Agreement governs the processing of Personal Data in connection with Customer’s access to and use of Acme Labs' Project Atlas autonomous integration platform.

---

## 2. Security of Processing
Acme Labs implements technical and organizational measures as documented in the Atlas Security Architecture (`gdrive-arch-002`), including:
- Encryption in transit (TLS 1.3).
- Encryption at rest (AES-256).
- Ephemeral Swytchcode tool execution.

---

## 3. Data Subject Rights & Subprocessors
Acme Labs utilizes subprocessor CloudForge Infrastructure for compute hosting. Subprocessor processing details are governed by the CloudForge Master Agreement.

---

## 4. Data Retention & Deletion Schedule (Draft Clause)
* **Clause 4.1:** Knowledge graph entity metadata is retained for the duration of the active workspace subscription.
* **Clause 4.2 (LEGACY DRAFT CLAUSE):** *"Execution session payloads and tool query transcripts shall be retained in secure temporary audit storage for a period of 30 days prior to automated purging."*  
*(Superseded by Zero-Trust Ephemeral Policy in `box-legal-001` & `gmail-006`)*.
