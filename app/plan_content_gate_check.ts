import type { PlanContentDay } from './plan_content_schema';
import { phraseFitsDay, recommendedLessonsForDay } from './plan_lesson_gate';
import { lessonForConstruction } from './lesson_grammar_map';

/**
 * Soft grammar-gate check for a generated day.
 *
 * Owner decision: adaptivity is SOFT — we do not hard-block content, we surface
 * advisories. This reports phrases that use grammar beyond the day's lesson gate
 * (e.g. a gerund on day 1) and the lessons we'd recommend finishing first.
 *
 * Pure module.
 */

export type PlanContentGateWarning = {
  phraseId: string;
  /** Constructions used by the phrase that are above the day's gate. */
  aboveGateConstructions: string[];
  /** Lessons that introduce those constructions. */
  introducedByLessons: number[];
};

export type PlanContentGateReport = {
  dayIndex: number;
  /** Phrases that reach beyond the day's grammar gate (advisory only). */
  warnings: PlanContentGateWarning[];
  /** All distinct lessons recommended to finish before this day's grammar. */
  recommendedLessons: number[];
  /** True when every phrase stays within the day's gate. */
  withinGate: boolean;
};

export function checkPlanContentGate(day: PlanContentDay): PlanContentGateReport {
  const warnings: PlanContentGateWarning[] = [];
  const allConstructions = new Set<string>();

  for (const phrase of day.phrases) {
    phrase.constructions.forEach((construction) => allConstructions.add(construction));
    if (!phraseFitsDay(phrase.constructions, day.dayIndex)) {
      const aboveGate = phrase.constructions.filter(
        (construction) =>
          lessonForConstruction(construction) !== undefined &&
          !phraseFitsDay([construction], day.dayIndex),
      );
      warnings.push({
        phraseId: phrase.id,
        aboveGateConstructions: aboveGate,
        introducedByLessons: aboveGate
          .map((construction) => lessonForConstruction(construction))
          .filter((id): id is number => id !== undefined)
          .sort((a, b) => a - b),
      });
    }
  }

  const recommendedLessons = recommendedLessonsForDay([...allConstructions], []);

  return {
    dayIndex: day.dayIndex,
    warnings,
    recommendedLessons,
    withinGate: warnings.length === 0,
  };
}
