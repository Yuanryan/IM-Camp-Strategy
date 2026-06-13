# IM 大富翁：迷霧資本戰 — 即時策略系統

一夜性活動用的線上系統。各關主站別各自登記、投影即時顯示全場、隊輔/隊員唯讀查看自己隊伍。
技術：Next.js 16（App Router）+ Prisma + SQLite。登入採「角色 QR / token 連結」，免帳號密碼。

## 安裝與啟動（本機）

```bash
cd web
npm install
npm run db:generate     # 產生 Prisma client（src/generated/prisma）
npm run db:push         # 建立 SQLite 資料表（dev.db）
npm run seed            # 建立不動產/小隊/Token，並產生 qr-codes.html
npm run dev             # http://localhost:3000
```

啟動後，用瀏覽器打開 `web/qr-codes.html`，裡面是每個站別 / 小隊的登入 QR 與連結。
掃描或點連結即自動登入對應角色（httpOnly cookie，12 小時內免再登入）。

## 賽前要填的設定（`prisma/seed.ts` 最上方）

- `TEAM_COUNT`：小隊數量（預設 6）
- `STARTING_COINS` / `STARTING_CARD_POINTS`：各隊初始光幣 / 卡牌點數（預設 0）
- `STATION_COUNTS`：各角色站別數量（主持1、交易所2、地圖3、流動6、卡牌1、大樂透1、投影1、Admin1）
- `BASE_URL`：QR 連結網址。本機預設 `http://localhost:3000`；
  部署後設環境變數再重跑 seed：`BASE_URL=https://你的網址 npm run seed`

> 改完設定後重跑 `npm run seed` 會**清空並重建**資料（含重新產生 token / QR），請於正式開始前定版。

## 角色與權限

| 角色 | 路徑 | 能做的事 |
| --- | --- | --- |
| 投影 PROJECTION | `/projection` | 唯讀大螢幕：資產排行、大樂透、各區獨佔/過路費、不動產現價地圖 |
| 交易所 EXCHANGE | `/exchange` | 買/升級/過戶不動產、收過路費（系統算）、隊間交易、沖銷 |
| 地圖關主 MAP | `/map` | 光幣/點數獎懲、燈塔/契約快捷、命運投資輪盤、每輪收益結算 |
| 流動關主 MOBILE | `/mobile` | 發獎勵、發動產、計時器、抽題/看答案 |
| 卡牌商店 CARDSHOP | `/shop` | 展示 3 張、售卡扣點、兌換券抽卡、庫存 |
| 大樂透 LOTTERY | `/lottery` | 1–50 登記、加購費、獎金池、開獎 |
| 拍賣官 AUCTION | `/auction` | 主持喊價式英式拍賣：建場/出品（自訂/動產/不動產）、加價、落槌扣款、流標、撤銷 |
| 主持人 HOST | `/host` | 階段控制、觸發 4 次市場事件、最終結算排名 |
| Admin ADMIN | `/admin` | 總覽 + 直接改各隊/不動產/卡牌數值（賽前平衡）、看所有關主頁、總帳沖銷 |
| 小隊 TEAM | `/team` | 唯讀自己隊伍：光幣、卡牌點數、不動產、大樂透號碼 |

## 已實作的規則重點

- **不動產**：初始價採四區域表；升級費用依事件後市值 ×20/40/60% 四捨五入 50；最高 3 級。
- **過路費**：該區獨佔隊伍（最多三級→總持有數）現值總和 ×10%，四捨五入 50；踩自己獨佔區免收。
- **市場事件**：四次事件的區域/類型倍率自動套用到現價與買賣費用；事件四「跌最多區」由主持人選定。
- **大樂透**：號碼全期唯一；加購費 50×2^(n-1)；每次登記獎金池 +100、加購費入池；中獎得整池後重設。
- **隊間交易**：由交易所登記雙方同意的交換（光幣/卡牌點數/不動產/動產），系統原子過戶並寫帳；對方可接受/拒絕，含成功/拒絕/取消動畫。
- **拍賣**：主持喊價式英式拍賣，全場一次一件 LIVE；小隊現場喊價、拍賣官按鈕加價、點選得標隊落槌，自動扣款並過戶（動產/不動產），可流標或撤銷退款。公告橫幅同步顯示於小隊頁與投影。
- **每輪收益**：地圖關主逐隊觸發；結算持有的每輪收益類動產（固定收益/複利/不動產分紅/末位補貼）並消耗有次數的提醒道具，未結算前該隊操作卡上鎖。
- **結算**：總資產 = 現金光幣 + 不動產最終市值（動產秘密幣值另由 Admin 秘密帳本揭露）。
- **稽核**：每筆數值變動寫入 Ledger，可在交易所/Admin 一鍵沖銷修正。

## 動產（MovableAsset）被動效果系統

動產為 S / A / B 三個等級的被動道具。持有者不需操作，系統自動套用效果。每張道具有**隱藏幣值**（秘密帳本，結算時才揭露）。

### 效果種類

| effectType | 中文 | 觸發時機 | 說明 |
| --- | --- | --- | --- |
| TOLL_INCOME | 收路費加成 | 收取過路費時 | 過路費基數 × (1 + delta) |
| TOLL_PAID | 付路費減免 | 支付過路費時 | 過路費基數 × (1 + delta)，負值為減免 |
| SHOP_PRICE | 購買折扣 | 購買或升級不動產時 | 費用 × (1 + delta)，負值為折扣 |
| PROPERTY_VALUE | 不動產增值 | Snapshot 計算 | 持有不動產顯示淨值加成（不影響過路費計算） |
| COINS_PER_ROUND | 每輪收益 | 主持人觸發每輪收益 | 固定光幣收益（effectValue 即光幣數） |
| COMPOUND_INTEREST | 複利收益 | 主持人觸發每輪收益 | 賺取現有光幣 effectValue% |
| PROPERTY_DIVIDEND | 不動產分紅 | 主持人觸發每輪收益 | 賺取不動產現值 effectValue% |
| UNDERDOG | 末位補貼 | 主持人觸發每輪收益 | 淨資產末位時獲得 effectValue 光幣 |
| TAX_COLLECTOR | 全場稅收 | 任意過路費發生時 | 從銀行獲得 effectValue% 過路費（不影響付/收款方） |
| PIRACY | 俠盜印記 | 被標記隊收過路費時 | 對一支敵方隊伍施加懸賞標記（選定後不可更改）。當該隊伍收取過路費時，從中抽取 effectValue% 的光幣。若目標持有的光幣少於我方，則此效果不生效。 |
| GOOD_CARD_BONUS | 好運卡加成 | 抽好運卡結算時 | 獎勵光幣 × (1 + delta) |
| BAD_CARD_REDUCE | 厄運卡減免 | 抽厄運卡結算時 | 懲罰光幣 × (1 + delta)，-1.0 = 完全免疫 |
| WHEEL_BONUS | 輪盤加成 | 輪盤淨獲利為正時 | 獲利 × (1 + delta)，虧損不放大 |
| WHEEL_NO_ZERO | 輪盤保底 | 輪盤轉動時 | 排除 ×0 結果 |
| WHEEL_STAKE_BOOST | 輪盤上限提升 | 輪盤投入上限計算 | 上限從 10% 提升至 (10 + effectValue×100)% |
| WHEEL_ON_GOOD_CARD | 好運卡輪盤 | 抽好運卡結算時 | 獎勵再乘以一次輪盤結果（大起大落） |
| LOTTERY_BONUS | 樂透加成 | 大樂透中獎時 | 中獎獎金 × (1 + delta) |
| JACKPOT_SHARE | 樂透抽成 | 任意隊大樂透中獎時 | 從銀行獲得 effectValue% 獎金池 |
| LOTTERY_INSURANCE | 樂透保險 | 本期大樂透未中獎時 | 退還本期所有登記費用（一次性） |
| DOUBLE_OR_NOTHING | 雙倍或歸零 | 流動關主發放光幣時 | 50% 機率雙倍，50% 機率歸零 |
| ALLIANCE_BONUS | 交易紅利 | 交易被接受時 | 雙方各獲 effectValue 光幣 |
| REMINDER | 提醒（無計算） | 無 | 僅在關主 UI 顯示提醒，不影響任何計算 |

### 效果疊加規則

同類效果**直接相加**（無遞減）：道具數量由關主發放端控管。

- 例：兩張 TOLL_INCOME +20% 與一張 +8% → 合計 +48%，基礎過路費 50 → 實收 74

### 效果次數

- `defaultUses = null`：永久，不消耗次數
- `defaultUses = N`：觸發 N 次後自動失效（usesRemaining 歸零後 active=false）
- 未觸發的條件效果（如 UNDERDOG 非末位時）不消耗次數

### Admin 管理

- **Admin 頁面**：授予道具、設定秘密幣值、過戶、手動失效
- **流動關主頁面**：可直接授予道具給小隊
- **交易所 / 地圖**：顯示當前選定小隊的相關動產徽章；效果值已自動反映於按鈕金額

## 不在系統內（依規劃，現場手動）

骰子（普通/特殊）、骰子兌換券、光靈附身、情報牌真假。
（功能卡效果如購地/拆屋等涉及資產者，仍由交易所執行登記。）
拍賣已內建於系統（拍賣官 `/auction`，現場喊價、拍賣官落槌）。

## 部署（雲端）

建議 Vercel + 雲端 Postgres（Neon/Supabase）：

1. `prisma/schema.prisma` 的 `datasource provider` 改 `postgresql`。
2. 設環境變數 `DATABASE_URL`（Postgres 連線字串）。
3. `npm run db:push` → `BASE_URL=https://你的網址 npm run seed`。
4. 部署。所有人連同一個網址即可。
