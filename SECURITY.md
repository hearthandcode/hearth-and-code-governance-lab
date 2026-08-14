# Security Policy

Status: prerelease candidate with a reviewed private reporting route.

## Supported state

Hearth and Code Governance Lab is an experimental prerelease. Security reports receive best-effort maintenance with no response-time promise. Do not use it for secrets, regulated records, legal signatures, or canonical submissions.

## Report a concern

Do not place vulnerability details in a public issue. Send a minimal, redacted report to `admin@hearthandcode.dev`, including the affected version, host platform, impact, reproduction conditions, and whether disclosure coordination is requested. Do not send vault contents, credentials, or unrelated personal data. Receipt and remediation are best-effort; no response-time or fix-time promise is made.

## Security boundary

- YAML is parsed as untrusted data with the JSON schema and unknown fields fail closed.
- Markdown cannot supply JavaScript, expressions, renderer modules, network locations, or HTML.
- Views may read only one validated, vault-relative source path and must match its declared SHA-256 digest.
- The response-packet provider has two explicit identities. `hcc-widget-lab` is host-guarded to the vault named `scratch-vault`; `hearth-and-code-governance-lab` is bound to its currently open named local vault; unknown identities fail closed. Both profiles may read one explicit digest-bound YAML packet and create one new immutable YAML packet under `Intake/HCC Responses/` after confirmation. The effect adapter admits exactly one generated ASCII `.yaml` leaf directly beneath that folder, verifies exact read-back bytes, and fails on collision.
- The plugin does not scan the vault, use the network, overwrite, append, rename, delete, mutate frontmatter or worksheet source, write to the Hub, or publish.
- Governance projections cannot assert human identity or set verification.
- Studio guards are closed declarative kinds rather than executable expressions; effects remain inert `proposal-only` data and transition inspection cannot advance state.
- Capability checks admit only declared render, narrow read, clipboard, and response-packet create effects.

These are architectural controls, not an operating-system sandbox. Obsidian plugins run with substantial host privilege; code review, dependency control, and release verification remain required.

See `docs/maintainers/threat-model.md` for threats, controls, and residual risks.
