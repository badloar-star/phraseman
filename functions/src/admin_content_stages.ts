import * as admin from 'firebase-admin';
import { createHash } from 'node:crypto';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { hasPermission } from './admin/permissions';
import { hasAdminRole, type AdminRole } from './admin/roles';
import { buildGenerationStagePlan, type ApprovedStagePrerequisite, type GenerationStagePlan } from './content_factory/stage_service';
import type { StageControlAction } from './content_factory/stage_runner';
import type { GenerationStageKind } from './content_factory/stage_contracts';
import { controlContentStage } from './content_factory/stage_control_repository';
import { activePromptProfile } from './content_factory/prompt_promotion_registry';
import { parseHashedJsonBytes } from './content_factory/release_surface_delivery';
import { contentStageObjectPathFromHash, flashcardKeysFromPublishedPacks } from './content_stage_worker';
import { lessonLedgerDocumentId, loadApprovedLessonGrounding, lessonIdFromScopeId, type GroundingBucketLike } from './content_factory/prerequisite_grounding';
import { parseLessonLedger } from './content_factory/dedupe_ledger';
import { planLessonPhraseLedgerReview } from './content_factory/lesson_review_planner';
import { loadQuestionBatchForReview, loadQuestionReplacementForReview, type StudioGroundingBucketLike } from './content_factory/question_grounding';
import { approveQuestionBatch, approveQuestionReplacement, parseQuestionBatchLedger, questionLedgerDocumentId, rollbackQuestionBatch, rollbackQuestionReplacement } from './content_factory/question_batch_ledger';
import { loadFlashcardBatchForReview, loadFlashcardReplacementForReview, type FlashcardGroundingBucketLike } from './content_factory/flashcard_grounding';
import { approveFlashcardBatch, approveFlashcardReplacement, flashcardLedgerDocumentId, parseFlashcardPackLedger, rollbackFlashcardBatch, rollbackFlashcardReplacement } from './content_factory/flashcard_pack_ledger';
import { flashcardSemanticKey } from './content_factory/flashcard_artifacts';
import { flashcardRegistryDocumentId } from './content_factory/flashcard_semantic_registry';
import { assertStageCapabilityRequest, generationStageCapabilities, stageCapability, stageLanguagePolicy } from './content_factory/stage_capabilities';
import { dependencyCatalogItems, parseDependencyCatalogRequest } from './content_factory/dependency_catalog';
import { contentStageReviewFingerprint } from './content_factory/review_fingerprint';

const REGION = 'us-central1';
const TOKEN_RE = /^[A-Za-z0-9._-]{1,160}$/;
const STAGE_ID_RE = /^[A-Za-z0-9._:-]{1,500}$/;
const LOCALE_RE = /^[a-z]{2,12}(?:-[A-Z]{2})?$/;
const KINDS: readonly GenerationStageKind[] = ['lesson_outline', 'lesson_phrases', 'lesson_vocabulary', 'lesson_irregular_verbs', 'lesson_prepositions', 'lesson_theory', 'challenge_topic', 'challenge_questions', 'challenge_question_replacement', 'flashcard_pack_idea', 'flashcard_items', 'flashcard_item_replacement'];
const CREATE_FIELDS = new Set(['requestId', 'kind', 'studyTarget', 'sourceLocale', 'cefr', 'objective', 'scopeId', 'count', 'revision', 'prerequisiteStageIds', 'replacementForQuestionId', 'replacementForCardId']);
const DERIVED_LESSON_KINDS = new Set<GenerationStageKind>(['lesson_vocabulary', 'lesson_irregular_verbs', 'lesson_prepositions', 'lesson_theory']);

function stageIdFromArtifactId(artifactId: string): string {
  const stageId = artifactId.startsWith('artifact:') ? artifactId.slice('artifact:'.length) : '';
  if (!STAGE_ID_RE.test(stageId)) throw new HttpsError('failed-precondition', 'question_replacement_artifact_identity_invalid');
  return stageId;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function flashcardPublishedDuplicateIds(items: readonly unknown[], packs: readonly unknown[], studyTarget: string, sourceLocale: string): readonly string[] {
  const publishedKeys = new Set(flashcardKeysFromPublishedPacks(packs, studyTarget, sourceLocale));
  return Object.freeze(items.filter((item) => publishedKeys.has(flashcardSemanticKey(item))).map((item) => isRecord(item) ? String(item.id ?? '') : '').filter(Boolean));
}

function flashcardDuplicateIdsFromKeys(items: readonly unknown[], keys: readonly string[]): readonly string[] {
  const publishedKeys = new Set(keys);
  return Object.freeze(items.filter((item) => publishedKeys.has(flashcardSemanticKey(item))).map((item) => isRecord(item) ? String(item.id ?? '') : '').filter(Boolean));
}

async function resolvePublishedFlashcardKeysForReview(tx: FirebaseFirestore.Transaction, db: FirebaseFirestore.Firestore, studyTarget: string, sourceLocale: string, items: readonly unknown[]) {
  if (items.length > 20) throw new HttpsError('failed-precondition', 'flashcard_candidate_keys_too_many');
  const configSnapshot = await tx.get(db.collection('content_factory_config').doc('flashcard_semantic_registry'));
  const config = configSnapshot.data() ?? {}; const catalogGeneration = Number(config.catalogGeneration ?? 0); const verifiedGeneration = Number(config.verifiedGeneration ?? -1);
  if (config.mode === 'registry' && config.manifestComplete === true && Number.isSafeInteger(catalogGeneration) && catalogGeneration === verifiedGeneration) {
    const partition = { surface: 'community_flashcards' as const, studyTarget, sourceLocale };
    const keys = [...new Set(items.map(flashcardSemanticKey).filter((key) => key && key !== '\u0000'))];
    const snapshots = await Promise.all(keys.map((key) => tx.get(db.collection('content_factory_flashcard_semantic_keys').doc(flashcardRegistryDocumentId(partition, key)))));
    return Object.freeze({ authority: 'registry' as const, keys: Object.freeze(keys.filter((_key, index) => snapshots[index].exists)) });
  }
  const publishedSnapshot = await tx.get(db.collection('community_packs').where('listingStatus', '==', 'published').limit(501));
  if (publishedSnapshot.size > 500) throw new HttpsError('failed-precondition', 'flashcard_published_catalog_registry_required');
  const legacyKeys = flashcardKeysFromPublishedPacks(publishedSnapshot.docs.map((item) => item.data()), studyTarget, sourceLocale);
  return Object.freeze({ authority: 'legacy' as const, keys: legacyKeys, comparison: null });
}

function roleFromToken(token: Record<string, unknown>): AdminRole | null {
  return hasAdminRole(token.adminRole) ? token.adminRole : null;
}

function requirePermission(request: { auth?: { token?: Record<string, unknown> } }, permission: 'content.read' | 'content.draft.write' | 'content.publish'): AdminRole {
  if (!request.auth?.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
  const role = roleFromToken(request.auth.token);
  if (!role || !hasPermission(role, permission)) throw new HttpsError('permission-denied', `Role cannot use ${permission}`);
  return role;
}

export interface ContentStageCreateRequest {
  readonly requestId: string;
  readonly kind: GenerationStageKind;
  readonly studyTarget: string;
  readonly sourceLocale: string;
  readonly cefr: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  readonly objective: string;
  readonly scopeId: string;
  readonly count: number;
  readonly revision: number;
  readonly prerequisiteStageIds: readonly string[];
  readonly replacementForQuestionId?: string;
  readonly replacementForCardId?: string;
}

export function parseContentStageCreateRequest(data: unknown): ContentStageCreateRequest {
  if (!isRecord(data) || Object.keys(data).some((key) => !CREATE_FIELDS.has(key))) throw new HttpsError('invalid-argument', 'content_stage_create_invalid');
  const requestId = String(data.requestId ?? '').trim();
  const kind = String(data.kind ?? '') as GenerationStageKind;
  const studyTarget = String(data.studyTarget ?? '').trim();
  const sourceLocale = String(data.sourceLocale ?? '').trim();
  const cefr = String(data.cefr ?? '') as ContentStageCreateRequest['cefr'];
  const objective = String(data.objective ?? '').trim();
  const scopeId = String(data.scopeId ?? '').trim();
  const count = Number(data.count);
  const revision = Number(data.revision);
  const prerequisiteStageIds = Array.isArray(data.prerequisiteStageIds) ? data.prerequisiteStageIds.map(String) : [];
  const replacementForQuestionId = String(data.replacementForQuestionId ?? '').trim();
  const replacementForCardId = String(data.replacementForCardId ?? '').trim();
  if (!TOKEN_RE.test(requestId) || !KINDS.includes(kind) || !LOCALE_RE.test(studyTarget) || !LOCALE_RE.test(sourceLocale) || !['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(cefr) || !objective || objective.length > 1000 || !TOKEN_RE.test(scopeId) || !Number.isSafeInteger(count) || (count < 1 && kind !== 'flashcard_items') || count > 1000 || !Number.isSafeInteger(revision) || revision < 1 || revision > 10_000 || prerequisiteStageIds.some((id) => !STAGE_ID_RE.test(id)) || new Set(prerequisiteStageIds).size !== prerequisiteStageIds.length) {
    throw new HttpsError('invalid-argument', 'content_stage_create_invalid');
  }
  try {
    const capability = stageCapability(kind);
    assertStageCapabilityRequest({ kind, count, cefr, studyTarget, sourceLocale, prerequisiteKinds: capability.prerequisiteKinds });
  } catch (error) {
    throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'stage_capability_invalid');
  }
  const replacementKind = kind === 'challenge_question_replacement';
  if ((replacementKind && (!TOKEN_RE.test(replacementForQuestionId) || count !== 1)) || (!replacementKind && replacementForQuestionId)) throw new HttpsError('invalid-argument', 'question_replacement_identity_invalid');
  const cardReplacementKind = kind === 'flashcard_item_replacement';
  if ((cardReplacementKind && (!TOKEN_RE.test(replacementForCardId) || count !== 1)) || (!cardReplacementKind && replacementForCardId)) throw new HttpsError('invalid-argument', 'flashcard_replacement_identity_invalid');
  return Object.freeze({ requestId, kind, studyTarget, sourceLocale, cefr, objective, scopeId, count, revision, prerequisiteStageIds: Object.freeze(prerequisiteStageIds), ...(replacementKind ? { replacementForQuestionId } : {}), ...(cardReplacementKind ? { replacementForCardId } : {}) });
}

export function parseContentStageListRequest(data: unknown) {
  const record = isRecord(data) ? data : {};
  const requestId = String(record.requestId ?? '').trim();
  const cursor = String(record.cursor ?? '').trim();
  const kind = String(record.kind ?? '').trim();
  const state = String(record.state ?? '').trim();
  const studyTarget = String(record.studyTarget ?? '').trim();
  const sourceLocale = String(record.sourceLocale ?? '').trim();
  const scopeId = String(record.scopeId ?? '').trim();
  const requestedLimit = Number(record.limit ?? 50);
  const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(100, Math.floor(requestedLimit))) : 50;
  const states = ['queued', 'running', 'paused', 'failed', 'needs_review', 'approved', 'rejected', 'cancelled', 'superseded'];
  if (!TOKEN_RE.test(requestId) || (cursor && !STAGE_ID_RE.test(cursor)) || (kind && !KINDS.includes(kind as GenerationStageKind)) || (state && !states.includes(state)) || (studyTarget && !LOCALE_RE.test(studyTarget)) || (sourceLocale && !LOCALE_RE.test(sourceLocale)) || (scopeId && !TOKEN_RE.test(scopeId))) throw new HttpsError('invalid-argument', 'content_stage_list_invalid');
  return Object.freeze({ requestId, limit, cursor, kind, state, studyTarget, sourceLocale, scopeId });
}

export function buildContentStageListQuery(db: admin.firestore.Firestore, input: ReturnType<typeof parseContentStageListRequest>): admin.firestore.Query {
  let query: admin.firestore.Query = db.collection('content_factory_stages').where('requestId', '==', input.requestId);
  if (input.kind) query = query.where('kind', '==', input.kind);
  if (input.state) query = query.where('state', '==', input.state);
  if (input.studyTarget) query = query.where('studyTarget', '==', input.studyTarget);
  if (input.sourceLocale) query = query.where('sourceLocale', '==', input.sourceLocale);
  if (input.scopeId) query = query.where('scopeId', '==', input.scopeId);
  query = query.orderBy(admin.firestore.FieldPath.documentId());
  if (input.cursor) query = query.startAfter(input.cursor);
  return query.limit(input.limit + 1);
}

export function buildContentStageDependencyQuery(db: admin.firestore.Firestore, input: ReturnType<typeof parseDependencyCatalogRequest>): admin.firestore.Query {
  let query: admin.firestore.Query = db.collection('content_factory_stages')
    .where('requestId', '==', input.requestId)
    .where('studyTarget', '==', input.studyTarget)
    .where('sourceLocale', '==', input.sourceLocale)
    .where('state', '==', 'approved')
    .where('kind', 'in', input.allowedKinds);
  if (input.scopeId && input.consumerKind !== 'flashcard_items') query = query.where('scopeId', '==', input.scopeId);
  query = query.orderBy(admin.firestore.FieldPath.documentId());
  if (input.cursor) query = query.startAfter(input.cursor);
  return query.limit(input.limit + 1);
}

export function stagePlanFromStoredPrerequisites(input: ContentStageCreateRequest, stored: readonly Record<string, unknown>[]): GenerationStagePlan {
  const byId = new Map(stored.map((item) => [String(item.stageId ?? ''), item]));
  const prerequisites: ApprovedStagePrerequisite[] = input.prerequisiteStageIds.map((stageId) => {
    const item = byId.get(stageId);
    if (!item) throw new HttpsError('failed-precondition', 'generation_stage_prerequisite_document_missing', { stageId });
    const selectedLessonForCards = input.kind === 'flashcard_items' && item.kind === 'lesson_phrases';
    if (item.requestId !== input.requestId || item.studyTarget !== input.studyTarget || item.sourceLocale !== input.sourceLocale || (!selectedLessonForCards && item.scopeId !== input.scopeId)) throw new HttpsError('failed-precondition', 'generation_stage_prerequisite_identity_mismatch', { stageId });
    return { kind: String(item.kind ?? '') as GenerationStageKind, artifactId: String(item.artifactId ?? ''), state: String(item.state ?? '') as ApprovedStagePrerequisite['state'] };
  });
  const activePrompt = activePromptProfile(input.kind); const schemaVersion = activePrompt.schemaVersion; const promptVersion = activePrompt.promptVersion; const qaPolicy = activePrompt.qaPolicy;
  try {
    const { replacementForQuestionId: _replacementForQuestionId, replacementForCardId: _replacementForCardId, ...planningInput } = input;
    return buildGenerationStagePlan({ ...planningInput, schemaVersion, promptVersion, qaPolicy, approvedPrerequisites: prerequisites });
  } catch (error) {
    throw new HttpsError('failed-precondition', error instanceof Error ? error.message : 'generation_stage_prerequisite_invalid');
  }
}

export function contentStagePlanFingerprint(input: ContentStageCreateRequest, prerequisiteArtifactIds: readonly string[]): string {
  const activePrompt = activePromptProfile(input.kind);
  const payload = JSON.stringify({
    requestId: input.requestId, kind: input.kind, studyTarget: input.studyTarget, sourceLocale: input.sourceLocale, cefr: input.cefr, objective: input.objective, scopeId: input.scopeId, count: input.count, revision: input.revision, replacementForQuestionId: input.replacementForQuestionId ?? null, replacementForCardId: input.replacementForCardId ?? null,
    prerequisiteStageIds: [...input.prerequisiteStageIds].sort(), prerequisiteArtifactIds: [...prerequisiteArtifactIds].sort(), schemaVersion: activePrompt.schemaVersion, promptVersion: activePrompt.promptVersion, qaPolicy: activePrompt.qaPolicy,
  });
  return createHash('sha256').update(payload).digest('hex');
}

export interface ContentStageControlRequest { readonly stageId: string; readonly action: StageControlAction }

export function parseContentStageControlRequest(data: unknown): ContentStageControlRequest {
  if (!isRecord(data) || Object.keys(data).some((key) => key !== 'stageId' && key !== 'action')) throw new HttpsError('invalid-argument', 'content_stage_control_invalid');
  const stageId = String(data.stageId ?? '').trim();
  const action = String(data.action ?? '') as StageControlAction;
  if (!STAGE_ID_RE.test(stageId) || !(['pause', 'resume', 'cancel'] as const).includes(action)) throw new HttpsError('invalid-argument', 'content_stage_control_invalid');
  return Object.freeze({ stageId, action });
}

export function parseContentStagePreviewRequest(data: unknown): { stageId: string } {
  if (!isRecord(data) || Object.keys(data).some((key) => key !== 'stageId')) throw new HttpsError('invalid-argument', 'content_stage_preview_invalid');
  const stageId = String(data.stageId ?? '').trim();
  if (!STAGE_ID_RE.test(stageId)) throw new HttpsError('invalid-argument', 'content_stage_preview_invalid');
  return Object.freeze({ stageId });
}

export function parseContentStageReviewRequest(data: unknown): { stageId: string; status: 'approved' | 'rejected'; reason: string; expectedReviewFingerprint: string } {
  if (!isRecord(data) || Object.keys(data).some((key) => !['stageId', 'status', 'reason', 'expectedReviewFingerprint'].includes(key))) throw new HttpsError('invalid-argument', 'content_stage_review_invalid');
  const stageId = String(data.stageId ?? '').trim();
  const status = String(data.status ?? '') as 'approved' | 'rejected';
  const reason = String(data.reason ?? '').trim();
  const expectedReviewFingerprint = String(data.expectedReviewFingerprint ?? '').trim();
  if (!STAGE_ID_RE.test(stageId) || !['approved', 'rejected'].includes(status) || reason.length < 5 || reason.length > 500 || !/^[a-f0-9]{64}$/i.test(expectedReviewFingerprint)) throw new HttpsError('invalid-argument', 'content_stage_review_invalid');
  return Object.freeze({ stageId, status, reason, expectedReviewFingerprint });
}

export const adminCreateContentStage = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const role = requirePermission(request as { auth?: { token?: Record<string, unknown> } }, 'content.draft.write');
  const input = parseContentStageCreateRequest(request.data);
  const db = admin.firestore();
  const expectedStageId = `${input.requestId}:${input.kind}:${input.scopeId}:r${input.revision}`;
  const stageRef = db.collection('content_factory_stages').doc(expectedStageId);
  return db.runTransaction(async (tx) => {
    const existing = await tx.get(stageRef);
    const prerequisiteSnapshots = await Promise.all(input.prerequisiteStageIds.map((stageId) => tx.get(db.collection('content_factory_stages').doc(stageId))));
    const plan = stagePlanFromStoredPrerequisites(input, prerequisiteSnapshots.filter((snapshot) => snapshot.exists).map((snapshot) => ({ stageId: snapshot.id, ...(snapshot.data() ?? {}) })));
    const planFingerprint = contentStagePlanFingerprint(input, plan.unit.prerequisiteArtifactIds);
    if (existing.exists) {
      const current = existing.data() ?? {};
      if (current.planFingerprint !== planFingerprint) throw new HttpsError('already-exists', 'content_stage_idempotency_conflict');
      return { ok: true, stageId: expectedStageId, state: current.state ?? 'queued', replayed: true };
    }
    tx.create(stageRef, { ...plan.unit, cefr: input.cefr, objective: input.objective, prerequisiteStageIds: input.prerequisiteStageIds, ...(input.replacementForQuestionId ? { replacementForQuestionId: input.replacementForQuestionId } : {}), ...(input.replacementForCardId ? { replacementForCardId: input.replacementForCardId } : {}), ...(input.kind.startsWith('lesson_') ? { blueprintVersion: 'english-core-32:v1' } : {}), ...(input.kind.startsWith('challenge_') || input.kind === 'flashcard_pack_idea' ? { publicationPolicy: 'draft_only_no_consumer' } : {}), ...(input.kind === 'flashcard_items' || input.kind === 'flashcard_item_replacement' ? { publicationPolicy: 'standard' } : {}), planFingerprint, createdBy: request.auth!.uid, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    tx.create(db.collection('admin_log').doc(), { action: 'content_factory.stage.create', actorUid: request.auth!.uid, role, entity: { collection: 'content_factory_stages', id: plan.unit.stageId }, operationId: plan.unit.idempotencyKey, reason: 'Content generation stage created', before: null, after: { state: plan.unit.state, artifactId: plan.unit.artifactId }, timestamp: new Date().toISOString() });
    return { ok: true, stageId: plan.unit.stageId, state: plan.unit.state, replayed: false };
  });
});

export const adminControlContentStage = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const role = requirePermission(request as { auth?: { token?: Record<string, unknown> } }, 'content.draft.write');
  const input = parseContentStageControlRequest(request.data);
  try { return await controlContentStage(admin.firestore(), { stageId: input.stageId, action: input.action, actorUid: request.auth!.uid, role, nowIso: new Date().toISOString(), serverTimestamp: admin.firestore.FieldValue.serverTimestamp(), deleteValue: admin.firestore.FieldValue.delete() }); }
  catch (error) {
    const code = error instanceof Error ? error.message : 'content_stage_control_failed';
    if (code === 'content_stage_not_found') throw new HttpsError('not-found', code);
    if (code === 'generation_stage_transition_invalid') throw new HttpsError('failed-precondition', code);
    throw new HttpsError('aborted', code);
  }
});

export const adminListContentStages = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  requirePermission(request as { auth?: { token?: Record<string, unknown> } }, 'content.read');
  const input = parseContentStageListRequest(request.data);
  const db = admin.firestore();
  const snapshot = await buildContentStageListQuery(db, input).get();
  const docs = snapshot.docs.slice(0, input.limit);
  return { ok: true, stages: docs.map((doc) => ({ id: doc.id, ...doc.data() })), nextCursor: snapshot.size > input.limit ? docs.at(-1)?.id ?? null : null, isPartial: snapshot.size > input.limit };
});

export const adminListContentStageDependencies = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  requirePermission(request as { auth?: { token?: Record<string, unknown> } }, 'content.read');
  let input: ReturnType<typeof parseDependencyCatalogRequest>;
  try { input = parseDependencyCatalogRequest(request.data); } catch { throw new HttpsError('invalid-argument', 'dependency_catalog_invalid'); }
  const snapshot = await buildContentStageDependencyQuery(admin.firestore(), input).get();
  const result = dependencyCatalogItems(snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() })), input.limit);
  return { ok: true, ...result };
});

export const adminGetContentStageCapabilities = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  requirePermission(request as { auth?: { token?: Record<string, unknown> } }, 'content.read');
  return { ok: true, version: 'content-stage-capabilities-r10a-v1', languagePolicy: stageLanguagePolicy, capabilities: generationStageCapabilities };
});

export const adminPreviewContentStage = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  requirePermission(request as { auth?: { token?: Record<string, unknown> } }, 'content.read');
  const { stageId } = parseContentStagePreviewRequest(request.data);
  const snapshot = await admin.firestore().collection('content_factory_stages').doc(stageId).get();
  if (!snapshot.exists) throw new HttpsError('not-found', 'content_stage_not_found');
  const stage = snapshot.data() ?? {};
  const revision = Number(stage.revision);
  const objectPath = String(stage.objectPath ?? '');
  const contentHash = String(stage.contentHash ?? '');
  const objectGeneration = String(stage.objectGeneration ?? '');
  const artifactAttempt = Number(stage.artifactAttempt);
  const artifactLeaseTokenHash = String(stage.artifactLeaseTokenHash ?? '');
  if (!['needs_review', 'approved', 'rejected'].includes(String(stage.state)) || objectPath !== contentStageObjectPathFromHash(stageId, revision, artifactAttempt, artifactLeaseTokenHash) || !/^[a-f0-9]{64}$/i.test(contentHash) || !objectGeneration) throw new HttpsError('failed-precondition', 'content_stage_not_previewable');
  const file = admin.storage().bucket().file(objectPath);
  const [metadata] = await file.getMetadata();
  if (String(metadata.generation ?? '') !== objectGeneration) throw new HttpsError('data-loss', 'content_stage_generation_mismatch');
  const [bytes] = await file.download({ validation: false });
  let payload: unknown;
  try { payload = parseHashedJsonBytes(bytes, contentHash); } catch (error) { throw new HttpsError('data-loss', error instanceof Error ? error.message : 'content_stage_payload_invalid'); }
  return { ok: true, stage: { id: snapshot.id, ...stage }, payload, qaReceipt: isRecord(stage.qaReceipt) ? stage.qaReceipt : null, judgeReceipt: isRecord(stage.judgeReceipt) ? stage.judgeReceipt : null, reviewFingerprint: contentStageReviewFingerprint(snapshot.id, stage) };
});

export const adminReviewContentStage = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const role = requirePermission(request as { auth?: { token?: Record<string, unknown> } }, 'content.publish');
  const input = parseContentStageReviewRequest(request.data);
  const db = admin.firestore();
  const stageRef = db.collection('content_factory_stages').doc(input.stageId);
  const preliminarySnapshot = await stageRef.get();
  if (!preliminarySnapshot.exists) throw new HttpsError('not-found', 'content_stage_not_found');
  const preliminary = preliminarySnapshot.data() ?? {};
  let phraseGrounding: Awaited<ReturnType<typeof loadApprovedLessonGrounding>> | null = null;
  let questionBatch: Awaited<ReturnType<typeof loadQuestionBatchForReview>> | null = null;
  let questionReplacement: Awaited<ReturnType<typeof loadQuestionReplacementForReview>> | null = null;
  let flashcardBatch: Awaited<ReturnType<typeof loadFlashcardBatchForReview>> | null = null;
  let flashcardReplacement: Awaited<ReturnType<typeof loadFlashcardReplacementForReview>> | null = null;
  if (input.status === 'approved' && preliminary.kind === 'lesson_phrases') {
    try {
      phraseGrounding = await loadApprovedLessonGrounding(admin.storage().bucket() as unknown as GroundingBucketLike, {
        stageId: input.stageId, artifactId: String(preliminary.artifactId ?? ''), kind: String(preliminary.kind ?? ''), state: String(preliminary.state ?? ''), studyTarget: String(preliminary.studyTarget ?? ''), cefr: String(preliminary.cefr ?? ''), promptVersion: String(preliminary.promptVersion ?? ''), groundingReceipt: preliminary.groundingReceipt, objectPath: String(preliminary.objectPath ?? ''), contentHash: String(preliminary.contentHash ?? ''), objectGeneration: String(preliminary.objectGeneration ?? ''),
      }, { allowNeedsReviewForApproval: true });
    } catch (error) { throw new HttpsError('failed-precondition', error instanceof Error ? error.message : 'lesson_phrase_grounding_invalid'); }
    if (phraseGrounding.extraction.state !== 'ready') throw new HttpsError('failed-precondition', 'lesson_extraction_review_required');
  }
  if (input.status === 'approved' && preliminary.kind === 'challenge_questions') {
    try { questionBatch = await loadQuestionBatchForReview(admin.storage().bucket() as unknown as StudioGroundingBucketLike, { stageId: input.stageId, artifactId: String(preliminary.artifactId ?? ''), kind: preliminary.kind, state: String(preliminary.state ?? ''), objectPath: String(preliminary.objectPath ?? ''), contentHash: String(preliminary.contentHash ?? ''), objectGeneration: String(preliminary.objectGeneration ?? ''), groundingReceipt: preliminary.groundingReceipt }, { allowNeedsReview: true }); } catch (error) { throw new HttpsError('failed-precondition', error instanceof Error ? error.message : 'question_batch_review_invalid'); }
  }
  if (preliminary.kind === 'challenge_question_replacement') {
    try { questionReplacement = await loadQuestionReplacementForReview(admin.storage().bucket() as unknown as StudioGroundingBucketLike, { artifactId: String(preliminary.artifactId ?? ''), kind: preliminary.kind, state: String(preliminary.state ?? ''), objectPath: String(preliminary.objectPath ?? ''), contentHash: String(preliminary.contentHash ?? ''), objectGeneration: String(preliminary.objectGeneration ?? ''), groundingReceipt: preliminary.groundingReceipt }, { allowNeedsReview: true }); } catch (error) { throw new HttpsError('failed-precondition', error instanceof Error ? error.message : 'question_replacement_review_invalid'); }
  }
  if (input.status === 'approved' && preliminary.kind === 'flashcard_items') {
    try { flashcardBatch = await loadFlashcardBatchForReview(admin.storage().bucket() as unknown as FlashcardGroundingBucketLike, { artifactId: String(preliminary.artifactId ?? ''), kind: 'flashcard_items', state: String(preliminary.state ?? ''), count: Number(preliminary.resolvedCount ?? preliminary.count), objectPath: String(preliminary.objectPath ?? ''), contentHash: String(preliminary.contentHash ?? ''), objectGeneration: String(preliminary.objectGeneration ?? ''), groundingReceipt: preliminary.groundingReceipt }, { allowNeedsReview: true }); } catch (error) { throw new HttpsError('failed-precondition', error instanceof Error ? error.message : 'flashcard_batch_review_invalid'); }
  }
  if (preliminary.kind === 'flashcard_item_replacement') {
    try { flashcardReplacement = await loadFlashcardReplacementForReview(admin.storage().bucket() as unknown as FlashcardGroundingBucketLike, { artifactId: String(preliminary.artifactId ?? ''), kind: 'flashcard_item_replacement', state: String(preliminary.state ?? ''), objectPath: String(preliminary.objectPath ?? ''), contentHash: String(preliminary.contentHash ?? ''), objectGeneration: String(preliminary.objectGeneration ?? ''), groundingReceipt: preliminary.groundingReceipt }, { allowNeedsReview: true }); } catch (error) { throw new HttpsError('failed-precondition', error instanceof Error ? error.message : 'flashcard_replacement_review_invalid'); }
  }
  return db.runTransaction(async (tx) => {
    const snapshot = await tx.get(stageRef);
    if (!snapshot.exists) throw new HttpsError('not-found', 'content_stage_not_found');
    const stage = snapshot.data() ?? {};
    if (contentStageReviewFingerprint(snapshot.id, stage) !== input.expectedReviewFingerprint) throw new HttpsError('aborted', 'content_stage_review_fingerprint_stale');
    if (stage.state === input.status) return { ok: true, stageId: input.stageId, state: input.status, replayed: true };
    if (stage.state !== 'needs_review' && !(stage.state === 'approved' && input.status === 'rejected')) throw new HttpsError('failed-precondition', 'content_stage_review_state_invalid');
    if (!stage.objectPath || !stage.contentHash || !stage.objectGeneration || !stage.qaReceipt) throw new HttpsError('failed-precondition', 'content_stage_review_evidence_missing');
    const updates: Record<string, unknown> = { state: input.status, reviewReason: input.reason, reviewedBy: request.auth!.uid, reviewedAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    const editOperationId = String(stage.editOperationId ?? '');
    const correctionEventRef = /^[a-f0-9]{64}$/i.test(editOperationId) ? db.collection('content_factory_correction_events').doc(editOperationId) : null;
    const correctionEventSnapshot = correctionEventRef ? await tx.get(correctionEventRef) : null;
    if (correctionEventRef) {
      if (!correctionEventSnapshot?.exists || correctionEventSnapshot.data()?.newStageId !== input.stageId || correctionEventSnapshot.data()?.newContentHash !== stage.contentHash) throw new HttpsError('failed-precondition', 'content_stage_correction_event_mismatch');
      updates.correctionStatus = input.status === 'approved' ? 'collected_accepted' : 'collected_rejected';
    }
    if (stage.kind === 'lesson_phrases') {
      if (input.status === 'approved') updates.linguisticReview = { status: 'human_approved', reviewerUid: request.auth!.uid, reason: input.reason, automatedJudgeStatus: isRecord(stage.judgeReceipt) ? String(stage.judgeReceipt.status ?? 'not_collected') : 'not_collected' };
      const lessonId = lessonIdFromScopeId(String(stage.scopeId ?? ''));
      const ledgerRef = db.collection('content_factory_lesson_ledgers').doc(lessonLedgerDocumentId(String(stage.requestId ?? ''), String(stage.studyTarget ?? '')));
      const ledgerSnapshot = await tx.get(ledgerRef);
      const ledger = parseLessonLedger(ledgerSnapshot.exists ? ledgerSnapshot.data() : undefined, String(stage.studyTarget ?? ''));
      let nextLedger; let staleLessonIds: readonly number[];
      if (input.status === 'approved') {
        if (!phraseGrounding || phraseGrounding.contentHash !== stage.contentHash || phraseGrounding.artifactId !== stage.artifactId) throw new HttpsError('aborted', 'lesson_phrase_grounding_changed');
        const candidates = [...phraseGrounding.extraction.vocabulary, ...phraseGrounding.extraction.irregularVerbs, ...phraseGrounding.extraction.prepositions];
        const planned = planLessonPhraseLedgerReview({ status: 'approved', ledger, lessonId, phraseArtifactId: String(stage.artifactId), candidates });
        nextLedger = planned.ledger;
        staleLessonIds = planned.staleLessonIds;
        updates.extractionReceipt = JSON.parse(JSON.stringify(phraseGrounding.extraction));
        updates.ledgerRevision = nextLedger.revision;
        updates.ledgerFingerprint = nextLedger.lessons[lessonId]?.fingerprint;
      } else {
        const planned = planLessonPhraseLedgerReview({ status: 'rejected', ledger, lessonId, phraseArtifactId: String(stage.artifactId), candidates: [] });
        nextLedger = planned.ledger;
        staleLessonIds = planned.staleLessonIds;
        updates.ledgerRevision = nextLedger.revision;
      }
      const related = await tx.get(db.collection('content_factory_stages').where('requestId', '==', stage.requestId));
      const staleScopes = new Set(staleLessonIds.map((id) => `lesson-${id}`));
      for (const relatedStage of related.docs) {
        const data = relatedStage.data();
        if (relatedStage.id !== input.stageId && DERIVED_LESSON_KINDS.has(data.kind as GenerationStageKind) && staleScopes.has(String(data.scopeId)) && ['needs_review', 'approved', 'rejected'].includes(String(data.state))) tx.update(relatedStage.ref, { state: 'superseded', staleReason: 'lesson_ledger_fingerprint_changed', staleAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      }
      tx.set(ledgerRef, nextLedger);
    }
    if (stage.kind === 'challenge_questions') {
      const topicArtifactIds = Array.isArray(stage.prerequisiteArtifactIds) ? stage.prerequisiteArtifactIds.map(String) : [];
      if (topicArtifactIds.length !== 1) throw new HttpsError('failed-precondition', 'question_topic_artifact_required');
      const ledgerRef = db.collection('content_factory_question_ledgers').doc(questionLedgerDocumentId(String(stage.requestId ?? ''), topicArtifactIds[0]));
      const ledgerSnapshot = await tx.get(ledgerRef);
      const ledger = parseQuestionBatchLedger(ledgerSnapshot.exists ? ledgerSnapshot.data() : undefined, topicArtifactIds[0]);
      if (input.status === 'approved') {
        if (!questionBatch || questionBatch.artifactId !== stage.artifactId || questionBatch.contentHash !== stage.contentHash || questionBatch.topicArtifactId !== topicArtifactIds[0]) throw new HttpsError('aborted', 'question_batch_review_changed');
        try {
          const approved = approveQuestionBatch(ledger, { batchArtifactId: String(stage.artifactId), items: questionBatch.items });
          tx.set(ledgerRef, approved.ledger);
          updates.questionLedgerRevision = approved.ledger.revision;
          updates.questionLedgerContentHash = approved.ledger.batches[String(stage.artifactId)]?.contentHash;
        } catch (error) { throw new HttpsError('failed-precondition', error instanceof Error ? error.message : 'question_batch_ledger_invalid'); }
      } else {
        const activeReplacementArtifacts = Object.values(ledger.batches[String(stage.artifactId)]?.replacements ?? {}).map((history) => history[history.length - 1]?.artifactId).filter((artifactId): artifactId is string => Boolean(artifactId));
        const activeReplacementSnapshots = await Promise.all(activeReplacementArtifacts.map((artifactId) => tx.get(db.collection('content_factory_stages').doc(stageIdFromArtifactId(artifactId)))));
        const rolledBack = rollbackQuestionBatch(ledger, String(stage.artifactId));
        tx.set(ledgerRef, rolledBack);
        for (const replacementSnapshot of activeReplacementSnapshots) if (replacementSnapshot.exists) tx.update(replacementSnapshot.ref, { state: 'superseded', staleReason: 'question_batch_rollback', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        updates.questionLedgerRevision = rolledBack.revision;
      }
    }
    if (stage.kind === 'challenge_question_replacement') {
      if (!questionReplacement || questionReplacement.artifactId !== stage.artifactId || questionReplacement.contentHash !== stage.contentHash) throw new HttpsError('aborted', 'question_replacement_review_changed');
      const ledgerRef = db.collection('content_factory_question_ledgers').doc(questionLedgerDocumentId(String(stage.requestId ?? ''), questionReplacement.topicArtifactId));
      const ledgerSnapshot = await tx.get(ledgerRef); const ledger = parseQuestionBatchLedger(ledgerSnapshot.exists ? ledgerSnapshot.data() : undefined, questionReplacement.topicArtifactId);
      if (input.status === 'approved') {
        try {
          const replaced = approveQuestionReplacement(ledger, { batchArtifactId: questionReplacement.batchArtifactId, questionId: questionReplacement.replacementForQuestionId, replacementArtifactId: String(stage.artifactId), replacement: questionReplacement.item });
          const supersededRef = replaced.supersededReplacementArtifactId ? db.collection('content_factory_stages').doc(stageIdFromArtifactId(replaced.supersededReplacementArtifactId)) : null;
          const supersededSnapshot = supersededRef ? await tx.get(supersededRef) : null;
          tx.set(ledgerRef, replaced.ledger);
          if (supersededSnapshot?.exists) tx.update(supersededSnapshot.ref, { state: 'superseded', supersededByArtifactId: stage.artifactId, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
          updates.questionLedgerRevision = replaced.ledger.revision; updates.replacedQuestionId = questionReplacement.replacementForQuestionId; updates.activeReplacementArtifactId = stage.artifactId;
        } catch (error) { throw new HttpsError('failed-precondition', error instanceof Error ? error.message : 'question_replacement_ledger_invalid'); }
      } else if (stage.state === 'approved') {
        try {
          const restored = rollbackQuestionReplacement(ledger, { batchArtifactId: questionReplacement.batchArtifactId, questionId: questionReplacement.replacementForQuestionId, replacementArtifactId: String(stage.artifactId) });
          const restoredRef = restored.restoredReplacementArtifactId ? db.collection('content_factory_stages').doc(stageIdFromArtifactId(restored.restoredReplacementArtifactId)) : null;
          const restoredSnapshot = restoredRef ? await tx.get(restoredRef) : null;
          tx.set(ledgerRef, restored.ledger);
          if (restoredSnapshot?.exists) tx.update(restoredSnapshot.ref, { state: 'approved', restoredAfterRollbackArtifactId: stage.artifactId, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
          updates.questionLedgerRevision = restored.ledger.revision; updates.activeReplacementArtifactId = restored.restoredReplacementArtifactId;
        } catch (error) { throw new HttpsError('failed-precondition', error instanceof Error ? error.message : 'question_replacement_rollback_invalid'); }
      }
    }
    if (stage.kind === 'flashcard_items') {
      const ideaArtifactIds = Array.isArray(stage.prerequisiteArtifactIds) ? stage.prerequisiteArtifactIds.map(String) : [];
      if (ideaArtifactIds.length !== 1) throw new HttpsError('failed-precondition', 'flashcard_pack_idea_artifact_required');
      const ledgerRef = db.collection('content_factory_flashcard_ledgers').doc(flashcardLedgerDocumentId(String(stage.requestId ?? ''), ideaArtifactIds[0]));
      const ledgerSnapshot = await tx.get(ledgerRef);
      const ledger = parseFlashcardPackLedger(ledgerSnapshot.exists ? ledgerSnapshot.data() : undefined, ideaArtifactIds[0]);
      if (input.status === 'approved') {
        if (!flashcardBatch || flashcardBatch.artifactId !== stage.artifactId || flashcardBatch.contentHash !== stage.contentHash || flashcardBatch.packIdeaArtifactId !== ideaArtifactIds[0]) throw new HttpsError('aborted', 'flashcard_batch_review_changed');
        const publishedResolution = await resolvePublishedFlashcardKeysForReview(tx, db, String(stage.studyTarget ?? ''), String(stage.sourceLocale ?? ''), flashcardBatch.items);
        if (flashcardDuplicateIdsFromKeys(flashcardBatch.items, publishedResolution.keys).length) throw new HttpsError('failed-precondition', 'flashcard_batch_published_duplicate');
        try {
          const approved = approveFlashcardBatch(ledger, { batchArtifactId: String(stage.artifactId), items: flashcardBatch.items });
          tx.set(ledgerRef, approved.ledger);
          updates.flashcardLedgerRevision = approved.ledger.revision;
          updates.flashcardLedgerContentHash = approved.ledger.batches[String(stage.artifactId)]?.contentHash;
        } catch (error) { throw new HttpsError('failed-precondition', error instanceof Error ? error.message : 'flashcard_batch_ledger_invalid'); }
      } else {
        const activeReplacementArtifacts = Object.values(ledger.batches[String(stage.artifactId)]?.replacements ?? {}).map((history) => history[history.length - 1]?.artifactId).filter((artifactId): artifactId is string => Boolean(artifactId));
        const activeReplacementSnapshots = await Promise.all(activeReplacementArtifacts.map((artifactId) => tx.get(db.collection('content_factory_stages').doc(stageIdFromArtifactId(artifactId)))));
        const rolledBack = rollbackFlashcardBatch(ledger, String(stage.artifactId));
        tx.set(ledgerRef, rolledBack);
        for (const replacementSnapshot of activeReplacementSnapshots) if (replacementSnapshot.exists) tx.update(replacementSnapshot.ref, { state: 'superseded', staleReason: 'flashcard_batch_rollback', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        updates.flashcardLedgerRevision = rolledBack.revision;
      }
    }
    if (stage.kind === 'flashcard_item_replacement') {
      if (!flashcardReplacement || flashcardReplacement.artifactId !== stage.artifactId || flashcardReplacement.contentHash !== stage.contentHash) throw new HttpsError('aborted', 'flashcard_replacement_review_changed');
      const ledgerRef = db.collection('content_factory_flashcard_ledgers').doc(flashcardLedgerDocumentId(String(stage.requestId ?? ''), flashcardReplacement.packIdeaArtifactId));
      const ledgerSnapshot = await tx.get(ledgerRef); const ledger = parseFlashcardPackLedger(ledgerSnapshot.exists ? ledgerSnapshot.data() : undefined, flashcardReplacement.packIdeaArtifactId);
      if (input.status === 'approved') {
        const publishedResolution = await resolvePublishedFlashcardKeysForReview(tx, db, String(stage.studyTarget ?? ''), String(stage.sourceLocale ?? ''), [flashcardReplacement.item]);
        if (flashcardDuplicateIdsFromKeys([flashcardReplacement.item], publishedResolution.keys).length) throw new HttpsError('failed-precondition', 'flashcard_replacement_published_duplicate');
        try {
          const replaced = approveFlashcardReplacement(ledger, { batchArtifactId: flashcardReplacement.batchArtifactId, cardId: flashcardReplacement.replacementForCardId, replacementArtifactId: String(stage.artifactId), replacement: flashcardReplacement.item });
          const supersededRef = replaced.supersededReplacementArtifactId ? db.collection('content_factory_stages').doc(stageIdFromArtifactId(replaced.supersededReplacementArtifactId)) : null;
          const supersededSnapshot = supersededRef ? await tx.get(supersededRef) : null;
          tx.set(ledgerRef, replaced.ledger);
          if (supersededSnapshot?.exists) tx.update(supersededSnapshot.ref, { state: 'superseded', supersededByArtifactId: stage.artifactId, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
          updates.flashcardLedgerRevision = replaced.ledger.revision; updates.replacedCardId = flashcardReplacement.replacementForCardId; updates.activeReplacementArtifactId = stage.artifactId;
        } catch (error) { throw new HttpsError('failed-precondition', error instanceof Error ? error.message : 'flashcard_replacement_ledger_invalid'); }
      } else if (stage.state === 'approved') {
        try {
          const restored = rollbackFlashcardReplacement(ledger, { batchArtifactId: flashcardReplacement.batchArtifactId, cardId: flashcardReplacement.replacementForCardId, replacementArtifactId: String(stage.artifactId) });
          const restoredRef = restored.restoredReplacementArtifactId ? db.collection('content_factory_stages').doc(stageIdFromArtifactId(restored.restoredReplacementArtifactId)) : null;
          const restoredSnapshot = restoredRef ? await tx.get(restoredRef) : null;
          tx.set(ledgerRef, restored.ledger);
          if (restoredSnapshot?.exists) tx.update(restoredSnapshot.ref, { state: 'approved', restoredAfterRollbackArtifactId: stage.artifactId, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
          updates.flashcardLedgerRevision = restored.ledger.revision; updates.activeReplacementArtifactId = restored.restoredReplacementArtifactId;
        } catch (error) { throw new HttpsError('failed-precondition', error instanceof Error ? error.message : 'flashcard_replacement_rollback_invalid'); }
      }
    }
    tx.update(stageRef, updates);
    if (correctionEventRef) tx.update(correctionEventRef, { status: input.status === 'approved' ? 'accepted' : 'rejected', reviewedBy: request.auth!.uid, reviewReason: input.reason, reviewedAt: admin.firestore.FieldValue.serverTimestamp() });
    const operationId = createHash('sha256').update(`${input.stageId}:review:${input.status}:${String(stage.revision ?? '')}:${String(stage.state ?? '')}`).digest('hex');
    tx.create(db.collection('admin_log').doc(), { action: `content_factory.stage.${input.status}`, actorUid: request.auth!.uid, role, entity: { collection: 'content_factory_stages', id: input.stageId }, operationId, reason: input.reason, before: { state: stage.state ?? null }, after: { state: input.status, artifactId: stage.artifactId ?? null }, timestamp: new Date().toISOString() });
    return { ok: true, stageId: input.stageId, state: input.status, replayed: false };
  });
});
