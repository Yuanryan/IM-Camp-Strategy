"use client";

import { motion } from "framer-motion";
import { CircleDollarSign, Clock3, Gavel, Radio, Trophy } from "lucide-react";
import { AnimatedNum, Num } from "@/components/ui";
import {
  getAuctionStagePanelKeys,
  type AuctionStage,
} from "@/lib/auction-animation";
import type { AuctionSnapshot } from "@/lib/snapshot";

const LOT_EMOJI: Record<string, string> = {
  ITEM: "🧰",
  PROPERTY: "🏙️",
  CUSTOM: "🎁",
};

export function AuctionStageOverlay({
  auction,
  stage,
}: {
  auction: AuctionSnapshot;
  stage: Exclude<AuctionStage, "hidden">;
}) {
  const live = auction.live;
  const latestSold = auction.recentlySold[0] ?? null;
  const emoji = live ? (LOT_EMOJI[live.lotType] ?? "🎁") : "🔨";
  const panelKeys = getAuctionStagePanelKeys(live?.id ?? null);

  return (
    <motion.section
      className="fixed inset-0 z-40 overflow-hidden bg-[#080604]/96 text-slate-100 backdrop-blur-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: "easeInOut" }}
      aria-label="拍賣投影介面"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(245,158,11,0.18),transparent_34%),radial-gradient(circle_at_12%_82%,rgba(120,53,15,0.2),transparent_32%),linear-gradient(135deg,#080604_0%,#130c05_48%,#050403_100%)]" />
      <div className="absolute inset-0 opacity-[0.13] [background-image:linear-gradient(rgba(251,191,36,0.17)_1px,transparent_1px),linear-gradient(90deg,rgba(251,191,36,0.17)_1px,transparent_1px)] [background-size:64px_64px]" />
      <div className="absolute left-1/2 top-1/2 h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-300/10 shadow-[0_0_120px_rgba(245,158,11,0.08)]" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1800px] flex-col px-[clamp(1.25rem,4vw,5rem)] py-[clamp(1.25rem,3vh,3rem)]">
        <header className="flex items-center justify-between gap-5 border-b border-amber-300/20 pb-[clamp(0.9rem,2vh,1.5rem)]">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid h-[clamp(3rem,5vw,4.5rem)] w-[clamp(3rem,5vw,4.5rem)] shrink-0 place-items-center rounded-2xl border border-amber-300/30 bg-amber-400/10 text-amber-200 shadow-[0_0_28px_rgba(245,158,11,0.16)]">
              <Gavel className="h-1/2 w-1/2" strokeWidth={2.4} />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[clamp(0.65rem,1vw,0.9rem)] font-black uppercase tracking-[0.34em] text-amber-300/65">
                <Radio className="h-4 w-4 animate-pulse" />
                Live Auction
              </div>
              <h1 className="truncate text-[clamp(1.55rem,3vw,3rem)] font-black tracking-tight text-amber-50">
                {auction.eventName ?? "拍賣會"}
              </h1>
            </div>
          </div>

          <div className="shrink-0 rounded-full border border-amber-300/25 bg-amber-400/10 px-4 py-2 text-[clamp(0.75rem,1.2vw,1rem)] font-black text-amber-200">
            {stage === "live" ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-400 shadow-[0_0_12px_rgba(251,113,133,0.9)]" />
                拍賣進行中
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <Clock3 className="h-4 w-4" />
                等待下一件
              </span>
            )}
          </div>
        </header>

        <div className="grid flex-1 items-center gap-[clamp(1.5rem,4vw,5rem)] py-[clamp(1.5rem,4vh,4rem)] lg:grid-cols-[minmax(260px,0.8fr)_minmax(440px,1.4fr)]">
          <motion.div
            key={panelKeys.artwork}
            className="relative mx-auto grid aspect-square w-[min(42vh,34vw)] min-w-[230px] max-w-[520px] place-items-center rounded-[2.5rem] border border-amber-300/20 bg-gradient-to-br from-amber-300/12 via-white/[0.025] to-orange-950/30 shadow-[0_30px_90px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)]"
            initial={{ scale: 0.92, rotate: -2, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 150, damping: 18 }}
          >
            <div className="absolute inset-5 rounded-[2rem] border border-dashed border-amber-300/15" />
            <div className="text-[clamp(7rem,18vw,16rem)] leading-none drop-shadow-[0_24px_30px_rgba(0,0,0,0.5)]">
              {emoji}
            </div>
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/10 bg-black/35 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.24em] text-amber-100/55">
              {live?.lotType === "ITEM"
                ? "Movable Asset"
                : live?.lotType === "PROPERTY"
                  ? "Property"
                  : live
                    ? "Special Lot"
                    : "Auction Standby"}
            </div>
          </motion.div>

          {live ? (
            <motion.div
              key={panelKeys.details}
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="min-w-0 text-center lg:text-left"
            >
              <div className="mb-3 text-[clamp(0.7rem,1vw,0.95rem)] font-black uppercase tracking-[0.38em] text-amber-300/60">
                Now on the block
              </div>
              <h2 className="text-balance text-[clamp(2.8rem,6vw,7rem)] font-black leading-[0.93] tracking-[-0.045em] text-white drop-shadow-[0_8px_30px_rgba(0,0,0,0.7)]">
                {live.title}
              </h2>
              {live.description && (
                <p className="mt-5 max-w-4xl text-balance text-[clamp(1rem,1.8vw,1.65rem)] leading-relaxed text-slate-300/80">
                  {live.description}
                </p>
              )}

              <div className="mt-[clamp(2rem,5vh,4rem)] grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <div className="rounded-3xl border border-amber-300/25 bg-amber-400/[0.07] px-[clamp(1.25rem,2.5vw,2.5rem)] py-[clamp(1.1rem,2.5vh,2rem)] shadow-[0_0_50px_rgba(245,158,11,0.1)]">
                  <div className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[0.32em] text-amber-300/65 lg:justify-start">
                    <CircleDollarSign className="h-4 w-4" />
                    目前喊價
                  </div>
                  <div className="mt-1 flex flex-wrap items-end justify-center gap-3 lg:justify-start">
                    <AnimatedNum
                      value={live.currentBid}
                      className="neon-gold text-[clamp(4.5rem,10vw,10rem)] font-black leading-[0.78]"
                    />
                    <span className="pb-1 text-[clamp(1rem,2vw,1.65rem)] font-black text-amber-100/60">
                      光幣
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-6 py-4 text-center">
                  <div className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
                    起標價
                  </div>
                  <Num className="mt-1 block text-[clamp(1.5rem,3vw,3rem)] font-black text-slate-300">
                    {live.startPrice.toLocaleString("en-US")}
                  </Num>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="text-center lg:text-left"
            >
              <div className="text-[clamp(0.7rem,1vw,0.95rem)] font-black uppercase tracking-[0.38em] text-amber-300/60">
                Intermission
              </div>
              <h2 className="mt-3 text-balance text-[clamp(3rem,7vw,7rem)] font-black leading-[0.95] tracking-[-0.045em] text-white">
                等待下一件
              </h2>
              <p className="mt-5 text-[clamp(1rem,2vw,1.6rem)] text-slate-400">
                拍賣官準備完成後，下一件拍賣品將在此登場。
              </p>

              {latestSold && (
                <div className="mt-[clamp(2rem,5vh,4rem)] rounded-3xl border border-emerald-300/20 bg-emerald-400/[0.055] p-[clamp(1.25rem,2.5vw,2.5rem)]">
                  <div className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[0.3em] text-emerald-300/70 lg:justify-start">
                    <Trophy className="h-4 w-4" />
                    上一筆成交
                  </div>
                  <div className="mt-3 text-[clamp(1.4rem,3vw,3rem)] font-black text-white">
                    {latestSold.title}
                  </div>
                  <div className="mt-2 flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1 text-[clamp(1rem,1.7vw,1.4rem)] text-slate-300 lg:justify-start">
                    <span className="font-black text-sky-200">{latestSold.winnerTeamName}</span>
                    <span>以</span>
                    <Num className="neon-gold text-[clamp(2rem,4vw,4rem)] font-black">
                      {latestSold.finalPrice.toLocaleString("en-US")}
                    </Num>
                    <span>光幣得標</span>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-amber-300/15 pt-4 text-xs font-bold uppercase tracking-[0.22em] text-amber-100/35">
          <span>IM Capital War Auction House</span>
          <span>現場喊價 · 拍賣官登記</span>
        </footer>
      </div>
    </motion.section>
  );
}
