"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Gavel } from "lucide-react";
import { Num } from "@/components/ui";
import {
  detectAuctionCue,
  getHammerFrames,
  type AuctionAnimationSnapshot,
  type AuctionCue,
} from "@/lib/auction-animation";
import type { Snapshot } from "@/lib/snapshot";

export type AuctionAnimationState = {
  cue: AuctionCue;
  frameIndex: number;
};

const BID_AFTER_STRIKE_MS = 350;
const SOLD_AFTER_STRIKE_MS = 7_000;

export function useAuctionAnimation(
  auction: Snapshot["auction"] | null,
): AuctionAnimationState | null {
  const [animation, setAnimation] = useState<AuctionAnimationState | null>(null);
  const previous = useRef<AuctionAnimationSnapshot | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const hasAuction = auction !== null;
  const liveId = auction?.live?.id ?? null;
  const liveTitle = auction?.live?.title ?? null;
  const currentBid = auction?.live?.currentBid ?? null;
  const sold = auction?.recentlySold[0] ?? null;
  const soldId = sold?.id ?? null;
  const soldTitle = sold?.title ?? null;
  const soldWinner = sold?.winnerTeamName ?? null;
  const soldPrice = sold?.finalPrice ?? null;
  const soldAt = sold?.soldAt ?? null;

  useEffect(() => {
    if (!hasAuction) return;

    const current: AuctionAnimationSnapshot = {
      live:
        liveId != null && liveTitle != null && currentBid != null
          ? { id: liveId, title: liveTitle, currentBid }
          : null,
      recentlySold:
        soldId != null &&
        soldTitle != null &&
        soldWinner != null &&
        soldPrice != null &&
        soldAt != null
          ? [
              {
                id: soldId,
                title: soldTitle,
                winnerTeamName: soldWinner,
                finalPrice: soldPrice,
                soldAt,
              },
            ]
          : [],
    };
    const cue = detectAuctionCue(previous.current, current);
    previous.current = current;
    if (!cue) return;

    for (const timer of timers.current) clearTimeout(timer);
    timers.current = [];

    const frames = getHammerFrames(cue.kind);
    setAnimation({ cue, frameIndex: 0 });

    let elapsed = frames[0].durationMs;
    for (let index = 1; index < frames.length; index += 1) {
      timers.current.push(
        setTimeout(() => {
          setAnimation({ cue, frameIndex: index });
        }, elapsed),
      );
      elapsed += frames[index].durationMs;
    }

    const holdMs = cue.kind === "sold" ? SOLD_AFTER_STRIKE_MS : BID_AFTER_STRIKE_MS;
    timers.current.push(setTimeout(() => setAnimation(null), elapsed + holdMs));
  }, [
    currentBid,
    hasAuction,
    liveId,
    liveTitle,
    soldAt,
    soldId,
    soldPrice,
    soldTitle,
    soldWinner,
  ]);

  useEffect(
    () => () => {
      for (const timer of timers.current) clearTimeout(timer);
    },
    [],
  );

  return animation;
}

const HAMMER_IMAGES = {
  raised: {
    src: "/hammer/hammer1.png",
    width: 2018,
    height: 1464,
  },
  struck: {
    src: "/hammer/hammer2.png",
    width: 1842,
    height: 1358,
  },
} as const;

export function HammerImagePreloader() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 h-px w-px overflow-hidden opacity-0"
    >
      {Object.values(HAMMER_IMAGES).map((image) => (
        <Image
          key={image.src}
          src={image.src}
          alt=""
          width={image.width}
          height={image.height}
          sizes="80vw"
          loading="eager"
        />
      ))}
    </div>
  );
}

export function AuctionHammerOverlay({
  animation,
}: {
  animation: AuctionAnimationState;
}) {
  const { cue, frameIndex } = animation;
  const frames = getHammerFrames(cue.kind);
  const frame = frames[Math.min(frameIndex, frames.length - 1)];
  const image = HAMMER_IMAGES[frame.pose];
  const struck = frame.pose === "struck";
  const sold = cue.kind === "sold";
  const finalStrike = sold && frameIndex === frames.length - 1;

  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-hidden bg-[#090704]/95 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_36%,rgba(251,191,36,0.22),transparent_38%),linear-gradient(115deg,rgba(120,53,15,0.2),transparent_38%,rgba(217,119,6,0.08))]" />
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(251,191,36,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(251,191,36,0.12)_1px,transparent_1px)] [background-size:54px_54px]" />

      {struck && (
        <motion.div
          key={`impact-${frameIndex}`}
          className="absolute bottom-[7vh] left-1/2 h-28 w-28 -translate-x-1/2 rounded-full border-4 border-amber-200/80"
          initial={{ scale: 0.15, opacity: 1 }}
          animate={{ scale: finalStrike ? 9 : 5.5, opacity: 0 }}
          transition={{ duration: finalStrike ? 0.65 : 0.42, ease: "easeOut" }}
        />
      )}

      <div className="relative z-10 mx-auto flex h-full max-w-[1500px] flex-col items-center px-[5vw] pt-[6vh] text-center">
        <motion.div
          key={`${cue.kind}-${frameIndex}`}
          initial={{ y: -14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="relative z-20"
        >
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-400/10 px-5 py-2 text-sm font-black uppercase tracking-[0.32em] text-amber-200">
            <Gavel className="h-5 w-5" />
            {sold
              ? finalStrike
                ? "Sold"
                : `Final Call ${frameIndex < 2 ? "I" : "II"}`
              : "New Bid"}
          </div>
          <h2 className="max-w-5xl text-balance text-[clamp(2rem,5vw,5rem)] font-black leading-[0.98] text-white drop-shadow-[0_6px_24px_rgba(0,0,0,0.8)]">
            {cue.title}
          </h2>
          <div className="mt-4 flex flex-wrap items-end justify-center gap-x-5 gap-y-2">
            {sold && finalStrike && (
              <span className="text-[clamp(1.5rem,3vw,3rem)] font-black text-sky-200">
                {cue.winnerTeamName}
              </span>
            )}
            <Num
              className={`font-black leading-none ${
                finalStrike
                  ? "neon-gold text-[clamp(4rem,10vw,9rem)]"
                  : "text-[clamp(3rem,7vw,7rem)] text-amber-200"
              }`}
            >
              {cue.amount.toLocaleString("en-US")}
            </Num>
            <span className="pb-2 text-[clamp(1rem,2vw,1.75rem)] font-bold text-amber-100/70">
              光幣
            </span>
          </div>
          {sold && finalStrike && (
            <motion.div
              initial={{ scale: 0.65, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 240, damping: 16 }}
              className="mt-3 text-[clamp(2rem,5vw,5rem)] font-black tracking-[0.18em] text-amber-300 drop-shadow-[0_0_28px_rgba(251,191,36,0.7)]"
            >
              成交
            </motion.div>
          )}
        </motion.div>

        <motion.div
          key={`hammer-${frameIndex}`}
          className="absolute inset-x-[4vw] bottom-0 h-[72vh]"
          initial={{
            y: frame.pose === "raised" ? 34 : -18,
            scale: frame.pose === "raised" ? 0.98 : 1.035,
          }}
          animate={{ y: 0, scale: 1 }}
          transition={{
            duration: frame.pose === "raised" ? 0.16 : 0.08,
            ease: frame.pose === "raised" ? "easeOut" : "easeIn",
          }}
        >
          <Image
            src={image.src}
            alt=""
            fill
            sizes="92vw"
            loading="eager"
            className="object-contain object-bottom drop-shadow-[0_22px_34px_rgba(0,0,0,0.7)]"
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
