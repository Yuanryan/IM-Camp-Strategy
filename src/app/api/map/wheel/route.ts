import { apiRoute, num } from "@/lib/api";
import { applyWheel } from "@/lib/service";

export const POST = apiRoute(["MAP"], async ({ body, session }) =>
  applyWheel({
    teamId: num(body, "teamId"),
    stake:  num(body, "stake"),
    byToken: session.label,
  }),
);
