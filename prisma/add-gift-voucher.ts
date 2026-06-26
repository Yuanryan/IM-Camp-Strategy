// 一次性：把好運卡「神秘禮物」用的「神秘商店五折券」加進 DB（idempotent upsert）。
// 從 MOVABLE_ASSET_SEED 取單一事實來源，價格 / 庫存沿用 seed 規則（非賣品 → shopStock 0）。
// 用法：npx tsx prisma/add-gift-voucher.ts
import { PrismaClient } from "../src/generated/prisma";
import { MOVABLE_ASSET_SEED, ITEM_GRADE_PRICE, GIFT_VOUCHER_NAME } from "../src/lib/game";

const prisma = new PrismaClient();

async function main() {
  const seed = MOVABLE_ASSET_SEED.find((a) => a.name === GIFT_VOUCHER_NAME);
  if (!seed) throw new Error("MOVABLE_ASSET_SEED 中找不到五折券，請先確認 game.ts");

  const data = {
    grade: seed.grade,
    effectType: seed.effectType,
    effectValue: seed.effectValue,
    condition: seed.condition,
    description: seed.description,
    defaultUses: seed.defaultUses,
    price: ITEM_GRADE_PRICE[seed.grade] ?? 0,
    shopStock: 0, // 非賣品
  };

  const row = await prisma.movableAsset.upsert({
    where: { name: seed.name },
    update: data, // 已存在則對齊最新欄位
    create: { name: seed.name, ...data },
  });
  console.log(`✓ 已寫入五折券（id=${row.id}）：${row.name}・${row.effectType} ${row.effectValue}・庫存 ${row.shopStock}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
