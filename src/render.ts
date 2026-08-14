import { buildHeldIntakePreview, validateLocalDraft } from "./core/intake-preview";
import { setAnsweredValue, setExplicitState } from "./core/draft";
import { buildAdjacentResponseReview } from "./core/response-candidate";
import type {
  CompanionContext,
  Diagnostic,
  InteractionResponse,
  InteractionViewModel
} from "./core/types";
import { cloneResponse } from "./core/view-model";
import type { InteractionSessionBinding } from "./workbook";
import { actionRow, button, descriptionList, node as element } from "./ui";

export function appendPerformanceObservation(
  container: HTMLElement,
  pluginLoadMs: number,
  blockRenderMs: number
): void {
  const target = container.querySelector<HTMLElement>(".hcc-widget__validation-region");
  if (!target) return;
  target.append(element(
    "p",
    "hcc-widget__performance-observation",
    `Ephemeral observation: plugin registration ${pluginLoadMs.toFixed(2)} ms · this block ${blockRenderMs.toFixed(2)} ms. No threshold or performance claim is implied.`
  ));
}

export function renderInteraction(
  container: HTMLElement,
  model: InteractionViewModel,
  source: string,
  context: CompanionContext,
  session?: InteractionSessionBinding<InteractionResponse>
): void {
  container.replaceChildren();
  const root = element("article", "hcc-widget hcc-interaction-card");
  root.dataset.hccState = model.response.state;
  root.dataset.kind = model.kind;
  root.dataset.hccInteractionId = model.id;
  root.setAttribute("aria-labelledby", `${model.id}-title`);

  const header = element("header", "hcc-widget__header");
  header.append(element("span", "hcc-interaction__eyebrow hcc-widget__identity", "HCC question"));
  const title = element("h3", "hcc-interaction__title hcc-widget__prompt", model.prompt);
  title.id = `${model.id}-title`;
  root.append(header, title);

  const status = element("p", "hcc-widget__status");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  status.textContent = "Local session draft · not recorded.";
  const draft = session?.get(model.response) ?? cloneResponse(model.response);
  let refreshReview = (): void => undefined;
  const draftChanged = (message: string): void => {
    root.dataset.hccState = draft.state;
    status.textContent = `${message} The source file is unchanged.`;
    session?.update(cloneResponse(draft), model.kind, model.version);
    reviewRegion.hidden = true;
    refreshReview();
  };

  const interactionRegion = element("section", "hcc-widget__interaction-region");
  interactionRegion.setAttribute("aria-label", "Response input");
  const controls = element("div", "hcc-widget__controls");
  const primary = renderPrimaryControl(controls, model, draft, draftChanged);
  controls.append(renderStateShortcuts(model, draft, primary, draftChanged));
  controls.append(renderNoteControl(model, draft, draftChanged));
  interactionRegion.append(controls);

  const presentationRegion = renderPresentationRegion(model, source, context);
  const adjacentRegion = renderAdjacentRegion(context, status);
  const details = disclosure(
    `Context and related work · ${context.adjacentWork.items.length}${context.adjacentWork.moreNotShown > 0 ? "+" : ""}`,
    false
  );
  details.classList.add("hcc-widget__companion-details");
  details.append(presentationRegion, adjacentRegion);

  const reviewRegion = region("D", "Review before record", "hcc-form-card hcc-widget__intake-region hcc-widget__review-region");
  reviewRegion.hidden = true;
  reviewRegion.tabIndex = -1;
  const reviewOutput = element("div", "hcc-widget__preview-output");
  const recordButton = button("Record response · human release required", () => undefined);
  recordButton.disabled = true;
  const backButton = button("Back to question", () => {
    reviewRegion.hidden = true;
    reviewButton.focus();
  });
  reviewRegion.append(
    element("p", "hcc-widget__region-note", "Inspect the exact proposal and blockers. Nothing below has been written, submitted, or admitted."),
    reviewOutput,
    actionRow(backButton, recordButton)
  );

  const actions = element("div", "hcc-widget__actions");
  const reviewButton = button("Review response", () => {
    refreshReview();
    reviewRegion.hidden = false;
    reviewRegion.focus();
  });
  const resetButton = button("Reset", () => {
    session?.reset();
    renderInteraction(container, model, source, context, session);
  });
  resetButton.classList.add("hcc-widget__button--quiet");
  actions.append(reviewButton, resetButton);
  interactionRegion.append(actions, status);
  root.append(interactionRegion, details, reviewRegion);
  container.append(root);

  refreshReview = (): void => {
    const failures = validateLocalDraft(model, draft);
    reviewButton.disabled = failures.length > 0;
    reviewOutput.replaceChildren();
    if (failures.length > 0) {
      const list = element("ul", "hcc-validation-summary");
      failures.forEach((failure) => list.append(element("li", undefined, `${failure.failure}: ${failure.message}`)));
      reviewOutput.append(element("p", undefined, "Local draft validation: blocked."), list);
      return;
    }

    const responseReview = buildAdjacentResponseReview(model, draft, context);
    const intake = buildHeldIntakePreview(model, draft, context);
    reviewOutput.append(
      element("p", "hcc-widget__preview-label", responseReview.label),
      descriptionList([
        ["Response state", draft.state.replaceAll("_", " ")],
        ["Candidate ID", responseReview.candidate.id],
        ["Target", `adjacent to ${context.sourcePath} (proposal only)`],
        ["Source digest", context.sourceDigest ?? "absent — freshness not established"],
        ["Payload digest", "null — canonicalization unreleased"],
        ["Idempotency key", "null — derivation unreleased"]
      ]),
      codeDisclosure("Exact candidate YAML", responseReview.yaml, true),
      codeDisclosure("Proposed append-only diff", responseReview.proposedDiff, false),
      gateList("Response-contract blockers", responseReview.gates)
    );
    if (intake.locallyValid) {
      reviewOutput.append(
        gateList("Held Intake mapping blockers", intake.gates),
        codeDisclosure("Evaluate-only Intake projection", JSON.stringify(intake.projection, null, 2), false)
      );
    }
  };
  refreshReview();
}

export function renderDiagnostics(
  container: HTMLElement,
  diagnostics: Diagnostic[],
  source: string,
  sourcePath = "unknown"
): void {
  container.replaceChildren();
  const root = element("article", "hcc-widget hcc-interaction-card hcc-widget--error");
  root.dataset.hccInvalid = "true";
  root.setAttribute("role", "alert");
  root.append(
    element("p", "hcc-interaction__eyebrow", "HCC companion · blocked"),
    element("h3", "hcc-interaction__title hcc-widget__prompt", "HCC block could not be rendered"),
    element("p", "hcc-widget__phase-notice", "The source remains visible and no vault write occurred.")
  );
  const validationRegion = region("B", "Presentation and validation", "hcc-widget__validation-region");
  validationRegion.append(sourceBinding(sourcePath, null, "unsupported or invalid", "blocked"));
  const list = element("ul", "hcc-validation-summary hcc-widget__diagnostics");
  for (const diagnostic of diagnostics) {
    const item = element("li");
    item.append(
      element("code", "hcc-widget__diagnostic-code", diagnostic.failure),
      document.createTextNode(` · ${diagnostic.code} at ${diagnostic.path}: ${diagnostic.message}`)
    );
    list.append(item);
  }
  validationRegion.append(list, sourceDisclosure(source, true));
  root.append(validationRegion);
  container.append(root);
}

function renderPresentationRegion(
  model: InteractionViewModel,
  source: string,
  context: CompanionContext
): HTMLElement {
  const wrapper = region("B", "Presentation and validation", "hcc-widget__validation-region");
  if (model.help) wrapper.append(element("p", "hcc-widget__help", model.help));
  wrapper.append(element("p", "hcc-widget__phase-notice", model.phaseNotice));
  wrapper.append(sourceBinding(context.sourcePath, context.sourceDigest, model.widgetCatalogId, "supported"));

  const views = element("div", "hcc-widget__views");
  const rendered = disclosure("Rendered view summary", false);
  rendered.append(descriptionList([
    ["Stable block ID", model.id],
    ["Grammar/version", `hcc-interaction ${model.version}`],
    ["Response state", model.response.state],
    ["Theme dependency", "none; HCC theme hooks are optional"]
  ]));
  const diagnostics = disclosure("Diagnostics view", false);
  diagnostics.append(element("p", "hcc-validation-summary", "No parser or semantic diagnostics. Local draft validation is applied before Review response opens."));
  views.append(rendered, sourceDisclosure(source, false), diagnostics);
  wrapper.append(views);
  return wrapper;
}

function renderAdjacentRegion(context: CompanionContext, status: HTMLElement): HTMLElement {
  const wrapper = region("C", "Adjacent work", "hcc-widget__adjacent-region");
  wrapper.append(element(
    "p",
    "hcc-widget__region-note",
    "Only explicit active-note relationships are shown. No crawl, ranking, inference, or independent index is used."
  ));
  if (context.adjacentWork.items.length === 0) {
    wrapper.append(element("p", "hcc-widget__empty", "No explicit related, graph, thread, work-item, or source references were found."));
  } else {
    const list = element("ul", "hcc-widget__adjacent-list");
    for (const item of context.adjacentWork.items) {
      const row = element("li", "hcc-widget__adjacent-item");
      const heading = element("strong", undefined, item.title);
      const relation = element("span", "hcc-widget__relationship", `Relationship source: ${item.relationship}`);
      const target = element("code", undefined, item.resolvedPath ?? `unresolved: ${item.target}`);
      const metadata = element(
        "span",
        "hcc-widget__metadata",
        `Authority: ${item.authorityLabel ?? "unknown"} · Review: ${item.reviewLabel ?? "unknown"} · Verified: ${item.verifiedLabel ?? "unknown"}`
      );
      const actions = element("span", "hcc-widget__inline-actions");
      const open = button("Open source", () => {
        if (!item.resolvedPath || !context.openTarget) return;
        context.openTarget(item.target);
        status.textContent = `Opened ${item.resolvedPath}. No metadata was changed.`;
      });
      open.disabled = item.resolvedPath === null || context.openTarget === undefined;
      const copy = button("Copy path", () => {
        const path = item.resolvedPath ?? item.target;
        if (!context.copyPath) return;
        void context.copyPath(path).then(
          () => { status.textContent = `Copied ${path}.`; },
          () => { status.textContent = `Could not copy ${path}; the vault remains unchanged.`; }
        );
      });
      copy.disabled = context.copyPath === undefined;
      actions.append(open, copy);
      row.append(heading, relation, target, metadata, actions);
      list.append(row);
    }
    wrapper.append(list);
  }
  if (context.adjacentWork.moreNotShown > 0) {
    wrapper.append(element("p", "hcc-widget__cap-notice", `${context.adjacentWork.moreNotShown} more explicit relationship(s) not shown.`));
  }
  if (context.adjacentWork.diagnostics.length > 0) {
    const details = disclosure("Adjacent-work diagnostics", false);
    const list = element("ul", "hcc-validation-summary");
    for (const diagnostic of context.adjacentWork.diagnostics) {
      list.append(element("li", undefined, `${diagnostic.failure}: ${diagnostic.message}`));
    }
    details.append(list);
    wrapper.append(details);
  }
  return wrapper;
}

interface PrimaryControlHandle {
  clear: () => void;
  focus: () => void;
}

function renderPrimaryControl(
  container: HTMLElement,
  model: InteractionViewModel,
  draft: InteractionResponse,
  changed: (message: string) => void
): PrimaryControlHandle {
  if (model.kind === "choose_one") {
    const fieldset = element("fieldset", "hcc-widget__fieldset");
    fieldset.append(element("legend", "hcc-widget__legend", "Choose one"));
    const inputs: HTMLInputElement[] = [];
    for (const option of model.options) {
      const label = element("label", "hcc-widget__option");
      const input = document.createElement("input");
      input.type = "radio";
      input.name = `${model.id}-choice`;
      input.value = option.id;
      input.checked = draft.value === option.id;
      input.addEventListener("change", () => {
        setAnsweredValue(draft, option.id);
        changed(`Session draft changed to ${option.label}.`);
      });
      inputs.push(input);
      label.append(input, document.createTextNode(option.label));
      fieldset.append(label);
    }
    container.append(fieldset);
    return {
      clear: () => inputs.forEach((input) => { input.checked = false; }),
      focus: () => inputs[0]?.focus()
    };
  }
  if (model.kind === "choose_many") {
    const fieldset = element("fieldset", "hcc-widget__fieldset");
    fieldset.append(element("legend", "hcc-widget__legend", "Choose any that apply"));
    const selected = new Set(Array.isArray(draft.value) ? draft.value : []);
    for (const option of model.options) {
      const label = element("label", "hcc-widget__option");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = option.id;
      input.checked = selected.has(option.id);
      input.addEventListener("change", () => {
        if (input.checked) selected.add(option.id);
        else selected.delete(option.id);
        setAnsweredValue(draft, [...selected]);
        changed(`Session draft now has ${selected.size} selection${selected.size === 1 ? "" : "s"}.`);
      });
      label.append(input, document.createTextNode(option.label));
      fieldset.append(label);
    }
    container.append(fieldset);
    return {
      clear: () => {
        selected.clear();
        fieldset.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((input) => { input.checked = false; });
      },
      focus: () => fieldset.querySelector<HTMLInputElement>('input[type="checkbox"]')?.focus()
    };
  }
  const wrapper = element("div", "hcc-widget__field");
  const label = element("label", "hcc-widget__label", "Response");
  label.htmlFor = `${model.id}-long-text`;
  const textarea = document.createElement("textarea");
  textarea.id = `${model.id}-long-text`;
  textarea.className = "hcc-widget__textarea";
  textarea.rows = 5;
  textarea.value = typeof draft.value === "string" ? draft.value : "";
  textarea.addEventListener("input", () => {
    setAnsweredValue(draft, textarea.value);
    changed("Session text draft changed.");
  });
  wrapper.append(label, textarea);
  container.append(wrapper);
  return {
    clear: () => { textarea.value = ""; },
    focus: () => textarea.focus()
  };
}

function renderStateShortcuts(
  model: InteractionViewModel,
  draft: InteractionResponse,
  primary: PrimaryControlHandle,
  changed: (message: string) => void
): HTMLElement {
  const wrapper = element("div", "hcc-widget__state-shortcuts");
  wrapper.setAttribute("aria-label", "Response state shortcuts");
  const apply = (state: "deferred" | "not_applicable" | "unanswered", label: string): void => {
    setExplicitState(draft, state, model.kind);
    primary.clear();
    changed(`Session response marked ${label}.`);
  };
  wrapper.append(
    button("Defer", () => apply("deferred", "deferred")),
    button("Not applicable", () => apply("not_applicable", "not applicable")),
    button("Clear answer", () => {
      apply("unanswered", "unanswered");
      primary.focus();
    })
  );
  wrapper.querySelectorAll("button").forEach((item) => item.classList.add("hcc-widget__button--quiet"));
  return wrapper;
}

function renderNoteControl(
  model: InteractionViewModel,
  draft: InteractionResponse,
  changed: (message: string) => void
): HTMLDetailsElement {
  const details = disclosure("Add correction, dissent, or context", draft.note !== null && draft.note !== "");
  details.classList.add("hcc-widget__note-disclosure");
  const wrapper = element("div", "hcc-widget__field");
  const label = element("label", "hcc-widget__label", "Correction, dissent, or context note");
  label.htmlFor = `${model.id}-note`;
  const textarea = document.createElement("textarea");
  textarea.id = `${model.id}-note`;
  textarea.className = "hcc-widget__textarea";
  textarea.rows = 3;
  textarea.value = draft.note ?? "";
  textarea.addEventListener("input", () => {
    draft.note = textarea.value;
    changed("Session correction or context note changed.");
  });
  wrapper.append(label, textarea);
  details.append(wrapper);
  return details;
}

function sourceBinding(
  sourcePath: string,
  digest: string | null,
  renderer: string,
  support: string
): HTMLElement {
  const wrapper = element("div", "hcc-source-binding");
  wrapper.append(descriptionList([
    ["Source path", sourcePath],
    ["Source digest", digest ?? "not supplied by this Phase 0 fence"],
    ["Renderer/catalog binding", renderer],
    ["Renderer support", support]
  ]));
  return wrapper;
}

function sourceDisclosure(source: string, open: boolean): HTMLDetailsElement {
  const details = disclosure("Source view — canonical YAML", open);
  details.classList.add("hcc-widget__source");
  const pre = element("pre", "hcc-widget__source-code");
  const code = document.createElement("code");
  code.textContent = source;
  pre.append(code);
  details.append(pre);
  return details;
}

function codeDisclosure(summary: string, content: string, open: boolean): HTMLDetailsElement {
  const details = disclosure(summary, open);
  const pre = element("pre", "hcc-widget__preview-json");
  const code = document.createElement("code");
  code.textContent = content;
  pre.append(code);
  details.append(pre);
  return details;
}

function gateList(
  heading: string,
  gates: ReadonlyArray<{ failure: string; message: string }>
): HTMLElement {
  const wrapper = element("section", "hcc-widget__gate-group");
  wrapper.append(element("h5", undefined, heading));
  const list = element("ul", "hcc-widget__gate-list");
  gates.forEach((gate) => list.append(element("li", undefined, `${gate.failure}: ${gate.message}`)));
  wrapper.append(list);
  return wrapper;
}

function region(letter: string, title: string, className: string): HTMLElement {
  const wrapper = element("section", `hcc-widget__region ${className}`);
  wrapper.setAttribute("aria-label", `Region ${letter}: ${title}`);
  wrapper.append(element("h4", "hcc-widget__region-title", `${letter} · ${title}`));
  return wrapper;
}

function disclosure(summary: string, open: boolean): HTMLDetailsElement {
  const details = document.createElement("details");
  details.open = open;
  details.append(element("summary", "hcc-widget__source-summary", summary));
  return details;
}
