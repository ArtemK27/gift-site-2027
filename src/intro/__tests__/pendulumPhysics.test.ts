import { describe, expect, it } from 'vitest';
import { INTRO_CONFIG } from '../config';
import {
  ARC_EDGE_Y,
  ARC_SAG,
  STAGE_WIDTH,
  applySwipeSegment,
  applyTapImpulse,
  createPendulumBodies,
  evaluateCatenaryY,
  findHitOrnamentIndex,
  getBobPosition,
  isSystemEnergetic,
  stepPendulumSystem,
} from '../scenes/crystalChimes/pendulumPhysics';

describe('pendulumPhysics', () => {
  it('evaluates exact symmetric catenary anchor heights matching the gold arc', () => {
    expect(evaluateCatenaryY(0)).toBeCloseTo(ARC_EDGE_Y, 5);
    expect(evaluateCatenaryY(1)).toBeCloseTo(ARC_EDGE_Y, 5);
    expect(evaluateCatenaryY(0.5)).toBeCloseTo(ARC_EDGE_Y + ARC_SAG, 5);
    expect(evaluateCatenaryY(0.2)).toBeCloseTo(evaluateCatenaryY(0.8), 5);
  });

  it('oscillates under gravity and decays smoothly via air damping without blowing up', () => {
    const bodies = createPendulumBodies(INTRO_CONFIG.step2Chimes.ornaments);
    bodies[0].angle = 0.42;

    let minAngle = bodies[0].angle;
    let nowMs = 0;

    // Simulate 3 seconds at 60fps with zero external drive
    for (let frame = 0; frame < 180; frame++) {
      nowMs += 16.67;
      stepPendulumSystem(bodies, {
        dt: 1 / 60,
        nowMs,
        reducedMotion: true, // disable breeze to test pure damped oscillation
      });
      minAngle = Math.min(minAngle, bodies[0].angle);
      expect(Number.isFinite(bodies[0].angle)).toBe(true);
      expect(Number.isFinite(bodies[0].angularVel)).toBe(true);
    }

    // Swung past vertical to negative side
    expect(minAngle).toBeLessThan(-0.12);
    // Amplitude damped well below initial 0.42 rad after 3 seconds
    expect(Math.abs(bodies[0].angle)).toBeLessThan(0.25);
  });

  it('transfers momentum cleanly between colliding neighbors and respects chime cooldown', () => {
    const bodies = createPendulumBodies(INTRO_CONFIG.step2Chimes.ornaments);
    // Launch ornament 0 strongly toward ornament 1
    bodies[0].angle = 0.12;
    bodies[0].angularVel = 3.8;

    let firstPairCollisions = 0;
    let chimeTriggeredForNeighbor = false;
    let nowMs = 1000;

    for (let frame = 0; frame < 45; frame++) {
      nowMs += 16;
      const events = stepPendulumSystem(bodies, {
        dt: 0.016,
        nowMs,
        chimeCooldownMs: 240,
        reducedMotion: true,
      });
      for (const ev of events) {
        expect(ev.indexB).toBe(ev.indexA + 1);
        expect(Number.isFinite(ev.contactX)).toBe(true);
        expect(Number.isFinite(ev.contactY)).toBe(true);
        if (ev.indexA === 0 && ev.indexB === 1) {
          firstPairCollisions += 1;
        }
        if (ev.chimeIndices.includes(1)) {
          chimeTriggeredForNeighbor = true;
        }
      }
    }

    expect(firstPairCollisions).toBeGreaterThan(0);
    expect(chimeTriggeredForNeighbor).toBe(true);
    // Momentum transferred cleanly to ornament 1 (and can cascade to ornament 2)
    expect(Math.abs(bodies[1].angle) + Math.abs(bodies[1].angularVel) + Math.abs(bodies[2].angularVel)).toBeGreaterThan(0.2);
  });

  it('enforces anti-spam cooldown on rapid consecutive taps', () => {
    const bodies = createPendulumBodies(INTRO_CONFIG.step2Chimes.ornaments);

    const first = applyTapImpulse(bodies, 2, 1, 1000, 3.0, 240);
    const tooSoon = applyTapImpulse(bodies, 2, 1, 1120, 3.0, 240);
    const afterCooldown = applyTapImpulse(bodies, 2, -1, 1300, 3.0, 240);

    expect(first?.shouldChime).toBe(true);
    expect(tooSoon?.shouldChime).toBe(false);
    expect(afterCooldown?.shouldChime).toBe(true);
    expect(bodies[2].shimmer).toBe(1);
  });

  it('sweeps a horizontal swipe across multiple ornaments and excites each once per pass', () => {
    const bodies = createPendulumBodies(INTRO_CONFIG.step2Chimes.ornaments);
    const bob0 = getBobPosition(bodies[0]);
    const bob4 = getBobPosition(bodies[4]);
    const midY = (bob0.y + bob4.y) * 0.5;

    const hits = applySwipeSegment(bodies, 10, midY, 380, midY, 920, 2000, 240);
    expect(hits.length).toBe(5);
    expect(hits.every((h) => h.shouldChime)).toBe(true);
    for (const b of bodies) {
      expect(b.angularVel).toBeGreaterThan(1.5);
    }

    // Immediate duplicate segment within debounce window produces zero duplicate hits
    const dupHits = applySwipeSegment(bodies, 10, midY, 380, midY, 920, 2050, 240);
    expect(dupHits.length).toBe(0);
  });

  it('locates tapped ornament accurately and handles scroll + tilt without instability', () => {
    const bodies = createPendulumBodies(INTRO_CONFIG.step2Chimes.ornaments);
    const centerBob = getBobPosition(bodies[2]);

    expect(findHitOrnamentIndex(bodies, centerBob.x + 6, centerBob.y - 4)).toBe(2);
    expect(findHitOrnamentIndex(bodies, 5, 5)).toBe(-1);

    // Extreme scroll velocity + phone tilt + huge dt frame spike stay clamped & finite
    stepPendulumSystem(bodies, {
      dt: 2.5,
      nowMs: 3000,
      scrollVelocity: 99999,
      tiltAngleRad: 1.5,
      breezeTimeSec: 1.2,
    });
    for (const b of bodies) {
      expect(Number.isFinite(b.angle)).toBe(true);
      expect(Math.abs(b.angle)).toBeLessThanOrEqual(0.78);
    }
  });

  it('keeps outer ornaments strictly inside stage bounds and prevents neighbor string crossing', () => {
    const bodies = createPendulumBodies(INTRO_CONFIG.step2Chimes.ornaments);
    // Slam ornament 0 hard left, ornament 4 hard right, and force neighbors 1 & 2 into extreme head-on clash
    bodies[0].angularVel = -5.2;
    bodies[4].angularVel = 5.2;
    bodies[1].angle = 0.45;
    bodies[1].angularVel = 5.0;
    bodies[2].angle = -0.45;
    bodies[2].angularVel = -5.0;

    let nowMs = 5000;
    for (let frame = 0; frame < 90; frame++) {
      nowMs += 16;
      stepPendulumSystem(bodies, {
        dt: 0.016,
        nowMs,
        scrollVelocity: frame % 2 === 0 ? 2800 : -2800,
        reducedMotion: true,
      });

      const firstPos = getBobPosition(bodies[0]);
      const lastPos = getBobPosition(bodies[bodies.length - 1]);
      expect(firstPos.x - bodies[0].spec.radiusX).toBeGreaterThanOrEqual(0);
      expect(lastPos.x + bodies[bodies.length - 1].spec.radiusX).toBeLessThanOrEqual(STAGE_WIDTH);

      for (let i = 0; i < bodies.length - 1; i++) {
        expect(getBobPosition(bodies[i]).x).toBeLessThan(getBobPosition(bodies[i + 1]).x);
      }
    }
  });

  it('reports energetic state accurately and settles cleanly to rest under reduced motion', () => {
    const bodies = createPendulumBodies(INTRO_CONFIG.step2Chimes.ornaments);
    expect(isSystemEnergetic(bodies)).toBe(false);

    applyTapImpulse(bodies, 2, 1, 1000, 2.5, 240);
    expect(isSystemEnergetic(bodies)).toBe(true);

    let nowMs = 1000;
    for (let frame = 0; frame < 900; frame++) {
      nowMs += 16.67;
      stepPendulumSystem(bodies, { dt: 1 / 60, nowMs, reducedMotion: true });
    }
    expect(isSystemEnergetic(bodies)).toBe(false);
  });
});
