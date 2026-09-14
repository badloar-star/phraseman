/**
 * tests/lesson_last_available_batch_parity.test.ts
 *
 * зачем (владелец 2026-09-02, аудит скорости): Главная искала ближайший
 * доступный урок циклом `while (await isLessonUnlockedByEarnedProgress(...))`.
 * Замер [PERF-STEPS] показал 8 346 мс из 9 247 всей загрузки экрана — до 31
 * итерации, каждая с 2+ чтениями диска. Цикл заменён пакетным
 * resolveLastAvailableLessonId: одно multiGet и решение в памяти.
 *
 * Этот тест сторожит ГЛАВНОЕ: ускорение не должно изменить, какие уроки
 * человек может открыть. Ошибка в любую сторону дорога — либо откроются
 * платные уроки, либо закроются честно заработанные.
 *
 * Сработал — значит логика доступа разошлась. Чинить надо код, а не тест.
 */

import {
  isLessonUnlockedByEarnedProgress,
  resolveLastAvailableLessonId,
  unlockLesson,
} from '../app/lesson_lock_system';
import { lessonBestScoreKey, unlockedLessonsKey } from '../app/target_storage_keys';

const store: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => { store[key] = value; return Promise.resolve(); }),
  multiGet: jest.fn((keys: string[]) => Promise.resolve(keys.map((k) => [k, store[k] ?? null]))),
  multiSet: jest.fn((pairs: [string, string][]) => { pairs.forEach(([k, v]) => { store[k] = v; }); return Promise.resolve(); }),
  removeItem: jest.fn((key: string) => { delete store[key]; return Promise.resolve(); }),
}));

/** Эталон: тот самый цикл, который стоял на Главной до ускорения. */
async function resolveByLegacyLoop(requested: number): Promise<number> {
  let lessonId = requested;
  while (lessonId > 1 && !(await isLessonUnlockedByEarnedProgress(lessonId))) {
    lessonId -= 1;
  }
  return lessonId;
}

const resetStore = (): void => {
  for (const key of Object.keys(store)) delete store[key];
};

describe('resolveLastAvailableLessonId — паритет с прежним циклом', () => {
  beforeEach(resetStore);

  it('без прогресса сохраняет выбранный основной урок', async () => {
    expect(await resolveLastAvailableLessonId(12)).toBe(12);
  });

  it('урок 1 всегда доступен и не требует чтений', async () => {
    expect(await resolveLastAvailableLessonId(1)).toBe(1);
  });

  it('держится за разблокированный урок', async () => {
    await unlockLesson(9);
    store[lessonBestScoreKey(8)] = '3';
    expect(await resolveLastAvailableLessonId(9)).toBe(9);
  });

  it('не откатывает выбранный урок к старому заработанному unlock', async () => {
    await unlockLesson(5);
    store[lessonBestScoreKey(4)] = '3';
    expect(await resolveLastAvailableLessonId(11)).toBe(11);
  });

  it('совпадает с прежним циклом на наборе состояний', async () => {
    const cases: Array<{ unlocked: number[]; scores: Record<number, string>; from: number }> = [
      { unlocked: [], scores: {}, from: 3 },
      { unlocked: [2], scores: { 1: '3' }, from: 2 },
      { unlocked: [2, 3], scores: { 1: '3', 2: '2.5' }, from: 4 },
      { unlocked: [7], scores: { 6: '3' }, from: 8 },
      { unlocked: [4, 5, 6], scores: { 3: '3', 5: '1' }, from: 6 },
      { unlocked: [2], scores: { 1: '1' }, from: 2 },
      { unlocked: [20, 21], scores: {}, from: 21 },
      { unlocked: [32], scores: {}, from: 32 },
    ];

    for (const { unlocked, scores, from } of cases) {
      resetStore();
      store[unlockedLessonsKey()] = JSON.stringify(unlocked);
      for (const [id, score] of Object.entries(scores)) {
        store[lessonBestScoreKey(Number(id))] = score;
      }
      const legacy = await resolveByLegacyLoop(from);
      const batched = await resolveLastAvailableLessonId(from);
      expect({ from, unlocked, batched }).toEqual({ from, unlocked, batched: legacy });
    }
  });

  it('чинит выход за границы вместо падения', async () => {
    expect(await resolveLastAvailableLessonId(99)).toBeLessThanOrEqual(32);
    expect(await resolveLastAvailableLessonId(0)).toBe(1);
    expect(await resolveLastAvailableLessonId(Number.NaN)).toBe(1);
  });
});
