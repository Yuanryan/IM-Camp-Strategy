"use client";

import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Trophy, Crown, Landmark, Gavel, Ticket, RadioTower, Gem, WifiOff } from "lucide-react";
import { useSnapshot } from "@/components/client";
import { Num, AnimatedNum, PriceTag, LevelDots } from "@/components/ui";
import { REGIONS, REGION_UI } from "@/lib/game";
import {
  AuctionHammerOverlay,
  HammerImagePreloader,
} from "@/components/views/projection/AuctionHammerOverlay";
import { AuctionStageOverlay } from "@/components/views/projection/AuctionStageOverlay";
import {
  detectAuctionCue,
  getAuctionStage,
  type AuctionAnimationSnapshot,
} from "@/lib/auction-animation";
import {
  addProjectionAnimations,
  buildAuctionAnimationItem,
  buildEventTickerEntries,
  buildLotteryAnimationItem,
  completeProjectionAnimation,
  type LotteryDrawResult,
  type ProjectionAnimationItem,
  type ProjectionAnimationQueueState,
} from "@/lib/projection-animation";
import type { Snapshot, TeamView } from "@/lib/snapshot";

export function ProjectionView() {
  const { snap, error } = useSnapshot(2000, "/api/public/snapshot");
  const { activeAnimation, completeActiveAnimation } =
    useProjectionAnimationQueue(snap ?? null);

  if (error) return <FullMsg text="連線錯誤，重試中…" tone="error" />;
  if (!snap) return <FullMsg text="載入中…" tone="loading" />;

  const ranking = [...snap.teams].sort((a, b) => b.netWorth - a.netWorth);
  const maxWorth = Math.max(1, ...ranking.map((t) => t.netWorth));
  const auctionStage = getAuctionStage({
    eventOpen: snap.auction.eventId != null,
    started: snap.auction.started,
    hasLiveLot: snap.auction.live != null,
    hasQueuedLots: snap.auction.queuedLotCount > 0,
  });

  return (
    <div className="min-h-screen px-6 py-5 lg:px-8">
      <Header snap={snap} />

      <div className="mt-5 grid grid-cols-12 gap-5">
        {/* 左：資產排行（主視覺） */}
        <section className="col-span-12 xl:col-span-7">
          <Leaderboard ranking={ranking} maxWorth={maxWorth} />
        </section>

        {/* 右：各區獨佔 + 拍賣 + 大樂透 */}
        <aside className="col-span-12 flex flex-col gap-5 xl:col-span-5">
          <RegionBoard snap={snap} />
          <AuctionCard snap={snap} />
          <LotteryStrip snap={snap} />
        </aside>
      </div>

      {/* 下：四區不動產地圖 */}
      <PropertyMap snap={snap} />

      <HammerImagePreloader />

      {/* 第一件開始後常駐，最後一件完成即退場；不改動底下既有投影 UI。 */}
      <AnimatePresence>
        {auctionStage !== "hidden" && (
          <AuctionStageOverlay
            key={`auction-stage-${snap.auction.eventId}`}
            auction={snap.auction}
            stage={auctionStage}
          />
        )}
      </AnimatePresence>

      {/* 一次性全螢幕動畫排隊：大樂透 → 拍賣。市場事件改由 Header 跑馬燈常駐顯示。 */}
      <AnimatePresence mode="wait">
        {activeAnimation?.kind === "lottery" ? (
          <LotteryDrawOverlay
            key={activeAnimation.id}
            result={activeAnimation.result}
            onComplete={completeActiveAnimation}
          />
        ) : activeAnimation?.kind === "auction" ? (
          <AuctionHammerOverlay
            key={activeAnimation.id}
            cue={activeAnimation.cue}
            onComplete={completeActiveAnimation}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* ── 一次性投影動畫偵測與排隊 ───────────────────────────────── */
const EMPTY_ANIMATION_QUEUE: ProjectionAnimationQueueState = {
  active: null,
  waiting: [],
};

type ProjectionQueueAction =
  | { type: "add"; items: ProjectionAnimationItem[] }
  | { type: "complete" };

function projectionQueueReducer(
  state: ProjectionAnimationQueueState,
  action: ProjectionQueueAction,
): ProjectionAnimationQueueState {
  return action.type === "add"
    ? addProjectionAnimations(state, action.items)
    : completeProjectionAnimation(state);
}

function toAuctionAnimationSnapshot(
  auction: Snapshot["auction"],
): AuctionAnimationSnapshot {
  return {
    live: auction.live
      ? {
          id: auction.live.id,
          title: auction.live.title,
          currentBid: auction.live.currentBid,
        }
      : null,
    recentlySold: auction.recentlySold,
  };
}

function useProjectionAnimationQueue(snapshot: Snapshot | null) {
  const [queue, dispatchQueue] = useReducer(
    projectionQueueReducer,
    EMPTY_ANIMATION_QUEUE,
  );
  const initialized = useRef(false);
  const previousDrawAt = useRef<string | null>(null);
  const previousAuction = useRef<AuctionAnimationSnapshot | null>(null);

  useEffect(() => {
    if (!snapshot) return;

    const currentAuction = toAuctionAnimationSnapshot(snapshot.auction);
    if (!initialized.current) {
      initialized.current = true;
      previousDrawAt.current = snapshot.lottery.lastDraw?.at ?? null;
      previousAuction.current = currentAuction;
      return;
    }

    const additions: ProjectionAnimationItem[] = [];
    const draw = snapshot.lottery.lastDraw;
    if (draw && draw.at !== previousDrawAt.current) {
      additions.push(buildLotteryAnimationItem(draw));
    }

    const auctionCue = detectAuctionCue(
      previousAuction.current,
      currentAuction,
    );
    if (auctionCue) {
      additions.push(buildAuctionAnimationItem(auctionCue));
    }

    previousDrawAt.current = draw?.at ?? null;
    previousAuction.current = currentAuction;

    if (additions.length > 0) {
      dispatchQueue({ type: "add", items: additions });
    }
  }, [snapshot]);

  const completeActiveAnimation = useCallback(() => {
    dispatchQueue({ type: "complete" });
  }, []);

  return {
    activeAnimation: queue.active,
    completeActiveAnimation,
  };
}

// 開獎動畫時間表（ms）
const ROLL_MS = 2100;
const HOLD_MS = 4000;

function rnd() {
  return Math.floor(Math.random() * 50) + 1;
}

/* ── 標題列：品牌 + 即時時鐘 + 階段 + 事件跑馬 ───────────────── */
function Header({ snap }: { snap: Snapshot }) {
  const clock = useClock();
  const phase =
    snap.phase === "SETTLED"
      ? { label: "已結算", cls: "bg-amber-500/15 text-amber-300 ring-amber-400/40", dot: "bg-amber-400" }
      : snap.phase === "RUNNING"
        ? { label: "進行中", cls: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/40", dot: "bg-emerald-400 animate-pulse" }
        : { label: "準備中", cls: "bg-slate-500/15 text-slate-300 ring-slate-400/30", dot: "bg-slate-400" };

  return (
    <header className="glass overflow-hidden rounded-3xl px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-cyan-500 to-yellow-400 shadow-lg shadow-cyan-500/40">
            <Gem className="h-7 w-7 text-slate-950" strokeWidth={2.25} />
          </span>
          <div>
            <h1 className="bg-gradient-to-r from-cyan-200 via-cyan-100 to-yellow-200 bg-clip-text text-3xl font-black leading-none tracking-tight text-transparent lg:text-4xl">
              IM 大富翁：迷霧資本戰
            </h1>
            <div className="mt-1 text-xs uppercase tracking-[0.3em] text-slate-500">
              IM Monopoly · Misty Capital War
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className={`flex items-center gap-2 rounded-full px-4 py-2 text-base font-bold ring-1 ${phase.cls}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${phase.dot}`} />
            {phase.label}
          </span>
          <div className="hidden text-right sm:block">
            <Num className="block text-3xl font-black leading-none text-slate-100">{clock}</Num>
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
    24,
    entries.reduce((total, entry) => total + entry.text.length, 0) / 5,
  );

  const tickerContent = (
    <>
      {entries.map((entry) => (
        <span
          key={entry.eventIndex}
          className="inline-flex shrink-0 items-center gap-3"
        >
          <span className="rounded-md bg-cyan-300/12 px-2 py-0.5 text-xs font-black text-cyan-200 ring-1 ring-cyan-300/20">
            EVENT {String(entry.eventIndex).padStart(2, "0")}
          </span>
          <span>{entry.text}</span>
          <span className="px-4 text-cyan-300/45">◆</span>
        </span>
      ))}
    </>
  );

  return (
    <div className="breathe mt-4 flex items-center gap-3 overflow-hidden rounded-2xl border border-cyan-400/40 bg-cyan-400/10 px-4 py-2.5">
      <RadioTower className="h-5 w-5 shrink-0 text-cyan-400" />
      <span className="shrink-0 text-sm font-bold uppercase tracking-widest text-cyan-200">
        市場事件
      </span>
      <div
        className="min-w-0 flex-1 overflow-hidden text-base font-semibold text-cyan-100/90"
        aria-live="polite"
      >
        {reduceMotion ? (
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {tickerContent}
          </div>
        ) : (
          <motion.div
            className="flex w-max whitespace-nowrap"
            animate={{ x: ["0%", "-50%"] }}
            transition={{
              duration,
              ease: "linear",
              repeat: Infinity,
            }}
          >
            <div className="flex shrink-0 pr-12">{tickerContent}</div>
            <div className="flex shrink-0 pr-12" aria-hidden="true">
              {tickerContent}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

/* ── 資產排行：統一排名條（前三名保留金/銀/銅配色）─────────────── */
// 各名次的配色：醒目度由名次決定，前三名金銀銅，其餘中性。金額一律金色。
const RANK_STYLE = [
  { badge: "bg-amber-400/20 text-amber-300", bar: "from-amber-400/30" },
  { badge: "bg-slate-300/20 text-slate-200", bar: "from-slate-300/25" },
  { badge: "bg-orange-400/20 text-orange-300", bar: "from-orange-400/25" },
];
const REST_STYLE = { badge: "bg-white/5 text-amber-300/90", bar: "from-amber-500/15" };

function Leaderboard({ ranking, maxWorth }: { ranking: TeamView[]; maxWorth: number }) {
  return (
    <div className="glass h-full rounded-3xl p-5">
      <SectionTitle icon={<Trophy className="h-5 w-5" />} accent="text-amber-300">
        資產排行
      </SectionTitle>

      <ol className="space-y-2">
        <AnimatePresence initial={false}>
          {ranking.map((t, idx) => {
            const s = RANK_STYLE[idx] ?? REST_STYLE;
            return (
              <motion.li
                key={t.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="relative overflow-hidden rounded-2xl border border-white/5 bg-slate-800/40 px-4 py-2.5"
              >
                <motion.div
                  className={`absolute inset-y-0 left-0 bg-gradient-to-r to-transparent ${s.bar}`}
                  initial={false}
                  animate={{ width: `${(t.netWorth / maxWorth) * 100}%` }}
                  transition={{ type: "spring", stiffness: 120, damping: 22 }}
                />
                <div className="relative flex items-center justify-between">
                  <span className="flex items-center gap-3 font-semibold text-slate-100">
                    <span className={`grid h-8 w-8 place-items-center rounded-lg text-sm font-black ${s.badge}`}>
                      {idx + 1}
                    </span>
                    {t.name}
                  </span>
                  <AnimatedNum value={t.netWorth} className="neon-gold text-2xl font-black" />
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>
    </div>
  );
}

/* ── 各區獨佔 / 過路費 ───────────────────────────────────────── */
function RegionBoard({ snap }: { snap: Snapshot }) {
  return (
    <div className="glass rounded-3xl p-5">
      <SectionTitle icon={<Landmark className="h-5 w-5" />} accent="text-sky-300">
        各區獨佔 · 過路費
      </SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        {snap.regions.map((r) => {
          const ui = REGION_UI[r.code];
          const held = !!r.monopolyTeamName;
          return (
            <div
              key={r.code}
              className={`rounded-2xl border bg-gradient-to-b p-3 ${held ? ui.panel : "border-white/5 from-slate-800/30 to-transparent"}`}
            >
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${ui.dot}`} />
                <span className={`text-sm font-bold ${ui.text}`}>{r.name}</span>
              </div>
              {held ? (
                <div className="mt-2 flex items-center gap-2">
                  <Crown className="h-4 w-4 shrink-0 text-amber-300" />
                  <span className="min-w-0 flex-1 truncate text-base font-bold text-slate-100">
                    {r.monopolyTeamName}
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-500/15 px-2 py-0.5 text-amber-200">
                    <span className="text-[10px] uppercase tracking-wider opacity-70">過路費</span>
                    <AnimatedNum value={r.toll} className="text-base font-black" />
                  </span>
                </div>
              ) : (
                <div className="mt-3 text-sm text-slate-500">— 無獨佔 —</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── 拍賣狀態卡：顯示「即將開始」公告或「進行中」現場喊價 ───────── */
function AuctionCard({ snap }: { snap: Snapshot }) {
  const { announcement, eventName, live, recentlySold } = snap.auction;
  const going = !!live;
  const starting = !going && (!!announcement || !!eventName);

  // 沒有進行中、沒有公告、也沒有近期成交 → 不顯示卡片，避免空白。
  if (!going && !starting && recentlySold.length === 0) return null;

  return (
    <div
      className={`glass overflow-hidden rounded-3xl p-5 ${
        going
          ? "breathe border-amber-400/50 shadow-[0_0_24px_rgba(251,191,36,0.2)]"
          : starting
            ? "border-amber-400/30"
            : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <SectionTitle icon={<Gavel className="h-5 w-5" />} accent="text-amber-300" noMargin>
          拍賣會
        </SectionTitle>
        {going ? (
          <span className="flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-sm font-bold text-amber-200 ring-1 ring-amber-400/40">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" /> 拍賣進行中
          </span>
        ) : starting ? (
          <span className="rounded-full bg-amber-500/15 px-3 py-1 text-sm font-bold text-amber-300 ring-1 ring-amber-400/30">
            即將開始
          </span>
        ) : null}
      </div>

      {/* 進行中：現場喊價 */}
      {going && live && (
        <div className="mt-3 flex items-end justify-between gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/5 px-4 py-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-amber-300/70">拍賣中</div>
            <div className="truncate text-xl font-black text-slate-100">{live.title}</div>
            {eventName && <div className="truncate text-xs text-slate-500">{eventName}</div>}
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[10px] uppercase tracking-widest text-amber-300/70">目前喊價</div>
            <AnimatedNum value={live.currentBid} className="neon-gold text-4xl font-black leading-none" />
          </div>
        </div>
      )}

      {/* 即將開始：顯示公告 */}
      {starting && (
        <div className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-400/5 px-4 py-3">
          {eventName && <div className="text-base font-bold text-slate-100">{eventName}</div>}
          {announcement && <div className="mt-0.5 text-sm text-amber-200/90">{announcement}</div>}
        </div>
      )}

      {/* 近期成交 */}
      {recentlySold.length > 0 && (
        <div className="mt-4 border-t border-white/5 pt-3">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-300/70">近期成交</div>
          <ul className="space-y-1">
            {recentlySold.slice(0, 3).map((s, i) => (
              <li key={i} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-slate-300">{s.title}</span>
                <span className="shrink-0">
                  <span className="text-sky-300">{s.winnerTeamName}</span>
                  <AnimatedNum value={s.finalPrice} className="ml-1.5 text-amber-200" />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ── 大樂透（壓縮側欄）──────────────────────────────────────── */
function LotteryStrip({ snap }: { snap: Snapshot }) {
  return (
    <div className="glass rounded-3xl p-5">
      <div className="flex items-center justify-between">
        <SectionTitle icon={<Ticket className="h-5 w-5" />} accent="text-emerald-300" noMargin>
          大樂透 · 第 {snap.lottery.period} 期
        </SectionTitle>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-emerald-300/60">獎金池</div>
          <AnimatedNum value={snap.lottery.pool} className="neon-emerald text-3xl font-black leading-none" />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {snap.lottery.numbers.length === 0 && (
          <span className="text-sm text-slate-500">尚無登記號碼</span>
        )}
        {snap.lottery.numbers.map((n) => (
          <span
            key={n.id}
            title={n.teamName}
            className="num grid h-8 w-8 place-items-center rounded-lg bg-emerald-900/40 text-sm font-bold text-emerald-200 ring-1 ring-emerald-400/25"
          >
            {n.number}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── 四區不動產地圖 ─────────────────────────────────────────── */
function PropertyMap({ snap }: { snap: Snapshot }) {
  return (
    <div className="mt-5 grid grid-cols-2 gap-5 xl:grid-cols-4">
      {REGIONS.map((region) => {
        const ui = REGION_UI[region.code];
        const props = snap.properties.filter((p) => p.region === region.code);
        return (
          <section
            key={region.code}
            className={`rounded-3xl border bg-gradient-to-b p-4 backdrop-blur ${ui.panel}`}
          >
            <div className="mb-3 flex items-baseline justify-between">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${ui.dot}`} />
                <h3 className={`text-base font-black ${ui.text}`}>{region.name}</h3>
              </div>
              <span className="text-[10px] tracking-wide text-slate-500">{region.theme}</span>
            </div>
            <ul className="space-y-1.5">
              {props.map((p) => (
                <li
                  key={p.id}
                  className={`flex items-center justify-between rounded-xl px-2.5 py-1.5 text-sm transition-colors ${
                    p.ownerTeamId ? "bg-black/30" : "bg-black/10 text-slate-500"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-1.5 truncate">
                    <span className="truncate">{p.name}</span>
                    {p.ownerTeamId != null && <LevelDots level={p.level} />}
                     {p.ownerName && (
                      <span className="max-w-[5rem] truncate rounded-md bg-sky-500/15 px-1.5 py-0.5 text-[11px] font-medium text-sky-300">
                        {p.ownerName}
                      </span>
                    )}
                  </span>
                  <span className="ml-2 flex shrink-0 items-center gap-1.5 text-right">
                    
                    <PriceTag current={p.currentValue} base={p.basePrice} />

                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/* ── 小工具 ─────────────────────────────────────────────────── */
function SectionTitle({
  icon,
  accent,
  children,
  noMargin,
}: {
  icon: React.ReactNode;
  accent: string;
  children: React.ReactNode;
  noMargin?: boolean;
}) {
  return (
    <h2 className={`flex items-center gap-2 text-lg font-bold ${accent} ${noMargin ? "" : "mb-4"}`}>
      <span className={accent}>{icon}</span>
      {children}
    </h2>
  );
}

/* ── 開獎動畫覆蓋層（由統一佇列控制播放）─────────────────────── */
function LotteryDrawOverlay({
  result,
  onComplete,
}: {
  result: LotteryDrawResult;
  onComplete: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [rollNum, setRollNum] = useState(rnd);
  const res = result;
  const isWin = !!res.winnerName;

  useEffect(() => {
    const rollTimer = window.setInterval(() => setRollNum(rnd()), 70);
    const revealTimer = window.setTimeout(() => {
      window.clearInterval(rollTimer);
      setRollNum(result.number);
      setRevealed(true);
    }, ROLL_MS);
    const closeTimer = window.setTimeout(
      onComplete,
      ROLL_MS + HOLD_MS,
    );
    return () => {
      window.clearInterval(rollTimer);
      window.clearTimeout(revealTimer);
      window.clearTimeout(closeTimer);
    };
  }, [onComplete, result.number]);

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      <div className="mb-8 text-xl font-bold uppercase tracking-[0.4em] text-emerald-300/80">
        <span className="inline-flex items-center gap-3">
          <Ticket className="h-6 w-6" />
          {revealed ? "大樂透開獎結果" : "大樂透開獎中…"}
        </span>
      </div>

      {/* 開獎球 */}
      <div
        key={revealed ? "land" : "roll"}
        className={`flex h-60 w-60 items-center justify-center rounded-full ${revealed ? "draw-land" : "draw-roll"}`}
        style={{
          background: revealed
            ? "radial-gradient(circle at 35% 30%, rgba(52,211,153,0.45) 0%, rgba(16,185,129,0.12) 100%)"
            : "radial-gradient(circle at 35% 30%, rgba(34,211,238,0.4) 0%, rgba(6,182,212,0.1) 100%)",
          border: revealed ? "4px solid rgba(52,211,153,0.7)" : "4px solid rgba(34,211,238,0.55)",
          boxShadow: revealed
            ? "0 0 80px rgba(52,211,153,0.6), inset 0 2px 0 rgba(255,255,255,0.18)"
            : "0 0 48px rgba(34,211,238,0.4), inset 0 2px 0 rgba(255,255,255,0.14)",
        }}
      >
        <Num className={`text-[9rem] font-black leading-none ${revealed ? "neon-emerald" : "text-cyan-200"}`}>
          {rollNum}
        </Num>
      </div>

      {/* 結果文字 */}
      {revealed && (
        <div className="draw-result-in mt-10 flex flex-col items-center gap-3 px-6 text-center">
          {isWin ? (
            <>
              <div className="text-4xl font-black text-emerald-200">🎉 {res.winnerName} 中獎！</div>
              <div className="text-lg text-slate-300">
                獲得獎金 <Num className="neon-gold text-3xl font-black">{res.pool.toLocaleString("en-US")}</Num> 光幣
              </div>
            </>
          ) : (
            <>
              <div className="text-4xl font-black text-rose-200">無人中獎</div>
              <div className="text-lg text-slate-300">
                獎金池累積至 <Num className="neon-emerald text-3xl font-black">{res.pool.toLocaleString("en-US")}</Num> 光幣
              </div>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}

function useClock() {
  // 惰性初始化取當下時間（不在 effect 內同步 setState，符合 react-hooks 規範）。
  // 本元件僅在 client 端、且 snapshot 載入後才渲染，故無 SSR/CSR hydration 疑慮。
  const [now, setNow] = useState(() => fmt(new Date()));
  useEffect(() => {
    const id = setInterval(() => setNow(fmt(new Date())), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}
function fmt(d: Date) {
  return d.toLocaleTimeString("zh-TW", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function FullMsg({ text, tone }: { text: string; tone: "error" | "loading" }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      {tone === "error" ? (
        <WifiOff className="h-12 w-12 text-rose-300" />
      ) : (
        <Gem className="h-12 w-12 animate-pulse text-cyan-300" />
      )}
      <div className={`text-2xl ${tone === "error" ? "text-rose-300" : "text-slate-400"}`}>{text}</div>
    </div>
  );
}
