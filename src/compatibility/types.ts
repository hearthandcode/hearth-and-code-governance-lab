export const COMPATIBILITY_MATRIX_VERSION = "0.1-candidate.1" as const;

export type CompatibilityPlatform = "desktop" | "android" | "ios" | "unknown";
export type CompatibilityStatus = "observed-pass" | "observed-fail" | "pending-host-evidence" | "outside-declared-range";

export interface CompatibilityObservation {
  appVersion: string;
  platform: CompatibilityPlatform;
  minimumApiSatisfied: boolean;
  runtimePassed: number;
  runtimeTotal: number;
}

export interface CompatibilityTarget {
  id: "declared-minimum-desktop" | "observed-host" | "android-current-api" | "ios-current-api";
  label: string;
  appVersion: string;
  platform: CompatibilityPlatform;
  status: CompatibilityStatus;
  evidence: string;
}

export interface CompatibilityMatrixReceipt {
  record_type: "hcc-compatibility-matrix-receipt";
  contract_version: typeof COMPATIBILITY_MATRIX_VERSION;
  authority: "bounded-host-compatibility-projection";
  observed_at: string;
  plugin_version: string;
  declared_minimum_app_version: string;
  observation: Readonly<CompatibilityObservation>;
  targets: readonly CompatibilityTarget[];
  summary: Readonly<Record<CompatibilityStatus, number>>;
  release_claim: "prohibited-pending-human-and-host-review";
  effects: { vault_read: false; vault_write: false; network: false; git: false; release: false; publication: false };
  limits: readonly string[];
}
