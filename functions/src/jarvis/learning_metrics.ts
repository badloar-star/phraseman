import { createHash } from 'node:crypto';

const UTC_DAY_MS = 24 * 60 * 60 * 1_000;
const COHORT_MEMBER_COLLECTION = 'jarvis_learning_cohort_members';
const COHORT_AGGREGATE_COLLECTION = 'jarvis_learning_cohorts';
const COHORT_ACTIVITY_COLLECTION = 'activity_days';
const TRUSTED_LEARNING_COMPLETION_EVENTS = new Set([
  'lesson_complete',
  'dialog_complete',
  'exam_complete',
  'plan_task_complete',
]);

export interface LearningMetricFields {
  readonly increment: (value: number) => unknown;
  readonly serverTimestamp: () => unknown;
}

export interface PreparedLearningMetricWrite {
  readonly operation: 'create' | 'set_merge';
  readonly ref: FirebaseFirestore.DocumentReference;
  readonly data: Record<string, unknown>;
}

export interface PreparedLearningMetrics {
  readonly recorded: boolean;
  readonly duplicate: boolean;
  readonly cohortDate: string | null;
  readonly horizonDays: number | null;
  readonly writes: readonly PreparedLearningMetricWrite[];
}

export interface PrepareLearningCompletionMetricsInput {
  readonly db: FirebaseFirestore.Firestore;
  readonly tx: FirebaseFirestore.Transaction;
  readonly stableUid: string;
  readonly eventType: string;
  readonly occurredAt: Date;
  readonly fields: LearningMetricFields;
}

export type CohortRetentionMetricState = 'ready' | 'empty' | 'error';

export interface CohortRetentionMetric {
  readonly sourceId: `jarvis_learning_cohorts_d${1 | 7}`;
  readonly state: CohortRetentionMetricState;
  readonly horizonDays: 1 | 7;
  readonly cohortDate: string;
  readonly cohortSize: number | null;
  readonly returningUsers: number | null;
  readonly observedAtMs: number;
}

export interface FetchCohortRetentionMetricsInput {
  readonly db: FirebaseFirestore.Firestore;
  readonly now: Date;
}

function utcDayKey(value: Date): string {
  const time = value.getTime();
  if (!Number.isFinite(time)) throw new Error('learning_metrics_invalid_date');
  return value.toISOString().slice(0, 10);
}

function addUtcDays(dayKey: string, deltaDays: number): string {
  return new Date(Date.parse(`${dayKey}T00:00:00.000Z`) + deltaDays * UTC_DAY_MS)
    .toISOString()
    .slice(0, 10);
}

function daysBetween(cohortDate: string, activityDate: string): number | null {
  const cohortMs = Date.parse(`${cohortDate}T00:00:00.000Z`);
  const activityMs = Date.parse(`${activityDate}T00:00:00.000Z`);
  if (!Number.isFinite(cohortMs) || !Number.isFinite(activityMs)) return null;
  const difference = (activityMs - cohortMs) / UTC_DAY_MS;
  return Number.isInteger(difference) && difference >= 0 ? difference : null;
}

function isUtcDayKey(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isSafeCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function emptyPrepared(): PreparedLearningMetrics {
  return Object.freeze({
    recorded: false,
    duplicate: false,
    cohortDate: null,
    horizonDays: null,
    writes: Object.freeze([]),
  });
}

export function hashLearningMemberKey(stableUid: string): string {
  const normalizedUid = stableUid.trim();
  if (!normalizedUid) throw new Error('learning_metrics_uid_required');
  return createHash('sha256').update(normalizedUid, 'utf8').digest('hex');
}

export async function prepareLearningCompletionMetrics(
  input: PrepareLearningCompletionMetricsInput,
): Promise<PreparedLearningMetrics> {
  if (!TRUSTED_LEARNING_COMPLETION_EVENTS.has(input.eventType)) return emptyPrepared();

  const activityDate = utcDayKey(input.occurredAt);
  const memberKey = hashLearningMemberKey(input.stableUid);
  const memberRef = input.db.collection(COHORT_MEMBER_COLLECTION).doc(memberKey);
  const memberSnap = await input.tx.get(memberRef);

  if (!memberSnap.exists) {
    const activityRef = memberRef.collection(COHORT_ACTIVITY_COLLECTION).doc(activityDate);
    const aggregateRef = input.db.collection(COHORT_AGGREGATE_COLLECTION).doc(activityDate);
    const timestamp = input.fields.serverTimestamp();
    const writes: readonly PreparedLearningMetricWrite[] = Object.freeze([
      Object.freeze({
        operation: 'create' as const,
        ref: memberRef,
        data: Object.freeze({ cohortDate: activityDate, createdAt: timestamp }),
      }),
      Object.freeze({
        operation: 'create' as const,
        ref: activityRef,
        data: Object.freeze({ day: activityDate, horizonDays: 0, createdAt: timestamp }),
      }),
      Object.freeze({
        operation: 'set_merge' as const,
        ref: aggregateRef,
        data: Object.freeze({
          cohortDate: activityDate,
          cohortSize: input.fields.increment(1),
          d1ReturningUsers: input.fields.increment(0),
          d7ReturningUsers: input.fields.increment(0),
          updatedAt: timestamp,
        }),
      }),
    ]);
    return Object.freeze({
      recorded: true,
      duplicate: false,
      cohortDate: activityDate,
      horizonDays: 0,
      writes,
    });
  }

  const cohortDate = memberSnap.data()?.cohortDate;
  if (!isUtcDayKey(cohortDate)) return emptyPrepared();
  const horizonDays = daysBetween(cohortDate, activityDate);
  if (horizonDays !== 1 && horizonDays !== 7) {
    return Object.freeze({
      recorded: false,
      duplicate: false,
      cohortDate,
      horizonDays,
      writes: Object.freeze([]),
    });
  }

  const activityRef = memberRef.collection(COHORT_ACTIVITY_COLLECTION).doc(activityDate);
  const activitySnap = await input.tx.get(activityRef);
  if (activitySnap.exists) {
    return Object.freeze({
      recorded: false,
      duplicate: true,
      cohortDate,
      horizonDays,
      writes: Object.freeze([]),
    });
  }

  const aggregateRef = input.db.collection(COHORT_AGGREGATE_COLLECTION).doc(cohortDate);
  const returningField = horizonDays === 1 ? 'd1ReturningUsers' : 'd7ReturningUsers';
  const timestamp = input.fields.serverTimestamp();
  const writes: readonly PreparedLearningMetricWrite[] = Object.freeze([
    Object.freeze({
      operation: 'create' as const,
      ref: activityRef,
      data: Object.freeze({ day: activityDate, horizonDays, createdAt: timestamp }),
    }),
    Object.freeze({
      operation: 'set_merge' as const,
      ref: aggregateRef,
      data: Object.freeze({
        cohortDate,
        [returningField]: input.fields.increment(1),
        updatedAt: timestamp,
      }),
    }),
  ]);
  return Object.freeze({
    recorded: true,
    duplicate: false,
    cohortDate,
    horizonDays,
    writes,
  });
}

export function commitPreparedLearningMetrics(
  tx: FirebaseFirestore.Transaction,
  prepared: PreparedLearningMetrics,
): void {
  for (const write of prepared.writes) {
    if (write.operation === 'create') {
      tx.create(write.ref, write.data);
    } else {
      tx.set(write.ref, write.data, { merge: true });
    }
  }
}

function parseAggregateSnapshot(
  snapshot: FirebaseFirestore.DocumentSnapshot,
  horizonDays: 1 | 7,
  cohortDate: string,
  observedAtMs: number,
): CohortRetentionMetric {
  const sourceId = `jarvis_learning_cohorts_d${horizonDays}` as const;
  if (!snapshot.exists) {
    return Object.freeze({
      sourceId,
      state: 'empty' as const,
      horizonDays,
      cohortDate,
      cohortSize: null,
      returningUsers: null,
      observedAtMs,
    });
  }

  const data = snapshot.data();
  const cohortSize = data?.cohortSize;
  const returningUsers = data?.[horizonDays === 1 ? 'd1ReturningUsers' : 'd7ReturningUsers'];
  if (data?.cohortDate !== cohortDate
    || !isSafeCount(cohortSize)
    || !isSafeCount(returningUsers)
    || returningUsers > cohortSize) {
    return Object.freeze({
      sourceId,
      state: 'error' as const,
      horizonDays,
      cohortDate,
      cohortSize: null,
      returningUsers: null,
      observedAtMs,
    });
  }

  return Object.freeze({
    sourceId,
    state: 'ready' as const,
    horizonDays,
    cohortDate,
    cohortSize,
    returningUsers,
    observedAtMs,
  });
}

export async function fetchCohortRetentionMetrics(
  input: FetchCohortRetentionMetricsInput,
): Promise<readonly CohortRetentionMetric[]> {
  const observedAtMs = input.now.getTime();
  const today = utcDayKey(input.now);
  const requests = ([1, 7] as const).map((horizonDays) => {
    const cohortDate = addUtcDays(today, -horizonDays);
    return {
      horizonDays,
      cohortDate,
      ref: input.db.collection(COHORT_AGGREGATE_COLLECTION).doc(cohortDate),
    };
  });

  try {
    const snapshots = await input.db.getAll(...requests.map((request) => request.ref));
    return Object.freeze(requests.map((request, index) => parseAggregateSnapshot(
      snapshots[index],
      request.horizonDays,
      request.cohortDate,
      observedAtMs,
    )));
  } catch {
    return Object.freeze(requests.map((request) => Object.freeze({
      sourceId: `jarvis_learning_cohorts_d${request.horizonDays}` as const,
      state: 'error' as const,
      horizonDays: request.horizonDays,
      cohortDate: request.cohortDate,
      cohortSize: null,
      returningUsers: null,
      observedAtMs,
    })));
  }
}
