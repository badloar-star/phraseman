import { buildLearningV2LocalizedContentBatchPlan } from '../../../modules/learning-v2/content/generator_course_batch_plan';
import { hashCanonicalBody } from '../../../modules/learning-v2/policies/decision_registry';
import type { StageGenerationProvider } from './stage_runner';
import {
  approveLearningV2LocalizedCourseWave,
  createLearningV2LocalizedCourseShardCheckpoint,
  materializeLearningV2LocalizedSessionShardReceipt,
  type LearningV2LocalizedSessionShardReceipt,
} from './learning_v2_course_shard_checkpoint';
import { decideLearningV2CourseShardReceiptAppend } from './learning_v2_course_shard_repository';

jest.mock('./learning_v2_session_shard_generation', () => ({
  buildLearningV2SessionShardGenerationPacket: (input: Record<string, unknown>) => ({
    expected: {
      packageId: (input.plan as { packageId: string }).packageId,
      targetLanguage: input.targetLanguage,
      episodeOrdinal: (input.task as { episodeOrdinal: number }).episodeOrdinal,
      requiredSessionOrdinal: (input.task as { sessionOrdinal: number }).sessionOrdinal,
      generationInputFingerprint: (input.task as { generationInputFingerprint: string }).generationInputFingerprint,
    },
    task: input.task,
  }),
  generateLearningV2SessionShard: async (input: Record<string, unknown>) => ({
    shard: { schemaVersion: 'learning-v2-generated-session-shard.v1', taskId: (input.packet as { task: { taskId: string } }).task.taskId },
    receipt: { validation: { serverValidated: true } },
  }),
}));

import { runLearningV2LocalizedCourseShardBatch } from './learning_v2_course_shard_batch_worker';

const plan = buildLearningV2LocalizedContentBatchPlan({
  packageId: 'learning-v2-en-v1', approvedOutlineFingerprint: 'a'.repeat(64), promptVersion: 'session-v1',
});
const expected = Object.freeze({ stageId: 'request-1:learning_v2_localized_course:course:r1', stageRevision: 1, plan });

function outlineArtifact() {
  return {
    stage: 'learning_v2_lesson_outline',
    result: {
      packageId: plan.packageId, targetLanguage: 'en', approvalStage: 'lesson_outline',
      interfaceLocales: ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'],
      localizedContent: Object.fromEntries(['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'].map((locale) => [locale, { title: locale }])),
      sectors: Array.from({ length: 4 }, (_, index) => ({ ordinal: index + 1 })),
      episodes: Array.from({ length: 32 }, (_, episodeIndex) => {
        const ordinal = episodeIndex + 1;
        const episodeId = `episode-${String(ordinal).padStart(2, '0')}`;
        return {
          ordinal, episodeId, sectorOrdinal: Math.ceil(ordinal / 8), cefrBand: ordinal <= 4 ? 'PRE_A1' : 'A1',
          canDoOutcomeId: `outcome-e${ordinal}`, title: `Approved episode ${ordinal} teaching outline`, sectorExamAfter: ordinal % 8 === 0,
          sessions: Array.from({ length: 12 }, (_, sessionIndex) => {
            const sessionOrdinal = sessionIndex + 1;
            return {
              ordinal: sessionOrdinal, sessionTemplateId: `${episodeId}:session-${String(sessionOrdinal).padStart(2, '0')}`,
              canDoOutcomeId: `outcome-e${ordinal}-s${sessionOrdinal}`, focusConceptIds: [`concept-e${ordinal}-s${sessionOrdinal}`], prerequisiteConceptIds: [],
              teachingBrief: `Teach the approved concept for episode ${ordinal} session ${sessionOrdinal}.`,
              practiceBrief: `Practise the approved concept for episode ${ordinal} session ${sessionOrdinal}.`,
              assessmentBrief: `Assess the approved concept for episode ${ordinal} session ${sessionOrdinal}.`,
            };
          }),
        };
      }),
      exams: Array.from({ length: 4 }, (_, index) => ({ afterEpisodeOrdinal: (index + 1) * 8 })),
    },
  };
}

function bucket() {
  const files = new Map<string, { data: Buffer; hash: string; generation: string }>();
  return {
    files,
    file(path: string) {
      return {
        exists: async () => [files.has(path)] as [boolean],
        save: async (data: Buffer, options?: Record<string, unknown>) => {
          const metadata = options?.metadata as { metadata?: { contentHash?: string } } | undefined;
          files.set(path, { data, hash: String(metadata?.metadata?.contentHash ?? ''), generation: `g-${files.size + 1}` });
        },
        getMetadata: async () => {
          const stored = files.get(path);
          if (!stored) throw new Error('missing');
          return [{ generation: stored.generation, size: stored.data.byteLength, metadata: { contentHash: stored.hash } }];
        },
      };
    },
  };
}

const provider: StageGenerationProvider = { generate: async () => '{}' };

describe('Learning V2 bounded localized-course batch worker', () => {
  test('generates and atomically checkpoints at most four exact FIFO session shards', async () => {
    let checkpoint = createLearningV2LocalizedCourseShardCheckpoint(expected);
    const receipts = new Map<number, LearningV2LocalizedSessionShardReceipt>();
    const storage = bucket();
    const result = await runLearningV2LocalizedCourseShardBatch({
      stageId: expected.stageId, stageRevision: 1, targetLanguage: 'en', plan, checkpoint,
      approvedOutlineArtifact: outlineArtifact(), provider, model: 'gpt-5.4', bucket: storage,
      commitReceipt: async (incoming) => {
        const decision = decideLearningV2CourseShardReceiptAppend({ expected, currentCheckpoint: checkpoint, storedReceipt: receipts.get(incoming.taskOrdinal) ?? null, incomingReceipt: incoming });
        receipts.set(incoming.taskOrdinal, decision.receipt);
        checkpoint = decision.checkpoint;
        return checkpoint;
      },
    });
    expect(result).toMatchObject({ kind: 'progressed', generatedCount: 4, checkpoint: { completedTaskCount: 4, nextTaskOrdinal: 5 } });
    expect(result.kind === 'progressed' ? result.generatedTaskIds : []).toEqual(['localized:01:01', 'localized:01:02', 'localized:01:03', 'localized:01:04']);
    expect([...storage.files.keys()]).toEqual([
      'learning-v2/course-packages/learning-v2-en-v1/episodes/01/sessions/01.json',
      'learning-v2/course-packages/learning-v2-en-v1/episodes/01/sessions/02.json',
      'learning-v2/course-packages/learning-v2-en-v1/episodes/01/sessions/03.json',
      'learning-v2/course-packages/learning-v2-en-v1/episodes/01/sessions/04.json',
    ]);
  });

  test('stops at the E1 owner gate and resumes only after the exact approval', async () => {
    let checkpoint = createLearningV2LocalizedCourseShardCheckpoint(expected);
    for (let ordinal = 1; ordinal <= 12; ordinal += 1) {
      const task = plan.tasks[ordinal - 1];
      const receipt = materializeLearningV2LocalizedSessionShardReceipt({
        expected, task,
        object: {
          objectPath: `learning-v2/course-packages/${plan.packageId}/episodes/01/sessions/${String(ordinal).padStart(2, '0')}.json`,
          contentHash: hashCanonicalBody({ ordinal }), objectGeneration: `g-${ordinal}`, byteSize: 2_000,
        },
      });
      checkpoint = decideLearningV2CourseShardReceiptAppend({ expected, currentCheckpoint: checkpoint, storedReceipt: null, incomingReceipt: receipt }).checkpoint;
    }
    const blocked = await runLearningV2LocalizedCourseShardBatch({
      stageId: expected.stageId, stageRevision: 1, targetLanguage: 'en', plan, checkpoint,
      approvedOutlineArtifact: outlineArtifact(), provider, model: 'gpt-5.4', bucket: bucket(),
      commitReceipt: async () => { throw new Error('must_not_commit'); },
    });
    expect(blocked).toMatchObject({ kind: 'blocked_wave_approval', requiredApproval: 'e1', generatedCount: 0 });
    const approved = approveLearningV2LocalizedCourseWave({ checkpoint, expected, waveId: 'e1', reviewerId: 'owner', reviewedAtIso: '2026-08-11T12:00:00.000Z' });
    expect(approved.nextTaskOrdinal).toBe(13);
  });
});
