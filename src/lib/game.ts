// 遊戲規則與資料（單一事實來源）

export type RegionCode = "AURORA" | "SPECTRA" | "EMBER" | "HAVEN";

export const REGIONS: { code: RegionCode; name: string; theme: string }[] = [
  { code: "AURORA", name: "極光金域", theme: "金融 / 商業 / 交易" },
  { code: "SPECTRA", name: "靈序研究", theme: "科技 / 資料 / 通訊" },
  { code: "EMBER", name: "影焰工域", theme: "能源 / 製造 / 物流" },
  { code: "HAVEN", name: "晨霧棲城", theme: "住宅 / 醫療 / 教育" },
];

// 四區具象化配色（深色霓虹）：極光金=琥珀、靈序=賽博藍、影焰=工業紅、晨霧=翡翠
export const REGION_UI: Record<
  RegionCode,
  { text: string; border: string; chipBg: string; panel: string; dot: string }
> = {
  AURORA: {
    text: "text-amber-400",
    border: "border-amber-500/40",
    chipBg: "bg-amber-500/15 text-amber-300",
    panel: "from-amber-500/15 to-transparent border-amber-500/30",
    dot: "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]",
  },
  SPECTRA: {
    text: "text-cyan-400",
    border: "border-cyan-500/40",
    chipBg: "bg-cyan-500/15 text-cyan-300",
    panel: "from-cyan-500/15 to-transparent border-cyan-500/30",
    dot: "bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]",
  },
  EMBER: {
    text: "text-rose-500",
    border: "border-rose-600/40",
    chipBg: "bg-rose-500/15 text-rose-300",
    panel: "from-rose-600/15 to-transparent border-rose-600/30",
    dot: "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]",
  },
  HAVEN: {
    text: "text-emerald-400",
    border: "border-emerald-500/40",
    chipBg: "bg-emerald-500/15 text-emerald-300",
    panel: "from-emerald-500/15 to-transparent border-emerald-500/30",
    dot: "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]",
  },
};

export const REGION_NAME: Record<RegionCode, string> = {
  AURORA: "極光金域",
  SPECTRA: "靈序研究",
  EMBER: "影焰工域",
  HAVEN: "晨霧棲城",
};

// 初始價一律採「四區域不動產表」
export const PROPERTY_SEED: {
  name: string;
  region: RegionCode;
  type: string;
  basePrice: number;
}[] = [
  // 極光金域
  { name: "天穹銀行", region: "AURORA", type: "金融", basePrice: 550 },
  { name: "星幣當舖", region: "AURORA", type: "金融", basePrice: 350 },
  { name: "星穹百貨", region: "AURORA", type: "商業", basePrice: 350 },
  { name: "鑽石金街", region: "AURORA", type: "商業", basePrice: 400 },
  { name: "流金廣場", region: "AURORA", type: "商業", basePrice: 300 },
  { name: "金霧投資中心", region: "AURORA", type: "投資", basePrice: 500 },
  { name: "光軌商貿站", region: "AURORA", type: "商貿", basePrice: 350 },
  { name: "晶瑩會展中心", region: "AURORA", type: "展覽", basePrice: 450 },
  // 靈序研究
  { name: "靈光實驗塔", region: "SPECTRA", type: "研究", basePrice: 450 },
  { name: "鏡域模擬中心", region: "SPECTRA", type: "研究", basePrice: 600 },
  { name: "量子通訊所", region: "SPECTRA", type: "通訊", basePrice: 550 },
  { name: "星鏈研究院", region: "SPECTRA", type: "通訊", basePrice: 550 },
  { name: "深井資料庫", region: "SPECTRA", type: "資料", basePrice: 500 },
  { name: "星圖資料分析局", region: "SPECTRA", type: "資料", basePrice: 600 },
  { name: "天穹機器人中心", region: "SPECTRA", type: "AI", basePrice: 400 },
  { name: "幻網開發場", region: "SPECTRA", type: "網路", basePrice: 450 },
  // 影焰工域
  { name: "黑焰能源棧", region: "EMBER", type: "能源", basePrice: 650 },
  { name: "影焰發電廠", region: "EMBER", type: "能源", basePrice: 650 },
  { name: "熔光工坊", region: "EMBER", type: "製造", basePrice: 450 },
  { name: "剛霧鍛造場", region: "EMBER", type: "製造", basePrice: 550 },
  { name: "霧鐵礦場", region: "EMBER", type: "原料", basePrice: 500 },
  { name: "光軌運輸站", region: "EMBER", type: "物流", basePrice: 500 },
  { name: "夜航貨櫃碼頭", region: "EMBER", type: "物流", basePrice: 550 },
  { name: "灰燼儲倉", region: "EMBER", type: "物流", basePrice: 450 },
  // 晨霧棲城
  { name: "晨曦住宅苑", region: "HAVEN", type: "住宅", basePrice: 500 },
  { name: "微光美提花園", region: "HAVEN", type: "住宅", basePrice: 500 },
  { name: "月灣公寓", region: "HAVEN", type: "住宅", basePrice: 450 },
  { name: "綠霧圖書館", region: "HAVEN", type: "教育", basePrice: 500 },
  { name: "湖畔小學", region: "HAVEN", type: "教育", basePrice: 500 },
  { name: "青燈療養院", region: "HAVEN", type: "醫療", basePrice: 600 },
  { name: "安森運動中心", region: "HAVEN", type: "運動", basePrice: 450 },
  { name: "晨露咖啡街", region: "HAVEN", type: "飲食", basePrice: 450 },
];

// 市場事件倍率（只取企畫書的「% 效果」，初始價一律用四區域表）
// regionMult：整區倍率；typeMult：類型額外倍率（可與整區疊乘）
export type EventDef = {
  index: number;
  name: string;
  news: string;
  regionMult: Partial<Record<RegionCode, number>>;
  typeMult: Record<string, number>;
  // 事件四：對「主持人選定的區域」額外套用此倍率
  hostPenaltyMult?: number;
};

export const EVENTS: Record<number, EventDef> = {
  1: {
    index: 1,
    name: "事件一：晨霧退散，資金湧入金域",
    news: "極光金域上漲，晨霧棲城下跌。",
    regionMult: { AURORA: 1.25, HAVEN: 0.9 },
    typeMult: { 金融: 1.1, 商業: 1.1, 投資: 1.1, 商貿: 1.1, 展覽: 1.1 },
  },
  2: {
    index: 2,
    name: "事件二：影焰工廠爆產，污染疑雲",
    news: "影焰工域上漲，住宅與教育下跌；光靈系統啟動。",
    regionMult: { EMBER: 1.3 },
    typeMult: { 能源: 1.1, 製造: 1.1, 物流: 1.1, 住宅: 0.85, 教育: 0.85 },
  },
  3: {
    index: 3,
    name: "事件三：靈序突破，科技資產暴漲",
    news: "靈序研究上漲，傳統商業服務下跌；流動關站開始機率發特殊骰。",
    regionMult: { SPECTRA: 1.3 },
    typeMult: {
      研究: 1.1,
      資料: 1.1,
      通訊: 1.1,
      AI: 1.1,
      網路: 1.1,
      商業: 0.9,
      飲食: 0.9,
    },
  },
  4: {
    index: 4,
    name: "事件四：城市民生補助，棲城翻身",
    news: "晨霧棲城上漲，前次漲最多區域下跌；政府拍賣啟動。",
    regionMult: { HAVEN: 1.3 },
    typeMult: { 住宅: 1.1, 醫療: 1.1, 教育: 1.1 },
    hostPenaltyMult: 0.85,
  },
};

export function parseActiveEvents(csv: string): number[] {
  return csv
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n));
}

// 計算單一不動產現值
export function currentValue(
  prop: { basePrice: number; region: string; type: string },
  activeEvents: number[],
  event4Penalty?: string | null,
): number {
  let v = prop.basePrice;
  for (const idx of activeEvents) {
    const ev = EVENTS[idx];
    if (!ev) continue;
    const rm = ev.regionMult[prop.region as RegionCode];
    if (rm) v *= rm;
    const tm = ev.typeMult[prop.type];
    if (tm) v *= tm;
    if (idx === 4 && ev.hostPenaltyMult && event4Penalty === prop.region) {
      v *= ev.hostPenaltyMult;
    }
  }
  return Math.round(v);
}

export function roundTo50(n: number): number {
  return Math.round(n / 50) * 50;
}

// 升級費用：購買=base；1級=base×20%；2級=40%；3級=60%（四捨五入到 50）
// 傳入「目前等級」回傳升到下一級的費用；level 3 不可再升
export function upgradeFee(basePrice: number, currentLevel: number): number | null {
  const rate: Record<number, number> = { 0: 0.2, 1: 0.4, 2: 0.6 };
  if (!(currentLevel in rate)) return null;
  return roundTo50(basePrice * rate[currentLevel]);
}

// 大樂透加購費：50 × 2^(已登記號碼數 - 1)；第一個免費
export function lotteryFee(alreadyOwnedCount: number): number {
  if (alreadyOwnedCount <= 0) return 0;
  return 50 * Math.pow(2, alreadyOwnedCount - 1);
}

// 命運投資輪盤倍率與機率（x5 低機率）
export const WHEEL_OUTCOMES: { mult: number; weight: number }[] = [
  { mult: 0, weight: 25 },
  { mult: 0.5, weight: 20 },
  { mult: 1, weight: 35 },
  { mult: 2, weight: 10 },
  { mult: 5, weight: 3 },
  { mult: 10, weight: 2 },
];

export function spinWheel(): number {
  const total = WHEEL_OUTCOMES.reduce((s, o) => s + o.weight, 0);
  let r = Math.random() * total;
  for (const o of WHEEL_OUTCOMES) {
    if (r < o.weight) return o.mult;
    r -= o.weight;
  }
  return 1;
}

// ── 好運卡 / 厄運卡（光源點 / 迷霧區抽卡）─────────────────────
// 二驗：刪動產、情報牌實體發放，這裡只收「會動到光幣」的卡。
export type GoodCard = {
  name: string;
  task: string;
  difficulty: string;
  success: number; // 成功獎勵光幣
  fail: number; // 失敗獎勵光幣
  criteria: string; // 判定
};

export type BadOutcome = { label: string; deduct: number }; // deduct 為要扣的光幣（正數）
export type BadCard = {
  name: string;
  kind: "扣錢牌" | "懲罰任務牌";
  content: string; // 扣錢牌＝減免任務；懲罰牌＝懲罰內容
  difficulty?: string;
  criteria?: string;
  outcomes: BadOutcome[];
};

// 好運卡：光幣牌
export const GOOD_LUCK_CARDS: GoodCard[] = [
  { name: "晨光大禮", task: "跟關主猜拳，過半數隊員贏過關主", difficulty: "簡單", success: 150, fail: 0, criteria: "半數以上勝利" },
  { name: "繁星獎池", task: "冷知識 5 題答對 3 題", difficulty: "中等", success: 250, fail: 0, criteria: "答對 3 題" },
  { name: "資本大賞", task: "全隊用身體呈現指定國字，隊輔猜出 3 題", difficulty: "中等", success: 300, fail: 0, criteria: "猜出 3 題" },
  { name: "光幣雙倍", task: "繞口令完成 3 題", difficulty: "中等", success: 300, fail: 0, criteria: "完成 3 題" },
  { name: "迷霧財寶", task: "說出 10 位工人的本名", difficulty: "困難", success: 500, fail: 100, criteria: "名字正確" },
  { name: "福星高照", task: "比手畫腳，3 分鐘內猜對 8 題", difficulty: "中等", success: 300, fail: 0, criteria: "猜對 8 題" },
  { name: "默契滿分", task: "默契大考驗（關鍵字全隊同動作），完成 3 題", difficulty: "簡單", success: 150, fail: 0, criteria: "完成 3 題" },
];

// 厄運卡：扣錢牌 + 懲罰任務牌
export const BAD_LUCK_CARDS: BadCard[] = [
  { name: "迷霧收費站", kind: "扣錢牌", content: "減免任務：猜拳，過半數隊員贏過關主", criteria: "半數以上勝利", outcomes: [{ label: "未完成", deduct: 200 }, { label: "完成減免", deduct: 100 }] },
  { name: "資本寒流", kind: "扣錢牌", content: "減免任務：每人做 15 下波比跳", criteria: "全員完成", outcomes: [{ label: "未完成", deduct: 300 }, { label: "完成減免", deduct: 100 }] },
  { name: "黑市稅捐", kind: "扣錢牌", content: "減免任務：繞口令完成 2 題", criteria: "完成 2 題", outcomes: [{ label: "未完成", deduct: 200 }, { label: "完成減免", deduct: 100 }] },
  { name: "迷霧罰款", kind: "扣錢牌", content: "減免任務：冷知識 5 題答對 3 題", criteria: "答對 3 題", outcomes: [{ label: "未完成", deduct: 100 }, { label: "完成減免", deduct: 50 }] },
  { name: "暗影徵收", kind: "扣錢牌", content: "減免任務：默契大考驗 5 題完成 3 題", criteria: "完成 3 題", outcomes: [{ label: "未完成", deduct: 100 }, { label: "完成減免", deduct: 50 }] },
  { name: "影焰稅單", kind: "扣錢牌", content: "減免任務：說出 10 位工人的本名", criteria: "名字正確", outcomes: [{ label: "未完成", deduct: 100 }, { label: "完成減免", deduct: 0 }] },
  { name: "大頭貼時刻", kind: "懲罰任務牌", content: "全隊鬼臉五連拍，關主拍照存檔", difficulty: "簡單", outcomes: [{ label: "完成", deduct: 0 }, { label: "未完成", deduct: 100 }] },
  { name: "訓練時間", kind: "懲罰任務牌", content: "每人捲腹 10 下", difficulty: "簡單", outcomes: [{ label: "完成", deduct: 0 }, { label: "未完成", deduct: 100 }] },
  { name: "神秘書法家", kind: "懲罰任務牌", content: "用屁股寫指定國字，隊輔猜對才完成", difficulty: "中等", outcomes: [{ label: "猜中", deduct: 0 }, { label: "沒猜中", deduct: 100 }] },
  { name: "霧中魅力秀", kind: "懲罰任務牌", content: "輪流擺自選姿勢，關主評分", difficulty: "簡單", outcomes: [{ label: "及格", deduct: 0 }, { label: "不及格", deduct: 200 }] },
  { name: "影焰跳操", kind: "懲罰任務牌", content: "每人開合跳 20 下", difficulty: "中等", outcomes: [{ label: "完成", deduct: 0 }, { label: "未完成", deduct: 100 }] },
  { name: "友善外交", kind: "懲罰任務牌", content: "找三個工人，分別說出各自三個優點", difficulty: "簡單", outcomes: [{ label: "完成", deduct: 0 }, { label: "沒說", deduct: 400 }] },
  { name: "美麗指數", kind: "懲罰任務牌", content: "說出本隊最帥或最美的人並說明理由", difficulty: "簡單", outcomes: [{ label: "完成", deduct: 0 }] },
  { name: "部首大考驗", kind: "懲罰任務牌", content: "90 秒內寫出指定數量含該部首的字", difficulty: "困難", outcomes: [{ label: "完成", deduct: 0 }, { label: "失敗", deduct: 100 }] },
];

// 功能卡清單（cost = 卡牌點數，企畫書未定，預設值可於 admin 調整）
export const FUNCTION_CARDS: {
  type: string;
  effect: string;
  cost: number;
  defaultStock: number;
}[] = [
  { type: "購地卡", effect: "強制收購對手一塊土地", cost: 30, defaultStock: 4 },
  { type: "換地卡", effect: "以己方土地與對手土地交換", cost: 25, defaultStock: 4 },
  { type: "換屋卡", effect: "交換房屋升級級別", cost: 20, defaultStock: 4 },
  { type: "拆屋卡", effect: "拆除對手一層房屋", cost: 25, defaultStock: 4 },
  { type: "怪獸卡", effect: "摧毀對手一棟房屋", cost: 40, defaultStock: 3 },
  { type: "護盾卡", effect: "抵擋一次卡牌攻擊或過路費", cost: 20, defaultStock: 6 },
  { type: "情蒐卡", effect: "獲得指定對手資訊", cost: 15, defaultStock: 6 },
  { type: "加速骰", effect: "立即獲得 1 顆普通骰", cost: 10, defaultStock: 8 },
  { type: "市場預警卡", effect: "得知下一次事件前某區漲跌方向", cost: 25, defaultStock: 4 },
  { type: "大樂透加購卡", effect: "額外登記一個大樂透號碼", cost: 15, defaultStock: 4 },
];

// 發放獎勵 / 懲罰的快捷預設（資料化，單一來源；前端共用元件 RewardButtons 讀取）
// 幾秒內可撤銷的「反悔配方」：只帶要回沖的 ledger 列 id 與（選用）不動產原狀態。
// 金額一律由伺服器照 ledger 列的 -delta 反推，不信任前端帶的數字。
export type UndoRecipe = {
  label: string;
  ledgerIds: number[];
  property?: { id: number; ownerTeamId: number | null; level: number };
};

export type RewardTone = "good" | "bad" | "gold" | "spirit";
export type RewardPreset = {
  label: string;
  coins?: number;
  cardPoints?: number;
  note?: string; // 寫入總帳的備註；省略則用 label
  tone?: RewardTone;
};

export const MAP_REWARD_PRESETS: RewardPreset[] = [
  { label: "中央燈塔 +300光幣 +30點", coins: 300, cardPoints: 30, tone: "gold" },
  { label: "契約贊助 +100", coins: 100, tone: "good" },
  { label: "契約違約 -100", coins: -100, tone: "bad" },
  { label: "光源點 +200", coins: 200, tone: "good" },
  { label: "迷霧區 -200", coins: -200, tone: "bad" },
  { label: "財靈 +150", coins: 150, tone: "spirit" },
];

export const MOBILE_REWARD_PRESETS: RewardPreset[] = [
  { label: "光幣 +200", coins: 200, note: "小遊戲獎勵 光幣", tone: "good" },
  { label: "卡牌點數 +20", cardPoints: 20, note: "小遊戲獎勵 卡牌點數", tone: "good" },
];

// 角色定義
export const ROLES = [
  "HOST",
  "EXCHANGE",
  "MAP",
  "MOBILE",
  "CARDSHOP",
  "LOTTERY",
  "PROJECTION",
  "ADMIN",
  "TEAM",
] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_HOME: Record<Role, string> = {
  HOST: "/host",
  EXCHANGE: "/exchange",
  MAP: "/map",
  MOBILE: "/mobile",
  CARDSHOP: "/shop",
  LOTTERY: "/lottery",
  PROJECTION: "/projection",
  ADMIN: "/admin",
  TEAM: "/team",
};

export const ROLE_LABEL: Record<Role, string> = {
  HOST: "主持人",
  EXCHANGE: "交易所",
  MAP: "地圖關主",
  MOBILE: "流動關主",
  CARDSHOP: "卡牌商店",
  LOTTERY: "大樂透",
  PROJECTION: "投影",
  ADMIN: "Admin",
  TEAM: "小隊",
};
