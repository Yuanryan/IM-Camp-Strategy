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
  // 極光金域
  { name: "天穹銀行", region: "AURORA", type: "金融", basePrice: 550 },
  { name: "星幣當舖", region: "AURORA", type: "金融", basePrice: 350 },
  { name: "星穹百貨", region: "AURORA", type: "商業", basePrice: 350 },
  { name: "鑽石金街", region: "AURORA", type: "商業", basePrice: 400 },
  { name: "流金廣場", region: "AURORA", type: "商業", basePrice: 300 },
  { name: "金霧投資中心", region: "AURORA", type: "投資", basePrice: 500 },
  { name: "光軌商貿站", region: "AURORA", type: "商貿", basePrice: 350 },
  { name: "晶瑩會展中心", region: "AURORA", type: "展覽", basePrice: 450 },
  // 靈序研究
  { name: "靈光實驗塔", region: "SPECTRA", type: "研究", basePrice: 450 },
  { name: "鏡域模擬中心", region: "SPECTRA", type: "研究", basePrice: 600 },
  { name: "量子通訊所", region: "SPECTRA", type: "通訊", basePrice: 550 },
  { name: "星鏈研究院", region: "SPECTRA", type: "通訊", basePrice: 550 },
  { name: "深井資料庫", region: "SPECTRA", type: "資料", basePrice: 500 },
  { name: "星圖資料分析局", region: "SPECTRA", type: "資料", basePrice: 600 },
  { name: "天穹機器人中心", region: "SPECTRA", type: "AI", basePrice: 400 },
  { name: "幻網開發場", region: "SPECTRA", type: "網路", basePrice: 450 },
  // 影焰工域
  { name: "黑焰能源棧", region: "EMBER", type: "能源", basePrice: 650 },
  { name: "影焰發電廠", region: "EMBER", type: "能源", basePrice: 650 },
  { name: "熔光工坊", region: "EMBER", type: "製造", basePrice: 450 },
  { name: "剛霧鍛造場", region: "EMBER", type: "製造", basePrice: 550 },
  { name: "霧鐵礦場", region: "EMBER", type: "原料", basePrice: 500 },
  { name: "光軌運輸站", region: "EMBER", type: "物流", basePrice: 500 },
  { name: "夜航貨櫃碼頭", region: "EMBER", type: "物流", basePrice: 550 },
  { name: "灰燼儲倉", region: "EMBER", type: "物流", basePrice: 450 },
  // 晨霧棲城
  { name: "晨曦住宅苑", region: "HAVEN", type: "住宅", basePrice: 500 },
  { name: "微光美提花園", region: "HAVEN", type: "住宅", basePrice: 500 },
  { name: "月灣公寓", region: "HAVEN", type: "住宅", basePrice: 450 },
  { name: "綠霧圖書館", region: "HAVEN", type: "教育", basePrice: 500 },
  { name: "湖畔小學", region: "HAVEN", type: "教育", basePrice: 500 },
  { name: "青燈療養院", region: "HAVEN", type: "醫療", basePrice: 600 },
  { name: "安森運動中心", region: "HAVEN", type: "運動", basePrice: 450 },
  { name: "晨露咖啡街", region: "HAVEN", type: "飲食", basePrice: 450 },
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

export function roundTo50(n: number): number {
  return Math.round(n / 50) * 50;
}

// 升級費用：購買=base；1級=base×20%；2級=40%；3級=60%（四捨五入到 50）
// 傳入「目前等級」回傳升到下一級的費用；level 3 不可再升
export function upgradeFee(basePrice: number, currentLevel: number): number | null {
  const rate: Record<number, number> = { 0: 0.2, 1: 0.4, 2: 0.6 };
  if (!(currentLevel in rate)) return null;
  return roundTo50(basePrice * rate[currentLevel]);
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
  COINS_PER_ROUND:   "COINS_PER_ROUND",   // 每輪固定光幣（50 → +50/輪）
  TAX_COLLECTOR:     "TAX_COLLECTOR",     // 全場每筆過路費抽成（0.02 → 2%）
  GOOD_CARD_BONUS:   "GOOD_CARD_BONUS",   // 好運卡獎勵加成（+0.20 → +20%）
  BAD_CARD_REDUCE:   "BAD_CARD_REDUCE",   // 厄運卡懲罰減免（-0.50 → -50%；-1.0 → 免疫）
  WHEEL_BONUS:       "WHEEL_BONUS",       // 輪盤淨獲利加成（+0.50 → 獲利 ×1.5）
  WHEEL_NO_ZERO:     "WHEEL_NO_ZERO",     // 移除輪盤 ×0 結果（保底不輸本）
  WHEEL_STAKE_BOOST: "WHEEL_STAKE_BOOST", // 輪盤投入上限提升（+0.10 → 最多押 20% 資金）
  WHEEL_ON_GOOD_CARD:"WHEEL_ON_GOOD_CARD",// 好運卡獎勵 × 輪盤結果
  LOTTERY_BONUS:     "LOTTERY_BONUS",     // 大樂透中獎倍率加成（+0.50 → 獎金 ×1.5）
  JACKPOT_SHARE:     "JACKPOT_SHARE",     // 任意隊中獎時自動抽成（0.05 → 5% 獎金池）
  LOTTERY_INSURANCE: "LOTTERY_INSURANCE", // 未中獎時退還本期登記費用（一次性）
  COMPOUND_INTEREST: "COMPOUND_INTEREST", // 每輪賺取現有光幣 X%（0.02 → 2%/輪）
  PROPERTY_DIVIDEND: "PROPERTY_DIVIDEND", // 每輪賺取不動產現值 X%（0.03 → 3%/輪）
  UNDERDOG:          "UNDERDOG",          // 末位時每輪獲得固定補貼（200 → 末位時 +200/輪）
  DOUBLE_OR_NOTHING: "DOUBLE_OR_NOTHING", // 流動關主發獎時 50/50：雙倍或歸零
  ALLIANCE_BONUS:    "ALLIANCE_BONUS",    // 交易接受時雙方各獲固定光幣（50 → 各 +50）
  PIRACY:            "PIRACY",            // 任意過路費發生時偷取付款隊比例（0.05 → 5%）
  REMINDER:          "REMINDER",          // 無計算，僅提醒關主
} as const;
export type EffectType = typeof EffectType[keyof typeof EffectType];

export const EFFECT_TYPE_LABELS: Record<EffectType, string> = {
  TOLL_INCOME:       "收路費加成",
  TOLL_PAID:         "付路費減免",
  SHOP_PRICE:        "購買折扣",
  PROPERTY_VALUE:    "不動產增值",
  COINS_PER_ROUND:   "每輪收益",
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
  COMPOUND_INTEREST: "複利收益",
  PROPERTY_DIVIDEND: "不動產分紅",
  UNDERDOG:          "末位補貼",
  DOUBLE_OR_NOTHING: "雙倍或歸零",
  ALLIANCE_BONUS:    "交易紅利",
  PIRACY:            "海盜稅",
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

// COINS_PER_ROUND：每輪固定收益（total = 各道具光幣直接相加）
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

// COMPOUND_INTEREST：按現有光幣計算利息
export function applyCompoundInterest(coins: number, rate: number): number {
  return Math.max(0, Math.round(coins * rate));
}

// PROPERTY_DIVIDEND：按不動產現值計算分紅
export function applyPropertyDividend(propertyValue: number, rate: number): number {
  return Math.max(0, Math.round(propertyValue * rate));
}

// PIRACY：從過路費付款方偷取比例
export function applyPiracy(baseToll: number, rate: number): number {
  return Math.max(0, Math.round(baseToll * rate));
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
export const MOVABLE_ASSET_SEED: {
  name: string;
  grade: string;
  effectType: EffectType;
  effectValue: number;
  condition: string | null;
  description: string;
  defaultUses: number | null;
}[] = [
  // ── S 級 ──
  { name: "黃金稅收牌",   grade: "S", effectType: "TOLL_INCOME",    effectValue:  0.25, condition: null, defaultUses: 3,    description: "收取過路費時額外獲得 25%（3 次）" },
  { name: "鑽石免稅令",   grade: "S", effectType: "TOLL_PAID",       effectValue: -0.25, condition: null, defaultUses: 3,    description: "支付過路費時減少 25%（3 次）" },
  { name: "地產霸業卷",   grade: "S", effectType: "PROPERTY_VALUE",  effectValue:  0.25, condition: null, defaultUses: null, description: "持有不動產結算淨值 +25%（永久）" },
  { name: "稅務特許狀",   grade: "S", effectType: "TAX_COLLECTOR",   effectValue:  0.04, condition: null, defaultUses: null, description: "全場每筆過路費自動抽成 4%（永久）" },
  // ── A 級 ──
  { name: "銀行分紅卡",   grade: "A", effectType: "TOLL_INCOME",    effectValue:  0.15, condition: null, defaultUses: 2,    description: "收取過路費時額外獲得 15%（2 次）" },
  { name: "商業折扣券",   grade: "A", effectType: "SHOP_PRICE",      effectValue: -0.15, condition: null, defaultUses: 2,    description: "購買或升級不動產費用 -15%（2 次）" },
  { name: "地產加值令",   grade: "A", effectType: "PROPERTY_VALUE",  effectValue:  0.15, condition: null, defaultUses: null, description: "持有不動產結算淨值 +15%（永久）" },
  { name: "穩定收益債",   grade: "A", effectType: "COINS_PER_ROUND", effectValue: 100,   condition: null, defaultUses: null, description: "每輪固定收益 100 光幣（永久）" },
  { name: "區域壟斷令",   grade: "A", effectType: "TOLL_INCOME",    effectValue:  0.20, condition: JSON.stringify({ region: "AURORA" }), defaultUses: 2, description: "在極光金域收取過路費 +20%（2 次）" },
  { name: "好運加倍咒",   grade: "A", effectType: "GOOD_CARD_BONUS", effectValue:  0.20, condition: null, defaultUses: 2,    description: "好運卡獎勵光幣 +20%（2 次）" },
  { name: "行動加速符",   grade: "A", effectType: "REMINDER",        effectValue:  0,    condition: null, defaultUses: null, description: "【提醒關主】每輪可多移動 2 步（永久）" },
  // ── B 級 ──
  { name: "小額分潤卡",   grade: "B", effectType: "TOLL_INCOME",    effectValue:  0.08, condition: null, defaultUses: 1,    description: "收取過路費時額外獲得 8%（1 次）" },
  { name: "折扣優惠券",   grade: "B", effectType: "SHOP_PRICE",      effectValue: -0.08, condition: null, defaultUses: 1,    description: "購買或升級不動產費用 -8%（1 次）" },
  { name: "地產小加成",   grade: "B", effectType: "PROPERTY_VALUE",  effectValue:  0.08, condition: null, defaultUses: null, description: "持有不動產結算淨值 +8%（永久）" },
  { name: "每輪小收益",   grade: "B", effectType: "COINS_PER_ROUND", effectValue:  50,   condition: null, defaultUses: null, description: "每輪固定收益 50 光幣（永久）" },
  { name: "付路費折扣牌", grade: "B", effectType: "TOLL_PAID",       effectValue: -0.10, condition: null, defaultUses: 1,    description: "支付過路費時減少 10%（1 次）" },
  { name: "迷霧護身符",   grade: "B", effectType: "BAD_CARD_REDUCE", effectValue: -1.0,  condition: null, defaultUses: 1,    description: "厄運卡懲罰完全免疫（1 次）" },
  { name: "幸運符咒",     grade: "B", effectType: "GOOD_CARD_BONUS", effectValue:  0.10, condition: null, defaultUses: 1,    description: "好運卡獎勵光幣 +10%（1 次）" },
  { name: "受難減免卡",   grade: "B", effectType: "BAD_CARD_REDUCE", effectValue: -0.50, condition: null, defaultUses: 1,    description: "厄運卡懲罰減少 50%（1 次）" },
  // ── 詛咒道具（偽裝成普通 B 級，實際為負面效果）──
  { name: "詛咒稅單",     grade: "B", effectType: "TOLL_INCOME",    effectValue: -0.15, condition: null, defaultUses: 3,    description: "收取過路費時反而少收 15%（詛咒，3 次）" },
  { name: "黑市合約",     grade: "B", effectType: "SHOP_PRICE",      effectValue:  0.10, condition: null, defaultUses: 2,    description: "購買或升級費用 +10%（詛咒，2 次）" },
  // ── 輪盤系列 ──
  { name: "幸運女神眷顧", grade: "S", effectType: "WHEEL_BONUS",      effectValue:  0.50, condition: null, defaultUses: 3,    description: "輪盤淨獲利 +50%（3 次，虧損不放大）" },
  { name: "保底護符",     grade: "A", effectType: "WHEEL_NO_ZERO",    effectValue:  0,    condition: null, defaultUses: 2,    description: "輪盤保底，×0 結果不會出現（2 次）" },
  { name: "槓桿王牌",     grade: "A", effectType: "WHEEL_STAKE_BOOST",effectValue:  0.10, condition: null, defaultUses: null, description: "輪盤最大投入上限從 10% 提升至 20%（永久）" },
  { name: "抽卡輪盤",     grade: "S", effectType: "WHEEL_ON_GOOD_CARD",effectValue: 0,    condition: null, defaultUses: 2,    description: "好運卡獎勵再乘以輪盤結果（大起大落！2 次）" },
  // ── 大樂透系列 ──
  { name: "彩票加倍咒",   grade: "S", effectType: "LOTTERY_BONUS",    effectValue:  0.50, condition: null, defaultUses: null, description: "中獎時獎金 ×1.5（永久）" },
  { name: "彩票抽成令",   grade: "S", effectType: "JACKPOT_SHARE",    effectValue:  0.05, condition: null, defaultUses: null, description: "任意隊中獎時自動獲得 5% 獎金池（永久）" },
  { name: "彩票保險單",   grade: "A", effectType: "LOTTERY_INSURANCE", effectValue: 1,    condition: null, defaultUses: 1,    description: "本期未中獎時退還所有登記費用（一次性）" },
  // ── 每輪收益系列 ──
  { name: "複利魔方",     grade: "S", effectType: "COMPOUND_INTEREST", effectValue: 0.03, condition: null, defaultUses: null, description: "每輪賺取現有光幣 3%（永久）" },
  { name: "不動產分紅",   grade: "A", effectType: "PROPERTY_DIVIDEND", effectValue: 0.03, condition: null, defaultUses: null, description: "每輪賺取不動產現值 3%（永久）" },
  { name: "末位補貼金",   grade: "A", effectType: "UNDERDOG",          effectValue: 200,  condition: null, defaultUses: null, description: "每輪若為末位，獲得 200 光幣補貼（永久）" },
  // ── 特殊系列 ──
  { name: "雙倍或歸零",   grade: "S", effectType: "DOUBLE_OR_NOTHING", effectValue: 0,    condition: null, defaultUses: null, description: "流動關主發獎時 50/50：光幣雙倍或歸零（永久）" },
  { name: "交易紅利卡",   grade: "B", effectType: "ALLIANCE_BONUS",    effectValue: 100,  condition: null, defaultUses: 3,    description: "交易接受時雙方各獲 100 光幣（3 次）" },
  { name: "海盜旗",       grade: "S", effectType: "PIRACY",            effectValue: 0.05, condition: null, defaultUses: null, description: "全場每筆過路費偷取付款隊 5% 光幣（永久）" },
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
  { type: "購地卡", effect: "強制收購對手一塊土地", cost: 30, defaultStock: 4 },
  { type: "換地卡", effect: "以己方土地與對手土地交換", cost: 25, defaultStock: 4 },
  { type: "換屋卡", effect: "交換房屋升級級別", cost: 20, defaultStock: 4 },
  { type: "拆屋卡", effect: "拆除對手一層房屋", cost: 25, defaultStock: 4 },
  { type: "怪獸卡", effect: "摧毀對手一棟房屋", cost: 40, defaultStock: 3 },
  { type: "護盾卡", effect: "抵擋一次卡牌攻擊或過路費", cost: 20, defaultStock: 6 },
  { type: "情蒐卡", effect: "獲得指定對手資訊", cost: 15, defaultStock: 6 },
  { type: "加速骰", effect: "立即獲得 1 顆普通骰", cost: 10, defaultStock: 8 },
  { type: "市場預警卡", effect: "得知下一次事件前某區漲跌方向", cost: 25, defaultStock: 4 },
  { type: "大樂透加購卡", effect: "額外登記一個大樂透號碼", cost: 15, defaultStock: 4 },
];

// 發放獎勵 / 懲罰的快捷預設（資料化，單一來源；前端共用元件 RewardButtons 讀取）
// 幾秒內可撤銷的「反悔配方」：只帶要回沖的 ledger 列 id 與（選用）不動產原狀態。
// 金額一律由伺服器照 ledger 列的 -delta 反推，不信任前端帶的數字。
export type UndoRecipe = {
  label: string;
  ledgerIds: number[];
  property?: { id: number; ownerTeamId: number | null; level: number };
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
  "LOTTERY",
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
  LOTTERY: "/lottery",
  PROJECTION: "/projection",
  ADMIN: "/admin",
  TEAM: "/team",
};

export const ROLE_LABEL: Record<Role, string> = {
  HOST: "主持人",
  EXCHANGE: "交易所",
  MAP: "地圖關主",
  MOBILE: "流動關主",
  CARDSHOP: "卡牌商店",
  LOTTERY: "大樂透",
  PROJECTION: "投影",
  ADMIN: "Admin",
  TEAM: "小隊",
};
