# 不動產進階系統 + 4 張市場卡 — 設計文件

日期：2026-07-01
專案：IM 大富翁：迷霧資本戰（`策略系統/web/`）

## 目標

在現有不動產系統上加入四組功能：

1. **不動產賣給交易所**（像賣股票一樣回收光幣）。
2. **四大區域獨佔被動效果**（每區專屬一個不同效果）。
3. **1/2/3 房被動營收**（升級房每回合發光幣）。
4. **4 張新市場卡**：紅卡（區漲）、黑卡（區跌）、鬧鬼卡（單棟跌）、土地公卡（單棟漲）。

所有關鍵數值都做成 admin 可調。

---

## 核心：價值疊乘鏈

現有系統有三個價值函式，各有用途。本設計在最底層 `currentValue` 加入新的永久倍率層，讓所有函式自動繼承。

```
currentValue = basePrice
             × 事件倍率              現有，可開關（EventDef.regionMult / typeMult / 事件四懲罰）
             × cardRegionMult        紅/黑卡・整區永久倍率（新）
             × cardBuildingMult      鬧鬼/土地公・單棟永久倍率（新）
             × monopolyBonusMult     HAVEN 獨佔・單棟永久漲幅（新，四時機鎖定）
             × havenLiveMult         HAVEN 即時未鎖定漲幅（新，不寫 DB，依 monopolySince 現算）

investedValue = basePrice × investedPrincipalMult(level) × 上述所有倍率   ← 賣價 & 結算淨值
leveledValue  = currentValue × (1 + LEVEL_VALUE_BONUS × level)           ← 過路費計價
```

- `cardRegionMult`、`cardBuildingMult`、`monopolyBonusMult` 三者**各自獨立疊乘**，互不干擾。
- `havenLiveMult` 是「本次獨佔至今、尚未鎖定」的即時漲幅；鎖定時併入 `monopolyBonusMult`。
- `currentValue`（含新倍率）自動流進 `investedValue`（含升級本金）與 `leveledValue`（過路費）。
- 事件層與卡牌層**獨立**：事件開關切換不影響卡牌造成的永久漲跌。

---

## 第 1 節：資料模型（Prisma schema）

無 migration 歷史，改完走 `npm run db:push`。重跑 seed 以 `skipDuplicates` 補新資料。

### Property 新增 3 欄

| 欄位 | 型別 | 用途 |
|---|---|---|
| `cardRegionMult` | `Float @default(1)` | 紅/黑卡的**整區**永久倍率（每張卡疊乘） |
| `cardBuildingMult` | `Float @default(1)` | 鬧鬼/土地公卡的**單棟**永久倍率 |
| `monopolyBonusMult` | `Float @default(1)` | HAVEN 獨佔慢慢漲鎖定後的**單棟**永久漲幅 |

### GameState 新增欄位

| 欄位 | 型別 | 用途 |
|---|---|---|
| `monopolySince` | `String @default("")` | CSV，每區「獨佔隊 + 起始時間戳」，格式 `HAVEN:12:1699999999999`（region:teamId:epochMs）。用於 HAVEN 依真實時間計算即時漲幅、偵測換人重置 |

Admin 可調參數（存 GameState 或 game.ts 常數 + GameState 覆寫；實作時統一放法見第 5 節）：
- `auroraMultiplier`（預設 1.5）
- `spectraCardPoints`（預設 10）
- `havenAppreciationIntervalMs`（預設 60000 = 1 分鐘）
- `havenAppreciationRate`（預設 0.01 = 1%）
- 房收費率 `houseIncomeRates`（預設 [0.03, 0.05, 0.08] 對應 1/2/3 級）
- 卡牌幅度 `cardRegionUpMult` / `cardRegionDownMult`（1.3 / 0.75）、`cardBuildingUpMult` / `cardBuildingDownMult`（1.3 / 0.75）

---

## 第 2 節：四大區域獨佔被動效果

### 獨佔判定（共用）

沿用現有過路費的判定邏輯（[service.ts](../../../src/lib/service.ts) 現行 `payToll` 內的獨佔判定）：
- 該區持有最多**三級房**的隊；
- 平手 → 比該區總持有數；
- 再平手 → 無人獨佔。

**重構**：把該段獨佔判定抽成共用純函式 `resolveMonopoly(regionProps): number | null`（放 game.ts），供過路費、四大被動、賣地全部共用，避免各寫一份漂移。

### 區域 ↔ 效果對應（依區域主題）

| 區域 | 主題 | 獨佔被動效果 |
|---|---|---|
| **AURORA** 極光金域 | 金融/商業/投資 | 光幣收益 ×1.5 |
| **SPECTRA** 靈序研究 | 研究/AI/資料 | 每回合 +10 卡牌點數 |
| **EMBER** 影焰工域 | 材料/製造/物流 | 全場升級加速 |
| **HAVEN** 晨霧棲城 | 住宅/教育/醫療 | 該隊全部不動產慢慢漲 |

隊伍可同時獨佔多區，各效果疊加。

### ① AURORA — 光幣收益 ×1.5

獨佔 AURORA 的隊，下列光幣**收入**套 ×1.5（預設 `auroraMultiplier`=1.5，admin 可調）：
- 過路費收入
- 1/2/3 房被動營收
- 每回合動產收益（COINS_PER_ROUND / COMPOUND_INTEREST / PROPERTY_DIVIDEND / UNDERDOG）
- 流動關發獎
- 好運卡獎勵、厄運卡（此處指厄運補償等入帳；純扣款不受影響）

**不套用**：大樂透中獎金、命運輪盤獲利、賣不動產回收金。

實作：抽 helper `applyAuroraBonus(tx, teamId, amount): number`，在各發錢點呼叫（先判定該隊是否獨佔 AURORA）。判定用 `resolveMonopoly`。

### ② SPECTRA — 每回合 +10 卡牌點數

合進現有 `distributeRoundIncome`：關主按「發放每輪收益」時，若該隊獨佔 SPECTRA，額外發 `spectraCardPoints`（預設 10）卡牌點數，記一筆 `kind:"cardPoints"` ledger。

### ③ EMBER — 全場升級加速（EMBER 賣點，刻意強）

獨佔 EMBER 的隊，在**任何區域**買地/升級都加速（不限 EMBER 區）：
- **買地**：`buyProperty` 時若買家獨佔 EMBER → 新地 `level` 直接設 1（而非 0），不額外收升級費。
- **升級**：`upgradeProperty` 時若屋主獨佔 EMBER → `level += 2`（上限 3），只收**一次**升級費（用當前 level 的費率）。

刻意較強：EMBER basePrice 最高、最難獨佔，強效果是合理報酬。

### ④ HAVEN — 該隊全部不動產慢慢漲

- **觸發**：獨佔 HAVEN 期間。
- **範圍**：該隊名下**所有**不動產（跨區，不限 HAVEN 區）。
- **漲法**：線性。`已獨佔時長 = now − monopolySince[HAVEN]`；`單位數 = floor(已獨佔時長 / havenAppreciationIntervalMs)`；`即時漲幅 havenLiveMult = 1 + 單位數 × havenAppreciationRate`。預設每 1 分鐘 +1% 線性 → 3 小時滿檔約 ×2.8。間隔與漲幅 admin 可調。
- **即時顯示**：讀現值時即時算 `havenLiveMult` 疊上去，玩家隨時看得到，無需關主按鈕。
- **永久鎖定（flush）**：把當前 `havenLiveMult` 併入該隊每棟的 `monopolyBonusMult`（`monopolyBonusMult ×= havenLiveMult`），並把 `monopolySince[HAVEN]` 重設為 now（即時層歸零重新累積）。鎖定時機共**四個**：
  1. 關主發每回合收益時（`distributeRoundIncome`）
  2. 獨佔換人時（偵測到 HAVEN 獨佔隊改變）
  3. 比賽結算時
  4. **賣不動產給交易所時**（賣前先 flush，確保回收金含漲幅）
- **失去獨佔**：已鎖進 `monopolyBonusMult` 的永久保留；即時層停止累積（因該隊不再是 HAVEN 獨佔隊）。

**monopolySince 維護**：任何會改變 HAVEN 持有/等級結構的操作（買地、升級、賣地、購地卡、換地、拆屋、怪獸、換屋等）後，重新 `resolveMonopoly(HAVEN)`：
- 若獨佔隊改變 → 先對舊獨佔隊 flush，再更新 `monopolySince[HAVEN]` 為新隊 + now（無人獨佔則清空該區條目）。

---

## 第 3 節：1/2/3 房被動營收（光幣）

合進現有 `distributeRoundIncome`（關主按「發放每輪收益」時一起結算）。

**公式**（每棟，屋主持有的 level ≥ 1 房）：
```
單棟每回合營收 = currentValue（含所有倍率）× 級別費率
級別費率（houseIncomeRates，admin 可調）：1級=3%、2級=5%、3級=8%
四捨五入到個位（不取整到 10）
level 0 不發
```

- 交互：若屋主獨佔 AURORA → 房收 ×1.5（走 `applyAuroraBonus`）。
- HAVEN 漲幅已含在 `currentValue`（透過 monopolyBonusMult + havenLiveMult），不需另外處理。
- 房收與動產每回合收益**分開累計、各記一筆 ledger**（note 區分「房產營收」vs「每輪動產收益」），方便玩家看懂。

---

## 第 4 節：不動產賣給交易所 + 4 張市場卡

### A. 賣不動產給交易所

新增 service `sellPropertyToExchange({ propertyId, byToken })`：
- 賣前先 flush HAVEN 漲幅（若該屋主是 HAVEN 獨佔隊）→ 確保 `monopolyBonusMult` 已含最新漲幅。
- 回收金 = `investedValue`（含買價 + 升級本金 × 事件 × 卡牌倍率 × HAVEN 漲幅），四捨五入到 10。
- 屋主 `coins += 回收金`，記 ledger。
- 該不動產變回無主：`ownerTeamId=null, level=0`。**倍率欄位全部保留不重置**（`cardRegionMult / cardBuildingMult / monopolyBonusMult` 跟著地走）：地的行情不因換手而重置，符合市場直覺，也防止「賣地洗掉黑卡/鬧鬼詛咒」。下一個買家買到含漲跌的地（買價 currentValue 也跟著高/低），HAVEN 漲出來的 monopolyBonusMult 視為該地既成行情由新買家繼承。
- **不套用** AURORA ×1.5。
- 賣地後重新維護 `monopolySince`（各區可能因此換獨佔隊）。
- 由 EXCHANGE 角色執行；回傳 UndoRecipe（含該不動產原狀態：owner/level/三個倍率）可撤銷。

API：`POST /api/exchange/sell-property`（或併入現有交易所 route），授權 EXCHANGE + ADMIN。

### B. 4 張新市場卡（神秘商店功能卡）

加入現有 `FUNCTION_CARDS`（用卡牌點數買、交易所執行、restock 回流、總供給不變）。

| 卡 | 效果 | 實作 |
|---|---|---|
| **紅卡** | 選一區 → 整區大漲 | 該區 8 棟（含無主）`cardRegionMult ×= cardRegionUpMult`（預設 1.3） |
| **黑卡** | 選一區 → 整區大跌 | 該區 8 棟（含無主）`cardRegionMult ×= cardRegionDownMult`（預設 0.75） |
| **鬧鬼卡** | 選一棟 → 該棟跌 | 單棟 `cardBuildingMult ×= cardBuildingDownMult`（預設 0.75） |
| **土地公卡** | 選一棟 → 該棟漲 | 單棟 `cardBuildingMult ×= cardBuildingUpMult`（預設 1.3） |

- 倍率永久疊乘、可互相抵消（黑卡後再紅卡 = ×0.975）。
- 幅度 admin 可調。企畫書意圖：「事件調更大、卡牌稍小」→ 卡牌用 ±30%/25%，並可（選擇性）把現有事件倍率調大一些。
- 四卡皆可自由選任意區/房，**含自己的**（紅卡/土地公拉抬自家、黑卡/鬧鬼打別人，不分敵我）。
- 由交易所執行（關主見證玩家出示卡），回傳 UndoRecipe（含受影響不動產的原倍率）可撤銷。
- restock 回流。

service：`applyRedCard/applyBlackCard({ region, byToken })`、`applyHauntCard/applyLandGodCard({ propertyId, byToken })`（或參數化成一支 `applyMarketCard`）。
API：併入現有交易所功能卡 route，授權 EXCHANGE + ADMIN。

---

## 第 5 節：實作注意事項

- **Next.js**：此版本有 breaking changes，寫前先讀 `node_modules/next/dist/docs/`（見 web/AGENTS.md）。
- **Admin 可調參數統一放法**：新增的可調數值存 GameState 欄位（沿用現有 admin 設定模式），game.ts 提供預設常數，snapshot 讀出供各頁使用；admin 頁加編輯 UI。
- **測試**：新增純函式（`resolveMonopoly`、HAVEN 漲幅計算、房收計算、賣價 = investedValue、四卡倍率疊乘）都寫 vitest 單元測試。現有 100 tests 須維持通過。
- **驗證**：`npx tsc --noEmit` 乾淨、`npx vitest run` 全綠。
- **UI 觸點**：
  - MapView/RealMapView：顯示各區獨佔隊 + 獨佔被動、HAVEN 即時漲幅。
  - ExchangeView：賣不動產按鈕、四張新市場卡執行 UI（含選區/選棟）。
  - ShopView：四張新功能卡上架。
  - AdminView：新可調參數編輯器。
  - 每回合結算結果顯示房收 + SPECTRA 卡牌點數 + HAVEN 鎖定漲幅。

## 設計決策摘要（來自 brainstorming）

- 賣價用 `investedValue`（升級本金拿得回來，與結算淨值口徑一致）。
- 獨佔判定沿用過路費那套，抽共用函式。
- 四效果各區專屬一個，非「獨佔任一區就全拿」。
- AURORA 1.5× 不含大樂透/輪盤/賣地。
- EMBER 全場加速，刻意強，作為 EMBER 賣點。
- HAVEN 漲該隊全部不動產、失去獨佔不消失、即時顯示 + 四時機鎖定、線性、admin 可調速率與間隔。
- 房收依現值百分比、四捨五入到個位、合進每回合結算。
- 卡牌倍率疊最底層 currentValue（連帶影響過路費/結算/賣價），可打自己、含無主地。
- 賣地給交易所後倍率全部保留（不重置）：地帶著行情換手，防止賣地洗掉 debuff。
