import { apiRoute, num } from "@/lib/api";
import { deactivateItem } from "@/lib/service";

export const POST = apiRoute(["ADMIN"], async ({ body, session }) =>
  deactivateItem({
    itemId:  num(body, "itemId"),
    byToken: session.label,
  }),
);
