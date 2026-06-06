import { apiRoute, num } from "@/lib/api";
import { transferItem } from "@/lib/service";

export const POST = apiRoute(["ADMIN"], async ({ body, session }) =>
  transferItem({
    itemId:    num(body, "itemId"),
    toTeamId:  num(body, "toTeamId"),
    byToken:   session.label,
  }),
);
