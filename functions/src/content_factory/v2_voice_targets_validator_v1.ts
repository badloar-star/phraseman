import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  V2_STAGE_VALIDATOR_REGISTRY_V2,
  isV2CanonicalStageCandidateV2,
  isV2GenerationStageWorkspaceV2,
  type V2CanonicalStageCandidateV2,
  type V2GenerationStageWorkspaceV2,
} from "./v2_generation_workspace_contract_v2";
import {
  isV2CanonicalSeasonPlanV2,
  type V2CanonicalSeasonPlanV2,
} from "./v2_canonical_generation_plan_v2";
import {
  V2_VOICE_TARGETS_ARTIFACT_SCHEMA_V2,
  isV2VoiceTargetsPackageBoundToV2,
  type V2VoiceTargetsMaterializationInputV2,
  type V2VoiceTargetsPackageV2,
} from "./v2_voice_targets_package_v2";

export const V2_VOICE_TARGETS_VALIDATION_RESULT_SCHEMA_V1 =
  "v2-voice-targets-validation-result.v1" as const;
export const V2_VOICE_TARGETS_VALIDATOR_ID_V1 =
  "learning-v2-voice-targets-validator" as const;
export const V2_VOICE_TARGETS_VALIDATOR_VERSION_V1 = 1 as const;

export interface V2VoiceTargetsValidationResultV1 {
  readonly schemaVersion: typeof V2_VOICE_TARGETS_VALIDATION_RESULT_SCHEMA_V1;
  readonly validatorId: typeof V2_VOICE_TARGETS_VALIDATOR_ID_V1;
  readonly validatorVersion: typeof V2_VOICE_TARGETS_VALIDATOR_VERSION_V1;
  readonly validatorRulesFingerprint: string;
  readonly registryFingerprint: string;
  readonly planFingerprint: string;
  readonly workspaceFingerprint: string;
  readonly stageId: string;
  readonly candidateFingerprint: string;
  readonly bodySchemaVersion: typeof V2_VOICE_TARGETS_ARTIFACT_SCHEMA_V2;
  readonly packageFingerprint: string;
  readonly sessionCount: 12;
  readonly targetCount: number;
  readonly wordTargetCount: number;
  readonly variantCount: number;
  readonly generationTargetCount: number;
  readonly checkedRuleCodes: readonly string[];
  readonly blockingIssueCodes: readonly string[];
  readonly outcome: "blocked" | "eligible_for_human_review_only";
  readonly machineValidationAuthority: "deterministic_voice_target_identity_checks_only";
  readonly repositoryAuthority: "none";
  readonly profileLifecycleAuthority: "none";
  readonly sourceAuthority: "structural_catalog_only";
  readonly providerExecutionAuthority: "none";
  readonly audioByteAuthority: "none";
  readonly listeningEvidenceAuthority: "none";
  readonly deviceEvidenceAuthority: "none";
  readonly humanReviewAuthority: "none";
  readonly executionAuthority: "none";
  readonly publicationPolicy: "draft_only_no_consumer";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly resultFingerprint: string;
}

const resultHandles = new WeakSet<object>();
export const V2_VOICE_TARGETS_CHECKED_RULE_CODES_V1 = Object.freeze(
  [
    "v2_voice_targets_exact_trusted_binding",
    "v2_voice_targets_exact_source_derived_package",
    "v2_voice_targets_exact_12_session_shards",
    "v2_voice_targets_exact_four_ordered_voices",
    "v2_voice_targets_one_voice_index_per_task",
    "v2_voice_targets_full_phrase_and_word_identity_complete",
    "v2_voice_targets_public_authority_ceiling",
  ].sort(),
);
export const V2_VOICE_TARGETS_VALIDATOR_RULES_FINGERPRINT_V1 =
  hashCanonicalBody({
    schemaVersion: "v2-voice-targets-validator-rules.v1",
    validatorId: V2_VOICE_TARGETS_VALIDATOR_ID_V1,
    validatorVersion: V2_VOICE_TARGETS_VALIDATOR_VERSION_V1,
    checkedRuleCodes: V2_VOICE_TARGETS_CHECKED_RULE_CODES_V1,
    requiredBodySchemaVersion: V2_VOICE_TARGETS_ARTIFACT_SCHEMA_V2,
  });

function fail(code: string): never {
  throw new Error(code);
}

export function validateV2VoiceTargetsCandidateV1(
  input: Readonly<{
    plan: V2CanonicalSeasonPlanV2;
    workspace: V2GenerationStageWorkspaceV2;
    candidate: V2CanonicalStageCandidateV2;
    packageValue: V2VoiceTargetsPackageV2;
    packageInputs: V2VoiceTargetsMaterializationInputV2;
  }>,
): V2VoiceTargetsValidationResultV1 {
  if (!isV2CanonicalSeasonPlanV2(input.plan))
    fail("v2_voice_targets_validator_plan_untrusted");
  if (!isV2GenerationStageWorkspaceV2(input.workspace))
    fail("v2_voice_targets_validator_workspace_untrusted");
  if (!isV2CanonicalStageCandidateV2(input.candidate))
    fail("v2_voice_targets_validator_candidate_untrusted");
  if (
    input.workspace.planFingerprint !== input.plan.planFingerprint ||
    input.candidate.planFingerprint !== input.plan.planFingerprint ||
    input.candidate.workspaceFingerprint !==
      input.workspace.workspaceFingerprint ||
    input.workspace.stage.stageId !== input.candidate.stageId ||
    input.workspace.stage.kind !== "v2_voice_targets" ||
    input.candidate.stageKind !== "v2_voice_targets" ||
    input.candidate.bodySchemaVersion !== V2_VOICE_TARGETS_ARTIFACT_SCHEMA_V2 ||
    input.packageInputs.plan !== input.plan ||
    input.packageInputs.workspace !== input.workspace ||
    !isV2VoiceTargetsPackageBoundToV2(
      input.packageValue,
      input.packageInputs,
    ) ||
    input.candidate.bodyFingerprint !==
      hashCanonicalBody(input.packageValue.root) ||
    canonicalJsonV1(input.candidate.body) !==
      canonicalJsonV1(input.packageValue.root)
  )
    fail("v2_voice_targets_validator_binding_invalid");

  const blockingIssueCodes =
    input.candidate.contentClass === "production_candidate"
      ? Object.freeze([] as string[])
      : Object.freeze(["v2_voice_targets_nonproduction_content_forbidden"]);
  const body = {
    schemaVersion: V2_VOICE_TARGETS_VALIDATION_RESULT_SCHEMA_V1,
    validatorId: V2_VOICE_TARGETS_VALIDATOR_ID_V1,
    validatorVersion: V2_VOICE_TARGETS_VALIDATOR_VERSION_V1,
    validatorRulesFingerprint: V2_VOICE_TARGETS_VALIDATOR_RULES_FINGERPRINT_V1,
    registryFingerprint: hashCanonicalBody(V2_STAGE_VALIDATOR_REGISTRY_V2),
    planFingerprint: input.plan.planFingerprint,
    workspaceFingerprint: input.workspace.workspaceFingerprint,
    stageId: input.workspace.stage.stageId,
    candidateFingerprint: input.candidate.candidateFingerprint,
    bodySchemaVersion: V2_VOICE_TARGETS_ARTIFACT_SCHEMA_V2,
    packageFingerprint: input.packageValue.root.artifactFingerprint,
    sessionCount: 12 as const,
    targetCount: input.packageValue.root.targetCount,
    wordTargetCount: input.packageValue.root.wordTargetCount,
    variantCount: input.packageValue.root.variantCount,
    generationTargetCount: input.packageValue.root.generationTargetCount,
    checkedRuleCodes: V2_VOICE_TARGETS_CHECKED_RULE_CODES_V1,
    blockingIssueCodes,
    outcome:
      blockingIssueCodes.length === 0
        ? ("eligible_for_human_review_only" as const)
        : ("blocked" as const),
    machineValidationAuthority:
      "deterministic_voice_target_identity_checks_only" as const,
    repositoryAuthority: "none" as const,
    profileLifecycleAuthority: "none" as const,
    sourceAuthority: "structural_catalog_only" as const,
    providerExecutionAuthority: "none" as const,
    audioByteAuthority: "none" as const,
    listeningEvidenceAuthority: "none" as const,
    deviceEvidenceAuthority: "none" as const,
    humanReviewAuthority: "none" as const,
    executionAuthority: "none" as const,
    publicationPolicy: "draft_only_no_consumer" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  };
  const result = Object.freeze({
    ...body,
    resultFingerprint: hashCanonicalBody(body),
  });
  resultHandles.add(result);
  return result;
}

export const isV2VoiceTargetsValidationResultV1 = (
  value: unknown,
): value is V2VoiceTargetsValidationResultV1 =>
  typeof value === "object" && value !== null && resultHandles.has(value);
