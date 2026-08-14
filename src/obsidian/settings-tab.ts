import { PluginSettingTab, Setting, type App, type Plugin, type PluginManifest } from "obsidian";

import type { HccPluginSettings, HccSettingsPatch } from "../settings";

export interface HccSettingsHost {
  manifest: PluginManifest;
  settingsSnapshot(): HccPluginSettings;
  updateSettings(patch: HccSettingsPatch): Promise<void>;
  governanceSettingsStatus(): {
    hostProfile: string;
    responsePolicy: string;
    contractStatus: string;
    runtimeStatus: string;
  };
}

export class HccPluginSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly host: HccSettingsHost & Plugin) { super(app, host); }

  display(): void {
    const container = this.containerEl;
    container.replaceChildren();
    const title = document.createElement("h2");
    title.textContent = "Hearth and Code Governance Lab";
    container.append(title);
    const intro = document.createElement("p");
    intro.textContent = "Presentation preferences are plugin-owned and local to this vault. Changes apply immediately to open rendered HCC surfaces; no plugin reload is required. They change projection only; governance boundaries below remain read-only.";
    container.append(intro);

    const settings = this.host.settingsSnapshot();
    new Setting(container).setName("Presentation profile").setHeading();
    new Setting(container)
      .setName("Starting profile")
      .setDesc("Apply one deterministic presentation profile. Changing an individual preference marks the current profile as Custom.")
      .addDropdown((control) => {
        control.addOptions({
          "focused-intake": "Focused intake",
          "guided-worksheet": "Guided worksheet",
          "analysis-workbench": "Analysis workbench",
          "audit-governance": "Audit and governance"
        });
        if (settings.profile === "custom") control.addOption("custom", "Custom");
        control.setValue(settings.profile).onChange(async (value) => {
          if (value === "custom") return;
          await this.host.updateSettings({ profile: value as Exclude<HccPluginSettings["profile"], "custom"> });
          this.display();
        });
      });

    new Setting(container).setName("Overall presentation").setHeading();
    dropdown(container, this.host, "Default presentation", "Choose the initial visual presentation after plugin load. The command-palette toggle remains session-only.", settings.presentationTheme,
      { "ember-circuit": "Ember Circuit", "obsidian-native": "Obsidian native" }, "presentationTheme");
    dropdown(container, this.host, "Explanatory detail", "Compact keeps companion disclosures closed by default. Explanatory opens non-sensitive context and contract disclosures when rendered.", settings.detailLevel,
      { compact: "Compact", explanatory: "Explanatory" }, "detailLevel");
    dropdown(container, this.host, "Interaction density", "Compact reduces spacing while preserving control size, focus indicators, and accessible labels.", settings.interactionDensity,
      { comfortable: "Comfortable", compact: "Compact" }, "interactionDensity");
    dropdown(container, this.host, "Routine notices", "Quiet suppresses routine success notices. Failures, blocked effects, and governance warnings remain visible.", settings.noticeLevel,
      { standard: "Standard", quiet: "Quiet" }, "noticeLevel");

    new Setting(container).setName("Worksheet navigation and actions").setHeading();
    dropdown(container, this.host, "Worksheet navigator", "Hide, collapse, compact, or expand the section and question overview. Progress remains separate.", settings.worksheetNavigator,
      { hidden: "Hidden", collapsed: "Collapsed", compact: "Compact", expanded: "Expanded" }, "worksheetNavigator");
    dropdown(container, this.host, "Question-list scope", "Choose which question rows appear in the navigator without changing the worksheet or its responses.", settings.questionListScope,
      { none: "No question rows", "current-section": "Current section", incomplete: "Incomplete questions", all: "All questions" }, "questionListScope");
    dropdown(container, this.host, "Focus control", "Choose the visible form of each navigator focus action. Keyboard navigation commands remain available when hidden.", settings.focusControl,
      { hidden: "Hidden", icon: "Icon", "compact-button": "Compact button", "full-button": "Full button" }, "focusControl");
    dropdown(container, this.host, "Question presentation", "Keep every question inline or surface one worksheet question at a time with accessible Previous and Next controls. This changes presentation only; answers and source remain intact.", settings.focusBehavior,
      { "scroll-inline": "All questions inline", "one-question": "One question at a time" }, "focusBehavior");
    dropdown(container, this.host, "Progress summary", "Hide progress or show a count, compact completion state, or detailed required-response summary.", settings.progressSummary,
      { hidden: "Hidden", count: "Answered count", compact: "Compact", detailed: "Detailed" }, "progressSummary");
    dropdown(container, this.host, "Primary actions", "Present review and final-packet actions inline, compactly, or in a sticky toolbar.", settings.primaryActions,
      { inline: "Inline", compact: "Compact", sticky: "Sticky" }, "primaryActions");
    dropdown(container, this.host, "Secondary actions", "Keep supporting actions inline or place them in a labeled disclosure.", settings.secondaryActions,
      { inline: "Inline", disclosure: "Disclosure" }, "secondaryActions");
    dropdown(container, this.host, "Completed questions", "Keep completed navigator rows unchanged, dim them, or collapse their supporting labels while preserving a focus route.", settings.completedTreatment,
      { unchanged: "Unchanged", dimmed: "Dimmed", collapsed: "Collapsed" }, "completedTreatment");

    const gallery = document.createElement("p");
    gallery.className = "hcc-settings__gallery-note";
    gallery.textContent = "Evaluation gallery: open Evaluation/29 Presentation Settings Gallery.md in the disposable demonstration vault to compare every setting against one stable surface.";
    container.append(gallery);

    new Setting(container).setName("Governance status · read only").setHeading();
    const status = this.host.governanceSettingsStatus();
    readOnly(container, "Plugin identity and host profile", `${this.host.manifest.name} ${this.host.manifest.version} · ${this.host.manifest.id} · ${status.hostProfile}`);
    readOnly(container, "Response boundary", status.responsePolicy);
    readOnly(container, "Contracts and catalogs", status.contractStatus);
    readOnly(container, "Runtime compatibility", status.runtimeStatus);

    const boundary = document.createElement("p");
    boundary.className = "hcc-settings__boundary";
    boundary.textContent = "Not configurable: response paths, overwrite or deletion, schema and digest validation, privacy, HumanGates, providers, network access, canonical write-back, release, or publication.";
    container.append(boundary);
  }
}

function dropdown<K extends keyof HccSettingsPatch>(
  container: HTMLElement,
  host: HccSettingsHost,
  name: string,
  description: string,
  value: NonNullable<HccSettingsPatch[K]>,
  options: Record<string, string>,
  field: K
): void {
  new Setting(container).setName(name).setDesc(description).addDropdown((control) => control
    .addOptions(options)
    .setValue(String(value))
    .onChange(async (next) => { await host.updateSettings({ [field]: next } as HccSettingsPatch); }));
}

function readOnly(container: HTMLElement, name: string, description: string): void {
  new Setting(container).setName(name).setDesc(description).setDisabled(true);
}
