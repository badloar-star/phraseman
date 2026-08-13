import { hashCanonicalBody } from "../policies/decision_registry";
import {
  getLearningV2VoiceAudioOfflineCacheSummaryV1,
  prepareLearningV2VoiceAudioOfflineFileV1,
  type LearningV2VoiceAudioOfflineCacheHandleV1,
} from "./voice_audio_offline_cache_v1";
import {
  parseLearningV2NativeDecoderIdentityV1,
  type LearningV2NativeDecoderIdentityV1,
} from "./voice_native_decoder_observer_v1";
import {
  runLearningV2CachedAudioDeviceCheckV1,
  type LearningV2CachedPhysicalAudioRunV1,
} from "./voice_physical_device_runner_v1";

export const LEARNING_V2_VOICE_AUDIO_PAGE_RUN_SCHEMA_V1 =
  "learning-v2-voice-audio-page-run.v1" as const;
export const LEARNING_V2_VOICE_AUDIO_PAGE_RUN_MAX_ITEMS_V1 = 32;
export const LEARNING_V2_VOICE_AUDIO_PAGE_CACHE_MAX_CONCURRENCY_V1 = 4;
export const LEARNING_V2_VOICE_AUDIO_PAGE_TOTAL_MAX_BYTES_V1 =
  LEARNING_V2_VOICE_AUDIO_PAGE_RUN_MAX_ITEMS_V1 * 64 * 1024;

export interface LearningV2VoiceAudioPageRunRowV1 {
  readonly itemIndex: number;
  readonly generationTargetFingerprint: string;
  readonly entryFingerprint: string;
  readonly cacheSummaryFingerprint: string;
  readonly cachedRunFingerprint: string;
  readonly rowFingerprint: string;
}

export interface LearningV2VoiceAudioPageRunV1 {
  readonly schemaVersion: typeof LEARNING_V2_VOICE_AUDIO_PAGE_RUN_SCHEMA_V1;
  readonly pageStartIndex: number;
  readonly pageItemCount: number;
  readonly platform: "ios" | "android";
  readonly deviceClass: "physical_device" | "simulator_or_emulator";
  readonly osVersion: string;
  readonly appBuildFingerprint: string;
  readonly rows: readonly LearningV2VoiceAudioPageRunRowV1[];
  readonly orderedRowAggregateFingerprint: string;
  readonly cacheExecution: "preflight_all_then_bounded_concurrency_max_4";
  readonly playbackExecution: "strict_manifest_order_after_complete_cache";
  readonly transportUrlEvidenceAuthority: "none_not_retained";
  readonly repositoryOriginAuthority: "none";
  readonly listeningEvidenceAuthority: "none";
  readonly deviceEvidenceAuthority: "none";
  readonly humanApprovalAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly pageRunFingerprint: string;
}

export interface LearningV2VoiceAudioPageRunMaterialV1 {
  readonly run: LearningV2VoiceAudioPageRunV1;
  readonly nativeDecoderObservations: readonly LearningV2CachedPhysicalAudioRunV1["deviceRun"]["playbackObservation"][];
  readonly pcmSignalObservations: readonly LearningV2CachedPhysicalAudioRunV1["deviceRun"]["pcmObservation"][];
}

const runHandles = new WeakSet<object>();
const runMetadata = new WeakMap<
  object,
  LearningV2VoiceAudioPageRunMaterialV1
>();

function fail(): never {
  throw new Error("learning_v2_voice_audio_page_run_invalid");
}

function exactInputs(
  pageStartIndex: number,
  values: readonly LearningV2NativeDecoderIdentityV1[],
): readonly Readonly<LearningV2NativeDecoderIdentityV1>[] {
  if (
    !Number.isSafeInteger(pageStartIndex) ||
    pageStartIndex < 0 ||
    !Array.isArray(values) ||
    values.length < 1 ||
    values.length > LEARNING_V2_VOICE_AUDIO_PAGE_RUN_MAX_ITEMS_V1
  )
    fail();
  const identities = values.map((value, offset) => {
    let identity: Readonly<LearningV2NativeDecoderIdentityV1>;
    try {
      identity = parseLearningV2NativeDecoderIdentityV1(value);
    } catch {
      fail();
    }
    if (identity.itemIndex !== pageStartIndex + offset) fail();
    return identity;
  });
  const first = identities[0]!;
  if (
    new Set(identities.map((value) => value.entryFingerprint)).size !==
      identities.length ||
    new Set(identities.map((value) => value.generationTargetFingerprint))
      .size !== identities.length ||
    identities.some(
      (value) =>
        value.platform !== first.platform ||
        value.deviceClass !== first.deviceClass ||
        value.osVersion !== first.osVersion ||
        value.appBuildFingerprint !== first.appBuildFingerprint ||
        value.expoAudioVersion !== first.expoAudioVersion,
    ) ||
    identities.reduce((sum, value) => sum + value.byteSize, 0) >
      LEARNING_V2_VOICE_AUDIO_PAGE_TOTAL_MAX_BYTES_V1
  )
    fail();
  return Object.freeze(identities);
}

async function prepareAll(input: {
  readonly identities: readonly Readonly<LearningV2NativeDecoderIdentityV1>[];
  readonly resolveSourceUrl: (
    identity: Readonly<LearningV2NativeDecoderIdentityV1>,
  ) => Promise<string>;
}): Promise<readonly LearningV2VoiceAudioOfflineCacheHandleV1[]> {
  const handles: LearningV2VoiceAudioOfflineCacheHandleV1[] = new Array(
    input.identities.length,
  );
  let nextIndex = 0;
  const worker = async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= input.identities.length) return;
      const identity = input.identities[index]!;
      const sourceUrl = await input.resolveSourceUrl(identity);
      handles[index] = await prepareLearningV2VoiceAudioOfflineFileV1({
        sourceUrl,
        identity,
      });
    }
  };
  await Promise.all(
    Array.from(
      {
        length: Math.min(
          LEARNING_V2_VOICE_AUDIO_PAGE_CACHE_MAX_CONCURRENCY_V1,
          input.identities.length,
        ),
      },
      worker,
    ),
  );
  if (handles.some((handle) => !handle)) fail();
  return Object.freeze(handles);
}

export async function runLearningV2VoiceAudioManifestPageV1(input: {
  readonly pageStartIndex: number;
  readonly identities: readonly LearningV2NativeDecoderIdentityV1[];
  readonly resolveSourceUrl: (
    identity: Readonly<LearningV2NativeDecoderIdentityV1>,
  ) => Promise<string>;
}): Promise<LearningV2VoiceAudioPageRunV1> {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    Object.keys(input).sort().join("|") !==
      "identities|pageStartIndex|resolveSourceUrl" ||
    typeof input.resolveSourceUrl !== "function"
  )
    fail();
  const identities = exactInputs(input.pageStartIndex, input.identities);
  let handles: readonly LearningV2VoiceAudioOfflineCacheHandleV1[];
  try {
    handles = await prepareAll({
      identities,
      resolveSourceUrl: input.resolveSourceUrl,
    });
  } catch {
    fail();
  }

  const runs: LearningV2CachedPhysicalAudioRunV1[] = [];
  try {
    for (let index = 0; index < identities.length; index += 1) {
      runs.push(
        await runLearningV2CachedAudioDeviceCheckV1({
          cacheHandle: handles[index]!,
          identity: identities[index]!,
        }),
      );
    }
  } catch {
    fail();
  }
  const rows = Object.freeze(
    runs.map((run, index) => {
      const identity = identities[index]!;
      const cacheSummary = getLearningV2VoiceAudioOfflineCacheSummaryV1(
        handles[index]!,
      );
      if (
        run.cacheSummary.summaryFingerprint !==
          cacheSummary.summaryFingerprint ||
        run.deviceRun.playbackObservation.itemIndex !== identity.itemIndex ||
        run.deviceRun.playbackObservation.entryFingerprint !==
          identity.entryFingerprint ||
        run.deviceRun.playbackObservation.generationTargetFingerprint !==
          identity.generationTargetFingerprint
      )
        fail();
      const body = {
        itemIndex: identity.itemIndex,
        generationTargetFingerprint: identity.generationTargetFingerprint,
        entryFingerprint: identity.entryFingerprint,
        cacheSummaryFingerprint: cacheSummary.summaryFingerprint,
        cachedRunFingerprint: run.cachedRunFingerprint,
      };
      return Object.freeze({
        ...body,
        rowFingerprint: hashCanonicalBody(body),
      });
    }),
  );
  const first = identities[0]!;
  const body = {
    schemaVersion: LEARNING_V2_VOICE_AUDIO_PAGE_RUN_SCHEMA_V1,
    pageStartIndex: input.pageStartIndex,
    pageItemCount: rows.length,
    platform: first.platform,
    deviceClass: first.deviceClass,
    osVersion: first.osVersion,
    appBuildFingerprint: first.appBuildFingerprint,
    rows,
    orderedRowAggregateFingerprint: hashCanonicalBody(
      rows.map((row) => row.rowFingerprint),
    ),
    cacheExecution: "preflight_all_then_bounded_concurrency_max_4" as const,
    playbackExecution: "strict_manifest_order_after_complete_cache" as const,
    transportUrlEvidenceAuthority: "none_not_retained" as const,
    repositoryOriginAuthority: "none" as const,
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
    pageRunFingerprint: hashCanonicalBody(body),
  });
  const material = Object.freeze({
    run: result,
    nativeDecoderObservations: Object.freeze(
      runs.map((run) => run.deviceRun.playbackObservation),
    ),
    pcmSignalObservations: Object.freeze(
      runs.map((run) => run.deviceRun.pcmObservation),
    ),
  });
  runHandles.add(result);
  runMetadata.set(result, material);
  return result;
}

export function isLearningV2VoiceAudioPageRunV1(
  value: unknown,
): value is LearningV2VoiceAudioPageRunV1 {
  return typeof value === "object" && value !== null && runHandles.has(value);
}

export function resolveLearningV2VoiceAudioPageRunMaterialV1(input: {
  readonly run: LearningV2VoiceAudioPageRunV1;
}): LearningV2VoiceAudioPageRunMaterialV1 {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    Object.keys(input).join("|") !== "run" ||
    !isLearningV2VoiceAudioPageRunV1(input.run)
  )
    fail();
  const material = runMetadata.get(input.run);
  if (!material || material.run !== input.run) fail();
  return material;
}
