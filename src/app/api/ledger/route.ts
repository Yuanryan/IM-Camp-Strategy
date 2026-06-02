import { apiRoute } from "@/lib/api";
import { prisma } from "@/lib/db";

// 最近的總帳紀錄（稽核 / 沖銷用）
export const GET = apiRoute(["ADMIN", "HOST", "EXCHANGE"], async ({ req }) => {
  const teamId = req.nextUrl.searchParams.get("teamId");
  const where = teamId ? { teamId: parseInt(teamId, 10) } : {};
  const rows = await prisma.ledger.findMany({
    where,
    orderBy: { id: "desc" },
    take: 60,
    include: { team: { select: { name: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    teamName: r.team?.name ?? null,
    kind: r.kind,
    delta: r.delta,
    note: r.note,
    byToken: r.byToken,
    reversed: r.reversed,
    createdAt: r.createdAt,
  }));
});
