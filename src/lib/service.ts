import { prisma } from "./db";
import { Prisma } from "@/generated/prisma";
import {
  EVENTS,
  REGION_NAME,
  applyShopPrice,
  applyToll,
  applyGoodCardReward,
  applyBadCardPenalty,
  applyTaxCut,
  applyRoundIncome,
  applyWheelBonus,
  applyWheelMaxStake,
  applyLotteryBonus,
  applyJackpotShare,
  applyLotteryFeeDiscount,
  applyCompoundInterest,
  applyPropertyDividend,
  applyAllianceBonus,
  applyPiracy,
  spinWheelCustom,
  currentValue,
  lotteryFee,
  parseActiveEvents,
  roundTo50,
  stackEffects,
  upgradeFee,
  TOLL_RATE,
  type EffectType,
  type RegionCode,
  type UndoRecipe,
} from "./game";

type Tx = Prisma.TransactionClient;

// 「有效動產」的共用條件：active 且未被凍結於 PENDING 交易中。
// 所有會讀取擁有者有效動產（效果計算 / 清單）的查詢都應併入此條件，
// 否則凍結中的動產仍會生效（等同一物兩用）。新增效果查詢時務必沿用。
const ACTIVE_ITEM = { active: true, lockedTradeId: null } as const;

// 寫一筆總帳並回傳其 id（撤銷配方需要這些 id 才能精準回沖）。
async function logLedger(
  tx: Tx,
  data: {
    teamId?: number | null;
    kind: string;
    delta?: number;
    note?: string;
    byToken?: string;
  },
): Promise<number> {
  const row = await tx.ledger.create({
    data: {
      teamId: data.teamId ?? null,
      kind: data.kind,
      delta: data.delta ?? 0,
      note: data.note,
      byToken: data.byToken,
    },
  });
  return row.id;
}

async function getState(tx: Tx) {
  const s = await tx.gameState.findUnique({ where: { id: 1 } });
  if (!s) throw new Error("遊戲狀態未初始化，請先執行 seed");
  return s;
}

// ── 動產效果載入 + 使用次數管理 ─────────────────────────────────
type EffectLoad = { delta: number; usedIds: number[] };

async function loadActiveEffects(
  tx: Tx,
  teamId: number,
  type: EffectType,
  context?: { region?: string },
): Promise<EffectLoad> {
  const items = await tx.teamItem.findMany({
    where: { teamId, ...ACTIVE_ITEM },
    include: { asset: true },
  });
  const matched = items.filter((item) => {
    if (item.asset.effectType !== type) return false;
    if (item.asset.condition) {
      try {
        const cond = JSON.parse(item.asset.condition) as { region?: string };
        if (cond.region && context?.region && cond.region !== context.region) return false;
      } catch {
        return false;
      }
    }
    return true;
  });
  const delta = stackEffects(matched.map((i) => i.asset.effectValue));
  return { delta, usedIds: matched.map((i) => i.id) };
}

// 效果觸發後遞減使用次數；歸零時自動失效。
async function decrementUses(tx: Tx, itemIds: number[]): Promise<void> {
  if (!itemIds.length) return;
  // 只處理有限次數的（usesRemaining != null）
  const items = await tx.teamItem.findMany({
    where: { id: { in: itemIds }, usesRemaining: { not: null } },
  });
  for (const item of items) {
    const next = (item.usesRemaining ?? 1) - 1;
    await tx.teamItem.update({
      where: { id: item.id },
      data: { usesRemaining: next, active: next > 0 },
    });
  }
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
    const ledgerIds: number[] = [];
    if (coins !== 0)
      ledgerIds.push(await logLedger(tx, { teamId, kind, delta: coins, note, byToken }));
    if (cardPoints !== 0)
      ledgerIds.push(await logLedger(tx, { teamId, kind: "cardPoints", delta: cardPoints, note, byToken }));
    const undo: UndoRecipe = { label: note || "調整餘額", ledgerIds };
    return { ...updated, undo };
  });
}

// ── 命運投資輪盤 ─────────────────────────────────────────────
// mult 由此函式內部決定（含 WHEEL_NO_ZERO 保底邏輯），不再由路由傳入。
export async function applyWheel(params: {
  teamId: number;
  stake: number;
  byToken?: string;
}) {
  const { teamId, stake, byToken } = params;
  if (stake <= 0) throw new Error("投入金額需大於 0");
  return prisma.$transaction(async (tx) => {
    const team = await tx.team.findUnique({ where: { id: teamId } });
    if (!team) throw new Error("找不到小隊");

    // WHEEL_STAKE_BOOST：提高最大投入上限
    const stakeBoostEffect = await loadActiveEffects(tx, teamId, "WHEEL_STAKE_BOOST");
    const maxStake = applyWheelMaxStake(team.coins, stakeBoostEffect.delta);
    if (stake > maxStake) throw new Error(`投入上限為 ${maxStake} 光幣`);

    // WHEEL_NO_ZERO：排除 ×0，並消耗一次
    const noZeroItems = await tx.teamItem.findMany({
      where: { teamId, ...ACTIVE_ITEM },
      include: { asset: true },
    });
    const hasNoZero = noZeroItems.some((i) => i.asset.effectType === "WHEEL_NO_ZERO");
    const mult = spinWheelCustom(hasNoZero ? { excludeMultipliers: [0] } : undefined);
    const noZeroUsedIds = hasNoZero
      ? noZeroItems.filter((i) => i.asset.effectType === "WHEEL_NO_ZERO").map((i) => i.id)
      : [];

    // 基礎淨變動
    const baseDelta = Math.round(stake * mult) - stake;

    // WHEEL_BONUS：獲利加成（虧損不放大）。僅在實際加成（淨利 > 0）時消耗次數。
    const bonusEffect = await loadActiveEffects(tx, teamId, "WHEEL_BONUS");
    const delta = applyWheelBonus(baseDelta, bonusEffect.delta);
    const bonusUsedIds = delta > baseDelta ? bonusEffect.usedIds : [];

    if (team.coins + delta < 0) throw new Error("光幣不足以支付投入");
    const updated = await tx.team.update({
      where: { id: teamId },
      data: { coins: { increment: delta } },
    });
    await decrementUses(tx, [...stakeBoostEffect.usedIds, ...bonusUsedIds, ...noZeroUsedIds]);
    const lid = await logLedger(tx, {
      teamId,
      kind: "wheel",
      delta,
      note: `輪盤 投入${stake} ×${mult}${hasNoZero ? "（保底）" : ""}`,
      byToken,
    });
    const undo: UndoRecipe = { label: `輪盤 ×${mult}`, ledgerIds: [lid] };
    return { team: updated, mult, stake, delta, undo };
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
    const state = await getState(tx);
    const marketValue = currentValue(prop, parseActiveEvents(state.activeEvents), state.event4Penalty);
    const shopEffect = await loadActiveEffects(tx, teamId, "SHOP_PRICE");
    const price = applyShopPrice(marketValue - discount, shopEffect.delta);
    const team = await tx.team.findUnique({ where: { id: teamId } });
    if (!team) throw new Error("找不到小隊");
    if (team.coins < price) throw new Error("光幣不足");
    await tx.team.update({ where: { id: teamId }, data: { coins: { decrement: price } } });
    await tx.property.update({ where: { id: propertyId }, data: { ownerTeamId: teamId, level: 0 } });
    await decrementUses(tx, shopEffect.usedIds);
    const lid = await logLedger(tx, {
      teamId,
      kind: "property",
      delta: -price,
      note: `購買 ${prop.name}${discount ? `（折抵${discount}）` : ""}`,
      byToken,
    });
    // 購買的前提就是無主、level 0 → 撤銷即還原成無主
    const undo: UndoRecipe = {
      label: `購買 ${prop.name}`,
      ledgerIds: [lid],
      property: { id: propertyId, ownerTeamId: null, level: 0 },
    };
    return { ok: true, price, undo };
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
    const state = await getState(tx);
    const marketValue = currentValue(prop, parseActiveEvents(state.activeEvents), state.event4Penalty);
    const fee0 = upgradeFee(marketValue, prop.level);
    if (fee0 == null) throw new Error("已達最高等級（3 級）");
    const shopEffect = await loadActiveEffects(tx, prop.ownerTeamId, "SHOP_PRICE");
    const fee = applyShopPrice(fee0 - discount, shopEffect.delta);
    const team = await tx.team.findUnique({ where: { id: prop.ownerTeamId } });
    if (!team) throw new Error("找不到持有小隊");
    if (team.coins < fee) throw new Error("光幣不足");
    await tx.team.update({ where: { id: team.id }, data: { coins: { decrement: fee } } });
    await tx.property.update({ where: { id: propertyId }, data: { level: { increment: 1 } } });
    await decrementUses(tx, shopEffect.usedIds);
    const lid = await logLedger(tx, {
      teamId: team.id,
      kind: "property",
      delta: -fee,
      note: `升級 ${prop.name} → ${prop.level + 1}級${discount ? `（折抵${discount}）` : ""}`,
      byToken,
    });
    // prop.level 是升級前的等級 → 撤銷即降回此等級
    const undo: UndoRecipe = {
      label: `升級 ${prop.name}`,
      ledgerIds: [lid],
      property: { id: propertyId, ownerTeamId: prop.ownerTeamId, level: prop.level },
    };
    return { ok: true, fee, newLevel: prop.level + 1, undo };
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
    const ledgerIds: number[] = [];
    if (price > 0) {
      if (buyer.coins < price) throw new Error("買方光幣不足");
      await tx.team.update({ where: { id: toTeamId }, data: { coins: { decrement: price } } });
      await tx.team.update({ where: { id: fromTeamId }, data: { coins: { increment: price } } });
      ledgerIds.push(await logLedger(tx, { teamId: toTeamId, kind: "property", delta: -price, note: `購入 ${prop.name}`, byToken }));
      ledgerIds.push(await logLedger(tx, { teamId: fromTeamId, kind: "property", delta: price, note: `售出 ${prop.name}`, byToken }));
    }
    await tx.property.update({ where: { id: propertyId }, data: { ownerTeamId: toTeamId } });
    ledgerIds.push(await logLedger(tx, { teamId: toTeamId, kind: "property", delta: 0, note: `過戶取得 ${prop.name}`, byToken }));
    // 撤銷即把持有改回原賣方（等級不變）
    const undo: UndoRecipe = {
      label: `過戶 ${prop.name}`,
      ledgerIds,
      property: { id: propertyId, ownerTeamId: fromTeamId, level: prop.level },
    };
    return { ok: true, undo };
  });
}

// ── 功能卡：不動產相關效果（交易所執行；不扣卡牌點數，點數已於商店購卡時扣）──
// 全部只「執行效果」，由關主見證玩家出示對應功能卡。

// 購地卡：強制收購對手一塊地。對手獲「初始定價 × 80%」補償（銀行出資），產權（含等級）轉給出卡隊。
export async function cardSeizeLand(params: { propertyId: number; toTeamId: number; byToken?: string }) {
  const { propertyId, toTeamId, byToken } = params;
  return prisma.$transaction(async (tx) => {
    const prop = await tx.property.findUnique({ where: { id: propertyId } });
    if (!prop) throw new Error("找不到不動產");
    if (prop.ownerTeamId == null) throw new Error("該不動產尚未售出");
    if (prop.ownerTeamId === toTeamId) throw new Error("不能收購自己的地");
    const buyer = await tx.team.findUnique({ where: { id: toTeamId } });
    if (!buyer) throw new Error("找不到出卡小隊");
    const fromTeamId = prop.ownerTeamId;
    const compensation = roundTo50(prop.basePrice * 0.8);
    const ledgerIds: number[] = [];
    if (compensation > 0) {
      await tx.team.update({ where: { id: fromTeamId }, data: { coins: { increment: compensation } } });
      ledgerIds.push(await logLedger(tx, { teamId: fromTeamId, kind: "property", delta: compensation, note: `購地卡補償 ${prop.name}（初始價 8 折）`, byToken }));
    }
    await tx.property.update({ where: { id: propertyId }, data: { ownerTeamId: toTeamId } });
    ledgerIds.push(await logLedger(tx, { teamId: toTeamId, kind: "property", delta: 0, note: `購地卡強制收購 ${prop.name}（來自隊 #${fromTeamId}）`, byToken }));
    const undo: UndoRecipe = {
      label: `購地卡 ${prop.name}`,
      ledgerIds,
      property: { id: propertyId, ownerTeamId: fromTeamId, level: prop.level },
    };
    return { ok: true, compensation, undo };
  });
}

// 換地卡：我方一塊地與對手一塊地強制對換（產權互換，各自等級跟著走）。
export async function cardSwapLand(params: { propertyAId: number; propertyBId: number; byToken?: string }) {
  const { propertyAId, propertyBId, byToken } = params;
  if (propertyAId === propertyBId) throw new Error("兩塊地相同");
  return prisma.$transaction(async (tx) => {
    const a = await tx.property.findUnique({ where: { id: propertyAId } });
    const b = await tx.property.findUnique({ where: { id: propertyBId } });
    if (!a || !b) throw new Error("找不到不動產");
    if (a.ownerTeamId == null || b.ownerTeamId == null) throw new Error("兩塊地都須已售出");
    if (a.ownerTeamId === b.ownerTeamId) throw new Error("兩塊地屬於同一隊");
    await tx.property.update({ where: { id: a.id }, data: { ownerTeamId: b.ownerTeamId } });
    await tx.property.update({ where: { id: b.id }, data: { ownerTeamId: a.ownerTeamId } });
    const lid = await logLedger(tx, { teamId: a.ownerTeamId, kind: "property", delta: 0, note: `換地卡：${a.name} ⇄ ${b.name}`, byToken });
    const undo: UndoRecipe = {
      label: `換地卡 ${a.name} ⇄ ${b.name}`,
      ledgerIds: [lid],
      properties: [
        { id: a.id, ownerTeamId: a.ownerTeamId, level: a.level },
        { id: b.id, ownerTeamId: b.ownerTeamId, level: b.level },
      ],
    };
    return { ok: true, undo };
  });
}

// 換屋卡：兩棟房屋互換升級級別（產權不變，只換等級）。
export async function cardSwapHouse(params: { propertyAId: number; propertyBId: number; byToken?: string }) {
  const { propertyAId, propertyBId, byToken } = params;
  if (propertyAId === propertyBId) throw new Error("兩棟房屋相同");
  return prisma.$transaction(async (tx) => {
    const a = await tx.property.findUnique({ where: { id: propertyAId } });
    const b = await tx.property.findUnique({ where: { id: propertyBId } });
    if (!a || !b) throw new Error("找不到不動產");
    if (a.ownerTeamId == null || b.ownerTeamId == null) throw new Error("兩棟房屋都須已售出");
    if (a.ownerTeamId === b.ownerTeamId) throw new Error("兩棟房屋屬於同一隊");
    await tx.property.update({ where: { id: a.id }, data: { level: b.level } });
    await tx.property.update({ where: { id: b.id }, data: { level: a.level } });
    const lid = await logLedger(tx, { teamId: a.ownerTeamId, kind: "property", delta: 0, note: `換屋卡：${a.name}(${a.level}級) ⇄ ${b.name}(${b.level}級)`, byToken });
    const undo: UndoRecipe = {
      label: `換屋卡 ${a.name} ⇄ ${b.name}`,
      ledgerIds: [lid],
      properties: [
        { id: a.id, ownerTeamId: a.ownerTeamId, level: a.level },
        { id: b.id, ownerTeamId: b.ownerTeamId, level: b.level },
      ],
    };
    return { ok: true, undo };
  });
}

// 拆屋卡：對手一棟房屋降一級（3→2→1→未升級）。
export async function cardDemolish(params: { propertyId: number; byToken?: string }) {
  const { propertyId, byToken } = params;
  return prisma.$transaction(async (tx) => {
    const prop = await tx.property.findUnique({ where: { id: propertyId } });
    if (!prop) throw new Error("找不到不動產");
    if (prop.ownerTeamId == null) throw new Error("該不動產尚未售出");
    if (prop.level <= 0) throw new Error("該房屋已是未升級，無法再拆");
    await tx.property.update({ where: { id: propertyId }, data: { level: prop.level - 1 } });
    const lid = await logLedger(tx, { teamId: prop.ownerTeamId, kind: "property", delta: 0, note: `拆屋卡：${prop.name} ${prop.level}級 → ${prop.level - 1}級`, byToken });
    const undo: UndoRecipe = {
      label: `拆屋卡 ${prop.name}`,
      ledgerIds: [lid],
      property: { id: propertyId, ownerTeamId: prop.ownerTeamId, level: prop.level },
    };
    return { ok: true, undo };
  });
}

// 怪獸卡：完全摧毀對手一棟房屋，使該地降回未購買狀態（無主、0 級）。
export async function cardMonster(params: { propertyId: number; byToken?: string }) {
  const { propertyId, byToken } = params;
  return prisma.$transaction(async (tx) => {
    const prop = await tx.property.findUnique({ where: { id: propertyId } });
    if (!prop) throw new Error("找不到不動產");
    if (prop.ownerTeamId == null) throw new Error("該不動產尚未售出");
    const fromTeamId = prop.ownerTeamId;
    await tx.property.update({ where: { id: propertyId }, data: { ownerTeamId: null, level: 0 } });
    const lid = await logLedger(tx, { teamId: fromTeamId, kind: "property", delta: 0, note: `怪獸卡摧毀 ${prop.name}（降回未購買）`, byToken });
    const undo: UndoRecipe = {
      label: `怪獸卡 ${prop.name}`,
      ledgerIds: [lid],
      property: { id: propertyId, ownerTeamId: fromTeamId, level: prop.level },
    };
    return { ok: true, undo };
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
    const baseToll = roundTo50(totalValue * TOLL_RATE);
    if (baseToll <= 0) throw new Error("過路費為 0");

    // 動產效果：獨佔隊 TOLL_INCOME 提高過路費、付款隊 TOLL_PAID 降低過路費。
    // 金額守恆：付多少＝收多少（同一個 toll 數字）。
    const tollPaidEffect   = await loadActiveEffects(tx, payerTeamId, "TOLL_PAID",   { region });
    const tollIncomeEffect = await loadActiveEffects(tx, monopolyId,  "TOLL_INCOME", { region });
    const toll = applyToll(baseToll, tollIncomeEffect.delta, tollPaidEffect.delta);

    const payer = await tx.team.findUnique({ where: { id: payerTeamId } });
    if (!payer) throw new Error("找不到付款小隊");
    if (payer.coins < toll) throw new Error(`光幣不足（過路費 ${toll}）`);

    await tx.team.update({ where: { id: payerTeamId }, data: { coins: { decrement: toll } } });
    await tx.team.update({ where: { id: monopolyId  }, data: { coins: { increment: toll } } });
    await decrementUses(tx, [...tollPaidEffect.usedIds, ...tollIncomeEffect.usedIds]);
    const noteBase = `過路費 ${REGION_NAME[region]}`;
    const l1 = await logLedger(tx, { teamId: payerTeamId, kind: "coins", delta: -toll, note: noteBase,        byToken });
    const l2 = await logLedger(tx, { teamId: monopolyId,  kind: "coins", delta: toll,  note: `收${noteBase}`, byToken });
    const ledgerIds = [l1, l2];

    // 全場稅收：TAX_COLLECTOR 效果（永久型，不計入 decrementUses）
    const allItems = await tx.teamItem.findMany({
      where: { ...ACTIVE_ITEM, asset: { effectType: "TAX_COLLECTOR" } },
      include: { asset: true },
    });
    const taxMap = new Map<number, number>();
    for (const item of allItems) {
      taxMap.set(item.teamId, (taxMap.get(item.teamId) ?? 0) + item.asset.effectValue);
    }
    for (const [taxTeamId, totalRate] of taxMap) {
      const cut = applyTaxCut(baseToll, totalRate);
      if (cut <= 0) continue;
      await tx.team.update({ where: { id: taxTeamId }, data: { coins: { increment: cut } } });
      const lTax = await logLedger(tx, { teamId: taxTeamId, kind: "coins", delta: cut, note: `全場稅收 ${noteBase}`, byToken });
      ledgerIds.push(lTax);
    }

    // PIRACY（海盜旗・懸賞標記）：被標記的隊「收」過路費時，海盜抽成。
    // 反滾雪球：僅當海盜隊比目標窮才生效（海盜較富 → 標記失效）。
    // 抽成從目標剛收到的過路費扣回，分給海盜隊。永久型，不消耗次數。
    const piracyItems = await tx.teamItem.findMany({
      where: { ...ACTIVE_ITEM, markTeamId: monopolyId, asset: { effectType: "PIRACY" } },
      include: { asset: true },
    });
    for (const item of piracyItems) {
      if (item.teamId === monopolyId) continue; // 不抽自己
      const pirate = await tx.team.findUnique({ where: { id: item.teamId }, select: { coins: true } });
      const target = await tx.team.findUnique({ where: { id: monopolyId }, select: { coins: true } });
      if (!pirate || !target) continue;
      if (pirate.coins >= target.coins) continue; // 海盜較富 → 標記無效
      const stolen = applyPiracy(baseToll, item.asset.effectValue);
      if (stolen <= 0) continue;
      await tx.team.update({ where: { id: monopolyId   }, data: { coins: { decrement: stolen } } });
      await tx.team.update({ where: { id: item.teamId  }, data: { coins: { increment: stolen } } });
      const lFrom = await logLedger(tx, { teamId: monopolyId,  kind: "coins", delta: -stolen, note: `俠盜抽成 ${REGION_NAME[region]}`, byToken });
      const lTo   = await logLedger(tx, { teamId: item.teamId, kind: "coins", delta: stolen,  note: `俠盜抽成收入 ${REGION_NAME[region]}`, byToken });
      ledgerIds.push(lFrom, lTo);
    }

    const undo: UndoRecipe = { label: `過路費 ${toll}`, ledgerIds };
    return { ok: true, baseToll, toll, monopolyId, undo };
  });
}

// ── 小隊間交易（單向轉帳；發起即凍結發起方資源）──────────────
export async function createTrade(params: {
  fromTeamId: number;
  toTeamId: number;
  coins: number;
  cardPoints: number;
  itemIds?: number[];
  byToken?: string;
}) {
  const { fromTeamId, toTeamId, coins, cardPoints, byToken } = params;
  const itemIds = [...new Set(params.itemIds ?? [])];
  if (fromTeamId === toTeamId) throw new Error("不能跟自己交易");
  if (coins < 0 || cardPoints < 0) throw new Error("數量需為正");
  if (coins === 0 && cardPoints === 0 && itemIds.length === 0) throw new Error("請輸入交易內容");
  return prisma.$transaction(async (tx) => {
    // 一次抓兩隊（少一次往返）
    const teams = await tx.team.findMany({ where: { id: { in: [fromTeamId, toTeamId] } } });
    const from = teams.find((t) => t.id === fromTeamId);
    const to = teams.find((t) => t.id === toTeamId);
    if (!from || !to) throw new Error("找不到小隊");
    if (from.coins < coins) throw new Error(`光幣不足（需 ${coins}）`);
    if (from.cardPoints < cardPoints) throw new Error(`卡牌點數不足（需 ${cardPoints}）`);

    // 驗證動產：必須屬於發起方、有效（active）、且未被凍結於其他交易中
    const items = itemIds.length
      ? await tx.teamItem.findMany({ where: { id: { in: itemIds } }, include: { asset: true } })
      : [];
    if (items.length !== itemIds.length) throw new Error("部分動產不存在");
    for (const it of items) {
      if (it.teamId !== fromTeamId) throw new Error(`動產不屬於你：${it.asset.name}`);
      if (!it.active) throw new Error(`動產已失效：${it.asset.name}`);
      if (it.lockedTradeId != null) throw new Error(`動產已在其他交易凍結中：${it.asset.name}`);
    }

    // 凍結：發起當下先從發起方扣除光幣 / 點數
    await tx.team.update({
      where: { id: fromTeamId },
      data: { coins: { decrement: coins }, cardPoints: { decrement: cardPoints } },
    });
    const trade = await tx.trade.create({
      data: { fromTeamId, toTeamId, coins, cardPoints, status: "PENDING" },
    });
    // 凍結動產：標記 lockedTradeId（暫不生效、不可被其他交易再選）
    if (itemIds.length) {
      await tx.teamItem.updateMany({ where: { id: { in: itemIds } }, data: { lockedTradeId: trade.id } });
    }
    // ledger 一次寫（少一次往返）
    const note = `發起交易給 ${to.name}（凍結）`;
    const ledgers: Prisma.LedgerCreateManyInput[] = [];
    if (coins) ledgers.push({ teamId: fromTeamId, kind: "coins", delta: -coins, note, byToken });
    if (cardPoints) ledgers.push({ teamId: fromTeamId, kind: "cardPoints", delta: -cardPoints, note, byToken });
    for (const it of items) {
      ledgers.push({ teamId: fromTeamId, kind: "items", delta: 0, note: `動產凍結於交易：${it.asset.name} → ${to.name}`, byToken });
    }
    if (ledgers.length) await tx.ledger.createMany({ data: ledgers });
    return { ok: true, tradeId: trade.id };
  });
}

export async function respondTrade(params: {
  tradeId: number;
  actorTeamId: number;
  action: "accept" | "reject" | "cancel";
  byToken?: string;
}) {
  const { tradeId, actorTeamId, action, byToken } = params;
  return prisma.$transaction(async (tx) => {
    const trade = await tx.trade.findUnique({ where: { id: tradeId } });
    if (!trade || trade.status !== "PENDING") throw new Error("交易不存在或已處理");

    // 授權：接受/拒絕只能收受方，取消只能發起方
    if ((action === "accept" || action === "reject") && trade.toTeamId !== actorTeamId) {
      throw new Error("只有對方可以接受或拒絕");
    }
    if (action === "cancel" && trade.fromTeamId !== actorTeamId) {
      throw new Error("只有發起方可以取消");
    }

    // 原子改狀態，擋雙重處理 / 連點
    const status = action === "accept" ? "ACCEPTED" : action === "reject" ? "REJECTED" : "CANCELLED";
    const upd = await tx.trade.updateMany({
      where: { id: tradeId, status: "PENDING" },
      data: { status, resolvedAt: new Date() },
    });
    if (upd.count === 0) throw new Error("交易已被處理");

    // 一次抓兩隊（只為了 ledger 備註的隊名）
    const teams = await tx.team.findMany({ where: { id: { in: [trade.fromTeamId, trade.toTeamId] } } });
    const from = teams.find((t) => t.id === trade.fromTeamId);
    const to = teams.find((t) => t.id === trade.toTeamId);

    // 接受 → 撥給收受方；拒絕 / 取消 → 退回發起方
    const target = action === "accept" ? trade.toTeamId : trade.fromTeamId;
    await tx.team.update({
      where: { id: target },
      data: { coins: { increment: trade.coins }, cardPoints: { increment: trade.cardPoints } },
    });
    const note =
      action === "accept"
        ? `交易收入（來自 ${from?.name}）`
        : `交易退回：${action === "reject" ? `對方拒絕（${to?.name}）` : "自行取消"}`;
    const ledgers: Prisma.LedgerCreateManyInput[] = [];
    if (trade.coins) ledgers.push({ teamId: target, kind: "coins", delta: trade.coins, note, byToken });
    if (trade.cardPoints) ledgers.push({ teamId: target, kind: "cardPoints", delta: trade.cardPoints, note, byToken });
    if (ledgers.length) await tx.ledger.createMany({ data: ledgers });

    // 凍結動產：接受 → 過戶給收受方並解凍；拒絕 / 取消 → 僅解凍（自動回到原擁有者有效清單）
    const lockedItems = await tx.teamItem.findMany({
      where: { lockedTradeId: trade.id },
      include: { asset: true },
    });
    if (lockedItems.length) {
      if (action === "accept") {
        await tx.teamItem.updateMany({
          where: { lockedTradeId: trade.id },
          data: { teamId: trade.toTeamId, lockedTradeId: null },
        });
      } else {
        await tx.teamItem.updateMany({ where: { lockedTradeId: trade.id }, data: { lockedTradeId: null } });
      }
      const itemLedgers: Prisma.LedgerCreateManyInput[] = [];
      for (const it of lockedItems) {
        if (action === "accept") {
          itemLedgers.push({ teamId: trade.fromTeamId, kind: "items", delta: 0, note: `動產轉出：${it.asset.name} → ${to?.name}`, byToken });
          itemLedgers.push({ teamId: trade.toTeamId, kind: "items", delta: 0, note: `動產收入：${it.asset.name}（來自 ${from?.name}）`, byToken });
        } else {
          itemLedgers.push({ teamId: trade.fromTeamId, kind: "items", delta: 0, note: `動產退回：${it.asset.name}（${action === "reject" ? "對方拒絕" : "自行取消"}）`, byToken });
        }
      }
      await tx.ledger.createMany({ data: itemLedgers });
    }

    // ALLIANCE_BONUS：交易接受時，只要任一方持有，交易雙方「各」得固定光幣
    if (action === "accept") {
      const allianceItems = await tx.teamItem.findMany({
        where: { teamId: { in: [trade.fromTeamId, trade.toTeamId] }, ...ACTIVE_ITEM, asset: { effectType: "ALLIANCE_BONUS" } },
        include: { asset: true },
      });
      const allianceUsedIds: number[] = [];
      for (const item of allianceItems) {
        const bonus = applyAllianceBonus(item.asset.effectValue);
        if (bonus <= 0) continue;
        // 雙方各得一份（持有者的這張道具同時惠及對方）
        for (const teamId of [trade.fromTeamId, trade.toTeamId]) {
          await tx.team.update({ where: { id: teamId }, data: { coins: { increment: bonus } } });
          await logLedger(tx, { teamId, kind: "coins", delta: bonus, note: "交易聯盟紅利", byToken });
        }
        allianceUsedIds.push(item.id);
      }
      if (allianceUsedIds.length) await decrementUses(tx, allianceUsedIds);
    }

    return { ok: true, action };
  });
}

// ── 卡牌商店 ─────────────────────────────────────────────────
// 賣一張功能卡。展示的 3 張由前端隨機抽（純展示），故售出以「卡種類」為準。
export async function sellCard(params: { teamId: number; cardType: string; byToken?: string }) {
  const { teamId, cardType, byToken } = params;
  return prisma.$transaction(async (tx) => {
    const card = await tx.functionCard.findUnique({ where: { type: cardType } });
    if (!card) throw new Error("找不到該功能卡");
    if (card.remaining <= 0) throw new Error("該卡已售完");
    const team = await tx.team.findUnique({ where: { id: teamId } });
    if (!team) throw new Error("找不到小隊");
    if (team.cardPoints < card.cost) throw new Error(`卡牌點數不足（需 ${card.cost}）`);
    await tx.team.update({ where: { id: teamId }, data: { cardPoints: { decrement: card.cost } } });
    await tx.functionCard.update({ where: { type: card.type }, data: { remaining: { decrement: 1 } } });
    await logLedger(tx, { teamId, kind: "cardPoints", delta: -card.cost, note: `購買功能卡 ${card.type}`, byToken });
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
    const baseFee = lotteryFee(owned);
    // 動產 LOTTERY_FEE_DISCOUNT：加購費折扣（delta 為負，多張相加；夾到 0）
    const discountEffect = await loadActiveEffects(tx, teamId, "LOTTERY_FEE_DISCOUNT");
    const fee = baseFee > 0 ? applyLotteryFeeDiscount(baseFee, discountEffect.delta) : 0;
    const team = await tx.team.findUnique({ where: { id: teamId } });
    if (!team) throw new Error("找不到小隊");
    if (team.coins < fee) throw new Error(`光幣不足（加購費 ${fee}）`);
    if (fee > 0) {
      await tx.team.update({ where: { id: teamId }, data: { coins: { decrement: fee } } });
      await logLedger(tx, { teamId, kind: "lottery", delta: -fee, note: `大樂透加購 ${number} 號${fee < baseFee ? `（原 ${baseFee}，折扣後 ${fee}）` : ""}`, byToken });
    }
    if (baseFee > 0) await decrementUses(tx, discountEffect.usedIds);
    await tx.lotteryNumber.create({ data: { period: state.lotteryPeriod, number, teamId } });
    const poolAdd = fee * 2; // 加購費 *2 入池
    await tx.gameState.update({ where: { id: 1 }, data: { lotteryPool: { increment: poolAdd } } });
    return { ok: true, fee, poolAdd };
  });
}

export async function drawLottery(params: { byToken?: string }) {
  const { byToken } = params;
  return prisma.$transaction(async (tx) => {
    const state = await getState(tx);
    const number = Math.floor(Math.random() * 50) + 1;

    const allNumbers = await tx.lotteryNumber.findMany({ where: { period: state.lotteryPeriod } });
    const hit = allNumbers.find((n) => n.number === number) ?? null;

    if (!hit) {
      await tx.gameState.update({ where: { id: 1 }, data: { lotteryPool: { increment: 1000 } } });
      return { number, winnerTeamId: null, basePool: state.lotteryPool, finalPool: state.lotteryPool + 1000 };
    }

    const basePool = state.lotteryPool;

    // LOTTERY_BONUS：中獎者獎金加成
    const bonusEffect = await loadActiveEffects(tx, hit.teamId, "LOTTERY_BONUS");
    const finalPool = applyLotteryBonus(basePool, bonusEffect.delta);

    await tx.team.update({ where: { id: hit.teamId }, data: { coins: { increment: finalPool } } });
    await logLedger(tx, {
      teamId: hit.teamId,
      kind: "lottery",
      delta: finalPool,
      note: `大樂透中獎 ${number} 號${finalPool !== basePool ? `（原 ${basePool}，動產加成）` : ""}`,
      byToken,
    });
    await decrementUses(tx, bonusEffect.usedIds);

    // JACKPOT_SHARE：其他隊自動抽成（從銀行出，不影響中獎者）
    const allItems = await tx.teamItem.findMany({
      where: { ...ACTIVE_ITEM },
      include: { asset: true },
    });
    const shareUsedIds: number[] = [];
    for (const item of allItems) {
      if (item.asset.effectType !== "JACKPOT_SHARE") continue;
      const cut = applyJackpotShare(basePool, item.asset.effectValue);
      if (cut <= 0) continue;
      await tx.team.update({ where: { id: item.teamId }, data: { coins: { increment: cut } } });
      await logLedger(tx, { teamId: item.teamId, kind: "lottery", delta: cut, note: `大樂透抽成 ${number} 號`, byToken });
      shareUsedIds.push(item.id);
    }
    if (shareUsedIds.length) await decrementUses(tx, shareUsedIds);

    // LOTTERY_INSURANCE：有人中獎時，其他持有保險的隊退還本期登記費用（一次性）
    const insuranceItems = allItems.filter(
      (i) => i.asset.effectType === "LOTTERY_INSURANCE" && i.teamId !== hit.teamId,
    );
    const insuranceUsedIds: number[] = [];
    for (const item of insuranceItems) {
      const teamNumbers = allNumbers.filter((n) => n.teamId === item.teamId);
      if (!teamNumbers.length) continue;
      let refund = 0;
      for (let i = 1; i < teamNumbers.length; i++) refund += lotteryFee(i);
      if (refund <= 0) continue;
      await tx.team.update({ where: { id: item.teamId }, data: { coins: { increment: refund } } });
      await logLedger(tx, { teamId: item.teamId, kind: "lottery", delta: refund, note: `大樂透保險退費 ${refund} 光幣`, byToken });
      insuranceUsedIds.push(item.id);
    }
    if (insuranceUsedIds.length) await decrementUses(tx, insuranceUsedIds);

    // 清空本期、開新一期、獎金池重設 1000
    await tx.lotteryNumber.deleteMany({ where: { period: state.lotteryPeriod } });
    await tx.gameState.update({
      where: { id: 1 },
      data: { lotteryPeriod: { increment: 1 }, lotteryPool: 1000 },
    });
    return { number, winnerTeamId: hit.teamId, basePool, finalPool };
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

// ── 好運卡 / 厄運卡（含動產效果）────────────────────────────────
export async function applyGoodCard(params: {
  teamId: number;
  baseReward: number; // 卡面原始獎勵（正數）
  note: string;
  byToken?: string;
}) {
  const { teamId, baseReward, note, byToken } = params;
  return prisma.$transaction(async (tx) => {
    const bonusEffect = await loadActiveEffects(tx, teamId, "GOOD_CARD_BONUS");
    let afterBonus = applyGoodCardReward(baseReward, bonusEffect.delta);

    // WHEEL_ON_GOOD_CARD：好運卡獎勵 × 輪盤結果
    const wheelItems = await tx.teamItem.findMany({
      where: { teamId, ...ACTIVE_ITEM },
      include: { asset: true },
    });
    const wheelOnCardItem = wheelItems.find((i) => i.asset.effectType === "WHEEL_ON_GOOD_CARD");
    let wheelMult: number | null = null;
    let wheelUsedIds: number[] = [];
    if (wheelOnCardItem && afterBonus > 0) {
      wheelMult = spinWheelCustom();
      afterBonus = Math.round(afterBonus * wheelMult);
      wheelUsedIds = [wheelOnCardItem.id];
    }

    const finalReward = Math.max(0, afterBonus);
    if (finalReward > 0) {
      await tx.team.update({ where: { id: teamId }, data: { coins: { increment: finalReward } } });
    }
    await decrementUses(tx, [...bonusEffect.usedIds, ...wheelUsedIds]);
    const noteWithWheel = wheelMult !== null ? `${note}（輪盤 ×${wheelMult}）` : note;
    const lid = await logLedger(tx, { teamId, kind: "coins", delta: finalReward, note: noteWithWheel, byToken });
    const undo: UndoRecipe = { label: noteWithWheel, ledgerIds: [lid] };
    return { ok: true, baseReward, finalReward, wheelMult, undo };
  });
}

export async function applyBadCard(params: {
  teamId: number;
  basePenalty: number; // 卡面原始懲罰（正數，內部取負）
  note: string;
  byToken?: string;
}) {
  const { teamId, basePenalty, note, byToken } = params;
  return prisma.$transaction(async (tx) => {
    const reduceEffect = await loadActiveEffects(tx, teamId, "BAD_CARD_REDUCE");
    // reduceEffect.delta 為負數；-1.0 = 完全免疫
    const finalPenalty = applyBadCardPenalty(basePenalty, reduceEffect.delta);
    if (finalPenalty > 0) {
      await tx.team.update({ where: { id: teamId }, data: { coins: { decrement: finalPenalty } } });
    }
    await decrementUses(tx, reduceEffect.usedIds);
    const lid = await logLedger(tx, { teamId, kind: "coins", delta: -finalPenalty, note, byToken });
    const undo: UndoRecipe = { label: note, ledgerIds: [lid] };
    return { ok: true, basePenalty, finalPenalty, undo };
  });
}

// ── 流動關主獎勵（含 DOUBLE_OR_NOTHING）────────────────────────
export async function applyMobileReward(params: {
  teamId: number;
  coins?: number;
  cardPoints?: number;
  note?: string;
  byToken?: string;
}) {
  const { teamId, coins = 0, cardPoints = 0, note, byToken } = params;
  if (coins === 0 && cardPoints === 0) throw new Error("沒有任何變動");
  return prisma.$transaction(async (tx) => {
    const team = await tx.team.findUnique({ where: { id: teamId } });
    if (!team) throw new Error("找不到小隊");

    // DOUBLE_OR_NOTHING：50/50 雙倍或歸零（僅影響光幣）
    let finalCoins = coins;
    let doubled: boolean | null = null;
    if (coins > 0) {
      const dItems = await tx.teamItem.findMany({
        where: { teamId, ...ACTIVE_ITEM },
        include: { asset: true },
      });
      const dItem = dItems.find((i) => i.asset.effectType === "DOUBLE_OR_NOTHING");
      if (dItem) {
        doubled = Math.random() < 0.5;
        finalCoins = doubled ? coins * 2 : 0;
        await decrementUses(tx, [dItem.id]);
      }
    }

    if (team.coins + finalCoins < 0) throw new Error("光幣不足");
    if (team.cardPoints + cardPoints < 0) throw new Error("卡牌點數不足");
    await tx.team.update({
      where: { id: teamId },
      data: { coins: { increment: finalCoins }, cardPoints: { increment: cardPoints } },
    });
    const noteOut = doubled !== null
      ? `${note ?? "流動獎勵"}（${doubled ? "雙倍！" : "歸零…"}）`
      : (note ?? "流動獎勵");
    const ledgerIds: number[] = [];
    if (finalCoins !== 0) ledgerIds.push(await logLedger(tx, { teamId, kind: "coins", delta: finalCoins, note: noteOut, byToken }));
    if (cardPoints !== 0) ledgerIds.push(await logLedger(tx, { teamId, kind: "cardPoints", delta: cardPoints, note: noteOut, byToken }));
    const undo: UndoRecipe = { label: noteOut, ledgerIds };
    return { ok: true, baseCoins: coins, finalCoins, cardPoints, doubled, undo };
  });
}

// ── 動產：授予 / 過戶 / 失效 / 每輪收益 ─────────────────────────
export async function grantItem(params: {
  teamId: number;
  assetId: number;
  hiddenValue?: number;
  note?: string;
  byToken?: string;
}) {
  const { teamId, assetId, hiddenValue = 0, note, byToken } = params;
  return prisma.$transaction(async (tx) => {
    const team = await tx.team.findUnique({ where: { id: teamId } });
    if (!team) throw new Error("找不到小隊");
    const asset = await tx.movableAsset.findUnique({ where: { id: assetId } });
    if (!asset) throw new Error("找不到動產");
    const item = await tx.teamItem.create({
      data: { teamId, assetId, hiddenValue, note, usesRemaining: asset.defaultUses ?? null },
      include: { asset: true },
    });
    await logLedger(tx, {
      teamId,
      kind: "items",
      delta: 0,
      note: `取得動產：${asset.name}（${asset.grade} 級）${note ? `，${note}` : ""}`,
      byToken,
    });
    return { ok: true, item };
  });
}

export async function transferItem(params: {
  itemId: number;
  toTeamId: number;
  byToken?: string;
}) {
  const { itemId, toTeamId, byToken } = params;
  return prisma.$transaction(async (tx) => {
    const item = await tx.teamItem.findUnique({ where: { id: itemId }, include: { asset: true } });
    if (!item) throw new Error("找不到動產");
    if (!item.active) throw new Error("該動產已失效");
    if (item.lockedTradeId != null) throw new Error("該動產交易凍結中");
    if (item.teamId === toTeamId) throw new Error("來源與目標相同");
    const toTeam = await tx.team.findUnique({ where: { id: toTeamId } });
    if (!toTeam) throw new Error("找不到目標小隊");
    const fromTeamId = item.teamId;
    await tx.teamItem.update({ where: { id: itemId }, data: { teamId: toTeamId } });
    await logLedger(tx, { teamId: fromTeamId, kind: "items", delta: 0, note: `動產轉出：${item.asset.name} → ${toTeam.name}`, byToken });
    await logLedger(tx, { teamId: toTeamId,   kind: "items", delta: 0, note: `動產收入：${item.asset.name}（來自隊伍 #${fromTeamId}）`, byToken });
    return { ok: true };
  });
}

export async function deactivateItem(params: { itemId: number; byToken?: string }) {
  const { itemId, byToken } = params;
  return prisma.$transaction(async (tx) => {
    const item = await tx.teamItem.findUnique({ where: { id: itemId }, include: { asset: true } });
    if (!item) throw new Error("找不到動產");
    if (!item.active) throw new Error("該動產已失效");
    if (item.lockedTradeId != null) throw new Error("該動產交易凍結中");
    await tx.teamItem.update({ where: { id: itemId }, data: { active: false } });
    await logLedger(tx, { teamId: item.teamId, kind: "items", delta: 0, note: `動產失效：${item.asset.name}`, byToken });
    return { ok: true };
  });
}

// 海盜旗：鎖定目標（markTeamId）。一次性 —— 一旦鎖定即不可更改。
export async function setPiracyMark(params: { itemId: number; markTeamId: number; byToken?: string }) {
  const { itemId, markTeamId, byToken } = params;
  return prisma.$transaction(async (tx) => {
    const item = await tx.teamItem.findUnique({ where: { id: itemId }, include: { asset: true } });
    if (!item) throw new Error("找不到動產");
    if (!item.active) throw new Error("該動產已失效");
    if (item.lockedTradeId != null) throw new Error("該動產交易凍結中");
    if (item.asset.effectType !== "PIRACY") throw new Error("此動產無法鎖定目標");
    if (item.markTeamId != null) throw new Error("印記已鎖定目標，無法更改");
    if (markTeamId === item.teamId) throw new Error("不能標記自己");
    const target = await tx.team.findUnique({ where: { id: markTeamId } });
    if (!target) throw new Error("找不到目標小隊");
    await tx.teamItem.update({ where: { id: itemId }, data: { markTeamId } });
    await logLedger(tx, {
      teamId: item.teamId,
      kind: "items",
      delta: 0,
      note: `俠盜印記鎖定：${target.name}`,
      byToken,
    });
    return { ok: true, markTeamId };
  });
}

// 由關主手動觸發（一回合一次・單一小隊）：發放該隊每輪收益，並消耗其有次數的提醒（REMINDER）。
export async function distributeRoundIncome(params: { teamId: number; byToken?: string }) {
  const { teamId, byToken } = params;
  return prisma.$transaction(async (tx) => {
    // 只處理選定小隊的道具（UNDERDOG 排名仍需全場淨值，於下方另計）
    const items = await tx.teamItem.findMany({ where: { teamId, ...ACTIVE_ITEM }, include: { asset: true } });

    const ROUND_TYPES = new Set(["COINS_PER_ROUND", "COMPOUND_INTEREST", "PROPERTY_DIVIDEND", "UNDERDOG"]);
    const roundItems = items.filter((i) => ROUND_TYPES.has(i.asset.effectType));
    const reminderItems = items.filter((i) => i.asset.effectType === "REMINDER");
    // 有次數的提醒道具：每結算一回合 −1 次（永久型 usesRemaining=null 不受影響）
    const reminderUsedIds = reminderItems.filter((i) => i.usesRemaining != null).map((i) => i.id);
    // 永久提醒也算「有道具」，按下結算仍視為成功（僅無動作）
    if (!roundItems.length && !reminderItems.length) {
      throw new Error("該小隊無每輪收益或提醒道具");
    }

    // 額外資料：COMPOUND_INTEREST 需要 coins；PROPERTY_DIVIDEND + UNDERDOG 需要不動產現值 + 排名
    const teams = await tx.team.findMany();
    const state = await getState(tx);
    const activeEvents = parseActiveEvents(state.activeEvents);
    const properties = await tx.property.findMany();

    const teamPropValue = new Map<number, number>();
    for (const p of properties) {
      if (p.ownerTeamId == null) continue;
      const v = currentValue(p, activeEvents, state.event4Penalty);
      teamPropValue.set(p.ownerTeamId, (teamPropValue.get(p.ownerTeamId) ?? 0) + v);
    }

    const teamNetWorth = new Map<number, number>();
    for (const t of teams) {
      teamNetWorth.set(t.id, t.coins + (teamPropValue.get(t.id) ?? 0));
    }
    const minNW = Math.min(...teamNetWorth.values());
    const lastPlaceIds = new Set([...teamNetWorth.entries()].filter(([, nw]) => nw === minNW).map(([id]) => id));

    const incomeMap = new Map<number, { total: number; ids: number[] }>();
    const addIncome = (teamId: number, amount: number, itemId: number) => {
      if (amount <= 0) return;
      const cur = incomeMap.get(teamId) ?? { total: 0, ids: [] };
      cur.total += amount;
      cur.ids.push(itemId);
      incomeMap.set(teamId, cur);
    };

    for (const item of roundItems) {
      const type = item.asset.effectType;
      const val = item.asset.effectValue;
      const team = teams.find((t) => t.id === item.teamId);
      if (!team) continue;

      if (type === "COINS_PER_ROUND") {
        addIncome(item.teamId, applyRoundIncome(val), item.id);
      } else if (type === "COMPOUND_INTEREST") {
        addIncome(item.teamId, applyCompoundInterest(team.coins, val), item.id);
      } else if (type === "PROPERTY_DIVIDEND") {
        addIncome(item.teamId, applyPropertyDividend(teamPropValue.get(item.teamId) ?? 0, val), item.id);
      } else if (type === "UNDERDOG") {
        if (lastPlaceIds.has(item.teamId)) addIncome(item.teamId, Math.round(val), item.id);
        // 未末位時效果不觸發，不消耗次數
      }
    }

    const results: { teamId: number; income: number }[] = [];
    for (const [teamId, { total, ids }] of incomeMap) {
      await tx.team.update({ where: { id: teamId }, data: { coins: { increment: total } } });
      await logLedger(tx, { teamId, kind: "coins", delta: total, note: "每輪動產收益", byToken });
      await decrementUses(tx, ids);
      results.push({ teamId, income: total });
    }
    // 消耗有次數的提醒（與發放收益同一次按鈕）
    if (reminderUsedIds.length) await decrementUses(tx, reminderUsedIds);
    return { ok: true, results, remindersTicked: reminderUsedIds.length };
  });
}

// ── 反悔：撤銷剛剛的關主操作（幾秒內、限本站）─────────────────
// 設計：前端在操作回應裡拿到 UndoRecipe（ledgerIds + 選用的不動產原狀態），
// 幾秒內按「撤銷」就把這些 ledger 列照 -delta 回沖。金額一律由伺服器端
// 的 ledger 列反推，不信任前端帶來的數字；不動產則還原成記錄的原狀態。
const UNDO_WINDOW_MS = 30_000;

export async function undoAction(params: {
  ledgerIds: number[];
  property?: { id: number; ownerTeamId: number | null; level: number };
  properties?: { id: number; ownerTeamId: number | null; level: number }[];
  byToken?: string;
  isAdmin?: boolean;
}) {
  const { ledgerIds, property, properties, byToken, isAdmin } = params;
  const ids = [...new Set((ledgerIds ?? []).filter((n) => Number.isInteger(n)))];
  if (!ids.length) throw new Error("沒有可撤銷的項目");

  return prisma.$transaction(async (tx) => {
    const rows = await tx.ledger.findMany({ where: { id: { in: ids } } });
    if (rows.length !== ids.length) throw new Error("找不到對應紀錄");

    const now = Date.now();
    for (const r of rows) {
      if (r.reversed) throw new Error("此操作已撤銷或已沖銷");
      if (!isAdmin && r.byToken !== byToken) throw new Error("只能撤銷本站的操作");
      if (now - r.createdAt.getTime() > UNDO_WINDOW_MS) throw new Error("已超過可撤銷時限");
    }

    // 金錢：照 ledger 列的 -delta 回沖，並寫一筆補償分錄（與沖銷一致）
    for (const r of rows) {
      if (r.teamId && r.delta !== 0) {
        const field = r.kind === "cardPoints" ? "cardPoints" : "coins";
        await tx.team.update({
          where: { id: r.teamId },
          data: { [field]: { increment: -r.delta } },
        });
        await logLedger(tx, {
          teamId: r.teamId,
          kind: r.kind,
          delta: -r.delta,
          note: `撤銷 #${r.id}：${r.note ?? ""}`,
          byToken,
        });
      }
      await tx.ledger.update({ where: { id: r.id }, data: { reversed: true } });
    }

    // 不動產：還原成操作前的持有 / 等級（單筆 + 多筆並存）
    const toRestore = [...(property ? [property] : []), ...(properties ?? [])];
    for (const p of toRestore) {
      if (!Number.isInteger(p.id)) continue;
      await tx.property.update({
        where: { id: p.id },
        data: { ownerTeamId: p.ownerTeamId ?? null, level: p.level },
      });
    }

    return { ok: true, undone: ids.length };
  });
}

// ── 拍賣系統 ─────────────────────────────────────────────────
// 主持喊價式英式拍賣：小隊在現場喊價，拍賣官是唯一輸入價格的人（手機端不出價）。
// AuctionEvent（場次，建立即顯示公告橫幅）→ AuctionLot（逐件拍賣，一次一件 LIVE）。

// 建立拍賣場次：建立即顯示公告（announcement）給小隊。
// 未指定 announcement 時，預設顯示「5 分鐘後開始」的提醒橫幅。
export const DEFAULT_AUCTION_ANNOUNCEMENT = "拍賣將於 5 分鐘後開始，請準備！";
export async function createAuctionEvent(params: {
  name: string;
  announcement?: string;
  byToken?: string;
}) {
  const { name, byToken } = params;
  // undefined → 用預設；明確傳空字串 "" → 尊重「不顯示橫幅」
  const announcement = params.announcement ?? DEFAULT_AUCTION_ANNOUNCEMENT;
  const event = await prisma.auctionEvent.create({
    data: { name, announcement, status: "OPEN" },
  });
  await prisma.ledger.create({
    data: { kind: "auction", delta: 0, note: `建立拍賣場次：${name}`, byToken },
  });
  return { ok: true, event };
}

// 更新公告文字（空字串＝清除橫幅但場次仍在）。
export async function updateAnnouncement(params: {
  eventId: number;
  announcement: string;
  byToken?: string;
}) {
  const { eventId, announcement } = params;
  const event = await prisma.auctionEvent.findUnique({ where: { id: eventId } });
  if (!event) throw new Error("找不到拍賣場次");
  if (event.status === "ENDED") throw new Error("場次已結束");
  const updated = await prisma.auctionEvent.update({
    where: { id: eventId },
    data: { announcement },
  });
  return { ok: true, event: updated };
}

// 結束拍賣：清掉公告橫幅；若仍有 LIVE 拍賣品則擋下，要求先成交 / 流標。
export async function endAuctionEvent(params: { eventId: number; byToken?: string }) {
  const { eventId, byToken } = params;
  return prisma.$transaction(async (tx) => {
    const event = await tx.auctionEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new Error("找不到拍賣場次");
    const live = await tx.auctionLot.findFirst({
      where: { eventId, status: "LIVE" },
    });
    if (live) throw new Error("仍有拍賣品進行中，請先成交或流標");
    await tx.auctionEvent.update({
      where: { id: eventId },
      data: { status: "ENDED", announcement: "", endedAt: new Date() },
    });
    await logLedger(tx, { kind: "auction", delta: 0, note: `結束拍賣場次：${event.name}`, byToken });
    return { ok: true };
  });
}

// 建立拍賣品（DRAFT）。ITEM 需有效動產模板；PROPERTY 需未售出不動產。
export async function createAuctionLot(params: {
  eventId: number;
  title: string;
  description?: string;
  lotType?: string;
  assetId?: number | null;
  propertyId?: number | null;
  hiddenValue?: number;
  startPrice?: number;
  orderIndex?: number;
  byToken?: string;
}) {
  const {
    eventId,
    title,
    description = "",
    lotType = "CUSTOM",
    assetId = null,
    propertyId = null,
    hiddenValue = 0,
    startPrice = 0,
    orderIndex = 0,
  } = params;
  return prisma.$transaction(async (tx) => {
    const event = await tx.auctionEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new Error("找不到拍賣場次");
    if (event.status === "ENDED") throw new Error("場次已結束，無法新增拍賣品");

    if (lotType === "ITEM") {
      if (assetId == null) throw new Error("動產拍賣品需指定動產");
      const asset = await tx.movableAsset.findUnique({ where: { id: assetId } });
      if (!asset) throw new Error("找不到動產");
    } else if (lotType === "PROPERTY") {
      if (propertyId == null) throw new Error("不動產拍賣品需指定不動產");
      const prop = await tx.property.findUnique({ where: { id: propertyId } });
      if (!prop) throw new Error("找不到不動產");
      if (prop.ownerTeamId != null) throw new Error("該不動產已售出，無法拍賣");
    } else if (lotType !== "CUSTOM") {
      throw new Error("不支援的拍賣品類型");
    }

    const lot = await tx.auctionLot.create({
      data: {
        eventId,
        title,
        description,
        lotType,
        assetId: lotType === "ITEM" ? assetId : null,
        propertyId: lotType === "PROPERTY" ? propertyId : null,
        hiddenValue: lotType === "ITEM" ? hiddenValue : 0,
        startPrice,
        currentBid: startPrice,
        orderIndex,
        status: "DRAFT",
      },
    });
    return { ok: true, lot };
  });
}

// 開始拍賣某件：全場僅能有一件 LIVE。
export async function openAuctionLot(params: { lotId: number; byToken?: string }) {
  const { lotId, byToken } = params;
  return prisma.$transaction(async (tx) => {
    const lot = await tx.auctionLot.findUnique({ where: { id: lotId } });
    if (!lot) throw new Error("找不到拍賣品");
    if (lot.status !== "DRAFT") throw new Error("此拍賣品已開始或已結束");
    const event = await tx.auctionEvent.findUnique({ where: { id: lot.eventId } });
    if (!event || event.status === "ENDED") throw new Error("所屬場次未開放");
    const live = await tx.auctionLot.findFirst({ where: { status: "LIVE" } });
    if (live) throw new Error("已有拍賣品進行中，請先成交或流標");
    const updated = await tx.auctionLot.update({
      where: { id: lotId },
      data: { status: "LIVE", currentBid: lot.startPrice },
    });
    await logLedger(tx, { kind: "auction", delta: 0, note: `開始拍賣：${lot.title}`, byToken });
    return { ok: true, lot: updated };
  });
}

// 開始「下一件」：依 orderIndex 取場次中第一個尚未拍賣（DRAFT）的拍賣品並開拍。
// 拍賣官只要一顆按鈕跑完整個清單，不必逐件點開。全場仍僅能有一件 LIVE。
export async function openNextLot(params: { eventId: number; byToken?: string }) {
  const { eventId, byToken } = params;
  return prisma.$transaction(async (tx) => {
    const event = await tx.auctionEvent.findUnique({ where: { id: eventId } });
    if (!event || event.status === "ENDED") throw new Error("所屬場次未開放");
    const live = await tx.auctionLot.findFirst({ where: { status: "LIVE" } });
    if (live) throw new Error("已有拍賣品進行中，請先成交或流標");
    const next = await tx.auctionLot.findFirst({
      where: { eventId, status: "DRAFT" },
      orderBy: [{ orderIndex: "asc" }, { id: "asc" }],
    });
    if (!next) throw new Error("清單已無待拍的拍賣品");
    const updated = await tx.auctionLot.update({
      where: { id: next.id },
      data: { status: "LIVE", currentBid: next.startPrice },
    });
    await logLedger(tx, { kind: "auction", delta: 0, note: `開始拍賣：${next.title}`, byToken });
    return { ok: true, lot: updated };
  });
}

// 喊價：拍賣官把目前價提高（小隊喊、拍賣官輸入）。不記名、不記帳，落槌才扣款。
export async function bumpBid(params: { lotId: number; amount: number; byToken?: string }) {
  const { lotId, amount } = params;
  return prisma.$transaction(async (tx) => {
    const lot = await tx.auctionLot.findUnique({ where: { id: lotId } });
    if (!lot) throw new Error("找不到拍賣品");
    if (lot.status !== "LIVE") throw new Error("此拍賣品尚未開始或已結束");
    if (amount <= lot.currentBid) throw new Error(`出價需高於目前價 ${lot.currentBid}`);
    const updated = await tx.auctionLot.update({
      where: { id: lotId },
      data: { currentBid: amount },
    });
    return { ok: true, currentBid: updated.currentBid };
  });
}

// 落槌成交：以目前價賣給指定小隊，自動扣光幣（餘額不足則擋下），並依類型交付。
export async function hammerLot(params: {
  lotId: number;
  winnerTeamId: number;
  byToken?: string;
}) {
  const { lotId, winnerTeamId, byToken } = params;
  return prisma.$transaction(async (tx) => {
    const lot = await tx.auctionLot.findUnique({ where: { id: lotId } });
    if (!lot) throw new Error("找不到拍賣品");
    if (lot.status !== "LIVE") throw new Error("此拍賣品尚未開始或已結束");
    const price = lot.currentBid;
    const winner = await tx.team.findUnique({ where: { id: winnerTeamId } });
    if (!winner) throw new Error("找不到得標小隊");
    if (winner.coins < price) throw new Error(`${winner.name} 光幣不足（需 ${price}，僅有 ${winner.coins}）`);

    const ledgerIds: number[] = [];
    // 扣款
    await tx.team.update({ where: { id: winnerTeamId }, data: { coins: { decrement: price } } });
    ledgerIds.push(
      await logLedger(tx, {
        teamId: winnerTeamId,
        kind: "auction",
        delta: -price,
        note: `拍得 ${lot.title}`,
        byToken,
      }),
    );

    // 依類型交付
    if (lot.lotType === "ITEM" && lot.assetId != null) {
      const asset = await tx.movableAsset.findUnique({ where: { id: lot.assetId } });
      if (!asset) throw new Error("找不到動產");
      await tx.teamItem.create({
        data: {
          teamId: winnerTeamId,
          assetId: lot.assetId,
          hiddenValue: lot.hiddenValue,
          usesRemaining: asset.defaultUses ?? null,
          note: `拍賣取得：${lot.title}`,
        },
      });
    } else if (lot.lotType === "PROPERTY" && lot.propertyId != null) {
      const prop = await tx.property.findUnique({ where: { id: lot.propertyId } });
      if (!prop) throw new Error("找不到不動產");
      if (prop.ownerTeamId != null) throw new Error("該不動產已售出");
      await tx.property.update({ where: { id: lot.propertyId }, data: { ownerTeamId: winnerTeamId } });
    }

    await tx.auctionLot.update({
      where: { id: lotId },
      data: {
        status: "SOLD",
        winnerTeamId,
        finalPrice: price,
        soldAt: new Date(),
        ledgerIds: ledgerIds.join(","),
      },
    });

    const undo: UndoRecipe = { label: `落槌 ${lot.title}`, ledgerIds };
    return { ok: true, price, undo };
  });
}

// 撤銷落槌：退款、收回交付的動產 / 不動產、把拍賣品退回 LIVE。
export async function undoHammer(params: { lotId: number; byToken?: string; isAdmin?: boolean }) {
  const { lotId, byToken, isAdmin } = params;
  return prisma.$transaction(async (tx) => {
    const lot = await tx.auctionLot.findUnique({ where: { id: lotId } });
    if (!lot) throw new Error("找不到拍賣品");
    if (lot.status !== "SOLD" || lot.winnerTeamId == null) throw new Error("此拍賣品尚未成交");

    const ids = lot.ledgerIds
      .split(",")
      .map((s) => parseInt(s, 10))
      .filter((n) => Number.isInteger(n));
    const rows = await tx.ledger.findMany({ where: { id: { in: ids } } });
    const now = Date.now();
    for (const r of rows) {
      if (r.reversed) throw new Error("此成交已撤銷");
      if (!isAdmin && r.byToken !== byToken) throw new Error("只能撤銷本站的操作");
      if (now - r.createdAt.getTime() > UNDO_WINDOW_MS) throw new Error("已超過可撤銷時限");
    }

    // 退款（照 -delta 回沖）
    for (const r of rows) {
      if (r.teamId && r.delta !== 0) {
        await tx.team.update({ where: { id: r.teamId }, data: { coins: { increment: -r.delta } } });
        await logLedger(tx, {
          teamId: r.teamId,
          kind: "auction",
          delta: -r.delta,
          note: `撤銷落槌 #${r.id}：${r.note ?? ""}`,
          byToken,
        });
      }
      await tx.ledger.update({ where: { id: r.id }, data: { reversed: true } });
    }

    // 收回交付物
    if (lot.lotType === "ITEM" && lot.assetId != null) {
      const granted = await tx.teamItem.findFirst({
        where: { teamId: lot.winnerTeamId, assetId: lot.assetId, note: `拍賣取得：${lot.title}` },
        orderBy: { id: "desc" },
      });
      if (granted) await tx.teamItem.delete({ where: { id: granted.id } });
    } else if (lot.lotType === "PROPERTY" && lot.propertyId != null) {
      await tx.property.update({ where: { id: lot.propertyId }, data: { ownerTeamId: null } });
    }

    // 退回 LIVE，重新喊價
    await tx.auctionLot.update({
      where: { id: lotId },
      data: { status: "LIVE", winnerTeamId: null, finalPrice: null, soldAt: null, ledgerIds: "" },
    });
    return { ok: true };
  });
}

// 流標：無人出價時結束此件（不成交）。
export async function passLot(params: { lotId: number; byToken?: string }) {
  const { lotId, byToken } = params;
  return prisma.$transaction(async (tx) => {
    const lot = await tx.auctionLot.findUnique({ where: { id: lotId } });
    if (!lot) throw new Error("找不到拍賣品");
    if (lot.status !== "LIVE") throw new Error("此拍賣品尚未開始或已結束");
    await tx.auctionLot.update({ where: { id: lotId }, data: { status: "PASSED" } });
    await logLedger(tx, { kind: "auction", delta: 0, note: `流標：${lot.title}`, byToken });
    return { ok: true };
  });
}

// 取消未開始的拍賣品（DRAFT 才能取消）。
export async function cancelLot(params: { lotId: number; byToken?: string }) {
  const { lotId } = params;
  return prisma.$transaction(async (tx) => {
    const lot = await tx.auctionLot.findUnique({ where: { id: lotId } });
    if (!lot) throw new Error("找不到拍賣品");
    if (lot.status !== "DRAFT") throw new Error("只能取消尚未開始的拍賣品");
    await tx.auctionLot.update({ where: { id: lotId }, data: { status: "CANCELLED" } });
    return { ok: true };
  });
}
