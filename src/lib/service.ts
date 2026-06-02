import { prisma } from "./db";
import { Prisma } from "@/generated/prisma";
import {
  EVENTS,
  REGION_NAME,
  currentValue,
  lotteryFee,
  parseActiveEvents,
  roundTo50,
  upgradeFee,
  type RegionCode,
} from "./game";

type Tx = Prisma.TransactionClient;

async function logLedger(
  tx: Tx,
  data: {
    teamId?: number | null;
    kind: string;
    delta?: number;
    note?: string;
    byToken?: string;
  },
) {
  await tx.ledger.create({
    data: {
      teamId: data.teamId ?? null,
      kind: data.kind,
      delta: data.delta ?? 0,
      note: data.note,
      byToken: data.byToken,
    },
  });
}

async function getState(tx: Tx) {
  const s = await tx.gameState.findUnique({ where: { id: 1 } });
  if (!s) throw new Error("遊戲狀態未初始化，請先執行 seed");
  return s;
}

// ── 餘額調整（光幣 / 卡牌點數）──────────────────────────────
export async function adjustBalance(params: {
  teamId: number;
  coins?: number;
  cardPoints?: number;
  kind?: string;
  note?: string;
  byToken?: string;
}) {
  const { teamId, coins = 0, cardPoints = 0, kind = "coins", note, byToken } = params;
  if (coins === 0 && cardPoints === 0) throw new Error("沒有任何變動");
  return prisma.$transaction(async (tx) => {
    const team = await tx.team.findUnique({ where: { id: teamId } });
    if (!team) throw new Error("找不到小隊");
    if (team.coins + coins < 0) throw new Error("光幣不足");
    if (team.cardPoints + cardPoints < 0) throw new Error("卡牌點數不足");
    const updated = await tx.team.update({
      where: { id: teamId },
      data: { coins: { increment: coins }, cardPoints: { increment: cardPoints } },
    });
    if (coins !== 0)
      await logLedger(tx, { teamId, kind, delta: coins, note, byToken });
    if (cardPoints !== 0)
      await logLedger(tx, { teamId, kind: "cardPoints", delta: cardPoints, note, byToken });
    return updated;
  });
}

// ── 命運投資輪盤 ─────────────────────────────────────────────
export async function applyWheel(params: {
  teamId: number;
  stake: number;
  mult: number;
  byToken?: string;
}) {
  const { teamId, stake, mult, byToken } = params;
  if (stake <= 0 || stake > 500) throw new Error("投入金額需為 1–500");
  const delta = Math.round(stake * mult) - stake; // 淨變動
  return prisma.$transaction(async (tx) => {
    const team = await tx.team.findUnique({ where: { id: teamId } });
    if (!team) throw new Error("找不到小隊");
    if (team.coins + delta < 0) throw new Error("光幣不足以支付投入");
    const updated = await tx.team.update({
      where: { id: teamId },
      data: { coins: { increment: delta } },
    });
    await logLedger(tx, {
      teamId,
      kind: "wheel",
      delta,
      note: `輪盤 投入${stake} ×${mult}`,
      byToken,
    });
    return { team: updated, mult, stake, delta };
  });
}

// ── 不動產：購買 ─────────────────────────────────────────────
export async function buyProperty(params: {
  propertyId: number;
  teamId: number;
  discount?: number;
  byToken?: string;
}) {
  const { propertyId, teamId, discount = 0, byToken } = params;
  return prisma.$transaction(async (tx) => {
    const prop = await tx.property.findUnique({ where: { id: propertyId } });
    if (!prop) throw new Error("找不到不動產");
    if (prop.ownerTeamId != null) throw new Error("該不動產已被購買");
    const price = Math.max(0, prop.basePrice - discount);
    const team = await tx.team.findUnique({ where: { id: teamId } });
    if (!team) throw new Error("找不到小隊");
    if (team.coins < price) throw new Error("光幣不足");
    await tx.team.update({ where: { id: teamId }, data: { coins: { decrement: price } } });
    await tx.property.update({ where: { id: propertyId }, data: { ownerTeamId: teamId, level: 0 } });
    await logLedger(tx, {
      teamId,
      kind: "property",
      delta: -price,
      note: `購買 ${prop.name}${discount ? `（折抵${discount}）` : ""}`,
      byToken,
    });
    return { ok: true, price };
  });
}

// ── 不動產：升級 ─────────────────────────────────────────────
export async function upgradeProperty(params: {
  propertyId: number;
  discount?: number;
  byToken?: string;
}) {
  const { propertyId, discount = 0, byToken } = params;
  return prisma.$transaction(async (tx) => {
    const prop = await tx.property.findUnique({ where: { id: propertyId } });
    if (!prop) throw new Error("找不到不動產");
    if (prop.ownerTeamId == null) throw new Error("該不動產尚未售出");
    const fee0 = upgradeFee(prop.basePrice, prop.level);
    if (fee0 == null) throw new Error("已達最高等級（3 級）");
    const fee = Math.max(0, fee0 - discount);
    const team = await tx.team.findUnique({ where: { id: prop.ownerTeamId } });
    if (!team) throw new Error("找不到持有小隊");
    if (team.coins < fee) throw new Error("光幣不足");
    await tx.team.update({ where: { id: team.id }, data: { coins: { decrement: fee } } });
    await tx.property.update({ where: { id: propertyId }, data: { level: { increment: 1 } } });
    await logLedger(tx, {
      teamId: team.id,
      kind: "property",
      delta: -fee,
      note: `升級 ${prop.name} → ${prop.level + 1}級${discount ? `（折抵${discount}）` : ""}`,
      byToken,
    });
    return { ok: true, fee, newLevel: prop.level + 1 };
  });
}

// ── 不動產：過戶（小隊間交易）────────────────────────────────
export async function transferProperty(params: {
  propertyId: number;
  toTeamId: number;
  price?: number; // 買方付給賣方的光幣（可 0）
  byToken?: string;
}) {
  const { propertyId, toTeamId, price = 0, byToken } = params;
  return prisma.$transaction(async (tx) => {
    const prop = await tx.property.findUnique({ where: { id: propertyId } });
    if (!prop) throw new Error("找不到不動產");
    if (prop.ownerTeamId == null) throw new Error("該不動產尚未售出，請用購買");
    if (prop.ownerTeamId === toTeamId) throw new Error("買賣雙方相同");
    const fromTeamId = prop.ownerTeamId;
    const buyer = await tx.team.findUnique({ where: { id: toTeamId } });
    if (!buyer) throw new Error("找不到買方小隊");
    if (price > 0) {
      if (buyer.coins < price) throw new Error("買方光幣不足");
      await tx.team.update({ where: { id: toTeamId }, data: { coins: { decrement: price } } });
      await tx.team.update({ where: { id: fromTeamId }, data: { coins: { increment: price } } });
      await logLedger(tx, { teamId: toTeamId, kind: "property", delta: -price, note: `購入 ${prop.name}`, byToken });
      await logLedger(tx, { teamId: fromTeamId, kind: "property", delta: price, note: `售出 ${prop.name}`, byToken });
    }
    await tx.property.update({ where: { id: propertyId }, data: { ownerTeamId: toTeamId } });
    await logLedger(tx, { teamId: toTeamId, kind: "property", delta: 0, note: `過戶取得 ${prop.name}`, byToken });
    return { ok: true };
  });
}

// ── 過路費 ───────────────────────────────────────────────────
export async function payToll(params: {
  propertyId: number; // 踩到的資本據點
  payerTeamId: number;
  byToken?: string;
}) {
  const { propertyId, payerTeamId, byToken } = params;
  return prisma.$transaction(async (tx) => {
    const prop = await tx.property.findUnique({ where: { id: propertyId } });
    if (!prop) throw new Error("找不到不動產");
    const region = prop.region as RegionCode;
    const state = await getState(tx);
    const activeEvents = parseActiveEvents(state.activeEvents);
    const regionProps = await tx.property.findMany({ where: { region } });

    // 獨佔判定
    const stat = new Map<number, { lvl3: number; total: number }>();
    for (const p of regionProps) {
      if (p.ownerTeamId == null) continue;
      const s = stat.get(p.ownerTeamId) ?? { lvl3: 0, total: 0 };
      s.total += 1;
      if (p.level >= 3) s.lvl3 += 1;
      stat.set(p.ownerTeamId, s);
    }
    const ranked = [...stat.entries()].sort(
      (a, b) => b[1].lvl3 - a[1].lvl3 || b[1].total - a[1].total,
    );
    let monopolyId: number | null = null;
    if (ranked.length === 1) monopolyId = ranked[0][0];
    else if (ranked.length >= 2) {
      const [f, s] = ranked;
      if (!(f[1].lvl3 === s[1].lvl3 && f[1].total === s[1].total)) monopolyId = f[0];
    }
    if (monopolyId == null) throw new Error(`${REGION_NAME[region]} 目前沒有獨佔隊伍，免過路費`);
    if (monopolyId === payerTeamId) throw new Error("踩到自己獨佔區，免過路費");

    const totalValue = regionProps
      .filter((p) => p.ownerTeamId === monopolyId)
      .reduce((s, p) => s + currentValue(p, activeEvents, state.event4Penalty), 0);
    const toll = roundTo50(totalValue * 0.1);
    if (toll <= 0) throw new Error("過路費為 0");

    const payer = await tx.team.findUnique({ where: { id: payerTeamId } });
    if (!payer) throw new Error("找不到付款小隊");
    if (payer.coins < toll) throw new Error(`光幣不足（過路費 ${toll}）`);

    await tx.team.update({ where: { id: payerTeamId }, data: { coins: { decrement: toll } } });
    await tx.team.update({ where: { id: monopolyId }, data: { coins: { increment: toll } } });
    await logLedger(tx, { teamId: payerTeamId, kind: "coins", delta: -toll, note: `過路費 ${REGION_NAME[region]}`, byToken });
    await logLedger(tx, { teamId: monopolyId, kind: "coins", delta: toll, note: `收過路費 ${REGION_NAME[region]}`, byToken });
    return { ok: true, toll, monopolyId };
  });
}

// ── 卡牌商店 ─────────────────────────────────────────────────
async function restockSlot(tx: Tx, slot: number) {
  const displays = await tx.shopDisplay.findMany();
  const shown = new Set(displays.filter((d) => d.slot !== slot && d.cardType).map((d) => d.cardType));
  const candidates = await tx.functionCard.findMany({ where: { remaining: { gt: 0 } } });
  const pool = candidates.filter((c) => !shown.has(c.type));
  const pick = (pool.length ? pool : candidates)[Math.floor(Math.random() * (pool.length ? pool.length : candidates.length))];
  await tx.shopDisplay.update({ where: { slot }, data: { cardType: pick?.type ?? null } });
}

export async function sellCard(params: { teamId: number; slot: number; byToken?: string }) {
  const { teamId, slot, byToken } = params;
  return prisma.$transaction(async (tx) => {
    const display = await tx.shopDisplay.findUnique({ where: { slot } });
    if (!display?.cardType) throw new Error("該展示位沒有卡");
    const card = await tx.functionCard.findUnique({ where: { type: display.cardType } });
    if (!card || card.remaining <= 0) throw new Error("該卡已售完");
    const team = await tx.team.findUnique({ where: { id: teamId } });
    if (!team) throw new Error("找不到小隊");
    if (team.cardPoints < card.cost) throw new Error(`卡牌點數不足（需 ${card.cost}）`);
    await tx.team.update({ where: { id: teamId }, data: { cardPoints: { decrement: card.cost } } });
    await tx.functionCard.update({ where: { type: card.type }, data: { remaining: { decrement: 1 } } });
    await logLedger(tx, { teamId, kind: "cardPoints", delta: -card.cost, note: `購買功能卡 ${card.type}`, byToken });
    await restockSlot(tx, slot);
    return { ok: true, card: card.type, cost: card.cost };
  });
}

export async function redeemVoucher(params: { teamId: number; byToken?: string }) {
  const { teamId, byToken } = params;
  return prisma.$transaction(async (tx) => {
    const candidates = await tx.functionCard.findMany({ where: { remaining: { gt: 0 } } });
    if (!candidates.length) throw new Error("功能卡已全部售罄");
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    await tx.functionCard.update({ where: { type: pick.type }, data: { remaining: { decrement: 1 } } });
    await logLedger(tx, { teamId, kind: "voucher", delta: 0, note: `兌換券抽到 ${pick.type}`, byToken });
    return { ok: true, card: pick.type };
  });
}

// ── 大樂透 ───────────────────────────────────────────────────
export async function registerLottery(params: { teamId: number; number: number; byToken?: string }) {
  const { teamId, number, byToken } = params;
  if (number < 1 || number > 50) throw new Error("號碼需為 1–50");
  return prisma.$transaction(async (tx) => {
    const state = await getState(tx);
    const existing = await tx.lotteryNumber.findUnique({
      where: { period_number: { period: state.lotteryPeriod, number } },
    });
    if (existing) throw new Error("該號碼本期已被登記");
    const owned = await tx.lotteryNumber.count({ where: { period: state.lotteryPeriod, teamId } });
    const fee = lotteryFee(owned);
    const team = await tx.team.findUnique({ where: { id: teamId } });
    if (!team) throw new Error("找不到小隊");
    if (team.coins < fee) throw new Error(`光幣不足（加購費 ${fee}）`);
    if (fee > 0) {
      await tx.team.update({ where: { id: teamId }, data: { coins: { decrement: fee } } });
      await logLedger(tx, { teamId, kind: "lottery", delta: -fee, note: `大樂透加購 ${number} 號`, byToken });
    }
    await tx.lotteryNumber.create({ data: { period: state.lotteryPeriod, number, teamId } });
    const poolAdd = 100 + fee; // 停留 +100，加購費也入池
    await tx.gameState.update({ where: { id: 1 }, data: { lotteryPool: { increment: poolAdd } } });
    return { ok: true, fee, poolAdd };
  });
}

export async function drawLottery(params: { byToken?: string }) {
  const { byToken } = params;
  return prisma.$transaction(async (tx) => {
    const state = await getState(tx);
    const number = Math.floor(Math.random() * 50) + 1;
    const hit = await tx.lotteryNumber.findUnique({
      where: { period_number: { period: state.lotteryPeriod, number } },
    });
    if (!hit) {
      return { number, winnerTeamId: null, pool: state.lotteryPool };
    }
    const pool = state.lotteryPool;
    await tx.team.update({ where: { id: hit.teamId }, data: { coins: { increment: pool } } });
    await logLedger(tx, { teamId: hit.teamId, kind: "lottery", delta: pool, note: `大樂透中獎 ${number} 號`, byToken });
    // 清空本期、開新一期、獎金池重設 1000
    await tx.lotteryNumber.deleteMany({ where: { period: state.lotteryPeriod } });
    await tx.gameState.update({
      where: { id: 1 },
      data: { lotteryPeriod: { increment: 1 }, lotteryPool: 1000 },
    });
    return { number, winnerTeamId: hit.teamId, pool };
  });
}

// ── 主持人：事件 / 階段 / 結算 ───────────────────────────────
export async function setEvent(params: { index: number; on: boolean; penaltyRegion?: string | null }) {
  const { index, on, penaltyRegion } = params;
  if (!EVENTS[index]) throw new Error("事件編號錯誤");
  return prisma.$transaction(async (tx) => {
    const state = await getState(tx);
    const set = new Set(parseActiveEvents(state.activeEvents));
    if (on) set.add(index);
    else set.delete(index);
    const csv = [...set].sort((a, b) => a - b).join(",");
    const data: { activeEvents: string; event4Penalty?: string | null } = { activeEvents: csv };
    if (index === 4) data.event4Penalty = on ? (penaltyRegion ?? null) : null;
    await tx.gameState.update({ where: { id: 1 }, data });
    await logLedger(tx, { kind: "system", note: `事件${index} ${on ? "啟動" : "關閉"}${penaltyRegion ? `（懲罰區 ${penaltyRegion}）` : ""}` });
    return { ok: true, activeEvents: csv };
  });
}

export async function setPhase(params: { phase: string }) {
  const { phase } = params;
  if (!["SETUP", "RUNNING", "SETTLED"].includes(phase)) throw new Error("階段錯誤");
  await prisma.gameState.update({ where: { id: 1 }, data: { phase } });
  return { ok: true, phase };
}

export async function settle() {
  return prisma.gameState.update({
    where: { id: 1 },
    data: { phase: "SETTLED", settledAt: new Date() },
  });
}

// ── Admin：直接設定數值（賽前布置 / 數值平衡）────────────────
export async function adminSetTeam(params: {
  teamId: number;
  name?: string;
  coins?: number;
  cardPoints?: number;
  byToken?: string;
}) {
  const { teamId, name, coins, cardPoints, byToken } = params;
  return prisma.$transaction(async (tx) => {
    const team = await tx.team.findUnique({ where: { id: teamId } });
    if (!team) throw new Error("找不到小隊");
    const data: { name?: string; coins?: number; cardPoints?: number } = {};
    if (typeof name === "string" && name) data.name = name;
    if (typeof coins === "number") data.coins = coins;
    if (typeof cardPoints === "number") data.cardPoints = cardPoints;
    const updated = await tx.team.update({ where: { id: teamId }, data });
    if (typeof coins === "number" && coins !== team.coins)
      await logLedger(tx, { teamId, kind: "coins", delta: coins - team.coins, note: "Admin 設定光幣", byToken });
    if (typeof cardPoints === "number" && cardPoints !== team.cardPoints)
      await logLedger(tx, { teamId, kind: "cardPoints", delta: cardPoints - team.cardPoints, note: "Admin 設定卡牌點數", byToken });
    return updated;
  });
}

export async function adminSetProperty(params: {
  propertyId: number;
  ownerTeamId?: number | null;
  level?: number;
  byToken?: string;
}) {
  const { propertyId, ownerTeamId, level, byToken } = params;
  return prisma.$transaction(async (tx) => {
    const prop = await tx.property.findUnique({ where: { id: propertyId } });
    if (!prop) throw new Error("找不到不動產");
    const data: { ownerTeamId?: number | null; level?: number } = {};
    if (ownerTeamId !== undefined) data.ownerTeamId = ownerTeamId;
    if (typeof level === "number") {
      if (level < 0 || level > 3) throw new Error("等級需 0–3");
      data.level = level;
    }
    const updated = await tx.property.update({ where: { id: propertyId }, data });
    await logLedger(tx, { kind: "system", note: `Admin 設定 ${prop.name}（持有 ${ownerTeamId ?? "無"}、等級 ${level ?? prop.level}）`, byToken });
    return updated;
  });
}

export async function adminSetCard(params: {
  type: string;
  cost?: number;
  remaining?: number;
}) {
  const { type, cost, remaining } = params;
  const data: { cost?: number; remaining?: number } = {};
  if (typeof cost === "number") data.cost = cost;
  if (typeof remaining === "number") data.remaining = remaining;
  return prisma.functionCard.update({ where: { type }, data });
}

// ── 稽核：沖銷一筆 ledger（光幣 / 卡牌點數可自動回沖）────────
export async function reverseLedger(params: { ledgerId: number; byToken?: string }) {
  const { ledgerId, byToken } = params;
  return prisma.$transaction(async (tx) => {
    const entry = await tx.ledger.findUnique({ where: { id: ledgerId } });
    if (!entry) throw new Error("找不到紀錄");
    if (entry.reversed) throw new Error("該紀錄已沖銷");
    if (entry.teamId && entry.delta !== 0) {
      const field = entry.kind === "cardPoints" ? "cardPoints" : "coins";
      await tx.team.update({
        where: { id: entry.teamId },
        data: { [field]: { increment: -entry.delta } },
      });
      await logLedger(tx, {
        teamId: entry.teamId,
        kind: entry.kind,
        delta: -entry.delta,
        note: `沖銷 #${ledgerId}：${entry.note ?? ""}`,
        byToken,
      });
    }
    await tx.ledger.update({ where: { id: ledgerId }, data: { reversed: true } });
    return { ok: true, autoReversed: !!(entry.teamId && entry.delta !== 0) };
  });
}
