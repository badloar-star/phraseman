import { createHash } from 'crypto';
import { gzipSync, gunzipSync } from 'zlib';
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { hasPermission, resolveAdminRole, type AdminPermission } from './admin/permissions';
import {
  buildCancellationSummary, buildCancellationTrendFromCounts, buildOnboardingSourceSummary, csvCell, filterIdeaRows,
  projectCancellationRow, projectIdeaRow, projectSurveyResponse,
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
  const configsSnap = await db.collection('shard_surveys').limit(SURVEYS_LIMIT + 1).get();
  const surveys = configsSnap.docs.slice(0, SURVEYS_LIMIT).map((doc) => safeSurveyConfig(doc.id, doc.data()));
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
  return { generatedAtMs: Date.now(), view: input.view, items, summary: { surveys, selectedSurveyId: input.selectedSurveyId, stats }, sources };
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
  try { const expired = await db.collection('admin_voice_research_snapshots').where('expiresAtMs', '<=', Date.now()).limit(10).get(); await Promise.all(expired.docs.map((doc) => db.recursiveDelete(doc.ref))); } catch { /* best effort */ }
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
