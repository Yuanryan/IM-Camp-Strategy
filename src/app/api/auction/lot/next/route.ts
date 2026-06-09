import { apiRoute, num } from "@/lib/api";
import { openNextLot } from "@/lib/service";

export const POST = apiRoute(["AUCTION"], async ({ body, session }) =>
  openNextLot({ eventId: num(body, "eventId"), byToken: session.label }),
);
