import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TrainerPracticeSnapshot } from '../app/trainer_practice_prefetch';
import {
  clearTrainerPracticeSnapshotOnDisk,
  peekRestoredTrainerPracticeSnapshot,
  primeTrainerPracticeSnapshotFromStorage,
  rememberTrainerPracticeSnapshotOnDisk,
  resetTrainerPracticePersistForTests,
} from '../app/trainer_practice_persist';

const KEY = 'en::ru';

function makeSnapshot(overrides: Partial<TrainerPracticeSnapshot> = {}): TrainerPracticeSnapshot {
  return {
    dashboard: {
      due: { words: 4, phrases: 7 },
      totalDue: 11,
    } as unknown as TrainerPracticeSnapshot['dashboard'],
    hasPremium: true,
    analytics: {
      categoryStats: [], lessonStats: [], topMistakePhrases: [], insights: [],
      totalMistakes: 9, windowDays: 30,
    } as TrainerPracticeSnapshot['analytics'],
    resolvedPersonalTrainings: { categories: {}, diagnoses: {} },
    activityDays: [],
    createdAt: 1_000,
    ...overrides,
  };
}

/** Имитация холодного старта: память процесса пуста, диск остался с прошлой сессии. */
async function simulateColdStart(nowMs?: number): Promise<void> {
  resetTrainerPracticePersistForTests();
  await primeTrainerPracticeSnapshotFromStorage(nowMs);
}

describe('trainer practice disk snapshot (мгновенное открытие «Моей практики»)', () => {
  beforeEach(async () => {
    resetTrainerPracticePersistForTests();
    await AsyncStorage.clear();
  });

  it('после холодного старта отдаёт цифры синхронно', async () => {
    rememberTrainerPracticeSnapshotOnDisk(KEY, makeSnapshot(), 5_000);

    await simulateColdStart(6_000);

    const restored = peekRestoredTrainerPracticeSnapshot(KEY, 6_000);
    expect(restored?.dashboard.totalDue).toBe(11);
    expect(restored?.dashboard.due.phrases).toBe(7);
    expect(restored?.hasPremium).toBe(true);
    expect(restored?.analytics?.totalMistakes).toBe(9);
  });

  it('переживает разрыв 2-минутного TTL памяти (возврат через 3 минуты)', async () => {
    // createdAt старее, чем TTL_MS in-memory кэша (2 минуты) — раньше это давало нули.
    rememberTrainerPracticeSnapshotOnDisk(KEY, makeSnapshot({ createdAt: 0 }), 1_000);

    await simulateColdStart(1_000 + 3 * 60_000);

    expect(peekRestoredTrainerPracticeSnapshot(KEY, 1_000 + 3 * 60_000)?.dashboard.totalDue).toBe(11);
  });

  it('не отдаёт снапшот другого target/языка', async () => {
    rememberTrainerPracticeSnapshotOnDisk(KEY, makeSnapshot(), 1_000);

    await simulateColdStart(2_000);

    expect(peekRestoredTrainerPracticeSnapshot('fr::ru', 2_000)).toBeNull();
  });

  it('не поднимает снапшот старше суточного TTL', async () => {
    rememberTrainerPracticeSnapshotOnDisk(KEY, makeSnapshot(), 1_000);

    await simulateColdStart(1_000 + 27 * 60 * 60_000);

    expect(peekRestoredTrainerPracticeSnapshot(KEY, 1_000 + 27 * 60 * 60_000)).toBeNull();
  });

  it('обрезает активность до двух недель, а не пишет 365 дней', async () => {
    const activityDays = Array.from({ length: 365 }, (_, i) => ({
      date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
      level: 0, xp: i, minutes: i, active: true, future: false,
      metrics: { lessons: 0, review: 0, wordsLearned: 0, phrasesLearned: 0, flashcardsSaved: 0 },
    })) as unknown as TrainerPracticeSnapshot['activityDays'];
    rememberTrainerPracticeSnapshotOnDisk(KEY, makeSnapshot({ activityDays }), 1_000);

    await simulateColdStart(2_000);

    expect(peekRestoredTrainerPracticeSnapshot(KEY, 2_000)?.activityDays).toHaveLength(14);
  });

  it('стирает диск при выходе из аккаунта', async () => {
    rememberTrainerPracticeSnapshotOnDisk(KEY, makeSnapshot(), 1_000);

    clearTrainerPracticeSnapshotOnDisk();
    await simulateColdStart(2_000);

    expect(peekRestoredTrainerPracticeSnapshot(KEY, 2_000)).toBeNull();
  });

  it('игнорирует битую запись вместо падения в рендере', async () => {
    await AsyncStorage.setItem('trainer_practice_snapshot_v1', JSON.stringify([
      // dashboard без due — на первом кадре читается dashboard.due.phrases, поэтому
      // такая запись обязана быть отброшена целиком.
      { key: KEY, snapshot: { dashboard: {}, createdAt: 1 }, writtenAtMs: 1_000 },
      'not-an-object',
      { key: 'x', snapshot: null, writtenAtMs: 1_000 },
    ]));

    await simulateColdStart(2_000);

    expect(peekRestoredTrainerPracticeSnapshot(KEY, 2_000)).toBeNull();
  });
});
