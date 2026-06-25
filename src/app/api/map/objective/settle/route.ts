import { apiRoute, num } from "@/lib/api";
import { evaluateAndSettleObjectives } from "@/lib/service";

// 回合結算（地圖階段 2）時評估該隊所有進行中任務，達標者自動發獎。回傳 { settled }。
export const POST = apiRoute(["MAP", "ADMIN"], async ({ body, session }) =>
  evaluateAndSettleObjectives({
    teamId:  num(body, "teamId"),
    byToken: session.label,
  }),
);
