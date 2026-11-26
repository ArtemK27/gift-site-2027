import * as THREE from 'three';

export interface StarPose {
  xNorm: number;
  yNorm: number;
  scale: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  opacity: number;
}

interface StarKeyframe extends StarPose {
  p: number;
}

/**
 * Scroll-driven 3D star choreography across Step 1 (`start: top 78%` -> `end: bottom bottom`).
 * Landmarks avoid text areas and display sculpted 3/4 angles rather than edge-on profiles.
 */
const STAR_KEYFRAMES: ReadonlyArray<StarKeyframe> = [
  {
    p: 0.0,
    xNorm: 0.38,
    yNorm: 1.24,
    scale: 0.34,
    rotX: -0.32,
    rotY: -0.45,
    rotZ: 0.2,
    opacity: 0.0,
  },
  {
    // Opening beat in open upper-right sky beside headline, cleanly above spruce branch
    p: 0.25,
    xNorm: 0.58,
    yNorm: 0.6,
    scale: 0.54,
    rotX: 0.14,
    rotY: 0.42,
    rotZ: -0.1,
    opacity: 1.0,
  },
  {
    // Card 1 beat: perched in open right corridor beside left-aligned Card 1
    p: 0.47,
    xNorm: 0.64,
    yNorm: 0.08,
    scale: 0.54,
    rotX: -0.14,
    rotY: 2.72,
    rotZ: -0.18,
    opacity: 0.98,
  },
  {
    // Dynamic sweep across open center gap between Card 1 and Card 2
    p: 0.6,
    xNorm: -0.02,
    yNorm: 0.06,
    scale: 0.58,
    rotX: 0.2,
    rotY: 4.15,
    rotZ: 0.12,
    opacity: 1.0,
  },
  {
    // Card 2 beat: upper-left corridor opposite right-aligned Card 2 (clear of caption text)
    p: 0.72,
    xNorm: -0.66,
    yNorm: 0.22,
    scale: 0.52,
    rotX: 0.14,
    rotY: 5.88,
    rotZ: 0.2,
    opacity: 0.98,
  },
  {
    // Card 3 beat: upper-right crown framing centered Card 3 without covering copy
    p: 0.85,
    xNorm: 0.58,
    yNorm: 0.46,
    scale: 0.5,
    rotX: -0.12,
    rotY: 6.72,
    rotZ: -0.14,
    opacity: 0.96,
  },
  {
    // Graceful upward lift as user approaches minimal Step 1 end placeholder
    p: 0.94,
    xNorm: 0.16,
    yNorm: 0.78,
    scale: 0.38,
    rotX: -0.26,
    rotY: 7.45,
    rotZ: -0.08,
    opacity: 0.45,
  },
  {
    // Completely vanished off top edge at bottom of Step 1
    p: 1.0,
    xNorm: -0.08,
    yNorm: 1.34,
    scale: 0.22,
    rotX: -0.45,
    rotY: 8.1,
    rotZ: -0.18,
    opacity: 0.0,
  },
];

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function smoothstep(t: number): number {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Pure pose sampler for scroll progress `p` in `[0, 1]`.
 */
export function sampleStarPose(rawProgress: number): StarPose {
  const p = clamp01(rawProgress);
  const first = STAR_KEYFRAMES[0];
  const last = STAR_KEYFRAMES[STAR_KEYFRAMES.length - 1];

  if (p <= first.p) return { ...first };
  if (p >= last.p) return { ...last };

  for (let i = 0; i < STAR_KEYFRAMES.length - 1; i++) {
    const a = STAR_KEYFRAMES[i];
    const b = STAR_KEYFRAMES[i + 1];
    if (p >= a.p && p <= b.p) {
      const span = Math.max(0.0001, b.p - a.p);
      const t = smoothstep((p - a.p) / span);
      return {
        xNorm: lerp(a.xNorm, b.xNorm, t),
        yNorm: lerp(a.yNorm, b.yNorm, t),
        scale: lerp(a.scale, b.scale, t),
        rotX: lerp(a.rotX, b.rotX, t),
        rotY: lerp(a.rotY, b.rotY, t),
        rotZ: lerp(a.rotZ, b.rotZ, t),
        opacity: lerp(a.opacity, b.opacity, t),
      };
    }
  }

  return { ...last };
}

/**
 * Computes visible world half-extents at `z = 0` for a perspective camera.
 */
export function computeVisibleHalfExtents(camera: THREE.PerspectiveCamera): {
  halfW: number;
  halfH: number;
} {
  const vFovRad = (camera.fov * Math.PI) / 180;
  const halfH = Math.tan(vFovRad / 2) * camera.position.z;
  const halfW = halfH * camera.aspect;
  return { halfW, halfH };
}
