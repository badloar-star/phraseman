import {
  beginSeasonTopRequest,
  commitSeasonTop,
  readSeasonTop,
  resetSeasonTopCacheForTests,
} from '../app/arena_season_top_cache';
import { __resetAccountGenerationForTests, ensureAccountGeneration } from '../app/account_generation';

const sample = {
  seasonId: '2026-s1', startsAt: 1, endsAtMs: 2, myPlace: 3, mySR: 4, entries: [],
};

describe('season top warm cache', () => {
  beforeEach(() => { __resetAccountGenerationForTests(); resetSeasonTopCacheForTests(); });

  it('keeps stale rows readable and scopes them to account and season', () => {
    const token = ensureAccountGeneration('alice');
    const request = beginSeasonTopRequest(token, '2026-s1');
    expect(commitSeasonTop(request, sample, 1_000)).toBe(true);
    expect(readSeasonTop(token, '2026-s1', 20_000)).toEqual({ value: sample, isFresh: true });
    expect(readSeasonTop(token, '2026-s1', 40_001)).toEqual({ value: sample, isFresh: false });
    expect(readSeasonTop(token, '2026-s2', 20_000)).toBeNull();
    expect(readSeasonTop(ensureAccountGeneration('bob'), '2026-s1', 20_000)).toBeNull();
  });

  it('rejects superseded and mismatched server season responses', () => {
    const token = ensureAccountGeneration('alice');
    const stale = beginSeasonTopRequest(token, '2026-s1');
    const latest = beginSeasonTopRequest(token, '2026-s1');
    expect(commitSeasonTop(stale, sample)).toBe(false);
    expect(commitSeasonTop(latest, { ...sample, seasonId: 'other' })).toBe(false);
  });

  it('screen preserves rows during revalidation and masks the wrong key', () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'arena_season_leaderboard.tsx'), 'utf8');
    expect(source).toContain('const data = loadedKey === renderKey ? cachedData : null');
    expect(source).toContain('const visibleLoading = loading || loadedKey !== renderKey');
    expect(source).toContain('if (isSeasonTopRequestCurrent(request)) setLoading(false)');
    expect(source).toContain('const expectedSeasonId = seasonId');
    expect(source).toContain('}, [loadedKey, renderKey, seasonId])');
    expect(source).toContain('// Quiet revalidation keeps the last successful rows visible.');
  });
});
