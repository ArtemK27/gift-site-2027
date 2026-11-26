import { useEffect, useRef, type MutableRefObject } from 'react';
import { INTRO_CONFIG } from '../../config';
import { isLatestEntryIntersecting } from '../../lib/visibility';
import type { ScrollGuideState } from './CrystalGuide3D';

interface SnowFlake {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
  life: number;
  maxLife: number;
  phase: number;
  gold: boolean;
}

interface SideBranchAccentProps {
  scrollStateRef: MutableRefObject<ScrollGuideState>;
}

/**
 * Right-edge atmospheric snowy spruce branch accent (not full-screen).
 * Reacts to scroll velocity with spring-damped swaying and sheds soft snow specks.
 */
export function SideBranchAccent({ scrollStateRef }: SideBranchAccentProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const branchWrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const branchWrap = branchWrapRef.current;
    const canvas = canvasRef.current;
    if (!container || !branchWrap || !canvas) return;

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (reducedMotion) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 1;
    let height = 1;
    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const particles: SnowFlake[] = [];
    const maxParticles = 42;

    const spawnFlakes = (count: number, energy: number) => {
      for (let i = 0; i < count; i++) {
        if (particles.length >= maxParticles) break;
        // Emit along the snowy spruce needles near the right edge of the container
        const spawnX = width * (0.44 + Math.random() * 0.52);
        const spawnY = height * (0.28 + Math.random() * 0.22);
        particles.push({
          x: spawnX,
          y: spawnY,
          vx: -10 - Math.random() * 24 - energy * 8,
          vy: 26 + Math.random() * 42 + energy * 18,
          r: 1.0 + Math.random() * 2.1,
          alpha: 0.48 + Math.random() * 0.42,
          life: 0,
          maxLife: 1.15 + Math.random() * 1.15,
          phase: Math.random() * Math.PI * 2,
          gold: Math.random() < 0.22,
        });
      }
    };

    let visible = false;
    let rafId = 0;
    let lastTs = performance.now();
    let elapsed = 0;
    let angle = 0;
    let angularVel = 0;
    let spawnAccumulator = 0;

    const render = (now: number) => {
      rafId = 0;
      if (!visible || document.hidden) return;

      const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;
      elapsed += dt;

      const state = scrollStateRef.current;
      const scrollAgeSec = Math.max(0, (now - state.lastScrollTs) / 1000);
      const liveVel = state.velocity * Math.exp(-scrollAgeSec * 5.8);
      const absVel = Math.abs(liveVel);

      // Spring-damper branch sway driven by scroll velocity + gentle winter breeze
      const impulse = Math.max(-24, Math.min(24, liveVel * 0.016));
      const springForce = -22 * angle - 5.2 * angularVel + impulse;
      angularVel += springForce * dt;
      angle = Math.max(-7.5, Math.min(7.5, angle + angularVel * dt));

      const breeze = Math.sin(elapsed * 1.35) * 1.15;
      const totalRot = angle + breeze;
      const liftY = Math.sin(elapsed * 0.9) * 2.5 - Math.max(-10, Math.min(10, liveVel * 0.008));

      branchWrap.style.transform = `translate3d(0, ${liftY.toFixed(2)}px, 0) rotate(${totalRot.toFixed(2)}deg)`;

      // Shed powdery snow particles proportional to scroll movement
      if (absVel > 35) {
        const intensity = Math.min(1, absVel / 950);
        spawnAccumulator += dt * (6 + intensity * 26);
        const toSpawn = Math.floor(spawnAccumulator);
        if (toSpawn > 0) {
          spawnAccumulator -= toSpawn;
          spawnFlakes(Math.min(4, toSpawn), intensity);
        }
      } else if (particles.length < 3 && Math.random() < dt * 0.55) {
        // Occasional quiet stray snowflake drifting off the bough
        spawnFlakes(1, 0.05);
      }

      ctx.clearRect(0, 0, width, height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += dt;
        if (p.life >= p.maxLife || p.y > height + 8 || p.x < -8) {
          particles.splice(i, 1);
          continue;
        }
        p.phase += dt * 2.4;
        p.vx *= Math.exp(-dt * 1.15);
        p.vy += 18 * dt;
        p.x += (p.vx + Math.sin(p.phase) * 11) * dt;
        p.y += p.vy * dt;

        const progress = p.life / p.maxLife;
        const fadeIn = Math.min(1, progress * 6);
        const fadeOut = 1 - Math.pow(progress, 1.8);
        const alpha = p.alpha * fadeIn * fadeOut;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.gold
          ? `rgba(242, 211, 148, ${alpha.toFixed(3)})`
          : `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
        ctx.fill();
      }

      rafId = requestAnimationFrame(render);
    };

    const startLoop = () => {
      if (!rafId && visible && !document.hidden) {
        lastTs = performance.now();
        rafId = requestAnimationFrame(render);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        visible = isLatestEntryIntersecting(entries, false);
        if (visible) {
          startLoop();
        } else if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = 0;
        }
      },
      { rootMargin: '120px 0px 120px 0px' },
    );
    observer.observe(container);

    const handleVisibility = () => {
      if (document.hidden && rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      } else if (!document.hidden && visible) {
        startLoop();
      }
    };

    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      observer.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [scrollStateRef]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none absolute top-[248px] right-0 z-[15] h-[300px] w-full overflow-visible"
    >
      {/* Snow shedding particle canvas localized around & below the branch */}
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />

      {/* Atmospheric right-edge spruce branch */}
      <div
        ref={branchWrapRef}
        className="absolute top-0 -right-5 w-[68%] max-w-[266px] will-change-transform"
        style={{ transformOrigin: '96% 42%' }}
      >
        <img
          src={INTRO_CONFIG.assets.branchSide}
          alt=""
          width={960}
          height={640}
          loading="eager"
          decoding="async"
          draggable={false}
          className="block h-auto w-full select-none drop-shadow-[0_14px_22px_rgba(36,54,70,0.16)]"
        />
      </div>
    </div>
  );
}
