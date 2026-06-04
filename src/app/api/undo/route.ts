import { apiRoute } from "@/lib/api";
import { undoAction } from "@/lib/service";

// 反悔：撤銷剛剛的關主操作（幾秒內、限本站；ADMIN 不限站）
export const POST = apiRoute(["EXCHANGE", "MAP", "MOBILE", "HOST"], async ({ body, session }) => {
  const ledgerIds = Array.isArray(body.ledgerIds) ? body.ledgerIds.map(Number) : [];
  const p = body.property as { id?: unknown; ownerTeamId?: unknown; level?: unknown } | undefined;
  const property =
    p && Number.isInteger(Number(p.id))
      ? {
          id: Number(p.id),
          ownerTeamId: p.ownerTeamId == null ? null : Number(p.ownerTeamId),
          level: Number(p.level) || 0,
        }
      : undefined;
  return undoAction({
    ledgerIds,
    property,
    byToken: session.label,
    isAdmin: session.role === "ADMIN",
  });
});
