import { createHash } from 'node:crypto';
import { buildArenaRuntimeDraft } from './content_factory/arena_stage_consumer_adapter';
import { loadArenaQuestionBatchForReview, type ArenaGroundingBucketLike } from './content_factory/arena_grounding';
import { contentStageReviewFingerprint } from './content_factory/review_fingerprint';

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

export interface ArenaPoolAtomicPublication {
  readonly stageId: string;
  readonly expectedReviewFingerprint: string;
  readonly artifactId: string;
  readonly contentHash: string;
  readonly objectGeneration: string;
  readonly sourceStageId: string;
  readonly questions: readonly ArenaPoolQuestion[];
  readonly audit: {
    readonly actorUid: string;
    readonly role: string;
    readonly timestamp: string;
  };
}

export interface ArenaQuestionPoolRepository {
  publishAtomic(input: ArenaPoolAtomicPublication): Promise<{ readonly published: number; readonly idempotent: boolean; readonly questionIds: readonly string[] }>;
  get(id: string): Promise<ArenaPoolQuestion | null>;
  put(question: ArenaPoolQuestion): Promise<void>;
}

export function firestoreArenaQuestionPoolRepository(db: FirebaseFirestore.Firestore): ArenaQuestionPoolRepository {
  const collection = db.collection('arena_questions');
  const map = (snapshot: FirebaseFirestore.DocumentSnapshot): ArenaPoolQuestion | null => snapshot.exists ? snapshot.data() as ArenaPoolQuestion : null;
  return Object.freeze({
    publishAtomic: async (input: ArenaPoolAtomicPublication) => db.runTransaction(async (tx) => {
      const stageRef = db.collection('content_factory_stages').doc(input.stageId);
      const publicationRef = db.collection('arena_question_pool_publications').doc(createHash('sha256').update(input.artifactId).digest('hex'));
      const questionRefs = input.questions.map((question) => collection.doc(question.id));
      const stageSnapshot = await tx.get(stageRef);
      const publicationSnapshot = await tx.get(publicationRef);
      const questionSnapshots = await tx.getAll(...questionRefs);
      const stage = stageSnapshot.data() ?? {};
      if (!stageSnapshot.exists
        || stage.kind !== 'arena_questions'
        || stage.state !== 'approved'
        || stage.arenaDraftSealed !== true
        || String(stage.artifactId ?? '') !== input.artifactId
        || String(stage.contentHash ?? '') !== input.contentHash
        || String(stage.objectGeneration ?? '') !== input.objectGeneration
        || contentStageReviewFingerprint(input.stageId, stage) !== input.expectedReviewFingerprint) {
        throw new Error('arena_pool_stage_not_publishable');
      }
      const questionIds = Object.freeze(input.questions.map((question) => question.id));
      if (publicationSnapshot.exists) {
        const publication = publicationSnapshot.data() ?? {};
        const publishedQuestionIds = Array.isArray(publication.questionIds) ? publication.questionIds.map(String) : [];
        const sameQuestionIds = publishedQuestionIds.length === questionIds.length && publishedQuestionIds.every((id, index) => id === questionIds[index]);
        const rowsMatch = questionSnapshots.every((snapshot) => {
          const question = (snapshot.data() ?? {}) as Record<string, unknown>;
          return snapshot.exists
            && question.artifactId === input.artifactId
            && question.contentHash === input.contentHash
            && question.sourceStageId === input.sourceStageId;
        });
        if (publication.artifactId !== input.artifactId
          || publication.contentHash !== input.contentHash
          || publication.sourceStageId !== input.sourceStageId
          || !sameQuestionIds
          || !rowsMatch) {
          throw new Error('arena_pool_artifact_content_conflict');
        }
        return Object.freeze({ published: 0, idempotent: true, questionIds });
      }
      if (questionSnapshots.some((snapshot) => snapshot.exists)) throw new Error('arena_pool_question_id_conflict');
      for (let index = 0; index < input.questions.length; index += 1) tx.create(questionRefs[index], input.questions[index]);
      tx.create(publicationRef, {
        artifactId: input.artifactId,
        contentHash: input.contentHash,
        sourceStageId: input.sourceStageId,
        questionIds,
        publishedAtMs: input.questions[0]?.publishedAtMs ?? null,
        publishedBy: input.audit.actorUid,
      });
      tx.create(db.collection('admin_log').doc(), {
        action: 'arena_question_pool.publish',
        actorUid: input.audit.actorUid,
        role: input.audit.role,
        entity: { collection: 'content_factory_stages', id: input.stageId },
        reason: 'Approved Arena batch published to runtime pool',
        before: null,
        after: { published: input.questions.length, idempotent: false, questionCount: questionIds.length },
        timestamp: input.audit.timestamp,
      });
      return Object.freeze({ published: input.questions.length, idempotent: false, questionIds });
    }),
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
  readonly stageId: string;
  readonly expectedReviewFingerprint: string;
  readonly requestId: string;
  readonly actorId: string;
  readonly actorRole: string;
  readonly nowMs: number;
  readonly repository: ArenaQuestionPoolRepository;
}): Promise<{ readonly published: number; readonly idempotent: boolean; readonly questionIds: readonly string[] }> {
  const actorId = ensureActor(input.actorId);
  const sourceStageId = input.stageId.trim();
  const actorRole = input.actorRole.trim();
  if (!input.requestId.trim() || !sourceStageId || !actorRole || !/^[a-f0-9]{64}$/.test(input.expectedReviewFingerprint) || !Number.isSafeInteger(input.nowMs)) throw new Error('arena_pool_publish_input_invalid');
  const batch = await loadArenaQuestionBatchForReview(input.bucket, input.stage);
  const draft = buildArenaRuntimeDraft({ requestId: input.requestId, topicArtifactId: batch.topicArtifactId, topic: batch.topic, batches: [{ artifactId: batch.artifactId, items: batch.items }] });
  if (draft.questionCount !== 10 || draft.questions.length !== 10 || draft.questions.some((question) => question.studyTarget !== 'en' || question.learnerSourceLocale !== 'ru' || question.options.length !== 4 || new Set(question.options).size !== 4 || question.options[question.correctIndex] !== question.correct)) throw new Error('arena_pool_runtime_contract_invalid');
  const questions: ArenaPoolQuestion[] = draft.questions.map((question, index) => {
    const item = record(batch.items[index]); const skillTag = String(item?.skillTag ?? '').trim();
    if (!skillTag) throw new Error('arena_pool_skill_tag_invalid');
    return Object.freeze({
      id: question.id, studyTarget: 'en', learnerSourceLocale: 'ru', level: question.level, availability: 'active', skillTag, difficulty: question.difficulty, rand: question.rand,
      question: question.question, options: question.options, correct: question.correct, correctIndex: question.correctIndex,
      sourceStageId, artifactId: batch.artifactId, contentHash: input.stage.contentHash, topicArtifactId: batch.topicArtifactId, revision: 1, publishedAtMs: input.nowMs, publishedBy: actorId,
    });
  });
  return input.repository.publishAtomic({
    stageId: sourceStageId,
    expectedReviewFingerprint: input.expectedReviewFingerprint,
    artifactId: batch.artifactId,
    contentHash: input.stage.contentHash,
    objectGeneration: input.stage.objectGeneration,
    sourceStageId,
    questions: Object.freeze(questions),
    audit: Object.freeze({ actorUid: actorId, role: actorRole, timestamp: new Date(input.nowMs).toISOString() }),
  });
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
