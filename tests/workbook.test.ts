import { describe, expect, it } from "vitest";

import { EphemeralWorkbookSessions } from "../src/workbook/session";
import { parseWorkbook, parseWorksheet } from "../src/workbook/parse";
import { parseResponsePacket } from "../src/writer";
import { dump } from "js-yaml";

const worksheetSource = `
version: 0.1-candidate.1
id: shaping-orientation
title: Shaping orientation
purpose: Capture a bounded orientation before downstream work is proposed.
privacy: private
sections:
  - id: orientation
    title: Orientation
    interactions: [project-purpose, intended-outcome]
  - id: constraints
    title: Constraints
    interactions: [known-constraints]
completion:
  required: [project-purpose, intended-outcome]
workbook_ref: Workbooks/Project Shaping
governance:
  authority_refs: ["[[Reference Notes/01 Protocol Source]]"]
  review_required: true
  verification_required: false
`;

const workbookSource = `
version: 0.1-candidate.1
id: project-shaping
title: Project shaping workbook
purpose: Shape downstream work through explicit worksheets.
worksheets:
  - id: orientation
    label: Orientation
    ref: Worksheets/01 Orientation
  - id: constraints
    label: Constraints
    ref: Worksheets/02 Constraints
navigation: sequential
governance:
  authority_refs: ["[[Reference Notes/01 Protocol Source]]"]
  review_required: true
`;

describe("worksheet and workbook contracts", () => {
  it("strictly parses an explicit worksheet composition", () => {
    const result = parseWorksheet(worksheetSource);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.worksheet.sections.flatMap((section) => section.interactions)).toEqual([
      "project-purpose", "intended-outcome", "known-constraints"
    ]);
  });

  it("strictly parses an explicit workbook manifest", () => {
    const result = parseWorkbook(workbookSource);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.workbook.worksheets).toHaveLength(2);
    expect(result.workbook.navigation).toBe("sequential");
  });

  it("rejects unknown fields, duplicate interactions, undeclared required IDs, and unsafe paths", () => {
    expect(parseWorksheet(`${worksheetSource}\nrun: now\n`).ok).toBe(false);
    expect(parseWorksheet(worksheetSource.replace("interactions: [known-constraints]", "interactions: [project-purpose]")).ok).toBe(false);
    expect(parseWorksheet(worksheetSource.replace("required: [project-purpose, intended-outcome]", "required: [missing]")).ok).toBe(false);
    expect(parseWorkbook(workbookSource.replace("Worksheets/01 Orientation", "../Outside")).ok).toBe(false);
  });
});

describe("ephemeral worksheet sessions", () => {
  const times = [
    new Date("2026-08-10T12:00:00.000Z"),
    new Date("2026-08-10T12:01:00.000Z"),
    new Date("2026-08-10T12:02:00.000Z"),
    new Date("2026-08-10T12:03:00.000Z")
  ];

  it("collects responses in memory and prepares held draft/final packets", () => {
    let index = 0;
    const sessions = new EphemeralWorkbookSessions(() => times[Math.min(index++, times.length - 1)]!);
    const parsed = parseWorksheet(worksheetSource);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    sessions.binding("Worksheets/01 Orientation.md", "project-purpose").update(
      { value: "Orient the project", note: null, state: "answered", author: null, responded_at: null },
      "short_text",
      "0.3-candidate.1"
    );
    const progress = sessions.progress("Worksheets/01 Orientation.md", parsed.worksheet);
    expect(progress.answered).toBe(1);
    expect(progress.missingRequired).toEqual(["intended-outcome"]);

    const draft = sessions.draftProposal("Worksheets/01 Orientation.md", parsed.worksheet);
    expect(draft.effects.persistence).toBe("prohibited-step-8-held");
    expect(draft.respondent).toBeNull();
    const final = sessions.finalProposal("Worksheets/01 Orientation.md", parsed.worksheet);
    expect(final.immutable).toBe(true);
    expect(final.review.required_complete).toBe(false);
    expect(final.downstream.canonical_write_back).toBe("prohibited");
  });

  it("discards only plugin-memory responses", () => {
    const sessions = new EphemeralWorkbookSessions(() => times[0]!);
    const binding = sessions.binding("Worksheet.md", "question");
    binding.update({ state: "answered", value: "x" }, "short_text", "candidate");
    expect(sessions.hasResponses("Worksheet.md")).toBe(true);
    sessions.discard("Worksheet.md");
    expect(sessions.hasResponses("Worksheet.md")).toBe(false);
  });

  it("binds a persistable packet to the source digest and forks a new successor identity without losing responses", () => {
    const sessions = new EphemeralWorkbookSessions(() => times[0]!);
    const parsed = parseWorksheet(worksheetSource); expect(parsed.ok).toBe(true); if (!parsed.ok) return;
    const path = "Worksheets/01 Orientation.md";
    sessions.binding(path, "project-purpose").update(
      { value: "Orient", note: null, state: "answered", author: null, responded_at: null }, "short_text", "0.3-candidate.1"
    );
    sessions.binding(path, "intended-outcome").update(
      { value: "Ship", note: null, state: "answered", author: null, responded_at: null }, "short_text", "0.3-candidate.1"
    );
    const digest = `sha256:${"a".repeat(64)}`;
    const root = sessions.finalProposal(path, parsed.worksheet, { sourceDigest: digest, persistence: "vault-local-create-only" });
    expect(root.worksheet_binding.source_digest).toBe(digest);
    expect(root.effects.persistence).toBe("vault-local-create-only");
    expect(parseResponsePacket(dump(root, { lineWidth: -1, noRefs: true })).ok).toBe(true);
    sessions.beginSuccessor(path);
    const successor = sessions.finalProposal(path, parsed.worksheet, { sourceDigest: digest, persistence: "vault-local-create-only" });
    expect(successor.session_id).not.toBe(root.session_id);
    expect(successor.responses).toEqual(root.responses);
  });
});
