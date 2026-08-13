"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashLearningMemberKey = hashLearningMemberKey;
exports.prepareLearningCompletionMetrics = prepareLearningCompletionMetrics;
exports.commitPreparedLearningMetrics = commitPreparedLearningMetrics;
exports.fetchCohortRetentionMetrics = fetchCohortRetentionMetrics;
const node_crypto_1 = require("node:crypto");
const UTC_DAY_MS = 24 * 60 * 60 * 1000;
const COHORT_MEMBER_COLLECTION = 'jarvis_learning_cohort_members';
const COHORT_AGGREGATE_COLLECTION = 'jarvis_learning_cohorts';
const COHORT_ACTIVITY_COLLECTION = 'activity_days';
const TRUSTED_LEARNING_COMPLETION_EVENTS = new Set([
    'lesson_complete',
    'dialog_complete',
    'exam_complete',
    'plan_task_complete',
]);
function utcDayKey(value) {
    const time = value.getTime();
    if (!Number.isFinite(time))
        throw new Error('learning_metrics_invalid_date');
    return value.toISOString().slice(0, 10);
}
function addUtcDays(dayKey, deltaDays) {
    return new Date(Date.parse(`${dayKey}T00:00:00.000Z`) + deltaDays * UTC_DAY_MS)
        .toISOString()
        .slice(0, 10);
}
function daysBetween(cohortDate, activityDate) {
    const cohortMs = Date.parse(`${cohortDate}T00:00:00.000Z`);
    const activityMs = Date.parse(`${activityDate}T00:00:00.000Z`);
    if (!Number.isFinite(cohortMs) || !Number.isFinite(activityMs))
        return null;
    const difference = (activityMs - cohortMs) / UTC_DAY_MS;
    return Number.isInteger(difference) && difference >= 0 ? difference : null;
}
function isUtcDayKey(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}
function isSafeCount(value) {
    return Number.isSafeInteger(value) && Number(value) >= 0;
}
function emptyPrepared() {
    return Object.freeze({
        recorded: false,
        duplicate: false,
        cohortDate: null,
        horizonDays: null,
        writes: Object.freeze([]),
    });
}
function hashLearningMemberKey(stableUid) {
    const normalizedUid = stableUid.trim();
    if (!normalizedUid)
        throw new Error('learning_metrics_uid_required');
    return (0, node_crypto_1.createHash)('sha256').update(normalizedUid, 'utf8').digest('hex');
}
async function prepareLearningCompletionMetrics(input) {
    if (!TRUSTED_LEARNING_COMPLETION_EVENTS.has(input.eventType))
        return emptyPrepared();
    const activityDate = utcDayKey(input.occurredAt);
    const memberKey = hashLearningMemberKey(input.stableUid);
    const memberRef = input.db.collection(COHORT_MEMBER_COLLECTION).doc(memberKey);
    const memberSnap = await input.tx.get(memberRef);
    if (!memberSnap.exists) {
        const activityRef = memberRef.collection(COHORT_ACTIVITY_COLLECTION).doc(activityDate);
        const aggregateRef = input.db.collection(COHORT_AGGREGATE_COLLECTION).doc(activityDate);
        const timestamp = input.fields.serverTimestamp();
        const writes = Object.freeze([
            Object.freeze({
                operation: 'create',
                ref: memberRef,
                data: Object.freeze({ cohortDate: activityDate, createdAt: timestamp }),
            }),
            Object.freeze({
                operation: 'create',
                ref: activityRef,
                data: Object.freeze({ day: activityDate, horizonDays: 0, createdAt: timestamp }),
            }),
            Object.freeze({
                operation: 'set_merge',
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
    if (!isUtcDayKey(cohortDate))
        return emptyPrepared();
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
    const writes = Object.freeze([
        Object.freeze({
            operation: 'create',
            ref: activityRef,
            data: Object.freeze({ day: activityDate, horizonDays, createdAt: timestamp }),
        }),
        Object.freeze({
            operation: 'set_merge',
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
function commitPreparedLearningMetrics(tx, prepared) {
    for (const write of prepared.writes) {
        if (write.operation === 'create') {
            tx.create(write.ref, write.data);
        }
        else {
            tx.set(write.ref, write.data, { merge: true });
        }
    }
}
function parseAggregateSnapshot(snapshot, horizonDays, cohortDate, observedAtMs) {
    const sourceId = `jarvis_learning_cohorts_d${horizonDays}`;
    if (!snapshot.exists) {
        return Object.freeze({
            sourceId,
            state: 'empty',
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
            state: 'error',
            horizonDays,
            cohortDate,
            cohortSize: null,
            returningUsers: null,
            observedAtMs,
        });
    }
    return Object.freeze({
        sourceId,
        state: 'ready',
        horizonDays,
        cohortDate,
        cohortSize,
        returningUsers,
        observedAtMs,
    });
}
async function fetchCohortRetentionMetrics(input) {
    const observedAtMs = input.now.getTime();
    const today = utcDayKey(input.now);
    const requests = [1, 7].map((horizonDays) => {
        const cohortDate = addUtcDays(today, -horizonDays);
        return {
            horizonDays,
            cohortDate,
            ref: input.db.collection(COHORT_AGGREGATE_COLLECTION).doc(cohortDate),
        };
    });
    try {
        const snapshots = await input.db.getAll(...requests.map((request) => request.ref));
        return Object.freeze(requests.map((request, index) => parseAggregateSnapshot(snapshots[index], request.horizonDays, request.cohortDate, observedAtMs)));
    }
    catch {
        return Object.freeze(requests.map((request) => Object.freeze({
            sourceId: `jarvis_learning_cohorts_d${request.horizonDays}`,
            state: 'error',
            horizonDays: request.horizonDays,
            cohortDate: request.cohortDate,
            cohortSize: null,
            returningUsers: null,
            observedAtMs,
        })));
    }
}
