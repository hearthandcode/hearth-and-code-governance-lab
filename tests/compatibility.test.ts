import { describe, expect, it } from "vitest";

import { buildCompatibilityMatrix, compareAppVersions } from "../src/compatibility";

const desktop = {
  pluginVersion: "0.0.27",
  minimumAppVersion: "1.12.0",
  observation: { appVersion: "1.13.4", platform: "desktop", minimumApiSatisfied: true, runtimePassed: 8, runtimeTotal: 8 }
} as const;

describe("bounded compatibility matrix", () => {
  it("compares exact numeric application versions without lexical ordering", () => {
    expect(compareAppVersions("1.12.0", "1.9.9")).toBe(1);
    expect(compareAppVersions("1.12.0", "1.12.0")).toBe(0);
    expect(compareAppVersions("1.11.9", "1.12.0")).toBe(-1);
  });

  it("marks only the exact observed desktop host as observed", () => {
    const receipt = buildCompatibilityMatrix(desktop, "2026-08-11T22:00:00.000Z");
    expect(receipt.targets).toHaveLength(4);
    expect(receipt.summary).toEqual({ "observed-pass": 1, "observed-fail": 0, "pending-host-evidence": 3, "outside-declared-range": 0 });
    expect(receipt.targets.find((target) => target.id === "observed-host")?.status).toBe("observed-pass");
    expect(receipt.release_claim).toBe("prohibited-pending-human-and-host-review");
  });

  it("allows the minimum desktop row only when that exact host is observed", () => {
    const receipt = buildCompatibilityMatrix({ ...desktop, observation: { ...desktop.observation, appVersion: "1.12.0" } });
    expect(receipt.summary["observed-pass"]).toBe(2);
    expect(receipt.summary["pending-host-evidence"]).toBe(2);
  });

  it("keeps desktop and iOS pending when Android is the observed host", () => {
    const receipt = buildCompatibilityMatrix({ ...desktop, observation: { ...desktop.observation, platform: "android" as const } });
    expect(receipt.targets.filter((target) => target.status === "observed-pass").map((target) => target.id)).toEqual(["observed-host", "android-current-api"]);
    expect(receipt.targets.find((target) => target.id === "declared-minimum-desktop")?.status).toBe("pending-host-evidence");
  });

  it("fails visibly for incomplete observations and malformed versions", () => {
    const failed = buildCompatibilityMatrix({ ...desktop, observation: { ...desktop.observation, minimumApiSatisfied: false, runtimePassed: 6 } });
    expect(failed.targets.find((target) => target.id === "observed-host")?.status).toBe("observed-fail");
    expect(() => compareAppVersions("1.12", "1.12.0")).toThrow("HCC-COMPAT-VERSION");
    expect(() => buildCompatibilityMatrix({ ...desktop, observation: { ...desktop.observation, runtimePassed: 9 } })).toThrow("HCC-COMPAT-COUNT");
  });
});
