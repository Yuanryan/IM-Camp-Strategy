import { apiRoute, num } from "@/lib/api";
import { endAuctionEvent } from "@/lib/service";

export const POST = apiRoute(["AUCTION"], async ({ body, session }) =>
  endAuctionEvent({ eventId: num(body, "eventId"), byToken: session.label }),
);
