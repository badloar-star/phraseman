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
exports.adminUpdateReportStatus = exports.adminListReportQueue = exports.REPORT_SOURCES = void 0;
exports.parseReportListRequest = parseReportListRequest;
exports.canonicalReportLane = canonicalReportLane;
exports.projectReportRow = projectReportRow;
exports.matchesReportFilters = matchesReportFilters;
exports.isAllowedReportTransition = isAllowedReportTransition;
exports.parseReportStatusUpdateRequest = parseReportStatusUpdateRequest;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const permissions_1 = require("./admin/permissions");
const roles_1 = require("./admin/roles");
const REGION = 'us-central1';
const MAX_LIST_LIMIT = 100;
const MAX_FILTER_SCAN_LIMIT = 500;
const DEFAULT_LIST_LIMIT = 50;
const TOKEN_RE = /^[A-Za-z0-9._-]{1,160}$/;
const UID_RE = /^[A-Za-z0-9._-]{2,160}$/;
const CURSOR_RE = /^[A-Za-z0-9_-]{1,500}$/;
const LANE_VALUES = new Set(['open', 'reviewed', 'known', 'resolved', 'answered', 'escalated', 'archived']);
exports.REPORT_SOURCES = ['error_reports', 'user_reports', 'community_pack_reports', 'explain_report_entries', 'app_errors'];
const SOURCE_CONFIG = Object.freeze({
    error_reports: {
        collection: 'error_reports', userFields: ['uid'], summaryFields: ['comment', 'dataText', 'context'], categoryFields: ['category', 'screen'], defaultStatus: 'new',
        laneByStatus: { new: 'open', open: 'open', fixed: 'resolved', answered: 'answered', archived: 'archived' },
        transitions: { new: ['fixed', 'archived'], open: ['fixed', 'archived'], fixed: ['open', 'archived'], archived: ['open'] },
    },
    user_reports: {
        collection: 'user_reports', userFields: ['reporterUid', 'reportedUid'], summaryFields: ['reason', 'comment'], categoryFields: ['category'], defaultStatus: 'new',
        laneByStatus: { new: 'open', reviewed: 'reviewed', banned: 'escalated', answered: 'answered', archived: 'archived' },
        transitions: { new: ['reviewed', 'archived'], reviewed: ['new', 'archived'], archived: ['new'] },
    },
    community_pack_reports: {
        collection: 'community_pack_reports', userFields: ['reporterUid', 'authorStableId', 'authorUid', 'ownerUid'], summaryFields: ['reason', 'comment', 'packTitle'], categoryFields: ['category'], defaultStatus: 'new',
        laneByStatus: { new: 'open', reviewed: 'reviewed', answered: 'answered' }, transitions: { new: ['reviewed'], reviewed: ['new'] },
    },
    explain_report_entries: {
        collection: 'explain_report_entries', userFields: ['stableUid', 'uid'], summaryFields: ['reason', 'comment', 'phrase'], categoryFields: ['kind'], defaultStatus: 'new',
        laneByStatus: { new: 'open', done: 'resolved', answered: 'answered' }, transitions: { new: ['done'], done: ['new'] },
    },
    app_errors: {
        collection: 'app_errors', userFields: ['uid', 'stableUid'], summaryFields: ['message', 'context', 'errorName'], categoryFields: ['feature', 'severity'], defaultStatus: 'new',
        laneByStatus: { new: 'open', open: 'open', reviewed: 'reviewed', known: 'known', fixed: 'resolved' },
        transitions: { new: ['reviewed', 'known', 'fixed'], open: ['reviewed', 'known', 'fixed'], reviewed: ['open', 'known', 'fixed'], known: ['open', 'fixed'], fixed: ['open'] },
    },
});
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function cleanText(value, max = 500) {
    return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
function errorText(error) {
    return (error instanceof Error ? error.message : String(error ?? 'unknown error')).slice(0, 300);
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
function requireReportPermission(request, permission) {
    if (request.auth?.token?.admin !== true || !String(request.auth.uid ?? '').trim())
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    const claimedRole = request.auth.token.adminRole;
    const role = (0, roles_1.hasAdminRole)(claimedRole) ? claimedRole : 'admin';
    if (!(0, permissions_1.hasPermission)(role, permission))
        throw new https_1.HttpsError('permission-denied', `Role cannot use ${permission}`);
    return { actorUid: String(request.auth.uid), role };
}
function parseSource(value, allowAll) {
    const source = cleanText(value || 'all', 40);
    if ((allowAll && source === 'all') || exports.REPORT_SOURCES.includes(source))
        return source;
    throw new https_1.HttpsError('invalid-argument', 'unsupported report source');
}
function parseReportListRequest(data) {
    const input = isRecord(data) ? data : {};
    const source = parseSource(input.source, true);
    const rawStatus = cleanText(input.rawStatus, 40).toLowerCase();
    const lane = cleanText(input.lane, 40).toLowerCase();
    const uid = cleanText(input.uid, 161);
    const category = cleanText(input.category, 120).toLowerCase();
    const reportId = cleanText(input.reportId, 161);
    const requestedDays = Number(input.sinceDays ?? 7);
    const sinceDays = ([1, 7, 30, 90].includes(requestedDays) ? requestedDays : 7);
    const requestedLimit = Number(input.limit ?? DEFAULT_LIST_LIMIT);
    const limit = Math.max(1, Math.min(MAX_LIST_LIMIT, Number.isFinite(requestedLimit) ? Math.floor(requestedLimit) : DEFAULT_LIST_LIMIT));
    const cursor = cleanText(input.cursor, 501);
    if (lane && !LANE_VALUES.has(lane))
        throw new https_1.HttpsError('invalid-argument', 'unsupported canonical lane');
    if (uid && !UID_RE.test(uid))
        throw new https_1.HttpsError('invalid-argument', 'uid is invalid');
    if (reportId && !TOKEN_RE.test(reportId))
        throw new https_1.HttpsError('invalid-argument', 'reportId is invalid');
    if (cursor && !CURSOR_RE.test(cursor))
        throw new https_1.HttpsError('invalid-argument', 'cursor is invalid');
    if (source === 'all' && cursor)
        throw new https_1.HttpsError('invalid-argument', 'cursor requires a specific source');
    if (cursor && (rawStatus || lane || uid || category || reportId))
        throw new https_1.HttpsError('invalid-argument', 'cursor cannot be combined with report filters');
    return Object.freeze({ source, rawStatus, lane, uid, category, reportId, sinceDays, limit, cursor });
}
function normalizedStatus(source, status) {
    return cleanText(status, 40).toLowerCase() || SOURCE_CONFIG[source].defaultStatus;
}
function canonicalReportLane(source, status) {
    const rawStatus = normalizedStatus(source, status);
    return SOURCE_CONFIG[source].laneByStatus[rawStatus] ?? 'open';
}
function firstText(row, fields, max) {
    for (const field of fields) {
        const value = cleanText(row[field], max);
        if (value)
            return value;
    }
    return '';
}
function projectReportRow(source, id, row) {
    const config = SOURCE_CONFIG[source];
    const rawStatus = normalizedStatus(source, row.status);
    const reporterUid = cleanText(row.reporterUid, 160);
    const reportedUid = cleanText(row.reportedUid, 160);
    const authorUid = cleanText(row.authorStableId || row.authorUid || row.ownerUid, 160);
    const primaryUid = cleanText(row.uid || row.stableUid || reporterUid, 160);
    return Object.freeze({
        id,
        source,
        rawStatus,
        lane: canonicalReportLane(source, rawStatus),
        summary: firstText(row, config.summaryFields, 800) || '(без описания)',
        category: firstText(row, config.categoryFields, 120) || null,
        severity: cleanText(row.severity, 40) || null,
        createdAtMs: millis(row.createdAtMs || row.createdAt || row.serverCreatedAt),
        users: Object.freeze({
            primaryUid: primaryUid || null,
            reporterUid: reporterUid || null,
            reporterName: cleanText(row.reporterName || row.userName, 120) || null,
            reportedUid: reportedUid || null,
            reportedName: cleanText(row.reportedName, 120) || null,
            authorUid: authorUid || null,
        }),
        context: Object.freeze({
            screen: cleanText(row.screen, 100) || null,
            dataId: cleanText(row.dataId, 200) || null,
            packId: cleanText(row.packId, 160) || null,
            feature: cleanText(row.feature, 120) || null,
        }),
    });
}
function matchesReportFilters(source, row, input) {
    const config = SOURCE_CONFIG[source];
    if (input.uid && !config.userFields.some((field) => cleanText(row[field], 160) === input.uid))
        return false;
    if (input.category && !config.categoryFields.some((field) => cleanText(row[field], 120).toLowerCase() === input.category))
        return false;
    const rawStatus = normalizedStatus(source, row.status);
    if (input.rawStatus && rawStatus !== input.rawStatus)
        return false;
    if (input.lane && canonicalReportLane(source, rawStatus) !== input.lane)
        return false;
    return true;
}
function isAllowedReportTransition(source, from, to) {
    const current = normalizedStatus(source, from);
    const next = normalizedStatus(source, to);
    return (SOURCE_CONFIG[source].transitions[current] ?? []).includes(next);
}
function parseReportStatusUpdateRequest(data) {
    if (!isRecord(data))
        throw new https_1.HttpsError('invalid-argument', 'status update request required');
    const source = parseSource(data.source, false);
    const reportId = cleanText(data.reportId, 161);
    const expectedStatus = cleanText(data.expectedStatus, 40).toLowerCase();
    const nextStatus = cleanText(data.nextStatus, 40).toLowerCase();
    const reason = cleanText(data.reason, 500);
    const idempotencyKey = cleanText(data.idempotencyKey, 161);
    const requestId = cleanText(data.requestId, 161);
    if (!TOKEN_RE.test(reportId) || !TOKEN_RE.test(idempotencyKey) || !TOKEN_RE.test(requestId) || !expectedStatus || !nextStatus || !reason) {
        throw new https_1.HttpsError('invalid-argument', 'reportId, statuses, reason, idempotencyKey and requestId are required');
    }
    if (!isAllowedReportTransition(source, expectedStatus, nextStatus))
        throw new https_1.HttpsError('invalid-argument', 'report status transition is not allowed');
    return Object.freeze({ source, reportId, expectedStatus, nextStatus, reason, idempotencyKey, requestId });
}
function encodeCursor(source, id) {
    return Buffer.from(JSON.stringify({ source, id }), 'utf8').toString('base64url');
}
function decodeCursor(cursor, source) {
    try {
        const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
        const id = cleanText(parsed.id, 160);
        if (parsed.source !== source || !TOKEN_RE.test(id))
            throw new Error('cursor mismatch');
        return id;
    }
    catch {
        throw new https_1.HttpsError('invalid-argument', 'cursor is invalid');
    }
}
async function fetchReportSource(db, source, input, sourceLimit) {
    const config = SOURCE_CONFIG[source];
    const collection = db.collection(config.collection);
    const fetchLimit = Math.min(MAX_LIST_LIMIT, sourceLimit) + 1;
    const sinceMs = Date.now() - input.sinceDays * 24 * 60 * 60 * 1000;
    const hasFilters = Boolean(input.uid || input.rawStatus || input.lane || input.category);
    const scanLimit = hasFilters ? Math.min(MAX_FILTER_SCAN_LIMIT, Math.max(fetchLimit, sourceLimit * 10)) : fetchLimit;
    try {
        let docs = [];
        if (input.reportId) {
            const snapshot = await collection.doc(input.reportId).get();
            docs = snapshot.exists ? [snapshot] : [];
        }
        else if (input.cursor) {
            const cursorId = decodeCursor(input.cursor, source);
            const cursorDoc = await collection.doc(cursorId).get();
            if (!cursorDoc.exists)
                throw new https_1.HttpsError('failed-precondition', 'cursor document no longer exists');
            const snapshot = await collection.where('createdAtMs', '>=', sinceMs).orderBy('createdAtMs', 'desc').startAfter(cursorDoc).limit(fetchLimit).get();
            docs = snapshot.docs;
        }
        else {
            docs = (await collection.where('createdAtMs', '>=', sinceMs).orderBy('createdAtMs', 'desc').limit(scanLimit).get()).docs;
        }
        const projected = docs.filter((doc) => matchesReportFilters(source, doc.data(), input))
            .map((doc) => projectReportRow(source, doc.id, doc.data()))
            .filter((row) => Number(row.createdAtMs ?? 0) === 0 || Number(row.createdAtMs) >= sinceMs)
            .sort((left, right) => Number(right.createdAtMs ?? 0) - Number(left.createdAtMs ?? 0));
        const truncated = projected.length > sourceLimit || (hasFilters && docs.length >= scanLimit);
        const rows = projected.slice(0, sourceLimit);
        return {
            source,
            rows,
            state: truncated ? 'truncated' : rows.length ? 'ready' : 'empty',
            count: rows.length,
            truncated,
            ...(truncated && !input.uid && !input.rawStatus && !input.lane && !input.category && !input.reportId && rows.length ? { nextCursor: encodeCursor(source, String(rows[rows.length - 1].id)) } : {}),
        };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError && error.code === 'failed-precondition')
            throw error;
        return { source, rows: [], state: 'error', count: 0, truncated: false, error: errorText(error) };
    }
}
exports.adminListReportQueue = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK, timeoutSeconds: 20, memory: '512MiB' }, async (request) => {
    const context = requireReportPermission(request, 'reports.read');
    const input = parseReportListRequest(request.data);
    const canReadDiagnostics = (0, permissions_1.hasPermission)(context.role, 'diagnostics.read');
    if (input.source === 'app_errors' && !canReadDiagnostics)
        throw new https_1.HttpsError('permission-denied', 'Role cannot read app errors');
    const omittedSources = input.source === 'all' && !canReadDiagnostics ? ['app_errors'] : [];
    const sources = (input.source === 'all' ? [...exports.REPORT_SOURCES] : [input.source]).filter((source) => !omittedSources.includes(source));
    const perSourceLimit = input.source === 'all' ? Math.min(20, Math.max(5, Math.ceil(input.limit / sources.length))) : input.limit;
    const results = await Promise.all(sources.map((source) => fetchReportSource(admin.firestore(), source, input, perSourceLimit)));
    const items = results.flatMap((result) => result.rows).sort((left, right) => Number(right.createdAtMs ?? 0) - Number(left.createdAtMs ?? 0)).slice(0, input.limit);
    const sourceHealth = results.map(({ source, state, count, truncated, error }) => ({ source, state, count, truncated, ...(error ? { error } : {}) }));
    sourceHealth.push(...omittedSources.map((source) => ({ source, state: 'denied', count: 0, truncated: false, error: 'diagnostics.read required' })));
    return {
        ok: true,
        state: omittedSources.length || results.some((result) => result.state === 'error') ? 'partial' : results.some((result) => result.truncated) ? 'truncated' : 'ready',
        items,
        count: items.length,
        sourceHealth,
        omittedSources,
        nextCursor: input.source === 'all' ? null : results[0]?.nextCursor ?? null,
        fetchedAtMs: Date.now(),
    };
});
exports.adminUpdateReportStatus = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    const input = parseReportStatusUpdateRequest(request.data);
    const context = requireReportPermission(request, input.source === 'app_errors' ? 'diagnostics.status.write' : 'reports.status.write');
    const db = admin.firestore();
    const reportRef = db.collection(input.source).doc(input.reportId);
    const operationRef = db.collection('admin_command_operations').doc(input.idempotencyKey);
    const auditRef = db.collection('admin_log').doc();
    const fingerprint = JSON.stringify({ source: input.source, reportId: input.reportId, expectedStatus: input.expectedStatus, nextStatus: input.nextStatus });
    const nowMs = Date.now();
    return db.runTransaction(async (tx) => {
        const [reportSnap, operationSnap] = await Promise.all([tx.get(reportRef), tx.get(operationRef)]);
        if (operationSnap.exists) {
            const operation = operationSnap.data() ?? {};
            if (operation.requestFingerprint !== fingerprint)
                throw new https_1.HttpsError('already-exists', 'idempotency key reused for another report update');
            return { ok: true, replayed: true, status: String(operation.nextStatus ?? input.nextStatus), auditId: String(operation.auditId ?? '') };
        }
        if (!reportSnap.exists)
            throw new https_1.HttpsError('not-found', 'report not found');
        const currentStatus = normalizedStatus(input.source, reportSnap.data()?.status);
        if (currentStatus !== input.expectedStatus)
            throw new https_1.HttpsError('failed-precondition', `report status changed to ${currentStatus}`);
        if (!isAllowedReportTransition(input.source, currentStatus, input.nextStatus))
            throw new https_1.HttpsError('failed-precondition', 'report status transition is no longer allowed');
        tx.update(reportRef, { status: input.nextStatus, adminStatusUpdatedAtMs: nowMs, adminStatusUpdatedBy: context.actorUid });
        tx.create(auditRef, {
            ts: new Date(nowMs).toISOString(), actorUid: context.actorUid, role: context.role,
            action: 'report.status.update', entity: { collection: input.source, id: input.reportId },
            before: { status: currentStatus }, after: { status: input.nextStatus }, reason: input.reason, requestId: input.requestId,
        });
        tx.create(operationRef, {
            operationId: input.idempotencyKey, requestFingerprint: fingerprint, nextStatus: input.nextStatus,
            auditId: auditRef.id, createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { ok: true, replayed: false, status: input.nextStatus, auditId: auditRef.id };
    });
});
//# sourceMappingURL=admin_reports_center.js.map