"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_UNIFIED_COURSE_RELEASE_ROOT_RECORD_COLLECTION_V1 = exports.V2_UNIFIED_COURSE_RELEASE_HEAD_COLLECTION_V1 = exports.V2_UNIFIED_COURSE_RELEASE_ROOT_STORAGE_PREFIX_V1 = void 0;
exports.resolveV2UnifiedCourseReleaseActiveMaterialV1 = resolveV2UnifiedCourseReleaseActiveMaterialV1;
exports.v2UnifiedCourseReleaseRootObjectPathV1 = v2UnifiedCourseReleaseRootObjectPathV1;
exports.v2UnifiedCourseReleaseHeadDocumentPathV1 = v2UnifiedCourseReleaseHeadDocumentPathV1;
exports.v2UnifiedCourseReleaseRootRecordDocumentPathV1 = v2UnifiedCourseReleaseRootRecordDocumentPathV1;
exports.createV2UnifiedCourseReleaseRepositoryV1 = createV2UnifiedCourseReleaseRepositoryV1;
exports.createFirebaseAdminV2UnifiedCourseReleaseRepositoryV1 = createFirebaseAdminV2UnifiedCourseReleaseRepositoryV1;
const node_crypto_1 = require("node:crypto");
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const v2_firebase_admin_repository_io_v1_1 = require("./v2_firebase_admin_repository_io_v1");
const v2_firebase_repository_persistence_v1_1 = require("./v2_firebase_repository_persistence_v1");
const v2_unified_course_release_v1_1 = require("./v2_unified_course_release_v1");
exports.V2_UNIFIED_COURSE_RELEASE_ROOT_STORAGE_PREFIX_V1 = "learning-v2/unified-course-releases";
exports.V2_UNIFIED_COURSE_RELEASE_HEAD_COLLECTION_V1 = "content_v2_unified_course_release_heads";
exports.V2_UNIFIED_COURSE_RELEASE_ROOT_RECORD_COLLECTION_V1 = "content_v2_unified_course_release_roots";
const activeHandles = new WeakSet();
const activeMaterials = new WeakMap();
function mintActiveHandle(material) {
    const handle = Object.freeze({
        kind: "v2_unified_course_release_active_handle",
    });
    activeHandles.add(handle);
    activeMaterials.set(handle, material);
    return handle;
}
function resolveV2UnifiedCourseReleaseActiveMaterialV1(handle) {
    const material = activeMaterials.get(handle);
    if (!material || !activeHandles.has(handle))
        fail("active_handle_invalid");
    return material;
}
const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const LOCALE_RE = /^[a-z]{2,8}(?:-[A-Z][a-z]{3})?(?:-(?:[A-Z]{2}|[0-9]{3}))?$/u;
function fail(code) {
    throw new Error(`v2_unified_course_release_repository_${code}`);
}
function sha256Bytes(bytes) {
    return (0, node_crypto_1.createHash)("sha256").update(bytes).digest("hex");
}
function v2UnifiedCourseReleaseRootObjectPathV1(input) {
    if (!ID_RE.test(input.releaseId) ||
        !HASH_RE.test(input.rootFingerprint) ||
        !HASH_RE.test(input.rawHash))
        fail("path_invalid");
    return `${exports.V2_UNIFIED_COURSE_RELEASE_ROOT_STORAGE_PREFIX_V1}/${input.releaseId}/${input.rootFingerprint}/${input.rawHash}.json`;
}
function v2UnifiedCourseReleaseHeadDocumentPathV1(input) {
    if (!["lab", "staging", "production"].includes(input.environment) ||
        !ID_RE.test(input.seasonId) ||
        !LOCALE_RE.test(input.studyTarget) ||
        !LOCALE_RE.test(input.learnerSourceLocale))
        fail("path_invalid");
    const id = (0, node_crypto_1.createHash)("sha256").update((0, decision_registry_1.canonicalJsonV1)(input)).digest("hex");
    return `${exports.V2_UNIFIED_COURSE_RELEASE_HEAD_COLLECTION_V1}/${id}`;
}
function v2UnifiedCourseReleaseRootRecordDocumentPathV1(releaseId) {
    if (!ID_RE.test(releaseId))
        fail("path_invalid");
    return `${exports.V2_UNIFIED_COURSE_RELEASE_ROOT_RECORD_COLLECTION_V1}/${(0, node_crypto_1.createHash)("sha256").update(releaseId).digest("hex")}`;
}
function rootRecordRaw(root, rootObject) {
    return (0, decision_registry_1.canonicalJsonV1)({
        schemaVersion: "v2-unified-course-release-root-record.v1",
        releaseId: root.releaseId,
        rootFingerprint: root.rootFingerprint,
        rootObject,
        recordAuthority: "none_server_readback_required",
        releaseAuthority: false,
    });
}
async function commitRootRecord(firestore, root, rootObject) {
    const path = v2UnifiedCourseReleaseRootRecordDocumentPathV1(root.releaseId);
    const expectedRaw = rootRecordRaw(root, rootObject);
    await firestore.runTransaction(async (transaction) => {
        const current = await transaction.readExact(path);
        if (!current.exists) {
            await transaction.createExact(path, expectedRaw);
            return;
        }
        if (current.raw !== expectedRaw)
            fail("release_id_reuse_conflict");
    });
}
async function coldReadRoot(storage, pin) {
    const metadata = await storage.readMetadataExact(pin.objectPath);
    if (!metadata ||
        (0, decision_registry_1.canonicalJsonV1)(metadata) !==
            (0, decision_registry_1.canonicalJsonV1)({
                generation: pin.objectGeneration,
                byteSize: pin.byteSize,
                contentType: pin.contentType,
                contentHash: pin.contentHash,
            }))
        fail("root_metadata_mismatch");
    const result = await storage.downloadGenerationExact({
        objectPath: pin.objectPath,
        ifGenerationMatch: pin.objectGeneration,
        maximumBytes: v2_unified_course_release_v1_1.V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V1,
    });
    if (result.kind !== "downloaded" ||
        !(result.bytes instanceof Uint8Array) ||
        result.bytes.byteLength !== pin.byteSize ||
        sha256Bytes(result.bytes) !== pin.contentHash)
        fail("root_readback_mismatch");
    let raw;
    try {
        raw = new TextDecoder("utf-8", { fatal: true }).decode(result.bytes);
    }
    catch {
        fail("root_utf8_invalid");
    }
    return (0, v2_unified_course_release_v1_1.parseV2UnifiedCourseReleaseRootV1)(raw);
}
async function coldReadHead(firestore, path) {
    return firestore.runTransaction(async (transaction) => {
        const value = await transaction.readExact(path);
        return value.exists ? (0, v2_unified_course_release_v1_1.parseV2UnifiedCourseReleaseHeadV1)(value.raw) : null;
    });
}
function createV2UnifiedCourseReleaseRepositoryV1(input) {
    if (!input || typeof input !== "object" || !input.firestore || !input.storage)
        fail("ports_invalid");
    const { firestore, storage } = input;
    return Object.freeze({
        persistAndAdvance: async (request) => {
            if (!(0, v2_unified_course_release_v1_1.isV2UnifiedCourseReleaseRootV1)(request.target))
                fail("root_handle_invalid");
            const raw = (0, decision_registry_1.canonicalJsonV1)(request.target);
            const bytes = new TextEncoder().encode(raw);
            const rawHash = sha256Bytes(bytes);
            const objectPath = v2UnifiedCourseReleaseRootObjectPathV1({
                releaseId: request.target.releaseId,
                rootFingerprint: request.target.rootFingerprint,
                rawHash,
            });
            const persisted = await (0, v2_firebase_repository_persistence_v1_1.persistV2ImmutableRepositoryObjectV1)({
                storage,
                objectPath,
                bytes,
                maximumBytes: v2_unified_course_release_v1_1.V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V1,
                contentType: v2_firebase_repository_persistence_v1_1.V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
                contentHash: rawHash,
            });
            const coldTarget = await coldReadRoot(storage, persisted.pin);
            if (coldTarget.rootFingerprint !== request.target.rootFingerprint)
                fail("root_logical_mismatch");
            await commitRootRecord(firestore, coldTarget, persisted.pin);
            const documentPath = v2UnifiedCourseReleaseHeadDocumentPathV1({
                environment: coldTarget.environment,
                seasonId: coldTarget.seasonId,
                studyTarget: coldTarget.studyTarget,
                learnerSourceLocale: coldTarget.learnerSourceLocale,
            });
            const committed = await firestore.runTransaction(async (transaction) => {
                const currentRaw = await transaction.readExact(documentPath);
                const current = currentRaw.exists
                    ? (0, v2_unified_course_release_v1_1.parseV2UnifiedCourseReleaseHeadV1)(currentRaw.raw)
                    : null;
                const decision = (0, v2_unified_course_release_v1_1.decideV2UnifiedCourseReleaseHeadV1)({
                    current,
                    target: coldTarget,
                    targetObject: persisted.pin,
                    action: request.action,
                    expectedRevision: request.expectedRevision,
                    operationId: request.operationId,
                    updatedAtIso: request.updatedAtIso,
                });
                if (decision.kind === "commit") {
                    if (current === null)
                        await transaction.createExact(documentPath, (0, decision_registry_1.canonicalJsonV1)(decision.head));
                    else
                        await transaction.compareAndSetExact(documentPath, {
                            operationRevision: current.operationRevision,
                            operationFingerprint: current.operationFingerprint,
                        }, (0, decision_registry_1.canonicalJsonV1)(decision.head));
                }
                return decision;
            });
            const coldHead = await coldReadHead(firestore, documentPath);
            if (!coldHead ||
                coldHead.headFingerprint !== committed.head.headFingerprint)
                fail("head_readback_mismatch");
            const finalRoot = await coldReadRoot(storage, coldHead.activeRootObject);
            if (finalRoot.rootFingerprint !== coldHead.activeRootFingerprint ||
                finalRoot.releaseId !== coldHead.activeReleaseId)
                fail("active_join_mismatch");
            return Object.freeze({
                root: finalRoot,
                rootObject: coldHead.activeRootObject,
                head: coldHead,
                persistenceKind: persisted.kind,
                headDecision: committed.kind,
                activeHandle: mintActiveHandle(Object.freeze({
                    head: coldHead,
                    root: finalRoot,
                    rootObject: coldHead.activeRootObject,
                })),
            });
        },
        readActive: async (request) => {
            const path = v2UnifiedCourseReleaseHeadDocumentPathV1(request);
            const head = await coldReadHead(firestore, path);
            if (!head)
                fail("head_missing");
            const root = await coldReadRoot(storage, head.activeRootObject);
            if (root.environment !== request.environment ||
                root.seasonId !== request.seasonId ||
                root.studyTarget !== request.studyTarget ||
                root.learnerSourceLocale !== request.learnerSourceLocale ||
                root.rootFingerprint !== head.activeRootFingerprint ||
                root.releaseId !== head.activeReleaseId)
                fail("active_join_mismatch");
            const material = Object.freeze({
                head,
                root,
                rootObject: head.activeRootObject,
            });
            return Object.freeze({
                ...material,
                activeHandle: mintActiveHandle(material),
            });
        },
    });
}
function createFirebaseAdminV2UnifiedCourseReleaseRepositoryV1() {
    const io = (0, v2_firebase_admin_repository_io_v1_1.createV2FirebaseAdminRepositoryIoV1)();
    return createV2UnifiedCourseReleaseRepositoryV1({
        firestore: io.firestore,
        storage: io.storage,
    });
}
//# sourceMappingURL=v2_unified_course_release_repository_v1.js.map