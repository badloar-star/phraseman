"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminListOpsLog = void 0;
exports.parseOpsLogRequest = parseOpsLogRequest;
exports.normalizeOpsType = normalizeOpsType;
exports.projectOpsRow = projectOpsRow;
exports.filterOpsRows = filterOpsRows;
exports.deriveOpsState = deriveOpsState;
exports.buildOpsSnapshotText = buildOpsSnapshotText;
exports.collapseAdminLogHealth = collapseAdminLogHealth;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const permissions_1 = require("./admin/permissions");
const roles_1 = require("./admin/roles");
const admin_log_projection_1 = require("./admin_log_projection");
const REGION = 'us-central1';
const ADMIN_LOG_CAP = 120;
const REPORT_CAP = 60;
const MAX_OPS_LIMIT = 250;
const SNAPSHOT_LIMIT = 120;
const OPS_SOURCES = new Set(['', 'admin', 'error_report', 'user_report']);
function requireOpsPermission(request, permission) {
    if (request.auth?.token?.admin !== true || !String(request.auth.uid ?? '').trim())
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    const claimedRole = request.auth.token.adminRole;
    const role = (0, roles_1.hasAdminRole)(claimedRole) ? claimedRole : 'admin';
    if (!(0, permissions_1.hasPermission)(role, permission))
        throw new https_1.HttpsError('permission-denied', `Role cannot use ${permission}`);
    return { actorUid: String(request.auth.uid), role, canReadUsers: (0, permissions_1.hasPermission)(role, 'users.read') };
}
function parseOpsLogRequest(data) {
    const input = (0, admin_log_projection_1.isRecord)(data) ? data : {};
    const requestedSource = (0, admin_log_projection_1.cleanText)(input.source, 40);
    const source = OPS_SOURCES.has(requestedSource) ? requestedSource : '';
    const type = (0, admin_log_projection_1.cleanText)(input.type, 100);
    const query = (0, admin_log_projection_1.cleanText)(input.query, 160).toLowerCase();
    const requestedLimit = Number(input.limit ?? MAX_OPS_LIMIT);
    const limit = Math.max(1, Math.min(MAX_OPS_LIMIT, Number.isFinite(requestedLimit) ? Math.floor(requestedLimit) : MAX_OPS_LIMIT));
    return Object.freeze({ source, type, query, limit });
}
function normalizeOpsType(source, row) {
    if (source === 'admin') {
        if (row.action === 'mark_fixed')
            return 'mark_fixed';
        if (row.action === 'ban' || row.action === 'unban' || row.action === 'ban_from_report')
            return 'ban';
        if (row.action === 'edit_field' && (0, admin_log_projection_1.isRecord)(row.details) && row.details.field === 'premium_plan')
            return 'premium_change';
        return (0, admin_log_projection_1.cleanText)(row.action, 120) || 'admin_event';
    }
    if (source === 'error_report')
        return 'report_created';
    if (source === 'user_report')
        return 'user_report_created';
    return 'event';
}
function maskIdentifier(value) {
    const text = (0, admin_log_projection_1.cleanText)(value, 160);
    if (!text)
        return '';
    return `${text.slice(0, 4)}…`;
}
function identityValue(value, canReadUsers) {
    const text = (0, admin_log_projection_1.cleanText)(value, 160);
    if (!text)
        return null;
    return canReadUsers ? text : maskIdentifier(text);
}
function projectOpsRow(source, id, raw, canReadUsers) {
    const timestamp = (0, admin_log_projection_1.timestampValue)(raw);
    const uid = raw.targetUid || raw.uid || raw.reportedUid || raw.reporterUid || '';
    const name = raw.userName || raw.reportedName || raw.reporterName || raw.name || '';
    const safeDetails = source === 'admin' ? (0, admin_log_projection_1.publicObject)(raw.details) ?? {} : {};
    return Object.freeze({
        id,
        source,
        sourceLabel: source === 'admin' ? 'Админ-действия' : source === 'error_report' ? 'Баг-репорты' : 'Жалобы пользователей',
        type: normalizeOpsType(source, raw),
        ts: (0, admin_log_projection_1.displayTimestamp)(timestamp),
        timestampMs: (0, admin_log_projection_1.millis)(timestamp),
        uid: identityValue(uid, canReadUsers),
        name: canReadUsers ? (0, admin_log_projection_1.cleanText)(name, 120) || null : null,
        status: (0, admin_log_projection_1.cleanText)(raw.status, 80) || null,
        details: safeDetails,
    });
}
function filterOpsRows(rows, input) {
    return rows.filter((row) => {
        if (input.source && row.source !== input.source)
            return false;
        if (input.type && row.type !== input.type)
            return false;
        if (!input.query)
            return true;
        return JSON.stringify(row).toLowerCase().includes(input.query);
    });
}
function kpis(rows) {
    const byType = rows.reduce((acc, row) => {
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
function deriveOpsState(sourceHealth, availableRows, filteredRows) {
    const hasError = sourceHealth.some((source) => source.state === 'error');
    const hasTruncated = sourceHealth.some((source) => source.state === 'truncated');
    if (hasError && !availableRows.length)
        return 'error';
    if (hasError)
        return 'partial';
    if (hasTruncated)
        return 'truncated';
    return filteredRows.length ? 'ready' : 'empty';
}
function buildOpsSnapshotText(rows, meta) {
    const safeRows = rows.slice(0, SNAPSHOT_LIMIT);
    const sourceLines = meta.sourceHealth.map((source) => `- ${source.source}: ${source.state}, rows=${source.count}${source.error ? ', error=' + source.error : ''}`);
    const lines = safeRows.map((row, index) => {
        const ts = (0, admin_log_projection_1.cleanText)(row.ts, 32).replace('T', ' ').slice(0, 19);
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
function collapseAdminLogHealth(result) {
    const errors = result.health.filter((source) => source.state === 'error');
    const error = errors.map((source) => `${source.field}: ${source.error || 'unknown_error'}`).filter(Boolean).join('; ').slice(0, 500);
    return {
        source: 'admin_log',
        state: errors.length ? 'error' : result.saturated ? 'truncated' : result.rows.length ? 'ready' : 'empty',
        count: result.rows.length,
        error,
    };
}
async function readAdminRows(db, canReadUsers) {
    const result = await (0, admin_log_projection_1.collectTimestampRows)(db.collection('admin_log'), admin_log_projection_1.DEFAULT_TIMESTAMP_FIELDS, ADMIN_LOG_CAP + 1, '');
    const byId = new Map();
    result.rows.forEach((raw) => {
        const id = (0, admin_log_projection_1.cleanText)(raw.id, 160);
        if (!id || byId.has(id))
            return;
        byId.set(id, projectOpsRow('admin', id, raw, canReadUsers));
    });
    const rows = [...byId.values()].sort(admin_log_projection_1.compareTimestampRows).slice(0, ADMIN_LOG_CAP);
    return {
        rows,
        health: collapseAdminLogHealth({ rows, saturated: result.saturated, health: result.health }),
    };
}
async function readReportRows(db, collectionName, source, canReadUsers) {
    try {
        const snapshot = await db.collection(collectionName).orderBy('createdAt', 'desc').limit(REPORT_CAP + 1).get();
        const rows = snapshot.docs.slice(0, REPORT_CAP).map((doc) => projectOpsRow(source, doc.id, doc.data(), canReadUsers));
        return { rows, health: { source: collectionName, state: snapshot.size > REPORT_CAP ? 'truncated' : rows.length ? 'ready' : 'empty', count: rows.length, error: '' } };
    }
    catch (error) {
        return { rows: [], health: { source: collectionName, state: 'error', count: 0, error: error instanceof Error ? error.message : String(error) } };
    }
}
exports.adminListOpsLog = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK, timeoutSeconds: 20, memory: '512MiB' }, async (request) => {
    const actor = requireOpsPermission(request, 'diagnostics.read');
    const input = parseOpsLogRequest(request.data);
    const db = admin.firestore();
    const [adminRows, errorRows, userRows] = await Promise.all([
        readAdminRows(db, actor.canReadUsers),
        readReportRows(db, 'error_reports', 'error_report', actor.canReadUsers),
        readReportRows(db, 'user_reports', 'user_report', actor.canReadUsers),
    ]);
    const sourceHealth = [adminRows.health, errorRows.health, userRows.health];
    const availableRows = [...adminRows.rows, ...errorRows.rows, ...userRows.rows].sort(admin_log_projection_1.compareTimestampRows);
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
});
//# sourceMappingURL=admin_ops_log.js.map