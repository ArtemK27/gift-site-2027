import { describe, expect, it } from 'vitest';
import { sampleStarPose } from '../scenes/winterScroll/starChoreography';

describe('sampleStarPose', () => {
  it('starts hidden above viewport at progress 0 and exits hidden at progress 1', () => {
    const start = sampleStarPose(0);
    const end = sampleStarPose(1);

    expect(start.opacity).toBe(0);
    expect(start.yNorm).toBeGreaterThan(1);
    expect(end.opacity).toBe(0);
    expect(end.yNorm).toBeGreaterThan(1);
  });

  it('stays visible and well-bounded across active mid-scroll beats', () => {
    const samples = [0.25, 0.47, 0.6, 0.72, 0.85].map((p) => sampleStarPose(p));
    for (const pose of samples) {
      expect(pose.opacity).toBeGreaterThan(0.9);
      expect(Math.abs(pose.xNorm)).toBeLessThanOrEqual(0.7);
      expect(pose.scale).toBeGreaterThan(0.4);
      expect(Number.isFinite(pose.rotY)).toBe(true);
    }
  });

  it('clamps out-of-range progress cleanly without NaN', () => {
    expect(sampleStarPose(-0.5)).toEqual(sampleStarPose(0));
    expect(sampleStarPose(1.8)).toEqual(sampleStarPose(1));
  });
});
