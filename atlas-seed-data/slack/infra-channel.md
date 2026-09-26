---
id: "slack-chan-infra"
source: "slack"
channel_name: "#infra"
channel_id: "C08INFRA33"
topic: "Infrastructure, Kubernetes clusters, database replication & CloudForge hosting"
member_count: 15
date_range: "2026-06-25 to 2026-09-25"
cross_references:
  - "notion-adr-005 (ADR-005 Read Replicas)"
  - "notion-adr-003 (Old Memcached ADR - Contradiction)"
  - "box-legal-003 (Schedule D Unsigned Addendum - Blocker)"
  - "gmail-007 (Frankfurt Datacenter Blocker)"
entities:
  people:
    - "Kai Takahashi (@kai)"
    - "Devon Chen (@devon)"
    - "Sarah Jenkins (@sarah)"
  decisions:
    - "Confirmed Decision 3: Database Topology (PostgreSQL with Regional Read Replicas)"
---

# Slack Channel: #infra (Infrastructure & Reliability)

### 2026-06-25

**[2026-06-25 11:30:00] @kai:** Team, we are officially standardizing on **AWS Aurora Multi-Region PostgreSQL 16** with read replicas in `eu-central-1` (Frankfurt) and `ap-southeast-1` (Singapore) (see `notion-adr-005`).

**[2026-06-25 11:35:10] @devon:** Quick note on caching: We also retired the legacy Memcached cluster prototype (`notion-adr-003`). All session graphs, idempotency locks, and ephemeral token maps are now running on **Redis Enterprise Cluster** (`gdrive-arch-002`).

**[2026-06-25 11:38:00] @kai:** Confirmed. Redis cluster memory is currently sized at 128GB with automatic failover.

---

### 2026-09-21

**[2026-09-21 15:40:00] @kai:** @sarah Wanted to double check on the CloudForge Frankfurt Schedule D (`box-legal-003`). Our Terraform manifests for the EU read replica and data gateway are ready to deploy, but CloudForge won't provision the dedicated enclave until they execute the addendum.

**[2026-09-21 15:45:12] @sarah:** I sent a follow-up email to Arthur Pendelton at CloudForge this afternoon (`gmail-007`). Their legal team had an internal question regarding GDPR subprocessor liability. I'm pushing for them to sign by end of week.

**[2026-09-24 10:10:00] @kai:** Thanks Sarah. Ticket **ENG-843** will remain in `BLOCKED` status on our sprint board (`notion-sprint-39`) until we get that signed PDF back in Box.
