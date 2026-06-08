import {
  LESSON_COUNT,
  constructionsUpToLesson,
  lessonForConstruction,
} from './lesson_grammar_map';

/**
 * Maps a personal-plan day to the lessons its content may rely on.
 *
 * The curve is deliberately gentle: early days stay on early-lesson grammar
 * (To Be / Present Simple), and the gate opens further as the plan progresses so a
 * learner is never asked to use, say, the gerund (lesson 22) on plan day 1.
 *
 * Pure module — the gate is a function of (dayIndex), not of user state. User
 * progress is layered on top separately (see recommendedLessonsForDay).
 */

/** Lessons unlocked on plan day 1 — the A1/early-A2 core. */
const DAY1_LESSON_CEILING = 8;
/** How many extra lessons unlock per plan day, on average. */
const LESSONS_PER_DAY = 0.8;

/**
 * Maximum lesson id whose grammar a plan day may use. Monotonic non-decreasing,
 * clamped to [DAY1_LESSON_CEILING, LESSON_COUNT].
 */
export function lessonGateForDay(dayIndex: number): number {
  const safeDay = Number.isFinite(dayIndex) && dayIndex > 0 ? Math.floor(dayIndex) : 1;
  const raw = DAY1_LESSON_CEILING + Math.floor((safeDay - 1) * LESSONS_PER_DAY);
  return Math.max(DAY1_LESSON_CEILING, Math.min(LESSON_COUNT, raw));
}

/** Construction tags a plan day is allowed to use. */
export function allowedConstructionsForDay(dayIndex: number): Set<string> {
  return constructionsUpToLesson(lessonGateForDay(dayIndex));
}

/**
 * True when every construction a phrase needs is unlocked by the given plan day.
 * Constructions not present in the grammar map are treated as thematic (non-grammar)
 * tags and never block a phrase.
 */
export function phraseFitsDay(
  requiredConstructions: readonly string[],
  dayIndex: number,
): boolean {
  if (requiredConstructions.length === 0) return true;
  const allowed = allowedConstructionsForDay(dayIndex);
  return requiredConstructions.every(
    (construction) =>
      lessonForConstruction(construction) === undefined || allowed.has(construction),
  );
}

/**
 * Lessons recommended before starting a plan day: the lessons that introduce the
 * grammar this day uses, minus the ones the learner has already passed.
 *
 * @param requiredConstructions grammar tags used by the day's phrases
 * @param passedLessonIds lessons the learner has already completed
 */
export function recommendedLessonsForDay(
  requiredConstructions: readonly string[],
  passedLessonIds: readonly number[],
): number[] {
  const passed = new Set(passedLessonIds);
  const needed = new Set<number>();
  for (const construction of requiredConstructions) {
    const lessonId = lessonForConstruction(construction);
    if (lessonId !== undefined && !passed.has(lessonId)) {
      needed.add(lessonId);
    }
  }
  return [...needed].sort((a, b) => a - b);
}
