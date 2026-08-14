## Outcome

Describe the user-visible or contract-level change and why it belongs in this component.

## Contract and authority

- Component and contract version:
- Source or fixture paths:
- Capability/effect changes:
- Human gate, if any:
- Explicit non-goals:

## Verification

- [ ] Positive and negative deterministic tests added or updated.
- [ ] `npm run proof` passes.
- [ ] `npm run proof:clean-room` passes when packaging, dependency, metadata, or release behavior changed.
- [ ] Accessibility and semantic fallback were reviewed.
- [ ] Privacy, injection, path, stale-source, and failure-recovery boundaries were reviewed where applicable.
- [ ] Unknown fields, kinds, versions, references, transitions, and effects fail closed.
- [ ] Exact changed paths and generated release-asset digests are recorded.

## Safety and provenance

- [ ] No private Hub source, personal vault content, response packet, credential, workspace state, generated cache, or identifying path is included.
- [ ] No frontmatter mutation, overwrite, append, rename, delete, vault scan, network, provider, Hub/Exocore write, GitHub release, or publication effect was added without an explicit reviewed contract.
- [ ] AI-generated or transformed material is identified, and human-authored conclusions are not attributed to an agent.

## Human review

State what the automated proof does not establish and name the one bounded decision requested from the reviewer.
