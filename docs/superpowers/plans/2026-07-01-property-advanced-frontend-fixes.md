# 不動產進階系統前端修正 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓進階不動產系統（AURORA/EMBER/SPECTRA/HAVEN 獨佔被動、房收、賣回值）在各前端頁面正確、清楚地顯示，並修正 HAVEN 漲幅回溯套到新買地的後端時機。

**Architecture:** 六項獨立修正。多數為純前端顯示（讀既有 snapshot 欄位），兩項後端調整：`buyProperty` 的 HAVEN flush-on-buy、`distributeRoundIncome` 回傳房收 + 卡點。新增一個 `TeamView.monopolyRegions` snapshot 欄位讓前端徽章好寫。

**Tech Stack:** Next.js（此版本有 breaking changes，寫前先讀 `node_modules/next/dist/docs/`，見 web/AGENTS.md）、React、TypeScript、Prisma、Vitest、TailwindCSS、framer-motion。

## Global Constraints

- 工作目錄：`策略系統/web/`。所有路徑相對此目錄。
- Next.js 為改版：動任何 route / server 檔前先讀 `node_modules/next/dist/docs/` 相關指引。
- 驗證每個 task 結束跑：`npx tsc --noEmit`（乾淨）與 `npx vitest run`（全綠，現有測試不得退步）。
- service.ts 的 Prisma-backed 函式**無** DB 整合測試框架；純函式測試放 `src/lib/*.test.ts`（vitest，`environment: node`，include `src/**/*.test.ts`）。後端 service 改動以 `tsc` + 手動驗證為主，可測的邏輯抽成純函式再測。
- 金額一律 `roundTo10`；不改既有數值語義。
- 無 Prisma schema / migration 更動。
- 繁體中文 UI 文案，與現有風格一致。
- 徽章視覺比照 `TeamItemBadges`（`src/components/ui.tsx`）。獨佔效果文字**不用 emoji**（投影）。

---

### Task 1: snapshot 曝露 `TeamView.monopolyRegions`

讓前端三頁（Exchange/Mobile/Map）能用 `team.monopolyRegions` 判定獨佔區，供 #1 徽章與其他頁使用。資料已於 snapshot 內部算好（`monopolyByTeam`）。

**Files:**
- Modify: `src/lib/snapshot.ts`（`TeamView` 型別約 77-94 行；`teamViews` 組裝約 349-376 行）

**Interfaces:**
- Produces: `TeamView.monopolyRegions: RegionCode[]` — 該隊目前獨佔的區碼陣列（可為空）。後續 Task 2/3/4 消費。

- [ ] **Step 1: 型別加欄位**

在 `TeamView` 型別（`src/lib/snapshot.ts`，`objectives: ObjectiveView[];` 之後）加一行：

```ts
  objectives: ObjectiveView[]; // 進行中的好運卡任務目標（含進度）
  monopolyRegions: RegionCode[]; // 該隊目前獨佔的區碼（供頁面顯示獨佔被動徽章）
};
```

- [ ] **Step 2: 組裝時填入**

在 `teamViews` 的 `return { ... }`（約 358-375 行）最後、`objectives: objectivesByTeam(t.id),` 之後加一行：

```ts
      objectives: objectivesByTeam(t.id),
      monopolyRegions: monopolyByTeam.get(t.id) ?? [],
    };
```

（`monopolyByTeam` 已於約 306-310 行算好，`RegionCode` 已 import。）

- [ ] **Step 3: 驗證編譯**

Run: `npx tsc --noEmit`
Expected: 乾淨無錯。

- [ ] **Step 4: 驗證測試不退**

Run: `npx vitest run`
Expected: 全綠（現有 100+ tests）。

- [ ] **Step 5: Commit**

```bash
git add src/lib/snapshot.ts
git commit -m "feat(snapshot): expose TeamView.monopolyRegions for effect badges"
```

---

### Task 2: 新增 `MonopolyBadges` 共用元件 + 效果文字純函式

供 Exchange（EMBER）、Mobile/Map（AURORA）顯示獨佔被動徽章；並提供**不含 emoji**的效果文字給投影（Task 6）與徽章共用。

**Files:**
- Modify: `src/lib/game.ts`（`REGION_MONOPOLY_EFFECT` 附近，約 267 行後）
- Modify: `src/components/ui.tsx`（新增 `MonopolyBadges`，`TeamItemBadges` 之後約 348 行）
- Test: `src/lib/game.test.ts`

**Interfaces:**
- Produces:
  - `monopolyEffectText(effect: MonopolyEffect, opts: { auroraMultiplier: number; spectraCardPoints: number }): string`（game.ts，純函式，無 emoji）
  - `MonopolyBadges({ regions, effects, settings }: { regions: RegionCode[]; effects: readonly MonopolyEffect[]; settings: { auroraMultiplier: number; spectraCardPoints: number } })`（ui.tsx）— 只顯示 `regions` 中、其 `REGION_MONOPOLY_EFFECT` 屬於 `effects` 白名單的徽章；無符合則回 `null`。

- [ ] **Step 1: 寫失敗測試（效果文字純函式）**

在 `src/lib/game.test.ts` 末尾加：

```ts
import { monopolyEffectText } from "@/lib/game";

describe("monopolyEffectText", () => {
  const opts = { auroraMultiplier: 1.5, spectraCardPoints: 10 };
  it("四種效果皆回無 emoji 中文字", () => {
    expect(monopolyEffectText("COIN_1_5X", opts)).toBe("光幣 ×1.5");
    expect(monopolyEffectText("CARD_POINTS", opts)).toBe("每回合 +10 卡點");
    expect(monopolyEffectText("UPGRADE_BOOST", opts)).toBe("升級加速");
    expect(monopolyEffectText("APPRECIATION", opts)).toBe("不動產增值");
  });
  it("光幣倍率依 auroraMultiplier 動態顯示", () => {
    expect(monopolyEffectText("COIN_1_5X", { auroraMultiplier: 2, spectraCardPoints: 10 }))
      .toBe("光幣 ×2");
  });
  it("卡點依 spectraCardPoints 動態顯示", () => {
    expect(monopolyEffectText("CARD_POINTS", { auroraMultiplier: 1.5, spectraCardPoints: 25 }))
      .toBe("每回合 +25 卡點");
  });
});
```

（`monopolyEffectText` import 可併入 `game.test.ts` 頂部既有 `@/lib/game` import。）

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/lib/game.test.ts -t monopolyEffectText`
Expected: FAIL（`monopolyEffectText is not a function` / import 失敗）。

- [ ] **Step 3: 實作純函式**

在 `src/lib/game.ts` 的 `REGION_MONOPOLY_EFFECT`（約 267-272 行）之後加：

```ts
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
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npx vitest run src/lib/game.test.ts -t monopolyEffectText`
Expected: PASS。

- [ ] **Step 5: 實作 `MonopolyBadges` 元件**

在 `src/components/ui.tsx` 的 `TeamItemBadges` 函式結尾（約 348 行 `}` 之後）加。先確認頂部 import 含 `REGION_MONOPOLY_EFFECT`、`monopolyEffectText`、型別 `MonopolyEffect`、`RegionCode`（若缺則補進既有 `@/lib/game` import 行）：

```tsx
// 獨佔被動效果徽章（比照 item badge 視覺）：只顯示 effects 白名單內的區。
export function MonopolyBadges({
  regions,
  effects,
  settings,
}: {
  regions: RegionCode[];
  effects: readonly MonopolyEffect[];
  settings: { auroraMultiplier: number; spectraCardPoints: number };
}) {
  const shown = regions.filter((r) => (effects as MonopolyEffect[]).includes(REGION_MONOPOLY_EFFECT[r]));
  if (shown.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {shown.map((r) => (
        <span
          key={r}
          className="inline-flex items-center gap-1 rounded-lg border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-xs font-medium text-amber-200"
        >
          <span className="font-bold opacity-70">{REGION_NAME[r]}</span>
          <span>{monopolyEffectText(REGION_MONOPOLY_EFFECT[r], settings)}</span>
        </span>
      ))}
    </div>
  );
}
```

（`REGION_NAME` 若未 import 則補進 `@/lib/game` import。）

- [ ] **Step 6: 驗證編譯 + 全測試**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 乾淨、全綠。

- [ ] **Step 7: Commit**

```bash
git add src/lib/game.ts src/lib/game.test.ts src/components/ui.tsx
git commit -m "feat(ui): monopolyEffectText helper + MonopolyBadges component"
```

---

### Task 3: EMBER 徽章掛 ExchangeView、AURORA 徽章掛 MobileView + MapView（#1）

**Files:**
- Modify: `src/components/views/ExchangeView.tsx`（`StickyTeam` 內約 110-113 行）
- Modify: `src/components/views/MobileView.tsx`（`StickyTeam` 內約 56-59 行）
- Modify: `src/components/views/MapView.tsx`（`StickyTeam` 內約 218-221 行）

**Interfaces:**
- Consumes: `MonopolyBadges`（Task 2）、`TeamView.monopolyRegions`（Task 1）、`snap.settings.{auroraMultiplier,spectraCardPoints}`（既有）。

- [ ] **Step 1: ExchangeView 加 EMBER 徽章**

`src/components/views/ExchangeView.tsx`：import 行（第 6 行）加 `MonopolyBadges`：

```tsx
import { Num, PriceTag, LevelDots, EventBanner, TeamItemBadges, MonopolyBadges, HudTabs, TurnCompleteBar } from "@/components/ui";
```

在 `<TeamItemBadges ... />`（約 110-113 行）之後、`</StickyTeam>` 之前加：

```tsx
        <MonopolyBadges
          regions={cur?.monopolyRegions ?? []}
          effects={["UPGRADE_BOOST"]}
          settings={snap.settings}
        />
```

- [ ] **Step 2: MobileView 加 AURORA 徽章**

`src/components/views/MobileView.tsx`：import 行（第 7 行）加 `MonopolyBadges`：

```tsx
import { Num, EventBanner, HudTabs, TeamItemBadges, MonopolyBadges } from "@/components/ui";
```

在 `<TeamItemBadges ... />`（約 56-59 行）之後、`</StickyTeam>` 之前加：

```tsx
            <MonopolyBadges
              regions={snap.teams.find((t) => t.id === team)?.monopolyRegions ?? []}
              effects={["COIN_1_5X"]}
              settings={snap.settings}
            />
```

- [ ] **Step 3: MapView 加 AURORA 徽章**

`src/components/views/MapView.tsx`：import 行（第 15 行）加 `MonopolyBadges`：

```tsx
import { Num, EventBanner, HudTabs, TeamItemBadges, MonopolyBadges, FloatingDesc } from "@/components/ui";
```

在 `<TeamItemBadges ... />`（約 218-221 行）之後、`</StickyTeam>` 之前加：

```tsx
            <MonopolyBadges
              regions={cur?.monopolyRegions ?? []}
              effects={["COIN_1_5X"]}
              settings={snap.settings}
            />
```

- [ ] **Step 4: 驗證編譯 + 全測試**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 乾淨、全綠。

- [ ] **Step 5: 手動驗證（可選，需 dev server）**

啟 `npm run dev`，讓某隊獨佔 EMBER → `/exchange` 選該隊見「影焰工域 升級加速」徽章；獨佔 AURORA → `/mobile`、`/map` 選該隊見「極光金域 光幣 ×1.5」徽章。

- [ ] **Step 6: Commit**

```bash
git add src/components/views/ExchangeView.tsx src/components/views/MobileView.tsx src/components/views/MapView.tsx
git commit -m "feat(ui): show EMBER/AURORA monopoly effect badges on exchange/mobile/map"
```

---

### Task 4: `distributeRoundIncome` 回傳房收 + SPECTRA 卡點（#2 + #5 後端）

後端已入帳但未回傳 `houseTotal` 與 SPECTRA 卡點，前端結算面板看不到。

**Files:**
- Modify: `src/lib/service.ts`（`distributeRoundIncome`，SPECTRA 發放約 1961-1964 行、`return` 約 1967 行）

**Interfaces:**
- Produces: `distributeRoundIncome` 回傳新增 `houseIncome: number`（本次該隊房收光幣）與 `cardPoints: number`（本次 SPECTRA 發放卡點，無獨佔則 0）。既有 `results` / `remindersTicked` 不變。Task 5 消費。

- [ ] **Step 1: SPECTRA 發放記錄到變數**

在 `src/lib/service.ts` 的 `distributeRoundIncome` 內，SPECTRA 區塊（約 1961-1964 行）改為記錄發放量：

```ts
    let spectraGranted = 0;
    if (await teamMonopolizesRegion(tx, teamId, "SPECTRA")) {
      spectraGranted = state.spectraCardPoints;
      await tx.team.update({ where: { id: teamId }, data: { cardPoints: { increment: spectraGranted } } });
      await logLedger(tx, { teamId, kind: "cardPoints", delta: spectraGranted, note: "獨佔靈序：卡牌點數", byToken });
    }
```

（`houseTotal` 已於上方約 1950-1956 行算好。）

- [ ] **Step 2: return 補兩欄**

把 `return { ok: true, results, remindersTicked: reminderUsedIds.length };`（約 1967 行）改為：

```ts
    return {
      ok: true,
      results,
      remindersTicked: reminderUsedIds.length,
      houseIncome: houseTotal,
      cardPoints: spectraGranted,
    };
```

- [ ] **Step 3: 驗證編譯**

Run: `npx tsc --noEmit`
Expected: 乾淨（含 `/api/host/round-income` route，透傳整包不需改）。

- [ ] **Step 4: 全測試**

Run: `npx vitest run`
Expected: 全綠。

- [ ] **Step 5: Commit**

```bash
git add src/lib/service.ts
git commit -m "feat(service): distributeRoundIncome returns houseIncome + spectra cardPoints"
```

---

### Task 5: 結算面板顯示房收 + SPECTRA 卡點列（#2 + #5 前端）

**Files:**
- Modify: `src/components/views/RealMapView.tsx`（回合收益結算段約 558-670 行）

**Interfaces:**
- Consumes: `s.houseIncome` / `s.cardPoints`（Task 4）；`MoneyRow`（`src/components/client.tsx:166`，含 `amount?` 與 `cardPoints?`）。

- [ ] **Step 1: 取回傳的房收 + 卡點**

在 `src/components/views/RealMapView.tsx` 的 round-income 呼叫段（約 559-570 行）擴充。原：

```ts
      let roundIncome = 0;
      if (doSettle && (cur.items ?? []).some((i) => ROUND_GATE_TYPES.includes(i.effectType))) {
        try {
          const s = await postJson("/api/host/round-income", { teamId: team });
          roundIncome = (s.results ?? []).reduce(
            (acc: number, x: { income: number }) => acc + (x.income ?? 0),
            0,
          );
        } catch {
          /* 無收益 / 提醒道具等情況忽略 */
        }
      }
```

改為（房收 / SPECTRA 卡點與動產收益結算為同一次呼叫，故無條件呼叫；但保留原「僅在有相關道具或可能有房收/獨佔時呼叫」以免無謂 API。房收與 SPECTRA 不依賴動產道具，故改為只要 `doSettle` 就呼叫）：

```ts
      let roundIncome = 0;
      let houseIncome = 0;
      let spectraPoints = 0;
      if (doSettle) {
        try {
          const s = await postJson("/api/host/round-income", { teamId: team });
          roundIncome = (s.results ?? []).reduce(
            (acc: number, x: { income: number }) => acc + (x.income ?? 0),
            0,
          );
          houseIncome = s.houseIncome ?? 0;
          spectraPoints = s.cardPoints ?? 0;
        } catch {
          /* 無收益 / 提醒道具等情況忽略 */
        }
      }
```

- [ ] **Step 2: 面板加房收 + 卡點列**

在回合收益列之後（約 658-660 行 `if (incomeItems.length > 0 || roundIncome !== 0) { rows.push(...); }` 之後、`}` 收 `if (doSettle)` 之前）加：

```ts
          if (houseIncome > 0) {
            rows.push({ label: "房產營收", amount: houseIncome });
          }
          if (spectraPoints > 0) {
            rows.push({ label: "獨佔靈序：卡牌點數", cardPoints: spectraPoints });
          }
```

- [ ] **Step 3: toast 摘要一併帶（可選一致性）**

在 `bits` 摘要段（約 671-674 行）`if (roundIncome > 0) bits.push(...)` 之後加：

```ts
        if (houseIncome > 0) bits.push(`房產營收 +${houseIncome}`);
        if (spectraPoints > 0) bits.push(`卡點 +${spectraPoints}`);
```

- [ ] **Step 4: 驗證編譯 + 全測試**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 乾淨、全綠。

- [ ] **Step 5: 手動驗證（可選）**

讓某隊獨佔 SPECTRA 且持有 ≥1 級房，於 `/map` 擲骰前進結算 → 階段 2 面板出現「房產營收 +N」與「獨佔靈序：卡牌點數 +N點」列。

- [ ] **Step 6: Commit**

```bash
git add src/components/views/RealMapView.tsx
git commit -m "feat(map): show house income + spectra card points in settlement panel"
```

---

### Task 6: 獨佔效果 emoji 移出棋盤、文字標籤進投影 DominanceBadge（#4）

**Files:**
- Modify: `src/components/views/RealMapView.tsx`（`monopolyEffectEmoji` 約 47-55 行、棋盤徽章 span 約 918-927 行）
- Modify: `src/components/views/projection/ProjectionArenaDashboard.tsx`（`RegionArena` 約 439-443 行、`DominanceBadge` 約 511-546 行）

**Interfaces:**
- Consumes: `monopolyEffectText`（Task 2）、`RegionView.monopolyEffect`（既有）、`snap.settings`（既有）。

- [ ] **Step 1: 移除棋盤 emoji 徽章**

`src/components/views/RealMapView.tsx`：刪除棋盤上的獨佔 emoji span（約 918-927 行整段）：

```tsx
                {/* 獨佔效果 emoji 徽章：資產格且該區有任何獨佔（含自己）才顯示。*/}
                {!showOriginal && ri?.monopolyTeamId != null && (
                  <span
                    className="pointer-events-none absolute bottom-0 left-1/2 z-10 -translate-x-1/2 leading-none"
                    style={{ fontSize: "1.8cqmin" }}
                    title={monopolyEffectEmoji(ri.monopolyEffect)}
                  >
                    {monopolyEffectEmoji(ri.monopolyEffect)}
                  </span>
                )}
```

- [ ] **Step 2: 移除不再使用的 `monopolyEffectEmoji` 函式**

刪除 `src/components/views/RealMapView.tsx` 約 47-55 行的整個 `monopolyEffectEmoji` 函式與其上註解。若 `MonopolyEffect` 型別 import（約 44 行）在本檔已無其他使用則一併移除該 import（先 grep 確認：`MonopolyEffect` 在檔內是否還有用）。

- [ ] **Step 3: 驗證棋盤編譯**

Run: `npx tsc --noEmit`
Expected: 乾淨（若 `MonopolyEffect` 變成未使用 import 會報錯 → 移除該 import）。

- [ ] **Step 4: 投影 DominanceBadge 收 effect + settings 並顯示文字**

`src/components/views/projection/ProjectionArenaDashboard.tsx`：頂部 `@/lib/game` import（約 17 行）加 `REGION_MONOPOLY_EFFECT`、`monopolyEffectText`、型別 `MonopolyEffect`：

```tsx
import { REGIONS, REGION_UI, REGION_MONOPOLY_EFFECT, monopolyEffectText, type MonopolyEffect, type RegionCode } from "@/lib/game";
```

`RegionArena` 內呼叫 `DominanceBadge`（約 439-443 行）改為傳入 effect 與 settings：

```tsx
              <DominanceBadge
                teamName={regionState?.monopolyTeamName ?? null}
                toll={regionState?.toll ?? 0}
                effect={REGION_MONOPOLY_EFFECT[region.code]}
                settings={snap.settings}
                accentClass={ui.text}
              />
```

`DominanceBadge` 定義（約 511-546 行）改簽名並在有獨佔時多顯示一行純文字效果：

```tsx
function DominanceBadge({
  teamName,
  toll,
  effect,
  settings,
  accentClass,
}: {
  teamName: string | null;
  toll: number;
  effect: MonopolyEffect;
  settings: { auroraMultiplier: number; spectraCardPoints: number };
  accentClass: string;
}) {
  if (!teamName) {
    return (
      <div className="shrink-0 rounded-xl border border-white/10 bg-black/20 px-3 py-1.5 text-right">
        <div className="text-[0.6rem] font-black tracking-[0.18em] text-slate-500">
          區域狀態
        </div>
        <div className="text-xs font-bold text-slate-300">競逐中</div>
      </div>
    );
  }

  return (
    <div className="projection-dominance-badge shrink-0 rounded-xl border px-3 py-1.5 text-right">
      <div className="flex items-center justify-end gap-1.5">
        <Crown className={`h-4 w-4 ${accentClass}`} />
        <span className="text-sm font-black text-white">{teamName} 獨佔</span>
      </div>
      <div className="mt-0.5 text-[0.65rem] font-bold text-slate-300">
        過路費{" "}
        <AnimatedNum
          value={toll}
          className={`ml-1 text-base font-black ${accentClass}`}
        />
      </div>
      <div className={`mt-0.5 text-[0.65rem] font-black ${accentClass}`}>
        {monopolyEffectText(effect, settings)}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: 驗證編譯 + 全測試**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 乾淨、全綠。

- [ ] **Step 6: 手動驗證（可選）**

`/map` 棋盤資產格不再有 💰🃏🏗📈；`/projection` 已獨佔區的獨佔卡片顯示「光幣 ×1.5 / 每回合 +10 卡點 / 升級加速 / 不動產增值」純文字。

- [ ] **Step 7: Commit**

```bash
git add src/components/views/RealMapView.tsx src/components/views/projection/ProjectionArenaDashboard.tsx
git commit -m "feat: move monopoly-effect indicator from board emoji to projection text label"
```

---

### Task 7: HAVEN 買地時 flush（不回溯套到新買地）（#3）

**Files:**
- Modify: `src/lib/service.ts`（`buyProperty` 約 343-382 行）

**Interfaces:**
- Consumes: 既有 `flushHavenAppreciation(tx, state, now)`（約 1471 行，會把當前 HAVEN 獨佔隊漲幅併入其所有房 `monopolyBonusMult` 並重設 `monopolySince[HAVEN]=now`）、`teamMonopolizesRegion`、`getState`。

- [ ] **Step 1: 確認 flush 語義**

閱讀 `src/lib/service.ts` 的 `flushHavenAppreciation`（約 1471-1487 行），確認：(a) 只作用於「當前 HAVEN 獨佔隊」已持有的房；(b) 一定重設 `monopolySince[HAVEN]=now`（含 mult≤1 情形）。此為插入 flush 的前提。

- [ ] **Step 2: 買地流程插入 flush（設 owner 之前）**

在 `buyProperty`（約 350-364 行）中，於扣款後、設定新地 owner（`await tx.property.update({ ... ownerTeamId: teamId, level: newLevel })`，約 364 行）**之前**加入：若買方為 HAVEN 獨佔隊則先 flush。改動段落：

原（約 360-364 行）：

```ts
    if (team.coins < price) throw new Error("光幣不足");
    await tx.team.update({ where: { id: teamId }, data: { coins: { decrement: price } } });
    const emberBoost = await teamMonopolizesRegion(tx, teamId, "EMBER");
    const newLevel = emberBoost ? 1 : 0;
    await tx.property.update({ where: { id: propertyId }, data: { ownerTeamId: teamId, level: newLevel } });
```

改為：

```ts
    if (team.coins < price) throw new Error("光幣不足");
    await tx.team.update({ where: { id: teamId }, data: { coins: { decrement: price } } });
    // HAVEN flush-on-buy：買方若為 HAVEN 獨佔隊，先把既有房的即時漲幅鎖進 monopolyBonusMult
    // 並重設 monopolySince=now，避免新買的地回溯套到已累積的漲幅（新地從 1.0× 起算）。
    // 必須在設定新地 owner 之前，否則新地會被含進 flush 迴圈。
    if (await teamMonopolizesRegion(tx, teamId, "HAVEN")) {
      await flushHavenAppreciation(tx, state, Date.now());
    }
    const emberBoost = await teamMonopolizesRegion(tx, teamId, "EMBER");
    const newLevel = emberBoost ? 1 : 0;
    await tx.property.update({ where: { id: propertyId }, data: { ownerTeamId: teamId, level: newLevel } });
```

（`state` 已於約 354 行 `const state = await getState(tx)` 取得；`flushHavenAppreciation` 為本檔既有函式，無需 import。）

- [ ] **Step 3: 驗證編譯**

Run: `npx tsc --noEmit`
Expected: 乾淨。

- [ ] **Step 4: 全測試**

Run: `npx vitest run`
Expected: 全綠。

- [ ] **Step 5: 手動驗證（需 dev server + DB）**

情境：讓 A 隊獨佔 HAVEN，等即時漲幅明顯（或把 `havenApprIntervalMs` 調小）；記下既有房現值。A 隊買一塊新地 → 新地 `monopolyBonusMult` 應為 1（現值＝當下市場價，無回溯漲幅），既有房漲幅已鎖進不減；此後所有房從買地時刻一起重新累積即時漲幅。

- [ ] **Step 6: Commit**

```bash
git add src/lib/service.ts
git commit -m "fix(service): flush HAVEN appreciation on buy so new property doesn't inherit past gains"
```

---

### Task 8: 賣回值顯示一致性 — ExchangeView 有主頭條改 investedValue（#7 交易所）

**Files:**
- Modify: `src/components/views/ExchangeView.tsx`（不動產卡頭條約 153-156 行）

**Interfaces:**
- Consumes: `PropView.investedValue` / `currentValue` / `basePrice`（既有）。

- [ ] **Step 1: 有主頭條改用 investedValue**

`src/components/views/ExchangeView.tsx` 卡片右上頭條（約 153-156 行）：

原：

```tsx
                    <div className="shrink-0 text-right leading-tight">
                      <PriceTag current={p.currentValue} base={p.basePrice} />
                      <div className="text-[11px] text-slate-500">初始 <Num>{p.basePrice}</Num></div>
                    </div>
```

改為（有主：顯示 investedValue＝賣回值，標「持有現值」；無主：維持 currentValue＝買價）：

```tsx
                    <div className="shrink-0 text-right leading-tight">
                      {p.ownerTeamId != null ? (
                        <>
                          <PriceTag current={roundTo10(p.investedValue)} base={p.basePrice} />
                          <div className="text-[11px] text-slate-500">持有現值・賣回值</div>
                        </>
                      ) : (
                        <>
                          <PriceTag current={p.currentValue} base={p.basePrice} />
                          <div className="text-[11px] text-slate-500">初始 <Num>{p.basePrice}</Num></div>
                        </>
                      )}
                    </div>
```

（`roundTo10` 已於第 7 行 import；`Num` 已 import。）

- [ ] **Step 2: 驗證編譯 + 全測試**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 乾淨、全綠。

- [ ] **Step 3: 手動驗證（可選）**

`/exchange` 選一塊已升級的有主地：頭條數字＝賣回鈕的「+N」數字一致（顯示＝賣掉能拿到）。無主地頭條維持現價（買價）。

- [ ] **Step 4: Commit**

```bash
git add src/components/views/ExchangeView.tsx
git commit -m "fix(exchange): owned property headline shows investedValue (= sell-back value)"
```

---

### Task 9: 投影物件格顯示 investedValue（大）+ currentValue（小）（#7 投影）

**Files:**
- Modify: `src/components/views/projection/ProjectionArenaDashboard.tsx`（物件格價格約 495-499 行）

**Interfaces:**
- Consumes: `PropertyView.investedValue` / `currentValue` / `basePrice`（既有，見 `PropertyView` 型別 snapshot）。

- [ ] **Step 1: 有主格顯示雙值**

`src/components/views/projection/ProjectionArenaDashboard.tsx` 物件格價格（約 495-499 行）：

原：

```tsx
                    <PriceTag
                      current={property.currentValue}
                      base={property.basePrice}
                      className="block w-full text-right text-base font-black leading-none tabular-nums"
                    />
```

改為（有主：investedValue 大字＋ currentValue 小字；無主：只 currentValue 大字，因 level0 兩者相等）：

```tsx
                    {property.ownerTeamId != null ? (
                      <div className="w-full text-right leading-none">
                        <PriceTag
                          current={property.investedValue}
                          base={property.basePrice}
                          className="block text-base font-black tabular-nums"
                        />
                        <span className="mt-0.5 block text-[0.6rem] font-bold tabular-nums text-slate-500">
                          現價 {property.currentValue}
                        </span>
                      </div>
                    ) : (
                      <PriceTag
                        current={property.currentValue}
                        base={property.basePrice}
                        className="block w-full text-right text-base font-black leading-none tabular-nums"
                      />
                    )}
```

- [ ] **Step 2: 驗證編譯 + 全測試**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 乾淨、全綠。

- [ ] **Step 3: 手動驗證（可選）**

`/projection` 已升級的有主地：大字＝投入本金現值（＝交易所賣回值），下方小字「現價 N」＝空地市場價；無主地維持單一現價大字。

- [ ] **Step 4: Commit**

```bash
git add src/components/views/projection/ProjectionArenaDashboard.tsx
git commit -m "feat(projection): show investedValue (large) + currentValue (small) for owned properties"
```

---

## Self-Review

**Spec coverage：**
- #1（EMBER→Exchange、AURORA→Mobile+Map 徽章）→ Task 1（snapshot 欄位）+ Task 2（元件/文字）+ Task 3（三頁掛載）。✓
- #2（SPECTRA 卡點入結算面板）→ Task 4（回傳）+ Task 5（面板列）。✓
- #3（HAVEN flush-on-buy）→ Task 7。✓
- #4（emoji 移出棋盤、文字進投影）→ Task 6。✓
- #5（房收入結算面板）→ Task 4（回傳）+ Task 5（面板列）。✓
- #6（市場卡投影動畫）→ 暫緩，spec 已註明，無 task。✓（刻意不涵蓋）
- #7（賣回值顯示：Exchange 有主頭條 investedValue、投影雙值）→ Task 8 + Task 9。✓

**Placeholder scan：** 無 TBD/TODO；每個改碼步驟皆有完整程式碼與確切檔案/行號區間。✓

**Type consistency：**
- `monopolyEffectText(effect, { auroraMultiplier, spectraCardPoints })` 於 Task 2 定義，Task 2（MonopolyBadges）、Task 6（DominanceBadge）一致使用。✓
- `MonopolyBadges({ regions, effects, settings })` 於 Task 2 定義，Task 3 三處呼叫簽名一致（`regions` / `effects` / `settings`）。✓
- `TeamView.monopolyRegions: RegionCode[]` Task 1 定義，Task 3 消費。✓
- `distributeRoundIncome` 回傳 `houseIncome` / `cardPoints` Task 4 定義，Task 5 以 `s.houseIncome` / `s.cardPoints` 消費（命名一致）。✓
- `DominanceBadge` 新增 `effect` / `settings` 參數，Task 6 內定義與呼叫一致。✓
- `flushHavenAppreciation(tx, state, now)` 既有簽名，Task 7 依此呼叫。✓
