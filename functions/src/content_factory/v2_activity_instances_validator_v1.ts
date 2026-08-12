import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  V2_ACTIVITY_INSTANCES_AUTHORING_ROOT_SCHEMA_V2,
  parseV2ActivityInstancesAuthoringRootV2,
  type V2ActivityInstancesAuthoringRootV2,
  type V2ActivitySessionCanonicalBytesInputV2,
  type V2GenerationCapabilitySnapshotV1,
} from "./v2_activity_instances_package_v2";
import {
  isV2CanonicalSeasonPlanV2,
  type V2CanonicalSeasonPlanV2,
} from "./v2_canonical_generation_plan_v2";
import {
  isV2CanonicalStageCandidateV2,
  isV2GenerationStageWorkspaceV2,
  type V2CanonicalStageCandidateV2,
  type V2GenerationStageWorkspaceV2,
} from "./v2_generation_workspace_contract_v2";

export const V2_ACTIVITY_INSTANCES_VALIDATION_RESULT_SCHEMA_V1 =
  "v2-activity-instances-validation-result.v1" as const;
export const V2_ACTIVITY_INSTANCES_VALIDATOR_ID_V1 =
  "learning-v2-activity-instances-validator" as const;
export const V2_ACTIVITY_INSTANCES_VALIDATOR_VERSION_V1 = 1 as const;
export const V2_ACTIVITY_INSTANCES_VALIDATION_MAX_ISSUES_V1 = 32 as const;
export const V2_ACTIVITY_INSTANCES_VALIDATION_RESULT_MAX_BYTES_V1 = 32 * 1024;

const CHECKED_RULE_CODES = Object.freeze([
  "activity_authority_ceiling",
  "activity_candidate_body_binding",
  "activity_candidate_content_disposition",
  "activity_candidate_workspace_binding",
  "activity_capability_snapshot_exact_match",
  "activity_session_projection_and_curriculum_contract",
] as const);

const VALIDATOR_RULES_FINGERPRINT = hashCanonicalBody({
  schemaVersion: "v2-activity-instances-validator-rules.v1",
  validatorId: V2_ACTIVITY_INSTANCES_VALIDATOR_ID_V1,
  validatorVersion: V2_ACTIVITY_INSTANCES_VALIDATOR_VERSION_V1,
  bodySchemaVersion: V2_ACTIVITY_INSTANCES_AUTHORING_ROOT_SCHEMA_V2,
  checkedRuleCodes: CHECKED_RULE_CODES,
  issueLimit: V2_ACTIVITY_INSTANCES_VALIDATION_MAX_ISSUES_V1,
  resultByteLimit: V2_ACTIVITY_INSTANCES_VALIDATION_RESULT_MAX_BYTES_V1,
  parserAuthority: "v2_activity_instances_authoring_root_parser_v2",
});

export interface V2ActivityInstancesValidationResultV1 {
  readonly schemaVersion: typeof V2_ACTIVITY_INSTANCES_VALIDATION_RESULT_SCHEMA_V1;
  readonly validatorProfile: Readonly<{
    id: typeof V2_ACTIVITY_INSTANCES_VALIDATOR_ID_V1;
    version: typeof V2_ACTIVITY_INSTANCES_VALIDATOR_VERSION_V1;
    rulesFingerprint: string;
  }>;
  readonly planFingerprint: string;
  readonly courseContractFingerprint: string;
  readonly workspaceFingerprint: string;
  readonly stageId: string;
  readonly episodeId: string;
  readonly candidateFingerprint: string;
  readonly bodySchemaVersion: string;
  readonly bodyFingerprint: string;
  readonly packageFingerprint: string | null;
  readonly capabilitySnapshotFingerprint: string | null;
  readonly validatedSessionCount: 12 | null;
  readonly validatedTaskCount: 144 | null;
  readonly checkedRuleCodes: typeof CHECKED_RULE_CODES;
  readonly blockingIssueCodes: readonly string[];
  readonly outcome: "blocked" | "eligible_for_human_review_only";
  readonly candidateClassification:
    | "production_candidate"
    | "nonproduction_candidate";
  readonly machineValidationAuthority: "deterministic_activity_instances_structural_semantic_checks_only";
  readonly sourceEvidenceAuthority: "unverified_canonical_bytes";
  readonly repositoryOriginAuthority: "none";
  readonly dependencyResolutionAuthority: "none";
  readonly artifactStorageAuthority: "none";
  readonly humanReviewState: "not_evaluated";
  readonly humanReviewAuthority: "none";
  readonly humanApprovalAuthority: "none";
  readonly specialistEvidenceAuthority: "none";
  readonly deviceEvidenceAuthority: "none";
  readonly listeningEvidenceAuthority: "none";
  readonly walletAuthority: "none";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
  readonly completionAuthority: "none";
  readonly runtimeKernelAuthority: "none";
  readonly executionAuthority: "none";
  readonly publicationPolicy: "draft_only_no_consumer";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly resultFingerprint: string;
}

const resultHandles = new WeakSet<object>();

function fail(code: string): never {
  throw new Error(code);
}

function exactInputKeys(value: object): boolean {
  return (
    Object.keys(value).sort().join("|") ===
    [
      "candidate",
      "expectedCapabilitySnapshot",
      "plan",
      "sessionBytes",
      "workspace",
    ]
      .sort()
      .join("|")
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

function exactTrustedBinding(input: {
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly workspace: V2GenerationStageWorkspaceV2;
  readonly candidate: V2CanonicalStageCandidateV2;
}): void {
  const { plan, workspace, candidate } = input;
  if (
    workspace.planFingerprint !== plan.planFingerprint ||
    workspace.courseContractFingerprint !==
      plan.courseContract.courseContractFingerprint ||
    workspace.stage.kind !== "v2_activity_instances" ||
    workspace.stage.episodeId === null ||
    workspace.stage.locale !== null ||
    candidate.workspaceFingerprint !== workspace.workspaceFingerprint ||
    candidate.planFingerprint !== plan.planFingerprint ||
    candidate.stageId !== workspace.stage.stageId ||
    candidate.stageKind !== workspace.stage.kind ||
    candidate.subjectFingerprint !== workspace.subject.subjectFingerprint ||
    candidate.dependencySnapshotFingerprint !==
      workspace.dependencySnapshotFingerprint ||
    workspace.capabilityBinding.kind !== "activity_instances" ||
    candidate.capabilityBindingFingerprint !==
      workspace.capabilityBinding.bindingFingerprint
  ) {
    fail("v2_activity_instances_validator_binding_invalid");
  }
}

function sortedIssues(values: readonly string[]): readonly string[] {
  const result = [...new Set(values)].sort((left, right) =>
    left < right ? -1 : left > right ? 1 : 0,
  );
  if (result.length > V2_ACTIVITY_INSTANCES_VALIDATION_MAX_ISSUES_V1)
    fail("v2_activity_instances_validator_issue_limit_exceeded");
  return Object.freeze(result);
}

function resultBody(
  input: {
    readonly plan: V2CanonicalSeasonPlanV2;
    readonly workspace: V2GenerationStageWorkspaceV2;
    readonly candidate: V2CanonicalStageCandidateV2;
  },
  root: V2ActivityInstancesAuthoringRootV2 | null,
  issues: readonly string[],
) {
  const blockingIssueCodes = sortedIssues(issues);
  return deepFreeze({
    schemaVersion: V2_ACTIVITY_INSTANCES_VALIDATION_RESULT_SCHEMA_V1,
    validatorProfile: Object.freeze({
      id: V2_ACTIVITY_INSTANCES_VALIDATOR_ID_V1,
      version: V2_ACTIVITY_INSTANCES_VALIDATOR_VERSION_V1,
      rulesFingerprint: VALIDATOR_RULES_FINGERPRINT,
    }),
    planFingerprint: input.plan.planFingerprint,
    courseContractFingerprint:
      input.plan.courseContract.courseContractFingerprint,
    workspaceFingerprint: input.workspace.workspaceFingerprint,
    stageId: input.workspace.stage.stageId,
    episodeId: input.workspace.stage.episodeId as string,
    candidateFingerprint: input.candidate.candidateFingerprint,
    bodySchemaVersion: input.candidate.bodySchemaVersion,
    bodyFingerprint: input.candidate.bodyFingerprint,
    packageFingerprint: root?.packageFingerprint ?? null,
    capabilitySnapshotFingerprint:
      root?.capabilitySnapshot.snapshotFingerprint ?? null,
    validatedSessionCount: root === null ? null : (12 as const),
    validatedTaskCount: root === null ? null : (144 as const),
    checkedRuleCodes: CHECKED_RULE_CODES,
    blockingIssueCodes,
    outcome:
      blockingIssueCodes.length === 0
        ? ("eligible_for_human_review_only" as const)
        : ("blocked" as const),
    candidateClassification:
      input.candidate.contentClass === "production_candidate"
        ? ("production_candidate" as const)
        : ("nonproduction_candidate" as const),
    machineValidationAuthority:
      "deterministic_activity_instances_structural_semantic_checks_only" as const,
    sourceEvidenceAuthority: "unverified_canonical_bytes" as const,
    repositoryOriginAuthority: "none" as const,
    dependencyResolutionAuthority: "none" as const,
    artifactStorageAuthority: "none" as const,
    humanReviewState: "not_evaluated" as const,
    humanReviewAuthority: "none" as const,
    humanApprovalAuthority: "none" as const,
    specialistEvidenceAuthority: "none" as const,
    deviceEvidenceAuthority: "none" as const,
    listeningEvidenceAuthority: "none" as const,
    walletAuthority: "none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    completionAuthority: "none" as const,
    runtimeKernelAuthority: "none" as const,
    executionAuthority: "none" as const,
    publicationPolicy: "draft_only_no_consumer" as const,
    publicationAuthority: "none" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  });
}

export function validateV2ActivityInstancesCandidateV1(input: {
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly workspace: V2GenerationStageWorkspaceV2;
  readonly candidate: V2CanonicalStageCandidateV2;
  readonly sessionBytes: readonly V2ActivitySessionCanonicalBytesInputV2[];
  readonly expectedCapabilitySnapshot: V2GenerationCapabilitySnapshotV1;
}): V2ActivityInstancesValidationResultV1 {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input) ||
    !exactInputKeys(input) ||
    !isV2CanonicalSeasonPlanV2(input.plan) ||
    !isV2GenerationStageWorkspaceV2(input.workspace) ||
    !isV2CanonicalStageCandidateV2(input.candidate)
  ) {
    fail("v2_activity_instances_validator_input_untrusted");
  }
  exactTrustedBinding(input);

  const issues: string[] = [];
  if (
    input.candidate.bodySchemaVersion !==
    V2_ACTIVITY_INSTANCES_AUTHORING_ROOT_SCHEMA_V2
  ) {
    issues.push("v2_activity_instances_body_schema_invalid");
  }
  if (input.candidate.contentClass !== "production_candidate") {
    issues.push("v2_activity_instances_nonproduction_content_forbidden");
  }

  let root: V2ActivityInstancesAuthoringRootV2 | null = null;
  if (
    input.candidate.bodySchemaVersion ===
    V2_ACTIVITY_INSTANCES_AUTHORING_ROOT_SCHEMA_V2
  ) {
    try {
      const rootRaw = canonicalJsonV1(input.candidate.body);
      if (
        input.candidate.bodyFingerprint !==
        hashCanonicalBody(input.candidate.body)
      ) {
        issues.push("v2_activity_instances_candidate_body_binding_invalid");
      } else {
        root = parseV2ActivityInstancesAuthoringRootV2(
          rootRaw,
          input.plan,
          input.workspace.stage.stageId,
          input.sessionBytes,
        );
      }
    } catch {
      issues.push("v2_activity_instances_package_invalid");
      root = null;
    }
  }

  if (root !== null) {
    let capabilityMatches = false;
    try {
      capabilityMatches =
        canonicalJsonV1(root.capabilitySnapshot) ===
        canonicalJsonV1(input.expectedCapabilitySnapshot);
    } catch {
      capabilityMatches = false;
    }
    if (!capabilityMatches) {
      issues.push("v2_activity_instances_capability_snapshot_mismatch");
    }
  }

  const body = resultBody(input, root, issues);
  const result = deepFreeze({
    ...body,
    resultFingerprint: hashCanonicalBody(body),
  }) as V2ActivityInstancesValidationResultV1;
  if (
    utf8ByteLengthV1(canonicalJsonV1(result)) >
    V2_ACTIVITY_INSTANCES_VALIDATION_RESULT_MAX_BYTES_V1
  ) {
    fail("v2_activity_instances_validator_result_oversize");
  }
  resultHandles.add(result);
  return result;
}

export function isV2ActivityInstancesValidationResultV1(
  value: unknown,
): value is V2ActivityInstancesValidationResultV1 {
  return (
    typeof value === "object" && value !== null && resultHandles.has(value)
  );
}
