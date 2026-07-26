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
exports.adminListAuditLog = exports.MAX_AUDIT_SCAN_LIMIT = exports.MAX_AUDIT_LIMIT = void 0;
exports.parseAuditListRequest = parseAuditListRequest;
exports.projectAuditRow = projectAuditRow;
exports.mergeAuditRowsForList = mergeAuditRowsForList;
exports.summarizeAuditSourceHealth = summarizeAuditSourceHealth;
exports.collectAuditRawRows = collectAuditRawRows;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const permissions_1 = require("./admin/permissions");
const roles_1 = require("./admin/roles");
const admin_log_projection_1 = require("./admin_log_projection");
const REGION = 'us-central1';
exports.MAX_AUDIT_LIMIT = 100;
exports.MAX_AUDIT_SCAN_LIMIT = 500;
const DEFAULT_AUDIT_LIMIT = 50;
const CURSOR_RE = /^[A-Za-z0-9_-]{1,500}$/;
const DAY_VALUES = new Set([1, 7, 30, 90]);
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function cleanText(value, max = 500) {
    return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
function millis(value) {
    if (typeof value === 'number' && Number.isFinite(value))
        return value;
    if (typeof value === 'string') {
        const parsed = Date.parse(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    if (isRecord(value)) {
        if (typeof value.toMillis === 'function') {
            try {
                return Number(value.toMillis()) || 0;
            }
            catch {
                return 0;
            }
        }
        if (typeof value.seconds === 'number')
            return value.seconds * 1000;
    }
    return 0;
}
function requireAuditPermission(request, permission) {
    if (request.auth?.token?.admin !== true || !String(request.auth.uid ?? '').trim())
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    const claimedRole = request.auth.token.adminRole;
    const role = (0, roles_1.hasAdminRole)(claimedRole) ? claimedRole : 'admin';
    if (!(0, permissions_1.hasPermission)(role, permission))
        throw new https_1.HttpsError('permission-denied', `Role cannot use ${permission}`);
    return { actorUid: String(request.auth.uid), role };
}
function timestampValue(row) {
    return row.timestamp || row.ts || row.createdAt;
}
function displayTimestamp(value) {
    const text = cleanText(value, 64);
    if (text)
        return text;
    const ms = millis(value);
    return ms > 0 ? new Date(ms).toISOString() : '';
}
function parseAuditListRequest(data) {
    const input = isRecord(data) ? data : {};
    const action = cleanText(input.action, 120);
    const query = cleanText(input.query, 160).toLowerCase();
    const requestedDays = Number(input.sinceDays ?? 7);
    const sinceDays = (DAY_VALUES.has(requestedDays) ? requestedDays : 7);
    const requestedLimit = Number(input.limit ?? DEFAULT_AUDIT_LIMIT);
    const limit = Math.max(1, Math.min(exports.MAX_AUDIT_LIMIT, Number.isFinite(requestedLimit) ? Math.floor(requestedLimit) : DEFAULT_AUDIT_LIMIT));
    const cursor = cleanText(input.cursor, 501);
    if (cursor && !CURSOR_RE.test(cursor))
        throw new https_1.HttpsError('invalid-argument', 'cursor is invalid');
    if (cursor && (action || query))
        throw new https_1.HttpsError('invalid-argument', 'cursor cannot be combined with audit filters');
    return Object.freeze({ action, query, sinceDays, limit, cursor });
}
function decodeCursor(cursor) {
    try {
        const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
        const id = cleanText(parsed.id, 160);
        if (!id)
            throw new Error('missing id');
        return { id, timestampMs: Number(parsed.timestampMs || 0) };
    }
    catch {
        throw new https_1.HttpsError('invalid-argument', 'cursor is invalid');
    }
}
function projectAuditRow(id, row) {
    const entity = (0, admin_log_projection_1.publicObject)(row.entity) ?? {};
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
        before: (0, admin_log_projection_1.publicObject)(row.before),
        after: (0, admin_log_projection_1.publicObject)(row.after),
        details: (0, admin_log_projection_1.publicObject)(row.details),
    });
}
function matchesAuditFilters(row, input, sinceMs) {
    if (Number(row.timestampMs ?? 0) > 0 && Number(row.timestampMs) < sinceMs)
        return false;
    if (input.action && row.action !== input.action)
        return false;
    if (!input.query)
        return true;
    return JSON.stringify(row).toLowerCase().includes(input.query);
}
function compareAuditRows(a, b) {
    return (0, admin_log_projection_1.compareTimestampRows)(a, b);
}
function rowIsAfterCursor(row, cursor) {
    if (!cursor)
        return true;
    const rowMs = Number(row.timestampMs || 0);
    if (cursor.timestampMs > 0 && rowMs > 0) {
        if (rowMs < cursor.timestampMs)
            return true;
        if (rowMs === cursor.timestampMs)
            return String(row.id || '') > cursor.id;
        return false;
    }
    return String(row.id || '') > cursor.id;
}
function mergeAuditRowsForList(rows, input, sinceMs, cursor) {
    const byId = new Map();
    rows.forEach((row) => {
        const id = cleanText(row.id, 160);
        if (!id || byId.has(id))
            return;
        const projected = projectAuditRow(id, row);
        if (rowIsAfterCursor(projected, cursor) && matchesAuditFilters(projected, input, sinceMs))
            byId.set(id, projected);
    });
    return [...byId.values()].sort(compareAuditRows);
}
function summarizeAuditSourceHealth(result, count) {
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
async function collectAuditRawRows(db, input, scanLimit) {
    const result = await (0, admin_log_projection_1.collectTimestampRows)(db.collection('admin_log'), admin_log_projection_1.DEFAULT_TIMESTAMP_FIELDS, scanLimit, input.cursor);
    return { rows: result.rows, scanned: result.scanned, saturated: result.saturated, health: result.health };
}
exports.adminListAuditLog = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK, timeoutSeconds: 20, memory: '512MiB' }, async (request) => {
    requireAuditPermission(request, 'diagnostics.read');
    const input = parseAuditListRequest(request.data);
    const db = admin.firestore();
    const sinceMs = Date.now() - input.sinceDays * 24 * 60 * 60 * 1000;
    const hasFilters = Boolean(input.action || input.query);
    const scanLimit = hasFilters ? Math.min(exports.MAX_AUDIT_SCAN_LIMIT, Math.max(input.limit * 5, input.limit + 1)) : input.limit + 1;
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
        nextCursor: !hasFilters && items.length === input.limit ? (0, admin_log_projection_1.encodeTimestampCursor)(items[items.length - 1]) : null,
        fetchedAtMs: Date.now(),
        sourceHealth: [sourceHealth],
    };
});
//# sourceMappingURL=admin_audit_log.js.map