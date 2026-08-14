# Lesson 2: Install and verify

## Goal

Distinguish the source candidate, disposable compatibility installation, and public plugin identity before reviewing behavior.

## Identity table

| Context | Directory and manifest ID | Display name |
|---|---|---|
| Public candidate | `hearth-and-code-governance-lab` | Hearth and Code Governance Lab |
| Disposable development vault | `hcc-widget-lab` | Hearth & Code Governed Widgets |

Never rename one installed directory in place to simulate the other identity. Never enable both identities in one vault.

## Source-checkout verification

1. Confirm root `manifest.json` names the public ID and expected version.
2. Run `npm ci` only in a source checkout, never in a vault.
3. Run `npm run proof`.
4. Run `npm run proof:install-layout` to verify a temporary three-file package.
5. Inspect the reported `main.js`, `manifest.json`, and `styles.css` hashes.
6. Treat this as packaging evidence, not an installation.

## Installed-vault verification

1. Inspect only `.obsidian/plugins/hearth-and-code-governance-lab/manifest.json` for a public installation or the exact compatibility path for the disposable vault.
2. In Obsidian, open Settings, Community plugins.
3. Confirm the expected name, version, and enabled state.
4. Reload or restart Obsidian if its metadata cache shows an old name.
5. Run **Hearth and Code Governance Lab: Run and copy combined host assurance packet**.
6. Confirm eight runtime checks pass and the report contains no vault name or note content.
7. Copy the report only if its disclosed version and coarse platform are acceptable.
8. Record any load error before rebuilding or replacing assets.

## Stop conditions

Stop on duplicate identities, an unexpected directory ID, asset drift, an unsupported host, or any instruction to mutate another vault. Installation and asset replacement require their own exact authorization.

## Screenshot slot

Future real image `01-plugin-identity` must show only the Community Plugins entry, public name, candidate version, and enabled state.
