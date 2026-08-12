import type { LearningV2CourseBatchPlan } from '../../../modules/learning-v2/content/generator_course_batch_plan';
import { extractLearningV2ApprovedSessionOutlineSegment } from './learning_v2_generation_artifacts';
import {
  learningV2LocalizedSessionShardObjectPath,
  materializeLearningV2LocalizedSessionShardReceipt,
  nextLearningV2LocalizedCourseShardDecision,
  parseLearningV2LocalizedCourseShardCheckpoint,
  type LearningV2LocalizedCourseShardCheckpoint,
  type LearningV2LocalizedCourseShardCheckpointExpected,
  type LearningV2LocalizedSessionShardReceipt,
} from './learning_v2_course_shard_checkpoint';
import {
  buildLearningV2SessionShardGenerationPacket,
  generateLearningV2SessionShard,
} from './learning_v2_session_shard_generation';
import { writeImmutableObject, type ArtifactBucketLike } from './artifact_storage';
import type { StageGenerationProvider } from './stage_runner';

export type LearningV2CourseShardBatchWorkerResult =
  | Readonly<{
      kind: 'progressed';
      generatedCount: number;
      generatedTaskIds: readonly string[];
      checkpoint: LearningV2LocalizedCourseShardCheckpoint;
    }>
  | Readonly<{
      kind: 'blocked_wave_approval';
      requiredApproval: 'e1' | 'chapter_1';
      generatedCount: 0;
      checkpoint: LearningV2LocalizedCourseShardCheckpoint;
    }>
  | Readonly<{
      kind: 'drained';
      generatedCount: 0;
      checkpoint: LearningV2LocalizedCourseShardCheckpoint;
    }>;

export async function runLearningV2LocalizedCourseShardBatch(input: Readonly<{
  stageId: string;
  stageRevision: number;
  targetLanguage: string;
  plan: LearningV2CourseBatchPlan;
  checkpoint: unknown;
  approvedOutlineArtifact: unknown;
  provider: StageGenerationProvider;
  model: string;
  bucket: ArtifactBucketLike;
  commitReceipt: (receipt: LearningV2LocalizedSessionShardReceipt) => Promise<unknown>;
  beforeProviderCall?: (taskOrdinal: number, attempt: number) => Promise<void>;
}>): Promise<LearningV2CourseShardBatchWorkerResult> {
  const expected: LearningV2LocalizedCourseShardCheckpointExpected = Object.freeze({
    stageId: input.stageId,
    stageRevision: input.stageRevision,
    plan: input.plan,
  });
  let checkpoint = parseLearningV2LocalizedCourseShardCheckpoint(input.checkpoint, expected);
  const decision = nextLearningV2LocalizedCourseShardDecision({ checkpoint, expected, maxItems: 4 });
  if (decision.kind === 'blocked_wave_approval') {
    return Object.freeze({ kind: 'blocked_wave_approval' as const, requiredApproval: decision.requiredApproval, generatedCount: 0 as const, checkpoint });
  }
  if (decision.kind === 'drained') {
    return Object.freeze({ kind: 'drained' as const, generatedCount: 0 as const, checkpoint });
  }
  const generatedTaskIds: string[] = [];
  for (const task of decision.tasks) {
    const outlineSegment = extractLearningV2ApprovedSessionOutlineSegment(input.approvedOutlineArtifact, {
      packageId: input.plan.packageId,
      targetLanguage: input.targetLanguage,
      episodeOrdinal: task.episodeOrdinal,
      sessionOrdinal: task.sessionOrdinal as number,
    });
    const packet = buildLearningV2SessionShardGenerationPacket({
      plan: input.plan,
      task,
      targetLanguage: input.targetLanguage,
      approvedOutlineSegment: outlineSegment,
    });
    const generated = await generateLearningV2SessionShard({
      provider: input.provider,
      model: input.model,
      packet,
      beforeProviderCall: input.beforeProviderCall
        ? (attempt) => input.beforeProviderCall!(task.taskOrdinal, attempt)
        : undefined,
    });
    const object = await writeImmutableObject(
      input.bucket,
      learningV2LocalizedSessionShardObjectPath(input.plan.packageId, task),
      generated.shard,
    );
    const receipt = materializeLearningV2LocalizedSessionShardReceipt({
      expected,
      task,
      object: {
        objectPath: object.objectPath,
        contentHash: object.contentHash,
        objectGeneration: object.objectGeneration,
        byteSize: object.byteSize,
      },
    });
    const committed = parseLearningV2LocalizedCourseShardCheckpoint(await input.commitReceipt(receipt), expected);
    if (committed.completedTaskCount < checkpoint.completedTaskCount || committed.nextTaskOrdinal < task.taskOrdinal + 1) {
      throw new Error('learning_v2_course_shard_batch_commit_invalid');
    }
    checkpoint = committed;
    generatedTaskIds.push(task.taskId);
  }
  return Object.freeze({
    kind: 'progressed' as const,
    generatedCount: generatedTaskIds.length,
    generatedTaskIds: Object.freeze(generatedTaskIds),
    checkpoint,
  });
}
