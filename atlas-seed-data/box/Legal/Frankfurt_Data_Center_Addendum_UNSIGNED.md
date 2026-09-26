---
id: "box-legal-003"
source: "box"
folder: "Box / Acme Labs Legal / Pending Vendor Addenda / 2026"
title: "Schedule D: Frankfurt (eu-central-1) Data Residency Addendum (PENDING SIGNATURE)"
author: "Sarah Jenkins <sarah.jenkins@acmelabs.io>"
status: "BLOCKED_PENDING_VENDOR_SIGNATURE"
created_date: "2026-08-10T16:00:00Z"
modified_date: "2026-09-20T11:10:00Z"
blocker_details:
  blocked_system: "EU Data Residency Gateway & Read Replica Deployment"
  waiting_on: "Arthur Pendelton (CloudForge VP Sales / Legal Team)"
  impact: "Prevents EU enterprise pilot client data ingestion until counter-signed."
tags: ["legal", "blocker", "frankfurt", "eu-residency", "cloudforge", "atlas"]
entities:
  people:
    - "Sarah Jenkins (Legal Counsel)"
    - "Kai Takahashi (Staff SRE)"
    - "Arthur Pendelton (CloudForge)"
  organizations:
    - "Acme Labs Inc."
    - "CloudForge Infrastructure Ltd."
---

# Schedule D: Frankfurt (eu-central-1) Data Residency Addendum (UNSIGNED)

> **⚠️ ACTIVE BLOCKER ALERT:** This addendum has been drafted by Acme Labs legal counsel and transmitted to CloudForge for execution on August 15, 2026. As of September 25, 2026, CloudForge legal has not returned the executed countersignature.  
> **ENGINEERING IMPACT:** Deployment of the EU Data Gateway (`eu-central-1`) and production read replicas is BLOCKED (see `slack-sec-001` and `gmail-007`).

---

## 1. Terms of Addendum
This Schedule D amends Master Services Agreement `CF-ACM-2026-9812` to authorize deployment of dedicated hardware security modules (HSMs) and sovereign database read replicas within the CloudForge Frankfurt Data Center facility (`fra-02`).

---

## 2. Signature Status
- **Acme Labs Inc:** Signed by Sarah Jenkins on 2026-08-14.
- **CloudForge Infrastructure Ltd:** **UNSIGNED / OUTSTANDING PENDING DPA AMENDMENT REVIEW.**
