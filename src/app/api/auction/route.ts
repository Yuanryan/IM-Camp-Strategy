import { apiRoute } from "@/lib/api";
import { prisma } from "@/lib/db";

// 拍賣官管理視圖：未結束場次（含所有拍賣品）、可選的動產模板 / 未售不動產、各隊光幣。
export const GET = apiRoute(["AUCTION"], async () => {
  const [events, assets, properties, teams] = await Promise.all([
    prisma.auctionEvent.findMany({
      where: { status: "OPEN" },
      orderBy: { id: "desc" },
      include: { lots: { orderBy: { orderIndex: "asc" } } },
    }),
    prisma.movableAsset.findMany({ orderBy: { grade: "asc" } }),
    prisma.property.findMany({ where: { ownerTeamId: null }, orderBy: { id: "asc" } }),
    prisma.team.findMany({ orderBy: { id: "asc" }, select: { id: true, name: true, coins: true } }),
  ]);

  return {
    events: events.map((e) => ({
      id: e.id,
      name: e.name,
      announcement: e.announcement,
      lots: e.lots.map((l) => ({
        id: l.id,
        orderIndex: l.orderIndex,
        title: l.title,
        description: l.description,
        lotType: l.lotType,
        startPrice: l.startPrice,
        currentBid: l.currentBid,
        status: l.status,
        winnerTeamId: l.winnerTeamId,
        finalPrice: l.finalPrice,
      })),
    })),
    assets: assets.map((a) => ({
      id: a.id,
      name: a.name,
      grade: a.grade,
      effectType: a.effectType,
      description: a.description,
    })),
    properties: properties.map((p) => ({
      id: p.id,
      name: p.name,
      region: p.region,
      basePrice: p.basePrice,
    })),
    teams,
  };
});
