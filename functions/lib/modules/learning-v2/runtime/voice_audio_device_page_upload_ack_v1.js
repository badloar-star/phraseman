"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEARNING_V2_VOICE_AUDIO_DEVICE_PAGE_UPLOAD_ACK_SCHEMA_V1 = void 0;
exports.materializeLearningV2VoiceAudioDevicePageUploadAckV1 = materializeLearningV2VoiceAudioDevicePageUploadAckV1;
exports.parseLearningV2VoiceAudioDevicePageUploadAckV1 = parseLearningV2VoiceAudioDevicePageUploadAckV1;
const decision_registry_1 = require("../policies/decision_registry");
exports.LEARNING_V2_VOICE_AUDIO_DEVICE_PAGE_UPLOAD_ACK_SCHEMA_V1 = "learning-v2-voice-audio-device-page-upload-ack.v1";
const HASH_RE = /^[a-f0-9]{64}$/u;
function fail() {
    throw new Error("learning_v2_voice_audio_device_page_upload_ack_invalid");
}
function materializeLearningV2VoiceAudioDevicePageUploadAckV1(input) {
    if (!input ||
        typeof input !== "object" ||
        Array.isArray(input) ||
        Object.getPrototypeOf(input) !== Object.prototype ||
        Object.keys(input).sort().join("|") !==
            [
                "audioEpisodeReceiptFingerprint",
                "decoderPageReceiptFingerprint",
                "evidenceFingerprint",
                "manifestFingerprint",
                "nextPageStartIndex",
                "platform",
                "deviceClass",
                "osVersion",
                "appBuildFingerprint",
                "pageItemCount",
                "pageRunFingerprint",
                "pageStartIndex",
                "pcmPageReceiptFingerprint",
                "pageCommitFingerprint",
                "pageCommitPin",
                "stableProjectionFingerprint",
            ]
                .sort()
                .join("|") ||
        !HASH_RE.test(input.manifestFingerprint) ||
        !HASH_RE.test(input.audioEpisodeReceiptFingerprint) ||
        !HASH_RE.test(input.stableProjectionFingerprint) ||
        !HASH_RE.test(input.evidenceFingerprint) ||
        !HASH_RE.test(input.pageRunFingerprint) ||
        !HASH_RE.test(input.decoderPageReceiptFingerprint) ||
        !HASH_RE.test(input.pcmPageReceiptFingerprint) ||
        !HASH_RE.test(input.pageCommitFingerprint) ||
        !input.pageCommitPin ||
        typeof input.pageCommitPin !== "object" ||
        Array.isArray(input.pageCommitPin) ||
        Object.getPrototypeOf(input.pageCommitPin) !== Object.prototype ||
        Object.keys(input.pageCommitPin).sort().join("|") !==
            [
                "byteSize",
                "contentHash",
                "contentType",
                "objectGeneration",
                "objectPath",
            ]
                .sort()
                .join("|") ||
        !input.pageCommitPin.objectPath.includes(`/page-commit/${input.pageCommitFingerprint}/`) ||
        !HASH_RE.test(input.pageCommitPin.contentHash) ||
        !input.pageCommitPin.objectPath.endsWith(`/${input.pageCommitPin.contentHash}.json`) ||
        !/^[1-9][0-9]{0,30}$/u.test(input.pageCommitPin.objectGeneration) ||
        !Number.isSafeInteger(input.pageCommitPin.byteSize) ||
        input.pageCommitPin.byteSize < 1 ||
        input.pageCommitPin.byteSize > 32 * 1024 ||
        input.pageCommitPin.contentType !== "application/json; charset=utf-8" ||
        !["ios", "android"].includes(input.platform) ||
        !["physical_device", "simulator_or_emulator"].includes(input.deviceClass) ||
        !/^[A-Za-z0-9._-]{1,64}$/u.test(input.osVersion) ||
        !HASH_RE.test(input.appBuildFingerprint) ||
        !Number.isSafeInteger(input.pageStartIndex) ||
        input.pageStartIndex < 0 ||
        !Number.isSafeInteger(input.pageItemCount) ||
        input.pageItemCount < 1 ||
        input.pageItemCount > 32 ||
        (input.nextPageStartIndex !== null &&
            input.nextPageStartIndex !== input.pageStartIndex + input.pageItemCount))
        fail();
    const body = {
        schemaVersion: exports.LEARNING_V2_VOICE_AUDIO_DEVICE_PAGE_UPLOAD_ACK_SCHEMA_V1,
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
function parseLearningV2VoiceAudioDevicePageUploadAckV1(value) {
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
            "decoderPageReceiptFingerprint",
            "deviceClass",
            "deviceEvidenceAuthority",
            "evidenceFingerprint",
            "listeningEvidenceAuthority",
            "manifestFingerprint",
            "nextPageStartIndex",
            "osVersion",
            "pageCommitFingerprint",
            "pageCommitPin",
            "pageItemCount",
            "pageRunFingerprint",
            "pageStartIndex",
            "pcmPageReceiptFingerprint",
            "platform",
            "publicationAuthority",
            "receiptAuthority",
            "receiptPersistenceResult",
            "releaseAuthority",
            "releaseEligible",
            "runtimeConsumer",
            "schemaVersion",
            "stableProjectionFingerprint",
        ]
            .sort()
            .join("|") ||
        candidate.schemaVersion !==
            exports.LEARNING_V2_VOICE_AUDIO_DEVICE_PAGE_UPLOAD_ACK_SCHEMA_V1 ||
        candidate.receiptPersistenceResult !== "generation_pinned_exact_readback" ||
        candidate.receiptAuthority !== "none_serialized_server_acknowledgement" ||
        candidate.listeningEvidenceAuthority !== "none" ||
        candidate.deviceEvidenceAuthority !== "none" ||
        candidate.publicationAuthority !== "none" ||
        candidate.runtimeConsumer !== false ||
        candidate.releaseEligible !== false ||
        candidate.releaseAuthority !== false)
        fail();
    const rebuilt = materializeLearningV2VoiceAudioDevicePageUploadAckV1({
        manifestFingerprint: candidate.manifestFingerprint,
        audioEpisodeReceiptFingerprint: candidate.audioEpisodeReceiptFingerprint,
        stableProjectionFingerprint: candidate.stableProjectionFingerprint,
        evidenceFingerprint: candidate.evidenceFingerprint,
        pageRunFingerprint: candidate.pageRunFingerprint,
        pageStartIndex: candidate.pageStartIndex,
        pageItemCount: candidate.pageItemCount,
        nextPageStartIndex: candidate.nextPageStartIndex,
        platform: candidate.platform,
        deviceClass: candidate.deviceClass,
        osVersion: candidate.osVersion,
        appBuildFingerprint: candidate.appBuildFingerprint,
        decoderPageReceiptFingerprint: candidate.decoderPageReceiptFingerprint,
        pcmPageReceiptFingerprint: candidate.pcmPageReceiptFingerprint,
        pageCommitFingerprint: candidate.pageCommitFingerprint,
        pageCommitPin: candidate.pageCommitPin,
    });
    if (rebuilt.acknowledgementFingerprint !== candidate.acknowledgementFingerprint)
        fail();
    return rebuilt;
}
//# sourceMappingURL=voice_audio_device_page_upload_ack_v1.js.map