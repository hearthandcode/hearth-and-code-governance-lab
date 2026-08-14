# Grammar Example Catalog

Status: sixteen-route candidate example index. Each route points to source-visible Markdown in the disposable scratch vault; examples remain non-admitted candidates unless their contract says otherwise.

## Four interaction foundations

| # | Pattern | Source | What to inspect |
|---:|---|---|---|
| 01 | candidate long-text | `scratch-vault/Worksheets/01 Guided Orientation.md` | bounded multiline response |
| 02 | candidate short-text | `scratch-vault/Worksheets/01 Guided Orientation.md` | compact input and stable ID |
| 03 | candidate dropdown | `scratch-vault/Worksheets/01 Guided Orientation.md` | one value from declared options |
| 04 | candidate multi-select | `scratch-vault/Worksheets/02 Agent Authoring Request.md` | multiple declared values |

## Four structured inputs

| # | Pattern | Source | What to inspect |
|---:|---|---|---|
| 05 | numeric stepper | `scratch-vault/Worksheets/02 Agent Authoring Request.md` | min, max, and step |
| 06 | boolean choice | `scratch-vault/Worksheets/03 Response Lifecycle Practice.md` | explicit true and false labels |
| 07 | ranked choice | `scratch-vault/Worksheets/01 Guided Orientation.md` | complete reorder-only list and insertion feedback |
| 08 | matrix | `scratch-vault/Worksheets/04 Integration Readiness Review.md` | row-scoped radio state and required rows |

## Four composition routes

| # | Pattern | Source | What to inspect |
|---:|---|---|---|
| 09 | response lifecycle | `scratch-vault/Worksheets/03 Response Lifecycle Practice.md` | preview, locator, reload, and successor concepts |
| 10 | worksheet contract | `scratch-vault/Worksheets/04 Integration Readiness Review.md` | stable interaction references and completion set |
| 11 | workbook manifest | `scratch-vault/Workbooks/Governance Lab Guided Workbook.md` | exact paths and sequential navigation |
| 12 | synthetic response packet | `tests/writer-core.test.ts` | immutable intake authority, strict packet shape, and prohibited effects |

## Four visualization routes

| # | Pattern | Source | What to inspect |
|---:|---|---|---|
| 13 | timeline | `scratch-vault/00 Start Here.md` | ordered guided workflow |
| 14 | network | `scratch-vault/Guided Tour/07 Review Projections and Governance.md` | explicit source-to-target relations |
| 15 | table | `scratch-vault/Guided Tour/08 Integrate with a Knowledge System.md` | direct row representation and accessible fallback |
| 16 | additional views | `docs/reference/catalog.md` | choose semantics before appearance |

## Use procedure

Open the source route, copy only the relevant fence, change IDs and semantics deliberately, preserve the pinned version and complete response shape, then run the authoring API self-test plus the appropriate parser. Do not treat a working example as authority for a new taxonomy or effect.
