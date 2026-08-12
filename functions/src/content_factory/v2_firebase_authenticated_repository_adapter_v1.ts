import { createHash, randomBytes } from "node:crypto";
import {
  hashCanonicalBody,
  sha256Utf8,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  V2_AUTHENTICATED_REPOSITORY_ORIGIN_RECEIPT_MAX_BYTES_V1,
  encodeV2AuthenticatedRepositoryOriginReceiptStructuralClaimV1,
  parseV2AuthenticatedRepositoryOriginReceiptV1,
  parseV2AuthenticatedRepositoryReadBundleV1,
  v2AuthenticatedRepositoryBlobObjectPathV1,
  v2AuthenticatedRepositoryManifestObjectPathV1,
  v2AuthenticatedRepositoryObservationObjectPathV1,
  type V2AuthenticatedRepositoryObjectPinV1,
  type V2AuthenticatedRepositoryOriginReceiptStructuralClaimV1,
  type V2AuthenticatedRepositoryRequirementV1,
} from "./v2_authenticated_repository_contract_v1";
import {
  assembleV2AuthenticatedRepositorySnapshotRowsV1,
  deriveV2AuthenticatedRepositoryMaterializationIdentityV1,
  deriveV2AuthenticatedRepositoryObjectReadRequestsV1,
  materializeV2AuthenticatedRepositorySnapshotV1,
  verifyV2AuthenticatedRepositoryColdReplayHeadsV1,
  type V2AuthenticatedRepositoryCoherentSnapshotRowV1,
  type V2AuthenticatedRepositoryMaterializationIdentityV1,
} from "./v2_authenticated_repository_materialization_v1";
import {
  isV2CanonicalSeasonPlanV2,
  type V2CanonicalSeasonPlanV2,
} from "./v2_canonical_generation_plan_v2";
import {
  bindV2ActivityRepositoryCapabilityV1,
  type V2ActivityRepositoryCapabilityBindingV1,
  type V2RepositoryCapabilityObservationReceiptV1,
} from "./v2_repository_capability_observation_v1";
import { materializeV2ActivityInstancesValidatorCapabilitySnapshotV1 } from "./v2_activity_instances_validator_capability_v1";
import { createV2FirebaseAdminRepositoryIoV1 } from "./v2_firebase_admin_repository_io_v1";
import {
  V2_FIREBASE_REPOSITORY_NAMESPACE_BODY_V1,
  V2_FIREBASE_REPOSITORY_NAMESPACE_FINGERPRINT_V1,
} from "./v2_firebase_repository_trust_root_v1";
import {
  V2_REPOSITORY_IMMUTABLE_BINARY_CONTENT_TYPE_V1,
  V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
  executeV2RepositorySingleflightClaimTransactionV1,
  executeV2RepositorySingleflightFinalizeTransactionV1,
  persistV2ImmutableRepositoryObjectV1,
  type V2RepositoryImmutableContentTypeV1,
  type V2RepositoryImmutableObjectPinV1,
  type V2RepositoryImmutableStoragePortV1,
} from "./v2_firebase_repository_persistence_v1";
import type {
  V2RepositorySingleflightCommittedV1,
  V2RepositorySingleflightIdentityV1,
  V2RepositorySingleflightReceiptPinV1,
} from "./v2_repository_singleflight_state_v1";

export const V2_FIREBASE_AUTHENTICATED_REPOSITORY_SESSION_SUMMARY_SCHEMA_V1 =
  "v2-firebase-authenticated-repository-session-summary.v1" as const;
export const V2_FIREBASE_AUTHENTICATED_ACTIVITY_STAGE_CAPABILITY_SUMMARY_SCHEMA_V1 =
  "v2-firebase-authenticated-activity-stage-capability-summary.v1" as const;

const RESOLVER_CONTRACT_FINGERPRINT = hashCanonicalBody({
  schemaVersion: "v2-firebase-authenticated-repository-resolver.v1",
  requirementScope: "plan_global_language_and_published_templates",
  firestoreRead: "coherent_get_all_before_and_after",
  storageRead: "metadata_preflight_and_exact_generation_readback",
  replay: "persisted_bundle_plus_current_heads_exact",
});
const LEASE_SECONDS = 300;
const OBSERVATION_MAX_BYTES = 64 * 1024;
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

export interface V2FirebaseAuthenticatedRepositorySessionHandleV1 {
  readonly kind: "v2_firebase_authenticated_repository_session_handle";
}

export interface V2FirebaseAuthenticatedRepositorySessionSummaryV1 {
  readonly schemaVersion: typeof V2_FIREBASE_AUTHENTICATED_REPOSITORY_SESSION_SUMMARY_SCHEMA_V1;
  readonly planFingerprint: string;
  readonly courseContractFingerprint: string;
  readonly repositoryScopeFingerprint: string;
  readonly requestFingerprint: string;
  readonly receiptFingerprint: string;
  readonly repositoryObservationFingerprint: string;
  readonly coldReplayVerificationFingerprint: string;
  readonly namespaceFingerprint: string;
  readonly requirementCount: number;
  readonly templateCount: number;
  readonly connectionAuthentication: "firebase_admin_default_app_exact_trust_root";
  readonly repositoryOriginAuthenticity: "server_admin_sdk_authenticated_readback";
  readonly repositoryOriginAuthority: "authenticated_repository_snapshot_only";
  readonly recordEncodingEvidence: "firestore_document_data_canonical_json_utf8.v1";
  readonly namespaceAuthority: "code_owned_exact_production_namespace";
  readonly storageExistenceAuthority: "exact_generation_readback";
  readonly publishedStateEvidence: "exact_current_record_and_lifecycle_head_replay";
  readonly publishedStateAuthority: "authenticated_repository_snapshot_only";
  readonly principalIdentityAuthority: "none";
  readonly humanReviewAuthority: "none";
  readonly contentValidationAuthority: "none";
  readonly publicationDecisionAuthority: "none";
  readonly runtimeKernelAuthority: "none";
  readonly executionAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseAuthority: false;
}

export interface V2FirebaseAuthenticatedRepositoryAdapterV1 {
  authenticatePlan(
    plan: V2CanonicalSeasonPlanV2,
  ): Promise<V2FirebaseAuthenticatedRepositorySessionHandleV1>;
}

export interface V2FirebaseAuthenticatedActivityStageCapabilityHandleV1 {
  readonly kind: "v2_firebase_authenticated_activity_stage_capability_handle";
}

export interface V2FirebaseAuthenticatedActivityStageCapabilitySummaryV1 {
  readonly schemaVersion: typeof V2_FIREBASE_AUTHENTICATED_ACTIVITY_STAGE_CAPABILITY_SUMMARY_SCHEMA_V1;
  readonly namespaceFingerprint: string;
  readonly repositoryOriginReceiptFingerprint: string;
  readonly repositoryObservationFingerprint: string;
  readonly planFingerprint: string;
  readonly courseContractFingerprint: string;
  readonly repositoryScopeFingerprint: string;
  readonly requestFingerprint: string;
  readonly stageId: string;
  readonly episodeId: string;
  readonly structuralBindingFingerprint: string;
  readonly dependencySubsetFingerprint: string;
  readonly languageProfileFingerprint: string;
  readonly templateAggregateFingerprint: string;
  readonly familyCatalogFingerprint: string;
  readonly requiredSessionFamilyPolicyFingerprint: string;
  readonly authenticatedCapabilityFingerprint: string;
  readonly connectionAuthentication: "firebase_admin_default_app_exact_trust_root";
  readonly repositoryOriginAuthenticity: "server_admin_sdk_authenticated_readback";
  readonly repositoryOriginAuthority: "authenticated_repository_snapshot_only";
  readonly capabilityBindingAuthority: "structural_exact_match_only";
  readonly principalIdentityAuthority: "none";
  readonly contentValidationAuthority: "none";
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
}

interface V2FirebaseAuthenticatedRepositorySessionMetadataV1 {
  readonly summary: V2FirebaseAuthenticatedRepositorySessionSummaryV1;
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly observation: V2RepositoryCapabilityObservationReceiptV1;
}

interface V2FirebaseAuthenticatedActivityStageCapabilityMetadataV1 {
  readonly summary: V2FirebaseAuthenticatedActivityStageCapabilitySummaryV1;
  readonly parentSession: V2FirebaseAuthenticatedRepositorySessionHandleV1;
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly binding: V2ActivityRepositoryCapabilityBindingV1;
}

const sessionHandles = new WeakSet<object>();
const sessionMetadata = new WeakMap<
  object,
  V2FirebaseAuthenticatedRepositorySessionMetadataV1
>();
const activityStageCapabilityHandles = new WeakSet<object>();
const activityStageCapabilityMetadata = new WeakMap<
  object,
  V2FirebaseAuthenticatedActivityStageCapabilityMetadataV1
>();

function fail(code: string): never {
  throw new Error(code);
}

function receiptObjectPath(
  planFingerprint: string,
  receiptFingerprint: string,
): string {
  return `${V2_FIREBASE_REPOSITORY_NAMESPACE_BODY_V1.storage.repositoryOriginReceiptPrefix}/${planFingerprint}/${receiptFingerprint}.json`;
}

function requirementKey(
  requirement: V2AuthenticatedRepositoryRequirementV1,
): string {
  return requirement.dependencyType === "language_profile"
    ? `language_profile:${requirement.profileId}:v${requirement.version}:${requirement.contentHash}`
    : `published_template:${requirement.templateId}:v${requirement.version}:${requirement.contentHash}`;
}

function planRepositoryRequirements(
  plan: V2CanonicalSeasonPlanV2,
): readonly V2AuthenticatedRepositoryRequirementV1[] {
  return Object.freeze(
    plan.externalRequirementCatalog
      .flatMap((entry) =>
        entry.requirement.dependencyType === "language_profile" ||
        entry.requirement.dependencyType === "published_template"
          ? [entry.requirement]
          : [],
      )
      .sort((left, right) =>
        requirementKey(left) < requirementKey(right)
          ? -1
          : requirementKey(left) > requirementKey(right)
            ? 1
            : 0,
      ),
  );
}

function toAuditPin(
  pin: V2RepositoryImmutableObjectPinV1,
): V2AuthenticatedRepositoryObjectPinV1 {
  return Object.freeze({
    objectPath: pin.objectPath,
    contentHash: pin.contentHash,
    objectGeneration: pin.objectGeneration,
    byteSize: pin.byteSize,
  });
}

function toSingleflightPin(
  pin: V2RepositoryImmutableObjectPinV1,
): V2RepositorySingleflightReceiptPinV1 {
  return Object.freeze({
    objectPath: pin.objectPath,
    contentHash: pin.contentHash,
    objectGeneration: pin.objectGeneration,
    byteSize: pin.byteSize,
  });
}

function toSingleflightIdentity(
  identity: V2AuthenticatedRepositoryMaterializationIdentityV1,
): V2RepositorySingleflightIdentityV1 {
  return Object.freeze({
    planFingerprint: identity.planFingerprint,
    courseContractFingerprint: identity.courseContractFingerprint,
    repositoryScopeFingerprint: identity.repositoryScopeFingerprint,
    resolverContractFingerprint: identity.resolverContractFingerprint,
    requestFingerprint: identity.requestFingerprint,
  });
}

async function persist(
  storage: V2RepositoryImmutableStoragePortV1,
  input: Readonly<{
    objectPath: string;
    bytes: Uint8Array;
    maximumBytes: number;
    contentType: V2RepositoryImmutableContentTypeV1;
    contentHash: string;
  }>,
): Promise<V2RepositoryImmutableObjectPinV1> {
  return (await persistV2ImmutableRepositoryObjectV1({ storage, ...input }))
    .pin;
}

async function loadPinned(
  storage: V2RepositoryImmutableStoragePortV1,
  pin:
    | V2AuthenticatedRepositoryObjectPinV1
    | V2RepositorySingleflightReceiptPinV1,
  maximumBytes: number,
  contentType: V2RepositoryImmutableContentTypeV1,
): Promise<Uint8Array> {
  if (pin.byteSize > maximumBytes)
    fail("v2_firebase_authenticated_repository_pin_oversize");
  const metadata = await storage.readMetadataExact(pin.objectPath);
  if (
    metadata === null ||
    metadata.generation !== pin.objectGeneration ||
    metadata.byteSize !== pin.byteSize ||
    metadata.contentHash !== pin.contentHash ||
    metadata.contentType !== contentType
  ) {
    fail("v2_firebase_authenticated_repository_pin_metadata_mismatch");
  }
  const read = await storage.downloadGenerationExact({
    objectPath: pin.objectPath,
    ifGenerationMatch: pin.objectGeneration,
    maximumBytes,
  });
  if (
    read.kind !== "downloaded" ||
    read.bytes.byteLength !== pin.byteSize ||
    createHash("sha256").update(read.bytes).digest("hex") !== pin.contentHash
  ) {
    fail("v2_firebase_authenticated_repository_pin_readback_mismatch");
  }
  return new Uint8Array(read.bytes);
}

function originReceiptRaw(input: {
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly identity: V2AuthenticatedRepositoryMaterializationIdentityV1;
  readonly rows: readonly V2AuthenticatedRepositoryCoherentSnapshotRowV1[];
  readonly observationFingerprint: string;
  readonly observationRawHash: string;
  readonly manifestFingerprint: string;
  readonly manifestRawHash: string;
  readonly blobHash: string;
  readonly manifestByteSize: number;
  readonly blobByteSize: number;
  readonly manifestPin: V2RepositoryImmutableObjectPinV1;
  readonly blobPin: V2RepositoryImmutableObjectPinV1;
  readonly observationPin: V2RepositoryImmutableObjectPinV1;
}): Readonly<{
  raw: string;
  claim: V2AuthenticatedRepositoryOriginReceiptStructuralClaimV1;
}> {
  const observation = input.rows;
  const templateCount = observation.filter(
    (row) => row.requirement.dependencyType === "published_template",
  ).length;
  return encodeV2AuthenticatedRepositoryOriginReceiptStructuralClaimV1({
    planFingerprint: input.identity.planFingerprint,
    courseContractFingerprint: input.identity.courseContractFingerprint,
    repositoryScopeFingerprint: input.identity.repositoryScopeFingerprint,
    resolverContractFingerprint: input.identity.resolverContractFingerprint,
    requestFingerprint: input.identity.requestFingerprint,
    workspaceId: input.plan.workspaceId,
    authoringRevision: input.plan.authoringRevision,
    targetLanguage: input.plan.targetLanguage,
    requirementCount: observation.length,
    templateCount,
    requirementAggregateFingerprint:
      input.identity.requirementAggregateFingerprint,
    headAggregateFingerprint: hashCanonicalBody(
      observation.map((row) => ({
        requirement: row.requirement,
        evidence: row.evidence,
      })),
    ),
    bundleManifestFingerprint: input.manifestFingerprint,
    bundleManifestRawHash: input.manifestRawHash,
    bundleBlobHash: input.blobHash,
    bundleManifestByteSize: input.manifestByteSize,
    bundleBlobByteSize: input.blobByteSize,
    bundleManifestPin: toAuditPin(input.manifestPin),
    bundleBlobPin: toAuditPin(input.blobPin),
    structuralObservationPin: toAuditPin(input.observationPin),
    structuralObservationFingerprint: input.observationFingerprint,
    structuralObservationRawHash: input.observationRawHash,
  });
}

function exactIdentity(
  claim: V2AuthenticatedRepositoryOriginReceiptStructuralClaimV1,
  identity: V2AuthenticatedRepositoryMaterializationIdentityV1,
): void {
  if (
    claim.planFingerprint !== identity.planFingerprint ||
    claim.courseContractFingerprint !== identity.courseContractFingerprint ||
    claim.repositoryScopeFingerprint !== identity.repositoryScopeFingerprint ||
    claim.resolverContractFingerprint !==
      identity.resolverContractFingerprint ||
    claim.requestFingerprint !== identity.requestFingerprint ||
    claim.requirementAggregateFingerprint !==
      identity.requirementAggregateFingerprint
  ) {
    fail("v2_firebase_authenticated_repository_receipt_identity_mismatch");
  }
}

async function coldLoad(input: {
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly identity: V2AuthenticatedRepositoryMaterializationIdentityV1;
  readonly committed: V2RepositorySingleflightCommittedV1;
  readonly storage: V2RepositoryImmutableStoragePortV1;
  readonly readHeads: (
    requirements: readonly V2AuthenticatedRepositoryRequirementV1[],
  ) => ReturnType<
    ReturnType<
      typeof createV2FirebaseAdminRepositoryIoV1
    >["readCoherentHeadSnapshot"]
  >;
}): Promise<V2FirebaseAuthenticatedRepositorySessionHandleV1> {
  const receiptBytes = await loadPinned(
    input.storage,
    input.committed.receiptPin,
    V2_AUTHENTICATED_REPOSITORY_ORIGIN_RECEIPT_MAX_BYTES_V1,
    V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
  );
  let receiptRaw: string;
  try {
    receiptRaw = decoder.decode(receiptBytes);
  } catch {
    fail("v2_firebase_authenticated_repository_receipt_utf8_invalid");
  }
  const claim = parseV2AuthenticatedRepositoryOriginReceiptV1(receiptRaw);
  exactIdentity(claim, input.identity);
  if (
    claim.receiptFingerprint !== input.committed.receiptFingerprint ||
    input.committed.receiptPin.objectPath !==
      receiptObjectPath(
        input.identity.planFingerprint,
        claim.receiptFingerprint,
      )
  ) {
    fail("v2_firebase_authenticated_repository_committed_receipt_mismatch");
  }
  const [manifestBytes, blobBytes, observationBytes] = await Promise.all([
    loadPinned(
      input.storage,
      claim.bundleManifestPin,
      claim.bundleManifestByteSize,
      V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
    ),
    loadPinned(
      input.storage,
      claim.bundleBlobPin,
      claim.bundleBlobByteSize,
      V2_REPOSITORY_IMMUTABLE_BINARY_CONTENT_TYPE_V1,
    ),
    loadPinned(
      input.storage,
      claim.structuralObservationPin,
      OBSERVATION_MAX_BYTES,
      V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
    ),
  ]);
  let manifestRaw: string;
  let observationRaw: string;
  try {
    manifestRaw = decoder.decode(manifestBytes);
    observationRaw = decoder.decode(observationBytes);
  } catch {
    fail("v2_firebase_authenticated_repository_cold_utf8_invalid");
  }
  const parsed = parseV2AuthenticatedRepositoryReadBundleV1(
    manifestRaw,
    blobBytes,
  );
  if (
    parsed.manifest.manifestFingerprint !== claim.bundleManifestFingerprint ||
    parsed.manifest.blobHash !== claim.bundleBlobHash
  ) {
    fail("v2_firebase_authenticated_repository_bundle_claim_mismatch");
  }
  if (
    hashCanonicalBody(
      parsed.entries.map((row) => ({
        requirement: row.requirement,
        evidence: row.evidence,
      })),
    ) !== claim.headAggregateFingerprint
  ) {
    fail("v2_firebase_authenticated_repository_head_claim_mismatch");
  }
  const currentSnapshot = await input.readHeads(
    parsed.entries.map((row) => row.requirement),
  );
  const cold = await verifyV2AuthenticatedRepositoryColdReplayHeadsV1({
    plan: input.plan,
    parsedRows: parsed.entries,
    currentSnapshot,
    expectedObservationRaw: observationRaw,
  });
  if (
    cold.observation.receiptFingerprint !==
    claim.structuralObservationFingerprint
  ) {
    fail("v2_firebase_authenticated_repository_observation_claim_mismatch");
  }
  const summary = Object.freeze({
    schemaVersion:
      V2_FIREBASE_AUTHENTICATED_REPOSITORY_SESSION_SUMMARY_SCHEMA_V1,
    planFingerprint: input.identity.planFingerprint,
    courseContractFingerprint: input.identity.courseContractFingerprint,
    repositoryScopeFingerprint: input.identity.repositoryScopeFingerprint,
    requestFingerprint: input.identity.requestFingerprint,
    receiptFingerprint: claim.receiptFingerprint,
    repositoryObservationFingerprint: cold.observation.receiptFingerprint,
    coldReplayVerificationFingerprint: cold.verificationFingerprint,
    namespaceFingerprint: V2_FIREBASE_REPOSITORY_NAMESPACE_FINGERPRINT_V1,
    requirementCount: claim.requirementCount,
    templateCount: claim.templateCount,
    connectionAuthentication:
      "firebase_admin_default_app_exact_trust_root" as const,
    repositoryOriginAuthenticity:
      "server_admin_sdk_authenticated_readback" as const,
    repositoryOriginAuthority:
      "authenticated_repository_snapshot_only" as const,
    recordEncodingEvidence:
      "firestore_document_data_canonical_json_utf8.v1" as const,
    namespaceAuthority: "code_owned_exact_production_namespace" as const,
    storageExistenceAuthority: "exact_generation_readback" as const,
    publishedStateEvidence:
      "exact_current_record_and_lifecycle_head_replay" as const,
    publishedStateAuthority: "authenticated_repository_snapshot_only" as const,
    principalIdentityAuthority: "none" as const,
    humanReviewAuthority: "none" as const,
    contentValidationAuthority: "none" as const,
    publicationDecisionAuthority: "none" as const,
    runtimeKernelAuthority: "none" as const,
    executionAuthority: "none" as const,
    publicationAuthority: "none" as const,
    runtimeConsumer: false as const,
    releaseAuthority: false as const,
  });
  const handle = Object.freeze({
    kind: "v2_firebase_authenticated_repository_session_handle" as const,
  });
  sessionHandles.add(handle);
  sessionMetadata.set(
    handle,
    Object.freeze({ summary, plan: input.plan, observation: cold.observation }),
  );
  return handle;
}

export function isV2FirebaseAuthenticatedRepositorySessionHandleV1(
  value: unknown,
): value is V2FirebaseAuthenticatedRepositorySessionHandleV1 {
  return (
    typeof value === "object" && value !== null && sessionHandles.has(value)
  );
}

export function getV2FirebaseAuthenticatedRepositorySessionSummaryV1(
  handle: V2FirebaseAuthenticatedRepositorySessionHandleV1,
): V2FirebaseAuthenticatedRepositorySessionSummaryV1 {
  const metadata = sessionMetadata.get(handle);
  if (!metadata)
    fail("v2_firebase_authenticated_repository_session_handle_invalid");
  return metadata.summary;
}

export function bindV2FirebaseAuthenticatedRepositorySessionToActivityStageV1(input: {
  readonly session: V2FirebaseAuthenticatedRepositorySessionHandleV1;
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly stageId: string;
}): V2FirebaseAuthenticatedActivityStageCapabilityHandleV1 {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input) ||
    Object.keys(input).sort().join("|") !== "plan|session|stageId"
  ) {
    fail("v2_firebase_authenticated_activity_stage_capability_input_invalid");
  }
  const parent = sessionMetadata.get(input.session);
  if (
    !parent ||
    !isV2CanonicalSeasonPlanV2(input.plan) ||
    parent.plan !== input.plan ||
    typeof input.stageId !== "string"
  ) {
    fail("v2_firebase_authenticated_activity_stage_capability_input_invalid");
  }
  const binding = bindV2ActivityRepositoryCapabilityV1({
    plan: input.plan,
    stageId: input.stageId,
    observation: parent.observation,
  });
  const dependencySubsetFingerprint = hashCanonicalBody(
    binding.templateBindings.map((template) => ({
      requirementId: template.requirementId,
      requirement: template.requirement,
      artifactRef: template.artifactRef,
      lifecycleFingerprint: template.lifecycleFingerprint,
      entryFingerprint: template.entryFingerprint,
    })),
  );
  const body = Object.freeze({
    schemaVersion:
      V2_FIREBASE_AUTHENTICATED_ACTIVITY_STAGE_CAPABILITY_SUMMARY_SCHEMA_V1,
    namespaceFingerprint: parent.summary.namespaceFingerprint,
    repositoryOriginReceiptFingerprint: parent.summary.receiptFingerprint,
    repositoryObservationFingerprint:
      parent.summary.repositoryObservationFingerprint,
    planFingerprint: binding.planFingerprint,
    courseContractFingerprint: binding.courseContractFingerprint,
    repositoryScopeFingerprint: parent.summary.repositoryScopeFingerprint,
    requestFingerprint: parent.summary.requestFingerprint,
    stageId: binding.stageId,
    episodeId: binding.episodeId,
    structuralBindingFingerprint: binding.bindingFingerprint,
    dependencySubsetFingerprint,
    languageProfileFingerprint: binding.languageProfileFingerprint,
    templateAggregateFingerprint: binding.templateAggregateFingerprint,
    familyCatalogFingerprint: binding.familyCatalogFingerprint,
    requiredSessionFamilyPolicyFingerprint:
      binding.requiredSessionFamilyPolicyFingerprint,
    connectionAuthentication:
      "firebase_admin_default_app_exact_trust_root" as const,
    repositoryOriginAuthenticity:
      "server_admin_sdk_authenticated_readback" as const,
    repositoryOriginAuthority:
      "authenticated_repository_snapshot_only" as const,
    capabilityBindingAuthority: "structural_exact_match_only" as const,
    principalIdentityAuthority: "none" as const,
    contentValidationAuthority: "none" as const,
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
  const summary = Object.freeze({
    ...body,
    authenticatedCapabilityFingerprint: hashCanonicalBody(body),
  });
  const handle = Object.freeze({
    kind: "v2_firebase_authenticated_activity_stage_capability_handle" as const,
  });
  activityStageCapabilityHandles.add(handle);
  activityStageCapabilityMetadata.set(
    handle,
    Object.freeze({
      summary,
      parentSession: input.session,
      plan: input.plan,
      binding,
    }),
  );
  return handle;
}

export function isV2FirebaseAuthenticatedActivityStageCapabilityHandleV1(
  value: unknown,
): value is V2FirebaseAuthenticatedActivityStageCapabilityHandleV1 {
  return (
    typeof value === "object" &&
    value !== null &&
    activityStageCapabilityHandles.has(value)
  );
}

export function getV2FirebaseAuthenticatedActivityStageCapabilitySummaryV1(
  handle: V2FirebaseAuthenticatedActivityStageCapabilityHandleV1,
): V2FirebaseAuthenticatedActivityStageCapabilitySummaryV1 {
  const metadata = activityStageCapabilityMetadata.get(handle);
  if (!metadata)
    fail("v2_firebase_authenticated_activity_stage_capability_handle_invalid");
  return metadata.summary;
}

export function resolveV2FirebaseAuthenticatedActivityStageStructuralBindingV1(input: {
  readonly capability: V2FirebaseAuthenticatedActivityStageCapabilityHandleV1;
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly stageId: string;
}): V2ActivityRepositoryCapabilityBindingV1 {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input) ||
    Object.keys(input).sort().join("|") !== "capability|plan|stageId"
  ) {
    fail("v2_firebase_authenticated_activity_stage_capability_handle_invalid");
  }
  const metadata = activityStageCapabilityMetadata.get(input.capability);
  if (
    !metadata ||
    metadata.plan !== input.plan ||
    metadata.summary.stageId !== input.stageId
  ) {
    fail("v2_firebase_authenticated_activity_stage_capability_handle_invalid");
  }
  return metadata.binding;
}

export function resolveV2FirebaseAuthenticatedActivityStageValidatorCapabilitySnapshotV1(input: {
  readonly capability: V2FirebaseAuthenticatedActivityStageCapabilityHandleV1;
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly stageId: string;
}): ReturnType<
  typeof materializeV2ActivityInstancesValidatorCapabilitySnapshotV1
> {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input) ||
    Object.keys(input).sort().join("|") !== "capability|plan|stageId"
  ) {
    fail("v2_firebase_authenticated_activity_stage_capability_handle_invalid");
  }
  const capabilityMetadata = activityStageCapabilityMetadata.get(
    input.capability,
  );
  if (
    !capabilityMetadata ||
    capabilityMetadata.plan !== input.plan ||
    capabilityMetadata.summary.stageId !== input.stageId
  ) {
    fail("v2_firebase_authenticated_activity_stage_capability_handle_invalid");
  }
  const parentMetadata = sessionMetadata.get(capabilityMetadata.parentSession);
  if (!parentMetadata || parentMetadata.plan !== input.plan) {
    fail("v2_firebase_authenticated_activity_stage_capability_handle_invalid");
  }
  return materializeV2ActivityInstancesValidatorCapabilitySnapshotV1({
    plan: input.plan,
    stageId: input.stageId,
    observation: parentMetadata.observation,
  });
}

export function createFirebaseAdminV2AuthenticatedRepositoryAdapterV1(): V2FirebaseAuthenticatedRepositoryAdapterV1 {
  const io = createV2FirebaseAdminRepositoryIoV1();
  return Object.freeze({
    authenticatePlan: async (plan: V2CanonicalSeasonPlanV2) => {
      if (!isV2CanonicalSeasonPlanV2(plan))
        fail("v2_firebase_authenticated_repository_plan_invalid");
      const identity = deriveV2AuthenticatedRepositoryMaterializationIdentityV1(
        {
          plan,
          resolverContractFingerprint: RESOLVER_CONTRACT_FINGERPRINT,
        },
      );
      const claimToken = randomBytes(32).toString("hex");
      const singleflightIdentity = toSingleflightIdentity(identity);
      const claim = await executeV2RepositorySingleflightClaimTransactionV1({
        firestore: io.firestore,
        identity: singleflightIdentity,
        claimToken,
        nowEpochMs: Date.now(),
        leaseSeconds: LEASE_SECONDS,
      });
      let committed: V2RepositorySingleflightCommittedV1;
      if (claim.kind === "exact_replay") {
        committed = claim.committed;
      } else {
        if (claim.kind === "in_progress")
          fail("v2_firebase_authenticated_repository_claim_in_progress");
        const beforeSnapshot = await io.readCoherentHeadSnapshot(
          planRepositoryRequirements(plan),
        );
        const requests = deriveV2AuthenticatedRepositoryObjectReadRequestsV1({
          plan,
          beforeSnapshot,
        });
        const objects = [];
        for (const request of requests) {
          objects.push(
            await io.readRequirementObjectGenerationExact({
              requirement: request.requirement,
              objectGeneration: request.objectGeneration,
              declaredByteSize: request.declaredByteSize,
              maximumBytes: request.maximumBytes,
            }),
          );
        }
        const afterSnapshot = await io.readCoherentHeadSnapshot(
          requests.map((request) => request.requirement),
        );
        const rows = assembleV2AuthenticatedRepositorySnapshotRowsV1({
          plan,
          beforeSnapshot,
          objects,
          afterSnapshot,
        });
        const materialization =
          await materializeV2AuthenticatedRepositorySnapshotV1({
            plan,
            identity,
            rows,
          });
        const manifestPin = await persist(io.storage, {
          objectPath: v2AuthenticatedRepositoryManifestObjectPathV1(
            identity.planFingerprint,
            identity.requestFingerprint,
            materialization.bundleManifestLogicalFingerprint,
          ),
          bytes: encoder.encode(materialization.bundleManifestFullRaw),
          maximumBytes: materialization.bundleManifestMaximumBytes,
          contentType: V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
          contentHash: materialization.bundleManifestFullRawHash,
        });
        const blobPin = await persist(io.storage, {
          objectPath: v2AuthenticatedRepositoryBlobObjectPathV1(
            identity.planFingerprint,
            identity.requestFingerprint,
            materialization.bundleBlobHash,
          ),
          bytes: materialization.bundleBlob,
          maximumBytes: materialization.bundleBlobMaximumBytes,
          contentType: V2_REPOSITORY_IMMUTABLE_BINARY_CONTENT_TYPE_V1,
          contentHash: materialization.bundleBlobHash,
        });
        const observationPin = await persist(io.storage, {
          objectPath: v2AuthenticatedRepositoryObservationObjectPathV1(
            identity.planFingerprint,
            identity.requestFingerprint,
            materialization.observationLogicalFingerprint,
          ),
          bytes: encoder.encode(materialization.observationFullRaw),
          maximumBytes: OBSERVATION_MAX_BYTES,
          contentType: V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
          contentHash: materialization.observationFullRawHash,
        });
        const receipt = originReceiptRaw({
          plan,
          identity,
          rows,
          observationFingerprint: materialization.observationLogicalFingerprint,
          observationRawHash: materialization.observationFullRawHash,
          manifestFingerprint: materialization.bundleManifestLogicalFingerprint,
          manifestRawHash: materialization.bundleManifestFullRawHash,
          blobHash: materialization.bundleBlobHash,
          manifestByteSize: encoder.encode(
            materialization.bundleManifestFullRaw,
          ).byteLength,
          blobByteSize: materialization.bundleBlobByteSize,
          manifestPin,
          blobPin,
          observationPin,
        });
        const receiptPin = await persist(io.storage, {
          objectPath: receiptObjectPath(
            identity.planFingerprint,
            receipt.claim.receiptFingerprint,
          ),
          bytes: encoder.encode(receipt.raw),
          maximumBytes: V2_AUTHENTICATED_REPOSITORY_ORIGIN_RECEIPT_MAX_BYTES_V1,
          contentType: V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
          contentHash: sha256Utf8(receipt.raw),
        });
        const finalized =
          await executeV2RepositorySingleflightFinalizeTransactionV1({
            firestore: io.firestore,
            identity: singleflightIdentity,
            claimEpoch: claim.command.next.claimEpoch,
            claimToken,
            nowEpochMs: Date.now(),
            receiptFingerprint: receipt.claim.receiptFingerprint,
            receiptPin: toSingleflightPin(receiptPin),
          });
        if (finalized.kind === "exact_replay") {
          committed = finalized.committed;
        } else {
          if (finalized.command.next.state !== "committed")
            fail("v2_firebase_authenticated_repository_finalize_invalid");
          committed = finalized.command.next;
        }
      }
      return coldLoad({
        plan,
        identity,
        committed,
        storage: io.storage,
        readHeads: (requirements) => io.readCoherentHeadSnapshot(requirements),
      });
    },
  });
}
