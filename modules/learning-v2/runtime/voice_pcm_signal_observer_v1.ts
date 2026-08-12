import { hashCanonicalBody } from "../policies/decision_registry";

export const LEARNING_V2_PCM_SIGNAL_OBSERVER_SCHEMA_V1 =
  "learning-v2-pcm-signal-observer.v1" as const;
export const LEARNING_V2_PCM_SIGNAL_MAX_CHUNKS_V1 = 4_096;
export const LEARNING_V2_PCM_SIGNAL_MAX_DURATION_MS_V1 = 120_000;
export const LEARNING_V2_PCM_SIGNAL_SOURCE_MAX_BYTES_V1 = 64 * 1024;

const policyBody = Object.freeze({
  schemaVersion: "learning-v2-pcm-signal-policy.v1" as const,
  policyId: "decoded-pcm16-signal-screen-v1" as const,
  policyVersion: 1 as const,
  pcmEncoding: "signed_16_bit" as const,
  acceptedSampleRatesHz: Object.freeze([
    8_000, 11_025, 12_000, 16_000, 22_050, 24_000, 32_000, 44_100, 48_000,
  ] as const),
  acceptedChannelCounts: Object.freeze([1, 2] as const),
  minimumDurationMs: 100 as const,
  maximumDurationMs: LEARNING_V2_PCM_SIGNAL_MAX_DURATION_MS_V1,
  maximumChunkCount: LEARNING_V2_PCM_SIGNAL_MAX_CHUNKS_V1,
  activeSampleAbsoluteThreshold: 328 as const,
  nearSilenceMaximumActiveSampleBasisPoints: 100 as const,
  clippingAbsoluteThreshold: 32_760 as const,
  clippingMinimumSampleBasisPoints: 10 as const,
  evidenceClass: "deterministic_decoded_pcm_metrics_only" as const,
  noiseClassification: "not_measured" as const,
  speechCorrectnessClassification: "not_measured" as const,
});

export const LEARNING_V2_PCM_SIGNAL_POLICY_V1 = Object.freeze({
  body: policyBody,
  ref: Object.freeze({
    policyId: policyBody.policyId,
    version: policyBody.policyVersion,
    contentHash: hashCanonicalBody(policyBody),
  }),
});

export type LearningV2PcmSignalClassV1 =
  | "clean_signal_candidate"
  | "digital_silence"
  | "near_silence"
  | "clipping_detected";

export interface LearningV2PcmSignalIdentityV1 {
  readonly itemIndex: number;
  readonly generationTargetFingerprint: string;
  readonly entryFingerprint: string;
  readonly objectPath: string;
  readonly contentHash: string;
  readonly objectGeneration: string;
  readonly byteSize: number;
  readonly platform: "ios" | "android";
  readonly deviceClass: "physical_device" | "simulator_or_emulator";
  readonly osVersion: string;
  readonly appBuildFingerprint: string;
  readonly expoAudioVersion: "1.1.1";
  readonly decoderStatusSequenceFingerprint: string;
}

export interface LearningV2PcmSignalObservationV1 extends LearningV2PcmSignalIdentityV1 {
  readonly schemaVersion: typeof LEARNING_V2_PCM_SIGNAL_OBSERVER_SCHEMA_V1;
  readonly signalPolicyRef: typeof LEARNING_V2_PCM_SIGNAL_POLICY_V1.ref;
  readonly sampleRateHz: number;
  readonly channelCount: 1 | 2;
  readonly pcmEncoding: "signed_16_bit";
  readonly sampleCount: number;
  readonly frameCount: number;
  readonly durationMs: number;
  readonly peakAbsoluteSample: number;
  readonly rmsAbsoluteSample: number;
  readonly activeSampleBasisPoints: number;
  readonly clippedSampleBasisPoints: number;
  readonly zeroSampleBasisPoints: number;
  readonly leadingSilenceMs: number;
  readonly trailingSilenceMs: number;
  readonly signalClass: LearningV2PcmSignalClassV1;
  readonly pcmSourceBindingAuthority:
    | "unverified_caller_supplied_decoded_pcm"
    | "unverified_serialized_native_system_decode_report";
  readonly signalMetricAuthority: "deterministic_pcm16_metrics_only";
  readonly noiseEvidenceAuthority: "none";
  readonly speechCorrectnessAuthority: "none";
  readonly listeningEvidenceAuthority: "none";
  readonly deviceEvidenceAuthority: "none";
  readonly humanApprovalAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly observationFingerprint: string;
}

export interface LearningV2NativePcmDecodeMetricsV1 {
  readonly schemaVersion: "learning-v2-native-pcm-decode-metrics.v1";
  readonly decoderBackend: "av_audio_file" | "android_media_codec";
  readonly sourceByteSize: number;
  readonly sourceSha256: string;
  readonly sampleRateHz: number;
  readonly channelCount: 1 | 2;
  readonly sampleCount: number;
  readonly frameCount: number;
  readonly durationMs: number;
  readonly peakAbsoluteSample: number;
  readonly rmsAbsoluteSample: number;
  readonly activeSampleBasisPoints: number;
  readonly clippedSampleBasisPoints: number;
  readonly zeroSampleBasisPoints: number;
  readonly leadingSilenceMs: number;
  readonly trailingSilenceMs: number;
}

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
] as const);
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
] as const);

function fail(): never {
  throw new Error("learning_v2_pcm_signal_observation_invalid");
}

function exactIdentity(
  value: LearningV2PcmSignalIdentityV1,
): Readonly<LearningV2PcmSignalIdentityV1> {
  if (
    !value ||
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
    !HASH_RE.test(value.decoderStatusSequenceFingerprint)
  )
    fail();
  return Object.freeze({ ...value });
}

export function parseLearningV2PcmSignalIdentityV1(
  value: LearningV2PcmSignalIdentityV1,
): Readonly<LearningV2PcmSignalIdentityV1> {
  return exactIdentity(value);
}

function integerSquareRoot(value: bigint): bigint {
  if (value < 0n) fail();
  if (value < 2n) return value;
  let current = 1n << BigInt(Math.ceil(value.toString(2).length / 2));
  for (;;) {
    const next = (current + value / current) >> 1n;
    if (next >= current) return current;
    current = next;
  }
}

function basisPoints(numerator: number, denominator: number): number {
  return Math.floor((numerator * 10_000) / denominator);
}

function signalClassFromMetrics(
  peakAbsoluteSample: number,
  activeSampleBasisPoints: number,
  clippedSampleBasisPoints: number,
): LearningV2PcmSignalClassV1 {
  return peakAbsoluteSample === 0
    ? "digital_silence"
    : activeSampleBasisPoints <=
        policyBody.nearSilenceMaximumActiveSampleBasisPoints
      ? "near_silence"
      : clippedSampleBasisPoints >= policyBody.clippingMinimumSampleBasisPoints
        ? "clipping_detected"
        : "clean_signal_candidate";
}

function exactMetricInteger(
  value: unknown,
  minimum: number,
  maximum: number,
): number {
  if (
    !Number.isSafeInteger(value) ||
    (value as number) < minimum ||
    (value as number) > maximum
  )
    fail();
  return value as number;
}

function materializeObservation(
  identity: Readonly<LearningV2PcmSignalIdentityV1>,
  metrics: Readonly<{
    sampleRateHz: number;
    channelCount: 1 | 2;
    sampleCount: number;
    frameCount: number;
    durationMs: number;
    peakAbsoluteSample: number;
    rmsAbsoluteSample: number;
    activeSampleBasisPoints: number;
    clippedSampleBasisPoints: number;
    zeroSampleBasisPoints: number;
    leadingSilenceMs: number;
    trailingSilenceMs: number;
  }>,
  pcmSourceBindingAuthority: LearningV2PcmSignalObservationV1["pcmSourceBindingAuthority"],
): LearningV2PcmSignalObservationV1 {
  const signalClass = signalClassFromMetrics(
    metrics.peakAbsoluteSample,
    metrics.activeSampleBasisPoints,
    metrics.clippedSampleBasisPoints,
  );
  const body = {
    schemaVersion: LEARNING_V2_PCM_SIGNAL_OBSERVER_SCHEMA_V1,
    signalPolicyRef: LEARNING_V2_PCM_SIGNAL_POLICY_V1.ref,
    ...identity,
    ...metrics,
    pcmEncoding: "signed_16_bit" as const,
    signalClass,
    pcmSourceBindingAuthority,
    signalMetricAuthority: "deterministic_pcm16_metrics_only" as const,
    noiseEvidenceAuthority: "none" as const,
    speechCorrectnessAuthority: "none" as const,
    listeningEvidenceAuthority: "none" as const,
    deviceEvidenceAuthority: "none" as const,
    humanApprovalAuthority: "none" as const,
    publicationAuthority: "none" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  };
  return Object.freeze({
    ...body,
    observationFingerprint: hashCanonicalBody(body),
  });
}

export function observeLearningV2DecodedPcmSignalV1(input: {
  readonly identity: LearningV2PcmSignalIdentityV1;
  readonly sampleRateHz: number;
  readonly channelCount: 1 | 2;
  readonly chunks: readonly Int16Array[];
}): LearningV2PcmSignalObservationV1 {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    Object.keys(input).sort().join("|") !==
      "channelCount|chunks|identity|sampleRateHz" ||
    !policyBody.acceptedSampleRatesHz.includes(
      input.sampleRateHz as (typeof policyBody.acceptedSampleRatesHz)[number],
    ) ||
    !policyBody.acceptedChannelCounts.includes(input.channelCount) ||
    !Array.isArray(input.chunks) ||
    input.chunks.length < 1 ||
    input.chunks.length > policyBody.maximumChunkCount
  )
    fail();
  const identity = exactIdentity(input.identity);

  let sampleCount = 0;
  for (const chunk of input.chunks) {
    if (!(chunk instanceof Int16Array) || chunk.length < 1) fail();
    sampleCount += chunk.length;
    if (!Number.isSafeInteger(sampleCount)) fail();
  }
  if (sampleCount % input.channelCount !== 0) fail();
  const frameCount = sampleCount / input.channelCount;
  const maximumFrameCount = Math.floor(
    (input.sampleRateHz * policyBody.maximumDurationMs) / 1_000,
  );
  const minimumFrameCount = Math.ceil(
    (input.sampleRateHz * policyBody.minimumDurationMs) / 1_000,
  );
  if (frameCount < minimumFrameCount || frameCount > maximumFrameCount) fail();

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
      const sample = chunk[index]!;
      const absolute = sample === -32_768 ? 32_768 : Math.abs(sample);
      sumSquares += BigInt(absolute) * BigInt(absolute);
      peakAbsoluteSample = Math.max(peakAbsoluteSample, absolute);
      if (absolute >= policyBody.activeSampleAbsoluteThreshold) {
        activeSampleCount += 1;
        currentFrameActive = true;
      }
      if (absolute >= policyBody.clippingAbsoluteThreshold)
        clippedSampleCount += 1;
      if (absolute === 0) zeroSampleCount += 1;
      frameChannelOffset += 1;
      if (frameChannelOffset === input.channelCount) {
        if (currentFrameActive) {
          activeFrameObserved = true;
          trailingSilentFrames = 0;
        } else if (!activeFrameObserved) {
          leadingSilentFrames += 1;
        } else {
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
  return materializeObservation(
    identity,
    Object.freeze({
      sampleRateHz: input.sampleRateHz,
      channelCount: input.channelCount,
      sampleCount,
      frameCount,
      durationMs: Math.round((frameCount * 1_000) / input.sampleRateHz),
      peakAbsoluteSample,
      rmsAbsoluteSample,
      activeSampleBasisPoints,
      clippedSampleBasisPoints,
      zeroSampleBasisPoints,
      leadingSilenceMs: Math.round(
        (leadingSilentFrames * 1_000) / input.sampleRateHz,
      ),
      trailingSilenceMs: Math.round(
        (trailingSilentFrames * 1_000) / input.sampleRateHz,
      ),
    }),
    "unverified_caller_supplied_decoded_pcm",
  );
}

export function observeLearningV2NativePcmSignalMetricsV1(input: {
  readonly identity: LearningV2PcmSignalIdentityV1;
  readonly metrics: LearningV2NativePcmDecodeMetricsV1;
}): LearningV2PcmSignalObservationV1 {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    Object.keys(input).sort().join("|") !== "identity|metrics"
  )
    fail();
  const identity = exactIdentity(input.identity);
  const metrics = input.metrics;
  if (
    !metrics ||
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
    !policyBody.acceptedSampleRatesHz.includes(
      metrics.sampleRateHz as (typeof policyBody.acceptedSampleRatesHz)[number],
    ) ||
    !policyBody.acceptedChannelCounts.includes(metrics.channelCount)
  )
    fail();
  const sampleCount = exactMetricInteger(
    metrics.sampleCount,
    1,
    metrics.sampleRateHz * metrics.channelCount * 120,
  );
  const frameCount = exactMetricInteger(
    metrics.frameCount,
    1,
    metrics.sampleRateHz * 120,
  );
  const durationMs = exactMetricInteger(metrics.durationMs, 100, 120_000);
  const peakAbsoluteSample = exactMetricInteger(
    metrics.peakAbsoluteSample,
    0,
    32_768,
  );
  const rmsAbsoluteSample = exactMetricInteger(
    metrics.rmsAbsoluteSample,
    0,
    peakAbsoluteSample,
  );
  const activeSampleBasisPoints = exactMetricInteger(
    metrics.activeSampleBasisPoints,
    0,
    10_000,
  );
  const clippedSampleBasisPoints = exactMetricInteger(
    metrics.clippedSampleBasisPoints,
    0,
    10_000,
  );
  const zeroSampleBasisPoints = exactMetricInteger(
    metrics.zeroSampleBasisPoints,
    0,
    10_000,
  );
  const leadingSilenceMs = exactMetricInteger(
    metrics.leadingSilenceMs,
    0,
    durationMs,
  );
  const trailingSilenceMs = exactMetricInteger(
    metrics.trailingSilenceMs,
    0,
    durationMs,
  );
  if (
    sampleCount !== frameCount * metrics.channelCount ||
    durationMs !== Math.round((frameCount * 1_000) / metrics.sampleRateHz)
  )
    fail();
  return materializeObservation(
    identity,
    Object.freeze({
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
    }),
    "unverified_serialized_native_system_decode_report",
  );
}
