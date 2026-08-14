# 8. Integrate with a Knowledge System

Governance Lab does not write response packets into a canonical library automatically. Integration is a separate governed operation.

```hcc-view
version: 0.2-candidate.1
id: integration-readiness
kind: table
title: Downstream integration gates
summary: Eight conditions should be explicit before an immutable response candidate can inform another system.
source: { mode: inline, digest: "candidate:inline:integration-readiness" }
encoding: { kind: table, columns: [gate, evidence] }
data:
  - { gate: Source identity, evidence: Exact packet path and digest }
  - { gate: Lineage, evidence: Worksheet and predecessor bindings }
  - { gate: Mapping, evidence: Stable response ID to destination field }
  - { gate: Privacy, evidence: Permitted disclosure and retention }
  - { gate: Authority, evidence: Candidate-to-record transition owner }
  - { gate: Conflict, evidence: Duplicate and stale-state policy }
  - { gate: Recovery, evidence: Rollback or compensating action }
  - { gate: Receipt, evidence: Direct post-write verification }
```

Complete [[Worksheets/04 Integration Readiness Review]]. Then invoke `$hearthandcode-governance-obsidian` in the Hub and provide the exact packet locator, intended destination source, and applicable Hub rules. The agent may digest-verify the one named packet and prepare a routed intake candidate, mapping, decision candidate, or change set. It must not enumerate the packet directory or treat the packet as authority. Only the destination's separately authorized writer and human gate may admit or apply a canonical successor.
