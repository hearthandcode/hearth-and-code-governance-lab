# Lesson 3: Create a first form

## Goal

Create one source-visible question, wrap it in one worksheet, validate it, and test both Obsidian rendering modes.

## 1. Write the interaction

````markdown
```hcc-interaction
version: 0.3-candidate.1
id: project-purpose
kind: short_text
prompt: What should this project make easier to decide?
config: { min_length: 1, max_length: 256 }
response: { value: null, note: null, state: unanswered, author: null, responded_at: null }
visibility: private
```
````

## 2. Add the worksheet contract

Place this contract in the same Markdown note. The interaction ID must match exactly.

````markdown
```hcc-form
version: 0.1-candidate.1
id: project-orientation
title: Project orientation
purpose: Capture one decision-changing project purpose.
privacy: private
sections:
  - { id: purpose, title: Purpose, interactions: [project-purpose] }
completion:
  required: [project-purpose]
governance:
  authority_refs: []
  review_required: true
  verification_required: false
```
````

## 3. Validate and review

1. Confirm IDs and versions against `docs/reference/grammar.md`.
2. In repository mode, use the authoring API and run relevant tests.
3. In Reading view, enter an answer and choose **Review response**.
4. Confirm the proposal leaves author, timestamp, payload digest, and idempotency key null.
5. In Live Preview, enter and leave both fences to confirm source return.
6. Test Tab, Shift+Tab, visible focus, 200 percent zoom, and a narrow pane.
7. Confirm **Prepare final review** reports any missing required answer.
8. Clear the temporary answer unless this is an authorized intake worksheet.

## Screenshot slot

Future real image `02-first-form` must use synthetic text and show the prompt, primary input, compact review action, and shaded reading surface without response content.
