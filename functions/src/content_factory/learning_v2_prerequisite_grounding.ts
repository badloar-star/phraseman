import { createHash } from 'node:crypto';
import {
  LEARNING_V2_GENERATION_STAGE_KINDS,
  validateLearningV2GenerationArtifact,
  type LearningV2GenerationStageKind,
} from './learning_v2_generation_artifacts';

const HASH_RE = /^[a-f0-9]{64}$/;
const MAX_ARTIFACT_BYTES = 2 * 1024 * 1024;

export interface LearningV2GroundingFileLike {
  getMetadata(): Promise<unknown>;
  download(options?: Record<string, unknown>): Promise<[Buffer]>;
}

export interface LearningV2GroundingBucketLike {
  file(path: string): LearningV2GroundingFileLike;
}

export interface LearningV2ApprovedPrerequisiteMetadata {
  readonly stageId: string;
  readonly artifactId: string;
  readonly kind: string;
  readonly state: string;
  readonly requestId: string;
  readonly studyTarget: string;
  readonly sourceLocale: string;
  readonly scopeId: string;
  readonly objectPath: string;
  readonly contentHash: string;
  readonly objectGeneration: string;
  readonly ownerApprovalTrail?: unknown;
}

export interface LearningV2OwnerApprovalReceipt {
  readonly stageKind: LearningV2GenerationStageKind;
  readonly stageId: string;
  readonly artifactId: string;
  readonly contentHash: string;
  readonly reviewerUid: string;
  readonly reason: string;
}

function approvalReceipt(value: unknown, expectedKind: LearningV2GenerationStageKind): LearningV2OwnerApprovalReceipt {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('learning_v2_owner_approval_invalid');
  const item = value as Record<string, unknown>;
  const expectedKeys = ['stageKind', 'stageId', 'artifactId', 'contentHash', 'reviewerUid', 'reason'];
  const keys = Object.keys(item);
  if (keys.length !== expectedKeys.length || expectedKeys.some((key) => !keys.includes(key)) || item.stageKind !== expectedKind || typeof item.stageId !== 'string' || !item.stageId || typeof item.artifactId !== 'string' || !item.artifactId || typeof item.contentHash !== 'string' || !HASH_RE.test(item.contentHash) || typeof item.reviewerUid !== 'string' || !item.reviewerUid || typeof item.reason !== 'string' || item.reason.trim().length < 5 || item.reason.length > 500) throw new Error('learning_v2_owner_approval_invalid');
  return Object.freeze({ stageKind: expectedKind, stageId: item.stageId, artifactId: item.artifactId, contentHash: item.contentHash, reviewerUid: item.reviewerUid, reason: item.reason.trim() });
}

export function buildLearningV2OwnerApprovalTrail(
  consumerKind: LearningV2GenerationStageKind,
  prerequisite: (LearningV2ApprovedPrerequisiteMetadata & Readonly<{ reviewedBy?: unknown; reviewReason?: unknown }>) | null,
): readonly LearningV2OwnerApprovalReceipt[] {
  const expectedKind = expectedLearningV2PrerequisiteKind(consumerKind);
  if (!expectedKind) {
    if (prerequisite) throw new Error('learning_v2_owner_approval_unexpected');
    return Object.freeze([]);
  }
  if (!prerequisite || prerequisite.kind !== expectedKind || prerequisite.state !== 'approved') throw new Error('learning_v2_owner_approval_prerequisite_invalid');
  const expectedPriorKinds = LEARNING_V2_GENERATION_STAGE_KINDS.slice(0, LEARNING_V2_GENERATION_STAGE_KINDS.indexOf(expectedKind));
  if (!Array.isArray(prerequisite.ownerApprovalTrail) || prerequisite.ownerApprovalTrail.length !== expectedPriorKinds.length) throw new Error('learning_v2_owner_approval_trail_invalid');
  const prior = prerequisite.ownerApprovalTrail.map((value, index) => approvalReceipt(value, expectedPriorKinds[index]));
  const immediate = approvalReceipt({ stageKind: expectedKind, stageId: prerequisite.stageId, artifactId: prerequisite.artifactId, contentHash: prerequisite.contentHash, reviewerUid: prerequisite.reviewedBy, reason: prerequisite.reviewReason }, expectedKind);
  if (new Set([...prior.map((item) => item.stageId), immediate.stageId]).size !== prior.length + 1) throw new Error('learning_v2_owner_approval_duplicate');
  return Object.freeze([...prior, immediate]);
}

function metadataRecord(value: unknown): Record<string, unknown> {
  const metadata = Array.isArray(value) ? value[0] : value;
  if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) throw new Error('learning_v2_grounding_metadata_invalid');
  return metadata as Record<string, unknown>;
}

function artifactRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('learning_v2_grounding_artifact_invalid');
  return value as Record<string, unknown>;
}

export function expectedLearningV2PrerequisiteKind(kind: LearningV2GenerationStageKind): LearningV2GenerationStageKind | null {
  const index = LEARNING_V2_GENERATION_STAGE_KINDS.indexOf(kind);
  if (index < 0) throw new Error('learning_v2_grounding_kind_invalid');
  return index === 0 ? null : LEARNING_V2_GENERATION_STAGE_KINDS[index - 1];
}

export async function loadApprovedLearningV2Prerequisite(
  bucket: LearningV2GroundingBucketLike,
  prerequisite: LearningV2ApprovedPrerequisiteMetadata,
  consumer: Readonly<{
    kind: LearningV2GenerationStageKind;
    requestId: string;
    studyTarget: string;
    sourceLocale: string;
    scopeId: string;
    ownerApprovalTrail: unknown;
  }>,
): Promise<Readonly<Record<string, unknown>>> {
  const expectedKind = expectedLearningV2PrerequisiteKind(consumer.kind);
  if (!expectedKind) throw new Error('learning_v2_grounding_not_required');
  if (prerequisite.kind !== expectedKind || prerequisite.state !== 'approved') throw new Error('learning_v2_grounding_not_approved');
  if (prerequisite.requestId !== consumer.requestId || prerequisite.studyTarget !== consumer.studyTarget || prerequisite.sourceLocale !== consumer.sourceLocale || prerequisite.scopeId !== consumer.scopeId) throw new Error('learning_v2_grounding_identity_mismatch');
  if (!prerequisite.stageId || !prerequisite.artifactId || !prerequisite.objectPath || !HASH_RE.test(prerequisite.contentHash) || !prerequisite.objectGeneration) throw new Error('learning_v2_grounding_receipt_invalid');

  const file = bucket.file(prerequisite.objectPath);
  const metadata = metadataRecord(await file.getMetadata());
  if (String(metadata.generation ?? '') !== prerequisite.objectGeneration) throw new Error('learning_v2_grounding_generation_mismatch');
  const byteSize = Number(metadata.size);
  if (!Number.isSafeInteger(byteSize) || byteSize < 2 || byteSize > MAX_ARTIFACT_BYTES) throw new Error('learning_v2_grounding_size_invalid');
  const [bytes] = await file.download({ validation: false });
  if (!Buffer.isBuffer(bytes) || bytes.byteLength !== byteSize || bytes.byteLength > MAX_ARTIFACT_BYTES) throw new Error('learning_v2_grounding_size_mismatch');
  if (createHash('sha256').update(bytes).digest('hex') !== prerequisite.contentHash) throw new Error('learning_v2_grounding_hash_mismatch');
  let decoded: unknown;
  try { decoded = JSON.parse(bytes.toString('utf8')) as unknown; } catch { throw new Error('learning_v2_grounding_json_invalid'); }
  const artifact = artifactRecord(decoded);
  const errors = validateLearningV2GenerationArtifact(artifact, { kind: expectedKind, targetLanguage: consumer.studyTarget });
  if (errors.length) throw new Error(`learning_v2_grounding_schema_invalid:${errors.join(',')}`);
  const expectedApprovalKinds = LEARNING_V2_GENERATION_STAGE_KINDS.slice(0, LEARNING_V2_GENERATION_STAGE_KINDS.indexOf(consumer.kind));
  if (!Array.isArray(consumer.ownerApprovalTrail) || consumer.ownerApprovalTrail.length !== expectedApprovalKinds.length) throw new Error('learning_v2_owner_approval_trail_invalid');
  const ownerApprovalTrail = Object.freeze(consumer.ownerApprovalTrail.map((value, index) => approvalReceipt(value, expectedApprovalKinds[index])));
  if (ownerApprovalTrail.at(-1)?.stageId !== prerequisite.stageId || ownerApprovalTrail.at(-1)?.contentHash !== prerequisite.contentHash) throw new Error('learning_v2_owner_approval_trail_mismatch');
  return Object.freeze({
    approvedStageId: prerequisite.stageId,
    approvedArtifactId: prerequisite.artifactId,
    approvedKind: expectedKind,
    approvedContentHash: prerequisite.contentHash,
    artifact,
    ownerApprovalTrail,
  });
}
