// 一次性 / 非破壞性：把詛咒卡（CURSE_CARDS）專屬的詛咒道具模板加進 DB（idempotent upsert）。
// 只新增 / 對齊這幾筆 MovableAsset，不刪任何資料、不碰小隊 / 不動產 / 帳本（與 seed 的 reset() 不同）。
// 從 MOVABLE_ASSET_SEED 取單一事實來源；詛咒道具為非賣品 → shopStock 0。
// 用法：npx tsx prisma/add-curse-assets.ts
import { PrismaClient } from "../src/generated/prisma";
import { MOVABLE_ASSET_SEED, ITEM_GRADE_PRICE } from "../src/lib/game";

const prisma = new PrismaClient();

// 詛咒卡專屬詛咒道具（依效果分三類，名稱唯一）。
const CURSE_ITEM_NAMES = ["詛咒：光幣", "詛咒：過路費", "詛咒：功能卡"];

async function main() {
  for (const name of CURSE_ITEM_NAMES) {
    const seed = MOVABLE_ASSET_SEED.find((a) => a.name === name);
    if (!seed) throw new Error(`MOVABLE_ASSET_SEED 中找不到「${name}」，請先確認 game.ts`);

    const data = {
      grade: seed.grade,
      effectType: seed.effectType,
      effectValue: seed.effectValue,
      condition: seed.condition,
      description: seed.description,
      defaultUses: seed.defaultUses,
      price: ITEM_GRADE_PRICE[seed.grade] ?? 0,
      shopStock: 0, // 詛咒道具不上架
    };

    const row = await prisma.movableAsset.upsert({
      where: { name: seed.name },
      update: data, // 已存在則對齊最新欄位（值 / 描述變更時同步）
      create: { name: seed.name, ...data },
    });
    console.log(`✓ ${row.name}（id=${row.id}）・${row.effectType} ${row.effectValue}・庫存 ${row.shopStock}`);
  }
  console.log("完成：詛咒道具模板已寫入（未動其他任何資料）。");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
