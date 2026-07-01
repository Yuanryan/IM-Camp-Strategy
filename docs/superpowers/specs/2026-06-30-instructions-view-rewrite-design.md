# InstructionsView Rewrite — Design

**Date:** 2026-06-30
**File:** `web/src/components/views/InstructionsView.tsx`
**Status:** Approved design, pending implementation plan

## Goal

Rewrite the content and structure of the game manual (`InstructionsView`) so it reads as a
guided onboarding flow: intro → the game's two halves → the board → property/monopoly →
assets & cards → special systems → how to win. Replace the current hardcoded (and partly
stale) data with live imports from the single source of truth (`web/src/lib/game.ts`).

The existing navigation machinery (swipe / arrow keys / nav dots / prev-next, both embedded
and standalone modes) is kept as-is. It already renders an arbitrary number of sections from
the `SECTIONS` array, so adding/reordering sections needs no plumbing changes.

## Section Structure (8 pages)

| # | Label | Component | Purpose |
|---|-------|-----------|---------|
| 0 | 序章 | `HeroSection` | Animated title splash (largely unchanged) |
| 1 | 簡介 | `IntroSection` | Brief "what is this game" |
| 2 | 兩大環節 | `TwoPartsSection` | The game has two halves: minigame→dice, and monopoly |
| 3 | 地圖 | `MapSection` | The actual board image + tile-type legend |
| 4 | 不動產 | `PropertySection` | Regions, upgrades, monopoly/toll, **market events** |
| 5 | 資產卡牌 | `AssetsSection` | 動產 (passive items) + 功能卡 |
| 6 | 特殊 | `SpecialSection` | Lottery, fortune wheel, trade, auction |
| 7 | 如何獲勝 | `WinSection` | Settlement formula + final rules |

## Per-Section Content

### 0 · HeroSection (keep)
Keep the existing hero almost entirely: floating particles, pulsing rings, rotating
`BookOpen` icon, `FogText` title (`IM 大富翁` / `迷霧資本戰`), tagline, stat chips, swipe
hint. The stat chips (`36 地圖格 / 4 區域 / 4 市場事件 / 8 功能卡種`) are reviewed for
accuracy: change `功能卡種` count to match the active `FUNCTION_CARDS` length (cards with
`defaultStock > 0`), or keep a curated round number — decided during implementation against
live data.

### 1 · IntroSection (new)
One tight conceptual paragraph: you play a rising corporation in the fog-city; buy and
upgrade assets across four districts, read market swings, gather intel and items, and
accumulate the highest total wealth to win. Teases the win condition (detailed on page 7).
A small set of "at a glance" facts (district count, currency = 光幣, dice-gated movement).
Visual style consistent with existing `SectionHeader` + glass cards.

### 2 · TwoPartsSection (new — "game is two parts")
Conceptual page, **no board image here** (board lives on page 3).

- **Part A — 小遊戲 → 骰子:** Find a 流動關主, win a minigame, earn dice. Dice are the
  only way to move on the board (no minigame, no move); dice can be accumulated.
- **Minigame name list:** rendered from `MOBILE_GAMES` (imported from `game.ts`), **names
  only, no rules**. Dedupe the `（vs 關主）` variants so each base game appears once
  (烏龜烏龜翹, 海帶拳 collapse from two entries to one). Resulting unique names: 猜歌、憤怒企業、
  烏龜烏龜翹、注音猜詞、注音聯想、默契大考驗、傳接球、口型猜答案、海帶拳、比手畫腳、跳跳Tempo.
  Dedup is computed at render time from the imported array (strip a trailing
  `（…）` parenthetical, then unique-by-name), so new games added to `MOBILE_GAMES`
  appear automatically.
- **Part B — 大富翁:** Spend dice to move on the 36-tile board; each tile triggers an
  effect (buy/upgrade property, draw luck/misfortune, lottery, encounter the lamplighter…).
  Brief — the detail is on pages 3–6.

### 3 · MapSection (rewrite — real board)
- Render `public/map.png` (Next `Image`, `fill` or intrinsic, fit-to-width preview).
- **Tap to open a fullscreen zoom lightbox** (pinch-zoom + pan) so players can read the
  small tile labels on a phone. Lightbox: fixed overlay, dark backdrop, close button,
  `framer-motion` fade/scale in, body-scroll lock while open, closes on backdrop tap / X /
  Escape. Implemented inline in this file (no new shared component needed unless reused).
- Below the image, the 5 tile-type legend (kept from current `MapSection`): 光源點 /
  迷霧區 / 資本據點 / 大樂透登記 / 巧遇點燈人, as labelled glass cards.
- Short intro line: 36 格、任務骰子制.

### 4 · PropertySection (extend — fold in market events)
Keep current property content and **add the 4 market events** (moved here from the old
SpecialSection, because events drive property values):
- 4 regions sourced from `REGIONS` (`game.ts`) for names/themes, with the existing
  per-region accent colours mapped by `RegionCode`.
- Upgrade ladder 0–3 級 with costs (初始 / ×20% / ×40% / ×60%) and the animated bars.
- 獨佔 monopoly + 過路費 rule (該區總值 × 8%).
- **市場事件 × 4** block (晨霧退散 / 影焰爆產 / 靈序突破 / 棲城翻身) with ↑/↓ regions and
  badges, introduced as "host announces by time; events shift each district's value."

### 5 · AssetsSection (new — split assets & cards out)
- **動產 (movable assets):** passive-effect items. Explain they each carry a passive
  (收路費加成 / 付路費減免 / 購買折扣 / 每輪複利分紅 / 樂透加成 / 輪盤保底 …) and the ways to
  get them (光源點機率、神秘商店購買、隊間交易、拍賣). Grade note (S/A/B/C).
- **功能卡 (function cards):** rendered from `FUNCTION_CARDS` (imported), showing
  type / effect / cost. Only display cards with `defaultStock > 0` (so disabled cards like
  市場預警卡 with stock 0 are hidden), matching what players can actually buy. Note they're
  bought with 卡牌點數 at the 神秘商店.

### 6 · SpecialSection (slim down)
Keep only: 大樂透系統, 命運投資輪盤, 隊間交易, 政府拍賣. (Market events and function cards
have moved to pages 4 and 5 respectively.)

### 7 · WinSection (keep, renamed/retitled)
The existing settlement page: total-asset formula (現金光幣 ＋ 不動產市值 ＋ 特殊加成),
the 現場執行原則 rules, and the glowing 祝各隊旗開得勝 closer. Retitled chapter heading to
"如何獲勝 / HOW TO WIN".

## Data Sources (single source of truth)

Import from `web/src/lib/game.ts` (pure data module, no server-only deps — safe in a
`"use client"` component):

- `MOBILE_GAMES` → minigame names (page 2)
- `REGIONS` → district names/themes (page 4)
- `FUNCTION_CARDS` → function card type/effect/cost (page 5)

This fixes the current view's stale hardcoded card data (wrong costs, e.g. 購地卡 shown as
50pt vs the real 100pt) and keeps the manual in sync with future config edits.

## Out of Scope (YAGNI)

- No changes to the navigation/swipe/keyboard/nav-dot machinery.
- No new routes, API, or persistence — this is a presentational view only.
- No i18n / English copy beyond the existing `en` subheadings.
- No editing of the source data in `game.ts`.
- Reusable lightbox component extraction deferred unless a second caller appears.

## Chapter Numbering

Re-number the `SectionHeader` chapters sequentially (Chapter 01–07 across pages 1–7;
the hero has none). Accent colours per section preserved/reassigned for visual rhythm.
