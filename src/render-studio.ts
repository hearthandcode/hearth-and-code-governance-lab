import { buildStudioProjection, parseStudioContract, renderStudioDiagnostics, renderStudioProjection, type StudioRenderActions } from "./studio";

export function renderStudioFence(container: HTMLElement, source: string, actions: StudioRenderActions = {}): void {
  const result = parseStudioContract(source);
  if (!result.ok) { renderStudioDiagnostics(container, result.diagnostics, source, actions); return; }
  renderStudioProjection(container, buildStudioProjection(result.studio), actions);
}
