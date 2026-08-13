import {
  resolveLearningV2ActivityErrorExplanationV1,
  type LearningV2ActivityErrorExplanationLearnerProjectionV1,
} from "../content/activity_error_explanation_catalog_v1";
import type { LearningV2InterfaceLocale } from "../content/generator_course_contract";
import { sha256Utf8, utf8ByteLengthV1 } from "../policies/decision_registry";
import {
  getLearningV2ActivitySelectableAudioBindingsV1,
  selectLearningV2ActivityTaskAudioV1,
  type LearningV2ActivityAudioRuntimeEntryV1,
  type LearningV2ActivityAudioRuntimeProjectionV1,
  type LearningV2ActivityAudioRuntimeVoiceIdV1,
  type LearningV2ActivityAudioSelectableBindingV1,
} from "./activity_audio_runtime_projection_v1";
import {
  getLearningV2ActivityLearnerActionEntryV1,
  type LearningV2ActivityLearnerActionEntryV1,
  type LearningV2ActivityLearnerActionResourceV1,
} from "./activity_learner_action_resource_v1";
import {
  isLearningV2ActivityAuxiliaryReleaseManifestV1,
  type LearningV2ActivityAuxiliaryObjectPinV1,
  type LearningV2ActivityAuxiliaryReleaseManifestV1,
} from "./activity_auxiliary_release_manifest_v1";
import {
  resolveLearningV2ActivityPostTerminalCardV1,
  type LearningV2ActivityPostTerminalCardCapsuleV1,
  type LearningV2ActivityPostTerminalCardResultV1,
} from "./activity_post_terminal_card_capsule_v1";
import { parseLearningV2ActivityAudioRuntimeProjectionV1 } from "./activity_audio_runtime_projection_v1";
import { parseLearningV2ActivityLearnerActionResourceV1 } from "./activity_learner_action_resource_v1";
import { parseLearningV2ActivityPostTerminalCardCapsuleV1 } from "./activity_post_terminal_card_capsule_v1";
import { parseLearningV2ActivityErrorExplanationLearnerProjectionV1 } from "../content/activity_error_explanation_catalog_v1";

export const LEARNING_V2_ACTIVITY_AUXILIARY_INTEGRITY_HANDLE_SCHEMA_V1 =
  "learning-v2-activity-auxiliary-integrity-handle.v1" as const;
export const LEARNING_V2_ACTIVITY_AUXILIARY_READ_MAX_CONCURRENCY_V1 = 4;

export interface LearningV2ActivityAuxiliaryIntegritySummaryV1 {
  readonly schemaVersion: typeof LEARNING_V2_ACTIVITY_AUXILIARY_INTEGRITY_HANDLE_SCHEMA_V1;
  readonly stageId: string;
  readonly episodeId: string;
  readonly sessionId: string;
  readonly sessionOrdinal: number;
  readonly activityPackageFingerprint: string;
  readonly sourceFingerprint: string;
  readonly renderFingerprint: string;
  readonly manifestFingerprint: string;
  readonly objectCount: 4;
  readonly storageIntegrity: "exact_generation_hash_size_readback";
  readonly originAuthority: "none_external_release_pointer_required";
  readonly runtimeAuthority: "integrity_only_no_release_authority";
  readonly walletAuthority: "none";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
  readonly releaseAuthority: false;
}

export interface LearningV2ActivityAuxiliaryIntegrityHandleV1 {
  readonly schemaVersion: typeof LEARNING_V2_ACTIVITY_AUXILIARY_INTEGRITY_HANDLE_SCHEMA_V1;
}

export interface LearningV2ActivityAuxiliaryObjectReaderV1 {
  readExact(pin: LearningV2ActivityAuxiliaryObjectPinV1): Promise<
    Readonly<{
      raw: string;
      objectGeneration: string;
      byteSize: number;
      contentHash: string;
      contentType: "application/json; charset=utf-8";
    }>
  >;
}

interface Material {
  readonly summary: LearningV2ActivityAuxiliaryIntegritySummaryV1;
  readonly action: LearningV2ActivityLearnerActionResourceV1;
  readonly cards: LearningV2ActivityPostTerminalCardCapsuleV1;
  readonly audio: LearningV2ActivityAudioRuntimeProjectionV1;
  readonly errors: LearningV2ActivityErrorExplanationLearnerProjectionV1;
}

export interface LearningV2ActivityAuxiliaryClientMaterialV1 {
  readonly action: LearningV2ActivityLearnerActionResourceV1;
  readonly cards: LearningV2ActivityPostTerminalCardCapsuleV1;
  readonly audio: LearningV2ActivityAudioRuntimeProjectionV1;
  readonly errorEntries: readonly LearningV2ActivityErrorExplanationLearnerProjectionV1["entries"][number][];
  readonly errorSourceProjectionFingerprint: string;
  readonly materialAuthority: "none_integrity_handle_projection_only";
}

const handles = new WeakSet<object>();
const materialByHandle = new WeakMap<object, Material>();

function fail(): never {
  throw new Error("learning_v2_activity_auxiliary_integrity_invalid");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function exactReadback(
  pin: LearningV2ActivityAuxiliaryObjectPinV1,
  value: unknown,
): string {
  if (
    !isPlainObject(value) ||
    Object.keys(value).sort().join("|") !==
      "byteSize|contentHash|contentType|objectGeneration|raw" ||
    typeof value.raw !== "string" ||
    value.objectGeneration !== pin.objectGeneration ||
    value.byteSize !== pin.byteSize ||
    value.contentHash !== pin.contentHash ||
    value.contentType !== "application/json; charset=utf-8" ||
    utf8ByteLengthV1(value.raw) !== pin.byteSize ||
    sha256Utf8(value.raw) !== pin.contentHash
  )
    fail();
  return value.raw;
}

function material(
  handle: LearningV2ActivityAuxiliaryIntegrityHandleV1,
): Material {
  if (!isLearningV2ActivityAuxiliaryIntegrityHandleV1(handle)) fail();
  const found = materialByHandle.get(handle);
  if (!found) fail();
  return found;
}

export async function loadLearningV2ActivityAuxiliaryIntegrityV1(
  input: Readonly<{
    manifest: LearningV2ActivityAuxiliaryReleaseManifestV1;
    expected: Readonly<{
      stageId: string;
      episodeId: string;
      sessionId: string;
      sessionOrdinal: number;
      activityPackageFingerprint: string;
      sourceFingerprint: string;
      renderFingerprint: string;
    }>;
    reader: LearningV2ActivityAuxiliaryObjectReaderV1;
  }>,
): Promise<LearningV2ActivityAuxiliaryIntegrityHandleV1> {
  if (
    !isPlainObject(input) ||
    Object.keys(input).sort().join("|") !== "expected|manifest|reader" ||
    !isLearningV2ActivityAuxiliaryReleaseManifestV1(input.manifest) ||
    !isPlainObject(input.expected) ||
    Object.keys(input.expected).sort().join("|") !==
      "activityPackageFingerprint|episodeId|renderFingerprint|sessionId|sessionOrdinal|sourceFingerprint|stageId" ||
    !isPlainObject(input.reader) ||
    typeof input.reader.readExact !== "function"
  )
    fail();
  const manifest = input.manifest;
  if (
    manifest.stageId !== input.expected.stageId ||
    manifest.episodeId !== input.expected.episodeId ||
    manifest.sessionId !== input.expected.sessionId ||
    manifest.sessionOrdinal !== input.expected.sessionOrdinal ||
    manifest.activityPackageFingerprint !==
      input.expected.activityPackageFingerprint ||
    manifest.sourceFingerprint !== input.expected.sourceFingerprint ||
    manifest.renderFingerprint !== input.expected.renderFingerprint
  )
    fail();

  const readbacks = await Promise.all(
    manifest.objects.map(async (pin) =>
      exactReadback(pin, await input.reader.readExact(pin)),
    ),
  );
  const action = parseLearningV2ActivityLearnerActionResourceV1(readbacks[0]);
  const cards = parseLearningV2ActivityPostTerminalCardCapsuleV1(readbacks[1]);
  const audio = parseLearningV2ActivityAudioRuntimeProjectionV1(readbacks[2]);
  const errors = parseLearningV2ActivityErrorExplanationLearnerProjectionV1(
    readbacks[3],
  );
  if (
    action.resourceFingerprint !== manifest.actionResourceFingerprint ||
    cards.capsuleFingerprint !== manifest.postTerminalCardCapsuleFingerprint ||
    audio.projectionFingerprint !==
      manifest.audioRuntimeProjectionFingerprint ||
    errors.projectionFingerprint !==
      manifest.errorExplanationProjectionFingerprint ||
    action.episodeId !== manifest.episodeId ||
    action.sessionId !== manifest.sessionId ||
    action.sessionOrdinal !== manifest.sessionOrdinal ||
    action.sourceFingerprint !== manifest.sourceFingerprint ||
    action.renderFingerprint !== manifest.renderFingerprint ||
    cards.actionResourceFingerprint !== action.resourceFingerprint ||
    audio.episodeId !== action.episodeId ||
    audio.sessionId !== action.sessionId ||
    audio.sessionOrdinal !== action.sessionOrdinal ||
    errors.episodeId !== action.episodeId
  )
    fail();

  const summary = Object.freeze({
    schemaVersion: LEARNING_V2_ACTIVITY_AUXILIARY_INTEGRITY_HANDLE_SCHEMA_V1,
    stageId: manifest.stageId,
    episodeId: manifest.episodeId,
    sessionId: manifest.sessionId,
    sessionOrdinal: manifest.sessionOrdinal,
    activityPackageFingerprint: manifest.activityPackageFingerprint,
    sourceFingerprint: manifest.sourceFingerprint,
    renderFingerprint: manifest.renderFingerprint,
    manifestFingerprint: manifest.manifestFingerprint,
    objectCount: 4 as const,
    storageIntegrity: "exact_generation_hash_size_readback" as const,
    originAuthority: "none_external_release_pointer_required" as const,
    runtimeAuthority: "integrity_only_no_release_authority" as const,
    walletAuthority: "none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    releaseAuthority: false as const,
  });
  const handle = Object.freeze({
    schemaVersion: LEARNING_V2_ACTIVITY_AUXILIARY_INTEGRITY_HANDLE_SCHEMA_V1,
  });
  handles.add(handle);
  materialByHandle.set(handle, { summary, action, cards, audio, errors });
  return handle;
}

export function isLearningV2ActivityAuxiliaryIntegrityHandleV1(
  value: unknown,
): value is LearningV2ActivityAuxiliaryIntegrityHandleV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}

export function getLearningV2ActivityAuxiliaryIntegritySummaryV1(
  handle: LearningV2ActivityAuxiliaryIntegrityHandleV1,
): LearningV2ActivityAuxiliaryIntegritySummaryV1 {
  return material(handle).summary;
}

export function getLearningV2ActivityReportContextFromIntegrityV1(
  handle: LearningV2ActivityAuxiliaryIntegrityHandleV1,
  taskId: string,
  activityId: string,
): LearningV2ActivityLearnerActionEntryV1["report"] {
  return getLearningV2ActivityLearnerActionEntryV1(
    material(handle).action,
    taskId,
    activityId,
  ).report;
}

export function resolveLearningV2ActivityCardFromIntegrityV1(
  handle: LearningV2ActivityAuxiliaryIntegrityHandleV1,
  input: Readonly<{
    taskId: string;
    activityId: string;
    savablePhraseRef: string;
    interfaceLocale: LearningV2InterfaceLocale;
    terminalState: "completed" | "skipped" | "not_terminal";
  }>,
): LearningV2ActivityPostTerminalCardResultV1 {
  const found = material(handle);
  return resolveLearningV2ActivityPostTerminalCardV1({
    capsule: found.cards,
    actionResource: found.action,
    ...input,
  });
}

export function getLearningV2ActivitySelectableAudioFromIntegrityV1(
  handle: LearningV2ActivityAuxiliaryIntegrityHandleV1,
  taskId: string,
): readonly LearningV2ActivityAudioSelectableBindingV1[] {
  return getLearningV2ActivitySelectableAudioBindingsV1(
    material(handle).audio,
    taskId,
  );
}

export function selectLearningV2ActivityTaskAudioFromIntegrityV1(
  handle: LearningV2ActivityAuxiliaryIntegrityHandleV1,
  input: Readonly<{
    taskId: string;
    voiceId: LearningV2ActivityAudioRuntimeVoiceIdV1;
  }>,
): readonly LearningV2ActivityAudioRuntimeEntryV1[] {
  return selectLearningV2ActivityTaskAudioV1({
    projection: material(handle).audio,
    ...input,
  });
}

export function resolveLearningV2ActivityErrorFromIntegrityV1(
  handle: LearningV2ActivityAuxiliaryIntegrityHandleV1,
  input: Readonly<{
    taskId: string;
    activityId: string;
    interfaceLocale: LearningV2InterfaceLocale;
  }>,
): Readonly<{ explanationRef: string; localizedText: string }> {
  return resolveLearningV2ActivityErrorExplanationV1(
    material(handle).errors,
    input,
  );
}

export function projectLearningV2ActivityAuxiliaryClientMaterialV1(
  handle: LearningV2ActivityAuxiliaryIntegrityHandleV1,
): LearningV2ActivityAuxiliaryClientMaterialV1 {
  const found = material(handle);
  const errorEntries = Object.freeze(
    found.errors.entries.filter(
      (entry) => entry.sessionOrdinal === found.action.sessionOrdinal,
    ),
  );
  if (
    errorEntries.length !== 12 ||
    errorEntries.some((entry, index) => {
      const action = found.action.entries[index];
      return (
        !action ||
        entry.sessionId !== found.action.sessionId ||
        entry.taskId !== action.taskId ||
        entry.activityId !== action.activityId
      );
    })
  )
    fail();
  return Object.freeze({
    action: found.action,
    cards: found.cards,
    audio: found.audio,
    errorEntries,
    errorSourceProjectionFingerprint: found.errors.projectionFingerprint,
    materialAuthority: "none_integrity_handle_projection_only" as const,
  });
}
