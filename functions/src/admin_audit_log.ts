import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { hasPermission, type AdminPermission } from './admin/permissions';
import { hasAdminRole, type AdminRole } from './admin/roles';

const REGION = 'us-central1';
export const MAX_AUDIT_LIMIT = 100;
export const MAX_AUDIT_SCAN_LIMIT = 500;
const DEFAULT_AUDIT_LIMIT = 50;
const CURSOR_RE = /^[A-Za-z0-9_-]{1,500}$/;
const DAY_VALUES = new Set([1, 7, 30, 90]);
const TIMESTAMP_FIELDS = ['timestamp', 'ts', 'createdAt'] as const;
const SENSITIVE_KEY_RE = /(body|reply|finalText|signature|payload|items|message)/i;
const MAX_PUBLIC_OBJECT_DEPTH = 2;
const MAX_PUBLIC_OBJECT_KEYS = 12;
const MAX_PUBLIC_STRING_LENGTH = 180;

type Row = Record<string, unknown>;

function isRecord(value: unknown): value is Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown, max = 500): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function millis(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (isRecord(value)) {
    if (typeof value.toMillis === 'function') {
      try { return Number((value.toMillis as () => number)()) || 0; } catch { return 0; }
    }
    if (typeof value.seconds === 'number') return value.seconds * 1000;
  }
  return 0;
}

function requireAuditPermission(
  request: { auth?: { uid?: string; token?: Row } | null },
  permission: AdminPermission,
): { actorUid: string; role: AdminRole } {
  if (request.auth?.token?.admin !== true || !String(request.auth.uid ?? '').trim()) throw new HttpsError('permission-denied', 'Admin only');
  const claimedRole = request.auth.token.adminRole;
  const role: AdminRole = hasAdminRole(claimedRole) ? claimedRole : 'admin';
  if (!hasPermission(role, permission)) throw new HttpsError('permission-denied', `Role cannot use ${permission}`);
  return { actorUid: String(request.auth.uid), role };
}

function timestampValue(row: Row): unknown {
  return row.timestamp || row.ts || row.createdAt;
}

function displayTimestamp(value: unknown): string {
  const text = cleanText(value, 64);
  if (text) return text;
  const ms = millis(value);
  return ms > 0 ? new Date(ms).toISOString() : '';
}

function publicObject(value: unknown, depth = 0): Row | null {
  if (!isRecord(value)) return null;
  if (depth > MAX_PUBLIC_OBJECT_DEPTH) return { _truncated: true };
  const out: Row = {};
  let copied = 0;
  for (const [key, item] of Object.entries(value)) {
    if (SENSITIVE_KEY_RE.test(key)) continue;
    if (copied >= MAX_PUBLIC_OBJECT_KEYS) {
      out._truncated = true;
      break;
    }
    const safeKey = cleanText(key, 60);
    if (!safeKey) continue;
    if (isRecord(item)) {
      const nested = publicObject(item, depth + 1);
      if (nested && Object.keys(nested).length) {
        out[safeKey] = nested;
        copied += 1;
      }
    } else if (Array.isArray(item)) {
      out[safeKey] = { count: item.length };
      copied += 1;
    } else if (typeof item === 'string') {
      out[safeKey] = cleanText(item, MAX_PUBLIC_STRING_LENGTH);
      copied += 1;
    } else if (typeof item === 'number') {
      if (Number.isFinite(item)) {
        out[safeKey] = item;
        copied += 1;
      }
    } else if (typeof item === 'boolean' || item === null) {
      out[safeKey] = item;
      copied += 1;
    }
  }
  return out;
}

export interface AuditListRequest {
  readonly action: string;
  readonly query: string;
  readonly sinceDays: 1 | 7 | 30 | 90;
  readonly limit: number;
  readonly cursor: string;
}

export function parseAuditListRequest(data: unknown): AuditListRequest {
  const input = isRecord(data) ? data : {};
  const action = cleanText(input.action, 120);
  const query = cleanText(input.query, 160).toLowerCase();
  const requestedDays = Number(input.sinceDays ?? 7);
  const sinceDays = (DAY_VALUES.has(requestedDays) ? requestedDays : 7) as 1 | 7 | 30 | 90;
  const requestedLimit = Number(input.limit ?? DEFAULT_AUDIT_LIMIT);
  const limit = Math.max(1, Math.min(MAX_AUDIT_LIMIT, Number.isFinite(requestedLimit) ? Math.floor(requestedLimit) : DEFAULT_AUDIT_LIMIT));
  const cursor = cleanText(input.cursor, 501);
  if (cursor && !CURSOR_RE.test(cursor)) throw new HttpsError('invalid-argument', 'cursor is invalid');
  if (cursor && (action || query)) throw new HttpsError('invalid-argument', 'cursor cannot be combined with audit filters');
  return Object.freeze({ action, query, sinceDays, limit, cursor });
}

function encodeCursor(row: Row): string {
  return Buffer.from(JSON.stringify({ id: row.id, timestampMs: row.timestampMs }), 'utf8').toString('base64url');
}

function decodeCursor(cursor: string): { id: string; timestampMs: number } {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as Row;
    const id = cleanText(parsed.id, 160);
    if (!id) throw new Error('missing id');
    return { id, timestampMs: Number(parsed.timestampMs || 0) };
  } catch {
    throw new HttpsError('invalid-argument', 'cursor is invalid');
  }
}

function cursorBoundaryForField(field: typeof TIMESTAMP_FIELDS[number], timestampMs: number): unknown {
  return field === 'createdAt' ? admin.firestore.Timestamp.fromMillis(timestampMs) : new Date(timestampMs).toISOString();
}

export function projectAuditRow(id: string, row: Row): Row {
  const entity = publicObject(row.entity) ?? {};
  const timestamp = timestampValue(row);
  return Object.freeze({
    id,
    ts: displayTimestamp(timestamp),
    timestampMs: millis(timestamp),
    action: cleanText(row.action, 160) || 'unknown',
    actorUid: cleanText(row.actorUid || row.adminUid, 160) || null,
    adminEmail: cleanText(row.adminEmail, 160) || null,
    role: cleanText(row.role, 80) || null,
    entity,
    reason: cleanText(row.reason, 500) || null,
    requestId: cleanText(row.requestId, 160) || null,
    rollbackReference: cleanText(row.rollbackReference, 160) || null,
    before: publicObject(row.before),
    after: publicObject(row.after),
    details: publicObject(row.details),
  });
}

function matchesAuditFilters(row: Row, input: AuditListRequest, sinceMs: number): boolean {
  if (Number(row.timestampMs ?? 0) > 0 && Number(row.timestampMs) < sinceMs) return false;
  if (input.action && row.action !== input.action) return false;
  if (!input.query) return true;
  return JSON.stringify(row).toLowerCase().includes(input.query);
}

function compareAuditRows(a: Row, b: Row): number {
  const timeDelta = Number(b.timestampMs || 0) - Number(a.timestampMs || 0);
  if (timeDelta !== 0) return timeDelta;
  return String(a.id || '').localeCompare(String(b.id || ''));
}

function rowIsAfterCursor(row: Row, cursor: { id: string; timestampMs: number } | null): boolean {
  if (!cursor) return true;
  const rowMs = Number(row.timestampMs || 0);
  if (cursor.timestampMs > 0 && rowMs > 0) {
    if (rowMs < cursor.timestampMs) return true;
    if (rowMs === cursor.timestampMs) return String(row.id || '') > cursor.id;
    return false;
  }
  return String(row.id || '') > cursor.id;
}

export function mergeAuditRowsForList(rows: readonly Row[], input: AuditListRequest, sinceMs: number, cursor: { id: string; timestampMs: number } | null): Row[] {
  const byId = new Map<string, Row>();
  rows.forEach((row) => {
    const id = cleanText(row.id, 160);
    if (!id || byId.has(id)) return;
    const projected = projectAuditRow(id, row);
    if (rowIsAfterCursor(projected, cursor) && matchesAuditFilters(projected, input, sinceMs)) byId.set(id, projected);
  });
  return [...byId.values()].sort(compareAuditRows);
}

export async function collectAuditRawRows(db: FirebaseFirestore.Firestore, input: AuditListRequest, scanLimit: number): Promise<{ rows: Row[]; scanned: number; saturated: boolean }> {
  const collection = db.collection('admin_log');
  const cursor = input.cursor ? decodeCursor(input.cursor) : null;
  const cursorDoc = cursor ? await collection.doc(cursor.id).get() : null;
  if (cursor && !cursorDoc?.exists) throw new HttpsError('failed-precondition', 'cursor document no longer exists');
  const cursorData = cursorDoc?.exists ? cursorDoc.data() as Row : {};
  const snapshots = await Promise.all(TIMESTAMP_FIELDS.map((field) => {
    let query: FirebaseFirestore.Query = collection;
    const cursorHasField = Boolean(cursorDoc?.exists && isRecord(cursorData) && cursorData[field] !== undefined && cursorData[field] !== null);
    if (cursor && !cursorHasField && cursor.timestampMs > 0) query = query.where(field, '<=', cursorBoundaryForField(field, cursor.timestampMs));
    query = query.orderBy(field, 'desc');
    if (cursorHasField && cursorDoc) query = query.startAfter(cursorDoc);
    return query.limit(scanLimit).get();
  }));
  const rows = snapshots.flatMap((snapshot) => snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Row) })));
  return { rows, scanned: rows.length, saturated: snapshots.some((snapshot) => snapshot.size >= scanLimit) };
}

export const adminListAuditLog = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds: 20, memory: '512MiB' },
  async (request) => {
    requireAuditPermission(request as { auth?: { uid?: string; token?: Row } }, 'diagnostics.read');
    const input = parseAuditListRequest(request.data);
    const db = admin.firestore();
    const sinceMs = Date.now() - input.sinceDays * 24 * 60 * 60 * 1000;
    const hasFilters = Boolean(input.action || input.query);
    const scanLimit = hasFilters ? Math.min(MAX_AUDIT_SCAN_LIMIT, Math.max(input.limit * 5, input.limit + 1)) : input.limit + 1;
    const cursor = input.cursor ? decodeCursor(input.cursor) : null;
    const { rows: rawRows, scanned, saturated } = await collectAuditRawRows(db, input, scanLimit);
    const projected = mergeAuditRowsForList(rawRows, input, sinceMs, cursor);
    const truncated = projected.length > input.limit || (hasFilters && saturated);
    const items = projected.slice(0, input.limit);
    return {
      ok: true,
      state: truncated ? 'truncated' : items.length ? 'ready' : 'empty',
      items,
      count: items.length,
      nextCursor: !hasFilters && items.length === input.limit ? encodeCursor(items[items.length - 1]) : null,
      fetchedAtMs: Date.now(),
      sourceHealth: [{ source: 'admin_log', state: 'ready', count: items.length, scanned, truncated }],
    };
  },
);
