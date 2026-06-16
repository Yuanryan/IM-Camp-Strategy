"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Variants } from "framer-motion";
import { MistSurgeOverlay } from "@/components/ui/realistic-fog-background";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Coins,
  Zap,
  Map,
  ShoppingBag,
  Star,
  Trophy,
  Shield,
  TrendingUp,
  Package,
  BookOpen,
  Ticket,
  Info,
  Building2,
  Landmark,
  Sword,
  Dices,
} from "lucide-react";

// ─── Variants ────────────────────────────────────────────────────────────────

const fogPageVariants: Variants = {
  enter: (dir: number) => ({
    x: dir * 80,
    opacity: 0,
    filter: "blur(18px) brightness(0.5)",
  }),
  center: {
    x: 0,
    opacity: 1,
    filter: "blur(0px) brightness(1)",
    transition: {
      x: { type: "spring" as const, stiffness: 180, damping: 28 },
      opacity: { duration: 0.55, ease: "easeOut" },
      filter: { duration: 0.6, ease: "easeOut" },
    },
  },
  exit: (dir: number) => ({
    x: dir * -80,
    opacity: 0,
    filter: "blur(18px) brightness(0.5)",
    transition: {
      x: { type: "spring" as const, stiffness: 180, damping: 28 },
      opacity: { duration: 0.28, ease: "easeIn" },
      filter: { duration: 0.28, ease: "easeIn" },
    },
  }),
};

const stagger: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const fogItem: Variants = {
  hidden: { y: 26, opacity: 0, filter: "blur(10px)" },
  show: {
    y: 0,
    opacity: 1,
    filter: "blur(0px)",
    transition: { type: "spring" as const, stiffness: 220, damping: 22 },
  },
};

// ─── FogText ─────────────────────────────────────────────────────────────────

function FogText({ text, className, baseDelay = 0.1 }: { text: string; className?: string; baseDelay?: number }) {
  return (
    <span className={className} aria-label={text}>
      {text.split("").map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 18, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: baseDelay + i * 0.045, duration: 0.45, ease: "easeOut" }}
          style={{ display: "inline-block" }}
        >
          {char === " " ? " " : char}
        </motion.span>
      ))}
    </span>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────

function SectionHeader({
  chapter, title, en, accent,
}: { chapter: string; title: string; en: string; accent: string }) {
  return (
    <motion.div variants={fogItem} className="mb-5">
      <p className={`text-xs font-mono tracking-[0.3em] uppercase mb-1 opacity-60 ${accent}`}>{chapter}</p>
      <h2 className="text-3xl font-black text-white leading-tight">{title}</h2>
      <p className="text-slate-500 text-sm font-mono mt-0.5">{en}</p>
    </motion.div>
  );
}

// ─── Section 0: Hero ─────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-[calc(100vh-112px)] text-center px-6 py-12 gap-8 overflow-hidden">
      {/* Floating particles */}
      {[...Array(10)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 3 + (i % 3),
            height: 3 + (i % 3),
            left: `${8 + i * 9}%`,
            top: `${15 + ((i * 17) % 65)}%`,
            background: i % 3 === 0 ? "rgba(34,211,238,0.5)" : i % 3 === 1 ? "rgba(251,191,36,0.4)" : "rgba(148,163,184,0.3)",
          }}
          animate={{ y: [0, -18, 0], opacity: [0.2, 0.7, 0.2] }}
          transition={{ duration: 3.5 + i * 0.4, delay: i * 0.25, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* Pulsing rings */}
      {[100, 160, 220].map((size, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-cyan-400/10 pointer-events-none"
          style={{ width: size, height: size, left: "50%", top: "40%", x: "-50%", y: "-50%" }}
          animate={{ scale: [1, 1.07, 1], opacity: [0.15, 0.45, 0.15] }}
          transition={{ duration: 4 + i * 1.5, delay: i * 0.6, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* Icon */}
      <motion.div
        initial={{ scale: 0.3, opacity: 0, filter: "blur(20px)" }}
        animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
        transition={{ delay: 0.2, type: "spring", stiffness: 140, damping: 15 }}
        className="relative w-20 h-20 rounded-full glass flex items-center justify-center border border-cyan-500/30"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full border border-dashed border-cyan-400/20"
        />
        <BookOpen className="w-8 h-8 text-cyan-400" />
      </motion.div>

      {/* Title */}
      <div className="space-y-1">
        <motion.p
          initial={{ opacity: 0, letterSpacing: "0.8em" }}
          animate={{ opacity: 1, letterSpacing: "0.3em" }}
          transition={{ delay: 0.55, duration: 0.8 }}
          className="text-cyan-400/60 text-xs font-mono tracking-[0.3em] uppercase"
        >
          GAME MANUAL · 遊戲說明書
        </motion.p>
        <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-none">
          <FogText text="IM 大富翁" className="text-white drop-shadow-[0_0_24px_rgba(255,255,255,0.35)]" baseDelay={0.7} />
        </h1>
        <h2 className="text-2xl sm:text-3xl font-black tracking-widest">
          <FogText text="迷霧資本戰" className="neon-cyan" baseDelay={1.1} />
        </h2>
      </div>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ delay: 1.5, duration: 0.6 }}
        className="text-slate-400 text-base max-w-sm leading-relaxed"
      >
        化身迷霧城市的新興集團，購買資產、判斷市場、蒐集情報，累積最高總資產，稱霸迷霧大陸。
      </motion.p>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 18, filter: "blur(12px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ delay: 1.9, duration: 0.6 }}
        className="grid grid-cols-4 gap-2.5"
      >
        {[
          { val: "36", label: "地圖格" },
          { val: "4", label: "區域" },
          { val: "4", label: "市場事件" },
          { val: "8", label: "功能卡種" },
        ].map(({ val, label }) => (
          <div key={label} className="glass rounded-xl px-3 py-3 text-center">
            <div className="neon-gold text-xl font-black num">{val}</div>
            <div className="text-slate-500 text-[11px] mt-0.5">{label}</div>
          </div>
        ))}
      </motion.div>

      {/* Hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5, duration: 1 }}
        className="flex items-center gap-2 text-slate-500 text-sm"
      >
        <motion.span
          animate={{ x: [0, 5, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        >
          →
        </motion.span>
        按右箭頭或滑動開始閱讀
      </motion.div>
    </div>
  );
}

// ─── Section 1: Objective ─────────────────────────────────────────────────────

function ObjectiveSection() {
  const steps = [
    { icon: Map, text: "在 36 格地圖上移動，觸發各格效果", color: "text-cyan-400", border: "border-cyan-500/25", bg: "bg-cyan-500/8" },
    { icon: Dices, text: "找流動關主挑戰小遊戲取得骰子來移動", color: "text-purple-400", border: "border-purple-500/25", bg: "bg-purple-500/8" },
    { icon: Coins, text: "用光幣購買與升級四大區域不動產", color: "text-amber-400", border: "border-amber-500/25", bg: "bg-amber-500/8" },
    { icon: TrendingUp, text: "根據市場事件判斷資產漲跌，搶佔先機", color: "text-emerald-400", border: "border-emerald-500/25", bg: "bg-emerald-500/8" },
    { icon: Package, text: "蒐集動產、情報牌與功能卡強化實力", color: "text-rose-400", border: "border-rose-500/25", bg: "bg-rose-500/8" },
    { icon: Trophy, text: "遊戲結束計算總資產，最高隊伍獲勝！", color: "text-yellow-400", border: "border-yellow-500/25", bg: "bg-yellow-500/8" },
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show"
      className="flex flex-col gap-4 px-4 py-8 max-w-2xl mx-auto w-full">
      <SectionHeader chapter="Chapter 01" title="遊戲目標" en="OBJECTIVE" accent="text-cyan-400" />

      <motion.div variants={fogItem} className="glass rounded-2xl p-4 border border-cyan-500/15">
        <p className="text-slate-300 text-sm leading-relaxed">
          《IM 大富翁：迷霧資本戰》結合大富翁、投資策略、情報判斷與小隊交易。
          遊戲結算時，{" "}
          <span className="neon-gold font-bold">現金光幣 ＋ 不動產市值 ＋ 動產市值 ＋ 特殊加成</span>{" "}
          最高的隊伍獲勝。
        </p>
      </motion.div>

      <div className="grid gap-2.5">
        {steps.map(({ icon: Icon, text, color, border, bg }, i) => (
          <motion.div key={i} variants={fogItem}
            className={`glass rounded-xl p-3.5 flex items-center gap-3.5 border ${border} ${bg}`}>
            <div className={`w-8 h-8 rounded-lg glass flex items-center justify-center shrink-0`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-slate-200 text-sm">{text}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Section 2: Resources ─────────────────────────────────────────────────────

function ResourceSection() {
  const resources = [
    { icon: Coins, name: "光幣", desc: "主要貨幣，購買、升級、過路費、大樂透", color: "text-amber-400" },
    { icon: Dices, name: "骰子", desc: "移動工具，完成小遊戲取得，可累積使用", color: "text-purple-400" },
    { icon: Zap, name: "特殊骰", desc: "事件三後可得，奇數／偶數／自選／超大", color: "text-cyan-400" },
    { icon: Building2, name: "不動產", desc: "四大區域資產，可購買並升至三級", color: "text-emerald-400" },
    { icon: Package, name: "動產", desc: "S/A/B 等級道具，自帶被動效果，隱藏市值結算時揭露", color: "text-rose-400" },
    { icon: Info, name: "情報牌", desc: "市場事件線索，真假參半，需自行判斷", color: "text-sky-400" },
    { icon: ShoppingBag, name: "卡牌點數", desc: "過燈塔取得，在神秘商店購買功能卡", color: "text-violet-400" },
    { icon: Sword, name: "功能卡", desc: "攻守策略：購地、護盾、情蒐等 8 種", color: "text-orange-400" },
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show"
      className="flex flex-col gap-4 px-4 py-8 max-w-2xl mx-auto w-full">
      <SectionHeader chapter="Chapter 02" title="基本資源" en="RESOURCES" accent="text-purple-400" />

      <div className="grid grid-cols-2 gap-3">
        {resources.map(({ icon: Icon, name, desc, color }, i) => (
          <motion.div key={i} variants={fogItem}
            className="glass rounded-xl p-4 border border-white/5 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className={`font-bold text-sm ${color}`}>{name}</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Section 3: Map ───────────────────────────────────────────────────────────

function MapSection() {
  const tiles = [
    { icon: Star, name: "光源點", desc: "抽好運卡，完成任務可得骰子、光幣、動產或情報", color: "text-amber-400", border: "border-amber-500/25", from: "from-amber-500/10" },
    { icon: Map, name: "迷霧區", desc: "抽厄運卡，可能被扣光幣或執行懲罰任務", color: "text-slate-400", border: "border-slate-600/30", from: "from-slate-700/20" },
    { icon: Landmark, name: "資本據點", desc: "可購買或升級不動產；若有獨佔隊伍需繳過路費", color: "text-cyan-400", border: "border-cyan-500/25", from: "from-cyan-500/10" },
    { icon: Ticket, name: "大樂透登記", desc: "免費登記一個號碼，額外加購依 50×2ⁿ 計算", color: "text-rose-400", border: "border-rose-500/25", from: "from-rose-500/10" },
    { icon: Zap, name: "巧遇點燈人", desc: "燈塔（+光幣+點數）、契約、命運輪盤、大樂透開獎", color: "text-yellow-400", border: "border-yellow-500/25", from: "from-yellow-500/10" },
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show"
      className="flex flex-col gap-4 px-4 py-8 max-w-2xl mx-auto w-full">
      <SectionHeader chapter="Chapter 03" title="地圖規則" en="MAP & MOVEMENT" accent="text-amber-400" />

      <motion.div variants={fogItem} className="glass rounded-2xl p-4 border border-amber-500/15">
        <p className="text-slate-300 text-sm leading-relaxed">
          地圖共 <span className="neon-gold font-bold">36 格</span>。這不是輪流制——採{" "}
          <span className="text-cyan-300 font-bold">任務骰子制</span>，
          骰子從流動關主的小遊戲取得，可以累積，想走時才到地圖關主處使用。
        </p>
      </motion.div>

      <div className="grid gap-2.5">
        {tiles.map(({ icon: Icon, name, desc, color, border, from }, i) => (
          <motion.div key={i} variants={fogItem}
            className={`glass rounded-xl p-3.5 flex items-start gap-3.5 bg-gradient-to-r ${from} to-transparent border ${border}`}>
            <div className="w-8 h-8 rounded-lg bg-black/30 flex items-center justify-center shrink-0 mt-0.5">
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div>
              <p className={`font-bold text-sm ${color}`}>{name}</p>
              <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div variants={fogItem} className="glass rounded-xl p-3.5 border border-slate-700/40">
        <p className="text-slate-400 text-xs leading-relaxed">
          <span className="text-slate-300 font-bold">特殊骰</span>（奇數／偶數／自選／超大）不可與普通骰混用，使用後立即交回關主，也可作為交易籌碼。
        </p>
      </motion.div>
    </motion.div>
  );
}

// ─── Section 4: Properties ────────────────────────────────────────────────────

function PropertySection() {
  const regions = [
    { name: "極光金域", theme: "金融・商業・交易", text: "text-amber-400", border: "border-amber-500/30", from: "from-amber-500/10", dot: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" },
    { name: "靈序研究", theme: "科技・資料・通訊", text: "text-cyan-400", border: "border-cyan-500/30", from: "from-cyan-500/10", dot: "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" },
    { name: "影焰工域", theme: "能源・製造・物流", text: "text-rose-400", border: "border-rose-500/30", from: "from-rose-500/10", dot: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" },
    { name: "晨霧棲城", theme: "住宅・醫療・教育", text: "text-emerald-400", border: "border-emerald-500/30", from: "from-emerald-500/10", dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" },
  ];

  const levels = [
    { label: "0 級 · 購買", cost: "初始定價", pct: 20, color: "from-slate-500 to-slate-400" },
    { label: "1 級 · 一建", cost: "初始 × 20%", pct: 40, color: "from-cyan-600 to-cyan-400" },
    { label: "2 級 · 二建", cost: "初始 × 40%", pct: 60, color: "from-emerald-600 to-emerald-400" },
    { label: "3 級 · 三建", cost: "初始 × 60%", pct: 80, color: "from-amber-600 to-amber-400" },
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show"
      className="flex flex-col gap-4 px-4 py-8 max-w-2xl mx-auto w-full">
      <SectionHeader chapter="Chapter 04" title="不動產系統" en="PROPERTY SYSTEM" accent="text-emerald-400" />

      {/* Regions */}
      <div className="grid grid-cols-2 gap-2.5">
        {regions.map(({ name, theme, text, border, from, dot }) => (
          <motion.div key={name} variants={fogItem}
            className={`glass rounded-xl p-3.5 bg-gradient-to-br ${from} to-transparent border ${border}`}>
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
              <span className={`font-bold text-sm ${text}`}>{name}</span>
            </div>
            <p className="text-slate-400 text-xs">{theme}</p>
          </motion.div>
        ))}
      </div>

      {/* Upgrade costs */}
      <motion.div variants={fogItem} className="glass rounded-2xl p-4 border border-emerald-500/15">
        <p className="text-slate-400 text-xs font-mono uppercase tracking-widest mb-3">升級費用（四捨五入至 10 光幣）</p>
        <div className="space-y-3">
          {levels.map(({ label, cost, pct, color }, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-slate-400 text-xs w-20 shrink-0">{label}</span>
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ delay: 0.4 + i * 0.12, duration: 0.7, ease: "easeOut" }}
                  className={`h-full bg-gradient-to-r ${color} rounded-full`}
                />
              </div>
              <span className="text-slate-300 text-xs w-20 text-right font-mono">{cost}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Toll */}
      <motion.div variants={fogItem}
        className="glass rounded-xl p-4 border border-amber-500/25 bg-gradient-to-r from-amber-500/10 to-transparent">
        <p className="text-amber-300 font-bold text-sm mb-1.5">獨佔隊伍 · 過路費</p>
        <p className="text-slate-400 text-xs leading-relaxed">
          需先在該區擁有至少一棟三級不動產，才可能取得獨佔（「三級不動產最多」者勝出）。其他隊踩到該區資本據點需支付：
        </p>
        <p className="text-amber-300 font-bold text-sm mt-1.5">該區所有不動產（升級後價值）總和 × 8%（四捨五入至 10）</p>
        <p className="text-slate-400 text-xs leading-relaxed mt-1.5">
          不動產等級越高，計入過路費的價值也越高——蓋得越高，收得越多。
        </p>
      </motion.div>
    </motion.div>
  );
}

// ─── Section 5: Special Systems ───────────────────────────────────────────────

function SpecialSection() {
  const events = [
    { n: "01", name: "晨霧退散", up: "極光金域 ↑", down: "晨霧棲城 ↓", color: "text-amber-400", border: "border-amber-500/25", from: "from-amber-500/8" },
    { n: "02", name: "影焰爆產", up: "影焰工域 ↑", down: "住宅教育 ↓", color: "text-rose-400", border: "border-rose-500/25", from: "from-rose-500/8", badge: "光靈啟動" },
    { n: "03", name: "靈序突破", up: "靈序研究 ↑", down: "傳統商業 ↓", color: "text-cyan-400", border: "border-cyan-500/25", from: "from-cyan-500/8", badge: "特殊骰啟動" },
    { n: "04", name: "棲城翻身", up: "晨霧棲城 ↑", down: "前期最強區 ↓", color: "text-emerald-400", border: "border-emerald-500/25", from: "from-emerald-500/8", badge: "政府拍賣" },
  ];

  const cards = [
    { name: "購地卡", effect: "強制收購對手一塊土地", cost: 50 },
    { name: "換地卡", effect: "與對手互換土地", cost: 20 },
    { name: "拆屋卡", effect: "拆除對手一層建設", cost: 30 },
    { name: "怪獸卡", effect: "摧毀對手一棟建設", cost: 70 },
    { name: "護盾卡", effect: "抵擋一次攻擊或過路費", cost: 25 },
    { name: "情蒐卡", effect: "得知指定對手資訊", cost: 15 },
    { name: "市場預警", effect: "知道下次事件漲跌方向", cost: 50 },
    { name: "換屋卡", effect: "與對手交換升級等級", cost: 20 },
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show"
      className="flex flex-col gap-4 px-4 py-8 max-w-2xl mx-auto w-full">
      <SectionHeader chapter="Chapter 05" title="特殊系統" en="SPECIAL SYSTEMS" accent="text-rose-400" />

      {/* Events */}
      <motion.div variants={fogItem}>
        <p className="text-slate-400 text-xs font-mono tracking-widest uppercase mb-2">市場事件 × 4（由主持人依時間宣告）</p>
        <div className="grid grid-cols-2 gap-2">
          {events.map(({ n, name, up, down, color, border, from, badge }) => (
            <div key={n} className={`glass rounded-xl p-3 bg-gradient-to-br ${from} to-transparent border ${border}`}>
              <div className="flex items-baseline gap-1.5 mb-1.5">
                <span className={`text-lg font-black num ${color}`}>{n}</span>
                <span className={`font-bold text-xs ${color}`}>{name}</span>
              </div>
              <p className="text-emerald-300 text-[11px]">{up}</p>
              <p className="text-rose-300 text-[11px]">{down}</p>
              {badge && (
                <span className="inline-block mt-1.5 text-[10px] font-bold text-slate-300 glass px-2 py-0.5 rounded-full">
                  {badge}
                </span>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Function Cards */}
      <motion.div variants={fogItem}>
        <p className="text-slate-400 text-xs font-mono tracking-widest uppercase mb-2">功能卡（用卡牌點數在商店購買）</p>
        <div className="grid grid-cols-2 gap-2">
          {cards.map(({ name, effect, cost }) => (
            <div key={name} className="glass rounded-xl p-2.5 border border-violet-500/15 flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-xs text-violet-300">{name}</p>
                <p className="text-slate-500 text-[10px] leading-snug mt-0.5">{effect}</p>
              </div>
              <span className="text-violet-400 text-[10px] font-mono shrink-0">{cost}pt</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Lottery */}
      <motion.div variants={fogItem}
        className="glass rounded-xl p-3.5 border border-rose-500/20 bg-gradient-to-r from-rose-500/8 to-transparent">
        <div className="flex items-center gap-2 mb-1.5">
          <Ticket className="w-4 h-4 text-rose-400" />
          <p className="font-bold text-sm text-rose-300">大樂透系統</p>
        </div>
        <p className="text-slate-400 text-xs leading-relaxed">
          踩到登記格可免費登記一個號碼（1～50）。第二個起加購費：
          <span className="text-rose-300 font-mono"> 50 × 2^(n-1)</span>
          。開獎格觸發時，中獎隊伍獨得整個獎金池。
        </p>
      </motion.div>

      {/* Movable assets — passive effects */}
      <motion.div variants={fogItem}
        className="glass rounded-xl p-3.5 border border-amber-500/20 bg-gradient-to-r from-amber-500/8 to-transparent">
        <div className="flex items-center gap-2 mb-1.5">
          <Package className="w-4 h-4 text-amber-400" />
          <p className="font-bold text-sm text-amber-300">動產 · 被動效果</p>
        </div>
        <p className="text-slate-400 text-xs leading-relaxed">
          動產不只是收藏品——每張都自帶<span className="text-amber-300 font-bold">被動效果</span>。例如：
          收路費加成、付路費減免、購買折扣、每輪複利或分紅、樂透加成抽成、輪盤保底等。
          同類效果直接相加；隱藏市值仍於結算時才由交易所揭露。
        </p>
      </motion.div>

      {/* Trade & auction */}
      <motion.div variants={fogItem}
        className="glass rounded-xl p-3.5 border border-violet-500/20 bg-gradient-to-r from-violet-500/8 to-transparent">
        <div className="flex items-center gap-2 mb-1.5">
          <Sword className="w-4 h-4 text-violet-400" />
          <p className="font-bold text-sm text-violet-300">隊間交易 · 政府拍賣</p>
        </div>
        <p className="text-slate-400 text-xs leading-relaxed">
          <span className="text-violet-300 font-bold">交易</span>：隨時可與他隊交換光幣、卡牌點數、不動產、動產，須到交易所登記、雙方確認才生效。
          {" "}
          <span className="text-violet-300 font-bold">拍賣</span>：事件四後啟動政府拍賣，由拍賣官主持英式喊價——各隊現場喊價，得標立即扣款並過戶。
        </p>
      </motion.div>
    </motion.div>
  );
}

// ─── Section 6: Settlement ────────────────────────────────────────────────────

function SettlementSection() {
  const formula = [
    { text: "現金光幣", color: "text-yellow-300", glow: "shadow-[0_0_14px_rgba(253,224,71,0.35)]", border: "border-yellow-500/30" },
    { text: "＋", color: "text-slate-500", border: "" },
    { text: "不動產市值", color: "text-cyan-300", glow: "shadow-[0_0_14px_rgba(34,211,238,0.35)]", border: "border-cyan-500/30" },
    { text: "＋", color: "text-slate-500", border: "" },
    { text: "動產市值", color: "text-emerald-300", glow: "shadow-[0_0_14px_rgba(52,211,153,0.35)]", border: "border-emerald-500/30" },
    { text: "＋", color: "text-slate-500", border: "" },
    { text: "特殊加成", color: "text-rose-300", glow: "shadow-[0_0_14px_rgba(251,113,133,0.35)]", border: "border-rose-500/30" },
  ];

  const rules = [
    "有登記才算數——資產購買、升級、轉讓、大樂透號碼，全部需到交易所登記",
    "口頭協議不承認，必須完成正式登記",
    "升級費用依初始定價計算，不受市場事件影響",
    "特殊骰使用後立即交回地圖關主",
    "主持人擁有最終裁決權",
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show"
      className="flex flex-col gap-4 px-4 py-8 max-w-2xl mx-auto w-full">
      <SectionHeader chapter="Chapter 06" title="結算方式" en="FINAL SETTLEMENT" accent="text-yellow-400" />

      {/* Formula */}
      <motion.div variants={fogItem}
        className="glass rounded-2xl p-5 border border-yellow-500/20 bg-gradient-to-br from-yellow-500/8 to-amber-500/5 text-center">
        <p className="text-slate-400 text-xs font-mono tracking-widest uppercase mb-4">總資產計算公式</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {formula.map(({ text, color, glow, border }, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, scale: 0.7, filter: "blur(8px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              transition={{ delay: 0.3 + i * 0.1, type: "spring", stiffness: 250, damping: 20 }}
              className={`font-bold text-sm ${color} ${glow || ""} ${border ? `glass border ${border} px-2.5 py-1.5 rounded-lg` : ""}`}
            >
              {text}
            </motion.span>
          ))}
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-slate-500 text-xs mt-3"
        >
          動產市值由交易所秘密帳本在遊戲結束時揭露
        </motion.p>
      </motion.div>

      {/* Key rules */}
      <motion.div variants={fogItem}>
        <p className="text-slate-400 text-xs font-mono tracking-widest uppercase mb-2">現場執行原則</p>
        <div className="space-y-2">
          {rules.map((rule, i) => (
            <motion.div key={i} variants={fogItem}
              className="flex items-start gap-3 glass rounded-xl p-3 border border-slate-700/25">
              <span className="text-slate-600 font-mono text-xs shrink-0 mt-0.5">{String(i + 1).padStart(2, "0")}</span>
              <p className="text-slate-300 text-sm leading-relaxed">{rule}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Final */}
      <motion.div variants={fogItem} className="glass rounded-2xl p-5 border border-cyan-500/20 text-center">
        <motion.p
          animate={{ opacity: [0.7, 1, 0.7], textShadow: ["0 0 8px rgba(34,211,238,0.3)", "0 0 24px rgba(34,211,238,0.8)", "0 0 8px rgba(34,211,238,0.3)"] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className="neon-cyan font-black text-xl"
        >
          祝各隊旗開得勝！
        </motion.p>
        <p className="text-slate-500 text-xs mt-1.5">記得到交易所登記，口頭不算數！</p>
      </motion.div>
    </motion.div>
  );
}

// ─── Section Config ───────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 0, label: "序章", component: HeroSection },
  { id: 1, label: "目標", component: ObjectiveSection },
  { id: 2, label: "資源", component: ResourceSection },
  { id: 3, label: "地圖", component: MapSection },
  { id: 4, label: "不動產", component: PropertySection },
  { id: 5, label: "特殊", component: SpecialSection },
  { id: 6, label: "結算", component: SettlementSection },
] as const;

// ─── Main Export ──────────────────────────────────────────────────────────────

export function InstructionsView({ onBack }: { onBack?: () => void } = {}) {
  const [section, setSection] = useState(0);
  const [direction, setDirection] = useState(0);
  const [fogVisible, setFogVisible] = useState(false);

  const goTo = useCallback((next: number) => {
    if (next < 0 || next >= SECTIONS.length || next === section) return;
    setDirection(next > section ? 1 : -1);
    setFogVisible(true);
    setTimeout(() => setFogVisible(false), 480);
    setSection(next);
  }, [section]);

  const prev = useCallback(() => goTo(section - 1), [goTo, section]);
  const next = useCallback(() => goTo(section + 1), [goTo, section]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") next();
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev]);

  const CurrentSection = SECTIONS[section].component;

  return (
    <div className={`relative flex flex-col select-none ${onBack ? "min-h-0 flex-1" : "min-h-screen"}`}>
      <MistSurgeOverlay visible={fogVisible} direction={direction} />

      {/* Header — standalone only; embedded mode uses Shell's header */}
      {!onBack && (
        <motion.header
          initial={{ y: -20, opacity: 0, filter: "blur(8px)" }}
          animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="sticky top-0 z-20 glass border-b border-white/5 px-4 py-3 flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-slate-300 text-sm font-medium">遊戲說明書</span>
          </div>
          <div className="flex items-center gap-1.5">
            {SECTIONS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => goTo(i)}
                className={`transition-all duration-300 rounded-full ${
                  i === section
                    ? "w-5 h-2 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                    : "w-2 h-2 bg-slate-700 hover:bg-slate-500"
                }`}
                aria-label={s.label}
              />
            ))}
          </div>
          <span className="text-slate-500 text-xs font-mono tabular-nums">
            {section + 1} / {SECTIONS.length}
          </span>
        </motion.header>
      )}

      {/* Content with swipe */}
      <div className={`flex-1 overflow-y-auto overflow-x-hidden ${onBack ? "pb-16" : ""}`}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={section}
            custom={direction}
            variants={fogPageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.1}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) next();
              if (info.offset.x > 60) prev();
            }}
            className="min-h-full cursor-grab active:cursor-grabbing"
          >
            <CurrentSection />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom nav */}
      <motion.nav
        initial={{ y: 20, opacity: 0, filter: "blur(8px)" }}
        animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className={`z-[25] glass border-t border-white/5 px-4 py-3 flex items-center justify-between ${
          onBack ? "fixed bottom-0 left-0 right-0" : "sticky bottom-0"
        }`}
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0))" }}
      >
        {onBack ? (
          // Embedded: back button | dots | prev+next arrows
          <>
            <button onClick={onBack} className="chip flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all">
              <X className="w-3.5 h-3.5" />
              返回
            </button>

            <div className="flex items-center gap-1.5">
              {SECTIONS.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => goTo(i)}
                  className={`transition-all duration-300 rounded-full ${
                    i === section
                      ? "w-5 h-2 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                      : "w-2 h-2 bg-slate-700 hover:bg-slate-500"
                  }`}
                  aria-label={s.label}
                />
              ))}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={prev}
                disabled={section === 0}
                className="chip w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={next}
                disabled={section === SECTIONS.length - 1}
                className="btn-cyan w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          // Standalone: full prev / label / next
          <>
            <button
              onClick={prev}
              disabled={section === 0}
              className="chip flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              上一節
            </button>
            <span className="text-slate-400 text-sm font-medium">{SECTIONS[section].label}</span>
            <button
              onClick={next}
              disabled={section === SECTIONS.length - 1}
              className="btn-cyan flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              下一節
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </motion.nav>
    </div>
  );
}
