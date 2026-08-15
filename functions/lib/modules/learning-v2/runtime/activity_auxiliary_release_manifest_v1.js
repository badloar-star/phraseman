"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_MANIFEST_MAX_BYTES_V1 = exports.LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_MANIFEST_SCHEMA_V1 = void 0;
exports.materializeLearningV2ActivityAuxiliaryReleaseManifestV1 = materializeLearningV2ActivityAuxiliaryReleaseManifestV1;
exports.parseLearningV2ActivityAuxiliaryReleaseManifestV1 = parseLearningV2ActivityAuxiliaryReleaseManifestV1;
exports.encodeLearningV2ActivityAuxiliaryReleaseManifestV1 = encodeLearningV2ActivityAuxiliaryReleaseManifestV1;
exports.isLearningV2ActivityAuxiliaryReleaseManifestV1 = isLearningV2ActivityAuxiliaryReleaseManifestV1;
const activity_error_explanation_catalog_v1_1 = require("../content/activity_error_explanation_catalog_v1");
const decision_registry_1 = require("../policies/decision_registry");
const activity_audio_runtime_projection_v1_1 = require("./activity_audio_runtime_projection_v1");
const activity_learner_action_resource_v1_1 = require("./activity_learner_action_resource_v1");
const activity_post_terminal_card_capsule_v1_1 = require("./activity_post_terminal_card_capsule_v1");
exports.LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_MANIFEST_SCHEMA_V1 = "learning-v2-activity-auxiliary-release-manifest.v1";
exports.LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_MANIFEST_MAX_BYTES_V1 = 64 * 1024;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const HASH_RE = /^[a-f0-9]{64}$/u;
const GENERATION_RE = /^[A-Za-z0-9._:-]{1,160}$/u;
const RESERVED_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const handles = new WeakSet();
const KINDS = Object.freeze([
    "learner_action",
    "post_terminal_card_capsule",
    "audio_runtime",
    "error_explanations",
]);
const ROOT_KEYS = Object.freeze([
    "schemaVersion",
    "stageId",
    "episodeId",
    "sessionId",
    "sessionOrdinal",
    "activityPackageFingerprint",
    "sourceFingerprint",
    "renderFingerprint",
    "actionResourceFingerprint",
    "postTerminalCardCapsuleFingerprint",
    "audioRuntimeProjectionFingerprint",
    "errorExplanationProjectionFingerprint",
    "objects",
    "objectCount",
    "storageEvidence",
    "clientDelivery",
    "runtimeAuthority",
    "walletAuthority",
    "masteryAuthority",
    "evidenceAuthority",
    "publicationAuthority",
    "releaseAuthority",
    "manifestFingerprint",
]);
const PIN_KEYS = Object.freeze([
    "kind",
    "objectPath",
    "contentHash",
    "objectGeneration",
    "byteSize",
    "contentType",
]);
function fail(code) {
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
        fail("learning_v2_activity_auxiliary_manifest_fields_invalid");
}
function exactId(value) {
    if (typeof value !== "string" ||
        !ID_RE.test(value) ||
        RESERVED_KEYS.has(value))
        fail("learning_v2_activity_auxiliary_manifest_identity_invalid");
    return value;
}
function exactHash(value) {
    if (typeof value !== "string" || !HASH_RE.test(value))
        fail("learning_v2_activity_auxiliary_manifest_hash_invalid");
    return value;
}
function auxiliaryPath(stageId, activityPackageFingerprint, sessionOrdinal, kind, contentHash) {
    return `learning-v2/canonical/activity-auxiliary/${(0, decision_registry_1.sha256Utf8)(stageId)}/${activityPackageFingerprint}/sessions/${String(sessionOrdinal).padStart(2, "0")}/${kind}/${contentHash}.json`;
}
function pin(stageId, activityPackageFingerprint, sessionOrdinal, kind, raw, objectGeneration) {
    if (!GENERATION_RE.test(objectGeneration))
        fail("learning_v2_activity_auxiliary_manifest_generation_invalid");
    const contentHash = (0, decision_registry_1.sha256Utf8)(raw);
    return Object.freeze({
        kind,
        objectPath: auxiliaryPath(stageId, activityPackageFingerprint, sessionOrdinal, kind, contentHash),
        contentHash,
        objectGeneration,
        byteSize: (0, decision_registry_1.utf8ByteLengthV1)(raw),
        contentType: "application/json; charset=utf-8",
    });
}
function parsePin(value, stageId, activityPackageFingerprint, sessionOrdinal, expectedKind) {
    if (!isPlainObject(value))
        fail("learning_v2_activity_auxiliary_manifest_pin_invalid");
    exactKeys(value, PIN_KEYS);
    if (value.kind !== expectedKind ||
        typeof value.objectGeneration !== "string" ||
        !GENERATION_RE.test(value.objectGeneration) ||
        !Number.isSafeInteger(value.byteSize) ||
        Number(value.byteSize) < 1 ||
        Number(value.byteSize) > 4 * 1024 * 1024 ||
        value.contentType !== "application/json; charset=utf-8")
        fail("learning_v2_activity_auxiliary_manifest_pin_invalid");
    const contentHash = exactHash(value.contentHash);
    if (value.objectPath !==
        auxiliaryPath(stageId, activityPackageFingerprint, sessionOrdinal, expectedKind, contentHash))
        fail("learning_v2_activity_auxiliary_manifest_path_invalid");
    return Object.freeze({
        kind: expectedKind,
        objectPath: value.objectPath,
        contentHash,
        objectGeneration: value.objectGeneration,
        byteSize: Number(value.byteSize),
        contentType: "application/json; charset=utf-8",
    });
}
function parseManifest(value) {
    if (!isPlainObject(value))
        fail("learning_v2_activity_auxiliary_manifest_invalid");
    exactKeys(value, ROOT_KEYS);
    if (value.schemaVersion !==
        exports.LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_MANIFEST_SCHEMA_V1 ||
        !Number.isSafeInteger(value.sessionOrdinal) ||
        Number(value.sessionOrdinal) < 1 ||
        Number(value.sessionOrdinal) > 12 ||
        !Array.isArray(value.objects) ||
        value.objects.length !== 4 ||
        value.objectCount !== 4)
        fail("learning_v2_activity_auxiliary_manifest_invalid");
    const rawObjects = value.objects;
    const stageId = exactId(value.stageId);
    const episodeId = exactId(value.episodeId);
    const sessionId = exactId(value.sessionId);
    const sessionOrdinal = Number(value.sessionOrdinal);
    const activityPackageFingerprint = exactHash(value.activityPackageFingerprint);
    const sourceFingerprint = exactHash(value.sourceFingerprint);
    const renderFingerprint = exactHash(value.renderFingerprint);
    const actionResourceFingerprint = exactHash(value.actionResourceFingerprint);
    const postTerminalCardCapsuleFingerprint = exactHash(value.postTerminalCardCapsuleFingerprint);
    const audioRuntimeProjectionFingerprint = exactHash(value.audioRuntimeProjectionFingerprint);
    const errorExplanationProjectionFingerprint = exactHash(value.errorExplanationProjectionFingerprint);
    const objects = KINDS.map((kind, index) => parsePin(rawObjects[index], stageId, activityPackageFingerprint, sessionOrdinal, kind));
    if (value.storageEvidence !== "unverified_structural_pins" ||
        value.clientDelivery !== "manifest_only_no_embedded_payloads" ||
        value.runtimeAuthority !== "none_release_pointer_and_readback_required" ||
        value.walletAuthority !== "none" ||
        value.masteryAuthority !== "none" ||
        value.evidenceAuthority !== "none" ||
        value.publicationAuthority !== "none" ||
        value.releaseAuthority !== false)
        fail("learning_v2_activity_auxiliary_manifest_authority_invalid");
    const body = {
        schemaVersion: exports.LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_MANIFEST_SCHEMA_V1,
        stageId,
        episodeId,
        sessionId,
        sessionOrdinal,
        activityPackageFingerprint,
        sourceFingerprint,
        renderFingerprint,
        actionResourceFingerprint,
        postTerminalCardCapsuleFingerprint,
        audioRuntimeProjectionFingerprint,
        errorExplanationProjectionFingerprint,
        objects,
        objectCount: 4,
        storageEvidence: "unverified_structural_pins",
        clientDelivery: "manifest_only_no_embedded_payloads",
        runtimeAuthority: "none_release_pointer_and_readback_required",
        walletAuthority: "none",
        masteryAuthority: "none",
        evidenceAuthority: "none",
        publicationAuthority: "none",
        releaseAuthority: false,
    };
    const manifestFingerprint = exactHash(value.manifestFingerprint);
    if ((0, decision_registry_1.hashCanonicalBody)(body) !== manifestFingerprint)
        fail("learning_v2_activity_auxiliary_manifest_fingerprint_invalid");
    const result = Object.freeze({ ...body, manifestFingerprint });
    handles.add(result);
    return result;
}
function materializeLearningV2ActivityAuxiliaryReleaseManifestV1(input) {
    const action = (0, activity_learner_action_resource_v1_1.parseLearningV2ActivityLearnerActionResourceV1)(input.learnerActionRaw);
    const cards = (0, activity_post_terminal_card_capsule_v1_1.parseLearningV2ActivityPostTerminalCardCapsuleV1)(input.postTerminalCardCapsuleRaw);
    const audio = (0, activity_audio_runtime_projection_v1_1.parseLearningV2ActivityAudioRuntimeProjectionV1)(input.audioRuntimeRaw);
    const errors = (0, activity_error_explanation_catalog_v1_1.parseLearningV2ActivityErrorExplanationLearnerProjectionV1)(input.errorExplanationRaw);
    if (cards.episodeId !== action.episodeId ||
        cards.sessionId !== action.sessionId ||
        cards.sessionOrdinal !== action.sessionOrdinal ||
        cards.actionResourceFingerprint !== action.resourceFingerprint ||
        audio.episodeId !== action.episodeId ||
        audio.sessionId !== action.sessionId ||
        audio.sessionOrdinal !== action.sessionOrdinal ||
        errors.episodeId !== action.episodeId)
        fail("learning_v2_activity_auxiliary_manifest_resource_mismatch");
    const actionIds = new Set(action.entries.map((entry) => `${entry.taskId}\u0000${entry.activityId}`));
    const errorRows = errors.entries.filter((entry) => entry.sessionOrdinal === action.sessionOrdinal);
    if (errorRows.length !== 12 ||
        errorRows.some((entry) => entry.sessionId !== action.sessionId ||
            !actionIds.has(`${entry.taskId}\u0000${entry.activityId}`)) ||
        audio.entries.some((entry) => action.entries.every((actionEntry) => actionEntry.taskId !== entry.taskId)))
        fail("learning_v2_activity_auxiliary_manifest_bijection_invalid");
    const stageId = exactId(input.stageId);
    const activityPackageFingerprint = exactHash(input.activityPackageFingerprint);
    const objects = Object.freeze([
        pin(stageId, activityPackageFingerprint, action.sessionOrdinal, "learner_action", input.learnerActionRaw, input.learnerActionGeneration),
        pin(stageId, activityPackageFingerprint, action.sessionOrdinal, "post_terminal_card_capsule", input.postTerminalCardCapsuleRaw, input.postTerminalCardCapsuleGeneration),
        pin(stageId, activityPackageFingerprint, action.sessionOrdinal, "audio_runtime", input.audioRuntimeRaw, input.audioRuntimeGeneration),
        pin(stageId, activityPackageFingerprint, action.sessionOrdinal, "error_explanations", input.errorExplanationRaw, input.errorExplanationGeneration),
    ]);
    const body = {
        schemaVersion: exports.LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_MANIFEST_SCHEMA_V1,
        stageId,
        episodeId: action.episodeId,
        sessionId: action.sessionId,
        sessionOrdinal: action.sessionOrdinal,
        activityPackageFingerprint,
        sourceFingerprint: action.sourceFingerprint,
        renderFingerprint: action.renderFingerprint,
        actionResourceFingerprint: action.resourceFingerprint,
        postTerminalCardCapsuleFingerprint: cards.capsuleFingerprint,
        audioRuntimeProjectionFingerprint: audio.projectionFingerprint,
        errorExplanationProjectionFingerprint: errors.projectionFingerprint,
        objects,
        objectCount: 4,
        storageEvidence: "unverified_structural_pins",
        clientDelivery: "manifest_only_no_embedded_payloads",
        runtimeAuthority: "none_release_pointer_and_readback_required",
        walletAuthority: "none",
        masteryAuthority: "none",
        evidenceAuthority: "none",
        publicationAuthority: "none",
        releaseAuthority: false,
    };
    return parseLearningV2ActivityAuxiliaryReleaseManifestV1((0, decision_registry_1.canonicalJsonV1)({ ...body, manifestFingerprint: (0, decision_registry_1.hashCanonicalBody)(body) }));
}
function parseLearningV2ActivityAuxiliaryReleaseManifestV1(raw) {
    if (typeof raw !== "string" ||
        raw.length > exports.LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_MANIFEST_MAX_BYTES_V1 ||
        (0, decision_registry_1.utf8ByteLengthV1)(raw) >
            exports.LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_MANIFEST_MAX_BYTES_V1)
        fail("learning_v2_activity_auxiliary_manifest_raw_invalid");
    let candidate;
    try {
        candidate = JSON.parse(raw);
    }
    catch {
        fail("learning_v2_activity_auxiliary_manifest_json_invalid");
    }
    if ((0, decision_registry_1.canonicalJsonV1)(candidate) !== raw)
        fail("learning_v2_activity_auxiliary_manifest_noncanonical");
    return parseManifest(candidate);
}
function encodeLearningV2ActivityAuxiliaryReleaseManifestV1(manifest) {
    if (!isLearningV2ActivityAuxiliaryReleaseManifestV1(manifest))
        fail("learning_v2_activity_auxiliary_manifest_handle_invalid");
    return (0, decision_registry_1.canonicalJsonV1)(manifest);
}
function isLearningV2ActivityAuxiliaryReleaseManifestV1(value) {
    return typeof value === "object" && value !== null && handles.has(value);
}
//# sourceMappingURL=activity_auxiliary_release_manifest_v1.js.map