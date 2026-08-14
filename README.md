# Hearth and Code Governance Lab

An experimental Hearth & Code Obsidian plugin and synthetic test hub for governed HCC inputs, visualizations, worksheets, workbooks, and provenance projections in Reading view and Live Preview. The accepted first-public identity is **Hearth and Code Governance Lab**.

The public plugin ID is `hearth-and-code-governance-lab`. The disposable development vault deliberately retains `hcc-widget-lab` and its historical **Hearth & Code Governed Widgets** display label through `config/development-install.json`; that compatibility installation is not a public release asset. See [Plugin Identity and Compatibility](docs/concepts/plugin-identity.md).

## What the current proof implements

Every valid `choose_one`, `choose_many`, or `long_text` block now defaults to the question, its primary input, three explicit state shortcuts, an optional correction/context disclosure, and **Review response**. Entering a value selects `answered`; Defer, Not applicable, and Clear answer remove any hidden value.

The **Context and related work** disclosure retains source binding, validation, raw YAML, and at most twelve explicit active-note relationships. **Review response** presents deterministic proposal YAML, a proposed append-only diff, explicit null digest/idempotency fields, and the separate held Intake projection. Record remains disabled.

The adjacent `hcc-response-candidate` contract is a proposal for review, not released HCC grammar. It invents no author, timestamp, digest, idempotency key, route, or canonicalization rule.

Live Preview uses CodeMirror state-backed block decorations. A fence renders when the selection is outside it and immediately returns to YAML when edited. Commands focus the next widget, previous widget, or source; no hotkey is assigned and Tab is never intercepted globally.

The candidate grammar now has thirty-two strictly validated input kinds. The fourth tranche adds `long_text`, `radio_group`, `rating`, `date_range`, `time_range`, `unit_value`, `key_value_list`, and `coordinates` after the earlier month/week/percentage/color/phone/tags/range/file-reference tranche. Number-like controls use decrement/input/increment actions. Ranked choices are complete reorder-only lists with drag ordering and named Move up/down buttons; there are no initialization checkboxes. These are review candidates, not admitted HCC vocabulary.

The declarative `hcc-view` candidate implements twenty-four static projection kinds with accessible data tables. Bullet, lollipop, dot plot, range bar, slope, waterfall, funnel, and a deterministic sixty-four-cell waffle join the prior sixteen projections. Alluvial, chord, sunburst, streamgraph, choropleth, parallel coordinates, control chart, and candlestick are the new non-overlapping proposal-only directions with no renderer or admitted grammar.

Eight replacement input directions also remain proposal-only: hierarchy picker, conditional section, schema object, citation picker, ontology term picker, table editor, drawing annotation, and collaborative field. Each names the governance, accessibility, identity, or lifecycle prerequisite that prevents premature implementation. The earlier future catalogs remain documented as historical admission evidence; computed field and radar continue as separately versioned candidate extensions rather than current grammar.

The plugin layer exposes a machine-audited capability catalog and explicit effect vocabulary. Current entry points must obtain permission for rendering, bounded source reads, template copying, or the response-packet provider. Its two-profile host policy confines the `hcc-widget-lab` prototype to the vault named `scratch-vault`, permits the accepted `hearth-and-code-governance-lab` identity to operate only in its currently open named local vault, and rejects unknown plugin identities. The provider may read one explicit packet and create a new immutable YAML file under `Intake/HCC Responses/`. Frontmatter mutation, overwrite, append, rename, deletion, vault scans, canonical-library writes, network access, and publication remain denied. The sixteen future input/view ideas are encoded as render-only, human-review-required extension descriptors rather than treated as admitted vocabulary.

The source-level `HCC_AUTHORING_API@0.1-candidate.1` exposes pinned versions, exhaustive catalogs, pure validators, and a deterministic eight-case self-test for interactions, worksheets, workbooks, and views. The plugin instance publishes the same frozen object as `authoringApi`; the command palette opens its complete JSON self-test receipt in a selectable evidence viewer and also copies it for compatibility. Its declared filesystem, vault, network, submission, and canonical-apply effects are all false. Agents should begin with the exact 256-line [`llms.txt`](llms.txt), the [tutorial route](docs/tutorials/README.md), one of the [four task skills](skills/), the [sixteen-route grammar example catalog](docs/reference/grammar-example-catalog.md), and the [API reference](docs/reference/authoring-api.md).

The command palette provides **Run and copy combined host assurance packet** as the shortest evidence route, plus the focused **Run and copy runtime readiness report** and **Run and copy compatibility matrix** commands. Each opens a selectable, scrollable in-app report with a compact **Copy report** control while preserving the compatibility clipboard copy. The combined packet binds eight privacy-safe host observations and the four-target no-inference matrix to one timestamp. It leaves the unobserved minimum desktop row pending; mobile rows remain unobserved diagnostic entries and are unsupported for the first public candidate. It excludes the vault name and reads no vault content. See the [runtime-readiness contract](docs/maintainers/runtime-readiness.md) and [compatibility matrix](docs/maintainers/compatibility-matrix.md).

All 32 current inputs are assigned exhaustively to six implementation families, and all 24 current views to eight families. Candidate configuration validation is isolated behind the parser facade; complex input controls sit behind a UI dispatcher; and every view routes through a bounded summary, comparison, composition, sequence, relation, distribution, process, or target backend with shared semantic DOM/SVG primitives.

Visualization data is either inline or bound to one explicit vault-relative flat YAML source with a SHA-256 digest. The adapter never searches the vault and withholds digest-mismatched data. Rendering uses native static SVG/DOM with a backend seam for a later reviewed modular-D3 implementation.

`hcc-form` composes stable interaction IDs into a worksheet; `hcc-workbook` provides an explicit, full-width tabular worksheet manifest with consistent action sizing. Responses begin in plugin memory and can be reviewed, discarded, copied as exact YAML, or saved through the create-only response provider. The disposable prototype remains restricted to `scratch-vault`; the public identity uses the same bounded provider in the current named local vault. The worksheet panel first previews the exact target, digest, byte count, and YAML; a separate confirmation creates the same packet under `Intake/HCC Responses/` and verifies it by read-back. A changed worksheet source or response invalidates the preview. Reload requires the explicit path and expected digest and refuses stale sources or a non-empty draft. Editing a loaded response and supplying an amendment reason creates a new lineage-bearing successor through the same preview-confirm flow; it never replaces its predecessor. Nothing is routed to a canonical knowledge system automatically.

The shield ribbon and governance command open an eight-operation workbench for proposed review, verification, lifecycle, sensitivity, authority, supersession, provenance, and knowledge-system projection packets. It reads the active document and at most sixteen explicit one-hop references. Every frontmatter and external effect remains prohibited.

The command palette also opens a native **Governance dashboard** bound to one selected Markdown note. Its seven modes project program status, active lanes, pending seals, review queue, programs, threads, and handoffs from the note plus at most twelve explicitly linked one-hop metadata records. It reads only the selected note body for its digest, never enumerates the vault or reads linked bodies, excludes restricted records, and exposes no write or canonical-update action. See the [native dashboard contract](docs/reference/native-dashboard.md).

The `hcc-studio` C5 candidate makes schema and workflow design a source-visible Markdown activity. It strictly validates context sources, record fields, vocabulary bindings, invariants, migrations and loss reports, states, actors, declarative guards, proposal-only effects, recovery rules, HumanGates, transitions, receipts, and dashboard specifications. The rendered studio uses toggleable semantic tables and can copy normalized candidate YAML; it cannot read declared sources, run a migration, admit vocabulary, or advance a workflow. See the [schema/workflow studio contract](docs/reference/schema-workflow-studio.md).

The `hcc-exchange` C6 candidate builds a fixed JSON prompt packet only after verifying the digests of explicitly embedded, manually disclosure-approved source data. It can then validate and render one pasted raw `hcc-studio` YAML candidate in memory. It never reads the declared paths, selects or calls a provider, stores credentials, uses the network, persists the import, or changes authority. See the [provider-neutral exchange contract](docs/reference/provider-neutral-exchange.md).

The [provider-neutral semantic-interoperability specification](docs/reference/semantic-interoperability.md) defines eight normalized types and eight public-safe synthetic fixture correspondences for possible downstream adapters. `npm run proof:interoperability` verifies their closed, digest-bound, no-effect shape. It is not an external-system adapter and performs no cross-repository operation.

Ember Circuit is the plugin's initial presentation. A bounded Obsidian settings tab persists thirteen local presentation preferences after explicit change: four overall-presentation controls and nine worksheet navigation, focus, progress, action, and completion controls. Changes apply immediately to tracked open HCC renderings, and Focused intake can surface one real question at a time with Previous and Next controls. Identity, response policy, contracts, and runtime status remain read-only. Missing or malformed settings fall back safely, and loading without `data.json` does not create it. The command-palette theme toggle remains session-only; the per-note `hcc-theme-ember-circuit` CSS class remains a durable, source-visible compatibility hook. The settings surface cannot change response paths, persistence semantics, validation, privacy, HumanGates, providers, network access, canonical write-back, or release authority. Use `Guided Tour/02 Configure the Plugin.md` in the guided vault for the public visual route. See [Styling](docs/guides/styling.md) and [Privacy](PRIVACY.md).

The current Intake Response Envelope v0.2 also has no lossless `deferred` field-response state. The lab reports that mismatch instead of inventing a transition.

## Local response-packet boundary

- Inputs begin in plugin-session memory and disappear when the plugin reloads or is disabled unless explicitly saved as an immutable packet.
- The prototype profile accepts only plugin ID `hcc-widget-lab` in the vault named `scratch-vault`. The public profile accepts only plugin ID `hearth-and-code-governance-lab` in its currently open named local vault. Unknown identities and empty vault names fail closed.
- Both profiles use the same sole write path: new immutable YAML files under `Intake/HCC Responses/` after per-write confirmation and exact read-back verification.
- The effect adapter accepts exactly one generated ASCII `.yaml` leaf directly beneath that folder. Nested paths, traversal, schemes, hidden segments, controls, cross-platform-invalid characters, and reserved device names fail before any vault-port call.
- Reload reads one explicit packet path only and requires its expected SHA-256 digest. It never searches for packets.
- No overwrite, append, rename, deletion, source/frontmatter mutation, workflow transition, submission, external-system write, or canonical intake.
- No network, telemetry, remote asset, provider, listener, local server, shell, arbitrary JavaScript, or dynamic import.
- No whole-vault scan, independent index, persistent cache, embedding, ranking, or inferred relationship.
- No arbitrary visualization expressions, remote data, HTML injection, animation, or Markdown-supplied JavaScript.
- Unknown versions, kinds, fields, option references, and invalid response shapes fail visibly while preserving source.
- Ember Circuit is the default plugin presentation, with a session-only Obsidian-native opt-out. Default Obsidian themes and CSS-disabled source remain usable.

## Guided vault route

Open `scratch-vault/00 Start Here.md` in Reading view. The public projection contains only an eight-stage guided tour, one four-worksheet workbook, and four practice worksheets. It covers configuration, AI-agent authoring, validation, response capture, immutable reload/amendment, projections, governance, and a separately gated downstream integration. The much larger evaluation vault and historical gates remain private development evidence.

## Public candidate orientation

The [public candidate roadmap](ROADMAP.md) separates four horizons: local component evidence, reviewed alpha, provider-neutral interchange, and public release admission. It communicates direction without promising dates or support.

For a first build, disposable-vault walkthrough, minimal source-visible example, and the future clean-install receipt format, use [First Use and Manual Installation](docs/guides/first-use-and-manual-install.md). The source repository includes bug and feature issue forms plus a pull-request checklist under `.github/`. Publishing source does not activate hosted automation, release the plugin, admit it to the Obsidian Community directory, or create a support commitment.

### Eight-guide route

The public procedural layer is deliberately bounded to eight guides:

| Route | Guide | Use it for |
|---:|---|---|
| 1 | [First use and manual installation](docs/guides/first-use-and-manual-install.md) | build, disposable vault, later clean-install evidence |
| 2 | [AI-assisted governed workflow](docs/guides/ai-assisted-governed-workflow.md) | the complete human-agent-plugin loop |
| 3 | [Project setup and integration](docs/guides/project-setup-and-integration.md) | vault layout and a separately governed downstream adapter |
| 4 | [Authoring](docs/guides/authoring.md) | interactions, views, worksheets, workbooks, and validation |
| 5 | [Power-of-two workbook design](docs/guides/power-of-two-workbook-design.md) | proportional worksheet and review structure |
| 6 | [Styling](docs/guides/styling.md) | Ember Circuit, native-theme fallback, accessibility tokens |
| 7 | [Immutable response packets](docs/guides/response-packets.md) | preview, create, reload, amend, lineage, and recovery |
| 8 | [Troubleshooting and recovery](docs/guides/troubleshooting-and-recovery.md) | eight failure routes and evidence-preserving recovery |

Reference documents define exact contracts; guides define human procedures. The number eight is a routing boundary, not permission to pad content or imply that the product surface is complete.

## Project layout

```text
src/core/           Released-fixture parser, validation, draft transitions, relations, and response proposals
src/compatibility/  Pure exact-version comparison and four-target compatibility evidence model
src/api/            Side-effect-free authoring API, pinned catalogs, and source validators
src/editor/         CodeMirror fence scanner, decorations, lifecycle, and explicit focus controller
src/grammar/        Candidate parser facade, isolated config validation, family map, and renderer catalog
src/visualization/  Declarative validation/models, family map, shared SVG, eight bounded families, and orchestrator
src/workbook/       Worksheet/workbook contracts, in-memory sessions, held packets, and renderers
src/writer/         Pure packet/policy, explicit reload, immutable successor, deterministic planning, and in-memory proofs
src/governance/     Eight-operation proposal workbench and explicit authority-chain model
src/dashboard/      Pure seven-mode bounded dashboard model and accessible projection renderer
src/studio/         Strict C5 schema/workflow grammar, graph validation, model, and semantic renderer
src/exchange/       Strict C6 prompt packet, digest verification, bounded import, and provider-neutral renderer
src/plugin-layer/   Capability catalog, effect policy, extension validation, and governed future descriptors
src/ui/             Shared semantic DOM, response controls, and candidate input-family dispatch
src/obsidian/       Active-note adjacency, dashboard/source adapters, runtime diagnostics, response orchestration, and the bounded create-only adapter
src/render*.ts      Semantic DOM renderers and diagnostics
tests/              Deterministic contract and intake-provenance tests
docs/agents/         Agent-facing HCC authoring procedure and boundaries
docs/tutorials/      Eight progressive human-and-agent lessons plus screenshot capture plan
skills/              Four portable task skills for authoring, workbooks, responses, and governance
scratch-vault/      Disposable synthetic test hub with this plugin only
SECURITY/PRIVACY/ACCESSIBILITY/CONTRIBUTING/SUPPORT  Candidate public operating policies
```

Private response packets, internal projectization records, and development review history are deliberately excluded from the future public-source projection.

## Run

```bash
npm install
npm run proof
npm run audit:contrast
npm run proof:identity-migration
npm run proof:install-layout
npm run benchmark:synthetic
npm run proof:clean-room
obsidian scratch-vault
```

`proof:clean-room` reconstructs the current candidate in a temporary directory without `.git`, dependencies, Obsidian configuration, or response packets; installs strictly from the lockfile and local npm cache; runs the full proof; and removes the temporary copy. It performs no network or repository mutation.

`proof:public-source` separately constructs the closed-allowlist public source projection, excludes private responses and internal projectization material, checks sensitive markers and relative links, runs the projected source offline, hashes its release assets, and removes the temporary copy. See the [public source boundary](docs/maintainers/public-source-boundary.md).

`benchmark:synthetic` records four samples each for 1,024 parser operations and 1/16/64 Happy DOM widget renders. These timings are local regression evidence, not real Obsidian performance claims.

In the disposable vault, open Settings, Community plugins, and enable **Hearth & Code Governed Widgets**. A later clean public-ID vault must instead enable **Hearth and Code Governance Lab**. Review both Reading view and Live Preview; automated proof does not replace desktop interaction testing.

Obsidian may cache plugin metadata. In the disposable vault, the built `scratch-vault/.obsidian/plugins/hcc-widget-lab/manifest.json` intentionally shows the compatibility name **Hearth & Code Governed Widgets** and ID `hcc-widget-lab`. The root `manifest.json` carries the public Governance Lab identity. Reload or restart Obsidian after a build, and confirm which vault and plugin directory are active.

## What automated proof establishes

`npm run proof` performs TypeScript checking, deterministic core and adapter-port tests, and the production bundle. `npm run audit:contrast` separately reports the sixteen declared opaque Ember Circuit text, focus, and control-boundary pairs. Neither proves real Obsidian file creation, computed styles, desktop rendering, assistive-technology behavior, zoom behavior, or acceptable performance on this machine. Evaluation 20 provides the real-host canary walkthrough.

After the production build, `npm run check:release-candidate` verifies the three candidate binary assets, semantic-version and manifest alignment, required public documents, source-map absence, mobile-sensitive runtime imports, and network absence. It also evaluates the closed eight-gate contract in `config/release-admission.json`, reporting passed, pending, and held gates separately. A green local candidate remains distinct from `public_release_ready`, which cannot become true while any required gate is pending or held.

The proof begins with `npm run audit:local`, which checks version alignment, required project documentation, private-prerelease state, and prohibited source surfaces. It is a bounded local receipt, not a release authorization or runtime sandbox.

## Recovery

The project contains no canonical data. Reloading clears in-memory responses but intentionally preserves explicitly created packets in `Intake/HCC Responses/`. The plugin has no delete path; remove disposable canary files manually only after review. Do not transfer fixture packets into a canonical library or external knowledge system without human disposition.
