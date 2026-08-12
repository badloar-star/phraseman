import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  V2_STAGE_VALIDATOR_REGISTRY_V2,
  isV2CanonicalStageCandidateV2,
  isV2GenerationStageWorkspaceV2,
  type V2CanonicalStageCandidateV2,
  type V2GenerationStageWorkspaceV2,
} from "./v2_generation_workspace_contract_v2";
import {
  V2_VOICE_TARGETS_ARTIFACT_SCHEMA_V2,
  isV2VoiceTargetsPackageV2,
  type V2VoiceTargetsPackageV2,
} from "./v2_voice_targets_package_v2";
import {
  V2_VOICE_TARGETS_VALIDATOR_ID_V1,
  V2_VOICE_TARGETS_VALIDATOR_RULES_FINGERPRINT_V1,
  V2_VOICE_TARGETS_VALIDATOR_VERSION_V1,
  isV2VoiceTargetsValidationResultV1,
  type V2VoiceTargetsValidationResultV1,
} from "./v2_voice_targets_validator_v1";

export const V2_VOICE_TARGETS_MACHINE_RECEIPT_SCHEMA_V1 =
  "v2-voice-targets-machine-receipt.v1" as const;
export const V2_VOICE_TARGETS_MACHINE_RECEIPT_MAX_BYTES_V1 = 64 * 1024;
export const V2_VOICE_TARGETS_MACHINE_MANIFEST_SCHEMA_V1 =
  "v2-voice-targets-machine-manifest.v1" as const;
export const V2_VOICE_TARGETS_MACHINE_MANIFEST_MAX_BYTES_V1 = 32 * 1024;
export const V2_VOICE_TARGETS_MACHINE_MANIFEST_COLLECTION_V1 =
  "content_v2_stage_repository_commits" as const;
export const V2_VOICE_TARGETS_MACHINE_RECEIPT_PREFIX_V1 =
  "learning-v2/repository-auth/private/voice-targets-machine-receipts/v1" as const;

export const V2_VOICE_TARGETS_MACHINE_RECEIPT_PROFILE_V1 = Object.freeze({
  schemaVersion: "v2-voice-targets-machine-receipt-profile.v1" as const,
  validatorId: V2_VOICE_TARGETS_VALIDATOR_ID_V1,
  validatorVersion: V2_VOICE_TARGETS_VALIDATOR_VERSION_V1,
  validatorRulesFingerprint: V2_VOICE_TARGETS_VALIDATOR_RULES_FINGERPRINT_V1,
  requiredBodySchemaVersion: V2_VOICE_TARGETS_ARTIFACT_SCHEMA_V2,
  requiredSessionCount: 12 as const,
  requiredVariantsPerTarget: 4 as const,
  persistenceAuthority: "none" as const,
});
export const V2_VOICE_TARGETS_MACHINE_RECEIPT_PROFILE_FINGERPRINT_V1 =
  hashCanonicalBody(V2_VOICE_TARGETS_MACHINE_RECEIPT_PROFILE_V1);

export interface V2VoiceTargetsMachineReceiptV1 {
  readonly schemaVersion: typeof V2_VOICE_TARGETS_MACHINE_RECEIPT_SCHEMA_V1;
  readonly receiptProfileFingerprint: string;
  readonly planFingerprint: string;
  readonly workspaceFingerprint: string;
  readonly stageId: string;
  readonly candidateFingerprint: string;
  readonly bodySchemaVersion: typeof V2_VOICE_TARGETS_ARTIFACT_SCHEMA_V2;
  readonly bodyFingerprint: string;
  readonly packageFingerprint: string;
  readonly sessionShardAggregateFingerprint: string;
  readonly pureValidationResultFingerprint: string;
  readonly validatorRulesFingerprint: string;
  readonly registryFingerprint: string;
  readonly sessionCount: 12;
  readonly targetCount: number;
  readonly wordTargetCount: number;
  readonly variantCount: number;
  readonly generationTargetCount: number;
  readonly checkedRuleCodes: readonly string[];
  readonly issueCodes: readonly string[];
  readonly outcome: "blocked";
  readonly candidateClassification: "structural_voice_targets_only";
  readonly candidateOriginAuthority: "none";
  readonly repositoryOriginAuthority: "none";
  readonly profileLifecycleAuthority: "none";
  readonly sourceAuthority: "structural_catalog_only";
  readonly storageAuthority: "none";
  readonly providerExecutionAuthority: "none";
  readonly audioByteAuthority: "none";
  readonly machineValidationAuthority: "none";
  readonly contentValidationAuthority: "none";
  readonly humanReviewAuthority: "none";
  readonly specialistEvidenceAuthority: "none";
  readonly listeningEvidenceAuthority: "none";
  readonly deviceEvidenceAuthority: "none";
  readonly runtimeKernelAuthority: "none";
  readonly executionAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly receiptFingerprint: string;
}

export interface V2VoiceTargetsMachineManifestV1 {
  readonly schemaVersion: typeof V2_VOICE_TARGETS_MACHINE_MANIFEST_SCHEMA_V1;
  readonly state: "committed_blocked_machine_receipt";
  readonly commitKey: string;
  readonly receiptProfileFingerprint: string;
  readonly planFingerprint: string;
  readonly stageId: string;
  readonly candidateFingerprint: string;
  readonly validatorRulesFingerprint: string;
  readonly registryFingerprint: string;
  readonly receiptFingerprint: string;
  readonly receiptRawHash: string;
  readonly receiptObject: Readonly<{
    objectPath: string;
    contentHash: string;
    objectGeneration: string;
    byteSize: number;
    contentType: "application/json; charset=utf-8";
  }>;
  readonly commitFingerprint: string;
  readonly createdAtEpochMs: number;
  readonly operationFingerprint: string;
}

export type V2VoiceTargetsMachineManifestDecisionV1 =
  | Readonly<{
      kind: "create";
      documentPath: string;
      canonicalRaw: string;
      next: V2VoiceTargetsMachineManifestV1;
    }>
  | Readonly<{
      kind: "exact_replay";
      documentPath: string;
      committed: V2VoiceTargetsMachineManifestV1;
    }>
  | Readonly<{
      kind: "conflict";
      documentPath: string;
      reason: "committed_payload_conflict";
    }>;

const handles = new WeakSet<object>();
const HASH_RE = /^[a-f0-9]{64}$/;
const STAGE_RE = /^[A-Za-z0-9._:-]{1,1000}$/;
const REQUIRED_ISSUES = Object.freeze([
  "v2_voice_targets_audio_bytes_not_established",
  "v2_voice_targets_profile_lifecycle_not_established",
  "v2_voice_targets_repository_origin_not_established",
  "v2_voice_targets_validator_not_installed",
]);
const RECEIPT_KEYS = Object.freeze([
  "audioByteAuthority",
  "bodyFingerprint",
  "bodySchemaVersion",
  "candidateClassification",
  "candidateFingerprint",
  "candidateOriginAuthority",
  "checkedRuleCodes",
  "contentValidationAuthority",
  "deviceEvidenceAuthority",
  "executionAuthority",
  "generationTargetCount",
  "humanReviewAuthority",
  "issueCodes",
  "listeningEvidenceAuthority",
  "machineValidationAuthority",
  "outcome",
  "packageFingerprint",
  "planFingerprint",
  "profileLifecycleAuthority",
  "providerExecutionAuthority",
  "publicationAuthority",
  "pureValidationResultFingerprint",
  "receiptFingerprint",
  "receiptProfileFingerprint",
  "registryFingerprint",
  "releaseAuthority",
  "releaseEligible",
  "repositoryOriginAuthority",
  "runtimeConsumer",
  "runtimeKernelAuthority",
  "schemaVersion",
  "sessionCount",
  "sessionShardAggregateFingerprint",
  "sourceAuthority",
  "specialistEvidenceAuthority",
  "stageId",
  "storageAuthority",
  "targetCount",
  "validatorRulesFingerprint",
  "variantCount",
  "wordTargetCount",
  "workspaceFingerprint",
]);

function exactKeys(value: object, expected: readonly string[]): boolean {
  const keys = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return (
    keys.length === wanted.length &&
    keys.every((key, index) => key === wanted[index])
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactCodes(
  value: unknown,
  allowEmpty: boolean,
  code: string,
): readonly string[] {
  if (
    !Array.isArray(value) ||
    value.length > 64 ||
    (!allowEmpty && value.length === 0) ||
    value.some(
      (entry) =>
        typeof entry !== "string" ||
        !/^[a-z0-9][a-z0-9._:-]{0,159}$/.test(entry),
    ) ||
    new Set(value).size !== value.length ||
    value.some((entry, index) => index > 0 && value[index - 1] >= entry)
  )
    fail(code);
  return value;
}

function fail(code: string): never {
  throw new Error(code);
}

function exactHash(value: unknown, code: string): string {
  if (typeof value !== "string" || !HASH_RE.test(value)) fail(code);
  return value;
}

function body(
  input: Readonly<{
    workspace: V2GenerationStageWorkspaceV2;
    candidate: V2CanonicalStageCandidateV2;
    packageValue: V2VoiceTargetsPackageV2;
    validation: V2VoiceTargetsValidationResultV1;
  }>,
): Omit<V2VoiceTargetsMachineReceiptV1, "receiptFingerprint"> {
  if (!isV2GenerationStageWorkspaceV2(input.workspace))
    fail("v2_voice_targets_machine_workspace_untrusted");
  if (!isV2CanonicalStageCandidateV2(input.candidate))
    fail("v2_voice_targets_machine_candidate_untrusted");
  if (!isV2VoiceTargetsPackageV2(input.packageValue))
    fail("v2_voice_targets_machine_package_untrusted");
  if (!isV2VoiceTargetsValidationResultV1(input.validation))
    fail("v2_voice_targets_machine_validation_untrusted");
  const root = input.packageValue.root;
  if (
    input.workspace.stage.kind !== "v2_voice_targets" ||
    input.candidate.stageKind !== "v2_voice_targets" ||
    input.candidate.stageId !== input.workspace.stage.stageId ||
    input.candidate.workspaceFingerprint !==
      input.workspace.workspaceFingerprint ||
    input.candidate.candidateFingerprint !==
      input.validation.candidateFingerprint ||
    input.validation.stageId !== input.workspace.stage.stageId ||
    input.validation.workspaceFingerprint !==
      input.workspace.workspaceFingerprint ||
    input.validation.packageFingerprint !== root.artifactFingerprint ||
    input.validation.validatorRulesFingerprint !==
      V2_VOICE_TARGETS_VALIDATOR_RULES_FINGERPRINT_V1 ||
    input.validation.registryFingerprint !==
      hashCanonicalBody(V2_STAGE_VALIDATOR_REGISTRY_V2) ||
    input.packageValue.sessionShards.length !== 12 ||
    root.sessionRefs.length !== 12
  )
    fail("v2_voice_targets_machine_binding_invalid");
  const registryEntry = V2_STAGE_VALIDATOR_REGISTRY_V2.v2_voice_targets;
  if (registryEntry.state !== "not_installed")
    fail("v2_voice_targets_machine_registry_state_invalid");
  const issueCodes = Object.freeze(
    [
      ...new Set([...REQUIRED_ISSUES, ...input.validation.blockingIssueCodes]),
    ].sort(),
  );
  return Object.freeze({
    schemaVersion: V2_VOICE_TARGETS_MACHINE_RECEIPT_SCHEMA_V1,
    receiptProfileFingerprint:
      V2_VOICE_TARGETS_MACHINE_RECEIPT_PROFILE_FINGERPRINT_V1,
    planFingerprint: exactHash(
      input.workspace.planFingerprint,
      "v2_voice_targets_machine_binding_invalid",
    ),
    workspaceFingerprint: exactHash(
      input.workspace.workspaceFingerprint,
      "v2_voice_targets_machine_binding_invalid",
    ),
    stageId: input.workspace.stage.stageId,
    candidateFingerprint: exactHash(
      input.candidate.candidateFingerprint,
      "v2_voice_targets_machine_binding_invalid",
    ),
    bodySchemaVersion: V2_VOICE_TARGETS_ARTIFACT_SCHEMA_V2,
    bodyFingerprint: exactHash(
      input.candidate.bodyFingerprint,
      "v2_voice_targets_machine_binding_invalid",
    ),
    packageFingerprint: root.artifactFingerprint,
    sessionShardAggregateFingerprint: hashCanonicalBody(
      input.packageValue.sessionShards.map((shard) =>
        Object.freeze({
          sessionOrdinal: shard.sessionOrdinal,
          sessionFingerprint: shard.sessionFingerprint,
          canonicalRawHash: sha256Utf8(canonicalJsonV1(shard)),
          canonicalByteSize: utf8ByteLengthV1(canonicalJsonV1(shard)),
        }),
      ),
    ),
    pureValidationResultFingerprint: input.validation.resultFingerprint,
    validatorRulesFingerprint: V2_VOICE_TARGETS_VALIDATOR_RULES_FINGERPRINT_V1,
    registryFingerprint: input.validation.registryFingerprint,
    sessionCount: 12,
    targetCount: root.targetCount,
    wordTargetCount: root.wordTargetCount,
    variantCount: root.variantCount,
    generationTargetCount: root.generationTargetCount,
    checkedRuleCodes: input.validation.checkedRuleCodes,
    issueCodes,
    outcome: "blocked",
    candidateClassification: "structural_voice_targets_only",
    candidateOriginAuthority: "none",
    repositoryOriginAuthority: "none",
    profileLifecycleAuthority: "none",
    sourceAuthority: "structural_catalog_only",
    storageAuthority: "none",
    providerExecutionAuthority: "none",
    audioByteAuthority: "none",
    machineValidationAuthority: "none",
    contentValidationAuthority: "none",
    humanReviewAuthority: "none",
    specialistEvidenceAuthority: "none",
    listeningEvidenceAuthority: "none",
    deviceEvidenceAuthority: "none",
    runtimeKernelAuthority: "none",
    executionAuthority: "none",
    publicationAuthority: "none",
    runtimeConsumer: false,
    releaseEligible: false,
    releaseAuthority: false,
  });
}

export function materializeV2VoiceTargetsMachineReceiptV1(
  input: Readonly<{
    workspace: V2GenerationStageWorkspaceV2;
    candidate: V2CanonicalStageCandidateV2;
    packageValue: V2VoiceTargetsPackageV2;
    validation: V2VoiceTargetsValidationResultV1;
  }>,
): V2VoiceTargetsMachineReceiptV1 {
  const stable = body(input);
  const result = Object.freeze({
    ...stable,
    receiptFingerprint: hashCanonicalBody(stable),
  });
  if (
    utf8ByteLengthV1(canonicalJsonV1(result)) >
    V2_VOICE_TARGETS_MACHINE_RECEIPT_MAX_BYTES_V1
  )
    fail("v2_voice_targets_machine_receipt_too_large");
  handles.add(result);
  return result;
}

export function parseV2VoiceTargetsMachineReceiptV1(
  raw: string,
): V2VoiceTargetsMachineReceiptV1 {
  if (
    typeof raw !== "string" ||
    raw.length > V2_VOICE_TARGETS_MACHINE_RECEIPT_MAX_BYTES_V1 ||
    utf8ByteLengthV1(raw) > V2_VOICE_TARGETS_MACHINE_RECEIPT_MAX_BYTES_V1
  )
    fail("v2_voice_targets_machine_receipt_invalid");
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    fail("v2_voice_targets_machine_receipt_invalid");
  }
  if (
    !isRecord(value) ||
    !exactKeys(value, RECEIPT_KEYS) ||
    canonicalJsonV1(value) !== raw
  )
    fail("v2_voice_targets_machine_receipt_invalid");
  const receipt = value as unknown as V2VoiceTargetsMachineReceiptV1;
  const { receiptFingerprint, ...stable } = receipt;
  const checkedRuleCodes = exactCodes(
    receipt.checkedRuleCodes,
    false,
    "v2_voice_targets_machine_receipt_invalid",
  );
  const issueCodes = exactCodes(
    receipt.issueCodes,
    false,
    "v2_voice_targets_machine_receipt_invalid",
  );
  if (
    receipt.schemaVersion !== V2_VOICE_TARGETS_MACHINE_RECEIPT_SCHEMA_V1 ||
    receipt.receiptProfileFingerprint !==
      V2_VOICE_TARGETS_MACHINE_RECEIPT_PROFILE_FINGERPRINT_V1 ||
    receipt.bodySchemaVersion !== V2_VOICE_TARGETS_ARTIFACT_SCHEMA_V2 ||
    !HASH_RE.test(receipt.planFingerprint) ||
    !HASH_RE.test(receipt.workspaceFingerprint) ||
    !STAGE_RE.test(receipt.stageId) ||
    !HASH_RE.test(receipt.candidateFingerprint) ||
    !HASH_RE.test(receipt.bodyFingerprint) ||
    !HASH_RE.test(receipt.packageFingerprint) ||
    !HASH_RE.test(receipt.sessionShardAggregateFingerprint) ||
    !HASH_RE.test(receipt.pureValidationResultFingerprint) ||
    receipt.validatorRulesFingerprint !==
      V2_VOICE_TARGETS_VALIDATOR_RULES_FINGERPRINT_V1 ||
    !HASH_RE.test(receipt.registryFingerprint) ||
    receipt.sessionCount !== 12 ||
    !Number.isSafeInteger(receipt.targetCount) ||
    receipt.targetCount < 1 ||
    receipt.targetCount > 864 ||
    !Number.isSafeInteger(receipt.wordTargetCount) ||
    receipt.wordTargetCount < receipt.targetCount ||
    receipt.wordTargetCount > 10_368 ||
    receipt.variantCount !== receipt.targetCount * 4 ||
    receipt.generationTargetCount !==
      (receipt.targetCount + receipt.wordTargetCount) * 4 ||
    canonicalJsonV1(receipt.checkedRuleCodes) !==
      canonicalJsonV1(checkedRuleCodes) ||
    canonicalJsonV1(receipt.issueCodes) !== canonicalJsonV1(issueCodes) ||
    REQUIRED_ISSUES.some((issue) => !receipt.issueCodes.includes(issue)) ||
    receipt.outcome !== "blocked" ||
    receipt.candidateClassification !== "structural_voice_targets_only" ||
    receipt.candidateOriginAuthority !== "none" ||
    receipt.repositoryOriginAuthority !== "none" ||
    receipt.profileLifecycleAuthority !== "none" ||
    receipt.sourceAuthority !== "structural_catalog_only" ||
    receipt.storageAuthority !== "none" ||
    receipt.providerExecutionAuthority !== "none" ||
    receipt.audioByteAuthority !== "none" ||
    receipt.machineValidationAuthority !== "none" ||
    receipt.contentValidationAuthority !== "none" ||
    receipt.humanReviewAuthority !== "none" ||
    receipt.specialistEvidenceAuthority !== "none" ||
    receipt.listeningEvidenceAuthority !== "none" ||
    receipt.deviceEvidenceAuthority !== "none" ||
    receipt.runtimeKernelAuthority !== "none" ||
    receipt.executionAuthority !== "none" ||
    receipt.publicationAuthority !== "none" ||
    receipt.runtimeConsumer !== false ||
    receipt.releaseEligible !== false ||
    receipt.releaseAuthority !== false ||
    hashCanonicalBody(stable) !== receiptFingerprint
  )
    fail("v2_voice_targets_machine_receipt_invalid");
  return Object.freeze(receipt);
}

export function v2VoiceTargetsMachineCommitKeyV1(
  input: Readonly<{
    planFingerprint: string;
    stageId: string;
    candidateFingerprint: string;
    validatorRulesFingerprint: string;
    registryFingerprint: string;
  }>,
): string {
  if (typeof input.stageId !== "string" || !STAGE_RE.test(input.stageId))
    fail("v2_voice_targets_machine_identity_invalid");
  return hashCanonicalBody({
    schemaVersion: "v2-voice-targets-machine-commit-key.v1",
    planFingerprint: exactHash(
      input.planFingerprint,
      "v2_voice_targets_machine_identity_invalid",
    ),
    stageId: input.stageId,
    candidateFingerprint: exactHash(
      input.candidateFingerprint,
      "v2_voice_targets_machine_identity_invalid",
    ),
    validatorRulesFingerprint: exactHash(
      input.validatorRulesFingerprint,
      "v2_voice_targets_machine_identity_invalid",
    ),
    registryFingerprint: exactHash(
      input.registryFingerprint,
      "v2_voice_targets_machine_identity_invalid",
    ),
    receiptProfileFingerprint:
      V2_VOICE_TARGETS_MACHINE_RECEIPT_PROFILE_FINGERPRINT_V1,
  });
}

export function v2VoiceTargetsMachineManifestDocumentPathV1(
  input: Parameters<typeof v2VoiceTargetsMachineCommitKeyV1>[0],
): string {
  return `${V2_VOICE_TARGETS_MACHINE_MANIFEST_COLLECTION_V1}/${v2VoiceTargetsMachineCommitKeyV1(input)}`;
}

function manifestStable(
  value: Pick<
    V2VoiceTargetsMachineManifestV1,
    | "commitKey"
    | "receiptProfileFingerprint"
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
    commitKey: value.commitKey,
    receiptProfileFingerprint: value.receiptProfileFingerprint,
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

export function materializeV2VoiceTargetsMachineManifestV1(
  input: Readonly<{
    receipt: V2VoiceTargetsMachineReceiptV1;
    objectGeneration: string;
    createdAtEpochMs: number;
  }>,
): V2VoiceTargetsMachineManifestV1 {
  if (!isV2VoiceTargetsMachineReceiptV1(input.receipt))
    fail("v2_voice_targets_machine_manifest_receipt_untrusted");
  const receiptRaw = canonicalJsonV1(input.receipt);
  const receiptRawHash = sha256Utf8(receiptRaw);
  if (
    typeof input.objectGeneration !== "string" ||
    !/^[1-9][0-9]{0,30}$/.test(input.objectGeneration) ||
    !Number.isSafeInteger(input.createdAtEpochMs) ||
    input.createdAtEpochMs < 0
  )
    fail("v2_voice_targets_machine_manifest_invalid");
  const identity = {
    planFingerprint: input.receipt.planFingerprint,
    stageId: input.receipt.stageId,
    candidateFingerprint: input.receipt.candidateFingerprint,
    validatorRulesFingerprint: input.receipt.validatorRulesFingerprint,
    registryFingerprint: input.receipt.registryFingerprint,
  };
  const receiptObject = Object.freeze({
    objectPath: v2VoiceTargetsMachineReceiptObjectPathV1({
      planFingerprint: identity.planFingerprint,
      stageId: identity.stageId,
      candidateFingerprint: identity.candidateFingerprint,
      receiptFingerprint: input.receipt.receiptFingerprint,
      receiptRawHash,
    }),
    contentHash: receiptRawHash,
    objectGeneration: input.objectGeneration,
    byteSize: utf8ByteLengthV1(receiptRaw),
    contentType: "application/json; charset=utf-8" as const,
  });
  const stable = manifestStable({
    commitKey: v2VoiceTargetsMachineCommitKeyV1(identity),
    receiptProfileFingerprint:
      V2_VOICE_TARGETS_MACHINE_RECEIPT_PROFILE_FINGERPRINT_V1,
    ...identity,
    receiptFingerprint: input.receipt.receiptFingerprint,
    receiptRawHash,
    receiptObject,
  });
  const base = Object.freeze({
    schemaVersion: V2_VOICE_TARGETS_MACHINE_MANIFEST_SCHEMA_V1,
    state: "committed_blocked_machine_receipt" as const,
    ...stable,
    commitFingerprint: hashCanonicalBody(stable),
    createdAtEpochMs: input.createdAtEpochMs,
  });
  const result = Object.freeze({
    ...base,
    operationFingerprint: hashCanonicalBody(base),
  });
  if (
    utf8ByteLengthV1(canonicalJsonV1(result)) >
    V2_VOICE_TARGETS_MACHINE_MANIFEST_MAX_BYTES_V1
  )
    fail("v2_voice_targets_machine_manifest_too_large");
  return result;
}

export function parseV2VoiceTargetsMachineManifestV1(
  raw: string,
): V2VoiceTargetsMachineManifestV1 {
  if (
    typeof raw !== "string" ||
    raw.length > V2_VOICE_TARGETS_MACHINE_MANIFEST_MAX_BYTES_V1 ||
    utf8ByteLengthV1(raw) > V2_VOICE_TARGETS_MACHINE_MANIFEST_MAX_BYTES_V1
  )
    fail("v2_voice_targets_machine_manifest_invalid");
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    fail("v2_voice_targets_machine_manifest_invalid");
  }
  const keys = [
    "candidateFingerprint",
    "commitFingerprint",
    "commitKey",
    "createdAtEpochMs",
    "operationFingerprint",
    "planFingerprint",
    "receiptFingerprint",
    "receiptObject",
    "receiptProfileFingerprint",
    "receiptRawHash",
    "registryFingerprint",
    "schemaVersion",
    "stageId",
    "state",
    "validatorRulesFingerprint",
  ];
  if (
    !isRecord(value) ||
    !exactKeys(value, keys) ||
    canonicalJsonV1(value) !== raw
  )
    fail("v2_voice_targets_machine_manifest_invalid");
  const result = value as unknown as V2VoiceTargetsMachineManifestV1;
  if (
    !isRecord(result.receiptObject) ||
    !exactKeys(result.receiptObject, [
      "objectPath",
      "contentHash",
      "objectGeneration",
      "byteSize",
      "contentType",
    ])
  )
    fail("v2_voice_targets_machine_manifest_invalid");
  if (
    result.schemaVersion !== V2_VOICE_TARGETS_MACHINE_MANIFEST_SCHEMA_V1 ||
    result.state !== "committed_blocked_machine_receipt" ||
    result.receiptProfileFingerprint !==
      V2_VOICE_TARGETS_MACHINE_RECEIPT_PROFILE_FINGERPRINT_V1 ||
    !HASH_RE.test(result.planFingerprint) ||
    !STAGE_RE.test(result.stageId) ||
    !HASH_RE.test(result.candidateFingerprint) ||
    !HASH_RE.test(result.validatorRulesFingerprint) ||
    !HASH_RE.test(result.registryFingerprint) ||
    !HASH_RE.test(result.receiptFingerprint) ||
    !HASH_RE.test(result.receiptRawHash) ||
    result.commitKey !==
      v2VoiceTargetsMachineCommitKeyV1({
        planFingerprint: result.planFingerprint,
        stageId: result.stageId,
        candidateFingerprint: result.candidateFingerprint,
        validatorRulesFingerprint: result.validatorRulesFingerprint,
        registryFingerprint: result.registryFingerprint,
      }) ||
    result.receiptObject.contentHash !== result.receiptRawHash ||
    typeof result.receiptObject.objectPath !== "string" ||
    typeof result.receiptObject.objectGeneration !== "string" ||
    !/^[1-9][0-9]{0,30}$/.test(result.receiptObject.objectGeneration) ||
    !Number.isSafeInteger(result.receiptObject.byteSize) ||
    result.receiptObject.byteSize < 1 ||
    result.receiptObject.byteSize >
      V2_VOICE_TARGETS_MACHINE_RECEIPT_MAX_BYTES_V1 ||
    result.receiptObject.contentType !== "application/json; charset=utf-8" ||
    result.receiptObject.objectPath !==
      v2VoiceTargetsMachineReceiptObjectPathV1({
        planFingerprint: result.planFingerprint,
        stageId: result.stageId,
        candidateFingerprint: result.candidateFingerprint,
        receiptFingerprint: result.receiptFingerprint,
        receiptRawHash: result.receiptRawHash,
      }) ||
    result.commitFingerprint !== hashCanonicalBody(manifestStable(result)) ||
    !Number.isSafeInteger(result.createdAtEpochMs) ||
    result.createdAtEpochMs < 0
  )
    fail("v2_voice_targets_machine_manifest_invalid");
  const { operationFingerprint, ...base } = result;
  if (operationFingerprint !== hashCanonicalBody(base))
    fail("v2_voice_targets_machine_manifest_invalid");
  return Object.freeze(result);
}

export function decideV2VoiceTargetsMachineManifestV1(
  input: Readonly<{
    currentRaw: string | null;
    proposed: V2VoiceTargetsMachineManifestV1;
  }>,
): V2VoiceTargetsMachineManifestDecisionV1 {
  const proposed = parseV2VoiceTargetsMachineManifestV1(
    canonicalJsonV1(input.proposed),
  );
  const documentPath = v2VoiceTargetsMachineManifestDocumentPathV1({
    planFingerprint: proposed.planFingerprint,
    stageId: proposed.stageId,
    candidateFingerprint: proposed.candidateFingerprint,
    validatorRulesFingerprint: proposed.validatorRulesFingerprint,
    registryFingerprint: proposed.registryFingerprint,
  });
  if (input.currentRaw === null)
    return Object.freeze({
      kind: "create",
      documentPath,
      canonicalRaw: canonicalJsonV1(proposed),
      next: proposed,
    });
  const current = parseV2VoiceTargetsMachineManifestV1(input.currentRaw);
  if (
    current.commitKey === proposed.commitKey &&
    canonicalJsonV1(manifestStable(current)) ===
      canonicalJsonV1(manifestStable(proposed))
  )
    return Object.freeze({
      kind: "exact_replay",
      documentPath,
      committed: current,
    });
  return Object.freeze({
    kind: "conflict",
    documentPath,
    reason: "committed_payload_conflict",
  });
}

export function v2VoiceTargetsMachineReceiptObjectPathV1(
  input: Readonly<{
    planFingerprint: string;
    stageId: string;
    candidateFingerprint: string;
    receiptFingerprint: string;
    receiptRawHash: string;
  }>,
): string {
  const planFingerprint = exactHash(
    input.planFingerprint,
    "v2_voice_targets_machine_path_invalid",
  );
  const candidateFingerprint = exactHash(
    input.candidateFingerprint,
    "v2_voice_targets_machine_path_invalid",
  );
  const receiptFingerprint = exactHash(
    input.receiptFingerprint,
    "v2_voice_targets_machine_path_invalid",
  );
  const receiptRawHash = exactHash(
    input.receiptRawHash,
    "v2_voice_targets_machine_path_invalid",
  );
  if (typeof input.stageId !== "string" || !STAGE_RE.test(input.stageId))
    fail("v2_voice_targets_machine_path_invalid");
  const stageCoordinate = hashCanonicalBody({
    schemaVersion: "v2-voice-targets-machine-stage-coordinate.v1",
    planFingerprint,
    stageId: input.stageId,
    candidateFingerprint,
  });
  return `${V2_VOICE_TARGETS_MACHINE_RECEIPT_PREFIX_V1}/${planFingerprint}/${stageCoordinate}/${candidateFingerprint}/${receiptFingerprint}/${receiptRawHash}.json`;
}

export const isV2VoiceTargetsMachineReceiptV1 = (
  value: unknown,
): value is V2VoiceTargetsMachineReceiptV1 =>
  typeof value === "object" && value !== null && handles.has(value);
