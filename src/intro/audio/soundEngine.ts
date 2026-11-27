/**
 * Procedural Web Audio synthesizer for the New Year 2027 intro.
 * Zero external MP3s, instant mobile unlock on first touch, full dispose().
 */

import { synthesizeGlitchHijack, synthesizeTerminalTick } from './glitchSound';

const PENTATONIC_HZ = [587.33, 659.25, 739.99, 880.0, 987.77, 1174.66, 1318.51];

type MuteListener = (muted: boolean) => void;

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;
  private lastFrostMs = 0;
  private lastMochiMs = 0;
  private listeners = new Set<MuteListener>();

  unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.72;
      this.masterGain.connect(this.ctx.destination);
      this.noiseBuffer = this.createNoiseBuffer(this.ctx);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(next: boolean): void {
    this.muted = next;
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(next ? 0 : 0.72, now, 0.03);
    }
    this.listeners.forEach((cb) => cb(next));
  }

  toggleMute(): boolean {
    this.unlock();
    this.setMuted(!this.muted);
    return this.muted;
  }

  subscribe(listener: MuteListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private getReady(): { ctx: AudioContext; out: GainNode } | null {
    if (this.muted) return null;
    if (!this.ctx || !this.masterGain) return null;
    if (this.ctx.state === 'closed') return null;
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return { ctx: this.ctx, out: this.masterGain };
  }

  private createNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * 1.2);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  playFrostRub(speed = 0.6): void {
    const nowMs = performance.now();
    if (nowMs - this.lastFrostMs < 65) return;
    this.lastFrostMs = nowMs;

    const audio = this.getReady();
    if (!audio || !this.noiseBuffer) return;
    const { ctx, out } = audio;
    const t = ctx.currentTime;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2600 + Math.min(speed, 2) * 1400, t);
    filter.Q.value = 3.2;

    const gain = ctx.createGain();
    const peak = Math.min(0.11, 0.035 + speed * 0.04);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);

    src.connect(filter).connect(gain).connect(out);
    src.start(t, Math.random() * 0.5, 0.14);
  }

  playFrostReveal(): void {
    const audio = this.getReady();
    if (!audio) return;
    const notes = [587.33, 739.99, 880, 1174.66, 1479.98];
    notes.forEach((hz, idx) => {
      this.scheduleBell(audio.ctx, audio.out, hz, audio.ctx.currentTime + idx * 0.075, 0.075, 1.3);
    });
  }

  playChime(normalizedX = 0.5): void {
    const audio = this.getReady();
    if (!audio) return;
    const idx = Math.max(0, Math.min(PENTATONIC_HZ.length - 1, Math.floor(normalizedX * PENTATONIC_HZ.length)));
    const hz = PENTATONIC_HZ[idx];
    this.scheduleBell(audio.ctx, audio.out, hz, audio.ctx.currentTime, 0.1, 1.15);
  }

  /**
   * Warm, muffled velvet cushion squish (no cartoon bubble/boing sweep).
   * Throttled with a gentle cooldown so rapid multi-touch never clips.
   */
  playMochiSquish(intensity = 0.55): void {
    const nowMs = performance.now();
    if (nowMs - this.lastMochiMs < 145) return;
    this.lastMochiMs = nowMs;

    const audio = this.getReady();
    if (!audio) return;
    const { ctx, out } = audio;
    const t = ctx.currentTime;
    const k = Math.max(0.15, Math.min(1, intensity));

    // 1) Soft low-mid velvet cushion thump (gentle downward settle, heavily low-passed)
    const bodyOsc = ctx.createOscillator();
    bodyOsc.type = 'sine';
    bodyOsc.frequency.setValueAtTime(148 + k * 24, t);
    bodyOsc.frequency.exponentialRampToValueAtTime(92, t + 0.125);

    const bodyFilter = ctx.createBiquadFilter();
    bodyFilter.type = 'lowpass';
    bodyFilter.frequency.setValueAtTime(320 + k * 140, t);
    bodyFilter.Q.value = 0.7;

    const bodyGain = ctx.createGain();
    bodyGain.gain.setValueAtTime(0.0001, t);
    bodyGain.gain.exponentialRampToValueAtTime(0.044 + k * 0.048, t + 0.018);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.155);

    bodyOsc.connect(bodyFilter).connect(bodyGain).connect(out);
    bodyOsc.start(t);
    bodyOsc.stop(t + 0.17);

    // 2) Subtle warm plush harmonic breath
    const warmOsc = ctx.createOscillator();
    warmOsc.type = 'triangle';
    warmOsc.frequency.setValueAtTime(226 + k * 34, t);
    warmOsc.frequency.exponentialRampToValueAtTime(178, t + 0.095);

    const warmFilter = ctx.createBiquadFilter();
    warmFilter.type = 'lowpass';
    warmFilter.frequency.setValueAtTime(420, t);

    const warmGain = ctx.createGain();
    warmGain.gain.setValueAtTime(0.0001, t);
    warmGain.gain.exponentialRampToValueAtTime(0.012 + k * 0.014, t + 0.02);
    warmGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.115);

    warmOsc.connect(warmFilter).connect(warmGain).connect(out);
    warmOsc.start(t);
    warmOsc.stop(t + 0.13);

    // 3) Delicate powdered-mochi velvet friction whisper
    if (this.noiseBuffer) {
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = this.noiseBuffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(740 + k * 240, t);
      noiseFilter.Q.value = 1.15;

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.0001, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.016 + k * 0.024, t + 0.022);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.135);

      noiseSrc.connect(noiseFilter).connect(noiseGain).connect(out);
      noiseSrc.start(t, Math.random() * 0.45, 0.15);
    }
  }

  playGlitchHijack(): void {
    const audio = this.getReady();
    if (!audio) return;
    synthesizeGlitchHijack(audio.ctx, audio.out, this.noiseBuffer);
  }

  playTerminalTick(danger = false): void {
    const audio = this.getReady();
    if (!audio) return;
    synthesizeTerminalTick(audio.ctx, audio.out, danger);
  }

  private scheduleBell(
    ctx: AudioContext,
    out: GainNode,
    hz: number,
    startTime: number,
    peak: number,
    duration: number,
  ): void {
    const osc = ctx.createOscillator();
    const overtone = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(hz, startTime);
    overtone.type = 'sine';
    overtone.frequency.setValueAtTime(hz * 2.0, startTime);

    const overGain = ctx.createGain();
    overGain.gain.value = 0.22;

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(peak, startTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    overtone.connect(overGain).connect(gain);
    gain.connect(out);

    osc.start(startTime);
    overtone.start(startTime);
    osc.stop(startTime + duration + 0.02);
    overtone.stop(startTime + duration + 0.02);
  }

  dispose(): void {
    if (this.ctx) {
      const ctxToClose = this.ctx;
      this.ctx = null;
      this.masterGain = null;
      this.noiseBuffer = null;
      void ctxToClose.close().catch(() => {});
    }
  }
}

export const soundEngine = new SoundEngine();
