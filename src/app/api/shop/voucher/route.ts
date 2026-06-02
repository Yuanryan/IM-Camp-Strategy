import { apiRoute, num } from "@/lib/api";
import { redeemVoucher } from "@/lib/service";

export const POST = apiRoute(["CARDSHOP"], async ({ body, session }) =>
  redeemVoucher({ teamId: num(body, "teamId"), byToken: session.label }),
);
