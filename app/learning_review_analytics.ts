export const LEARNING_REVIEW_SCHEMA_VERSION = 1 as const;

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RESPONSE_TIME_MS = 120_000;

export type ActualDelayBucket =
  | 'under_24h'
  | 'd1_to_d6'
  | 'd7_to_d29'
  | 'd30_plus'
  | 'unknown';

export type ReviewDueStatus =
  | 'early'
  | 'on_time'
  | 'overdue_under_1d'
  | 'overdue_d1_to_d6'
  | 'overdue_d7_plus'
  | 'unknown';

export type LearningMasteryState =
  | 'learning'
  | 'strengthening'
  | 'mastered'
  | 'durable_mastered';

export type LearningMasteryTransition =
  | 'none'
  | 'strengthened'
  | 'mastered'
  | 'durable_mastered'
  | 'lapsed';

export function classifyActualDelay(delayMs: number): ActualDelayBucket {
  if (!Number.isFinite(delayMs) || delayMs < 0) return 'unknown';
  if (delayMs < DAY_MS) return 'under_24h';
  if (delayMs < 7 * DAY_MS) return 'd1_to_d6';
  if (delayMs < 30 * DAY_MS) return 'd7_to_d29';
  return 'd30_plus';
}

export function classifyDueStatus(offsetFromDueMs: number): ReviewDueStatus {
  if (!Number.isFinite(offsetFromDueMs)) return 'unknown';
  if (offsetFromDueMs < 0) return 'early';
  if (offsetFromDueMs === 0) return 'on_time';
  if (offsetFromDueMs < DAY_MS) return 'overdue_under_1d';
  if (offsetFromDueMs < 7 * DAY_MS) return 'overdue_d1_to_d6';
  return 'overdue_d7_plus';
}

export function utcMondayWeekStartIso(timestampMs: number): string {
  const date = new Date(timestampMs);
  if (!Number.isFinite(timestampMs) || Number.isNaN(date.getTime())) return '';
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

export function deriveMasteryTransition(input: {
  previousState?: LearningMasteryState;
  correct: boolean;
  actualDelayBucket: ActualDelayBucket;
}): {
  previousState: LearningMasteryState;
  nextState: LearningMasteryState;
  transition: LearningMasteryTransition;
} {
  const previousState = input.previousState ?? 'learning';

  if (!input.correct) {
    const wasMastered = previousState === 'mastered' || previousState === 'durable_mastered';
    return {
      previousState,
      nextState: 'learning',
      transition: wasMastered ? 'lapsed' : 'none',
    };
  }

  if (input.actualDelayBucket === 'd30_plus') {
    return {
      previousState,
      nextState: 'durable_mastered',
      transition: previousState === 'durable_mastered' ? 'none' : 'durable_mastered',
    };
  }
  if (input.actualDelayBucket === 'd7_to_d29') {
    const nextState = previousState === 'durable_mastered' ? 'durable_mastered' : 'mastered';
    return {
      previousState,
      nextState,
      transition: previousState === 'learning' || previousState === 'strengthening' ? 'mastered' : 'none',
    };
  }

  const remainsMastered = previousState === 'mastered' || previousState === 'durable_mastered';
  return {
    previousState,
    nextState: remainsMastered ? previousState : 'strengthening',
    transition: previousState === 'learning' ? 'strengthened' : 'none',
  };
}

export interface LearningReviewAnswerPayloadInput {
  eventId: string;
  reviewSessionId: string;
  reviewAttemptId: string;
  analyticsItemId: string;
  lessonId: number;
  studyTarget: string;
  source: string;
  reviewMode: string;
  contentVersion?: string;
  correct: boolean;
  responseTimeMs: number;
  actualDelayBucket: ActualDelayBucket;
  dueStatus: ReviewDueStatus;
  previousRepetitions: number;
  nextRepetitions: number;
  previousIntervalDays: number;
  nextIntervalDays: number;
  previousMasteryState: LearningMasteryState;
  nextMasteryState: LearningMasteryState;
  masteryTransition: LearningMasteryTransition;
}

function boundedInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function buildLearningReviewAnswerPayload(input: LearningReviewAnswerPayloadInput) {
  return {
    schema_version: LEARNING_REVIEW_SCHEMA_VERSION,
    event_id: input.eventId.slice(0, 120),
    review_session_id: input.reviewSessionId.slice(0, 120),
    review_attempt_id: input.reviewAttemptId.slice(0, 120),
    analytics_item_id: input.analyticsItemId.slice(0, 120),
    lesson_id: boundedInteger(input.lessonId, 0, 100_000),
    study_target: input.studyTarget.slice(0, 16),
    source: input.source.slice(0, 32),
    review_mode: input.reviewMode.slice(0, 32),
    content_version: (input.contentVersion?.trim() || 'legacy_unknown').slice(0, 40),
    correct: input.correct ? 1 : 0,
    response_time_ms: boundedInteger(input.responseTimeMs, 0, MAX_RESPONSE_TIME_MS),
    actual_delay_bucket: input.actualDelayBucket,
    due_status: input.dueStatus,
    previous_repetitions: boundedInteger(input.previousRepetitions, 0, 10_000),
    next_repetitions: boundedInteger(input.nextRepetitions, 0, 10_000),
    previous_interval_days: boundedInteger(input.previousIntervalDays, 0, 10_000),
    next_interval_days: boundedInteger(input.nextIntervalDays, 0, 10_000),
    previous_mastery_state: input.previousMasteryState,
    next_mastery_state: input.nextMasteryState,
    mastery_transition: input.masteryTransition,
  } as const;
}
