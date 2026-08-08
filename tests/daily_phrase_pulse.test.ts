import {
  claimDailyPhrasePulseForDay,
  isDailyPhraseCardHalfVisible,
} from '../app/daily_phrase_pulse';

describe('daily phrase pulse policy', () => {
  it('requires at least half the card to intersect the viewport', () => {
    expect(isDailyPhraseCardHalfVisible({
      cardTop: 700,
      cardHeight: 100,
      scrollY: 0,
      viewportHeight: 749,
    })).toBe(false);
    expect(isDailyPhraseCardHalfVisible({
      cardTop: 700,
      cardHeight: 100,
      scrollY: 0,
      viewportHeight: 750,
    })).toBe(true);
  });

  it('claims only once for the same local day and allows the next day', async () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: jest.fn(async (key: string) => values.get(key) ?? null),
      setItem: jest.fn(async (key: string, value: string) => {
        values.set(key, value);
      }),
    };

    await expect(claimDailyPhrasePulseForDay('2026-08-08', storage)).resolves.toBe(true);
    await expect(claimDailyPhrasePulseForDay('2026-08-08', storage)).resolves.toBe(false);
    await expect(claimDailyPhrasePulseForDay('2026-08-09', storage)).resolves.toBe(true);
  });

  it('rejects invalid geometry instead of consuming the daily cue', () => {
    expect(isDailyPhraseCardHalfVisible({
      cardTop: 0,
      cardHeight: 0,
      scrollY: 0,
      viewportHeight: 800,
    })).toBe(false);
    expect(isDailyPhraseCardHalfVisible({
      cardTop: 0,
      cardHeight: 100,
      scrollY: 0,
      viewportHeight: 0,
    })).toBe(false);
  });

  it('fails closed when the daily marker cannot be read', async () => {
    const storage = {
      getItem: jest.fn(async () => { throw new Error('storage unavailable'); }),
      setItem: jest.fn(async () => {}),
    };

    await expect(claimDailyPhrasePulseForDay('2026-08-08', storage)).resolves.toBe(false);
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});
