"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, RadioTower } from "lucide-react";

import { EVENTS } from "@/lib/game";
import {
  EVENT_ENTRANCE_MS,
  EVENT_EXIT_SECONDS,
  EVENT_HOLD_MS,
  formatEventImpacts,
} from "@/lib/projection-animation";

export function EventNewspaperOverlay({
  eventIndex,
  penaltyRegion,
  onComplete,
}: {
  eventIndex: number;
  penaltyRegion: string | null;
  onComplete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const event = EVENTS[eventIndex];
  const impacts = formatEventImpacts(eventIndex, penaltyRegion);

  useEffect(() => {
    const expandTimer = window.setTimeout(
      () => setExpanded(true),
      EVENT_ENTRANCE_MS,
    );
    const closeTimer = window.setTimeout(
      onComplete,
      EVENT_ENTRANCE_MS + EVENT_HOLD_MS,
    );
    return () => {
      window.clearTimeout(expandTimer);
      window.clearTimeout(closeTimer);
    };
  }, [onComplete]);

  if (!event) return null;

  const title = event.name.replace(/^事件[一二三四]：/, "");

  return (
    <motion.div
      className="fixed inset-0 z-[70] grid place-items-center overflow-hidden bg-slate-950/82 px-[clamp(1rem,4vw,5rem)] py-[clamp(1rem,4vh,3rem)] backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: expanded ? EVENT_EXIT_SECONDS : 0.25,
        ease: "easeInOut",
      }}
      aria-label={`市場事件：${title}`}
      role="dialog"
      aria-modal="true"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(251,191,36,0.14),transparent_34%),radial-gradient(circle_at_18%_80%,rgba(127,29,29,0.16),transparent_30%)]" />

      {!expanded && (
        <>
          <motion.div
            className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-amber-100/70"
            initial={{ scale: 0.1, opacity: 0 }}
            animate={{ scale: [0.1, 0.1, 7], opacity: [0, 0.9, 0] }}
            transition={{
              duration: EVENT_ENTRANCE_MS / 1000,
              times: [0, 0.78, 1],
              ease: "easeOut",
            }}
          />
          <motion.div
            className="pointer-events-none absolute left-1/2 top-1/2 h-px w-[72vw] -translate-x-1/2 bg-gradient-to-r from-transparent via-amber-200/70 to-transparent"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: [0, 0, 1], opacity: [0, 0.8, 0] }}
            transition={{
              duration: EVENT_ENTRANCE_MS / 1000,
              times: [0, 0.76, 1],
            }}
          />
        </>
      )}

      <motion.article
        className="relative w-full max-w-[1180px] overflow-hidden border border-[#9b7b53]/65 bg-[#eee2c9] text-[#21170d] shadow-[18px_24px_0_rgba(73,36,14,0.2),0_34px_100px_rgba(0,0,0,0.62)]"
        initial={{
          opacity: 0,
          scale: 0.08,
          rotate: -28,
          y: "-42vh",
          x: "28vw",
        }}
        animate={
          expanded
            ? { opacity: 1, scale: 1, rotate: -0.7, y: 0, x: 0 }
            : {
                opacity: 1,
                scale: [0.08, 0.2, 0.42],
                rotate: [-28, 18, 3],
                y: ["-42vh", "8vh", 0],
                x: ["28vw", "-6vw", 0],
              }
        }
        exit={{ opacity: 0, scale: 0.96, y: 24 }}
        transition={
          expanded
            ? {
                type: "spring",
                stiffness: 175,
                damping: 18,
                mass: 0.85,
              }
            : {
                duration: EVENT_ENTRANCE_MS / 1000,
                times: [0, 0.58, 1],
                ease: [0.18, 0.78, 0.2, 1],
              }
        }
      >
        <div className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:repeating-linear-gradient(0deg,rgba(77,50,27,0.18)_0,rgba(77,50,27,0.18)_1px,transparent_1px,transparent_4px)]" />
        <div className="pointer-events-none absolute inset-3 border border-[#7a5b38]/35" />

        <header className="relative border-b-4 border-double border-[#5f3c21] bg-[#96351f] px-[clamp(1.25rem,3vw,3rem)] py-[clamp(0.8rem,1.7vh,1.25rem)] text-[#fff8e7]">
          <div className="flex items-center justify-between gap-5">
            <span className="inline-flex items-center gap-2 text-[clamp(0.65rem,1vw,0.9rem)] font-black uppercase tracking-[0.28em]">
              <RadioTower className="h-4 w-4 animate-pulse" />
              Breaking Market News
            </span>
            <span className="font-serif text-[clamp(0.65rem,1vw,0.85rem)] font-bold tracking-[0.18em] opacity-80">
              EVENT · {String(eventIndex).padStart(2, "0")}
            </span>
          </div>
          <div className="mt-2 text-center font-serif text-[clamp(1.4rem,3vw,2.75rem)] font-black tracking-[0.2em]">
            CAPITAL WAR DAILY
          </div>
        </header>

        <div className="relative grid gap-[clamp(1.25rem,3vw,3rem)] px-[clamp(1.5rem,4vw,4.5rem)] py-[clamp(1.35rem,3vh,3rem)] lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <section className="min-w-0">
            <div className="inline-flex items-center gap-2 border-y border-[#7b5531] py-1 font-serif text-[clamp(0.7rem,1.1vw,0.95rem)] font-black tracking-[0.24em] text-[#96351f]">
              市場號外 · 第 {eventIndex} 事件
            </div>
            <h2 className="mt-4 text-balance font-serif text-[clamp(2.2rem,5vw,5.2rem)] font-black leading-[0.96] tracking-[-0.045em]">
              {title}
            </h2>
            <div className="my-5 h-1 w-28 bg-[#96351f]" />
            <p className="max-w-3xl font-serif text-[clamp(1rem,1.65vw,1.5rem)] font-semibold leading-relaxed text-[#5f4933]">
              {event.news}
            </p>
            <p className="mt-5 border-l-4 border-[#9b7b53] pl-4 font-serif text-[clamp(0.8rem,1.1vw,1rem)] leading-relaxed text-[#75604a]">
              市場價格已依最新事件重新計算。各隊資產價值與策略配置將立即受到影響。
            </p>
          </section>

          <aside className="border-y-4 border-double border-[#6f4b2c] py-3">
            <div className="mb-2 flex items-baseline justify-between gap-3 border-b border-[#9b7b53]/45 pb-2">
              <h3 className="font-serif text-[clamp(1.1rem,1.8vw,1.6rem)] font-black tracking-[0.14em]">
                市場變化
              </h3>
              <span className="font-serif text-xs font-bold text-[#80674e]">
                EFFECTS
              </span>
            </div>
            <div className="divide-y divide-[#9b7b53]/35">
              {impacts.map((impact) => {
                const up = impact.direction === "up";
                return (
                  <div
                    key={impact.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-[clamp(0.65rem,1.4vh,1rem)]"
                  >
                    <div className="min-w-0">
                      <div className="font-serif text-[clamp(0.9rem,1.25vw,1.15rem)] font-black leading-tight">
                        {impact.label}
                      </div>
                      <div className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#8b7258]">
                        {impact.detail}
                      </div>
                    </div>
                    <div
                      className={`inline-flex items-center gap-1 font-serif text-[clamp(1.4rem,2.5vw,2.5rem)] font-black ${
                        up ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {up ? (
                        <ArrowUpRight
                          className="h-[0.85em] w-[0.85em]"
                          strokeWidth={3}
                        />
                      ) : (
                        <ArrowDownRight
                          className="h-[0.85em] w-[0.85em]"
                          strokeWidth={3}
                        />
                      )}
                      {impact.percent}%
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>

        <footer className="relative flex items-center justify-between gap-4 border-t border-[#82613f]/50 px-[clamp(1.5rem,4vw,4.5rem)] py-2 font-serif text-[10px] font-bold uppercase tracking-[0.2em] text-[#765a3f]">
          <span>IM Capital War · Special Edition</span>
          <span>市場事件已生效</span>
        </footer>
      </motion.article>
    </motion.div>
  );
}
