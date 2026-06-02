import { apiRoute, num } from "@/lib/api";
import { payToll } from "@/lib/service";

export const POST = apiRoute(["EXCHANGE"], async ({ body, session }) =>
  payToll({
    propertyId: num(body, "propertyId"),
    payerTeamId: num(body, "payerTeamId"),
    byToken: session.label,
  }),
);
