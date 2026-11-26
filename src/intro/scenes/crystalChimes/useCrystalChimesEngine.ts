import { useEffect, useRef, useState, type MutableRefObject, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { ChimeOrnamentConfig } from '../../config';
import { soundEngine } from '../../audio/soundEngine';
import { isLatestEntryIntersecting } from '../../lib/visibility';
import { ChimesSparkleSystem } from './chimesSparkles';
import {
  STAGE_HEIGHT,
  STAGE_WIDTH,
  applySwipeSegment,
  applyTapImpulse,
  createPendulumBodies,
  findHitOrnamentIndex,
  isSystemEnergetic,
  stepPendulumSystem,
  type PendulumBody,
} from './pendulumPhysics';

interface UseCrystalChimesEngineParams {
  sectionRef: RefObject<HTMLElement | null>;
  stageRef: RefObject<HTMLDivElement | null>;
  sparkleCanvasRef: RefObject<HTMLCanvasElement | null>;
  swingGroupRefs: MutableRefObject<Array<SVGGElement | null>>;
  shimmerCircleRefs: MutableRefObject<Array<SVGCircleElement | null>>;
  ornaments: ReadonlyArray<ChimeOrnamentConfig>;
  chimeCooldownMs: number;
}

/**
 * Encapsulates the pendulum simulation RAF loop, off-screen sleep, scroll velocity feed,
 * passive device tilt, golden sparkle canvas rendering, and tap / horizontal swipe gestures.
 */
export function useCrystalChimesEngine({
  sectionRef,
  stageRef,
  sparkleCanvasRef,
  swingGroupRefs,
  shimmerCircleRefs,
  ornaments,
  chimeCooldownMs,
}: UseCrystalChimesEngineParams) {
  const bodiesRef = useRef<PendulumBody[] | null>(null);
  if (!bodiesRef.current) {
    bodiesRef.current = createPendulumBodies(ornaments);
  }

  const sparklesRef = useRef<ChimesSparkleSystem | null>(null);
  if (!sparklesRef.current) {
    sparklesRef.current = new ChimesSparkleSystem();
  }

  const scrollVelRef = useRef(0);
  const lastScrollTsRef = useRef(0);
  const tiltRadRef = useRef(0);
  const wakeLoopRef = useRef<(() => void) | null>(null);
  const [interacted, setInteracted] = useState(false);

  const triggerChimeNote = (index: number) => {
    const ornament = ornaments[index];
    if (!ornament) return;
    soundEngine.unlock();
    soundEngine.playChime(ornament.chimePitch);
  };

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const canvas = sparkleCanvasRef.current;
    const bodies = bodiesRef.current;
    const sparkles = sparklesRef.current;
    if (!section || !stage || !canvas || !bodies || !sparkles) return;

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const ctx = canvas.getContext('2d');

    let canvasScaleX = 1;
    let canvasScaleY = 1;

    const resizeCanvas = () => {
      const rect = stage.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = Math.max(1, rect.width);
      const cssH = Math.max(1, rect.height);
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      canvasScaleX = (cssW / STAGE_WIDTH) * dpr;
      canvasScaleY = (cssH / STAGE_HEIGHT) * dpr;
      if (ctx) {
        ctx.setTransform(canvasScaleX, 0, 0, canvasScaleY, 0, 0);
      }
    };
    resizeCanvas();

    let visible = false;
    let enteredOnce = false;
    let rafId = 0;
    const mountTs = performance.now();
    let lastTs = mountTs;
    let elapsed = 0;
    let disposed = false;

    const applyDomTransforms = () => {
      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        const groupEl = swingGroupRefs.current[i];
        if (groupEl) {
          // Physics +angle swings bob right (+X), which is counter-clockwise (-deg) in SVG screen coords.
          // Parent <g transform="translate(anchorX anchorY)"> pins exact user-space pivot.
          const deg = -(b.angle * 180) / Math.PI;
          groupEl.style.transform = `rotate(${deg.toFixed(3)}deg)`;
        }
        const shimmerEl = shimmerCircleRefs.current[i];
        if (shimmerEl) {
          shimmerEl.style.opacity = (b.shimmer * 0.68).toFixed(3);
        }
      }
    };
    applyDomTransforms();

    const tick = (now: number) => {
      if (disposed) return;
      rafId = 0;
      if (!visible || document.hidden) return;

      const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;
      elapsed += dt;

      const scrollAgeSec = Math.max(0, (now - lastScrollTsRef.current) / 1000);
      const liveScrollVel = scrollVelRef.current * Math.exp(-scrollAgeSec * 5.6);

      const collisions = stepPendulumSystem(bodies, {
        dt,
        nowMs: now,
        scrollVelocity: liveScrollVel,
        tiltAngleRad: reducedMotion ? 0 : tiltRadRef.current,
        breezeTimeSec: elapsed,
        chimeCooldownMs,
        reducedMotion,
      });

      for (let i = 0; i < collisions.length; i++) {
        const ev = collisions[i];
        const intensity = Math.min(1.4, Math.max(0.45, ev.impactSpeed / 150));
        if (!reducedMotion) {
          sparkles.emitBurst(ev.contactX, ev.contactY, intensity, true);
        }
        for (let c = 0; c < ev.chimeIndices.length; c++) {
          triggerChimeNote(ev.chimeIndices[c]);
        }
      }

      applyDomTransforms();

      const hasSparkles = sparkles.hasActiveEffects();
      if (ctx) {
        if (hasSparkles) {
          ctx.setTransform(canvasScaleX, 0, 0, canvasScaleY, 0, 0);
          sparkles.updateAndDraw(ctx, dt, STAGE_WIDTH, STAGE_HEIGHT);
        } else {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }

      // Under reduced motion there is no ambient breeze — sleep completely once settled
      if (reducedMotion && !hasSparkles && !isSystemEnergetic(bodies)) {
        return;
      }

      rafId = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (disposed || !visible || document.hidden) return;
      if (!rafId) {
        lastTs = performance.now();
        rafId = requestAnimationFrame(tick);
      }
    };
    wakeLoopRef.current = wake;

    const gsapCtx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section,
        start: 'top bottom',
        end: 'bottom top',
        onEnter: () => {
          if (!enteredOnce && !reducedMotion) {
            enteredOnce = true;
            bodies.forEach((b, idx) => {
              b.angularVel += (idx % 2 === 0 ? 1 : -1) * (0.09 + idx * 0.015);
            });
          }
          wake();
        },
        onUpdate: (self) => {
          const now = performance.now();
          // Ignore instant programmatic scroll jumps right after mount (e.g. ?scene=3)
          if (now - mountTs < 360) return;
          const rawVel = self.getVelocity();
          if (!Number.isFinite(rawVel) || Math.abs(rawVel) > 6000) return;
          const clampedVel = Math.max(-1800, Math.min(1800, rawVel));
          scrollVelRef.current += (clampedVel - scrollVelRef.current) * 0.45;
          lastScrollTsRef.current = now;
          wake();
        },
      });

      if (!reducedMotion) {
        gsap.fromTo(
          '[data-chimes-title="1"]',
          { x: -18, opacity: 0.78 },
          {
            x: 10,
            opacity: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: '[data-chimes-header]',
              start: 'top 92%',
              end: 'bottom 25%',
              scrub: 0.65,
            },
          },
        );
        gsap.fromTo(
          '[data-chimes-title="2"]',
          { x: 20, opacity: 0.78 },
          {
            x: -10,
            opacity: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: '[data-chimes-header]',
              start: 'top 92%',
              end: 'bottom 25%',
              scrub: 0.65,
            },
          },
        );
      }
    }, section);

    const observer = new IntersectionObserver(
      (entries) => {
        visible = isLatestEntryIntersecting(entries, false);
        if (visible) {
          wake();
        } else if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = 0;
        }
      },
      { rootMargin: '140px 0px 140px 0px' },
    );
    observer.observe(section);

    // Passive, non-intrusive DeviceOrientation tilt (never calls requestPermission popups)
    const DevOrient = window.DeviceOrientationEvent as
      | (typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> })
      | undefined;
    const canListenTilt = Boolean(
      !reducedMotion && DevOrient && typeof DevOrient.requestPermission !== 'function',
    );

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (typeof e.gamma !== 'number' || !Number.isFinite(e.gamma)) return;
      const targetRad = Math.max(-0.26, Math.min(0.26, (e.gamma / 45) * 0.24));
      tiltRadRef.current += (targetRad - tiltRadRef.current) * 0.16;
    };

    if (canListenTilt) {
      window.addEventListener('deviceorientation', handleOrientation, { passive: true });
    }

    const handleVisibility = () => {
      if (document.hidden && rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      } else if (!document.hidden && visible) {
        wake();
      }
    };

    const handleWindowPointerEnd = (e: PointerEvent) => {
      if (gestureRef.current.pointerId === e.pointerId) {
        gestureRef.current.pointerId = null;
        gestureRef.current.swiped = false;
      }
    };

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('pointerup', handleWindowPointerEnd, { passive: true });
    window.addEventListener('pointercancel', handleWindowPointerEnd, { passive: true });
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      disposed = true;
      wakeLoopRef.current = null;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      observer.disconnect();
      gsapCtx.revert();
      if (canListenTilt) {
        window.removeEventListener('deviceorientation', handleOrientation);
      }
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('pointerup', handleWindowPointerEnd);
      window.removeEventListener('pointercancel', handleWindowPointerEnd);
      document.removeEventListener('visibilitychange', handleVisibility);
      sparkles.clear();
    };
  }, [chimeCooldownMs, ornaments, sectionRef, shimmerCircleRefs, sparkleCanvasRef, stageRef, swingGroupRefs]);

  const gestureRef = useRef<{
    pointerId: number | null;
    startClientX: number;
    startClientY: number;
    startStageX: number;
    startStageY: number;
    prevStageX: number;
    prevStageY: number;
    prevTimeMs: number;
    swiped: boolean;
  }>({
    pointerId: null,
    startClientX: 0,
    startClientY: 0,
    startStageX: 0,
    startStageY: 0,
    prevStageX: 0,
    prevStageY: 0,
    prevTimeMs: 0,
    swiped: false,
  });

  const clientToStage = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const stage = stageRef.current;
    if (!stage) return null;
    const rect = stage.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
      x: ((clientX - rect.left) / rect.width) * STAGE_WIDTH,
      y: ((clientY - rect.top) / rect.height) * STAGE_HEIGHT,
    };
  };

  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary) return;
    const pt = clientToStage(e.clientX, e.clientY);
    if (!pt) return;
    soundEngine.unlock();
    gestureRef.current = {
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startStageX: pt.x,
      startStageY: pt.y,
      prevStageX: pt.x,
      prevStageY: pt.y,
      prevTimeMs: performance.now(),
      swiped: false,
    };
  };

  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    if (g.pointerId !== e.pointerId) return;

    // Guard against stale mouse drags if button was released outside window/iframe
    if (e.pointerType === 'mouse' && (e.buttons & 1) === 0) {
      g.pointerId = null;
      g.swiped = false;
      return;
    }

    const pt = clientToStage(e.clientX, e.clientY);
    const bodies = bodiesRef.current;
    const sparkles = sparklesRef.current;
    if (!pt || !bodies || !sparkles) return;

    const totalDx = e.clientX - g.startClientX;
    const totalDy = e.clientY - g.startClientY;

    let segStartX = g.prevStageX;
    let segStartY = g.prevStageY;

    if (!g.swiped && Math.abs(totalDx) > 8 && Math.abs(totalDx) >= Math.abs(totalDy) * 0.85) {
      g.swiped = true;
      // Sweep from exact initial touch point so ornaments at swipe origin are never skipped
      segStartX = g.startStageX;
      segStartY = g.startStageY;
      // Capture pointer only AFTER horizontal intent is confirmed so pan-y vertical scroll is never blocked
      try {
        e.currentTarget.setPointerCapture?.(e.pointerId);
      } catch {
        // ignore synthetic or already-released pointer IDs
      }
    }

    const nowMs = performance.now();
    const dtSec = Math.max(0.008, (nowMs - g.prevTimeMs) / 1000);

    if (g.swiped) {
      const vxStage = (pt.x - segStartX) / dtSec;
      const hits = applySwipeSegment(
        bodies,
        segStartX,
        segStartY,
        pt.x,
        pt.y,
        vxStage,
        nowMs,
        chimeCooldownMs,
      );

      if (hits.length > 0) {
        setInteracted(true);
        const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        for (let i = 0; i < hits.length; i++) {
          const hit = hits[i];
          if (!reducedMotion) {
            sparkles.emitBurst(hit.contactX, hit.contactY, 0.95, false);
          }
          if (hit.shouldChime) {
            triggerChimeNote(hit.index);
          }
        }
        wakeLoopRef.current?.();
      }
    }

    g.prevStageX = pt.x;
    g.prevStageY = pt.y;
    g.prevTimeMs = nowMs;
  };

  const handleStagePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    if (g.pointerId !== e.pointerId) return;
    const wasSwiped = g.swiped;
    g.pointerId = null;
    g.swiped = false;

    if (wasSwiped) return;

    const moved = Math.hypot(e.clientX - g.startClientX, e.clientY - g.startClientY);
    if (moved > 14) return;

    const pt = clientToStage(e.clientX, e.clientY);
    const bodies = bodiesRef.current;
    const sparkles = sparklesRef.current;
    if (!pt || !bodies || !sparkles) return;

    const hitIndex = findHitOrnamentIndex(bodies, pt.x, pt.y, 20);
    if (hitIndex === -1) return;

    const body = bodies[hitIndex];
    const bobX = body.spec.anchorX + body.spec.length * Math.sin(body.angle);
    const dirSign = pt.x <= bobX ? 1 : -1;
    const res = applyTapImpulse(bodies, hitIndex, dirSign, performance.now(), 3.05, chimeCooldownMs);
    if (!res) return;

    setInteracted(true);
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!reducedMotion) {
      sparkles.emitBurst(res.contactX, res.contactY, 1.05, false);
    }
    if (res.shouldChime) {
      triggerChimeNote(hitIndex);
    }
    wakeLoopRef.current?.();
  };

  const handleStagePointerCancel = () => {
    gestureRef.current.pointerId = null;
    gestureRef.current.swiped = false;
  };

  const handleAccessibleRing = (index: number) => {
    const bodies = bodiesRef.current;
    const sparkles = sparklesRef.current;
    if (!bodies || !sparkles) return;
    const res = applyTapImpulse(
      bodies,
      index,
      index % 2 === 0 ? 1 : -1,
      performance.now(),
      3.0,
      chimeCooldownMs,
    );
    if (!res) return;
    setInteracted(true);
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!reducedMotion) {
      sparkles.emitBurst(res.contactX, res.contactY, 1.0, false);
    }
    if (res.shouldChime) {
      triggerChimeNote(index);
    }
    wakeLoopRef.current?.();
  };

  return {
    interacted,
    handleStagePointerDown,
    handleStagePointerMove,
    handleStagePointerUp,
    handleStagePointerCancel,
    handleAccessibleRing,
  };
}
