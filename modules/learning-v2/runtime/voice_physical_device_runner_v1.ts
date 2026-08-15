import {
  createAudioPlayer,
  type AudioPlayer,
  type AudioStatus,
} from "expo-audio";

import {
  decodeLearningV2NativePcmSignalV1,
  LEARNING_V2_NATIVE_PCM_FILE_MAX_BYTES_V1,
} from "../../learning-v2-pcm-decoder";
import { hashCanonicalBody } from "../policies/decision_registry";
import {
  resolveLearningV2VoiceAudioOfflineCacheMaterialV1,
  type LearningV2VoiceAudioOfflineCacheHandleV1,
  type LearningV2VoiceAudioOfflineCacheSummaryV1,
} from "./voice_audio_offline_cache_v1";
import {
  LEARNING_V2_NATIVE_DECODER_OBSERVER_POLICY_V1,
  observeLearningV2NativeDecoderPlaybackV1,
  parseLearningV2NativeDecoderIdentityV1,
  type LearningV2NativeDecoderIdentityV1,
  type LearningV2NativeDecoderObservationV1,
  type LearningV2NativeDecoderStatusSampleV1,
} from "./voice_native_decoder_observer_v1";
import { type LearningV2PcmSignalObservationV1 } from "./voice_pcm_signal_observer_v1";

export const LEARNING_V2_PHYSICAL_AUDIO_RUN_SCHEMA_V1 =
  "learning-v2-physical-audio-run.v1" as const;
export const LEARNING_V2_CACHED_PHYSICAL_AUDIO_RUN_SCHEMA_V1 =
  "learning-v2-cached-physical-audio-run.v1" as const;
export const LEARNING_V2_PHYSICAL_AUDIO_RUN_UPDATE_INTERVAL_MS_V1 = 50;
export const LEARNING_V2_PHYSICAL_AUDIO_RUN_START_TIMEOUT_MS_V1 = 10_000;
export const LEARNING_V2_PHYSICAL_AUDIO_RUN_TOTAL_TIMEOUT_MS_V1 = 130_000;

export interface LearningV2PhysicalAudioRunV1 {
  readonly schemaVersion: typeof LEARNING_V2_PHYSICAL_AUDIO_RUN_SCHEMA_V1;
  readonly runClass:
    | "physical_device_machine_run"
    | "simulator_or_emulator_machine_run_non_release";
  readonly playbackObservation: LearningV2NativeDecoderObservationV1;
  readonly pcmObservation: LearningV2PcmSignalObservationV1;
  readonly exactObjectBinding: "same_local_file_identity_for_playback_and_pcm";
  readonly playbackExecutionAuthority: "unverified_local_system_playback";
  readonly pcmDecodeAuthority: "unverified_local_system_decode";
  readonly listeningEvidenceAuthority: "none";
  readonly deviceEvidenceAuthority: "none";
  readonly humanApprovalAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly runFingerprint: string;
}

export interface LearningV2CachedPhysicalAudioRunV1 {
  readonly schemaVersion: typeof LEARNING_V2_CACHED_PHYSICAL_AUDIO_RUN_SCHEMA_V1;
  readonly cacheSummary: LearningV2VoiceAudioOfflineCacheSummaryV1;
  readonly deviceRun: LearningV2PhysicalAudioRunV1;
  readonly cacheToRunBinding: "opaque_exact_cache_handle_same_identity";
  readonly repositoryOriginAuthority: "none";
  readonly listeningEvidenceAuthority: "none";
  readonly deviceEvidenceAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly cachedRunFingerprint: string;
}

type Subscription = Readonly<{ remove(): void }>;

function fail(): never {
  throw new Error("learning_v2_physical_audio_run_invalid");
}

function exactFileUri(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("file://") ||
    value.length > 2_048 ||
    value.includes("\0") ||
    value.split("/").some((part) => part === "..")
  )
    fail();
  return value;
}

function milliseconds(value: number): number {
  if (!Number.isFinite(value) || value < 0) fail();
  const result = Math.round(value * 1_000);
  if (!Number.isSafeInteger(result)) fail();
  return result;
}

function toStatusSample(
  status: AudioStatus,
  sequenceOrdinal: number,
  elapsedMs: number,
): LearningV2NativeDecoderStatusSampleV1 {
  if (
    !status ||
    typeof status !== "object" ||
    Array.isArray(status) ||
    typeof status.isLoaded !== "boolean" ||
    typeof status.playing !== "boolean" ||
    typeof status.playbackState !== "string" ||
    typeof status.currentTime !== "number" ||
    typeof status.duration !== "number" ||
    typeof status.didJustFinish !== "boolean"
  )
    fail();
  return Object.freeze({
    sequenceOrdinal,
    elapsedMs,
    isLoaded: status.isLoaded,
    playing: status.playing,
    playbackState:
      status.playbackState as LearningV2NativeDecoderStatusSampleV1["playbackState"],
    currentTimeMs: milliseconds(status.currentTime),
    durationMs: milliseconds(status.duration),
    didJustFinish: status.didJustFinish,
  });
}

function safeCleanup(
  player: AudioPlayer | null,
  subscription: Subscription | null,
): void {
  try {
    subscription?.remove();
  } catch {
    // Cleanup is best-effort after the observation has already terminated.
  }
  try {
    player?.pause();
  } catch {
    // A failed native player may already be released.
  }
  try {
    player?.remove();
  } catch {
    // A failed native player may already be released.
  }
}

async function observeExactLocalPlayback(input: {
  readonly fileUri: string;
  readonly identity: Readonly<LearningV2NativeDecoderIdentityV1>;
}): Promise<LearningV2NativeDecoderObservationV1> {
  let player: AudioPlayer | null = null;
  let subscription: Subscription | null = null;
  let settled = false;
  let startRequested = false;
  let sequenceOrdinal = 0;
  let previousElapsedMs = -1;
  const startedAtMs = Date.now();
  const statuses: LearningV2NativeDecoderStatusSampleV1[] = [];

  return new Promise((resolve, reject) => {
    const startTimer = setTimeout(
      () => finishWithError(),
      LEARNING_V2_PHYSICAL_AUDIO_RUN_START_TIMEOUT_MS_V1,
    );
    const totalTimer = setTimeout(
      () => finishWithError(),
      LEARNING_V2_PHYSICAL_AUDIO_RUN_TOTAL_TIMEOUT_MS_V1,
    );

    const cleanup = () => {
      clearTimeout(startTimer);
      clearTimeout(totalTimer);
      safeCleanup(player, subscription);
      player = null;
      subscription = null;
    };
    const finishWithError = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("learning_v2_physical_audio_run_invalid"));
    };
    const finishWithObservation = () => {
      if (settled) return;
      try {
        const observation = observeLearningV2NativeDecoderPlaybackV1({
          identity: input.identity,
          statuses,
        });
        settled = true;
        cleanup();
        resolve(observation);
      } catch {
        finishWithError();
      }
    };
    const requestStart = () => {
      if (settled || startRequested || player === null) return;
      startRequested = true;
      clearTimeout(startTimer);
      void player
        .seekTo(0)
        .then(() => {
          if (!settled) player?.play();
        })
        .catch(finishWithError);
    };
    const record = (status: AudioStatus) => {
      if (settled) return;
      try {
        if (
          statuses.length >=
          LEARNING_V2_NATIVE_DECODER_OBSERVER_POLICY_V1.body.maximumStatusCount
        )
          fail();
        const elapsedMs = Math.max(
          previousElapsedMs + 1,
          Math.floor(Date.now() - startedAtMs),
        );
        previousElapsedMs = elapsedMs;
        sequenceOrdinal += 1;
        statuses.push(toStatusSample(status, sequenceOrdinal, elapsedMs));
        if (status.isLoaded && !status.didJustFinish) requestStart();
        if (status.didJustFinish) finishWithObservation();
      } catch {
        finishWithError();
      }
    };

    try {
      player = createAudioPlayer(
        { uri: input.fileUri },
        {
          updateInterval: LEARNING_V2_PHYSICAL_AUDIO_RUN_UPDATE_INTERVAL_MS_V1,
          downloadFirst: false,
          keepAudioSessionActive: true,
        },
      );
      subscription = player.addListener("playbackStatusUpdate", record);
      record(player.currentStatus);
    } catch {
      finishWithError();
    }
  });
}

export async function runLearningV2ExactLocalAudioDeviceCheckV1(input: {
  readonly fileUri: string;
  readonly identity: LearningV2NativeDecoderIdentityV1;
}): Promise<LearningV2PhysicalAudioRunV1> {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    Object.keys(input).sort().join("|") !== "fileUri|identity"
  )
    fail();
  const fileUri = exactFileUri(input.fileUri);
  let identity: Readonly<LearningV2NativeDecoderIdentityV1>;
  try {
    identity = parseLearningV2NativeDecoderIdentityV1(input.identity);
  } catch {
    fail();
  }
  if (identity.byteSize > LEARNING_V2_NATIVE_PCM_FILE_MAX_BYTES_V1) fail();

  try {
    const playbackObservation = await observeExactLocalPlayback({
      fileUri,
      identity,
    });
    const pcmObservation = await decodeLearningV2NativePcmSignalV1({
      fileUri,
      identity: {
        ...identity,
        decoderStatusSequenceFingerprint:
          playbackObservation.statusSequenceFingerprint,
      },
    });
    const body = {
      schemaVersion: LEARNING_V2_PHYSICAL_AUDIO_RUN_SCHEMA_V1,
      runClass:
        identity.deviceClass === "physical_device"
          ? ("physical_device_machine_run" as const)
          : ("simulator_or_emulator_machine_run_non_release" as const),
      playbackObservation,
      pcmObservation,
      exactObjectBinding:
        "same_local_file_identity_for_playback_and_pcm" as const,
      playbackExecutionAuthority: "unverified_local_system_playback" as const,
      pcmDecodeAuthority: "unverified_local_system_decode" as const,
      listeningEvidenceAuthority: "none" as const,
      deviceEvidenceAuthority: "none" as const,
      humanApprovalAuthority: "none" as const,
      publicationAuthority: "none" as const,
      runtimeConsumer: false as const,
      releaseEligible: false as const,
      releaseAuthority: false as const,
    };
    return Object.freeze({ ...body, runFingerprint: hashCanonicalBody(body) });
  } catch {
    fail();
  }
}

export async function runLearningV2CachedAudioDeviceCheckV1(input: {
  readonly cacheHandle: LearningV2VoiceAudioOfflineCacheHandleV1;
  readonly identity: LearningV2NativeDecoderIdentityV1;
}): Promise<LearningV2CachedPhysicalAudioRunV1> {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    Object.keys(input).sort().join("|") !== "cacheHandle|identity"
  )
    fail();
  try {
    const material = resolveLearningV2VoiceAudioOfflineCacheMaterialV1({
      handle: input.cacheHandle,
      identity: input.identity,
    });
    const deviceRun = await runLearningV2ExactLocalAudioDeviceCheckV1({
      fileUri: material.fileUri,
      identity: material.identity,
    });
    const body = {
      schemaVersion: LEARNING_V2_CACHED_PHYSICAL_AUDIO_RUN_SCHEMA_V1,
      cacheSummary: material.summary,
      deviceRun,
      cacheToRunBinding: "opaque_exact_cache_handle_same_identity" as const,
      repositoryOriginAuthority: "none" as const,
      listeningEvidenceAuthority: "none" as const,
      deviceEvidenceAuthority: "none" as const,
      publicationAuthority: "none" as const,
      runtimeConsumer: false as const,
      releaseEligible: false as const,
      releaseAuthority: false as const,
    };
    return Object.freeze({
      ...body,
      cachedRunFingerprint: hashCanonicalBody(body),
    });
  } catch {
    fail();
  }
}
