import { useEffect, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { soundEngine } from '../../audio/soundEngine';
import { createGuideEnvironment, createGuideObjectModel } from './guideObjectModel';
import { computeVisibleHalfExtents, sampleStarPose } from './starChoreography';

export interface ScrollGuideState {
  progress: number;
  velocity: number;
  lastScrollTs: number;
  active: boolean;
}

interface CrystalGuide3DProps {
  scrollStateRef: MutableRefObject<ScrollGuideState>;
  wakeRef: MutableRefObject<(() => void) | null>;
}

const INTERACTIVE_SELECTOR =
  'button, a, input, textarea, select, [role="button"], [data-parallax-card], [data-interactive-surface], [data-scene="1"]';

/**
 * Persistent Three.js 3D guide conductor on a fixed pointer-events-none layer (z-[8]).
 * Sits above background echo words (z-[5]) and behind foreground text (z-[12]), branch (z-[15]),
 * and frosted glass cards (z-[20]) so it glides cleanly behind glass and emerges between cards.
 * Swapping the 3D asset only requires changing `guideObjectModel.ts`.
 */
export function CrystalGuide3D({ scrollStateRef, wakeRef }: CrystalGuide3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.98;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 30);
    camera.position.set(0, 0, 6.2);

    // Subtle multi-directional studio accents complementing PMREM RoomEnvironment
    const ambientLight = new THREE.AmbientLight('#C4D9EC', 0.36);
    const keyLight = new THREE.DirectionalLight('#FFE4AE', 1.75);
    keyLight.position.set(3.4, 4.4, 4.6);
    const rimLight = new THREE.DirectionalLight('#82B6E4', 1.55);
    rimLight.position.set(-3.8, 2.2, -2.0);
    const warmFill = new THREE.PointLight('#E5AF56', 1.35, 12);
    warmFill.position.set(0.5, -2.5, 3.2);
    scene.add(ambientLight, keyLight, rimLight, warmFill);

    const guideEnv = createGuideEnvironment(renderer);
    scene.environment = guideEnv.envMap;

    const guideModel = createGuideObjectModel(guideEnv.envMap);
    scene.add(guideModel.root);

    let viewportW = Math.max(1, window.innerWidth);
    let viewportH = Math.max(1, window.innerHeight);
    let visibleHalfW = 1;
    let visibleHalfH = 2;

    const handleResize = () => {
      viewportW = Math.max(1, window.innerWidth);
      viewportH = Math.max(1, window.innerHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setPixelRatio(dpr);
      renderer.setSize(viewportW, viewportH, false);
      camera.aspect = viewportW / viewportH;
      camera.updateProjectionMatrix();
      const extents = computeVisibleHalfExtents(camera);
      visibleHalfW = extents.halfW;
      visibleHalfH = extents.halfH;
    };
    handleResize();

    // Projected screen-space hit circle updated per frame with zero allocations
    const projCenter = new THREE.Vector3();
    const projEdge = new THREE.Vector3();
    const hitBounds = {
      x: 0,
      y: 0,
      radiusPx: 48,
      visible: false,
    };

    let smoothedProgress = scrollStateRef.current.progress;
    let smoothedVel = 0;
    let rafId = 0;
    let lastTs = performance.now();
    let elapsed = 0;
    let idleSleepFrames = 0;
    let disposed = false;

    const renderFrame = (now: number) => {
      if (disposed) return;
      rafId = 0;

      if (document.hidden) return;

      const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;
      elapsed += dt;

      const target = scrollStateRef.current;
      const damp = reducedMotion ? 1 : 1 - Math.exp(-dt * 9.5);
      smoothedProgress += (target.progress - smoothedProgress) * damp;

      const scrollAgeSec = Math.max(0, (now - target.lastScrollTs) / 1000);
      const decayedVel = target.velocity * Math.exp(-scrollAgeSec * 6.5);
      const velDamp = 1 - Math.exp(-dt * 8.0);
      smoothedVel += (decayedVel - smoothedVel) * velDamp;

      const pose = sampleStarPose(smoothedProgress);
      const settled = Math.abs(target.progress - smoothedProgress) < 0.0008;
      const pulsing = guideModel.isAnimatingPulse();

      if (pose.opacity <= 0.004 && settled && !target.active && !pulsing) {
        idleSleepFrames += 1;
        hitBounds.visible = false;
        if (idleSleepFrames === 1) {
          guideModel.root.visible = false;
          renderer.clear();
        }
        if (idleSleepFrames > 4) {
          return; // Sleep completely while user is in Scene 1 or past Step 1
        }
      } else {
        idleSleepFrames = 0;
        guideModel.root.visible = true;
      }

      const floatY = reducedMotion ? 0 : Math.sin(elapsed * 1.45) * 0.055;
      const floatX = reducedMotion ? 0 : Math.cos(elapsed * 0.95) * 0.025;
      const velTilt = reducedMotion ? 0 : Math.max(-0.24, Math.min(0.24, smoothedVel * 0.00026));

      const responsiveScale = Math.min(visibleHalfW * 0.78, 0.88) * pose.scale;
      const worldX = pose.xNorm * visibleHalfW + floatX;
      const worldY = pose.yNorm * visibleHalfH + floatY;

      guideModel.root.position.set(worldX, worldY, 0);
      guideModel.root.scale.setScalar(responsiveScale);
      guideModel.root.rotation.set(
        pose.rotX + velTilt,
        pose.rotY,
        pose.rotZ - velTilt * 0.45,
      );

      guideModel.update({
        dt,
        elapsed,
        scrollProgress: smoothedProgress,
        scrollVelocity: smoothedVel,
        masterOpacity: pose.opacity,
        reducedMotion,
      });

      // Keep projected screen hit circle in sync for non-blocking open-area taps
      projCenter.set(worldX, worldY, 0).project(camera);
      projEdge.set(worldX + guideModel.hitRadius * responsiveScale, worldY, 0).project(camera);
      hitBounds.x = (projCenter.x * 0.5 + 0.5) * viewportW;
      hitBounds.y = (-projCenter.y * 0.5 + 0.5) * viewportH;
      const edgeScreenX = (projEdge.x * 0.5 + 0.5) * viewportW;
      hitBounds.radiusPx = Math.max(46, Math.abs(edgeScreenX - hitBounds.x) * 1.15);
      hitBounds.visible = guideModel.root.visible && pose.opacity > 0.22;

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(renderFrame);
    };

    const wake = () => {
      if (disposed || document.hidden) return;
      idleSleepFrames = 0;
      if (!rafId) {
        lastTs = performance.now();
        rafId = requestAnimationFrame(renderFrame);
      }
    };

    wakeRef.current = wake;

    // Non-blocking tap detection on free viewport area (never blocks scroll or card taps)
    let downPointerId: number | null = null;
    let downX = 0;
    let downY = 0;
    let downTime = 0;

    const handlePointerDown = (e: PointerEvent) => {
      if (!hitBounds.visible || !e.isPrimary) return;
      const targetEl = e.target instanceof Element ? e.target : null;
      if (targetEl?.closest(INTERACTIVE_SELECTOR)) {
        downPointerId = null;
        return;
      }
      downPointerId = e.pointerId;
      downX = e.clientX;
      downY = e.clientY;
      downTime = performance.now();
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (downPointerId === null || e.pointerId !== downPointerId) return;
      downPointerId = null;

      if (!hitBounds.visible) return;
      const targetEl = e.target instanceof Element ? e.target : null;
      if (targetEl?.closest(INTERACTIVE_SELECTOR)) return;

      const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
      const elapsedMs = performance.now() - downTime;
      if (moved > 12 || elapsedMs > 450) return;

      const distToBall = Math.hypot(e.clientX - hitBounds.x, e.clientY - hitBounds.y);
      if (distToBall <= hitBounds.radiusPx) {
        const normalizedX = Math.max(0.1, Math.min(0.9, hitBounds.x / Math.max(1, viewportW)));
        soundEngine.unlock();
        soundEngine.playChime(normalizedX);
        guideModel.triggerPulse(1.0);
        wake();
      }
    };

    const handlePointerCancel = () => {
      downPointerId = null;
    };

    const handleVisibility = () => {
      if (document.hidden) {
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = 0;
        }
      } else {
        wake();
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    window.addEventListener('pointercancel', handlePointerCancel, { passive: true });
    document.addEventListener('visibilitychange', handleVisibility);
    wake();

    return () => {
      disposed = true;
      wakeRef.current = null;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
      document.removeEventListener('visibilitychange', handleVisibility);

      scene.environment = null;
      guideModel.dispose();
      guideEnv.dispose();
      renderer.dispose();
    };
  }, [scrollStateRef, wakeRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[8] h-full w-full"
    />
  );
}
