"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEARNING_V2_COURSE_LESSON_AUDIO_RELEASE_INDEX_PREFIX_V1 = exports.LEARNING_V2_COURSE_LESSON_AUDIO_RELEASE_INDEX_MAX_BYTES_V1 = exports.LEARNING_V2_COURSE_LESSON_AUDIO_RELEASE_INDEX_SCHEMA_V1 = void 0;
exports.learningV2CourseLessonAudioReleaseIndexObjectPathV1 = learningV2CourseLessonAudioReleaseIndexObjectPathV1;
exports.materializeLearningV2CourseLessonAudioReleaseIndexV1 = materializeLearningV2CourseLessonAudioReleaseIndexV1;
exports.parseLearningV2CourseLessonAudioReleaseIndexV1 = parseLearningV2CourseLessonAudioReleaseIndexV1;
exports.encodeLearningV2CourseLessonAudioReleaseIndexV1 = encodeLearningV2CourseLessonAudioReleaseIndexV1;
exports.isLearningV2CourseLessonAudioReleaseIndexV1 = isLearningV2CourseLessonAudioReleaseIndexV1;
const course_topology_v1_1 = require("../content/course_topology_v1");
const decision_registry_1 = require("../policies/decision_registry");
const course_session_audio_release_extension_v1_1 = require("./course_session_audio_release_extension_v1");
const course_lesson_release_index_v1_1 = require("./course_lesson_release_index_v1");
exports.LEARNING_V2_COURSE_LESSON_AUDIO_RELEASE_INDEX_SCHEMA_V1 = "learning-v2-course-lesson-audio-release-index.v1";
exports.LEARNING_V2_COURSE_LESSON_AUDIO_RELEASE_INDEX_MAX_BYTES_V1 = 512 * 1024;
exports.LEARNING_V2_COURSE_LESSON_AUDIO_RELEASE_INDEX_PREFIX_V1 = "learning-v2/course-lesson-audio-release-indexes";
const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const GENERATION_RE = /^[1-9][0-9]{0,30}$/u;
const RESERVED = new Set(["__proto__", "prototype", "constructor"]);
const handles = new WeakSet();
const topology = (0, course_topology_v1_1.buildLearningV2CourseTopologyV1)();
const ROOT_KEYS = Object.freeze([
    "schemaVersion",
    "releaseId",
    "lessonId",
    "lessonOrdinal",
    "baseLessonIndexFingerprint",
    "sessions",
    "sessionCount",
    "extensionSetFingerprint",
    "audioSetFingerprint",
    "joinPolicy",
    "playbackPolicy",
    "answerPayload",
    "correctnessAuthority",
    "repositoryOriginAuthority",
    "storageAuthority",
    "runtimeAuthority",
    "publicationAuthority",
    "releaseAuthority",
    "indexFingerprint",
]);
const SESSION_KEYS = Object.freeze([
    "courseSessionId",
    "sessionOrdinal",
    "basePackageFingerprint",
    "baseChildSetFingerprint",
    "learnerFingerprint",
    "audioFingerprint",
    "extensionFingerprint",
    "extensionPin",
]);
const PIN_KEYS = Object.freeze([
    "objectPath",
    "contentHash",
    "objectGeneration",
    "byteSize",
    "contentType",
]);
function fail() {
    throw new Error("learning_v2_course_lesson_audio_release_index_invalid");
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
function hash(value) {
    if (typeof value !== "string" || !HASH_RE.test(value))
        fail();
    return value;
}
function id(value) {
    if (typeof value !== "string" || !ID_RE.test(value) || RESERVED.has(value))
        fail();
    return value;
}
function learningV2CourseLessonAudioReleaseIndexObjectPathV1(input) {
    if (!record(input) ||
        Object.keys(input).sort().join("|") !==
            "indexFingerprint|lessonId|rawHash|releaseId")
        fail();
    return `${exports.LEARNING_V2_COURSE_LESSON_AUDIO_RELEASE_INDEX_PREFIX_V1}/${(0, decision_registry_1.sha256Utf8)(id(input.releaseId))}/${(0, decision_registry_1.sha256Utf8)(id(input.lessonId))}/${hash(input.indexFingerprint)}/${hash(input.rawHash)}.json`;
}
function validate(value) {
    if (!record(value))
        fail();
    exactKeys(value, ROOT_KEYS);
    if (value.schemaVersion !==
        exports.LEARNING_V2_COURSE_LESSON_AUDIO_RELEASE_INDEX_SCHEMA_V1 ||
        !Number.isSafeInteger(value.lessonOrdinal) ||
        !Array.isArray(value.sessions) ||
        value.sessions.length !== course_topology_v1_1.LEARNING_V2_LESSON_SESSION_COUNT_V1)
        fail();
    const lesson = topology.lessons[Number(value.lessonOrdinal) - 1];
    if (!lesson || value.lessonId !== lesson.lessonId)
        fail();
    const releaseId = id(value.releaseId);
    const sessions = Object.freeze(value.sessions.map((candidate, index) => {
        if (!record(candidate))
            fail();
        exactKeys(candidate, SESSION_KEYS);
        if (!record(candidate.extensionPin))
            fail();
        exactKeys(candidate.extensionPin, PIN_KEYS);
        const expected = lesson.sessions[index];
        if (!expected ||
            candidate.courseSessionId !== expected.sessionId ||
            candidate.sessionOrdinal !== expected.sessionOrdinal)
            fail();
        const extensionFingerprint = hash(candidate.extensionFingerprint);
        const contentHash = hash(candidate.extensionPin.contentHash);
        if (typeof candidate.extensionPin.objectGeneration !== "string" ||
            !GENERATION_RE.test(candidate.extensionPin.objectGeneration) ||
            !Number.isSafeInteger(candidate.extensionPin.byteSize) ||
            Number(candidate.extensionPin.byteSize) < 2 ||
            Number(candidate.extensionPin.byteSize) > 64 * 1024 ||
            candidate.extensionPin.contentType !==
                "application/json; charset=utf-8" ||
            candidate.extensionPin.objectPath !==
                (0, course_session_audio_release_extension_v1_1.learningV2CourseSessionAudioReleaseExtensionObjectPathV1)({
                    releaseId,
                    lessonId: lesson.lessonId,
                    courseSessionId: expected.sessionId,
                    extensionFingerprint,
                    rawHash: contentHash,
                }))
            fail();
        return Object.freeze({
            courseSessionId: expected.sessionId,
            sessionOrdinal: expected.sessionOrdinal,
            basePackageFingerprint: hash(candidate.basePackageFingerprint),
            baseChildSetFingerprint: hash(candidate.baseChildSetFingerprint),
            learnerFingerprint: hash(candidate.learnerFingerprint),
            audioFingerprint: hash(candidate.audioFingerprint),
            extensionFingerprint,
            extensionPin: Object.freeze({
                objectPath: candidate.extensionPin.objectPath,
                contentHash,
                objectGeneration: candidate.extensionPin.objectGeneration,
                byteSize: Number(candidate.extensionPin.byteSize),
                contentType: "application/json; charset=utf-8",
            }),
        });
    }));
    const body = {
        schemaVersion: exports.LEARNING_V2_COURSE_LESSON_AUDIO_RELEASE_INDEX_SCHEMA_V1,
        releaseId,
        lessonId: lesson.lessonId,
        lessonOrdinal: lesson.lessonOrdinal,
        baseLessonIndexFingerprint: hash(value.baseLessonIndexFingerprint),
        sessions,
        sessionCount: course_topology_v1_1.LEARNING_V2_LESSON_SESSION_COUNT_V1,
        extensionSetFingerprint: (0, decision_registry_1.hashCanonicalBody)(sessions.map((session) => session.extensionFingerprint)),
        audioSetFingerprint: (0, decision_registry_1.hashCanonicalBody)(sessions.map((session) => session.audioFingerprint)),
        joinPolicy: "exact_56_base_package_to_audio_extension_bijection",
        playbackPolicy: "generation_pinned_local_files_no_session_network_tts",
        answerPayload: "absent_by_exact_schema",
        correctnessAuthority: "none",
        repositoryOriginAuthority: "none_active_release_join_required",
        storageAuthority: "none_generation_pinned_readback_required",
        runtimeAuthority: "none_active_release_join_required",
        publicationAuthority: "none",
        releaseAuthority: false,
    };
    const candidate = value;
    if (candidate.sessionCount !== body.sessionCount ||
        candidate.extensionSetFingerprint !== body.extensionSetFingerprint ||
        candidate.audioSetFingerprint !== body.audioSetFingerprint ||
        candidate.joinPolicy !== body.joinPolicy ||
        candidate.playbackPolicy !== body.playbackPolicy ||
        candidate.answerPayload !== body.answerPayload ||
        candidate.correctnessAuthority !== body.correctnessAuthority ||
        candidate.repositoryOriginAuthority !== body.repositoryOriginAuthority ||
        candidate.storageAuthority !== body.storageAuthority ||
        candidate.runtimeAuthority !== body.runtimeAuthority ||
        candidate.publicationAuthority !== body.publicationAuthority ||
        candidate.releaseAuthority !== false ||
        candidate.indexFingerprint !== (0, decision_registry_1.hashCanonicalBody)(body))
        fail();
    const result = Object.freeze({
        ...body,
        indexFingerprint: candidate.indexFingerprint,
    });
    handles.add(result);
    return result;
}
function materializeLearningV2CourseLessonAudioReleaseIndexV1(input) {
    if (!record(input) ||
        Object.keys(input).sort().join("|") !== "baseIndex|sessions" ||
        !(0, course_lesson_release_index_v1_1.isLearningV2CourseLessonReleaseIndexV1)(input.baseIndex) ||
        !Array.isArray(input.sessions) ||
        input.sessions.length !== input.baseIndex.sessions.length)
        fail();
    const sessions = input.baseIndex.sessions.map((base, index) => {
        const source = input.sessions[index];
        if (!source ||
            !(0, course_session_audio_release_extension_v1_1.isLearningV2CourseSessionAudioReleaseExtensionV1)(source.extension) ||
            !GENERATION_RE.test(source.extensionObjectGeneration))
            fail();
        const extension = source.extension;
        if (extension.releaseId !== input.baseIndex.releaseId ||
            extension.lessonId !== input.baseIndex.lessonId ||
            extension.lessonOrdinal !== input.baseIndex.lessonOrdinal ||
            extension.courseSessionId !== base.courseSessionId ||
            extension.sessionOrdinal !== base.sessionOrdinal ||
            extension.basePackageFingerprint !== base.packageFingerprint)
            fail();
        const raw = (0, course_session_audio_release_extension_v1_1.encodeLearningV2CourseSessionAudioReleaseExtensionV1)(extension);
        const rawHash = (0, decision_registry_1.sha256Utf8)(raw);
        return {
            courseSessionId: base.courseSessionId,
            sessionOrdinal: base.sessionOrdinal,
            basePackageFingerprint: extension.basePackageFingerprint,
            baseChildSetFingerprint: extension.baseChildSetFingerprint,
            learnerFingerprint: extension.learnerFingerprint,
            audioFingerprint: extension.audioFingerprint,
            extensionFingerprint: extension.extensionFingerprint,
            extensionPin: {
                objectPath: (0, course_session_audio_release_extension_v1_1.learningV2CourseSessionAudioReleaseExtensionObjectPathV1)({
                    releaseId: extension.releaseId,
                    lessonId: extension.lessonId,
                    courseSessionId: extension.courseSessionId,
                    extensionFingerprint: extension.extensionFingerprint,
                    rawHash,
                }),
                contentHash: rawHash,
                objectGeneration: source.extensionObjectGeneration,
                byteSize: (0, decision_registry_1.utf8ByteLengthV1)(raw),
                contentType: "application/json; charset=utf-8",
            },
        };
    });
    const body = {
        schemaVersion: exports.LEARNING_V2_COURSE_LESSON_AUDIO_RELEASE_INDEX_SCHEMA_V1,
        releaseId: input.baseIndex.releaseId,
        lessonId: input.baseIndex.lessonId,
        lessonOrdinal: input.baseIndex.lessonOrdinal,
        baseLessonIndexFingerprint: input.baseIndex.indexFingerprint,
        sessions,
        sessionCount: course_topology_v1_1.LEARNING_V2_LESSON_SESSION_COUNT_V1,
        extensionSetFingerprint: (0, decision_registry_1.hashCanonicalBody)(sessions.map((session) => session.extensionFingerprint)),
        audioSetFingerprint: (0, decision_registry_1.hashCanonicalBody)(sessions.map((session) => session.audioFingerprint)),
        joinPolicy: "exact_56_base_package_to_audio_extension_bijection",
        playbackPolicy: "generation_pinned_local_files_no_session_network_tts",
        answerPayload: "absent_by_exact_schema",
        correctnessAuthority: "none",
        repositoryOriginAuthority: "none_active_release_join_required",
        storageAuthority: "none_generation_pinned_readback_required",
        runtimeAuthority: "none_active_release_join_required",
        publicationAuthority: "none",
        releaseAuthority: false,
    };
    return validate({ ...body, indexFingerprint: (0, decision_registry_1.hashCanonicalBody)(body) });
}
function parseLearningV2CourseLessonAudioReleaseIndexV1(raw) {
    if (typeof raw !== "string" ||
        raw.length > exports.LEARNING_V2_COURSE_LESSON_AUDIO_RELEASE_INDEX_MAX_BYTES_V1 ||
        (0, decision_registry_1.utf8ByteLengthV1)(raw) >
            exports.LEARNING_V2_COURSE_LESSON_AUDIO_RELEASE_INDEX_MAX_BYTES_V1)
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
    return validate(decoded);
}
function encodeLearningV2CourseLessonAudioReleaseIndexV1(value) {
    if (!handles.has(value))
        fail();
    const raw = (0, decision_registry_1.canonicalJsonV1)(value);
    if ((0, decision_registry_1.utf8ByteLengthV1)(raw) >
        exports.LEARNING_V2_COURSE_LESSON_AUDIO_RELEASE_INDEX_MAX_BYTES_V1)
        fail();
    return raw;
}
function isLearningV2CourseLessonAudioReleaseIndexV1(value) {
    return typeof value === "object" && value !== null && handles.has(value);
}
//# sourceMappingURL=course_lesson_audio_release_index_v1.js.map