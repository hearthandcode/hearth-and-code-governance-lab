# Integration Readiness Review

```hcc-form
version: 0.1-candidate.1
id: integration-readiness-review
title: Integration readiness review
purpose: Decide whether a packet-to-record integration proposal is sufficiently specified for separate implementation review.
privacy: private
sections:
  - id: evidence
    title: Eight integration gates
    interactions: [integration-gates, integration-route, integration-decision]
completion:
  required: [integration-gates, integration-decision]
workbook_ref: Workbooks/Governance Lab Guided Workbook
governance:
  authority_refs: []
  review_required: true
  verification_required: false
```

## Gate dispositions

```hcc-interaction
version: 0.3-candidate.1
id: integration-gates
kind: matrix
prompt: What is the readiness of each downstream integration gate?
config:
  rows:
    - { id: source, label: 1. Exact source and digest }
    - { id: lineage, label: 2. Packet lineage }
    - { id: mapping, label: 3. Field mapping }
    - { id: privacy, label: 4. Privacy and disclosure }
    - { id: authority, label: 5. Authority transition }
    - { id: conflict, label: 6. Conflict and duplicates }
    - { id: recovery, label: 7. Recovery }
    - { id: receipt, label: 8. Verification receipt }
  columns:
    - { id: ready, label: Ready }
    - { id: revise, label: Revise }
    - { id: blocked, label: Blocked }
  selection: one
  require_all_rows: true
response: { value: null, note: null, state: unanswered, author: null, responded_at: null }
visibility: private
```

## Destination route

```hcc-interaction
version: 0.3-candidate.1
id: integration-route
kind: long_text
prompt: Name the destination schema, writer, human gate, and receipt route without supplying credentials.
config: { min_length: 0, max_length: 2500, rows: 6 }
response: { value: null, note: null, state: unanswered, author: null, responded_at: null }
visibility: private
```

## Decision

```hcc-interaction
version: 0.3-candidate.1
id: integration-decision
kind: dropdown
prompt: What should happen next?
config:
  options:
    - { id: practice_again, label: Repeat the guided practice }
    - { id: draft_mapping, label: Draft a mapping proposal }
    - { id: canary_integration, label: Prepare a synthetic canary plan }
    - { id: hold, label: Hold integration work }
response: { value: null, note: null, state: unanswered, author: null, responded_at: null }
visibility: private
```
