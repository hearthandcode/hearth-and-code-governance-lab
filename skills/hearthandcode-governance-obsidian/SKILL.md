---
name: hearthandcode-governance-obsidian
description: Route, author, validate, and hand off governed HCC worksheets, workbooks, interactions, and projections from a Hearth & Code Hub working directory into Obsidian-readable Markdown. Use when an agent is asked to create or revise a Hub-routed intake surface, build an Obsidian worksheet or workbook, generate an accessible HCC visualization, prepare an immutable-response workflow, or turn an explicit Hub source into a reviewable Governance Lab artifact without automatic canonical write-back.
---

# Operate Hearth & Code Governance Obsidian

Create source-visible governed artifacts in the canonical Hub route so an already-open Obsidian vault can render them for human review. Keep authoring, response capture, and canonical admission separate.

## Establish the operating boundary

1. Detect whether the working directory is the Hearth & Code Hub, the Governance Lab source repository, or an installed vault.
2. In the Hub, read root `AGENTS.md`, the current focus record, the direct task source, and the destination's local `AGENTS.md` before writing.
3. In the plugin repository, read `llms.txt`, `docs/reference/grammar.md`, and `docs/reference/catalog.md`.
4. In an installed vault, inspect only the expected plugin manifest and explicitly named notes. Do not enumerate plugins or response packets.
5. Stop if the root, source authority, destination, sensitivity, or requested effect is ambiguous.

## Select one artifact route

Classify the requested output before composing it:

- Use `hcc-interaction` for one governed input.
- Use `hcc-form` for one bounded worksheet.
- Use `hcc-workbook` for two, four, or eight explicitly named worksheets.
- Use `hcc-view` for an accessible static projection.
- Use `hcc-studio` for schema, vocabulary, migration, or workflow proposals.
- Use `hcc-exchange` only for manual digest-bound provider-neutral exchange.

Read the matching narrow skill when available:

- `../author-hcc-content/SKILL.md` for interactions and views;
- `../design-hcc-workbook/SKILL.md` for worksheets and workbooks;
- `../operate-hcc-responses/SKILL.md` for packet reload or amendment; and
- `../project-hcc-governance/SKILL.md` for dashboards, studio, exchange, and governance projections.

## Resolve the Hub destination

When the working directory is the Hub:

1. Classify artifact class, primary authority, sensitivity, audience, lifecycle, and source/proposal/projection state.
2. Resolve the wing and project home from the current governance routing, path registry, wing ownership, and naming configuration named by root `AGENTS.md`.
3. Give every artifact exactly one canonical owner. Link or project it from other wings rather than duplicating authority.
4. Read the destination local charter.
5. For a new or renamed governed artifact, run `python3 05-mechanism-annex--forge/scripts/hub-artifact-path.py propose ...`, then validate the exact candidate path.
6. Use collection-sequential naming only when the registered artifact family requires it. Never renumber existing material automatically.
7. Take a Wing 04 plan or review route if ownership or destination remains uncertain.
8. Do not modify `.obsidian`, plugin assets, workspace state, or settings to make a Markdown artifact appear.

The Hub path is the source path. If that Hub directory is already open as an Obsidian vault, the new Markdown appears through ordinary vault observation. Otherwise report the exact path for the human to open; do not install or reconfigure Obsidian implicitly.

## Author the review surface

1. Preserve required Hub frontmatter, authority labels, graph links, review state, and Recognition block.
2. Write plain Markdown orientation that remains useful when the plugin is absent.
3. Add source-visible HCC YAML fences with pinned contract versions, stable IDs, explicit `config` objects, empty reusable responses, privacy, and governance references.
4. Keep questions narrow and non-coercive. Prefer four for orientation, eight for bounded review, and sixteen only for distinct lenses.
5. Declare every worksheet path explicitly in a workbook. Never discover worksheets by scanning a folder.
6. Give every projection a semantic title, summary, source binding, and accessible table equivalent.
7. State held effects near the action surface: rendering and response capture do not imply review, verification, submission, or canonical admission.
8. Never invent human answers, reviewer identity, timestamps, verification, or approval.

## Validate before handoff

1. Validate the Hub path with the configured path validator before creation or rename.
2. Validate YAML syntax and contract shape with repository parsers when they are locally available.
3. Run the narrowest relevant tests; use `npm run proof` only for release-facing plugin-source work.
4. In installed-vault mode, require visible Reading view or Live Preview rendering and preserve any diagnostic code and YAML path.
5. Confirm that the artifact remains intelligible with the plugin disabled.
6. Confirm no response packet, frontmatter mutation, provider call, Git action, network action, or canonical write-back occurred unless separately authorized.

## Guide the human review loop

Present this compact route:

1. Open the exact Markdown artifact in Obsidian.
2. Inspect source and rendered projection.
3. Answer and optionally use **Review worksheet**, **Prepare final packet**, or **Copy answer packet YAML**.
4. Choose **Create immutable packet**, inspect the displayed path and digest, then choose **Confirm and create packet**.
5. Return the automatically copied two-line locator to the agent only when downstream review is desired.

Treat the returned packet as immutable intake evidence. Read only its explicitly named path after digest verification. Prepare a mapping, decision candidate, or proposed canonical change through the Hub's applicable intake and human-gate route. Never update a canonical source merely because a packet exists.

## Handoff

Report:

1. exact created or proposed Hub paths and their authority class;
2. source paths and digests used;
3. HCC surfaces, versions, IDs, and question scale;
4. path and grammar validation results;
5. the exact Obsidian review route;
6. held effects and prohibited automatic write-back; and
7. one bounded next human action.
