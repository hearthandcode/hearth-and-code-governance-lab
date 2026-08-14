import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const main = readFileSync(resolve(root, "src/main.ts"), "utf8");
const dashboard = readFileSync(resolve(root, "src/obsidian/dashboard-view.ts"), "utf8");
const smoke = readFileSync(resolve(root, "scripts/smoke-bundle-load.mjs"), "utf8");

describe("plugin lifecycle cleanup contract", () => {
  it("clears all plugin-owned global and in-memory state on unload", () => {
    const unload = main.slice(main.indexOf("override onunload(): void {"), main.indexOf("private toggleEmberCircuitPresentation"));
    expect(unload).toContain("this.responsePackets.clearPending()");
    expect(unload).toContain("this.interactionRefreshers.clear()");
    expect(unload).not.toContain("detachLeavesOfType");
    expect(unload).toContain('classList.remove("hcc-plugin-ember-circuit-session")');
  });

  it("registers dashboard metadata observation through the host disposable registry", () => {
    expect(dashboard).toContain('this.registerEvent(this.app.metadataCache.on("changed"');
    expect(dashboard).not.toMatch(/document\.addEventListener|window\.addEventListener/);
  });

  it("binds rendered interaction refreshers to Markdown child disposal", () => {
    expect(main).toContain("this.addRenderChild(context, el, dispose)");
    expect(main).toContain("const releaseContainer = this.retainPresentationContainer(el)");
    expect(main).toContain("context.addChild(new HccViewRenderChild(el, () => { dispose(); releaseContainer(); releasePresentation(); }))");
    expect(main).toContain("this.presentationContainers.delete(container)");
    expect(main).toContain("refreshers.delete(refresh)");
    expect(main).toContain("this.interactionRefreshers.delete(sourcePath)");
  });

  it("requires generated-bundle unload assertions", () => {
    for (const signal of ["pendingPreviewsCleared", "plugin.interactionRefreshers.size", "detachedViews.length !== 0", "Ember Circuit session class survived plugin unload"]) {
      expect(smoke, signal).toContain(signal);
    }
  });
});
