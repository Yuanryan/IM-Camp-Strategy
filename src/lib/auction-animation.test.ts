import { describe, expect, it } from "vitest";
import {
  detectAuctionCue,
  getAuctionStagePanelKeys,
  getAuctionStage,
  getHammerFrames,
  hasAuctionStarted,
  type AuctionAnimationSnapshot,
} from "./auction-animation";

const snapshot = (
  live: AuctionAnimationSnapshot["live"],
  recentlySold: AuctionAnimationSnapshot["recentlySold"] = [],
): AuctionAnimationSnapshot => ({ live, recentlySold });

describe("auction projection animation", () => {
  it("uses distinct sibling keys for the artwork and details of lot 22", () => {
    const keys = getAuctionStagePanelKeys(22);

    expect(keys.artwork).not.toBe(keys.details);
    expect(keys).toEqual({
      artwork: "auction-artwork-22",
      details: "auction-details-22",
    });
  });

  it("treats draft and cancelled lots as not started", () => {
    expect(hasAuctionStarted(["DRAFT", "CANCELLED"])).toBe(false);
  });

  it.each(["LIVE", "SOLD", "PASSED"])(
    "treats a %s lot as an already started auction",
    (status) => {
      expect(hasAuctionStarted(["DRAFT", status])).toBe(true);
    },
  );

  it("keeps the auction overlay hidden before the first lot starts", () => {
    expect(
      getAuctionStage({
        eventOpen: true,
        started: false,
        hasLiveLot: false,
        hasQueuedLots: true,
      }),
    ).toBe("hidden");
  });

  it("shows the live auction stage after Start next lot is pressed", () => {
    expect(
      getAuctionStage({
        eventOpen: true,
        started: true,
        hasLiveLot: true,
        hasQueuedLots: true,
      }),
    ).toBe("live");
  });

  it("keeps the overlay waiting between lots after the auction has started", () => {
    expect(
      getAuctionStage({
        eventOpen: true,
        started: true,
        hasLiveLot: false,
        hasQueuedLots: true,
      }),
    ).toBe("waiting");
  });

  it("removes the overlay when the auction event ends", () => {
    expect(
      getAuctionStage({
        eventOpen: false,
        started: true,
        hasLiveLot: false,
        hasQueuedLots: false,
      }),
    ).toBe("hidden");
  });

  it("removes the overlay after the final queued lot is finished", () => {
    expect(
      getAuctionStage({
        eventOpen: true,
        started: true,
        hasLiveLot: false,
        hasQueuedLots: false,
      }),
    ).toBe("hidden");
  });

  it("does not animate when the projection first loads", () => {
    const current = snapshot(
      { id: 7, title: "台積電股票", currentBid: 1_000 },
      [
        {
          id: 3,
          title: "舊拍賣品",
          winnerTeamName: "第 1 隊",
          finalPrice: 500,
          soldAt: "2026-06-20T10:00:00.000Z",
        },
      ],
    );

    expect(detectAuctionCue(null, current)).toBeNull();
  });

  it("plays one hammer strike when the bid increases on the same lot", () => {
    const previous = snapshot({ id: 7, title: "台積電股票", currentBid: 1_000 });
    const current = snapshot({ id: 7, title: "台積電股票", currentBid: 1_200 });

    expect(detectAuctionCue(previous, current)).toEqual({
      kind: "bid",
      lotId: 7,
      title: "台積電股票",
      amount: 1_200,
    });
    expect(getHammerFrames("bid").map((frame) => frame.pose)).toEqual([
      "raised",
      "struck",
    ]);
    expect(getHammerFrames("bid")[0].durationMs).toBe(480);
  });

  it("does not animate when a new lot merely becomes live", () => {
    const previous = snapshot(null);
    const current = snapshot({ id: 8, title: "神秘拍賣品", currentBid: 300 });

    expect(detectAuctionCue(previous, current)).toBeNull();
  });

  it("plays two hammer strikes when a new sale appears", () => {
    const previous = snapshot(
      { id: 7, title: "台積電股票", currentBid: 1_200 },
      [
        {
          id: 3,
          title: "舊拍賣品",
          winnerTeamName: "第 1 隊",
          finalPrice: 500,
          soldAt: "2026-06-20T10:00:00.000Z",
        },
      ],
    );
    const current = snapshot(null, [
      {
        id: 7,
        title: "台積電股票",
        winnerTeamName: "第 3 隊",
        finalPrice: 1_200,
        soldAt: "2026-06-20T10:05:00.000Z",
      },
      {
        id: 3,
        title: "舊拍賣品",
        winnerTeamName: "第 1 隊",
        finalPrice: 500,
        soldAt: "2026-06-20T10:00:00.000Z",
      },
    ]);

    expect(detectAuctionCue(previous, current)).toEqual({
      kind: "sold",
      lotId: 7,
      title: "台積電股票",
      amount: 1_200,
      winnerTeamName: "第 3 隊",
    });
    expect(getHammerFrames("sold").map((frame) => frame.pose)).toEqual([
      "raised",
      "struck",
      "raised",
      "struck",
    ]);
    expect(getHammerFrames("sold")[0].durationMs).toBe(480);
  });

  it("gives a new sale priority over a simultaneous bid change", () => {
    const previous = snapshot(
      { id: 7, title: "台積電股票", currentBid: 1_000 },
      [
        {
          id: 3,
          title: "舊拍賣品",
          winnerTeamName: "第 1 隊",
          finalPrice: 500,
          soldAt: "2026-06-20T10:00:00.000Z",
        },
      ],
    );
    const current = snapshot(
      { id: 7, title: "台積電股票", currentBid: 1_200 },
      [
        {
          id: 9,
          title: "黃仁勳簽名顯卡",
          winnerTeamName: "第 5 隊",
          finalPrice: 2_000,
          soldAt: "2026-06-20T10:05:00.000Z",
        },
        {
          id: 3,
          title: "舊拍賣品",
          winnerTeamName: "第 1 隊",
          finalPrice: 500,
          soldAt: "2026-06-20T10:00:00.000Z",
        },
      ],
    );

    expect(detectAuctionCue(previous, current)?.kind).toBe("sold");
  });

  it("does not replay an older sale when the latest hammer is undone", () => {
    const previous = snapshot(null, [
      {
        id: 7,
        title: "台積電股票",
        winnerTeamName: "第 3 隊",
        finalPrice: 1_200,
        soldAt: "2026-06-20T10:05:00.000Z",
      },
      {
        id: 3,
        title: "舊拍賣品",
        winnerTeamName: "第 1 隊",
        finalPrice: 500,
        soldAt: "2026-06-20T10:00:00.000Z",
      },
    ]);
    const afterUndo = snapshot(
      { id: 7, title: "台積電股票", currentBid: 1_200 },
      [
        {
          id: 3,
          title: "舊拍賣品",
          winnerTeamName: "第 1 隊",
          finalPrice: 500,
          soldAt: "2026-06-20T10:00:00.000Z",
        },
      ],
    );

    expect(detectAuctionCue(previous, afterUndo)).toBeNull();
  });
});
