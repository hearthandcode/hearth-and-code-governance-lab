import { App, Modal } from "obsidian";

import { renderEvidenceReport, type EvidenceReportView } from "../ui/evidence-report";

export class EvidenceReportModal extends Modal {
  constructor(app: App, private readonly report: EvidenceReportView) { super(app); }

  override onOpen(): void {
    this.setTitle(this.report.title);
    this.contentEl.classList.add("hcc-workbook", "hcc-evidence-report");
    renderEvidenceReport(this.contentEl, this.report);
  }

  override onClose(): void {
    this.contentEl.replaceChildren();
  }
}
