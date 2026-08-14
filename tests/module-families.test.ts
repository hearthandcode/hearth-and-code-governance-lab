import { describe, expect, it } from "vitest";

import { CANDIDATE_INPUT_KINDS, INPUT_FAMILIES, auditInputFamilies, getInputFamily } from "../src/grammar";
import { HCC_VIEW_KINDS, VIEW_FAMILIES, auditViewFamilies, getViewFamily } from "../src/visualization";

describe("projectization module families", () => {
  it("assigns every current input kind to exactly one of six families", () => {
    expect(INPUT_FAMILIES).toHaveLength(6);
    expect(auditInputFamilies()).toEqual([]);
    expect(INPUT_FAMILIES.flatMap((family) => family.kinds)).toHaveLength(CANDIDATE_INPUT_KINDS.length);
    for (const kind of CANDIDATE_INPUT_KINDS) expect(getInputFamily(kind).kinds).toContain(kind);
  });

  it("assigns every current view kind to exactly one of eight families", () => {
    expect(VIEW_FAMILIES).toHaveLength(8);
    expect(auditViewFamilies()).toEqual([]);
    expect(VIEW_FAMILIES.flatMap((family) => family.kinds)).toHaveLength(HCC_VIEW_KINDS.length);
    for (const kind of HCC_VIEW_KINDS) expect(getViewFamily(kind).kinds).toContain(kind);
  });

  it("names a stable extraction target for every family", () => {
    const modules = [...INPUT_FAMILIES, ...VIEW_FAMILIES].map((family) => family.rendererModule);
    expect(new Set(modules).size).toBe(modules.length);
    expect(modules.every((path) => path.startsWith("ui/"))).toBe(true);
  });
});
