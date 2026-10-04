// зачем (аудит Optimistic UI, 04.10): сторож трёх правок — рефреш статистики по цели, мгновенная заморозка серии с откатом, отказ скрытия ошибки не молчит.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

describe('optimistic UI audit fixes', () => {
  it('stats refresh is de-duplicated per study target, not globally', () => {
    const source = read('app/statsCache.ts');
    expect(source).toContain('const _refreshPromises = new Map<string, Promise<StatsPreloadData | null>>();');
    expect(source).toContain('const inFlight = _refreshPromises.get(refreshKey);');
    expect(source).not.toContain('_refreshPromise =');
  });

  it('streak freeze updates local state first, guards repeated taps and rolls back with a toast', () => {
    const source = read('app/streak_stats.tsx');
    const start = source.indexOf('const handleFreezeStreak = async () => {');
    const body = source.slice(start, source.indexOf('const weekAnalyticsBlock', start));
    expect(body).toContain('freezeInFlightRef.current');
    expect(body.indexOf('setFreezeActive(true)')).toBeLessThan(body.indexOf('await commitPremiumFreeFreeze'));
    expect(body).toContain('setFreezeActive(previous.freezeActive)');
    expect(body).toContain("emitAppEvent('action_toast'");
  });

  it('hide and restore of a mistake log and toast on failure instead of an unhandled rejection', () => {
    const source = read('app/mistake_practice_session.tsx');
    expect(source).toContain("'[MISTAKES-GATE] hide:failed'");
    expect(source).toContain("'[MISTAKES-GATE] restore:failed'");
  });
});
