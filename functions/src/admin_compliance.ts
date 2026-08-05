import { createHash } from 'crypto';
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { createAuditRecord } from './admin/audit_contract';
import { hasPermission, roleFromAdminToken } from './admin/permissions';
import { ENFORCE_APP_CHECK, ENFORCE_APP_CHECK_SENSITIVE } from './callable_options';

const REGION = 'us-central1';
const CONSENTS = 'user_consents';
const SAFETY = 'safety_flags';
const OPERATIONS = 'admin_command_operations';
const AUDIT = 'admin_log';
const MAX_PAGE = 100;
const MAX_SCAN = 500;
const SAFE_ID = /^[A-Za-z0-9._:-]{1,180}$/;
export const SAFETY_CATEGORIES = Object.freeze([
  'suicide', 'self_harm', 'abuse', 'violence', 'sexual_minors', 'sexual', 'hate', 'illicit',
] as const);

type Row = Record<string, unknown>;
type SafetyFilter = 'open' | 'handled' | 'all';
type SafetyCursor = Readonly<{ phase: 'dated'; createdAtMs: number; id: string } | { phase: 'legacy'; id: string | null }>;

function record(value: unknown): value is Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredText(value: unknown, field: string, max = 500): string {
  const result = typeof value === 'string' ? value.trim() : '';
  if (!result || result.length > max) throw new HttpsError('invalid-argument', `${field} is required`);
  return result;
}

function requireAdmin(request: { app?: unknown; auth?: { uid?: string; token?: unknown } }, permission: 'diagnostics.read' | 'diagnostics.status.write') {
  if (!request.app) throw new HttpsError('failed-precondition', 'App Check required');
  const actorUid = request.auth?.uid?.trim() ?? '';
  if (!actorUid) throw new HttpsError('unauthenticated', 'Authentication required');
  const role = roleFromAdminToken(request.auth?.token);
  if (!role || !hasPermission(role, permission)) throw new HttpsError('permission-denied', 'Permission denied');
  return { actorUid, role };
}

export function deriveComplianceCounts(input: {
  consentTotal: number; adult: number; teenSafe: number; under13: number;
  analyticsGranted: number; analyticsDenied: number;
  aiExplainGranted: number; aiExplainDenied: number;
  aiDialogGranted: number; aiDialogDenied: number;
  safetyTotal: number; safetyHandled: number; minorTotal: number; minorHandled: number;
}) {
  const nonNegative = (value: number) => Math.max(0, Math.trunc(Number(value) || 0));
  const total = nonNegative(input.consentTotal);
  const adult = nonNegative(input.adult);
  const teenSafe = nonNegative(input.teenSafe);
  const under13 = nonNegative(input.under13);
  const granted = nonNegative(input.analyticsGranted);
  const denied = nonNegative(input.analyticsDenied);
  const aiExplainGranted = nonNegative(input.aiExplainGranted);
  const aiExplainDenied = nonNegative(input.aiExplainDenied);
  const aiDialogGranted = nonNegative(input.aiDialogGranted);
  const aiDialogDenied = nonNegative(input.aiDialogDenied);
  const safetyTotal = nonNegative(input.safetyTotal);
  const safetyHandled = Math.min(safetyTotal, nonNegative(input.safetyHandled));
  const minorTotal = nonNegative(input.minorTotal);
  const minorHandled = Math.min(minorTotal, nonNegative(input.minorHandled));
  return Object.freeze({
    consent: {
      total,
      brackets: { adult, teen_safe: teenSafe, under13, unknown: Math.max(0, total - adult - teenSafe - under13) },
      analytics: { granted, denied, unset: Math.max(0, total - granted - denied) },
      aiExplain: {
        granted: aiExplainGranted,
        denied: aiExplainDenied,
        unset: Math.max(0, total - aiExplainGranted - aiExplainDenied),
      },
      aiDialog: {
        granted: aiDialogGranted,
        denied: aiDialogDenied,
        unset: Math.max(0, total - aiDialogGranted - aiDialogDenied),
      },
    },
    safety: {
      total: safetyTotal, handled: safetyHandled, open: safetyTotal - safetyHandled,
      minor: { total: minorTotal, handled: minorHandled, open: minorTotal - minorHandled },
    },
    jurisdiction: { status: 'unavailable_not_collected' as const },
    complete: true as const,
  });
}

function normalizeCursor(value: unknown): SafetyCursor | null {
  if (value == null || value === '') return null;
  if (!record(value) || (value.phase !== 'dated' && value.phase !== 'legacy')) throw new HttpsError('invalid-argument', 'Invalid cursor');
  const id = value.id == null && value.phase === 'legacy' ? null : requiredText(value.id, 'cursor id', 180);
  if (id && !SAFE_ID.test(id)) throw new HttpsError('invalid-argument', 'Invalid cursor id');
  if (value.phase === 'legacy') return Object.freeze({ phase: 'legacy' as const, id });
  const createdAtMs = Number(value.createdAtMs);
  if (!Number.isFinite(createdAtMs) || createdAtMs < 0 || !id) throw new HttpsError('invalid-argument', 'Invalid dated cursor');
  return Object.freeze({ phase: 'dated' as const, createdAtMs, id });
}

export function normalizeSafetyListInput(value: unknown): Readonly<{ handled: SafetyFilter; category: string | null; limit: number; cursor: SafetyCursor | null }> {
  const data = record(value) ? value : {};
  const handled = data.handled == null ? 'open' : data.handled;
  if (handled !== 'open' && handled !== 'handled' && handled !== 'all') throw new HttpsError('invalid-argument', 'Invalid handled filter');
  const category = data.category == null || data.category === '' ? null : requiredText(data.category, 'category', 40);
  if (category && !(SAFETY_CATEGORIES as readonly string[]).includes(category)) throw new HttpsError('invalid-argument', 'Invalid category');
  const requestedLimit = data.limit == null ? 50 : Number(data.limit);
  if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > MAX_PAGE) throw new HttpsError('invalid-argument', 'limit must be 1..100');
  const cursor = normalizeCursor(data.cursor);
  return Object.freeze({ handled, category, limit: requestedLimit, cursor });
}

export function safetyFlagMatchesFilter(row: Row, filter: Pick<ReturnType<typeof normalizeSafetyListInput>, 'handled' | 'category'>): boolean {
  if (filter.category && row.category !== filter.category) return false;
  return filter.handled === 'all' || (filter.handled === 'handled' ? row.handled === true : row.handled !== true);
}

export function normalizeSafetyMarkInput(value: unknown) {
  if (!record(value)) throw new HttpsError('invalid-argument', 'Safety command required');
  if (!Array.isArray(value.ids) || value.ids.length < 1 || value.ids.length > MAX_PAGE) throw new HttpsError('invalid-argument', 'ids must contain 1..100 values');
  const ids = [...new Set(value.ids.map((id) => requiredText(id, 'id', 180)))];
  if (ids.some((id) => !SAFE_ID.test(id))) throw new HttpsError('invalid-argument', 'Invalid safety id');
  const reason = requiredText(value.reason, 'reason');
  const requestId = requiredText(value.requestId, 'requestId', 180);
  const idempotencyKey = requiredText(value.idempotencyKey, 'idempotencyKey', 180);
  if (!SAFE_ID.test(requestId) || !SAFE_ID.test(idempotencyKey)) throw new HttpsError('invalid-argument', 'Invalid request token');
  return Object.freeze({ ids: Object.freeze(ids), reason, requestId, idempotencyKey });
}

async function count(query: FirebaseFirestore.Query): Promise<number> {
  return (await query.count().get()).data().count;
}

async function complianceOverview(db: FirebaseFirestore.Firestore) {
  const consents = db.collection(CONSENTS);
  const safety = db.collection(SAFETY);
  const minor = (bracket: string) => safety.where('ageBracket', '==', bracket);
  const [consentTotal, adult, teenSafe, under13, analyticsGranted, analyticsDenied,
    aiExplainGranted, aiExplainDenied, aiDialogGranted, aiDialogDenied,
    safetyTotal, safetyHandled, teenTotal, under13Total, teenHandled, under13Handled] = await Promise.all([
    count(consents), count(consents.where('ageBracket', '==', 'adult')),
    count(consents.where('ageBracket', '==', 'teen_safe')), count(consents.where('ageBracket', '==', 'under13')),
    count(consents.where('analyticsConsent', '==', 'granted')), count(consents.where('analyticsConsent', '==', 'denied')),
    count(consents.where('aiExplainConsent', '==', 'granted')), count(consents.where('aiExplainConsent', '==', 'denied')),
    count(consents.where('aiDialogConsent', '==', 'granted')), count(consents.where('aiDialogConsent', '==', 'denied')),
    count(safety), count(safety.where('handled', '==', true)), count(minor('teen_safe')), count(minor('under13')),
    count(minor('teen_safe').where('handled', '==', true)), count(minor('under13').where('handled', '==', true)),
  ]);
  return deriveComplianceCounts({ consentTotal, adult, teenSafe, under13, analyticsGranted, analyticsDenied,
    aiExplainGranted, aiExplainDenied, aiDialogGranted, aiDialogDenied,
    safetyTotal, safetyHandled, minorTotal: teenTotal + under13Total, minorHandled: teenHandled + under13Handled });
}

export const adminGetComplianceOverview = onCall({
  region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds: 30, memory: '256MiB',
}, async (request) => {
  requireAdmin(request, 'diagnostics.read');
  return complianceOverview(admin.firestore());
});

async function exactFilteredTotal(db: FirebaseFirestore.Firestore, filter: ReturnType<typeof normalizeSafetyListInput>) {
  let base: FirebaseFirestore.Query = db.collection(SAFETY);
  if (filter.category) base = base.where('category', '==', filter.category);
  const total = await count(base);
  if (filter.handled === 'all') return total;
  const handled = await count(base.where('handled', '==', true));
  return filter.handled === 'handled' ? handled : Math.max(0, total - handled);
}

export const adminListSafetyFlags = onCall({
  region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds: 30, memory: '256MiB',
}, async (request) => {
  requireAdmin(request, 'diagnostics.read');
  const filter = normalizeSafetyListInput(request.data);
  const db = admin.firestore();
  const exactTotal = await exactFilteredTotal(db, filter);
  let cursor: SafetyCursor = filter.cursor ?? { phase: 'dated', createdAtMs: Number.MAX_SAFE_INTEGER, id: '\uf8ff' };
  let scanned = 0;
  let exhausted = false;
  const rows: Row[] = [];
  while (rows.length < filter.limit && scanned < MAX_SCAN && !exhausted) {
    const take = Math.min(100, MAX_SCAN - scanned);
    let query: FirebaseFirestore.Query;
    if (cursor.phase === 'dated') {
      query = db.collection(SAFETY).where('createdAtMs', '>=', 0).orderBy('createdAtMs', 'desc')
        .orderBy(admin.firestore.FieldPath.documentId(), 'desc').limit(take);
      if (cursor.createdAtMs !== Number.MAX_SAFE_INTEGER) query = query.startAfter(cursor.createdAtMs, cursor.id);
    } else {
      query = db.collection(SAFETY).orderBy(admin.firestore.FieldPath.documentId(), 'desc').limit(take);
      if (cursor.id) query = query.startAfter(cursor.id);
    }
    const snapshot = await query.get();
    if (snapshot.empty) {
      if (cursor.phase === 'dated') { cursor = { phase: 'legacy', id: null }; continue; }
      exhausted = true;
      break;
    }
    let consumed = 0;
    for (const doc of snapshot.docs) {
      consumed += 1;
      scanned += 1;
      const data = doc.data();
      const createdAtMs = data.createdAtMs;
      const isDated = typeof createdAtMs === 'number' && Number.isFinite(createdAtMs) && createdAtMs >= 0;
      cursor = cursor.phase === 'dated'
        ? { phase: 'dated', createdAtMs: isDated ? createdAtMs : 0, id: doc.id }
        : { phase: 'legacy', id: doc.id };
      if ((cursor.phase === 'dated' ? isDated : !isDated) && safetyFlagMatchesFilter(data, filter)) rows.push({ id: doc.id, ...data });
      if (rows.length >= filter.limit || scanned >= MAX_SCAN) break;
    }
    if (consumed === snapshot.size && snapshot.size < take) {
      if (cursor.phase === 'dated') cursor = { phase: 'legacy', id: null };
      else exhausted = true;
    }
  }
  const scanBoundReached = scanned >= MAX_SCAN && rows.length < filter.limit && !exhausted;
  return {
    rows,
    filteredTotal: exactTotal,
    complete: exhausted,
    pageComplete: rows.length >= filter.limit || exhausted,
    scanBoundReached,
    exhausted,
    nextCursor: exhausted ? null : cursor,
    scanned,
  };
});

export const adminMarkSafetyFlagsHandled = onCall({
  region: REGION, enforceAppCheck: ENFORCE_APP_CHECK_SENSITIVE, timeoutSeconds: 30, memory: '256MiB',
}, async (request) => {
  const { actorUid, role } = requireAdmin(request, 'diagnostics.status.write');
  const input = normalizeSafetyMarkInput(request.data);
  const db = admin.firestore();
  const fingerprint = createHash('sha256').update(JSON.stringify({ ids: [...input.ids].sort(), reason: input.reason, requestId: input.requestId })).digest('hex');
  const operationId = `safety_handle_${createHash('sha256').update(input.idempotencyKey).digest('hex')}`;
  return db.runTransaction(async (tx) => {
    const operationRef = db.collection(OPERATIONS).doc(operationId);
    const operation = await tx.get(operationRef);
    if (operation.exists) {
      const previous = operation.data() ?? {};
      if (previous.requestFingerprint !== fingerprint || previous.actorUid !== actorUid) throw new HttpsError('already-exists', 'Idempotency key conflict');
      return { ...(record(previous.result) ? previous.result : {}), replayed: true };
    }
    const refs = input.ids.map((id) => db.collection(SAFETY).doc(id));
    const snapshots = await Promise.all(refs.map((ref) => tx.get(ref)));
    const updated: string[] = [];
    const alreadyHandled: string[] = [];
    const missing: string[] = [];
    snapshots.forEach((snapshot, index) => {
      const id = input.ids[index];
      if (!snapshot.exists) { missing.push(id); return; }
      if (snapshot.data()?.handled === true) { alreadyHandled.push(id); return; }
      updated.push(id);
    });
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    snapshots.forEach((snapshot, index) => {
      if (!updated.includes(input.ids[index])) return;
      tx.set(snapshot.ref, { handled: true, handledAt: admin.firestore.FieldValue.serverTimestamp(), handledAtMs: nowMs,
        handledBy: actorUid, handledReason: input.reason, handledOperationId: operationId }, { merge: true });
    });
    const auditRef = db.collection(AUDIT).doc();
    const result = { ok: true, updated, alreadyHandled, missing, updatedCount: updated.length,
      alreadyHandledCount: alreadyHandled.length, missingCount: missing.length, auditId: auditRef.id, replayed: false };
    const audit = createAuditRecord({ action: 'safety_flags.mark_handled', actorUid, role,
      entity: { collection: SAFETY, id: input.ids.length === 1 ? input.ids[0] : `bulk:${input.ids.length}` }, reason: input.reason,
      before: { requestedIds: input.ids, requestedCount: input.ids.length },
      after: { updated, alreadyHandled, missing, operationId }, rollbackReference: null,
      requestId: input.requestId, timestamp: nowIso });
    tx.create(auditRef, { ...audit, operationId });
    tx.create(operationRef, { action: 'safety_flags.mark_handled', actorUid, requestFingerprint: fingerprint,
      idempotencyKey: input.idempotencyKey, result, createdAt: admin.firestore.FieldValue.serverTimestamp(), createdAtMs: nowMs });
    return result;
  });
});
