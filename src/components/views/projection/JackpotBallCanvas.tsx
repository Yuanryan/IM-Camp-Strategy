"use client";

import { useEffect, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type JackpotBallDef = {
  number: number;
  color: string;    // team hex, e.g. "#f472b6"
  ringColor: string;
};

type PhysicsBall = JackpotBallDef & {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const BALL_R = 11;
const SPD_MIN = 52;
const SPD_MAX = 88;

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Mulberry32 deterministic PRNG — avoids Math.random re-seeding issues. */
function makePrng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Convert hex color to "R, G, B" string for use inside rgba(). */
function hexToRgb(hex: string): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return "140, 140, 140";
  return `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}`;
}

// ─── Physics ──────────────────────────────────────────────────────────────────

function spawnBalls(
  defs: JackpotBallDef[],
  w: number,
  h: number,
  existing: Map<number, PhysicsBall>,
): PhysicsBall[] {
  const rand = makePrng(Date.now() ^ (defs.length * 0x9e37));
  const r = BALL_R;
  const cols = Math.max(1, Math.floor(w / (r * 3.4)));

  return defs.map((def, i) => {
    const prev = existing.get(def.number);
    if (prev && prev.color === def.color) return prev; // keep running ball

    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = Math.min(Math.max(r, r * 2 + col * r * 3.4 + (rand() - 0.5) * r), w - r);
    const y = Math.min(Math.max(r, r * 2 + row * r * 3.4 + (rand() - 0.5) * r), h - r);
    const angle = rand() * Math.PI * 2;
    const speed = SPD_MIN + rand() * (SPD_MAX - SPD_MIN);
    return { ...def, x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r };
  });
}

function stepPhysics(balls: PhysicsBall[], w: number, h: number, dt: number) {
  if (dt <= 0 || dt > 0.1) return;

  for (const b of balls) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); }
    if (b.x + b.r > w) { b.x = w - b.r; b.vx = -Math.abs(b.vx); }
    if (b.y - b.r < 0) { b.y = b.r; b.vy = Math.abs(b.vy); }
    if (b.y + b.r > h) { b.y = h - b.r; b.vy = -Math.abs(b.vy); }
  }

  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const a = balls[i];
      const b = balls[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d2 = dx * dx + dy * dy;
      const minD = a.r + b.r;
      if (d2 >= minD * minD || d2 < 1e-6) continue;

      const dist = Math.sqrt(d2);
      const nx = dx / dist;
      const ny = dy / dist;

      const overlap = (minD - dist) * 0.5;
      a.x -= nx * overlap;
      a.y -= ny * overlap;
      b.x += nx * overlap;
      b.y += ny * overlap;

      // Elastic impulse (equal mass)
      const relN = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (relN >= 0) continue;
      a.vx += relN * nx;
      a.vy += relN * ny;
      b.vx -= relN * nx;
      b.vy -= relN * ny;
    }
  }
}

// ─── Rendering ────────────────────────────────────────────────────────────────

function paintBalls(
  ctx: CanvasRenderingContext2D,
  balls: PhysicsBall[],
  w: number,
  h: number,
) {
  ctx.clearRect(0, 0, w, h);

  for (const b of balls) {
    const rgb = hexToRgb(b.color);
    const rng = hexToRgb(b.ringColor);

    // Main fill
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${rgb}, 0.42)`;
    ctx.fill();

    // Ring stroke
    ctx.strokeStyle = `rgba(${rng}, 0.55)`;
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Top-left highlight glint
    const hx = b.x - b.r * 0.3;
    const hy = b.y - b.r * 0.3;
    const hl = ctx.createRadialGradient(hx, hy, 0, hx, hy, b.r * 0.62);
    hl.addColorStop(0, "rgba(255,255,255,0.42)");
    hl.addColorStop(1, "rgba(255,255,255,0)");
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = hl;
    ctx.fill();

    // Number label
    ctx.fillStyle = "#ffffff";
    ctx.font = `900 ${Math.round(b.r * 0.74)}px ui-monospace, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 3;
    ctx.fillText(String(b.number), b.x, b.y + 0.5);
    ctx.shadowBlur = 0;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function JackpotBallCanvas({ balls }: { balls: JackpotBallDef[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const ballsRef = useRef(balls);
  ballsRef.current = balls;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let physBalls: PhysicsBall[] = [];
    let rafId = 0;
    let lastT = -1;
    let prevKey = "";

    const resize = () => {
      const rect = container.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      if (w < 1 || h < 1) return;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const rebuildBalls = () => {
      const defs = ballsRef.current;
      const existing = new Map(physBalls.map((b) => [b.number, b]));
      physBalls = defs.length > 0 ? spawnBalls(defs, w, h, existing) : [];
    };

    const tick = (now: number) => {
      const key = ballsRef.current.map((b) => `${b.number}:${b.color}`).join("|");
      if (key !== prevKey) {
        prevKey = key;
        rebuildBalls();
      }

      const dt = lastT < 0 ? 0 : (now - lastT) / 1000;
      lastT = now;

      if (!reduceMotion) stepPhysics(physBalls, w, h, dt);
      paintBalls(ctx, physBalls, w, h);

      rafId = requestAnimationFrame(tick);
    };

    const ro = new ResizeObserver(() => {
      resize();
      rebuildBalls();
    });

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(rafId);
        rafId = 0;
        lastT = -1;
      } else if (!rafId) {
        rafId = requestAnimationFrame(tick);
      }
    };

    ro.observe(container);
    resize();
    document.addEventListener("visibilitychange", onVisibility);
    rafId = requestAnimationFrame(tick);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(rafId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}
