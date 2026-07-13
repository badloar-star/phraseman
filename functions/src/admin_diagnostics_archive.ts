import * as admin from 'firebase-admin';
import { createHash } from 'crypto';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { hasPermission } from './admin/permissions';
import { hasAdminRole, type AdminRole } from './admin/roles';

const REGION = 'us-central1';
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
const MAX_SOURCE_SCAN = 250;
const TOKEN_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/;
const CURSOR_RE = /^[A-Za-z0-9_-]{1,500}$/;
const ARCHIVE_TYPES = ['all', 'user', 'error'] as const;

type Row = Record<string, unknown>;
type ArchiveType = typeof ARCHIVE_TYPES[number];
type ArchiveDetailType = Exclude<ArchiveType, 'all'>;
type ArchiveState = 'ready' | 'empty' | 'truncated' | 'partial' | 'error';

interface DiagnosticsActor {
  readonly actorUid: string;
  readonly role: AdminRole;
  readonly canReadUsers: boolean;
}

export interface DiagnosticsArchiveListRequest {
  readonly type: ArchiveType;
  readonly pageSize: number;
  readonly cursor: string;
}

export interface DiagnosticsArchiveSourceResult {
  readonly source: string;
  readonly rows: readonly Row[];
  readonly scanned: number;
  readonly truncated: boolean;
  readonly error: string;
  readonly cap?: number;
  readonly boundaryAtMs?: number;
}

export interface DiagnosticsArchiveSourceHealth {
  readonly source: string;
  readonly state: ArchiveState;
  readonly count: number;
  readonly scanned: number;
  readonly cap: number;
  readonly truncated: boolean;
  readonly error: string;
}

function isRecord(value: unknown): value is Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function inputRecord(data: unknown): Row {
  if (data === undefined || data === null) return {};
  if (!isRecord(data)) throw new HttpsError('invalid-argument', 'request must be an object');
  return data;
}

function assertAllowedKeys(input: Row, allowed: readonly string[]): void {
  const allowlist = new Set(allowed);
  const unexpected = Object.keys(input).find((key) => !allowlist.has(key));
  if (unexpected) throw new HttpsError('invalid-argument', `unsupported field: ${unexpected}`);
}

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function parseType(value: unknown, allowAll: boolean): ArchiveType {
  if (value === undefined || value === null || value === '') {
    if (allowAll) return 'all';
    throw new HttpsError('invalid-argument', 'type is required');
  }
  if (typeof value === 'string' && (ARCHIVE_TYPES as readonly string[]).includes(value) && (allowAll || value !== 'all')) return value as ArchiveType;
  throw new HttpsError('invalid-argument', 'type is invalid');
}

function parsePageSize(value: unknown): number {
  if (value === undefined || value === null) return DEFAULT_PAGE_SIZE;
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new HttpsError('invalid-argument', 'pageSize is invalid');
  return Math.max(1, Math.min(MAX_PAGE_SIZE, Math.floor(value)));
}

function parseCursor(value: unknown): string {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string' || !CURSOR_RE.test(value)) throw new HttpsError('invalid-argument', 'cursor is invalid');
  return value;
}

function parseId(value: unknown): string {
  if (typeof value !== 'string' || !TOKEN_RE.test(value)) throw new HttpsError('invalid-argument', 'id is invalid');
  return value;
}

export function parseDiagnosticsArchiveListRequest(data: unknown): DiagnosticsArchiveListRequest {
  const input = inputRecord(data);
  assertAllowedKeys(input, ['type', 'pageSize', 'cursor']);
  return Object.freeze({ type: parseType(input.type, true), pageSize: parsePageSize(input.pageSize), cursor: parseCursor(input.cursor) });
}

export function parseDiagnosticsArchiveDetailRequest(data: unknown): Readonly<{ type: ArchiveDetailType; id: string }> {
  const input = inputRecord(data);
  assertAllowedKeys(input, ['type', 'id']);
  return Object.freeze({ type: parseType(input.type, false) as ArchiveDetailType, id: parseId(input.id) });
}

function millis(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.floor(value));
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (isRecord(value)) {
    if (typeof value.toMillis === 'function') {
      try { return Math.max(0, Math.floor(Number((value.toMillis as () => number)()) || 0)); } catch { return 0; }
    }
    if (typeof value.seconds === 'number') return Math.max(0, Math.floor(value.seconds * 1000));
  }
  return 0;
}

function hash(value: string, length = 12): string {
  return createHash('sha256').update(value).digest('hex').slice(0, length);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function identityValues(row: Row): string[] {
  return [
    'uid', 'stableUid', 'authUid', 'userName', 'name', 'email',
    'reporterUid', 'reporterAuthUid', 'reporterName', 'reporterEmail',
    'reportedUid', 'reportedName', 'reportedEmail', 'reviewedBy',
  ].map((key) => cleanText(row[key], 180)).filter((value) => value.length >= 3).sort((left, right) => right.length - left.length);
}

function safeText(value: unknown, max: number, row: Row, canReadUsers: boolean): string {
  let output = cleanText(value, max * 2)
    .replace(/Bearer\s+[A-Za-z0-9._~+\/-]+/gi, 'Bearer [REDACTED]')
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/gi, '[REDACTED_SECRET]')
    .replace(/\b(api[_-]?key|access[_-]?token|refresh[_-]?token|password|secret|token)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]');
  if (!canReadUsers) {
    output = output.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]');
    for (const identity of identityValues(row)) output = output.replace(new RegExp(escapeRegExp(identity), 'gi'), '[REDACTED_USER]');
  }
  return output.slice(0, max);
}

function finiteNumber(value: unknown, fallback = 0): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function primaryIdentity(type: ArchiveDetailType, row: Row, canReadUsers: boolean): Row | null {
  const uid = cleanText(type === 'user' ? row.reportedUid : row.uid || row.stableUid, 160);
  const name = cleanText(type === 'user' ? row.reportedName : row.userName || row.name, 120);
  const email = cleanText(type === 'user' ? row.reportedEmail : row.email, 160);
  const seed = uid || email || name || cleanText(row.authUid, 160);
  if (!seed) return null;
  if (!canReadUsers) return Object.freeze({ maskedId: `user_${hash(seed)}` });
  return Object.freeze({ uid: uid || null, name: name || null, email: email || null });
}

function reporterIdentity(row: Row, canReadUsers: boolean): Row | null {
  const uid = cleanText(row.reporterUid, 160);
  const name = cleanText(row.reporterName, 120);
  const email = cleanText(row.reporterEmail, 160);
  const seed = uid || email || name || cleanText(row.reporterAuthUid, 160);
  if (!seed) return null;
  if (!canReadUsers) return Object.freeze({ maskedId: `user_${hash(seed)}` });
  return Object.freeze({ uid: uid || null, name: name || null, email: email || null });
}

export function isDiagnosticsArchiveStatus(type: ArchiveDetailType, status: unknown): boolean {
  const normalized = cleanText(status, 40).toLowerCase();
  return type === 'user' ? normalized === 'archived' || normalized === 'banned' : normalized === 'fixed' || normalized === 'archived';
}

function requireArchiveStatus(type: ArchiveDetailType, value: unknown): string {
  const status = cleanText(value, 40).toLowerCase();
  if (!isDiagnosticsArchiveStatus(type, status)) throw new HttpsError('invalid-argument', 'record is not in diagnostics archive');
  return status;
}

export function projectDiagnosticsArchiveListRow(type: ArchiveDetailType, id: string, row: Row, canReadUsers: boolean): Row {
  const createdAtMs = millis(row.createdAtMs || row.createdAt || row.serverCreatedAt);
  return Object.freeze({
    id: cleanText(id, 160),
    type,
    source: type === 'user' ? 'user_reports' : 'error_reports',
    status: requireArchiveStatus(type, row.status),
    comment: safeText(row.comment || row.reason || row.dataText, 800, row, canReadUsers) || null,
    category: safeText(row.category || row.reason, 120, row, canReadUsers) || null,
    screen: safeText(row.screen, 120, row, canReadUsers) || null,
    createdAtMs,
    createdAt: createdAtMs ? new Date(createdAtMs).toISOString() : null,
    app: Object.freeze({
      platform: safeText(row.platform, 40, row, canReadUsers) || 'unknown',
      version: safeText(row.appVersion, 80, row, canReadUsers) || 'unknown',
      buildNumber: safeText(row.buildNumber, 80, row, canReadUsers) || null,
    }),
    user: primaryIdentity(type, row, canReadUsers),
    ...(type === 'user' ? { reporter: reporterIdentity(row, canReadUsers) } : {}),
  });
}

export function projectDiagnosticsArchiveDetail(type: ArchiveDetailType, id: string, row: Row, canReadUsers: boolean): Row {
  const list = projectDiagnosticsArchiveListRow(type, id, row, canReadUsers);
  const reviewedAtMs = millis(row.reviewedAtMs || row.adminStatusUpdatedAtMs || row.reviewedAt || row.adminStatusUpdatedAt);
  return Object.freeze({
    ...list,
    comment: safeText(row.comment || row.reason || row.dataText, 2_000, row, canReadUsers) || null,
    reason: safeText(row.reason, 500, row, canReadUsers) || null,
    learning: Object.freeze({
      dataId: safeText(row.dataId, 180, row, canReadUsers) || null,
      dataText: safeText(row.dataText, 4_000, row, canReadUsers) || null,
      userAnswer: safeText(row.userAnswer, 1_000, row, canReadUsers) || null,
      copyText: safeText(row.copyText, 4_000, row, canReadUsers) || null,
      userLevel: finiteNumber(row.userLevel),
      userXP: finiteNumber(row.userXP),
      userStreak: finiteNumber(row.userStreak),
      userPremium: row.userPremium === true,
      userLanguage: safeText(row.userLanguage, 16, row, canReadUsers) || null,
      userDaysInApp: finiteNumber(row.userDaysInApp),
    }),
    device: Object.freeze({
      model: safeText(row.deviceModel || row.deviceName, 160, row, canReadUsers) || null,
      os: safeText(row.deviceOS, 80, row, canReadUsers) || null,
      osVersion: safeText(row.deviceOSVersion || row.osVersion, 80, row, canReadUsers) || null,
      screenWidth: finiteNumber(row.screenWidth),
      screenHeight: finiteNumber(row.screenHeight),
      pixelRatio: finiteNumber(row.pixelRatio, 1),
    }),
    app: Object.freeze({
      platform: safeText(row.platform, 40, row, canReadUsers) || 'unknown',
      version: safeText(row.appVersion, 80, row, canReadUsers) || 'unknown',
      buildNumber: safeText(row.buildNumber, 80, row, canReadUsers) || null,
    }),
    review: Object.freeze({
      atMs: reviewedAtMs,
      at: reviewedAtMs ? new Date(reviewedAtMs).toISOString() : null,
      by: canReadUsers ? cleanText(row.reviewedBy || row.adminStatusUpdatedBy, 160) || null : null,
    }),
  });
}

export function deriveDiagnosticsArchiveState(
  sourceHealth: readonly DiagnosticsArchiveSourceHealth[],
  count: number,
  truncated: boolean,
): ArchiveState {
  const errors = sourceHealth.filter((source) => source.state === 'error');
  if (errors.length === sourceHealth.length && count === 0) return 'error';
  if (errors.length) return 'partial';
  if (truncated || sourceHealth.some((source) => source.truncated)) return 'truncated';
  return count ? 'ready' : 'empty';
}

export function mergeDiagnosticsArchiveRows(results: readonly DiagnosticsArchiveSourceResult[], pageSize: number): Readonly<{
  items: Row[];
  state: ArchiveState;
  truncated: boolean;
  partial: boolean;
  sourceHealth: DiagnosticsArchiveSourceHealth[];
}> {
  const limit = Math.max(1, Math.min(MAX_PAGE_SIZE, Math.floor(pageSize) || DEFAULT_PAGE_SIZE));
  const available = results.flatMap((result) => result.rows).sort((left, right) => {
    const byDate = Number(right.createdAtMs || 0) - Number(left.createdAtMs || 0);
    return byDate || cleanText(left.id, 160).localeCompare(cleanText(right.id, 160));
  });
  const items = available.slice(0, limit);
  const sourceHealth: DiagnosticsArchiveSourceHealth[] = results.map((result) => {
    const state: ArchiveState = result.error ? 'error' : result.truncated ? 'truncated' : result.rows.length ? 'ready' : 'empty';
    return Object.freeze({
      source: result.source,
      state,
      count: result.rows.length,
      scanned: result.scanned,
      cap: result.cap ?? MAX_SOURCE_SCAN,
      truncated: result.truncated,
      error: cleanText(result.error, 300),
    });
  });
  const truncated = available.length > limit || results.some((result) => result.truncated);
  const state = deriveDiagnosticsArchiveState(sourceHealth, items.length, truncated);
  return Object.freeze({ items, state, truncated, partial: state === 'partial' || state === 'error', sourceHealth });
}

function requireDiagnosticsRead(request: { auth?: { uid?: string; token?: Row } | null }): DiagnosticsActor {
  if (request.auth?.token?.admin !== true || !cleanText(request.auth.uid, 160)) throw new HttpsError('permission-denied', 'Admin only');
  const claimedRole = request.auth.token.adminRole;
  const role: AdminRole = hasAdminRole(claimedRole) ? claimedRole : 'admin';
  if (!hasPermission(role, 'diagnostics.read')) throw new HttpsError('permission-denied', 'Role cannot use diagnostics.read');
  return { actorUid: String(request.auth.uid), role, canReadUsers: hasPermission(role, 'users.read') };
}

function cursorFilter(type: ArchiveType): string {
  return hash(`archive:${type}`, 20);
}

function encodeArchiveCursor(type: ArchiveType, id: string, createdAtMs: number): string {
  const payload = { v: 1, kind: 'diagnostics_archive', type, id, createdAtMs, filter: cursorFilter(type) };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodeArchiveCursor(cursor: string, type: ArchiveType): { id: string; createdAtMs: number } {
  try {
    if (!CURSOR_RE.test(cursor)) throw new Error('invalid cursor characters');
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const payload = JSON.parse(decoded) as Row;
    const canonical = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const id = cleanText(payload.id, 160);
    const createdAtMs = Number(payload.createdAtMs);
    if (canonical !== cursor || payload.v !== 1 || payload.kind !== 'diagnostics_archive' || payload.type !== type
      || payload.filter !== cursorFilter(type) || !TOKEN_RE.test(id) || !Number.isSafeInteger(createdAtMs) || createdAtMs < 0) {
      throw new Error('invalid cursor payload');
    }
    return { id, createdAtMs };
  } catch {
    throw new HttpsError('invalid-argument', 'cursor is invalid');
  }
}

function errorText(error: unknown): string {
  return safeText(error instanceof Error ? error.message : String(error ?? 'unknown_error'), 300, {}, true);
}

async function readArchiveSource(
  db: FirebaseFirestore.Firestore,
  type: ArchiveDetailType,
  input: DiagnosticsArchiveListRequest,
  canReadUsers: boolean,
): Promise<DiagnosticsArchiveSourceResult> {
  const source = type === 'user' ? 'user_reports' : 'error_reports';
  const scanSize = Math.min(MAX_SOURCE_SCAN, Math.max(input.pageSize * 5, input.pageSize + 1));
  try {
    let query: FirebaseFirestore.Query = db.collection(source).orderBy('createdAtMs', 'desc');
    if (input.cursor) query = query.startAfter(decodeArchiveCursor(input.cursor, input.type).createdAtMs);
    const snapshot = await query.limit(scanSize + 1).get();
    const docs = snapshot.docs.slice(0, scanSize);
    const rows = docs
      .filter((doc) => isDiagnosticsArchiveStatus(type, doc.data().status))
      .map((doc) => projectDiagnosticsArchiveListRow(type, doc.id, doc.data() as Row, canReadUsers));
    return Object.freeze({
      source,
      rows,
      scanned: docs.length,
      cap: scanSize,
      truncated: snapshot.size > scanSize,
      error: '',
      boundaryAtMs: docs.length ? millis(docs[docs.length - 1].data().createdAtMs) : 0,
    });
  } catch (error) {
    if (error instanceof HttpsError && error.code === 'invalid-argument') throw error;
    return Object.freeze({ source, rows: [], scanned: 0, cap: scanSize, truncated: false, error: errorText(error), boundaryAtMs: 0 });
  }
}

export const adminListDiagnosticsArchive = onCall(
  { region: REGION, enforceAppCheck: true, timeoutSeconds: 20, memory: '512MiB' },
  async (request) => {
    const actor = requireDiagnosticsRead(request as { auth?: { uid?: string; token?: Row } });
    const input = parseDiagnosticsArchiveListRequest(request.data);
    if (input.cursor) decodeArchiveCursor(input.cursor, input.type);
    const types: ArchiveDetailType[] = input.type === 'all' ? ['user', 'error'] : [input.type];
    const results = await Promise.all(types.map((type) => readArchiveSource(admin.firestore(), type, input, actor.canReadUsers)));
    const merged = mergeDiagnosticsArchiveRows(results, input.pageSize);
    const lastItem = merged.items[merged.items.length - 1];
    const boundaryAtMs = results.filter((result) => result.truncated).map((result) => result.boundaryAtMs || 0).filter(Boolean).sort((left, right) => right - left)[0] || 0;
    const nextAtMs = merged.truncated ? Number(lastItem?.createdAtMs || boundaryAtMs) : 0;
    const nextId = cleanText(lastItem?.id, 160) || 'boundary';
    return {
      ok: merged.state !== 'error',
      state: merged.state,
      items: merged.items,
      count: merged.items.length,
      nextCursor: nextAtMs ? encodeArchiveCursor(input.type, nextId, nextAtMs) : null,
      truncated: merged.truncated,
      partial: merged.partial,
      sourceHealth: merged.sourceHealth,
      fetchedAtMs: Date.now(),
      error: merged.sourceHealth.filter((source) => source.error).map((source) => `${source.source}: ${source.error}`).join('; ').slice(0, 500),
    };
  },
);

export const adminGetDiagnosticsArchiveDetail = onCall(
  { region: REGION, enforceAppCheck: true, timeoutSeconds: 15, memory: '256MiB' },
  async (request) => {
    const actor = requireDiagnosticsRead(request as { auth?: { uid?: string; token?: Row } });
    const input = parseDiagnosticsArchiveDetailRequest(request.data);
    const source = input.type === 'user' ? 'user_reports' : 'error_reports';
    try {
      const snapshot = await admin.firestore().collection(source).doc(input.id).get();
      if (!snapshot.exists || !isDiagnosticsArchiveStatus(input.type, snapshot.data()?.status)) {
        const health = { source, state: 'empty', count: 0, scanned: 1, cap: 1, truncated: false, error: '' };
        return { ok: true, state: 'empty', item: null, sourceHealth: [health], fetchedAtMs: Date.now(), error: '' };
      }
      const item = projectDiagnosticsArchiveDetail(input.type, snapshot.id, snapshot.data() as Row, actor.canReadUsers);
      const health = { source, state: 'ready', count: 1, scanned: 1, cap: 1, truncated: false, error: '' };
      return { ok: true, state: 'ready', item, sourceHealth: [health], fetchedAtMs: Date.now(), error: '' };
    } catch (error) {
      const message = errorText(error);
      const health = { source, state: 'error', count: 0, scanned: 0, cap: 1, truncated: false, error: message };
      return { ok: false, state: 'error', item: null, sourceHealth: [health], fetchedAtMs: Date.now(), error: message };
    }
  },
);
