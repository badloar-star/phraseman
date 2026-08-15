import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  LEARNING_V2_PCM_SIGNAL_POLICY_V1,
  type LearningV2PcmSignalClassV1,
  type LearningV2PcmSignalObservationV1,
} from "../../../modules/learning-v2/runtime/voice_pcm_signal_observer_v1";
import {
  isV2VoiceAudioEpisodeReceiptV1,
  type V2VoiceAudioEpisodeReceiptV1,
} from "./v2_voice_audio_episode_receipt_v1";
import {
  isV2VoiceAudioManifestV1,
  type V2VoiceAudioManifestV1,
} from "./v2_voice_audio_manifest_v1";
import {
  isV2VoiceNativeDecoderPageReceiptV1,
  type V2VoiceNativeDecoderPageReceiptV1,
  type V2VoiceNativeDecoderPageRowV1,
} from "./v2_voice_native_decoder_page_receipt_v1";

export const V2_VOICE_PCM_SIGNAL_PAGE_RECEIPT_SCHEMA_V1 =
  "v2-voice-pcm-signal-page-receipt.v1" as const;
export const V2_VOICE_PCM_SIGNAL_PAGE_MAX_ITEMS_V1 = 32;
export const V2_VOICE_PCM_SIGNAL_PAGE_MAX_BYTES_V1 = 160 * 1024;

export interface V2VoicePcmSignalPageRowV1 extends LearningV2PcmSignalObservationV1 {
  readonly observationClass:
    | "physical_device_unverified_pcm_signal_observation"
    | "simulator_unverified_pcm_signal_observation_non_release";
  readonly rowDisposition:
    | "candidate_for_human_listening"
    | "blocked_signal_quality"
    | "blocked_nonphysical_device";
  readonly rowFingerprint: string;
}

export interface V2VoicePcmSignalPageReceiptV1 {
  readonly schemaVersion: typeof V2_VOICE_PCM_SIGNAL_PAGE_RECEIPT_SCHEMA_V1;
  readonly planFingerprint: string;
  readonly stageId: string;
  readonly episodeId: string;
  readonly manifestFingerprint: string;
  readonly audioEpisodeReceiptFingerprint: string;
  readonly decoderPageReceiptFingerprint: string;
  readonly signalPolicyRef: typeof LEARNING_V2_PCM_SIGNAL_POLICY_V1.ref;
  readonly platform: "ios" | "android";
  readonly deviceClass: "physical_device" | "simulator_or_emulator";
  readonly osVersion: string;
  readonly appBuildFingerprint: string;
  readonly expoAudioVersion: "1.1.1";
  readonly pageStartIndex: number;
  readonly pageItemCount: number;
  readonly nextPageStartIndex: number | null;
  readonly blockingSignalItemCount: number;
  readonly rows: readonly V2VoicePcmSignalPageRowV1[];
  readonly orderedRowAggregateFingerprint: string;
  readonly pageDisposition:
    | "candidate_for_human_listening"
    | "blocked_signal_quality"
    | "blocked_nonphysical_device";
  readonly pcmSourceBindingAuthority: "unverified_serialized_device_observation";
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
  readonly receiptFingerprint: string;
}

const handles = new WeakSet<object>();
const OBSERVATION_KEYS = Object.freeze([
  "activeSampleBasisPoints",
  "appBuildFingerprint",
  "byteSize",
  "channelCount",
  "clippedSampleBasisPoints",
  "contentHash",
  "decoderStatusSequenceFingerprint",
  "deviceEvidenceAuthority",
  "deviceClass",
  "durationMs",
  "entryFingerprint",
  "expoAudioVersion",
  "frameCount",
  "generationTargetFingerprint",
  "humanApprovalAuthority",
  "itemIndex",
  "leadingSilenceMs",
  "listeningEvidenceAuthority",
  "noiseEvidenceAuthority",
  "objectGeneration",
  "objectPath",
  "observationFingerprint",
  "osVersion",
  "pcmEncoding",
  "pcmSourceBindingAuthority",
  "peakAbsoluteSample",
  "platform",
  "publicationAuthority",
  "releaseAuthority",
  "releaseEligible",
  "rmsAbsoluteSample",
  "runtimeConsumer",
  "sampleCount",
  "sampleRateHz",
  "schemaVersion",
  "signalClass",
  "signalMetricAuthority",
  "signalPolicyRef",
  "speechCorrectnessAuthority",
  "trailingSilenceMs",
  "zeroSampleBasisPoints",
] as const);

function fail(): never {
  throw new Error("v2_voice_pcm_signal_page_receipt_invalid");
}

function preflightJson(value: unknown): void {
  const stack: (readonly [unknown, number])[] = [[value, 0]];
  let nodes = 0;
  while (stack.length > 0) {
    const [current, depth] = stack.pop()!;
    nodes += 1;
    if (nodes > 20_000 || depth > 32) fail();
    if (
      current === null ||
      typeof current === "string" ||
      typeof current === "boolean"
    )
      continue;
    if (typeof current === "number") {
      if (!Number.isSafeInteger(current) || Object.is(current, -0)) fail();
      continue;
    }
    if (typeof current !== "object") fail();
    if (Array.isArray(current)) {
      if (current.length > V2_VOICE_PCM_SIGNAL_PAGE_MAX_ITEMS_V1) fail();
      for (const item of current) stack.push([item, depth + 1]);
      continue;
    }
    if (Object.getPrototypeOf(current) !== Object.prototype) fail();
    const keys = Object.keys(current as Record<string, unknown>);
    if (keys.length > 64) fail();
    for (const key of keys) {
      if (key === "__proto__" || key === "prototype" || key === "constructor")
        fail();
      stack.push([(current as Record<string, unknown>)[key], depth + 1]);
    }
  }
}

function exactInteger(
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

function expectedSignalClass(
  peakAbsoluteSample: number,
  activeSampleBasisPoints: number,
  clippedSampleBasisPoints: number,
): LearningV2PcmSignalClassV1 {
  return peakAbsoluteSample === 0
    ? "digital_silence"
    : activeSampleBasisPoints <=
        LEARNING_V2_PCM_SIGNAL_POLICY_V1.body
          .nearSilenceMaximumActiveSampleBasisPoints
      ? "near_silence"
      : clippedSampleBasisPoints >=
          LEARNING_V2_PCM_SIGNAL_POLICY_V1.body.clippingMinimumSampleBasisPoints
        ? "clipping_detected"
        : "clean_signal_candidate";
}

function exactObservation(
  observed: LearningV2PcmSignalObservationV1,
  decoder: V2VoiceNativeDecoderPageRowV1,
): V2VoicePcmSignalPageRowV1 {
  if (
    !observed ||
    typeof observed !== "object" ||
    Array.isArray(observed) ||
    Object.getPrototypeOf(observed) !== Object.prototype ||
    Object.keys(observed).sort().join("|") !==
      [...OBSERVATION_KEYS].sort().join("|") ||
    observed.itemIndex !== decoder.itemIndex ||
    observed.generationTargetFingerprint !==
      decoder.generationTargetFingerprint ||
    observed.entryFingerprint !== decoder.entryFingerprint ||
    observed.objectPath !== decoder.objectPath ||
    observed.contentHash !== decoder.contentHash ||
    observed.objectGeneration !== decoder.objectGeneration ||
    observed.byteSize !== decoder.byteSize ||
    observed.platform !== decoder.platform ||
    observed.deviceClass !== decoder.deviceClass ||
    observed.osVersion !== decoder.osVersion ||
    observed.appBuildFingerprint !== decoder.appBuildFingerprint ||
    observed.expoAudioVersion !== decoder.expoAudioVersion ||
    observed.decoderStatusSequenceFingerprint !==
      decoder.statusSequenceFingerprint ||
    canonicalJsonV1(observed.signalPolicyRef) !==
      canonicalJsonV1(LEARNING_V2_PCM_SIGNAL_POLICY_V1.ref) ||
    observed.schemaVersion !== "learning-v2-pcm-signal-observer.v1" ||
    observed.pcmEncoding !== "signed_16_bit" ||
    !LEARNING_V2_PCM_SIGNAL_POLICY_V1.body.acceptedSampleRatesHz.includes(
      observed.sampleRateHz as never,
    ) ||
    !LEARNING_V2_PCM_SIGNAL_POLICY_V1.body.acceptedChannelCounts.includes(
      observed.channelCount,
    )
  )
    fail();
  const sampleCount = exactInteger(
    observed.sampleCount,
    1,
    observed.sampleRateHz * observed.channelCount * 120,
  );
  const frameCount = exactInteger(
    observed.frameCount,
    1,
    observed.sampleRateHz * 120,
  );
  const durationMs = exactInteger(observed.durationMs, 100, 120_000);
  const peakAbsoluteSample = exactInteger(
    observed.peakAbsoluteSample,
    0,
    32_768,
  );
  exactInteger(observed.rmsAbsoluteSample, 0, peakAbsoluteSample);
  const activeSampleBasisPoints = exactInteger(
    observed.activeSampleBasisPoints,
    0,
    10_000,
  );
  const clippedSampleBasisPoints = exactInteger(
    observed.clippedSampleBasisPoints,
    0,
    10_000,
  );
  exactInteger(observed.zeroSampleBasisPoints, 0, 10_000);
  exactInteger(observed.leadingSilenceMs, 0, durationMs);
  exactInteger(observed.trailingSilenceMs, 0, durationMs);
  const { observationFingerprint, ...observationBody } = observed;
  if (
    sampleCount !== frameCount * observed.channelCount ||
    durationMs !== Math.round((frameCount * 1_000) / observed.sampleRateHz) ||
    observed.signalClass !==
      expectedSignalClass(
        peakAbsoluteSample,
        activeSampleBasisPoints,
        clippedSampleBasisPoints,
      ) ||
    observationFingerprint !== hashCanonicalBody(observationBody) ||
    ![
      "unverified_caller_supplied_decoded_pcm",
      "unverified_serialized_native_system_decode_report",
    ].includes(observed.pcmSourceBindingAuthority) ||
    observed.signalMetricAuthority !== "deterministic_pcm16_metrics_only" ||
    observed.noiseEvidenceAuthority !== "none" ||
    observed.speechCorrectnessAuthority !== "none" ||
    observed.listeningEvidenceAuthority !== "none" ||
    observed.deviceEvidenceAuthority !== "none" ||
    observed.humanApprovalAuthority !== "none" ||
    observed.publicationAuthority !== "none" ||
    observed.runtimeConsumer !== false ||
    observed.releaseEligible !== false ||
    observed.releaseAuthority !== false
  )
    fail();
  const rowDisposition =
    observed.deviceClass !== "physical_device"
      ? ("blocked_nonphysical_device" as const)
      : observed.signalClass !== "clean_signal_candidate"
        ? ("blocked_signal_quality" as const)
        : ("candidate_for_human_listening" as const);
  const body = {
    ...observed,
    observationClass:
      observed.deviceClass === "physical_device"
        ? ("physical_device_unverified_pcm_signal_observation" as const)
        : ("simulator_unverified_pcm_signal_observation_non_release" as const),
    rowDisposition,
  };
  return Object.freeze({ ...body, rowFingerprint: hashCanonicalBody(body) });
}

export function materializeV2VoicePcmSignalPageReceiptV1(input: {
  readonly manifest: V2VoiceAudioManifestV1;
  readonly audioEpisodeReceipt: V2VoiceAudioEpisodeReceiptV1;
  readonly decoderPage: V2VoiceNativeDecoderPageReceiptV1;
  readonly observations: readonly LearningV2PcmSignalObservationV1[];
}): V2VoicePcmSignalPageReceiptV1 {
  if (
    !isV2VoiceAudioManifestV1(input.manifest) ||
    !isV2VoiceAudioEpisodeReceiptV1(input.audioEpisodeReceipt) ||
    !isV2VoiceNativeDecoderPageReceiptV1(input.decoderPage) ||
    input.decoderPage.manifestFingerprint !==
      input.manifest.manifestFingerprint ||
    input.decoderPage.audioEpisodeReceiptFingerprint !==
      input.audioEpisodeReceipt.receiptFingerprint ||
    !Array.isArray(input.observations) ||
    input.observations.length !== input.decoderPage.rows.length ||
    input.observations.length < 1 ||
    input.observations.length > V2_VOICE_PCM_SIGNAL_PAGE_MAX_ITEMS_V1
  )
    fail();
  const rows = Object.freeze(
    input.observations.map((observation, index) =>
      exactObservation(observation, input.decoderPage.rows[index]!),
    ),
  );
  const blockingSignalItemCount = rows.filter(
    (row) => row.rowDisposition !== "candidate_for_human_listening",
  ).length;
  const pageDisposition =
    input.decoderPage.deviceClass !== "physical_device"
      ? ("blocked_nonphysical_device" as const)
      : blockingSignalItemCount > 0
        ? ("blocked_signal_quality" as const)
        : ("candidate_for_human_listening" as const);
  const first = rows[0]!;
  const body = {
    schemaVersion: V2_VOICE_PCM_SIGNAL_PAGE_RECEIPT_SCHEMA_V1,
    planFingerprint: input.manifest.planFingerprint,
    stageId: input.manifest.stageId,
    episodeId: input.manifest.episodeId,
    manifestFingerprint: input.manifest.manifestFingerprint,
    audioEpisodeReceiptFingerprint:
      input.audioEpisodeReceipt.receiptFingerprint,
    decoderPageReceiptFingerprint: input.decoderPage.receiptFingerprint,
    signalPolicyRef: LEARNING_V2_PCM_SIGNAL_POLICY_V1.ref,
    platform: first.platform,
    deviceClass: first.deviceClass,
    osVersion: first.osVersion,
    appBuildFingerprint: first.appBuildFingerprint,
    expoAudioVersion: first.expoAudioVersion,
    pageStartIndex: input.decoderPage.pageStartIndex,
    pageItemCount: rows.length,
    nextPageStartIndex: input.decoderPage.nextPageStartIndex,
    blockingSignalItemCount,
    rows,
    orderedRowAggregateFingerprint: hashCanonicalBody(
      rows.map((row) => row.rowFingerprint),
    ),
    pageDisposition,
    pcmSourceBindingAuthority:
      "unverified_serialized_device_observation" as const,
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
  const result = Object.freeze({
    ...body,
    receiptFingerprint: hashCanonicalBody(body),
  });
  if (
    utf8ByteLengthV1(canonicalJsonV1(result)) >
    V2_VOICE_PCM_SIGNAL_PAGE_MAX_BYTES_V1
  )
    fail();
  handles.add(result);
  return result;
}

export function isV2VoicePcmSignalPageReceiptV1(
  value: unknown,
): value is V2VoicePcmSignalPageReceiptV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}

export function parseV2VoicePcmSignalPageReceiptV1(input: {
  readonly raw: string;
  readonly manifest: V2VoiceAudioManifestV1;
  readonly audioEpisodeReceipt: V2VoiceAudioEpisodeReceiptV1;
  readonly decoderPage: V2VoiceNativeDecoderPageReceiptV1;
}): V2VoicePcmSignalPageReceiptV1 {
  if (
    typeof input.raw !== "string" ||
    input.raw.length < 2 ||
    input.raw.length > V2_VOICE_PCM_SIGNAL_PAGE_MAX_BYTES_V1 ||
    utf8ByteLengthV1(input.raw) > V2_VOICE_PCM_SIGNAL_PAGE_MAX_BYTES_V1
  )
    fail();
  let decoded: unknown;
  try {
    decoded = JSON.parse(input.raw);
  } catch {
    fail();
  }
  preflightJson(decoded);
  if (
    typeof decoded !== "object" ||
    decoded === null ||
    Array.isArray(decoded) ||
    canonicalJsonV1(decoded) !== input.raw
  )
    fail();
  const value = decoded as Record<string, unknown>;
  if (!Array.isArray(value.rows)) fail();
  const observations = value.rows.map((row) => {
    if (typeof row !== "object" || row === null || Array.isArray(row)) fail();
    const {
      observationClass: _class,
      rowDisposition: _disposition,
      rowFingerprint: _rowFingerprint,
      ...observation
    } = row as Record<string, unknown>;
    return Object.freeze(
      observation,
    ) as unknown as LearningV2PcmSignalObservationV1;
  });
  const rebuilt = materializeV2VoicePcmSignalPageReceiptV1({
    manifest: input.manifest,
    audioEpisodeReceipt: input.audioEpisodeReceipt,
    decoderPage: input.decoderPage,
    observations: Object.freeze(observations),
  });
  if (canonicalJsonV1(rebuilt) !== input.raw) fail();
  return rebuilt;
}
