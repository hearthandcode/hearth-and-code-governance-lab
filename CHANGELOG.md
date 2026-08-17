# Changelog

## Unreleased

## 0.0.35 - 2026-08-17

Reconciled and integrated release: the 0.0.34 candidate work (per-workspace `target_folder_override`, grammar reference docs, ranked_choice authoring clarification, GW-R10 + GW-R11 grammar subsections, regression tests) plus the 0.0.33 release-prep work that had been staged on `agent/hosted-assurance-0.0.33` (release-admission ledger updates, public-source policy update, read-only hosted-assurance workflow, release-procedure doc updates) are folded into one authoritative release on `release/0.0.35`. No behavior changes from 0.0.34; the additions document and lock in rules the parser already enforced and close the remaining release-admission gates.

- **Per-workspace `target_folder_override`** (carried from 0.0.34): admits any project-home-relative response-packet folder satisfying the existing safePath shape rule; preserved the legacy literal `Intake/HCC Responses/` as `RESPONSE_PACKET_DEFAULT_FOLDER` and as a deprecated alias for one release. Threaded the configured folder through the response-packet adapter constructor, exposed `resolveResponsePacketFolder(worksheetFolder)` plus a `ResponsePacketFolderConfig` source descriptor, and updated the worksheet packet locator to honor `configuredFolder`. The capability descriptor in the plugin capability catalog reports "configured response-packet folder" instead of the historical literal; every prohibited-effect declaration and the exact two-profile host-policy boundary is preserved. The `operate-hcc-responses` SKILL doc was refreshed to describe the worksheet-level override and the adapter-level folder option alongside the legacy default path; exact-path, digest-verified-readback, no-overwrite/no-rename/no-append/no-delete write policy holds under either folder.
- **Grammar reference documentation** (carried from 0.0.34): added the per-kind configuration schema table (one row per input kind with the accepted config keys) and the Label quoting subsection showing the WRONG/RIGHT pattern for inline option labels with embedded commas (`{ id: foo, label: 'Foo, bar' }`).
- **`ranked_choice` authoring clarification** (carried from 0.0.34): the authoring guide now states explicitly that `ranked_choice` accepts only `options` under `config`; `min_selections` / `max_selections` belong to `multi_select` and are rejected on `ranked_choice` blocks with `HCC-GRAMMAR-UNKNOWN-001`.
- **GW-R10 — Mandatory `prompt:` on every interaction**: a new `docs/reference/grammar.md` subsection documents that every `hcc-interaction` block (including `file_reference`, `repeatable_group`, and other kinds) must declare `prompt:` with a non-empty value. Missing or empty `prompt:` is rejected with `HCC-GRAMMAR-SCHEMA-001 at $.prompt`.
- **GW-R11 — Block-scalar indentation**: a new `docs/reference/grammar.md` subsection documents that every continuation line of a YAML block scalar (`key: |`) must carry the same indent as the first content line. Un-indented continuations parse as sibling keys and the parser rejects them as `a multiline key may not be an implicit key` (the plugin surfaces this as `HCC-WORKBOOK-PARSE` for `hcc-form` and `HCC-PARSE-001` for `hcc-interaction`); a `block_scalar(key, text, indent)` helper in the companion `hcc-worksheet-authoring` skill indents every line uniformly.
- **Regression tests** in a new `grammar rule regression — Ember Circuit 0.0.34 intake` describe block in `tests/grammar-expansion.test.ts`: seven negative-case assertions that lock in the rejection behavior for the Ember Circuit bug classes (ranked_choice with min/max_selections, long_text with columns, matrix column missing label, file_reference empty extensions, file_reference missing prompt, multi_select max exceeding option count, repeatable_group field missing kind). The total test count rises from 315 to 322.
- **Read-only hosted-assurance workflow** (`github/workflows/public-source-assurance.yml`, carried from the 0.0.33 release prep): pinned actions, locked dependencies, the full proof, public-boundary proof, and production dependency audit; `contents: read` permission only. The negative-assurance test (`tests/release-admission.test.ts`) explicitly asserts the workflow does not contain `contents: write`, `actions/upload-artifact`, `secrets.`, `deployment`, or `release create` patterns.
- **Release admission ledger** (`config/release-admission.json`): five gates advanced from `pending` to `pass` (identity-migration, host-assurance, manual-install, plus the existing pass gates; external-release remains `held` separately). `hosted-assurance` remains `held` until the new workflow has been observed passing on a real repository. Eight-gate ledger shape unchanged.
- **Public source policy** (`config/public-source-policy.json`): removed `.github/workflows` from `excludePaths` so the workflow can live in the public repo; every other boundary (scratch-vault, Intake/, response-packet paths, sensitive Hub content) is preserved.
- **Release procedure documentation** (`docs/maintainers/release.md`): updated Route A narrative and reproduce recipe to record the 0.0.33-source reproduction (47 test files, 308 tests, 265-file public projection at digest `7a5437a3e561edcc811b7eddc7cf731a7e7dc79eeeff2d0aaf02579a01460733`, three matching package assets, zero production dependency vulnerabilities). Hosted CI paragraph updated to describe the new workflow.
- **Version bumped** to `0.0.35` across `package.json`, `manifest.json`, and `versions.json`; Obsidian minimum version remains `1.13.4` (same as 0.0.33 and 0.0.34).

No behavior changes from 0.0.34. Verified locally: `npm run check` clean; `npm run test` 47 files, 322 tests, all PASS; `npm run proof` exit 0.

## 0.0.34 - 2026-08-16

- Added an explicit per-workspace `target_folder_override` that admits any project-home-relative response-packet folder satisfying the existing safePath shape rule; preserved the legacy literal `Intake/HCC Responses/` as `RESPONSE_PACKET_DEFAULT_FOLDER` and as a deprecated alias for one release.
- Replaced the historical `safeIntakeFolder` writer policy validator with `safeTargetFolder`, which delegates to the same shape validator used for every other vault-relative path; the prior Intake-prefix restriction is removed without weakening traversal, scheme, hidden-segment, or platform-reserved-device rejection.
- Threaded the configured folder through the response-packet adapter constructor via a new optional `folder` parameter and exposed `resolveResponsePacketFolder(worksheetFolder)` plus a `ResponsePacketFolderConfig` source descriptor so the runtime capability catalog reports the active folder; the legacy single-literal folder remains the default for backward compatibility.
- Added an opt-in `configuredFolder` parameter to the worksheet packet locator and updated the locator-path error message to name the configured folder instead of a hard-coded prefix, so reload locators can resolve to per-workspace response folders when the worksheet and adapter agree on the override.
- Updated the capability descriptor in the plugin capability catalog to report "configured response-packet folder" instead of the historical literal, preserving every prohibited-effect declaration and the exact two-profile host-policy boundary.
- Refreshed the SKILL documentation for the `operate-hcc-responses` skill so the human-facing operation guide describes the worksheet-level override and the adapter-level folder option alongside the legacy default path; preserved the exact-path, digest-verified-readback, no-overwrite/no-rename/no-append/no-delete write policy under either folder.
- Confirmed the local-folder change on a per-workspace emulator by passing and reading packets at the configured folder, rejecting traversal-shaped configured folders with a fresh `HCC-VAULT-CFG` diagnostic, and verifying that the legacy Intake/HCC Responses prefix continues to validate when no override is configured.
- Bumped the public plugin version to 0.0.34 across `package.json` and `manifest.json`; retained the GitHub release-packaging hold and the Community submission hold from the preceding release flow until Scott completes the integration-owner steps.

## 0.0.32 - 2026-08-14

- Made explicit presentation-setting changes apply immediately to exact plugin-owned rendered containers and made compact density visibly tighten card spacing while preserving control size and focus treatment.
- Added an accessible one-question-at-a-time worksheet presentation with current-question status, Previous and Next controls, keyboard focus transfer, all-questions restoration, and retained responses, packet previews, predecessor lineage, and source binding.
- Added a centralized synthetic presentation-settings gallery and an eight-step host-evaluation route that distinguishes navigator-row scope from actual question-card presentation while preserving every governance and prohibited-effect boundary.

## 0.0.31 - 2026-08-14

- Upgraded the vault-local settings record to version 2 with deterministic version-1 migration, four presentation profiles, and eight worksheet navigation/action preferences. Worksheets now default to a collapsed incomplete-question navigator with accessible compact focus controls, preserve progress outside the navigator, follow ordinary keyboard focus for current-section filtering, and retain in-memory answers, packet previews, predecessor state, and source bindings across presentation changes.
- Kept modal, isolated-panel, and overflow-menu interactions held until their complete focus and keyboard contracts are proved; preserved all response, digest, privacy, governance, network, external-system, Git, release, and publication boundaries.

## 0.0.30 - 2026-08-13

- Added a bounded Obsidian settings tab with four versioned, vault-local presentation preferences and four read-only governance status rows. Missing or malformed settings use safe defaults, plugin load does not create `data.json`, explicit changes persist through Obsidian's plugin settings API, quiet mode never suppresses failures, and no setting can alter response paths, writer policy, validation, privacy, HumanGates, providers, network, canonical write-back, release, or publication.
- Expanded the agent entry surface to an exact 256-line `llms.txt`, four validated task-specific skills, and an eight-lesson tutorial route. The new material distinguishes source-repository operation from installed-vault operation, preserves explicit-path and no-scan boundaries, and stages eight privacy-safe real-Obsidian screenshot targets for the separately authorized lifecycle canary.
- Raised the `0.0.29` candidate minimum from unobserved Obsidian `1.12.0` to the exact `1.13.4` desktop host that passed the clean public-identity canary, while preserving every historical compatibility mapping and leaving runtime, grammar, styling, API, and writer behavior unchanged.
- Replaced the release-blocking literal `scratch-vault` writer guard with an explicit two-profile host policy: the `hcc-widget-lab` prototype remains confined to `scratch-vault`, the accepted `hearth-and-code-governance-lab` identity may use the same bounded adapter in its named current vault, and every unknown identity fails closed. The public profile retains exact-path reads, create-only immutable packets, collision refusal, preview freshness, per-write confirmation, digest/read-back verification, and no scan, overwrite, append, rename, delete, frontmatter, Hub, network, or publication effect.
- Added a private exact-digest disclosure gate and Worksheet 16 so the human review of every public-projection category can return through the already proven immutable response-packet workflow. The gate, worksheet, and private evidence test are explicitly excluded from the public allowlist and cannot authorize Git or external effects.
- Expanded the public procedural documentation from four to exactly eight guides by adding immutable response-packet, native-dashboard, schema/workflow-studio, and troubleshooting/recovery routes. README and the sixty-four-line `llms.txt` now route the complete set, with a contract test preventing drift or effect-boundary overstatement.
- Added a deterministic eight-category public-source disclosure packet with a complete path, byte-count, and SHA-256 manifest; the local audit now requires this private review artifact while the public projection excludes it. Recorded the passing Worksheet 11 C3 disposition by removing that stale release-admission blocker without changing any external gate.
- Fixed the C3 reload parser so mixed-case ASCII filenames emitted by the create-only writer round-trip through **Apply reload locator**. Packet text fields now isolate ordinary editing, selection, cut/copy/paste, navigation, Backspace, and Delete from the underlying Live Preview editor while preserving Escape-to-source behavior. Misleading non-selectable placeholders are now explicitly labeled editable starter values.
- Added a selectable, keyboard-scrollable evidence viewer with a compact whole-report copy control for the authoring API self-test, runtime-readiness, compatibility-matrix, and combined host-assurance commands. Compatibility clipboard copies remain available, and report rendering adds no vault, network, Hub, Git, or release effect.
- Added a deterministic C5 Studio failure report containing the exact original YAML, ordered field-addressed diagnostics, diagnostic-only authority, and closed effect declarations. Failed source remains selectable, and the compact copy action cannot mutate or admit a design.
- Added deterministic C4 dashboard projection export. **Copy projection report** copies the exact bounded JSON envelope already displayed, preserves provenance and effect limits, excludes raw restricted metadata, and leaves the view intact on clipboard failure.

## 0.0.25 - 2026-08-11

- added the editable `hcc-studio` C5 candidate for governed schema, vocabulary, invariant, migration, workflow, recovery, HumanGate, and dashboard-specification design;
- added strict field-addressed validation, bounded power-of-two limits, cross-reference integrity, drop/loss checks, terminal-state protection, proposal-only effects, and inspect-only workflow transitions;
- exposed studio validation through the side-effect-free authoring API and normalized candidate YAML through an explicit clipboard-only control;
- added semantic toggleable tables, Ember Circuit presentation, Live Preview source return, a representative digital-vault lab, and an eight-lens human review gate;
- added a closed-allowlist public-source projection that excludes private response packets, internal review/projectization records, personal material, and Obsidian runtime state, then proves the temporary projection offline;
- added a bounded public roadmap, first-use/manual-install guide, structured issue forms, pull-request checklist, public identity contract, and disclosure-boundary review through Worksheet 12;
- added a pure exact-version compatibility model, four-target no-inference matrix, authoring-API exposure, command-palette JSON receipt, and bundle smoke proof;
- preserved the inspected Ember Circuit source colors as provenance tokens, lifted the operational link and strong-border colors, and added a sixteen-pair text/focus/control contrast regression contract;
- added a machine-readable eight-gate release-admission ledger so local consistency, pending human evidence, held external effects, and actual public readiness cannot be conflated;
- added a no-effect eight-scenario public-ID migration proof that blocks in-place rename and duplicate registration while preserving real-host clean-install and lifecycle gates;
- added an eight-check temporary install-layout projection that verifies the candidate-ID three-asset package and removes it without changing the prototype installation;
- hardened disable/re-enable cleanup by clearing packet previews and interaction refreshers, detaching dashboard leaves, removing presentation state, and asserting all four paths in the generated bundle;
- added a strict pasteable two-line reload locator that populates the existing explicit path and digest controls without scanning or broadening vault-read authority;
- added one privacy-safe combined host-assurance command that binds the eight-check runtime receipt and four-target compatibility matrix to the same observation timestamp without inferring support;
- repaired the C3 packet panel so all four text fields are explicitly selectable and have compact whole-value copy controls, exact preview YAML has a copy control, and confirmation state computationally gates both create actions;
- retained prohibitions on schema or taxonomy admission, workflow advancement, source mutation, provider/network access, canonical-library or external-system effects, Git, release, submission, and publication.

## 0.0.24 - 2026-08-11

- accepted the explicit human release for a disposable-vault response-packet canary;
- added one explicit-path, expected-digest packet reader restricted to `Intake/HCC Responses/`;
- added preview-confirm-create root and immutable-successor packet writes with exact YAML inspection, stale-preview rejection, per-operation confirmation, collision refusal, and exact read-back verification;
- bound persisted packets to the exact current worksheet SHA-256 digest and refused stale worksheet, packet, interaction, or lineage identities;
- added accessible worksheet controls, visible path/digest/revision receipts, and a copyable reload locator;
- retained prohibitions on overwrite, append, rename, deletion, scans, frontmatter or worksheet mutation, Hub writes, network, Git, release, and publication effects.
- added an eight-part open-source readiness contract and deterministic local release-asset validator while keeping hosted CI activation and every external release effect held.
- added the C4 native governance dashboard candidate with seven selector modes, one active-note plus capped explicit one-hop source loading, restricted-record isolation, and no vault scan or mutation surface;
- added an eight-record dashboard lab, a dedicated human review gate, accessible table/empty-state rendering, metadata refresh, and an eighty-case five-family DOM injection corpus.

## 0.0.23 - 2026-08-11

- accepted the pure C2 writer contract and preserved its no-Obsidian, no-filesystem, and no-overwrite boundary;
- added a pure explicit-path reload planner that verifies packet bytes, packet digest, worksheet identity, source digest, and admitted interaction IDs before returning hydration data;
- added in-memory worksheet hydration that refuses implicit merging into a non-empty session;
- added the closed `0.2-candidate.1` immutable successor packet with stable root identity, monotonic revision, predecessor path and digest, and a required amendment reason;
- proved deterministic revision-two and revision-three chains, create-only collision behavior, stale-lineage rejection, and preservation of the predecessor packet;
- kept real vault reads, `Vault.create`, overwrite, Hub routing activation, canonical apply, and publication behind later gates.

## 0.0.22 - 2026-08-11

- added an accessible upper-right **Copy block** control that copies the exact displayed prepared worksheet YAML without writing a vault file;
- added a deterministic eight-case authoring API self-test and a command-palette route that copies its bounded JSON receipt;
- implemented the human-authorized pure C2 writer core with strict packet/policy validation, exact `.yaml` plan bytes, digest injection, eight failure cases, and an in-memory create-only proof;
- strengthened the agent orientation, grammar example catalog, power-of-two workbook guidance, and provider-neutral projection rules;
- preserved Worksheet 08 byte-for-byte and added a new copy/API/writer/naming review surface while keeping C3 writes, Hub apply, remote, release, and publication held.

## 0.0.21 - 2026-08-10

- preserved the unanimous sixteen-lens Worksheet 07 response and its `writer_first` direction while retaining the explicit persistence and canonical-write gates;
- introduced `HCC_AUTHORING_API@0.1-candidate.1`, a frozen validation-and-catalog facade with no filesystem, vault, network, submission, or canonical-apply effects;
- added `llms.txt`, agent authoring guidance, consolidated grammar and API references, and public identity troubleshooting;
- drafted an eight-component contract/proof/canary/admission release plan and a validated writer-first downstream execution charter;
- kept the package private and every remote, public release, Obsidian submission, canonical apply, and external-system effect held.

## 0.0.20 - 2026-08-10

- made matrix selection visible through an enlarged high-contrast control, selected-cell outline, check-and-text marker, and per-row textual selection summary;
- strengthened borders, target sizes, placeholders, checked choice cards, pressed ratings, and focus presentation across Ember Circuit inputs;
- retained native controls and explicit Highlight outlines under forced-colors mode so selection never depends on Hearth colors alone.

## 0.0.19 - 2026-08-10

- demoted the Ember Circuit grid to a low-contrast six-pixel frame around an opaque inset reading projection;
- added opaque alternating matrix-row surfaces so labels and selections remain legible over the presentation layer;
- isolated every matrix render instance and row radio group, synchronized checked state from the complete response map after each change, and added a two-row retention regression test.

## 0.0.18 - 2026-08-10

- preserved and digest-locked the completed Catalog and Visualization Review packet;
- made the Hearth & Code Ember Circuit presentation the in-memory default across all plugin surfaces, with a session-only Obsidian-native opt-out and unload cleanup;
- began the governed initial-release and Hub-integration design around typed projections, provider-neutral LLM design packets, and immutable return intake;
- kept response persistence, canonical write-back, Git publication, remote creation, and plugin-directory submission behind separate human gates.

## 0.0.17 - 2026-08-10

- expanded the strictly validated candidate interaction catalog from 24 to 32 kinds with long text, radio group, rating, date range, time range, value with unit, key/value list, and manual coordinates;
- expanded the static visualization catalog from 16 to 24 projections with bullet, lollipop, dot plot, range bar, slope, waterfall, funnel, and a deterministic 64-cell waffle;
- replaced both eight-item future catalogs with non-overlapping proposal directions while preserving the earlier catalogs as historical admission evidence;
- retained ranked choice as one complete reorder-only list with no initialization checkboxes;
- added fourth-tranche galleries, DOM/table-parity coverage, and an eight-lens human evaluation gate before public-project restructuring.

## 0.0.16 - 2026-08-10

- projected the canonical Hub-owned Hearth & Code palette and the candidate Ember Circuit signal vocabulary into a complete plugin token layer;
- added a session-only Ember Circuit command and the preferred per-note `hcc-theme-ember-circuit` class while retaining the earlier class as an alias;
- brought nested inputs, buttons, disclosures, tables, workbook sections, visualization surfaces, extensions, and the governance workbench under the same presentation contract;
- added source digests, theme-surface regression checks, and default-theme, forced-colors, and reduced-motion fallbacks.
- preserved the sole Phase 0.7 acceptance response in raw and parseable forms and drafted the human-authorized local hardening plan without beginning implementation.

## 0.0.15 - 2026-08-10

- completed the user-facing identity metadata for **Hearth & Code Governed Widgets**, including the author and project site required by the Obsidian manifest contract;
- retained `hcc-widget-lab` as the stable compatibility ID and documented why it must not be treated as the display name;
- aligned current vault instructions with the accepted name and added deterministic identity metadata checks.

## 0.0.14 - 2026-08-10

- fixed the Obsidian load regression caused by renaming the installed plugin ID in place;
- restored the stable internal ID and folder `hcc-widget-lab` while retaining the approved display name **Hearth & Code Governed Widgets**;
- added a regression check binding the manifest ID to the generated plugin directory.
- added a generated-bundle startup smoke test that verifies export shape and executes `onload()` through a constrained host shim.
- placed every radar axis label on an opaque, bordered surface with forced-colors support so Ember Circuit grid lines cannot obscure the text.

## 0.0.13 - 2026-08-10

- accepted the public identity **Hearth & Code Governed Widgets** and MIT license;
- added render-only `computed_field` and `radar` candidate extension surfaces;
- added an opt-in, token-driven Ember Circuit presentation projection with default-theme fallbacks;
- preserved and tested the immutable Host and Projectization Review packet.

All versions below are disposable-lab candidates and have not been publicly released.

## 0.0.12 - 2026-08-10

- Extracted collection and composite controls, including tags, matrix, and repeatable groups.
- Moved candidate-kind dispatch behind the UI facade, reducing `render-candidate.ts` from 537 to 154 lines.
- Split every implemented visualization into summary, comparison, composition, sequence, relation, or distribution backends.
- Reduced the central visualization renderer from 244 to a 49-line orchestrator.
- Added DOM tests for tags, matrices, repeatable numeric fields, and one representative from every visualization family.

## 0.0.11 - 2026-08-10

- Extracted configuration validation from the candidate parser while preserving the public parser facade.
- Reduced `grammar/parse.ts` from 732 to 385 lines and established a 34-fixture golden result digest.
- Extracted shared SVG primitives and the donut, stacked-bar, and treemap composition backend.
- Reduced the central visualization renderer from 329 to 244 lines.
- Added synthetic DOM parity tests for all three extracted composition views and their accessible tables.

## 0.0.10 - 2026-08-10

- Extracted ranked-choice and multi-select renderers behind the choice-family seam.
- Added a development-only DOM runtime with ranking, selection, numeric-keyboard, focus, and synthetic performance tests.
- Reduced the central candidate renderer from 759 to 537 lines without changing its contract.

## 0.0.9 - 2026-08-10

- Added exhaustive six-family registries for all current inputs and views.
- Extracted shared DOM, candidate response, and numeric-stepper UI modules.
- Added a runnable local release-boundary audit and package invariant tests.
- Drafted public security, privacy, accessibility, contribution, support, authoring, architecture, threat, catalog, and release documents.
- Added the sixteen-lens evidence review and original-goal completion audit.

## 0.0.8 - 2026-08-10

- Preserved the completed Final Readiness response packet with an exact digest.
- Added capability/effect enforcement and extension descriptor validation.
- Bound 8 future inputs and 8 future views to render-only proposal descriptors.
- Added exhaustive interaction and visualization family registries.
- Added the four-tier review, final architecture, future roadmap, and repository route.
- Added projectization, privacy, accessibility, security, contribution, and support documentation.

## 0.0.7

- Routed released and candidate interaction contracts before rendering.
- Added the final readiness worksheet and regression coverage for the exact matrix example.

Earlier lab versions incrementally added candidate input kinds, views, worksheets, workbooks, governance projections, and Live Preview support.
