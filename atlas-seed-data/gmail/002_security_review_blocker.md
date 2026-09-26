---
id: "gmail-002"
source: "gmail"
message_id: "<msg.20260922.sec.02@acmelabs.io>"
thread_id: "thread_soc2_iam_blocker"
date: "2026-09-22T09:40:00Z"
from: "Kai Takahashi <kai.takahashi@acmelabs.io>"
to:
  - "Marcus Vance <marcus.vance@acmelabs.io>"
cc:
  - "Devon Chen <devon.chen@acmelabs.io>"
  - "Priya Sharma <priya.sharma@acmelabs.io>"
subject: "URGENT BLOCKER: IAM Role Approval required for SOC-2 Automated Audit Exporter (ENG-842)"
labels: ["SECURITY", "BLOCKER", "COMPLIANCE", "SPRINT-39"]
cross_references:
  - "notion-sprint-39 (Ticket ENG-842)"
  - "notion-sec-001 (Security Review)"
entities:
  people:
    - "Kai Takahashi (Staff SRE)"
    - "Marcus Vance (Head of Security)"
  blockers:
    - "Blocked Dependency 2: SOC-2 Automated Audit Log Pipeline"
---

Hi Marcus,

I wanted to flag a critical blocker for Sprint 39. We have built the automated log pipeline that aggregates Swytchcode tool execution audit summaries and streams them into our immutable S3 bucket for the Ernst & Young audit window next month.

However, the Terraform plan is currently blocked on security authorization. I need you to review and approve the cross-account IAM Role:
`arn:aws:iam::112233445566:role/AtlasSOC2LogExporter`

Without this role approval, ticket **ENG-842** cannot be deployed to staging or verified prior to the audit window starting October 10.

Could you please review the attached IAM policy and grant signoff in AWS IAM Identity Center?

Thanks,  
**Kai Takahashi**  
Staff SRE, Infrastructure
