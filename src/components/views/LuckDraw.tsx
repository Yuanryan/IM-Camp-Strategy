"use client";

import { useState, type ReactNode } from "react";
import { ActionButton, postJson } from "@/components/client";
import {
  GOOD_LUCK_CARDS,
  BAD_LUCK_CARDS,
  EffectType,
  stackEffects,
  applyGoodCardReward,
  applyBadCardPenalty,
  isInstantGood,
  isInstantBad,
  type GoodCard,
  type BadCard,
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
// ── 一張抽到的卡 + 是否為即時結算卡（可在面板就地處理）──────────────
export type DrawnCard =
  | { side: "good"; card: GoodCard; instant: boolean }
  | { side: "bad"; card: BadCard; instant: boolean };

// 隨機抽一張卡並分類即時 / 任務，供面板（即時）或任務分頁（任務）決定去向。
export function drawCard(side: "good" | "bad"): DrawnCard {
  if (side === "good") {
    const card = pick(GOOD_LUCK_CARDS);
    return { side, card, instant: isInstantGood(card) };
  }
  const card = pick(BAD_LUCK_CARDS);
  return { side, card, instant: isInstantBad(card) };
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

  const settle = async (delta: number, note: string): Promise<{ message: string; undo?: UndoRecipe }> => {
    if (team === "") return { message: "請先選小隊" };
    if (delta > 0) {
      // 好運卡：以光幣發放（卡面金額 × 動產效果）。
      const r = await postJson("/api/map/good-card", { teamId: team, baseReward: delta, note });
      await onDone();
      const who = curName ? `${curName} ` : "";
      const amt = r.finalReward as number;
      return { message: `${who}🪙 +${amt} 光幣`, undo: r.undo };
    }
    if (delta < 0) {
      const r = await postJson("/api/map/bad-card", { teamId: team, basePenalty: -delta, note });
      await onDone();
      const finalDelta = -r.finalPenalty;
      const suffix = finalDelta !== delta ? `（原 ${delta}，動產效果後 ${finalDelta}）` : `（${finalDelta}）`;
      return { message: `${curName ?? ""} ${note} ${suffix}`, undo: r.undo };
    }
    // delta === 0（好運卡 fail=0）：仍走 good-card API 記一筆
    const r = await postJson("/api/map/good-card", { teamId: team, baseReward: 0, note });
    await onDone();
    return { message: `${curName ?? ""} ${note}（無獎勵）`, undo: r.undo };
  };

  return { settle, goodLabel, badLabel };
}

type Settler = ReturnType<typeof useCardSettle>;

// ── 即時卡（面板就地處理）：直接獎勵好運卡 / 一翻兩瞪眼厄運卡 ────────────────
// onMapMove：move 類獎勵（前進 / 後退 / 傳送）改由地圖面板就地執行；onSettled：套用後收尾（清卡）。
export function InstantCardPanel({
  drawn,
  settler,
  team,
  event1,
  onMapMove,
  onSettled,
}: {
  drawn: DrawnCard;
  settler: Settler;
  team: number | "";
  event1: boolean;
  onMapMove?: (reward: GoodCard["reward"], card: GoodCard) => void;
  onSettled: () => void;
}) {
  const { settle, goodLabel, badLabel } = settler;
  const mult = event1 ? 2 : 1;
  const wrap = (action: () => Promise<{ message: string; undo?: UndoRecipe }>) => async () => {
    const r = await action();
    onSettled();
    return r;
  };

  if (drawn.side === "good") {
    const good = drawn.card;
    const reward = good.reward!;
    return (
      <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-3 ring-1 ring-amber-400/15">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-amber-400/20 px-2 py-0.5 text-[11px] font-bold text-amber-300">
            好運卡・直接獎勵
          </span>
          <span className="font-bold text-amber-100">{good.name}</span>
          <span className="chip px-1.5 py-0.5 text-xs">{good.difficulty}</span>
        </div>
        <p className="mb-3 text-sm text-slate-200">{good.rewardText}</p>
        {reward.kind === "coins" ? (
          <ActionButton
            label={goodLabel("領取", reward.amount)}
            className="w-full btn-emerald"
            disabled={team === ""}
            onAction={wrap(() => settle(reward.amount, `好運卡 ${good.name}（直接獎勵）`))}
          />
        ) : reward.kind === "move" && onMapMove ? (
          <button
            type="button"
            disabled={team === ""}
            onClick={() => { onMapMove(reward, good); onSettled(); }}
            className="w-full rounded-xl bg-cyan-500 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 active:scale-[0.98] disabled:opacity-40"
          >
            於地圖執行移動
          </button>
        ) : (
          <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-200/90">
            ⚑ 指示型獎勵：請到對應分頁（{REWARD_TAB_HINT[reward.kind]}）為該隊執行。
          </div>
        )}
      </div>
    );
  }

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
            disabled={team === ""}
            onAction={wrap(() => settle(-(o.deduct * mult), `厄運卡 ${bad.name}（${o.label}）`))}
          />
        ))}
      </div>
    </div>
  );
}

// ── 原「光源點 / 迷霧區」抽卡卡（地圖中控站分頁沿用）：抽好運 / 厄運，皆為即時卡就地呈現。 ──
export function LuckDraw({
  team,
  curName,
  event1,
  items = [],
  onDone,
}: {
  team: number | "";
  curName?: string;
  event1: boolean;
  items?: ActiveItemView[];
  onDone: () => void | Promise<unknown>;
}) {
  const [drawn, setDrawn] = useState<DrawnCard | null>(null);
  const settler = useCardSettle({ team, curName, items, onDone });
  const clear = () => setDrawn(null);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setDrawn(drawCard("good"))}
          className="btn-amber rounded-xl py-3 text-sm font-bold transition active:scale-95"
        >
          抽好運卡
        </button>
        <button
          onClick={() => setDrawn(drawCard("bad"))}
          className="btn-rose rounded-xl py-3 text-sm font-bold transition active:scale-95"
        >
          抽厄運卡
        </button>
      </div>

      {drawn && (
        <InstantCardPanel
          drawn={drawn}
          settler={settler}
          team={team}
          event1={event1}
          onSettled={clear}
        />
      )}

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
