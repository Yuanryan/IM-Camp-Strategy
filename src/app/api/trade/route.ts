import { apiRoute, num, optNum } from "@/lib/api";
import { prisma } from "@/lib/db";
import { createTrade } from "@/lib/service";

// 收 / 發中的交易（給小隊交易分頁用）
export const GET = apiRoute(["TEAM"], async ({ session }) => {
  const me = session.teamId;
  if (me == null) throw new Error("無小隊身分");

  const trades = await prisma.trade.findMany({
    where: { status: "PENDING", OR: [{ fromTeamId: me }, { toTeamId: me }] },
    orderBy: { id: "desc" },
  });
  const teams = await prisma.team.findMany({ select: { id: true, name: true } });
  const nameOf = (id: number) => teams.find((t) => t.id === id)?.name ?? `#${id}`;

  return {
    incoming: trades
      .filter((t) => t.toTeamId === me)
      .map((t) => ({ id: t.id, fromTeamName: nameOf(t.fromTeamId), coins: t.coins, cardPoints: t.cardPoints })),
    outgoing: trades
      .filter((t) => t.fromTeamId === me)
      .map((t) => ({ id: t.id, toTeamName: nameOf(t.toTeamId), coins: t.coins, cardPoints: t.cardPoints })),
  };
});

// 發起交易
export const POST = apiRoute(["TEAM"], async ({ body, session }) => {
  if (session.teamId == null) throw new Error("無小隊身分");
  return createTrade({
    fromTeamId: session.teamId,
    toTeamId: num(body, "toTeamId"),
    coins: optNum(body, "coins"),
    cardPoints: optNum(body, "cardPoints"),
    byToken: session.label,
  });
});
