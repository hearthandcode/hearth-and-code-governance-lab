// @vitest-environment happy-dom

import { dump } from "js-yaml";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EphemeralWorkbookSessions, parseWorksheet, renderWorksheet } from "../src/workbook";
import { applyWorksheetPresentation } from "../src/workbook/render";
import { DEFAULT_HCC_SETTINGS } from "../src/settings";

const worksheetSource = `version: 0.1-candidate.1
id: copy-proof
title: Copy proof
purpose: Verify exact prepared YAML clipboard output.
privacy: private
sections: [{ id: review, title: Review, interactions: [answer] }]
completion: { required: [] }
governance: { authority_refs: [], review_required: true, verification_required: false }
`;

beforeEach(() => document.body.replaceChildren());

function reviewAndFinalize(container: HTMLElement): void {
  const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>("button"));
  buttons.find((item) => item.textContent === "Review worksheet")!.click();
  buttons.find((item) => item.textContent === "Mark answers finalized")!.click();
}

describe("worksheet prepared packet clipboard", () => {
  it("copies the exact YAML displayed in the prepared block", async () => {
    const parsed = parseWorksheet(worksheetSource); expect(parsed.ok).toBe(true); if (!parsed.ok) return;
    const now = () => new Date("2026-08-11T12:00:00.000Z");
    const sessions = new EphemeralWorkbookSessions(now);
    const copyText = vi.fn<(value: string) => Promise<void>>().mockResolvedValue(undefined);
    const container = document.createElement("div"); document.body.append(container);
    renderWorksheet(container, parsed.worksheet, "Worksheets/Copy Proof.md", sessions, { copyText });
    const prepare = Array.from(container.querySelectorAll("button")).find((item) => item.textContent === "Prepare final packet");
    prepare?.click();
    const displayed = container.querySelector(".hcc-widget__copyable-block code")?.textContent;
    const expected = dump(sessions.finalProposal("Worksheets/Copy Proof.md", parsed.worksheet), { lineWidth: -1, noRefs: true });
    expect(displayed).toBe(expected);
    const copy = Array.from(container.querySelectorAll("button")).find((item) => item.textContent === "Copy block");
    copy?.click();
    await vi.waitFor(() => expect(copyText).toHaveBeenCalledWith(expected));
    expect(copy?.textContent).toBe("Copied");
    expect(container.querySelector(".hcc-widget__copy-status")?.textContent).toContain("copied to the clipboard");
  });

  it("copies the complete answer packet directly from the primary worksheet actions", async () => {
    const parsed = parseWorksheet(worksheetSource); expect(parsed.ok).toBe(true); if (!parsed.ok) return;
    const sessions = new EphemeralWorkbookSessions(() => new Date("2026-08-11T12:00:00.000Z"));
    const copyText = vi.fn<(value: string) => Promise<void>>().mockResolvedValue(undefined);
    const container = document.createElement("div"); document.body.append(container);
    renderWorksheet(container, parsed.worksheet, "Worksheets/Copy Proof.md", sessions, { copyText });
    const directCopy = Array.from(container.querySelectorAll<HTMLButtonElement>(".hcc-workbook__primary-actions button"))
      .find((item) => item.textContent === "Copy answer packet YAML")!;
    directCopy.click();
    const expected = dump(sessions.finalProposal("Worksheets/Copy Proof.md", parsed.worksheet), { lineWidth: -1, noRefs: true });
    await vi.waitFor(() => expect(copyText).toHaveBeenCalledWith(expected));
    expect(container.querySelector(".hcc-workbook__proposal code")?.textContent).toBe(expected);
  });

  it("gates vault preview behind review and finalization and invalidates it when an answer changes", () => {
    const parsed = parseWorksheet(worksheetSource); expect(parsed.ok).toBe(true); if (!parsed.ok) return;
    const sessions = new EphemeralWorkbookSessions(() => new Date("2026-08-11T12:00:00.000Z"));
    const container = document.createElement("div"); document.body.append(container);
    renderWorksheet(container, parsed.worksheet, "Worksheets/Copy Proof.md", sessions, {
      responsePackets: { saveInitial: vi.fn(), load: vi.fn(), saveAmendment: vi.fn() }
    });
    const controls = Array.from(container.querySelectorAll<HTMLButtonElement>("button"));
    const finalize = controls.find((item) => item.textContent === "Mark answers finalized")!;
    const preview = controls.find((item) => item.textContent === "Preview new packet")!;
    expect(finalize.disabled).toBe(true);
    expect(preview.disabled).toBe(true);
    controls.find((item) => item.textContent === "Review worksheet")!.click();
    expect(finalize.disabled).toBe(false);
    finalize.click();
    expect(preview.disabled).toBe(false);
    sessions.binding("Worksheets/Copy Proof.md", "answer").update({ value: "changed", state: "answered" }, "short_text", "0.3-candidate.1");
    expect(preview.disabled).toBe(true);
    expect(container.querySelector(".hcc-workbook__release-status")?.textContent).toContain("An answer changed");
    expect(container.querySelectorAll('.hcc-workbook__release-stage[data-hcc-complete="true"]')).toHaveLength(1);
  });

  it("creates and verifies a packet through the two-click primary action and opens advanced controls only on request", async () => {
    const parsed = parseWorksheet(worksheetSource); expect(parsed.ok).toBe(true); if (!parsed.ok) return;
    const preview = {
      path: "Intake/HCC Responses/quick.yaml", digest: `sha256:${"f".repeat(64)}`, recordId: "quick", revision: 1,
      byteLength: 144, readBack: "not-run" as const, result: "previewed" as const, yaml: "quick: true\n"
    };
    const saveInitial = vi.fn().mockImplementation(async (confirmed: boolean) => confirmed
      ? { ...preview, readBack: "verified" as const, result: "created" as const }
      : preview);
    const copyText = vi.fn<(value: string) => Promise<void>>().mockResolvedValue(undefined);
    const container = document.createElement("div"); document.body.append(container);
    renderWorksheet(container, parsed.worksheet, "Worksheets/Copy Proof.md", new EphemeralWorkbookSessions(), {
      copyText, responsePackets: { saveInitial, load: vi.fn(), saveAmendment: vi.fn() }
    });
    const panel = container.querySelector<HTMLDetailsElement>(".hcc-workbook__packet-panel")!;
    const quick = Array.from(container.querySelectorAll<HTMLButtonElement>(".hcc-workbook__primary-actions button"))
      .find((item) => item.textContent === "Create immutable packet")!;
    expect(panel.open).toBe(false);
    quick.click();
    await vi.waitFor(() => expect(saveInitial).toHaveBeenCalledWith(false));
    await vi.waitFor(() => expect(quick.textContent).toBe("Confirm and create packet"));
    await vi.waitFor(() => expect(quick.disabled).toBe(false));
    expect(container.querySelector(".hcc-workbook__quick-packet-status")?.textContent).toContain(preview.digest);
    expect(panel.open).toBe(false);
    quick.click();
    await vi.waitFor(() => expect(saveInitial).toHaveBeenCalledWith(true, preview));
    await vi.waitFor(() => expect(quick.textContent).toBe("Packet created"));
    expect(container.querySelector(".hcc-workbook__quick-packet-status")?.textContent).toContain("locator copied automatically");
    expect(copyText).toHaveBeenCalledWith(`packet_path: ${preview.path}\npacket_digest: ${preview.digest}\n`);

    const secondContainer = document.createElement("div"); document.body.append(secondContainer);
    renderWorksheet(secondContainer, parsed.worksheet, "Worksheets/Other.md", new EphemeralWorkbookSessions(), {
      responsePackets: { saveInitial: vi.fn(), load: vi.fn(), saveAmendment: vi.fn() }
    });
    const advancedPanel = secondContainer.querySelector<HTMLDetailsElement>(".hcc-workbook__packet-panel")!;
    Array.from(secondContainer.querySelectorAll<HTMLButtonElement>(".hcc-workbook__primary-actions button"))
      .find((item) => item.textContent === "Load or amend packet")!.click();
    expect(advancedPanel.open).toBe(true);
    expect(document.activeElement).toBe(advancedPanel.querySelector<HTMLInputElement>('.hcc-workbook__packet-field input'));
  });

  it("surfaces explicit load, create-only save, locator copy, and immutable successor controls", async () => {
    const parsed = parseWorksheet(worksheetSource); expect(parsed.ok).toBe(true); if (!parsed.ok) return;
    const sessions = new EphemeralWorkbookSessions(() => new Date("2026-08-11T12:00:00.000Z"));
    const copyText = vi.fn<(value: string) => Promise<void>>().mockResolvedValue(undefined);
    const rootPreview = { path: "Intake/HCC Responses/root.yaml", digest: `sha256:${"a".repeat(64)}`, recordId: "root", revision: 1, byteLength: 128, readBack: "not-run" as const, result: "previewed" as const, yaml: "root: true\n" };
    const saveInitial = vi.fn().mockImplementation(async (confirmed: boolean) => confirmed ? { ...rootPreview, readBack: "verified", result: "created" } : rootPreview);
    const load = vi.fn().mockResolvedValue({ path: "Intake/HCC Responses/root.yaml", digest: `sha256:${"a".repeat(64)}`, recordId: "root", revision: 1, responseCount: 1 });
    const amendmentPreview = { path: "Intake/HCC Responses/next--r2.yaml", digest: `sha256:${"b".repeat(64)}`, recordId: "root", revision: 2, byteLength: 196, readBack: "not-run" as const, result: "previewed" as const, yaml: "revision: 2\n" };
    const saveAmendment = vi.fn().mockImplementation(async (_predecessor: unknown, _reason: string, confirmed: boolean) => confirmed ? { ...amendmentPreview, readBack: "verified", result: "created" } : amendmentPreview);
    const container = document.createElement("div"); document.body.append(container);
    renderWorksheet(container, parsed.worksheet, "Worksheets/Copy Proof.md", sessions, { copyText, responsePackets: { saveInitial, load, saveAmendment } });
    reviewAndFinalize(container);
    const controls = Array.from(container.querySelectorAll<HTMLButtonElement>("button"));
    const preview = controls.find((item) => item.textContent === "Preview new packet")!;
    preview.click();
    await vi.waitFor(() => expect(saveInitial).toHaveBeenCalledWith(false));
    const save = controls.find((item) => item.textContent === "Create previewed packet")!;
    await vi.waitFor(() => expect(container.querySelector(".hcc-workbook__packet-status")?.textContent).toContain("Preview ready"));
    await vi.waitFor(() => expect(preview.disabled).toBe(false));
    expect(save.disabled).toBe(true);
    const confirm = container.querySelector<HTMLInputElement>('.hcc-workbook__packet-confirm input[type="checkbox"]')!;
    confirm.click();
    expect(confirm.checked).toBe(true);
    expect(save.disabled).toBe(false);
    expect(container.querySelector(".hcc-workbook__packet-confirm-status")?.textContent).toContain("selected");
    expect(container.querySelector(".hcc-workbook__packet-status code")?.textContent).toBe("root: true\n");
    confirm.click();
    expect(save.disabled).toBe(true);
    expect(container.querySelector(".hcc-workbook__packet-status code")?.textContent).toBe("root: true\n");
    confirm.click();
    save.click();
    await vi.waitFor(() => expect(saveInitial).toHaveBeenCalledWith(true, rootPreview));
    await vi.waitFor(() => expect(copyText).toHaveBeenCalledWith(`packet_path: Intake/HCC Responses/root.yaml\npacket_digest: sha256:${"a".repeat(64)}\n`));
    expect(container.querySelector(".hcc-workbook__packet-confirm-status")?.textContent).toContain("copied automatically");
    const fields = container.querySelectorAll<HTMLInputElement>(".hcc-workbook__packet-field input");
    expect(fields[0]?.value).toBe("Intake/HCC Responses/root.yaml");
    expect(fields[1]?.value).toBe(`sha256:${"a".repeat(64)}`);
    const copy = controls.find((item) => item.textContent === "Copy reload locator")!;
    await vi.waitFor(() => expect(copy.disabled).toBe(false));
    copy.click();
    await vi.waitFor(() => expect(copyText).toHaveBeenCalledWith(`packet_path: Intake/HCC Responses/root.yaml\npacket_digest: sha256:${"a".repeat(64)}\n`));
    const locator = container.querySelector<HTMLTextAreaElement>('.hcc-workbook__packet-field textarea')!;
    expect(locator.value).toBe(`packet_path: Intake/HCC Responses/root.yaml\npacket_digest: sha256:${"a".repeat(64)}\n`);
    const fieldCopies = Array.from(container.querySelectorAll<HTMLButtonElement>(".hcc-workbook__packet-field-copy"));
    expect(fieldCopies).toHaveLength(4);
    expect(fieldCopies.map((item) => item.getAttribute("aria-label"))).toEqual([
      "Copy entire reload locator block", "Copy entire packet path", "Copy entire expected packet digest", "Copy entire amendment reason"
    ]);
    fieldCopies[0]!.click();
    await vi.waitFor(() => expect(copyText).toHaveBeenCalledWith(locator.value));
    fields[0]!.value = ""; fields[1]!.value = "";
    controls.find((item) => item.textContent === "Apply reload locator")!.click();
    expect(fields[0]!.value).toBe("Intake/HCC Responses/root.yaml");
    expect(fields[1]!.value).toBe(`sha256:${"a".repeat(64)}`);
    sessions.discard("Worksheets/Copy Proof.md");
    const loadButton = controls.find((item) => item.textContent === "Load explicit packet")!;
    loadButton.click();
    await vi.waitFor(() => expect(load).toHaveBeenCalledWith("Intake/HCC Responses/root.yaml", `sha256:${"a".repeat(64)}`));
    const previewAmendment = controls.find((item) => item.textContent === "Preview amended successor")!;
    await vi.waitFor(() => expect(previewAmendment.disabled).toBe(false));
    fields[2]!.value = "Correct the answer after review.";
    previewAmendment.click();
    await vi.waitFor(() => expect(saveAmendment).toHaveBeenCalledWith(
      expect.objectContaining({ path: "Intake/HCC Responses/root.yaml", revision: 1 }),
      "Correct the answer after review.",
      false
    ));
    const amendButton = controls.find((item) => item.textContent === "Create previewed successor")!;
    await vi.waitFor(() => expect(container.querySelector(".hcc-workbook__packet-status")?.textContent).toContain("preview ready"));
    await vi.waitFor(() => expect(previewAmendment.disabled).toBe(false));
    expect(amendButton.disabled).toBe(true);
    confirm.click();
    expect(amendButton.disabled).toBe(false);
    amendButton.click();
    await vi.waitFor(() => expect(saveAmendment).toHaveBeenCalledWith(
      expect.objectContaining({ path: "Intake/HCC Responses/root.yaml", revision: 1 }),
      "Correct the answer after review.",
      true,
      amendmentPreview
    ));
    expect(container.querySelector(".hcc-workbook__packet-status")?.textContent).toContain("revision 2");
  });

  it("keeps all packet text directly selectable and copies current field and YAML values", async () => {
    const parsed = parseWorksheet(worksheetSource); expect(parsed.ok).toBe(true); if (!parsed.ok) return;
    const sessions = new EphemeralWorkbookSessions(() => new Date("2026-08-11T12:00:00.000Z"));
    const copyText = vi.fn<(value: string) => Promise<void>>().mockResolvedValue(undefined);
    const preview = {
      path: "Intake/HCC Responses/selectable.yaml", digest: `sha256:${"c".repeat(64)}`, recordId: "selectable", revision: 1,
      byteLength: 64, readBack: "not-run" as const, result: "previewed" as const, yaml: "selectable: true\n"
    };
    const container = document.createElement("div"); document.body.append(container);
    renderWorksheet(container, parsed.worksheet, "Worksheets/Copy Proof.md", sessions, {
      copyText,
      responsePackets: { saveInitial: vi.fn().mockResolvedValue(preview), load: vi.fn(), saveAmendment: vi.fn() }
    });
    reviewAndFinalize(container);
    const fields = Array.from(container.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(".hcc-workbook__packet-field input, .hcc-workbook__packet-field textarea"));
    expect(fields).toHaveLength(4);
    fields.forEach((field) => expect(field.closest(".hcc-workbook__packet-field-control")).not.toBeNull());
    expect(fields.map((field) => field.value)).toEqual([
      `packet_path: Intake/HCC Responses/worksheet--session.yaml\npacket_digest: sha256:${"0".repeat(64)}`,
      "Intake/HCC Responses/worksheet--session.yaml",
      `sha256:${"0".repeat(64)}`,
      ""
    ]);
    expect((fields[3] as HTMLInputElement).placeholder).toBe("Explain why this immutable successor is required.");
    for (const field of fields) {
      const original = field.value;
      field.focus();
      field.select();
      expect(field.selectionStart).toBe(0);
      expect(field.selectionEnd).toBe(original.length);
      field.setRangeText("replacement");
      expect(field.value).toBe("replacement");
      field.select();
      field.setRangeText("");
      expect(field.value).toBe("");
      field.value = original;
    }
    fields[1]!.value = "sha256:manual";
    const copies = Array.from(container.querySelectorAll<HTMLButtonElement>(".hcc-workbook__packet-field-copy"));
    copies[1]!.click();
    await vi.waitFor(() => expect(copyText).toHaveBeenCalledWith("sha256:manual"));

    Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find((item) => item.textContent === "Preview new packet")!.click();
    await vi.waitFor(() => expect(container.querySelector(".hcc-workbook__packet-status code")?.textContent).toBe("selectable: true\n"));
    const yamlCopy = container.querySelector<HTMLButtonElement>(".hcc-workbook__packet-status .hcc-widget__copy-block-button")!;
    yamlCopy.click();
    await vi.waitFor(() => expect(copyText).toHaveBeenCalledWith("selectable: true\n"));
  });

  it("prepares the exact initial preview when confirmation is selected", async () => {
    const parsed = parseWorksheet(worksheetSource); expect(parsed.ok).toBe(true); if (!parsed.ok) return;
    const sessions = new EphemeralWorkbookSessions(() => new Date("2026-08-11T12:00:00.000Z"));
    const preview = {
      path: "Intake/HCC Responses/direct-confirm.yaml", digest: `sha256:${"d".repeat(64)}`, recordId: "direct-confirm", revision: 1,
      byteLength: 80, readBack: "not-run" as const, result: "previewed" as const, yaml: "direct: true\n"
    };
    const saveInitial = vi.fn().mockResolvedValue(preview);
    const container = document.createElement("div"); document.body.append(container);
    renderWorksheet(container, parsed.worksheet, "Worksheets/Copy Proof.md", sessions, {
      responsePackets: { saveInitial, load: vi.fn(), saveAmendment: vi.fn() }
    });
    reviewAndFinalize(container);
    const confirm = container.querySelector<HTMLInputElement>('.hcc-workbook__packet-confirm input[type="checkbox"]')!;
    const create = Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find((item) => item.textContent === "Create previewed packet")!;
    expect(create.disabled).toBe(true);
    confirm.click();
    await vi.waitFor(() => expect(saveInitial).toHaveBeenCalledWith(false));
    await vi.waitFor(() => expect(create.disabled).toBe(false));
    expect(confirm.checked).toBe(true);
    expect(container.querySelector(".hcc-workbook__packet-confirm-status")?.textContent).toContain("Exact preview prepared");
    expect(container.querySelector(".hcc-workbook__packet-status code")?.textContent).toBe("direct: true\n");
  });

  it("prepares a successor after a confirmed user commits the amendment reason", async () => {
    const parsed = parseWorksheet(worksheetSource); expect(parsed.ok).toBe(true); if (!parsed.ok) return;
    const sessions = new EphemeralWorkbookSessions(() => new Date("2026-08-11T12:00:00.000Z"));
    const predecessor = { path: "Intake/HCC Responses/root.yaml", digest: `sha256:${"a".repeat(64)}`, recordId: "root", revision: 1, responseCount: 1 };
    const successor = { path: "Intake/HCC Responses/root--r2.yaml", digest: `sha256:${"b".repeat(64)}`, recordId: "root", revision: 2, byteLength: 96, readBack: "not-run" as const, result: "previewed" as const, yaml: "revision: 2\n" };
    const saveAmendment = vi.fn().mockResolvedValue(successor);
    const container = document.createElement("div"); document.body.append(container);
    renderWorksheet(container, parsed.worksheet, "Worksheets/Copy Proof.md", sessions, {
      responsePackets: { saveInitial: vi.fn(), load: vi.fn().mockResolvedValue(predecessor), saveAmendment }
    });
    const controls = Array.from(container.querySelectorAll<HTMLButtonElement>("button"));
    controls.find((item) => item.textContent === "Load explicit packet")!.click();
    await vi.waitFor(() => expect(controls.find((item) => item.textContent === "Preview amended successor")!.disabled).toBe(false));
    const confirm = container.querySelector<HTMLInputElement>('.hcc-workbook__packet-confirm input[type="checkbox"]')!;
    confirm.click();
    expect(container.querySelector(".hcc-workbook__packet-confirm-status")?.textContent).toContain("Enter an amendment reason");
    const reason = Array.from(container.querySelectorAll<HTMLInputElement>(".hcc-workbook__packet-field input"))[2]!;
    reason.value = "Correct the reviewed response.";
    reason.dispatchEvent(new Event("input", { bubbles: true }));
    reason.dispatchEvent(new Event("change", { bubbles: true }));
    await vi.waitFor(() => expect(saveAmendment).toHaveBeenCalledWith(expect.objectContaining({ revision: 1 }), "Correct the reviewed response.", false));
    await vi.waitFor(() => expect(controls.find((item) => item.textContent === "Create previewed successor")!.disabled).toBe(false));
    expect(confirm.checked).toBe(true);
  });

  it("keeps ordinary packet-field editing events out of the underlying Live Preview editor", () => {
    const parsed = parseWorksheet(worksheetSource); expect(parsed.ok).toBe(true); if (!parsed.ok) return;
    const sessions = new EphemeralWorkbookSessions(() => new Date("2026-08-11T12:00:00.000Z"));
    const container = document.createElement("div"); document.body.append(container);
    renderWorksheet(container, parsed.worksheet, "Worksheets/Copy Proof.md", sessions, {
      responsePackets: { saveInitial: vi.fn(), load: vi.fn(), saveAmendment: vi.fn() }
    });
    const locator = container.querySelector<HTMLTextAreaElement>(".hcc-workbook__packet-field textarea")!;
    const bubbled: string[] = [];
    container.addEventListener("keydown", (event) => bubbled.push((event as KeyboardEvent).key));
    for (const key of ["a", "Backspace", "Delete", "ArrowLeft"]) locator.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
    expect(bubbled).toEqual([]);
    locator.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(bubbled).toEqual(["Escape"]);
    let pasteBubbled = false; container.addEventListener("paste", () => { pasteBubbled = true; });
    locator.dispatchEvent(new Event("paste", { bubbles: true }));
    expect(pasteBubbled).toBe(false);
  });
});

describe("worksheet navigation presentation", () => {
  const multiSectionSource = `version: 0.1-candidate.1
id: navigation-proof
title: Navigation proof
purpose: Verify presentation-only worksheet navigation.
privacy: private
sections:
  - { id: first, title: First, interactions: [answer-one, answer-two] }
  - { id: second, title: Second, interactions: [answer-three] }
completion: { required: [answer-one, answer-three] }
governance: { authority_refs: [], review_required: true, verification_required: false }
`;

  it("projects all admitted navigator, focus, progress, action, and completion settings through stable attributes", () => {
    const parsed = parseWorksheet(multiSectionSource); expect(parsed.ok).toBe(true); if (!parsed.ok) return;
    const container = document.createElement("div"); document.body.append(container);
    renderWorksheet(container, parsed.worksheet, "Worksheets/Navigation.md", new EphemeralWorkbookSessions());
    const root = container.querySelector<HTMLElement>(".hcc-workbook--worksheet")!;
    const navigator = root.querySelector<HTMLDetailsElement>(".hcc-workbook__navigator")!;
    const secondary = root.querySelector<HTMLDetailsElement>(".hcc-workbook__secondary-actions")!;

    applyWorksheetPresentation(container, DEFAULT_HCC_SETTINGS);
    expect(root.dataset).toMatchObject({
      hccWorksheetNavigator: "collapsed",
      hccQuestionListScope: "incomplete",
      hccFocusControl: "icon",
      hccFocusBehavior: "scroll-inline",
      hccProgressSummary: "compact",
      hccPrimaryActions: "inline",
      hccSecondaryActions: "disclosure",
      hccCompletedTreatment: "dimmed"
    });
    expect(navigator.open).toBe(false);
    expect(secondary.open).toBe(false);

    applyWorksheetPresentation(container, {
      ...DEFAULT_HCC_SETTINGS,
      worksheetNavigator: "expanded",
      questionListScope: "current-section",
      focusControl: "full-button",
      progressSummary: "detailed",
      primaryActions: "sticky",
      secondaryActions: "inline",
      completedTreatment: "collapsed"
    });
    expect(navigator.open).toBe(true);
    expect(secondary.open).toBe(true);
    expect(root.dataset.hccQuestionListScope).toBe("current-section");
    expect(root.dataset.hccFocusControl).toBe("full-button");
    expect(root.dataset.hccProgressSummary).toBe("detailed");
    expect(root.dataset.hccPrimaryActions).toBe("sticky");
    expect(root.dataset.hccCompletedTreatment).toBe("collapsed");
  });

  it("covers the complete four-by-four-by-four navigator, scope, and progress projection matrix", () => {
    const parsed = parseWorksheet(multiSectionSource); expect(parsed.ok).toBe(true); if (!parsed.ok) return;
    const container = document.createElement("div"); document.body.append(container);
    renderWorksheet(container, parsed.worksheet, "Worksheets/Navigation.md", new EphemeralWorkbookSessions());
    const root = container.querySelector<HTMLElement>(".hcc-workbook--worksheet")!;
    const navigator = root.querySelector<HTMLDetailsElement>(".hcc-workbook__navigator")!;
    const navigators = ["hidden", "collapsed", "compact", "expanded"] as const;
    const scopes = ["none", "current-section", "incomplete", "all"] as const;
    const progressModes = ["hidden", "count", "compact", "detailed"] as const;
    let combinations = 0;
    for (const worksheetNavigator of navigators) for (const questionListScope of scopes) for (const progressSummary of progressModes) {
      applyWorksheetPresentation(container, { ...DEFAULT_HCC_SETTINGS, worksheetNavigator, questionListScope, progressSummary });
      expect(root.dataset.hccWorksheetNavigator).toBe(worksheetNavigator);
      expect(root.dataset.hccQuestionListScope).toBe(questionListScope);
      expect(root.dataset.hccProgressSummary).toBe(progressSummary);
      expect(navigator.open).toBe(worksheetNavigator === "compact" || worksheetNavigator === "expanded");
      combinations += 1;
    }
    expect(combinations).toBe(64);
  });

  it("keeps a manually opened collapsed navigator open across an unrelated presentation change", () => {
    const parsed = parseWorksheet(multiSectionSource); expect(parsed.ok).toBe(true); if (!parsed.ok) return;
    const container = document.createElement("div"); document.body.append(container);
    renderWorksheet(container, parsed.worksheet, "Worksheets/Navigation.md", new EphemeralWorkbookSessions());
    applyWorksheetPresentation(container, DEFAULT_HCC_SETTINGS);
    const navigator = container.querySelector<HTMLDetailsElement>(".hcc-workbook__navigator")!;
    navigator.open = true;
    applyWorksheetPresentation(container, { ...DEFAULT_HCC_SETTINGS, progressSummary: "detailed" });
    expect(navigator.open).toBe(true);
  });

  it("retains answers, packet preview, source binding, and packet DOM while presentation changes", async () => {
    const parsed = parseWorksheet(multiSectionSource); expect(parsed.ok).toBe(true); if (!parsed.ok) return;
    const path = "Worksheets/Navigation.md";
    const sessions = new EphemeralWorkbookSessions(() => new Date("2026-08-14T12:00:00.000Z"));
    sessions.binding(path, "answer-one").update({ value: "retained", state: "answered" }, "short_text", "0.3-candidate.1");
    const preview = {
      path: "Intake/HCC Responses/navigation.yaml", digest: `sha256:${"e".repeat(64)}`, recordId: "navigation", revision: 1,
      byteLength: 96, readBack: "not-run" as const, result: "previewed" as const, yaml: "retained: preview\n"
    };
    const saveInitial = vi.fn().mockImplementation(async (confirmed: boolean) => confirmed
      ? { ...preview, readBack: "verified" as const, result: "created" as const }
      : preview);
    const container = document.createElement("div"); document.body.append(container);
    renderWorksheet(container, parsed.worksheet, path, sessions, {
      responsePackets: { saveInitial, load: vi.fn(), saveAmendment: vi.fn() }
    });
    reviewAndFinalize(container);
    const controls = Array.from(container.querySelectorAll<HTMLButtonElement>("button"));
    controls.find((item) => item.textContent === "Preview new packet")!.click();
    await vi.waitFor(() => expect(container.querySelector(".hcc-workbook__packet-status code")?.textContent).toBe("retained: preview\n"));
    const confirmation = container.querySelector<HTMLInputElement>('.hcc-workbook__packet-confirm input[type="checkbox"]')!;
    confirmation.click();
    controls.find((item) => item.textContent === "Create previewed packet")!.click();
    await vi.waitFor(() => expect(controls.find((item) => item.textContent === "Preview amended successor")!.disabled).toBe(false));
    const packetPanel = container.querySelector(".hcc-workbook__packet-panel")!;
    const packetStatus = container.querySelector(".hcc-workbook__packet-status")!;

    applyWorksheetPresentation(container, { ...DEFAULT_HCC_SETTINGS, worksheetNavigator: "hidden", progressSummary: "hidden", secondaryActions: "inline" });

    expect(container.querySelector(".hcc-workbook__packet-panel")).toBe(packetPanel);
    expect(container.querySelector(".hcc-workbook__packet-status")).toBe(packetStatus);
    expect(packetStatus.querySelector("code")?.textContent).toBe("retained: preview\n");
    expect(controls.find((item) => item.textContent === "Preview amended successor")!.disabled).toBe(false);
    const retained = sessions.finalProposal(path, parsed.worksheet).responses.find((entry) => entry.interaction_id === "answer-one")?.response as { value?: unknown } | undefined;
    expect(retained?.value).toBe("retained");
    expect(container.querySelector<HTMLElement>('[data-hcc-response-state="answered"]')).not.toBeNull();
  });

  it("gives every compact focus control a keyboard name and changes current-section state without replacing rows", () => {
    const parsed = parseWorksheet(multiSectionSource); expect(parsed.ok).toBe(true); if (!parsed.ok) return;
    const container = document.createElement("div"); document.body.append(container);
    renderWorksheet(container, parsed.worksheet, "Worksheets/Navigation.md", new EphemeralWorkbookSessions());
    applyWorksheetPresentation(container, { ...DEFAULT_HCC_SETTINGS, questionListScope: "current-section", focusControl: "icon" });
    const secondRow = container.querySelector<HTMLElement>('[data-hcc-section-id="second"]')!;
    const focus = secondRow.querySelector<HTMLButtonElement>('[aria-label="Focus question answer-three"]')!;
    expect(focus.title).toBe("Focus question answer-three");
    expect(focus.dataset.tooltip).toBe("Focus question answer-three");
    const rowsBefore = Array.from(container.querySelectorAll(".hcc-workbook__question-item"));
    const externalInteraction = document.createElement("button");
    externalInteraction.dataset.hccInteractionId = "answer-three";
    document.body.append(externalInteraction);
    externalInteraction.focus();
    expect(container.querySelector<HTMLElement>('[data-hcc-section-id="second"]')?.dataset.hccCurrentSection).toBe("true");
    focus.click();
    expect(container.querySelector<HTMLElement>('[data-hcc-section-id="second"]')?.dataset.hccCurrentSection).toBe("true");
    expect(container.querySelector<HTMLElement>('[data-hcc-section-id="first"]')?.dataset.hccCurrentSection).toBe("false");
    expect(Array.from(container.querySelectorAll(".hcc-workbook__question-item"))).toEqual(rowsBefore);
  });

  it("surfaces one real worksheet question at a time and restores every question without replacing responses", async () => {
    const parsed = parseWorksheet(multiSectionSource); expect(parsed.ok).toBe(true); if (!parsed.ok) return;
    const container = document.createElement("div"); document.body.append(container);
    const dispose = renderWorksheet(container, parsed.worksheet, "Worksheets/Navigation.md", new EphemeralWorkbookSessions());
    const surfaces = ["answer-one", "answer-two", "answer-three"].map((id) => {
      const wrapper = document.createElement("div");
      const interaction = document.createElement("article");
      interaction.dataset.hccInteractionId = id;
      const prompt = document.createElement("h3");
      prompt.className = "hcc-widget__prompt";
      const scrollIntoView = vi.fn();
      prompt.scrollIntoView = scrollIntoView;
      const input = document.createElement("input");
      interaction.append(prompt, input); wrapper.append(interaction); document.body.append(wrapper);
      return { wrapper, interaction, prompt, input, scrollIntoView };
    });

    applyWorksheetPresentation(container, { ...DEFAULT_HCC_SETTINGS, focusBehavior: "one-question" });
    const docks = surfaces.map(({ interaction }) => interaction.querySelector<HTMLElement>(".hcc-workbook__focus-stage")!);
    const stage = docks[0]!;
    const stageOwner = stage.parentElement;
    expect(stage.hidden).toBe(false);
    expect(stage.textContent).toContain("Question 1 of 3 · answer-one");
    expect(stage.dataset.hccActiveQuestion).toBe("true");
    expect(docks.map((dock) => dock.dataset.hccQuestionDock)).toEqual(["answer-one", "answer-two", "answer-three"]);
    expect(surfaces.map(({ wrapper }) => wrapper.dataset.hccQuestionVisibility)).toEqual(["active", "hidden", "hidden"]);

    const next = Array.from(stage.querySelectorAll<HTMLButtonElement>("button")).find((button) => button.textContent === "Next question")!;
    next.focus();
    next.click();
    expect(stage.parentElement).toBe(stageOwner);
    expect(stage.dataset.hccActiveQuestion).toBe("false");
    expect(docks[1]!.textContent).toContain("Question 2 of 3 · answer-two");
    expect(docks[1]!.parentElement).toBe(surfaces[1]!.interaction);
    expect(docks[1]!.dataset.hccActiveQuestion).toBe("true");
    expect(surfaces.map(({ wrapper }) => wrapper.dataset.hccQuestionVisibility)).toEqual(["hidden", "active", "hidden"]);
    expect(document.activeElement).toBe(surfaces[1]!.input);
    expect(surfaces[1]!.scrollIntoView).toHaveBeenCalledWith({ block: "center", inline: "nearest" });
    await vi.waitFor(() => expect(surfaces[1]!.scrollIntoView.mock.calls.length).toBeGreaterThanOrEqual(2));

    const previous = Array.from(docks[1]!.querySelectorAll<HTMLButtonElement>("button")).find((button) => button.textContent === "Previous question")!;
    previous.focus();
    previous.click();
    expect(docks[0]!.dataset.hccActiveQuestion).toBe("true");
    expect(surfaces.map(({ wrapper }) => wrapper.dataset.hccQuestionVisibility)).toEqual(["active", "hidden", "hidden"]);
    expect(document.activeElement).toBe(surfaces[0]!.input);
    expect(surfaces[0]!.scrollIntoView).toHaveBeenCalledWith({ block: "center", inline: "nearest" });
    await vi.waitFor(() => expect(surfaces[0]!.scrollIntoView.mock.calls.length).toBeGreaterThanOrEqual(2));

    applyWorksheetPresentation(container, { ...DEFAULT_HCC_SETTINGS, focusBehavior: "scroll-inline" });
    expect(docks.every((dock) => dock.hidden)).toBe(true);
    expect(surfaces.map(({ wrapper }) => wrapper.dataset.hccQuestionVisibility)).toEqual([undefined, undefined, undefined]);
    dispose();
  });
});
