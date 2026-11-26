import { useEffect, useRef } from 'react';

interface Flake {
  x: number;
  y: number;
  r: number;
  vy: number;
  vx: number;
  phase: number;
  alpha: number;
  gold: boolean;
}

interface SnowParticlesProps {
  paused?: boolean;
}

/**
 * Lightweight ambient winter snowfall & gold micro-glints overlay.
 * Pointer-events-none, DPR-capped, respects prefers-reduced-motion.
 */
export function SnowParticles({ paused = false }: SnowParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (paused) return;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let rafId = 0;
    let lastTs = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const count = 30;
    const flakes: Flake[] = Array.from({ length: count }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 1.1 + Math.random() * 2.1,
      vy: 14 + Math.random() * 24,
      vx: (Math.random() - 0.5) * 9,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.22 + Math.random() * 0.42,
      gold: i % 5 === 0,
    }));

    const render = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;

      ctx.clearRect(0, 0, width, height);

      for (const f of flakes) {
        f.phase += dt * 1.1;
        f.y += f.vy * dt;
        f.x += (f.vx + Math.sin(f.phase) * 8) * dt;

        if (f.y > height + 8) {
          f.y = -8;
          f.x = Math.random() * width;
        }
        if (f.x < -8) f.x = width + 8;
        if (f.x > width + 8) f.x = -8;

        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = f.gold
          ? `rgba(244, 214, 152, ${(f.alpha * 0.85).toFixed(3)})`
          : `rgba(255, 255, 255, ${f.alpha.toFixed(3)})`;
        ctx.fill();
      }

      rafId = requestAnimationFrame(render);
    };

    window.addEventListener('resize', resize);
    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [paused]);

  if (paused) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-30 h-full w-full"
      aria-hidden="true"
    />
  );
}
