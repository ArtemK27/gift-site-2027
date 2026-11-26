import { useEffect, useState } from 'react';
import { soundEngine } from '../audio/soundEngine';

export function SoundToggle() {
  const [muted, setMuted] = useState(() => soundEngine.isMuted());

  useEffect(() => {
    return soundEngine.subscribe(setMuted);
  }, []);

  const handleToggle = () => {
    setMuted(soundEngine.toggleMute());
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={muted ? 'Включить звук' : 'Выключить звук'}
      aria-pressed={!muted}
      className="fixed top-4 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-white/65 bg-white/40 text-[#1E2B37] shadow-[0_8px_24px_-8px_rgba(24,36,48,0.25),inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-xl transition-transform duration-150 active:scale-95"
      style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}
    >
      {muted ? (
        <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M11 5L6 9H2v6h4l5 4V5z" />
          <line x1="22" y1="9" x2="16" y2="15" />
          <line x1="16" y1="9" x2="22" y2="15" />
        </svg>
      ) : (
        <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M11 5L6 9H2v6h4l5 4V5z" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
      )}
    </button>
  );
}
