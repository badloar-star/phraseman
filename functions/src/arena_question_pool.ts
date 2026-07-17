import { buildArenaRuntimeDraft } from './content_factory/arena_stage_consumer_adapter';
import { loadArenaQuestionBatchForReview, type ArenaGroundingBucketLike } from './content_factory/arena_grounding';

export interface ArenaPoolQuestion {
  readonly id: string;
  readonly studyTarget: 'en';
  readonly learnerSourceLocale: 'ru';
  readonly level: string;
  readonly availability: 'active' | 'removed';
  readonly skillTag: string;
  readonly difficulty: string;
  readonly rand: number;
  readonly question: string;
  readonly options: readonly string[];
  readonly correct: string;
  readonly correctIndex: number;
  readonly sourceStageId: string;
  readonly artifactId: string;
  readonly contentHash: string;
  readonly topicArtifactId: string;
  /** Optimistic-concurrency revision for administrative remove/restore actions. */
  readonly revision: number;
  readonly publishedAtMs: number;
  readonly publishedBy: string;
  readonly removedAtMs?: number;
  readonly removedBy?: string;
  readonly removalReason?: string;
  readonly restoredAtMs?: number;
  readonly restoredBy?: string;
}

export interface ArenaQuestionPoolRepository {
  findByArtifactId(artifactId: string): Promise<readonly ArenaPoolQuestion[]>;
  get(id: string): Promise<ArenaPoolQuestion | null>;
  put(question: ArenaPoolQuestion): Promise<void>;
}

export function firestoreArenaQuestionPoolRepository(db: FirebaseFirestore.Firestore): ArenaQuestionPoolRepository {
  const collection = db.collection('arena_questions');
  const map = (snapshot: FirebaseFirestore.DocumentSnapshot): ArenaPoolQuestion | null => snapshot.exists ? snapshot.data() as ArenaPoolQuestion : null;
  return Object.freeze({
    findByArtifactId: async (artifactId: string) => (await collection.where('artifactId', '==', artifactId).get()).docs.map((doc) => doc.data() as ArenaPoolQuestion),
    get: async (id: string) => map(await collection.doc(id).get()),
    put: async (question: ArenaPoolQuestion) => { await collection.doc(question.id).set(question); },
  });
}

type ApprovedArenaQuestionStage = {
  readonly artifactId: string;
  readonly kind: 'arena_questions';
  readonly state: string;
  readonly count: number;
  readonly objectPath: string;
  readonly contentHash: string;
  readonly objectGeneration: string;
  readonly groundingReceipt: unknown;
};

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function ensureActor(actorId: string): string {
  const actor = actorId.trim();
  if (!actor) throw new Error('arena_pool_actor_required');
  return actor;
}

export async function publishArenaQuestionBatch(input: {
  readonly bucket: ArenaGroundingBucketLike;
  readonly stage: ApprovedArenaQuestionStage;
  readonly requestId: string;
  readonly actorId: string;
  readonly nowMs: number;
  readonly repository: ArenaQuestionPoolRepository;
}): Promise<{ readonly published: number; readonly idempotent: boolean; readonly questionIds: readonly string[] }> {
  const actorId = ensureActor(input.actorId);
  if (!input.requestId.trim() || !Number.isSafeInteger(input.nowMs)) throw new Error('arena_pool_publish_input_invalid');
  const existing = await input.repository.findByArtifactId(input.stage.artifactId);
  if (existing.length) {
    if (existing.length !== 10 || existing.some((question) => question.contentHash !== input.stage.contentHash)) throw new Error('arena_pool_artifact_content_conflict');
    return Object.freeze({ published: 0, idempotent: true, questionIds: Object.freeze(existing.map((question) => question.id)) });
  }
  const batch = await loadArenaQuestionBatchForReview(input.bucket, input.stage);
  const draft = buildArenaRuntimeDraft({ requestId: input.requestId, topicArtifactId: batch.topicArtifactId, topic: batch.topic, batches: [{ artifactId: batch.artifactId, items: batch.items }] });
  if (draft.questionCount !== 10 || draft.questions.length !== 10 || draft.questions.some((question) => question.studyTarget !== 'en' || question.learnerSourceLocale !== 'ru' || question.options.length !== 4 || new Set(question.options).size !== 4 || question.options[question.correctIndex] !== question.correct)) throw new Error('arena_pool_runtime_contract_invalid');
  const sourceStageId = `artifact:${input.requestId}:arena_questions:${batch.topicArtifactId}:r1`;
  const questions: ArenaPoolQuestion[] = draft.questions.map((question, index) => {
    const item = record(batch.items[index]); const skillTag = String(item?.skillTag ?? '').trim();
    if (!skillTag) throw new Error('arena_pool_skill_tag_invalid');
    return Object.freeze({
      id: question.id, studyTarget: 'en', learnerSourceLocale: 'ru', level: question.level, availability: 'active', skillTag, difficulty: question.difficulty, rand: question.rand,
      question: question.question, options: question.options, correct: question.correct, correctIndex: question.correctIndex,
      sourceStageId, artifactId: batch.artifactId, contentHash: input.stage.contentHash, topicArtifactId: batch.topicArtifactId, revision: 1, publishedAtMs: input.nowMs, publishedBy: actorId,
    });
  });
  for (const question of questions) await input.repository.put(question);
  return Object.freeze({ published: questions.length, idempotent: false, questionIds: Object.freeze(questions.map((question) => question.id)) });
}

export async function removeArenaPoolQuestion(input: { readonly repository: ArenaQuestionPoolRepository; readonly id: string; readonly reason: string; readonly actorId: string; readonly nowMs: number }): Promise<void> {
  const reason = input.reason.trim(); const actorId = ensureActor(input.actorId); const current = await input.repository.get(input.id);
  if (!current) throw new Error('arena_pool_question_not_found');
  if (!reason) throw new Error('arena_pool_removal_reason_required');
  if (!Number.isSafeInteger(input.nowMs)) throw new Error('arena_pool_mutation_input_invalid');
  await input.repository.put(Object.freeze({ ...current, availability: 'removed', removalReason: reason, removedAtMs: input.nowMs, removedBy: actorId, revision: current.revision + 1 }));
}

export async function restoreArenaPoolQuestion(input: { readonly repository: ArenaQuestionPoolRepository; readonly id: string; readonly actorId: string; readonly nowMs: number }): Promise<void> {
  const actorId = ensureActor(input.actorId); const current = await input.repository.get(input.id);
  if (!current) throw new Error('arena_pool_question_not_found');
  if (!Number.isSafeInteger(input.nowMs)) throw new Error('arena_pool_mutation_input_invalid');
  await input.repository.put(Object.freeze({ ...current, availability: 'active', restoredAtMs: input.nowMs, restoredBy: actorId, revision: current.revision + 1 }));
}
