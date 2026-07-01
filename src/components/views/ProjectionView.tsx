"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Gem, Ticket, WifiOff } from "lucide-react";

import { useSnapshot } from "@/components/client";
import { Num } from "@/components/ui";
import {
  AuctionHammerOverlay,
  HammerImagePreloader,
} from "@/components/views/projection/AuctionHammerOverlay";
import { AuctionStageOverlay } from "@/components/views/projection/AuctionStageOverlay";
import { EventNewspaperOverlay } from "@/components/views/projection/EventNewspaperOverlay";
import { ProjectionArenaDashboard } from "@/components/views/projection/ProjectionArenaDashboard";
import {
  detectAuctionCue,
  getAuctionStage,
  type AuctionAnimationSnapshot,
} from "@/lib/auction-animation";
import {
  addProjectionAnimations,
  buildAuctionAnimationItem,
  buildEventAnimationItems,
  buildLotteryAnimationItem,
  completeProjectionAnimation,
  detectAddedEvents,
  type LotteryDrawResult,
  type ProjectionAnimationItem,
  type ProjectionAnimationQueueState,
} from "@/lib/projection-animation";
import type { Snapshot } from "@/lib/snapshot";

export function ProjectionView() {
  const { snap, error } = useSnapshot(2000, "/api/public/snapshot");
  const previousPropertyCurrentValues = usePreviousPropertyCurrentValues(
    snap ?? null,
  );
  const { activeAnimation, completeActiveAnimation } =
    useProjectionAnimationQueue(snap ?? null);

  if (error) return <FullMsg text="連線錯誤，重試中…" tone="error" />;
  if (!snap) return <FullMsg text="載入中…" tone="loading" />;

  const auctionStage = getAuctionStage({
    eventOpen: snap.auction.eventId != null,
    started: snap.auction.started,
    hasLiveLot: snap.auction.live != null,
    hasQueuedLots: snap.auction.queuedLotCount > 0,
  });

  return (
    <>
      <ProjectionArenaDashboard
        snap={snap}
        lotteryAnimating={activeAnimation?.kind === "lottery"}
        previousPropertyCurrentValues={previousPropertyCurrentValues}
      />

      <HammerImagePreloader />

      <AnimatePresence>
        {auctionStage !== "hidden" && (
          <AuctionStageOverlay
            key={`auction-stage-${snap.auction.eventId}`}
            auction={snap.auction}
            stage={auctionStage}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {activeAnimation?.kind === "event" ? (
          <EventNewspaperOverlay
            key={activeAnimation.id}
            eventIndex={activeAnimation.eventIndex}
            penaltyRegion={activeAnimation.penaltyRegion}
            onComplete={completeActiveAnimation}
          />
        ) : activeAnimation?.kind === "lottery" ? (
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
    </>
  );
}

function usePreviousPropertyCurrentValues(snapshot: Snapshot | null) {
  const previous = useRef<Record<number, number> | undefined>(undefined);
  const lastSnapshotKey = useRef<string | null>(null);
  const [baseline, setBaseline] = useState<Record<number, number> | undefined>(
    undefined,
  );
  const snapshotKey = snapshot
    ? snapshot.properties
        .map((property) => `${property.id}:${property.currentValue}`)
        .join("|")
    : null;

  useLayoutEffect(() => {
    if (!snapshot || !snapshotKey || snapshotKey === lastSnapshotKey.current) {
      return;
    }

    setBaseline(previous.current);
    previous.current = buildPropertyCurrentValueMap(snapshot);
    lastSnapshotKey.current = snapshotKey;
  }, [snapshot, snapshotKey]);

  return baseline;
}

function buildPropertyCurrentValueMap(snapshot: Snapshot) {
  return Object.fromEntries(
    snapshot.properties.map((property) => [property.id, property.currentValue]),
  );
}

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
  const previousEvents = useRef<number[] | null>(null);
  const previousDrawAt = useRef<string | null>(null);
  const previousAuction = useRef<AuctionAnimationSnapshot | null>(null);

  useEffect(() => {
    if (!snapshot) return;

    const currentAuction = toAuctionAnimationSnapshot(snapshot.auction);
    if (!initialized.current) {
      initialized.current = true;
      previousEvents.current = snapshot.activeEvents;
      previousDrawAt.current = snapshot.lottery.lastDraw?.at ?? null;
      previousAuction.current = currentAuction;
      return;
    }

    const additions: ProjectionAnimationItem[] = [];
    additions.push(
      ...buildEventAnimationItems(
        detectAddedEvents(previousEvents.current, snapshot.activeEvents),
        snapshot.event4Penalty,
      ),
    );

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

    previousEvents.current = snapshot.activeEvents;
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

const ROLL_MS = 2100;
const HOLD_MS = 4000;

function randomLotteryNumber() {
  return Math.floor(Math.random() * 50) + 1;
}

function LotteryDrawOverlay({
  result,
  onComplete,
}: {
  result: LotteryDrawResult;
  onComplete: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [rollNum, setRollNum] = useState(randomLotteryNumber);
  const isWin = Boolean(result.winnerName);

  useEffect(() => {
    const rollTimer = window.setInterval(
      () => setRollNum(randomLotteryNumber()),
      70,
    );
    const revealTimer = window.setTimeout(() => {
      window.clearInterval(rollTimer);
      setRollNum(result.number);
      setRevealed(true);
    }, ROLL_MS);
    const closeTimer = window.setTimeout(onComplete, ROLL_MS + HOLD_MS);

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

      <div
        key={revealed ? "land" : "roll"}
        className={`flex h-60 w-60 items-center justify-center rounded-full ${
          revealed ? "draw-land" : "draw-roll"
        }`}
        style={{
          background: revealed
            ? "radial-gradient(circle at 35% 30%, rgba(52,211,153,0.45) 0%, rgba(16,185,129,0.12) 100%)"
            : "radial-gradient(circle at 35% 30%, rgba(34,211,238,0.4) 0%, rgba(6,182,212,0.1) 100%)",
          border: revealed
            ? "4px solid rgba(52,211,153,0.7)"
            : "4px solid rgba(34,211,238,0.55)",
          boxShadow: revealed
            ? "0 0 80px rgba(52,211,153,0.6), inset 0 2px 0 rgba(255,255,255,0.18)"
            : "0 0 48px rgba(34,211,238,0.4), inset 0 2px 0 rgba(255,255,255,0.14)",
        }}
      >
        <Num
          className={`text-[9rem] font-black leading-none ${
            revealed ? "neon-emerald" : "text-cyan-200"
          }`}
        >
          {rollNum}
        </Num>
      </div>

      {revealed && (
        <div className="draw-result-in mt-10 flex flex-col items-center gap-3 px-6 text-center">
          {isWin ? (
            <>
              <div className="text-4xl font-black text-emerald-200">
                🎉 {result.winnerName} 中獎！
              </div>
              <div className="text-lg text-slate-300">
                獲得獎金{" "}
                <Num className="neon-gold text-3xl font-black">
                  {result.pool.toLocaleString("en-US")}
                </Num>{" "}
                光幣
              </div>
            </>
          ) : (
            <>
              <div className="text-4xl font-black text-rose-200">無人中獎</div>
              <div className="text-lg text-slate-300">
                獎金池累積至{" "}
                <Num className="neon-emerald text-3xl font-black">
                  {result.pool.toLocaleString("en-US")}
                </Num>{" "}
                光幣
              </div>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}

function FullMsg({
  text,
  tone,
}: {
  text: string;
  tone: "error" | "loading";
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      {tone === "error" ? (
        <WifiOff className="h-12 w-12 text-rose-300" />
      ) : (
        <Gem className="h-12 w-12 animate-pulse text-cyan-300" />
      )}
      <div
        className={`text-2xl ${
          tone === "error" ? "text-rose-300" : "text-slate-400"
        }`}
      >
        {text}
      </div>
    </div>
  );
}
