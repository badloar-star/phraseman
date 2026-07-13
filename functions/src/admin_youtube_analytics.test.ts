import fs from 'fs';
import path from 'path';
import {
  handleAdminYoutubeAnalytics,
  isYoutubeAnalyticsExportPendingError,
  YoutubeAnalyticsCache,
  YOUTUBE_ANALYTICS_MAXIMUM_BYTES_BILLED,
} from './admin_youtube_analytics';
import { aggregateYoutubeAnalytics } from './admin_youtube_analytics_core';

const NOW_MS = Date.parse('2026-07-13T12:00:00.000Z');
const OWNER = { auth: { token: { admin: true, adminRole: 'owner' } } };

function emptySnapshot(marker: number, rangeDays: 7 | 28 | 90 = 7) {
  const toMicros = (NOW_MS + marker) * 1000;
  return aggregateYoutubeAnalytics([], {
    fromMicros: toMicros - rangeDays * 86_400_000_000,
    toMicros,
    generatedAtMicros: toMicros,
    filters: { rangeDays, platform: 'all' },
  });
}

function dependencies(overrides: Record<string, unknown> = {}) {
  return {
    nowMs: () => NOW_MS,
    eventsTable: () => 'phraseman-ea0b3.analytics_532376954.events_*',
    location: () => 'US',
    cache: new YoutubeAnalyticsCache(),
    query: async () => { throw { code: 404, message: 'Wildcard table events_* does not match any table' }; },
    ...overrides,
  };
}

describe('admin YouTube analytics callable', () => {
  it('uses the same conditional App Check policy as other admin analytics callables', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src', 'admin_youtube_analytics.ts'), 'utf8');
    expect(source).toContain('...DEFAULT_CALLABLE_OPTIONS');
    expect(source).toContain('enforceAppCheck: ENFORCE_APP_CHECK');
    expect(source).toContain("hasClaimedPermission(request.auth.token, 'analytics.read')");
  });

  it('rejects unauthenticated and unauthorized callers before querying', async () => {
    const query = jest.fn();
    await expect(handleAdminYoutubeAnalytics({ data: { rangeDays: 7, platform: 'all' } }, dependencies({ query })))
      .rejects.toMatchObject({ code: 'unauthenticated' });
    await expect(handleAdminYoutubeAnalytics({
      auth: { token: { admin: true, adminRole: 'support' } }, data: { rangeDays: 7, platform: 'all' },
    }, dependencies({ query }))).rejects.toMatchObject({ code: 'permission-denied' });
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects invalid filters before calculating a warehouse window', async () => {
    const nowMs = jest.fn(() => NOW_MS);
    await expect(handleAdminYoutubeAnalytics({ ...OWNER, data: { rangeDays: 30, platform: 'all' } }, dependencies({ nowMs })))
      .rejects.toMatchObject({ code: 'invalid-argument' });
    expect(nowMs).not.toHaveBeenCalled();
  });

  it('passes exact half-open bounds, explicit types, location, and the five-GB cap', async () => {
    const query = jest.fn(async (_options: unknown) => { throw { code: 404, message: 'Not found: Table events_20260713' }; });
    const snapshot = await handleAdminYoutubeAnalytics({
      ...OWNER, data: { rangeDays: 28, platform: 'ios', videoId: 'video_1', channelId: 'channel-1' },
    }, dependencies({ query }));
    expect(query).toHaveBeenCalledTimes(1);
    const options = query.mock.calls[0][0] as Record<string, any>;
    expect(options).toMatchObject({
      useLegacySql: false,
      location: 'US',
      maximumBytesBilled: YOUTUBE_ANALYTICS_MAXIMUM_BYTES_BILLED,
      types: { fromMicros: 'INT64', toMicros: 'INT64', platform: 'STRING', videoId: 'STRING', channelId: 'STRING' },
      params: {
        toMicros: NOW_MS * 1000,
        fromMicros: NOW_MS * 1000 - 28 * 86_400_000_000,
        platform: 'ios', videoId: 'video_1', channelId: 'channel-1',
      },
    });
    expect(snapshot.window).toEqual({
      fromMicros: NOW_MS * 1000 - 28 * 86_400_000_000,
      toMicros: NOW_MS * 1000,
    });
    expect(snapshot.quality.state).toBe('empty');
  });

  it('returns only bounded aggregate fields while the first daily export is pending', async () => {
    const snapshot = await handleAdminYoutubeAnalytics({ ...OWNER, data: { rangeDays: 7, platform: 'all' } }, dependencies());
    const json = JSON.stringify(snapshot);
    expect(snapshot.videos).toEqual([]);
    expect(json).not.toMatch(/user_pseudo_id|event_id|session_id|playback_id|query|payload_json/);
  });

  it('does not hide unknown warehouse failures or missing datasets', async () => {
    const denied = new Error('Access denied');
    await expect(handleAdminYoutubeAnalytics({ ...OWNER, data: { rangeDays: 7, platform: 'all' } }, dependencies({
      query: async () => { throw denied; },
    }))).rejects.toBe(denied);
    const missingDataset = { code: 404, message: 'Not found: Dataset analytics_missing' };
    await expect(handleAdminYoutubeAnalytics({ ...OWNER, data: { rangeDays: 28, platform: 'all' } }, dependencies({
      query: async () => { throw missingDataset; },
    }))).rejects.toBe(missingDataset);
  });

  it('recognizes only missing daily export table errors', () => {
    expect(isYoutubeAnalyticsExportPendingError({ code: 404, message: 'Not found: Table events_20260713' })).toBe(true);
    expect(isYoutubeAnalyticsExportPendingError({ message: 'Wildcard events_* does not match any table' })).toBe(true);
    expect(isYoutubeAnalyticsExportPendingError({ code: 404, message: 'Not found: Dataset analytics_missing' })).toBe(false);
    expect(isYoutubeAnalyticsExportPendingError({ code: 403, message: 'Access denied' })).toBe(false);
  });
});

describe('bounded YouTube analytics cache', () => {
  it('preserves the original snapshot window on hit and expires at the TTL boundary', () => {
    const cache = new YoutubeAnalyticsCache(2, 100);
    const snapshot = emptySnapshot(0);
    cache.set('same-filter', snapshot, 1_000);
    expect(cache.get('same-filter', 1_099)).toBe(snapshot);
    expect(cache.get('same-filter', 1_100)).toBeUndefined();
  });

  it('evicts the least recently used entry and never crosses filter keys', () => {
    const cache = new YoutubeAnalyticsCache(2, 1_000);
    const first = emptySnapshot(0);
    const second = emptySnapshot(1);
    const third = emptySnapshot(2);
    cache.set('first', first, 0);
    cache.set('second', second, 0);
    expect(cache.get('first', 1)).toBe(first);
    cache.set('third', third, 2);
    expect(cache.size).toBe(2);
    expect(cache.get('second', 3)).toBeUndefined();
    expect(cache.get('first', 3)).toBe(first);
    expect(cache.get('third', 3)).toBe(third);
    expect(cache.get('different-filter', 3)).toBeUndefined();
  });

  it('checks the role-neutral filter cache before calculating a new window', async () => {
    const cache = new YoutubeAnalyticsCache();
    const firstQuery = jest.fn(async () => { throw { code: 404, message: 'Not found: Table events_20260713' }; });
    const first = await handleAdminYoutubeAnalytics({ ...OWNER, data: { rangeDays: 7, platform: 'android' } }, dependencies({ cache, query: firstQuery }));
    const nowMs = jest.fn(() => NOW_MS + 60_000);
    const secondQuery = jest.fn();
    const second = await handleAdminYoutubeAnalytics({
      auth: { token: { admin: true, adminRole: 'analyst' } }, data: { rangeDays: 7, platform: 'android' },
    }, dependencies({ cache, nowMs, query: secondQuery }));
    expect(second).toBe(first);
    expect(second.window).toEqual(first.window);
    expect(secondQuery).not.toHaveBeenCalled();
  });
});
