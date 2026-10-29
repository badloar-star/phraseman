import {
  SPIRE_STATISTICS_PROGRESS_MAX_CHARS,
  aggregateAdminSpireStatistics,
} from './admin_spire_statistics_core';

const WEEK = '2026-W43';
const CAP = 10_000;

function record(lang: 'en' | 'es' | 'de' | 'fr' | 'it', steps: unknown, over: Record<string, unknown> = {}) {
  return {
    schemaVersion: 'spire-week-record.v1',
    weekKey: WEEK,
    lang,
    tier: 0,
    steps,
    reachedAtMs: 1,
    totalMs: 1,
    packHash: 'pack_hash_123',
    failedAttempts: 0,
    lastCompletedAtMs: 1,
    recentPassedAtMs: [],
    updatedAtMs: 1,
    goldDay: '',
    goldCount: 0,
    ...over,
  };
}

function user(progressValue?: unknown, over: Record<string, unknown> = {}) {
  return {
    id: 'private-id-must-not-be-returned',
    progress: progressValue === undefined ? {} : { spire_week_v1: progressValue },
    ...over,
  };
}

function aggregate(rows: readonly Record<string, unknown>[], over: Partial<Parameters<typeof aggregateAdminSpireStatistics>[0]> = {}) {
  return aggregateAdminSpireStatistics({
    rows,
    generatedWeek: WEEK,
    cap: CAP,
    truncated: false,
    sourceError: null,
    ...over,
  });
}

describe('admin Spire floor statistics', () => {
  it.each([
    [0, 1], [1, 1], [4, 1], [5, 2], [8, 2], [9, 2], [10, 2], [11, 3],
    [17, 3], [18, 4], [25, 4], [26, 5], [34, 5], [35, 6], [44, 6],
    [45, 7], [54, 7], [55, 8], [64, 8], [65, 9], [74, 9], [75, 10],
    [84, 10], [85, 11], [94, 11], [95, 12], [104, 12], [105, 13],
    [114, 13], [115, 14], [124, 14], [125, 15], [134, 15],
  ])('places %i completed steps on physical floor %i', (steps, expectedFloor) => {
    const result = aggregate([user(JSON.stringify({ en: record('en', steps) }))]);
    const english = result.languages.find((language) => language.lang === 'en');
    expect(english?.floors.find((bucket) => bucket.count === 1)?.floor).toBe(expectedFloor);
    expect(english?.completedProfiles).toBe(0);
  });

  it('maps the real 0..134 step boundaries to physical floors 1..15 and treats 135 as completed', () => {
    const lowerBounds = [0, 5, 11, 18, 26, 35, 45, 55, 65, 75, 85, 95, 105, 115, 125];
    const rows = [...lowerBounds, 135].map((steps, index) => user(JSON.stringify({
      en: record('en', steps),
    }), { id: `u${index}` }));

    const result = aggregate(rows);
    const english = result.languages.find((language) => language.lang === 'en');

    expect(result.generatedWeek).toBe(WEEK);
    expect(english?.floors).toEqual(lowerBounds.map((_, index) => ({ floor: index + 1, count: 1 })));
    expect(english?.completedProfiles).toBe(1);
    expect(english?.knownProfiles).toBe(16);
    expect(JSON.stringify(result)).not.toContain('private-id-must-not-be-returned');
  });

  it('counts all five languages independently and excludes hidden identities from every denominator', () => {
    const progress = Object.fromEntries((['en', 'es', 'de', 'fr', 'it'] as const)
      .map((lang, index) => [lang, record(lang, index)]));
    const result = aggregate([
      user(JSON.stringify(progress), { id: 'visible' }),
      user(JSON.stringify(progress), { id: 'hidden', identityHidden: true }),
    ]);

    expect(result.coverage).toEqual({
      scannedProfiles: 2,
      visibleProfiles: 1,
      hiddenProfilesExcluded: 1,
      cap: CAP,
      truncated: false,
      sourceError: null,
    });
    for (const language of result.languages) {
      expect(language.knownProfiles).toBe(1);
      expect(language.missingProfiles).toBe(0);
      expect(language.staleProfiles).toBe(0);
      expect(language.invalidProfiles).toBe(0);
    }
  });

  it('keeps missing, stale and invalid profiles separate without repairing malformed wire values', () => {
    const rows = [
      user(undefined, { id: 'missing' }),
      user(JSON.stringify({ en: record('en', 2, { weekKey: '2026-W42' }) }), { id: 'stale' }),
      user('{oops', { id: 'malformed-json' }),
      user(JSON.stringify({ ru: record('en', 2) }), { id: 'unknown-language' }),
      user(JSON.stringify({ en: record('en', 2, { schemaVersion: 'spire-week-record.v0' }) }), { id: 'invalid-version' }),
      user(JSON.stringify({ en: record('en', '2') }), { id: 'malformed-steps-type' }),
      user(JSON.stringify({ en: record('en', -1) }), { id: 'negative-steps' }),
      user(JSON.stringify({ en: record('en', 136) }), { id: 'oversized-steps' }),
      user(JSON.stringify({ en: record('en', 2) }), { id: 'valid' }),
    ];

    const result = aggregate(rows);
    const english = result.languages.find((language) => language.lang === 'en');

    expect(english).toMatchObject({
      status: 'available',
      knownProfiles: 1,
      missingProfiles: 1,
      staleProfiles: 1,
      invalidProfiles: 6,
      completedProfiles: 0,
    });
    expect((english?.knownProfiles ?? 0) + (english?.missingProfiles ?? 0)
      + (english?.staleProfiles ?? 0) + (english?.invalidProfiles ?? 0)).toBe(9);
  });

  it.each(['2026-W00', '2026-W99', '2025-W53'])(
    'classifies impossible ISO week %s as invalid rather than stale',
    (weekKey) => {
      const result = aggregate([user(JSON.stringify({ en: record('en', 2, { weekKey }) }))]);
      expect(result.languages.find((language) => language.lang === 'en')).toMatchObject({
        knownProfiles: 0,
        staleProfiles: 0,
        invalidProfiles: 1,
      });
    },
  );

  it('accepts ISO week 53 only in a year that actually has it', () => {
    const result = aggregate(
      [user(JSON.stringify({ en: record('en', 2, { weekKey: '2026-W53' }) }))],
      { generatedWeek: '2026-W53' },
    );
    expect(result.languages.find((language) => language.lang === 'en')).toMatchObject({
      knownProfiles: 1,
      staleProfiles: 0,
      invalidProfiles: 0,
    });
  });

  it('rejects absurd progress JSON before parsing to keep memory bounded', () => {
    const result = aggregate([user('x'.repeat(SPIRE_STATISTICS_PROGRESS_MAX_CHARS + 1))]);
    const english = result.languages.find((language) => language.lang === 'en');
    expect(english).toMatchObject({ knownProfiles: 0, missingProfiles: 0, staleProfiles: 0, invalidProfiles: 1 });
  });

  it('marks capped data partial and preserves observed counts', () => {
    const result = aggregate([user(JSON.stringify({ en: record('en', 8) }))], { truncated: true });
    expect(result.state).toBe('partial');
    expect(result.coverage.truncated).toBe(true);
    expect(result.languages.find((language) => language.lang === 'en')).toMatchObject({
      status: 'partial', knownProfiles: 1,
    });
  });

  it('returns null counts on a users source error instead of valid-looking zeroes', () => {
    const result = aggregate([user(JSON.stringify({ en: record('en', 8) }))], {
      sourceError: 'users_read_failed',
    });

    expect(result.state).toBe('error');
    expect(result.coverage).toEqual({
      scannedProfiles: null,
      visibleProfiles: null,
      hiddenProfilesExcluded: null,
      cap: CAP,
      truncated: false,
      sourceError: 'users_read_failed',
    });
    for (const language of result.languages) {
      expect(language.status).toBe('error');
      expect(language.knownProfiles).toBeNull();
      expect(language.completedProfiles).toBeNull();
      expect(language.floors.every((bucket) => bucket.count === null)).toBe(true);
    }
  });
});
