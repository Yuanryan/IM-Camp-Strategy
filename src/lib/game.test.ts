import { describe, it, expect } from "vitest";
import {
  stackEffects,
  roundTo10,
  currentValue,
  leveledValue,
  LEVEL_VALUE_BONUS,
  investedValue,
  investedPrincipalMult,
  upgradeFee,
  lotteryFee,
  parseActiveEvents,
  spinWheel,
  spinWheelCustom,
  freeWheelReward,
  FREE_WHEEL_STAKE,
  GIFT_VOUCHER_NAME,
  WHEEL_OUTCOMES,
  MOVABLE_ASSET_SEED,
  EffectType,
  EFFECT_TYPE_LABELS,
  applyShopPrice,
  applyToll,
  applyPropertyValue,
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
  applyPiracy,
  applyAllianceBonus,
  applyMovement,
  movementMode,
  movementActionLabel,
  MovementMode,
  MOVEMENT_MODE_LABELS,
  BOARD_SIZE,
  computeMobileReward,
  MOBILE_REWARD_RATES,
  MOBILE_GAMES,
  weightedPick,
  GOOD_LUCK_CARDS,
  TASK_GOOD_CARDS,
  MAX_OPEN_TASKS,
  TaskKind,
  isInstantGood,
  isTaskGood,
  pickTaskCard,
  evalObjectiveProgress,
  findMonopoly,
  type ObjectiveBaseline,
  type ObjectiveState,
} from "./game";

// 任務目標測試共用：建一個「全 0 基準 + 全 0 現況」，個別 case 只覆寫需要的欄位。
const ZERO_BASE: ObjectiveBaseline = {
  baseTradeCount: 0, basePropertyCount: 0, baseLevel3Count: 0,
  baseCardUseCount: 0, baseAuctionWins: 0, baseMonopolyRegions: [],
};
const ZERO_STATE: ObjectiveState = {
  tradeCount: 0, propertyCount: 0, level3Count: 0,
  cardUseCount: 0, auctionWins: 0, monopolyRegions: [],
};

// ── 動產效果疊加（相加，無遞減）──────────────────────────────
describe("stackEffects", () => {
  it("空陣列回傳 0", () => {
    expect(stackEffects([])).toBe(0);
  });

  it("單一值原樣回傳", () => {
    expect(stackEffects([0.15])).toBeCloseTo(0.15);
  });

  it("同類效果直接相加（截圖案例：+20% +20% +8% = +48%）", () => {
    expect(stackEffects([0.2, 0.2, 0.08])).toBeCloseTo(0.48);
  });

  it("正負混合（詛咒道具抵銷加成）", () => {
    expect(stackEffects([0.25, -0.15])).toBeCloseTo(0.1);
  });

  it("順序不影響結果", () => {
    expect(stackEffects([0.08, 0.2, 0.2])).toBeCloseTo(stackEffects([0.2, 0.2, 0.08]));
  });
});

// ════════════════════════════════════════════════════════════
//  所有動產 effectType 的套用公式（service.ts / snapshot.ts 共用）
// ════════════════════════════════════════════════════════════

// ── TOLL_INCOME + TOLL_PAID（過路費）──────────────────────────
// stackEffects 先把同類加總，再交給 applyToll
describe("effect: TOLL_INCOME / TOLL_PAID（applyToll）", () => {
  it("無道具時等於基礎過路費", () => {
    expect(applyToll(50, 0, 0)).toBe(50);
  });

  it("獨佔隊 TOLL_INCOME +48% → 50 變 74（截圖案例）", () => {
    const incomeDelta = stackEffects([0.2, 0.2, 0.08]);
    expect(applyToll(50, incomeDelta, 0)).toBe(74);
  });

  it("付款隊 TOLL_PAID -25% 降低應付", () => {
    expect(applyToll(200, 0, -0.25)).toBe(150);
  });

  it("收款加成與付款減免同時作用（守恆：付＝收）", () => {
    expect(applyToll(100, 0.2, -0.1)).toBe(110);
  });

  it("減免不會使過路費變負", () => {
    expect(applyToll(100, 0, -2.0)).toBe(0);
  });
});

// ── SHOP_PRICE（購買 / 升級折扣）──────────────────────────────
describe("effect: SHOP_PRICE（applyShopPrice）", () => {
  it("無道具時為折後原價", () => {
    expect(applyShopPrice(500, 0)).toBe(500);
  });
  it("-15% 折扣", () => {
    expect(applyShopPrice(500, -0.15)).toBe(425);
  });
  it("詛咒 +10% 加價", () => {
    expect(applyShopPrice(500, 0.1)).toBe(550);
  });
  it("折扣疊加（-8% 與 -15% = -23%）", () => {
    expect(applyShopPrice(1000, stackEffects([-0.08, -0.15]))).toBe(770);
  });
  it("不會變負", () => {
    expect(applyShopPrice(100, -2)).toBe(0);
  });
});

// ── PROPERTY_VALUE（不動產結算淨值）───────────────────────────
describe("effect: PROPERTY_VALUE（applyPropertyValue）", () => {
  it("無道具時等於原值", () => {
    expect(applyPropertyValue(1000, 0)).toBe(1000);
  });
  it("+25% 加成", () => {
    expect(applyPropertyValue(1000, 0.25)).toBe(1250);
  });
  it("多張疊加（+25% +15% +8% = +48%）", () => {
    expect(applyPropertyValue(1000, stackEffects([0.25, 0.15, 0.08]))).toBe(1480);
  });
});

// ── GOOD_CARD_BONUS（好運卡獎勵加成）─────────────────────────
describe("effect: GOOD_CARD_BONUS（applyGoodCardReward）", () => {
  it("無道具時等於原獎勵", () => {
    expect(applyGoodCardReward(300, 0)).toBe(300);
  });
  it("+20% 加成", () => {
    expect(applyGoodCardReward(300, 0.2)).toBe(360);
  });
  it("基礎獎勵為 0（失敗卡）時不發，加成也無效", () => {
    expect(applyGoodCardReward(0, 0.2)).toBe(0);
  });
});

// ── BAD_CARD_REDUCE（厄運卡懲罰減免）─────────────────────────
describe("effect: BAD_CARD_REDUCE（applyBadCardPenalty）", () => {
  it("無道具時全額懲罰", () => {
    expect(applyBadCardPenalty(200, 0)).toBe(200);
  });
  it("-50% 減免", () => {
    expect(applyBadCardPenalty(200, -0.5)).toBe(100);
  });
  it("-1.0 = 完全免疫（迷霧護身符）", () => {
    expect(applyBadCardPenalty(200, -1.0)).toBe(0);
  });
  it("超額減免不會變成倒貼", () => {
    expect(applyBadCardPenalty(200, -1.5)).toBe(0);
  });
  it("基礎懲罰為 0 時回傳 0", () => {
    expect(applyBadCardPenalty(0, -0.5)).toBe(0);
  });
});

// ── TAX_COLLECTOR（全場過路費抽成）────────────────────────────
describe("effect: TAX_COLLECTOR（applyTaxCut）", () => {
  it("無道具時抽成 0", () => {
    expect(applyTaxCut(500, 0)).toBe(0);
  });
  it("4% 抽成", () => {
    expect(applyTaxCut(500, 0.04)).toBe(20);
  });
  it("多張稅收道具 rate 直接相加（4% + 4% = 8%）", () => {
    expect(applyTaxCut(500, stackEffects([0.04, 0.04]))).toBe(40);
  });
});

// ── COINS_PER_ROUND（每輪固定收益）───────────────────────────
describe("effect: COINS_PER_ROUND（applyRoundIncome）", () => {
  it("單張收益", () => {
    expect(applyRoundIncome(100)).toBe(100);
  });
  it("多張收益直接相加（100 + 50 = 150）", () => {
    expect(applyRoundIncome([100, 50].reduce((a, b) => a + b, 0))).toBe(150);
  });
});

// ── WHEEL_BONUS ───────────────────────────────────────────────
describe("effect: WHEEL_BONUS（applyWheelBonus）", () => {
  it("無道具時不變", () => {
    expect(applyWheelBonus(100, 0)).toBe(100);
  });
  it("+50% 獲利加成", () => {
    expect(applyWheelBonus(200, 0.5)).toBe(300);
  });
  it("虧損（負 delta）不放大", () => {
    expect(applyWheelBonus(-500, 0.5)).toBe(-500);
  });
  it("零值不變", () => {
    expect(applyWheelBonus(0, 0.5)).toBe(0);
  });
});

// ── WHEEL_STAKE_BOOST ─────────────────────────────────────────
describe("effect: WHEEL_STAKE_BOOST（applyWheelMaxStake）", () => {
  it("無道具時為 10% 上限（coins 需 > 5000 才超過保底）", () => {
    expect(applyWheelMaxStake(10000, 0)).toBe(1000);
  });
  it("+10% boost → 20% 上限", () => {
    expect(applyWheelMaxStake(10000, 0.1)).toBe(2000);
  });
  it("保底 500（低 coins 時）", () => {
    expect(applyWheelMaxStake(100, 0)).toBe(500);
  });
});

// ── WHEEL_NO_ZERO（spinWheelCustom）──────────────────────────
describe("effect: WHEEL_NO_ZERO（spinWheelCustom）", () => {
  it("排除 ×0 後永遠不出現 ×0", () => {
    for (let i = 0; i < 500; i++) {
      expect(spinWheelCustom({ excludeMultipliers: [0] })).not.toBe(0);
    }
  });
  it("無排除時與 spinWheel 一樣可能出 ×0", () => {
    const valid = new Set(WHEEL_OUTCOMES.map((o) => o.mult));
    for (let i = 0; i < 100; i++) {
      expect(valid.has(spinWheelCustom())).toBe(true);
    }
  });
});

// ── LOTTERY_BONUS ─────────────────────────────────────────────
describe("effect: LOTTERY_BONUS（applyLotteryBonus）", () => {
  it("無道具時等於原獎金", () => {
    expect(applyLotteryBonus(1000, 0)).toBe(1000);
  });
  it("+50% 加成", () => {
    expect(applyLotteryBonus(1000, 0.5)).toBe(1500);
  });
});

// ── JACKPOT_SHARE ────────────────────────────────────────────
describe("effect: JACKPOT_SHARE（applyJackpotShare）", () => {
  it("5% 抽成", () => {
    expect(applyJackpotShare(1000, 0.05)).toBe(50);
  });
  it("rate = 0 時為 0", () => {
    expect(applyJackpotShare(1000, 0)).toBe(0);
  });
  it("不為負", () => {
    expect(applyJackpotShare(-100, 0.05)).toBe(0);
  });
});

describe("effect: LOTTERY_FEE_DISCOUNT（applyLotteryFeeDiscount）", () => {
  it("5 折", () => {
    expect(applyLotteryFeeDiscount(100, -0.5)).toBe(50);
  });
  it("delta = 0 時不變", () => {
    expect(applyLotteryFeeDiscount(100, 0)).toBe(100);
  });
  it("多張疊加夾到 0（不為負）", () => {
    expect(applyLotteryFeeDiscount(100, -1.5)).toBe(0);
  });
});

// ── COMPOUND_INTEREST ────────────────────────────────────────
describe("effect: COMPOUND_INTEREST（applyCompoundInterest）", () => {
  it("3% 利率", () => {
    expect(applyCompoundInterest(1000, 0.03)).toBe(30);
  });
  it("coins = 0 時為 0", () => {
    expect(applyCompoundInterest(0, 0.03)).toBe(0);
  });
  it("不為負", () => {
    expect(applyCompoundInterest(-100, 0.03)).toBe(0);
  });
});

// ── PROPERTY_DIVIDEND ────────────────────────────────────────
describe("effect: PROPERTY_DIVIDEND（applyPropertyDividend）", () => {
  it("3% 分紅", () => {
    expect(applyPropertyDividend(2000, 0.03)).toBe(60);
  });
  it("無不動產時為 0", () => {
    expect(applyPropertyDividend(0, 0.03)).toBe(0);
  });
});

// ── PIRACY（海盜旗：從被標記隊收到的過路費抽成）─────────────────
describe("effect: PIRACY（applyPiracy）", () => {
  it("從過路費抽 10% 成", () => {
    expect(applyPiracy(200, 0.1)).toBe(20);
  });
  it("rate = 0 時為 0", () => {
    expect(applyPiracy(200, 0)).toBe(0);
  });
  it("不為負", () => {
    expect(applyPiracy(-100, 0.1)).toBe(0);
  });
});

// ── ALLIANCE_BONUS ────────────────────────────────────────────
describe("effect: ALLIANCE_BONUS（applyAllianceBonus）", () => {
  it("固定值 100", () => {
    expect(applyAllianceBonus(100)).toBe(100);
  });
  it("不為負", () => {
    expect(applyAllianceBonus(-50)).toBe(0);
  });
});

// ── WHEEL_ON_GOOD_CARD、DOUBLE_OR_NOTHING、UNDERDOG、LOTTERY_INSURANCE
// 這三個含隨機 / 條件邏輯，核心邏輯在 service.ts（整合測試才能完整驗）。
// 此處只驗結構正確。
describe("effect: 含條件 / 隨機 effectType 結構驗證", () => {
  // 註：主題化道具改版後，WHEEL_ON_GOOD_CARD / DOUBLE_OR_NOTHING 已刻意不在牌庫中。
  it("UNDERDOG 在 MOVABLE_ASSET_SEED 中存在", () => {
    expect(MOVABLE_ASSET_SEED.some((a) => a.effectType === EffectType.UNDERDOG)).toBe(true);
  });
  it("LOTTERY_INSURANCE 在 MOVABLE_ASSET_SEED 中存在", () => {
    expect(MOVABLE_ASSET_SEED.some((a) => a.effectType === EffectType.LOTTERY_INSURANCE)).toBe(true);
  });
  it("LOTTERY_FEE_DISCOUNT 在 MOVABLE_ASSET_SEED 中存在", () => {
    expect(MOVABLE_ASSET_SEED.some((a) => a.effectType === EffectType.LOTTERY_FEE_DISCOUNT)).toBe(true);
  });
});

// ── REMINDER：無計算效果（僅資料驗證，見 MOVABLE_ASSET_SEED）──

// ── 涵蓋性檢查：每個 effectType 都有對應測試 ─────────────────
describe("effect 覆蓋率", () => {
  it("每個 effectType 都有套用公式或結構驗證", () => {
    const tested = new Set([
      EffectType.TOLL_INCOME,
      EffectType.TOLL_PAID,
      EffectType.SHOP_PRICE,
      EffectType.MYSTERY_SHOP_PRICE, // 與 SHOP_PRICE 共用 applyShopPrice 公式
      EffectType.PROPERTY_VALUE,
      EffectType.GOOD_CARD_BONUS,
      EffectType.BAD_CARD_REDUCE,
      EffectType.TAX_COLLECTOR,
      EffectType.COINS_PER_ROUND,
      EffectType.WHEEL_BONUS,
      EffectType.WHEEL_STAKE_BOOST,
      EffectType.WHEEL_NO_ZERO,
      EffectType.WHEEL_ON_GOOD_CARD,
      EffectType.LOTTERY_BONUS,
      EffectType.JACKPOT_SHARE,
      EffectType.LOTTERY_INSURANCE,
      EffectType.LOTTERY_FEE_DISCOUNT,
      EffectType.COMPOUND_INTEREST,
      EffectType.PROPERTY_DIVIDEND,
      EffectType.UNDERDOG,
      EffectType.DOUBLE_OR_NOTHING,
      EffectType.ALLIANCE_BONUS,
      EffectType.PIRACY,
      EffectType.MOVEMENT,
      EffectType.REMINDER,
    ]);
    for (const t of Object.values(EffectType)) {
      expect(tested.has(t)).toBe(true);
    }
  });
});

// ── roundTo10 ────────────────────────────────────────────────
describe("roundTo10", () => {
  it.each([
    [0, 0],
    [4, 0],
    [5, 10],
    [74, 70],
    [75, 80],
    [511, 510],
  ])("%i → %i", (input, expected) => {
    expect(roundTo10(input)).toBe(expected);
  });
});

// ── currentValue（市場事件倍率）──────────────────────────────
describe("currentValue", () => {
  const aurora = { basePrice: 500, region: "AURORA", type: "金融" };
  const haven = { basePrice: 500, region: "HAVEN", type: "住宅" };

  it("無事件時等於初始價", () => {
    expect(currentValue(aurora, [], null)).toBe(500);
  });

  it("事件一：極光金域整區 ×1.25 並疊乘金融類 ×1.1", () => {
    // 500 * 1.25 * 1.1 = 687.5 → round 688
    expect(currentValue(aurora, [1], null)).toBe(688);
  });

  it("事件一：晨霧棲城整區下跌 ×0.9 並疊乘住宅 ... ", () => {
    // 事件一 typeMult 不含住宅，只有 regionMult HAVEN 0.9 → 500*0.9 = 450
    expect(currentValue(haven, [1], null)).toBe(450);
  });

  it("事件四主持人懲罰區再 ×0.85", () => {
    // 事件四 HAVEN regionMult 1.3、住宅 typeMult 1.1，懲罰區 HAVEN ×0.85
    // 500 * 1.3 * 1.1 * 0.85 = 607.75 → 608
    expect(currentValue(haven, [4], "HAVEN")).toBe(608);
  });

  it("未知事件編號被忽略", () => {
    expect(currentValue(aurora, [99], null)).toBe(500);
  });
});

// ── leveledValue（升級後價值：含升級加成）──────────────────────
// 同時用於過路費計價與結算淨值；購買 / 升級「價格」仍用未加成的 currentValue。
describe("leveledValue", () => {
  const prop = { basePrice: 600, region: "AURORA", type: "金融", level: 0 };

  it("0 級時等於 currentValue（無加成）", () => {
    expect(leveledValue({ ...prop, level: 0 }, [], null)).toBe(600);
  });

  it("k=0.5：每升一級 +50% 價值（1→1.5→2→2.5×）", () => {
    expect(leveledValue({ ...prop, level: 1 }, [], null)).toBe(600 * 1.5);
    expect(leveledValue({ ...prop, level: 2 }, [], null)).toBe(600 * 2.0);
    expect(leveledValue({ ...prop, level: 3 }, [], null)).toBe(600 * 2.5);
  });

  it("3 級價值為 0 級的 2.5 倍（升級提高過路費與結算淨值）", () => {
    const lvl0 = leveledValue({ ...prop, level: 0 }, [], null);
    const lvl3 = leveledValue({ ...prop, level: 3 }, [], null);
    expect(lvl3 / lvl0).toBeCloseTo(1 + LEVEL_VALUE_BONUS * 3);
  });

  it("市場事件倍率與升級加成可疊乘", () => {
    // 事件一：AURORA ×1.25、金融 ×1.1 → currentValue = round(600*1.25*1.1)=825
    // 2 級加成 ×2 → 1650
    expect(leveledValue({ ...prop, level: 2 }, [1], null)).toBe(825 * 2);
  });
});

// ── investedValue / investedPrincipalMult（結算淨值＝投入本金市值）──────
// 把買價+升級費當本金（以 base 計），再隨事件浮動；結算淨值用此，過路費不用。
describe("investedPrincipalMult", () => {
  it("各級本金倍率 = 1 / 1.2 / 1.6 / 2.2（＝ 1 + 0.2 + 0.4 + 0.6）", () => {
    expect(investedPrincipalMult(0)).toBeCloseTo(1.0);
    expect(investedPrincipalMult(1)).toBeCloseTo(1.2);
    expect(investedPrincipalMult(2)).toBeCloseTo(1.6);
    expect(investedPrincipalMult(3)).toBeCloseTo(2.2);
  });
});

describe("investedValue", () => {
  const prop = { basePrice: 600, region: "AURORA", type: "金融", level: 0 };

  it("0 級無事件時等於 base", () => {
    expect(investedValue({ ...prop, level: 0 }, [], null)).toBe(600);
  });

  it("升級＝買價同等對待（無 k）：lvl3 = base × 2.2", () => {
    expect(investedValue({ ...prop, level: 3 }, [], null)).toBe(Math.round(600 * 2.2));
  });

  it("結算淨值 ≈ 實際投入（買價 + 各級升級費）", () => {
    // base 600：升級費 round10(120)=120、round10(240)=240、round10(360)=360
    const invested = 600 + 120 + 240 + 360; // 1320
    expect(investedValue({ ...prop, level: 3 }, [], null)).toBeCloseTo(invested, -1);
  });

  it("隨市場事件浮動：買在高點、事件回跌會虧（事件一 ×1.375）", () => {
    // 事件一 AURORA×1.25、金融×1.1 = ×1.375；lvl0 → 600×1.375=825
    expect(investedValue({ ...prop, level: 0 }, [1], null)).toBe(Math.round(600 * 1.375));
    // 無事件後回到 600（淨值下跌，反映市場風險）
    expect(investedValue({ ...prop, level: 0 }, [], null)).toBe(600);
  });
});

// ── upgradeFee ───────────────────────────────────────────────
describe("upgradeFee", () => {
  it("0→1 級為 base 的 20%（四捨五入到 10）", () => {
    expect(upgradeFee(500, 0)).toBe(100);
  });
  it("1→2 級為 40%", () => {
    expect(upgradeFee(500, 1)).toBe(200);
  });
  it("2→3 級為 60%", () => {
    expect(upgradeFee(500, 2)).toBe(300);
  });
  it("3 級不可再升級回傳 null", () => {
    expect(upgradeFee(500, 3)).toBeNull();
  });
});

// ── lotteryFee ───────────────────────────────────────────────
describe("lotteryFee", () => {
  it("第一個號碼免費", () => {
    expect(lotteryFee(0)).toBe(0);
  });
  it("加購費 50 × 2^(已持有-1)", () => {
    expect(lotteryFee(1)).toBe(50);
    expect(lotteryFee(2)).toBe(100);
    expect(lotteryFee(3)).toBe(200);
  });
});

// ── parseActiveEvents ────────────────────────────────────────
describe("parseActiveEvents", () => {
  it("空字串回傳空陣列", () => {
    expect(parseActiveEvents("")).toEqual([]);
  });
  it("解析 CSV", () => {
    expect(parseActiveEvents("1,2,4")).toEqual([1, 2, 4]);
  });
  it("忽略非數字", () => {
    expect(parseActiveEvents("1,x,3")).toEqual([1, 3]);
  });
});

// ── spinWheel / WHEEL_OUTCOMES ───────────────────────────────
describe("命運輪盤", () => {
  it("WHEEL_OUTCOMES 權重皆為正", () => {
    expect(WHEEL_OUTCOMES.every((o) => o.weight > 0)).toBe(true);
  });

  it("spinWheel 永遠回傳合法倍率", () => {
    const valid = new Set(WHEEL_OUTCOMES.map((o) => o.mult));
    for (let i = 0; i < 1000; i++) {
      expect(valid.has(spinWheel())).toBe(true);
    }
  });
});

// ── 好運卡「命運眷顧」免費輪盤（freeWheelReward）────────────────
describe("freeWheelReward（命運眷顧）", () => {
  it("淨入帳 = stake×mult − stake，夾在 ≥0", () => {
    expect(freeWheelReward(200, 2)).toBe(200);   // 400 − 200
    expect(freeWheelReward(200, 10)).toBe(1800); // 2000 − 200
    expect(freeWheelReward(200, 1)).toBe(0);     // 不賺不賠
    expect(freeWheelReward(200, 0.5)).toBe(0);   // 少賺，夾到 0（不倒扣）
    expect(freeWheelReward(200, 0)).toBe(0);     // ×0 也不倒扣
  });

  it("任一合法輪盤倍率都不會讓玩家倒扣（白拿只賺不賠）", () => {
    for (const o of WHEEL_OUTCOMES) {
      expect(freeWheelReward(FREE_WHEEL_STAKE, o.mult)).toBeGreaterThanOrEqual(0);
    }
  });
});

// ── 好運卡「神秘禮物」五折券（GIFT_VOUCHER_NAME）────────────────
describe("神秘商店五折券（GIFT_VOUCHER_NAME）", () => {
  const voucher = MOVABLE_ASSET_SEED.find((a) => a.name === GIFT_VOUCHER_NAME);

  it("種子資料中存在五折券", () => {
    expect(voucher).toBeDefined();
  });

  it("為 1 次性 MYSTERY_SHOP_PRICE −50%（神秘商店專屬，不混用一般 SHOP_PRICE）", () => {
    expect(voucher?.effectType).toBe("MYSTERY_SHOP_PRICE");
    expect(voucher?.effectValue).toBe(-0.5);
    expect(voucher?.defaultUses).toBe(1);
  });
});

// ── 動產種子資料完整性 ───────────────────────────────────────
describe("MOVABLE_ASSET_SEED", () => {
  it("名稱不重複（@unique 約束）", () => {
    const names = MOVABLE_ASSET_SEED.map((a) => a.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("effectType 皆為合法 EffectType", () => {
    const valid = new Set(Object.values(EffectType));
    for (const a of MOVABLE_ASSET_SEED) {
      expect(valid.has(a.effectType)).toBe(true);
    }
  });

  it("每個 EffectType 都有顯示標籤", () => {
    for (const type of Object.values(EffectType)) {
      expect(EFFECT_TYPE_LABELS[type]).toBeTruthy();
    }
  });

  it("grade 僅限 S / A / B", () => {
    for (const a of MOVABLE_ASSET_SEED) {
      expect(["S", "A", "B"]).toContain(a.grade);
    }
  });

  it("condition 若存在必為合法 JSON", () => {
    for (const a of MOVABLE_ASSET_SEED) {
      if (a.condition != null) {
        expect(() => JSON.parse(a.condition as string)).not.toThrow();
      }
    }
  });

  it("REMINDER / WHEEL_NO_ZERO / WHEEL_ON_GOOD_CARD / DOUBLE_OR_NOTHING 效果值為 0；其餘非零", () => {
    const zeroValueTypes = new Set<string>([
      EffectType.REMINDER,
      EffectType.WHEEL_NO_ZERO,
      EffectType.WHEEL_ON_GOOD_CARD,
      EffectType.DOUBLE_OR_NOTHING,
    ]);
    for (const a of MOVABLE_ASSET_SEED) {
      // MOVEMENT 的 effectValue 語意依模式而定（DOUBLE 模式為 0），另由 MOVEMENT 區塊驗證
      if (a.effectType === EffectType.MOVEMENT) continue;
      if (zeroValueTypes.has(a.effectType)) {
        expect(a.effectValue).toBe(0);
      } else {
        expect(a.effectValue).not.toBe(0);
      }
    }
  });

  it("defaultUses 為 null 或正整數", () => {
    for (const a of MOVABLE_ASSET_SEED) {
      if (a.defaultUses !== null) {
        expect(Number.isInteger(a.defaultUses)).toBe(true);
        expect(a.defaultUses).toBeGreaterThan(0);
      }
    }
  });
});

// ── 主動移動道具（MOVEMENT）──────────────────────────────────
describe("effect: MOVEMENT（applyMovement / movementMode）", () => {
  it("movementMode：null 預設 BOOST，合法 JSON 解析，非法字串退回 BOOST", () => {
    expect(movementMode(null)).toBe(MovementMode.BOOST);
    expect(movementMode('{"move":"SET"}')).toBe(MovementMode.SET);
    expect(movementMode('{"move":"DOUBLE"}')).toBe(MovementMode.DOUBLE);
    expect(movementMode('{"move":"NOPE"}')).toBe(MovementMode.BOOST);
    expect(movementMode("not json")).toBe(MovementMode.BOOST);
  });

  it("BOOST：目前步數 + effectValue", () => {
    expect(applyMovement(MovementMode.BOOST, 2, 3)).toBe(5);
    expect(applyMovement(MovementMode.BOOST, 1, 6)).toBe(7);
  });

  it("SET：直接指定步數（不看目前步數）", () => {
    expect(applyMovement(MovementMode.SET, 6, 1)).toBe(6);
    expect(applyMovement(MovementMode.SET, 6, 4)).toBe(6);
  });

  it("DOUBLE：目前步數加倍", () => {
    expect(applyMovement(MovementMode.DOUBLE, 0, 3)).toBe(6);
    expect(applyMovement(MovementMode.DOUBLE, 0, 5)).toBe(10);
  });

  it("結果夾在 1..BOARD_SIZE-1（至少前進 1、至多繞一圈內）", () => {
    expect(applyMovement(MovementMode.BOOST, -10, 1)).toBe(1); // 不可 ≤ 0
    expect(applyMovement(MovementMode.SET, 999, 1)).toBe(BOARD_SIZE - 1);
    expect(applyMovement(MovementMode.DOUBLE, 0, 0)).toBe(1);
  });

  it("每個 MovementMode 都有標籤", () => {
    for (const m of Object.values(MovementMode)) {
      expect(MOVEMENT_MODE_LABELS[m]).toBeTruthy();
    }
  });

  it("movementActionLabel 依模式產生精簡符號", () => {
    expect(movementActionLabel(MovementMode.BOOST, 2)).toBe("+2");
    expect(movementActionLabel(MovementMode.SET, 6)).toBe("=6");
    expect(movementActionLabel(MovementMode.DOUBLE, 0)).toBe("×2");
  });

  it("seed 含 MOVEMENT 道具，且其 condition.move 為合法模式", () => {
    const moves = MOVABLE_ASSET_SEED.filter((a) => a.effectType === EffectType.MOVEMENT);
    expect(moves.length).toBeGreaterThan(0);
    for (const a of moves) {
      expect(Object.values(MovementMode)).toContain(movementMode(a.condition));
    }
  });
});

// ── 流動關卡表現制獎勵（computeMobileReward）──────────────────────
describe("computeMobileReward（表現制：答對越多給越多）", () => {
  it("光幣＝每題費率 × 答對題數（簡單 10 / 中等 20 / 困難 30）", () => {
    expect(computeMobileReward("簡單", 5, "coins").amount).toBe(50);
    expect(computeMobileReward("中等", 5, "coins").amount).toBe(100);
    expect(computeMobileReward("困難", 5, "coins").amount).toBe(150);
  });

  it("卡牌點數＝每題費率 × 答對題數（簡單 2 / 中等 4 / 困難 6）", () => {
    expect(computeMobileReward("簡單", 5, "cardPoints").amount).toBe(10);
    expect(computeMobileReward("中等", 5, "cardPoints").amount).toBe(20);
    expect(computeMobileReward("困難", 5, "cardPoints").amount).toBe(30);
  });

  it("骰子＝每 10 題給的張數 × floor(題數 / 10)，未滿 10 題不給", () => {
    expect(computeMobileReward("困難", 9, "coins").dice).toBe(0);
    expect(computeMobileReward("困難", 10, "coins").dice).toBe(3); // 困難 3/10
    expect(computeMobileReward("中等", 25, "coins").dice).toBe(4); // 中等 2/10 × 2
    expect(computeMobileReward("簡單", 30, "coins").dice).toBe(3); // 簡單 1/10 × 3
  });

  it("題數為 0 / 負數時獎勵與骰子皆為 0；小數無條件捨去", () => {
    expect(computeMobileReward("困難", 0, "coins")).toEqual({ amount: 0, dice: 0 });
    expect(computeMobileReward("困難", -3, "coins")).toEqual({ amount: 0, dice: 0 });
    expect(computeMobileReward("中等", 3.9, "coins").amount).toBe(60); // floor(3.9)=3 × 20
  });

  it("費率表單調遞增（困難 ≥ 中等 ≥ 簡單），骰子率亦然", () => {
    const { 簡單, 中等, 困難 } = MOBILE_REWARD_RATES;
    expect(困難.coinsPerQ).toBeGreaterThan(中等.coinsPerQ);
    expect(中等.coinsPerQ).toBeGreaterThan(簡單.coinsPerQ);
    expect(困難.dicePer10).toBeGreaterThanOrEqual(中等.dicePer10);
    expect(中等.dicePer10).toBeGreaterThanOrEqual(簡單.dicePer10);
  });
});

// ── 流動關卡設定完整性 ───────────────────────────────────────────
describe("MOBILE_GAMES 設定", () => {
  it("每款遊戲都有 rewardConfig，且模式合法", () => {
    for (const g of MOBILE_GAMES) {
      expect(g.rewardConfig).toBeDefined();
      if (g.rewardConfig.mode === "per-question") {
        expect(g.rewardConfig.difficulties.length).toBeGreaterThan(0);
      } else {
        expect(g.rewardConfig.mode).toBe("win-lose");
        expect(g.rewardConfig.winCoins).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("per-question 的難度都在費率表內", () => {
    for (const g of MOBILE_GAMES) {
      if (g.rewardConfig.mode === "per-question") {
        for (const d of g.rewardConfig.difficulties) {
          expect(MOBILE_REWARD_RATES[d]).toBeDefined();
        }
      }
    }
  });

  it("無題庫的遊戲（憤怒企業 / 海帶拳）為 win-lose", () => {
    for (const g of MOBILE_GAMES) {
      if (!g.hasBank) expect(g.rewardConfig.mode).toBe("win-lose");
    }
  });
});

// ── 加權抽樣 weightedPick ─────────────────────────────────────
describe("weightedPick", () => {
  it("依比例落點（權重不必總和為 1）", () => {
    const items = [{ value: "a", weight: 70 }, { value: "b", weight: 25 }, { value: "c", weight: 5 }];
    expect(weightedPick(items, () => 0)).toBe("a");        // [0, 70)
    expect(weightedPick(items, () => 0.69)).toBe("a");
    expect(weightedPick(items, () => 0.70)).toBe("b");     // [70, 95)
    expect(weightedPick(items, () => 0.94)).toBe("b");
    expect(weightedPick(items, () => 0.95)).toBe("c");     // [95, 100)
    expect(weightedPick(items, () => 0.999)).toBe("c");
  });
  it("空陣列回 null；全 0 權重回第一項", () => {
    expect(weightedPick([], () => 0.5)).toBeNull();
    expect(weightedPick([{ value: "x", weight: 0 }], () => 0.5)).toBe("x");
  });
});

// ── 好運卡任務目標牌庫結構 ─────────────────────────────────────
describe("TASK_GOOD_CARDS / 牌庫結構", () => {
  it("每張任務卡有 taskKind 且無 reward（與直接獎勵卡互斥）", () => {
    for (const c of TASK_GOOD_CARDS) {
      expect(isTaskGood(c)).toBe(true);
      expect(isInstantGood(c)).toBe(false);
      expect(c.reward).toBeUndefined();
      expect(typeof c.rewardCoins).toBe("number");
    }
  });
  it("直接獎勵好運卡皆非任務卡", () => {
    for (const c of GOOD_LUCK_CARDS) {
      expect(isInstantGood(c)).toBe(true);
      expect(isTaskGood(c)).toBe(false);
    }
  });
  it("BUY_LAND 任務含 4 個指定區 + 1 個任一區", () => {
    const buyLand = TASK_GOOD_CARDS.filter((c) => c.taskKind === TaskKind.BUY_LAND);
    const regions = buyLand.map((c) => c.targetRegion);
    expect(buyLand.length).toBe(5);
    expect(regions).toContain("AURORA");
    expect(regions).toContain("SPECTRA");
    expect(regions).toContain("EMBER");
    expect(regions).toContain("HAVEN");
    expect(regions.filter((r) => r == null).length).toBe(1); // 任一區
  });
  it("同時任務上限為 3", () => {
    expect(MAX_OPEN_TASKS).toBe(3);
  });
});

// ── 抽任務卡：排除已進行中的種類 ───────────────────────────────
describe("pickTaskCard（排除已進行中的 taskKind）", () => {
  it("openKinds 為空時可抽到任一任務卡", () => {
    const c = pickTaskCard(new Set(), () => 0);
    expect(c).not.toBeNull();
    expect(c!.taskKind).toBeDefined();
  });
  it("永不回傳已在 openKinds 中的種類", () => {
    const open = new Set([TaskKind.TRADE_N_TIMES]);
    // 掃描整個 rng 範圍，確認絕不抽到 TRADE_N_TIMES
    for (let i = 0; i < 50; i++) {
      const c = pickTaskCard(open, () => i / 50);
      expect(c?.taskKind).not.toBe(TaskKind.TRADE_N_TIMES);
    }
  });
  it("所有種類都進行中時回 null", () => {
    const allKinds = new Set(TASK_GOOD_CARDS.map((c) => c.taskKind!));
    expect(pickTaskCard(allKinds, () => 0)).toBeNull();
  });
});

// ── 任務進度評估（evalObjectiveProgress）─────────────────────────
describe("evalObjectiveProgress", () => {
  it("TRADE_N_TIMES：自抽卡後計差值，達標 / 未達標", () => {
    const base = { ...ZERO_BASE, baseTradeCount: 2 };
    expect(evalObjectiveProgress(TaskKind.TRADE_N_TIMES, { count: 3, region: null }, base, { ...ZERO_STATE, tradeCount: 5 }))
      .toEqual({ current: 3, target: 3, done: true });
    expect(evalObjectiveProgress(TaskKind.TRADE_N_TIMES, { count: 3, region: null }, base, { ...ZERO_STATE, tradeCount: 4 }))
      .toEqual({ current: 2, target: 3, done: false });
  });
  it("TRADE_N_TIMES：現況低於基準時夾為 0（不該發生的保險）", () => {
    const base = { ...ZERO_BASE, baseTradeCount: 5 };
    expect(evalObjectiveProgress(TaskKind.TRADE_N_TIMES, { count: 3, region: null }, base, { ...ZERO_STATE, tradeCount: 3 }))
      .toEqual({ current: 0, target: 3, done: false });
  });
  it("WIN_AUCTION_N：得標數差值達標", () => {
    expect(evalObjectiveProgress(TaskKind.WIN_AUCTION_N, { count: 1, region: null }, ZERO_BASE, { ...ZERO_STATE, auctionWins: 1 }))
      .toEqual({ current: 1, target: 1, done: true });
  });
  it("USE_CARD_ON_TEAM：出卡數差值達標 / 未達標", () => {
    const base = { ...ZERO_BASE, baseCardUseCount: 1 };
    expect(evalObjectiveProgress(TaskKind.USE_CARD_ON_TEAM, { count: 1, region: null }, base, { ...ZERO_STATE, cardUseCount: 2 }).done).toBe(true);
    expect(evalObjectiveProgress(TaskKind.USE_CARD_ON_TEAM, { count: 1, region: null }, base, { ...ZERO_STATE, cardUseCount: 1 }).done).toBe(false);
  });
  it("BUY_LAND：持有地數（呼叫端已依區過濾）差值 ≥ 1 即達標", () => {
    const base = { ...ZERO_BASE, basePropertyCount: 4 };
    expect(evalObjectiveProgress(TaskKind.BUY_LAND, { count: 1, region: "AURORA" }, base, { ...ZERO_STATE, propertyCount: 5 }).done).toBe(true);
    expect(evalObjectiveProgress(TaskKind.BUY_LAND, { count: 1, region: "AURORA" }, base, { ...ZERO_STATE, propertyCount: 4 }).done).toBe(false);
  });
  it("BUILD_LEVEL3：抽卡時已是 3 級的大樓不算（since-draw）", () => {
    const base = { ...ZERO_BASE, baseLevel3Count: 1 };
    expect(evalObjectiveProgress(TaskKind.BUILD_LEVEL3, { count: 1, region: null }, base, { ...ZERO_STATE, level3Count: 2 }).done).toBe(true);
    expect(evalObjectiveProgress(TaskKind.BUILD_LEVEL3, { count: 1, region: null }, base, { ...ZERO_STATE, level3Count: 1 }).done).toBe(false);
  });
  it("MONOPOLY_REGION：需獨佔一個抽卡時尚未獨佔的區", () => {
    const base = { ...ZERO_BASE, baseMonopolyRegions: ["AURORA" as const] };
    // 仍只獨佔 AURORA → 未達標
    expect(evalObjectiveProgress(TaskKind.MONOPOLY_REGION, { count: 1, region: null }, base, { ...ZERO_STATE, monopolyRegions: ["AURORA"] }).done).toBe(false);
    // 新獨佔 EMBER → 達標
    expect(evalObjectiveProgress(TaskKind.MONOPOLY_REGION, { count: 1, region: null }, base, { ...ZERO_STATE, monopolyRegions: ["AURORA", "EMBER"] }).done).toBe(true);
  });
});

// ── 獨佔判定 findMonopoly（自 snapshot 移入 game，單一事實來源）──────
describe("findMonopoly", () => {
  it("需 ≥1 棟三級才可能獨佔", () => {
    expect(findMonopoly([{ ownerTeamId: 1, level: 2 }, { ownerTeamId: 1, level: 1 }])).toBeNull();
    expect(findMonopoly([{ ownerTeamId: 1, level: 3 }])).toBe(1);
  });
  it("三級數較多者獨佔；平手（三級 + 總數）則無", () => {
    expect(findMonopoly([
      { ownerTeamId: 1, level: 3 }, { ownerTeamId: 1, level: 3 },
      { ownerTeamId: 2, level: 3 },
    ])).toBe(1);
    expect(findMonopoly([
      { ownerTeamId: 1, level: 3 }, { ownerTeamId: 2, level: 3 },
    ])).toBeNull();
  });
  it("空 / 無主回 null", () => {
    expect(findMonopoly([])).toBeNull();
    expect(findMonopoly([{ ownerTeamId: null, level: 3 }])).toBeNull();
  });
});
