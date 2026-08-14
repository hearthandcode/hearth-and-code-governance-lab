# Contributing

This repository contains the public source candidate for Hearth and Code Governance Lab. The plugin has not been released or admitted to the Obsidian Community directory. Bounded issues and pull requests may be proposed, but their submission does not promise acceptance, a response time, feature admission, support, or release.

Use the structured bug or feature form in `.github/ISSUE_TEMPLATE/` and the pull-request checklist. The templates require synthetic or redacted evidence, an explicit effect budget, and a statement of what automated proof does not establish. Their presence does not activate hosted automation or create a contribution, support, or release commitment.

## Before proposing a change

1. Identify the contract version and capability being changed.
2. Classify the change as grammar, taxonomy, schema, renderer, source adapter, or effect provider.
3. Preserve unknown-field rejection, accessible fallback, provenance, and held effects.
4. Add positive and negative deterministic tests.
5. Run `npm run proof`; for packaging or metadata changes, inspect the included `npm run check:release-candidate` receipt as well.

Extensions must provide a valid descriptor, remain human-review-required, and cannot self-verify. A renderer extension may not request persistence, frontmatter mutation, vault scanning, network, or publication through a render capability.

Consequential effects, contract releases, privacy changes, plugin-ID changes, dependency additions, and public claims require maintainer and human-governance review. Do not include private Hub sources, personal vault content, generated workspace state, credentials, or respondent data in a contribution.

The [public candidate roadmap](ROADMAP.md) is a projection of reviewed sequencing. A feature request does not admit a vocabulary term, change a contract, promise a date, or authorize an effect.
