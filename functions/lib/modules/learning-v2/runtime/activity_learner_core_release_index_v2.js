"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEARNING_V2_ACTIVITY_SESSION_INTRO_OBJECT_PREFIX_V1 = exports.LEARNING_V2_ACTIVITY_LEARNER_CORE_RELEASE_INDEX_MAX_BYTES_V2 = exports.LEARNING_V2_ACTIVITY_LEARNER_CORE_RELEASE_INDEX_SCHEMA_V2 = void 0;
exports.learningV2ActivitySessionIntroObjectPathV1 = learningV2ActivitySessionIntroObjectPathV1;
exports.materializeLearningV2ActivityLearnerCoreReleaseIndexV2 = materializeLearningV2ActivityLearnerCoreReleaseIndexV2;
exports.parseLearningV2ActivityLearnerCoreReleaseIndexV2 = parseLearningV2ActivityLearnerCoreReleaseIndexV2;
exports.encodeLearningV2ActivityLearnerCoreReleaseIndexV2 = encodeLearningV2ActivityLearnerCoreReleaseIndexV2;
exports.isLearningV2ActivityLearnerCoreReleaseIndexV2 = isLearningV2ActivityLearnerCoreReleaseIndexV2;
const decision_registry_1 = require("../policies/decision_registry");
const activity_learner_core_release_index_v1_1 = require("./activity_learner_core_release_index_v1");
const activity_session_intro_projection_v1_1 = require("./activity_session_intro_projection_v1");
exports.LEARNING_V2_ACTIVITY_LEARNER_CORE_RELEASE_INDEX_SCHEMA_V2 = "learning-v2-activity-learner-core-release-index.v2";
exports.LEARNING_V2_ACTIVITY_LEARNER_CORE_RELEASE_INDEX_MAX_BYTES_V2 = 256 * 1024;
exports.LEARNING_V2_ACTIVITY_SESSION_INTRO_OBJECT_PREFIX_V1 = "learning-v2/canonical/activity-session-intros";
const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const GENERATION_RE = /^[1-9][0-9]{0,30}$/u;
const ROOT_KEYS = Object.freeze([
    "schemaVersion",
    "coreIndexV1Raw",
    "coreIndexV1Fingerprint",
    "planFingerprint",
    "ownerInputFingerprint",
    "introAggregateFingerprint",
    "introProjectionSetFingerprint",
    "ownerConfirmationFingerprint",
    "intros",
    "sessionCount",
    "introQuestionCount",
    "objectCount",
    "introReleaseBinding",
    "repositoryOriginAuthority",
    "storageAuthority",
    "ownerConfirmationAuthority",
    "runtimeAuthority",
    "walletAuthority",
    "masteryAuthority",
    "evidenceAuthority",
    "completionAuthority",
    "publicationAuthority",
    "releaseAuthority",
    "indexFingerprint",
]);
const INTRO_KEYS = Object.freeze([
    "sessionId",
    "sessionOrdinal",
    "sourceSubjectFingerprint",
    "introFingerprint",
    "introProjectionFingerprint",
    "intro",
]);
const PIN_KEYS = Object.freeze([
    "objectPath",
    "contentHash",
    "objectGeneration",
    "byteSize",
    "contentType",
]);
const handles = new WeakSet();
function fail() {
    throw new Error("learning_v2_activity_learner_core_release_index_v2_invalid");
}
function record(value) {
    return (typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype);
}
function exactKeys(value, keys) {
    const actual = Object.keys(value);
    if (actual.length !== keys.length ||
        actual.some((key) => !keys.includes(key)))
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
function learningV2ActivitySessionIntroObjectPathV1(input) {
    if (!Number.isSafeInteger(input.sessionOrdinal) ||
        input.sessionOrdinal < 1 ||
        input.sessionOrdinal > 12)
        fail();
    return `${exports.LEARNING_V2_ACTIVITY_SESSION_INTRO_OBJECT_PREFIX_V1}/${(0, decision_registry_1.sha256Utf8)(id(input.stageId))}/sessions/${String(input.sessionOrdinal).padStart(2, "0")}/${hash(input.projectionFingerprint)}/${hash(input.rawHash)}.json`;
}
function pin(value, expected) {
    if (!record(value))
        fail();
    exactKeys(value, PIN_KEYS);
    if (typeof value.objectGeneration !== "string" ||
        !GENERATION_RE.test(value.objectGeneration) ||
        !Number.isSafeInteger(value.byteSize) ||
        Number(value.byteSize) < 2 ||
        Number(value.byteSize) >
            activity_session_intro_projection_v1_1.LEARNING_V2_ACTIVITY_SESSION_INTRO_PROJECTION_MAX_BYTES_V1 ||
        value.contentType !== "application/json; charset=utf-8")
        fail();
    const contentHash = hash(value.contentHash);
    const objectPath = learningV2ActivitySessionIntroObjectPathV1({
        ...expected,
        rawHash: contentHash,
    });
    if (value.objectPath !== objectPath)
        fail();
    return Object.freeze({
        objectPath,
        contentHash,
        objectGeneration: value.objectGeneration,
        byteSize: Number(value.byteSize),
        contentType: "application/json; charset=utf-8",
    });
}
function renderTasks(raw, coreSession) {
    if (typeof raw !== "string" ||
        (0, decision_registry_1.sha256Utf8)(raw) !== coreSession.render.contentHash)
        fail();
    let value;
    try {
        value = JSON.parse(raw);
    }
    catch {
        fail();
    }
    if ((0, decision_registry_1.canonicalJsonV1)(value) !== raw ||
        !record(value) ||
        !record(value.session))
        fail();
    const tasks = value.session.tasks;
    if (!Array.isArray(tasks) || tasks.length !== 12)
        fail();
    return tasks;
}
function visibleSurface(task) {
    if (!record(task) || !record(task.learner))
        fail();
    const learner = task.learner;
    if (typeof task.taskId !== "string" ||
        typeof learner.promptId !== "string" ||
        typeof learner.prompt !== "string" ||
        !Array.isArray(learner.responseOptions) ||
        typeof learner.accessibilityLabel !== "string")
        fail();
    return {
        taskId: task.taskId,
        promptId: learner.promptId,
        prompt: learner.prompt,
        responseOptions: learner.responseOptions,
        accessibilityLabel: learner.accessibilityLabel,
    };
}
function introRow(value, core, expectedOrdinal) {
    if (!record(value))
        fail();
    exactKeys(value, INTRO_KEYS);
    const coreSession = core.sessions[expectedOrdinal - 1];
    if (!coreSession ||
        value.sessionOrdinal !== expectedOrdinal ||
        value.sessionId !== coreSession.sessionId)
        fail();
    const introProjectionFingerprint = hash(value.introProjectionFingerprint);
    return Object.freeze({
        sessionId: id(value.sessionId),
        sessionOrdinal: expectedOrdinal,
        sourceSubjectFingerprint: hash(value.sourceSubjectFingerprint),
        introFingerprint: hash(value.introFingerprint),
        introProjectionFingerprint,
        intro: pin(value.intro, {
            stageId: core.stageId,
            sessionOrdinal: expectedOrdinal,
            projectionFingerprint: introProjectionFingerprint,
        }),
    });
}
function parseValue(value) {
    if (!record(value))
        fail();
    exactKeys(value, ROOT_KEYS);
    if (value.schemaVersion !==
        exports.LEARNING_V2_ACTIVITY_LEARNER_CORE_RELEASE_INDEX_SCHEMA_V2 ||
        typeof value.coreIndexV1Raw !== "string" ||
        !Array.isArray(value.intros) ||
        value.intros.length !== 12 ||
        value.sessionCount !== 12 ||
        value.introQuestionCount !== 36 ||
        value.objectCount !== 36)
        fail();
    const core = (0, activity_learner_core_release_index_v1_1.parseLearningV2ActivityLearnerCoreReleaseIndexV1)(value.coreIndexV1Raw);
    if (value.coreIndexV1Fingerprint !== core.indexFingerprint)
        fail();
    const intros = Object.freeze(value.intros.map((row, index) => introRow(row, core, index + 1)));
    const body = {
        schemaVersion: exports.LEARNING_V2_ACTIVITY_LEARNER_CORE_RELEASE_INDEX_SCHEMA_V2,
        coreIndexV1Raw: value.coreIndexV1Raw,
        coreIndexV1Fingerprint: core.indexFingerprint,
        planFingerprint: hash(value.planFingerprint),
        ownerInputFingerprint: hash(value.ownerInputFingerprint),
        introAggregateFingerprint: hash(value.introAggregateFingerprint),
        introProjectionSetFingerprint: hash(value.introProjectionSetFingerprint),
        ownerConfirmationFingerprint: hash(value.ownerConfirmationFingerprint),
        intros,
        sessionCount: 12,
        introQuestionCount: 36,
        objectCount: 36,
        introReleaseBinding: "exact_owner_confirmed_projection_to_render_session",
        repositoryOriginAuthority: "none_server_readback_required",
        storageAuthority: "none_server_readback_required",
        ownerConfirmationAuthority: "none_private_confirmed_owner_handle_required",
        runtimeAuthority: "none_active_pointer_and_readback_required",
        walletAuthority: "none",
        masteryAuthority: "none",
        evidenceAuthority: "none",
        completionAuthority: "none",
        publicationAuthority: "none",
        releaseAuthority: false,
    };
    if (value.introReleaseBinding !== body.introReleaseBinding ||
        value.repositoryOriginAuthority !== body.repositoryOriginAuthority ||
        value.storageAuthority !== body.storageAuthority ||
        value.ownerConfirmationAuthority !== body.ownerConfirmationAuthority ||
        value.runtimeAuthority !== body.runtimeAuthority ||
        value.walletAuthority !== "none" ||
        value.masteryAuthority !== "none" ||
        value.evidenceAuthority !== "none" ||
        value.completionAuthority !== "none" ||
        value.publicationAuthority !== "none" ||
        value.releaseAuthority !== false ||
        value.indexFingerprint !== (0, decision_registry_1.hashCanonicalBody)(body))
        fail();
    const result = Object.freeze({
        ...body,
        indexFingerprint: hash(value.indexFingerprint),
    });
    handles.add(result);
    return result;
}
function materializeLearningV2ActivityLearnerCoreReleaseIndexV2(input) {
    if (!(0, activity_learner_core_release_index_v1_1.isLearningV2ActivityLearnerCoreReleaseIndexV1)(input.coreIndexV1) ||
        input.sessions.length !== 12)
        fail();
    const intros = input.sessions.map((session, index) => {
        const ordinal = index + 1;
        const coreSession = input.coreIndexV1.sessions[index];
        if (session.sessionOrdinal !== ordinal ||
            session.sessionId !== coreSession?.sessionId)
            fail();
        const intro = (0, activity_session_intro_projection_v1_1.parseLearningV2ActivitySessionIntroProjectionV1)(session.introRaw);
        const tasks = renderTasks(session.renderRaw, coreSession);
        if (intro.episodeId !== input.coreIndexV1.episodeId ||
            intro.sessionId !== session.sessionId ||
            intro.sessionOrdinal !== ordinal ||
            (0, decision_registry_1.sha256Utf8)(session.introRaw) !== session.introPin.contentHash ||
            (0, decision_registry_1.utf8ByteLengthV1)(session.introRaw) !== session.introPin.byteSize ||
            intro.practiceStartSlot !== 4 ||
            intro.pages.some((page, questionIndex) => {
                const question = page.question;
                const surface = visibleSurface(tasks[questionIndex]);
                return (page.pageOrdinal !== questionIndex + 1 ||
                    question.taskSlot !== questionIndex + 1 ||
                    question.taskId !== surface.taskId ||
                    question.promptId !== surface.promptId ||
                    question.prompt !== surface.prompt ||
                    (0, decision_registry_1.canonicalJsonV1)(question.responseOptions) !==
                        (0, decision_registry_1.canonicalJsonV1)(surface.responseOptions) ||
                    question.accessibilityLabel !== surface.accessibilityLabel ||
                    question.learnerSurfaceFingerprint !== (0, decision_registry_1.hashCanonicalBody)(surface));
            }))
            fail();
        return {
            sessionId: session.sessionId,
            sessionOrdinal: ordinal,
            sourceSubjectFingerprint: intro.sourceSubjectFingerprint,
            introFingerprint: intro.introFingerprint,
            introProjectionFingerprint: intro.projectionFingerprint,
            intro: session.introPin,
        };
    });
    const body = {
        schemaVersion: exports.LEARNING_V2_ACTIVITY_LEARNER_CORE_RELEASE_INDEX_SCHEMA_V2,
        coreIndexV1Raw: (0, activity_learner_core_release_index_v1_1.encodeLearningV2ActivityLearnerCoreReleaseIndexV1)(input.coreIndexV1),
        coreIndexV1Fingerprint: input.coreIndexV1.indexFingerprint,
        planFingerprint: hash(input.planFingerprint),
        ownerInputFingerprint: hash(input.ownerInputFingerprint),
        introAggregateFingerprint: hash(input.introAggregateFingerprint),
        introProjectionSetFingerprint: hash(input.introProjectionSetFingerprint),
        ownerConfirmationFingerprint: hash(input.ownerConfirmationFingerprint),
        intros,
        sessionCount: 12,
        introQuestionCount: 36,
        objectCount: 36,
        introReleaseBinding: "exact_owner_confirmed_projection_to_render_session",
        repositoryOriginAuthority: "none_server_readback_required",
        storageAuthority: "none_server_readback_required",
        ownerConfirmationAuthority: "none_private_confirmed_owner_handle_required",
        runtimeAuthority: "none_active_pointer_and_readback_required",
        walletAuthority: "none",
        masteryAuthority: "none",
        evidenceAuthority: "none",
        completionAuthority: "none",
        publicationAuthority: "none",
        releaseAuthority: false,
    };
    return parseLearningV2ActivityLearnerCoreReleaseIndexV2((0, decision_registry_1.canonicalJsonV1)({ ...body, indexFingerprint: (0, decision_registry_1.hashCanonicalBody)(body) }));
}
function parseLearningV2ActivityLearnerCoreReleaseIndexV2(raw) {
    if (typeof raw !== "string" ||
        raw.length < 2 ||
        raw.length > exports.LEARNING_V2_ACTIVITY_LEARNER_CORE_RELEASE_INDEX_MAX_BYTES_V2 ||
        (0, decision_registry_1.utf8ByteLengthV1)(raw) >
            exports.LEARNING_V2_ACTIVITY_LEARNER_CORE_RELEASE_INDEX_MAX_BYTES_V2)
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
function encodeLearningV2ActivityLearnerCoreReleaseIndexV2(index) {
    if (!isLearningV2ActivityLearnerCoreReleaseIndexV2(index))
        fail();
    return (0, decision_registry_1.canonicalJsonV1)(index);
}
function isLearningV2ActivityLearnerCoreReleaseIndexV2(value) {
    return typeof value === "object" && value !== null && handles.has(value);
}
//# sourceMappingURL=activity_learner_core_release_index_v2.js.map