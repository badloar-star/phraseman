import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
  type ImmutableObjectRef,
} from '../../../modules/learning-v2/policies/decision_registry';
import {
  isV2CanonicalSeasonPlan,
  V2_CANONICAL_MAX_EXTERNAL_DEPENDENCIES,
  type V2CanonicalExternalRequirement,
  type V2CanonicalInterfaceLocale,
  type V2CanonicalSeasonPlanV1,
  type V2CanonicalStageKind,
  type V2CanonicalStageNode,
} from './v2_canonical_generation_plan';

const SHA256_RE = /^[0-9a-f]{64}$/;
const TOKEN_RE = /^[A-Za-z0-9._:-]{1,240}$/;
const STAGE_ID_RE = /^[A-Za-z0-9._:-]{1,1000}$/;
const OBJECT_PATH_RE = /^[A-Za-z0-9._/@:+-]{1,1000}$/;
const GENERATION_RE = /^[A-Za-z0-9._:-]{1,160}$/;
const ISSUE_RE = /^[a-z0-9][a-z0-9._:-]{0,159}$/;
const MAX_DEPENDENCY_SNAPSHOT_BYTES = 64 * 1024;
const MAX_DEPENDENCIES = V2_CANONICAL_MAX_EXTERNAL_DEPENDENCIES;
const MAX_RECEIPTS = 64;
const MAX_ISSUES = 128;
const MAX_BLOCKED_INPUT_BYTES = 256 * 1024;
const dependencySnapshotHandles = new WeakSet<object>();

export type V2ImmutableDependency =
  | Readonly<{
      dependencyType: 'stage';
      stageId: string;
      artifactHash: string;
      reviewFingerprint: string;
      objectPath: string;
      objectGeneration: string;
      lifecycleFingerprint: string;
    }>
  | Readonly<{
      dependencyType: 'published_template';
      templateId: string;
      version: number;
      contentHash: string;
      objectPath: string;
      objectGeneration: string;
      lifecycleFingerprint: string;
    }>
  | Readonly<{
      dependencyType: 'language_profile';
      profileId: string;
      version: number;
      contentHash: string;
      objectPath: string;
      objectGeneration: string;
      lifecycleFingerprint: string;
    }>;

interface V2StageAcceptanceBaseV1 {
  readonly schemaVersion: 'v2-stage-acceptance.v1';
  readonly compilerVersion: 'v2-canonical-plan-compiler.v1';
  readonly planFingerprint: string;
  readonly stageId: string;
  readonly stageKind: V2CanonicalStageKind;
  readonly subject: Readonly<{
    workspaceId: string;
    jobId: string;
    seasonId: string;
    episodeId: string | null;
    locale: V2CanonicalInterfaceLocale | null;
    authoringRevision: number;
    subjectFingerprint: string;
  }>;
  readonly artifactRef: ImmutableObjectRef;
  readonly dependencySnapshot: readonly V2ImmutableDependency[];
  readonly dependencyFingerprint: string;
  readonly validatorVersion: string;
  readonly blockingIssueCodes: readonly string[];
  readonly evidenceReceiptRefs: readonly ImmutableObjectRef[];
  readonly evidenceAuthority: 'structural_snapshot_only';
  readonly stageDependencyEvidenceAuthority: 'unverified_structural_only';
  readonly executionAuthority: 'none';
  readonly publicationPolicy: 'draft_only_no_consumer';
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly acceptanceFingerprint: string;
}

export type V2StageAcceptanceV1 = Readonly<V2StageAcceptanceBaseV1 & { readonly outcome: 'blocked' }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}

function exactString(value: unknown, pattern: RegExp, code: string): string {
  if (typeof value !== 'string' || !pattern.test(value)) throw new Error(code);
  return value;
}

function exactVersion(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1 || value > 1_000_000) throw new Error('v2_dependency_version_invalid');
  return value;
}

function codePointCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function dependencyIdentity(value: V2ImmutableDependency): string {
  if (value.dependencyType === 'stage') return `stage:${value.stageId}`;
  if (value.dependencyType === 'published_template') return `published_template:${value.templateId}@${value.version}`;
  return `language_profile:${value.profileId}@${value.version}`;
}

function externalRequirementIdentity(value: V2CanonicalExternalRequirement): string {
  if (value.dependencyType === 'published_template') return `published_template:${value.templateId}@${value.version}`;
  return `language_profile:${value.profileId}@${value.version}`;
}

function parseDependency(value: unknown): V2ImmutableDependency {
  if (!isRecord(value)) throw new Error('v2_dependency_invalid');
  const dependencyType = value.dependencyType;
  if (dependencyType === 'stage') {
    if (!exactKeys(value, ['dependencyType', 'stageId', 'artifactHash', 'reviewFingerprint', 'objectPath', 'objectGeneration', 'lifecycleFingerprint'])) throw new Error('v2_dependency_fields_invalid');
    return Object.freeze({
      dependencyType,
      stageId: exactString(value.stageId, STAGE_ID_RE, 'v2_dependency_stage_invalid'),
      artifactHash: exactString(value.artifactHash, SHA256_RE, 'v2_dependency_hash_invalid'),
      reviewFingerprint: exactString(value.reviewFingerprint, SHA256_RE, 'v2_dependency_review_invalid'),
      objectPath: exactString(value.objectPath, OBJECT_PATH_RE, 'v2_dependency_object_invalid'),
      objectGeneration: exactString(value.objectGeneration, GENERATION_RE, 'v2_dependency_object_invalid'),
      lifecycleFingerprint: exactString(value.lifecycleFingerprint, SHA256_RE, 'v2_dependency_lifecycle_invalid'),
    });
  }
  if (dependencyType === 'published_template') {
    if (!exactKeys(value, ['dependencyType', 'templateId', 'version', 'contentHash', 'objectPath', 'objectGeneration', 'lifecycleFingerprint'])) throw new Error('v2_dependency_fields_invalid');
    return Object.freeze({
      dependencyType,
      templateId: exactString(value.templateId, TOKEN_RE, 'v2_dependency_template_invalid'),
      version: exactVersion(value.version),
      contentHash: exactString(value.contentHash, SHA256_RE, 'v2_dependency_hash_invalid'),
      objectPath: exactString(value.objectPath, OBJECT_PATH_RE, 'v2_dependency_object_invalid'),
      objectGeneration: exactString(value.objectGeneration, GENERATION_RE, 'v2_dependency_object_invalid'),
      lifecycleFingerprint: exactString(value.lifecycleFingerprint, SHA256_RE, 'v2_dependency_lifecycle_invalid'),
    });
  }
  if (dependencyType === 'language_profile') {
    if (!exactKeys(value, ['dependencyType', 'profileId', 'version', 'contentHash', 'objectPath', 'objectGeneration', 'lifecycleFingerprint'])) throw new Error('v2_dependency_fields_invalid');
    return Object.freeze({
      dependencyType,
      profileId: exactString(value.profileId, TOKEN_RE, 'v2_dependency_profile_invalid'),
      version: exactVersion(value.version),
      contentHash: exactString(value.contentHash, SHA256_RE, 'v2_dependency_hash_invalid'),
      objectPath: exactString(value.objectPath, OBJECT_PATH_RE, 'v2_dependency_object_invalid'),
      objectGeneration: exactString(value.objectGeneration, GENERATION_RE, 'v2_dependency_object_invalid'),
      lifecycleFingerprint: exactString(value.lifecycleFingerprint, SHA256_RE, 'v2_dependency_lifecycle_invalid'),
    });
  }
  throw new Error('v2_dependency_type_invalid');
}

export function parseV2ImmutableDependencySnapshot(raw: string): readonly V2ImmutableDependency[] {
  if (typeof raw !== 'string' || raw.length > MAX_DEPENDENCY_SNAPSHOT_BYTES) {
    throw new Error('v2_dependency_snapshot_too_large');
  }
  let byteLength: number;
  try { byteLength = utf8ByteLengthV1(raw); } catch { throw new Error('v2_dependency_snapshot_invalid'); }
  if (byteLength > MAX_DEPENDENCY_SNAPSHOT_BYTES) throw new Error('v2_dependency_snapshot_too_large');
  let decoded: unknown;
  try { decoded = JSON.parse(raw); } catch { throw new Error('v2_dependency_snapshot_invalid'); }
  if (!Array.isArray(decoded) || decoded.length < 1 || decoded.length > MAX_DEPENDENCIES) throw new Error('v2_dependency_snapshot_count_invalid');
  // Validate the shallow exact schema before canonicalization so deeply nested
  // hostile data cannot drive the recursive canonical codec.
  const parsed = decoded.map(parseDependency);
  const identities = parsed.map(dependencyIdentity);
  if (new Set(identities).size !== identities.length) throw new Error('v2_dependency_duplicate');
  let canonical: string;
  try { canonical = canonicalJsonV1(parsed); } catch { throw new Error('v2_dependency_snapshot_invalid'); }
  if (canonical !== raw) throw new Error('v2_dependency_snapshot_noncanonical');
  const snapshot = Object.freeze(parsed);
  dependencySnapshotHandles.add(snapshot);
  return snapshot;
}

export function v2DependencyFingerprint(dependencies: readonly V2ImmutableDependency[]): string {
  if (!dependencies || typeof dependencies !== 'object' || !dependencySnapshotHandles.has(dependencies as object)) {
    throw new Error('v2_dependency_snapshot_untrusted');
  }
  const sorted = [...dependencies].sort((left, right) => codePointCompare(dependencyIdentity(left), dependencyIdentity(right)));
  return hashCanonicalBody(Object.freeze({ schemaVersion: 'v2-dependency-fingerprint.v1', dependencies: sorted }));
}

function immutableObjectRef(value: unknown): ImmutableObjectRef {
  if (!isRecord(value) || !exactKeys(value, ['objectPath', 'contentHash', 'objectGeneration', 'byteSize'])) throw new Error('v2_stage_acceptance_object_invalid');
  const byteSize = value.byteSize;
  if (typeof byteSize !== 'number' || !Number.isSafeInteger(byteSize) || byteSize < 1 || byteSize > 512 * 1024 * 1024) throw new Error('v2_stage_acceptance_object_invalid');
  return Object.freeze({
    objectPath: exactString(value.objectPath, OBJECT_PATH_RE, 'v2_stage_acceptance_object_invalid'),
    contentHash: exactString(value.contentHash, SHA256_RE, 'v2_stage_acceptance_object_invalid'),
    objectGeneration: exactString(value.objectGeneration, GENERATION_RE, 'v2_stage_acceptance_object_invalid'),
    byteSize,
  });
}

function assertDependencyClosure(stage: V2CanonicalStageNode, dependencies: readonly V2ImmutableDependency[]): void {
  const actual = new Map(dependencies.map((dependency) => [dependencyIdentity(dependency), dependency]));
  const expectedStageIds = stage.dependsOn.map((stageId) => `stage:${stageId}`);
  const expectedExternal = stage.externalRequirements.map(externalRequirementIdentity);
  const expected = [...expectedStageIds, ...expectedExternal];
  if (actual.size !== expected.length || expected.some((identity) => !actual.has(identity))) {
    throw new Error('v2_stage_acceptance_dependency_closure_invalid');
  }
  for (const requirement of stage.externalRequirements) {
    const dependency = actual.get(externalRequirementIdentity(requirement));
    if (!dependency || dependency.dependencyType !== requirement.dependencyType
      || dependency.contentHash !== requirement.contentHash) {
      throw new Error('v2_stage_acceptance_dependency_closure_invalid');
    }
  }
}

function parseBlockedInput(raw: string): Record<string, unknown> {
  if (typeof raw !== 'string' || raw.length > MAX_BLOCKED_INPUT_BYTES) throw new Error('v2_stage_acceptance_input_invalid');
  let bytes: number;
  try { bytes = utf8ByteLengthV1(raw); } catch { throw new Error('v2_stage_acceptance_input_invalid'); }
  if (bytes > MAX_BLOCKED_INPUT_BYTES) throw new Error('v2_stage_acceptance_input_too_large');
  let decoded: unknown;
  try { decoded = JSON.parse(raw); } catch { throw new Error('v2_stage_acceptance_input_invalid'); }
  if (!isRecord(decoded) || !exactKeys(decoded, [
    'stageId', 'artifactRef', 'dependencySnapshotRaw', 'validatorVersion', 'blockingIssueCodes', 'evidenceReceiptRefs',
  ])) throw new Error('v2_stage_acceptance_input_invalid');
  // Nested values are validated shallowly below before canonicalization.
  if (!isRecord(decoded.artifactRef) || !Array.isArray(decoded.blockingIssueCodes)
    || !Array.isArray(decoded.evidenceReceiptRefs)) throw new Error('v2_stage_acceptance_input_invalid');
  if (typeof decoded.stageId !== 'string' || typeof decoded.dependencySnapshotRaw !== 'string'
    || typeof decoded.validatorVersion !== 'string') throw new Error('v2_stage_acceptance_input_invalid');
  if (decoded.blockingIssueCodes.length < 1 || decoded.blockingIssueCodes.length > MAX_ISSUES
    || decoded.blockingIssueCodes.some((issue) => typeof issue !== 'string' || !ISSUE_RE.test(issue))) {
    throw new Error('v2_stage_acceptance_issues_invalid');
  }
  if (decoded.evidenceReceiptRefs.length > MAX_RECEIPTS) throw new Error('v2_stage_acceptance_receipts_invalid');
  const artifactRef = immutableObjectRef(decoded.artifactRef);
  const receiptRefs = decoded.evidenceReceiptRefs.map(immutableObjectRef);
  const canonicalBody = {
    stageId: decoded.stageId,
    artifactRef,
    dependencySnapshotRaw: decoded.dependencySnapshotRaw,
    validatorVersion: decoded.validatorVersion,
    blockingIssueCodes: decoded.blockingIssueCodes,
    evidenceReceiptRefs: receiptRefs,
  };
  let canonical: string;
  try { canonical = canonicalJsonV1(canonicalBody); } catch { throw new Error('v2_stage_acceptance_input_invalid'); }
  if (canonical !== raw) throw new Error('v2_stage_acceptance_input_noncanonical');
  return canonicalBody;
}

/**
 * The pure packet can materialize only a blocked preflight receipt. The
 * human-review-eligible variant is reserved for the future 13 stage-specific
 * validators and cannot be self-asserted by a caller.
 */
export function buildBlockedV2StageAcceptance(
  plan: V2CanonicalSeasonPlanV1,
  inputRaw: string,
): V2StageAcceptanceV1 {
  if (!isV2CanonicalSeasonPlan(plan)) throw new Error('v2_stage_acceptance_plan_invalid');
  const detached = parseBlockedInput(inputRaw);
  const stageId = exactString(detached.stageId, STAGE_ID_RE, 'v2_stage_acceptance_stage_invalid');
  const stage = plan.stages.find((candidate) => candidate.stageId === stageId);
  if (!stage) throw new Error('v2_stage_acceptance_stage_invalid');
  const dependencySnapshotRaw = detached.dependencySnapshotRaw;
  if (typeof dependencySnapshotRaw !== 'string') throw new Error('v2_dependency_snapshot_invalid');
  const parsedDependencySnapshot = parseV2ImmutableDependencySnapshot(dependencySnapshotRaw);
  assertDependencyClosure(stage, parsedDependencySnapshot);
  const dependencyFingerprint = v2DependencyFingerprint(parsedDependencySnapshot);
  const dependencySnapshot = Object.freeze([...parsedDependencySnapshot]
    .sort((left, right) => codePointCompare(dependencyIdentity(left), dependencyIdentity(right))));
  const issues = detached.blockingIssueCodes;
  if (!Array.isArray(issues) || issues.length < 1 || issues.length > MAX_ISSUES
    || issues.some((issue) => typeof issue !== 'string' || !ISSUE_RE.test(issue))
    || new Set(issues).size !== issues.length) throw new Error('v2_stage_acceptance_issues_invalid');
  const receiptValues = detached.evidenceReceiptRefs;
  if (!Array.isArray(receiptValues) || receiptValues.length > MAX_RECEIPTS) throw new Error('v2_stage_acceptance_receipts_invalid');
  const evidenceReceiptRefs = Object.freeze(receiptValues.map(immutableObjectRef)
    .sort((left, right) => codePointCompare(
      canonicalJsonV1([left.objectPath, left.objectGeneration, left.contentHash]),
      canonicalJsonV1([right.objectPath, right.objectGeneration, right.contentHash]),
    )));
  const receiptIdentities = evidenceReceiptRefs.map((receipt) => canonicalJsonV1([
    receipt.objectPath, receipt.objectGeneration,
  ]));
  if (new Set(receiptIdentities).size !== receiptIdentities.length) throw new Error('v2_stage_acceptance_receipts_duplicate');
  const subjectBody = Object.freeze({
    workspaceId: stage.workspaceId,
    jobId: stage.jobId,
    seasonId: stage.seasonId,
    episodeId: stage.episodeId,
    locale: stage.locale,
    authoringRevision: stage.authoringRevision,
    planFingerprint: plan.planFingerprint,
    stageId: stage.stageId,
  });
  const acceptanceBody = Object.freeze({
    schemaVersion: 'v2-stage-acceptance.v1',
    compilerVersion: plan.compilerVersion,
    planFingerprint: plan.planFingerprint,
    stageId: stage.stageId,
    stageKind: stage.kind,
    subject: Object.freeze({
      workspaceId: stage.workspaceId,
      jobId: stage.jobId,
      seasonId: stage.seasonId,
      episodeId: stage.episodeId,
      locale: stage.locale,
      authoringRevision: stage.authoringRevision,
      subjectFingerprint: hashCanonicalBody(subjectBody),
    }),
    artifactRef: immutableObjectRef(detached.artifactRef),
    dependencySnapshot,
    dependencyFingerprint,
    validatorVersion: exactString(detached.validatorVersion, TOKEN_RE, 'v2_stage_acceptance_validator_invalid'),
    blockingIssueCodes: Object.freeze(([...issues] as string[]).sort(codePointCompare)),
    evidenceReceiptRefs,
    evidenceAuthority: 'structural_snapshot_only',
    stageDependencyEvidenceAuthority: 'unverified_structural_only',
    outcome: 'blocked',
    executionAuthority: 'none',
    publicationPolicy: 'draft_only_no_consumer',
    runtimeConsumer: false,
    releaseEligible: false,
    releaseAuthority: false,
  });
  return Object.freeze({ ...acceptanceBody, acceptanceFingerprint: hashCanonicalBody(acceptanceBody) });
}
