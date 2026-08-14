# Provider-Neutral Exchange Contract

Status: C6 candidate `0.1-candidate.1`. It supports manual clipboard export and in-memory paste/import only.

## Purpose and boundary

An `hcc-exchange` fence assembles a fixed, digest-verified prompt packet from explicitly embedded source data. The plugin copies that packet only after a user presses **Build and copy prompt packet**. It does not choose or call a provider, read a declared path, store credentials, use the network, or persist an import.

The user chooses whether and where to paste copied data. Every source and the whole exchange must explicitly declare `manual-copy-approved`; the destination is `user-selected`, provider is `not-bound`, and retention is `unknown`. `restricted` source data is not admitted. These declarations make disclosure visible but do not determine whether a particular third-party destination is appropriate.

## Exact grammar

The top-level fields are `version`, `id`, `title`, `purpose`, `request`, `context`, `handling`, `output`, and `governance`. Unknown fields fail closed.

- `request.task` is 1–4,096 characters.
- `request.constraints` contains 1–16 strings of at most 1,024 characters each.
- `context.sources` contains 1–8 explicit entries.
- Each source has `id`, vault-relative Markdown `path`, SHA-256 `digest`, `source|evidence` authority, `public|internal|private` sensitivity, `manual-copy-approved` disclosure, and 1–16,384 characters of embedded `content`.
- Combined embedded source content is capped at 65,536 characters.
- Output is exactly raw YAML for `hcc-studio@0.1-candidate.1`.
- Authority is `proposal-only`; human review is required; network and persistence are prohibited.

The declared path is provenance text. C6 never opens or reads it. Before export, runtime SHA-256 is computed over each embedded content string and compared with its declared digest. Any mismatch holds the entire prompt.

## Export envelope

The JSON prompt packet contains identity, the human-authored task and constraints, fixed source-data and authority boundaries, an ordered source-set digest, copied source entries, the output contract, disclosure handling, and explicit non-effects. Source text remains inert data even if it contains instructions. The packet tells a downstream model to treat it as quoted data, but no prompt can guarantee provider behavior. Deterministic import validation and human review remain mandatory.

## Import route

**Paste returned candidate YAML** accepts at most 262,144 UTF-8 bytes in plugin memory. Markdown code fences are rejected. Raw YAML is parsed by the accepted C5 studio parser; unknown fields, authority escalation, broken references, invalid migrations, and invalid transitions produce field-addressed diagnostics. A valid candidate is rendered through the same proposal-only studio surface.

Reload, disable, clear, or navigation may discard pasted content. C6 creates no response packet and has no file or frontmatter writer. A successful parse means only structurally valid proposal data, never review, verification, admission, migration execution, or workflow advancement.

## Provider-adapter exclusion

No direct adapter exists. A later adapter would require independent gates for provider identity, authentication, disclosure, privacy, retention, cost, rate limits, network behavior, prompt injection, logging, error recovery, and revocation. C6 admission cannot authorize that later effect.

Pure callers may use `HCC_AUTHORING_API.parseExchange`, `buildExchangePrompt`, and `validateExchangeImport`. The builder accepts an injected SHA-256 function and returns prompt bytes; it never copies or sends them itself.
