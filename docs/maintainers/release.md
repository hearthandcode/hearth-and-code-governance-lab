# Release Procedure

No plugin release is currently authorized. Publishing or hosting the source repository does not authorize a GitHub release, hosted workflow, Obsidian Community submission, announcement, or support claim. The current candidate sequence is summarized in [`ROADMAP.md`](../../ROADMAP.md) and enforced locally by `config/release-admission.json`.

`config/release-admission.json` is the machine-readable eight-gate admission ledger. `npm run check:release-candidate` validates its closed shape, evidence locators, unresolved conditions, and state counts. Local build consistency and public release readiness are separate results: all eight required gates must explicitly read `pass` before the latter can become true.

Run `npm run proof:identity-migration` before each exact final-candidate lifecycle gate. Its eight scenarios prohibit in-place rename and simultaneous prototype/public installations while leaving clean install, same-ID upgrade, rollback, disable/re-enable, and uninstall as real-host evidence obligations. Worksheet 18 accepted `hearth-and-code-governance-lab` and **Hearth and Code Governance Lab**; later versions must preserve that immutable public ID and use a bounded same-ID upgrade rather than another rename.

After a production build, `npm run proof:install-layout` creates and removes a temporary candidate-ID directory containing exactly the three release assets. It verifies that the projected manifest changes only the ID and that `main.js` and `styles.css` are byte-identical to the built prototype assets. This does not satisfy the real-vault manual-install gate.

Component candidates follow the contract → proof → disposable-vault canary → human-admission sequence described in [`ROADMAP.md`](../../ROADMAP.md) and the [testing guide](testing.md). Accepting one component does not authorize another component's effects or a public release.

Run `npm run proof:interoperability` to verify the provider-neutral specification and eight public-safe fixture correspondences. This proof does not run an external system, compare implementations, release the private response port, or satisfy destination-owner and integration-owner gates.

1. Confirm the accepted public name and immutable plugin ID match `config/identity-migration.json`, `manifest.json`, and the installation directory; project only the reviewed minimal owner, maintainer, security, supported-platform, repository, support, and cadence facts. Private persona and organizational-status context stays excluded.
2. Verify the root MIT `LICENSE`, historical `LICENSE-DECISION.md`, and package metadata remain aligned.
3. Run `npm run proof:clean-room` for an offline current-working-tree proof and `npm run proof:public-source` for the allowlisted disclosure boundary. Review the exact public projection digest and exclusions. Once a reviewed Git source exists, also run `npm ci`, `npm run proof`, `npm run check:release-candidate`, and `npm audit --omit=dev` in a clean checkout.
4. Run DOM, accessibility, supported-Obsidian, theme, reload, and 1/10/50-block performance checks; preserve receipts.
5. Confirm the manifest/package versions match and add the version to `versions.json`.
6. Confirm release assets contain `main.js`, `manifest.json`, and optional `styles.css`, with no workspace state or source responses.
7. Review `ROADMAP.md`, the first-use/manual-install guide, issue forms, and pull-request template; replace held ownership and support fields only through a human decision.
8. After an explicit release authorization, create a GitHub release whose `x.y.z` tag exactly matches the manifest version, without a `v` prefix, and attach `main.js`, `manifest.json`, and optional `styles.css`. Only after a further Community-submission authorization, link the owning GitHub and Obsidian accounts, submit the repository URL through the Community directory portal, accept the current policies and support commitment, and address automated review through incremented releases.

Hosted CI activation is its own external-computation and artifact-egress gate. A workflow proposal should use read-only repository permissions, locked dependencies, Node 22, the full proof, production dependency audit, and short-lived candidate assets; it must not publish a release.

Recheck the official rules and manifest contract at release time: [Submit your plugin](https://docs.obsidian.md/Plugins/Releasing/Submit%20your%20plugin), [self-critique checklist](https://docs.obsidian.md/oo/plugin), and [Manifest](https://docs.obsidian.md/Reference/Manifest).
