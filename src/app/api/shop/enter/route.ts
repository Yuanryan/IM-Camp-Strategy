import { apiRoute, num } from "@/lib/api";
import { enterShop } from "@/lib/service";

// 進商店（選定小隊）：重置本次重抽次數，回傳目前過起點限購額度。
export const POST = apiRoute(["CARDSHOP"], async ({ body }) =>
  enterShop({ teamId: num(body, "teamId") }),
);
