import { apiRoute, num } from "@/lib/api";
import { registerFreeLottery } from "@/lib/service";

// 好運卡「幸運彩券」：免費登記一個關主指定的大樂透號碼。
export const POST = apiRoute(["MAP"], async ({ body, session }) =>
  registerFreeLottery({ teamId: num(body, "teamId"), number: num(body, "number"), byToken: session.label }),
);
