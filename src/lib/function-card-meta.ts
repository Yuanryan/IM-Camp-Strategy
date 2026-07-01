// 功能卡（含原「市場卡」四張）統一 metadata：單一來源，供出卡 UI 依 FUNCTION_CARDS[].type / TeamCard.cardType 查詢
// action / 需要的目標選擇方式 / 說明文字，對接既有 /api/exchange/card 的 action 分發（後端不變）。

// single＝挑對手 1 塊地／dual＝來源(己方)+目標(對手)地／team＝挑目標隊伍／
// region＝挑區域（紅/黑卡）／property＝挑任一已售出不動產含自己（土地公/鬧鬼卡）／none＝無需挑選（純執行）
export type CardPicker = "single" | "dual" | "team" | "region" | "property" | "none";

export type FunctionCardMeta = {
  type: string; // 卡名，對應 FUNCTION_CARDS[].type / TeamCard.cardType
  action: string; // /api/exchange/card 的 action
  pickers: CardPicker;
  desc: string;
  // 紅/黑/鬧鬼/土地公卡：對應 snapshot.settings 的倍率欄位，UI 顯示目前幅度用
  multKey?: "cardRegionUpMult" | "cardRegionDownMult" | "cardBuildingUpMult" | "cardBuildingDownMult";
  // 手動效果卡（遙控骰子卡／強力膠卡）：系統只記錄流通，效果由關主人工執行
  manual?: boolean;
};

export const FUNCTION_CARD_META: FunctionCardMeta[] = [
  { type: "購地卡", action: "seizeLand", pickers: "single", desc: "強制收購對手一塊地（對手獲初始價 8 折補償，產權含等級轉給作用隊）" },
  { type: "換地卡", action: "swapLand", pickers: "dual", desc: "互換自己與對手的土地" },
  { type: "換屋卡", action: "swapHouse", pickers: "dual", desc: "兩棟房屋互換升級級別（產權不變）" },
  { type: "拆屋卡", action: "demolish", pickers: "single", desc: "降低對手一棟房屋等級一級" },
  { type: "怪獸卡", action: "monster", pickers: "single", desc: "摧毀對手一棟房屋，降回未購買" },
  { type: "查稅卡", action: "taxAudit", pickers: "team", desc: "強制目標隊伍失去 10% 光幣（銀行沒收）" },
  { type: "孫生媽媽卡", action: "stealRandom", pickers: "team", desc: "隨機三選一：偷走目標隊伍 10% 光幣 / 10% 卡牌點數 / 隨機 1 件動產" },
  { type: "強力膠卡", action: "manualUse", pickers: "team", desc: "目標隊伍連續 3 回合，每回合只能移動 1 格（由關主人工執行）", manual: true },
  { type: "遙控骰子卡", action: "manualUse", pickers: "none", desc: "移動擲骰時可指定點數為 1–6（由關主人工執行，效果作用於出卡隊自己）", manual: true },
  { type: "紅卡", action: "red", pickers: "region", desc: "選定一區，整區不動產現值上漲", multKey: "cardRegionUpMult" },
  { type: "黑卡", action: "black", pickers: "region", desc: "選定一區，整區不動產現值下跌", multKey: "cardRegionDownMult" },
  { type: "土地公卡", action: "landgod", pickers: "property", desc: "選定一棟房子，該棟現值上漲", multKey: "cardBuildingUpMult" },
  { type: "鬧鬼卡", action: "haunt", pickers: "property", desc: "選定一棟房子，該棟現值下跌", multKey: "cardBuildingDownMult" },
];

export function getFunctionCardMeta(type: string): FunctionCardMeta | undefined {
  return FUNCTION_CARD_META.find((m) => m.type === type);
}
