import { createHash } from 'crypto';
import { gzipSync, gunzipSync } from 'zlib';
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { createAuditRecord } from './admin/audit_contract';
import { hasPermission, resolveAdminRole, type AdminPermission } from './admin/permissions';
import {
  buildCancellationSummary, buildCancellationTrendFromCounts, buildOnboardingSourceSummary, csvCell, filterIdeaRows,
  buildIdeaDecisionMutation, buildSurveyMutation, projectCancellationRow, projectIdeaRow, projectSurveyResponse,
  type SurveyMutationAction,
} from './admin_voice_research_core';

if (admin.apps.length === 0) admin.initializeApp();

const REGION = 'us-central1';
const PAGE_MAX = 100;
const SNAPSHOT_TTL_MS = 30 * 60 * 1000;
const SNAPSHOT_CHUNK_CHARS = 700_000;
const SNAPSHOT_MAX_ENCODED_CHARS = 8_000_000;
const IDEAS_LIMIT = 500;
const SURVEYS_LIMIT = 200;
const RESPONSES_LIMIT = 5_000;
const ONBOARDING_LIMIT = 50_000;
const CANCEL_LIMIT = 500;
const PREVIEW_TTL_MS = 30 * 60 * 1000;
type Row = Record<string, unknown>;
type VoiceView = 'ideas' | 'ideas-decided' | 'surveys' | 'onboarding-sources' | 'cancel-surveys';

export interface VoiceSnapshotPayload {
  generatedAtMs: number;
  view: string;
  items: Row[];
  summary: Row;
  sources: Row[];
}

function record(value: unknown): Row { return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}; }
function clean(value: unknown, max = 2000): string { return String(value ?? '').trim().slice(0, max); }
function hash(value: unknown): string { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
function finite(value: unknown): number { const n = Number(value); return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0; }
function safeId(value: unknown, max = 180): string { return clean(value, max).replace(/[^a-zA-Z0-9_.:-]/g, '').replace(/^\.+/, ''); }
function requestScope(input: Row): string { return hash(input).slice(0, 24); }

export function encodeVoiceResearchCursor(snapshotId: string, offset: number, scope: string): string {
  return Buffer.from(JSON.stringify({ v: 1, snapshotId, offset, scope })).toString('base64url');
}

export function decodeVoiceResearchCursor(value: string, scope: string): { snapshotId: string; offset: number } | null {
  if (!value) return null;
  if (value.length > 500) throw new Error('cursor_too_long');
  try {
    const cursor = record(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')));
    const snapshotId = safeId(cursor.snapshotId, 160); const offset = Math.floor(Number(cursor.offset));
    if (cursor.v !== 1 || cursor.scope !== scope || !snapshotId || !Number.isFinite(offset) || offset < 0) throw new Error('cursor_mismatch');
    return { snapshotId, offset };
  } catch (error) {
    throw new Error(error instanceof Error && error.message === 'cursor_mismatch' ? error.message : 'invalid_cursor');
  }
}

export function parseVoiceResearchRequest(value: unknown) {
  const input = record(value);
  const candidate = clean(input.view, 40) as VoiceView;
  const view: VoiceView = ['ideas', 'ideas-decided', 'surveys', 'onboarding-sources', 'cancel-surveys'].includes(candidate) ? candidate : 'ideas';
  const rawFilters = record(input.filters);
  const filters = Object.freeze({
    status: clean(rawFilters.status, 20).toLowerCase(), category: clean(rawFilters.category, 30).toLowerCase(),
    reason: clean(rawFilters.reason, 80).toLowerCase(), query: clean(rawFilters.query, 200).toLowerCase(),
    rangeDays: Math.min(180, Math.max(7, finite(rawFilters.rangeDays) || 28)),
    platform: ['ios', 'android'].includes(clean(rawFilters.platform, 20).toLowerCase()) ? clean(rawFilters.platform, 20).toLowerCase() : 'all',
  });
  const selectedSurveyId = safeId(input.selectedSurveyId, 80);
  const pageSize = Math.min(PAGE_MAX, Math.max(10, finite(input.pageSize) || 50));
  const scope = requestScope({ view, filters, selectedSurveyId });
  const cursor = decodeVoiceResearchCursor(clean(input.cursor, 500), scope);
  return { view, filters, selectedSurveyId, pageSize, scope, cursor, exportCsv: input.exportCsv === true };
}

export function packVoiceResearchSnapshot(payload: VoiceSnapshotPayload): string[] {
  const encoded = gzipSync(Buffer.from(JSON.stringify(payload), 'utf8')).toString('base64');
  const chunks: string[] = [];
  for (let offset = 0; offset < encoded.length; offset += SNAPSHOT_CHUNK_CHARS) chunks.push(encoded.slice(offset, offset + SNAPSHOT_CHUNK_CHARS));
  return chunks;
}

export function unpackVoiceResearchSnapshot(chunks: readonly string[]): VoiceSnapshotPayload {
  const value = record(JSON.parse(gunzipSync(Buffer.from(chunks.join(''), 'base64')).toString('utf8')));
  if (!Array.isArray(value.items) || !Array.isArray(value.sources) || !value.summary) throw new Error('voice_snapshot_corrupt');
  return { generatedAtMs: finite(value.generatedAtMs), view: clean(value.view, 40), items: value.items.map(record), summary: record(value.summary), sources: value.sources.map(record) };
}

export function assertVoiceSnapshotBatchFits(chunks: readonly string[]): void {
  const size = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  if (!chunks.length || chunks.length > 11 || size > SNAPSHOT_MAX_ENCODED_CHARS) throw new Error('voice_snapshot_too_large');
}

function requireRole(request: { auth?: { token?: Row } }, permission: AdminPermission) {
  if (!request.auth?.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
  const role = resolveAdminRole(request.auth.token);
  if (!role || !hasPermission(role, permission)) throw new HttpsError('permission-denied', 'Role cannot access Voice research');
  return role;
}

function source(name: string, count: number, limit: number, truncated: boolean, note: string): Row {
  return Object.freeze({ name, state: truncated ? 'partial' : 'ready', count, limit, truncated, note });
}

async function readIdeas(db: FirebaseFirestore.Firestore, input: ReturnType<typeof parseVoiceResearchRequest>): Promise<VoiceSnapshotPayload> {
  const snap = await db.collection('user_ideas').orderBy('createdAtMs', 'desc').limit(IDEAS_LIMIT + 1).get();
  const projected = snap.docs.slice(0, IDEAS_LIMIT).map((doc) => projectIdeaRow(doc.id, doc.data()));
  const scoped = input.view === 'ideas-decided' ? projected.filter((row) => ['approved', 'rejected'].includes(row.status)).sort((a, b) => b.decidedAtMs - a.decidedAtMs || b.createdAtMs - a.createdAtMs) : projected;
  const items = filterIdeaRows(scoped, input.filters) as unknown as Row[];
  return { generatedAtMs: Date.now(), view: input.view, items, summary: { totalLoaded: projected.length, totalMatched: items.length, pending: projected.filter((row) => row.status === 'pending').length, approved: projected.filter((row) => row.status === 'approved').length, rejected: projected.filter((row) => row.status === 'rejected').length }, sources: [source('user_ideas', Math.min(snap.size, IDEAS_LIMIT), IDEAS_LIMIT, snap.size > IDEAS_LIMIT, 'Последние идеи по времени отправки.')] };
}

function safeSurveyConfig(id: string, value: unknown): Row {
  const row = record(value);
  return Object.freeze({ id: safeId(id, 80), surveyId: safeId(row.surveyId ?? id, 80), enabled: row.enabled === true, title: record(row.title), subtitle: record(row.subtitle), rewardShards: finite(row.rewardShards), minDaysBetweenSurveys: finite(row.minDaysBetweenSurveys), audience: record(row.audience), questions: Array.isArray(row.questions) ? row.questions.slice(0, 50).map(record) : [], accentColor: clean(row.accentColor, 20), finalScreen: record(row.finalScreen), createdAtMs: finite(row.createdAtMs), updatedAtMs: finite(row.updatedAtMs), updatedBy: clean(row.updatedBy, 180) });
}

async function readSurveys(db: FirebaseFirestore.Firestore, input: ReturnType<typeof parseVoiceResearchRequest>): Promise<VoiceSnapshotPayload> {
  const [configsSnap, historySnap] = await Promise.all([
    db.collection('shard_surveys').limit(SURVEYS_LIMIT + 1).get(),
    db.collection('admin_voice_research_history').orderBy('createdAtMs', 'desc').limit(500).get(),
  ]);
  const surveys = configsSnap.docs.slice(0, SURVEYS_LIMIT).map((doc) => safeSurveyConfig(doc.id, doc.data()));
  const surveyIds = new Set(surveys.map((survey) => clean(survey.surveyId, 80)));
  const surveyHistory = historySnap.docs.map((doc) => {
    const row = record(doc.data()); const action = clean(row.action, 40); const targetId = safeId(row.targetId, 80);
    if (!action.startsWith('survey_') || !targetId) return null;
    return Object.freeze({ id: safeId(doc.id, 180), action, targetId, before: row.before ? safeSurveyConfig(targetId, row.before) : null, after: row.after ? safeSurveyConfig(targetId, row.after) : null, reason: clean(row.reason, 500), actorUid: clean(row.actorUid, 180), createdAtMs: finite(row.createdAtMs) });
  }).filter((row): row is NonNullable<typeof row> => row !== null);
  const deletedSurveys = surveyHistory.filter((row) => row.action === 'survey_delete' && !surveyIds.has(row.targetId)).filter((row, index, rows) => rows.findIndex((candidate) => candidate.targetId === row.targetId) === index);
  let items: Row[] = []; let stats: Row = {}; const sources: Row[] = [source('shard_surveys', Math.min(configsSnap.size, SURVEYS_LIMIT), SURVEYS_LIMIT, configsSnap.size > SURVEYS_LIMIT, 'Конфигурации опросов.')];
  if (input.selectedSurveyId) {
    const [statsSnap, responsesSnap] = await Promise.all([
      db.collection('shard_survey_stats').doc(input.selectedSurveyId).get(),
      db.collection('shard_survey_responses').where('surveyId', '==', input.selectedSurveyId).orderBy('submittedAtMs', 'desc').limit(RESPONSES_LIMIT + 1).get(),
    ]);
    stats = statsSnap.exists ? record(statsSnap.data()) : {};
    const projected = responsesSnap.docs.slice(0, RESPONSES_LIMIT).map((doc) => projectSurveyResponse(doc.id, doc.data()));
    const query = input.filters.query;
    items = projected.filter((row) => !query || JSON.stringify(row).toLowerCase().includes(query)) as unknown as Row[];
    sources.push(source('shard_survey_responses', Math.min(responsesSnap.size, RESPONSES_LIMIT), RESPONSES_LIMIT, responsesSnap.size > RESPONSES_LIMIT, 'Лента ответов ограничена отдельно от сохранённой all-time статистики.'));
  }
  return { generatedAtMs: Date.now(), view: input.view, items, summary: { surveys, selectedSurveyId: input.selectedSurveyId, stats, surveyHistory: input.selectedSurveyId ? surveyHistory.filter((row) => row.targetId === input.selectedSurveyId).slice(0, 30) : [], deletedSurveys }, sources };
}

async function readOnboarding(db: FirebaseFirestore.Firestore, input: ReturnType<typeof parseVoiceResearchRequest>): Promise<VoiceSnapshotPayload> {
  const nowMs = Date.now(); const fromMs = nowMs - input.filters.rangeDays * 86_400_000;
  let query: FirebaseFirestore.Query = db.collection('app_activity').where('action', '==', 'onboarding_source_select');
  if (input.filters.platform !== 'all') query = query.where('platform', '==', input.filters.platform);
  const snap = await query.where('createdAtMs', '>=', fromMs).orderBy('createdAtMs', 'desc').limit(ONBOARDING_LIMIT + 1).get();
  const raw = snap.docs.slice(0, ONBOARDING_LIMIT).map((doc) => { const data = record(doc.data()); const tags = record(data.tags); return { id: doc.id, uid: data.uid, source: tags.source ?? data.source, platform: data.platform, createdAtMs: data.createdAtMs }; });
  const summary = buildOnboardingSourceSummary(raw);
  return { generatedAtMs: nowMs, view: input.view, items: summary.latest as unknown as Row[], summary: summary as unknown as Row, sources: [source('app_activity', Math.min(snap.size, ONBOARDING_LIMIT), ONBOARDING_LIMIT, snap.size > ONBOARDING_LIMIT, 'Только события onboarding_source_select; последний ответ каждого пользователя.')] };
}

async function readCancellations(db: FirebaseFirestore.Firestore, input: ReturnType<typeof parseVoiceResearchRequest>): Promise<VoiceSnapshotPayload> {
  const snap = await db.collection('subscription_cancel_surveys').orderBy('createdAtMs', 'desc').limit(CANCEL_LIMIT + 1).get();
  const projected = snap.docs.slice(0, CANCEL_LIMIT).map((doc) => projectCancellationRow(doc.id, doc.data()));
  const items = projected.filter((row) => (!input.filters.reason || row.reason === input.filters.reason) && (!input.filters.query || JSON.stringify(row).toLowerCase().includes(input.filters.query)));
  const nowMs = Date.now(); const midMs = nowMs - 14 * 86_400_000; const fromMs = nowMs - 28 * 86_400_000;
  const reasons = ['too_expensive', 'not_enough_value', 'not_using_enough', 'technical_issues'];
  const count = async (from: number, to: number, reason = '') => {
    let query: FirebaseFirestore.Query = db.collection('subscription_cancel_surveys').where('createdAtMs', '>=', from).where('createdAtMs', '<', to);
    if (reason) query = query.where('reason', '==', reason);
    const aggregate = await query.count().get(); return finite(aggregate.data().count);
  };
  const [recentTotal, previousTotal, ...reasonCounts] = await Promise.all([
    count(midMs, nowMs + 1), count(fromMs, midMs),
    ...reasons.flatMap((reason) => [count(midMs, nowMs + 1, reason), count(fromMs, midMs, reason)]),
  ]);
  const recentByReason: Record<string, number> = {}; const previousByReason: Record<string, number> = {};
  reasons.forEach((reason, index) => { recentByReason[reason] = reasonCounts[index * 2]; previousByReason[reason] = reasonCounts[index * 2 + 1]; });
  const feedSummary = buildCancellationSummary(projected, nowMs);
  const summary = { ...feedSummary, exactTrend: buildCancellationTrendFromCounts({ recentTotal, previousTotal, recentByReason, previousByReason }) };
  return { generatedAtMs: nowMs, view: input.view, items: items as unknown as Row[], summary: summary as unknown as Row, sources: [source('subscription_cancel_surveys', Math.min(snap.size, CANCEL_LIMIT), CANCEL_LIMIT, snap.size > CANCEL_LIMIT, 'Feed ограничен последними 500 записями; 14-дневные тренды рассчитаны отдельными точными aggregate-запросами.')] };
}

function exportRows(view: VoiceView, rows: readonly Row[]): string {
  const columns = view.startsWith('ideas') ? ['id', 'uid', 'userName', 'status', 'category', 'title', 'description', 'benefit', 'lang', 'platform', 'appVersion', 'createdAtMs', 'decidedAtMs', 'decidedBy', 'decisionMessageRu']
    : view === 'cancel-surveys' ? ['id', 'uid', 'userName', 'reason', 'reasonText', 'platform', 'lang', 'premiumPlan', 'appVersion', 'createdAtMs']
      : view === 'onboarding-sources' ? ['uid', 'source', 'platform', 'createdAtMs']
        : ['id', 'uid', 'surveyId', 'submittedAtMs', 'platform', 'appVersion', 'answers', 'comment'];
  return [columns, ...rows.map((row) => columns.map((column) => typeof row[column] === 'object' ? JSON.stringify(row[column]) : row[column]))].map((line) => line.map(csvCell).join(',')).join('\r\n');
}

async function cleanupSnapshots(db: FirebaseFirestore.Firestore) {
  try {
    const nowMs = Date.now();
    const [snapshots, drafts] = await Promise.all([
      db.collection('admin_voice_research_snapshots').where('expiresAtMs', '<=', nowMs).limit(10).get(),
      db.collection('admin_voice_research_drafts').where('expiresAtMs', '<=', nowMs).limit(25).get(),
    ]);
    await Promise.all([...snapshots.docs.map((doc) => db.recursiveDelete(doc.ref)), ...drafts.docs.map((doc) => doc.ref.delete())]);
  } catch { /* best effort */ }
}

async function persistSnapshot(db: FirebaseFirestore.Firestore, actorUid: string, scope: string, payload: VoiceSnapshotPayload): Promise<string> {
  const ref = db.collection('admin_voice_research_snapshots').doc(); const chunks = packVoiceResearchSnapshot(payload);
  try { assertVoiceSnapshotBatchFits(chunks); } catch { throw new HttpsError('resource-exhausted', 'voice_snapshot_too_large'); }
  const batch = db.batch(); batch.create(ref, { actorUid, scope, chunkCount: chunks.length, generatedAtMs: payload.generatedAtMs, createdAtMs: Date.now(), expiresAtMs: Date.now() + SNAPSHOT_TTL_MS });
  chunks.forEach((data, index) => batch.create(ref.collection('chunks').doc(String(index).padStart(4, '0')), { index, data })); await batch.commit(); return ref.id;
}

async function loadSnapshot(db: FirebaseFirestore.Firestore, actorUid: string, scope: string, id: string): Promise<VoiceSnapshotPayload> {
  const ref = db.collection('admin_voice_research_snapshots').doc(id); const metaSnap = await ref.get(); if (!metaSnap.exists) throw new HttpsError('failed-precondition', 'voice_snapshot_expired');
  const meta = record(metaSnap.data()); if (meta.actorUid !== actorUid || meta.scope !== scope || finite(meta.expiresAtMs) <= Date.now()) throw new HttpsError('failed-precondition', 'voice_snapshot_expired');
  const count = finite(meta.chunkCount); if (count < 1 || count > 11) throw new HttpsError('data-loss', 'voice_snapshot_corrupt');
  const snaps = await db.getAll(...Array.from({ length: count }, (_, index) => ref.collection('chunks').doc(String(index).padStart(4, '0'))));
  if (snaps.some((snap) => !snap.exists)) throw new HttpsError('data-loss', 'voice_snapshot_corrupt');
  try { return unpackVoiceResearchSnapshot(snaps.map((snap) => clean(record(snap.data()).data, SNAPSHOT_CHUNK_CHARS + 10))); } catch { throw new HttpsError('data-loss', 'voice_snapshot_corrupt'); }
}

export const adminGetVoiceResearchWorkspace = onCall(
  { region: REGION, enforceAppCheck: true, timeoutSeconds: 120, memory: '1GiB' },
  async (request) => {
    let input: ReturnType<typeof parseVoiceResearchRequest>;
    try { input = parseVoiceResearchRequest(request.data); } catch (error) { throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'invalid_voice_research_request'); }
    requireRole(request, input.exportCsv ? 'users.research.export' : 'users.research.read');
    const db = admin.firestore(); const actorUid = request.auth!.uid; let payload: VoiceSnapshotPayload; let snapshotId = input.cursor?.snapshotId || '';
    if (input.cursor) payload = await loadSnapshot(db, actorUid, input.scope, input.cursor.snapshotId);
    else {
      await cleanupSnapshots(db);
      payload = input.view.startsWith('ideas') ? await readIdeas(db, input) : input.view === 'surveys' ? await readSurveys(db, input) : input.view === 'onboarding-sources' ? await readOnboarding(db, input) : await readCancellations(db, input);
      snapshotId = await persistSnapshot(db, actorUid, input.scope, payload);
    }
    const offset = input.cursor?.offset || 0; const items = payload.items.slice(offset, offset + input.pageSize); const next = offset + items.length;
    return { definitionVersion: 'admin_voice_research_v1', generatedAtMs: payload.generatedAtMs, view: input.view, items, totalMatched: payload.items.length, nextCursor: next < payload.items.length ? encodeVoiceResearchCursor(snapshotId, next, input.scope) : '', snapshotCursor: encodeVoiceResearchCursor(snapshotId, 0, input.scope), summary: payload.summary, sources: payload.sources, csv: input.exportCsv ? exportRows(input.view, payload.items) : null, exportedCount: input.exportCsv ? payload.items.length : 0 };
  },
);

type VoiceMutationAction = 'idea_decide' | SurveyMutationAction;

function parseMutationInput(value: unknown) {
  const data = record(value); const candidate = clean(data.action, 40) as VoiceMutationAction;
  const allowed: VoiceMutationAction[] = ['idea_decide', 'survey_create', 'survey_update', 'survey_toggle', 'survey_delete', 'survey_restore'];
  if (!allowed.includes(candidate)) throw new HttpsError('invalid-argument', 'voice_action_invalid');
  const targetId = safeId(data.targetId, 180); const reason = clean(data.reason, 500); const requestId = safeId(data.requestId, 160); const payload = record(data.payload);
  if (!targetId || !reason || !requestId) throw new HttpsError('invalid-argument', 'targetId, reason and requestId required');
  return { action: candidate, targetId, reason, requestId, payload };
}

export const adminPreviewVoiceResearchMutation = onCall(
  { region: REGION, enforceAppCheck: true, timeoutSeconds: 30, memory: '512MiB' },
  async (request) => {
    const input = parseMutationInput(request.data); const role = requireRole(request, 'users.research.write');
    if (input.action === 'idea_decide' && input.payload.decision === 'approve' && !hasPermission(role, 'money.manual_access.write')) throw new HttpsError('permission-denied', 'Idea approval requires money.manual_access.write');
    const db = admin.firestore(); const nowMs = Date.now(); let mutation: Row; let beforeFingerprint = ''; let userProgressFingerprint = '';
    if (input.action === 'idea_decide') {
      const ideaSnap = await db.collection('user_ideas').doc(input.targetId).get();
      if (!ideaSnap.exists) throw new HttpsError('not-found', 'idea_not_found');
      const idea: Row = { id: ideaSnap.id, ...record(ideaSnap.data()) }; const uid = clean(idea.uid, 180);
      if (!uid) throw new HttpsError('failed-precondition', 'idea_missing_uid');
      const userSnap = await db.collection('users').doc(uid).get(); const progress = record(record(userSnap.data()).progress);
      try { mutation = buildIdeaDecisionMutation(idea, progress, input.payload, nowMs, clean(request.auth?.token?.email ?? request.auth?.uid, 180)) as unknown as Row; }
      catch (error) { throw new HttpsError('failed-precondition', error instanceof Error ? error.message : 'idea_preview_failed'); }
      beforeFingerprint = hash(idea); userProgressFingerprint = hash(progress);
    } else {
      const surveySnap = await db.collection('shard_surveys').doc(input.targetId).get(); const current = surveySnap.exists ? { surveyId: surveySnap.id, ...record(surveySnap.data()) } : null;
      try { mutation = buildSurveyMutation(input.action, current, input.payload, nowMs, request.auth!.uid) as unknown as Row; }
      catch (error) { throw new HttpsError('failed-precondition', error instanceof Error ? error.message : 'survey_preview_failed'); }
      beforeFingerprint = hash(current);
    }
    const packet = { ...input, mutation, beforeFingerprint, userProgressFingerprint, effectiveAtMs: nowMs };
    const fingerprint = hash(packet); const confirmation = `${input.action.toUpperCase()}/${input.targetId}/${fingerprint.slice(0, 12)}`;
    const previewRef = db.collection('admin_voice_research_previews').doc();
    await previewRef.create({ actorUid: request.auth!.uid, role, ...packet, fingerprint, confirmation, createdAtMs: nowMs, expiresAtMs: nowMs + PREVIEW_TTL_MS });
    return { ok: true, previewId: previewRef.id, action: input.action, targetId: input.targetId, reason: input.reason, mutation, confirmation, fingerprint, expiresAtMs: nowMs + PREVIEW_TTL_MS };
  },
);

export const adminApplyVoiceResearchMutation = onCall(
  { region: REGION, enforceAppCheck: true, timeoutSeconds: 60, memory: '512MiB' },
  async (request) => {
    const role = requireRole(request, 'users.research.write'); const data = record(request.data);
    const previewId = safeId(data.previewId, 180); const confirmation = clean(data.confirmation, 260); const reason = clean(data.reason, 500); const requestId = safeId(data.requestId, 160); const idempotencyKey = safeId(data.idempotencyKey, 180);
    if (!previewId || !confirmation || !reason || !requestId || !idempotencyKey) throw new HttpsError('invalid-argument', 'previewId, confirmation, reason, requestId and idempotencyKey required');
    const actorUid = request.auth!.uid; const db = admin.firestore(); const previewRef = db.collection('admin_voice_research_previews').doc(previewId); const operationRef = db.collection('admin_command_operations').doc(idempotencyKey); const requestFingerprint = hash({ previewId, confirmation });
    const prior = await operationRef.get();
    if (prior.exists) { const row = record(prior.data()); if (row.actorUid !== actorUid || row.requestFingerprint !== requestFingerprint) throw new HttpsError('already-exists', 'idempotency_conflict'); return { ok: true, action: clean(row.action, 40), targetId: clean(row.targetId, 180), replayed: true }; }
    return db.runTransaction(async (tx) => {
      const [operationSnap, previewSnap] = await Promise.all([tx.get(operationRef), tx.get(previewRef)]);
      if (operationSnap.exists) { const row = record(operationSnap.data()); if (row.actorUid !== actorUid || row.requestFingerprint !== requestFingerprint) throw new HttpsError('already-exists', 'idempotency_conflict'); return { ok: true, action: clean(row.action, 40), targetId: clean(row.targetId, 180), replayed: true }; }
      if (!previewSnap.exists) throw new HttpsError('not-found', 'voice_preview_not_found');
      const preview = record(previewSnap.data()); const action = clean(preview.action, 40) as VoiceMutationAction; const targetId = safeId(preview.targetId, 180);
      if (preview.actorUid !== actorUid || preview.confirmation !== confirmation || preview.reason !== reason || preview.consumedAtMs || finite(preview.expiresAtMs) <= Date.now()) throw new HttpsError('failed-precondition', 'voice_preview_invalid');
      if (action === 'idea_decide' && record(preview.payload).decision === 'approve' && !hasPermission(role, 'money.manual_access.write')) throw new HttpsError('permission-denied', 'Idea approval requires money.manual_access.write');
      const mutation = record(preview.mutation); const nowMs = Date.now();
      if (action === 'idea_decide') {
        const ideaRef = db.collection('user_ideas').doc(targetId); const ideaSnap = await tx.get(ideaRef); if (!ideaSnap.exists) throw new HttpsError('not-found', 'idea_not_found');
        const idea: Row = { id: ideaSnap.id, ...record(ideaSnap.data()) }; if (hash(idea) !== preview.beforeFingerprint) throw new HttpsError('failed-precondition', 'voice_target_changed');
        const uid = clean(mutation.uid, 180); const userRef = db.collection('users').doc(uid); const userSnap = await tx.get(userRef); const progress = record(record(userSnap.data()).progress);
        if (hash(progress) !== preview.userProgressFingerprint) throw new HttpsError('failed-precondition', 'voice_user_access_changed');
        tx.update(ideaRef, record(mutation.ideaPatch));
        const progressPatch = record(mutation.progressPatch); if (Object.keys(progressPatch).length) tx.set(userRef, Object.fromEntries(Object.entries(progressPatch).map(([key, value]) => [`progress.${key}`, value])), { merge: true });
        const inbox = record(mutation.inbox); const inboxId = safeId(inbox.id, 180); tx.create(userRef.collection('idea_inbox').doc(inboxId), Object.fromEntries(Object.entries(inbox).filter(([key]) => key !== 'id')));
      } else {
        const surveyRef = db.collection('shard_surveys').doc(targetId); const surveySnap = await tx.get(surveyRef); const current = surveySnap.exists ? { surveyId: surveySnap.id, ...record(surveySnap.data()) } : null;
        if (hash(current) !== preview.beforeFingerprint) throw new HttpsError('failed-precondition', 'voice_target_changed');
        const after = mutation.after == null ? null : record(mutation.after);
        if (after) tx.set(surveyRef, after, { merge: false }); else tx.delete(surveyRef);
      }
      const historyRef = db.collection('admin_voice_research_history').doc(); const auditRef = db.collection('admin_log').doc();
      tx.create(historyRef, { action, targetId, actorUid, role, beforeFingerprint: preview.beforeFingerprint, before: action === 'idea_decide' ? { status: 'pending' } : record(mutation.before), after: action === 'idea_decide' ? { decision: record(preview.payload).decision, nominalRewardUntilMs: mutation.nominalRewardUntilMs } : mutation.after ?? null, reason, requestId, createdAtMs: nowMs });
      const audit = createAuditRecord({ action: `voice_research.${action}`, actorUid, role, entity: { collection: action === 'idea_decide' ? 'user_ideas' : 'shard_surveys', id: targetId }, reason, before: { fingerprint: preview.beforeFingerprint }, after: { action, targetId }, rollbackReference: `admin_voice_research_history/${historyRef.id}`, requestId, timestamp: new Date(nowMs).toISOString() });
      tx.update(previewRef, { consumedAtMs: nowMs, consumedBy: actorUid, operationId: idempotencyKey }); tx.create(auditRef, { ...audit, operationId: idempotencyKey }); tx.create(operationRef, { actorUid, requestFingerprint, action, targetId, auditId: auditRef.id, historyId: historyRef.id, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      return { ok: true, action, targetId, replayed: false };
    });
  },
);
