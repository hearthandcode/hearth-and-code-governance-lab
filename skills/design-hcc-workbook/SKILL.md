---
name: design-hcc-workbook
description: Design and validate power-of-two HCC worksheets and workbooks for governed intake, review, project shaping, or release decisions. Use when an agent must decompose a subject into questions, choose worksheet boundaries, create `hcc-form` and `hcc-workbook` contracts, define navigation and completion gates, or produce a reusable evaluation workbook.
---

# Design an HCC workbook

Turn a broad subject into a bounded sequence of source-visible worksheets without padding, hidden dependencies, or automatic downstream effects.

## Frame four dimensions

1. Subject: state the exact knowledge, decision, or evidence boundary.
2. Response: select input semantics that capture it without coercion.
3. Governance: bind source, privacy, authority, review owner, and effect ceiling.
4. Projection: select the smallest summary or view that improves review.

## Choose scale

- Use one question for one consequential answer.
- Use four questions for a compact orientation.
- Use eight questions for a bounded cross-functional review.
- Use sixteen distinct lenses for release or architecture review.
- Use two, four, or eight worksheets for a coherent workbook.
- Treat 128 interactions as a workbook-level ceiling, not one worksheet target.
- Split whenever there are multiple human gates, source authorities, privacy classes, or downstream owners.
- Never add filler merely to reach a power of two.

## Build each worksheet

1. Give it one stable ID, title, purpose, privacy class, and review outcome.
2. Write plain Markdown orientation and explicit held effects.
3. Declare interactions before the form that references them.
4. Put each interaction in exactly one declared section.
5. Put only genuinely required IDs in `completion.required`.
6. Prefer matrix rows for stable lenses and repeatable groups for user-created findings.
7. Include one context field when uncertainty, defects, or recovery matter.
8. End with one disposition that controls the next bounded stage.

## Build the workbook

1. Declare every worksheet path explicitly.
2. Use sequential navigation only when a later worksheet depends on earlier answers.
3. Otherwise use free navigation and describe independence.
4. Keep the manifest full-width, table-like, and action sizes consistent.
5. Preserve useful titles and instructions without the plugin.
6. Keep responses separate by worksheet; never imply an automatic merge.

## Validate and review

Use `HCC_AUTHORING_API.parseWorksheet` and `parseWorkbook` in repository mode. Run `npm run proof` for release-facing work. In Obsidian, check Reading view, Live Preview, keyboard focus, narrow panes, 200 percent zoom, completion behavior, navigation, and exact final-review YAML.

## Handoff

Return the workbook map, worksheet paths, interaction counts, power-of-two rationale, validation evidence, privacy and authority boundary, open human gates, and one next review action. Do not claim that generated questions are answered or admitted.
