import { describe, it, expect } from "vitest";
import {
  stackEffects,
  roundTo50,
  currentValue,
  upgradeFee,
  lotteryFee,
  parseActiveEvents,
  spinWheel,
  spinWheelCustom,
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
} from "./game";

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
  it("WHEEL_ON_GOOD_CARD 在 MOVABLE_ASSET_SEED 中存在", () => {
    expect(MOVABLE_ASSET_SEED.some((a) => a.effectType === EffectType.WHEEL_ON_GOOD_CARD)).toBe(true);
  });
  it("DOUBLE_OR_NOTHING 在 MOVABLE_ASSET_SEED 中存在", () => {
    expect(MOVABLE_ASSET_SEED.some((a) => a.effectType === EffectType.DOUBLE_OR_NOTHING)).toBe(true);
  });
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
      EffectType.REMINDER,
    ]);
    for (const t of Object.values(EffectType)) {
      expect(tested.has(t)).toBe(true);
    }
  });
});

// ── roundTo50 ────────────────────────────────────────────────
describe("roundTo50", () => {
  it.each([
    [0, 0],
    [24, 0],
    [25, 50],
    [74, 50],
    [75, 100],
    [510, 500],
  ])("%i → %i", (input, expected) => {
    expect(roundTo50(input)).toBe(expected);
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

// ── upgradeFee ───────────────────────────────────────────────
describe("upgradeFee", () => {
  it("0→1 級為 base 的 20%（四捨五入到 50）", () => {
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
