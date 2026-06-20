import {
  RAW_VOLUME_MAX,
  RAW_VOLUME_MIN,
  VOLUME_SMOOTHING,
  normalizeVolume,
  smoothVolume,
  nextVolumeLevel,
} from '../app/speaking_volume';

describe('speaking_volume', () => {
  describe('normalizeVolume', () => {
    it('maps the silence floor and below to 0', () => {
      expect(normalizeVolume(RAW_VOLUME_MIN)).toBe(0);
      expect(normalizeVolume(-2)).toBe(0);
      expect(normalizeVolume(-100)).toBe(0);
    });

    it('maps the max and above to 1', () => {
      expect(normalizeVolume(RAW_VOLUME_MAX)).toBe(1);
      expect(normalizeVolume(50)).toBe(1);
    });

    it('lifts a quiet-but-audible voice well above its linear share (gamma)', () => {
      // raw=2 is 50% of the 0..4 scale; the perceptual curve pushes it to ~66%,
      // so normal speech visibly moves the bars instead of barely lifting them.
      expect(normalizeVolume(2)).toBeGreaterThan(0.6);
      expect(normalizeVolume(2)).toBeLessThan(0.75);
    });

    it('is monotonic across the audible range', () => {
      expect(normalizeVolume(1)).toBeLessThan(normalizeVolume(2));
      expect(normalizeVolume(2)).toBeLessThan(normalizeVolume(3.5));
    });

    it('treats non-finite input as silence', () => {
      // Non-finite payloads (NaN/Infinity/undefined) are a broken native event:
      // safest to read them as silence so the equalizer never crashes or spikes.
      expect(normalizeVolume(Number.NaN)).toBe(0);
      expect(normalizeVolume(Number.POSITIVE_INFINITY)).toBe(0);
      expect(normalizeVolume(Number.NEGATIVE_INFINITY)).toBe(0);
      expect(normalizeVolume(undefined as unknown as number)).toBe(0);
    });
  });

  describe('smoothVolume', () => {
    it('moves the previous value toward the next by the factor', () => {
      // prev=0, next=1, factor=0.4 -> 0.4
      expect(smoothVolume(0, 1, 0.4)).toBeCloseTo(0.4, 5);
      // prev=0.4, next=1, factor=0.4 -> 0.64
      expect(smoothVolume(0.4, 1, 0.4)).toBeCloseTo(0.64, 5);
    });

    it('uses the default smoothing factor when omitted', () => {
      expect(smoothVolume(0, 1)).toBeCloseTo(VOLUME_SMOOTHING, 5);
    });

    it('clamps prev and next into 0..1', () => {
      expect(smoothVolume(5, 5, 0.5)).toBe(1); // both clamp to 1
      expect(smoothVolume(-5, -5, 0.5)).toBe(0); // both clamp to 0
    });

    it('holds the previous level when the next sample is non-finite', () => {
      expect(smoothVolume(0.7, Number.NaN, 0.4)).toBeCloseTo(0.7, 5);
    });

    it('converges toward a sustained level over repeated samples', () => {
      let level = 0;
      for (let i = 0; i < 20; i += 1) level = smoothVolume(level, 1, 0.4);
      expect(level).toBeGreaterThan(0.99);
      expect(level).toBeLessThanOrEqual(1);
    });
  });

  describe('nextVolumeLevel', () => {
    it('composes normalize + smooth in one call', () => {
      // raw=4 (full scale) -> normalized 1; prev 0, factor 0.4 -> 0.4
      expect(nextVolumeLevel(0, 4, 0.4)).toBeCloseTo(0.4, 5);
    });

    it('decays toward silence when the user stops talking', () => {
      let level = 0.8;
      for (let i = 0; i < 30; i += 1) level = nextVolumeLevel(level, -2, 0.4);
      expect(level).toBeLessThan(0.01);
    });
  });
});
