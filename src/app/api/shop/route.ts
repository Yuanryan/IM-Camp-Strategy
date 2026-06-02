import { apiRoute } from "@/lib/api";
import { prisma } from "@/lib/db";

// 商店展示的 3 張 + 庫存
export const GET = apiRoute(["CARDSHOP", "ADMIN"], async () => {
  const [displays, cards] = await Promise.all([
    prisma.shopDisplay.findMany({ orderBy: { slot: "asc" } }),
    prisma.functionCard.findMany({ orderBy: { id: "asc" } }),
  ]);
  const byType = new Map(cards.map((c) => [c.type, c]));
  return {
    displays: displays.map((d) => {
      const c = d.cardType ? byType.get(d.cardType) : null;
      return {
        slot: d.slot,
        cardType: d.cardType,
        cost: c?.cost ?? 0,
        effect: c?.effect ?? "",
        remaining: c?.remaining ?? 0,
      };
    }),
    cards,
  };
});
