# Projection Event Ticker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the uncommitted newspaper event overlay with a persistent projection-header ticker containing each active event's name, news, and calculated impacts.

**Architecture:** Keep event-impact formatting as pure tested logic, add a pure ticker-entry builder, and render the entries through a focused `MarketEventTicker` component. Remove event items from the transient animation queue so only lottery and auction overlays remain serialized.

**Tech Stack:** Next.js 16, React 19, TypeScript, Framer Motion, Vitest, Tailwind CSS.

---

### Task 1: Ticker data

- [x] Add failing tests for single-event text, event ordering, event-four penalty, and unknown-event filtering.
- [x] Implement `buildEventTickerEntries(activeEvents, penaltyRegion)`.
- [x] Run focused tests.

### Task 2: Remove event overlay behavior

- [x] Remove event timing, detection, builders, and queue variants.
- [x] Delete `EventNewspaperOverlay.tsx`.
- [x] Update queue tests to cover lottery-before-auction behavior.

### Task 3: Header ticker UI

- [x] Add `MarketEventTicker` with duplicated tracks for seamless horizontal motion.
- [x] Render it from `Header` using active events and `event4Penalty`.
- [x] Preserve reduced-motion accessibility and hide the banner when no events exist.

### Task 4: Verification

- [x] Run all tests, ESLint, and TypeScript.
- [x] Verify the ticker in a browser with multiple active events.
- [x] Confirm no full-screen event dialog appears and console remains clean.
