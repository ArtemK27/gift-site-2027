import { useEffect, useRef, useState } from 'react';
import type { Step1CardConfig } from '../../config';
import { soundEngine } from '../../audio/soundEngine';

interface ParallaxMemoryCardProps {
  card: Step1CardConfig;
  align: 'left' | 'right' | 'center';
  tapHint: string;
  flipBackLabel: string;
  eagerImage?: boolean;
}

/**
 * Interactive frosted-glass editorial card with 3D flip reveal and musical chime.
 * Card 3 (`card.intrigue`) adds a subtle, fleeting micro-flicker on tap.
 */
export function ParallaxMemoryCard({
  card,
  align,
  tapHint,
  flipBackLabel,
  eagerImage = false,
}: ParallaxMemoryCardProps) {
  const [flipped, setFlipped] = useState(false);
  const [signalGlitchKey, setSignalGlitchKey] = useState(0);
  const [signalGlitching, setSignalGlitching] = useState(false);
  const delayTimerRef = useRef<number | null>(null);
  const endTimerRef = useRef<number | null>(null);

  const clearGlitchTimers = () => {
    if (delayTimerRef.current !== null) {
      window.clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    }
    if (endTimerRef.current !== null) {
      window.clearTimeout(endTimerRef.current);
      endTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearGlitchTimers();
    };
  }, []);

  const handleToggle = () => {
    soundEngine.unlock();
    soundEngine.playChime(card.chimePitch);

    const nextFlipped = !flipped;
    setFlipped(nextFlipped);
    clearGlitchTimers();
    setSignalGlitching(false);

    if (card.intrigue && nextFlipped) {
      const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (!reducedMotion) {
        // Trigger delicate SIGNAL // 31.12 micro-glitch only after the 620ms 3D flip settles
        delayTimerRef.current = window.setTimeout(() => {
          delayTimerRef.current = null;
          setSignalGlitchKey((k) => k + 1);
          setSignalGlitching(true);
          endTimerRef.current = window.setTimeout(() => {
            setSignalGlitching(false);
            endTimerRef.current = null;
          }, 580);
        }, 650);
      }
    }
  };

  const alignmentClass =
    align === 'left'
      ? 'mr-auto w-[79%] max-w-[296px]'
      : align === 'right'
        ? 'ml-auto w-[79%] max-w-[296px]'
        : 'mx-auto w-[85%] max-w-[318px]';

  return (
    <article
      data-parallax-card={card.id}
      className={`relative z-[20] ${alignmentClass} will-change-transform`}
    >
      <button
        type="button"
        onClick={handleToggle}
        aria-pressed={flipped}
        aria-label={`${card.frontTitle} — ${flipped ? flipBackLabel : tapHint}`}
        className="card-perspective group block w-full cursor-pointer rounded-[28px] text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B88B4A] active:scale-[0.985] transition-transform duration-150"
      >
        <div className={`card-flip-inner relative w-full ${flipped ? 'is-flipped' : ''}`}>
          {/* FRONT FACE */}
          <div
            className="card-face relative overflow-hidden rounded-[28px] border border-white/85 bg-white/62 p-3 backdrop-blur-xl"
            style={{
              boxShadow:
                'inset 0 1px 0 0 rgba(255,255,255,0.92), 0 22px 48px -20px rgba(27,44,62,0.22)',
            }}
          >
            {/* 4:5 Portrait Art Frame */}
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[20px] bg-[#DCE5EE]">
              <img
                src={card.image}
                alt={card.imageAlt}
                width={760}
                height={950}
                loading={eagerImage ? 'eager' : 'lazy'}
                decoding="async"
                draggable={false}
                className="h-full w-full object-cover select-none transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.02]"
              />

              {/* Subtle top vignette for crisp glass pills */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-20"
                style={{
                  background:
                    'linear-gradient(to bottom, rgba(24,36,48,0.24) 0%, rgba(24,36,48,0) 100%)',
                }}
              />

              {/* Top glass micro-chips */}
              <div className="pointer-events-none absolute inset-x-3 top-3 flex items-center justify-between">
                <span className="rounded-full border border-white/60 bg-white/72 px-2.5 py-1 font-terminal text-[10px] font-medium tracking-[0.14em] text-[#1D2D3B] backdrop-blur-md">
                  {card.indexLabel}
                </span>
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-white/65 bg-white/70 text-[#243647] backdrop-blur-md"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17 2l4 4-4 4" />
                    <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
                    <path d="M7 22l-4-4 4-4" />
                    <path d="M21 13v1a4 4 0 0 1-4 4H3" />
                  </svg>
                </span>
              </div>
            </div>

            {/* Editorial Caption Bar */}
            <div className="px-2 pt-3.5 pb-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-[#9A743B]">
                  {card.frontEyebrow}
                </span>
                <span className="text-[10px] font-medium tracking-[0.12em] uppercase text-[#536677]">
                  {tapHint}
                </span>
              </div>
              <h3 className="font-editorial mt-1 text-[27px] leading-[1.06] font-medium tracking-[-0.015em] text-[#182430]">
                {card.frontTitle}
              </h3>
              <p className="mt-1.5 text-balance text-[13px] leading-[1.48] text-[#425464]">
                {card.frontSubtitle}
              </p>
            </div>
          </div>

          {/* BACK FACE (3D Flip Personal Inscription) */}
          <div
            className="card-face card-face-back absolute inset-0 flex flex-col justify-between overflow-hidden rounded-[28px] border border-white/90 p-6 backdrop-blur-2xl"
            style={{
              background: card.intrigue
                ? 'linear-gradient(155deg, rgba(247,249,252,0.92) 0%, rgba(235,241,248,0.88) 48%, rgba(246,238,224,0.92) 100%)'
                : 'linear-gradient(155deg, rgba(252,253,255,0.92) 0%, rgba(241,246,251,0.88) 52%, rgba(248,241,229,0.92) 100%)',
              boxShadow:
                'inset 0 1px 0 0 rgba(255,255,255,0.96), 0 24px 52px -20px rgba(27,44,62,0.24)',
            }}
          >
            {/* Soft embossed 8-pointed star watermark */}
            <svg
              aria-hidden="true"
              viewBox="0 0 120 120"
              className="pointer-events-none absolute -right-8 -bottom-8 h-48 w-48 text-[#CFA968]/16"
              fill="currentColor"
            >
              <path d="M60 4 L68 48 L116 60 L68 72 L60 116 L52 72 L4 60 L52 48 Z" />
              <path
                d="M60 22 L66 54 L98 60 L66 66 L60 98 L54 66 L22 60 L54 54 Z"
                transform="rotate(45 60 60)"
                opacity="0.7"
              />
            </svg>

            {/* Top Chapter Header */}
            <div className="relative z-10 flex items-center justify-between">
              <span className="rounded-full border border-[#CFA968]/35 bg-white/75 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] uppercase text-[#8D6832]">
                {card.backEyebrow}
              </span>
              <span className="font-terminal text-[11px] font-medium tracking-[0.12em] text-[#607384]">
                {card.indexLabel} / 03
              </span>
            </div>

            {/* Hidden Personal Note */}
            <div className="relative z-10 my-auto py-5">
              <h3 className="font-editorial text-[32px] leading-[1.06] font-medium italic tracking-[-0.015em] text-[#182430]">
                {card.backTitle}
              </h3>
              <div
                aria-hidden="true"
                className="my-4 h-px w-12 bg-gradient-to-r from-[#CFA968]/80 to-transparent"
              />
              <p className="text-balance text-[15px] leading-[1.6] font-normal text-[#2D3E4E]">
                {card.backBody}
              </p>
            </div>

            {/* Bottom Return Cue + Card 3 Subtle Whisper */}
            <div className="relative z-10 flex items-center justify-between gap-3 pt-2">
              <span className="inline-flex shrink-0 items-center gap-1.5 text-[10px] font-medium tracking-[0.1em] uppercase text-[#566A7B]">
                <span aria-hidden="true">↺</span>
                {flipBackLabel}
              </span>
              {card.intrigue && card.intrigueWhisper ? (
                <span
                  key={signalGlitchKey}
                  data-signal-label
                  className="relative inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap font-terminal text-[9.5px] tracking-[0.12em] text-[#566E84]"
                >
                  <span aria-hidden="true" className="relative inline-flex h-1.5 w-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#CFA968]/80" />
                    {signalGlitching ? (
                      <span className="animate-signal-dot-cyan absolute inset-0 rounded-full bg-[#3E97CE]" />
                    ) : null}
                  </span>
                  <span className="relative inline-block">
                    <span
                      className={`inline-block transition-opacity duration-300 ${
                        signalGlitching ? 'animate-signal-glitch opacity-95' : 'opacity-70'
                      }`}
                    >
                      {card.intrigueWhisper}
                    </span>
                    {signalGlitching ? (
                      <>
                        <span
                          aria-hidden="true"
                          className="animate-signal-ghost-cyan pointer-events-none absolute inset-0 text-[#3B94CA]"
                        >
                          {card.intrigueWhisper}
                        </span>
                        <span
                          aria-hidden="true"
                          className="animate-signal-ghost-rose pointer-events-none absolute inset-0 text-[#C85A72]"
                        >
                          {card.intrigueWhisper}
                        </span>
                      </>
                    ) : null}
                  </span>
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </button>
    </article>
  );
}
