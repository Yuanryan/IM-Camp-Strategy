import { apiRoute, num, optNum } from "@/lib/api";
import { upgradeProperty } from "@/lib/service";

export const POST = apiRoute(["EXCHANGE"], async ({ body, session }) =>
  upgradeProperty({
    propertyId: num(body, "propertyId"),
    discount: optNum(body, "discount", 0),
    byToken: session.label,
  }),
);
