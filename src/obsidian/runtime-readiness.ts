export const RUNTIME_READINESS_CONTRACT_VERSION = "0.1-candidate.1" as const;
import type { ResponsePacketHostProfile } from "./vault-response-packet-adapter";

export interface RuntimeReadinessInput {
  pluginVersion: string;
  minimumAppVersion: string;
  appApiVersion: string;
  minimumApiSatisfied: boolean;
  platform: {
    desktopUi: boolean;
    mobileUi: boolean;
    desktopApp: boolean;
    mobileApp: boolean;
    iosApp: boolean;
    androidApp: boolean;
  };
  webCryptoAvailable: boolean;
  textEncoderAvailable: boolean;
  clipboardAvailable: boolean;
  exactVaultReadApiAvailable: boolean;
  createOnlyVaultApiAvailable: boolean;
  writerHostProfile: ResponsePacketHostProfile;
}

export interface RuntimeReadinessCheck {
  id: string;
  passed: boolean;
  observation: string;
}

export interface RuntimeReadinessReport {
  record_type: "hcc-runtime-readiness-receipt";
  contract_version: typeof RUNTIME_READINESS_CONTRACT_VERSION;
  authority: "bounded-host-observation";
  observed_at: string;
  plugin_version: string;
  minimum_app_version: string;
  app_api_version: string;
  platform: "desktop" | "mobile" | "unknown";
  mobile_os: "ios" | "android" | "not-mobile" | "unknown";
  checks: readonly RuntimeReadinessCheck[];
  passed: number;
  failed: number;
  response_writer: "enabled-prototype-disposable-vault" | "enabled-public-current-vault";
  privacy: {
    vault_name_disclosed: false;
    paths_disclosed: false;
    note_content_read: false;
    vault_scanned: false;
  };
  effects: {
    filesystem_write: false;
    vault_mutation: false;
    network: false;
    canonical_apply: false;
  };
  limits: readonly string[];
}

export function buildRuntimeReadinessReport(input: RuntimeReadinessInput, observedAt = new Date().toISOString()): RuntimeReadinessReport {
  const platform = input.platform.mobileUi ? "mobile" : input.platform.desktopUi ? "desktop" : "unknown";
  const mobileOs = !input.platform.mobileApp ? "not-mobile"
    : input.platform.iosApp ? "ios"
    : input.platform.androidApp ? "android"
    : "unknown";
  const checks = Object.freeze([
    check("minimum-api", input.minimumApiSatisfied, `Obsidian API ${input.appApiVersion} against minimum ${input.minimumAppVersion}`),
    check("platform-mode", input.platform.desktopUi !== input.platform.mobileUi, `UI mode resolved as ${platform}`),
    check("host-runtime", input.platform.desktopApp !== input.platform.mobileApp, input.platform.mobileApp ? `Mobile host (${mobileOs})` : input.platform.desktopApp ? "Desktop host" : "Unknown host"),
    check("web-crypto", input.webCryptoAvailable, "Web Crypto SHA-256 primitive is available"),
    check("text-encoder", input.textEncoderAvailable, "UTF-8 TextEncoder primitive is available"),
    check("clipboard", input.clipboardAvailable, "Clipboard write primitive is available for explicit copy commands"),
    check("explicit-vault-read-api", input.exactVaultReadApiAvailable, "Exact-path Vault lookup and cached-read APIs are available"),
    check("bounded-writer-api", input.createOnlyVaultApiAvailable, input.writerHostProfile === "prototype-disposable-vault" ? "Create APIs available; prototype disposable-vault profile enabled" : "Create APIs available; public current-vault profile enabled")
  ]);
  const passed = checks.filter((item) => item.passed).length;
  return Object.freeze({
    record_type: "hcc-runtime-readiness-receipt",
    contract_version: RUNTIME_READINESS_CONTRACT_VERSION,
    authority: "bounded-host-observation",
    observed_at: observedAt,
    plugin_version: input.pluginVersion,
    minimum_app_version: input.minimumAppVersion,
    app_api_version: input.appApiVersion,
    platform,
    mobile_os: mobileOs,
    checks,
    passed,
    failed: checks.length - passed,
    response_writer: input.writerHostProfile === "prototype-disposable-vault" ? "enabled-prototype-disposable-vault" : "enabled-public-current-vault",
    privacy: Object.freeze({ vault_name_disclosed: false, paths_disclosed: false, note_content_read: false, vault_scanned: false }),
    effects: Object.freeze({ filesystem_write: false, vault_mutation: false, network: false, canonical_apply: false }),
    limits: Object.freeze([
      "This receipt observes API presence; it does not exercise a vault write.",
      "It does not prove rendering, touch interaction, assistive-technology behavior, or acceptable performance.",
      "It grants no verification, release, submission, publication, or canonical authority."
    ])
  });
}

function check(id: string, passed: boolean, observation: string): RuntimeReadinessCheck {
  return Object.freeze({ id, passed, observation });
}
