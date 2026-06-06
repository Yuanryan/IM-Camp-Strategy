import { apiRoute } from "@/lib/api";
import { distributeRoundIncome } from "@/lib/service";

export const POST = apiRoute(["HOST", "ADMIN"], async ({ session }) =>
  distributeRoundIncome({ byToken: session.label }),
);
