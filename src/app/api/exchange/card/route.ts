import { apiRoute, num, str } from "@/lib/api";
import {
  cardSeizeLand,
  cardSwapLand,
  cardSwapHouse,
  cardDemolish,
  cardMonster,
} from "@/lib/service";

// 功能卡（不動產相關）效果執行：依 action 分發。不扣卡牌點數，僅執行效果。
export const POST = apiRoute(["EXCHANGE"], async ({ body, session }) => {
  const action = str(body, "action");
  const byToken = session.label;
  switch (action) {
    case "seizeLand": // 購地卡
      return cardSeizeLand({ propertyId: num(body, "propertyId"), toTeamId: num(body, "toTeamId"), byToken });
    case "swapLand": // 換地卡
      return cardSwapLand({ propertyAId: num(body, "propertyAId"), propertyBId: num(body, "propertyBId"), byToken });
    case "swapHouse": // 換屋卡
      return cardSwapHouse({ propertyAId: num(body, "propertyAId"), propertyBId: num(body, "propertyBId"), byToken });
    case "demolish": // 拆屋卡
      return cardDemolish({ propertyId: num(body, "propertyId"), byToken });
    case "monster": // 怪獸卡
      return cardMonster({ propertyId: num(body, "propertyId"), byToken });
    default:
      throw new Error("未知的卡片動作");
  }
});
