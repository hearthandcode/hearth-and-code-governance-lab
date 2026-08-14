# Plugin Identity and Compatibility

The accepted public name is **Hearth and Code Governance Lab** and the immutable public ID is `hearth-and-code-governance-lab`. The disposable test vault retains compatibility ID `hcc-widget-lab` under its historical display name.

Obsidian uses the manifest ID and containing plugin directory as durable installation identity. Changing the visible name does not require changing that ID. Changing the ID later would create a distinct installation and therefore requires a reviewed clean-install migration, duplicate-install check, rollback procedure, and explicit public-release decision.

Until that decision:

- keep `manifest.json` ID and the development plugin directory at `hcc-widget-lab`;
- use **Hearth and Code Governance Lab** and `hearth-and-code-governance-lab` in the root release manifest, package, and public documentation;
- generate the disposable manifest from `config/development-install.json`, never by copying it into a public release;
- never infer that an old and new plugin ID share settings, enablement state, or response data;
- do not rename a live installation in place as a migration strategy.

The public ID remains unresolved. A uniqueness check and clean-install receipt must use current external state immediately before release.

Run `npm run proof:identity-migration` to inspect the eight-scenario no-effect matrix. It proves deterministic classification only: the unchanged prototype is allowed, five same-ID public lifecycle scenarios remain candidates for host testing, and in-place rename plus side-by-side duplicate registration are blocked. It neither accepts the candidate ID nor changes a manifest or directory.
