# Projection Event Ticker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Keep a persistent projection-header ticker containing each active event's name, news, and calculated impacts, while restoring a one-time newspaper animation for newly activated events.

**Architecture:** Keep event-impact formatting and event-difference detection as pure tested logic, render active events through `MarketEventTicker`, and serialize newly activated event newspapers with lottery and auction overlays.

**Tech Stack:** Next.js 16, React 19, TypeScript, Framer Motion, Vitest, Tailwind CSS.

---

### Task 1: Ticker data

- [x] Add failing tests for single-event text, event ordering, event-four penalty, and unknown-event filtering.
- [x] Implement `buildEventTickerEntries(activeEvents, penaltyRegion)`.
- [x] Run focused tests.

### Task 2: Coordinate event overlay behavior

- [x] Keep event timing, detection, builders, and queue variants tested.
- [x] Restore `EventNewspaperOverlay.tsx` for newly activated events.
- [x] Update queue tests to cover event-before-lottery-before-auction behavior.

### Task 3: Header ticker UI

- [x] Add `MarketEventTicker` with duplicated tracks for seamless horizontal motion.
- [x] Render it from `Header` using active events and `event4Penalty`.
- [x] Preserve reduced-motion accessibility and hide the banner when no events exist.

### Task 4: Verification

- [x] Run all tests, ESLint, and TypeScript.
- [x] Verify the ticker in a browser with multiple active events.
- [x] Confirm no full-screen event dialog appears and console remains clean.
