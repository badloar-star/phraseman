import { createHash } from "node:crypto";
import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  parseV2ActivityInstancesUntrustedRootManifestPermitsV2,
  type V2ActivityInstancesUntrustedReadPermitAggregateV2,
} from "./v2_activity_instances_package_v2";
import {
  readbackV2ActivityInstancesChildrenV1,
  type V2ActivityInstancesChildReadbackV1,
} from "./v2_activity_instances_child_readback_v1";
import {
  isV2ActivityInstancesValidationResultV1,
  validateV2ActivityInstancesCandidateV1,
  type V2ActivityInstancesValidationResultV1,
} from "./v2_activity_instances_validator_v1";
import type { V2CanonicalSeasonPlanV2 } from "./v2_canonical_generation_plan_v2";
import {
  bindV2FirebaseActivityStageCommitToActivityInstancesValidatorV1,
  getV2FirebaseActivityInstancesValidatorInputSummaryV1,
  getV2FirebaseActivityStageCommitSummaryV1,
  resolveV2FirebaseActivityInstancesValidatorInputMaterialV1,
  type V2FirebaseActivityStageCommitHandleV1,
} from "./v2_firebase_activity_stage_commit_adapter_v1";
import { createV2FirebaseAdminRepositoryIoV1 } from "./v2_firebase_admin_repository_io_v1";
import { resolveV2FirebaseAuthenticatedActivityStageValidatorCapabilitySnapshotV1 } from "./v2_firebase_authenticated_repository_adapter_v1";
import { V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1 } from "./v2_firebase_repository_persistence_v1";

export const V2_FIREBASE_ACTIVITY_INSTANCES_VALIDATOR_SUMMARY_SCHEMA_V1 =
  "v2-firebase-activity-instances-validator-summary.v1" as const;
export const V2_FIREBASE_ACTIVITY_INSTANCES_VALIDATOR_CHILD_READ_CONCURRENCY_V1 =
  4 as const;

const CHILD_NAMESPACE_BODY = Object.freeze({
  schemaVersion: "v2-activity-instances-validator-child-namespace.v1",
  pathPolicy:
    "learning-v2/canonical/activity-instances/{sha256(stageId)}/sessions/{ordinal}/{kind}/{contentHash}.json",
  contentType: V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
  exactObjectCount: 48,
  readConcurrency:
    V2_FIREBASE_ACTIVITY_INSTANCES_VALIDATOR_CHILD_READ_CONCURRENCY_V1,
});
export const V2_FIREBASE_ACTIVITY_INSTANCES_VALIDATOR_CHILD_NAMESPACE_FINGERPRINT_V1 =
  hashCanonicalBody(CHILD_NAMESPACE_BODY);

export interface V2FirebaseActivityInstancesValidatorResultHandleV1 {
  readonly kind: "v2_firebase_activity_instances_validator_result_handle";
}

export interface V2FirebaseActivityInstancesValidatorSummaryV1 {
  readonly schemaVersion: typeof V2_FIREBASE_ACTIVITY_INSTANCES_VALIDATOR_SUMMARY_SCHEMA_V1;
  readonly childNamespaceFingerprint: string;
  readonly planFingerprint: string;
  readonly courseContractFingerprint: string;
  readonly workspaceFingerprint: string;
  readonly stageId: string;
  readonly episodeId: string;
  readonly candidateFingerprint: string;
  readonly bodySchemaVersion: string;
  readonly bodyFingerprint: string;
  readonly repositoryOriginReceiptFingerprint: string;
  readonly repositoryObservationFingerprint: string;
  readonly authenticatedStageBindingFingerprint: string;
  readonly outerReceiptFingerprint: string;
  readonly committedManifestFingerprint: string;
  readonly committedOperationFingerprint: string;
  readonly permitAggregateFingerprint: string | null;
  readonly childReadbackAggregateFingerprint: string | null;
  readonly storageReadbackFingerprint: string | null;
  readonly childObjectCount: 48 | null;
  readonly childTotalByteSize: number | null;
  readonly pureValidationResultFingerprint: string;
  readonly packageFingerprint: string | null;
  readonly expectedCapabilitySnapshotFingerprint: string;
  readonly candidateCapabilitySnapshotFingerprint: string | null;
  readonly validatedSessionCount: 12 | null;
  readonly validatedTaskCount: 144 | null;
  readonly outcome: "blocked" | "eligible_for_human_review_only";
  readonly repositoryOriginAuthority: "authenticated_repository_snapshot_only";
  readonly dependencyResolutionAuthority: "authenticated_repository_stage_subset_only";
  readonly artifactStorageAuthority:
    | "firebase_admin_generation_pinned_readback"
    | "none";
  readonly machineValidationAuthority: "deterministic_activity_instances_structural_semantic_checks_only";
  readonly candidateOriginAuthority: "none";
  readonly humanReviewAuthority: "none";
  readonly specialistEvidenceAuthority: "none";
  readonly deviceEvidenceAuthority: "none";
  readonly listeningEvidenceAuthority: "none";
  readonly walletAuthority: "none";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
  readonly completionAuthority: "none";
  readonly runtimeKernelAuthority: "none";
  readonly executionAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly summaryFingerprint: string;
}

export interface V2FirebaseActivityInstancesValidatorAdapterV1 {
  validateCommittedActivityInstances(input: {
    readonly plan: V2CanonicalSeasonPlanV2;
    readonly commitHandle: V2FirebaseActivityStageCommitHandleV1;
  }): Promise<V2FirebaseActivityInstancesValidatorResultHandleV1>;
}

export interface V2FirebaseActivityInstancesValidatorResultMaterialV1 {
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly summary: V2FirebaseActivityInstancesValidatorSummaryV1;
  readonly pureValidationResult: V2ActivityInstancesValidationResultV1;
}

export interface V2FirebaseActivityInstancesPublicationSessionMaterialV1 {
  readonly planFingerprint: string;
  readonly courseContractFingerprint: string;
  readonly stageId: string;
  readonly episodeId: string;
  readonly sessionOrdinal: number;
  readonly sessionId: string;
  readonly packageFingerprint: string;
  readonly validatorSummaryFingerprint: string;
  readonly permitAggregateFingerprint: string;
  readonly childReadbackAggregateFingerprint: string;
  readonly storageReadbackFingerprint: string;
  readonly renderRaw: string;
  readonly capsuleEnvelopeRaw: string;
  readonly renderPin: Readonly<{
    readonly objectPath: string;
    readonly contentHash: string;
    readonly objectGeneration: string;
    readonly byteSize: number;
    readonly contentType: "application/json; charset=utf-8";
  }>;
  readonly capsulePin: Readonly<{
    readonly objectPath: string;
    readonly contentHash: string;
    readonly objectGeneration: string;
    readonly byteSize: number;
    readonly contentType: "application/json; charset=utf-8";
  }>;
  readonly repositoryOriginAuthority: "authenticated_repository_snapshot_only";
  readonly artifactStorageAuthority: "firebase_admin_generation_pinned_readback";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
}

export interface V2FirebaseActivityInstancesServerEvaluatorSessionMaterialV1 {
  readonly planFingerprint: string;
  readonly courseContractFingerprint: string;
  readonly stageId: string;
  readonly episodeId: string;
  readonly sessionOrdinal: number;
  readonly sessionId: string;
  readonly packageFingerprint: string;
  readonly validatorSummaryFingerprint: string;
  readonly permitAggregateFingerprint: string;
  readonly childReadbackAggregateFingerprint: string;
  readonly storageReadbackFingerprint: string;
  readonly sidecarRaw: string;
  readonly sidecarPin: Readonly<{
    readonly objectPath: string;
    readonly contentHash: string;
    readonly objectGeneration: string;
    readonly byteSize: number;
    readonly contentType: "application/json; charset=utf-8";
  }>;
  readonly repositoryOriginAuthority: "authenticated_repository_snapshot_only";
  readonly artifactStorageAuthority: "firebase_admin_generation_pinned_readback";
  readonly evaluatorKeyDelivery: "server_only_never_learner_projection";
  readonly evaluationAuthority: "candidate_only_server_policy_required";
  readonly walletAuthority: "none";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
  readonly completionAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
}

interface V2FirebaseActivityInstancesPublicationMaterialV1 {
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly summary: V2FirebaseActivityInstancesValidatorSummaryV1;
  readonly permitAggregate: V2ActivityInstancesUntrustedReadPermitAggregateV2;
  readonly childReadback: V2ActivityInstancesChildReadbackV1;
}

const resultHandles = new WeakSet<object>();
const resultSummaries = new WeakMap<
  object,
  V2FirebaseActivityInstancesValidatorSummaryV1
>();
const resultMaterials = new WeakMap<
  object,
  V2FirebaseActivityInstancesValidatorResultMaterialV1
>();
const publicationMaterials = new WeakMap<
  object,
  V2FirebaseActivityInstancesPublicationMaterialV1
>();
const utf8 = new TextEncoder();

function fail(code: string): never {
  throw new Error(code);
}

function assertPureResult(
  result: V2ActivityInstancesValidationResultV1,
  expected: {
    readonly planFingerprint: string;
    readonly courseContractFingerprint: string;
    readonly workspaceFingerprint: string;
    readonly stageId: string;
    readonly episodeId: string;
    readonly candidateFingerprint: string;
    readonly bodyFingerprint: string;
    readonly packageFingerprint: string | null;
    readonly expectedCapabilitySnapshotFingerprint: string;
  },
): void {
  if (
    !isV2ActivityInstancesValidationResultV1(result) ||
    result.planFingerprint !== expected.planFingerprint ||
    result.courseContractFingerprint !== expected.courseContractFingerprint ||
    result.workspaceFingerprint !== expected.workspaceFingerprint ||
    result.stageId !== expected.stageId ||
    result.episodeId !== expected.episodeId ||
    result.candidateFingerprint !== expected.candidateFingerprint ||
    result.bodyFingerprint !== expected.bodyFingerprint ||
    (expected.packageFingerprint !== null &&
      result.packageFingerprint !== expected.packageFingerprint) ||
    (expected.packageFingerprint === null &&
      result.packageFingerprint !== null) ||
    (result.capabilitySnapshotFingerprint !== null &&
      result.capabilitySnapshotFingerprint !==
        expected.expectedCapabilitySnapshotFingerprint) ||
    (result.packageFingerprint === null &&
      (result.validatedSessionCount !== null ||
        result.validatedTaskCount !== null)) ||
    (result.packageFingerprint !== null &&
      (result.validatedSessionCount !== 12 ||
        result.validatedTaskCount !== 144)) ||
    (result.outcome === "eligible_for_human_review_only" &&
      (result.packageFingerprint === null ||
        result.capabilitySnapshotFingerprint !==
          expected.expectedCapabilitySnapshotFingerprint ||
        result.validatedSessionCount !== 12 ||
        result.validatedTaskCount !== 144))
  ) {
    fail("v2_firebase_activity_instances_validator_pure_result_mismatch");
  }
}

export function isV2FirebaseActivityInstancesValidatorResultHandleV1(
  value: unknown,
): value is V2FirebaseActivityInstancesValidatorResultHandleV1 {
  return (
    typeof value === "object" && value !== null && resultHandles.has(value)
  );
}

export function getV2FirebaseActivityInstancesValidatorSummaryV1(
  handle: V2FirebaseActivityInstancesValidatorResultHandleV1,
): V2FirebaseActivityInstancesValidatorSummaryV1 {
  const summary = resultSummaries.get(handle);
  if (!summary)
    fail("v2_firebase_activity_instances_validator_result_handle_invalid");
  return summary;
}

export function resolveV2FirebaseActivityInstancesValidatorResultMaterialV1(input: {
  readonly handle: V2FirebaseActivityInstancesValidatorResultHandleV1;
  readonly plan: V2CanonicalSeasonPlanV2;
}): V2FirebaseActivityInstancesValidatorResultMaterialV1 {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input) ||
    Object.keys(input).sort().join("|") !== "handle|plan"
  ) {
    fail("v2_firebase_activity_instances_validator_result_resolve_invalid");
  }
  const material = resultMaterials.get(input.handle);
  if (!material || material.plan !== input.plan)
    fail("v2_firebase_activity_instances_validator_result_resolve_invalid");
  return material;
}

function exactRawPin(
  raw: string,
  permit: V2ActivityInstancesUntrustedReadPermitAggregateV2["permits"][number],
): Readonly<{
  readonly objectPath: string;
  readonly contentHash: string;
  readonly objectGeneration: string;
  readonly byteSize: number;
  readonly contentType: "application/json; charset=utf-8";
}> {
  const bytes = utf8.encode(raw);
  if (
    bytes.byteLength !== permit.declaredByteSize ||
    createHash("sha256").update(bytes).digest("hex") !== permit.contentHash
  ) {
    fail("v2_firebase_activity_instances_publication_session_bytes_mismatch");
  }
  return Object.freeze({
    objectPath: permit.objectPath,
    contentHash: permit.contentHash,
    objectGeneration: permit.objectGeneration,
    byteSize: permit.declaredByteSize,
    contentType: V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
  });
}

export function resolveV2FirebaseActivityInstancesPublicationSessionMaterialV1(input: {
  readonly handle: V2FirebaseActivityInstancesValidatorResultHandleV1;
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly sessionOrdinal: number;
}): V2FirebaseActivityInstancesPublicationSessionMaterialV1 {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input) ||
    Object.keys(input).sort().join("|") !== "handle|plan|sessionOrdinal" ||
    !Number.isSafeInteger(input.sessionOrdinal) ||
    input.sessionOrdinal < 1 ||
    input.sessionOrdinal > 12
  ) {
    fail("v2_firebase_activity_instances_publication_session_resolve_invalid");
  }
  const material = publicationMaterials.get(input.handle);
  if (
    !material ||
    material.plan !== input.plan ||
    material.summary.outcome !== "eligible_for_human_review_only" ||
    material.summary.packageFingerprint === null ||
    material.summary.permitAggregateFingerprint === null ||
    material.summary.childReadbackAggregateFingerprint === null ||
    material.summary.storageReadbackFingerprint === null ||
    material.summary.childObjectCount !== 48 ||
    material.summary.validatedSessionCount !== 12 ||
    material.summary.validatedTaskCount !== 144
  ) {
    fail("v2_firebase_activity_instances_publication_session_resolve_invalid");
  }
  const session = material.childReadback.sessions[input.sessionOrdinal - 1];
  const renderPermit =
    material.permitAggregate.permits[(input.sessionOrdinal - 1) * 4 + 1];
  const capsulePermit =
    material.permitAggregate.permits[(input.sessionOrdinal - 1) * 4 + 2];
  if (
    !session ||
    !renderPermit ||
    !capsulePermit ||
    session.sessionOrdinal !== input.sessionOrdinal ||
    renderPermit.sessionOrdinal !== input.sessionOrdinal ||
    capsulePermit.sessionOrdinal !== input.sessionOrdinal ||
    renderPermit.sessionId !== session.sessionId ||
    capsulePermit.sessionId !== session.sessionId ||
    renderPermit.kind !== "render" ||
    capsulePermit.kind !== "capsule" ||
    session.objectGenerations.render !== renderPermit.objectGeneration ||
    session.objectGenerations.capsule !== capsulePermit.objectGeneration
  ) {
    fail(
      "v2_firebase_activity_instances_publication_session_material_mismatch",
    );
  }
  return Object.freeze({
    planFingerprint: material.summary.planFingerprint,
    courseContractFingerprint: material.summary.courseContractFingerprint,
    stageId: material.summary.stageId,
    episodeId: material.summary.episodeId,
    sessionOrdinal: input.sessionOrdinal,
    sessionId: session.sessionId,
    packageFingerprint: material.summary.packageFingerprint,
    validatorSummaryFingerprint: material.summary.summaryFingerprint,
    permitAggregateFingerprint: material.summary.permitAggregateFingerprint,
    childReadbackAggregateFingerprint:
      material.summary.childReadbackAggregateFingerprint,
    storageReadbackFingerprint: material.summary.storageReadbackFingerprint,
    renderRaw: session.renderRaw,
    capsuleEnvelopeRaw: session.capsuleEnvelopeRaw,
    renderPin: exactRawPin(session.renderRaw, renderPermit),
    capsulePin: exactRawPin(session.capsuleEnvelopeRaw, capsulePermit),
    repositoryOriginAuthority:
      "authenticated_repository_snapshot_only" as const,
    artifactStorageAuthority:
      "firebase_admin_generation_pinned_readback" as const,
    publicationAuthority: "none" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  });
}

export function resolveV2FirebaseActivityInstancesServerEvaluatorSessionMaterialV1(input: {
  readonly handle: V2FirebaseActivityInstancesValidatorResultHandleV1;
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly sessionOrdinal: number;
}): V2FirebaseActivityInstancesServerEvaluatorSessionMaterialV1 {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input) ||
    Object.keys(input).sort().join("|") !== "handle|plan|sessionOrdinal" ||
    !Number.isSafeInteger(input.sessionOrdinal) ||
    input.sessionOrdinal < 1 ||
    input.sessionOrdinal > 12
  ) {
    fail("v2_firebase_activity_instances_server_evaluator_resolve_invalid");
  }
  const material = publicationMaterials.get(input.handle);
  if (
    !material ||
    material.plan !== input.plan ||
    material.summary.outcome !== "eligible_for_human_review_only" ||
    material.summary.packageFingerprint === null ||
    material.summary.permitAggregateFingerprint === null ||
    material.summary.childReadbackAggregateFingerprint === null ||
    material.summary.storageReadbackFingerprint === null ||
    material.summary.childObjectCount !== 48 ||
    material.summary.validatedSessionCount !== 12 ||
    material.summary.validatedTaskCount !== 144
  ) {
    fail("v2_firebase_activity_instances_server_evaluator_resolve_invalid");
  }
  const session = material.childReadback.sessions[input.sessionOrdinal - 1];
  const sidecarPermit =
    material.permitAggregate.permits[(input.sessionOrdinal - 1) * 4 + 3];
  if (
    !session ||
    !sidecarPermit ||
    session.sessionOrdinal !== input.sessionOrdinal ||
    sidecarPermit.sessionOrdinal !== input.sessionOrdinal ||
    sidecarPermit.sessionId !== session.sessionId ||
    sidecarPermit.kind !== "sidecar" ||
    session.objectGenerations.sidecar !== sidecarPermit.objectGeneration
  ) {
    fail("v2_firebase_activity_instances_server_evaluator_material_mismatch");
  }
  return Object.freeze({
    planFingerprint: material.summary.planFingerprint,
    courseContractFingerprint: material.summary.courseContractFingerprint,
    stageId: material.summary.stageId,
    episodeId: material.summary.episodeId,
    sessionOrdinal: input.sessionOrdinal,
    sessionId: session.sessionId,
    packageFingerprint: material.summary.packageFingerprint,
    validatorSummaryFingerprint: material.summary.summaryFingerprint,
    permitAggregateFingerprint: material.summary.permitAggregateFingerprint,
    childReadbackAggregateFingerprint:
      material.summary.childReadbackAggregateFingerprint,
    storageReadbackFingerprint: material.summary.storageReadbackFingerprint,
    sidecarRaw: session.sidecarRaw,
    sidecarPin: exactRawPin(session.sidecarRaw, sidecarPermit),
    repositoryOriginAuthority:
      "authenticated_repository_snapshot_only" as const,
    artifactStorageAuthority:
      "firebase_admin_generation_pinned_readback" as const,
    evaluatorKeyDelivery: "server_only_never_learner_projection" as const,
    evaluationAuthority: "candidate_only_server_policy_required" as const,
    walletAuthority: "none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    completionAuthority: "none" as const,
    publicationAuthority: "none" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  });
}

export function createFirebaseAdminV2ActivityInstancesValidatorAdapterV1(): V2FirebaseActivityInstancesValidatorAdapterV1 {
  const io = createV2FirebaseAdminRepositoryIoV1();
  return Object.freeze({
    validateCommittedActivityInstances: async (input: {
      readonly plan: V2CanonicalSeasonPlanV2;
      readonly commitHandle: V2FirebaseActivityStageCommitHandleV1;
    }) => {
      if (
        typeof input !== "object" ||
        input === null ||
        Array.isArray(input) ||
        Object.keys(input).sort().join("|") !== "commitHandle|plan"
      ) {
        fail("v2_firebase_activity_instances_validator_input_invalid");
      }
      const commitSummary = getV2FirebaseActivityStageCommitSummaryV1(
        input.commitHandle,
      );
      const validatorInput =
        bindV2FirebaseActivityStageCommitToActivityInstancesValidatorV1({
          commitHandle: input.commitHandle,
          plan: input.plan,
          stageId: commitSummary.stageId,
        });
      const inputSummary =
        getV2FirebaseActivityInstancesValidatorInputSummaryV1(validatorInput);
      const material =
        resolveV2FirebaseActivityInstancesValidatorInputMaterialV1({
          inputHandle: validatorInput,
          plan: input.plan,
          stageId: commitSummary.stageId,
        });
      if (
        commitSummary.planFingerprint !== inputSummary.planFingerprint ||
        commitSummary.courseContractFingerprint !==
          inputSummary.courseContractFingerprint ||
        commitSummary.stageId !== inputSummary.stageId ||
        commitSummary.candidateFingerprint !==
          inputSummary.candidateFingerprint ||
        commitSummary.repositoryOriginReceiptFingerprint !==
          inputSummary.repositoryOriginReceiptFingerprint ||
        commitSummary.repositoryObservationFingerprint !==
          inputSummary.repositoryObservationFingerprint ||
        commitSummary.authenticatedStageBindingFingerprint !==
          inputSummary.authenticatedStageBindingFingerprint ||
        commitSummary.outerReceiptFingerprint !==
          inputSummary.outerReceiptFingerprint ||
        commitSummary.committedManifestFingerprint !==
          inputSummary.committedManifestFingerprint ||
        commitSummary.committedOperationFingerprint !==
          inputSummary.committedOperationFingerprint ||
        material.plan !== input.plan ||
        material.workspace.workspaceFingerprint !==
          inputSummary.workspaceFingerprint ||
        material.candidate.candidateFingerprint !==
          inputSummary.candidateFingerprint ||
        material.candidate.bodyFingerprint !== inputSummary.bodyFingerprint ||
        material.structuralBinding.bindingFingerprint !==
          inputSummary.structuralBindingFingerprint ||
        material.committedOuterReceipt.receiptFingerprint !==
          inputSummary.outerReceiptFingerprint ||
        material.committedOuterReceipt.planFingerprint !==
          inputSummary.planFingerprint ||
        material.committedOuterReceipt.courseContractFingerprint !==
          inputSummary.courseContractFingerprint ||
        material.committedOuterReceipt.workspaceFingerprint !==
          inputSummary.workspaceFingerprint ||
        material.committedOuterReceipt.stageId !== inputSummary.stageId ||
        material.committedOuterReceipt.candidateFingerprint !==
          inputSummary.candidateFingerprint ||
        material.committedOuterReceipt.repositoryOriginReceiptFingerprint !==
          inputSummary.repositoryOriginReceiptFingerprint ||
        material.committedOuterReceipt.repositoryObservationFingerprint !==
          inputSummary.repositoryObservationFingerprint ||
        material.committedOuterReceipt.authenticatedStageBindingFingerprint !==
          inputSummary.authenticatedStageBindingFingerprint ||
        material.committedManifest.commitFingerprint !==
          inputSummary.committedManifestFingerprint ||
        material.committedManifest.operationFingerprint !==
          inputSummary.committedOperationFingerprint ||
        material.committedManifest.planFingerprint !==
          inputSummary.planFingerprint ||
        material.committedManifest.stageId !== inputSummary.stageId ||
        material.committedManifest.candidateFingerprint !==
          inputSummary.candidateFingerprint ||
        material.committedManifest.outerReceiptFingerprint !==
          inputSummary.outerReceiptFingerprint
      ) {
        fail("v2_firebase_activity_instances_validator_binding_mismatch");
      }

      const expectedCapabilitySnapshot =
        resolveV2FirebaseAuthenticatedActivityStageValidatorCapabilitySnapshotV1(
          {
            capability: material.activityStageCapability,
            plan: input.plan,
            stageId: commitSummary.stageId,
          },
        );
      const rootRaw = canonicalJsonV1(material.candidate.body);
      let permitAggregate: ReturnType<
        typeof parseV2ActivityInstancesUntrustedRootManifestPermitsV2
      > | null = null;
      try {
        permitAggregate =
          parseV2ActivityInstancesUntrustedRootManifestPermitsV2(
            rootRaw,
            input.plan,
            commitSummary.stageId,
          );
      } catch {
        permitAggregate = null;
      }
      const childReadback =
        permitAggregate === null
          ? null
          : await readbackV2ActivityInstancesChildrenV1({
              permitManifest: permitAggregate,
              storage: io.storage,
              concurrency:
                V2_FIREBASE_ACTIVITY_INSTANCES_VALIDATOR_CHILD_READ_CONCURRENCY_V1,
            });
      if (
        childReadback !== null &&
        permitAggregate !== null &&
        (childReadback.planFingerprint !== inputSummary.planFingerprint ||
          childReadback.stageId !== inputSummary.stageId ||
          childReadback.episodeId !== inputSummary.episodeId ||
          childReadback.packageFingerprint !==
            permitAggregate.packageFingerprint ||
          childReadback.permitAggregateFingerprint !==
            permitAggregate.permitAggregateFingerprint ||
          childReadback.objectCount !== 48 ||
          childReadback.sessionCount !== 12)
      ) {
        fail("v2_firebase_activity_instances_validator_readback_mismatch");
      }
      const pureResult = validateV2ActivityInstancesCandidateV1({
        plan: input.plan,
        workspace: material.workspace,
        candidate: material.candidate,
        sessionBytes: childReadback?.sessions ?? Object.freeze([]),
        expectedCapabilitySnapshot,
      });
      assertPureResult(pureResult, {
        planFingerprint: inputSummary.planFingerprint,
        courseContractFingerprint: inputSummary.courseContractFingerprint,
        workspaceFingerprint: inputSummary.workspaceFingerprint,
        stageId: inputSummary.stageId,
        episodeId: inputSummary.episodeId,
        candidateFingerprint: inputSummary.candidateFingerprint,
        bodyFingerprint: inputSummary.bodyFingerprint,
        packageFingerprint: permitAggregate?.packageFingerprint ?? null,
        expectedCapabilitySnapshotFingerprint:
          expectedCapabilitySnapshot.snapshotFingerprint,
      });
      const storageReadbackFingerprint =
        childReadback === null
          ? null
          : hashCanonicalBody({
              schemaVersion:
                "v2-firebase-activity-instances-storage-readback.v1",
              childNamespaceFingerprint:
                V2_FIREBASE_ACTIVITY_INSTANCES_VALIDATOR_CHILD_NAMESPACE_FINGERPRINT_V1,
              permitAggregateFingerprint:
                childReadback.permitAggregateFingerprint,
              readbackAggregateFingerprint:
                childReadback.readbackAggregateFingerprint,
              objectCount: childReadback.objectCount,
              totalReadbackBytes: childReadback.totalReadbackBytes,
              readPolicy: "generation_pinned_exact_metadata_and_bytes",
            });

      const body = Object.freeze({
        schemaVersion:
          V2_FIREBASE_ACTIVITY_INSTANCES_VALIDATOR_SUMMARY_SCHEMA_V1,
        childNamespaceFingerprint:
          V2_FIREBASE_ACTIVITY_INSTANCES_VALIDATOR_CHILD_NAMESPACE_FINGERPRINT_V1,
        planFingerprint: inputSummary.planFingerprint,
        courseContractFingerprint: inputSummary.courseContractFingerprint,
        workspaceFingerprint: inputSummary.workspaceFingerprint,
        stageId: inputSummary.stageId,
        episodeId: inputSummary.episodeId,
        candidateFingerprint: inputSummary.candidateFingerprint,
        bodySchemaVersion: inputSummary.bodySchemaVersion,
        bodyFingerprint: inputSummary.bodyFingerprint,
        repositoryOriginReceiptFingerprint:
          inputSummary.repositoryOriginReceiptFingerprint,
        repositoryObservationFingerprint:
          inputSummary.repositoryObservationFingerprint,
        authenticatedStageBindingFingerprint:
          inputSummary.authenticatedStageBindingFingerprint,
        outerReceiptFingerprint: inputSummary.outerReceiptFingerprint,
        committedManifestFingerprint: inputSummary.committedManifestFingerprint,
        committedOperationFingerprint:
          inputSummary.committedOperationFingerprint,
        permitAggregateFingerprint:
          permitAggregate?.permitAggregateFingerprint ?? null,
        childReadbackAggregateFingerprint:
          childReadback?.readbackAggregateFingerprint ?? null,
        storageReadbackFingerprint,
        childObjectCount: childReadback?.objectCount ?? null,
        childTotalByteSize: childReadback?.totalReadbackBytes ?? null,
        pureValidationResultFingerprint: pureResult.resultFingerprint,
        packageFingerprint: pureResult.packageFingerprint,
        expectedCapabilitySnapshotFingerprint:
          expectedCapabilitySnapshot.snapshotFingerprint,
        candidateCapabilitySnapshotFingerprint:
          pureResult.capabilitySnapshotFingerprint,
        validatedSessionCount: pureResult.validatedSessionCount,
        validatedTaskCount: pureResult.validatedTaskCount,
        outcome: pureResult.outcome,
        repositoryOriginAuthority:
          "authenticated_repository_snapshot_only" as const,
        dependencyResolutionAuthority:
          "authenticated_repository_stage_subset_only" as const,
        artifactStorageAuthority:
          childReadback === null
            ? ("none" as const)
            : ("firebase_admin_generation_pinned_readback" as const),
        machineValidationAuthority:
          "deterministic_activity_instances_structural_semantic_checks_only" as const,
        candidateOriginAuthority: "none" as const,
        humanReviewAuthority: "none" as const,
        specialistEvidenceAuthority: "none" as const,
        deviceEvidenceAuthority: "none" as const,
        listeningEvidenceAuthority: "none" as const,
        walletAuthority: "none" as const,
        masteryAuthority: "none" as const,
        evidenceAuthority: "none" as const,
        completionAuthority: "none" as const,
        runtimeKernelAuthority: "none" as const,
        executionAuthority: "none" as const,
        publicationAuthority: "none" as const,
        runtimeConsumer: false as const,
        releaseEligible: false as const,
        releaseAuthority: false as const,
      });
      const summary = Object.freeze({
        ...body,
        summaryFingerprint: hashCanonicalBody(body),
      });
      const handle = Object.freeze({
        kind: "v2_firebase_activity_instances_validator_result_handle" as const,
      });
      resultHandles.add(handle);
      resultSummaries.set(handle, summary);
      resultMaterials.set(
        handle,
        Object.freeze({
          plan: input.plan,
          summary,
          pureValidationResult: pureResult,
        }),
      );
      if (permitAggregate !== null && childReadback !== null) {
        publicationMaterials.set(
          handle,
          Object.freeze({
            plan: input.plan,
            summary,
            permitAggregate,
            childReadback,
          }),
        );
      }
      return handle;
    },
  });
}
