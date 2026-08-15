"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEARNING_V2_COURSE_SESSION_AUDIO_EXTENSION_MAX_BYTES_V1 = exports.LEARNING_V2_COURSE_SESSION_AUDIO_RELEASE_EXTENSION_OBJECT_PREFIX_V1 = exports.LEARNING_V2_COURSE_SESSION_AUDIO_EXTENSION_PREFIX_V1 = exports.LEARNING_V2_COURSE_SESSION_AUDIO_RELEASE_EXTENSION_SCHEMA_V1 = void 0;
exports.learningV2CourseSessionAudioChildObjectPathV1 = learningV2CourseSessionAudioChildObjectPathV1;
exports.learningV2CourseSessionAudioReleaseExtensionObjectPathV1 = learningV2CourseSessionAudioReleaseExtensionObjectPathV1;
exports.materializeLearningV2CourseSessionAudioReleaseExtensionV1 = materializeLearningV2CourseSessionAudioReleaseExtensionV1;
exports.parseLearningV2CourseSessionAudioReleaseExtensionV1 = parseLearningV2CourseSessionAudioReleaseExtensionV1;
exports.encodeLearningV2CourseSessionAudioReleaseExtensionV1 = encodeLearningV2CourseSessionAudioReleaseExtensionV1;
exports.isLearningV2CourseSessionAudioReleaseExtensionV1 = isLearningV2CourseSessionAudioReleaseExtensionV1;
const decision_registry_1 = require("../policies/decision_registry");
const course_session_audio_child_v1_1 = require("./course_session_audio_child_v1");
const course_session_client_children_v1_1 = require("./course_session_client_children_v1");
const course_session_release_package_v1_1 = require("./course_session_release_package_v1");
exports.LEARNING_V2_COURSE_SESSION_AUDIO_RELEASE_EXTENSION_SCHEMA_V1 = "learning-v2-course-session-audio-release-extension.v1";
exports.LEARNING_V2_COURSE_SESSION_AUDIO_EXTENSION_PREFIX_V1 = "learning-v2/course-session-audio-extensions";
exports.LEARNING_V2_COURSE_SESSION_AUDIO_RELEASE_EXTENSION_OBJECT_PREFIX_V1 = "learning-v2/course-session-audio-release-extension-objects";
exports.LEARNING_V2_COURSE_SESSION_AUDIO_EXTENSION_MAX_BYTES_V1 = 64 * 1024;
const HASH_RE = /^[a-f0-9]{64}$/u;
const GENERATION_RE = /^[1-9][0-9]{0,30}$/u;
const ROOT_KEYS = Object.freeze([
    "schemaVersion",
    "releaseId",
    "lessonId",
    "lessonOrdinal",
    "courseSessionId",
    "sessionOrdinal",
    "basePackageFingerprint",
    "baseChildSetFingerprint",
    "learnerFingerprint",
    "audioFingerprint",
    "audioChildPin",
    "extensionModel",
    "playbackTransport",
    "serverRequestPerPlayback",
    "remoteTtsFallbackDuringSession",
    "answerPayload",
    "correctnessAuthority",
    "repositoryOriginAuthority",
    "storageAuthority",
    "runtimeAuthority",
    "publicationAuthority",
    "releaseAuthority",
    "extensionFingerprint",
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
    throw new Error("learning_v2_course_session_audio_release_extension_invalid");
}
function record(value) {
    return (typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype);
}
function exactKeys(value, expected) {
    const keys = Object.keys(value);
    if (keys.length !== expected.length ||
        keys.some((key) => !expected.includes(key)))
        fail();
}
function bodyWithoutFingerprint(value) {
    const { extensionFingerprint: _ignored, ...body } = value;
    return body;
}
function learningV2CourseSessionAudioChildObjectPathV1(input) {
    if (!record(input) ||
        Object.keys(input).sort().join("|") !==
            "audioFingerprint|basePackageFingerprint|contentHash|courseSessionId|lessonId|releaseId" ||
        !HASH_RE.test(input.basePackageFingerprint) ||
        !HASH_RE.test(input.audioFingerprint) ||
        !HASH_RE.test(input.contentHash))
        fail();
    const releaseCoordinate = (0, decision_registry_1.sha256Utf8)(input.releaseId);
    const lessonCoordinate = (0, decision_registry_1.sha256Utf8)(input.lessonId);
    const sessionCoordinate = (0, decision_registry_1.sha256Utf8)(input.courseSessionId);
    return `${exports.LEARNING_V2_COURSE_SESSION_AUDIO_EXTENSION_PREFIX_V1}/${releaseCoordinate}/${lessonCoordinate}/${sessionCoordinate}/${input.basePackageFingerprint}/${input.audioFingerprint}/${input.contentHash}.json`;
}
function learningV2CourseSessionAudioReleaseExtensionObjectPathV1(input) {
    if (!record(input) ||
        Object.keys(input).sort().join("|") !==
            "courseSessionId|extensionFingerprint|lessonId|rawHash|releaseId" ||
        !HASH_RE.test(input.extensionFingerprint) ||
        !HASH_RE.test(input.rawHash))
        fail();
    return `${exports.LEARNING_V2_COURSE_SESSION_AUDIO_RELEASE_EXTENSION_OBJECT_PREFIX_V1}/${(0, decision_registry_1.sha256Utf8)(input.releaseId)}/${(0, decision_registry_1.sha256Utf8)(input.lessonId)}/${(0, decision_registry_1.sha256Utf8)(input.courseSessionId)}/${input.extensionFingerprint}/${input.rawHash}.json`;
}
function validate(value) {
    if (!record(value))
        fail();
    exactKeys(value, ROOT_KEYS);
    if (!record(value.audioChildPin))
        fail();
    exactKeys(value.audioChildPin, PIN_KEYS);
    const candidate = value;
    if (candidate.schemaVersion !==
        exports.LEARNING_V2_COURSE_SESSION_AUDIO_RELEASE_EXTENSION_SCHEMA_V1 ||
        !HASH_RE.test(candidate.basePackageFingerprint) ||
        !HASH_RE.test(candidate.baseChildSetFingerprint) ||
        !HASH_RE.test(candidate.learnerFingerprint) ||
        !HASH_RE.test(candidate.audioFingerprint) ||
        !HASH_RE.test(candidate.audioChildPin.contentHash) ||
        !GENERATION_RE.test(candidate.audioChildPin.objectGeneration) ||
        !Number.isSafeInteger(candidate.audioChildPin.byteSize) ||
        candidate.audioChildPin.byteSize < 2 ||
        candidate.audioChildPin.byteSize > 4 * 1024 * 1024 ||
        candidate.audioChildPin.contentType !== "application/json; charset=utf-8" ||
        candidate.audioChildPin.objectPath !==
            learningV2CourseSessionAudioChildObjectPathV1({
                releaseId: candidate.releaseId,
                lessonId: candidate.lessonId,
                courseSessionId: candidate.courseSessionId,
                basePackageFingerprint: candidate.basePackageFingerprint,
                audioFingerprint: candidate.audioFingerprint,
                contentHash: candidate.audioChildPin.contentHash,
            }) ||
        candidate.extensionModel !==
            "additive_audio_child_does_not_mutate_base_package_v1" ||
        candidate.playbackTransport !==
            "local_file_only_after_generation_pinned_readback" ||
        candidate.serverRequestPerPlayback !== false ||
        candidate.remoteTtsFallbackDuringSession !== false ||
        candidate.answerPayload !== "absent_by_exact_schema" ||
        candidate.correctnessAuthority !== "none" ||
        candidate.repositoryOriginAuthority !==
            "none_active_release_join_required" ||
        candidate.storageAuthority !== "none_generation_pinned_readback_required" ||
        candidate.runtimeAuthority !== "none_active_release_join_required" ||
        candidate.publicationAuthority !== "none" ||
        candidate.releaseAuthority !== false ||
        candidate.extensionFingerprint !==
            (0, decision_registry_1.hashCanonicalBody)(bodyWithoutFingerprint(candidate)))
        fail();
    const result = Object.freeze({
        ...candidate,
        audioChildPin: Object.freeze({ ...candidate.audioChildPin }),
    });
    handles.add(result);
    return result;
}
function materializeLearningV2CourseSessionAudioReleaseExtensionV1(input) {
    if (!record(input) ||
        Object.keys(input).sort().join("|") !==
            "audio|audioChildObjectGeneration|learner|package" ||
        !(0, course_session_release_package_v1_1.isLearningV2CourseSessionReleasePackageV1)(input.package) ||
        !(0, course_session_client_children_v1_1.isLearningV2CourseSessionLearnerChildV1)(input.learner) ||
        !(0, course_session_audio_child_v1_1.isLearningV2CourseSessionAudioChildV1)(input.audio) ||
        input.package.courseSessionId !== input.learner.courseSessionId ||
        input.audio.courseSessionId !== input.package.courseSessionId ||
        input.audio.learnerFingerprint !== input.learner.learnerFingerprint ||
        !GENERATION_RE.test(input.audioChildObjectGeneration))
        fail();
    const audioRaw = (0, course_session_audio_child_v1_1.encodeLearningV2CourseSessionAudioChildV1)(input.audio);
    const contentHash = (0, decision_registry_1.sha256Utf8)(audioRaw);
    const audioChildPin = Object.freeze({
        objectPath: learningV2CourseSessionAudioChildObjectPathV1({
            releaseId: input.package.releaseId,
            lessonId: input.package.lessonId,
            courseSessionId: input.package.courseSessionId,
            basePackageFingerprint: input.package.packageFingerprint,
            audioFingerprint: input.audio.audioFingerprint,
            contentHash,
        }),
        contentHash,
        objectGeneration: input.audioChildObjectGeneration,
        byteSize: (0, decision_registry_1.utf8ByteLengthV1)(audioRaw),
        contentType: "application/json; charset=utf-8",
    });
    const body = {
        schemaVersion: exports.LEARNING_V2_COURSE_SESSION_AUDIO_RELEASE_EXTENSION_SCHEMA_V1,
        releaseId: input.package.releaseId,
        lessonId: input.package.lessonId,
        lessonOrdinal: input.package.lessonOrdinal,
        courseSessionId: input.package.courseSessionId,
        sessionOrdinal: input.package.sessionOrdinal,
        basePackageFingerprint: input.package.packageFingerprint,
        baseChildSetFingerprint: input.package.childSetFingerprint,
        learnerFingerprint: input.learner.learnerFingerprint,
        audioFingerprint: input.audio.audioFingerprint,
        audioChildPin,
        extensionModel: "additive_audio_child_does_not_mutate_base_package_v1",
        playbackTransport: "local_file_only_after_generation_pinned_readback",
        serverRequestPerPlayback: false,
        remoteTtsFallbackDuringSession: false,
        answerPayload: "absent_by_exact_schema",
        correctnessAuthority: "none",
        repositoryOriginAuthority: "none_active_release_join_required",
        storageAuthority: "none_generation_pinned_readback_required",
        runtimeAuthority: "none_active_release_join_required",
        publicationAuthority: "none",
        releaseAuthority: false,
    };
    return validate({ ...body, extensionFingerprint: (0, decision_registry_1.hashCanonicalBody)(body) });
}
function parseLearningV2CourseSessionAudioReleaseExtensionV1(raw) {
    if (typeof raw !== "string" ||
        raw.length > exports.LEARNING_V2_COURSE_SESSION_AUDIO_EXTENSION_MAX_BYTES_V1 ||
        (0, decision_registry_1.utf8ByteLengthV1)(raw) >
            exports.LEARNING_V2_COURSE_SESSION_AUDIO_EXTENSION_MAX_BYTES_V1)
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
function encodeLearningV2CourseSessionAudioReleaseExtensionV1(value) {
    if (!handles.has(value))
        fail();
    return (0, decision_registry_1.canonicalJsonV1)(value);
}
function isLearningV2CourseSessionAudioReleaseExtensionV1(value) {
    return typeof value === "object" && value !== null && handles.has(value);
}
//# sourceMappingURL=course_session_audio_release_extension_v1.js.map