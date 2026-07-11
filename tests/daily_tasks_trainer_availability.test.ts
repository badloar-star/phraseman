import AsyncStorage from '@react-native-async-storage/async-storage';

import { getTodayTasksSafe, rerollDailyTask } from '../app/daily_tasks';
import type { TrainerItem } from '../app/trainer_store';
import { dailyTasksProgressKey, trainerStoreKey } from '../app/target_storage_keys';
import { spendShards } from '../app/shards_system';

let mockFrenchRemoteItems: TrainerItem[] = [];

jest.mock('../app/french_personal_practice_remote_runtime', () => ({
  getCachedFrenchRemotePersonalPractice: jest.fn(() => mockFrenchRemoteItems),
}));

jest.mock('../app/premium_guard', () => ({
  getVerifiedPremiumStatus: jest.fn(async () => false),
}));

jest.mock('../app/shards_system', () => ({
  spendShards: jest.fn(async () => true),
}));

const mockSpendShards = spendShards as jest.MockedFunction<typeof spendShards>;

function dueWord(key: string): TrainerItem {
  return {
    key,
    queue: 'words',
    translationRu: key,
    translationUk: key,
    lessonId: 1,
    mistakeCount: 2,
    correctStreak: 0,
    nextDue: Date.now() - 1_000,
    createdAt: Date.now() - 86_400_000,
    archived: false,
  };
}

function duePhrase(key: string): TrainerItem {
  return { ...dueWord(key), queue: 'phrases', errorWord: key.split(' ')[0] };
}

describe('daily tasks trainer queue availability', () => {
  beforeEach(() => {
    (AsyncStorage as any).__reset?.();
    mockFrenchRemoteItems = [];
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('replaces an arena trainer task when its queue cannot satisfy the target', async () => {
    jest.setSystemTime(new Date('2026-05-27T12:00:00Z'));
    await AsyncStorage.setItem('user_total_xp', '1000000000');

    const tasks = await getTodayTasksSafe('en');

    expect(tasks.some((task) => task.type === 'trainer_arena')).toBe(false);
    expect(tasks).toHaveLength(3);
  });

  it('does not charge for a reroll when every replacement trainer queue is insufficient', async () => {
    jest.setSystemTime(new Date('2026-05-10T12:00:00Z'));
    await AsyncStorage.setItem(
      trainerStoreKey('en'),
      JSON.stringify([dueWord('one'), dueWord('two'), dueWord('three')]),
    );

    const tasks = await getTodayTasksSafe('en');
    expect(tasks.map((task) => task.id)).toContain('tw1');

    await expect(rerollDailyTask('tw1', 'en')).resolves.toEqual({ ok: false, reason: 'no_candidates' });
    expect(mockSpendShards).not.toHaveBeenCalled();
  });

  it('keeps a partially completed trainer task when saved progress plus due cards reaches its target', async () => {
    jest.setSystemTime(new Date('2026-05-10T12:00:00Z'));
    await AsyncStorage.multiSet([
      [trainerStoreKey('en'), JSON.stringify([dueWord('one'), dueWord('two')])],
      [dailyTasksProgressKey('2026-05-10', 'en'), JSON.stringify([
        { taskId: 'tw1', current: 1, completed: false, claimed: false },
      ])],
    ]);

    const tasks = await getTodayTasksSafe('en');

    expect(tasks.map((task) => task.id)).toContain('tw1');
  });

  it('keeps a French trainer task when the session-aware remote queue can satisfy it', async () => {
    jest.setSystemTime(new Date('2026-05-27T12:00:00Z'));
    mockFrenchRemoteItems = [duePhrase('un'), duePhrase('deux'), duePhrase('trois')];

    const tasks = await getTodayTasksSafe('fr');

    expect(tasks.map((task) => task.id)).toContain('tp1');
  });

  it('accepts a French remote trainer queue as a paid reroll candidate', async () => {
    jest.setSystemTime(new Date('2026-05-10T12:00:00Z'));
    await AsyncStorage.setItem(
      trainerStoreKey('fr'),
      JSON.stringify([dueWord('un'), dueWord('deux'), dueWord('trois')]),
    );
    mockFrenchRemoteItems = [
      duePhrase('phrase un'),
      duePhrase('phrase deux'),
      duePhrase('phrase trois'),
      duePhrase('phrase quatre'),
      duePhrase('phrase cinq'),
    ];

    await expect(rerollDailyTask('tw1', 'fr')).resolves.toEqual(
      expect.objectContaining({ ok: true, cost: 3 }),
    );
    expect(mockSpendShards).toHaveBeenCalledTimes(1);
  });
});
