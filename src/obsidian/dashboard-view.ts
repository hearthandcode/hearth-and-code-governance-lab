import { ItemView, TFile, type WorkspaceLeaf } from "obsidian";
import { dump } from "js-yaml";

import {
  buildDashboardProjection,
  DASHBOARD_MODE_LABELS,
  DASHBOARD_MODES,
  renderDashboardProjection,
  type DashboardContext,
  type DashboardMode
} from "../dashboard";
import { buildGovernanceProposal, type AuthorityNode, type GovernanceContext } from "../governance";
import { loadDashboardContext } from "./dashboard-source";
import { assertCapabilityEffect } from "../plugin-layer";

export const HCC_DASHBOARD_VIEW_TYPE = "hcc-governance-dashboard";

export class HccGovernanceDashboardView extends ItemView {
  private sourceFile: TFile | null = null;
  private mode: DashboardMode = "program_status";
  private context: DashboardContext | null = null;
  private trackedPaths = new Set<string>();
  private request = 0;
  private output: HTMLElement | null = null;
  private status: HTMLElement | null = null;
  private releasePresentation: (() => void) | null = null;

  constructor(leaf: WorkspaceLeaf, private readonly retainPresentationDocument: (doc: Document) => () => void) { super(leaf); }

  getViewType(): string { return HCC_DASHBOARD_VIEW_TYPE; }
  getDisplayText(): string { return "HCC governance dashboard"; }
  getIcon(): string { return "layout-dashboard"; }

  override async onOpen(): Promise<void> {
    this.releasePresentation?.();
    this.releasePresentation = this.retainPresentationDocument(this.contentEl.ownerDocument);
    const doc = this.contentEl.ownerDocument;
    this.contentEl.replaceChildren();
    this.contentEl.classList.add("hcc-workbook", "hcc-dashboard");
    const title = doc.createElement("h2"); title.textContent = "Governance dashboard";
    const orientation = doc.createElement("p");
    orientation.textContent = "Seven read-only selectors over the chosen note and its explicit one-hop relationships.";
    const toolbar = doc.createElement("div");
    toolbar.className = "hcc-dashboard__toolbar";
    toolbar.setAttribute("role", "toolbar");
    toolbar.setAttribute("aria-label", "Dashboard projection controls");
    const label = doc.createElement("label");
    const labelText = doc.createElement("span"); labelText.textContent = "Projection";
    const select = doc.createElement("select");
    select.setAttribute("aria-label", "Dashboard projection");
    for (const mode of DASHBOARD_MODES) {
      const option = doc.createElement("option"); option.value = mode; option.textContent = DASHBOARD_MODE_LABELS[mode]; select.append(option);
    }
    select.value = this.mode;
    select.addEventListener("change", () => {
      if (DASHBOARD_MODES.includes(select.value as DashboardMode)) this.mode = select.value as DashboardMode;
      this.renderProjection();
    });
    label.append(labelText, select);
    const useActive = doc.createElement("button"); useActive.type = "button"; useActive.textContent = "Use active Markdown note";
    useActive.addEventListener("click", () => {
      const active = this.app.workspace.getActiveFile();
      if (active) void this.setSourceFile(active);
      else this.setStatus("Open a Markdown note before selecting a dashboard source.");
    });
    const refresh = doc.createElement("button"); refresh.type = "button"; refresh.textContent = "Refresh exact sources";
    refresh.addEventListener("click", () => { void this.refresh(); });
    toolbar.append(label, useActive, refresh);
    this.status = doc.createElement("p"); this.status.className = "hcc-dashboard__status"; this.status.setAttribute("aria-live", "polite");
    this.output = doc.createElement("div");
    this.contentEl.append(title, orientation, toolbar, this.status, this.output);
    this.registerEvent(this.app.metadataCache.on("changed", (file) => {
      if (this.trackedPaths.has(file.path)) void this.refresh();
    }));
    if (this.sourceFile) await this.refresh();
    else this.setStatus("No source selected. Run the dashboard command from a Markdown note or choose Use active Markdown note.");
  }

  override async onClose(): Promise<void> {
    this.releasePresentation?.();
    this.releasePresentation = null;
    this.output = null;
    this.status = null;
  }

  async setSourceFile(file: TFile): Promise<void> {
    this.sourceFile = file;
    await this.refresh();
  }

  private async refresh(): Promise<void> {
    const source = this.sourceFile;
    const request = ++this.request;
    if (!source) {
      this.context = null; this.trackedPaths.clear(); this.output?.replaceChildren();
      this.setStatus("No dashboard source is selected.");
      return;
    }
    this.setStatus(`Reading ${source.path} and its explicit one-hop metadata…`);
    try {
      const context = await loadDashboardContext(this.app, source);
      if (request !== this.request) return;
      this.context = context;
      this.trackedPaths = new Set(context.records.map((record) => record.path));
      this.setStatus(`Source bound to ${context.sourcePath}; ${context.records.length} bounded record${context.records.length === 1 ? "" : "s"}.`);
      this.renderProjection();
    } catch {
      if (request !== this.request) return;
      this.context = null; this.trackedPaths.clear(); this.output?.replaceChildren();
      this.setStatus("The bounded dashboard context could not be prepared. No file was changed.");
    }
  }

  private renderProjection(): void {
    if (!this.output || !this.context) return;
    const projection = buildDashboardProjection(this.mode, this.context, new Date().toISOString());
    const governanceContext = this.buildGovernanceContext(projection.sources.map((source) => source.path));
    renderDashboardProjection(this.output, projection, {
      copyText: (value) => {
        assertCapabilityEffect("hcc.dashboard.native", "copy-to-clipboard");
        return navigator.clipboard.writeText(value);
      },
      openSource: (path) => {
        assertCapabilityEffect("hcc.dashboard.native", "read-explicit-authority");
        void this.app.workspace.openLinkText(path, projection.source.path, true);
      },
      ...(governanceContext ? {
        prepareGovernanceProposal: (operation: "prepare_review" | "prepare_verification") => dump(
          buildGovernanceProposal(operation, governanceContext, new Date().toISOString()),
          { lineWidth: -1, noRefs: true }
        )
      } : {})
    });
  }

  private buildGovernanceContext(admittedPaths: string[]): GovernanceContext | null {
    if (!this.context || !admittedPaths.includes(this.context.sourcePath)) return null;
    const source = this.context.records.find((record) => record.path === this.context?.sourcePath);
    if (!source) return null;
    const admitted = new Set(admittedPaths);
    const authorityChain: AuthorityNode[] = this.context.records
      .filter((record) => record.path !== source.path && admitted.has(record.path))
      .map((record) => ({
        relationship: record.relationship,
        reference: record.path,
        resolved_path: record.path,
        authority: firstString(record.frontmatter, ["authority_role", "class", "type"]),
        review_status: firstString(record.frontmatter, ["review_status", "status"]),
        verified: typeof record.frontmatter.verified === "boolean" ? record.frontmatter.verified : null
      }));
    return { source_path: source.path, source_digest: this.context.sourceDigest, frontmatter: source.frontmatter, authority_chain: authorityChain };
  }

  private setStatus(message: string): void {
    if (this.status) this.status.textContent = message;
  }
}

function firstString(record: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim() !== "") return value;
  }
  return null;
}
