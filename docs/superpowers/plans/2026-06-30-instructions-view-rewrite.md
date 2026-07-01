# InstructionsView Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the game manual (`InstructionsView`) into an 8-page guided flow (intro → two halves → board → property → assets/cards → special → win), sourcing game data live from `game.ts`.

**Architecture:** Single-file rewrite of `web/src/components/views/InstructionsView.tsx`. The existing nav machinery (swipe / arrow keys / nav dots / prev-next, embedded + standalone) is reused unchanged — it already renders an arbitrary-length `SECTIONS` array. Each page is a small section component. Hardcoded card/region/minigame data is replaced with imports from `web/src/lib/game.ts`. A new tap-to-zoom lightbox shows `public/map.png`.

**Tech Stack:** Next.js 16 (custom build — see `web/AGENTS.md`), React 19, framer-motion 12, lucide-react, Tailwind (utility classes in `globals.css`: `glass`, `neon-gold`, `neon-cyan`, `btn-cyan`, `chip`, `num`).

## Global Constraints

- This is NOT stock Next.js — `web/AGENTS.md` says read `node_modules/next/dist/docs/` before writing Next-specific code. Heed deprecation notices.
- Component is `"use client"` (uses hooks + framer-motion). Keep the directive.
- `web/src/lib/game.ts` is a pure data module (no server-only deps) — safe to import into a client component. Verified exports to import: `MOBILE_GAMES`, `REGIONS`, `FUNCTION_CARDS`.
- Render `map.png` via `next/image` `Image` following the existing pattern in `web/src/components/views/RealMapView.tsx:853` (`fill`, `object-contain`, `draggable={false}`).
- No new dependencies. No new routes/API/persistence. Presentational only.
- Not a git repository — there are no commits. Each task's final step is verification (`npx tsc --noEmit` + `npm run lint` clean, plus a visual check) instead of a commit.
- No component test harness exists for views (vitest tests cover `game.ts` logic only). Verification for view tasks is typecheck + lint + manual visual check in `npm run dev`, NOT fabricated component unit tests.
- All run commands execute from the `web/` directory.
- Preserve the existing visual language: `SectionHeader` (chapter / title / en / accent), `fogItem`/`stagger` variants, glass cards, neon accents.

## File Structure

- **Modify (full rewrite of content sections):** `web/src/components/views/InstructionsView.tsx`
  - Keep: imports block (extend it), `fogPageVariants`, `stagger`, `fogItem`, `FogText`, `SectionHeader`, `HeroSection` (minor), `SECTIONS` array shape, `InstructionsView` main export (nav machinery).
  - Replace: `ObjectiveSection`, `ResourceSection`, `MapSection`, `PropertySection`, `SpecialSection`, `SettlementSection` with the new 7 content sections + a `MapLightbox` helper.
- No other files change. `map.png` already exists at `web/public/map.png`.

---

### Task 1: Wire data imports + reorder SECTIONS to the new 8-page skeleton

Establish the new section list and live-data imports first, with placeholder bodies, so the nav machinery + page count are correct before filling content. This de-risks every later task (each later task just fills one section body).

**Files:**
- Modify: `web/src/components/views/InstructionsView.tsx`

**Interfaces:**
- Consumes: `MOBILE_GAMES`, `REGIONS`, `FUNCTION_CARDS` from `@/lib/game` (or correct relative path — match how other files in `src/components/views` import `lib`; check an existing import).
- Produces: 8-entry `SECTIONS` array `[{ id, label, component }]` with components: `HeroSection`, `IntroSection`, `TwoPartsSection`, `MapSection`, `PropertySection`, `AssetsSection`, `SpecialSection`, `WinSection`.

- [ ] **Step 1: Confirm the lib import path**

Open `web/src/components/views/RealMapView.tsx` and note how it imports from `lib` (e.g. `import { ... } from "@/lib/game"` vs a relative path). Use the same style.

- [ ] **Step 2: Add the data imports**

At the top of `InstructionsView.tsx`, after the lucide-react import block, add:

```tsx
import { MOBILE_GAMES, REGIONS, FUNCTION_CARDS } from "@/lib/game";
```

(Use the path style confirmed in Step 1.)

- [ ] **Step 3: Replace the SECTIONS array**

Replace the existing `SECTIONS` const with the new 8-page list. Section components that don't exist yet get temporary stub bodies (filled by later tasks). For now, point new names at temporary placeholder components defined just above `SECTIONS`:

```tsx
const IntroSection = () => <SectionPlaceholder label="簡介" />;
const TwoPartsSection = () => <SectionPlaceholder label="兩大環節" />;
const AssetsSection = () => <SectionPlaceholder label="資產卡牌" />;
const WinSection = () => <SectionPlaceholder label="如何獲勝" />;
// MapSection, PropertySection, SpecialSection: keep existing implementations for now (rewritten in later tasks)

const SECTIONS = [
  { id: 0, label: "序章", component: HeroSection },
  { id: 1, label: "簡介", component: IntroSection },
  { id: 2, label: "兩大環節", component: TwoPartsSection },
  { id: 3, label: "地圖", component: MapSection },
  { id: 4, label: "不動產", component: PropertySection },
  { id: 5, label: "資產卡牌", component: AssetsSection },
  { id: 6, label: "特殊", component: SpecialSection },
  { id: 7, label: "如何獲勝", component: WinSection },
] as const;
```

Add a tiny placeholder helper above it:

```tsx
function SectionPlaceholder({ label }: { label: string }) {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show"
      className="flex flex-col gap-4 px-4 py-8 max-w-2xl mx-auto w-full">
      <SectionHeader chapter="Chapter --" title={label} en="WIP" accent="text-slate-400" />
    </motion.div>
  );
}
```

Delete the now-unused `ObjectiveSection` and `ResourceSection` function definitions (their content is redistributed into Intro/TwoParts/Assets in later tasks).

- [ ] **Step 4: Remove now-unused imports**

After deleting `ObjectiveSection`/`ResourceSection`, run typecheck/lint (next step) and remove any lucide icons that are no longer referenced (e.g. icons only used by deleted sections). Do not remove icons still used by `HeroSection`, `MapSection`, `PropertySection`, `SpecialSection`, or the main nav.

- [ ] **Step 5: Verify typecheck + lint pass**

Run (from `web/`):
```
npx tsc --noEmit
npm run lint
```
Expected: no errors. (If `MOBILE_GAMES`/`REGIONS`/`FUNCTION_CARDS` are imported but not yet used, lint may warn "unused" — acceptable at this step since later tasks use them; if lint is configured to error on unused, add a temporary `void MOBILE_GAMES;` line or defer the import to the task that uses it. Prefer deferring the import.)

- [ ] **Step 6: Visual smoke check**

Run `npm run dev`, open the instructions view. Expected: 8 nav dots, swipe/arrows move through 8 pages, pages 1/2/5/7 show the WIP placeholder, pages 0/3/4/6 show existing content. No console errors.

---

### Task 2: IntroSection (page 1 — brief game intro)

**Files:**
- Modify: `web/src/components/views/InstructionsView.tsx`

**Interfaces:**
- Consumes: `SectionHeader`, `stagger`, `fogItem` (existing). Icons from lucide-react (add to import block as needed: `Building2`, `TrendingUp`, `Coins`, `Trophy`).
- Produces: `IntroSection` component (replaces the Task 1 stub).

- [ ] **Step 1: Implement IntroSection**

Replace the `IntroSection` stub with:

```tsx
function IntroSection() {
  const facts = [
    { icon: Building2, label: "四大區域", value: "極光・靈序・影焰・晨霧" },
    { icon: Coins, label: "通用貨幣", value: "光幣" },
    { icon: TrendingUp, label: "市場機制", value: "事件驅動漲跌" },
    { icon: Trophy, label: "勝負", value: "總資產最高者勝" },
  ];
  return (
    <motion.div variants={stagger} initial="hidden" animate="show"
      className="flex flex-col gap-4 px-4 py-8 max-w-2xl mx-auto w-full">
      <SectionHeader chapter="Chapter 01" title="遊戲簡介" en="INTRODUCTION" accent="text-cyan-400" />

      <motion.div variants={fogItem} className="glass rounded-2xl p-4 border border-cyan-500/15">
        <p className="text-slate-300 text-sm leading-relaxed">
          《IM 大富翁：迷霧資本戰》中，你率領一支新興集團進駐迷霧城市。
          在四大區域<span className="neon-gold font-bold"> 購買並升級資產</span>、
          解讀<span className="text-cyan-300 font-bold"> 市場漲跌</span>、
          蒐集情報與道具、與他隊交易結盟。
          遊戲結束時，<span className="neon-gold font-bold">總資產</span>最高的隊伍稱霸迷霧大陸。
        </p>
      </motion.div>

      <div className="grid grid-cols-2 gap-3">
        {facts.map(({ icon: Icon, label, value }) => (
          <motion.div key={label} variants={fogItem}
            className="glass rounded-xl p-4 border border-white/5 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4 text-cyan-400" />
              <span className="text-slate-400 text-xs">{label}</span>
            </div>
            <p className="text-slate-200 text-sm font-medium">{value}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
```

Ensure `Building2`, `TrendingUp`, `Coins`, `Trophy` are in the lucide import block.

- [ ] **Step 2: Verify typecheck + lint pass**

Run (from `web/`): `npx tsc --noEmit` then `npm run lint`. Expected: no errors.

- [ ] **Step 3: Visual check**

`npm run dev` → page 1 (簡介) shows the paragraph + 4 fact cards, fog-in animation plays, no overflow on a narrow viewport (~375px). Adjust copy length if it overflows.

---

### Task 3: TwoPartsSection (page 2 — minigame→dice + monopoly, with live minigame list)

**Files:**
- Modify: `web/src/components/views/InstructionsView.tsx`

**Interfaces:**
- Consumes: `MOBILE_GAMES` (import added/activated here), `SectionHeader`, `stagger`, `fogItem`. Icons: `Dices`, `Map`.
- Produces: `TwoPartsSection` component (replaces stub); a module-level `MINIGAME_NAMES: string[]` derived from `MOBILE_GAMES`.

- [ ] **Step 1: Derive the deduped minigame name list**

Above `TwoPartsSection`, add a derivation that strips a trailing parenthetical (e.g. `（vs 關主）`) and uniquifies, so vs-host variants collapse and new games appear automatically:

```tsx
// 小遊戲名稱（去掉「（vs 關主）」之類括號變體後去重，順序同 MOBILE_GAMES）
const MINIGAME_NAMES: string[] = Array.from(
  new Set(MOBILE_GAMES.map((g) => g.name.replace(/（[^）]*）\s*$/, "").trim()))
);
```

- [ ] **Step 2: Implement TwoPartsSection**

Replace the `TwoPartsSection` stub:

```tsx
function TwoPartsSection() {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show"
      className="flex flex-col gap-4 px-4 py-8 max-w-2xl mx-auto w-full">
      <SectionHeader chapter="Chapter 02" title="兩大環節" en="HOW IT FLOWS" accent="text-purple-400" />

      <motion.div variants={fogItem} className="glass rounded-2xl p-4 border border-purple-500/15">
        <p className="text-slate-300 text-sm leading-relaxed">
          遊戲分為兩大環節：先在<span className="text-purple-300 font-bold"> 流動關卡 </span>玩小遊戲贏得
          <span className="text-purple-300 font-bold"> 骰子</span>，再用骰子在
          <span className="text-cyan-300 font-bold"> 大富翁地圖 </span>上移動、觸發各格效果。
        </p>
      </motion.div>

      {/* Part A — minigame → dice */}
      <motion.div variants={fogItem}
        className="glass rounded-xl p-4 border border-purple-500/25 bg-gradient-to-r from-purple-500/8 to-transparent">
        <div className="flex items-center gap-2 mb-2">
          <Dices className="w-4 h-4 text-purple-400" />
          <p className="font-bold text-sm text-purple-300">環節一 · 小遊戲換骰子</p>
        </div>
        <p className="text-slate-400 text-xs leading-relaxed mb-3">
          找<span className="text-purple-300 font-bold">流動關主</span>挑戰小遊戲，過關贏得骰子。
          骰子可<span className="text-purple-300 font-bold">累積</span>使用——沒有骰子就無法在地圖上移動。
        </p>
        <div className="flex flex-wrap gap-1.5">
          {MINIGAME_NAMES.map((name) => (
            <span key={name}
              className="text-[11px] text-slate-300 glass px-2.5 py-1 rounded-full border border-purple-500/15">
              {name}
            </span>
          ))}
        </div>
      </motion.div>

      {/* Part B — monopoly */}
      <motion.div variants={fogItem}
        className="glass rounded-xl p-4 border border-cyan-500/25 bg-gradient-to-r from-cyan-500/8 to-transparent">
        <div className="flex items-center gap-2 mb-2">
          <Map className="w-4 h-4 text-cyan-400" />
          <p className="font-bold text-sm text-cyan-300">環節二 · 大富翁地圖</p>
        </div>
        <p className="text-slate-400 text-xs leading-relaxed">
          用骰子在 36 格地圖上前進，每停留一格就觸發該格效果：購買 / 升級不動產、抽好運或厄運卡、
          登記大樂透、巧遇點燈人等。地圖與各格細節見下一頁。
        </p>
      </motion.div>
    </motion.div>
  );
}
```

Ensure `Dices` and `Map` are imported (both already in the current import block — confirm they weren't removed in Task 1 Step 4).

- [ ] **Step 3: Verify typecheck + lint pass**

Run (from `web/`): `npx tsc --noEmit` then `npm run lint`. Expected: no errors. `MOBILE_GAMES` is now used, clearing any earlier unused-import concern.

- [ ] **Step 4: Visual check**

`npm run dev` → page 2 shows two cards; the minigame chips list the deduped names (verify 烏龜烏龜翹 and 海帶拳 each appear once, no `（vs 關主）` suffix). Chips wrap cleanly on a narrow viewport.

---

### Task 4: MapSection rewrite + MapLightbox (page 3 — real board image, tap to zoom)

**Files:**
- Modify: `web/src/components/views/InstructionsView.tsx`

**Interfaces:**
- Consumes: `next/image` `Image`, `useState`, `useEffect` (already imported in the file), `SectionHeader`, `stagger`, `fogItem`, `motion`, `AnimatePresence`. Icons: `Star`, `Map`, `Landmark`, `Ticket`, `Zap`, `X`, `ZoomIn`.
- Produces: `MapLightbox` helper component; rewritten `MapSection`.

- [ ] **Step 1: Add the Image import and ZoomIn icon**

At the top, add:
```tsx
import Image from "next/image";
```
Add `ZoomIn` to the lucide-react import block (`X` is already imported for the nav).

- [ ] **Step 2: Implement MapLightbox**

Add above `MapSection`. A fixed fullscreen overlay with pinch/drag zoom via native scroll+`touch-action`; simplest robust approach is an over-scrollable container that shows the image at a larger intrinsic size so users can pan, plus a close affordance.

```tsx
function MapLightbox({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex flex-col"
          onClick={onClose}
        >
          <div className="flex justify-end p-3 shrink-0">
            <button
              onClick={onClose}
              className="chip w-10 h-10 rounded-xl flex items-center justify-center"
              aria-label="關閉"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Scrollable zoomed board: image rendered larger than viewport so user can pan/scroll to read tiles */}
          <div
            className="flex-1 overflow-auto overscroll-contain"
            style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x pan-y pinch-zoom" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-[min(180vh,180vw)] max-w-none aspect-square mx-auto">
              <Image
                src="/map.png" alt="遊戲地圖（放大）" fill
                sizes="180vh" className="object-contain select-none" draggable={false} priority
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 3: Rewrite MapSection**

Replace the existing `MapSection` with the board-image version + the legend (legend cards reuse the existing tile data):

```tsx
function MapSection() {
  const [zoom, setZoom] = useState(false);
  const tiles = [
    { icon: Star, name: "光源點", desc: "抽好運卡：獲得光幣、動產等獎勵，或轉輪盤、抽籤、移動格數", color: "text-amber-400", border: "border-amber-500/25", from: "from-amber-500/10" },
    { icon: Map, name: "迷霧區", desc: "抽厄運卡：可能被扣光幣或執行懲罰", color: "text-slate-400", border: "border-slate-600/30", from: "from-slate-700/20" },
    { icon: Landmark, name: "資本據點", desc: "可購買或升級不動產；若該區被獨佔需繳過路費", color: "text-cyan-400", border: "border-cyan-500/25", from: "from-cyan-500/10" },
    { icon: Ticket, name: "大樂透登記", desc: "免費登記一個號碼，加購依 50×2ⁿ 計算", color: "text-rose-400", border: "border-rose-500/25", from: "from-rose-500/10" },
    { icon: Zap, name: "巧遇點燈人", desc: "燈塔（+光幣 +點數）、神秘商店、命運輪盤、大樂透開獎", color: "text-yellow-400", border: "border-yellow-500/25", from: "from-yellow-500/10" },
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show"
      className="flex flex-col gap-4 px-4 py-8 max-w-2xl mx-auto w-full">
      <SectionHeader chapter="Chapter 03" title="迷霧地圖" en="THE BOARD" accent="text-amber-400" />

      <motion.div variants={fogItem} className="glass rounded-2xl p-4 border border-amber-500/15">
        <p className="text-slate-300 text-sm leading-relaxed">
          地圖共 <span className="neon-gold font-bold">36 格</span> 環繞中央燈塔，
          四大區域各據一方。點擊地圖可<span className="text-amber-300 font-bold">放大檢視</span>每一格。
        </p>
      </motion.div>

      {/* Board image — tap to zoom */}
      <motion.button
        variants={fogItem}
        onClick={() => setZoom(true)}
        className="relative w-full aspect-square rounded-2xl overflow-hidden glass border border-white/10 group"
        aria-label="放大地圖"
      >
        <Image src="/map.png" alt="遊戲地圖" fill sizes="(min-width:768px) 42rem, 100vw"
          className="object-contain select-none" draggable={false} priority />
        <span className="absolute bottom-2 right-2 chip px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs">
          <ZoomIn className="w-3.5 h-3.5" /> 放大
        </span>
      </motion.button>

      {/* Tile legend */}
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

      <MapLightbox open={zoom} onClose={() => setZoom(false)} />
    </motion.div>
  );
}
```

- [ ] **Step 4: Verify typecheck + lint pass**

Run (from `web/`): `npx tsc --noEmit` then `npm run lint`. Expected: no errors.

- [ ] **Step 5: Visual check**

`npm run dev` → page 3 shows the board fit-to-width with a "放大" chip + 5 legend cards. Tapping the board opens the fullscreen lightbox; you can scroll/pan to read tile labels; X / Escape / backdrop-tap all close it; body scroll is locked while open. Confirm on a narrow viewport.

---

### Task 5: PropertySection — fold in the 4 market events + source regions from REGIONS (page 4)

**Files:**
- Modify: `web/src/components/views/InstructionsView.tsx`

**Interfaces:**
- Consumes: `REGIONS` (activated here), `SectionHeader`, `stagger`, `fogItem`. The existing PropertySection internals (levels, toll block) are kept.
- Produces: rewritten `PropertySection` including a market-events block; a `REGION_STYLE` color map keyed by `RegionCode`.

- [ ] **Step 1: Add a region style map**

The accent colors must come from somewhere now that names/themes come from `REGIONS`. Above `PropertySection`, add a style map keyed by region code (codes: `AURORA`, `SPECTRA`, `EMBER`, `HAVEN` per `game.ts`):

```tsx
const REGION_STYLE: Record<string, { text: string; border: string; from: string; dot: string }> = {
  AURORA:  { text: "text-amber-400",   border: "border-amber-500/30",   from: "from-amber-500/10",   dot: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" },
  SPECTRA: { text: "text-cyan-400",    border: "border-cyan-500/30",    from: "from-cyan-500/10",    dot: "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" },
  EMBER:   { text: "text-rose-400",    border: "border-rose-500/30",    from: "from-rose-500/10",    dot: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" },
  HAVEN:   { text: "text-emerald-400", border: "border-emerald-500/30", from: "from-emerald-500/10", dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" },
};
```

- [ ] **Step 2: Rewrite PropertySection**

Replace `PropertySection`. Regions now map over `REGIONS`; keep the levels ladder and toll block; add the market-events block (moved from the old SpecialSection):

```tsx
function PropertySection() {
  const levels = [
    { label: "0 級 · 購買", cost: "初始定價", pct: 20, color: "from-slate-500 to-slate-400" },
    { label: "1 級 · 一建", cost: "初始 × 20%", pct: 40, color: "from-cyan-600 to-cyan-400" },
    { label: "2 級 · 二建", cost: "初始 × 40%", pct: 60, color: "from-emerald-600 to-emerald-400" },
    { label: "3 級 · 三建", cost: "初始 × 60%", pct: 80, color: "from-amber-600 to-amber-400" },
  ];
  const events = [
    { n: "01", name: "晨霧退散", up: "極光金域 ↑", down: "晨霧棲城 ↓", color: "text-amber-400", border: "border-amber-500/25", from: "from-amber-500/8" },
    { n: "02", name: "影焰爆產", up: "影焰工域 ↑", down: "住宅教育 ↓", color: "text-rose-400", border: "border-rose-500/25", from: "from-rose-500/8", badge: "光靈啟動" },
    { n: "03", name: "靈序突破", up: "靈序研究 ↑", down: "傳統商業 ↓", color: "text-cyan-400", border: "border-cyan-500/25", from: "from-cyan-500/8", badge: "特殊骰啟動" },
    { n: "04", name: "棲城翻身", up: "晨霧棲城 ↑", down: "前期最強區 ↓", color: "text-emerald-400", border: "border-emerald-500/25", from: "from-emerald-500/8", badge: "政府拍賣不動產" },
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show"
      className="flex flex-col gap-4 px-4 py-8 max-w-2xl mx-auto w-full">
      <SectionHeader chapter="Chapter 04" title="不動產與大富翁" en="PROPERTY & MONOPOLY" accent="text-emerald-400" />

      {/* Regions (from REGIONS) */}
      <div className="grid grid-cols-2 gap-2.5">
        {REGIONS.map(({ code, name, theme }) => {
          const s = REGION_STYLE[code] ?? REGION_STYLE.AURORA;
          return (
            <motion.div key={code} variants={fogItem}
              className={`glass rounded-xl p-3.5 bg-gradient-to-br ${s.from} to-transparent border ${s.border}`}>
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                <span className={`font-bold text-sm ${s.text}`}>{name}</span>
              </div>
              <p className="text-slate-400 text-xs">{theme}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Upgrade ladder */}
      <motion.div variants={fogItem} className="glass rounded-2xl p-4 border border-emerald-500/15">
        <p className="text-slate-400 text-xs font-mono uppercase tracking-widest mb-3">升級費用（四捨五入至 10 光幣）</p>
        <div className="space-y-3">
          {levels.map(({ label, cost, pct, color }, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-slate-400 text-xs w-20 shrink-0">{label}</span>
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                  transition={{ delay: 0.4 + i * 0.12, duration: 0.7, ease: "easeOut" }}
                  className={`h-full bg-gradient-to-r ${color} rounded-full`} />
              </div>
              <span className="text-slate-300 text-xs w-20 text-right font-mono">{cost}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Monopoly / toll */}
      <motion.div variants={fogItem}
        className="glass rounded-xl p-4 border border-amber-500/25 bg-gradient-to-r from-amber-500/10 to-transparent">
        <p className="text-amber-300 font-bold text-sm mb-1.5">獨佔隊伍 · 過路費</p>
        <p className="text-slate-400 text-xs leading-relaxed">
          需先在該區擁有至少一棟三級不動產，才可能取得獨佔（「三級不動產最多」者勝出）。其他隊踩到該區資本據點需支付：
        </p>
        <p className="text-amber-300 font-bold text-sm mt-1.5">該區所有不動產（升級後價值）總和 × 8%</p>
        <p className="text-slate-400 text-xs leading-relaxed mt-1.5">
          不動產等級越高，計入過路費的價值也越高——蓋得越高，收得越多。
        </p>
      </motion.div>

      {/* Market events (folded in) */}
      <motion.div variants={fogItem}>
        <p className="text-slate-400 text-xs font-mono tracking-widest uppercase mb-2">市場事件 × 4（由主持人依時間宣告，牽動各區資產漲跌）</p>
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
    </motion.div>
  );
}
```

- [ ] **Step 3: Verify typecheck + lint pass**

Run (from `web/`): `npx tsc --noEmit` then `npm run lint`. Expected: no errors. `REGIONS` is now used.

- [ ] **Step 4: Visual check**

`npm run dev` → page 4 shows 4 region cards (names/themes from `REGIONS`, correct colors), the upgrade ladder animates, the toll block, and the 4 market-event cards with badges.

---

### Task 6: AssetsSection (page 5 — 動產 passives + function cards from FUNCTION_CARDS)

**Files:**
- Modify: `web/src/components/views/InstructionsView.tsx`

**Interfaces:**
- Consumes: `FUNCTION_CARDS` (activated here), `SectionHeader`, `stagger`, `fogItem`. Icons: `Package`, `Sword`.
- Produces: `AssetsSection` (replaces stub).

- [ ] **Step 1: Implement AssetsSection**

Replace the `AssetsSection` stub. Function cards render from `FUNCTION_CARDS`, filtered to `defaultStock > 0` (hides disabled cards like 市場預警卡), showing `type` / `effect` / `cost`:

```tsx
function AssetsSection() {
  const cards = FUNCTION_CARDS.filter((c) => c.defaultStock > 0);
  return (
    <motion.div variants={stagger} initial="hidden" animate="show"
      className="flex flex-col gap-4 px-4 py-8 max-w-2xl mx-auto w-full">
      <SectionHeader chapter="Chapter 05" title="資產與卡牌" en="ASSETS & CARDS" accent="text-rose-400" />

      {/* 動產 — passive effects */}
      <motion.div variants={fogItem}
        className="glass rounded-xl p-3.5 border border-amber-500/20 bg-gradient-to-r from-amber-500/8 to-transparent">
        <div className="flex items-center gap-2 mb-1.5">
          <Package className="w-4 h-4 text-amber-400" />
          <p className="font-bold text-sm text-amber-300">動產 · 被動效果（S / A / B / C 級）</p>
        </div>
        <p className="text-slate-400 text-xs leading-relaxed">
          動產不只是收藏品——每項都自帶<span className="text-amber-300 font-bold">被動效果</span>，例如：
          收路費加成、付路費減免、購買折扣、每輪複利或分紅、樂透加成抽成、輪盤保底等。
        </p>
        <p className="text-slate-400 text-xs leading-relaxed mt-1.5">
          取得方式：<span className="text-amber-300 font-bold">光源點機率獲得</span>、
          神秘商店購買、隊間交易、或在政府拍賣中得標。
        </p>
      </motion.div>

      {/* 功能卡 — from FUNCTION_CARDS */}
      <motion.div variants={fogItem}>
        <p className="text-slate-400 text-xs font-mono tracking-widest uppercase mb-2">功能卡（在神秘商店用卡牌點數購買）</p>
        <div className="grid grid-cols-2 gap-2">
          {cards.map(({ type, effect, cost }) => (
            <div key={type} className="glass rounded-xl p-2.5 border border-violet-500/15 flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-xs text-violet-300">{type}</p>
                <p className="text-slate-500 text-[10px] leading-snug mt-0.5">{effect}</p>
              </div>
              <span className="text-violet-400 text-[10px] font-mono shrink-0">{cost}pt</span>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div variants={fogItem}
        className="glass rounded-xl p-3 border border-slate-700/30 flex items-center gap-2">
        <Sword className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <p className="text-slate-400 text-[11px] leading-relaxed">
          功能卡是主動進攻手段，瞄準對手的土地與建設；卡牌點數可玩小遊戲或過燈塔取得。
        </p>
      </motion.div>
    </motion.div>
  );
}
```

Ensure `Package` and `Sword` are imported.

- [ ] **Step 2: Verify typecheck + lint pass**

Run (from `web/`): `npx tsc --noEmit` then `npm run lint`. Expected: no errors. `FUNCTION_CARDS` is now used.

- [ ] **Step 3: Visual check**

`npm run dev` → page 5 shows the 動產 card + function-card grid. Confirm card costs match `FUNCTION_CARDS` (e.g. 購地卡 100pt, NOT the old 50pt) and 市場預警卡 (stock 0) is absent.

---

### Task 7: SpecialSection slim-down (page 6 — lottery / wheel / trade / auction only)

**Files:**
- Modify: `web/src/components/views/InstructionsView.tsx`

**Interfaces:**
- Consumes: `SectionHeader`, `stagger`, `fogItem`. Icons: `Ticket`, `LoaderPinwheel`, `Sword`.
- Produces: rewritten `SpecialSection` (events + function cards + 動產 removed — they now live on pages 4/5).

- [ ] **Step 1: Rewrite SpecialSection**

Replace `SpecialSection`, keeping only lottery, wheel, trade & auction:

```tsx
function SpecialSection() {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show"
      className="flex flex-col gap-4 px-4 py-8 max-w-2xl mx-auto w-full">
      <SectionHeader chapter="Chapter 06" title="特殊系統" en="SPECIAL SYSTEMS" accent="text-rose-400" />

      {/* Lottery */}
      <motion.div variants={fogItem}
        className="glass rounded-xl p-3.5 border border-rose-500/20 bg-gradient-to-r from-rose-500/8 to-transparent">
        <div className="flex items-center gap-2 mb-1.5">
          <Ticket className="w-4 h-4 text-rose-400" />
          <p className="font-bold text-sm text-rose-300">大樂透系統</p>
        </div>
        <p className="text-slate-400 text-xs leading-relaxed">
          踩到登記格可免費登記一個號碼（1～50）。第二個起加購費：
          <span className="text-rose-300 font-mono"> 50 × 2^(n-1)</span>，獎金池增加兩倍！
          開獎格觸發時，中獎隊伍獨得整個獎金池。
        </p>
      </motion.div>

      {/* Wheel */}
      <motion.div variants={fogItem}
        className="glass rounded-xl p-3.5 border border-cyan-500/20 bg-gradient-to-r from-cyan-500/8 to-transparent">
        <div className="flex items-center gap-2 mb-1.5">
          <LoaderPinwheel className="w-4 h-4 text-cyan-400" />
          <p className="font-bold text-sm text-cyan-300">命運投資輪盤</p>
        </div>
        <p className="text-slate-400 text-xs leading-relaxed">
          在地圖關站可押注光幣轉動輪盤——轉盤決定本次投資的<span className="text-cyan-300 font-bold">倍率</span>，
          可能翻倍暴賺，也可能血本無歸。高風險高報酬？
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
          <span className="text-violet-300 font-bold">交易</span>：隨時可與他隊交換光幣、卡牌點數、動產。
          {" "}
          <span className="text-violet-300 font-bold">拍賣</span>：由拍賣官主持英式喊價——各隊現場喊價，得標贏得強力道具！
        </p>
      </motion.div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Verify typecheck + lint pass**

Run (from `web/`): `npx tsc --noEmit` then `npm run lint`. Expected: no errors. Remove any icons now unused only by the old SpecialSection (e.g. if `Info`, `ShoppingBag` are no longer referenced anywhere — check before removing).

- [ ] **Step 3: Visual check**

`npm run dev` → page 6 shows exactly 3 cards (lottery, wheel, trade/auction). No market-events or function-card content remains here.

---

### Task 8: WinSection (page 7 — settlement / how to win)

**Files:**
- Modify: `web/src/components/views/InstructionsView.tsx`

**Interfaces:**
- Consumes: `SectionHeader`, `stagger`, `fogItem`, `motion`.
- Produces: `WinSection` (replaces stub; content adapted from the old SettlementSection).

- [ ] **Step 1: Implement WinSection**

Replace the `WinSection` stub (adapted from the old `SettlementSection`, retitled):

```tsx
function WinSection() {
  const formula = [
    { text: "現金光幣", color: "text-yellow-300", glow: "shadow-[0_0_14px_rgba(253,224,71,0.35)]", border: "border-yellow-500/30" },
    { text: "＋", color: "text-slate-500", border: "" },
    { text: "不動產市值", color: "text-cyan-300", glow: "shadow-[0_0_14px_rgba(34,211,238,0.35)]", border: "border-cyan-500/30" },
    { text: "＋", color: "text-slate-500", border: "" },
    { text: "特殊加成", color: "text-rose-300", glow: "shadow-[0_0_14px_rgba(251,113,133,0.35)]", border: "border-rose-500/30" },
  ];
  const rules = [
    "蓋房子、成為獨佔大富翁、發大財",
    "主持人擁有最終裁決權",
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show"
      className="flex flex-col gap-4 px-4 py-8 max-w-2xl mx-auto w-full">
      <SectionHeader chapter="Chapter 07" title="如何獲勝" en="HOW TO WIN" accent="text-yellow-400" />

      <motion.div variants={fogItem}
        className="glass rounded-2xl p-5 border border-yellow-500/20 bg-gradient-to-br from-yellow-500/8 to-amber-500/5 text-center">
        <p className="text-slate-400 text-xs font-mono tracking-widest uppercase mb-4">總資產計算公式</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {formula.map(({ text, color, glow, border }, i) => (
            <motion.span key={i}
              initial={{ opacity: 0, scale: 0.7, filter: "blur(8px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              transition={{ delay: 0.3 + i * 0.1, type: "spring", stiffness: 250, damping: 20 }}
              className={`font-bold text-sm ${color} ${glow || ""} ${border ? `glass border ${border} px-2.5 py-1.5 rounded-lg` : ""}`}>
              {text}
            </motion.span>
          ))}
        </div>
      </motion.div>

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

      <motion.div variants={fogItem} className="glass rounded-2xl p-5 border border-cyan-500/20 text-center">
        <motion.p
          animate={{ opacity: [0.7, 1, 0.7], textShadow: ["0 0 8px rgba(34,211,238,0.3)", "0 0 24px rgba(34,211,238,0.8)", "0 0 8px rgba(34,211,238,0.3)"] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className="neon-cyan font-black text-xl">
          祝各隊旗開得勝！
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Delete the old SettlementSection**

Remove the now-orphaned `SettlementSection` function definition (its content moved into `WinSection`).

- [ ] **Step 3: Verify typecheck + lint pass**

Run (from `web/`): `npx tsc --noEmit` then `npm run lint`. Expected: no errors, no unused-variable warnings.

- [ ] **Step 4: Visual check**

`npm run dev` → page 7 shows the formula (現金光幣 ＋ 不動產市值 ＋ 特殊加成), the 2 rules, and the glowing closer.

---

### Task 9: Final pass — placeholder cleanup, hero stat accuracy, full walkthrough

**Files:**
- Modify: `web/src/components/views/InstructionsView.tsx`

**Interfaces:**
- Consumes: everything above.
- Produces: final, clean file.

- [ ] **Step 1: Remove the SectionPlaceholder helper**

All sections are now real. Delete the `SectionPlaceholder` component added in Task 1 (it should have no remaining references).

- [ ] **Step 2: Reconcile the hero stat chips**

In `HeroSection`, the stat chips currently read `36 地圖格 / 4 區域 / 4 市場事件 / 8 功能卡種`. Update `功能卡種` to the count of `FUNCTION_CARDS.filter(c => c.defaultStock > 0).length` (compute the literal number and hardcode it in the chip text, or derive it — deriving keeps it accurate). Keep `36`, `4`, `4` (verified correct: 36 tiles, 4 regions, 4 market events).

- [ ] **Step 3: Full unused-import sweep**

Review the lucide-react import block: every imported icon must be referenced. Remove any that aren't. `BookOpen` is used by the header/hero — keep it.

- [ ] **Step 4: Verify typecheck + lint pass (full)**

Run (from `web/`):
```
npx tsc --noEmit
npm run lint
```
Expected: zero errors, zero warnings.

- [ ] **Step 5: Full walkthrough**

`npm run dev`, open the instructions view in both modes if reachable (standalone `/instructions` and embedded via the back button). Walk all 8 pages with arrow keys, nav dots, and swipe. Confirm:
- 8 pages, chapters numbered 01–07 (hero has none).
- Page 2 minigame chips deduped.
- Page 3 board zoom works and locks scroll.
- Page 4 regions/events render from live data.
- Page 5 card costs match `FUNCTION_CARDS`, 市場預警卡 absent.
- No console errors; nav/prev/next disabled states correct at first/last page.

- [ ] **Step 6: Build check (optional but recommended)**

Run (from `web/`): `npm run build`. Expected: build succeeds (catches any prod-only Image/Next issues the dev server tolerates). If `prisma generate` fails for unrelated env reasons, `npx tsc --noEmit` + lint passing is sufficient.

---

## Self-Review

**Spec coverage:**
- Page 0 Hero → Task 9 Step 2 (kept, stats reconciled). ✓
- Page 1 Intro → Task 2. ✓
- Page 2 Two-parts + minigame list → Task 3 (live `MOBILE_GAMES`, dedup). ✓
- Page 3 Map + tap-to-zoom lightbox + legend → Task 4. ✓
- Page 4 Property + monopoly/toll + market events folded in + `REGIONS` → Task 5. ✓
- Page 5 Assets (動產 passives) + function cards from `FUNCTION_CARDS` (stock>0) → Task 6. ✓
- Page 6 Special (lottery/wheel/trade/auction only) → Task 7. ✓
- Page 7 Win/settlement → Task 8. ✓
- Live data imports (`MOBILE_GAMES`/`REGIONS`/`FUNCTION_CARDS`) → Tasks 1/3/5/6. ✓
- Nav machinery unchanged → preserved (Task 1 only touches `SECTIONS`). ✓
- Stale card cost fix → Task 6 (filter + live cost) + Task 9 verification. ✓

**Placeholder scan:** No "TBD/TODO/handle edge cases". The hero-stat decision is given a concrete rule (Task 9 Step 2). The Task-1 `SectionPlaceholder` is an intentional, explicitly-removed scaffold (Task 9 Step 1), not a residual placeholder. ✓

**Type/name consistency:** `MapLightbox({ open, onClose })` defined in Task 4, used in Task 4 same signature. `REGION_STYLE` keyed by region `code` strings matching `RegionCode` from `game.ts`. `MINIGAME_NAMES` derived once, used once. Section component names match `SECTIONS` entries from Task 1. ✓

**Note for executor:** Tasks 4–8 rewrite sections that already exist from Task 1 (MapSection/PropertySection/SpecialSection were kept; Intro/TwoParts/Assets/Win were stubs). Apply each task's replacement to whatever currently occupies that function. Tasks are ordered so the file always typechecks between tasks.
