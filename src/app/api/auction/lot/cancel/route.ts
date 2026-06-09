import { apiRoute, num } from "@/lib/api";
import { cancelLot } from "@/lib/service";

export const POST = apiRoute(["AUCTION"], async ({ body, session }) =>
  cancelLot({ lotId: num(body, "lotId"), byToken: session.label }),
);
