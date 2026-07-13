import { createHash } from 'crypto';
import { gzipSync, gunzipSync } from 'zlib';
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { createAuditRecord } from './admin/audit_contract';
import { hasPermission, resolveAdminRole, type AdminPermission } from './admin/permissions';
import {
  buildPolicyEvidence,
  buildUserReportsCsv,
  filterBanSummaries,
  filterSafetyFlagSummaries,
  filterUserReportSummaries,
  namedSourceState,
  projectBanSummary,
  projectConsentAggregateInput,
  projectSafetyFlagSummary,
  projectUserReport,
  type SafetyModerationView,
} from './admin_safety_moderation_core';

if (admin.apps.length === 0) admin.initializeApp();

const REGION = 'us-central1';
const PAGE_MAX = 100;
const SNAPSHOT_TTL_MS = 30 * 60 * 1_000;
const SNAPSHOT_CHUNK_CHARS = 700_000;
const SNAPSHOT_MAX_ENCODED_CHARS = 8_000_000;
const REPORTS_LIMIT = 5_000;
const FLAGS_LIMIT = 5_000;
const CONSENTS_LIMIT = 8_000;
const BANS_LIMIT = 1_000;
const DEFINITION_VERSION = 'admin_safety_moderation_v1';

type Row = Record<string, unknown>;

export interface SafetyModerationSnapshotPayload {
  definitionVersion: string;
  generatedAtMs: number;
  view: string;
  items: Row[];
  summary: Row;
  sources: Row[];
}

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function clean(value: unknown, max = 2_000): string {
  return String(value ?? '').trim().slice(0, max);
}

function finite(value: unknown): number {
  const result = Number(value);
  return Number.isFinite(result) ? Math.max(0, Math.floor(result)) : 0;
}

function safeId(value: unknown, max = 180): string {
  return clean(value, max).replace(/[^a-zA-Z0-9_.:-]/g, '').replace(/^\.+/, '');
}

function hash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function requestScope(value: unknown): string {
  return hash(value).slice(0, 24);
}

const VIEWS: readonly SafetyModerationView[] = ['overview', 'user-reports', 'safety-flags', 'age-consent', 'policy-evidence', 'ban-list', 'other-reports'];

export function encodeSafetyModerationCursor(snapshotId: string, offset: number, scope: string): string {
  return Buffer.from(JSON.stringify({ v: 1, snapshotId, offset, scope })).toString('base64url');
}

export function decodeSafetyModerationCursor(value: string, scope: string): { snapshotId: string; offset: number } | null {
  if (!value) return null;
  if (value.length > 500) throw new Error('cursor_too_long');
  try {
    const cursor = record(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')));
    const snapshotId = safeId(cursor.snapshotId, 160);
    const offset = Math.floor(Number(cursor.offset));
    if (cursor.v !== 1 || cursor.scope !== scope || !snapshotId || !Number.isFinite(offset) || offset < 0) throw new Error('cursor_mismatch');
    return { snapshotId, offset };
  } catch (error) {
    throw new Error(error instanceof Error && error.message === 'cursor_mismatch' ? error.message : 'invalid_cursor');
  }
}

export function parseSafetyModerationRequest(value: unknown) {
  const input = record(value);
  const candidate = clean(input.view, 40) as SafetyModerationView;
  const view: SafetyModerationView = VIEWS.includes(candidate) ? candidate : 'overview';
  const rawFilters = record(input.filters);
  const requestedSort = clean(rawFilters.sort, 30).toLowerCase();
  const filters = Object.freeze({
    status: clean(rawFilters.status, 30).toLowerCase(),
    reason: clean(rawFilters.reason, 80).toLowerCase(),
    category: clean(rawFilters.category, 80).toLowerCase(),
    query: clean(rawFilters.query, 200).toLowerCase(),
    sort: ['date_desc', 'date_asc', 'name'].includes(requestedSort) ? requestedSort : 'date_desc',
  });
  const uid = safeId(input.uid, 180);
  const pageSize = Math.min(PAGE_MAX, Math.max(10, finite(input.pageSize) || 50));
  const exportCsv = input.exportCsv === true;
  const scope = requestScope({ definitionVersion: DEFINITION_VERSION, view, filters, uid, exportCsv });
  const cursor = decodeSafetyModerationCursor(clean(input.cursor, 500), scope);
  return { view, filters, uid, pageSize, exportCsv, scope, cursor };
}

export function requiredSafetyModerationPermission(view: SafetyModerationView, exportCsv: boolean): AdminPermission {
  if (exportCsv) return 'users.moderation.export';
  if (view === 'safety-flags') return 'users.moderation.safety.read';
  if (view === 'age-consent' || view === 'policy-evidence') return 'users.moderation.aggregate.read';
  if (view === 'other-reports') return 'reports.read';
  return 'users.moderation.read';
}

export function packSafetyModerationSnapshot(payload: SafetyModerationSnapshotPayload): string[] {
  const encoded = gzipSync(Buffer.from(JSON.stringify(payload), 'utf8')).toString('base64');
  const chunks: string[] = [];
  for (let offset = 0; offset < encoded.length; offset += SNAPSHOT_CHUNK_CHARS) chunks.push(encoded.slice(offset, offset + SNAPSHOT_CHUNK_CHARS));
  return chunks;
}

export function unpackSafetyModerationSnapshot(chunks: readonly string[]): SafetyModerationSnapshotPayload {
  const value = record(JSON.parse(gunzipSync(Buffer.from(chunks.join(''), 'base64')).toString('utf8')));
  if (!Array.isArray(value.items) || !Array.isArray(value.sources) || !value.summary) throw new Error('safety_snapshot_corrupt');
  return {
    definitionVersion: clean(value.definitionVersion, 80),
    generatedAtMs: finite(value.generatedAtMs),
    view: clean(value.view, 40),
    items: value.items.map(record),
    summary: record(value.summary),
    sources: value.sources.map(record),
  };
}

export function assertSafetySnapshotBatchFits(chunks: readonly string[]): void {
  const encodedLength = chunks.reduce((total, chunk) => total + chunk.length, 0);
  if (!chunks.length || chunks.length > 11 || encodedLength > SNAPSHOT_MAX_ENCODED_CHARS) throw new Error('safety_snapshot_too_large');
}

function requireRole(request: { auth?: { token?: Row } }, permission: AdminPermission) {
  if (!request.auth?.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
  const role = resolveAdminRole(request.auth.token);
  if (!role || !hasPermission(role, permission)) throw new HttpsError('permission-denied', 'Role cannot access Safety & Moderation');
  return role;
}

function emptyPayload(view: SafetyModerationView, nowMs: number): SafetyModerationSnapshotPayload {
  return { definitionVersion: DEFINITION_VERSION, generatedAtMs: nowMs, view, items: [], summary: {}, sources: [] };
}

async function exactCount(db: FirebaseFirestore.Firestore, collectionName: string): Promise<{ count: number; error: string }> {
  try {
    const snap = await db.collection(collectionName).count().get();
    return { count: finite(snap.data().count), error: '' };
  } catch (error) {
    return { count: 0, error: clean(error instanceof Error ? error.message : error, 240) || 'source_unavailable' };
  }
}

async function readOverview(db: FirebaseFirestore.Firestore, role: ReturnType<typeof resolveAdminRole>): Promise<SafetyModerationSnapshotPayload> {
  const nowMs = Date.now();
  const tasks: Array<Promise<{ name: string; count: number; error: string }>> = [
    exactCount(db, 'user_reports').then((result) => ({ name: 'user_reports', ...result })),
    exactCount(db, 'banned_users').then((result) => ({ name: 'banned_users', ...result })),
  ];
  if (role && hasPermission(role, 'users.moderation.safety.read')) tasks.push(exactCount(db, 'safety_flags').then((result) => ({ name: 'safety_flags', ...result })));
  if (role && hasPermission(role, 'users.moderation.aggregate.read')) tasks.push(exactCount(db, 'user_consents').then((result) => ({ name: 'user_consents', ...result })));
  const results = await Promise.all(tasks);
  return {
    ...emptyPayload('overview', nowMs),
    summary: { counts: Object.fromEntries(results.map((result) => [result.name, result.count])) },
    sources: results.map((result) => namedSourceState(result.name, { scanned: result.count, matched: result.count, cap: 0, hasMore: false, capturedAtMs: nowMs, error: result.error })),
  };
}

async function readUserReports(db: FirebaseFirestore.Firestore, input: ReturnType<typeof parseSafetyModerationRequest>): Promise<SafetyModerationSnapshotPayload> {
  const nowMs = Date.now();
  try {
    const snap = await db.collection('user_reports').orderBy('createdAtMs', 'desc').limit(REPORTS_LIMIT + 1).get();
    const projected = snap.docs.slice(0, REPORTS_LIMIT).map((doc) => projectUserReport(doc.id, doc.data()));
    const filtered = filterUserReportSummaries(projected, input.filters).filter((row) => !input.uid || row.reportedUid === input.uid || row.reporterUid === input.uid);
    return {
      definitionVersion: DEFINITION_VERSION, generatedAtMs: nowMs, view: input.view, items: filtered as unknown as Row[],
      summary: { totalLoaded: projected.length, totalMatched: filtered.length },
      sources: [namedSourceState('user_reports', { scanned: Math.min(snap.size, REPORTS_LIMIT), matched: filtered.length, cap: REPORTS_LIMIT, hasMore: snap.size > REPORTS_LIMIT, capturedAtMs: nowMs })],
    };
  } catch (error) {
    return { ...emptyPayload(input.view, nowMs), sources: [namedSourceState('user_reports', { scanned: 0, matched: 0, cap: REPORTS_LIMIT, hasMore: false, capturedAtMs: nowMs, error: error instanceof Error ? error.message : error })] };
  }
}

async function readSafetyFlags(db: FirebaseFirestore.Firestore, input: ReturnType<typeof parseSafetyModerationRequest>): Promise<SafetyModerationSnapshotPayload> {
  const nowMs = Date.now();
  try {
    const snap = await db.collection('safety_flags').orderBy('createdAtMs', 'desc').limit(FLAGS_LIMIT + 1).get();
    const projected = snap.docs.slice(0, FLAGS_LIMIT).map((doc) => projectSafetyFlagSummary(doc.id, doc.data()));
    const filtered = filterSafetyFlagSummaries(projected, input.filters).filter((row) => !input.uid || row.uid === input.uid);
    return {
      definitionVersion: DEFINITION_VERSION, generatedAtMs: nowMs, view: input.view, items: filtered as unknown as Row[],
      summary: { totalLoaded: projected.length, totalMatched: filtered.length, open: projected.filter((row) => !row.handled).length, handled: projected.filter((row) => row.handled).length },
      sources: [namedSourceState('safety_flags', { scanned: Math.min(snap.size, FLAGS_LIMIT), matched: filtered.length, cap: FLAGS_LIMIT, hasMore: snap.size > FLAGS_LIMIT, capturedAtMs: nowMs })],
    };
  } catch (error) {
    return { ...emptyPayload(input.view, nowMs), sources: [namedSourceState('safety_flags', { scanned: 0, matched: 0, cap: FLAGS_LIMIT, hasMore: false, capturedAtMs: nowMs, error: error instanceof Error ? error.message : error })] };
  }
}

async function readConsentEvidence(db: FirebaseFirestore.Firestore, view: 'age-consent' | 'policy-evidence'): Promise<SafetyModerationSnapshotPayload> {
  const nowMs = Date.now();
  try {
    const snap = await db.collection('user_consents').limit(CONSENTS_LIMIT + 1).get();
    const projected = snap.docs.slice(0, CONSENTS_LIMIT).map((doc) => projectConsentAggregateInput(doc.id, doc.data()));
    const evidence = buildPolicyEvidence(projected, { nowMs, declaredMinimumAge: 16, runtimeMinimumAge: null });
    return {
      definitionVersion: DEFINITION_VERSION, generatedAtMs: nowMs, view, items: [], summary: evidence as unknown as Row,
      sources: [namedSourceState('user_consents', { scanned: Math.min(snap.size, CONSENTS_LIMIT), matched: projected.length, cap: CONSENTS_LIMIT, hasMore: snap.size > CONSENTS_LIMIT, capturedAtMs: nowMs })],
    };
  } catch (error) {
    return { ...emptyPayload(view, nowMs), sources: [namedSourceState('user_consents', { scanned: 0, matched: 0, cap: CONSENTS_LIMIT, hasMore: false, capturedAtMs: nowMs, error: error instanceof Error ? error.message : error })] };
  }
}

async function getAllInChunks(db: FirebaseFirestore.Firestore, refs: FirebaseFirestore.DocumentReference[]): Promise<FirebaseFirestore.DocumentSnapshot[]> {
  const result: FirebaseFirestore.DocumentSnapshot[] = [];
  for (let offset = 0; offset < refs.length; offset += 100) result.push(...await db.getAll(...refs.slice(offset, offset + 100)));
  return result;
}

async function readBans(db: FirebaseFirestore.Firestore, input: ReturnType<typeof parseSafetyModerationRequest>): Promise<SafetyModerationSnapshotPayload> {
  const nowMs = Date.now();
  try {
    const snap = await db.collection('banned_users').limit(BANS_LIMIT + 1).get();
    const docs = snap.docs.slice(0, BANS_LIMIT);
    const userSnaps = await getAllInChunks(db, docs.map((doc) => db.collection('users').doc(doc.id)));
    const leaderboardSnaps = await getAllInChunks(db, docs.map((doc) => db.collection('leaderboard').doc(doc.id)));
    const chatSnaps = await getAllInChunks(db, docs.map((doc) => db.collection('league_chat_bans').doc(doc.id)));
    const projected = docs.map((doc, index) => projectBanSummary(doc.id, {
      ...doc.data(),
      usersBanned: userSnaps[index]?.exists ? record(userSnaps[index].data()).banned === true : false,
      leaderboardPresent: leaderboardSnaps[index]?.exists === true,
      chatRestricted: chatSnaps[index]?.exists === true,
    }));
    const filtered = filterBanSummaries(projected, input.filters).filter((row) => !input.uid || row.uid === input.uid);
    return {
      definitionVersion: DEFINITION_VERSION, generatedAtMs: nowMs, view: input.view, items: filtered as unknown as Row[],
      summary: { totalLoaded: projected.length, totalMatched: filtered.length, inconsistent: projected.filter((row) => row.consistency === 'inconsistent').length },
      sources: [namedSourceState('banned_users', { scanned: Math.min(snap.size, BANS_LIMIT), matched: filtered.length, cap: BANS_LIMIT, hasMore: snap.size > BANS_LIMIT, capturedAtMs: nowMs })],
    };
  } catch (error) {
    return { ...emptyPayload(input.view, nowMs), sources: [namedSourceState('banned_users', { scanned: 0, matched: 0, cap: BANS_LIMIT, hasMore: false, capturedAtMs: nowMs, error: error instanceof Error ? error.message : error })] };
  }
}

async function buildSnapshotPayload(db: FirebaseFirestore.Firestore, role: ReturnType<typeof resolveAdminRole>, input: ReturnType<typeof parseSafetyModerationRequest>): Promise<SafetyModerationSnapshotPayload> {
  if (input.view === 'overview') return readOverview(db, role);
  if (input.view === 'user-reports') return readUserReports(db, input);
  if (input.view === 'safety-flags') return readSafetyFlags(db, input);
  if (input.view === 'age-consent' || input.view === 'policy-evidence') return readConsentEvidence(db, input.view);
  if (input.view === 'ban-list') return readBans(db, input);
  return { ...emptyPayload('other-reports', Date.now()), summary: { delegatedRoute: 'report-center' }, sources: [{ name: 'admin_reports_center', status: 'ready', scanned: 0, matched: 0, cap: 0, capturedAtMs: Date.now(), reason: '' }] };
}

async function cleanupSnapshots(db: FirebaseFirestore.Firestore): Promise<void> {
  try {
    const expired = await db.collection('admin_safety_moderation_snapshots').where('expiresAtMs', '<=', Date.now()).limit(10).get();
    await Promise.all(expired.docs.map((doc) => db.recursiveDelete(doc.ref)));
  } catch {
    // Best-effort retention cleanup must not make an otherwise valid read fail.
  }
}

async function persistSnapshot(db: FirebaseFirestore.Firestore, actorUid: string, scope: string, payload: SafetyModerationSnapshotPayload): Promise<string> {
  const ref = db.collection('admin_safety_moderation_snapshots').doc();
  const chunks = packSafetyModerationSnapshot(payload);
  try { assertSafetySnapshotBatchFits(chunks); } catch { throw new HttpsError('resource-exhausted', 'safety_snapshot_too_large'); }
  const nowMs = Date.now();
  const batch = db.batch();
  batch.create(ref, { actorUid, scope, definitionVersion: DEFINITION_VERSION, chunkCount: chunks.length, generatedAtMs: payload.generatedAtMs, createdAtMs: nowMs, expiresAtMs: nowMs + SNAPSHOT_TTL_MS });
  chunks.forEach((data, index) => batch.create(ref.collection('chunks').doc(String(index).padStart(4, '0')), { index, data }));
  await batch.commit();
  return ref.id;
}

async function loadSnapshot(db: FirebaseFirestore.Firestore, actorUid: string, scope: string, snapshotId: string): Promise<SafetyModerationSnapshotPayload> {
  const ref = db.collection('admin_safety_moderation_snapshots').doc(snapshotId);
  const metaSnap = await ref.get();
  if (!metaSnap.exists) throw new HttpsError('failed-precondition', 'safety_snapshot_expired');
  const meta = record(metaSnap.data());
  if (meta.actorUid !== actorUid || meta.scope !== scope || meta.definitionVersion !== DEFINITION_VERSION || finite(meta.expiresAtMs) <= Date.now()) throw new HttpsError('failed-precondition', 'safety_snapshot_expired');
  const chunkCount = finite(meta.chunkCount);
  if (chunkCount < 1 || chunkCount > 11) throw new HttpsError('data-loss', 'safety_snapshot_corrupt');
  const chunks = await db.getAll(...Array.from({ length: chunkCount }, (_, index) => ref.collection('chunks').doc(String(index).padStart(4, '0'))));
  if (chunks.some((chunk) => !chunk.exists)) throw new HttpsError('data-loss', 'safety_snapshot_corrupt');
  try { return unpackSafetyModerationSnapshot(chunks.map((chunk) => clean(record(chunk.data()).data, SNAPSHOT_CHUNK_CHARS + 10))); }
  catch { throw new HttpsError('data-loss', 'safety_snapshot_corrupt'); }
}

export const adminGetSafetyModerationWorkspace = onCall(
  { region: REGION, enforceAppCheck: true, timeoutSeconds: 120, memory: '1GiB' },
  async (request) => {
    let input: ReturnType<typeof parseSafetyModerationRequest>;
    try { input = parseSafetyModerationRequest(request.data); }
    catch (error) { throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'invalid_safety_moderation_request'); }
    const permission = requiredSafetyModerationPermission(input.view, input.exportCsv);
    const role = requireRole(request, permission);
    const actorUid = request.auth!.uid;
    const db = admin.firestore();
    let snapshotId = input.cursor?.snapshotId || '';
    let payload: SafetyModerationSnapshotPayload;
    if (input.cursor) payload = await loadSnapshot(db, actorUid, input.scope, input.cursor.snapshotId);
    else {
      await cleanupSnapshots(db);
      payload = await buildSnapshotPayload(db, role, input);
      snapshotId = await persistSnapshot(db, actorUid, input.scope, payload);
    }
    const offset = input.cursor?.offset || 0;
    const items = payload.items.slice(offset, offset + input.pageSize);
    const nextOffset = offset + items.length;
    const csv = input.exportCsv && input.view === 'user-reports' ? buildUserReportsCsv(payload.items as never[]) : null;
    return {
      definitionVersion: DEFINITION_VERSION,
      generatedAtMs: payload.generatedAtMs,
      view: input.view,
      items,
      totalMatched: payload.items.length,
      nextCursor: nextOffset < payload.items.length ? encodeSafetyModerationCursor(snapshotId, nextOffset, input.scope) : '',
      snapshotCursor: encodeSafetyModerationCursor(snapshotId, 0, input.scope),
      summary: payload.summary,
      sources: payload.sources,
      csv,
      exportedCount: csv == null ? 0 : payload.items.length,
    };
  },
);

export const adminGetSafetyModerationSensitiveDetail = onCall(
  { region: REGION, enforceAppCheck: true, timeoutSeconds: 30, memory: '512MiB' },
  async (request) => {
    const role = requireRole(request, 'users.moderation.sensitive.read');
    const input = record(request.data);
    const flagId = safeId(input.flagId, 180);
    const reason = clean(input.reason, 500);
    const requestId = safeId(input.requestId, 160);
    if (!flagId || !reason || !requestId) throw new HttpsError('invalid-argument', 'flagId, reason and requestId required');
    const db = admin.firestore();
    const flagSnap = await db.collection('safety_flags').doc(flagId).get();
    if (!flagSnap.exists) throw new HttpsError('not-found', 'safety_flag_not_found');
    const value = record(flagSnap.data());
    const category = clean(value.category, 80);
    const userText = clean(value.userText ?? value.text, 8_000);
    const historyContext = (Array.isArray(value.historyContext) ? value.historyContext : []).slice(-20).map((entry) => {
      const row = record(entry);
      return Object.freeze({ role: clean(row.role, 40), text: clean(row.text ?? row.content, 2_000) });
    });
    const auditId = await writeSensitiveAccessAudit(db, { actorUid: request.auth!.uid, role, flagId, category, reason, requestId });
    return { ok: true, flagId, category, userText, historyContext, auditId };
  },
);

async function writeSensitiveAccessAudit(db: FirebaseFirestore.Firestore, input: { actorUid: string; role: string; flagId: string; category: string; reason: string; requestId: string }): Promise<string> {
  const auditRef = db.collection('admin_log').doc();
  const audit = createAuditRecord({
    action: 'safety_moderation.sensitive_detail.view',
    actorUid: input.actorUid,
    role: input.role as never,
    entity: { collection: 'safety_flags', id: input.flagId },
    reason: input.reason,
    before: {},
    after: { category: input.category, fieldsViewed: ['message', 'conversation_context'] },
    requestId: input.requestId,
    timestamp: new Date().toISOString(),
  });
  await auditRef.create(audit);
  return auditRef.id;
}
