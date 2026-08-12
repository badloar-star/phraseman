import { buildLearningV2LocalizedContentBatchPlan } from '../../../modules/learning-v2/content/generator_course_batch_plan';
import { hashCanonicalBody } from '../../../modules/learning-v2/policies/decision_registry';
import {
  approveLearningV2LocalizedCourseWave,
  createLearningV2LocalizedCourseShardCheckpoint,
  materializeLearningV2LocalizedSessionShardReceipt,
} from './learning_v2_course_shard_checkpoint';
import { decideLearningV2CourseShardReceiptAppend } from './learning_v2_course_shard_repository';
import {
  parseLearningV2CourseWaveApprovalRequest,
  resolveLearningV2CourseShardRuntimeState,
} from './learning_v2_course_shard_background';

const plan = buildLearningV2LocalizedContentBatchPlan({
  packageId: 'learning-v2-en-v1', approvedOutlineFingerprint: 'a'.repeat(64), promptVersion: 'learning-v2-localized-session-v1',
});
const expected = Object.freeze({ stageId: 'request-1:learning_v2_localized_course:course:r1', stageRevision: 1, plan });

function append(checkpoint: ReturnType<typeof createLearningV2LocalizedCourseShardCheckpoint>, ordinal: number) {
  const task = plan.tasks[ordinal - 1];
  const receipt = materializeLearningV2LocalizedSessionShardReceipt({
    expected, task,
    object: {
      objectPath: `learning-v2/course-packages/${plan.packageId}/episodes/${String(task.episodeOrdinal).padStart(2, '0')}/sessions/${String(task.sessionOrdinal).padStart(2, '0')}.json`,
      contentHash: hashCanonicalBody({ ordinal }), objectGeneration: `g-${ordinal}`, byteSize: 2_000,
    },
  });
  return decideLearningV2CourseShardReceiptAppend({ expected, currentCheckpoint: checkpoint, storedReceipt: null, incomingReceipt: receipt }).checkpoint;
}

describe('Learning V2 background shard scheduling contract', () => {
  test('keeps automatic FIFO work queued before the first owner boundary', () => {
    let checkpoint = createLearningV2LocalizedCourseShardCheckpoint(expected);
    checkpoint = append(checkpoint, 1);
    expect(resolveLearningV2CourseShardRuntimeState(checkpoint, expected)).toEqual({
      state: 'queued', autoRunRequested: true, pauseReason: null, requiredWaveApproval: null,
    });
  });

  test('pauses exactly after E1 and resumes only from its bound approval receipt', () => {
    let checkpoint = createLearningV2LocalizedCourseShardCheckpoint(expected);
    for (let ordinal = 1; ordinal <= 12; ordinal += 1) checkpoint = append(checkpoint, ordinal);
    expect(resolveLearningV2CourseShardRuntimeState(checkpoint, expected)).toEqual({
      state: 'paused', autoRunRequested: false, pauseReason: 'owner_wave_approval_required', requiredWaveApproval: 'e1',
    });
    const approved = approveLearningV2LocalizedCourseWave({
      checkpoint, expected, waveId: 'e1', reviewerId: 'owner', reviewedAtIso: '2026-08-11T12:00:00.000Z',
    });
    expect(resolveLearningV2CourseShardRuntimeState(approved, expected)).toEqual({
      state: 'queued', autoRunRequested: true, pauseReason: null, requiredWaveApproval: null,
    });
  });

  test('accepts only an exact owner decision bound to one checkpoint', () => {
    const input = parseLearningV2CourseWaveApprovalRequest({
      stageId: expected.stageId, waveId: 'e1', expectedCheckpointFingerprint: 'b'.repeat(64), reason: 'E1 reviewed and approved.',
    });
    expect(input.waveId).toBe('e1');
    expect(() => parseLearningV2CourseWaveApprovalRequest({ ...input, waveId: 'wrong' }))
      .toThrow('learning_v2_course_wave_approval_invalid');
    expect(() => parseLearningV2CourseWaveApprovalRequest({ ...input, extra: true }))
      .toThrow('learning_v2_course_wave_approval_invalid');
  });
});
