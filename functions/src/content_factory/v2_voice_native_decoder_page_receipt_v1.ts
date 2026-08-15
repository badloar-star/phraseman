import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  LEARNING_V2_NATIVE_DECODER_OBSERVER_POLICY_V1,
  type LearningV2NativeDecoderDeviceClassV1,
  type LearningV2NativeDecoderObservationV1,
  type LearningV2NativeDecoderPlatformV1,
} from "../../../modules/learning-v2/runtime/voice_native_decoder_observer_v1";
import {
  isV2VoiceAudioManifestV1,
  type V2VoiceAudioManifestEntryV1,
  type V2VoiceAudioManifestV1,
} from "./v2_voice_audio_manifest_v1";
import {
  isV2VoiceAudioEpisodeReceiptV1,
  type V2VoiceAudioEpisodeReceiptV1,
} from "./v2_voice_audio_episode_receipt_v1";

export const V2_VOICE_NATIVE_DECODER_PAGE_RECEIPT_SCHEMA_V1 =
  "v2-voice-native-decoder-page-receipt.v1" as const;
export const V2_VOICE_NATIVE_DECODER_PAGE_MAX_ITEMS_V1 = 32;
export const V2_VOICE_NATIVE_DECODER_PAGE_MAX_BYTES_V1 = 128 * 1024;

export const V2_VOICE_NATIVE_DECODER_POLICY_V1 =
  LEARNING_V2_NATIVE_DECODER_OBSERVER_POLICY_V1;

export type V2VoiceNativeDecoderPlatformV1 = LearningV2NativeDecoderPlatformV1;
export type V2VoiceNativeDecoderDeviceClassV1 =
  LearningV2NativeDecoderDeviceClassV1;
export type V2VoiceNativeDecoderObservationV1 =
  LearningV2NativeDecoderObservationV1;

export interface V2VoiceNativeDecoderPageRowV1 extends V2VoiceNativeDecoderObservationV1 {
  readonly observationClass:
    | "physical_device_machine_decoder_observation"
    | "simulator_machine_decoder_observation_non_release";
  readonly rowFingerprint: string;
}

export interface V2VoiceNativeDecoderPageReceiptV1 {
  readonly schemaVersion: typeof V2_VOICE_NATIVE_DECODER_PAGE_RECEIPT_SCHEMA_V1;
  readonly planFingerprint: string;
  readonly stageId: string;
  readonly episodeId: string;
  readonly manifestFingerprint: string;
  readonly audioEpisodeReceiptFingerprint: string;
  readonly platform: V2VoiceNativeDecoderPlatformV1;
  readonly deviceClass: V2VoiceNativeDecoderDeviceClassV1;
  readonly decoderPolicyRef: typeof LEARNING_V2_NATIVE_DECODER_OBSERVER_POLICY_V1.ref;
  readonly pageStartIndex: number;
  readonly pageItemCount: number;
  readonly nextPageStartIndex: number | null;
  readonly rows: readonly V2VoiceNativeDecoderPageRowV1[];
  readonly orderedRowAggregateFingerprint: string;
  readonly repositoryOriginAuthority: "none";
  readonly audioByteAuthority: "none";
  readonly decoderEvidenceAuthority: "unverified_serialized_device_observation";
  readonly listeningEvidenceAuthority: "none";
  readonly deviceEvidenceAuthority: "none";
  readonly humanApprovalAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly receiptFingerprint: string;
}

const HASH_RE = /^[a-f0-9]{64}$/u;
const VERSION_RE = /^[A-Za-z0-9._-]{1,64}$/u;
const handles = new WeakSet<object>();
const OBSERVATION_KEYS = Object.freeze([
  "appBuildFingerprint",
  "byteSize",
  "contentHash",
  "deviceClass",
  "didJustFinishObserved",
  "entryFingerprint",
  "errorCode",
  "expoAudioVersion",
  "finalPositionMs",
  "firstPlayingPositionMs",
  "generationTargetFingerprint",
  "interruptionCount",
  "itemIndex",
  "loadedDurationMs",
  "maximumObservedPositionMs",
  "nativeDecoderFamily",
  "objectGeneration",
  "objectPath",
  "osVersion",
  "platform",
  "statusCount",
  "statusSequenceFingerprint",
] as const);

function fail(): never {
  throw new Error("v2_voice_native_decoder_page_receipt_invalid");
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
      if (
        !Number.isSafeInteger(current) ||
        Object.is(current, -0) ||
        Math.abs(current) > Number.MAX_SAFE_INTEGER
      )
        fail();
      continue;
    }
    if (typeof current !== "object") fail();
    if (Array.isArray(current)) {
      if (current.length > 64) fail();
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

function flatEntries(
  manifest: V2VoiceAudioManifestV1,
): readonly V2VoiceAudioManifestEntryV1[] {
  return Object.freeze(
    manifest.sessionManifests.flatMap((session) => session.entries),
  );
}

function exactObservation(
  observed: V2VoiceNativeDecoderObservationV1,
  expected: V2VoiceAudioManifestEntryV1,
  itemIndex: number,
  platform: V2VoiceNativeDecoderPlatformV1,
  deviceClass: V2VoiceNativeDecoderDeviceClassV1,
): V2VoiceNativeDecoderPageRowV1 {
  const expectedDecoder = platform === "ios" ? "avplayer" : "exoplayer";
  const minimumProgress = Math.min(
    LEARNING_V2_NATIVE_DECODER_OBSERVER_POLICY_V1.body.minimumProgressMs,
    observed.loadedDurationMs,
  );
  if (
    !observed ||
    typeof observed !== "object" ||
    Array.isArray(observed) ||
    Object.getPrototypeOf(observed) !== Object.prototype ||
    Object.keys(observed).sort().join("|") !==
      [...OBSERVATION_KEYS].sort().join("|") ||
    observed.itemIndex !== itemIndex ||
    observed.generationTargetFingerprint !==
      expected.generationTargetFingerprint ||
    observed.entryFingerprint !== expected.entryFingerprint ||
    observed.objectPath !== expected.objectPath ||
    observed.contentHash !== expected.contentHash ||
    observed.objectGeneration !== expected.objectGeneration ||
    observed.byteSize !== expected.byteSize ||
    observed.platform !== platform ||
    observed.deviceClass !== deviceClass ||
    !VERSION_RE.test(observed.osVersion) ||
    !HASH_RE.test(observed.appBuildFingerprint) ||
    observed.expoAudioVersion !==
      LEARNING_V2_NATIVE_DECODER_OBSERVER_POLICY_V1.body.expoAudioVersion ||
    observed.nativeDecoderFamily !== expectedDecoder ||
    !Number.isSafeInteger(observed.loadedDurationMs) ||
    observed.loadedDurationMs <
      LEARNING_V2_NATIVE_DECODER_OBSERVER_POLICY_V1.body.minimumDurationMs ||
    observed.loadedDurationMs >
      LEARNING_V2_NATIVE_DECODER_OBSERVER_POLICY_V1.body.maximumDurationMs ||
    !Number.isSafeInteger(observed.firstPlayingPositionMs) ||
    observed.firstPlayingPositionMs < 0 ||
    observed.firstPlayingPositionMs > observed.loadedDurationMs ||
    !Number.isSafeInteger(observed.maximumObservedPositionMs) ||
    observed.maximumObservedPositionMs < minimumProgress ||
    observed.maximumObservedPositionMs >
      observed.loadedDurationMs +
        LEARNING_V2_NATIVE_DECODER_OBSERVER_POLICY_V1.body.finishToleranceMs ||
    !Number.isSafeInteger(observed.finalPositionMs) ||
    observed.finalPositionMs <
      observed.loadedDurationMs -
        LEARNING_V2_NATIVE_DECODER_OBSERVER_POLICY_V1.body.finishToleranceMs ||
    observed.finalPositionMs >
      observed.loadedDurationMs +
        LEARNING_V2_NATIVE_DECODER_OBSERVER_POLICY_V1.body.finishToleranceMs ||
    !Number.isSafeInteger(observed.statusCount) ||
    observed.statusCount <
      LEARNING_V2_NATIVE_DECODER_OBSERVER_POLICY_V1.body
        .requiredObservationOrder.length ||
    observed.statusCount >
      LEARNING_V2_NATIVE_DECODER_OBSERVER_POLICY_V1.body.maximumStatusCount ||
    !HASH_RE.test(observed.statusSequenceFingerprint) ||
    observed.didJustFinishObserved !== true ||
    observed.interruptionCount !== 0 ||
    observed.errorCode !== null
  )
    fail();
  const body = {
    ...observed,
    observationClass:
      deviceClass === "physical_device"
        ? ("physical_device_machine_decoder_observation" as const)
        : ("simulator_machine_decoder_observation_non_release" as const),
  };
  return Object.freeze({ ...body, rowFingerprint: hashCanonicalBody(body) });
}

export function materializeV2VoiceNativeDecoderPageReceiptV1(input: {
  readonly manifest: V2VoiceAudioManifestV1;
  readonly audioEpisodeReceipt: V2VoiceAudioEpisodeReceiptV1;
  readonly platform: V2VoiceNativeDecoderPlatformV1;
  readonly deviceClass: V2VoiceNativeDecoderDeviceClassV1;
  readonly pageStartIndex: number;
  readonly observations: readonly V2VoiceNativeDecoderObservationV1[];
}): V2VoiceNativeDecoderPageReceiptV1 {
  if (
    !isV2VoiceAudioManifestV1(input.manifest) ||
    !isV2VoiceAudioEpisodeReceiptV1(input.audioEpisodeReceipt) ||
    input.audioEpisodeReceipt.manifestFingerprint !==
      input.manifest.manifestFingerprint ||
    input.audioEpisodeReceipt.audioObjectCount !==
      input.manifest.audioObjectCount ||
    !["ios", "android"].includes(input.platform) ||
    !["physical_device", "simulator_or_emulator"].includes(input.deviceClass) ||
    !Number.isSafeInteger(input.pageStartIndex) ||
    input.pageStartIndex < 0 ||
    !Array.isArray(input.observations) ||
    input.observations.length < 1 ||
    input.observations.length > V2_VOICE_NATIVE_DECODER_PAGE_MAX_ITEMS_V1
  )
    fail();
  const entries = flatEntries(input.manifest);
  if (
    entries.length !== input.manifest.audioObjectCount ||
    input.pageStartIndex + input.observations.length > entries.length
  )
    fail();
  const rows = Object.freeze(
    input.observations.map((observation, offset) => {
      const itemIndex = input.pageStartIndex + offset;
      const expected = entries[itemIndex];
      if (!expected) fail();
      return exactObservation(
        observation,
        expected,
        itemIndex,
        input.platform,
        input.deviceClass,
      );
    }),
  );
  const nextPageStartIndex =
    input.pageStartIndex + rows.length === entries.length
      ? null
      : input.pageStartIndex + rows.length;
  const body = {
    schemaVersion: V2_VOICE_NATIVE_DECODER_PAGE_RECEIPT_SCHEMA_V1,
    planFingerprint: input.manifest.planFingerprint,
    stageId: input.manifest.stageId,
    episodeId: input.manifest.episodeId,
    manifestFingerprint: input.manifest.manifestFingerprint,
    audioEpisodeReceiptFingerprint:
      input.audioEpisodeReceipt.receiptFingerprint,
    platform: input.platform,
    deviceClass: input.deviceClass,
    decoderPolicyRef: V2_VOICE_NATIVE_DECODER_POLICY_V1.ref,
    pageStartIndex: input.pageStartIndex,
    pageItemCount: rows.length,
    nextPageStartIndex,
    rows,
    orderedRowAggregateFingerprint: hashCanonicalBody(
      rows.map((row) => row.rowFingerprint),
    ),
    repositoryOriginAuthority: "none" as const,
    audioByteAuthority: "none" as const,
    decoderEvidenceAuthority:
      "unverified_serialized_device_observation" as const,
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
    V2_VOICE_NATIVE_DECODER_PAGE_MAX_BYTES_V1
  )
    fail();
  handles.add(result);
  return result;
}

export function parseV2VoiceNativeDecoderPageReceiptV1(input: {
  readonly raw: string;
  readonly manifest: V2VoiceAudioManifestV1;
  readonly audioEpisodeReceipt: V2VoiceAudioEpisodeReceiptV1;
}): V2VoiceNativeDecoderPageReceiptV1 {
  if (
    typeof input.raw !== "string" ||
    input.raw.length < 2 ||
    input.raw.length > V2_VOICE_NATIVE_DECODER_PAGE_MAX_BYTES_V1 ||
    utf8ByteLengthV1(input.raw) > V2_VOICE_NATIVE_DECODER_PAGE_MAX_BYTES_V1
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
      rowFingerprint: _fingerprint,
      ...body
    } = row as Record<string, unknown>;
    return Object.freeze(body) as unknown as V2VoiceNativeDecoderObservationV1;
  });
  const rebuilt = materializeV2VoiceNativeDecoderPageReceiptV1({
    manifest: input.manifest,
    audioEpisodeReceipt: input.audioEpisodeReceipt,
    platform: value.platform as V2VoiceNativeDecoderPlatformV1,
    deviceClass: value.deviceClass as V2VoiceNativeDecoderDeviceClassV1,
    pageStartIndex: value.pageStartIndex as number,
    observations: Object.freeze(observations),
  });
  if (canonicalJsonV1(rebuilt) !== input.raw) fail();
  return rebuilt;
}

export function isV2VoiceNativeDecoderPageReceiptV1(
  value: unknown,
): value is V2VoiceNativeDecoderPageReceiptV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}
