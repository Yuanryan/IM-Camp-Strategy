import { apiRoute, num, optNum } from "@/lib/api";
import { moveTeamPiece } from "@/lib/service";

// 移動棋子：擲骰前進（steps，可負）或直接設位置（toIndex，傳送 / 微調）。
// 兩者擇一傳入；steps 正向經過起點時自動發收益。
// 可選 useItemId：本次由主動移動道具 (MOVEMENT) 觸發，步數已由前端算好，這裡消耗一次。
export const POST = apiRoute(["MAP", "ADMIN"], async ({ body, session }) => {
  const hasSteps = body.steps != null && body.steps !== "";
  const hasTo = body.toIndex != null && body.toIndex !== "";
  const hasItem = body.useItemId != null && body.useItemId !== "";
  if (!hasSteps && !hasTo) throw new Error("需提供 steps 或 toIndex");
  return moveTeamPiece({
    teamId: num(body, "teamId"),
    steps: hasSteps ? optNum(body, "steps") : undefined,
    toIndex: hasTo ? optNum(body, "toIndex") : undefined,
    useItemId: hasItem ? optNum(body, "useItemId") : undefined,
    byToken: session.label,
  });
});
