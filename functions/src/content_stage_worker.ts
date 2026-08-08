import { createHash, randomUUID } from 'node:crypto';
import * as admin from 'firebase-admin';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { hasAdminRole } from './admin/roles';
import { hasPermission } from './admin/permissions';
import { resolveJobConfig, assertJobEnabled } from './openai_jobs_config';
import { createOpenAiGenerationProvider } from './content_factory/generation_provider';
import { buildPromptContext } from './content_factory/prompt_context';
import { buildStagePromptPacket } from './content_factory/prompt_registry';
import { GenerationStageSchemaError, runGenerationStage, type StageGenerationProvider } from './content_factory/stage_runner';
import type { GenerationStageKind } from './content_factory/stage_contracts';
import { writeImmutableObject, type ArtifactBucketLike } from './content_factory/artifact_storage';
import { reserveContentFactoryBudget } from './content_factory/content_factory_budget';
import { buildGenerationFailureRecord } from './content_factory/generation_errors';
import { acquireStageLease, canCommitStageLease } from './content_factory/stage_lease';
import { lessonIdFromScopeId, lessonLedgerDocumentId, loadApprovedLessonGrounding, loadApprovedOutlineGrounding, prepareDerivedLessonGrounding, type GroundingBucketLike } from './content_factory/prerequisite_grounding';
import { parseLessonLedger } from './content_factory/dedupe_ledger';
import { ENGLISH_THEORY_EXEMPLAR_REGISTRY } from './content_factory/english_theory_exemplars.generated';
import { retrieveTheoryExemplars } from './content_factory/theory_generation';
import { parseSourceRegistryReference, sourceRegistryDocId, type SourceRegistry } from './content_factory/source_registry';
import { buildLessonOutlineGrounding } from './content_factory/outline_grounding';
import { loadApprovedTopicGrounding, loadQuestionBatchForReview, type StudioGroundingBucketLike } from './content_factory/challenge_grounding';
import { parseQuestionBatchLedger, previousQuestionKeys, questionLedgerDocumentId } from './content_factory/question_batch_ledger';
import { questionSemanticKey } from './content_factory/challenge_artifacts';
import { loadApprovedFlashcardPackIdea, loadFlashcardBatchForReview, type FlashcardGroundingBucketLike } from './content_factory/flashcard_grounding';
import { flashcardSemanticKey } from './content_factory/flashcard_artifacts';
import { flashcardRegistryDocumentId } from './content_factory/flashcard_semantic_registry';
import { flashcardLedgerDocumentId, parseFlashcardPackLedger, previousFlashcardKeys, type FlashcardPackLedger } from './content_factory/flashcard_pack_ledger';
import { createFlashcardPartialCheckpoint, mergeFlashcardPartialCheckpoint, parseFlashcardPartialCheckpoint, type FlashcardPartialCheckpoint } from './content_factory/flashcard_partial_checkpoint';
import { buildGenerationTerminalAudit } from './content_factory/generation_audit';
import { runGuardedGenerationTransaction } from './content_factory/generation_execution';
import { buildArtifactOrphanCandidate } from './content_factory/artifact_retention';
import { generateLessonPhraseChunks, LessonPhraseCheckpointSuperseded } from './content_factory/lesson_phrase_generation';
import { disabledShadowJudgeReceipt, runShadowJudge, shadowJudgeConfigErrorReceipt } from './content_factory/shadow_judge';
import { commitShadowJudgeReceipt, loadShadowJudgeConfig, reserveShadowJudgeBudget } from './content_factory/shadow_judge_repository';
import { contentStageReviewFingerprint } from './content_factory/review_fingerprint';
export { flashcardLedgerDocumentId } from './content_factory/flashcard_pack_ledger';

const REGION = 'us-central1';
const STAGE_ID_RE = /^[A-Za-z0-9._:-]{1,500}$/;
const STAGE_LEASE_MS = 10 * 60 * 1000;
export const CONTENT_STAGE_OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

export function parseRunContentStageRequest(data: unknown): { stageId: string } {
  const record = typeof data === 'object' && data !== null && !Array.isArray(data) ? data as Record<string, unknown> : {};
  const stageId = String(record.stageId ?? '').trim();
  if (Object.keys(record).some((key) => key !== 'stageId') || !STAGE_ID_RE.test(stageId)) throw new HttpsError('invalid-argument', 'content_stage_run_invalid');
  return Object.freeze({ stageId });
}

export function contentStageLeaseTokenHash(leaseToken: string): string {
  if (!/^[A-Za-z0-9._-]{1,160}$/.test(leaseToken)) throw new Error('content_stage_lease_token_invalid');
  return createHash('sha256').update(leaseToken).digest('hex');
}

export function contentStageObjectPathFromHash(stageId: string, revision: number, attempt: number, leaseTokenHash: string): string {
  if (!STAGE_ID_RE.test(stageId) || !Number.isSafeInteger(revision) || revision < 1 || !Number.isSafeInteger(attempt) || attempt < 1 || !/^[a-f0-9]{64}$/.test(leaseTokenHash)) throw new Error('content_stage_object_identity_invalid');
  return `content-factory-stages/${createHash('sha256').update(stageId).digest('hex')}/r${revision}/a${attempt}-${leaseTokenHash}.json`;
}

export function contentStageObjectPath(stageId: string, revision: number, attempt: number, leaseToken: string): string {
  return contentStageObjectPathFromHash(stageId, revision, attempt, contentStageLeaseTokenHash(leaseToken));
}

function boundedFlashcardKeys(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return Object.freeze([]);
  if (value.length > 1000) throw new Error('flashcard_grounding_keys_too_many');
  const keys = value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter((item) => item.length > 0 && item.length <= 2000);
  return Object.freeze([...new Set(keys)]);
}

export function flashcardKeysFromLessonPhrases(phrases: readonly unknown[]): readonly string[] {
  return boundedFlashcardKeys(phrases.map((value) => {
    const phrase = typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
    return flashcardSemanticKey({ front: phrase.targetText, back: phrase.sourceText });
  }).filter((key) => key !== '\u0000'));
}

export function flashcardKeysFromPublishedPacks(packs: readonly unknown[], studyTarget: string, sourceLocale: string): readonly string[] {
  if (studyTarget !== 'en') return Object.freeze([]);
  const keys: string[] = [];
  for (const value of packs) {
    const pack = typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
    if (pack.listingStatus !== 'published' || String(pack.studyTarget ?? 'en') !== studyTarget || !Array.isArray(pack.cards)) continue;
    for (const rawCard of pack.cards) {
      const card = typeof rawCard === 'object' && rawCard !== null && !Array.isArray(rawCard) ? rawCard as Record<string, unknown> : {};
      const sourceLocales = typeof card.sourceLocales === 'object' && card.sourceLocales !== null && !Array.isArray(card.sourceLocales) ? card.sourceLocales as Record<string, unknown> : {};
      const back = sourceLocale === 'ru' || sourceLocale === 'uk' || sourceLocale === 'es' ? card[sourceLocale] : sourceLocales[sourceLocale];
      const key = flashcardSemanticKey({ front: card.en, back });
      if (key !== '\u0000') keys.push(key);
    }
  }
  return boundedFlashcardKeys(keys);
}

export async function loadPublishedFlashcardKeysWithRegistry(db: FirebaseFirestore.Firestore, studyTarget: string, sourceLocale: string) {
  const configSnapshot = await db.collection('content_factory_config').doc('flashcard_semantic_registry').get();
  const config = configSnapshot.data() ?? {};
  const catalogGeneration = Number(config.catalogGeneration ?? 0); const verifiedGeneration = Number(config.verifiedGeneration ?? -1);
  if (config.mode === 'registry' && config.manifestComplete === true && Number.isSafeInteger(catalogGeneration) && catalogGeneration === verifiedGeneration) {
    return Object.freeze({ authority: 'registry' as const, keys: Object.freeze([]), cutoverEligible: true, comparison: null });
  }
  const publishedSnapshot = await db.collection('community_packs').where('listingStatus', '==', 'published').limit(501).get();
  if (publishedSnapshot.size > 500) throw new Error('flashcard_published_catalog_registry_required');
  const legacyKeys = flashcardKeysFromPublishedPacks(publishedSnapshot.docs.map((item) => item.data()), studyTarget, sourceLocale);
  return Object.freeze({ authority: 'legacy' as const, keys: legacyKeys, cutoverEligible: false, comparison: null });
}

export async function findPublishedFlashcardDuplicateKeys(db: FirebaseFirestore.Firestore, studyTarget: string, sourceLocale: string, items: readonly unknown[]): Promise<readonly string[]> {
  if (items.length > 20) throw new Error('flashcard_candidate_keys_too_many');
  const config = (await db.collection('content_factory_config').doc('flashcard_semantic_registry').get()).data() ?? {};
  if (config.mode !== 'registry' || config.manifestComplete !== true || Number(config.catalogGeneration ?? 0) !== Number(config.verifiedGeneration ?? -1)) return Object.freeze([]);
  const partition = { surface: 'community_flashcards' as const, studyTarget, sourceLocale };
  const keys = [...new Set(items.map(flashcardSemanticKey).filter((key) => key && key !== '\u0000'))];
  const refs = keys.map((key) => db.collection('content_factory_flashcard_semantic_keys').doc(flashcardRegistryDocumentId(partition, key)));
  const snapshots = refs.length ? await db.getAll(...refs) : [];
  return Object.freeze(keys.filter((_key, index) => snapshots[index]?.exists));
}

export function buildFlashcardItemsWorkerGrounding(
  loaded: { readonly artifactId: string; readonly contentHash: string; readonly packIdea: Readonly<Record<string, unknown>> },
  ledger: FlashcardPackLedger,
  stage: { readonly lessonCardKeys?: unknown; readonly publishedCardKeys?: unknown },
) {
  return Object.freeze({ ...loaded, previousCardKeys: boundedFlashcardKeys(previousFlashcardKeys(ledger)), lessonCardKeys: boundedFlashcardKeys(stage.lessonCardKeys), publishedCardKeys: boundedFlashcardKeys(stage.publishedCardKeys) });
}

export function buildFlashcardPartialRetryGrounding(base: Readonly<Record<string, unknown>>, checkpoint: FlashcardPartialCheckpoint) {
  const previous = boundedFlashcardKeys([...(Array.isArray(base.previousCardKeys) ? base.previousCardKeys : []), ...checkpoint.acceptedSemanticKeys]);
  return Object.freeze({ ...base, previousCardKeys: previous, acceptedCardIds: checkpoint.acceptedIds, acceptedCardKeys: checkpoint.acceptedSemanticKeys, acceptedCount: checkpoint.acceptedCount, missingCount: checkpoint.missingCount });
}

export function flashcardPartialFailureState(active: FlashcardPartialCheckpoint | null, created: FlashcardPartialCheckpoint | null) {
  const checkpoint = created ?? active;
  if (!checkpoint) return null;
  return Object.freeze({ errorCode: created ? 'provider_schema_partial' : 'provider_schema_partial_refill', errorMessage: created ? 'flashcard_partial_checkpoint_ready' : 'flashcard_partial_refill_failed', retryable: true, checkpoint, acceptedCount: checkpoint.acceptedCount, missingCount: checkpoint.missingCount });
}

export function buildFlashcardReplacementWorkerGrounding(
  loaded: { readonly artifactId: string; readonly packIdeaArtifactId: string; readonly items: readonly unknown[] },
  ledger: FlashcardPackLedger,
  stage: { readonly replacementForCardId: string; readonly batchGroundingReceipt?: unknown; readonly lessonCardKeys?: unknown; readonly publishedCardKeys?: unknown },
) {
  const replacementForCardId = String(stage.replacementForCardId ?? '').trim();
  const originalCard = loaded.items.find((value) => typeof value === 'object' && value !== null && String((value as Record<string, unknown>).id ?? '').trim() === replacementForCardId);
  if (!originalCard) throw new Error('flashcard_replacement_original_not_found');
  const originalKey = flashcardSemanticKey(originalCard);
  const receipt = typeof stage.batchGroundingReceipt === 'object' && stage.batchGroundingReceipt !== null && !Array.isArray(stage.batchGroundingReceipt) ? stage.batchGroundingReceipt as Record<string, unknown> : {};
  const withoutOriginal = (keys: readonly string[]) => Object.freeze(keys.filter((key) => key !== originalKey));
  const lessonCardKeys = boundedFlashcardKeys([...(Array.isArray(receipt.lessonCardKeys) ? receipt.lessonCardKeys : []), ...(Array.isArray(stage.lessonCardKeys) ? stage.lessonCardKeys : [])]);
  const publishedCardKeys = boundedFlashcardKeys([...(Array.isArray(receipt.publishedCardKeys) ? receipt.publishedCardKeys : []), ...(Array.isArray(stage.publishedCardKeys) ? stage.publishedCardKeys : [])]);
  return Object.freeze({
    batchArtifactId: loaded.artifactId,
    packIdeaArtifactId: loaded.packIdeaArtifactId,
    replacementForCardId,
    originalCard,
    packIdea: typeof receipt.packIdea === 'object' && receipt.packIdea !== null ? receipt.packIdea : {},
    previousCardKeys: withoutOriginal(boundedFlashcardKeys(previousFlashcardKeys(ledger))),
    lessonCardKeys: withoutOriginal(lessonCardKeys),
    publishedCardKeys: withoutOriginal(publishedCardKeys),
  });
}

export function resolveContentStageCount(kind: GenerationStageKind, requestedCount: number, grounding: Readonly<Record<string, unknown>> | null = null): number {
  if (kind === 'lesson_outline' || kind === 'lesson_theory') return 1;
  if (kind === 'lesson_phrases') return 50;
  if (kind === 'challenge_questions') return 10;
  if (kind === 'challenge_question_replacement') return 1;
  if (kind === 'flashcard_item_replacement') return 1;
  if (kind === 'flashcard_items' && (!Number.isSafeInteger(requestedCount) || requestedCount < 1 || requestedCount > 20)) throw new Error('flashcard_batch_count_must_be_1_to_20');
  if (kind === 'lesson_vocabulary' || kind === 'lesson_irregular_verbs' || kind === 'lesson_prepositions') return Array.isArray(grounding?.acceptedCandidates) ? grounding.acceptedCandidates.length : 0;
  return requestedCount;
}

export function contentStageGroundingReceipt(grounding: Readonly<Record<string, unknown>> | null): Readonly<Record<string, unknown>> | null {
  if (!grounding) return null;
  if (typeof grounding.batchArtifactId === 'string' && typeof grounding.replacementForCardId === 'string' && typeof grounding.originalCard === 'object') return Object.freeze({ batchArtifactId: grounding.batchArtifactId, packIdeaArtifactId: grounding.packIdeaArtifactId, replacementForCardId: grounding.replacementForCardId, originalCard: grounding.originalCard, packIdea: grounding.packIdea, previousCardKeys: grounding.previousCardKeys, lessonCardKeys: grounding.lessonCardKeys, publishedCardKeys: grounding.publishedCardKeys });
  if (typeof grounding.batchArtifactId === 'string' && typeof grounding.replacementForQuestionId === 'string' && typeof grounding.originalQuestion === 'object') return Object.freeze({ batchArtifactId: grounding.batchArtifactId, topicArtifactId: grounding.topicArtifactId, replacementForQuestionId: grounding.replacementForQuestionId, originalQuestion: grounding.originalQuestion, topic: grounding.topic, previousQuestionKeys: grounding.previousQuestionKeys });
  if (typeof grounding.artifactId === 'string' && typeof grounding.contentHash === 'string' && typeof grounding.topic === 'object') return Object.freeze({ topicArtifactId: grounding.artifactId, topicContentHash: grounding.contentHash, topic: grounding.topic, previousQuestionKeys: grounding.previousQuestionKeys });
  if (typeof grounding.artifactId === 'string' && typeof grounding.contentHash === 'string' && typeof grounding.packIdea === 'object') return Object.freeze({ packIdeaArtifactId: grounding.artifactId, packIdeaContentHash: grounding.contentHash, packIdea: grounding.packIdea, previousCardKeys: grounding.previousCardKeys, lessonCardKeys: grounding.lessonCardKeys, publishedCardKeys: grounding.publishedCardKeys });
  if (typeof grounding.artifactId === 'string' && typeof grounding.contentHash === 'string' && typeof grounding.outline === 'object') return Object.freeze({ outlineArtifactId: grounding.artifactId, outlineContentHash: grounding.contentHash, outline: grounding.outline, blueprintGrounding: grounding.blueprintGrounding });
  if (typeof grounding.registryId === 'string' && typeof grounding.blueprintHash === 'string' && typeof grounding.blueprintLesson === 'object') return Object.freeze({ registryId: grounding.registryId, blueprintHash: grounding.blueprintHash, blueprintLesson: grounding.blueprintLesson, evidenceIds: grounding.evidenceIds });
  if (Array.isArray(grounding.acceptedCandidates)) return Object.freeze({
    phraseArtifactId: grounding.phraseArtifactId,
    phraseContentHash: grounding.phraseContentHash,
    extractedCandidates: grounding.extractedCandidates,
    acceptedCandidates: grounding.acceptedCandidates,
    excludedPrevious: grounding.excludedPrevious,
    rejectedCandidates: grounding.rejectedCandidates,
  });
  if (Array.isArray(grounding.exemplars)) return Object.freeze({
    phraseArtifactId: grounding.phraseArtifactId,
    phraseContentHash: grounding.phraseContentHash,
    theoryRegistryId: grounding.theoryRegistryId,
    theoryRegistryVersion: grounding.theoryRegistryVersion,
    theoryRegistryHash: grounding.theoryRegistryHash,
    exemplarIds: grounding.exemplars.map((value) => typeof value === 'object' && value !== null ? String((value as Record<string, unknown>).exemplarId ?? '') : '').filter(Boolean),
  });
  return Object.freeze({});
}

export async function generateContentStageArtifact(input: {
  provider: StageGenerationProvider;
  model: string;
  stage: {
    stageId: string;
    kind: GenerationStageKind;
    promptVersion: string;
    studyTarget: string;
    sourceLocale: string;
    cefr: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
    objective: string;
    count: number;
    approvedArtifactIds: readonly string[];
    exemplarIds: readonly string[];
    previousContentFingerprints: readonly string[];
    revision: number;
    attempt: number;
    leaseToken: string;
    grounding?: Readonly<Record<string, unknown>> | null;
  };
}) {
  const context = buildPromptContext({ studyTarget: input.stage.studyTarget, sourceLocale: input.stage.sourceLocale, cefr: input.stage.cefr, objective: input.stage.objective, count: input.stage.count, approvedArtifactIds: input.stage.approvedArtifactIds, exemplarIds: input.stage.exemplarIds, previousContentFingerprints: input.stage.previousContentFingerprints });
  const packet = buildStagePromptPacket(input.stage.kind, input.stage.promptVersion, context, input.stage.grounding ?? null);
  const result = await runGenerationStage({ provider: input.provider, model: input.model, packet });
  return Object.freeze({ ...result, objectPath: contentStageObjectPath(input.stage.stageId, input.stage.revision, input.stage.attempt, input.stage.leaseToken) });
}

export const adminRunContentStage = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, secrets: [CONTENT_STAGE_OPENAI_API_KEY], timeoutSeconds: 300, memory: '1GiB' }, async (request) => {
  // зачем: adminRole в проекте никем не выдаётся — флага admin достаточно, роль по умолчанию owner.
  const stageRole = hasAdminRole(request.auth?.token?.adminRole) ? request.auth.token.adminRole : 'owner';
  if (!request.auth?.token?.admin || !hasPermission(stageRole, 'content.draft.write')) throw new HttpsError('permission-denied', 'Role cannot generate content stages');
  const actorUid = request.auth.uid;
  const role = request.auth.token.adminRole;
  const { stageId } = parseRunContentStageRequest(request.data);
  const db = admin.firestore();
  const stageRef = db.collection('content_factory_stages').doc(stageId);
  const nowMs = Date.now();
  const requestedLeaseToken = randomUUID();
  const lease = await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(stageRef);
    if (!snapshot.exists) throw new HttpsError('not-found', 'content_stage_not_found');
    const stage = snapshot.data() ?? {};
    const decision = acquireStageLease(stage, { nowMs, leaseMs: STAGE_LEASE_MS, leaseToken: requestedLeaseToken });
    if (decision.action === 'busy') throw new HttpsError('aborted', 'content_stage_already_running');
    if (decision.action === 'blocked') throw new HttpsError('failed-precondition', 'content_stage_not_runnable');
    if (decision.action === 'replay') return decision;
    tx.update(stageRef, { state: 'running', attempts: decision.attempt, leaseToken: decision.leaseToken, leaseExpiresAtMs: decision.leaseExpiresAtMs, startedAtMs: nowMs, startedAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    return decision;
  });
  if (lease.action === 'replay') return { ok: true, stageId, replayed: true };
  const attempt = lease.attempt;
  let checkpointToPersist: FlashcardPartialCheckpoint | null = null;
  let activeFlashcardCheckpoint: FlashcardPartialCheckpoint | null = null;
  let baseFlashcardGrounding: Readonly<Record<string, unknown>> | null = null;
  try {
    const snapshot = await stageRef.get();
    const stage = snapshot.data() ?? {};
    let grounding: Readonly<Record<string, unknown>> | null = null;
    let resolvedCount = Number(stage.count);
    if (stage.kind === 'lesson_outline') {
      let reference;
      try { reference = parseSourceRegistryReference(String(stage.blueprintVersion ?? '')); } catch { throw new HttpsError('failed-precondition', 'source_registry_reference_invalid'); }
      const registrySnapshot = await db.collection('content_factory_source_registry').doc(sourceRegistryDocId(reference.blueprintId, reference.version)).get();
      if (!registrySnapshot.exists) throw new HttpsError('failed-precondition', 'source_registry_not_found');
      try { grounding = buildLessonOutlineGrounding(registrySnapshot.data() as SourceRegistry, lessonIdFromScopeId(String(stage.scopeId ?? ''))); } catch (error) { throw new HttpsError('failed-precondition', error instanceof Error ? error.message : 'lesson_blueprint_invalid'); }
      resolvedCount = resolveContentStageCount('lesson_outline', resolvedCount, grounding);
    }
    if (stage.kind === 'lesson_phrases') {
      const prerequisiteStageIds = Array.isArray(stage.prerequisiteStageIds) ? stage.prerequisiteStageIds.map(String) : [];
      if (prerequisiteStageIds.length !== 1) throw new HttpsError('failed-precondition', 'lesson_outline_prerequisite_required');
      const prerequisiteSnapshot = await db.collection('content_factory_stages').doc(prerequisiteStageIds[0]).get();
      if (!prerequisiteSnapshot.exists) throw new HttpsError('failed-precondition', 'lesson_outline_prerequisite_missing');
      const prerequisite = prerequisiteSnapshot.data() ?? {};
      try {
        grounding = await loadApprovedOutlineGrounding(admin.storage().bucket() as unknown as GroundingBucketLike, { stageId: prerequisiteSnapshot.id, artifactId: String(prerequisite.artifactId ?? ''), kind: String(prerequisite.kind ?? ''), state: String(prerequisite.state ?? ''), studyTarget: String(prerequisite.studyTarget ?? ''), cefr: String(prerequisite.cefr ?? ''), promptVersion: String(prerequisite.promptVersion ?? ''), objectPath: String(prerequisite.objectPath ?? ''), contentHash: String(prerequisite.contentHash ?? ''), objectGeneration: String(prerequisite.objectGeneration ?? ''), groundingReceipt: prerequisite.groundingReceipt });
      } catch (error) { throw new HttpsError('failed-precondition', error instanceof Error ? error.message : 'lesson_outline_grounding_invalid'); }
      resolvedCount = resolveContentStageCount('lesson_phrases', resolvedCount, grounding);
    }
    if (['lesson_vocabulary', 'lesson_irregular_verbs', 'lesson_prepositions'].includes(String(stage.kind))) {
      const prerequisiteStageIds = Array.isArray(stage.prerequisiteStageIds) ? stage.prerequisiteStageIds.map(String) : [];
      if (prerequisiteStageIds.length !== 1) throw new HttpsError('failed-precondition', 'lesson_grounding_prerequisite_required');
      const prerequisiteSnapshot = await db.collection('content_factory_stages').doc(prerequisiteStageIds[0]).get();
      if (!prerequisiteSnapshot.exists) throw new HttpsError('failed-precondition', 'lesson_grounding_prerequisite_missing');
      const prerequisite = prerequisiteSnapshot.data() ?? {};
      const loaded = await loadApprovedLessonGrounding(admin.storage().bucket() as unknown as GroundingBucketLike, { stageId: prerequisiteSnapshot.id, artifactId: String(prerequisite.artifactId ?? ''), kind: String(prerequisite.kind ?? ''), state: String(prerequisite.state ?? ''), studyTarget: String(prerequisite.studyTarget ?? ''), cefr: String(prerequisite.cefr ?? ''), promptVersion: String(prerequisite.promptVersion ?? ''), groundingReceipt: prerequisite.groundingReceipt, objectPath: String(prerequisite.objectPath ?? ''), contentHash: String(prerequisite.contentHash ?? ''), objectGeneration: String(prerequisite.objectGeneration ?? '') });
      const ledgerSnapshot = await db.collection('content_factory_lesson_ledgers').doc(lessonLedgerDocumentId(String(stage.requestId ?? ''), String(stage.studyTarget ?? ''))).get();
      const ledger = parseLessonLedger(ledgerSnapshot.exists ? ledgerSnapshot.data() : undefined, String(stage.studyTarget ?? ''));
      grounding = prepareDerivedLessonGrounding({ kind: String(stage.kind) as 'lesson_vocabulary' | 'lesson_irregular_verbs' | 'lesson_prepositions', lessonId: lessonIdFromScopeId(String(stage.scopeId ?? '')), phraseArtifactId: String(prerequisite.artifactId ?? ''), loaded, ledger });
      resolvedCount = resolveContentStageCount(String(stage.kind) as GenerationStageKind, resolvedCount, grounding);
      if (resolvedCount < 1) throw new HttpsError('failed-precondition', 'lesson_no_new_candidates');
    }
    if (stage.kind === 'lesson_theory') {
      const prerequisiteStageIds = Array.isArray(stage.prerequisiteStageIds) ? stage.prerequisiteStageIds.map(String) : [];
      if (prerequisiteStageIds.length !== 1) throw new HttpsError('failed-precondition', 'lesson_grounding_prerequisite_required');
      const prerequisiteSnapshot = await db.collection('content_factory_stages').doc(prerequisiteStageIds[0]).get();
      if (!prerequisiteSnapshot.exists) throw new HttpsError('failed-precondition', 'lesson_grounding_prerequisite_missing');
      const prerequisite = prerequisiteSnapshot.data() ?? {};
      const loaded = await loadApprovedLessonGrounding(admin.storage().bucket() as unknown as GroundingBucketLike, { stageId: prerequisiteSnapshot.id, artifactId: String(prerequisite.artifactId ?? ''), kind: String(prerequisite.kind ?? ''), state: String(prerequisite.state ?? ''), studyTarget: String(prerequisite.studyTarget ?? ''), cefr: String(prerequisite.cefr ?? ''), promptVersion: String(prerequisite.promptVersion ?? ''), groundingReceipt: prerequisite.groundingReceipt, objectPath: String(prerequisite.objectPath ?? ''), contentHash: String(prerequisite.contentHash ?? ''), objectGeneration: String(prerequisite.objectGeneration ?? '') });
      const lessonId = lessonIdFromScopeId(String(stage.scopeId ?? ''));
      const selection = retrieveTheoryExemplars(ENGLISH_THEORY_EXEMPLAR_REGISTRY, { objective: String(stage.objective ?? ''), approvedTargetPhrases: loaded.phrases.map((item) => String(item.targetText ?? '')), requiredExemplarIds: [`english-lesson-${lessonId}`] });
      if (selection.state !== 'ready') throw new HttpsError('failed-precondition', 'theory_exemplar_conflict');
      grounding = Object.freeze({ phraseArtifactId: String(prerequisite.artifactId ?? ''), phraseContentHash: loaded.contentHash, phrases: loaded.phrases, theoryRegistryId: ENGLISH_THEORY_EXEMPLAR_REGISTRY.registryId, theoryRegistryVersion: ENGLISH_THEORY_EXEMPLAR_REGISTRY.version, theoryRegistryHash: ENGLISH_THEORY_EXEMPLAR_REGISTRY.registryHash, exemplars: selection.exemplars });
      resolvedCount = resolveContentStageCount('lesson_theory', resolvedCount, grounding);
    }
    if (stage.kind === 'flashcard_items') {
      const prerequisiteStageIds = Array.isArray(stage.prerequisiteStageIds) ? stage.prerequisiteStageIds.map(String) : [];
      if (prerequisiteStageIds.length < 1 || prerequisiteStageIds.length > 2) throw new HttpsError('failed-precondition', 'flashcard_pack_idea_prerequisite_required');
      const prerequisiteSnapshots = await Promise.all(prerequisiteStageIds.map((id) => db.collection('content_factory_stages').doc(id).get()));
      if (prerequisiteSnapshots.some((item) => !item.exists)) throw new HttpsError('failed-precondition', 'flashcard_prerequisite_missing');
      const ideaSnapshots = prerequisiteSnapshots.filter((item) => item.data()?.kind === 'flashcard_pack_idea');
      const lessonSnapshots = prerequisiteSnapshots.filter((item) => item.data()?.kind === 'lesson_phrases');
      if (ideaSnapshots.length !== 1 || lessonSnapshots.length > 1 || ideaSnapshots.length + lessonSnapshots.length !== prerequisiteSnapshots.length) throw new HttpsError('failed-precondition', 'flashcard_prerequisite_kind_invalid');
      const prerequisiteSnapshot = ideaSnapshots[0]; const prerequisite = prerequisiteSnapshot.data() ?? {};
      try {
        const loaded = await loadApprovedFlashcardPackIdea(admin.storage().bucket() as unknown as FlashcardGroundingBucketLike, { artifactId: String(prerequisite.artifactId ?? ''), kind: 'flashcard_pack_idea', state: String(prerequisite.state ?? ''), cefr: String(prerequisite.cefr ?? ''), objectPath: String(prerequisite.objectPath ?? ''), contentHash: String(prerequisite.contentHash ?? ''), objectGeneration: String(prerequisite.objectGeneration ?? '') });
        const ledgerSnapshot = await db.collection('content_factory_flashcard_ledgers').doc(flashcardLedgerDocumentId(String(stage.requestId ?? ''), loaded.artifactId)).get();
        const ledger = parseFlashcardPackLedger(ledgerSnapshot.exists ? ledgerSnapshot.data() : undefined, loaded.artifactId);
        let lessonCardKeys: readonly string[] = [];
        if (lessonSnapshots.length === 1) {
          const lessonSnapshot = lessonSnapshots[0]; const lesson = lessonSnapshot.data() ?? {};
          const loadedLesson = await loadApprovedLessonGrounding(admin.storage().bucket() as unknown as GroundingBucketLike, { stageId: lessonSnapshot.id, artifactId: String(lesson.artifactId ?? ''), kind: String(lesson.kind ?? ''), state: String(lesson.state ?? ''), studyTarget: String(lesson.studyTarget ?? ''), cefr: String(lesson.cefr ?? ''), promptVersion: String(lesson.promptVersion ?? ''), groundingReceipt: lesson.groundingReceipt, objectPath: String(lesson.objectPath ?? ''), contentHash: String(lesson.contentHash ?? ''), objectGeneration: String(lesson.objectGeneration ?? '') });
          lessonCardKeys = flashcardKeysFromLessonPhrases(loadedLesson.phrases);
        }
        const publishedResolution = await loadPublishedFlashcardKeysWithRegistry(db, String(stage.studyTarget ?? ''), String(stage.sourceLocale ?? ''));
        const publishedCardKeys = publishedResolution.keys;
        grounding = buildFlashcardItemsWorkerGrounding(loaded, ledger, { lessonCardKeys, publishedCardKeys });
        baseFlashcardGrounding = grounding;
        if (stage.flashcardPartialCheckpoint !== undefined) {
          activeFlashcardCheckpoint = parseFlashcardPartialCheckpoint(stage.flashcardPartialCheckpoint, Number(stage.count));
          grounding = buildFlashcardPartialRetryGrounding(grounding, activeFlashcardCheckpoint);
        }
      } catch (error) { throw new HttpsError('failed-precondition', error instanceof Error ? error.message : 'flashcard_pack_grounding_invalid'); }
      resolvedCount = activeFlashcardCheckpoint?.missingCount ?? resolveContentStageCount('flashcard_items', resolvedCount, grounding);
    }
    if (stage.kind === 'flashcard_item_replacement') {
      const prerequisiteStageIds = Array.isArray(stage.prerequisiteStageIds) ? stage.prerequisiteStageIds.map(String) : [];
      if (prerequisiteStageIds.length !== 1) throw new HttpsError('failed-precondition', 'flashcard_batch_prerequisite_required');
      const prerequisiteSnapshot = await db.collection('content_factory_stages').doc(prerequisiteStageIds[0]).get();
      if (!prerequisiteSnapshot.exists) throw new HttpsError('failed-precondition', 'flashcard_batch_prerequisite_missing');
      const prerequisite = prerequisiteSnapshot.data() ?? {};
      if (prerequisite.kind !== 'flashcard_items') throw new HttpsError('failed-precondition', 'flashcard_batch_prerequisite_kind_invalid');
      try {
        const loaded = await loadFlashcardBatchForReview(admin.storage().bucket() as unknown as FlashcardGroundingBucketLike, { artifactId: String(prerequisite.artifactId ?? ''), kind: 'flashcard_items', state: String(prerequisite.state ?? ''), count: Number(prerequisite.resolvedCount ?? prerequisite.count), objectPath: String(prerequisite.objectPath ?? ''), contentHash: String(prerequisite.contentHash ?? ''), objectGeneration: String(prerequisite.objectGeneration ?? ''), groundingReceipt: prerequisite.groundingReceipt });
        const ledgerSnapshot = await db.collection('content_factory_flashcard_ledgers').doc(flashcardLedgerDocumentId(String(stage.requestId ?? ''), loaded.packIdeaArtifactId)).get();
        const ledger = parseFlashcardPackLedger(ledgerSnapshot.exists ? ledgerSnapshot.data() : undefined, loaded.packIdeaArtifactId);
        const publishedResolution = await loadPublishedFlashcardKeysWithRegistry(db, String(stage.studyTarget ?? ''), String(stage.sourceLocale ?? ''));
        const publishedCardKeys = publishedResolution.keys;
        grounding = buildFlashcardReplacementWorkerGrounding(loaded, ledger, { replacementForCardId: String(stage.replacementForCardId ?? ''), batchGroundingReceipt: prerequisite.groundingReceipt, lessonCardKeys: stage.lessonCardKeys, publishedCardKeys });
      } catch (error) { throw new HttpsError('failed-precondition', error instanceof Error ? error.message : 'flashcard_replacement_grounding_invalid'); }
      resolvedCount = resolveContentStageCount('flashcard_item_replacement', resolvedCount, grounding);
    }
    if (stage.kind === 'challenge_questions') {
      const prerequisiteStageIds = Array.isArray(stage.prerequisiteStageIds) ? stage.prerequisiteStageIds.map(String) : [];
      if (prerequisiteStageIds.length !== 1) throw new HttpsError('failed-precondition', 'studio_topic_prerequisite_required');
      const prerequisiteSnapshot = await db.collection('content_factory_stages').doc(prerequisiteStageIds[0]).get();
      if (!prerequisiteSnapshot.exists) throw new HttpsError('failed-precondition', 'studio_topic_prerequisite_missing');
      const prerequisite = prerequisiteSnapshot.data() ?? {};
      const expectedKind = 'challenge_topic' as const;
      if (prerequisite.kind !== expectedKind) throw new HttpsError('failed-precondition', 'studio_topic_prerequisite_kind_invalid');
      try { grounding = await loadApprovedTopicGrounding(admin.storage().bucket() as unknown as StudioGroundingBucketLike, { stageId: prerequisiteSnapshot.id, artifactId: String(prerequisite.artifactId ?? ''), kind: expectedKind, state: String(prerequisite.state ?? ''), cefr: String(prerequisite.cefr ?? ''), objectPath: String(prerequisite.objectPath ?? ''), contentHash: String(prerequisite.contentHash ?? ''), objectGeneration: String(prerequisite.objectGeneration ?? '') }); } catch (error) { throw new HttpsError('failed-precondition', error instanceof Error ? error.message : 'studio_topic_grounding_invalid'); }
      const ledgerSnapshot = await db.collection('content_factory_question_ledgers').doc(questionLedgerDocumentId(String(stage.requestId ?? ''), String(prerequisite.artifactId ?? ''))).get();
      const ledger = parseQuestionBatchLedger(ledgerSnapshot.exists ? ledgerSnapshot.data() : undefined, String(prerequisite.artifactId ?? ''));
      grounding = Object.freeze({ ...grounding, previousQuestionKeys: previousQuestionKeys(ledger) });
      resolvedCount = resolveContentStageCount(String(stage.kind) as GenerationStageKind, resolvedCount, grounding);
    }
    if (stage.kind === 'challenge_question_replacement') {
      const prerequisiteStageIds = Array.isArray(stage.prerequisiteStageIds) ? stage.prerequisiteStageIds.map(String) : [];
      if (prerequisiteStageIds.length !== 1) throw new HttpsError('failed-precondition', 'question_replacement_batch_required');
      const batchSnapshot = await db.collection('content_factory_stages').doc(prerequisiteStageIds[0]).get();
      if (!batchSnapshot.exists) throw new HttpsError('failed-precondition', 'question_replacement_batch_missing');
      const batchStage = batchSnapshot.data() ?? {}; const expectedBatchKind = 'challenge_questions' as const;
      if (batchStage.kind !== expectedBatchKind) throw new HttpsError('failed-precondition', 'question_replacement_batch_kind_invalid');
      const batch = await loadQuestionBatchForReview(admin.storage().bucket() as unknown as StudioGroundingBucketLike, { stageId: batchSnapshot.id, artifactId: String(batchStage.artifactId ?? ''), kind: expectedBatchKind, state: String(batchStage.state ?? ''), objectPath: String(batchStage.objectPath ?? ''), contentHash: String(batchStage.contentHash ?? ''), objectGeneration: String(batchStage.objectGeneration ?? ''), groundingReceipt: batchStage.groundingReceipt });
      const replacementForQuestionId = String(stage.replacementForQuestionId ?? ''); const originalQuestion = batch.items.find((value) => typeof value === 'object' && value !== null && String((value as Record<string, unknown>).id ?? '') === replacementForQuestionId);
      if (!originalQuestion) throw new HttpsError('failed-precondition', 'question_replacement_original_missing');
      const ledgerSnapshot = await db.collection('content_factory_question_ledgers').doc(questionLedgerDocumentId(String(stage.requestId ?? ''), batch.topicArtifactId)).get();
      const ledger = parseQuestionBatchLedger(ledgerSnapshot.exists ? ledgerSnapshot.data() : undefined, batch.topicArtifactId); const originalKey = questionSemanticKey(originalQuestion);
      grounding = Object.freeze({ batchArtifactId: batch.artifactId, topicArtifactId: batch.topicArtifactId, replacementForQuestionId, originalQuestion, topic: batch.topic, previousQuestionKeys: previousQuestionKeys(ledger).filter((key) => key !== originalKey) });
      resolvedCount = resolveContentStageCount(String(stage.kind) as GenerationStageKind, resolvedCount, grounding);
    }
    const config = await resolveJobConfig(db, 'content_factory');
    assertJobEnabled(config, 'content_factory');
    const apiKey = String(CONTENT_STAGE_OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY || '').trim();
    if (!apiKey) throw new HttpsError('failed-precondition', 'OPENAI_API_KEY not configured');
    const provider = createOpenAiGenerationProvider(apiKey, { beforeProviderRequest: async (requestIndex) => { await reserveContentFactoryBudget(db, `${stageId}:attempt:${attempt}:provider-request:${requestIndex}`, config.globalDailyCap); } });
    let generated;
    try {
      const stageInput = { stageId, kind: String(stage.kind) as GenerationStageKind, promptVersion: String(stage.promptVersion), studyTarget: String(stage.studyTarget), sourceLocale: String(stage.sourceLocale), cefr: String(stage.cefr) as 'A1', objective: String(stage.objective), count: resolvedCount, approvedArtifactIds: Array.isArray(stage.prerequisiteArtifactIds) ? stage.prerequisiteArtifactIds.map(String) : [], exemplarIds: Array.isArray(stage.exemplarIds) ? stage.exemplarIds.map(String) : [], previousContentFingerprints: Array.isArray(stage.previousContentFingerprints) ? stage.previousContentFingerprints.map(String) : [], revision: Number(stage.revision), attempt, leaseToken: lease.leaseToken, grounding };
      if (stage.kind === 'lesson_phrases') {
        const context = buildPromptContext({ studyTarget: stageInput.studyTarget, sourceLocale: stageInput.sourceLocale, cefr: stageInput.cefr, objective: stageInput.objective, count: 50, approvedArtifactIds: stageInput.approvedArtifactIds, exemplarIds: stageInput.exemplarIds, previousContentFingerprints: stageInput.previousContentFingerprints });
        const basePacket = buildStagePromptPacket('lesson_phrases', stageInput.promptVersion, context, grounding);
        const chunked = await generateLessonPhraseChunks({ provider, model: config.model, basePacket, identity: { stageId, revision: stageInput.revision }, checkpoint: stage.lessonPhraseCheckpoint, persistCheckpoint: async (checkpoint) => runGuardedGenerationTransaction({ lease, allowedStates: ['running'], runTransaction: (handler: (transaction: admin.firestore.Transaction) => Promise<boolean>) => db.runTransaction(handler), read: async (tx) => { const current = await tx.get(stageRef); return { current: current.exists ? current.data() ?? {} : null, context: undefined }; }, commit: (tx) => { tx.update(stageRef, { lessonPhraseCheckpoint: checkpoint, acceptedCount: checkpoint.acceptedCount, missingCount: checkpoint.missingCount, checkpointUpdatedAtMs: Date.now(), updatedAt: admin.firestore.FieldValue.serverTimestamp() }); } }) });
        generated = Object.freeze({ artifact: chunked.artifact, attempts: chunked.attempts, receipt: chunked.receipt, checkpoint: chunked.checkpoint, objectPath: contentStageObjectPath(stageId, stageInput.revision, attempt, lease.leaseToken) });
      } else {
        generated = await generateContentStageArtifact({ provider, model: config.model, stage: stageInput });
      }
    } catch (error) {
      if (error instanceof LessonPhraseCheckpointSuperseded) return { ok: true, stageId, state: 'superseded', discarded: true, replayed: false };
      if (stage.kind === 'flashcard_items' && !activeFlashcardCheckpoint && error instanceof GenerationStageSchemaError) {
        checkpointToPersist = error.candidateArtifacts.map((candidate) => createFlashcardPartialCheckpoint(candidate, Number(stage.count), baseFlashcardGrounding)).filter((candidate): candidate is FlashcardPartialCheckpoint => Boolean(candidate)).sort((a, b) => b.acceptedCount - a.acceptedCount)[0] ?? null;
        if (checkpointToPersist) throw new Error('flashcard_partial_checkpoint_ready');
      }
      throw error;
    }
    const artifactForStorage = activeFlashcardCheckpoint
      ? mergeFlashcardPartialCheckpoint(activeFlashcardCheckpoint, generated.artifact, baseFlashcardGrounding)
      : generated.artifact;
    if (stage.kind === 'flashcard_items' || stage.kind === 'flashcard_item_replacement') {
      const artifactRecord = typeof artifactForStorage === 'object' && artifactForStorage !== null && !Array.isArray(artifactForStorage) ? artifactForStorage as Record<string, unknown> : {};
      const resultRecord = typeof artifactRecord.result === 'object' && artifactRecord.result !== null && !Array.isArray(artifactRecord.result) ? artifactRecord.result as Record<string, unknown> : {};
      const candidates = stage.kind === 'flashcard_items' && Array.isArray(artifactRecord.items) ? artifactRecord.items : resultRecord.item ? [resultRecord.item] : [];
      const publishedDuplicates = await findPublishedFlashcardDuplicateKeys(db, String(stage.studyTarget ?? ''), String(stage.sourceLocale ?? ''), candidates);
      if (publishedDuplicates.length) throw new Error(stage.kind === 'flashcard_items' ? 'flashcard_batch_published_duplicate' : 'flashcard_replacement_published_duplicate');
    }
    const completedLessonPhraseCheckpoint = stage.kind === 'lesson_phrases' && 'checkpoint' in generated ? generated.checkpoint : null;
    if (activeFlashcardCheckpoint) resolvedCount = activeFlashcardCheckpoint.requestedTotal;
    const groundingReceipt = contentStageGroundingReceipt(activeFlashcardCheckpoint ? baseFlashcardGrounding : grounding);
    const mayPersist = await db.runTransaction(async (tx) => {
      const current = await tx.get(stageRef);
      return current.exists && canCommitStageLease(current.data() ?? {}, lease);
    });
    if (!mayPersist) return { ok: true, stageId, state: 'superseded', discarded: true, replayed: false };
    const storageReceipt = await writeImmutableObject(admin.storage().bucket() as unknown as ArtifactBucketLike, generated.objectPath, artifactForStorage);
    const orphanCandidate = () => buildArtifactOrphanCandidate(storageReceipt, { entityCollection: 'content_factory_stages', entityId: stageId, attempt, detectedAtMs: Date.now() });
    const recordOrphan = async () => { const orphan = orphanCandidate(); await db.collection('content_factory_artifact_orphans').doc(orphan.candidateId).set(orphan, { merge: false }); };
    const committed = await runGuardedGenerationTransaction({
      lease, allowedStates: ['running'],
      runTransaction: (handler: (transaction: admin.firestore.Transaction) => Promise<boolean>) => db.runTransaction(handler),
      read: async (tx) => { const current = await tx.get(stageRef); return { current: current.exists ? current.data() ?? {} : null, context: undefined }; },
      commit: (tx, current) => {
      const audit = buildGenerationTerminalAudit({ actorUid, role, entity: { collection: 'content_factory_stages', id: stageId }, attempt, leaseToken: lease.leaseToken, outcome: 'needs_review', errorCategory: null, before: { state: current.state ?? null }, after: { state: 'needs_review', objectPath: storageReceipt.objectPath, contentHash: storageReceipt.contentHash } });
      tx.update(stageRef, { state: 'needs_review', objectPath: storageReceipt.objectPath, contentHash: storageReceipt.contentHash, objectGeneration: storageReceipt.objectGeneration, byteSize: storageReceipt.byteSize, artifactReferenceState: 'committed', artifactFinalizationKey: storageReceipt.finalizationKey, resolvedCount, groundingHash: generated.receipt.groundingHash, groundingReceipt, artifactAttempt: attempt, artifactLeaseTokenHash: contentStageLeaseTokenHash(lease.leaseToken), qaReceipt: generated.receipt, generationAttempts: generated.attempts, generatedAt: admin.firestore.FieldValue.serverTimestamp(), completedAtMs: Date.now(), updatedAt: admin.firestore.FieldValue.serverTimestamp(), retryable: false, flashcardPartialCheckpoint: admin.firestore.FieldValue.delete(), ...(completedLessonPhraseCheckpoint ? { lessonPhraseCheckpoint: completedLessonPhraseCheckpoint, acceptedCount: 50, missingCount: 0, finalCheckpointHash: completedLessonPhraseCheckpoint.contentHash } : { acceptedCount: admin.firestore.FieldValue.delete(), missingCount: admin.firestore.FieldValue.delete() }), leaseToken: admin.firestore.FieldValue.delete(), leaseExpiresAtMs: admin.firestore.FieldValue.delete(), errorCode: admin.firestore.FieldValue.delete(), errorMessage: admin.firestore.FieldValue.delete() });
      tx.create(db.collection('admin_log').doc(audit.operationId), audit);
      },
    }).catch(async (error) => { await recordOrphan(); throw error; });
    if (!committed) {
      await recordOrphan();
      return { ok: true, stageId, state: 'superseded', discarded: true, replayed: false };
    }
    try {
      const preJudgeSnapshot = await stageRef.get(); const preJudgeStage = preJudgeSnapshot.data() ?? {};
      if (preJudgeSnapshot.exists && preJudgeStage.state === 'needs_review' && preJudgeStage.contentHash === storageReceipt.contentHash) {
        const expectedReviewFingerprint = contentStageReviewFingerprint(stageId, preJudgeStage); const judgeConfig = await loadShadowJudgeConfig(db);
        let judgeReceipt: Readonly<Record<string, unknown>> = judgeConfig.configError ? shadowJudgeConfigErrorReceipt(storageReceipt.contentHash, generated.receipt.groundingHash, judgeConfig.configError) : disabledShadowJudgeReceipt(storageReceipt.contentHash, generated.receipt.groundingHash);
        if (judgeConfig.enabled) {
          const judgeProvider = createOpenAiGenerationProvider(apiKey, { beforeProviderRequest: async (requestIndex) => { const reservation = await reserveShadowJudgeBudget(db, `${stageId}:${storageReceipt.contentHash}:request:${requestIndex}`, judgeConfig.dailyCap); if (!reservation.reserved) throw new Error('shadow_judge_daily_budget_exceeded'); } });
          judgeReceipt = await runShadowJudge({ provider: judgeProvider, model: judgeConfig.model, evidence: { kind: String(stage.kind) as GenerationStageKind, studyTarget: String(stage.studyTarget), sourceLocale: String(stage.sourceLocale), cefr: String(stage.cefr), artifact: artifactForStorage, contentHash: storageReceipt.contentHash, groundingHash: generated.receipt.groundingHash, qaStatus: generated.receipt.status, qaErrors: generated.receipt.validation.errors } });
        }
        await commitShadowJudgeReceipt(db, { stageId, contentHash: storageReceipt.contentHash, expectedRevision: Number(preJudgeStage.revision), expectedReviewFingerprint, receipt: judgeReceipt, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      }
    } catch (judgeError) {
      console.warn('[content_factory] shadow judge receipt persistence failed', stageId, judgeError);
    }
    return { ok: true, stageId, state: 'needs_review', objectPath: storageReceipt.objectPath, contentHash: storageReceipt.contentHash, replayed: false };
  } catch (error) {
    const failure = buildGenerationFailureRecord(error, attempt);
    const partialFailure = flashcardPartialFailureState(activeFlashcardCheckpoint, checkpointToPersist);
    await runGuardedGenerationTransaction({
      lease, allowedStates: ['running'],
      runTransaction: (handler: (transaction: admin.firestore.Transaction) => Promise<boolean>) => db.runTransaction(handler),
      read: async (tx) => { const current = await tx.get(stageRef); return { current: current.exists ? current.data() ?? {} : null, context: undefined }; },
      commit: (tx, current) => {
      const errorCategory = partialFailure?.errorCode ?? failure.code;
      const audit = buildGenerationTerminalAudit({ actorUid, role, entity: { collection: 'content_factory_stages', id: stageId }, attempt, leaseToken: lease.leaseToken, outcome: 'failed', errorCategory, before: { state: current.state ?? null }, after: { state: 'failed', errorCode: errorCategory } });
      tx.update(stageRef, { state: 'failed', errorCode: errorCategory, errorMessage: partialFailure?.errorMessage ?? failure.message, retryable: partialFailure?.retryable ?? failure.retryable, ...(partialFailure ? { flashcardPartialCheckpoint: partialFailure.checkpoint, acceptedCount: partialFailure.acceptedCount, missingCount: partialFailure.missingCount } : {}), attemptHistory: admin.firestore.FieldValue.arrayUnion(failure), leaseToken: admin.firestore.FieldValue.delete(), leaseExpiresAtMs: admin.firestore.FieldValue.delete(), completedAtMs: Date.now(), failedAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      tx.create(db.collection('admin_log').doc(audit.operationId), audit);
      },
    });
    throw error instanceof HttpsError ? error : new HttpsError('unavailable', 'content_stage_generation_failed');
  }
});
