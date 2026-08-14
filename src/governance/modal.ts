import { dump } from "js-yaml";
import { App, Modal, TFile } from "obsidian";

import { linkPathFromRelationship } from "../core/relations";
import { sha256Digest } from "../obsidian/view-source";
import { buildGovernanceProposal, collectAuthorityReferences } from "./model";
import type { AuthorityNode, GovernanceContext, GovernanceOperation } from "./types";

const OPERATION_LABELS: ReadonlyArray<readonly [GovernanceOperation, string]> = [
  ["prepare_review", "Prepare reviewed patch"],
  ["prepare_verification", "Prepare verification attestation"],
  ["prepare_review_ready", "Prepare review-ready lifecycle patch"],
  ["confirm_sensitivity", "Prepare sensitivity confirmation"],
  ["inspect_source_authority", "Inspect source authority"],
  ["inspect_supersession", "Inspect supersession"],
  ["build_authority_packet", "Build authority packet"],
  ["build_knowledge_system_packet", "Build knowledge-system projection packet"]
];

export class GovernanceWorkbenchModal extends Modal {
  private active = false;

  constructor(app: App, private readonly file: TFile) { super(app); }

  override onOpen(): void {
    this.active = true;
    this.setTitle("HCC governance workbench");
    this.contentEl.classList.add("hcc-workbook", "hcc-governance");
    this.contentEl.replaceChildren();
    const loading = this.contentEl.createEl("p", { text: "Reading the active document and its explicit authority references…" });
    void this.loadContext().then((context) => {
      if (!this.active) return;
      loading.remove();
      this.renderContext(context);
    }, () => {
      if (!this.active) return;
      loading.textContent = "The governance context could not be prepared. No file was changed.";
    });
  }

  override onClose(): void {
    this.active = false;
    this.contentEl.replaceChildren();
  }

  private async loadContext(): Promise<GovernanceContext> {
    const content = await this.app.vault.cachedRead(this.file);
    const digest = await sha256Digest(content);
    const frontmatter = asRecord(this.app.metadataCache.getFileCache(this.file)?.frontmatter) ?? {};
    const authorityChain: AuthorityNode[] = collectAuthorityReferences(frontmatter).map(({ relationship, reference }) => {
      const linkPath = linkPathFromRelationship(reference);
      const target = linkPath === "" ? null : this.app.metadataCache.getFirstLinkpathDest(linkPath, this.file.path);
      const metadata = target ? asRecord(this.app.metadataCache.getFileCache(target)?.frontmatter) : null;
      return {
        relationship,
        reference,
        resolved_path: target?.path ?? null,
        authority: firstString(metadata, ["authority_role", "class", "type"]),
        review_status: firstString(metadata, ["review_status", "status"]),
        verified: typeof metadata?.verified === "boolean" ? metadata.verified : null
      };
    });
    return { source_path: this.file.path, source_digest: digest, frontmatter, authority_chain: authorityChain };
  }

  private renderContext(context: GovernanceContext): void {
    const warning = this.contentEl.createEl("p", { cls: "hcc-widget__phase-notice", text: "Proposal-only workbench: step 8 is held, so no frontmatter or external source will be changed." });
    warning.setAttribute("role", "note");
    const summary = this.contentEl.createEl("dl", { cls: "hcc-widget__description-list" });
    appendDescription(summary, "Source", context.source_path);
    appendDescription(summary, "Digest", context.source_digest);
    appendDescription(summary, "Review", display(context.frontmatter.review_status));
    appendDescription(summary, "Verified", display(context.frontmatter.verified));
    appendDescription(summary, "Authority links", String(context.authority_chain.length));

    const toolbar = this.contentEl.createDiv({ cls: "hcc-governance__toolbar" });
    toolbar.setAttribute("role", "toolbar");
    toolbar.setAttribute("aria-label", "Governance proposal actions");
    const output = this.contentEl.createDiv({ cls: "hcc-governance__output" });
    OPERATION_LABELS.forEach(([operation, label]) => {
      const control = toolbar.createEl("button", { text: label });
      control.type = "button";
      control.addEventListener("click", () => {
        const proposal = buildGovernanceProposal(operation, context, new Date().toISOString());
        const source = dump(proposal, { lineWidth: -1, noRefs: true });
        output.replaceChildren();
        output.createEl("h3", { text: label });
        const pre = output.createEl("pre", { cls: "hcc-widget__preview-json" });
        pre.createEl("code", { text: source });
        const copy = output.createEl("button", { text: "Copy proposal YAML" });
        copy.type = "button";
        copy.addEventListener("click", () => { void navigator.clipboard.writeText(source); });
      });
    });
  }
}

function appendDescription(list: HTMLDListElement, term: string, value: string): void {
  list.createEl("dt", { text: term });
  list.createEl("dd", { text: value });
}

function display(value: unknown): string {
  if (value === undefined || value === null) return "not declared";
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value) : "declared complex value";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function firstString(record: Record<string, unknown> | null, keys: readonly string[]): string | null {
  if (!record) return null;
  for (const key of keys) if (typeof record[key] === "string" && (record[key] as string).trim() !== "") return record[key] as string;
  return null;
}
