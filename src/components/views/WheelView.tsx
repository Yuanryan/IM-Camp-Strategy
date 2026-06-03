"use client";

import { useState } from "react";
import { postJson, TeamSelect, toast } from "@/components/client";
import { Card } from "@/components/Shell";
import { Num } from "@/components/ui";
import { WHEEL_OUTCOMES } from "@/lib/game";

// 依權重比例切出每一段（x5 權重最低 → 最窄）
const TOTAL = WHEEL_OUTCOMES.reduce((s, o) => s + o.weight, 0);
const SEGMENTS = (() => {
  let start = 0;
  return WHEEL_OUTCOMES.map((o) => {
    const sweep = (o.weight / TOTAL) * 360;
    const seg = { mult: o.mult, start, sweep, center: start + sweep / 2 };
    start += sweep;
    return seg;
  });
})();

// 顏色：青色系漸層，x5 用金色凸顯
const COLORS = ["#334155", "#0e7490", "#155e75", "#0891b2", "#06b6d4", "#facc15"];

// 角度（自正上方順時針）轉直角座標
function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [cx + r * Math.sin(rad), cy - r * Math.cos(rad)];
}
function arcPath(cx: number, cy: number, r: number, start: number, sweep: number) {
  const [x1, y1] = polar(cx, cy, r, start);
  const [x2, y2] = polar(cx, cy, r, start + sweep);
  const large = sweep > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
}

type TeamLite = { id: number; name: string; coins: number };

export function WheelView({
  teams,
  team,
  setTeam,
  cur,
  onDone,
}: {
  teams: TeamLite[];
  team: number | "";
  setTeam: (id: number | "") => void;
  cur?: TeamLite;
  onDone: () => void | Promise<unknown>;
}) {
  const [stake, setStake] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [last, setLast] = useState<{ mult: number; delta: number } | null>(null);

  const spin = async () => {
    if (team === "" || spinning) return;
    if (stake < 1 || stake > 500) {
      toast("投入需 1–500 光幣", "err");
      return;
    }
    setSpinning(true);
    setLast(null);
    try {
      const r = await postJson("/api/map/wheel", { teamId: team, stake });
      const seg = SEGMENTS.find((s) => s.mult === r.mult) ?? SEGMENTS[0];
      // 段內微抖動，讓指針不要每次都停在正中央
      const jitter = (Math.random() - 0.5) * seg.sweep * 0.6;
      const targetMod = ((360 - (seg.center + jitter)) % 360 + 360) % 360;
      setRotation((prev) => {
        const current = ((prev % 360) + 360) % 360;
        let add = targetMod - current;
        if (add < 0) add += 360;
        return prev + 360 * 6 + add; // 轉 6 圈再對準
      });
      window.setTimeout(async () => {
        setLast({ mult: r.mult, delta: r.delta });
        toast(`×${r.mult}！淨${r.delta >= 0 ? "+" : ""}${r.delta}`, r.delta >= 0 ? "ok" : "err");
        await onDone();
        setSpinning(false);
      }, 4200);
    } catch (e) {
      toast(e instanceof Error ? e.message : "轉盤失敗", "err");
      setSpinning(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card title="選擇小隊">
        <TeamSelect teams={teams} value={team} onChange={setTeam} />
        {cur && (
          <span className="ml-3 text-sm text-slate-400">
            光幣 <Num className="neon-gold">{cur.coins}</Num>
          </span>
        )}
      </Card>

      <Card title="命運投資輪盤">
        <div className="relative mx-auto aspect-square w-full max-w-xs">
          {/* 指針（固定在正上方，指向輪盤）*/}
          <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2">
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: "13px solid transparent",
                borderRight: "13px solid transparent",
                borderTop: "22px solid #facc15",
                filter: "drop-shadow(0 0 6px rgba(250,204,21,0.6))",
              }}
            />
          </div>

          <svg
            viewBox="0 0 200 200"
            className="h-full w-full drop-shadow-[0_0_22px_rgba(34,211,238,0.25)]"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? "transform 4s cubic-bezier(0.17,0.67,0.21,1)" : "none",
            }}
          >
            <circle cx={100} cy={100} r={99} fill="#020617" stroke="rgba(255,255,255,0.18)" strokeWidth={2} />
            {SEGMENTS.map((s, i) => {
              const [lx, ly] = polar(100, 100, 66, s.center);
              return (
                <g key={i}>
                  <path d={arcPath(100, 100, 96, s.start, s.sweep)} fill={COLORS[i]} stroke="rgba(2,6,23,0.55)" strokeWidth={1} />
                  <text
                    x={lx}
                    y={ly}
                    fill={s.mult === 5 ? "#020617" : "#e2e8f0"}
                    fontSize={s.sweep < 16 ? 9 : 13}
                    fontWeight="bold"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${s.center} ${lx} ${ly})`}
                  >
                    ×{s.mult}
                  </text>
                </g>
              );
            })}
            <circle cx={100} cy={100} r={15} fill="#0f172a" stroke="#facc15" strokeWidth={2} />
          </svg>
        </div>

        {last && (
          <div
            className={`mt-4 rounded-lg px-3 py-2 text-center text-sm font-bold ring-1 ${
              last.delta >= 0
                ? "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30"
                : "bg-rose-500/15 text-rose-200 ring-rose-400/30"
            }`}
          >
            轉到 ×{last.mult} —— 淨 {last.delta >= 0 ? "+" : ""}{last.delta} 光幣
          </div>
        )}

        <div className="mt-4 flex items-end justify-center gap-3">
          <label className="text-xs text-slate-400">
            <div className="mb-1">投入光幣（≤500）</div>
            <input type="number" inputMode="numeric" value={stake} min={1} max={500} disabled={spinning}
              onChange={(e) => setStake(Number(e.target.value) || 0)} className="fld w-28" />
          </label>
          <button onClick={spin} disabled={team === "" || spinning}
            className="rounded-xl bg-purple-600 px-6 py-3 text-base font-bold text-white shadow-lg shadow-purple-500/30 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40">
            {spinning ? "轉動中…" : "轉輪盤"}
          </button>
        </div>
      </Card>
    </div>
  );
}
