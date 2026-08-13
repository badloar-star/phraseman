"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEARNING_V2_ACTIVITY_AUXILIARY_READ_MAX_CONCURRENCY_V1 = exports.LEARNING_V2_ACTIVITY_AUXILIARY_INTEGRITY_HANDLE_SCHEMA_V1 = void 0;
exports.loadLearningV2ActivityAuxiliaryIntegrityV1 = loadLearningV2ActivityAuxiliaryIntegrityV1;
exports.isLearningV2ActivityAuxiliaryIntegrityHandleV1 = isLearningV2ActivityAuxiliaryIntegrityHandleV1;
exports.getLearningV2ActivityAuxiliaryIntegritySummaryV1 = getLearningV2ActivityAuxiliaryIntegritySummaryV1;
exports.getLearningV2ActivityReportContextFromIntegrityV1 = getLearningV2ActivityReportContextFromIntegrityV1;
exports.resolveLearningV2ActivityCardFromIntegrityV1 = resolveLearningV2ActivityCardFromIntegrityV1;
exports.getLearningV2ActivitySelectableAudioFromIntegrityV1 = getLearningV2ActivitySelectableAudioFromIntegrityV1;
exports.selectLearningV2ActivityTaskAudioFromIntegrityV1 = selectLearningV2ActivityTaskAudioFromIntegrityV1;
exports.resolveLearningV2ActivityErrorFromIntegrityV1 = resolveLearningV2ActivityErrorFromIntegrityV1;
exports.projectLearningV2ActivityAuxiliaryClientMaterialV1 = projectLearningV2ActivityAuxiliaryClientMaterialV1;
const activity_error_explanation_catalog_v1_1 = require("../content/activity_error_explanation_catalog_v1");
const decision_registry_1 = require("../policies/decision_registry");
const activity_audio_runtime_projection_v1_1 = require("./activity_audio_runtime_projection_v1");
const activity_learner_action_resource_v1_1 = require("./activity_learner_action_resource_v1");
const activity_auxiliary_release_manifest_v1_1 = require("./activity_auxiliary_release_manifest_v1");
const activity_post_terminal_card_capsule_v1_1 = require("./activity_post_terminal_card_capsule_v1");
const activity_audio_runtime_projection_v1_2 = require("./activity_audio_runtime_projection_v1");
const activity_learner_action_resource_v1_2 = require("./activity_learner_action_resource_v1");
const activity_post_terminal_card_capsule_v1_2 = require("./activity_post_terminal_card_capsule_v1");
const activity_error_explanation_catalog_v1_2 = require("../content/activity_error_explanation_catalog_v1");
exports.LEARNING_V2_ACTIVITY_AUXILIARY_INTEGRITY_HANDLE_SCHEMA_V1 = "learning-v2-activity-auxiliary-integrity-handle.v1";
exports.LEARNING_V2_ACTIVITY_AUXILIARY_READ_MAX_CONCURRENCY_V1 = 4;
const handles = new WeakSet();
const materialByHandle = new WeakMap();
function fail() {
    throw new Error("learning_v2_activity_auxiliary_integrity_invalid");
}
function isPlainObject(value) {
    return (typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype);
}
function exactReadback(pin, value) {
    if (!isPlainObject(value) ||
        Object.keys(value).sort().join("|") !==
            "byteSize|contentHash|contentType|objectGeneration|raw" ||
        typeof value.raw !== "string" ||
        value.objectGeneration !== pin.objectGeneration ||
        value.byteSize !== pin.byteSize ||
        value.contentHash !== pin.contentHash ||
        value.contentType !== "application/json; charset=utf-8" ||
        (0, decision_registry_1.utf8ByteLengthV1)(value.raw) !== pin.byteSize ||
        (0, decision_registry_1.sha256Utf8)(value.raw) !== pin.contentHash)
        fail();
    return value.raw;
}
function material(handle) {
    if (!isLearningV2ActivityAuxiliaryIntegrityHandleV1(handle))
        fail();
    const found = materialByHandle.get(handle);
    if (!found)
        fail();
    return found;
}
async function loadLearningV2ActivityAuxiliaryIntegrityV1(input) {
    if (!isPlainObject(input) ||
        Object.keys(input).sort().join("|") !== "expected|manifest|reader" ||
        !(0, activity_auxiliary_release_manifest_v1_1.isLearningV2ActivityAuxiliaryReleaseManifestV1)(input.manifest) ||
        !isPlainObject(input.expected) ||
        Object.keys(input.expected).sort().join("|") !==
            "activityPackageFingerprint|episodeId|renderFingerprint|sessionId|sessionOrdinal|sourceFingerprint|stageId" ||
        !isPlainObject(input.reader) ||
        typeof input.reader.readExact !== "function")
        fail();
    const manifest = input.manifest;
    if (manifest.stageId !== input.expected.stageId ||
        manifest.episodeId !== input.expected.episodeId ||
        manifest.sessionId !== input.expected.sessionId ||
        manifest.sessionOrdinal !== input.expected.sessionOrdinal ||
        manifest.activityPackageFingerprint !==
            input.expected.activityPackageFingerprint ||
        manifest.sourceFingerprint !== input.expected.sourceFingerprint ||
        manifest.renderFingerprint !== input.expected.renderFingerprint)
        fail();
    const readbacks = await Promise.all(manifest.objects.map(async (pin) => exactReadback(pin, await input.reader.readExact(pin))));
    const action = (0, activity_learner_action_resource_v1_2.parseLearningV2ActivityLearnerActionResourceV1)(readbacks[0]);
    const cards = (0, activity_post_terminal_card_capsule_v1_2.parseLearningV2ActivityPostTerminalCardCapsuleV1)(readbacks[1]);
    const audio = (0, activity_audio_runtime_projection_v1_2.parseLearningV2ActivityAudioRuntimeProjectionV1)(readbacks[2]);
    const errors = (0, activity_error_explanation_catalog_v1_2.parseLearningV2ActivityErrorExplanationLearnerProjectionV1)(readbacks[3]);
    if (action.resourceFingerprint !== manifest.actionResourceFingerprint ||
        cards.capsuleFingerprint !== manifest.postTerminalCardCapsuleFingerprint ||
        audio.projectionFingerprint !==
            manifest.audioRuntimeProjectionFingerprint ||
        errors.projectionFingerprint !==
            manifest.errorExplanationProjectionFingerprint ||
        action.episodeId !== manifest.episodeId ||
        action.sessionId !== manifest.sessionId ||
        action.sessionOrdinal !== manifest.sessionOrdinal ||
        action.sourceFingerprint !== manifest.sourceFingerprint ||
        action.renderFingerprint !== manifest.renderFingerprint ||
        cards.actionResourceFingerprint !== action.resourceFingerprint ||
        audio.episodeId !== action.episodeId ||
        audio.sessionId !== action.sessionId ||
        audio.sessionOrdinal !== action.sessionOrdinal ||
        errors.episodeId !== action.episodeId)
        fail();
    const summary = Object.freeze({
        schemaVersion: exports.LEARNING_V2_ACTIVITY_AUXILIARY_INTEGRITY_HANDLE_SCHEMA_V1,
        stageId: manifest.stageId,
        episodeId: manifest.episodeId,
        sessionId: manifest.sessionId,
        sessionOrdinal: manifest.sessionOrdinal,
        activityPackageFingerprint: manifest.activityPackageFingerprint,
        sourceFingerprint: manifest.sourceFingerprint,
        renderFingerprint: manifest.renderFingerprint,
        manifestFingerprint: manifest.manifestFingerprint,
        objectCount: 4,
        storageIntegrity: "exact_generation_hash_size_readback",
        originAuthority: "none_external_release_pointer_required",
        runtimeAuthority: "integrity_only_no_release_authority",
        walletAuthority: "none",
        masteryAuthority: "none",
        evidenceAuthority: "none",
        releaseAuthority: false,
    });
    const handle = Object.freeze({
        schemaVersion: exports.LEARNING_V2_ACTIVITY_AUXILIARY_INTEGRITY_HANDLE_SCHEMA_V1,
    });
    handles.add(handle);
    materialByHandle.set(handle, { summary, action, cards, audio, errors });
    return handle;
}
function isLearningV2ActivityAuxiliaryIntegrityHandleV1(value) {
    return typeof value === "object" && value !== null && handles.has(value);
}
function getLearningV2ActivityAuxiliaryIntegritySummaryV1(handle) {
    return material(handle).summary;
}
function getLearningV2ActivityReportContextFromIntegrityV1(handle, taskId, activityId) {
    return (0, activity_learner_action_resource_v1_1.getLearningV2ActivityLearnerActionEntryV1)(material(handle).action, taskId, activityId).report;
}
function resolveLearningV2ActivityCardFromIntegrityV1(handle, input) {
    const found = material(handle);
    return (0, activity_post_terminal_card_capsule_v1_1.resolveLearningV2ActivityPostTerminalCardV1)({
        capsule: found.cards,
        actionResource: found.action,
        ...input,
    });
}
function getLearningV2ActivitySelectableAudioFromIntegrityV1(handle, taskId) {
    return (0, activity_audio_runtime_projection_v1_1.getLearningV2ActivitySelectableAudioBindingsV1)(material(handle).audio, taskId);
}
function selectLearningV2ActivityTaskAudioFromIntegrityV1(handle, input) {
    return (0, activity_audio_runtime_projection_v1_1.selectLearningV2ActivityTaskAudioV1)({
        projection: material(handle).audio,
        ...input,
    });
}
function resolveLearningV2ActivityErrorFromIntegrityV1(handle, input) {
    return (0, activity_error_explanation_catalog_v1_1.resolveLearningV2ActivityErrorExplanationV1)(material(handle).errors, input);
}
function projectLearningV2ActivityAuxiliaryClientMaterialV1(handle) {
    const found = material(handle);
    const errorEntries = Object.freeze(found.errors.entries.filter((entry) => entry.sessionOrdinal === found.action.sessionOrdinal));
    if (errorEntries.length !== 12 ||
        errorEntries.some((entry, index) => {
            const action = found.action.entries[index];
            return (!action ||
                entry.sessionId !== found.action.sessionId ||
                entry.taskId !== action.taskId ||
                entry.activityId !== action.activityId);
        }))
        fail();
    return Object.freeze({
        action: found.action,
        cards: found.cards,
        audio: found.audio,
        errorEntries,
        errorSourceProjectionFingerprint: found.errors.projectionFingerprint,
        materialAuthority: "none_integrity_handle_projection_only",
    });
}
//# sourceMappingURL=activity_auxiliary_integrity_loader_v1.js.map