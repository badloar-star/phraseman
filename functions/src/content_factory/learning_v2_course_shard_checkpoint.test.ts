import {
  buildLearningV2LocalizedContentBatchPlan,
  type LearningV2CourseBatchTask,
} from '../../../modules/learning-v2/content/generator_course_batch_plan';
import { hashCanonicalBody } from '../../../modules/learning-v2/policies/decision_registry';
import {
  appendLearningV2LocalizedSessionShardReceipt,
  approveLearningV2LocalizedCourseWave,
  auditLearningV2LocalizedCourseShardReceipts,
  createLearningV2LocalizedCourseShardCheckpoint,
  materializeLearningV2LocalizedSessionShardReceipt,
  nextLearningV2LocalizedCourseShardDecision,
  parseLearningV2LocalizedCourseShardCheckpoint,
  parseLearningV2LocalizedSessionShardReceipt,
  type LearningV2LocalizedCourseShardCheckpoint,
  type LearningV2LocalizedSessionShardReceipt,
} from './learning_v2_course_shard_checkpoint';

const plan = buildLearningV2LocalizedContentBatchPlan({
  packageId: 'learning-v2-en-v1',
  approvedOutlineFingerprint: 'a'.repeat(64),
  promptVersion: 'learning-v2-localized-session-v1',
});
const expected = Object.freeze({ stageId: 'request-1:learning_v2_localized_course:course:r1', stageRevision: 1, plan });

function objectFor(task: LearningV2CourseBatchTask, seed = task.taskId) {
  return {
    objectPath: `learning-v2/course-packages/${plan.packageId}/episodes/${String(task.episodeOrdinal).padStart(2, '0')}/sessions/${String(task.sessionOrdinal).padStart(2, '0')}.json`,
    contentHash: hashCanonicalBody({ seed }),
    objectGeneration: `g-${task.taskOrdinal}`,
    byteSize: 1024 + task.taskOrdinal,
  };
}

function receipt(task: LearningV2CourseBatchTask, seed = task.taskId) {
  return materializeLearningV2LocalizedSessionShardReceipt({ expected, task, object: objectFor(task, seed) });
}

function appendRange(
  checkpoint: LearningV2LocalizedCourseShardCheckpoint,
  receipts: LearningV2LocalizedSessionShardReceipt[],
  from: number,
  through: number,
) {
  let next = checkpoint;
  for (let ordinal = from; ordinal <= through; ordinal += 1) {
    const item = receipt(plan.tasks[ordinal - 1]);
    receipts.push(item);
    next = appendLearningV2LocalizedSessionShardReceipt({ checkpoint: next, expected, receipt: item });
  }
  return next;
}

describe('Learning V2 all-locale session-shard checkpoint', () => {
  test('resumes the exact next four all-locale session tasks after a process cut', () => {
    let checkpoint = createLearningV2LocalizedCourseShardCheckpoint(expected);
    const first = nextLearningV2LocalizedCourseShardDecision({ checkpoint, expected });
    expect(first).toMatchObject({ kind: 'batch' });
    if (first.kind !== 'batch') throw new Error('expected batch');
    expect(first.tasks.map((task) => task.taskId)).toEqual([
      'localized:01:01', 'localized:01:02', 'localized:01:03', 'localized:01:04',
    ]);
    for (const task of first.tasks) checkpoint = appendLearningV2LocalizedSessionShardReceipt({ checkpoint, expected, receipt: receipt(task) });

    const resumed = parseLearningV2LocalizedCourseShardCheckpoint(JSON.parse(JSON.stringify(checkpoint)), expected);
    const second = nextLearningV2LocalizedCourseShardDecision({ checkpoint: resumed, expected });
    expect(second.kind).toBe('batch');
    if (second.kind !== 'batch') throw new Error('expected batch');
    expect(second.tasks.map((task) => task.taskId)).toEqual([
      'localized:01:05', 'localized:01:06', 'localized:01:07', 'localized:01:08',
    ]);
    expect(resumed).toMatchObject({ nextTaskOrdinal: 5, completedTaskCount: 4, checkpointRevision: 5 });
  });

  test('binds every immutable receipt to the exact task, session path and plan authority', () => {
    const first = receipt(plan.tasks[0]);
    expect(parseLearningV2LocalizedSessionShardReceipt(JSON.parse(JSON.stringify(first)), expected)).toEqual(first);
    const wrongPath = { ...first, object: { ...first.object, objectPath: 'learning-v2/course-packages/foreign/session.json' } };
    const { receiptFingerprint: _old, ...body } = wrongPath;
    expect(() => parseLearningV2LocalizedSessionShardReceipt({ ...wrongPath, receiptFingerprint: hashCanonicalBody(body) }, expected))
      .toThrow('learning_v2_course_shard_object_invalid');
    const foreignTask = { ...plan.tasks[0], locale: 'pl' as const };
    expect(() => materializeLearningV2LocalizedSessionShardReceipt({ expected, task: foreignTask, object: objectFor(foreignTask) }))
      .toThrow('learning_v2_course_shard_task_not_from_plan');
  });

  test('rejects skips and a different replay while immutable receipt storage owns idempotency', () => {
    let checkpoint = createLearningV2LocalizedCourseShardCheckpoint(expected);
    checkpoint = appendLearningV2LocalizedSessionShardReceipt({ checkpoint, expected, receipt: receipt(plan.tasks[0]) });
    expect(() => appendLearningV2LocalizedSessionShardReceipt({ checkpoint, expected, receipt: receipt(plan.tasks[0]) }))
      .toThrow('learning_v2_course_shard_out_of_order');
    expect(() => appendLearningV2LocalizedSessionShardReceipt({ checkpoint, expected, receipt: receipt(plan.tasks[2]) }))
      .toThrow('learning_v2_course_shard_out_of_order');
    expect(receipt(plan.tasks[0], 'changed').receiptFingerprint).not.toBe(receipt(plan.tasks[0]).receiptFingerprint);
  });

  test('stops after all 12 E1 all-locale sessions until exact owner approval', () => {
    const receipts: LearningV2LocalizedSessionShardReceipt[] = [];
    let checkpoint = appendRange(createLearningV2LocalizedCourseShardCheckpoint(expected), receipts, 1, 12);
    expect(nextLearningV2LocalizedCourseShardDecision({ checkpoint, expected })).toMatchObject({
      kind: 'blocked_wave_approval', requiredApproval: 'e1',
    });
    expect(() => appendLearningV2LocalizedSessionShardReceipt({ checkpoint, expected, receipt: receipt(plan.tasks[12]) }))
      .toThrow('learning_v2_course_shard_wave_prerequisite_missing');
    checkpoint = approveLearningV2LocalizedCourseWave({
      checkpoint, expected, waveId: 'e1', reviewerId: 'owner', reviewedAtIso: '2026-08-11T10:00:00.000Z',
    });
    const decision = nextLearningV2LocalizedCourseShardDecision({ checkpoint, expected });
    expect(decision.kind).toBe('batch');
    if (decision.kind !== 'batch') throw new Error('expected batch');
    expect(decision.tasks[0]).toMatchObject({ taskId: 'localized:02:01', taskOrdinal: 13 });
    expect(auditLearningV2LocalizedCourseShardReceipts({ checkpoint, expected, receipts })).toEqual(checkpoint);
  });

  test('keeps a bounded root through all 384 tasks and three cumulative owner gates', () => {
    const receipts: LearningV2LocalizedSessionShardReceipt[] = [];
    let checkpoint = createLearningV2LocalizedCourseShardCheckpoint(expected);
    checkpoint = appendRange(checkpoint, receipts, 1, 12);
    checkpoint = approveLearningV2LocalizedCourseWave({ checkpoint, expected, waveId: 'e1', reviewerId: 'owner', reviewedAtIso: '2026-08-11T10:00:00.000Z' });
    checkpoint = appendRange(checkpoint, receipts, 13, 96);
    checkpoint = approveLearningV2LocalizedCourseWave({ checkpoint, expected, waveId: 'chapter_1', reviewerId: 'owner', reviewedAtIso: '2026-08-11T11:00:00.000Z' });
    checkpoint = appendRange(checkpoint, receipts, 97, 384);
    expect(nextLearningV2LocalizedCourseShardDecision({ checkpoint, expected })).toMatchObject({ kind: 'drained' });
    checkpoint = approveLearningV2LocalizedCourseWave({ checkpoint, expected, waveId: 'season', reviewerId: 'owner', reviewedAtIso: '2026-08-11T12:00:00.000Z' });
    expect(checkpoint).toMatchObject({ nextTaskOrdinal: 385, completedTaskCount: 384 });
    expect(checkpoint.waveApprovals.map((approval) => approval.waveId)).toEqual(['e1', 'chapter_1', 'season']);
    expect(JSON.stringify(checkpoint).length).toBeLessThan(16 * 1024);
    expect(auditLearningV2LocalizedCourseShardReceipts({ checkpoint, expected, receipts })).toEqual(checkpoint);
  });

  test('full audit rejects a missing, reordered or conflicting durable receipt', () => {
    const receipts: LearningV2LocalizedSessionShardReceipt[] = [];
    const checkpoint = appendRange(createLearningV2LocalizedCourseShardCheckpoint(expected), receipts, 1, 4);
    expect(() => auditLearningV2LocalizedCourseShardReceipts({ checkpoint, expected, receipts: receipts.slice(0, 3) }))
      .toThrow('learning_v2_course_shard_receipt_audit_incomplete');
    expect(() => auditLearningV2LocalizedCourseShardReceipts({ checkpoint, expected, receipts: [receipts[1], receipts[0], ...receipts.slice(2)] }))
      .toThrow('learning_v2_course_shard_receipt_audit_order_invalid');
    const changed = receipt(plan.tasks[3], 'changed');
    expect(() => auditLearningV2LocalizedCourseShardReceipts({ checkpoint, expected, receipts: [...receipts.slice(0, 3), changed] }))
      .toThrow('learning_v2_course_shard_receipt_audit_aggregate_mismatch');
  });

  test('rejects self-rehashed cursor skips and never invokes a stored accessor', () => {
    const checkpoint = createLearningV2LocalizedCourseShardCheckpoint(expected);
    const skipped = { ...checkpoint, nextTaskOrdinal: 9 };
    const { checkpointFingerprint: _old, ...body } = skipped;
    expect(() => parseLearningV2LocalizedCourseShardCheckpoint({ ...skipped, checkpointFingerprint: hashCanonicalBody(body) }, expected))
      .toThrow('learning_v2_course_shard_checkpoint_identity_mismatch');

    let getterCalls = 0;
    const hostile: Record<string, unknown> = { ...checkpoint };
    Object.defineProperty(hostile, 'checkpointFingerprint', {
      enumerable: true,
      get() { getterCalls += 1; return checkpoint.checkpointFingerprint; },
    });
    expect(() => parseLearningV2LocalizedCourseShardCheckpoint(hostile, expected)).toThrow('learning_v2_course_shard_checkpoint_invalid');
    expect(getterCalls).toBe(0);
  });
});
