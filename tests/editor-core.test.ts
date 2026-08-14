import { describe, expect, it } from "vitest";

import {
  fenceIsBeingEdited,
  fenceIsVisible,
  scanHccInteractionFences
} from "../src/editor/fences";
import { findDirectionalFence } from "../src/editor/navigation";

describe("Live Preview fence scanning", () => {
  it("finds complete backtick and tilde interaction fences with exact YAML", () => {
    const document = [
      "Before",
      "```hcc-interaction",
      "version: '0.1'",
      "prompt: First",
      "```",
      "Between",
      "~~~  hcc-interaction  ",
      "prompt: Second",
      "~~~~",
      "After"
    ].join("\n");

    const fences = scanHccInteractionFences(document);

    expect(fences).toHaveLength(2);
    expect(fences.map((fence) => fence.source)).toEqual([
      "version: '0.1'\nprompt: First",
      "prompt: Second"
    ]);
    expect(fences.map((fence) => fence.language)).toEqual(["hcc-interaction", "hcc-interaction"]);
    expect(document.slice(fences[0].from, fences[0].to)).toContain("```hcc-interaction");
  });

  it("supports CRLF without leaking line endings into source", () => {
    const fences = scanHccInteractionFences(
      "```hcc-interaction\r\nprompt: Hello\r\n```\r\n"
    );

    expect(fences).toHaveLength(1);
    expect(fences[0].source).toBe("prompt: Hello");
  });

  it("leaves unsupported and incomplete fences as source", () => {
    const document = [
      "    ```hcc-interaction",
      "ignored: indented",
      "    ```",
      "```hcc-interaction extra",
      "ignored: suffix",
      "```",
      "```hcc-interaction",
      "ignored: incomplete"
    ].join("\n");

    expect(scanHccInteractionFences(document)).toEqual([]);
  });

  it("finds declarative view fences for the same Live Preview lifecycle", () => {
    const fences = scanHccInteractionFences("```hcc-view\nkind: metric\n```");
    expect(fences).toHaveLength(1);
    expect(fences[0]).toMatchObject({ language: "hcc-view", source: "kind: metric" });
  });

  it("finds worksheet and workbook composition fences", () => {
    const fences = scanHccInteractionFences("```hcc-form\nid: worksheet\n```\n```hcc-workbook\nid: workbook\n```");
    expect(fences.map((fence) => fence.language)).toEqual(["hcc-form", "hcc-workbook"]);
  });

  it("finds selected extension fences without broad Markdown interception", () => {
    const fences = scanHccInteractionFences("```hcc-computed-field\nid: score\n```\n```hcc-radar-view\nid: lenses\n```");
    expect(fences.map((fence) => fence.language)).toEqual(["hcc-computed-field", "hcc-radar-view"]);
  });

  it("finds the proposal-only schema and workflow studio fence", () => {
    const fences = scanHccInteractionFences("```hcc-studio\nversion: 0.1-candidate.1\n```");
    expect(fences).toHaveLength(1);
    expect(fences[0]).toMatchObject({ language: "hcc-studio", source: "version: 0.1-candidate.1" });
  });

  it("recognizes provider-neutral exchange fences", () => {
    const fences = scanHccInteractionFences("```hcc-exchange\nversion: 0.1-candidate.1\n```");
    expect(fences).toHaveLength(1);
    expect(fences[0]).toMatchObject({ language: "hcc-exchange", source: "version: 0.1-candidate.1" });
  });

  it("reveals a fence whenever any selection touches it", () => {
    const [fence] = scanHccInteractionFences("A\n```hcc-interaction\nx: 1\n```\nB");

    expect(fenceIsBeingEdited(fence, [{ from: fence.from, to: fence.from }])).toBe(true);
    expect(fenceIsBeingEdited(fence, [{ from: 0, to: 0 }])).toBe(false);
  });

  it("renders only fences intersecting a visible range", () => {
    const fences = scanHccInteractionFences([
      "```hcc-interaction",
      "prompt: One",
      "```",
      "space",
      "```hcc-interaction",
      "prompt: Two",
      "```"
    ].join("\n"));

    expect(fenceIsVisible(fences[0], [{ from: 0, to: fences[0].to }])).toBe(true);
    expect(fenceIsVisible(fences[1], [{ from: 0, to: fences[0].to }])).toBe(false);
  });
});

describe("explicit widget navigation", () => {
  const fences = [
    { from: 10, to: 20 },
    { from: 40, to: 50 },
    { from: 80, to: 90 }
  ];

  it("moves next from editor position and wraps", () => {
    expect(findDirectionalFence(fences, 21, "next")?.from).toBe(40);
    expect(findDirectionalFence(fences, 100, "next")?.from).toBe(10);
  });

  it("moves previous from editor position and wraps", () => {
    expect(findDirectionalFence(fences, 79, "previous")?.from).toBe(40);
    expect(findDirectionalFence(fences, 5, "previous")?.from).toBe(80);
  });

  it("moves relative to a focused widget", () => {
    expect(findDirectionalFence(fences, 10, "next", 10)?.from).toBe(40);
    expect(findDirectionalFence(fences, 10, "previous", 10)?.from).toBe(80);
  });

  it("reports no target for an empty note", () => {
    expect(findDirectionalFence([], 0, "next")).toBeNull();
  });
});
