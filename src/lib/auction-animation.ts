export type AuctionAnimationSnapshot = {
  live: {
    id: number;
    title: string;
    currentBid: number;
  } | null;
  recentlySold: {
    id: number;
    title: string;
    winnerTeamName: string;
    finalPrice: number;
    soldAt: string;
  }[];
};

export type AuctionCue =
  | {
      kind: "bid";
      lotId: number;
      title: string;
      amount: number;
    }
  | {
      kind: "sold";
      lotId: number;
      title: string;
      amount: number;
      winnerTeamName: string;
    };

export type HammerFrame = {
  pose: "raised" | "struck";
  durationMs: number;
};

export type AuctionStage = "hidden" | "live" | "waiting";

export function getAuctionStagePanelKeys(liveId: number | null) {
  const suffix = liveId ?? "waiting";
  return {
    artwork: `auction-artwork-${suffix}`,
    details: `auction-details-${suffix}`,
  };
}

export function hasAuctionStarted(statuses: string[]): boolean {
  return statuses.some((status) => ["LIVE", "SOLD", "PASSED"].includes(status));
}

export function getAuctionStage({
  eventOpen,
  started,
  hasLiveLot,
  hasQueuedLots,
}: {
  eventOpen: boolean;
  started: boolean;
  hasLiveLot: boolean;
  hasQueuedLots: boolean;
}): AuctionStage {
  if (!eventOpen || !started) return "hidden";
  if (hasLiveLot) return "live";
  return hasQueuedLots ? "waiting" : "hidden";
}

const BID_FRAMES: HammerFrame[] = [
  { pose: "raised", durationMs: 480 },
  { pose: "struck", durationMs: 420 },
];

const SOLD_FRAMES: HammerFrame[] = [
  { pose: "raised", durationMs: 480 },
  { pose: "struck", durationMs: 220 },
  { pose: "raised", durationMs: 160 },
  { pose: "struck", durationMs: 440 },
];

export function getHammerFrames(kind: AuctionCue["kind"]): HammerFrame[] {
  return kind === "sold" ? SOLD_FRAMES : BID_FRAMES;
}

export function detectAuctionCue(
  previous: AuctionAnimationSnapshot | null,
  current: AuctionAnimationSnapshot,
): AuctionCue | null {
  if (!previous) return null;

  const sold = current.recentlySold[0];
  const previousSold = previous.recentlySold[0] ?? null;
  const soldIsNewer =
    sold &&
    (!previousSold ||
      new Date(sold.soldAt).getTime() > new Date(previousSold.soldAt).getTime());
  if (sold && sold.id !== previousSold?.id && soldIsNewer) {
    return {
      kind: "sold",
      lotId: sold.id,
      title: sold.title,
      amount: sold.finalPrice,
      winnerTeamName: sold.winnerTeamName,
    };
  }

  if (
    previous.live &&
    current.live &&
    previous.live.id === current.live.id &&
    current.live.currentBid > previous.live.currentBid
  ) {
    return {
      kind: "bid",
      lotId: current.live.id,
      title: current.live.title,
      amount: current.live.currentBid,
    };
  }

  return null;
}
