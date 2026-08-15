import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import { V2_FIREBASE_REPOSITORY_NAMESPACE_FINGERPRINT_V1 } from "./v2_firebase_repository_trust_root_v1";

export const V2_ACTIVITY_STAGE_COMMIT_NAMESPACE_SCHEMA_V1 =
  "v2-activity-stage-commit-namespace.v1" as const;
export const V2_ACTIVITY_STAGE_CANDIDATE_PIN_SCHEMA_V1 =
  "v2-activity-stage-candidate-pin.v1" as const;
export const V2_ACTIVITY_STAGE_INNER_RECEIPT_PIN_SCHEMA_V1 =
  "v2-activity-stage-inner-blocked-receipt-pin.v1" as const;
export const V2_ACTIVITY_STAGE_BLOCKED_COMMIT_RECEIPT_SCHEMA_V1 =
  "v2-activity-stage-blocked-commit-receipt.v1" as const;
export const V2_ACTIVITY_STAGE_COMMITTED_MANIFEST_SCHEMA_V1 =
  "v2-activity-stage-committed-blocked-manifest.v1" as const;

export const V2_ACTIVITY_STAGE_CANDIDATE_MAX_BYTES_V1 = 512 * 1024;
export const V2_ACTIVITY_STAGE_INNER_RECEIPT_MAX_BYTES_V1 = 64 * 1024;
export const V2_ACTIVITY_STAGE_OUTER_RECEIPT_MAX_BYTES_V1 = 64 * 1024;
export const V2_ACTIVITY_STAGE_MANIFEST_MAX_BYTES_V1 = 32 * 1024;

export const V2_ACTIVITY_STAGE_COMMIT_NAMESPACE_BODY_V1 = Object.freeze({
  schemaVersion: V2_ACTIVITY_STAGE_COMMIT_NAMESPACE_SCHEMA_V1,
  parentRepositoryNamespaceFingerprint:
    V2_FIREBASE_REPOSITORY_NAMESPACE_FINGERPRINT_V1,
  firestore: Object.freeze({
    committedBlockedManifestCollection: "content_v2_stage_repository_commits",
  }),
  storage: Object.freeze({
    candidatePrefix:
      "learning-v2/repository-auth/private/activity-stage-candidates/v1",
    innerReceiptPrefix:
      "learning-v2/repository-auth/private/activity-stage-inner-receipts/v1",
    outerReceiptPrefix:
      "learning-v2/repository-auth/private/activity-stage-commit-receipts/v1",
  }),
  policy: Object.freeze({
    immutableCreate: "ifGenerationMatch:0",
    readback: "exact_generation_hash_size_content_type",
    firestoreCommit: "direct_key_create_or_exact_replay",
    publicationAuthority: "none",
  }),
});

export const V2_ACTIVITY_STAGE_COMMIT_NAMESPACE_FINGERPRINT_V1 =
  hashCanonicalBody(V2_ACTIVITY_STAGE_COMMIT_NAMESPACE_BODY_V1);

const HASH_RE = /^[a-f0-9]{64}$/;
const STAGE_RE = /^[A-Za-z0-9._:-]{1,1000}$/;
const GENERATION_RE = /^[1-9][0-9]{0,30}$/;
const PATH_RE = /^[A-Za-z0-9._/@:+-]{1,1000}$/;
const JSON_CONTENT_TYPE = "application/json; charset=utf-8" as const;

type JsonRecord = Record<string, unknown>;

export interface V2ActivityStageRawObjectPinV1 {
  readonly objectPath: string;
  readonly contentHash: string;
  readonly objectGeneration: string;
  readonly byteSize: number;
  readonly contentType: typeof JSON_CONTENT_TYPE;
}

export interface V2ActivityStageCandidatePinV1 {
  readonly schemaVersion: typeof V2_ACTIVITY_STAGE_CANDIDATE_PIN_SCHEMA_V1;
  readonly namespaceFingerprint: string;
  readonly planFingerprint: string;
  readonly stageId: string;
  readonly candidateFingerprint: string;
  readonly candidateRawHash: string;
  readonly object: V2ActivityStageRawObjectPinV1;
  readonly pinFingerprint: string;
}

export interface V2ActivityStageInnerReceiptPinV1 {
  readonly schemaVersion: typeof V2_ACTIVITY_STAGE_INNER_RECEIPT_PIN_SCHEMA_V1;
  readonly namespaceFingerprint: string;
  readonly planFingerprint: string;
  readonly stageId: string;
  readonly candidateFingerprint: string;
  readonly innerReceiptFingerprint: string;
  readonly innerReceiptRawHash: string;
  readonly object: V2ActivityStageRawObjectPinV1;
  readonly pinFingerprint: string;
}

export interface V2ActivityStageBlockedCommitReceiptV1 {
  readonly schemaVersion: typeof V2_ACTIVITY_STAGE_BLOCKED_COMMIT_RECEIPT_SCHEMA_V1;
  readonly namespaceFingerprint: string;
  readonly parentRepositoryNamespaceFingerprint: string;
  readonly planFingerprint: string;
  readonly courseContractFingerprint: string;
  readonly workspaceFingerprint: string;
  readonly stageId: string;
  readonly subjectFingerprint: string;
  readonly candidateFingerprint: string;
  readonly candidatePin: V2ActivityStageCandidatePinV1;
  readonly innerReceiptFingerprint: string;
  readonly innerReceiptPin: V2ActivityStageInnerReceiptPinV1;
  readonly repositoryOriginReceiptFingerprint: string;
  readonly repositoryObservationFingerprint: string;
  readonly authenticatedStageBindingFingerprint: string;
  readonly authenticatedStageBindingKind: "activity_instances_exact_subset";
  readonly outcome: "blocked";
  readonly candidateClassification: "structural_candidate_only";
  readonly commitAuthority: "durable_blocked_receipt_pin_commit_only";
  readonly candidateOriginAuthority: "none";
  readonly repositoryOriginAuthority: "none";
  readonly dependencyResolutionAuthority: "none";
  readonly machineValidationAuthority: "none";
  readonly contentValidationAuthority: "none";
  readonly principalIdentityAuthority: "none";
  readonly humanReviewAuthority: "none";
  readonly specialistEvidenceAuthority: "none";
  readonly deviceEvidenceAuthority: "none";
  readonly listeningEvidenceAuthority: "none";
  readonly runtimeKernelAuthority: "none";
  readonly executionAuthority: "none";
  readonly publicationDecisionAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseAuthority: false;
  readonly receiptFingerprint: string;
}

export interface V2ActivityStageCommittedManifestV1 {
  readonly schemaVersion: typeof V2_ACTIVITY_STAGE_COMMITTED_MANIFEST_SCHEMA_V1;
  readonly state: "committed_blocked";
  readonly namespaceFingerprint: string;
  readonly commitKey: string;
  readonly planFingerprint: string;
  readonly stageId: string;
  readonly candidateFingerprint: string;
  readonly outerReceiptFingerprint: string;
  readonly outerReceiptRawHash: string;
  readonly outerReceiptObject: V2ActivityStageRawObjectPinV1;
  readonly commitFingerprint: string;
  readonly operationRevision: 1;
  readonly createdAtEpochMs: number;
  readonly operationFingerprint: string;
}

export type V2ActivityStageManifestCommitDecisionV1 =
  | Readonly<{
      kind: "create";
      documentPath: string;
      canonicalRaw: string;
      next: V2ActivityStageCommittedManifestV1;
    }>
  | Readonly<{
      kind: "exact_replay";
      documentPath: string;
      committed: V2ActivityStageCommittedManifestV1;
    }>
  | Readonly<{
      kind: "conflict";
      documentPath: string;
      reason: "committed_payload_conflict";
    }>;

function fail(code: string): never {
  throw new Error(code);
}

function record(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: JsonRecord, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...keys].sort();
  return (
    actual.length === wanted.length &&
    actual.every((key, i) => key === wanted[i])
  );
}

function hash(value: unknown, code: string): string {
  if (typeof value !== "string" || !HASH_RE.test(value)) fail(code);
  return value;
}

function stage(value: unknown, code: string): string {
  if (typeof value !== "string" || !STAGE_RE.test(value)) fail(code);
  return value;
}

function generation(value: unknown, code: string): string {
  if (typeof value !== "string" || !GENERATION_RE.test(value)) fail(code);
  return value;
}

function path(value: unknown, code: string): string {
  if (typeof value !== "string" || !PATH_RE.test(value)) fail(code);
  const segments = value.split("/");
  if (
    segments.some((segment) => !segment || segment === "." || segment === "..")
  )
    fail(code);
  return value;
}

function bytes(value: unknown, maximum: number, code: string): number {
  if (
    !Number.isSafeInteger(value) ||
    Number(value) < 1 ||
    Number(value) > maximum
  )
    fail(code);
  return Number(value);
}

function epoch(value: unknown, code: string): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) fail(code);
  return Number(value);
}

function parseCanonical(
  raw: unknown,
  maximum: number,
  code: string,
): JsonRecord {
  if (
    typeof raw !== "string" ||
    raw.length < 2 ||
    utf8ByteLengthV1(raw) > maximum
  )
    fail(code);
  let value: unknown;
  try {
    value = JSON.parse(raw) as unknown;
  } catch {
    fail(code);
  }
  if (!record(value) || canonicalJsonV1(value) !== raw) fail(code);
  return value;
}

function stageKey(planFingerprint: string, stageId: string): string {
  return hashCanonicalBody({
    schemaVersion: "v2-activity-stage-coordinate-key.v1",
    planFingerprint: hash(
      planFingerprint,
      "v2_activity_stage_commit_identity_invalid",
    ),
    stageId: stage(stageId, "v2_activity_stage_commit_identity_invalid"),
  });
}

export function v2ActivityStageCommitKeyV1(input: {
  readonly planFingerprint: string;
  readonly stageId: string;
  readonly candidateFingerprint: string;
}): string {
  if (
    !record(input) ||
    !exactKeys(input, ["planFingerprint", "stageId", "candidateFingerprint"])
  )
    fail("v2_activity_stage_commit_identity_invalid");
  return hashCanonicalBody({
    schemaVersion: "v2-activity-stage-commit-key.v1",
    planFingerprint: hash(
      input.planFingerprint,
      "v2_activity_stage_commit_identity_invalid",
    ),
    stageId: stage(input.stageId, "v2_activity_stage_commit_identity_invalid"),
    candidateFingerprint: hash(
      input.candidateFingerprint,
      "v2_activity_stage_commit_identity_invalid",
    ),
  });
}

function storagePath(
  prefix: string,
  input: {
    planFingerprint: string;
    stageId: string;
    candidateFingerprint: string;
  },
  logicalFingerprint: string,
  rawHash: string,
): string {
  const plan = hash(
    input.planFingerprint,
    "v2_activity_stage_commit_path_invalid",
  );
  const candidate = hash(
    input.candidateFingerprint,
    "v2_activity_stage_commit_path_invalid",
  );
  const logical = hash(
    logicalFingerprint,
    "v2_activity_stage_commit_path_invalid",
  );
  const raw = hash(rawHash, "v2_activity_stage_commit_path_invalid");
  const value = `${prefix}/${plan}/${stageKey(plan, input.stageId)}/${candidate}/${logical}/${raw}.json`;
  return path(value, "v2_activity_stage_commit_path_invalid");
}

export function v2ActivityStageCandidateObjectPathV1(input: {
  planFingerprint: string;
  stageId: string;
  candidateFingerprint: string;
  candidateRawHash: string;
}): string {
  return storagePath(
    V2_ACTIVITY_STAGE_COMMIT_NAMESPACE_BODY_V1.storage.candidatePrefix,
    input,
    input.candidateFingerprint,
    input.candidateRawHash,
  );
}

export function v2ActivityStageInnerReceiptObjectPathV1(input: {
  planFingerprint: string;
  stageId: string;
  candidateFingerprint: string;
  innerReceiptFingerprint: string;
  innerReceiptRawHash: string;
}): string {
  return storagePath(
    V2_ACTIVITY_STAGE_COMMIT_NAMESPACE_BODY_V1.storage.innerReceiptPrefix,
    input,
    input.innerReceiptFingerprint,
    input.innerReceiptRawHash,
  );
}

export function v2ActivityStageOuterReceiptObjectPathV1(input: {
  planFingerprint: string;
  stageId: string;
  candidateFingerprint: string;
  outerReceiptFingerprint: string;
  outerReceiptRawHash: string;
}): string {
  return storagePath(
    V2_ACTIVITY_STAGE_COMMIT_NAMESPACE_BODY_V1.storage.outerReceiptPrefix,
    input,
    input.outerReceiptFingerprint,
    input.outerReceiptRawHash,
  );
}

export function v2ActivityStageManifestDocumentPathV1(input: {
  planFingerprint: string;
  stageId: string;
  candidateFingerprint: string;
}): string {
  return `${V2_ACTIVITY_STAGE_COMMIT_NAMESPACE_BODY_V1.firestore.committedBlockedManifestCollection}/${v2ActivityStageCommitKeyV1(input)}`;
}

function rawPin(
  value: unknown,
  maximum: number,
  expectedPath: string,
  code: string,
): V2ActivityStageRawObjectPinV1 {
  if (
    !record(value) ||
    !exactKeys(value, [
      "objectPath",
      "contentHash",
      "objectGeneration",
      "byteSize",
      "contentType",
    ])
  )
    fail(code);
  const parsed = Object.freeze({
    objectPath: path(value.objectPath, code),
    contentHash: hash(value.contentHash, code),
    objectGeneration: generation(value.objectGeneration, code),
    byteSize: bytes(value.byteSize, maximum, code),
    contentType:
      value.contentType === JSON_CONTENT_TYPE ? JSON_CONTENT_TYPE : fail(code),
  });
  if (parsed.objectPath !== expectedPath) fail(code);
  return parsed;
}

export function materializeV2ActivityStageCandidatePinV1(input: {
  planFingerprint: string;
  stageId: string;
  candidateFingerprint: string;
  candidateRawHash: string;
  objectGeneration: string;
  byteSize: number;
}): V2ActivityStageCandidatePinV1 {
  if (
    !record(input) ||
    !exactKeys(input, [
      "planFingerprint",
      "stageId",
      "candidateFingerprint",
      "candidateRawHash",
      "objectGeneration",
      "byteSize",
    ])
  )
    fail("v2_activity_stage_candidate_pin_invalid");
  const base = Object.freeze({
    schemaVersion: V2_ACTIVITY_STAGE_CANDIDATE_PIN_SCHEMA_V1,
    namespaceFingerprint: V2_ACTIVITY_STAGE_COMMIT_NAMESPACE_FINGERPRINT_V1,
    planFingerprint: hash(
      input.planFingerprint,
      "v2_activity_stage_candidate_pin_invalid",
    ),
    stageId: stage(input.stageId, "v2_activity_stage_candidate_pin_invalid"),
    candidateFingerprint: hash(
      input.candidateFingerprint,
      "v2_activity_stage_candidate_pin_invalid",
    ),
    candidateRawHash: hash(
      input.candidateRawHash,
      "v2_activity_stage_candidate_pin_invalid",
    ),
    object: Object.freeze({
      objectPath: v2ActivityStageCandidateObjectPathV1(input),
      contentHash: input.candidateRawHash,
      objectGeneration: generation(
        input.objectGeneration,
        "v2_activity_stage_candidate_pin_invalid",
      ),
      byteSize: bytes(
        input.byteSize,
        V2_ACTIVITY_STAGE_CANDIDATE_MAX_BYTES_V1,
        "v2_activity_stage_candidate_pin_invalid",
      ),
      contentType: JSON_CONTENT_TYPE,
    }),
  });
  return Object.freeze({ ...base, pinFingerprint: hashCanonicalBody(base) });
}

export function parseV2ActivityStageCandidatePinV1(
  raw: string,
): V2ActivityStageCandidatePinV1 {
  const code = "v2_activity_stage_candidate_pin_invalid";
  const value = parseCanonical(raw, 16 * 1024, code);
  if (
    !exactKeys(value, [
      "schemaVersion",
      "namespaceFingerprint",
      "planFingerprint",
      "stageId",
      "candidateFingerprint",
      "candidateRawHash",
      "object",
      "pinFingerprint",
    ]) ||
    value.schemaVersion !== V2_ACTIVITY_STAGE_CANDIDATE_PIN_SCHEMA_V1 ||
    value.namespaceFingerprint !==
      V2_ACTIVITY_STAGE_COMMIT_NAMESPACE_FINGERPRINT_V1
  )
    fail(code);
  const expectedPath = v2ActivityStageCandidateObjectPathV1(value as never);
  const base = Object.freeze({
    schemaVersion: V2_ACTIVITY_STAGE_CANDIDATE_PIN_SCHEMA_V1,
    namespaceFingerprint: V2_ACTIVITY_STAGE_COMMIT_NAMESPACE_FINGERPRINT_V1,
    planFingerprint: hash(value.planFingerprint, code),
    stageId: stage(value.stageId, code),
    candidateFingerprint: hash(value.candidateFingerprint, code),
    candidateRawHash: hash(value.candidateRawHash, code),
    object: rawPin(
      value.object,
      V2_ACTIVITY_STAGE_CANDIDATE_MAX_BYTES_V1,
      expectedPath,
      code,
    ),
  });
  if (
    base.object.contentHash !== base.candidateRawHash ||
    value.pinFingerprint !== hashCanonicalBody(base)
  )
    fail(code);
  return Object.freeze({
    ...base,
    pinFingerprint: value.pinFingerprint as string,
  });
}

export function materializeV2ActivityStageInnerReceiptPinV1(input: {
  planFingerprint: string;
  stageId: string;
  candidateFingerprint: string;
  innerReceiptFingerprint: string;
  innerReceiptRawHash: string;
  objectGeneration: string;
  byteSize: number;
}): V2ActivityStageInnerReceiptPinV1 {
  if (!record(input)) fail("v2_activity_stage_inner_receipt_pin_invalid");
  const base = Object.freeze({
    schemaVersion: V2_ACTIVITY_STAGE_INNER_RECEIPT_PIN_SCHEMA_V1,
    namespaceFingerprint: V2_ACTIVITY_STAGE_COMMIT_NAMESPACE_FINGERPRINT_V1,
    planFingerprint: hash(
      input.planFingerprint,
      "v2_activity_stage_inner_receipt_pin_invalid",
    ),
    stageId: stage(
      input.stageId,
      "v2_activity_stage_inner_receipt_pin_invalid",
    ),
    candidateFingerprint: hash(
      input.candidateFingerprint,
      "v2_activity_stage_inner_receipt_pin_invalid",
    ),
    innerReceiptFingerprint: hash(
      input.innerReceiptFingerprint,
      "v2_activity_stage_inner_receipt_pin_invalid",
    ),
    innerReceiptRawHash: hash(
      input.innerReceiptRawHash,
      "v2_activity_stage_inner_receipt_pin_invalid",
    ),
    object: Object.freeze({
      objectPath: v2ActivityStageInnerReceiptObjectPathV1(input),
      contentHash: input.innerReceiptRawHash,
      objectGeneration: generation(
        input.objectGeneration,
        "v2_activity_stage_inner_receipt_pin_invalid",
      ),
      byteSize: bytes(
        input.byteSize,
        V2_ACTIVITY_STAGE_INNER_RECEIPT_MAX_BYTES_V1,
        "v2_activity_stage_inner_receipt_pin_invalid",
      ),
      contentType: JSON_CONTENT_TYPE,
    }),
  });
  return Object.freeze({ ...base, pinFingerprint: hashCanonicalBody(base) });
}

export function parseV2ActivityStageInnerReceiptPinV1(
  raw: string,
): V2ActivityStageInnerReceiptPinV1 {
  const code = "v2_activity_stage_inner_receipt_pin_invalid";
  const value = parseCanonical(raw, 16 * 1024, code);
  if (
    !exactKeys(value, [
      "schemaVersion",
      "namespaceFingerprint",
      "planFingerprint",
      "stageId",
      "candidateFingerprint",
      "innerReceiptFingerprint",
      "innerReceiptRawHash",
      "object",
      "pinFingerprint",
    ]) ||
    value.schemaVersion !== V2_ACTIVITY_STAGE_INNER_RECEIPT_PIN_SCHEMA_V1 ||
    value.namespaceFingerprint !==
      V2_ACTIVITY_STAGE_COMMIT_NAMESPACE_FINGERPRINT_V1
  )
    fail(code);
  const expectedPath = v2ActivityStageInnerReceiptObjectPathV1(value as never);
  const base = Object.freeze({
    schemaVersion: V2_ACTIVITY_STAGE_INNER_RECEIPT_PIN_SCHEMA_V1,
    namespaceFingerprint: V2_ACTIVITY_STAGE_COMMIT_NAMESPACE_FINGERPRINT_V1,
    planFingerprint: hash(value.planFingerprint, code),
    stageId: stage(value.stageId, code),
    candidateFingerprint: hash(value.candidateFingerprint, code),
    innerReceiptFingerprint: hash(value.innerReceiptFingerprint, code),
    innerReceiptRawHash: hash(value.innerReceiptRawHash, code),
    object: rawPin(
      value.object,
      V2_ACTIVITY_STAGE_INNER_RECEIPT_MAX_BYTES_V1,
      expectedPath,
      code,
    ),
  });
  if (
    base.object.contentHash !== base.innerReceiptRawHash ||
    value.pinFingerprint !== hashCanonicalBody(base)
  )
    fail(code);
  return Object.freeze({
    ...base,
    pinFingerprint: value.pinFingerprint as string,
  });
}

export function materializeV2ActivityStageBlockedCommitReceiptV1(input: {
  planFingerprint: string;
  courseContractFingerprint: string;
  workspaceFingerprint: string;
  stageId: string;
  subjectFingerprint: string;
  candidateFingerprint: string;
  candidatePin: V2ActivityStageCandidatePinV1;
  innerReceiptFingerprint: string;
  innerReceiptPin: V2ActivityStageInnerReceiptPinV1;
  repositoryOriginReceiptFingerprint: string;
  repositoryObservationFingerprint: string;
  authenticatedStageBindingFingerprint: string;
}): V2ActivityStageBlockedCommitReceiptV1 {
  if (!record(input)) fail("v2_activity_stage_blocked_commit_receipt_invalid");
  const planFingerprint = hash(
    input.planFingerprint,
    "v2_activity_stage_blocked_commit_receipt_invalid",
  );
  const stageId = stage(
    input.stageId,
    "v2_activity_stage_blocked_commit_receipt_invalid",
  );
  const candidateFingerprint = hash(
    input.candidateFingerprint,
    "v2_activity_stage_blocked_commit_receipt_invalid",
  );
  if (
    input.candidatePin.planFingerprint !== planFingerprint ||
    input.candidatePin.stageId !== stageId ||
    input.candidatePin.candidateFingerprint !== candidateFingerprint ||
    input.innerReceiptPin.planFingerprint !== planFingerprint ||
    input.innerReceiptPin.stageId !== stageId ||
    input.innerReceiptPin.candidateFingerprint !== candidateFingerprint ||
    input.innerReceiptPin.innerReceiptFingerprint !==
      input.innerReceiptFingerprint
  )
    fail("v2_activity_stage_blocked_commit_cross_binding");
  const base = Object.freeze({
    schemaVersion: V2_ACTIVITY_STAGE_BLOCKED_COMMIT_RECEIPT_SCHEMA_V1,
    namespaceFingerprint: V2_ACTIVITY_STAGE_COMMIT_NAMESPACE_FINGERPRINT_V1,
    parentRepositoryNamespaceFingerprint:
      V2_FIREBASE_REPOSITORY_NAMESPACE_FINGERPRINT_V1,
    planFingerprint,
    courseContractFingerprint: hash(
      input.courseContractFingerprint,
      "v2_activity_stage_blocked_commit_receipt_invalid",
    ),
    workspaceFingerprint: hash(
      input.workspaceFingerprint,
      "v2_activity_stage_blocked_commit_receipt_invalid",
    ),
    stageId,
    subjectFingerprint: hash(
      input.subjectFingerprint,
      "v2_activity_stage_blocked_commit_receipt_invalid",
    ),
    candidateFingerprint,
    candidatePin: input.candidatePin,
    innerReceiptFingerprint: hash(
      input.innerReceiptFingerprint,
      "v2_activity_stage_blocked_commit_receipt_invalid",
    ),
    innerReceiptPin: input.innerReceiptPin,
    repositoryOriginReceiptFingerprint: hash(
      input.repositoryOriginReceiptFingerprint,
      "v2_activity_stage_blocked_commit_receipt_invalid",
    ),
    repositoryObservationFingerprint: hash(
      input.repositoryObservationFingerprint,
      "v2_activity_stage_blocked_commit_receipt_invalid",
    ),
    authenticatedStageBindingFingerprint: hash(
      input.authenticatedStageBindingFingerprint,
      "v2_activity_stage_blocked_commit_receipt_invalid",
    ),
    authenticatedStageBindingKind: "activity_instances_exact_subset" as const,
    outcome: "blocked" as const,
    candidateClassification: "structural_candidate_only" as const,
    commitAuthority: "durable_blocked_receipt_pin_commit_only" as const,
    candidateOriginAuthority: "none" as const,
    repositoryOriginAuthority: "none" as const,
    dependencyResolutionAuthority: "none" as const,
    machineValidationAuthority: "none" as const,
    contentValidationAuthority: "none" as const,
    principalIdentityAuthority: "none" as const,
    humanReviewAuthority: "none" as const,
    specialistEvidenceAuthority: "none" as const,
    deviceEvidenceAuthority: "none" as const,
    listeningEvidenceAuthority: "none" as const,
    runtimeKernelAuthority: "none" as const,
    executionAuthority: "none" as const,
    publicationDecisionAuthority: "none" as const,
    publicationAuthority: "none" as const,
    runtimeConsumer: false as const,
    releaseAuthority: false as const,
  });
  const receipt = Object.freeze({
    ...base,
    receiptFingerprint: hashCanonicalBody(base),
  });
  if (
    utf8ByteLengthV1(canonicalJsonV1(receipt)) >
    V2_ACTIVITY_STAGE_OUTER_RECEIPT_MAX_BYTES_V1
  )
    fail("v2_activity_stage_blocked_commit_receipt_oversize");
  return receipt;
}

export function parseV2ActivityStageBlockedCommitReceiptV1(
  raw: string,
): V2ActivityStageBlockedCommitReceiptV1 {
  const code = "v2_activity_stage_blocked_commit_receipt_invalid";
  const value = parseCanonical(
    raw,
    V2_ACTIVITY_STAGE_OUTER_RECEIPT_MAX_BYTES_V1,
    code,
  );
  const candidatePin = parseV2ActivityStageCandidatePinV1(
    canonicalJsonV1(value.candidatePin),
  );
  const innerReceiptPin = parseV2ActivityStageInnerReceiptPinV1(
    canonicalJsonV1(value.innerReceiptPin),
  );
  const rebuilt = materializeV2ActivityStageBlockedCommitReceiptV1({
    planFingerprint: value.planFingerprint as string,
    courseContractFingerprint: value.courseContractFingerprint as string,
    workspaceFingerprint: value.workspaceFingerprint as string,
    stageId: value.stageId as string,
    subjectFingerprint: value.subjectFingerprint as string,
    candidateFingerprint: value.candidateFingerprint as string,
    candidatePin,
    innerReceiptFingerprint: value.innerReceiptFingerprint as string,
    innerReceiptPin,
    repositoryOriginReceiptFingerprint:
      value.repositoryOriginReceiptFingerprint as string,
    repositoryObservationFingerprint:
      value.repositoryObservationFingerprint as string,
    authenticatedStageBindingFingerprint:
      value.authenticatedStageBindingFingerprint as string,
  });
  if (canonicalJsonV1(rebuilt) !== raw) fail(code);
  return rebuilt;
}

function manifestStable(
  value: Pick<
    V2ActivityStageCommittedManifestV1,
    | "namespaceFingerprint"
    | "commitKey"
    | "planFingerprint"
    | "stageId"
    | "candidateFingerprint"
    | "outerReceiptFingerprint"
    | "outerReceiptRawHash"
    | "outerReceiptObject"
  >,
) {
  return Object.freeze({
    namespaceFingerprint: value.namespaceFingerprint,
    commitKey: value.commitKey,
    planFingerprint: value.planFingerprint,
    stageId: value.stageId,
    candidateFingerprint: value.candidateFingerprint,
    outerReceiptFingerprint: value.outerReceiptFingerprint,
    outerReceiptRawHash: value.outerReceiptRawHash,
    outerReceiptObject: value.outerReceiptObject,
  });
}

export function materializeV2ActivityStageCommittedManifestV1(input: {
  receipt: V2ActivityStageBlockedCommitReceiptV1;
  outerReceiptRawHash: string;
  objectGeneration: string;
  byteSize: number;
  createdAtEpochMs: number;
}): V2ActivityStageCommittedManifestV1 {
  if (!record(input)) fail("v2_activity_stage_committed_manifest_invalid");
  const receipt = input.receipt;
  const outerReceiptRawHash = hash(
    input.outerReceiptRawHash,
    "v2_activity_stage_committed_manifest_invalid",
  );
  const objectPath = v2ActivityStageOuterReceiptObjectPathV1({
    planFingerprint: receipt.planFingerprint,
    stageId: receipt.stageId,
    candidateFingerprint: receipt.candidateFingerprint,
    outerReceiptFingerprint: receipt.receiptFingerprint,
    outerReceiptRawHash,
  });
  const stable = Object.freeze({
    namespaceFingerprint: V2_ACTIVITY_STAGE_COMMIT_NAMESPACE_FINGERPRINT_V1,
    commitKey: v2ActivityStageCommitKeyV1({
      planFingerprint: receipt.planFingerprint,
      stageId: receipt.stageId,
      candidateFingerprint: receipt.candidateFingerprint,
    }),
    planFingerprint: receipt.planFingerprint,
    stageId: receipt.stageId,
    candidateFingerprint: receipt.candidateFingerprint,
    outerReceiptFingerprint: receipt.receiptFingerprint,
    outerReceiptRawHash,
    outerReceiptObject: Object.freeze({
      objectPath,
      contentHash: outerReceiptRawHash,
      objectGeneration: generation(
        input.objectGeneration,
        "v2_activity_stage_committed_manifest_invalid",
      ),
      byteSize: bytes(
        input.byteSize,
        V2_ACTIVITY_STAGE_OUTER_RECEIPT_MAX_BYTES_V1,
        "v2_activity_stage_committed_manifest_invalid",
      ),
      contentType: JSON_CONTENT_TYPE,
    }),
  });
  const base = Object.freeze({
    schemaVersion: V2_ACTIVITY_STAGE_COMMITTED_MANIFEST_SCHEMA_V1,
    state: "committed_blocked" as const,
    ...stable,
    commitFingerprint: hashCanonicalBody(stable),
    operationRevision: 1 as const,
    createdAtEpochMs: epoch(
      input.createdAtEpochMs,
      "v2_activity_stage_committed_manifest_invalid",
    ),
  });
  const result = Object.freeze({
    ...base,
    operationFingerprint: hashCanonicalBody(base),
  });
  if (
    utf8ByteLengthV1(canonicalJsonV1(result)) >
    V2_ACTIVITY_STAGE_MANIFEST_MAX_BYTES_V1
  )
    fail("v2_activity_stage_committed_manifest_oversize");
  return result;
}

export function parseV2ActivityStageCommittedManifestV1(
  raw: string,
): V2ActivityStageCommittedManifestV1 {
  const code = "v2_activity_stage_committed_manifest_invalid";
  const value = parseCanonical(
    raw,
    V2_ACTIVITY_STAGE_MANIFEST_MAX_BYTES_V1,
    code,
  );
  if (
    value.schemaVersion !== V2_ACTIVITY_STAGE_COMMITTED_MANIFEST_SCHEMA_V1 ||
    value.state !== "committed_blocked" ||
    value.namespaceFingerprint !==
      V2_ACTIVITY_STAGE_COMMIT_NAMESPACE_FINGERPRINT_V1 ||
    value.operationRevision !== 1
  )
    fail(code);
  const identity = {
    planFingerprint: hash(value.planFingerprint, code),
    stageId: stage(value.stageId, code),
    candidateFingerprint: hash(value.candidateFingerprint, code),
  };
  const commitKey = v2ActivityStageCommitKeyV1(identity);
  if (value.commitKey !== commitKey) fail(code);
  const outerReceiptFingerprint = hash(value.outerReceiptFingerprint, code);
  const outerReceiptRawHash = hash(value.outerReceiptRawHash, code);
  const expectedPath = v2ActivityStageOuterReceiptObjectPathV1({
    ...identity,
    outerReceiptFingerprint,
    outerReceiptRawHash,
  });
  const outerReceiptObject = rawPin(
    value.outerReceiptObject,
    V2_ACTIVITY_STAGE_OUTER_RECEIPT_MAX_BYTES_V1,
    expectedPath,
    code,
  );
  if (outerReceiptObject.contentHash !== outerReceiptRawHash) fail(code);
  const stable = Object.freeze({
    namespaceFingerprint: V2_ACTIVITY_STAGE_COMMIT_NAMESPACE_FINGERPRINT_V1,
    commitKey,
    ...identity,
    outerReceiptFingerprint,
    outerReceiptRawHash,
    outerReceiptObject,
  });
  const commitFingerprint = hash(value.commitFingerprint, code);
  if (commitFingerprint !== hashCanonicalBody(stable)) fail(code);
  const base = Object.freeze({
    schemaVersion: V2_ACTIVITY_STAGE_COMMITTED_MANIFEST_SCHEMA_V1,
    state: "committed_blocked" as const,
    ...stable,
    commitFingerprint,
    operationRevision: 1 as const,
    createdAtEpochMs: epoch(value.createdAtEpochMs, code),
  });
  if (value.operationFingerprint !== hashCanonicalBody(base)) fail(code);
  const parsed = Object.freeze({
    ...base,
    operationFingerprint: value.operationFingerprint as string,
  });
  if (canonicalJsonV1(parsed) !== raw) fail(code);
  return parsed;
}

export function decideV2ActivityStageManifestCommitV1(input: {
  currentRaw: string | null;
  proposed: V2ActivityStageCommittedManifestV1;
}): V2ActivityStageManifestCommitDecisionV1 {
  if (!record(input) || !exactKeys(input, ["currentRaw", "proposed"]))
    fail("v2_activity_stage_manifest_decision_invalid");
  const proposed = parseV2ActivityStageCommittedManifestV1(
    canonicalJsonV1(input.proposed),
  );
  const documentPath = v2ActivityStageManifestDocumentPathV1({
    planFingerprint: proposed.planFingerprint,
    stageId: proposed.stageId,
    candidateFingerprint: proposed.candidateFingerprint,
  });
  if (input.currentRaw === null)
    return Object.freeze({
      kind: "create" as const,
      documentPath,
      canonicalRaw: canonicalJsonV1(proposed),
      next: proposed,
    });
  if (typeof input.currentRaw !== "string")
    fail("v2_activity_stage_manifest_decision_invalid");
  const current = parseV2ActivityStageCommittedManifestV1(input.currentRaw);
  if (
    current.commitKey === proposed.commitKey &&
    canonicalJsonV1(manifestStable(current)) ===
      canonicalJsonV1(manifestStable(proposed))
  )
    return Object.freeze({
      kind: "exact_replay" as const,
      documentPath,
      committed: current,
    });
  return Object.freeze({
    kind: "conflict" as const,
    documentPath,
    reason: "committed_payload_conflict" as const,
  });
}
