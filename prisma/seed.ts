process.env.TZ = "Asia/Taipei"; // GMT+8；必須在任何 Date 運算之前設定

import { PrismaClient } from "../src/generated/prisma";
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import QRCode from "qrcode";
import {
  PROPERTY_SEED,
  FUNCTION_CARDS,
  MOVABLE_ASSET_SEED,
  ITEM_GRADE_PRICE,
  DEFAULT_SHOP_STOCK,
  CURSED_ASSET_NAMES,
  GIFT_VOUCHER_NAME,
  ROLE_LABEL,
  type Role,
} from "../src/lib/game";

const prisma = new PrismaClient();

// ─── 賽前設定（留空待填，請依實際情況修改）──────────────────────
const TEAM_COUNT = 10; // 實際小隊數
const STARTING_COINS = 1000; // 各隊初始光幣（不動產價格表以此校準：中位數約 750，起始買得起約 1 塊）
const STARTING_CARD_POINTS = 0; // TODO: 各隊初始卡牌點數
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
// 各角色站別數量
// 每個角色一張 token（同角色共用，不分站別）
const STATION_COUNTS: Partial<Record<Exclude<Role, "TEAM">, number>> = {
  HOST: 1,
  // EXCHANGE: 1,
  MAP: 1,
  MOBILE: 1,
  // CARDSHOP: 1,
  AUCTION: 1,
  PROJECTION: 1,
  ADMIN: 1,
};
// ──────────────────────────────────────────────────────────────

const newToken = () => randomBytes(16).toString("hex");

async function reset() {
  // FK 安全順序清空（子表先刪）
  await prisma.ledger.deleteMany();
  await prisma.lotteryNumber.deleteMany();
  await prisma.accessToken.deleteMany();
  await prisma.teamItem.deleteMany();   // 必須在 team 之前（FK: teamId, assetId）
  await prisma.property.deleteMany();
  await prisma.team.deleteMany();
  // 題庫不重置：由 prisma/load-questions.ts 另外維護，重跑 seed 不動它
  // MovableAsset 模板不重置：skipDuplicates 保留現有設定
  await prisma.functionCard.deleteMany();
  await prisma.shopDisplay.deleteMany();
  await prisma.gameState.deleteMany();

  // deleteMany 不會重置 Postgres 的 identity 序列，重跑 seed 後 id 會一直往上累加
  // （例：小隊 id 變成 11、21…）。把已整批清空又重建的表序列歸 1，讓 id 從 1 起算，
  // 方便用固定 id 測試（如第 1、2 隊互相交易）。MovableAsset 因 skipDuplicates 保留資料，不重置。
  const RESET_SEQ = ["Team", "Property", "FunctionCard", "Ledger", "LotteryNumber"];
  for (const table of RESET_SEQ) {
    // 序列名是 Postgres 預設的 "<Table>_id_seq"；表名 / 序列名皆為 PascalCase，需加雙引號。
    await prisma.$executeRawUnsafe(`ALTER SEQUENCE "${table}_id_seq" RESTART WITH 1`);
  }
}

// 動產模板的目標欄位（price/shopStock 依等級與是否為非賣品計算）。單一事實來源，
// 全量 seed 與 --no-reset 增量補種共用。
function assetSeedData(a: (typeof MOVABLE_ASSET_SEED)[number]) {
  return {
    ...a,
    price: ITEM_GRADE_PRICE[a.grade] ?? 0,
    // 詛咒道具與五折券（好運卡專屬非賣品）不上架（shopStock=0）。
    shopStock: CURSED_ASSET_NAMES.has(a.name) || a.name === GIFT_VOUCHER_NAME ? 0 : DEFAULT_SHOP_STOCK,
  };
}

// 增量補種動產模板：只新增缺少的、對齊既有的，絕不刪任何資料（供 --no-reset 用）。
// 用 upsert 確保既有模板若改了 effectValue / 描述也會同步，且不影響小隊 / 帳本等動態資料。
async function upsertMovableAssets() {
  for (const a of MOVABLE_ASSET_SEED) {
    const data = assetSeedData(a);
    await prisma.movableAsset.upsert({
      where: { name: a.name },
      update: data,
      create: data,
    });
  }
}

// --no-reset / SEED_NO_RESET=1：只補種「靜態模板」（動產模板），不執行 reset()、
// 不重建小隊 / token / 不動產 / 全場狀態。用於正式賽局進行中安全補上新道具模板。
const NO_RESET =
  process.argv.includes("--no-reset") || process.env.SEED_NO_RESET === "1";

async function main() {
  await prisma.$executeRaw`SET timezone = 'Asia/Taipei'`;

  if (NO_RESET) {
    console.log("⚙ --no-reset：只補種動產模板，不重置任何動態資料。");
    await upsertMovableAssets();
    const total = await prisma.movableAsset.count();
    console.log(`✅ 動產模板已對齊（目前共 ${total} 種，未動小隊 / 不動產 / 帳本）。\n`);
    return;
  }

  await reset();

  // 不動產（四區域表）
  await prisma.property.createMany({ data: PROPERTY_SEED });

  // 全場狀態
  await prisma.gameState.create({
    data: { id: 1, phase: "SETUP", lotteryPeriod: 1, lotteryPool: 1000 },
  });

  // 功能卡庫存
  for (const c of FUNCTION_CARDS) {
    await prisma.functionCard.create({
      data: { type: c.type, effect: c.effect, cost: c.cost, remaining: c.defaultStock },
    });
  }
  // 商店初始展示 3 張（取前三種卡）
  for (let slot = 0; slot < 3; slot++) {
    await prisma.shopDisplay.create({
      data: { slot, cardType: FUNCTION_CARDS[slot]?.type ?? null },
    });
  }

  // 動產模板（skipDuplicates：重跑 seed 不覆蓋已建立的模板）
  await prisma.movableAsset.createMany({
    data: MOVABLE_ASSET_SEED.map(assetSeedData),
    skipDuplicates: true,
  });

  // 題庫由 prisma/load-questions.ts 維護，seed 不碰

  // 小隊
  const TEAM_NAMES = [
    "維積分小蔡一碟",
    "蘇per idol就是你今晚的2孟",
    "輝黃珊瑚海",
    "404 not found",
    "李好,五安",
    "彭妤晏6下來陪我",
    "尼粉7怪欸",
    "乂闇影八番隊乂",
    "醉翁紫意不在九",
    "胃十道逆流",
  ];
  const teams = [];
  for (let i = 1; i <= TEAM_COUNT; i++) {
    const t = await prisma.team.create({
      data: {
        name: TEAM_NAMES[i - 1] ?? `第 ${i} 隊`,
        coins: STARTING_COINS,
        cardPoints: STARTING_CARD_POINTS,
      },
    });
    teams.push(t);
  }

  // 角色 / 站別 token
  type TokenRow = { role: Role; label: string; token: string; url: string };
  const rows: TokenRow[] = [];

  for (const [role, count] of Object.entries(STATION_COUNTS) as [
    Exclude<Role, "TEAM">,
    number,
  ][]) {
    for (let i = 1; i <= count; i++) {
      const label = count > 1 ? `${ROLE_LABEL[role]}-${i}` : ROLE_LABEL[role];
      const token = newToken();
      await prisma.accessToken.create({ data: { token, role, label } });
      rows.push({ role, label, token, url: `${BASE_URL}/api/login?t=${token}` });
    }
  }
  // 小隊 token
  for (const t of teams) {
    const token = newToken();
    await prisma.accessToken.create({
      data: { token, role: "TEAM", label: t.name, teamId: t.id },
    });
    rows.push({
      role: "TEAM",
      label: t.name,
      token,
      url: `${BASE_URL}/api/login?t=${token}`,
    });
  }

  await writeQrSheet(rows);

  console.log(`\n✅ Seed 完成`);
  console.log(`  不動產：${PROPERTY_SEED.length} 筆`);
  console.log(`  小隊：${TEAM_COUNT} 隊（初始光幣 ${STARTING_COINS}、卡牌點數 ${STARTING_CARD_POINTS}）`);
  console.log(`  Token：${rows.length} 組`);
  console.log(`  QR 對照頁：web/qr-codes.html（用瀏覽器開啟後列印發放）`);
  console.log(`  Base URL：${BASE_URL}（如需改網址，設環境變數 BASE_URL 後重跑 seed）\n`);
}

async function writeQrSheet(
  rows: { role: Role; label: string; token: string; url: string }[],
) {
  const cards = await Promise.all(
    rows.map(async (r) => {
      const dataUrl = await QRCode.toDataURL(r.url, { width: 220, margin: 1 });
      return `
      <div class="card">
        <div class="role">${ROLE_LABEL[r.role]}</div>
        <div class="label">${r.label}</div>
        <img src="${dataUrl}" alt="QR" />
        <div class="url">${r.url}</div>
      </div>`;
    }),
  );

  const html = `<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8" />
<title>IM 大富翁 — 登入 QR 對照頁</title>
<style>
  body { font-family: "Microsoft JhengHei", Arial, sans-serif; margin: 24px; }
  h1 { font-size: 20px; }
  p.note { color:#666; font-size:13px; }
  .grid { display:flex; flex-wrap:wrap; gap:16px; }
  .card { width: 250px; border:1px solid #ddd; border-radius:12px; padding:14px; text-align:center; page-break-inside: avoid; }
  .role { font-size:12px; color:#888; }
  .label { font-size:18px; font-weight:bold; margin-bottom:8px; }
  .url { font-size:9px; color:#aaa; word-break: break-all; margin-top:6px; }
  @media print { .card { box-shadow:none; } }
</style></head>
<body>
  <h1>IM 大富翁：迷霧資本戰 — 登入 QR 對照頁</h1>
  <p class="note">每張卡對應一個站別 / 小隊。掃描或開啟連結即自動登入該角色（12 小時內免再登入）。請剪下發給對應人員。</p>
  <div class="grid">${cards.join("")}</div>
</body></html>`;

  writeFileSync(join(process.cwd(), "qr-codes.html"), html, "utf-8");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
