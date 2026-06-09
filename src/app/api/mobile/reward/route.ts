import { apiRoute, num, optNum } from "@/lib/api";
import { applyMobileReward } from "@/lib/service";

export const POST = apiRoute(["MOBILE", "ADMIN"], async ({ body, session }) =>
  applyMobileReward({
    teamId:     num(body, "teamId"),
    coins:      optNum(body, "coins", 0),
    cardPoints: optNum(body, "cardPoints", 0),
    note:       typeof body.note === "string" ? body.note : undefined,
    byToken:    session.label,
  }),
);
