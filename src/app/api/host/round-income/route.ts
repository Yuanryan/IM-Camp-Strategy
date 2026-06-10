import { apiRoute, num } from "@/lib/api";
import { distributeRoundIncome } from "@/lib/service";

export const POST = apiRoute(["HOST", "MAP", "ADMIN"], async ({ body, session }) =>
  distributeRoundIncome({ teamId: num(body, "teamId"), byToken: session.label }),
);
