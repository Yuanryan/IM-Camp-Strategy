import { apiRoute, str } from "@/lib/api";
import { createAuctionEvent } from "@/lib/service";

export const POST = apiRoute(["AUCTION"], async ({ body, session }) =>
  createAuctionEvent({
    name: str(body, "name"),
    // 欄位缺省 → undefined（讓 service 套用「5 分鐘後開始」預設）；
    // 明確傳空字串 → 尊重「不顯示橫幅」。
    announcement: typeof body.announcement === "string" ? body.announcement : undefined,
    byToken: session.label,
  }),
);
