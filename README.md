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
| 交易所 EXCHANGE | `/exchange` | 買/升級/過戶不動產、收過路費（系統算）、沖銷 |
| 地圖關主 MAP | `/map` | 光幣/點數獎懲、燈塔/契約快捷、命運投資輪盤 |
| 流動關主 MOBILE | `/mobile` | 發獎勵、計時器、抽題/看答案 |
| 卡牌商店 CARDSHOP | `/shop` | 展示 3 張、售卡扣點、兌換券抽卡、庫存 |
| 大樂透 LOTTERY | `/lottery` | 1–50 登記、加購費、獎金池、開獎 |
| 主持人 HOST | `/host` | 階段控制、觸發 4 次市場事件、最終結算排名 |
| Admin ADMIN | `/admin` | 總覽 + 直接改各隊/不動產/卡牌數值（賽前平衡）、看所有關主頁、總帳沖銷 |
| 小隊 TEAM | `/team` | 唯讀自己隊伍：光幣、卡牌點數、不動產、大樂透號碼 |

## 已實作的規則重點

- **不動產**：初始價採四區域表；升級 base×20/40/60% 四捨五入 50；最高 3 級。
- **過路費**：該區獨佔隊伍（最多三級→總持有數）現值總和 ×10%，四捨五入 50；踩自己獨佔區免收。
- **市場事件**：四次事件的區域/類型倍率自動套用到現價；事件四「跌最多區」由主持人選定。
- **大樂透**：號碼全期唯一；加購費 50×2^(n-1)；每次登記獎金池 +100、加購費入池；中獎得整池後重設。
- **結算**：總資產 = 現金光幣 + 不動產最終市值（**不含動產**）。
- **稽核**：每筆數值變動寫入 Ledger，可在交易所/Admin 一鍵沖銷修正。

## 不在系統內（依規劃，現場手動）

動產、骰子（普通/特殊）、骰子兌換券、光靈附身、情報牌真假、拍賣中心競標。
（功能卡效果如購地/拆屋等涉及資產者，仍由交易所執行登記。）

## 部署（雲端）

建議 Vercel + 雲端 Postgres（Neon/Supabase）：
1. `prisma/schema.prisma` 的 `datasource provider` 改 `postgresql`。
2. 設環境變數 `DATABASE_URL`（Postgres 連線字串）。
3. `npm run db:push` → `BASE_URL=https://你的網址 npm run seed`。
4. 部署。所有人連同一個網址即可。
