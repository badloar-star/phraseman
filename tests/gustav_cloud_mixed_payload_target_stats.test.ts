import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  __cloudSyncTestHooks,
  FRENCH_TARGET_SYNC_KEYS,
} from '../app/cloud_sync';
import { bumpStatsDaily } from '../app/stats_daily_breakdown';
import { __resetAccountGenerationForTests, beginAccountGeneration } from '../app/account_generation';
import {
  statsDailyBreakdownKey,
  userStatsKey,
} from '../app/target_storage_keys';
import {
  trackAnswer,
  trackLessonStart,
} from '../app/user_stats';

const makeCloudUserDoc = (progress: Record<string, unknown>) => ({
  exists: true,
  data: () => ({ progress }),
});

describe('Gustav mixed cloud payload target stats isolation', () => {
  beforeEach(() => {
    (AsyncStorage as any).__reset?.();
    jest.clearAllMocks();
    __resetAccountGenerationForTests();
    beginAccountGeneration('gustav-stats-test');
  });

  it('keeps French user_stats_v1 activity out of the legacy English user stats payload', async () => {
    await trackLessonStart('fr');
    await trackAnswer(true, 'fr');

    await expect(AsyncStorage.getItem('user_stats_v1')).resolves.toBeNull();
    const french = JSON.parse(await AsyncStorage.getItem(userStatsKey('fr')) ?? '{}');
    expect(french.lessonsStarted).toBe(1);
    expect(french.answersTotal).toBe(1);
    expect(french.answersCorrect).toBe(1);
  });

  it('keeps French stats_daily_breakdown_v1 metrics under the target bucket', async () => {
    await bumpStatsDaily('phrases_learned', 1, 'fr');
    await bumpStatsDaily('lessons_completed', 1, 'fr');

    await expect(AsyncStorage.getItem('stats_daily_breakdown_v1')).resolves.toBeNull();
    const french = JSON.parse(await AsyncStorage.getItem(statsDailyBreakdownKey('fr')) ?? '{}');
    const rows = Object.values(french) as Array<Record<string, number>>;
    expect(rows).toHaveLength(1);
    expect(rows[0].phrases_learned).toBe(1);
    expect(rows[0].lessons_completed).toBe(1);
  });

  it('restores French stats_daily_breakdown_v1 only into the scoped French row', async () => {
    const frenchKey = statsDailyBreakdownKey('fr');

    await expect(__cloudSyncTestHooks.applyRestoreFromUserDoc(makeCloudUserDoc({
      user_total_xp: '10',
      [frenchKey]: JSON.stringify({
        '2026-05-22': { words_learned: 3, quizzes_completed: 1 },
      }),
    }))).resolves.toBe(true);

    await expect(AsyncStorage.getItem('stats_daily_breakdown_v1')).resolves.toBe('{}');
    const french = JSON.parse(await AsyncStorage.getItem(frenchKey) ?? '{}');
    expect(french['2026-05-22']).toMatchObject({
      words_learned: 3,
    });
    expect(french['2026-05-22']).not.toHaveProperty('quizzes_completed');
  });

  it('sync allowlist includes French target stats keys but not Spanish dev buckets', () => {
    expect(FRENCH_TARGET_SYNC_KEYS).toContain(userStatsKey('fr'));
    expect(FRENCH_TARGET_SYNC_KEYS).toContain(statsDailyBreakdownKey('fr'));
    expect(FRENCH_TARGET_SYNC_KEYS.some((key) => key.includes('::es'))).toBe(false);
  });
});
