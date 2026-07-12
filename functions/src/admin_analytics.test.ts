import { HttpsError } from 'firebase-functions/v2/https';
import fs from 'node:fs';
import path from 'node:path';
import {
  analyticsSnapshotState,
  parseAnalyticsRequest,
  sourceHealth,
} from './admin_analytics';

describe('analytics request contract', () => {
  it('allows the supported bounded periods', () => {
    expect(parseAnalyticsRequest({ rangeDays: 7 })).toEqual({ rangeDays: 7 });
    expect(parseAnalyticsRequest({ rangeDays: 28 })).toEqual({ rangeDays: 28 });
    expect(parseAnalyticsRequest({ rangeDays: 90 })).toEqual({ rangeDays: 90 });
  });
  it('rejects unbounded or arbitrary periods', () => {
    expect(() => parseAnalyticsRequest({ rangeDays: 365 })).toThrow(HttpsError);
  });
});

describe('analytics source health contract', () => {
  it('distinguishes ready, empty, partial and error without leaking raw messages', () => {
    expect(sourceHealth({ rows: [{ id: 'one' }], truncated: false, latestAtMs: 100 })).toEqual({
      state: 'ready', count: 1, truncated: false, latestAtMs: 100, errorCode: null,
    });
    expect(sourceHealth({ rows: [], truncated: false, latestAtMs: null })).toEqual({
      state: 'empty', count: 0, truncated: false, latestAtMs: null, errorCode: null,
    });
    expect(sourceHealth({ rows: [{ id: 'one' }], truncated: true, latestAtMs: 100 })).toEqual({
      state: 'partial', count: 1, truncated: true, latestAtMs: 100, errorCode: null,
    });
    expect(sourceHealth({ rows: [], truncated: false, latestAtMs: null, errorCode: 'users_read_failed' })).toEqual({
      state: 'error', count: 0, truncated: false, latestAtMs: null, errorCode: 'users_read_failed',
    });
  });

  it('derives an honest overall state from source health', () => {
    expect(analyticsSnapshotState([{ state: 'empty' }, { state: 'empty' }])).toBe('empty');
    expect(analyticsSnapshotState([{ state: 'ready' }, { state: 'empty' }])).toBe('ready');
    expect(analyticsSnapshotState([{ state: 'ready' }, { state: 'error' }])).toBe('partial');
    expect(analyticsSnapshotState([{ state: 'error' }, { state: 'error' }])).toBe('error');
    expect(analyticsSnapshotState([{ state: 'partial' }, { state: 'ready' }])).toBe('partial');
  });
});

describe('analytics callable source contract', () => {
  const source = fs.readFileSync(path.join(__dirname, 'admin_analytics.ts'), 'utf8');

  it('uses the pure definitions and all required sources', () => {
    expect(source).toContain('aggregateActiveAccess');
    expect(source).toContain('aggregateRevenueCatPeriod');
    expect(source).toContain('aggregateShardPeriod');
    expect(source).toContain('aggregateFunnelSignals');
    expect(source).toContain("collection('revenuecat_shard_transactions')");
    expect(source).toContain('ANALYTICS_DEFINITION_VERSION');
    expect(source).not.toContain('payingNow');
  });

  it('returns aggregate sections and safe source metadata', () => {
    for (const key of ['generatedAtMs', 'definitionVersion', 'access', 'storeActivity', 'shardActivity', 'funnelSignals', 'appActivity', 'quality']) {
      expect(source).toContain(key);
    }
    expect(source).toContain('errorCode');
    expect(source).not.toContain('error instanceof Error ? error.message');
  });

  it('loads the user population in bounded pages instead of one oversized browser-style read', () => {
    expect(source).toContain('readRowsPaged');
    expect(source).toContain('startAfter');
    expect(source).toContain('USER_PAGE_SIZE');
  });
});
