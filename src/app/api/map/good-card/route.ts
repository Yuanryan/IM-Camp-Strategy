import { apiRoute, num, str } from "@/lib/api";
import { applyGoodCard } from "@/lib/service";

export const POST = apiRoute(["MAP", "MOBILE", "ADMIN"], async ({ body, session }) =>
  applyGoodCard({
    teamId:     num(body, "teamId"),
    baseReward: num(body, "baseReward"),
    note:       str(body, "note"),
    byToken:    session.label,
  }),
);
