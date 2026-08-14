---
name: author-hcc-content
description: Create, revise, and validate source-visible HCC interactions, forms, and static views in Markdown/YAML for Hearth and Code Governance Lab. Use when an agent is asked to add a question, build a form, select an input kind, compose an `hcc-interaction` or `hcc-view` fence, repair grammar diagnostics, or preserve an accessible plugin-disabled fallback.
---

# Author HCC content

Create the smallest valid HCC source that captures the requested semantics while keeping authority and effects explicit.

## Orient

1. Determine repository mode or installed-vault mode from `llms.txt`.
2. Read `docs/reference/grammar.md` and `docs/reference/catalog.md` in repository mode.
3. Read only the named Markdown note in vault mode.
4. Classify purpose, audience, privacy, authority, source, and required human decision.
5. Preserve existing prose, frontmatter, IDs, and fence order unless the task explicitly changes them.

## Select a surface

- Use one `hcc-interaction` for one question.
- Add `hcc-form` when several declared interactions need sections and completion rules.
- Add `hcc-view` only when a semantic table or graphic materially improves review.
- Use `0.1` only for released `choose_one`, `choose_many`, or `long_text` blocks.
- Use `0.3-candidate.1` for the expanded interaction catalog.
- Use `0.1-candidate.1` for forms and `0.2-candidate.1` for views.
- Stop with a proposal if the requested semantics have no admitted kind.

## Compose

1. Write useful plain Markdown orientation before the fence.
2. Assign a unique stable lowercase interaction ID.
3. Choose the narrowest honest interaction kind.
4. Declare all options, rows, columns, fields, ranges, and limits explicitly.
5. Retain `response: { value: null, note: null, state: unanswered, author: null, responded_at: null }` in reusable templates.
6. Add the interaction ID to one form section and to `completion.required` only when required.
7. Preserve privacy and governance references.
8. Provide text or table semantics for every visual projection.

## Validate

In repository mode, use the narrowest parser from `HCC_AUTHORING_API`, then run relevant tests. Run `npm run proof` before a release-facing handoff. In vault mode, state that source validation remains pending unless the plugin visibly renders the fence without diagnostics.

Reject rather than normalize:

- unknown top-level fields, versions, or kinds;
- duplicate IDs or missing references;
- response values embedded in reusable templates;
- executable HTML, JavaScript, expressions, commands, or remote data;
- inferred authorship, verification, persistence, or canonical status;
- inaccessible meaning carried only by color, position, or placeholder text.

## Handoff

Return:

1. outcome and exact changed or proposed paths;
2. contract versions and selected kinds;
3. actual validation command and result;
4. assumptions and unresolved diagnostics;
5. held effects, including persistence and canonical apply; and
6. one exact Reading view and Live Preview review action.
