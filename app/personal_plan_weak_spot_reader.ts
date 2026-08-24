import { listPersonalPlanAttemptEvents } from './personal_plan_attempt_events';
import {
  buildPlanWeakSpotSummary,
  type PlanWeakSpotSignal,
  type PlanWeakSpotSummary,
} from './personal_plan_weak_spot_summary';
/**
 * UI-facing reader for plan weak spots.
 *
 * The plan exercise flow writes attempt events (with grammar/vocabulary/mistake tags)
 * but nothing read them for display. This loads a plan instance's attempt events and
 * builds a weak-spot summary so the plan stats screen can finally show the learner
 * WHERE they struggle (which grammar/words), turning collected data into feedback.
 */

export type PlanWeakSpotRow = {
  id: string;
  kind: 'grammar' | 'vocabulary' | 'mistake';
  /** The raw tag (e.g. "to-be", "present-perfect", "arrival"). */
  tag: string;
  /** A human label: for grammar tags that are a real POS, the POS; else the tag. */
  label: string;
  wrongCount: number;
};

export type PlanWeakSpotView = {
  totals: PlanWeakSpotSummary['totals'];
  /** Top weak spots, most-wrong first. */
  rows: PlanWeakSpotRow[];
  hasData: boolean;
};

function labelForSignal(signal: PlanWeakSpotSignal): string {
  // Show the raw tag. We deliberately do NOT run it through normalizeWordCategory:
  // grammar tags like "present-perfect" are not a POS and would be regex-coerced
  // into a fake "verb". The tag itself is the honest label.
  return signal.tag;
}

/** Build the UI weak-spot view for a plan instance from its stored attempt events. */
export async function readPlanWeakSpotView(
  planInstanceId: string,
  options?: { maxRows?: number },
): Promise<PlanWeakSpotView> {
  const maxRows = options?.maxRows ?? 6;
  const attempts = await listPersonalPlanAttemptEvents(planInstanceId).catch(() => []);
  const summary = buildPlanWeakSpotSummary(
    { attempts, recoveryCandidates: [] },
    { planInstanceId },
  );

  const rows: PlanWeakSpotRow[] = summary.weakSpots
    .filter((signal) => signal.wrongCount > 0)
    .slice(0, maxRows)
    .map((signal) => ({
      id: signal.id,
      kind: signal.kind,
      tag: signal.tag,
      label: labelForSignal(signal),
      wrongCount: signal.wrongCount,
    }));

  return {
    totals: summary.totals,
    rows,
    hasData: summary.totals.attempts > 0,
  };
}
