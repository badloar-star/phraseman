"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_COURSE_ACTIVE_CATALOG_MAX_READ_CONCURRENCY_V1 = void 0;
exports.createV2CourseActiveCatalogAdapterV1 = createV2CourseActiveCatalogAdapterV1;
exports.createFirebaseAdminV2CourseActiveCatalogAdapterV1 = createFirebaseAdminV2CourseActiveCatalogAdapterV1;
exports.isV2CourseActiveCatalogHandleV1 = isV2CourseActiveCatalogHandleV1;
exports.getV2CourseActiveCatalogSummaryV1 = getV2CourseActiveCatalogSummaryV1;
exports.resolveV2CourseActiveCatalogLearnerRawV1 = resolveV2CourseActiveCatalogLearnerRawV1;
const node_crypto_1 = require("node:crypto");
const course_lesson_release_index_v1_1 = require("../../../modules/learning-v2/runtime/course_lesson_release_index_v1");
const course_active_catalog_v1_1 = require("../../../modules/learning-v2/runtime/course_active_catalog_v1");
const generator_course_contract_1 = require("../../../modules/learning-v2/content/generator_course_contract");
const v2_firebase_admin_repository_io_v1_1 = require("./v2_firebase_admin_repository_io_v1");
const v2_unified_course_release_repository_v2_1 = require("./v2_unified_course_release_repository_v2");
const v2_unified_course_release_v2_1 = require("./v2_unified_course_release_v2");
exports.V2_COURSE_ACTIVE_CATALOG_MAX_READ_CONCURRENCY_V1 = 4;
const handles = new WeakSet();
const materials = new WeakMap();
function fail(code) {
    throw new Error(`v2_course_active_catalog_${code}`);
}
function sha256Bytes(bytes) {
    return (0, node_crypto_1.createHash)("sha256").update(bytes).digest("hex");
}
async function readIndex(storage, active, lessonIndex) {
    const rootLesson = active.root.lessons[lessonIndex];
    if (!rootLesson)
        fail("lesson_missing");
    const pin = rootLesson.lessonIndexObject;
    if (pin.byteSize > course_lesson_release_index_v1_1.LEARNING_V2_COURSE_LESSON_RELEASE_INDEX_MAX_BYTES_V1)
        fail("pin_oversize");
    const metadata = await storage.readMetadataExact(pin.objectPath);
    if (!metadata ||
        metadata.generation !== pin.objectGeneration ||
        metadata.byteSize !== pin.byteSize ||
        metadata.contentHash !== pin.contentHash ||
        metadata.contentType !== pin.contentType)
        fail("metadata_mismatch");
    const downloaded = await storage.downloadGenerationExact({
        objectPath: pin.objectPath,
        ifGenerationMatch: pin.objectGeneration,
        maximumBytes: course_lesson_release_index_v1_1.LEARNING_V2_COURSE_LESSON_RELEASE_INDEX_MAX_BYTES_V1,
    });
    if (downloaded.kind !== "downloaded" ||
        !(downloaded.bytes instanceof Uint8Array) ||
        downloaded.bytes.byteLength !== pin.byteSize ||
        sha256Bytes(downloaded.bytes) !== pin.contentHash)
        fail("bytes_mismatch");
    let raw;
    try {
        raw = new TextDecoder("utf-8", { fatal: true }).decode(downloaded.bytes);
    }
    catch {
        fail("utf8_invalid");
    }
    const index = (0, course_lesson_release_index_v1_1.parseLearningV2CourseLessonReleaseIndexV1)(raw);
    const expectedPath = (0, v2_unified_course_release_v2_1.v2UnifiedCourseLessonIndexObjectPathV2)({
        releaseId: active.root.releaseId,
        lessonId: index.lessonId,
        indexFingerprint: index.indexFingerprint,
        rawHash: sha256Bytes(downloaded.bytes),
    });
    if ((0, course_lesson_release_index_v1_1.encodeLearningV2CourseLessonReleaseIndexV1)(index) !== raw ||
        index.releaseId !== active.root.releaseId ||
        index.lessonOrdinal !== rootLesson.lessonOrdinal ||
        index.lessonId !== rootLesson.lessonId ||
        index.indexFingerprint !== rootLesson.lessonIndexFingerprint ||
        index.ownerLessonFingerprint !== rootLesson.ownerLessonFingerprint ||
        index.ownerConfirmationFingerprint !==
            rootLesson.ownerConfirmationFingerprint ||
        index.sessionSetFingerprint !== rootLesson.sessionSetFingerprint ||
        pin.objectPath !== expectedPath)
        fail("lesson_join_mismatch");
    return index;
}
async function readIndexes(storage, active) {
    const indexes = new Array(active.root.lessons.length);
    let cursor = 0;
    await Promise.all(Array.from({
        length: Math.min(exports.V2_COURSE_ACTIVE_CATALOG_MAX_READ_CONCURRENCY_V1, active.root.lessons.length),
    }, async () => {
        while (cursor < active.root.lessons.length) {
            const index = cursor;
            cursor += 1;
            indexes[index] = await readIndex(storage, active, index);
        }
    }));
    return Object.freeze(indexes);
}
function createV2CourseActiveCatalogAdapterV1(input) {
    if (!input || typeof input !== "object" || !input.storage)
        fail("ports_invalid");
    return Object.freeze({
        load: async (request) => {
            if (!(0, v2_unified_course_release_repository_v2_1.isV2UnifiedCourseReleaseActiveHandleV2)(request.activeHandle) ||
                !generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES.includes(request.interfaceLocale))
                fail("input_invalid");
            const active = (0, v2_unified_course_release_repository_v2_1.resolveV2UnifiedCourseReleaseActiveMaterialV2)(request.activeHandle);
            const indexes = await readIndexes(input.storage, active);
            const catalog = (0, course_active_catalog_v1_1.materializeLearningV2ActiveCourseCatalogV1)({
                environment: active.root.environment,
                releaseId: active.root.releaseId,
                activeRootFingerprint: active.root.rootFingerprint,
                activeHeadFingerprint: active.head.headFingerprint,
                headOperationRevision: active.head.operationRevision,
                seasonId: active.root.seasonId,
                targetLanguage: active.root.targetLanguage,
                studyTarget: active.root.studyTarget,
                learnerSourceLocale: active.root.learnerSourceLocale,
                interfaceLocale: request.interfaceLocale,
                contentClass: active.root.contentClass,
                releaseScope: active.root.releaseScope,
                lessonIndexAggregate: active.root.lessonIndexAggregate,
                indexes,
            });
            const summary = Object.freeze({
                releaseId: catalog.releaseId,
                activeRootFingerprint: catalog.activeRootFingerprint,
                activeHeadFingerprint: catalog.activeHeadFingerprint,
                interfaceLocale: catalog.interfaceLocale,
                lessonCount: catalog.lessonCount,
                directSessionCount: catalog.directSessionCount,
                catalogFingerprint: catalog.catalogFingerprint,
                learnerProjection: catalog.learnerProjection,
                correctnessAuthority: catalog.correctnessAuthority,
                serverAnswerAuthority: catalog.serverAnswerAuthority,
                progressWriteAuthority: catalog.progressWriteAuthority,
                releaseAuthority: false,
            });
            const handle = Object.freeze({
                kind: "v2_course_active_catalog_handle_v1",
            });
            handles.add(handle);
            materials.set(handle, Object.freeze({
                summary,
                catalog,
                raw: (0, course_active_catalog_v1_1.encodeLearningV2ActiveCourseCatalogV1)(catalog),
            }));
            return handle;
        },
    });
}
function createFirebaseAdminV2CourseActiveCatalogAdapterV1() {
    const io = (0, v2_firebase_admin_repository_io_v1_1.createV2FirebaseAdminRepositoryIoV1)();
    return createV2CourseActiveCatalogAdapterV1({ storage: io.storage });
}
function isV2CourseActiveCatalogHandleV1(value) {
    return typeof value === "object" && value !== null && handles.has(value);
}
function getV2CourseActiveCatalogSummaryV1(handle) {
    const material = materials.get(handle);
    if (!material || !handles.has(handle))
        fail("handle_invalid");
    return material.summary;
}
function resolveV2CourseActiveCatalogLearnerRawV1(handle) {
    const material = materials.get(handle);
    if (!material || !handles.has(handle))
        fail("handle_invalid");
    return material.raw;
}
//# sourceMappingURL=v2_course_active_catalog_adapter_v1.js.map