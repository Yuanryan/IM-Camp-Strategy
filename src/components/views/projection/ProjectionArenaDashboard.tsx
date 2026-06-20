"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Crown,
  Gem,
  RadioTower,
  Sparkles,
  Ticket,
  Trophy,
  Zap,
} from "lucide-react";

import { AnimatedNum, PriceTag } from "@/components/ui";
import { FullscreenButton } from "@/components/ui/fullscreen-button";
import { REGIONS, REGION_UI, type RegionCode } from "@/lib/game";
import {
  getProjectionLevelTier,
  getProjectionRankTier,
  type ProjectionRankTier,
} from "@/lib/projection-dashboard";
import { buildEventTickerEntries } from "@/lib/projection-animation";
import type { Snapshot, TeamView } from "@/lib/snapshot";

const REGION_GLOW: Record<RegionCode, string> = {
  AURORA: "251, 191, 36",
  SPECTRA: "34, 211, 238",
  EMBER: "244, 63, 94",
  HAVEN: "52, 211, 153",
};

const RANK_TIER_CLASS: Record<ProjectionRankTier, string> = {
  gold: "projection-rank-gold",
  silver: "projection-rank-silver",
  rgb: "projection-rank-rgb",
  standard: "projection-rank-standard",
};

const JACKPOT_BALLS = [7, 12, 18, 23, 31, 36, 42, 49];

export function ProjectionArenaDashboard({ snap }: { snap: Snapshot }) {
  const ranking = [...snap.teams].sort((a, b) => b.netWorth - a.netWorth);
  const maxWorth = Math.max(1, ...ranking.map((team) => team.netWorth));

  return (
    <div
      data-testid="projection-dashboard"
      className="projection-arena h-dvh overflow-hidden p-3 text-slate-100"
    >
      <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
        <ArenaHeader snap={snap} />

        <main className="grid min-h-0 grid-cols-[23.5rem_minmax(0,1fr)] gap-3">
          <aside className="grid min-h-0 grid-rows-[8.75rem_minmax(0,1fr)] gap-3">
            <JackpotCard pool={snap.lottery.pool} />
            <ArenaLeaderboard ranking={ranking} maxWorth={maxWorth} />
          </aside>

          <RegionArena snap={snap} />
        </main>
      </div>
    </div>
  );
}

function ArenaHeader({ snap }: { snap: Snapshot }) {
  const clock = useClock();
  const phase =
    snap.phase === "SETTLED"
      ? {
          label: "已結算",
          cls: "border-amber-300/35 bg-amber-300/10 text-amber-200",
          dot: "bg-amber-300",
        }
      : snap.phase === "RUNNING"
        ? {
            label: "進行中",
            cls: "border-emerald-300/35 bg-emerald-300/10 text-emerald-200",
            dot: "animate-pulse bg-emerald-300",
          }
        : {
            label: "準備中",
            cls: "border-slate-300/20 bg-slate-300/5 text-slate-300",
            dot: "bg-slate-400",
          };

  return (
    <header className="projection-panel overflow-hidden rounded-[1.35rem] px-4 py-3">
      <div className="flex h-12 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-cyan-500 to-yellow-400 shadow-[0_0_28px_rgba(34,211,238,0.34)]">
            <Gem className="h-6 w-6 text-slate-950" strokeWidth={2.25} />
          </span>
          <div className="min-w-0">
            <h1 className="truncate bg-gradient-to-r from-cyan-100 via-white to-yellow-200 bg-clip-text text-[1.7rem] font-black leading-none tracking-tight text-transparent">
              IM 大富翁：迷霧資本戰
            </h1>
            <div className="mt-1 truncate text-[0.62rem] font-bold uppercase tracking-[0.32em] text-slate-500">
              IM Monopoly · Misty Capital War
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <FullscreenButton />
          <span
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-black ${phase.cls}`}
          >
            <span className={`h-2 w-2 rounded-full ${phase.dot}`} />
            {phase.label}
          </span>
          <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-1.5">
            <span className="num text-xl font-black leading-none text-white">
              {clock}
            </span>
          </div>
        </div>
      </div>

      <MarketEventTicker
        activeEvents={snap.activeEvents}
        penaltyRegion={snap.event4Penalty}
      />
    </header>
  );
}

function MarketEventTicker({
  activeEvents,
  penaltyRegion,
}: {
  activeEvents: number[];
  penaltyRegion: string | null;
}) {
  const reduceMotion = useReducedMotion();
  const entries = buildEventTickerEntries(activeEvents, penaltyRegion);
  if (entries.length === 0) return null;

  const duration = Math.max(
    26,
    entries.reduce((total, entry) => total + entry.text.length, 0) / 4.4,
  );

  const tickerContent = (
    <>
      {entries.map((entry, index) => (
        <span
          key={`${entry.eventIndex}-${index}`}
          className="inline-flex h-full shrink-0 items-center gap-2.5"
        >
          <span className="rounded-md border border-cyan-300/20 bg-cyan-300/10 px-2 py-0.5 text-[0.65rem] font-black tracking-wider text-cyan-200">
            EVENT {String(entry.eventIndex).padStart(2, "0")}
          </span>
          <span className="text-sm font-bold leading-none text-cyan-50/90">
            {entry.text}
          </span>
          <span className="px-3 text-cyan-300/35">◆</span>
        </span>
      ))}
    </>
  );

  return (
    <div className="projection-ticker mt-2.5 flex h-9 items-center overflow-hidden rounded-xl border border-cyan-300/25 bg-cyan-950/35">
      <div className="relative z-10 flex h-full shrink-0 items-center gap-2 border-r border-cyan-300/20 bg-slate-950/75 px-3 text-xs font-black tracking-[0.16em] text-cyan-200">
        <RadioTower className="h-4 w-4 text-cyan-300" />
        市場事件
      </div>

      <div
        className="projection-ticker-window relative h-full min-w-0 flex-1 overflow-hidden"
        aria-live="polite"
      >
        {reduceMotion ? (
          <div className="flex h-full items-center truncate px-3 text-sm font-bold text-cyan-50/90">
            {entries.map((entry) => entry.text).join("　◆　")}
          </div>
        ) : (
          <motion.div
            className="projection-ticker-track absolute inset-y-0 left-0 flex w-max items-center whitespace-nowrap"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration, ease: "linear", repeat: Infinity }}
          >
            <div className="flex h-full shrink-0 items-center pr-10">
              {tickerContent}
            </div>
            <div
              className="flex h-full shrink-0 items-center pr-10"
              aria-hidden="true"
            >
              {tickerContent}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function ArenaLeaderboard({
  ranking,
  maxWorth,
}: {
  ranking: TeamView[];
  maxWorth: number;
}) {
  return (
    <section className="projection-panel flex min-h-0 flex-col overflow-hidden rounded-[1.35rem] p-3">
      <PanelTitle icon={<Trophy className="h-4 w-4" />}>資產排行</PanelTitle>

      <ol
        className="grid min-h-0 flex-1 gap-1"
        style={{
          gridTemplateRows: `repeat(${Math.max(ranking.length, 1)}, minmax(0, 1fr))`,
        }}
      >
        <AnimatePresence initial={false}>
          {ranking.map((team, index) => {
            const tier = getProjectionRankTier(index);
            const progress = Math.max(4, (team.netWorth / maxWorth) * 100);
            return (
              <motion.li
                key={team.id}
                layout
                data-rank-tier={tier}
                className={`projection-rank-row relative min-h-0 overflow-hidden rounded-xl border ${RANK_TIER_CLASS[tier]}`}
              >
                <motion.div
                  className="absolute inset-y-0 left-0 bg-current opacity-[0.08]"
                  initial={false}
                  animate={{ width: `${progress}%` }}
                  transition={{ type: "spring", stiffness: 120, damping: 24 }}
                />
                <div className="projection-rank-content relative flex h-full min-h-[1.8rem] items-center">
                  <RankBadge index={index} tier={tier} />
                  <span className="projection-rank-name min-w-0 flex-1 truncate font-black">
                    {team.name}
                  </span>
                  <AnimatedNum
                    value={team.netWorth}
                    className="projection-rank-value font-black leading-none"
                  />
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>
    </section>
  );
}

function RankBadge({
  index,
  tier,
}: {
  index: number;
  tier: ProjectionRankTier;
}) {
  const icon =
    tier === "gold" ? (
      <Crown className="projection-rank-icon" />
    ) : tier === "silver" ? (
      <Sparkles className="projection-rank-icon" />
    ) : tier === "rgb" ? (
      <Zap className="projection-rank-icon" />
    ) : (
      index + 1
    );

  return (
    <span className="projection-rank-badge grid shrink-0 place-items-center rounded-lg font-black">
      {icon}
    </span>
  );
}

function JackpotCard({ pool }: { pool: number }) {
  return (
    <section className="projection-jackpot projection-panel relative overflow-hidden rounded-[1.35rem] border-emerald-300/25 px-4 py-3">
      <div className="absolute inset-0" aria-hidden="true">
        {JACKPOT_BALLS.map((number, index) => (
          <span
            key={number}
            className="projection-jackpot-ball"
            style={{ "--ball-index": index } as CSSProperties}
          >
            {number}
          </span>
        ))}
      </div>
      <div className="relative z-10 flex h-full items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-black tracking-[0.2em] text-emerald-200/80">
            <Ticket className="h-4 w-4" />
            JACKPOT
          </div>
          <div className="mt-1 text-sm font-black text-white">大樂透獎金池</div>
        </div>
        <div className="text-right">
          <AnimatedNum
            value={pool}
            className="neon-emerald text-[2.5rem] font-black leading-none"
          />
          <div className="mt-1 text-[0.65rem] font-bold tracking-[0.2em] text-emerald-200/60">
            光幣
          </div>
        </div>
      </div>
    </section>
  );
}

function RegionArena({ snap }: { snap: Snapshot }) {
  return (
    <section
      aria-label="四區資產競技場"
      className="grid min-h-0 grid-cols-2 grid-rows-2 gap-3"
    >
      {REGIONS.map((region) => {
        const regionState = snap.regions.find(
          (item) => item.code === region.code,
        );
        const properties = snap.properties.filter(
          (property) => property.region === region.code,
        );
        const controlled = Boolean(regionState?.monopolyTeamName);
        const ui = REGION_UI[region.code];

        return (
          <article
            key={region.code}
            data-region={region.code}
            data-controlled={controlled ? "true" : "false"}
            className={`projection-region-card relative flex min-h-0 flex-col overflow-hidden rounded-[1.35rem] border bg-gradient-to-br p-3 ${
              controlled ? "projection-region-controlled" : ""
            } ${ui.panel}`}
            style={
              {
                "--region-glow": REGION_GLOW[region.code],
              } as CSSProperties
            }
          >
            <div className="relative z-10 mb-2 flex min-h-[3.25rem] items-center justify-between gap-3 border-b border-white/10 pb-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${ui.dot}`} />
                  <h2 className={`truncate text-lg font-black ${ui.text}`}>
                    {region.name}
                  </h2>
                </div>
                <div className="mt-0.5 truncate text-[0.62rem] font-bold tracking-[0.1em] text-slate-500">
                  {region.theme}
                </div>
              </div>

              <DominanceBadge
                teamName={regionState?.monopolyTeamName ?? null}
                toll={regionState?.toll ?? 0}
                accentClass={ui.text}
              />
            </div>

            <ul
              className="relative z-10 grid min-h-0 flex-1 gap-1"
              style={{
                gridTemplateRows: `repeat(${Math.max(properties.length, 1)}, minmax(0, 1fr))`,
              }}
            >
              {properties.map((property) => (
                <li
                  key={property.id}
                  className={`grid min-h-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border px-2.5 ${
                    property.ownerTeamId
                      ? "border-white/10 bg-black/35"
                      : "border-white/[0.04] bg-black/15 text-slate-400"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-[0.92rem] font-bold leading-none">
                      {property.name}
                    </span>
                    {property.ownerTeamId != null && (
                      <ProjectionLevelLights level={property.level} />
                    )}
                    {property.ownerName && (
                      <span className="max-w-[4.7rem] shrink-0 truncate rounded-md border border-sky-300/15 bg-sky-400/10 px-1.5 py-0.5 text-[0.62rem] font-black leading-none text-sky-200">
                        {property.ownerName}
                      </span>
                    )}
                  </div>
                  <PriceTag
                    current={property.currentValue}
                    base={property.basePrice}
                    className="text-base font-black leading-none"
                  />
                </li>
              ))}
            </ul>
          </article>
        );
      })}
    </section>
  );
}

function DominanceBadge({
  teamName,
  toll,
  accentClass,
}: {
  teamName: string | null;
  toll: number;
  accentClass: string;
}) {
  if (!teamName) {
    return (
      <div className="shrink-0 rounded-xl border border-white/10 bg-black/20 px-3 py-1.5 text-right">
        <div className="text-[0.6rem] font-black tracking-[0.18em] text-slate-500">
          區域狀態
        </div>
        <div className="text-xs font-bold text-slate-300">競逐中</div>
      </div>
    );
  }

  return (
    <div className="projection-dominance-badge shrink-0 rounded-xl border px-3 py-1.5 text-right">
      <div className="flex items-center justify-end gap-1.5">
        <Crown className={`h-4 w-4 ${accentClass}`} />
        <span className="text-sm font-black text-white">{teamName} 獨佔</span>
      </div>
      <div className="mt-0.5 text-[0.65rem] font-bold text-slate-300">
        過路費{" "}
        <AnimatedNum
          value={toll}
          className={`ml-1 text-base font-black ${accentClass}`}
        />
      </div>
    </div>
  );
}

function ProjectionLevelLights({ level }: { level: number }) {
  const tier = getProjectionLevelTier(level);
  return (
    <span
      data-level-tier={tier}
      className="projection-level-lights inline-flex shrink-0 items-center gap-1"
      title={`資產等級 ${level}`}
    >
      {[1, 2, 3].map((step) => (
        <span
          key={step}
          data-active={step <= level ? "true" : "false"}
          className="projection-level-light h-1.5 w-1.5 rounded-full"
        />
      ))}
    </span>
  );
}

function PanelTitle({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <h2 className="mb-2 flex h-6 items-center gap-2 text-sm font-black tracking-[0.12em] text-slate-200">
      <span className="text-amber-300">{icon}</span>
      {children}
    </h2>
  );
}

function useClock() {
  const [now, setNow] = useState(() => formatClock(new Date()));
  useEffect(() => {
    const id = window.setInterval(() => setNow(formatClock(new Date())), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

function formatClock(date: Date) {
  return date.toLocaleTimeString("zh-TW", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
