"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEARNING_V2_COURSE_SESSION_EVALUATOR_CAPSULE_CHILD_MAX_BYTES_V1 = exports.LEARNING_V2_COURSE_SESSION_EVALUATOR_CAPSULE_CHILD_SCHEMA_V1 = void 0;
exports.materializeLearningV2CourseSessionEvaluatorCapsuleChildV1 = materializeLearningV2CourseSessionEvaluatorCapsuleChildV1;
exports.parseLearningV2CourseSessionEvaluatorCapsuleChildV1 = parseLearningV2CourseSessionEvaluatorCapsuleChildV1;
exports.encodeLearningV2CourseSessionEvaluatorCapsuleChildV1 = encodeLearningV2CourseSessionEvaluatorCapsuleChildV1;
exports.evaluateLearningV2CourseSessionInteractionV1 = evaluateLearningV2CourseSessionInteractionV1;
exports.isLearningV2CourseSessionEvaluatorCapsuleChildV1 = isLearningV2CourseSessionEvaluatorCapsuleChildV1;
const local_evaluator_capsule_v1_1 = require("./local_evaluator_capsule_v1");
const decision_registry_1 = require("../policies/decision_registry");
exports.LEARNING_V2_COURSE_SESSION_EVALUATOR_CAPSULE_CHILD_SCHEMA_V1 = "learning-v2-course-session-evaluator-capsule-child.v1";
exports.LEARNING_V2_COURSE_SESSION_EVALUATOR_CAPSULE_CHILD_MAX_BYTES_V1 = 512 * 1024;
const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const RESERVED = new Set(["__proto__", "prototype", "constructor"]);
const ROOT_KEYS = Object.freeze([
    "schemaVersion",
    "courseSessionId",
    "normalizationProfileHash",
    "entries",
    "entryCount",
    "assessmentSecrecy",
    "verdictAuthority",
    "plaintextAnswerPayload",
    "walletAuthority",
    "masteryAuthority",
    "evidenceAuthority",
    "completionAuthority",
    "releaseAuthority",
    "capsuleSetFingerprint",
]);
const ENTRY_KEYS = Object.freeze([
    "interactionId",
    "activityId",
    "capsuleId",
    "family",
    "inputKind",
    "capsuleRaw",
    "capsuleRawHash",
]);
const handles = new WeakSet();
const capsulesByChild = new WeakMap();
function fail() {
    throw new Error("learning_v2_course_session_evaluator_capsule_child_invalid");
}
function plain(value) {
    return (typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype);
}
function exactKeys(value, keys) {
    const actual = Object.keys(value).sort();
    const expected = [...keys].sort();
    if (actual.length !== expected.length ||
        actual.some((key, index) => key !== expected[index] || RESERVED.has(key)))
        fail();
}
function exactId(value) {
    if (typeof value !== "string" || !ID_RE.test(value) || RESERVED.has(value))
        fail();
    return value;
}
function parseBody(value) {
    if (!plain(value))
        fail();
    exactKeys(value, ROOT_KEYS);
    if (value.schemaVersion !==
        exports.LEARNING_V2_COURSE_SESSION_EVALUATOR_CAPSULE_CHILD_SCHEMA_V1 ||
        value.normalizationProfileHash !==
            local_evaluator_capsule_v1_1.V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1 ||
        !Array.isArray(value.entries) ||
        value.entries.length < 10 ||
        value.entries.length > 22 ||
        value.entryCount !== value.entries.length ||
        value.assessmentSecrecy !== "none_device_inspectable" ||
        value.verdictAuthority !== "local_provisional_only" ||
        value.plaintextAnswerPayload !== "absent_by_exact_schema" ||
        value.walletAuthority !== "none" ||
        value.masteryAuthority !== "none" ||
        value.evidenceAuthority !== "none" ||
        value.completionAuthority !== "none" ||
        value.releaseAuthority !== false)
        fail();
    const courseSessionId = exactId(value.courseSessionId);
    const seen = new Set();
    const capsuleHandles = new Map();
    const entries = value.entries.map((candidate) => {
        if (!plain(candidate))
            fail();
        exactKeys(candidate, ENTRY_KEYS);
        const interactionId = exactId(candidate.interactionId);
        const activityId = exactId(candidate.activityId);
        const capsuleId = exactId(candidate.capsuleId);
        if (seen.has(interactionId))
            fail();
        seen.add(interactionId);
        if (typeof candidate.capsuleRaw !== "string" ||
            (0, decision_registry_1.utf8ByteLengthV1)(candidate.capsuleRaw) > 64 * 1024 ||
            typeof candidate.capsuleRawHash !== "string" ||
            !HASH_RE.test(candidate.capsuleRawHash) ||
            (0, decision_registry_1.sha256Utf8)(candidate.capsuleRaw) !== candidate.capsuleRawHash)
            fail();
        const capsule = (0, local_evaluator_capsule_v1_1.parseV2LocalEvaluatorCapsuleV1)(candidate.capsuleRaw);
        if (capsule.taskId !== interactionId ||
            capsule.activityId !== activityId ||
            capsule.capsuleId !== capsuleId ||
            capsule.family !== candidate.family ||
            capsule.inputKind !== candidate.inputKind)
            fail();
        capsuleHandles.set(interactionId, capsule);
        return Object.freeze({
            interactionId,
            activityId,
            capsuleId,
            family: capsule.family,
            inputKind: capsule.inputKind,
            capsuleRaw: candidate.capsuleRaw,
            capsuleRawHash: candidate.capsuleRawHash,
        });
    });
    if (value.capsuleSetFingerprint !==
        (0, decision_registry_1.hashCanonicalBody)(entries.map((entry) => ({
            interactionId: entry.interactionId,
            activityId: entry.activityId,
            capsuleId: entry.capsuleId,
            family: entry.family,
            inputKind: entry.inputKind,
            capsuleRawHash: entry.capsuleRawHash,
        }))))
        fail();
    const result = Object.freeze({
        schemaVersion: exports.LEARNING_V2_COURSE_SESSION_EVALUATOR_CAPSULE_CHILD_SCHEMA_V1,
        courseSessionId,
        normalizationProfileHash: local_evaluator_capsule_v1_1.V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1,
        entries: Object.freeze(entries),
        entryCount: entries.length,
        assessmentSecrecy: "none_device_inspectable",
        verdictAuthority: "local_provisional_only",
        plaintextAnswerPayload: "absent_by_exact_schema",
        walletAuthority: "none",
        masteryAuthority: "none",
        evidenceAuthority: "none",
        completionAuthority: "none",
        releaseAuthority: false,
        capsuleSetFingerprint: value.capsuleSetFingerprint,
    });
    handles.add(result);
    capsulesByChild.set(result, capsuleHandles);
    return result;
}
function materializeLearningV2CourseSessionEvaluatorCapsuleChildV1(input) {
    const entries = input.entries.map((entry) => {
        const inputKind = (0, local_evaluator_capsule_v1_1.v2LocalEvaluatorInputKindForFamilyV1)(entry.family);
        const acceptedCommitments = [...entry.acceptedResponses]
            .map((response) => (0, local_evaluator_capsule_v1_1.createV2LocalEvaluatorCommitmentV1)({
            capsuleId: entry.capsuleId,
            taskId: entry.interactionId,
            activityId: entry.activityId,
            family: entry.family,
            inputKind,
            normalizationLocale: entry.normalizationLocale,
            normalizationProfileHash: local_evaluator_capsule_v1_1.V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1,
            salt: entry.salt,
            response,
        }))
            .sort();
        const capsuleRaw = (0, local_evaluator_capsule_v1_1.buildV2LocalEvaluatorCapsuleRawV1)({
            capsuleId: entry.capsuleId,
            taskId: entry.interactionId,
            activityId: entry.activityId,
            family: entry.family,
            inputKind,
            normalizationLocale: entry.normalizationLocale,
            normalizationProfileHash: local_evaluator_capsule_v1_1.V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1,
            salt: entry.salt,
            acceptedCommitments,
        });
        return {
            interactionId: entry.interactionId,
            activityId: entry.activityId,
            capsuleId: entry.capsuleId,
            family: entry.family,
            inputKind,
            capsuleRaw,
            capsuleRawHash: (0, decision_registry_1.sha256Utf8)(capsuleRaw),
        };
    });
    const body = {
        schemaVersion: exports.LEARNING_V2_COURSE_SESSION_EVALUATOR_CAPSULE_CHILD_SCHEMA_V1,
        courseSessionId: input.courseSessionId,
        normalizationProfileHash: local_evaluator_capsule_v1_1.V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1,
        entries,
        entryCount: entries.length,
        assessmentSecrecy: "none_device_inspectable",
        verdictAuthority: "local_provisional_only",
        plaintextAnswerPayload: "absent_by_exact_schema",
        walletAuthority: "none",
        masteryAuthority: "none",
        evidenceAuthority: "none",
        completionAuthority: "none",
        releaseAuthority: false,
        capsuleSetFingerprint: (0, decision_registry_1.hashCanonicalBody)(entries.map(({ capsuleRaw: _raw, ...entry }) => entry)),
    };
    return parseBody(body);
}
function parseLearningV2CourseSessionEvaluatorCapsuleChildV1(raw) {
    if (typeof raw !== "string" ||
        (0, decision_registry_1.utf8ByteLengthV1)(raw) >
            exports.LEARNING_V2_COURSE_SESSION_EVALUATOR_CAPSULE_CHILD_MAX_BYTES_V1)
        fail();
    let decoded;
    try {
        decoded = JSON.parse(raw);
    }
    catch {
        fail();
    }
    if ((0, decision_registry_1.canonicalJsonV1)(decoded) !== raw)
        fail();
    return parseBody(decoded);
}
function encodeLearningV2CourseSessionEvaluatorCapsuleChildV1(child) {
    if (!handles.has(child))
        fail();
    const raw = (0, decision_registry_1.canonicalJsonV1)(child);
    if ((0, decision_registry_1.utf8ByteLengthV1)(raw) >
        exports.LEARNING_V2_COURSE_SESSION_EVALUATOR_CAPSULE_CHILD_MAX_BYTES_V1)
        fail();
    return raw;
}
function evaluateLearningV2CourseSessionInteractionV1(child, interactionId, response) {
    if (!handles.has(child))
        fail();
    const capsule = capsulesByChild.get(child)?.get(interactionId);
    if (!capsule)
        fail();
    return (0, local_evaluator_capsule_v1_1.evaluateV2LocalEvaluatorCapsuleV1)(capsule, response);
}
function isLearningV2CourseSessionEvaluatorCapsuleChildV1(value) {
    return typeof value === "object" && value !== null && handles.has(value);
}
//# sourceMappingURL=course_session_evaluator_capsule_child_v1.js.map