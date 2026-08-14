# Lesson 5: Preserve, reload, and amend responses

## Goal

Exercise the only admitted write surface: explicit creation of new immutable worksheet response packets in the fixed vault-local Intake folder.

## Create

1. Complete the worksheet. **Review worksheet**, **Prepare final packet**, and **Copy answer packet YAML** remain optional inspection and handoff aids.
2. Choose **Create immutable packet** in the primary worksheet toolbar.
3. Inspect the exact target and SHA-256 digest shown beside the toolbar. No file exists yet.
4. Choose **Confirm and create packet**.
5. Require the status to report created, verified, and locator copied automatically.
6. Paste the locator into a temporary destination and confirm it contains exactly `packet_path` and `packet_digest`.
7. If clipboard copy failed, choose **Load or amend packet** and use **Copy reload locator**.
8. Confirm the detailed panel was unnecessary during the normal create path and that no canonical or external write occurred.

## Reload

1. Copy the two-line reload locator from the receipt.
2. Reload or disable and re-enable the plugin to clear memory.
3. Paste the locator into **Reload locator block**.
4. Choose **Apply reload locator**.
5. Inspect the populated path and digest fields.
6. Choose **Load explicit packet**.
7. Confirm answers return and the receipt identifies the expected revision.
8. Alter one digest character once and confirm reload fails before restoring the valid locator.

## Amend

1. Change one hydrated answer.
2. Enter a substantive amendment reason.
3. Preview the successor.
4. Confirm predecessor path, digest, root identity, and revision increment.
5. Confirm and create the successor.
6. Preserve both locators.
7. Confirm the predecessor remains byte-identical.
8. Return the successor to a human disposition rather than treating it as canonical.

## Never do

Do not scan for packets, overwrite or repair a packet, merge conflicting memory, alter worksheet source, delete evidence, or route an answer to a canonical system or provider automatically.

## Screenshot slot

Future real image `04-response-preview` must redact or avoid response values while showing digest, confirmation, create gating, and compact copy controls.
