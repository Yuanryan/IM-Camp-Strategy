process.env.TZ = "Asia/Taipei"; // GMT+8；必須在任何 Date 運算之前設定

// 非破壞性：把功能卡商店同步到 lib/game.ts 的 FUNCTION_CARDS（單一事實來源）。
//   - 全新卡（購地卡以外的 4 張：遙控骰子卡 / 孫生媽媽卡 / 查稅卡 / 強力膠卡；DB 尚無此 type）
//     → 建立，remaining = defaultStock。
//   - 既有 9 張卡 → 只更新 effect（效果文字）與 cost（新定價），remaining 維持現況
//     （已在流通中的庫存不重置，避免蓋掉玩家買賣後的真實剩餘量）。
//   - 已停用、不在清單內的舊卡（例如市場預警卡）→ 若 DB 仍有殘留列，一併刪除。
// 用法：npx tsx prisma/add-new-function-cards.ts
import { PrismaClient } from "../src/generated/prisma";
import { FUNCTION_CARDS } from "../src/lib/game";

const prisma = new PrismaClient();

async function main() {
  for (const c of FUNCTION_CARDS) {
    const before = await prisma.functionCard.findUnique({ where: { type: c.type } });
    await prisma.functionCard.upsert({
      where: { type: c.type },
      create: { type: c.type, effect: c.effect, cost: c.cost, remaining: c.defaultStock },
      update: { effect: c.effect, cost: c.cost },
    });
    console.log(
      before
        ? `已更新 ${c.type}（點數 ${before.cost} → ${c.cost}；流通量維持 ${before.remaining}）`
        : `已建立 ${c.type}（點數=${c.cost}・流通量=${c.defaultStock}）`,
    );
  }

  const removed = await prisma.functionCard.deleteMany({
    where: { type: { notIn: FUNCTION_CARDS.map((c) => c.type) } },
  });
  if (removed.count > 0) {
    console.log(`\n已移除 ${removed.count} 張不在清單內的舊卡（例如市場預警卡）。`);
  }

  console.log(`\n完成：共處理 ${FUNCTION_CARDS.length} 張功能卡。`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
