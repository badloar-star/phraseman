import {
  buildLearningV2AudioBatchPlan,
  buildLearningV2LocalizedContentBatchPlan,
  materializeLearningV2CourseBatchCursor,
  nextLearningV2CourseBatch,
} from '../modules/learning-v2/content/generator_course_batch_plan';
import { hashCanonicalBody } from '../modules/learning-v2/policies/decision_registry';

const hash = (character: string) => character.repeat(64);

describe('Learning V2 bounded course generation batches', () => {
  test('plans exactly 384 all-locale session tasks in deterministic E1 → E1–E8 → E1–E32 order', () => {
    const plan = buildLearningV2LocalizedContentBatchPlan({ packageId: 'english-course-v2', approvedOutlineFingerprint: hash('a'), promptVersion: 'v2' });
    expect(plan.tasks).toHaveLength(32 * 12);
    expect(new Set(plan.tasks.map((task) => task.taskId))).toHaveProperty('size', 384);
    expect(plan.tasks.filter((task) => task.waveId === 'e1')).toHaveLength(12);
    expect(plan.tasks.filter((task) => task.waveId === 'chapter_1')).toHaveLength(7 * 12);
    expect(plan.tasks.filter((task) => task.waveId === 'season')).toHaveLength(24 * 12);
    expect(plan.tasks[0]).toMatchObject({ taskId: 'localized:01:01', taskOrdinal: 1, episodeOrdinal: 1, sessionOrdinal: 1, locale: null, waveId: 'e1' });
    expect(plan.tasks.at(-1)).toMatchObject({ taskId: 'localized:32:12', taskOrdinal: 384, episodeOrdinal: 32, sessionOrdinal: 12, locale: null, waveId: 'season' });
  });

  test('runs at most four tasks, stops at owner wave gates and resumes from an exact cursor', () => {
    const plan = buildLearningV2LocalizedContentBatchPlan({ packageId: 'english-course-v2', approvedOutlineFingerprint: hash('a'), promptVersion: 'v2' });
    const first = nextLearningV2CourseBatch({ plan, cursor: null, approvedWaves: [] });
    expect(first).toMatchObject({ kind: 'batch', tasks: [{ taskOrdinal: 1 }, { taskOrdinal: 2 }, { taskOrdinal: 3 }, { taskOrdinal: 4 }] });
    if (first.kind !== 'batch' || !first.nextCursor) throw new Error('first batch missing cursor');
    const endOfE1 = materializeLearningV2CourseBatchCursor(plan, 9);
    const finalE1 = nextLearningV2CourseBatch({ plan, cursor: endOfE1, approvedWaves: [] });
    expect(finalE1).toMatchObject({ kind: 'batch', tasks: [{ taskOrdinal: 9 }, { taskOrdinal: 10 }, { taskOrdinal: 11 }, { taskOrdinal: 12 }], nextCursor: { nextTaskOrdinal: 13 } });
    if (finalE1.kind !== 'batch' || !finalE1.nextCursor) throw new Error('final E1 batch missing cursor');
    expect(nextLearningV2CourseBatch({ plan, cursor: finalE1.nextCursor, approvedWaves: [] }))
      .toMatchObject({ kind: 'blocked_wave_approval', requiredApproval: 'e1', cursor: { nextTaskOrdinal: 13 } });
    const resumed = nextLearningV2CourseBatch({ plan, cursor: finalE1.nextCursor, approvedWaves: ['e1'] });
    expect(resumed.kind).toBe('batch');
    if (resumed.kind !== 'batch') throw new Error('chapter batch did not resume');
    expect(resumed.tasks[0]).toMatchObject({ taskOrdinal: 13, episodeOrdinal: 2, sessionOrdinal: 1, locale: null });
  });

  test('rejects cursor tampering and never lets a batch cross into the next approval wave', () => {
    const plan = buildLearningV2LocalizedContentBatchPlan({ packageId: 'english-course-v2', approvedOutlineFingerprint: hash('a'), promptVersion: 'v2' });
    const endOfE1 = materializeLearningV2CourseBatchCursor(plan, 11);
    const decision = nextLearningV2CourseBatch({ plan, cursor: endOfE1, approvedWaves: [] });
    expect(decision).toMatchObject({ kind: 'batch', tasks: [{ taskOrdinal: 11 }, { taskOrdinal: 12 }], nextCursor: { nextTaskOrdinal: 13 } });
    expect(() => nextLearningV2CourseBatch({ plan, cursor: { ...endOfE1, nextTaskOrdinal: 99 }, approvedWaves: [] }))
      .toThrow('learning_v2_course_batch_cursor_invalid');
    const forgedTasks = plan.tasks.map((task, index) => index === 0 ? { ...task, taskId: 'localized:32:12' } : task);
    const forgedBody = { schemaVersion: plan.schemaVersion, packageId: plan.packageId, phase: plan.phase, generationAuthority: plan.generationAuthority, tasks: forgedTasks };
    expect(() => nextLearningV2CourseBatch({ plan: { ...forgedBody, planFingerprint: hashCanonicalBody(forgedBody) }, cursor: null, approvedWaves: [] }))
      .toThrow('learning_v2_course_batch_plan_invalid');
  });

  test('plans one four-voice audio manifest per episode and fingerprints content and voice settings for regeneration', () => {
    const content = Array.from({ length: 32 }, (_, index) => hash(((index % 6) + 1).toString(16)));
    const plan = buildLearningV2AudioBatchPlan({ packageId: 'english-course-v2', episodeContentFingerprints: content, voiceSettingsFingerprint: hash('b') });
    const changedText = buildLearningV2AudioBatchPlan({ packageId: 'english-course-v2', episodeContentFingerprints: content.map((item, index) => index === 2 ? hash('f') : item), voiceSettingsFingerprint: hash('b') });
    const changedVoice = buildLearningV2AudioBatchPlan({ packageId: 'english-course-v2', episodeContentFingerprints: content, voiceSettingsFingerprint: hash('c') });
    expect(plan.tasks).toHaveLength(32);
    expect(plan.tasks[0]).toMatchObject({ taskId: 'audio:01', sessionOrdinal: null, locale: null, waveId: 'e1' });
    expect(changedText.tasks[2].generationInputFingerprint).not.toBe(plan.tasks[2].generationInputFingerprint);
    expect(changedText.tasks[1].generationInputFingerprint).toBe(plan.tasks[1].generationInputFingerprint);
    expect(changedVoice.tasks.every((task, index) => task.generationInputFingerprint !== plan.tasks[index].generationInputFingerprint)).toBe(true);
  });
});
