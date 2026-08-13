import { parseLearningV2ActivityErrorExplanationLearnerProjectionV1 } from "../content/activity_error_explanation_catalog_v1";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../policies/decision_registry";
import { parseLearningV2ActivityAudioRuntimeProjectionV1 } from "./activity_audio_runtime_projection_v1";
import { parseLearningV2ActivityLearnerActionResourceV1 } from "./activity_learner_action_resource_v1";
import { parseLearningV2ActivityPostTerminalCardCapsuleV1 } from "./activity_post_terminal_card_capsule_v1";

export const LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_MANIFEST_SCHEMA_V1 =
  "learning-v2-activity-auxiliary-release-manifest.v1" as const;
export const LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_MANIFEST_MAX_BYTES_V1 =
  64 * 1024;

export type LearningV2ActivityAuxiliaryKindV1 =
  | "learner_action"
  | "post_terminal_card_capsule"
  | "audio_runtime"
  | "error_explanations";

export interface LearningV2ActivityAuxiliaryObjectPinV1 {
  readonly kind: LearningV2ActivityAuxiliaryKindV1;
  readonly objectPath: string;
  readonly contentHash: string;
  readonly objectGeneration: string;
  readonly byteSize: number;
  readonly contentType: "application/json; charset=utf-8";
}

export interface LearningV2ActivityAuxiliaryReleaseManifestV1 {
  readonly schemaVersion: typeof LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_MANIFEST_SCHEMA_V1;
  readonly stageId: string;
  readonly episodeId: string;
  readonly sessionId: string;
  readonly sessionOrdinal: number;
  readonly activityPackageFingerprint: string;
  readonly sourceFingerprint: string;
  readonly renderFingerprint: string;
  readonly actionResourceFingerprint: string;
  readonly postTerminalCardCapsuleFingerprint: string;
  readonly audioRuntimeProjectionFingerprint: string;
  readonly errorExplanationProjectionFingerprint: string;
  readonly objects: readonly [
    LearningV2ActivityAuxiliaryObjectPinV1,
    LearningV2ActivityAuxiliaryObjectPinV1,
    LearningV2ActivityAuxiliaryObjectPinV1,
    LearningV2ActivityAuxiliaryObjectPinV1,
  ];
  readonly objectCount: 4;
  readonly storageEvidence: "unverified_structural_pins";
  readonly clientDelivery: "manifest_only_no_embedded_payloads";
  readonly runtimeAuthority: "none_release_pointer_and_readback_required";
  readonly walletAuthority: "none";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
  readonly publicationAuthority: "none";
  readonly releaseAuthority: false;
  readonly manifestFingerprint: string;
}

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const HASH_RE = /^[a-f0-9]{64}$/u;
const GENERATION_RE = /^[A-Za-z0-9._:-]{1,160}$/u;
const RESERVED_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const handles = new WeakSet<object>();
const KINDS = Object.freeze([
  "learner_action",
  "post_terminal_card_capsule",
  "audio_runtime",
  "error_explanations",
] as const);
const ROOT_KEYS = Object.freeze([
  "schemaVersion",
  "stageId",
  "episodeId",
  "sessionId",
  "sessionOrdinal",
  "activityPackageFingerprint",
  "sourceFingerprint",
  "renderFingerprint",
  "actionResourceFingerprint",
  "postTerminalCardCapsuleFingerprint",
  "audioRuntimeProjectionFingerprint",
  "errorExplanationProjectionFingerprint",
  "objects",
  "objectCount",
  "storageEvidence",
  "clientDelivery",
  "runtimeAuthority",
  "walletAuthority",
  "masteryAuthority",
  "evidenceAuthority",
  "publicationAuthority",
  "releaseAuthority",
  "manifestFingerprint",
] as const);
const PIN_KEYS = Object.freeze([
  "kind",
  "objectPath",
  "contentHash",
  "objectGeneration",
  "byteSize",
  "contentType",
] as const);

function fail(code: string): never {
  throw new Error(code);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
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
    fail("learning_v2_activity_auxiliary_manifest_fields_invalid");
}

function exactId(value: unknown): string {
  if (
    typeof value !== "string" ||
    !ID_RE.test(value) ||
    RESERVED_KEYS.has(value)
  )
    fail("learning_v2_activity_auxiliary_manifest_identity_invalid");
  return value;
}

function exactHash(value: unknown): string {
  if (typeof value !== "string" || !HASH_RE.test(value))
    fail("learning_v2_activity_auxiliary_manifest_hash_invalid");
  return value;
}

function auxiliaryPath(
  stageId: string,
  activityPackageFingerprint: string,
  sessionOrdinal: number,
  kind: LearningV2ActivityAuxiliaryKindV1,
  contentHash: string,
): string {
  return `learning-v2/canonical/activity-auxiliary/${sha256Utf8(stageId)}/${activityPackageFingerprint}/sessions/${String(sessionOrdinal).padStart(2, "0")}/${kind}/${contentHash}.json`;
}

function pin(
  stageId: string,
  activityPackageFingerprint: string,
  sessionOrdinal: number,
  kind: LearningV2ActivityAuxiliaryKindV1,
  raw: string,
  objectGeneration: string,
): LearningV2ActivityAuxiliaryObjectPinV1 {
  if (!GENERATION_RE.test(objectGeneration))
    fail("learning_v2_activity_auxiliary_manifest_generation_invalid");
  const contentHash = sha256Utf8(raw);
  return Object.freeze({
    kind,
    objectPath: auxiliaryPath(
      stageId,
      activityPackageFingerprint,
      sessionOrdinal,
      kind,
      contentHash,
    ),
    contentHash,
    objectGeneration,
    byteSize: utf8ByteLengthV1(raw),
    contentType: "application/json; charset=utf-8" as const,
  });
}

function parsePin(
  value: unknown,
  stageId: string,
  activityPackageFingerprint: string,
  sessionOrdinal: number,
  expectedKind: LearningV2ActivityAuxiliaryKindV1,
): LearningV2ActivityAuxiliaryObjectPinV1 {
  if (!isPlainObject(value))
    fail("learning_v2_activity_auxiliary_manifest_pin_invalid");
  exactKeys(value, PIN_KEYS);
  if (
    value.kind !== expectedKind ||
    typeof value.objectGeneration !== "string" ||
    !GENERATION_RE.test(value.objectGeneration) ||
    !Number.isSafeInteger(value.byteSize) ||
    Number(value.byteSize) < 1 ||
    Number(value.byteSize) > 4 * 1024 * 1024 ||
    value.contentType !== "application/json; charset=utf-8"
  )
    fail("learning_v2_activity_auxiliary_manifest_pin_invalid");
  const contentHash = exactHash(value.contentHash);
  if (
    value.objectPath !==
    auxiliaryPath(
      stageId,
      activityPackageFingerprint,
      sessionOrdinal,
      expectedKind,
      contentHash,
    )
  )
    fail("learning_v2_activity_auxiliary_manifest_path_invalid");
  return Object.freeze({
    kind: expectedKind,
    objectPath: value.objectPath,
    contentHash,
    objectGeneration: value.objectGeneration,
    byteSize: Number(value.byteSize),
    contentType: "application/json; charset=utf-8" as const,
  });
}

function parseManifest(
  value: unknown,
): LearningV2ActivityAuxiliaryReleaseManifestV1 {
  if (!isPlainObject(value))
    fail("learning_v2_activity_auxiliary_manifest_invalid");
  exactKeys(value, ROOT_KEYS);
  if (
    value.schemaVersion !==
      LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_MANIFEST_SCHEMA_V1 ||
    !Number.isSafeInteger(value.sessionOrdinal) ||
    Number(value.sessionOrdinal) < 1 ||
    Number(value.sessionOrdinal) > 12 ||
    !Array.isArray(value.objects) ||
    value.objects.length !== 4 ||
    value.objectCount !== 4
  )
    fail("learning_v2_activity_auxiliary_manifest_invalid");
  const rawObjects = value.objects as unknown[];
  const stageId = exactId(value.stageId);
  const episodeId = exactId(value.episodeId);
  const sessionId = exactId(value.sessionId);
  const sessionOrdinal = Number(value.sessionOrdinal);
  const activityPackageFingerprint = exactHash(
    value.activityPackageFingerprint,
  );
  const sourceFingerprint = exactHash(value.sourceFingerprint);
  const renderFingerprint = exactHash(value.renderFingerprint);
  const actionResourceFingerprint = exactHash(value.actionResourceFingerprint);
  const postTerminalCardCapsuleFingerprint = exactHash(
    value.postTerminalCardCapsuleFingerprint,
  );
  const audioRuntimeProjectionFingerprint = exactHash(
    value.audioRuntimeProjectionFingerprint,
  );
  const errorExplanationProjectionFingerprint = exactHash(
    value.errorExplanationProjectionFingerprint,
  );
  const objects = KINDS.map((kind, index) =>
    parsePin(
      rawObjects[index],
      stageId,
      activityPackageFingerprint,
      sessionOrdinal,
      kind,
    ),
  ) as unknown as LearningV2ActivityAuxiliaryReleaseManifestV1["objects"];
  if (
    value.storageEvidence !== "unverified_structural_pins" ||
    value.clientDelivery !== "manifest_only_no_embedded_payloads" ||
    value.runtimeAuthority !== "none_release_pointer_and_readback_required" ||
    value.walletAuthority !== "none" ||
    value.masteryAuthority !== "none" ||
    value.evidenceAuthority !== "none" ||
    value.publicationAuthority !== "none" ||
    value.releaseAuthority !== false
  )
    fail("learning_v2_activity_auxiliary_manifest_authority_invalid");
  const body = {
    schemaVersion: LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_MANIFEST_SCHEMA_V1,
    stageId,
    episodeId,
    sessionId,
    sessionOrdinal,
    activityPackageFingerprint,
    sourceFingerprint,
    renderFingerprint,
    actionResourceFingerprint,
    postTerminalCardCapsuleFingerprint,
    audioRuntimeProjectionFingerprint,
    errorExplanationProjectionFingerprint,
    objects,
    objectCount: 4 as const,
    storageEvidence: "unverified_structural_pins" as const,
    clientDelivery: "manifest_only_no_embedded_payloads" as const,
    runtimeAuthority: "none_release_pointer_and_readback_required" as const,
    walletAuthority: "none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    publicationAuthority: "none" as const,
    releaseAuthority: false as const,
  };
  const manifestFingerprint = exactHash(value.manifestFingerprint);
  if (hashCanonicalBody(body) !== manifestFingerprint)
    fail("learning_v2_activity_auxiliary_manifest_fingerprint_invalid");
  const result = Object.freeze({ ...body, manifestFingerprint });
  handles.add(result);
  return result;
}

export function materializeLearningV2ActivityAuxiliaryReleaseManifestV1(
  input: Readonly<{
    stageId: string;
    activityPackageFingerprint: string;
    learnerActionRaw: string;
    learnerActionGeneration: string;
    postTerminalCardCapsuleRaw: string;
    postTerminalCardCapsuleGeneration: string;
    audioRuntimeRaw: string;
    audioRuntimeGeneration: string;
    errorExplanationRaw: string;
    errorExplanationGeneration: string;
  }>,
): LearningV2ActivityAuxiliaryReleaseManifestV1 {
  const action = parseLearningV2ActivityLearnerActionResourceV1(
    input.learnerActionRaw,
  );
  const cards = parseLearningV2ActivityPostTerminalCardCapsuleV1(
    input.postTerminalCardCapsuleRaw,
  );
  const audio = parseLearningV2ActivityAudioRuntimeProjectionV1(
    input.audioRuntimeRaw,
  );
  const errors = parseLearningV2ActivityErrorExplanationLearnerProjectionV1(
    input.errorExplanationRaw,
  );
  if (
    cards.episodeId !== action.episodeId ||
    cards.sessionId !== action.sessionId ||
    cards.sessionOrdinal !== action.sessionOrdinal ||
    cards.actionResourceFingerprint !== action.resourceFingerprint ||
    audio.episodeId !== action.episodeId ||
    audio.sessionId !== action.sessionId ||
    audio.sessionOrdinal !== action.sessionOrdinal ||
    errors.episodeId !== action.episodeId
  )
    fail("learning_v2_activity_auxiliary_manifest_resource_mismatch");
  const actionIds = new Set(
    action.entries.map((entry) => `${entry.taskId}\u0000${entry.activityId}`),
  );
  const errorRows = errors.entries.filter(
    (entry) => entry.sessionOrdinal === action.sessionOrdinal,
  );
  if (
    errorRows.length !== 12 ||
    errorRows.some(
      (entry) =>
        entry.sessionId !== action.sessionId ||
        !actionIds.has(`${entry.taskId}\u0000${entry.activityId}`),
    ) ||
    audio.entries.some((entry) =>
      action.entries.every(
        (actionEntry) => actionEntry.taskId !== entry.taskId,
      ),
    )
  )
    fail("learning_v2_activity_auxiliary_manifest_bijection_invalid");
  const stageId = exactId(input.stageId);
  const activityPackageFingerprint = exactHash(
    input.activityPackageFingerprint,
  );
  const objects = Object.freeze([
    pin(
      stageId,
      activityPackageFingerprint,
      action.sessionOrdinal,
      "learner_action",
      input.learnerActionRaw,
      input.learnerActionGeneration,
    ),
    pin(
      stageId,
      activityPackageFingerprint,
      action.sessionOrdinal,
      "post_terminal_card_capsule",
      input.postTerminalCardCapsuleRaw,
      input.postTerminalCardCapsuleGeneration,
    ),
    pin(
      stageId,
      activityPackageFingerprint,
      action.sessionOrdinal,
      "audio_runtime",
      input.audioRuntimeRaw,
      input.audioRuntimeGeneration,
    ),
    pin(
      stageId,
      activityPackageFingerprint,
      action.sessionOrdinal,
      "error_explanations",
      input.errorExplanationRaw,
      input.errorExplanationGeneration,
    ),
  ] as const);
  const body = {
    schemaVersion: LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_MANIFEST_SCHEMA_V1,
    stageId,
    episodeId: action.episodeId,
    sessionId: action.sessionId,
    sessionOrdinal: action.sessionOrdinal,
    activityPackageFingerprint,
    sourceFingerprint: action.sourceFingerprint,
    renderFingerprint: action.renderFingerprint,
    actionResourceFingerprint: action.resourceFingerprint,
    postTerminalCardCapsuleFingerprint: cards.capsuleFingerprint,
    audioRuntimeProjectionFingerprint: audio.projectionFingerprint,
    errorExplanationProjectionFingerprint: errors.projectionFingerprint,
    objects,
    objectCount: 4 as const,
    storageEvidence: "unverified_structural_pins" as const,
    clientDelivery: "manifest_only_no_embedded_payloads" as const,
    runtimeAuthority: "none_release_pointer_and_readback_required" as const,
    walletAuthority: "none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    publicationAuthority: "none" as const,
    releaseAuthority: false as const,
  };
  return parseLearningV2ActivityAuxiliaryReleaseManifestV1(
    canonicalJsonV1({ ...body, manifestFingerprint: hashCanonicalBody(body) }),
  );
}

export function parseLearningV2ActivityAuxiliaryReleaseManifestV1(
  raw: string,
): LearningV2ActivityAuxiliaryReleaseManifestV1 {
  if (
    typeof raw !== "string" ||
    raw.length > LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_MANIFEST_MAX_BYTES_V1 ||
    utf8ByteLengthV1(raw) >
      LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_MANIFEST_MAX_BYTES_V1
  )
    fail("learning_v2_activity_auxiliary_manifest_raw_invalid");
  let candidate: unknown;
  try {
    candidate = JSON.parse(raw);
  } catch {
    fail("learning_v2_activity_auxiliary_manifest_json_invalid");
  }
  if (canonicalJsonV1(candidate) !== raw)
    fail("learning_v2_activity_auxiliary_manifest_noncanonical");
  return parseManifest(candidate);
}

export function encodeLearningV2ActivityAuxiliaryReleaseManifestV1(
  manifest: LearningV2ActivityAuxiliaryReleaseManifestV1,
): string {
  if (!isLearningV2ActivityAuxiliaryReleaseManifestV1(manifest))
    fail("learning_v2_activity_auxiliary_manifest_handle_invalid");
  return canonicalJsonV1(manifest);
}

export function isLearningV2ActivityAuxiliaryReleaseManifestV1(
  value: unknown,
): value is LearningV2ActivityAuxiliaryReleaseManifestV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}
