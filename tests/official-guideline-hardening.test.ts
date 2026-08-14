import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");

describe("official Obsidian guideline hardening", () => {
  it("builds a minified production bundle and avoids redundant command identity", () => {
    const build = read("esbuild.config.mjs");
    const main = read("src/main.ts");
    const releaseCheck = read("scripts/validate-release-candidate.mjs");
    expect(build).toContain("minify: production");
    expect(releaseCheck).toContain('official_contract_checked: "2026-08-12"');
    expect(main).not.toContain("Focus next HCC widget");
    expect(main).not.toContain("Focus previous HCC widget");
    expect(main).not.toContain("Return from HCC widget to source");
  });

  it("reconstructs the disposable manifest from the declared development projection", () => {
    const cleanRoom = read("scripts/verify-clean-room.mjs");
    expect(cleanRoom).toContain('config/development-install.json');
    expect(cleanRoom).toContain("expectedBuiltManifest = { ...rootManifest, ...developmentInstall.manifestOverrides }");
    expect(cleanRoom).toContain("builtManifest.id !== developmentInstall.directoryId");
    expect(cleanRoom).not.toContain("rootManifest !== builtManifest");
  });

  it("keeps runtime presentation out of JavaScript style assignments", () => {
    const radar = read("src/extensions/radar.ts");
    const expansion = read("src/visualization/render-expansion.ts");
    const css = read("styles.css");
    expect(`${radar}\n${expansion}`).not.toContain(".style.");
    expect(radar).toContain("polygon.dataset.seriesIndex");
    expect(radar).toContain("item.dataset.seriesIndex");
    expect(expansion).toContain("cell.dataset.opacityLevel");
    for (let index = 0; index < 8; index += 1) expect(css).toContain(`[data-series-index="${index}"]`);
    for (let level = 1; level <= 8; level += 1) expect(css).toContain(`[data-opacity-level="${level}"]`);
  });

  it("binds session presentation and dashboard creation to owning documents", () => {
    const main = read("src/main.ts");
    const dashboard = read("src/obsidian/dashboard-view.ts");
    const workbook = read("src/workbook/render.ts");
    expect(main).not.toContain("document.body");
    expect(main).not.toContain("globalThis.crypto");
    expect(main).not.toContain("detachLeavesOfType");
    expect(main).toContain("activeWindow.crypto");
    expect(main).toContain("this.app.workspace.containerEl.ownerDocument");
    expect(main).toContain("retainPresentationDocument(el.ownerDocument)");
    expect(main).toContain("presentationDocuments = new Map<Document, number>()");
    expect(main).toContain("presentationContainers = new Set<HTMLElement>()");
    expect(main).toContain("for (const container of this.presentationContainers) this.applyRenderPreferences(container)");
    expect(dashboard).toContain("this.contentEl.ownerDocument");
    expect(dashboard).not.toContain("document.createElement");
    expect(workbook).toContain("copy.ownerDocument.defaultView");
    expect(workbook).toContain("presentationScope.querySelectorAll");
  });
});
