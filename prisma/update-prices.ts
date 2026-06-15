// 一次性：把 PROPERTY_SEED 的新 basePrice 套用到現有 DB（只改價格，不動產權 / 等級 / 小隊 / 總帳）。
// 用法：npx tsx prisma/update-prices.ts
import { PrismaClient } from "../src/generated/prisma";
import { PROPERTY_SEED } from "../src/lib/game";

const prisma = new PrismaClient();

async function main() {
  let changed = 0;
  for (const seed of PROPERTY_SEED) {
    const existing = await prisma.property.findUnique({ where: { name: seed.name } });
    if (!existing) {
      console.warn(`⚠ 找不到不動產（DB 無此筆，略過）：${seed.name}`);
      continue;
    }
    if (existing.basePrice === seed.basePrice) continue;
    await prisma.property.update({
      where: { name: seed.name },
      data: { basePrice: seed.basePrice },
    });
    console.log(`  ${seed.name}: ${existing.basePrice} → ${seed.basePrice}`);
    changed++;
  }
  console.log(`\n✅ 完成：更新 ${changed} 筆價格（共 ${PROPERTY_SEED.length} 筆）。產權 / 等級 / 小隊 / 總帳未變動。`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
