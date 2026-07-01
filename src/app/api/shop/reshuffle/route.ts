import { apiRoute, num, str } from "@/lib/api";
import { payReshuffle } from "@/lib/service";

// 重抽展示（付費）：kind=cards 扣卡牌點數、items 扣光幣，依本次已重抽次數遞增。
export const POST = apiRoute(["CARDSHOP"], async ({ body, session }) => {
  const kind = str(body, "kind");
  if (kind !== "cards" && kind !== "items") throw new Error("kind 需為 cards 或 items");
  return payReshuffle({ teamId: num(body, "teamId"), kind, byToken: session.label });
});
