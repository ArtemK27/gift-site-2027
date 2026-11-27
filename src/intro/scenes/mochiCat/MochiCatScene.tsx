import { useRef } from 'react';
import { INTRO_CONFIG } from '../../config';
import { useMochiCatEngine } from './useMochiCatEngine';

/**
 * Scene 4 (`#scene-4`): Tactile Soft-Body Jelly Mochi Cat.
 *
 * Self-contained chapter following the milky-blue, pearl & pastel-gold holiday aesthetic:
 * - Seamless gradient continuation from Scene 3 (`#DCE5EE`).
 * - Centered frosted glass podium (`min(82vw, 310px)`) with generous scroll margins all around.
 * - Airtight mobile scroll lock on the podium (`touch-action: none`, `data-lenis-prevent`,
 *   non-passive touch listeners, multi-touch pointer capture).
 * - Live deformation-driven reactions + secret Easter egg phrase after 6 squishes.
 * - Minimal bottom placeholder (`#step-3-end`) reserved for the upcoming finale chapter.
 */
export function MochiCatScene() {
  const cfg = INTRO_CONFIG.step3Mochi;
  const sectionRef = useRef<HTMLElement | null>(null);
  const podiumRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const {
    squishCount,
    emotion,
    hasInteracted,
    secretUnlocked,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleLostPointerCapture,
    handleAccessibleSquish,
  } = useMochiCatEngine({
    sectionRef,
    podiumRef,
    canvasRef,
    secretUnlockSquishes: cfg.secretUnlockSquishes,
  });

  // Derive live reaction caption cleanly without layout jumps
  let activeCaption: string;
  if (secretUnlocked) {
    activeCaption = cfg.secretCaption;
  } else if (emotion === 'surprised' && hasInteracted) {
    activeCaption = cfg.stretchReaction;
  } else if (squishCount === 0) {
    activeCaption = cfg.initialCaption;
  } else {
    const idx = Math.min(squishCount - 1, cfg.reactions.length - 1);
    activeCaption = cfg.reactions[idx];
  }

  const progressDots = Array.from({ length: cfg.secretUnlockSquishes }, (_, i) => i);

  return (
    <section
      ref={sectionRef}
      id="scene-4"
      data-scene="4"
      className="relative z-[10] w-full overflow-x-clip"
      style={{
        background:
          'linear-gradient(180deg, #DCE5EE 0%, #E5ECF3 22%, #EFF0EE 56%, #EAE5DC 84%, #DFDBD2 100%)',
      }}
    >
      {/* Subtle studio champagne & pearl-ice radial ambient washes */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-14 -left-24 h-[320px] w-[320px] rounded-full opacity-55"
        style={{
          background:
            'radial-gradient(circle, rgba(244,221,172,0.44) 0%, rgba(244,221,172,0) 70%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[320px] -right-24 h-[340px] w-[340px] rounded-full opacity-50"
        style={{
          background:
            'radial-gradient(circle, rgba(202,226,246,0.46) 0%, rgba(202,226,246,0) 70%)',
        }}
      />

      <div className="relative mx-auto w-full max-w-[440px] pt-20 pb-8">
        {/* Editorial Chapter III Header (matches Chapters I & II rhythm & typography) */}
        <header className="relative z-[12] flex flex-col items-start px-5 pb-8">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/75 bg-white/55 px-3.5 py-1.5 text-[10px] font-semibold tracking-[0.2em] uppercase text-[#4B5E6F] backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-[#CFA968]" aria-hidden="true" />
            {cfg.eyebrow}
          </span>

          <h2 className="w-full overflow-visible">
            <span className="font-editorial block text-[46px] leading-[0.94] font-medium tracking-[-0.025em] text-[#182430]">
              {cfg.headlineLine1}
            </span>
            <span className="font-editorial mt-1 block pl-8 text-[46px] leading-[0.96] font-medium italic tracking-[-0.02em] text-[#9E773B]">
              {cfg.headlineLine2}
            </span>
          </h2>

          <p className="mt-4 max-w-[308px] text-balance text-[14px] leading-[1.6] font-normal text-[#3D4F5F]">
            {cfg.lead}
          </p>
        </header>

        {/* Centered Frosted Glass Podium — generous side/top/bottom margins allow effortless page scrolling */}
        <div className="relative z-[14] flex flex-col items-center px-5">
          <div
            ref={podiumRef}
            data-interactive-surface="mochi-cat"
            data-lenis-prevent
            data-mochi-emotion={emotion}
            data-mochi-squishes={squishCount}
            data-mochi-secret={secretUnlocked ? '1' : '0'}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onLostPointerCapture={handleLostPointerCapture}
            className="relative h-[min(82vw,310px)] w-[min(82vw,310px)] cursor-grab select-none overflow-hidden rounded-[36px] border border-white/85 backdrop-blur-xl active:cursor-grabbing"
            style={{
              touchAction: 'none',
              background:
                'linear-gradient(165deg, rgba(208,223,238,0.48) 0%, rgba(224,234,244,0.52) 52%, rgba(235,227,213,0.46) 100%)',
              boxShadow:
                'inset 0 1px 0 0 rgba(255,255,255,0.95), inset 0 -18px 34px -22px rgba(122,146,170,0.34), 0 22px 48px -24px rgba(36,54,74,0.24)',
            }}
          >
            {/* Delicate studio pearl pedestal halo etched softly behind the mochi cat */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-4 rounded-[28px] border border-white/55"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-[54%] left-1/2 h-[196px] w-[196px] -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                background:
                  'radial-gradient(circle, rgba(255,251,242,0.72) 0%, rgba(242,226,192,0.22) 52%, rgba(255,255,255,0) 74%)',
              }}
            />

            {/* Tiny ornamental champagne corner glints */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-4 left-5 text-[9px] text-[#CFA968]/70"
            >
              ✦
            </span>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-4 right-5 text-[9px] text-[#CFA968]/70"
            >
              ✦
            </span>

            {/* Soft-body 2D Canvas */}
            <canvas
              ref={canvasRef}
              aria-hidden="true"
              className="pointer-events-none block h-full w-full"
            />

            {/* Accessible keyboard trigger */}
            <button
              type="button"
              onClick={handleAccessibleSquish}
              className="sr-only"
            >
              {cfg.accessibleSquishLabel}
            </button>
          </div>

          {/* Tactile multi-touch hint pill */}
          <div className="mt-5 flex justify-center">
            <div
              className={`inline-flex items-center gap-2 rounded-full border border-white/75 bg-white/50 px-4 py-1.5 text-[11px] font-medium tracking-[0.13em] uppercase text-[#4B5E6F] backdrop-blur-md transition-opacity duration-500 ${
                hasInteracted ? 'opacity-65' : 'opacity-100'
              }`}
            >
              <span aria-hidden="true" className="text-[#B88B4A]">
                ✦
              </span>
              <span>{cfg.touchHint}</span>
            </div>
          </div>

          {/* Live Reaction Caption & Secret Easter Egg Card (fixed min-height avoids CLS) */}
          <div
            data-mochi-caption
            aria-live="polite"
            className={`mt-4 flex min-h-[88px] w-full max-w-[310px] flex-col items-center justify-center rounded-2xl border px-4 py-3 text-center backdrop-blur-md transition-transform duration-300 ${
              secretUnlocked
                ? 'border-[#DFBE82]/85 bg-gradient-to-b from-white/78 to-[#F9F1DF]/78'
                : 'border-white/70 bg-white/46'
            }`}
            style={{
              boxShadow: secretUnlocked
                ? 'inset 0 1px 0 rgba(255,255,255,0.95), 0 12px 28px -18px rgba(178,136,68,0.34)'
                : 'inset 0 1px 0 rgba(255,255,255,0.85)',
            }}
          >
            {secretUnlocked ? (
              <span className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-[#CFA968]/18 px-2.5 py-0.5 text-[9px] font-semibold tracking-[0.18em] uppercase text-[#936B2F]">
                <span aria-hidden="true">✦</span>
                {cfg.secretBadge}
              </span>
            ) : null}

            <p
              className={`text-balance leading-[1.52] ${
                secretUnlocked
                  ? 'font-editorial text-[17px] font-medium italic text-[#2B343E]'
                  : 'text-[13px] font-normal text-[#3F5161]'
              }`}
            >
              {activeCaption}
            </p>

            {/* Subtle champagne-pearl squish progress beads */}
            <div
              aria-hidden="true"
              className="mt-2.5 flex items-center justify-center gap-1.5"
            >
              {progressDots.map((idx) => {
                const lit = idx < squishCount;
                return (
                  <span
                    key={idx}
                    className={`h-1.5 w-1.5 rounded-full transition-transform duration-300 ${
                      lit
                        ? 'scale-110 bg-[#CFA968]'
                        : 'scale-100 bg-[#9FB0C0]/45'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Neat minimal bottom placeholder reserved for the upcoming finale chapter */}
      <footer
        id="step-3-end"
        className="relative z-[10] mx-auto flex min-h-[36svh] w-full max-w-[440px] flex-col items-center justify-center px-6 pt-12 pb-safe text-center"
      >
        <div
          aria-hidden="true"
          className="mb-5 h-px w-16 bg-gradient-to-r from-transparent via-[#CFA968]/70 to-transparent"
        />
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="mb-3 h-5 w-5 text-[#B88B4A]/80"
          fill="currentColor"
        >
          <path d="M12 1.5 L13.8 9.2 L22.5 12 L13.8 14.8 L12 22.5 L10.2 14.8 L1.5 12 L10.2 9.2 Z" />
        </svg>
        <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-[#5A6C7C]">
          {cfg.nextPlaceholder.eyebrow}
        </p>
        <p className="mt-2 max-w-[260px] text-balance text-[13px] leading-relaxed text-[#6E7F8E]">
          {cfg.nextPlaceholder.caption}
        </p>
      </footer>
    </section>
  );
}
