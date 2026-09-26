---
id: "gmail-007"
source: "gmail"
message_id: "<msg.20260921.infra.07@acmelabs.io>"
thread_id: "thread_frankfurt_datacenter_delay"
date: "2026-09-21T15:30:00Z"
from: "Kai Takahashi <kai.takahashi@acmelabs.io>"
to:
  - "Sarah Jenkins <sarah.jenkins@acmelabs.io>"
  - "Devon Chen <devon.chen@acmelabs.io>"
subject: "Status Update: EU Frankfurt Read Replica Deployment still BLOCKED on CloudForge Schedule D"
labels: ["INFRASTRUCTURE", "BLOCKER", "EU-RESIDENCY"]
cross_references:
  - "box-legal-003 (Schedule D Unsigned Addendum)"
  - "slack-infra-001 (#infra discussion)"
entities:
  people:
    - "Kai Takahashi (Staff SRE)"
    - "Sarah Jenkins (Legal Counsel)"
    - "Devon Chen (Principal Architect)"
  blockers:
    - "Blocked Dependency 1: Frankfurt Data Center Addendum"
---

Hi Sarah,

Following up on our EU infrastructure deployment. Our Kubernetes deployment scripts and Terraform manifests for the `eu-central-1` (Frankfurt) read replicas and data gateway are ready to roll out.

However, CloudForge NOC has put our provisioning tickets on hold because the Frankfurt Facility Addendum (Schedule D) remains unsigned on their end (`box-legal-003`).

Until CloudForge's legal department executes that addendum, we cannot provision dedicated hardware in their Frankfurt datacenter. Could you please ping Arthur Pendelton at CloudForge to expedite their countersignature?

Thanks,  
**Kai Takahashi**  
Staff SRE
