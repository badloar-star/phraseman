import type { PlanContentDay } from './plan_content_schema';
import { MITAP_CONTENT_DAYS } from './plan_content_mitap';

/**
 * Registry of authored PlanContentDay content from the new pipeline, keyed by
 * `${planId}:${dayIndex}`. This is the single place the runtime looks up "do we have
 * real agent-authored content for this plan day?" — if yes, the runtime uses the
 * pipeline (full explanations, day vocabulary, authored POS + distractors); if no, it
 * falls back to the old template path.
 *
 * As more days are authored through the content-agent pipeline, they are registered
 * here (e.g. MITAP_CONTENT_DAYS, etc.). Pure module.
 */

function keyFor(planId: string, dayIndex: number): string {
  return `${planId}:${dayIndex}`;
}

// 2026-06-10: voyazh authored content (84 days, old concept) deleted by owner
// decision — Компас gets fully regenerated content in Ф4. Until then voyazh days
// fall back to the template path like the other non-authored plans.
const ALL_CONTENT_DAYS: readonly PlanContentDay[] = [
  ...MITAP_CONTENT_DAYS,
];

const CONTENT_BY_KEY: ReadonlyMap<string, PlanContentDay> = new Map(
  ALL_CONTENT_DAYS.map((day) => [keyFor(day.planId, day.dayIndex), day]),
);

/** Authored content for a plan day, or undefined when only the old fallback exists. */
export function getAuthoredPlanContentDay(
  planId: string,
  dayIndex: number,
): PlanContentDay | undefined {
  return CONTENT_BY_KEY.get(keyFor(planId, dayIndex));
}

/** True when the new pipeline has real content for this plan day. */
export function hasAuthoredPlanContent(planId: string, dayIndex: number): boolean {
  return CONTENT_BY_KEY.has(keyFor(planId, dayIndex));
}

/** Number of day-specific theory screens authored for a plan day (0 if none). */
export function authoredPlanIntroCount(planId: string, dayIndex: number): number {
  return getAuthoredPlanContentDay(planId, dayIndex)?.intro.length ?? 0;
}
