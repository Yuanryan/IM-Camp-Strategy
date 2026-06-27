import { apiRoute, num, str } from "@/lib/api";
import { createCurse } from "@/lib/service";

// 抽到詛咒卡時套用詛咒（立刻發詛咒道具）並登記解咒任務目標（記下 since-draw 基準）。
// 只送 teamId + cardName，規格（詛咒道具 / kind / 目標 / 解咒獎勵）由伺服器依 cardName 在
// CURSE_CARDS 查表，不信任前端。
export const POST = apiRoute(["MAP", "ADMIN"], async ({ body, session }) =>
  createCurse({
    teamId:   num(body, "teamId"),
    cardName: str(body, "cardName"),
    byToken:  session.label,
  }),
);
