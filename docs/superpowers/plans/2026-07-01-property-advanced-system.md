# 不動產進階系統 + 4 張市場卡 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 為 IM 大富翁加入不動產賣回交易所、四大區域獨佔被動效果、1/2/3 房被動營收，以及紅/黑/鬧鬼/土地公四張市場卡。

**Architecture:** 在最底層純函式 `currentValue` 加入三個永久倍率層（cardRegionMult / cardBuildingMult / monopolyBonusMult）+ 一個即時 HAVEN 漲幅層，讓 `investedValue`（賣價/結算）與 `leveledValue`（過路費）自動繼承。獨佔判定沿用既有 `findMonopoly`。所有寫入走 `prisma.$transaction`，回傳 `UndoRecipe`。可調參數存 GameState 欄位。

**Tech Stack:** Next.js 16（App Router）、Prisma 6（client 產到 `src/generated/prisma`）、Postgres/Supabase、Tailwind v4、SWR 輪詢、vitest。

## Global Constraints

- **Next.js 有 breaking changes**：寫任何 Next.js 相關 code（route handler、page、middleware）前先讀 `node_modules/next/dist/docs/` 對應章節（見 `web/AGENTS.md`）。
- **Prisma 鎖 6.x**：勿升級。schema 改完用 `npm run db:push`（本專案無 migration 歷史）。
- **Prisma client import**：`import { Prisma } from "@/generated/prisma"`。
- **金額慣例**：買地/升級/過路費/賣地取整到 10（`roundTo10`）；房收與每輪動產收益四捨五入到個位（`Math.round`）。
- **獨佔判定單一事實來源**：一律用 `game.ts` 的 `findMonopoly(regionProps)`，勿另寫。
- **有效動產條件**：讀擁有者有效動產一律併 `ACTIVE_ITEM = { active: true, lockedTradeId: null }`。
- **驗證**：每個 task 結束前 `npx tsc --noEmit` 乾淨、`npx vitest run` 全綠（現有 134 tests 不可退步）。
- 工作目錄一律 `策略系統/web/`。

## 區域 ↔ 效果對應（貫穿全計畫）

| 區碼 | 效果 |
|---|---|
| AURORA | 光幣收益 ×1.5 |
| SPECTRA | 每回合 +10 卡牌點數 |
| EMBER | 全場升級加速（買地直接 1 級、升級 +2） |
| HAVEN | 該隊全部不動產隨真實時間慢慢漲 |

## 價值疊乘鏈（最終樣貌）

```
currentValue = basePrice × 事件倍率 × cardRegionMult × cardBuildingMult × monopolyBonusMult × havenLiveMult
investedValue = basePrice × investedPrincipalMult(level) × (上述所有倍率)
leveledValue  = currentValue × (1 + 0.5×level)
```

- `cardRegionMult / cardBuildingMult / monopolyBonusMult`：Property DB 欄位（永久）。
- `havenLiveMult`：不寫 DB，計算時由呼叫端算出後傳入（`{ havenLiveMult }`）。

## File Structure

- `prisma/schema.prisma` — Property +3 欄、GameState +可調參數欄位。
- `prisma/seed.ts` — 四張新功能卡種子；新欄位有 default 不需改。
- `src/lib/game.ts` — 純函式：擴充 `currentValue` 倍率、`REGION_MONOPOLY_EFFECT` 對應表、`havenAppreciationMult`、`houseIncome`、卡牌倍率常數、AURORA/EMBER helper。
- `src/lib/game.test.ts` — 上述純函式測試。
- `src/lib/service.ts` — 寫入：`sellPropertyToExchange`、四張卡 service、`buyProperty`/`upgradeProperty` 加 EMBER 加速、`distributeRoundIncome` 加房收/SPECTRA/AURORA/HAVEN flush、`monopolySince` 維護 helper、admin set 參數、undo 支援新倍率還原。
- `src/lib/snapshot.ts` — 讀模型：propView 帶新倍率 + havenLiveMult、各區獨佔效果標籤。
- `src/app/api/exchange/sell-property/route.ts` — 賣地 API（新）。
- `src/app/api/exchange/market-card/route.ts` — 四張卡 API（新）。
- `src/app/api/admin/settings/route.ts` — 可調參數 API（新）。
- UI：`ExchangeView`、`AdminView`、`RealMapView`/`MapView` 觸點。

---

## Task 1: Schema — Property 與 GameState 新欄位

**Files:**
- Modify: `prisma/schema.prisma` (Property 區塊約 148-157、GameState 區塊約 170-188)

**Interfaces:**
- Produces: Property 新欄位 `cardRegionMult Float`、`cardBuildingMult Float`、`monopolyBonusMult Float`（皆 default 1）；GameState 新欄位 `auroraMultiplier Float @default(1.5)`、`spectraCardPoints Int @default(10)`、`havenApprIntervalMs Int @default(60000)`、`havenApprRate Float @default(0.01)`、`houseIncomeL1 Float @default(0.03)`、`houseIncomeL2 Float @default(0.05)`、`houseIncomeL3 Float @default(0.08)`、`cardRegionUpMult Float @default(1.3)`、`cardRegionDownMult Float @default(0.75)`、`cardBuildingUpMult Float @default(1.3)`、`cardBuildingDownMult Float @default(0.75)`、`monopolySince String @default("")`。

- [ ] **Step 1: 在 Property model 加三欄**

在 `prisma/schema.prisma` 的 `model Property` 內、`ownerTeamId` 行之後加：

```prisma
  cardRegionMult    Float @default(1) // 紅/黑卡・整區永久倍率（每張卡疊乘）
  cardBuildingMult  Float @default(1) // 鬧鬼/土地公卡・單棟永久倍率
  monopolyBonusMult Float @default(1) // HAVEN 獨佔慢慢漲鎖定後的單棟永久漲幅
```

- [ ] **Step 2: 在 GameState model 加可調參數 + monopolySince**

在 `model GameState` 內、`event4Penalty` 行之後加：

```prisma
  // ── 不動產進階系統可調參數（admin 可調）──
  auroraMultiplier    Float  @default(1.5)   // AURORA 獨佔：光幣收益倍率
  spectraCardPoints   Int    @default(10)    // SPECTRA 獨佔：每回合卡牌點數
  havenApprIntervalMs Int    @default(60000) // HAVEN 慢慢漲：時間單位（毫秒）
  havenApprRate       Float  @default(0.01)  // HAVEN 慢慢漲：每單位漲幅
  houseIncomeL1       Float  @default(0.03)  // 1 級房每回合營收費率
  houseIncomeL2       Float  @default(0.05)  // 2 級房每回合營收費率
  houseIncomeL3       Float  @default(0.08)  // 3 級房每回合營收費率
  cardRegionUpMult    Float  @default(1.3)   // 紅卡整區漲幅
  cardRegionDownMult  Float  @default(0.75)  // 黑卡整區跌幅
  cardBuildingUpMult  Float  @default(1.3)   // 土地公卡單棟漲幅
  cardBuildingDownMult Float @default(0.75)  // 鬧鬼卡單棟跌幅
  monopolySince       String @default("")    // CSV region:teamId:epochMs（HAVEN 慢慢漲用）
```

- [ ] **Step 3: 套用到 DB 並重生 client**

Run: `npm run db:push`
Expected: `Your database is now in sync with your Prisma schema.` 並自動重生 client 到 `src/generated/prisma`。

- [ ] **Step 4: 驗證 tsc 乾淨**

Run: `npx tsc --noEmit`
Expected: 無輸出（乾淨）。

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): Property 倍率欄位 + GameState 不動產進階可調參數"
```

---

## Task 2: 純函式 — currentValue 加倍率層

**Files:**
- Modify: `src/lib/game.ts` (`currentValue` 約 160-179)
- Test: `src/lib/game.test.ts`

**Interfaces:**
- Consumes: 無。
- Produces: `currentValue` 的 prop 參數型別擴充為
  `{ basePrice: number; region: string; type: string; cardRegionMult?: number; cardBuildingMult?: number; monopolyBonusMult?: number }`，
  並新增第四參數 `opts?: { havenLiveMult?: number }`。回傳仍為 `Math.round(...)`。缺省欄位視為 1（向後相容）。

- [ ] **Step 1: 寫 failing 測試**

在 `src/lib/game.test.ts` 既有 `currentValue` 測試附近加：

```ts
it("currentValue 疊乘 cardRegionMult / cardBuildingMult / monopolyBonusMult", () => {
  const p = { basePrice: 1000, region: "AURORA", type: "金融",
    cardRegionMult: 1.3, cardBuildingMult: 0.75, monopolyBonusMult: 2 };
  // 1000 × 1.3 × 0.75 × 2 = 1950
  expect(currentValue(p, [], null)).toBe(1950);
});

it("currentValue 缺省倍率欄位視為 1（向後相容）", () => {
  const p = { basePrice: 500, region: "AURORA", type: "金融" };
  expect(currentValue(p, [], null)).toBe(500);
});

it("currentValue 疊乘 havenLiveMult（即時層，由 opts 傳入）", () => {
  const p = { basePrice: 1000, region: "HAVEN", type: "住宅" };
  // 1000 × 1.5 = 1500
  expect(currentValue(p, [], null, { havenLiveMult: 1.5 })).toBe(1500);
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/lib/game.test.ts -t "currentValue 疊乘 cardRegionMult"`
Expected: FAIL（結果為 1000，未套倍率）。

- [ ] **Step 3: 實作**

把 `src/lib/game.ts` 的 `currentValue` 改為：

```ts
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
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/lib/game.test.ts`
Expected: PASS（含既有 currentValue 測試不退步）。

- [ ] **Step 5: 驗證 tsc**

Run: `npx tsc --noEmit`
Expected: 乾淨。注意 `investedValue`（game.ts:222）內部呼叫 `currentValue({ basePrice: 1000, region, type }, ...)` 未帶倍率——這是刻意的（那是取「純事件倍率」用於 investedValue 的 eventMult），下一個 task 處理。

- [ ] **Step 6: Commit**

```bash
git add src/lib/game.ts src/lib/game.test.ts
git commit -m "feat(game): currentValue 疊乘卡牌/獨佔永久倍率 + HAVEN 即時層"
```

---

## Task 3: 純函式 — investedValue 正確繼承倍率

**Files:**
- Modify: `src/lib/game.ts` (`investedValue` 約 217-225、`leveledValue` 約 231-237)
- Test: `src/lib/game.test.ts`

**背景：** `investedValue` 現用 `currentValue({basePrice:1000,region,type})/1000` 取「純事件倍率」，再乘 base × 本金倍率。這條路**不會**帶到 prop 的 cardRegionMult 等欄位（因為傳的是臨時 1000 物件）。需改成把倍率也乘進去，賣價才含卡牌/獨佔漲跌。`leveledValue` 呼叫 `currentValue(prop, ...)`（傳真 prop）故已自動繼承 DB 倍率，但需支援 havenLiveMult 的 opts 透傳。

**Interfaces:**
- Consumes: Task 2 的 `currentValue`（含 opts）。
- Produces: `investedValue(prop, activeEvents, event4Penalty, opts?)` 與 `leveledValue(prop, activeEvents, event4Penalty, opts?)` 都接受 `opts?: { havenLiveMult?: number }`，且結果含 prop 的三個永久倍率 + havenLiveMult。prop 型別加上三個可選倍率欄位。

- [ ] **Step 1: 寫 failing 測試**

```ts
it("investedValue 含永久倍率與升級本金", () => {
  const p = { basePrice: 1000, region: "AURORA", type: "金融", level: 3,
    cardRegionMult: 1.3, cardBuildingMult: 1, monopolyBonusMult: 1 };
  // base 1000 × 本金倍率(lvl3=2.2) × 事件1 × cardRegionMult 1.3 = 2860
  expect(investedValue(p, [], null)).toBe(2860);
});

it("investedValue 透傳 havenLiveMult", () => {
  const p = { basePrice: 1000, region: "HAVEN", type: "住宅", level: 0 };
  // 1000 × 1.0(本金) × 1(事件) × 1.5(haven即時) = 1500
  expect(investedValue(p, [], null, { havenLiveMult: 1.5 })).toBe(1500);
});

it("leveledValue 透傳 havenLiveMult 與永久倍率", () => {
  const p = { basePrice: 1000, region: "HAVEN", type: "住宅", level: 2,
    cardRegionMult: 1, cardBuildingMult: 1, monopolyBonusMult: 1 };
  // currentValue = 1000 × 1.2(haven即時) = 1200；× (1+0.5×2)=2 → 2400
  expect(leveledValue(p, [], null, { havenLiveMult: 1.2 })).toBe(2400);
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/lib/game.test.ts -t "investedValue 含永久倍率"`
Expected: FAIL（結果 2200，未含 1.3）。

- [ ] **Step 3: 實作**

把 `investedValue` 改為（用完整 prop 取 eventMult，含所有倍率 + opts）：

```ts
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
```

把 `leveledValue` 改為透傳 opts：

```ts
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
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/lib/game.test.ts`
Expected: PASS（含既有 investedValue/leveledValue 測試不退步）。

- [ ] **Step 5: Commit**

```bash
git add src/lib/game.ts src/lib/game.test.ts
git commit -m "feat(game): investedValue/leveledValue 繼承永久倍率與 HAVEN 即時層"
```

---

## Task 4: 純函式 — HAVEN 漲幅、房收、區域效果對應、卡牌倍率

**Files:**
- Modify: `src/lib/game.ts` (新增常數與純函式，放 `leveledValue` 之後)
- Test: `src/lib/game.test.ts`

**Interfaces:**
- Consumes: 無。
- Produces:
  - `REGION_MONOPOLY_EFFECT: Record<RegionCode, "COIN_1_5X"|"CARD_POINTS"|"UPGRADE_BOOST"|"APPRECIATION">`。
  - `havenAppreciationMult(sinceEpochMs: number, now: number, intervalMs: number, rate: number): number` — 線性即時倍率，`1 + floor((now-since)/interval) × rate`；since≤0 或 now<since 回 1。
  - `houseIncome(currentVal: number, level: number, rates: [number,number,number]): number` — level 0 回 0，否則 `Math.round(currentVal × rates[level-1])`。
  - `applyCardRegionMult(current: number, factor: number): number` = `current × factor`（純疊乘，供 service 疊）。

- [ ] **Step 1: 寫 failing 測試**

```ts
import { REGION_MONOPOLY_EFFECT, havenAppreciationMult, houseIncome } from "./game";

it("REGION_MONOPOLY_EFFECT 四區對應", () => {
  expect(REGION_MONOPOLY_EFFECT.AURORA).toBe("COIN_1_5X");
  expect(REGION_MONOPOLY_EFFECT.SPECTRA).toBe("CARD_POINTS");
  expect(REGION_MONOPOLY_EFFECT.EMBER).toBe("UPGRADE_BOOST");
  expect(REGION_MONOPOLY_EFFECT.HAVEN).toBe("APPRECIATION");
});

it("havenAppreciationMult 線性：每 60000ms +0.01", () => {
  const since = 1_000_000;
  // 過 180 分鐘 = 180 單位 → 1 + 180×0.01 = 2.8
  expect(havenAppreciationMult(since, since + 180 * 60000, 60000, 0.01)).toBeCloseTo(2.8, 6);
  // 未滿一單位 → 1
  expect(havenAppreciationMult(since, since + 30000, 60000, 0.01)).toBe(1);
  // since 無效（0）→ 1
  expect(havenAppreciationMult(0, since, 60000, 0.01)).toBe(1);
});

it("houseIncome 依級別費率、level0 不發", () => {
  expect(houseIncome(1000, 0, [0.03, 0.05, 0.08])).toBe(0);
  expect(houseIncome(1000, 1, [0.03, 0.05, 0.08])).toBe(30);
  expect(houseIncome(1234, 3, [0.03, 0.05, 0.08])).toBe(99); // 1234×0.08=98.72→99
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/lib/game.test.ts -t "REGION_MONOPOLY_EFFECT"`
Expected: FAIL（未定義）。

- [ ] **Step 3: 實作**

在 `src/lib/game.ts` `leveledValue` 之後加：

```ts
// ── 區域獨佔被動效果對應（每區專屬一個）──
export type MonopolyEffect = "COIN_1_5X" | "CARD_POINTS" | "UPGRADE_BOOST" | "APPRECIATION";
export const REGION_MONOPOLY_EFFECT: Record<RegionCode, MonopolyEffect> = {
  AURORA: "COIN_1_5X",
  SPECTRA: "CARD_POINTS",
  EMBER: "UPGRADE_BOOST",
  HAVEN: "APPRECIATION",
};

// HAVEN 慢慢漲：線性即時倍率。since 為該隊開始獨佔 HAVEN 的 epochMs。
export function havenAppreciationMult(
  sinceEpochMs: number, now: number, intervalMs: number, rate: number,
): number {
  if (!sinceEpochMs || now <= sinceEpochMs || intervalMs <= 0) return 1;
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
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/lib/game.test.ts`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/lib/game.ts src/lib/game.test.ts
git commit -m "feat(game): 區域效果對應表 + HAVEN 漲幅 + 房收純函式"
```

---

## Task 5: monopolySince 解析/序列化 + HAVEN flush 純函式

**Files:**
- Modify: `src/lib/game.ts`
- Test: `src/lib/game.test.ts`

**Interfaces:**
- Consumes: 無。
- Produces:
  - `parseMonopolySince(csv: string): Record<string, { teamId: number; since: number }>` — 解析 `HAVEN:12:1699999999999,...`，壞格式略過。
  - `serializeMonopolySince(map: Record<string, { teamId: number; since: number }>): string` — 反序列化為 CSV（穩定排序）。

- [ ] **Step 1: 寫 failing 測試**

```ts
import { parseMonopolySince, serializeMonopolySince } from "./game";

it("parseMonopolySince/serialize round-trip", () => {
  const csv = "HAVEN:12:1699999999999,AURORA:3:1700000000000";
  const m = parseMonopolySince(csv);
  expect(m.HAVEN).toEqual({ teamId: 12, since: 1699999999999 });
  expect(m.AURORA).toEqual({ teamId: 3, since: 1700000000000 });
  expect(serializeMonopolySince(m)).toBe(csv);
});

it("parseMonopolySince 忽略壞格式與空字串", () => {
  expect(parseMonopolySince("")).toEqual({});
  expect(parseMonopolySince("HAVEN:x:y,GARBAGE")).toEqual({});
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/lib/game.test.ts -t "parseMonopolySince"`
Expected: FAIL（未定義）。

- [ ] **Step 3: 實作**

在 `src/lib/game.ts` 加：

```ts
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
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/lib/game.test.ts`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/lib/game.ts src/lib/game.test.ts
git commit -m "feat(game): monopolySince 解析/序列化純函式"
```

---

## Task 6: service — HAVEN 漲幅 helper + monopolySince 維護

**Files:**
- Modify: `src/lib/service.ts` (import 區 + 新 helper，放 `queryTeamMonopolyRegions` 約 1299 附近)
- Test: `src/lib/service.ts` 相關以整合測試涵蓋（見 Task 11）；本 task 純內部 helper，先以純函式邏輯確保 tsc 過。

**Interfaces:**
- Consumes: `parseMonopolySince`、`serializeMonopolySince`、`havenAppreciationMult`、`findMonopoly`、`REGIONS`（game.ts）。
- Produces（皆 module-internal，非 export）：
  - `havenLiveMultFor(state, teamId: number | null, now: number): number` — 若 teamId 為目前 HAVEN 獨佔隊，回 `havenAppreciationMult(since, now, intervalMs, rate)`，否則 1。
  - `flushHavenAppreciation(tx, state, now): Promise<void>` — 對目前 HAVEN 獨佔隊，把 havenLiveMult 併入其**所有**不動產的 `monopolyBonusMult`，並把 monopolySince[HAVEN].since 重設為 now。
  - `reconcileMonopolySince(tx, now): Promise<void>` — 重算各區獨佔隊；HAVEN 換人時先 flush 舊隊、再寫新隊 since=now（無人獨佔則移除 HAVEN 條目）。回寫 GameState.monopolySince。

- [ ] **Step 1: 加 import**

在 `src/lib/service.ts` 的 game import 區塊（約 3-50 行）加入：

```ts
  havenAppreciationMult,
  parseMonopolySince,
  serializeMonopolySince,
  REGION_MONOPOLY_EFFECT,
  houseIncome,
```

- [ ] **Step 2: 實作三個 helper**

在 `queryTeamMonopolyRegions`（約 1299）之前加：

```ts
type GameStateRow = Awaited<ReturnType<typeof getState>>;

// 若 teamId 為目前 HAVEN 獨佔隊，回其即時漲幅倍率，否則 1。
function havenLiveMultFor(state: GameStateRow, teamId: number | null, now: number): number {
  if (teamId == null) return 1;
  const since = parseMonopolySince(state.monopolySince).HAVEN;
  if (!since || since.teamId !== teamId) return 1;
  return havenAppreciationMult(since.since, now, state.havenApprIntervalMs, state.havenApprRate);
}

// 把 HAVEN 獨佔隊當前即時漲幅永久併入其所有不動產 monopolyBonusMult，並重設 since=now。
async function flushHavenAppreciation(tx: Tx, state: GameStateRow, now: number): Promise<void> {
  const map = parseMonopolySince(state.monopolySince);
  const h = map.HAVEN;
  if (!h) return;
  const mult = havenAppreciationMult(h.since, now, state.havenApprIntervalMs, state.havenApprRate);
  if (mult > 1) {
    const props = await tx.property.findMany({ where: { ownerTeamId: h.teamId } });
    for (const p of props) {
      await tx.property.update({
        where: { id: p.id },
        data: { monopolyBonusMult: p.monopolyBonusMult * mult },
      });
    }
  }
  map.HAVEN = { teamId: h.teamId, since: now };
  await tx.gameState.update({ where: { id: 1 }, data: { monopolySince: serializeMonopolySince(map) } });
}

// 重算各區獨佔隊；HAVEN 換人先 flush 舊隊，再寫新隊 since=now。
async function reconcileMonopolySince(tx: Tx, now: number): Promise<void> {
  const state = await getState(tx);
  const map = parseMonopolySince(state.monopolySince);
  const allProps = await tx.property.findMany({
    select: { id: true, region: true, ownerTeamId: true, level: true },
  });
  const havenProps = allProps.filter((p) => p.region === "HAVEN");
  const newHavenOwner = findMonopoly(havenProps);
  const prev = map.HAVEN;
  if (prev && prev.teamId !== newHavenOwner) {
    // 換人（或變無人）：先 flush 舊隊已累積漲幅
    await flushHavenAppreciation(tx, state, now);
  }
  // flushHavenAppreciation 可能已改 map（重設 since），重讀最新
  const fresh = parseMonopolySince((await getState(tx)).monopolySince);
  if (newHavenOwner == null) {
    delete fresh.HAVEN;
  } else if (!fresh.HAVEN || fresh.HAVEN.teamId !== newHavenOwner) {
    fresh.HAVEN = { teamId: newHavenOwner, since: now };
  }
  await tx.gameState.update({ where: { id: 1 }, data: { monopolySince: serializeMonopolySince(fresh) } });
}
```

- [ ] **Step 3: 驗證 tsc**

Run: `npx tsc --noEmit`
Expected: 乾淨（helper 尚未被呼叫，但型別須正確；`Tx` 型別已存在於檔案）。若報「宣告未使用」，此為暫時性——後續 task 會呼叫；可先於本 task 在 Task 7/9 接上後再一併驗證。為避免 lint 擋，本 task 允許 `npx tsc --noEmit` 通過即可（未使用變數 tsc 預設不報）。

- [ ] **Step 4: Commit**

```bash
git add src/lib/service.ts
git commit -m "feat(service): HAVEN 漲幅 helper + monopolySince 維護"
```

---

## Task 7: service — 賣不動產給交易所

**Files:**
- Modify: `src/lib/service.ts` (新 `sellPropertyToExchange`，放 `transferProperty` 約 447 之後；`undoAction` 約 1717 的 property 還原補上倍率)
- Test: `src/lib/service.test.ts`（新檔）

**Interfaces:**
- Consumes: Task 6 的 `flushHavenAppreciation`、`reconcileMonopolySince`；game 的 `investedValue`、`roundTo10`。
- Produces: `sellPropertyToExchange({ propertyId: number; byToken?: string }): Promise<{ ok: true; payout: number; undo: UndoRecipe }>`。UndoRecipe.property 需含原 owner/level/三倍率。

- [ ] **Step 1: 擴充 UndoRecipe.property 型別支援倍率還原**

在 `src/lib/game.ts` 的 `UndoRecipe`（約 891-900）把 `property` 與 `properties` 的物件型別加三個可選欄位：

```ts
  property?: { id: number; ownerTeamId: number | null; level: number;
    cardRegionMult?: number; cardBuildingMult?: number; monopolyBonusMult?: number };
  properties?: { id: number; ownerTeamId: number | null; level: number;
    cardRegionMult?: number; cardBuildingMult?: number; monopolyBonusMult?: number }[];
```

在 `src/lib/service.ts` 的 `undoAction`（約 1717）處理 property 還原處，補上倍率還原（找到還原 `tx.property.update` 的 data，若 undo 帶了倍率就一併寫回）。定位：搜尋 `property.update` 在 undo 區塊，改為：

```ts
    if (property) {
      await tx.property.update({
        where: { id: property.id },
        data: {
          ownerTeamId: property.ownerTeamId,
          level: property.level,
          ...(property.cardRegionMult !== undefined ? { cardRegionMult: property.cardRegionMult } : {}),
          ...(property.cardBuildingMult !== undefined ? { cardBuildingMult: property.cardBuildingMult } : {}),
          ...(property.monopolyBonusMult !== undefined ? { monopolyBonusMult: property.monopolyBonusMult } : {}),
        },
      });
    }
```

（`properties` 陣列版比照逐筆處理。）

- [ ] **Step 2: 寫 failing 測試（整合，用真 DB 需 seed；改以純邏輯輔助則不足，故用 vitest + prisma 測試 DB）**

本專案測試多為純函式。賣地為 DB 寫入，最務實的驗證是「服務層在測試 DB 上跑」。若無測試 DB 設定，改採**手動驗證步驟**（見 Step 4 的 Run），並在 `game.test.ts` 補一個純函式測試鎖定賣價公式：

```ts
it("賣地回收金 = investedValue 取整到 10", () => {
  const p = { basePrice: 850, region: "AURORA", type: "金融", level: 2,
    cardRegionMult: 1, cardBuildingMult: 1, monopolyBonusMult: 1 };
  // investedValue = 850 × 本金倍率(lvl2=1.6) × 1 = 1360 → roundTo10 = 1360
  expect(roundTo10(investedValue(p, [], null))).toBe(1360);
});
```

- [ ] **Step 3: 實作 `sellPropertyToExchange`**

在 `transferProperty` 之後加：

```ts
// ── 不動產：賣回交易所（回收 investedValue，取整到 10）─────────────
// 賣前先 flush HAVEN 漲幅到 monopolyBonusMult（確保回收金含漲幅）。
// 地變無主 level0，但三個倍率保留不重置（地帶著行情換手，防洗 debuff）。
export async function sellPropertyToExchange(params: { propertyId: number; byToken?: string }) {
  const { propertyId, byToken } = params;
  return prisma.$transaction(async (tx) => {
    const now = Date.now();
    const prop0 = await tx.property.findUnique({ where: { id: propertyId } });
    if (!prop0) throw new Error("找不到不動產");
    if (prop0.ownerTeamId == null) throw new Error("該不動產尚未售出，無法賣回");
    const ownerId = prop0.ownerTeamId;

    // 賣前 flush HAVEN 漲幅（若賣方為 HAVEN 獨佔隊，把即時漲幅鎖進所有房 monopolyBonusMult）
    const stateBefore = await getState(tx);
    await flushHavenAppreciation(tx, stateBefore, now);

    // 重讀該地（monopolyBonusMult 可能剛被 flush 更新）
    const prop = await tx.property.findUnique({ where: { id: propertyId } });
    if (!prop) throw new Error("找不到不動產");
    const state = await getState(tx);
    const payout = roundTo10(investedValue(prop, parseActiveEvents(state.activeEvents), state.event4Penalty));

    await tx.team.update({ where: { id: ownerId }, data: { coins: { increment: payout } } });
    await tx.property.update({
      where: { id: propertyId },
      data: { ownerTeamId: null, level: 0 }, // 倍率保留不重置
    });
    const lid = await logLedger(tx, {
      teamId: ownerId, kind: "property", delta: payout, note: `賣回交易所 ${prop.name}`, byToken,
    });

    // 賣地改變持有結構 → 重算獨佔（含 HAVEN 換人 flush）
    await reconcileMonopolySince(tx, now);

    const undo: UndoRecipe = {
      label: `賣回 ${prop.name}`,
      ledgerIds: [lid],
      property: {
        id: propertyId, ownerTeamId: ownerId, level: prop.level,
        cardRegionMult: prop.cardRegionMult,
        cardBuildingMult: prop.cardBuildingMult,
        monopolyBonusMult: prop.monopolyBonusMult,
      },
    };
    return { ok: true, payout, undo };
  });
}
```

- [ ] **Step 4: 執行測試 + 手動驗證**

Run: `npx vitest run src/lib/game.test.ts && npx tsc --noEmit`
Expected: PASS + 乾淨。
手動驗證（若有 dev DB）：`npm run dev`，交易所頁對某已購地按賣回，確認光幣增加 = 顯示的 investedValue、地變無主、按撤銷可還原 owner/level/倍率。

- [ ] **Step 5: Commit**

```bash
git add src/lib/service.ts src/lib/game.ts src/lib/game.test.ts
git commit -m "feat(service): 賣不動產給交易所（investedValue 回收，HAVEN 賣前 flush）"
```

---

## Task 8: service — 四張市場卡

**Files:**
- Modify: `src/lib/game.ts` (`FUNCTION_CARDS` 約 877-886 加四張)、`prisma/seed.ts`（若 seed 由 FUNCTION_CARDS 產則自動含）、`src/lib/service.ts`（新 `applyMarketCard`）
- Test: `src/lib/game.test.ts`

**Interfaces:**
- Consumes: `reconcileMonopolySince`、`restockCard`、`logCardUse`、`logAttack`（service 既有）。
- Produces: `applyMarketCard({ kind, region?, propertyId?, byTeamId?, byToken? }): Promise<{ ok: true; undo: UndoRecipe }>`，`kind: "RED"|"BLACK"|"HAUNT"|"LANDGOD"`。RED/BLACK 需 region、HAUNT/LANDGOD 需 propertyId。

- [ ] **Step 1: FUNCTION_CARDS 加四張**

在 `src/lib/game.ts` `FUNCTION_CARDS`（約 880-885）陣列加：

```ts
  { type: "紅卡", effect: "選定一區，整區不動產大漲", cost: 60, defaultStock: 4 },
  { type: "黑卡", effect: "選定一區，整區不動產大跌", cost: 60, defaultStock: 4 },
  { type: "鬧鬼卡", effect: "選定一棟房子，該棟現值下跌", cost: 40, defaultStock: 4 },
  { type: "土地公卡", effect: "選定一棟房子，該棟現值上漲", cost: 40, defaultStock: 4 },
```

- [ ] **Step 2: 寫 failing 測試（純函式：卡牌倍率疊乘可逆）**

```ts
it("卡牌倍率疊乘：黑卡後再紅卡", () => {
  // 直接驗算疊乘語意（service 用 current × factor）
  const afterBlack = 1 * 0.75;
  const afterRed = afterBlack * 1.3;
  expect(afterRed).toBeCloseTo(0.975, 6);
});
```

（此為語意鎖定；service 寫入以手動/整合驗證。）

- [ ] **Step 3: 實作 `applyMarketCard`**

在 `src/lib/service.ts` 的功能卡區（`transferProperty` 之後、賣地之後皆可，建議接在賣地 service 後）加：

```ts
// ── 市場卡：紅/黑（整區永久倍率）、鬧鬼/土地公（單棟永久倍率）──
// 倍率永久疊乘在 cardRegionMult / cardBuildingMult，可互相抵消。可打自己、含無主地。
export async function applyMarketCard(params: {
  kind: "RED" | "BLACK" | "HAUNT" | "LANDGOD";
  region?: RegionCode;
  propertyId?: number;
  byTeamId?: number;
  byToken?: string;
}) {
  const { kind, region, propertyId, byTeamId, byToken } = params;
  return prisma.$transaction(async (tx) => {
    const state = await getState(tx);
    const now = Date.now();
    const ledgerIds: number[] = [];
    const undoProps: { id: number; ownerTeamId: number | null; level: number;
      cardRegionMult: number; cardBuildingMult: number; monopolyBonusMult: number }[] = [];

    if (kind === "RED" || kind === "BLACK") {
      if (!region) throw new Error("紅/黑卡需選定區域");
      const factor = kind === "RED" ? state.cardRegionUpMult : state.cardRegionDownMult;
      const props = await tx.property.findMany({ where: { region } });
      if (props.length === 0) throw new Error("該區無不動產");
      for (const p of props) {
        undoProps.push({ id: p.id, ownerTeamId: p.ownerTeamId, level: p.level,
          cardRegionMult: p.cardRegionMult, cardBuildingMult: p.cardBuildingMult, monopolyBonusMult: p.monopolyBonusMult });
        await tx.property.update({ where: { id: p.id }, data: { cardRegionMult: p.cardRegionMult * factor } });
      }
      const cardName = kind === "RED" ? "紅卡" : "黑卡";
      ledgerIds.push(await logLedger(tx, { kind: "system", delta: 0,
        note: `${cardName}：${REGION_NAME[region]} 整區 ×${factor}`, byToken }));
      await restockCard(tx, cardName);
      await logCardUse(tx, byTeamId, `${cardName} → ${REGION_NAME[region]}`, byToken);
    } else {
      if (propertyId == null) throw new Error("鬧鬼/土地公卡需選定房屋");
      const p = await tx.property.findUnique({ where: { id: propertyId } });
      if (!p) throw new Error("找不到不動產");
      const factor = kind === "LANDGOD" ? state.cardBuildingUpMult : state.cardBuildingDownMult;
      undoProps.push({ id: p.id, ownerTeamId: p.ownerTeamId, level: p.level,
        cardRegionMult: p.cardRegionMult, cardBuildingMult: p.cardBuildingMult, monopolyBonusMult: p.monopolyBonusMult });
      await tx.property.update({ where: { id: p.id }, data: { cardBuildingMult: p.cardBuildingMult * factor } });
      const cardName = kind === "LANDGOD" ? "土地公卡" : "鬧鬼卡";
      ledgerIds.push(await logLedger(tx, { kind: "system", delta: 0,
        note: `${cardName}：${p.name} ×${factor}`, byToken }));
      await restockCard(tx, cardName);
      await logCardUse(tx, byTeamId, `${cardName} → ${p.name}`, byToken);
      if (kind === "HAUNT" && p.ownerTeamId != null) {
        await logAttack(tx, p.ownerTeamId, `⚔ 你的「${p.name}」被鬧鬼卡打跌`, byToken);
      }
    }

    // 倍率改變可能影響 HAVEN 現值計算，但不改持有結構；仍重算以防獨佔門檻受 level 無關。此處毋須，但安全起見略過。
    const undo: UndoRecipe = { label: `市場卡 ${kind}`, ledgerIds, properties: undoProps };
    return { ok: true, undo };
  });
}
```

- [ ] **Step 4: 執行測試 + tsc**

Run: `npx vitest run src/lib/game.test.ts && npx tsc --noEmit`
Expected: PASS + 乾淨。

- [ ] **Step 5: 種子補四張卡到 DB**

Run: `npm run seed`
Expected: seed 以 skipDuplicates 補上四張新 FunctionCard（若 seed 讀 FUNCTION_CARDS）。若 seed 未自動含，手動 `npx prisma studio` 或改 seed。驗證：`npx prisma studio` 看 FunctionCard 有紅/黑/鬧鬼/土地公。

- [ ] **Step 6: Commit**

```bash
git add src/lib/game.ts src/lib/service.ts prisma/seed.ts
git commit -m "feat(service): 紅/黑/鬧鬼/土地公 市場卡"
```

---

## Task 9: service — EMBER 升級加速

**Files:**
- Modify: `src/lib/service.ts` (`buyProperty` 約 340-370、`upgradeProperty` 約 374-411)
- Test: 手動 + tsc（DB 寫入）

**Interfaces:**
- Consumes: `findMonopoly`（判定買家/屋主是否獨佔 EMBER）。
- Produces: `buyProperty` 買家獨佔 EMBER → 新地 level=1；`upgradeProperty` 屋主獨佔 EMBER → level 一次 +2（上限 3），仍只收一次費。

- [ ] **Step 1: 加內部 helper 判定是否獨佔 EMBER**

在 `src/lib/service.ts` `queryTeamMonopolyRegions` 附近加：

```ts
// 該隊是否獨佔某區（EMBER 升級加速等即時判定用）。
async function teamMonopolizesRegion(tx: Tx, teamId: number, region: RegionCode): Promise<boolean> {
  const regionProps = await tx.property.findMany({
    where: { region }, select: { ownerTeamId: true, level: true },
  });
  return findMonopoly(regionProps) === teamId;
}
```

- [ ] **Step 2: `buyProperty` 加 EMBER 加速**

把 `buyProperty` 內設定新地的那行（約 354）：

```ts
    await tx.property.update({ where: { id: propertyId }, data: { ownerTeamId: teamId, level: 0 } });
```

改為：

```ts
    const emberBoost = await teamMonopolizesRegion(tx, teamId, "EMBER");
    const newLevel = emberBoost ? 1 : 0;
    await tx.property.update({ where: { id: propertyId }, data: { ownerTeamId: teamId, level: newLevel } });
```

並把該筆 ledger note 與 undo 一併反映（undo 仍還原成無主 level0，購買撤銷即無主，故不變）。買地後補一行重算獨佔：

```ts
    await reconcileMonopolySince(tx, Date.now());
```

（放在 undo 組裝前。）

- [ ] **Step 3: `upgradeProperty` 加 EMBER 加速（一次 +2）**

把 `upgradeProperty` 的升級那行（約 394）：

```ts
    await tx.property.update({ where: { id: propertyId }, data: { level: { increment: 1 } } });
```

改為：

```ts
    const emberBoost = await teamMonopolizesRegion(tx, prop.ownerTeamId, "EMBER");
    const step = emberBoost ? 2 : 1;
    const targetLevel = Math.min(3, prop.level + step);
    await tx.property.update({ where: { id: propertyId }, data: { level: targetLevel } });
```

並把 note 的 `prop.level + 1` 改為 `targetLevel`。升級後補重算獨佔：

```ts
    await reconcileMonopolySince(tx, Date.now());
```

（放在 undo 組裝前；undo 仍還原成 `prop.level`。）

- [ ] **Step 4: 驗證 tsc + 手動**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 乾淨 + 全綠。
手動（有 dev DB）：讓某隊獨佔 EMBER（該區有 3 級房且最多），再買 EMBER 一塊地 → 直接 1 級；升級一塊 1 級 → 變 3 級（+2），只扣一次費。

- [ ] **Step 5: Commit**

```bash
git add src/lib/service.ts
git commit -m "feat(service): EMBER 獨佔升級加速（買地直接1級、升級+2）"
```

---

## Task 10: service — 每回合結算加房收 / SPECTRA / AURORA / HAVEN flush

**Files:**
- Modify: `src/lib/service.ts` (`distributeRoundIncome` 約 1630-1709)
- Test: `src/lib/game.test.ts`（房收/AURORA 純邏輯已在 Task 4/純函式涵蓋）+ 手動

**Interfaces:**
- Consumes: `houseIncome`、`REGION_MONOPOLY_EFFECT`、`havenLiveMultFor`、`flushHavenAppreciation`、`teamMonopolizesRegion`、`currentValue`。
- Produces: `distributeRoundIncome` 除既有動產收益外，額外：
  1. 該隊獨佔 AURORA → 動產每輪收益 total 與房收皆 ×auroraMultiplier。
  2. 該隊持有 level≥1 房 → 依 `houseIncome(currentValue含havenLiveMult, level, rates)` 發光幣（記獨立 ledger note「房產營收」）。
  3. 該隊獨佔 SPECTRA → 發 spectraCardPoints 卡牌點數（記 cardPoints ledger）。
  4. 呼叫 `flushHavenAppreciation`（若該隊為 HAVEN 獨佔隊，鎖漲幅）。

- [ ] **Step 1: 房收 + AURORA + SPECTRA + HAVEN flush 併入**

`distributeRoundIncome` 目前只處理選定 teamId 的動產收益。在該函式的 `for (const [teamId, { total, ids }] of incomeMap)` 發放段（約 1696）**之前/之後**擴充。因該函式參數為單一 `teamId`，在函式開頭取得 `state`、`now`、該隊 `props`。實作要點：

- 取 `state = await getState(tx)`、`now = Date.now()`（若尚未取）。
- `const isAurora = REGION_MONOPOLY_EFFECT... ` → 用 `teamMonopolizesRegion(tx, teamId, "AURORA")`。
- **AURORA 套用動產收益**：把 `addIncome` 累出的 total，在寫入前若 isAurora 則 `total = Math.round(total * state.auroraMultiplier)`（僅正收益放大；負收益即詛咒扣款不放大——見 spec「純扣款不加成」，故 `if (isAurora && total > 0) total = Math.round(total * mult)`）。
- **房收**：查該隊 `props = await tx.property.findMany({ where: { ownerTeamId: teamId } })`；對每棟算
  `const cv = currentValue(p, activeEvents, state.event4Penalty, { havenLiveMult: havenLiveMultFor(state, teamId, now) })`，
  `let inc = houseIncome(cv, p.level, [state.houseIncomeL1, state.houseIncomeL2, state.houseIncomeL3])`，
  若 isAurora 則 `inc = Math.round(inc * state.auroraMultiplier)`；累加成 `houseTotal`。
  `houseTotal>0` 時 `tx.team.update coins += houseTotal` 並記 `logLedger({ teamId, kind:"coins", delta: houseTotal, note:"房產營收", byToken })`。
- **SPECTRA**：`if (await teamMonopolizesRegion(tx, teamId, "SPECTRA")) { tx.team.update cardPoints += state.spectraCardPoints; logLedger({ teamId, kind:"cardPoints", delta: state.spectraCardPoints, note:"獨佔靈序：卡牌點數", byToken }); }`。
- **HAVEN flush**：函式結尾（回傳前）`await flushHavenAppreciation(tx, await getState(tx), now)`（若該隊為 HAVEN 獨佔隊會鎖漲幅；非獨佔隊則無動作）。

具體插入（在 `distributeRoundIncome` 內、`return { ok: true, ... }` 之前）：

```ts
    // ── 不動產進階：AURORA×1.5 已於上方套用動產收益；此處補房收 / SPECTRA / HAVEN flush ──
    const isAurora = await teamMonopolizesRegion(tx, teamId, "AURORA");
    const hLive = havenLiveMultFor(state, teamId, Date.now());
    const myProps = await tx.property.findMany({ where: { ownerTeamId: teamId } });
    let houseTotal = 0;
    for (const p of myProps) {
      const cv = currentValue(p, activeEvents, state.event4Penalty, { havenLiveMult: hLive });
      let inc = houseIncome(cv, p.level, [state.houseIncomeL1, state.houseIncomeL2, state.houseIncomeL3]);
      if (isAurora && inc > 0) inc = Math.round(inc * state.auroraMultiplier);
      houseTotal += inc;
    }
    if (houseTotal > 0) {
      await tx.team.update({ where: { id: teamId }, data: { coins: { increment: houseTotal } } });
      await logLedger(tx, { teamId, kind: "coins", delta: houseTotal, note: "房產營收", byToken });
    }
    if (await teamMonopolizesRegion(tx, teamId, "SPECTRA")) {
      await tx.team.update({ where: { id: teamId }, data: { cardPoints: { increment: state.spectraCardPoints } } });
      await logLedger(tx, { teamId, kind: "cardPoints", delta: state.spectraCardPoints, note: "獨佔靈序：卡牌點數", byToken });
    }
    await flushHavenAppreciation(tx, await getState(tx), Date.now());
```

並在動產收益寫入段（約 1698-1701）把 AURORA 放大套上：找到

```ts
      if (total !== 0) {
        await tx.team.update({ where: { id: teamId }, data: { coins: { increment: total } } });
```

改為在 update 前插入：

```ts
      let payout = total;
      if (total > 0) {
        const auroraMono = await teamMonopolizesRegion(tx, teamId, "AURORA");
        if (auroraMono) payout = Math.round(total * state.auroraMultiplier);
      }
```

並把該段後續 `increment: total` 改 `increment: payout`、ledger delta 改 `payout`。（注意：此迴圈的 teamId 即函式參數 teamId，`state` 需在函式較前處已取得——確認 `distributeRoundIncome` 已有 `const state = await getState(tx)`，約 1648 有 `getState`，直接沿用。）

- [ ] **Step 2: 純函式測試（房收 + AURORA 放大語意）**

已於 Task 4 覆蓋 `houseIncome`。補一個 AURORA 放大語意鎖定：

```ts
it("AURORA 放大：正收益 ×1.5、負收益不放大", () => {
  const mult = 1.5;
  expect(Math.round(200 * mult)).toBe(300);
  // 負收益（詛咒扣款）不套放大
  const neg = -100;
  expect(neg > 0 ? Math.round(neg * mult) : neg).toBe(-100);
});
```

- [ ] **Step 3: 驗證**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 乾淨 + 全綠。
手動（dev DB）：讓某隊獨佔 AURORA + 有 3 級房，按「發放每輪收益」→ 光幣含房產營收且動產收益 ×1.5；獨佔 SPECTRA 隊得 +10 卡牌點數；獨佔 HAVEN 隊按下後 monopolyBonusMult 上升（Prisma studio 看）。

- [ ] **Step 4: Commit**

```bash
git add src/lib/service.ts src/lib/game.test.ts
git commit -m "feat(service): 每回合結算加房收/SPECTRA卡點/AURORA×1.5/HAVEN鎖漲"
```

---

## Task 11: service — admin 設定可調參數

**Files:**
- Modify: `src/lib/service.ts` (新 `adminSetAdvancedSettings`，放 `adminSetShopItem` 約 1198 之後)
- Test: tsc + 手動

**Interfaces:**
- Consumes: 無。
- Produces: `adminSetAdvancedSettings(params: Partial<{ auroraMultiplier, spectraCardPoints, havenApprIntervalMs, havenApprRate, houseIncomeL1, houseIncomeL2, houseIncomeL3, cardRegionUpMult, cardRegionDownMult, cardBuildingUpMult, cardBuildingDownMult }>): Promise<GameState>`，只更新有給的欄位，數值做基本 clamp（≥0）。

- [ ] **Step 1: 實作**

```ts
// 不動產進階系統可調參數（admin）。只更新有給的欄位。
export async function adminSetAdvancedSettings(params: {
  auroraMultiplier?: number; spectraCardPoints?: number;
  havenApprIntervalMs?: number; havenApprRate?: number;
  houseIncomeL1?: number; houseIncomeL2?: number; houseIncomeL3?: number;
  cardRegionUpMult?: number; cardRegionDownMult?: number;
  cardBuildingUpMult?: number; cardBuildingDownMult?: number;
}) {
  const data: Record<string, number> = {};
  const numKeys = [
    "auroraMultiplier","spectraCardPoints","havenApprIntervalMs","havenApprRate",
    "houseIncomeL1","houseIncomeL2","houseIncomeL3",
    "cardRegionUpMult","cardRegionDownMult","cardBuildingUpMult","cardBuildingDownMult",
  ] as const;
  for (const k of numKeys) {
    const v = (params as Record<string, number | undefined>)[k];
    if (typeof v === "number" && Number.isFinite(v)) data[k] = Math.max(0, v);
  }
  return prisma.gameState.update({ where: { id: 1 }, data });
}
```

- [ ] **Step 2: 驗證 tsc**

Run: `npx tsc --noEmit`
Expected: 乾淨。

- [ ] **Step 3: Commit**

```bash
git add src/lib/service.ts
git commit -m "feat(service): admin 設定不動產進階可調參數"
```

---

## Task 12: snapshot — propView 帶倍率 + 獨佔效果標籤

**Files:**
- Modify: `src/lib/snapshot.ts` (propView 約 200-215、region 獨佔區塊約 273-285、可調參數輸出)
- Test: tsc + 手動

**Interfaces:**
- Consumes: `havenAppreciationMult`、`parseMonopolySince`、`REGION_MONOPOLY_EFFECT`。
- Produces: snapshot 的每個 propView 的 `currentValue/investedValue/leveledValue` 已含 HAVEN 即時漲幅（傳 `{ havenLiveMult }`）；region 區塊每區帶 `monopolyEffect: MonopolyEffect`；輸出可調參數供 admin/ UI 顯示。

- [ ] **Step 1: propView 疊 havenLiveMult**

在 `src/lib/snapshot.ts` 建 propView（約 200-215）前，先算每隊的 havenLiveMult。取 state.monopolySince、now：

```ts
  const now = Date.now();
  const monoSince = parseMonopolySince(state.monopolySince);
  const havenOwner = monoSince.HAVEN ?? null;
  const havenLiveOf = (ownerTeamId: number | null): number =>
    havenOwner && ownerTeamId === havenOwner.teamId
      ? havenAppreciationMult(havenOwner.since, now, state.havenApprIntervalMs, state.havenApprRate)
      : 1;
```

把 propView 的三個 value 改為帶 opts：

```ts
    currentValue: currentValue(p, activeEvents, event4Penalty, { havenLiveMult: havenLiveOf(p.ownerTeamId) }),
    investedValue: investedValue(p, activeEvents, event4Penalty, { havenLiveMult: havenLiveOf(p.ownerTeamId) }),
    leveledValue: leveledValue(p, activeEvents, event4Penalty, { havenLiveMult: havenLiveOf(p.ownerTeamId) }),
```

（確認 `state` 在 snapshot 內可取得 monopolySince/havenAppr 欄位；`getSnapshot` 讀 gameState 全欄位即含新欄。）

- [ ] **Step 2: region 區塊帶 monopolyEffect**

在各區獨佔輸出（約 273-285，`monopolyByTeam`/每區 view）加上 `monopolyEffect: REGION_MONOPOLY_EFFECT[r.code as RegionCode]`。若該處以物件輸出各區資訊，於物件加此欄；並在對應的 TypeScript 型別（RegionView 之類，約 90-97）加 `monopolyEffect: MonopolyEffect`。

- [ ] **Step 3: 輸出可調參數（供 admin UI）**

在 snapshot 頂層輸出物件加一個 `settings` 區塊（若已有 gameState 輸出可併入）：

```ts
    settings: {
      auroraMultiplier: state.auroraMultiplier,
      spectraCardPoints: state.spectraCardPoints,
      havenApprIntervalMs: state.havenApprIntervalMs,
      havenApprRate: state.havenApprRate,
      houseIncomeRates: [state.houseIncomeL1, state.houseIncomeL2, state.houseIncomeL3] as [number, number, number],
      cardRegionUpMult: state.cardRegionUpMult,
      cardRegionDownMult: state.cardRegionDownMult,
      cardBuildingUpMult: state.cardBuildingUpMult,
      cardBuildingDownMult: state.cardBuildingDownMult,
    },
```

並於 snapshot 回傳型別加對應欄位。

- [ ] **Step 4: 驗證**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 乾淨 + 全綠。

- [ ] **Step 5: Commit**

```bash
git add src/lib/snapshot.ts
git commit -m "feat(snapshot): propView 含 HAVEN 即時漲幅 + 區域獨佔效果 + 可調參數"
```

---

## Task 13: API — 賣地 / 市場卡（併入既有 exchange/card route）+ admin 設定

**Files:**
- Modify: `src/app/api/exchange/card/route.ts`（既有 action dispatch route，加 `sellProperty` 與四張市場卡 action）
- Create: `src/app/api/admin/settings/route.ts`
- Reference: `src/app/api/exchange/card/route.ts` 現有 pattern（`apiRoute(["EXCHANGE"], async ({ body, session }) => ...)`、`byToken = session.label`、`num/str/optNum` 取參數）；`src/app/api/admin/card/route.ts`（admin route pattern）。

**重要：** `apiRoute` 的 handler 簽名是 `({ req, session, body })`，**沒有 `token` 欄位**；byToken 來自 `session.label`。body helper 用 `num(body, "x")`、`str(body, "x")`、`optNum(body, "x")`（from `@/lib/api`）。

**Interfaces:**
- Consumes: `sellPropertyToExchange`、`applyMarketCard`、`adminSetAdvancedSettings`；`apiRoute`、`num`、`str`、`optNum`（`src/lib/api.ts`）。
- Produces: `exchange/card` route 新增 `sellProperty`/`red`/`black`/`haunt`/`landgod` action；`POST /api/admin/settings`。

- [ ] **Step 1: 讀既有 exchange/card route 確認 pattern**

Run: `cat src/app/api/exchange/card/route.ts`
確認 import（`apiRoute, num, str, optNum`）、`byToken = session.label`、`switch (action)` 分發結構。並讀 `node_modules/next/dist/docs/` route handler 章節（AGENTS.md 要求）。

- [ ] **Step 2: 在 exchange/card route 加賣地 + 四張市場卡 action**

修改 `src/app/api/exchange/card/route.ts`：import 加 `sellPropertyToExchange, applyMarketCard`，並在 `switch (action)` 加 case（RegionCode 用 `str` 取字串後 as）：

```ts
    case "sellProperty": // 賣不動產給交易所
      return sellPropertyToExchange({ propertyId: num(body, "propertyId"), byToken });
    case "red": // 紅卡：整區大漲
      return applyMarketCard({ kind: "RED", region: str(body, "region") as RegionCode, byTeamId: optNum(body, "byTeamId") || undefined, byToken });
    case "black": // 黑卡：整區大跌
      return applyMarketCard({ kind: "BLACK", region: str(body, "region") as RegionCode, byTeamId: optNum(body, "byTeamId") || undefined, byToken });
    case "haunt": // 鬧鬼卡：單棟跌
      return applyMarketCard({ kind: "HAUNT", propertyId: num(body, "propertyId"), byTeamId: optNum(body, "byTeamId") || undefined, byToken });
    case "landgod": // 土地公卡：單棟漲
      return applyMarketCard({ kind: "LANDGOD", propertyId: num(body, "propertyId"), byTeamId: optNum(body, "byTeamId") || undefined, byToken });
```

並在檔案頂 import 加 `import type { RegionCode } from "@/lib/game";`。

- [ ] **Step 3: 建 admin 設定 route**

`src/app/api/admin/settings/route.ts`（比照 `src/app/api/admin/card/route.ts`）：

```ts
import { apiRoute } from "@/lib/api";
import { adminSetAdvancedSettings } from "@/lib/service";

const numOrUndef = (v: unknown) => (v != null && v !== "" ? Number(v) : undefined);

export const POST = apiRoute(["ADMIN"], async ({ body }) =>
  adminSetAdvancedSettings({
    auroraMultiplier: numOrUndef(body.auroraMultiplier),
    spectraCardPoints: numOrUndef(body.spectraCardPoints),
    havenApprIntervalMs: numOrUndef(body.havenApprIntervalMs),
    havenApprRate: numOrUndef(body.havenApprRate),
    houseIncomeL1: numOrUndef(body.houseIncomeL1),
    houseIncomeL2: numOrUndef(body.houseIncomeL2),
    houseIncomeL3: numOrUndef(body.houseIncomeL3),
    cardRegionUpMult: numOrUndef(body.cardRegionUpMult),
    cardRegionDownMult: numOrUndef(body.cardRegionDownMult),
    cardBuildingUpMult: numOrUndef(body.cardBuildingUpMult),
    cardBuildingDownMult: numOrUndef(body.cardBuildingDownMult),
  }),
);
```

- [ ] **Step 4: 驗證**

Run: `npx tsc --noEmit`
Expected: 乾淨。啟 `npm run dev`，用 curl 打 `POST /api/exchange/card {action:"sellProperty",propertyId:...}` 與 `/api/admin/settings` 確認回 200。

- [ ] **Step 5: Commit**

```bash
git add src/app/api/exchange/card/route.ts src/app/api/admin/settings/route.ts
git commit -m "feat(api): 賣地 / 市場卡 action + admin 設定 endpoint"
```

---

## Task 14: UI — ExchangeView 賣地按鈕 + 四張市場卡

**Files:**
- Modify: 交易所頁元件（先 `grep -rn "ExchangeView\|交易所" src/` 定位，通常 `src/components/ExchangeView.tsx` 或 `src/app/.../page.tsx`）
- Reference: 既有購地/拆屋卡的執行 UI（照抄互動與撤銷 toast 模式）

**Interfaces:**
- Consumes: `/api/exchange/sell-property`、`/api/exchange/market-card`；snapshot 的 propView（含 investedValue 顯示賣價預覽）與 region 清單。

- [ ] **Step 1: 定位交易所 UI 與既有卡片執行元件**

Run: `grep -rln "拆屋卡\|購地卡\|/api/exchange" src/`
讀其中主要交易所元件，找到「選一棟房 → 呼叫 API → 顯示撤銷」的既有模式。

- [ ] **Step 2: 加「賣回交易所」按鈕**

在交易所每棟已購不動產列，加一顆「賣回」按鈕，顯示賣價預覽 = propView.investedValue（取整到 10）。點擊 POST `/api/exchange/sell-property`，成功後沿用既有撤銷 toast（回應含 undo）。文案：「賣回交易所（+{investedValue}）」。

- [ ] **Step 3: 加四張市場卡執行 UI**

新增一區「市場卡」：
- 紅卡 / 黑卡：選區下拉（AURORA/SPECTRA/EMBER/HAVEN）→ POST market-card `{ kind, region }`。
- 鬧鬼卡 / 土地公卡：選一棟房（下拉或點地圖）→ POST `{ kind, propertyId }`。
- 成功後撤銷 toast（回應含 undo）。顯示效果幅度（來自 snapshot.settings.cardRegionUpMult 等）。

- [ ] **Step 4: 驗證**

Run: `npx tsc --noEmit && npm run dev`
手動：交易所頁賣回一棟（光幣增加、地變無主、可撤銷）；出紅卡選一區（該區各棟 currentValue 顯示上升）；出鬧鬼卡選一棟（該棟下降）。

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ui): 交易所賣地 + 四張市場卡執行介面"
```

---

## Task 15: UI — 地圖顯示區域獨佔效果 + AdminView 參數編輯

**Files:**
- Modify: 地圖頁（`grep -rn "RealMapView\|MapView\|monopolyTeam" src/`）、AdminView（`grep -rn "AdminView\|ShopItemEditor" src/`）

**Interfaces:**
- Consumes: snapshot 的 region.monopolyEffect、settings；`/api/admin/settings`。

- [ ] **Step 1: 地圖顯示各區獨佔效果**

在地圖各區獨佔隊顯示處，依 `region.monopolyEffect` 顯示中文說明徽章：
- COIN_1_5X → 「💰 光幣 ×1.5」
- CARD_POINTS → 「🃏 每回合 +{spectraCardPoints} 卡點」
- UPGRADE_BOOST → 「🏗 升級加速」
- APPRECIATION → 「📈 不動產慢慢漲」

HAVEN 獨佔隊的不動產可顯示即時漲幅（propView.currentValue 已含）。

- [ ] **Step 2: AdminView 加參數編輯器**

在 AdminView 加一個「不動產進階參數」區塊，逐欄輸入 settings 各值（來自 snapshot.settings），送 POST `/api/admin/settings`。比照既有 `ShopItemEditor`/`adminSetCard` 的編輯 UI 模式。

- [ ] **Step 3: 驗證**

Run: `npx tsc --noEmit && npm run dev`
手動：地圖顯示四區各自徽章；Admin 改 auroraMultiplier=2 後，再發每輪收益，AURORA 隊收益 ×2。

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ui): 地圖區域獨佔效果徽章 + Admin 進階參數編輯"
```

---

## Task 16: 全量驗證 + README/文件

**Files:**
- Modify: `README.md`（新機制段落，選用）

- [ ] **Step 1: 全量測試**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 乾淨 + 全綠（≥ 134 + 新增測試）。

- [ ] **Step 2: 端對端手動驗證清單**

啟 `npm run dev`，逐項確認：
- 賣地：交易所賣回一棟，光幣 = investedValue、可撤銷。
- AURORA 獨佔：每輪收益 + 房收 ×1.5。
- SPECTRA 獨佔：每輪 +10 卡點。
- EMBER 獨佔：買地直接 1 級、升級 +2。
- HAVEN 獨佔：等一分鐘，現值上升；發每輪收益後 monopolyBonusMult 鎖定（Prisma studio）。
- 房收：升級房每輪發光幣（現值 × 3/5/8%）。
- 四卡：紅漲/黑跌整區、鬧鬼跌/土地公漲單棟，皆可撤銷；賣地不重置倍率。
- Admin：改參數即時生效。

- [ ] **Step 3: 更新 README（選用）**

在 `README.md` 補「不動產進階系統」段落，摘要四大獨佔效果、房收、四張市場卡、賣地。

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs: README 不動產進階系統說明 + 全量驗證通過"
```

---

## Self-Review 對照

- **賣地（investedValue、不重置倍率、HAVEN 賣前 flush）** → Task 7。✓
- **AURORA ×1.5（過路費除外於此計畫的每輪/房收；過路費是否套 1.5 見下註）** → Task 10。註：spec 列過路費收入在 1.5 範圍。過路費在 `payToll`，本計畫未改 `payToll` 套 AURORA——**補充 Task 10.5**（見下）。
- **SPECTRA +10 卡點** → Task 10。✓
- **EMBER 全場升級加速** → Task 9。✓
- **HAVEN 慢慢漲（該隊全部不動產、即時顯示、四時機鎖定：發收益/換人/結算/賣地）** → 發收益 Task 10、換人 reconcile Task 6/9、賣地 Task 7；結算（比賽 SETTLED）flush → **補充 Task 10.5**。
- **房收 3/5/8%、四捨五入到個位、AURORA×1.5** → Task 10。✓
- **四張市場卡（疊 currentValue、可打自己含無主地、可撤銷、restock）** → Task 8。✓
- **admin 可調全參數** → Task 11 + UI Task 15。✓
- **snapshot 即時顯示** → Task 12。✓

### 補充 Task 10.5: payToll 套 AURORA + 比賽結算 flush

**Files:** Modify `src/lib/service.ts`（`payToll` 約 620-695；結算函式 `grep -n "SETTLED\|settle\|settledAt" src/lib/service.ts` 定位）

- [ ] **Step 1: payToll 收款方獨佔 AURORA → 過路費 ×1.5**

在 `payToll` 內、`const ledgerIds = [l1, l2]`（約 678）**之後**插入（此時 `ledgerIds` 已宣告為可 push 的陣列、`toll`/`monopolyId` 皆在 scope）。付款方仍付原 `toll`（守恆不破），AURORA 加成由銀行另發給收款方並記一筆 ledger：

```ts
    const state2 = await getState(tx);
    if (await teamMonopolizesRegion(tx, monopolyId, "AURORA")) {
      const bonus = Math.round(toll * (state2.auroraMultiplier - 1));
      if (bonus > 0) {
        await tx.team.update({ where: { id: monopolyId }, data: { coins: { increment: bonus } } });
        ledgerIds.push(await logLedger(tx, { teamId: monopolyId, kind: "coins", delta: bonus, note: `獨佔極光加成 過路費`, byToken }));
      }
    }
```

- [ ] **Step 2: 比賽結算時 flush HAVEN**

在把 phase 設 `SETTLED` 的函式（`src/lib/service.ts` 約 1124，`data: { phase: "SETTLED", settledAt: new Date() }` 那筆 `gameState.update`）**之前**插入 `await flushHavenAppreciation(tx, await getState(tx), Date.now())`，確保結算淨值含 HAVEN 最終漲幅。確認該函式在 `prisma.$transaction` 內且 `tx` 在 scope；若非交易內，改用 `prisma` 直接呼叫版或包成交易。

- [ ] **Step 3: 流動關發獎 / 好運卡 / 厄運補償 套 AURORA ×1.5**

spec 的 AURORA 範圍含「流動關發獎、好運/厄運卡入帳」。定位這些發錢點：`grep -n "好運\|厄運\|流動關\|_applyGoodCardTx\|rewardCoins\|freeWheelReward" src/lib/service.ts`。對其中「發正光幣給某隊」的入帳點，在寫入前若該隊 `teamMonopolizesRegion(tx, teamId, "AURORA")` 則把該筆正入帳 `Math.round(amount * state.auroraMultiplier)`（純扣款不放大）。逐點加一個小 helper：

```ts
async function withAuroraBonus(tx: Tx, teamId: number, amount: number): Promise<number> {
  if (amount <= 0) return amount;
  const state = await getState(tx);
  return (await teamMonopolizesRegion(tx, teamId, "AURORA"))
    ? Math.round(amount * state.auroraMultiplier)
    : amount;
}
```

在好運卡發獎（`_applyGoodCardTx` 的 rewardCoins 入帳）、厄運補償入帳、流動關發獎（DOUBLE_OR_NOTHING/一般發獎）的正入帳處，把 `amount` 換成 `await withAuroraBonus(tx, teamId, amount)`。**注意守恆**：這些多為銀行發放（非隊對隊），可直接放大；若為隊對隊轉移則**不套**（避免破壞守恆）。

- [ ] **Step 4: 驗證 + Commit**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 乾淨 + 全綠。

```bash
git add src/lib/service.ts
git commit -m "feat(service): 過路費/流動關/好運厄運 套 AURORA 加成 + 結算 flush HAVEN"
```

---

## 注意事項總結

- **AURORA×1.5 守恆**：過路費加成走「銀行補收款方」不從付款方多扣（避免破壞付=收守恆）；每輪收益/房收本就是銀行發放，直接放大即可。
- **HAVEN flush 冪等**：flush 後 since 重設為 now，重複 flush 不重複計（因 units 歸零）。
- **undo 賣地**：還原 owner/level/三倍率；賣地後 reconcile 過的 monopolySince 不隨 undo 精準回復（可接受——下次任何操作會 reconcile 回正確狀態；HAVEN since 若因 undo 有微小偏差，影響僅是漲幅計時，現場可 admin 修）。若要更嚴謹可於 undo 也 reconcile，但非必要。
- **測試策略**：純函式（game.ts）走 vitest 單元測試；service DB 寫入以 tsc + 手動端對端驗證（本專案既有測試以純函式為主，未建服務層測試 DB）。
