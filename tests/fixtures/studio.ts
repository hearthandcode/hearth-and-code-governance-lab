export const VALID_STUDIO_SOURCE = `version: 0.1-candidate.1
id: digital-vault-pilot
title: Digital vault design pilot
purpose: Propose a governed record schema, review workflow, and dashboard projections.
context:
  charter_refs:
    - governance-operational-charter
  sources:
    - id: charter
      path: Governance/Operational Charter.md
      digest: sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
      authority: source
      sensitivity: private
  axes:
    - { id: provenance, label: Provenance, question: "What source and transformation lineage is required?" }
    - { id: authority, label: Authority, question: "Who can propose, review, and admit the record?" }
    - { id: lifecycle, label: Lifecycle, question: "Which states and transitions are valid?" }
    - { id: projection, label: Projection, question: "Which views improve orientation without becoming authority?" }
schema:
  id: governed-artifact
  version: 0.1.0
  semantic_owner: human-semantic-owner
  record_types:
    - id: artifact
      label: Governed artifact
      description: A source-bound record with explicit lifecycle and review state.
      fields:
        - { id: id, label: Stable ID, type: string, required: true }
        - { id: title, label: Title, type: string, required: true }
        - { id: status, label: Status, type: enum, required: true, vocabulary_ref: workflow-status }
        - { id: source_ref, label: Source reference, type: reference, required: true }
  vocabularies:
    - id: workflow-status
      source_ref: charter
      version: 0.1.0
      terms: [draft, review-ready, accepted, superseded]
  invariants:
    - id: stable-identity
      kind: required_fields
      field_refs: [artifact.id, artifact.title, artifact.source_ref]
      message: Identity, title, and source are required.
    - id: unique-identity
      kind: unique_field
      field_refs: [artifact.id]
      message: Artifact IDs must be unique.
  migration:
    from_version: 0.0.0
    to_version: 0.1.0
    compatibility: conditional
    mappings:
      - { from: legacy_artifact.name, to: artifact.title, action: manual }
    loss_report: []
    reversal: Retain the legacy candidate and discard the unadmitted transformed candidate.
workflow:
  id: governed-review
  version: 0.1.0
  states:
    - { id: draft, label: Draft, terminal: false }
    - { id: review-ready, label: Review ready, terminal: false }
    - { id: accepted, label: Accepted, terminal: true }
  actors:
    - { id: author-agent, label: Authoring agent, authority: agent }
    - { id: semantic-reviewer, label: Semantic reviewer, authority: human }
  guards:
    - id: required-identity
      kind: all_required
      field_refs: [artifact.id, artifact.title, artifact.source_ref]
    - id: source-fresh
      kind: source_digest_matches
      field_refs: []
      source_ref: charter
      digest: sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    - id: review-approved
      kind: human_gate_satisfied
      field_refs: []
      gate_ref: semantic-review
  effects:
    - { id: prepare-review, kind: prepare_candidate, target: review-packet, authority: proposal-only }
    - { id: prepare-receipt, kind: prepare_receipt, target: review-receipt, authority: proposal-only }
  recoveries:
    - { id: fail-closed, kind: fail_closed, description: Preserve the candidate and diagnostic without advancing state. }
  human_gates:
    - { id: semantic-review, label: Semantic owner accepts meaning and migration, required: true, authority: human }
  transitions:
    - id: request-review
      label: Request semantic review
      from: draft
      to: review-ready
      actor_ref: author-agent
      guard_refs: [required-identity, source-fresh]
      effect_refs: [prepare-review]
      recovery_ref: fail-closed
      human_gate_ref: semantic-review
      receipt: review-request-receipt
    - id: accept-candidate
      label: Accept candidate semantics
      from: review-ready
      to: accepted
      actor_ref: semantic-reviewer
      guard_refs: [review-approved]
      effect_refs: [prepare-receipt]
      recovery_ref: fail-closed
      human_gate_ref: semantic-review
      receipt: semantic-acceptance-receipt
projections:
  - { id: review-queue, title: Candidate review queue, selector: review_queue }
  - { id: program-status, title: Program status, selector: program_status }
governance:
  authority: proposal-only
  review_required: true
  verification_required: false
  admission: prohibited
`;
