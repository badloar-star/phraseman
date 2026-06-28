import {
  analyzeProsody,
  expectedStressPosition,
  stressFeedback,
  type LoudnessSample,
} from '../app/speaking_prosody';

function ramp(values: number[], stepMs = 250): LoudnessSample[] {
  return values.map((value, i) => ({ value, atMs: i * stepMs }));
}

describe('speaking prosody', () => {
  it('returns empty contour when there are too few samples', () => {
    const r = analyzeProsody(ramp([1, 2]));
    expect(r.contour).toEqual([]);
    expect(r.stressedAt).toBeNull();
  });

  it('locates the stressed (loudest) region near its time position', () => {
    // Peak in the middle.
    const r = analyzeProsody(ramp([0, 1, 6, 8, 6, 1, 0]));
    expect(r.stressedAt).not.toBeNull();
    expect(r.stressedAt!).toBeGreaterThan(0.3);
    expect(r.stressedAt!).toBeLessThan(0.7);
    expect(r.monotone).toBe(false);
  });

  it('flags a flat contour as monotone', () => {
    const r = analyzeProsody(ramp([3, 3, 3, 3, 3, 3]));
    expect(r.monotone).toBe(true);
  });

  it('normalizes contour levels into 0..1', () => {
    const r = analyzeProsody(ramp([0, 2, 4, 8, 4, 2]));
    for (const p of r.contour) {
      expect(p.level).toBeGreaterThanOrEqual(0);
      expect(p.level).toBeLessThanOrEqual(1);
      expect(p.t).toBeGreaterThanOrEqual(0);
      expect(p.t).toBeLessThanOrEqual(1);
    }
  });

  it('estimates expected stress on the longest content word', () => {
    // "beautiful" is the longest → stress should land in the back half.
    const pos = expectedStressPosition('it is beautiful');
    expect(pos).not.toBeNull();
    expect(pos!).toBeGreaterThan(0.5);
  });

  it('gives on_target / too_early / too_late / monotone feedback', () => {
    const peakMid = analyzeProsody(ramp([0, 1, 8, 8, 1, 0]));
    expect(stressFeedback(peakMid, 0.5)).toBe('on_target');
    expect(stressFeedback(peakMid, 0.95)).toBe('too_early');
    expect(stressFeedback(peakMid, 0.05)).toBe('too_late');

    const flat = analyzeProsody(ramp([3, 3, 3, 3, 3]));
    expect(stressFeedback(flat, 0.5)).toBe('monotone');
  });
});
