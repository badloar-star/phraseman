import { hashCanonicalBody } from "../policies/decision_registry";

export const LEARNING_V2_NATIVE_DECODER_OBSERVER_SCHEMA_V1 =
  "learning-v2-native-decoder-observer.v1" as const;
export const LEARNING_V2_NATIVE_DECODER_STATUS_MAX_COUNT_V1 = 4_096;

const policyBody = Object.freeze({
  schemaVersion: "learning-v2-native-decoder-observer-policy.v1" as const,
  policyId: "expo-audio-observed-playback-v1" as const,
  policyVersion: 1 as const,
  expoAudioVersion: "1.1.1" as const,
  requiredObservationOrder: Object.freeze([
    "loaded",
    "playing",
    "progress",
    "did_just_finish",
  ] as const),
  minimumDurationMs: 100 as const,
  maximumDurationMs: 120_000 as const,
  minimumProgressMs: 50 as const,
  finishToleranceMs: 750 as const,
  maximumStatusCount: LEARNING_V2_NATIVE_DECODER_STATUS_MAX_COUNT_V1,
});

export const LEARNING_V2_NATIVE_DECODER_OBSERVER_POLICY_V1 = Object.freeze({
  body: policyBody,
  ref: Object.freeze({
    policyId: policyBody.policyId,
    version: policyBody.policyVersion,
    contentHash: hashCanonicalBody(policyBody),
  }),
});

export type LearningV2NativeDecoderPlatformV1 = "ios" | "android";
export type LearningV2NativeDecoderDeviceClassV1 =
  | "physical_device"
  | "simulator_or_emulator";

export interface LearningV2NativeDecoderIdentityV1 {
  readonly itemIndex: number;
  readonly generationTargetFingerprint: string;
  readonly entryFingerprint: string;
  readonly objectPath: string;
  readonly contentHash: string;
  readonly objectGeneration: string;
  readonly byteSize: number;
  readonly platform: LearningV2NativeDecoderPlatformV1;
  readonly deviceClass: LearningV2NativeDecoderDeviceClassV1;
  readonly osVersion: string;
  readonly appBuildFingerprint: string;
  readonly expoAudioVersion: "1.1.1";
}

export interface LearningV2NativeDecoderStatusSampleV1 {
  readonly sequenceOrdinal: number;
  readonly elapsedMs: number;
  readonly isLoaded: boolean;
  readonly playing: boolean;
  readonly playbackState:
    | "unknown"
    | "readyToPlay"
    | "failed"
    | "idle"
    | "buffering"
    | "ready"
    | "ended";
  readonly currentTimeMs: number;
  readonly durationMs: number;
  readonly didJustFinish: boolean;
}

export interface LearningV2NativeDecoderObservationV1 extends LearningV2NativeDecoderIdentityV1 {
  readonly nativeDecoderFamily: "avplayer" | "exoplayer";
  readonly loadedDurationMs: number;
  readonly firstPlayingPositionMs: number;
  readonly maximumObservedPositionMs: number;
  readonly finalPositionMs: number;
  readonly statusCount: number;
  readonly statusSequenceFingerprint: string;
  readonly didJustFinishObserved: true;
  readonly interruptionCount: 0;
  readonly errorCode: null;
}

const HASH_RE = /^[a-f0-9]{64}$/u;
const TOKEN_RE = /^[A-Za-z0-9._-]{1,64}$/u;
const PATH_RE = /^[A-Za-z0-9._:+/-]{1,1000}$/u;
const IDENTITY_KEYS = Object.freeze([
  "appBuildFingerprint",
  "byteSize",
  "contentHash",
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

function fail(): never {
  throw new Error("learning_v2_native_decoder_observation_invalid");
}

function exactIdentity(
  value: LearningV2NativeDecoderIdentityV1,
): LearningV2NativeDecoderIdentityV1 {
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
    value.expoAudioVersion !== policyBody.expoAudioVersion
  )
    fail();
  return Object.freeze({ ...value });
}

export function parseLearningV2NativeDecoderIdentityV1(
  value: LearningV2NativeDecoderIdentityV1,
): Readonly<LearningV2NativeDecoderIdentityV1> {
  return exactIdentity(value);
}

export function observeLearningV2NativeDecoderPlaybackV1(input: {
  readonly identity: LearningV2NativeDecoderIdentityV1;
  readonly statuses: readonly LearningV2NativeDecoderStatusSampleV1[];
}): LearningV2NativeDecoderObservationV1 {
  const identity = exactIdentity(input.identity);
  const allowedStates =
    identity.platform === "ios"
      ? new Set(["unknown", "readyToPlay", "failed"])
      : new Set(["idle", "buffering", "ready", "ended"]);
  const readyState = identity.platform === "ios" ? "readyToPlay" : "ready";
  const terminalState = identity.platform === "ios" ? "readyToPlay" : "ended";
  const errorState = identity.platform === "ios" ? "failed" : null;
  if (
    !Array.isArray(input.statuses) ||
    input.statuses.length < policyBody.requiredObservationOrder.length ||
    input.statuses.length > policyBody.maximumStatusCount
  )
    fail();

  let loaded = false;
  let playing = false;
  let progressed = false;
  let finished = false;
  let loadedDurationMs = 0;
  let firstPlayingPositionMs = -1;
  let maximumObservedPositionMs = 0;
  let finalPositionMs = 0;
  let previousElapsedMs = -1;
  let previousPositionMs = 0;

  const statuses = Object.freeze(
    input.statuses.map((status, index) => {
      if (
        !status ||
        typeof status !== "object" ||
        Array.isArray(status) ||
        Object.keys(status).sort().join("|") !==
          [
            "currentTimeMs",
            "didJustFinish",
            "durationMs",
            "elapsedMs",
            "isLoaded",
            "playbackState",
            "playing",
            "sequenceOrdinal",
          ]
            .sort()
            .join("|") ||
        status.sequenceOrdinal !== index + 1 ||
        !Number.isSafeInteger(status.elapsedMs) ||
        status.elapsedMs < 0 ||
        status.elapsedMs <= previousElapsedMs ||
        typeof status.isLoaded !== "boolean" ||
        typeof status.playing !== "boolean" ||
        !allowedStates.has(status.playbackState) ||
        !Number.isSafeInteger(status.currentTimeMs) ||
        status.currentTimeMs < 0 ||
        !Number.isSafeInteger(status.durationMs) ||
        status.durationMs < 0 ||
        typeof status.didJustFinish !== "boolean" ||
        finished
      )
        fail();
      previousElapsedMs = status.elapsedMs;
      if (errorState !== null && status.playbackState === errorState) fail();
      if (status.isLoaded) {
        if (
          status.durationMs < policyBody.minimumDurationMs ||
          status.durationMs > policyBody.maximumDurationMs ||
          (loaded && status.durationMs !== loadedDurationMs)
        )
          fail();
        loaded = true;
        loadedDurationMs = status.durationMs;
      } else if (status.playing || status.didJustFinish) {
        fail();
      }
      if (status.playing) {
        if (!loaded || status.playbackState !== readyState) fail();
        if (!playing) firstPlayingPositionMs = status.currentTimeMs;
        playing = true;
      }
      if (
        loaded &&
        playing &&
        status.playing &&
        !status.didJustFinish &&
        status.currentTimeMs >= policyBody.minimumProgressMs &&
        status.currentTimeMs > previousPositionMs
      )
        progressed = true;
      if (
        status.currentTimeMs >
        loadedDurationMs + policyBody.finishToleranceMs
      )
        fail();
      maximumObservedPositionMs = Math.max(
        maximumObservedPositionMs,
        status.currentTimeMs,
      );
      previousPositionMs = Math.max(previousPositionMs, status.currentTimeMs);
      if (status.didJustFinish) {
        if (
          !loaded ||
          !playing ||
          !progressed ||
          status.playbackState !== terminalState ||
          status.currentTimeMs < loadedDurationMs - policyBody.finishToleranceMs
        )
          fail();
        finished = true;
        finalPositionMs = status.currentTimeMs;
      }
      return Object.freeze({ ...status });
    }),
  );
  if (!loaded || !playing || !progressed || !finished) fail();

  return Object.freeze({
    ...identity,
    nativeDecoderFamily:
      identity.platform === "ios"
        ? ("avplayer" as const)
        : ("exoplayer" as const),
    loadedDurationMs,
    firstPlayingPositionMs,
    maximumObservedPositionMs,
    finalPositionMs,
    statusCount: statuses.length,
    statusSequenceFingerprint: hashCanonicalBody({
      schemaVersion: LEARNING_V2_NATIVE_DECODER_OBSERVER_SCHEMA_V1,
      policyRef: LEARNING_V2_NATIVE_DECODER_OBSERVER_POLICY_V1.ref,
      identity,
      statuses,
    }),
    didJustFinishObserved: true as const,
    interruptionCount: 0 as const,
    errorCode: null,
  });
}
