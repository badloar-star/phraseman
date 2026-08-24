"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_HANDLE_SCHEMA_V1 = exports.LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_INDEX_MAX_BYTES_V1 = exports.LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_INDEX_SCHEMA_V1 = void 0;
exports.learningV2ActivityAuxiliarySessionManifestObjectPathV1 = learningV2ActivityAuxiliarySessionManifestObjectPathV1;
exports.materializeLearningV2ActivityAuxiliaryReleaseIndexV1 = materializeLearningV2ActivityAuxiliaryReleaseIndexV1;
exports.parseLearningV2ActivityAuxiliaryReleaseIndexV1 = parseLearningV2ActivityAuxiliaryReleaseIndexV1;
exports.encodeLearningV2ActivityAuxiliaryReleaseIndexV1 = encodeLearningV2ActivityAuxiliaryReleaseIndexV1;
exports.isLearningV2ActivityAuxiliaryReleaseIndexV1 = isLearningV2ActivityAuxiliaryReleaseIndexV1;
exports.bindLearningV2ActivityAuxiliaryIntegrityToReleaseV1 = bindLearningV2ActivityAuxiliaryIntegrityToReleaseV1;
exports.isLearningV2ActivityAuxiliaryReleaseHandleV1 = isLearningV2ActivityAuxiliaryReleaseHandleV1;
exports.getLearningV2ActivityAuxiliaryReleaseSummaryV1 = getLearningV2ActivityAuxiliaryReleaseSummaryV1;
exports.resolveLearningV2ActivityAuxiliaryIntegrityFromReleaseV1 = resolveLearningV2ActivityAuxiliaryIntegrityFromReleaseV1;
const release_manifest_1 = require("../content/release_manifest");
const decision_registry_1 = require("../policies/decision_registry");
const activity_auxiliary_integrity_loader_v1_1 = require("./activity_auxiliary_integrity_loader_v1");
const activity_auxiliary_release_manifest_v1_1 = require("./activity_auxiliary_release_manifest_v1");
exports.LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_INDEX_SCHEMA_V1 = "learning-v2-activity-auxiliary-release-index.v1";
exports.LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_INDEX_MAX_BYTES_V1 = 256 * 1024;
exports.LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_HANDLE_SCHEMA_V1 = "learning-v2-activity-auxiliary-release-handle.v1";
const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const GENERATION_RE = /^[A-Za-z0-9._:-]{1,160}$/u;
const CODE_RE = /^[a-z]{2,12}(?:-[A-Z]{2})?$/u;
const RESERVED_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const INDEX_KEYS = Object.freeze([
    "schemaVersion",
    "environment",
    "releaseId",
    "activeManifestHash",
    "seasonId",
    "studyTarget",
    "learnerSourceLocale",
    "episodeId",
    "lessonId",
    "lessonUnitObject",
    "stageId",
    "activityPackageFingerprint",
    "sessions",
    "sessionCount",
    "releaseIdentityEvidence",
    "repositoryOriginAuthority",
    "storageAuthority",
    "runtimeAuthority",
    "walletAuthority",
    "masteryAuthority",
    "evidenceAuthority",
    "publicationAuthority",
    "releaseAuthority",
    "indexFingerprint",
]);
const SESSION_KEYS = Object.freeze([
    "sessionId",
    "sessionOrdinal",
    "sourceFingerprint",
    "renderFingerprint",
    "manifestFingerprint",
    "objectPath",
    "contentHash",
    "objectGeneration",
    "byteSize",
    "contentType",
]);
const OBJECT_KEYS = Object.freeze([
    "path",
    "generation",
    "contentHash",
    "byteSize",
]);
const indexHandles = new WeakSet();
const releaseHandles = new WeakSet();
const releaseMaterial = new WeakMap();
function fail(code = "learning_v2_activity_auxiliary_release_index_invalid") {
    throw new Error(code);
}
function isPlainObject(value) {
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
    if (typeof value !== "string" ||
        !ID_RE.test(value) ||
        RESERVED_KEYS.has(value))
        fail();
    return value;
}
function exactHash(value) {
    if (typeof value !== "string" || !HASH_RE.test(value))
        fail();
    return value;
}
function preflight(root) {
    const stack = [
        { value: root, depth: 1 },
    ];
    let nodes = 0;
    while (stack.length > 0) {
        const current = stack.pop();
        nodes += 1;
        if (nodes > 4096 || current.depth > 24)
            fail();
        if (typeof current.value === "number") {
            if (!Number.isFinite(current.value) ||
                Object.is(current.value, -0) ||
                (Number.isInteger(current.value) &&
                    !Number.isSafeInteger(current.value)))
                fail();
        }
        else if (typeof current.value === "string") {
            if (current.value.length > 4096 ||
                current.value !== current.value.normalize("NFC") ||
                /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/u.test(current.value))
                fail();
        }
        else if (Array.isArray(current.value)) {
            if (current.value.length > 64)
                fail();
            for (const value of current.value)
                stack.push({ value, depth: current.depth + 1 });
        }
        else if (current.value !== null && typeof current.value === "object") {
            if (!isPlainObject(current.value))
                fail();
            const entries = Object.entries(current.value);
            if (entries.length > 64)
                fail();
            for (const [key, value] of entries) {
                if (RESERVED_KEYS.has(key))
                    fail();
                stack.push({ value, depth: current.depth + 1 });
            }
        }
    }
}
function learningV2ActivityAuxiliarySessionManifestObjectPathV1(input) {
    if (!Number.isSafeInteger(input.sessionOrdinal) ||
        input.sessionOrdinal < 1 ||
        input.sessionOrdinal > 12)
        fail();
    return `learning-v2/canonical/activity-auxiliary-index/${exactHash(input.activeManifestHash)}/${(0, decision_registry_1.sha256Utf8)(exactId(input.episodeId))}/${exactHash(input.activityPackageFingerprint)}/sessions/${String(input.sessionOrdinal).padStart(2, "0")}/${exactHash(input.manifestFingerprint)}/${exactHash(input.contentHash)}.json`;
}
function parseObjectRef(value) {
    if (!isPlainObject(value))
        fail();
    exactKeys(value, OBJECT_KEYS);
    if (typeof value.path !== "string" ||
        value.path.length < 1 ||
        value.path.length > 1024 ||
        value.path.startsWith("/") ||
        value.path.includes("..") ||
        typeof value.generation !== "string" ||
        !GENERATION_RE.test(value.generation) ||
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
function parseSessionPin(value, activeManifestHash, episodeId, activityPackageFingerprint, expectedOrdinal) {
    if (!isPlainObject(value))
        fail();
    exactKeys(value, SESSION_KEYS);
    if (value.sessionOrdinal !== expectedOrdinal ||
        typeof value.objectGeneration !== "string" ||
        !GENERATION_RE.test(value.objectGeneration) ||
        !Number.isSafeInteger(value.byteSize) ||
        Number(value.byteSize) < 1 ||
        Number(value.byteSize) > 64 * 1024 ||
        value.contentType !== "application/json; charset=utf-8")
        fail();
    const sessionId = exactId(value.sessionId);
    const sourceFingerprint = exactHash(value.sourceFingerprint);
    const renderFingerprint = exactHash(value.renderFingerprint);
    const manifestFingerprint = exactHash(value.manifestFingerprint);
    const contentHash = exactHash(value.contentHash);
    if (value.objectPath !==
        learningV2ActivityAuxiliarySessionManifestObjectPathV1({
            activeManifestHash,
            episodeId,
            activityPackageFingerprint,
            sessionOrdinal: expectedOrdinal,
            manifestFingerprint,
            contentHash,
        }))
        fail();
    return Object.freeze({
        sessionId,
        sessionOrdinal: expectedOrdinal,
        sourceFingerprint,
        renderFingerprint,
        manifestFingerprint,
        objectPath: value.objectPath,
        contentHash,
        objectGeneration: value.objectGeneration,
        byteSize: Number(value.byteSize),
        contentType: "application/json; charset=utf-8",
    });
}
function parseIndex(value) {
    if (!isPlainObject(value))
        fail();
    exactKeys(value, INDEX_KEYS);
    if (value.schemaVersion !==
        exports.LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_INDEX_SCHEMA_V1 ||
        !["lab", "staging", "production"].includes(String(value.environment)) ||
        typeof value.studyTarget !== "string" ||
        !CODE_RE.test(value.studyTarget) ||
        typeof value.learnerSourceLocale !== "string" ||
        !CODE_RE.test(value.learnerSourceLocale) ||
        !Number.isSafeInteger(value.lessonId) ||
        Number(value.lessonId) < 1 ||
        !Array.isArray(value.sessions) ||
        value.sessions.length !== 12 ||
        value.sessionCount !== 12)
        fail();
    const environment = value.environment;
    const releaseId = exactId(value.releaseId);
    const activeManifestHash = exactHash(value.activeManifestHash);
    const seasonId = exactId(value.seasonId);
    const episodeId = exactId(value.episodeId);
    const stageId = exactId(value.stageId);
    const activityPackageFingerprint = exactHash(value.activityPackageFingerprint);
    const lessonUnitObject = parseObjectRef(value.lessonUnitObject);
    const sessions = Object.freeze(value.sessions.map((session, index) => parseSessionPin(session, activeManifestHash, episodeId, activityPackageFingerprint, index + 1)));
    if (new Set(sessions.map((session) => session.sessionId)).size !== 12 ||
        value.releaseIdentityEvidence !==
            "validated_published_view_structure_only" ||
        value.repositoryOriginAuthority !== "none_server_readback_required" ||
        value.storageAuthority !== "none" ||
        value.runtimeAuthority !== "none_release_index_readback_required" ||
        value.walletAuthority !== "none" ||
        value.masteryAuthority !== "none" ||
        value.evidenceAuthority !== "none" ||
        value.publicationAuthority !== "none" ||
        value.releaseAuthority !== false)
        fail();
    const body = {
        schemaVersion: exports.LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_INDEX_SCHEMA_V1,
        environment,
        releaseId,
        activeManifestHash,
        seasonId,
        studyTarget: value.studyTarget,
        learnerSourceLocale: value.learnerSourceLocale,
        episodeId,
        lessonId: Number(value.lessonId),
        lessonUnitObject,
        stageId,
        activityPackageFingerprint,
        sessions,
        sessionCount: 12,
        releaseIdentityEvidence: "validated_published_view_structure_only",
        repositoryOriginAuthority: "none_server_readback_required",
        storageAuthority: "none",
        runtimeAuthority: "none_release_index_readback_required",
        walletAuthority: "none",
        masteryAuthority: "none",
        evidenceAuthority: "none",
        publicationAuthority: "none",
        releaseAuthority: false,
    };
    const indexFingerprint = exactHash(value.indexFingerprint);
    if ((0, decision_registry_1.hashCanonicalBody)(body) !== indexFingerprint)
        fail();
    const index = Object.freeze({ ...body, indexFingerprint });
    indexHandles.add(index);
    return index;
}
function materializeLearningV2ActivityAuxiliaryReleaseIndexV1(input) {
    const validation = (0, release_manifest_1.validatePublishedV2SeasonManifest)(input.publishedView, input.expectedEnvironment);
    if (!validation.ok)
        fail();
    const release = (0, release_manifest_1.resolveV2ReleaseManifest)(input.publishedView.activePointer, input.publishedView.manifestRecord, input.publishedView.manifestBody, input.expectedEnvironment);
    const episodeId = exactId(input.episodeId);
    const stageId = exactId(input.stageId);
    const activityPackageFingerprint = exactHash(input.activityPackageFingerprint);
    const lessonUnits = release.body.lessonUnits.filter((unit) => unit.episodeId === episodeId);
    if (lessonUnits.length !== 1 || input.manifests.length !== 12)
        fail();
    const sessions = input.manifests.map((inputManifest, index) => {
        if (!isPlainObject(inputManifest) ||
            Object.keys(inputManifest).sort().join("|") !== "objectGeneration|raw" ||
            typeof inputManifest.raw !== "string" ||
            typeof inputManifest.objectGeneration !== "string" ||
            !GENERATION_RE.test(inputManifest.objectGeneration))
            fail();
        const manifest = (0, activity_auxiliary_release_manifest_v1_1.parseLearningV2ActivityAuxiliaryReleaseManifestV1)(inputManifest.raw);
        if (manifest.episodeId !== episodeId ||
            manifest.stageId !== stageId ||
            manifest.activityPackageFingerprint !== activityPackageFingerprint ||
            manifest.sessionOrdinal !== index + 1)
            fail();
        const contentHash = (0, decision_registry_1.sha256Utf8)(inputManifest.raw);
        return Object.freeze({
            sessionId: manifest.sessionId,
            sessionOrdinal: manifest.sessionOrdinal,
            sourceFingerprint: manifest.sourceFingerprint,
            renderFingerprint: manifest.renderFingerprint,
            manifestFingerprint: manifest.manifestFingerprint,
            objectPath: learningV2ActivityAuxiliarySessionManifestObjectPathV1({
                activeManifestHash: release.pointer.activeManifestHash,
                episodeId,
                activityPackageFingerprint,
                sessionOrdinal: manifest.sessionOrdinal,
                manifestFingerprint: manifest.manifestFingerprint,
                contentHash,
            }),
            contentHash,
            objectGeneration: inputManifest.objectGeneration,
            byteSize: (0, decision_registry_1.utf8ByteLengthV1)(inputManifest.raw),
            contentType: "application/json; charset=utf-8",
        });
    });
    const body = {
        schemaVersion: exports.LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_INDEX_SCHEMA_V1,
        environment: release.pointer.environment,
        releaseId: release.pointer.activeReleaseId,
        activeManifestHash: release.pointer.activeManifestHash,
        seasonId: release.pointer.seasonId,
        studyTarget: release.pointer.studyTarget,
        learnerSourceLocale: release.pointer.learnerSourceLocale,
        episodeId,
        lessonId: lessonUnits[0].lessonId,
        lessonUnitObject: lessonUnits[0].object,
        stageId,
        activityPackageFingerprint,
        sessions,
        sessionCount: 12,
        releaseIdentityEvidence: "validated_published_view_structure_only",
        repositoryOriginAuthority: "none_server_readback_required",
        storageAuthority: "none",
        runtimeAuthority: "none_release_index_readback_required",
        walletAuthority: "none",
        masteryAuthority: "none",
        evidenceAuthority: "none",
        publicationAuthority: "none",
        releaseAuthority: false,
    };
    return parseLearningV2ActivityAuxiliaryReleaseIndexV1((0, decision_registry_1.canonicalJsonV1)({ ...body, indexFingerprint: (0, decision_registry_1.hashCanonicalBody)(body) }));
}
function parseLearningV2ActivityAuxiliaryReleaseIndexV1(raw) {
    if (typeof raw !== "string" ||
        raw.length > exports.LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_INDEX_MAX_BYTES_V1 ||
        (0, decision_registry_1.utf8ByteLengthV1)(raw) >
            exports.LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_INDEX_MAX_BYTES_V1)
        fail();
    let candidate;
    try {
        candidate = JSON.parse(raw);
    }
    catch {
        fail();
    }
    preflight(candidate);
    if ((0, decision_registry_1.canonicalJsonV1)(candidate) !== raw)
        fail();
    return parseIndex(candidate);
}
function encodeLearningV2ActivityAuxiliaryReleaseIndexV1(index) {
    if (!isLearningV2ActivityAuxiliaryReleaseIndexV1(index))
        fail();
    return (0, decision_registry_1.canonicalJsonV1)(index);
}
function isLearningV2ActivityAuxiliaryReleaseIndexV1(value) {
    return typeof value === "object" && value !== null && indexHandles.has(value);
}
function bindLearningV2ActivityAuxiliaryIntegrityToReleaseV1(input) {
    if (!isPlainObject(input) ||
        Object.keys(input).sort().join("|") !== "index|integrity" ||
        !isLearningV2ActivityAuxiliaryReleaseIndexV1(input.index) ||
        !(0, activity_auxiliary_integrity_loader_v1_1.isLearningV2ActivityAuxiliaryIntegrityHandleV1)(input.integrity))
        fail();
    const integrity = (0, activity_auxiliary_integrity_loader_v1_1.getLearningV2ActivityAuxiliaryIntegritySummaryV1)(input.integrity);
    const session = input.index.sessions[integrity.sessionOrdinal - 1];
    if (session?.sessionId !== integrity.sessionId ||
        session.sourceFingerprint !== integrity.sourceFingerprint ||
        session.renderFingerprint !== integrity.renderFingerprint ||
        session.manifestFingerprint !== integrity.manifestFingerprint ||
        input.index.episodeId !== integrity.episodeId ||
        input.index.stageId !== integrity.stageId ||
        input.index.activityPackageFingerprint !==
            integrity.activityPackageFingerprint)
        fail();
    const summary = Object.freeze({
        schemaVersion: exports.LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_HANDLE_SCHEMA_V1,
        environment: input.index.environment,
        releaseId: input.index.releaseId,
        activeManifestHash: input.index.activeManifestHash,
        episodeId: input.index.episodeId,
        sessionId: integrity.sessionId,
        sessionOrdinal: integrity.sessionOrdinal,
        activityPackageFingerprint: input.index.activityPackageFingerprint,
        auxiliaryIndexFingerprint: input.index.indexFingerprint,
        auxiliaryManifestFingerprint: integrity.manifestFingerprint,
        releaseIdentityEvidence: "validated_structural_active_pointer_and_lesson_unit",
        repositoryOriginAuthority: "none_server_readback_required",
        storageIntegrity: "exact_generation_hash_size_readback",
        runtimeAuthority: "identity_and_integrity_only_no_release_authority",
        walletAuthority: "none",
        masteryAuthority: "none",
        evidenceAuthority: "none",
        publicationAuthority: "none",
        releaseAuthority: false,
    });
    const handle = Object.freeze({
        schemaVersion: exports.LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_HANDLE_SCHEMA_V1,
    });
    releaseHandles.add(handle);
    releaseMaterial.set(handle, { summary, integrity: input.integrity });
    return handle;
}
function isLearningV2ActivityAuxiliaryReleaseHandleV1(value) {
    return (typeof value === "object" && value !== null && releaseHandles.has(value));
}
function getLearningV2ActivityAuxiliaryReleaseSummaryV1(handle) {
    if (!isLearningV2ActivityAuxiliaryReleaseHandleV1(handle))
        fail();
    const found = releaseMaterial.get(handle);
    if (!found)
        fail();
    return found.summary;
}
function resolveLearningV2ActivityAuxiliaryIntegrityFromReleaseV1(handle) {
    if (!isLearningV2ActivityAuxiliaryReleaseHandleV1(handle))
        fail();
    const found = releaseMaterial.get(handle);
    if (!found)
        fail();
    return found.integrity;
}
//# sourceMappingURL=activity_auxiliary_release_index_v1.js.map