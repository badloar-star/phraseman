"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_OWNER_AUTHORED_SESSION_INTRO_MAX_BYTES_V1 = exports.V2_OWNER_AUTHORED_SESSION_INTRO_SCHEMA_V1 = void 0;
exports.materializeV2OwnerAuthoredSessionIntroV1 = materializeV2OwnerAuthoredSessionIntroV1;
exports.parseV2OwnerAuthoredSessionIntroV1 = parseV2OwnerAuthoredSessionIntroV1;
exports.isV2OwnerAuthoredSessionIntroHandleV1 = isV2OwnerAuthoredSessionIntroHandleV1;
exports.getV2OwnerAuthoredSessionIntroSummaryV1 = getV2OwnerAuthoredSessionIntroSummaryV1;
exports.resolveV2OwnerAuthoredSessionIntroMaterialV1 = resolveV2OwnerAuthoredSessionIntroMaterialV1;
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const v2_activity_session_projection_1 = require("./v2_activity_session_projection");
exports.V2_OWNER_AUTHORED_SESSION_INTRO_SCHEMA_V1 = "v2-owner-authored-session-intro.v1";
exports.V2_OWNER_AUTHORED_SESSION_INTRO_MAX_BYTES_V1 = 64 * 1024;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const TOKEN_RE = /^[a-z0-9][a-z0-9._-]{0,127}$/u;
const HASH_RE = /^[a-f0-9]{64}$/u;
const CONTROL_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u;
const handles = new WeakSet();
const materials = new WeakMap();
const RAW_KEYS = [
    "schemaVersion",
    "contentClass",
    "introId",
    "episodeId",
    "sessionId",
    "sessionOrdinal",
    "targetLanguage",
    "title",
    "paragraphs",
    "concepts",
    "questions",
    "sourceSubjectFingerprint",
    "contentOriginAuthority",
    "languageAccuracyAuthority",
    "curriculumAuthority",
    "repositoryAuthority",
    "humanApprovalAuthority",
    "executionAuthority",
    "publicationPolicy",
    "runtimeConsumer",
    "releaseEligible",
    "releaseAuthority",
    "introFingerprint",
];
const CONCEPT_KEYS = ["conceptId", "heading", "explanation"];
const QUESTION_KEYS = [
    "taskId",
    "questionId",
    "coveredConceptIds",
    "learnerSurfaceFingerprint",
];
function fail(code) {
    throw new Error(code);
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function exactKeys(value, keys) {
    const actual = Object.keys(value).sort();
    const expected = [...keys].sort();
    return (actual.length === expected.length &&
        actual.every((key, index) => key === expected[index]));
}
function safeText(value, maximum, code) {
    if (typeof value !== "string" ||
        value.length < 1 ||
        value.length > maximum ||
        value !== value.normalize("NFC") ||
        CONTROL_RE.test(value))
        fail(code);
    return value;
}
function trustedSource(value) {
    try {
        return (0, v2_activity_session_projection_1.parseV2ActivitySessionProjectionSource)((0, decision_registry_1.canonicalJsonV1)(value));
    }
    catch {
        fail("v2_owner_session_intro_source_invalid");
    }
}
function learnerSurfaceFingerprint(task) {
    return (0, decision_registry_1.hashCanonicalBody)({
        taskId: task.taskId,
        promptId: task.learner.promptId,
        prompt: task.learner.prompt,
        responseOptions: task.learner.responseOptions,
        accessibilityLabel: task.learner.accessibilityLabel,
    });
}
function sourceSubject(source) {
    const questions = source.session.tasks.slice(0, 3).map((task) => {
        if (!task.introQuestionRef)
            fail("v2_owner_session_intro_question_binding_invalid");
        return {
            taskId: task.taskId,
            questionId: task.introQuestionRef.questionId,
            coveredConceptIds: [...task.introQuestionRef.coveredConceptIds],
            learnerSurfaceFingerprint: learnerSurfaceFingerprint(task),
        };
    });
    return {
        episodeId: source.episodeId,
        sessionId: source.session.sessionId,
        sessionOrdinal: source.session.ordinal,
        targetLanguage: source.targetLanguage,
        questions,
        sourceSubjectFingerprint: (0, decision_registry_1.hashCanonicalBody)({
            episodeId: source.episodeId,
            sessionId: source.session.sessionId,
            sessionOrdinal: source.session.ordinal,
            targetLanguage: source.targetLanguage,
            questions,
        }),
    };
}
function assertDraft(value) {
    if (!isRecord(value) ||
        !exactKeys(value, [
            "contentClass",
            "introId",
            "title",
            "paragraphs",
            "concepts",
        ]) ||
        (value.contentClass !== "production_candidate" &&
            value.contentClass !== "neutral_test_fixture") ||
        typeof value.introId !== "string" ||
        !TOKEN_RE.test(value.introId) ||
        !Array.isArray(value.paragraphs) ||
        value.paragraphs.length < 1 ||
        value.paragraphs.length > 12 ||
        !Array.isArray(value.concepts) ||
        value.concepts.length < 1 ||
        value.concepts.length > 16)
        fail("v2_owner_session_intro_draft_invalid");
    safeText(value.title, 240, "v2_owner_session_intro_text_invalid");
    value.paragraphs.forEach((entry) => safeText(entry, 2_000, "v2_owner_session_intro_text_invalid"));
    const conceptIds = new Set();
    for (const candidate of value.concepts) {
        if (!isRecord(candidate) || !exactKeys(candidate, CONCEPT_KEYS))
            fail("v2_owner_session_intro_concept_invalid");
        const conceptId = safeText(candidate.conceptId, 160, "v2_owner_session_intro_concept_invalid");
        if (!ID_RE.test(conceptId) || conceptIds.has(conceptId))
            fail("v2_owner_session_intro_concept_invalid");
        conceptIds.add(conceptId);
        safeText(candidate.heading, 240, "v2_owner_session_intro_concept_invalid");
        safeText(candidate.explanation, 2_000, "v2_owner_session_intro_concept_invalid");
    }
}
function bindSourceFingerprint(source, introFingerprint) {
    const next = JSON.parse((0, decision_registry_1.canonicalJsonV1)(source));
    const session = next.session;
    const tasks = session.tasks;
    for (const task of tasks.slice(0, 3)) {
        const introQuestionRef = task.introQuestionRef;
        introQuestionRef.introArtifactFingerprint = introFingerprint;
    }
    return trustedSource(next);
}
function assertRaw(value, source) {
    if (!isRecord(value) || !exactKeys(value, RAW_KEYS))
        fail("v2_owner_session_intro_shape_invalid");
    if (value.schemaVersion !== exports.V2_OWNER_AUTHORED_SESSION_INTRO_SCHEMA_V1 ||
        (value.contentClass !== "production_candidate" &&
            value.contentClass !== "neutral_test_fixture") ||
        typeof value.introId !== "string" ||
        !TOKEN_RE.test(value.introId) ||
        value.episodeId !== source.episodeId ||
        value.sessionId !== source.session.sessionId ||
        value.sessionOrdinal !== source.session.ordinal ||
        value.targetLanguage !== source.targetLanguage ||
        typeof value.sourceSubjectFingerprint !== "string" ||
        !HASH_RE.test(value.sourceSubjectFingerprint) ||
        typeof value.introFingerprint !== "string" ||
        !HASH_RE.test(value.introFingerprint) ||
        value.contentOriginAuthority !== "unverified_owner_input_claim" ||
        value.languageAccuracyAuthority !== "none" ||
        value.curriculumAuthority !== "none" ||
        value.repositoryAuthority !== "none" ||
        value.humanApprovalAuthority !== "none" ||
        value.executionAuthority !== "none" ||
        value.publicationPolicy !== "draft_only_no_consumer" ||
        value.runtimeConsumer !== false ||
        value.releaseEligible !== false ||
        value.releaseAuthority !== false)
        fail("v2_owner_session_intro_value_invalid");
    assertDraft({
        contentClass: value.contentClass,
        introId: value.introId,
        title: value.title,
        paragraphs: value.paragraphs,
        concepts: value.concepts,
    });
    if (!Array.isArray(value.questions) || value.questions.length !== 3)
        fail("v2_owner_session_intro_question_binding_invalid");
    for (const question of value.questions) {
        if (!isRecord(question) || !exactKeys(question, QUESTION_KEYS))
            fail("v2_owner_session_intro_question_binding_invalid");
    }
    const subject = sourceSubject(source);
    if (value.sourceSubjectFingerprint !== subject.sourceSubjectFingerprint ||
        (0, decision_registry_1.canonicalJsonV1)(value.questions) !== (0, decision_registry_1.canonicalJsonV1)(subject.questions))
        fail("v2_owner_session_intro_question_binding_invalid");
    const conceptIds = new Set(value.concepts.map((concept) => concept.conceptId));
    const covered = new Set(subject.questions.flatMap((question) => question.coveredConceptIds));
    if (conceptIds.size !== covered.size ||
        [...conceptIds].some((conceptId) => !covered.has(conceptId)))
        fail("v2_owner_session_intro_concept_binding_invalid");
    if (source.session.tasks
        .slice(0, 3)
        .some((task) => task.introQuestionRef?.introArtifactFingerprint !==
        value.introFingerprint))
        fail("v2_owner_session_intro_fingerprint_binding_invalid");
}
function materializeV2OwnerAuthoredSessionIntroV1(draft, sessionSource) {
    assertDraft(draft);
    const source = trustedSource(sessionSource);
    const subject = sourceSubject(source);
    const body = {
        schemaVersion: exports.V2_OWNER_AUTHORED_SESSION_INTRO_SCHEMA_V1,
        contentClass: draft.contentClass,
        introId: draft.introId,
        episodeId: subject.episodeId,
        sessionId: subject.sessionId,
        sessionOrdinal: subject.sessionOrdinal,
        targetLanguage: subject.targetLanguage,
        title: draft.title,
        paragraphs: [...draft.paragraphs],
        concepts: draft.concepts.map((concept) => ({ ...concept })),
        questions: subject.questions,
        sourceSubjectFingerprint: subject.sourceSubjectFingerprint,
        contentOriginAuthority: "unverified_owner_input_claim",
        languageAccuracyAuthority: "none",
        curriculumAuthority: "none",
        repositoryAuthority: "none",
        humanApprovalAuthority: "none",
        executionAuthority: "none",
        publicationPolicy: "draft_only_no_consumer",
        runtimeConsumer: false,
        releaseEligible: false,
        releaseAuthority: false,
    };
    const introFingerprint = (0, decision_registry_1.hashCanonicalBody)(body);
    const boundSource = bindSourceFingerprint(source, introFingerprint);
    const raw = (0, decision_registry_1.canonicalJsonV1)({ ...body, introFingerprint });
    const handle = parseV2OwnerAuthoredSessionIntroV1(raw, boundSource);
    return resolveV2OwnerAuthoredSessionIntroMaterialV1(handle);
}
function parseV2OwnerAuthoredSessionIntroV1(raw, sessionSource) {
    if (typeof raw !== "string" ||
        raw.length > exports.V2_OWNER_AUTHORED_SESSION_INTRO_MAX_BYTES_V1 ||
        (0, decision_registry_1.utf8ByteLengthV1)(raw) > exports.V2_OWNER_AUTHORED_SESSION_INTRO_MAX_BYTES_V1)
        fail("v2_owner_session_intro_raw_invalid");
    let candidate;
    try {
        candidate = JSON.parse(raw);
    }
    catch {
        fail("v2_owner_session_intro_json_invalid");
    }
    const source = trustedSource(sessionSource);
    assertRaw(candidate, source);
    if ((0, decision_registry_1.canonicalJsonV1)(candidate) !== raw)
        fail("v2_owner_session_intro_noncanonical");
    const { introFingerprint: _ignored, ...body } = candidate;
    if ((0, decision_registry_1.hashCanonicalBody)(body) !== candidate.introFingerprint)
        fail("v2_owner_session_intro_fingerprint_invalid");
    const summary = Object.freeze({
        schemaVersion: "v2-owner-authored-session-intro-summary.v1",
        contentClass: candidate.contentClass,
        introId: candidate.introId,
        episodeId: candidate.episodeId,
        sessionId: candidate.sessionId,
        sessionOrdinal: candidate.sessionOrdinal,
        targetLanguage: candidate.targetLanguage,
        introFingerprint: candidate.introFingerprint,
        sourceSubjectFingerprint: candidate.sourceSubjectFingerprint,
        questionCount: 3,
        conceptCount: candidate.concepts.length,
        contentOriginAuthority: "unverified_owner_input_claim",
        languageAccuracyAuthority: "none",
        curriculumAuthority: "none",
        repositoryAuthority: "none",
        humanApprovalAuthority: "none",
        executionAuthority: "none",
        publicationPolicy: "draft_only_no_consumer",
        runtimeConsumer: false,
        releaseEligible: false,
        releaseAuthority: false,
    });
    const handle = Object.freeze({
        __brand: "V2OwnerAuthoredSessionIntroHandleV1",
    });
    handles.add(handle);
    materials.set(handle, Object.freeze({ raw, summary, source }));
    return handle;
}
function isV2OwnerAuthoredSessionIntroHandleV1(value) {
    return isRecord(value) && handles.has(value);
}
function getV2OwnerAuthoredSessionIntroSummaryV1(handle) {
    const material = materials.get(handle);
    if (!material)
        fail("v2_owner_session_intro_handle_invalid");
    return material.summary;
}
function resolveV2OwnerAuthoredSessionIntroMaterialV1(handle) {
    const material = materials.get(handle);
    if (!material)
        fail("v2_owner_session_intro_handle_invalid");
    return material;
}
//# sourceMappingURL=v2_owner_authored_session_intro_v1.js.map