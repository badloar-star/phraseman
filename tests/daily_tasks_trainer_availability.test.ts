import AsyncStorage from '@react-native-async-storage/async-storage';

import { getTodayTasksSafe, rerollDailyTask } from '../app/daily_tasks';
import type { TrainerItem } from '../app/trainer_store';
import { dailyTasksProgressKey, trainerStoreKey } from '../app/target_storage_keys';

jest.mock('../app/premium_guard', () => ({
  getVerifiedPremiumStatus: jest.fn(async () => false),
}));


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
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // зачем: trainer_arena удалён вместе с Ареной, задания такого типа больше нет
  // в каталоге. Тест сохранён как страховка: тип не должен вернуться, а выдача
  // остаётся полной (DAILY_TASK_BASE_COUNT = 3).
  it('never serves the retired arena trainer task and keeps the daily surface full', async () => {
    jest.setSystemTime(new Date('2026-05-27T12:00:00Z'));
    await AsyncStorage.setItem('user_total_xp', '1000000000');

    const tasks = await getTodayTasksSafe('en');

    expect(tasks.some((task) => String(task.type) === 'trainer_arena')).toBe(false);
    expect(tasks).toHaveLength(3);
  });

  it('replaces an unavailable trainer quest with a free, verified alternative', async () => {
    jest.setSystemTime(new Date('2026-05-10T12:00:00Z'));
    await AsyncStorage.setItem(
      trainerStoreKey('en'),
      JSON.stringify([dueWord('one'), dueWord('two'), dueWord('three')]),
    );

    const tasks = await getTodayTasksSafe('en');
    expect(tasks.map((task) => task.id)).toContain('tw1');

    await expect(rerollDailyTask('tw1', 'en')).resolves.toEqual(
      expect.objectContaining({ ok: true, cost: 0 }),
    );
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

  it('keeps a French trainer task when the local target-isolated queue can satisfy it', async () => {
    jest.setSystemTime(new Date('2026-05-25T12:00:00Z'));
    await AsyncStorage.setItem(
      trainerStoreKey('fr'),
      JSON.stringify([duePhrase('un'), duePhrase('deux'), duePhrase('trois')]),
    );

    const tasks = await getTodayTasksSafe('fr');

    expect(tasks.map((task) => task.id)).toContain('tp1');
  });

  it('accepts a French local trainer queue as a free reroll candidate', async () => {
    jest.setSystemTime(new Date('2026-05-10T12:00:00Z'));
    await AsyncStorage.setItem(
      trainerStoreKey('fr'),
      JSON.stringify([
        dueWord('un'),
        dueWord('deux'),
        dueWord('trois'),
        duePhrase('phrase un'),
        duePhrase('phrase deux'),
        duePhrase('phrase trois'),
        duePhrase('phrase quatre'),
        duePhrase('phrase cinq'),
      ]),
    );

    await expect(rerollDailyTask('tw1', 'fr')).resolves.toEqual(
      expect.objectContaining({ ok: true, cost: 0 }),
    );
  });
});
