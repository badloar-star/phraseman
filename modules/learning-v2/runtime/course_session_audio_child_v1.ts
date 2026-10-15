import { V2_REQUIRED_VOICE_IDS } from "../contracts/voice_playback_policy_v1";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../policies/decision_registry";
import { LEARNING_V2_COURSE_SESSION_MAX_TOTAL_INTERACTIONS_V1 } from "./course_session_limits_v1";
import {
  isLearningV2CourseSessionLearnerChildV1,
  type LearningV2CourseSessionLearnerChildV1,
} from "./course_session_client_children_v1";

export const LEARNING_V2_COURSE_SESSION_AUDIO_CHILD_SCHEMA_V1 =
  "learning-v2-course-session-audio-child.v1" as const;
export const LEARNING_V2_COURSE_SESSION_AUDIO_CHILD_MAX_BYTES_V1 =
  4 * 1024 * 1024;
export const LEARNING_V2_COURSE_SESSION_AUDIO_FILE_MAX_BYTES_V1 = 64 * 1024;

export type LearningV2CourseSessionAudioVoiceIdV1 =
  (typeof V2_REQUIRED_VOICE_IDS)[number];

export interface LearningV2CourseSessionAudioFileV1 {
  readonly voiceId: LearningV2CourseSessionAudioVoiceIdV1;
  readonly objectPath: string;
  readonly contentHash: string;
  readonly objectGeneration: string;
  readonly byteSize: number;
  readonly contentType: "audio/mpeg";
  readonly fileFingerprint: string;
}

/**
 * Файлы одной реплики: либо все 4 голоса в порядке V2_REQUIRED_VOICE_IDS (голос крутится по заданиям),
 * либо ровно 1 файл — голос, назначенный заданию.
 *
 * зачем (владелец 15.10, EN-сессия, «один голос на задание»): Codex озвучивает каждое задание ОДНИМ случайным
 * голосом и не генерирует четыре версии. Прежний контракт требовал ровно 4 — такое задание не открылось бы вовсе.
 * Старые занятия с четырьмя голосами работают как раньше.
 */
export type LearningV2CourseSessionAudioVoiceFilesV1 =
  | readonly [LearningV2CourseSessionAudioFileV1]
  | readonly [
      LearningV2CourseSessionAudioFileV1,
      LearningV2CourseSessionAudioFileV1,
      LearningV2CourseSessionAudioFileV1,
      LearningV2CourseSessionAudioFileV1,
    ];

/** Файл для выбранного индекса голоса: у реплики с назначенным голосом — всегда её единственный файл. */
export function learningV2CourseSessionAudioFileForVoiceIndexV1(
  files: LearningV2CourseSessionAudioVoiceFilesV1,
  voiceSelectionIndex: 0 | 1 | 2 | 3,
): LearningV2CourseSessionAudioFileV1 {
  return files.length === 1 ? files[0] : files[voiceSelectionIndex];
}

export interface LearningV2CourseSessionAudioSelectableV1 {
  readonly selectableId: string;
  readonly audioTargetId: string;
  readonly wordId: string;
  readonly wordOrdinal: number;
  readonly visibleTextHash: string;
  readonly files: LearningV2CourseSessionAudioVoiceFilesV1;
  readonly selectableFingerprint: string;
}

export interface LearningV2CourseSessionInteractionAudioV1 {
  readonly interactionId: string;
  readonly taskVoiceGroupFingerprint: string;
  readonly fullPhraseFiles: LearningV2CourseSessionAudioVoiceFilesV1 | null;
  readonly selectables: readonly LearningV2CourseSessionAudioSelectableV1[];
  readonly interactionAudioFingerprint: string;
}

export interface LearningV2CourseSessionAudioChildV1 {
  readonly schemaVersion: typeof LEARNING_V2_COURSE_SESSION_AUDIO_CHILD_SCHEMA_V1;
  readonly courseSessionId: string;
  readonly learnerFingerprint: string;
  readonly interactions: readonly LearningV2CourseSessionInteractionAudioV1[];
  readonly interactionCount: number;
  readonly voiceIds: typeof V2_REQUIRED_VOICE_IDS;
  readonly variantsPerAudioCoordinate: 4;
  readonly selectionPolicy: "local_shuffled_round_robin";
  readonly taskVoiceScope: "one_voice_per_interaction_for_phrase_and_words";
  readonly serverRequestPerPlayback: false;
  readonly remoteTtsFallbackDuringSession: false;
  readonly answerPayload: "absent_by_exact_schema";
  readonly correctnessAuthority: "none";
  readonly audioByteAuthority: "none_active_release_readback_required";
  readonly runtimeAuthority: "none_active_release_join_required";
  readonly releaseAuthority: false;
  readonly audioFingerprint: string;
}

export type LearningV2CourseSessionAudioFileInputV1 = Omit<
  LearningV2CourseSessionAudioFileV1,
  "fileFingerprint"
>;
export type LearningV2CourseSessionAudioSelectableInputV1 = Readonly<{
  selectableId: string;
  audioTargetId: string;
  wordId: string;
  wordOrdinal: number;
  visibleText: string;
  files: readonly LearningV2CourseSessionAudioFileInputV1[];
}>;
export type LearningV2CourseSessionInteractionAudioInputV1 = Readonly<{
  interactionId: string;
  taskVoiceGroupFingerprint: string;
  fullPhraseFiles: readonly LearningV2CourseSessionAudioFileInputV1[] | null;
  selectables: readonly LearningV2CourseSessionAudioSelectableInputV1[];
}>;

const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const GENERATION_RE = /^[1-9][0-9]{0,30}$/u;
const PATH_RE =
  /^learning-v2\/voice-audio\/[a-f0-9]{64}\/[a-f0-9]{64}\/[a-f0-9]{64}\/[a-f0-9]{64}\.mp3$/u;
const RESERVED = new Set(["__proto__", "prototype", "constructor"]);
const FILE_KEYS = Object.freeze([
  "voiceId",
  "objectPath",
  "contentHash",
  "objectGeneration",
  "byteSize",
  "contentType",
  "fileFingerprint",
] as const);
const SELECTABLE_KEYS = Object.freeze([
  "selectableId",
  "audioTargetId",
  "wordId",
  "wordOrdinal",
  "visibleTextHash",
  "files",
  "selectableFingerprint",
] as const);
const INTERACTION_KEYS = Object.freeze([
  "interactionId",
  "taskVoiceGroupFingerprint",
  "fullPhraseFiles",
  "selectables",
  "interactionAudioFingerprint",
] as const);
const ROOT_KEYS = Object.freeze([
  "schemaVersion",
  "courseSessionId",
  "learnerFingerprint",
  "interactions",
  "interactionCount",
  "voiceIds",
  "variantsPerAudioCoordinate",
  "selectionPolicy",
  "taskVoiceScope",
  "serverRequestPerPlayback",
  "remoteTtsFallbackDuringSession",
  "answerPayload",
  "correctnessAuthority",
  "audioByteAuthority",
  "runtimeAuthority",
  "releaseAuthority",
  "audioFingerprint",
] as const);
const handles = new WeakSet<object>();

// зачем (Ревизор 2.74): голый «audio_child_invalid» не говорил, какое задание и почему — отказ занятия не диагностировался.
// Причина и задание дописываются в сообщение (префикс прежний — потребители ищут его подстрокой) и в журнал.
function fail(reason?: string, interactionId?: string): never {
  const detail = [reason ? `reason=${reason}` : "", interactionId ? `interactionId=${interactionId}` : ""]
    .filter(Boolean)
    .join(" ");
  if (detail) console.warn(`[V2-AUDIO-CHILD] invalid ${detail}`);
  throw new Error(
    detail
      ? `learning_v2_course_session_audio_child_invalid ${detail}`
      : "learning_v2_course_session_audio_child_invalid",
  );
}

function record(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): void {
  const keys = Object.keys(value);
  if (
    keys.length !== expected.length ||
    keys.some((key) => !expected.includes(key))
  )
    fail();
}

function freeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>))
      freeze(child);
    Object.freeze(value);
  }
  return value;
}

function bodyWithoutFingerprint<T extends Record<string, unknown>>(
  value: T,
  field: keyof T,
): Omit<T, keyof T> & Record<string, unknown> {
  const body = { ...value };
  delete body[field];
  return body;
}

function exactFile(value: unknown): LearningV2CourseSessionAudioFileV1 {
  if (!record(value)) fail();
  exactKeys(value, FILE_KEYS);
  const file = value as unknown as LearningV2CourseSessionAudioFileV1;
  if (
    !V2_REQUIRED_VOICE_IDS.includes(file.voiceId) ||
    !PATH_RE.test(file.objectPath) ||
    !HASH_RE.test(file.contentHash) ||
    !file.objectPath.endsWith(`/${file.contentHash}.mp3`) ||
    !GENERATION_RE.test(file.objectGeneration) ||
    !Number.isSafeInteger(file.byteSize) ||
    file.byteSize < 1 ||
    file.byteSize > LEARNING_V2_COURSE_SESSION_AUDIO_FILE_MAX_BYTES_V1 ||
    file.contentType !== "audio/mpeg" ||
    file.fileFingerprint !==
      hashCanonicalBody(bodyWithoutFingerprint(value, "fileFingerprint"))
  )
    fail();
  return freeze({ ...file });
}

function exactVoiceFiles(
  value: unknown,
  interactionId?: string,
): LearningV2CourseSessionAudioSelectableV1["files"] {
  if (
    !Array.isArray(value) ||
    (value.length !== V2_REQUIRED_VOICE_IDS.length && value.length !== 1)
  )
    fail(`voice_file_count_${Array.isArray(value) ? value.length : "not_array"}`, interactionId);
  const files = value.map(exactFile);
  // Один файл — назначенный голос (exactFile уже проверил, что голос одобрен); четыре — строго по порядку.
  if (
    files.length === V2_REQUIRED_VOICE_IDS.length &&
    files.some((file, index) => file.voiceId !== V2_REQUIRED_VOICE_IDS[index])
  )
    fail("four_voice_order", interactionId);
  return freeze(
    files,
  ) as unknown as LearningV2CourseSessionAudioSelectableV1["files"];
}

function exactSelectable(
  value: unknown,
  interactionId?: string,
): LearningV2CourseSessionAudioSelectableV1 {
  if (!record(value)) fail("selectable_not_record", interactionId);
  exactKeys(value, SELECTABLE_KEYS);
  const selectable =
    value as unknown as LearningV2CourseSessionAudioSelectableV1;
  const files = exactVoiceFiles(selectable.files, interactionId);
  if (
    !ID_RE.test(selectable.selectableId) ||
    RESERVED.has(selectable.selectableId) ||
    !HASH_RE.test(selectable.audioTargetId) ||
    !HASH_RE.test(selectable.wordId) ||
    !Number.isSafeInteger(selectable.wordOrdinal) ||
    selectable.wordOrdinal < 1 ||
    selectable.wordOrdinal > 32 ||
    !HASH_RE.test(selectable.visibleTextHash)
  )
    fail();
  const body = { ...selectable, files };
  if (
    selectable.selectableFingerprint !==
    hashCanonicalBody(bodyWithoutFingerprint(body, "selectableFingerprint"))
  )
    fail();
  return freeze(body);
}

function exactInteraction(
  value: unknown,
): LearningV2CourseSessionInteractionAudioV1 {
  if (!record(value)) fail("interaction_not_record");
  exactKeys(value, INTERACTION_KEYS);
  const interaction =
    value as unknown as LearningV2CourseSessionInteractionAudioV1;
  const id = String(interaction.interactionId);
  const fullPhraseFiles =
    interaction.fullPhraseFiles === null
      ? null
      : exactVoiceFiles(interaction.fullPhraseFiles, id);
  if (
    !ID_RE.test(interaction.interactionId) ||
    !HASH_RE.test(interaction.taskVoiceGroupFingerprint) ||
    !Array.isArray(interaction.selectables) ||
    interaction.selectables.length > 32
  )
    fail("interaction_shape", id);
  const selectables = freeze(interaction.selectables.map((entry) => exactSelectable(entry, id)));
  const selectableIds = new Set(selectables.map((entry) => entry.selectableId));
  const wordOrdinals = new Set(selectables.map((entry) => entry.wordOrdinal));
  if (
    selectableIds.size !== selectables.length ||
    wordOrdinals.size !== selectables.length ||
    selectables.some((entry, index) => entry.wordOrdinal !== index + 1) ||
    (fullPhraseFiles === null && selectables.length === 0)
  )
    fail("selectables_shape", id);
  // Задание звучит одним голосом: все его реплики либо в четырёх голосах, либо все в одном и том же назначенном.
  const voiceFileSets = [
    ...(fullPhraseFiles ? [fullPhraseFiles] : []),
    ...selectables.map((entry) => entry.files),
  ];
  const singleVoice = voiceFileSets[0]?.length === 1;
  if (
    voiceFileSets.some((files) => (files.length === 1) !== singleVoice) ||
    (singleVoice &&
      new Set(voiceFileSets.map((files) => files[0].voiceId)).size !== 1)
  )
    fail("task_voice_mixed", id);
  const body = { ...interaction, fullPhraseFiles, selectables };
  if (
    interaction.interactionAudioFingerprint !==
    hashCanonicalBody(
      bodyWithoutFingerprint(body, "interactionAudioFingerprint"),
    )
  )
    fail("interaction_fingerprint", id);
  return freeze(body);
}

function validate(
  value: unknown,
  learner: LearningV2CourseSessionLearnerChildV1,
): LearningV2CourseSessionAudioChildV1 {
  if (!record(value)) fail();
  exactKeys(value, ROOT_KEYS);
  const candidate = value as unknown as LearningV2CourseSessionAudioChildV1;
  if (
    !isLearningV2CourseSessionLearnerChildV1(learner) ||
    candidate.schemaVersion !==
      LEARNING_V2_COURSE_SESSION_AUDIO_CHILD_SCHEMA_V1 ||
    candidate.courseSessionId !== learner.courseSessionId ||
    candidate.learnerFingerprint !== learner.learnerFingerprint ||
    !Array.isArray(candidate.interactions)
  )
    fail();
  const interactions = freeze(candidate.interactions.map(exactInteraction));
  const expected = learner.interactions.filter(
    (entry) => entry.audioTargetIds.length > 0,
  );
  if (
    interactions.length !== expected.length ||
    interactions.some(
      (entry, index) => entry.interactionId !== expected[index]?.interactionId,
    ) ||
    interactions.some((entry, index) => {
      const learnerEntry = expected[index];
      if (!learnerEntry) return true;
      const allowed = new Set(
        learnerEntry.responseOptions.map((option) => option.responseId),
      );
      return (
        entry.selectables.some(
          (selectable) =>
            !allowed.has(selectable.selectableId) ||
            selectable.visibleTextHash !==
              hashCanonicalBody(
                learnerEntry.responseOptions.find(
                  (option) => option.responseId === selectable.selectableId,
                )?.text ?? "",
              ),
        ) ||
        entry.selectables.some(
          (selectable) =>
            !learnerEntry.audioTargetIds.includes(selectable.audioTargetId),
        )
      );
    }) ||
    candidate.interactionCount !== interactions.length ||
    canonicalJsonV1(candidate.voiceIds) !==
      canonicalJsonV1(V2_REQUIRED_VOICE_IDS) ||
    candidate.variantsPerAudioCoordinate !== 4 ||
    candidate.selectionPolicy !== "local_shuffled_round_robin" ||
    candidate.taskVoiceScope !==
      "one_voice_per_interaction_for_phrase_and_words" ||
    candidate.serverRequestPerPlayback !== false ||
    candidate.remoteTtsFallbackDuringSession !== false ||
    candidate.answerPayload !== "absent_by_exact_schema" ||
    candidate.correctnessAuthority !== "none" ||
    candidate.audioByteAuthority !== "none_active_release_readback_required" ||
    candidate.runtimeAuthority !== "none_active_release_join_required" ||
    candidate.releaseAuthority !== false
  )
    fail();
  const body = { ...candidate, interactions };
  if (
    candidate.audioFingerprint !==
    hashCanonicalBody(bodyWithoutFingerprint(body, "audioFingerprint"))
  )
    fail();
  const result = freeze(body);
  handles.add(result);
  return result;
}

function withFileFingerprint(
  value: LearningV2CourseSessionAudioFileInputV1,
): LearningV2CourseSessionAudioFileV1 {
  return { ...value, fileFingerprint: hashCanonicalBody(value) };
}

export function materializeLearningV2CourseSessionAudioChildV1(
  input: Readonly<{
    learner: LearningV2CourseSessionLearnerChildV1;
    interactions: readonly LearningV2CourseSessionInteractionAudioInputV1[];
  }>,
): LearningV2CourseSessionAudioChildV1 {
  if (
    !record(input) ||
    Object.keys(input).sort().join("|") !== "interactions|learner"
  )
    fail();
  const interactions = input.interactions.map((entry) => {
    const selectables = entry.selectables.map((selectable) => {
      const body = {
        selectableId: selectable.selectableId,
        audioTargetId: selectable.audioTargetId,
        wordId: selectable.wordId,
        wordOrdinal: selectable.wordOrdinal,
        visibleTextHash: hashCanonicalBody(selectable.visibleText),
        files: selectable.files.map(withFileFingerprint),
      };
      return { ...body, selectableFingerprint: hashCanonicalBody(body) };
    });
    const body = {
      interactionId: entry.interactionId,
      taskVoiceGroupFingerprint: entry.taskVoiceGroupFingerprint,
      fullPhraseFiles: entry.fullPhraseFiles?.map(withFileFingerprint) ?? null,
      selectables,
    };
    return { ...body, interactionAudioFingerprint: hashCanonicalBody(body) };
  });
  const body = {
    schemaVersion: LEARNING_V2_COURSE_SESSION_AUDIO_CHILD_SCHEMA_V1,
    courseSessionId: input.learner.courseSessionId,
    learnerFingerprint: input.learner.learnerFingerprint,
    interactions,
    interactionCount: interactions.length,
    voiceIds: V2_REQUIRED_VOICE_IDS,
    variantsPerAudioCoordinate: 4 as const,
    selectionPolicy: "local_shuffled_round_robin" as const,
    taskVoiceScope: "one_voice_per_interaction_for_phrase_and_words" as const,
    serverRequestPerPlayback: false as const,
    remoteTtsFallbackDuringSession: false as const,
    answerPayload: "absent_by_exact_schema" as const,
    correctnessAuthority: "none" as const,
    audioByteAuthority: "none_active_release_readback_required" as const,
    runtimeAuthority: "none_active_release_join_required" as const,
    releaseAuthority: false as const,
  };
  return validate(
    { ...body, audioFingerprint: hashCanonicalBody(body) },
    input.learner,
  );
}

export function parseLearningV2CourseSessionAudioChildV1(
  raw: string,
  learner: LearningV2CourseSessionLearnerChildV1,
): LearningV2CourseSessionAudioChildV1 {
  if (
    typeof raw !== "string" ||
    raw.length > LEARNING_V2_COURSE_SESSION_AUDIO_CHILD_MAX_BYTES_V1 ||
    utf8ByteLengthV1(raw) > LEARNING_V2_COURSE_SESSION_AUDIO_CHILD_MAX_BYTES_V1
  )
    fail();
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    fail();
  }
  if (canonicalJsonV1(decoded) !== raw) fail();
  return validate(decoded, learner);
}

export function encodeLearningV2CourseSessionAudioChildV1(
  child: LearningV2CourseSessionAudioChildV1,
): string {
  if (!handles.has(child)) fail();
  const raw = canonicalJsonV1(child);
  if (
    utf8ByteLengthV1(raw) > LEARNING_V2_COURSE_SESSION_AUDIO_CHILD_MAX_BYTES_V1
  )
    fail();
  return raw;
}

export function isLearningV2CourseSessionAudioChildV1(
  value: unknown,
): value is LearningV2CourseSessionAudioChildV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}

export function selectLearningV2CourseSessionInteractionAudioV1(
  input: Readonly<{
    child: LearningV2CourseSessionAudioChildV1;
    interactionId: string;
    voiceSelectionIndex: 0 | 1 | 2 | 3;
  }>,
): Readonly<{
  interactionId: string;
  voiceId: LearningV2CourseSessionAudioVoiceIdV1;
  taskVoiceGroupFingerprint: string;
  fullPhraseFile: LearningV2CourseSessionAudioFileV1 | null;
  selectableFiles: Readonly<Record<string, LearningV2CourseSessionAudioFileV1>>;
}> {
  if (
    !record(input) ||
    Object.keys(input).sort().join("|") !==
      "child|interactionId|voiceSelectionIndex" ||
    !isLearningV2CourseSessionAudioChildV1(input.child) ||
    !ID_RE.test(input.interactionId) ||
    !Number.isSafeInteger(input.voiceSelectionIndex) ||
    input.voiceSelectionIndex < 0 ||
    input.voiceSelectionIndex > 3
  )
    fail();
  const interaction = input.child.interactions.find(
    (entry) => entry.interactionId === input.interactionId,
  );
  if (!interaction) fail();
  const selectableFiles = Object.fromEntries(
    interaction.selectables.map((entry) => [
      entry.selectableId,
      learningV2CourseSessionAudioFileForVoiceIndexV1(
        entry.files,
        input.voiceSelectionIndex,
      ),
    ]),
  );
  const fullPhraseFile = interaction.fullPhraseFiles
    ? learningV2CourseSessionAudioFileForVoiceIndexV1(
        interaction.fullPhraseFiles,
        input.voiceSelectionIndex,
      )
    : null;
  // Голос — того файла, что реально зазвучит: при четырёх голосах это голос по индексу (как раньше),
  // при назначенном — он сам, индекс не влияет.
  const voiceId =
    fullPhraseFile?.voiceId ??
    Object.values(selectableFiles)[0]?.voiceId ??
    V2_REQUIRED_VOICE_IDS[input.voiceSelectionIndex];
  return freeze({
    interactionId: interaction.interactionId,
    voiceId,
    taskVoiceGroupFingerprint: interaction.taskVoiceGroupFingerprint,
    fullPhraseFile,
    selectableFiles,
  });
}

export function learningV2CourseSessionInteractionVoiceIndexV1(
  input: Readonly<{
    sessionRunId: string;
    courseSessionId: string;
    interactionOrdinal: number;
  }>,
): 0 | 1 | 2 | 3 {
  if (
    !record(input) ||
    Object.keys(input).sort().join("|") !==
      "courseSessionId|interactionOrdinal|sessionRunId" ||
    !ID_RE.test(input.sessionRunId) ||
    !ID_RE.test(input.courseSessionId) ||
    !Number.isSafeInteger(input.interactionOrdinal) ||
    input.interactionOrdinal < 1 ||
    input.interactionOrdinal >
      LEARNING_V2_COURSE_SESSION_MAX_TOTAL_INTERACTIONS_V1
  )
    fail();
  const cycleOffset =
    Number.parseInt(
      hashCanonicalBody({
        schemaVersion: "learning-v2-course-session-voice-cycle.v1",
        sessionRunId: input.sessionRunId,
        courseSessionId: input.courseSessionId,
      }).slice(0, 8),
      16,
    ) % V2_REQUIRED_VOICE_IDS.length;
  return ((cycleOffset + input.interactionOrdinal - 1) %
    V2_REQUIRED_VOICE_IDS.length) as 0 | 1 | 2 | 3;
}
