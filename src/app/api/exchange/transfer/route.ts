import { apiRoute, num, optNum } from "@/lib/api";
import { transferProperty } from "@/lib/service";

export const POST = apiRoute(["EXCHANGE"], async ({ body, session }) =>
  transferProperty({
    propertyId: num(body, "propertyId"),
    toTeamId: num(body, "toTeamId"),
    price: optNum(body, "price", 0),
    byToken: session.label,
  }),
);
