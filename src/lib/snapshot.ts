import { prisma } from "./db";
import {
  REGIONS,
  REGION_NAME,
  applyPropertyValue,
  currentValue,
  leveledValue,
  investedValue,
  parseActiveEvents,
  roundTo10,
  stackEffects,
  TOLL_RATE,
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
  currentValue: number;   // 市場現值（未含升級）＝購買 / 升級價的基準
  investedValue: number;  // 投入本金市值（買價+升級費，隨事件浮動）＝計入結算淨值
  leveledValue: number;   // 升級加成市值（×(1+0.5×level)）＝過路費計價基準
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
  toll: number; // 過路費（已含四捨五入到 10）
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
  // 執行期「停用驗證」旗標：client 用它決定是否要在 team API 夾 ?teamId=（見 withTeam）
  authDisabled: boolean;
  activeEvents: number[];
  event4Penalty: string | null;
  lottery: {
    period: number;
    pool: number;
    numbers: { number: number; teamId: number; teamName: string }[];
    // 最近一次開獎結果（投影頁據此重播開獎動畫）；null = 尚未開過獎
    lastDraw: {
      number: number;
      winnerTeamId: number | null;
      winnerName: string | null;
      pool: number;
      at: string; // ISO 時間字串，投影頁用來判斷是否為「新的一次開獎」
    } | null;
  };
  teams: TeamView[];
  properties: PropertyView[];
  regions: RegionView[];
  auction: AuctionSnapshot;
};

// 計算某區獨佔隊伍：需有 ≥1 棟三級 → 最多三級 → 再比總持有數 → 平手則無。
// 與 service.payToll 的獨佔判定一致（含三級門檻），否則投影顯示的獨佔/過路費會與實際收取不符。
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
  // 最低門檻：至少 1 棟三級不動產才可能獨佔。
  const ranked = [...stat.entries()]
    .filter(([, s]) => s.lvl3 >= 1)
    .sort((a, b) => b[1].lvl3 - a[1].lvl3 || b[1].total - a[1].total);
  if (ranked.length === 0) return null;
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
    investedValue: investedValue(p, activeEvents, event4Penalty),
    leveledValue: leveledValue(p, activeEvents, event4Penalty),
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

  // 各隊不動產淨值：用 investedValue（買價+升級費，隨事件浮動）＝玩家實際投入的市值。
  const teamPropValue = new Map<number, { count: number; value: number }>();
  for (const p of propViews) {
    if (p.ownerTeamId == null) continue;
    const s = teamPropValue.get(p.ownerTeamId) ?? { count: 0, value: 0 };
    s.count += 1;
    s.value += p.investedValue;
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
      // 顯示的過路費須與 service.payToll 計價一致：用 leveledValue（含升級加成）。
      const totalValue = regionProps
        .filter((p) => p.ownerTeamId === monopolyTeamId)
        .reduce((s, p) => s + p.leveledValue, 0);
      toll = roundTo10(totalValue * TOLL_RATE);
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
    // env 旗標或 DB 旗標任一開啟即視為停用驗證（client 據此夾 ?teamId=）。
    // 直接讀 env（不 import auth.ts，避免把 next/headers 依賴拉進來）。
    authDisabled:
      process.env.AUTH_DISABLED === "1" ||
      process.env.AUTH_DISABLED === "true" ||
      (state?.authDisabled ?? false),
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
      lastDraw:
        state?.lastDrawNumber != null && state.lastDrawAt
          ? {
              number: state.lastDrawNumber,
              winnerTeamId: state.lastDrawWinnerId,
              winnerName: state.lastDrawWinnerId ? (teamName.get(state.lastDrawWinnerId) ?? null) : null,
              pool: state.lastDrawPool ?? 0,
              at: state.lastDrawAt.toISOString(),
            }
          : null,
    },
    teams: teamViews,
    properties: propViews,
    regions: regionViews,
    auction,
  };
}
