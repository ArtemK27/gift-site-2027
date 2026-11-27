import { describe, expect, it } from 'vitest';
import {
  MOCHI_REST_CENTER_X,
  MOCHI_REST_CENTER_Y,
  MOCHI_RING_COUNT,
  MOCHI_STAGE_SIZE,
  computeRingSignedArea,
  createMochiSoftBody,
  moveMochiPointer,
  releaseMochiPointer,
  startMochiPointer,
  stepMochiSoftBody,
} from './mochiPhysics';

function runSteps(state: ReturnType<typeof createMochiSoftBody>, count: number, dt = 1 / 60) {
  let metrics = state.metrics;
  for (let i = 0; i < count; i++) {
    metrics = stepMochiSoftBody(state, dt, false);
  }
  return metrics;
}

describe('mochiPhysics soft-body engine', () => {
  it('initializes a valid positive-area closed ring in idle state with open eyes', () => {
    const body = createMochiSoftBody();
    expect(body.nodes).toHaveLength(MOCHI_RING_COUNT);
    expect(body.restArea).toBeGreaterThan(10000);
    expect(computeRingSignedArea(body.nodes)).toBeCloseTo(body.restArea, 3);

    const m = runSteps(body, 30);
    expect(m.emotion).toBe('idle');
    expect(m.blinkAmount).toBe(0);
    expect(m.areaRatio).toBeGreaterThan(0.95);
    expect(m.areaRatio).toBeLessThan(1.05);
  });

  it('supports 1-finger cheek drag: stretches elastically, triggers surprised emotion, and rebounds smoothly on release', () => {
    const body = createMochiSoftBody();
    const grabX = MOCHI_REST_CENTER_X + 68;
    const grabY = MOCHI_REST_CENTER_Y;

    const start = startMochiPointer(body, 1, grabX, grabY);
    expect(start.hit).toBe(true);

    // Pull right cheek outward like stretchy mochi
    moveMochiPointer(body, 1, grabX + 90, grabY - 12);
    const pulled = runSteps(body, 35);

    expect(pulled.stretchX).toBeGreaterThan(1.22);
    expect(pulled.maxNodeStretch).toBeGreaterThan(1.32);
    expect(pulled.emotion).toBe('surprised');
    expect(computeRingSignedArea(body.nodes)).toBeGreaterThan(0);

    // Release and confirm rebound + eventual return to rest
    const rel = releaseMochiPointer(body, 1);
    expect(rel.released).toBe(true);
    expect(rel.bounced).toBe(true);
    expect(rel.intensity).toBeGreaterThan(0.45);

    const rightAfter = runSteps(body, 8);
    expect(['happy', 'squish', 'surprised', 'idle']).toContain(rightAfter.emotion);

    // Settle back to calm idle shape
    const settled = runSteps(body, 220);
    expect(settled.emotion).toBe('idle');
    expect(settled.stretchX).toBeGreaterThan(0.95);
    expect(settled.stretchX).toBeLessThan(1.06);
    expect(settled.energy).toBeLessThan(0.08);
  });

  it('supports 2-finger simultaneous stretch into a wide pancake', () => {
    const body = createMochiSoftBody();
    const leftX = MOCHI_REST_CENTER_X - 64;
    const rightX = MOCHI_REST_CENTER_X + 64;
    const midY = MOCHI_REST_CENTER_Y;

    expect(startMochiPointer(body, 10, leftX, midY).hit).toBe(true);
    expect(startMochiPointer(body, 20, rightX, midY).hit).toBe(true);

    moveMochiPointer(body, 10, leftX - 75, midY);
    moveMochiPointer(body, 20, rightX + 75, midY);

    const stretched = runSteps(body, 40);
    expect(stretched.activePointers).toBe(2);
    expect(stretched.stretchX).toBeGreaterThan(1.38);
    // Area preservation should keep it from ballooning unrealistically
    expect(stretched.stretchY).toBeLessThan(1.06);
    expect(stretched.emotion).toBe('surprised');

    releaseMochiPointer(body, 10);
    releaseMochiPointer(body, 20);
    const settled = runSteps(body, 240);
    expect(settled.activePointers).toBe(0);
    expect(settled.emotion).toBe('idle');
  });

  it('supports 2-finger pinch/squeeze into a plump tall droplet via area preservation', () => {
    const body = createMochiSoftBody();
    const leftX = MOCHI_REST_CENTER_X - 68;
    const rightX = MOCHI_REST_CENTER_X + 68;
    const midY = MOCHI_REST_CENTER_Y;

    startMochiPointer(body, 1, leftX, midY);
    startMochiPointer(body, 2, rightX, midY);

    // Pinch both cheeks inward
    moveMochiPointer(body, 1, leftX + 46, midY);
    moveMochiPointer(body, 2, rightX - 46, midY);

    const pinched = runSteps(body, 45);
    expect(pinched.stretchX).toBeLessThan(0.88);
    expect(pinched.stretchY).toBeGreaterThan(1.06);
    expect(pinched.squeeze).toBeGreaterThan(0.2);
    expect(['squish', 'surprised']).toContain(pinched.emotion);
    expect(computeRingSignedArea(body.nodes)).toBeGreaterThan(body.restArea * 0.55);
  });

  it('never explodes, produces NaN, or inverts polygon winding under violent extreme drags', () => {
    const body = createMochiSoftBody();
    startMochiPointer(body, 1, MOCHI_REST_CENTER_X - 50, MOCHI_REST_CENTER_Y);
    startMochiPointer(body, 2, MOCHI_REST_CENTER_X + 50, MOCHI_REST_CENTER_Y);

    // Violent crossing yank far outside the viewport
    moveMochiPointer(body, 1, 9000, -5000);
    moveMochiPointer(body, 2, -9000, 5000);
    runSteps(body, 60, 1 / 20);

    // Reverse instantaneously
    moveMochiPointer(body, 1, -8000, 4000);
    moveMochiPointer(body, 2, 8000, -4000);
    runSteps(body, 60, 1 / 20);

    releaseMochiPointer(body, 1);
    releaseMochiPointer(body, 2);
    runSteps(body, 90, 1 / 60);

    // Verify finite, bounded coordinates and strictly positive area (no inversion)
    expect(Number.isFinite(body.center.x)).toBe(true);
    expect(Number.isFinite(body.center.y)).toBe(true);
    for (const node of body.nodes) {
      expect(Number.isFinite(node.x)).toBe(true);
      expect(Number.isFinite(node.y)).toBe(true);
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x).toBeLessThanOrEqual(MOCHI_STAGE_SIZE);
      expect(node.y).toBeGreaterThanOrEqual(0);
      expect(node.y).toBeLessThanOrEqual(MOCHI_STAGE_SIZE);
    }

    const area = computeRingSignedArea(body.nodes);
    expect(area).toBeGreaterThan(body.restArea * 0.35);

    // Verify strictly clockwise ordering around center
    let positiveWindingEdges = 0;
    for (let i = 0; i < MOCHI_RING_COUNT; i++) {
      const a = body.nodes[i];
      const b = body.nodes[(i + 1) % MOCHI_RING_COUNT];
      const cross =
        (a.x - body.center.x) * (b.y - body.center.y) -
        (a.y - body.center.y) * (b.x - body.center.x);
      if (cross > 0) positiveWindingEdges++;
    }
    expect(positiveWindingEdges).toBe(MOCHI_RING_COUNT);
  });

  it('never collapses or enters a perpetual spin when swirled rapidly in circles with 1 finger', () => {
    const body = createMochiSoftBody();
    const orbitR = 92;
    startMochiPointer(body, 7, MOCHI_REST_CENTER_X + orbitR, MOCHI_REST_CENTER_Y);

    // Rapidly swirl 5 full 360-degree circles around the cat
    const totalSteps = 180;
    for (let step = 1; step <= totalSteps; step++) {
      const theta = (step / totalSteps) * Math.PI * 2 * 5;
      moveMochiPointer(
        body,
        7,
        MOCHI_REST_CENTER_X + Math.cos(theta) * orbitR,
        MOCHI_REST_CENTER_Y + Math.sin(theta) * orbitR,
      );
      const m = stepMochiSoftBody(body, 1 / 60, false);

      // Must never collapse into a tiny inverted ball at any point during the swirl
      expect(m.areaRatio).toBeGreaterThan(0.55);
      expect(computeRingSignedArea(body.nodes)).toBeGreaterThan(body.restArea * 0.55);
    }

    releaseMochiPointer(body, 7);

    // Must NOT keep spinning on its own; must settle calmly back to idle within ~2.5s
    const settled = runSteps(body, 150, 1 / 60);
    expect(settled.emotion).toBe('idle');
    expect(settled.energy).toBeLessThan(0.08);
    expect(settled.areaRatio).toBeGreaterThan(0.92);
    expect(settled.areaRatio).toBeLessThan(1.08);
    expect(settled.stretchX).toBeGreaterThan(0.94);
    expect(settled.stretchX).toBeLessThan(1.06);
  });

  it('never twists inside-out when spun 360 degrees like a steering wheel with 2 fingers', () => {
    const body = createMochiSoftBody();
    const orbitR = 72;
    startMochiPointer(body, 1, MOCHI_REST_CENTER_X - orbitR, MOCHI_REST_CENTER_Y);
    startMochiPointer(body, 2, MOCHI_REST_CENTER_X + orbitR, MOCHI_REST_CENTER_Y);

    const totalSteps = 140;
    for (let step = 1; step <= totalSteps; step++) {
      const theta = (step / totalSteps) * Math.PI * 2 * 3;
      moveMochiPointer(
        body,
        1,
        MOCHI_REST_CENTER_X - Math.cos(theta) * orbitR,
        MOCHI_REST_CENTER_Y - Math.sin(theta) * orbitR,
      );
      moveMochiPointer(
        body,
        2,
        MOCHI_REST_CENTER_X + Math.cos(theta) * orbitR,
        MOCHI_REST_CENTER_Y + Math.sin(theta) * orbitR,
      );
      const m = stepMochiSoftBody(body, 1 / 60, false);
      expect(m.areaRatio).toBeGreaterThan(0.5);

      // Every adjacent pair must maintain strict clockwise order around center
      for (let i = 0; i < MOCHI_RING_COUNT; i++) {
        const a = body.nodes[i];
        const b = body.nodes[(i + 1) % MOCHI_RING_COUNT];
        const cross =
          (a.x - body.center.x) * (b.y - body.center.y) -
          (a.y - body.center.y) * (b.x - body.center.x);
        expect(cross).toBeGreaterThan(0);
      }
    }

    releaseMochiPointer(body, 1);
    releaseMochiPointer(body, 2);
    const settled = runSteps(body, 150, 1 / 60);
    expect(settled.emotion).toBe('idle');
    expect(settled.energy).toBeLessThan(0.08);
    expect(settled.areaRatio).toBeGreaterThan(0.92);
  });
});
