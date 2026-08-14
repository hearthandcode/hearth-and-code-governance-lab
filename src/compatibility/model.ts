import {
  COMPATIBILITY_MATRIX_VERSION,
  type CompatibilityMatrixReceipt,
  type CompatibilityObservation,
  type CompatibilityPlatform,
  type CompatibilityStatus,
  type CompatibilityTarget
} from "./types";

const VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export function compareAppVersions(left: string, right: string): -1 | 0 | 1 {
  const a = parseVersion(left);
  const b = parseVersion(right);
  for (let index = 0; index < 3; index += 1) {
    if (a[index]! < b[index]!) return -1;
    if (a[index]! > b[index]!) return 1;
  }
  return 0;
}

export function buildCompatibilityMatrix(
  input: { pluginVersion: string; minimumAppVersion: string; observation: CompatibilityObservation },
  observedAt = new Date().toISOString()
): CompatibilityMatrixReceipt {
  parseVersion(input.pluginVersion);
  parseVersion(input.minimumAppVersion);
  parseVersion(input.observation.appVersion);
  if (!Number.isInteger(input.observation.runtimePassed) || !Number.isInteger(input.observation.runtimeTotal)
    || input.observation.runtimePassed < 0 || input.observation.runtimeTotal <= 0
    || input.observation.runtimePassed > input.observation.runtimeTotal) throw new Error("HCC-COMPAT-COUNT: runtime check counts are invalid.");

  const targetDefinitions = [
    { id: "declared-minimum-desktop", label: "Declared minimum desktop", appVersion: input.minimumAppVersion, platform: "desktop" },
    { id: "observed-host", label: "Observed host", appVersion: input.observation.appVersion, platform: input.observation.platform },
    { id: "android-current-api", label: "Android at observed API version", appVersion: input.observation.appVersion, platform: "android" },
    { id: "ios-current-api", label: "iOS/iPadOS at observed API version", appVersion: input.observation.appVersion, platform: "ios" }
  ] as const;
  const targets = Object.freeze(targetDefinitions.map((target) => Object.freeze({ ...target, ...evaluate(target.appVersion, target.platform, input.minimumAppVersion, input.observation) })) as CompatibilityTarget[]);
  const statuses: CompatibilityStatus[] = ["observed-pass", "observed-fail", "pending-host-evidence", "outside-declared-range"];
  const summary = Object.freeze(Object.fromEntries(statuses.map((status) => [status, targets.filter((target) => target.status === status).length])) as Record<CompatibilityStatus, number>);
  return Object.freeze({
    record_type: "hcc-compatibility-matrix-receipt",
    contract_version: COMPATIBILITY_MATRIX_VERSION,
    authority: "bounded-host-compatibility-projection",
    observed_at: observedAt,
    plugin_version: input.pluginVersion,
    declared_minimum_app_version: input.minimumAppVersion,
    observation: Object.freeze({ ...input.observation }),
    targets,
    summary,
    release_claim: "prohibited-pending-human-and-host-review",
    effects: Object.freeze({ vault_read: false, vault_write: false, network: false, git: false, release: false, publication: false }),
    limits: Object.freeze([
      "Only the exact observed version and platform can receive host-observed status.",
      "A pending target is untested, not compatible by inference.",
      "Runtime primitives do not prove rendering, touch, accessibility, theme, performance, writer, upgrade, rollback, or uninstall behavior.",
      "This receipt grants no verification, support, release, submission, or publication authority."
    ])
  });
}

function evaluate(appVersion: string, platform: CompatibilityPlatform, minimum: string, observation: CompatibilityObservation): { status: CompatibilityStatus; evidence: string } {
  if (compareAppVersions(appVersion, minimum) < 0) return { status: "outside-declared-range", evidence: `Target ${appVersion} is below declared minimum ${minimum}.` };
  if (appVersion !== observation.appVersion || platform !== observation.platform) return { status: "pending-host-evidence", evidence: `No exact ${platform} ${appVersion} host observation is attached.` };
  const passed = observation.minimumApiSatisfied && observation.runtimePassed === observation.runtimeTotal;
  return passed
    ? { status: "observed-pass", evidence: `Exact host observation passed ${observation.runtimePassed}/${observation.runtimeTotal} runtime checks.` }
    : { status: "observed-fail", evidence: `Exact host observation passed ${observation.runtimePassed}/${observation.runtimeTotal}; minimum API satisfied: ${observation.minimumApiSatisfied}.` };
}

function parseVersion(value: string): readonly [number, number, number] {
  const match = VERSION.exec(value);
  if (!match) throw new Error(`HCC-COMPAT-VERSION: expected exact numeric x.y.z; received ${value}.`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}
