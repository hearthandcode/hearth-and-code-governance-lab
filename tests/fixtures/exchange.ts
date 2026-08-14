export const VALID_EXCHANGE_SOURCE = `version: 0.1-candidate.1
id: digital-vault-design-exchange
title: Digital vault design exchange
purpose: Request one provider-neutral schema and workflow proposal from bounded charter data.
request:
  task: Propose an hcc-studio contract for a governed digital-vault artifact workflow.
  constraints:
    - Preserve source authority and explicit human gates.
    - Return raw YAML only under the requested output contract.
context:
  sources:
    - id: operational-charter
      path: Governance/Operational Charter.md
      digest: sha256:612f2978405bdf197b1714cdd8b3993cffa80b8eb29e043e97371a675dfcee0c
      authority: source
      sensitivity: internal
      disclosure: manual-copy-approved
      content: 'Operational charter: preserve source authority, fail unknown transitions closed, and return proposal-only designs.'
handling:
  disclosure: manual-copy-approved
  destination: user-selected
  provider: not-bound
  retention: unknown
output:
  kind: hcc-studio
  version: 0.1-candidate.1
  format: yaml-only
governance:
  authority: proposal-only
  human_review_required: true
  network: prohibited
  persistence: prohibited`;
