"use client";

import { useState } from "react";
import { ActionButton } from "@/components/client";
import { giveReward, CustomGive } from "@/components/RewardPanel";
import { GOOD_LUCK_CARDS, BAD_LUCK_CARDS, type GoodCard, type BadCard } from "@/lib/game";

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// 光源點 / 迷霧區抽卡並結算（會動到光幣的卡）
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

  const settle = async (delta: number, note: string) => {
    if (team === "") return "請先選小隊";
    if (delta !== 0) await giveReward({ teamId: team, coins: delta, note });
    await onDone();
    return `${curName ?? ""} ${note}（${delta >= 0 ? "+" : ""}${delta} 光幣）`;
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => { setBad(null); setGood(pick(GOOD_LUCK_CARDS)); }}
          className="rounded-lg bg-amber-500/90 px-4 py-2 text-sm font-bold text-slate-950 transition active:scale-95 hover:bg-amber-400">
          抽好運卡
        </button>
        <button onClick={() => { setGood(null); setBad(pick(BAD_LUCK_CARDS)); }}
          className="rounded-lg bg-rose-500/80 px-4 py-2 text-sm font-bold text-white transition active:scale-95 hover:bg-rose-500">
          抽厄運卡
        </button>
        {(good || bad) && (
          <button onClick={() => { setGood(null); setBad(null); }} className="chip px-4 py-2 text-sm">收起</button>
        )}
      </div>

      {good && (
        <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/5 p-3 ring-1 ring-amber-400/20">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-amber-300/80">好運卡・光幣牌</span>
            <span className="font-bold text-amber-200">{good.name}</span>
            <span className="chip px-1.5 py-0.5 text-xs">{good.difficulty}</span>
          </div>
          <p className="mt-1 text-sm text-slate-200">{good.task}</p>
          <p className="mt-0.5 text-xs text-slate-500">判定：{good.criteria}{event1 && "　•　事件一加倍 ×2"}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <ActionButton label={`成功 +${good.success * mult}`} className="bg-emerald-600 text-white hover:bg-emerald-500"
              disabled={team === ""} onAction={() => settle(good.success * mult, `好運卡 ${good.name}（成功）`)} />
            <ActionButton label={`失敗 +${good.fail * mult}`} className="chip"
              disabled={team === ""} onAction={() => settle(good.fail * mult, `好運卡 ${good.name}（失敗）`)} />
          </div>
        </div>
      )}

      {bad && (
        <div className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/5 p-3 ring-1 ring-rose-400/20">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-rose-300/80">厄運卡・{bad.kind}</span>
            <span className="font-bold text-rose-200">{bad.name}</span>
            {bad.difficulty && <span className="chip px-1.5 py-0.5 text-xs">{bad.difficulty}</span>}
          </div>
          <p className="mt-1 text-sm text-slate-200">{bad.content}</p>
          {bad.criteria && <p className="mt-0.5 text-xs text-slate-500">判定：{bad.criteria}</p>}
          {event1 && <p className="mt-0.5 text-xs text-amber-300">事件一：扣錢 ×2</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            {bad.outcomes.map((o, i) => (
              <ActionButton key={i}
                label={o.deduct > 0 ? `${o.label} −${o.deduct * mult}` : `${o.label}（不扣）`}
                className={o.deduct > 0 ? "bg-rose-500/20 text-rose-200 hover:bg-rose-500/30" : "chip"}
                disabled={team === ""}
                onAction={() => settle(-o.deduct * mult, `厄運卡 ${bad.name}（${o.label}）`)} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 border-t border-white/10 pt-3">
        <div className="mb-2 text-xs font-semibold text-slate-400">自訂發獎 / 扣款</div>
        <CustomGive teamId={team} onDone={onDone} />
      </div>
    </div>
  );
}
