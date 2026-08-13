import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PlanDay } from './personal_plan_catalog';
import { lessonGateForDay } from './plan_lesson_gate';
import { LESSON_COUNT } from './lesson_grammar_map';
import {
  lessonBestScoreKey,
  lessonPassCountKey,
  storageStudyTarget,
  type RuntimeStudyTarget,
} from './target_storage_keys';

/**
 * "Which lessons should I finish before this plan day?" recommendation.
 *
 * The grammar each plan day relies on lives in earlier app lessons. This surfaces the
 * lessons a learner has NOT yet passed but whose grammar the day needs, so the plan
 * menu can say "finish lesson 7 and 9 first — the day's phrases will make more sense".
 */

export type PlanDayLessonRecommendation = {
  /** Lessons the day's grammar depends on (passed or not). */
  prerequisiteLessonIds: number[];
  /** Subset the learner has not passed yet — what we actually recommend. */
  recommendedLessonIds: number[];
};

/**
 * The lessons a plan day depends on. Prefer the authored `curriculum.lessonPrerequisites`;
 * for generated days with no curriculum, fall back to the day's lesson gate (every lesson
 * up to the gate is fair game, but we recommend at most the gate lesson as the frontier).
 */
export function prerequisiteLessonsForDay(day: PlanDay): number[] {
  const authored = day.curriculum?.lessonPrerequisites;
  if (authored && authored.length > 0) {
    return [...new Set(authored)]
      .filter((id) => id >= 1 && id <= LESSON_COUNT)
      .sort((a, b) => a - b);
  }
  // No authored prerequisites: the gate lesson is the frontier for this day.
  return [lessonGateForDay(day.dayIndex)];
}

/**
 * Pure computation: given the day's prerequisites and the lessons the learner has
 * already passed, return what to recommend.
 */
export function computePlanDayLessonRecommendation(
  day: PlanDay,
  passedLessonIds: readonly number[],
): PlanDayLessonRecommendation {
  const prerequisiteLessonIds = prerequisiteLessonsForDay(day);
  const passed = new Set(passedLessonIds);
  const recommendedLessonIds = prerequisiteLessonIds.filter((id) => !passed.has(id));
  return { prerequisiteLessonIds, recommendedLessonIds };
}

function numeric(value: string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** A lesson counts as passed if it has at least one pass or a solid best score. */
export async function readPassedLessonIds(
  studyTarget?: RuntimeStudyTarget,
): Promise<number[]> {
  const target = storageStudyTarget(studyTarget);
  const lessonIds = Array.from({ length: LESSON_COUNT }, (_, index) => index + 1);
  const keys = lessonIds.flatMap((id) => [
    lessonPassCountKey(id, target),
    lessonBestScoreKey(id, target),
  ]);
  const pairs = await AsyncStorage.multiGet(keys);
  const value = new Map(pairs);

  return lessonIds.filter((id) => {
    const passCount = numeric(value.get(lessonPassCountKey(id, target)));
    const bestScore = numeric(value.get(lessonBestScoreKey(id, target)));
    return passCount > 0 || bestScore >= 4;
  });
}

/** Convenience: read progress and compute the recommendation for a plan day. */
export async function getPlanDayLessonRecommendation(
  day: PlanDay,
  studyTarget?: RuntimeStudyTarget,
): Promise<PlanDayLessonRecommendation> {
  const passed = await readPassedLessonIds(studyTarget);
  return computePlanDayLessonRecommendation(day, passed);
}
