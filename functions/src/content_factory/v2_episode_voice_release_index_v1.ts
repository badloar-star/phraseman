import { createHash } from "node:crypto";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import type { V2CanonicalSeasonPlanV2 } from "./v2_canonical_generation_plan_v2";
import {
  resolveV2FirebaseActivityInstancesValidatorResultMaterialV1,
  type V2FirebaseActivityInstancesValidatorResultHandleV1,
} from "./v2_firebase_activity_instances_validator_adapter_v1";
import {
  resolveV2FirebaseVoiceAudioEpisodeReceiptMaterialV1,
  type V2FirebaseVoiceAudioEpisodeReceiptHandleV1,
} from "./v2_firebase_voice_audio_episode_receipt_adapter_v1";
import {
  resolveV2FirebaseVoiceAudioManifestMaterialV1,
  type V2FirebaseVoiceAudioManifestHandleV1,
} from "./v2_firebase_voice_audio_manifest_adapter_v1";
import {
  resolveV2FirebaseVoiceDeviceEpisodeReceiptMaterialV1,
  type V2FirebaseVoiceDeviceEpisodeReceiptHandleV1,
} from "./v2_firebase_voice_device_observation_receipt_adapter_v1";
import {
  resolveV2FirebaseVoiceHumanEpisodeReviewMaterialV1,
  type V2FirebaseVoiceHumanEpisodeReviewHandleV1,
} from "./v2_firebase_voice_human_episode_review_adapter_v1";
import {
  resolveV2FirebaseVoiceTargetsAuthenticatedInputMaterialV1,
  type V2FirebaseVoiceTargetsAuthenticatedInputHandleV1,
} from "./v2_firebase_voice_targets_authenticated_input_v1";
import type { V2RepositoryImmutableObjectPinV1 } from "./v2_firebase_repository_persistence_v1";

export const V2_EPISODE_VOICE_RELEASE_INDEX_SCHEMA_V1 =
  "v2-episode-voice-release-index.v1" as const;
export const V2_EPISODE_VOICE_RELEASE_INDEX_MAX_BYTES_V1 = 2 * 1024 * 1024;
export const V2_EPISODE_VOICE_RELEASE_INDEX_MAX_PAGE_COMMITS_V1 = 1_404;

export interface V2EpisodeVoiceReleaseIndexV1 {
  readonly schemaVersion: typeof V2_EPISODE_VOICE_RELEASE_INDEX_SCHEMA_V1;
  readonly planFingerprint: string;
  readonly courseContractFingerprint: string;
  readonly episodeId: string;
  readonly activityStageId: string;
  readonly voiceStageId: string;
  readonly activityAssemblyFingerprint: string;
  readonly activityPackageFingerprint: string;
  readonly activityValidatorSummaryFingerprint: string;
  readonly voiceTargetsCandidateFingerprint: string;
  readonly voiceTargetsPackageFingerprint: string;
  readonly voiceTargetsAuthenticatedInputSummaryFingerprint: string;
  readonly manifestSummaryFingerprint: string;
  readonly manifestFingerprint: string;
  readonly manifestObject: V2RepositoryImmutableObjectPinV1;
  readonly audioEpisodeReceiptFingerprint: string;
  readonly audioEpisodeSummaryFingerprint: string;
  readonly audioEpisodeReceiptObject: V2RepositoryImmutableObjectPinV1;
  readonly decoderEpisodeReceiptFingerprint: string;
  readonly decoderEpisodeReceiptObject: V2RepositoryImmutableObjectPinV1;
  readonly pcmEpisodeReceiptFingerprint: string;
  readonly pcmEpisodeReceiptObject: V2RepositoryImmutableObjectPinV1;
  readonly devicePageCommitObjects: readonly V2RepositoryImmutableObjectPinV1[];
  readonly devicePageCommitAggregateFingerprint: string;
  readonly orderedPageCommitFingerprintAggregate: string;
  readonly deviceEpisodeSummaryFingerprint: string;
  readonly humanReviewReceiptFingerprint: string;
  readonly humanReviewSummaryFingerprint: string;
  readonly humanReviewReceiptObject: V2RepositoryImmutableObjectPinV1;
  readonly audioObjectCount: number;
  readonly totalAudioBytes: number;
  readonly devicePlatform: "ios" | "android";
  readonly deviceClass: "physical_device";
  readonly decoderFamily: "avplayer" | "exoplayer";
  readonly pcmEpisodeDisposition: "candidate_for_human_listening";
  readonly humanReviewDecision: "approved";
  readonly listeningReviewerIdentityFingerprint: string;
  readonly linguistReviewerIdentityFingerprint: string;
  readonly immutableObjectAggregateFingerprint: string;
  readonly evidenceAggregateFingerprint: string;
  readonly materializationBindingEvidence: "same_process_private_handle_join_serialized_audit_only";
  readonly repositoryOriginAuthority: "none_activation_cold_readback_required";
  readonly artifactStorageAuthority: "none_activation_cold_readback_required";
  readonly profileLifecycleAuthority: "none_activation_cold_readback_required";
  readonly audioByteAuthority: "none_activation_cold_readback_required";
  readonly decoderEvidenceAuthority: "none_activation_cold_readback_required";
  readonly signalEvidenceAuthority: "none_activation_cold_readback_required";
  readonly listeningEvidenceAuthority: "none_activation_cold_readback_required";
  readonly humanApprovalAuthority: "none_owner_activation_required";
  readonly publicationAuthority: "none";
  readonly executionAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly indexFingerprint: string;
}

export interface V2EpisodeVoiceReleaseIndexMaterialInputV1 {
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly activityStageId: string;
  readonly voiceStageId: string;
  readonly activityValidationHandle: V2FirebaseActivityInstancesValidatorResultHandleV1;
  readonly voiceTargetsInputHandle: V2FirebaseVoiceTargetsAuthenticatedInputHandleV1;
  readonly manifestHandle: V2FirebaseVoiceAudioManifestHandleV1;
  readonly audioEpisodeReceiptHandle: V2FirebaseVoiceAudioEpisodeReceiptHandleV1;
  readonly deviceEpisodeReceiptHandle: V2FirebaseVoiceDeviceEpisodeReceiptHandleV1;
  readonly humanReviewHandle: V2FirebaseVoiceHumanEpisodeReviewHandleV1;
}

const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const GENERATION_RE = /^[1-9][0-9]{0,30}$/u;
const CONTENT_TYPE = "application/json; charset=utf-8";
const handles = new WeakSet<object>();

function fail(code: string): never {
  throw new Error(`v2_episode_voice_release_index_${code}`);
}

function record(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function preflightJson(value: unknown): void {
  const stack: { value: unknown; depth: number }[] = [{ value, depth: 0 }];
  let nodes = 0;
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (++nodes > 20_000 || current.depth > 24) fail("json_complexity_invalid");
    if (
      current.value === null ||
      typeof current.value === "boolean" ||
      typeof current.value === "string" ||
      typeof current.value === "number"
    )
      continue;
    if (Array.isArray(current.value)) {
      if (current.value.length > 4_000) fail("json_complexity_invalid");
      current.value.forEach((child) =>
        stack.push({ value: child, depth: current.depth + 1 }),
      );
      continue;
    }
    if (!record(current.value)) fail("json_complexity_invalid");
    const objectValue = current.value as Record<string, unknown>;
    const keys = Object.keys(objectValue);
    if (keys.length > 128) fail("json_complexity_invalid");
    keys.forEach((key) =>
      stack.push({ value: objectValue[key], depth: current.depth + 1 }),
    );
  }
}

function exactPin(
  value: V2RepositoryImmutableObjectPinV1,
): V2RepositoryImmutableObjectPinV1 {
  if (
    !record(value) ||
    Object.keys(value).sort().join("|") !==
      "byteSize|contentHash|contentType|objectGeneration|objectPath" ||
    typeof value.objectPath !== "string" ||
    value.objectPath.length < 1 ||
    value.objectPath.length > 1_000 ||
    value.objectPath.startsWith("/") ||
    value.objectPath.includes("..") ||
    value.objectPath.includes("\\") ||
    /%2f|%5c/iu.test(value.objectPath) ||
    !HASH_RE.test(value.contentHash) ||
    !GENERATION_RE.test(value.objectGeneration) ||
    !Number.isSafeInteger(value.byteSize) ||
    value.byteSize < 2 ||
    value.byteSize > 4 * 1024 * 1024 ||
    value.contentType !== CONTENT_TYPE
  )
    fail("pin_invalid");
  return Object.freeze({ ...value });
}

function stageFor(plan: V2CanonicalSeasonPlanV2, stageId: string) {
  if (!ID_RE.test(stageId)) fail("stage_invalid");
  const stage = plan.stages.find((candidate) => candidate.stageId === stageId);
  if (!stage) fail("stage_invalid");
  return stage;
}

function exactPositive(value: unknown, maximum: number): number {
  if (
    !Number.isSafeInteger(value) ||
    Number(value) < 1 ||
    Number(value) > maximum
  )
    fail("number_invalid");
  return Number(value);
}

function exactAuditHash(value: unknown): string {
  if (typeof value !== "string" || !HASH_RE.test(value)) fail("hash_invalid");
  return value;
}

function exactAuditId(value: unknown): string {
  if (typeof value !== "string" || !ID_RE.test(value)) fail("id_invalid");
  return value;
}

function exactAuditPin(value: unknown): V2RepositoryImmutableObjectPinV1 {
  return exactPin(value as V2RepositoryImmutableObjectPinV1);
}

export function materializeV2EpisodeVoiceReleaseIndexV1(
  input: V2EpisodeVoiceReleaseIndexMaterialInputV1,
): V2EpisodeVoiceReleaseIndexV1 {
  if (
    !record(input) ||
    Object.keys(input).sort().join("|") !==
      [
        "activityStageId",
        "activityValidationHandle",
        "audioEpisodeReceiptHandle",
        "deviceEpisodeReceiptHandle",
        "humanReviewHandle",
        "manifestHandle",
        "plan",
        "voiceStageId",
        "voiceTargetsInputHandle",
      ]
        .sort()
        .join("|")
  )
    fail("input_invalid");
  const activityStage = stageFor(input.plan, input.activityStageId);
  const voiceStage = stageFor(input.plan, input.voiceStageId);
  if (
    activityStage.kind !== "v2_activity_instances" ||
    voiceStage.kind !== "v2_voice_targets" ||
    activityStage.episodeId === null ||
    activityStage.episodeId !== voiceStage.episodeId ||
    !voiceStage.dependsOn.includes(input.activityStageId)
  )
    fail("stage_binding_invalid");
  const activity = resolveV2FirebaseActivityInstancesValidatorResultMaterialV1({
    handle: input.activityValidationHandle,
    plan: input.plan,
  });
  const voiceTargets =
    resolveV2FirebaseVoiceTargetsAuthenticatedInputMaterialV1({
      handle: input.voiceTargetsInputHandle,
      plan: input.plan,
      stageId: input.voiceStageId,
    });
  const manifest = resolveV2FirebaseVoiceAudioManifestMaterialV1({
    handle: input.manifestHandle,
    plan: input.plan,
    stageId: input.voiceStageId,
  });
  const audio = resolveV2FirebaseVoiceAudioEpisodeReceiptMaterialV1({
    handle: input.audioEpisodeReceiptHandle,
    plan: input.plan,
    stageId: input.voiceStageId,
    manifest: manifest.manifest,
  });
  const device = resolveV2FirebaseVoiceDeviceEpisodeReceiptMaterialV1({
    handle: input.deviceEpisodeReceiptHandle,
    plan: input.plan,
    stageId: input.voiceStageId,
    manifest: manifest.manifest,
  });
  const human = resolveV2FirebaseVoiceHumanEpisodeReviewMaterialV1({
    handle: input.humanReviewHandle,
    plan: input.plan,
    stageId: input.voiceStageId,
    manifest: manifest.manifest,
  });
  const activityPackageFingerprint =
    activity.summary.packageFingerprint ?? undefined;
  const catalog = voiceTargets.packageInputs.catalog;
  if (
    activity.summary.outcome !== "eligible_for_human_review_only" ||
    activity.summary.stageId !== input.activityStageId ||
    activity.summary.episodeId !== activityStage.episodeId ||
    activity.summary.validatedSessionCount !== 12 ||
    activity.summary.validatedTaskCount !== 144 ||
    activityPackageFingerprint === undefined ||
    voiceTargets.summary.episodeId !== activityStage.episodeId ||
    voiceTargets.summary.candidateFingerprint !==
      manifest.manifest.candidateFingerprint ||
    voiceTargets.summary.packageFingerprint !==
      manifest.manifest.packageFingerprint ||
    voiceTargets.packageValue.root.artifactFingerprint !==
      manifest.manifest.packageFingerprint ||
    voiceTargets.packageValue.root.activityAudioCatalogFingerprint !==
      catalog.catalogFingerprint ||
    voiceTargets.packageValue.root.activitySourceAggregateFingerprint !==
      catalog.activitySourceAggregateFingerprint ||
    voiceTargets.packageValue.root.activityRenderAggregateFingerprint !==
      catalog.activityRenderAggregateFingerprint ||
    manifest.summary.manifestFingerprint !==
      manifest.manifest.manifestFingerprint ||
    manifest.summary.audioObjectCount !== manifest.manifest.audioObjectCount ||
    audio.summary.manifestFingerprint !==
      manifest.manifest.manifestFingerprint ||
    audio.summary.receiptFingerprint !== audio.receipt.receiptFingerprint ||
    audio.summary.audioObjectCount !== manifest.manifest.audioObjectCount ||
    device.summary.manifestFingerprint !==
      manifest.manifest.manifestFingerprint ||
    device.summary.audioEpisodeReceiptFingerprint !==
      audio.receipt.receiptFingerprint ||
    device.summary.decoderEpisodeReceiptFingerprint !==
      device.decoderEpisodeReceipt.receiptFingerprint ||
    device.summary.pcmEpisodeReceiptFingerprint !==
      device.pcmEpisodeReceipt.receiptFingerprint ||
    device.pageCommitPins.length !== device.summary.pageCount ||
    device.pageCommitPins.length < 1 ||
    device.pageCommitPins.length >
      V2_EPISODE_VOICE_RELEASE_INDEX_MAX_PAGE_COMMITS_V1 ||
    device.summary.deviceClass !== "physical_device" ||
    device.summary.pcmEpisodeDisposition !== "candidate_for_human_listening" ||
    device.pcmEpisodeReceipt.blockingSignalItemCount !== 0 ||
    human.summary.manifestFingerprint !==
      manifest.manifest.manifestFingerprint ||
    human.summary.deviceEpisodeReceiptFingerprint !==
      device.pcmEpisodeReceipt.receiptFingerprint ||
    human.summary.receiptFingerprint !== human.receipt.receiptFingerprint ||
    human.summary.episodeDecision !== "approved" ||
    human.receipt.episodeDecision !== "approved" ||
    human.summary.listeningReviewerIdentityFingerprint ===
      human.summary.linguistReviewerIdentityFingerprint
  )
    fail("evidence_chain_invalid");
  const manifestObject = exactPin(manifest.summary.manifestPin);
  const audioEpisodeReceiptObject = exactPin(audio.summary.receiptPin);
  const decoderEpisodeReceiptObject = exactPin(
    device.summary.decoderEpisodeReceiptPin,
  );
  const pcmEpisodeReceiptObject = exactPin(device.summary.pcmEpisodeReceiptPin);
  const devicePageCommitObjects = Object.freeze(
    device.pageCommitPins.map((pin) => exactPin(pin)),
  );
  const devicePageCommitAggregateFingerprint = hashCanonicalBody(
    devicePageCommitObjects,
  );
  const humanReviewReceiptObject = exactPin(human.summary.receiptPin);
  const immutableObjectAggregateFingerprint = hashCanonicalBody([
    manifestObject,
    audioEpisodeReceiptObject,
    decoderEpisodeReceiptObject,
    pcmEpisodeReceiptObject,
    devicePageCommitObjects,
    humanReviewReceiptObject,
  ]);
  const evidenceAggregateFingerprint = hashCanonicalBody({
    activityValidatorSummaryFingerprint: activity.summary.summaryFingerprint,
    voiceTargetsAuthenticatedInputSummaryFingerprint:
      voiceTargets.summary.summaryFingerprint,
    manifestSummaryFingerprint: manifest.summary.summaryFingerprint,
    audioEpisodeSummaryFingerprint: audio.summary.summaryFingerprint,
    deviceEpisodeSummaryFingerprint: device.summary.summaryFingerprint,
    humanReviewSummaryFingerprint: human.summary.summaryFingerprint,
  });
  const body = Object.freeze({
    schemaVersion: V2_EPISODE_VOICE_RELEASE_INDEX_SCHEMA_V1,
    planFingerprint: input.plan.planFingerprint,
    courseContractFingerprint:
      input.plan.courseContract.courseContractFingerprint,
    episodeId: activityStage.episodeId,
    activityStageId: input.activityStageId,
    voiceStageId: input.voiceStageId,
    activityAssemblyFingerprint: catalog.activityProjectionAssemblyFingerprint,
    activityPackageFingerprint,
    activityValidatorSummaryFingerprint: activity.summary.summaryFingerprint,
    voiceTargetsCandidateFingerprint: voiceTargets.summary.candidateFingerprint,
    voiceTargetsPackageFingerprint: voiceTargets.summary.packageFingerprint,
    voiceTargetsAuthenticatedInputSummaryFingerprint:
      voiceTargets.summary.summaryFingerprint,
    manifestSummaryFingerprint: manifest.summary.summaryFingerprint,
    manifestFingerprint: manifest.manifest.manifestFingerprint,
    manifestObject,
    audioEpisodeReceiptFingerprint: audio.receipt.receiptFingerprint,
    audioEpisodeSummaryFingerprint: audio.summary.summaryFingerprint,
    audioEpisodeReceiptObject,
    decoderEpisodeReceiptFingerprint:
      device.decoderEpisodeReceipt.receiptFingerprint,
    decoderEpisodeReceiptObject,
    pcmEpisodeReceiptFingerprint: device.pcmEpisodeReceipt.receiptFingerprint,
    pcmEpisodeReceiptObject,
    devicePageCommitObjects,
    devicePageCommitAggregateFingerprint,
    orderedPageCommitFingerprintAggregate:
      device.summary.orderedPageCommitAggregateFingerprint,
    deviceEpisodeSummaryFingerprint: device.summary.summaryFingerprint,
    humanReviewReceiptFingerprint: human.receipt.receiptFingerprint,
    humanReviewSummaryFingerprint: human.summary.summaryFingerprint,
    humanReviewReceiptObject,
    audioObjectCount: manifest.manifest.audioObjectCount,
    totalAudioBytes: manifest.manifest.totalAudioBytes,
    devicePlatform: device.summary.platform,
    deviceClass: "physical_device" as const,
    decoderFamily: device.decoderEpisodeReceipt.nativeDecoderFamily,
    pcmEpisodeDisposition: "candidate_for_human_listening" as const,
    humanReviewDecision: "approved" as const,
    listeningReviewerIdentityFingerprint:
      human.summary.listeningReviewerIdentityFingerprint,
    linguistReviewerIdentityFingerprint:
      human.summary.linguistReviewerIdentityFingerprint,
    immutableObjectAggregateFingerprint,
    evidenceAggregateFingerprint,
    materializationBindingEvidence:
      "same_process_private_handle_join_serialized_audit_only" as const,
    repositoryOriginAuthority:
      "none_activation_cold_readback_required" as const,
    artifactStorageAuthority: "none_activation_cold_readback_required" as const,
    profileLifecycleAuthority:
      "none_activation_cold_readback_required" as const,
    audioByteAuthority: "none_activation_cold_readback_required" as const,
    decoderEvidenceAuthority: "none_activation_cold_readback_required" as const,
    signalEvidenceAuthority: "none_activation_cold_readback_required" as const,
    listeningEvidenceAuthority:
      "none_activation_cold_readback_required" as const,
    humanApprovalAuthority: "none_owner_activation_required" as const,
    publicationAuthority: "none" as const,
    executionAuthority: "none" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  });
  const result = Object.freeze({
    ...body,
    indexFingerprint: hashCanonicalBody(body),
  });
  if (
    utf8ByteLengthV1(canonicalJsonV1(result)) >
    V2_EPISODE_VOICE_RELEASE_INDEX_MAX_BYTES_V1
  )
    fail("oversize");
  handles.add(result);
  return result;
}

export function isV2EpisodeVoiceReleaseIndexV1(
  value: unknown,
): value is V2EpisodeVoiceReleaseIndexV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}

export function encodeV2EpisodeVoiceReleaseIndexV1(
  value: V2EpisodeVoiceReleaseIndexV1,
): string {
  if (!handles.has(value)) fail("handle_invalid");
  return canonicalJsonV1(value);
}

export function parseV2EpisodeVoiceReleaseIndexV1(input: {
  readonly raw: string;
  readonly material: V2EpisodeVoiceReleaseIndexMaterialInputV1;
}): V2EpisodeVoiceReleaseIndexV1 {
  if (
    !record(input) ||
    Object.keys(input).sort().join("|") !== "material|raw" ||
    typeof input.raw !== "string" ||
    input.raw.length < 2 ||
    input.raw.length > V2_EPISODE_VOICE_RELEASE_INDEX_MAX_BYTES_V1 ||
    utf8ByteLengthV1(input.raw) > V2_EPISODE_VOICE_RELEASE_INDEX_MAX_BYTES_V1
  )
    fail("parse_invalid");
  let decoded: unknown;
  try {
    decoded = JSON.parse(input.raw);
  } catch {
    fail("parse_invalid");
  }
  preflightJson(decoded);
  if (!record(decoded) || canonicalJsonV1(decoded) !== input.raw)
    fail("parse_invalid");
  const rebuilt = materializeV2EpisodeVoiceReleaseIndexV1(input.material);
  if (canonicalJsonV1(rebuilt) !== input.raw) fail("parse_mismatch");
  return rebuilt;
}

export function parseV2EpisodeVoiceReleaseIndexAuditV1(
  raw: string,
): V2EpisodeVoiceReleaseIndexV1 {
  if (
    typeof raw !== "string" ||
    raw.length < 2 ||
    raw.length > V2_EPISODE_VOICE_RELEASE_INDEX_MAX_BYTES_V1 ||
    utf8ByteLengthV1(raw) > V2_EPISODE_VOICE_RELEASE_INDEX_MAX_BYTES_V1
  )
    fail("audit_parse_invalid");
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    fail("audit_parse_invalid");
  }
  preflightJson(decoded);
  if (!record(decoded) || canonicalJsonV1(decoded) !== raw)
    fail("audit_parse_invalid");
  const expectedKeys = [
    "schemaVersion",
    "planFingerprint",
    "courseContractFingerprint",
    "episodeId",
    "activityStageId",
    "voiceStageId",
    "activityAssemblyFingerprint",
    "activityPackageFingerprint",
    "activityValidatorSummaryFingerprint",
    "voiceTargetsCandidateFingerprint",
    "voiceTargetsPackageFingerprint",
    "voiceTargetsAuthenticatedInputSummaryFingerprint",
    "manifestSummaryFingerprint",
    "manifestFingerprint",
    "manifestObject",
    "audioEpisodeReceiptFingerprint",
    "audioEpisodeSummaryFingerprint",
    "audioEpisodeReceiptObject",
    "decoderEpisodeReceiptFingerprint",
    "decoderEpisodeReceiptObject",
    "pcmEpisodeReceiptFingerprint",
    "pcmEpisodeReceiptObject",
    "devicePageCommitObjects",
    "devicePageCommitAggregateFingerprint",
    "orderedPageCommitFingerprintAggregate",
    "deviceEpisodeSummaryFingerprint",
    "humanReviewReceiptFingerprint",
    "humanReviewSummaryFingerprint",
    "humanReviewReceiptObject",
    "audioObjectCount",
    "totalAudioBytes",
    "devicePlatform",
    "deviceClass",
    "decoderFamily",
    "pcmEpisodeDisposition",
    "humanReviewDecision",
    "listeningReviewerIdentityFingerprint",
    "linguistReviewerIdentityFingerprint",
    "immutableObjectAggregateFingerprint",
    "evidenceAggregateFingerprint",
    "materializationBindingEvidence",
    "repositoryOriginAuthority",
    "artifactStorageAuthority",
    "profileLifecycleAuthority",
    "audioByteAuthority",
    "decoderEvidenceAuthority",
    "signalEvidenceAuthority",
    "listeningEvidenceAuthority",
    "humanApprovalAuthority",
    "publicationAuthority",
    "executionAuthority",
    "runtimeConsumer",
    "releaseEligible",
    "releaseAuthority",
    "indexFingerprint",
  ].sort();
  const actualKeys = Object.keys(decoded).sort();
  if (
    actualKeys.length !== expectedKeys.length ||
    actualKeys.some((key, index) => key !== expectedKeys[index]) ||
    decoded.schemaVersion !== V2_EPISODE_VOICE_RELEASE_INDEX_SCHEMA_V1 ||
    decoded.materializationBindingEvidence !==
      "same_process_private_handle_join_serialized_audit_only" ||
    decoded.repositoryOriginAuthority !==
      "none_activation_cold_readback_required" ||
    decoded.artifactStorageAuthority !==
      "none_activation_cold_readback_required" ||
    decoded.profileLifecycleAuthority !==
      "none_activation_cold_readback_required" ||
    decoded.audioByteAuthority !== "none_activation_cold_readback_required" ||
    decoded.decoderEvidenceAuthority !==
      "none_activation_cold_readback_required" ||
    decoded.signalEvidenceAuthority !==
      "none_activation_cold_readback_required" ||
    decoded.listeningEvidenceAuthority !==
      "none_activation_cold_readback_required" ||
    decoded.humanApprovalAuthority !== "none_owner_activation_required" ||
    decoded.publicationAuthority !== "none" ||
    decoded.executionAuthority !== "none" ||
    decoded.runtimeConsumer !== false ||
    decoded.releaseEligible !== false ||
    decoded.releaseAuthority !== false ||
    decoded.deviceClass !== "physical_device" ||
    !["ios", "android"].includes(String(decoded.devicePlatform)) ||
    !["avplayer", "exoplayer"].includes(String(decoded.decoderFamily)) ||
    decoded.pcmEpisodeDisposition !== "candidate_for_human_listening" ||
    decoded.humanReviewDecision !== "approved" ||
    !Array.isArray(decoded.devicePageCommitObjects)
  )
    fail("audit_parse_invalid");
  const pagePins = Object.freeze(
    decoded.devicePageCommitObjects.map((pin) => exactAuditPin(pin)),
  );
  if (
    pagePins.length < 1 ||
    pagePins.length > V2_EPISODE_VOICE_RELEASE_INDEX_MAX_PAGE_COMMITS_V1
  )
    fail("audit_parse_invalid");
  const manifestObject = exactAuditPin(decoded.manifestObject);
  const audioEpisodeReceiptObject = exactAuditPin(
    decoded.audioEpisodeReceiptObject,
  );
  const decoderEpisodeReceiptObject = exactAuditPin(
    decoded.decoderEpisodeReceiptObject,
  );
  const pcmEpisodeReceiptObject = exactAuditPin(
    decoded.pcmEpisodeReceiptObject,
  );
  const humanReviewReceiptObject = exactAuditPin(
    decoded.humanReviewReceiptObject,
  );
  const objectAggregate = hashCanonicalBody([
    manifestObject,
    audioEpisodeReceiptObject,
    decoderEpisodeReceiptObject,
    pcmEpisodeReceiptObject,
    pagePins,
    humanReviewReceiptObject,
  ]);
  const evidenceAggregate = hashCanonicalBody({
    activityValidatorSummaryFingerprint: exactAuditHash(
      decoded.activityValidatorSummaryFingerprint,
    ),
    voiceTargetsAuthenticatedInputSummaryFingerprint: exactAuditHash(
      decoded.voiceTargetsAuthenticatedInputSummaryFingerprint,
    ),
    manifestSummaryFingerprint: exactAuditHash(
      decoded.manifestSummaryFingerprint,
    ),
    audioEpisodeSummaryFingerprint: exactAuditHash(
      decoded.audioEpisodeSummaryFingerprint,
    ),
    deviceEpisodeSummaryFingerprint: exactAuditHash(
      decoded.deviceEpisodeSummaryFingerprint,
    ),
    humanReviewSummaryFingerprint: exactAuditHash(
      decoded.humanReviewSummaryFingerprint,
    ),
  });
  if (
    decoded.devicePageCommitAggregateFingerprint !==
      hashCanonicalBody(pagePins) ||
    decoded.immutableObjectAggregateFingerprint !== objectAggregate ||
    decoded.evidenceAggregateFingerprint !== evidenceAggregate ||
    decoded.listeningReviewerIdentityFingerprint ===
      decoded.linguistReviewerIdentityFingerprint
  )
    fail("audit_aggregate_invalid");
  const result = Object.freeze({
    ...(decoded as unknown as V2EpisodeVoiceReleaseIndexV1),
    planFingerprint: exactAuditHash(decoded.planFingerprint),
    courseContractFingerprint: exactAuditHash(
      decoded.courseContractFingerprint,
    ),
    episodeId: exactAuditId(decoded.episodeId),
    activityStageId: exactAuditId(decoded.activityStageId),
    voiceStageId: exactAuditId(decoded.voiceStageId),
    activityAssemblyFingerprint: exactAuditHash(
      decoded.activityAssemblyFingerprint,
    ),
    activityPackageFingerprint: exactAuditHash(
      decoded.activityPackageFingerprint,
    ),
    voiceTargetsCandidateFingerprint: exactAuditHash(
      decoded.voiceTargetsCandidateFingerprint,
    ),
    voiceTargetsPackageFingerprint: exactAuditHash(
      decoded.voiceTargetsPackageFingerprint,
    ),
    manifestFingerprint: exactAuditHash(decoded.manifestFingerprint),
    manifestObject,
    audioEpisodeReceiptFingerprint: exactAuditHash(
      decoded.audioEpisodeReceiptFingerprint,
    ),
    audioEpisodeReceiptObject,
    decoderEpisodeReceiptFingerprint: exactAuditHash(
      decoded.decoderEpisodeReceiptFingerprint,
    ),
    decoderEpisodeReceiptObject,
    pcmEpisodeReceiptFingerprint: exactAuditHash(
      decoded.pcmEpisodeReceiptFingerprint,
    ),
    pcmEpisodeReceiptObject,
    devicePageCommitObjects: pagePins,
    humanReviewReceiptFingerprint: exactAuditHash(
      decoded.humanReviewReceiptFingerprint,
    ),
    humanReviewReceiptObject,
    audioObjectCount: exactPositive(decoded.audioObjectCount, 44_928),
    totalAudioBytes: exactPositive(decoded.totalAudioBytes, 44_928 * 64 * 1024),
    listeningReviewerIdentityFingerprint: exactAuditHash(
      decoded.listeningReviewerIdentityFingerprint,
    ),
    linguistReviewerIdentityFingerprint: exactAuditHash(
      decoded.linguistReviewerIdentityFingerprint,
    ),
  });
  const { indexFingerprint: _fingerprint, ...body } = result;
  if (result.indexFingerprint !== hashCanonicalBody(body))
    fail("audit_fingerprint_invalid");
  handles.add(result);
  return result;
}

export function v2EpisodeVoiceReleaseIndexObjectPathV1(input: {
  readonly planFingerprint: string;
  readonly episodeId: string;
  readonly indexFingerprint: string;
  readonly rawHash: string;
}): string {
  if (
    !record(input) ||
    Object.keys(input).sort().join("|") !==
      "episodeId|indexFingerprint|planFingerprint|rawHash" ||
    !HASH_RE.test(input.planFingerprint) ||
    !ID_RE.test(input.episodeId) ||
    !HASH_RE.test(input.indexFingerprint) ||
    !HASH_RE.test(input.rawHash)
  )
    fail("path_invalid");
  const episodeCoordinate = createHash("sha256")
    .update(input.episodeId)
    .digest("hex");
  return `learning-v2/episode-voice-release-index/${input.planFingerprint}/${episodeCoordinate}/${input.indexFingerprint}/${input.rawHash}.json`;
}
