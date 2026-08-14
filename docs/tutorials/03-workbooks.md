# Lesson 4: Compose a workbook

## Goal

Split a broad process into explicit worksheet files and give the human a coherent navigation surface.

## Four-part default

1. Orientation: purpose, scope, sources, and constraints.
2. Evidence: observations, findings, and alternatives.
3. Disposition: keep, revise, defer, or reject decisions.
4. Acceptance: defects, readiness, and exact next gate.

Use two worksheets for a small dependent pair or eight for a program with genuinely distinct constraints, risks, and routing. Do not pad.

## Workbook fence

````markdown
```hcc-workbook
version: 0.1-candidate.1
id: project-shaping-workbook
title: Project shaping workbook
purpose: Move from orientation through evidence to one bounded acceptance decision.
navigation: sequential
worksheets:
  - { id: orientation, title: 1. Orientation, path: Worksheets/01 Orientation.md, required: true }
  - { id: evidence, title: 2. Evidence, path: Worksheets/02 Evidence.md, required: true }
  - { id: disposition, title: 3. Disposition, path: Worksheets/03 Disposition.md, required: true }
  - { id: acceptance, title: 4. Acceptance, path: Worksheets/04 Acceptance.md, required: true }
governance:
  review_required: true
  canonical_write_back: false
```
````

## Eight-step review

1. Confirm every path names one intended Markdown file.
2. Confirm each file declares the expected form ID and one bounded purpose.
3. Confirm later worksheets genuinely depend on earlier results before choosing sequential navigation.
4. Confirm required status is meaningful rather than decorative.
5. Inspect the manifest in Reading view at full and narrow widths.
6. Confirm every action has a consistent size and descriptive accessible name.
7. Navigate forward and back, then focus a widget and repeat keyboard navigation.
8. Confirm no worksheet response is merged or written merely by navigation.

## Screenshot slot

Future real image `03-workbook` must show a synthetic four-row manifest with consistent status, path context, and actions.
