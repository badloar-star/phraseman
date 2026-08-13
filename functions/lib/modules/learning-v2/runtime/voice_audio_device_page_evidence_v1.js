"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEARNING_V2_VOICE_AUDIO_DEVICE_PAGE_EVIDENCE_MAX_ITEMS_V1 = exports.LEARNING_V2_VOICE_AUDIO_DEVICE_PAGE_EVIDENCE_MAX_BYTES_V1 = exports.LEARNING_V2_VOICE_AUDIO_DEVICE_PAGE_EVIDENCE_SCHEMA_V1 = void 0;
exports.parseLearningV2VoiceAudioDevicePageEvidenceV1 = parseLearningV2VoiceAudioDevicePageEvidenceV1;
const decision_registry_1 = require("../policies/decision_registry");
exports.LEARNING_V2_VOICE_AUDIO_DEVICE_PAGE_EVIDENCE_SCHEMA_V1 = "learning-v2-voice-audio-device-page-evidence.v1";
exports.LEARNING_V2_VOICE_AUDIO_DEVICE_PAGE_EVIDENCE_MAX_BYTES_V1 = 384 * 1024;
exports.LEARNING_V2_VOICE_AUDIO_DEVICE_PAGE_EVIDENCE_MAX_ITEMS_V1 = 32;
const HASH_RE = /^[a-f0-9]{64}$/u;
const TOKEN_RE = /^[A-Za-z0-9._-]{1,64}$/u;
const TOP_LEVEL_KEYS = Object.freeze([
    "appBuildFingerprint",
    "audioEpisodeReceiptFingerprint",
    "audioPageReceiptFingerprint",
    "decoderEvidenceAuthority",
    "deviceClass",
    "deviceEvidenceAuthority",
    "evidenceFingerprint",
    "humanApprovalAuthority",
    "learnerDataRetention",
    "listeningEvidenceAuthority",
    "manifestFingerprint",
    "nativeDecoderObservations",
    "nextPageStartIndex",
    "orderedNativeObservationAggregateFingerprint",
    "orderedPcmObservationAggregateFingerprint",
    "osVersion",
    "pageItemCount",
    "pageRunFingerprint",
    "pageStartIndex",
    "pcmSignalObservations",
    "platform",
    "publicationAuthority",
    "rawAudioRetention",
    "rawPcmRetention",
    "releaseAuthority",
    "releaseEligible",
    "repositoryOriginAuthority",
    "runtimeConsumer",
    "schemaVersion",
    "signalMetricAuthority",
    "stableProjectionFingerprint",
    "transportUrlRetention",
    "uploadPurpose",
]);
function fail() {
    throw new Error("learning_v2_voice_audio_device_page_evidence_invalid");
}
function exactKeys(value, expected) {
    return Object.keys(value).sort().join("|") === [...expected].sort().join("|");
}
function preflightJson(value) {
    const stack = [[value, 0]];
    let nodes = 0;
    while (stack.length > 0) {
        const [current, depth] = stack.pop();
        nodes += 1;
        if (nodes > 20000 || depth > 32)
            fail();
        if (current === null ||
            typeof current === "string" ||
            typeof current === "boolean")
            continue;
        if (typeof current === "number") {
            if (!Number.isSafeInteger(current) || Object.is(current, -0))
                fail();
            continue;
        }
        if (typeof current !== "object")
            fail();
        if (Array.isArray(current)) {
            if (current.length >
                exports.LEARNING_V2_VOICE_AUDIO_DEVICE_PAGE_EVIDENCE_MAX_ITEMS_V1)
                fail();
            for (const item of current)
                stack.push([item, depth + 1]);
            continue;
        }
        if (Object.getPrototypeOf(current) !== Object.prototype)
            fail();
        const keys = Object.keys(current);
        if (keys.length > 64)
            fail();
        for (const key of keys) {
            if (key === "__proto__" || key === "prototype" || key === "constructor")
                fail();
            stack.push([current[key], depth + 1]);
        }
    }
}
function parseLearningV2VoiceAudioDevicePageEvidenceV1(raw) {
    if (typeof raw !== "string" ||
        raw.length < 2 ||
        raw.length > exports.LEARNING_V2_VOICE_AUDIO_DEVICE_PAGE_EVIDENCE_MAX_BYTES_V1 ||
        (0, decision_registry_1.utf8ByteLengthV1)(raw) >
            exports.LEARNING_V2_VOICE_AUDIO_DEVICE_PAGE_EVIDENCE_MAX_BYTES_V1)
        fail();
    let decoded;
    try {
        decoded = JSON.parse(raw);
    }
    catch {
        fail();
    }
    preflightJson(decoded);
    if (!decoded ||
        typeof decoded !== "object" ||
        Array.isArray(decoded) ||
        Object.getPrototypeOf(decoded) !== Object.prototype ||
        (0, decision_registry_1.canonicalJsonV1)(decoded) !== raw)
        fail();
    const value = decoded;
    if (!exactKeys(value, TOP_LEVEL_KEYS) ||
        value.schemaVersion !==
            exports.LEARNING_V2_VOICE_AUDIO_DEVICE_PAGE_EVIDENCE_SCHEMA_V1 ||
        !HASH_RE.test(String(value.manifestFingerprint)) ||
        !HASH_RE.test(String(value.audioEpisodeReceiptFingerprint)) ||
        !HASH_RE.test(String(value.audioPageReceiptFingerprint)) ||
        !HASH_RE.test(String(value.stableProjectionFingerprint)) ||
        !HASH_RE.test(String(value.pageRunFingerprint)) ||
        !Number.isSafeInteger(value.pageStartIndex) ||
        Number(value.pageStartIndex) < 0 ||
        !Number.isSafeInteger(value.pageItemCount) ||
        Number(value.pageItemCount) < 1 ||
        Number(value.pageItemCount) >
            exports.LEARNING_V2_VOICE_AUDIO_DEVICE_PAGE_EVIDENCE_MAX_ITEMS_V1 ||
        !Array.isArray(value.nativeDecoderObservations) ||
        !Array.isArray(value.pcmSignalObservations) ||
        value.nativeDecoderObservations.length !== value.pageItemCount ||
        value.pcmSignalObservations.length !== value.pageItemCount ||
        !["ios", "android"].includes(String(value.platform)) ||
        !["physical_device", "simulator_or_emulator"].includes(String(value.deviceClass)) ||
        !TOKEN_RE.test(String(value.osVersion)) ||
        !HASH_RE.test(String(value.appBuildFingerprint)) ||
        value.uploadPurpose !== "private_qa_receipt_assembly_only" ||
        value.transportUrlRetention !== "forbidden" ||
        value.rawAudioRetention !== "forbidden" ||
        value.rawPcmRetention !== "forbidden" ||
        value.learnerDataRetention !== "forbidden" ||
        value.repositoryOriginAuthority !== "none" ||
        value.decoderEvidenceAuthority !==
            "unverified_serialized_device_observation" ||
        value.signalMetricAuthority !== "deterministic_pcm16_metrics_only" ||
        value.listeningEvidenceAuthority !== "none" ||
        value.deviceEvidenceAuthority !== "none" ||
        value.humanApprovalAuthority !== "none" ||
        value.publicationAuthority !== "none" ||
        value.runtimeConsumer !== false ||
        value.releaseEligible !== false ||
        value.releaseAuthority !== false)
        fail();
    if (value.orderedNativeObservationAggregateFingerprint !==
        (0, decision_registry_1.hashCanonicalBody)(value.nativeDecoderObservations.map((observation) => (0, decision_registry_1.hashCanonicalBody)(observation))) ||
        value.orderedPcmObservationAggregateFingerprint !==
            (0, decision_registry_1.hashCanonicalBody)(value.pcmSignalObservations.map((observation) => observation.observationFingerprint)))
        fail();
    const body = { ...value };
    delete body.evidenceFingerprint;
    if (value.evidenceFingerprint !== (0, decision_registry_1.hashCanonicalBody)(body))
        fail();
    return Object.freeze(value);
}
//# sourceMappingURL=voice_audio_device_page_evidence_v1.js.map