# HCC Grammar Reference

The proposal-only `hcc-studio` and `hcc-exchange` fences are deliberately separate from the interaction grammar documented here. Their strict candidate contracts are defined in [Schema and Workflow Studio](schema-workflow-studio.md) and [Provider-Neutral Exchange](provider-neutral-exchange.md); neither can execute transitions, apply migrations, read sources, call providers, or persist records.

Status: prerelease candidate reference. Source code remains the machine-checkable implementation contract. This document does not admit vocabulary into any external canonical system.

## Contract table

| Fence | Version | Purpose | Parser entry point |
|---|---|---|---|
| `hcc-interaction` | `0.1` | released proof grammar: choose one, choose many, long text | `parseReleasedInteraction` |
| `hcc-interaction` | `0.3-candidate.1` | 32 candidate input kinds | `parseCandidateInteraction` |
| `hcc-form` | `0.1-candidate.1` | worksheet composition | `parseWorksheet` |
| `hcc-workbook` | `0.1-candidate.1` | explicit worksheet manifest | `parseWorkbook` |
| `hcc-view` | `0.2-candidate.1` | declarative static visualization | `parseView` |
| `hcc-computed-field` | `0.1-candidate.1` | isolated render-only computed extension | extension parser |
| `hcc-radar-view` | `0.1-candidate.1` | isolated render-only radar extension | extension parser |

## Candidate interaction

Every candidate interaction requires `version`, `id`, `kind`, `prompt`, `config`, and a complete `response`. Optional `help`, `visibility`, and `source_refs` must use their declared shapes. Unknown fields fail closed.

```yaml
version: 0.3-candidate.1
id: release-confidence
kind: rating
prompt: How confident are we in this release candidate?
help: Record a human judgment; this does not verify the release.
config:
  min: 1
  max: 5
  step: 1
  min_label: Low confidence
  max_label: High confidence
response:
  value: null
  note: null
  state: unanswered
  author: null
  responded_at: null
visibility: private
source_refs:
  - "[[Release Plan]]"
```

The candidate states are `unanswered`, `answered`, `deferred`, and `not_applicable`. A response value must match its kind. Do not invent an author, timestamp, digest, or acceptance state.

The exhaustive input-kind and configuration catalog is maintained in `src/grammar/types.ts`, `src/grammar/config-validation.ts`, and `src/grammar/catalog.ts`; the readable family projection is [catalog.md](catalog.md).

## Worksheet

A worksheet is an `hcc-form` block followed by the interaction blocks whose IDs it names. It does not search the vault for interactions.

```yaml
version: 0.1-candidate.1
id: release-review
title: Release review
purpose: Collect a bounded human disposition before release planning.
privacy: private
sections:
  - id: disposition
    title: Disposition
    interactions: [release-confidence]
completion:
  required: [release-confidence]
workbook_ref: Workbooks/Release Workbook
governance:
  authority_refs: ["[[Release Plan]]"]
  review_required: true
  verification_required: false
```

Valid privacy values are `private`, `restricted`, `internal`, and `public`. Section IDs and interaction IDs must be unique. Every required ID must be declared by a section.

## Workbook

A workbook is an exact manifest. It does not infer membership or crawl a folder.

```yaml
version: 0.1-candidate.1
id: release-workbook
title: Release workbook
purpose: Order the human release-review worksheets.
worksheets:
  - id: release_review
    label: Release review
    ref: Worksheets/Release Review
navigation: sequential
governance:
  authority_refs: ["[[Release Plan]]"]
  review_required: true
```

Navigation is `sequential` or `free`. Worksheet references are vault-relative Markdown locators without the `.md` suffix in current fixtures.

## View

An inline view carries rows and a provenance label. A vault-bound view carries one exact non-hidden YAML/JSON path and a full `sha256:` digest; it cannot embed data at the same time.

```yaml
version: 0.2-candidate.1
id: readiness-count
kind: metric
title: Ready items
summary: Count of items marked ready in the reviewed fixture.
source: { mode: inline, digest: fixture:readiness-count }
encoding: { kind: metric, value: value, label: label }
data:
  - { value: 8, label: Ready }
```

Every view requires an accessible title and summary. Encoded fields must exist in every row. Rendering retains a text/table fallback and never executes Markdown-supplied expressions.

## Response-packet boundary

The current worksheet runtime can prepare this proposal class:

```yaml
record_type: hcc-worksheet-response-packet
contract_version: 0.1-candidate.1
authority: immutable-intake-candidate-proposal
immutable: true
review: { human_gate: required }
downstream: { canonical_write_back: prohibited }
effects: { persistence: prohibited-step-8-held, submission: prohibited }
```

The exact packet includes worksheet identity, session timestamps, responses, completion diagnostics, and held downstream effects. It is not a canonical record. The future writer may create a new candidate file only after its own effect contract and per-write gate are released.

## Failure behavior

- YAML parse failures identify the source location when available.
- Unknown versions, kinds, fields, IDs, option references, and response shapes block only the dependent fence.
- Unknown view sources, traversal, hidden paths, URI schemes, stale digests, and mismatched encodings fail closed.
- Source YAML remains visible and editable.
- A successful parse proves shape compatibility only; it does not prove truth, authorship, review, verification, accessibility, privacy fitness, or release authority.
