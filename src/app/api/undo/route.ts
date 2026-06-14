import { apiRoute } from "@/lib/api";
import { undoAction } from "@/lib/service";

// 反悔：撤銷剛剛的關主操作（幾秒內、限本站；ADMIN 不限站）
export const POST = apiRoute(["EXCHANGE", "MAP", "MOBILE", "HOST"], async ({ body, session }) => {
  const ledgerIds = Array.isArray(body.ledgerIds) ? body.ledgerIds.map(Number) : [];
  type PropIn = { id?: unknown; ownerTeamId?: unknown; level?: unknown };
  const parseProp = (p: PropIn | undefined) =>
    p && Number.isInteger(Number(p.id))
      ? {
          id: Number(p.id),
          ownerTeamId: p.ownerTeamId == null ? null : Number(p.ownerTeamId),
          level: Number(p.level) || 0,
        }
      : undefined;
  const property = parseProp(body.property as PropIn | undefined);
  const properties = Array.isArray(body.properties)
    ? (body.properties as PropIn[]).map(parseProp).filter((x): x is NonNullable<typeof x> => x != null)
    : undefined;
  return undoAction({
    ledgerIds,
    property,
    properties,
    byToken: session.label,
    isAdmin: session.role === "ADMIN",
  });
});
