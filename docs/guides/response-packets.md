# Immutable Response Packets

Status: C3 prerelease guide for local immutable intake. This is not submission or canonical write-back.

## Purpose and boundary

Worksheet answers begin in plugin memory. The primary worksheet toolbar provides a two-click **Create immutable packet** action: the first click prepares the exact bytes and displays the target and digest; the second explicitly confirms creation, verifies the file by reading it back, and attempts to copy its locator. **Load or amend packet** opens the detailed controls only for reload, successor, or diagnostic work. The prototype identity is host-guarded to the vault named `scratch-vault`; the accepted public identity is bound to its currently open named local vault. Both use only `Intake/HCC Responses/`, and unknown plugin identities fail closed.

It cannot overwrite, append, rename, delete, search, scan, modify worksheet source or frontmatter, update a canonical system, contact a provider, or publish. A packet remains an immutable intake candidate even after read-back succeeds.

## Normal four-step lifecycle

1. Answer the worksheet. Use **Review worksheet**, **Prepare final packet**, or **Copy answer packet YAML** whenever those projections help; they are not mandatory save rituals.
2. Choose **Create immutable packet**. Inspect the exact path and digest displayed beside the toolbar. No file exists yet.
3. Choose the renamed **Confirm and create packet** action. Creation fails on collision, stale bytes, or failed read-back verification.
4. Paste the automatically copied two-line locator into the intended handoff. If clipboard access failed, choose **Load or amend packet** and use the manual **Copy reload locator** fallback.

After a reload or in a fresh worksheet session, choose **Load or amend packet**, paste the two-line locator, apply it, and choose **Load explicit packet**. Edit hydrated answers only through the immutable-successor route: state an amendment reason, preview, confirm, and create a separate revision. The predecessor remains byte-identical.

## Reload requirements

Reload is intentionally strict:

- the path must be one ASCII letter-or-digit-leading `.yaml` leaf directly under `Intake/HCC Responses/`;
- the expected digest must be lowercase `sha256:` plus sixty-four hexadecimal characters;
- packet, worksheet ID, worksheet path, worksheet digest, and declared interaction IDs must agree;
- a non-empty conflicting in-memory session blocks hydration; and
- the loader never lists the folder or searches for a likely packet.

The four text controls contain editable starter values. Select, clear, or replace them. Their compact **Copy** buttons copy current values, not placeholders.

## Failure and recovery

| Condition | Expected result | Recovery |
|---|---|---|
| Preview no longer matches answers or source | create fails stale | preview again and review the new bytes |
| Target path already exists | create fails closed | preserve the existing file and generate a new preview |
| Locator path or digest is malformed | no vault read | correct the exact two-line locator |
| Digest or worksheet binding differs | hydration is refused | locate the correct externally preserved locator; do not scan |
| In-memory responses conflict | merge is refused | discard only after preserving any needed work, then reload |
| Plugin is disabled or reloaded before saving | session answers are lost | restore from an explicitly created packet |

The plugin deliberately has no packet deletion or repair operation. Use ordinary vault inspection for evidence and create an immutable successor for corrections.

## Verification route

Use [`Guided Tour/06 Preserve and Amend Responses`](../../scratch-vault/Guided%20Tour/06%20Preserve%20and%20Amend%20Responses.md) and [`Worksheets/03 Response Lifecycle Practice`](../../scratch-vault/Worksheets/03%20Response%20Lifecycle%20Practice.md). Automated writer, controller, adapter, and adversarial-corpus tests support this route but do not substitute for real Obsidian behavior.
