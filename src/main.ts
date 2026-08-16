import { apiVersion, MarkdownRenderChild, type MarkdownPostProcessorContext, Notice, Platform, Plugin, requireApiVersion, TFile } from "obsidian";

import { HCC_AUTHORING_API, type HccAuthoringApi } from "./api";
import { buildCompatibilityMatrix, type CompatibilityPlatform } from "./compatibility";
import { routeInteractionSource } from "./core/interaction-route";
import { toInteractionViewModel } from "./core/view-model";
import { createHccEditorController } from "./editor";
import { renderComputedFieldFence, renderRadarViewFence } from "./extensions";
import { renderExchangeFence } from "./render-exchange";
import { GovernanceWorkbenchModal } from "./governance";
import { buildCompanionContext, buildEditorCompanionContext } from "./obsidian/adjacent";
import { HccGovernanceDashboardView, HCC_DASHBOARD_VIEW_TYPE } from "./obsidian/dashboard-view";
import { EvidenceReportModal } from "./obsidian/evidence-report-modal";
import { buildHostAssurancePacket } from "./obsidian/host-assurance";
import { ResponsePacketController } from "./obsidian/response-packet-controller";
import { createResponsePacketAdapter, responsePacketHostProfile } from "./obsidian/response-packets";
import { buildRuntimeReadinessReport, type RuntimeReadinessInput } from "./obsidian/runtime-readiness";
import { HccPluginSettingTab, type HccSettingsHost } from "./obsidian/settings-tab";
import { resolveExplicitViewSource, sha256Digest } from "./obsidian/view-source";
import { assertCapabilityCatalog, assertCapabilityEffect, PLUGIN_CAPABILITY_CATALOG } from "./plugin-layer";
import { appendPerformanceObservation, renderDiagnostics, renderInteraction } from "./render";
import { renderCandidateDiagnostics, renderCandidateInteraction } from "./render-candidate";
import { renderStudioFence } from "./render-studio";
import { renderHccViewFence } from "./render-view";
import type { CompanionContext } from "./core/types";
import {
  EphemeralWorkbookSessions,
  parseWorkbook,
  parseWorksheet,
  renderWorkbook,
  renderWorkbookDiagnostics,
  renderWorksheet
} from "./workbook";
import { applyWorksheetPresentation } from "./workbook/render";
import type { WorksheetContract, WorksheetPacketReference, WorksheetPacketWriteResult } from "./workbook";
import { DEFAULT_HCC_SETTINGS, mergeHccPluginSettings, parseHccPluginSettings, type HccPluginSettings } from "./settings";

export default class HearthCodeGovernedWidgetsPlugin extends Plugin implements HccSettingsHost {
  public readonly authoringApi: HccAuthoringApi = HCC_AUTHORING_API;
  private pluginLoadObservationMs = 0;
  private readonly sessions = new EphemeralWorkbookSessions();
  private readonly interactionRefreshers = new Map<string, Set<() => void>>();
  private readonly presentationDocuments = new Map<Document, number>();
  private readonly presentationContainers = new Set<HTMLElement>();
  private settings: HccPluginSettings = { ...DEFAULT_HCC_SETTINGS };
  private readonly responsePackets = new ResponsePacketController({
    sessions: this.sessions,
    adapter: () => createResponsePacketAdapter(this.manifest.id, this.app.vault),
    readWorksheetSource: async (sourcePath) => {
      const file = this.app.vault.getAbstractFileByPath(sourcePath);
      if (!(file instanceof TFile)) throw new Error(`HCC-VAULT-SOURCE: worksheet source is unavailable at ${sourcePath}.`);
      return this.app.vault.cachedRead(file);
    },
    refreshInteractions: (sourcePath) => this.interactionRefreshers.get(sourcePath)?.forEach((refresh) => refresh())
  });
  private emberCircuitSessionEnabled = true;

  override async onload(): Promise<void> {
    const loadStartedAt = performance.now();
    assertCapabilityCatalog();
    assertCapabilityEffect("hcc.presentation.ember-circuit", "render");
    assertCapabilityEffect("hcc.settings.preferences", "render");
    await this.loadSettings();
    this.emberCircuitSessionEnabled = this.settings.presentationTheme === "ember-circuit";
    this.retainPresentationDocument(this.app.workspace.containerEl.ownerDocument);
    this.addSettingTab(new HccPluginSettingTab(this.app, this));
    this.registerMarkdownCodeBlockProcessor("hcc-interaction", (source, el, context) => {
      const renderStartedAt = performance.now();
      const dispose = this.renderInteractionSource(
        source,
        el,
        context.sourcePath,
        (sourceRefs) => buildCompanionContext(this.app, context, sourceRefs)
      );
      this.addRenderChild(context, el, dispose);
      appendPerformanceObservation(el, this.pluginLoadObservationMs, performance.now() - renderStartedAt);
    });
    this.registerMarkdownCodeBlockProcessor("hcc-view", (source, el, context) => {
      assertCapabilityEffect("hcc.view.candidate", "render");
      const dispose = renderHccViewFence(el, source, (binding) => {
        assertCapabilityEffect("hcc.view.candidate", "read-explicit-source");
        return resolveExplicitViewSource(this.app, binding);
      });
      this.addRenderChild(context, el, dispose);
    });
    this.registerMarkdownCodeBlockProcessor("hcc-form", (source, el, context) => {
      assertCapabilityEffect("hcc.form.candidate", "render");
      const dispose = this.renderWorksheetSource(source, el, context.sourcePath);
      this.addRenderChild(context, el, dispose);
    });
    this.registerMarkdownCodeBlockProcessor("hcc-workbook", (source, el, context) => {
      assertCapabilityEffect("hcc.workbook.candidate", "render");
      const dispose = this.renderWorkbookSource(source, el, context.sourcePath);
      this.addRenderChild(context, el, dispose);
    });
    this.registerMarkdownCodeBlockProcessor("hcc-computed-field", (source, el, context) => {
      assertCapabilityEffect("hcc.extension.computed-field", "render");
      renderComputedFieldFence(el, source);
      this.addRenderChild(context, el);
    });
    this.registerMarkdownCodeBlockProcessor("hcc-radar-view", (source, el, context) => {
      assertCapabilityEffect("hcc.extension.radar", "render");
      renderRadarViewFence(el, source);
      this.addRenderChild(context, el);
    });
    this.registerMarkdownCodeBlockProcessor("hcc-studio", (source, el, context) => {
      assertCapabilityEffect("hcc.studio.candidate", "render");
      renderStudioFence(el, source, { copyText: (value) => this.copyStudioText(value) });
      this.addRenderChild(context, el);
    });
    this.registerMarkdownCodeBlockProcessor("hcc-exchange", (source, el, context) => {
      assertCapabilityEffect("hcc.exchange.provider-neutral", "render");
      renderExchangeFence(el, source, {
        copyText: (value) => this.copyExchangeText(value),
        digestText: (value) => sha256Digest(value)
      });
      this.addRenderChild(context, el);
    });

    const editorController = createHccEditorController((source, el, context) => {
      const releasePresentation = this.retainPresentationDocument(el.ownerDocument);
      let dispose: (() => void) | undefined;
      if (context.language === "hcc-view") {
        assertCapabilityEffect("hcc.view.candidate", "render");
        dispose = renderHccViewFence(el, source, (binding) => {
          assertCapabilityEffect("hcc.view.candidate", "read-explicit-source");
          return resolveExplicitViewSource(this.app, binding);
        });
      } else if (context.language === "hcc-form") { assertCapabilityEffect("hcc.form.candidate", "render"); dispose = this.renderWorksheetSource(source, el, context.sourcePath); }
      else if (context.language === "hcc-workbook") {
        assertCapabilityEffect("hcc.workbook.candidate", "render");
        dispose = this.renderWorkbookSource(source, el, context.sourcePath);
      } else if (context.language === "hcc-computed-field") { assertCapabilityEffect("hcc.extension.computed-field", "render"); renderComputedFieldFence(el, source); }
      else if (context.language === "hcc-radar-view") { assertCapabilityEffect("hcc.extension.radar", "render"); renderRadarViewFence(el, source); }
      else if (context.language === "hcc-studio") { assertCapabilityEffect("hcc.studio.candidate", "render"); renderStudioFence(el, source, { copyText: (value) => this.copyStudioText(value) }); }
      else if (context.language === "hcc-exchange") {
        assertCapabilityEffect("hcc.exchange.provider-neutral", "render");
        renderExchangeFence(el, source, { copyText: (value) => this.copyExchangeText(value), digestText: (value) => sha256Digest(value) });
      }
      else dispose = this.renderInteractionSource(
          source,
          el,
          context.sourcePath,
          (sourceRefs) => buildEditorCompanionContext(this.app, context.sourcePath, sourceRefs)
        );
      const releaseContainer = this.retainPresentationContainer(el);
      return () => { dispose?.(); releaseContainer(); releasePresentation(); };
    });
    this.registerEditorExtension(editorController.extension);
    this.registerView(HCC_DASHBOARD_VIEW_TYPE, (leaf) => new HccGovernanceDashboardView(leaf, (doc) => this.retainPresentationDocument(doc)));
    this.addCommand({ id: "focus-next-widget", name: "Focus next governed widget", callback: editorController.focusNext });
    this.addCommand({ id: "focus-previous-widget", name: "Focus previous governed widget", callback: editorController.focusPrevious });
    this.addCommand({ id: "return-to-widget-source", name: "Return from governed widget to source", callback: editorController.returnToEditor });
    this.addRibbonIcon("shield-check", "Open HCC governance workbench", () => this.openGovernanceWorkbench());
    this.addCommand({ id: "open-governance-workbench", name: "Open governance workbench", callback: () => this.openGovernanceWorkbench() });
    this.addCommand({ id: "open-governance-dashboard", name: "Open governance dashboard for active note", callback: () => { void this.openGovernanceDashboard(); } });
    this.addCommand({ id: "copy-worksheet-template", name: "Copy worksheet contract template", callback: () => this.copyTemplate(WORKSHEET_TEMPLATE, "Worksheet template copied.") });
    this.addCommand({ id: "copy-workbook-template", name: "Copy workbook manifest template", callback: () => this.copyTemplate(WORKBOOK_TEMPLATE, "Workbook template copied.") });
    this.addCommand({ id: "run-authoring-api-self-test", name: "Run and copy authoring API self-test report", callback: () => this.runAuthoringApiSelfTest() });
    this.addCommand({ id: "run-runtime-readiness-diagnostic", name: "Run and copy runtime readiness report", callback: () => this.runRuntimeReadinessDiagnostic() });
    this.addCommand({ id: "run-compatibility-matrix", name: "Run and copy compatibility matrix", callback: () => this.runCompatibilityMatrixDiagnostic() });
    this.addCommand({ id: "run-host-assurance-packet", name: "Run and copy combined host assurance packet", callback: () => this.runHostAssuranceDiagnostic() });
    this.addCommand({ id: "validate-active-worksheet", name: "Validate active worksheet contract", callback: () => { void this.validateActiveWorksheet(); } });
    this.addCommand({ id: "toggle-ember-circuit-presentation", name: "Toggle Ember Circuit / Obsidian-native presentation for this session", callback: () => this.toggleEmberCircuitPresentation() });
    this.pluginLoadObservationMs = performance.now() - loadStartedAt;
  }

  override onunload(): void {
    this.responsePackets.clearPending();
    this.interactionRefreshers.clear();
    this.presentationContainers.clear();
    for (const doc of this.presentationDocuments.keys()) {
      doc.body.classList.remove("hcc-plugin-ember-circuit-session");
      doc.body.classList.remove("hcc-plugin-density-compact", "hcc-plugin-detail-explanatory");
    }
    this.presentationDocuments.clear();
    this.emberCircuitSessionEnabled = false;
  }

  private toggleEmberCircuitPresentation(): void {
    assertCapabilityEffect("hcc.presentation.ember-circuit", "render");
    this.emberCircuitSessionEnabled = !this.emberCircuitSessionEnabled;
    for (const doc of this.presentationDocuments.keys()) this.applyDocumentPreferences(doc);
    this.notify(`Ember Circuit presentation ${this.emberCircuitSessionEnabled ? "enabled" : "disabled"} for this plugin session.`, "success");
  }

  private addRenderChild(context: MarkdownPostProcessorContext, el: HTMLElement, dispose: () => void = () => undefined): void {
    const releasePresentation = this.retainPresentationDocument(el.ownerDocument);
    const releaseContainer = this.retainPresentationContainer(el);
    context.addChild(new HccViewRenderChild(el, () => { dispose(); releaseContainer(); releasePresentation(); }));
  }

  private retainPresentationContainer(container: HTMLElement): () => void {
    this.presentationContainers.add(container);
    this.applyRenderPreferences(container);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.presentationContainers.delete(container);
    };
  }

  private retainPresentationDocument(doc: Document): () => void {
    const count = this.presentationDocuments.get(doc) ?? 0;
    this.presentationDocuments.set(doc, count + 1);
    this.applyDocumentPreferences(doc);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const next = (this.presentationDocuments.get(doc) ?? 1) - 1;
      if (next > 0) this.presentationDocuments.set(doc, next);
      else {
        this.presentationDocuments.delete(doc);
        doc.body.classList.remove("hcc-plugin-ember-circuit-session");
        doc.body.classList.remove("hcc-plugin-density-compact", "hcc-plugin-detail-explanatory");
      }
    };
  }

  settingsSnapshot(): HccPluginSettings {
    const snapshot = { ...this.settings };
    // Keep the 0.0.30 smoke-host probe readable during the version-1 migration.
    // The alias is not enumerable and is never part of a version-2 settings record.
    Object.defineProperty(snapshot, "presentationMode", { value: snapshot.presentationTheme, enumerable: false });
    return snapshot;
  }

  async updateSettings(patch: Partial<Omit<HccPluginSettings, "version">>): Promise<void> {
    const previous = this.settings;
    const legacyPresentation = (patch as typeof patch & { presentationMode?: HccPluginSettings["presentationTheme"] }).presentationMode;
    const normalizedPatch = { ...patch } as typeof patch & { presentationMode?: HccPluginSettings["presentationTheme"] };
    delete normalizedPatch.presentationMode;
    if (legacyPresentation !== undefined) normalizedPatch.presentationTheme = legacyPresentation;
    const next = mergeHccPluginSettings(previous, normalizedPatch);
    this.settings = next;
    if (normalizedPatch.presentationTheme !== undefined || normalizedPatch.profile !== undefined) this.emberCircuitSessionEnabled = next.presentationTheme === "ember-circuit";
    this.applyAllPreferences();
    try {
      assertCapabilityEffect("hcc.settings.preferences", "persist-settings");
      await this.saveData(legacyPresentation === undefined ? next : {
        version: 1,
        presentationMode: next.presentationTheme,
        detailLevel: next.detailLevel,
        interactionDensity: next.interactionDensity,
        noticeLevel: next.noticeLevel
      });
      this.notify("Governance Lab preferences saved for this vault.", "success");
    } catch {
      this.settings = previous;
      this.emberCircuitSessionEnabled = previous.presentationTheme === "ember-circuit";
      this.applyAllPreferences();
      this.notify("Governance Lab preferences could not be saved; the previous settings remain active.", "failure");
    }
  }

  governanceSettingsStatus(): ReturnType<HccSettingsHost["governanceSettingsStatus"]> {
    let hostProfile = "blocked by current host policy";
    try { hostProfile = responsePacketHostProfile(this.manifest.id, this.app.vault.getName()); } catch { /* read-only fail-closed status */ }
    return {
      hostProfile,
      responsePolicy: "configured response-packet folder · one explicit digest-verified read · create-only immutable YAML · no overwrite, rename, append, or delete",
      contractStatus: `${this.authoringApi.apiVersion} · ${Object.keys(PLUGIN_CAPABILITY_CATALOG).length} governed capabilities`,
      runtimeStatus: `Obsidian API ${apiVersion} · minimum ${this.manifest.minAppVersion} · ${Platform.isDesktop ? "desktop" : "unsupported non-desktop"}`
    };
  }

  override async onExternalSettingsChange(): Promise<void> {
    await this.loadSettings();
    this.emberCircuitSessionEnabled = this.settings.presentationTheme === "ember-circuit";
    this.applyAllPreferences();
  }

  private async loadSettings(): Promise<void> {
    try {
      assertCapabilityEffect("hcc.settings.preferences", "read-plugin-settings");
      const parsed = parseHccPluginSettings(await this.loadData());
      this.settings = parsed.settings;
      if (parsed.diagnostics.length > 0) this.notify("Some stored Governance Lab preferences were invalid and safe defaults were applied.", "failure");
    } catch {
      this.settings = { ...DEFAULT_HCC_SETTINGS };
      this.notify("Governance Lab preferences could not be read; safe defaults are active.", "failure");
    }
  }

  private applyAllPreferences(): void {
    for (const doc of this.presentationDocuments.keys()) this.applyDocumentPreferences(doc);
    for (const container of this.presentationContainers) this.applyRenderPreferences(container);
  }

  private applyDocumentPreferences(doc: Document): void {
    doc.body.classList.toggle("hcc-plugin-ember-circuit-session", this.emberCircuitSessionEnabled);
    doc.body.classList.toggle("hcc-plugin-density-compact", this.settings.interactionDensity === "compact");
    doc.body.classList.toggle("hcc-plugin-detail-explanatory", this.settings.detailLevel === "explanatory");
  }

  private applyRenderPreferences(container: HTMLElement): void {
    const explanatory = this.settings.detailLevel === "explanatory";
    container.querySelectorAll<HTMLDetailsElement>("details.hcc-widget__companion-details, details.hcc-workbook__contract").forEach((details) => { details.open = explanatory; });
    applyWorksheetPresentation(container, this.settings);
  }

  private notify(message: string, kind: "success" | "failure"): void {
    if (kind === "failure" || this.settings.noticeLevel === "standard") new Notice(message);
  }

  private renderInteractionSource(
    source: string,
    el: HTMLElement,
    sourcePath: string,
    contextFor: (sourceRefs: readonly string[]) => CompanionContext
  ): () => void {
    const refresh = (): void => {
      const routed = routeInteractionSource(source);
      if (routed.grammar === "released") {
        assertCapabilityEffect("hcc.interaction.released", "render");
        const model = toInteractionViewModel(routed.result.block);
        renderInteraction(el, model, source, contextFor(model.sourceRefs), this.sessions.binding(sourcePath, model.id));
        return;
      }
      if (routed.grammar === "candidate") {
        assertCapabilityEffect("hcc.interaction.candidate", "render");
        renderCandidateInteraction(el, routed.result.block, source, this.sessions.binding(sourcePath, routed.result.block.id));
        return;
      }
      if (routed.grammar === "candidate-invalid") {
        renderCandidateDiagnostics(el, routed.result.diagnostics, source);
        return;
      }
      renderDiagnostics(el, routed.result.diagnostics, source, sourcePath);
    };
    refresh();
    const refreshers = this.interactionRefreshers.get(sourcePath) ?? new Set<() => void>();
    refreshers.add(refresh);
    this.interactionRefreshers.set(sourcePath, refreshers);
    return () => {
      refreshers.delete(refresh);
      if (refreshers.size === 0) this.interactionRefreshers.delete(sourcePath);
    };
  }

  private renderWorksheetSource(source: string, el: HTMLElement, sourcePath: string): () => void {
    const result = parseWorksheet(source);
    if (!result.ok) {
      renderWorkbookDiagnostics(el, "Worksheet contract could not be rendered", result.diagnostics, source);
      return () => undefined;
    }
    return renderWorksheet(el, result.worksheet, sourcePath, this.sessions, {
      openRef: (ref) => { void this.app.workspace.openLinkText(ref, sourcePath, false); },
      openGovernance: () => this.openGovernanceForPath(sourcePath),
      copyText: (value) => this.copyPreparedBlock(value),
      responsePackets: {
        saveInitial: (confirmed, expected) => this.saveInitialResponsePacket(sourcePath, result.worksheet, confirmed, expected),
        load: (path, digest) => this.loadResponsePacket(sourcePath, result.worksheet, path, digest),
        saveAmendment: (predecessor, reason, confirmed, expected) => this.saveResponseAmendment(sourcePath, result.worksheet, predecessor, reason, confirmed, expected)
      }
    });
  }

  private async saveInitialResponsePacket(
    sourcePath: string,
    worksheet: WorksheetContract,
    confirmed: boolean,
    expected?: WorksheetPacketWriteResult
  ): Promise<WorksheetPacketWriteResult> {
    assertCapabilityEffect("hcc.response.vault-packets", "persist-response");
    return this.responsePackets.saveInitial(sourcePath, worksheet, confirmed, expected);
  }

  private async loadResponsePacket(sourcePath: string, worksheet: WorksheetContract, packetPath: string, packetDigest: string) {
    assertCapabilityEffect("hcc.response.vault-packets", "read-explicit-source");
    return this.responsePackets.load(sourcePath, worksheet, packetPath, packetDigest);
  }

  private async saveResponseAmendment(
    sourcePath: string,
    worksheet: WorksheetContract,
    predecessor: WorksheetPacketReference,
    reason: string,
    confirmed: boolean,
    expected?: WorksheetPacketWriteResult
  ): Promise<WorksheetPacketWriteResult> {
    assertCapabilityEffect("hcc.response.vault-packets", "read-explicit-source");
    assertCapabilityEffect("hcc.response.vault-packets", "persist-response");
    return this.responsePackets.saveAmendment(sourcePath, worksheet, predecessor, reason, confirmed, expected);
  }

  private renderWorkbookSource(source: string, el: HTMLElement, sourcePath: string): () => void {
    const result = parseWorkbook(source);
    if (!result.ok) {
      renderWorkbookDiagnostics(el, "Workbook manifest could not be rendered", result.diagnostics, source);
      return () => undefined;
    }
    return renderWorkbook(el, result.workbook, this.sessions, {
      openRef: (ref) => { void this.app.workspace.openLinkText(ref, sourcePath, false); },
      openGovernance: () => this.openGovernanceForPath(sourcePath)
    });
  }

  private openGovernanceWorkbench(): void {
    assertCapabilityEffect("hcc.governance.workbench", "render");
    assertCapabilityEffect("hcc.governance.workbench", "read-active-document");
    const file = this.app.workspace.getActiveFile();
    if (!file) { this.notify("Open a Markdown document before using the governance workbench.", "failure"); return; }
    new GovernanceWorkbenchModal(this.app, file).open();
  }

  private async openGovernanceDashboard(): Promise<void> {
    assertCapabilityEffect("hcc.dashboard.native", "render");
    assertCapabilityEffect("hcc.dashboard.native", "read-active-document");
    assertCapabilityEffect("hcc.dashboard.native", "read-explicit-authority");
    const file = this.app.workspace.getActiveFile();
    if (!file) { this.notify("Open a Markdown document before using the governance dashboard.", "failure"); return; }
    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.setViewState({ type: HCC_DASHBOARD_VIEW_TYPE, active: true });
    if (leaf.view instanceof HccGovernanceDashboardView) await leaf.view.setSourceFile(file);
    await this.app.workspace.revealLeaf(leaf);
  }

  private openGovernanceForPath(path: string): void {
    assertCapabilityEffect("hcc.governance.workbench", "render");
    assertCapabilityEffect("hcc.governance.workbench", "read-explicit-authority");
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) new GovernanceWorkbenchModal(this.app, file).open();
    else this.notify(`Governance target is unavailable: ${path}`, "failure");
  }

  private copyTemplate(template: string, confirmation: string): void {
    assertCapabilityEffect("hcc.template.clipboard", "copy-to-clipboard");
    void navigator.clipboard.writeText(template).then(
      () => { this.notify(confirmation, "success"); },
      () => { this.notify("The template could not be copied; no vault file was changed.", "failure"); }
    );
  }

  private copyPreparedBlock(value: string): Promise<void> {
    assertCapabilityEffect("hcc.response.clipboard", "copy-to-clipboard");
    return navigator.clipboard.writeText(value);
  }

  private copyStudioText(value: string): Promise<void> {
    assertCapabilityEffect("hcc.studio.candidate", "copy-to-clipboard");
    return navigator.clipboard.writeText(value);
  }

  private copyExchangeText(value: string): Promise<void> {
    assertCapabilityEffect("hcc.exchange.provider-neutral", "copy-to-clipboard");
    return navigator.clipboard.writeText(value);
  }

  private runAuthoringApiSelfTest(): void {
    assertCapabilityEffect("hcc.authoring.api", "render");
    assertCapabilityEffect("hcc.authoring.api", "copy-to-clipboard");
    const report = this.authoringApi.runSelfTest();
    const content = JSON.stringify(report, null, 2);
    this.openEvidenceReport(
      "Authoring API self-test",
      `${report.passed}/${report.total} deterministic foundational cases passed. Inspect the complete report before treating it as bounded evidence.`,
      content,
      "hcc.authoring.api"
    );
    void navigator.clipboard.writeText(content).then(
      () => { this.notify(`Authoring API self-test ${report.passed}/${report.total} passed; report copied.`, "success"); },
      () => { this.notify(`Authoring API self-test ${report.passed}/${report.total} passed; clipboard copy failed.`, "failure"); }
    );
  }

  private runRuntimeReadinessDiagnostic(): void {
    assertCapabilityEffect("hcc.runtime.diagnostics", "render");
    assertCapabilityEffect("hcc.runtime.diagnostics", "copy-to-clipboard");
    const report = buildRuntimeReadinessReport(this.runtimeReadinessInput());
    const content = JSON.stringify(report, null, 2);
    this.openEvidenceReport(
      "Runtime readiness report",
      `${report.passed}/${report.checks.length} privacy-safe runtime checks passed. This does not establish host compatibility or release readiness.`,
      content,
      "hcc.runtime.diagnostics"
    );
    void navigator.clipboard.writeText(content).then(
      () => { this.notify(`Runtime readiness ${report.passed}/${report.checks.length} passed; privacy-safe report copied.`, "success"); },
      () => { this.notify(`Runtime readiness ${report.passed}/${report.checks.length} passed; clipboard copy failed.`, "failure"); }
    );
  }

  private runCompatibilityMatrixDiagnostic(): void {
    assertCapabilityEffect("hcc.runtime.diagnostics", "render");
    assertCapabilityEffect("hcc.runtime.diagnostics", "copy-to-clipboard");
    const runtime = buildRuntimeReadinessReport(this.runtimeReadinessInput());
    const platform: CompatibilityPlatform = runtime.platform === "desktop" ? "desktop"
      : runtime.mobile_os === "android" ? "android"
      : runtime.mobile_os === "ios" ? "ios"
      : "unknown";
    const report = buildCompatibilityMatrix({
      pluginVersion: this.manifest.version,
      minimumAppVersion: this.manifest.minAppVersion,
      observation: { appVersion: apiVersion, platform, minimumApiSatisfied: runtime.checks.find((check) => check.id === "minimum-api")?.passed === true, runtimePassed: runtime.passed, runtimeTotal: runtime.checks.length }
    });
    const content = JSON.stringify(report, null, 2);
    this.openEvidenceReport(
      "Compatibility matrix",
      `${report.summary["observed-pass"]} exact host target passed and ${report.summary["pending-host-evidence"]} target(s) remain pending. No unobserved support is inferred.`,
      content,
      "hcc.runtime.diagnostics"
    );
    void navigator.clipboard.writeText(content).then(
      () => { this.notify(`Compatibility matrix copied: ${report.summary["observed-pass"]} observed pass, ${report.summary["pending-host-evidence"]} pending.`, "success"); },
      () => { this.notify("Compatibility matrix generated; clipboard copy failed.", "failure"); }
    );
  }

  private runHostAssuranceDiagnostic(): void {
    assertCapabilityEffect("hcc.runtime.diagnostics", "render");
    assertCapabilityEffect("hcc.runtime.diagnostics", "copy-to-clipboard");
    const report = buildHostAssurancePacket(this.runtimeReadinessInput());
    const content = JSON.stringify(report, null, 2);
    this.openEvidenceReport(
      "Combined host assurance packet",
      `${report.summary.runtime_checks} runtime checks passed and ${report.summary.pending_host_targets} host target(s) remain pending. The packet is evidence, not a support or release decision.`,
      content,
      "hcc.runtime.diagnostics"
    );
    void navigator.clipboard.writeText(content).then(
      () => { this.notify(`Host assurance copied: ${report.summary.runtime_checks}, ${report.summary.pending_host_targets} target(s) pending.`, "success"); },
      () => { this.notify(`Host assurance generated: ${report.summary.runtime_checks}; clipboard copy failed.`, "failure"); }
    );
  }

  private openEvidenceReport(
    title: string,
    summary: string,
    content: string,
    capability: "hcc.authoring.api" | "hcc.runtime.diagnostics"
  ): void {
    new EvidenceReportModal(this.app, {
      title,
      summary,
      content,
      copyText: (value) => {
        assertCapabilityEffect(capability, "copy-to-clipboard");
        return navigator.clipboard.writeText(value);
      }
    }).open();
  }

  private runtimeReadinessInput(): RuntimeReadinessInput {
    const vault = this.app.vault;
    return {
      pluginVersion: this.manifest.version,
      minimumAppVersion: this.manifest.minAppVersion,
      appApiVersion: apiVersion,
      minimumApiSatisfied: requireApiVersion(this.manifest.minAppVersion),
      platform: {
        desktopUi: Platform.isDesktop,
        mobileUi: Platform.isMobile,
        desktopApp: Platform.isDesktopApp,
        mobileApp: Platform.isMobileApp,
        iosApp: Platform.isIosApp,
        androidApp: Platform.isAndroidApp
      },
      webCryptoAvailable: typeof activeWindow.crypto?.subtle?.digest === "function",
      textEncoderAvailable: typeof TextEncoder === "function",
      clipboardAvailable: typeof navigator.clipboard?.writeText === "function",
      exactVaultReadApiAvailable: typeof vault.getAbstractFileByPath === "function" && typeof vault.cachedRead === "function",
      createOnlyVaultApiAvailable: typeof vault.create === "function" && typeof vault.createFolder === "function",
      writerHostProfile: responsePacketHostProfile(this.manifest.id, vault.getName())
    };
  }

  private async validateActiveWorksheet(): Promise<void> {
    const file = this.app.workspace.getActiveFile();
    if (!file) { this.notify("Open a worksheet document first.", "failure"); return; }
    const content = await this.app.vault.cachedRead(file);
    const match = /```hcc-form\n([\s\S]*?)\n```/.exec(content);
    if (!match) { this.notify("No literal hcc-form fence was found in the active document.", "failure"); return; }
    const result = parseWorksheet(match[1]!);
    this.notify(result.ok ? `Worksheet ${result.worksheet.id} is locally valid.` : `Worksheet blocked: ${result.diagnostics[0]?.message ?? "unknown diagnostic"}`, result.ok ? "success" : "failure");
  }
}

class HccViewRenderChild extends MarkdownRenderChild {
  constructor(containerEl: HTMLElement, private readonly dispose: () => void) {
    super(containerEl);
  }

  override onunload(): void {
    this.dispose();
  }
}

const WORKSHEET_TEMPLATE = `\`\`\`hcc-form
version: 0.1-candidate.1
id: worksheet-id
title: Worksheet title
purpose: State the bounded collection purpose.
privacy: private
sections:
  - id: orientation
    title: Orientation
    interactions: [question-id]
completion:
  required: [question-id]
governance:
  authority_refs: []
  review_required: true
  verification_required: false
\`\`\``;

const WORKBOOK_TEMPLATE = `\`\`\`hcc-workbook
version: 0.1-candidate.1
id: workbook-id
title: Workbook title
purpose: State the bounded shaping purpose.
worksheets:
  - id: orientation
    label: Orientation
    ref: Worksheets/01 Orientation
navigation: sequential
governance:
  authority_refs: []
  review_required: true
\`\`\``;
