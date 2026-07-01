// 遊戲規則與資料（單一事實來源）

export type RegionCode = "AURORA" | "SPECTRA" | "EMBER" | "HAVEN";

export const REGIONS: { code: RegionCode; name: string; theme: string }[] = [
  { code: "AURORA", name: "極光金域", theme: "金融 / 商業 / 交易" },
  { code: "SPECTRA", name: "靈序研究", theme: "科技 / 資料 / 通訊" },
  { code: "EMBER", name: "影焰工域", theme: "能源 / 製造 / 物流" },
  { code: "HAVEN", name: "晨霧棲城", theme: "住宅 / 醫療 / 教育" },
];

// 四區具象化配色（深色霓虹）：極光金=琥珀、靈序=賽博藍、影焰=工業紅、晨霧=翡翠
export const REGION_UI: Record<
  RegionCode,
  { text: string; border: string; chipBg: string; panel: string; dot: string }
> = {
  AURORA: {
    text: "text-amber-400",
    border: "border-amber-500/40",
    chipBg: "bg-amber-500/15 text-amber-300",
    panel: "from-amber-500/15 to-transparent border-amber-500/30",
    dot: "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]",
  },
  SPECTRA: {
    text: "text-cyan-400",
    border: "border-cyan-500/40",
    chipBg: "bg-cyan-500/15 text-cyan-300",
    panel: "from-cyan-500/15 to-transparent border-cyan-500/30",
    dot: "bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]",
  },
  EMBER: {
    text: "text-rose-500",
    border: "border-rose-600/40",
    chipBg: "bg-rose-500/15 text-rose-300",
    panel: "from-rose-600/15 to-transparent border-rose-600/30",
    dot: "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]",
  },
  HAVEN: {
    text: "text-emerald-400",
    border: "border-emerald-500/40",
    chipBg: "bg-emerald-500/15 text-emerald-300",
    panel: "from-emerald-500/15 to-transparent border-emerald-500/30",
    dot: "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]",
  },
};

export const REGION_NAME: Record<RegionCode, string> = {
  AURORA: "極光金域",
  SPECTRA: "靈序研究",
  EMBER: "影焰工域",
  HAVEN: "晨霧棲城",
};

// 初始價一律採「四區域不動產表」
export const PROPERTY_SEED: {
  name: string;
  region: RegionCode;
  type: string;
  basePrice: number;
}[] = [
  // 價格基準：以 1000 起始光幣校準。中位數約 750（起始買得起約 1 塊），
  // 整區壟斷約需 6000（6×起始），讓 10 隊競逐時各區維持競爭、不易被單隊速壟斷。
  // 極光金域
  { name: "星展銀行", region: "AURORA", type: "金融", basePrice: 850 },
  { name: "光幣當舖", region: "AURORA", type: "金融", basePrice: 550 },
  { name: "IM百貨", region: "AURORA", type: "商業", basePrice: 550 },
  { name: "公館黃金商圈", region: "AURORA", type: "商業", basePrice: 600 },
  { name: "小福廣場", region: "AURORA", type: "商業", basePrice: 450 },
  { name: "禮賢郵局", region: "AURORA", type: "投資", basePrice: 750 },
  { name: "光軌公館站", region: "AURORA", type: "商貿", basePrice: 550 },
  { name: "集思會議中心", region: "AURORA", type: "展覽", basePrice: 700 },
  // 靈序研究
  { name: "管圖實驗室", region: "SPECTRA", type: "研究", basePrice: 700 },
  { name: "Illuminate 科技總部", region: "SPECTRA", type: "研究", basePrice: 900 },
  { name: "科技大樓", region: "SPECTRA", type: "通訊", basePrice: 850 },
  { name: "中央研究院", region: "SPECTRA", type: "通訊", basePrice: 850 },
  { name: "總圖資料庫中心", region: "SPECTRA", type: "資料", basePrice: 750 },
  { name: "Google 台北 101 辦公室", region: "SPECTRA", type: "資料", basePrice: 900 },
  { name: "Gemini 研發處", region: "SPECTRA", type: "AI", basePrice: 600 },
  { name: "沃思資訊所", region: "SPECTRA", type: "網路", basePrice: 700 },
  // 影焰工域
  { name: "NVIDIA 台灣分公司", region: "EMBER", type: "材料", basePrice: 1000 },
  { name: "德田半導體中心", region: "EMBER", type: "材料", basePrice: 1000 },
  { name: "台電大樓", region: "EMBER", type: "製造", basePrice: 700 },
  { name: "台積電人才培育所", region: "EMBER", type: "製造", basePrice: 850 },
  { name: "寶藏巖", region: "EMBER", type: "原料", basePrice: 750 },
  { name: "光軌台電大樓站", region: "EMBER", type: "物流", basePrice: 750 },
  { name: "水源貨櫃碼頭", region: "EMBER", type: "物流", basePrice: 850 },
  { name: "水源儲倉", region: "EMBER", type: "物流", basePrice: 700 },
  // 晨霧棲城
  { name: "長興住宅苑", region: "HAVEN", type: "住宅", basePrice: 750 },
  { name: "大安森林公園", region: "HAVEN", type: "住宅", basePrice: 750 },
  { name: "太子學舍", region: "HAVEN", type: "住宅", basePrice: 700 },
  { name: "醫學圖書館", region: "HAVEN", type: "教育", basePrice: 750 },
  { name: "醉月湖小學", region: "HAVEN", type: "教育", basePrice: 750 },
  { name: "博雅療養院", region: "HAVEN", type: "醫療", basePrice: 900 },
  { name: "大安運動中心", region: "HAVEN", type: "運動", basePrice: 700 },
  { name: "118 咖啡巷", region: "HAVEN", type: "飲食", basePrice: 700 },
];

// 市場事件倍率（只取企畫書的「% 效果」，初始價一律用四區域表）
// regionMult：整區倍率；typeMult：類型額外倍率（可與整區疊乘）
export type EventDef = {
  index: number;
  name: string;
  news: string;
  regionMult: Partial<Record<RegionCode, number>>;
  typeMult: Record<string, number>;
  // 事件四：對「主持人選定的區域」額外套用此倍率
  hostPenaltyMult?: number;
};

export const EVENTS: Record<number, EventDef> = {
  1: {
    index: 1,
    name: "事件一：晨霧退散，資金湧入金域",
    news: "極光金域上漲，晨霧棲城下跌。",
    regionMult: { AURORA: 1.25, HAVEN: 0.9 },
    typeMult: { 金融: 1.1, 商業: 1.1, 投資: 1.1, 商貿: 1.1, 展覽: 1.1 },
  },
  2: {
    index: 2,
    name: "事件二：影焰工廠爆產，污染疑雲",
    news: "影焰工域上漲，住宅與教育下跌；光靈系統啟動。",
    regionMult: { EMBER: 1.3 },
    typeMult: { 能源: 1.1, 製造: 1.1, 物流: 1.1, 住宅: 0.85, 教育: 0.85 },
  },
  3: {
    index: 3,
    name: "事件三：靈序突破，科技資產暴漲",
    news: "靈序研究上漲，傳統商業服務下跌；流動關站開始機率發特殊骰。",
    regionMult: { SPECTRA: 1.3 },
    typeMult: {
      研究: 1.1,
      資料: 1.1,
      通訊: 1.1,
      AI: 1.1,
      網路: 1.1,
      商業: 0.9,
      飲食: 0.9,
    },
  },
  4: {
    index: 4,
    name: "事件四：城市民生補助，棲城翻身",
    news: "晨霧棲城上漲，前次漲最多區域下跌；政府拍賣啟動。",
    regionMult: { HAVEN: 1.3 },
    typeMult: { 住宅: 1.1, 醫療: 1.1, 教育: 1.1 },
    hostPenaltyMult: 0.85,
  },
};

export function parseActiveEvents(csv: string): number[] {
  return csv
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n));
}

// 計算單一不動產現值
export function currentValue(
  prop: {
    basePrice: number;
    region: string;
    type: string;
    cardRegionMult?: number;
    cardBuildingMult?: number;
    monopolyBonusMult?: number;
  },
  activeEvents: number[],
  event4Penalty?: string | null,
  opts?: { havenLiveMult?: number },
): number {
  let v = prop.basePrice;
  for (const idx of activeEvents) {
    const ev = EVENTS[idx];
    if (!ev) continue;
    const rm = ev.regionMult[prop.region as RegionCode];
    if (rm) v *= rm;
    const tm = ev.typeMult[prop.type];
    if (tm) v *= tm;
    if (idx === 4 && ev.hostPenaltyMult && event4Penalty === prop.region) {
      v *= ev.hostPenaltyMult;
    }
  }
  v *= prop.cardRegionMult ?? 1;
  v *= prop.cardBuildingMult ?? 1;
  v *= prop.monopolyBonusMult ?? 1;
  v *= opts?.havenLiveMult ?? 1;
  return Math.round(v);
}

// 玩家實際支付 / 收取的金額一律四捨五入到 10 光幣，方便現場交易所人工找零，
// 同時保留百分比運算的精度（不影響 currentValue 等「帳面數值」，那些維持精確）。
export function roundTo10(n: number): number {
  return Math.round(n / 10) * 10;
}

// 過路費基礎費率：獨佔隊該區不動產（升級後價值）總和 × TOLL_RATE（再四捨五入到 10）。
// 調整此值即可整體升降全場過路費（道具 TOLL_INCOME / TOLL_PAID 仍以此為基準疊加）。
// 採 8%：因為「升級」已直接計入結算淨值（見 investedValue），蓋房本身即回本，
// 過路費不再是升級的唯一理由，故壓低為純粹的現金流 / 騷擾收入，避免 10 隊賽局中過度滾雪球。
export const TOLL_RATE = 0.08;

// 升級費率（單一事實來源）：0→1=base×20%、1→2=40%、2→3=60%。
// upgradeFee（實付費用）與 investedValue（結算本金）都以此為準，確保「投入＝淨值」。
export const UPGRADE_RATES = [0.2, 0.4, 0.6] as const;

// 升級費用：傳入「目前等級」回傳升到下一級的費用（四捨五入到 10）；level 3 不可再升。
export function upgradeFee(basePrice: number, currentLevel: number): number | null {
  const rate = UPGRADE_RATES[currentLevel];
  if (rate === undefined) return null;
  return roundTo10(basePrice * rate);
}

// 本金倍率：把「已升級到 level」累積投入折算成 base 的倍數。
// lvl0=1.0、lvl1=1.2、lvl2=1.6、lvl3=2.2（＝ 1 + 0.2 + 0.4 + 0.6）。
export function investedPrincipalMult(level: number): number {
  let m = 1;
  for (let i = 0; i < level; i++) m += UPGRADE_RATES[i] ?? 0;
  return m;
}

// ── 結算 / 淨值用「投入本金市值」──────────────────────────────
// 把「買價 + 各級升級費」當成本金（以 base 計），再隨市場事件浮動：
//   investedValue = base × investedPrincipalMult(level) × 事件倍率
// 結果≈該隊實際投入的光幣（升級＝買價同等對待，無 k 加成），且會隨事件漲跌，
// 故「買在高點、事件回跌」會虧損 —— 不動產最終市值受事件影響（符合企畫書）。
export function investedValue(
  prop: {
    basePrice: number; region: string; type: string; level: number;
    cardRegionMult?: number; cardBuildingMult?: number; monopolyBonusMult?: number;
  },
  activeEvents: number[],
  event4Penalty?: string | null,
  opts?: { havenLiveMult?: number },
): number {
  // 取「事件 + 永久倍率 + 即時層」的總乘數（以 base=1000 正規化），再乘 base × 本金倍率。
  const mult =
    currentValue(
      { basePrice: 1000, region: prop.region, type: prop.type,
        cardRegionMult: prop.cardRegionMult, cardBuildingMult: prop.cardBuildingMult,
        monopolyBonusMult: prop.monopolyBonusMult },
      activeEvents, event4Penalty, opts,
    ) / 1000;
  return Math.round(prop.basePrice * investedPrincipalMult(prop.level) * mult);
}

// ── 過路費用「升級加成市值」（仍用 k=0.5，過路費＝蓋房的主要回報）──────────
// 過路費比淨值更陡地獎勵升級：壟斷 + 過路費才是蓋房的主要誘因。
// leveledValue = currentValue ×（1 + LEVEL_VALUE_BONUS × level）。
export const LEVEL_VALUE_BONUS = 0.5;
export function leveledValue(
  prop: {
    basePrice: number; region: string; type: string; level: number;
    cardRegionMult?: number; cardBuildingMult?: number; monopolyBonusMult?: number;
  },
  activeEvents: number[],
  event4Penalty?: string | null,
  opts?: { havenLiveMult?: number },
): number {
  return currentValue(prop, activeEvents, event4Penalty, opts) * (1 + LEVEL_VALUE_BONUS * prop.level);
}

// ── 區域獨佔被動效果對應（每區專屬一個）──
export type MonopolyEffect = "COIN_1_5X" | "CARD_POINTS" | "UPGRADE_BOOST" | "APPRECIATION";
export const REGION_MONOPOLY_EFFECT: Record<RegionCode, MonopolyEffect> = {
  AURORA: "COIN_1_5X",
  SPECTRA: "CARD_POINTS",
  EMBER: "UPGRADE_BOOST",
  HAVEN: "APPRECIATION",
};

// 獨佔被動效果的中文顯示字（無 emoji；投影與頁面徽章共用）。
export function monopolyEffectText(
  effect: MonopolyEffect,
  opts: { auroraMultiplier: number; spectraCardPoints: number },
): string {
  switch (effect) {
    case "COIN_1_5X":     return `光幣 ×${opts.auroraMultiplier}`;
    case "CARD_POINTS":   return `每回合 +${opts.spectraCardPoints} 卡點`;
    case "UPGRADE_BOOST": return "升級加速";
    case "APPRECIATION":  return "不動產增值";
  }
}

// HAVEN 慢慢漲：線性即時倍率。since 為該隊開始獨佔 HAVEN 的 epochMs。
export function havenAppreciationMult(
  sinceEpochMs: number, now: number, intervalMs: number, rate: number,
): number {
  if (sinceEpochMs <= 0 || now <= sinceEpochMs || intervalMs <= 0) return 1;
  const units = Math.floor((now - sinceEpochMs) / intervalMs);
  return 1 + units * rate;
}

// 1/2/3 房每回合被動營收（光幣）：依現值 × 級別費率，四捨五入到個位。level0 不發。
export function houseIncome(
  currentVal: number, level: number, rates: readonly [number, number, number],
): number {
  if (level < 1 || level > 3) return 0;
  return Math.round(currentVal * rates[level - 1]);
}

// 純疊乘：供 service 疊卡牌倍率用。
export function applyCardRegionMult(current: number, factor: number): number {
  return current * factor;
}

// 大樂透加購費：50 × 2^(已登記號碼數 - 1)；第一個免費
export function lotteryFee(alreadyOwnedCount: number): number {
  if (alreadyOwnedCount <= 0) return 0;
  return 50 * Math.pow(2, alreadyOwnedCount - 1);
}

// 命運投資輪盤倍率與機率（x5 低機率）
export const WHEEL_OUTCOMES: { mult: number; weight: number }[] = [
  { mult: 0, weight: 25 },
  { mult: 0.5, weight: 20 },
  { mult: 1, weight: 35 },
  { mult: 2, weight: 10 },
  { mult: 5, weight: 3 },
  { mult: 10, weight: 2 },
];

export function spinWheel(): number {
  const total = WHEEL_OUTCOMES.reduce((s, o) => s + o.weight, 0);
  let r = Math.random() * total;
  for (const o of WHEEL_OUTCOMES) {
    if (r < o.weight) return o.mult;
    r -= o.weight;
  }
  return 1;
}

// 好運卡「命運眷顧」免費輪盤的名目投入額：以此為基準乘上輪盤倍率，
// 取「淨變動但不低於 0」——白拿的好運卡只會賺、不會倒扣（×0／×0.5 只是少賺）。
export const FREE_WHEEL_STAKE = 500;

// 名目投入 stake 轉一次輪盤，回傳「淨入帳光幣」（夾在 ≥0）。供 service 與 UI 預覽共用。
export function freeWheelReward(stake: number, mult: number): number {
  return Math.max(0, Math.round(stake * mult) - stake);
}

// ── 動產效果系統 ─────────────────────────────────────────────────
// const 物件 enum 模式：值即字串，與 Prisma String 欄位直接比較
export const EffectType = {
  TOLL_INCOME:       "TOLL_INCOME",       // 收取過路費加成（+0.15 → +15%）
  TOLL_PAID:         "TOLL_PAID",         // 支付過路費減免（-0.10 → -10%）
  SHOP_PRICE:        "SHOP_PRICE",        // 不動產購買 / 升級折扣（-0.10 → -10%；僅限不動產）
  MYSTERY_SHOP_PRICE:"MYSTERY_SHOP_PRICE",// 神秘商店折扣（動產 + 功能卡）（-0.50 → 5 折）
  PROPERTY_VALUE:    "PROPERTY_VALUE",    // 持有不動產淨值加成（+0.10 → +10%）
  COINS_PER_ROUND:   "COINS_PER_ROUND",   // 每回合固定光幣（50 → +50/輪）
  TAX_COLLECTOR:     "TAX_COLLECTOR",     // 全場每筆過路費抽成（0.02 → 2%）
  GOOD_CARD_BONUS:   "GOOD_CARD_BONUS",   // 好運卡獎勵加成（+0.20 → +20%）
  BAD_CARD_REDUCE:   "BAD_CARD_REDUCE",   // 厄運卡懲罰減免（-0.50 → -50%；-1.0 → 免疫）
  WHEEL_BONUS:       "WHEEL_BONUS",       // 輪盤淨獲利加成（+0.50 → 獲利 ×1.5）
  WHEEL_NO_ZERO:     "WHEEL_NO_ZERO",     // 移除輪盤 ×0 結果（保底不輸本）
  WHEEL_STAKE_BOOST: "WHEEL_STAKE_BOOST", // 輪盤投入上限提升（+0.10 → 最多押 20% 資金）
  WHEEL_ON_GOOD_CARD:"WHEEL_ON_GOOD_CARD",// 好運卡獎勵 × 輪盤結果
  LOTTERY_BONUS:     "LOTTERY_BONUS",     // 大樂透中獎倍率加成（+0.50 → 獎金 ×1.5）
  JACKPOT_SHARE:     "JACKPOT_SHARE",     // 任意隊中獎時自動抽成（0.05 → 5% 獎金池）
  LOTTERY_INSURANCE: "LOTTERY_INSURANCE", // 他隊中獎時退還本期登記費用（一次性）
  LOTTERY_FEE_DISCOUNT: "LOTTERY_FEE_DISCOUNT", // 大樂透加購號碼費用折扣（-0.50 → 加購費 5 折）
  COMPOUND_INTEREST: "COMPOUND_INTEREST", // 每回合賺取現有光幣 X%（0.02 → 2%/輪）
  PROPERTY_DIVIDEND: "PROPERTY_DIVIDEND", // 每回合賺取不動產現值 X%（0.03 → 3%/輪）
  UNDERDOG:          "UNDERDOG",          // 末位時每回合獲得固定補貼（200 → 末位時 +200/輪）
  DOUBLE_OR_NOTHING: "DOUBLE_OR_NOTHING", // 流動關主發獎時 50/50：雙倍或歸零
  ALLIANCE_BONUS:    "ALLIANCE_BONUS",    // 交易接受時雙方各獲固定光幣（50 → 各 +50）
  PIRACY:            "PIRACY",            // 俠盜印記・懸賞標記：被標記隊收過路費時抽成（僅當俠盜較窮才生效）
  MOVEMENT:          "MOVEMENT",          // 主動移動道具：關主在遊戲地圖按鈕觸發，改變本次擲骰步數（見 MovementMode）
  REMINDER:          "REMINDER",          // 無計算，僅提醒關主
  CARD_BLOCK:        "CARD_BLOCK",        // 詛咒：禁止對其他隊伍出功能卡（前端封鎖出卡操作），解咒後解除
} as const;
export type EffectType = typeof EffectType[keyof typeof EffectType];

export const EFFECT_TYPE_LABELS: Record<EffectType, string> = {
  TOLL_INCOME:       "過路費加成",
  TOLL_PAID:         "過路費減免",
  SHOP_PRICE:        "不動產折扣",
  MYSTERY_SHOP_PRICE:"神秘商店折扣",
  PROPERTY_VALUE:    "不動產增值",
  COINS_PER_ROUND:   "每回合收益",
  TAX_COLLECTOR:     "全場稅收",
  GOOD_CARD_BONUS:   "好運卡加成",
  BAD_CARD_REDUCE:   "厄運卡減免",
  WHEEL_BONUS:       "輪盤加成",
  WHEEL_NO_ZERO:     "輪盤保底",
  WHEEL_STAKE_BOOST: "輪盤上限提升",
  WHEEL_ON_GOOD_CARD:"好運卡輪盤",
  LOTTERY_BONUS:     "樂透加成",
  JACKPOT_SHARE:     "樂透抽成",
  LOTTERY_INSURANCE: "樂透保險",
  LOTTERY_FEE_DISCOUNT: "樂透加購折扣",
  COMPOUND_INTEREST: "複利收益",
  PROPERTY_DIVIDEND: "不動產分紅",
  UNDERDOG:          "末位補貼",
  DOUBLE_OR_NOTHING: "雙倍或歸零",
  ALLIANCE_BONUS:    "交易紅利",
  PIRACY:            "海盜旗",
  MOVEMENT:          "主動移動",
  REMINDER:          "提醒（無計算）",
  CARD_BLOCK:        "詛咒・封卡",
};

// ── 主動移動道具（MOVEMENT）─────────────────────────────────
// MOVEMENT 道具不被動結算，而是由關主在「遊戲地圖」擲骰前後按鈕主動觸發。
// 觸發模式存在 MovableAsset.condition（JSON：{"move":<mode>}），強度存 effectValue。
//   BOOST  → 本次步數 +effectValue（例如 +2）
//   SET    → 本次步數直接設為 effectValue（例如指定走 6）
//   DOUBLE → 本次步數 ×2（effectValue 不用）
export const MovementMode = {
  BOOST:  "BOOST",
  SET:    "SET",
  DOUBLE: "DOUBLE",
} as const;
export type MovementMode = typeof MovementMode[keyof typeof MovementMode];

export const MOVEMENT_MODE_LABELS: Record<MovementMode, string> = {
  BOOST:  "加步",
  SET:    "指定步數",
  DOUBLE: "步數加倍",
};

// 解析 MOVEMENT 道具的觸發模式（從 condition JSON）。預設 BOOST。
export function movementMode(condition: string | null): MovementMode {
  if (!condition) return MovementMode.BOOST;
  try {
    const c = JSON.parse(condition) as { move?: MovementMode };
    return c.move && c.move in MOVEMENT_MODE_LABELS ? c.move : MovementMode.BOOST;
  } catch {
    return MovementMode.BOOST;
  }
}

// 套用某 MOVEMENT 道具於目前步數，回傳觸發後的「最終前進步數」（單一事實來源；service 與 UI 共用）。
// 結果夾在 1..BOARD_SIZE-1（至少前進 1 格，至多繞一圈內）。
export function applyMovement(mode: MovementMode, effectValue: number, currentSteps: number): number {
  let next: number;
  switch (mode) {
    case MovementMode.SET:    next = Math.round(effectValue); break;
    case MovementMode.DOUBLE: next = currentSteps * 2; break;
    case MovementMode.BOOST:
    default:                  next = currentSteps + Math.round(effectValue); break;
  }
  return Math.max(1, Math.min(BOARD_SIZE - 1, next));
}

// MOVEMENT 道具的精簡符號（徽章用）：BOOST→「+2」、SET→「=6」、DOUBLE→「×2」。
export function movementActionLabel(mode: MovementMode, effectValue: number): string {
  switch (mode) {
    case MovementMode.SET:    return `=${Math.round(effectValue)}`;
    case MovementMode.DOUBLE: return "×2";
    case MovementMode.BOOST:
    default:                  return `+${Math.round(effectValue)}`;
  }
}

export const ITEM_GRADE_COLORS: Record<string, string> = {
  S: "text-amber-300 border-amber-400/60 bg-amber-500/10",
  A: "text-violet-300 border-violet-400/60 bg-violet-500/10",
  B: "text-slate-300 border-slate-400/40 bg-white/5",
  C: "text-rose-300 border-rose-400/40 bg-rose-500/5", // 詛咒道具專用稀有度
};

// 稀有度排序權重：S < A < B < C（數字越小越靠前）；未知級別排最後。
const GRADE_RANK: Record<string, number> = { S: 0, A: 1, B: 2, C: 3 };
export function GRADE_ORDER(grade: string): number {
  return GRADE_RANK[grade] ?? 99;
}

// 疊加效果：同類效果直接相加（道具數量由發放端控管，不用遞減）
// e.g. [0.20, 0.20, 0.08] → 0.48
export function stackEffects(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0);
}

// ── 動產效果套用公式（單一事實來源；service.ts / snapshot.ts / UI 共用）──
// 每個 effectType 對應一條純函式，輸入金額與 delta、輸出最終金額。

// SHOP_PRICE：購買 / 升級價（折後價再套道具折扣，不低於 0）
export function applyShopPrice(price: number, delta: number): number {
  return Math.max(0, Math.round(price * (1 + delta)));
}

// TOLL_INCOME（獨佔隊加成）+ TOLL_PAID（付款隊減免）：守恆過路費，不低於 0
export function applyToll(baseToll: number, incomeDelta: number, paidDelta: number): number {
  return Math.max(0, Math.round(baseToll * (1 + incomeDelta + paidDelta)));
}

// PROPERTY_VALUE：不動產結算淨值加成，不低於 0
export function applyPropertyValue(value: number, delta: number): number {
  return Math.max(0, Math.round(value * (1 + delta)));
}

// GOOD_CARD_BONUS：好運卡獎勵加成（baseReward 為 0 時不發）
export function applyGoodCardReward(baseReward: number, bonusDelta: number): number {
  return baseReward > 0 ? Math.max(0, Math.round(baseReward * (1 + bonusDelta))) : 0;
}

// BAD_CARD_REDUCE：厄運卡懲罰減免（-1.0 = 完全免疫），不低於 0
export function applyBadCardPenalty(basePenalty: number, reduceDelta: number): number {
  return basePenalty > 0 ? Math.max(0, Math.round(basePenalty * (1 + reduceDelta))) : 0;
}

// TAX_COLLECTOR：對單筆過路費抽成（totalRate = 各道具 rate 直接相加），不低於 0
export function applyTaxCut(baseToll: number, totalRate: number): number {
  return Math.max(0, Math.round(baseToll * totalRate));
}

// COINS_PER_ROUND：每回合固定收益（total = 各道具光幣直接相加）
export function applyRoundIncome(total: number): number {
  return Math.round(total);
}

// WHEEL_BONUS：輪盤淨獲利加成（delta > 0 才套；虧損不放大）
export function applyWheelBonus(delta: number, bonusDelta: number): number {
  if (delta <= 0) return delta;
  return Math.round(delta * (1 + bonusDelta));
}

// WHEEL_STAKE_BOOST：提高輪盤最大投入上限
// baseRate = 0.1（10%）；boostDelta = +0.10 → 允許押 20% 資金
export function applyWheelMaxStake(coins: number, boostDelta: number): number {
  return Math.max(500, Math.floor(coins * (0.1 + boostDelta)));
}

// LOTTERY_BONUS：中獎時放大獎金
export function applyLotteryBonus(pool: number, bonusDelta: number): number {
  return Math.round(pool * (1 + bonusDelta));
}

// JACKPOT_SHARE：按比例抽取獎金池
export function applyJackpotShare(pool: number, rate: number): number {
  return Math.max(0, Math.round(pool * rate));
}

// LOTTERY_FEE_DISCOUNT：大樂透加購費折扣（delta 為負，多張直接相加；夾到 0）
export function applyLotteryFeeDiscount(fee: number, discountDelta: number): number {
  return Math.max(0, Math.round(fee * (1 + discountDelta)));
}

// COMPOUND_INTEREST：按現有光幣計算利息
export function applyCompoundInterest(coins: number, rate: number): number {
  return Math.max(0, Math.round(coins * rate));
}

// PROPERTY_DIVIDEND：按不動產現值計算分紅
export function applyPropertyDividend(propertyValue: number, rate: number): number {
  return Math.max(0, Math.round(propertyValue * rate));
}

// PIRACY：海盜旗抽成（從被標記隊收到的過路費抽走比例）
export function applyPiracy(toll: number, rate: number): number {
  return Math.max(0, Math.round(toll * rate));
}

// ALLIANCE_BONUS：交易接受時雙方各得固定光幣（effectValue 即光幣數）
export function applyAllianceBonus(effectValue: number): number {
  return Math.max(0, Math.round(effectValue));
}

// spinWheelCustom：支援排除指定倍率（WHEEL_NO_ZERO 用）
export function spinWheelCustom(options?: { excludeMultipliers?: number[] }): number {
  const outcomes = options?.excludeMultipliers?.length
    ? WHEEL_OUTCOMES.filter((o) => !options.excludeMultipliers!.includes(o.mult))
    : WHEEL_OUTCOMES;
  if (!outcomes.length) return 1; // 全排除的極端情況
  const total = outcomes.reduce((s, o) => s + o.weight, 0);
  let r = Math.random() * total;
  for (const o of outcomes) {
    if (r < o.weight) return o.mult;
    r -= o.weight;
  }
  return outcomes[outcomes.length - 1].mult;
}

// 動產模板種子資料（seeded to DB via prisma/seed.ts）
// defaultUses: null=永久；n=效果觸發 n 次後失效
// 神秘商店：依等級給定預設售價（光幣）與上架庫存。admin 可逐項覆寫。
export const ITEM_GRADE_PRICE: Record<string, number> = { S: 2000, A: 1000, B: 400, C: 0 };
export const DEFAULT_SHOP_STOCK = 2; // 每件動產預設上架 2 個

// 詛咒道具不該擺上商店（偽裝成 B 級的負面效果），seed 時 shopStock 設 0。
// 含舊版偽裝詛咒道具與詛咒卡（CURSE_CARDS）專屬的詛咒道具。
export const CURSED_ASSET_NAMES = new Set([
  "管圖的廢棄麻將桌", "必修衝堂", "機車違停拖吊單",
  "詛咒：光幣", "詛咒：過路費", "詛咒：功能卡",
]);

// 好運卡「神秘禮物」發放的「神秘商店五折券」：1 次性 MYSTERY_SHOP_PRICE −50%，
// 自動套用到下一次「神秘商店購買動產或功能卡」（見 service.buyShopItem / sellCard）。
// 非賣品（shopStock 設 0），seed 時與詛咒道具一樣不上架。
export const GIFT_VOUCHER_NAME = "神秘商店五折券";

export const MOVABLE_ASSET_SEED: {
  name: string;
  grade: string;
  effectType: EffectType;
  effectValue: number;
  condition: string | null;
  description: string;
  defaultUses: number | null;
}[] = [
  // 主題化道具：台大資管 / 台灣迷因風味；效果沿用原數值慣例。
  // 排除 DOUBLE_OR_NOTHING、WHEEL_ON_GOOD_CARD 兩種效果。
  // ── S 級：高價收藏 / 強力永久效果 ──
  { name: "台大資管入場券",       grade: "S", effectType: "PROPERTY_VALUE",   effectValue:  0.25, condition: null, defaultUses: null, description: "持有不動產結算淨值 +25%（永久）— 進場即王道" },
  { name: "百歲台大紀念金幣",     grade: "S", effectType: "COMPOUND_INTEREST", effectValue:  0.03, condition: null, defaultUses: null, description: "每回合賺取現有光幣 3%（永久）— 百年積累的複利" },
  { name: "1BTC",                 grade: "S", effectType: "WHEEL_BONUS",       effectValue:  0.50, condition: null, defaultUses: null, description: "輪盤淨獲利 +50%（永久，虧損不放大）— 高風險高報酬" },
  { name: "蒙娜麗莎",             grade: "S", effectType: "PROPERTY_DIVIDEND", effectValue:  0.08, condition: null, defaultUses: null, description: "每回合賺取不動產現值 8%（永久）— 無價名畫的展出分紅" },
  { name: "台積電股票",           grade: "S", effectType: "LOTTERY_BONUS",     effectValue:  0.50, condition: null, defaultUses: null, description: "大樂透中獎金額 +50%（永久）— 護國神山" },
  { name: "[不揪]著作權",         grade: "S", effectType: "TAX_COLLECTOR",     effectValue:  0.04, condition: null, defaultUses: null, description: "全場每筆過路費自動抽成 4%（永久）— 版稅抽成" },
  { name: "限量IM金徽章",         grade: "S", effectType: "JACKPOT_SHARE",     effectValue:  0.05, condition: null, defaultUses: null, description: "大樂透任意隊中獎時自動獲 5% 獎金池（永久）— 榮譽抽成" },
  { name: "台大校長簽名信",       grade: "S", effectType: "TOLL_INCOME",       effectValue:  0.25, condition: null, defaultUses: 3,    description: "收取過路費時額外 +25%（3 次）— 校長加持收租" },
  { name: "黃仁勳簽名顯卡",       grade: "S", effectType: "WHEEL_BONUS",       effectValue:  0.50, condition: null, defaultUses: null, description: "輪盤淨獲利 +50%（永久）— AI 算力之神" },
  { name: "陶朱隱園的花園",     grade: "S", effectType: "PROPERTY_VALUE",    effectValue:  0.25, condition: null, defaultUses: null, description: "持有不動產結算淨值 +25%（永久）— 蛋黃區地王" },
  { name: "孫生媽媽的名牌包",     grade: "S", effectType: "PIRACY",            effectValue:  0.10, condition: null, defaultUses: null, description: "懸賞標記一支敵隊，其收過路費時你抽 10%（僅當你較窮才生效・永久）— 名牌包不是買的，是「討」來的" },
  // ── A 級：中堅效果 ──
  { name: "0050",                 grade: "A", effectType: "COMPOUND_INTEREST", effectValue:  0.01, condition: null, defaultUses: null, description: "每回合賺取現有光幣 1%（永久）— 穩穩的分紅" },
  { name: "F1賽車",               grade: "A", effectType: "MOVEMENT",          effectValue:  2,    condition: "{\"move\":\"BOOST\"}",  defaultUses: null, description: "【主動】關主於遊戲地圖觸發：本次擲骰步數 +2（永久）— 油門踩到底" },
  { name: "捷運悠遊卡",           grade: "A", effectType: "MOVEMENT",          effectValue:  6,    condition: "{\"move\":\"SET\"}",    defaultUses: 3,    description: "【主動】關主於遊戲地圖觸發：本次直接指定走 6 步（3 次）— 班班準點直達" },
  { name: "校門口計程車",         grade: "B", effectType: "MOVEMENT",          effectValue:  0,    condition: "{\"move\":\"DOUBLE\"}", defaultUses: 1,    description: "【主動】關主於遊戲地圖觸發：本次擲骰步數加倍（1 次）— 趕時間就跳表衝" },
  { name: "資管之夜門票",         grade: "A", effectType: "ALLIANCE_BONUS",    effectValue:  100,  condition: null, defaultUses: 3,    description: "交易接受時雙方各獲 100 光幣（3 次）— 之夜的人脈" },
  { name: "公路車",               grade: "A", effectType: "TOLL_PAID",         effectValue: -0.25, condition: null, defaultUses: 3,    description: "支付過路費減少 25%（3 次）— 自己騎不搭車" },
  { name: "iPhone 18 Pro",        grade: "A", effectType: "TOLL_INCOME",       effectValue:  0.15, condition: null, defaultUses: 2,    description: "收取過路費時額外 +15%（2 次）— 最潮收款機" },
  { name: "電動麻將桌",           grade: "A", effectType: "COINS_PER_ROUND",   effectValue:  100,  condition: null, defaultUses: null, description: "每回合固定收益 100 光幣（永久）— 自動開桌抽水" },
  { name: "林昀儒桌球拍金標",     grade: "A", effectType: "WHEEL_NO_ZERO",     effectValue:  0,    condition: null, defaultUses: 2,    description: "輪盤保底，×0 不會出現（2 次）— 穩定發揮不失常" },
  { name: "台北-台南高鐵票",      grade: "A", effectType: "SHOP_PRICE",        effectValue: -0.15, condition: null, defaultUses: 2,    description: "購買 / 升級不動產費用 -15%（2 次）— 南北置產通勤" },
  { name: "健身房回數票x30",      grade: "A", effectType: "UNDERDOG",          effectValue:  200,  condition: null, defaultUses: null, description: "每回合若為末位獲 200 光幣補貼（永久）— 逆境健身翻身" },
  { name: "學長姐筆記共筆",       grade: "A", effectType: "GOOD_CARD_BONUS",   effectValue:  0.20, condition: null, defaultUses: 2,    description: "好運卡獎勵 +20%（2 次）— 共筆神助攻" },
  { name: "全勤獎學金",           grade: "A", effectType: "COINS_PER_ROUND",   effectValue:  100,  condition: null, defaultUses: null, description: "每回合固定收益 100 光幣（永久）— 不缺席的回報" },
  { name: "圖書館閉館座位",       grade: "A", effectType: "WHEEL_NO_ZERO",     effectValue:  0,    condition: null, defaultUses: 2,    description: "輪盤保底，×0 不會出現（2 次）— 穩到不出包" },
  { name: "期末 All-pass 香",     grade: "A", effectType: "UNDERDOG",          effectValue:  200,  condition: null, defaultUses: null, description: "每回合若為末位獲 200 光幣補貼（永久）— 低空翻身" },
  { name: "賭徒硬幣",           grade: "A", effectType: "WHEEL_STAKE_BOOST", effectValue:  0.20, condition: null, defaultUses: null, description: "輪盤最大投入上限增加 20%（永久）— 高進低出，梭哈魂" },
  // ── B 級：消耗品 / 小加成（食物、二手、生活）──
  { name: "手工薩克斯風",         grade: "B", effectType: "COINS_PER_ROUND",   effectValue:  50,   condition: null, defaultUses: null, description: "每回合固定收益 50 光幣（永久）— 街頭打賞" },
  { name: "水源阿伯二手腳踏車",   grade: "B", effectType: "TOLL_PAID",         effectValue: -0.10, condition: null, defaultUses: 1,    description: "支付過路費減少 10%（1 次）— 二手代步" },
  { name: "辛殿單人免費券",       grade: "B", effectType: "GOOD_CARD_BONUS",   effectValue:  0.20, condition: null, defaultUses: 1,    description: "好運卡獎勵 +20%（1 次）— 吃好料補運" },
  { name: "歐趴糖",               grade: "B", effectType: "LOTTERY_INSURANCE", effectValue:  1,    condition: null, defaultUses: 1,    description: "大樂透他隊中獎時退還本期登記費用（一次性）— 保你不虧" },
  { name: "台大牛奶",             grade: "B", effectType: "GOOD_CARD_BONUS",   effectValue:  0.10, condition: null, defaultUses: 1,    description: "好運卡獎勵 +10%（1 次）— 喝牛奶補運氣" },
  { name: "微積分考古題",         grade: "B", effectType: "LOTTERY_FEE_DISCOUNT", effectValue: -0.50, condition: null, defaultUses: null, description: "大樂透加購號碼費用 5 折（永久）— 算準明牌" },
  { name: "黑麥汁",               grade: "B", effectType: "BAD_CARD_REDUCE",   effectValue: -0.50, condition: null, defaultUses: 1,    description: "厄運卡懲罰減少 50%（1 次）— 黑麥汁壓壓驚" },
  { name: "日本單人來回機票",     grade: "B", effectType: "BAD_CARD_REDUCE",   effectValue: -1.0,  condition: null, defaultUses: 1,    description: "厄運卡懲罰完全免疫（1 次）— 出國避難" },
  { name: "女九滷味",             grade: "B", effectType: "TOLL_PAID",         effectValue: -0.10, condition: null, defaultUses: 1,    description: "支付過路費 -10%（1 次）— 宵夜續命" },
  { name: "大杯珍奶",             grade: "B", effectType: "GOOD_CARD_BONUS",   effectValue:  0.10, condition: null, defaultUses: 1,    description: "好運卡獎勵 +10%（1 次）— 半糖去冰補運" },
  { name: "五十嵐買一送一",       grade: "B", effectType: "SHOP_PRICE",        effectValue: -0.08, condition: null, defaultUses: 1,    description: "購買 / 升級費用 -8%（1 次）— 撿便宜" },
  { name: "轉角哥雞排",           grade: "B", effectType: "BAD_CARD_REDUCE",   effectValue: -0.50, condition: null, defaultUses: 1,    description: "厄運卡懲罰 -50%（1 次）— 雞排壓驚" },
  { name: "微積分作業解答",         grade: "B", effectType: "LOTTERY_FEE_DISCOUNT", effectValue: -0.50, condition: null, defaultUses: null, description: "大樂透加購 5 折（永久）— 抄到明牌" },
  // ── 非賣品：好運卡「神秘禮物」發放的神秘商店五折券（shopStock=0，不上架、不參與隨機抽）──
  { name: GIFT_VOUCHER_NAME,      grade: "A", effectType: "MYSTERY_SHOP_PRICE", effectValue: -0.50, condition: null, defaultUses: 1,    description: "神秘商店購買動產 / 功能卡首件 5 折（1 次）— 好運卡・神秘禮物" },
  // ── 詛咒道具（偽裝成普通 B 級，實際為負面效果）──
  { name: "管圖的廢棄麻將桌",     grade: "B", effectType: "SHOP_PRICE",        effectValue:  0.10, condition: null, defaultUses: 2,    description: "購買 / 升級費用 +10%（詛咒，2 次）— 廢棄桌帶賽" },
  { name: "必修衝堂",             grade: "B", effectType: "TOLL_INCOME",       effectValue: -0.15, condition: null, defaultUses: 3,    description: "收取過路費時少收 15%（詛咒，3 次）— 卡到時間" },
  { name: "機車違停拖吊單",       grade: "B", effectType: "SHOP_PRICE",        effectValue:  0.10, condition: null, defaultUses: 2,    description: "購買 / 升級費用 +10%（詛咒，2 次）— 荷包失血" },
  // ── 詛咒卡專屬詛咒道具（厄運抽到時發放；完成詛咒任務即失效解除）。
  //    皆為永久（defaultUses=null）：靠「解除詛咒任務」結束，而非次數耗盡。
  //    依效果分三類，名稱唯一（MovableAsset.name @unique）；多張詛咒卡可共用同一道具。──
  { name: "詛咒：光幣",   grade: "C", effectType: "COINS_PER_ROUND",   effectValue: -100,  condition: null, defaultUses: null, description: "每回合失去 100 光幣（詛咒）— 帳單追著你跑，完成任務即解咒" },
  { name: "詛咒：過路費", grade: "C", effectType: "TOLL_INCOME",       effectValue: -0.30, condition: null, defaultUses: null, description: "收取過路費時少收 30%（詛咒）— 收租也卡頓，完成任務即解咒" },
  { name: "詛咒：功能卡", grade: "C", effectType: "CARD_BLOCK",        effectValue:  0,    condition: null, defaultUses: null, description: "詛咒：無法對其他隊伍出功能卡 — 衰運纏身，完成任務即解咒" },
];

// ── 好運卡 / 厄運卡（光源點 / 迷霧區抽卡）─────────────────────
// 二驗：刪動產、情報牌實體發放，這裡只收「會動到光幣」的卡。
// 直接獎勵卡（無任務）的獎勵種類：
//  - coins   ：直接給光幣（仍走 good-card API 入帳，金額＝success）
//  - wheel   ：指示該隊到「命運輪盤」轉一次（純指示，效果於輪盤分頁執行）
//  - lottery ：贈送一次大樂透抽籤（純指示，於大樂透分頁登記）
//  - card    ：拿一張功能卡 / 動產（純指示，於商店或直接發放）
//  - move    ：移動（前進 / 後退 N 格，或直接到某格；純指示，由關主在地圖移動棋子）
export type GoodReward =
  | { kind: "coins"; amount: number } // amount＝直接入帳的光幣
  | { kind: "wheel" }
  | { kind: "lottery" }
  | { kind: "card" }
  | { kind: "move" };

// ── 任務目標型好運卡：大富翁玩法目標，抽卡即登記、回合結算自動評估發獎 ──
//  USE_CARD_ON_TEAM ：對其他隊伍使用一張功能卡（以 ledger kind="card_use" 計數）
//  BUILD_LEVEL3     ：蓋出一棟三級大樓（Property.level==3）
//  BUY_LAND         ：買一塊地（任一區或指定區，依 targetRegion）
//  TRADE_N_TIMES    ：跟其他隊伍完成 N 次交易（Trade ACCEPTED，雙向）
//  WIN_AUCTION_N    ：在拍賣中得標 N 次（AuctionLot SOLD）
//  MONOPOLY_REGION  ：獨佔一個（抽卡時尚未獨佔的）區域
export const TaskKind = {
  USE_CARD_ON_TEAM: "USE_CARD_ON_TEAM",
  BUILD_LEVEL3: "BUILD_LEVEL3",
  BUY_LAND: "BUY_LAND",
  TRADE_N_TIMES: "TRADE_N_TIMES",
  WIN_AUCTION_N: "WIN_AUCTION_N",
  MONOPOLY_REGION: "MONOPOLY_REGION",
} as const;
export type TaskKind = (typeof TaskKind)[keyof typeof TaskKind];

export type GoodCard = {
  name: string;
  difficulty: string;
  // 任務型（需判定成功 / 失敗）：有 task / criteria / success / fail
  task?: string;
  criteria?: string; // 判定
  success?: number; // 成功獎勵光幣
  fail?: number; // 失敗獎勵光幣
  game?: string; // 任務需題庫時，對應的 gameName（地圖關主抽卡後直接抽題）
  // 直接獎勵型（無任務）：有 reward，關主依描述直接執行
  reward?: GoodReward;
  rewardText?: string; // 直接獎勵卡的說明文字（顯示給關主執行）
  // 任務目標型（大富翁玩法追蹤）：有 taskKind，抽卡即登記，回合結算自動評估發獎。
  // 一張卡只會是「直接獎勵」或「任務目標」其一（reward 與 taskKind 互斥）。
  taskKind?: TaskKind;
  targetCount?: number; // 交易 / 拍賣 次數目標；其餘 kind 用 1
  targetRegion?: RegionCode | null; // BUY_LAND 指定區；null = 任一區
  rewardCoins?: number; // 完成獎勵光幣
};

export type BadOutcome = { label: string; deduct: number }; // deduct 為要扣的光幣（正數）
export type BadCard = {
  name: string;
  kind: "扣錢牌" | "懲罰任務牌";
  content: string; // 扣錢牌＝減免任務；懲罰牌＝懲罰內容
  difficulty?: string;
  criteria?: string;
  outcomes: BadOutcome[];
  game?: string; // 任務需題庫時，對應的 gameName
};

// 好運卡：直接獎勵卡（無任務，關主依說明直接執行）
export const GOOD_LUCK_CARDS: GoodCard[] = [
  { name: "天降光幣", difficulty: "直接", reward: { kind: "coins", amount: 400 }, rewardText: "獲得 400 光幣。" },
  { name: "意外之財", difficulty: "直接", reward: { kind: "coins", amount: 450 }, rewardText: "獲得 450 光幣。" },
  { name: "命運眷顧", difficulty: "直接", reward: { kind: "wheel" }, rewardText: "免費轉一次命運輪盤（請到「命運輪盤」分頁執行）。" },
  { name: "幸運彩券", difficulty: "直接", reward: { kind: "lottery" }, rewardText: "免費獲得一次大樂透抽籤。" },
  { name: "神秘禮物", difficulty: "直接", reward: { kind: "card" }, rewardText: "獲得一張神秘商店優惠卷，進入神秘商店使用（購買動產 / 功能卡首件 5 折）。" },
  { name: "向前躍進", difficulty: "直接", reward: { kind: "move" }, rewardText: "棋子前進 2 格（由關主於地圖移動）。" },
  { name: "時光倒流", difficulty: "直接", reward: { kind: "move" }, rewardText: "棋子後退 2 格（由關主於地圖移動）。" },
  { name: "傳送門", difficulty: "直接", reward: { kind: "move" }, rewardText: "直接移動到指定格（由關主指定並移動棋子）。" },
];

// 厄運卡：直接懲罰牌（一翻兩瞪眼，無題庫 / 判定）。關主一鍵套用單一 outcome（直接扣光幣）。
// 厄運抽牌池＝這些直接懲罰牌 + 詛咒卡（CURSE_CARDS）。
export const BAD_LUCK_CARDS: BadCard[] = [
  { name: "繳稅日", kind: "懲罰任務牌", content: "國稅局來敲門，直接補繳 150 光幣。", outcomes: [{ label: "扣款", deduct: 150 }] },
  { name: "宵夜破費", kind: "懲罰任務牌", content: "嘴饞訂了一堆宵夜，失去 100 光幣。", outcomes: [{ label: "扣款", deduct: 100 }] },
  { name: "手機進水", kind: "懲罰任務牌", content: "手機泡水送修，失去 200 光幣。", outcomes: [{ label: "扣款", deduct: 200 }] },
  { name: "停車費爆表", kind: "懲罰任務牌", content: "違停被開單，失去 120 光幣。", outcomes: [{ label: "扣款", deduct: 120 }] },
  { name: "悠遊卡掉了", kind: "懲罰任務牌", content: "悠遊卡連同餘額一起遺失，失去 80 光幣。", outcomes: [{ label: "扣款", deduct: 80 }] },
  { name: "重補修費", kind: "懲罰任務牌", content: "被當要重修，繳交重補修費 250 光幣。", outcomes: [{ label: "扣款", deduct: 250 }] },
];

// ── 卡片分類：所有好運 / 厄運卡皆為即時結算卡（可在右側面板就地處理）。──
// 即時好運卡＝直接獎勵型（有 reward）：coins 一鍵入帳；wheel/lottery/card 給分頁指示；move 接地圖移動。
export function isInstantGood(c: GoodCard): boolean {
  return !!c.reward;
}
// 即時厄運卡＝無需小遊戲判定：沒有題庫（game）也沒有判定條件（criteria），
// 結果一翻兩瞪眼（單一 outcome 或純扣款），可在面板一鍵套用。
export function isInstantBad(c: BadCard): boolean {
  return !c.game && !c.criteria;
}
// 一隊同時最多可持有的進行中任務數（達上限即不再抽到任務卡，伺服器登記也擋下）。
export const MAX_OPEN_TASKS = 3;
// 任務目標型好運卡＝有 taskKind（與 reward 互斥）。抽卡即登記，回合結算自動評估。
export function isTaskGood(c: GoodCard): boolean {
  return !!c.taskKind;
}

// ── 任務目標好運卡牌庫（與 GOOD_LUCK_CARDS 一起進入好運抽牌池）──
// 獎勵 rewardCoins 為佔位值，可自由調整；targetCount / targetRegion 亦可調。
export const TASK_GOOD_CARDS: GoodCard[] = [
  { name: "外交手腕", difficulty: "任務", taskKind: TaskKind.USE_CARD_ON_TEAM, rewardCoins: 250,
    rewardText: "對其他隊伍使用一張功能卡。" },
  { name: "地產大亨", difficulty: "任務", taskKind: TaskKind.BUILD_LEVEL3, rewardCoins: 400,
    rewardText: "將一棟房子升到三級。" },
  { name: "插旗・極光金域", difficulty: "任務", taskKind: TaskKind.BUY_LAND, targetRegion: "AURORA", rewardCoins: 200,
    rewardText: "在極光金域買下一塊地" },
  { name: "插旗・靈序研究", difficulty: "任務", taskKind: TaskKind.BUY_LAND, targetRegion: "SPECTRA", rewardCoins: 200,
    rewardText: "在靈序研究買下一塊地" },
  { name: "插旗・影焰工域", difficulty: "任務", taskKind: TaskKind.BUY_LAND, targetRegion: "EMBER", rewardCoins: 200,
    rewardText: "在影焰工域買下一塊地" },
  { name: "插旗・晨霧棲城", difficulty: "任務", taskKind: TaskKind.BUY_LAND, targetRegion: "HAVEN", rewardCoins: 200,
    rewardText: "在晨霧棲城買下一塊地" },
  { name: "插旗・自由", difficulty: "任務", taskKind: TaskKind.BUY_LAND, targetRegion: null, rewardCoins: 180,
    rewardText: "買下任一塊地（不限區域）" },
  { name: "商會聯盟", difficulty: "任務", taskKind: TaskKind.TRADE_N_TIMES, targetCount: 3, rewardCoins: 300,
    rewardText: "跟其他隊伍完成 3 次交易" },
  { name: "拍賣常勝", difficulty: "任務", taskKind: TaskKind.WIN_AUCTION_N, targetCount: 1, rewardCoins: 250,
    rewardText: "在拍賣中得標 1 次" },
  { name: "區域霸主", difficulty: "任務", taskKind: TaskKind.MONOPOLY_REGION, rewardCoins: 450,
    rewardText: "獨佔一個區域" },
];

// ── 詛咒卡（厄運抽牌池）─────────────────────────────────────────
// 厄運抽到詛咒卡：立刻發一張「詛咒道具」（curseAsset，負面效果生效中），並登記一個任務目標。
// 完成任務（與好運任務同一套 TaskKind 自動評估）即「解除詛咒」：詛咒道具失效 + 發 rewardCoins 補償。
// curseAsset 必須對應 MOVABLE_ASSET_SEED 中的詛咒道具名稱；rewardCoins 為解咒獎勵（佔位值，可調）。
export type CurseCard = {
  name: string;
  curseAsset: string;   // 抽到即發放的詛咒道具名（見 MOVABLE_ASSET_SEED）
  curseText: string;    // 詛咒內容說明（顯示給關主 / 玩家）
  taskKind: TaskKind;   // 解咒任務種類（沿用好運任務自動評估）
  targetCount?: number; // 交易 / 拍賣 次數目標；其餘 kind 用 1
  targetRegion?: RegionCode | null; // BUY_LAND 指定區；null = 任一區
  rewardCoins: number;  // 解咒獎勵光幣
  taskText: string;     // 解咒條件說明
};

export const CURSE_CARDS: CurseCard[] = [
  { name: "卡費追殺令", curseAsset: "詛咒：光幣",
    curseText: "每回合失去 100 光幣，直到解除詛咒。",
    taskKind: TaskKind.BUY_LAND, targetRegion: null, rewardCoins: 200,
    taskText: "買下任一塊地即可解除詛咒（並獲 200 光幣）。" },
  { name: "選課地獄", curseAsset: "詛咒：光幣",
    curseText: "每回合失去 100 光幣，直到解除詛咒。",
    taskKind: TaskKind.TRADE_N_TIMES, targetCount: 2, rewardCoins: 250,
    taskText: "跟其他隊伍完成 2 次交易即可解除詛咒（並獲 250 光幣）。" },
  { name: "斷網風暴", curseAsset: "詛咒：過路費",
    curseText: "收取過路費時少收 30%，直到解除詛咒。",
    taskKind: TaskKind.BUILD_LEVEL3, rewardCoins: 300,
    taskText: "蓋出一棟三級大樓即可解除詛咒（並獲 300 光幣）。" },
  { name: "二一危機", curseAsset: "詛咒：功能卡",
    curseText: "無法對其他隊伍出功能卡，直到解除詛咒。",
    taskKind: TaskKind.WIN_AUCTION_N, targetCount: 1, rewardCoins: 250,
    taskText: "在拍賣中得標 1 次即可解除詛咒（並獲 250 光幣）。" },
  { name: "地獄籤運", curseAsset: "詛咒：功能卡",
    curseText: "無法對其他隊伍出功能卡，直到解除詛咒。",
    taskKind: TaskKind.MONOPOLY_REGION, rewardCoins: 450,
    taskText: "獨佔任一區域即可解除詛咒（並獲 450 光幣）。" },
];

// 詛咒卡：抽厄運卡時自 CURSE_CARDS 排除該隊已有進行中的 taskKind（避免同種堆疊），加權隨機抽一張。
// 全部被排除（或達任務上限）時回 null（呼叫端可改抽即時厄運卡 / 提示）。
export function pickCurseCard(openKinds: Set<TaskKind>, rng: () => number = Math.random): CurseCard | null {
  const pool = CURSE_CARDS.filter((c) => !openKinds.has(c.taskKind));
  if (pool.length === 0) return null;
  return weightedPick(pool.map((value) => ({ value, weight: 1 })), rng);
}

// 計算某區獨佔隊伍：需有 ≥1 棟三級 → 最多三級 → 再比總持有數 → 平手則無。
// 與 service.payToll 的獨佔判定一致（含三級門檻）。snapshot 與 service 共用此單一事實來源。
export function findMonopoly(
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

// 抽任務卡：自 TASK_GOOD_CARDS 排除該隊已有進行中的 taskKind（避免同種堆疊），再加權隨機抽一張。
// 全部都被排除時回 null（呼叫端可改抽直接獎勵卡）。
export function pickTaskCard(openKinds: Set<TaskKind>, rng: () => number = Math.random): GoodCard | null {
  const pool = TASK_GOOD_CARDS.filter((c) => c.taskKind && !openKinds.has(c.taskKind));
  if (pool.length === 0) return null;
  return weightedPick(pool.map((value) => ({ value, weight: 1 })), rng);
}

// ── 任務目標進度評估（純函式，供 snapshot 顯示與結算判定共用）──
// current：該隊「目前」的各項計數 / 狀態；baseline：抽卡當下的基準（since-draw）。
// BUY_LAND 的 propertyCount 由呼叫端先依 targetRegion 過濾後傳入（此處只比差值）。
export type ObjectiveState = {
  tradeCount: number;
  propertyCount: number; // 指定區任務時，呼叫端傳「該區」持有數
  level3Count: number;
  cardUseCount: number;
  auctionWins: number;
  monopolyRegions: RegionCode[]; // 目前獨佔的區
};
export type ObjectiveBaseline = {
  baseTradeCount: number;
  basePropertyCount: number;
  baseLevel3Count: number;
  baseCardUseCount: number;
  baseAuctionWins: number;
  baseMonopolyRegions: RegionCode[];
};
export function evalObjectiveProgress(
  taskKind: TaskKind,
  target: { count: number; region: RegionCode | null },
  baseline: ObjectiveBaseline,
  current: ObjectiveState,
): { current: number; target: number; done: boolean } {
  const since = (now: number, base: number) => Math.max(0, now - base);
  switch (taskKind) {
    case TaskKind.TRADE_N_TIMES: {
      const c = since(current.tradeCount, baseline.baseTradeCount);
      return { current: c, target: target.count, done: c >= target.count };
    }
    case TaskKind.WIN_AUCTION_N: {
      const c = since(current.auctionWins, baseline.baseAuctionWins);
      return { current: c, target: target.count, done: c >= target.count };
    }
    case TaskKind.USE_CARD_ON_TEAM: {
      const c = since(current.cardUseCount, baseline.baseCardUseCount);
      return { current: c, target: target.count, done: c >= target.count };
    }
    case TaskKind.BUY_LAND: {
      const c = since(current.propertyCount, baseline.basePropertyCount);
      return { current: c, target: 1, done: c >= 1 };
    }
    case TaskKind.BUILD_LEVEL3: {
      const c = since(current.level3Count, baseline.baseLevel3Count);
      return { current: c, target: 1, done: c >= 1 };
    }
    case TaskKind.MONOPOLY_REGION: {
      // 達標＝獨佔了一個「抽卡時尚未獨佔」的區域。
      const gained = current.monopolyRegions.some((r) => !baseline.baseMonopolyRegions.includes(r));
      return { current: gained ? 1 : 0, target: 1, done: gained };
    }
  }
}

// 加權隨機抽樣（rng∈[0,1)）：依各項 weight 比例回傳其 value；空陣列回 null。
// 權重不必總和為 1（會除以總和正規化）。
export function weightedPick<T>(items: { value: T; weight: number }[], rng: () => number = Math.random): T | null {
  const total = items.reduce((s, i) => s + Math.max(0, i.weight), 0);
  if (total <= 0) return items[0]?.value ?? null;
  let r = rng() * total;
  for (const it of items) {
    r -= Math.max(0, it.weight);
    if (r < 0) return it.value;
  }
  return items[items.length - 1]?.value ?? null; // 浮點誤差保險
}

// 功能卡清單（cost = 卡牌點數，企畫書未定，預設值可於 admin 調整）
export const FUNCTION_CARDS: {
  type: string;
  effect: string;
  cost: number;
  defaultStock: number;
}[] = [
  // 點數 / 庫存對齊企畫書（功能卡表 L1464+）：抑制攻擊卡滾雪球。
  // 中央燈塔一次給 30 點，故攻擊卡刻意較貴、限量。
  { type: "購地卡", effect: "強制收購對手一塊土地（對手獲初始價 8 折補償）", cost: 100, defaultStock: 5 },
  { type: "換地卡", effect: "以己方土地與對手土地強制對換", cost: 50, defaultStock: 5 },
  { type: "換屋卡", effect: "與對手互換一棟房屋的升級級別", cost: 30, defaultStock: 5 },
  { type: "拆屋卡", effect: "拆除對手一層房屋（降一級）", cost: 40, defaultStock: 5 },
  { type: "怪獸卡", effect: "摧毀對手一棟房屋，對手將失去該土地", cost: 90, defaultStock: 3 },
  { type: "市場預警卡", effect: "得知下一次事件前某區漲跌方向", cost: 50, defaultStock: 0 }, // 庫存 0＝暫時停用
  { type: "紅卡", effect: "選定一區，整區不動產大漲", cost: 60, defaultStock: 4 },
  { type: "黑卡", effect: "選定一區，整區不動產大跌", cost: 60, defaultStock: 4 },
  { type: "鬧鬼卡", effect: "選定一棟房子，該棟現值下跌", cost: 40, defaultStock: 4 },
  { type: "土地公卡", effect: "選定一棟房子，該棟現值上漲", cost: 40, defaultStock: 4 },
];

// 發放獎勵 / 懲罰的快捷預設（資料化，單一來源；前端共用元件 RewardButtons 讀取）
// 幾秒內可撤銷的「反悔配方」：只帶要回沖的 ledger 列 id 與（選用）不動產原狀態。
// 金額一律由伺服器照 ledger 列的 -delta 反推，不信任前端帶的數字。
export type UndoRecipe = {
  label: string;
  ledgerIds: number[];
  property?: { id: number; ownerTeamId: number | null; level: number;
    cardRegionMult?: number; cardBuildingMult?: number; monopolyBonusMult?: number };
  // 一次影響多塊不動產時（換地 / 換屋）逐筆還原；與 property 單筆並存。
  properties?: { id: number; ownerTeamId: number | null; level: number;
    cardRegionMult?: number; cardBuildingMult?: number; monopolyBonusMult?: number }[];
  // 撤銷時需刪除的 TeamItem（如好運卡骰到動產時發出的那張）
  itemIds?: number[];
  // 撤銷大樂透登記：刪除該 LotteryNumber 列並回補獎金池
  lotteryNumberId?: number;
  lotteryPoolRevert?: number; // 需從池中扣回的金額（= poolAdd）
};

export type RewardTone = "good" | "bad" | "gold" | "spirit";
export type RewardPreset = {
  label: string;
  coins?: number;
  cardPoints?: number;
  note?: string; // 寫入總帳的備註；省略則用 label
  tone?: RewardTone;
};

export const MAP_REWARD_PRESETS: RewardPreset[] = [
  { label: "中央燈塔 +300光幣 +30點", coins: 300, cardPoints: 30, tone: "gold" },
];

export const MOBILE_REWARD_PRESETS: RewardPreset[] = [
  { label: "光幣 +200", coins: 200, note: "小遊戲獎勵 光幣", tone: "good" },
  { label: "卡牌點數 +20", cardPoints: 20, note: "小遊戲獎勵 卡牌點數", tone: "good" },
];

// ── 流動關卡獎勵公式（單一事實來源）──────────────────────────────
// 表現制：答對越多題給越多獎勵。難度越高，每題給的光幣 / 點數與每 10 題的骰子越多。
// 光幣與點數「擇一」發放（關主用 toggle 選），骰子為實體（畫面只顯示張數，不寫 DB）。
export type MobileDifficulty = "簡單" | "中等" | "困難";
export type RewardKind = "coins" | "cardPoints";

export const MOBILE_REWARD_RATES: Record<
  MobileDifficulty,
  { coinsPerQ: number; pointsPerQ: number; dicePer10: number }
> = {
  簡單: { coinsPerQ: 10, pointsPerQ: 2, dicePer10: 1 },
  中等: { coinsPerQ: 20, pointsPerQ: 4, dicePer10: 2 },
  困難: { coinsPerQ: 30, pointsPerQ: 6, dicePer10: 3 },
};

// 依難度 / 答對題數 / 擇一幣別，算出最終獎勵。dice = 每滿 10 題給的實體骰子數（無條件捨去）。
export function computeMobileReward(
  difficulty: MobileDifficulty,
  correct: number,
  kind: RewardKind,
): { amount: number; dice: number } {
  const r = MOBILE_REWARD_RATES[difficulty];
  const n = Math.max(0, Math.floor(correct));
  const amount = (kind === "coins" ? r.coinsPerQ : r.pointsPerQ) * n;
  const dice = r.dicePer10 * Math.floor(n / 10);
  return { amount, dice };
}

// 每款遊戲的獎勵形式：
//  - per-question：表現制計算機（difficulties 列出此遊戲可選難度；單一則不顯示難度選擇）
//  - win-lose：PK / 淘汰賽，依勝負給固定獎勵（dice 為實體張數）
export type MobileRewardConfig =
  | { mode: "per-question"; difficulties: MobileDifficulty[] }
  | { mode: "win-lose"; winCoins: number; winDice: number; loseCoins: number };

// 注音聯想：題庫存「主題」，遊戲抽到主題後再隨機抽一個注音聲母，兩隊輪流聯想該主題、該注音開頭的詞。
// 此清單即可抽的聲母（去掉較難聯想的 ㄪ/ㄟ 等韻母，只取常用聲母）。
export const BOPOMOFO_INITIALS = [
  "ㄅ", "ㄆ", "ㄇ", "ㄈ", "ㄉ", "ㄊ", "ㄋ", "ㄌ", "ㄍ", "ㄎ", "ㄏ",
  "ㄐ", "ㄑ", "ㄒ", "ㄓ", "ㄔ", "ㄕ", "ㄖ", "ㄗ", "ㄘ", "ㄙ",
] as const;
// 觸發「抽注音聲母」附加機制的遊戲名（QuestionBank 依此在每題旁顯示隨機聲母）。
export const BOPOMOFO_DRAW_GAME = "注音聯想";

// ── 流動關卡：小遊戲清單（單一事實來源）─────────────────────────
// hasBank=true 者題目存於 Question 表（gameName 相同）；false 者為純規則卡（海帶拳 / 憤怒企業 / 烏龜烏龜翹 / 傳接球）。
// time/rule/reward 為關主執行時的提示文字；mobile 頁照此渲染卡片，順序即清單順序。
export type MobileGame = {
  name: string;
  hasBank: boolean;
  versus: "team-vs-host" | "team-vs-team" | "coop"; // 對抗形式（決定徽章與文案）
  time?: string; // 時間限制提示（顯示文字）
  seconds?: number; // 預設計時秒數（進行中計時器初始值；無則不預載，關主可手動設定）
  rule: string; // 過關 / 勝負條件（一句話）
  reward?: string; // 額外實體獎勵提示（如「每對 3 題給 1 張動產卡」）
  note?: string; // 補充說明
  rewardConfig: MobileRewardConfig; // 系統發獎方式（計算機 / 勝負）
};

export const MOBILE_GAMES: MobileGame[] = [
  {
    name: "猜歌",
    hasBank: true,
    versus: "coop",
    time: "3 分鐘",
    seconds: 180,
    rule: "3 分鐘內答對越多題越多獎勵",
    note: "關主自行準備歌單。",
    rewardConfig: { mode: "per-question", difficulties: ["中等"] },
  },
  {
    name: "憤怒企業",
    hasBank: false,
    versus: "team-vs-host",
    rule: "小隊推 3 人與關主 PK，三戰兩勝",
    note: "輪流說出企業品牌名（只要品牌名即可），答不出或重複即失敗。",
    rewardConfig: { mode: "win-lose", winCoins: 150, winDice: 2, loseCoins: 50 },
  },
  {
    name: "烏龜烏龜翹",
    hasBank: false,
    versus: "team-vs-team",
    rule: "兩隊每個人都玩，最先被淘汰完的小隊輸",
    note: "全員出拳，依關主喊的指令翹手，慢半拍或出錯者淘汰。",
    rewardConfig: { mode: "win-lose", winCoins: 100, winDice: 1, loseCoins: 50 },
  },
  {
    name: "烏龜烏龜翹（vs 關主）",
    hasBank: false,
    versus: "team-vs-host",
    rule: "小隊與關主對玩，比關主慢半拍或出錯即敗",
    note: "依關主喊的指令翹手，小隊跟著做；慢半拍或出錯者淘汰，撐到最後即勝。",
    rewardConfig: { mode: "win-lose", winCoins: 150, winDice: 2, loseCoins: 50 },
  },
  {
    name: "注音猜詞",
    hasBank: true,
    versus: "coop",
    time: "3 分鐘",
    seconds: 180,
    rule: "3 分鐘內答對越多題越多獎勵",
    note: "關主給注音，全隊搶答對應的詞。",
    rewardConfig: { mode: "per-question", difficulties: ["簡單", "中等", "困難"] },
  },
  {
    name: "注音聯想",
    hasBank: true,
    versus: "team-vs-team",
    rule: "兩隊輪流聯想，答不出或重複者輸",
    note: "系統抽一個主題＋一個注音聲母，兩隊輪流說出該主題、該注音開頭的詞，接不下去或重複即敗。",
    rewardConfig: { mode: "win-lose", winCoins: 150, winDice: 2, loseCoins: 50 },
  },
  {
    name: "默契大考驗",
    hasBank: true,
    versus: "coop",
    time: "3 分鐘",
    seconds: 180,
    rule: "3 分鐘內答對越多題越多獎勵",
    note: "關主自選難度。關主念關鍵字，全隊同時比同一動作，相同才算對。",
    rewardConfig: { mode: "per-question", difficulties: ["簡單", "中等", "困難"] },
  },
  {
    name: "傳接球",
    hasBank: false,
    versus: "team-vs-team",
    rule: "圍成圈一次傳三顆，成功傳兩圈球不落地則成功（一回合可挑戰三次）",
    note: "道具：桌球。全隊圍成一圈，同時傳三顆桌球，要連續傳滿兩圈且球不落地才算成功。",
    rewardConfig: { mode: "win-lose", winCoins: 100, winDice: 1, loseCoins: 50 },
  },
  {
    name: "口型猜答案",
    hasBank: true,
    versus: "team-vs-team",
    time: "3 分鐘",
    seconds: 180,
    rule: "出 15 題，兩隊比拚，猜對較多的小隊勝",
    note: "關主只動口型不出聲，小隊搶答；用題庫抽題出題。",
    rewardConfig: { mode: "win-lose", winCoins: 150, winDice: 2, loseCoins: 50 },
  },
  {
    name: "海帶拳",
    hasBank: false,
    versus: "team-vs-team",
    rule: "兩隊每個人都玩，最先被淘汰完的小隊輸",
    rewardConfig: { mode: "win-lose", winCoins: 100, winDice: 1, loseCoins: 50 },
  },
  {
    name: "海帶拳（vs 關主）",
    hasBank: false,
    versus: "team-vs-host",
    rule: "小隊與關主對玩，輸給關主即敗",
    note: "與關主猜海帶拳，跟錯動作或輸即淘汰，撐到最後即勝。",
    rewardConfig: { mode: "win-lose", winCoins: 150, winDice: 2, loseCoins: 50 },
  },
  {
    name: "比手畫腳",
    hasBank: true,
    versus: "coop",
    time: "3 分鐘",
    seconds: 180,
    note: "關主念關鍵字，全隊同時比同一動作，相同算一題。",
    rule: "3 分鐘內完成越多題越多獎勵",
    rewardConfig: { mode: "per-question", difficulties: ["簡單", "中等", "困難"] },
  },
  {
    name: "跳跳Tempo",
    hasBank: true,
    versus: "team-vs-team",
    time: "3 分鐘",
    seconds: 180,
    rule: "挑錯即淘汰；先被淘汰完、或 3分鐘到時人數較少的小隊敗",
    note: "兩隊隊員穿插站，關主念清單，符合主題跳 O 邊、不符跳 X 邊，跳錯或晚跳淘汰。",
    rewardConfig: { mode: "win-lose", winCoins: 100, winDice: 1, loseCoins: 50 },
  },
];

// 角色定義
export const ROLES = [
  "HOST",
  "EXCHANGE",
  "MAP",
  "MOBILE",
  "CARDSHOP",
  "AUCTION",
  "PROJECTION",
  "ADMIN",
  "TEAM",
] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_HOME: Record<Role, string> = {
  HOST: "/host",
  EXCHANGE: "/exchange",
  MAP: "/map",
  MOBILE: "/mobile",
  CARDSHOP: "/shop",
  AUCTION: "/auction",
  PROJECTION: "/projection",
  ADMIN: "/admin",
  TEAM: "/team",
};

export const ROLE_LABEL: Record<Role, string> = {
  HOST: "主持人",
  EXCHANGE: "交易所",
  MAP: "地圖關主",
  MOBILE: "流動關主",
  CARDSHOP: "神秘商店",
  AUCTION: "拍賣官",
  PROJECTION: "投影",
  ADMIN: "Admin",
  TEAM: "小隊",
};

// ── 真實棋盤（public/map.png）：10×10 外環 36 格 ──────────────────
// 關主在 /map「真實地圖」分頁移動棋子；停留格的 kind 決定自動導向哪個分頁，
// 把關主「這格該去哪一站？」的判斷自動化。座標 x/y 為相對 map.png 的百分比（格中心），
// 供前端絕對定位疊棋子。資料即事實來源（比照 PROPERTY_SEED / EVENTS，寫死免 migration）。
//
//   START        ：中央燈塔起點 / 商店（過 / 停發起點收益）
//   SHOP         ：神秘商店
//   WHEEL        ：命運投資輪盤・賭博事件
//   LOTTERY_DRAW ：大樂透開獎格
//   LOTTERY_REG  ：星籤所大樂透（登記號碼）
//   PROPERTY     ：四區不動產格（帶 region；導向交易所並預選該區）
//   GLOW         ：光源（好運卡）
//   FOG          ：迷霧（厄運卡）
export type SquareKind =
  | "START"
  | "SHOP"
  | "WHEEL"
  | "LOTTERY_DRAW"
  | "LOTTERY_REG"
  | "PROPERTY"
  | "GLOW"
  | "FOG";

export type BoardSquare = {
  index: number;       // 0..35，順時針；0 = START
  label: string;       // map.png 上的格名
  kind: SquareKind;
  region?: RegionCode; // 僅 PROPERTY：對應四區
  x: number;           // 格中心 X（%）
  y: number;           // 格中心 Y（%）
  w: number;           // 格寬（%）
  h: number;           // 格高（%）
};

// 棋盤實際比例（量自 map.png 像素，雙軸實測一致）：外框 1.5%，四角 12.5%×12.5%，
// 邊格沿軌 9.0%、深 12.5%。對應企畫板 110 單位（框 0.7 / 角 13.9 / 邊 10.1），
// 但實際 PNG 外框較大，故改用實測百分比，確保點擊熱區與棋子精準落在格上。
// 角與邊不等寬，故各格自帶寬高（w/h，皆為百分比）。
const FRAME = 1.5; // PNG 外框（%）
const CORNER_SIDE = 12.5; // 角格邊長（%）
const EDGE_SHORT = 9.0; // 邊格沿軌長度 / 短邊（%）
const NEAR = FRAME + CORNER_SIDE / 2; // 近邊角 / 邊帶中心 ≈ 7.75%
const FAR = 100 - NEAR; // 遠邊 ≈ 92.25%
// 8 個邊格沿軌中心（自起始角往遠角遞增）
const EDGE_CENTER = Array.from({ length: 8 }, (_, i) =>
  FRAME + CORNER_SIDE + (i + 0.5) * EDGE_SHORT,
);

// 依 index 算出格中心與寬高（%）。角格正方；邊格短邊沿軌、長邊＝邊帶深度。
function squareGeometry(index: number): { x: number; y: number; w: number; h: number } {
  // 四角（正方）
  if (index === 0) return { x: NEAR, y: FAR, w: CORNER_SIDE, h: CORNER_SIDE }; // 左下：起點
  if (index === 9) return { x: NEAR, y: NEAR, w: CORNER_SIDE, h: CORNER_SIDE }; // 左上：神秘商店
  if (index === 18) return { x: FAR, y: NEAR, w: CORNER_SIDE, h: CORNER_SIDE }; // 右上：命運輪盤
  if (index === 27) return { x: FAR, y: FAR, w: CORNER_SIDE, h: CORNER_SIDE }; // 右下：大樂透開獎
  // 左排（1..8）：x 固定近邊，y 由下而上（深度為 x 向 → w 較寬）
  if (index >= 1 && index <= 8)
    return { x: NEAR, y: EDGE_CENTER[8 - index], w: CORNER_SIDE, h: EDGE_SHORT };
  // 頂排（10..17）：y 固定近邊，x 由左而右（深度為 y 向 → h 較高）
  if (index >= 10 && index <= 17)
    return { x: EDGE_CENTER[index - 10], y: NEAR, w: EDGE_SHORT, h: CORNER_SIDE };
  // 右排（19..26）：x 固定遠邊，y 由上而下
  if (index >= 19 && index <= 26)
    return { x: FAR, y: EDGE_CENTER[index - 19], w: CORNER_SIDE, h: EDGE_SHORT };
  // 底排（28..35）：y 固定遠邊，x 由右而左
  return { x: EDGE_CENTER[35 - index], y: FAR, w: EDGE_SHORT, h: CORNER_SIDE };
}

// 各格 metadata（順時針自左下角 START；region 僅 PROPERTY 用）。幾何由 squareGeometry 套上。
const BOARD_META: { label: string; kind: SquareKind; region?: RegionCode }[] = [
  { label: "中央燈塔・起點", kind: "START" }, // 0  左下角
  // ── 左排（由下往上）──
  { label: "工域星籤所・大樂透", kind: "LOTTERY_REG" }, // 1
  { label: "影焰工域", kind: "PROPERTY", region: "EMBER" }, // 2
  { label: "碼頭進貨・光源", kind: "GLOW" }, // 3
  { label: "半導體製造・光源", kind: "GLOW" }, // 4
  { label: "影焰工域", kind: "PROPERTY", region: "EMBER" }, // 5
  { label: "原料補給・光源", kind: "GLOW" }, // 6
  { label: "影焰工域", kind: "PROPERTY", region: "EMBER" }, // 7
  { label: "人才流失・迷霧", kind: "FOG" }, // 8
  { label: "神秘商店", kind: "SHOP" }, // 9  左上角
  // ── 頂排（由左往右）──
  { label: "極光金域", kind: "PROPERTY", region: "AURORA" }, // 10
  { label: "獲得利息・光源", kind: "GLOW" }, // 11
  { label: "小福施工・迷霧", kind: "FOG" }, // 12
  { label: "極光金域", kind: "PROPERTY", region: "AURORA" }, // 13
  { label: "星籤登記所・大樂透", kind: "LOTTERY_REG" }, // 14
  { label: "極光金域", kind: "PROPERTY", region: "AURORA" }, // 15
  { label: "極光金域", kind: "PROPERTY", region: "AURORA" }, // 16
  { label: "IM百貨週年慶光源", kind: "GLOW" }, // 17
  { label: "命運投資輪盤", kind: "WHEEL" }, // 18 右上角
  // ── 右排（由上往下）──
  { label: "成為Google正職・光源", kind: "GLOW" }, // 19
  { label: "靈序研究", kind: "PROPERTY", region: "SPECTRA" }, // 20
  { label: "靈序星籤所・大樂透", kind: "LOTTERY_REG" }, // 21
  { label: "靈序研究", kind: "PROPERTY", region: "SPECTRA" }, // 22
  { label: "管圖重建・迷霧", kind: "FOG" }, // 23
  { label: "科技突破・光源", kind: "GLOW" }, // 24
  { label: "Gemini當機・迷霧", kind: "FOG" }, // 25
  { label: "靈序研究", kind: "PROPERTY", region: "SPECTRA" }, // 26
  { label: "大樂透開獎格", kind: "LOTTERY_DRAW" }, // 27 右下角
  // ── 底排（由右往左，順時針回 START）──
  { label: "工業污染・迷霧", kind: "FOG" }, // 28
  { label: "抽中太子學舍・光源", kind: "GLOW" }, // 29
  { label: "晨霧棲城", kind: "PROPERTY", region: "HAVEN" }, // 30
  { label: "棲城星籤所・大樂透", kind: "LOTTERY_REG" }, // 31
  { label: "療養院聚餐・光源", kind: "GLOW" }, // 32
  { label: "晨霧棲城", kind: "PROPERTY", region: "HAVEN" }, // 33
  { label: "晨霧棲城", kind: "PROPERTY", region: "HAVEN" }, // 34
  { label: "醫療進步・光源", kind: "GLOW" }, // 35
];

// 順時針自左下角 START 起：左排 → 頂排 → 右排 → 底排回 START。
export const BOARD: BoardSquare[] = BOARD_META.map((m, index) => ({
  index,
  ...m,
  ...squareGeometry(index),
}));

export const BOARD_SIZE = BOARD.length; // 36

// 起點收益。過起點（含停在起點）發 PASS；停在起點額外再發 LAND。
export const PASS_START_COINS = 500;
export const PASS_START_CARD_POINTS = 30;
export const LAND_START_COINS = 500;
export const LAND_START_CARD_POINTS = 20;
/** @deprecated use PASS_START_COINS */
export const PASS_START_INCOME = PASS_START_COINS;

// 取格（index 一律先正規化到 0..35）。
export function boardSquareAt(index: number): BoardSquare {
  return BOARD[((index % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE];
}

// 前進 steps 格（可負）；回傳新位置與是否經過 / 抵達起點（過起點才發收益）。
// 經過起點判定：以「跨過 index 0」為準——前進途中（含落在 0）算經過。
export function advance(from: number, steps: number): { to: number; passedStart: boolean } {
  const start = ((from % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;
  const to = ((start + steps) % BOARD_SIZE + BOARD_SIZE) % BOARD_SIZE;
  // 只在正向前進時發起點收益（後退不發）。經過或落在 0 即算。
  let passedStart = false;
  if (steps > 0) {
    for (let i = 1; i <= steps; i++) {
      if ((start + i) % BOARD_SIZE === 0) {
        passedStart = true;
        break;
      }
    }
  }
  return { to, passedStart };
}

// 停留格 → MapView 既有分頁 + （PROPERTY）預選區域。
// GLOW / FOG 都導向 "map" 分頁（光源點 / 迷霧區抽卡），由 draw 區分好運 / 厄運。
export type MapTab = "map" | "exchange" | "shop" | "lottery" | "wheel";

// 好運卡「免費獎勵」種類：抽到後導向對應分頁，於該頁就地領取免費的轉盤 / 登記 / 抽動產。
// wheel→命運輪盤、lottery→大樂透、card→神秘商店。隨地圖路由帶到目標頁觸發「免費模式」。
export type Freebie = "wheel" | "lottery" | "card";
// 目標分頁僅取「回合操作分頁」子集（wheel / lottery / shop），故型別收斂到這三者，
// 方便 MapView 直接塞進 turnAction.tab（TurnActionTab）而不需再轉型。
export const FREEBIE_TAB: Record<Freebie, "wheel" | "lottery" | "shop"> = {
  wheel: "wheel",
  lottery: "lottery",
  card: "shop",
};

export function squareToTab(sq: BoardSquare): { tab: MapTab; region?: RegionCode } {
  switch (sq.kind) {
    case "PROPERTY":
      return { tab: "exchange", region: sq.region };
    case "SHOP":
      return { tab: "shop" };
    case "WHEEL":
      return { tab: "wheel" };
    case "LOTTERY_REG":
    case "LOTTERY_DRAW":
      return { tab: "lottery" };
    case "GLOW":
    case "FOG":
    case "START":
    default:
      return { tab: "map" };
  }
}

// 停留提示文字（落地橫幅用）：依 kind 給一句「去哪 / 做什麼」。
export function squareHint(sq: BoardSquare): string {
  switch (sq.kind) {
    case "PROPERTY":
      return `購買 / 升級不動產`;
    case "SHOP":
      return "購買卡牌 / 動產";
    case "WHEEL":
      return "最多轉三次輪盤";
    case "LOTTERY_REG":
      return "大樂透登記號碼";
    case "LOTTERY_DRAW":
      return "大樂透開獎格";
    case "GLOW":
      return "抽好運卡";
    case "FOG":
      return "抽厄運卡";
    case "START":
      return "過起點領收益";
    default:
      return "";
  }
}

// monopolySince CSV：region:teamId:epochMs，多筆逗號分隔。
export function parseMonopolySince(csv: string): Record<string, { teamId: number; since: number }> {
  const out: Record<string, { teamId: number; since: number }> = {};
  if (!csv) return out;
  for (const part of csv.split(",")) {
    const [region, t, s] = part.split(":");
    const teamId = Number(t), since = Number(s);
    if (!region || !Number.isFinite(teamId) || !Number.isFinite(since)) continue;
    out[region] = { teamId, since };
  }
  return out;
}

export function serializeMonopolySince(
  map: Record<string, { teamId: number; since: number }>,
): string {
  return Object.keys(map)
    .sort()
    .map((r) => `${r}:${map[r].teamId}:${map[r].since}`)
    .join(",");
}
