import {
  materializeLearningV2CourseBatchCursor,
  nextLearningV2CourseBatch,
  type LearningV2CourseBatchPlan,
  type LearningV2CourseBatchTask,
} from '../../../modules/learning-v2/content/generator_course_batch_plan';
import type {
  LearningV2GeneratedObjectRef,
  LearningV2GenerationWaveId,
} from '../../../modules/learning-v2/content/generator_course_manifest';
import { canonicalJsonV1, hashCanonicalBody } from '../../../modules/learning-v2/policies/decision_registry';

export type LearningV2LocalizedSessionShardReceipt = Readonly<{
  schemaVersion: 'learning-v2-localized-session-shard-receipt.v1';
  stageId: string;
  stageRevision: number;
  packageId: string;
  planFingerprint: string;
  taskId: string;
  taskOrdinal: number;
  episodeOrdinal: number;
  sessionOrdinal: number;
  waveId: LearningV2GenerationWaveId;
  generationInputFingerprint: string;
  object: LearningV2GeneratedObjectRef;
  receiptFingerprint: string;
}>;

export type LearningV2LocalizedWaveApproval = Readonly<{
  waveId: LearningV2GenerationWaveId;
  phase: 'localized_content';
  state: 'approved';
  completedTaskCount: number;
  completedAggregateFingerprint: string;
  waveFingerprint: string;
  reviewerId: 'owner';
  reviewedAtIso: string;
}>;

export type LearningV2LocalizedCourseShardCheckpoint = Readonly<{
  schemaVersion: 'learning-v2-localized-course-shard-checkpoint.v2';
  stageId: string;
  stageRevision: number;
  packageId: string;
  planFingerprint: string;
  checkpointRevision: number;
  nextTaskOrdinal: number;
  completedTaskCount: number;
  completedAggregateFingerprint: string;
  waveApprovals: readonly LearningV2LocalizedWaveApproval[];
  checkpointFingerprint: string;
}>;

export type LearningV2LocalizedCourseShardCheckpointExpected = Readonly<{
  stageId: string;
  stageRevision: number;
  plan: LearningV2CourseBatchPlan;
}>;

const HASH_RE = /^[a-f0-9]{64}$/;
const TOKEN_RE = /^[A-Za-z0-9._:-]{1,500}$/;
const GENERATION_RE = /^[A-Za-z0-9._:-]{1,160}$/;
const MAX_SHARD_BYTES = 512 * 1024;
const MAX_CHECKPOINT_BYTES = 16 * 1024;
const MAX_RECEIPT_BYTES = 8 * 1024;
const MAX_CHECKPOINT_REVISION = 10_000;
const TOTAL_LOCALIZED_TASKS = 32 * 12;
// Builder plans are deeply frozen. WeakSet avoids re-deriving all 384 tasks
// for every append while retaining no plan after its owning request is gone.
const validatedImmutablePlans = new WeakSet<object>();

const CHECKPOINT_KEYS = Object.freeze([
  'schemaVersion', 'stageId', 'stageRevision', 'packageId', 'planFingerprint',
  'checkpointRevision', 'nextTaskOrdinal', 'completedTaskCount',
  'completedAggregateFingerprint', 'waveApprovals', 'checkpointFingerprint',
] as const);
const RECEIPT_KEYS = Object.freeze([
  'schemaVersion', 'stageId', 'stageRevision', 'packageId', 'planFingerprint',
  'taskId', 'taskOrdinal', 'episodeOrdinal', 'sessionOrdinal', 'waveId',
  'generationInputFingerprint', 'object', 'receiptFingerprint',
] as const);
const OBJECT_KEYS = Object.freeze(['objectPath', 'contentHash', 'objectGeneration', 'byteSize'] as const);
const APPROVAL_KEYS = Object.freeze([
  'waveId', 'phase', 'state', 'completedTaskCount', 'completedAggregateFingerprint',
  'waveFingerprint', 'reviewerId', 'reviewedAtIso',
] as const);

function exactDataRecord(value: unknown, keys: readonly string[], code: string): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error(code);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw new Error(code);
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.length !== keys.length || ownKeys.some((key) => typeof key !== 'string' || !keys.includes(key))) throw new Error(code);
  const detached: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !('value' in descriptor)) throw new Error(code);
    detached[key] = descriptor.value;
  }
  return detached;
}

function exactDataArray(value: unknown, maxItems: number, code: string): readonly unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > maxItems) throw new Error(code);
  const keys = Reflect.ownKeys(value);
  const expected = new Set<string>(['length', ...Array.from({ length: value.length }, (_, index) => String(index))]);
  if (keys.some((key) => typeof key !== 'string' || !expected.has(key))) throw new Error(code);
  const result: unknown[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor?.enumerable || !('value' in descriptor)) throw new Error(code);
    result.push(descriptor.value);
  }
  return result;
}

function validIso(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function assertExpected(expected: LearningV2LocalizedCourseShardCheckpointExpected): void {
  if (!TOKEN_RE.test(expected.stageId) || !Number.isSafeInteger(expected.stageRevision) || expected.stageRevision < 1 ||
      expected.plan.phase !== 'localized_content' || expected.plan.tasks.length !== TOTAL_LOCALIZED_TASKS) {
    throw new Error('learning_v2_course_shard_checkpoint_identity_invalid');
  }
  const cacheable = Object.isFrozen(expected.plan) && Object.isFrozen(expected.plan.tasks) &&
    Object.isFrozen(expected.plan.generationAuthority) && expected.plan.tasks.every((task) => Object.isFrozen(task));
  if (!cacheable || !validatedImmutablePlans.has(expected.plan)) {
    // Re-derives every task coordinate and input fingerprint; a self-rehashed
    // forged plan is not accepted as generation authority.
    nextLearningV2CourseBatch({ plan: expected.plan, cursor: null, approvedWaves: [], maxItems: 1 });
    if (cacheable) validatedImmutablePlans.add(expected.plan);
  }
}

function exactTask(input: LearningV2CourseBatchTask, expected: LearningV2LocalizedCourseShardCheckpointExpected): LearningV2CourseBatchTask {
  const planned = expected.plan.tasks[input.taskOrdinal - 1];
  if (!planned || hashCanonicalBody(input) !== hashCanonicalBody(planned) || planned.sessionOrdinal === null || planned.locale !== null) {
    throw new Error('learning_v2_course_shard_task_not_from_plan');
  }
  return planned;
}

export function learningV2LocalizedSessionShardObjectPath(packageId: string, task: LearningV2CourseBatchTask): string {
  return `learning-v2/course-packages/${packageId}/episodes/${String(task.episodeOrdinal).padStart(2, '0')}/sessions/${String(task.sessionOrdinal).padStart(2, '0')}.json`;
}

function detachObjectRef(value: unknown, expectedPath: string): LearningV2GeneratedObjectRef {
  const input = exactDataRecord(value, OBJECT_KEYS, 'learning_v2_course_shard_object_invalid');
  if (input.objectPath !== expectedPath || typeof input.contentHash !== 'string' || !HASH_RE.test(input.contentHash) ||
      typeof input.objectGeneration !== 'string' || !GENERATION_RE.test(input.objectGeneration) ||
      !Number.isSafeInteger(input.byteSize) || Number(input.byteSize) < 1 || Number(input.byteSize) > MAX_SHARD_BYTES) {
    throw new Error('learning_v2_course_shard_object_invalid');
  }
  return Object.freeze({
    objectPath: input.objectPath,
    contentHash: input.contentHash,
    objectGeneration: input.objectGeneration,
    byteSize: Number(input.byteSize),
  });
}

function receiptBody(
  expected: LearningV2LocalizedCourseShardCheckpointExpected,
  task: LearningV2CourseBatchTask,
  object: LearningV2GeneratedObjectRef,
) {
  return Object.freeze({
    schemaVersion: 'learning-v2-localized-session-shard-receipt.v1' as const,
    stageId: expected.stageId,
    stageRevision: expected.stageRevision,
    packageId: expected.plan.packageId,
    planFingerprint: expected.plan.planFingerprint,
    taskId: task.taskId,
    taskOrdinal: task.taskOrdinal,
    episodeOrdinal: task.episodeOrdinal,
    sessionOrdinal: task.sessionOrdinal as number,
    waveId: task.waveId,
    generationInputFingerprint: task.generationInputFingerprint,
    object,
  });
}

export function materializeLearningV2LocalizedSessionShardReceipt(input: Readonly<{
  expected: LearningV2LocalizedCourseShardCheckpointExpected;
  task: LearningV2CourseBatchTask;
  object: unknown;
}>): LearningV2LocalizedSessionShardReceipt {
  assertExpected(input.expected);
  const task = exactTask(input.task, input.expected);
  const object = detachObjectRef(input.object, learningV2LocalizedSessionShardObjectPath(input.expected.plan.packageId, task));
  const body = receiptBody(input.expected, task, object);
  const receipt = Object.freeze({ ...body, receiptFingerprint: hashCanonicalBody(body) });
  const encoded = canonicalJsonV1(receipt);
  if (encoded.length > MAX_RECEIPT_BYTES || Buffer.byteLength(encoded, 'utf8') > MAX_RECEIPT_BYTES) {
    throw new Error('learning_v2_course_shard_receipt_size_invalid');
  }
  return receipt;
}

export function parseLearningV2LocalizedSessionShardReceipt(
  value: unknown,
  expected: LearningV2LocalizedCourseShardCheckpointExpected,
): LearningV2LocalizedSessionShardReceipt {
  assertExpected(expected);
  const input = exactDataRecord(value, RECEIPT_KEYS, 'learning_v2_course_shard_receipt_invalid');
  if (!Number.isSafeInteger(input.taskOrdinal) || Number(input.taskOrdinal) < 1 || Number(input.taskOrdinal) > expected.plan.tasks.length) {
    throw new Error('learning_v2_course_shard_receipt_identity_mismatch');
  }
  const task = expected.plan.tasks[Number(input.taskOrdinal) - 1];
  const candidateTask = Object.freeze({
    taskId: input.taskId,
    taskOrdinal: input.taskOrdinal,
    phase: 'localized_content' as const,
    waveId: input.waveId,
    episodeOrdinal: input.episodeOrdinal,
    sessionOrdinal: input.sessionOrdinal,
    locale: null,
    generationInputFingerprint: input.generationInputFingerprint,
  }) as LearningV2CourseBatchTask;
  exactTask(candidateTask, expected);
  if (input.schemaVersion !== 'learning-v2-localized-session-shard-receipt.v1' || input.stageId !== expected.stageId ||
      input.stageRevision !== expected.stageRevision || input.packageId !== expected.plan.packageId ||
      input.planFingerprint !== expected.plan.planFingerprint) {
    throw new Error('learning_v2_course_shard_receipt_identity_mismatch');
  }
  const recreated = materializeLearningV2LocalizedSessionShardReceipt({ expected, task, object: input.object });
  if (input.receiptFingerprint !== recreated.receiptFingerprint) throw new Error('learning_v2_course_shard_receipt_fingerprint_mismatch');
  return recreated;
}

function emptyAggregateFingerprint(expected: LearningV2LocalizedCourseShardCheckpointExpected): string {
  return hashCanonicalBody(Object.freeze({
    schemaVersion: 'learning-v2-localized-course-aggregate-seed.v1',
    stageId: expected.stageId,
    stageRevision: expected.stageRevision,
    packageId: expected.plan.packageId,
    planFingerprint: expected.plan.planFingerprint,
  }));
}

function foldReceipt(previous: string, receipt: LearningV2LocalizedSessionShardReceipt): string {
  if (!HASH_RE.test(previous)) throw new Error('learning_v2_course_shard_aggregate_invalid');
  return hashCanonicalBody(Object.freeze({
    schemaVersion: 'learning-v2-localized-course-aggregate-step.v1',
    previousAggregateFingerprint: previous,
    taskOrdinal: receipt.taskOrdinal,
    taskId: receipt.taskId,
    receiptFingerprint: receipt.receiptFingerprint,
  }));
}

function waveEndTaskCount(waveId: LearningV2GenerationWaveId): number {
  if (waveId === 'e1') return 1 * 12;
  if (waveId === 'chapter_1') return 8 * 12;
  return TOTAL_LOCALIZED_TASKS;
}

function requiredPriorWave(waveId: LearningV2GenerationWaveId): LearningV2GenerationWaveId | null {
  if (waveId === 'chapter_1') return 'e1';
  if (waveId === 'season') return 'chapter_1';
  return null;
}

function waveFingerprint(input: Readonly<{
  packageId: string;
  planFingerprint: string;
  waveId: LearningV2GenerationWaveId;
  completedTaskCount: number;
  completedAggregateFingerprint: string;
}>): string {
  return hashCanonicalBody(Object.freeze({
    schemaVersion: 'learning-v2-localized-course-wave.v1',
    phase: 'localized_content',
    ...input,
  }));
}

function buildCheckpoint(input: Readonly<{
  expected: LearningV2LocalizedCourseShardCheckpointExpected;
  checkpointRevision: number;
  completedTaskCount: number;
  completedAggregateFingerprint: string;
  waveApprovals: readonly LearningV2LocalizedWaveApproval[];
}>): LearningV2LocalizedCourseShardCheckpoint {
  if (!Number.isSafeInteger(input.checkpointRevision) || input.checkpointRevision < 1 || input.checkpointRevision > MAX_CHECKPOINT_REVISION ||
      !Number.isSafeInteger(input.completedTaskCount) || input.completedTaskCount < 0 || input.completedTaskCount > TOTAL_LOCALIZED_TASKS ||
      !HASH_RE.test(input.completedAggregateFingerprint)) {
    throw new Error('learning_v2_course_shard_checkpoint_state_invalid');
  }
  const body = Object.freeze({
    schemaVersion: 'learning-v2-localized-course-shard-checkpoint.v2' as const,
    stageId: input.expected.stageId,
    stageRevision: input.expected.stageRevision,
    packageId: input.expected.plan.packageId,
    planFingerprint: input.expected.plan.planFingerprint,
    checkpointRevision: input.checkpointRevision,
    nextTaskOrdinal: input.completedTaskCount + 1,
    completedTaskCount: input.completedTaskCount,
    completedAggregateFingerprint: input.completedAggregateFingerprint,
    waveApprovals: Object.freeze([...input.waveApprovals]),
  });
  const checkpoint = Object.freeze({ ...body, checkpointFingerprint: hashCanonicalBody(body) });
  const encoded = canonicalJsonV1(checkpoint);
  if (encoded.length > MAX_CHECKPOINT_BYTES || Buffer.byteLength(encoded, 'utf8') > MAX_CHECKPOINT_BYTES) {
    throw new Error('learning_v2_course_shard_checkpoint_size_invalid');
  }
  return checkpoint;
}

export function createLearningV2LocalizedCourseShardCheckpoint(
  expected: LearningV2LocalizedCourseShardCheckpointExpected,
): LearningV2LocalizedCourseShardCheckpoint {
  assertExpected(expected);
  return buildCheckpoint({
    expected,
    checkpointRevision: 1,
    completedTaskCount: 0,
    completedAggregateFingerprint: emptyAggregateFingerprint(expected),
    waveApprovals: [],
  });
}

function detachApproval(
  value: unknown,
  index: number,
  expected: LearningV2LocalizedCourseShardCheckpointExpected,
): LearningV2LocalizedWaveApproval {
  const input = exactDataRecord(value, APPROVAL_KEYS, 'learning_v2_course_shard_wave_approval_invalid');
  const waveId = (['e1', 'chapter_1', 'season'] as const)[index];
  if (!waveId || input.waveId !== waveId || input.phase !== 'localized_content' || input.state !== 'approved' ||
      input.completedTaskCount !== waveEndTaskCount(waveId) || typeof input.completedAggregateFingerprint !== 'string' ||
      !HASH_RE.test(input.completedAggregateFingerprint) || input.reviewerId !== 'owner' || !validIso(input.reviewedAtIso)) {
    throw new Error('learning_v2_course_shard_wave_approval_invalid');
  }
  const expectedFingerprint = waveFingerprint({
    packageId: expected.plan.packageId,
    planFingerprint: expected.plan.planFingerprint,
    waveId,
    completedTaskCount: Number(input.completedTaskCount),
    completedAggregateFingerprint: input.completedAggregateFingerprint,
  });
  if (input.waveFingerprint !== expectedFingerprint) throw new Error('learning_v2_course_shard_wave_approval_invalid');
  return Object.freeze({
    waveId,
    phase: 'localized_content',
    state: 'approved',
    completedTaskCount: Number(input.completedTaskCount),
    completedAggregateFingerprint: input.completedAggregateFingerprint,
    waveFingerprint: expectedFingerprint,
    reviewerId: 'owner',
    reviewedAtIso: input.reviewedAtIso,
  });
}

export function parseLearningV2LocalizedCourseShardCheckpoint(
  value: unknown,
  expected: LearningV2LocalizedCourseShardCheckpointExpected,
): LearningV2LocalizedCourseShardCheckpoint {
  assertExpected(expected);
  const input = exactDataRecord(value, CHECKPOINT_KEYS, 'learning_v2_course_shard_checkpoint_invalid');
  if (input.schemaVersion !== 'learning-v2-localized-course-shard-checkpoint.v2' || input.stageId !== expected.stageId ||
      input.stageRevision !== expected.stageRevision || input.packageId !== expected.plan.packageId ||
      input.planFingerprint !== expected.plan.planFingerprint || !Number.isSafeInteger(input.checkpointRevision) ||
      !Number.isSafeInteger(input.completedTaskCount) || input.nextTaskOrdinal !== Number(input.completedTaskCount) + 1 ||
      typeof input.completedAggregateFingerprint !== 'string') {
    throw new Error('learning_v2_course_shard_checkpoint_identity_mismatch');
  }
  const rawApprovals = exactDataArray(input.waveApprovals, 3, 'learning_v2_course_shard_wave_approval_invalid');
  const approvals = rawApprovals.map((approval, index) => detachApproval(approval, index, expected));
  for (const approval of approvals) {
    if (Number(input.completedTaskCount) < approval.completedTaskCount) throw new Error('learning_v2_course_shard_wave_approval_premature');
  }
  const recreated = buildCheckpoint({
    expected,
    checkpointRevision: Number(input.checkpointRevision),
    completedTaskCount: Number(input.completedTaskCount),
    completedAggregateFingerprint: input.completedAggregateFingerprint,
    waveApprovals: approvals,
  });
  if (input.checkpointFingerprint !== recreated.checkpointFingerprint) throw new Error('learning_v2_course_shard_checkpoint_fingerprint_mismatch');
  return recreated;
}

export function appendLearningV2LocalizedSessionShardReceipt(input: Readonly<{
  checkpoint: unknown;
  expected: LearningV2LocalizedCourseShardCheckpointExpected;
  receipt: unknown;
}>): LearningV2LocalizedCourseShardCheckpoint {
  const checkpoint = parseLearningV2LocalizedCourseShardCheckpoint(input.checkpoint, input.expected);
  const receipt = parseLearningV2LocalizedSessionShardReceipt(input.receipt, input.expected);
  if (receipt.taskOrdinal !== checkpoint.nextTaskOrdinal) throw new Error('learning_v2_course_shard_out_of_order');
  const prerequisite = requiredPriorWave(receipt.waveId);
  if (prerequisite && !checkpoint.waveApprovals.some((approval) => approval.waveId === prerequisite)) {
    throw new Error('learning_v2_course_shard_wave_prerequisite_missing');
  }
  return buildCheckpoint({
    expected: input.expected,
    checkpointRevision: checkpoint.checkpointRevision + 1,
    completedTaskCount: checkpoint.completedTaskCount + 1,
    completedAggregateFingerprint: foldReceipt(checkpoint.completedAggregateFingerprint, receipt),
    waveApprovals: checkpoint.waveApprovals,
  });
}

export function approveLearningV2LocalizedCourseWave(input: Readonly<{
  checkpoint: unknown;
  expected: LearningV2LocalizedCourseShardCheckpointExpected;
  waveId: LearningV2GenerationWaveId;
  reviewerId: 'owner';
  reviewedAtIso: string;
}>): LearningV2LocalizedCourseShardCheckpoint {
  const checkpoint = parseLearningV2LocalizedCourseShardCheckpoint(input.checkpoint, input.expected);
  const waveIndex = (['e1', 'chapter_1', 'season'] as const).indexOf(input.waveId);
  if (waveIndex < 0 || input.reviewerId !== 'owner' || !validIso(input.reviewedAtIso)) throw new Error('learning_v2_course_shard_wave_approval_invalid');
  if (checkpoint.completedTaskCount !== waveEndTaskCount(input.waveId)) throw new Error('learning_v2_course_shard_wave_boundary_invalid');
  const prerequisite = requiredPriorWave(input.waveId);
  if (prerequisite && !checkpoint.waveApprovals.some((approval) => approval.waveId === prerequisite)) {
    throw new Error('learning_v2_course_shard_wave_prerequisite_missing');
  }
  const existing = checkpoint.waveApprovals[waveIndex];
  if (existing) return checkpoint;
  if (checkpoint.waveApprovals.length !== waveIndex) throw new Error('learning_v2_course_shard_wave_approval_order_invalid');
  const waveBody = {
    packageId: checkpoint.packageId,
    planFingerprint: checkpoint.planFingerprint,
    waveId: input.waveId,
    completedTaskCount: checkpoint.completedTaskCount,
    completedAggregateFingerprint: checkpoint.completedAggregateFingerprint,
  };
  const approval = Object.freeze({
    waveId: input.waveId,
    phase: 'localized_content' as const,
    state: 'approved' as const,
    completedTaskCount: checkpoint.completedTaskCount,
    completedAggregateFingerprint: checkpoint.completedAggregateFingerprint,
    waveFingerprint: waveFingerprint(waveBody),
    reviewerId: 'owner' as const,
    reviewedAtIso: input.reviewedAtIso,
  });
  return buildCheckpoint({
    expected: input.expected,
    checkpointRevision: checkpoint.checkpointRevision + 1,
    completedTaskCount: checkpoint.completedTaskCount,
    completedAggregateFingerprint: checkpoint.completedAggregateFingerprint,
    waveApprovals: Object.freeze([...checkpoint.waveApprovals, approval]),
  });
}

export function auditLearningV2LocalizedCourseShardReceipts(input: Readonly<{
  checkpoint: unknown;
  expected: LearningV2LocalizedCourseShardCheckpointExpected;
  receipts: readonly unknown[];
}>): LearningV2LocalizedCourseShardCheckpoint {
  const checkpoint = parseLearningV2LocalizedCourseShardCheckpoint(input.checkpoint, input.expected);
  if (!Array.isArray(input.receipts) || input.receipts.length !== checkpoint.completedTaskCount) throw new Error('learning_v2_course_shard_receipt_audit_incomplete');
  let aggregate = emptyAggregateFingerprint(input.expected);
  for (let index = 0; index < input.receipts.length; index += 1) {
    const receipt = parseLearningV2LocalizedSessionShardReceipt(input.receipts[index], input.expected);
    if (receipt.taskOrdinal !== index + 1) throw new Error('learning_v2_course_shard_receipt_audit_order_invalid');
    aggregate = foldReceipt(aggregate, receipt);
    const boundaryApproval = checkpoint.waveApprovals.find((approval) => approval.completedTaskCount === index + 1);
    if (boundaryApproval && boundaryApproval.completedAggregateFingerprint !== aggregate) throw new Error('learning_v2_course_shard_receipt_audit_wave_mismatch');
  }
  if (aggregate !== checkpoint.completedAggregateFingerprint) throw new Error('learning_v2_course_shard_receipt_audit_aggregate_mismatch');
  return checkpoint;
}

export function nextLearningV2LocalizedCourseShardDecision(input: Readonly<{
  checkpoint: unknown;
  expected: LearningV2LocalizedCourseShardCheckpointExpected;
  maxItems?: number;
}>) {
  const checkpoint = parseLearningV2LocalizedCourseShardCheckpoint(input.checkpoint, input.expected);
  return nextLearningV2CourseBatch({
    plan: input.expected.plan,
    cursor: materializeLearningV2CourseBatchCursor(input.expected.plan, checkpoint.nextTaskOrdinal),
    approvedWaves: checkpoint.waveApprovals.map((approval) => approval.waveId),
    maxItems: input.maxItems,
  });
}
