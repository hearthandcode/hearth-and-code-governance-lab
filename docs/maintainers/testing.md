# Testing Strategy

The suite has four evidence layers:

1. **Pure contracts:** authoring API, parsers, validators, response state, models, catalogs, routing, capability policy, packet digests, and path rules run in Node.
2. **Synthetic DOM:** Happy DOM, a development-only dependency, exercises rendered structure, labels, focus, button alternatives, ranking order, multi-selection, and numeric keyboard behavior.
3. **Synthetic performance contracts:** 1,000 representative parses and the 50-block rendered fixture scale must each remain under a generous two-second local ceiling.
4. **Obsidian host review:** Reading View, Live Preview, lifecycle, themes, panes, accessibility technology, and real performance remain manual until a supported host harness is adopted.

Run all automated layers with `npm run proof`. Happy DOM is excluded from the production bundle and cannot prove browser layout, assistive-technology output, Obsidian API behavior, mobile support, or production-machine performance.

Pure writer tests cover source and packet digests, exact paths, closed versions, completion and privacy gates, collision failure, explicit reload, in-memory hydration, non-empty-session rejection, deterministic successor bytes, predecessor preservation, and multi-revision lineage. Controller tests exercise preview, confirmed create, reload into a fresh session, interaction refresh, amendment preview, revision-2 creation, predecessor preservation, changed-response rejection, and pending-plan clearing through an in-memory two-method port. Adapter-port tests additionally prove fixed-folder restriction, required confirmation, parent-folder creation, create-only collision behavior, exact read-back, and digest verification. They do not prove the real Obsidian host implementation; Evaluation 20 supplies that manual canary.

The local source audit proves that the plugin lifecycle reaches the writer only through its guarded production factory. It also rejects desktop-only runtime imports, raw `Vault.adapter` access, and global `app` access. These checks protect the declared `isDesktopOnly: false` posture but cannot replace testing on Obsidian Mobile.

The eight-check runtime-readiness command supplies direct host evidence for version and primitive availability without reading or scanning the vault. Unit tests cover desktop, Android, non-canary, and failure results; the generated-bundle smoke test invokes the real registered command and verifies its copied privacy boundary. A passing report remains API-presence evidence, not interaction or accessibility proof.

Lifecycle tests require plugin unload to clear pending packet previews, interaction refreshers, the global Ember Circuit session class, and open dashboard leaves. Dashboard metadata observation must use Obsidian's disposable event registry, and Reading-view interaction refreshers must be owned by `MarkdownRenderChild`. The generated-bundle smoke executes the four plugin-owned cleanup paths; it does not emulate every cleanup performed internally by Obsidian's `Plugin` base class.

The four-target compatibility matrix uses exact numeric version comparison and admits host evidence only when version and platform both match the current observation. Tests cover multi-digit semantic ordering, current and minimum desktop observations, Android isolation, incomplete runtime checks, malformed versions, and invalid counts. The bundle smoke test invokes the registered matrix command and requires one observed desktop pass plus three pending rows; it never converts pending rows into support claims.

Dashboard tests exercise all seven selectors, exact-field semantics, deterministic ordering, restricted-record exclusion, accessible table structure, empty states, and effect declarations. A source-level host-boundary test requires one active-body read and explicit link resolution while rejecting file enumeration, linked-body reads, and vault mutation APIs. The bundle smoke test verifies native view and command registration. Evaluation 22 remains the required real Obsidian pane, theme, refresh, and usefulness review.

Studio tests validate a representative digital-vault packet, four/eight/sixteen architecture, deterministic counts, inspect-only transitions, and sixteen distinct invalid contract/reference/authority cases. Synthetic DOM tests cover toggleable layers, captions and column scopes, disabled advancement, and exact normalized clipboard output. The cross-surface injection corpus includes the studio renderer. Evaluation 23 remains the real Obsidian source-editing, layout, theme, keyboard, and semantic-owner review.

`npm run audit:accessibility` applies the shared structural auditor to a power-of-two set of eight representative surfaces: matrix, ranking, repeatable group, radio group, long text, visualization, worksheet, and workbook. It checks duplicate IDs, accessible control/button names, SVG semantics, table captions, and disclosure summaries. The negative fixture must produce all six diagnostic classes.

`npm run audit:contrast` applies the WCAG relative-luminance formula to a closed power-of-two contract of sixteen opaque Ember Circuit pairs. Normal-text pairs require 4.5:1; focus and control-boundary pairs require 3:1. A historical regression fixture must fail the former link and strong-border colors. This does not inspect computed styles, transparency, gradients, every state, focus order, zoom, touch, or assistive-technology output and is not a conformance claim.

`npm run benchmark:synthetic` produces a four-workload receipt with four samples each: 1,024 candidate parses and batches of 1, 16, and 64 rendered ranked-choice widgets. It records every duration, median, maximum, median per unit, runtime, DOM implementation, and budget. The two-second budgets are regression ceilings, not product promises. Happy DOM cannot measure Obsidian layout, paint, Live Preview update cost, interaction latency, memory, mobile performance, or real assistive-technology overhead.

Before public beta, add coverage reporting, deeper host-API spies, current/minimum Obsidian smoke tests, assistive-technology receipts, and repeatable real-host performance measurements on declared hardware. Every future component release must add its contract tests before its host adapter or effect provider.

## Clean-room proof

Run `npm run proof:clean-room` to copy the current candidate into a generated temporary directory, excluding `.git`, `node_modules`, coverage, the disposable vault configuration, any `Intake` responses, logs, and editor/OS transients. It runs `npm ci --offline --ignore-scripts`, then the complete `npm run proof`, verifies the three release assets and manifest identity, and removes only that generated temporary directory.

The command cannot prove a Git commit or remote checkout because it intentionally uses the current working-tree bytes. Offline mode prohibits registry access; failure to satisfy the lockfile from the local npm cache fails the proof rather than falling back to the network.
