"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEARNING_V2_COURSE_SESSION_COMPLETED_SUMMARY_MAX_BYTES_V1 = exports.LEARNING_V2_COURSE_SESSION_COMPLETED_SUMMARY_SCHEMA_V1 = exports.LEARNING_V2_COURSE_SESSION_DEVICE_RUN_SCHEMA_V1 = void 0;
exports.createLearningV2CourseSessionDeviceRunV1 = createLearningV2CourseSessionDeviceRunV1;
exports.isLearningV2CourseSessionDeviceRunHandleV1 = isLearningV2CourseSessionDeviceRunHandleV1;
exports.getLearningV2CourseSessionDeviceRunSummaryV1 = getLearningV2CourseSessionDeviceRunSummaryV1;
exports.getLearningV2CourseSessionIntroPageV1 = getLearningV2CourseSessionIntroPageV1;
exports.getLearningV2CourseSessionPracticeInteractionV1 = getLearningV2CourseSessionPracticeInteractionV1;
exports.getLearningV2CourseSessionAuxiliaryEntryV1 = getLearningV2CourseSessionAuxiliaryEntryV1;
exports.getLearningV2CourseSessionNewWordEncountersV1 = getLearningV2CourseSessionNewWordEncountersV1;
exports.evaluateLearningV2CourseSessionDeviceInteractionV1 = evaluateLearningV2CourseSessionDeviceInteractionV1;
exports.materializeLearningV2CourseSessionCompletedSummaryV1 = materializeLearningV2CourseSessionCompletedSummaryV1;
exports.parseLearningV2CourseSessionCompletedSummaryV1 = parseLearningV2CourseSessionCompletedSummaryV1;
exports.encodeLearningV2CourseSessionCompletedSummaryV1 = encodeLearningV2CourseSessionCompletedSummaryV1;
const course_session_evaluator_capsule_child_v1_1 = require("./course_session_evaluator_capsule_child_v1");
const course_session_client_children_v1_1 = require("./course_session_client_children_v1");
const decision_registry_1 = require("../policies/decision_registry");
const language_tag_v1_1 = require("../contracts/language_tag_v1");
exports.LEARNING_V2_COURSE_SESSION_DEVICE_RUN_SCHEMA_V1 = "learning-v2-course-session-device-run.v1";
exports.LEARNING_V2_COURSE_SESSION_COMPLETED_SUMMARY_SCHEMA_V1 = "learning-v2-course-session-completed-summary.v1";
exports.LEARNING_V2_COURSE_SESSION_COMPLETED_SUMMARY_MAX_BYTES_V1 = 64 * 1024;
const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const handles = new WeakSet();
const materialByHandle = new WeakMap();
const completedSummaryHandles = new WeakSet();
const COMPLETED_ROOT_KEYS = Object.freeze([
    "schemaVersion",
    "environment",
    "targetLanguage",
    "studyTarget",
    "learnerSourceLocale",
    "seasonId",
    "releaseId",
    "activeRootFingerprint",
    "activeHeadFingerprint",
    "lessonId",
    "lessonOrdinal",
    "courseSessionId",
    "sessionOrdinal",
    "packageFingerprint",
    "childSetFingerprint",
    "sessionRunId",
    "interactionCompletions",
    "interactionCount",
    "interactionSetFingerprint",
    "answerPayload",
    "perAnswerTransport",
    "localFeedbackAuthority",
    "serverEvaluationAuthority",
    "completionAuthority",
    "interruptedSessionPolicy",
    "partialRunPersistence",
    "walletAuthority",
    "masteryAuthority",
    "evidenceAuthority",
    "releaseAuthority",
    "completionFingerprint",
]);
const COMPLETION_ROW_KEYS = Object.freeze([
    "interactionOrdinal",
    "interactionId",
    "disposition",
    "learnerAttempts",
    "hintUsed",
]);
function fail() {
    throw new Error("learning_v2_course_session_device_run_invalid");
}
function exactId(value) {
    if (typeof value !== "string" || !ID_RE.test(value))
        fail();
    return value;
}
function exactHash(value) {
    if (typeof value !== "string" || !HASH_RE.test(value))
        fail();
    return value;
}
function exactOrdinal(value, max) {
    if (!Number.isSafeInteger(value) || Number(value) < 1 || Number(value) > max)
        fail();
    return Number(value);
}
function plain(value) {
    return (typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype);
}
function exactKeys(value, expected) {
    const keys = Object.keys(value).sort();
    const sortedExpected = [...expected].sort();
    if (keys.length !== sortedExpected.length ||
        keys.some((key, index) => key !== sortedExpected[index]))
        fail();
}
function sameOrder(left, right) {
    return (left.length === right.length &&
        left.every((entry, index) => entry === right[index]));
}
function material(handle) {
    if (!isLearningV2CourseSessionDeviceRunHandleV1(handle))
        fail();
    const found = materialByHandle.get(handle);
    if (!found)
        fail();
    return found;
}
function createLearningV2CourseSessionDeviceRunV1(input) {
    if (typeof input !== "object" ||
        input === null ||
        !(0, course_session_evaluator_capsule_child_v1_1.isLearningV2CourseSessionEvaluatorCapsuleChildV1)(input.evaluatorCapsuleChild))
        fail();
    // These encoders accept only canonical parser/materializer handles. A
    // caller-created lookalike must not become an executable learner run.
    try {
        (0, course_session_client_children_v1_1.encodeLearningV2CourseSessionIntroChildV1)(input.introChild);
        (0, course_session_client_children_v1_1.encodeLearningV2CourseSessionLearnerChildV1)(input.learnerChild);
        (0, course_session_client_children_v1_1.encodeLearningV2CourseSessionAuxiliaryChildV1)(input.auxiliaryChild);
    }
    catch {
        fail();
    }
    if (!["lab", "staging", "production"].includes(input.environment) ||
        (0, language_tag_v1_1.parseV2ExactLanguageTagV1)(input.targetLanguage) === null ||
        (0, language_tag_v1_1.parseV2ExactLanguageTagV1)(input.studyTarget) === null ||
        (0, language_tag_v1_1.parseV2ExactLanguageTagV1)(input.learnerSourceLocale) === null)
        fail();
    const seasonId = exactId(input.seasonId);
    const releaseId = exactId(input.releaseId);
    const activeRootFingerprint = exactHash(input.activeRootFingerprint);
    const activeHeadFingerprint = exactHash(input.activeHeadFingerprint);
    const lessonId = exactId(input.lessonId);
    const lessonOrdinal = exactOrdinal(input.lessonOrdinal, 32);
    const courseSessionId = exactId(input.courseSessionId);
    const sessionOrdinal = exactOrdinal(input.sessionOrdinal, 56);
    const packageFingerprint = exactHash(input.packageFingerprint);
    const childSetFingerprint = exactHash(input.childSetFingerprint);
    if (input.introChild.courseSessionId !== courseSessionId ||
        input.learnerChild.courseSessionId !== courseSessionId ||
        input.evaluatorCapsuleChild.courseSessionId !== courseSessionId ||
        input.auxiliaryChild.courseSessionId !== courseSessionId)
        fail();
    const introIds = input.introChild.pages.map((page) => page.question.interactionId);
    const practiceIds = input.learnerChild.interactions.map((entry) => entry.interactionId);
    const interactionIds = Object.freeze([...introIds, ...practiceIds]);
    const evaluatorIds = input.evaluatorCapsuleChild.entries.map((entry) => entry.interactionId);
    const auxiliaryIds = input.auxiliaryChild.entries.map((entry) => entry.interactionId);
    if (introIds.length !== 3 ||
        new Set(interactionIds).size !== interactionIds.length ||
        !sameOrder(interactionIds, evaluatorIds) ||
        !sameOrder(interactionIds, auxiliaryIds))
        fail();
    if (input.auxiliaryChild.entries.some((entry) => entry.save.targetLanguage !== input.targetLanguage))
        fail();
    if (input.evaluatorCapsuleChild.entries
        .slice(0, 3)
        .some((entry) => entry.inputKind !== "text"))
        fail();
    input.learnerChild.interactions.forEach((entry, index) => {
        const evaluator = input.evaluatorCapsuleChild.entries[index + 3];
        const expectedInputKind = entry.inputMode === "single_choice"
            ? "choice_token"
            : entry.inputMode === "scripted_speech"
                ? "transcript"
                : "text";
        if (!evaluator ||
            evaluator.family !== entry.family ||
            evaluator.inputKind !== expectedInputKind)
            fail();
    });
    const summary = Object.freeze({
        schemaVersion: exports.LEARNING_V2_COURSE_SESSION_DEVICE_RUN_SCHEMA_V1,
        environment: input.environment,
        targetLanguage: input.targetLanguage,
        studyTarget: input.studyTarget,
        learnerSourceLocale: input.learnerSourceLocale,
        seasonId,
        releaseId,
        activeRootFingerprint,
        activeHeadFingerprint,
        lessonId,
        lessonOrdinal,
        courseSessionId,
        sessionOrdinal,
        packageFingerprint,
        childSetFingerprint,
        introInteractionCount: 3,
        practiceInteractionCount: practiceIds.length,
        interactionCount: interactionIds.length,
        interactionSetFingerprint: (0, decision_registry_1.hashCanonicalBody)(interactionIds),
        correctnessAuthority: "local_device_only",
        serverAnswerAuthority: "none_answers_never_transported_or_rechecked",
        interruptedSessionPolicy: "restart_from_first_intro_with_new_run_id",
        partialRunPersistence: "none",
        releaseAuthority: false,
    });
    const handle = Object.freeze({
        schemaVersion: exports.LEARNING_V2_COURSE_SESSION_DEVICE_RUN_SCHEMA_V1,
    });
    handles.add(handle);
    materialByHandle.set(handle, Object.freeze({
        summary,
        intro: input.introChild,
        learner: input.learnerChild,
        evaluator: input.evaluatorCapsuleChild,
        auxiliary: input.auxiliaryChild,
        interactionIds,
    }));
    return handle;
}
function isLearningV2CourseSessionDeviceRunHandleV1(value) {
    return typeof value === "object" && value !== null && handles.has(value);
}
function getLearningV2CourseSessionDeviceRunSummaryV1(handle) {
    return material(handle).summary;
}
function getLearningV2CourseSessionIntroPageV1(handle, pageOrdinal) {
    return material(handle).intro.pages[pageOrdinal - 1];
}
function getLearningV2CourseSessionPracticeInteractionV1(handle, practiceIndex) {
    const found = material(handle).learner.interactions[practiceIndex];
    if (!found)
        fail();
    return found;
}
function getLearningV2CourseSessionAuxiliaryEntryV1(handle, interactionId) {
    const found = material(handle).auxiliary.entries.find((entry) => entry.interactionId === interactionId);
    if (!found)
        fail();
    return found;
}
function getLearningV2CourseSessionNewWordEncountersV1(handle) {
    const encounters = material(handle)
        .auxiliary.entries.flatMap((entry) => entry.newWordEncounter ? [entry.newWordEncounter] : [])
        .sort((left, right) => left.orderWithinSession - right.orderWithinSession);
    if (encounters.some((encounter, index) => encounter.orderWithinSession !== index + 1))
        fail();
    return Object.freeze(encounters);
}
function evaluateLearningV2CourseSessionDeviceInteractionV1(handle, interactionId, response) {
    const found = material(handle);
    if (!found.interactionIds.includes(interactionId))
        fail();
    return (0, course_session_evaluator_capsule_child_v1_1.evaluateLearningV2CourseSessionInteractionV1)(found.evaluator, interactionId, response);
}
function materializeLearningV2CourseSessionCompletedSummaryV1(input) {
    const found = material(input.run);
    const sessionRunId = exactId(input.sessionRunId);
    if (!Array.isArray(input.interactionCompletions) ||
        input.interactionCompletions.length !== found.interactionIds.length)
        fail();
    const seen = new Set();
    const interactionCompletions = Object.freeze(found.interactionIds.map((interactionId, index) => {
        const candidate = input.interactionCompletions[index];
        if (!candidate ||
            candidate.interactionId !== interactionId ||
            seen.has(interactionId) ||
            !["completed", "skipped"].includes(candidate.disposition) ||
            !Number.isSafeInteger(candidate.learnerAttempts) ||
            candidate.learnerAttempts <
                (candidate.disposition === "completed" ? 1 : 0) ||
            candidate.learnerAttempts > 99 ||
            typeof candidate.hintUsed !== "boolean")
            fail();
        seen.add(interactionId);
        return Object.freeze({
            interactionOrdinal: index + 1,
            interactionId,
            disposition: candidate.disposition,
            learnerAttempts: candidate.learnerAttempts,
            hintUsed: candidate.hintUsed,
        });
    }));
    const body = Object.freeze({
        schemaVersion: exports.LEARNING_V2_COURSE_SESSION_COMPLETED_SUMMARY_SCHEMA_V1,
        environment: found.summary.environment,
        targetLanguage: found.summary.targetLanguage,
        studyTarget: found.summary.studyTarget,
        learnerSourceLocale: found.summary.learnerSourceLocale,
        seasonId: found.summary.seasonId,
        releaseId: found.summary.releaseId,
        activeRootFingerprint: found.summary.activeRootFingerprint,
        activeHeadFingerprint: found.summary.activeHeadFingerprint,
        lessonId: found.summary.lessonId,
        lessonOrdinal: found.summary.lessonOrdinal,
        courseSessionId: found.summary.courseSessionId,
        sessionOrdinal: found.summary.sessionOrdinal,
        packageFingerprint: found.summary.packageFingerprint,
        childSetFingerprint: found.summary.childSetFingerprint,
        sessionRunId,
        interactionCompletions,
        interactionCount: interactionCompletions.length,
        interactionSetFingerprint: found.summary.interactionSetFingerprint,
        answerPayload: "absent",
        perAnswerTransport: "none",
        localFeedbackAuthority: "device_interaction_only",
        serverEvaluationAuthority: "none_server_must_not_return_correct_or_wrong",
        completionAuthority: "completed_session_summary_for_background_storage_only",
        interruptedSessionPolicy: "restart_from_first_intro_with_new_run_id",
        partialRunPersistence: "none",
        walletAuthority: "none",
        masteryAuthority: "none",
        evidenceAuthority: "none",
        releaseAuthority: false,
    });
    const result = Object.freeze({
        ...body,
        completionFingerprint: (0, decision_registry_1.hashCanonicalBody)(body),
    });
    if ((0, decision_registry_1.utf8ByteLengthV1)((0, decision_registry_1.canonicalJsonV1)(result)) >
        exports.LEARNING_V2_COURSE_SESSION_COMPLETED_SUMMARY_MAX_BYTES_V1)
        fail();
    completedSummaryHandles.add(result);
    return result;
}
function parseLearningV2CourseSessionCompletedSummaryV1(input) {
    if (!plain(input))
        fail();
    exactKeys(input, COMPLETED_ROOT_KEYS);
    if (input.schemaVersion !==
        exports.LEARNING_V2_COURSE_SESSION_COMPLETED_SUMMARY_SCHEMA_V1 ||
        !["lab", "staging", "production"].includes(String(input.environment)) ||
        (0, language_tag_v1_1.parseV2ExactLanguageTagV1)(input.targetLanguage) === null ||
        (0, language_tag_v1_1.parseV2ExactLanguageTagV1)(input.studyTarget) === null ||
        (0, language_tag_v1_1.parseV2ExactLanguageTagV1)(input.learnerSourceLocale) === null ||
        !Array.isArray(input.interactionCompletions) ||
        input.interactionCompletions.length < 10 ||
        input.interactionCompletions.length > 22 ||
        input.interactionCount !== input.interactionCompletions.length ||
        input.answerPayload !== "absent" ||
        input.perAnswerTransport !== "none" ||
        input.localFeedbackAuthority !== "device_interaction_only" ||
        input.serverEvaluationAuthority !==
            "none_server_must_not_return_correct_or_wrong" ||
        input.completionAuthority !==
            "completed_session_summary_for_background_storage_only" ||
        input.interruptedSessionPolicy !==
            "restart_from_first_intro_with_new_run_id" ||
        input.partialRunPersistence !== "none" ||
        input.walletAuthority !== "none" ||
        input.masteryAuthority !== "none" ||
        input.evidenceAuthority !== "none" ||
        input.releaseAuthority !== false)
        fail();
    const seen = new Set();
    const interactionCompletions = Object.freeze(input.interactionCompletions.map((candidate, index) => {
        if (!plain(candidate))
            fail();
        exactKeys(candidate, COMPLETION_ROW_KEYS);
        const interactionId = exactId(candidate.interactionId);
        if (seen.has(interactionId) ||
            candidate.interactionOrdinal !== index + 1 ||
            !["completed", "skipped"].includes(String(candidate.disposition)) ||
            !Number.isSafeInteger(candidate.learnerAttempts) ||
            Number(candidate.learnerAttempts) <
                (candidate.disposition === "completed" ? 1 : 0) ||
            Number(candidate.learnerAttempts) > 99 ||
            typeof candidate.hintUsed !== "boolean")
            fail();
        seen.add(interactionId);
        return Object.freeze({
            interactionOrdinal: index + 1,
            interactionId,
            disposition: candidate.disposition,
            learnerAttempts: Number(candidate.learnerAttempts),
            hintUsed: candidate.hintUsed,
        });
    }));
    const body = Object.freeze({
        schemaVersion: exports.LEARNING_V2_COURSE_SESSION_COMPLETED_SUMMARY_SCHEMA_V1,
        environment: input.environment,
        targetLanguage: String(input.targetLanguage),
        studyTarget: String(input.studyTarget),
        learnerSourceLocale: String(input.learnerSourceLocale),
        seasonId: exactId(input.seasonId),
        releaseId: exactId(input.releaseId),
        activeRootFingerprint: exactHash(input.activeRootFingerprint),
        activeHeadFingerprint: exactHash(input.activeHeadFingerprint),
        lessonId: exactId(input.lessonId),
        lessonOrdinal: exactOrdinal(input.lessonOrdinal, 32),
        courseSessionId: exactId(input.courseSessionId),
        sessionOrdinal: exactOrdinal(input.sessionOrdinal, 56),
        packageFingerprint: exactHash(input.packageFingerprint),
        childSetFingerprint: exactHash(input.childSetFingerprint),
        sessionRunId: exactId(input.sessionRunId),
        interactionCompletions,
        interactionCount: interactionCompletions.length,
        interactionSetFingerprint: exactHash(input.interactionSetFingerprint),
        answerPayload: "absent",
        perAnswerTransport: "none",
        localFeedbackAuthority: "device_interaction_only",
        serverEvaluationAuthority: "none_server_must_not_return_correct_or_wrong",
        completionAuthority: "completed_session_summary_for_background_storage_only",
        interruptedSessionPolicy: "restart_from_first_intro_with_new_run_id",
        partialRunPersistence: "none",
        walletAuthority: "none",
        masteryAuthority: "none",
        evidenceAuthority: "none",
        releaseAuthority: false,
    });
    if (body.interactionSetFingerprint !==
        (0, decision_registry_1.hashCanonicalBody)(interactionCompletions.map((entry) => entry.interactionId)) ||
        input.completionFingerprint !== (0, decision_registry_1.hashCanonicalBody)(body))
        fail();
    const result = Object.freeze({
        ...body,
        completionFingerprint: String(input.completionFingerprint),
    });
    if ((0, decision_registry_1.utf8ByteLengthV1)((0, decision_registry_1.canonicalJsonV1)(result)) >
        exports.LEARNING_V2_COURSE_SESSION_COMPLETED_SUMMARY_MAX_BYTES_V1)
        fail();
    completedSummaryHandles.add(result);
    return result;
}
function encodeLearningV2CourseSessionCompletedSummaryV1(value) {
    if (!completedSummaryHandles.has(value))
        fail();
    return (0, decision_registry_1.canonicalJsonV1)(value);
}
//# sourceMappingURL=course_session_device_run_v1.js.map