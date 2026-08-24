"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_FIREBASE_ACTIVITY_AUXILIARY_RELEASE_SUMMARY_SCHEMA_V1 = void 0;
exports.isV2FirebaseActivityAuxiliaryReleaseHandleV1 = isV2FirebaseActivityAuxiliaryReleaseHandleV1;
exports.getV2FirebaseActivityAuxiliaryReleaseSummaryV1 = getV2FirebaseActivityAuxiliaryReleaseSummaryV1;
exports.resolveV2FirebaseActivityAuxiliaryReleaseMaterialV1 = resolveV2FirebaseActivityAuxiliaryReleaseMaterialV1;
exports.createFirebaseAdminV2ActivityAuxiliaryReleaseAdapterV1 = createFirebaseAdminV2ActivityAuxiliaryReleaseAdapterV1;
const node_crypto_1 = require("node:crypto");
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const activity_auxiliary_release_index_v1_1 = require("../../../modules/learning-v2/runtime/activity_auxiliary_release_index_v1");
const activity_auxiliary_integrity_loader_v1_1 = require("../../../modules/learning-v2/runtime/activity_auxiliary_integrity_loader_v1");
const activity_auxiliary_client_descriptor_v1_1 = require("../../../modules/learning-v2/runtime/activity_auxiliary_client_descriptor_v1");
const activity_auxiliary_release_manifest_v1_1 = require("../../../modules/learning-v2/runtime/activity_auxiliary_release_manifest_v1");
const release_manifest_1 = require("../../../modules/learning-v2/content/release_manifest");
const v2_activity_auxiliary_release_pointer_v1_1 = require("./v2_activity_auxiliary_release_pointer_v1");
const v2_firebase_admin_repository_io_v1_1 = require("./v2_firebase_admin_repository_io_v1");
const v2_firebase_repository_persistence_v1_1 = require("./v2_firebase_repository_persistence_v1");
const v2_required_session_activation_1 = require("./v2_required_session_activation");
const v2_unified_course_release_repository_v1_1 = require("./v2_unified_course_release_repository_v1");
exports.V2_FIREBASE_ACTIVITY_AUXILIARY_RELEASE_SUMMARY_SCHEMA_V1 = "v2-firebase-activity-auxiliary-release-summary.v1";
const handles = new WeakSet();
const materials = new WeakMap();
const decoder = new TextDecoder("utf-8", { fatal: true });
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
function fail() {
    throw new Error("v2_firebase_activity_auxiliary_release_invalid");
}
function sha256Bytes(value) {
    return (0, node_crypto_1.createHash)("sha256").update(value).digest("hex");
}
function exactInput(input) {
    if (typeof input !== "object" ||
        input === null ||
        Array.isArray(input) ||
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
function unwrapCanonicalRawDocument(raw) {
    const value = parseJson(raw);
    if (isRecord(value) &&
        Object.keys(value).length === 1 &&
        typeof value.canonicalRaw === "string") {
        parseJson(value.canonicalRaw);
        return value.canonicalRaw;
    }
    return raw;
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function seasonManifestObjectPin(value) {
    if (!isRecord(value) ||
        Object.keys(value).sort().join("|") !==
            "createdAt|manifestHash|object|releaseId|schemaVersion|seasonId" ||
        !isRecord(value.object) ||
        Object.keys(value.object).sort().join("|") !==
            "byteSize|contentHash|generation|path" ||
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
        sha256Bytes(download.bytes) !== pin.contentHash)
        fail();
    try {
        return decoder.decode(download.bytes);
    }
    catch {
        fail();
    }
}
function isV2FirebaseActivityAuxiliaryReleaseHandleV1(value) {
    return typeof value === "object" && value !== null && handles.has(value);
}
function getV2FirebaseActivityAuxiliaryReleaseSummaryV1(handle) {
    const found = materials.get(handle);
    if (!found)
        fail();
    return found.summary;
}
function resolveV2FirebaseActivityAuxiliaryReleaseMaterialV1(handle) {
    const found = materials.get(handle);
    if (!found || !found.pointer || !found.seasonPointer)
        fail();
    return Object.freeze({
        index: found.index,
        pointer: found.pointer,
        seasonPointer: found.seasonPointer,
    });
}
function createFirebaseAdminV2ActivityAuxiliaryReleaseAdapterV1() {
    const io = (0, v2_firebase_admin_repository_io_v1_1.createV2FirebaseAdminRepositoryIoV1)();
    return Object.freeze({
        resolveSession: async (handle, sessionOrdinal) => {
            const found = materials.get(handle);
            if (!found ||
                !Number.isSafeInteger(sessionOrdinal) ||
                sessionOrdinal < 1 ||
                sessionOrdinal > 12)
                fail();
            const sessionPin = found.index.sessions[sessionOrdinal - 1];
            if (!sessionPin || sessionPin.sessionOrdinal !== sessionOrdinal)
                fail();
            const manifestRaw = await readJson(io.storage, {
                objectPath: sessionPin.objectPath,
                objectGeneration: sessionPin.objectGeneration,
                contentHash: sessionPin.contentHash,
                byteSize: sessionPin.byteSize,
            }, activity_auxiliary_release_manifest_v1_1.LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_MANIFEST_MAX_BYTES_V1, [v2_firebase_repository_persistence_v1_1.V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1]);
            const manifest = (0, activity_auxiliary_release_manifest_v1_1.parseLearningV2ActivityAuxiliaryReleaseManifestV1)(manifestRaw);
            try {
                return await (0, activity_auxiliary_integrity_loader_v1_1.loadLearningV2ActivityAuxiliaryIntegrityV1)({
                    manifest,
                    expected: {
                        stageId: found.index.stageId,
                        episodeId: found.index.episodeId,
                        sessionId: sessionPin.sessionId,
                        sessionOrdinal,
                        activityPackageFingerprint: found.index.activityPackageFingerprint,
                        sourceFingerprint: sessionPin.sourceFingerprint,
                        renderFingerprint: sessionPin.renderFingerprint,
                    },
                    reader: {
                        readExact: async (pin) => {
                            const raw = await readJson(io.storage, pin, pin.byteSize, [
                                v2_firebase_repository_persistence_v1_1.V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
                            ]);
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
            }
            catch {
                fail();
            }
        },
        projectSessionDescriptor: async (handle, sessionOrdinal) => {
            const found = materials.get(handle);
            if (!found)
                fail();
            const sessionPin = found.index.sessions[sessionOrdinal - 1];
            if (!sessionPin || sessionPin.sessionOrdinal !== sessionOrdinal)
                fail();
            const manifestRaw = await readJson(io.storage, {
                objectPath: sessionPin.objectPath,
                objectGeneration: sessionPin.objectGeneration,
                contentHash: sessionPin.contentHash,
                byteSize: sessionPin.byteSize,
            }, activity_auxiliary_release_manifest_v1_1.LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_MANIFEST_MAX_BYTES_V1, [v2_firebase_repository_persistence_v1_1.V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1]);
            const manifest = (0, activity_auxiliary_release_manifest_v1_1.parseLearningV2ActivityAuxiliaryReleaseManifestV1)(manifestRaw);
            let integrity;
            try {
                integrity = await (0, activity_auxiliary_integrity_loader_v1_1.loadLearningV2ActivityAuxiliaryIntegrityV1)({
                    manifest,
                    expected: {
                        stageId: found.index.stageId,
                        episodeId: found.index.episodeId,
                        sessionId: sessionPin.sessionId,
                        sessionOrdinal,
                        activityPackageFingerprint: found.index.activityPackageFingerprint,
                        sourceFingerprint: sessionPin.sourceFingerprint,
                        renderFingerprint: sessionPin.renderFingerprint,
                    },
                    reader: {
                        readExact: async (pin) => {
                            const raw = await readJson(io.storage, pin, pin.byteSize, [
                                v2_firebase_repository_persistence_v1_1.V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
                            ]);
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
            }
            catch {
                fail();
            }
            const client = (0, activity_auxiliary_integrity_loader_v1_1.projectLearningV2ActivityAuxiliaryClientMaterialV1)(integrity);
            return (0, activity_auxiliary_client_descriptor_v1_1.encodeLearningV2ActivityAuxiliaryClientDescriptorV1)((0, activity_auxiliary_client_descriptor_v1_1.materializeLearningV2ActivityAuxiliaryClientDescriptorV1)({
                environment: found.index.environment,
                studyTarget: found.index.studyTarget,
                learnerSourceLocale: found.index.learnerSourceLocale,
                seasonId: found.index.seasonId,
                releaseId: found.index.releaseId,
                activeManifestHash: found.index.activeManifestHash,
                episodeId: found.index.episodeId,
                stageId: found.index.stageId,
                sessionId: sessionPin.sessionId,
                sessionOrdinal,
                activityPackageFingerprint: found.index.activityPackageFingerprint,
                auxiliaryIndexFingerprint: found.index.indexFingerprint,
                auxiliaryManifestFingerprint: sessionPin.manifestFingerprint,
                sourceFingerprint: sessionPin.sourceFingerprint,
                renderFingerprint: sessionPin.renderFingerprint,
                actionResource: client.action,
                postTerminalCards: client.cards,
                audioRuntime: client.audio,
                errorSourceProjectionFingerprint: client.errorSourceProjectionFingerprint,
                errorExplanations: client.errorEntries.map((entry) => Object.freeze({
                    explanationRef: entry.explanationRef,
                    taskId: entry.taskId,
                    activityId: entry.activityId,
                    textByLocale: entry.textByLocale,
                })),
            }));
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
                indexFingerprint: episode.auxiliaryIndexFingerprint,
                indexObject: episode.auxiliaryIndexObject,
                unifiedRootFingerprint: active.root.rootFingerprint,
            };
            const indexRaw = await readJson(io.storage, input.indexObject, activity_auxiliary_release_index_v1_1.LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_INDEX_MAX_BYTES_V1, [v2_firebase_repository_persistence_v1_1.V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1]);
            const index = (0, activity_auxiliary_release_index_v1_1.parseLearningV2ActivityAuxiliaryReleaseIndexV1)(indexRaw);
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
                schemaVersion: exports.V2_FIREBASE_ACTIVITY_AUXILIARY_RELEASE_SUMMARY_SCHEMA_V1,
                environment: input.environment,
                releaseId: input.releaseId,
                activeManifestHash: input.activeManifestHash,
                seasonId: input.seasonId,
                episodeId: input.episodeId,
                stageId: input.stageId,
                activityPackageFingerprint: input.activityPackageFingerprint,
                indexFingerprint: index.indexFingerprint,
                pointerDocumentPath: "content_v2_unified_course_release_heads",
                pointerDocumentUpdateTimeFingerprint: input.unifiedRootFingerprint,
                seasonManifestRecordUpdateTimeFingerprint: input.unifiedRootFingerprint,
                indexObjectFingerprint: (0, decision_registry_1.hashCanonicalBody)(input.indexObject),
                repositoryOriginAuthority: "firebase_admin_active_release_snapshot",
                seasonManifestAuthority: "generation_pinned_immutable_readback",
                auxiliaryIndexAuthority: "generation_pinned_immutable_readback",
                runtimeAuthority: "authenticated_release_resource_identity_only",
                walletAuthority: "none",
                masteryAuthority: "none",
                evidenceAuthority: "none",
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
                kind: "v2_firebase_activity_auxiliary_release_handle",
            });
            handles.add(handle);
            materials.set(handle, { summary, index });
            return handle;
        },
        load: async (input) => {
            exactInput(input);
            const pointerId = (0, v2_required_session_activation_1.v2SeasonReleasePointerId)(input.environment, input.studyTarget, input.learnerSourceLocale, input.seasonId);
            const seasonPointerPath = `content_v2_season_release_pointers/${(0, v2_required_session_activation_1.v2SeasonReleasePointerDocumentId)(pointerId)}`;
            const firstPointer = await io.readCanonicalDocumentExact({
                documentPath: seasonPointerPath,
                maximumBytes: 32 * 1024,
            });
            const pointer = (0, release_manifest_1.assertV2SeasonReleasePointer)(parseJson(firstPointer.canonicalRaw), input.environment);
            if (pointer.environment !== input.environment ||
                pointer.studyTarget !== input.studyTarget ||
                pointer.learnerSourceLocale !== input.learnerSourceLocale ||
                pointer.seasonId !== input.seasonId)
                fail();
            const manifestRecordPath = `content_v2_season_release_manifests/${(0, v2_required_session_activation_1.v2SeasonReleaseManifestDocumentId)(pointer.activeReleaseId)}`;
            const recordRead = await io.readCanonicalDocumentExact({
                documentPath: manifestRecordPath,
                maximumBytes: 64 * 1024,
            });
            const recordValue = parseJson(recordRead.canonicalRaw);
            const recordPin = seasonManifestObjectPin(recordValue);
            const record = recordValue;
            const manifestRaw = await readJson(io.storage, recordPin, 2 * 1024 * 1024, ["application/json", v2_firebase_repository_persistence_v1_1.V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1]);
            const body = parseJson(manifestRaw);
            const release = (0, release_manifest_1.resolveV2ReleaseManifest)(pointer, record, body, input.environment);
            const lessonUnits = release.body.lessonUnits.filter((unit) => unit.episodeId === input.episodeId);
            if (lessonUnits.length !== 1)
                fail();
            const auxiliaryPointerPath = (0, v2_activity_auxiliary_release_pointer_v1_1.v2ActivityAuxiliaryReleasePointerDocumentPathV1)({
                activeManifestHash: release.pointer.activeManifestHash,
                episodeId: input.episodeId,
            });
            const auxiliaryPointerRead = await io.readCanonicalDocumentExact({
                documentPath: auxiliaryPointerPath,
                maximumBytes: v2_activity_auxiliary_release_pointer_v1_1.V2_ACTIVITY_AUXILIARY_RELEASE_POINTER_MAX_BYTES_V1,
            });
            const permit = (0, v2_activity_auxiliary_release_pointer_v1_1.inspectV2ActivityAuxiliaryReleaseIndexPermitV1)(unwrapCanonicalRawDocument(auxiliaryPointerRead.canonicalRaw), {
                environment: input.environment,
                releaseId: release.pointer.activeReleaseId,
                activeManifestHash: release.pointer.activeManifestHash,
                seasonId: release.pointer.seasonId,
                episodeId: input.episodeId,
                lessonUnitObject: lessonUnits[0].object,
            });
            const indexRaw = await readJson(io.storage, permit.indexObject, activity_auxiliary_release_index_v1_1.LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_INDEX_MAX_BYTES_V1, [v2_firebase_repository_persistence_v1_1.V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1]);
            const index = (0, activity_auxiliary_release_index_v1_1.parseLearningV2ActivityAuxiliaryReleaseIndexV1)(indexRaw);
            const structuralPointer = (0, v2_activity_auxiliary_release_pointer_v1_1.parseV2ActivityAuxiliaryReleasePointerV1)(unwrapCanonicalRawDocument(auxiliaryPointerRead.canonicalRaw), index);
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
                schemaVersion: exports.V2_FIREBASE_ACTIVITY_AUXILIARY_RELEASE_SUMMARY_SCHEMA_V1,
                environment: input.environment,
                releaseId: release.pointer.activeReleaseId,
                activeManifestHash: release.pointer.activeManifestHash,
                seasonId: release.pointer.seasonId,
                episodeId: input.episodeId,
                stageId: index.stageId,
                activityPackageFingerprint: index.activityPackageFingerprint,
                indexFingerprint: index.indexFingerprint,
                pointerDocumentPath: auxiliaryPointerPath,
                pointerDocumentUpdateTimeFingerprint: (0, decision_registry_1.hashCanonicalBody)(auxiliaryPointerRead.updateTime),
                seasonManifestRecordUpdateTimeFingerprint: (0, decision_registry_1.hashCanonicalBody)(recordRead.updateTime),
                indexObjectFingerprint: (0, decision_registry_1.hashCanonicalBody)(permit.indexObject),
                repositoryOriginAuthority: "firebase_admin_active_release_snapshot",
                seasonManifestAuthority: "generation_pinned_immutable_readback",
                auxiliaryIndexAuthority: "generation_pinned_immutable_readback",
                runtimeAuthority: "authenticated_release_resource_identity_only",
                walletAuthority: "none",
                masteryAuthority: "none",
                evidenceAuthority: "none",
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
                kind: "v2_firebase_activity_auxiliary_release_handle",
            });
            handles.add(handle);
            materials.set(handle, {
                summary,
                index,
                pointer: structuralPointer,
                seasonPointer: release.pointer,
            });
            return handle;
        },
    });
}
//# sourceMappingURL=v2_firebase_activity_auxiliary_release_adapter_v1.js.map