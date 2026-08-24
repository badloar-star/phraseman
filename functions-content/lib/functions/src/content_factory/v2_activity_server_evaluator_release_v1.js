"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_POINTER_COLLECTION_V1 = exports.V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_POINTER_MAX_BYTES_V1 = exports.V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_INDEX_MAX_BYTES_V1 = exports.V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_POINTER_SCHEMA_V1 = exports.V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_INDEX_SCHEMA_V1 = void 0;
exports.parseV2ActivityServerEvaluatorReleaseIndexV1 = parseV2ActivityServerEvaluatorReleaseIndexV1;
exports.materializeV2ActivityServerEvaluatorReleaseIndexV1 = materializeV2ActivityServerEvaluatorReleaseIndexV1;
exports.encodeV2ActivityServerEvaluatorReleaseIndexV1 = encodeV2ActivityServerEvaluatorReleaseIndexV1;
exports.v2ActivityServerEvaluatorReleaseIndexObjectPathV1 = v2ActivityServerEvaluatorReleaseIndexObjectPathV1;
exports.v2ActivityServerEvaluatorReleasePointerDocumentPathV1 = v2ActivityServerEvaluatorReleasePointerDocumentPathV1;
exports.materializeV2ActivityServerEvaluatorReleasePointerV1 = materializeV2ActivityServerEvaluatorReleasePointerV1;
exports.parseV2ActivityServerEvaluatorReleasePointerV1 = parseV2ActivityServerEvaluatorReleasePointerV1;
exports.encodeV2ActivityServerEvaluatorReleasePointerV1 = encodeV2ActivityServerEvaluatorReleasePointerV1;
const release_manifest_1 = require("../../../modules/learning-v2/content/release_manifest");
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const v2_activity_session_projection_1 = require("./v2_activity_session_projection");
const v2_activity_instances_package_v2_1 = require("./v2_activity_instances_package_v2");
exports.V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_INDEX_SCHEMA_V1 = "v2-activity-server-evaluator-release-index.v1";
exports.V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_POINTER_SCHEMA_V1 = "v2-activity-server-evaluator-release-pointer.v1";
exports.V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_INDEX_MAX_BYTES_V1 = 128 * 1024;
exports.V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_POINTER_MAX_BYTES_V1 = 32 * 1024;
exports.V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_POINTER_COLLECTION_V1 = "content_v2_activity_server_evaluator_release_pointers";
const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const GENERATION_RE = /^[1-9][0-9]{0,30}$/u;
const RESERVED = new Set(["__proto__", "prototype", "constructor"]);
const indexHandles = new WeakSet();
const pointerHandles = new WeakSet();
const INDEX_KEYS = Object.freeze([
    "schemaVersion",
    "environment",
    "releaseId",
    "activeManifestHash",
    "seasonId",
    "studyTarget",
    "learnerSourceLocale",
    "episodeId",
    "stageId",
    "activityPackageFingerprint",
    "validatorSummaryFingerprint",
    "sessions",
    "sessionCount",
    "objectCount",
    "serverOnly",
    "clientDelivery",
    "evaluatorKeyAuthority",
    "evaluationAuthority",
    "walletAuthority",
    "masteryAuthority",
    "evidenceAuthority",
    "completionAuthority",
    "publicationAuthority",
    "releaseAuthority",
    "indexFingerprint",
]);
const SESSION_KEYS = Object.freeze([
    "sessionId",
    "sessionOrdinal",
    "sourceFingerprint",
    "sidecarFingerprint",
    "commitmentAggregate",
    "sidecar",
]);
const PIN_KEYS = Object.freeze([
    "objectPath",
    "contentHash",
    "objectGeneration",
    "byteSize",
    "contentType",
]);
const SIDECAR_KEYS = Object.freeze([
    "schemaVersion",
    "sourceFingerprint",
    "episodeId",
    "sessionId",
    "sessionOrdinal",
    "tasks",
    "commitmentAggregate",
    "serverOnly",
    "evaluationAuthority",
    "rewardAuthority",
    "releaseAuthority",
]);
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
    "serverOnly",
    "clientDelivery",
    "repositoryAuthority",
    "evaluationAuthority",
    "publicationAuthority",
    "releaseAuthority",
    "pointerFingerprint",
]);
function fail() {
    throw new Error("v2_activity_server_evaluator_release_invalid");
}
function record(value) {
    return (typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype);
}
function exactKeys(value, expected) {
    const keys = Reflect.ownKeys(value);
    if (keys.length !== expected.length ||
        keys.some((key) => typeof key !== "string" || !expected.includes(key)))
        fail();
}
function id(value) {
    if (typeof value !== "string" || !ID_RE.test(value) || RESERVED.has(value))
        fail();
    return value;
}
function hash(value) {
    if (typeof value !== "string" || !HASH_RE.test(value))
        fail();
    return value;
}
function canonical(raw, maximumBytes) {
    if (typeof raw !== "string" ||
        raw.length > maximumBytes ||
        (0, decision_registry_1.utf8ByteLengthV1)(raw) > maximumBytes)
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
function parsePin(value, stageId, sessionOrdinal, expectedRaw) {
    if (!record(value))
        fail();
    exactKeys(value, PIN_KEYS);
    const contentHash = hash(value.contentHash);
    if (value.objectPath !==
        (0, v2_activity_instances_package_v2_1.v2ActivitySessionProjectionObjectPath)(stageId, sessionOrdinal, "sidecar", contentHash) ||
        typeof value.objectGeneration !== "string" ||
        !GENERATION_RE.test(value.objectGeneration) ||
        !Number.isSafeInteger(value.byteSize) ||
        Number(value.byteSize) < 1 ||
        Number(value.byteSize) > v2_activity_session_projection_1.V2_ACTIVITY_SESSION_SIDECAR_MAX_BYTES ||
        value.contentType !== "application/json; charset=utf-8" ||
        (expectedRaw !== undefined &&
            ((0, decision_registry_1.sha256Utf8)(expectedRaw) !== contentHash ||
                (0, decision_registry_1.utf8ByteLengthV1)(expectedRaw) !== value.byteSize)))
        fail();
    return Object.freeze({
        objectPath: value.objectPath,
        contentHash,
        objectGeneration: value.objectGeneration,
        byteSize: Number(value.byteSize),
        contentType: "application/json; charset=utf-8",
    });
}
function parseSidecar(raw, episodeId, expectedSessionId, expectedOrdinal) {
    const value = canonical(raw, v2_activity_session_projection_1.V2_ACTIVITY_SESSION_SIDECAR_MAX_BYTES);
    exactKeys(value, SIDECAR_KEYS);
    if (value.schemaVersion !== v2_activity_session_projection_1.V2_ACTIVITY_SESSION_SIDECAR_SCHEMA_V2 ||
        value.episodeId !== episodeId ||
        value.sessionId !== expectedSessionId ||
        value.sessionOrdinal !== expectedOrdinal ||
        !Array.isArray(value.tasks) ||
        value.tasks.length !== 12 ||
        value.serverOnly !== true ||
        value.evaluationAuthority !== "none" ||
        value.rewardAuthority !== "none" ||
        value.releaseAuthority !== false)
        fail();
    return Object.freeze({
        sourceFingerprint: hash(value.sourceFingerprint),
        commitmentAggregate: hash(value.commitmentAggregate),
        sidecarFingerprint: (0, decision_registry_1.hashCanonicalBody)(value),
    });
}
function parseSession(value, stageId, episodeId, expectedOrdinal) {
    if (!record(value))
        fail();
    exactKeys(value, SESSION_KEYS);
    if (value.sessionOrdinal !== expectedOrdinal)
        fail();
    const sessionId = id(value.sessionId);
    return Object.freeze({
        sessionId,
        sessionOrdinal: expectedOrdinal,
        sourceFingerprint: hash(value.sourceFingerprint),
        sidecarFingerprint: hash(value.sidecarFingerprint),
        commitmentAggregate: hash(value.commitmentAggregate),
        sidecar: parsePin(value.sidecar, stageId, expectedOrdinal),
    });
}
function parseV2ActivityServerEvaluatorReleaseIndexV1(raw) {
    const value = canonical(raw, exports.V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_INDEX_MAX_BYTES_V1);
    exactKeys(value, INDEX_KEYS);
    if (value.schemaVersion !==
        exports.V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_INDEX_SCHEMA_V1 ||
        !["lab", "staging", "production"].includes(String(value.environment)) ||
        !Array.isArray(value.sessions) ||
        value.sessions.length !== 12 ||
        value.sessionCount !== 12 ||
        value.objectCount !== 12 ||
        value.serverOnly !== true ||
        value.clientDelivery !== "forbidden" ||
        value.evaluatorKeyAuthority !== "candidate_data_only" ||
        value.evaluationAuthority !== "none_server_policy_required" ||
        value.walletAuthority !== "none" ||
        value.masteryAuthority !== "none" ||
        value.evidenceAuthority !== "none" ||
        value.completionAuthority !== "none" ||
        value.publicationAuthority !== "none" ||
        value.releaseAuthority !== false)
        fail();
    const stageId = id(value.stageId);
    const episodeId = id(value.episodeId);
    const sessions = Object.freeze(value.sessions.map((session, index) => parseSession(session, stageId, episodeId, index + 1)));
    if (new Set(sessions.map((session) => session.sessionId)).size !== 12)
        fail();
    const body = Object.freeze({
        schemaVersion: exports.V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_INDEX_SCHEMA_V1,
        environment: value.environment,
        releaseId: id(value.releaseId),
        activeManifestHash: hash(value.activeManifestHash),
        seasonId: id(value.seasonId),
        studyTarget: id(value.studyTarget),
        learnerSourceLocale: id(value.learnerSourceLocale),
        episodeId,
        stageId,
        activityPackageFingerprint: hash(value.activityPackageFingerprint),
        validatorSummaryFingerprint: hash(value.validatorSummaryFingerprint),
        sessions,
        sessionCount: 12,
        objectCount: 12,
        serverOnly: true,
        clientDelivery: "forbidden",
        evaluatorKeyAuthority: "candidate_data_only",
        evaluationAuthority: "none_server_policy_required",
        walletAuthority: "none",
        masteryAuthority: "none",
        evidenceAuthority: "none",
        completionAuthority: "none",
        publicationAuthority: "none",
        releaseAuthority: false,
    });
    const indexFingerprint = hash(value.indexFingerprint);
    if ((0, decision_registry_1.hashCanonicalBody)(body) !== indexFingerprint)
        fail();
    const result = Object.freeze({ ...body, indexFingerprint });
    indexHandles.add(result);
    return result;
}
function materializeV2ActivityServerEvaluatorReleaseIndexV1(input) {
    const validation = (0, release_manifest_1.validatePublishedV2SeasonManifest)(input.publishedView, input.expectedEnvironment);
    if (!validation.ok || input.sessions.length !== 12)
        fail();
    const release = (0, release_manifest_1.resolveV2ReleaseManifest)(input.publishedView.activePointer, input.publishedView.manifestRecord, input.publishedView.manifestBody, input.expectedEnvironment);
    const episodeId = id(input.episodeId);
    const stageId = id(input.stageId);
    if (release.body.lessonUnits.filter((unit) => unit.episodeId === episodeId)
        .length !== 1)
        fail();
    const sessions = Object.freeze(input.sessions.map((session, index) => {
        if (!record(session) || session.sessionOrdinal !== index + 1)
            fail();
        const sessionId = id(session.sessionId);
        const sidecar = parseSidecar(session.sidecarRaw, episodeId, sessionId, index + 1);
        return Object.freeze({
            sessionId,
            sessionOrdinal: index + 1,
            sourceFingerprint: sidecar.sourceFingerprint,
            sidecarFingerprint: sidecar.sidecarFingerprint,
            commitmentAggregate: sidecar.commitmentAggregate,
            sidecar: parsePin(session.sidecarPin, stageId, index + 1, session.sidecarRaw),
        });
    }));
    const body = Object.freeze({
        schemaVersion: exports.V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_INDEX_SCHEMA_V1,
        environment: release.pointer.environment,
        releaseId: release.pointer.activeReleaseId,
        activeManifestHash: release.pointer.activeManifestHash,
        seasonId: release.pointer.seasonId,
        studyTarget: release.pointer.studyTarget,
        learnerSourceLocale: release.pointer.learnerSourceLocale,
        episodeId,
        stageId,
        activityPackageFingerprint: hash(input.activityPackageFingerprint),
        validatorSummaryFingerprint: hash(input.validatorSummaryFingerprint),
        sessions,
        sessionCount: 12,
        objectCount: 12,
        serverOnly: true,
        clientDelivery: "forbidden",
        evaluatorKeyAuthority: "candidate_data_only",
        evaluationAuthority: "none_server_policy_required",
        walletAuthority: "none",
        masteryAuthority: "none",
        evidenceAuthority: "none",
        completionAuthority: "none",
        publicationAuthority: "none",
        releaseAuthority: false,
    });
    return parseV2ActivityServerEvaluatorReleaseIndexV1((0, decision_registry_1.canonicalJsonV1)({ ...body, indexFingerprint: (0, decision_registry_1.hashCanonicalBody)(body) }));
}
function encodeV2ActivityServerEvaluatorReleaseIndexV1(index) {
    if (!indexHandles.has(index))
        fail();
    return (0, decision_registry_1.canonicalJsonV1)(index);
}
function v2ActivityServerEvaluatorReleaseIndexObjectPathV1(input) {
    return `learning-v2/activity-server-evaluator-release-index/${hash(input.activeManifestHash)}/${(0, decision_registry_1.sha256Utf8)(id(input.episodeId))}/${hash(input.indexFingerprint)}/${hash(input.rawHash)}.json`;
}
function v2ActivityServerEvaluatorReleasePointerDocumentPathV1(input) {
    return `${exports.V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_POINTER_COLLECTION_V1}/${hash(input.activeManifestHash)}__${(0, decision_registry_1.sha256Utf8)(id(input.episodeId))}`;
}
function materializeV2ActivityServerEvaluatorReleasePointerV1(input) {
    const index = parseV2ActivityServerEvaluatorReleaseIndexV1(input.indexRaw);
    if (!GENERATION_RE.test(input.indexObjectGeneration))
        fail();
    const rawHash = (0, decision_registry_1.sha256Utf8)(input.indexRaw);
    const body = Object.freeze({
        schemaVersion: exports.V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_POINTER_SCHEMA_V1,
        environment: index.environment,
        releaseId: index.releaseId,
        activeManifestHash: index.activeManifestHash,
        seasonId: index.seasonId,
        episodeId: index.episodeId,
        stageId: index.stageId,
        activityPackageFingerprint: index.activityPackageFingerprint,
        indexFingerprint: index.indexFingerprint,
        indexObject: Object.freeze({
            objectPath: v2ActivityServerEvaluatorReleaseIndexObjectPathV1({
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
        serverOnly: true,
        clientDelivery: "forbidden",
        repositoryAuthority: "none_admin_readback_required",
        evaluationAuthority: "none_server_policy_required",
        publicationAuthority: "none",
        releaseAuthority: false,
    });
    return parseV2ActivityServerEvaluatorReleasePointerV1((0, decision_registry_1.canonicalJsonV1)({ ...body, pointerFingerprint: (0, decision_registry_1.hashCanonicalBody)(body) }), index);
}
function parseV2ActivityServerEvaluatorReleasePointerV1(raw, expectedIndex) {
    const value = canonical(raw, exports.V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_POINTER_MAX_BYTES_V1);
    exactKeys(value, POINTER_KEYS);
    if (value.schemaVersion !==
        exports.V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_POINTER_SCHEMA_V1 ||
        !["lab", "staging", "production"].includes(String(value.environment)) ||
        value.serverOnly !== true ||
        value.clientDelivery !== "forbidden" ||
        value.repositoryAuthority !== "none_admin_readback_required" ||
        value.evaluationAuthority !== "none_server_policy_required" ||
        value.publicationAuthority !== "none" ||
        value.releaseAuthority !== false)
        fail();
    const identity = Object.freeze({
        environment: value.environment,
        releaseId: id(value.releaseId),
        activeManifestHash: hash(value.activeManifestHash),
        seasonId: id(value.seasonId),
        episodeId: id(value.episodeId),
        stageId: id(value.stageId),
        activityPackageFingerprint: hash(value.activityPackageFingerprint),
        indexFingerprint: hash(value.indexFingerprint),
    });
    if (expectedIndex &&
        (identity.environment !== expectedIndex.environment ||
            identity.releaseId !== expectedIndex.releaseId ||
            identity.activeManifestHash !== expectedIndex.activeManifestHash ||
            identity.seasonId !== expectedIndex.seasonId ||
            identity.episodeId !== expectedIndex.episodeId ||
            identity.stageId !== expectedIndex.stageId ||
            identity.activityPackageFingerprint !==
                expectedIndex.activityPackageFingerprint ||
            identity.indexFingerprint !== expectedIndex.indexFingerprint))
        fail();
    if (!record(value.indexObject))
        fail();
    exactKeys(value.indexObject, PIN_KEYS);
    const rawHash = hash(value.indexObject.contentHash);
    if (value.indexObject.objectPath !==
        v2ActivityServerEvaluatorReleaseIndexObjectPathV1({
            activeManifestHash: identity.activeManifestHash,
            episodeId: identity.episodeId,
            indexFingerprint: identity.indexFingerprint,
            rawHash,
        }) ||
        typeof value.indexObject.objectGeneration !== "string" ||
        !GENERATION_RE.test(value.indexObject.objectGeneration) ||
        !Number.isSafeInteger(value.indexObject.byteSize) ||
        Number(value.indexObject.byteSize) < 1 ||
        Number(value.indexObject.byteSize) >
            exports.V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_INDEX_MAX_BYTES_V1 ||
        value.indexObject.contentType !== "application/json; charset=utf-8")
        fail();
    const body = Object.freeze({
        schemaVersion: exports.V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_POINTER_SCHEMA_V1,
        ...identity,
        indexObject: Object.freeze({
            objectPath: value.indexObject.objectPath,
            contentHash: rawHash,
            objectGeneration: value.indexObject.objectGeneration,
            byteSize: Number(value.indexObject.byteSize),
            contentType: "application/json; charset=utf-8",
        }),
        serverOnly: true,
        clientDelivery: "forbidden",
        repositoryAuthority: "none_admin_readback_required",
        evaluationAuthority: "none_server_policy_required",
        publicationAuthority: "none",
        releaseAuthority: false,
    });
    const pointerFingerprint = hash(value.pointerFingerprint);
    if ((0, decision_registry_1.hashCanonicalBody)(body) !== pointerFingerprint)
        fail();
    const result = Object.freeze({ ...body, pointerFingerprint });
    pointerHandles.add(result);
    return result;
}
function encodeV2ActivityServerEvaluatorReleasePointerV1(pointer) {
    if (!pointerHandles.has(pointer))
        fail();
    return (0, decision_registry_1.canonicalJsonV1)(pointer);
}
//# sourceMappingURL=v2_activity_server_evaluator_release_v1.js.map