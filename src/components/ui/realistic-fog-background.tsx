"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFog } from "@/components/ui/fog-context";

/**
 * Realistic Fog / Mist Background
 * Technology: WebGL fragment shader (GLSL) — domain-warped fbm noise
 * Fixed full-screen, non-interactive layer meant to sit BEHIND app content.
 * Palette tuned to the project's cyan/slate cyberpunk theme (迷霧資本戰).
 *
 * Power-saving (tuned for tablets/phones):
 *  - Pauses entirely when the tab/page is hidden (Page Visibility API).
 *  - Renders at 0.5–0.65× internal resolution, then CSS-upscales (fog is blurry anyway).
 *  - Caps the animation at ~30fps.
 *  - Honors `prefers-reduced-motion`: draws a single static frame, no loop.
 *  - Uses fewer fbm octaves on mobile/coarse-pointer devices.
 *  - Can be frozen from the header (FogToggle): the fog stays on screen but
 *    stops animating, so after one final frame the WebGL loop idles and
 *    ongoing GPU usage drops to ~zero.
 */
export default function MistBackground({
  speed,
  angle,
}: {
  speed?: number;
  angle?: number;
} = {}) {
  const { enabled } = useFog();
  return <MistCanvas animate={enabled} speed={speed} angle={angle} />;
}

function MistCanvas({
  animate,
  speed = 1.0,
  angle = 0.0,
  className,
}: {
  animate: boolean;
  speed?: number;
  angle?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animateRef = useRef(animate);
  animateRef.current = animate;
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const angleRef = useRef(angle);
  angleRef.current = angle;
  const applyRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl");
    if (!gl) return;

    // ── Device-aware quality knobs ──────────────────────────────
    const isMobile = window.matchMedia("(max-width: 768px), (pointer: coarse)").matches;
    const renderScale = isMobile ? 0.7 : 0.75; // fog is blurry, higher res → less blocky
    const octaves = isMobile ? 5 : 6;           // 4 looked flat; 5 gives visible swirl
    const fpsCap = isMobile ? 30 : 30;          // slightly lower cap offsets the extra octave
    const frameInterval = 1000 / fpsCap;

    const reducedMotionMql = window.matchMedia("(prefers-reduced-motion: reduce)");

    const vsSource = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    // OCTAVES is injected as a constant — WebGL1 loop bounds must be constant.
    const fsSource = `
      precision highp float;
      uniform float u_time;
      uniform float u_speed;
      uniform float u_angle;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;

      const int OCTAVES = ${octaves};

      float hash(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
      }

      float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }

      float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < OCTAVES; i++) {
              v += a * noise(p);
              p *= 2.0;
              a *= 0.5;
          }
          return v;
      }

      void main() {
          float aspect = u_resolution.x / u_resolution.y;
          vec2 uv = gl_FragCoord.xy / u_resolution.xy;
          uv.x *= aspect;
          // Portrait zoom-out: prevents the narrow x-slice from showing large blobs
          // with hard visible edges. Scales both axes so feature density is consistent
          // across orientations (landscape = no change; portrait = uniform zoom-out).
          uv *= max(1.0, 1.0 / aspect);

          // Rotate UV for directional fog drift
          float ca = cos(u_angle); float sa = sin(u_angle);
          vec2 ruv = vec2(ca * uv.x - sa * uv.y, sa * uv.x + ca * uv.y);

          float t = u_speed * u_time;

          vec2 mPos = u_mouse / u_resolution.xy;
          mPos.x *= aspect;
          mPos *= max(1.0, 1.0 / aspect);
          float dist = distance(uv, mPos);

          vec2 q = vec2(0.0);
          q.x = fbm(ruv + 0.07 * t);
          q.y = fbm(ruv + vec2(1.0, 1.0));

          vec2 r = vec2(0.0);
          r.x = fbm(ruv + 1.0 * q + vec2(1.7, 9.2) + 0.15 * t);
          r.y = fbm(ruv + 1.0 * q + vec2(8.3, 2.8) + 0.126 * t);

          float f = fbm(ruv + r);
          // Remap away from extremes — prevents fbm "valleys" (f≈0) from rendering
          // as a hard dark band as features drift through over time.
          f = f * 0.65 + 0.2;

          // Deep slate base with cyan-tinted mist highlights (matches slate-950 + neon cyan)
          vec3 baseColor = vec3(0.01, 0.03, 0.09);
          vec3 mistColor = vec3(0.10, 0.16, 0.22);
          vec3 accentColor = vec3(0.13, 0.45, 0.55);

          vec3 color = mix(baseColor, mistColor, f);
          // Clamp accent so dot(q,r) going negative doesn't cause harsh colour jumps.
          color = mix(color, accentColor, clamp(dot(q, r) * 0.5, 0.0, 0.5));

          // Subtle cyan mouse glow
          float mouseGlow = smoothstep(0.35, 0.0, dist);
          color += mouseGlow * 0.05 * vec3(0.3, 0.8, 1.0);

          // Post-processing
          color = pow(color, vec3(1.1)) * 1.4;
          gl_FragColor = vec4(color, 1.0);
      }
    `;

    const compileShader = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };

    const program = gl.createProgram()!;
    gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vsSource));
    gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fsSource));
    gl.linkProgram(program);
    gl.useProgram(program);

    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const posAttrib = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(posAttrib);
    gl.vertexAttribPointer(posAttrib, 2, gl.FLOAT, false, 0, 0);

    const timeLoc  = gl.getUniformLocation(program, "u_time");
    const speedLoc = gl.getUniformLocation(program, "u_speed");
    const angleLoc = gl.getUniformLocation(program, "u_angle");
    const resLoc   = gl.getUniformLocation(program, "u_resolution");
    const mouseLoc = gl.getUniformLocation(program, "u_mouse");

    const mouse = { x: 0, y: 0 };
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX * renderScale;
      mouse.y = (window.innerHeight - e.clientY) * renderScale;
    };
    // Pointer glow is mouse-only; skip the listener on touch devices.
    if (!isMobile) window.addEventListener("mousemove", handleMouseMove);

    const resizeIfNeeded = () => {
      const w = Math.floor(window.innerWidth * renderScale);
      const h = Math.floor(window.innerHeight * renderScale);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    // Draw a single frame at the given time (seconds-domain handled by caller).
    const drawFrame = (timeMs: number) => {
      resizeIfNeeded();
      gl.uniform1f(timeLoc,  timeMs * 0.001);
      gl.uniform1f(speedLoc, speedRef.current);
      gl.uniform1f(angleLoc, angleRef.current);
      gl.uniform2f(resLoc,   canvas.width, canvas.height);
      gl.uniform2f(mouseLoc, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    let animationFrameId = 0;
    let running = false;
    let lastDraw = 0;

    const loop = (time: number) => {
      animationFrameId = requestAnimationFrame(loop);
      if (time - lastDraw < frameInterval) return; // 30fps cap
      lastDraw = time;
      drawFrame(time);
    };

    const startLoop = () => {
      if (running) return;
      running = true;
      lastDraw = 0;
      animationFrameId = requestAnimationFrame(loop);
    };

    const stopLoop = () => {
      running = false;
      cancelAnimationFrame(animationFrameId);
    };

    // ── Mode selection ──────────────────────────────────────────
    // Animate only if the toggle is on, motion isn't reduced, and we're
    // visible. Otherwise keep the fog on screen as a single frozen frame.
    const apply = () => {
      stopLoop();
      const shouldAnimate =
        animateRef.current && !reducedMotionMql.matches && !document.hidden;
      if (shouldAnimate) startLoop();
      else drawFrame(lastDraw); // freeze on the last rendered frame (no jump)
    };
    applyRef.current = apply;

    const handleResize = () => {
      // When frozen, keep the static frame crisp after a resize/rotate.
      if (!running) drawFrame(lastDraw);
    };

    document.addEventListener("visibilitychange", apply);
    window.addEventListener("resize", handleResize);
    reducedMotionMql.addEventListener("change", apply);

    apply();

    return () => {
      stopLoop();
      applyRef.current = null;
      if (!isMobile) window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("visibilitychange", apply);
      window.removeEventListener("resize", handleResize);
      reducedMotionMql.removeEventListener("change", apply);
    };
  }, []);

  // Re-evaluate animate vs. freeze when the header toggle flips.
  useEffect(() => {
    applyRef.current?.();
  }, [animate]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={className ?? "fixed inset-0 -z-10 h-full w-full pointer-events-none"}
      style={{ background: "#020617" }}
    />
  );
}

/**
 * Renders a second instance of the exact same WebGL fog at z-60 for page
 * transitions. Mounts on demand so GPU overhead only exists during the surge.
 */
export function MistSurgeOverlay({
  visible,
  direction = 1,
}: {
  visible: boolean;
  /** 1 = forward (swipe left), -1 = backward (swipe right) */
  direction?: number;
}) {
  // direction 1  → content moves left  → fog sweeps leftward  (angle = π)
  // direction -1 → content moves right → fog sweeps rightward (angle = 0)
  const angle = direction < 0 ? -2.5 : Math.PI/4;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[60] pointer-events-none overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.88 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
        >
          <MistCanvas
            animate
            speed={4}
            angle={angle}
            className="absolute inset-0 h-full w-full pointer-events-none"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
