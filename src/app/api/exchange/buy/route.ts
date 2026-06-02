import { apiRoute, num, optNum } from "@/lib/api";
import { buyProperty } from "@/lib/service";

export const POST = apiRoute(["EXCHANGE"], async ({ body, session }) =>
  buyProperty({
    propertyId: num(body, "propertyId"),
    teamId: num(body, "teamId"),
    discount: optNum(body, "discount", 0),
    byToken: session.label,
  }),
);
