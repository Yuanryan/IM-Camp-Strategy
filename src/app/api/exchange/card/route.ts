import { apiRoute, num, str, optNum } from "@/lib/api";
import {
  cardSeizeLand,
  cardSwapLand,
  cardSwapHouse,
  cardDemolish,
  cardMonster,
  sellPropertyToExchange,
  applyMarketCard,
  cardTaxAudit,
  cardStealRandom,
  spendFunctionCardManual,
} from "@/lib/service";
import type { RegionCode } from "@/lib/game";

// 功能卡效果執行：依 action 分發。不扣卡牌點數（購買時已扣），僅執行效果並消耗出卡隊持有。
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
      return cardDemolish({ propertyId: num(body, "propertyId"), byTeamId: num(body, "byTeamId"), byToken });
    case "monster": // 怪獸卡
      return cardMonster({ propertyId: num(body, "propertyId"), byTeamId: num(body, "byTeamId"), byToken });
    case "sellProperty": // 賣不動產給交易所
      return sellPropertyToExchange({ propertyId: num(body, "propertyId"), byToken });
    case "red": // 紅卡：整區大漲
      return applyMarketCard({ kind: "RED", region: str(body, "region") as RegionCode, byTeamId: num(body, "byTeamId"), byToken });
    case "black": // 黑卡：整區大跌
      return applyMarketCard({ kind: "BLACK", region: str(body, "region") as RegionCode, byTeamId: num(body, "byTeamId"), byToken });
    case "haunt": // 鬧鬼卡：單棟跌
      return applyMarketCard({ kind: "HAUNT", propertyId: num(body, "propertyId"), byTeamId: num(body, "byTeamId"), byToken });
    case "landgod": // 土地公卡：單棟漲
      return applyMarketCard({ kind: "LANDGOD", propertyId: num(body, "propertyId"), byTeamId: num(body, "byTeamId"), byToken });
    case "taxAudit": // 查稅卡：目標隊伍失去 10% 光幣
      return cardTaxAudit({ teamId: num(body, "teamId"), targetTeamId: num(body, "targetTeamId"), byToken });
    case "stealRandom": // 孫生媽媽卡：隨機偷光幣 / 卡牌點數 / 動產
      return cardStealRandom({ teamId: num(body, "teamId"), targetTeamId: num(body, "targetTeamId"), byToken });
    case "manualUse": // 遙控骰子卡 / 強力膠卡：系統只記錄流通，效果由關主人工執行
      return spendFunctionCardManual({
        teamId: num(body, "teamId"),
        cardType: str(body, "cardType"),
        targetTeamId: optNum(body, "targetTeamId") || undefined,
        byToken,
      });
    default:
      throw new Error("未知的卡片動作");
  }
});
