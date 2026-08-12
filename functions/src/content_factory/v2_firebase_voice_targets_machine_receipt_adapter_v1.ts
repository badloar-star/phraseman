import { createHash } from "node:crypto";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
} from "../../../modules/learning-v2/policies/decision_registry";
import type {
  V2CanonicalStageCandidateV2,
  V2GenerationStageWorkspaceV2,
} from "./v2_generation_workspace_contract_v2";
import type { V2VoiceTargetsPackageV2 } from "./v2_voice_targets_package_v2";
import type { V2VoiceTargetsValidationResultV1 } from "./v2_voice_targets_validator_v1";
import {
  V2_VOICE_TARGETS_MACHINE_RECEIPT_MAX_BYTES_V1,
  decideV2VoiceTargetsMachineManifestV1,
  materializeV2VoiceTargetsMachineManifestV1,
  materializeV2VoiceTargetsMachineReceiptV1,
  parseV2VoiceTargetsMachineManifestV1,
  parseV2VoiceTargetsMachineReceiptV1,
  v2VoiceTargetsMachineManifestDocumentPathV1,
  v2VoiceTargetsMachineReceiptObjectPathV1,
  type V2VoiceTargetsMachineManifestV1,
} from "./v2_voice_targets_machine_receipt_v1";
import { createV2FirebaseAdminRepositoryIoV1 } from "./v2_firebase_admin_repository_io_v1";
import {
  V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
  persistV2ImmutableRepositoryObjectV1,
  type V2RepositoryFirestorePortV1,
  type V2RepositoryImmutableStoragePortV1,
} from "./v2_firebase_repository_persistence_v1";

export const V2_FIREBASE_VOICE_TARGETS_MACHINE_RECEIPT_SUMMARY_SCHEMA_V1 =
  "v2-firebase-voice-targets-machine-receipt-summary.v1" as const;

export interface V2FirebaseVoiceTargetsMachineReceiptHandleV1 {
  readonly kind: "v2_firebase_voice_targets_machine_receipt_handle";
}

export interface V2FirebaseVoiceTargetsMachineReceiptSummaryV1 {
  readonly schemaVersion: typeof V2_FIREBASE_VOICE_TARGETS_MACHINE_RECEIPT_SUMMARY_SCHEMA_V1;
  readonly planFingerprint: string;
  readonly workspaceFingerprint: string;
  readonly stageId: string;
  readonly candidateFingerprint: string;
  readonly packageFingerprint: string;
  readonly pureValidationResultFingerprint: string;
  readonly machineReceiptFingerprint: string;
  readonly machineManifestFingerprint: string;
  readonly machineOperationFingerprint: string;
  readonly outcome: "blocked";
  readonly durableReceiptStorageAuthority: "firebase_admin_generation_pinned_readback";
  readonly durableCommitAuthority: "firebase_admin_transaction_exact_readback";
  readonly repositoryOriginAuthority: "none";
  readonly profileLifecycleAuthority: "none";
  readonly providerExecutionAuthority: "none";
  readonly audioByteAuthority: "none";
  readonly machineValidationAuthority: "none";
  readonly contentValidationAuthority: "none";
  readonly humanReviewAuthority: "none";
  readonly listeningEvidenceAuthority: "none";
  readonly deviceEvidenceAuthority: "none";
  readonly runtimeAuthority: "none";
  readonly executionAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly summaryFingerprint: string;
}

export interface V2FirebaseVoiceTargetsMachineReceiptAdapterV1 {
  commitBlockedReceipt(
    input: Readonly<{
      workspace: V2GenerationStageWorkspaceV2;
      candidate: V2CanonicalStageCandidateV2;
      packageValue: V2VoiceTargetsPackageV2;
      validation: V2VoiceTargetsValidationResultV1;
    }>,
  ): Promise<V2FirebaseVoiceTargetsMachineReceiptHandleV1>;
}

const handles = new WeakSet<object>();
const summaries = new WeakMap<
  object,
  V2FirebaseVoiceTargetsMachineReceiptSummaryV1
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
  proposed: V2VoiceTargetsMachineManifestV1,
): Promise<V2VoiceTargetsMachineManifestV1> {
  const documentPath = v2VoiceTargetsMachineManifestDocumentPathV1({
    planFingerprint: proposed.planFingerprint,
    stageId: proposed.stageId,
    candidateFingerprint: proposed.candidateFingerprint,
    validatorRulesFingerprint: proposed.validatorRulesFingerprint,
    registryFingerprint: proposed.registryFingerprint,
  });
  return firestore.runTransaction(async (transaction) => {
    const current = await transaction.readExact(documentPath);
    const decision = decideV2VoiceTargetsMachineManifestV1({
      currentRaw: current.exists ? current.raw : null,
      proposed,
    });
    if (decision.documentPath !== documentPath)
      fail("v2_firebase_voice_targets_machine_document_path_mismatch");
    if (decision.kind === "conflict")
      fail("v2_firebase_voice_targets_machine_manifest_conflict");
    if (decision.kind === "create") {
      await transaction.createExact(documentPath, decision.canonicalRaw);
      return decision.next;
    }
    return decision.committed;
  });
}

async function coldManifest(
  firestore: V2RepositoryFirestorePortV1,
  expected: V2VoiceTargetsMachineManifestV1,
): Promise<V2VoiceTargetsMachineManifestV1> {
  const documentPath = v2VoiceTargetsMachineManifestDocumentPathV1({
    planFingerprint: expected.planFingerprint,
    stageId: expected.stageId,
    candidateFingerprint: expected.candidateFingerprint,
    validatorRulesFingerprint: expected.validatorRulesFingerprint,
    registryFingerprint: expected.registryFingerprint,
  });
  return firestore.runTransaction(async (transaction) => {
    const current = await transaction.readExact(documentPath);
    if (!current.exists)
      fail("v2_firebase_voice_targets_machine_manifest_missing");
    const parsed = parseV2VoiceTargetsMachineManifestV1(current.raw);
    if (
      parsed.commitFingerprint !== expected.commitFingerprint ||
      parsed.operationFingerprint !== expected.operationFingerprint
    )
      fail("v2_firebase_voice_targets_machine_manifest_mismatch");
    return parsed;
  });
}

async function coldReceipt(
  storage: V2RepositoryImmutableStoragePortV1,
  manifest: V2VoiceTargetsMachineManifestV1,
) {
  const pin = manifest.receiptObject;
  const metadata = await storage.readMetadataExact(pin.objectPath);
  if (
    metadata === null ||
    metadata.generation !== pin.objectGeneration ||
    metadata.byteSize !== pin.byteSize ||
    metadata.contentHash !== pin.contentHash ||
    metadata.contentType !== V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1
  )
    fail("v2_firebase_voice_targets_machine_receipt_metadata_mismatch");
  const read = await storage.downloadGenerationExact({
    objectPath: pin.objectPath,
    ifGenerationMatch: pin.objectGeneration,
    maximumBytes: V2_VOICE_TARGETS_MACHINE_RECEIPT_MAX_BYTES_V1,
  });
  if (
    read.kind !== "downloaded" ||
    read.bytes.byteLength !== pin.byteSize ||
    sha256Bytes(read.bytes) !== pin.contentHash
  )
    fail("v2_firebase_voice_targets_machine_receipt_readback_mismatch");
  let raw: string;
  try {
    raw = decoder.decode(read.bytes);
  } catch {
    fail("v2_firebase_voice_targets_machine_receipt_utf8_invalid");
  }
  const receipt = parseV2VoiceTargetsMachineReceiptV1(raw);
  if (
    receipt.receiptFingerprint !== manifest.receiptFingerprint ||
    sha256Utf8(raw) !== manifest.receiptRawHash
  )
    fail("v2_firebase_voice_targets_machine_receipt_mismatch");
  return receipt;
}

export function createFirebaseAdminV2VoiceTargetsMachineReceiptAdapterV1(): V2FirebaseVoiceTargetsMachineReceiptAdapterV1 {
  const io = createV2FirebaseAdminRepositoryIoV1();
  return Object.freeze({
    commitBlockedReceipt: async (input: {
      readonly workspace: V2GenerationStageWorkspaceV2;
      readonly candidate: V2CanonicalStageCandidateV2;
      readonly packageValue: V2VoiceTargetsPackageV2;
      readonly validation: V2VoiceTargetsValidationResultV1;
    }) => {
      const receipt = materializeV2VoiceTargetsMachineReceiptV1(input);
      const receiptRaw = canonicalJsonV1(receipt);
      const receiptRawHash = sha256Utf8(receiptRaw);
      const receiptPath = v2VoiceTargetsMachineReceiptObjectPathV1({
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
        maximumBytes: V2_VOICE_TARGETS_MACHINE_RECEIPT_MAX_BYTES_V1,
        contentType: V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
        contentHash: receiptRawHash,
      });
      const proposed = materializeV2VoiceTargetsMachineManifestV1({
        receipt,
        objectGeneration: persisted.pin.objectGeneration,
        createdAtEpochMs: Date.now(),
      });
      const committed = await commitManifest(io.firestore, proposed);
      const coldCommitted = await coldManifest(io.firestore, committed);
      const coldStoredReceipt = await coldReceipt(io.storage, coldCommitted);
      if (
        canonicalJsonV1(coldStoredReceipt) !== receiptRaw ||
        coldStoredReceipt.pureValidationResultFingerprint !==
          input.validation.resultFingerprint ||
        coldStoredReceipt.packageFingerprint !==
          input.packageValue.root.artifactFingerprint ||
        coldStoredReceipt.outcome !== "blocked"
      )
        fail("v2_firebase_voice_targets_machine_cold_replay_mismatch");
      const body = Object.freeze({
        schemaVersion:
          V2_FIREBASE_VOICE_TARGETS_MACHINE_RECEIPT_SUMMARY_SCHEMA_V1,
        planFingerprint: coldStoredReceipt.planFingerprint,
        workspaceFingerprint: coldStoredReceipt.workspaceFingerprint,
        stageId: coldStoredReceipt.stageId,
        candidateFingerprint: coldStoredReceipt.candidateFingerprint,
        packageFingerprint: coldStoredReceipt.packageFingerprint,
        pureValidationResultFingerprint:
          coldStoredReceipt.pureValidationResultFingerprint,
        machineReceiptFingerprint: coldStoredReceipt.receiptFingerprint,
        machineManifestFingerprint: coldCommitted.commitFingerprint,
        machineOperationFingerprint: coldCommitted.operationFingerprint,
        outcome: "blocked" as const,
        durableReceiptStorageAuthority:
          "firebase_admin_generation_pinned_readback" as const,
        durableCommitAuthority:
          "firebase_admin_transaction_exact_readback" as const,
        repositoryOriginAuthority: "none" as const,
        profileLifecycleAuthority: "none" as const,
        providerExecutionAuthority: "none" as const,
        audioByteAuthority: "none" as const,
        machineValidationAuthority: "none" as const,
        contentValidationAuthority: "none" as const,
        humanReviewAuthority: "none" as const,
        listeningEvidenceAuthority: "none" as const,
        deviceEvidenceAuthority: "none" as const,
        runtimeAuthority: "none" as const,
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
        kind: "v2_firebase_voice_targets_machine_receipt_handle" as const,
      });
      handles.add(handle);
      summaries.set(handle, summary);
      return handle;
    },
  });
}

export function isV2FirebaseVoiceTargetsMachineReceiptHandleV1(
  value: unknown,
): value is V2FirebaseVoiceTargetsMachineReceiptHandleV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}

export function getV2FirebaseVoiceTargetsMachineReceiptSummaryV1(
  handle: V2FirebaseVoiceTargetsMachineReceiptHandleV1,
): V2FirebaseVoiceTargetsMachineReceiptSummaryV1 {
  const summary = summaries.get(handle);
  if (!summary) fail("v2_firebase_voice_targets_machine_handle_invalid");
  return summary;
}
