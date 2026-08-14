---
name: operate-hcc-responses
description: Guide safe creation, explicit digest-verified reload, and immutable successor amendment of HCC worksheet response packets in an authorized Obsidian vault. Use when a human wants to preserve answers, reload a named packet, diagnose locator rejection, amend responses without overwrite, verify lineage, or recover after plugin reload.
---

# Operate HCC responses

Preserve answers as immutable intake candidates while keeping every read and write explicit, bounded, and reversible through lineage.

## Establish authority

1. Confirm the plugin is already installed under one expected identity.
2. Confirm the human named the worksheet and intended packet operation.
3. Require explicit authority before any packet creation.
4. Treat reload as a read of one named path, never permission to search.
5. Treat every existing packet as immutable.
6. Stop if the vault, plugin identity, target folder, or requested effect is ambiguous.

## Create an initial packet

1. Complete the worksheet; use review, preparation, and YAML copy actions only when useful.
2. Choose **Create immutable packet**.
3. Inspect the exact path and digest shown beside the primary toolbar; no file exists yet.
4. Choose **Confirm and create packet** for that exact preview.
5. Require read-back verification.
6. Confirm the two-line locator was copied automatically.
7. If clipboard access failed, open **Load or amend packet** and use the manual locator copy.
8. Preserve the locator outside plugin memory.

## Reload explicitly

1. Require exactly `packet_path` and `packet_digest`.
2. Require one `.yaml` leaf directly under `Intake/HCC Responses/`.
3. Require lowercase `sha256:` plus sixty-four hexadecimal characters.
4. Paste the locator into the editable locator block and apply it.
5. Inspect the populated path and digest before loading.
6. Load only into an empty compatible worksheet session.
7. Stop on packet, digest, worksheet, source, interaction, or version mismatch.
8. Never scan for an alternative packet.

## Amend immutably

1. Change only intended hydrated answers.
2. Enter a substantive amendment reason.
3. Preview the separate successor path and exact YAML.
4. Verify predecessor path, digest, root identity, and incremented revision.
5. Confirm and create once.
6. Require read-back verification.
7. Re-hash or otherwise inspect the predecessor if the review protocol requires it.
8. Preserve both locators.

## Fail closed

Do not overwrite, append, rename, delete, repair, merge implicitly, mutate worksheet/frontmatter, browse for packets, write to a canonical system, call a provider, or publish response contents. If unsaved memory is lost, recover only from an explicitly created packet.

## Handoff

Report packet and successor locators without response content, revision and predecessor evidence, read-back results, failures tested, unchanged predecessor status, held effects, and the exact human disposition still required.
