// Число заданий в лёгком индексе курса (3 · МАКЕТЫ 24.10: окно эпизода писало «0 заданий»). Сторож: число из индекса совпадает
// со сборщиком плеера, и у каждого занятия каталога есть запись (новое занятие без пересчёта — подпись пропадёт молча).
import { FACTORY_NATIVE_CATALOG_ROWS_V1 } from '../modules/learning-v2/content/factory_native/factory_native_catalog_v1.generated';
import { factoryNativeLearningV2TaskCountV1 } from '../modules/learning-v2/content/factory_native/factory_native_catalog_v1';
import { FACTORY_NATIVE_TASK_COUNTS_V1 } from '../modules/learning-v2/content/factory_native/factory_native_task_counts_v1.generated';
import { materializeFactoryNativeLearningV2SessionV1 } from '../modules/learning-v2/content/factory_native/factory_native_course_v1';

describe('learning v2 task counts in the light index', () => {
  it('matches what the player builds (word cards are not tasks)', () => {
    for (const [lesson, session] of [[1, 1], [1, 3], [3, 10], [12, 40]] as const) {
      const built = materializeFactoryNativeLearningV2SessionV1({ lessonOrdinal: lesson, sessionOrdinal: session, interfaceLocale: 'ru' });
      expect(built).not.toBeNull();
      expect(factoryNativeLearningV2TaskCountV1(lesson, session)).toBe(built!.learnerChild.interactions.length);
    }
  });

  it('has an entry for every catalog session — rebuild with scripts/build_learning_v2_task_counts.ts after release changes', () => {
    const missing = FACTORY_NATIVE_CATALOG_ROWS_V1
      .map((row) => `${row.lessonOrdinal}:${row.sessionOrdinal}`)
      .filter((key) => !FACTORY_NATIVE_TASK_COUNTS_V1[key]);
    expect(missing).toEqual([]);
  });

  it('a changed session shows no number instead of a wrong one', () => {
    expect(factoryNativeLearningV2TaskCountV1(99, 1)).toBeNull();
  });
});
