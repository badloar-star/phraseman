import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";
import {
  isV2CanonicalSeasonPlanV2,
  type V2CanonicalSeasonPlanV2,
} from "./v2_canonical_generation_plan_v2";
import {
  getV2FirebaseVoiceProfileRepositorySummaryV1,
  resolveV2FirebaseVoiceProfileRepositoryMaterialV1,
  type V2FirebaseVoiceProfileRepositoryHandleV1,
  type V2FirebaseVoiceProfileRepositoryMaterialV1,
} from "./v2_firebase_voice_profile_repository_adapter_v1";
import {
  isV2CanonicalStageCandidateV2,
  isV2GenerationStageWorkspaceV2,
  type V2CanonicalStageCandidateV2,
  type V2GenerationStageWorkspaceV2,
} from "./v2_generation_workspace_contract_v2";
import {
  isV2VoiceTargetsPackageBoundToV2,
  type V2VoiceTargetsMaterializationInputV2,
  type V2VoiceTargetsPackageV2,
} from "./v2_voice_targets_package_v2";
import {
  isV2VoiceTargetsValidationResultV1,
  validateV2VoiceTargetsCandidateV1,
  type V2VoiceTargetsValidationResultV1,
} from "./v2_voice_targets_validator_v1";

export const V2_FIREBASE_VOICE_TARGETS_AUTHENTICATED_INPUT_SUMMARY_SCHEMA_V1 =
  "v2-firebase-voice-targets-authenticated-input-summary.v1" as const;

export interface V2FirebaseVoiceTargetsAuthenticatedInputSummaryV1 {
  readonly schemaVersion: typeof V2_FIREBASE_VOICE_TARGETS_AUTHENTICATED_INPUT_SUMMARY_SCHEMA_V1;
  readonly planFingerprint: string;
  readonly courseContractFingerprint: string;
  readonly workspaceFingerprint: string;
  readonly stageId: string;
  readonly episodeId: string;
  readonly candidateFingerprint: string;
  readonly packageFingerprint: string;
  readonly speechProfileObservationFingerprint: string;
  readonly voiceGenerationProfileObservationFingerprint: string;
  readonly profileObservationAggregateFingerprint: string;
  readonly profileRepositorySummaryFingerprint: string;
  readonly pureValidationResultFingerprint: string;
  readonly targetCount: number;
  readonly wordTargetCount: number;
  readonly generationTargetCount: number;
  readonly repositoryOriginAuthority: "authenticated_project_repository_snapshot";
  readonly profileLifecycleAuthority: "published_head_observation_only";
  readonly dependencyResolutionAuthority: "authenticated_profile_stage_subset_only";
  readonly sourceAuthority: "structural_catalog_only";
  readonly candidateOriginAuthority: "none";
  readonly providerExecutionAuthority: "none";
  readonly audioByteAuthority: "none";
  readonly listeningEvidenceAuthority: "none";
  readonly deviceEvidenceAuthority: "none";
  readonly humanApprovalAuthority: "none";
  readonly runtimeKernelAuthority: "none";
  readonly executionAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly summaryFingerprint: string;
}

export interface V2FirebaseVoiceTargetsAuthenticatedInputHandleV1 {
  readonly __opaqueV2FirebaseVoiceTargetsAuthenticatedInputHandleV1: unique symbol;
}

export interface V2FirebaseVoiceTargetsAuthenticatedInputMaterialV1 {
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly workspace: V2GenerationStageWorkspaceV2;
  readonly candidate: V2CanonicalStageCandidateV2;
  readonly packageValue: V2VoiceTargetsPackageV2;
  readonly packageInputs: V2VoiceTargetsMaterializationInputV2;
  readonly validationResult: V2VoiceTargetsValidationResultV1;
  readonly profiles: V2FirebaseVoiceProfileRepositoryMaterialV1;
  readonly summary: V2FirebaseVoiceTargetsAuthenticatedInputSummaryV1;
}

const handles = new WeakSet<object>();
const metadata = new WeakMap<
  object,
  V2FirebaseVoiceTargetsAuthenticatedInputMaterialV1
>();

function fail(code: string): never {
  throw new Error(code);
}

export function bindV2FirebaseVoiceTargetsAuthenticatedInputV1(input: {
  readonly profileHandle: V2FirebaseVoiceProfileRepositoryHandleV1;
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly workspace: V2GenerationStageWorkspaceV2;
  readonly candidate: V2CanonicalStageCandidateV2;
  readonly packageValue: V2VoiceTargetsPackageV2;
  readonly packageInputs: V2VoiceTargetsMaterializationInputV2;
}): V2FirebaseVoiceTargetsAuthenticatedInputHandleV1 {
  if (
    !isV2CanonicalSeasonPlanV2(input.plan) ||
    !isV2GenerationStageWorkspaceV2(input.workspace) ||
    !isV2CanonicalStageCandidateV2(input.candidate)
  )
    fail("v2_firebase_voice_targets_authenticated_input_untrusted");
  const stageId = input.workspace.stage.stageId;
  const profiles = resolveV2FirebaseVoiceProfileRepositoryMaterialV1({
    handle: input.profileHandle,
    plan: input.plan,
    stageId,
  });
  const profileSummary = getV2FirebaseVoiceProfileRepositorySummaryV1(
    input.profileHandle,
  );
  if (
    input.workspace.planFingerprint !== input.plan.planFingerprint ||
    input.workspace.stage.kind !== "v2_voice_targets" ||
    input.candidate.planFingerprint !== input.plan.planFingerprint ||
    input.candidate.workspaceFingerprint !==
      input.workspace.workspaceFingerprint ||
    input.candidate.stageId !== stageId ||
    input.candidate.stageKind !== "v2_voice_targets" ||
    input.packageInputs.plan !== input.plan ||
    input.packageInputs.workspace !== input.workspace ||
    input.packageInputs.voiceGenerationProfile !==
      profiles.voiceGenerationProfile ||
    !isV2VoiceTargetsPackageBoundToV2(
      input.packageValue,
      input.packageInputs,
    ) ||
    input.packageValue.root.speechProfileRef.profileId !==
      profiles.speechObservation.profileId ||
    input.packageValue.root.speechProfileRef.version !==
      profiles.speechObservation.version ||
    input.packageValue.root.speechProfileRef.contentHash !==
      profiles.speechObservation.contentHash ||
    input.packageValue.root.voiceGenerationProfileRef.profileId !==
      profiles.voiceGenerationObservation.profileId ||
    input.packageValue.root.voiceGenerationProfileRef.version !==
      profiles.voiceGenerationObservation.version ||
    input.packageValue.root.voiceGenerationProfileRef.contentHash !==
      profiles.voiceGenerationObservation.contentHash
  )
    fail("v2_firebase_voice_targets_authenticated_input_binding_invalid");
  const validationResult = validateV2VoiceTargetsCandidateV1({
    plan: input.plan,
    workspace: input.workspace,
    candidate: input.candidate,
    packageValue: input.packageValue,
    packageInputs: input.packageInputs,
  });
  if (
    !isV2VoiceTargetsValidationResultV1(validationResult) ||
    validationResult.outcome !== "eligible_for_human_review_only" ||
    input.candidate.contentClass !== "production_candidate"
  )
    fail("v2_firebase_voice_targets_authenticated_input_blocked");
  const summaryBody = {
    schemaVersion:
      V2_FIREBASE_VOICE_TARGETS_AUTHENTICATED_INPUT_SUMMARY_SCHEMA_V1,
    planFingerprint: input.plan.planFingerprint,
    courseContractFingerprint:
      input.plan.courseContract.courseContractFingerprint,
    workspaceFingerprint: input.workspace.workspaceFingerprint,
    stageId,
    episodeId: profileSummary.episodeId,
    candidateFingerprint: input.candidate.candidateFingerprint,
    packageFingerprint: input.packageValue.root.artifactFingerprint,
    speechProfileObservationFingerprint:
      profileSummary.speechProfileObservationFingerprint,
    voiceGenerationProfileObservationFingerprint:
      profileSummary.voiceGenerationProfileObservationFingerprint,
    profileObservationAggregateFingerprint:
      profileSummary.profileObservationAggregateFingerprint,
    profileRepositorySummaryFingerprint: profileSummary.summaryFingerprint,
    pureValidationResultFingerprint: validationResult.resultFingerprint,
    targetCount: input.packageValue.root.targetCount,
    wordTargetCount: input.packageValue.root.wordTargetCount,
    generationTargetCount: input.packageValue.root.generationTargetCount,
    repositoryOriginAuthority:
      "authenticated_project_repository_snapshot" as const,
    profileLifecycleAuthority: "published_head_observation_only" as const,
    dependencyResolutionAuthority:
      "authenticated_profile_stage_subset_only" as const,
    sourceAuthority: "structural_catalog_only" as const,
    candidateOriginAuthority: "none" as const,
    providerExecutionAuthority: "none" as const,
    audioByteAuthority: "none" as const,
    listeningEvidenceAuthority: "none" as const,
    deviceEvidenceAuthority: "none" as const,
    humanApprovalAuthority: "none" as const,
    runtimeKernelAuthority: "none" as const,
    executionAuthority: "none" as const,
    publicationAuthority: "none" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  };
  const summary = Object.freeze({
    ...summaryBody,
    summaryFingerprint: hashCanonicalBody(summaryBody),
  });
  const handle = Object.freeze(
    {},
  ) as V2FirebaseVoiceTargetsAuthenticatedInputHandleV1;
  const material = Object.freeze({
    plan: input.plan,
    workspace: input.workspace,
    candidate: input.candidate,
    packageValue: input.packageValue,
    packageInputs: input.packageInputs,
    validationResult,
    profiles,
    summary,
  });
  handles.add(handle);
  metadata.set(handle, material);
  return handle;
}

export function isV2FirebaseVoiceTargetsAuthenticatedInputHandleV1(
  value: unknown,
): value is V2FirebaseVoiceTargetsAuthenticatedInputHandleV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}

export function getV2FirebaseVoiceTargetsAuthenticatedInputSummaryV1(
  handle: V2FirebaseVoiceTargetsAuthenticatedInputHandleV1,
): V2FirebaseVoiceTargetsAuthenticatedInputSummaryV1 {
  const value = metadata.get(handle);
  if (!value) fail("v2_firebase_voice_targets_authenticated_input_invalid");
  return value.summary;
}

export function resolveV2FirebaseVoiceTargetsAuthenticatedInputMaterialV1(input: {
  readonly handle: V2FirebaseVoiceTargetsAuthenticatedInputHandleV1;
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly stageId: string;
}): V2FirebaseVoiceTargetsAuthenticatedInputMaterialV1 {
  const value = metadata.get(input.handle);
  if (
    !value ||
    value.plan !== input.plan ||
    value.workspace.stage.stageId !== input.stageId ||
    !isV2CanonicalSeasonPlanV2(input.plan)
  )
    fail("v2_firebase_voice_targets_authenticated_input_invalid");
  return value;
}
