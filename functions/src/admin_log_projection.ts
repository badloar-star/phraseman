import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';

export type AdminLogRow = Record<string, unknown>;

export const DEFAULT_TIMESTAMP_FIELDS = ['timestamp', 'ts', 'createdAt'] as const;
const SENSITIVE_KEY_RE = /(body|reply|finalText|signature|payload|items|message|comment|email)/i;
const MAX_PUBLIC_OBJECT_DEPTH = 2;
const MAX_PUBLIC_OBJECT_KEYS = 12;
const MAX_PUBLIC_STRING_LENGTH = 180;
const CURSOR_RE = /^[A-Za-z0-9_-]{1,500}$/;

export function isRecord(value: unknown): value is AdminLogRow {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function cleanText(value: unknown, max = 500): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function millis(value: unknown): number {
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

export function timestampValue(row: AdminLogRow): unknown {
  return row.timestamp || row.ts || row.createdAt;
}

export function displayTimestamp(value: unknown): string {
  const text = cleanText(value, 64);
  if (text) return text;
  const ms = millis(value);
  return ms > 0 ? new Date(ms).toISOString() : '';
}

export function publicObject(value: unknown, depth = 0): AdminLogRow | null {
  if (!isRecord(value)) return null;
  if (depth > MAX_PUBLIC_OBJECT_DEPTH) return { _truncated: true };
  const out: AdminLogRow = {};
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

export function encodeTimestampCursor(row: AdminLogRow): string {
  return Buffer.from(JSON.stringify({ id: row.id, timestampMs: row.timestampMs }), 'utf8').toString('base64url');
}

export function decodeTimestampCursor(cursor: string): { id: string; timestampMs: number } {
  const safeCursor = cleanText(cursor, 501);
  if (!safeCursor) return { id: '', timestampMs: 0 };
  if (!CURSOR_RE.test(safeCursor)) throw new HttpsError('invalid-argument', 'cursor is invalid');
  try {
    const parsed = JSON.parse(Buffer.from(safeCursor, 'base64url').toString('utf8')) as AdminLogRow;
    const id = cleanText(parsed.id, 160);
    if (!id) throw new Error('missing id');
    return { id, timestampMs: Number(parsed.timestampMs || 0) };
  } catch {
    throw new HttpsError('invalid-argument', 'cursor is invalid');
  }
}

export function compareTimestampRows(a: AdminLogRow, b: AdminLogRow): number {
  const timeDelta = Number(b.timestampMs || 0) - Number(a.timestampMs || 0);
  if (timeDelta !== 0) return timeDelta;
  return String(a.id || '').localeCompare(String(b.id || ''));
}

export function rowIsAfterCursor(row: AdminLogRow, cursor: { id: string; timestampMs: number } | null): boolean {
  if (!cursor?.id) return true;
  const rowMs = Number(row.timestampMs || 0);
  if (cursor.timestampMs > 0 && rowMs > 0) {
    if (rowMs < cursor.timestampMs) return true;
    if (rowMs === cursor.timestampMs) return String(row.id || '') > cursor.id;
    return false;
  }
  return String(row.id || '') > cursor.id;
}

function cursorBoundaryForField(field: string, timestampMs: number): unknown {
  return field === 'createdAt' ? admin.firestore.Timestamp.fromMillis(timestampMs) : new Date(timestampMs).toISOString();
}

export interface TimestampSourceHealth {
  readonly field: string;
  readonly state: 'ready' | 'empty' | 'truncated' | 'error';
  readonly count: number;
  readonly error: string;
}

export async function collectTimestampRows(
  collection: FirebaseFirestore.CollectionReference | FirebaseFirestore.Query,
  fields: readonly string[],
  scanLimit: number,
  cursorValue = '',
): Promise<{ rows: AdminLogRow[]; scanned: number; saturated: boolean; health: TimestampSourceHealth[] }> {
  const cursor = cursorValue ? decodeTimestampCursor(cursorValue) : null;
  const collectionWithDoc = collection as FirebaseFirestore.CollectionReference;
  const cursorDoc = cursor?.id && typeof collectionWithDoc.doc === 'function' ? await collectionWithDoc.doc(cursor.id).get() : null;
  if (cursor?.id && cursorDoc && !cursorDoc.exists) throw new HttpsError('failed-precondition', 'cursor document no longer exists');
  const cursorData = cursorDoc?.exists ? cursorDoc.data() as AdminLogRow : {};
  const rows: AdminLogRow[] = [];
  const health: TimestampSourceHealth[] = [];
  await Promise.all(fields.map(async (field) => {
    try {
      let query: FirebaseFirestore.Query = collection;
      const cursorHasField = Boolean(cursorDoc?.exists && isRecord(cursorData) && cursorData[field] !== undefined && cursorData[field] !== null);
      if (cursor?.id && !cursorHasField && cursor.timestampMs > 0) query = query.where(field, '<=', cursorBoundaryForField(field, cursor.timestampMs));
      query = query.orderBy(field, 'desc');
      if (cursorHasField && cursorDoc) query = query.startAfter(cursorDoc);
      const snapshot = await query.limit(scanLimit).get();
      rows.push(...snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as AdminLogRow) })));
      health.push({ field, state: snapshot.size >= scanLimit ? 'truncated' : snapshot.size ? 'ready' : 'empty', count: snapshot.size, error: '' });
    } catch (error) {
      health.push({ field, state: 'error', count: 0, error: error instanceof Error ? error.message : String(error) });
    }
  }));
  return {
    rows,
    scanned: rows.length,
    saturated: health.some((source) => source.state === 'truncated'),
    health: fields.map((field) => health.find((source) => source.field === field) ?? { field, state: 'error', count: 0, error: 'missing_result' }),
  };
}
