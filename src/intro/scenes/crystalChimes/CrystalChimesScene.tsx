import { useId, useRef } from 'react';
import { INTRO_CONFIG } from '../../config';
import { OrnamentArtSvg, getOrnamentLoopOffset } from './OrnamentArtSvg';
import {
  ARC_EDGE_Y,
  ARC_SAG,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  evaluateCatenaryY,
} from './pendulumPhysics';
import { useCrystalChimesEngine } from './useCrystalChimesEngine';

const CATENARY_BEAD_STOPS = [0.06, 0.23, 0.41, 0.59, 0.77, 0.94] as const;

/**
 * Scene 3 (`#scene-3`): Interactive crystal & pearl ornaments suspended on thin gold threads.
 * Driven by real damped pendulum physics with neighbor collisions, golden sparkle waves,
 * pentatonic chime audio, scroll inertia, tap/horizontal swipe (pan-y safe), and passive tilt.
 */
export function CrystalChimesScene() {
  const cfg = INTRO_CONFIG.step2Chimes;
  const uidPrefix = useId().replace(/:/g, '');

  const sectionRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const sparkleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const swingGroupRefs = useRef<Array<SVGGElement | null>>([]);
  const shimmerCircleRefs = useRef<Array<SVGCircleElement | null>>([]);

  const {
    interacted,
    handleStagePointerDown,
    handleStagePointerMove,
    handleStagePointerUp,
    handleStagePointerCancel,
    handleAccessibleRing,
  } = useCrystalChimesEngine({
    sectionRef,
    stageRef,
    sparkleCanvasRef,
    swingGroupRefs,
    shimmerCircleRefs,
    ornaments: cfg.ornaments,
    chimeCooldownMs: cfg.chimeCooldownMs,
  });

  // Quadratic control point matching `evaluateCatenaryY(u)` to exact floating-point precision
  const controlY = ARC_EDGE_Y + ARC_SAG * 2;
  const arcPathD = `M -8 ${ARC_EDGE_Y - 2} Q ${STAGE_WIDTH / 2} ${controlY} ${STAGE_WIDTH + 8} ${ARC_EDGE_Y - 2}`;
  const arcExactPathD = `M 0 ${ARC_EDGE_Y} Q ${STAGE_WIDTH / 2} ${controlY} ${STAGE_WIDTH} ${ARC_EDGE_Y}`;

  return (
    <section
      ref={sectionRef}
      id="scene-3"
      data-scene="3"
      className="relative z-[10] w-full overflow-x-clip"
      style={{
        background:
          'linear-gradient(180deg, #EAE5DC 0%, #EFECE5 18%, #ECF0F5 52%, #E3EAF1 82%, #DCE5EE 100%)',
      }}
    >
      {/* Subtle studio champagne & ice radial washes */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-16 left-1/2 h-[340px] w-[340px] -translate-x-1/2 rounded-full opacity-55"
        style={{
          background:
            'radial-gradient(circle, rgba(244,221,172,0.44) 0%, rgba(244,221,172,0) 70%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[290px] -right-24 h-[320px] w-[320px] rounded-full opacity-50"
        style={{
          background:
            'radial-gradient(circle, rgba(198,223,244,0.48) 0%, rgba(198,223,244,0) 70%)',
        }}
      />

      <div className="relative mx-auto w-full max-w-[440px] pt-20 pb-6">
        {/* Editorial Chapter II Header (matches Chapter I rhythm & typography) */}
        <header
          data-chimes-header
          className="relative z-[12] flex flex-col items-start px-5 pb-6"
        >
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/75 bg-white/55 px-3.5 py-1.5 text-[10px] font-semibold tracking-[0.2em] uppercase text-[#4B5E6F] backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-[#CFA968]" aria-hidden="true" />
            {cfg.eyebrow}
          </span>

          <h2 className="w-full overflow-visible">
            <span
              data-chimes-title="1"
              className="font-editorial block text-[46px] leading-[0.94] font-medium tracking-[-0.025em] text-[#182430] will-change-transform"
            >
              {cfg.headlineLine1}
            </span>
            <span
              data-chimes-title="2"
              className="font-editorial mt-1 block pl-8 text-[46px] leading-[0.96] font-medium italic tracking-[-0.02em] text-[#9E773B] will-change-transform"
            >
              {cfg.headlineLine2}
            </span>
          </h2>

          <p className="mt-4 max-w-[300px] text-balance text-[14px] leading-[1.6] font-normal text-[#3D4F5F]">
            {cfg.lead}
          </p>
        </header>

        {/* Interactive Garland Stage — touch-action: pan-y preserves vertical scroll */}
        <div
          ref={stageRef}
          data-interactive-surface="crystal-chimes"
          onPointerDown={handleStagePointerDown}
          onPointerMove={handleStagePointerMove}
          onPointerUp={handleStagePointerUp}
          onPointerCancel={handleStagePointerCancel}
          className="relative z-[14] mx-auto w-full aspect-[390/336] cursor-grab select-none overflow-visible active:cursor-grabbing"
          style={{ touchAction: 'pan-y' }}
        >
          <svg
            viewBox={`0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}`}
            className="pointer-events-none block h-full w-full overflow-visible"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={`${uidPrefix}-wire-grad`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#CFA968" stopOpacity="0.28" />
                <stop offset="16%" stopColor="#D7B06A" stopOpacity="0.95" />
                <stop offset="50%" stopColor="#F4DFB4" stopOpacity="1" />
                <stop offset="84%" stopColor="#CFA55B" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#CFA968" stopOpacity="0.28" />
              </linearGradient>
              <radialGradient id={`${uidPrefix}-shimmer-halo`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FFEAB8" stopOpacity="0.9" />
                <stop offset="55%" stopColor="#E6BE6F" stopOpacity="0.34" />
                <stop offset="100%" stopColor="#E6BE6F" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Delicate double golden catenary arc */}
            <path
              d={arcPathD}
              fill="none"
              stroke="rgba(255,248,228,0.62)"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <path
              d={arcExactPathD}
              fill="none"
              stroke={`url(#${uidPrefix}-wire-grad)`}
              strokeWidth="1.25"
              strokeLinecap="round"
            />

            {/* Tiny golden seed-beads along the catenary arc */}
            {CATENARY_BEAD_STOPS.map((u) => {
              const bx = u * STAGE_WIDTH;
              const by = evaluateCatenaryY(u);
              return (
                <circle
                  key={u}
                  cx={bx.toFixed(2)}
                  cy={by.toFixed(2)}
                  r="1.7"
                  fill="#E4BF75"
                  opacity="0.78"
                />
              );
            })}

            {/* Five hanging ornaments suspended on thin golden threads */}
            {cfg.ornaments.map((orn, index) => {
              const anchorX = orn.anchorXNorm * STAGE_WIDTH;
              const anchorY = evaluateCatenaryY(orn.anchorXNorm);
              const threadEndY = Math.max(16, orn.stringLength - getOrnamentLoopOffset(orn.kind));

              return (
                <g key={orn.id}>
                  {/* Attachment gold bead pinned directly on the catenary arc */}
                  <circle
                    cx={anchorX.toFixed(2)}
                    cy={anchorY.toFixed(2)}
                    r="2.9"
                    fill="#F2D79B"
                    stroke="#B6873D"
                    strokeWidth="0.75"
                  />

                  {/* Pure SVG user-space anchor at exact (anchorX, anchorY); immune to viewport scaling */}
                  <g transform={`translate(${anchorX.toFixed(2)} ${anchorY.toFixed(2)})`}>
                    {/* Swinging pendulum group rotating strictly around local origin (0, 0) */}
                    <g
                      ref={(el) => {
                        swingGroupRefs.current[index] = el;
                      }}
                      data-chime-ornament={orn.id}
                      style={{
                        transform: 'rotate(0deg)',
                        transformOrigin: '0px 0px',
                        transformBox: 'view-box',
                        willChange: 'transform',
                      }}
                    >
                      {/* Crisp golden hanging thread (solid metallic strokes avoid 0-width gradient bug) */}
                      <line
                        x1="0"
                        y1="2.4"
                        x2="0"
                        y2={threadEndY}
                        stroke="#C49A50"
                        strokeOpacity="0.92"
                        strokeWidth="1.25"
                        strokeLinecap="round"
                      />
                      <line
                        x1="-0.35"
                        y1="2.4"
                        x2="-0.35"
                        y2={threadEndY}
                        stroke="#FFF3D1"
                        strokeOpacity="0.58"
                        strokeWidth="0.55"
                        strokeLinecap="round"
                      />

                      {/* Ornament body centered at y = stringLength */}
                      <g transform={`translate(0 ${orn.stringLength})`}>
                        {/* Reactive golden shimmer aura modulated on tap / collision */}
                        <circle
                          ref={(el) => {
                            shimmerCircleRefs.current[index] = el;
                          }}
                          cx="0"
                          cy="0"
                          r={Math.max(orn.radiusX, orn.radiusY) + 16}
                          fill={`url(#${uidPrefix}-shimmer-halo)`}
                          style={{ opacity: 0 }}
                        />

                        <OrnamentArtSvg kind={orn.kind} uid={`${uidPrefix}-${index}`} />
                      </g>
                    </g>
                  </g>
                </g>
              );
            })}
          </svg>

          {/* Local DPR-capped canvas for golden sparkle bursts & collision waves */}
          <canvas
            ref={sparkleCanvasRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full"
          />

          {/* Keyboard-accessible triggers for each hanging ornament */}
          <div className="sr-only">
            {cfg.ornaments.map((orn, index) => (
              <button
                key={orn.id}
                type="button"
                onClick={() => handleAccessibleRing(index)}
              >
                {orn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Subtle tactile swipe cue pill below the garland */}
        <div className="mt-2 flex justify-center px-5">
          <div
            className={`inline-flex items-center gap-2.5 rounded-full border border-white/75 bg-white/50 px-4 py-2 text-[11px] font-medium tracking-[0.14em] uppercase text-[#4B5E6F] backdrop-blur-md transition-opacity duration-500 ${
              interacted ? 'opacity-65' : 'opacity-100'
            }`}
          >
            <span aria-hidden="true" className="text-[#B88B4A]">
              ←
            </span>
            <span>{cfg.swipeHint}</span>
            <span aria-hidden="true" className="text-[#B88B4A]">
              →
            </span>
          </div>
        </div>
      </div>

      {/* Neat minimal bottom placeholder for the next chapter */}
      <footer
        id="step-2-end"
        className="relative z-[10] mx-auto flex min-h-[38svh] w-full max-w-[440px] flex-col items-center justify-center px-6 pt-12 pb-safe text-center"
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
