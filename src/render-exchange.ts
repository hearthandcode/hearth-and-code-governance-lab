import { parseExchangeContract, renderExchange, renderExchangeDiagnostics, type ExchangeRenderActions } from "./exchange";

export function renderExchangeFence(container: HTMLElement, source: string, actions: ExchangeRenderActions = {}): void {
  const result = parseExchangeContract(source);
  if (!result.ok) { renderExchangeDiagnostics(container, result.diagnostics, source); return; }
  renderExchange(container, result.exchange, actions);
}
