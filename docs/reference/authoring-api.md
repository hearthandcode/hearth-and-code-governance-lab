# Authoring API

Status: `0.1-candidate.1`, source-level and plugin-instance candidate API. Validation and description only.

## Purpose

The authoring API lets agents, tests, generators, and future adapters inspect the current catalog and validate HCC source before presenting it to a person. It deliberately excludes rendering, filesystem access, vault mutation, network access, submission, and canonical apply.

Source entry point: `src/api/index.ts`.

```ts
import { HCC_AUTHORING_API } from "./src/api";

const result = HCC_AUTHORING_API.parseCandidateInteraction(sourceYaml);
if (!result.ok) {
  for (const diagnostic of result.diagnostics) {
    console.error(diagnostic.path, diagnostic.message);
  }
}
```

## API surface

| Member | Input | Output | Effect |
|---|---|---|---|
| `contracts` | none | pinned contract versions | none |
| `catalogs` | none | kinds, families, renderer descriptors | none |
| `parseReleasedInteraction` | YAML string | released parse result | none |
| `parseCandidateInteraction` | YAML string | candidate parse result | none |
| `parseWorksheet` | YAML string | worksheet parse result | none |
| `parseWorkbook` | YAML string | workbook parse result | none |
| `parseView` | YAML string | view validation result | none |
| `parseStudio` | YAML string | schema/workflow studio parse result | none |
| `parseExchange` | YAML string | provider-neutral exchange parse result | none |
| `buildExchangePrompt` | parsed exchange plus injected digest function | fixed prompt packet or stale-digest diagnostics | none |
| `validateExchangeImport` | raw pasted YAML | bounded C5 studio candidate or diagnostics | none |
| `validateViewObject` | unknown object | view validation result | none |
| `runSelfTest` | none | deterministic eight-case receipt | none |

The API object exposes an explicit effect ceiling:

```ts
HCC_AUTHORING_API.effects === {
  filesystemWrite: false,
  vaultMutation: false,
  network: false,
  submission: false,
  canonicalApply: false
}
```

## Plugin instance

The default plugin class exposes the same frozen object as `plugin.authoringApi`. This supports a future reviewed Obsidian adapter. Obsidian does not currently provide a stable public cross-plugin discovery contract used by this project, so consumers must not depend on undocumented `app.plugins` internals. Prefer source-library imports, generated Markdown, or a future admitted adapter.

## Test the surface in Obsidian

Open the command palette and run **Hearth and Code Governance Lab: Run and copy authoring API self-test report**. The command executes eight deterministic foundational cases: one valid and one invalid candidate interaction, worksheet, workbook, and view. It reports `8/8` only when all acceptance and rejection expectations pass, opens the complete JSON receipt in a selectable and keyboard-scrollable evidence viewer, and retains the compatibility clipboard copy. Studio and exchange validation have their own security corpora and are exposed additively without padding the foundational self-test.

The self-test reads no note, searches no vault path, writes no file, calls no network, and makes no authority claim. Repository authors can run the same surface with `npm test -- tests/authoring-api.test.ts`.

## Compatibility

- `apiVersion` changes when the API contract changes.
- Grammar versions change independently and remain visible in `contracts`.
- Kinds and families are exhaustive for their pinned candidate version.
- Unknown contracts fail visibly; the API does not coerce, silently migrate, or drop unknown fields.
- Candidate APIs may change before the first public release. A future stable API requires a compatibility table, deprecation policy, and semver gate.

## Not yet exposed

- response-packet persistence;
- target-policy resolution;
- Obsidian vault writer provider;
- external routing or canonical apply;
- LLM/provider calls;
- external plugin discovery or RPC.

Those are separate components in the phased release plan. The native dashboard is registered by the plugin host but is not a cross-plugin API. The create-only writer remains behind its narrow two-profile host adapter rather than becoming general authoring authority: the prototype ID is restricted to `scratch-vault`, the public ID is bound to its current named local vault, and unknown identities fail closed.

## C2 writer-core boundary

The separately exported `src/writer` module now validates response-packet and write-policy candidates and compiles deterministic preview plans. It is not attached to `HCC_AUTHORING_API`, because Worksheet 08 deferred API admission while authorizing the pure C2 implementation. It has no Obsidian import or filesystem provider. A null worksheet source digest, stale digest, incomplete required response, unsafe target, disallowed privacy class, overwrite policy, or unknown field blocks planning.

Worksheet 09 accepted C2 and released pure C3 design. The same separately exported module provides `compileResponseReloadPlan`, `parseReloadableResponsePacket`, and `compileResponseAmendmentPlan`. Those functions remain pure and outside the public authoring API. The separately authorized C3 Obsidian adapter now supplies one explicit packet read and create-only packet writes through worksheet controls; it is not callable through `HCC_AUTHORING_API` and grants no cross-plugin filesystem capability.

## C5 studio boundary

`parseStudio` validates the source-only C5 design grammar described in [Schema and Workflow Studio](schema-workflow-studio.md). It performs reference, migration, HumanGate, guard, terminal-state, and authority checks but does not evaluate data, read declared sources, apply a migration, advance a workflow, or admit vocabulary. `src/studio` remains free of Obsidian imports.

`buildCompatibilityMatrix` constructs the four-target, no-effect compatibility receipt described in [Compatibility Matrix](../maintainers/compatibility-matrix.md). `compareAppVersions` and the builder live in the pure `src/compatibility` module. An observed host never causes an unobserved minimum-version or mobile row to pass.

## C6 exchange boundary

`parseExchange` validates the source-visible C6 contract. `buildExchangePrompt` requires a caller-supplied SHA-256 function, verifies every embedded content digest, and returns fixed JSON bytes without copying or sending them. `validateExchangeImport` enforces the raw-YAML and byte boundary before delegating to `parseStudio`. These methods expose no clipboard, provider, credential, network, filesystem, vault, admission, or execution capability. See [Provider-Neutral Exchange](provider-neutral-exchange.md).
