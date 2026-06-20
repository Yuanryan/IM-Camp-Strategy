import { describe, expect, it } from "vitest";

import {
  filterLotteryNumbersByPeriod,
  toLotteryNumberViews,
} from "./snapshot-helpers";

describe("filterLotteryNumbersByPeriod", () => {
  it("只保留目前期別的樂透號碼", () => {
    const numbers = [
      { id: 1, period: 1, number: 22 },
      { id: 2, period: 2, number: 22 },
      { id: 3, period: 2, number: 35 },
    ];

    expect(filterLotteryNumbersByPeriod(numbers, 2)).toEqual([
      { id: 2, period: 2, number: 22 },
      { id: 3, period: 2, number: 35 },
    ]);
  });

  it("保留資料列 ID，讓相同顯示號碼仍有不同 React key", () => {
    const teamNames = new Map([[1, "第一隊"]]);
    const numbers = [
      { id: 21, period: 1, number: 22, teamId: 1 },
      { id: 22, period: 1, number: 22, teamId: 1 },
    ];

    expect(toLotteryNumberViews(numbers, teamNames)).toEqual([
      { id: 21, number: 22, teamId: 1, teamName: "第一隊" },
      { id: 22, number: 22, teamId: 1, teamName: "第一隊" },
    ]);
  });
});
