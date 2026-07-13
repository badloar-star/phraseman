import { createHash } from 'crypto';
import { gzipSync, gunzipSync } from 'zlib';
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { createAuditRecord } from './admin/audit_contract';
import { hasPermission, resolveAdminRole } from './admin/permissions';
import { buildPlusControlSnapshot, filterPlusAccounts, filterPlusFindings } from './admin_plus_control_core';
import { parseProgressMs, resolvePremiumAccessBreakdown } from './premium_status';

if (admin.apps.length === 0) admin.initializeApp();

const REGION = 'us-central1';
const USER_PAGE_SIZE = 1_000;
const RESULT_PAGE_MAX = 100;
const MIGRATION_LIMIT = 100;
const PREVIEW_TTL_MS = 30 * 60 * 1000;
const SNAPSHOT_TTL_MS = 30 * 60 * 1000;
const SNAPSHOT_CHUNK_CHARS = 700_000;
const SNAPSHOT_MAX_ENCODED_CHARS = 8_000_000;
type Row = Record<string, unknown>;

function record(value: unknown): Row { return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}; }
function clean(value: unknown, max = 160): string { return String(value ?? '').trim().slice(0, max); }
function hash(value: unknown): string { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
function requestScope(view: string, filter: string, query: string): string { return hash({ view, filter, query }).slice(0, 24); }
export function encodePlusControlCursor(snapshotId: string, offset: number, scope: string): string {
  return Buffer.from(JSON.stringify({ v: 2, snapshotId, offset, scope })).toString('base64url');
}
export function decodePlusControlCursor(value: string, scope: string): { snapshotId: string; offset: number } | null {
  if (!value) return null;
  if (value.length > 500) throw new Error('cursor_too_long');
  try {
    const cursor = record(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')));
    const offset = Math.floor(Number(cursor.offset));
    const snapshotId = clean(cursor.snapshotId, 160);
    if (cursor.v !== 2 || cursor.scope !== scope || !snapshotId || !Number.isFinite(offset) || offset < 0) throw new Error('cursor_mismatch');
    return { snapshotId, offset };
  } catch (error) {
    throw new Error(error instanceof Error && error.message === 'cursor_mismatch' ? error.message : 'invalid_cursor');
  }
}

function roleFor(request: { auth?: { token?: Row } }, permission: 'money.read' | 'money.manual_access.write') {
  if (!request.auth?.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
  const role = resolveAdminRole(request.auth.token);
  if (!role || !hasPermission(role, permission)) throw new HttpsError('permission-denied', 'Role cannot access Plus control');
  return role;
}

export function parsePlusControlRequest(value: unknown) {
  const input = record(value);
  const view = clean(input.view, 20) === 'radar' ? 'radar' as const : 'accounts' as const;
  const filter = clean(input.filter, 60).toLowerCase() || 'all';
  const query = clean(input.query, 160).toLowerCase();
  const pageSize = Math.min(RESULT_PAGE_MAX, Math.max(10, Math.floor(Number(input.pageSize || 50)) || 50));
  const scope = requestScope(view, filter, query);
  const cursor = decodePlusControlCursor(clean(input.cursor, 500), scope);
  const exportCsv = input.exportCsv === true;
  return { view, filter, query, pageSize, cursor, scope, exportCsv };
}

export function csvCell(value: unknown): string {
  const raw = String(value ?? '');
  const safe = /^[=+\-@]/.test(raw.trimStart()) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function exportRows(view: 'accounts' | 'radar', rows: readonly Row[]): string {
  if (view === 'radar') {
    const header = ['severity', 'kind', 'uid', 'name', 'email', 'title', 'details', 'users'];
    return [header, ...rows.map((row) => [row.severity, row.kind, row.uid, row.name, row.email, row.title, row.details, Array.isArray(row.users) ? row.users.map((user) => clean(record(user).uid)).join(' | ') : ''])]
      .map((line) => line.map(csvCell).join(',')).join('\r\n');
  }
  const header = ['uid', 'name', 'email', 'active', 'origin', 'plan', 'product', 'period', 'startsAtMs', 'endsAtMs', 'identityHidden'];
  return [header, ...rows.map((row) => [row.uid, row.name, row.email, row.active, row.primaryKind, row.plan, row.storeProduct, row.storePeriod, row.startsAtMs, row.endsAtMs, row.identityHidden])]
    .map((line) => line.map(csvCell).join(',')).join('\r\n');
}

async function readUsers(db: FirebaseFirestore.Firestore): Promise<Row[]> {
  const collected: FirebaseFirestore.QueryDocumentSnapshot[] = [];
  const base = db.collection('users').orderBy(admin.firestore.FieldPath.documentId()).select(
    'name', 'email', 'xp', 'identityHidden', 'firebaseAuthUid', 'canonicalStableId',
    'linkedAuth.email', 'linkedAuth.uid', 'linkedAuth.providerUid', 'linkedAuth.providerUserId',
    'progress.user_name', 'progress.user_total_xp', 'progress.email', 'progress.user_email',
    'progress.firebaseAuthUid', 'progress.firebase_auth_uid', 'progress.canonicalStableId', 'progress.canonical_stable_id',
    'progress.providerUid', 'progress.provider_uid', 'progress.premium_active', 'progress.premium_plan', 'progress.premium_expiry',
    'progress.admin_premium_override', 'progress.premium_admin_grant_at', 'progress.premium_rc_product_id',
    'progress.premium_rc_store', 'progress.premium_rc_period_type', 'progress.premium_rc_updated_at',
    'progress.premium_rc_purchased_at_ms', 'progress.premium_rc_expiry_ms', 'progress.vip_active', 'progress.vip_plan',
    'progress.vip_from', 'progress.vip_until', 'progress.vip_expiry', 'progress.vip_admin_override',
    'progress.vip_admin_grant_at', 'progress.vip_grant_at', 'progress.intro_access_until_ms', 'progress.loyalty_gift_until_ms',
  );
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  while (true) {
    const pageSize = USER_PAGE_SIZE;
    const query: FirebaseFirestore.Query = cursor ? base.startAfter(cursor).limit(pageSize) : base.limit(pageSize);
    const snapshot: FirebaseFirestore.QuerySnapshot = await query.get();
    collected.push(...snapshot.docs);
    if (snapshot.size < pageSize) break;
    cursor = snapshot.docs[snapshot.docs.length - 1] ?? null;
    if (!cursor) break;
  }
  return collected.map((doc) => ({ id: doc.id, ...(doc.data() as Row) }));
}

interface StoredPlusSnapshot {
  generatedAtMs: number;
  sourceCount: number;
  summary: Row;
  items: Row[];
}

export function packPlusControlSnapshot(payload: StoredPlusSnapshot): string[] {
  const encoded = gzipSync(Buffer.from(JSON.stringify(payload), 'utf8')).toString('base64');
  const chunks: string[] = [];
  for (let offset = 0; offset < encoded.length; offset += SNAPSHOT_CHUNK_CHARS) chunks.push(encoded.slice(offset, offset + SNAPSHOT_CHUNK_CHARS));
  return chunks;
}

export function unpackPlusControlSnapshot(chunks: readonly string[]): StoredPlusSnapshot {
  const value = record(JSON.parse(gunzipSync(Buffer.from(chunks.join(''), 'base64')).toString('utf8')));
  if (!Array.isArray(value.items) || !value.summary || !Number.isFinite(Number(value.generatedAtMs)) || !Number.isFinite(Number(value.sourceCount))) {
    throw new Error('plus_snapshot_corrupt');
  }
  return { generatedAtMs: Number(value.generatedAtMs), sourceCount: Number(value.sourceCount), summary: record(value.summary), items: value.items.map(record) };
}

export function assertPlusSnapshotBatchFits(chunks: readonly string[]): void {
  const encodedChars = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  if (!chunks.length || chunks.length > 12 || encodedChars > SNAPSHOT_MAX_ENCODED_CHARS) throw new Error('plus_snapshot_too_large');
}

async function persistSnapshot(db: FirebaseFirestore.Firestore, actorUid: string, scope: string, payload: StoredPlusSnapshot): Promise<string> {
  const ref = db.collection('admin_plus_control_snapshots').doc();
  const chunks = packPlusControlSnapshot(payload);
  try { assertPlusSnapshotBatchFits(chunks); }
  catch { throw new HttpsError('resource-exhausted', 'plus_snapshot_too_large'); }
  const batch = db.batch();
  batch.create(ref, { actorUid, scope, generatedAtMs: payload.generatedAtMs, sourceCount: payload.sourceCount, chunkCount: chunks.length, createdAtMs: Date.now(), expiresAtMs: Date.now() + SNAPSHOT_TTL_MS });
  chunks.forEach((data, index) => batch.create(ref.collection('chunks').doc(String(index).padStart(4, '0')), { index, data }));
  await batch.commit();
  return ref.id;
}

async function cleanupExpiredSnapshots(db: FirebaseFirestore.Firestore): Promise<void> {
  try {
    const expired = await db.collection('admin_plus_control_snapshots').where('expiresAtMs', '<=', Date.now()).limit(10).get();
    await Promise.all(expired.docs.map((doc) => db.recursiveDelete(doc.ref)));
  } catch (error) {
    console.warn('admin Plus snapshot cleanup skipped', { errorCode: 'plus_snapshot_cleanup_failed' });
  }
}

async function loadSnapshot(db: FirebaseFirestore.Firestore, actorUid: string, scope: string, snapshotId: string): Promise<StoredPlusSnapshot> {
  const ref = db.collection('admin_plus_control_snapshots').doc(snapshotId);
  const metaSnap = await ref.get();
  if (!metaSnap.exists) throw new HttpsError('failed-precondition', 'plus_snapshot_expired');
  const meta = record(metaSnap.data());
  if (meta.actorUid !== actorUid || meta.scope !== scope || Number(meta.expiresAtMs || 0) <= Date.now()) throw new HttpsError('failed-precondition', 'plus_snapshot_expired');
  const chunkCount = Math.floor(Number(meta.chunkCount));
  if (!Number.isFinite(chunkCount) || chunkCount < 1 || chunkCount > 100) throw new HttpsError('data-loss', 'plus_snapshot_corrupt');
  const refs = Array.from({ length: chunkCount }, (_, index) => ref.collection('chunks').doc(String(index).padStart(4, '0')));
  const snaps = await db.getAll(...refs);
  if (snaps.some((snap) => !snap.exists)) throw new HttpsError('data-loss', 'plus_snapshot_corrupt');
  try { return unpackPlusControlSnapshot(snaps.map((snap) => clean(record(snap.data()).data, SNAPSHOT_CHUNK_CHARS + 10))); }
  catch { throw new HttpsError('data-loss', 'plus_snapshot_corrupt'); }
}

export const adminGetPlusControlWorkspace = onCall(
  { region: REGION, enforceAppCheck: true, timeoutSeconds: 90, memory: '1GiB' },
  async (request) => {
    roleFor(request, 'money.read');
    let input: ReturnType<typeof parsePlusControlRequest>;
    try { input = parsePlusControlRequest(request.data); } catch (error) { throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'invalid_plus_control_request'); }
    const generatedAtMs = Date.now();
    const db = admin.firestore();
    const actorUid = request.auth!.uid;
    let stored: StoredPlusSnapshot;
    let snapshotId = input.cursor?.snapshotId || '';
    if (input.cursor) {
      stored = await loadSnapshot(db, actorUid, input.scope, input.cursor.snapshotId);
    } else {
      await cleanupExpiredSnapshots(db);
      let users: Row[];
      try { users = await readUsers(db); }
      catch (error) {
        console.error('admin Plus control user scan failed', { errorCode: 'plus_users_read_failed' });
        throw new HttpsError('unavailable', 'plus_users_read_failed');
      }
      const snapshot = buildPlusControlSnapshot(users, generatedAtMs);
      const filtered = input.view === 'radar'
        ? filterPlusFindings(snapshot.findings, input)
        : filterPlusAccounts(snapshot.accounts, input);
      stored = { generatedAtMs, sourceCount: users.length, summary: snapshot.summary as unknown as Row, items: filtered as unknown as Row[] };
      snapshotId = await persistSnapshot(db, actorUid, input.scope, stored);
    }
    const offset = input.cursor?.offset || 0;
    const items = stored.items.slice(offset, offset + input.pageSize);
    const nextOffset = offset + items.length;
    return {
      definitionVersion: 'admin_plus_control_v2', generatedAtMs: stored.generatedAtMs,
      view: input.view, filter: input.filter, query: input.query,
      items, totalMatched: stored.items.length,
      csv: input.exportCsv ? exportRows(input.view, stored.items) : null,
      exportedCount: input.exportCsv ? stored.items.length : 0,
      nextCursor: nextOffset < stored.items.length ? encodePlusControlCursor(snapshotId, nextOffset, input.scope) : '',
      snapshotCursor: encodePlusControlCursor(snapshotId, 0, input.scope),
      summary: stored.summary,
      source: {
        name: 'users', state: 'ready', count: stored.sourceCount,
        limit: 0, truncated: false,
        note: 'Полный неизменяемый серверный снимок. Следующие страницы и CSV читаются из того же снимка, поэтому изменения пользователей между страницами не сдвигают результаты.',
      },
    };
  },
);

function hasVipShape(progress: Row): boolean {
  return Boolean(clean(progress.vip_plan) || clean(progress.vip_active) || clean(progress.vip_admin_override)
    || parseProgressMs(progress.vip_from) || parseProgressMs(progress.vip_until ?? progress.vip_expiry)
    || clean(progress.vip_admin_grant_at ?? progress.vip_grant_at));
}

function legacyBefore(progress: Row) {
  return Object.freeze({
    premiumPlan: clean(progress.premium_plan, 40), premiumExpiry: clean(progress.premium_expiry, 40),
    adminPremiumOverride: clean(progress.admin_premium_override, 16), premiumAdminGrantAt: clean(progress.premium_admin_grant_at, 40),
    vipActive: clean(progress.vip_active, 16), vipPlan: clean(progress.vip_plan, 40), vipFrom: clean(progress.vip_from, 40),
    vipUntil: clean(progress.vip_until, 40), vipAdminOverride: clean(progress.vip_admin_override, 16), vipAdminGrantAt: clean(progress.vip_admin_grant_at, 40),
  });
}

export function buildLegacyMigrationCandidate(user: Row, nowMs: number) {
  const uid = clean(user.id, 160); const progress = record(user.progress);
  const breakdown = resolvePremiumAccessBreakdown(progress, nowMs);
  if (!uid || !breakdown.legacyAdminGrantActive || hasVipShape(progress)) return null;
  const before = legacyBefore(progress);
  const grantAt = clean(progress.premium_admin_grant_at, 40) || String(nowMs);
  const after = Object.freeze({
    vipActive: 'true', vipPlan: 'admin_vip', vipFrom: grantAt,
    vipUntil: String(parseProgressMs(progress.premium_expiry) || 0), vipAdminOverride: 'true', vipAdminGrantAt: grantAt,
    vipMigratedFromAdminGrantAt: String(nowMs),
  });
  return Object.freeze({ uid, before, beforeFingerprint: hash(before), after });
}

export const adminPreviewLegacyPlusMigration = onCall(
  { region: REGION, enforceAppCheck: true, timeoutSeconds: 90, memory: '1GiB' },
  async (request) => {
    roleFor(request, 'money.manual_access.write');
    const data = record(request.data); const reason = clean(data.reason, 500); const requestId = clean(data.requestId, 160);
    if (!reason || !requestId) throw new HttpsError('invalid-argument', 'reason and requestId required');
    const db = admin.firestore(); const nowMs = Date.now(); const users = await readUsers(db);
    const allCandidates = users.map((row) => buildLegacyMigrationCandidate(row, nowMs)).filter((row): row is NonNullable<typeof row> => Boolean(row));
    const candidates = allCandidates.slice(0, MIGRATION_LIMIT); const packet = { reason, effectiveAtMs: nowMs, candidates, candidateCount: candidates.length, remainingCandidates: Math.max(0, allCandidates.length - candidates.length), usersTruncated: false };
    const fingerprint = hash(packet); const confirmation = `MIGRATE_ADMIN_GRANT/${candidates.length}/${fingerprint.slice(0, 12)}`; const previewRef = db.collection('admin_plus_migration_previews').doc();
    await previewRef.create({ actorUid: request.auth!.uid, requestId, ...packet, fingerprint, confirmation, createdAtMs: nowMs, expiresAtMs: nowMs + PREVIEW_TTL_MS });
    return { ok: true, previewId: previewRef.id, ...packet, fingerprint, confirmation, expiresAtMs: nowMs + PREVIEW_TTL_MS, consequence: 'Copies active legacy admin_grant access into vip_* fields. Store and RevenueCat metadata are not changed.' };
  },
);

export const adminApplyLegacyPlusMigration = onCall(
  { region: REGION, enforceAppCheck: true, timeoutSeconds: 90, memory: '1GiB' },
  async (request) => {
    const role = roleFor(request, 'money.manual_access.write'); const data = record(request.data);
    const previewId = clean(data.previewId, 160); const confirmation = clean(data.confirmation, 220); const reason = clean(data.reason, 500); const requestId = clean(data.requestId, 160); const idempotencyKey = clean(data.idempotencyKey, 160);
    if (!previewId || !confirmation || !reason || !requestId || !idempotencyKey) throw new HttpsError('invalid-argument', 'previewId, confirmation, reason, requestId and idempotencyKey required');
    const actorUid = request.auth!.uid; const db = admin.firestore(); const previewRef = db.collection('admin_plus_migration_previews').doc(previewId); const operationRef = db.collection('admin_command_operations').doc(idempotencyKey); const requestFingerprint = hash({ previewId, confirmation });
    const prior = await operationRef.get();
    if (prior.exists) { const row = record(prior.data()); if (row.actorUid !== actorUid || row.requestFingerprint !== requestFingerprint) throw new HttpsError('already-exists', 'idempotency_conflict'); return { ok: true, migrated: Number(row.migrated || 0), replayed: true }; }
    return db.runTransaction(async (tx) => {
      const [operationSnap, previewSnap] = await Promise.all([tx.get(operationRef), tx.get(previewRef)]);
      if (operationSnap.exists) { const row = record(operationSnap.data()); if (row.actorUid !== actorUid || row.requestFingerprint !== requestFingerprint) throw new HttpsError('already-exists', 'idempotency_conflict'); return { ok: true, migrated: Number(row.migrated || 0), replayed: true }; }
      if (!previewSnap.exists) throw new HttpsError('not-found', 'plus_migration_preview_not_found');
      const preview = record(previewSnap.data());
      if (preview.actorUid !== actorUid || preview.confirmation !== confirmation || preview.reason !== reason || preview.consumedAtMs || Number(preview.expiresAtMs || 0) <= Date.now()) throw new HttpsError('failed-precondition', 'plus_migration_preview_invalid');
      const candidates = Array.isArray(preview.candidates) ? preview.candidates.map(record).slice(0, MIGRATION_LIMIT) : [];
      if (!candidates.length) throw new HttpsError('failed-precondition', 'plus_migration_has_no_candidates');
      const userRefs = candidates.map((candidate) => db.collection('users').doc(clean(candidate.uid, 160)));
      const userSnaps = await Promise.all(userRefs.map((ref) => tx.get(ref)));
      userSnaps.forEach((snap, index) => {
        if (!snap.exists || hash(legacyBefore(record(record(snap.data()).progress))) !== candidates[index].beforeFingerprint) throw new HttpsError('failed-precondition', 'plus_migration_candidate_changed');
      });
      const nowMs = Date.now();
      candidates.forEach((candidate, index) => {
        const after = record(candidate.after);
        tx.update(userRefs[index], {
          'progress.vip_active': 'true', 'progress.vip_plan': 'admin_vip', 'progress.vip_from': clean(after.vipFrom, 40),
          'progress.vip_until': clean(after.vipUntil, 40), 'progress.vip_admin_override': 'true', 'progress.vip_admin_grant_at': clean(after.vipAdminGrantAt, 40),
          'progress.vip_migrated_from_admin_grant_at': clean(after.vipMigratedFromAdminGrantAt, 40), updatedAt: nowMs,
        });
      });
      const auditRef = db.collection('admin_log').doc();
      const audit = createAuditRecord({ action: 'manual_access.migrate_legacy_admin_grant', actorUid, role, entity: { collection: 'users', id: `_bulk_${candidates.length}` }, reason, before: { candidateCount: candidates.length }, after: { migratedCount: candidates.length }, rollbackReference: `admin_plus_migration_previews/${previewId}`, requestId, timestamp: new Date(nowMs).toISOString() });
      tx.update(previewRef, { consumedAtMs: nowMs, consumedBy: actorUid, operationId: idempotencyKey });
      tx.create(auditRef, { ...audit, operationId: idempotencyKey });
      tx.create(operationRef, { actorUid, requestFingerprint, migrated: candidates.length, action: 'migrate_legacy_admin_grant', auditId: auditRef.id, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      return { ok: true, migrated: candidates.length, replayed: false };
    });
  },
);
