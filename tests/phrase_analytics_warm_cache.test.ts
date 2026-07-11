import {
  beginPhraseAnalyticsRequest,
  commitPhraseAnalyticsWarm,
  isPhraseAnalyticsRequestCurrent,
  readPhraseAnalyticsWarm,
  resetPhraseAnalyticsWarmForTests,
} from '../app/phrase_analytics_warm_cache';
import {
  __resetAccountGenerationForTests,
  ensureAccountGeneration,
} from '../app/account_generation';

describe('phrase analytics warm cache', () => {
  beforeEach(() => {
    __resetAccountGenerationForTests();
    resetPhraseAnalyticsWarmForTests();
  });

  it('keeps stale data readable while reporting freshness separately', () => {
    const token = ensureAccountGeneration('alice');
    const request = beginPhraseAnalyticsRequest(token, 'en:ru');
    const value = { data: null, resolved: null };
    expect(commitPhraseAnalyticsWarm(request, value, 1_000)).toBe(true);
    expect(readPhraseAnalyticsWarm(token, 'en:ru', 20_000)).toEqual({ value, isFresh: true });
    expect(readPhraseAnalyticsWarm(token, 'en:ru', 60_000)).toEqual({ value, isFresh: false });
  });

  it('rejects old-account and superseded request commits', () => {
    const alice = ensureAccountGeneration('alice');
    const staleRequest = beginPhraseAnalyticsRequest(alice, 'en:ru');
    const latestRequest = beginPhraseAnalyticsRequest(alice, 'en:ru');
    expect(isPhraseAnalyticsRequestCurrent(staleRequest)).toBe(false);
    expect(isPhraseAnalyticsRequestCurrent(latestRequest)).toBe(true);
    expect(commitPhraseAnalyticsWarm(staleRequest, { data: null, resolved: null })).toBe(false);
    ensureAccountGeneration('bob');
    expect(isPhraseAnalyticsRequestCurrent(latestRequest)).toBe(false);
    expect(commitPhraseAnalyticsWarm(latestRequest, { data: null, resolved: null })).toBe(false);
    expect(readPhraseAnalyticsWarm(alice, 'en:ru')).toBeNull();
  });

  it('screen masks state by the complete account and content key', () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'phrase_analytics_screen.tsx'), 'utf8');
    expect(source).toContain('loadedCacheKey === renderCacheKey ? cachedData : null');
    expect(source).toContain('`${renderScope}:phrase-analytics:${warmKey}`');
    expect(source).toContain('if (isPhraseAnalyticsRequestCurrent(request)) setLoading(false)');
    expect(source).toContain('if (warm && loadedCacheKey !== requestCacheKey)');
    expect(source).toContain('const visibleLoading = loading || loadedCacheKey !== renderCacheKey');
    expect(source).toContain('personalPracticeCoachEnabled, renderCacheKey, sourceLocale');
  });

  it('fresh-key navigation supersedes a pending request for another key', () => {
    const token = ensureAccountGeneration('alice');
    const bSeed = beginPhraseAnalyticsRequest(token, 'b:ru');
    const bValue = { data: null, resolved: null };
    expect(commitPhraseAnalyticsWarm(bSeed, bValue, 1_000)).toBe(true);
    const pendingA = beginPhraseAnalyticsRequest(token, 'a:ru');
    const freshBVisit = beginPhraseAnalyticsRequest(token, 'b:ru');
    expect(isPhraseAnalyticsRequestCurrent(freshBVisit)).toBe(true);
    expect(commitPhraseAnalyticsWarm(pendingA, { data: null, resolved: null }, 2_000)).toBe(false);
    expect(readPhraseAnalyticsWarm(token, 'b:ru', 2_000)?.value).toEqual(bValue);
  });
});
