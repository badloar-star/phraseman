"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEARNING_V2_PCM_SIGNAL_POLICY_V1 = exports.LEARNING_V2_PCM_SIGNAL_SOURCE_MAX_BYTES_V1 = exports.LEARNING_V2_PCM_SIGNAL_MAX_DURATION_MS_V1 = exports.LEARNING_V2_PCM_SIGNAL_MAX_CHUNKS_V1 = exports.LEARNING_V2_PCM_SIGNAL_OBSERVER_SCHEMA_V1 = void 0;
exports.parseLearningV2PcmSignalIdentityV1 = parseLearningV2PcmSignalIdentityV1;
exports.observeLearningV2DecodedPcmSignalV1 = observeLearningV2DecodedPcmSignalV1;
exports.observeLearningV2NativePcmSignalMetricsV1 = observeLearningV2NativePcmSignalMetricsV1;
const decision_registry_1 = require("../policies/decision_registry");
exports.LEARNING_V2_PCM_SIGNAL_OBSERVER_SCHEMA_V1 = "learning-v2-pcm-signal-observer.v1";
exports.LEARNING_V2_PCM_SIGNAL_MAX_CHUNKS_V1 = 4096;
exports.LEARNING_V2_PCM_SIGNAL_MAX_DURATION_MS_V1 = 120000;
exports.LEARNING_V2_PCM_SIGNAL_SOURCE_MAX_BYTES_V1 = 64 * 1024;
const policyBody = Object.freeze({
    schemaVersion: "learning-v2-pcm-signal-policy.v1",
    policyId: "decoded-pcm16-signal-screen-v1",
    policyVersion: 1,
    pcmEncoding: "signed_16_bit",
    acceptedSampleRatesHz: Object.freeze([
        8000, 11025, 12000, 16000, 22050, 24000, 32000, 44100, 48000,
    ]),
    acceptedChannelCounts: Object.freeze([1, 2]),
    minimumDurationMs: 100,
    maximumDurationMs: exports.LEARNING_V2_PCM_SIGNAL_MAX_DURATION_MS_V1,
    maximumChunkCount: exports.LEARNING_V2_PCM_SIGNAL_MAX_CHUNKS_V1,
    activeSampleAbsoluteThreshold: 328,
    nearSilenceMaximumActiveSampleBasisPoints: 100,
    clippingAbsoluteThreshold: 32760,
    clippingMinimumSampleBasisPoints: 10,
    evidenceClass: "deterministic_decoded_pcm_metrics_only",
    noiseClassification: "not_measured",
    speechCorrectnessClassification: "not_measured",
});
exports.LEARNING_V2_PCM_SIGNAL_POLICY_V1 = Object.freeze({
    body: policyBody,
    ref: Object.freeze({
        policyId: policyBody.policyId,
        version: policyBody.policyVersion,
        contentHash: (0, decision_registry_1.hashCanonicalBody)(policyBody),
    }),
});
const HASH_RE = /^[a-f0-9]{64}$/u;
const TOKEN_RE = /^[A-Za-z0-9._-]{1,64}$/u;
const PATH_RE = /^[A-Za-z0-9._:+/-]{1,1000}$/u;
const IDENTITY_KEYS = Object.freeze([
    "appBuildFingerprint",
    "byteSize",
    "contentHash",
    "decoderStatusSequenceFingerprint",
    "deviceClass",
    "entryFingerprint",
    "expoAudioVersion",
    "generationTargetFingerprint",
    "itemIndex",
    "objectGeneration",
    "objectPath",
    "osVersion",
    "platform",
]);
const NATIVE_METRIC_KEYS = Object.freeze([
    "activeSampleBasisPoints",
    "channelCount",
    "clippedSampleBasisPoints",
    "decoderBackend",
    "durationMs",
    "frameCount",
    "leadingSilenceMs",
    "peakAbsoluteSample",
    "rmsAbsoluteSample",
    "sampleCount",
    "sampleRateHz",
    "schemaVersion",
    "sourceByteSize",
    "sourceSha256",
    "trailingSilenceMs",
    "zeroSampleBasisPoints",
]);
function fail() {
    throw new Error("learning_v2_pcm_signal_observation_invalid");
}
function exactIdentity(value) {
    if (!value ||
        typeof value !== "object" ||
        Array.isArray(value) ||
        Object.getPrototypeOf(value) !== Object.prototype ||
        Object.keys(value).sort().join("|") !==
            [...IDENTITY_KEYS].sort().join("|") ||
        !Number.isSafeInteger(value.itemIndex) ||
        value.itemIndex < 0 ||
        !HASH_RE.test(value.generationTargetFingerprint) ||
        !HASH_RE.test(value.entryFingerprint) ||
        !PATH_RE.test(value.objectPath) ||
        value.objectPath.split("/").some((part) => part === "." || part === "..") ||
        !HASH_RE.test(value.contentHash) ||
        !/^[1-9][0-9]{0,30}$/u.test(value.objectGeneration) ||
        !Number.isSafeInteger(value.byteSize) ||
        value.byteSize < 1 ||
        !["ios", "android"].includes(value.platform) ||
        !["physical_device", "simulator_or_emulator"].includes(value.deviceClass) ||
        !TOKEN_RE.test(value.osVersion) ||
        !HASH_RE.test(value.appBuildFingerprint) ||
        value.expoAudioVersion !== "1.1.1" ||
        !HASH_RE.test(value.decoderStatusSequenceFingerprint))
        fail();
    return Object.freeze({ ...value });
}
function parseLearningV2PcmSignalIdentityV1(value) {
    return exactIdentity(value);
}
function integerSquareRoot(value) {
    if (value < 0n)
        fail();
    if (value < 2n)
        return value;
    let current = 1n << BigInt(Math.ceil(value.toString(2).length / 2));
    for (;;) {
        const next = (current + value / current) >> 1n;
        if (next >= current)
            return current;
        current = next;
    }
}
function basisPoints(numerator, denominator) {
    return Math.floor((numerator * 10000) / denominator);
}
function signalClassFromMetrics(peakAbsoluteSample, activeSampleBasisPoints, clippedSampleBasisPoints) {
    return peakAbsoluteSample === 0
        ? "digital_silence"
        : activeSampleBasisPoints <=
            policyBody.nearSilenceMaximumActiveSampleBasisPoints
            ? "near_silence"
            : clippedSampleBasisPoints >= policyBody.clippingMinimumSampleBasisPoints
                ? "clipping_detected"
                : "clean_signal_candidate";
}
function exactMetricInteger(value, minimum, maximum) {
    if (!Number.isSafeInteger(value) ||
        value < minimum ||
        value > maximum)
        fail();
    return value;
}
function materializeObservation(identity, metrics, pcmSourceBindingAuthority) {
    const signalClass = signalClassFromMetrics(metrics.peakAbsoluteSample, metrics.activeSampleBasisPoints, metrics.clippedSampleBasisPoints);
    const body = {
        schemaVersion: exports.LEARNING_V2_PCM_SIGNAL_OBSERVER_SCHEMA_V1,
        signalPolicyRef: exports.LEARNING_V2_PCM_SIGNAL_POLICY_V1.ref,
        ...identity,
        ...metrics,
        pcmEncoding: "signed_16_bit",
        signalClass,
        pcmSourceBindingAuthority,
        signalMetricAuthority: "deterministic_pcm16_metrics_only",
        noiseEvidenceAuthority: "none",
        speechCorrectnessAuthority: "none",
        listeningEvidenceAuthority: "none",
        deviceEvidenceAuthority: "none",
        humanApprovalAuthority: "none",
        publicationAuthority: "none",
        runtimeConsumer: false,
        releaseEligible: false,
        releaseAuthority: false,
    };
    return Object.freeze({
        ...body,
        observationFingerprint: (0, decision_registry_1.hashCanonicalBody)(body),
    });
}
function observeLearningV2DecodedPcmSignalV1(input) {
    if (!input ||
        typeof input !== "object" ||
        Array.isArray(input) ||
        Object.getPrototypeOf(input) !== Object.prototype ||
        Object.keys(input).sort().join("|") !==
            "channelCount|chunks|identity|sampleRateHz" ||
        !policyBody.acceptedSampleRatesHz.includes(input.sampleRateHz) ||
        !policyBody.acceptedChannelCounts.includes(input.channelCount) ||
        !Array.isArray(input.chunks) ||
        input.chunks.length < 1 ||
        input.chunks.length > policyBody.maximumChunkCount)
        fail();
    const identity = exactIdentity(input.identity);
    let sampleCount = 0;
    for (const chunk of input.chunks) {
        if (!(chunk instanceof Int16Array) || chunk.length < 1)
            fail();
        sampleCount += chunk.length;
        if (!Number.isSafeInteger(sampleCount))
            fail();
    }
    if (sampleCount % input.channelCount !== 0)
        fail();
    const frameCount = sampleCount / input.channelCount;
    const maximumFrameCount = Math.floor((input.sampleRateHz * policyBody.maximumDurationMs) / 1000);
    const minimumFrameCount = Math.ceil((input.sampleRateHz * policyBody.minimumDurationMs) / 1000);
    if (frameCount < minimumFrameCount || frameCount > maximumFrameCount)
        fail();
    let sumSquares = 0n;
    let peakAbsoluteSample = 0;
    let activeSampleCount = 0;
    let clippedSampleCount = 0;
    let zeroSampleCount = 0;
    let leadingSilentFrames = 0;
    let trailingSilentFrames = 0;
    let activeFrameObserved = false;
    let frameChannelOffset = 0;
    let currentFrameActive = false;
    for (const chunk of input.chunks) {
        for (let index = 0; index < chunk.length; index += 1) {
            const sample = chunk[index];
            const absolute = sample === -32768 ? 32768 : Math.abs(sample);
            sumSquares += BigInt(absolute) * BigInt(absolute);
            peakAbsoluteSample = Math.max(peakAbsoluteSample, absolute);
            if (absolute >= policyBody.activeSampleAbsoluteThreshold) {
                activeSampleCount += 1;
                currentFrameActive = true;
            }
            if (absolute >= policyBody.clippingAbsoluteThreshold)
                clippedSampleCount += 1;
            if (absolute === 0)
                zeroSampleCount += 1;
            frameChannelOffset += 1;
            if (frameChannelOffset === input.channelCount) {
                if (currentFrameActive) {
                    activeFrameObserved = true;
                    trailingSilentFrames = 0;
                }
                else if (!activeFrameObserved) {
                    leadingSilentFrames += 1;
                }
                else {
                    trailingSilentFrames += 1;
                }
                frameChannelOffset = 0;
                currentFrameActive = false;
            }
        }
    }
    const meanSquare = sumSquares / BigInt(sampleCount);
    const rmsAbsoluteSample = Number(integerSquareRoot(meanSquare));
    const activeSampleBasisPoints = basisPoints(activeSampleCount, sampleCount);
    const clippedSampleBasisPoints = basisPoints(clippedSampleCount, sampleCount);
    const zeroSampleBasisPoints = basisPoints(zeroSampleCount, sampleCount);
    return materializeObservation(identity, Object.freeze({
        sampleRateHz: input.sampleRateHz,
        channelCount: input.channelCount,
        sampleCount,
        frameCount,
        durationMs: Math.round((frameCount * 1000) / input.sampleRateHz),
        peakAbsoluteSample,
        rmsAbsoluteSample,
        activeSampleBasisPoints,
        clippedSampleBasisPoints,
        zeroSampleBasisPoints,
        leadingSilenceMs: Math.round((leadingSilentFrames * 1000) / input.sampleRateHz),
        trailingSilenceMs: Math.round((trailingSilentFrames * 1000) / input.sampleRateHz),
    }), "unverified_caller_supplied_decoded_pcm");
}
function observeLearningV2NativePcmSignalMetricsV1(input) {
    if (!input ||
        typeof input !== "object" ||
        Array.isArray(input) ||
        Object.getPrototypeOf(input) !== Object.prototype ||
        Object.keys(input).sort().join("|") !== "identity|metrics")
        fail();
    const identity = exactIdentity(input.identity);
    const metrics = input.metrics;
    if (!metrics ||
        typeof metrics !== "object" ||
        Array.isArray(metrics) ||
        Object.getPrototypeOf(metrics) !== Object.prototype ||
        Object.keys(metrics).sort().join("|") !==
            [...NATIVE_METRIC_KEYS].sort().join("|") ||
        metrics.schemaVersion !== "learning-v2-native-pcm-decode-metrics.v1" ||
        metrics.decoderBackend !==
            (identity.platform === "ios" ? "av_audio_file" : "android_media_codec") ||
        metrics.sourceByteSize !== identity.byteSize ||
        metrics.sourceSha256 !== identity.contentHash ||
        !policyBody.acceptedSampleRatesHz.includes(metrics.sampleRateHz) ||
        !policyBody.acceptedChannelCounts.includes(metrics.channelCount))
        fail();
    const sampleCount = exactMetricInteger(metrics.sampleCount, 1, metrics.sampleRateHz * metrics.channelCount * 120);
    const frameCount = exactMetricInteger(metrics.frameCount, 1, metrics.sampleRateHz * 120);
    const durationMs = exactMetricInteger(metrics.durationMs, 100, 120000);
    const peakAbsoluteSample = exactMetricInteger(metrics.peakAbsoluteSample, 0, 32768);
    const rmsAbsoluteSample = exactMetricInteger(metrics.rmsAbsoluteSample, 0, peakAbsoluteSample);
    const activeSampleBasisPoints = exactMetricInteger(metrics.activeSampleBasisPoints, 0, 10000);
    const clippedSampleBasisPoints = exactMetricInteger(metrics.clippedSampleBasisPoints, 0, 10000);
    const zeroSampleBasisPoints = exactMetricInteger(metrics.zeroSampleBasisPoints, 0, 10000);
    const leadingSilenceMs = exactMetricInteger(metrics.leadingSilenceMs, 0, durationMs);
    const trailingSilenceMs = exactMetricInteger(metrics.trailingSilenceMs, 0, durationMs);
    if (sampleCount !== frameCount * metrics.channelCount ||
        durationMs !== Math.round((frameCount * 1000) / metrics.sampleRateHz))
        fail();
    return materializeObservation(identity, Object.freeze({
        sampleRateHz: metrics.sampleRateHz,
        channelCount: metrics.channelCount,
        sampleCount,
        frameCount,
        durationMs,
        peakAbsoluteSample,
        rmsAbsoluteSample,
        activeSampleBasisPoints,
        clippedSampleBasisPoints,
        zeroSampleBasisPoints,
        leadingSilenceMs,
        trailingSilenceMs,
    }), "unverified_serialized_native_system_decode_report");
}
//# sourceMappingURL=voice_pcm_signal_observer_v1.js.map