import { apiRoute, str } from "@/lib/api";
import { createAuctionEvent } from "@/lib/service";

export const POST = apiRoute(["AUCTION"], async ({ body, session }) =>
  createAuctionEvent({
    name: str(body, "name"),
    announcement: typeof body.announcement === "string" ? body.announcement : "",
    byToken: session.label,
  }),
);
