import { apiRoute, num } from "@/lib/api";
import { openAuctionLot } from "@/lib/service";

export const POST = apiRoute(["AUCTION"], async ({ body, session }) =>
  openAuctionLot({ lotId: num(body, "lotId"), byToken: session.label }),
);
