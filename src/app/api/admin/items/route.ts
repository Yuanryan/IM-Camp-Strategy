import { apiRoute } from "@/lib/api";
import { prisma } from "@/lib/db";

// Returns all TeamItems (active + inactive) with hidden values — admin only.
export const GET = apiRoute(["ADMIN"], async () => {
  const items = await prisma.teamItem.findMany({
    orderBy: [{ teamId: "asc" }, { obtainedAt: "asc" }],
    include: { asset: true, team: { select: { name: true } } },
  });
  return items.map((i) => ({
    id:          i.id,
    teamId:      i.teamId,
    teamName:    i.team.name,
    assetId:     i.assetId,
    assetName:   i.asset.name,
    grade:       i.asset.grade,
    effectType:  i.asset.effectType,
    effectValue: i.asset.effectValue,
    description: i.asset.description,
    hiddenValue: i.hiddenValue,
    active:      i.active,
    note:        i.note,
    obtainedAt:  i.obtainedAt,
  }));
});
