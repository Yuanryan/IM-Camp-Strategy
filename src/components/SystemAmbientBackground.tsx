"use client";

import { useEffect, useRef } from "react";

type AmbientPiece = {
  kind: "coin" | "dice";
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  phase: number;
  wobble: number;
  spin: number;
  color: string;
  accent: string;
  face: number;
};

const COIN_COLORS = ["251, 191, 36", "253, 224, 71", "245, 158, 11"];
const DICE_COLORS = ["226, 232, 240", "165, 243, 252", "254, 240, 138"];

export function SystemAmbientBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d", {
      alpha: true,
      desynchronized: true,
    });
    if (!context) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let rafId = 0;
    let startedAt = performance.now();
    const seed = makeSeed();
    let pieces: AmbientPiece[] = [];
    let reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);

      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      pieces = createPieces(width, height, seed);
      drawFrame(context, width, height, pieces, 29, true);
    };

    const stop = () => {
      if (rafId !== 0) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };

    const tick = (now: number) => {
      const elapsed = (now - startedAt) / 1000;
      drawFrame(context, width, height, pieces, elapsed, false);
      rafId = window.requestAnimationFrame(tick);
    };

    const start = () => {
      stop();
      if (document.hidden || reduceMotion) {
        drawFrame(context, width, height, pieces, 29, true);
        return;
      }
      startedAt = performance.now();
      rafId = window.requestAnimationFrame(tick);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    };

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleMotionChange = () => {
      reduceMotion = motionQuery.matches;
      start();
    };

    resize();
    start();

    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", handleVisibility);
    motionQuery.addEventListener("change", handleMotionChange);

    return () => {
      stop();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibility);
      motionQuery.removeEventListener("change", handleMotionChange);
    };
  }, []);

  return (
    <canvas
      aria-hidden="true"
      className="system-ambient-canvas"
      ref={canvasRef}
    />
  );
}

function createPieces(width: number, height: number, seed: number) {
  const random = mulberry32(seed);
  const area = Math.max(1, width * height);
  const count = clamp(Math.round(area / 62000), 24, 42);

  return Array.from({ length: count }, (_, index): AmbientPiece => {
    const kind = random() < 0.58 ? "coin" : "dice";
    const direction = random() * Math.PI * 2;
    const speed = lerp(3.5, kind === "coin" ? 15 : 10, random());
    const palette = kind === "coin" ? COIN_COLORS : DICE_COLORS;
    const color = palette[Math.floor(random() * palette.length)] ?? palette[0];

    return {
      kind,
      x: random() * width,
      y: random() * height,
      vx: Math.cos(direction) * speed,
      vy: Math.sin(direction) * speed,
      size: lerp(kind === "coin" ? 18 : 20, kind === "coin" ? 46 : 52, random()),
      alpha: lerp(0.13, kind === "coin" ? 0.28 : 0.22, random()),
      phase: random() * Math.PI * 2,
      wobble: lerp(0.12, 0.42, random()),
      spin: lerp(0.1, 0.38, random()) * (random() < 0.5 ? -1 : 1),
      color,
      accent:
        kind === "coin"
          ? "255, 247, 178"
          : index % 2 === 0
            ? "34, 211, 238"
            : "251, 191, 36",
      face: 1 + Math.floor(random() * 6),
    };
  });
}

function drawFrame(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  pieces: AmbientPiece[],
  time: number,
  staticOnly: boolean,
) {
  context.clearRect(0, 0, width, height);
  drawAmbientWash(context, width, height, time);

  context.globalCompositeOperation = "screen";
  for (const piece of pieces) {
    const point = piecePosition(piece, width, height, staticOnly ? 29 : time);
    if (piece.kind === "coin") {
      drawCoin(context, piece, point.x, point.y, time);
    } else {
      drawDice(context, piece, point.x, point.y, time);
    }
  }
}

function drawAmbientWash(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
) {
  context.globalCompositeOperation = "source-over";

  const base = context.createLinearGradient(0, 0, width, height);
  base.addColorStop(0, "rgba(15, 23, 42, 0.38)");
  base.addColorStop(0.5, "rgba(2, 6, 23, 0.08)");
  base.addColorStop(1, "rgba(30, 41, 59, 0.30)");
  context.fillStyle = base;
  context.fillRect(0, 0, width, height);

  drawGlow(
    context,
    width * 0.16 + Math.sin(time * 0.035) * 80,
    height * 0.2,
    width * 0.48,
    "34, 211, 238",
    0.10,
  );
  drawGlow(
    context,
    width * 0.86 + Math.cos(time * 0.03) * 100,
    height * 0.78,
    width * 0.52,
    "251, 191, 36",
    0.09,
  );
  drawGlow(
    context,
    width * 0.42 + Math.sin(time * 0.025) * 70,
    height * 0.72,
    width * 0.44,
    "52, 211, 153",
    0.055,
  );
}

function piecePosition(
  piece: AmbientPiece,
  width: number,
  height: number,
  time: number,
) {
  const drift = Math.sin(time * piece.wobble + piece.phase) * piece.size * 0.9;
  const cross = Math.cos(time * piece.wobble * 0.7 + piece.phase) * piece.size * 0.55;

  return {
    x: wrap(piece.x + piece.vx * time + drift, -80, width + 80),
    y: wrap(piece.y + piece.vy * time + cross, -80, height + 80),
  };
}

function drawCoin(
  context: CanvasRenderingContext2D,
  piece: AmbientPiece,
  x: number,
  y: number,
  time: number,
) {
  const spin = Math.sin(time * piece.spin + piece.phase);
  const squash = 0.24 + Math.abs(spin) * 0.56;
  const rotation = time * piece.spin * 0.22 + piece.phase;
  const width = piece.size;
  const height = piece.size * squash;
  const alpha = piece.alpha * (0.82 + Math.abs(spin) * 0.18);

  context.save();
  context.translate(x, y);
  context.rotate(rotation);
  context.shadowColor = `rgba(${piece.color}, ${alpha * 0.8})`;
  context.shadowBlur = piece.size * 0.45;

  context.fillStyle = `rgba(120, 53, 15, ${alpha * 0.46})`;
  context.beginPath();
  context.ellipse(0, height * 0.22, width * 0.52, height * 0.54, 0, 0, Math.PI * 2);
  context.fill();

  const body = context.createRadialGradient(
    -width * 0.22,
    -height * 0.22,
    0,
    0,
    0,
    width * 0.72,
  );
  body.addColorStop(0, `rgba(${piece.accent}, ${alpha * 0.9})`);
  body.addColorStop(0.46, `rgba(${piece.color}, ${alpha * 0.68})`);
  body.addColorStop(1, `rgba(120, 53, 15, ${alpha * 0.2})`);
  context.fillStyle = body;
  context.beginPath();
  context.ellipse(0, 0, width * 0.52, height * 0.52, 0, 0, Math.PI * 2);
  context.fill();

  context.lineWidth = Math.max(1, piece.size * 0.045);
  context.strokeStyle = `rgba(${piece.accent}, ${alpha * 0.45})`;
  context.beginPath();
  context.ellipse(0, 0, width * 0.34, height * 0.34, 0, 0, Math.PI * 2);
  context.stroke();

  context.restore();
}

function drawDice(
  context: CanvasRenderingContext2D,
  piece: AmbientPiece,
  x: number,
  y: number,
  time: number,
) {
  const angle = time * piece.spin * 0.35 + piece.phase;
  const side = piece.size;
  const depth = side * 0.16;
  const alpha = piece.alpha;

  context.save();
  context.translate(x, y);
  context.rotate(angle);
  context.shadowColor = `rgba(${piece.accent}, ${alpha * 0.75})`;
  context.shadowBlur = side * 0.45;

  roundedRect(context, -side * 0.5 + depth, -side * 0.5 + depth, side, side, side * 0.18);
  context.fillStyle = `rgba(15, 23, 42, ${alpha * 0.64})`;
  context.fill();

  roundedRect(context, -side * 0.5, -side * 0.5, side, side, side * 0.18);
  const face = context.createLinearGradient(-side * 0.5, -side * 0.5, side * 0.5, side * 0.5);
  face.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.9})`);
  face.addColorStop(0.55, `rgba(${piece.color}, ${alpha * 0.5})`);
  face.addColorStop(1, `rgba(30, 41, 59, ${alpha * 0.42})`);
  context.fillStyle = face;
  context.fill();

  context.strokeStyle = `rgba(${piece.accent}, ${alpha * 0.38})`;
  context.lineWidth = Math.max(1, side * 0.035);
  context.stroke();

  drawPips(context, side, piece.face, `rgba(15, 23, 42, ${alpha * 0.75})`);
  context.restore();
}

function drawPips(
  context: CanvasRenderingContext2D,
  side: number,
  face: number,
  color: string,
) {
  const offset = side * 0.22;
  const points: Record<number, Array<[number, number]>> = {
    1: [[0, 0]],
    2: [
      [-offset, -offset],
      [offset, offset],
    ],
    3: [
      [-offset, -offset],
      [0, 0],
      [offset, offset],
    ],
    4: [
      [-offset, -offset],
      [offset, -offset],
      [-offset, offset],
      [offset, offset],
    ],
    5: [
      [-offset, -offset],
      [offset, -offset],
      [0, 0],
      [-offset, offset],
      [offset, offset],
    ],
    6: [
      [-offset, -offset],
      [offset, -offset],
      [-offset, 0],
      [offset, 0],
      [-offset, offset],
      [offset, offset],
    ],
  };

  context.fillStyle = color;
  for (const [x, y] of points[face] ?? points[1]) {
    context.beginPath();
    context.arc(x, y, side * 0.055, 0, Math.PI * 2);
    context.fill();
  }
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
}

function drawGlow(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha: number,
) {
  context.globalCompositeOperation = "screen";
  const glow = context.createRadialGradient(x, y, 0, x, y, radius);
  glow.addColorStop(0, `rgba(${color}, ${alpha})`);
  glow.addColorStop(0.42, `rgba(${color}, ${alpha * 0.35})`);
  glow.addColorStop(1, `rgba(${color}, 0)`);
  context.fillStyle = glow;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
}

function makeSeed() {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] || Date.now();
  }
  return Date.now();
}

function mulberry32(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function wrap(value: number, min: number, max: number) {
  const range = max - min;
  return ((((value - min) % range) + range) % range) + min;
}

function lerp(min: number, max: number, progress: number) {
  return min + (max - min) * progress;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
