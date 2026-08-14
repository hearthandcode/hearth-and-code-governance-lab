# Agent Authoring Request

```hcc-form
version: 0.1-candidate.1
id: agent-authoring-request
title: Agent authoring request
purpose: Prepare a precise, reviewable request for an AI-authored HCC candidate.
privacy: private
sections:
  - id: design
    title: Artifact design
    interactions: [agent-artifact, agent-scale, agent-kinds, agent-constraints]
  - id: hub-route
    title: Hub source and route
    interactions: [agent-sources, agent-authority, agent-destination, agent-handoff]
completion:
  required: [agent-artifact, agent-scale, agent-constraints, agent-sources, agent-authority, agent-destination, agent-handoff]
workbook_ref: Workbooks/Governance Lab Guided Workbook
governance:
  authority_refs: []
  review_required: true
  verification_required: false
```

## Artifact type

```hcc-interaction
version: 0.3-candidate.1
id: agent-artifact
kind: dropdown
prompt: What should the agent draft?
config:
  options:
    - { id: interaction, label: One interaction }
    - { id: worksheet, label: Worksheet }
    - { id: workbook, label: Workbook }
    - { id: projection, label: Visualization projection }
response: { value: null, note: null, state: unanswered, author: null, responded_at: null }
visibility: private
```

## Direct sources

```hcc-interaction
version: 0.3-candidate.1
id: agent-sources
kind: long_text
prompt: Which exact Hub sources may the agent use?
config: { min_length: 4, max_length: 3000, rows: 5 }
response: { value: null, note: null, state: unanswered, author: null, responded_at: null }
visibility: private
```

## Authority class

```hcc-interaction
version: 0.3-candidate.1
id: agent-authority
kind: dropdown
prompt: What authority may the generated artifact claim?
config:
  options:
    - { id: proposal, label: Proposal requiring review }
    - { id: projection, label: Derived non-authoritative projection }
    - { id: plan, label: Bounded implementation plan }
response: { value: null, note: null, state: unanswered, author: null, responded_at: null }
visibility: private
```

## Hub destination

```hcc-interaction
version: 0.3-candidate.1
id: agent-destination
kind: long_text
prompt: What routing evidence, project grouping, or destination constraint should the agent resolve?
config: { min_length: 4, max_length: 2000, rows: 4 }
response: { value: null, note: null, state: unanswered, author: null, responded_at: null }
visibility: private
```

## Review handoff

```hcc-interaction
version: 0.3-candidate.1
id: agent-handoff
kind: long_text
prompt: What should the human inspect in Obsidian, and what effect must remain held afterward?
config: { min_length: 4, max_length: 2000, rows: 4 }
response: { value: null, note: null, state: unanswered, author: null, responded_at: null }
visibility: private
```

## Scale

```hcc-interaction
version: 0.3-candidate.1
id: agent-scale
kind: number
prompt: How many meaningful questions or lenses should the artifact contain?
config: { min: 1, max: 16, step: 1 }
response: { value: null, note: null, state: unanswered, author: null, responded_at: null }
visibility: private
```

## Input kinds

```hcc-interaction
version: 0.3-candidate.1
id: agent-kinds
kind: multi_select
prompt: Which input semantics are likely to fit?
config:
  options:
    - { id: text, label: Short or long text }
    - { id: choice, label: Single or multiple choice }
    - { id: ranking, label: Ranked choice }
    - { id: matrix, label: Matrix }
    - { id: temporal, label: Date or time }
    - { id: numeric, label: "Number, range, or rating" }
response: { value: null, note: null, state: unanswered, author: null, responded_at: null }
visibility: private
```

## Constraints

```hcc-interaction
version: 0.3-candidate.1
id: agent-constraints
kind: long_text
prompt: Which sources, privacy rules, held effects, and review gate must the agent preserve?
config: { min_length: 8, max_length: 3000, rows: 7 }
response: { value: null, note: null, state: unanswered, author: null, responded_at: null }
visibility: private
```
