"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEARNING_V2_ACTIVITY_RELEASED_SESSION_COMPLETION_MAX_BYTES_V1 = exports.LEARNING_V2_ACTIVITY_RELEASED_SESSION_COMPLETION_SCHEMA_V1 = void 0;
exports.materializeLearningV2ActivityReleasedSessionCompletionV1 = materializeLearningV2ActivityReleasedSessionCompletionV1;
exports.parseLearningV2ActivityReleasedSessionCompletionV1 = parseLearningV2ActivityReleasedSessionCompletionV1;
exports.rebindLearningV2ActivityReleasedSessionCompletionV1 = rebindLearningV2ActivityReleasedSessionCompletionV1;
exports.encodeLearningV2ActivityReleasedSessionCompletionV1 = encodeLearningV2ActivityReleasedSessionCompletionV1;
const decision_registry_1 = require("../policies/decision_registry");
const activity_released_session_package_v1_1 = require("../runtime/activity_released_session_package_v1");
exports.LEARNING_V2_ACTIVITY_RELEASED_SESSION_COMPLETION_SCHEMA_V1 = "learning-v2-activity-released-session-completion.v1";
exports.LEARNING_V2_ACTIVITY_RELEASED_SESSION_COMPLETION_MAX_BYTES_V1 = 96 * 1024;
const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const ROOT_KEYS = Object.freeze([
    "schemaVersion",
    "kind",
    "accountScopeHash",
    "accountGeneration",
    "seasonId",
    "studyTarget",
    "learnerSourceLocale",
    "releaseId",
    "activeManifestHash",
    "episodeId",
    "stageId",
    "activityPackageFingerprint",
    "packageFingerprint",
    "localSessionId",
    "sessionRunId",
    "sessionId",
    "sessionOrdinal",
    "taskCompletions",
    "answerPayload",
    "localFeedbackAuthority",
    "transportAuthority",
    "walletAuthority",
    "masteryAuthority",
    "evidenceAuthority",
    "completionAuthority",
    "releaseAuthority",
    "completionFingerprint",
]);
const TASK_KEYS = Object.freeze([
    "slot",
    "taskId",
    "activityId",
    "family",
    "purpose",
    "disposition",
    "learnerAttempts",
    "hintUsed",
    "localResultClaim",
]);
function fail() {
    throw new Error("learning_v2_activity_released_session_completion_invalid");
}
function record(value) {
    return (typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype);
}
function exactKeys(value, expected) {
    const own = Reflect.ownKeys(value);
    if (own.length !== expected.length ||
        own.some((key) => typeof key !== "string" || !expected.includes(key)))
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
function freeze(value) {
    if (typeof value !== "object" || value === null || Object.isFrozen(value))
        return value;
    Object.freeze(value);
    Object.values(value).forEach(freeze);
    return value;
}
function parseTask(value, expectedSlot) {
    if (!record(value))
        fail();
    exactKeys(value, TASK_KEYS);
    const disposition = value.disposition;
    if (disposition !== "completed" && disposition !== "skipped")
        fail();
    const learnerAttempts = safeInt(value.learnerAttempts, disposition === "completed" ? 1 : 0, 99);
    const localResultClaim = disposition === "completed"
        ? "locally_provisional_correct_before_completion"
        : "skipped_without_evidence";
    if (value.slot !== expectedSlot ||
        typeof value.hintUsed !== "boolean" ||
        value.localResultClaim !== localResultClaim)
        fail();
    return freeze({
        slot: expectedSlot,
        taskId: id(value.taskId),
        activityId: id(value.activityId),
        family: id(value.family),
        purpose: id(value.purpose),
        disposition,
        learnerAttempts,
        hintUsed: value.hintUsed,
        localResultClaim,
    });
}
function encodeBounded(value) {
    const raw = (0, decision_registry_1.canonicalJsonV1)(value);
    if (raw.length >
        exports.LEARNING_V2_ACTIVITY_RELEASED_SESSION_COMPLETION_MAX_BYTES_V1 ||
        (0, decision_registry_1.utf8ByteLengthV1)(raw) >
            exports.LEARNING_V2_ACTIVITY_RELEASED_SESSION_COMPLETION_MAX_BYTES_V1)
        fail();
    return raw;
}
function materializeLearningV2ActivityReleasedSessionCompletionV1(input) {
    if (!record(input) ||
        Object.keys(input).sort().join("|") !==
            "localSessionId|runtime|scope|sessionRunId|taskResults" ||
        !(0, activity_released_session_package_v1_1.isLearningV2ActivityReleasedSessionRuntimeHandleV1)(input.runtime) ||
        !record(input.scope) ||
        !Array.isArray(input.taskResults) ||
        input.taskResults.length !== 12)
        fail();
    const summary = (0, activity_released_session_package_v1_1.getLearningV2ActivityReleasedSessionRuntimeSummaryV1)(input.runtime);
    if (input.scope.seasonId !== summary.seasonId ||
        input.scope.studyTarget !== summary.studyTarget ||
        input.scope.learnerSourceLocale !== summary.learnerSourceLocale)
        fail();
    const resultByTask = new Map();
    input.taskResults.forEach((candidate) => {
        const row = candidate;
        if (!record(candidate) ||
            Object.keys(candidate).sort().join("|") !==
                "disposition|hintUsed|learnerAttempts|taskId" ||
            !ID_RE.test(row.taskId) ||
            resultByTask.has(row.taskId) ||
            (row.disposition !== "completed" && row.disposition !== "skipped") ||
            !Number.isSafeInteger(row.learnerAttempts) ||
            row.learnerAttempts < (row.disposition === "completed" ? 1 : 0) ||
            row.learnerAttempts > 99 ||
            typeof row.hintUsed !== "boolean")
            fail();
        resultByTask.set(row.taskId, row);
    });
    const taskCompletions = Object.freeze(Array.from({ length: 12 }, (_, index) => {
        const slot = index + 1;
        const task = (0, activity_released_session_package_v1_1.getLearningV2ActivityReleasedSessionTaskV1)(input.runtime, slot);
        const result = resultByTask.get(task.taskId);
        if (!result)
            fail();
        return freeze({
            slot,
            taskId: task.taskId,
            activityId: task.activityId,
            family: task.family,
            purpose: task.purpose,
            disposition: result.disposition,
            learnerAttempts: result.learnerAttempts,
            hintUsed: result.hintUsed,
            localResultClaim: result.disposition === "completed"
                ? "locally_provisional_correct_before_completion"
                : "skipped_without_evidence",
        });
    }));
    const body = freeze({
        schemaVersion: exports.LEARNING_V2_ACTIVITY_RELEASED_SESSION_COMPLETION_SCHEMA_V1,
        kind: "activity_released_session_completion",
        accountScopeHash: hash(input.scope.accountScopeHash),
        accountGeneration: safeInt(input.scope.generation, 0, Number.MAX_SAFE_INTEGER),
        seasonId: id(summary.seasonId),
        studyTarget: id(summary.studyTarget),
        learnerSourceLocale: id(summary.learnerSourceLocale),
        releaseId: id(summary.releaseId),
        activeManifestHash: hash(summary.activeManifestHash),
        episodeId: id(summary.episodeId),
        stageId: id(summary.stageId),
        activityPackageFingerprint: hash(summary.activityPackageFingerprint),
        packageFingerprint: hash(summary.packageFingerprint),
        localSessionId: id(input.localSessionId),
        sessionRunId: id(input.sessionRunId),
        sessionId: id(summary.sessionId),
        sessionOrdinal: safeInt(summary.sessionOrdinal, 1, 12),
        taskCompletions,
        answerPayload: "absent",
        localFeedbackAuthority: "local_provisional_only",
        transportAuthority: "none_local_spool_candidate",
        walletAuthority: "none",
        masteryAuthority: "none",
        evidenceAuthority: "none",
        completionAuthority: "none_server_revalidation_required",
        releaseAuthority: false,
    });
    const completion = freeze({
        ...body,
        completionFingerprint: (0, decision_registry_1.hashCanonicalBody)(body),
    });
    encodeBounded(completion);
    return completion;
}
function parseLearningV2ActivityReleasedSessionCompletionV1(input) {
    if (!record(input))
        fail();
    exactKeys(input, ROOT_KEYS);
    if (input.schemaVersion !==
        exports.LEARNING_V2_ACTIVITY_RELEASED_SESSION_COMPLETION_SCHEMA_V1 ||
        input.kind !== "activity_released_session_completion" ||
        !Array.isArray(input.taskCompletions) ||
        input.taskCompletions.length !== 12 ||
        input.answerPayload !== "absent" ||
        input.localFeedbackAuthority !== "local_provisional_only" ||
        input.transportAuthority !== "none_local_spool_candidate" ||
        input.walletAuthority !== "none" ||
        input.masteryAuthority !== "none" ||
        input.evidenceAuthority !== "none" ||
        input.completionAuthority !== "none_server_revalidation_required" ||
        input.releaseAuthority !== false)
        fail();
    const taskCompletions = Object.freeze(input.taskCompletions.map((candidate, index) => parseTask(candidate, index + 1)));
    if (new Set(taskCompletions.map((task) => task.taskId)).size !== 12 ||
        new Set(taskCompletions.map((task) => task.activityId)).size !== 12)
        fail();
    const body = freeze({
        schemaVersion: exports.LEARNING_V2_ACTIVITY_RELEASED_SESSION_COMPLETION_SCHEMA_V1,
        kind: "activity_released_session_completion",
        accountScopeHash: hash(input.accountScopeHash),
        accountGeneration: safeInt(input.accountGeneration, 0, Number.MAX_SAFE_INTEGER),
        seasonId: id(input.seasonId),
        studyTarget: id(input.studyTarget),
        learnerSourceLocale: id(input.learnerSourceLocale),
        releaseId: id(input.releaseId),
        activeManifestHash: hash(input.activeManifestHash),
        episodeId: id(input.episodeId),
        stageId: id(input.stageId),
        activityPackageFingerprint: hash(input.activityPackageFingerprint),
        packageFingerprint: hash(input.packageFingerprint),
        localSessionId: id(input.localSessionId),
        sessionRunId: id(input.sessionRunId),
        sessionId: id(input.sessionId),
        sessionOrdinal: safeInt(input.sessionOrdinal, 1, 12),
        taskCompletions,
        answerPayload: "absent",
        localFeedbackAuthority: "local_provisional_only",
        transportAuthority: "none_local_spool_candidate",
        walletAuthority: "none",
        masteryAuthority: "none",
        evidenceAuthority: "none",
        completionAuthority: "none_server_revalidation_required",
        releaseAuthority: false,
    });
    const completionFingerprint = hash(input.completionFingerprint);
    if ((0, decision_registry_1.hashCanonicalBody)(body) !== completionFingerprint)
        fail();
    const completion = freeze({ ...body, completionFingerprint });
    if ((0, decision_registry_1.canonicalJsonV1)(completion) !== encodeBounded(completion))
        fail();
    return completion;
}
/**
 * Rebinds an offline/local completion to the server-owned stable account and
 * generation. This changes only transport identity and grants no progress,
 * performance, wallet, mastery, evidence or release authority.
 */
function rebindLearningV2ActivityReleasedSessionCompletionV1(input, binding) {
    const completion = parseLearningV2ActivityReleasedSessionCompletionV1(input);
    if (!record(binding))
        fail();
    exactKeys(binding, ["accountScopeHash", "accountGeneration"]);
    const body = freeze({
        schemaVersion: completion.schemaVersion,
        kind: completion.kind,
        accountScopeHash: hash(binding.accountScopeHash),
        accountGeneration: safeInt(binding.accountGeneration, 1, Number.MAX_SAFE_INTEGER),
        seasonId: completion.seasonId,
        studyTarget: completion.studyTarget,
        learnerSourceLocale: completion.learnerSourceLocale,
        releaseId: completion.releaseId,
        activeManifestHash: completion.activeManifestHash,
        episodeId: completion.episodeId,
        stageId: completion.stageId,
        activityPackageFingerprint: completion.activityPackageFingerprint,
        packageFingerprint: completion.packageFingerprint,
        localSessionId: completion.localSessionId,
        sessionRunId: completion.sessionRunId,
        sessionId: completion.sessionId,
        sessionOrdinal: completion.sessionOrdinal,
        taskCompletions: completion.taskCompletions,
        answerPayload: completion.answerPayload,
        localFeedbackAuthority: completion.localFeedbackAuthority,
        transportAuthority: completion.transportAuthority,
        walletAuthority: completion.walletAuthority,
        masteryAuthority: completion.masteryAuthority,
        evidenceAuthority: completion.evidenceAuthority,
        completionAuthority: completion.completionAuthority,
        releaseAuthority: completion.releaseAuthority,
    });
    const rebound = freeze({
        ...body,
        completionFingerprint: (0, decision_registry_1.hashCanonicalBody)(body),
    });
    encodeBounded(rebound);
    return rebound;
}
function encodeLearningV2ActivityReleasedSessionCompletionV1(input) {
    return encodeBounded(parseLearningV2ActivityReleasedSessionCompletionV1(input));
}
//# sourceMappingURL=activity_released_session_completion_v1.js.map