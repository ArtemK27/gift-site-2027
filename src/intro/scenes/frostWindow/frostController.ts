import { isLatestEntryIntersecting } from '../../lib/visibility';
import { FrostHeatMask, MAX_DROPS } from './frostMask';
import { FROST_FRAGMENT_SHADER, FROST_VERTEX_SHADER } from './frostShader';

export interface FrostControllerOptions {
  canvas: HTMLCanvasElement;
  imageUrl?: string;
  fallbackImageUrl?: string;
  brushRadiusPx: number;
  clearThreshold: number;
  autoMeltDurationMs: number;
  onProgress?: (ratio: number) => void;
  onThresholdReached?: () => void;
  onFullyRevealed?: () => void;
  onVisibilityChange?: (visible: boolean) => void;
}

export class FrostController {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null = null;
  private ctx2d: CanvasRenderingContext2D | null = null;
  private bgImage: HTMLImageElement | null = null;

  private program: WebGLProgram | null = null;
  private vbo: WebGLBuffer | null = null;
  private bgTex: WebGLTexture | null = null;
  private maskTex: WebGLTexture | null = null;
  private uniforms: Record<string, WebGLUniformLocation | null> = {};

  private heatMask = new FrostHeatMask();
  private dropUniformBuf = new Float32Array(MAX_DROPS * 4);
  private parallaxTarget = { x: 0, y: 0 };
  private parallaxCurrent = { x: 0, y: 0 };

  private autoMelt = 0;
  private autoMeltActive = false;
  private autoMeltStartMs = 0;
  private thresholdTriggered = false;
  private fullyRevealed = false;
  private lastRatioCheckMs = 0;

  private rafId = 0;
  private bgLoadToken = 0;
  private currentBgUrl: string | null = null;
  private strokePainted = false;
  private startTimeMs = performance.now();
  private lastFrameMs = performance.now();
  private visible = true;
  private paused = false;
  private lastReportedVisible: boolean | null = null;
  private disposed = false;
  private reducedMotion =
    typeof window !== 'undefined' &&
    Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  private observer: IntersectionObserver | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private options: FrostControllerOptions;

  constructor(options: FrostControllerOptions) {
    this.options = options;
    this.canvas = options.canvas;
    this.initRenderer();
    if (options.imageUrl) {
      this.setBackground(options.imageUrl, options.fallbackImageUrl);
    }
    this.attachObservers();
    this.startLoop();
  }

  setPaused(paused: boolean): void {
    if (this.paused === paused) return;
    this.paused = paused;
    if (paused) {
      this.stopLoop();
    } else if (this.visible || (this.autoMeltActive && this.autoMelt < 1)) {
      this.startLoop();
    }
  }

  private startLoop(): void {
    if (this.disposed || this.paused || this.rafId !== 0) return;
    this.lastFrameMs = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  private stopLoop(): void {
    if (this.rafId !== 0) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  private initRenderer(): void {
    const gl = this.canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
    });
    if (!gl) {
      this.ctx2d = this.canvas.getContext('2d');
      return;
    }

    const vs = this.compileShader(gl, gl.VERTEX_SHADER, FROST_VERTEX_SHADER);
    const fs = this.compileShader(gl, gl.FRAGMENT_SHADER, FROST_FRAGMENT_SHADER);
    const program = vs && fs ? gl.createProgram() : null;
    if (!vs || !fs || !program) {
      this.ctx2d = this.canvas.getContext('2d');
      return;
    }

    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      this.ctx2d = this.canvas.getContext('2d');
      return;
    }

    this.gl = gl;
    this.program = program;
    gl.useProgram(program);

    const quad = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    this.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    this.bgTex = this.createTexture(gl);
    this.maskTex = this.createTexture(gl);

    gl.bindTexture(gl.TEXTURE_2D, this.bgTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([214, 224, 236, 255]));
    this.uploadMaskTexture();

    const names = ['uBgTex', 'uMaskTex', 'uResolution', 'uImgResolution', 'uParallax', 'uTime', 'uAutoMelt', 'uDrops'];
    for (const name of names) {
      this.uniforms[name] = gl.getUniformLocation(program, name);
    }
    gl.uniform1i(this.uniforms.uBgTex, 0);
    gl.uniform1i(this.uniforms.uMaskTex, 1);
    gl.uniform2f(this.uniforms.uImgResolution, 960, 1720);
  }

  private compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  private createTexture(gl: WebGLRenderingContext): WebGLTexture | null {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return tex;
  }

  setBackground(url: string, fallbackUrl = this.options.fallbackImageUrl): void {
    if (this.disposed) return;
    if (this.currentBgUrl === url && this.bgImage) return;
    const token = ++this.bgLoadToken;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => {
      if (this.disposed || token !== this.bgLoadToken) return;
      this.currentBgUrl = url;
      this.bgImage = img;
      if (this.gl && this.bgTex && this.program) {
        const gl = this.gl;
        gl.useProgram(this.program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.bgTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.uniform2f(this.uniforms.uImgResolution, img.naturalWidth || 960, img.naturalHeight || 1720);
      }
      if (this.visible) {
        this.startLoop();
      }
    };
    img.onerror = () => {
      if (this.disposed || token !== this.bgLoadToken) return;
      if (fallbackUrl && fallbackUrl !== url) {
        this.setBackground(fallbackUrl, undefined);
      }
    };
    img.src = url;
  }

  private attachObservers(): void {
    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.canvas);
    this.observer = new IntersectionObserver(
      (entries) => {
        const nextVisible = isLatestEntryIntersecting(entries, true);
        this.visible = nextVisible;
        if (nextVisible !== this.lastReportedVisible) {
          this.lastReportedVisible = nextVisible;
          this.options.onVisibilityChange?.(nextVisible);
        }
        if (nextVisible && !this.paused) {
          this.startLoop();
        } else {
          if (this.autoMeltActive && this.autoMelt < 1) {
            this.autoMelt = 1;
            if (!this.fullyRevealed) {
              this.fullyRevealed = true;
              this.options.onProgress?.(1);
              this.options.onFullyRevealed?.();
            }
          }
          this.stopLoop();
        }
      },
      { rootMargin: '0px', threshold: 0.01 },
    );
    this.observer.observe(this.canvas);
  }

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.gl?.viewport(0, 0, w, h);
  }

  private uploadMaskTexture(): void {
    if (!this.gl || !this.maskTex) return;
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.maskTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.heatMask.canvas);
    this.heatMask.dirty = false;
  }

  setParallax(normX: number, normY: number): void {
    this.parallaxTarget.x = Math.max(-1, Math.min(1, normX));
    this.parallaxTarget.y = Math.max(-1, Math.min(1, normY));
  }

  private sampleProgress(): void {
    if (this.disposed || this.autoMeltActive) return;
    this.lastRatioCheckMs = performance.now();
    const ratio = this.heatMask.computeCenterClearRatio();
    this.options.onProgress?.(ratio);
    if (!this.thresholdTriggered && ratio >= this.options.clearThreshold) {
      this.thresholdTriggered = true;
      this.options.onThresholdReached?.();
      this.triggerAutoMelt();
    }
  }

  resetStroke(): void {
    this.heatMask.resetStroke();
    if (this.strokePainted) {
      this.strokePainted = false;
      this.sampleProgress();
    }
  }

  paintAt(normX: number, normY: number): void {
    if (this.disposed || this.autoMeltActive) return;
    const rect = this.canvas.getBoundingClientRect();
    this.heatMask.paintAt(normX, normY, rect.width, this.options.brushRadiusPx);
    this.strokePainted = true;

    const now = performance.now();
    if (now - this.lastRatioCheckMs > 120) {
      this.sampleProgress();
    }
  }

  triggerAutoMelt(instant = false): void {
    if (instant) {
      this.autoMelt = 1;
      this.autoMeltActive = true;
      this.thresholdTriggered = true;
      if (!this.fullyRevealed) {
        this.fullyRevealed = true;
        this.options.onProgress?.(1);
        this.options.onFullyRevealed?.();
      }
      this.startLoop();
      return;
    }
    if (this.autoMeltActive) return;
    this.autoMeltActive = true;
    this.autoMeltStartMs = performance.now();
    this.startLoop();
  }

  private renderFallback2D(): void {
    const ctx = this.ctx2d;
    if (!ctx || !this.bgImage) return;
    const { width, height } = this.canvas;
    const scale = Math.max(width / this.bgImage.naturalWidth, height / this.bgImage.naturalHeight);
    const dw = this.bgImage.naturalWidth * scale;
    const dh = this.bgImage.naturalHeight * scale;
    ctx.drawImage(this.bgImage, (width - dw) * 0.5, (height - dh) * 0.5, dw, dh);
    const frostAlpha = Math.max(0, 1 - this.autoMelt) * 0.72;
    if (frostAlpha > 0.01) {
      ctx.fillStyle = `rgba(228, 237, 246, ${frostAlpha.toFixed(3)})`;
      ctx.fillRect(0, 0, width, height);
    }
  }

  private loop = (now: number): void => {
    if (this.disposed || this.paused) return;
    this.rafId = 0;
    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastFrameMs) / 1000));
    this.lastFrameMs = now;

    if (this.autoMeltActive && this.autoMelt < 1) {
      const t = Math.max(0, Math.min(1, (now - this.autoMeltStartMs) / this.options.autoMeltDurationMs));
      this.autoMelt = 1 - Math.pow(1 - t, 3);
      if (t >= 1 && !this.fullyRevealed) {
        this.fullyRevealed = true;
        this.options.onProgress?.(1);
        this.options.onFullyRevealed?.();
      }
    }

    if (this.visible) {
      const elapsed = (now - this.startTimeMs) / 1000;
      const idleX = this.reducedMotion ? 0 : Math.sin(elapsed * 0.45) * 0.28;
      const idleY = this.reducedMotion ? 0 : Math.cos(elapsed * 0.35) * 0.2;
      const targetX = this.parallaxTarget.x + idleX;
      const targetY = this.parallaxTarget.y + idleY;
      const smooth = 1 - Math.pow(1 - 0.08, dt * 60);
      this.parallaxCurrent.x += (targetX - this.parallaxCurrent.x) * smooth;
      this.parallaxCurrent.y += (targetY - this.parallaxCurrent.y) * smooth;
      this.heatMask.stepDroplets(dt, this.dropUniformBuf);

      if (this.gl && this.program) {
        const gl = this.gl;
        if (this.heatMask.dirty) this.uploadMaskTexture();
        gl.useProgram(this.program);
        gl.uniform2f(this.uniforms.uResolution, this.canvas.width, this.canvas.height);
        gl.uniform2f(this.uniforms.uParallax, this.parallaxCurrent.x, this.parallaxCurrent.y);
        gl.uniform1f(this.uniforms.uTime, this.reducedMotion ? 0 : elapsed);
        gl.uniform1f(this.uniforms.uAutoMelt, this.autoMelt);
        gl.uniform4fv(this.uniforms.uDrops, this.dropUniformBuf);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      } else {
        this.renderFallback2D();
      }
    }

    if (!this.paused && (this.visible || (this.autoMeltActive && this.autoMelt < 1))) {
      this.rafId = requestAnimationFrame(this.loop);
    }
  };

  dispose(): void {
    this.disposed = true;
    this.stopLoop();
    this.observer?.disconnect();
    this.resizeObserver?.disconnect();
    if (this.gl) {
      const gl = this.gl;
      if (this.bgTex) gl.deleteTexture(this.bgTex);
      if (this.maskTex) gl.deleteTexture(this.maskTex);
      if (this.vbo) gl.deleteBuffer(this.vbo);
      if (this.program) gl.deleteProgram(this.program);
      this.gl = null;
    }
    this.bgImage = null;
  }
}
