import { apiRoute } from "@/lib/api";
import { prisma } from "@/lib/db";

// 功能卡庫存（展示的 3 張由前端隨機抽，後端只回庫存清單）
export const GET = apiRoute(["CARDSHOP", "ADMIN"], async () => {
  const cards = await prisma.functionCard.findMany({ orderBy: { id: "asc" } });
  return { cards };
});
