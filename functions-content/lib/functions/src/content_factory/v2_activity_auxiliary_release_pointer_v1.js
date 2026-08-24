"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_ACTIVITY_AUXILIARY_RELEASE_POINTER_COLLECTION_V1 = exports.V2_ACTIVITY_AUXILIARY_RELEASE_POINTER_MAX_BYTES_V1 = exports.V2_ACTIVITY_AUXILIARY_RELEASE_POINTER_SCHEMA_V1 = void 0;
exports.v2ActivityAuxiliaryReleasePointerDocumentPathV1 = v2ActivityAuxiliaryReleasePointerDocumentPathV1;
exports.v2ActivityAuxiliaryReleaseIndexObjectPathV1 = v2ActivityAuxiliaryReleaseIndexObjectPathV1;
exports.materializeV2ActivityAuxiliaryReleasePointerV1 = materializeV2ActivityAuxiliaryReleasePointerV1;
exports.inspectV2ActivityAuxiliaryReleaseIndexPermitV1 = inspectV2ActivityAuxiliaryReleaseIndexPermitV1;
exports.parseV2ActivityAuxiliaryReleasePointerV1 = parseV2ActivityAuxiliaryReleasePointerV1;
exports.encodeV2ActivityAuxiliaryReleasePointerV1 = encodeV2ActivityAuxiliaryReleasePointerV1;
exports.isV2ActivityAuxiliaryReleasePointerV1 = isV2ActivityAuxiliaryReleasePointerV1;
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const activity_auxiliary_release_index_v1_1 = require("../../../modules/learning-v2/runtime/activity_auxiliary_release_index_v1");
exports.V2_ACTIVITY_AUXILIARY_RELEASE_POINTER_SCHEMA_V1 = "v2-activity-auxiliary-release-pointer.v1";
exports.V2_ACTIVITY_AUXILIARY_RELEASE_POINTER_MAX_BYTES_V1 = 32 * 1024;
exports.V2_ACTIVITY_AUXILIARY_RELEASE_POINTER_COLLECTION_V1 = "content_v2_activity_auxiliary_release_pointers";
const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const GENERATION_RE = /^[1-9][0-9]{0,30}$/u;
const POINTER_KEYS = Object.freeze([
    "schemaVersion",
    "environment",
    "releaseId",
    "activeManifestHash",
    "seasonId",
    "episodeId",
    "lessonUnitObject",
    "stageId",
    "activityPackageFingerprint",
    "indexFingerprint",
    "indexObject",
    "repositoryAuthority",
    "runtimeAuthority",
    "publicationAuthority",
    "releaseAuthority",
    "pointerFingerprint",
]);
const OBJECT_KEYS = Object.freeze([
    "path",
    "generation",
    "contentHash",
    "byteSize",
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
    throw new Error("v2_activity_auxiliary_release_pointer_invalid");
}
function isRecord(value) {
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
function exactId(value) {
    if (typeof value !== "string" || !ID_RE.test(value))
        fail();
    return value;
}
function exactHash(value) {
    if (typeof value !== "string" || !HASH_RE.test(value))
        fail();
    return value;
}
function exactObject(value) {
    if (!isRecord(value))
        fail();
    exactKeys(value, OBJECT_KEYS);
    if (typeof value.path !== "string" ||
        value.path.length < 1 ||
        value.path.length > 1024 ||
        value.path.startsWith("/") ||
        value.path.includes("..") ||
        typeof value.generation !== "string" ||
        value.generation.length < 1 ||
        value.generation.length > 160 ||
        !Number.isSafeInteger(value.byteSize) ||
        Number(value.byteSize) < 1)
        fail();
    return Object.freeze({
        path: value.path,
        generation: value.generation,
        contentHash: exactHash(value.contentHash),
        byteSize: Number(value.byteSize),
    });
}
function exactIndexPin(value, index) {
    if (!isRecord(value))
        fail();
    exactKeys(value, PIN_KEYS);
    if (typeof value.objectGeneration !== "string" ||
        !GENERATION_RE.test(value.objectGeneration) ||
        !Number.isSafeInteger(value.byteSize) ||
        Number(value.byteSize) < 1 ||
        Number(value.byteSize) >
            activity_auxiliary_release_index_v1_1.LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_INDEX_MAX_BYTES_V1 ||
        value.contentType !== "application/json; charset=utf-8")
        fail();
    const contentHash = exactHash(value.contentHash);
    const expectedPath = v2ActivityAuxiliaryReleaseIndexObjectPathV1({
        activeManifestHash: index.activeManifestHash,
        episodeId: index.episodeId,
        indexFingerprint: index.indexFingerprint,
        rawHash: contentHash,
    });
    if (value.objectPath !== expectedPath)
        fail();
    return Object.freeze({
        objectPath: expectedPath,
        contentHash,
        objectGeneration: value.objectGeneration,
        byteSize: Number(value.byteSize),
        contentType: "application/json; charset=utf-8",
    });
}
function exactIndexPinFromClaim(value, input) {
    if (!isRecord(value))
        fail();
    exactKeys(value, PIN_KEYS);
    if (typeof value.objectGeneration !== "string" ||
        !GENERATION_RE.test(value.objectGeneration) ||
        !Number.isSafeInteger(value.byteSize) ||
        Number(value.byteSize) < 1 ||
        Number(value.byteSize) >
            activity_auxiliary_release_index_v1_1.LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_INDEX_MAX_BYTES_V1 ||
        value.contentType !== "application/json; charset=utf-8")
        fail();
    const contentHash = exactHash(value.contentHash);
    const expectedPath = v2ActivityAuxiliaryReleaseIndexObjectPathV1({
        ...input,
        rawHash: contentHash,
    });
    if (value.objectPath !== expectedPath)
        fail();
    return Object.freeze({
        objectPath: expectedPath,
        contentHash,
        objectGeneration: value.objectGeneration,
        byteSize: Number(value.byteSize),
        contentType: "application/json; charset=utf-8",
    });
}
function v2ActivityAuxiliaryReleasePointerDocumentPathV1(input) {
    const activeManifestHash = exactHash(input.activeManifestHash);
    const episodeId = exactId(input.episodeId);
    return `${exports.V2_ACTIVITY_AUXILIARY_RELEASE_POINTER_COLLECTION_V1}/${activeManifestHash}__${(0, decision_registry_1.sha256Utf8)(episodeId)}`;
}
function v2ActivityAuxiliaryReleaseIndexObjectPathV1(input) {
    return `learning-v2/activity-auxiliary-release-index/${exactHash(input.activeManifestHash)}/${(0, decision_registry_1.sha256Utf8)(exactId(input.episodeId))}/${exactHash(input.indexFingerprint)}/${exactHash(input.rawHash)}.json`;
}
function materializeV2ActivityAuxiliaryReleasePointerV1(input) {
    const index = (0, activity_auxiliary_release_index_v1_1.parseLearningV2ActivityAuxiliaryReleaseIndexV1)(input.indexRaw);
    if (typeof input.indexObjectGeneration !== "string" ||
        !GENERATION_RE.test(input.indexObjectGeneration))
        fail();
    const rawHash = (0, decision_registry_1.sha256Utf8)(input.indexRaw);
    const body = {
        schemaVersion: exports.V2_ACTIVITY_AUXILIARY_RELEASE_POINTER_SCHEMA_V1,
        environment: index.environment,
        releaseId: index.releaseId,
        activeManifestHash: index.activeManifestHash,
        seasonId: index.seasonId,
        episodeId: index.episodeId,
        lessonUnitObject: index.lessonUnitObject,
        stageId: index.stageId,
        activityPackageFingerprint: index.activityPackageFingerprint,
        indexFingerprint: index.indexFingerprint,
        indexObject: Object.freeze({
            objectPath: v2ActivityAuxiliaryReleaseIndexObjectPathV1({
                activeManifestHash: index.activeManifestHash,
                episodeId: index.episodeId,
                indexFingerprint: index.indexFingerprint,
                rawHash,
            }),
            contentHash: rawHash,
            objectGeneration: input.indexObjectGeneration,
            byteSize: (0, decision_registry_1.utf8ByteLengthV1)(input.indexRaw),
            contentType: "application/json; charset=utf-8",
        }),
        repositoryAuthority: "none_structural_pointer_only",
        runtimeAuthority: "none_admin_readback_required",
        publicationAuthority: "none",
        releaseAuthority: false,
    };
    return parseV2ActivityAuxiliaryReleasePointerV1((0, decision_registry_1.canonicalJsonV1)({ ...body, pointerFingerprint: (0, decision_registry_1.hashCanonicalBody)(body) }), index);
}
function inspectV2ActivityAuxiliaryReleaseIndexPermitV1(raw, expected) {
    if (typeof raw !== "string" ||
        raw.length > exports.V2_ACTIVITY_AUXILIARY_RELEASE_POINTER_MAX_BYTES_V1 ||
        (0, decision_registry_1.utf8ByteLengthV1)(raw) > exports.V2_ACTIVITY_AUXILIARY_RELEASE_POINTER_MAX_BYTES_V1)
        fail();
    let value;
    try {
        value = JSON.parse(raw);
    }
    catch {
        fail();
    }
    if (!isRecord(value) || (0, decision_registry_1.canonicalJsonV1)(value) !== raw)
        fail();
    exactKeys(value, POINTER_KEYS);
    if (value.schemaVersion !== exports.V2_ACTIVITY_AUXILIARY_RELEASE_POINTER_SCHEMA_V1 ||
        value.environment !== expected.environment ||
        value.releaseId !== expected.releaseId ||
        value.activeManifestHash !== expected.activeManifestHash ||
        value.seasonId !== expected.seasonId ||
        value.episodeId !== expected.episodeId ||
        value.repositoryAuthority !== "none_structural_pointer_only" ||
        value.runtimeAuthority !== "none_admin_readback_required" ||
        value.publicationAuthority !== "none" ||
        value.releaseAuthority !== false)
        fail();
    const lessonUnitObject = exactObject(value.lessonUnitObject);
    if ((0, decision_registry_1.canonicalJsonV1)(lessonUnitObject) !==
        (0, decision_registry_1.canonicalJsonV1)(expected.lessonUnitObject))
        fail();
    const stageId = exactId(value.stageId);
    const activityPackageFingerprint = exactHash(value.activityPackageFingerprint);
    const indexFingerprint = exactHash(value.indexFingerprint);
    const indexObject = exactIndexPinFromClaim(value.indexObject, {
        activeManifestHash: expected.activeManifestHash,
        episodeId: expected.episodeId,
        indexFingerprint,
    });
    const body = {
        schemaVersion: exports.V2_ACTIVITY_AUXILIARY_RELEASE_POINTER_SCHEMA_V1,
        environment: expected.environment,
        releaseId: expected.releaseId,
        activeManifestHash: expected.activeManifestHash,
        seasonId: expected.seasonId,
        episodeId: expected.episodeId,
        lessonUnitObject,
        stageId,
        activityPackageFingerprint,
        indexFingerprint,
        indexObject,
        repositoryAuthority: "none_structural_pointer_only",
        runtimeAuthority: "none_admin_readback_required",
        publicationAuthority: "none",
        releaseAuthority: false,
    };
    if ((0, decision_registry_1.hashCanonicalBody)(body) !== exactHash(value.pointerFingerprint))
        fail();
    return Object.freeze({
        environment: expected.environment,
        releaseId: expected.releaseId,
        activeManifestHash: expected.activeManifestHash,
        seasonId: expected.seasonId,
        episodeId: expected.episodeId,
        lessonUnitObject,
        stageId,
        activityPackageFingerprint,
        indexFingerprint,
        indexObject,
        permitAuthority: "none_untrusted_read_permit_only",
    });
}
function parseV2ActivityAuxiliaryReleasePointerV1(raw, index) {
    if (typeof raw !== "string" ||
        raw.length > exports.V2_ACTIVITY_AUXILIARY_RELEASE_POINTER_MAX_BYTES_V1 ||
        (0, decision_registry_1.utf8ByteLengthV1)(raw) > exports.V2_ACTIVITY_AUXILIARY_RELEASE_POINTER_MAX_BYTES_V1)
        fail();
    let value;
    try {
        value = JSON.parse(raw);
    }
    catch {
        fail();
    }
    if (!isRecord(value) || (0, decision_registry_1.canonicalJsonV1)(value) !== raw)
        fail();
    exactKeys(value, POINTER_KEYS);
    if (value.schemaVersion !== exports.V2_ACTIVITY_AUXILIARY_RELEASE_POINTER_SCHEMA_V1 ||
        value.environment !== index.environment ||
        value.releaseId !== index.releaseId ||
        value.activeManifestHash !== index.activeManifestHash ||
        value.seasonId !== index.seasonId ||
        value.episodeId !== index.episodeId ||
        value.stageId !== index.stageId ||
        value.activityPackageFingerprint !== index.activityPackageFingerprint ||
        value.indexFingerprint !== index.indexFingerprint ||
        value.repositoryAuthority !== "none_structural_pointer_only" ||
        value.runtimeAuthority !== "none_admin_readback_required" ||
        value.publicationAuthority !== "none" ||
        value.releaseAuthority !== false)
        fail();
    const lessonUnitObject = exactObject(value.lessonUnitObject);
    if ((0, decision_registry_1.canonicalJsonV1)(lessonUnitObject) !==
        (0, decision_registry_1.canonicalJsonV1)(index.lessonUnitObject))
        fail();
    const body = {
        schemaVersion: exports.V2_ACTIVITY_AUXILIARY_RELEASE_POINTER_SCHEMA_V1,
        environment: index.environment,
        releaseId: index.releaseId,
        activeManifestHash: index.activeManifestHash,
        seasonId: index.seasonId,
        episodeId: index.episodeId,
        lessonUnitObject,
        stageId: index.stageId,
        activityPackageFingerprint: index.activityPackageFingerprint,
        indexFingerprint: index.indexFingerprint,
        indexObject: exactIndexPin(value.indexObject, index),
        repositoryAuthority: "none_structural_pointer_only",
        runtimeAuthority: "none_admin_readback_required",
        publicationAuthority: "none",
        releaseAuthority: false,
    };
    const pointerFingerprint = exactHash(value.pointerFingerprint);
    if ((0, decision_registry_1.hashCanonicalBody)(body) !== pointerFingerprint)
        fail();
    const pointer = Object.freeze({ ...body, pointerFingerprint });
    handles.add(pointer);
    return pointer;
}
function encodeV2ActivityAuxiliaryReleasePointerV1(pointer) {
    if (!isV2ActivityAuxiliaryReleasePointerV1(pointer))
        fail();
    return (0, decision_registry_1.canonicalJsonV1)(pointer);
}
function isV2ActivityAuxiliaryReleasePointerV1(value) {
    return typeof value === "object" && value !== null && handles.has(value);
}
//# sourceMappingURL=v2_activity_auxiliary_release_pointer_v1.js.map