/**
 * Procedural hijack sound design: tape-stop pitch-down, glass fracture crunch,
 * sub-bass impact, and exploit terminal telemetry pips.
 */

export function synthesizeGlitchHijack(
  ctx: AudioContext,
  out: GainNode,
  noiseBuffer: AudioBuffer | null,
): void {
  const t = ctx.currentTime;

  // 1. Warm fairytale chord decelerating via tape-stop pitch-down (0.0s -> 0.52s)
  const freqs = [587.33, 739.99, 880];
  freqs.forEach((f) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const lp = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2400, t);
    lp.frequency.exponentialRampToValueAtTime(140, t + 0.48);

    osc.frequency.setValueAtTime(f, t);
    osc.frequency.exponentialRampToValueAtTime(f * 0.14, t + 0.48);

    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.54);

    osc.connect(lp).connect(gain).connect(out);
    osc.start(t);
    osc.stop(t + 0.56);
  });

  // 2. Crisp glass fracture burst + sub impact (~0.36s)
  if (noiseBuffer) {
    const crackT = t + 0.36;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(2200, crackT);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, crackT);
    gain.gain.linearRampToValueAtTime(0.28, crackT + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, crackT + 0.24);

    src.connect(hp).connect(gain).connect(out);
    src.start(crackT, 0, 0.26);

    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(110, crackT);
    sub.frequency.exponentialRampToValueAtTime(34, crackT + 0.22);
    subGain.gain.setValueAtTime(0.26, crackT);
    subGain.gain.exponentialRampToValueAtTime(0.0001, crackT + 0.24);

    sub.connect(subGain).connect(out);
    sub.start(crackT);
    sub.stop(crackT + 0.26);
  }
}

export function synthesizeTerminalTick(ctx: AudioContext, out: GainNode, danger: boolean): void {
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = danger ? 'square' : 'triangle';
  osc.frequency.setValueAtTime(danger ? 420 : 1280, t);
  gain.gain.setValueAtTime(danger ? 0.055 : 0.032, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + (danger ? 0.09 : 0.04));

  osc.connect(gain).connect(out);
  osc.start(t);
  osc.stop(t + 0.1);
}
