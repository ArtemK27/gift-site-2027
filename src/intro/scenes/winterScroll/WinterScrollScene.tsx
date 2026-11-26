import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { INTRO_CONFIG } from '../../config';
import { CrystalGuide3D, type ScrollGuideState } from './CrystalGuide3D';
import { SideBranchAccent } from './SideBranchAccent';
import { ParallaxMemoryCard } from './ParallaxMemoryCard';

/**
 * Step 1 continuous scroll experience directly below Scene 1.
 * Zero scroll-pinning: pure fluid Lenis + GSAP ScrollTrigger scrub choreography
 * pairing the fixed 3D crystal bauble, right-edge spruce branch, kinetic typography,
 * and three interactive frosted-glass parallax cards.
 */
export function WinterScrollScene() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const wakeStarRef = useRef<(() => void) | null>(null);

  const scrollStateRef = useRef<ScrollGuideState>({
    progress: 0,
    velocity: 0,
    lastScrollTs: 0,
    active: false,
  });

  const cfg = INTRO_CONFIG.step1Scroll;
  const cardAlignments: ReadonlyArray<'left' | 'right' | 'center'> = ['left', 'right', 'center'];

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    const ctx = gsap.context(() => {
      // Master scroll progress feed for 3D crystal ornament & right-edge branch sway
      ScrollTrigger.create({
        trigger: section,
        start: 'top 78%',
        end: 'bottom 55%',
        scrub: true,
        onEnter: () => {
          scrollStateRef.current.active = true;
          wakeStarRef.current?.();
        },
        onEnterBack: () => {
          scrollStateRef.current.active = true;
          wakeStarRef.current?.();
        },
        onLeave: () => {
          scrollStateRef.current.active = false;
        },
        onLeaveBack: () => {
          scrollStateRef.current.active = false;
        },
        onUpdate: (self) => {
          scrollStateRef.current.progress = self.progress;
          scrollStateRef.current.velocity = self.getVelocity();
          scrollStateRef.current.lastScrollTs = performance.now();
          scrollStateRef.current.active = self.isActive;
          wakeStarRef.current?.();
        },
      });

      if (reducedMotion) return;

      // Kinetic split-line opening headline (opposing horizontal scrub like ex1.mp4)
      gsap.fromTo(
        '[data-kinetic-line="1"]',
        { x: -24, opacity: 0.72 },
        {
          x: 18,
          opacity: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: '[data-kinetic-header]',
            start: 'top 90%',
            end: 'bottom 18%',
            scrub: 0.65,
          },
        },
      );

      gsap.fromTo(
        '[data-kinetic-line="2"]',
        { x: 26, opacity: 0.72 },
        {
          x: -16,
          opacity: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: '[data-kinetic-header]',
            start: 'top 90%',
            end: 'bottom 18%',
            scrub: 0.65,
          },
        },
      );

      // Architectural background echo words drifting gently horizontally
      const echoEls = gsap.utils.toArray<HTMLElement>('[data-echo-word]');
      echoEls.forEach((el, idx) => {
        const dir = idx % 2 === 0 ? 1 : -1;
        gsap.fromTo(
          el,
          { x: -34 * dir },
          {
            x: 34 * dir,
            ease: 'none',
            scrollTrigger: {
              trigger: el,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.8,
            },
          },
        );
      });

      // Staggered glass parallax cards: smooth entrance + subtle layered tilt
      const cardConfigs = [
        { selector: '[data-parallax-card="card-1"]', fromY: 54, toY: -22, fromRot: -2.2, toRot: 0.8 },
        { selector: '[data-parallax-card="card-2"]', fromY: 68, toY: -28, fromRot: 2.4, toRot: -0.9 },
        { selector: '[data-parallax-card="card-3"]', fromY: 58, toY: -18, fromRot: -1.1, toRot: 0.2 },
      ];

      cardConfigs.forEach(({ selector, fromY, toY, fromRot, toRot }) => {
        gsap.fromTo(
          selector,
          { y: fromY, rotate: fromRot, scale: 0.96 },
          {
            y: toY,
            rotate: toRot,
            scale: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: selector,
              start: 'top 96%',
              end: 'bottom 18%',
              scrub: 0.7,
            },
          },
        );
      });
    }, section);

    return () => {
      ctx.revert();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="scene-2"
      data-scene="2"
      className="relative w-full overflow-x-clip"
      style={{
        background:
          'linear-gradient(180deg, #C2CDCE 0%, #DCE6EE 14%, #EBF1F6 42%, #F4F3EE 74%, #F2ECE2 90%, #EAE5DC 100%)',
      }}
    >
      {/* Persistent Three.js faceted crystal ornament conductor (fixed z-[8] layer behind cards) */}
      <CrystalGuide3D scrollStateRef={scrollStateRef} wakeRef={wakeStarRef} />

      {/* Soft static ambient champagne & ice-blue radial washes */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[140px] -left-24 h-[340px] w-[340px] rounded-full opacity-55"
        style={{
          background:
            'radial-gradient(circle, rgba(244,223,180,0.48) 0%, rgba(244,223,180,0) 70%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[920px] -right-20 h-[360px] w-[360px] rounded-full opacity-55"
        style={{
          background:
            'radial-gradient(circle, rgba(203,225,244,0.52) 0%, rgba(203,225,244,0) 70%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[1540px] left-1/2 h-[380px] w-[380px] -translate-x-1/2 rounded-full opacity-50"
        style={{
          background:
            'radial-gradient(circle, rgba(244,222,177,0.42) 0%, rgba(244,222,177,0) 70%)',
        }}
      />

      {/* Active ~2.3-screen choreography track accompanied by the 3D crystal ornament */}
      <div className="relative mx-auto w-full max-w-[440px] px-5 pt-20 pb-24">
        {/* Right-edge atmospheric snowy spruce branch accent */}
        <SideBranchAccent scrollStateRef={scrollStateRef} />

        {/* Opening Kinetic Editorial Typography (z-[12] stays crisply above 3D ornament z-[8]) */}
        <header
          data-kinetic-header
          className="relative z-[12] flex flex-col items-start pt-4 pb-28"
        >
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/75 bg-white/55 px-3.5 py-1.5 text-[10px] font-semibold tracking-[0.2em] uppercase text-[#4B5E6F] backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-[#CFA968]" aria-hidden="true" />
            {cfg.eyebrow}
          </span>

          <h2 className="w-full overflow-visible">
            <span
              data-kinetic-line="1"
              className="font-editorial block text-[50px] leading-[0.94] font-medium tracking-[-0.025em] text-[#182430] will-change-transform"
            >
              {cfg.headlineLine1}
            </span>
            <span
              data-kinetic-line="2"
              className="font-editorial mt-1 block pl-6 text-[48px] leading-[0.96] font-medium italic tracking-[-0.02em] text-[#9E773B] will-change-transform"
            >
              {cfg.headlineLine2}
            </span>
          </h2>

          <p className="mt-6 max-w-[248px] text-[14px] leading-[1.6] font-normal text-[#3D4F5F]">
            {cfg.lead}
          </p>
        </header>

        {/* Staggered Parallax Glass Cards + Drifting Architectural Echo Words */}
        <div className="relative flex flex-col gap-16">
          {cfg.cards.map((card, index) => (
            <div key={card.id} className="relative">
              {/* Background kinetic echo typography */}
              <div
                aria-hidden="true"
                data-echo-word
                className={`pointer-events-none select-none font-editorial absolute -top-9 z-[5] whitespace-nowrap text-[68px] leading-none font-medium tracking-[0.06em] text-[#284056]/[0.09] will-change-transform ${
                  index % 2 === 0 ? '-left-3' : '-right-3'
                }`}
              >
                {cfg.echoWords[index] ?? ''}
              </div>

              <ParallaxMemoryCard
                card={card}
                align={cardAlignments[index] ?? 'center'}
                tapHint={cfg.tapHint}
                flipBackLabel={cfg.flipBackLabel}
                eagerImage={index === 0}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
