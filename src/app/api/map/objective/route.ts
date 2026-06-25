import { apiRoute, num, str } from "@/lib/api";
import { createObjective } from "@/lib/service";

// 抽到任務型好運卡時登記任務目標（記下 since-draw 基準）。只送 teamId + cardName，
// 規格（kind / 目標 / 獎勵）由伺服器依 cardName 在 TASK_GOOD_CARDS 查表，不信任前端。
export const POST = apiRoute(["MAP", "ADMIN"], async ({ body, session }) =>
  createObjective({
    teamId:   num(body, "teamId"),
    cardName: str(body, "cardName"),
    byToken:  session.label,
  }),
);
