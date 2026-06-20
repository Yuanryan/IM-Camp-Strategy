"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Crown, Landmark, Gavel, Ticket, RadioTower, Gem, WifiOff } from "lucide-react";
import { useSnapshot } from "@/components/client";
import { Num, AnimatedNum, PriceTag, LevelDots } from "@/components/ui";
import { EVENTS, REGIONS, REGION_UI } from "@/lib/game";
import {
  AuctionHammerOverlay,
  HammerImagePreloader,
  useAuctionAnimation,
} from "@/components/views/projection/AuctionHammerOverlay";
import { AuctionStageOverlay } from "@/components/views/projection/AuctionStageOverlay";
import { getAuctionStage } from "@/lib/auction-animation";
import type { Snapshot, TeamView } from "@/lib/snapshot";

export function ProjectionView() {
  const { snap, error } = useSnapshot(2000, "/api/public/snapshot");
  // 偵測「新的一次開獎」→ 自動播放開獎動畫覆蓋層（hook 必須在任何 early return 之前呼叫）
  const draw = useLotteryDraw(snap?.lottery.lastDraw ?? null);
  // 偵測同一拍賣品加價 / 新成交，逐幀切換 public/hammer 的兩張圖片。
  const auctionAnimation = useAuctionAnimation(snap?.auction ?? null);

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

      {/* 大樂透優先於法槌動畫；兩者都顯示在常駐拍賣舞台上方。 */}
      <AnimatePresence mode="wait">
        {draw ? (
          <DrawOverlay key={`lottery-${draw.result.at}`} draw={draw} />
        ) : auctionAnimation ? (
          <AuctionHammerOverlay
            key={`${auctionAnimation.cue.kind}-${auctionAnimation.cue.lotId}-${auctionAnimation.cue.amount}`}
            animation={auctionAnimation}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* ── 開獎偵測 + 自動播放 ─────────────────────────────────────────
   投影頁不主動開獎；它輪詢快照，發現 lastDraw.at 變新就重播動畫。
   首次載入時記住當前 at 但不播放（避免重整頁面就跳開獎）。 */
type LastDraw = NonNullable<Snapshot["lottery"]["lastDraw"]>;
type DrawState = { phase: "rolling" | "revealed"; rollNum: number; result: LastDraw };

// 開獎動畫時間表（ms）
const ROLL_MS = 2100; // 滾號
const HOLD_MS = 4000; // 定號後停留（之後由 AnimatePresence 淡出卸載）

function useLotteryDraw(lastDraw: LastDraw | null): DrawState | null {
  const [draw, setDraw] = useState<DrawState | null>(null);
  const initialized = useRef(false);
  const rollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // 最新的開獎內容放 ref，讓觸發 effect 只依賴原始字串 at（避免每次輪詢的新物件
  // 參考觸發 cleanup 而中斷動畫）。
  const at = lastDraw?.at ?? null;
  const latest = useRef<LastDraw | null>(null);
  useEffect(() => {
    latest.current = lastDraw;
  }, [lastDraw]);

  // 監看 at：首見只記錄、其後變動才觸發
  useEffect(() => {
    if (!at) return;
    if (!initialized.current) {
      initialized.current = true; // 首次載入記住當前開獎，不重播
      return;
    }
    const res = latest.current;
    if (!res) return;
    // 啟動：滾號 → 定號停留 → 卸載（淡出由 AnimatePresence exit 處理）
    setDraw({ phase: "rolling", rollNum: rnd(), result: res });
    const revealT = setTimeout(() => {
      setDraw((d) => (d ? { ...d, phase: "revealed", rollNum: res.number } : d));
    }, ROLL_MS);
    const closeT = setTimeout(() => setDraw(null), ROLL_MS + HOLD_MS);
    return () => {
      clearTimeout(revealT);
      clearTimeout(closeT);
    };
  }, [at]);

  // rolling 階段：每 70ms 翻一個隨機號碼
  useEffect(() => {
    if (draw?.phase !== "rolling") return;
    rollTimer.current = setInterval(() => {
      setDraw((d) => (d ? { ...d, rollNum: rnd() } : d));
    }, 70);
    return () => {
      if (rollTimer.current) clearInterval(rollTimer.current);
    };
  }, [draw?.phase]);

  return draw;
}
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

  const eventNames = snap.activeEvents.map((i) => EVENTS[i]?.name).filter(Boolean) as string[];

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

      {eventNames.length > 0 && (
        <div className="breathe mt-4 flex items-center gap-3 rounded-2xl border border-cyan-400/40 bg-cyan-400/10 px-4 py-2.5">
          <RadioTower className="h-5 w-5 shrink-0 text-cyan-400" />
          <span className="shrink-0 text-sm font-bold uppercase tracking-widest text-cyan-200">市場事件</span>
          <span className="truncate text-base font-semibold text-cyan-100/90">
            {eventNames.join("　|　")}
          </span>
        </div>
      )}
    </header>
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

/* ── 開獎動畫覆蓋層（投影大螢幕版・唯讀自動播放）─────────────── */
function DrawOverlay({ draw }: { draw: DrawState }) {
  const revealed = draw.phase === "revealed";
  const res = draw.result;
  const isWin = !!res.winnerName;

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
          {draw.rollNum}
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
