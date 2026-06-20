import {
  EVENTS,
  REGION_NAME,
  type RegionCode,
} from "./game";
import type { AuctionCue } from "./auction-animation";

export type EventImpact = {
  id: string;
  label: string;
  detail: string;
  direction: "up" | "down";
  percent: number;
};

export type LotteryDrawResult = {
  number: number;
  winnerTeamId: number | null;
  winnerName: string | null;
  pool: number;
  at: string;
};

export type ProjectionAnimationItem =
  | {
      kind: "lottery";
      id: string;
      result: LotteryDrawResult;
    }
  | {
      kind: "auction";
      id: string;
      cue: AuctionCue;
    };

export type ProjectionAnimationQueueState = {
  active: ProjectionAnimationItem | null;
  waiting: ProjectionAnimationItem[];
};

function multiplierPercent(multiplier: number): number {
  return Math.round(Math.abs(multiplier - 1) * 100);
}

function impactDirection(multiplier: number): EventImpact["direction"] {
  return multiplier > 1 ? "up" : "down";
}

export function formatEventImpacts(
  eventIndex: number,
  penaltyRegion: string | null,
): EventImpact[] {
  const event = EVENTS[eventIndex];
  if (!event) return [];

  const regionImpacts = Object.entries(event.regionMult).map(
    ([region, multiplier]) => ({
      id: `region-${region}-${multiplier}`,
      label: REGION_NAME[region as RegionCode],
      detail: "區域資產",
      direction: impactDirection(multiplier),
      percent: multiplierPercent(multiplier),
    }),
  );

  const typesByMultiplier = new Map<number, string[]>();
  for (const [type, multiplier] of Object.entries(event.typeMult)) {
    const types = typesByMultiplier.get(multiplier) ?? [];
    types.push(type);
    typesByMultiplier.set(multiplier, types);
  }
  const typeImpacts = [...typesByMultiplier.entries()].map(
    ([multiplier, types]) => ({
      id: `types-${multiplier}-${types.join("-")}`,
      label: types.join("、"),
      detail: "資產類型",
      direction: impactDirection(multiplier),
      percent: multiplierPercent(multiplier),
    }),
  );

  const penalty =
    event.hostPenaltyMult &&
    penaltyRegion &&
    penaltyRegion in REGION_NAME
      ? [
          {
            id: `host-penalty-${penaltyRegion}`,
            label: REGION_NAME[penaltyRegion as RegionCode],
            detail: "主持人指定區域",
            direction: "down" as const,
            percent: multiplierPercent(event.hostPenaltyMult),
          },
        ]
      : [];

  return [...regionImpacts, ...typeImpacts, ...penalty];
}

export type EventTickerEntry = {
  eventIndex: number;
  text: string;
};

export function buildEventTickerEntries(
  activeEvents: number[],
  penaltyRegion: string | null,
): EventTickerEntry[] {
  return [...activeEvents]
    .sort((a, b) => a - b)
    .flatMap((eventIndex) => {
      const event = EVENTS[eventIndex];
      if (!event) return [];
      const impactText = formatEventImpacts(eventIndex, penaltyRegion)
        .map(
          (impact) =>
            `${impact.label} ${impact.direction === "up" ? "▲" : "▼"}${impact.percent}%`,
        )
        .join(" · ");
      return [
        {
          eventIndex,
          text: `${event.name} ｜ ${event.news} ｜ ${impactText}`,
        },
      ];
    });
}

const ANIMATION_PRIORITY: Record<ProjectionAnimationItem["kind"], number> = {
  lottery: 0,
  auction: 1,
};

export function enqueueProjectionAnimations(
  waiting: ProjectionAnimationItem[],
  additions: ProjectionAnimationItem[],
): ProjectionAnimationItem[] {
  let next = [...waiting];

  for (const addition of additions) {
    if (next.some((item) => item.id === addition.id)) continue;

    if (addition.kind === "auction") {
      const { cue } = addition;
      const lotAlreadySold = next.some(
        (item) =>
          item.kind === "auction" &&
          item.cue.kind === "sold" &&
          item.cue.lotId === cue.lotId,
      );
      if (cue.kind === "bid" && lotAlreadySold) continue;

      next = next.filter(
        (item) =>
          !(
            item.kind === "auction" &&
            item.cue.kind === "bid" &&
            item.cue.lotId === cue.lotId
          ),
      );
    }

    next.push(addition);
  }

  return next
    .map((item, index) => ({ item, index }))
    .sort(
      (a, b) =>
        ANIMATION_PRIORITY[a.item.kind] -
          ANIMATION_PRIORITY[b.item.kind] || a.index - b.index,
    )
    .map(({ item }) => item);
}

export function addProjectionAnimations(
  state: ProjectionAnimationQueueState,
  additions: ProjectionAnimationItem[],
): ProjectionAnimationQueueState {
  const freshAdditions = additions.filter(
    (addition) => addition.id !== state.active?.id,
  );
  const waiting = enqueueProjectionAnimations(
    state.waiting,
    freshAdditions,
  );

  if (state.active || waiting.length === 0) {
    return { active: state.active, waiting };
  }

  return {
    active: waiting[0],
    waiting: waiting.slice(1),
  };
}

export function completeProjectionAnimation(
  state: ProjectionAnimationQueueState,
): ProjectionAnimationQueueState {
  return {
    active: state.waiting[0] ?? null,
    waiting: state.waiting.slice(1),
  };
}

export function buildLotteryAnimationItem(
  result: LotteryDrawResult,
): ProjectionAnimationItem {
  return {
    kind: "lottery",
    id: `lottery-${result.at}`,
    result,
  };
}

export function buildAuctionAnimationItem(
  cue: AuctionCue,
): ProjectionAnimationItem {
  return {
    kind: "auction",
    id: `auction-${cue.kind}-${cue.lotId}-${cue.amount}`,
    cue,
  };
}
