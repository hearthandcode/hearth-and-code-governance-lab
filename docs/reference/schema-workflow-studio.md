# Schema and Workflow Studio Contract

Status: C5 candidate `0.1-candidate.1`, introduced in plugin candidate `0.0.25` and accepted through Worksheet 14. Acceptance does not authorize schema admission, migration application, workflow execution, or canonical write-back.

## Purpose and non-authority

An `hcc-studio` fence is a source-visible design packet for proposing a governed record schema and a fail-closed workflow. Markdown remains the editable source. The plugin validates the packet, normalizes it into a typed model, and renders toggleable semantic tables.

The studio can describe effects but cannot perform them. It cannot admit a schema or taxonomy, advance a workflow, satisfy a HumanGate, read a declared source, assert freshness, mutate a note, persist a candidate, contact a model provider, update a canonical library or external system, or publish.

## Top-level contract

The exact fields are:

1. `version`: `0.1-candidate.1`;
2. `id`: stable lowercase identifier;
3. `title`: human-readable title;
4. `purpose`: bounded design purpose;
5. `context`: charter references, source bindings, and axes;
6. `schema`: schema identity, records, vocabularies, invariants, and migration;
7. `workflow`: states, actors, guards, effects, recovery, HumanGates, and transitions;
8. `projections`: candidate bindings to the seven dashboard selectors; and
9. `governance`: the fixed proposal-only effect ceiling.

Unknown fields and versions fail closed. YAML uses the JSON-compatible schema; tags and object-construction forms are not admitted.

## Power-of-two limits

Limits are ceilings, not targets:

| Collection | Maximum |
|---|---:|
| Charter references, sources, context axes | 8 each |
| Record types | 8 |
| Fields per record | 16 |
| Vocabularies | 8 |
| Terms per vocabulary | 16 |
| Invariants | 16 |
| Workflow states, guards, effects, transitions | 16 each |
| Actors, recoveries, HumanGates, projections | 8 each |

The renderer also exposes the fixed program architecture of four dimensions, eight feature families, and sixteen review contracts. A design should still use only the entries it needs.

## Context

`context.charter_refs` are display-only references. Each `context.sources` entry requires a unique ID, non-hidden vault-relative path, lowercase `sha256:` digest, bounded authority, and sensitivity.

The studio does not resolve or read these paths. A source-digest guard must repeat the digest already declared for its source; it cannot silently substitute another value.

Axes require `id`, `label`, and a question. They describe the subject under review without becoming taxonomy terms automatically.

## Schema

The schema requires an ID, version, human-readable semantic owner, one to eight record types, zero to eight vocabulary bindings, one to sixteen invariants, and one migration declaration.

Field types are `string`, `number`, `boolean`, `date`, `enum`, `reference`, `object`, and `array`. Every field has an ID, label, type, and explicit `required` boolean. Enum fields must reference a declared vocabulary. Vocabulary bindings identify one declared context source, pin a version, and contain one to sixteen stable term IDs.

Invariant kinds are `required_fields`, `unique_field`, `allowed_values`, `reference_exists`, and `chronological_order`. Each invariant names exact `record.field` references and a failure message. The current candidate validates the reference graph but does not evaluate record instances.

## Migration

A migration requires different source and target versions. The target must equal the candidate schema version. Compatibility is `compatible`, `conditional`, or `breaking`.

Mapping actions are:

- `rename`: map an old field to one current field;
- `copy`: retain source meaning while populating one current field;
- `drop`: use `to: null`, declare `breaking`, and provide at least one loss-report entry; or
- `manual`: require a reviewed human transformation into one current field.

Every migration includes a reversal description. The studio never rewrites legacy material or runs a migration.

## Workflow

A workflow declares two to sixteen states and must include a terminal state. Terminal states cannot have outgoing transitions. Actors are `human`, `agent`, or `system`; actor classification does not confer capability.

The four declarative guard kinds are:

| Guard | Required fields | Meaning |
|---|---|---|
| `all_required` | one or more schema field references | every referenced value must exist in a future evaluator |
| `value_equals` | exactly one field and one JSON scalar | a future evaluator compares the declared value |
| `human_gate_satisfied` | one declared HumanGate | a human-owned gate would need a separate attestation |
| `source_digest_matches` | one source ID and its exact declared digest | a future adapter would need to re-read and compare the source |

Guard kinds reject fields belonging to another kind. No arbitrary expression, JavaScript, template, command, or executable predicate is accepted.

Effects are limited to `prepare_candidate`, `prepare_receipt`, `copy_projection`, and `request_human_review`. Every effect must declare `authority: proposal-only`; these labels remain inert data.

Recovery kinds are `fail_closed`, `retry_manual`, `create_successor`, and `revert_candidate`. HumanGates must declare `required: true` and `authority: human`.

Every transition requires valid from/to states, actor, one or more guards, zero or more proposal-only effects, recovery, HumanGate, and receipt ID. `inspectStudioTransition` can report a valid reference graph, but its result always says `advancement: prohibited`. An unknown transition returns a diagnostic with the same prohibition.

## Dashboard specifications

Projection entries can name only the seven C4 selectors: `program_status`, `active_lanes`, `pending_seals`, `review_queue`, `programs`, `threads`, and `handoffs`. They specify a future relationship; the studio does not open or populate the dashboard.

## Fixed governance block

```yaml
governance:
  authority: proposal-only
  review_required: true
  verification_required: false
  admission: prohibited
```

Changing any value is a validation failure, not a capability request.

## Authoring and validation

Begin with the documented grammar in this reference, then replace synthetic identities and values from direct sources. The minimal public vault omits the private development studio fixture. Validate with:

```ts
const result = HCC_AUTHORING_API.parseStudio(sourceYaml);
```

The renderer provides **Copy normalized design YAML** only when the host injects a clipboard function. The copied bytes are still a proposal and are not written to the vault.

## Compatibility and future work

When validation fails, the Studio keeps the original YAML selectable and exposes **Copy diagnostic report**. That deterministic JSON report contains the exact source, ordered field-addressed diagnostics, `diagnostic-only` authority, and explicit prohibitions on mutation, schema admission, workflow advancement, and network access. Clipboard failure leaves both the visible diagnostics and original source intact.

This candidate does not evaluate record instances, apply migrations, bind actual destination routing, or persist studio packets. The separately versioned [C6 provider-neutral exchange](provider-neutral-exchange.md) supplies digest-bound copy/export and in-memory paste/import around this deterministic validator. Direct providers, destination adapters, and effect execution remain separately gated.
