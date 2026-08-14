# Response Lifecycle Practice

```hcc-form
version: 0.1-candidate.1
id: response-lifecycle-practice
title: Response lifecycle practice
purpose: Confirm the preview, create, reload, and immutable-successor workflow with synthetic answers.
privacy: private
sections:
  - id: lifecycle
    title: Packet lifecycle
    interactions: [lifecycle-checks, lifecycle-locator, lifecycle-amendment, lifecycle-boundary]
completion:
  required: [lifecycle-checks, lifecycle-boundary]
workbook_ref: Workbooks/Governance Lab Guided Workbook
governance:
  authority_refs: []
  review_required: true
  verification_required: false
```

## Lifecycle checks

```hcc-interaction
version: 0.3-candidate.1
id: lifecycle-checks
kind: multi_select
prompt: Which response-packet operations have you tested successfully?
config:
  options:
    - { id: preview, label: Preview exact packet }
    - { id: create, label: Create and read back }
    - { id: locator, label: Copy path and digest }
    - { id: reload, label: Reload exact packet }
    - { id: stale, label: Reject stale digest }
    - { id: successor, label: Create successor amendment }
response: { value: null, note: null, state: unanswered, author: null, responded_at: null }
visibility: private
```

## Locator

```hcc-interaction
version: 0.3-candidate.1
id: lifecycle-locator
kind: long_text
prompt: Paste the synthetic packet path and digest you retained.
config: { min_length: 0, max_length: 1000, rows: 4 }
response: { value: null, note: null, state: unanswered, author: null, responded_at: null }
visibility: private
```

## Amendment reason

```hcc-interaction
version: 0.3-candidate.1
id: lifecycle-amendment
kind: short_text
prompt: What synthetic reason did you use for the successor amendment?
config: { placeholder: Optional until successor testing, min_length: 0, max_length: 240 }
response: { value: null, note: null, state: unanswered, author: null, responded_at: null }
visibility: private
```

## Boundary

```hcc-interaction
version: 0.3-candidate.1
id: lifecycle-boundary
kind: boolean
prompt: Did every save create a new packet without modifying its source or predecessor?
config: { true_label: "Yes, create-only held", false_label: "No, preserve evidence and stop" }
response: { value: null, note: null, state: unanswered, author: null, responded_at: null }
visibility: private
```
