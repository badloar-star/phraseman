/**
 * Замок сценариев ИИ-диалогов по уровню (CEFR).
 *
 * Идея (запрос пользователя): сценарии открываются по мере прохождения курса —
 * как и уроки. Сценарий уровня A2 доступен, если ученик ДОШЁЛ до A2 в курсе
 * ИЛИ у него есть Premium (Premium открывает все уровни сразу).
 *
 * Чистый модуль без React/Firestore — логика тривиально тестируется.
 * Источник прогресса (массив открытых уроков) передаётся снаружи: на клиенте —
 * из loadLessonsTabStateFromStorage().persistedUnlocked.
 */
import {
  COURSE_LEVELS,
  getCourseLevelForLesson,
  getCourseLevelIndex,
  type CourseLevel,
} from './course_levels';

/**
 * Достигнутый уровень курса = уровень самого старшего открытого урока.
 * Урок 1 открыт всегда, поэтому минимум — A1. Пустой/битый ввод → A1.
 */
export function reachedCourseLevel(unlockedLessons: readonly number[] | null | undefined): CourseLevel {
  let maxLesson = 1;
  if (Array.isArray(unlockedLessons)) {
    for (const raw of unlockedLessons) {
      const n = Number(raw);
      if (Number.isFinite(n) && n > maxLesson) maxLesson = n;
    }
  }
  return getCourseLevelForLesson(maxLesson);
}

/**
 * Открыт ли уровень сценария.
 * Premium открывает всё. Иначе — только уровни не выше достигнутого в курсе.
 */
export function isScenarioLevelUnlocked(
  scenarioCefr: string,
  reached: CourseLevel,
  hasPremiumAccess: boolean,
): boolean {
  if (hasPremiumAccess) return true;
  const scenarioIdx = getCourseLevelIndex(scenarioCefr as CourseLevel);
  // Уровень сценария вне A1–B2 (например, C1) — индекс -1; такого в каталоге нет,
  // но на всякий случай считаем «не заблокирован», чтобы не спрятать контент молча.
  if (scenarioIdx < 0) return true;
  return scenarioIdx <= getCourseLevelIndex(reached);
}

/**
 * Все уровни, встречающиеся в каталоге, в каноничном порядке A1→B2.
 * Используется для группировки списка по уровню.
 */
export function dialogLevelsInOrder(): readonly CourseLevel[] {
  return COURSE_LEVELS;
}
