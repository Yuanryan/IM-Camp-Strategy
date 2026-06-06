import { apiRoute, num, str } from "@/lib/api";
import { applyBadCard } from "@/lib/service";

export const POST = apiRoute(["MAP", "MOBILE", "ADMIN"], async ({ body, session }) =>
  applyBadCard({
    teamId:      num(body, "teamId"),
    basePenalty: num(body, "basePenalty"),
    note:        str(body, "note"),
    byToken:     session.label,
  }),
);
