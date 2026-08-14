# Maintainer Architecture

The dependency direction is contract-first:

```text
contracts/types
  <- side-effect-free authoring API
  <- grammar and visualization validation
  <- immutable models and sessions
  <- semantic UI renderers
  <- narrow Obsidian adapters
  <- plugin lifecycle

plugin-layer policy surrounds registrations and adapter entry points
```

Pure parsers and models must not import Obsidian. UI modules may consume validated models but cannot interpret raw YAML independently. Adapters may expose only exact operations admitted by a capability. Consequential effects require their own provider contract.

The current projectization seam groups 32 interactions into six exhaustive families and 24 views into eight exhaustive families. `rendererModule` values are static ownership boundaries, not runtime dynamic imports. Configuration validation is isolated behind the parser facade; complex input controls use bounded modules and shared DOM primitives. Every implemented view routes through a summary, comparison, composition, sequence, relation, distribution, process, or target family using shared SVG primitives. Further splitting should follow maintenance evidence rather than recreating one file per kind.

Candidate extension flow: descriptor validation, four-tier review, candidate implementation, negative tests, accessibility/compatibility evidence, human admission, released contract version. Unknown transitions remain held.

`src/api/` is a consumer-facing facade over pure parsers and catalogs. It must not import Obsidian, DOM renderers, vault adapters, writer providers, network surfaces, or mutable session state. The default plugin class exposes the frozen facade as `authoringApi`, but consumers must not depend on undocumented Obsidian cross-plugin internals.

Writer work is split at an architectural fault line: C2 validates packets/policies and compiles deterministic plans without effects; C3 owns the separately authorized Obsidian explicit-read and create-only provider. A C2 type must not import or accept an Obsidian `App`, `Vault`, `TFile`, adapter, or filesystem handle. `src/obsidian/response-packet-controller.ts` owns preview state, exact-source rebinding, reload hydration, amendment lineage, and stale-plan rejection through four injected capabilities: sessions, an exact worksheet-source reader, an interaction refresher, and a two-method packet effect port. It contains no direct Obsidian import.

The host bridge is isolated in `src/obsidian/response-packets.ts`; its testable port enforces the fixed folder, one generated ASCII YAML leaf, confirmation, collision, and read-back protocol without giving UI or grammar modules direct Vault access. Production code can obtain this adapter only through `createResponsePacketAdapter`, which resolves the loaded manifest ID and current vault through a pure two-profile policy before constructing the port. The prototype ID is restricted to `scratch-vault`, the public ID is bound to its current named local vault, and unknown identities fail closed. Direct adapter construction remains available only to pure fake-port tests. The plugin lifecycle performs capability checks and dependency wiring, delegates orchestration to the controller, and clears pending previews on unload.

Unload also clears the interaction-refresher registry, detaches native governance-dashboard leaves, removes the session presentation class, and relies on `MarkdownRenderChild` and `registerEvent` for per-render and metadata-listener disposal. The generated-bundle smoke exercises these plugin-owned cleanup paths; Obsidian itself still owns cleanup for registrations returned through the `Plugin` base class.

C4 follows the same pure/host split. `src/dashboard/` owns the seven-mode projection model and semantic renderer without importing Obsidian. `src/obsidian/dashboard-source.ts` reads exactly one selected Markdown body for its digest and resolves metadata for the existing twelve-item explicit-relationship boundary; it never enumerates files or reads linked bodies. `src/obsidian/dashboard-view.ts` owns the native ItemView, controls, last-request-wins refresh, and relevant metadata-event subscription. Restricted records are excluded before selector evaluation.

C5 remains pure through `src/studio/`: strict JSON-compatible YAML parsing, cross-reference validation, normalized model, transition inspection, and semantic DOM rendering. The parser accepts no executable guard or effect language. `src/main.ts` supplies only render and clipboard dependencies to the `hcc-studio` fence; there is no source adapter, workflow engine, migration runner, or persistence provider. The authoring API exposes the same parser without importing DOM or Obsidian.

C6 remains provider-neutral through `src/exchange/`: a strict exchange parser, injected SHA-256 function, fixed prompt-packet builder, bounded pasted-YAML validator, and semantic renderer. The only host dependencies are clipboard copy and Web Crypto digest calculation. The module has no Obsidian import, path resolver, source reader, provider SDK, credential store, network function, or persistence port. Valid imports route back through the C5 parser and renderer.

The local audit also rejects Node filesystem, path, process, network, Electron, raw `Vault.adapter`, global Obsidian-app access, dashboard file enumeration, and dashboard mutation calls in `src/`. This is a source-level compatibility boundary, not proof of mobile-host behavior.
