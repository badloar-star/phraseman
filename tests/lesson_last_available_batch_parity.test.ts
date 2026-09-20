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

// зачем (аудит 2026-09-17): `const store` попадал в TDZ. jest поднимает
// jest.mock выше импортов, а импортируемые модули (feature_gates → boons)
// читают AsyncStorage прямо на загрузке — мок срабатывал ДО инициализации
// const и валил ВЕСЬ сьют «Cannot access 'store' before initialization».
// var поднимается вместе с моком, поэтому хранилище доступно всегда.
var mockStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve((mockStore ?? {})[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => { (mockStore ??= {})[key] = value; return Promise.resolve(); }),
  multiGet: jest.fn((keys: string[]) => Promise.resolve(keys.map((k) => [k, (mockStore ?? {})[k] ?? null]))),
  multiSet: jest.fn((pairs: [string, string][]) => { mockStore ??= {}; pairs.forEach(([k, v]) => { mockStore[k] = v; }); return Promise.resolve(); }),
  removeItem: jest.fn((key: string) => { delete (mockStore ?? {})[key]; return Promise.resolve(); }),
}));

import {
  isLessonUnlockedByEarnedProgress,
  resolveLastAvailableLessonId,
} from '../app/lesson_lock_system';
import { purchasedLessonsKey } from '../app/lessons_pearl_unlock_storage';
import { lessonBestScoreKey, unlockedLessonsKey } from '../app/target_storage_keys';

/** Эталон: тот самый цикл, который стоял на Главной до ускорения. */
async function resolveByLegacyLoop(requested: number): Promise<number> {
  let lessonId = requested;
  while (lessonId > 1 && !(await isLessonUnlockedByEarnedProgress(lessonId))) {
    lessonId -= 1;
  }
  return lessonId;
}

const resetStore = (): void => {
  for (const key of Object.keys(mockStore)) delete mockStore[key];
};

describe('resolveLastAvailableLessonId — паритет с прежним циклом', () => {
  beforeEach(resetStore);

  it('Free без прогресса спускается к третьему бесплатному уроку', async () => {
    expect(await resolveLastAvailableLessonId(12)).toBe(3);
  });

  it('урок 1 всегда доступен и не требует чтений', async () => {
    expect(await resolveLastAvailableLessonId(1)).toBe(1);
  });

  it('Free держится за точный купленный урок', async () => {
    mockStore[purchasedLessonsKey()] = JSON.stringify([9]);
    expect(await resolveLastAvailableLessonId(9)).toBe(9);
  });

  it('Free игнорирует старый прогресс после третьего урока', async () => {
    mockStore[lessonBestScoreKey(1)] = '3';
    mockStore[lessonBestScoreKey(2)] = '3';
    mockStore[lessonBestScoreKey(3)] = '3';
    mockStore[lessonBestScoreKey(10)] = '5';
    expect(await resolveLastAvailableLessonId(11)).toBe(3);
  });

  it('Plus спускается к ближайшему старту раздела', async () => {
    expect(await resolveLastAvailableLessonId(28, undefined, true)).toBe(19);
    expect(await resolveLastAvailableLessonId(32, undefined, true)).toBe(29);
  });

  it('Plus удерживает урок, открытый бронзой предыдущего', async () => {
    mockStore[lessonBestScoreKey(9)] = '2.5';
    expect(await resolveLastAvailableLessonId(10, undefined, true)).toBe(10);
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
      mockStore[unlockedLessonsKey()] = JSON.stringify(unlocked);
      for (const [id, score] of Object.entries(scores)) {
        mockStore[lessonBestScoreKey(Number(id))] = score;
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
