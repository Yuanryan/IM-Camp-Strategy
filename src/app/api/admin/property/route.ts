import { apiRoute, num } from "@/lib/api";
import { adminSetProperty } from "@/lib/service";

export const POST = apiRoute(["ADMIN"], async ({ body, session }) => {
  // ownerTeamId 可為 null（設為未售出）
  let ownerTeamId: number | null | undefined = undefined;
  if (body.ownerTeamId === null || body.ownerTeamId === "") ownerTeamId = null;
  else if (body.ownerTeamId != null) ownerTeamId = num(body, "ownerTeamId");
  return adminSetProperty({
    propertyId: num(body, "propertyId"),
    ownerTeamId,
    level: body.level != null ? num(body, "level") : undefined,
    byToken: session.label,
  });
});
