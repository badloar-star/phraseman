"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_UNIFIED_COURSE_RELEASE_ROOT_RECORD_COLLECTION_V3 = exports.V2_UNIFIED_COURSE_RELEASE_HEAD_COLLECTION_V3 = exports.V2_UNIFIED_COURSE_RELEASE_ROOT_STORAGE_PREFIX_V3 = void 0;
exports.v2UnifiedCourseReleaseRootObjectPathV3 = v2UnifiedCourseReleaseRootObjectPathV3;
exports.v2UnifiedCourseReleaseHeadDocumentPathV3 = v2UnifiedCourseReleaseHeadDocumentPathV3;
exports.v2UnifiedCourseReleaseRootRecordDocumentPathV3 = v2UnifiedCourseReleaseRootRecordDocumentPathV3;
exports.isV2UnifiedCourseReleaseActiveHandleV3 = isV2UnifiedCourseReleaseActiveHandleV3;
exports.resolveV2UnifiedCourseReleaseActiveMaterialV3 = resolveV2UnifiedCourseReleaseActiveMaterialV3;
exports.createV2UnifiedCourseReleaseRepositoryV3 = createV2UnifiedCourseReleaseRepositoryV3;
exports.createFirebaseAdminV2UnifiedCourseReleaseRepositoryV3 = createFirebaseAdminV2UnifiedCourseReleaseRepositoryV3;
const node_crypto_1 = require("node:crypto");
const language_tag_v1_1 = require("../../../modules/learning-v2/contracts/language_tag_v1");
const course_lesson_audio_release_index_v1_1 = require("../../../modules/learning-v2/runtime/course_lesson_audio_release_index_v1");
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const v2_firebase_admin_repository_io_v1_1 = require("./v2_firebase_admin_repository_io_v1");
const v2_firebase_repository_persistence_v1_1 = require("./v2_firebase_repository_persistence_v1");
const v2_unified_course_release_v2_1 = require("./v2_unified_course_release_v2");
const v2_unified_course_release_repository_v2_1 = require("./v2_unified_course_release_repository_v2");
const v2_unified_course_release_v3_1 = require("./v2_unified_course_release_v3");
exports.V2_UNIFIED_COURSE_RELEASE_ROOT_STORAGE_PREFIX_V3 = "learning-v2/unified-course-release-v3/roots";
exports.V2_UNIFIED_COURSE_RELEASE_HEAD_COLLECTION_V3 = "content_v2_unified_course_release_heads_v3";
exports.V2_UNIFIED_COURSE_RELEASE_ROOT_RECORD_COLLECTION_V3 = "content_v2_unified_course_release_roots_v3";
const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const GENERATION_RE = /^[1-9][0-9]{0,30}$/u;
const PIN_KEYS = Object.freeze([
    "objectPath",
    "contentHash",
    "objectGeneration",
    "byteSize",
    "contentType",
]);
const activeHandles = new WeakSet();
const activeMaterials = new WeakMap();
function fail(code) {
    throw new Error(`v2_unified_course_release_repository_v3_${code}`);
}
function record(value) {
    return (typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype);
}
function exactId(value) {
    if (typeof value !== "string" || !ID_RE.test(value))
        fail("path_invalid");
    return value;
}
function exactHash(value) {
    if (typeof value !== "string" || !HASH_RE.test(value))
        fail("path_invalid");
    return value;
}
function exactPin(value) {
    if (!record(value))
        fail("pin_invalid");
    const actual = Object.keys(value).sort();
    const expected = [...PIN_KEYS].sort();
    if (actual.length !== expected.length ||
        actual.some((key, index) => key !== expected[index]) ||
        typeof value.objectPath !== "string" ||
        typeof value.objectGeneration !== "string" ||
        !GENERATION_RE.test(value.objectGeneration) ||
        !Number.isSafeInteger(value.byteSize) ||
        Number(value.byteSize) < 2 ||
        value.contentType !== v2_firebase_repository_persistence_v1_1.V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1)
        fail("pin_invalid");
    return Object.freeze({
        objectPath: value.objectPath,
        contentHash: exactHash(value.contentHash),
        objectGeneration: value.objectGeneration,
        byteSize: Number(value.byteSize),
        contentType: v2_firebase_repository_persistence_v1_1.V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
    });
}
function preflightDecodedJson(value) {
    const stack = [
        { value, depth: 0 },
    ];
    let nodes = 0;
    while (stack.length > 0) {
        const current = stack.pop();
        nodes += 1;
        if (nodes > 100_000 || current.depth > 24)
            fail("json_complexity_invalid");
        if (Array.isArray(current.value)) {
            if (current.value.length > 4_096)
                fail("json_complexity_invalid");
            for (const child of current.value)
                stack.push({ value: child, depth: current.depth + 1 });
            continue;
        }
        if (record(current.value)) {
            const entries = Object.entries(current.value);
            if (entries.length > 256)
                fail("json_complexity_invalid");
            for (const [key, child] of entries) {
                if (key === "__proto__" || key === "prototype" || key === "constructor")
                    fail("json_complexity_invalid");
                stack.push({ value: child, depth: current.depth + 1 });
            }
        }
    }
}
function decodeJsonForPin(raw) {
    let decoded;
    try {
        decoded = JSON.parse(raw);
    }
    catch {
        fail("json_invalid");
    }
    preflightDecodedJson(decoded);
    if (!record(decoded))
        fail("json_invalid");
    return decoded;
}
function sha256Bytes(bytes) {
    return (0, node_crypto_1.createHash)("sha256").update(bytes).digest("hex");
}
async function readExactRaw(storage, pinValue, maximumBytes, kind) {
    const pin = exactPin(pinValue);
    if (pin.byteSize > maximumBytes)
        fail(`${kind}_oversize`);
    const metadata = await storage.readMetadataExact(pin.objectPath);
    if (!metadata ||
        (0, decision_registry_1.canonicalJsonV1)(metadata) !==
            (0, decision_registry_1.canonicalJsonV1)({
                generation: pin.objectGeneration,
                byteSize: pin.byteSize,
                contentType: pin.contentType,
                contentHash: pin.contentHash,
            }))
        fail(`${kind}_metadata_mismatch`);
    const downloaded = await storage.downloadGenerationExact({
        objectPath: pin.objectPath,
        ifGenerationMatch: pin.objectGeneration,
        maximumBytes,
    });
    if (downloaded.kind !== "downloaded" ||
        !(downloaded.bytes instanceof Uint8Array) ||
        downloaded.bytes.byteLength !== pin.byteSize ||
        sha256Bytes(downloaded.bytes) !== pin.contentHash)
        fail(`${kind}_readback_mismatch`);
    try {
        return new TextDecoder("utf-8", { fatal: true }).decode(downloaded.bytes);
    }
    catch {
        fail(`${kind}_utf8_invalid`);
    }
}
function v2UnifiedCourseReleaseRootObjectPathV3(input) {
    return `${exports.V2_UNIFIED_COURSE_RELEASE_ROOT_STORAGE_PREFIX_V3}/${(0, decision_registry_1.sha256Utf8)(exactId(input.releaseId))}/${exactHash(input.rootFingerprint)}/${exactHash(input.rawHash)}.json`;
}
function exactReadScope(input) {
    if (!record(input) ||
        Object.keys(input).sort().join("|") !==
            "environment|learnerSourceLocale|seasonId|studyTarget|targetLanguage" ||
        (input.environment !== "lab" &&
            input.environment !== "staging" &&
            input.environment !== "production") ||
        !ID_RE.test(input.seasonId) ||
        (0, language_tag_v1_1.parseV2ExactLanguageTagV1)(input.targetLanguage) === null ||
        (0, language_tag_v1_1.parseV2ExactLanguageTagV1)(input.studyTarget) === null ||
        (0, language_tag_v1_1.parseV2ExactLanguageTagV1)(input.learnerSourceLocale) === null)
        fail("scope_invalid");
    return input;
}
function v2UnifiedCourseReleaseHeadDocumentPathV3(input) {
    const scope = exactReadScope(input);
    const id = (0, decision_registry_1.sha256Utf8)((0, decision_registry_1.canonicalJsonV1)(scope));
    return `${exports.V2_UNIFIED_COURSE_RELEASE_HEAD_COLLECTION_V3}/${id}`;
}
function v2UnifiedCourseReleaseRootRecordDocumentPathV3(releaseId) {
    return `${exports.V2_UNIFIED_COURSE_RELEASE_ROOT_RECORD_COLLECTION_V3}/${(0, decision_registry_1.sha256Utf8)(exactId(releaseId))}`;
}
function exactBasePin(baseRoot, pin, raw) {
    const rawHash = (0, decision_registry_1.sha256Utf8)(raw);
    if (pin.objectPath !==
        (0, v2_unified_course_release_repository_v2_1.v2UnifiedCourseReleaseRootObjectPathV2)({
            releaseId: baseRoot.releaseId,
            rootFingerprint: baseRoot.rootFingerprint,
            rawHash,
        }) ||
        pin.contentHash !== rawHash ||
        pin.byteSize !== (0, decision_registry_1.utf8ByteLengthV1)(raw))
        fail("base_root_pin_mismatch");
}
async function readBaseRoot(storage, pin) {
    const raw = await readExactRaw(storage, pin, v2_unified_course_release_v2_1.V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V2, "base_root");
    preflightDecodedJson(decodeJsonForPin(raw));
    const root = (0, v2_unified_course_release_v2_1.parseV2UnifiedCourseReleaseRootV2)(raw);
    exactBasePin(root, pin, raw);
    return root;
}
async function readAudioIndexes(storage, root) {
    const indexes = [];
    for (const lesson of root.lessons) {
        const raw = await readExactRaw(storage, lesson.audioIndexObject, course_lesson_audio_release_index_v1_1.LEARNING_V2_COURSE_LESSON_AUDIO_RELEASE_INDEX_MAX_BYTES_V1, "audio_index");
        preflightDecodedJson(decodeJsonForPin(raw));
        const index = (0, course_lesson_audio_release_index_v1_1.parseLearningV2CourseLessonAudioReleaseIndexV1)(raw);
        const rawHash = (0, decision_registry_1.sha256Utf8)(raw);
        if (lesson.audioIndexObject.objectPath !==
            (0, course_lesson_audio_release_index_v1_1.learningV2CourseLessonAudioReleaseIndexObjectPathV1)({
                releaseId: index.releaseId,
                lessonId: index.lessonId,
                indexFingerprint: index.indexFingerprint,
                rawHash,
            }) ||
            lesson.audioIndexObject.contentHash !== rawHash ||
            lesson.audioIndexObject.byteSize !== (0, decision_registry_1.utf8ByteLengthV1)(raw) ||
            index.releaseId !== root.releaseId ||
            index.lessonId !== lesson.lessonId ||
            index.lessonOrdinal !== lesson.lessonOrdinal ||
            index.baseLessonIndexFingerprint !== lesson.baseLessonIndexFingerprint ||
            index.indexFingerprint !== lesson.audioIndexFingerprint ||
            index.extensionSetFingerprint !== lesson.extensionSetFingerprint ||
            index.audioSetFingerprint !== lesson.audioSetFingerprint)
            fail("audio_index_join_mismatch");
        if ((0, course_lesson_audio_release_index_v1_1.encodeLearningV2CourseLessonAudioReleaseIndexV1)(index) !== raw)
            fail("audio_index_canonical_mismatch");
        indexes.push(index);
    }
    return Object.freeze(indexes);
}
async function readDependencies(storage, root) {
    const baseRaw = await readExactRaw(storage, root.baseRootObject, v2_unified_course_release_v2_1.V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V2, "base_root");
    preflightDecodedJson(decodeJsonForPin(baseRaw));
    const baseRoot = (0, v2_unified_course_release_v2_1.parseV2UnifiedCourseReleaseRootV2)(baseRaw);
    exactBasePin(baseRoot, root.baseRootObject, baseRaw);
    if (baseRoot.rootFingerprint !== root.baseRootFingerprint)
        fail("base_root_join_mismatch");
    const audioIndexes = await readAudioIndexes(storage, root);
    return Object.freeze({ baseRoot, audioIndexes });
}
async function coldReadCompositeRoot(storage, pin) {
    const raw = await readExactRaw(storage, pin, v2_unified_course_release_v3_1.V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V3, "root");
    const decoded = decodeJsonForPin(raw);
    const basePin = exactPin(decoded.baseRootObject);
    const baseRoot = await readBaseRoot(storage, basePin);
    const root = (0, v2_unified_course_release_v3_1.parseV2UnifiedCourseReleaseRootV3)(raw, baseRoot);
    const rawHash = (0, decision_registry_1.sha256Utf8)(raw);
    if (pin.objectPath !==
        v2UnifiedCourseReleaseRootObjectPathV3({
            releaseId: root.releaseId,
            rootFingerprint: root.rootFingerprint,
            rawHash,
        }) ||
        pin.contentHash !== rawHash ||
        pin.byteSize !== (0, decision_registry_1.utf8ByteLengthV1)(raw))
        fail("root_pin_mismatch");
    const audioIndexes = await readAudioIndexes(storage, root);
    return Object.freeze({ root, baseRoot, audioIndexes });
}
function rootRecordRaw(root, rootObject) {
    return (0, decision_registry_1.canonicalJsonV1)({
        schemaVersion: "v2-unified-course-release-root-record.v3",
        releaseId: root.releaseId,
        topologyFingerprint: root.topologyFingerprint,
        rootFingerprint: root.rootFingerprint,
        baseRootFingerprint: root.baseRootFingerprint,
        audioLessonIndexAggregate: root.audioLessonIndexAggregate,
        rootObject,
        recordAuthority: "none_server_readback_required",
        serverAnswerAuthority: "none_answers_never_transported_or_rechecked",
        releaseAuthority: false,
    });
}
async function commitRootRecord(firestore, root, rootObject) {
    const path = v2UnifiedCourseReleaseRootRecordDocumentPathV3(root.releaseId);
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
async function coldReadHead(firestore, path) {
    return firestore.runTransaction(async (transaction) => {
        const value = await transaction.readExact(path);
        return value.exists ? (0, v2_unified_course_release_v3_1.parseV2UnifiedCourseReleaseHeadV3)(value.raw) : null;
    });
}
function exactJoin(material, head, request) {
    const { root, rootObject, baseRoot, audioIndexes } = material;
    if (root.rootFingerprint !== head.activeRootFingerprint ||
        root.baseRootFingerprint !== head.activeBaseRootFingerprint ||
        root.releaseId !== head.activeReleaseId ||
        root.topologyFingerprint !== head.topologyFingerprint ||
        (0, decision_registry_1.canonicalJsonV1)(rootObject) !== (0, decision_registry_1.canonicalJsonV1)(head.activeRootObject) ||
        baseRoot.rootFingerprint !== root.baseRootFingerprint ||
        audioIndexes.length !== root.lessons.length ||
        (request &&
            (root.environment !== request.environment ||
                root.seasonId !== request.seasonId ||
                root.targetLanguage !== request.targetLanguage ||
                root.studyTarget !== request.studyTarget ||
                root.learnerSourceLocale !== request.learnerSourceLocale)))
        fail("active_join_mismatch");
}
function mintActiveHandle(material) {
    const handle = Object.freeze({
        kind: "v2_unified_course_release_active_handle_v3",
    });
    activeHandles.add(handle);
    activeMaterials.set(handle, material);
    return handle;
}
function isV2UnifiedCourseReleaseActiveHandleV3(value) {
    return (typeof value === "object" && value !== null && activeHandles.has(value));
}
function resolveV2UnifiedCourseReleaseActiveMaterialV3(handle) {
    const material = activeMaterials.get(handle);
    if (!material || !activeHandles.has(handle))
        fail("active_handle_invalid");
    return material;
}
function createV2UnifiedCourseReleaseRepositoryV3(input) {
    if (!record(input) || !input.firestore || !input.storage)
        fail("ports_invalid");
    const { firestore, storage } = input;
    return Object.freeze({
        persistAndAdvance: async (request) => {
            if (!record(request) || !(0, v2_unified_course_release_v3_1.isV2UnifiedCourseReleaseRootV3)(request.target))
                fail("root_handle_invalid");
            await readDependencies(storage, request.target);
            const raw = (0, decision_registry_1.canonicalJsonV1)(request.target);
            const bytes = new TextEncoder().encode(raw);
            const rawHash = sha256Bytes(bytes);
            const persisted = await (0, v2_firebase_repository_persistence_v1_1.persistV2ImmutableRepositoryObjectV1)({
                storage,
                objectPath: v2UnifiedCourseReleaseRootObjectPathV3({
                    releaseId: request.target.releaseId,
                    rootFingerprint: request.target.rootFingerprint,
                    rawHash,
                }),
                bytes,
                maximumBytes: v2_unified_course_release_v3_1.V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V3,
                contentType: v2_firebase_repository_persistence_v1_1.V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
                contentHash: rawHash,
            });
            const coldTarget = await coldReadCompositeRoot(storage, persisted.pin);
            if (coldTarget.root.rootFingerprint !== request.target.rootFingerprint)
                fail("root_logical_mismatch");
            await commitRootRecord(firestore, coldTarget.root, persisted.pin);
            const scope = {
                environment: coldTarget.root.environment,
                seasonId: coldTarget.root.seasonId,
                targetLanguage: coldTarget.root.targetLanguage,
                studyTarget: coldTarget.root.studyTarget,
                learnerSourceLocale: coldTarget.root.learnerSourceLocale,
            };
            const documentPath = v2UnifiedCourseReleaseHeadDocumentPathV3(scope);
            const committed = await firestore.runTransaction(async (transaction) => {
                const currentRaw = await transaction.readExact(documentPath);
                const current = currentRaw.exists
                    ? (0, v2_unified_course_release_v3_1.parseV2UnifiedCourseReleaseHeadV3)(currentRaw.raw)
                    : null;
                const decision = (0, v2_unified_course_release_v3_1.decideV2UnifiedCourseReleaseHeadV3)({
                    current,
                    target: coldTarget.root,
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
            const cold = await coldReadCompositeRoot(storage, head.activeRootObject);
            const material = Object.freeze({
                ...cold,
                rootObject: head.activeRootObject,
                head,
            });
            exactJoin(material, head);
            return Object.freeze({
                ...material,
                persistenceKind: persisted.kind,
                headDecision: committed.kind,
                activeHandle: mintActiveHandle(material),
            });
        },
        readActive: async (request) => {
            const scope = exactReadScope(request);
            const documentPath = v2UnifiedCourseReleaseHeadDocumentPathV3(scope);
            const head = await coldReadHead(firestore, documentPath);
            if (!head)
                fail("head_missing");
            const cold = await coldReadCompositeRoot(storage, head.activeRootObject);
            const material = Object.freeze({
                ...cold,
                rootObject: head.activeRootObject,
                head,
            });
            exactJoin(material, head, scope);
            return Object.freeze({
                ...material,
                activeHandle: mintActiveHandle(material),
            });
        },
    });
}
function createFirebaseAdminV2UnifiedCourseReleaseRepositoryV3() {
    const io = (0, v2_firebase_admin_repository_io_v1_1.createV2FirebaseAdminRepositoryIoV1)();
    return createV2UnifiedCourseReleaseRepositoryV3({
        firestore: io.firestore,
        storage: io.storage,
    });
}
//# sourceMappingURL=v2_unified_course_release_repository_v3.js.map