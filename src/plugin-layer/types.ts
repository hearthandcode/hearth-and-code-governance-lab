export const PLUGIN_EFFECTS = [
  "render",
  "read-active-document",
  "read-explicit-source",
  "read-explicit-authority",
  "copy-to-clipboard",
  "read-plugin-settings",
  "persist-settings",
  "persist-response",
  "mutate-frontmatter",
  "scan-vault",
  "network",
  "publish"
] as const;

export type PluginEffect = (typeof PLUGIN_EFFECTS)[number];
export type CapabilityLifecycle = "released-fixture" | "candidate" | "proposal";

export type PluginCapabilityId =
  | "hcc.interaction.released"
  | "hcc.interaction.candidate"
  | "hcc.view.candidate"
  | "hcc.form.candidate"
  | "hcc.workbook.candidate"
  | "hcc.governance.workbench"
  | "hcc.dashboard.native"
  | "hcc.studio.candidate"
  | "hcc.exchange.provider-neutral"
  | "hcc.presentation.ember-circuit"
  | "hcc.settings.preferences"
  | "hcc.template.clipboard"
  | "hcc.response.clipboard"
  | "hcc.response.vault-packets"
  | "hcc.authoring.api"
  | "hcc.runtime.diagnostics"
  | "hcc.extension.computed-field"
  | "hcc.extension.radar";

export interface PluginCapability {
  id: PluginCapabilityId;
  surface: "interaction" | "view" | "form" | "workbook" | "governance" | "dashboard" | "studio" | "exchange" | "presentation" | "settings" | "template" | "response" | "authoring" | "runtime" | "extension";
  lifecycle: CapabilityLifecycle;
  contractVersions: readonly string[];
  vocabulary: readonly string[];
  allowedEffects: readonly PluginEffect[];
  deniedEffects: readonly PluginEffect[];
  provenanceRequired: boolean;
  humanReviewRequired: boolean;
}

export interface CapabilityDecision {
  ok: boolean;
  capabilityId: PluginCapabilityId;
  effect: PluginEffect;
  code: "HCC-CAPABILITY-ALLOWED" | "HCC-CAPABILITY-DENIED" | "HCC-CAPABILITY-UNKNOWN";
  message: string;
}

export interface ExtensionDescriptor {
  id: string;
  extendsCapability: PluginCapabilityId;
  rendererId: string;
  contractVersion: string;
  lifecycle: "candidate" | "proposal";
  vocabulary: readonly string[];
  requestedEffects: readonly PluginEffect[];
  sourceRef: string;
  owner: string;
  reviewState: "human-review-required";
  verified: false;
  fallback: string;
}

export interface ExtensionDiagnostic {
  path: string;
  message: string;
}

export type ExtensionValidationResult =
  | { ok: true; descriptor: ExtensionDescriptor; diagnostics: [] }
  | { ok: false; diagnostics: ExtensionDiagnostic[] };
