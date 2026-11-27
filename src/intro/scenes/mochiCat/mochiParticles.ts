/**
 * Lightweight 2D Canvas particle system for the Mochi Cat scene.
 * Spawns pastel hearts, champagne-gold 4-point sparkles, and soft pearl glints
 * on juicy bounces, stretches, and secret unlocks.
 */

export type MochiParticleKind = 'heart' | 'sparkle' | 'pearl';

export interface MochiParticle {
  kind: MochiParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  vRot: number;
  age: number;
  maxAge: number;
  color: string;
  swayPhase: number;
  swayAmp: number;
}

const HEART_COLORS = ['#F3B2BF', '#F7C7D0', '#ECC4B2', '#F4A6B8'] as const;
const SPARKLE_COLORS = ['#E5BE72', '#F4DFAF', '#D4A553', '#FFF5D6'] as const;
const PEARL_COLORS = ['#FFFFFF', '#E6F0FA', '#F8EFE0'] as const;

const MAX_PARTICLES = 44;

export class MochiParticleSystem {
  private particles: MochiParticle[] = [];

  get count(): number {
    return this.particles.length;
  }

  clear(): void {
    this.particles.length = 0;
  }

  /**
   * Emits a delicate burst of pastel hearts & champagne sparkles on rebound or tap.
   */
  emitBurst(
    originX: number,
    originY: number,
    intensity: number,
    reducedMotion = false,
    celebratory = false,
  ): void {
    const k = Math.max(0.25, Math.min(1, intensity));
    const baseCount = celebratory ? 14 : Math.round(5 + k * 7);
    const total = reducedMotion ? Math.min(4, Math.ceil(baseCount * 0.4)) : baseCount;

    for (let i = 0; i < total; i++) {
      if (this.particles.length >= MAX_PARTICLES) {
        this.particles.shift();
      }

      const roll = Math.random();
      const kind: MochiParticleKind =
        roll < 0.44 ? 'heart' : roll < 0.84 ? 'sparkle' : 'pearl';

      // Spread upward in a joyful soft fountain around the cat
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.15;
      const speed = (reducedMotion ? 22 : 42 + k * 68) * (0.65 + Math.random() * 0.65);

      const palette =
        kind === 'heart'
          ? HEART_COLORS
          : kind === 'sparkle'
            ? SPARKLE_COLORS
            : PEARL_COLORS;

      this.particles.push({
        kind,
        x: originX + (Math.random() - 0.5) * 44,
        y: originY + (Math.random() - 0.5) * 24,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (reducedMotion ? 8 : 22),
        size:
          kind === 'heart'
            ? 5.5 + Math.random() * 4.5
            : kind === 'sparkle'
              ? 4.2 + Math.random() * 4.6
              : 2.0 + Math.random() * 2.2,
        rotation: (Math.random() - 0.5) * 0.6,
        vRot: (Math.random() - 0.5) * 1.4,
        age: 0,
        maxAge: 0.78 + Math.random() * 0.55,
        color: palette[Math.floor(Math.random() * palette.length)],
        swayPhase: Math.random() * Math.PI * 2,
        swayAmp: kind === 'heart' ? 14 + Math.random() * 14 : 5 + Math.random() * 7,
      });
    }
  }

  step(dt: number): void {
    const clampedDt = Math.min(dt, 1 / 30);
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += clampedDt;
      if (p.age >= p.maxAge) {
        this.particles.splice(i, 1);
        continue;
      }

      const drag = Math.pow(0.92, clampedDt * 60);
      p.vx *= drag;
      p.vy = p.vy * drag - 14 * clampedDt; // gentle warm float upward
      p.x += (p.vx + Math.sin(p.age * 4.5 + p.swayPhase) * p.swayAmp) * clampedDt;
      p.y += p.vy * clampedDt;
      p.rotation += p.vRot * clampedDt;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.particles.length === 0) return;

    ctx.save();
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const t = p.age / p.maxAge;
      // Smooth ease-in pop, graceful float fade-out
      const fadeIn = Math.min(1, t / 0.16);
      const fadeOut = 1 - Math.pow(Math.max(0, (t - 0.35) / 0.65), 1.6);
      const alpha = Math.max(0, Math.min(1, fadeIn * fadeOut));
      const scale = 0.55 + Math.sin(Math.min(1, t / 0.25) * (Math.PI / 2)) * 0.55 - t * 0.18;

      ctx.save();
      ctx.globalAlpha = alpha * 0.92;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.scale(scale, scale);

      if (p.kind === 'heart') {
        drawPastelHeart(ctx, p.size, p.color);
      } else if (p.kind === 'sparkle') {
        drawFourPointSparkle(ctx, p.size, p.color);
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
    ctx.restore();
  }
}

function drawPastelHeart(ctx: CanvasRenderingContext2D, size: number, color: string): void {
  const s = size;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, s * 0.36);
  ctx.bezierCurveTo(-s * 0.98, -s * 0.26, -s * 0.58, -s * 1.05, 0, -s * 0.42);
  ctx.bezierCurveTo(s * 0.58, -s * 1.05, s * 0.98, -s * 0.26, 0, s * 0.36);
  ctx.closePath();
  ctx.fill();

  // Tiny porcelain sheen dot on upper-left lobe
  ctx.fillStyle = 'rgba(255, 255, 255, 0.58)';
  ctx.beginPath();
  ctx.ellipse(-s * 0.28, -s * 0.42, s * 0.16, s * 0.1, -0.45, 0, Math.PI * 2);
  ctx.fill();
}

function drawFourPointSparkle(ctx: CanvasRenderingContext2D, size: number, color: string): void {
  const r = size;
  const inner = r * 0.26;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.quadraticCurveTo(inner * 0.4, -inner * 0.4, r, 0);
  ctx.quadraticCurveTo(inner * 0.4, inner * 0.4, 0, r);
  ctx.quadraticCurveTo(-inner * 0.4, inner * 0.4, -r, 0);
  ctx.quadraticCurveTo(-inner * 0.4, -inner * 0.4, 0, -r);
  ctx.closePath();
  ctx.fill();
}
