import { createHash } from "node:crypto";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  V2_ACTIVITY_INSTANCES_MACHINE_NAMESPACE_FINGERPRINT_V1,
  V2_ACTIVITY_INSTANCES_MACHINE_RECEIPT_MAX_BYTES_V1,
  decideV2ActivityInstancesMachineManifestV1,
  materializeV2ActivityInstancesMachineManifestV1,
  materializeV2ActivityInstancesMachineReceiptV1,
  parseV2ActivityInstancesMachineManifestV1,
  parseV2ActivityInstancesMachineReceiptV1,
  v2ActivityInstancesMachineManifestDocumentPathV1,
  v2ActivityInstancesMachineReceiptObjectPathV1,
  type V2ActivityInstancesMachineManifestV1,
  type V2ActivityInstancesMachineReceiptV1,
} from "./v2_activity_instances_machine_receipt_v1";
import type { V2CanonicalSeasonPlanV2 } from "./v2_canonical_generation_plan_v2";
import { V2_STAGE_VALIDATOR_REGISTRY_V2 } from "./v2_generation_workspace_contract_v2";
import { createV2FirebaseAdminRepositoryIoV1 } from "./v2_firebase_admin_repository_io_v1";
import {
  getV2FirebaseActivityInstancesValidatorSummaryV1,
  resolveV2FirebaseActivityInstancesValidatorResultMaterialV1,
  type V2FirebaseActivityInstancesValidatorResultHandleV1,
} from "./v2_firebase_activity_instances_validator_adapter_v1";
import {
  V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
  persistV2ImmutableRepositoryObjectV1,
  type V2RepositoryFirestorePortV1,
  type V2RepositoryImmutableStoragePortV1,
} from "./v2_firebase_repository_persistence_v1";

export const V2_FIREBASE_ACTIVITY_INSTANCES_MACHINE_RECEIPT_SUMMARY_SCHEMA_V1 =
  "v2-firebase-activity-instances-machine-receipt-summary.v1" as const;

export interface V2FirebaseActivityInstancesMachineReceiptHandleV1 {
  readonly kind: "v2_firebase_activity_instances_machine_receipt_handle";
}

export interface V2FirebaseActivityInstancesMachineReceiptSummaryV1 {
  readonly schemaVersion: typeof V2_FIREBASE_ACTIVITY_INSTANCES_MACHINE_RECEIPT_SUMMARY_SCHEMA_V1;
  readonly namespaceFingerprint: string;
  readonly planFingerprint: string;
  readonly courseContractFingerprint: string;
  readonly workspaceFingerprint: string;
  readonly stageId: string;
  readonly episodeId: string;
  readonly candidateFingerprint: string;
  readonly bodyFingerprint: string;
  readonly packageFingerprint: string | null;
  readonly capabilitySnapshotFingerprint: string | null;
  readonly repositoryOriginReceiptFingerprint: string;
  readonly repositoryObservationFingerprint: string;
  readonly d2OuterReceiptFingerprint: string;
  readonly d2CommittedManifestFingerprint: string;
  readonly d2CommittedOperationFingerprint: string;
  readonly pureValidationResultFingerprint: string;
  readonly validatorRulesFingerprint: string;
  readonly registryFingerprint: string;
  readonly machineReceiptFingerprint: string;
  readonly machineManifestFingerprint: string;
  readonly machineOperationFingerprint: string;
  readonly outcome: "blocked" | "eligible_for_human_review_only";
  readonly repositoryOriginAuthority: "authenticated_repository_snapshot_only";
  readonly dependencyResolutionAuthority: "authenticated_repository_stage_subset_only";
  readonly artifactStorageAuthority:
    | "firebase_admin_generation_pinned_readback"
    | "none";
  readonly durableReceiptStorageAuthority: "firebase_admin_generation_pinned_readback";
  readonly durableCommitAuthority: "firebase_admin_transaction_exact_readback";
  readonly machineValidationAuthority: "deterministic_activity_instances_structural_semantic_checks_only";
  readonly storedReceiptAuthority: "none";
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

export interface V2FirebaseActivityInstancesMachineReceiptAdapterV1 {
  commitMachineReceipt(input: {
    readonly plan: V2CanonicalSeasonPlanV2;
    readonly validationHandle: V2FirebaseActivityInstancesValidatorResultHandleV1;
  }): Promise<V2FirebaseActivityInstancesMachineReceiptHandleV1>;
}

const handles = new WeakSet<object>();
const summaries = new WeakMap<
  object,
  V2FirebaseActivityInstancesMachineReceiptSummaryV1
>();
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

function fail(code: string): never {
  throw new Error(code);
}

function sha256Bytes(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

async function commitManifest(
  firestore: V2RepositoryFirestorePortV1,
  proposed: V2ActivityInstancesMachineManifestV1,
): Promise<V2ActivityInstancesMachineManifestV1> {
  const documentPath = v2ActivityInstancesMachineManifestDocumentPathV1({
    planFingerprint: proposed.planFingerprint,
    stageId: proposed.stageId,
    candidateFingerprint: proposed.candidateFingerprint,
    validatorRulesFingerprint: proposed.validatorRulesFingerprint,
    registryFingerprint: proposed.registryFingerprint,
  });
  return firestore.runTransaction(async (transaction) => {
    const current = await transaction.readExact(documentPath);
    const decision = decideV2ActivityInstancesMachineManifestV1({
      currentRaw: current.exists ? current.raw : null,
      proposed,
    });
    if (decision.documentPath !== documentPath)
      fail("v2_firebase_activity_instances_machine_document_path_mismatch");
    if (decision.kind === "conflict")
      fail("v2_firebase_activity_instances_machine_manifest_conflict");
    if (decision.kind === "create") {
      await transaction.createExact(documentPath, decision.canonicalRaw);
      return decision.next;
    }
    return decision.committed;
  });
}

async function coldReadManifest(
  firestore: V2RepositoryFirestorePortV1,
  expected: V2ActivityInstancesMachineManifestV1,
): Promise<V2ActivityInstancesMachineManifestV1> {
  const documentPath = v2ActivityInstancesMachineManifestDocumentPathV1({
    planFingerprint: expected.planFingerprint,
    stageId: expected.stageId,
    candidateFingerprint: expected.candidateFingerprint,
    validatorRulesFingerprint: expected.validatorRulesFingerprint,
    registryFingerprint: expected.registryFingerprint,
  });
  return firestore.runTransaction(async (transaction) => {
    const current = await transaction.readExact(documentPath);
    if (!current.exists)
      fail("v2_firebase_activity_instances_machine_manifest_missing");
    const parsed = parseV2ActivityInstancesMachineManifestV1(current.raw);
    if (
      parsed.commitFingerprint !== expected.commitFingerprint ||
      parsed.operationFingerprint !== expected.operationFingerprint
    ) {
      fail("v2_firebase_activity_instances_machine_manifest_mismatch");
    }
    return parsed;
  });
}

async function coldReadReceipt(
  storage: V2RepositoryImmutableStoragePortV1,
  manifest: V2ActivityInstancesMachineManifestV1,
): Promise<V2ActivityInstancesMachineReceiptV1> {
  const pin = manifest.receiptObject;
  if (pin.byteSize > V2_ACTIVITY_INSTANCES_MACHINE_RECEIPT_MAX_BYTES_V1)
    fail("v2_firebase_activity_instances_machine_receipt_oversize");
  const metadata = await storage.readMetadataExact(pin.objectPath);
  if (
    metadata === null ||
    metadata.generation !== pin.objectGeneration ||
    metadata.byteSize !== pin.byteSize ||
    metadata.contentHash !== pin.contentHash ||
    metadata.contentType !== V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1
  ) {
    fail("v2_firebase_activity_instances_machine_receipt_metadata_mismatch");
  }
  const read = await storage.downloadGenerationExact({
    objectPath: pin.objectPath,
    ifGenerationMatch: pin.objectGeneration,
    maximumBytes: V2_ACTIVITY_INSTANCES_MACHINE_RECEIPT_MAX_BYTES_V1,
  });
  if (
    read.kind !== "downloaded" ||
    read.bytes.byteLength !== pin.byteSize ||
    sha256Bytes(read.bytes) !== pin.contentHash
  ) {
    fail("v2_firebase_activity_instances_machine_receipt_readback_mismatch");
  }
  let raw: string;
  try {
    raw = decoder.decode(read.bytes);
  } catch {
    fail("v2_firebase_activity_instances_machine_receipt_utf8_invalid");
  }
  const receipt = parseV2ActivityInstancesMachineReceiptV1(raw);
  if (
    receipt.receiptFingerprint !== manifest.receiptFingerprint ||
    sha256Utf8(raw) !== manifest.receiptRawHash
  ) {
    fail("v2_firebase_activity_instances_machine_receipt_mismatch");
  }
  return receipt;
}

export function isV2FirebaseActivityInstancesMachineReceiptHandleV1(
  value: unknown,
): value is V2FirebaseActivityInstancesMachineReceiptHandleV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}

export function getV2FirebaseActivityInstancesMachineReceiptSummaryV1(
  handle: V2FirebaseActivityInstancesMachineReceiptHandleV1,
): V2FirebaseActivityInstancesMachineReceiptSummaryV1 {
  const summary = summaries.get(handle);
  if (!summary)
    fail("v2_firebase_activity_instances_machine_receipt_handle_invalid");
  return summary;
}

export function createFirebaseAdminV2ActivityInstancesMachineReceiptAdapterV1(): V2FirebaseActivityInstancesMachineReceiptAdapterV1 {
  const io = createV2FirebaseAdminRepositoryIoV1();
  return Object.freeze({
    commitMachineReceipt: async (input: {
      readonly plan: V2CanonicalSeasonPlanV2;
      readonly validationHandle: V2FirebaseActivityInstancesValidatorResultHandleV1;
    }) => {
      if (
        typeof input !== "object" ||
        input === null ||
        Array.isArray(input) ||
        Object.keys(input).sort().join("|") !== "plan|validationHandle"
      ) {
        fail("v2_firebase_activity_instances_machine_input_invalid");
      }
      const validatorSummary = getV2FirebaseActivityInstancesValidatorSummaryV1(
        input.validationHandle,
      );
      const material =
        resolveV2FirebaseActivityInstancesValidatorResultMaterialV1({
          handle: input.validationHandle,
          plan: input.plan,
        });
      if (
        material.summary !== validatorSummary ||
        material.plan !== input.plan ||
        material.pureValidationResult.resultFingerprint !==
          validatorSummary.pureValidationResultFingerprint
      ) {
        fail("v2_firebase_activity_instances_machine_validation_mismatch");
      }
      const pure = material.pureValidationResult;
      const installedValidator =
        V2_STAGE_VALIDATOR_REGISTRY_V2.v2_activity_instances;
      if (
        installedValidator.state !== "installed" ||
        installedValidator.bodySchemaVersion !==
          validatorSummary.bodySchemaVersion ||
        installedValidator.validatorId !== pure.validatorProfile.id ||
        installedValidator.validatorVersion !== pure.validatorProfile.version
      ) {
        fail("v2_firebase_activity_instances_machine_registry_mismatch");
      }
      const registryFingerprint = hashCanonicalBody(
        V2_STAGE_VALIDATOR_REGISTRY_V2,
      );
      const receipt = materializeV2ActivityInstancesMachineReceiptV1({
        planFingerprint: validatorSummary.planFingerprint,
        courseContractFingerprint: validatorSummary.courseContractFingerprint,
        workspaceFingerprint: validatorSummary.workspaceFingerprint,
        stageId: validatorSummary.stageId,
        episodeId: validatorSummary.episodeId,
        candidateFingerprint: validatorSummary.candidateFingerprint,
        bodySchemaVersion: validatorSummary.bodySchemaVersion,
        bodyFingerprint: validatorSummary.bodyFingerprint,
        packageFingerprint: validatorSummary.packageFingerprint,
        capabilitySnapshotFingerprint:
          validatorSummary.candidateCapabilitySnapshotFingerprint,
        repositoryOriginReceiptFingerprint:
          validatorSummary.repositoryOriginReceiptFingerprint,
        repositoryObservationFingerprint:
          validatorSummary.repositoryObservationFingerprint,
        d2OuterReceiptFingerprint: validatorSummary.outerReceiptFingerprint,
        d2CommittedManifestFingerprint:
          validatorSummary.committedManifestFingerprint,
        d2CommittedOperationFingerprint:
          validatorSummary.committedOperationFingerprint,
        permitAggregateFingerprint: validatorSummary.permitAggregateFingerprint,
        readbackAggregateFingerprint:
          validatorSummary.childReadbackAggregateFingerprint,
        storageReadbackFingerprint: validatorSummary.storageReadbackFingerprint,
        sessionCount: validatorSummary.validatedSessionCount,
        childObjectCount: validatorSummary.childObjectCount,
        totalReadbackBytes: validatorSummary.childTotalByteSize,
        pureValidationResultFingerprint:
          validatorSummary.pureValidationResultFingerprint,
        validatorRulesFingerprint: pure.validatorProfile.rulesFingerprint,
        registryFingerprint,
        checkedRuleCodes: pure.checkedRuleCodes,
        issueCodes: pure.blockingIssueCodes,
        outcome: validatorSummary.outcome,
      });
      const receiptRaw = canonicalJsonV1(receipt);
      const receiptRawHash = sha256Utf8(receiptRaw);
      const receiptPath = v2ActivityInstancesMachineReceiptObjectPathV1({
        planFingerprint: receipt.planFingerprint,
        stageId: receipt.stageId,
        candidateFingerprint: receipt.candidateFingerprint,
        receiptFingerprint: receipt.receiptFingerprint,
        receiptRawHash,
      });
      const persisted = await persistV2ImmutableRepositoryObjectV1({
        storage: io.storage,
        objectPath: receiptPath,
        bytes: encoder.encode(receiptRaw),
        maximumBytes: V2_ACTIVITY_INSTANCES_MACHINE_RECEIPT_MAX_BYTES_V1,
        contentType: V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
        contentHash: receiptRawHash,
      });
      const proposed = materializeV2ActivityInstancesMachineManifestV1({
        receipt,
        receiptRawHash,
        objectGeneration: persisted.pin.objectGeneration,
        byteSize: persisted.pin.byteSize,
        createdAtEpochMs: Date.now(),
      });
      const committed = await commitManifest(io.firestore, proposed);
      const coldManifest = await coldReadManifest(io.firestore, committed);
      const coldReceipt = await coldReadReceipt(io.storage, coldManifest);
      if (
        canonicalJsonV1(coldReceipt) !== receiptRaw ||
        coldReceipt.planFingerprint !== validatorSummary.planFingerprint ||
        coldReceipt.courseContractFingerprint !==
          validatorSummary.courseContractFingerprint ||
        coldReceipt.workspaceFingerprint !==
          validatorSummary.workspaceFingerprint ||
        coldReceipt.stageId !== validatorSummary.stageId ||
        coldReceipt.candidateFingerprint !==
          validatorSummary.candidateFingerprint ||
        coldReceipt.pureValidationResultFingerprint !==
          pure.resultFingerprint ||
        coldReceipt.validatorRulesFingerprint !==
          pure.validatorProfile.rulesFingerprint ||
        coldReceipt.registryFingerprint !== registryFingerprint ||
        coldReceipt.outcome !== pure.outcome
      ) {
        fail("v2_firebase_activity_instances_machine_cold_replay_mismatch");
      }
      const body = Object.freeze({
        schemaVersion:
          V2_FIREBASE_ACTIVITY_INSTANCES_MACHINE_RECEIPT_SUMMARY_SCHEMA_V1,
        namespaceFingerprint:
          V2_ACTIVITY_INSTANCES_MACHINE_NAMESPACE_FINGERPRINT_V1,
        planFingerprint: coldReceipt.planFingerprint,
        courseContractFingerprint: coldReceipt.courseContractFingerprint,
        workspaceFingerprint: coldReceipt.workspaceFingerprint,
        stageId: coldReceipt.stageId,
        episodeId: coldReceipt.episodeId,
        candidateFingerprint: coldReceipt.candidateFingerprint,
        bodyFingerprint: coldReceipt.bodyFingerprint,
        packageFingerprint: coldReceipt.packageFingerprint,
        capabilitySnapshotFingerprint:
          coldReceipt.capabilitySnapshotFingerprint,
        repositoryOriginReceiptFingerprint:
          coldReceipt.repositoryOriginReceiptFingerprint,
        repositoryObservationFingerprint:
          coldReceipt.repositoryObservationFingerprint,
        d2OuterReceiptFingerprint: coldReceipt.d2OuterReceiptFingerprint,
        d2CommittedManifestFingerprint:
          coldReceipt.d2CommittedManifestFingerprint,
        d2CommittedOperationFingerprint:
          coldReceipt.d2CommittedOperationFingerprint,
        pureValidationResultFingerprint:
          coldReceipt.pureValidationResultFingerprint,
        validatorRulesFingerprint: coldReceipt.validatorRulesFingerprint,
        registryFingerprint: coldReceipt.registryFingerprint,
        machineReceiptFingerprint: coldReceipt.receiptFingerprint,
        machineManifestFingerprint: coldManifest.commitFingerprint,
        machineOperationFingerprint: coldManifest.operationFingerprint,
        outcome: coldReceipt.outcome,
        repositoryOriginAuthority:
          "authenticated_repository_snapshot_only" as const,
        dependencyResolutionAuthority:
          "authenticated_repository_stage_subset_only" as const,
        artifactStorageAuthority:
          coldReceipt.storageReadbackFingerprint === null
            ? ("none" as const)
            : ("firebase_admin_generation_pinned_readback" as const),
        durableReceiptStorageAuthority:
          "firebase_admin_generation_pinned_readback" as const,
        durableCommitAuthority:
          "firebase_admin_transaction_exact_readback" as const,
        machineValidationAuthority:
          "deterministic_activity_instances_structural_semantic_checks_only" as const,
        storedReceiptAuthority: "none" as const,
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
        kind: "v2_firebase_activity_instances_machine_receipt_handle" as const,
      });
      handles.add(handle);
      summaries.set(handle, summary);
      return handle;
    },
  });
}
