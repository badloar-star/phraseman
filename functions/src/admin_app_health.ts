import * as admin from 'firebase-admin';
import { createHash } from 'crypto';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { hasPermission } from './admin/permissions';
import { hasAdminRole, type AdminRole } from './admin/roles';

const REGION = 'us-central1';
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
const MAX_SCAN_SIZE = 500;
const MAX_EXPORT_LENGTH = 100_000;
const TOKEN_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/;
const FEATURE_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/;
const CURSOR_RE = /^[A-Za-z0-9_-]{1,500}$/;
const PERIODS = [1, 6, 24, 168] as const;
const SEVERITIES = ['all', 'warning', 'critical'] as const;
const APP_ERROR_STATUSES = ['all', 'new', 'open', 'reviewed', 'known', 'fixed'] as const;
const ACTIVITY_RESULTS = ['all', 'start', 'success', 'blocked', 'error', 'info'] as const;
const TAG_KEYS = new Set(['action', 'code', 'locale', 'network', 'operation', 'phase', 'plan', 'result', 'route', 'source', 'state', 'step']);

export const APP_HEALTH_STATUS_TARGETS = Object.freeze(['reviewed', 'fixed', 'known'] as const);

type Row = Record<string, unknown>;
type PeriodHours = typeof PERIODS[number];
type SeverityFilter = typeof SEVERITIES[number];
type AppErrorStatusFilter = typeof APP_ERROR_STATUSES[number];
type ActivityResultFilter = typeof ACTIVITY_RESULTS[number];
type DiagnosticsState = 'ready' | 'empty' | 'truncated' | 'partial' | 'error';

export interface AppHealthListRequest {
  readonly periodHours: PeriodHours;
  readonly severity: SeverityFilter;
  readonly status: AppErrorStatusFilter;
  readonly feature: string;
  readonly query: string;
  readonly pageSize: number;
  readonly cursor: string;
}

export interface AppActivityListRequest {
  readonly periodHours: PeriodHours;
  readonly result: ActivityResultFilter;
  readonly feature: string;
  readonly query: string;
  readonly pageSize: number;
  readonly cursor: string;
}

export interface AppHealthMetricRow {
  readonly id?: string;
  readonly severity: unknown;
  readonly fingerprint: unknown;
  readonly context: unknown;
  readonly userKey: unknown;
  readonly feature?: unknown;
  readonly status?: unknown;
  readonly message?: unknown;
  readonly createdAtMs?: unknown;
}

export interface AppHealthSummary {
  readonly level: 'GREEN' | 'YELLOW' | 'RED';
  readonly conclusive: boolean;
  readonly partial: boolean;
  readonly reason: string;
  readonly kpis: Readonly<{
    critical: number;
    warnings: number;
    affectedUsers: number;
    topRepeat: number;
  }>;
}

interface DiagnosticsActor {
  readonly actorUid: string;
  readonly role: AdminRole;
  readonly canReadUsers: boolean;
}

interface SourceHealth {
  readonly source: 'app_errors' | 'app_activity';
  readonly state: DiagnosticsState;
  readonly count: number;
  readonly scanned: number;
  readonly cap: number;
  readonly truncated: boolean;
  readonly partial: boolean;
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

function parseClosedValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T, field: string): T {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'string' && allowed.includes(value as T)) return value as T;
  throw new HttpsError('invalid-argument', `${field} is invalid`);
}

function parsePeriod(value: unknown): PeriodHours {
  if (value === undefined || value === null) return 24;
  if (typeof value === 'number' && (PERIODS as readonly number[]).includes(value)) return value as PeriodHours;
  throw new HttpsError('invalid-argument', 'periodHours is invalid');
}

function parsePageSize(value: unknown): number {
  if (value === undefined || value === null) return DEFAULT_PAGE_SIZE;
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new HttpsError('invalid-argument', 'pageSize is invalid');
  return Math.max(1, Math.min(MAX_PAGE_SIZE, Math.floor(value)));
}

function parseFeature(value: unknown): string {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string' || !FEATURE_RE.test(value)) throw new HttpsError('invalid-argument', 'feature is invalid');
  return value;
}

function parseQuery(value: unknown): string {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string' || value.length > 120 || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new HttpsError('invalid-argument', 'query is invalid');
  }
  return value.trim().toLowerCase();
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

export function parseAppHealthListRequest(data: unknown): AppHealthListRequest {
  const input = inputRecord(data);
  assertAllowedKeys(input, ['periodHours', 'severity', 'status', 'feature', 'query', 'pageSize', 'cursor']);
  return Object.freeze({
    periodHours: parsePeriod(input.periodHours),
    severity: parseClosedValue(input.severity, SEVERITIES, 'all', 'severity'),
    status: parseClosedValue(input.status, APP_ERROR_STATUSES, 'all', 'status'),
    feature: parseFeature(input.feature),
    query: parseQuery(input.query),
    pageSize: parsePageSize(input.pageSize),
    cursor: parseCursor(input.cursor),
  });
}

export function parseAppActivityListRequest(data: unknown): AppActivityListRequest {
  const input = inputRecord(data);
  assertAllowedKeys(input, ['periodHours', 'result', 'feature', 'query', 'pageSize', 'cursor']);
  return Object.freeze({
    periodHours: parsePeriod(input.periodHours),
    result: parseClosedValue(input.result, ACTIVITY_RESULTS, 'all', 'result'),
    feature: parseFeature(input.feature),
    query: parseQuery(input.query),
    pageSize: parsePageSize(input.pageSize),
    cursor: parseCursor(input.cursor),
  });
}

export function parseAppHealthDetailRequest(data: unknown): Readonly<{ id: string }> {
  const input = inputRecord(data);
  assertAllowedKeys(input, ['id']);
  return Object.freeze({ id: parseId(input.id) });
}

export function parseAppHealthExportRequest(data: unknown): AppHealthListRequest & Readonly<{ format: 'json' | 'ai' }> {
  const input = inputRecord(data);
  assertAllowedKeys(input, ['periodHours', 'severity', 'status', 'feature', 'query', 'format']);
  const format = parseClosedValue(input.format, ['json', 'ai'] as const, 'json', 'format');
  const filters = parseAppHealthListRequest({
    periodHours: input.periodHours,
    severity: input.severity,
    status: input.status,
    feature: input.feature,
    query: input.query,
    pageSize: MAX_PAGE_SIZE,
  });
  return Object.freeze({ ...filters, format });
}

function hash(value: string, length = 16): string {
  return createHash('sha256').update(value).digest('hex').slice(0, length);
}

function appHealthFilterKey(input: AppHealthListRequest): string {
  return hash(JSON.stringify([input.periodHours, input.severity, input.status, input.feature, input.query]), 24);
}

export function encodeAppHealthCursor(row: { readonly id: string; readonly createdAtMs: number }, input: AppHealthListRequest): string {
  const payload = { v: 1, kind: 'app_health', id: row.id, createdAtMs: row.createdAtMs, filter: appHealthFilterKey(input) };
  if (!TOKEN_RE.test(row.id) || !Number.isSafeInteger(row.createdAtMs) || row.createdAtMs < 0) {
    throw new HttpsError('invalid-argument', 'cursor row is invalid');
  }
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeAppHealthCursor(cursor: string, input: AppHealthListRequest): { id: string; createdAtMs: number } {
  try {
    if (!CURSOR_RE.test(cursor)) throw new Error('invalid cursor characters');
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const payload = JSON.parse(decoded) as Row;
    const canonical = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const id = cleanText(payload.id, 160);
    const createdAtMs = Number(payload.createdAtMs);
    if (canonical !== cursor || payload.v !== 1 || payload.kind !== 'app_health' || payload.filter !== appHealthFilterKey(input)
      || !TOKEN_RE.test(id) || !Number.isSafeInteger(createdAtMs) || createdAtMs < 0) throw new Error('invalid cursor payload');
    return { id, createdAtMs };
  } catch {
    throw new HttpsError('invalid-argument', 'cursor is invalid');
  }
}

function activityFilterKey(input: AppActivityListRequest): string {
  return hash(JSON.stringify([input.periodHours, input.result, input.feature, input.query]), 24);
}

function encodeActivityCursor(row: { readonly id: string; readonly createdAtMs: number }, input: AppActivityListRequest): string {
  const payload = { v: 1, kind: 'app_activity', id: row.id, createdAtMs: row.createdAtMs, filter: activityFilterKey(input) };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodeActivityCursor(cursor: string, input: AppActivityListRequest): { id: string; createdAtMs: number } {
  try {
    if (!CURSOR_RE.test(cursor)) throw new Error('invalid cursor characters');
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const payload = JSON.parse(decoded) as Row;
    const canonical = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const id = cleanText(payload.id, 160);
    const createdAtMs = Number(payload.createdAtMs);
    if (canonical !== cursor || payload.v !== 1 || payload.kind !== 'app_activity' || payload.filter !== activityFilterKey(input)
      || !TOKEN_RE.test(id) || !Number.isSafeInteger(createdAtMs) || createdAtMs < 0) throw new Error('invalid cursor payload');
    return { id, createdAtMs };
  } catch {
    throw new HttpsError('invalid-argument', 'cursor is invalid');
  }
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

function identityValues(row: Row): string[] {
  return ['uid', 'stableUid', 'authUid', 'userName', 'name', 'email']
    .map((key) => cleanText(row[key], 180))
    .filter((value) => value.length >= 3)
    .sort((left, right) => right.length - left.length);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

function normalizedSeverity(value: unknown): 'warning' | 'critical' {
  return cleanText(value, 20).toLowerCase() === 'critical' ? 'critical' : 'warning';
}

function normalizedStatus(value: unknown): Exclude<AppErrorStatusFilter, 'all'> {
  const status = cleanText(value, 40).toLowerCase();
  return (APP_ERROR_STATUSES as readonly string[]).includes(status) && status !== 'all'
    ? status as Exclude<AppErrorStatusFilter, 'all'>
    : 'new';
}

function normalizedActivityResult(value: unknown): Exclude<ActivityResultFilter, 'all'> {
  const result = cleanText(value, 40).toLowerCase();
  return (ACTIVITY_RESULTS as readonly string[]).includes(result) && result !== 'all'
    ? result as Exclude<ActivityResultFilter, 'all'>
    : 'info';
}

function projectUser(row: Row, canReadUsers: boolean): Row | null {
  const uid = cleanText(row.uid || row.stableUid, 160);
  const name = cleanText(row.userName || row.name, 120);
  const email = cleanText(row.email, 160);
  const identitySeed = uid || cleanText(row.authUid, 160) || email || name;
  if (!identitySeed) return null;
  if (!canReadUsers) return Object.freeze({ maskedId: `user_${hash(identitySeed, 12)}` });
  return Object.freeze({ uid: uid || null, name: name || null, email: email || null });
}

function safeTags(value: unknown, row: Row, canReadUsers: boolean): Row {
  if (!isRecord(value)) return Object.freeze({});
  const output: Row = {};
  for (const key of Object.keys(value).sort()) {
    if (!TAG_KEYS.has(key) || Object.keys(output).length >= 12) continue;
    const raw = value[key];
    if (typeof raw === 'string') output[key] = safeText(raw, 160, row, canReadUsers);
    else if (typeof raw === 'number' && Number.isFinite(raw)) output[key] = raw;
    else if (typeof raw === 'boolean' || raw === null) output[key] = raw;
  }
  return Object.freeze(output);
}

export function projectAppHealthRow(id: string, row: Row, canReadUsers: boolean, includeDetail: boolean): Row {
  const createdAtMs = millis(row.createdAtMs || row.createdAt || row.serverCreatedAt);
  const base: Row = {
    id: cleanText(id, 160),
    severity: normalizedSeverity(row.severity),
    status: normalizedStatus(row.status),
    feature: safeText(row.feature, 80, row, canReadUsers) || 'app',
    context: safeText(row.context, 180, row, canReadUsers) || null,
    screen: safeText(row.screen, 120, row, canReadUsers) || null,
    errorName: safeText(row.errorName, 120, row, canReadUsers) || null,
    message: safeText(row.message, 2_000, row, canReadUsers) || null,
    fingerprint: safeText(row.fingerprint, 120, row, canReadUsers) || null,
    createdAtMs,
    createdAt: createdAtMs ? new Date(createdAtMs).toISOString() : null,
    app: Object.freeze({
      platform: safeText(row.platform, 40, row, canReadUsers) || 'unknown',
      version: safeText(row.appVersion, 80, row, canReadUsers) || 'unknown',
      buildNumber: safeText(row.buildNumber, 80, row, canReadUsers) || null,
    }),
    device: Object.freeze({
      name: safeText(row.deviceName, 160, row, canReadUsers) || null,
      osVersion: safeText(row.osVersion, 80, row, canReadUsers) || null,
    }),
    user: projectUser(row, canReadUsers),
    tags: safeTags(row.tags, row, canReadUsers),
  };
  if (includeDetail) base.stack = safeText(row.stack, 4_000, row, canReadUsers) || null;
  return Object.freeze(base);
}

export function projectAppActivityRow(id: string, row: Row, canReadUsers: boolean): Row {
  const createdAtMs = millis(row.createdAtMs || row.createdAt || row.serverCreatedAt);
  return Object.freeze({
    id: cleanText(id, 160),
    action: safeText(row.action, 120, row, canReadUsers) || 'unknown',
    feature: safeText(row.feature, 80, row, canReadUsers) || 'app',
    screen: safeText(row.screen, 120, row, canReadUsers) || null,
    result: normalizedActivityResult(row.result),
    appState: safeText(row.appState, 40, row, canReadUsers) || null,
    createdAtMs,
    createdAt: createdAtMs ? new Date(createdAtMs).toISOString() : null,
    app: Object.freeze({
      platform: safeText(row.platform, 40, row, canReadUsers) || 'unknown',
      version: safeText(row.appVersion, 80, row, canReadUsers) || 'unknown',
      buildNumber: safeText(row.buildNumber, 80, row, canReadUsers) || null,
    }),
    device: Object.freeze({ osVersion: safeText(row.osVersion, 80, row, canReadUsers) || null }),
    user: projectUser(row, canReadUsers),
    tags: safeTags(row.tags, row, canReadUsers),
  });
}

function normalizedGroupKey(row: AppHealthMetricRow): string {
  const fingerprint = cleanText(row.fingerprint, 120);
  if (fingerprint) return fingerprint;
  const context = cleanText(row.context, 180).replace(/\s+/g, ' ').toLowerCase();
  return context ? `context:${context}` : 'context:unknown';
}

export function groupAppHealthRows(rows: readonly AppHealthMetricRow[], requestedLimit: number): Row[] {
  const groups = new Map<string, {
    key: string;
    count: number;
    critical: number;
    warnings: number;
    users: Set<string>;
    firstIndex: number;
    representative: AppHealthMetricRow;
    lastSeenAtMs: number;
  }>();
  rows.forEach((row, index) => {
    const key = normalizedGroupKey(row);
    const current = groups.get(key) ?? {
      key,
      count: 0,
      critical: 0,
      warnings: 0,
      users: new Set<string>(),
      firstIndex: index,
      representative: row,
      lastSeenAtMs: 0,
    };
    current.count += 1;
    if (normalizedSeverity(row.severity) === 'critical') current.critical += 1;
    else current.warnings += 1;
    const userKey = cleanText(row.userKey, 200);
    if (userKey) current.users.add(userKey);
    current.lastSeenAtMs = Math.max(current.lastSeenAtMs, millis(row.createdAtMs));
    groups.set(key, current);
  });
  const limit = Math.max(1, Math.min(MAX_PAGE_SIZE, Math.floor(requestedLimit) || 10));
  return [...groups.values()]
    .sort((left, right) => right.count - left.count || left.firstIndex - right.firstIndex)
    .slice(0, limit)
    .map((group) => {
      const representativeId = cleanText(group.representative.id, 160);
      return Object.freeze({
        id: representativeId,
        reportId: representativeId,
        key: group.key,
        fingerprint: cleanText(group.representative.fingerprint, 120) || null,
        context: cleanText(group.representative.context, 180) || null,
        feature: cleanText(group.representative.feature, 80) || 'app',
        status: normalizedStatus(group.representative.status),
        severity: group.critical > 0 ? 'critical' : 'warning',
        message: cleanText(group.representative.message, 2_000) || null,
        count: group.count,
        repeatCount: group.count,
        critical: group.critical,
        warnings: group.warnings,
        affectedUsers: group.users.size,
        lastSeenAtMs: group.lastSeenAtMs,
      });
    });
}

export function summarizeAppHealth(
  rows: readonly AppHealthMetricRow[],
  completeness: Readonly<{ truncated: boolean; partial: boolean }>,
): AppHealthSummary {
  const critical = rows.filter((row) => normalizedSeverity(row.severity) === 'critical').length;
  const warnings = rows.length - critical;
  const affectedUsers = new Set(rows.map((row) => cleanText(row.userKey, 200)).filter(Boolean)).size;
  const topRepeat = groupAppHealthRows(rows, 1)[0]?.count as number | undefined ?? 0;
  const level: AppHealthSummary['level'] = critical > 0 || affectedUsers >= 10
    ? 'RED'
    : warnings >= 5 || affectedUsers >= 3
      ? 'YELLOW'
      : 'GREEN';
  const partial = completeness.truncated || completeness.partial;
  const conclusive = !(level === 'GREEN' && partial);
  const reason = level === 'GREEN' && partial
    ? 'sample_incomplete'
    : critical > 0 ? 'critical_errors'
      : affectedUsers >= 10 ? 'affected_users_red'
        : warnings >= 5 ? 'warning_volume'
          : affectedUsers >= 3 ? 'affected_users_yellow'
            : 'within_thresholds';
  return Object.freeze({
    level,
    conclusive,
    partial,
    reason,
    kpis: Object.freeze({ critical, warnings, affectedUsers, topRepeat }),
  });
}

function userKey(row: Row): string {
  const identity = cleanText(row.uid || row.stableUid || row.authUid, 180);
  return identity ? hash(identity, 24) : '';
}

function metricFrom(row: Row, projected: Row): AppHealthMetricRow {
  return {
    id: cleanText(projected.id, 160),
    severity: projected.severity,
    fingerprint: projected.fingerprint,
    context: projected.context,
    userKey: userKey(row),
    feature: projected.feature,
    status: projected.status,
    message: projected.message,
    createdAtMs: projected.createdAtMs,
  };
}

function matchesTextQuery(row: Row, query: string): boolean {
  if (!query) return true;
  const haystack = [row.id, row.feature, row.context, row.screen, row.errorName, row.message, row.fingerprint, row.status, row.severity]
    .map((value) => cleanText(value, 2_000).toLowerCase()).join('\n');
  return haystack.includes(query);
}

function matchesAppHealth(row: Row, input: AppHealthListRequest, sinceMs: number): boolean {
  if (Number(row.createdAtMs || 0) < sinceMs) return false;
  if (input.severity !== 'all' && row.severity !== input.severity) return false;
  if (input.status !== 'all' && row.status !== input.status) return false;
  if (input.feature && cleanText(row.feature, 80).toLowerCase() !== input.feature.toLowerCase()) return false;
  return matchesTextQuery(row, input.query);
}

function matchesActivity(row: Row, input: AppActivityListRequest, sinceMs: number): boolean {
  if (Number(row.createdAtMs || 0) < sinceMs) return false;
  if (input.result !== 'all' && row.result !== input.result) return false;
  if (input.feature && cleanText(row.feature, 80).toLowerCase() !== input.feature.toLowerCase()) return false;
  return matchesTextQuery(row, input.query);
}

function requireDiagnosticsRead(request: { auth?: { uid?: string; token?: Row } | null }): DiagnosticsActor {
  if (request.auth?.token?.admin !== true || !cleanText(request.auth.uid, 160)) throw new HttpsError('permission-denied', 'Admin only');
  const claimedRole = request.auth.token.adminRole;
  const role: AdminRole = hasAdminRole(claimedRole) ? claimedRole : 'admin';
  if (!hasPermission(role, 'diagnostics.read')) throw new HttpsError('permission-denied', 'Role cannot use diagnostics.read');
  return { actorUid: String(request.auth.uid), role, canReadUsers: hasPermission(role, 'users.read') };
}

function errorText(error: unknown): string {
  return safeText(error instanceof Error ? error.message : String(error ?? 'unknown_error'), 300, {}, true);
}

export function buildAppDiagnosticsSourceHealth(
  source: SourceHealth['source'],
  values: Omit<SourceHealth, 'source'>,
): SourceHealth {
  return Object.freeze({ source, ...values });
}

function sourceHealth(
  source: SourceHealth['source'], state: DiagnosticsState, count: number, scanned: number,
  cap: number, truncated: boolean, partial: boolean, error = '',
): SourceHealth {
  return buildAppDiagnosticsSourceHealth(source, { state, count, scanned, cap, truncated, partial, error });
}

async function listAppHealthRows(db: FirebaseFirestore.Firestore, input: AppHealthListRequest, canReadUsers: boolean): Promise<Row> {
  const sinceMs = Date.now() - input.periodHours * 60 * 60 * 1000;
  const hasFilters = Boolean(input.severity !== 'all' || input.status !== 'all' || input.feature || input.query);
  const scanSize = hasFilters ? Math.min(MAX_SCAN_SIZE, Math.max(input.pageSize * 5, input.pageSize + 1)) : Math.min(MAX_SCAN_SIZE, input.pageSize + 1);
  try {
    let query: FirebaseFirestore.Query = db.collection('app_errors').orderBy('createdAtMs', 'desc');
    if (input.cursor) query = query.startAfter(decodeAppHealthCursor(input.cursor, input).createdAtMs);
    const snapshot = await query.limit(scanSize + 1).get();
    const docs = snapshot.docs.slice(0, scanSize);
    const projectedPairs = docs.map((doc) => {
      const raw = doc.data() as Row;
      return { raw, projected: projectAppHealthRow(doc.id, raw, canReadUsers, false) };
    });
    const matching = projectedPairs.filter(({ projected }) => matchesAppHealth(projected, input, sinceMs));
    const reachedPeriodBoundary = projectedPairs.some(({ projected }) => Number(projected.createdAtMs || 0) < sinceMs);
    const scanIncomplete = snapshot.size > scanSize && !reachedPeriodBoundary;
    const resultOverflow = matching.length > input.pageSize;
    const truncated = scanIncomplete || resultOverflow;
    const items = matching.slice(0, input.pageSize).map(({ projected }) => projected);
    const metrics = matching.map(({ raw, projected }) => metricFrom(raw, projected));
    const health = summarizeAppHealth(metrics, { truncated, partial: scanIncomplete });
    const cursorRow = resultOverflow
      ? items[items.length - 1]
      : scanIncomplete && docs.length ? { id: docs[docs.length - 1].id, createdAtMs: millis(docs[docs.length - 1].data().createdAtMs) } : null;
    const nextCursor = truncated && cursorRow && cleanText(cursorRow.id, 160) && Number(cursorRow.createdAtMs || 0) >= 0
      ? encodeAppHealthCursor({ id: String(cursorRow.id), createdAtMs: Number(cursorRow.createdAtMs || 0) }, input)
      : null;
    const state: DiagnosticsState = truncated ? 'truncated' : items.length ? 'ready' : 'empty';
    const healthRow = sourceHealth('app_errors', state, items.length, docs.length, scanSize, truncated, scanIncomplete);
    return {
      ok: true,
      state,
      items,
      count: items.length,
      groups: groupAppHealthRows(metrics, input.pageSize),
      kpis: health.kpis,
      health,
      nextCursor,
      truncated,
      partial: health.partial,
      sourceHealth: [healthRow],
      fetchedAtMs: Date.now(),
      error: '',
    };
  } catch (error) {
    if (error instanceof HttpsError && error.code === 'invalid-argument') throw error;
    const message = errorText(error);
    return {
      ok: false, state: 'error', items: [], count: 0, groups: [], kpis: null, health: null,
      nextCursor: null, truncated: false, partial: true,
      sourceHealth: [sourceHealth('app_errors', 'error', 0, 0, scanSize, false, true, message)],
      fetchedAtMs: Date.now(), error: message,
    };
  }
}

async function listAppActivityRows(db: FirebaseFirestore.Firestore, input: AppActivityListRequest, canReadUsers: boolean): Promise<Row> {
  const sinceMs = Date.now() - input.periodHours * 60 * 60 * 1000;
  const hasFilters = Boolean(input.result !== 'all' || input.feature || input.query);
  const scanSize = hasFilters ? Math.min(MAX_SCAN_SIZE, Math.max(input.pageSize * 5, input.pageSize + 1)) : Math.min(MAX_SCAN_SIZE, input.pageSize + 1);
  try {
    let query: FirebaseFirestore.Query = db.collection('app_activity').orderBy('createdAtMs', 'desc');
    if (input.cursor) query = query.startAfter(decodeActivityCursor(input.cursor, input).createdAtMs);
    const snapshot = await query.limit(scanSize + 1).get();
    const docs = snapshot.docs.slice(0, scanSize);
    const projected = docs.map((doc) => projectAppActivityRow(doc.id, doc.data() as Row, canReadUsers));
    const matching = projected.filter((row) => matchesActivity(row, input, sinceMs));
    const reachedPeriodBoundary = projected.some((row) => Number(row.createdAtMs || 0) < sinceMs);
    const scanIncomplete = snapshot.size > scanSize && !reachedPeriodBoundary;
    const resultOverflow = matching.length > input.pageSize;
    const truncated = scanIncomplete || resultOverflow;
    const items = matching.slice(0, input.pageSize);
    const cursorRow = resultOverflow
      ? items[items.length - 1]
      : scanIncomplete && docs.length ? { id: docs[docs.length - 1].id, createdAtMs: millis(docs[docs.length - 1].data().createdAtMs) } : null;
    const nextCursor = truncated && cursorRow
      ? encodeActivityCursor({ id: String(cursorRow.id), createdAtMs: Number(cursorRow.createdAtMs || 0) }, input)
      : null;
    const state: DiagnosticsState = truncated ? 'truncated' : items.length ? 'ready' : 'empty';
    return {
      ok: true, state, items, count: items.length, nextCursor, truncated, partial: scanIncomplete,
      sourceHealth: [sourceHealth('app_activity', state, items.length, docs.length, scanSize, truncated, scanIncomplete)],
      fetchedAtMs: Date.now(), error: '',
    };
  } catch (error) {
    if (error instanceof HttpsError && error.code === 'invalid-argument') throw error;
    const message = errorText(error);
    return {
      ok: false, state: 'error', items: [], count: 0, nextCursor: null, truncated: false, partial: true,
      sourceHealth: [sourceHealth('app_activity', 'error', 0, 0, scanSize, false, true, message)],
      fetchedAtMs: Date.now(), error: message,
    };
  }
}

function exportUser(value: unknown): Row | null {
  if (!isRecord(value)) return null;
  if (typeof value.maskedId === 'string') return Object.freeze({ maskedId: cleanText(value.maskedId, 40) });
  return Object.freeze({
    uid: cleanText(value.uid, 160) || null,
    name: cleanText(value.name, 120) || null,
    email: cleanText(value.email, 160) || null,
  });
}

function exportObject(value: unknown, fields: readonly string[], max = 180): Row {
  const source = isRecord(value) ? value : {};
  const output: Row = {};
  fields.forEach((field) => {
    const raw = source[field];
    if (typeof raw === 'string') output[field] = cleanText(raw, max) || null;
    else if (typeof raw === 'number' && Number.isFinite(raw)) output[field] = raw;
    else if (typeof raw === 'boolean' || raw === null) output[field] = raw;
  });
  return Object.freeze(output);
}

function exportItem(value: unknown): Row {
  const item = isRecord(value) ? value : {};
  return Object.freeze({
    id: cleanText(item.id, 160),
    severity: normalizedSeverity(item.severity),
    status: normalizedStatus(item.status),
    feature: cleanText(item.feature, 80) || 'app',
    context: cleanText(item.context, 180) || null,
    screen: cleanText(item.screen, 120) || null,
    errorName: cleanText(item.errorName, 120) || null,
    message: cleanText(item.message, 2_000) || null,
    fingerprint: cleanText(item.fingerprint, 120) || null,
    createdAtMs: millis(item.createdAtMs),
    app: exportObject(item.app, ['platform', 'version', 'buildNumber'], 80),
    device: exportObject(item.device, ['name', 'osVersion'], 160),
    user: exportUser(item.user),
    tags: exportObject(item.tags, [...TAG_KEYS], 160),
  });
}

export interface AppHealthExport {
  readonly format: 'json' | 'ai';
  readonly mimeType: 'application/json' | 'text/plain';
  readonly filename: string;
  readonly content: string;
  readonly truncated: boolean;
}

export function buildAppHealthExport(items: readonly unknown[], summary: AppHealthSummary, format: 'json' | 'ai'): AppHealthExport {
  const safeItems = items.slice(0, MAX_PAGE_SIZE).map(exportItem);
  const safeHealth = {
    level: summary.level,
    conclusive: summary.conclusive,
    partial: summary.partial,
    reason: cleanText(summary.reason, 80),
    kpis: {
      critical: Number(summary.kpis.critical) || 0,
      warnings: Number(summary.kpis.warnings) || 0,
      affectedUsers: Number(summary.kpis.affectedUsers) || 0,
      topRepeat: Number(summary.kpis.topRepeat) || 0,
    },
  };
  const date = new Date().toISOString().slice(0, 10);
  let exportedItems = safeItems;
  let truncated = items.length > safeItems.length;
  const render = (): string => format === 'json'
    ? JSON.stringify({ schemaVersion: 1, sanitized: true, health: safeHealth, items: exportedItems }, null, 2)
    : ['APP HEALTH SAFE EXPORT', `Health: ${safeHealth.level} (${safeHealth.reason})`, `Conclusive: ${safeHealth.conclusive}`, `KPIs: ${JSON.stringify(safeHealth.kpis)}`, ...exportedItems.map((item) => JSON.stringify(item))].join('\n');
  let content = render();
  while (content.length > MAX_EXPORT_LENGTH && exportedItems.length) {
    exportedItems = exportedItems.slice(0, -1);
    truncated = true;
    content = render();
  }
  if (content.length > MAX_EXPORT_LENGTH) {
    content = content.slice(0, MAX_EXPORT_LENGTH);
    truncated = true;
  }
  return Object.freeze({
    format,
    mimeType: format === 'json' ? 'application/json' : 'text/plain',
    filename: `app-health-${date}.${format === 'json' ? 'json' : 'txt'}`,
    content,
    truncated,
  });
}

export const adminListAppHealth = onCall(
  { region: REGION, enforceAppCheck: true, timeoutSeconds: 20, memory: '512MiB' },
  async (request) => {
    const actor = requireDiagnosticsRead(request as { auth?: { uid?: string; token?: Row } });
    return listAppHealthRows(admin.firestore(), parseAppHealthListRequest(request.data), actor.canReadUsers);
  },
);

export const adminListAppActivity = onCall(
  { region: REGION, enforceAppCheck: true, timeoutSeconds: 20, memory: '512MiB' },
  async (request) => {
    const actor = requireDiagnosticsRead(request as { auth?: { uid?: string; token?: Row } });
    return listAppActivityRows(admin.firestore(), parseAppActivityListRequest(request.data), actor.canReadUsers);
  },
);

export const adminGetAppHealthDetail = onCall(
  { region: REGION, enforceAppCheck: true, timeoutSeconds: 15, memory: '256MiB' },
  async (request) => {
    const actor = requireDiagnosticsRead(request as { auth?: { uid?: string; token?: Row } });
    const input = parseAppHealthDetailRequest(request.data);
    try {
      const snapshot = await admin.firestore().collection('app_errors').doc(input.id).get();
      if (!snapshot.exists) {
        const health = sourceHealth('app_errors', 'empty', 0, 1, 1, false, false);
        return { ok: true, state: 'empty', item: null, sourceHealth: [health], fetchedAtMs: Date.now(), error: '' };
      }
      const item = projectAppHealthRow(snapshot.id, snapshot.data() as Row, actor.canReadUsers, true);
      const health = sourceHealth('app_errors', 'ready', 1, 1, 1, false, false);
      return { ok: true, state: 'ready', item, sourceHealth: [health], fetchedAtMs: Date.now(), error: '' };
    } catch (error) {
      const message = errorText(error);
      return { ok: false, state: 'error', item: null, sourceHealth: [sourceHealth('app_errors', 'error', 0, 0, 1, false, true, message)], fetchedAtMs: Date.now(), error: message };
    }
  },
);

export const adminExportAppHealth = onCall(
  { region: REGION, enforceAppCheck: true, timeoutSeconds: 20, memory: '512MiB' },
  async (request) => {
    const actor = requireDiagnosticsRead(request as { auth?: { uid?: string; token?: Row } });
    const input = parseAppHealthExportRequest(request.data);
    const result = await listAppHealthRows(admin.firestore(), input, actor.canReadUsers);
    if (result.state === 'error' || !Array.isArray(result.items) || !isRecord(result.health)) return result;
    const exported = buildAppHealthExport(result.items, result.health as unknown as AppHealthSummary, input.format);
    return {
      ok: true,
      state: result.state,
      ...exported,
      truncated: exported.truncated || result.truncated === true,
      partial: result.partial === true,
      sourceHealth: result.sourceHealth,
      fetchedAtMs: Date.now(),
      error: '',
    };
  },
);
