// learning_v2_placement_entry_v1.ts — показывать ли вход в тест уровня «Проверить уровень» в курсе. Чистая функция, без хранения и сети.
// зачем (жалоба №8, владелец 28.10 кнопками через координатора, вариант А): «Проверить уровень» видна, пока тест на аккаунте не
// использован, сколько бы занятий ни было пройдено (раньше — только новичку до первого занятия, и платный человек на уровне B1 оставался
// запертым в уроке 1); дальше урока 10 — не показывать: тест не поднимет старт выше урока 10 (PLACEMENT_START_CAP_LESSON_V1).
// Замок «1 раз на аккаунт» (22.10) остаётся: флаг использования ставится на итоге теста. Итог теста прогресс не понижает (placeStart
// двигает старт только вперёд). Журнал [PLACEMENT-ENTRY].
import { PLACEMENT_START_CAP_LESSON_V1 } from '../modules/learning-v2/exam/placement_test_v1';

export type LearningV2PlacementEntryReasonV1 = 'shown' | 'used' | 'used_unknown' | 'beyond_cap';
export type LearningV2PlacementEntryV1 = Readonly<{ show: boolean; reason: LearningV2PlacementEntryReasonV1 }>;

/**
 * `used` — флаг «тест уже использован» (null — ещё не прочитан: кнопку не показываем, показать второй раз хуже, чем показать на миг позже);
 * `currentLessonOrdinal` — урок текущего занятия (null — курс не начат = урок 1).
 */
export function learningV2PlacementEntryV1(input: Readonly<{ used: boolean | null; currentLessonOrdinal: number | null; where: string }>): LearningV2PlacementEntryV1 {
  const lesson = input.currentLessonOrdinal ?? 1;
  const decision: LearningV2PlacementEntryV1 = input.used === null ? { show: false, reason: 'used_unknown' }
    : input.used ? { show: false, reason: 'used' }
      : lesson >= PLACEMENT_START_CAP_LESSON_V1 ? { show: false, reason: 'beyond_cap' }
        : { show: true, reason: 'shown' };
  console.log('[PLACEMENT-ENTRY]', JSON.stringify({ where: input.where, used: input.used, currentLesson: lesson, cap: PLACEMENT_START_CAP_LESSON_V1, show: decision.show, reason: decision.reason })); // guard-ok: почему вход виден или нет
  return Object.freeze(decision);
}

export default function __RouteShim() { return null; }
