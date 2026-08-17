# Authoring Governed Widgets

Agents and generator authors should begin with the repository `llms.txt`, then read the consolidated grammar and side-effect-free authoring API references. Human authors can use the examples below directly in Markdown.

## First interaction

Create a fenced `hcc-interaction` block with an explicit candidate version, stable ID, kind, prompt, config object, and complete response object:

```yaml
version: 0.3-candidate.1
id: delivery-confidence
kind: percentage
prompt: How confident are we in the current delivery route?
config: { min: 0, max: 100, step: 5 }
response: { value: null, note: null, state: unanswered, author: null, responded_at: null }
visibility: private
```

The primary input is shown immediately. Contract/source details and notes remain collapsible. Answers begin session-local and disappear when the plugin reloads unless a user explicitly saves a new immutable response packet from the enclosing worksheet.

## Ranking

`ranked_choice` always renders the complete declared option set as a reorderable list. Drag items or use Move up/Move down, then choose **Use shown order**. There are no initialization checkboxes, and the block accepts only `options` under `config` — it does not accept `min_selections` or `max_selections` (those belong to `multi_select`).

## Worksheets and workbooks

An `hcc-form` references stable interaction IDs in the same document. An `hcc-workbook` declares worksheets as a full-width manifest. The worksheet's **Vault response packets** panel can create a new packet in `Intake/HCC Responses/`, reload one exact path with its expected digest, or create an immutable successor with an amendment reason. These actions are local intake only, never submission or canonical write-back.

## Views

An `hcc-view` uses inline rows or one exact vault-relative YAML source plus SHA-256 digest. It never searches for data. Invalid encodings or stale digests show diagnostics and preserve a table/source fallback.

## Schema and workflow studio

An `hcc-studio` fence composes a proposal-only context, schema, migration, workflow, and dashboard specification. Its source is editable in Live Preview; the rendered surface keeps detailed layers toggleable and can copy deterministic normalized YAML. It never reads declared sources, applies migrations, advances transitions, or admits vocabulary. Start with the demo in `scratch-vault/Studio Lab/00 Digital Vault Design Studio.md` and the full [studio contract](../reference/schema-workflow-studio.md).

## Failure behavior

Unknown versions, kinds, fields, IDs, response shapes, paths, and encodings fail closed. Fix the YAML or intentionally migrate the candidate contract; do not suppress the diagnostic.

## Validate programmatically

`HCC_AUTHORING_API@0.1-candidate.1` exposes pinned catalogs and pure parsers for interactions, worksheets, workbooks, views, and studio packets. It performs no filesystem, vault, network, submission, or canonical-apply effect. See `docs/reference/authoring-api.md`.
