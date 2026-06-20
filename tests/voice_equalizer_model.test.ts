import {
  EQ_BAR_COUNT,
  EQ_BAND_WEIGHTS,
  EQ_INITIAL_STATE,
  advanceEqualizer,
  equalizerBarHeights,
  type EqualizerState,
} from '../app/voice_equalizer_model';

describe('voice_equalizer_model', () => {
  describe('EQ_BAND_WEIGHTS', () => {
    it('has one weight per bar', () => {
      expect(EQ_BAND_WEIGHTS).toHaveLength(EQ_BAR_COUNT);
    });

    it('is a bell curve: centre band is the strongest, edges weakest', () => {
      const centre = (EQ_BAR_COUNT - 1) / 2;
      expect(EQ_BAND_WEIGHTS[centre]).toBeCloseTo(1, 5);
      expect(EQ_BAND_WEIGHTS[0]).toBeLessThan(EQ_BAND_WEIGHTS[centre]);
      expect(EQ_BAND_WEIGHTS[EQ_BAR_COUNT - 1]).toBeLessThan(EQ_BAND_WEIGHTS[centre]);
    });

    it('is symmetric around the centre', () => {
      for (let i = 0; i < Math.floor(EQ_BAR_COUNT / 2); i++) {
        expect(EQ_BAND_WEIGHTS[i]).toBeCloseTo(EQ_BAND_WEIGHTS[EQ_BAR_COUNT - 1 - i], 5);
      }
    });

    it('keeps every weight within 0..1', () => {
      for (const w of EQ_BAND_WEIGHTS) {
        expect(w).toBeGreaterThanOrEqual(0);
        expect(w).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('advanceEqualizer', () => {
    it('raises the level toward a loud sample', () => {
      const next = advanceEqualizer(EQ_INITIAL_STATE, 10);
      expect(next.level).toBeGreaterThan(EQ_INITIAL_STATE.level);
    });

    it('decays the level back toward silence', () => {
      const loud = advanceEqualizer(EQ_INITIAL_STATE, 10);
      const quiet = advanceEqualizer(loud, 0);
      expect(quiet.level).toBeLessThan(loud.level);
    });

    it('holds the previous state on a non-finite sample (dropped frame)', () => {
      const prev: EqualizerState = { level: 0.5, tilt: 0.5 };
      const next = advanceEqualizer(prev, Number.NaN);
      // A dropped frame must not collapse the bars: state is held verbatim.
      expect(next.level).toBeCloseTo(0.5, 5);
      expect(next.tilt).toBeCloseTo(0.5, 5);
    });

    it('brightens the tilt on a sharp loudness jump (transient)', () => {
      // From silence straight to loud = a strong onset -> tilt rises.
      const next = advanceEqualizer(EQ_INITIAL_STATE, 10);
      expect(next.tilt).toBeGreaterThan(EQ_INITIAL_STATE.tilt);
    });

    it('keeps level and tilt within 0..1 across a noisy stream', () => {
      let state = EQ_INITIAL_STATE;
      const stream = [10, 2, 8, -2, 5, 100, 0, 3, NaN, 7];
      for (const s of stream) {
        state = advanceEqualizer(state, s);
        expect(state.level).toBeGreaterThanOrEqual(0);
        expect(state.level).toBeLessThanOrEqual(1);
        expect(state.tilt).toBeGreaterThanOrEqual(0);
        expect(state.tilt).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('equalizerBarHeights', () => {
    it('returns one height per bar', () => {
      expect(equalizerBarHeights(EQ_INITIAL_STATE)).toHaveLength(EQ_BAR_COUNT);
    });

    it('is all-zero at rest (silent)', () => {
      const heights = equalizerBarHeights({ level: 0, tilt: 0.5 });
      for (const h of heights) expect(h).toBe(0);
    });

    it('clamps every bar to 0..1 even at full level and extreme tilt', () => {
      for (const tilt of [0, 0.5, 1]) {
        const heights = equalizerBarHeights({ level: 1, tilt });
        for (const h of heights) {
          expect(h).toBeGreaterThanOrEqual(0);
          expect(h).toBeLessThanOrEqual(1);
        }
      }
    });

    it('grows every bar as overall level rises', () => {
      const quiet = equalizerBarHeights({ level: 0.2, tilt: 0.5 });
      const loud = equalizerBarHeights({ level: 0.8, tilt: 0.5 });
      for (let i = 0; i < EQ_BAR_COUNT; i++) {
        expect(loud[i]).toBeGreaterThan(quiet[i]);
      }
    });

    it('tilts energy toward high bands when the tone is bright', () => {
      const bright = equalizerBarHeights({ level: 0.7, tilt: 1 });
      const dark = equalizerBarHeights({ level: 0.7, tilt: 0 });
      const highIdx = EQ_BAR_COUNT - 1;
      const lowIdx = 0;
      // Bright -> top band higher than in the dark case; dark -> bottom higher.
      expect(bright[highIdx]).toBeGreaterThan(dark[highIdx]);
      expect(dark[lowIdx]).toBeGreaterThan(bright[lowIdx]);
    });
  });
});
