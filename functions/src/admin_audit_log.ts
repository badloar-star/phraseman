import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { hasAdminRole, type AdminRole } from './admin/roles';
import {
  collectTimestampRows,
  compareTimestampRows,
  DEFAULT_TIMESTAMP_FIELDS,
  encodeTimestampCursor,
  publicObject as sharedPublicObject,
  type TimestampSourceHealth,
} from './admin_log_projection';

const REGION = 'us-central1';
export const MAX_AUDIT_LIMIT = 100;
export const MAX_AUDIT_SCAN_LIMIT = 500;
const DEFAULT_AUDIT_LIMIT = 50;
const CURSOR_RE = /^[A-Za-z0-9_-]{1,500}$/;
const DAY_VALUES = new Set([1, 7, 30, 90]);

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

export function canReadSensitiveAdminAudit(role: unknown): boolean {
  return role === 'owner' || role === 'admin';
}

function requireAuditPermission(
  request: { auth?: { uid?: string; token?: Row } | null },
): { actorUid: string; role: AdminRole } {
  if (request.auth?.token?.admin !== true || !String(request.auth.uid ?? '').trim()) throw new HttpsError('permission-denied', 'Admin only');
  const claimedRole = request.auth.token.adminRole;
  const role: AdminRole = hasAdminRole(claimedRole) ? claimedRole : 'owner';
  if (!canReadSensitiveAdminAudit(role)) throw new HttpsError('permission-denied', 'Role cannot read sensitive audit history');
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

export function projectAuditRow(id: string, row: Row): Row {
  const entity = sharedPublicObject(row.entity) ?? {};
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
    before: sharedPublicObject(row.before),
    after: sharedPublicObject(row.after),
    details: sharedPublicObject(row.details),
  });
}

function matchesAuditFilters(row: Row, input: AuditListRequest, sinceMs: number): boolean {
  if (Number(row.timestampMs ?? 0) > 0 && Number(row.timestampMs) < sinceMs) return false;
  if (input.action && row.action !== input.action) return false;
  if (!input.query) return true;
  return JSON.stringify(row).toLowerCase().includes(input.query);
}

function compareAuditRows(a: Row, b: Row): number {
  return compareTimestampRows(a, b);
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

export function summarizeAuditSourceHealth(result: {
  readonly rows: readonly Row[];
  readonly scanned: number;
  readonly saturated: boolean;
  readonly health: readonly TimestampSourceHealth[];
}, count: number): Row {
  const errors = result.health.filter((source) => source.state === 'error');
  const error = errors.map((source) => `${source.field}: ${source.error || 'unknown_error'}`).filter(Boolean).join('; ').slice(0, 500);
  return {
    source: 'admin_log',
    state: errors.length ? 'error' : result.saturated ? 'truncated' : count ? 'ready' : 'empty',
    count,
    scanned: result.scanned,
    truncated: result.saturated,
    error,
  };
}

export async function collectAuditRawRows(db: FirebaseFirestore.Firestore, input: AuditListRequest, scanLimit: number): Promise<{ rows: Row[]; scanned: number; saturated: boolean; health: TimestampSourceHealth[] }> {
  const result = await collectTimestampRows(db.collection('admin_log'), DEFAULT_TIMESTAMP_FIELDS, scanLimit, input.cursor);
  return { rows: result.rows, scanned: result.scanned, saturated: result.saturated, health: result.health };
}

export const adminListAuditLog = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds: 20, memory: '512MiB' },
  async (request) => {
    requireAuditPermission(request as { auth?: { uid?: string; token?: Row } });
    const input = parseAuditListRequest(request.data);
    const db = admin.firestore();
    const sinceMs = Date.now() - input.sinceDays * 24 * 60 * 60 * 1000;
    const hasFilters = Boolean(input.action || input.query);
    const scanLimit = hasFilters ? Math.min(MAX_AUDIT_SCAN_LIMIT, Math.max(input.limit * 5, input.limit + 1)) : input.limit + 1;
    const cursor = input.cursor ? decodeCursor(input.cursor) : null;
    const raw = await collectAuditRawRows(db, input, scanLimit);
    const { rows: rawRows, saturated } = raw;
    const projected = mergeAuditRowsForList(rawRows, input, sinceMs, cursor);
    const truncated = projected.length > input.limit || (hasFilters && saturated);
    const items = projected.slice(0, input.limit);
    const sourceHealth = summarizeAuditSourceHealth(raw, items.length);
    return {
      ok: true,
      state: sourceHealth.state === 'error' ? (items.length ? 'partial' : 'error') : truncated ? 'truncated' : items.length ? 'ready' : 'empty',
      items,
      count: items.length,
      nextCursor: !hasFilters && items.length === input.limit ? encodeTimestampCursor(items[items.length - 1]) : null,
      fetchedAtMs: Date.now(),
      sourceHealth: [sourceHealth],
    };
  },
);
