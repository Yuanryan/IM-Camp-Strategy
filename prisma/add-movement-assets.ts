process.env.TZ = "Asia/Taipei"; // GMT+8；必須在任何 Date 運算之前設定

// 非破壞性：建立 / 更新「主動移動道具」(MOVEMENT) 模板。
// 來源為 lib/game.ts 的 MOVABLE_ASSET_SEED（單一事實來源），只挑 effectType=MOVEMENT。
// 以 name（@unique）upsert：
//   - 新道具（捷運悠遊卡 / 校門口計程車）→ 建立
//   - 既有 F1賽車（原 REMINDER）→ 就地更新為 MOVEMENT（seed 的 skipDuplicates 不會做這件事）
// 價格 / 上架量沿用 seed 慣例；不動 TeamItem 既有實例。
// 用法：npx tsx prisma/add-movement-assets.ts
import { PrismaClient } from "../src/generated/prisma";
import {
  MOVABLE_ASSET_SEED,
  ITEM_GRADE_PRICE,
  DEFAULT_SHOP_STOCK,
  CURSED_ASSET_NAMES,
} from "../src/lib/game";

const prisma = new PrismaClient();

async function main() {
  const movementAssets = MOVABLE_ASSET_SEED.filter((a) => a.effectType === "MOVEMENT");

  for (const a of movementAssets) {
    const row = {
      grade: a.grade,
      effectType: a.effectType,
      effectValue: a.effectValue,
      condition: a.condition,
      description: a.description,
      defaultUses: a.defaultUses,
      price: ITEM_GRADE_PRICE[a.grade] ?? 0,
      shopStock: CURSED_ASSET_NAMES.has(a.name) ? 0 : DEFAULT_SHOP_STOCK,
    };
    const before = await prisma.movableAsset.findUnique({ where: { name: a.name } });
    await prisma.movableAsset.upsert({
      where: { name: a.name },
      create: { name: a.name, ...row },
      update: row, // 既有列就地更新（含 effectType: REMINDER → MOVEMENT）
    });
    console.log(
      `${before ? "已更新" : "已建立"} ${a.name}（${a.condition}・value=${a.effectValue}・uses=${a.defaultUses ?? "永久"}）`,
    );
  }

  console.log(`\n完成：共處理 ${movementAssets.length} 件主動移動道具。`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
