import { describe, expect, it } from "vitest";

import {
  getProjectionLevelTier,
  getProjectionNameVisualWidth,
  getProjectionRankNameScale,
  getProjectionRankTier,
} from "./projection-dashboard";

describe("projection dashboard visual tiers", () => {
  it("gives the top three ranks distinct arena treatments", () => {
    expect(getProjectionRankTier(0)).toBe("gold");
    expect(getProjectionRankTier(1)).toBe("silver");
    expect(getProjectionRankTier(2)).toBe("bronze");
    expect(getProjectionRankTier(3)).toBe("standard");
    expect(getProjectionRankTier(9)).toBe("standard");
  });

  it("increases the light treatment with property level", () => {
    expect(getProjectionLevelTier(0)).toBe("none");
    expect(getProjectionLevelTier(1)).toBe("lit");
    expect(getProjectionLevelTier(2)).toBe("boosted");
    expect(getProjectionLevelTier(3)).toBe("max");
    expect(getProjectionLevelTier(9)).toBe("max");
  });

  it("keeps short team names at full name size", () => {
    expect(getProjectionRankNameScale("胃十道逆流")).toBe(1); // 視覺寬 5
    expect(getProjectionRankNameScale("維積分小蔡")).toBe(1); // 視覺寬 6
  });

  it("shrinks longer CJK team names below full size", () => {
    const scale = getProjectionRankNameScale("維積分小蔡一碟"); // 視覺寬 7
    expect(scale).toBeLessThan(1);
    expect(scale).toBeGreaterThan(0.62);
  });

  it("floors very long names at the minimum scale", () => {
    const scale = getProjectionRankNameScale("蘇per idol就是你今晚的2孟"); // 長名
    expect(scale).toBe(0.62);
  });

  it("measures half-width letters/digits/spaces as half a CJK glyph", () => {
    // 「404 not found」= 13 個半形字元 → 視覺寬 6.5，只略縮，不會掉到最小值。
    expect(getProjectionNameVisualWidth("404 not found")).toBe(6.5);
    const scale = getProjectionRankNameScale("404 not found");
    expect(scale).toBeGreaterThan(0.9); // 只微縮，仍接近滿版
    expect(scale).toBeLessThan(1);
  });

  it("treats a full CJK name as one visual unit per character", () => {
    expect(getProjectionNameVisualWidth("醉翁紫意不")).toBe(5); // 5 個全形字
    expect(getProjectionRankNameScale("醉翁紫意不")).toBe(1);
  });
});
