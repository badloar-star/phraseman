"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_COURSE_RELEASED_SESSION_SUMMARY_SCHEMA_V2 = void 0;
exports.loadV2CourseReleasedSessionBaseMaterialV2 = loadV2CourseReleasedSessionBaseMaterialV2;
exports.createV2CourseReleasedSessionAdapterV2 = createV2CourseReleasedSessionAdapterV2;
exports.createFirebaseAdminV2CourseReleasedSessionAdapterV2 = createFirebaseAdminV2CourseReleasedSessionAdapterV2;
exports.isV2CourseReleasedSessionHandleV2 = isV2CourseReleasedSessionHandleV2;
exports.getV2CourseReleasedSessionSummaryV2 = getV2CourseReleasedSessionSummaryV2;
exports.resolveV2CourseReleasedSessionLearnerMaterialV2 = resolveV2CourseReleasedSessionLearnerMaterialV2;
const node_crypto_1 = require("node:crypto");
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const course_lesson_release_index_v1_1 = require("../../../modules/learning-v2/runtime/course_lesson_release_index_v1");
const course_session_release_package_v1_1 = require("../../../modules/learning-v2/runtime/course_session_release_package_v1");
const course_session_readback_v1_1 = require("../../../modules/learning-v2/runtime/course_session_readback_v1");
const course_session_client_children_v1_1 = require("../../../modules/learning-v2/runtime/course_session_client_children_v1");
const course_session_evaluator_capsule_child_v1_1 = require("../../../modules/learning-v2/runtime/course_session_evaluator_capsule_child_v1");
const course_topology_v1_1 = require("../../../modules/learning-v2/content/course_topology_v1");
const v2_firebase_admin_repository_io_v1_1 = require("./v2_firebase_admin_repository_io_v1");
const v2_unified_course_release_repository_v2_1 = require("./v2_unified_course_release_repository_v2");
const v2_unified_course_release_v2_1 = require("./v2_unified_course_release_v2");
exports.V2_COURSE_RELEASED_SESSION_SUMMARY_SCHEMA_V2 = "v2-course-released-session-summary.v2";
const handles = new WeakSet();
const materials = new WeakMap();
function fail(code) {
    throw new Error(`v2_course_released_session_${code}`);
}
function sha256Bytes(bytes) {
    return (0, node_crypto_1.createHash)("sha256").update(bytes).digest("hex");
}
async function readExactJson(storage, pin, maximumBytes) {
    if (pin.byteSize > maximumBytes)
        fail("pin_oversize");
    const metadata = await storage.readMetadataExact(pin.objectPath);
    if (!metadata ||
        metadata.generation !== pin.objectGeneration ||
        metadata.byteSize !== pin.byteSize ||
        metadata.contentHash !== pin.contentHash ||
        metadata.contentType !== pin.contentType)
        fail("metadata_mismatch");
    const result = await storage.downloadGenerationExact({
        objectPath: pin.objectPath,
        ifGenerationMatch: pin.objectGeneration,
        maximumBytes,
    });
    if (result.kind !== "downloaded" ||
        !(result.bytes instanceof Uint8Array) ||
        result.bytes.byteLength !== pin.byteSize ||
        sha256Bytes(result.bytes) !== pin.contentHash)
        fail("bytes_mismatch");
    try {
        return new TextDecoder("utf-8", { fatal: true }).decode(result.bytes);
    }
    catch {
        fail("utf8_invalid");
    }
}
function exactOrdinal(value, max) {
    if (!Number.isSafeInteger(value) || value < 1 || value > max)
        fail("coordinate_invalid");
    return value;
}
/**
 * Shared exact base-session loader. The v2 adapter and the composite v3 audio
 * adapter use the same package/child readback and learner projection rules.
 * It does not mint an active-release handle and therefore cannot create
 * repository authority by itself.
 */
async function loadV2CourseReleasedSessionBaseMaterialV2(input) {
    const lessonOrdinal = exactOrdinal(input.lessonOrdinal, course_topology_v1_1.LEARNING_V2_COURSE_LESSON_COUNT_V1);
    const sessionOrdinal = exactOrdinal(input.sessionOrdinal, course_topology_v1_1.LEARNING_V2_LESSON_SESSION_COUNT_V1);
    const lessonRoot = input.root.lessons[lessonOrdinal - 1];
    if (!lessonRoot ||
        lessonRoot.lessonId !== (0, course_topology_v1_1.learningV2CourseLessonIdV1)(lessonOrdinal))
        fail("lesson_missing");
    const indexRaw = await readExactJson(input.storage, lessonRoot.lessonIndexObject, course_lesson_release_index_v1_1.LEARNING_V2_COURSE_LESSON_RELEASE_INDEX_MAX_BYTES_V1);
    const index = (0, course_lesson_release_index_v1_1.parseLearningV2CourseLessonReleaseIndexV1)(indexRaw);
    const expectedIndexPath = (0, v2_unified_course_release_v2_1.v2UnifiedCourseLessonIndexObjectPathV2)({
        releaseId: input.root.releaseId,
        lessonId: index.lessonId,
        indexFingerprint: index.indexFingerprint,
        rawHash: sha256Bytes(new TextEncoder().encode(indexRaw)),
    });
    if ((0, course_lesson_release_index_v1_1.encodeLearningV2CourseLessonReleaseIndexV1)(index) !== indexRaw ||
        index.releaseId !== input.root.releaseId ||
        index.lessonOrdinal !== lessonOrdinal ||
        index.lessonId !== lessonRoot.lessonId ||
        index.indexFingerprint !== lessonRoot.lessonIndexFingerprint ||
        index.ownerLessonFingerprint !== lessonRoot.ownerLessonFingerprint ||
        index.ownerConfirmationFingerprint !==
            lessonRoot.ownerConfirmationFingerprint ||
        index.sessionSetFingerprint !== lessonRoot.sessionSetFingerprint ||
        lessonRoot.lessonIndexObject.objectPath !== expectedIndexPath)
        fail("lesson_index_join_mismatch");
    const sessionRow = index.sessions[sessionOrdinal - 1];
    if (!sessionRow ||
        sessionRow.courseSessionId !==
            (0, course_topology_v1_1.learningV2CourseSessionIdV1)(lessonOrdinal, sessionOrdinal))
        fail("session_missing");
    const packageRaw = await readExactJson(input.storage, sessionRow.packagePin, course_session_release_package_v1_1.LEARNING_V2_COURSE_SESSION_RELEASE_PACKAGE_MAX_BYTES_V1);
    const sessionPackage = (0, course_session_release_package_v1_1.parseLearningV2CourseSessionReleasePackageV1)(packageRaw);
    if ((0, course_session_release_package_v1_1.encodeLearningV2CourseSessionReleasePackageV1)(sessionPackage) !==
        packageRaw ||
        sessionPackage.packageFingerprint !== sessionRow.packageFingerprint)
        fail("package_join_mismatch");
    const readbackHandle = await (0, course_session_readback_v1_1.loadLearningV2CourseSessionReadbackV1)({
        index,
        package: sessionPackage,
        packageRaw,
        reader: {
            readExact: async (pin) => {
                const raw = await readExactJson(input.storage, pin, pin.byteSize);
                return Object.freeze({
                    raw,
                    objectGeneration: pin.objectGeneration,
                    byteSize: pin.byteSize,
                    contentHash: pin.contentHash,
                    contentType: pin.contentType,
                });
            },
        },
    });
    const readback = (0, course_session_readback_v1_1.getLearningV2CourseSessionReadbackSummaryV1)(readbackHandle);
    const learner = (0, course_session_readback_v1_1.resolveLearningV2CourseSessionLearnerMaterialV1)(readbackHandle);
    const introChild = (0, course_session_client_children_v1_1.parseLearningV2CourseSessionIntroChildV1)(learner.introRaw);
    const learnerChild = (0, course_session_client_children_v1_1.parseLearningV2CourseSessionLearnerChildV1)(learner.learnerRaw);
    const evaluatorCapsuleChild = (0, course_session_evaluator_capsule_child_v1_1.parseLearningV2CourseSessionEvaluatorCapsuleChildV1)(learner.evaluatorCapsuleRaw);
    const auxiliaryChild = (0, course_session_client_children_v1_1.parseLearningV2CourseSessionAuxiliaryChildV1)(learner.auxiliaryRaw);
    const allInteractionIds = [
        ...introChild.pages.map((page) => page.question.interactionId),
        ...learnerChild.interactions.map((interaction) => interaction.interactionId),
    ];
    if (introChild.courseSessionId !== sessionPackage.courseSessionId ||
        learnerChild.courseSessionId !== sessionPackage.courseSessionId ||
        evaluatorCapsuleChild.courseSessionId !== sessionPackage.courseSessionId ||
        auxiliaryChild.courseSessionId !== sessionPackage.courseSessionId ||
        (0, decision_registry_1.canonicalJsonV1)(introChild.learningOutcomeByLocale) !==
            (0, decision_registry_1.canonicalJsonV1)(sessionPackage.learningOutcomeByLocale) ||
        learnerChild.interactionProfile !== sessionPackage.interactionProfile ||
        learnerChild.practiceInteractionCount + 3 !==
            sessionPackage.plannedPrimaryInteractionCount ||
        (0, decision_registry_1.canonicalJsonV1)(allInteractionIds) !==
            (0, decision_registry_1.canonicalJsonV1)(sessionPackage.interactionIds) ||
        (0, decision_registry_1.canonicalJsonV1)(auxiliaryChild.entries.map((entry) => entry.interactionId)) !== (0, decision_registry_1.canonicalJsonV1)(sessionPackage.interactionIds) ||
        (0, decision_registry_1.canonicalJsonV1)(evaluatorCapsuleChild.entries.map((entry) => entry.interactionId)) !== (0, decision_registry_1.canonicalJsonV1)(sessionPackage.interactionIds))
        fail("client_child_join_mismatch");
    const summary = Object.freeze({
        schemaVersion: exports.V2_COURSE_RELEASED_SESSION_SUMMARY_SCHEMA_V2,
        releaseId: input.root.releaseId,
        activeRootFingerprint: input.activeRootFingerprint,
        activeHeadFingerprint: input.activeHeadFingerprint,
        topologyFingerprint: input.root.topologyFingerprint,
        lessonId: index.lessonId,
        lessonOrdinal,
        lessonIndexFingerprint: index.indexFingerprint,
        courseSessionId: sessionPackage.courseSessionId,
        sessionOrdinal,
        packageFingerprint: sessionPackage.packageFingerprint,
        childSetFingerprint: sessionPackage.childSetFingerprint,
        learningOutcomeAvailable: true,
        introQuestionPolicy: "one_embedded_question_per_intro_page_no_post_intro_duplicate",
        activeReleaseBinding: input.activeReleaseBinding,
        storageIntegrity: "exact_generation_hash_size_content_type_readback",
        learnerProjection: "intro_learner_capsule_auxiliary_only",
        evaluatorIsolation: "server_sidecar_not_exposed",
        repositoryOriginAuthority: input.repositoryOriginAuthority,
        runtimeAuthority: "active_release_session_projection_only",
        walletAuthority: "none",
        masteryAuthority: "none",
        evidenceAuthority: "none",
        completionAuthority: "none",
        releaseAuthority: false,
    });
    return Object.freeze({
        summary,
        readback,
        learner,
        introChild,
        learnerChild,
        evaluatorCapsuleChild,
        auxiliaryChild,
        evaluatorSidecarRawExposed: false,
    });
}
function createV2CourseReleasedSessionAdapterV2(input) {
    if (!input || typeof input !== "object" || !input.storage)
        fail("ports_invalid");
    const { storage } = input;
    return Object.freeze({
        load: async (request) => {
            if (!(0, v2_unified_course_release_repository_v2_1.isV2UnifiedCourseReleaseActiveHandleV2)(request.activeHandle))
                fail("active_handle_invalid");
            const lessonOrdinal = exactOrdinal(request.lessonOrdinal, course_topology_v1_1.LEARNING_V2_COURSE_LESSON_COUNT_V1);
            const sessionOrdinal = exactOrdinal(request.sessionOrdinal, course_topology_v1_1.LEARNING_V2_LESSON_SESSION_COUNT_V1);
            const active = (0, v2_unified_course_release_repository_v2_1.resolveV2UnifiedCourseReleaseActiveMaterialV2)(request.activeHandle);
            const lessonRoot = active.root.lessons[lessonOrdinal - 1];
            if (!lessonRoot ||
                lessonRoot.lessonId !== (0, course_topology_v1_1.learningV2CourseLessonIdV1)(lessonOrdinal))
                fail("lesson_missing");
            const indexRaw = await readExactJson(storage, lessonRoot.lessonIndexObject, course_lesson_release_index_v1_1.LEARNING_V2_COURSE_LESSON_RELEASE_INDEX_MAX_BYTES_V1);
            const index = (0, course_lesson_release_index_v1_1.parseLearningV2CourseLessonReleaseIndexV1)(indexRaw);
            const expectedIndexPath = (0, v2_unified_course_release_v2_1.v2UnifiedCourseLessonIndexObjectPathV2)({
                releaseId: active.root.releaseId,
                lessonId: index.lessonId,
                indexFingerprint: index.indexFingerprint,
                rawHash: sha256Bytes(new TextEncoder().encode(indexRaw)),
            });
            if ((0, course_lesson_release_index_v1_1.encodeLearningV2CourseLessonReleaseIndexV1)(index) !== indexRaw ||
                index.releaseId !== active.root.releaseId ||
                index.lessonOrdinal !== lessonOrdinal ||
                index.lessonId !== lessonRoot.lessonId ||
                index.indexFingerprint !== lessonRoot.lessonIndexFingerprint ||
                index.ownerLessonFingerprint !== lessonRoot.ownerLessonFingerprint ||
                index.ownerConfirmationFingerprint !==
                    lessonRoot.ownerConfirmationFingerprint ||
                index.sessionSetFingerprint !== lessonRoot.sessionSetFingerprint ||
                lessonRoot.lessonIndexObject.objectPath !== expectedIndexPath)
                fail("lesson_index_join_mismatch");
            const sessionRow = index.sessions[sessionOrdinal - 1];
            if (!sessionRow ||
                sessionRow.courseSessionId !==
                    (0, course_topology_v1_1.learningV2CourseSessionIdV1)(lessonOrdinal, sessionOrdinal))
                fail("session_missing");
            const packageRaw = await readExactJson(storage, sessionRow.packagePin, course_session_release_package_v1_1.LEARNING_V2_COURSE_SESSION_RELEASE_PACKAGE_MAX_BYTES_V1);
            const sessionPackage = (0, course_session_release_package_v1_1.parseLearningV2CourseSessionReleasePackageV1)(packageRaw);
            if ((0, course_session_release_package_v1_1.encodeLearningV2CourseSessionReleasePackageV1)(sessionPackage) !==
                packageRaw ||
                sessionPackage.packageFingerprint !== sessionRow.packageFingerprint)
                fail("package_join_mismatch");
            const readbackHandle = await (0, course_session_readback_v1_1.loadLearningV2CourseSessionReadbackV1)({
                index,
                package: sessionPackage,
                packageRaw,
                reader: {
                    readExact: async (pin) => {
                        const raw = await readExactJson(storage, pin, pin.byteSize);
                        return Object.freeze({
                            raw,
                            objectGeneration: pin.objectGeneration,
                            byteSize: pin.byteSize,
                            contentHash: pin.contentHash,
                            contentType: pin.contentType,
                        });
                    },
                },
            });
            const readback = (0, course_session_readback_v1_1.getLearningV2CourseSessionReadbackSummaryV1)(readbackHandle);
            const learner = (0, course_session_readback_v1_1.resolveLearningV2CourseSessionLearnerMaterialV1)(readbackHandle);
            const introChild = (0, course_session_client_children_v1_1.parseLearningV2CourseSessionIntroChildV1)(learner.introRaw);
            const learnerChild = (0, course_session_client_children_v1_1.parseLearningV2CourseSessionLearnerChildV1)(learner.learnerRaw);
            const evaluatorCapsuleChild = (0, course_session_evaluator_capsule_child_v1_1.parseLearningV2CourseSessionEvaluatorCapsuleChildV1)(learner.evaluatorCapsuleRaw);
            const auxiliaryChild = (0, course_session_client_children_v1_1.parseLearningV2CourseSessionAuxiliaryChildV1)(learner.auxiliaryRaw);
            const allInteractionIds = [
                ...introChild.pages.map((page) => page.question.interactionId),
                ...learnerChild.interactions.map((interaction) => interaction.interactionId),
            ];
            if (introChild.courseSessionId !== sessionPackage.courseSessionId ||
                learnerChild.courseSessionId !== sessionPackage.courseSessionId ||
                evaluatorCapsuleChild.courseSessionId !==
                    sessionPackage.courseSessionId ||
                auxiliaryChild.courseSessionId !== sessionPackage.courseSessionId ||
                (0, decision_registry_1.canonicalJsonV1)(introChild.learningOutcomeByLocale) !==
                    (0, decision_registry_1.canonicalJsonV1)(sessionPackage.learningOutcomeByLocale) ||
                learnerChild.interactionProfile !== sessionPackage.interactionProfile ||
                learnerChild.practiceInteractionCount + 3 !==
                    sessionPackage.plannedPrimaryInteractionCount ||
                (0, decision_registry_1.canonicalJsonV1)(allInteractionIds) !==
                    (0, decision_registry_1.canonicalJsonV1)(sessionPackage.interactionIds) ||
                (0, decision_registry_1.canonicalJsonV1)(auxiliaryChild.entries.map((entry) => entry.interactionId)) !== (0, decision_registry_1.canonicalJsonV1)(sessionPackage.interactionIds) ||
                (0, decision_registry_1.canonicalJsonV1)(evaluatorCapsuleChild.entries.map((entry) => entry.interactionId)) !== (0, decision_registry_1.canonicalJsonV1)(sessionPackage.interactionIds))
                fail("client_child_join_mismatch");
            const summary = Object.freeze({
                schemaVersion: exports.V2_COURSE_RELEASED_SESSION_SUMMARY_SCHEMA_V2,
                releaseId: active.root.releaseId,
                activeRootFingerprint: active.root.rootFingerprint,
                activeHeadFingerprint: active.head.headFingerprint,
                topologyFingerprint: active.root.topologyFingerprint,
                lessonId: index.lessonId,
                lessonOrdinal,
                lessonIndexFingerprint: index.indexFingerprint,
                courseSessionId: sessionPackage.courseSessionId,
                sessionOrdinal,
                packageFingerprint: sessionPackage.packageFingerprint,
                childSetFingerprint: sessionPackage.childSetFingerprint,
                learningOutcomeAvailable: true,
                introQuestionPolicy: "one_embedded_question_per_intro_page_no_post_intro_duplicate",
                activeReleaseBinding: "exact_v2_head_root_lesson_index_session_package_join",
                storageIntegrity: "exact_generation_hash_size_content_type_readback",
                learnerProjection: "intro_learner_capsule_auxiliary_only",
                evaluatorIsolation: "server_sidecar_not_exposed",
                repositoryOriginAuthority: "active_v2_repository_head_and_generation_pinned_objects",
                runtimeAuthority: "active_release_session_projection_only",
                walletAuthority: "none",
                masteryAuthority: "none",
                evidenceAuthority: "none",
                completionAuthority: "none",
                releaseAuthority: false,
            });
            const handle = Object.freeze({
                kind: "v2_course_released_session_handle_v2",
            });
            const material = Object.freeze({
                summary,
                readback,
                learner,
                introChild,
                learnerChild,
                evaluatorCapsuleChild,
                auxiliaryChild,
                evaluatorSidecarRawExposed: false,
            });
            handles.add(handle);
            materials.set(handle, material);
            return handle;
        },
    });
}
function createFirebaseAdminV2CourseReleasedSessionAdapterV2() {
    const io = (0, v2_firebase_admin_repository_io_v1_1.createV2FirebaseAdminRepositoryIoV1)();
    return createV2CourseReleasedSessionAdapterV2({ storage: io.storage });
}
function isV2CourseReleasedSessionHandleV2(value) {
    return typeof value === "object" && value !== null && handles.has(value);
}
function getV2CourseReleasedSessionSummaryV2(handle) {
    const material = materials.get(handle);
    if (!material || !handles.has(handle))
        fail("handle_invalid");
    return material.summary;
}
function resolveV2CourseReleasedSessionLearnerMaterialV2(handle) {
    const material = materials.get(handle);
    if (!material || !handles.has(handle))
        fail("handle_invalid");
    return material;
}
//# sourceMappingURL=v2_course_released_session_adapter_v2.js.map