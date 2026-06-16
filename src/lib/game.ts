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
  prop: { basePrice: number; region: string; type: string },
  activeEvents: number[],
  event4Penalty?: string | null,
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
  prop: { basePrice: number; region: string; type: string; level: number },
  activeEvents: number[],
  event4Penalty?: string | null,
): number {
  const eventMult =
    currentValue({ basePrice: 1000, region: prop.region, type: prop.type }, activeEvents, event4Penalty) / 1000;
  return Math.round(prop.basePrice * investedPrincipalMult(prop.level) * eventMult);
}

// ── 過路費用「升級加成市值」（仍用 k=0.5，過路費＝蓋房的主要回報）──────────
// 過路費比淨值更陡地獎勵升級：壟斷 + 過路費才是蓋房的主要誘因。
// leveledValue = currentValue ×（1 + LEVEL_VALUE_BONUS × level）。
export const LEVEL_VALUE_BONUS = 0.5;
export function leveledValue(
  prop: { basePrice: number; region: string; type: string; level: number },
  activeEvents: number[],
  event4Penalty?: string | null,
): number {
  return currentValue(prop, activeEvents, event4Penalty) * (1 + LEVEL_VALUE_BONUS * prop.level);
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

// ── 動產效果系統 ─────────────────────────────────────────────────
// const 物件 enum 模式：值即字串，與 Prisma String 欄位直接比較
export const EffectType = {
  TOLL_INCOME:       "TOLL_INCOME",       // 收取過路費加成（+0.15 → +15%）
  TOLL_PAID:         "TOLL_PAID",         // 支付過路費減免（-0.10 → -10%）
  SHOP_PRICE:        "SHOP_PRICE",        // 購買 / 升級折扣（-0.10 → -10%）
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
  REMINDER:          "REMINDER",          // 無計算，僅提醒關主
} as const;
export type EffectType = typeof EffectType[keyof typeof EffectType];

export const EFFECT_TYPE_LABELS: Record<EffectType, string> = {
  TOLL_INCOME:       "過路費加成",
  TOLL_PAID:         "過路費減免",
  SHOP_PRICE:        "購買折扣",
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
  REMINDER:          "提醒（無計算）",
};

export const ITEM_GRADE_COLORS: Record<string, string> = {
  S: "text-amber-300 border-amber-400/60 bg-amber-500/10",
  A: "text-violet-300 border-violet-400/60 bg-violet-500/10",
  B: "text-slate-300 border-slate-400/40 bg-white/5",
};

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
export const ITEM_GRADE_PRICE: Record<string, number> = { S: 2000, A: 1000, B: 400 };
export const DEFAULT_SHOP_STOCK = 2; // 每件動產預設上架 2 個

// 詛咒道具不該擺上商店（偽裝成 B 級的負面效果），seed 時 shopStock 設 0。
export const CURSED_ASSET_NAMES = new Set(["管圖的廢棄麻將桌", "必修衝堂", "機車違停拖吊單"]);

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
  { name: "F1賽車",               grade: "A", effectType: "REMINDER",          effectValue:  0,    condition: null, defaultUses: null, description: "【提醒關主】每回合可選擇移動骰子數 +0/+1/+2 步（永久）" },
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
  // ── 詛咒道具（偽裝成普通 B 級，實際為負面效果）──
  { name: "管圖的廢棄麻將桌",     grade: "B", effectType: "SHOP_PRICE",        effectValue:  0.10, condition: null, defaultUses: 2,    description: "購買 / 升級費用 +10%（詛咒，2 次）— 廢棄桌帶賽" },
  { name: "必修衝堂",             grade: "B", effectType: "TOLL_INCOME",       effectValue: -0.15, condition: null, defaultUses: 3,    description: "收取過路費時少收 15%（詛咒，3 次）— 卡到時間" },
  { name: "機車違停拖吊單",       grade: "B", effectType: "SHOP_PRICE",        effectValue:  0.10, condition: null, defaultUses: 2,    description: "購買 / 升級費用 +10%（詛咒，2 次）— 荷包失血" },
];

// ── 好運卡 / 厄運卡（光源點 / 迷霧區抽卡）─────────────────────
// 二驗：刪動產、情報牌實體發放，這裡只收「會動到光幣」的卡。
export type GoodCard = {
  name: string;
  task: string;
  difficulty: string;
  success: number; // 成功獎勵光幣
  fail: number; // 失敗獎勵光幣
  criteria: string; // 判定
};

export type BadOutcome = { label: string; deduct: number }; // deduct 為要扣的光幣（正數）
export type BadCard = {
  name: string;
  kind: "扣錢牌" | "懲罰任務牌";
  content: string; // 扣錢牌＝減免任務；懲罰牌＝懲罰內容
  difficulty?: string;
  criteria?: string;
  outcomes: BadOutcome[];
};

// 好運卡：光幣牌
export const GOOD_LUCK_CARDS: GoodCard[] = [
  { name: "晨光大禮", task: "跟關主猜拳，過半數隊員贏過關主", difficulty: "簡單", success: 150, fail: 0, criteria: "半數以上勝利" },
  { name: "繁星獎池", task: "冷知識 5 題答對 3 題", difficulty: "中等", success: 250, fail: 0, criteria: "答對 3 題" },
  { name: "資本大賞", task: "全隊用身體呈現指定國字，隊輔猜出 3 題", difficulty: "中等", success: 300, fail: 0, criteria: "猜出 3 題" },
  { name: "光幣雙倍", task: "繞口令完成 3 題", difficulty: "中等", success: 300, fail: 0, criteria: "完成 3 題" },
  { name: "迷霧財寶", task: "說出 10 位工人的本名", difficulty: "困難", success: 500, fail: 100, criteria: "名字正確" },
  { name: "福星高照", task: "比手畫腳，3 分鐘內猜對 8 題", difficulty: "中等", success: 300, fail: 0, criteria: "猜對 8 題" },
  { name: "默契滿分", task: "默契大考驗（關鍵字全隊同動作），完成 3 題", difficulty: "簡單", success: 150, fail: 0, criteria: "完成 3 題" },
];

// 厄運卡：扣錢牌 + 懲罰任務牌
export const BAD_LUCK_CARDS: BadCard[] = [
  { name: "迷霧收費站", kind: "扣錢牌", content: "減免任務：猜拳，過半數隊員贏過關主", criteria: "半數以上勝利", outcomes: [{ label: "未完成", deduct: 200 }, { label: "完成減免", deduct: 100 }] },
  { name: "資本寒流", kind: "扣錢牌", content: "減免任務：每人做 15 下波比跳", criteria: "全員完成", outcomes: [{ label: "未完成", deduct: 300 }, { label: "完成減免", deduct: 100 }] },
  { name: "黑市稅捐", kind: "扣錢牌", content: "減免任務：繞口令完成 2 題", criteria: "完成 2 題", outcomes: [{ label: "未完成", deduct: 200 }, { label: "完成減免", deduct: 100 }] },
  { name: "迷霧罰款", kind: "扣錢牌", content: "減免任務：冷知識 5 題答對 3 題", criteria: "答對 3 題", outcomes: [{ label: "未完成", deduct: 100 }, { label: "完成減免", deduct: 50 }] },
  { name: "暗影徵收", kind: "扣錢牌", content: "減免任務：默契大考驗 5 題完成 3 題", criteria: "完成 3 題", outcomes: [{ label: "未完成", deduct: 100 }, { label: "完成減免", deduct: 50 }] },
  { name: "影焰稅單", kind: "扣錢牌", content: "減免任務：說出 10 位工人的本名", criteria: "名字正確", outcomes: [{ label: "未完成", deduct: 100 }, { label: "完成減免", deduct: 0 }] },
  { name: "大頭貼時刻", kind: "懲罰任務牌", content: "全隊鬼臉五連拍，關主拍照存檔", difficulty: "簡單", outcomes: [{ label: "完成", deduct: 0 }, { label: "未完成", deduct: 100 }] },
  { name: "訓練時間", kind: "懲罰任務牌", content: "每人捲腹 10 下", difficulty: "簡單", outcomes: [{ label: "完成", deduct: 0 }, { label: "未完成", deduct: 100 }] },
  { name: "神秘書法家", kind: "懲罰任務牌", content: "用屁股寫指定國字，隊輔猜對才完成", difficulty: "中等", outcomes: [{ label: "猜中", deduct: 0 }, { label: "沒猜中", deduct: 100 }] },
  { name: "霧中魅力秀", kind: "懲罰任務牌", content: "輪流擺自選姿勢，關主評分", difficulty: "簡單", outcomes: [{ label: "及格", deduct: 0 }, { label: "不及格", deduct: 200 }] },
  { name: "影焰跳操", kind: "懲罰任務牌", content: "每人開合跳 20 下", difficulty: "中等", outcomes: [{ label: "完成", deduct: 0 }, { label: "未完成", deduct: 100 }] },
  { name: "友善外交", kind: "懲罰任務牌", content: "找三個工人，分別說出各自三個優點", difficulty: "簡單", outcomes: [{ label: "完成", deduct: 0 }, { label: "沒說", deduct: 400 }] },
  { name: "美麗指數", kind: "懲罰任務牌", content: "說出本隊最帥或最美的人並說明理由", difficulty: "簡單", outcomes: [{ label: "完成", deduct: 0 }] },
  { name: "部首大考驗", kind: "懲罰任務牌", content: "90 秒內寫出指定數量含該部首的字", difficulty: "困難", outcomes: [{ label: "完成", deduct: 0 }, { label: "失敗", deduct: 100 }] },
];

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
  { type: "市場預警卡", effect: "得知下一次事件前某區漲跌方向", cost: 50, defaultStock: 2 },
];

// 發放獎勵 / 懲罰的快捷預設（資料化，單一來源；前端共用元件 RewardButtons 讀取）
// 幾秒內可撤銷的「反悔配方」：只帶要回沖的 ledger 列 id 與（選用）不動產原狀態。
// 金額一律由伺服器照 ledger 列的 -delta 反推，不信任前端帶的數字。
export type UndoRecipe = {
  label: string;
  ledgerIds: number[];
  property?: { id: number; ownerTeamId: number | null; level: number };
  // 一次影響多塊不動產時（換地 / 換屋）逐筆還原；與 property 單筆並存。
  properties?: { id: number; ownerTeamId: number | null; level: number }[];
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
  { label: "契約贊助 +100", coins: 100, tone: "good" },
  { label: "契約違約 -100", coins: -100, tone: "bad" },
  { label: "光源點 +200", coins: 200, tone: "good" },
  { label: "迷霧區 -200", coins: -200, tone: "bad" },
  { label: "財靈 +150", coins: 150, tone: "spirit" },
];

export const MOBILE_REWARD_PRESETS: RewardPreset[] = [
  { label: "光幣 +200", coins: 200, note: "小遊戲獎勵 光幣", tone: "good" },
  { label: "卡牌點數 +20", cardPoints: 20, note: "小遊戲獎勵 卡牌點數", tone: "good" },
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
