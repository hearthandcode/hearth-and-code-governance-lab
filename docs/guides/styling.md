# Styling Governed Widgets

The plugin works with Obsidian's default theme and exposes stable `--hcc-*` custom properties on every widget, view, workbook, and extension. A vault theme or CSS snippet can override these properties without changing HCC grammar or governance meaning.

## Ember Circuit default and Obsidian-native opt-out

Add this frontmatter to a note:

```yaml
cssclasses:
  - hcc-theme-ember-circuit
```

Ember Circuit is the initial default for all plugin surfaces. Open **Settings → Hearth and Code Governance Lab** to persist Ember Circuit or Obsidian-native as the default for this vault. The command **Toggle Ember Circuit / Obsidian-native presentation for this session** changes only the current session; the next plugin load returns to the stored default. The note-level `hcc-theme-ember-circuit` class remains a durable, source-visible hook, and the earlier `hcc-ember-circuit` class remains a compatibility alias.

## Bounded settings surface

The settings tab persists thirteen presentation preferences in plugin-owned `data.json`, and only after an explicit change. Changes apply immediately to every tracked open HCC rendering; a plugin reload is not required:

| Preference | Values | Effect |
|---|---|---|
| Default presentation | Ember Circuit / Obsidian native | chooses the starting presentation after load |
| Explanatory detail | Compact / Explanatory | closes or opens non-sensitive companion and contract disclosures on render |
| Interaction density | Comfortable / Compact | changes spacing without shrinking control hit areas or focus indicators |
| Routine notices | Standard / Quiet | quiet suppresses success notices but never failures, blocked effects, or governance warnings |
| Worksheet navigator | Hidden / Collapsed / Compact / Expanded | controls the worksheet overview and its initial disclosure state |
| Question-list scope | None / Current section / Incomplete / All | filters navigator rows only; it never discards questions or answers |
| Focus control | Hidden / Icon / Compact button / Full button | changes each navigator focus action while preserving command-palette navigation |
| Question presentation | All questions inline / One question at a time | keeps every question inline or surfaces one real question card with Previous and Next controls |
| Progress summary | Hidden / Count / Compact / Detailed | controls the visible completion summary without changing completion rules |
| Primary actions | Inline / Compact / Sticky | changes the review and final-packet toolbar presentation |
| Secondary actions | Inline / Disclosure | shows supporting actions directly or inside a labeled disclosure |
| Completed questions | Unchanged / Dimmed / Collapsed | changes completed navigator-row emphasis while preserving a focus route |

Four named profiles provide coherent starting combinations: Focused intake, Guided worksheet, Analysis workbench, and Audit and governance. A manual field change produces a Custom profile. Focused intake uses the one-question presentation; the other profiles keep all questions inline.

### Central gallery evaluation

In the synthetic demonstration vault, open `Evaluation/29 Presentation Settings Gallery.md`. It contains one real worksheet, four interaction kinds, completed and incomplete rows, two sections, packet-preview controls, disclosures, and a bar projection. Use its eight-step route to compare every setting from a stable surface.

The immediate-update contract is:

1. Keep the gallery open in Reading view or Live Preview.
2. Change one preference in Settings.
3. Close Settings and inspect the already-open gallery without reloading the plugin.
4. Confirm the described surface changed and unrelated response values did not.
5. Exercise keyboard focus and Previous/Next when one-question mode is active.
6. Prepare a packet preview, change presentation, and confirm the preview survives.
7. Disable and re-enable only after the immediate-change checks, to verify persistence separately.
8. Record `not tested` rather than inferring behavior that was not directly observed.

The same panel shows four read-only status rows: identity and writer-host profile, response boundary, contract/catalog state, and runtime compatibility. It deliberately offers no path, overwrite, delete, validation-bypass, provider, credential, network, canonical-write, release, or publication control. Missing, partial, future-version, malformed, and unknown settings migrate to admitted safe defaults; they never create capabilities.

The projection applies to interactions, candidate inputs, worksheets, workbook manifests, visualizations, computed fields, radar views, and the governance workbench. It covers outer and nested surfaces: controls, disclosures, review panels, tables, status messages, toolbars, SVG regions, and accessible fallbacks.

The class applies warm Hearth foundations plus fixed Ember Circuit signal meanings. The public CSS variables in `styles.css` are the implementation source for this projection. Private brand-development sources and historical product experiments are intentionally not published or read by the plugin at runtime. A later token change requires an explicit comparison, accessibility proof, and reviewed update.

The inspected palette remains visible through `--hcc-link-source: #5e7e78` and `--hcc-border-strong-source: #5c4332`. Those provenance tokens are not used as foreground or control-boundary colors because they produced 4.00:1 link contrast and less than 2:1 control contrast on the declared dark surfaces. The operational projection uses `--hcc-link: #6f968f` at 5.44:1 on the base surface and `--hcc-border-strong: #8f6b52` at 3.59:1 on the inset surface and 3.23:1 on the raised surface. `npm run audit:contrast` enforces sixteen required text, status, focus, and boundary pairs. These ratios cover declared opaque tokens only; they are bounded evidence, not a WCAG conformance claim.

Default semantics are ember for attention/control, cyan for loading/agent state, violet for evidence/knowledge, green for governance success, amber for warning/workflow, rose for errors, and ash for stale or disabled state. Color never replaces text, labels, state attributes, or table fallback.

## Supported customization variables

| Variable | Purpose |
|---|---|
| `--hcc-surface` / `--hcc-surface-raised` | widget and inset surfaces |
| `--hcc-surface-inset` / `--hcc-surface-message` | fields, source panes, and status surfaces |
| `--hcc-border` | rules and structural boundaries |
| `--hcc-border-strong` | emphasized structural boundaries |
| `--hcc-accent` / `--hcc-accent-bright` | primary action, hover, and attention accents |
| `--hcc-link` | restrained cool link and disclosure accent |
| `--hcc-text` / `--hcc-text-muted` | primary and secondary text |
| `--hcc-focus` | keyboard focus ring |
| `--hcc-danger` / `--hcc-warning` / `--hcc-success` | labeled status surfaces |
| `--hcc-signal-cyan` / `violet` / `green` / `ember` / `amber` / `rose` | declared computational states and visualization series |
| `--hcc-radius` / `--hcc-space` | component geometry |
| `--hcc-font-display` / `body` / `mono` | heading, interface, and code stacks |

Keep overrides on a note, vault class, or theme selector. Do not encode review, authority, privacy, or verification only through CSS. Forced-colors and reduced-motion fallbacks remain active.
