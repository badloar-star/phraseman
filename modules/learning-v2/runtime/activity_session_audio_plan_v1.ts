import { V2_REQUIRED_VOICE_IDS } from "../contracts/voice_playback_policy_v1";
import { hashCanonicalBody } from "../policies/decision_registry";
import {
  isLearningV2ActivityAuxiliaryClientDescriptorV1,
  type LearningV2ActivityAuxiliaryClientDescriptorV1,
} from "./activity_auxiliary_client_descriptor_v1";
import type {
  LearningV2ActivityAudioRuntimeEntryV1,
  LearningV2ActivityAudioRuntimeVoiceIdV1,
} from "./activity_audio_runtime_projection_v1";

export const LEARNING_V2_ACTIVITY_SESSION_AUDIO_PLAN_SCHEMA_V1 =
  "learning-v2-activity-session-audio-plan.v1" as const;

export interface LearningV2ActivitySessionAudioPlanHandleV1 {
  readonly __opaqueLearningV2ActivitySessionAudioPlanHandleV1: unique symbol;
}

export interface LearningV2ActivitySessionAudioTaskPlanV1 {
  readonly taskId: string;
  readonly voiceId: LearningV2ActivityAudioRuntimeVoiceIdV1;
  readonly voiceSelectionIndex: 0 | 1 | 2 | 3;
  readonly fullPhraseEntryFingerprint: string | null;
  readonly selectableEntryFingerprints: Readonly<Record<string, string>>;
  readonly entryFingerprints: readonly string[];
  readonly taskPlanFingerprint: string;
}

export interface LearningV2ActivitySessionAudioPlanSummaryV1 {
  readonly schemaVersion: typeof LEARNING_V2_ACTIVITY_SESSION_AUDIO_PLAN_SCHEMA_V1;
  readonly descriptorFingerprint: string;
  readonly sessionId: string;
  readonly sessionOrdinal: number;
  readonly taskPlanCount: number;
  readonly selectedEntryCount: number;
  readonly voiceSelectionPolicy: "local_shuffled_round_robin";
  readonly taskVoiceScope: "one_voice_per_task_for_phrase_and_words";
  readonly transportDependency: "none_after_local_file_preload";
  readonly walletAuthority: "none";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
  readonly releaseAuthority: false;
  readonly planFingerprint: string;
}

type PlanMaterial = Readonly<{
  summary: LearningV2ActivitySessionAudioPlanSummaryV1;
  tasks: ReadonlyMap<string, LearningV2ActivitySessionAudioTaskPlanV1>;
  entries: ReadonlyMap<string, LearningV2ActivityAudioRuntimeEntryV1>;
}>;

const HASH_RE = /^[a-f0-9]{64}$/u;
const handles = new WeakSet<object>();
const metadata = new WeakMap<object, PlanMaterial>();

function fail(): never {
  throw new Error("learning_v2_activity_session_audio_plan_invalid");
}

function exactHandle(
  handle: LearningV2ActivitySessionAudioPlanHandleV1,
): PlanMaterial {
  const material = metadata.get(handle as object);
  if (!material || !handles.has(handle as object)) fail();
  return material;
}

function shuffledVoiceCycles(
  seed: string,
  count: number,
): readonly LearningV2ActivityAudioRuntimeVoiceIdV1[] {
  const result: LearningV2ActivityAudioRuntimeVoiceIdV1[] = [];
  let cycleOrdinal = 0;
  while (result.length < count) {
    const cycle = [...V2_REQUIRED_VOICE_IDS].sort((left, right) => {
      const leftHash = hashCanonicalBody({
        schemaVersion: "learning-v2-activity-voice-shuffle-key.v1",
        seed,
        cycleOrdinal,
        voiceId: left,
      });
      const rightHash = hashCanonicalBody({
        schemaVersion: "learning-v2-activity-voice-shuffle-key.v1",
        seed,
        cycleOrdinal,
        voiceId: right,
      });
      return leftHash < rightHash ? -1 : leftHash > rightHash ? 1 : 0;
    });
    const previous = result.at(-1);
    if (previous && cycle[0] === previous) cycle.push(cycle.shift()!);
    result.push(...cycle);
    cycleOrdinal += 1;
  }
  return Object.freeze(result.slice(0, count));
}

function freezeRecord<T>(
  value: Record<string, T>,
): Readonly<Record<string, T>> {
  return Object.freeze({ ...value });
}

export function materializeLearningV2ActivitySessionAudioPlanV1(
  input: Readonly<{
    descriptor: LearningV2ActivityAuxiliaryClientDescriptorV1;
    selectionSeed: string;
  }>,
): LearningV2ActivitySessionAudioPlanHandleV1 {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    Object.keys(input).sort().join("|") !== "descriptor|selectionSeed" ||
    !isLearningV2ActivityAuxiliaryClientDescriptorV1(input.descriptor) ||
    !HASH_RE.test(input.selectionSeed)
  )
    fail();

  const descriptor = input.descriptor;
  const audio = descriptor.audioRuntime;
  const actionTaskIds = descriptor.actionResource.entries.map(
    (entry) => entry.taskId,
  );
  const taskIds = actionTaskIds.filter((taskId) =>
    audio.entries.some((entry) => entry.taskId === taskId),
  );
  const selectedVoices = shuffledVoiceCycles(
    input.selectionSeed,
    taskIds.length,
  );
  const taskPlans = new Map<string, LearningV2ActivitySessionAudioTaskPlanV1>();
  const selectedEntries = new Map<
    string,
    LearningV2ActivityAudioRuntimeEntryV1
  >();

  taskIds.forEach((taskId, taskIndex) => {
    const voiceId = selectedVoices[taskIndex];
    const voiceSelectionIndex = V2_REQUIRED_VOICE_IDS.indexOf(voiceId) as
      | 0
      | 1
      | 2
      | 3;
    const taskEntries = audio.entries.filter(
      (entry) => entry.taskId === taskId && entry.voiceId === voiceId,
    );
    if (taskEntries.length < 1) fail();
    const group = new Set(
      taskEntries.map((entry) => entry.taskVoiceGroupFingerprint),
    );
    if (group.size !== 1) fail();
    for (const entry of taskEntries) {
      if (selectedEntries.has(entry.entryFingerprint)) fail();
      selectedEntries.set(entry.entryFingerprint, entry);
    }

    const selectableEntryFingerprints: Record<string, string> = {};
    for (const binding of audio.selectableBindings.filter(
      (candidate) => candidate.taskId === taskId,
    )) {
      const entry = taskEntries.find(
        (candidate) =>
          candidate.inputKind === "word" &&
          candidate.audioTargetId === binding.audioTargetId &&
          candidate.wordId === binding.wordId &&
          candidate.wordOrdinal === binding.wordOrdinal,
      );
      if (!entry || selectableEntryFingerprints[binding.selectableId]) fail();
      selectableEntryFingerprints[binding.selectableId] =
        entry.entryFingerprint;
    }

    const fullTargets = new Map<
      string,
      LearningV2ActivityAudioRuntimeEntryV1
    >();
    for (const entry of taskEntries) {
      if (entry.inputKind === "full_utterance")
        fullTargets.set(entry.audioTargetId, entry);
    }
    const fullPhraseEntryFingerprint =
      fullTargets.size === 1
        ? [...fullTargets.values()][0].entryFingerprint
        : null;
    const taskBody = {
      taskId,
      voiceId,
      voiceSelectionIndex,
      fullPhraseEntryFingerprint,
      selectableEntryFingerprints: freezeRecord(selectableEntryFingerprints),
      entryFingerprints: Object.freeze(
        taskEntries.map((entry) => entry.entryFingerprint),
      ),
    };
    taskPlans.set(
      taskId,
      Object.freeze({
        ...taskBody,
        taskPlanFingerprint: hashCanonicalBody(taskBody),
      }),
    );
  });

  const body = {
    schemaVersion: LEARNING_V2_ACTIVITY_SESSION_AUDIO_PLAN_SCHEMA_V1,
    descriptorFingerprint: descriptor.descriptorFingerprint,
    sessionId: descriptor.sessionId,
    sessionOrdinal: descriptor.sessionOrdinal,
    taskPlanCount: taskPlans.size,
    selectedEntryCount: selectedEntries.size,
    voiceSelectionPolicy: "local_shuffled_round_robin" as const,
    taskVoiceScope: "one_voice_per_task_for_phrase_and_words" as const,
    transportDependency: "none_after_local_file_preload" as const,
    walletAuthority: "none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    releaseAuthority: false as const,
  };
  const summary = Object.freeze({
    ...body,
    planFingerprint: hashCanonicalBody({
      ...body,
      taskPlans: [...taskPlans.values()].map(
        (task) => task.taskPlanFingerprint,
      ),
      selectedEntries: [...selectedEntries.values()].map(
        (entry) => entry.entryFingerprint,
      ),
    }),
  });
  const handle = Object.freeze(
    {},
  ) as LearningV2ActivitySessionAudioPlanHandleV1;
  handles.add(handle);
  metadata.set(
    handle,
    Object.freeze({ summary, tasks: taskPlans, entries: selectedEntries }),
  );
  return handle;
}

export function isLearningV2ActivitySessionAudioPlanHandleV1(
  value: unknown,
): value is LearningV2ActivitySessionAudioPlanHandleV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}

export function getLearningV2ActivitySessionAudioPlanSummaryV1(
  handle: LearningV2ActivitySessionAudioPlanHandleV1,
): LearningV2ActivitySessionAudioPlanSummaryV1 {
  return exactHandle(handle).summary;
}

export function getLearningV2ActivitySessionAudioPlanEntriesV1(
  handle: LearningV2ActivitySessionAudioPlanHandleV1,
): readonly LearningV2ActivityAudioRuntimeEntryV1[] {
  return Object.freeze([...exactHandle(handle).entries.values()]);
}

export function getLearningV2ActivitySessionAudioTaskPlanV1(
  handle: LearningV2ActivitySessionAudioPlanHandleV1,
  taskId: string,
): LearningV2ActivitySessionAudioTaskPlanV1 | null {
  if (typeof taskId !== "string") fail();
  return exactHandle(handle).tasks.get(taskId) ?? null;
}

export function resolveLearningV2ActivitySessionAudioEntryV1(
  handle: LearningV2ActivitySessionAudioPlanHandleV1,
  entryFingerprint: string,
): LearningV2ActivityAudioRuntimeEntryV1 {
  if (!HASH_RE.test(entryFingerprint)) fail();
  const entry = exactHandle(handle).entries.get(entryFingerprint);
  if (!entry) fail();
  return entry;
}
