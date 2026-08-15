import { createHash } from 'node:crypto';
import {
  appendLearningV2LocalizedSessionShardReceipt,
  parseLearningV2LocalizedCourseShardCheckpoint,
  parseLearningV2LocalizedSessionShardReceipt,
  type LearningV2LocalizedCourseShardCheckpoint,
  type LearningV2LocalizedCourseShardCheckpointExpected,
  type LearningV2LocalizedSessionShardReceipt,
} from './learning_v2_course_shard_checkpoint';

export type LearningV2CourseShardReceiptAppendDecision =
  | Readonly<{
      kind: 'create_receipt_and_advance';
      checkpoint: LearningV2LocalizedCourseShardCheckpoint;
      receipt: LearningV2LocalizedSessionShardReceipt;
    }>
  | Readonly<{
      kind: 'repair_checkpoint_from_receipt';
      checkpoint: LearningV2LocalizedCourseShardCheckpoint;
      receipt: LearningV2LocalizedSessionShardReceipt;
    }>
  | Readonly<{
      kind: 'exact_replay';
      checkpoint: LearningV2LocalizedCourseShardCheckpoint;
      receipt: LearningV2LocalizedSessionShardReceipt;
    }>;

export function learningV2LocalizedSessionShardReceiptDocumentId(stageId: string, taskOrdinal: number): string {
  if (!/^[A-Za-z0-9._:-]{1,500}$/.test(stageId) || !Number.isSafeInteger(taskOrdinal) || taskOrdinal < 1 || taskOrdinal > 384) {
    throw new Error('learning_v2_course_shard_receipt_document_id_invalid');
  }
  const stageHash = createHash('sha256').update(stageId).digest('hex');
  return `${stageHash}-${String(taskOrdinal).padStart(4, '0')}`;
}

/**
 * Pure transaction decision. The caller must read the stage checkpoint and
 * deterministic receipt document in the same Firestore transaction, apply
 * exactly this decision, and keep its existing stage-lease CAS.
 *
 * - missing receipt + current ordinal: create receipt and advance atomically;
 * - durable receipt + old checkpoint: repair the crash cut without generation;
 * - durable receipt + advanced checkpoint: exact idempotent replay;
 * - every disagreement fails closed.
 */
export function decideLearningV2CourseShardReceiptAppend(input: Readonly<{
  expected: LearningV2LocalizedCourseShardCheckpointExpected;
  currentCheckpoint: unknown;
  storedReceipt: unknown | null;
  incomingReceipt: unknown;
}>): LearningV2CourseShardReceiptAppendDecision {
  const checkpoint = parseLearningV2LocalizedCourseShardCheckpoint(input.currentCheckpoint, input.expected);
  const incoming = parseLearningV2LocalizedSessionShardReceipt(input.incomingReceipt, input.expected);
  const stored = input.storedReceipt === null ? null : parseLearningV2LocalizedSessionShardReceipt(input.storedReceipt, input.expected);

  if (!stored) {
    if (incoming.taskOrdinal < checkpoint.nextTaskOrdinal) throw new Error('learning_v2_course_shard_receipt_missing_after_advance');
    const advanced = appendLearningV2LocalizedSessionShardReceipt({ checkpoint, expected: input.expected, receipt: incoming });
    return Object.freeze({ kind: 'create_receipt_and_advance' as const, checkpoint: advanced, receipt: incoming });
  }
  if (stored.taskOrdinal !== incoming.taskOrdinal || stored.receiptFingerprint !== incoming.receiptFingerprint) {
    throw new Error('learning_v2_course_shard_receipt_immutable_conflict');
  }
  if (checkpoint.nextTaskOrdinal === stored.taskOrdinal) {
    const repaired = appendLearningV2LocalizedSessionShardReceipt({ checkpoint, expected: input.expected, receipt: stored });
    return Object.freeze({ kind: 'repair_checkpoint_from_receipt' as const, checkpoint: repaired, receipt: stored });
  }
  if (checkpoint.nextTaskOrdinal > stored.taskOrdinal) {
    return Object.freeze({ kind: 'exact_replay' as const, checkpoint, receipt: stored });
  }
  throw new Error('learning_v2_course_shard_checkpoint_behind_receipt_gap');
}
