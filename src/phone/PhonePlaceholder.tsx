import { INTRO_CONFIG } from '../intro/config';

interface PhonePlaceholderProps {
  onReplayIntro: () => void;
}

/**
 * Stage 2 placeholder lock screen ("Чужой телефон").
 * Receives full control after IntroExperience unmounts & frees all WebGL/Canvas/Audio resources.
 */
export function PhonePlaceholder({ onReplayIntro }: PhonePlaceholderProps) {
  const cfg = INTRO_CONFIG.phonePlaceholder;

  return (
    <section
      data-scene="phone"
      className="relative flex min-h-[100svh] w-full flex-col justify-between overflow-hidden bg-[#05070D] pt-safe pb-safe px-5 text-[#F3F4F6] select-none"
    >
      {/* Subtle dark-mode crimson & cold-cyan luminance wash */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 18%, rgba(255,30,60,0.16) 0%, rgba(16,24,42,0.45) 42%, rgba(5,7,13,1) 82%)',
        }}
        aria-hidden="true"
      />

      {/* Top Status Bar */}
      <header className="relative z-10 mt-2 flex items-center justify-between px-1 font-terminal text-[11px] tracking-[0.12em] text-[#9CA3AF]">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#FF1E3C] shadow-[0_0_8px_#FF1E3C]" />
          <span className="text-[#FF4D66]">{cfg.carrier}</span>
        </div>
        <div className="flex items-center gap-2 text-[#D1D5DB]">
          <span>5G</span>
          <span className="rounded border border-white/25 px-1.5 py-0.5 text-[10px]">13%</span>
        </div>
      </header>

      {/* Lock Screen Clock & Incoming Mystery Notification */}
      <div className="relative z-10 my-auto flex flex-col items-center py-8 text-center">
        <span className="mb-3 rounded-full border border-[#FF1E3C]/35 bg-[#FF1E3C]/10 px-3.5 py-1 font-terminal text-[10px] font-bold tracking-[0.18em] text-[#FF4D66]">
          {cfg.badge}
        </span>

        <p className="text-[14px] font-medium tracking-[0.02em] text-[#9CA3AF]">
          {cfg.dateLabel}
        </p>
        <h1 className="mt-1 text-[72px] leading-none font-light tracking-[-0.04em] text-[#F9FAFB]">
          23:59
        </h1>

        {/* Glassmorphic Notification Card (impeccable dark elevation) */}
        <article className="mt-8 w-full max-w-[350px] rounded-3xl border border-white/12 bg-white/[0.04] p-4 text-left shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_18px_40px_-14px_rgba(0,0,0,0.65)] backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#FF1E3C]/35 bg-[#FF1E3C]/15 font-terminal text-[12px] font-bold text-[#FF4D66]">
                ?
              </div>
              <span className="text-[13px] font-semibold tracking-[-0.01em] text-[#F3F4F6]">
                {cfg.notificationTitle}
              </span>
            </div>
            <span className="text-[11px] text-[#9CA3AF]">сейчас</span>
          </div>
          <p className="mt-2.5 text-[14px] leading-relaxed text-[#D1D5DB]">
            {cfg.notificationBody}
          </p>
        </article>

        <p className="mt-6 max-w-[310px] text-balance text-[12px] leading-relaxed text-[#6B7280]">
          {cfg.stageNote}
        </p>
      </div>

      {/* Bottom Thumb-Zone Replay Control */}
      <footer className="relative z-10 mb-3 flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={onReplayIntro}
          className="flex min-h-[52px] w-full max-w-[320px] items-center justify-center gap-2.5 rounded-2xl border border-white/16 bg-white/[0.08] px-6 py-3.5 text-[14px] font-medium tracking-[-0.01em] text-[#F3F4F6] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16)] backdrop-blur-xl transition-transform duration-150 active:scale-[0.97]"
        >
          <svg className="h-4 w-4 text-[#F4D9A0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          <span>{cfg.replayLabel}</span>
        </button>

        {/* Home Indicator Bar */}
        <div className="h-1 w-32 rounded-full bg-white/25" aria-hidden="true" />
      </footer>
    </section>
  );
}
