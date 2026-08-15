"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEARNING_V2_VOICE_AUDIO_DEVICE_EPISODE_UPLOAD_ACK_SCHEMA_V1 = void 0;
exports.materializeLearningV2VoiceAudioDeviceEpisodeUploadAckV1 = materializeLearningV2VoiceAudioDeviceEpisodeUploadAckV1;
exports.parseLearningV2VoiceAudioDeviceEpisodeUploadAckV1 = parseLearningV2VoiceAudioDeviceEpisodeUploadAckV1;
const decision_registry_1 = require("../policies/decision_registry");
exports.LEARNING_V2_VOICE_AUDIO_DEVICE_EPISODE_UPLOAD_ACK_SCHEMA_V1 = "learning-v2-voice-audio-device-episode-upload-ack.v1";
const HASH_RE = /^[a-f0-9]{64}$/u;
const TOKEN_RE = /^[A-Za-z0-9._-]{1,64}$/u;
function fail() {
    throw new Error("learning_v2_voice_audio_device_episode_upload_ack_invalid");
}
function materializeLearningV2VoiceAudioDeviceEpisodeUploadAckV1(input) {
    if (!input ||
        typeof input !== "object" ||
        Array.isArray(input) ||
        Object.getPrototypeOf(input) !== Object.prototype ||
        !HASH_RE.test(input.manifestFingerprint) ||
        !HASH_RE.test(input.audioEpisodeReceiptFingerprint) ||
        !["ios", "android"].includes(input.platform) ||
        !["physical_device", "simulator_or_emulator"].includes(input.deviceClass) ||
        !TOKEN_RE.test(input.osVersion) ||
        !HASH_RE.test(input.appBuildFingerprint) ||
        !Number.isSafeInteger(input.audioObjectCount) ||
        input.audioObjectCount < 1 ||
        !Number.isSafeInteger(input.pageCount) ||
        input.pageCount < 1 ||
        input.pageCount > 1404 ||
        !HASH_RE.test(input.orderedPageCommitAggregateFingerprint) ||
        !HASH_RE.test(input.decoderEpisodeReceiptFingerprint) ||
        !HASH_RE.test(input.pcmEpisodeReceiptFingerprint) ||
        ![
            "candidate_for_human_listening",
            "blocked_signal_quality",
            "blocked_nonphysical_device",
        ].includes(input.pcmEpisodeDisposition))
        fail();
    const body = {
        schemaVersion: exports.LEARNING_V2_VOICE_AUDIO_DEVICE_EPISODE_UPLOAD_ACK_SCHEMA_V1,
        ...input,
        receiptPersistenceResult: "generation_pinned_exact_readback",
        receiptAuthority: "none_serialized_server_acknowledgement",
        listeningEvidenceAuthority: "none",
        deviceEvidenceAuthority: "none",
        publicationAuthority: "none",
        runtimeConsumer: false,
        releaseEligible: false,
        releaseAuthority: false,
    };
    return Object.freeze({
        ...body,
        acknowledgementFingerprint: (0, decision_registry_1.hashCanonicalBody)(body),
    });
}
function parseLearningV2VoiceAudioDeviceEpisodeUploadAckV1(value) {
    if (!value ||
        typeof value !== "object" ||
        Array.isArray(value) ||
        Object.getPrototypeOf(value) !== Object.prototype)
        fail();
    const candidate = value;
    if (Object.keys(candidate).sort().join("|") !==
        [
            "acknowledgementFingerprint",
            "appBuildFingerprint",
            "audioEpisodeReceiptFingerprint",
            "audioObjectCount",
            "decoderEpisodeReceiptFingerprint",
            "deviceClass",
            "deviceEvidenceAuthority",
            "listeningEvidenceAuthority",
            "manifestFingerprint",
            "orderedPageCommitAggregateFingerprint",
            "osVersion",
            "pageCount",
            "pcmEpisodeDisposition",
            "pcmEpisodeReceiptFingerprint",
            "platform",
            "publicationAuthority",
            "receiptAuthority",
            "receiptPersistenceResult",
            "releaseAuthority",
            "releaseEligible",
            "runtimeConsumer",
            "schemaVersion",
        ]
            .sort()
            .join("|") ||
        candidate.schemaVersion !==
            exports.LEARNING_V2_VOICE_AUDIO_DEVICE_EPISODE_UPLOAD_ACK_SCHEMA_V1 ||
        candidate.receiptPersistenceResult !== "generation_pinned_exact_readback" ||
        candidate.receiptAuthority !== "none_serialized_server_acknowledgement" ||
        candidate.listeningEvidenceAuthority !== "none" ||
        candidate.deviceEvidenceAuthority !== "none" ||
        candidate.publicationAuthority !== "none" ||
        candidate.runtimeConsumer !== false ||
        candidate.releaseEligible !== false ||
        candidate.releaseAuthority !== false)
        fail();
    const rebuilt = materializeLearningV2VoiceAudioDeviceEpisodeUploadAckV1({
        manifestFingerprint: candidate.manifestFingerprint,
        audioEpisodeReceiptFingerprint: candidate.audioEpisodeReceiptFingerprint,
        platform: candidate.platform,
        deviceClass: candidate.deviceClass,
        osVersion: candidate.osVersion,
        appBuildFingerprint: candidate.appBuildFingerprint,
        audioObjectCount: candidate.audioObjectCount,
        pageCount: candidate.pageCount,
        orderedPageCommitAggregateFingerprint: candidate.orderedPageCommitAggregateFingerprint,
        decoderEpisodeReceiptFingerprint: candidate.decoderEpisodeReceiptFingerprint,
        pcmEpisodeReceiptFingerprint: candidate.pcmEpisodeReceiptFingerprint,
        pcmEpisodeDisposition: candidate.pcmEpisodeDisposition,
    });
    if (rebuilt.acknowledgementFingerprint !== candidate.acknowledgementFingerprint)
        fail();
    return rebuilt;
}
//# sourceMappingURL=voice_audio_device_episode_upload_ack_v1.js.map