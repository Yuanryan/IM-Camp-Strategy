"use client";

import { useState } from "react";
import Image from "next/image";
import { useSnapshot, postJson, ActionButton, TeamSelect, type ActionResult } from "@/components/client";
import { Card } from "@/components/Shell";
import { Num } from "@/components/ui";
import { PropertyGrid } from "@/components/views/PropertyGrid";
import { REGIONS, REGION_UI, EffectType, roundTo10, functionCardImage, type UndoRecipe } from "@/lib/game";
import { FUNCTION_CARD_META } from "@/lib/function-card-meta";
import { ArrowLeft } from "lucide-react";

// 出卡面板：選出卡隊 → 只顯示該隊持有的功能卡（含原市場卡）與張數 → 選卡 → 選目標 → 執行。
// 自帶 useSnapshot，可獨立掛在任何頁面（目前用於地圖控制台左側入口）。
export function CardUsePanel({
  defaultTeamId,
  onClose,
}: {
  defaultTeamId: number | "";
  onClose: () => void;
}) {
  const { snap, mutate } = useSnapshot(2500);
  const [actorTeam, setActorTeam] = useState<number | "">(defaultTeamId);
  const [card, setCard] = useState<string | "">("");
  const [src, setSrc] = useState<number | "">(""); // 來源（作用隊自己的地，換地/換屋卡用）
  const [tgt, setTgt] = useState<number | "">(""); // 目標不動產
  const [targetTeam, setTargetTeam] = useState<number | "">(""); // 目標隊伍
  const [selRegion, setSelRegion] = useState<string>("AURORA");

  if (!snap) return <p className="p-2 text-sm text-slate-400">載入中…</p>;
  const teams = snap.teams;
  const properties = snap.properties;
  const actorTeamObj = teams.find((t) => t.id === actorTeam);
  const held = actorTeamObj?.cards ?? [];
  const meta = FUNCTION_CARD_META.find((m) => m.type === card);
  // 詛咒・封卡（CARD_BLOCK）：出卡隊持有生效中的封卡詛咒道具 → 前端封鎖出卡。
  const actorBlocked = (actorTeamObj?.items ?? []).some((i) => i.effectType === EffectType.CARD_BLOCK);

  const reset = () => { setCard(""); setSrc(""); setTgt(""); setTargetTeam(""); setSelRegion("AURORA"); };

  const owned = properties.filter((p) => p.ownerTeamId != null);
  const mine = actorTeam === "" ? [] : owned.filter((p) => p.ownerTeamId === actorTeam);
  const others = actorTeam === "" ? owned : owned.filter((p) => p.ownerTeamId !== actorTeam);
  const otherTeams = actorTeam === "" ? teams : teams.filter((t) => t.id !== actorTeam);

  const tgtProp = properties.find((p) => p.id === tgt);
  const compensation = tgtProp ? roundTo10(tgtProp.basePrice * 0.8) : 0;

  const run = async (): Promise<string | ActionResult> => {
    if (actorTeam === "") return "請先選出卡隊";
    if (!meta) return "請先選卡片";
    if (actorBlocked) return "此隊中了詛咒，無法對其他隊伍出功能卡";
    const byTeamId = actorTeam;

    let body: Record<string, unknown>;
    if (meta.action === "seizeLand") {
      if (tgt === "") return "請選要收購的對手土地";
      body = { action: "seizeLand", propertyId: tgt, toTeamId: byTeamId };
    } else if (meta.action === "swapLand" || meta.action === "swapHouse") {
      if (src === "" || tgt === "") return "請選來源與目標兩塊地";
      body = { action: meta.action, propertyAId: src, propertyBId: tgt };
    } else if (meta.action === "demolish" || meta.action === "monster") {
      if (tgt === "") return "請選目標房屋";
      body = { action: meta.action, propertyId: tgt, byTeamId };
    } else if (meta.action === "taxAudit" || meta.action === "stealRandom") {
      if (targetTeam === "") return "請選目標隊伍";
      body = { action: meta.action, teamId: byTeamId, targetTeamId: targetTeam };
    } else if (meta.action === "red" || meta.action === "black") {
      body = { action: meta.action, region: selRegion, byTeamId };
    } else if (meta.action === "landgod" || meta.action === "haunt") {
      if (tgt === "") return "請選目標不動產";
      body = { action: meta.action, propertyId: tgt, byTeamId };
    } else {
      // 手動效果卡（manualUse）：強力膠卡需選目標隊伍；遙控骰子卡作用於自己、無需目標。
      if (meta.pickers === "team" && targetTeam === "") return "請選目標隊伍";
      body = { action: "manualUse", teamId: byTeamId, cardType: meta.type, ...(targetTeam !== "" ? { targetTeamId: targetTeam } : {}) };
    }

    const r = await postJson("/api/exchange/card", body);
    await mutate();
    const label = `已執行 ${meta.type}${meta.manual ? "（請依卡面說明人工執行）" : ""}`;
    reset();
    return { message: label, undo: r.undo as UndoRecipe | undefined };
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden">
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          aria-label="返回"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-bold tracking-wide text-slate-200">功能卡</span>
      </div>

      <div data-scrollable className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain pr-0.5">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
          <div className="mb-1.5 text-xs font-semibold tracking-wider text-slate-400">出卡隊</div>
          <TeamSelect teams={teams} value={actorTeam} onChange={(id) => { setActorTeam(id); reset(); }} />
        </div>

        {actorBlocked && (
          <div className="rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-2 text-sm text-fuchsia-200">
            ☠ 中了詛咒，無法對其他隊伍出功能卡。完成解咒任務後即可解除。
          </div>
        )}

        {actorTeam === "" ? (
          <p className="text-sm text-slate-400">請先選出卡隊，才能看到持有的功能卡。</p>
        ) : held.length === 0 ? (
          <p className="text-sm text-slate-400">此隊尚未持有任何功能卡。</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {held.map((c) => (
              <button
                key={c.type}
                type="button"
                onClick={() => { setCard(c.type); setSrc(""); setTgt(""); setTargetTeam(""); }}
                className={`relative overflow-hidden rounded-xl border bg-white/5 text-left transition active:scale-[0.97] ${
                  card === c.type ? "border-cyan-400/70 ring-2 ring-cyan-400/60" : "border-white/10 hover:border-white/25"
                }`}
              >
                <div className="relative aspect-3/4 w-full bg-black/20">
                  <Image src={functionCardImage(c.type)} alt={c.type} fill sizes="120px" className="object-cover" />
                </div>
                <span className="absolute right-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-slate-950/85 px-1 text-[11px] font-black text-cyan-300 ring-1 ring-cyan-400/40">
                  ×{c.count}
                </span>
                <div className="truncate px-1.5 py-1 text-[11px] font-bold text-cyan-100">{c.type}</div>
              </button>
            ))}
          </div>
        )}

        {meta && (
          <Card title={`${meta.type} 效果`}>
            <div className="mb-3 flex flex-wrap items-baseline gap-3">
              <p className="text-sm text-slate-300">{meta.desc}</p>
              {meta.multKey && (
                <span className="shrink-0 rounded-md bg-white/10 px-2.5 py-1 text-xs font-bold text-cyan-300">
                  幅度：×{snap.settings[meta.multKey].toFixed(2)}
                </span>
              )}
            </div>

            {meta.pickers === "dual" && (
              <PropertyGrid label="來源（出卡隊自己的地）" accent="cyan"
                base={mine} value={src} onChange={setSrc} teams={teams} />
            )}
            {(meta.pickers === "single" || meta.pickers === "dual") && (
              <PropertyGrid accent="rose"
                label={meta.action === "seizeLand" ? "目標：要收購的對手土地" : "目標：對手持有的土地"}
                base={others} value={tgt} onChange={setTgt} teams={teams} />
            )}
            {meta.pickers === "property" && (
              <PropertyGrid label="選擇目標不動產" accent="rose"
                base={owned} value={tgt} onChange={setTgt} teams={teams} />
            )}
            {meta.pickers === "region" && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="mb-2 text-xs font-medium text-slate-300">選擇目標區域</div>
                <div className="flex flex-wrap gap-2">
                  {REGIONS.map((r) => {
                    const ui = REGION_UI[r.code as keyof typeof REGION_UI];
                    const sel = selRegion === r.code;
                    return (
                      <button key={r.code} onClick={() => setSelRegion(r.code)}
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                          sel ? `bg-white/10 ${ui.text} ring-1 ${ui.border}` : "chip"
                        }`}>
                        {r.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {meta.pickers === "team" && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="mb-2 text-xs font-medium text-slate-300">目標隊伍</div>
                <div className="flex flex-wrap gap-2">
                  {otherTeams.map((t) => (
                    <button key={t.id} onClick={() => setTargetTeam(t.id)}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                        targetTeam === t.id ? "bg-white/10 text-rose-300 ring-1 ring-rose-400/40" : "chip"
                      }`}>
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {meta.manual && (
              <p className="mt-3 rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
                ℹ 此卡效果由關主人工執行；系統僅記錄出卡隊持有數與商店流通量。
              </p>
            )}

            {meta.action === "seizeLand" && tgtProp && (
              <p className="mt-3 text-xs text-slate-400">
                補償給 <b className="text-cyan-300">{tgtProp.ownerName}</b>：初始價 <Num>{tgtProp.basePrice}</Num> × 80% ＝ <Num className="neon-gold">{compensation}</Num> 光幣
              </p>
            )}

            <ActionButton
              label={actorBlocked ? "詛咒中・無法出卡" : `執行 ${meta.type}`}
              className="mt-3 w-full btn-emerald"
              disabled={actorBlocked}
              onAction={run}
            />
          </Card>
        )}
      </div>
    </div>
  );
}
