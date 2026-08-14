import { buildCompatibilityMatrix, type CompatibilityMatrixReceipt, type CompatibilityPlatform } from "../compatibility";
import { buildRuntimeReadinessReport, type RuntimeReadinessInput, type RuntimeReadinessReport } from "./runtime-readiness";

export const HOST_ASSURANCE_VERSION = "0.1-candidate.1" as const;

export interface HostAssurancePacket {
  record_type: "hcc-host-assurance-packet";
  contract_version: typeof HOST_ASSURANCE_VERSION;
  authority: "bounded-host-observation-bundle";
  observed_at: string;
  runtime: RuntimeReadinessReport;
  compatibility: CompatibilityMatrixReceipt;
  summary: {
    runtime_checks: string;
    exact_host_status: "observed-pass" | "observed-fail";
    pending_host_targets: number;
    public_support_claim: "prohibited-pending-human-and-host-review";
  };
  privacy: {
    vault_name_disclosed: false;
    paths_disclosed: false;
    note_content_read: false;
    vault_scanned: false;
    operating_system_disclosed: false;
    device_identity_disclosed: false;
  };
  effects: {
    vault_read: false;
    vault_write: false;
    network: false;
    git: false;
    release: false;
    publication: false;
  };
  limits: readonly string[];
}

export function buildHostAssurancePacket(input: RuntimeReadinessInput, observedAt = new Date().toISOString()): HostAssurancePacket {
  const runtime = buildRuntimeReadinessReport(input, observedAt);
  const platform: CompatibilityPlatform = runtime.platform === "desktop" ? "desktop"
    : runtime.mobile_os === "android" ? "android"
    : runtime.mobile_os === "ios" ? "ios"
    : "unknown";
  const compatibility = buildCompatibilityMatrix({
    pluginVersion: input.pluginVersion,
    minimumAppVersion: input.minimumAppVersion,
    observation: {
      appVersion: input.appApiVersion,
      platform,
      minimumApiSatisfied: runtime.checks.find((check) => check.id === "minimum-api")?.passed === true,
      runtimePassed: runtime.passed,
      runtimeTotal: runtime.checks.length
    }
  }, observedAt);
  const exactHost = compatibility.targets.find((target) => target.id === "observed-host");
  if (!exactHost || (exactHost.status !== "observed-pass" && exactHost.status !== "observed-fail")) {
    throw new Error("HCC-HOST-ASSURANCE: the exact host observation did not resolve to a bounded pass or fail.");
  }
  return Object.freeze({
    record_type: "hcc-host-assurance-packet",
    contract_version: HOST_ASSURANCE_VERSION,
    authority: "bounded-host-observation-bundle",
    observed_at: observedAt,
    runtime,
    compatibility,
    summary: Object.freeze({
      runtime_checks: `${runtime.passed}/${runtime.checks.length}`,
      exact_host_status: exactHost.status,
      pending_host_targets: compatibility.summary["pending-host-evidence"],
      public_support_claim: "prohibited-pending-human-and-host-review"
    }),
    privacy: Object.freeze({
      vault_name_disclosed: false,
      paths_disclosed: false,
      note_content_read: false,
      vault_scanned: false,
      operating_system_disclosed: false,
      device_identity_disclosed: false
    }),
    effects: Object.freeze({ vault_read: false, vault_write: false, network: false, git: false, release: false, publication: false }),
    limits: Object.freeze([
      "This packet joins one runtime observation and one compatibility projection from the same instant; it does not add evidence.",
      "Only the exact current host may receive observed status; every other target remains pending until separately observed.",
      "It does not prove rendering, writing, touch, assistive-technology, theme, performance, upgrade, rollback, or uninstall behavior.",
      "It grants no verification, support, release, submission, publication, or canonical authority."
    ])
  });
}
