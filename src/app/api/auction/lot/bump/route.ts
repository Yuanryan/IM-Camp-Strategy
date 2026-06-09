import { apiRoute, num } from "@/lib/api";
import { bumpBid } from "@/lib/service";

export const POST = apiRoute(["AUCTION"], async ({ body, session }) =>
  bumpBid({ lotId: num(body, "lotId"), amount: num(body, "amount"), byToken: session.label }),
);
