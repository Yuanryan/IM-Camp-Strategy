"use client";

import { postJson, ActionButton } from "@/components/client";
import type { RewardPreset, RewardTone } from "@/lib/game";

// 發獎 / 扣款的單一前端入口（後端統一走 /api/balance → adjustBalance）
export async function giveReward(p: {
  teamId: number;
  coins?: number;
  cardPoints?: number;
  note?: string;
}) {
  return postJson("/api/balance", {
    teamId: p.teamId,
    coins: p.coins ?? 0,
    cardPoints: p.cardPoints ?? 0,
    note: p.note,
  });
}

const TONE: Record<RewardTone, string> = {
  good: "bg-emerald-600 text-white hover:bg-emerald-500",
  bad: "bg-red-600 text-white hover:bg-red-500",
  gold: "bg-amber-500 text-white hover:bg-amber-400",
  spirit: "bg-emerald-500 text-white hover:bg-emerald-400",
};

// 一組預設獎勵按鈕。teamId 為 "" 時自動 disable。
export function RewardButtons({
  teamId,
  presets,
  onDone,
  disabled,
}: {
  teamId: number | "";
  presets: RewardPreset[];
  onDone?: () => void | Promise<unknown>;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {presets.map((p) => (
        <ActionButton
          key={p.label}
          label={p.label}
          className={p.tone ? TONE[p.tone] : ""}
          disabled={disabled || teamId === ""}
          onAction={async () => {
            if (teamId === "") return "請先選小隊";
            await giveReward({
              teamId,
              coins: p.coins,
              cardPoints: p.cardPoints,
              note: p.note ?? p.label,
            });
            await onDone?.();
            return p.label;
          }}
        />
      ))}
    </div>
  );
}
