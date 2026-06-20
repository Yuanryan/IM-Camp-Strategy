import { describe, expect, it } from "vitest";

import {
  getProjectionLevelTier,
  getProjectionRankTier,
} from "./projection-dashboard";

describe("projection dashboard visual tiers", () => {
  it("gives the top three ranks distinct arena treatments", () => {
    expect(getProjectionRankTier(0)).toBe("rgb");
    expect(getProjectionRankTier(1)).toBe("gold");
    expect(getProjectionRankTier(2)).toBe("silver");
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
});
