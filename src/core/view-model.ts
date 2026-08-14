import type { InteractionBlock, InteractionResponse, InteractionViewModel } from "./types";

export function toInteractionViewModel(block: InteractionBlock): InteractionViewModel {
  return {
    version: block.version,
    id: block.id,
    kind: block.kind,
    prompt: block.prompt,
    help: block.help ?? null,
    options: block.options?.map((option) => ({ ...option })) ?? [],
    response: cloneResponse(block.response),
    visibility: block.visibility ?? "internal",
    sourceRefs: [...(block.source_refs ?? [])],
    widgetCatalogId: widgetCatalogId(block.kind),
    phaseNotice: "Phase 0 session draft only. This widget never writes to the vault."
  };
}

export function cloneResponse(response: InteractionResponse): InteractionResponse {
  return {
    ...response,
    value: Array.isArray(response.value) ? [...response.value] : response.value
  };
}

function widgetCatalogId(kind: InteractionBlock["kind"]): string {
  if (kind === "choose_one") return "exo.hcc_interaction_renderers.choose-one-renderer";
  if (kind === "choose_many") return "exo.hcc_interaction_renderers.choose-many-renderer";
  return "exo.text_numeric_capture.textarea";
}
