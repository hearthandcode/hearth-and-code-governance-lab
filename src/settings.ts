export const HCC_SETTINGS_VERSION = 2 as const;

export type HccSettingsProfile = "focused-intake" | "guided-worksheet" | "analysis-workbench" | "audit-governance" | "custom";
export type HccPresentationTheme = "ember-circuit" | "obsidian-native";
export type HccDetailLevel = "compact" | "explanatory";
export type HccInteractionDensity = "comfortable" | "compact";
export type HccNoticeLevel = "standard" | "quiet";
export type HccWorksheetNavigator = "hidden" | "collapsed" | "compact" | "expanded";
export type HccQuestionListScope = "none" | "current-section" | "incomplete" | "all";
export type HccFocusControl = "hidden" | "icon" | "compact-button" | "full-button";
export type HccFocusBehavior = "scroll-inline" | "one-question";
export type HccProgressSummary = "hidden" | "count" | "compact" | "detailed";
export type HccPrimaryActions = "inline" | "compact" | "sticky";
export type HccSecondaryActions = "inline" | "disclosure";
export type HccCompletedTreatment = "unchanged" | "dimmed" | "collapsed";

export interface HccPluginSettings {
  version: typeof HCC_SETTINGS_VERSION;
  profile: HccSettingsProfile;
  presentationTheme: HccPresentationTheme;
  detailLevel: HccDetailLevel;
  interactionDensity: HccInteractionDensity;
  noticeLevel: HccNoticeLevel;
  worksheetNavigator: HccWorksheetNavigator;
  questionListScope: HccQuestionListScope;
  focusControl: HccFocusControl;
  focusBehavior: HccFocusBehavior;
  progressSummary: HccProgressSummary;
  primaryActions: HccPrimaryActions;
  secondaryActions: HccSecondaryActions;
  completedTreatment: HccCompletedTreatment;
}

export type HccSettingsPatch = Partial<Omit<HccPluginSettings, "version">>;

export interface HccSettingsParseResult {
  settings: HccPluginSettings;
  source: "defaults" | "stored" | "migrated";
  diagnostics: readonly string[];
}

type NamedProfile = Exclude<HccSettingsProfile, "custom">;
type ProfileValues = Omit<HccPluginSettings, "version" | "profile">;

const GUIDED_WORKSHEET: Readonly<ProfileValues> = Object.freeze({
  presentationTheme: "ember-circuit",
  detailLevel: "compact",
  interactionDensity: "comfortable",
  noticeLevel: "standard",
  worksheetNavigator: "collapsed",
  questionListScope: "incomplete",
  focusControl: "icon",
  focusBehavior: "scroll-inline",
  progressSummary: "compact",
  primaryActions: "inline",
  secondaryActions: "disclosure",
  completedTreatment: "dimmed"
});

export const HCC_SETTINGS_PROFILES: Readonly<Record<NamedProfile, Readonly<ProfileValues>>> = Object.freeze({
  "focused-intake": Object.freeze({
    ...GUIDED_WORKSHEET,
    interactionDensity: "compact",
    noticeLevel: "quiet",
    focusBehavior: "one-question",
    progressSummary: "count",
    primaryActions: "compact"
  }),
  "guided-worksheet": GUIDED_WORKSHEET,
  "analysis-workbench": Object.freeze({
    ...GUIDED_WORKSHEET,
    detailLevel: "explanatory",
    worksheetNavigator: "expanded",
    questionListScope: "all",
    focusControl: "full-button",
    progressSummary: "detailed",
    primaryActions: "sticky",
    secondaryActions: "inline",
    completedTreatment: "unchanged"
  }),
  "audit-governance": Object.freeze({
    ...GUIDED_WORKSHEET,
    detailLevel: "explanatory",
    interactionDensity: "compact",
    worksheetNavigator: "compact",
    questionListScope: "all",
    focusControl: "compact-button",
    progressSummary: "detailed",
    primaryActions: "sticky",
    secondaryActions: "inline"
  })
});

export const DEFAULT_HCC_SETTINGS: Readonly<HccPluginSettings> = Object.freeze({
  version: HCC_SETTINGS_VERSION,
  profile: "guided-worksheet",
  ...GUIDED_WORKSHEET
});

const PROFILES = ["focused-intake", "guided-worksheet", "analysis-workbench", "audit-governance", "custom"] as const;
const PRESENTATION_THEMES = ["ember-circuit", "obsidian-native"] as const;
const DETAIL_LEVELS = ["compact", "explanatory"] as const;
const DENSITIES = ["comfortable", "compact"] as const;
const NOTICE_LEVELS = ["standard", "quiet"] as const;
const NAVIGATORS = ["hidden", "collapsed", "compact", "expanded"] as const;
const QUESTION_SCOPES = ["none", "current-section", "incomplete", "all"] as const;
const FOCUS_CONTROLS = ["hidden", "icon", "compact-button", "full-button"] as const;
const FOCUS_BEHAVIORS = ["scroll-inline", "one-question"] as const;
const PROGRESS_SUMMARIES = ["hidden", "count", "compact", "detailed"] as const;
const PRIMARY_ACTIONS = ["inline", "compact", "sticky"] as const;
const SECONDARY_ACTIONS = ["inline", "disclosure"] as const;
const COMPLETED_TREATMENTS = ["unchanged", "dimmed", "collapsed"] as const;

const VERSION_1_FIELDS = new Set(["version", "presentationMode", "detailLevel", "interactionDensity", "noticeLevel"]);
const VERSION_2_FIELDS = new Set([
  "version", "profile", "presentationTheme", "detailLevel", "interactionDensity", "noticeLevel",
  "worksheetNavigator", "questionListScope", "focusControl", "focusBehavior", "progressSummary",
  "primaryActions", "secondaryActions", "completedTreatment"
]);

export function parseHccPluginSettings(raw: unknown): HccSettingsParseResult {
  if (raw === null || raw === undefined) return { settings: freshDefaults(), source: "defaults", diagnostics: [] };
  if (!isRecord(raw)) return {
    settings: freshDefaults(), source: "migrated", diagnostics: ["Stored settings were not an object; safe defaults were applied."]
  };

  if (raw.version === 1 || (raw.version === undefined && "presentationMode" in raw)) return migrateVersion1(raw);

  const diagnostics: string[] = [];
  const unknown = Object.keys(raw).filter((key) => !VERSION_2_FIELDS.has(key));
  if (unknown.length > 0) diagnostics.push(`Unknown stored setting(s) ignored: ${unknown.sort().join(", ")}.`);
  if (raw.version !== undefined && raw.version !== HCC_SETTINGS_VERSION) {
    diagnostics.push(`Unsupported stored settings version ${String(raw.version)}; recognized fields were migrated safely.`);
  }

  const settings = parseVersion2Fields(raw, diagnostics);
  const exact = raw.version === HCC_SETTINGS_VERSION && diagnostics.length === 0 && Object.keys(raw).length === VERSION_2_FIELDS.size;
  return { settings, source: exact ? "stored" : "migrated", diagnostics };
}

export function applyHccSettingsProfile(profile: NamedProfile): HccPluginSettings {
  return { version: HCC_SETTINGS_VERSION, profile, ...HCC_SETTINGS_PROFILES[profile] };
}

export function mergeHccPluginSettings(current: HccPluginSettings, patch: HccSettingsPatch): HccPluginSettings {
  const changedFields = Object.keys(patch).filter((key) => key !== "profile");
  if (changedFields.length === 0 && patch.profile && patch.profile !== "custom") return applyHccSettingsProfile(patch.profile);
  const merged = parseHccPluginSettings({ ...current, ...patch, version: HCC_SETTINGS_VERSION }).settings;
  return changedFields.length > 0 ? { ...merged, profile: "custom" } : merged;
}

function migrateVersion1(raw: Record<string, unknown>): HccSettingsParseResult {
  const diagnostics: string[] = [];
  const unknown = Object.keys(raw).filter((key) => !VERSION_1_FIELDS.has(key));
  if (unknown.length > 0) diagnostics.push(`Unknown stored setting(s) ignored: ${unknown.sort().join(", ")}.`);
  const settings: HccPluginSettings = {
    ...freshDefaults(),
    presentationTheme: admitted(raw.presentationMode, PRESENTATION_THEMES, DEFAULT_HCC_SETTINGS.presentationTheme, "presentationMode", diagnostics),
    detailLevel: admitted(raw.detailLevel, DETAIL_LEVELS, DEFAULT_HCC_SETTINGS.detailLevel, "detailLevel", diagnostics),
    interactionDensity: admitted(raw.interactionDensity, DENSITIES, DEFAULT_HCC_SETTINGS.interactionDensity, "interactionDensity", diagnostics),
    noticeLevel: admitted(raw.noticeLevel, NOTICE_LEVELS, DEFAULT_HCC_SETTINGS.noticeLevel, "noticeLevel", diagnostics)
  };
  return { settings, source: "migrated", diagnostics };
}

function parseVersion2Fields(raw: Record<string, unknown>, diagnostics: string[]): HccPluginSettings {
  return {
    version: HCC_SETTINGS_VERSION,
    profile: admitted(raw.profile, PROFILES, DEFAULT_HCC_SETTINGS.profile, "profile", diagnostics),
    presentationTheme: admitted(raw.presentationTheme, PRESENTATION_THEMES, DEFAULT_HCC_SETTINGS.presentationTheme, "presentationTheme", diagnostics),
    detailLevel: admitted(raw.detailLevel, DETAIL_LEVELS, DEFAULT_HCC_SETTINGS.detailLevel, "detailLevel", diagnostics),
    interactionDensity: admitted(raw.interactionDensity, DENSITIES, DEFAULT_HCC_SETTINGS.interactionDensity, "interactionDensity", diagnostics),
    noticeLevel: admitted(raw.noticeLevel, NOTICE_LEVELS, DEFAULT_HCC_SETTINGS.noticeLevel, "noticeLevel", diagnostics),
    worksheetNavigator: admitted(raw.worksheetNavigator, NAVIGATORS, DEFAULT_HCC_SETTINGS.worksheetNavigator, "worksheetNavigator", diagnostics),
    questionListScope: admitted(raw.questionListScope, QUESTION_SCOPES, DEFAULT_HCC_SETTINGS.questionListScope, "questionListScope", diagnostics),
    focusControl: admitted(raw.focusControl, FOCUS_CONTROLS, DEFAULT_HCC_SETTINGS.focusControl, "focusControl", diagnostics),
    focusBehavior: admitted(raw.focusBehavior, FOCUS_BEHAVIORS, DEFAULT_HCC_SETTINGS.focusBehavior, "focusBehavior", diagnostics),
    progressSummary: admitted(raw.progressSummary, PROGRESS_SUMMARIES, DEFAULT_HCC_SETTINGS.progressSummary, "progressSummary", diagnostics),
    primaryActions: admitted(raw.primaryActions, PRIMARY_ACTIONS, DEFAULT_HCC_SETTINGS.primaryActions, "primaryActions", diagnostics),
    secondaryActions: admitted(raw.secondaryActions, SECONDARY_ACTIONS, DEFAULT_HCC_SETTINGS.secondaryActions, "secondaryActions", diagnostics),
    completedTreatment: admitted(raw.completedTreatment, COMPLETED_TREATMENTS, DEFAULT_HCC_SETTINGS.completedTreatment, "completedTreatment", diagnostics)
  };
}

function admitted<T extends string>(value: unknown, allowed: readonly T[], fallback: T, field: string, diagnostics: string[]): T {
  if (value === undefined) return fallback;
  if (typeof value === "string" && allowed.includes(value as T)) return value as T;
  diagnostics.push(`Invalid ${field} ignored; safe default ${fallback} was applied.`);
  return fallback;
}

function freshDefaults(): HccPluginSettings { return { ...DEFAULT_HCC_SETTINGS }; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
