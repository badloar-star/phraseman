import type { PlanContentDay } from './plan_content_schema';
import { MITAP_CONTENT_DAYS } from './plan_content_mitap';
import { GAVAN_CONTENT_DAYS } from './plan_content_gavan';
import { IMPULS_CONTENT_DAYS } from './plan_content_impuls';
import { ECHO_CONTENT_DAYS } from './plan_content_echo';
import { VOYAZH_CONTENT_DAYS } from './plan_content_voyazh';

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

const ALL_CONTENT_DAYS: readonly PlanContentDay[] = [
  ...MITAP_CONTENT_DAYS,
  ...GAVAN_CONTENT_DAYS,
  ...IMPULS_CONTENT_DAYS,
  ...ECHO_CONTENT_DAYS,
  ...VOYAZH_CONTENT_DAYS,
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

/** All authored compatibility content for local dry-run pack parity tooling. */
export function listAuthoredPlanContentDays(): readonly PlanContentDay[] {
  return ALL_CONTENT_DAYS;
}

/** Number of day-specific theory screens authored for a plan day (0 if none). */
export function authoredPlanIntroCount(planId: string, dayIndex: number): number {
  return getAuthoredPlanContentDay(planId, dayIndex)?.intro.length ?? 0;
}
