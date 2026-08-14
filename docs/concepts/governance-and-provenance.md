# Governance and Provenance

The plugin distinguishes four things that ordinary form tools often collapse:

- **source:** the Markdown/YAML contract currently being interpreted;
- **projection:** a rendered aid derived from that source;
- **response candidate:** session-local human input prepared for review;
- **effect:** an operation such as read, copy, persist, mutate, network, or publish.

A projection is not authority. A completed response is not automatically reviewed, verified, or canonical. A source digest identifies bytes but does not attest authorship or truth.

The capability catalog states which effects each surface may request. The current plugin admits rendering, exact bounded reads, and explicit clipboard copying. It denies persistence, frontmatter mutation, vault scans, network access, and publication. Extensions inherit the effect ceiling of their base capability and remain human-review-required.

The Governance Workbench may prepare review, verification, lifecycle, sensitivity, authority, supersession, provenance, and knowledge-system projection proposals. It does not apply them. In a future source-to-surface workflow, any returned response must enter as immutable intake with source identity, timestamp, consent/handling state, and duplicate status before a human disposition changes a canonical record.
