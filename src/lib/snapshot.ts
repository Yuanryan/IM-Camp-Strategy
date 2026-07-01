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
  findMonopoly,
  evalObjectiveProgress,
  TASK_GOOD_CARDS,
  CURSE_CARDS,
  TOLL_RATE,
  havenAppreciationMult,
  parseMonopolySince,
  REGION_MONOPOLY_EFFECT,
  type RegionCode,
  type TaskKind as TaskKindT,
  type ObjectiveState,
  type MonopolyEffect,
} from "./game";
import { hasAuctionStarted } from "./auction-animation";
import {
  filterLotteryNumbersByPeriod,
  toLotteryNumberViews,
} from "./snapshot-helpers";
import { getTeamColorByIndex } from "./team-colors";

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
  ownerColor: string | null;
  ownerColorName: string | null;
  ownerColorText: string | null;
  ownerColorRing: string | null;
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

// 進行中的好運卡任務目標（含即時進度，供面板顯示）。進度由 game.evalObjectiveProgress 計算。
export type ObjectiveView = {
  id: number;
  cardName: string;
  taskKind: TaskKindT;
  current: number;
  target: number;
  done: boolean; // 已達標（下次回合結算將自動發獎）
  rewardCoins: number;
  description: string; // 任務說明（好運：TASK_GOOD_CARDS[].rewardText；詛咒：CURSE_CARDS[].taskText）
  isCurse: boolean;    // true = 詛咒卡（達標＝解咒 + 補償）
};

export type TeamView = {
  id: number;
  name: string;
  color: string;
  colorName: string;
  colorText: string;
  colorRing: string;
  coins: number;
  cardPoints: number;
  boardPos: number; // 棋子目前格 index（真實地圖中控用）
  propertyCount: number;
  propertyValue: number; // 持有不動產現值總和（含 PROPERTY_VALUE 動產加成）
  netWorth: number;      // coins + propertyValue（結算口徑，不含動產幣值）
  itemCount: number;
  items: ActiveItemView[];
  recentAttacks: string[]; // 最近被功能卡攻擊的通知訊息（時間窗內，新到舊）；小隊頁警示橫幅用
  objectives: ObjectiveView[]; // 進行中的好運卡任務目標（含進度）
  monopolyRegions: RegionCode[]; // 該隊目前獨佔的區碼（供頁面顯示獨佔被動徽章）
};

export type RegionView = {
  code: RegionCode;
  name: string;
  monopolyTeamId: number | null;
  monopolyTeamName: string | null;
  toll: number; // 過路費（已含四捨五入到 10）
  monopolyEffect: MonopolyEffect; // 該區獨佔被動效果類型
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
  eventId: number | null;
  announcement: string | null; // 來自未結束場次；team page 用它顯示發光橫幅
  eventName: string | null;
  started: boolean; // 第一件被開拍後維持 true，直到場次 ENDED
  queuedLotCount: number; // 尚未開始的 DRAFT 拍賣品數量
  live: AuctionLotView | null;
  recentlySold: {
    id: number;
    title: string;
    winnerTeamName: string;
    finalPrice: number;
    soldAt: string;
  }[];
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
    numbers: { id: number; number: number; teamId: number; teamName: string }[];
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
  settings: {
    auroraMultiplier: number;
    spectraCardPoints: number;
    havenApprIntervalMs: number;
    havenApprRate: number;
    houseIncomeRates: [number, number, number];
    cardRegionUpMult: number;
    cardRegionDownMult: number;
    cardBuildingUpMult: number;
    cardBuildingDownMult: number;
  };
};

// findMonopoly 已移至 game.ts（snapshot 與 service 共用單一事實來源），由 import 取得。

// 攻擊通知時間窗：被功能卡攻擊後，小隊頁警示橫幅顯示這麼久即自動淡出（輪詢 3s，足夠重現數次）。
const ATTACK_WINDOW_MS = 1_800_000;

export async function getSnapshot(): Promise<Snapshot> {
  const [state, teams, properties, lotteryNumbers, teamItems, auctionEvent, attackLogs, openObjectives, acceptedTrades, cardUseGroups, soldLotWins] =
    await Promise.all([
      prisma.gameState.findUnique({ where: { id: 1 } }),
      prisma.team.findMany({ orderBy: { id: "asc" } }),
      prisma.property.findMany({ orderBy: { id: "asc" } }),
      prisma.lotteryNumber.findMany(),
      // 凍結於 PENDING 交易中的動產（lockedTradeId 非 null）不算擁有者有效持有，排除
      prisma.teamItem.findMany({ where: { active: true, lockedTradeId: null }, include: { asset: true } }),
      prisma.auctionEvent.findFirst({
        where: { status: "OPEN" },
        orderBy: { id: "desc" },
        include: { lots: { orderBy: [{ orderIndex: "asc" }, { id: "asc" }] } },
      }),
      // 近期攻擊通知（時間窗內、未沖銷）
      prisma.ledger.findMany({
        where: { kind: "attack", reversed: false, createdAt: { gte: new Date(Date.now() - ATTACK_WINDOW_MS) } },
        orderBy: { id: "desc" },
      }),
      // 任務目標：進行中（completedAt null）；好運卡任務進度顯示用
      prisma.teamObjective.findMany({ where: { completedAt: null }, orderBy: { id: "asc" } }),
      // 各隊 ACCEPTED 交易（雙向計數，TRADE_N_TIMES 進度用）
      prisma.trade.findMany({ where: { status: "ACCEPTED" }, select: { fromTeamId: true, toTeamId: true } }),
      // 各隊出卡次數（USE_CARD_ON_TEAM 進度用）
      prisma.ledger.groupBy({ by: ["teamId"], where: { kind: "card_use" }, _count: { _all: true } }),
      // 各隊拍賣得標數（WIN_AUCTION_N 進度用）
      prisma.auctionLot.groupBy({ by: ["winnerTeamId"], where: { status: "SOLD" }, _count: { _all: true } }),
    ]);

  const activeEvents = parseActiveEvents(state?.activeEvents ?? "");
  const event4Penalty = state?.event4Penalty ?? null;
  const teamName = new Map(teams.map((t) => [t.id, t.name]));
  const teamColor = new Map(
    teams.map((team, index) => [team.id, getTeamColorByIndex(index)]),
  );
  const eventLots = auctionEvent?.lots ?? [];
  const liveLot = eventLots.find((lot) => lot.status === "LIVE") ?? null;
  const soldLots = eventLots
    .filter((lot) => lot.status === "SOLD")
    .sort((a, b) => (b.soldAt?.getTime() ?? 0) - (a.soldAt?.getTime() ?? 0))
    .slice(0, 5);
  const auctionStarted = hasAuctionStarted(eventLots.map((lot) => lot.status));
  const queuedLotCount = eventLots.filter((lot) => lot.status === "DRAFT").length;

  const now = Date.now();
  const monoSince = parseMonopolySince(state?.monopolySince ?? "");
  const havenOwner = monoSince.HAVEN ?? null;
  const havenLiveOf = (ownerTeamId: number | null): number =>
    havenOwner && ownerTeamId === havenOwner.teamId
      ? havenAppreciationMult(havenOwner.since, now, state?.havenApprIntervalMs ?? 60000, state?.havenApprRate ?? 0.01)
      : 1;

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
    ownerColor: p.ownerTeamId ? (teamColor.get(p.ownerTeamId)?.hex ?? null) : null,
    ownerColorName: p.ownerTeamId ? (teamColor.get(p.ownerTeamId)?.name ?? null) : null,
    ownerColorText: p.ownerTeamId ? (teamColor.get(p.ownerTeamId)?.text ?? null) : null,
    ownerColorRing: p.ownerTeamId ? (teamColor.get(p.ownerTeamId)?.ring ?? null) : null,
    currentValue: currentValue(p, activeEvents, event4Penalty, { havenLiveMult: havenLiveOf(p.ownerTeamId) }),
    investedValue: investedValue(p, activeEvents, event4Penalty, { havenLiveMult: havenLiveOf(p.ownerTeamId) }),
    leveledValue: leveledValue(p, activeEvents, event4Penalty, { havenLiveMult: havenLiveOf(p.ownerTeamId) }),
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

  // ── 好運卡任務進度所需的各隊計數 / 狀態 ──
  // ACCEPTED 交易（雙向）
  const tradeCountByTeam = new Map<number, number>();
  for (const tr of acceptedTrades) {
    tradeCountByTeam.set(tr.fromTeamId, (tradeCountByTeam.get(tr.fromTeamId) ?? 0) + 1);
    tradeCountByTeam.set(tr.toTeamId, (tradeCountByTeam.get(tr.toTeamId) ?? 0) + 1);
  }
  // 出卡次數
  const cardUseByTeam = new Map<number, number>();
  for (const g of cardUseGroups) {
    if (g.teamId != null) cardUseByTeam.set(g.teamId, g._count._all);
  }
  // 拍賣得標數
  const auctionWinsByTeam = new Map<number, number>();
  for (const g of soldLotWins) {
    if (g.winnerTeamId != null) auctionWinsByTeam.set(g.winnerTeamId, g._count._all);
  }
  // 各隊持有地數（依區）與三級數；以及各區獨佔隊（findMonopoly）。
  const propCountByTeamRegion = new Map<string, number>(); // key: `${teamId}:${region}`
  const level3ByTeam = new Map<number, number>();
  for (const p of propViews) {
    if (p.ownerTeamId == null) continue;
    const k = `${p.ownerTeamId}:${p.region}`;
    propCountByTeamRegion.set(k, (propCountByTeamRegion.get(k) ?? 0) + 1);
    if (p.level >= 3) level3ByTeam.set(p.ownerTeamId, (level3ByTeam.get(p.ownerTeamId) ?? 0) + 1);
  }
  const monopolyByTeam = new Map<number, RegionCode[]>();
  for (const r of REGIONS) {
    const owner = findMonopoly(propViews.filter((p) => p.region === r.code));
    if (owner != null) monopolyByTeam.set(owner, [...(monopolyByTeam.get(owner) ?? []), r.code]);
  }

  // 依某隊現況 + 進行中任務，算出 ObjectiveView[]（進度由 game.evalObjectiveProgress 計）。
  const objectivesByTeam = (teamId: number): ObjectiveView[] => {
    const open = openObjectives.filter((o) => o.teamId === teamId);
    if (open.length === 0) return [];
    return open.map((o) => {
      const region = (o.targetRegion as RegionCode | null) ?? null;
      const cur: ObjectiveState = {
        tradeCount: tradeCountByTeam.get(teamId) ?? 0,
        propertyCount: region
          ? (propCountByTeamRegion.get(`${teamId}:${region}`) ?? 0)
          : (teamPropValue.get(teamId)?.count ?? 0),
        level3Count: level3ByTeam.get(teamId) ?? 0,
        cardUseCount: cardUseByTeam.get(teamId) ?? 0,
        auctionWins: auctionWinsByTeam.get(teamId) ?? 0,
        monopolyRegions: monopolyByTeam.get(teamId) ?? [],
      };
      const baseline = {
        baseTradeCount: o.baseTradeCount,
        basePropertyCount: o.basePropertyCount,
        baseLevel3Count: o.baseLevel3Count,
        baseCardUseCount: o.baseCardUseCount,
        baseAuctionWins: o.baseAuctionWins,
        baseMonopolyRegions: (o.baseMonopolyRegions ? o.baseMonopolyRegions.split(",") : []) as RegionCode[],
      };
      const p = evalObjectiveProgress(
        o.taskKind as TaskKindT,
        { count: o.targetCount, region },
        baseline,
        cur,
      );
      const description = o.isCurse
        ? (CURSE_CARDS.find((c) => c.name === o.cardName)?.taskText ?? "")
        : (TASK_GOOD_CARDS.find((c) => c.name === o.cardName)?.rewardText ?? "");
      return { id: o.id, cardName: o.cardName, taskKind: o.taskKind as TaskKindT, current: p.current, target: p.target, done: p.done, rewardCoins: o.rewardCoins, description, isCurse: o.isCurse };
    });
  };

  const teamViews: TeamView[] = teams.map((t, index) => {
    const pv = teamPropValue.get(t.id) ?? { count: 0, value: 0 };
    const items = teamItemsMap.get(t.id) ?? [];
    const teamColor = getTeamColorByIndex(index);
    // PROPERTY_VALUE 效果：調整不動產顯示淨值（疊加遞減）
    const propDelta = stackEffects(
      items.filter((i) => i.effectType === "PROPERTY_VALUE").map((i) => i.effectValue),
    );
    const adjustedPropValue = applyPropertyValue(pv.value, propDelta);
    return {
      id: t.id,
      name: t.name,
      color: teamColor.hex,
      colorName: teamColor.name,
      colorText: teamColor.text,
      colorRing: teamColor.ring,
      coins: t.coins,
      cardPoints: t.cardPoints,
      boardPos: t.boardPos,
      propertyCount: pv.count,
      propertyValue: adjustedPropValue,
      netWorth: t.coins + adjustedPropValue,
      itemCount: items.length,
      items,
      recentAttacks: attacksByTeam.get(t.id) ?? [],
      objectives: objectivesByTeam(t.id),
      monopolyRegions: monopolyByTeam.get(t.id) ?? [],
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
      monopolyEffect: REGION_MONOPOLY_EFFECT[r.code as RegionCode],
    };
  });

  const auction: AuctionSnapshot = {
    eventId: auctionEvent?.id ?? null,
    announcement: auctionEvent?.announcement ? auctionEvent.announcement : null,
    eventName: auctionEvent?.name ?? null,
    started: auctionStarted,
    queuedLotCount,
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
      id: l.id,
      title: l.title,
      winnerTeamName: l.winnerTeamId ? (teamName.get(l.winnerTeamId) ?? `#${l.winnerTeamId}`) : "—",
      finalPrice: l.finalPrice ?? 0,
      soldAt: (l.soldAt ?? l.createdAt).toISOString(),
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
      numbers: toLotteryNumberViews(
        filterLotteryNumbersByPeriod(
          lotteryNumbers,
          state?.lotteryPeriod ?? 1,
        ),
        teamName,
      )
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
    settings: {
      auroraMultiplier: state?.auroraMultiplier ?? 1.5,
      spectraCardPoints: state?.spectraCardPoints ?? 10,
      havenApprIntervalMs: state?.havenApprIntervalMs ?? 60000,
      havenApprRate: state?.havenApprRate ?? 0.01,
      houseIncomeRates: [state?.houseIncomeL1 ?? 0.03, state?.houseIncomeL2 ?? 0.05, state?.houseIncomeL3 ?? 0.08] as [number, number, number],
      cardRegionUpMult: state?.cardRegionUpMult ?? 1.3,
      cardRegionDownMult: state?.cardRegionDownMult ?? 0.75,
      cardBuildingUpMult: state?.cardBuildingUpMult ?? 1.3,
      cardBuildingDownMult: state?.cardBuildingDownMult ?? 0.75,
    },
  };
}
