"use client";

import { useState } from "react";
import { postJson, ActionButton } from "@/components/client";
import type { RewardPreset, RewardTone, UndoRecipe } from "@/lib/game";

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
  good:   "btn-emerald",
  bad:    "btn-rose",
  gold:   "btn-amber",
  spirit: "btn-emerald",
};

// 自訂金額發獎 / 扣款（任何發獎處都可放，留一點彈性空間）
export function CustomGive({
  teamId,
  onDone,
  points = true,
  endpoint = "/api/balance",
}: {
  teamId: number | "";
  onDone?: () => void | Promise<unknown>;
  points?: boolean;
  endpoint?: string;
}) {
  const [amt, setAmt] = useState(0);
  const give = async (kind: "coins" | "cardPoints", label: string) => {
    if (teamId === "") return "請先選小隊";
    if (amt === 0) return "請先輸入金額";
    const msg = `自訂${label} ${amt >= 0 ? "+" : ""}${amt}`;
    const r = await postJson(endpoint, {
      teamId,
      coins: kind === "coins" ? amt : 0,
      cardPoints: kind === "cardPoints" ? amt : 0,
      note: msg,
    });
    await onDone?.();
    setAmt(0);
    return { message: endpoint === "/api/balance" ? msg : `${msg}${r.doubled !== null ? `（${r.doubled ? "雙倍！" : "歸零…"}）` : ""}`, undo: r.undo as UndoRecipe | undefined };
  };
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="text-xs text-slate-400">
        <input type="number" inputMode="numeric" value={amt}
          onChange={(e) => setAmt(Number(e.target.value) || 0)} className="fld w-28" />
      </label>
      <ActionButton label="給光幣" className="btn-amber"
        disabled={teamId === ""} onAction={() => give("coins", "光幣")} />
      {points && (
        <ActionButton label="給點數" className="chip" disabled={teamId === ""}
          onAction={() => give("cardPoints", "卡牌點數")} />
      )}
    </div>
  );
}

// 一組預設獎勵按鈕。teamId 為 "" 時自動 disable。
export function RewardButtons({
  teamId,
  presets,
  onDone,
  disabled,
  endpoint = "/api/balance",
}: {
  teamId: number | "";
  presets: RewardPreset[];
  onDone?: () => void | Promise<unknown>;
  disabled?: boolean;
  endpoint?: string;
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
            const r = await postJson(endpoint, {
              teamId,
              coins: p.coins ?? 0,
              cardPoints: p.cardPoints ?? 0,
              note: p.note ?? p.label,
            });
            await onDone?.();
            const msg = r.doubled !== null && r.doubled !== undefined
              ? `${p.label}（${r.doubled ? "雙倍！" : "歸零…"}）`
              : p.label;
            return { message: msg, undo: r.undo as UndoRecipe | undefined };
          }}
        />
      ))}
    </div>
  );
}
