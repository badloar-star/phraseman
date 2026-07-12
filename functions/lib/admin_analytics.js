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
exports.adminGetAnalyticsSnapshot = void 0;
exports.parseAnalyticsRequest = parseAnalyticsRequest;
exports.sourceHealth = sourceHealth;
exports.analyticsSnapshotState = analyticsSnapshotState;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const roles_1 = require("./admin/roles");
const permissions_1 = require("./admin/permissions");
const admin_analytics_core_1 = require("./admin_analytics_core");
const REGION = 'us-central1';
const USER_CAP = 10000;
const USER_PAGE_SIZE = 1000;
const EVENT_CAP = 5000;
function parseAnalyticsRequest(data) {
    const value = typeof data === 'object' && data !== null ? Number(data.rangeDays) : 28;
    if (value !== 7 && value !== 28 && value !== 90)
        throw new https_1.HttpsError('invalid-argument', 'rangeDays must be 7, 28 or 90');
    return Object.freeze({ rangeDays: value });
}
function sourceHealth(source) {
    if (source.errorCode) {
        return { state: 'error', count: 0, truncated: false, latestAtMs: null, errorCode: source.errorCode };
    }
    if (source.truncated) {
        return { state: 'partial', count: source.rows.length, truncated: true, latestAtMs: source.latestAtMs, errorCode: null };
    }
    return {
        state: source.rows.length ? 'ready' : 'empty',
        count: source.rows.length,
        truncated: false,
        latestAtMs: source.latestAtMs,
        errorCode: null,
    };
}
function analyticsSnapshotState(sources) {
    if (sources.length === 0 || sources.every((source) => source.state === 'empty'))
        return 'empty';
    if (sources.every((source) => source.state === 'error'))
        return 'error';
    if (sources.some((source) => source.state === 'error' || source.state === 'partial'))
        return 'partial';
    return 'ready';
}
function roleFromToken(token) {
    return (0, roles_1.hasAdminRole)(token.adminRole) ? token.adminRole : null;
}
function timestampMillis(value) {
    if (typeof value === 'number' && Number.isFinite(value))
        return Math.max(0, value);
    if (typeof value === 'string') {
        const numeric = Number(value);
        if (Number.isFinite(numeric))
            return Math.max(0, numeric);
        const parsed = Date.parse(value);
        return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    }
    if (value && typeof value === 'object') {
        const timestamp = value;
        if (typeof timestamp.toMillis === 'function')
            return Math.max(0, timestamp.toMillis());
        if (typeof timestamp.seconds === 'number')
            return Math.max(0, timestamp.seconds * 1000);
    }
    return 0;
}
function latestTimestamp(rows, fields) {
    let latest = 0;
    for (const row of rows) {
        for (const field of fields)
            latest = Math.max(latest, timestampMillis(row[field]));
    }
    return latest > 0 ? latest : null;
}
function countBy(rows, key) {
    return rows.reduce((result, row) => {
        const value = String(row[key] ?? 'unknown');
        result[value] = (result[value] ?? 0) + 1;
        return result;
    }, {});
}
async function readRows(label, query, cap, timestampFields) {
    try {
        const snapshot = await query.limit(cap + 1).get();
        const truncated = snapshot.size > cap;
        const rows = snapshot.docs.slice(0, cap).map((document) => ({
            id: document.id,
            ...document.data(),
        }));
        return { rows, truncated, latestAtMs: latestTimestamp(rows, timestampFields) };
    }
    catch (error) {
        console.error('admin analytics source read failed', { source: label, errorCode: `${label}_read_failed` });
        return { rows: [], truncated: false, latestAtMs: null, errorCode: `${label}_read_failed` };
    }
}
async function readRowsPaged(label, query, cap, timestampFields) {
    try {
        const collected = [];
        let cursor = null;
        while (collected.length < cap + 1) {
            const pageSize = Math.min(USER_PAGE_SIZE, cap + 1 - collected.length);
            const pageQuery = cursor ? query.startAfter(cursor).limit(pageSize) : query.limit(pageSize);
            const snapshot = await pageQuery.get();
            collected.push(...snapshot.docs);
            if (snapshot.size < pageSize)
                break;
            cursor = snapshot.docs[snapshot.docs.length - 1] ?? null;
            if (!cursor)
                break;
        }
        const truncated = collected.length > cap;
        const rows = collected.slice(0, cap).map((document) => ({
            id: document.id,
            ...document.data(),
        }));
        return { rows, truncated, latestAtMs: latestTimestamp(rows, timestampFields) };
    }
    catch (error) {
        console.error('admin analytics source read failed', { source: label, errorCode: `${label}_read_failed` });
        return { rows: [], truncated: false, latestAtMs: null, errorCode: `${label}_read_failed` };
    }
}
exports.adminGetAnalyticsSnapshot = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK, timeoutSeconds: 60, memory: '512MiB' }, async (request) => {
    if (!request.auth?.token?.admin)
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    const role = roleFromToken(request.auth.token);
    if (!role || !(0, permissions_1.hasPermission)(role, 'money.read'))
        throw new https_1.HttpsError('permission-denied', 'Role cannot read analytics');
    const { rangeDays } = parseAnalyticsRequest(request.data);
    const generatedAtMs = Date.now();
    const toMs = generatedAtMs;
    const fromMs = toMs - rangeDays * 24 * 60 * 60 * 1000;
    const db = admin.firestore();
    const [users, activity, premium, shards, funnel] = await Promise.all([
        readRowsPaged('users', db.collection('users').orderBy(admin.firestore.FieldPath.documentId()), USER_CAP, ['updatedAt', 'last_active_at']),
        readRows('app_activity', db.collection('app_activity').where('createdAtMs', '>=', fromMs).where('createdAtMs', '<=', toMs).orderBy('createdAtMs'), EVENT_CAP, ['createdAtMs']),
        readRows('revenuecat_premium_events', db.collection('revenuecat_premium_events').where('eventTimestampMs', '>=', fromMs).where('eventTimestampMs', '<=', toMs).orderBy('eventTimestampMs'), EVENT_CAP, ['eventTimestampMs', 'createdAt']),
        readRows('revenuecat_shard_transactions', db.collection('revenuecat_shard_transactions').where('eventTimestampMs', '>=', fromMs).where('eventTimestampMs', '<=', toMs).orderBy('eventTimestampMs'), EVENT_CAP, ['eventTimestampMs', 'createdAt']),
        readRows('paywall_funnel', db.collection('paywall_funnel').where('ts', '>=', fromMs).where('ts', '<=', toMs).orderBy('ts'), EVENT_CAP, ['ts']),
    ]);
    const sources = {
        users: sourceHealth(users),
        app_activity: sourceHealth(activity),
        revenuecat_premium_events: sourceHealth(premium),
        revenuecat_shard_transactions: sourceHealth(shards),
        paywall_funnel: sourceHealth(funnel),
    };
    const state = analyticsSnapshotState(Object.values(sources));
    const access = (0, admin_analytics_core_1.aggregateActiveAccess)(users.rows, generatedAtMs);
    const storeActivity = (0, admin_analytics_core_1.aggregateRevenueCatPeriod)(premium.rows);
    const shardActivity = (0, admin_analytics_core_1.aggregateShardPeriod)(shards.rows);
    const funnelSignals = (0, admin_analytics_core_1.aggregateFunnelSignals)(funnel.rows);
    return {
        definitionVersion: admin_analytics_core_1.ANALYTICS_DEFINITION_VERSION,
        generatedAtMs,
        rangeDays,
        fromMs,
        toMs,
        state,
        sources,
        access,
        storeActivity,
        shardActivity,
        funnelSignals,
        appActivity: countBy(activity.rows, 'action'),
        quality: {
            incomplete: Object.values(sources).some((source) => source.state === 'error' || source.state === 'partial'),
            errorCodes: Object.values(sources).flatMap((source) => source.errorCode ? [source.errorCode] : []),
            hiddenUsersExcluded: access.hiddenUsersExcluded,
            revenuecatExcluded: storeActivity.excluded,
            shardExcluded: shardActivity.excluded,
            funnelDevEventsExcluded: funnelSignals.excludedDevEvents,
        },
    };
});
//# sourceMappingURL=admin_analytics.js.map