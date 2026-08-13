import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../policies/decision_registry";
import { V2_REQUIRED_VOICE_IDS } from "../contracts/voice_playback_policy_v1";

export const LEARNING_V2_ACTIVITY_AUDIO_RUNTIME_PROJECTION_SCHEMA_V1 =
  "learning-v2-activity-audio-runtime-projection.v1" as const;
export const LEARNING_V2_ACTIVITY_AUDIO_RUNTIME_PROJECTION_MAX_BYTES_V1 =
  4 * 1024 * 1024;
export const LEARNING_V2_ACTIVITY_AUDIO_RUNTIME_ENTRY_MAX_COUNT_V1 = 4_096;

export type LearningV2ActivityAudioRuntimeVoiceIdV1 =
  (typeof V2_REQUIRED_VOICE_IDS)[number];

export interface LearningV2ActivityAudioRuntimeEntryV1 {
  readonly generationTargetFingerprint: string;
  readonly itemFingerprint: string;
  readonly taskId: string;
  readonly taskVoiceGroupFingerprint: string;
  readonly audioTargetId: string;
  readonly inputKind: "full_utterance" | "word";
  readonly wordId: string | null;
  readonly wordOrdinal: number | null;
  readonly voiceId: LearningV2ActivityAudioRuntimeVoiceIdV1;
  readonly objectPath: string;
  readonly contentHash: string;
  readonly objectGeneration: string;
  readonly byteSize: number;
  readonly contentType: "audio/mpeg";
  readonly codecRulesFingerprint: string;
  readonly codecResultFingerprint: string;
  readonly entryFingerprint: string;
}

export interface LearningV2ActivityAudioSelectableBindingV1 {
  readonly taskId: string;
  readonly taskVoiceGroupFingerprint: string;
  readonly selectableId: string;
  readonly audioTargetId: string;
  readonly wordId: string;
  readonly wordOrdinal: number;
  readonly bindingFingerprint: string;
}

export interface LearningV2ActivityAudioRuntimeProjectionV1 {
  readonly schemaVersion: typeof LEARNING_V2_ACTIVITY_AUDIO_RUNTIME_PROJECTION_SCHEMA_V1;
  readonly episodeId: string;
  readonly sessionId: string;
  readonly sessionOrdinal: number;
  readonly voiceAudioManifestFingerprint: string;
  readonly sourceSessionManifestFingerprint: string;
  readonly activityAudioCatalogFingerprint: string;
  readonly voiceTargetsPackageFingerprint: string;
  readonly entryCount: number;
  readonly entries: readonly LearningV2ActivityAudioRuntimeEntryV1[];
  readonly selectableBindingCount: number;
  readonly selectableBindings: readonly LearningV2ActivityAudioSelectableBindingV1[];
  readonly orderedEntryAggregateFingerprint: string;
  readonly voiceCoverage: "exact_ash_onyx_nova_coral_per_audio_coordinate";
  readonly taskVoiceSelectionScope: "once_per_task_attempt";
  readonly storagePinAuthority: "unverified_serialized_manifest_projection";
  readonly runtimeAuthority: "none_release_binding_required";
  readonly walletAuthority: "none";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
  readonly publicationAuthority: "none";
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly projectionFingerprint: string;
}

export interface LearningV2ActivityAttemptAudioBindingV1 {
  readonly schemaVersion: "learning-v2-activity-attempt-audio-binding.v1";
  readonly taskId: string;
  readonly voiceId: LearningV2ActivityAudioRuntimeVoiceIdV1;
  readonly voiceSelectionIndex: 0 | 1 | 2 | 3;
  readonly fullPhraseAudioTargetId: string | null;
  readonly selectableAudioTargets: Readonly<
    Record<string, Readonly<{ audioTargetId: string; wordId: string }>>
  >;
  readonly sourceProjectionFingerprint: string;
  readonly runtimeAuthority: "none_release_binding_required";
  readonly bindingFingerprint: string;
}

const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const GENERATION_RE = /^[1-9][0-9]{0,30}$/u;
const AUDIO_PATH_RE =
  /^learning-v2\/voice-audio\/[a-f0-9]{64}\/[a-f0-9]{64}\/[a-f0-9]{64}\/[a-f0-9]{64}\.mp3$/u;
const RESERVED_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const ENTRY_KEYS = Object.freeze([
  "generationTargetFingerprint",
  "itemFingerprint",
  "taskId",
  "taskVoiceGroupFingerprint",
  "audioTargetId",
  "inputKind",
  "wordId",
  "wordOrdinal",
  "voiceId",
  "objectPath",
  "contentHash",
  "objectGeneration",
  "byteSize",
  "contentType",
  "codecRulesFingerprint",
  "codecResultFingerprint",
  "entryFingerprint",
] as const);
const PROJECTION_KEYS = Object.freeze([
  "schemaVersion",
  "episodeId",
  "sessionId",
  "sessionOrdinal",
  "voiceAudioManifestFingerprint",
  "sourceSessionManifestFingerprint",
  "activityAudioCatalogFingerprint",
  "voiceTargetsPackageFingerprint",
  "entryCount",
  "entries",
  "selectableBindingCount",
  "selectableBindings",
  "orderedEntryAggregateFingerprint",
  "voiceCoverage",
  "taskVoiceSelectionScope",
  "storagePinAuthority",
  "runtimeAuthority",
  "walletAuthority",
  "masteryAuthority",
  "evidenceAuthority",
  "publicationAuthority",
  "releaseEligible",
  "releaseAuthority",
  "projectionFingerprint",
] as const);
const SELECTABLE_BINDING_KEYS = Object.freeze([
  "taskId",
  "taskVoiceGroupFingerprint",
  "selectableId",
  "audioTargetId",
  "wordId",
  "wordOrdinal",
  "bindingFingerprint",
] as const);
const projectionHandles = new WeakSet<object>();
const attemptAudioBindingHandles = new WeakSet<object>();

function fail(): never {
  throw new Error("learning_v2_activity_audio_runtime_projection_invalid");
}

function isRecord(value: unknown): value is Record<string, unknown> {
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
): boolean {
  const keys = Object.keys(value);
  return (
    keys.length === expected.length &&
    keys.every((key) => expected.includes(key))
  );
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>))
      deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function preflightJson(root: unknown): void {
  const stack: { value: unknown; depth: number }[] = [
    { value: root, depth: 0 },
  ];
  let nodes = 0;
  let strings = 0;
  while (stack.length > 0) {
    const current = stack.pop()!;
    nodes += 1;
    if (nodes > 40_000 || current.depth > 16) fail();
    if (typeof current.value === "string") {
      strings += current.value.length;
      if (
        strings > LEARNING_V2_ACTIVITY_AUDIO_RUNTIME_PROJECTION_MAX_BYTES_V1 ||
        current.value !== current.value.normalize("NFC")
      )
        fail();
      continue;
    }
    if (typeof current.value === "number") {
      if (
        !Number.isFinite(current.value) ||
        Object.is(current.value, -0) ||
        (Number.isInteger(current.value) &&
          !Number.isSafeInteger(current.value))
      )
        fail();
      continue;
    }
    if (current.value === null || typeof current.value !== "object") continue;
    if (Array.isArray(current.value)) {
      if (
        current.value.length >
        LEARNING_V2_ACTIVITY_AUDIO_RUNTIME_ENTRY_MAX_COUNT_V1
      )
        fail();
      for (let index = current.value.length - 1; index >= 0; index -= 1)
        stack.push({ value: current.value[index], depth: current.depth + 1 });
      continue;
    }
    if (!isRecord(current.value)) fail();
    const keys = Object.keys(current.value);
    if (
      keys.length > 24 ||
      keys.some(
        (key) =>
          RESERVED_KEYS.has(key) ||
          key !== key.normalize("NFC") ||
          key.length > 100,
      )
    )
      fail();
    for (let index = keys.length - 1; index >= 0; index -= 1)
      stack.push({
        value: current.value[keys[index]],
        depth: current.depth + 1,
      });
  }
}

function entryBody(value: LearningV2ActivityAudioRuntimeEntryV1) {
  const { entryFingerprint: _ignored, ...body } = value;
  return body;
}

function exactEntry(value: unknown): LearningV2ActivityAudioRuntimeEntryV1 {
  if (!isRecord(value) || !exactKeys(value, ENTRY_KEYS)) fail();
  const result = value as unknown as LearningV2ActivityAudioRuntimeEntryV1;
  const wordShapeValid =
    result.inputKind === "full_utterance"
      ? result.wordId === null && result.wordOrdinal === null
      : result.inputKind === "word" &&
        typeof result.wordId === "string" &&
        HASH_RE.test(result.wordId) &&
        Number.isSafeInteger(result.wordOrdinal) &&
        Number(result.wordOrdinal) >= 1 &&
        Number(result.wordOrdinal) <= 12;
  if (
    !HASH_RE.test(result.generationTargetFingerprint) ||
    !HASH_RE.test(result.itemFingerprint) ||
    !ID_RE.test(result.taskId) ||
    !HASH_RE.test(result.taskVoiceGroupFingerprint) ||
    !HASH_RE.test(result.audioTargetId) ||
    !wordShapeValid ||
    !V2_REQUIRED_VOICE_IDS.includes(result.voiceId) ||
    typeof result.objectPath !== "string" ||
    !AUDIO_PATH_RE.test(result.objectPath) ||
    !HASH_RE.test(result.contentHash) ||
    !result.objectPath.endsWith(`/${result.contentHash}.mp3`) ||
    !GENERATION_RE.test(result.objectGeneration) ||
    !Number.isSafeInteger(result.byteSize) ||
    result.byteSize < 1 ||
    result.byteSize > 64 * 1024 ||
    result.contentType !== "audio/mpeg" ||
    !HASH_RE.test(result.codecRulesFingerprint) ||
    !HASH_RE.test(result.codecResultFingerprint) ||
    result.entryFingerprint !== hashCanonicalBody(entryBody(result))
  )
    fail();
  return deepFreeze({ ...result });
}

function coordinate(entry: LearningV2ActivityAudioRuntimeEntryV1): string {
  return hashCanonicalBody({
    schemaVersion: "learning-v2-activity-audio-runtime-coordinate.v1",
    taskId: entry.taskId,
    taskVoiceGroupFingerprint: entry.taskVoiceGroupFingerprint,
    audioTargetId: entry.audioTargetId,
    inputKind: entry.inputKind,
    wordId: entry.wordId,
    wordOrdinal: entry.wordOrdinal,
  });
}

function selectableBindingBody(
  value: LearningV2ActivityAudioSelectableBindingV1,
) {
  const { bindingFingerprint: _ignored, ...body } = value;
  return body;
}

function exactSelectableBinding(
  value: unknown,
): LearningV2ActivityAudioSelectableBindingV1 {
  if (!isRecord(value) || !exactKeys(value, SELECTABLE_BINDING_KEYS)) fail();
  const result = value as unknown as LearningV2ActivityAudioSelectableBindingV1;
  if (
    !ID_RE.test(result.taskId) ||
    !HASH_RE.test(result.taskVoiceGroupFingerprint) ||
    !ID_RE.test(result.selectableId) ||
    RESERVED_KEYS.has(result.selectableId) ||
    !HASH_RE.test(result.audioTargetId) ||
    !HASH_RE.test(result.wordId) ||
    !Number.isSafeInteger(result.wordOrdinal) ||
    result.wordOrdinal < 1 ||
    result.wordOrdinal > 12 ||
    result.bindingFingerprint !==
      hashCanonicalBody(selectableBindingBody(result))
  )
    fail();
  return deepFreeze({ ...result });
}

function validateCoverage(
  entries: readonly LearningV2ActivityAudioRuntimeEntryV1[],
): void {
  const fingerprints = new Set<string>();
  const generationTargets = new Set<string>();
  const voicesByCoordinate = new Map<string, Set<string>>();
  const targetGroups = new Map<
    string,
    Readonly<{
      taskId: string;
      taskVoiceGroupFingerprint: string;
      fullUtteranceCount: number;
      wordCoordinates: Map<number, string>;
    }>
  >();
  for (const entry of entries) {
    if (
      fingerprints.has(entry.entryFingerprint) ||
      generationTargets.has(entry.generationTargetFingerprint)
    )
      fail();
    fingerprints.add(entry.entryFingerprint);
    generationTargets.add(entry.generationTargetFingerprint);
    const key = coordinate(entry);
    const voices = voicesByCoordinate.get(key) ?? new Set<string>();
    if (voices.has(entry.voiceId)) fail();
    voices.add(entry.voiceId);
    voicesByCoordinate.set(key, voices);
    const current = targetGroups.get(entry.audioTargetId);
    if (
      current &&
      (current.taskId !== entry.taskId ||
        current.taskVoiceGroupFingerprint !== entry.taskVoiceGroupFingerprint)
    )
      fail();
    const group =
      current ??
      Object.freeze({
        taskId: entry.taskId,
        taskVoiceGroupFingerprint: entry.taskVoiceGroupFingerprint,
        fullUtteranceCount: 0,
        wordCoordinates: new Map<number, string>(),
      });
    if (entry.inputKind === "full_utterance") {
      targetGroups.set(
        entry.audioTargetId,
        Object.freeze({
          ...group,
          fullUtteranceCount: group.fullUtteranceCount + 1,
        }),
      );
    } else {
      const ordinal = entry.wordOrdinal as number;
      const priorWordId = group.wordCoordinates.get(ordinal);
      if (priorWordId !== undefined && priorWordId !== entry.wordId) fail();
      group.wordCoordinates.set(ordinal, entry.wordId as string);
      targetGroups.set(entry.audioTargetId, group);
    }
  }
  if (
    voicesByCoordinate.size < 1 ||
    [...voicesByCoordinate.values()].some(
      (voices) =>
        voices.size !== V2_REQUIRED_VOICE_IDS.length ||
        V2_REQUIRED_VOICE_IDS.some((voice) => !voices.has(voice)),
    )
  )
    fail();
  for (const group of targetGroups.values()) {
    const ordinals = [...group.wordCoordinates.keys()].sort(
      (left, right) => left - right,
    );
    if (
      group.fullUtteranceCount !== V2_REQUIRED_VOICE_IDS.length ||
      ordinals.length < 1 ||
      ordinals.some((ordinal, index) => ordinal !== index + 1)
    )
      fail();
  }
}

function bodyWithoutFingerprint(
  value: LearningV2ActivityAudioRuntimeProjectionV1,
) {
  const { projectionFingerprint: _ignored, ...body } = value;
  return body;
}

export function materializeLearningV2ActivityAudioRuntimeProjectionV1(
  input: Omit<
    LearningV2ActivityAudioRuntimeProjectionV1,
    | "schemaVersion"
    | "entryCount"
    | "selectableBindingCount"
    | "orderedEntryAggregateFingerprint"
    | "voiceCoverage"
    | "taskVoiceSelectionScope"
    | "storagePinAuthority"
    | "runtimeAuthority"
    | "walletAuthority"
    | "masteryAuthority"
    | "evidenceAuthority"
    | "publicationAuthority"
    | "releaseEligible"
    | "releaseAuthority"
    | "projectionFingerprint"
  >,
): LearningV2ActivityAudioRuntimeProjectionV1 {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    Object.keys(input).sort().join("|") !==
      [
        "activityAudioCatalogFingerprint",
        "entries",
        "episodeId",
        "selectableBindings",
        "sessionId",
        "sessionOrdinal",
        "sourceSessionManifestFingerprint",
        "voiceAudioManifestFingerprint",
        "voiceTargetsPackageFingerprint",
      ]
        .sort()
        .join("|") ||
    !ID_RE.test(input.episodeId) ||
    !ID_RE.test(input.sessionId) ||
    !Number.isSafeInteger(input.sessionOrdinal) ||
    input.sessionOrdinal < 1 ||
    input.sessionOrdinal > 12 ||
    !HASH_RE.test(input.voiceAudioManifestFingerprint) ||
    !HASH_RE.test(input.sourceSessionManifestFingerprint) ||
    !HASH_RE.test(input.activityAudioCatalogFingerprint) ||
    !HASH_RE.test(input.voiceTargetsPackageFingerprint) ||
    !Array.isArray(input.entries) ||
    input.entries.length < 4 ||
    input.entries.length >
      LEARNING_V2_ACTIVITY_AUDIO_RUNTIME_ENTRY_MAX_COUNT_V1 ||
    !Array.isArray(input.selectableBindings) ||
    input.selectableBindings.length > 864
  )
    fail();
  const entries = Object.freeze(input.entries.map(exactEntry));
  validateCoverage(entries);
  const selectableBindings = Object.freeze(
    input.selectableBindings.map(exactSelectableBinding),
  );
  const bindingFingerprints = new Set<string>();
  const selectableCoordinates = new Set<string>();
  for (const binding of selectableBindings) {
    const coordinateKey = hashCanonicalBody({
      taskId: binding.taskId,
      selectableId: binding.selectableId,
    });
    if (
      bindingFingerprints.has(binding.bindingFingerprint) ||
      selectableCoordinates.has(coordinateKey) ||
      !entries.some(
        (entry) =>
          entry.taskId === binding.taskId &&
          entry.taskVoiceGroupFingerprint ===
            binding.taskVoiceGroupFingerprint &&
          entry.audioTargetId === binding.audioTargetId &&
          entry.inputKind === "word" &&
          entry.wordId === binding.wordId &&
          entry.wordOrdinal === binding.wordOrdinal,
      )
    )
      fail();
    bindingFingerprints.add(binding.bindingFingerprint);
    selectableCoordinates.add(coordinateKey);
  }
  const body = {
    schemaVersion: LEARNING_V2_ACTIVITY_AUDIO_RUNTIME_PROJECTION_SCHEMA_V1,
    episodeId: input.episodeId,
    sessionId: input.sessionId,
    sessionOrdinal: input.sessionOrdinal,
    voiceAudioManifestFingerprint: input.voiceAudioManifestFingerprint,
    sourceSessionManifestFingerprint: input.sourceSessionManifestFingerprint,
    activityAudioCatalogFingerprint: input.activityAudioCatalogFingerprint,
    voiceTargetsPackageFingerprint: input.voiceTargetsPackageFingerprint,
    entryCount: entries.length,
    entries,
    selectableBindingCount: selectableBindings.length,
    selectableBindings,
    orderedEntryAggregateFingerprint: hashCanonicalBody(
      entries.map((entry) => entry.entryFingerprint),
    ),
    voiceCoverage: "exact_ash_onyx_nova_coral_per_audio_coordinate" as const,
    taskVoiceSelectionScope: "once_per_task_attempt" as const,
    storagePinAuthority: "unverified_serialized_manifest_projection" as const,
    runtimeAuthority: "none_release_binding_required" as const,
    walletAuthority: "none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    publicationAuthority: "none" as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  };
  const result = deepFreeze({
    ...body,
    projectionFingerprint: hashCanonicalBody(body),
  });
  if (
    utf8ByteLengthV1(canonicalJsonV1(result)) >
    LEARNING_V2_ACTIVITY_AUDIO_RUNTIME_PROJECTION_MAX_BYTES_V1
  )
    fail();
  projectionHandles.add(result);
  return result;
}

export function encodeLearningV2ActivityAudioRuntimeProjectionV1(
  projection: LearningV2ActivityAudioRuntimeProjectionV1,
): string {
  if (!isLearningV2ActivityAudioRuntimeProjectionV1(projection)) fail();
  return canonicalJsonV1(projection);
}

export function parseLearningV2ActivityAudioRuntimeProjectionV1(
  raw: string,
): LearningV2ActivityAudioRuntimeProjectionV1 {
  if (
    typeof raw !== "string" ||
    raw.length > LEARNING_V2_ACTIVITY_AUDIO_RUNTIME_PROJECTION_MAX_BYTES_V1 ||
    utf8ByteLengthV1(raw) >
      LEARNING_V2_ACTIVITY_AUDIO_RUNTIME_PROJECTION_MAX_BYTES_V1
  )
    fail();
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    fail();
  }
  preflightJson(value);
  if (
    !isRecord(value) ||
    !exactKeys(value, PROJECTION_KEYS) ||
    canonicalJsonV1(value) !== raw
  )
    fail();
  const candidate =
    value as unknown as LearningV2ActivityAudioRuntimeProjectionV1;
  const rebuilt = materializeLearningV2ActivityAudioRuntimeProjectionV1({
    episodeId: candidate.episodeId,
    sessionId: candidate.sessionId,
    sessionOrdinal: candidate.sessionOrdinal,
    voiceAudioManifestFingerprint: candidate.voiceAudioManifestFingerprint,
    sourceSessionManifestFingerprint:
      candidate.sourceSessionManifestFingerprint,
    activityAudioCatalogFingerprint: candidate.activityAudioCatalogFingerprint,
    voiceTargetsPackageFingerprint: candidate.voiceTargetsPackageFingerprint,
    entries: candidate.entries,
    selectableBindings: candidate.selectableBindings,
  });
  if (
    canonicalJsonV1(rebuilt) !== raw ||
    candidate.projectionFingerprint !==
      hashCanonicalBody(bodyWithoutFingerprint(candidate))
  )
    fail();
  return rebuilt;
}

export function isLearningV2ActivityAudioRuntimeProjectionV1(
  value: unknown,
): value is LearningV2ActivityAudioRuntimeProjectionV1 {
  return (
    typeof value === "object" && value !== null && projectionHandles.has(value)
  );
}

export function selectLearningV2ActivityTaskAudioV1(
  input: Readonly<{
    projection: LearningV2ActivityAudioRuntimeProjectionV1;
    taskId: string;
    voiceId: LearningV2ActivityAudioRuntimeVoiceIdV1;
  }>,
): readonly LearningV2ActivityAudioRuntimeEntryV1[] {
  if (
    !isLearningV2ActivityAudioRuntimeProjectionV1(input.projection) ||
    !ID_RE.test(input.taskId) ||
    !V2_REQUIRED_VOICE_IDS.includes(input.voiceId)
  )
    fail();
  const entries = input.projection.entries.filter(
    (entry) => entry.taskId === input.taskId && entry.voiceId === input.voiceId,
  );
  if (entries.length < 1) fail();
  const groupFingerprints = new Set(
    entries.map((entry) => entry.taskVoiceGroupFingerprint),
  );
  if (groupFingerprints.size !== 1) fail();
  return Object.freeze(entries);
}

export function getLearningV2ActivitySelectableAudioBindingsV1(
  projection: LearningV2ActivityAudioRuntimeProjectionV1,
  taskId: string,
): readonly LearningV2ActivityAudioSelectableBindingV1[] {
  if (
    !isLearningV2ActivityAudioRuntimeProjectionV1(projection) ||
    !ID_RE.test(taskId)
  )
    fail();
  const bindings = projection.selectableBindings.filter(
    (binding) => binding.taskId === taskId,
  );
  if (bindings.length < 1) fail();
  return Object.freeze(bindings);
}

export function bindLearningV2ActivityAttemptAudioV1(
  input: Readonly<{
    projection: LearningV2ActivityAudioRuntimeProjectionV1;
    taskId: string;
    voiceSelectionIndex: 0 | 1 | 2 | 3;
    fullPhraseAudioTargetId: string | null;
  }>,
): LearningV2ActivityAttemptAudioBindingV1 {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    Object.keys(input).sort().join("|") !==
      "fullPhraseAudioTargetId|projection|taskId|voiceSelectionIndex" ||
    !isLearningV2ActivityAudioRuntimeProjectionV1(input.projection) ||
    !ID_RE.test(input.taskId) ||
    !Number.isSafeInteger(input.voiceSelectionIndex) ||
    input.voiceSelectionIndex < 0 ||
    input.voiceSelectionIndex > 3 ||
    (input.fullPhraseAudioTargetId !== null &&
      !HASH_RE.test(input.fullPhraseAudioTargetId))
  )
    fail();
  const voiceId = V2_REQUIRED_VOICE_IDS[input.voiceSelectionIndex];
  const taskEntries = selectLearningV2ActivityTaskAudioV1({
    projection: input.projection,
    taskId: input.taskId,
    voiceId,
  });
  const bindings = getLearningV2ActivitySelectableAudioBindingsV1(
    input.projection,
    input.taskId,
  );
  const selectableAudioTargets: Record<
    string,
    Readonly<{ audioTargetId: string; wordId: string }>
  > = {};
  for (const binding of bindings) {
    if (
      !taskEntries.some(
        (entry) =>
          entry.inputKind === "word" &&
          entry.audioTargetId === binding.audioTargetId &&
          entry.wordId === binding.wordId &&
          entry.voiceId === voiceId,
      )
    )
      fail();
    selectableAudioTargets[binding.selectableId] = Object.freeze({
      audioTargetId: binding.audioTargetId,
      wordId: binding.wordId,
    });
  }
  if (
    input.fullPhraseAudioTargetId !== null &&
    !taskEntries.some(
      (entry) =>
        entry.inputKind === "full_utterance" &&
        entry.audioTargetId === input.fullPhraseAudioTargetId &&
        entry.voiceId === voiceId,
    )
  )
    fail();
  const body = {
    schemaVersion: "learning-v2-activity-attempt-audio-binding.v1" as const,
    taskId: input.taskId,
    voiceId,
    voiceSelectionIndex: input.voiceSelectionIndex,
    fullPhraseAudioTargetId: input.fullPhraseAudioTargetId,
    selectableAudioTargets: deepFreeze(selectableAudioTargets),
    sourceProjectionFingerprint: input.projection.projectionFingerprint,
    runtimeAuthority: "none_release_binding_required" as const,
  };
  const result = deepFreeze({
    ...body,
    bindingFingerprint: hashCanonicalBody(body),
  });
  attemptAudioBindingHandles.add(result);
  return result;
}

export function isLearningV2ActivityAttemptAudioBindingV1(
  value: unknown,
): value is LearningV2ActivityAttemptAudioBindingV1 {
  return (
    typeof value === "object" &&
    value !== null &&
    attemptAudioBindingHandles.has(value)
  );
}
