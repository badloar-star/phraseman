import {
  ensureAccountGeneration,
  isCurrentAccountGeneration,
  subscribeAccountGeneration,
  type AccountGenerationToken,
} from "./account_generation";
import { getStableId } from "./stable_id";
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
  resolvePreparedLearningV2VoiceAudioOfflineFileV1,
  resolveLearningV2VoiceAudioOfflineCacheMaterialV1,
} from "../modules/learning-v2/runtime/voice_audio_offline_cache_v1";
import { resolveLearningV2BootstrapAudioOfflineFileV1 } from "./learning_v2_bootstrap_audio_seed_v1";
import { learningV2NativeDecoderIdentityForAudioFileV1 } from "./learning_v2_audio_identity_v1";

export { learningV2NativeDecoderIdentityForAudioFileV1 } from "./learning_v2_audio_identity_v1";

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
  readonly supplementalAudioCount: number;
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
  supplementalFileFingerprints: ReadonlyMap<string, string>;
}>;

export type LearningV2CourseSessionSupplementalAudioV1 = Readonly<{
  supplementalId: string;
  file: LearningV2CourseSessionAudioFileV1;
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
const verifiedPhysicalAudioFiles = new Map<string, Promise<string>>();

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

function selectionHandleCacheKey(
  accountScopeHash: string,
  audioFingerprint: string,
  sessionRunId: string,
  supplementalFingerprint: string,
): string {
  if (
    !HASH_RE.test(accountScopeHash) ||
    !HASH_RE.test(audioFingerprint) ||
    !ID_RE.test(sessionRunId) ||
    !HASH_RE.test(supplementalFingerprint)
  )
    fail();
  return `${accountScopeHash}:${audioFingerprint}:${sessionRunId}:${supplementalFingerprint}`;
}

function physicalAudioCacheKeyV1(
  accountScopeHash: string,
  audioFingerprint: string,
  contentHash: string,
): string {
  if (
    !HASH_RE.test(accountScopeHash) ||
    !HASH_RE.test(audioFingerprint) ||
    !HASH_RE.test(contentHash)
  )
    fail();
  return `${accountScopeHash}:${audioFingerprint}:${contentHash}`;
}

async function preload(
  learner: LearningV2CourseSessionLearnerChildV1,
  audioChild: LearningV2CourseSessionAudioChildV1,
  sessionRunId: string,
  account: AccountGenerationToken,
  accountScopeHash: string,
  supplementalAudio: readonly LearningV2CourseSessionSupplementalAudioV1[],
): Promise<LearningV2CourseSessionAudioPreloadHandleV1> {
  const files = new Map<string, LearningV2CourseSessionAudioFileV1>();
  const selections = new Map<string, InteractionSelection>();
  const supplementalFileFingerprints = new Map<string, string>();
  const addFile = (file: LearningV2CourseSessionAudioFileV1) => {
    const current = files.get(file.fileFingerprint);
    if (!current) files.set(file.fileFingerprint, file);
    return file.fileFingerprint;
  };
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
    selections.set(
      selection.interactionId,
      Object.freeze({
        voiceId: selection.voiceId,
        fullPhraseFileFingerprint: selection.fullPhraseFile
          ? addFile(selection.fullPhraseFile)
          : null,
        selectableFileFingerprints: Object.freeze(
          Object.fromEntries(
            Object.entries(selection.selectableFiles).map(
              ([selectableId, file]) => [selectableId, addFile(file)],
            ),
          ),
        ),
      }),
    );
  }
  for (const entry of supplementalAudio) {
    if (!ID_RE.test(entry.supplementalId) || supplementalFileFingerprints.has(entry.supplementalId))
      fail();
    supplementalFileFingerprints.set(entry.supplementalId, addFile(entry.file));
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
  await runPool(orderedFiles.length, async (index) => {
    if (!isCurrentAccountGeneration(account, account.stableId)) fail();
    const file = orderedFiles[index]!;
    const identity = learningV2NativeDecoderIdentityForAudioFileV1(file, index);
    const physicalKey = physicalAudioCacheKeyV1(
      accountScopeHash,
      audioChild.audioFingerprint,
      file.contentHash,
    );
    let verifiedFile = verifiedPhysicalAudioFiles.get(physicalKey);
    if (!verifiedFile) {
      verifiedFile = resolvePreparedLearningV2VoiceAudioOfflineFileV1(identity)
        .then(async (prepared) => prepared ?? resolveLearningV2BootstrapAudioOfflineFileV1(identity))
        .then((cache) => {
          if (!cache) fail();
          return resolveLearningV2VoiceAudioOfflineCacheMaterialV1({
            handle: cache,
            identity,
          }).fileUri;
        })
        .catch((error) => {
          verifiedPhysicalAudioFiles.delete(physicalKey);
          throw error;
        });
      verifiedPhysicalAudioFiles.set(physicalKey, verifiedFile);
      while (verifiedPhysicalAudioFiles.size > 2_048) {
        const oldest = verifiedPhysicalAudioFiles.keys().next().value as
          | string
          | undefined;
        if (!oldest || oldest === physicalKey) break;
        verifiedPhysicalAudioFiles.delete(oldest);
      }
    }
    const fileUri = await verifiedFile;
    if (!isCurrentAccountGeneration(account, account.stableId)) fail();
    localUris.set(file.fileFingerprint, fileUri);
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
    supplementalAudioCount: supplementalFileFingerprints.size,
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
    Object.freeze({
      account,
      summary,
      selections,
      files,
      localUris,
      supplementalFileFingerprints,
    }),
  );
  return handle;
}

export async function preloadLearningV2CourseSessionAudioV1(input: {
  readonly learner: LearningV2CourseSessionLearnerChildV1;
  readonly audioChild: LearningV2CourseSessionAudioChildV1;
  readonly sessionRunId: string;
  readonly supplementalAudio?: readonly LearningV2CourseSessionSupplementalAudioV1[];
}): Promise<LearningV2CourseSessionAudioPreloadHandleV1> {
  const inputKeys = input && typeof input === "object" && !Array.isArray(input)
    ? Object.keys(input).sort().join("|")
    : "";
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    (inputKeys !== "audioChild|learner|sessionRunId" &&
      inputKeys !== "audioChild|learner|sessionRunId|supplementalAudio") ||
    !isLearningV2CourseSessionLearnerChildV1(input.learner) ||
    !isLearningV2CourseSessionAudioChildV1(input.audioChild) ||
    input.audioChild.courseSessionId !== input.learner.courseSessionId ||
    input.audioChild.learnerFingerprint !== input.learner.learnerFingerprint ||
    !ID_RE.test(input.sessionRunId)
  )
    fail();
  const supplementalAudio = input.supplementalAudio ?? Object.freeze([]);
  if (!Array.isArray(supplementalAudio)) fail();
  for (const entry of supplementalAudio) {
    if (
      !entry ||
      typeof entry !== "object" ||
      Array.isArray(entry) ||
      Object.getPrototypeOf(entry) !== Object.prototype ||
      Object.keys(entry).sort().join("|") !== "file|supplementalId" ||
      !ID_RE.test(entry.supplementalId) ||
      !entry.file ||
      typeof entry.file !== "object" ||
      !HASH_RE.test(entry.file.fileFingerprint) ||
      !HASH_RE.test(entry.file.contentHash)
    )
      fail();
  }
  const supplementalFingerprint = hashCanonicalBody(
    supplementalAudio.map((entry) => ({
      supplementalId: entry.supplementalId,
      fileFingerprint: entry.file.fileFingerprint,
    })),
  );
  const stableId = await getStableId();
  const account = ensureAccountGeneration(stableId);
  const accountScopeHash = deriveLocalOfflineProgressAccountScopeHash(stableId);
  const key = selectionHandleCacheKey(
    accountScopeHash,
    input.audioChild.audioFingerprint,
    input.sessionRunId,
    supplementalFingerprint,
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
  operation = preload(
    input.learner,
    input.audioChild,
    input.sessionRunId,
    account,
    accountScopeHash,
    supplementalAudio,
  ).then((handle) => {
    if (!isCurrentAccountGeneration(account, stableId)) fail();
    peek.set(key, handle);
    while (peek.size > 12) {
      const oldest = peek.keys().next().value as string | undefined;
      if (!oldest) break;
      peek.delete(oldest);
    }
    return handle;
  }).finally(() => {
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

export function resolveLearningV2CourseSessionSupplementalAudioV1(input: {
  readonly handle: LearningV2CourseSessionAudioPreloadHandleV1;
  readonly supplementalId: string;
}) {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    Object.keys(input).sort().join("|") !== "handle|supplementalId" ||
    !ID_RE.test(input.supplementalId)
  )
    fail();
  const material = exactMaterial(input.handle);
  return resolveFile(
    material,
    material.supplementalFileFingerprints.get(input.supplementalId),
  );
}

subscribeAccountGeneration(() => {
  peek.clear();
  inFlight.clear();
  verifiedPhysicalAudioFiles.clear();
});
