import { apiRoute, num } from "@/lib/api";
import { setPiracyMark } from "@/lib/service";

export const POST = apiRoute(["TEAM", "MAP", "ADMIN"], async ({ body, session }) =>
  setPiracyMark({
    itemId: num(body, "itemId"),
    markTeamId: num(body, "markTeamId"),
    byToken: session.label,
  }),
);
