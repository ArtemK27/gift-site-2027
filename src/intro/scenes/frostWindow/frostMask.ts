export interface Droplet {
  x: number;
  y: number;
  radius: number;
  speed: number;
  alpha: number;
  life: number;
}

export const MASK_SIZE = 256;
export const MAX_DROPS = 8;

/**
 * Manages the offscreen heat-mask canvas, center clear-ratio sampling,
 * and gravity-sliding condensation droplets for Scene 1.
 */
export class FrostHeatMask {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private drops: Droplet[] = [];
  private lastStrokePos: { x: number; y: number } | null = null;
  private lastDropSpawnMs = 0;
  dirty = true;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = MASK_SIZE;
    this.canvas.height = MASK_SIZE;
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('Could not initialize 2D context for frost heat-mask');
    }
    this.ctx = ctx;
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, MASK_SIZE, MASK_SIZE);
  }

  resetStroke(): void {
    this.lastStrokePos = null;
  }

  paintAt(normX: number, normY: number, viewportWidth: number, brushRadiusPx: number): void {
    const x = Math.max(0, Math.min(1, normX)) * MASK_SIZE;
    const y = Math.max(0, Math.min(1, normY)) * MASK_SIZE;
    const scaleX = MASK_SIZE / Math.max(viewportWidth, 320);
    const radius = Math.max(18, brushRadiusPx * scaleX * 1.15);

    const stamp = (sx: number, sy: number) => {
      const grad = this.ctx.createRadialGradient(sx, sy, radius * 0.14, sx, sy, radius);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
      grad.addColorStop(0.55, 'rgba(255, 255, 255, 0.45)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      this.ctx.fill();
    };

    if (this.lastStrokePos) {
      const dx = x - this.lastStrokePos.x;
      const dy = y - this.lastStrokePos.y;
      const dist = Math.hypot(dx, dy);
      const steps = Math.max(1, Math.ceil(dist / (radius * 0.28)));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        stamp(this.lastStrokePos.x + dx * t, this.lastStrokePos.y + dy * t);
      }
    } else {
      stamp(x, y);
    }

    this.lastStrokePos = { x, y };
    this.dirty = true;

    const now = performance.now();
    if (now - this.lastDropSpawnMs > 280) {
      this.lastDropSpawnMs = now;
      this.spawnDroplet(normX, 1 - normY);
    }
  }

  private spawnDroplet(uvX: number, uvY: number): void {
    const jitterX = (Math.random() - 0.5) * 0.08;
    const drop: Droplet = {
      x: Math.max(0.08, Math.min(0.92, uvX + jitterX)),
      y: Math.max(0.15, Math.min(0.92, uvY - 0.02)),
      radius: 0.011 + Math.random() * 0.01,
      speed: 0.032 + Math.random() * 0.038,
      alpha: 0.85,
      life: 1.0,
    };
    if (this.drops.length >= MAX_DROPS) {
      this.drops.shift();
    }
    this.drops.push(drop);
  }

  computeCenterClearRatio(): number {
    // Sample almost the entire interactive glass area (excluding tiny bezel edges & bottom hint bar)
    const sx = Math.floor(MASK_SIZE * 0.05);
    const sy = Math.floor(MASK_SIZE * 0.06);
    const sw = Math.floor(MASK_SIZE * 0.9);
    const sh = Math.floor(MASK_SIZE * 0.8);
    const data = this.ctx.getImageData(sx, sy, sw, sh).data;

    let cleared = 0;
    let total = 0;
    for (let i = 0; i < data.length; i += 16) {
      total++;
      if (data[i] > 110) cleared++;
    }
    return total > 0 ? cleared / total : 0;
  }

  stepDroplets(dt: number, outUniform: Float32Array): void {
    outUniform.fill(0);
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.y -= d.speed * dt;
      d.speed = Math.min(0.14, d.speed + 0.022 * dt);
      d.life -= dt * 0.24;
      d.alpha = Math.max(0, Math.min(0.9, d.life * 1.2));
      if (d.life <= 0 || d.y < -0.05) {
        this.drops.splice(i, 1);
      }
    }
    for (let i = 0; i < Math.min(MAX_DROPS, this.drops.length); i++) {
      const d = this.drops[i];
      outUniform[i * 4] = d.x;
      outUniform[i * 4 + 1] = d.y;
      outUniform[i * 4 + 2] = d.radius;
      outUniform[i * 4 + 3] = d.alpha;
    }
  }
}
