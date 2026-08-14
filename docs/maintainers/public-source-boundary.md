# Public Source Boundary

Status: local C8 preparation. The boundary creates no repository, commit, remote, hosted workflow, release, submission, or publication.

## Why the boundary exists

The development tree contains two different classes of material:

1. plugin source, public documentation, tests, and a synthetic disposable vault; and
2. immutable human response packets, internal review history, projectization records, local receipts, personal material, and Obsidian runtime state.

A public repository must be an explicit projection of the first class. Copying the development tree wholesale is prohibited.

## Source of truth

`config/public-source-policy.json` is a closed allowlist. It names exact root files and public directories, then excludes private or development-only descendants. Material absent from the allowlist cannot enter the projection by convenience.

The policy currently excludes:

- all `reviews/`, `docs/reviews/`, and `docs/projectization/` source roots;
- tests whose sole purpose is byte-preserving private response-packet evidence;
- the disposable vault's `.obsidian`, `Intake`, trash, and personal-guide paths;
- any hosted workflow before its separate activation gate.

Runtime writer, reload, security, accessibility, dashboard, studio, parser, renderer, and synthetic-vault tests remain in the public projection. Excluding private papertrail tests does not remove the underlying product tests.

## Deterministic proof

Run:

```bash
npm run proof:public-source
```

The verifier:

1. creates a temporary directory;
2. copies only allowlisted regular files and rejects symbolic links;
3. confirms prohibited roots and Obsidian runtime state are absent;
4. scans text for bounded home-path, response-session, attribution, private-key, and provider-token markers;
5. checks relative Markdown links inside the projection;
6. computes a deterministic path-and-byte projection digest;
7. installs locked dependencies offline;
8. runs the public projection's full local proof and production dependency audit;
9. hashes the three generated release assets; and
10. removes the temporary directory.

For the human disclosure gate, run:

```bash
npm run review:public-disclosure
```

This prepares a private, deterministic review packet under `reviews/phase-1.0/`. It groups every projected file into exactly eight power-of-two documentation and implementation categories, records byte counts and SHA-256 digests, preserves the complete excluded-path boundary, and asks eight disclosure questions. The packet is excluded from the public projection and cannot authorize Git, remote, CI, release, submission, or publication effects.

The public-mode audit and release validator are selected only by the absence of the private final-readiness evidence marker. They still enforce package identity, source effect boundaries, public documentation, build assets, and explicit release blockers. The private development tree additionally requires its internal projectization and receipt set.

## Human disclosure gate

Pattern scanning is not a proof that meaning is non-sensitive. Before any public remote is created, a human must review the exact projected file manifest, projection digest, public documentation, fixture semantics, screenshots, and release assets. Any ambiguity fails closed and returns to the allowlist.

Passing this proof means only that the present temporary projection is structurally reconstructable and did not match the bounded prohibited markers. It does not authorize Git mutation, a remote, CI, release, Community directory submission, or publication.

## Clean local repository candidate

After a human accepts one exact projection digest, materialize that same source boundary with:

```bash
npm run materialize:public-source -- /absolute/path/hearth-and-code-governance-lab
```

The target parent must already exist. The leaf must be exactly `hearth-and-code-governance-lab`, must not already exist, and must sit outside both the development tree and temporary proof tree. Materialization is refused in manifest-only mode.

The command first constructs the temporary allowlist projection and completes its offline installation, full proof, direct test-count collection, asset hashing, and production dependency audit. Only then does it create the target and copy the original allowlisted source files, excluding dependencies and generated vault runtime state. It re-reads the target and requires its file count and path-and-byte digest to match the proved projection. Any copy or verification failure removes only the newly created target.

The result is a clean local directory, not a Git repository. The command never runs `git init`, creates a remote, enables hosted workflows, publishes, releases, submits, or writes to a canonical knowledge system. Those effects remain separate gates.
