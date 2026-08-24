"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isV2VoiceProfileRepositoryObservationV1 = exports.V2_VOICE_PROFILE_REPOSITORY_NAMESPACE_FINGERPRINT_V1 = exports.V2_VOICE_PROFILE_REPOSITORY_NAMESPACE_V1 = exports.V2_VOICE_PROFILE_REPOSITORY_LIFECYCLE_MAX_BYTES_V1 = exports.V2_VOICE_PROFILE_REPOSITORY_RECORD_MAX_BYTES_V1 = exports.V2_VOICE_PROFILE_REPOSITORY_OBSERVATION_SCHEMA_V1 = exports.V2_VOICE_PROFILE_REPOSITORY_LIFECYCLE_SCHEMA_V1 = exports.V2_VOICE_PROFILE_REPOSITORY_RECORD_SCHEMA_V1 = void 0;
exports.v2VoiceProfileRepositoryRecordDocumentPathV1 = v2VoiceProfileRepositoryRecordDocumentPathV1;
exports.v2VoiceProfileRepositoryLifecycleDocumentPathV1 = v2VoiceProfileRepositoryLifecycleDocumentPathV1;
exports.v2VoiceProfileRepositoryObjectPathV1 = v2VoiceProfileRepositoryObjectPathV1;
exports.parseV2VoiceProfileRepositoryRecordV1 = parseV2VoiceProfileRepositoryRecordV1;
exports.parseV2VoiceProfileRepositoryLifecycleV1 = parseV2VoiceProfileRepositoryLifecycleV1;
exports.observeV2VoiceProfileRepositoryClaimV1 = observeV2VoiceProfileRepositoryClaimV1;
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const v2_voice_profile_contracts_v1_1 = require("./v2_voice_profile_contracts_v1");
exports.V2_VOICE_PROFILE_REPOSITORY_RECORD_SCHEMA_V1 = "v2-voice-profile-repository-record.v1";
exports.V2_VOICE_PROFILE_REPOSITORY_LIFECYCLE_SCHEMA_V1 = "v2-voice-profile-repository-lifecycle.v1";
exports.V2_VOICE_PROFILE_REPOSITORY_OBSERVATION_SCHEMA_V1 = "v2-voice-profile-repository-observation.v1";
exports.V2_VOICE_PROFILE_REPOSITORY_RECORD_MAX_BYTES_V1 = 64 * 1024;
exports.V2_VOICE_PROFILE_REPOSITORY_LIFECYCLE_MAX_BYTES_V1 = 32 * 1024;
exports.V2_VOICE_PROFILE_REPOSITORY_NAMESPACE_V1 = Object.freeze({
    schemaVersion: "v2-voice-profile-repository-namespace.v1",
    firestore: Object.freeze({
        speechVersions: "content_speech_profile_versions",
        speechLifecycle: "content_speech_profile_lifecycle",
        generationVersions: "content_voice_generation_profile_versions",
        generationLifecycle: "content_voice_generation_profile_lifecycle",
    }),
    storage: Object.freeze({
        speechPrefix: "content-studio/speech-profiles",
        generationPrefix: "content-studio/voice-generation-profiles",
    }),
    recordAuthority: "none",
    lifecycleAuthority: "none",
    storageAuthority: "none",
});
exports.V2_VOICE_PROFILE_REPOSITORY_NAMESPACE_FINGERPRINT_V1 = (0, decision_registry_1.hashCanonicalBody)(exports.V2_VOICE_PROFILE_REPOSITORY_NAMESPACE_V1);
const ID_RE = /^[a-z0-9][a-z0-9._-]{0,127}$/;
const HASH_RE = /^[a-f0-9]{64}$/;
const GENERATION_RE = /^[1-9][0-9]{0,30}$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const TOKEN_RE = /^[a-z0-9][a-z0-9._:@-]{0,159}$/;
const records = new WeakSet();
const lifecycles = new WeakSet();
const observations = new WeakSet();
function fail(code) {
    throw new Error(code);
}
function isRecord(value) {
    if (typeof value !== "object" || value === null || Array.isArray(value))
        return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}
function exactKeys(value, keys) {
    const actual = Object.keys(value).sort();
    const expected = [...keys].sort();
    return (actual.length === expected.length &&
        actual.every((key, index) => key === expected[index]));
}
function parseCanonical(raw, maximum, code) {
    if (typeof raw !== "string" ||
        raw.length > maximum ||
        (0, decision_registry_1.utf8ByteLengthV1)(raw) > maximum)
        fail(code);
    let value;
    try {
        value = JSON.parse(raw);
    }
    catch {
        fail(code);
    }
    if (!isRecord(value) || (0, decision_registry_1.canonicalJsonV1)(value) !== raw)
        fail(code);
    return value;
}
function identity(input) {
    if ((input.profileKind !== "speech_profile" &&
        input.profileKind !== "voice_generation_profile") ||
        !ID_RE.test(input.profileId) ||
        !Number.isSafeInteger(input.version) ||
        input.version < 1 ||
        input.version > 1_000_000 ||
        !HASH_RE.test(input.contentHash))
        fail("v2_voice_profile_repository_identity_invalid");
    return input;
}
function documentId(profileId, version) {
    return `${(0, decision_registry_1.sha256Utf8)(profileId)}__v${version}`;
}
function v2VoiceProfileRepositoryRecordDocumentPathV1(profileKind, profileId, version) {
    identity({ profileKind, profileId, version, contentHash: "0".repeat(64) });
    const root = profileKind === "speech_profile"
        ? exports.V2_VOICE_PROFILE_REPOSITORY_NAMESPACE_V1.firestore.speechVersions
        : exports.V2_VOICE_PROFILE_REPOSITORY_NAMESPACE_V1.firestore.generationVersions;
    return `${root}/${documentId(profileId, version)}`;
}
function v2VoiceProfileRepositoryLifecycleDocumentPathV1(profileKind, profileId, version) {
    identity({ profileKind, profileId, version, contentHash: "0".repeat(64) });
    const root = profileKind === "speech_profile"
        ? exports.V2_VOICE_PROFILE_REPOSITORY_NAMESPACE_V1.firestore.speechLifecycle
        : exports.V2_VOICE_PROFILE_REPOSITORY_NAMESPACE_V1.firestore.generationLifecycle;
    return `${root}/${documentId(profileId, version)}`;
}
function v2VoiceProfileRepositoryObjectPathV1(input) {
    identity(input);
    const root = input.profileKind === "speech_profile"
        ? exports.V2_VOICE_PROFILE_REPOSITORY_NAMESPACE_V1.storage.speechPrefix
        : exports.V2_VOICE_PROFILE_REPOSITORY_NAMESPACE_V1.storage.generationPrefix;
    return `${root}/${(0, decision_registry_1.sha256Utf8)(input.profileId)}/v${input.version}/${input.contentHash}.json`;
}
function parseV2VoiceProfileRepositoryRecordV1(raw) {
    const value = parseCanonical(raw, exports.V2_VOICE_PROFILE_REPOSITORY_RECORD_MAX_BYTES_V1, "v2_voice_profile_repository_record_invalid");
    if (!exactKeys(value, [
        "schemaVersion",
        "profileKind",
        "profileId",
        "version",
        "contentHash",
        "object",
        "createdAt",
        "createdBy",
        "recordAuthority",
    ]) ||
        !isRecord(value.object) ||
        !exactKeys(value.object, [
            "objectPath",
            "contentHash",
            "objectGeneration",
            "byteSize",
            "contentType",
        ]))
        fail("v2_voice_profile_repository_record_invalid");
    const candidate = value;
    identity(candidate);
    const expectedPath = v2VoiceProfileRepositoryObjectPathV1(candidate);
    if (candidate.schemaVersion !== exports.V2_VOICE_PROFILE_REPOSITORY_RECORD_SCHEMA_V1 ||
        candidate.object.objectPath !== expectedPath ||
        candidate.object.contentHash !== candidate.contentHash ||
        !GENERATION_RE.test(candidate.object.objectGeneration) ||
        !Number.isSafeInteger(candidate.object.byteSize) ||
        candidate.object.byteSize < 2 ||
        candidate.object.byteSize > v2_voice_profile_contracts_v1_1.V2_VOICE_PROFILE_BODY_MAX_BYTES_V1 ||
        candidate.object.contentType !== "application/json; charset=utf-8" ||
        !ISO_RE.test(candidate.createdAt) ||
        !TOKEN_RE.test(candidate.createdBy) ||
        candidate.recordAuthority !== "none")
        fail("v2_voice_profile_repository_record_invalid");
    Object.freeze(candidate.object);
    Object.freeze(candidate);
    records.add(candidate);
    return candidate;
}
function parseV2VoiceProfileRepositoryLifecycleV1(raw) {
    const value = parseCanonical(raw, exports.V2_VOICE_PROFILE_REPOSITORY_LIFECYCLE_MAX_BYTES_V1, "v2_voice_profile_repository_lifecycle_invalid");
    if (!exactKeys(value, [
        "schemaVersion",
        "profileKind",
        "profileId",
        "version",
        "contentHash",
        "status",
        "lifecycleRevision",
        "changedAt",
        "changedBy",
        "reason",
        "lifecycleAuthority",
    ]))
        fail("v2_voice_profile_repository_lifecycle_invalid");
    const candidate = value;
    identity(candidate);
    if (candidate.schemaVersion !==
        exports.V2_VOICE_PROFILE_REPOSITORY_LIFECYCLE_SCHEMA_V1 ||
        candidate.status !== "published" ||
        !Number.isSafeInteger(candidate.lifecycleRevision) ||
        candidate.lifecycleRevision < 1 ||
        !ISO_RE.test(candidate.changedAt) ||
        !TOKEN_RE.test(candidate.changedBy) ||
        typeof candidate.reason !== "string" ||
        candidate.reason.length < 1 ||
        candidate.reason.length > 500 ||
        candidate.lifecycleAuthority !== "none")
        fail("v2_voice_profile_repository_lifecycle_invalid");
    Object.freeze(candidate);
    lifecycles.add(candidate);
    return candidate;
}
function observeV2VoiceProfileRepositoryClaimV1(input) {
    if (!records.has(input.record) || !lifecycles.has(input.lifecycle))
        fail("v2_voice_profile_repository_claim_untrusted");
    if ((0, decision_registry_1.canonicalJsonV1)({
        profileKind: input.record.profileKind,
        profileId: input.record.profileId,
        version: input.record.version,
        contentHash: input.record.contentHash,
    }) !==
        (0, decision_registry_1.canonicalJsonV1)({
            profileKind: input.lifecycle.profileKind,
            profileId: input.lifecycle.profileId,
            version: input.lifecycle.version,
            contentHash: input.lifecycle.contentHash,
        }) ||
        (0, decision_registry_1.utf8ByteLengthV1)(input.bodyRaw) !== input.record.object.byteSize ||
        (0, decision_registry_1.sha256Utf8)(input.bodyRaw) !== input.record.contentHash)
        fail("v2_voice_profile_repository_claim_mismatch");
    const body = input.record.profileKind === "speech_profile"
        ? (0, v2_voice_profile_contracts_v1_1.parseV2SpeechProfileBodyV1)(input.bodyRaw)
        : (0, v2_voice_profile_contracts_v1_1.parseV2VoiceGenerationProfileBodyV1)(input.bodyRaw);
    if ((!(0, v2_voice_profile_contracts_v1_1.isV2SpeechProfileBodyV1)(body) &&
        !(0, v2_voice_profile_contracts_v1_1.isV2VoiceGenerationProfileBodyV1)(body)) ||
        body.profileId !== input.record.profileId ||
        body.version !== input.record.version)
        fail("v2_voice_profile_repository_body_mismatch");
    const observationBody = {
        schemaVersion: exports.V2_VOICE_PROFILE_REPOSITORY_OBSERVATION_SCHEMA_V1,
        namespaceFingerprint: exports.V2_VOICE_PROFILE_REPOSITORY_NAMESPACE_FINGERPRINT_V1,
        profileKind: input.record.profileKind,
        profileId: input.record.profileId,
        version: input.record.version,
        contentHash: input.record.contentHash,
        recordDocumentPath: v2VoiceProfileRepositoryRecordDocumentPathV1(input.record.profileKind, input.record.profileId, input.record.version),
        lifecycleDocumentPath: v2VoiceProfileRepositoryLifecycleDocumentPathV1(input.record.profileKind, input.record.profileId, input.record.version),
        objectPin: input.record.object,
        recordFingerprint: (0, decision_registry_1.hashCanonicalBody)(input.record),
        lifecycleFingerprint: (0, decision_registry_1.hashCanonicalBody)(input.lifecycle),
        bodyFingerprint: (0, decision_registry_1.hashCanonicalBody)(body),
        recordOriginAuthority: "none",
        lifecycleAuthority: "none",
        storageAuthority: "none",
        providerExecutionAuthority: "none",
        audioByteAuthority: "none",
        executionAuthority: "none",
        publicationAuthority: "none",
        runtimeConsumer: false,
        releaseEligible: false,
        releaseAuthority: false,
    };
    const observation = Object.freeze({
        ...observationBody,
        observationFingerprint: (0, decision_registry_1.hashCanonicalBody)(observationBody),
    });
    observations.add(observation);
    return Object.freeze({ observation, body });
}
const isV2VoiceProfileRepositoryObservationV1 = (value) => typeof value === "object" && value !== null && observations.has(value);
exports.isV2VoiceProfileRepositoryObservationV1 = isV2VoiceProfileRepositoryObservationV1;
//# sourceMappingURL=v2_voice_profile_repository_contract_v1.js.map