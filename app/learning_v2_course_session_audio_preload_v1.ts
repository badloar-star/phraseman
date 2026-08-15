import Constants from "expo-constants";
import { Platform } from "react-native";

import {
  ensureAccountGeneration,
  isCurrentAccountGeneration,
  subscribeAccountGeneration,
  type AccountGenerationToken,
} from "./account_generation";
import {
  createLearningV2ActivityAudioTransportV1,
  downloadLearningV2ActivityAudioBytesV1,
  type LearningV2ActivityAudioTransportHandleV1,
} from "./learning_v2_activity_audio_transport_v1";
import { getStableId } from "./stable_id";
import {
  withBackgroundNetworkLease,
  type BackgroundNetworkLease,
} from "./interactive_network_quiet";
import { deriveLocalOfflineProgressAccountScopeHash } from "../modules/learning-v2/progress/progress_account_scope";
import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";
import {
  isLearningV2CourseSessionAudioChildV1,
  learningV2CourseSessionInteractionVoiceIndexV1,
  selectLearningV2CourseSessionInteractionAudioV1,
  type LearningV2CourseSessionAudioChildV1,
  type LearningV2CourseSessionAudioFileV1,
  type LearningV2CourseSessionAudioVoiceIdV1,
} from "../modules/learning-v2/runtime/course_session_audio_child_v1";
import {
  isLearningV2CourseSessionLearnerChildV1,
  type LearningV2CourseSessionLearnerChildV1,
} from "../modules/learning-v2/runtime/course_session_client_children_v1";
import {
  prepareLearningV2VoiceAudioOfflineBytesV1,
  resolveLearningV2VoiceAudioOfflineCacheMaterialV1,
} from "../modules/learning-v2/runtime/voice_audio_offline_cache_v1";
import type { LearningV2NativeDecoderIdentityV1 } from "../modules/learning-v2/runtime/voice_native_decoder_observer_v1";

export const LEARNING_V2_COURSE_SESSION_AUDIO_PRELOAD_SCHEMA_V1 =
  "learning-v2-course-session-audio-preload.v1" as const;
export const LEARNING_V2_COURSE_SESSION_AUDIO_PRELOAD_MAX_CONCURRENCY_V1 = 4;
export const LEARNING_V2_COURSE_SESSION_AUDIO_PRELOAD_MAX_FILES_V1 = 512;
export const LEARNING_V2_COURSE_SESSION_AUDIO_PRELOAD_MAX_BYTES_V1 =
  32 * 1024 * 1024;

export interface LearningV2CourseSessionAudioPreloadHandleV1 {
  readonly __opaqueLearningV2CourseSessionAudioPreloadHandleV1: unique symbol;
}

export interface LearningV2CourseSessionAudioPreloadSummaryV1 {
  readonly schemaVersion: typeof LEARNING_V2_COURSE_SESSION_AUDIO_PRELOAD_SCHEMA_V1;
  readonly courseSessionId: string;
  readonly sessionRunId: string;
  readonly learnerFingerprint: string;
  readonly audioFingerprint: string;
  readonly interactionCount: number;
  readonly selectedFileCount: number;
  readonly selectedByteSize: number;
  readonly localFileCount: number;
  readonly selectionPolicy: "local_shuffled_round_robin";
  readonly taskVoiceScope: "one_voice_per_interaction_for_phrase_and_words";
  readonly preparationPolicy: "all_selected_mp3_verified_before_session_start";
  readonly answerPathTransport: "none_local_file_only";
  readonly serverRequestPerPlayback: false;
  readonly localByteEvidence: "exact_sha256_and_byte_size_readback";
  readonly accountFence: "exact_process_account_generation";
  readonly correctnessAuthority: "none";
  readonly walletAuthority: "none";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
  readonly releaseAuthority: false;
  readonly preloadFingerprint: string;
}

type InteractionSelection = Readonly<{
  voiceId: LearningV2CourseSessionAudioVoiceIdV1;
  fullPhraseFileFingerprint: string | null;
  selectableFileFingerprints: Readonly<Record<string, string>>;
}>;

type PreloadMaterial = Readonly<{
  account: AccountGenerationToken;
  summary: LearningV2CourseSessionAudioPreloadSummaryV1;
  selections: ReadonlyMap<string, InteractionSelection>;
  files: ReadonlyMap<string, LearningV2CourseSessionAudioFileV1>;
  localUris: ReadonlyMap<string, string>;
}>;

const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const handles = new WeakSet<object>();
const metadata = new WeakMap<object, PreloadMaterial>();
const peek = new Map<string, LearningV2CourseSessionAudioPreloadHandleV1>();
const inFlight = new Map<
  string,
  Promise<LearningV2CourseSessionAudioPreloadHandleV1>
>();

function fail(): never {
  throw new Error("learning_v2_course_session_audio_preload_invalid");
}

function exactMaterial(
  handle: LearningV2CourseSessionAudioPreloadHandleV1,
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

function boundedToken(value: string | null | undefined): string {
  const normalized = (value ?? "unknown")
    .normalize("NFKC")
    .replace(/[^A-Za-z0-9._-]+/gu, "_")
    .slice(0, 64);
  return normalized || "unknown";
}

function identityForFile(
  file: LearningV2CourseSessionAudioFileV1,
  itemIndex: number,
): LearningV2NativeDecoderIdentityV1 {
  if (Platform.OS !== "ios" && Platform.OS !== "android") fail();
  // Native identity is resolved lazily so cache-only imports do not initialize
  // expo-device on web or in route-contract tests.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Device = require("expo-device") as {
    readonly isDevice?: boolean;
    readonly osVersion?: string | null;
  };
  return Object.freeze({
    itemIndex,
    generationTargetFingerprint: file.fileFingerprint,
    entryFingerprint: file.fileFingerprint,
    objectPath: file.objectPath,
    contentHash: file.contentHash,
    objectGeneration: file.objectGeneration,
    byteSize: file.byteSize,
    platform: Platform.OS,
    deviceClass: Device.isDevice ? "physical_device" : "simulator_or_emulator",
    osVersion: boundedToken(Device.osVersion),
    appBuildFingerprint: hashCanonicalBody({
      schemaVersion: "learning-v2-course-session-audio-app-build.v1",
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
          LEARNING_V2_COURSE_SESSION_AUDIO_PRELOAD_MAX_CONCURRENCY_V1,
        ),
      },
      worker,
    ),
  );
}

function cacheKey(
  accountScopeHash: string,
  audioFingerprint: string,
  sessionRunId: string,
): string {
  if (
    !HASH_RE.test(accountScopeHash) ||
    !HASH_RE.test(audioFingerprint) ||
    !ID_RE.test(sessionRunId)
  )
    fail();
  return `${accountScopeHash}:${audioFingerprint}:${sessionRunId}`;
}

async function preload(
  learner: LearningV2CourseSessionLearnerChildV1,
  audioChild: LearningV2CourseSessionAudioChildV1,
  sessionRunId: string,
  account: AccountGenerationToken,
  lease: BackgroundNetworkLease,
): Promise<LearningV2CourseSessionAudioPreloadHandleV1> {
  const files = new Map<string, LearningV2CourseSessionAudioFileV1>();
  const selections = new Map<string, InteractionSelection>();
  for (const interaction of audioChild.interactions) {
    const learnerInteraction = learner.interactions.find(
      (candidate) => candidate.interactionId === interaction.interactionId,
    );
    if (!learnerInteraction) fail();
    const selection = selectLearningV2CourseSessionInteractionAudioV1({
      child: audioChild,
      interactionId: interaction.interactionId,
      voiceSelectionIndex: learningV2CourseSessionInteractionVoiceIndexV1({
        sessionRunId,
        courseSessionId: audioChild.courseSessionId,
        interactionOrdinal: learnerInteraction.ordinal,
      }),
    });
    const add = (file: LearningV2CourseSessionAudioFileV1) => {
      const current = files.get(file.fileFingerprint);
      if (!current) files.set(file.fileFingerprint, file);
      return file.fileFingerprint;
    };
    selections.set(
      selection.interactionId,
      Object.freeze({
        voiceId: selection.voiceId,
        fullPhraseFileFingerprint: selection.fullPhraseFile
          ? add(selection.fullPhraseFile)
          : null,
        selectableFileFingerprints: Object.freeze(
          Object.fromEntries(
            Object.entries(selection.selectableFiles).map(
              ([selectableId, file]) => [selectableId, add(file)],
            ),
          ),
        ),
      }),
    );
  }
  const orderedFiles = [...files.values()];
  const selectedByteSize = orderedFiles.reduce(
    (sum, file) => sum + file.byteSize,
    0,
  );
  if (
    orderedFiles.length >
      LEARNING_V2_COURSE_SESSION_AUDIO_PRELOAD_MAX_FILES_V1 ||
    selectedByteSize > LEARNING_V2_COURSE_SESSION_AUDIO_PRELOAD_MAX_BYTES_V1
  )
    fail();
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
  await runPool(orderedFiles.length, async (index) => {
    if (!isCurrentAccountGeneration(account, account.stableId)) fail();
    const file = orderedFiles[index]!;
    const identity = identityForFile(file, index);
    const cache = await prepareLearningV2VoiceAudioOfflineBytesV1({
      identity,
      loadBytes: async () =>
        downloadLearningV2ActivityAudioBytesV1({
          entry: file,
          transport: await transport(),
        }),
    });
    const material = resolveLearningV2VoiceAudioOfflineCacheMaterialV1({
      handle: cache,
      identity,
    });
    if (!isCurrentAccountGeneration(account, account.stableId)) fail();
    localUris.set(file.fileFingerprint, material.fileUri);
  });
  if (localUris.size !== files.size) fail();
  const body = {
    schemaVersion: LEARNING_V2_COURSE_SESSION_AUDIO_PRELOAD_SCHEMA_V1,
    courseSessionId: audioChild.courseSessionId,
    sessionRunId,
    learnerFingerprint: learner.learnerFingerprint,
    audioFingerprint: audioChild.audioFingerprint,
    interactionCount: selections.size,
    selectedFileCount: files.size,
    selectedByteSize,
    localFileCount: localUris.size,
    selectionPolicy: "local_shuffled_round_robin" as const,
    taskVoiceScope: "one_voice_per_interaction_for_phrase_and_words" as const,
    preparationPolicy:
      "all_selected_mp3_verified_before_session_start" as const,
    answerPathTransport: "none_local_file_only" as const,
    serverRequestPerPlayback: false as const,
    localByteEvidence: "exact_sha256_and_byte_size_readback" as const,
    accountFence: "exact_process_account_generation" as const,
    correctnessAuthority: "none" as const,
    walletAuthority: "none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    releaseAuthority: false as const,
  };
  const summary = Object.freeze({
    ...body,
    preloadFingerprint: hashCanonicalBody({
      ...body,
      selectedFileFingerprints: [...files.keys()],
    }),
  });
  const handle = Object.freeze(
    {},
  ) as LearningV2CourseSessionAudioPreloadHandleV1;
  handles.add(handle);
  metadata.set(
    handle,
    Object.freeze({ account, summary, selections, files, localUris }),
  );
  return handle;
}

export async function preloadLearningV2CourseSessionAudioV1(input: {
  readonly learner: LearningV2CourseSessionLearnerChildV1;
  readonly audioChild: LearningV2CourseSessionAudioChildV1;
  readonly sessionRunId: string;
}): Promise<LearningV2CourseSessionAudioPreloadHandleV1> {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    Object.keys(input).sort().join("|") !== "audioChild|learner|sessionRunId" ||
    !isLearningV2CourseSessionLearnerChildV1(input.learner) ||
    !isLearningV2CourseSessionAudioChildV1(input.audioChild) ||
    input.audioChild.courseSessionId !== input.learner.courseSessionId ||
    input.audioChild.learnerFingerprint !== input.learner.learnerFingerprint ||
    !ID_RE.test(input.sessionRunId)
  )
    fail();
  const stableId = await getStableId();
  const account = ensureAccountGeneration(stableId);
  const accountScopeHash = deriveLocalOfflineProgressAccountScopeHash(stableId);
  const key = cacheKey(
    accountScopeHash,
    input.audioChild.audioFingerprint,
    input.sessionRunId,
  );
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
  let operation: Promise<LearningV2CourseSessionAudioPreloadHandleV1>;
  operation = withBackgroundNetworkLease(
    "learning-v2.course-session-audio-preload",
    async (lease) => {
      const handle = await preload(
        input.learner,
        input.audioChild,
        input.sessionRunId,
        account,
        lease,
      );
      if (!isCurrentAccountGeneration(account, stableId)) fail();
      peek.set(key, handle);
      while (peek.size > 12) {
        const oldest = peek.keys().next().value as string | undefined;
        if (!oldest) break;
        peek.delete(oldest);
      }
      return handle;
    },
  ).finally(() => {
    if (inFlight.get(key) === operation) inFlight.delete(key);
  });
  inFlight.set(key, operation);
  return operation;
}

export function isLearningV2CourseSessionAudioPreloadHandleV1(
  value: unknown,
): value is LearningV2CourseSessionAudioPreloadHandleV1 {
  if (typeof value !== "object" || value === null || !handles.has(value))
    return false;
  try {
    exactMaterial(value as LearningV2CourseSessionAudioPreloadHandleV1);
    return true;
  } catch {
    return false;
  }
}

export function getLearningV2CourseSessionAudioPreloadSummaryV1(
  handle: LearningV2CourseSessionAudioPreloadHandleV1,
): LearningV2CourseSessionAudioPreloadSummaryV1 {
  return exactMaterial(handle).summary;
}

function resolveFile(
  material: PreloadMaterial,
  fingerprint: string | null | undefined,
): Readonly<{
  fileUri: string;
  voiceId: LearningV2CourseSessionAudioVoiceIdV1;
}> | null {
  if (!fingerprint) return null;
  const file = material.files.get(fingerprint);
  const fileUri = material.localUris.get(fingerprint);
  if (!file || !fileUri) fail();
  return Object.freeze({ fileUri, voiceId: file.voiceId });
}

export function resolveLearningV2CourseSessionFullPhraseAudioV1(input: {
  readonly handle: LearningV2CourseSessionAudioPreloadHandleV1;
  readonly interactionId: string;
}) {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    Object.keys(input).sort().join("|") !== "handle|interactionId" ||
    !ID_RE.test(input.interactionId)
  )
    fail();
  const material = exactMaterial(input.handle);
  return resolveFile(
    material,
    material.selections.get(input.interactionId)?.fullPhraseFileFingerprint,
  );
}

export function resolveLearningV2CourseSessionSelectableAudioV1(input: {
  readonly handle: LearningV2CourseSessionAudioPreloadHandleV1;
  readonly interactionId: string;
  readonly selectableId: string;
}) {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    Object.keys(input).sort().join("|") !==
      "handle|interactionId|selectableId" ||
    !ID_RE.test(input.interactionId) ||
    !ID_RE.test(input.selectableId)
  )
    fail();
  const material = exactMaterial(input.handle);
  return resolveFile(
    material,
    material.selections.get(input.interactionId)?.selectableFileFingerprints[
      input.selectableId
    ],
  );
}

subscribeAccountGeneration(() => {
  peek.clear();
  inFlight.clear();
});
