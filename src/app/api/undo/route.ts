import { apiRoute } from "@/lib/api";
import { undoAction } from "@/lib/service";

// 反悔：撤銷剛剛的關主操作（幾秒內、限本站；ADMIN 不限站）
export const POST = apiRoute(["EXCHANGE", "MAP", "MOBILE", "HOST"], async ({ body, session }) => {
  const ledgerIds = Array.isArray(body.ledgerIds) ? body.ledgerIds.map(Number) : [];
  type PropIn = {
    id?: unknown; ownerTeamId?: unknown; level?: unknown;
    cardRegionMult?: unknown; cardBuildingMult?: unknown; monopolyBonusMult?: unknown;
  };
  const optMult = (v: unknown) => (v == null ? undefined : Number(v));
  const parseProp = (p: PropIn | undefined) =>
    p && Number.isInteger(Number(p.id))
      ? {
          id: Number(p.id),
          ownerTeamId: p.ownerTeamId == null ? null : Number(p.ownerTeamId),
          level: Number(p.level) || 0,
          ...(p.cardRegionMult != null ? { cardRegionMult: optMult(p.cardRegionMult) } : {}),
          ...(p.cardBuildingMult != null ? { cardBuildingMult: optMult(p.cardBuildingMult) } : {}),
          ...(p.monopolyBonusMult != null ? { monopolyBonusMult: optMult(p.monopolyBonusMult) } : {}),
        }
      : undefined;
  const property = parseProp(body.property as PropIn | undefined);
  const properties = Array.isArray(body.properties)
    ? (body.properties as PropIn[]).map(parseProp).filter((x): x is NonNullable<typeof x> => x != null)
    : undefined;
  const itemIds = Array.isArray(body.itemIds) ? body.itemIds.map(Number) : [];
  const restoreItemIds = Array.isArray(body.restoreItemIds) ? body.restoreItemIds.map(Number) : [];
  const lotteryNumberId = Number.isInteger(Number(body.lotteryNumberId)) && body.lotteryNumberId != null ? Number(body.lotteryNumberId) : undefined;
  const lotteryPoolRevert = Number.isInteger(Number(body.lotteryPoolRevert)) && body.lotteryPoolRevert != null ? Number(body.lotteryPoolRevert) : undefined;
  return undoAction({
    ledgerIds,
    property,
    properties,
    itemIds,
    restoreItemIds,
    lotteryNumberId,
    lotteryPoolRevert,
    byToken: session.label,
    isAdmin: session.role === "ADMIN",
  });
});
