import { dump } from "js-yaml";

import type { EphemeralWorkbookSessions } from "./session";
import type { WorkbookContract, WorkbookDiagnostic, WorksheetContract } from "./types";
import { parseWorksheetPacketLocator } from "./packet-locator";
import { button, descriptionList, node } from "../ui";
import type { HccPluginSettings } from "../settings";

export interface WorkbookRenderActions {
  openRef?: (ref: string) => void;
  openGovernance?: () => void;
  copyText?: (value: string) => Promise<void>;
  responsePackets?: WorksheetResponsePacketActions;
}

export interface WorksheetPacketReference {
  path: string;
  digest: string;
  recordId: string;
  revision: number;
}

export interface WorksheetPacketWriteResult extends WorksheetPacketReference {
  byteLength: number;
  readBack: "not-run" | "verified";
  result: "previewed" | "created";
  yaml: string;
}

export interface WorksheetPacketLoadResult extends WorksheetPacketReference {
  responseCount: number;
}

export interface WorksheetResponsePacketActions {
  saveInitial: (confirmed: boolean, expected?: WorksheetPacketWriteResult) => Promise<WorksheetPacketWriteResult>;
  load: (path: string, digest: string) => Promise<WorksheetPacketLoadResult>;
  saveAmendment: (predecessor: WorksheetPacketReference, reason: string, confirmed: boolean, expected?: WorksheetPacketWriteResult) => Promise<WorksheetPacketWriteResult>;
  exportDraft: () => string;
  importDraft: (yaml: string, options?: { discard?: boolean }) => Promise<{ imported: number; discarded: boolean; sessionId: string }>;
}

export type WorksheetPresentationPreferences = Pick<HccPluginSettings,
  "worksheetNavigator" | "questionListScope" | "focusControl" | "focusBehavior" |
  "progressSummary" | "primaryActions" | "secondaryActions" | "completedTreatment"
>;

interface ResponsePacketReleaseSource {
  finalYaml: () => string;
  fingerprint: () => string;
  requiredComplete: () => boolean;
  showFinalPacket: () => void;
}

interface ResponsePacketPanelController {
  element: HTMLDetailsElement;
  quickCreateButton: HTMLButtonElement;
  openAdvancedButton: HTMLButtonElement;
  quickStatus: HTMLElement;
  markReviewed: () => void;
  markPrepared: () => void;
  copyFinalPacket: () => void;
  sync: () => void;
}

const WORKSHEET_PRESENTATION_EVENT = "hcc-worksheet-presentation-change";

export function applyWorksheetPresentation(container: HTMLElement, settings: WorksheetPresentationPreferences): void {
  const roots = container.matches(".hcc-workbook--worksheet")
    ? [container]
    : Array.from(container.querySelectorAll<HTMLElement>(".hcc-workbook--worksheet"));
  for (const root of roots) {
    const previousNavigator = root.dataset.hccWorksheetNavigator;
    const previousSecondary = root.dataset.hccSecondaryActions;
    root.dataset.hccWorksheetNavigator = settings.worksheetNavigator;
    root.dataset.hccQuestionListScope = settings.questionListScope;
    root.dataset.hccFocusControl = settings.focusControl;
    root.dataset.hccFocusBehavior = settings.focusBehavior;
    root.dataset.hccProgressSummary = settings.progressSummary;
    root.dataset.hccPrimaryActions = settings.primaryActions;
    root.dataset.hccSecondaryActions = settings.secondaryActions;
    root.dataset.hccCompletedTreatment = settings.completedTreatment;

    if (previousNavigator !== settings.worksheetNavigator) {
      const navigator = root.querySelector<HTMLDetailsElement>(".hcc-workbook__navigator");
      if (navigator) navigator.open = settings.worksheetNavigator === "compact" || settings.worksheetNavigator === "expanded";
    }
    if (previousSecondary !== settings.secondaryActions) {
      const secondary = root.querySelector<HTMLDetailsElement>(".hcc-workbook__secondary-actions");
      if (secondary) secondary.open = settings.secondaryActions === "inline";
    }
    const event = root.ownerDocument.createEvent("Event");
    event.initEvent(WORKSHEET_PRESENTATION_EVENT, false, false);
    root.dispatchEvent(event);
  }
}

export function renderWorksheet(
  container: HTMLElement,
  worksheet: WorksheetContract,
  sourcePath: string,
  sessions: EphemeralWorkbookSessions,
  actions: WorkbookRenderActions = {}
): () => void {
  container.replaceChildren();
  const root = node("article", "hcc-workbook hcc-workbook--worksheet");
  root.dataset.worksheetId = worksheet.id;
  root.append(
    node("p", "hcc-widget__identity", "HCC worksheet candidate"),
    node("h3", "hcc-workbook__title", worksheet.title),
    node("p", "hcc-workbook__purpose", worksheet.purpose),
    node("p", "hcc-widget__phase-notice", actions.responsePackets
      ? "Responses begin in plugin memory. The vault canary can create immutable packets and reload one explicit digest-verified packet; it never overwrites or writes to a canonical knowledge system."
      : "Responses remain in plugin memory. Draft and finalization actions prepare YAML only; vault persistence is unavailable in this rendering context.")
  );
  const progress = node("div", "hcc-workbook__progress");
  progress.setAttribute("role", "status");
  progress.setAttribute("aria-live", "polite");
  const navigator = document.createElement("details");
  navigator.className = "hcc-workbook__navigator";
  navigator.append(node("summary", undefined, "Question navigator"));
  const sections = node("div", "hcc-workbook__sections");
  navigator.append(sections);
  const output = node("section", "hcc-workbook__proposal");
  output.hidden = true;
  let activeSectionId = worksheet.sections[0]?.id ?? "";
  const interactionSections = new Map(worksheet.sections.flatMap((section) => section.interactions.map((id) => [id, section.id] as const)));
  const interactionIds = worksheet.sections.flatMap((section) => section.interactions);
  const presentationScope = container.closest<HTMLElement>(".markdown-preview-view, .markdown-source-view, .cm-editor") ?? container.ownerDocument.body;
  let activeInteractionId = interactionIds[0] ?? "";
  const ownedQuestionSurfaces = new Set<HTMLElement>();
  const ownedQuestionDocks = new Set<HTMLElement>();
  const questionDocks = new WeakMap<HTMLElement, HTMLElement>();
  let focusPlacementSequence = 0;

  const setCurrentSection = (sectionId: string): void => {
    activeSectionId = sectionId;
    sections.querySelectorAll<HTMLElement>(".hcc-workbook__section").forEach((card) => {
      card.dataset.hccCurrentSection = String(card.dataset.hccSectionId === sectionId);
    });
  };

  const questionTargets = (): HTMLElement[] => Array.from(presentationScope.querySelectorAll<HTMLElement>("[data-hcc-interaction-id]"))
    .filter((target) => interactionSections.has(target.dataset.hccInteractionId ?? ""));

  const questionSurface = (target: HTMLElement): HTMLElement => {
    const parent = target.parentElement;
    return parent && parent !== presentationScope && parent !== container.ownerDocument.body ? parent : target;
  };

  const createQuestionDock = (target: HTMLElement, id: string): HTMLElement => {
    const index = interactionIds.indexOf(id);
    const dock = node("nav", "hcc-workbook__focus-stage");
    dock.setAttribute("aria-label", `One-question navigation for ${id}`);
    dock.dataset.hccQuestionDock = id;
    const status = node("p", "hcc-workbook__focus-status", `Question ${index + 1} of ${interactionIds.length} · ${id}`);
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    const previous = button("Previous question", () => {
      const activeIndex = interactionIds.indexOf(activeInteractionId);
      if (activeIndex > 0) setActiveInteraction(interactionIds[activeIndex - 1]!, true);
    });
    previous.disabled = index <= 0;
    const next = button("Next question", () => {
      const activeIndex = interactionIds.indexOf(activeInteractionId);
      if (activeIndex >= 0 && activeIndex < interactionIds.length - 1) setActiveInteraction(interactionIds[activeIndex + 1]!, true);
    });
    next.disabled = index >= interactionIds.length - 1;
    const actions = node("div", "hcc-workbook__focus-stage-actions");
    actions.append(previous, next);
    dock.append(status, actions);
    target.prepend(dock);
    questionDocks.set(target, dock);
    ownedQuestionDocks.add(dock);
    return dock;
  };

  const syncQuestionPresentation = (): void => {
    const isolated = root.dataset.hccFocusBehavior === "one-question";
    if (!interactionSections.has(activeInteractionId)) activeInteractionId = interactionIds[0] ?? "";
    root.dataset.hccActiveInteraction = activeInteractionId;
    for (const target of questionTargets()) {
      const id = target.dataset.hccInteractionId ?? "";
      const surface = questionSurface(target);
      const existingDock = questionDocks.get(target);
      if (isolated) {
        const dock = existingDock?.parentElement === target ? existingDock : createQuestionDock(target, id);
        dock.hidden = false;
        dock.dataset.hccActiveQuestion = String(id === activeInteractionId);
      } else if (existingDock) {
        existingDock.hidden = true;
        delete existingDock.dataset.hccActiveQuestion;
      }
      ownedQuestionSurfaces.add(surface);
      if (isolated) {
        surface.dataset.hccQuestionOwner = worksheet.id;
        surface.dataset.hccQuestionVisibility = id === activeInteractionId ? "active" : "hidden";
      } else if (surface.dataset.hccQuestionOwner === worksheet.id) {
        delete surface.dataset.hccQuestionOwner;
        delete surface.dataset.hccQuestionVisibility;
      }
    }
  };

  const setActiveInteraction = (id: string, moveFocus: boolean): void => {
    const sectionId = interactionSections.get(id);
    if (!sectionId) return;
    activeInteractionId = id;
    setCurrentSection(sectionId);
    syncQuestionPresentation();
    if (moveFocus) {
      const sequence = ++focusPlacementSequence;
      focusInteraction(presentationScope, id);
      const view = container.ownerDocument.defaultView;
      view?.requestAnimationFrame(() => view.requestAnimationFrame(() => {
        if (sequence === focusPlacementSequence && activeInteractionId === id) positionInteractionPrompt(presentationScope, id);
      }));
    }
  };

  const refresh = (): void => {
    const state = sessions.progress(sourcePath, worksheet);
    const requiredTotal = worksheet.completion.required.length;
    const requiredAnswered = requiredTotal - state.missingRequired.length;
    progress.replaceChildren(
      node("strong", "hcc-workbook__progress-count", `${state.answered} of ${state.declared} answered`),
      node("span", "hcc-workbook__progress-compact", state.requiredComplete ? "Required responses complete" : `${state.missingRequired.length} required response(s) incomplete`),
      node("span", "hcc-workbook__progress-detail", `${requiredAnswered} of ${requiredTotal} required responses complete`)
    );
    sections.replaceChildren();
    worksheet.sections.forEach((section) => {
      const card = node("section", "hcc-workbook__section");
      card.dataset.hccSectionId = section.id;
      card.dataset.hccCurrentSection = String(section.id === activeSectionId);
      card.append(node("h4", undefined, section.title));
      const list = node("ul", "hcc-workbook__question-list");
      section.interactions.forEach((id) => {
        const responseState = state.states[id] ?? "unanswered";
        const item = node("li", "hcc-workbook__question-item");
        item.dataset.hccQuestionId = id;
        item.dataset.hccResponseState = responseState;
        item.dataset.hccComplete = String(responseState !== "unanswered");
        const focus = button("", () => {
          setActiveInteraction(id, true);
        });
        focus.classList.add("hcc-workbook__focus-control");
        focus.setAttribute("aria-label", `Focus question ${id}`);
        focus.title = `Focus question ${id}`;
        focus.dataset.tooltip = `Focus question ${id}`;
        focus.append(
          node("span", "hcc-workbook__focus-icon", "◎"),
          node("span", "hcc-workbook__focus-compact-label", "Focus"),
          node("span", "hcc-workbook__focus-full-label", "Focus question")
        );
        item.append(node("code", undefined, id), node("span", "hcc-workbook__state", responseState), focus);
        list.append(item);
      });
      card.append(list);
      sections.append(card);
    });
    syncQuestionPresentation();
    packetPanel?.sync();
  };

  const showProposal = (title: string, value: unknown): void => {
    const source = dump(value, { lineWidth: -1, noRefs: true });
    output.replaceChildren(node("h4", undefined, title), copyableCodeBlock(source, actions.copyText));
    const held = button("Write effect · step 8 human release required", () => undefined);
    held.disabled = true;
    output.append(
      node("p", "hcc-widget__held-note", "No file, frontmatter, intake record, canonical source, or external system was changed."),
      held
    );
    output.hidden = false;
    output.tabIndex = -1;
    output.focus();
  };

  const primaryToolbar = node("div", "hcc-workbook__toolbar hcc-workbook__primary-actions");
  primaryToolbar.setAttribute("role", "toolbar");
  primaryToolbar.setAttribute("aria-label", "Primary worksheet actions");
  let packetPanel: ResponsePacketPanelController | undefined;
  const review = button("Review worksheet", () => {
    showProposal("Completion review", {
      record_type: "hcc-worksheet-review-projection",
      worksheet_id: worksheet.id,
      progress: sessions.progress(sourcePath, worksheet),
      authority: "projection-only",
      effects: "none"
    });
    packetPanel?.markReviewed();
  });
  review.dataset.shortLabel = "Review";
  const prepareFinal = button("Prepare final packet", () => {
    showProposal("Immutable final packet proposal", sessions.finalProposal(sourcePath, worksheet));
    packetPanel?.markPrepared();
  });
  prepareFinal.dataset.shortLabel = "Final packet";
  const copyFinal = button("Copy answer packet YAML", () => {
    if (packetPanel) {
      packetPanel.copyFinalPacket();
      return;
    }
    const proposal = sessions.finalProposal(sourcePath, worksheet);
    const source = dump(proposal, { lineWidth: -1, noRefs: true });
    showProposal("Immutable final packet proposal", proposal);
    if (!actions.copyText) return;
    const copyStatus = output.querySelector<HTMLElement>(".hcc-widget__copy-status");
    void actions.copyText(source).then(
      () => { if (copyStatus) copyStatus.textContent = "The complete answer packet YAML was copied to the clipboard."; },
      () => { if (copyStatus) copyStatus.textContent = "Clipboard copy failed. The complete packet remains visible and selectable."; }
    );
  });
  copyFinal.dataset.shortLabel = "Copy packet";
  copyFinal.disabled = !actions.copyText;
  primaryToolbar.append(review, prepareFinal, copyFinal);

  const secondaryActions = document.createElement("details");
  secondaryActions.className = "hcc-workbook__secondary-actions";
  secondaryActions.append(node("summary", undefined, "More worksheet actions"));
  const secondaryGroup = node("div", "hcc-workbook__secondary-action-group");
  secondaryGroup.setAttribute("role", "group");
  secondaryGroup.setAttribute("aria-label", "Secondary worksheet actions");
  secondaryGroup.append(
    button("Prepare private draft", () => showProposal("Mutable draft proposal", sessions.draftProposal(sourcePath, worksheet))),
    button("Discard in-memory responses", () => {
      sessions.discard(sourcePath);
      output.hidden = true;
    })
  );
  if (worksheet.workbook_ref && actions.openRef) secondaryGroup.append(button("Return to workbook", () => actions.openRef?.(worksheet.workbook_ref!)));
  if (actions.openGovernance) secondaryGroup.append(button("Governance", actions.openGovernance));
  secondaryActions.append(secondaryGroup);

  packetPanel = actions.responsePackets
    ? renderResponsePacketPanel(actions.responsePackets, actions.copyText, {
      finalYaml: () => dump(sessions.finalProposal(sourcePath, worksheet), { lineWidth: -1, noRefs: true }),
      fingerprint: () => {
        const proposal = sessions.finalProposal(sourcePath, worksheet);
        return JSON.stringify({ responses: proposal.responses, review: proposal.review });
      },
      requiredComplete: () => sessions.progress(sourcePath, worksheet).requiredComplete,
      showFinalPacket: () => showProposal("Immutable final packet proposal", sessions.finalProposal(sourcePath, worksheet))
    })
    : undefined;
  if (packetPanel) primaryToolbar.append(packetPanel.quickCreateButton, packetPanel.openAdvancedButton);

  const contract = document.createElement("details");
  contract.className = "hcc-workbook__contract";
  contract.append(node("summary", undefined, "Worksheet contract and governance"));
  contract.append(descriptionList([
    ["Worksheet ID", worksheet.id],
    ["Privacy", worksheet.privacy],
    ["Review required", String(worksheet.governance.review_required)],
    ["Verification required", String(worksheet.governance.verification_required)],
    ["Authority references", worksheet.governance.authority_refs.join(", ") || "none declared"],
    ["Source digest", actions.responsePackets ? "bound from exact worksheet bytes at each vault operation" : "not bound in preview-only output"]
  ]));
  root.append(
    progress,
    primaryToolbar,
    ...(packetPanel ? [packetPanel.quickStatus, packetPanel.element] : []),
    secondaryActions,
    navigator,
    contract,
    output
  );
  container.append(root);
  refresh();
  const onDocumentFocus = (event: FocusEvent): void => {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-hcc-interaction-id]") : null;
    if (target?.dataset.hccInteractionId) setActiveInteraction(target.dataset.hccInteractionId, false);
  };
  container.ownerDocument.addEventListener("focusin", onDocumentFocus);
  root.addEventListener(WORKSHEET_PRESENTATION_EVENT, syncQuestionPresentation);
  const Observer = container.ownerDocument.defaultView?.MutationObserver;
  const observer = Observer ? new Observer((mutations) => {
    const interactionAdded = mutations.some((mutation) => Array.from(mutation.addedNodes).some((added) => {
      if (added.nodeType !== 1) return false;
      const element = added as Element;
      return element.matches("[data-hcc-interaction-id]") || element.querySelector("[data-hcc-interaction-id]") !== null;
    }));
    if (interactionAdded) syncQuestionPresentation();
  }) : undefined;
  observer?.observe(presentationScope, { childList: true, subtree: true });
  const unsubscribe = sessions.subscribe(sourcePath, refresh);
  return () => {
    focusPlacementSequence += 1;
    unsubscribe();
    observer?.disconnect();
    root.removeEventListener(WORKSHEET_PRESENTATION_EVENT, syncQuestionPresentation);
    container.ownerDocument.removeEventListener("focusin", onDocumentFocus);
    for (const dock of ownedQuestionDocks) dock.remove();
    for (const surface of ownedQuestionSurfaces) {
      if (surface.dataset.hccQuestionOwner !== worksheet.id) continue;
      delete surface.dataset.hccQuestionOwner;
      delete surface.dataset.hccQuestionVisibility;
    }
  };
}

function renderResponsePacketPanel(
  actions: WorksheetResponsePacketActions,
  copyText: ((value: string) => Promise<void>) | undefined,
  release: ResponsePacketReleaseSource
): ResponsePacketPanelController {
  const details = document.createElement("details");
  details.className = "hcc-workbook__packet-panel";
  details.open = false;
  details.append(node("summary", undefined, "Reload, amend, or inspect packet details"));
  const body = node("div", "hcc-workbook__packet-body");
  body.append(node("p", "hcc-widget__held-note", "Complete, review, finalize, preview, confirm, and create one immutable packet under the worksheet's configured response-packet folder (default Intake/HCC Responses/). A successful verified create copies its exact reload locator when clipboard access is available."));

  const releaseStages = [
    "1 · Answer", "2 · Review", "3 · Finalize", "4 · Prepare or copy", "5 · Preview", "6 · Confirm", "7 · Create", "8 · Share locator"
  ].map((label) => node("li", "hcc-workbook__release-stage", label));
  const stageList = node("ol", "hcc-workbook__release-stages");
  stageList.setAttribute("aria-label", "Eight-stage response packet release workflow");
  stageList.append(...releaseStages);
  const releaseStatus = node("p", "hcc-workbook__release-status");
  releaseStatus.setAttribute("role", "status");
  releaseStatus.setAttribute("aria-live", "polite");
  const releaseActions = node("div", "hcc-workbook__packet-actions hcc-workbook__release-actions");

  const starterPath = "Intake/HCC Responses/worksheet--session.yaml";
  const starterDigest = `sha256:${"0".repeat(64)}`;
  const pathInput = labeledInput("Packet path", "text", starterPath, copyText);
  const digestInput = labeledInput("Expected packet digest", "text", starterDigest, copyText);
  const locatorInput = labeledTextarea("Reload locator block", `packet_path: ${starterPath}\npacket_digest: ${starterDigest}`, copyText);
  const reasonInput = labeledInput("Amendment reason", "text", "", copyText);
  reasonInput.input.placeholder = "Explain why this immutable successor is required.";
  body.append(node("p", "hcc-workbook__packet-edit-note", "The locator fields contain editable starter values. The amendment reason starts empty and must describe why a new immutable successor is required."));
  const confirmation = document.createElement("input");
  confirmation.type = "checkbox";
  confirmation.id = `hcc-packet-confirm-${++packetPanelSequence}`;
  const confirmationLabel = node("label", "hcc-workbook__packet-confirm");
  confirmationLabel.htmlFor = confirmation.id;
  confirmationLabel.append(confirmation, node("span", undefined, "I confirm this operation may create one new immutable YAML file in the disposable vault."));
  const confirmationStatus = node("p", "hcc-workbook__packet-confirm-status");
  confirmationStatus.setAttribute("role", "status");
  confirmationStatus.setAttribute("aria-live", "polite");
  const status = node("div", "hcc-workbook__packet-status");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  let predecessor: WorksheetPacketReference | null = null;
  let initialPreview: WorksheetPacketWriteResult | null = null;
  let amendmentPreview: WorksheetPacketWriteResult | null = null;
  let amendmentReasonRevision = 0;
  let busy = false;
  let reviewedFingerprint: string | null = null;
  let finalizedFingerprint: string | null = null;
  let preparedFinalFingerprint: string | null = null;
  let locatorCopied = false;
  let confirmed = false;
  let createdVerified = false;

  const finalize = button("Mark answers finalized", () => {
    finalizedFingerprint = release.fingerprint();
    initialPreview = null;
    confirmation.checked = false;
    releaseStatus.textContent = release.requiredComplete()
      ? "Answers finalized in memory. Any response change will return this workflow to review."
      : "Answers finalized with required responses still missing. The packet will preserve that incomplete review state.";
    syncButtonStates();
    syncStages();
  });
  const copyFinalPacket = (): void => {
    release.showFinalPacket();
    preparedFinalFingerprint = release.fingerprint();
    syncStages();
    if (!copyText) return;
    const yaml = release.finalYaml();
    void copyText(yaml).then(
      () => {
        releaseStatus.textContent = "The complete answer packet YAML was copied to the clipboard.";
        syncStages();
      },
      () => { releaseStatus.textContent = "Clipboard copy failed. The complete packet remains visible and selectable below."; }
    );
  };
  const exportDraftButton = button("Export draft as YAML", () => {
    const yaml = actions.exportDraft();
    if (!copyText) {
      releaseStatus.textContent = `Draft YAML (${yaml.length} chars) is below. Paste it back via 'Import draft from YAML' after reload.`;
      syncStages();
      return;
    }
    void copyText(yaml).then(
      () => { releaseStatus.textContent = "Draft YAML was copied to the clipboard. Paste it back via 'Import draft from YAML' after plugin reload or to resume work later."; syncStages(); },
      () => { releaseStatus.textContent = "Clipboard copy failed. The draft YAML is visible in the output area below."; }
    );
  });

  let importArea: HTMLTextAreaElement | null = null;
  let importDiscardCheckbox: HTMLInputElement | null = null;
  const importDraftButton = button("Import draft from YAML", () => {
    if (importArea) {
      // Toggle off
      importArea.replaceWith(importArea = (document.createElement("textarea") as HTMLTextAreaElement));
      importArea = null;
      if (importDiscardCheckbox) importDiscardCheckbox.disabled = true;
      releaseStatus.textContent = "Import area closed.";
      syncStages();
      return;
    }
    importArea = document.createElement("textarea");
    importArea.className = "hcc-workbook__packet-import-area";
    importArea.placeholder = "Paste draft OR immutable response packet YAML here. Accepted record_type: hcc-worksheet-session-draft (mutable draft) or hcc-worksheet-response-packet (immutable packet). Both must have matching worksheet_binding.worksheet_id.";
    importArea.rows = 8;
    importArea.spellcheck = false;
    importDiscardCheckbox = document.createElement("input");
    importDiscardCheckbox.type = "checkbox";
    importDiscardCheckbox.id = `hcc-packet-import-discard-${++packetPanelSequence}`;
    const importDiscardLabel = document.createElement("label");
    importDiscardLabel.className = "hcc-workbook__packet-import-discard";
    importDiscardLabel.htmlFor = importDiscardCheckbox.id;
    importDiscardLabel.append(importDiscardCheckbox, document.createTextNode("Discard the current in-memory draft before importing (required if any answers are already present)."));
    const executeImport = button("Execute import", () => run(async () => {
      const yaml = importArea?.value.trim() ?? "";
      if (yaml.length === 0) {
        releaseStatus.textContent = "Paste YAML into the import area before executing.";
        syncStages();
        return;
      }
      const result = await actions.importDraft(yaml, { discard: importDiscardCheckbox?.checked === true });
      releaseStatus.textContent = `Imported ${result.imported} answer${result.imported === 1 ? "" : "s"} from session ${result.sessionId || "<unknown>"}${result.discarded ? " (discarded the previous draft)." : "."}`;
      syncStages();
    }));
    const cancelImport = button("Cancel import", () => {
      if (importArea) importArea.replaceWith(importArea = null as unknown as HTMLTextAreaElement);
      importArea = null;
      if (importDiscardCheckbox) importDiscardCheckbox.replaceWith(importDiscardCheckbox = null as unknown as HTMLInputElement);
      importDiscardCheckbox = null;
      releaseStatus.textContent = "Import area closed.";
      syncStages();
    });
    releaseStatus.replaceChildren(
      document.createTextNode("Paste a previously-exported draft YAML (or an immutable response packet) and execute. Accepted record_type: hcc-worksheet-session-draft (mutable draft) or hcc-worksheet-response-packet (immutable packet); both must have matching worksheet_binding.worksheet_id."),
      importArea,
      importDiscardLabel,
      executeImport,
      cancelImport
    );
    syncStages();
  });

  const copyFinalButton = button("Copy answer packet YAML", copyFinalPacket);
  releaseActions.append(exportDraftButton, importDraftButton, finalize, copyFinalButton);
  body.append(stageList, releaseStatus, releaseActions);

  const actionsRow = node("div", "hcc-workbook__packet-actions");
  const previewInitial = button("Preview new packet", () => run(async () => {
    const result = await actions.saveInitial(false);
    initialPreview = result;
    showResult("Preview ready · no file created", result);
  }));
  const save = button("Create previewed packet", () => run(async () => {
    if (!initialPreview) throw new Error("Preview the exact packet before creating it.");
    const result = await actions.saveInitial(confirmation.checked, initialPreview);
    predecessor = result;
    createdVerified = result.readBack === "verified";
    initialPreview = null;
    applyLocator(result);
    showResult("Created and verified", result);
    await copyCreatedLocator(result);
  }));
  const load = button("Load explicit packet", () => run(async () => {
    const result = await actions.load(pathInput.input.value.trim(), digestInput.input.value.trim());
    predecessor = result;
    applyLocator(result);
    showResult(`Loaded ${result.responseCount} response(s)`, result);
  }));
  const applyLocatorBlock = button("Apply reload locator", () => {
    try {
      const locator = parseWorksheetPacketLocator(locatorInput.textarea.value);
      pathInput.input.value = locator.path;
      digestInput.input.value = locator.digest;
      status.textContent = "Reload locator accepted. Review the exact path and digest, then choose Load explicit packet.";
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : "The reload locator is invalid.";
    }
  });
  const previewAmendment = button("Preview amended successor", () => run(async () => {
    if (!predecessor) throw new Error("Load or save a predecessor packet before creating an amendment.");
    const result = await actions.saveAmendment(predecessor, reasonInput.input.value, false);
    amendmentPreview = result;
    showResult(`Revision ${result.revision} preview ready · no file created`, result);
  }));
  const amend = button("Create previewed successor", () => run(async () => {
    if (!predecessor) throw new Error("Load or save a predecessor packet before creating an amendment.");
    if (!amendmentPreview) throw new Error("Preview the exact successor before creating it.");
    const result = await actions.saveAmendment(predecessor, reasonInput.input.value, confirmation.checked, amendmentPreview);
    predecessor = result;
    createdVerified = result.readBack === "verified";
    amendmentPreview = null;
    applyLocator(result);
    reasonInput.input.value = "";
    showResult(`Created and verified revision ${result.revision}`, result);
    await copyCreatedLocator(result);
  }));
  actionsRow.append(previewInitial, save, applyLocatorBlock, load, previewAmendment, amend);

  const locatorCopy = button("Copy reload locator", () => {
    if (!copyText || !predecessor) return;
    const locator = `packet_path: ${predecessor.path}\npacket_digest: ${predecessor.digest}\n`;
    void copyText(locator).then(
      () => {
        locatorCopied = true;
        confirmationStatus.textContent = "Reload locator copied. Preserve it outside plugin memory before reloading Obsidian.";
        syncStages();
      },
      () => { confirmationStatus.textContent = "Copy failed; the path and digest remain visible in the fields."; }
    );
  });
  const quickStatus = node("p", "hcc-workbook__quick-packet-status", "Create an immutable packet in two clicks: preview, then confirm creation.");
  quickStatus.setAttribute("role", "status");
  quickStatus.setAttribute("aria-live", "polite");
  const quickCreateButton = button("Create immutable packet", () => {
    if (busy || predecessor !== null) return;
    const fingerprint = release.fingerprint();
    if (initialPreview === null) {
      reviewedFingerprint = fingerprint;
      finalizedFingerprint = fingerprint;
      preparedFinalFingerprint = fingerprint;
      busy = true;
      syncButtonStates();
      quickStatus.textContent = "Preparing exact packet bytes…";
      void actions.saveInitial(false).then((preview) => {
        if (release.fingerprint() !== fingerprint) {
          quickStatus.textContent = "An answer changed while preparing the packet. Choose Create immutable packet again.";
          return;
        }
        initialPreview = preview;
        showResult("Preview ready · no file created", preview);
        quickStatus.textContent = `No file created yet. Confirm ${preview.path} at ${preview.digest}.`;
        quickCreateButton.textContent = "Confirm and create packet";
      }).catch((error) => {
        quickStatus.textContent = error instanceof Error ? error.message : "The packet preview failed.";
      }).finally(() => {
        busy = false;
        syncButtonStates();
        syncStages();
      });
      return;
    }
    const expected = initialPreview;
    busy = true;
    confirmed = true;
    syncButtonStates();
    quickStatus.textContent = "Creating and verifying the exact previewed packet…";
    void actions.saveInitial(true, expected).then(async (result) => {
      predecessor = result;
      createdVerified = result.readBack === "verified";
      initialPreview = null;
      applyLocator(result);
      showResult("Created and verified", result);
      await copyCreatedLocator(result);
      quickStatus.textContent = locatorCopied
        ? `Created and verified ${result.path}. Reload locator copied automatically.`
        : `Created and verified ${result.path}. Use Copy reload locator in packet details.`;
      quickCreateButton.textContent = "Packet created";
    }).catch((error) => {
      quickStatus.textContent = error instanceof Error ? error.message : "The vault packet operation failed.";
    }).finally(() => {
      busy = false;
      syncButtonStates();
      syncStages();
    });
  });
  quickCreateButton.dataset.shortLabel = "Create packet";
  const openAdvancedButton = button("Load or amend packet", () => {
    details.open = true;
    pathInput.input.focus();
  });
  openAdvancedButton.dataset.shortLabel = "Load / amend";
  confirmation.addEventListener("change", () => {
    if (confirmation.checked && predecessor === null && finalizedFingerprint !== release.fingerprint()) {
      confirmation.checked = false;
      confirmationStatus.textContent = "Review and mark the current answers finalized before confirming a vault create.";
      syncButtonStates();
      syncStages();
      return;
    }
    if (confirmation.checked) confirmed = true;
    syncButtonStates();
    syncStages();
    if (!confirmation.checked) {
      confirmationStatus.textContent = "Creation confirmation cleared. Create actions are disabled; preview and load remain available.";
      return;
    }
    if (predecessor === null && initialPreview === null) {
      confirmationStatus.textContent = "Creation confirmation selected. Preparing the exact new-packet preview…";
      void prepareConfirmedInitialPreview();
      return;
    }
    if (predecessor !== null && amendmentPreview === null && reasonInput.input.value.trim().length > 0) {
      confirmationStatus.textContent = "Creation confirmation selected. Preparing the exact successor preview…";
      void prepareConfirmedAmendmentPreview();
      return;
    }
    confirmationStatus.textContent = predecessor !== null && amendmentPreview === null
      ? "Creation confirmation selected. Enter an amendment reason to prepare a successor preview."
      : "Creation confirmation selected. The applicable previewed create action is now available.";
  });
  reasonInput.input.addEventListener("input", () => {
    amendmentReasonRevision += 1;
    amendmentPreview = null;
    syncButtonStates();
  });
  reasonInput.input.addEventListener("change", () => {
    if (confirmation.checked && predecessor !== null && amendmentPreview === null && reasonInput.input.value.trim().length > 0 && !busy) {
      confirmationStatus.textContent = "Amendment reason recorded. Preparing the exact successor preview…";
      void prepareConfirmedAmendmentPreview();
    }
  });

  const prepareConfirmedInitialPreview = async (): Promise<void> => {
    busy = true;
    syncButtonStates();
    status.textContent = "Preparing exact preview…";
    try {
      initialPreview = await actions.saveInitial(false);
      showResult("Preview ready · no file created", initialPreview);
      confirmationStatus.textContent = "Exact preview prepared. Create previewed packet is now available.";
    } catch (error) {
      confirmation.checked = false;
      status.textContent = error instanceof Error ? error.message : "The packet preview failed.";
      confirmationStatus.textContent = "Creation confirmation cleared because the preview failed.";
    } finally {
      busy = false;
      syncButtonStates();
    }
  };

  const prepareConfirmedAmendmentPreview = async (): Promise<void> => {
    if (!predecessor) return;
    const reason = reasonInput.input.value;
    const reasonRevision = amendmentReasonRevision;
    busy = true;
    syncButtonStates();
    status.textContent = "Preparing exact successor preview…";
    try {
      const preview = await actions.saveAmendment(predecessor, reason, false);
      if (reasonRevision !== amendmentReasonRevision || reason !== reasonInput.input.value) {
        status.textContent = "The amendment reason changed during preview. Commit the current reason to prepare a fresh preview.";
        confirmationStatus.textContent = "Creation remains confirmed, but no stale successor preview is available.";
        return;
      }
      amendmentPreview = preview;
      showResult(`Revision ${preview.revision} preview ready · no file created`, preview);
      confirmationStatus.textContent = "Exact successor preview prepared. Create previewed successor is now available.";
    } catch (error) {
      confirmation.checked = false;
      status.textContent = error instanceof Error ? error.message : "The successor preview failed.";
      confirmationStatus.textContent = "Creation confirmation cleared because the successor preview failed.";
    } finally {
      busy = false;
      syncButtonStates();
    }
  };

  const run = (operation: () => Promise<void>): void => {
    busy = true;
    syncButtonStates();
    status.textContent = "Working…";
    void operation().catch((error) => {
      status.textContent = error instanceof Error ? error.message : "The vault packet operation failed.";
    }).finally(() => {
      busy = false;
      confirmation.checked = false;
      if (!confirmationStatus.textContent?.startsWith("Created and read-back verified")) {
        confirmationStatus.textContent = "Creation confirmation cleared after the operation.";
      }
      syncButtonStates();
      syncStages();
    });
  };
  const syncButtonStates = (): void => {
    const finalized = finalizedFingerprint === release.fingerprint();
    finalize.disabled = busy || reviewedFingerprint !== release.fingerprint();
    copyFinalButton.disabled = busy || !copyText;
    previewInitial.disabled = busy || predecessor !== null || !finalized;
    save.disabled = busy || predecessor !== null || initialPreview === null || !confirmation.checked;
    applyLocatorBlock.disabled = busy;
    load.disabled = busy;
    previewAmendment.disabled = busy || predecessor === null;
    amend.disabled = busy || predecessor === null || amendmentPreview === null || !confirmation.checked;
    locatorCopy.disabled = busy || predecessor === null || !copyText;
    quickCreateButton.disabled = busy || predecessor !== null;
    openAdvancedButton.disabled = busy;
  };
  const syncStages = (): void => {
    const fingerprint = release.fingerprint();
    const states = [
      release.requiredComplete(),
      reviewedFingerprint === fingerprint,
      finalizedFingerprint === fingerprint,
      preparedFinalFingerprint === fingerprint,
      initialPreview !== null || predecessor !== null,
      confirmed,
      createdVerified,
      locatorCopied
    ];
    releaseStages.forEach((stage, index) => { stage.dataset.hccComplete = String(states[index]); });
    const next = states.findIndex((complete) => !complete);
    releaseStatus.dataset.hccStage = String(next === -1 ? 8 : next + 1);
    if (!releaseStatus.textContent) releaseStatus.textContent = next === -1
      ? "Response packet workflow complete."
      : `Current stage: ${releaseStages[next]?.textContent ?? "review"}.`;
  };
  const copyCreatedLocator = async (value: WorksheetPacketReference): Promise<void> => {
    locatorCopied = false;
    if (!copyText) {
      confirmationStatus.textContent = "Created and read-back verified. Clipboard access is unavailable; use the visible locator fields.";
      syncStages();
      return;
    }
    const locator = `packet_path: ${value.path}\npacket_digest: ${value.digest}\n`;
    try {
      await copyText(locator);
      locatorCopied = true;
      confirmationStatus.textContent = "Created and read-back verified. Reload locator copied automatically.";
    } catch {
      confirmationStatus.textContent = "Created and read-back verified, but automatic locator copy failed. Use Copy reload locator.";
    }
    syncStages();
  };
  const applyLocator = (value: WorksheetPacketReference): void => {
    pathInput.input.value = value.path;
    digestInput.input.value = value.digest;
    locatorInput.textarea.value = `packet_path: ${value.path}\npacket_digest: ${value.digest}\n`;
  };
  const showResult = (message: string, value: WorksheetPacketReference & Partial<WorksheetPacketWriteResult>): void => {
    status.replaceChildren(
      node("strong", undefined, message),
      descriptionList([
        ["Path", value.path], ["Digest", value.digest], ["Record", value.recordId], ["Revision", String(value.revision)],
        ...(value.byteLength === undefined ? [] : [["Bytes", String(value.byteLength)], ["Read-back", value.readBack ?? "not reported"]] as [string, string][])
      ]),
      ...(value.yaml === undefined ? [] : [codeDisclosureForPacket(value.yaml, copyText)])
    );
  };

  body.append(locatorInput.wrapper, pathInput.wrapper, digestInput.wrapper, reasonInput.wrapper, confirmationLabel, confirmationStatus, actionsRow, locatorCopy, status);
  details.append(body);
  syncButtonStates();
  syncStages();
  return {
    element: details,
    quickCreateButton,
    openAdvancedButton,
    quickStatus,
    markReviewed: () => {
      reviewedFingerprint = release.fingerprint();
      releaseStatus.textContent = "Worksheet review prepared. Finalize when the required answers are complete.";
      syncButtonStates();
      syncStages();
    },
    markPrepared: () => {
      preparedFinalFingerprint = release.fingerprint();
      releaseStatus.textContent = "The final answer packet is prepared and visible below.";
      syncStages();
    },
    copyFinalPacket,
    sync: () => {
      const fingerprint = release.fingerprint();
      if (finalizedFingerprint !== null && finalizedFingerprint !== fingerprint) {
        finalizedFingerprint = null;
        preparedFinalFingerprint = null;
        initialPreview = null;
        confirmation.checked = false;
        confirmed = false;
        createdVerified = false;
        locatorCopied = false;
        quickCreateButton.textContent = "Create immutable packet";
        quickStatus.textContent = "Answers changed. Create an immutable packet in two clicks: preview, then confirm creation.";
        releaseStatus.textContent = "An answer changed. Review and finalize the current responses before preparing a new packet.";
      }
      syncButtonStates();
      syncStages();
    }
  };
}

let packetPanelSequence = 0;

function codeDisclosureForPacket(value: string, copyText?: (value: string) => Promise<void>): HTMLElement {
  const details = document.createElement("details");
  details.append(node("summary", undefined, "Exact YAML bytes"), copyableCodeBlock(value, copyText));
  return details;
}

function labeledInput(
  label: string,
  type: string,
  initialValue: string,
  copyText?: (value: string) => Promise<void>
): { wrapper: HTMLElement; input: HTMLInputElement; copy: HTMLButtonElement } {
  const wrapper = node("div", "hcc-workbook__packet-field");
  const labelElement = node("label", undefined, label);
  const input = document.createElement("input");
  input.id = `hcc-packet-field-${++packetPanelSequence}`;
  input.type = type;
  input.value = initialValue;
  input.autocomplete = "off";
  isolatePacketTextControl(input);
  labelElement.htmlFor = input.id;
  const copy = fieldCopyButton(label, () => input.value, copyText);
  wrapper.append(labelElement, fieldControl(input, copy));
  return { wrapper, input, copy };
}

function labeledTextarea(
  label: string,
  initialValue: string,
  copyText?: (value: string) => Promise<void>
): { wrapper: HTMLElement; textarea: HTMLTextAreaElement; copy: HTMLButtonElement } {
  const wrapper = node("div", "hcc-workbook__packet-field");
  const labelElement = node("label", undefined, label);
  const textarea = document.createElement("textarea");
  textarea.id = `hcc-packet-field-${++packetPanelSequence}`;
  textarea.rows = 3;
  textarea.value = initialValue;
  textarea.autocomplete = "off";
  textarea.spellcheck = false;
  isolatePacketTextControl(textarea);
  labelElement.htmlFor = textarea.id;
  const copy = fieldCopyButton(label, () => textarea.value, copyText);
  wrapper.append(labelElement, fieldControl(textarea, copy));
  return { wrapper, textarea, copy };
}

function fieldControl(control: HTMLInputElement | HTMLTextAreaElement, copy: HTMLButtonElement): HTMLElement {
  const row = node("div", "hcc-workbook__packet-field-control");
  row.append(control, copy);
  return row;
}

function isolatePacketTextControl(control: HTMLInputElement | HTMLTextAreaElement): void {
  for (const type of ["keydown", "keypress", "keyup"] as const) {
    control.addEventListener(type, (event) => {
      if ((event as KeyboardEvent).key !== "Escape") event.stopPropagation();
    });
  }
  for (const type of ["beforeinput", "input", "paste", "cut", "copy", "pointerdown", "mousedown", "selectstart"] as const) {
    control.addEventListener(type, (event) => { event.stopPropagation(); });
  }
}

function fieldCopyButton(label: string, value: () => string, copyText?: (value: string) => Promise<void>): HTMLButtonElement {
  const copy = button("Copy", () => {
    if (!copyText) return;
    copy.disabled = true;
    void copyText(value()).then(
      () => { copy.textContent = "Copied"; },
      () => { copy.textContent = "Failed"; }
    ).finally(() => {
      const reset = (): void => { copy.textContent = "Copy"; copy.disabled = false; };
      const ownerWindow = copy.ownerDocument.defaultView;
      if (ownerWindow) ownerWindow.setTimeout(reset, 1200);
      else reset();
    });
  });
  copy.classList.add("hcc-workbook__packet-field-copy");
  copy.setAttribute("aria-label", `Copy entire ${label.toLowerCase()}`);
  copy.title = `Copy entire ${label.toLowerCase()} to clipboard`;
  if (!copyText) copy.disabled = true;
  return copy;
}

export function renderWorkbook(
  container: HTMLElement,
  workbook: WorkbookContract,
  sessions: EphemeralWorkbookSessions,
  actions: WorkbookRenderActions = {}
): () => void {
  container.replaceChildren();
  const root = node("article", "hcc-workbook hcc-workbook--manifest");
  root.append(
    node("p", "hcc-widget__identity", "HCC workbook candidate"),
    node("h3", "hcc-workbook__title", workbook.title),
    node("p", "hcc-workbook__purpose", workbook.purpose),
    node("p", "hcc-widget__phase-notice", "Navigation follows only this explicit manifest. No vault search or inferred membership occurs.")
  );
  const tableWrap = node("div", "hcc-workbook__table-wrap");
  const table = node("table", "hcc-workbook__manifest-table");
  const caption = node("caption", undefined, "Workbook worksheet manifest");
  const head = node("thead");
  const headRow = node("tr");
  ["Worksheet", "Vault path", "Session state", "Action"].forEach((label) => headRow.append(node("th", undefined, label)));
  head.append(headRow);
  const body = node("tbody");
  table.append(caption, head, body);
  tableWrap.append(table);
  const refresh = (): void => {
    body.replaceChildren();
    workbook.worksheets.forEach((worksheet) => {
      const row = node("tr", "hcc-workbook__manifest-row");
      const state = sessions.hasResponses(worksheet.ref) ? "in progress in plugin memory" : "not started in this plugin session";
      const label = node("th", undefined, worksheet.label);
      label.setAttribute("scope", "row");
      const path = node("td");
      path.append(node("code", undefined, worksheet.ref));
      const sessionState = node("td");
      sessionState.append(node("span", "hcc-workbook__state", state));
      const action = node("td", "hcc-workbook__action-cell");
      if (actions.openRef) {
        const open = button("Open worksheet", () => actions.openRef?.(worksheet.ref));
        open.classList.add("hcc-workbook__action");
        action.append(open);
      } else action.append(node("span", "hcc-widget__held-note", "Navigation unavailable"));
      row.append(label, path, sessionState, action);
      body.append(row);
    });
  };
  const governance = document.createElement("details");
  governance.append(node("summary", undefined, "Workbook governance"));
  governance.append(descriptionList([
    ["Workbook ID", workbook.id],
    ["Navigation", workbook.navigation],
    ["Review required", String(workbook.governance.review_required)],
    ["Authority references", workbook.governance.authority_refs.join(", ") || "none declared"]
  ]));
  if (actions.openGovernance) governance.append(button("Open governance workbench", actions.openGovernance));
  root.append(tableWrap, governance);
  container.append(root);
  refresh();
  const disposers = workbook.worksheets.map((worksheet) => sessions.subscribe(worksheet.ref, refresh));
  return () => disposers.forEach((dispose) => dispose());
}

export function renderWorkbookDiagnostics(
  container: HTMLElement,
  title: string,
  diagnostics: readonly WorkbookDiagnostic[],
  source: string
): void {
  container.replaceChildren();
  const root = node("article", "hcc-widget hcc-widget--error");
  root.setAttribute("role", "alert");
  root.append(node("h3", undefined, title), node("p", undefined, "The contract remains unchanged and visible below."));
  const list = node("ul", "hcc-widget__diagnostics");
  diagnostics.forEach((item) => list.append(node("li", undefined, `${item.code} at ${item.path}: ${item.message}`)));
  root.append(list, codeBlock(source));
  container.append(root);
}

function focusInteraction(scope: ParentNode, id: string): void {
  const target = Array.from(scope.querySelectorAll<HTMLElement>("[data-hcc-interaction-id]"))
    .find((element) => element.dataset.hccInteractionId === id);
  const control = Array.from(target?.querySelectorAll<HTMLElement>("input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])") ?? [])
    .find((element) => !element.closest(".hcc-workbook__focus-stage"));
  (control ?? target)?.focus({ preventScroll: true });
  positionInteractionPrompt(scope, id);
}

function positionInteractionPrompt(scope: ParentNode, id: string): void {
  const target = Array.from(scope.querySelectorAll<HTMLElement>("[data-hcc-interaction-id]"))
    .find((element) => element.dataset.hccInteractionId === id);
  const prompt = target?.querySelector<HTMLElement>(".hcc-widget__prompt");
  (prompt ?? target)?.scrollIntoView({ block: "center", inline: "nearest" });
}

function codeBlock(value: string): HTMLElement {
  const pre = node("pre", "hcc-widget__preview-json");
  const code = document.createElement("code");
  code.textContent = value;
  pre.append(code);
  return pre;
}

function copyableCodeBlock(value: string, copyText?: (value: string) => Promise<void>): HTMLElement {
  const wrapper = node("div", "hcc-widget__copyable-block");
  const status = node("span", "hcc-widget__copy-status");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  const copy = button("Copy block", () => {
    if (!copyText) return;
    copy.disabled = true;
    void copyText(value).then(
      () => { copy.textContent = "Copied"; status.textContent = "YAML block copied to the clipboard."; },
      () => { copy.textContent = "Copy block"; status.textContent = "Copy failed; the YAML remains visible and no vault file was changed."; }
    ).finally(() => { copy.disabled = false; });
  });
  copy.classList.add("hcc-widget__copy-block-button");
  if (!copyText) {
    copy.disabled = true;
    copy.title = "Clipboard action unavailable in this rendering context";
  }
  wrapper.append(copy, status, codeBlock(value));
  return wrapper;
}
