import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { soundEngine } from '../../audio/soundEngine';
import { isLatestEntryIntersecting } from '../../lib/visibility';
import { MochiParticleSystem } from './mochiParticles';
import {
  MOCHI_REST_CENTER_X,
  MOCHI_REST_CENTER_Y,
  MOCHI_STAGE_SIZE,
  createMochiSoftBody,
  moveMochiPointer,
  releaseMochiPointer,
  startMochiPointer,
  stepMochiSoftBody,
  triggerAccessibleSquish,
  type MochiEmotion,
  type MochiSoftBodyState,
} from './mochiPhysics';
import { renderMochiCat } from './mochiRenderer';

interface UseMochiCatEngineOptions {
  sectionRef: RefObject<HTMLElement | null>;
  podiumRef: RefObject<HTMLDivElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  secretUnlockSquishes: number;
}

export interface UseMochiCatEngineResult {
  squishCount: number;
  emotion: MochiEmotion;
  hasInteracted: boolean;
  secretUnlocked: boolean;
  handlePointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  handlePointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  handlePointerUp: (e: ReactPointerEvent<HTMLDivElement>) => void;
  handlePointerCancel: (e: ReactPointerEvent<HTMLDivElement>) => void;
  handleLostPointerCapture: (e: ReactPointerEvent<HTMLDivElement>) => void;
  handleAccessibleSquish: () => void;
}

function triggerHaptic(ms = 12): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(ms);
    } catch {
      // Ignore platforms where vibrate is disallowed
    }
  }
}

/**
 * Manages the 2D soft-body RAF loop (strictly paused offscreen via IntersectionObserver),
 * DPR-scaled canvas sizing, bulletproof multi-touch pointer capture & scroll locking,
 * velvety squish sound + haptics, and low-frequency React UI state updates.
 */
export function useMochiCatEngine({
  sectionRef,
  podiumRef,
  canvasRef,
  secretUnlockSquishes,
}: UseMochiCatEngineOptions): UseMochiCatEngineResult {
  const [squishCount, setSquishCount] = useState(0);
  const [emotion, setEmotion] = useState<MochiEmotion>('idle');

  const bodyRef = useRef<MochiSoftBodyState | null>(null);
  const particlesRef = useRef<MochiParticleSystem | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const reducedMotionRef = useRef(false);
  const isVisibleRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);
  const lastFrameMsRef = useRef<number>(0);
  const lastEmotionRef = useRef<MochiEmotion>('idle');
  const squishCountRef = useRef(0);
  const lastSquishRegisterMsRef = useRef(0);

  if (!bodyRef.current) {
    bodyRef.current = createMochiSoftBody();
  }
  if (!particlesRef.current) {
    particlesRef.current = new MochiParticleSystem();
  }

  const syncCanvasDpr = useCallback(() => {
    const canvas = canvasRef.current;
    const podium = podiumRef.current;
    if (!canvas || !podium) return;

    const rect = podium.getBoundingClientRect();
    const cssSize = Math.max(180, Math.round(rect.width || MOCHI_STAGE_SIZE));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const backing = Math.round(cssSize * dpr);

    if (canvas.width !== backing || canvas.height !== backing) {
      canvas.width = backing;
      canvas.height = backing;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctxRef.current = ctx;

    const scale = backing / MOCHI_STAGE_SIZE;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    if (bodyRef.current && particlesRef.current) {
      renderMochiCat(ctx, bodyRef.current, particlesRef.current);
    }
  }, [canvasRef, podiumRef]);

  const registerSquish = useCallback(
    (originX: number, originY: number) => {
      const now = performance.now();
      if (now - lastSquishRegisterMsRef.current < 260) return;
      lastSquishRegisterMsRef.current = now;

      const nextCount = squishCountRef.current + 1;
      squishCountRef.current = nextCount;
      setSquishCount(nextCount);

      if (nextCount === secretUnlockSquishes) {
        particlesRef.current?.emitBurst(
          originX,
          originY - 12,
          1,
          reducedMotionRef.current,
          true,
        );
        soundEngine.playChime(0.76);
        triggerHaptic(18);
      }
    },
    [secretUnlockSquishes],
  );

  // Convert client coordinates into logical [0..MOCHI_STAGE_SIZE] canvas space
  const clientToStage = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const el = podiumRef.current;
      if (!el) return { x: MOCHI_REST_CENTER_X, y: MOCHI_REST_CENTER_Y };
      const rect = el.getBoundingClientRect();
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      return {
        x: ((clientX - rect.left) / w) * MOCHI_STAGE_SIZE,
        y: ((clientY - rect.top) / h) * MOCHI_STAGE_SIZE,
      };
    },
    [podiumRef],
  );

  // Non-passive touchstart/touchmove prevention directly on the glass podium so mobile browsers
  // and Lenis NEVER scroll the page by even 1px while touching or dragging the mochi cat.
  useEffect(() => {
    const podium = podiumRef.current;
    if (!podium) return;

    const blockScroll = (e: TouchEvent) => {
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    podium.addEventListener('touchstart', blockScroll, { passive: false });
    podium.addEventListener('touchmove', blockScroll, { passive: false });

    return () => {
      podium.removeEventListener('touchstart', blockScroll);
      podium.removeEventListener('touchmove', blockScroll);
    };
  }, [podiumRef]);

  // Main lifecycle: DPR sync, reduced-motion listener, IntersectionObserver RAF gating, cleanup
  useEffect(() => {
    const section = sectionRef.current;
    const podium = podiumRef.current;
    if (!section || !podium) return;

    const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    reducedMotionRef.current = Boolean(motionQuery?.matches);
    const onMotionChange = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
    };
    motionQuery?.addEventListener?.('change', onMotionChange);

    syncCanvasDpr();

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            syncCanvasDpr();
          })
        : null;
    resizeObserver?.observe(podium);

    const stopLoop = () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };

    const tick = (nowMs: number) => {
      if (!isVisibleRef.current || document.hidden) {
        rafIdRef.current = null;
        return;
      }

      const dt =
        lastFrameMsRef.current > 0 ? Math.min(0.033, Math.max(0.004, (nowMs - lastFrameMsRef.current) / 1000)) : 1 / 60;
      lastFrameMsRef.current = nowMs;

      const body = bodyRef.current;
      const particles = particlesRef.current;
      const ctx = ctxRef.current;

      if (body && particles && ctx) {
        const metrics = stepMochiSoftBody(body, dt, reducedMotionRef.current);
        particles.step(dt);
        renderMochiCat(ctx, body, particles);

        if (metrics.emotion !== lastEmotionRef.current) {
          lastEmotionRef.current = metrics.emotion;
          setEmotion(metrics.emotion);
        }
      }

      rafIdRef.current = requestAnimationFrame(tick);
    };

    const startLoop = () => {
      if (rafIdRef.current !== null || !isVisibleRef.current || document.hidden) return;
      lastFrameMsRef.current = 0;
      rafIdRef.current = requestAnimationFrame(tick);
    };

    const intersectionObserver =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            (entries) => {
              const visible = isLatestEntryIntersecting(entries, false);
              isVisibleRef.current = visible;
              if (visible) {
                syncCanvasDpr();
                startLoop();
              } else {
                stopLoop();
                // Release any lingering drags if scrolled far away
                bodyRef.current?.anchors.clear();
              }
            },
            { rootMargin: '120px 0px' },
          )
        : null;

    if (intersectionObserver) {
      intersectionObserver.observe(section);
    } else {
      isVisibleRef.current = true;
      startLoop();
    }

    const onVisibilityChange = () => {
      if (document.hidden) {
        stopLoop();
        bodyRef.current?.anchors.clear();
      } else if (isVisibleRef.current) {
        startLoop();
      }
    };

    const onWindowBlur = () => {
      bodyRef.current?.anchors.clear();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onWindowBlur);

    return () => {
      stopLoop();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      motionQuery?.removeEventListener?.('change', onMotionChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onWindowBlur);
      bodyRef.current?.anchors.clear();
      particlesRef.current?.clear();
    };
  }, [podiumRef, sectionRef, syncCanvasDpr]);

  const releasePointerById = useCallback(
    (pointerId: number, el: HTMLDivElement) => {
      const body = bodyRef.current;
      if (!body) return;

      try {
        if (el.hasPointerCapture?.(pointerId)) {
          el.releasePointerCapture(pointerId);
        }
      } catch {
        // Ignore synthetic pointer release errors
      }

      const result = releaseMochiPointer(body, pointerId);
      if (result.released && result.bounced) {
        particlesRef.current?.emitBurst(
          result.originX,
          result.originY - 10,
          result.intensity,
          reducedMotionRef.current,
          false,
        );
        soundEngine.playMochiSquish(Math.min(1, result.intensity * 0.85));
        if (result.intensity > 0.55) {
          triggerHaptic(10);
        }
      }
    },
    [],
  );

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();

      const body = bodyRef.current;
      if (!body) return;

      soundEngine.unlock();

      const { x, y } = clientToStage(e.clientX, e.clientY);
      const prevCount = body.anchors.size;
      const start = startMochiPointer(body, e.pointerId, x, y);

      if (start.hit) {
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // Synthetic events in tests may skip native capture
        }

        soundEngine.playMochiSquish(start.intensity);
        triggerHaptic(12);

        if (prevCount === 0) {
          registerSquish(start.x, start.y);
        }

        // Small celebratory micro-glint even on crisp tap
        particlesRef.current?.emitBurst(
          start.x,
          start.y - 16,
          0.32,
          reducedMotionRef.current,
          false,
        );
      }
    },
    [clientToStage, registerSquish],
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const body = bodyRef.current;
      if (!body || !body.anchors.has(e.pointerId)) return;
      e.preventDefault();

      const { x, y } = clientToStage(e.clientX, e.clientY);
      moveMochiPointer(body, e.pointerId, x, y);
    },
    [clientToStage],
  );

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      releasePointerById(e.pointerId, e.currentTarget);
    },
    [releasePointerById],
  );

  const handlePointerCancel = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      releasePointerById(e.pointerId, e.currentTarget);
    },
    [releasePointerById],
  );

  const handleLostPointerCapture = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      releasePointerById(e.pointerId, e.currentTarget);
    },
    [releasePointerById],
  );

  const handleAccessibleSquish = useCallback(() => {
    const body = bodyRef.current;
    if (!body) return;
    soundEngine.unlock();
    const res = triggerAccessibleSquish(body);
    soundEngine.playMochiSquish(res.intensity);
    triggerHaptic(12);
    particlesRef.current?.emitBurst(
      res.originX,
      res.originY,
      res.intensity,
      reducedMotionRef.current,
      false,
    );
    registerSquish(res.originX, res.originY);
  }, [registerSquish]);

  return {
    squishCount,
    emotion,
    hasInteracted: squishCount > 0,
    secretUnlocked: squishCount >= secretUnlockSquishes,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleLostPointerCapture,
    handleAccessibleSquish,
  };
}
