import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { hasPermission, type AdminPermission } from './admin/permissions';
import { hasAdminRole, type AdminRole } from './admin/roles';
import {
  cleanText,
  collectTimestampRows,
  compareTimestampRows,
  DEFAULT_TIMESTAMP_FIELDS,
  displayTimestamp,
  isRecord,
  millis,
  publicObject,
  timestampValue,
  type AdminLogRow,
  type TimestampSourceHealth,
} from './admin_log_projection';

const REGION = 'us-central1';
const ADMIN_LOG_CAP = 120;
const REPORT_CAP = 60;
const MAX_OPS_LIMIT = 250;
const SNAPSHOT_LIMIT = 120;
const OPS_SOURCES = new Set(['', 'admin', 'error_report', 'user_report']);

type Row = AdminLogRow;

export interface OpsLogRequest {
  readonly source: '' | 'admin' | 'error_report' | 'user_report';
  readonly type: string;
  readonly query: string;
  readonly limit: number;
}

export interface OpsSourceHealth {
  readonly source: 'admin_log' | 'error_reports' | 'user_reports';
  readonly state: 'ready' | 'empty' | 'truncated' | 'error';
  readonly count: number;
  readonly error: string;
}

function requireOpsPermission(
  request: { auth?: { uid?: string; token?: Row } | null },
  permission: AdminPermission,
): { actorUid: string; role: AdminRole; canReadUsers: boolean } {
  if (request.auth?.token?.admin !== true || !String(request.auth.uid ?? '').trim()) throw new HttpsError('permission-denied', 'Admin only');
  const claimedRole = request.auth.token.adminRole;
  const role: AdminRole = hasAdminRole(claimedRole) ? claimedRole : 'admin';
  if (!hasPermission(role, permission)) throw new HttpsError('permission-denied', `Role cannot use ${permission}`);
  return { actorUid: String(request.auth.uid), role, canReadUsers: hasPermission(role, 'users.read') };
}

export function parseOpsLogRequest(data: unknown): OpsLogRequest {
  const input = isRecord(data) ? data : {};
  const requestedSource = cleanText(input.source, 40) as OpsLogRequest['source'];
  const source = OPS_SOURCES.has(requestedSource) ? requestedSource : '';
  const type = cleanText(input.type, 100);
  const query = cleanText(input.query, 160).toLowerCase();
  const requestedLimit = Number(input.limit ?? MAX_OPS_LIMIT);
  const limit = Math.max(1, Math.min(MAX_OPS_LIMIT, Number.isFinite(requestedLimit) ? Math.floor(requestedLimit) : MAX_OPS_LIMIT));
  return Object.freeze({ source, type, query, limit });
}

export function normalizeOpsType(source: string, row: Row): string {
  if (source === 'admin') {
    if (row.action === 'mark_fixed') return 'mark_fixed';
    if (row.action === 'ban' || row.action === 'unban' || row.action === 'ban_from_report') return 'ban';
    if (row.action === 'edit_field' && isRecord(row.details) && row.details.field === 'premium_plan') return 'premium_change';
    return cleanText(row.action, 120) || 'admin_event';
  }
  if (source === 'error_report') return 'report_created';
  if (source === 'user_report') return 'user_report_created';
  return 'event';
}

function maskIdentifier(value: unknown): string {
  const text = cleanText(value, 160);
  if (!text) return '';
  return `${text.slice(0, 4)}…`;
}

function identityValue(value: unknown, canReadUsers: boolean): string | null {
  const text = cleanText(value, 160);
  if (!text) return null;
  return canReadUsers ? text : maskIdentifier(text);
}

export function projectOpsRow(source: 'admin' | 'error_report' | 'user_report', id: string, raw: Row, canReadUsers: boolean): Row {
  const timestamp = timestampValue(raw);
  const uid = raw.targetUid || raw.uid || raw.reportedUid || raw.reporterUid || '';
  const name = raw.userName || raw.reportedName || raw.reporterName || raw.name || '';
  const safeDetails = source === 'admin' ? publicObject(raw.details) ?? {} : {};
  return Object.freeze({
    id,
    source,
    sourceLabel: source === 'admin' ? 'Админ-действия' : source === 'error_report' ? 'Баг-репорты' : 'Жалобы пользователей',
    type: normalizeOpsType(source, raw),
    ts: displayTimestamp(timestamp),
    timestampMs: millis(timestamp),
    uid: identityValue(uid, canReadUsers),
    name: canReadUsers ? cleanText(name, 120) || null : null,
    status: cleanText(raw.status, 80) || null,
    details: safeDetails,
  });
}

export function filterOpsRows(rows: readonly Row[], input: OpsLogRequest): Row[] {
  return rows.filter((row) => {
    if (input.source && row.source !== input.source) return false;
    if (input.type && row.type !== input.type) return false;
    if (!input.query) return true;
    return JSON.stringify(row).toLowerCase().includes(input.query);
  });
}

function kpis(rows: readonly Row[]): Row {
  const byType = rows.reduce<Record<string, number>>((acc, row) => {
    const type = String(row.type || '');
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  return {
    events: rows.length,
    reportCreated: byType.report_created || 0,
    fixed: byType.mark_fixed || 0,
    premiumChanges: byType.premium_change || 0,
    banActions: byType.ban || 0,
  };
}

export function deriveOpsState(sourceHealth: readonly OpsSourceHealth[], availableRows: readonly Row[], filteredRows: readonly Row[]): 'ready' | 'partial' | 'truncated' | 'empty' | 'error' {
  const hasError = sourceHealth.some((source) => source.state === 'error');
  const hasTruncated = sourceHealth.some((source) => source.state === 'truncated');
  if (hasError && !availableRows.length) return 'error';
  if (hasError) return 'partial';
  if (hasTruncated) return 'truncated';
  return filteredRows.length ? 'ready' : 'empty';
}

export function buildOpsSnapshotText(rows: readonly Row[], meta: { state: string; sourceHealth: readonly OpsSourceHealth[] }): string {
  const safeRows = rows.slice(0, SNAPSHOT_LIMIT);
  const sourceLines = meta.sourceHealth.map((source) => `- ${source.source}: ${source.state}, rows=${source.count}${source.error ? ', error=' + source.error : ''}`);
  const lines = safeRows.map((row, index) => {
    const ts = cleanText(row.ts, 32).replace('T', ' ').slice(0, 19);
    const uid = row.uid ? maskIdentifier(row.uid) : '—';
    return `${index + 1}. [${row.source}] ${row.type} | ${ts} | uid=${uid} | status=${row.status || '—'} | details=${JSON.stringify(row.details || {})}`;
  });
  return [
    '# Ops Snapshot',
    `Generated: ${new Date().toISOString()}`,
    `State: ${meta.state}`,
    `Rows: ${safeRows.length}`,
    '',
    '## Source health',
    ...sourceLines,
    '',
    '## Notes',
    '- data is server-projected and sanitized',
    '- source caps: admin_log(120), error_reports(60), user_reports(60)',
    '- full user identifiers and private message text are omitted unless permitted',
    '',
    '## Events',
    ...lines,
  ].join('\n');
}

export function collapseAdminLogHealth(result: {
  readonly rows: readonly Row[];
  readonly saturated: boolean;
  readonly health: readonly TimestampSourceHealth[];
}): OpsSourceHealth {
  const errors = result.health.filter((source) => source.state === 'error');
  const error = errors.map((source) => `${source.field}: ${source.error || 'unknown_error'}`).filter(Boolean).join('; ').slice(0, 500);
  return {
    source: 'admin_log',
    state: errors.length ? 'error' : result.saturated ? 'truncated' : result.rows.length ? 'ready' : 'empty',
    count: result.rows.length,
    error,
  };
}

async function readAdminRows(db: FirebaseFirestore.Firestore, canReadUsers: boolean): Promise<{ rows: Row[]; health: OpsSourceHealth }> {
  const result = await collectTimestampRows(db.collection('admin_log'), DEFAULT_TIMESTAMP_FIELDS, ADMIN_LOG_CAP + 1, '');
  const byId = new Map<string, Row>();
  result.rows.forEach((raw) => {
    const id = cleanText(raw.id, 160);
    if (!id || byId.has(id)) return;
    byId.set(id, projectOpsRow('admin', id, raw, canReadUsers));
  });
  const rows = [...byId.values()].sort(compareTimestampRows).slice(0, ADMIN_LOG_CAP);
  return {
    rows,
    health: collapseAdminLogHealth({ rows, saturated: result.saturated, health: result.health }),
  };
}

async function readReportRows(
  db: FirebaseFirestore.Firestore,
  collectionName: 'error_reports' | 'user_reports',
  source: 'error_report' | 'user_report',
  canReadUsers: boolean,
): Promise<{ rows: Row[]; health: OpsSourceHealth }> {
  try {
    const snapshot = await db.collection(collectionName).orderBy('createdAt', 'desc').limit(REPORT_CAP + 1).get();
    const rows = snapshot.docs.slice(0, REPORT_CAP).map((doc) => projectOpsRow(source, doc.id, doc.data() as Row, canReadUsers));
    return { rows, health: { source: collectionName, state: snapshot.size > REPORT_CAP ? 'truncated' : rows.length ? 'ready' : 'empty', count: rows.length, error: '' } };
  } catch (error) {
    return { rows: [], health: { source: collectionName, state: 'error', count: 0, error: error instanceof Error ? error.message : String(error) } };
  }
}

export const adminListOpsLog = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds: 20, memory: '512MiB' },
  async (request) => {
    const actor = requireOpsPermission(request as { auth?: { uid?: string; token?: Row } }, 'diagnostics.read');
    const input = parseOpsLogRequest(request.data);
    const db = admin.firestore();
    const [adminRows, errorRows, userRows] = await Promise.all([
      readAdminRows(db, actor.canReadUsers),
      readReportRows(db, 'error_reports', 'error_report', actor.canReadUsers),
      readReportRows(db, 'user_reports', 'user_report', actor.canReadUsers),
    ]);
    const sourceHealth = [adminRows.health, errorRows.health, userRows.health];
    const availableRows = [...adminRows.rows, ...errorRows.rows, ...userRows.rows].sort(compareTimestampRows);
    const filteredRows = filterOpsRows(availableRows, input).slice(0, input.limit);
    const state = deriveOpsState(sourceHealth, availableRows, filteredRows);
    return {
      ok: true,
      state,
      items: filteredRows,
      count: filteredRows.length,
      kpis: kpis(filteredRows),
      sourceHealth,
      copyText: buildOpsSnapshotText(filteredRows, { state, sourceHealth }),
      fetchedAtMs: Date.now(),
    };
  },
);
