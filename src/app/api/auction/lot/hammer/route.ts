import { apiRoute, num } from "@/lib/api";
import { hammerLot } from "@/lib/service";

export const POST = apiRoute(["AUCTION"], async ({ body, session }) =>
  hammerLot({
    lotId: num(body, "lotId"),
    winnerTeamId: num(body, "winnerTeamId"),
    byToken: session.label,
  }),
);
