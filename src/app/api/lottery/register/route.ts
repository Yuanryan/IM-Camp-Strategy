import { apiRoute, num } from "@/lib/api";
import { registerLottery } from "@/lib/service";

export const POST = apiRoute(["LOTTERY"], async ({ body, session }) =>
  registerLottery({ teamId: num(body, "teamId"), number: num(body, "number"), byToken: session.label }),
);
