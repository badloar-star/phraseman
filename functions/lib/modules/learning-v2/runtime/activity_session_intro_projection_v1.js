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
    "pages",
    "pageCount",
    "embeddedQuestionCount",
    "practiceStartSlot",
    "slotPresentationPolicy",
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
const PAGE_KEYS = Object.freeze([
    "pageOrdinal",
    "conceptId",
    "heading",
    "explanation",
    "question",
]);
const QUESTION_KEYS = Object.freeze([
    "taskId",
    "taskSlot",
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
        actual.some((key, i) => key !== expected[i]))
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
        !Array.isArray(value.pages) ||
        value.pages.length !== 3 ||
        value.pageCount !== 3 ||
        value.embeddedQuestionCount !== 3 ||
        value.practiceStartSlot !== 4)
        fail();
    const taskIds = new Set();
    const questionIds = new Set();
    const conceptIds = new Set();
    const pages = Object.freeze(value.pages.map((entry, index) => {
        if (!record(entry))
            fail();
        exactKeys(entry, PAGE_KEYS);
        if (entry.pageOrdinal !== index + 1 || !record(entry.question))
            fail();
        exactKeys(entry.question, QUESTION_KEYS);
        const conceptId = id(entry.conceptId);
        if (conceptIds.has(conceptId))
            fail();
        conceptIds.add(conceptId);
        const question = entry.question;
        if (question.taskSlot !== index + 1 ||
            !Array.isArray(question.coveredConceptIds) ||
            question.coveredConceptIds.length !== 1 ||
            question.coveredConceptIds[0] !== conceptId ||
            !Array.isArray(question.responseOptions) ||
            question.responseOptions.length < 2 ||
            question.responseOptions.length > 6)
            fail();
        const taskId = id(question.taskId);
        const questionId = id(question.questionId);
        if (taskIds.has(taskId) || questionIds.has(questionId))
            fail();
        taskIds.add(taskId);
        questionIds.add(questionId);
        const optionIds = new Set();
        const responseOptions = Object.freeze(question.responseOptions.map((option) => {
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
            pageOrdinal: (index + 1),
            conceptId,
            heading: text(entry.heading, 240),
            explanation: text(entry.explanation, 4000),
            question: Object.freeze({
                taskId,
                taskSlot: (index + 1),
                questionId,
                coveredConceptIds: Object.freeze([conceptId]),
                learnerSurfaceFingerprint: hash(question.learnerSurfaceFingerprint),
                promptId: id(question.promptId),
                prompt: text(question.prompt, 1000),
                responseOptions,
                accessibilityLabel: text(question.accessibilityLabel, 512),
            }),
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
        targetLanguage: (() => {
            const result = text(value.targetLanguage, 255);
            if (!(0, language_tag_v1_1.parseV2ExactLanguageTagV1)(result))
                fail();
            return result;
        })(),
        title: text(value.title, 240),
        pages,
        pageCount: 3,
        embeddedQuestionCount: 3,
        practiceStartSlot: 4,
        slotPresentationPolicy: "slots_1_2_3_are_embedded_in_intro_pages_and_must_not_repeat",
        learnerVisibleFieldPolicy: "positive_allowlist_title_and_three_intro_pages_only",
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
    for (const [key, expected] of Object.entries({
        slotPresentationPolicy: body.slotPresentationPolicy,
        learnerVisibleFieldPolicy: body.learnerVisibleFieldPolicy,
        evaluatorDataPolicy: "none",
        answerDataPolicy: "none",
        serverSidecarPolicy: "none",
        sourceContentAuthority: body.sourceContentAuthority,
        languageAccuracyAuthority: "none",
        curriculumAuthority: "none",
        repositoryAuthority: "none",
        storageAuthority: "none",
        runtimeAuthority: body.runtimeAuthority,
        walletAuthority: "none",
        masteryAuthority: "none",
        evidenceAuthority: "none",
        completionAuthority: "none",
        publicationAuthority: "none",
        releaseAuthority: false,
    }))
        if (value[key] !== expected)
            fail();
    if (value.projectionFingerprint !== (0, decision_registry_1.hashCanonicalBody)(body))
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
        pageCount: 3,
        embeddedQuestionCount: 3,
        practiceStartSlot: 4,
        slotPresentationPolicy: "slots_1_2_3_are_embedded_in_intro_pages_and_must_not_repeat",
        learnerVisibleFieldPolicy: "positive_allowlist_title_and_three_intro_pages_only",
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
        raw.length < 2 ||
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