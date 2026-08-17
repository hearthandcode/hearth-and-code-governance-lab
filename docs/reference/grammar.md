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

### Per-kind configuration schema

Unknown config keys fail closed with `HCC-GRAMMAR-UNKNOWN-001`. The accepted keys per kind are:

| Kind | Accepted config keys |
|---|---|
| `short_text` | `placeholder`, `min_length`, `max_length` |
| `long_text` | `placeholder`, `min_length`, `max_length`, `rows` (max 32) |
| `radio_group` | `options`, `orientation` (`vertical` / `horizontal`) |
| `multi_select` | `options`, `min_selections`, `max_selections` |
| `ranked_choice` | `options` only. **No `min_selections` or `max_selections`**; the rendered list is always the full declared option set. |
| `dropdown` | `options`, `placeholder` |
| `matrix` | `rows`, `columns`, `selection` (`one` / `many`), `require_all_rows`. **Only `matrix` accepts `columns` and `selection`.** |
| `rating` | `min`, `max`, `step`, `min_label`, `max_label` |
| `scale` | `min`, `max`, `step`, `labels` |
| `percentage` | `min`, `max`, `step` |
| `currency` | `currency` (ISO 4217), `min`, `max`, `step` |
| `number` | `min`, `max`, `step`, `unit` |
| `boolean` | `true_label`, `false_label` |
| `date` | `min`, `max` (ISO YYYY-MM-DD) |
| `month` | `min`, `max` (ISO YYYY-MM) |
| `week` | `min`, `max` (ISO YYYY-Www) |
| `time` | `min`, `max` (HH:MM), `step_minutes` |
| `datetime` | `min`, `max` (YYYY-MM-DDTHH:MM) |
| `duration` | `min_minutes`, `max_minutes`, `step_minutes`, `display_unit` |
| `date_range` | `min`, `max` (ISO YYYY-MM-DD) |
| `time_range` | `min`, `max` (HH:MM), `step_minutes` |
| `email` | `placeholder`, `allow_multiple` |
| `url` | `placeholder`, `allowed_schemes` |
| `phone` | `placeholder`, `min_length`, `max_length` |
| `color` | `format` (`hex`) |
| `tags` | `suggestions`, `min_items`, `max_items`, `max_length` |
| `numeric_range` | `min`, `max`, `step`, `unit` |
| `unit_value` | `units`, `min`, `max`, `step` |
| `coordinates` | `precision` (max 8), `latitude_label`, `longitude_label` |
| `file_reference` | `extensions`, `allow_missing` |
| `repeatable_group` | `fields`, `min_items`, `max_items` |
| `key_value_list` | `key_label`, `value_label`, `min_items`, `max_items`, `max_length` |

`matrix.columns` and `matrix.selection` are matrix-only. A `long_text`, `short_text`, `multi_select`, `radio_group`, or other non-matrix block that carries `columns:` or `selection:` will be rejected. `multi_select` and `ranked_choice` look similar but differ: `multi_select` accepts `min_selections`/`max_selections`; `ranked_choice` does not.

### Label quoting

Option labels, prompts, and help text are YAML scalars. When a label or prompt uses quoted text to hold punctuation, trailing text after the closing quote is parsed as additional YAML, not as part of the string:

```yaml
# WRONG — `(quieter)` is parsed as a stray token, not part of the label
- id: evolving-practice
  label: "An evolving practice" (quieter)

# RIGHT — the parenthetical is inside the quoted string
- id: evolving-practice
  label: "An evolving practice (quieter)"
```

If a label needs a parenthetical, em-dash, or other punctuation, keep it inside the same quoted string.

### Mandatory `prompt:` on every interaction

Every `hcc-interaction` block MUST include `prompt:` with a non-empty value, regardless of kind. `file_reference`, `repeatable_group`, and other kinds are not exempt. A missing or empty `prompt:` is rejected with `HCC-GRAMMAR-SCHEMA-001 at $.prompt: A non-empty string is required.` Use `prompt: |\n  ...` for multi-line prompts; every continuation line must be indented uniformly.

### Block-scalar indentation

When a YAML block scalar (`key: |` or `key: >`) introduces multi-line content, every continuation line MUST be indented at least as much as the key's content. A continuation line at lower indent is parsed as a sibling key, which the YAML parser rejects as `a multiline key may not be an implicit key` (the plugin surfaces this as `HCC-WORKBOOK-PARSE` for `hcc-form` and `HCC-PARSE-001` for `hcc-interaction`).

```yaml
# WRONG — lines 2 and 3 have no indent; the parser rejects them.
purpose: |
  First content line is correctly indented.
This continuation line has no indent and breaks the parser.
  Fourth line is back to indent.

# RIGHT — every continuation line carries the same indent.
purpose: |
  First content line is correctly indented.
  This continuation line is also indented.
  Third line keeps the indent.
```

If you generate worksheets programmatically, indent every continuation line by the same amount as the first content line. The companion `hcc-worksheet-authoring` skill ships a `block_scalar(key, text, indent)` helper that does this automatically.

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
