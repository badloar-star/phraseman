import { createHash } from 'crypto';
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { createAuditRecord } from './admin/audit_contract';
import { hasPermission, resolveAdminRole } from './admin/permissions';
import { ENFORCE_APP_CHECK } from './callable_options';

if (admin.apps.length === 0) admin.initializeApp();

const REGION = 'us-central1';
const CACHE_SCAN_LIMIT = 500;
const CACHE_EXPORT_LIMIT = 500;
const CACHE_EXPORT_SCAN_LIMIT = 5_000;
const CACHE_EXPORT_BYTE_LIMIT = 800_000;
const CACHE_RESET_PREVIEW_TTL_MS = 10 * 60 * 1000;
const CACHE_PENDING_RESET_AGE_MS = 10 * 60 * 1000;
const HASH_RE = /^[a-f0-9]{40}$/;
type Row = Record<string, unknown>;

export type CacheSource =
  | 'choice_explanations'
  | 'phrase_explanations'
  | 'mistake_explanations'
  | 'quiz_explanations'
  | 'compass_briefings';

export type CacheStatus = 'ready' | 'pending' | 'rejected';

const CACHE_SCHEMA_VERSION: Readonly<Record<CacheSource, number>> = Object.freeze({
  choice_explanations: 3,
  phrase_explanations: 6,
  mistake_explanations: 6,
  quiz_explanations: 2,
  compass_briefings: 3,
});

const CACHE_SOURCES = new Set<CacheSource>(Object.keys(CACHE_SCHEMA_VERSION) as CacheSource[]);

export interface CacheListRequest {
  source: CacheSource;
  status: '' | CacheStatus;
  lang: string;
  query: string;
  pageSize: number;
  cursor: string;
}

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function clean(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

function parseSource(value: unknown): CacheSource {
  const source = clean(value, 64) as CacheSource;
  if (!CACHE_SOURCES.has(source)) throw new Error('invalid_cache_source');
  return source;
}

function parseHash(value: unknown, error = 'invalid_cache_document_id'): string {
  const id = clean(value, 80).toLowerCase();
  if (!HASH_RE.test(id)) throw new Error(error);
  return id;
}

export function parseCacheListRequest(value: unknown): CacheListRequest {
  const raw = record(value);
  const source = parseSource(raw.source);
  const rawStatus = clean(raw.status, 32);
  if (rawStatus && !['ready', 'pending', 'rejected'].includes(rawStatus)) throw new Error('invalid_cache_status');
  const requestedPageSize = Number(raw.pageSize ?? 25);
  return {
    source,
    status: rawStatus as '' | CacheStatus,
    lang: clean(raw.lang, 16).toLowerCase(),
    query: clean(raw.query, 200).toLowerCase(),
    pageSize: Number.isFinite(requestedPageSize) ? Math.max(1, Math.min(50, Math.floor(requestedPageSize))) : 25,
    cursor: clean(raw.cursor, 240),
  };
}

export function encodeCacheCursor(source: CacheSource, id: string): string {
  return Buffer.from(JSON.stringify({ v: 1, source: parseSource(source), id: parseHash(id, 'invalid_cache_cursor') })).toString('base64url');
}

export function decodeCacheCursor(cursor: string, source: CacheSource): string {
  if (!cursor) return '';
  if (cursor.length > 240) throw new Error('invalid_cache_cursor');
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as Row;
    if (parsed.v !== 1 || parsed.source !== source) {
      if (parsed.source !== source) throw new Error('cache_cursor_source_mismatch');
      throw new Error('invalid_cache_cursor');
    }
    return parseHash(parsed.id, 'invalid_cache_cursor');
  } catch (error) {
    if (error instanceof Error && error.message === 'cache_cursor_source_mismatch') throw error;
    throw new Error('invalid_cache_cursor');
  }
}

function numberValue(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value && typeof value === 'object' && typeof (value as { toMillis?: unknown }).toMillis === 'function') {
    const millis = Number((value as { toMillis: () => number }).toMillis());
    return Number.isFinite(millis) ? millis : 0;
  }
  return 0;
}

function statusValue(value: unknown): string {
  const status = clean(value, 32).toLowerCase();
  return status || 'unknown';
}

function stringMap(value: unknown, maxEntries = 30, maxValue = 2_000): Record<string, string> {
  const raw = record(value);
  return Object.fromEntries(Object.entries(raw).slice(0, maxEntries).flatMap(([key, item]) => {
    const safeKey = clean(key, 200);
    const safeValue = clean(item, maxValue);
    return safeKey && safeValue ? [[safeKey, safeValue]] : [];
  }));
}

export type CacheEntryProjection = Row & {
  id: string;
  source: CacheSource;
  status: string;
  lang: string;
  schemaVersion: number;
  createdAtMs: number;
  updatedAtMs: number;
};

export function projectCacheEntry(source: CacheSource, idValue: string, value: unknown): CacheEntryProjection {
  const id = parseHash(idValue);
  const data = record(value);
  const common: CacheEntryProjection = {
    id,
    source,
    status: statusValue(data.status),
    lang: clean(data.lang, 16).toLowerCase(),
    schemaVersion: Math.max(0, Math.floor(numberValue(data.schemaVersion))),
    reason: clean(data.reason, 500),
    model: clean(data.model, 100),
    createdAtMs: numberValue(data.createdAtMs ?? data.createdAt),
    updatedAtMs: numberValue(data.updatedAtMs ?? data.updatedAt),
  };
  if (source === 'choice_explanations') return {
    ...common,
    correctEn: clean(data.correctEn, 500),
    confirm: clean(data.confirm, 4_000),
    distractors: stringMap(data.distractors),
  };
  if (source === 'phrase_explanations') return {
    ...common,
    phraseEn: clean(data.phraseEn ?? data.correctEn, 500),
    text: clean(data.text, 6_000),
  };
  if (source === 'mistake_explanations') return {
    ...common,
    targetEn: clean(data.targetEn, 500),
    userAnswer: clean(data.userAnswer, 500),
    full: clean(data.full, 8_000),
    eli5: clean(data.eli5, 5_000),
  };
  if (source === 'quiz_explanations') return {
    ...common,
    questionPrompt: clean(data.questionPrompt, 2_000),
    correctEn: clean(data.correctEn, 500),
    confirm: clean(data.confirm, 4_000),
    options: stringMap(data.options),
  };
  return {
    ...common,
    comment: clean(data.comment, 6_000),
  };
}

function canonicalize(value: unknown): unknown {
  if (value === null || value === undefined) return value ?? null;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value === 'object' && typeof (value as { toMillis?: unknown }).toMillis === 'function') {
    return numberValue(value);
  }
  if (typeof value === 'object') {
    return Object.fromEntries(Object.keys(value as Row).sort().map((key) => [key, canonicalize((value as Row)[key])]));
  }
  return String(value);
}

export function cacheDocumentFingerprint(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex');
}

export function isCacheResetAllowed(dataValue: unknown, nowMs = Date.now()): { ok: true } | { ok: false; reason: string } {
  const data = record(dataValue);
  if (statusValue(data.status) !== 'pending') return { ok: true };
  const lockAtMs = numberValue(data.updatedAtMs ?? data.createdAtMs ?? data.updatedAt ?? data.createdAt);
  if (lockAtMs > 0 && nowMs - lockAtMs > CACHE_PENDING_RESET_AGE_MS) return { ok: true };
  return { ok: false, reason: 'cache_generation_in_progress' };
}

function searchText(item: CacheEntryProjection): string {
  return Object.entries(item).flatMap(([key, value]) => {
    if (['id', 'source', 'status', 'lang', 'reason', 'model'].includes(key)) return [String(value)];
    if (typeof value === 'string') return [value];
    if (value && typeof value === 'object' && !Array.isArray(value)) return Object.entries(value as Row).flatMap(([mapKey, mapValue]) => [mapKey, String(mapValue)]);
    return [];
  }).join(' ').toLowerCase();
}

function itemMatches(item: CacheEntryProjection, request: CacheListRequest): boolean {
  if (request.status && item.status !== request.status) return false;
  if (request.lang && item.lang !== request.lang) return false;
  return !request.query || searchText(item).includes(request.query);
}

function roleFor(request: { auth?: { token?: unknown; uid: string } }) {
  const role = resolveAdminRole(record(request.auth?.token));
  if (!request.auth || !role) throw new HttpsError('permission-denied', 'Admin only');
  return role;
}

function asHttpsError(error: unknown): never {
  if (error instanceof HttpsError) throw error;
  throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'invalid_cache_request');
}

async function countQuery(query: FirebaseFirestore.Query): Promise<number> {
  const result = await query.count().get();
  return Number(result.data().count || 0);
}

async function cacheSummary(db: FirebaseFirestore.Firestore, source: CacheSource) {
  const collection = db.collection(source);
  const [total, ready, pending, rejected] = await Promise.all([
    countQuery(collection),
    countQuery(collection.where('status', '==', 'ready')),
    countQuery(collection.where('status', '==', 'pending')),
    countQuery(collection.where('status', '==', 'rejected')),
  ]);
  return { total, ready, pending, rejected, other: Math.max(0, total - ready - pending - rejected), currentSchemaVersion: CACHE_SCHEMA_VERSION[source] };
}

async function cachePage(db: FirebaseFirestore.Firestore, request: CacheListRequest) {
  const cursorId = decodeCacheCursor(request.cursor, request.source);
  let query: FirebaseFirestore.Query = db.collection(request.source)
    .orderBy(admin.firestore.FieldPath.documentId())
    .limit(CACHE_SCAN_LIMIT);
  if (cursorId) query = query.startAfter(cursorId);
  const snap = await query.get();
  const items: CacheEntryProjection[] = [];
  let inspected = 0;
  let lastInspectedId = '';
  for (const doc of snap.docs) {
    inspected += 1;
    lastInspectedId = doc.id;
    const projected = projectCacheEntry(request.source, doc.id, doc.data());
    if (itemMatches(projected, request)) items.push(projected);
    if (items.length >= request.pageSize) break;
  }
  const hasMore = inspected < snap.docs.length || snap.size >= CACHE_SCAN_LIMIT;
  const nextCursor = hasMore && lastInspectedId ? encodeCacheCursor(request.source, lastInspectedId) : null;
  return { items, nextCursor, scannedCount: inspected, hasMore };
}

export const adminListCacheEntries = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds: 90, memory: '512MiB' },
  async (request) => {
    const role = roleFor(request);
    if (!hasPermission(role, 'content.cache.read')) throw new HttpsError('permission-denied', 'Role cannot read content cache');
    let parsed: CacheListRequest;
    try { parsed = parseCacheListRequest(request.data); } catch (error) { return asHttpsError(error); }
    const db = admin.firestore();
    const [summary, page] = await Promise.all([cacheSummary(db, parsed.source), cachePage(db, parsed)]);
    return { ok: true, source: parsed.source, summary, ...page, fetchedAtMs: Date.now() };
  },
);

function mutationFields(data: Row): { reason: string; requestId: string; idempotencyKey: string } {
  const reason = clean(data.reason, 500);
  const requestId = clean(data.requestId, 160);
  const idempotencyKey = clean(data.idempotencyKey, 160);
  if (!reason || !requestId || !idempotencyKey) throw new HttpsError('invalid-argument', 'reason, requestId and idempotencyKey are required');
  return { reason, requestId, idempotencyKey };
}

interface CacheExportRead {
  items: CacheEntryProjection[];
  scannedCount: number;
  truncated: boolean;
}

async function readCacheExport(db: FirebaseFirestore.Firestore, request: CacheListRequest): Promise<CacheExportRead> {
  const matches: CacheEntryProjection[] = [];
  let scannedCount = 0;
  let cursorId = '';
  let reachedEnd = false;
  while (scannedCount < CACHE_EXPORT_SCAN_LIMIT && matches.length <= CACHE_EXPORT_LIMIT && !reachedEnd) {
    const batchLimit = Math.min(CACHE_SCAN_LIMIT, CACHE_EXPORT_SCAN_LIMIT - scannedCount);
    let query: FirebaseFirestore.Query = db.collection(request.source)
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(batchLimit);
    if (cursorId) query = query.startAfter(cursorId);
    const snap = await query.get();
    if (snap.empty) { reachedEnd = true; break; }
    for (const doc of snap.docs) {
      scannedCount += 1;
      cursorId = doc.id;
      const item = projectCacheEntry(request.source, doc.id, doc.data());
      if (itemMatches(item, request)) matches.push(item);
      if (matches.length > CACHE_EXPORT_LIMIT) break;
    }
    if (snap.size < batchLimit) reachedEnd = true;
  }
  return {
    items: matches.slice(0, CACHE_EXPORT_LIMIT),
    scannedCount,
    truncated: matches.length > CACHE_EXPORT_LIMIT || !reachedEnd,
  };
}

function reviewPacket(source: CacheSource, items: readonly CacheEntryProjection[], truncated: boolean): string {
  return [
    'Phraseman cache review packet v1',
    `Source: ${source}`,
    `Truncated: ${truncated ? 'yes — refine filters before treating this packet as complete' : 'no'}`,
    'Review every entry for factual language-learning accuracy. Do not change document ids. Return JSON only for entries that need correction.',
    JSON.stringify(items, null, 2),
  ].join('\n\n');
}

function replayedCacheExport(operation: Row, actorUid: string, requestFingerprint: string) {
  if (operation.actorUid !== actorUid || operation.requestFingerprint !== requestFingerprint) throw new HttpsError('already-exists', 'idempotency conflict');
  const saved = record(operation.exportResult);
  const payload = typeof saved.payload === 'string' ? saved.payload : '';
  const source = clean(saved.source, 64);
  const format = clean(saved.format, 32);
  if (!payload || !CACHE_SOURCES.has(source as CacheSource) || !['json', 'review_packet_v1'].includes(format)) {
    throw new HttpsError('failed-precondition', 'cache export replay payload is unavailable');
  }
  return {
    ok: true, source, format, payload,
    count: Math.max(0, Number(saved.count || 0)),
    scannedCount: Math.max(0, Number(saved.scannedCount || 0)),
    truncated: saved.truncated === true,
    replayed: true,
  };
}

export const adminExportCacheEntries = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds: 90, memory: '512MiB' },
  async (request) => {
    const role = roleFor(request);
    if (!hasPermission(role, 'content.cache.export')) throw new HttpsError('permission-denied', 'Role cannot export content cache');
    const data = record(request.data);
    const fields = mutationFields(data);
    let parsed: CacheListRequest;
    try { parsed = parseCacheListRequest({ ...data, cursor: '', pageSize: 50 }); } catch (error) { return asHttpsError(error); }
    const format = data.format === 'review_packet_v1' ? 'review_packet_v1' : data.format === 'json' ? 'json' : '';
    if (!format) throw new HttpsError('invalid-argument', 'invalid_cache_export_format');
    const actorUid = request.auth!.uid;
    const requestFingerprint = cacheDocumentFingerprint({ source: parsed.source, status: parsed.status, lang: parsed.lang, query: parsed.query, format, reason: fields.reason });
    const db = admin.firestore();
    const operationRef = db.collection('admin_command_operations').doc(fields.idempotencyKey);
    const existingOperation = await operationRef.get();
    if (existingOperation.exists) return replayedCacheExport(existingOperation.data() || {}, actorUid, requestFingerprint);
    const exportRead = await readCacheExport(db, parsed);
    const payload = format === 'json' ? JSON.stringify(exportRead.items, null, 2) : reviewPacket(parsed.source, exportRead.items, exportRead.truncated);
    if (Buffer.byteLength(payload, 'utf8') > CACHE_EXPORT_BYTE_LIMIT) throw new HttpsError('resource-exhausted', 'cache export exceeds byte limit');
    const exportResult = {
      source: parsed.source, format, payload, count: exportRead.items.length,
      scannedCount: exportRead.scannedCount, truncated: exportRead.truncated,
    };
    const auditRef = db.collection('admin_log').doc();
    return db.runTransaction(async (tx) => {
      const operation = await tx.get(operationRef);
      if (operation.exists) {
        return replayedCacheExport(operation.data() || {}, actorUid, requestFingerprint);
      }
      const audit = createAuditRecord({
        action: 'content_cache.export', actorUid, role,
        entity: { collection: parsed.source, id: 'filtered-export' }, reason: fields.reason,
        before: {}, after: { source: parsed.source, status: parsed.status, lang: parsed.lang, query: parsed.query, format, count: exportResult.count, scannedCount: exportResult.scannedCount, truncated: exportResult.truncated, bytes: Buffer.byteLength(payload, 'utf8') },
        requestId: fields.requestId, timestamp: new Date().toISOString(),
      });
      tx.create(auditRef, { ...audit, operationId: fields.idempotencyKey });
      tx.create(operationRef, { actorUid, requestFingerprint, auditId: auditRef.id, exportResult, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      return { ok: true, ...exportResult, replayed: false };
    });
  },
);

export const adminPreviewCacheReset = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    const role = roleFor(request);
    if (!hasPermission(role, 'content.cache.reset')) throw new HttpsError('permission-denied', 'Role cannot reset content cache');
    const data = record(request.data);
    const reason = clean(data.reason, 500);
    const requestId = clean(data.requestId, 160);
    if (!reason || !requestId) throw new HttpsError('invalid-argument', 'reason and requestId are required');
    let source: CacheSource;
    let documentId: string;
    try { source = parseSource(data.source); documentId = parseHash(data.documentId); } catch (error) { return asHttpsError(error); }
    const db = admin.firestore();
    const documentRef = db.collection(source).doc(documentId);
    const documentSnap = await documentRef.get();
    if (!documentSnap.exists) throw new HttpsError('not-found', 'cache entry not found');
    const raw = documentSnap.data() || {};
    const reset = isCacheResetAllowed(raw);
    if (!reset.ok) throw new HttpsError('failed-precondition', reset.reason);
    const nowMs = Date.now();
    const previewRef = db.collection('admin_cache_reset_previews').doc();
    const projected = projectCacheEntry(source, documentId, raw);
    const confirmation = `${source}/${documentId}`;
    const preview = {
      type: 'content_cache_reset', actorUid: request.auth!.uid, source, documentId,
      fingerprint: cacheDocumentFingerprint(raw), status: projected.status, lang: projected.lang,
      schemaVersion: projected.schemaVersion, updatedAtMs: projected.updatedAtMs,
      confirmation, consequence: 'Deletes exactly one cached entry. Regeneration occurs only on later user demand.',
      reason, requestId, createdAtMs: nowMs, expiresAtMs: nowMs + CACHE_RESET_PREVIEW_TTL_MS,
    };
    await previewRef.create(preview);
    return { ok: true, previewId: previewRef.id, source, documentId, status: projected.status, lang: projected.lang, schemaVersion: projected.schemaVersion, updatedAtMs: projected.updatedAtMs, confirmation, consequence: preview.consequence, expiresAtMs: preview.expiresAtMs };
  },
);

export const adminResetCacheEntry = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    const role = roleFor(request);
    if (!hasPermission(role, 'content.cache.reset')) throw new HttpsError('permission-denied', 'Role cannot reset content cache');
    const data = record(request.data);
    const fields = mutationFields(data);
    const previewId = clean(data.previewId, 160);
    const confirmation = clean(data.confirmation, 180);
    if (!previewId || !confirmation) throw new HttpsError('invalid-argument', 'previewId and confirmation are required');
    const actorUid = request.auth!.uid;
    const db = admin.firestore();
    const previewRef = db.collection('admin_cache_reset_previews').doc(previewId);
    const operationRef = db.collection('admin_command_operations').doc(fields.idempotencyKey);
    const auditRef = db.collection('admin_log').doc();
    const requestFingerprint = cacheDocumentFingerprint({ previewId, confirmation });
    return db.runTransaction(async (tx) => {
      const [operationSnap, previewSnap] = await Promise.all([tx.get(operationRef), tx.get(previewRef)]);
      if (operationSnap.exists) {
        const previous = operationSnap.data() || {};
        if (previous.actorUid !== actorUid || previous.requestFingerprint !== requestFingerprint) throw new HttpsError('already-exists', 'idempotency conflict');
        return { ok: true, source: clean(previous.source, 64), documentId: clean(previous.documentId, 80), replayed: true };
      }
      if (!previewSnap.exists) throw new HttpsError('not-found', 'cache reset preview not found');
      const preview = previewSnap.data() || {};
      if (preview.type !== 'content_cache_reset' || preview.actorUid !== actorUid || Number(preview.expiresAtMs || 0) <= Date.now() || Number(preview.consumedAtMs || 0) > 0) {
        throw new HttpsError('failed-precondition', 'cache reset preview expired, consumed or belongs to another actor');
      }
      let source: CacheSource;
      let documentId: string;
      try { source = parseSource(preview.source); documentId = parseHash(preview.documentId); } catch (error) { return asHttpsError(error); }
      const exactConfirmation = `${source}/${documentId}`;
      if (confirmation !== exactConfirmation || preview.confirmation !== exactConfirmation) throw new HttpsError('failed-precondition', 'cache reset confirmation mismatch');
      const documentRef = db.collection(source).doc(documentId);
      const documentSnap = await tx.get(documentRef);
      if (!documentSnap.exists) throw new HttpsError('failed-precondition', 'cache entry changed or no longer exists');
      const raw = documentSnap.data() || {};
      if (cacheDocumentFingerprint(raw) !== preview.fingerprint) throw new HttpsError('failed-precondition', 'cache entry changed after preview');
      const reset = isCacheResetAllowed(raw);
      if (!reset.ok) throw new HttpsError('failed-precondition', reset.reason);
      const before = projectCacheEntry(source, documentId, raw);
      const nowMs = Date.now();
      const audit = createAuditRecord({
        action: 'content_cache.reset', actorUid, role, entity: { collection: source, id: documentId }, reason: fields.reason,
        before: { status: before.status, lang: before.lang, schemaVersion: before.schemaVersion, updatedAtMs: before.updatedAtMs, fingerprint: preview.fingerprint },
        after: { deleted: true, regeneration: 'on_later_user_demand' }, requestId: fields.requestId, timestamp: new Date(nowMs).toISOString(),
      });
      tx.delete(documentRef);
      tx.update(previewRef, { consumedAtMs: nowMs, consumedBy: actorUid, operationId: fields.idempotencyKey });
      tx.create(auditRef, { ...audit, operationId: fields.idempotencyKey });
      tx.create(operationRef, { actorUid, requestFingerprint, source, documentId, auditId: auditRef.id, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      return { ok: true, source, documentId, replayed: false };
    });
  },
);
