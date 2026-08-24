"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_FIREBASE_ACTIVITY_LEARNER_CORE_RELEASE_SUMMARY_SCHEMA_V1 = void 0;
exports.isV2FirebaseActivityLearnerCoreReleaseHandleV1 = isV2FirebaseActivityLearnerCoreReleaseHandleV1;
exports.getV2FirebaseActivityLearnerCoreReleaseSummaryV1 = getV2FirebaseActivityLearnerCoreReleaseSummaryV1;
exports.createFirebaseAdminV2ActivityLearnerCoreReleaseAdapterV1 = createFirebaseAdminV2ActivityLearnerCoreReleaseAdapterV1;
const node_crypto_1 = require("node:crypto");
const release_manifest_1 = require("../../../modules/learning-v2/content/release_manifest");
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const activity_learner_core_release_index_v1_1 = require("../../../modules/learning-v2/runtime/activity_learner_core_release_index_v1");
const v2_activity_learner_core_release_pointer_v1_1 = require("./v2_activity_learner_core_release_pointer_v1");
const v2_firebase_admin_repository_io_v1_1 = require("./v2_firebase_admin_repository_io_v1");
const v2_firebase_repository_persistence_v1_1 = require("./v2_firebase_repository_persistence_v1");
const v2_required_session_activation_1 = require("./v2_required_session_activation");
const v2_unified_course_release_repository_v1_1 = require("./v2_unified_course_release_repository_v1");
exports.V2_FIREBASE_ACTIVITY_LEARNER_CORE_RELEASE_SUMMARY_SCHEMA_V1 = "v2-firebase-activity-learner-core-release-summary.v1";
const handles = new WeakSet();
const materials = new WeakMap();
const decoder = new TextDecoder("utf-8", { fatal: true });
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
function fail() {
    throw new Error("v2_firebase_activity_learner_core_release_invalid");
}
function record(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function parseJson(raw) {
    try {
        const value = JSON.parse(raw);
        if ((0, decision_registry_1.canonicalJsonV1)(value) !== raw)
            fail();
        return value;
    }
    catch {
        fail();
    }
}
function unwrap(raw) {
    const value = parseJson(raw);
    if (record(value) &&
        Object.keys(value).length === 1 &&
        typeof value.canonicalRaw === "string") {
        parseJson(value.canonicalRaw);
        return value.canonicalRaw;
    }
    return raw;
}
function exactInput(input) {
    if (!record(input) ||
        Object.getPrototypeOf(input) !== Object.prototype ||
        Object.keys(input).sort().join("|") !==
            "environment|episodeId|learnerSourceLocale|seasonId|studyTarget" ||
        !["lab", "staging", "production"].includes(String(input.environment)) ||
        !ID_RE.test(String(input.studyTarget)) ||
        !ID_RE.test(String(input.learnerSourceLocale)) ||
        !ID_RE.test(String(input.seasonId)) ||
        !ID_RE.test(String(input.episodeId)))
        fail();
}
function seasonManifestPin(value) {
    if (!record(value) ||
        !record(value.object) ||
        typeof value.object.path !== "string" ||
        typeof value.object.generation !== "string" ||
        typeof value.object.contentHash !== "string" ||
        !Number.isSafeInteger(value.object.byteSize) ||
        Number(value.object.byteSize) < 1)
        fail();
    return Object.freeze({
        objectPath: value.object.path,
        objectGeneration: value.object.generation,
        contentHash: value.object.contentHash,
        byteSize: Number(value.object.byteSize),
    });
}
async function readJson(storage, pin, maximumBytes, acceptedContentTypes) {
    if (pin.byteSize < 1 || pin.byteSize > maximumBytes)
        fail();
    const metadata = await storage.readMetadataExact(pin.objectPath);
    if (metadata === null ||
        metadata.generation !== pin.objectGeneration ||
        metadata.contentHash !== pin.contentHash ||
        metadata.byteSize !== pin.byteSize ||
        !acceptedContentTypes.includes(metadata.contentType))
        fail();
    const download = await storage.downloadGenerationExact({
        objectPath: pin.objectPath,
        ifGenerationMatch: pin.objectGeneration,
        maximumBytes,
    });
    if (download.kind !== "downloaded" ||
        download.bytes.byteLength !== pin.byteSize ||
        (0, node_crypto_1.createHash)("sha256").update(download.bytes).digest("hex") !==
            pin.contentHash)
        fail();
    try {
        return decoder.decode(download.bytes);
    }
    catch {
        fail();
    }
}
async function readChild(storage, pin, maximumBytes) {
    return readJson(storage, pin, maximumBytes, [
        v2_firebase_repository_persistence_v1_1.V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
    ]);
}
function isV2FirebaseActivityLearnerCoreReleaseHandleV1(value) {
    return typeof value === "object" && value !== null && handles.has(value);
}
function getV2FirebaseActivityLearnerCoreReleaseSummaryV1(handle) {
    const found = materials.get(handle);
    if (!found)
        fail();
    return found.summary;
}
function createFirebaseAdminV2ActivityLearnerCoreReleaseAdapterV1() {
    const io = (0, v2_firebase_admin_repository_io_v1_1.createV2FirebaseAdminRepositoryIoV1)();
    return Object.freeze({
        resolveSession: async (handle, sessionOrdinal) => {
            const found = materials.get(handle);
            if (!found ||
                !Number.isSafeInteger(sessionOrdinal) ||
                sessionOrdinal < 1 ||
                sessionOrdinal > 12)
                fail();
            const session = found.index.sessions[sessionOrdinal - 1];
            if (!session || session.sessionOrdinal !== sessionOrdinal)
                fail();
            const [renderRaw, capsuleEnvelopeRaw] = await Promise.all([
                readChild(io.storage, session.render, activity_learner_core_release_index_v1_1.LEARNING_V2_ACTIVITY_LEARNER_CORE_RENDER_MAX_BYTES_V1),
                readChild(io.storage, session.capsule, activity_learner_core_release_index_v1_1.LEARNING_V2_ACTIVITY_LEARNER_CORE_CAPSULE_MAX_BYTES_V1),
            ]);
            const render = parseJson(renderRaw);
            const capsule = parseJson(capsuleEnvelopeRaw);
            if ((0, decision_registry_1.hashCanonicalBody)(render) !== session.renderFingerprint ||
                (0, decision_registry_1.hashCanonicalBody)(capsule) !== session.capsuleEnvelopeFingerprint ||
                !record(render) ||
                !record(render.session) ||
                render.sourceFingerprint !== session.sourceFingerprint ||
                render.episodeId !== found.index.episodeId ||
                render.session.sessionId !== session.sessionId ||
                render.session.ordinal !== sessionOrdinal ||
                !record(capsule) ||
                capsule.sourceFingerprint !== session.sourceFingerprint ||
                capsule.episodeId !== found.index.episodeId ||
                capsule.sessionId !== session.sessionId ||
                capsule.sessionOrdinal !== sessionOrdinal)
                fail();
            return Object.freeze({
                episodeId: found.index.episodeId,
                sessionId: session.sessionId,
                sessionOrdinal,
                activityPackageFingerprint: found.index.activityPackageFingerprint,
                sourceFingerprint: session.sourceFingerprint,
                renderFingerprint: session.renderFingerprint,
                capsuleEnvelopeFingerprint: session.capsuleEnvelopeFingerprint,
                renderRaw,
                capsuleEnvelopeRaw,
                storageIntegrity: "exact_generation_hash_size_content_type_readback",
                repositoryOriginAuthority: "firebase_admin_active_release_snapshot",
                runtimeAuthority: "authenticated_release_session_bytes_only",
                walletAuthority: "none",
                masteryAuthority: "none",
                evidenceAuthority: "none",
                completionAuthority: "none",
                releaseAuthority: false,
            });
        },
        loadPinned: async (activeHandle, episodeId) => {
            const active = (0, v2_unified_course_release_repository_v1_1.resolveV2UnifiedCourseReleaseActiveMaterialV1)(activeHandle);
            const episode = active.root.episodes.find((row) => row.episodeId === episodeId);
            if (!episode)
                fail();
            const input = {
                environment: active.root.environment,
                releaseId: active.root.releaseId,
                activeManifestHash: active.root.activeManifestHash,
                seasonId: active.root.seasonId,
                studyTarget: active.root.studyTarget,
                learnerSourceLocale: active.root.learnerSourceLocale,
                episodeId,
                stageId: episode.stageId,
                activityPackageFingerprint: episode.activityPackageFingerprint,
                indexFingerprint: episode.learnerCoreIndexFingerprint,
                indexObject: episode.learnerCoreIndexObject,
                unifiedRootFingerprint: active.root.rootFingerprint,
            };
            const indexRaw = await readJson(io.storage, input.indexObject, activity_learner_core_release_index_v1_1.LEARNING_V2_ACTIVITY_LEARNER_CORE_RELEASE_INDEX_MAX_BYTES_V1, [v2_firebase_repository_persistence_v1_1.V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1]);
            const index = (0, activity_learner_core_release_index_v1_1.parseLearningV2ActivityLearnerCoreReleaseIndexV1)(indexRaw);
            if ((0, decision_registry_1.sha256Utf8)(indexRaw) !== input.indexObject.contentHash ||
                index.indexFingerprint !== input.indexFingerprint ||
                index.environment !== input.environment ||
                index.releaseId !== input.releaseId ||
                index.activeManifestHash !== input.activeManifestHash ||
                index.seasonId !== input.seasonId ||
                index.studyTarget !== input.studyTarget ||
                index.learnerSourceLocale !== input.learnerSourceLocale ||
                index.episodeId !== input.episodeId ||
                index.stageId !== input.stageId ||
                index.activityPackageFingerprint !== input.activityPackageFingerprint)
                fail();
            const summaryBody = {
                schemaVersion: exports.V2_FIREBASE_ACTIVITY_LEARNER_CORE_RELEASE_SUMMARY_SCHEMA_V1,
                environment: input.environment,
                releaseId: input.releaseId,
                activeManifestHash: input.activeManifestHash,
                seasonId: input.seasonId,
                episodeId: input.episodeId,
                stageId: input.stageId,
                activityPackageFingerprint: input.activityPackageFingerprint,
                validatorSummaryFingerprint: index.validatorSummaryFingerprint,
                indexFingerprint: index.indexFingerprint,
                pointerFingerprint: input.unifiedRootFingerprint,
                pointerDocumentPath: "content_v2_unified_course_release_heads",
                pointerDocumentUpdateTimeFingerprint: input.unifiedRootFingerprint,
                seasonManifestRecordUpdateTimeFingerprint: input.unifiedRootFingerprint,
                indexObjectFingerprint: (0, decision_registry_1.hashCanonicalBody)(input.indexObject),
                sessionCount: 12,
                objectCount: 24,
                repositoryOriginAuthority: "firebase_admin_active_release_snapshot",
                seasonManifestAuthority: "generation_pinned_immutable_readback",
                learnerCoreIndexAuthority: "generation_pinned_immutable_readback",
                runtimeAuthority: "authenticated_release_learner_core_identity_only",
                walletAuthority: "none",
                masteryAuthority: "none",
                evidenceAuthority: "none",
                completionAuthority: "none",
                publicationAuthority: "none",
                runtimeConsumer: false,
                releaseEligible: false,
                releaseAuthority: false,
            };
            const summary = Object.freeze({
                ...summaryBody,
                summaryFingerprint: (0, decision_registry_1.hashCanonicalBody)(summaryBody),
            });
            const handle = Object.freeze({
                kind: "v2_firebase_activity_learner_core_release_handle",
            });
            handles.add(handle);
            materials.set(handle, { summary, index });
            return handle;
        },
        load: async (input) => {
            exactInput(input);
            const seasonPointerPath = `content_v2_season_release_pointers/${(0, v2_required_session_activation_1.v2SeasonReleasePointerDocumentId)((0, v2_required_session_activation_1.v2SeasonReleasePointerId)(input.environment, input.studyTarget, input.learnerSourceLocale, input.seasonId))}`;
            const firstPointer = await io.readCanonicalDocumentExact({
                documentPath: seasonPointerPath,
                maximumBytes: 32 * 1024,
            });
            const seasonPointer = (0, release_manifest_1.assertV2SeasonReleasePointer)(parseJson(firstPointer.canonicalRaw), input.environment);
            if (seasonPointer.studyTarget !== input.studyTarget ||
                seasonPointer.learnerSourceLocale !== input.learnerSourceLocale ||
                seasonPointer.seasonId !== input.seasonId)
                fail();
            const manifestRecordPath = `content_v2_season_release_manifests/${(0, v2_required_session_activation_1.v2SeasonReleaseManifestDocumentId)(seasonPointer.activeReleaseId)}`;
            const recordRead = await io.readCanonicalDocumentExact({
                documentPath: manifestRecordPath,
                maximumBytes: 64 * 1024,
            });
            const recordValue = parseJson(recordRead.canonicalRaw);
            const manifestRaw = await readJson(io.storage, seasonManifestPin(recordValue), 2 * 1024 * 1024, ["application/json", v2_firebase_repository_persistence_v1_1.V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1]);
            const release = (0, release_manifest_1.resolveV2ReleaseManifest)(seasonPointer, recordValue, parseJson(manifestRaw), input.environment);
            if (release.body.lessonUnits.filter((unit) => unit.episodeId === input.episodeId).length !== 1)
                fail();
            const pointerDocumentPath = (0, v2_activity_learner_core_release_pointer_v1_1.v2ActivityLearnerCoreReleasePointerDocumentPathV1)({
                activeManifestHash: release.pointer.activeManifestHash,
                episodeId: input.episodeId,
            });
            const pointerRead = await io.readCanonicalDocumentExact({
                documentPath: pointerDocumentPath,
                maximumBytes: v2_activity_learner_core_release_pointer_v1_1.V2_ACTIVITY_LEARNER_CORE_RELEASE_POINTER_MAX_BYTES_V1,
            });
            const pointerRaw = unwrap(pointerRead.canonicalRaw);
            const permit = (0, v2_activity_learner_core_release_pointer_v1_1.inspectV2ActivityLearnerCoreReleaseIndexPermitV1)(pointerRaw, {
                environment: input.environment,
                releaseId: release.pointer.activeReleaseId,
                activeManifestHash: release.pointer.activeManifestHash,
                seasonId: release.pointer.seasonId,
                episodeId: input.episodeId,
            });
            const indexRaw = await readJson(io.storage, permit.indexObject, activity_learner_core_release_index_v1_1.LEARNING_V2_ACTIVITY_LEARNER_CORE_RELEASE_INDEX_MAX_BYTES_V1, [v2_firebase_repository_persistence_v1_1.V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1]);
            const index = (0, activity_learner_core_release_index_v1_1.parseLearningV2ActivityLearnerCoreReleaseIndexV1)(indexRaw);
            const pointer = (0, v2_activity_learner_core_release_pointer_v1_1.parseV2ActivityLearnerCoreReleasePointerV1)(pointerRaw, index);
            if ((0, decision_registry_1.sha256Utf8)(indexRaw) !== permit.indexObject.contentHash ||
                index.indexFingerprint !== permit.indexFingerprint ||
                index.activeManifestHash !== release.pointer.activeManifestHash ||
                index.episodeId !== input.episodeId ||
                index.stageId !== permit.stageId ||
                index.activityPackageFingerprint !== permit.activityPackageFingerprint)
                fail();
            const finalPointer = await io.readCanonicalDocumentExact({
                documentPath: seasonPointerPath,
                maximumBytes: 32 * 1024,
            });
            if (finalPointer.canonicalRaw !== firstPointer.canonicalRaw ||
                finalPointer.updateTime.seconds !== firstPointer.updateTime.seconds ||
                finalPointer.updateTime.nanoseconds !==
                    firstPointer.updateTime.nanoseconds)
                fail();
            const summaryBody = {
                schemaVersion: exports.V2_FIREBASE_ACTIVITY_LEARNER_CORE_RELEASE_SUMMARY_SCHEMA_V1,
                environment: input.environment,
                releaseId: release.pointer.activeReleaseId,
                activeManifestHash: release.pointer.activeManifestHash,
                seasonId: release.pointer.seasonId,
                episodeId: input.episodeId,
                stageId: index.stageId,
                activityPackageFingerprint: index.activityPackageFingerprint,
                validatorSummaryFingerprint: index.validatorSummaryFingerprint,
                indexFingerprint: index.indexFingerprint,
                pointerFingerprint: pointer.pointerFingerprint,
                pointerDocumentPath,
                pointerDocumentUpdateTimeFingerprint: (0, decision_registry_1.hashCanonicalBody)(pointerRead.updateTime),
                seasonManifestRecordUpdateTimeFingerprint: (0, decision_registry_1.hashCanonicalBody)(recordRead.updateTime),
                indexObjectFingerprint: (0, decision_registry_1.hashCanonicalBody)(permit.indexObject),
                sessionCount: 12,
                objectCount: 24,
                repositoryOriginAuthority: "firebase_admin_active_release_snapshot",
                seasonManifestAuthority: "generation_pinned_immutable_readback",
                learnerCoreIndexAuthority: "generation_pinned_immutable_readback",
                runtimeAuthority: "authenticated_release_learner_core_identity_only",
                walletAuthority: "none",
                masteryAuthority: "none",
                evidenceAuthority: "none",
                completionAuthority: "none",
                publicationAuthority: "none",
                runtimeConsumer: false,
                releaseEligible: false,
                releaseAuthority: false,
            };
            const summary = Object.freeze({
                ...summaryBody,
                summaryFingerprint: (0, decision_registry_1.hashCanonicalBody)(summaryBody),
            });
            const handle = Object.freeze({
                kind: "v2_firebase_activity_learner_core_release_handle",
            });
            handles.add(handle);
            materials.set(handle, {
                summary,
                index,
                pointer,
                seasonPointer: release.pointer,
            });
            return handle;
        },
    });
}
//# sourceMappingURL=v2_firebase_activity_learner_core_release_adapter_v1.js.map