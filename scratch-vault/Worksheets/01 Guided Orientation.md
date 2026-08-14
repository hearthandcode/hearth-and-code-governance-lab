# Guided Orientation

```hcc-form
version: 0.1-candidate.1
id: guided-orientation
title: Guided orientation
purpose: Bound the first governed worksheet and its disclosure and review conditions.
privacy: private
sections:
  - id: purpose
    title: Purpose and audience
    interactions: [guide-purpose, guide-audience]
  - id: boundary
    title: Privacy and success
    interactions: [guide-sensitivity, guide-success]
completion:
  required: [guide-purpose, guide-audience, guide-sensitivity, guide-success]
workbook_ref: Workbooks/Governance Lab Guided Workbook
governance:
  authority_refs: []
  review_required: true
  verification_required: false
```

## Purpose

```hcc-interaction
version: 0.3-candidate.1
id: guide-purpose
kind: long_text
prompt: What bounded purpose should this worksheet serve?
config: { min_length: 8, max_length: 2000, rows: 5 }
response: { value: null, note: null, state: unanswered, author: null, responded_at: null }
visibility: private
```

## Audience

```hcc-interaction
version: 0.3-candidate.1
id: guide-audience
kind: short_text
prompt: Who will answer or review the worksheet?
config: { placeholder: Name a role or audience, min_length: 2, max_length: 160 }
response: { value: null, note: null, state: unanswered, author: null, responded_at: null }
visibility: private
```

## Sensitivity

```hcc-interaction
version: 0.3-candidate.1
id: guide-sensitivity
kind: dropdown
prompt: What disclosure boundary applies to the source material?
config:
  placeholder: Choose a boundary
  options:
    - { id: public, label: Public }
    - { id: internal, label: Internal }
    - { id: private, label: Private }
    - { id: restricted, label: Restricted or do not disclose }
response: { value: null, note: null, state: unanswered, author: null, responded_at: null }
visibility: private
```

## Success

```hcc-interaction
version: 0.3-candidate.1
id: guide-success
kind: ranked_choice
prompt: Rank the qualities that should determine success.
config:
  options:
    - { id: usefulness, label: Usefulness }
    - { id: fidelity, label: Semantic fidelity }
    - { id: accessibility, label: Accessibility }
    - { id: provenance, label: Provenance }
response: { value: null, note: null, state: unanswered, author: null, responded_at: null }
visibility: private
```
