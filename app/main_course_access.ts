/**
 * Границы основного курса и правило его открытия.
 *
 * Решение владельца 2026-09-17 (ОТМЕНЯЕТ решение 2026-09-08 «все 32 урока
 * открыты всем»): курс снова открывается по мере прохождения. Это НЕ пейвол —
 * Plus здесь ни при чём. Урок открывает либо заработанный прогресс, либо
 * покупка за 100 жемчужин (см. app/lessons_pearl_unlock.ts).
 *
 * зачем именно так: прежнее исключение стояло первым коротким замыканием в
 * шести проверках доступа и делало недостижимой всю уже написанную систему
 * замков. Здесь остался только диапазон курса — правило доступа переехало
 * туда, где ему место (lesson_lock_system / monetization_policy).
 */
export const MAIN_COURSE_LESSON_COUNT = 32;

/** Входит ли id в основной курс. Ничего не говорит о доступе — только о границах. */
export function isMainCourseLesson(lessonId: number): boolean {
  return Number.isInteger(lessonId) && lessonId >= 1 && lessonId <= MAIN_COURSE_LESSON_COUNT;
}

/**
 * Первый урок открыт всегда и безусловно — единственное вечное исключение.
 * Остальное решает прогресс или покупка.
 */
export function isAlwaysOpenLesson(lessonId: number): boolean {
  return lessonId === 1;
}

/**
 * Уроки на границах уровней открываются ТОЛЬКО сдачей зачёта предыдущего
 * уровня (решение владельца 2026-09-17), а не бронзой предыдущего урока.
 */
export const LEVEL_GATE_LESSON_IDS: readonly number[] = [9, 19, 29];

export function isLevelGateLesson(lessonId: number): boolean {
  return LEVEL_GATE_LESSON_IDS.includes(lessonId);
}

export default function __RouteShim() { return null; }
