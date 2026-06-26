import { apiRoute, num } from "@/lib/api";
import { adjustBalance } from "@/lib/service";

// Admin 專用的手動餘額調整：只接受「增加／扣除」一種資源，
// 實際寫帳與餘額不足檢查統一交由 adjustBalance 處理。
export const POST = apiRoute(["ADMIN"], async ({ body, session }) => {
  const resource = body.resource;
  if (resource !== "coins" && resource !== "cardPoints") {
    throw new Error("項目需為光幣或卡牌點數");
  }

  const direction = body.direction;
  if (direction !== "add" && direction !== "subtract") {
    throw new Error("操作需為增加或扣除");
  }

  const amount = typeof body.amount === "number" ? body.amount : Number(body.amount);
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("調整數量需為正整數");
  }
  const delta = direction === "add" ? amount : -amount;
  const detail = typeof body.note === "string" ? body.note.trim() : "";
  const resourceLabel = resource === "coins" ? "光幣" : "卡牌點數";
  const directionLabel = direction === "add" ? "增加" : "扣除";

  return adjustBalance({
    teamId: num(body, "teamId"),
    coins: resource === "coins" ? delta : 0,
    cardPoints: resource === "cardPoints" ? delta : 0,
    note: `Admin 手動${directionLabel}${resourceLabel}${detail ? `：${detail}` : ""}`,
    byToken: session.label,
  });
});
