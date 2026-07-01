import { apiRoute, num, optBool } from "@/lib/api";
import { prisma } from "@/lib/db";
import { buyShopItem } from "@/lib/service";

// 神秘商店上架中的動產（shopStock>0）。展示由前端隨機抽，後端回完整清單。
export const GET = apiRoute(["CARDSHOP", "ADMIN"], async () => {
  const items = await prisma.movableAsset.findMany({
    where: { shopStock: { gt: 0 } },
    orderBy: [{ grade: "asc" }, { name: "asc" }],
  });
  return { items };
});

export const POST = apiRoute(["CARDSHOP"], async ({ body, session }) =>
  buyShopItem({ teamId: num(body, "teamId"), assetId: num(body, "assetId"), limited: optBool(body, "limited"), byToken: session.label }),
);
