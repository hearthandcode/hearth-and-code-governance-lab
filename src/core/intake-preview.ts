import type {
  CompanionContext,
  CompanionFailureCode,
  HeldIntakePreview,
  InteractionResponse,
  InteractionViewModel
} from "./types";
import { cloneResponse } from "./view-model";

export function validateLocalDraft(
  model: InteractionViewModel,
  draft: InteractionResponse
): Array<{ failure: CompanionFailureCode; message: string }> {
  const valueIsEmpty = draft.value === null
    || draft.value === ""
    || (Array.isArray(draft.value) && draft.value.length === 0);
  const failures: Array<{ failure: CompanionFailureCode; message: string }> = [];

  if (draft.state === "unanswered" && !valueIsEmpty) {
    failures.push({
      failure: "semantic-invalid",
      message: "An unanswered draft cannot carry a response value. Select answered or clear the value."
    });
  }
  if (draft.state === "answered" && valueIsEmpty) {
    failures.push({
      failure: "semantic-invalid",
      message: "An answered draft needs a response value."
    });
  }
  if (model.kind === "choose_one" && typeof draft.value === "string" && !model.options.some((item) => item.id === draft.value)) {
    failures.push({ failure: "semantic-invalid", message: "The draft references an undeclared option ID." });
  }
  if (model.kind === "choose_many" && Array.isArray(draft.value)) {
    const allowed = new Set(model.options.map((item) => item.id));
    if (draft.value.some((item) => !allowed.has(item))) {
      failures.push({ failure: "semantic-invalid", message: "The draft contains an undeclared option ID." });
    }
  }
  return failures;
}

export function buildHeldIntakePreview(
  model: InteractionViewModel,
  draft: InteractionResponse,
  context: CompanionContext
): HeldIntakePreview | { locallyValid: false; failures: ReturnType<typeof validateLocalDraft> } {
  const failures = validateLocalDraft(model, draft);
  if (failures.length > 0) return { locallyValid: false, failures };

  const gates: HeldIntakePreview["gates"] = [
    {
      failure: "capability-denied",
      message: "The Intake Registry has no admitted Obsidian renderer profile; renderer_id remains unavailable."
    },
    { failure: "consent-state-unresolved", message: "No consent scope has been selected or reviewed." },
    { failure: "route-unresolved", message: "No private local response-intake route or form binding has been released." },
    { failure: "human-gate-required", message: "A separate human release is required before any save or submission effect." },
    {
      failure: "public-projection-response-prohibited",
      message: "The public-safe downstream projection cannot carry raw response content."
    }
  ];
  if (model.visibility === "private" || model.visibility === "restricted") {
    gates.push({
      failure: "privacy-boundary-unresolved",
      message: `The ${model.visibility} disclosure boundary has no released response destination.`
    });
  }
  if (context.sourceDigest === null) {
    gates.push({
      failure: "stale-source",
      message: "Source freshness cannot be established because this Phase 0 fence supplies no digest binding."
    });
  }
  if (draft.state === "deferred") {
    gates.push({
      failure: "semantic-invalid",
      message: "HCC state deferred has no lossless field-response state in Intake Response Envelope v0.2."
    });
  }

  return {
    label: "candidate preview — not saved, not submitted, not canonical",
    locallyValid: true,
    projection: {
      contract: "intake-response-envelope-v0.2-shape-preview",
      contractVersion: "0.2.0-candidate.1",
      immutable: true,
      effectRequest: "evaluate-only",
      interactionBinding: {
        interactionId: model.id,
        interactionVersion: model.version,
        interactionKind: model.kind,
        sourcePath: context.sourcePath,
        sourceDigest: context.sourceDigest
      },
      localDraft: cloneResponse(draft),
      intakeMapping: {
        rendererId: null,
        formBinding: null,
        route: null,
        consent: "unresolved",
        privacy: model.visibility === "private" || model.visibility === "restricted"
          ? "unresolved"
          : "declared-local-only"
      }
    },
    gates
  };
}
