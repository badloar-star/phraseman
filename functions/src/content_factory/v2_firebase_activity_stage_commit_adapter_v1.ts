import { createHash } from "node:crypto";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  V2_ACTIVITY_STAGE_CANDIDATE_MAX_BYTES_V1,
  V2_ACTIVITY_STAGE_COMMIT_NAMESPACE_FINGERPRINT_V1,
  V2_ACTIVITY_STAGE_INNER_RECEIPT_MAX_BYTES_V1,
  V2_ACTIVITY_STAGE_OUTER_RECEIPT_MAX_BYTES_V1,
  decideV2ActivityStageManifestCommitV1,
  materializeV2ActivityStageBlockedCommitReceiptV1,
  materializeV2ActivityStageCandidatePinV1,
  materializeV2ActivityStageCommittedManifestV1,
  materializeV2ActivityStageInnerReceiptPinV1,
  parseV2ActivityStageBlockedCommitReceiptV1,
  parseV2ActivityStageCommittedManifestV1,
  v2ActivityStageCandidateObjectPathV1,
  v2ActivityStageInnerReceiptObjectPathV1,
  v2ActivityStageManifestDocumentPathV1,
  v2ActivityStageOuterReceiptObjectPathV1,
  type V2ActivityStageBlockedCommitReceiptV1,
  type V2ActivityStageCommittedManifestV1,
  type V2ActivityStageRawObjectPinV1,
} from "./v2_activity_stage_commit_contract_v1";
import {
  isV2CanonicalSeasonPlanV2,
  type V2CanonicalSeasonPlanV2,
} from "./v2_canonical_generation_plan_v2";
import {
  bindV2FirebaseAuthenticatedRepositorySessionToActivityStageV1,
  getV2FirebaseAuthenticatedActivityStageCapabilitySummaryV1,
  resolveV2FirebaseAuthenticatedActivityStageStructuralBindingV1,
  type V2FirebaseAuthenticatedActivityStageCapabilityHandleV1,
  type V2FirebaseAuthenticatedRepositorySessionHandleV1,
} from "./v2_firebase_authenticated_repository_adapter_v1";
import { createV2FirebaseAdminRepositoryIoV1 } from "./v2_firebase_admin_repository_io_v1";
import {
  V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
  persistV2ImmutableRepositoryObjectV1,
  type V2RepositoryImmutableObjectPinV1,
  type V2RepositoryImmutableStoragePortV1,
} from "./v2_firebase_repository_persistence_v1";
import {
  materializeBlockedV2StructuralStageReceiptV2,
  materializeV2GenerationStageWorkspaceV2,
  parseV2CanonicalStageCandidateV2,
  parseV2StageDependencySnapshotV2,
  type V2CanonicalStageCandidateV2,
  type V2GenerationStageWorkspaceV2,
} from "./v2_generation_workspace_contract_v2";
import type { V2ActivityRepositoryCapabilityBindingV1 } from "./v2_repository_capability_observation_v1";

export const V2_FIREBASE_ACTIVITY_STAGE_COMMIT_SUMMARY_SCHEMA_V1 =
  "v2-firebase-activity-stage-commit-summary.v1" as const;
export const V2_FIREBASE_ACTIVITY_INSTANCES_VALIDATOR_INPUT_SUMMARY_SCHEMA_V1 =
  "v2-firebase-activity-instances-validator-input-summary.v1" as const;

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

export interface V2FirebaseActivityStageCommitHandleV1 {
  readonly kind: "v2_firebase_activity_stage_commit_handle";
}

export interface V2FirebaseActivityInstancesValidatorInputHandleV1 {
  readonly kind: "v2_firebase_activity_instances_validator_input_handle";
}

export interface V2FirebaseActivityStageCommitSummaryV1 {
  readonly schemaVersion: typeof V2_FIREBASE_ACTIVITY_STAGE_COMMIT_SUMMARY_SCHEMA_V1;
  readonly namespaceFingerprint: string;
  readonly planFingerprint: string;
  readonly courseContractFingerprint: string;
  readonly stageId: string;
  readonly candidateFingerprint: string;
  readonly repositoryOriginReceiptFingerprint: string;
  readonly repositoryObservationFingerprint: string;
  readonly authenticatedStageBindingFingerprint: string;
  readonly outerReceiptFingerprint: string;
  readonly committedManifestFingerprint: string;
  readonly committedOperationFingerprint: string;
  readonly outcome: "blocked";
  readonly repositoryOriginAuthority: "authenticated_repository_snapshot_only";
  readonly dependencyResolutionAuthority: "authenticated_repository_stage_subset_only";
  readonly artifactStorageAuthority: "firebase_admin_generation_pinned_readback";
  readonly durableCommitAuthority: "firebase_admin_transaction_exact_readback";
  readonly candidateOriginAuthority: "none";
  readonly machineValidationAuthority: "none";
  readonly humanReviewAuthority: "none";
  readonly executionAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseAuthority: false;
}

export interface V2FirebaseActivityStageCommitAdapterV1 {
  commitBlockedActivityStage(input: {
    readonly plan: V2CanonicalSeasonPlanV2;
    readonly repositorySession: V2FirebaseAuthenticatedRepositorySessionHandleV1;
    readonly stageId: string;
    readonly dependencySnapshotRaw: string;
    readonly candidateRaw: string;
  }): Promise<V2FirebaseActivityStageCommitHandleV1>;
}

export interface V2FirebaseActivityInstancesValidatorInputSummaryV1 {
  readonly schemaVersion: typeof V2_FIREBASE_ACTIVITY_INSTANCES_VALIDATOR_INPUT_SUMMARY_SCHEMA_V1;
  readonly namespaceFingerprint: string;
  readonly planFingerprint: string;
  readonly courseContractFingerprint: string;
  readonly workspaceFingerprint: string;
  readonly stageId: string;
  readonly episodeId: string;
  readonly candidateFingerprint: string;
  readonly bodySchemaVersion: string;
  readonly bodyFingerprint: string;
  readonly dependencySnapshotFingerprint: string;
  readonly structuralBindingFingerprint: string;
  readonly authenticatedStageBindingFingerprint: string;
  readonly repositoryOriginReceiptFingerprint: string;
  readonly repositoryObservationFingerprint: string;
  readonly outerReceiptFingerprint: string;
  readonly committedManifestFingerprint: string;
  readonly committedOperationFingerprint: string;
  readonly validatorInputAuthority: "authenticated_commit_exact_material_binding_only";
  readonly repositoryOriginAuthority: "authenticated_repository_snapshot_only";
  readonly dependencyResolutionAuthority: "authenticated_repository_stage_subset_only";
  readonly candidateStorageAuthority: "firebase_admin_generation_pinned_readback";
  readonly childArtifactStorageAuthority: "none";
  readonly machineValidationAuthority: "none";
  readonly humanReviewAuthority: "none";
  readonly executionAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseAuthority: false;
  readonly inputBindingFingerprint: string;
}

export interface V2FirebaseActivityInstancesValidatorInputMaterialV1 {
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly workspace: V2GenerationStageWorkspaceV2;
  readonly candidate: V2CanonicalStageCandidateV2;
  readonly dependencySnapshotRaw: string;
  readonly candidateRaw: string;
  readonly activityStageCapability: V2FirebaseAuthenticatedActivityStageCapabilityHandleV1;
  readonly structuralBinding: V2ActivityRepositoryCapabilityBindingV1;
  readonly committedOuterReceipt: V2ActivityStageBlockedCommitReceiptV1;
  readonly committedManifest: V2ActivityStageCommittedManifestV1;
}

interface V2FirebaseActivityStageCommitMetadataV1 {
  readonly summary: V2FirebaseActivityStageCommitSummaryV1;
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly workspace: V2GenerationStageWorkspaceV2;
  readonly candidate: V2CanonicalStageCandidateV2;
  readonly dependencySnapshotRaw: string;
  readonly candidateRaw: string;
  readonly activityStageCapability: V2FirebaseAuthenticatedActivityStageCapabilityHandleV1;
  readonly structuralBinding: V2ActivityRepositoryCapabilityBindingV1;
  readonly committedOuterReceipt: V2ActivityStageBlockedCommitReceiptV1;
  readonly committedManifest: V2ActivityStageCommittedManifestV1;
}

interface V2FirebaseActivityInstancesValidatorInputMetadataV1 {
  readonly summary: V2FirebaseActivityInstancesValidatorInputSummaryV1;
  readonly commit: V2FirebaseActivityStageCommitMetadataV1;
}

const commitHandles = new WeakSet<object>();
const commitMetadata = new WeakMap<
  object,
  V2FirebaseActivityStageCommitMetadataV1
>();
const validatorInputHandles = new WeakSet<object>();
const validatorInputMetadata = new WeakMap<
  object,
  V2FirebaseActivityInstancesValidatorInputMetadataV1
>();

function fail(code: string): never {
  throw new Error(code);
}

function sha256Bytes(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

async function persistJson(
  storage: V2RepositoryImmutableStoragePortV1,
  objectPath: string,
  raw: string,
  maximumBytes: number,
): Promise<V2RepositoryImmutableObjectPinV1> {
  const bytes = encoder.encode(raw);
  return (
    await persistV2ImmutableRepositoryObjectV1({
      storage,
      objectPath,
      bytes,
      maximumBytes,
      contentType: V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
      contentHash: sha256Bytes(bytes),
    })
  ).pin;
}

async function loadJson(
  storage: V2RepositoryImmutableStoragePortV1,
  pin: V2ActivityStageRawObjectPinV1,
  maximumBytes: number,
): Promise<string> {
  if (pin.byteSize > maximumBytes)
    fail("v2_firebase_activity_stage_commit_pin_oversize");
  const metadata = await storage.readMetadataExact(pin.objectPath);
  if (
    metadata === null ||
    metadata.generation !== pin.objectGeneration ||
    metadata.byteSize !== pin.byteSize ||
    metadata.contentHash !== pin.contentHash ||
    metadata.contentType !== V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1
  ) {
    fail("v2_firebase_activity_stage_commit_pin_metadata_mismatch");
  }
  const read = await storage.downloadGenerationExact({
    objectPath: pin.objectPath,
    ifGenerationMatch: pin.objectGeneration,
    maximumBytes,
  });
  if (
    read.kind !== "downloaded" ||
    read.bytes.byteLength !== pin.byteSize ||
    sha256Bytes(read.bytes) !== pin.contentHash
  ) {
    fail("v2_firebase_activity_stage_commit_pin_readback_mismatch");
  }
  try {
    return decoder.decode(read.bytes);
  } catch {
    fail("v2_firebase_activity_stage_commit_utf8_invalid");
  }
}

async function commitManifest(
  firestore: ReturnType<
    typeof createV2FirebaseAdminRepositoryIoV1
  >["firestore"],
  proposed: V2ActivityStageCommittedManifestV1,
): Promise<V2ActivityStageCommittedManifestV1> {
  const documentPath = v2ActivityStageManifestDocumentPathV1({
    planFingerprint: proposed.planFingerprint,
    stageId: proposed.stageId,
    candidateFingerprint: proposed.candidateFingerprint,
  });
  return firestore.runTransaction(async (transaction) => {
    const current = await transaction.readExact(documentPath);
    const decision = decideV2ActivityStageManifestCommitV1({
      currentRaw: current.exists ? current.raw : null,
      proposed,
    });
    if (decision.documentPath !== documentPath)
      fail("v2_firebase_activity_stage_commit_document_path_mismatch");
    if (decision.kind === "conflict")
      fail("v2_firebase_activity_stage_commit_conflict");
    if (decision.kind === "create") {
      await transaction.createExact(documentPath, decision.canonicalRaw);
      return decision.next;
    }
    return decision.committed;
  });
}

async function coldReadManifest(
  firestore: ReturnType<
    typeof createV2FirebaseAdminRepositoryIoV1
  >["firestore"],
  expected: V2ActivityStageCommittedManifestV1,
): Promise<V2ActivityStageCommittedManifestV1> {
  const documentPath = v2ActivityStageManifestDocumentPathV1({
    planFingerprint: expected.planFingerprint,
    stageId: expected.stageId,
    candidateFingerprint: expected.candidateFingerprint,
  });
  return firestore.runTransaction(async (transaction) => {
    const read = await transaction.readExact(documentPath);
    if (!read.exists)
      fail("v2_firebase_activity_stage_commit_manifest_missing");
    const parsed = parseV2ActivityStageCommittedManifestV1(read.raw);
    if (parsed.operationFingerprint !== expected.operationFingerprint)
      fail("v2_firebase_activity_stage_commit_manifest_mismatch");
    return parsed;
  });
}

export function isV2FirebaseActivityStageCommitHandleV1(
  value: unknown,
): value is V2FirebaseActivityStageCommitHandleV1 {
  return (
    typeof value === "object" && value !== null && commitHandles.has(value)
  );
}

export function getV2FirebaseActivityStageCommitSummaryV1(
  handle: V2FirebaseActivityStageCommitHandleV1,
): V2FirebaseActivityStageCommitSummaryV1 {
  const metadata = commitMetadata.get(handle);
  if (!metadata) fail("v2_firebase_activity_stage_commit_handle_invalid");
  return metadata.summary;
}

export function bindV2FirebaseActivityStageCommitToActivityInstancesValidatorV1(input: {
  readonly commitHandle: V2FirebaseActivityStageCommitHandleV1;
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly stageId: string;
}): V2FirebaseActivityInstancesValidatorInputHandleV1 {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input) ||
    Object.keys(input).sort().join("|") !== "commitHandle|plan|stageId"
  ) {
    fail("v2_firebase_activity_instances_validator_input_binding_invalid");
  }
  const commit = commitMetadata.get(input.commitHandle);
  if (
    !commit ||
    !isV2CanonicalSeasonPlanV2(input.plan) ||
    commit.plan !== input.plan ||
    input.stageId !== commit.summary.stageId ||
    commit.workspace.stage.stageId !== input.stageId ||
    commit.candidate.candidateFingerprint !==
      commit.summary.candidateFingerprint ||
    commit.committedOuterReceipt.candidateFingerprint !==
      commit.summary.candidateFingerprint ||
    commit.committedManifest.candidateFingerprint !==
      commit.summary.candidateFingerprint
  ) {
    fail("v2_firebase_activity_instances_validator_input_binding_invalid");
  }
  const body = Object.freeze({
    schemaVersion:
      V2_FIREBASE_ACTIVITY_INSTANCES_VALIDATOR_INPUT_SUMMARY_SCHEMA_V1,
    namespaceFingerprint: commit.summary.namespaceFingerprint,
    planFingerprint: commit.summary.planFingerprint,
    courseContractFingerprint: commit.summary.courseContractFingerprint,
    workspaceFingerprint: commit.workspace.workspaceFingerprint,
    stageId: commit.summary.stageId,
    episodeId: commit.workspace.stage.episodeId as string,
    candidateFingerprint: commit.summary.candidateFingerprint,
    bodySchemaVersion: commit.candidate.bodySchemaVersion,
    bodyFingerprint: commit.candidate.bodyFingerprint,
    dependencySnapshotFingerprint:
      commit.candidate.dependencySnapshotFingerprint,
    structuralBindingFingerprint: commit.structuralBinding.bindingFingerprint,
    authenticatedStageBindingFingerprint:
      commit.summary.authenticatedStageBindingFingerprint,
    repositoryOriginReceiptFingerprint:
      commit.summary.repositoryOriginReceiptFingerprint,
    repositoryObservationFingerprint:
      commit.summary.repositoryObservationFingerprint,
    outerReceiptFingerprint: commit.summary.outerReceiptFingerprint,
    committedManifestFingerprint: commit.summary.committedManifestFingerprint,
    committedOperationFingerprint: commit.summary.committedOperationFingerprint,
    validatorInputAuthority:
      "authenticated_commit_exact_material_binding_only" as const,
    repositoryOriginAuthority:
      "authenticated_repository_snapshot_only" as const,
    dependencyResolutionAuthority:
      "authenticated_repository_stage_subset_only" as const,
    candidateStorageAuthority:
      "firebase_admin_generation_pinned_readback" as const,
    childArtifactStorageAuthority: "none" as const,
    machineValidationAuthority: "none" as const,
    humanReviewAuthority: "none" as const,
    executionAuthority: "none" as const,
    publicationAuthority: "none" as const,
    runtimeConsumer: false as const,
    releaseAuthority: false as const,
  });
  const summary = Object.freeze({
    ...body,
    inputBindingFingerprint: hashCanonicalBody(body),
  });
  const handle = Object.freeze({
    kind: "v2_firebase_activity_instances_validator_input_handle" as const,
  });
  validatorInputHandles.add(handle);
  validatorInputMetadata.set(handle, Object.freeze({ summary, commit }));
  return handle;
}

export function isV2FirebaseActivityInstancesValidatorInputHandleV1(
  value: unknown,
): value is V2FirebaseActivityInstancesValidatorInputHandleV1 {
  return (
    typeof value === "object" &&
    value !== null &&
    validatorInputHandles.has(value)
  );
}

export function getV2FirebaseActivityInstancesValidatorInputSummaryV1(
  handle: V2FirebaseActivityInstancesValidatorInputHandleV1,
): V2FirebaseActivityInstancesValidatorInputSummaryV1 {
  const metadata = validatorInputMetadata.get(handle);
  if (!metadata)
    fail("v2_firebase_activity_instances_validator_input_handle_invalid");
  return metadata.summary;
}

export function resolveV2FirebaseActivityInstancesValidatorInputMaterialV1(input: {
  readonly inputHandle: V2FirebaseActivityInstancesValidatorInputHandleV1;
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly stageId: string;
}): V2FirebaseActivityInstancesValidatorInputMaterialV1 {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input) ||
    Object.keys(input).sort().join("|") !== "inputHandle|plan|stageId"
  ) {
    fail("v2_firebase_activity_instances_validator_input_resolve_invalid");
  }
  const metadata = validatorInputMetadata.get(input.inputHandle);
  if (
    !metadata ||
    !isV2CanonicalSeasonPlanV2(input.plan) ||
    metadata.commit.plan !== input.plan ||
    metadata.summary.stageId !== input.stageId ||
    metadata.commit.workspace.stage.stageId !== input.stageId
  ) {
    fail("v2_firebase_activity_instances_validator_input_resolve_invalid");
  }
  return Object.freeze({
    plan: metadata.commit.plan,
    workspace: metadata.commit.workspace,
    candidate: metadata.commit.candidate,
    dependencySnapshotRaw: metadata.commit.dependencySnapshotRaw,
    candidateRaw: metadata.commit.candidateRaw,
    activityStageCapability: metadata.commit.activityStageCapability,
    structuralBinding: metadata.commit.structuralBinding,
    committedOuterReceipt: metadata.commit.committedOuterReceipt,
    committedManifest: metadata.commit.committedManifest,
  });
}

export function createFirebaseAdminV2ActivityStageCommitAdapterV1(): V2FirebaseActivityStageCommitAdapterV1 {
  const io = createV2FirebaseAdminRepositoryIoV1();
  return Object.freeze({
    commitBlockedActivityStage: async (input: {
      readonly plan: V2CanonicalSeasonPlanV2;
      readonly repositorySession: V2FirebaseAuthenticatedRepositorySessionHandleV1;
      readonly stageId: string;
      readonly dependencySnapshotRaw: string;
      readonly candidateRaw: string;
    }) => {
      if (
        typeof input !== "object" ||
        input === null ||
        Array.isArray(input) ||
        Object.keys(input).sort().join("|") !==
          "candidateRaw|dependencySnapshotRaw|plan|repositorySession|stageId" ||
        !isV2CanonicalSeasonPlanV2(input.plan)
      ) {
        fail("v2_firebase_activity_stage_commit_input_invalid");
      }
      const capability =
        bindV2FirebaseAuthenticatedRepositorySessionToActivityStageV1({
          session: input.repositorySession,
          plan: input.plan,
          stageId: input.stageId,
        });
      const capabilitySummary =
        getV2FirebaseAuthenticatedActivityStageCapabilitySummaryV1(capability);
      const structuralBinding =
        resolveV2FirebaseAuthenticatedActivityStageStructuralBindingV1({
          capability,
          plan: input.plan,
          stageId: input.stageId,
        });
      const dependencySnapshot = parseV2StageDependencySnapshotV2(
        input.plan,
        input.dependencySnapshotRaw,
      );
      const workspace = materializeV2GenerationStageWorkspaceV2({
        plan: input.plan,
        stageId: input.stageId,
        dependencySnapshot,
        capabilityBinding: Object.freeze({
          kind: "activity_instances" as const,
          bindingFingerprint: structuralBinding.bindingFingerprint,
          resolutionOrigin: "not_established" as const,
        }),
      });
      const candidate = parseV2CanonicalStageCandidateV2(
        workspace,
        input.candidateRaw,
      );
      const candidateRawHash = sha256Utf8(input.candidateRaw);
      const innerReceipt = materializeBlockedV2StructuralStageReceiptV2({
        workspace,
        candidate,
        repositoryCapabilityBinding: structuralBinding,
        artifactRefRaw: canonicalJsonV1({
          objectPath: `learning-v2/v2-candidates/${candidate.stageId}.json`,
          contentHash: candidateRawHash,
          objectGeneration: "unpersisted",
          byteSize: encoder.encode(input.candidateRaw).byteLength,
        }),
      });
      const innerReceiptRaw = canonicalJsonV1(innerReceipt);
      if (
        innerReceipt.outcome !== "blocked" ||
        innerReceipt.artifactRef.objectGeneration !== "unpersisted"
      ) {
        fail("v2_firebase_activity_stage_commit_inner_receipt_invalid");
      }
      const candidateObjectPath = v2ActivityStageCandidateObjectPathV1({
        planFingerprint: input.plan.planFingerprint,
        stageId: input.stageId,
        candidateFingerprint: candidate.candidateFingerprint,
        candidateRawHash,
      });
      const candidatePersisted = await persistJson(
        io.storage,
        candidateObjectPath,
        input.candidateRaw,
        V2_ACTIVITY_STAGE_CANDIDATE_MAX_BYTES_V1,
      );
      const candidatePin = materializeV2ActivityStageCandidatePinV1({
        planFingerprint: input.plan.planFingerprint,
        stageId: input.stageId,
        candidateFingerprint: candidate.candidateFingerprint,
        candidateRawHash,
        objectGeneration: candidatePersisted.objectGeneration,
        byteSize: candidatePersisted.byteSize,
      });
      const innerReceiptRawHash = sha256Utf8(innerReceiptRaw);
      const innerObjectPath = v2ActivityStageInnerReceiptObjectPathV1({
        planFingerprint: input.plan.planFingerprint,
        stageId: input.stageId,
        candidateFingerprint: candidate.candidateFingerprint,
        innerReceiptFingerprint: innerReceipt.receiptFingerprint,
        innerReceiptRawHash,
      });
      const innerPersisted = await persistJson(
        io.storage,
        innerObjectPath,
        innerReceiptRaw,
        V2_ACTIVITY_STAGE_INNER_RECEIPT_MAX_BYTES_V1,
      );
      const innerReceiptPin = materializeV2ActivityStageInnerReceiptPinV1({
        planFingerprint: input.plan.planFingerprint,
        stageId: input.stageId,
        candidateFingerprint: candidate.candidateFingerprint,
        innerReceiptFingerprint: innerReceipt.receiptFingerprint,
        innerReceiptRawHash,
        objectGeneration: innerPersisted.objectGeneration,
        byteSize: innerPersisted.byteSize,
      });
      const outerReceipt = materializeV2ActivityStageBlockedCommitReceiptV1({
        planFingerprint: input.plan.planFingerprint,
        courseContractFingerprint:
          input.plan.courseContract.courseContractFingerprint,
        workspaceFingerprint: workspace.workspaceFingerprint,
        stageId: input.stageId,
        subjectFingerprint: workspace.subject.subjectFingerprint,
        candidateFingerprint: candidate.candidateFingerprint,
        candidatePin,
        innerReceiptFingerprint: innerReceipt.receiptFingerprint,
        innerReceiptPin,
        repositoryOriginReceiptFingerprint:
          capabilitySummary.repositoryOriginReceiptFingerprint,
        repositoryObservationFingerprint:
          capabilitySummary.repositoryObservationFingerprint,
        authenticatedStageBindingFingerprint:
          capabilitySummary.authenticatedCapabilityFingerprint,
      });
      const outerReceiptRaw = canonicalJsonV1(outerReceipt);
      const outerReceiptRawHash = sha256Utf8(outerReceiptRaw);
      const outerObjectPath = v2ActivityStageOuterReceiptObjectPathV1({
        planFingerprint: input.plan.planFingerprint,
        stageId: input.stageId,
        candidateFingerprint: candidate.candidateFingerprint,
        outerReceiptFingerprint: outerReceipt.receiptFingerprint,
        outerReceiptRawHash,
      });
      const outerPersisted = await persistJson(
        io.storage,
        outerObjectPath,
        outerReceiptRaw,
        V2_ACTIVITY_STAGE_OUTER_RECEIPT_MAX_BYTES_V1,
      );
      const proposed = materializeV2ActivityStageCommittedManifestV1({
        receipt: outerReceipt,
        outerReceiptRawHash,
        objectGeneration: outerPersisted.objectGeneration,
        byteSize: outerPersisted.byteSize,
        createdAtEpochMs: Date.now(),
      });
      const committed = await commitManifest(io.firestore, proposed);
      const coldManifest = await coldReadManifest(io.firestore, committed);
      const coldOuterRaw = await loadJson(
        io.storage,
        coldManifest.outerReceiptObject,
        V2_ACTIVITY_STAGE_OUTER_RECEIPT_MAX_BYTES_V1,
      );
      const coldOuter =
        parseV2ActivityStageBlockedCommitReceiptV1(coldOuterRaw);
      if (
        coldOuter.receiptFingerprint !== coldManifest.outerReceiptFingerprint ||
        coldOuter.receiptFingerprint !== outerReceipt.receiptFingerprint
      ) {
        fail("v2_firebase_activity_stage_commit_outer_receipt_mismatch");
      }
      const coldCandidateRaw = await loadJson(
        io.storage,
        coldOuter.candidatePin.object,
        V2_ACTIVITY_STAGE_CANDIDATE_MAX_BYTES_V1,
      );
      const coldInnerRaw = await loadJson(
        io.storage,
        coldOuter.innerReceiptPin.object,
        V2_ACTIVITY_STAGE_INNER_RECEIPT_MAX_BYTES_V1,
      );
      const coldSnapshot = parseV2StageDependencySnapshotV2(
        input.plan,
        input.dependencySnapshotRaw,
      );
      const coldWorkspace = materializeV2GenerationStageWorkspaceV2({
        plan: input.plan,
        stageId: input.stageId,
        dependencySnapshot: coldSnapshot,
        capabilityBinding: Object.freeze({
          kind: "activity_instances" as const,
          bindingFingerprint: structuralBinding.bindingFingerprint,
          resolutionOrigin: "not_established" as const,
        }),
      });
      const coldCandidate = parseV2CanonicalStageCandidateV2(
        coldWorkspace,
        coldCandidateRaw,
      );
      const rebuiltInner = materializeBlockedV2StructuralStageReceiptV2({
        workspace: coldWorkspace,
        candidate: coldCandidate,
        repositoryCapabilityBinding: structuralBinding,
        artifactRefRaw: canonicalJsonV1({
          objectPath: `learning-v2/v2-candidates/${coldCandidate.stageId}.json`,
          contentHash: sha256Utf8(coldCandidateRaw),
          objectGeneration: "unpersisted",
          byteSize: encoder.encode(coldCandidateRaw).byteLength,
        }),
      });
      if (
        canonicalJsonV1(rebuiltInner) !== coldInnerRaw ||
        canonicalJsonV1(coldCandidate) !== coldCandidateRaw ||
        coldCandidate.candidateFingerprint !== candidate.candidateFingerprint ||
        coldOuter.workspaceFingerprint !== coldWorkspace.workspaceFingerprint ||
        coldOuter.authenticatedStageBindingFingerprint !==
          capabilitySummary.authenticatedCapabilityFingerprint ||
        coldOuter.repositoryOriginReceiptFingerprint !==
          capabilitySummary.repositoryOriginReceiptFingerprint ||
        coldOuter.repositoryObservationFingerprint !==
          capabilitySummary.repositoryObservationFingerprint
      ) {
        fail("v2_firebase_activity_stage_commit_cold_replay_mismatch");
      }
      const summary = Object.freeze({
        schemaVersion: V2_FIREBASE_ACTIVITY_STAGE_COMMIT_SUMMARY_SCHEMA_V1,
        namespaceFingerprint: V2_ACTIVITY_STAGE_COMMIT_NAMESPACE_FINGERPRINT_V1,
        planFingerprint: input.plan.planFingerprint,
        courseContractFingerprint:
          input.plan.courseContract.courseContractFingerprint,
        stageId: input.stageId,
        candidateFingerprint: candidate.candidateFingerprint,
        repositoryOriginReceiptFingerprint:
          capabilitySummary.repositoryOriginReceiptFingerprint,
        repositoryObservationFingerprint:
          capabilitySummary.repositoryObservationFingerprint,
        authenticatedStageBindingFingerprint:
          capabilitySummary.authenticatedCapabilityFingerprint,
        outerReceiptFingerprint: coldOuter.receiptFingerprint,
        committedManifestFingerprint: coldManifest.commitFingerprint,
        committedOperationFingerprint: coldManifest.operationFingerprint,
        outcome: "blocked" as const,
        repositoryOriginAuthority:
          "authenticated_repository_snapshot_only" as const,
        dependencyResolutionAuthority:
          "authenticated_repository_stage_subset_only" as const,
        artifactStorageAuthority:
          "firebase_admin_generation_pinned_readback" as const,
        durableCommitAuthority:
          "firebase_admin_transaction_exact_readback" as const,
        candidateOriginAuthority: "none" as const,
        machineValidationAuthority: "none" as const,
        humanReviewAuthority: "none" as const,
        executionAuthority: "none" as const,
        publicationAuthority: "none" as const,
        runtimeConsumer: false as const,
        releaseAuthority: false as const,
      });
      const handle = Object.freeze({
        kind: "v2_firebase_activity_stage_commit_handle" as const,
      });
      commitHandles.add(handle);
      commitMetadata.set(
        handle,
        Object.freeze({
          summary,
          plan: input.plan,
          workspace: coldWorkspace,
          candidate: coldCandidate,
          dependencySnapshotRaw: input.dependencySnapshotRaw,
          candidateRaw: coldCandidateRaw,
          activityStageCapability: capability,
          structuralBinding,
          committedOuterReceipt: coldOuter,
          committedManifest: coldManifest,
        }),
      );
      return handle;
    },
  });
}
