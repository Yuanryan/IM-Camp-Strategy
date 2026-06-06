import { apiRoute, num, optNum, str } from "@/lib/api";
import { grantItem } from "@/lib/service";

export const POST = apiRoute(["EXCHANGE", "MOBILE", "ADMIN"], async ({ body, session }) =>
  grantItem({
    teamId:      num(body, "teamId"),
    assetId:     num(body, "assetId"),
    hiddenValue: optNum(body, "hiddenValue", 0),
    note:        typeof body.note === "string" ? body.note : undefined,
    byToken:     session.label,
  }),
);
