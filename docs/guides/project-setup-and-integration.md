# Project Setup and Integration Guide

Use this guide to add Governance Lab to a project or knowledge vault without turning the plugin into the source of truth.

## Four-layer project layout

```text
00 Guide/                 human orientation and local operating rules
Workbooks/                explicit navigation manifests
Worksheets/               source-visible forms and questions
Intake/HCC Responses/     plugin-created immutable response candidates
```

Add domain source material elsewhere according to the host vault's own routing rules. Do not place canonical documents under `Intake/HCC Responses/`; that folder is a return-intake boundary.

## Eight setup steps

1. Install the exact three plugin assets in `.obsidian/plugins/hearth-and-code-governance-lab/`: `main.js`, `manifest.json`, and `styles.css`.
2. Enable the plugin and inspect its version and identity in Community plugins.
3. Open Settings and choose a presentation profile. Use Focused intake for one-question work or Audit and governance for dense review.
4. Copy only the guided-vault documents you want. Keep `00 Start Here.md` as the entry point.
5. Create project-specific worksheets from the documented grammar, preserving stable IDs and contract versions.
6. Validate the worksheet before collecting responses; resolve every diagnostic without hiding the source.
7. Exercise packet preview, create, reload, and successor amendment using synthetic answers.
8. Define the destination system's separate intake mapping, authorization, verification, and receipt route before using real responses.

## AI-agent operating context

When the vault is the agent's working directory, point the agent to these files in order:

1. `00 Start Here.md` in the guided vault;
2. `llms.txt` at repository root;
3. `docs/agents/authoring-hcc-content.md`;
4. the task-specific skill under `skills/`;
5. the exact worksheet or workbook being changed;
6. the relevant grammar or API reference;
7. the host vault's local governance instructions;
8. the source records explicitly named by the task.

Tell the agent that Markdown/YAML is source, rendered widgets are projections, response packets are immutable candidates, and destination writes need independent permission. The agent should not scan the vault to infer context.

## Integration contract

A downstream adapter should expose four separable ports:

| Port | Input | Output | Authority |
|---|---|---|---|
| Validate | HCC source text | normalized data or diagnostics | none |
| Project | validated normalized data | accessible UI | none |
| Capture | human response state | immutable candidate packet | candidate only |
| Admit | reviewed candidate plus destination policy | canonical destination change and receipt | separately governed |

The current plugin implements validation, projection, and a bounded vault-local capture route. It does not implement a general admission port.

## Packet-to-record mapping

Create a mapping specification before integration. It should declare exact source packet path and digest, contract versions, stable interaction IDs, destination field IDs, type conversions, null behavior, duplicate policy, sensitivity changes, authority transition, reviewer, rollback, and receipt location. Unknown fields or stale digests must stop the operation.

## Recommended optimization sequence

1. Use the four guided worksheets unchanged.
2. Clone one worksheet and change only prompts and IDs.
3. Add an explicit workbook manifest.
4. Add one small inline projection.
5. Introduce a project schema and mapping fixture.
6. Add deterministic validation tests.
7. Canary the packet-to-record mapping with synthetic data.
8. Release a separately reviewed writer only when overwrite, conflict, privacy, recovery, and audit semantics are proven.

## Readiness evidence

Keep an evidence packet containing plugin version, host version, exact source paths and digests, validation output, packet locator, successor relationship, destination mapping version, applied-result digest, and known limitations. This packet records what was checked; it does not mark itself reviewed or verified.
