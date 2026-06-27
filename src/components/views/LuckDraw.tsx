"use client";

import { useState, type ReactNode } from "react";
import { ActionButton, postJson } from "@/components/client";
import {
  GOOD_LUCK_CARDS,
  BAD_LUCK_CARDS,
  TASK_GOOD_CARDS,
  CURSE_CARDS,
  MAX_OPEN_TASKS,
  EffectType,
  stackEffects,
  applyGoodCardReward,
  applyBadCardPenalty,
  isInstantGood,
  isInstantBad,
  isTaskGood,
  type GoodCard,
  type BadCard,
  type CurseCard,
  type TaskKind,
  type UndoRecipe,
} from "@/lib/game";
import type { ActiveItemView } from "@/lib/snapshot";

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
// 指示型直接獎勵 → 關主該到哪個分頁執行（coins 直接入帳，不在此表；move 由地圖面板就地執行）
const REWARD_TAB_HINT: Record<string, string> = {
  wheel: "命運輪盤",
  lottery: "大樂透",
  card: "神秘商店 / 直接發放",
  move: "地圖移動棋子",
};
// ── 一張抽到的卡 + 分類旗標 ──────────────
//  instant：可在面板就地結算的即時卡（直接獎勵好運卡 / 一翻兩瞪眼厄運卡）
//  task   ：任務目標型好運卡（抽到即登記，回合結算自動評估）
//  curse  ：詛咒卡（厄運抽到，登記即發詛咒道具；完成解咒任務 → 道具失效 + 獎勵）
export type DrawnCard =
  | { side: "good"; card: GoodCard; instant: boolean; task: boolean }
  | { side: "bad"; card: BadCard; instant: boolean; task: boolean }
  | { side: "curse"; card: CurseCard; instant: false; task: true };

// 隨機抽一張卡。
//  好運卡牌池＝直接獎勵卡 + 任務目標卡；厄運卡牌池＝直接懲罰牌 + 詛咒卡。
// open.kinds：該隊已有進行中的任務種類（避免同種堆疊）；open.count：進行中任務總數，
// 達 MAX_OPEN_TASKS 即整個任務池 / 詛咒池排除（只抽直接卡）。
export function drawCard(
  side: "good" | "bad",
  open: { kinds: Set<TaskKind>; count: number } = { kinds: new Set(), count: 0 },
): DrawnCard {
  const atCap = open.count >= MAX_OPEN_TASKS;
  if (side === "good") {
    // 任務已達上限 → 任務池整個排除；否則排除已進行中的種類。
    const taskPool = atCap
      ? []
      : TASK_GOOD_CARDS.filter((c) => c.taskKind && !open.kinds.has(c.taskKind));
    const card = pick([...GOOD_LUCK_CARDS, ...taskPool]);
    return { side, card, instant: isInstantGood(card), task: isTaskGood(card) };
  }
  // 厄運：直接懲罰牌 + 詛咒卡（達上限 / 同種已存在則排除該詛咒卡，避免堆疊）。
  const cursePool = atCap ? [] : CURSE_CARDS.filter((c) => !open.kinds.has(c.taskKind));
  const card = pick<BadCard | CurseCard>([...BAD_LUCK_CARDS, ...cursePool]);
  if (isCurseCard(card)) return { side: "curse", card, instant: false, task: true };
  return { side: "bad", card, instant: isInstantBad(card), task: false };
}

// 型別守衛：詛咒卡有 curseAsset / taskKind，直接懲罰牌（BadCard）沒有。
function isCurseCard(c: BadCard | CurseCard): c is CurseCard {
  return "curseAsset" in c;
}

// ── 結算 hook：把卡面金額（含動產效果、事件加倍）寫進後端，回傳統一的 settle / 預覽標籤 ──
// team / curName / items / onDone 由呼叫端提供；event1（×2）由呼叫端先乘進金額再傳入 settle。
export function useCardSettle({
  team,
  curName,
  items = [],
  onDone,
}: {
  team: number | "";
  curName?: string;
  items?: ActiveItemView[];
  onDone: () => void | Promise<unknown>;
}) {
  const goodDelta = stackEffects(
    items.filter((i) => i.effectType === EffectType.GOOD_CARD_BONUS).map((i) => i.effectValue),
  );
  const badDelta = stackEffects(
    items.filter((i) => i.effectType === EffectType.BAD_CARD_REDUCE).map((i) => i.effectValue),
  );

  // 預覽標籤：效果改變數值時，原值刪除線顯示在右側
  const goodLabel = (prefix: string, base: number): ReactNode => {
    const final = applyGoodCardReward(base, goodDelta);
    if (final === base) return `${prefix}  +${base}`;
    return (
      <>
        {prefix}  +{final}
        <s className="ml-1.5 opacity-60">+{base}</s>
      </>
    );
  };
  const badLabel = (prefix: string, base: number): ReactNode => {
    if (base <= 0) return `${prefix}（不扣）`;
    const final = applyBadCardPenalty(base, badDelta);
    if (final === base) return `${prefix}  −${final}`;
    return (
      <>
        {prefix}  −{final}
        <s className="ml-1.5 opacity-60">−{base}</s>
      </>
    );
  };

  const settle = async (delta: number, note: string): Promise<{ message: string; finalDelta: number; undo?: UndoRecipe }> => {
    if (team === "") return { message: "請先選小隊", finalDelta: 0 };
    if (delta > 0) {
      const r = await postJson("/api/map/good-card", { teamId: team, baseReward: delta, note });
      await onDone();
      const amt = r.finalReward as number;
      const who = curName ? `${curName} ` : "";
      return { message: `${who}🪙 +${amt} 光幣`, finalDelta: amt, undo: r.undo };
    }
    if (delta < 0) {
      const r = await postJson("/api/map/bad-card", { teamId: team, basePenalty: -delta, note });
      await onDone();
      const finalDelta = -(r.finalPenalty as number);
      const suffix = finalDelta !== delta ? `（原 ${delta}，動產效果後 ${finalDelta}）` : `（${finalDelta}）`;
      return { message: `${curName ?? ""} ${note} ${suffix}`, finalDelta, undo: r.undo };
    }
    const r = await postJson("/api/map/good-card", { teamId: team, baseReward: 0, note });
    await onDone();
    return { message: `${curName ?? ""} ${note}（無獎勵）`, finalDelta: 0, undo: r.undo };
  };

  return { settle, goodLabel, badLabel };
}

type Settler = ReturnType<typeof useCardSettle>;

// 「幸運彩券」面板：關主在此輸入號碼（1–50），免費登記一個大樂透號碼給該隊。
function FreeLotteryAction({
  team,
  lock,
  onSettled,
}: {
  team: number | "";
  lock: boolean;
  onSettled: (result?: { message: string; finalDelta?: number; undo?: UndoRecipe }) => void;
}) {
  const [number, setNumber] = useState("");
  const n = parseInt(number, 10);
  const valid = n >= 1 && n <= 50;
  return (
    <div className="flex gap-2">
      <input
        type="number"
        min={1}
        max={50}
        inputMode="numeric"
        value={number}
        onChange={(e) => setNumber(e.target.value)}
        placeholder="號碼 1–50"
        disabled={lock}
        className="w-24 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-400/60 disabled:opacity-40"
      />
      <ActionButton
        label="免費登記號碼"
        className="flex-1 btn-amber"
        disabled={lock || !valid}
        onAction={async () => {
          const r = await postJson("/api/map/free-lottery", { teamId: team, number: n });
          const result = { message: `🎟️ 已登記大樂透 ${n} 號`, undo: r.undo };
          onSettled(result);
          return result;
        }}
      />
    </div>
  );
}

// 免費獎勵 → 目標分頁中文名（路由按鈕文案用）。
const FREEBIE_ROUTE_LABEL: Record<"wheel" | "lottery" | "card", string> = {
  wheel: "命運輪盤",
  lottery: "大樂透",
  card: "神秘商店",
};

// ── 即時卡（面板就地處理）：直接獎勵好運卡 / 一翻兩瞪眼厄運卡 ────────────────
// onMapMove：move 類獎勵（前進 / 後退 / 傳送）改由地圖面板就地執行；
// onRouteReward：wheel / lottery / card 類獎勵改「導向對應分頁就地領取」（地圖流程用）；
//   未提供時退回面板就地的免費動作鈕（LuckDraw 中控站沿用）。
// onSettled：套用後收尾，帶回結算摘要（訊息 + undo）供呼叫端顯示總結算。
export function InstantCardPanel({
  drawn,
  settler,
  team,
  event1,
  settled = false,
  onMapMove,
  onRouteReward,
  onSettled,
}: {
  drawn: DrawnCard;
  settler: Settler;
  team: number | "";
  event1: boolean;
  settled?: boolean; // 已結算過 → 鎖住動作鈕，避免重複套用（卡面仍保留顯示）
  onMapMove?: (reward: GoodCard["reward"], card: GoodCard) => void;
  onRouteReward?: (kind: "wheel" | "lottery" | "card") => void;
  onSettled: (result?: { message: string; finalDelta?: number; undo?: UndoRecipe }) => void;
}) {
  const { settle, goodLabel, badLabel } = settler;
  const mult = event1 ? 2 : 1;
  const lock = team === "" || settled; // 動作鈕鎖定條件
  const wrap = (action: () => Promise<{ message: string; finalDelta?: number; undo?: UndoRecipe }>) => async () => {
    const r = await action();
    onSettled(r);
    return r;
  };

  if (drawn.side === "good") {
    const good = drawn.card;
    const reward = good.reward!;
    return (
      <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-3 ring-1 ring-amber-400/15">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-amber-400/20 px-2 py-0.5 text-[11px] font-bold text-amber-300">
            好運卡・獎勵
          </span>
          <span className="font-bold text-amber-100">{good.name}</span>
          <span className="chip px-1.5 py-0.5 text-xs">{good.difficulty}</span>
        </div>
        <p className="mb-3 text-sm text-slate-200">{good.rewardText}</p>
        {reward.kind === "coins" ? (
          <ActionButton
            label={goodLabel("領取", reward.amount)}
            className="w-full btn-emerald"
            disabled={lock}
            onAction={wrap(() => settle(reward.amount, `好運卡 ${good.name}（獎勵）`))}
          />
        ) : reward.kind === "move" && onMapMove ? (
          <button
            type="button"
            disabled={lock}
            onClick={() => { onMapMove(reward, good); onSettled(); }}
            className="w-full rounded-xl bg-cyan-500 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 active:scale-[0.98] disabled:opacity-40"
          >
            於地圖執行移動
          </button>
        ) : reward.kind === "card" && onRouteReward ? (
          // 神秘禮物（地圖流程）：先就地發五折券，再導向神秘商店使用。
          <ActionButton
            label="領取五折券並前往神秘商店"
            className="w-full btn-purple"
            disabled={lock}
            onAction={wrap(async () => {
              const r = await postJson("/api/map/gift-item", { teamId: team });
              onRouteReward("card");
              return { message: `🎁 已領取 ${r.name}：動產 / 功能卡首件 5 折`, undo: r.undo };
            })}
          />
        ) : (reward.kind === "wheel" || reward.kind === "lottery") && onRouteReward ? (
          // 地圖流程：導向對應分頁就地領取（免費轉盤 / 免費登記）。
          <button
            type="button"
            disabled={lock}
            onClick={() => onRouteReward(reward.kind as "wheel" | "lottery")}
            className="w-full rounded-xl bg-cyan-500 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 active:scale-[0.98] disabled:opacity-40"
          >
            前往「{FREEBIE_ROUTE_LABEL[reward.kind]}」
          </button>
        ) : reward.kind === "wheel" ? (
          <ActionButton
            label="免費轉輪盤"
            className="w-full btn-amber"
            disabled={lock}
            onAction={wrap(async () => {
              const r = await postJson("/api/map/free-wheel", { teamId: team });
              return { message: `🎡 輪盤 ×${r.mult} → 🪙 +${r.reward} 光幣`, finalDelta: r.reward as number, undo: r.undo };
            })}
          />
        ) : reward.kind === "lottery" ? (
          <FreeLotteryAction team={team} lock={lock} onSettled={onSettled} />
        ) : reward.kind === "card" ? (
          <ActionButton
            label="領取五折券"
            className="w-full btn-purple"
            disabled={lock}
            onAction={wrap(async () => {
              const r = await postJson("/api/map/gift-item", { teamId: team });
              return { message: `🎁 已領取 ${r.name}：購買動產首件 5 折`, undo: r.undo };
            })}
          />
        ) : (
          <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-200/90">
            ⚑ 指示型獎勵：請到對應分頁（{REWARD_TAB_HINT[reward.kind]}）為該隊執行。
          </div>
        )}
      </div>
    );
  }

  // 詛咒卡不在此面板處理（由 CursePanel 負責）；防呆。
  if (drawn.side === "curse") return null;
  // 即時厄運卡：無題庫 / 無判定，一鍵套用各 outcome。
  const bad = drawn.card;
  return (
    <div className="rounded-xl border border-rose-400/30 bg-rose-500/5 p-3 ring-1 ring-rose-400/15">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-rose-500/20 px-2 py-0.5 text-[11px] font-bold text-rose-300">
          厄運卡・{bad.kind}
        </span>
        <span className="font-bold text-rose-100">{bad.name}</span>
        {bad.difficulty && <span className="chip px-1.5 py-0.5 text-xs">{bad.difficulty}</span>}
        {event1 && bad.kind === "扣錢牌" && (
          <span className="text-[11px] font-semibold text-amber-300">× 2（事件一）</span>
        )}
      </div>
      <p className="mb-3 text-sm text-slate-200">{bad.content}</p>
      <div className={`grid gap-2 ${bad.outcomes.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
        {bad.outcomes.map((o, i) => (
          <ActionButton
            key={i}
            label={badLabel(o.label, o.deduct * mult)}
            className={`w-full ${o.deduct > 0 ? "btn-rose" : "chip"}`}
            disabled={lock}
            onAction={wrap(() => settle(-(o.deduct * mult), `厄運卡 ${bad.name}（${o.label}）`))}
          />
        ))}
      </div>
    </div>
  );
}

// ── 任務目標型好運卡：按「發放任務」登記目標（記下 since-draw 基準），達成後回合結算自動發獎。──
// 此面板不發獎，只負責登記任務；登記成功後呼叫 onRegistered，已登記則鎖住按鈕。
export function TaskObjectivePanel({
  drawn,
  team,
  registered = false,
  onRegistered,
}: {
  drawn: Extract<DrawnCard, { side: "good" }>;
  team: number | "";
  registered?: boolean; // 已登記過 → 鎖住「發放任務」鈕（卡面仍保留顯示）
  onRegistered?: () => void;
}) {
  const good = drawn.card;

  const register = async (): Promise<{ message: string }> => {
    if (team === "") return { message: "請先選小隊" };
    await postJson("/api/map/objective", { teamId: team, cardName: good.name });
    onRegistered?.();
    return { message: `已發放任務・${good.name}` };
  };

  return (
    <div className="rounded-xl border border-violet-400/30 bg-violet-500/5 p-3 ring-1 ring-violet-400/15">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-violet-500/20 px-2 py-0.5 text-[11px] font-bold text-violet-300">
          好運卡・任務目標
        </span>
        <span className="font-bold text-violet-100">{good.name}</span>
      </div>
      <p className="mb-3 text-sm text-slate-200">{good.rewardText}</p>
      <ActionButton
        label={registered ? "已發放任務" : "發放任務"}
        className="w-full btn-purple"
        disabled={team === "" || registered}
        onAction={register}
      />
    </div>
  );
}

// ── 詛咒卡：按「套用詛咒」登記 → 立刻發詛咒道具（負面效果生效中）並登記解咒任務。──
// 完成解咒任務後回合結算會自動令詛咒道具失效並發 rewardCoins 補償。此面板只負責登記。
export function CursePanel({
  drawn,
  team,
  registered = false,
  onRegistered,
}: {
  drawn: Extract<DrawnCard, { side: "curse" }>;
  team: number | "";
  registered?: boolean;
  onRegistered?: () => void;
}) {
  const curse = drawn.card;

  const register = async (): Promise<{ message: string }> => {
    if (team === "") return { message: "請先選小隊" };
    await postJson("/api/map/curse", { teamId: team, cardName: curse.name });
    onRegistered?.();
    return { message: `已套用詛咒・${curse.name}` };
  };

  return (
    <div className="rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/5 p-3 ring-1 ring-fuchsia-500/15">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-fuchsia-600/25 px-2 py-0.5 text-[11px] font-bold text-fuchsia-200">
          厄運卡・詛咒
        </span>
        <span className="font-bold text-fuchsia-100">{curse.name}</span>
      </div>
      <p className="mb-1 text-sm text-rose-200">☠ {curse.curseText}</p>
      <p className="mb-3 text-sm text-slate-200">解咒：{curse.taskText}</p>
      <ActionButton
        label={registered ? "已套用詛咒" : "套用詛咒"}
        className="w-full btn-rose"
        disabled={team === "" || registered}
        onAction={register}
      />
    </div>
  );
}

// ── 原「光源點 / 迷霧區」抽卡卡（地圖中控站分頁沿用）：抽好運 / 厄運，皆為即時卡就地呈現。 ──
export function LuckDraw({
  team,
  curName,
  event1,
  items = [],
  openTasks = [],
  onDone,
}: {
  team: number | "";
  curName?: string;
  event1: boolean;
  items?: ActiveItemView[];
  openTasks?: { taskKind: TaskKind }[]; // 該隊進行中的任務（抽好運卡時排除同種、達上限不抽任務）
  onDone: () => void | Promise<unknown>;
}) {
  const [drawn, setDrawn] = useState<DrawnCard | null>(null);
  const settler = useCardSettle({ team, curName, items, onDone });
  const clear = () => setDrawn(null);
  const openArg = { kinds: new Set(openTasks.map((o) => o.taskKind)), count: openTasks.length };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setDrawn(drawCard("good", openArg))}
          className="btn-amber rounded-xl py-3 text-sm font-bold transition active:scale-95"
        >
          抽好運卡
        </button>
        <button
          onClick={() => setDrawn(drawCard("bad", openArg))}
          className="btn-rose rounded-xl py-3 text-sm font-bold transition active:scale-95"
        >
          抽厄運卡
        </button>
      </div>

      {drawn && drawn.side === "good" && drawn.task ? (
        <TaskObjectivePanel drawn={drawn} team={team} onRegistered={() => { void onDone(); clear(); }} />
      ) : drawn && drawn.side === "curse" ? (
        <CursePanel drawn={drawn} team={team} onRegistered={() => { void onDone(); clear(); }} />
      ) : drawn ? (
        <InstantCardPanel
          drawn={drawn}
          settler={settler}
          team={team}
          event1={event1}
          onSettled={clear}
        />
      ) : null}

      {drawn && (
        <button
          onClick={clear}
          className="chip w-full py-2 text-xs hover:bg-white/15"
        >
          收起
        </button>
      )}
    </div>
  );
}
