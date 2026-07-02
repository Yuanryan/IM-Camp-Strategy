"use client";
import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import Image from "next/image";
import { useSnapshot, postJson, ActionButton, TeamSelect, type ActionResult } from "@/components/client";
import { Card } from "@/components/Shell";
import { Num } from "@/components/ui";
import { PropertyGrid } from "@/components/views/PropertyGrid";
import { REGIONS, REGION_UI, EffectType, roundTo10, functionCardImage, type UndoRecipe } from "@/lib/game";
import { FUNCTION_CARD_META } from "@/lib/function-card-meta";
import type { TeamCardView } from "@/lib/snapshot";
import { X, Swords, ChevronLeft, ChevronRight } from "lucide-react";

// 出卡面板：選出卡隊 → 手牌輪播選卡（置中那張即為選中卡）→ 選目標 → 執行。
// 出卡隊與地圖控制台共用同一個選隊狀態（team/setTeam 由 RealMapView 傳入），面板內換隊＝地圖換隊。
export function CardUsePanel({
  team,
  setTeam,
  onClose,
}: {
  team: number | "";
  setTeam: (id: number | "") => void;
  onClose: () => void;
}) {
  const { snap, mutate } = useSnapshot(2500);
  const [cardIdx, setCardIdx] = useState(0); // 輪播置中索引＝選中的卡
  // 兩段式選卡：false＝瀏覽模式（大卡輪播、不顯示效果面板）；true＝已選卡（輪播收合成縮圖條，
  // 效果面板直接顯示在下方，不被大卡擋住）。縮圖條仍可滑動 / 點選直接換卡。
  const [chosen, setChosen] = useState(false);
  const [src, setSrc] = useState<number | "">(""); // 來源（作用隊自己的地，換地/換屋卡用）
  const [tgt, setTgt] = useState<number | "">(""); // 目標不動產
  const [targetTeam, setTargetTeam] = useState<number | "">(""); // 目標隊伍
  const [selRegion, setSelRegion] = useState<string>("AURORA");

  // 換隊（面板內或地圖選隊皆同一狀態）→ 輪播回到第一張、清目標欄位。
  // 用「render 中調整狀態」而非 effect：換隊當下同一次 render 就重置，不多跑一輪舊隊畫面。
  const [prevTeam, setPrevTeam] = useState(team);
  if (prevTeam !== team) {
    setPrevTeam(team);
    setCardIdx(0); setChosen(false); setSrc(""); setTgt(""); setTargetTeam(""); setSelRegion("AURORA");
  }

  if (!snap) return <p className="p-2 text-sm text-slate-400">載入中…</p>;
  const teams = snap.teams;
  const properties = snap.properties;

  const actorTeam = team;
  const actorTeamObj = teams.find((t) => t.id === actorTeam);
  const held = actorTeamObj?.cards ?? [];
  // 手牌可能因出牌耗盡而縮短 → 索引夾回範圍內；選中卡由置中索引推導。
  const idx = held.length === 0 ? 0 : Math.min(cardIdx, held.length - 1);
  const card = held[idx]?.type ?? "";
  // 效果面板只在「已選卡」後顯示；瀏覽模式先專心挑卡。
  const meta = chosen ? FUNCTION_CARD_META.find((m) => m.type === card) : undefined;
  // 詛咒・封卡（CARD_BLOCK）：出卡隊持有生效中的封卡詛咒道具 → 前端封鎖出卡。
  const actorBlocked = (actorTeamObj?.items ?? []).some((i) => i.effectType === EffectType.CARD_BLOCK);

  // 出牌後歸零：清目標欄位並收回瀏覽模式（手牌張數已變，重新挑卡）；不動輪播索引。
  const reset = () => { setChosen(false); setSrc(""); setTgt(""); setTargetTeam(""); setSelRegion("AURORA"); };
  // 輪播選卡：夾住範圍並清目標欄位（滑動 / 點鄰卡 / ◀▶ 都走這裡）。
  const pick = (i: number) => {
    setCardIdx(Math.max(0, Math.min(held.length - 1, i)));
    setSrc(""); setTgt(""); setTargetTeam("");
  };
  const owned = properties.filter((p) => p.ownerTeamId != null);
  const mine = actorTeam === "" ? [] : owned.filter((p) => p.ownerTeamId === actorTeam);
  const others = actorTeam === "" ? owned : owned.filter((p) => p.ownerTeamId !== actorTeam);
  const otherTeams = actorTeam === "" ? teams : teams.filter((t) => t.id !== actorTeam);

  const tgtProp = properties.find((p) => p.id === tgt);
  const compensation = tgtProp ? roundTo10(tgtProp.basePrice * 0.8) : 0;

  // 護盾提示：判斷本次出卡的「被攻擊隊」，若其持有生效中的護盾 → 提示會被擋下（僅提示，仍可出卡）。
  // 攻擊卡才有被攻擊隊：team 目標卡（查稅/孫生媽媽/強力膠）→ targetTeam；
  // 針對對手不動產的卡（購地/拆屋/怪獸/換地/換屋）→ 目標地 tgt 的持有隊。市場卡 / 自身卡無被攻擊隊。
  const ATTACK_ACTIONS = new Set(["seizeLand", "swapLand", "swapHouse", "demolish", "monster", "taxAudit", "stealRandom"]);
  const victimTeamId: number | "" =
    !meta ? ""
    : meta.action === "taxAudit" || meta.action === "stealRandom" ? targetTeam
    : (meta.action === "manualUse" && meta.type === "強力膠卡") ? targetTeam
    : ATTACK_ACTIONS.has(meta.action) && tgtProp ? (tgtProp.ownerTeamId ?? "")
    : "";
  const victimTeam = victimTeamId === "" ? undefined : teams.find((t) => t.id === victimTeamId);
  const victimShielded = (victimTeam?.items ?? []).some((i) => i.effectType === EffectType.ATTACK_SHIELD);

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
      <div className="flex shrink-0 items-center gap-2.5 border-b border-violet-400/15 pb-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-violet-400/30 bg-violet-500/15 text-violet-200">
          <Swords className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-black tracking-wide text-slate-100">功能卡・出牌</div>
          <div className="text-[11px] text-slate-400">選出卡隊 → 挑一張 → 指定目標 → 執行</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="關閉功能卡"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 active:scale-95"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div data-scrollable className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain pr-0.5">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
          <div className="mb-1.5 text-xs font-semibold tracking-wider text-slate-400">出卡隊</div>
          <TeamSelect teams={teams} value={actorTeam} onChange={setTeam} />
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
          <CardCarousel
            held={held}
            index={idx}
            chosen={chosen}
            onPrev={() => pick(idx - 1)}
            onNext={() => pick(idx + 1)}
            onPick={pick}
            onConfirm={() => setChosen(true)}
            onExpand={() => setChosen(false)}
          />
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
                <TeamSelect teams={otherTeams} value={targetTeam} onChange={setTargetTeam} />
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

            {victimShielded && (
              <p className="mt-3 rounded-lg border border-sky-400/30 bg-sky-400/10 px-3 py-2 text-xs text-sky-200">
                🛡 目標 <b>{victimTeam?.name}</b> 持有護盾，將擋下此次攻擊（護盾消耗一次，卡片仍會用掉）。
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

// 手牌輪播：一條卡片軌道以 translateX 置中目前選中的卡；置中卡放大＋全亮，鄰卡縮小＋半透明露邊。
// 支援手指 / 滑鼠橫向滑動換卡（垂直手勢放行給面板捲動），◀ ▶ 與底部點列亦可跳選。
// 兩段式：瀏覽模式（大卡）點置中卡或「選用」鈕確認 → 收合成縮圖條（chosen），讓效果面板直接可見；
// 縮圖條仍可滑動 / 點選直接換卡，左端「全部」鈕展開回瀏覽模式。
function CardCarousel({
  held, index, chosen, onPrev, onNext, onPick, onConfirm, onExpand,
}: {
  held: TeamCardView[];
  index: number;
  chosen: boolean;
  onPrev: () => void;
  onNext: () => void;
  onPick: (i: number) => void;
  onConfirm: () => void;
  onExpand: () => void;
}) {
  const cur = held[index];
  // 軌道寬度即時量測（ResizeObserver）：一格的百分比依實際寬度換算，寬螢幕同時露出更多張。
  const trackBoxRef = useRef<HTMLDivElement>(null);
  const [trackW, setTrackW] = useState(0);
  useEffect(() => {
    const el = trackBoxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setTrackW(el.offsetWidth));
    ro.observe(el); // observe 當下即回呼一次，取得初始寬度
    return () => ro.disconnect();
  }, []);
  // 一格佔軌道寬的百分比：以目標卡寬（瀏覽 ~210px、縮圖 ~96px）換算，
  // 夾在上下限之間——窄螢幕維持原本 40% / 22% 的大小，寬螢幕縮小佔比、露出更多張。
  const targetPx = chosen ? 96 : 210;
  const maxPct = chosen ? 22 : 40;
  const minPct = chosen ? 10 : 18;
  const slotPct = trackW > 0 ? Math.min(maxPct, Math.max(minPct, (targetPx / trackW) * 100)) : maxPct;
  const centerPct = (100 - slotPct) / 2;
  // 滑動手勢：pointerdown 記起點，水平位移明顯大於垂直才鎖定為滑卡（否則放行捲動）。
  // 拖曳中軌道跟手（dragPx，關閉 transition），放開依位移換算跳幾張；有拖曳則抑制卡片點擊。
  const swipeRef = useRef<{ x: number; y: number; locked: boolean } | null>(null);
  const movedRef = useRef(false);
  const [dragPx, setDragPx] = useState(0);

  const onPointerDown = (e: RPointerEvent) => {
    swipeRef.current = { x: e.clientX, y: e.clientY, locked: false };
    movedRef.current = false;
  };
  const onPointerMove = (e: RPointerEvent) => {
    const s = swipeRef.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (!s.locked) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dx) <= Math.abs(dy)) { swipeRef.current = null; return; }
      s.locked = true;
      movedRef.current = true;
    }
    // 已到第一張 / 最後一張的方向加阻尼，給「滑不動」的回饋。
    const atStart = index <= 0 && dx > 0;
    const atEnd = index >= held.length - 1 && dx < 0;
    setDragPx(atStart || atEnd ? dx * 0.25 : dx);
  };
  const onPointerUp = (e: RPointerEvent) => {
    const s = swipeRef.current;
    swipeRef.current = null;
    setDragPx(0);
    if (!s?.locked) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) <= 40) return;
    // 一格寬 = 軌道寬 × slotPct；快甩長滑可一次跳多張，短滑至少換一張。
    const slot = ((trackBoxRef.current?.offsetWidth ?? 320) * slotPct) / 100;
    const jump = Math.round(-dx / slot) || (dx < 0 ? 1 : -1);
    onPick(index + jump);
  };
  const onPointerCancel = () => {
    swipeRef.current = null;
    setDragPx(0);
  };

  return (
    <div className="shrink-0">
      <div
        className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent px-2 ${chosen ? "py-2" : "py-4"}`}
        style={{ touchAction: "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={onPointerCancel}
      >
        <div className="flex items-stretch gap-2">
          {/* 縮圖條左端：展開回瀏覽模式（大卡輪播）。*/}
          {chosen && (
            <button
              type="button"
              onClick={onExpand}
              title="展開瀏覽全部卡片"
              className="z-10 flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-white/10 bg-white/5 px-2 text-[11px] font-bold text-slate-300 transition hover:bg-white/10 active:scale-95"
            >
              <ChevronLeft className="h-4 w-4" />
              全部
            </button>
          )}
          {/* 卡片軌道：滿版寬，每張佔一格（slotPct%），置中偏移 = 讓 index 那張落在中央（＋拖曳跟手位移）。*/}
          <div ref={trackBoxRef} className="relative w-full overflow-hidden">
            <div
              className={`flex items-center ${dragPx === 0 ? "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]" : ""}`}
              style={{ transform: `translateX(calc(${centerPct}% - ${index} * ${slotPct}% + ${dragPx}px))` }}
            >
              {held.map((c, i) => {
                const active = i === index;
                return (
                  <button
                    key={c.type}
                    type="button"
                    onClick={() => {
                      if (movedRef.current) return;
                      // 瀏覽模式點置中卡＝選用；其餘（含縮圖條）點誰選誰。
                      if (!chosen && i === index) onConfirm();
                      else onPick(i);
                    }}
                    aria-current={active}
                    title={c.type}
                    style={{ width: `${slotPct}%` }}
                    className={`shrink-0 outline-none ${chosen ? "px-1" : "px-1.5"}`}
                    tabIndex={active ? 0 : -1}
                  >
                    <div
                      className={`relative aspect-3/4 overflow-hidden rounded-xl border bg-black/30 transition-all duration-300 ${
                        active
                          ? chosen
                            ? "border-cyan-400/70 opacity-100 ring-1 ring-cyan-400/60"
                            : "scale-100 border-cyan-400/70 opacity-100 shadow-[0_10px_40px_-8px_rgba(34,211,238,0.45)] ring-2 ring-cyan-400/50"
                          : chosen
                            ? "border-white/10 opacity-55 hover:opacity-90"
                            : "scale-[0.82] border-white/10 opacity-45"
                      }`}
                    >
                      <Image src={functionCardImage(c.type)} alt={c.type} fill sizes={chosen ? "120px" : "240px"} className="object-cover select-none" draggable={false} />
                      <span className={`absolute grid place-items-center rounded-full bg-slate-950/85 font-black text-cyan-300 ring-1 ring-cyan-400/40 ${
                        chosen ? "right-0.5 top-0.5 h-4 min-w-4 px-0.5 text-[10px]" : "right-1.5 top-1.5 h-6 min-w-6 px-1 text-xs"
                      }`}>
                        ×{c.count}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 左右切換：懸浮於軌道兩側；瀏覽模式限定（縮圖條用滑動 / 直接點選），單張時不顯示，到頭的方向淡出停用。*/}
        {!chosen && held.length > 1 && (
          <>
            <button
              type="button"
              onClick={onPrev}
              disabled={index <= 0}
              aria-label="上一張"
              className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-slate-950/70 text-slate-200 backdrop-blur transition hover:bg-slate-800/80 active:scale-90 disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={index >= held.length - 1}
              aria-label="下一張"
              className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-slate-950/70 text-slate-200 backdrop-blur transition hover:bg-slate-800/80 active:scale-90 disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* 瀏覽模式限定：卡名 + 點列指示 + 選用鈕（選用後收合、效果面板直接顯示，這排就不需要了）。*/}
      {!chosen && (
        <>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-sm font-black text-cyan-100">{cur?.type}</span>
              <span className="ml-2 text-xs text-slate-400">持有 ×{cur?.count}</span>
            </div>
            {held.length > 1 && (
              <div className="flex shrink-0 items-center gap-1.5">
                {held.map((c, i) => (
                  <button
                    key={c.type}
                    type="button"
                    onClick={() => onPick(i)}
                    aria-label={`第 ${i + 1} 張`}
                    className={`h-1.5 rounded-full transition-all ${
                      i === index ? "w-5 bg-cyan-400" : "w-1.5 bg-white/25 hover:bg-white/40"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onConfirm}
            className="mt-2 w-full rounded-xl border border-cyan-400/40 bg-cyan-500/15 py-2.5 text-sm font-black text-cyan-100 transition hover:bg-cyan-500/25 active:scale-[0.99]"
          >
            選用「{cur?.type}」
          </button>
        </>
      )}
    </div>
  );
}
