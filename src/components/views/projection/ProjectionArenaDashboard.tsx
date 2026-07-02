"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Crown,
  Gem,
  Medal,
  RadioTower,
  Ticket,
  Trophy,
} from "lucide-react";

import { AnimatedNum, PriceTag } from "@/components/ui";
import { FullscreenButton } from "@/components/ui/fullscreen-button";
import { JackpotBallCanvas, type JackpotBallDef } from "./JackpotBallCanvas";
import { REGIONS, REGION_UI, REGION_MONOPOLY_EFFECT, monopolyEffectText, type MonopolyEffect, type RegionCode } from "@/lib/game";
import {
  getProjectionLevelTier,
  getProjectionRankNameScale,
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
  bronze: "projection-rank-bronze",
  standard: "projection-rank-standard",
};

export function ProjectionArenaDashboard({
  snap,
  lotteryAnimating,
  previousPropertyCurrentValues,
}: {
  snap: Snapshot;
  lotteryAnimating?: boolean;
  previousPropertyCurrentValues?: Record<number, number>;
}) {
  const ranking = [...snap.teams].sort((a, b) => b.netWorth - a.netWorth);
  return (
    <div
      data-testid="projection-dashboard"
      className="projection-arena h-dvh overflow-hidden p-3 text-slate-100"
    >
      <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
        <ArenaHeader snap={snap} />

        <main className="grid min-h-0 grid-cols-[26rem_minmax(0,1fr)] gap-3">
          <aside className="grid min-h-0 grid-rows-[8.75rem_minmax(0,1fr)] gap-3">
            <JackpotCard
              pool={snap.lottery.pool}
              numbers={snap.lottery.numbers}
              teams={snap.teams}
              frozen={lotteryAnimating ?? false}
            />
            <ArenaLeaderboard ranking={ranking} />
          </aside>

          <RegionArena
            snap={snap}
            previousPropertyCurrentValues={previousPropertyCurrentValues}
          />
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

function ArenaLeaderboard({ ranking }: { ranking: TeamView[] }) {
  const reduceMotion = useReducedMotion();

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
            return (
              <motion.li
                key={team.id}
                layout={reduceMotion ? false : "position"}
                data-rank-tier={tier}
                className={`projection-rank-row relative min-h-0 overflow-hidden rounded-xl border ${RANK_TIER_CLASS[tier]}`}
                style={
                  {
                    "--team-color": team.color,
                    "--team-ring-color": team.colorRing,
                  } as CSSProperties
                }
                transition={{
                  layout: {
                    type: "tween",
                    duration: 1.3,
                    ease: [0.16, 1, 0.3, 1],
                  },
                }}
              >
                {!reduceMotion && (
                  <AnimatePresence initial={false}>
                    <motion.span
                      key={`rank-slot-${index}`}
                      aria-hidden="true"
                      className="projection-rank-insert-slot"
                      initial={{ opacity: 0, scaleX: 0.18 }}
                      animate={{ opacity: [0, 0.82, 0.32, 0], scaleX: [0.18, 0.78, 1, 1.15] }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.3, times: [0, 0.22, 0.62, 1], ease: [0.16, 1, 0.3, 1] }}
                    />
                    <motion.span
                      key={`rank-cursor-${index}`}
                      aria-hidden="true"
                      className="projection-rank-insert-cursor"
                      initial={{ opacity: 0, x: "-140%" }}
                      animate={{ opacity: [0, 1, 0.85, 0], x: ["-140%", "40%", "360%", "520%"] }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.3, times: [0, 0.18, 0.67, 1], ease: [0.16, 1, 0.3, 1] }}
                    />
                  </AnimatePresence>
                )}
                <div className="projection-rank-content relative flex h-full min-h-[1.8rem] items-center">
                  <span className="projection-rank-team-color" aria-hidden="true" />
                  <RankBadge index={index} tier={tier} />
                  {reduceMotion ? (
                    <span
                      className="projection-rank-name min-w-0 flex-1 truncate font-black"
                      style={{ "--rank-name-scale": getProjectionRankNameScale(team.name) } as CSSProperties}
                    >
                      {team.name}
                    </span>
                  ) : (
                    <AnimatePresence initial={false} mode="wait">
                      <motion.span
                        key={`rank-name-${index}`}
                        className="projection-rank-name min-w-0 flex-1 truncate font-black"
                        style={{ "--rank-name-scale": getProjectionRankNameScale(team.name) } as CSSProperties}
                        initial={{ opacity: 0, x: -18 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.45, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
                      >
                        {team.name}
                      </motion.span>
                    </AnimatePresence>
                  )}
                  <span className="flex shrink-0 items-baseline gap-1.5 leading-none">
                    <AnimatedNum
                      value={team.coins}
                      className="projection-rank-coins font-bold tabular-nums opacity-60"
                    />
                    <span className="projection-rank-sep opacity-40">/</span>
                    <AnimatedNum
                      value={team.netWorth}
                      className="projection-rank-value font-black leading-none"
                    />
                  </span>
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
    ) : tier === "silver" || tier === "bronze" ? (
      <Medal className="projection-rank-icon" />
    ) : (
      index + 1
    );

  return (
    <motion.span
      key={`${tier}-${index}`}
      className="projection-rank-badge grid shrink-0 place-items-center rounded-lg font-black"
      initial={{ opacity: 0, rotate: -14, scale: 0.62 }}
      animate={{ opacity: 1, rotate: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 180, damping: 14, mass: 0.8 }}
    >
      {icon}
    </motion.span>
  );
}

function makeBalls(
  numbers: Snapshot["lottery"]["numbers"],
  teams: TeamView[],
): JackpotBallDef[] {
  return numbers.map((n) => {
    const team = teams.find((t) => t.id === n.teamId);
    return {
      number: n.number,
      color: team?.color ?? "#6b7280",
      ringColor: team?.colorRing ?? "#9ca3af",
    };
  });
}

function JackpotCard({
  pool,
  numbers,
  teams,
  frozen,
}: {
  pool: number;
  numbers: Snapshot["lottery"]["numbers"];
  teams: TeamView[];
  frozen: boolean;
}) {
  const [displayBalls, setDisplayBalls] = useState<JackpotBallDef[]>(() =>
    makeBalls(numbers, teams),
  );

  useEffect(() => {
    if (!frozen) setDisplayBalls(makeBalls(numbers, teams));
  }, [frozen, numbers, teams]);

  return (
    <section className="projection-jackpot projection-panel relative overflow-hidden rounded-[1.35rem] border-emerald-300/25 px-4 py-3">
      <JackpotBallCanvas balls={displayBalls} />
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" aria-hidden="true" />
      <div className="projection-jackpot-content relative z-10 flex h-full items-end justify-between gap-3 pb-1">
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

function RegionArena({
  snap,
  previousPropertyCurrentValues,
}: {
  snap: Snapshot;
  previousPropertyCurrentValues?: Record<number, number>;
}) {
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
        const propertyRowCount = Math.max(Math.ceil(properties.length / 2), 1);

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
            <div className="relative z-10 mb-1.5 flex min-h-[2.55rem] items-center justify-between gap-3 border-b border-white/10 pb-1.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`h-3 w-3 rounded-full ${ui.dot}`} />
                  <h2 className={`truncate text-[clamp(1.25rem,2.1vw,1.65rem)] font-black leading-none ${ui.text}`}>
                    {region.name}
                  </h2>
                </div>
              </div>

              <DominanceBadge
                teamName={regionState?.monopolyTeamName ?? null}
                toll={regionState?.toll ?? 0}
                effect={REGION_MONOPOLY_EFFECT[region.code]}
                settings={snap.settings}
                accentClass={ui.text}
              />
            </div>

            <ul
              className="projection-property-card-grid relative z-10 grid min-h-0 flex-1 grid-cols-2 gap-1.5"
              style={{
                gridTemplateRows: `repeat(${propertyRowCount}, minmax(0, 1fr))`,
              }}
            >
              {properties.map((property) => {
                const previousCurrentValue =
                  previousPropertyCurrentValues?.[property.id] ??
                  property.currentValue;
                const isWhiteOwner = property.ownerColorName === "白";
                const isDarkOwner =
                  property.ownerColorName === "黑" ||
                  property.ownerColor?.toLowerCase() === "#020617";
                const ownerLabel = property.ownerName ?? "未售出";
                const propertyNameSizeClass =
                  getProjectionPropertyNameSizeClass(property.name);
                const ownerTagStyle: CSSProperties = {
                  borderColor: property.ownerName
                    ? `${property.ownerColorRing ?? property.ownerColor ?? "#7dd3fc"}${isWhiteOwner ? "" : "99"}`
                    : "rgba(148, 163, 184, 0.18)",
                  background: property.ownerName
                    ? isWhiteOwner || isDarkOwner
                      ? (property.ownerColor ?? "#f8fafc")
                      : `${property.ownerColor ?? "#38bdf8"}26`
                    : "rgba(15, 23, 42, 0.72)",
                  color: property.ownerName
                    ? isWhiteOwner || isDarkOwner
                      ? (property.ownerColorText ?? "#0f172a")
                      : (property.ownerColorRing ?? property.ownerColor ?? "#bae6fd")
                    : "rgba(203, 213, 225, 0.78)",
                  boxShadow: property.ownerName
                    ? `0 0 6px ${property.ownerColorRing ?? property.ownerColor ?? "#38bdf8"}44`
                    : "none",
                };

                return (
                  <li
                    key={property.id}
                    className={`projection-property-row projection-property-mini-card grid min-h-0 grid-rows-[minmax(0,1fr)_auto] overflow-hidden rounded-xl border px-3 py-2 ${
                      property.ownerTeamId
                        ? "border-white/10 bg-black/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                        : "border-white/[0.05] bg-black/15 text-slate-400"
                    }`}
                  >
                    <div className="projection-property-card-main grid min-h-0 grid-cols-[minmax(0,1fr)_minmax(4.4rem,max-content)] items-start gap-2">
                      <span className={`projection-property-name-large min-w-0 truncate font-black leading-tight ${propertyNameSizeClass}`}>
                        {property.name}
                      </span>
                      <PriceTag
                        current={
                          property.ownerTeamId != null
                            ? property.investedValue
                            : property.currentValue
                        }
                        base={property.basePrice}
                        trendValue={property.currentValue}
                        trendBase={previousCurrentValue}
                        hideTrendIcon
                        className="projection-property-price-large block shrink-0 justify-self-end text-right text-[clamp(1.22rem,1.95vw,1.62rem)] font-black leading-none tabular-nums"
                      />
                    </div>
                    <div className="projection-property-card-meta mt-1.5 grid min-w-0 grid-cols-[3.2rem_minmax(0,1fr)] items-center gap-2">
                      <ProjectionLevelLights level={property.level} />
                      <span
                        className="projection-owner-tag projection-owner-tag-compact min-w-0 max-w-full justify-self-end truncate whitespace-nowrap rounded-full border px-2 py-0.5 text-[0.64rem] font-black leading-none"
                        title={
                          property.ownerName
                            ? `${property.ownerName}（${property.ownerColorName ?? "小隊色"}）`
                            : "未售出"
                        }
                        style={ownerTagStyle}
                      >
                        {ownerLabel}
                      </span>
                    </div>
                  </li>
                );
              })}
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
  effect,
  settings,
  accentClass,
}: {
  teamName: string | null;
  toll: number;
  effect: MonopolyEffect;
  settings: { auroraMultiplier: number; spectraCardPoints: number };
  accentClass: string;
}) {
  if (!teamName) {
    return (
      <div className="projection-dominance-idle projection-dominance-badge-compact shrink-0 rounded-full border border-white/10 bg-black/20 px-3 py-1.5">
        <span className="text-[0.62rem] font-black tracking-[0.18em] text-slate-500">
          區域狀態
        </span>
        <span className="mx-2 text-slate-600">·</span>
        <span className="text-xs font-black text-slate-300">競逐中</span>
      </div>
    );
  }

  return (
    <div className="projection-dominance-badge projection-dominance-badge-compact shrink-0 rounded-full border px-3 py-1.5">
      <span className="flex min-w-0 items-center gap-1.5">
        <Crown className={`h-4 w-4 shrink-0 ${accentClass}`} />
        <span className="max-w-[12rem] truncate text-sm font-black text-white">
          {teamName}
        </span>
      </span>
      <span className="mx-2 h-4 w-px shrink-0 bg-white/15" aria-hidden="true" />
      <span className="whitespace-nowrap text-[0.7rem] font-black text-slate-300">
        過路費
        <AnimatedNum
          value={toll}
          className={`ml-1 text-lg font-black leading-none ${accentClass}`}
        />
      </span>
      <span className="mx-2 h-4 w-px shrink-0 bg-white/15" aria-hidden="true" />
      <span className={`whitespace-nowrap text-[0.72rem] font-black ${accentClass}`}>
        {monopolyEffectText(effect, settings)}
      </span>
    </div>
  );
}

function getProjectionPropertyNameSizeClass(name: string) {
  const length = [...name].length;
  if (length >= 14) {
    return "projection-property-name-compact text-[clamp(0.86rem,1.14vw,1.04rem)]";
  }
  if (length >= 10) {
    return "projection-property-name-medium text-[clamp(0.98rem,1.34vw,1.18rem)]";
  }
  return "text-[clamp(1.1rem,1.65vw,1.38rem)]";
}

function ProjectionLevelLights({ level }: { level: number }) {
  const tier = getProjectionLevelTier(level);
  return (
    <span
      data-level-tier={tier}
      className="projection-level-lights projection-level-lights-compact inline-flex shrink-0 items-center gap-1"
      title={`資產等級 ${level}`}
    >
      {[1, 2, 3].map((step) => (
        <span
          key={step}
          data-active={step <= level ? "true" : "false"}
          className="projection-level-light projection-level-light-compact h-2 w-2 rounded-full"
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
