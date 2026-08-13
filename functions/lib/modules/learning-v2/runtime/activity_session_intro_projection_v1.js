"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEARNING_V2_ACTIVITY_SESSION_INTRO_PROJECTION_MAX_BYTES_V1 = exports.LEARNING_V2_ACTIVITY_SESSION_INTRO_PROJECTION_SCHEMA_V1 = void 0;
exports.materializeLearningV2ActivitySessionIntroProjectionV1 = materializeLearningV2ActivitySessionIntroProjectionV1;
exports.parseLearningV2ActivitySessionIntroProjectionV1 = parseLearningV2ActivitySessionIntroProjectionV1;
exports.encodeLearningV2ActivitySessionIntroProjectionV1 = encodeLearningV2ActivitySessionIntroProjectionV1;
exports.isLearningV2ActivitySessionIntroProjectionV1 = isLearningV2ActivitySessionIntroProjectionV1;
const decision_registry_1 = require("../policies/decision_registry");
const language_tag_v1_1 = require("../contracts/language_tag_v1");
exports.LEARNING_V2_ACTIVITY_SESSION_INTRO_PROJECTION_SCHEMA_V1 = "learning-v2-activity-session-intro-projection.v1";
exports.LEARNING_V2_ACTIVITY_SESSION_INTRO_PROJECTION_MAX_BYTES_V1 = 64 * 1024;
const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const TOKEN_RE = /^[a-z0-9][a-z0-9._-]{0,127}$/u;
const CONTROL_RE = /[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/u;
const handles = new WeakSet();
const ROOT_KEYS = Object.freeze([
    "schemaVersion",
    "contentClass",
    "introId",
    "introFingerprint",
    "sourceSubjectFingerprint",
    "episodeId",
    "sessionId",
    "sessionOrdinal",
    "targetLanguage",
    "title",
    "paragraphs",
    "concepts",
    "questions",
    "questionCount",
    "learnerVisibleFieldPolicy",
    "evaluatorDataPolicy",
    "answerDataPolicy",
    "serverSidecarPolicy",
    "sourceContentAuthority",
    "languageAccuracyAuthority",
    "curriculumAuthority",
    "repositoryAuthority",
    "storageAuthority",
    "runtimeAuthority",
    "walletAuthority",
    "masteryAuthority",
    "evidenceAuthority",
    "completionAuthority",
    "publicationAuthority",
    "releaseAuthority",
    "projectionFingerprint",
]);
const CONCEPT_KEYS = Object.freeze([
    "conceptId",
    "heading",
    "explanation",
]);
const QUESTION_KEYS = Object.freeze([
    "taskId",
    "questionId",
    "coveredConceptIds",
    "learnerSurfaceFingerprint",
    "promptId",
    "prompt",
    "responseOptions",
    "accessibilityLabel",
]);
const OPTION_KEYS = Object.freeze(["responseId", "text"]);
function fail() {
    throw new Error("learning_v2_activity_session_intro_projection_invalid");
}
function record(value) {
    return (typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype);
}
function exactKeys(value, keys) {
    const actual = Object.keys(value).sort();
    const expected = [...keys].sort();
    if (actual.length !== expected.length ||
        actual.some((key, index) => key !== expected[index]))
        fail();
}
function text(value, max) {
    if (typeof value !== "string" ||
        value.length < 1 ||
        value.length > max ||
        value !== value.normalize("NFC") ||
        CONTROL_RE.test(value))
        fail();
    return value;
}
function id(value) {
    const result = text(value, 160);
    if (!ID_RE.test(result))
        fail();
    return result;
}
function token(value) {
    const result = text(value, 128);
    if (!TOKEN_RE.test(result))
        fail();
    return result;
}
function languageTag(value) {
    const result = text(value, 255);
    if ((0, language_tag_v1_1.parseV2ExactLanguageTagV1)(result) === null)
        fail();
    return result;
}
function hash(value) {
    if (typeof value !== "string" || !HASH_RE.test(value))
        fail();
    return value;
}
function parseValue(value) {
    if (!record(value))
        fail();
    exactKeys(value, ROOT_KEYS);
    if (value.schemaVersion !==
        exports.LEARNING_V2_ACTIVITY_SESSION_INTRO_PROJECTION_SCHEMA_V1 ||
        !["production_candidate", "neutral_test_fixture"].includes(String(value.contentClass)) ||
        !Number.isSafeInteger(value.sessionOrdinal) ||
        Number(value.sessionOrdinal) < 1 ||
        Number(value.sessionOrdinal) > 12 ||
        value.questionCount !== 3 ||
        !Array.isArray(value.paragraphs) ||
        value.paragraphs.length < 1 ||
        value.paragraphs.length > 12 ||
        !Array.isArray(value.concepts) ||
        value.concepts.length < 1 ||
        value.concepts.length > 24 ||
        !Array.isArray(value.questions) ||
        value.questions.length !== 3)
        fail();
    const paragraphs = Object.freeze(value.paragraphs.map((entry) => text(entry, 4000)));
    const concepts = Object.freeze(value.concepts.map((entry) => {
        if (!record(entry))
            fail();
        exactKeys(entry, CONCEPT_KEYS);
        return Object.freeze({
            conceptId: id(entry.conceptId),
            heading: text(entry.heading, 240),
            explanation: text(entry.explanation, 2000),
        });
    }));
    const questionIds = new Set();
    const taskIds = new Set();
    const questions = Object.freeze(value.questions.map((entry) => {
        if (!record(entry))
            fail();
        exactKeys(entry, QUESTION_KEYS);
        if (!Array.isArray(entry.coveredConceptIds) ||
            entry.coveredConceptIds.length < 1 ||
            entry.coveredConceptIds.length > 12 ||
            !Array.isArray(entry.responseOptions) ||
            entry.responseOptions.length < 2 ||
            entry.responseOptions.length > 6)
            fail();
        const taskId = id(entry.taskId);
        const questionId = id(entry.questionId);
        if (taskIds.has(taskId) || questionIds.has(questionId))
            fail();
        taskIds.add(taskId);
        questionIds.add(questionId);
        const coveredConceptIds = Object.freeze(entry.coveredConceptIds.map(id));
        if (new Set(coveredConceptIds).size !== coveredConceptIds.length ||
            coveredConceptIds.some((conceptId) => !concepts.some((concept) => concept.conceptId === conceptId)))
            fail();
        const optionIds = new Set();
        const responseOptions = Object.freeze(entry.responseOptions.map((option) => {
            if (!record(option))
                fail();
            exactKeys(option, OPTION_KEYS);
            const responseId = id(option.responseId);
            if (optionIds.has(responseId))
                fail();
            optionIds.add(responseId);
            return Object.freeze({ responseId, text: text(option.text, 512) });
        }));
        return Object.freeze({
            taskId,
            questionId,
            coveredConceptIds,
            learnerSurfaceFingerprint: hash(entry.learnerSurfaceFingerprint),
            promptId: id(entry.promptId),
            prompt: text(entry.prompt, 1000),
            responseOptions,
            accessibilityLabel: text(entry.accessibilityLabel, 512),
        });
    }));
    const body = {
        schemaVersion: exports.LEARNING_V2_ACTIVITY_SESSION_INTRO_PROJECTION_SCHEMA_V1,
        contentClass: value.contentClass,
        introId: id(value.introId),
        introFingerprint: hash(value.introFingerprint),
        sourceSubjectFingerprint: hash(value.sourceSubjectFingerprint),
        episodeId: token(value.episodeId),
        sessionId: id(value.sessionId),
        sessionOrdinal: Number(value.sessionOrdinal),
        targetLanguage: languageTag(value.targetLanguage),
        title: text(value.title, 240),
        paragraphs,
        concepts,
        questions,
        questionCount: 3,
        learnerVisibleFieldPolicy: "positive_allowlist_title_paragraphs_concepts_questions_only",
        evaluatorDataPolicy: "none",
        answerDataPolicy: "none",
        serverSidecarPolicy: "none",
        sourceContentAuthority: "unverified_owner_input_claim",
        languageAccuracyAuthority: "none",
        curriculumAuthority: "none",
        repositoryAuthority: "none",
        storageAuthority: "none",
        runtimeAuthority: "none_release_readback_required",
        walletAuthority: "none",
        masteryAuthority: "none",
        evidenceAuthority: "none",
        completionAuthority: "none",
        publicationAuthority: "none",
        releaseAuthority: false,
    };
    if (value.learnerVisibleFieldPolicy !== body.learnerVisibleFieldPolicy ||
        value.evaluatorDataPolicy !== "none" ||
        value.answerDataPolicy !== "none" ||
        value.serverSidecarPolicy !== "none" ||
        value.sourceContentAuthority !== body.sourceContentAuthority ||
        value.languageAccuracyAuthority !== "none" ||
        value.curriculumAuthority !== "none" ||
        value.repositoryAuthority !== "none" ||
        value.storageAuthority !== "none" ||
        value.runtimeAuthority !== body.runtimeAuthority ||
        value.walletAuthority !== "none" ||
        value.masteryAuthority !== "none" ||
        value.evidenceAuthority !== "none" ||
        value.completionAuthority !== "none" ||
        value.publicationAuthority !== "none" ||
        value.releaseAuthority !== false ||
        (0, decision_registry_1.hashCanonicalBody)(body) !== value.projectionFingerprint)
        fail();
    const result = Object.freeze({
        ...body,
        projectionFingerprint: hash(value.projectionFingerprint),
    });
    handles.add(result);
    return result;
}
function materializeLearningV2ActivitySessionIntroProjectionV1(input) {
    const body = {
        schemaVersion: exports.LEARNING_V2_ACTIVITY_SESSION_INTRO_PROJECTION_SCHEMA_V1,
        ...input,
        questionCount: 3,
        learnerVisibleFieldPolicy: "positive_allowlist_title_paragraphs_concepts_questions_only",
        evaluatorDataPolicy: "none",
        answerDataPolicy: "none",
        serverSidecarPolicy: "none",
        sourceContentAuthority: "unverified_owner_input_claim",
        languageAccuracyAuthority: "none",
        curriculumAuthority: "none",
        repositoryAuthority: "none",
        storageAuthority: "none",
        runtimeAuthority: "none_release_readback_required",
        walletAuthority: "none",
        masteryAuthority: "none",
        evidenceAuthority: "none",
        completionAuthority: "none",
        publicationAuthority: "none",
        releaseAuthority: false,
    };
    return parseLearningV2ActivitySessionIntroProjectionV1((0, decision_registry_1.canonicalJsonV1)({
        ...body,
        projectionFingerprint: (0, decision_registry_1.hashCanonicalBody)(body),
    }));
}
function parseLearningV2ActivitySessionIntroProjectionV1(raw) {
    if (typeof raw !== "string" ||
        raw.length < 1 ||
        raw.length > exports.LEARNING_V2_ACTIVITY_SESSION_INTRO_PROJECTION_MAX_BYTES_V1 ||
        (0, decision_registry_1.utf8ByteLengthV1)(raw) >
            exports.LEARNING_V2_ACTIVITY_SESSION_INTRO_PROJECTION_MAX_BYTES_V1)
        fail();
    let value;
    try {
        value = JSON.parse(raw);
    }
    catch {
        fail();
    }
    if ((0, decision_registry_1.canonicalJsonV1)(value) !== raw)
        fail();
    return parseValue(value);
}
function encodeLearningV2ActivitySessionIntroProjectionV1(value) {
    if (!isLearningV2ActivitySessionIntroProjectionV1(value))
        fail();
    return (0, decision_registry_1.canonicalJsonV1)(value);
}
function isLearningV2ActivitySessionIntroProjectionV1(value) {
    return typeof value === "object" && value !== null && handles.has(value);
}
//# sourceMappingURL=activity_session_intro_projection_v1.js.map