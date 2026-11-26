export interface SparkleParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  phase: number;
  kind: 'star' | 'dot';
  gold: boolean;
}

export interface RippleWave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  gold: boolean;
}

export class ChimesSparkleSystem {
  private particles: SparkleParticle[] = [];
  private ripples: RippleWave[] = [];
  private readonly maxParticles = 110;
  private readonly maxRipples = 12;

  emitBurst(x: number, y: number, intensity = 1, isCollision = false): void {
    const clamped = Math.max(0.35, Math.min(1.6, intensity));
    const count = Math.round((isCollision ? 16 : 11) * clamped);

    if (this.ripples.length < this.maxRipples) {
      this.ripples.push({
        x,
        y,
        radius: isCollision ? 5 : 8,
        maxRadius: (isCollision ? 48 : 38) * clamped,
        life: 0,
        maxLife: isCollision ? 0.52 : 0.44,
        gold: true,
      });
    }

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.45;
      const speed = (24 + Math.random() * 68) * clamped;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 12 * clamped,
        size: 1.5 + Math.random() * 2.8,
        life: 0,
        maxLife: 0.55 + Math.random() * 0.55,
        phase: Math.random() * Math.PI * 2,
        kind: i % 3 === 0 ? 'star' : 'dot',
        gold: i % 4 !== 0,
      });
    }
  }

  hasActiveEffects(): boolean {
    return this.particles.length > 0 || this.ripples.length > 0;
  }

  clear(): void {
    this.particles.length = 0;
    this.ripples.length = 0;
  }

  updateAndDraw(
    ctx: CanvasRenderingContext2D,
    dt: number,
    stageWidth: number,
    stageHeight: number,
  ): void {
    ctx.clearRect(0, 0, stageWidth, stageHeight);

    // Draw expanding soft golden collision/tap rings
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.life += dt;
      if (r.life >= r.maxLife) {
        this.ripples.splice(i, 1);
        continue;
      }
      const p = r.life / r.maxLife;
      const eased = 1 - Math.pow(1 - p, 2.4);
      const currR = r.radius + (r.maxRadius - r.radius) * eased;
      const alpha = (1 - p) * (1 - p) * 0.48;

      ctx.beginPath();
      ctx.arc(r.x, r.y, currR, 0, Math.PI * 2);
      ctx.strokeStyle = r.gold
        ? `rgba(218, 178, 102, ${alpha.toFixed(3)})`
        : `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    // Draw twinkling champagne-gold & crystal-ice sparkles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const sp = this.particles[i];
      sp.life += dt;
      if (sp.life >= sp.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      const drag = Math.exp(-dt * 2.4);
      sp.vx *= drag;
      sp.vy = sp.vy * drag + 28 * dt;
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.phase += dt * 11;

      const p = sp.life / sp.maxLife;
      const fadeIn = Math.min(1, p * 6);
      const fadeOut = Math.pow(1 - p, 1.5);
      const twinkle = 0.65 + 0.35 * Math.sin(sp.phase);
      const alpha = fadeIn * fadeOut * twinkle * 0.92;

      if (sp.kind === 'star') {
        const arm = sp.size * (1.25 + 0.35 * Math.sin(sp.phase));
        const inner = arm * 0.24;
        ctx.save();
        ctx.translate(sp.x, sp.y);
        ctx.beginPath();
        ctx.moveTo(0, -arm);
        ctx.lineTo(inner, -inner);
        ctx.lineTo(arm, 0);
        ctx.lineTo(inner, inner);
        ctx.lineTo(0, arm);
        ctx.lineTo(-inner, inner);
        ctx.lineTo(-arm, 0);
        ctx.lineTo(-inner, -inner);
        ctx.closePath();
        ctx.fillStyle = sp.gold
          ? `rgba(235, 194, 114, ${alpha.toFixed(3)})`
          : `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
        ctx.fill();
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size * 0.58, 0, Math.PI * 2);
        ctx.fillStyle = sp.gold
          ? `rgba(232, 189, 108, ${alpha.toFixed(3)})`
          : `rgba(244, 250, 255, ${alpha.toFixed(3)})`;
        ctx.fill();
      }
    }
  }
}
