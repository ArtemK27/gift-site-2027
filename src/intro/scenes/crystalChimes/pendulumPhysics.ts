import type { ChimeOrnamentConfig } from '../../config';

export const STAGE_WIDTH = 390;
export const STAGE_HEIGHT = 336;
export const ARC_EDGE_Y = 22;
export const ARC_SAG = 36;

const GRAVITY_PX = 1180;
const AIR_DAMPING = 0.56;
const MAX_ANGLE_RAD = 0.54;
const STAGE_MARGIN_X = 8;
const MAX_ANGULAR_VEL = 5.2;
const COLLISION_RESTITUTION = 0.78;
const SWIPE_DEBOUNCE_MS = 190;

export interface PendulumSpec {
  id: string;
  anchorX: number;
  anchorY: number;
  length: number;
  radiusX: number;
  radiusY: number;
  mass: number;
  chimePitch: number;
  minAngle: number;
  maxAngle: number;
}

export interface PendulumBody {
  spec: PendulumSpec;
  angle: number; // radians, 0 = vertical down, + = swung right
  angularVel: number; // rad/s
  shimmer: number; // 0..1 highlight glow decay
  lastChimeTimeMs: number;
  lastSwipeTimeMs: number;
}

export interface BobPosition {
  x: number;
  y: number;
}

export interface CollisionEvent {
  indexA: number;
  indexB: number;
  contactX: number;
  contactY: number;
  impactSpeed: number;
  chimeIndices: number[];
}

export interface SwipeHitEvent {
  index: number;
  contactX: number;
  contactY: number;
  shouldChime: boolean;
}

export interface StepPhysicsOptions {
  dt: number;
  nowMs: number;
  scrollVelocity?: number;
  tiltAngleRad?: number;
  breezeTimeSec?: number;
  chimeCooldownMs?: number;
  reducedMotion?: boolean;
}

/**
 * Exact quadratic Bezier arc height matching `M 0 22 Q 195 94 390 22`.
 */
export function evaluateCatenaryY(xNorm: number): number {
  const u = Math.max(0, Math.min(1, xNorm));
  const centered = 2 * u - 1;
  return ARC_EDGE_Y + ARC_SAG * (1 - centered * centered);
}

/**
 * Builds initial vertical-rest pendulum bodies from config definitions with
 * per-ornament safe horizontal angle bounds so outer ornaments never clip off stage.
 */
export function createPendulumBodies(
  ornaments: ReadonlyArray<ChimeOrnamentConfig>,
): PendulumBody[] {
  return ornaments.map((cfg) => {
    const anchorX = cfg.anchorXNorm * STAGE_WIDTH;
    const minSafeX = STAGE_MARGIN_X + cfg.radiusX;
    const maxSafeX = STAGE_WIDTH - STAGE_MARGIN_X - cfg.radiusX;
    const leftRatio = clamp((minSafeX - anchorX) / cfg.stringLength, -0.95, 0);
    const rightRatio = clamp((maxSafeX - anchorX) / cfg.stringLength, 0, 0.95);
    const minAngle = Math.max(-MAX_ANGLE_RAD, Math.asin(leftRatio));
    const maxAngle = Math.min(MAX_ANGLE_RAD, Math.asin(rightRatio));

    return {
      spec: {
        id: cfg.id,
        anchorX,
        anchorY: evaluateCatenaryY(cfg.anchorXNorm),
        length: cfg.stringLength,
        radiusX: cfg.radiusX,
        radiusY: cfg.radiusY,
        mass: cfg.mass,
        chimePitch: cfg.chimePitch,
        minAngle,
        maxAngle,
      },
      angle: 0,
      angularVel: 0,
      shimmer: 0,
      lastChimeTimeMs: -10_000,
      lastSwipeTimeMs: -10_000,
    };
  });
}

/**
 * Computes current 2D bob center in logical stage coordinates.
 */
export function getBobPosition(body: PendulumBody): BobPosition {
  return {
    x: body.spec.anchorX + body.spec.length * Math.sin(body.angle),
    y: body.spec.anchorY + body.spec.length * Math.cos(body.angle),
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Advances all pendulums by `dt` seconds with sub-stepped nonlinear gravity, air damping,
 * scroll inertia, gentle device tilt equilibrium, and neighbor-to-neighbor elastic collisions.
 */
export function stepPendulumSystem(
  bodies: PendulumBody[],
  options: StepPhysicsOptions,
): CollisionEvent[] {
  const rawDt = Number.isFinite(options.dt) ? options.dt : 0;
  const dt = clamp(rawDt, 0, 0.05);
  if (dt <= 0 || bodies.length === 0) return [];

  const nowMs = options.nowMs;
  const scrollVel = clamp(options.scrollVelocity ?? 0, -2800, 2800);
  const tiltRad = clamp(options.tiltAngleRad ?? 0, -0.28, 0.28);
  const breezeT = options.breezeTimeSec ?? 0;
  const chimeCooldownMs = options.chimeCooldownMs ?? 240;
  const reducedMotion = options.reducedMotion ?? false;

  const subSteps = 2;
  const subDt = dt / subSteps;
  const collisions: CollisionEvent[] = [];

  for (let step = 0; step < subSteps; step++) {
    // 1. Integrate individual damped nonlinear pendulums
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      const { length, mass } = b.spec;

      // Gravitational restoring acceleration shifted by subtle device tilt
      const gravAcc = -(GRAVITY_PX / length) * Math.sin(b.angle - tiltRad);

      // Gentle scroll-velocity excitation (varies naturally across string phase & mass)
      const scrollPhase = i % 2 === 0 ? 1 : 0.82;
      const scrollDrive = reducedMotion
        ? 0
        : (scrollVel * 0.00145 * scrollPhase) / Math.sqrt(mass);

      // Whisper-soft ambient winter air draft so ornaments feel alive
      const breezeDrive = reducedMotion
        ? 0
        : Math.sin(breezeT * 0.85 + i * 1.15) * 0.065;

      const dampingAcc = -AIR_DAMPING * b.angularVel;
      const angularAcc = gravAcc + dampingAcc + scrollDrive + breezeDrive;

      b.angularVel = clamp(b.angularVel + angularAcc * subDt, -MAX_ANGULAR_VEL, MAX_ANGULAR_VEL);
      b.angle += b.angularVel * subDt;

      if (b.angle > b.spec.maxAngle) {
        b.angle = b.spec.maxAngle;
        if (b.angularVel > 0) b.angularVel *= -0.42;
      } else if (b.angle < b.spec.minAngle) {
        b.angle = b.spec.minAngle;
        if (b.angularVel < 0) b.angularVel *= -0.42;
      }

      // Decay highlight shimmer smoothly
      b.shimmer *= Math.exp(-subDt * 2.8);
      if (b.shimmer < 0.005) b.shimmer = 0;
    }

    // 2. Resolve soft elastic collisions between adjacent ornaments (preserving left-to-right order)
    for (let i = 0; i < bodies.length - 1; i++) {
      const a = bodies[i];
      const b = bodies[i + 1];

      const posA = getBobPosition(a);
      const posB = getBobPosition(b);

      const dx = posB.x - posA.x;
      const dy = posB.y - posA.y;
      const rxSum = a.spec.radiusX + b.spec.radiusX;
      const rySum = a.spec.radiusY + b.spec.radiusY;

      const nx = dx / rxSum;
      const ny = dy / rySum;
      const normDistSq = nx * nx + ny * ny;

      // Also catch horizontal order inversion (dx <= 0) so strings can never tangle/cross
      if (dx > 0 && normDistSq >= 1.0) continue;

      const normDist = Math.sqrt(Math.max(0.0001, normDistSq));
      const invMassA = 1 / a.spec.mass;
      const invMassB = 1 / b.spec.mass;
      const invMassSum = invMassA + invMassB;

      // Always separate along ordered left->right axis (+1) so neighbor strings never cross
      const overlapPx =
        dx <= 0 ? Math.min(rxSum * 1.4, rxSum - dx) : (1 - normDist) * rxSum * 0.56;
      const cosA = Math.max(0.45, Math.cos(a.angle));
      const cosB = Math.max(0.45, Math.cos(b.angle));

      a.angle = clamp(
        a.angle - (overlapPx * (invMassA / invMassSum)) / (a.spec.length * cosA),
        a.spec.minAngle,
        a.spec.maxAngle,
      );
      b.angle = clamp(
        b.angle + (overlapPx * (invMassB / invMassSum)) / (b.spec.length * cosB),
        b.spec.minAngle,
        b.spec.maxAngle,
      );

      // Horizontal tangential velocities at bob centers
      const vxA = a.angularVel * a.spec.length * cosA;
      const vxB = b.angularVel * b.spec.length * cosB;
      const relApproach = vxA - vxB;

      if (relApproach <= 8) continue;

      // 1D elastic collision impulse transfer
      const impulse = ((1 + COLLISION_RESTITUTION) * relApproach) / invMassSum;
      const nextVxA = vxA - impulse * invMassA;
      const nextVxB = vxB + impulse * invMassB;

      a.angularVel = clamp(nextVxA / (a.spec.length * cosA), -MAX_ANGULAR_VEL, MAX_ANGULAR_VEL);
      b.angularVel = clamp(nextVxB / (b.spec.length * cosB), -MAX_ANGULAR_VEL, MAX_ANGULAR_VEL);

      const impactNorm = clamp(relApproach / 240, 0.25, 1);
      a.shimmer = Math.max(a.shimmer, impactNorm);
      b.shimmer = Math.max(b.shimmer, impactNorm);

      if (relApproach > 16) {
        const chimeIndices: number[] = [];
        if (relApproach > 28) {
          if (nowMs - a.lastChimeTimeMs >= chimeCooldownMs) {
            a.lastChimeTimeMs = nowMs;
            chimeIndices.push(i);
          }
          if (nowMs - b.lastChimeTimeMs >= chimeCooldownMs) {
            b.lastChimeTimeMs = nowMs;
            chimeIndices.push(i + 1);
          }
        }

        const weightA = b.spec.radiusX / rxSum;
        const weightB = a.spec.radiusX / rxSum;
        collisions.push({
          indexA: i,
          indexB: i + 1,
          contactX: posA.x * weightA + posB.x * weightB,
          contactY: (posA.y + posB.y) * 0.5,
          impactSpeed: relApproach,
          chimeIndices,
        });
      }
    }
  }

  return collisions;
}

/**
 * Applies a crisp tactile tap impulse to a single ornament and reports whether a chime should sound.
 */
export function applyTapImpulse(
  bodies: PendulumBody[],
  index: number,
  directionSign: number,
  nowMs: number,
  strength = 2.85,
  chimeCooldownMs = 240,
): { contactX: number; contactY: number; shouldChime: boolean } | null {
  const body = bodies[index];
  if (!body) return null;

  const sign = directionSign < 0 ? -1 : 1;
  const scaledKick = (strength / Math.sqrt(body.spec.mass)) * sign;
  body.angularVel = clamp(body.angularVel + scaledKick, -MAX_ANGULAR_VEL, MAX_ANGULAR_VEL);
  body.shimmer = 1;

  let shouldChime = false;
  if (nowMs - body.lastChimeTimeMs >= chimeCooldownMs) {
    body.lastChimeTimeMs = nowMs;
    shouldChime = true;
  }

  const pos = getBobPosition(body);
  return { contactX: pos.x, contactY: pos.y, shouldChime };
}

/**
 * Finds the ornament bob closest to `(x, y)` within generous touch padding.
 */
export function findHitOrnamentIndex(
  bodies: ReadonlyArray<PendulumBody>,
  x: number,
  y: number,
  paddingPx = 18,
): number {
  let bestIdx = -1;
  let bestNormDist = 1;

  for (let i = 0; i < bodies.length; i++) {
    const body = bodies[i];
    const pos = getBobPosition(body);
    const rx = Math.max(36, body.spec.radiusX + paddingPx);
    const ry = Math.max(42, body.spec.radiusY + paddingPx);
    const dx = (x - pos.x) / rx;
    const dy = (y - pos.y) / ry;
    const normDist = Math.hypot(dx, dy);
    if (normDist <= bestNormDist) {
      bestNormDist = normDist;
      bestIdx = i;
    }
  }

  return bestIdx;
}

function pointToSegmentDistSq(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const abx = bx - ax;
  const aby = by - ay;
  const lenSq = abx * abx + aby * aby;
  if (lenSq < 0.0001) {
    const dx = px - ax;
    const dy = py - ay;
    return dx * dx + dy * dy;
  }
  const t = clamp(((px - ax) * abx + (py - ay) * aby) / lenSq, 0, 1);
  const cx = ax + abx * t;
  const cy = ay + aby * t;
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy;
}

/**
 * Sweeps a horizontal finger gesture segment across the garland, imparting realistic
 * directional impulses to every crossed ornament without spam-retriggering.
 */
export function applySwipeSegment(
  bodies: PendulumBody[],
  prevX: number,
  prevY: number,
  currX: number,
  currY: number,
  vxPxPerSec: number,
  nowMs: number,
  chimeCooldownMs = 240,
): SwipeHitEvent[] {
  const hits: SwipeHitEvent[] = [];
  const clampedVx = clamp(vxPxPerSec, -1500, 1500);
  const swipeSign = clampedVx >= 0 ? 1 : -1;
  const speedRatio = clamp(Math.abs(clampedVx) / 680, 0.35, 1.35);

  for (let i = 0; i < bodies.length; i++) {
    const body = bodies[i];
    if (nowMs - body.lastSwipeTimeMs < SWIPE_DEBOUNCE_MS) continue;

    const pos = getBobPosition(body);
    // Allow swiping across either the bob or lower half of its hanging thread
    const midY = (body.spec.anchorY + pos.y) * 0.55 + pos.y * 0.45;
    const hitRadius = Math.max(body.spec.radiusX + 18, body.spec.radiusY + 12);
    const distSq = pointToSegmentDistSq(pos.x, pos.y, prevX, prevY, currX, currY);
    const threadDistSq = pointToSegmentDistSq(
      (body.spec.anchorX + pos.x) * 0.5,
      midY,
      prevX,
      prevY,
      currX,
      currY,
    );

    if (distSq <= hitRadius * hitRadius || threadDistSq <= 26 * 26) {
      body.lastSwipeTimeMs = nowMs;
      const kick = (swipeSign * (2.35 * speedRatio + 0.85)) / Math.sqrt(body.spec.mass);
      body.angularVel = clamp(body.angularVel + kick, -MAX_ANGULAR_VEL, MAX_ANGULAR_VEL);
      body.shimmer = 1;

      let shouldChime = false;
      if (nowMs - body.lastChimeTimeMs >= chimeCooldownMs) {
        body.lastChimeTimeMs = nowMs;
        shouldChime = true;
      }

      hits.push({
        index: i,
        contactX: pos.x,
        contactY: pos.y,
        shouldChime,
      });
    }
  }

  return hits;
}

/**
 * Checks whether all pendulums have effectively settled near vertical rest.
 */
export function isSystemEnergetic(bodies: ReadonlyArray<PendulumBody>): boolean {
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    if (Math.abs(b.angle) > 0.008 || Math.abs(b.angularVel) > 0.015 || b.shimmer > 0.02) {
      return true;
    }
  }
  return false;
}
