import { apiRoute, num, str, optNum } from "@/lib/api";
import { createAuctionLot } from "@/lib/service";

export const POST = apiRoute(["AUCTION"], async ({ body, session }) =>
  createAuctionLot({
    eventId: num(body, "eventId"),
    title: str(body, "title"),
    description: typeof body.description === "string" ? body.description : "",
    lotType: typeof body.lotType === "string" ? body.lotType : "CUSTOM",
    assetId: body.assetId == null || body.assetId === "" ? null : num(body, "assetId"),
    propertyId: body.propertyId == null || body.propertyId === "" ? null : num(body, "propertyId"),
    hiddenValue: optNum(body, "hiddenValue", 0),
    startPrice: optNum(body, "startPrice", 0),
    orderIndex: optNum(body, "orderIndex", 0),
    byToken: session.label,
  }),
);
