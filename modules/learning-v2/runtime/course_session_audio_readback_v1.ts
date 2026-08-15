import { sha256Utf8, utf8ByteLengthV1 } from "../policies/decision_registry";
import {
  encodeLearningV2CourseSessionAudioChildV1,
  isLearningV2CourseSessionAudioChildV1,
  type LearningV2CourseSessionAudioChildV1,
  type LearningV2CourseSessionAudioFileV1,
} from "./course_session_audio_child_v1";
import {
  isLearningV2CourseSessionLearnerChildV1,
  type LearningV2CourseSessionLearnerChildV1,
} from "./course_session_client_children_v1";

export const LEARNING_V2_COURSE_SESSION_AUDIO_READBACK_SCHEMA_V1 =
  "learning-v2-course-session-audio-readback.v1" as const;
export const LEARNING_V2_COURSE_SESSION_AUDIO_READBACK_MAX_CONCURRENCY_V1 = 4;

export interface LearningV2CourseSessionAudioObjectReaderV1 {
  readExact(file: LearningV2CourseSessionAudioFileV1): Promise<
    Readonly<{
      fileUri: string;
      objectGeneration: string;
      byteSize: number;
      contentHash: string;
      contentType: "audio/mpeg";
    }>
  >;
}

export interface LearningV2CourseSessionAudioReadbackHandleV1 {
  readonly __opaqueLearningV2CourseSessionAudioReadbackHandleV1: unique symbol;
}

export interface LearningV2CourseSessionAudioReadbackSummaryV1 {
  readonly schemaVersion: typeof LEARNING_V2_COURSE_SESSION_AUDIO_READBACK_SCHEMA_V1;
  readonly courseSessionId: string;
  readonly learnerFingerprint: string;
  readonly audioFingerprint: string;
  readonly interactionCount: number;
  readonly localFileCount: number;
  readonly storageIntegrity: "exact_generation_hash_size_content_type_readback";
  readonly playbackTransport: "local_file_only_after_readback";
  readonly taskVoiceScope: "one_voice_per_interaction_for_phrase_and_words";
  readonly serverRequestPerPlayback: false;
  readonly answerPayload: "absent";
  readonly correctnessAuthority: "none";
  readonly walletAuthority: "none";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
  readonly releaseAuthority: false;
}

type Material = Readonly<{
  summary: LearningV2CourseSessionAudioReadbackSummaryV1;
  child: LearningV2CourseSessionAudioChildV1;
  localUris: ReadonlyMap<string, string>;
}>;

const FILE_URI_RE = /^file:\/\/[A-Za-z0-9._~!$&'()*+,;=:@%\/-]{1,4096}\.mp3$/u;
const handles = new WeakSet<object>();
const metadata = new WeakMap<object, Material>();

function fail(): never {
  throw new Error("learning_v2_course_session_audio_readback_invalid");
}

function record(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function uniqueFiles(
  child: LearningV2CourseSessionAudioChildV1,
): readonly LearningV2CourseSessionAudioFileV1[] {
  const values = child.interactions.flatMap((interaction) => [
    ...(interaction.fullPhraseFiles ?? []),
    ...interaction.selectables.flatMap((entry) => entry.files),
  ]);
  const fingerprints = new Set<string>();
  const files: LearningV2CourseSessionAudioFileV1[] = [];
  for (const file of values) {
    if (fingerprints.has(file.fileFingerprint)) continue;
    fingerprints.add(file.fileFingerprint);
    files.push(file);
  }
  return Object.freeze(files);
}

async function readPool(
  files: readonly LearningV2CourseSessionAudioFileV1[],
  reader: LearningV2CourseSessionAudioObjectReaderV1,
): Promise<ReadonlyMap<string, string>> {
  const result = new Map<string, string>();
  let next = 0;
  const worker = async () => {
    for (;;) {
      const index = next;
      next += 1;
      if (index >= files.length) return;
      const file = files[index]!;
      const observed = await reader.readExact(file);
      if (
        !record(observed) ||
        Object.keys(observed).sort().join("|") !==
          "byteSize|contentHash|contentType|fileUri|objectGeneration" ||
        !FILE_URI_RE.test(observed.fileUri as string) ||
        observed.objectGeneration !== file.objectGeneration ||
        observed.byteSize !== file.byteSize ||
        observed.contentHash !== file.contentHash ||
        observed.contentType !== file.contentType
      )
        fail();
      result.set(file.fileFingerprint, observed.fileUri as string);
    }
  };
  await Promise.all(
    Array.from(
      {
        length: Math.min(
          files.length,
          LEARNING_V2_COURSE_SESSION_AUDIO_READBACK_MAX_CONCURRENCY_V1,
        ),
      },
      worker,
    ),
  );
  if (result.size !== files.length) fail();
  return result;
}

export async function loadLearningV2CourseSessionAudioReadbackV1(
  input: Readonly<{
    learner: LearningV2CourseSessionLearnerChildV1;
    child: LearningV2CourseSessionAudioChildV1;
    childRaw: string;
    reader: LearningV2CourseSessionAudioObjectReaderV1;
  }>,
): Promise<LearningV2CourseSessionAudioReadbackHandleV1> {
  if (
    !record(input) ||
    Object.keys(input).sort().join("|") !== "child|childRaw|learner|reader" ||
    !isLearningV2CourseSessionLearnerChildV1(input.learner) ||
    !isLearningV2CourseSessionAudioChildV1(input.child) ||
    typeof input.childRaw !== "string" ||
    encodeLearningV2CourseSessionAudioChildV1(input.child) !== input.childRaw ||
    sha256Utf8(input.childRaw).length !== 64 ||
    utf8ByteLengthV1(input.childRaw) < 2 ||
    !record(input.reader) ||
    typeof input.reader.readExact !== "function" ||
    input.child.courseSessionId !== input.learner.courseSessionId ||
    input.child.learnerFingerprint !== input.learner.learnerFingerprint
  )
    fail();
  const files = uniqueFiles(input.child);
  const localUris = await readPool(files, input.reader);
  const summary = Object.freeze({
    schemaVersion: LEARNING_V2_COURSE_SESSION_AUDIO_READBACK_SCHEMA_V1,
    courseSessionId: input.child.courseSessionId,
    learnerFingerprint: input.child.learnerFingerprint,
    audioFingerprint: input.child.audioFingerprint,
    interactionCount: input.child.interactionCount,
    localFileCount: localUris.size,
    storageIntegrity:
      "exact_generation_hash_size_content_type_readback" as const,
    playbackTransport: "local_file_only_after_readback" as const,
    taskVoiceScope: "one_voice_per_interaction_for_phrase_and_words" as const,
    serverRequestPerPlayback: false as const,
    answerPayload: "absent" as const,
    correctnessAuthority: "none" as const,
    walletAuthority: "none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    releaseAuthority: false as const,
  });
  const handle = Object.freeze(
    {},
  ) as LearningV2CourseSessionAudioReadbackHandleV1;
  handles.add(handle);
  metadata.set(
    handle,
    Object.freeze({ summary, child: input.child, localUris }),
  );
  return handle;
}

function material(
  handle: LearningV2CourseSessionAudioReadbackHandleV1,
): Material {
  const value = metadata.get(handle as object);
  if (!value || !handles.has(handle as object)) fail();
  return value;
}

export function getLearningV2CourseSessionAudioReadbackSummaryV1(
  handle: LearningV2CourseSessionAudioReadbackHandleV1,
): LearningV2CourseSessionAudioReadbackSummaryV1 {
  return material(handle).summary;
}

export function resolveLearningV2CourseSessionAudioLocalFileV1(
  input: Readonly<{
    handle: LearningV2CourseSessionAudioReadbackHandleV1;
    interactionId: string;
    selectableId: string | null;
    voiceSelectionIndex: 0 | 1 | 2 | 3;
  }>,
): Readonly<{
  fileUri: string;
  voiceId: LearningV2CourseSessionAudioFileV1["voiceId"];
}> | null {
  if (
    !record(input) ||
    Object.keys(input).sort().join("|") !==
      "handle|interactionId|selectableId|voiceSelectionIndex"
  )
    fail();
  const found = material(input.handle);
  const interaction = found.child.interactions.find(
    (entry) => entry.interactionId === input.interactionId,
  );
  if (!interaction) fail();
  const file =
    input.selectableId === null
      ? interaction.fullPhraseFiles?.[input.voiceSelectionIndex]
      : interaction.selectables.find(
          (entry) => entry.selectableId === input.selectableId,
        )?.files[input.voiceSelectionIndex];
  if (!file) return null;
  const fileUri = found.localUris.get(file.fileFingerprint);
  if (!fileUri) fail();
  return Object.freeze({ fileUri, voiceId: file.voiceId });
}
