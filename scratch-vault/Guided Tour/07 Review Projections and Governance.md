# 7. Review Projections and Governance

```hcc-view
version: 0.2-candidate.1
id: governed-evidence-chain
kind: network
title: Source-to-decision evidence chain
summary: Each downstream step remains linked to the exact source and requires its own review boundary.
source: { mode: inline, digest: "candidate:inline:governed-evidence-chain" }
encoding: { kind: network, node: node, source: from, target: to }
data:
  - { node: Source, from: Source, to: Candidate }
  - { node: Candidate, from: Candidate, to: Validation }
  - { node: Validation, from: Validation, to: Response packet }
  - { node: Response packet, from: Response packet, to: Human review }
  - { node: Human review, from: Human review, to: Downstream proposal }
```

Open the governance dashboard for the active note to inspect explicit provenance and bounded relationships. Use projections to aid judgment, never as replacements for source records. Reviewer identity and verification must come from a real human action, not inference.

Continue to [[Guided Tour/08 Integrate with a Knowledge System]].
