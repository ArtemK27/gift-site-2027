import { useEffect, useRef, useState } from 'react';
import { INTRO_CONFIG } from '../../config';
import { soundEngine } from '../../audio/soundEngine';
import { FrostController } from './frostController';

interface FrostWindowSceneProps {
  startRevealed?: boolean;
  paused?: boolean;
  onStartPreload?: () => void;
  onRevealed?: () => void;
  onVisibilityChange?: (visible: boolean) => void;
}

export function FrostWindowScene({
  startRevealed = false,
  paused = false,
  onStartPreload,
  onRevealed,
  onVisibilityChange,
}: FrostWindowSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const controllerRef = useRef<FrostController | null>(null);
  const pointerDownRef = useRef(false);
  const preloadFiredRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const onVisibilityRef = useRef(onVisibilityChange);
  onVisibilityRef.current = onVisibilityChange;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const [progress, setProgress] = useState(startRevealed ? 1 : 0);
  const [revealed, setRevealed] = useState(startRevealed);

  const cfg = INTRO_CONFIG.scene1Frost;

  useEffect(() => {
    controllerRef.current?.setPaused(paused);
  }, [paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const fallbackUrl = INTRO_CONFIG.assets.windowBgFallback;

    const controller = new FrostController({
      canvas,
      fallbackImageUrl: fallbackUrl,
      brushRadiusPx: cfg.brushRadiusPx,
      clearThreshold: cfg.clearThreshold,
      autoMeltDurationMs: cfg.autoMeltDurationMs,
      onProgress: (ratio) => {
        setProgress(Math.min(1, ratio / cfg.clearThreshold));
      },
      onThresholdReached: () => {
        soundEngine.playFrostReveal();
        setRevealed(true);
        onRevealed?.();
      },
      onFullyRevealed: () => {
        setRevealed(true);
        onRevealed?.();
      },
      onVisibilityChange: (visible) => {
        onVisibilityRef.current?.(visible);
      },
    });

    controllerRef.current = controller;
    controller.setPaused(pausedRef.current);
    if (startRevealed) {
      controller.triggerAutoMelt(true);
    }

    controller.setBackground(fallbackUrl);

    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
  }, [cfg.autoMeltDurationMs, cfg.brushRadiusPx, cfg.clearThreshold, onRevealed, startRevealed]);

  const triggerPreload = () => {
    if (!preloadFiredRef.current) {
      preloadFiredRef.current = true;
      onStartPreload?.();
    }
  };

  const handlePointer = (e: React.PointerEvent<HTMLElement>, isMove: boolean) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const normX = (e.clientX - rect.left) / Math.max(rect.width, 1);
    const normY = (e.clientY - rect.top) / Math.max(rect.height, 1);

    controllerRef.current?.setParallax((normX - 0.5) * 2, (normY - 0.5) * 2);

    if (revealed) return;
    if (isMove && !pointerDownRef.current) return;

    let speed = 0.6;
    if (lastPosRef.current) {
      const dist = Math.hypot(e.clientX - lastPosRef.current.x, e.clientY - lastPosRef.current.y);
      speed = Math.min(2, dist / 14);
    }
    lastPosRef.current = { x: e.clientX, y: e.clientY };

    controllerRef.current?.paintAt(normX, normY);
    soundEngine.playFrostRub(speed);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLElement>) => {
    soundEngine.unlock();
    triggerPreload();
    if (revealed) return;
    pointerDownRef.current = true;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    controllerRef.current?.resetStroke();
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      // ignore synthetic or already-released pointer IDs
    }
    handlePointer(e, false);
  };

  const handlePointerUp = () => {
    pointerDownRef.current = false;
    lastPosRef.current = null;
    controllerRef.current?.resetStroke();
  };

  const handleSkip = (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
    if (revealed) return;
    soundEngine.unlock();
    triggerPreload();
    soundEngine.playFrostReveal();
    setRevealed(true);
    controllerRef.current?.triggerAutoMelt(false);
    onRevealed?.();
  };

  const ringCircumference = 2 * Math.PI * 16;
  const ringOffset = ringCircumference * (1 - Math.min(1, progress));

  return (
    <section
      id="scene-1"
      data-scene="1"
      className="relative h-[100svh] w-full overflow-hidden select-none bg-[#DCE4EE]"
      style={{ touchAction: revealed ? 'pan-y' : 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={(e) => handlePointer(e, true)}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* WebGL Frosted Glass Canvas */}
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        aria-label="Заледеневшее новогоднее окно"
      />

      {/* Interactive Frost Hint (visible before melted — swift exit per review-animation) */}
      <div
        aria-hidden={revealed}
        className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center pb-safe px-5 transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.7,0,0.84,0)] ${
          revealed ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100'
        }`}
      >
        <div className="mb-4 flex items-center gap-3 rounded-full border border-white/65 bg-white/45 px-5 py-3 shadow-[0_12px_36px_-10px_rgba(30,43,55,0.22)] backdrop-blur-xl">
          <div className="relative flex h-9 w-9 items-center justify-center">
            <svg className="h-9 w-9 -rotate-90" viewBox="0 0 38 38" aria-hidden="true">
              <circle
                cx="19"
                cy="19"
                r="16"
                fill="none"
                stroke="rgba(27,40,51,0.14)"
                strokeWidth="2"
              />
              <circle
                cx="19"
                cy="19"
                r="16"
                fill="none"
                stroke="#B88B4A"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                className="transition-[stroke-dashoffset] duration-150 ease-out"
              />
            </svg>
            <span className="absolute text-sm text-[#1B2833]" aria-hidden="true">
              ❄
            </span>
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[14px] font-medium tracking-[-0.01em] text-[#1B2833]">
              {cfg.hintText}
            </span>
            <span className="text-[11px] font-medium tracking-[0.04em] text-[#445666]">
              Проведи по экрану, чтобы растопить иней
            </span>
          </div>
        </div>

        <button
          type="button"
          disabled={revealed}
          tabIndex={revealed ? -1 : 0}
          aria-hidden={revealed}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={handleSkip}
          className={`min-h-[44px] rounded-full px-5 py-2 text-[12px] font-medium tracking-[0.12em] uppercase text-[#2A3B49]/80 transition-transform duration-150 active:scale-95 ${
            revealed ? 'pointer-events-none' : 'pointer-events-auto'
          }`}
        >
          {cfg.skipLabel}
        </button>
      </div>

      {/* Editorial Reveal Typography (appears cleanly after hint exits) */}
      <div
        aria-hidden={!revealed}
        className={`pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-between pt-safe pb-safe px-6 text-center transition-[transform,opacity] duration-500 delay-100 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          revealed ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}
      >
        <div className="mt-10 flex flex-col items-center">
          <span className="mb-3 rounded-full border border-white/45 bg-[#1B2833]/28 px-4 py-1.5 text-[10px] font-semibold tracking-[0.22em] uppercase text-white/95 backdrop-blur-md">
            {cfg.eyebrow}
          </span>
          <h1
            className="font-editorial text-[76px] leading-[0.88] font-medium tracking-[-0.03em] text-white drop-shadow-[0_6px_28px_rgba(24,36,52,0.45)]"
          >
            {cfg.titleYear}
          </h1>
          <p className="font-editorial mt-2 text-[34px] leading-tight font-medium italic tracking-[-0.01em] text-[#FFF8EC] drop-shadow-[0_4px_20px_rgba(24,36,52,0.48)]">
            {cfg.titleMain}
          </p>
          <p className="mt-3 max-w-[290px] text-balance text-[14px] leading-relaxed font-normal text-white/95 drop-shadow-[0_2px_14px_rgba(20,30,45,0.58)]">
            {cfg.subtitle}
          </p>
        </div>

        {/* Scroll invitation cue */}
        <div className="mb-6 flex flex-col items-center gap-2">
          <span className="rounded-full border border-white/50 bg-[#1B2833]/32 px-4 py-1.5 text-[11px] font-medium tracking-[0.18em] uppercase text-white/95 backdrop-blur-md">
            {cfg.scrollPrompt}
          </span>
          <svg
            className="h-5 w-5 text-[#223442] drop-shadow-[0_1px_6px_rgba(255,255,255,0.85)] animate-pulse-chevron"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>

      {/* Seamless misty bottom bridge dissolving directly into Scene 2's #C2CDCE top */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-36"
        style={{
          background:
            'linear-gradient(to bottom, rgba(194,205,206,0) 0%, rgba(194,205,206,0.62) 52%, #C2CDCE 88%, #C2CDCE 100%)',
        }}
        aria-hidden="true"
      />
    </section>
  );
}
