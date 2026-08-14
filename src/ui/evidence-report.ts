import { button, node } from "./dom";

export interface EvidenceReportView {
  title: string;
  summary: string;
  content: string;
  copyText?: (value: string) => Promise<void>;
}

export function renderEvidenceReport(container: HTMLElement, report: EvidenceReportView): void {
  container.replaceChildren();
  const root = node("section", "hcc-evidence-report__surface");
  root.setAttribute("aria-label", report.title);
  const summary = node("p", "hcc-evidence-report__summary", report.summary);
  const status = node("span", "hcc-widget__copy-status");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  const copy = button("Copy report", () => {
    if (!report.copyText) return;
    copy.disabled = true;
    void report.copyText(report.content).then(
      () => { copy.textContent = "Copied"; status.textContent = "The complete report was copied to the clipboard."; },
      () => { copy.textContent = "Copy report"; status.textContent = "Copy failed; the complete selectable report remains visible."; }
    ).finally(() => { copy.disabled = false; });
  });
  copy.classList.add("hcc-evidence-report__copy");
  copy.setAttribute("aria-label", `Copy complete ${report.title.toLowerCase()}`);
  copy.title = "Copy the complete report to the clipboard";
  if (!report.copyText) {
    copy.disabled = true;
    copy.title = "Clipboard action unavailable in this rendering context";
  }
  const toolbar = node("div", "hcc-evidence-report__toolbar");
  toolbar.setAttribute("role", "toolbar");
  toolbar.setAttribute("aria-label", "Evidence report actions");
  toolbar.append(copy, status);
  const pre = node("pre", "hcc-widget__preview-json hcc-evidence-report__content");
  pre.tabIndex = 0;
  pre.append(node("code", undefined, report.content));
  root.append(summary, toolbar, pre);
  container.append(root);
}
