import { describe, expect, it } from "vitest";

import {
  addProjectionAnimations,
  buildAuctionAnimationItem,
  buildEventTickerEntries,
  buildLotteryAnimationItem,
  completeProjectionAnimation,
  enqueueProjectionAnimations,
  formatEventImpacts,
  type ProjectionAnimationItem,
  type ProjectionAnimationQueueState,
} from "./projection-animation";

describe("projection event ticker helpers", () => {
  it("derives event one impacts from the game rules", () => {
    expect(formatEventImpacts(1, null)).toEqual([
      {
        id: "region-AURORA-1.25",
        label: "極光金域",
        detail: "區域資產",
        direction: "up",
        percent: 25,
      },
      {
        id: "region-HAVEN-0.9",
        label: "晨霧棲城",
        detail: "區域資產",
        direction: "down",
        percent: 10,
      },
      {
        id: "types-1.1-金融-商業-投資-商貿-展覽",
        label: "金融、商業、投資、商貿、展覽",
        detail: "資產類型",
        direction: "up",
        percent: 10,
      },
    ]);
  });

  it("adds the host-selected event four penalty", () => {
    expect(formatEventImpacts(4, "EMBER")).toContainEqual({
      id: "host-penalty-EMBER",
      label: "影焰工域",
      detail: "主持人指定區域",
      direction: "down",
      percent: 15,
    });
  });

  it("ignores an invalid event or penalty region", () => {
    expect(formatEventImpacts(99, null)).toEqual([]);
    expect(
      formatEventImpacts(4, "INVALID").some((impact) =>
        impact.id.startsWith("host-penalty"),
      ),
    ).toBe(false);
  });

  it("builds ticker text with event name, news, and calculated impacts", () => {
    expect(buildEventTickerEntries([1], null)).toEqual([
      {
        eventIndex: 1,
        text:
          "事件一：晨霧退散，資金湧入金域 ｜ 極光金域上漲，晨霧棲城下跌。 ｜ 極光金域 ▲25% · 晨霧棲城 ▼10% · 金融、商業、投資、商貿、展覽 ▲10%",
      },
    ]);
  });

  it("orders multiple active events by event number", () => {
    expect(
      buildEventTickerEntries([3, 1], null).map(
        (entry) => entry.eventIndex,
      ),
    ).toEqual([1, 3]);
  });

  it("includes the event four host-selected penalty", () => {
    expect(buildEventTickerEntries([4], "EMBER")[0]?.text).toContain(
      "影焰工域 ▼15%",
    );
  });

  it("ignores unknown active events", () => {
    expect(buildEventTickerEntries([99], null)).toEqual([]);
  });
});

const lotteryItem = (at: string): ProjectionAnimationItem => ({
  kind: "lottery",
  id: `lottery-${at}`,
  result: {
    number: 8,
    winnerTeamId: null,
    winnerName: null,
    pool: 2000,
    at,
  },
});

const auctionBid = (
  lotId: number,
  amount: number,
): ProjectionAnimationItem => ({
  kind: "auction",
  id: `auction-bid-${lotId}-${amount}`,
  cue: {
    kind: "bid",
    lotId,
    title: `Lot ${lotId}`,
    amount,
  },
});

const auctionSold = (
  lotId: number,
  amount: number,
): ProjectionAnimationItem => ({
  kind: "auction",
  id: `auction-sold-${lotId}-${amount}`,
  cue: {
    kind: "sold",
    lotId,
    title: `Lot ${lotId}`,
    amount,
    winnerTeamName: "第一隊",
  },
});

describe("projection animation queue", () => {
  it("orders waiting lottery animations before auction animations", () => {
    expect(
      enqueueProjectionAnimations(
        [auctionBid(1, 100)],
        [lotteryItem("2026-06-21T00:00:00.000Z")],
      ).map((item) => item.kind),
    ).toEqual(["lottery", "auction"]);
  });

  it("does not modify the animation that is already active", () => {
    const active = auctionBid(1, 100);
    const state: ProjectionAnimationQueueState = {
      active,
      waiting: [],
    };
    const lottery = lotteryItem("2026-06-21T00:00:00.000Z");
    const next = addProjectionAnimations(state, [lottery]);

    expect(next.active).toEqual(active);
    expect(next.waiting.map((item) => item.id)).toEqual([lottery.id]);
  });

  it("replaces an older waiting bid for the same lot", () => {
    expect(
      enqueueProjectionAnimations(
        [auctionBid(7, 100)],
        [auctionBid(7, 300)],
      ).map((item) => item.id),
    ).toEqual(["auction-bid-7-300"]);
  });

  it("removes waiting bids when the lot is sold", () => {
    expect(
      enqueueProjectionAnimations(
        [auctionBid(7, 300), auctionBid(8, 200)],
        [auctionSold(7, 500)],
      ).map((item) => item.id),
    ).toEqual(["auction-bid-8-200", "auction-sold-7-500"]);
  });

  it("deduplicates repeated snapshot signals", () => {
    const lottery = lotteryItem("2026-06-21T00:00:00.000Z");
    expect(
      enqueueProjectionAnimations([lottery], [lottery]).map(
        (item) => item.id,
      ),
    ).toEqual([lottery.id]);
  });

  it("starts the highest-priority item when the queue is idle", () => {
    const lottery = lotteryItem("2026-06-21T00:00:00.000Z");
    const next = addProjectionAnimations(
      { active: null, waiting: [] },
      [auctionBid(1, 100), lottery],
    );

    expect(next.active?.id).toBe(lottery.id);
    expect(next.waiting.map((item) => item.id)).toEqual([
      "auction-bid-1-100",
    ]);
  });

  it("advances to the next waiting animation after completion", () => {
    const next = completeProjectionAnimation({
      active: lotteryItem("2026-06-21T00:00:00.000Z"),
      waiting: [auctionBid(1, 100)],
    });

    expect(next.active?.kind).toBe("auction");
    expect(next.waiting).toEqual([]);
  });
});

describe("projection animation item builders", () => {
  it("builds a lottery animation id from the draw timestamp", () => {
    const result = {
      number: 8,
      winnerTeamId: null,
      winnerName: null,
      pool: 2000,
      at: "2026-06-21T00:00:00.000Z",
    };

    expect(buildLotteryAnimationItem(result)).toEqual({
      kind: "lottery",
      id: "lottery-2026-06-21T00:00:00.000Z",
      result,
    });
  });

  it("builds an auction animation id from its cue", () => {
    const cue = {
      kind: "bid" as const,
      lotId: 22,
      title: "黃仁勳簽名顯卡",
      amount: 500,
    };

    expect(buildAuctionAnimationItem(cue)).toEqual({
      kind: "auction",
      id: "auction-bid-22-500",
      cue,
    });
  });
});
