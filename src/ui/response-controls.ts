import type { CandidateResponse } from "../grammar";
import { button, labeled, node } from "./dom";

export function candidateStateShortcuts(draft: CandidateResponse, changed: () => void): HTMLElement {
  const row = node("div", "hcc-widget__state-shortcuts");
  ([
    ["deferred", "Defer"],
    ["not_applicable", "Not applicable"],
    ["unanswered", "Clear answer"]
  ] as const).forEach(([state, label]) => {
    const control = button(label, () => {
      draft.state = state;
      draft.value = null;
      changed();
    });
    control.classList.add("hcc-widget__button--quiet");
    row.append(control);
  });
  return row;
}

export function candidateNoteDisclosure(id: string, draft: CandidateResponse, changed: () => void): HTMLDetailsElement {
  const details = document.createElement("details");
  details.className = "hcc-widget__note-disclosure";
  details.open = Boolean(draft.note);
  details.append(node("summary", undefined, "Add correction, dissent, or context"));
  const textarea = document.createElement("textarea");
  textarea.id = `${id}-candidate-note`;
  textarea.rows = 3;
  textarea.className = "hcc-widget__textarea";
  textarea.value = draft.note ?? "";
  textarea.addEventListener("input", () => {
    draft.note = textarea.value === "" ? null : textarea.value;
    changed();
  });
  details.append(labeled(textarea.id, "Correction, dissent, or context note", textarea));
  return details;
}
