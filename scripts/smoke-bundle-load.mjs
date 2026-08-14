import { readFileSync } from "node:fs";
import vm from "node:vm";

const bundlePath = new URL("../scratch-vault/.obsidian/plugins/hcc-widget-lab/main.js", import.meta.url);
const source = readFileSync(bundlePath, "utf8");
const processors = [];
const commands = [];
const commandCallbacks = new Map();
const ribbons = [];
const views = [];
const detachedViews = [];
const settingTabs = [];
const savedSettings = [];
const bodyClasses = new Set();
const clipboardWrites = [];
const documentStub = { querySelectorAll: () => [], body: { classList: {
  add: (...names) => names.forEach((name) => bodyClasses.add(name)),
  remove: (...names) => names.forEach((name) => bodyClasses.delete(name)),
  toggle: (name, force) => { if (force === true) bodyClasses.add(name); else if (force === false) bodyClasses.delete(name); else if (bodyClasses.has(name)) bodyClasses.delete(name); else bodyClasses.add(name); return bodyClasses.has(name); }
} } };

class Plugin {
  manifest = { id: "hcc-widget-lab", version: "0.0.29", minAppVersion: "1.13.4" };
  app = {
    workspace: { containerEl: { ownerDocument: documentStub }, getActiveFile: () => null, detachLeavesOfType: (type) => { detachedViews.push(type); } },
    vault: {
      getName: () => "scratch-vault",
      getAbstractFileByPath: () => null,
      cachedRead: async () => "",
      create: async () => undefined,
      createFolder: async () => undefined
    }
  };
  registerMarkdownCodeBlockProcessor(language) { processors.push(language); }
  registerEditorExtension() {}
  registerView(type) { views.push(type); }
  addCommand(command) { commands.push(command.id); commandCallbacks.set(command.id, command.callback); }
  addRibbonIcon(icon, title) { ribbons.push({ icon, title }); }
  addSettingTab(tab) { settingTabs.push(tab); }
  async loadData() { return null; }
  async saveData(value) { savedSettings.push(structuredClone(value)); }
}

class MarkdownRenderChild {
  constructor(containerEl) { this.containerEl = containerEl; }
}
class Modal { open() {} }
class ItemView {}
class TFile {}
class WidgetType {}
class PluginSettingTab {
  constructor(app, plugin) { this.app = app; this.plugin = plugin; this.containerEl = { replaceChildren() {} }; }
}
class Setting {}

const obsidian = {
  Plugin,
  PluginSettingTab,
  Setting,
  MarkdownRenderChild,
  Modal,
  ItemView,
  TFile,
  Notice: class {},
  normalizePath: (value) => value,
  editorInfoField: {},
  editorLivePreviewField: {},
  apiVersion: "1.13.4",
  requireApiVersion: () => true,
  Platform: {
    isDesktop: true, isMobile: false, isDesktopApp: true, isMobileApp: false,
    isIosApp: false, isAndroidApp: false, isPhone: false, isTablet: false, isMacOS: false
  }
};
const codeMirrorState = {
  StateField: { define: (specification) => ({ specification }) }
};
const codeMirrorView = {
  Decoration: {
    none: Object.freeze({}),
    replace: () => ({ range: (from, to) => ({ from, to }) }),
    set: (ranges) => ranges
  },
  EditorView: { decorations: { from: (field) => field } },
  ViewPlugin: { fromClass: (pluginClass) => ({ pluginClass }) },
  WidgetType
};

const module = { exports: {} };
const context = vm.createContext({
  module,
  exports: module.exports,
  console,
  performance,
  crypto: globalThis.crypto,
  TextEncoder,
  navigator: { clipboard: { writeText: async (value) => { clipboardWrites.push(value); } } },
  activeWindow: { crypto: globalThis.crypto },
  document: documentStub,
  require: (id) => {
    if (id === "obsidian") return obsidian;
    if (id === "@codemirror/state") return codeMirrorState;
    if (id === "@codemirror/view") return codeMirrorView;
    throw new Error(`Unexpected external bundle dependency: ${id}`);
  }
});

vm.runInContext(source, context, { filename: bundlePath.pathname, timeout: 5000 });
const exported = module.exports;
const PluginConstructor = typeof exported === "function" ? exported : exported.default;
if (typeof PluginConstructor !== "function") throw new Error("Bundle does not expose a plugin constructor.");
const plugin = new PluginConstructor();
if (plugin.authoringApi?.apiVersion !== "0.1-candidate.1") throw new Error("Candidate authoring API is absent from the plugin instance.");
if (plugin.authoringApi.effects?.filesystemWrite !== false) throw new Error("Candidate authoring API effect ceiling is invalid.");
await plugin.onload();

const expectedProcessors = ["hcc-interaction", "hcc-view", "hcc-form", "hcc-workbook", "hcc-computed-field", "hcc-radar-view", "hcc-studio", "hcc-exchange"];
if (JSON.stringify(processors) !== JSON.stringify(expectedProcessors)) throw new Error(`Processor registration mismatch: ${JSON.stringify(processors)}.`);
if (!commands.includes("open-governance-workbench") || !commands.includes("focus-next-widget")) throw new Error("Expected command registrations are absent.");
if (!commands.includes("open-governance-dashboard") || !views.includes("hcc-governance-dashboard")) throw new Error("Native governance dashboard registration is absent.");
if (settingTabs.length !== 1) throw new Error("Governance Lab settings tab registration is absent or duplicated.");
if (savedSettings.length !== 0) throw new Error("Plugin load created a settings file without a human preference change.");
if (plugin.settingsSnapshot().presentationMode !== "ember-circuit") throw new Error("Safe default settings were not loaded.");
await plugin.updateSettings({ presentationMode: "obsidian-native", interactionDensity: "compact", noticeLevel: "quiet" });
if (bodyClasses.has("hcc-plugin-ember-circuit-session") || !bodyClasses.has("hcc-plugin-density-compact")) throw new Error("Persisted presentation preferences were not applied immediately.");
if (savedSettings.length !== 1 || savedSettings[0].version !== 1 || savedSettings[0].noticeLevel !== "quiet") throw new Error("One bounded preference change was not persisted exactly.");
await plugin.updateSettings({ presentationMode: "ember-circuit", interactionDensity: "comfortable", noticeLevel: "standard" });
const runtimeDiagnostic = commandCallbacks.get("run-runtime-readiness-diagnostic");
if (typeof runtimeDiagnostic !== "function") throw new Error("Runtime readiness command is absent.");
runtimeDiagnostic();
await Promise.resolve();
await Promise.resolve();
const runtimeReport = JSON.parse(clipboardWrites.at(-1));
if (runtimeReport.record_type !== "hcc-runtime-readiness-receipt" || runtimeReport.passed !== 8 || runtimeReport.checks.length !== 8) throw new Error("Runtime readiness report is invalid.");
if (runtimeReport.privacy.vault_name_disclosed !== false || JSON.stringify(runtimeReport).includes("scratch-vault")) throw new Error("Runtime readiness report disclosed vault identity.");
const compatibilityDiagnostic = commandCallbacks.get("run-compatibility-matrix");
if (typeof compatibilityDiagnostic !== "function") throw new Error("Compatibility matrix command is absent.");
compatibilityDiagnostic();
await Promise.resolve();
await Promise.resolve();
const compatibilityReport = JSON.parse(clipboardWrites.at(-1));
if (compatibilityReport.record_type !== "hcc-compatibility-matrix-receipt" || compatibilityReport.targets.length !== 4) throw new Error("Compatibility matrix report is invalid.");
if (compatibilityReport.summary["observed-pass"] !== 2 || compatibilityReport.summary["pending-host-evidence"] !== 2) throw new Error("Compatibility matrix evidence boundary is invalid.");
if (compatibilityReport.release_claim !== "prohibited-pending-human-and-host-review") throw new Error("Compatibility matrix claimed release authority.");
const hostAssuranceDiagnostic = commandCallbacks.get("run-host-assurance-packet");
if (typeof hostAssuranceDiagnostic !== "function") throw new Error("Combined host-assurance command is absent.");
hostAssuranceDiagnostic();
await Promise.resolve();
await Promise.resolve();
const hostAssuranceReport = JSON.parse(clipboardWrites.at(-1));
if (hostAssuranceReport.record_type !== "hcc-host-assurance-packet" || hostAssuranceReport.summary.runtime_checks !== "8/8") throw new Error("Combined host-assurance packet is invalid.");
if (hostAssuranceReport.runtime.observed_at !== hostAssuranceReport.compatibility.observed_at) throw new Error("Combined host-assurance evidence is not time-bound to one observation.");
if (hostAssuranceReport.summary.public_support_claim !== "prohibited-pending-human-and-host-review") throw new Error("Combined host-assurance packet claimed support authority.");
if (JSON.stringify(hostAssuranceReport).includes("scratch-vault")) throw new Error("Combined host-assurance packet disclosed vault identity.");
const togglePresentation = commandCallbacks.get("toggle-ember-circuit-presentation");
if (typeof togglePresentation !== "function") throw new Error("Ember Circuit session command is absent.");
if (!bodyClasses.has("hcc-plugin-ember-circuit-session")) throw new Error("Default Ember Circuit session class was not enabled on load.");
togglePresentation();
if (bodyClasses.has("hcc-plugin-ember-circuit-session")) throw new Error("Ember Circuit session class was not disabled.");
togglePresentation();
if (!bodyClasses.has("hcc-plugin-ember-circuit-session")) throw new Error("Ember Circuit session class was not re-enabled.");
let pendingPreviewsCleared = false;
plugin.responsePackets.clearPending = () => { pendingPreviewsCleared = true; };
plugin.interactionRefreshers.set("Synthetic.md", new Set([() => undefined]));
plugin.onunload();
if (bodyClasses.has("hcc-plugin-ember-circuit-session")) throw new Error("Ember Circuit session class survived plugin unload.");
if (!pendingPreviewsCleared) throw new Error("Pending response-packet previews were not cleared on unload.");
if (plugin.interactionRefreshers.size !== 0) throw new Error("Interaction refreshers survived plugin unload.");
if (detachedViews.length !== 0) throw new Error("Dashboard leaves were detached during plugin unload instead of remaining host-managed.");
if (ribbons.length !== 1 || ribbons[0].icon !== "shield-check") throw new Error("Governance ribbon registration is absent.");

console.log(JSON.stringify({
  record_type: "hcc-bundle-load-smoke-receipt",
  bundle: bundlePath.pathname,
  export_shape: typeof exported === "function" ? "constructor" : "default-constructor",
  processors,
  views,
  command_count: commands.length,
  settings_tab_count: settingTabs.length,
  settings_persistence: "explicit-change-only",
  presentation_toggle: "pass",
  unload_cleanup: { pending_previews: "cleared", interaction_refreshers: "cleared", dashboard_leaves: "host-managed", presentation_class: "removed" },
  authoring_api: plugin.authoringApi.apiVersion,
  runtime_readiness: `${runtimeReport.passed}/${runtimeReport.checks.length}`,
  compatibility_matrix: `${compatibilityReport.summary["observed-pass"]} observed / ${compatibilityReport.summary["pending-host-evidence"]} pending`,
  host_assurance: `${hostAssuranceReport.summary.runtime_checks} / ${hostAssuranceReport.summary.pending_host_targets} pending`,
  ribbon_count: ribbons.length,
  onload: "pass"
}, null, 2));
