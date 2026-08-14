import { describe, expect, it } from "vitest";

import { buildRuntimeReadinessReport } from "../src/obsidian/runtime-readiness";

const completeDesktopInput = {
  pluginVersion: "0.0.29",
  minimumAppVersion: "1.13.4",
  appApiVersion: "1.13.4",
  minimumApiSatisfied: true,
  platform: { desktopUi: true, mobileUi: false, desktopApp: true, mobileApp: false, iosApp: false, androidApp: false },
  webCryptoAvailable: true,
  textEncoderAvailable: true,
  clipboardAvailable: true,
  exactVaultReadApiAvailable: true,
  createOnlyVaultApiAvailable: true,
  writerHostProfile: "prototype-disposable-vault"
} as const;

describe("runtime readiness receipt", () => {
  it("produces exactly eight passing, privacy-safe desktop observations", () => {
    const report = buildRuntimeReadinessReport(completeDesktopInput, "2026-08-11T21:00:00.000Z");
    expect(report).toMatchObject({
      record_type: "hcc-runtime-readiness-receipt",
      contract_version: "0.1-candidate.1",
      authority: "bounded-host-observation",
      platform: "desktop",
      mobile_os: "not-mobile",
      passed: 8,
      failed: 0,
      response_writer: "enabled-prototype-disposable-vault"
    });
    expect(report.checks).toHaveLength(8);
    expect(report.privacy).toEqual({ vault_name_disclosed: false, paths_disclosed: false, note_content_read: false, vault_scanned: false });
    expect(report.effects).toEqual({ filesystem_write: false, vault_mutation: false, network: false, canonical_apply: false });
    expect(JSON.stringify(report)).not.toContain("scratch-vault");
  });

  it("describes a mobile host while keeping the writer held outside the canary vault", () => {
    const report = buildRuntimeReadinessReport({
      ...completeDesktopInput,
      platform: { desktopUi: false, mobileUi: true, desktopApp: false, mobileApp: true, iosApp: false, androidApp: true },
      writerHostProfile: "public-current-vault"
    }, "2026-08-11T21:00:00.000Z");
    expect(report).toMatchObject({ platform: "mobile", mobile_os: "android", passed: 8, response_writer: "enabled-public-current-vault" });
  });

  it("surfaces missing primitives and incoherent platform flags without claiming readiness", () => {
    const report = buildRuntimeReadinessReport({
      ...completeDesktopInput,
      minimumApiSatisfied: false,
      platform: { ...completeDesktopInput.platform, mobileUi: true },
      webCryptoAvailable: false,
      clipboardAvailable: false
    }, "2026-08-11T21:00:00.000Z");
    expect(report.failed).toBe(4);
    expect(report.checks.filter((item) => !item.passed).map((item) => item.id)).toEqual(["minimum-api", "platform-mode", "web-crypto", "clipboard"]);
  });
});
