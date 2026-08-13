import Constants from "expo-constants";
import { Platform } from "react-native";

import {
  ensureAccountGeneration,
  isCurrentAccountGeneration,
  subscribeAccountGeneration,
  type AccountGenerationToken,
} from "./account_generation";
import {
  downloadLearningV2ActivityAudioBytesV1,
  createLearningV2ActivityAudioTransportV1,
  type LearningV2ActivityAudioTransportHandleV1,
} from "./learning_v2_activity_audio_transport_v1";
import {
  peekCurrentLearningV2ActivityAuxiliarySessionV1,
  preloadCurrentLearningV2ActivityAuxiliarySessionV1,
  type LearningV2ActivityAuxiliaryCurrentLocatorV1,
} from "./learning_v2_activity_auxiliary_client";
import { preloadCurrentLearningV2ActivityReleasedSessionV1 } from "./learning_v2_activity_released_session_client_v1";
import { getStableId, peekStableId } from "./stable_id";
import {
  withBackgroundNetworkLease,
  type BackgroundNetworkLease,
} from "./interactive_network_quiet";
import { deriveLocalOfflineProgressAccountScopeHash } from "../modules/learning-v2/progress/progress_account_scope";
import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";
import {
  getLearningV2ActivitySessionAudioPlanEntriesV1,
  getLearningV2ActivitySessionAudioPlanSummaryV1,
  getLearningV2ActivitySessionAudioTaskPlanV1,
  materializeLearningV2ActivitySessionAudioPlanV1,
  resolveLearningV2ActivitySessionAudioEntryV1,
  type LearningV2ActivitySessionAudioPlanHandleV1,
} from "../modules/learning-v2/runtime/activity_session_audio_plan_v1";
import {
  prepareLearningV2VoiceAudioOfflineBytesV1,
  resolveLearningV2VoiceAudioOfflineCacheMaterialV1,
} from "../modules/learning-v2/runtime/voice_audio_offline_cache_v1";
import type { LearningV2NativeDecoderIdentityV1 } from "../modules/learning-v2/runtime/voice_native_decoder_observer_v1";

export const LEARNING_V2_ACTIVITY_AUDIO_PRELOAD_SCHEMA_V1 =
  "learning-v2-activity-audio-preload.v1" as const;
export const LEARNING_V2_ACTIVITY_AUDIO_PRELOAD_MAX_CONCURRENCY_V1 = 4;
export const LEARNING_V2_ACTIVITY_AUDIO_PRELOAD_MAX_PEEK_ENTRIES_V1 = 12;

export interface LearningV2ActivityAudioPreloadHandleV1 {
  readonly __opaqueLearningV2ActivityAudioPreloadHandleV1: unique symbol;
}

export interface LearningV2ActivityAudioPreloadSummaryV1 {
  readonly schemaVersion: typeof LEARNING_V2_ACTIVITY_AUDIO_PRELOAD_SCHEMA_V1;
  readonly descriptorFingerprint: string;
  readonly sessionId: string;
  readonly sessionOrdinal: number;
  readonly audioPlanFingerprint: string;
  readonly taskPlanCount: number;
  readonly selectedEntryCount: number;
  readonly localFileCount: number;
  readonly voiceSelectionPolicy: "local_shuffled_round_robin";
  readonly taskVoiceScope: "one_voice_per_task_for_phrase_and_words";
  readonly answerPathTransport: "none_local_file_only";
  readonly localByteEvidence: "exact_sha256_and_byte_size_readback";
  readonly accountFence: "exact_process_account_generation";
  readonly walletAuthority: "none";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
  readonly releaseAuthority: false;
  readonly preloadFingerprint: string;
}

type PreloadMaterial = Readonly<{
  account: AccountGenerationToken;
  accountScopeHash: string;
  plan: LearningV2ActivitySessionAudioPlanHandleV1;
  summary: LearningV2ActivityAudioPreloadSummaryV1;
  localUris: ReadonlyMap<string, string>;
}>;

const HASH_RE = /^[a-f0-9]{64}$/u;
const handles = new WeakSet<object>();
const metadata = new WeakMap<object, PreloadMaterial>();
const peek = new Map<string, LearningV2ActivityAudioPreloadHandleV1>();
const inFlight = new Map<
  string,
  Promise<LearningV2ActivityAudioPreloadHandleV1>
>();

function fail(): never {
  throw new Error("learning_v2_activity_audio_preload_invalid");
}

function exactMaterial(
  handle: LearningV2ActivityAudioPreloadHandleV1,
): PreloadMaterial {
  const material = metadata.get(handle as object);
  if (
    !material ||
    !handles.has(handle as object) ||
    !isCurrentAccountGeneration(material.account, material.account.stableId)
  )
    fail();
  return material;
}

function selectionSeed(
  accountScopeHash: string,
  descriptorFingerprint: string,
  sessionId: string,
): string {
  return hashCanonicalBody({
    schemaVersion: "learning-v2-activity-audio-selection-seed.v1",
    accountScopeHash,
    descriptorFingerprint,
    sessionId,
  });
}

function boundedToken(value: string | null | undefined): string {
  const normalized = (value ?? "unknown")
    .normalize("NFKC")
    .replace(/[^A-Za-z0-9._-]+/gu, "_")
    .slice(0, 64);
  return normalized || "unknown";
}

function identityForEntry(
  entry: ReturnType<
    typeof getLearningV2ActivitySessionAudioPlanEntriesV1
  >[number],
  itemIndex: number,
): LearningV2NativeDecoderIdentityV1 {
  if (Platform.OS !== "ios" && Platform.OS !== "android") fail();
  // Keep expo-device off the module-import path: screen contract tests, web SSR,
  // and cache-only paths do not need to initialize this native dependency.
  const Device = require("expo-device") as {
    readonly isDevice?: boolean;
    readonly osVersion?: string | null;
  };
  return Object.freeze({
    itemIndex,
    generationTargetFingerprint: entry.generationTargetFingerprint,
    entryFingerprint: entry.entryFingerprint,
    objectPath: entry.objectPath,
    contentHash: entry.contentHash,
    objectGeneration: entry.objectGeneration,
    byteSize: entry.byteSize,
    platform: Platform.OS,
    deviceClass: Device.isDevice ? "physical_device" : "simulator_or_emulator",
    osVersion: boundedToken(Device.osVersion),
    appBuildFingerprint: hashCanonicalBody({
      schemaVersion: "learning-v2-activity-audio-app-build.v1",
      appVersion: boundedToken(
        Constants.expoConfig?.version ?? Constants.nativeAppVersion,
      ),
      buildVersion: boundedToken(Constants.nativeBuildVersion),
    }),
    expoAudioVersion: "1.1.1",
  });
}

async function runPool(
  length: number,
  work: (index: number) => Promise<void>,
): Promise<void> {
  let next = 0;
  const worker = async () => {
    for (;;) {
      const index = next;
      next += 1;
      if (index >= length) return;
      await work(index);
    }
  };
  await Promise.all(
    Array.from(
      {
        length: Math.min(
          length,
          LEARNING_V2_ACTIVITY_AUDIO_PRELOAD_MAX_CONCURRENCY_V1,
        ),
      },
      worker,
    ),
  );
}

async function preloadDescriptor(
  descriptor: NonNullable<
    ReturnType<typeof peekCurrentLearningV2ActivityAuxiliarySessionV1>
  >,
  account: AccountGenerationToken,
  accountScopeHash: string,
  lease: BackgroundNetworkLease,
): Promise<LearningV2ActivityAudioPreloadHandleV1> {
  const plan = materializeLearningV2ActivitySessionAudioPlanV1({
    descriptor,
    selectionSeed: selectionSeed(
      accountScopeHash,
      descriptor.descriptorFingerprint,
      descriptor.sessionId,
    ),
  });
  const planSummary = getLearningV2ActivitySessionAudioPlanSummaryV1(plan);
  const entries = getLearningV2ActivitySessionAudioPlanEntriesV1(plan);
  const localUris = new Map<string, string>();
  let transportPromise: Promise<LearningV2ActivityAudioTransportHandleV1> | null =
    null;
  const transport = () => {
    transportPromise ??= createLearningV2ActivityAudioTransportV1({
      account,
      lease,
    });
    return transportPromise;
  };
  await runPool(entries.length, async (index) => {
    if (!isCurrentAccountGeneration(account, account.stableId)) fail();
    const entry = entries[index];
    const identity = identityForEntry(entry, index);
    const cache = await prepareLearningV2VoiceAudioOfflineBytesV1({
      identity,
      loadBytes: async () =>
        downloadLearningV2ActivityAudioBytesV1({
          entry,
          transport: await transport(),
        }),
    });
    if (!isCurrentAccountGeneration(account, account.stableId)) fail();
    const material = resolveLearningV2VoiceAudioOfflineCacheMaterialV1({
      handle: cache,
      identity,
    });
    localUris.set(entry.entryFingerprint, material.fileUri);
  });
  if (
    !isCurrentAccountGeneration(account, account.stableId) ||
    localUris.size !== entries.length
  )
    fail();
  const body = {
    schemaVersion: LEARNING_V2_ACTIVITY_AUDIO_PRELOAD_SCHEMA_V1,
    descriptorFingerprint: descriptor.descriptorFingerprint,
    sessionId: descriptor.sessionId,
    sessionOrdinal: descriptor.sessionOrdinal,
    audioPlanFingerprint: planSummary.planFingerprint,
    taskPlanCount: planSummary.taskPlanCount,
    selectedEntryCount: planSummary.selectedEntryCount,
    localFileCount: localUris.size,
    voiceSelectionPolicy: "local_shuffled_round_robin" as const,
    taskVoiceScope: "one_voice_per_task_for_phrase_and_words" as const,
    answerPathTransport: "none_local_file_only" as const,
    localByteEvidence: "exact_sha256_and_byte_size_readback" as const,
    accountFence: "exact_process_account_generation" as const,
    walletAuthority: "none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    releaseAuthority: false as const,
  };
  const summary = Object.freeze({
    ...body,
    preloadFingerprint: hashCanonicalBody({
      ...body,
      localEntryFingerprints: [...localUris.keys()],
    }),
  });
  const handle = Object.freeze({}) as LearningV2ActivityAudioPreloadHandleV1;
  handles.add(handle);
  metadata.set(
    handle,
    Object.freeze({ account, accountScopeHash, plan, summary, localUris }),
  );
  return handle;
}

function cacheKey(
  accountScopeHash: string,
  descriptorFingerprint: string,
): string {
  if (!HASH_RE.test(accountScopeHash) || !HASH_RE.test(descriptorFingerprint))
    fail();
  return `${accountScopeHash}:${descriptorFingerprint}`;
}

function publishPeek(
  key: string,
  handle: LearningV2ActivityAudioPreloadHandleV1,
): void {
  peek.delete(key);
  peek.set(key, handle);
  while (peek.size > LEARNING_V2_ACTIVITY_AUDIO_PRELOAD_MAX_PEEK_ENTRIES_V1) {
    const oldest = peek.keys().next().value as string | undefined;
    if (!oldest) break;
    peek.delete(oldest);
  }
}

export async function preloadCurrentLearningV2ActivityAudioSessionV1(
  locator: LearningV2ActivityAuxiliaryCurrentLocatorV1,
): Promise<LearningV2ActivityAudioPreloadHandleV1> {
  // The canonical learner package is additive during rollout. Preload it first
  // when published, but preserve the descriptor/audio path for an older active
  // release that does not have the learner-core pointer yet.
  await preloadCurrentLearningV2ActivityReleasedSessionV1(locator).catch(
    () => undefined,
  );
  await preloadCurrentLearningV2ActivityAuxiliarySessionV1(locator);
  const descriptor = peekCurrentLearningV2ActivityAuxiliarySessionV1(locator);
  if (!descriptor) fail();
  const stableId = await getStableId();
  const account = ensureAccountGeneration(stableId);
  const accountScopeHash = deriveLocalOfflineProgressAccountScopeHash(stableId);
  const key = cacheKey(accountScopeHash, descriptor.descriptorFingerprint);
  const cached = peek.get(key);
  if (cached) {
    try {
      exactMaterial(cached);
      return cached;
    } catch {
      peek.delete(key);
    }
  }
  const pending = inFlight.get(key);
  if (pending) return pending;
  let operation: Promise<LearningV2ActivityAudioPreloadHandleV1>;
  operation = withBackgroundNetworkLease(
    "learning-v2.activity-audio-preload",
    async (lease) => {
      const handle = await preloadDescriptor(
        descriptor,
        account,
        accountScopeHash,
        lease,
      );
      if (!isCurrentAccountGeneration(account, stableId)) fail();
      publishPeek(key, handle);
      return handle;
    },
  ).finally(() => {
    if (inFlight.get(key) === operation) inFlight.delete(key);
  });
  inFlight.set(key, operation);
  return operation;
}

export function peekCurrentLearningV2ActivityAudioSessionV1(
  locator: LearningV2ActivityAuxiliaryCurrentLocatorV1,
): LearningV2ActivityAudioPreloadHandleV1 | null {
  const descriptor = peekCurrentLearningV2ActivityAuxiliarySessionV1(locator);
  if (!descriptor) return null;
  const matches = [...peek.values()].filter((handle) => {
    try {
      return (
        exactMaterial(handle).summary.descriptorFingerprint ===
        descriptor.descriptorFingerprint
      );
    } catch {
      return false;
    }
  });
  return matches.at(-1) ?? null;
}

export function waitForCurrentLearningV2ActivityAudioPreloadV1(
  locator: LearningV2ActivityAuxiliaryCurrentLocatorV1,
): Promise<void> | null {
  const descriptor = peekCurrentLearningV2ActivityAuxiliarySessionV1(locator);
  const stableId = peekStableId();
  if (!descriptor || !stableId) return null;
  const accountScopeHash = deriveLocalOfflineProgressAccountScopeHash(stableId);
  return (
    inFlight
      .get(cacheKey(accountScopeHash, descriptor.descriptorFingerprint))
      ?.then(() => undefined) ?? null
  );
}

export function isLearningV2ActivityAudioPreloadHandleV1(
  value: unknown,
): value is LearningV2ActivityAudioPreloadHandleV1 {
  if (typeof value !== "object" || value === null || !handles.has(value))
    return false;
  try {
    exactMaterial(value as LearningV2ActivityAudioPreloadHandleV1);
    return true;
  } catch {
    return false;
  }
}

export function getLearningV2ActivityAudioPreloadSummaryV1(
  handle: LearningV2ActivityAudioPreloadHandleV1,
): LearningV2ActivityAudioPreloadSummaryV1 {
  return exactMaterial(handle).summary;
}

export function resolveLearningV2ActivitySelectableAudioFileV1(input: {
  readonly handle: LearningV2ActivityAudioPreloadHandleV1;
  readonly taskId: string;
  readonly selectableId: string;
}): Readonly<{
  fileUri: string;
  voiceId: "ash" | "onyx" | "nova" | "coral";
}> | null {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    Object.keys(input).sort().join("|") !== "handle|selectableId|taskId"
  )
    fail();
  const material = exactMaterial(input.handle);
  const task = getLearningV2ActivitySessionAudioTaskPlanV1(
    material.plan,
    input.taskId,
  );
  const fingerprint = task?.selectableEntryFingerprints[input.selectableId];
  if (!task || !fingerprint) return null;
  const entry = resolveLearningV2ActivitySessionAudioEntryV1(
    material.plan,
    fingerprint,
  );
  const fileUri = material.localUris.get(fingerprint);
  if (!fileUri) fail();
  return Object.freeze({ fileUri, voiceId: entry.voiceId });
}

export function resolveLearningV2ActivityFullPhraseAudioFileV1(input: {
  readonly handle: LearningV2ActivityAudioPreloadHandleV1;
  readonly taskId: string;
}): Readonly<{
  fileUri: string;
  voiceId: "ash" | "onyx" | "nova" | "coral";
}> | null {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    Object.keys(input).sort().join("|") !== "handle|taskId"
  )
    fail();
  const material = exactMaterial(input.handle);
  const task = getLearningV2ActivitySessionAudioTaskPlanV1(
    material.plan,
    input.taskId,
  );
  const fingerprint = task?.fullPhraseEntryFingerprint;
  if (!task || !fingerprint) return null;
  const entry = resolveLearningV2ActivitySessionAudioEntryV1(
    material.plan,
    fingerprint,
  );
  const fileUri = material.localUris.get(fingerprint);
  if (!fileUri) fail();
  return Object.freeze({ fileUri, voiceId: entry.voiceId });
}

subscribeAccountGeneration(() => {
  peek.clear();
  inFlight.clear();
});
