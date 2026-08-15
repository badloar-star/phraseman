import { createHash } from 'node:crypto';
import { buildLearningV2LocalizedContentBatchPlan } from '../../../modules/learning-v2/content/generator_course_batch_plan';
import { LEARNING_V2_INTERFACE_LOCALES } from '../../../modules/learning-v2/content/generator_course_contract';
import {
  appendLearningV2LocalizedSessionShardReceipt,
  createLearningV2LocalizedCourseShardCheckpoint,
  materializeLearningV2LocalizedSessionShardReceipt,
  type LearningV2LocalizedCourseShardCheckpointExpected,
} from './learning_v2_course_shard_checkpoint';

const localized = (prefix: string) => Object.fromEntries(LEARNING_V2_INTERFACE_LOCALES.map((locale) => [locale, `${prefix} ${locale}`]));
const mockValidateShard = jest.fn((_: unknown, expected: {
  packageId: string;
  targetLanguage: string;
  episodeOrdinal: number;
  requiredSessionOrdinal: number;
  generationInputFingerprint: string;
}) => ({
  schemaVersion: 'learning-v2-generated-session-shard.v1',
  packageId: expected.packageId,
  targetLanguage: expected.targetLanguage,
  episodeOrdinal: expected.episodeOrdinal,
  requiredSessionOrdinal: expected.requiredSessionOrdinal,
  episodeId: `episode-${String(expected.episodeOrdinal).padStart(2, '0')}`,
  sessionId: `session-episode-${String(expected.episodeOrdinal).padStart(2, '0')}-${String(expected.requiredSessionOrdinal).padStart(2, '0')}`,
  sessionTemplateId: `episode-${String(expected.episodeOrdinal).padStart(2, '0')}:session-${String(expected.requiredSessionOrdinal).padStart(2, '0')}`,
  canDoOutcomeId: `outcome-${expected.episodeOrdinal}-${expected.requiredSessionOrdinal}`,
  zone: expected.requiredSessionOrdinal <= 4 ? 'understand' : expected.requiredSessionOrdinal <= 8 ? 'use' : 'master',
  support: 'high',
  generationInputFingerprint: expected.generationInputFingerprint,
  interfaceLocales: LEARNING_V2_INTERFACE_LOCALES,
  contentKinds: ['target_form', 'meaning', 'usage_context', 'distractor_rationale'],
  intro: { titleByLocale: localized(`Title ${expected.requiredSessionOrdinal}`), learningGoalByLocale: localized(`Goal ${expected.requiredSessionOrdinal}`) },
  cards: Array.from({ length: 12 }, (_, index) => ({
    family: index % 2 === 0 ? 'visual_discovery' : 'listen_choose',
    contentItem: { target: { text: `Target ${expected.requiredSessionOrdinal}.${index + 1}` } },
  })),
}));

jest.mock('../../../modules/learning-v2/content/generator_session_shard', () => ({
  validateLearningV2GeneratedSessionShardV1: (...args: unknown[]) => mockValidateShard(...args as [unknown, never]),
}));

import {
  learningV2CourseWaveLastEpisode,
  loadLearningV2CourseWavePreview,
  parseLearningV2CourseWavePreviewRequest,
} from './learning_v2_course_wave_preview';

describe('Learning V2 owner wave preview', () => {
  const plan = buildLearningV2LocalizedContentBatchPlan({
    packageId: 'learning-v2-en-v1',
    approvedOutlineFingerprint: 'a'.repeat(64),
    promptVersion: 'learning-v2-localized-session-v1',
  });
  const expected: LearningV2LocalizedCourseShardCheckpointExpected = Object.freeze({ stageId: 'stage-course-1', stageRevision: 1, plan });

  test('strictly parses the paged owner-review request without invoking accessors', () => {
    expect(parseLearningV2CourseWavePreviewRequest({ stageId: 'stage-course-1', episodeOrdinal: 1, sessionOrdinal: 12 }))
      .toEqual({ stageId: 'stage-course-1', episodeOrdinal: 1, sessionOrdinal: 12 });
    let getterCalled = false;
    const hostile = Object.defineProperty({ stageId: 'stage-course-1', sessionOrdinal: 1 }, 'episodeOrdinal', {
      enumerable: true,
      get() { getterCalled = true; return 1; },
    });
    expect(() => parseLearningV2CourseWavePreviewRequest(hostile)).toThrow('learning_v2_course_wave_preview_invalid');
    expect(getterCalled).toBe(false);
    expect(() => parseLearningV2CourseWavePreviewRequest({ stageId: 'stage-course-1', episodeOrdinal: 1, sessionOrdinal: 1, extra: true }))
      .toThrow('learning_v2_course_wave_preview_invalid');
    expect(learningV2CourseWaveLastEpisode('e1')).toBe(1);
    expect(learningV2CourseWaveLastEpisode('chapter_1')).toBe(8);
    expect(learningV2CourseWaveLastEpisode('season')).toBe(32);
  });

  test('verifies all twelve immutable receipts and returns one full selected session plus safe summaries', async () => {
    let checkpoint = createLearningV2LocalizedCourseShardCheckpoint(expected);
    const receipts: unknown[] = [];
    const files = new Map<string, { bytes: Buffer; generation: string; hash: string }>();
    for (const task of plan.tasks.slice(0, 12)) {
      const bytes = Buffer.from(JSON.stringify({ taskOrdinal: task.taskOrdinal }), 'utf8');
      const hash = createHash('sha256').update(bytes).digest('hex');
      const objectPath = `learning-v2/course-packages/${plan.packageId}/episodes/01/sessions/${String(task.sessionOrdinal).padStart(2, '0')}.json`;
      const generation = `g-${task.taskOrdinal}`;
      files.set(objectPath, { bytes, generation, hash });
      const receipt = materializeLearningV2LocalizedSessionShardReceipt({
        expected,
        task,
        object: { objectPath, contentHash: hash, objectGeneration: generation, byteSize: bytes.byteLength },
      });
      receipts.push(receipt);
      checkpoint = appendLearningV2LocalizedSessionShardReceipt({ checkpoint, expected, receipt });
    }
    const bucket = {
      file(path: string) {
        const stored = files.get(path);
        if (!stored) throw new Error('missing test object');
        return {
          async getMetadata() { return [{ generation: stored.generation, size: stored.bytes.byteLength, metadata: { contentHash: stored.hash } }]; },
          async download() { return [stored.bytes] as [Buffer]; },
        };
      },
    };
    const preview = await loadLearningV2CourseWavePreview({
      stageId: expected.stageId,
      targetLanguage: 'en',
      waveId: 'e1',
      episodeOrdinal: 1,
      selectedSessionOrdinal: 7,
      checkpoint,
      expected,
      receipts,
      bucket,
    });
    expect(preview.sessions).toHaveLength(12);
    expect(preview.selectedSessionOrdinal).toBe(7);
    expect(preview.selectedSession.requiredSessionOrdinal).toBe(7);
    expect(preview.sessions[6]).toMatchObject({ taskOrdinal: 7, sessionOrdinal: 7 });
    expect(preview.sessions[6].titleByLocale).toEqual(localized('Title 7'));
    expect(mockValidateShard).toHaveBeenCalledTimes(12);

    const first = files.values().next().value as { bytes: Buffer; generation: string; hash: string };
    first.generation = 'forged-generation';
    await expect(loadLearningV2CourseWavePreview({
      stageId: expected.stageId,
      targetLanguage: 'en',
      waveId: 'e1',
      episodeOrdinal: 1,
      selectedSessionOrdinal: 1,
      checkpoint,
      expected,
      receipts,
      bucket,
    })).rejects.toThrow('learning_v2_course_wave_preview_object_identity_mismatch');
  });
});
