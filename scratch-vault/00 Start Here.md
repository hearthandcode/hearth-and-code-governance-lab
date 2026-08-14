---
type: governance-lab-guided-start
class: projection
status: public-guide
verified: false
---

# Start Here

Welcome to the minimal Governance Lab guided vault. It teaches one complete path from a bounded question to an immutable response packet and a separately reviewed downstream integration proposal.

```hcc-view
version: 0.2-candidate.1
id: guided-tour-stages
kind: network
title: Eight-stage governed workflow
summary: Move from purpose and configuration through agent-assisted authoring, validation, response capture, review, and separate downstream integration.
source: { mode: inline, digest: "candidate:inline:guided-tour-stages" }
encoding: { kind: network, node: stage, source: from, target: to }
data:
  - { stage: 1. Orient, from: 1. Orient, to: 2. Configure }
  - { stage: 2. Configure, from: 2. Configure, to: 3. Ask an agent }
  - { stage: 3. Ask an agent, from: 3. Ask an agent, to: 4. Validate }
  - { stage: 4. Validate, from: 4. Validate, to: 5. Answer }
  - { stage: 5. Answer, from: 5. Answer, to: 6. Preserve }
  - { stage: 6. Preserve, from: 6. Preserve, to: 7. Review }
  - { stage: 7. Review, from: 7. Review, to: 8. Integrate separately }
```

## Guided route

1. [[Guided Tour/01 Orientation and Safety]]
2. [[Guided Tour/02 Configure the Plugin]]
3. [[Guided Tour/03 Ask an Agent to Author]]
4. [[Guided Tour/04 Validate the Artifact]]
5. [[Guided Tour/05 Complete a Worksheet]]
6. [[Guided Tour/06 Preserve and Amend Responses]]
7. [[Guided Tour/07 Review Projections and Governance]]
8. [[Guided Tour/08 Integrate with a Knowledge System]]

Open [[Workbooks/Governance Lab Guided Workbook]] when you want the four evaluation worksheets. The plugin never calls an LLM. The guide shows how a separately operated agent can author source-visible Hub artifacts and receive an explicitly shared packet locator without scanning the vault, overwriting a packet, or automatically updating a knowledge system.
