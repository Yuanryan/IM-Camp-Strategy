# 不動產進階系統 — 前端顯示修正 — 設計文件

日期：2026-07-01
專案：IM 大富翁：迷霧資本戰（`策略系統/web/`）
關聯：接續 [`2026-07-01-property-advanced-system-design.md`](./2026-07-01-property-advanced-system-design.md)。該文件的後端 API 大致完成，本文件處理「前端不清楚 / 顯示缺漏」的六項修正 + 一項後端時機調整。

## 背景

進階不動產系統的後端已上線，但多項效果在前端頁面看不到或不清楚。使用者列出 7 點，本設計採納其中 6 點（第 6 點市場卡投影動畫暫緩）。

---

## 修正清單

### #1 — AURORA / EMBER 獨佔被動的頁面指示徽章

**snapshot 補一欄**：獨佔區資料目前在 snapshot 內部算成 `monopolyByTeam`（[snapshot.ts:306-310](../../../src/lib/snapshot.ts)）但只餵給 objectives，`TeamView` 未曝露。`TeamView` 加一欄 `monopolyRegions: RegionCode[]`（直接塞 `monopolyByTeam.get(t.id) ?? []`），三頁即可用 `team.monopolyRegions` 判定，不需各頁自 `snap.regions` 推。目前僅在地圖 / 投影以整區維度顯示，玩家在實際受影響的頁面看不到「我這隊有這個加成」。

依效果實際生效的頁面放徽章（比照動產 item badge 的視覺）：

| 效果 | 徽章文字 | 放置頁面 | 理由 |
|---|---|---|---|
| EMBER `UPGRADE_BOOST` | 「EMBER 升級加速」 | **ExchangeView** | 買地落在 level 1、升級 +2，效果在交易所買/升時觸發 |
| AURORA `COIN_1_5X` | 「AURORA 光幣 ×1.5」 | **MobileView**（小隊自己的頁）+ **MapView**（過路費/結算面板） | 光幣收入加成，玩家在自己頁與結算時關心 |

- 判定：`team.monopolyRegions.includes("EMBER" / "AURORA")`。
- 純前端；無 snapshot / 後端更動。
- ExchangeView 的 EMBER 徽章掛在「選定隊（買方 / 升級持有隊）」的脈絡上；未選隊時不顯示。
- MapView 徽章掛在結算 / 過路費面板該隊區塊；MobileView 掛在該隊自己頁的狀態列。

### #2 + #5 — SPECTRA 卡牌點數 & 房產營收顯示於結算面板

後端 `distributeRoundIncome`（[service.ts](../../../src/lib/service.ts)）已計算並入帳：
- `houseTotal`（房產營收，寫 `kind:"coins"` note「房產營收」）
- `spectraCardPoints`（寫 `kind:"cardPoints"` note「獨佔靈序：卡牌點數」）

但函式回傳的 `results: { teamId, income }[]` 只含**動產**每輪收益（`payout`），房收與卡點沒有回傳 → 前端結算面板（RealMapView）看不到。

**後端**：`distributeRoundIncome` 回傳值加上該隊的 `houseIncome`（光幣）與 `cardPoints`（本次結算的 SPECTRA 卡點）。因為此函式一次只結算單一 `teamId`，回傳結構加兩個純量欄位即可：

```ts
return { ok: true, results, remindersTicked, houseIncome: houseTotal, cardPoints: spectraGranted };
```
（`spectraGranted` = 有獨佔 SPECTRA 時 = `state.spectraCardPoints`，否則 0。）

**API route**（`/api/host/round-income`）：`distributeRoundIncome` 回傳整包直接傳出，前端取用新欄位。

**前端**（RealMapView 結算面板，見 [RealMapView.tsx:558-660](../../../src/components/views/RealMapView.tsx)）：
- 取 `s.houseIncome` / `s.cardPoints`（單一隊結算，直接用純量，不需 reduce）。
- 房收 > 0 → 新增一列 `MoneyRow { label: "房產營收", amount: houseIncome }`。
- 卡點 > 0 → 新增一列 `MoneyRow { label: "獨佔靈序：卡牌點數", cardPoints }`（`MoneyRow` 已支援 `cardPoints` 欄位，比照通過起點收益列）。
- 這兩列與現有「回合收益」列並列於階段 2 結算面板。

### #3 — HAVEN 慢慢漲：買地時 flush（不回溯套到新買的地）

**現況問題**：`havenLiveMult` 依單一 `monopolySince[HAVEN]` 時間戳，對該隊**所有**不動產一律套用。若隊已獨佔 HAVEN 30 分鐘（即時漲幅 ×1.30），此時買新地，新地讀值立刻套上 ×1.30 —— 相當於把 30 分鐘漲幅回溯給剛買的地。

**採用方案：flush-on-buy（快照基準線）**。在 `buyProperty` 內，若**買方**為 HAVEN 獨佔隊：
1. 先 `flushHavenAppreciation(tx, state, now)`：把當前 `havenLiveMult` 併入該隊每棟既有房的 `monopolyBonusMult`（既有漲幅永久鎖定、保留）。
2. flush 內部會把 `monopolySince[HAVEN]` 重設為 `now`（即時層歸零）。
3. 再執行買地（新地 `monopolyBonusMult` 預設 1）。

結果：買地當下，既有房的漲幅鎖定不損失；之後所有房（含新買的）從 `now` 一起重新累積即時漲幅。新地不再回溯拿到 30 分鐘漲幅。

**時機細節**：flush 必須在把新地 owner 設為買方**之前**（否則新地會被含進 flush 迴圈、拿到不屬於它的鎖定漲幅）。順序：判定買方是否獨佔 HAVEN → flush（僅既有房）→ 設定新地 owner → `reconcileMonopolySince`。

**注意**：需確認 `flushHavenAppreciation` 只作用於「當前 HAVEN 獨佔隊已持有」的房，且會重設 `monopolySince`。實作時讀現有 `flushHavenAppreciation` / `reconcileMonopolySince`（[service.ts:1463 附近](../../../src/lib/service.ts)）確認語義，若 flush 未重設 `monopolySince` 則於買地流程顯式重設。

### #4 — 獨佔被動效果：移出地圖棋盤、移入投影（不用 emoji）

**現況**：RealMapView 棋盤資產格顯示獨佔效果 emoji 徽章（[RealMapView.tsx:918-927](../../../src/components/views/RealMapView.tsx)，`monopolyEffectEmoji`）。

**改動**：
- **移除**棋盤上的 emoji 徽章（刪除 RealMapView 該 `<span>` 與 `monopolyEffectEmoji` 函式）。棋盤保留獨佔環色 + 過路費標，不再有效果 emoji。
- **新增**至投影 `DominanceBadge`（[ProjectionArenaDashboard.tsx:511-546](../../../src/components/views/projection/ProjectionArenaDashboard.tsx)）：獨佔隊名 + 過路費之下，加一行**純文字**效果標籤，無 emoji：
  - `COIN_1_5X` → 「光幣 ×1.5」（用 `snap.settings.auroraMultiplier` 動態顯示）
  - `CARD_POINTS` → 「每回合 +{spectraCardPoints} 卡點」
  - `UPGRADE_BOOST` → 「升級加速」
  - `APPRECIATION` → 「不動產增值」
- 標籤文字集中一個純函式（例如 `monopolyEffectText(effect, settings)`）供投影用；比照現有 MapView 的 `monopolyEffectLabel` 但去掉 emoji（MapView 那份若也要去 emoji 視情況一併處理，但本次僅需求投影，MapView 現況維持）。
- `DominanceBadge` 需多收 `effect` + `settings` 參數；`RegionArena` 傳入 `regionState.monopolyEffect` 與 `snap.settings`。

### #6 — 市場卡投影數字動畫 —— 本次暫緩

使用者指示 leave 6 for now，不做。

### #7 — 賣回交易所價值的顯示一致性（數值正確，僅修 UI）

**釐清**：賣回金額本身**正確**。以 管圖實驗室（base 700）為例：
- `currentValue` = base × 市場倍率（事件/卡牌/HAVEN）＝ 例如 910（700 × 1.3）。買價 & 現值頭條用此。
- `investedValue` = base × `investedPrincipalMult(level)` × 市場倍率。level 3 時 principalMult = 2.2 → 700 × 2.2 × 1.3 ≈ 2000。賣回 & 結算淨值用此。
- 差異＝「升級投入的本金」：`currentValue` 是空地現值，`investedValue` 是這棟已開發不動產的投入本金以今日市場計價。兩者皆正確、是不同概念。

**buy→upgrade→haunt→sell 一致性驗證**（無事件）：
- buy lvl0：付 700。
- upgrade→lvl3：付 140+280+420=840，累計投入 1540＝ `investedValue`（700×2.2×1）。
- 鬧鬼卡：`cardBuildingMult ×= 0.75` → `investedValue` = 700×2.2×0.75 = 1155 → 取整 1150。
- 賣回：payout = `roundTo10(investedValue)` = 1150。詛咒吃在全額本金上，符合設計。

**問題在 UI**：Exchange 卡片頭條顯示 `currentValue`（910），賣回鈕卻付 `investedValue`（2000），看起來「賣得比它值的多」。投影也只顯示 `currentValue`。修法＝讓「顯示的值＝賣掉能拿到的值」。

**ExchangeView**（[ExchangeView.tsx:154, 196](../../../src/components/views/ExchangeView.tsx)）：
- **已售出（有主）** 不動產：頭條 `PriceTag` 改用 `investedValue`（＝賣回金額），標籤「持有現值」；「初始 {basePrice}」維持為次要脈絡。賣回鈕金額（已是 `roundTo10(investedValue)`）與頭條一致 → 顯示＝賣掉能拿到。
- **未售出** 空地：維持 `currentValue`（買價），標「現價」。買價流程不變。

**ProjectionView 物件格**（[ProjectionArenaDashboard.tsx:495-499](../../../src/components/views/projection/ProjectionArenaDashboard.tsx)）：**兩者都顯示**。
- **有主**：`investedValue` 為大字頭條（該隊投入 / 可賣回值）＋ `currentValue` 小字置於其下（空地現價 / 市場行情）。
- **無主**：level 0 時 `investedValue == currentValue`，自然收斂成單一數字（維持顯示 `currentValue` 大字即可，不另列小字）。
- `PropertyView` 已含 `currentValue` 與 `investedValue`，無 snapshot 更動。

---

## 影響範圍

**後端（service.ts）**：
- `buyProperty`：HAVEN 買方 flush-on-buy（#3）。
- `distributeRoundIncome`：回傳加 `houseIncome` + `cardPoints`（#2/#5）。

**API**：`/api/host/round-income` 傳出新回傳欄位（若非結構化透傳則補上）。

**前端**：
- ExchangeView：EMBER 徽章（#1）、有主頭條改 `investedValue`（#7）。
- MapView：AURORA 徽章（#1）。
- MobileView：AURORA 徽章（#1）。
- RealMapView：移除獨佔 emoji（#4）、結算面板加房收 + 卡點列（#2/#5）。
- ProjectionArenaDashboard：`DominanceBadge` 加文字效果標籤（#4）、物件格 invested 大 + current 小（#7）。

**無 schema / migration 更動**：全部沿用既有欄位與 snapshot。

---

## 測試 / 驗證

- 純函式：無新增純函式（房收 / investedValue 公式既有且已測）。#3 flush 若抽 helper 則補單元測試。
- `distributeRoundIncome` 回傳新欄位：補 / 更新既有 service 測試斷言 `houseIncome` / `cardPoints`。
- #3：測「HAVEN 獨佔隊買新地 → 新地 monopolyBonusMult == 1、既有房漲幅已鎖進 monopolyBonusMult、monopolySince[HAVEN] 重設」。
- 驗證：`npx tsc --noEmit` 乾淨、`npx vitest run` 全綠、現有測試不退。
- 手動：投影看獨佔文字標籤與 invested/current 雙值；地圖棋盤無 emoji；交易所有主卡頭條＝賣回值；結算面板出現房收 + 卡點列；HAVEN 買地不回溯。

## 設計決策摘要（來自 brainstorming）

- #1：EMBER→交易所、AURORA→小隊頁+地圖；比照 item badge。
- #3：flush-on-buy（既有漲幅鎖定保留、即時層歸零重算，新地不回溯）。
- #4：emoji 移出棋盤，純文字標籤進投影 DominanceBadge。
- #6：暫緩。
- #7：賣回值本就正確；交易所有主頭條改 investedValue、投影同格顯示 invested（大）+ current（小）。
