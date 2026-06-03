import { apiRoute, num, str } from "@/lib/api";
import { respondTrade } from "@/lib/service";

// 接受 / 拒絕 / 取消交易
export const POST = apiRoute(["TEAM"], async ({ body, session }) => {
  if (session.teamId == null) throw new Error("無小隊身分");
  const action = str(body, "action");
  if (action !== "accept" && action !== "reject" && action !== "cancel") {
    throw new Error("動作不正確");
  }
  return respondTrade({
    tradeId: num(body, "tradeId"),
    actorTeamId: session.teamId,
    action,
    byToken: session.label,
  });
});
