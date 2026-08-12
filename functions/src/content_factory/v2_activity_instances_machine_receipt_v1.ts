import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import { V2_ACTIVITY_STAGE_COMMIT_NAMESPACE_FINGERPRINT_V1 } from "./v2_activity_stage_commit_contract_v1";
import { V2_ACTIVITY_INSTANCES_CHILD_TOTAL_MAX_BYTES } from "./v2_activity_instances_package_v2";
import {
  V2_ACTIVITY_INSTANCES_VALIDATOR_ID_V1,
  V2_ACTIVITY_INSTANCES_VALIDATOR_VERSION_V1,
} from "./v2_activity_instances_validator_v1";

export const V2_ACTIVITY_INSTANCES_MACHINE_RECEIPT_SCHEMA_V1 =
  "v2-activity-instances-machine-receipt.v1" as const;
export const V2_ACTIVITY_INSTANCES_MACHINE_MANIFEST_SCHEMA_V1 =
  "v2-activity-instances-machine-manifest.v1" as const;
export const V2_ACTIVITY_INSTANCES_MACHINE_RECEIPT_MAX_BYTES_V1 = 64 * 1024;
export const V2_ACTIVITY_INSTANCES_MACHINE_MANIFEST_MAX_BYTES_V1 = 32 * 1024;

export const V2_ACTIVITY_INSTANCES_VALIDATOR_PROFILE_BODY_V1 = Object.freeze({
  schemaVersion: "v2-activity-instances-validator-profile.v1" as const,
  validatorId: V2_ACTIVITY_INSTANCES_VALIDATOR_ID_V1,
  validatorVersion: V2_ACTIVITY_INSTANCES_VALIDATOR_VERSION_V1,
  sessionCount: 12 as const,
  objectCount: 48 as const,
  maximumChildBytes: V2_ACTIVITY_INSTANCES_CHILD_TOTAL_MAX_BYTES,
  rulesFingerprintBinding: "receipt_field" as const,
  authority: "none" as const,
});
export const V2_ACTIVITY_INSTANCES_VALIDATOR_PROFILE_FINGERPRINT_V1 =
  hashCanonicalBody(V2_ACTIVITY_INSTANCES_VALIDATOR_PROFILE_BODY_V1);

export const V2_ACTIVITY_INSTANCES_MACHINE_NAMESPACE_BODY_V1 = Object.freeze({
  schemaVersion: "v2-activity-instances-machine-namespace.v1" as const,
  parentActivityStageCommitNamespaceFingerprint:
    V2_ACTIVITY_STAGE_COMMIT_NAMESPACE_FINGERPRINT_V1,
  validatorId: V2_ACTIVITY_INSTANCES_VALIDATOR_ID_V1,
  validatorVersion: V2_ACTIVITY_INSTANCES_VALIDATOR_VERSION_V1,
  validatorProfileFingerprint:
    V2_ACTIVITY_INSTANCES_VALIDATOR_PROFILE_FINGERPRINT_V1,
  firestore: Object.freeze({
    committedManifestCollection: "content_v2_stage_repository_commits",
  }),
  storage: Object.freeze({
    receiptPrefix:
      "learning-v2/repository-auth/private/activity-instances-machine-receipts/v1",
  }),
  policy: Object.freeze({
    immutableCreate: "ifGenerationMatch:0" as const,
    firestoreCommit: "direct_key_create_or_exact_replay" as const,
    authority: "none" as const,
  }),
});
export const V2_ACTIVITY_INSTANCES_MACHINE_NAMESPACE_FINGERPRINT_V1 =
  hashCanonicalBody(V2_ACTIVITY_INSTANCES_MACHINE_NAMESPACE_BODY_V1);

export interface V2ActivityInstancesMachineReceiptDataV1 {
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
  readonly repositoryOriginReceiptFingerprint: string;
  readonly repositoryObservationFingerprint: string;
  readonly d2OuterReceiptFingerprint: string;
  readonly d2CommittedManifestFingerprint: string;
  readonly d2CommittedOperationFingerprint: string;
  readonly permitAggregateFingerprint: string | null;
  readonly readbackAggregateFingerprint: string | null;
  readonly storageReadbackFingerprint: string | null;
  readonly sessionCount: 12 | null;
  readonly childObjectCount: 48 | null;
  readonly totalReadbackBytes: number | null;
  readonly pureValidationResultFingerprint: string;
  readonly validatorRulesFingerprint: string;
  readonly registryFingerprint: string;
  readonly checkedRuleCodes: readonly string[];
  readonly issueCodes: readonly string[];
  readonly outcome: "blocked" | "eligible_for_human_review_only";
}

export interface V2ActivityInstancesMachineReceiptV1 extends V2ActivityInstancesMachineReceiptDataV1 {
  readonly schemaVersion: typeof V2_ACTIVITY_INSTANCES_MACHINE_RECEIPT_SCHEMA_V1;
  readonly namespaceFingerprint: string;
  readonly parentActivityStageCommitNamespaceFingerprint: string;
  readonly validatorId: typeof V2_ACTIVITY_INSTANCES_VALIDATOR_ID_V1;
  readonly validatorVersion: typeof V2_ACTIVITY_INSTANCES_VALIDATOR_VERSION_V1;
  readonly validatorProfileFingerprint: string;
  readonly candidateOriginAuthority: "none";
  readonly repositoryOriginAuthority: "none";
  readonly dependencyResolutionAuthority: "none";
  readonly storageAuthority: "none";
  readonly authenticationAuthority: "none";
  readonly principalIdentityAuthority: "none";
  readonly machineValidationAuthority: "none";
  readonly contentValidationAuthority: "none";
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
  readonly publicationDecisionAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly receiptFingerprint: string;
}

export interface V2ActivityInstancesMachineReceiptObjectPinV1 {
  readonly objectPath: string;
  readonly contentHash: string;
  readonly objectGeneration: string;
  readonly byteSize: number;
  readonly contentType: "application/json; charset=utf-8";
}

export interface V2ActivityInstancesMachineManifestV1 {
  readonly schemaVersion: typeof V2_ACTIVITY_INSTANCES_MACHINE_MANIFEST_SCHEMA_V1;
  readonly state: "committed_machine_receipt";
  readonly namespaceFingerprint: string;
  readonly validatorProfileFingerprint: string;
  readonly commitKey: string;
  readonly planFingerprint: string;
  readonly stageId: string;
  readonly candidateFingerprint: string;
  readonly validatorRulesFingerprint: string;
  readonly registryFingerprint: string;
  readonly receiptFingerprint: string;
  readonly receiptRawHash: string;
  readonly receiptObject: V2ActivityInstancesMachineReceiptObjectPinV1;
  readonly commitFingerprint: string;
  readonly operationRevision: 1;
  readonly createdAtEpochMs: number;
  readonly operationFingerprint: string;
}

export type V2ActivityInstancesMachineManifestDecisionV1 =
  | Readonly<{
      kind: "create";
      documentPath: string;
      canonicalRaw: string;
      next: V2ActivityInstancesMachineManifestV1;
    }>
  | Readonly<{
      kind: "exact_replay";
      documentPath: string;
      committed: V2ActivityInstancesMachineManifestV1;
    }>
  | Readonly<{
      kind: "conflict";
      documentPath: string;
      reason: "committed_payload_conflict";
    }>;

const HASH_RE = /^[a-f0-9]{64}$/;
const STAGE_RE = /^[A-Za-z0-9._:-]{1,1000}$/;
const TOKEN_RE = /^[a-z0-9][a-z0-9._:-]{0,159}$/;
const GENERATION_RE = /^[1-9][0-9]{0,30}$/;
const CODE_RE = /^[a-z0-9][a-z0-9._:-]{0,159}$/;
const JSON_CONTENT_TYPE = "application/json; charset=utf-8" as const;
const DATA_KEYS = [
  "planFingerprint",
  "courseContractFingerprint",
  "workspaceFingerprint",
  "stageId",
  "episodeId",
  "candidateFingerprint",
  "bodySchemaVersion",
  "bodyFingerprint",
  "packageFingerprint",
  "capabilitySnapshotFingerprint",
  "repositoryOriginReceiptFingerprint",
  "repositoryObservationFingerprint",
  "d2OuterReceiptFingerprint",
  "d2CommittedManifestFingerprint",
  "d2CommittedOperationFingerprint",
  "permitAggregateFingerprint",
  "readbackAggregateFingerprint",
  "storageReadbackFingerprint",
  "sessionCount",
  "childObjectCount",
  "totalReadbackBytes",
  "pureValidationResultFingerprint",
  "validatorRulesFingerprint",
  "registryFingerprint",
  "checkedRuleCodes",
  "issueCodes",
  "outcome",
] as const;
const AUTHORITY_FIELDS = Object.freeze({
  candidateOriginAuthority: "none" as const,
  repositoryOriginAuthority: "none" as const,
  dependencyResolutionAuthority: "none" as const,
  storageAuthority: "none" as const,
  authenticationAuthority: "none" as const,
  principalIdentityAuthority: "none" as const,
  machineValidationAuthority: "none" as const,
  contentValidationAuthority: "none" as const,
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
  publicationDecisionAuthority: "none" as const,
  publicationAuthority: "none" as const,
  runtimeConsumer: false as const,
  releaseEligible: false as const,
  releaseAuthority: false as const,
});

type JsonRecord = Record<string, unknown>;

function fail(code: string): never {
  throw new Error(code);
}

function record(value: unknown): value is JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactKeys(value: JsonRecord, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...keys].sort();
  return (
    actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index])
  );
}

function hash(value: unknown, code: string): string {
  if (typeof value !== "string" || !HASH_RE.test(value)) fail(code);
  return value;
}

function token(value: unknown, code: string): string {
  if (typeof value !== "string" || !TOKEN_RE.test(value)) fail(code);
  return value;
}

function stage(value: unknown, code: string): string {
  if (typeof value !== "string" || !STAGE_RE.test(value)) fail(code);
  return value;
}

function nullableHash(value: unknown, code: string): string | null {
  return value === null ? null : hash(value, code);
}

function sortedCodes(
  value: unknown,
  allowEmpty: boolean,
  code: string,
): readonly string[] {
  if (
    !Array.isArray(value) ||
    value.length > 64 ||
    (!allowEmpty && value.length === 0) ||
    value.some((entry) => typeof entry !== "string" || !CODE_RE.test(entry))
  )
    fail(code);
  const result = value as string[];
  if (
    new Set(result).size !== result.length ||
    result.some((entry, index) => index > 0 && result[index - 1] >= entry)
  )
    fail(code);
  return Object.freeze([...result]);
}

function parseCanonical(
  raw: unknown,
  maximumBytes: number,
  code: string,
): JsonRecord {
  if (typeof raw !== "string" || raw.length > maximumBytes) fail(code);
  if (utf8ByteLengthV1(raw) > maximumBytes) fail(code);
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    fail(code);
  }
  const work = [{ value, depth: 0 }];
  let nodes = 0;
  while (work.length > 0) {
    const current = work.pop()!;
    nodes += 1;
    if (nodes > 10_000 || current.depth > 24) fail(code);
    if (Array.isArray(current.value)) {
      current.value.forEach((child) =>
        work.push({ value: child, depth: current.depth + 1 }),
      );
    } else if (record(current.value)) {
      Object.values(current.value).forEach((child) =>
        work.push({ value: child, depth: current.depth + 1 }),
      );
    }
  }
  if (!record(value) || canonicalJsonV1(value) !== raw) fail(code);
  return value;
}

function data(
  value: unknown,
  code: string,
): V2ActivityInstancesMachineReceiptDataV1 {
  if (!record(value) || !exactKeys(value, DATA_KEYS)) fail(code);
  const outcome = value.outcome;
  if (outcome !== "blocked" && outcome !== "eligible_for_human_review_only")
    fail(code);
  const checkedRuleCodes = sortedCodes(value.checkedRuleCodes, false, code);
  const issueCodes = sortedCodes(value.issueCodes, true, code);
  const permitAggregateFingerprint = nullableHash(
    value.permitAggregateFingerprint,
    code,
  );
  const readbackAggregateFingerprint = nullableHash(
    value.readbackAggregateFingerprint,
    code,
  );
  const storageReadbackFingerprint = nullableHash(
    value.storageReadbackFingerprint,
    code,
  );
  const sessionCount = value.sessionCount === null ? null : value.sessionCount;
  const childObjectCount =
    value.childObjectCount === null ? null : value.childObjectCount;
  const totalReadbackBytes =
    value.totalReadbackBytes === null ? null : value.totalReadbackBytes;
  if (
    (sessionCount !== null && sessionCount !== 12) ||
    (childObjectCount !== null && childObjectCount !== 48) ||
    (totalReadbackBytes !== null &&
      (!Number.isSafeInteger(totalReadbackBytes) ||
        Number(totalReadbackBytes) < 48 ||
        Number(totalReadbackBytes) >
          V2_ACTIVITY_INSTANCES_CHILD_TOTAL_MAX_BYTES)) ||
    (outcome === "blocked" && issueCodes.length === 0) ||
    (outcome === "eligible_for_human_review_only" &&
      (issueCodes.length !== 0 ||
        permitAggregateFingerprint === null ||
        readbackAggregateFingerprint === null ||
        storageReadbackFingerprint === null ||
        value.packageFingerprint === null ||
        value.capabilitySnapshotFingerprint === null ||
        sessionCount !== 12 ||
        childObjectCount !== 48 ||
        totalReadbackBytes === null))
  )
    fail(code);
  return Object.freeze({
    planFingerprint: hash(value.planFingerprint, code),
    courseContractFingerprint: hash(value.courseContractFingerprint, code),
    workspaceFingerprint: hash(value.workspaceFingerprint, code),
    stageId: stage(value.stageId, code),
    episodeId: stage(value.episodeId, code),
    candidateFingerprint: hash(value.candidateFingerprint, code),
    bodySchemaVersion: token(value.bodySchemaVersion, code),
    bodyFingerprint: hash(value.bodyFingerprint, code),
    packageFingerprint: nullableHash(value.packageFingerprint, code),
    capabilitySnapshotFingerprint: nullableHash(
      value.capabilitySnapshotFingerprint,
      code,
    ),
    repositoryOriginReceiptFingerprint: hash(
      value.repositoryOriginReceiptFingerprint,
      code,
    ),
    repositoryObservationFingerprint: hash(
      value.repositoryObservationFingerprint,
      code,
    ),
    d2OuterReceiptFingerprint: hash(value.d2OuterReceiptFingerprint, code),
    d2CommittedManifestFingerprint: hash(
      value.d2CommittedManifestFingerprint,
      code,
    ),
    d2CommittedOperationFingerprint: hash(
      value.d2CommittedOperationFingerprint,
      code,
    ),
    permitAggregateFingerprint,
    readbackAggregateFingerprint,
    storageReadbackFingerprint,
    sessionCount: sessionCount as 12 | null,
    childObjectCount: childObjectCount as 48 | null,
    totalReadbackBytes: totalReadbackBytes as number | null,
    pureValidationResultFingerprint: hash(
      value.pureValidationResultFingerprint,
      code,
    ),
    validatorRulesFingerprint: hash(value.validatorRulesFingerprint, code),
    registryFingerprint: hash(value.registryFingerprint, code),
    checkedRuleCodes,
    issueCodes,
    outcome,
  });
}

function receiptBody(value: V2ActivityInstancesMachineReceiptDataV1) {
  return Object.freeze({
    schemaVersion: V2_ACTIVITY_INSTANCES_MACHINE_RECEIPT_SCHEMA_V1,
    namespaceFingerprint:
      V2_ACTIVITY_INSTANCES_MACHINE_NAMESPACE_FINGERPRINT_V1,
    parentActivityStageCommitNamespaceFingerprint:
      V2_ACTIVITY_STAGE_COMMIT_NAMESPACE_FINGERPRINT_V1,
    validatorId: V2_ACTIVITY_INSTANCES_VALIDATOR_ID_V1,
    validatorVersion: V2_ACTIVITY_INSTANCES_VALIDATOR_VERSION_V1,
    validatorProfileFingerprint:
      V2_ACTIVITY_INSTANCES_VALIDATOR_PROFILE_FINGERPRINT_V1,
    ...value,
    ...AUTHORITY_FIELDS,
  });
}

export function materializeV2ActivityInstancesMachineReceiptV1(
  input: V2ActivityInstancesMachineReceiptDataV1,
): V2ActivityInstancesMachineReceiptV1 {
  const normalized = data(
    input,
    "v2_activity_instances_machine_receipt_invalid",
  );
  const body = receiptBody(normalized);
  const receipt = Object.freeze({
    ...body,
    receiptFingerprint: hashCanonicalBody(body),
  });
  if (
    utf8ByteLengthV1(canonicalJsonV1(receipt)) >
    V2_ACTIVITY_INSTANCES_MACHINE_RECEIPT_MAX_BYTES_V1
  )
    fail("v2_activity_instances_machine_receipt_oversize");
  return receipt;
}

export function parseV2ActivityInstancesMachineReceiptV1(
  raw: string,
): V2ActivityInstancesMachineReceiptV1 {
  const code = "v2_activity_instances_machine_receipt_invalid";
  const value = parseCanonical(
    raw,
    V2_ACTIVITY_INSTANCES_MACHINE_RECEIPT_MAX_BYTES_V1,
    code,
  );
  const normalizedData = data(
    Object.fromEntries(DATA_KEYS.map((key) => [key, value[key]])),
    code,
  );
  const body = receiptBody(normalizedData);
  const expected = Object.freeze({
    ...body,
    receiptFingerprint: hashCanonicalBody(body),
  });
  if (canonicalJsonV1(expected) !== raw) fail(code);
  return expected;
}

export function v2ActivityInstancesMachineCommitKeyV1(input: {
  readonly planFingerprint: string;
  readonly stageId: string;
  readonly candidateFingerprint: string;
  readonly validatorRulesFingerprint: string;
  readonly registryFingerprint: string;
}): string {
  if (
    !record(input) ||
    !exactKeys(input, [
      "planFingerprint",
      "stageId",
      "candidateFingerprint",
      "validatorRulesFingerprint",
      "registryFingerprint",
    ])
  )
    fail("v2_activity_instances_machine_identity_invalid");
  return hashCanonicalBody({
    schemaVersion: "v2-activity-instances-machine-commit-key.v1",
    planFingerprint: hash(
      input.planFingerprint,
      "v2_activity_instances_machine_identity_invalid",
    ),
    stageId: stage(
      input.stageId,
      "v2_activity_instances_machine_identity_invalid",
    ),
    candidateFingerprint: hash(
      input.candidateFingerprint,
      "v2_activity_instances_machine_identity_invalid",
    ),
    validatorRulesFingerprint: hash(
      input.validatorRulesFingerprint,
      "v2_activity_instances_machine_identity_invalid",
    ),
    registryFingerprint: hash(
      input.registryFingerprint,
      "v2_activity_instances_machine_identity_invalid",
    ),
    validatorProfileFingerprint:
      V2_ACTIVITY_INSTANCES_VALIDATOR_PROFILE_FINGERPRINT_V1,
  });
}

export function v2ActivityInstancesMachineReceiptObjectPathV1(input: {
  readonly planFingerprint: string;
  readonly stageId: string;
  readonly candidateFingerprint: string;
  readonly receiptFingerprint: string;
  readonly receiptRawHash: string;
}): string {
  if (!record(input)) fail("v2_activity_instances_machine_path_invalid");
  const key = hashCanonicalBody({
    schemaVersion: "v2-activity-instances-machine-receipt-coordinate.v1",
    planFingerprint: hash(
      input.planFingerprint,
      "v2_activity_instances_machine_path_invalid",
    ),
    stageId: stage(input.stageId, "v2_activity_instances_machine_path_invalid"),
    candidateFingerprint: hash(
      input.candidateFingerprint,
      "v2_activity_instances_machine_path_invalid",
    ),
    receiptFingerprint: hash(
      input.receiptFingerprint,
      "v2_activity_instances_machine_path_invalid",
    ),
  });
  return `${V2_ACTIVITY_INSTANCES_MACHINE_NAMESPACE_BODY_V1.storage.receiptPrefix}/${hash(input.planFingerprint, "v2_activity_instances_machine_path_invalid")}/${key}/${hash(input.candidateFingerprint, "v2_activity_instances_machine_path_invalid")}/${hash(input.receiptFingerprint, "v2_activity_instances_machine_path_invalid")}/${hash(input.receiptRawHash, "v2_activity_instances_machine_path_invalid")}.json`;
}

export function v2ActivityInstancesMachineManifestDocumentPathV1(input: {
  readonly planFingerprint: string;
  readonly stageId: string;
  readonly candidateFingerprint: string;
  readonly validatorRulesFingerprint: string;
  readonly registryFingerprint: string;
}): string {
  return `${V2_ACTIVITY_INSTANCES_MACHINE_NAMESPACE_BODY_V1.firestore.committedManifestCollection}/${v2ActivityInstancesMachineCommitKeyV1(input)}`;
}

function manifestStable(
  value: Pick<
    V2ActivityInstancesMachineManifestV1,
    | "namespaceFingerprint"
    | "validatorProfileFingerprint"
    | "commitKey"
    | "planFingerprint"
    | "stageId"
    | "candidateFingerprint"
    | "validatorRulesFingerprint"
    | "registryFingerprint"
    | "receiptFingerprint"
    | "receiptRawHash"
    | "receiptObject"
  >,
) {
  return Object.freeze({
    namespaceFingerprint: value.namespaceFingerprint,
    validatorProfileFingerprint: value.validatorProfileFingerprint,
    commitKey: value.commitKey,
    planFingerprint: value.planFingerprint,
    stageId: value.stageId,
    candidateFingerprint: value.candidateFingerprint,
    validatorRulesFingerprint: value.validatorRulesFingerprint,
    registryFingerprint: value.registryFingerprint,
    receiptFingerprint: value.receiptFingerprint,
    receiptRawHash: value.receiptRawHash,
    receiptObject: value.receiptObject,
  });
}

export function materializeV2ActivityInstancesMachineManifestV1(input: {
  readonly receipt: V2ActivityInstancesMachineReceiptV1;
  readonly receiptRawHash: string;
  readonly objectGeneration: string;
  readonly byteSize: number;
  readonly createdAtEpochMs: number;
}): V2ActivityInstancesMachineManifestV1 {
  if (!record(input)) fail("v2_activity_instances_machine_manifest_invalid");
  const receipt = parseV2ActivityInstancesMachineReceiptV1(
    canonicalJsonV1(input.receipt),
  );
  const receiptRaw = canonicalJsonV1(receipt);
  const receiptRawHash = hash(
    input.receiptRawHash,
    "v2_activity_instances_machine_manifest_invalid",
  );
  if (
    receiptRawHash !== sha256Utf8(receiptRaw) ||
    typeof input.objectGeneration !== "string" ||
    !GENERATION_RE.test(input.objectGeneration) ||
    !Number.isSafeInteger(input.byteSize) ||
    Number(input.byteSize) < 1 ||
    Number(input.byteSize) !== utf8ByteLengthV1(receiptRaw) ||
    !Number.isSafeInteger(input.createdAtEpochMs) ||
    Number(input.createdAtEpochMs) < 0
  )
    fail("v2_activity_instances_machine_manifest_invalid");
  const identity = {
    planFingerprint: receipt.planFingerprint,
    stageId: receipt.stageId,
    candidateFingerprint: receipt.candidateFingerprint,
    validatorRulesFingerprint: receipt.validatorRulesFingerprint,
    registryFingerprint: receipt.registryFingerprint,
  };
  const receiptObject = Object.freeze({
    objectPath: v2ActivityInstancesMachineReceiptObjectPathV1({
      ...identity,
      receiptFingerprint: receipt.receiptFingerprint,
      receiptRawHash,
    }),
    contentHash: receiptRawHash,
    objectGeneration: input.objectGeneration,
    byteSize: Number(input.byteSize),
    contentType: JSON_CONTENT_TYPE,
  });
  const stable = manifestStable({
    namespaceFingerprint:
      V2_ACTIVITY_INSTANCES_MACHINE_NAMESPACE_FINGERPRINT_V1,
    validatorProfileFingerprint:
      V2_ACTIVITY_INSTANCES_VALIDATOR_PROFILE_FINGERPRINT_V1,
    commitKey: v2ActivityInstancesMachineCommitKeyV1(identity),
    ...identity,
    receiptFingerprint: receipt.receiptFingerprint,
    receiptRawHash,
    receiptObject,
  });
  const base = Object.freeze({
    schemaVersion: V2_ACTIVITY_INSTANCES_MACHINE_MANIFEST_SCHEMA_V1,
    state: "committed_machine_receipt" as const,
    ...stable,
    commitFingerprint: hashCanonicalBody(stable),
    operationRevision: 1 as const,
    createdAtEpochMs: Number(input.createdAtEpochMs),
  });
  const result = Object.freeze({
    ...base,
    operationFingerprint: hashCanonicalBody(base),
  });
  if (
    utf8ByteLengthV1(canonicalJsonV1(result)) >
    V2_ACTIVITY_INSTANCES_MACHINE_MANIFEST_MAX_BYTES_V1
  )
    fail("v2_activity_instances_machine_manifest_oversize");
  return result;
}

export function parseV2ActivityInstancesMachineManifestV1(
  raw: string,
): V2ActivityInstancesMachineManifestV1 {
  const code = "v2_activity_instances_machine_manifest_invalid";
  const value = parseCanonical(
    raw,
    V2_ACTIVITY_INSTANCES_MACHINE_MANIFEST_MAX_BYTES_V1,
    code,
  );
  const identity = {
    planFingerprint: hash(value.planFingerprint, code),
    stageId: stage(value.stageId, code),
    candidateFingerprint: hash(value.candidateFingerprint, code),
    validatorRulesFingerprint: hash(value.validatorRulesFingerprint, code),
    registryFingerprint: hash(value.registryFingerprint, code),
  };
  const receiptFingerprint = hash(value.receiptFingerprint, code);
  const receiptRawHash = hash(value.receiptRawHash, code);
  const expectedPath = v2ActivityInstancesMachineReceiptObjectPathV1({
    ...identity,
    receiptFingerprint,
    receiptRawHash,
  });
  if (
    !record(value.receiptObject) ||
    !exactKeys(value.receiptObject, [
      "objectPath",
      "contentHash",
      "objectGeneration",
      "byteSize",
      "contentType",
    ]) ||
    value.receiptObject.objectPath !== expectedPath ||
    value.receiptObject.contentHash !== receiptRawHash ||
    typeof value.receiptObject.objectGeneration !== "string" ||
    !GENERATION_RE.test(value.receiptObject.objectGeneration) ||
    !Number.isSafeInteger(value.receiptObject.byteSize) ||
    Number(value.receiptObject.byteSize) < 1 ||
    Number(value.receiptObject.byteSize) >
      V2_ACTIVITY_INSTANCES_MACHINE_RECEIPT_MAX_BYTES_V1 ||
    value.receiptObject.contentType !== JSON_CONTENT_TYPE
  )
    fail(code);
  const receiptObject = Object.freeze(
    value.receiptObject as unknown as V2ActivityInstancesMachineReceiptObjectPinV1,
  );
  const stable = manifestStable({
    namespaceFingerprint: String(value.namespaceFingerprint),
    validatorProfileFingerprint: String(value.validatorProfileFingerprint),
    commitKey: String(value.commitKey),
    ...identity,
    receiptFingerprint,
    receiptRawHash,
    receiptObject,
  });
  if (
    value.schemaVersion !== V2_ACTIVITY_INSTANCES_MACHINE_MANIFEST_SCHEMA_V1 ||
    value.state !== "committed_machine_receipt" ||
    stable.namespaceFingerprint !==
      V2_ACTIVITY_INSTANCES_MACHINE_NAMESPACE_FINGERPRINT_V1 ||
    stable.validatorProfileFingerprint !==
      V2_ACTIVITY_INSTANCES_VALIDATOR_PROFILE_FINGERPRINT_V1 ||
    stable.commitKey !== v2ActivityInstancesMachineCommitKeyV1(identity) ||
    value.commitFingerprint !== hashCanonicalBody(stable) ||
    value.operationRevision !== 1 ||
    !Number.isSafeInteger(value.createdAtEpochMs) ||
    Number(value.createdAtEpochMs) < 0
  )
    fail(code);
  const base = Object.freeze({
    schemaVersion: V2_ACTIVITY_INSTANCES_MACHINE_MANIFEST_SCHEMA_V1,
    state: "committed_machine_receipt" as const,
    ...stable,
    commitFingerprint: value.commitFingerprint as string,
    operationRevision: 1 as const,
    createdAtEpochMs: Number(value.createdAtEpochMs),
  });
  const result = Object.freeze({
    ...base,
    operationFingerprint: hash(value.operationFingerprint, code),
  });
  if (
    result.operationFingerprint !== hashCanonicalBody(base) ||
    canonicalJsonV1(result) !== raw
  )
    fail(code);
  return result;
}

export function decideV2ActivityInstancesMachineManifestV1(input: {
  readonly currentRaw: string | null;
  readonly proposed: V2ActivityInstancesMachineManifestV1;
}): V2ActivityInstancesMachineManifestDecisionV1 {
  if (!record(input) || !exactKeys(input, ["currentRaw", "proposed"]))
    fail("v2_activity_instances_machine_manifest_decision_invalid");
  const proposed = parseV2ActivityInstancesMachineManifestV1(
    canonicalJsonV1(input.proposed),
  );
  const documentPath = v2ActivityInstancesMachineManifestDocumentPathV1({
    planFingerprint: proposed.planFingerprint,
    stageId: proposed.stageId,
    candidateFingerprint: proposed.candidateFingerprint,
    validatorRulesFingerprint: proposed.validatorRulesFingerprint,
    registryFingerprint: proposed.registryFingerprint,
  });
  if (input.currentRaw === null)
    return Object.freeze({
      kind: "create" as const,
      documentPath,
      canonicalRaw: canonicalJsonV1(proposed),
      next: proposed,
    });
  if (typeof input.currentRaw !== "string")
    fail("v2_activity_instances_machine_manifest_decision_invalid");
  const current = parseV2ActivityInstancesMachineManifestV1(input.currentRaw);
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
