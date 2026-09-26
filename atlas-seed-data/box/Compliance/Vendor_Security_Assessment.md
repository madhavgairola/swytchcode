---
id: "box-comp-002"
source: "box"
folder: "Box / Acme Labs Compliance / Vendor Assessments / 2026"
title: "Third-Party Vendor Security Assessment — Swytchcode & CloudForge"
author: "Marcus Vance <marcus.vance@acmelabs.io>"
status: "COMPLETED"
created_date: "2026-07-22T08:30:00Z"
modified_date: "2026-08-15T16:00:00Z"
tags: ["compliance", "security-assessment", "vendors", "swytchcode", "cloudforge"]
entities:
  people:
    - "Marcus Vance (Head of Information Security)"
    - "Sarah Jenkins (Legal Counsel)"
  organizations:
    - "Acme Labs Inc."
    - "Swytchcode Inc."
    - "CloudForge Infrastructure Ltd."
  decisions:
    - "Confirmed Decision: Zero-Trust Ephemeral Credential Vault"
---

# Third-Party Vendor Security Assessment — Swytchcode & CloudForge

---

## 1. Vendor 1: Swytchcode Inc. (API Execution Layer)
- **Service Provided:** Governed execution kernel for multi-tool agent workflows (`@swytchcode/runtime`).
- **Security Assessment Findings:**
  - **Credential Isolation:** PASSED. Swytchcode uses local device/server memory injection (`~/.swytchcode/auth.json`). No API tokens or customer secrets are transmitted to Swytchcode cloud servers during execution.
  - **Audit Logging:** PASSED. Local structured audit trails redact authorization headers and sensitive bearer tokens automatically.
  - **Policy Enforcement:** PASSED. Pre-execution policy evaluation ensures unverified or malicious tools are rejected prior to network invocation.
- **Assessment Conclusion:** APPROVED for Project Atlas production use.

---

## 2. Vendor 2: CloudForge Infrastructure Ltd. (Compute & Storage)
- **Service Provided:** Multi-region Kubernetes compute and managed PostgreSQL / Redis hosting.
- **Security Assessment Findings:**
  - **SOC-2 Type II Compliance:** Valid attestation on file through August 2027.
  - **Encryption:** TLS 1.3 enforced, KMS customer-managed keys supported.
  - **Outstanding Requirement:** Frankfurt Data Center Addendum pending mutual execution (`box-legal-003`).
- **Assessment Conclusion:** CONDITIONALLY APPROVED pending signature of the EU residency addendum.
