# AI-Assisted Governed Workflow

This guide describes a provider-neutral way to use Hearth and Code Governance Lab with an AI agent. The plugin does not call a model, store credentials, transmit vault content, or accept model output as authority. The person operating the vault chooses what to disclose, moves text between tools, validates returned artifacts, and decides what advances.

## The eight-stage loop

| Stage | Human action | Agent contribution | Plugin contribution | Durable result |
|---:|---|---|---|---|
| 1 | Bound the purpose and sensitivity | Ask clarifying questions | Render the orientation worksheet | An in-memory response draft |
| 2 | Select presentation and privacy settings | Explain tradeoffs | Apply settings immediately | Local plugin preferences |
| 3 | Name exact source material and desired output | Draft source-visible HCC YAML | Preserve Markdown as the inspectable source | A candidate artifact |
| 4 | Inspect diagnostics and run validation | Repair only reported defects | Fail closed on unknown or malformed grammar | A validated candidate |
| 5 | Answer the rendered worksheet | Help interpret, never impersonate the respondent | Maintain response state in memory | A reviewable response proposal |
| 6 | Preview, confirm, and create a packet | Check lineage and held effects | Create one immutable packet after confirmation | A vault-local intake candidate |
| 7 | Review projections and governance | Summarize evidence with uncertainty | Render bounded views and provenance | A human disposition |
| 8 | Carry accepted material downstream | Prepare a proposed mapping or change set | Export/copy only through explicit actions | Separately reviewed integration work |

## 1. Create a bounded context packet

Give the agent only the material it needs. Include the purpose, audience, sensitivity, source locators, desired artifact type, contract versions, constraints, and prohibited effects. Mark quoted source content as data. Do not place secrets, credentials, or material you are not permitted to disclose in a model prompt.

Use this request skeleton:

```text
Task: Draft one HCC worksheet candidate.
Purpose: [bounded outcome]
Audience: [who will answer or review it]
Sources: [exact files or pasted excerpts]
Sensitivity: [public, internal, or private]
Scale: [4, 8, or 16 meaningful questions]
Contracts: hcc-form@0.1-candidate.1 and hcc-interaction@0.3-candidate.1
Required kinds: [only kinds justified by the task]
Validation: return raw Markdown with YAML fences; preserve stable IDs; include config objects.
Held effects: no source mutation, submission, canonical write-back, publication, or invented approval.
Human gate: return a proposal for review.
```

When the agent is operating from the canonical Hearth & Code Hub, prefer the orchestration skill and let current Hub configuration resolve the destination. `$hearthandcode-governance-obsidian` works by name only after the harness has installed the skill; otherwise provide the exact trusted checkout path to its `SKILL.md`:

```text
Use $hearthandcode-governance-obsidian to create a governed [worksheet, workbook, or projection].
Read the Hub charter and direct sources first. Resolve one canonical owner and destination through current routing, wing ownership, path, and naming configuration. Validate the proposed path before writing. Keep the artifact a proposal or projection with verified false. Return the exact path, checks, Obsidian review route, and held effects.
```

Do not hard-code a remembered wing merely to make the prompt shorter. The active Hub configuration and destination local charter control the route.

## 2. Ask for inspectable output

Ask the agent to return complete Markdown, not screenshots or a prose description of a form. Every interaction needs a stable ID, supported version, supported kind, prompt, `config` object, response object, and visibility. Every form must list its sections and required interactions explicitly. A workbook must list exact worksheet references rather than discover a folder.

## 3. Validate before interpretation

Paste the candidate into a disposable or explicitly chosen vault note. Keep the YAML source visible when a block fails. Use **Validate active worksheet contract** or the authoring API self-test for the relevant surface. A valid parse proves contract shape, not truth, quality, safety, review, or authority.

If validation fails:

1. preserve the failing source and diagnostic;
2. repair only the addressed path;
3. rerun validation;
4. compare the repaired semantics with the original intent.

## 4. Collect responses without authority inflation

The rendered control is a companion to its YAML source. The respondent answers, defers, marks not applicable, adds context, and reviews the proposal. In-memory responses are temporary. Reloading or disabling the plugin can discard them unless the person creates a response packet.

The agent may help summarize a completed packet, but it must not invent an author, reviewer, timestamp, verification state, or response. AI-generated answer suggestions must remain visibly distinct from human-entered responses.

## 5. Preserve immutable response evidence

Use the normal worksheet response route in four steps:

1. answer the worksheet and optionally review, prepare, or copy its YAML;
2. choose **Create immutable packet** and inspect the displayed path and digest;
3. choose **Confirm and create packet** to create and read-back verify the exact preview; and
4. paste the automatically copied locator into the agent conversation only when downstream review is intended.

Use **Load or amend packet** for explicit reload and successor work. Amend by creating a successor with a reason, never by overwriting.

Packets live under `Intake/HCC Responses/` in the current vault. They are candidate intake, not canonical records.

## 6. Review projections

Use views for orientation, comparison, sequence, distribution, or relationships. A chart must retain a title, summary, source binding, and accessible data table. A projection never replaces its source. If a view would obscure uncertainty or imply causality the data does not support, use a table or prose instead.

## 7. Return accepted material to a knowledge system

The plugin has no automatic knowledge-system write-back. Treat downstream integration as a separate operation:

1. receive one immutable packet locator explicitly from the human;
2. verify the worksheet source and packet lineage;
3. map response IDs to the destination schema;
4. produce a proposed change set or intake record;
5. validate destination paths, types, authority, and privacy;
6. obtain the destination's required human gate;
7. apply through that system's own governed writer;
8. preserve a receipt linking source packet, transformation, result, and unresolved findings.

In the Hearth & Code Hub, `$hearthandcode-governance-obsidian` performs the orientation and proposal portion of this route. It still cannot admit the packet, bypass the Hub path validator, infer a destination, or exercise a canonical writer without the applicable separate release.

## 8. Optimize the workflow

- Prefer four questions for orientation, eight for a bounded review, and sixteen only for genuinely independent lenses.
- Separate authoring, answering, validation, and admission. Combining them makes errors hard to attribute.
- Use one-question presentation for focused intake and the expanded navigator for audit or correction work.
- Keep stable interaction IDs across wording revisions when response meaning is compatible.
- Version changed semantics and document migration instead of silently reusing an ID.
- Keep raw source, rendered view, packet, and downstream record independently inspectable.
- Automate structural checks; retain human judgment for meaning, disclosure, authority, and acceptance.
- Test every integration first with synthetic data and a disposable vault.

## Completion test

The workflow is ready for real local use when a person can: ask an agent for a candidate; inspect and validate it; answer it; create and reload an immutable packet; create a successor amendment; review a projection; and prepare a separate downstream mapping without any hidden scan, overwrite, network call, or automatic canonical write.
