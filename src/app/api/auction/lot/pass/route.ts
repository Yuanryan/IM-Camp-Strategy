import { apiRoute, num } from "@/lib/api";
import { passLot } from "@/lib/service";

export const POST = apiRoute(["AUCTION"], async ({ body, session }) =>
  passLot({ lotId: num(body, "lotId"), byToken: session.label }),
);
