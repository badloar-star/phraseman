import { buildLearningV2LocalizedContentBatchPlan } from '../../../modules/learning-v2/content/generator_course_batch_plan';
import { hashCanonicalBody } from '../../../modules/learning-v2/policies/decision_registry';
import {
  createLearningV2LocalizedCourseShardCheckpoint,
  materializeLearningV2LocalizedSessionShardReceipt,
} from './learning_v2_course_shard_checkpoint';
import {
  decideLearningV2CourseShardReceiptAppend,
  learningV2LocalizedSessionShardReceiptDocumentId,
} from './learning_v2_course_shard_repository';

const plan = buildLearningV2LocalizedContentBatchPlan({
  packageId: 'learning-v2-en-v1',
  approvedOutlineFingerprint: 'a'.repeat(64),
  promptVersion: 'learning-v2-localized-session-v1',
});
const expected = Object.freeze({ stageId: 'request-1:learning_v2_localized_course:course:r1', stageRevision: 1, plan });

function receipt(ordinal: number, seed = `task-${ordinal}`) {
  const task = plan.tasks[ordinal - 1];
  return materializeLearningV2LocalizedSessionShardReceipt({
    expected,
    task,
    object: {
      objectPath: `learning-v2/course-packages/${plan.packageId}/episodes/${String(task.episodeOrdinal).padStart(2, '0')}/sessions/${String(task.sessionOrdinal).padStart(2, '0')}.json`,
      contentHash: hashCanonicalBody({ seed }),
      objectGeneration: `g-${ordinal}`,
      byteSize: 2_000,
    },
  });
}

describe('Learning V2 course shard transaction decision', () => {
  test('creates the deterministic receipt and advances the checkpoint together', () => {
    const checkpoint = createLearningV2LocalizedCourseShardCheckpoint(expected);
    const decision = decideLearningV2CourseShardReceiptAppend({ expected, currentCheckpoint: checkpoint, storedReceipt: null, incomingReceipt: receipt(1) });
    expect(decision).toMatchObject({ kind: 'create_receipt_and_advance', checkpoint: { nextTaskOrdinal: 2, completedTaskCount: 1 } });
    expect(learningV2LocalizedSessionShardReceiptDocumentId(expected.stageId, 1)).toMatch(/^[a-f0-9]{64}-0001$/);
  });

  test('repairs the exact crash cut where the receipt exists but cursor did not advance', () => {
    const checkpoint = createLearningV2LocalizedCourseShardCheckpoint(expected);
    const durableReceipt = receipt(1);
    const decision = decideLearningV2CourseShardReceiptAppend({ expected, currentCheckpoint: checkpoint, storedReceipt: durableReceipt, incomingReceipt: durableReceipt });
    expect(decision).toMatchObject({ kind: 'repair_checkpoint_from_receipt', checkpoint: { nextTaskOrdinal: 2, completedTaskCount: 1 } });
  });

  test('returns exact replay after both receipt and checkpoint were committed', () => {
    const first = receipt(1);
    const created = decideLearningV2CourseShardReceiptAppend({ expected, currentCheckpoint: createLearningV2LocalizedCourseShardCheckpoint(expected), storedReceipt: null, incomingReceipt: first });
    const replay = decideLearningV2CourseShardReceiptAppend({ expected, currentCheckpoint: created.checkpoint, storedReceipt: first, incomingReceipt: first });
    expect(replay).toMatchObject({ kind: 'exact_replay', checkpoint: { checkpointFingerprint: created.checkpoint.checkpointFingerprint } });
  });

  test('fails closed on missing receipt after advance, conflicting bytes and receipt gaps', () => {
    const first = receipt(1);
    const created = decideLearningV2CourseShardReceiptAppend({ expected, currentCheckpoint: createLearningV2LocalizedCourseShardCheckpoint(expected), storedReceipt: null, incomingReceipt: first });
    expect(() => decideLearningV2CourseShardReceiptAppend({ expected, currentCheckpoint: created.checkpoint, storedReceipt: null, incomingReceipt: first }))
      .toThrow('learning_v2_course_shard_receipt_missing_after_advance');
    expect(() => decideLearningV2CourseShardReceiptAppend({ expected, currentCheckpoint: created.checkpoint, storedReceipt: first, incomingReceipt: receipt(1, 'different') }))
      .toThrow('learning_v2_course_shard_receipt_immutable_conflict');
    expect(() => decideLearningV2CourseShardReceiptAppend({ expected, currentCheckpoint: createLearningV2LocalizedCourseShardCheckpoint(expected), storedReceipt: receipt(2), incomingReceipt: receipt(2) }))
      .toThrow('learning_v2_course_shard_checkpoint_behind_receipt_gap');
  });
});
