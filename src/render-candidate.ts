import { dump } from "js-yaml";

import { getCandidateRenderer, parseCandidateInteraction } from "./grammar";
import type {
  CandidateInteraction,
  CandidateResponse,
  CandidateResponseValue,
  GrammarDiagnostic
} from "./grammar";
import type { InteractionSessionBinding } from "./workbook";
import { actionRow, button, candidateNoteDisclosure, candidateStateShortcuts, codeDisclosure, descriptionList, node, renderCandidateControl } from "./ui";

export function renderCandidateDiagnostics(
  container: HTMLElement,
  diagnostics: readonly GrammarDiagnostic[],
  source: string
): void {
  container.replaceChildren();
  const root = node("article", "hcc-widget hcc-widget--error");
  root.setAttribute("role", "alert");
  root.append(
    node("p", "hcc-widget__identity", "HCC candidate · blocked"),
    node("h3", "hcc-widget__prompt", "Candidate interaction could not be rendered"),
    node("p", "hcc-widget__phase-notice", "The candidate source remains unchanged and visible below.")
  );
  const list = node("ul", "hcc-widget__diagnostics");
  diagnostics.forEach((item) => list.append(node("li", undefined, `${item.code} at ${item.path}: ${item.message}`)));
  root.append(list, codeDisclosure("Candidate YAML", source, true));
  container.append(root);
}

export function renderCandidateInteraction(
  container: HTMLElement,
  block: CandidateInteraction,
  source: string,
  session?: InteractionSessionBinding<CandidateResponse>
): void {
  container.replaceChildren();
  const root = node("article", "hcc-widget hcc-widget--candidate");
  root.dataset.kind = block.kind;
  root.dataset.hccInteractionId = block.id;
  root.append(
    node("p", "hcc-widget__identity", `HCC candidate question · ${block.kind}`),
    node("h3", "hcc-widget__prompt", block.prompt)
  );
  if (block.help) root.append(node("p", "hcc-widget__help", block.help));

  const fallback: CandidateResponse = {
    ...block.response,
    value: cloneValue(block.response.value)
  };
  const draft = session?.get(fallback) ?? fallback;
  const status = node("p", "hcc-widget__status", "Local candidate draft · not recorded.");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  const controls = node("div", "hcc-widget__controls");
  const review = node("section", "hcc-widget__review-region");
  review.hidden = true;
  review.tabIndex = -1;

  const changed = (value: CandidateResponseValue, message: string): void => {
    draft.value = value;
    draft.state = isEmpty(value) ? "unanswered" : "answered";
    session?.update({ ...draft, value: cloneValue(draft.value) }, block.kind, block.version);
    status.textContent = `${message} The source file is unchanged.`;
    review.hidden = true;
  };
  controls.append(renderCandidateControl(block, draft.value, changed));
  controls.append(candidateStateShortcuts(draft, () => {
    session?.update({ ...draft, value: cloneValue(draft.value) }, block.kind, block.version);
    status.textContent = `Session response marked ${draft.state.replaceAll("_", " ")}. The source file is unchanged.`;
    review.hidden = true;
    renderCandidateInteraction(container, { ...block, response: draft } as CandidateInteraction, source, session);
  }));
  controls.append(candidateNoteDisclosure(block.id, draft, () => {
    session?.update({ ...draft, value: cloneValue(draft.value) }, block.kind, block.version);
    status.textContent = "Session context note changed. The source file is unchanged.";
    review.hidden = true;
  }));

  const reviewButton = button("Review candidate response", () => {
    review.replaceChildren();
    const candidateSource = dump({ ...block, response: draft }, { lineWidth: -1, noRefs: true });
    const validation = parseCandidateInteraction(candidateSource);
    review.append(node("h4", undefined, "Review before any record"));
    if (!validation.ok) {
      review.append(node("p", "hcc-validation-summary", "Local candidate validation is blocked."));
      const list = node("ul", "hcc-widget__diagnostics");
      validation.diagnostics.forEach((item) => list.append(node("li", undefined, `${item.code} at ${item.path}: ${item.message}`)));
      review.append(list);
    } else {
      const renderer = getCandidateRenderer(block.kind);
      const proposal = dump({
        record_type: "hcc-response-candidate",
        contract_version: block.version,
        authority: "candidate-only",
        interaction_ref: block.id,
        renderer_id: renderer.rendererId,
        response: draft,
        integrity: { source_digest: null, payload_digest: null, idempotency_key: null },
        effects: { save: "prohibited", submit: "prohibited" }
      }, { lineWidth: -1, noRefs: true });
      review.append(
        node("p", "hcc-widget__preview-label", "Candidate only · not written, submitted, admitted, or canonical"),
        codeDisclosure("Exact response proposal YAML", proposal, true),
        node("p", "hcc-widget__held-note", "Grammar admission, source canonicalization, digest binding, route, consent, persistence, and migration remain human-gated.")
      );
    }
    const record = button("Record response · human release required", () => undefined);
    record.disabled = true;
    const back = button("Back to question", () => {
      review.hidden = true;
      reviewButton.focus();
    });
    review.append(actionRow(back, record));
    review.hidden = false;
    review.focus();
  });
  const reset = button("Reset", () => {
    session?.reset();
    renderCandidateInteraction(container, block, source, session);
  });
  reset.classList.add("hcc-widget__button--quiet");

  const details = document.createElement("details");
  details.className = "hcc-widget__companion-details";
  details.append(node("summary", undefined, "Candidate contract and source"));
  const renderer = getCandidateRenderer(block.kind);
  details.append(
    node("p", "hcc-widget__phase-notice", "This 0.2 candidate is not admitted HCC grammar and has no automatic migration."),
    descriptionList([
      ["Renderer", renderer.rendererId],
      ["Review state", renderer.reviewState],
      ["Fallback", renderer.fallback],
      ["Migration", renderer.migration]
    ]),
    codeDisclosure("Canonical fixture YAML", source, false)
  );
  root.append(controls, actionRow(reviewButton, reset), status, details, review);
  container.append(root);
}

function cloneValue(value: CandidateResponseValue): CandidateResponseValue {
  if (Array.isArray(value)) return value.map((item) => isRecord(item) ? { ...item } : item) as CandidateResponseValue;
  return isRecord(value) ? { ...value } : value;
}

function isEmpty(value: CandidateResponseValue): boolean {
  return value === null || value === "" || (Array.isArray(value) && value.length === 0) || (isRecord(value) && Object.keys(value).length === 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
