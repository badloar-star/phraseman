import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

describe('home startup stability', () => {
  it('keeps four base daily tasks while preserving the weekend task when present', () => {
    const tasks = read('app/daily_tasks.ts');

    expect(tasks).toContain('export function ensureDailyTaskBaseCount');
    expect(tasks).toContain('const DAILY_TASK_BASE_COUNT = 4;');
    expect(tasks).toContain('ensureDailyTaskBaseCount(appendWeekendMarathonTask(');
  });

  it('hydrates the persisted league state before Home chooses its first league row', () => {
    const bootstrap = read('app/app_snapshot_bootstrap.ts');
    const home = read('app/(tabs)/home.tsx');

    expect(bootstrap).toContain("'league_state_v3'");
    expect(bootstrap).toContain('rememberLeagueStateSnapshot(sanitizeLeagueState');
    expect(home).toContain('getCachedLeagueStateSync()');
    expect(home).toContain('buildHomeLeagueChest(cachedLeagueState.group');
  });

  it('does not start the Home task indicator at three', () => {
    const home = read('app/(tabs)/home.tsx');

    expect(home).toContain('useState(initialSurveyDailyTask ? 5 : 4)');
    expect(home).toContain('const [dailyTaskBarCount] = useState(initialSurveyDailyTask ? 5 : 4);');
    expect(home).not.toContain('setDailyTaskBarCount(');
  });

  it('always creates the league row for the first Home frame', () => {
    const home = read('app/(tabs)/home.tsx');

    expect(home).toContain('buildHomeLeagueChest([], clubTierShortName(LEAGUES[0], lang), LEAGUES[0].id)');
    expect(home).not.toContain('{homeLeagueChest && (<>');
  });

  it('primes the persisted survey result before Home derives its initial indicator count', () => {
    const cache = read('app/survey_daily_task_cache.ts');
    const rootLayout = read('app/_layout.tsx');
    const home = read('app/(tabs)/home.tsx');

    expect(cache).toContain('primeSurveyDailyTaskCacheFromStorage');
    expect(rootLayout).toContain('primeSurveyDailyTaskCacheFromStorage().catch(() => {})');
    expect(home).toContain('initialSurveyDailyTask ? 5 : 4');
  });
});
