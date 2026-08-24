"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_COURSE_RELEASED_SESSION_SUMMARY_SCHEMA_V3 = void 0;
exports.createV2CourseReleasedSessionAdapterV3 = createV2CourseReleasedSessionAdapterV3;
exports.createFirebaseAdminV2CourseReleasedSessionAdapterV3 = createFirebaseAdminV2CourseReleasedSessionAdapterV3;
exports.isV2CourseReleasedSessionHandleV3 = isV2CourseReleasedSessionHandleV3;
exports.getV2CourseReleasedSessionSummaryV3 = getV2CourseReleasedSessionSummaryV3;
exports.resolveV2CourseReleasedSessionLearnerMaterialV3 = resolveV2CourseReleasedSessionLearnerMaterialV3;
const node_crypto_1 = require("node:crypto");
const course_topology_v1_1 = require("../../../modules/learning-v2/content/course_topology_v1");
const course_session_audio_child_v1_1 = require("../../../modules/learning-v2/runtime/course_session_audio_child_v1");
const course_session_audio_release_extension_v1_1 = require("../../../modules/learning-v2/runtime/course_session_audio_release_extension_v1");
const v2_firebase_admin_repository_io_v1_1 = require("./v2_firebase_admin_repository_io_v1");
const v2_course_released_session_adapter_v2_1 = require("./v2_course_released_session_adapter_v2");
const v2_unified_course_release_repository_v3_1 = require("./v2_unified_course_release_repository_v3");
exports.V2_COURSE_RELEASED_SESSION_SUMMARY_SCHEMA_V3 = "v2-course-released-session-summary.v3";
const handles = new WeakSet();
const materials = new WeakMap();
function fail(code) {
    throw new Error(`v2_course_released_session_v3_${code}`);
}
function exactOrdinal(value, maximum) {
    if (!Number.isSafeInteger(value) || value < 1 || value > maximum)
        fail("coordinate_invalid");
    return value;
}
function sha256Bytes(bytes) {
    return (0, node_crypto_1.createHash)("sha256").update(bytes).digest("hex");
}
async function readExactJson(storage, pin, maximumBytes, kind) {
    if (pin.byteSize < 2 || pin.byteSize > maximumBytes)
        fail(`${kind}_pin_oversize`);
    const metadata = await storage.readMetadataExact(pin.objectPath);
    if (!metadata ||
        metadata.generation !== pin.objectGeneration ||
        metadata.byteSize !== pin.byteSize ||
        metadata.contentHash !== pin.contentHash ||
        metadata.contentType !== pin.contentType)
        fail(`${kind}_metadata_mismatch`);
    const result = await storage.downloadGenerationExact({
        objectPath: pin.objectPath,
        ifGenerationMatch: pin.objectGeneration,
        maximumBytes,
    });
    if (result.kind !== "downloaded" ||
        !(result.bytes instanceof Uint8Array) ||
        result.bytes.byteLength !== pin.byteSize ||
        sha256Bytes(result.bytes) !== pin.contentHash)
        fail(`${kind}_bytes_mismatch`);
    try {
        return new TextDecoder("utf-8", { fatal: true }).decode(result.bytes);
    }
    catch {
        fail(`${kind}_utf8_invalid`);
    }
}
function createV2CourseReleasedSessionAdapterV3(input) {
    if (!input || typeof input !== "object" || !input.storage)
        fail("ports_invalid");
    const { storage } = input;
    return Object.freeze({
        load: async (request) => {
            if (!(0, v2_unified_course_release_repository_v3_1.isV2UnifiedCourseReleaseActiveHandleV3)(request.activeHandle))
                fail("active_handle_invalid");
            const lessonOrdinal = exactOrdinal(request.lessonOrdinal, course_topology_v1_1.LEARNING_V2_COURSE_LESSON_COUNT_V1);
            const sessionOrdinal = exactOrdinal(request.sessionOrdinal, course_topology_v1_1.LEARNING_V2_LESSON_SESSION_COUNT_V1);
            const active = (0, v2_unified_course_release_repository_v3_1.resolveV2UnifiedCourseReleaseActiveMaterialV3)(request.activeHandle);
            const expectedLessonId = (0, course_topology_v1_1.learningV2CourseLessonIdV1)(lessonOrdinal);
            const expectedCourseSessionId = (0, course_topology_v1_1.learningV2CourseSessionIdV1)(lessonOrdinal, sessionOrdinal);
            const rootLesson = active.root.lessons[lessonOrdinal - 1];
            const audioIndex = active.audioIndexes[lessonOrdinal - 1];
            if (!rootLesson ||
                !audioIndex ||
                rootLesson.lessonId !== expectedLessonId ||
                audioIndex.lessonId !== expectedLessonId ||
                audioIndex.lessonOrdinal !== lessonOrdinal ||
                audioIndex.indexFingerprint !== rootLesson.audioIndexFingerprint)
                fail("audio_lesson_missing");
            const base = await (0, v2_course_released_session_adapter_v2_1.loadV2CourseReleasedSessionBaseMaterialV2)({
                storage,
                root: active.baseRoot,
                activeRootFingerprint: active.root.rootFingerprint,
                activeHeadFingerprint: active.head.headFingerprint,
                lessonOrdinal,
                sessionOrdinal,
                activeReleaseBinding: "exact_v3_composite_head_base_root_lesson_index_session_package_join",
                repositoryOriginAuthority: "active_v3_composite_repository_head_and_generation_pinned_objects",
            });
            const audioSession = audioIndex.sessions[sessionOrdinal - 1];
            if (!audioSession ||
                audioSession.courseSessionId !== expectedCourseSessionId ||
                audioSession.basePackageFingerprint !==
                    base.summary.packageFingerprint ||
                audioSession.baseChildSetFingerprint !==
                    base.summary.childSetFingerprint ||
                audioSession.learnerFingerprint !== base.learnerChild.learnerFingerprint)
                fail("audio_session_join_mismatch");
            const extensionRaw = await readExactJson(storage, audioSession.extensionPin, course_session_audio_release_extension_v1_1.LEARNING_V2_COURSE_SESSION_AUDIO_EXTENSION_MAX_BYTES_V1, "audio_extension");
            const extension = (0, course_session_audio_release_extension_v1_1.parseLearningV2CourseSessionAudioReleaseExtensionV1)(extensionRaw);
            const expectedExtensionPath = (0, course_session_audio_release_extension_v1_1.learningV2CourseSessionAudioReleaseExtensionObjectPathV1)({
                releaseId: active.root.releaseId,
                lessonId: expectedLessonId,
                courseSessionId: expectedCourseSessionId,
                extensionFingerprint: extension.extensionFingerprint,
                rawHash: sha256Bytes(new TextEncoder().encode(extensionRaw)),
            });
            if ((0, course_session_audio_release_extension_v1_1.encodeLearningV2CourseSessionAudioReleaseExtensionV1)(extension) !==
                extensionRaw ||
                audioSession.extensionPin.objectPath !== expectedExtensionPath ||
                extension.releaseId !== active.root.releaseId ||
                extension.lessonId !== expectedLessonId ||
                extension.lessonOrdinal !== lessonOrdinal ||
                extension.courseSessionId !== expectedCourseSessionId ||
                extension.sessionOrdinal !== sessionOrdinal ||
                extension.basePackageFingerprint !== base.summary.packageFingerprint ||
                extension.baseChildSetFingerprint !==
                    base.summary.childSetFingerprint ||
                extension.learnerFingerprint !== base.learnerChild.learnerFingerprint ||
                extension.audioFingerprint !== audioSession.audioFingerprint ||
                extension.extensionFingerprint !== audioSession.extensionFingerprint)
                fail("audio_extension_join_mismatch");
            const audioChildRaw = await readExactJson(storage, extension.audioChildPin, course_session_audio_child_v1_1.LEARNING_V2_COURSE_SESSION_AUDIO_CHILD_MAX_BYTES_V1, "audio_child");
            const audioChild = (0, course_session_audio_child_v1_1.parseLearningV2CourseSessionAudioChildV1)(audioChildRaw, base.learnerChild);
            if ((0, course_session_audio_child_v1_1.encodeLearningV2CourseSessionAudioChildV1)(audioChild) !==
                audioChildRaw ||
                audioChild.courseSessionId !== expectedCourseSessionId ||
                audioChild.learnerFingerprint !==
                    base.learnerChild.learnerFingerprint ||
                audioChild.audioFingerprint !== extension.audioFingerprint)
                fail("audio_child_join_mismatch");
            const summary = Object.freeze({
                schemaVersion: exports.V2_COURSE_RELEASED_SESSION_SUMMARY_SCHEMA_V3,
                releaseId: active.root.releaseId,
                activeRootFingerprint: active.root.rootFingerprint,
                activeBaseRootFingerprint: active.root.baseRootFingerprint,
                activeHeadFingerprint: active.head.headFingerprint,
                topologyFingerprint: active.root.topologyFingerprint,
                lessonId: expectedLessonId,
                lessonOrdinal,
                baseLessonIndexFingerprint: base.summary.lessonIndexFingerprint,
                audioLessonIndexFingerprint: audioIndex.indexFingerprint,
                courseSessionId: expectedCourseSessionId,
                sessionOrdinal,
                packageFingerprint: base.summary.packageFingerprint,
                childSetFingerprint: base.summary.childSetFingerprint,
                learnerFingerprint: base.learnerChild.learnerFingerprint,
                audioExtensionFingerprint: extension.extensionFingerprint,
                audioFingerprint: audioChild.audioFingerprint,
                baseProjectionBinding: "exact_v3_composite_head_base_root_lesson_index_session_package_join",
                audioProjectionBinding: "exact_v3_audio_index_extension_audio_child_join",
                storageIntegrity: "exact_generation_hash_size_content_type_readback",
                learnerProjection: "intro_learner_capsule_auxiliary_audio_child_only",
                evaluatorIsolation: "server_sidecar_not_exposed",
                playbackPreparation: "client_generation_pinned_mp3_prefetch_required_before_session",
                taskVoiceScope: "one_voice_per_interaction_for_phrase_and_words",
                serverRequestPerPlayback: false,
                remoteTtsFallbackDuringSession: false,
                answerPayload: "absent",
                correctnessAuthority: "local_device_only",
                serverAnswerAuthority: "none_answers_never_transported_or_rechecked",
                repositoryOriginAuthority: "active_v3_composite_repository_head_and_generation_pinned_objects",
                runtimeAuthority: "active_release_session_projection_only",
                walletAuthority: "none",
                masteryAuthority: "none",
                evidenceAuthority: "none",
                completionAuthority: "none",
                releaseAuthority: false,
            });
            const material = Object.freeze({
                summary,
                base,
                audioExtension: extension,
                audioChild,
                canonicalAudioChildRaw: audioChildRaw,
                evaluatorSidecarRawExposed: false,
                answerPayloadExposed: false,
            });
            const handle = Object.freeze({
                kind: "v2_course_released_session_handle_v3",
            });
            handles.add(handle);
            materials.set(handle, material);
            return handle;
        },
    });
}
function createFirebaseAdminV2CourseReleasedSessionAdapterV3() {
    const io = (0, v2_firebase_admin_repository_io_v1_1.createV2FirebaseAdminRepositoryIoV1)();
    return createV2CourseReleasedSessionAdapterV3({ storage: io.storage });
}
function isV2CourseReleasedSessionHandleV3(value) {
    return typeof value === "object" && value !== null && handles.has(value);
}
function getV2CourseReleasedSessionSummaryV3(handle) {
    const material = materials.get(handle);
    if (!material || !handles.has(handle))
        fail("handle_invalid");
    return material.summary;
}
function resolveV2CourseReleasedSessionLearnerMaterialV3(handle) {
    const material = materials.get(handle);
    if (!material || !handles.has(handle))
        fail("handle_invalid");
    return material;
}
//# sourceMappingURL=v2_course_released_session_adapter_v3.js.map