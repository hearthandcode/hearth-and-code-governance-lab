import { describe, expect, it } from "vitest";

import { reorderRankedIds } from "../src/grammar";

describe("ranked choice reorder", () => {
  it("moves a dragged selection before its drop target without mutation", () => {
    const source = ["a", "b", "c", "d"];
    expect(reorderRankedIds(source, "d", "b")).toEqual(["a", "d", "b", "c"]);
    expect(source).toEqual(["a", "b", "c", "d"]);
  });

  it("fails closed to the original order for unknown or identical IDs", () => {
    expect(reorderRankedIds(["a", "b"], "missing", "b")).toEqual(["a", "b"]);
    expect(reorderRankedIds(["a", "b"], "a", "a")).toEqual(["a", "b"]);
  });
});
