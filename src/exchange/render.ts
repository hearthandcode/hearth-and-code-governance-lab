import { buildStudioProjection, renderStudioDiagnostics, renderStudioProjection } from "../studio";
import { buildProviderNeutralPromptPacket, validateExchangeImport } from "./model";
import type { DigestText, ExchangeContract, ExchangeDiagnostic } from "./types";

export interface ExchangeRenderActions {
  copyText?: (value: string) => Promise<void>;
  digestText?: DigestText;
}

export function renderExchange(container: HTMLElement, exchange: ExchangeContract, actions: ExchangeRenderActions = {}): void {
  const doc = container.ownerDocument; container.replaceChildren();
  const root = element(doc, "article", "hcc-exchange hcc-workbook"); root.dataset.exchangeId = exchange.id;
  root.append(element(doc, "p", "hcc-widget__identity", "HCC provider-neutral exchange candidate"), element(doc, "h3", "hcc-workbook__title", exchange.title), element(doc, "p", "hcc-workbook__purpose", exchange.purpose));
  const warning = element(doc, "p", "hcc-widget__phase-notice", "Manual disclosure boundary: copying the prompt does not call a provider. You choose the destination; its retention remains unknown. Imported output is untrusted proposal data."); warning.setAttribute("role", "note"); root.append(warning);
  root.append(descriptionList(doc, [["Exchange ID", exchange.id], ["Sources", String(exchange.context.sources.length)], ["Output", `${exchange.output.kind}@${exchange.output.version}`], ["Provider", exchange.handling.provider], ["Network", exchange.governance.network], ["Persistence", exchange.governance.persistence]]));
  root.append(table(doc, "Digest-bound source data", ["ID", "Path", "Digest", "Authority", "Sensitivity", "Disclosure"], exchange.context.sources.map((source) => [source.id, source.path, source.digest, source.authority, source.sensitivity, source.disclosure])));

  const exportSection = section(doc, "1 · Export a fixed prompt packet");
  const exportButton = button(doc, "Build and copy prompt packet"); exportButton.disabled = !actions.copyText || !actions.digestText;
  const exportStatus = status(doc); const exportDiagnostics = element(doc, "ul", "hcc-exchange__diagnostics");
  exportButton.addEventListener("click", () => {
    if (!actions.copyText || !actions.digestText) return;
    exportButton.disabled = true; exportStatus.textContent = "Verifying source digests…"; exportDiagnostics.replaceChildren();
    void buildProviderNeutralPromptPacket(exchange, actions.digestText).then(async (result) => {
      if (!result.ok) { showDiagnostics(doc, exportDiagnostics, result.diagnostics); exportStatus.textContent = "Prompt held: one or more source digests are stale. Nothing was copied."; return; }
      await actions.copyText!(result.source); exportStatus.textContent = "Exact provider-neutral prompt packet copied. No provider was called and no file changed.";
    }).catch(() => { exportStatus.textContent = "Prompt copy failed. No provider was called and no file changed."; }).finally(() => { exportButton.disabled = false; });
  });
  exportSection.append(exportButton, exportStatus, exportDiagnostics); root.append(exportSection);

  const importSection = section(doc, "2 · Paste and validate returned candidate YAML");
  const label = element(doc, "label", "hcc-exchange__import-label", "Returned hcc-studio YAML");
  const textarea = doc.createElement("textarea"); textarea.className = "hcc-exchange__import"; textarea.rows = 14; textarea.spellcheck = false; textarea.placeholder = "Paste raw hcc-studio YAML here. Markdown fences are rejected."; label.append(textarea);
  const validate = button(doc, "Validate imported candidate"); const clear = button(doc, "Clear imported candidate");
  const importStatus = status(doc); const output = element(doc, "div", "hcc-exchange__import-output");
  validate.addEventListener("click", () => {
    const result = validateExchangeImport(textarea.value); output.replaceChildren();
    if (result.ok) { renderStudioProjection(output, buildStudioProjection(result.studio), { copyText: actions.copyText }); importStatus.textContent = "Candidate parsed and rendered for human review. It remains unadmitted and was not persisted."; }
    else {
      const exchangeDiagnostics = result.diagnostics.filter((item): item is ExchangeDiagnostic => item.code.startsWith("HCC-EXCHANGE"));
      if (exchangeDiagnostics.length === result.diagnostics.length) renderExchangeDiagnostics(output, exchangeDiagnostics, textarea.value);
      else renderStudioDiagnostics(output, result.diagnostics.filter((item) => !item.code.startsWith("HCC-EXCHANGE")) as never, textarea.value, { copyText: actions.copyText });
      importStatus.textContent = "Candidate rejected with field-addressed diagnostics. Nothing was persisted.";
    }
  });
  clear.addEventListener("click", () => { textarea.value = ""; output.replaceChildren(); importStatus.textContent = "Imported candidate cleared from memory."; textarea.focus(); });
  const controls = element(doc, "div", "hcc-exchange__controls"); controls.append(validate, clear, importStatus);
  importSection.append(label, controls, output); root.append(importSection); container.append(root);
}

export function renderExchangeDiagnostics(container: HTMLElement, diagnostics: readonly ExchangeDiagnostic[], source: string): void {
  const doc = container.ownerDocument; container.replaceChildren(); const root = element(doc, "article", "hcc-exchange hcc-workbook hcc-widget--error"); root.setAttribute("role", "alert");
  root.append(element(doc, "h3", undefined, "HCC provider-neutral exchange could not be rendered")); const list = element(doc, "ul"); showDiagnostics(doc, list, diagnostics);
  const pre = element(doc, "pre", "hcc-widget__preview-json hcc-exchange__diagnostic-source"); pre.tabIndex = 0; pre.append(element(doc, "code", undefined, source)); root.append(list, pre); container.append(root);
}

function showDiagnostics(doc: Document, list: HTMLElement, diagnostics: readonly ExchangeDiagnostic[]): void { for (const item of diagnostics) list.append(element(doc, "li", undefined, `${item.code} at ${item.path}: ${item.message}`)); }
function section(doc: Document, title: string): HTMLElement { const value = element(doc, "section", "hcc-exchange__section"); value.append(element(doc, "h4", undefined, title)); return value; }
function table(doc: Document, captionText: string, headers: readonly string[], rows: readonly (readonly string[])[]): HTMLElement { const wrap = element(doc, "div", "hcc-studio__table-wrap"); const table = element(doc, "table", "hcc-studio__table"); const caption = element(doc, "caption", undefined, captionText); const head = element(doc, "thead"); const tr = element(doc, "tr"); for (const label of headers) { const th = element(doc, "th", undefined, label); th.scope = "col"; tr.append(th); } head.append(tr); const body = element(doc, "tbody"); for (const row of rows) { const item = element(doc, "tr"); for (const value of row) item.append(element(doc, "td", undefined, value)); body.append(item); } table.append(caption, head, body); wrap.append(table); return wrap; }
function descriptionList(doc: Document, entries: readonly (readonly [string, string])[]): HTMLDListElement { const list = element(doc, "dl", "hcc-widget__description-list"); for (const [term, value] of entries) list.append(element(doc, "dt", undefined, term), element(doc, "dd", undefined, value)); return list; }
function button(doc: Document, text: string): HTMLButtonElement { const value = element(doc, "button", undefined, text); value.type = "button"; return value; }
function status(doc: Document): HTMLSpanElement { const value = element(doc, "span", "hcc-studio__status"); value.setAttribute("role", "status"); value.setAttribute("aria-live", "polite"); return value; }
function element<K extends keyof HTMLElementTagNameMap>(doc: Document, tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] { const item = doc.createElement(tag); if (className) item.className = className; if (text !== undefined) item.textContent = text; return item; }
