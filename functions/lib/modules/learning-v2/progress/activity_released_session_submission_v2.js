"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEARNING_V2_ACTIVITY_RELEASED_TASK_ATTEMPT_MAX_COUNT_V2 = exports.LEARNING_V2_ACTIVITY_RELEASED_TASK_ATTEMPT_MAX_BYTES_V2 = exports.LEARNING_V2_ACTIVITY_RELEASED_SESSION_SUBMISSION_MAX_BYTES_V2 = exports.LEARNING_V2_ACTIVITY_RELEASED_SESSION_SUBMISSION_SCHEMA_V2 = void 0;
exports.materializeLearningV2ActivityReleasedSessionSubmissionV2 = materializeLearningV2ActivityReleasedSessionSubmissionV2;
exports.parseLearningV2ActivityReleasedSessionSubmissionV2 = parseLearningV2ActivityReleasedSessionSubmissionV2;
exports.rebindLearningV2ActivityReleasedSessionSubmissionV2 = rebindLearningV2ActivityReleasedSessionSubmissionV2;
exports.submissionAttemptToLocalEvaluatorResponseV2 = submissionAttemptToLocalEvaluatorResponseV2;
const decision_registry_1 = require("../policies/decision_registry");
const activity_released_session_completion_v1_1 = require("./activity_released_session_completion_v1");
const activity_released_session_package_v1_1 = require("../runtime/activity_released_session_package_v1");
exports.LEARNING_V2_ACTIVITY_RELEASED_SESSION_SUBMISSION_SCHEMA_V2 = "learning-v2-activity-released-session-submission.v2";
exports.LEARNING_V2_ACTIVITY_RELEASED_SESSION_SUBMISSION_MAX_BYTES_V2 = 192 * 1024;
exports.LEARNING_V2_ACTIVITY_RELEASED_TASK_ATTEMPT_MAX_BYTES_V2 = 1024;
exports.LEARNING_V2_ACTIVITY_RELEASED_TASK_ATTEMPT_MAX_COUNT_V2 = 99;
const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const INPUT_KINDS = new Set(["text", "choice_token", "transcript"]);
const ROOT_KEYS = Object.freeze([
    "schemaVersion",
    "kind",
    "completion",
    "completionFingerprint",
    "accountScopeHash",
    "accountGeneration",
    "releaseId",
    "activeManifestHash",
    "episodeId",
    "stageId",
    "activityPackageFingerprint",
    "packageFingerprint",
    "sessionId",
    "sessionOrdinal",
    "sessionRunId",
    "taskAnswers",
    "answerTransport",
    "rawAudioPayload",
    "transcriptClaimAuthority",
    "answerSequenceAuthority",
    "localFeedbackAuthority",
    "performanceAuthority",
    "walletAuthority",
    "masteryAuthority",
    "evidenceAuthority",
    "completionAuthority",
    "releaseAuthority",
    "submissionFingerprint",
]);
const TASK_KEYS = Object.freeze([
    "slot",
    "taskId",
    "activityId",
    "family",
    "inputKind",
    "disposition",
    "attempts",
]);
const ATTEMPT_KEYS = Object.freeze(["attemptOrdinal", "kind", "value"]);
function fail() {
    throw new Error("learning_v2_activity_released_session_submission_invalid");
}
function record(value) {
    return (typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype);
}
function exactKeys(value, keys) {
    const own = Reflect.ownKeys(value);
    if (own.length !== keys.length ||
        own.some((key) => typeof key !== "string" || !keys.includes(key)))
        fail();
}
function id(value) {
    if (typeof value !== "string" || !ID_RE.test(value))
        fail();
    return value;
}
function hash(value) {
    if (typeof value !== "string" || !HASH_RE.test(value))
        fail();
    return value;
}
function safeInt(value, minimum, maximum) {
    if (!Number.isSafeInteger(value) ||
        Number(value) < minimum ||
        Number(value) > maximum)
        fail();
    return Number(value);
}
function inputKind(value) {
    if (typeof value !== "string" || !INPUT_KINDS.has(value))
        fail();
    return value;
}
function answerValue(value) {
    if (value === null)
        return null;
    if (typeof value !== "string" ||
        value.length > exports.LEARNING_V2_ACTIVITY_RELEASED_TASK_ATTEMPT_MAX_BYTES_V2 ||
        (0, decision_registry_1.utf8ByteLengthV1)(value) >
            exports.LEARNING_V2_ACTIVITY_RELEASED_TASK_ATTEMPT_MAX_BYTES_V2 ||
        value.normalize("NFC") !== value ||
        /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/u.test(value))
        fail();
    return value;
}
function freeze(value) {
    if (typeof value !== "object" || value === null || Object.isFrozen(value))
        return value;
    Object.freeze(value);
    Object.values(value).forEach(freeze);
    return value;
}
function parseAttempt(value, expectedOrdinal, expectedKind) {
    if (!record(value))
        fail();
    exactKeys(value, ATTEMPT_KEYS);
    const kind = inputKind(value.kind);
    if (value.attemptOrdinal !== expectedOrdinal || kind !== expectedKind)
        fail();
    return freeze({
        attemptOrdinal: expectedOrdinal,
        kind,
        value: answerValue(value.value),
    });
}
function parseTask(value, completion, expectedSlot) {
    if (!record(value))
        fail();
    exactKeys(value, TASK_KEYS);
    const completed = completion.taskCompletions[expectedSlot - 1];
    if (!completed || value.slot !== expectedSlot)
        fail();
    const kind = inputKind(value.inputKind);
    if (value.taskId !== completed.taskId ||
        value.activityId !== completed.activityId ||
        value.family !== completed.family ||
        value.disposition !== completed.disposition ||
        !Array.isArray(value.attempts) ||
        value.attempts.length !== completed.learnerAttempts ||
        value.attempts.length >
            exports.LEARNING_V2_ACTIVITY_RELEASED_TASK_ATTEMPT_MAX_COUNT_V2 ||
        (completed.disposition === "completed" && value.attempts.length < 1))
        fail();
    const attempts = Object.freeze(value.attempts.map((attempt, index) => parseAttempt(attempt, index + 1, kind)));
    return freeze({
        slot: expectedSlot,
        taskId: id(value.taskId),
        activityId: id(value.activityId),
        family: id(value.family),
        inputKind: kind,
        disposition: completed.disposition,
        attempts,
    });
}
function body(completion, taskAnswers) {
    return freeze({
        schemaVersion: exports.LEARNING_V2_ACTIVITY_RELEASED_SESSION_SUBMISSION_SCHEMA_V2,
        kind: "activity_released_session_submission",
        completion,
        completionFingerprint: completion.completionFingerprint,
        accountScopeHash: completion.accountScopeHash,
        accountGeneration: completion.accountGeneration,
        releaseId: completion.releaseId,
        activeManifestHash: completion.activeManifestHash,
        episodeId: completion.episodeId,
        stageId: completion.stageId,
        activityPackageFingerprint: completion.activityPackageFingerprint,
        packageFingerprint: completion.packageFingerprint,
        sessionId: completion.sessionId,
        sessionOrdinal: completion.sessionOrdinal,
        sessionRunId: completion.sessionRunId,
        taskAnswers,
        answerTransport: "bounded_post_session_batch_only",
        rawAudioPayload: "forbidden",
        transcriptClaimAuthority: "untrusted_client_text_claim_only",
        answerSequenceAuthority: "untrusted_client_sequence_only",
        localFeedbackAuthority: "local_provisional_only",
        performanceAuthority: "none_server_evaluation_required",
        walletAuthority: "none",
        masteryAuthority: "none",
        evidenceAuthority: "none",
        completionAuthority: "none_server_evaluation_required",
        releaseAuthority: false,
    });
}
function bounded(value) {
    const raw = (0, decision_registry_1.canonicalJsonV1)(value);
    if (raw.length >
        exports.LEARNING_V2_ACTIVITY_RELEASED_SESSION_SUBMISSION_MAX_BYTES_V2 ||
        (0, decision_registry_1.utf8ByteLengthV1)(raw) >
            exports.LEARNING_V2_ACTIVITY_RELEASED_SESSION_SUBMISSION_MAX_BYTES_V2)
        fail();
}
function materializeLearningV2ActivityReleasedSessionSubmissionV2(input) {
    if (!record(input) ||
        Object.keys(input).sort().join("|") !== "completion|runtime|taskAnswers" ||
        !(0, activity_released_session_package_v1_1.isLearningV2ActivityReleasedSessionRuntimeHandleV1)(input.runtime) ||
        !Array.isArray(input.taskAnswers) ||
        input.taskAnswers.length !== 12)
        fail();
    const completion = (0, activity_released_session_completion_v1_1.parseLearningV2ActivityReleasedSessionCompletionV1)(input.completion);
    const summary = (0, activity_released_session_package_v1_1.getLearningV2ActivityReleasedSessionRuntimeSummaryV1)(input.runtime);
    if (completion.releaseId !== summary.releaseId ||
        completion.activeManifestHash !== summary.activeManifestHash ||
        completion.episodeId !== summary.episodeId ||
        completion.stageId !== summary.stageId ||
        completion.activityPackageFingerprint !==
            summary.activityPackageFingerprint ||
        completion.packageFingerprint !== summary.packageFingerprint ||
        completion.sessionId !== summary.sessionId ||
        completion.sessionOrdinal !== summary.sessionOrdinal)
        fail();
    const answerByTaskId = new Map();
    for (const candidate of input.taskAnswers) {
        const taskId = record(candidate) ? candidate.taskId : null;
        if (!record(candidate) ||
            Object.keys(candidate).sort().join("|") !== "attempts|taskId" ||
            typeof taskId !== "string" ||
            !ID_RE.test(taskId) ||
            !Array.isArray(candidate.attempts) ||
            answerByTaskId.has(taskId))
            fail();
        answerByTaskId.set(taskId, candidate);
    }
    const taskAnswers = Object.freeze(Array.from({ length: 12 }, (_, index) => {
        const slot = index + 1;
        const task = (0, activity_released_session_package_v1_1.getLearningV2ActivityReleasedSessionTaskV1)(input.runtime, slot);
        const completed = completion.taskCompletions[index];
        const supplied = answerByTaskId.get(task.taskId);
        if (!completed || !supplied || completed.taskId !== task.taskId)
            fail();
        return parseTask({
            slot,
            taskId: task.taskId,
            activityId: task.activityId,
            family: task.family,
            inputKind: task.evaluatorInputKind,
            disposition: completed.disposition,
            attempts: supplied.attempts.map((attempt, attemptIndex) => ({
                attemptOrdinal: attemptIndex + 1,
                kind: attempt.kind,
                value: attempt.value,
            })),
        }, completion, slot);
    }));
    const value = body(completion, taskAnswers);
    const submission = freeze({
        ...value,
        submissionFingerprint: (0, decision_registry_1.hashCanonicalBody)(value),
    });
    bounded(submission);
    return submission;
}
function parseLearningV2ActivityReleasedSessionSubmissionV2(value) {
    if (!record(value))
        fail();
    exactKeys(value, ROOT_KEYS);
    if (value.schemaVersion !==
        exports.LEARNING_V2_ACTIVITY_RELEASED_SESSION_SUBMISSION_SCHEMA_V2 ||
        value.kind !== "activity_released_session_submission" ||
        value.answerTransport !== "bounded_post_session_batch_only" ||
        value.rawAudioPayload !== "forbidden" ||
        value.transcriptClaimAuthority !== "untrusted_client_text_claim_only" ||
        value.answerSequenceAuthority !== "untrusted_client_sequence_only" ||
        value.localFeedbackAuthority !== "local_provisional_only" ||
        value.performanceAuthority !== "none_server_evaluation_required" ||
        value.walletAuthority !== "none" ||
        value.masteryAuthority !== "none" ||
        value.evidenceAuthority !== "none" ||
        value.completionAuthority !== "none_server_evaluation_required" ||
        value.releaseAuthority !== false ||
        !Array.isArray(value.taskAnswers) ||
        value.taskAnswers.length !== 12)
        fail();
    const completion = (0, activity_released_session_completion_v1_1.parseLearningV2ActivityReleasedSessionCompletionV1)(value.completion);
    if (value.completionFingerprint !== completion.completionFingerprint ||
        value.accountScopeHash !== completion.accountScopeHash ||
        value.accountGeneration !== completion.accountGeneration ||
        value.releaseId !== completion.releaseId ||
        value.activeManifestHash !== completion.activeManifestHash ||
        value.episodeId !== completion.episodeId ||
        value.stageId !== completion.stageId ||
        value.activityPackageFingerprint !==
            completion.activityPackageFingerprint ||
        value.packageFingerprint !== completion.packageFingerprint ||
        value.sessionId !== completion.sessionId ||
        value.sessionOrdinal !== completion.sessionOrdinal ||
        value.sessionRunId !== completion.sessionRunId)
        fail();
    const taskAnswers = Object.freeze(value.taskAnswers.map((task, index) => parseTask(task, completion, index + 1)));
    const expected = body(completion, taskAnswers);
    const submissionFingerprint = hash(value.submissionFingerprint);
    if ((0, decision_registry_1.hashCanonicalBody)(expected) !== submissionFingerprint)
        fail();
    const result = freeze({ ...expected, submissionFingerprint });
    bounded(result);
    return result;
}
function rebindLearningV2ActivityReleasedSessionSubmissionV2(input, account) {
    if (!record(account) ||
        Object.keys(account).sort().join("|") !==
            "accountGeneration|accountScopeHash")
        fail();
    const submission = parseLearningV2ActivityReleasedSessionSubmissionV2(input);
    const completion = (0, activity_released_session_completion_v1_1.rebindLearningV2ActivityReleasedSessionCompletionV1)(submission.completion, {
        accountScopeHash: hash(account.accountScopeHash),
        accountGeneration: safeInt(account.accountGeneration, 1, Number.MAX_SAFE_INTEGER),
    });
    const reboundBody = body(completion, submission.taskAnswers);
    const rebound = freeze({
        ...reboundBody,
        submissionFingerprint: (0, decision_registry_1.hashCanonicalBody)(reboundBody),
    });
    bounded(rebound);
    return rebound;
}
function submissionAttemptToLocalEvaluatorResponseV2(attempt) {
    return Object.freeze({ kind: attempt.kind, value: attempt.value });
}
//# sourceMappingURL=activity_released_session_submission_v2.js.map