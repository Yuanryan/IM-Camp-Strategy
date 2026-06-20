# Projection Arena Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved four-region arena projection dashboard while keeping all existing projection overlays intact.

**Architecture:** Keep snapshot polling and transient overlay orchestration in `ProjectionView.tsx`. Move the always-visible dashboard into a focused projection component and keep visual tier decisions in pure tested helpers. Add projection-only animation classes to global CSS and verify the complete viewport in a real browser.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Framer Motion, Vitest.

---

### Task 1: Projection visual tiers

**Files:**
- Create: `src/lib/projection-dashboard.ts`
- Create: `src/lib/projection-dashboard.test.ts`

- [x] **Step 1: Write failing tests**

```ts
expect(getProjectionRankTier(0)).toBe("gold");
expect(getProjectionRankTier(1)).toBe("silver");
expect(getProjectionRankTier(2)).toBe("rgb");
expect(getProjectionRankTier(3)).toBe("standard");
expect(getProjectionLevelTier(3)).toBe("max");
```

- [x] **Step 2: Verify the tests fail**

Run: `npx vitest run src/lib/projection-dashboard.test.ts`

Expected: FAIL because `projection-dashboard.ts` does not exist.

- [x] **Step 3: Implement the pure tier helpers**

```ts
export type ProjectionRankTier = "gold" | "silver" | "rgb" | "standard";
export type ProjectionLevelTier = "none" | "lit" | "boosted" | "max";

export function getProjectionRankTier(index: number): ProjectionRankTier {
  return ["gold", "silver", "rgb"][index] as ProjectionRankTier ?? "standard";
}

export function getProjectionLevelTier(level: number): ProjectionLevelTier {
  if (level >= 3) return "max";
  if (level === 2) return "boosted";
  if (level === 1) return "lit";
  return "none";
}
```

- [x] **Step 4: Verify the tests pass**

Run: `npx vitest run src/lib/projection-dashboard.test.ts`

Expected: PASS.

### Task 2: Arena dashboard component

**Files:**
- Create: `src/components/views/projection/ProjectionArenaDashboard.tsx`
- Modify: `src/components/views/ProjectionView.tsx`

- [x] **Step 1: Create the fixed-height dashboard shell**

Render a `100dvh` grid with a compact header and a `minmax(0, 1fr)` content row. Add `data-testid="projection-dashboard"` to the root for viewport verification.

- [x] **Step 2: Add the compact leaderboard**

Render all teams in a wider 23.5rem column. Use `getProjectionRankTier()` to apply RGB, gold, silver, and standard variants without changing ranking data.

- [x] **Step 3: Add the Jackpot card**

Render only `snap.lottery.pool` above the leaderboard. Add decorative `aria-hidden` lottery balls behind the amount.

- [x] **Step 4: Merge dominance information into region cards**

Render each region in a 2×2 grid. Display the monopoly team and toll in the region header, and add a controlled-region class when `monopolyTeamName` is present.

- [x] **Step 5: Increase asset readability**

Use larger property-name and price styles, compact rows, owner chips, and a projection-specific level indicator driven by `getProjectionLevelTier()`.

- [x] **Step 6: Preserve overlays**

Keep `AuctionStageOverlay`, `AuctionHammerOverlay`, and `LotteryDrawOverlay` in `ProjectionView.tsx` after the new dashboard component.

### Task 3: Projection animation and ticker polish

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/views/projection/ProjectionArenaDashboard.tsx`

- [x] **Step 1: Add podium effects**

Add restrained keyframes for gold sweep, silver shimmer, and RGB border rotation.

- [x] **Step 2: Add Jackpot balls**

Add slow drift animations with staggered durations and reduced-motion overrides.

- [x] **Step 3: Add controlled-region glow**

Use a CSS custom property per region and animate only opacity/box-shadow so text remains stable.

- [x] **Step 4: Stabilize ticker geometry**

Keep the track in one fixed-height line, add edge masks, and set `will-change: transform` on the moving row.

### Task 4: Verification

**Files:**
- Modify only if verification finds a defect.

- [x] **Step 1: Run unit tests**

Run: `npm test`

Expected: all tests pass.

- [x] **Step 2: Run static checks**

Run: `npx tsc --noEmit`

Run: `npx eslint src/components/views/ProjectionView.tsx src/components/views/projection/ProjectionArenaDashboard.tsx src/lib/projection-dashboard.ts src/lib/projection-dashboard.test.ts`

Expected: both commands pass.

- [x] **Step 3: Run production build**

Run: `npx next build --webpack`

Expected: build succeeds. Webpack is used because the current Chinese workspace path triggers a Turbopack UTF-8 panic.

- [x] **Step 4: Verify 1280×720**

Open `/projection` at 1280×720 and assert:

```js
({
  innerHeight: window.innerHeight,
  scrollHeight: document.documentElement.scrollHeight,
  fits: document.documentElement.scrollHeight <= window.innerHeight
})
```

Expected: `fits: true`, with no console errors.
