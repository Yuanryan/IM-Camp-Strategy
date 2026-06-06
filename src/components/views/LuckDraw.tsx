"use client";

import { useState } from "react";
import { ActionButton, postJson } from "@/components/client";
import { CustomGive } from "@/components/RewardPanel";
import { GOOD_LUCK_CARDS, BAD_LUCK_CARDS, type GoodCard, type BadCard, type UndoRecipe } from "@/lib/game";

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export function LuckDraw({
  team,
  curName,
  event1,
  onDone,
}: {
  team: number | "";
  curName?: string;
  event1: boolean;
  onDone: () => void | Promise<unknown>;
}) {
  const [good, setGood] = useState<GoodCard | null>(null);
  const [bad, setBad] = useState<BadCard | null>(null);
  const mult = event1 ? 2 : 1;

  const settle = async (delta: number, note: string): Promise<{ message: string; undo?: UndoRecipe }> => {
    if (team === "") return { message: "請先選小隊" };
    let finalDelta = delta;
    let undo: UndoRecipe | undefined;
    if (delta > 0) {
      const r = await postJson("/api/map/good-card", { teamId: team, baseReward: delta, note });
      finalDelta = r.finalReward;
      undo = r.undo;
    } else if (delta < 0) {
      const r = await postJson("/api/map/bad-card", { teamId: team, basePenalty: -delta, note });
      finalDelta = -r.finalPenalty;
      undo = r.undo;
    }
    await onDone();
    const suffix = finalDelta !== delta ? `（原 ${delta >= 0 ? "+" : ""}${delta}，動產效果後 ${finalDelta >= 0 ? "+" : ""}${finalDelta}）` : `（${finalDelta >= 0 ? "+" : ""}${finalDelta}）`;
    return { message: `${curName ?? ""} ${note} ${suffix}`, undo };
  };

  const drawn = good || bad;

  return (
    <div className="space-y-3">
      {/* Draw buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => { setBad(null); setGood(pick(GOOD_LUCK_CARDS)); }}
          className="btn-amber rounded-xl py-3 text-sm font-bold transition active:scale-95"
        >
          抽好運卡
        </button>
        <button
          onClick={() => { setGood(null); setBad(pick(BAD_LUCK_CARDS)); }}
          className="btn-rose rounded-xl py-3 text-sm font-bold transition active:scale-95"
        >
          抽厄運卡
        </button>
      </div>

      {/* Drawn card */}
      {good && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 ring-1 ring-amber-400/15">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-amber-400/20 px-2 py-0.5 text-[11px] font-bold text-amber-300">
              好運卡・光幣牌
            </span>
            <span className="font-bold text-amber-100">{good.name}</span>
            <span className="chip px-1.5 py-0.5 text-xs">{good.difficulty}</span>
            {event1 && (
              <span className="text-[11px] font-semibold text-amber-300">× 2（事件一）</span>
            )}
          </div>
          <p className="mb-1 text-sm text-slate-200">{good.task}</p>
          <p className="mb-3 text-xs text-slate-500">判定：{good.criteria}</p>
          <div className="grid grid-cols-2 gap-2">
            <ActionButton
              label={`成功  +${good.success * mult}`}
              className="w-full btn-emerald"
              disabled={team === ""}
              onAction={() => settle(good.success * mult, `好運卡 ${good.name}（成功）`)}
            />
            <ActionButton
              label={`失敗  +${good.fail * mult}`}
              className="w-full chip"
              disabled={team === ""}
              onAction={() => settle(good.fail * mult, `好運卡 ${good.name}（失敗）`)}
            />
          </div>
        </div>
      )}

      {bad && (
        <div className="rounded-xl border border-rose-400/30 bg-rose-500/5 p-4 ring-1 ring-rose-400/15">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-rose-500/20 px-2 py-0.5 text-[11px] font-bold text-rose-300">
              厄運卡・{bad.kind}
            </span>
            <span className="font-bold text-rose-100">{bad.name}</span>
            {bad.difficulty && (
              <span className="chip px-1.5 py-0.5 text-xs">{bad.difficulty}</span>
            )}
            {event1 && bad.kind === "扣錢牌" && (
              <span className="text-[11px] font-semibold text-amber-300">× 2（事件一）</span>
            )}
          </div>
          <p className="mb-1 text-sm text-slate-200">{bad.content}</p>
          {bad.criteria && (
            <p className="mb-3 text-xs text-slate-500">判定：{bad.criteria}</p>
          )}
          <div className={`grid gap-2 ${bad.outcomes.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
            {bad.outcomes.map((o, i) => (
              <ActionButton
                key={i}
                label={o.deduct > 0 ? `${o.label}  −${o.deduct * mult}` : `${o.label}（不扣）`}
                className={`w-full ${o.deduct > 0 ? "btn-rose" : "chip"}`}
                disabled={team === ""}
                onAction={() => settle(-(o.deduct * mult), `厄運卡 ${bad.name}（${o.label}）`)}
              />
            ))}
          </div>
        </div>
      )}

      {drawn && (
        <button
          onClick={() => { setGood(null); setBad(null); }}
          className="chip w-full py-2 text-xs hover:bg-white/15"
        >
          收起
        </button>
      )}

      {/* Custom give — always visible below draw area */}
      <div className="border-t border-white/10 pt-3">
        <div className="mb-2 text-xs font-semibold text-slate-400">自訂發獎 / 扣款</div>
        <CustomGive teamId={team} onDone={onDone} />
      </div>
    </div>
  );
}
