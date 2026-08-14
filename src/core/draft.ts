import type { InteractionResponse, ResponseState, SupportedKind } from "./types";

export function setAnsweredValue(
  draft: InteractionResponse,
  value: string | string[]
): void {
  draft.value = Array.isArray(value) ? [...value] : value;
  draft.state = value.length === 0 ? "unanswered" : "answered";
}

export function setExplicitState(
  draft: InteractionResponse,
  state: Extract<ResponseState, "deferred" | "not_applicable" | "unanswered">,
  kind: SupportedKind
): void {
  draft.state = state;
  draft.value = kind === "choose_many" ? [] : null;
}
