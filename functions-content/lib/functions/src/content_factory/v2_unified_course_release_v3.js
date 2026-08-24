"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decideV2UnifiedCourseReleaseHeadV3 = exports.V2_UNIFIED_COURSE_RELEASE_HEAD_MAX_BYTES_V3 = exports.V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V3 = exports.V2_UNIFIED_COURSE_RELEASE_HEAD_SCHEMA_V3 = exports.V2_UNIFIED_COURSE_RELEASE_ROOT_SCHEMA_V3 = void 0;
exports.materializeV2UnifiedCourseReleaseRootV3 = materializeV2UnifiedCourseReleaseRootV3;
exports.parseV2UnifiedCourseReleaseRootV3 = parseV2UnifiedCourseReleaseRootV3;
exports.encodeV2UnifiedCourseReleaseRootV3 = encodeV2UnifiedCourseReleaseRootV3;
exports.isV2UnifiedCourseReleaseRootV3 = isV2UnifiedCourseReleaseRootV3;
exports.parseV2UnifiedCourseReleaseHeadV3 = parseV2UnifiedCourseReleaseHeadV3;
exports.encodeV2UnifiedCourseReleaseHeadV3 = encodeV2UnifiedCourseReleaseHeadV3;
exports.isV2UnifiedCourseReleaseHeadV3 = isV2UnifiedCourseReleaseHeadV3;
const voice_playback_policy_v1_1 = require("../../../modules/learning-v2/contracts/voice_playback_policy_v1");
const language_tag_v1_1 = require("../../../modules/learning-v2/contracts/language_tag_v1");
const course_topology_v1_1 = require("../../../modules/learning-v2/content/course_topology_v1");
const course_lesson_audio_release_index_v1_1 = require("../../../modules/learning-v2/runtime/course_lesson_audio_release_index_v1");
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const v2_unified_course_release_repository_v2_1 = require("./v2_unified_course_release_repository_v2");
const v2_unified_course_release_v2_1 = require("./v2_unified_course_release_v2");
exports.V2_UNIFIED_COURSE_RELEASE_ROOT_SCHEMA_V3 = "v2-unified-course-release-root.v3";
exports.V2_UNIFIED_COURSE_RELEASE_HEAD_SCHEMA_V3 = "v2-unified-course-release-head.v3";
exports.V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V3 = 512 * 1024;
exports.V2_UNIFIED_COURSE_RELEASE_HEAD_MAX_BYTES_V3 = 32 * 1024;
const HASH_RE = /^[a-f0-9]{64}$/u;
const GENERATION_RE = /^[1-9][0-9]{0,30}$/u;
const RESERVED = new Set(["__proto__", "prototype", "constructor"]);
const handles = new WeakSet();
const headHandles = new WeakSet();
const PIN_KEYS = Object.freeze([
    "objectPath",
    "contentHash",
    "objectGeneration",
    "byteSize",
    "contentType",
]);
const LESSON_KEYS = Object.freeze([
    "lessonOrdinal",
    "lessonId",
    "baseLessonIndexFingerprint",
    "audioIndexFingerprint",
    "audioIndexObject",
    "extensionSetFingerprint",
    "audioSetFingerprint",
    "sessionCount",
    "lessonAudioReleaseFingerprint",
]);
const ROOT_KEYS = Object.freeze([
    "schemaVersion",
    "baseRootSchemaVersion",
    "topologySchemaVersion",
    "topologyFingerprint",
    "courseModel",
    "environment",
    "releaseId",
    "planFingerprint",
    "courseContractFingerprint",
    "seasonId",
    "targetLanguage",
    "studyTarget",
    "learnerSourceLocale",
    "interfaceLocales",
    "contentClass",
    "releaseScope",
    "rollout",
    "baseRootFingerprint",
    "baseRootObject",
    "lessons",
    "lessonCount",
    "sessionsPerLesson",
    "directSessionCount",
    "audioLessonIndexAggregate",
    "audioExtensionAggregate",
    "audioSetAggregate",
    "audioCoverage",
    "requiredVoiceIds",
    "variantsPerAudioCoordinate",
    "taskVoiceScope",
    "playbackTransport",
    "serverRequestPerPlayback",
    "remoteTtsFallbackDuringSession",
    "answerPayload",
    "correctnessAuthority",
    "serverAnswerAuthority",
    "repositoryOriginAuthority",
    "storageAuthority",
    "publicationDecisionAuthority",
    "executionAuthority",
    "runtimeConsumer",
    "releaseEligible",
    "releaseAuthority",
    "rootFingerprint",
]);
const HEAD_KEYS = Object.freeze([
    "schemaVersion",
    "topologyFingerprint",
    "environment",
    "seasonId",
    "targetLanguage",
    "studyTarget",
    "learnerSourceLocale",
    "activeReleaseId",
    "activeRootFingerprint",
    "activeBaseRootFingerprint",
    "activeRootObject",
    "previousReleaseId",
    "previousRootFingerprint",
    "previousBaseRootFingerprint",
    "previousRootObject",
    "operationRevision",
    "state",
    "operationId",
    "operationFingerprint",
    "updatedAtIso",
    "headAuthority",
    "serverAnswerAuthority",
    "runtimeConsumer",
    "releaseAuthority",
    "headFingerprint",
]);
function fail() {
    throw new Error("v2_unified_course_release_v3_invalid");
}
function record(value) {
    return (typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype);
}
function exactKeys(value, expected) {
    const actual = Object.keys(value).sort();
    const wanted = [...expected].sort();
    if (actual.length !== wanted.length ||
        actual.some((key, index) => key !== wanted[index] || RESERVED.has(key)))
        fail();
}
function exactHash(value) {
    if (typeof value !== "string" || !HASH_RE.test(value))
        fail();
    return value;
}
function exactId(value) {
    if (typeof value !== "string" ||
        !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u.test(value) ||
        RESERVED.has(value))
        fail();
    return value;
}
function exactIso(value) {
    if (typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value) ||
        new Date(value).toISOString() !== value)
        fail();
    return value;
}
function exactPin(value) {
    if (!record(value))
        fail();
    exactKeys(value, PIN_KEYS);
    if (typeof value.objectPath !== "string" ||
        typeof value.objectGeneration !== "string" ||
        !GENERATION_RE.test(value.objectGeneration) ||
        !Number.isSafeInteger(value.byteSize) ||
        Number(value.byteSize) < 2 ||
        value.contentType !== "application/json; charset=utf-8")
        fail();
    return Object.freeze({
        objectPath: value.objectPath,
        contentHash: exactHash(value.contentHash),
        objectGeneration: value.objectGeneration,
        byteSize: Number(value.byteSize),
        contentType: "application/json; charset=utf-8",
    });
}
function lessonFromRaw(value, expected) {
    if (!record(value))
        fail();
    exactKeys(value, LESSON_KEYS);
    const body = {
        lessonOrdinal: expected.lessonOrdinal,
        lessonId: expected.lessonId,
        baseLessonIndexFingerprint: expected.lessonIndexFingerprint,
        audioIndexFingerprint: exactHash(value.audioIndexFingerprint),
        audioIndexObject: exactPin(value.audioIndexObject),
        extensionSetFingerprint: exactHash(value.extensionSetFingerprint),
        audioSetFingerprint: exactHash(value.audioSetFingerprint),
        sessionCount: course_topology_v1_1.LEARNING_V2_LESSON_SESSION_COUNT_V1,
    };
    if (value.lessonOrdinal !== body.lessonOrdinal ||
        value.lessonId !== body.lessonId ||
        value.baseLessonIndexFingerprint !== body.baseLessonIndexFingerprint ||
        value.sessionCount !== body.sessionCount ||
        value.lessonAudioReleaseFingerprint !== (0, decision_registry_1.hashCanonicalBody)(body))
        fail();
    return Object.freeze({
        ...body,
        lessonAudioReleaseFingerprint: value.lessonAudioReleaseFingerprint,
    });
}
function build(baseRoot, baseRootObject, lessons) {
    const body = {
        schemaVersion: exports.V2_UNIFIED_COURSE_RELEASE_ROOT_SCHEMA_V3,
        baseRootSchemaVersion: v2_unified_course_release_v2_1.V2_UNIFIED_COURSE_RELEASE_ROOT_SCHEMA_V2,
        topologySchemaVersion: baseRoot.topologySchemaVersion,
        topologyFingerprint: baseRoot.topologyFingerprint,
        courseModel: "direct_32_lessons_56_sessions_audio_required",
        environment: baseRoot.environment,
        releaseId: baseRoot.releaseId,
        planFingerprint: baseRoot.planFingerprint,
        courseContractFingerprint: baseRoot.courseContractFingerprint,
        seasonId: baseRoot.seasonId,
        targetLanguage: baseRoot.targetLanguage,
        studyTarget: baseRoot.studyTarget,
        learnerSourceLocale: baseRoot.learnerSourceLocale,
        interfaceLocales: Object.freeze([...baseRoot.interfaceLocales]),
        contentClass: baseRoot.contentClass,
        releaseScope: baseRoot.releaseScope,
        rollout: baseRoot.rollout,
        baseRootFingerprint: baseRoot.rootFingerprint,
        baseRootObject,
        lessons: Object.freeze([...lessons]),
        lessonCount: lessons.length,
        sessionsPerLesson: course_topology_v1_1.LEARNING_V2_LESSON_SESSION_COUNT_V1,
        directSessionCount: lessons.length * course_topology_v1_1.LEARNING_V2_LESSON_SESSION_COUNT_V1,
        audioLessonIndexAggregate: (0, decision_registry_1.hashCanonicalBody)(lessons.map((lesson) => lesson.audioIndexFingerprint)),
        audioExtensionAggregate: (0, decision_registry_1.hashCanonicalBody)(lessons.map((lesson) => lesson.extensionSetFingerprint)),
        audioSetAggregate: (0, decision_registry_1.hashCanonicalBody)(lessons.map((lesson) => lesson.audioSetFingerprint)),
        audioCoverage: "exact_audio_extension_for_every_released_session",
        requiredVoiceIds: voice_playback_policy_v1_1.V2_REQUIRED_VOICE_IDS,
        variantsPerAudioCoordinate: 4,
        taskVoiceScope: "one_voice_per_interaction_for_phrase_and_words",
        playbackTransport: "generation_pinned_local_file_only",
        serverRequestPerPlayback: false,
        remoteTtsFallbackDuringSession: false,
        answerPayload: "absent_by_exact_schema",
        correctnessAuthority: "local_device_only",
        serverAnswerAuthority: "none_answers_never_transported_or_rechecked",
        repositoryOriginAuthority: "none_server_readback_required",
        storageAuthority: "none_server_readback_required",
        publicationDecisionAuthority: "none",
        executionAuthority: "none",
        runtimeConsumer: false,
        releaseEligible: false,
        releaseAuthority: false,
    };
    const result = Object.freeze({
        ...body,
        rootFingerprint: (0, decision_registry_1.hashCanonicalBody)(body),
    });
    if ((baseRoot.releaseScope === "full_course" &&
        result.directSessionCount !== course_topology_v1_1.LEARNING_V2_COURSE_SESSION_COUNT_V1) ||
        (0, decision_registry_1.utf8ByteLengthV1)((0, decision_registry_1.canonicalJsonV1)(result)) >
            exports.V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V3)
        fail();
    handles.add(result);
    return result;
}
function materializeV2UnifiedCourseReleaseRootV3(input) {
    if (!record(input) ||
        Object.keys(input).sort().join("|") !== "baseRoot|baseRootObject|lessons" ||
        !(0, v2_unified_course_release_v2_1.isV2UnifiedCourseReleaseRootV2)(input.baseRoot) ||
        !Array.isArray(input.lessons) ||
        input.lessons.length !== input.baseRoot.lessons.length)
        fail();
    const baseRaw = (0, decision_registry_1.canonicalJsonV1)(input.baseRoot);
    const baseRawHash = (0, decision_registry_1.sha256Utf8)(baseRaw);
    const baseRootObject = exactPin(input.baseRootObject);
    if (baseRootObject.objectPath !==
        (0, v2_unified_course_release_repository_v2_1.v2UnifiedCourseReleaseRootObjectPathV2)({
            releaseId: input.baseRoot.releaseId,
            rootFingerprint: input.baseRoot.rootFingerprint,
            rawHash: baseRawHash,
        }) ||
        baseRootObject.contentHash !== baseRawHash ||
        baseRootObject.byteSize !== (0, decision_registry_1.utf8ByteLengthV1)(baseRaw))
        fail();
    const lessons = input.baseRoot.lessons.map((baseLesson, index) => {
        const source = input.lessons[index];
        if (!source ||
            !(0, course_lesson_audio_release_index_v1_1.isLearningV2CourseLessonAudioReleaseIndexV1)(source.index) ||
            source.index.releaseId !== input.baseRoot.releaseId ||
            source.index.lessonId !== baseLesson.lessonId ||
            source.index.lessonOrdinal !== baseLesson.lessonOrdinal ||
            source.index.baseLessonIndexFingerprint !==
                baseLesson.lessonIndexFingerprint)
            fail();
        const raw = (0, course_lesson_audio_release_index_v1_1.encodeLearningV2CourseLessonAudioReleaseIndexV1)(source.index);
        const rawHash = (0, decision_registry_1.sha256Utf8)(raw);
        const indexObject = exactPin(source.indexObject);
        if (indexObject.objectPath !==
            (0, course_lesson_audio_release_index_v1_1.learningV2CourseLessonAudioReleaseIndexObjectPathV1)({
                releaseId: source.index.releaseId,
                lessonId: source.index.lessonId,
                indexFingerprint: source.index.indexFingerprint,
                rawHash,
            }) ||
            indexObject.contentHash !== rawHash ||
            indexObject.byteSize !== (0, decision_registry_1.utf8ByteLengthV1)(raw))
            fail();
        const body = {
            lessonOrdinal: baseLesson.lessonOrdinal,
            lessonId: baseLesson.lessonId,
            baseLessonIndexFingerprint: baseLesson.lessonIndexFingerprint,
            audioIndexFingerprint: source.index.indexFingerprint,
            audioIndexObject: indexObject,
            extensionSetFingerprint: source.index.extensionSetFingerprint,
            audioSetFingerprint: source.index.audioSetFingerprint,
            sessionCount: course_topology_v1_1.LEARNING_V2_LESSON_SESSION_COUNT_V1,
        };
        return Object.freeze({
            ...body,
            lessonAudioReleaseFingerprint: (0, decision_registry_1.hashCanonicalBody)(body),
        });
    });
    return build(input.baseRoot, baseRootObject, lessons);
}
function parseV2UnifiedCourseReleaseRootV3(raw, baseRoot) {
    if (typeof raw !== "string" ||
        raw.length > exports.V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V3 ||
        (0, decision_registry_1.utf8ByteLengthV1)(raw) > exports.V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V3 ||
        !(0, v2_unified_course_release_v2_1.isV2UnifiedCourseReleaseRootV2)(baseRoot))
        fail();
    let value;
    try {
        value = JSON.parse(raw);
    }
    catch {
        fail();
    }
    if (!record(value) || (0, decision_registry_1.canonicalJsonV1)(value) !== raw)
        fail();
    exactKeys(value, ROOT_KEYS);
    if (value.schemaVersion !== exports.V2_UNIFIED_COURSE_RELEASE_ROOT_SCHEMA_V3 ||
        value.baseRootSchemaVersion !== v2_unified_course_release_v2_1.V2_UNIFIED_COURSE_RELEASE_ROOT_SCHEMA_V2 ||
        value.baseRootFingerprint !== baseRoot.rootFingerprint ||
        !Array.isArray(value.lessons) ||
        value.lessons.length !== baseRoot.lessons.length)
        fail();
    const lessons = value.lessons.map((lesson, index) => lessonFromRaw(lesson, baseRoot.lessons[index]));
    const rebuilt = build(baseRoot, exactPin(value.baseRootObject), lessons);
    if ((0, decision_registry_1.canonicalJsonV1)(rebuilt) !== raw)
        fail();
    return rebuilt;
}
function encodeV2UnifiedCourseReleaseRootV3(value) {
    if (!handles.has(value))
        fail();
    return (0, decision_registry_1.canonicalJsonV1)(value);
}
function isV2UnifiedCourseReleaseRootV3(value) {
    return typeof value === "object" && value !== null && handles.has(value);
}
function buildHead(input) {
    if (!isV2UnifiedCourseReleaseRootV3(input.target))
        fail();
    if (input.current !== null && !headHandles.has(input.current))
        fail();
    const targetObject = exactPin(input.targetObject);
    const operationId = exactId(input.operationId);
    const operationFingerprint = (0, decision_registry_1.hashCanonicalBody)({
        action: input.action,
        operationId,
        targetRootFingerprint: input.target.rootFingerprint,
        targetBaseRootFingerprint: input.target.baseRootFingerprint,
        targetObject,
        expectedRevision: input.expectedRevision,
    });
    if (input.current &&
        headHandles.has(input.current) &&
        input.current.operationFingerprint === operationFingerprint)
        return Object.freeze({ kind: "exact_replay", head: input.current });
    if (!Number.isSafeInteger(input.expectedRevision) ||
        input.expectedRevision < 0 ||
        input.expectedRevision >= Number.MAX_SAFE_INTEGER ||
        (input.current?.operationRevision ?? 0) !== input.expectedRevision)
        fail();
    if (input.current &&
        (input.current.topologyFingerprint !== input.target.topologyFingerprint ||
            input.current.environment !== input.target.environment ||
            input.current.seasonId !== input.target.seasonId ||
            input.current.targetLanguage !== input.target.targetLanguage ||
            input.current.studyTarget !== input.target.studyTarget ||
            input.current.learnerSourceLocale !== input.target.learnerSourceLocale))
        fail();
    if (input.current?.activeRootFingerprint === input.target.rootFingerprint)
        fail();
    if (input.action === "rollback" &&
        (!input.current ||
            input.current.previousReleaseId !== input.target.releaseId ||
            input.current.previousRootFingerprint !== input.target.rootFingerprint ||
            input.current.previousBaseRootFingerprint !==
                input.target.baseRootFingerprint ||
            (0, decision_registry_1.canonicalJsonV1)(input.current.previousRootObject) !==
                (0, decision_registry_1.canonicalJsonV1)(targetObject)))
        fail();
    const body = {
        schemaVersion: exports.V2_UNIFIED_COURSE_RELEASE_HEAD_SCHEMA_V3,
        topologyFingerprint: input.target.topologyFingerprint,
        environment: input.target.environment,
        seasonId: input.target.seasonId,
        targetLanguage: input.target.targetLanguage,
        studyTarget: input.target.studyTarget,
        learnerSourceLocale: input.target.learnerSourceLocale,
        activeReleaseId: input.target.releaseId,
        activeRootFingerprint: input.target.rootFingerprint,
        activeBaseRootFingerprint: input.target.baseRootFingerprint,
        activeRootObject: targetObject,
        previousReleaseId: input.current?.activeReleaseId ?? null,
        previousRootFingerprint: input.current?.activeRootFingerprint ?? null,
        previousBaseRootFingerprint: input.current?.activeBaseRootFingerprint ?? null,
        previousRootObject: input.current?.activeRootObject ?? null,
        operationRevision: input.expectedRevision + 1,
        state: input.action === "rollback"
            ? "rolled_back"
            : "live",
        operationId,
        operationFingerprint,
        updatedAtIso: exactIso(input.updatedAtIso),
        headAuthority: "none_server_cas_and_readback_required",
        serverAnswerAuthority: "none_answers_never_transported_or_rechecked",
        runtimeConsumer: false,
        releaseAuthority: false,
    };
    const head = Object.freeze({
        ...body,
        headFingerprint: (0, decision_registry_1.hashCanonicalBody)(body),
    });
    if ((0, decision_registry_1.utf8ByteLengthV1)((0, decision_registry_1.canonicalJsonV1)(head)) >
        exports.V2_UNIFIED_COURSE_RELEASE_HEAD_MAX_BYTES_V3)
        fail();
    headHandles.add(head);
    return Object.freeze({ kind: "commit", head });
}
exports.decideV2UnifiedCourseReleaseHeadV3 = buildHead;
function parseV2UnifiedCourseReleaseHeadV3(raw) {
    if (typeof raw !== "string" ||
        raw.length > exports.V2_UNIFIED_COURSE_RELEASE_HEAD_MAX_BYTES_V3 ||
        (0, decision_registry_1.utf8ByteLengthV1)(raw) > exports.V2_UNIFIED_COURSE_RELEASE_HEAD_MAX_BYTES_V3)
        fail();
    let value;
    try {
        value = JSON.parse(raw);
    }
    catch {
        fail();
    }
    if (!record(value) || (0, decision_registry_1.canonicalJsonV1)(value) !== raw)
        fail();
    exactKeys(value, HEAD_KEYS);
    const activeRootObject = exactPin(value.activeRootObject);
    const previousRootObject = value.previousRootObject === null
        ? null
        : exactPin(value.previousRootObject);
    if (value.schemaVersion !== exports.V2_UNIFIED_COURSE_RELEASE_HEAD_SCHEMA_V3 ||
        (value.environment !== "lab" &&
            value.environment !== "staging" &&
            value.environment !== "production") ||
        (0, language_tag_v1_1.parseV2ExactLanguageTagV1)(value.targetLanguage) === null ||
        (0, language_tag_v1_1.parseV2ExactLanguageTagV1)(value.studyTarget) === null ||
        (0, language_tag_v1_1.parseV2ExactLanguageTagV1)(value.learnerSourceLocale) === null ||
        (value.previousReleaseId === null) !==
            (value.previousRootFingerprint === null) ||
        (value.previousReleaseId === null) !==
            (value.previousBaseRootFingerprint === null) ||
        (value.previousReleaseId === null) !== (previousRootObject === null) ||
        !Number.isSafeInteger(value.operationRevision) ||
        Number(value.operationRevision) < 1 ||
        (value.state !== "live" && value.state !== "rolled_back"))
        fail();
    const body = {
        schemaVersion: exports.V2_UNIFIED_COURSE_RELEASE_HEAD_SCHEMA_V3,
        topologyFingerprint: exactHash(value.topologyFingerprint),
        environment: value.environment,
        seasonId: exactId(value.seasonId),
        targetLanguage: value.targetLanguage,
        studyTarget: value.studyTarget,
        learnerSourceLocale: value.learnerSourceLocale,
        activeReleaseId: exactId(value.activeReleaseId),
        activeRootFingerprint: exactHash(value.activeRootFingerprint),
        activeBaseRootFingerprint: exactHash(value.activeBaseRootFingerprint),
        activeRootObject,
        previousReleaseId: value.previousReleaseId === null
            ? null
            : exactId(value.previousReleaseId),
        previousRootFingerprint: value.previousRootFingerprint === null
            ? null
            : exactHash(value.previousRootFingerprint),
        previousBaseRootFingerprint: value.previousBaseRootFingerprint === null
            ? null
            : exactHash(value.previousBaseRootFingerprint),
        previousRootObject,
        operationRevision: Number(value.operationRevision),
        state: value.state,
        operationId: exactId(value.operationId),
        operationFingerprint: exactHash(value.operationFingerprint),
        updatedAtIso: exactIso(value.updatedAtIso),
        headAuthority: "none_server_cas_and_readback_required",
        serverAnswerAuthority: "none_answers_never_transported_or_rechecked",
        runtimeConsumer: false,
        releaseAuthority: false,
    };
    if (value.headAuthority !== body.headAuthority ||
        value.serverAnswerAuthority !== body.serverAnswerAuthority ||
        value.runtimeConsumer !== false ||
        value.releaseAuthority !== false ||
        value.headFingerprint !== (0, decision_registry_1.hashCanonicalBody)(body))
        fail();
    const head = Object.freeze({
        ...body,
        headFingerprint: value.headFingerprint,
    });
    if ((0, decision_registry_1.canonicalJsonV1)(head) !== raw)
        fail();
    headHandles.add(head);
    return head;
}
function encodeV2UnifiedCourseReleaseHeadV3(value) {
    if (!headHandles.has(value))
        fail();
    return (0, decision_registry_1.canonicalJsonV1)(value);
}
function isV2UnifiedCourseReleaseHeadV3(value) {
    return typeof value === "object" && value !== null && headHandles.has(value);
}
//# sourceMappingURL=v2_unified_course_release_v3.js.map