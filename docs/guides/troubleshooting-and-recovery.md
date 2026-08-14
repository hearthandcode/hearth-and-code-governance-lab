# Troubleshooting and Recovery

Status: prerelease recovery guide for the disposable evaluation vault. Preserve evidence before changing source, rebuilding, or discarding in-memory answers.

## Eight diagnostic routes

| Symptom | First direct check | Bounded recovery |
|---|---|---|
| Plugin fails to load | Obsidian developer-console error and built `manifest.json` | run `npm run check`, `npm run build`, and bundle smoke; reload only after preserving the error |
| Plugin list shows **HCC Widget Lab** | active vault's `.obsidian/plugins/hcc-widget-lab/manifest.json` | confirm its display name, then use **Reload app without saving** or restart; keep compatibility ID unchanged |
| YAML source appears instead of a widget | fence language, version, parse diagnostic, and cursor position | correct the visible diagnostic or move the Live Preview cursor outside the fence; never hide invalid source |
| A packet field looks non-editable | presence of the editable-starter-values note and current bundle | reload the rebuilt plugin; select the actual starter value with `Ctrl+A`, then clear or replace it |
| Reload locator is rejected | exact two keys, fixed folder, filename characters, lowercase digest | copy the locator from the create receipt; do not browse or infer a replacement path |
| Packet creation or amendment is stale | source, responses, reason, and preview receipt | preview again, review changed bytes, then reconfirm; never overwrite the earlier file |
| Dashboard is empty or excludes a row | selected root, admitted fields, explicit relationships, and sensitivity | preserve an honest empty state; fix only source-owned metadata and never add data for appearance |
| Studio source is schema-invalid | first field-addressed diagnostic and exact source copy | correct one contract defect at a time; use the diagnostic report and never bypass admission or HumanGates |

## Evidence bundle

Before requesting help, preserve:

1. plugin version and built manifest identity;
2. Obsidian version, platform, and presentation mode;
3. exact command or fence language;
4. visible diagnostic or developer-console error;
5. minimal synthetic source with private content removed;
6. whether Reading view, Live Preview, or a native pane was involved;
7. relevant packet path and digest without packet contents; and
8. whether any file, clipboard, or other effect actually occurred.

Do not attach response packets, personal vault notes, secrets, provider tokens, Obsidian workspace state, or private canonical material to a public issue.

## Recovery invariants

- Markdown/YAML remains the recovery source when rendering fails.
- Reloading or disabling clears unsaved session responses and pending previews.
- Explicitly created packets remain ordinary immutable vault files; uninstall does not imply their deletion.
- The plugin has no overwrite, delete, frontmatter mutation, vault scan, network, or canonical repair path.
- A clean rebuild proves bundle consistency, not real-host compatibility or preservation of unsaved answers.

Run `npm run proof` for local source/build verification, `npm run proof:clean-room` for offline reconstruction, and `npm run proof:public-source` for the temporary disclosure-boundary projection. These commands do not replace the matching human host gate.
