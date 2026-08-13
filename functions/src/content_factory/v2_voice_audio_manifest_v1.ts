import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import { v2FirebaseVoiceAudioObjectPathV1 } from "./v2_firebase_voice_audio_persistence_v1";
import type { V2CanonicalSeasonPlanV2 } from "./v2_canonical_generation_plan_v2";
import {
  resolveV2FirebaseVoiceAudioBatchMaterialV1,
  type V2FirebaseVoiceAudioBatchHandleV1,
  type V2FirebaseVoiceAudioObjectV1,
} from "./v2_firebase_voice_audio_persistence_v1";
import {
  resolveV2VoiceTtsWorkOrderMaterialV1,
  type V2VoiceTtsWorkOrderHandleV1,
} from "./v2_voice_tts_work_order_v1";

export const V2_VOICE_AUDIO_MANIFEST_SCHEMA_V1 =
  "v2-voice-audio-manifest.v1" as const;
export const V2_VOICE_AUDIO_SESSION_MANIFEST_SCHEMA_V1 =
  "v2-voice-audio-session-manifest.v1" as const;
export const V2_VOICE_AUDIO_MANIFEST_MAX_BYTES_V1 = 4 * 1024 * 1024;
export const V2_VOICE_AUDIO_SESSION_MANIFEST_MAX_BYTES_V1 = 2 * 1024 * 1024;
export const V2_VOICE_AUDIO_MANIFEST_MAX_OBJECTS_V1 = 44_928;

export interface V2VoiceAudioManifestEntryV1 {
  readonly generationTargetFingerprint: string;
  readonly itemFingerprint: string;
  readonly taskId: string;
  readonly taskVoiceGroupFingerprint: string;
  readonly audioTargetId: string;
  readonly inputKind: "full_utterance" | "word";
  readonly wordId: string | null;
  readonly wordOrdinal: number | null;
  readonly voiceId: "ash" | "onyx" | "nova" | "coral";
  readonly objectPath: string;
  readonly contentHash: string;
  readonly objectGeneration: string;
  readonly byteSize: number;
  readonly contentType: "audio/mpeg";
  readonly codecRulesFingerprint: string;
  readonly codecResultFingerprint: string;
  readonly entryFingerprint: string;
}

export interface V2VoiceAudioSessionManifestV1 {
  readonly schemaVersion: typeof V2_VOICE_AUDIO_SESSION_MANIFEST_SCHEMA_V1;
  readonly sessionOrdinal: number;
  readonly sessionId: string;
  readonly itemCount: number;
  readonly totalBytes: number;
  readonly entries: readonly V2VoiceAudioManifestEntryV1[];
  readonly storageEvidence: "unverified_serialized_pins";
  readonly listeningEvidenceAuthority: "none";
  readonly deviceEvidenceAuthority: "none";
  readonly sessionManifestFingerprint: string;
}

export interface V2VoiceAudioManifestV1 {
  readonly schemaVersion: typeof V2_VOICE_AUDIO_MANIFEST_SCHEMA_V1;
  readonly planFingerprint: string;
  readonly stageId: string;
  readonly episodeId: string;
  readonly candidateFingerprint: string;
  readonly packageFingerprint: string;
  readonly workOrderFingerprint: string;
  readonly profileObservationAggregateFingerprint: string;
  readonly sessionCount: 12;
  readonly generationTargetCount: number;
  readonly audioObjectCount: number;
  readonly totalAudioBytes: number;
  readonly sessionManifests: readonly V2VoiceAudioSessionManifestV1[];
  readonly orderedSessionAggregateFingerprint: string;
  readonly repositoryOriginAuthority: "none";
  readonly profileLifecycleAuthority: "none";
  readonly providerExecutionAuthority: "none";
  readonly audioByteAuthority: "none";
  readonly artifactStorageAuthority: "none";
  readonly listeningEvidenceAuthority: "none";
  readonly deviceEvidenceAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly manifestFingerprint: string;
}

const manifestHandles = new WeakSet<object>();
const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const GENERATION_RE = /^[1-9][0-9]{0,30}$/u;
const VOICE_IDS = new Set(["ash", "onyx", "nova", "coral"]);
const RESERVED = new Set(["__proto__", "prototype", "constructor"]);

const MANIFEST_KEYS = Object.freeze([
  "schemaVersion",
  "planFingerprint",
  "stageId",
  "episodeId",
  "candidateFingerprint",
  "packageFingerprint",
  "workOrderFingerprint",
  "profileObservationAggregateFingerprint",
  "sessionCount",
  "generationTargetCount",
  "audioObjectCount",
  "totalAudioBytes",
  "sessionManifests",
  "orderedSessionAggregateFingerprint",
  "repositoryOriginAuthority",
  "profileLifecycleAuthority",
  "providerExecutionAuthority",
  "audioByteAuthority",
  "artifactStorageAuthority",
  "listeningEvidenceAuthority",
  "deviceEvidenceAuthority",
  "publicationAuthority",
  "runtimeConsumer",
  "releaseEligible",
  "releaseAuthority",
  "manifestFingerprint",
] as const);
const SESSION_KEYS = Object.freeze([
  "schemaVersion",
  "sessionOrdinal",
  "sessionId",
  "itemCount",
  "totalBytes",
  "entries",
  "storageEvidence",
  "listeningEvidenceAuthority",
  "deviceEvidenceAuthority",
  "sessionManifestFingerprint",
] as const);
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

function fail(code: string): never {
  throw new Error(code);
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
): boolean {
  const keys = Reflect.ownKeys(value);
  return (
    keys.length === expected.length &&
    keys.every((key) => typeof key === "string" && expected.includes(key))
  );
}

function preflightJson(value: unknown): void {
  const pending: { value: unknown; depth: number }[] = [{ value, depth: 0 }];
  let nodes = 0;
  let arrayEntries = 0;
  while (pending.length > 0) {
    const current = pending.pop()!;
    nodes += 1;
    if (nodes > 1_000_000 || current.depth > 24)
      fail("v2_voice_audio_manifest_json_complexity_invalid");
    if (typeof current.value === "string") {
      if (
        current.value.length > 2_000 ||
        current.value.normalize("NFC") !== current.value ||
        /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/u.test(
          current.value,
        )
      )
        fail("v2_voice_audio_manifest_json_invalid");
      continue;
    }
    if (current.value === null || typeof current.value === "boolean") continue;
    if (typeof current.value === "number") {
      if (!Number.isSafeInteger(current.value) || Object.is(current.value, -0))
        fail("v2_voice_audio_manifest_json_invalid");
      continue;
    }
    if (Array.isArray(current.value)) {
      arrayEntries += current.value.length;
      if (arrayEntries > V2_VOICE_AUDIO_MANIFEST_MAX_OBJECTS_V1 + 32)
        fail("v2_voice_audio_manifest_json_complexity_invalid");
      current.value.forEach((child) =>
        pending.push({ value: child, depth: current.depth + 1 }),
      );
      continue;
    }
    if (!record(current.value)) fail("v2_voice_audio_manifest_json_invalid");
    const object = current.value as Record<string, unknown>;
    const keys = Object.keys(object);
    if (keys.length > 64 || keys.some((key) => RESERVED.has(key)))
      fail("v2_voice_audio_manifest_json_invalid");
    keys.forEach((key) =>
      pending.push({ value: object[key], depth: current.depth + 1 }),
    );
  }
}

function codePointCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function materializeV2VoiceAudioManifestV1(input: {
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly stageId: string;
  readonly workOrderHandle: V2VoiceTtsWorkOrderHandleV1;
  readonly batchHandles: readonly V2FirebaseVoiceAudioBatchHandleV1[];
}): V2VoiceAudioManifestV1 {
  const work = resolveV2VoiceTtsWorkOrderMaterialV1({
    handle: input.workOrderHandle,
    plan: input.plan,
    stageId: input.stageId,
  });
  if (
    !Array.isArray(input.batchHandles) ||
    input.batchHandles.length < 1 ||
    input.batchHandles.length > Math.ceil(work.items.length / 32)
  )
    fail("v2_voice_audio_manifest_batch_count_invalid");
  const objectByTarget = new Map<string, V2FirebaseVoiceAudioObjectV1>();
  const coveredIndexes = new Set<number>();
  for (const handle of input.batchHandles) {
    const batch = resolveV2FirebaseVoiceAudioBatchMaterialV1({
      handle,
      plan: input.plan,
      stageId: input.stageId,
    });
    if (
      batch.summary.workOrderFingerprint !==
        work.summary.workOrderFingerprint ||
      batch.summary.totalWorkItemCount !== work.items.length ||
      batch.objects.length !== batch.summary.batchItemCount
    )
      fail("v2_voice_audio_manifest_batch_binding_invalid");
    for (let offset = 0; offset < batch.summary.batchItemCount; offset += 1) {
      const index = batch.summary.batchStartIndex + offset;
      const expected = work.items[index];
      const observed = batch.objects[offset];
      if (
        !expected ||
        !observed ||
        coveredIndexes.has(index) ||
        observed.generationTargetFingerprint !==
          expected.generationTargetFingerprint ||
        observed.itemFingerprint !== expected.itemFingerprint ||
        observed.voiceId !== expected.voiceId ||
        observed.inputKind !== expected.inputKind ||
        observed.wordOrdinal !== expected.wordOrdinal ||
        !/^[a-f0-9]{64}$/u.test(observed.codecRulesFingerprint) ||
        !/^[a-f0-9]{64}$/u.test(observed.codecResultFingerprint) ||
        observed.pin.contentType !== "audio/mpeg"
      )
        fail("v2_voice_audio_manifest_batch_coverage_invalid");
      coveredIndexes.add(index);
      if (objectByTarget.has(observed.generationTargetFingerprint))
        fail("v2_voice_audio_manifest_target_duplicate");
      objectByTarget.set(observed.generationTargetFingerprint, observed);
    }
  }
  if (
    coveredIndexes.size !== work.items.length ||
    objectByTarget.size !== work.items.length
  )
    fail("v2_voice_audio_manifest_incomplete");
  const sessionBodies = work.packageValue.sessionShards.map((session) => {
    const entries = work.items
      .filter((item) => item.sessionOrdinal === session.sessionOrdinal)
      .map((item) => {
        const object = objectByTarget.get(item.generationTargetFingerprint);
        if (!object) fail("v2_voice_audio_manifest_incomplete");
        const entryBody = {
          generationTargetFingerprint: item.generationTargetFingerprint,
          itemFingerprint: item.itemFingerprint,
          taskId: item.taskId,
          taskVoiceGroupFingerprint: item.taskVoiceGroupFingerprint,
          audioTargetId: item.audioTargetId,
          inputKind: item.inputKind,
          wordId: item.wordId,
          wordOrdinal: item.wordOrdinal,
          voiceId: item.voiceId,
          objectPath: object.pin.objectPath,
          contentHash: object.pin.contentHash,
          objectGeneration: object.pin.objectGeneration,
          byteSize: object.pin.byteSize,
          contentType: "audio/mpeg" as const,
          codecRulesFingerprint: object.codecRulesFingerprint,
          codecResultFingerprint: object.codecResultFingerprint,
        };
        return Object.freeze({
          ...entryBody,
          entryFingerprint: hashCanonicalBody(entryBody),
        });
      })
      .sort((left, right) =>
        codePointCompare(
          left.generationTargetFingerprint,
          right.generationTargetFingerprint,
        ),
      );
    const body = {
      schemaVersion: V2_VOICE_AUDIO_SESSION_MANIFEST_SCHEMA_V1,
      sessionOrdinal: session.sessionOrdinal,
      sessionId: session.sessionId,
      itemCount: entries.length,
      totalBytes: entries.reduce((sum, entry) => sum + entry.byteSize, 0),
      entries: Object.freeze(entries),
      storageEvidence: "unverified_serialized_pins" as const,
      listeningEvidenceAuthority: "none" as const,
      deviceEvidenceAuthority: "none" as const,
    };
    const value = Object.freeze({
      ...body,
      sessionManifestFingerprint: hashCanonicalBody(body),
    });
    if (
      value.itemCount < 1 ||
      utf8ByteLengthV1(canonicalJsonV1(value)) >
        V2_VOICE_AUDIO_SESSION_MANIFEST_MAX_BYTES_V1
    )
      fail("v2_voice_audio_session_manifest_invalid");
    return value;
  });
  if (sessionBodies.length !== 12)
    fail("v2_voice_audio_manifest_session_count_invalid");
  const body = {
    schemaVersion: V2_VOICE_AUDIO_MANIFEST_SCHEMA_V1,
    planFingerprint: work.summary.planFingerprint,
    stageId: work.summary.stageId,
    episodeId: work.summary.episodeId,
    candidateFingerprint: work.summary.candidateFingerprint,
    packageFingerprint: work.summary.packageFingerprint,
    workOrderFingerprint: work.summary.workOrderFingerprint,
    profileObservationAggregateFingerprint:
      work.summary.profileObservationAggregateFingerprint,
    sessionCount: 12 as const,
    generationTargetCount: work.items.length,
    audioObjectCount: objectByTarget.size,
    totalAudioBytes: sessionBodies.reduce(
      (sum, session) => sum + session.totalBytes,
      0,
    ),
    sessionManifests: Object.freeze(sessionBodies),
    orderedSessionAggregateFingerprint: hashCanonicalBody(
      sessionBodies.map((session) => session.sessionManifestFingerprint),
    ),
    repositoryOriginAuthority: "none" as const,
    profileLifecycleAuthority: "none" as const,
    providerExecutionAuthority: "none" as const,
    audioByteAuthority: "none" as const,
    artifactStorageAuthority: "none" as const,
    listeningEvidenceAuthority: "none" as const,
    deviceEvidenceAuthority: "none" as const,
    publicationAuthority: "none" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  };
  const manifest = Object.freeze({
    ...body,
    manifestFingerprint: hashCanonicalBody(body),
  });
  if (
    utf8ByteLengthV1(canonicalJsonV1(manifest)) >
    V2_VOICE_AUDIO_MANIFEST_MAX_BYTES_V1
  )
    fail("v2_voice_audio_manifest_too_large");
  manifestHandles.add(manifest);
  return manifest;
}

export function isV2VoiceAudioManifestV1(
  value: unknown,
): value is V2VoiceAudioManifestV1 {
  return (
    typeof value === "object" && value !== null && manifestHandles.has(value)
  );
}

export function encodeV2VoiceAudioManifestV1(
  value: V2VoiceAudioManifestV1,
): string {
  if (!manifestHandles.has(value))
    fail("v2_voice_audio_manifest_handle_invalid");
  return canonicalJsonV1(value);
}

export function parseV2VoiceAudioManifestV1(
  raw: string,
): V2VoiceAudioManifestV1 {
  if (
    typeof raw !== "string" ||
    raw.length < 2 ||
    raw.length > V2_VOICE_AUDIO_MANIFEST_MAX_BYTES_V1 ||
    utf8ByteLengthV1(raw) > V2_VOICE_AUDIO_MANIFEST_MAX_BYTES_V1
  )
    fail("v2_voice_audio_manifest_raw_invalid");
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    fail("v2_voice_audio_manifest_raw_invalid");
  }
  preflightJson(decoded);
  if (
    !record(decoded) ||
    !exactKeys(decoded, MANIFEST_KEYS) ||
    canonicalJsonV1(decoded) !== raw ||
    decoded.schemaVersion !== V2_VOICE_AUDIO_MANIFEST_SCHEMA_V1 ||
    !HASH_RE.test(String(decoded.planFingerprint)) ||
    !ID_RE.test(String(decoded.stageId)) ||
    !ID_RE.test(String(decoded.episodeId)) ||
    !HASH_RE.test(String(decoded.candidateFingerprint)) ||
    !HASH_RE.test(String(decoded.packageFingerprint)) ||
    !HASH_RE.test(String(decoded.workOrderFingerprint)) ||
    !HASH_RE.test(String(decoded.profileObservationAggregateFingerprint)) ||
    decoded.sessionCount !== 12 ||
    !Number.isSafeInteger(decoded.generationTargetCount) ||
    Number(decoded.generationTargetCount) < 1 ||
    Number(decoded.generationTargetCount) >
      V2_VOICE_AUDIO_MANIFEST_MAX_OBJECTS_V1 ||
    decoded.audioObjectCount !== decoded.generationTargetCount ||
    !Number.isSafeInteger(decoded.totalAudioBytes) ||
    Number(decoded.totalAudioBytes) < 48 ||
    !Array.isArray(decoded.sessionManifests) ||
    decoded.sessionManifests.length !== 12 ||
    decoded.repositoryOriginAuthority !== "none" ||
    decoded.profileLifecycleAuthority !== "none" ||
    decoded.providerExecutionAuthority !== "none" ||
    decoded.audioByteAuthority !== "none" ||
    decoded.artifactStorageAuthority !== "none" ||
    decoded.listeningEvidenceAuthority !== "none" ||
    decoded.deviceEvidenceAuthority !== "none" ||
    decoded.publicationAuthority !== "none" ||
    decoded.runtimeConsumer !== false ||
    decoded.releaseEligible !== false ||
    decoded.releaseAuthority !== false
  )
    fail("v2_voice_audio_manifest_invalid");
  const planFingerprint = String(decoded.planFingerprint);
  const stageId = String(decoded.stageId);
  const generationTargetIds = new Set<string>();
  const entryFingerprints = new Set<string>();
  const taskVoiceGroups = new Map<
    string,
    Readonly<{ taskId: string; voiceId: string }>
  >();
  let itemCount = 0;
  let totalAudioBytes = 0;
  const sessionIds = new Set<string>();
  const sessionManifests = Object.freeze(
    decoded.sessionManifests.map((sessionValue, sessionIndex) => {
      if (!record(sessionValue) || !exactKeys(sessionValue, SESSION_KEYS))
        fail("v2_voice_audio_session_manifest_invalid");
      const sessionOrdinal = sessionIndex + 1;
      const sessionId = String(sessionValue.sessionId);
      if (
        sessionValue.schemaVersion !==
          V2_VOICE_AUDIO_SESSION_MANIFEST_SCHEMA_V1 ||
        sessionValue.sessionOrdinal !== sessionOrdinal ||
        !ID_RE.test(sessionId) ||
        sessionIds.has(sessionId) ||
        !Number.isSafeInteger(sessionValue.itemCount) ||
        Number(sessionValue.itemCount) < 1 ||
        !Number.isSafeInteger(sessionValue.totalBytes) ||
        Number(sessionValue.totalBytes) < 48 ||
        !Array.isArray(sessionValue.entries) ||
        sessionValue.entries.length !== sessionValue.itemCount ||
        sessionValue.storageEvidence !== "unverified_serialized_pins" ||
        sessionValue.listeningEvidenceAuthority !== "none" ||
        sessionValue.deviceEvidenceAuthority !== "none"
      )
        fail("v2_voice_audio_session_manifest_invalid");
      sessionIds.add(sessionId);
      let previousTarget: string | null = null;
      let sessionBytes = 0;
      const entries = Object.freeze(
        sessionValue.entries.map((entryValue) => {
          if (!record(entryValue) || !exactKeys(entryValue, ENTRY_KEYS))
            fail("v2_voice_audio_manifest_entry_invalid");
          const generationTargetFingerprint = String(
            entryValue.generationTargetFingerprint,
          );
          const itemFingerprint = String(entryValue.itemFingerprint);
          const taskId = String(entryValue.taskId);
          const taskVoiceGroupFingerprint = String(
            entryValue.taskVoiceGroupFingerprint,
          );
          const audioTargetId = String(entryValue.audioTargetId);
          const inputKind = entryValue.inputKind;
          const wordId = entryValue.wordId;
          const wordOrdinal = entryValue.wordOrdinal;
          const voiceId = String(entryValue.voiceId);
          const contentHash = String(entryValue.contentHash);
          const objectGeneration = String(entryValue.objectGeneration);
          const byteSize = Number(entryValue.byteSize);
          const codecRulesFingerprint = String(
            entryValue.codecRulesFingerprint,
          );
          const codecResultFingerprint = String(
            entryValue.codecResultFingerprint,
          );
          if (
            !HASH_RE.test(generationTargetFingerprint) ||
            generationTargetIds.has(generationTargetFingerprint) ||
            (previousTarget !== null &&
              previousTarget >= generationTargetFingerprint) ||
            !HASH_RE.test(itemFingerprint) ||
            !ID_RE.test(taskId) ||
            !HASH_RE.test(taskVoiceGroupFingerprint) ||
            !ID_RE.test(audioTargetId) ||
            !["full_utterance", "word"].includes(String(inputKind)) ||
            (inputKind === "full_utterance"
              ? wordId !== null || wordOrdinal !== null
              : !ID_RE.test(String(wordId)) ||
                !Number.isSafeInteger(wordOrdinal) ||
                Number(wordOrdinal) < 1 ||
                Number(wordOrdinal) > 12) ||
            !VOICE_IDS.has(voiceId) ||
            !HASH_RE.test(contentHash) ||
            !GENERATION_RE.test(objectGeneration) ||
            !Number.isSafeInteger(byteSize) ||
            byteSize < 48 ||
            byteSize > 64 * 1024 ||
            entryValue.contentType !== "audio/mpeg" ||
            !HASH_RE.test(codecRulesFingerprint) ||
            !HASH_RE.test(codecResultFingerprint) ||
            entryValue.objectPath !==
              v2FirebaseVoiceAudioObjectPathV1({
                planFingerprint,
                stageId,
                generationTargetFingerprint,
                rawSha256: contentHash,
              })
          )
            fail("v2_voice_audio_manifest_entry_invalid");
          const taskVoice = taskVoiceGroups.get(taskVoiceGroupFingerprint);
          if (
            taskVoice !== undefined &&
            (taskVoice.taskId !== taskId || taskVoice.voiceId !== voiceId)
          )
            fail("v2_voice_audio_manifest_task_voice_invalid");
          taskVoiceGroups.set(
            taskVoiceGroupFingerprint,
            Object.freeze({ taskId, voiceId }),
          );
          const entryBody = Object.freeze({
            generationTargetFingerprint,
            itemFingerprint,
            taskId,
            taskVoiceGroupFingerprint,
            audioTargetId,
            inputKind: inputKind as "full_utterance" | "word",
            wordId: wordId as string | null,
            wordOrdinal: wordOrdinal as number | null,
            voiceId: voiceId as "ash" | "onyx" | "nova" | "coral",
            objectPath: String(entryValue.objectPath),
            contentHash,
            objectGeneration,
            byteSize,
            contentType: "audio/mpeg" as const,
            codecRulesFingerprint,
            codecResultFingerprint,
          });
          const entryFingerprint = String(entryValue.entryFingerprint);
          if (
            !HASH_RE.test(entryFingerprint) ||
            entryFingerprints.has(entryFingerprint) ||
            entryFingerprint !== hashCanonicalBody(entryBody)
          )
            fail("v2_voice_audio_manifest_entry_invalid");
          previousTarget = generationTargetFingerprint;
          generationTargetIds.add(generationTargetFingerprint);
          entryFingerprints.add(entryFingerprint);
          sessionBytes += byteSize;
          itemCount += 1;
          totalAudioBytes += byteSize;
          return Object.freeze({ ...entryBody, entryFingerprint });
        }),
      );
      const sessionBody = Object.freeze({
        schemaVersion: V2_VOICE_AUDIO_SESSION_MANIFEST_SCHEMA_V1,
        sessionOrdinal,
        sessionId,
        itemCount: entries.length,
        totalBytes: sessionBytes,
        entries,
        storageEvidence: "unverified_serialized_pins" as const,
        listeningEvidenceAuthority: "none" as const,
        deviceEvidenceAuthority: "none" as const,
      });
      const sessionManifestFingerprint = String(
        sessionValue.sessionManifestFingerprint,
      );
      if (
        sessionValue.totalBytes !== sessionBytes ||
        !HASH_RE.test(sessionManifestFingerprint) ||
        sessionManifestFingerprint !== hashCanonicalBody(sessionBody) ||
        utf8ByteLengthV1(
          canonicalJsonV1({ ...sessionBody, sessionManifestFingerprint }),
        ) > V2_VOICE_AUDIO_SESSION_MANIFEST_MAX_BYTES_V1
      )
        fail("v2_voice_audio_session_manifest_invalid");
      return Object.freeze({ ...sessionBody, sessionManifestFingerprint });
    }),
  );
  const orderedSessionAggregateFingerprint = hashCanonicalBody(
    sessionManifests.map((session) => session.sessionManifestFingerprint),
  );
  if (
    itemCount !== decoded.audioObjectCount ||
    totalAudioBytes !== decoded.totalAudioBytes ||
    decoded.orderedSessionAggregateFingerprint !==
      orderedSessionAggregateFingerprint
  )
    fail("v2_voice_audio_manifest_aggregate_invalid");
  const body = Object.freeze({
    schemaVersion: V2_VOICE_AUDIO_MANIFEST_SCHEMA_V1,
    planFingerprint,
    stageId,
    episodeId: String(decoded.episodeId),
    candidateFingerprint: String(decoded.candidateFingerprint),
    packageFingerprint: String(decoded.packageFingerprint),
    workOrderFingerprint: String(decoded.workOrderFingerprint),
    profileObservationAggregateFingerprint: String(
      decoded.profileObservationAggregateFingerprint,
    ),
    sessionCount: 12 as const,
    generationTargetCount: itemCount,
    audioObjectCount: itemCount,
    totalAudioBytes,
    sessionManifests,
    orderedSessionAggregateFingerprint,
    repositoryOriginAuthority: "none" as const,
    profileLifecycleAuthority: "none" as const,
    providerExecutionAuthority: "none" as const,
    audioByteAuthority: "none" as const,
    artifactStorageAuthority: "none" as const,
    listeningEvidenceAuthority: "none" as const,
    deviceEvidenceAuthority: "none" as const,
    publicationAuthority: "none" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  });
  const manifestFingerprint = String(decoded.manifestFingerprint);
  if (
    !HASH_RE.test(manifestFingerprint) ||
    manifestFingerprint !== hashCanonicalBody(body)
  )
    fail("v2_voice_audio_manifest_fingerprint_invalid");
  const result = Object.freeze({ ...body, manifestFingerprint });
  if (canonicalJsonV1(result) !== raw)
    fail("v2_voice_audio_manifest_raw_invalid");
  manifestHandles.add(result);
  return result;
}
