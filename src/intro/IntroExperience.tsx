import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { SceneId } from './sceneParams';
import { soundEngine } from './audio/soundEngine';
import { FrostWindowScene } from './scenes/frostWindow/FrostWindowScene';
import { WinterScrollScene } from './scenes/winterScroll/WinterScrollScene';
import { CrystalChimesScene } from './scenes/crystalChimes/CrystalChimesScene';
import { SoundToggle } from './components/SoundToggle';
import { SnowParticles } from './components/SnowParticles';
import { DebugSceneNav } from './components/DebugSceneNav';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

interface IntroExperienceProps {
  initialScene?: SceneId;
  debugMode?: boolean;
  onComplete: () => void;
}

/**
 * Isolated Stage 1 New Year Intro orchestrator.
 * Preserves Scene 1 (FrostWindowScene) and provides a clean Lenis + GSAP ScrollTrigger shell
 * ready for the next scroll sections.
 */
export function IntroExperience({
  initialScene = 1,
  debugMode = false,
  onComplete: _onComplete,
}: IntroExperienceProps) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const lenis = new Lenis({
      duration: reducedMotion ? 0.01 : 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: !reducedMotion,
      touchMultiplier: 1.15,
    });
    lenisRef.current = lenis;

    lenis.on('scroll', ScrollTrigger.update);

    const raf = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.wake();
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    if (initialScene > 1) {
      requestAnimationFrame(() => {
        ScrollTrigger.refresh();
        const targetEl = document.getElementById(`scene-${initialScene}`);
        if (targetEl) {
          const top = targetEl.getBoundingClientRect().top + window.scrollY;
          lenis.scrollTo(top, { immediate: true });
          window.scrollTo({ top, behavior: 'instant' as ScrollBehavior });
          ScrollTrigger.update();
        }
      });
    } else {
      window.scrollTo(0, 0);
    }

    return () => {
      gsap.ticker.remove(raf);
      gsap.ticker.wake();
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
      lenisRef.current = null;
      ScrollTrigger.getAll().forEach((st) => st.kill());
      soundEngine.dispose();
    };
  }, [initialScene]);

  return (
    <main className="relative w-full overflow-x-clip bg-[#C2CDCE]">
      {/* Global ambient snowfall overlay */}
      <SnowParticles />

      {/* Subtle Sound Mute/Unmute Pill */}
      <SoundToggle />

      {/* Optional Debug Scene Switcher (only shown when ?scene= or ?debug=1) */}
      <DebugSceneNav visible={debugMode} current={initialScene} />

      {/* Scene 1: Frosted Glass Window with WebGL Refraction (DO NOT BREAK) */}
      <FrostWindowScene startRevealed={initialScene > 1} />

      {/* Step 1: Continuous 3D Crystal Bauble, Side Branch & Frosted Glass Cards */}
      <WinterScrollScene />

      {/* Step 2: Interactive Crystal Ornaments on Gold Threads */}
      <CrystalChimesScene />
    </main>
  );
}
