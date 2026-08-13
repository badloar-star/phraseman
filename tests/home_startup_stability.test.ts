import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

describe('home startup stability', () => {
  it('hydrates the persisted league state before Home chooses its first league row', () => {
    const bootstrap = read('app/app_snapshot_bootstrap.ts');
    const home = read('app/(tabs)/home.tsx');

    expect(bootstrap).toContain("'league_state_v3'");
    expect(bootstrap).toContain('rememberLeagueStateSnapshot(sanitizeLeagueState');
    expect(home).toContain('getCachedLeagueStateSync()');
    expect(home).toContain('buildHomeLeagueChest(cachedLeagueState.group');
  });

  it('always creates the league row for the first Home frame', () => {
    const home = read('app/(tabs)/home.tsx');

    expect(home).toContain('buildHomeLeagueChest([], clubTierShortName(LEAGUES[0], lang), LEAGUES[0].id)');
    expect(home).not.toContain('{homeLeagueChest && (<>');
  });

  it('keeps the independent survey cache primed and exposes a standalone Home offer', () => {
    const cache = read('app/survey_offer_cache.ts');
    const rootLayout = read('app/_layout.tsx');
    const home = read('app/(tabs)/home.tsx');

    expect(cache).toContain('primeSurveyOfferCacheFromStorage');
    expect(rootLayout).toContain('primeSurveyOfferCacheFromStorage().catch(() => {})');
    expect(home).toContain('fetchActiveSurveyWithRetry');
    expect(home).toContain('<SurveyTaskCard');
  });
});
