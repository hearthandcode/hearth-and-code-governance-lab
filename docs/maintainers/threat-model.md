# Threat Model

## Assets and boundaries

Assets include note contents, response values, immutable response packets, source provenance, review/verification state, filesystem paths, plugin integrity, and the user's trust in rendered projections. Trust boundaries are Markdown YAML, explicit source files, the fixed response-packet folder, Obsidian APIs, dependencies, the clipboard, and any future external adapter.

## Threats and current controls

| Threat | Current control | Residual risk / next evidence |
|---|---|---|
| YAML code or object construction | `js-yaml` JSON schema; no dynamic evaluation; sixteen malformed, tagged, prototype-shaped, multi-document, oversized, and authority-changing packet cases | broader generative fuzzing |
| HTML/script injection | DOM creation with `textContent`; no `innerHTML`; sixteen hostile strings remain inert across candidate, visualization, workbook, diagnostic, dashboard, and studio renderers in ninety-six cases | browser-engine fuzzing and future-renderer review |
| dashboard overcollection | selected active body plus capped explicit one-hop metadata only; no file enumeration, tag search, linked-body read, or persistent cache; restricted records excluded before selection | real-host API tracing and vocabulary review |
| path traversal or hidden source discovery | validated relative path; exact read only; digest match; sixty-four-case adversarial adapter corpus; cross-platform-invalid characters and reserved names rejected; effect adapter accepts one fixed folder plus one generated ASCII leaf only | real-host case-sensitivity and symlink behavior |
| stale or substituted data | declared SHA-256 checked before rendering | source-update UX and digest tooling |
| hidden or misdirected persistence | dedicated capability; fixed folder; explicit confirmation; create-only collision; exact read-back; scoped source audit | real-host API spies and crash/interruption canary |
| stale behavior after disable/re-enable | unload clears pending previews, interaction refreshers, dashboard leaves, and the global presentation class; render/event subscriptions use host disposables | real-host lifecycle and interruption receipt |
| packet substitution or stale reload | strict two-field locator parser plus explicit path, expected packet digest, and current worksheet source digest | locator custody and real-host paste/reload evidence |
| authority escalation | review/verification remain separate; no self-verification | adversarial governance packet tests |
| denial of service from large blocks | option, matrix, repeatable, relation caps | measured parse/render/memory budgets |
| dependency or release compromise | lockfile, offline audit, proposed CI/reproducibility | automated updates, provenance/signing policy |
| privacy leakage | no network/telemetry; unsaved values stay session-local; saved packets are visible local YAML with explicit action | vault sync/backup boundary remains user-controlled |
| extension effect escalation | descriptor effect subset validation | registration API tests and maintainer ownership |
| workflow or schema authority escalation | closed guard/effect vocabularies; proposal-only governance; reference validation; HumanGates fixed to human; transition inspection always prohibits advancement | semantic-owner review and future evaluator threat model |
| destructive or lossy migration | mappings are inert; drop requires breaking compatibility, a loss report, and reversal text | representative multi-version migrations and human admission |

## Future high-risk surfaces

Persistence outside the fixed create-only packet canary, frontmatter mutation, external return intake, secret input, signature, media, geolocation, network sources, and third-party renderers each require a separate reviewed threat model. They are not authorized by this document.
