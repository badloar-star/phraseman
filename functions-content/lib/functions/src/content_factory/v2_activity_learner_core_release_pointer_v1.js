"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_ACTIVITY_LEARNER_CORE_RELEASE_POINTER_COLLECTION_V1 = exports.V2_ACTIVITY_LEARNER_CORE_RELEASE_POINTER_MAX_BYTES_V1 = exports.V2_ACTIVITY_LEARNER_CORE_RELEASE_POINTER_SCHEMA_V1 = void 0;
exports.v2ActivityLearnerCoreReleasePointerDocumentPathV1 = v2ActivityLearnerCoreReleasePointerDocumentPathV1;
exports.v2ActivityLearnerCoreReleaseIndexObjectPathV1 = v2ActivityLearnerCoreReleaseIndexObjectPathV1;
exports.materializeV2ActivityLearnerCoreReleasePointerV1 = materializeV2ActivityLearnerCoreReleasePointerV1;
exports.inspectV2ActivityLearnerCoreReleaseIndexPermitV1 = inspectV2ActivityLearnerCoreReleaseIndexPermitV1;
exports.parseV2ActivityLearnerCoreReleasePointerV1 = parseV2ActivityLearnerCoreReleasePointerV1;
exports.encodeV2ActivityLearnerCoreReleasePointerV1 = encodeV2ActivityLearnerCoreReleasePointerV1;
exports.isV2ActivityLearnerCoreReleasePointerV1 = isV2ActivityLearnerCoreReleasePointerV1;
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const activity_learner_core_release_index_v1_1 = require("../../../modules/learning-v2/runtime/activity_learner_core_release_index_v1");
exports.V2_ACTIVITY_LEARNER_CORE_RELEASE_POINTER_SCHEMA_V1 = "v2-activity-learner-core-release-pointer.v1";
exports.V2_ACTIVITY_LEARNER_CORE_RELEASE_POINTER_MAX_BYTES_V1 = 32 * 1024;
exports.V2_ACTIVITY_LEARNER_CORE_RELEASE_POINTER_COLLECTION_V1 = "content_v2_activity_learner_core_release_pointers";
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
const PIN_KEYS = Object.freeze([
    "objectPath",
    "contentHash",
    "objectGeneration",
    "byteSize",
    "contentType",
]);
const handles = new WeakSet();
function fail() {
    throw new Error("v2_activity_learner_core_release_pointer_invalid");
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
function id(value) {
    if (typeof value !== "string" || !ID_RE.test(value))
        fail();
    return value;
}
function hash(value) {
    if (typeof value !== "string" || !HASH_RE.test(value))
        fail();
    return value;
}
function v2ActivityLearnerCoreReleasePointerDocumentPathV1(input) {
    return `${exports.V2_ACTIVITY_LEARNER_CORE_RELEASE_POINTER_COLLECTION_V1}/${hash(input.activeManifestHash)}__${(0, decision_registry_1.sha256Utf8)(id(input.episodeId))}`;
}
function v2ActivityLearnerCoreReleaseIndexObjectPathV1(input) {
    return `learning-v2/activity-learner-core-release-index/${hash(input.activeManifestHash)}/${(0, decision_registry_1.sha256Utf8)(id(input.episodeId))}/${hash(input.indexFingerprint)}/${hash(input.rawHash)}.json`;
}
function indexPin(value, expected) {
    if (!record(value))
        fail();
    exactKeys(value, PIN_KEYS);
    if (typeof value.objectGeneration !== "string" ||
        !GENERATION_RE.test(value.objectGeneration) ||
        !Number.isSafeInteger(value.byteSize) ||
        Number(value.byteSize) < 1 ||
        Number(value.byteSize) >
            activity_learner_core_release_index_v1_1.LEARNING_V2_ACTIVITY_LEARNER_CORE_RELEASE_INDEX_MAX_BYTES_V1 ||
        value.contentType !== "application/json; charset=utf-8")
        fail();
    const contentHash = hash(value.contentHash);
    const objectPath = v2ActivityLearnerCoreReleaseIndexObjectPathV1({
        ...expected,
        rawHash: contentHash,
    });
    if (value.objectPath !== objectPath)
        fail();
    return Object.freeze({
        objectPath,
        contentHash,
        objectGeneration: value.objectGeneration,
        byteSize: Number(value.byteSize),
        contentType: "application/json; charset=utf-8",
    });
}
function body(value, expected) {
    exactKeys(value, POINTER_KEYS);
    if (value.schemaVersion !==
        exports.V2_ACTIVITY_LEARNER_CORE_RELEASE_POINTER_SCHEMA_V1 ||
        !["lab", "staging", "production"].includes(String(value.environment)) ||
        value.repositoryAuthority !== "none_structural_pointer_only" ||
        value.runtimeAuthority !== "none_admin_readback_required" ||
        value.publicationAuthority !== "none" ||
        value.releaseAuthority !== false)
        fail();
    const parsed = {
        schemaVersion: exports.V2_ACTIVITY_LEARNER_CORE_RELEASE_POINTER_SCHEMA_V1,
        environment: value.environment,
        releaseId: id(value.releaseId),
        activeManifestHash: hash(value.activeManifestHash),
        seasonId: id(value.seasonId),
        episodeId: id(value.episodeId),
        stageId: id(value.stageId),
        activityPackageFingerprint: hash(value.activityPackageFingerprint),
        indexFingerprint: hash(value.indexFingerprint),
        repositoryAuthority: "none_structural_pointer_only",
        runtimeAuthority: "none_admin_readback_required",
        publicationAuthority: "none",
        releaseAuthority: false,
    };
    if (expected &&
        (parsed.environment !== expected.environment ||
            parsed.releaseId !== expected.releaseId ||
            parsed.activeManifestHash !== expected.activeManifestHash ||
            parsed.seasonId !== expected.seasonId ||
            parsed.episodeId !== expected.episodeId ||
            parsed.stageId !== expected.stageId ||
            parsed.activityPackageFingerprint !==
                expected.activityPackageFingerprint ||
            parsed.indexFingerprint !== expected.indexFingerprint))
        fail();
    return Object.freeze({
        ...parsed,
        indexObject: indexPin(value.indexObject, parsed),
    });
}
function materializeV2ActivityLearnerCoreReleasePointerV1(input) {
    const index = (0, activity_learner_core_release_index_v1_1.parseLearningV2ActivityLearnerCoreReleaseIndexV1)(input.indexRaw);
    if (!GENERATION_RE.test(input.indexObjectGeneration))
        fail();
    const rawHash = (0, decision_registry_1.sha256Utf8)(input.indexRaw);
    const value = {
        schemaVersion: exports.V2_ACTIVITY_LEARNER_CORE_RELEASE_POINTER_SCHEMA_V1,
        environment: index.environment,
        releaseId: index.releaseId,
        activeManifestHash: index.activeManifestHash,
        seasonId: index.seasonId,
        episodeId: index.episodeId,
        stageId: index.stageId,
        activityPackageFingerprint: index.activityPackageFingerprint,
        indexFingerprint: index.indexFingerprint,
        indexObject: {
            objectPath: v2ActivityLearnerCoreReleaseIndexObjectPathV1({
                activeManifestHash: index.activeManifestHash,
                episodeId: index.episodeId,
                indexFingerprint: index.indexFingerprint,
                rawHash,
            }),
            contentHash: rawHash,
            objectGeneration: input.indexObjectGeneration,
            byteSize: (0, decision_registry_1.utf8ByteLengthV1)(input.indexRaw),
            contentType: "application/json; charset=utf-8",
        },
        repositoryAuthority: "none_structural_pointer_only",
        runtimeAuthority: "none_admin_readback_required",
        publicationAuthority: "none",
        releaseAuthority: false,
    };
    return parseV2ActivityLearnerCoreReleasePointerV1((0, decision_registry_1.canonicalJsonV1)({ ...value, pointerFingerprint: (0, decision_registry_1.hashCanonicalBody)(value) }), index);
}
function inspectV2ActivityLearnerCoreReleaseIndexPermitV1(raw, expected) {
    const value = parseRaw(raw);
    const parsed = body(value);
    if (parsed.environment !== expected.environment ||
        parsed.releaseId !== expected.releaseId ||
        parsed.activeManifestHash !== expected.activeManifestHash ||
        parsed.seasonId !== expected.seasonId ||
        parsed.episodeId !== expected.episodeId ||
        (0, decision_registry_1.hashCanonicalBody)(parsed) !== hash(value.pointerFingerprint))
        fail();
    return Object.freeze({
        environment: parsed.environment,
        releaseId: parsed.releaseId,
        activeManifestHash: parsed.activeManifestHash,
        seasonId: parsed.seasonId,
        episodeId: parsed.episodeId,
        stageId: parsed.stageId,
        activityPackageFingerprint: parsed.activityPackageFingerprint,
        indexFingerprint: parsed.indexFingerprint,
        indexObject: parsed.indexObject,
        permitAuthority: "none_untrusted_read_permit_only",
    });
}
function parseRaw(raw) {
    if (typeof raw !== "string" ||
        raw.length > exports.V2_ACTIVITY_LEARNER_CORE_RELEASE_POINTER_MAX_BYTES_V1 ||
        (0, decision_registry_1.utf8ByteLengthV1)(raw) >
            exports.V2_ACTIVITY_LEARNER_CORE_RELEASE_POINTER_MAX_BYTES_V1)
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
    return value;
}
function parseV2ActivityLearnerCoreReleasePointerV1(raw, index) {
    const value = parseRaw(raw);
    const parsedBody = body(value, index);
    const pointerFingerprint = hash(value.pointerFingerprint);
    if ((0, decision_registry_1.hashCanonicalBody)(parsedBody) !== pointerFingerprint)
        fail();
    const result = Object.freeze({ ...parsedBody, pointerFingerprint });
    handles.add(result);
    return result;
}
function encodeV2ActivityLearnerCoreReleasePointerV1(pointer) {
    if (!isV2ActivityLearnerCoreReleasePointerV1(pointer))
        fail();
    return (0, decision_registry_1.canonicalJsonV1)(pointer);
}
function isV2ActivityLearnerCoreReleasePointerV1(value) {
    return typeof value === "object" && value !== null && handles.has(value);
}
//# sourceMappingURL=v2_activity_learner_core_release_pointer_v1.js.map