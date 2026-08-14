# First Use and Manual Installation

Status: local candidate guidance for the disposable `scratch-vault`. It is not a public release or support commitment.

## Build the candidate

Requirements: Node.js 22 and npm with dependencies available through the lockfile.

```bash
npm ci
npm run proof
```

The production build places exactly these ignored assets in `scratch-vault/.obsidian/plugins/hcc-widget-lab/`:

- `main.js`
- `manifest.json`
- `styles.css`

The disposable directory remains `hcc-widget-lab`, with the compatibility display name **Hearth & Code Governed Widgets**. This keeps the existing test vault loadable. A clean public-candidate installation instead uses directory and manifest ID `hearth-and-code-governance-lab` and display name **Hearth and Code Governance Lab**.

## Open the disposable vault

1. Open the repository's `scratch-vault` directory as an Obsidian vault.
2. In the disposable vault, enable **Hearth & Code Governed Widgets**. In a later clean public-candidate vault, enable **Hearth and Code Governance Lab**.
3. If Obsidian still shows **HCC Widget Lab**, use **Reload app without saving** or restart Obsidian.
4. Confirm `.obsidian/plugins/hcc-widget-lab/manifest.json` matches the root manifest version, uses ID `hcc-widget-lab`, and retains the compatibility display name. Do not use this compatibility manifest as the public release manifest.
5. Begin with `00 Start Here.md` and follow the eight-stage guided tour.

Do not install this candidate into a valuable primary vault. The prototype identity remains host-guarded to `scratch-vault`. The public identity may use the current named local vault, but its provider remains restricted to explicit reads and confirmed create-only immutable packets directly under `Intake/HCC Responses/`.

## Guided public route

The public vault contains one start page, eight short tour notes, one four-worksheet workbook, and four worksheets. It teaches orientation, configuration, agent-assisted authoring, validation, response capture, immutable amendments, projections, and separately governed integration. Historical development gates and product-specific migration material remain in the private development source and are not part of the public learning surface.

Use [`AI-Assisted Governed Workflow`](ai-assisted-governed-workflow.md) for the end-to-end operating procedure and [`Project Setup and Integration`](project-setup-and-integration.md) before connecting a valuable project vault or external knowledge system.

## First source-visible block

Create a test note in the disposable vault:

````markdown
```hcc-interaction
version: 0.3-candidate.1
id: first-question
kind: short_text
prompt: What should this candidate help you decide?
config:
  min_length: 1
  max_length: 256
response: { value: null, note: null, state: unanswered, author: null, responded_at: null }
visibility: private
```
````

Use Reading view, or move the Live Preview cursor outside the fence. The YAML remains the editable source; the widget is a projection.

## Manual installation proof for a later release

Before any real installation, `npm run proof:install-layout` creates a temporary folder named for the candidate public ID, projects exactly `main.js`, `manifest.json`, and `styles.css`, verifies eight identity and byte-integrity conditions, and removes the folder. This is packaging evidence only. It neither accepts the public ID nor installs into a vault.

After a release is explicitly authorized, test a clean vault by creating `.obsidian/plugins/<accepted-public-id>/`, copying the three release assets into it, restarting Obsidian, and enabling the plugin. Record:

- plugin and Obsidian versions;
- operating system and desktop/mobile mode;
- exact asset digests;
- clean-install, disable/re-enable, restart, upgrade, rollback, and uninstall outcomes;
- Reading view, Live Preview, Ember Circuit, native-theme, keyboard, zoom, and narrow-pane observations;
- any created response packet path and read-back digest, without publishing its content.

The public identity migration is accepted, but that does not authorize installation into an arbitrary vault. Use only a separately named disposable or explicitly authorized vault. Never copy `scratch-vault/Intake/`, `.obsidian/workspace*`, private notes, or local response packets into release assets.

## Recovery

- Reloading clears unsaved in-memory answers.
- Explicitly created response packets remain under `Intake/HCC Responses/`; the plugin has no deletion path.
- A stale preview must be regenerated before creation.
- Reload requires one exact packet path and SHA-256 digest and never searches the vault.
- The copied two-line reload locator can be pasted into **Reload locator block** and applied to the two explicit fields; unknown keys, paths outside the fixed Intake folder, malformed digests, and oversized blocks fail before any vault read.
- If the plugin fails to load, preserve the Obsidian developer-console error, plugin version, and active vault path before rebuilding.
- Plugin presentation preferences live in plugin-owned `data.json`. Loading the plugin must not create that file; changing one displayed preference may create or replace only that settings record through Obsidian's settings API.
- Removing the three plugin assets may leave plugin-owned settings data until Obsidian or the human explicitly removes it. Response packets are separate vault content and are never removed by plugin uninstall.
