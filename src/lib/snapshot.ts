import { prisma } from "./db";
import {
  REGIONS,
  REGION_NAME,
  applyPropertyValue,
  currentValue,
  parseActiveEvents,
  roundTo50,
  stackEffects,
  type RegionCode,
} from "./game";

export type PropertyView = {
  id: number;
  name: string;
  region: RegionCode;
  regionName: string;
  type: string;
  basePrice: number;
  level: number;
  ownerTeamId: number | null;
  ownerName: string | null;
  currentValue: number; // 已售出才有意義；未售出顯示為現價參考
};

export type ActiveItemView = {
  id: number;       // TeamItem id
  assetId: number;
  name: string;
  grade: string;
  effectType: string;
  effectValue: number;
  condition: string | null;
  description: string;
  usesRemaining: number | null; // null = 永久
  markTeamId: number | null;    // 海盜旗鎖定目標（PIRACY）
};

export type TeamView = {
  id: number;
  name: string;
  coins: number;
  cardPoints: number;
  propertyCount: number;
  propertyValue: number; // 持有不動產現值總和（含 PROPERTY_VALUE 動產加成）
  netWorth: number;      // coins + propertyValue（結算口徑，不含動產幣值）
  itemCount: number;
  items: ActiveItemView[];
  recentAttacks: string[]; // 最近被功能卡攻擊的通知訊息（時間窗內，新到舊）；小隊頁警示橫幅用
};

export type RegionView = {
  code: RegionCode;
  name: string;
  monopolyTeamId: number | null;
  monopolyTeamName: string | null;
  toll: number; // 過路費（已含四捨五入到 50）
};

export type AuctionLotView = {
  id: number;
  title: string;
  description: string;
  lotType: string;
  startPrice: number;
  currentBid: number;
};

export type AuctionSnapshot = {
  announcement: string | null; // 來自未結束場次；team page 用它顯示發光橫幅
  eventName: string | null;
  live: AuctionLotView | null;
  recentlySold: { title: string; winnerTeamName: string; finalPrice: number }[];
};

export type Snapshot = {
  phase: string;
  activeEvents: number[];
  event4Penalty: string | null;
  lottery: {
    period: number;
    pool: number;
    numbers: { number: number; teamId: number; teamName: string }[];
  };
  teams: TeamView[];
  properties: PropertyView[];
  regions: RegionView[];
  auction: AuctionSnapshot;
};

// 計算某區獨佔隊伍：最多三級 → 再比總持有數 → 平手則無
function findMonopoly(
  regionProps: { ownerTeamId: number | null; level: number }[],
): number | null {
  const stat = new Map<number, { lvl3: number; total: number }>();
  for (const p of regionProps) {
    if (p.ownerTeamId == null) continue;
    const s = stat.get(p.ownerTeamId) ?? { lvl3: 0, total: 0 };
    s.total += 1;
    if (p.level >= 3) s.lvl3 += 1;
    stat.set(p.ownerTeamId, s);
  }
  if (stat.size === 0) return null;
  const ranked = [...stat.entries()].sort(
    (a, b) => b[1].lvl3 - a[1].lvl3 || b[1].total - a[1].total,
  );
  if (ranked.length === 1) return ranked[0][0];
  const [first, second] = ranked;
  // 第一名需嚴格大於第二名（三級數或總持有數）才算獨佔
  if (first[1].lvl3 === second[1].lvl3 && first[1].total === second[1].total) {
    return null;
  }
  return first[0];
}

// 攻擊通知時間窗：被功能卡攻擊後，小隊頁警示橫幅顯示這麼久即自動淡出（輪詢 3s，足夠重現數次）。
const ATTACK_WINDOW_MS = 1_800_000;

export async function getSnapshot(): Promise<Snapshot> {
  const [state, teams, properties, lotteryNumbers, teamItems, auctionEvent, liveLot, soldLots, attackLogs] =
    await Promise.all([
      prisma.gameState.findUnique({ where: { id: 1 } }),
      prisma.team.findMany({ orderBy: { id: "asc" } }),
      prisma.property.findMany({ orderBy: { id: "asc" } }),
      prisma.lotteryNumber.findMany(),
      // 凍結於 PENDING 交易中的動產（lockedTradeId 非 null）不算擁有者有效持有，排除
      prisma.teamItem.findMany({ where: { active: true, lockedTradeId: null }, include: { asset: true } }),
      prisma.auctionEvent.findFirst({ where: { status: "OPEN" }, orderBy: { id: "desc" } }),
      prisma.auctionLot.findFirst({ where: { status: "LIVE" }, orderBy: { id: "desc" } }),
      prisma.auctionLot.findMany({
        where: { status: "SOLD" },
        orderBy: { soldAt: "desc" },
        take: 5,
      }),
      // 近期攻擊通知（時間窗內、未沖銷）
      prisma.ledger.findMany({
        where: { kind: "attack", reversed: false, createdAt: { gte: new Date(Date.now() - ATTACK_WINDOW_MS) } },
        orderBy: { id: "desc" },
      }),
    ]);

  const activeEvents = parseActiveEvents(state?.activeEvents ?? "");
  const event4Penalty = state?.event4Penalty ?? null;
  const teamName = new Map(teams.map((t) => [t.id, t.name]));

  const propViews: PropertyView[] = properties.map((p) => ({
    id: p.id,
    name: p.name,
    region: p.region as RegionCode,
    regionName: REGION_NAME[p.region as RegionCode],
    type: p.type,
    basePrice: p.basePrice,
    level: p.level,
    ownerTeamId: p.ownerTeamId,
    ownerName: p.ownerTeamId ? (teamName.get(p.ownerTeamId) ?? null) : null,
    currentValue: currentValue(p, activeEvents, event4Penalty),
  }));

  // 各隊動產效果（按隊伍分組，不含 hiddenValue）
  const teamItemsMap = new Map<number, ActiveItemView[]>();
  for (const item of teamItems) {
    const list = teamItemsMap.get(item.teamId) ?? [];
    list.push({
      id: item.id,
      assetId: item.assetId,
      name: item.asset.name,
      grade: item.asset.grade,
      effectType: item.asset.effectType,
      effectValue: item.asset.effectValue,
      condition: item.asset.condition,
      description: item.asset.description,
      usesRemaining: item.usesRemaining,
      markTeamId: item.markTeamId,
    });
    teamItemsMap.set(item.teamId, list);
  }

  // 各隊近期攻擊通知（新到舊；ledger 已 orderBy id desc）
  const attacksByTeam = new Map<number, string[]>();
  for (const a of attackLogs) {
    if (a.teamId == null || !a.note) continue;
    const list = attacksByTeam.get(a.teamId) ?? [];
    list.push(a.note);
    attacksByTeam.set(a.teamId, list);
  }

  // 各隊不動產現值
  const teamPropValue = new Map<number, { count: number; value: number }>();
  for (const p of propViews) {
    if (p.ownerTeamId == null) continue;
    const s = teamPropValue.get(p.ownerTeamId) ?? { count: 0, value: 0 };
    s.count += 1;
    s.value += p.currentValue;
    teamPropValue.set(p.ownerTeamId, s);
  }

  const teamViews: TeamView[] = teams.map((t) => {
    const pv = teamPropValue.get(t.id) ?? { count: 0, value: 0 };
    const items = teamItemsMap.get(t.id) ?? [];
    // PROPERTY_VALUE 效果：調整不動產顯示淨值（疊加遞減）
    const propDelta = stackEffects(
      items.filter((i) => i.effectType === "PROPERTY_VALUE").map((i) => i.effectValue),
    );
    const adjustedPropValue = applyPropertyValue(pv.value, propDelta);
    return {
      id: t.id,
      name: t.name,
      coins: t.coins,
      cardPoints: t.cardPoints,
      propertyCount: pv.count,
      propertyValue: adjustedPropValue,
      netWorth: t.coins + adjustedPropValue,
      itemCount: items.length,
      items,
      recentAttacks: attacksByTeam.get(t.id) ?? [],
    };
  });

  // 各區獨佔與過路費
  const regionViews: RegionView[] = REGIONS.map((r) => {
    const regionProps = propViews.filter((p) => p.region === r.code);
    const monopolyTeamId = findMonopoly(regionProps);
    let toll = 0;
    if (monopolyTeamId != null) {
      const totalValue = regionProps
        .filter((p) => p.ownerTeamId === monopolyTeamId)
        .reduce((s, p) => s + p.currentValue, 0);
      toll = roundTo50(totalValue * 0.1);
    }
    return {
      code: r.code,
      name: r.name,
      monopolyTeamId,
      monopolyTeamName: monopolyTeamId ? (teamName.get(monopolyTeamId) ?? null) : null,
      toll,
    };
  });

  const auction: AuctionSnapshot = {
    announcement: auctionEvent?.announcement ? auctionEvent.announcement : null,
    eventName: auctionEvent?.name ?? null,
    live: liveLot
      ? {
          id: liveLot.id,
          title: liveLot.title,
          description: liveLot.description,
          lotType: liveLot.lotType,
          startPrice: liveLot.startPrice,
          currentBid: liveLot.currentBid,
        }
      : null,
    recentlySold: soldLots.map((l) => ({
      title: l.title,
      winnerTeamName: l.winnerTeamId ? (teamName.get(l.winnerTeamId) ?? `#${l.winnerTeamId}`) : "—",
      finalPrice: l.finalPrice ?? 0,
    })),
  };

  return {
    phase: state?.phase ?? "SETUP",
    activeEvents,
    event4Penalty,
    lottery: {
      period: state?.lotteryPeriod ?? 1,
      pool: state?.lotteryPool ?? 0,
      numbers: lotteryNumbers
        .map((n) => ({
          number: n.number,
          teamId: n.teamId,
          teamName: teamName.get(n.teamId) ?? `#${n.teamId}`,
        }))
        .sort((a, b) => a.number - b.number),
    },
    teams: teamViews,
    properties: propViews,
    regions: regionViews,
    auction,
  };
}
