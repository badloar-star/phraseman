import type { PlanTaskKind } from './personal_plan_catalog';

/**
 * Week-by-week mode progression for generated plan days.
 *
 * Today every generated day exposes the same generated task set regardless of how far the
 * learner is. That gives zero sense of progression. This module decides which exercise
 * modes are *unlocked* by a given week, so a day-1 learner is eased in (recognition
 * first) and harder production/speaking/recall modes appear later.
 *
 * Modes are additive: each week keeps everything earlier weeks unlocked and adds more.
 * Pure module — fully unit-testable.
 */

/** Always-present anchors: the lesson slice + the day's phrase set. */
const ALWAYS_KINDS: readonly PlanTaskKind[] = [
  'linked_lesson_slice',
  'plan_phrase_lesson',
];

/** Modes unlocked the first time each week index is reached (cumulative). */
const WEEK_UNLOCKS: Record<number, readonly PlanTaskKind[]> = {
  // Week 1 — recognition & construction only.
  1: ['plan_missing_word', 'plan_choose_natural_phrase'],
  // Week 2 — add listening.
  2: ['plan_listen_choose', 'plan_listen_build'],
  // Week 3 — add real production: speaking and free recall.
  3: ['plan_pronunciation_repeat', 'plan_phrase_recall'],
};

const MAX_PROGRESSION_WEEK = 3;

/**
 * Ordered set of task kinds unlocked by the given (1-based) week.
 * Weeks beyond MAX_PROGRESSION_WEEK keep the full set.
 */
export function unlockedKindsForWeek(weekIndex: number): PlanTaskKind[] {
  const safeWeek = Number.isFinite(weekIndex) && weekIndex > 0 ? Math.floor(weekIndex) : 1;
  const cap = Math.min(safeWeek, MAX_PROGRESSION_WEEK);
  const unlocked: PlanTaskKind[] = [...ALWAYS_KINDS];
  for (let week = 1; week <= cap; week += 1) {
    const kinds = WEEK_UNLOCKS[week];
    if (kinds) unlocked.push(...kinds);
  }
  return unlocked;
}

/** True when a task kind is unlocked by the given week. */
export function isKindUnlockedForWeek(kind: PlanTaskKind, weekIndex: number): boolean {
  // Review/mistakes/trainer kinds are not gated by the progression — they are added
  // contextually elsewhere. Only the core generated modes are progression-gated.
  if (!PROGRESSION_GATED_KINDS.has(kind)) return true;
  return unlockedKindsForWeek(weekIndex).includes(kind);
}

const PROGRESSION_GATED_KINDS: ReadonlySet<PlanTaskKind> = new Set([
  'plan_missing_word',
  'plan_choose_natural_phrase',
  'plan_listen_choose',
  'plan_listen_build',
  'plan_pronunciation_repeat',
  'plan_phrase_recall',
  'plan_quiz',
]);

/**
 * Required-correct threshold for an exercise, growing gently with the week so the
 * plan asks for a bit more accuracy as the learner advances.
 */
export function requiredCorrectForWeek(baseRequired: number, weekIndex: number): number {
  const safeWeek = Number.isFinite(weekIndex) && weekIndex > 0 ? Math.floor(weekIndex) : 1;
  const bump = Math.min(2, Math.floor((safeWeek - 1) / 2));
  return Math.max(1, baseRequired + bump);
}
