import { describe, expect, it } from "vitest";

import {
  DEFAULT_HCC_SETTINGS,
  HCC_SETTINGS_PROFILES,
  HCC_SETTINGS_VERSION,
  applyHccSettingsProfile,
  mergeHccPluginSettings,
  parseHccPluginSettings
} from "../src/settings";

describe("bounded plugin settings version 2", () => {
  it("uses guided worksheet defaults without requiring a settings file", () => {
    const result = parseHccPluginSettings(null);
    expect(result.source).toBe("defaults");
    expect(result.settings).toEqual(DEFAULT_HCC_SETTINGS);
    expect(result.settings.version).toBe(2);
    expect(result.settings.profile).toBe("guided-worksheet");
    expect(result.diagnostics).toEqual([]);
  });

  it("accepts one exact version-2 preference record", () => {
    const exact = applyHccSettingsProfile("analysis-workbench");
    const result = parseHccPluginSettings(exact);
    expect(result.source).toBe("stored");
    expect(result.settings).toEqual(exact);
    expect(Object.keys(result.settings)).toHaveLength(14);
  });

  it("migrates an exact version-1 record in memory without inventing capabilities", () => {
    const result = parseHccPluginSettings({ version: 1, presentationMode: "obsidian-native", detailLevel: "explanatory", interactionDensity: "compact", noticeLevel: "quiet" });
    expect(result.source).toBe("migrated");
    expect(result.diagnostics).toEqual([]);
    expect(result.settings).toEqual({
      ...DEFAULT_HCC_SETTINGS,
      presentationTheme: "obsidian-native",
      detailLevel: "explanatory",
      interactionDensity: "compact",
      noticeLevel: "quiet"
    });
    expect(JSON.stringify(result.settings)).not.toContain("presentationMode");
  });

  it("migrates partial unversioned version-1 preferences", () => {
    const result = parseHccPluginSettings({ presentationMode: "obsidian-native" });
    expect(result.source).toBe("migrated");
    expect(result.settings).toEqual({ ...DEFAULT_HCC_SETTINGS, presentationTheme: "obsidian-native" });
  });

  it("fails malformed, future, and prohibited values back to admitted defaults", () => {
    const result = parseHccPluginSettings({ version: 99, presentationTheme: "arbitrary-css", worksheetNavigator: "scan-vault", responseRoot: "/", allowOverwrite: true });
    expect(result.source).toBe("migrated");
    expect(result.settings).toEqual(DEFAULT_HCC_SETTINGS);
    expect(result.diagnostics.join(" ")).toContain("Unknown stored setting(s) ignored");
    expect(result.diagnostics.join(" ")).toContain("Unsupported stored settings version 99");
    expect(JSON.stringify(result.settings)).not.toContain("responseRoot");
    expect(JSON.stringify(result.settings)).not.toContain("allowOverwrite");
  });

  it("provides four deterministic immutable named profiles", () => {
    expect(Object.keys(HCC_SETTINGS_PROFILES)).toEqual(["focused-intake", "guided-worksheet", "analysis-workbench", "audit-governance"]);
    for (const profile of Object.keys(HCC_SETTINGS_PROFILES) as Array<keyof typeof HCC_SETTINGS_PROFILES>) {
      const first = applyHccSettingsProfile(profile);
      const second = applyHccSettingsProfile(profile);
      expect(first).toEqual(second);
      expect(first).not.toBe(second);
      expect(first.version).toBe(HCC_SETTINGS_VERSION);
      expect(first.profile).toBe(profile);
    }
    expect(HCC_SETTINGS_PROFILES["focused-intake"].focusBehavior).toBe("one-question");
    expect(Object.isFrozen(HCC_SETTINGS_PROFILES)).toBe(true);
  });

  it("applies a named profile and marks every manual field override custom", () => {
    const analysis = mergeHccPluginSettings({ ...DEFAULT_HCC_SETTINGS }, { profile: "analysis-workbench" });
    expect(analysis).toEqual(applyHccSettingsProfile("analysis-workbench"));
    const custom = mergeHccPluginSettings(analysis, { worksheetNavigator: "hidden" });
    expect(custom.profile).toBe("custom");
    expect(custom.worksheetNavigator).toBe("hidden");
    expect(custom.presentationTheme).toBe(analysis.presentationTheme);
  });

  it("admits all eight Group-2 fields but no unproved focus or menu mode", () => {
    const result = parseHccPluginSettings({
      ...DEFAULT_HCC_SETTINGS,
      worksheetNavigator: "expanded",
      questionListScope: "current-section",
      focusControl: "compact-button",
      focusBehavior: "modal",
      progressSummary: "detailed",
      primaryActions: "sticky",
      secondaryActions: "overflow",
      completedTreatment: "collapsed"
    });
    expect(result.settings).toMatchObject({
      worksheetNavigator: "expanded",
      questionListScope: "current-section",
      focusControl: "compact-button",
      focusBehavior: "scroll-inline",
      progressSummary: "detailed",
      primaryActions: "sticky",
      secondaryActions: "disclosure",
      completedTreatment: "collapsed"
    });
    expect(result.diagnostics.join(" ")).toContain("Invalid focusBehavior ignored");
    expect(result.diagnostics.join(" ")).toContain("Invalid secondaryActions ignored");

    const oneQuestion = parseHccPluginSettings({ ...DEFAULT_HCC_SETTINGS, focusBehavior: "one-question" });
    expect(oneQuestion.settings.focusBehavior).toBe("one-question");
    expect(oneQuestion.diagnostics).toEqual([]);
  });
});
