"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_UNIFIED_COURSE_RELEASE_ROOT_RECORD_COLLECTION_V2 = exports.V2_UNIFIED_COURSE_RELEASE_HEAD_COLLECTION_V2 = exports.V2_UNIFIED_COURSE_RELEASE_ROOT_STORAGE_PREFIX_V2 = void 0;
exports.v2UnifiedCourseReleaseRootObjectPathV2 = v2UnifiedCourseReleaseRootObjectPathV2;
exports.v2UnifiedCourseReleaseHeadDocumentPathV2 = v2UnifiedCourseReleaseHeadDocumentPathV2;
exports.v2UnifiedCourseReleaseRootRecordDocumentPathV2 = v2UnifiedCourseReleaseRootRecordDocumentPathV2;
exports.isV2UnifiedCourseReleaseActiveHandleV2 = isV2UnifiedCourseReleaseActiveHandleV2;
exports.resolveV2UnifiedCourseReleaseActiveMaterialV2 = resolveV2UnifiedCourseReleaseActiveMaterialV2;
exports.createV2UnifiedCourseReleaseRepositoryV2 = createV2UnifiedCourseReleaseRepositoryV2;
exports.createFirebaseAdminV2UnifiedCourseReleaseRepositoryV2 = createFirebaseAdminV2UnifiedCourseReleaseRepositoryV2;
const node_crypto_1 = require("node:crypto");
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const v2_firebase_admin_repository_io_v1_1 = require("./v2_firebase_admin_repository_io_v1");
const v2_firebase_repository_persistence_v1_1 = require("./v2_firebase_repository_persistence_v1");
const v2_unified_course_release_v2_1 = require("./v2_unified_course_release_v2");
exports.V2_UNIFIED_COURSE_RELEASE_ROOT_STORAGE_PREFIX_V2 = "learning-v2/unified-course-release-v2/roots";
exports.V2_UNIFIED_COURSE_RELEASE_HEAD_COLLECTION_V2 = "content_v2_unified_course_release_heads";
exports.V2_UNIFIED_COURSE_RELEASE_ROOT_RECORD_COLLECTION_V2 = "content_v2_unified_course_release_roots";
const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const activeHandles = new WeakSet();
const activeMaterials = new WeakMap();
function fail(code) {
    throw new Error(`v2_unified_course_release_repository_v2_${code}`);
}
function sha256Bytes(bytes) {
    return (0, node_crypto_1.createHash)("sha256").update(bytes).digest("hex");
}
function exactId(value) {
    if (!ID_RE.test(value))
        fail("path_invalid");
    return value;
}
function exactHash(value) {
    if (!HASH_RE.test(value))
        fail("path_invalid");
    return value;
}
function v2UnifiedCourseReleaseRootObjectPathV2(input) {
    return `${exports.V2_UNIFIED_COURSE_RELEASE_ROOT_STORAGE_PREFIX_V2}/${(0, node_crypto_1.createHash)("sha256").update(exactId(input.releaseId)).digest("hex")}/${exactHash(input.rootFingerprint)}/${exactHash(input.rawHash)}.json`;
}
function v2UnifiedCourseReleaseHeadDocumentPathV2(input) {
    const id = (0, node_crypto_1.createHash)("sha256").update((0, decision_registry_1.canonicalJsonV1)(input)).digest("hex");
    return `${exports.V2_UNIFIED_COURSE_RELEASE_HEAD_COLLECTION_V2}/${id}`;
}
function v2UnifiedCourseReleaseRootRecordDocumentPathV2(releaseId) {
    return `${exports.V2_UNIFIED_COURSE_RELEASE_ROOT_RECORD_COLLECTION_V2}/${(0, node_crypto_1.createHash)("sha256").update(exactId(releaseId)).digest("hex")}`;
}
function mintActiveHandle(material) {
    const handle = Object.freeze({
        kind: "v2_unified_course_release_active_handle_v2",
    });
    activeHandles.add(handle);
    activeMaterials.set(handle, material);
    return handle;
}
function isV2UnifiedCourseReleaseActiveHandleV2(value) {
    return (typeof value === "object" && value !== null && activeHandles.has(value));
}
function resolveV2UnifiedCourseReleaseActiveMaterialV2(handle) {
    const material = activeMaterials.get(handle);
    if (!material || !activeHandles.has(handle))
        fail("active_handle_invalid");
    return material;
}
function rootRecordRaw(root, rootObject) {
    return (0, decision_registry_1.canonicalJsonV1)({
        schemaVersion: "v2-unified-course-release-root-record.v2",
        releaseId: root.releaseId,
        topologyFingerprint: root.topologyFingerprint,
        rootFingerprint: root.rootFingerprint,
        rootObject,
        recordAuthority: "none_server_readback_required",
        releaseAuthority: false,
    });
}
async function commitRootRecord(firestore, root, rootObject) {
    const path = v2UnifiedCourseReleaseRootRecordDocumentPathV2(root.releaseId);
    const raw = rootRecordRaw(root, rootObject);
    await firestore.runTransaction(async (transaction) => {
        const current = await transaction.readExact(path);
        if (!current.exists) {
            await transaction.createExact(path, raw);
            return;
        }
        if (current.raw !== raw)
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
        maximumBytes: v2_unified_course_release_v2_1.V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V2,
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
    return (0, v2_unified_course_release_v2_1.parseV2UnifiedCourseReleaseRootV2)(raw);
}
async function coldReadHead(firestore, path) {
    return firestore.runTransaction(async (transaction) => {
        const value = await transaction.readExact(path);
        return value.exists ? (0, v2_unified_course_release_v2_1.parseV2UnifiedCourseReleaseHeadV2)(value.raw) : null;
    });
}
function exactJoin(root, head, request) {
    if (root.rootFingerprint !== head.activeRootFingerprint ||
        root.releaseId !== head.activeReleaseId ||
        root.topologyFingerprint !== head.topologyFingerprint ||
        (request &&
            (root.environment !== request.environment ||
                root.seasonId !== request.seasonId ||
                root.targetLanguage !== request.targetLanguage ||
                root.studyTarget !== request.studyTarget ||
                root.learnerSourceLocale !== request.learnerSourceLocale)))
        fail("active_join_mismatch");
}
function createV2UnifiedCourseReleaseRepositoryV2(input) {
    if (!input || typeof input !== "object" || !input.firestore || !input.storage)
        fail("ports_invalid");
    const { firestore, storage } = input;
    return Object.freeze({
        persistAndAdvance: async (request) => {
            if (!(0, v2_unified_course_release_v2_1.isV2UnifiedCourseReleaseRootV2)(request.target))
                fail("root_handle_invalid");
            const raw = (0, decision_registry_1.canonicalJsonV1)(request.target);
            const bytes = new TextEncoder().encode(raw);
            const rawHash = sha256Bytes(bytes);
            const persisted = await (0, v2_firebase_repository_persistence_v1_1.persistV2ImmutableRepositoryObjectV1)({
                storage,
                objectPath: v2UnifiedCourseReleaseRootObjectPathV2({
                    releaseId: request.target.releaseId,
                    rootFingerprint: request.target.rootFingerprint,
                    rawHash,
                }),
                bytes,
                maximumBytes: v2_unified_course_release_v2_1.V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V2,
                contentType: v2_firebase_repository_persistence_v1_1.V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
                contentHash: rawHash,
            });
            const coldTarget = await coldReadRoot(storage, persisted.pin);
            if (coldTarget.rootFingerprint !== request.target.rootFingerprint)
                fail("root_logical_mismatch");
            await commitRootRecord(firestore, coldTarget, persisted.pin);
            const documentPath = v2UnifiedCourseReleaseHeadDocumentPathV2({
                environment: coldTarget.environment,
                seasonId: coldTarget.seasonId,
                targetLanguage: coldTarget.targetLanguage,
                studyTarget: coldTarget.studyTarget,
                learnerSourceLocale: coldTarget.learnerSourceLocale,
            });
            const committed = await firestore.runTransaction(async (transaction) => {
                const currentRaw = await transaction.readExact(documentPath);
                const current = currentRaw.exists
                    ? (0, v2_unified_course_release_v2_1.parseV2UnifiedCourseReleaseHeadV2)(currentRaw.raw)
                    : null;
                const decision = (0, v2_unified_course_release_v2_1.decideV2UnifiedCourseReleaseHeadV2)({
                    current,
                    target: coldTarget,
                    targetObject: persisted.pin,
                    action: request.action,
                    expectedRevision: request.expectedRevision,
                    operationId: request.operationId,
                    updatedAtIso: request.updatedAtIso,
                });
                if (decision.kind === "commit") {
                    const nextRaw = (0, decision_registry_1.canonicalJsonV1)(decision.head);
                    if (current === null)
                        await transaction.createExact(documentPath, nextRaw);
                    else
                        await transaction.compareAndSetExact(documentPath, {
                            operationRevision: current.operationRevision,
                            operationFingerprint: current.operationFingerprint,
                        }, nextRaw);
                }
                return decision;
            });
            const head = await coldReadHead(firestore, documentPath);
            if (!head || head.headFingerprint !== committed.head.headFingerprint)
                fail("head_readback_mismatch");
            const root = await coldReadRoot(storage, head.activeRootObject);
            exactJoin(root, head);
            const material = Object.freeze({
                root,
                rootObject: head.activeRootObject,
                head,
            });
            return Object.freeze({
                ...material,
                persistenceKind: persisted.kind,
                headDecision: committed.kind,
                activeHandle: mintActiveHandle(material),
            });
        },
        readActive: async (request) => {
            const documentPath = v2UnifiedCourseReleaseHeadDocumentPathV2(request);
            const head = await coldReadHead(firestore, documentPath);
            if (!head)
                fail("head_missing");
            const root = await coldReadRoot(storage, head.activeRootObject);
            exactJoin(root, head, request);
            const material = Object.freeze({
                root,
                rootObject: head.activeRootObject,
                head,
            });
            return Object.freeze({
                ...material,
                activeHandle: mintActiveHandle(material),
            });
        },
    });
}
function createFirebaseAdminV2UnifiedCourseReleaseRepositoryV2() {
    const io = (0, v2_firebase_admin_repository_io_v1_1.createV2FirebaseAdminRepositoryIoV1)();
    return createV2UnifiedCourseReleaseRepositoryV2({
        firestore: io.firestore,
        storage: io.storage,
    });
}
//# sourceMappingURL=v2_unified_course_release_repository_v2.js.map