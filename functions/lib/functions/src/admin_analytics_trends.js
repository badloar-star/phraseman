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
exports.adminGetAnalyticsTrends = exports.CACHE_MAX_ENTRIES = exports.CACHE_TTL_MS = exports.EVENT_CAP = void 0;
exports.sourcesForScope = sourcesForScope;
exports.parseAdminAnalyticsTrendsRequest = parseAdminAnalyticsTrendsRequest;
exports.timestampMillis = timestampMillis;
exports.normalizePremiumCreatedAtRows = normalizePremiumCreatedAtRows;
exports.composeAdminAnalyticsTrendsResponse = composeAdminAnalyticsTrendsResponse;
exports._resetAdminAnalyticsTrendsCacheForTests = _resetAdminAnalyticsTrendsCacheForTests;
exports._adminAnalyticsTrendsCacheSizeForTests = _adminAnalyticsTrendsCacheSizeForTests;
exports._adminAnalyticsTrendsInFlightSizeForTests = _adminAnalyticsTrendsInFlightSizeForTests;
exports.executeAdminAnalyticsTrends = executeAdminAnalyticsTrends;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const permissions_1 = require("./admin/permissions");
const admin_analytics_trends_core_1 = require("./admin_analytics_trends_core");
const admin_product_analytics_1 = require("./admin_product_analytics");
const callable_options_1 = require("./callable_options");
const REGION = 'us-central1';
const DEFINITION_VERSION = 'admin_v2_graphical_analytics_v1';
const PAYWALL_RETENTION_MS = 90 * admin_analytics_trends_core_1.DAY_MS;
const SAFE_SOURCE_READ_ERROR = 'source_read_failed';
const SAFE_TRUNCATION_ERROR = 'event_cap_reached';
const NO_LIMITATIONS = Object.freeze([]);
const SOURCE_PARTIAL_LIMITATIONS = Object.freeze(['source_partial']);
const SOURCE_UNAVAILABLE_LIMITATIONS = Object.freeze(['source_unavailable']);
const PAYWALL_RETENTION_LIMITATIONS = Object.freeze(['bucket_outside_paywall_retention']);
const SCOPE_NOT_REQUESTED_LIMITATIONS = Object.freeze(['scope_not_requested']);
const ANALYTICS_EXPORT_PENDING_LIMITATIONS = Object.freeze(['analytics_export_pending']);
exports.EVENT_CAP = 5000;
exports.CACHE_TTL_MS = 10 * 60 * 1000;
exports.CACHE_MAX_ENTRIES = 24;
const responseCache = new Map();
const inFlightResponses = new Map();
let cacheEpoch = 0;
const OVERVIEW_SOURCES = Object.freeze([
    'paywall',
    'premium_event_time',
    'premium_created_at',
]);
const PAYWALL_SOURCES = Object.freeze([
    'paywall',
    'premium_event_time',
    'premium_created_at',
    'shards',
    'purchase_failures',
]);
function sourcesForScope(scope) {
    return scope === 'paywall' ? PAYWALL_SOURCES : OVERVIEW_SOURCES;
}
function parseAdminAnalyticsTrendsRequest(data, nowMs) {
    try {
        const request = (0, admin_analytics_trends_core_1.normalizeTrendRequest)(data, nowMs);
        (0, admin_analytics_trends_core_1.buildTrendWindow)(request);
        return request;
    }
    catch (error) {
        if (error instanceof admin_analytics_trends_core_1.TrendValidationError) {
            throw new https_1.HttpsError('invalid-argument', 'Invalid analytics trends request.');
        }
        throw error;
    }
}
function finiteTimestamp(value) {
    const normalized = Math.floor(value);
    return Number.isFinite(value)
        && Number.isSafeInteger(normalized)
        && Number.isFinite(new Date(normalized).getTime())
        ? normalized
        : null;
}
function timestampMillis(value) {
    try {
        if (typeof value === 'number')
            return finiteTimestamp(value);
        if (value instanceof Date)
            return finiteTimestamp(value.getTime());
        if (!value || typeof value !== 'object')
            return null;
        const candidate = value;
        if (typeof candidate.toMillis === 'function') {
            return finiteTimestamp(candidate.toMillis());
        }
        if (typeof candidate.seconds === 'number') {
            const nanoseconds = typeof candidate.nanoseconds === 'number' ? candidate.nanoseconds : 0;
            return finiteTimestamp(candidate.seconds * 1000 + nanoseconds / 1000000);
        }
        return null;
    }
    catch {
        return null;
    }
}
function numericTimestampMillis(value) {
    return typeof value === 'number' ? timestampMillis(value) : null;
}
function normalizePremiumCreatedAtRows(rows) {
    return Object.freeze(rows.flatMap((row) => {
        if (numericTimestampMillis(row.eventTimestampMs) !== null)
            return [];
        const createdAtMs = timestampMillis(row.createdAt);
        if (createdAtMs === null)
            return [];
        return [Object.freeze({ ...row, eventTimestampMs: createdAtMs, createdAtMs })];
    }));
}
function bucketStart(timestampMs, granularity) {
    return granularity === 'week' ? (0, admin_analytics_trends_core_1.startOfUtcWeek)(timestampMs) : (0, admin_analytics_trends_core_1.startOfUtcDay)(timestampMs);
}
function finalizeBoundedRead(rows, timestampOf, granularity, checkedAtMs, truncated) {
    let latestAtMs = null;
    let lastValidAtMs = null;
    for (const row of rows) {
        const at = timestampOf(row);
        if (at === null)
            continue;
        latestAtMs = Math.max(latestAtMs ?? at, at);
        lastValidAtMs = at;
    }
    return Object.freeze({
        rows: Object.freeze([...rows]),
        checkedAtMs,
        truncated,
        uncertaintyStartsAtMs: truncated && lastValidAtMs !== null
            ? bucketStart(lastValidAtMs, granularity)
            : null,
        latestAtMs,
    });
}
function documentRows(docs) {
    return docs.slice(0, exports.EVENT_CAP).map((doc) => ({ id: doc.id, ...doc.data() }));
}
async function readPaywall(context) {
    const snapshot = await admin.firestore()
        .collection('paywall_funnel')
        .where('ts', '>=', context.fromMs)
        .where('ts', '<', context.endExclusiveMs)
        .orderBy('ts', 'asc')
        .limit(exports.EVENT_CAP + 1)
        .get();
    const rows = documentRows(snapshot.docs);
    return finalizeBoundedRead(rows, (row) => numericTimestampMillis(row.ts), context.granularity, context.checkedAtMs, snapshot.docs.length > exports.EVENT_CAP);
}
async function readPremiumEventTime(context) {
    const snapshot = await admin.firestore()
        .collection('revenuecat_premium_events')
        .where('eventTimestampMs', '>=', context.fromMs)
        .where('eventTimestampMs', '<', context.endExclusiveMs)
        .orderBy('eventTimestampMs', 'asc')
        .limit(exports.EVENT_CAP + 1)
        .get();
    const rows = documentRows(snapshot.docs);
    return finalizeBoundedRead(rows, (row) => numericTimestampMillis(row.eventTimestampMs), context.granularity, context.checkedAtMs, snapshot.docs.length > exports.EVENT_CAP);
}
async function readPremiumCreatedAt(context) {
    const snapshot = await admin.firestore()
        .collection('revenuecat_premium_events')
        .where('createdAt', '>=', admin.firestore.Timestamp.fromMillis(context.fromMs))
        .where('createdAt', '<', admin.firestore.Timestamp.fromMillis(context.endExclusiveMs))
        .orderBy('createdAt', 'asc')
        .limit(exports.EVENT_CAP + 1)
        .get();
    const rows = normalizePremiumCreatedAtRows(documentRows(snapshot.docs));
    return finalizeBoundedRead(rows, (row) => numericTimestampMillis(row.eventTimestampMs), context.granularity, context.checkedAtMs, snapshot.docs.length > exports.EVENT_CAP);
}
async function readShards(context) {
    const snapshot = await admin.firestore()
        .collection('revenuecat_shard_transactions')
        .where('eventTimestampMs', '>=', context.fromMs)
        .where('eventTimestampMs', '<', context.endExclusiveMs)
        .orderBy('eventTimestampMs', 'asc')
        .limit(exports.EVENT_CAP + 1)
        .get();
    const rows = documentRows(snapshot.docs);
    return finalizeBoundedRead(rows, (row) => numericTimestampMillis(row.eventTimestampMs), context.granularity, context.checkedAtMs, snapshot.docs.length > exports.EVENT_CAP);
}
async function readPurchaseFailures(context) {
    const result = await (0, admin_product_analytics_1.loadProductAnalyticsPurchaseFailureRows)({
        startMs: context.currentFromMs,
        endExclusiveMs: context.endExclusiveMs,
        platform: context.platform,
        maximumBytesBilled: '5000000000',
    });
    return Object.freeze({
        rows: Object.freeze([...result.rows]),
        checkedAtMs: context.checkedAtMs,
        exportPending: result.exportPending,
    });
}
const DEFAULT_READERS = Object.freeze({
    paywall: readPaywall,
    premium_event_time: readPremiumEventTime,
    premium_created_at: readPremiumCreatedAt,
    shards: readShards,
    purchase_failures: readPurchaseFailures,
});
function safeFreshness(state, checkedAtMs, latestAtMs) {
    if (state === 'error' || state === 'unavailable') {
        return { dataAgeMs: null, freshness: 'unknown' };
    }
    if (latestAtMs === null) {
        return { dataAgeMs: null, freshness: state === 'empty' ? 'no_events' : 'unknown' };
    }
    const dataAgeMs = Math.max(0, checkedAtMs - latestAtMs);
    return {
        dataAgeMs,
        freshness: dataAgeMs > admin_analytics_trends_core_1.TREND_FRESHNESS_STALE_AFTER_MS
            ? 'stale_event_watermark'
            : 'recent',
    };
}
function sourceHealth(source, settled, attemptedAtMs) {
    const safeAttemptedAtMs = timestampMillis(attemptedAtMs) ?? 0;
    if (settled.status === 'rejected')
        return Object.freeze({
            source,
            state: 'error',
            truncated: false,
            uncertaintyStartsAtMs: null,
            latestAtMs: null,
            checkedAtMs: safeAttemptedAtMs,
            dataAgeMs: null,
            freshness: 'unknown',
            errorCode: SAFE_SOURCE_READ_ERROR,
            limitations: SOURCE_UNAVAILABLE_LIMITATIONS,
        });
    const bounded = settled.value;
    const truncated = bounded.truncated === true;
    const exportPending = bounded.exportPending === true;
    const state = truncated || exportPending
        ? 'partial'
        : bounded.rows.length === 0 ? 'empty' : 'ready';
    const latestAtMs = timestampMillis(bounded.latestAtMs);
    const checkedAtMs = timestampMillis(bounded.checkedAtMs) ?? safeAttemptedAtMs;
    return Object.freeze({
        source,
        state,
        truncated,
        uncertaintyStartsAtMs: timestampMillis(bounded.uncertaintyStartsAtMs),
        latestAtMs,
        checkedAtMs,
        ...safeFreshness(state, checkedAtMs, latestAtMs),
        errorCode: exportPending ? 'analytics_export_pending' : truncated ? SAFE_TRUNCATION_ERROR : null,
        limitations: state === 'partial' ? SOURCE_PARTIAL_LIMITATIONS : NO_LIMITATIONS,
    });
}
function rejectedRead() {
    return { status: 'rejected', reason: null };
}
function fulfilledRows(settled) {
    return settled.status === 'fulfilled' ? settled.value.rows : [];
}
function healthForCore(health) {
    return {
        state: health.state,
        truncated: health.truncated,
        uncertaintyStartsAtMs: health.uncertaintyStartsAtMs,
        latestAtMs: health.latestAtMs,
        checkedAtMs: health.checkedAtMs,
        errorCode: health.errorCode,
    };
}
function combinedPremiumHealth(eventTime, createdAt, attemptedAtMs) {
    const eventHealth = sourceHealth('premium_event_time', eventTime, attemptedAtMs);
    const createdHealth = sourceHealth('premium_created_at', createdAt, attemptedAtMs);
    const bothFailed = eventHealth.state === 'error' && createdHealth.state === 'error';
    const anyFailed = eventHealth.state === 'error' || createdHealth.state === 'error';
    const truncated = eventHealth.truncated || createdHealth.truncated;
    const state = bothFailed
        ? 'error'
        : anyFailed || truncated || eventHealth.state === 'partial' || createdHealth.state === 'partial'
            ? 'partial'
            : eventHealth.state === 'empty' && createdHealth.state === 'empty' ? 'empty' : 'ready';
    const boundaries = [eventHealth, createdHealth]
        .filter((health) => health.truncated)
        .map((health) => health.uncertaintyStartsAtMs);
    const uncertaintyStartsAtMs = anyFailed || boundaries.some((value) => value === null)
        ? null
        : boundaries.reduce((minimum, value) => (value === null ? minimum : Math.min(minimum ?? value, value)), null);
    const latestValues = [eventHealth.latestAtMs, createdHealth.latestAtMs]
        .filter((value) => value !== null);
    const latestAtMs = latestValues.length > 0 ? Math.max(...latestValues) : null;
    const checkedAtMs = Math.max(eventHealth.checkedAtMs, createdHealth.checkedAtMs);
    return Object.freeze({
        source: 'premium_event_time',
        state,
        truncated,
        uncertaintyStartsAtMs,
        latestAtMs,
        checkedAtMs,
        ...safeFreshness(state, checkedAtMs, latestAtMs),
        errorCode: bothFailed ? SAFE_SOURCE_READ_ERROR : anyFailed ? 'premium_branch_unavailable' : truncated ? SAFE_TRUNCATION_ERROR : null,
        limitations: state === 'error'
            ? SOURCE_UNAVAILABLE_LIMITATIONS
            : state === 'partial' ? SOURCE_PARTIAL_LIMITATIONS : NO_LIMITATIONS,
    });
}
function retentionMaskSeries(series, generatedAtMs) {
    const retentionBoundaryMs = generatedAtMs - PAYWALL_RETENTION_MS;
    const outsideRetention = (bucketStart) => (Date.parse(`${bucketStart}T00:00:00.000Z`) < retentionBoundaryMs);
    let currentAffected = false;
    let previousAffected = false;
    const masked = series.map((item) => {
        const currentItemAffected = item.points.some((point) => outsideRetention(point.bucketStart));
        const previousItemAffected = item.previousPoints?.some((point) => outsideRetention(point.bucketStart)) === true;
        currentAffected || (currentAffected = currentItemAffected);
        previousAffected || (previousAffected = previousItemAffected);
        if (!currentItemAffected && !previousItemAffected)
            return item;
        const mask = (points) => (Object.freeze(points.map((point) => (outsideRetention(point.bucketStart)
            ? Object.freeze({ ...point, value: null })
            : point))));
        return Object.freeze({
            ...item,
            status: item.status === 'unavailable' ? item.status : 'partial',
            coverage: item.coverage === 'unavailable' ? item.coverage : 'partial',
            limitations: Object.freeze([...new Set([
                    ...item.limitations,
                    'bucket_outside_paywall_retention',
                ])]),
            points: currentItemAffected ? mask(item.points) : item.points,
            previousPoints: item.previousPoints === null
                ? null
                : previousItemAffected ? mask(item.previousPoints) : item.previousPoints,
        });
    });
    return Object.freeze({
        series: Object.freeze(masked),
        currentAffected,
        previousAffected,
        affected: currentAffected || previousAffected,
    });
}
function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value))
        return value;
    for (const child of Object.values(value))
        deepFreeze(child);
    return Object.freeze(value);
}
function responseState(health, premiumHealth, retentionAffected) {
    const logical = [
        health.find((item) => item.source === 'paywall'),
        premiumHealth,
        health.find((item) => item.source === 'shards'),
        health.find((item) => item.source === 'purchase_failures'),
    ].filter((item) => item !== undefined);
    if (logical.every((item) => item.state === 'error' || item.state === 'unavailable'))
        return 'error';
    if (retentionAffected || logical.some((item) => (item.state === 'error' || item.state === 'unavailable' || item.state === 'partial')))
        return 'partial';
    return logical.every((item) => item.state === 'empty') ? 'empty' : 'ready';
}
function paywallHealthWithRetention(health, retentionAffected) {
    if (!retentionAffected)
        return health;
    return Object.freeze({
        ...health,
        state: health.state === 'error' || health.state === 'unavailable'
            ? health.state
            : 'partial',
        limitations: Object.freeze([...new Set([
                ...health.limitations,
                ...PAYWALL_RETENTION_LIMITATIONS,
            ])]),
    });
}
function frozenBreakdownSection(rows, status, coverage, limitations) {
    return Object.freeze({ rows: Object.freeze([...rows]), status, coverage, limitations });
}
function purchaseFailureSection(scope, settled) {
    if (scope !== 'paywall') {
        return frozenBreakdownSection(Object.freeze([]), 'unavailable', 'unavailable', SCOPE_NOT_REQUESTED_LIMITATIONS);
    }
    if (settled.status === 'rejected') {
        return frozenBreakdownSection(Object.freeze([]), 'unavailable', 'unavailable', SOURCE_UNAVAILABLE_LIMITATIONS);
    }
    if (settled.value.exportPending) {
        return frozenBreakdownSection(Object.freeze([]), 'unavailable', 'unavailable', ANALYTICS_EXPORT_PENDING_LIMITATIONS);
    }
    const rows = (0, admin_analytics_trends_core_1.extractPaywallFailureBreakdown)(settled.value.rows);
    return frozenBreakdownSection(rows, rows.length === 0 ? 'empty' : 'ready', 'complete', NO_LIMITATIONS);
}
function breakdownSections(scope, health, retentionAffected, breakdowns) {
    if (scope !== 'paywall') {
        const unavailable = frozenBreakdownSection(Object.freeze([]), 'unavailable', 'unavailable', SCOPE_NOT_REQUESTED_LIMITATIONS);
        return Object.freeze({ byContext: unavailable, byVariant: unavailable, byPlan: unavailable });
    }
    if (health.state === 'error' || health.state === 'unavailable') {
        const unavailable = frozenBreakdownSection(Object.freeze([]), 'unavailable', 'unavailable', SOURCE_UNAVAILABLE_LIMITATIONS);
        return Object.freeze({ byContext: unavailable, byVariant: unavailable, byPlan: unavailable });
    }
    if (retentionAffected) {
        const partial = frozenBreakdownSection(Object.freeze([]), 'partial', 'partial', PAYWALL_RETENTION_LIMITATIONS);
        return Object.freeze({ byContext: partial, byVariant: partial, byPlan: partial });
    }
    if (health.state === 'partial' || health.truncated) {
        const partial = frozenBreakdownSection(Object.freeze([]), 'partial', 'partial', SOURCE_PARTIAL_LIMITATIONS);
        return Object.freeze({ byContext: partial, byVariant: partial, byPlan: partial });
    }
    const section = (rows) => frozenBreakdownSection(rows, rows.length === 0 ? 'empty' : 'ready', 'complete', NO_LIMITATIONS);
    return Object.freeze({
        byContext: section(breakdowns.context),
        byVariant: section(breakdowns.variant),
        byPlan: section(breakdowns.plan),
    });
}
function buildResponse(request, generatedAtMs, settled) {
    const paywallSettled = settled.paywall;
    const eventSettled = settled.premium_event_time;
    const createdSettled = settled.premium_created_at;
    const shardSettled = settled.shards ?? rejectedRead();
    const failureSettled = settled.purchase_failures ?? rejectedRead();
    const selected = sourcesForScope(request.scope);
    const allSettled = {
        paywall: paywallSettled,
        premium_event_time: eventSettled,
        premium_created_at: createdSettled,
        shards: shardSettled,
        purchase_failures: failureSettled,
    };
    const health = selected.map((source) => sourceHealth(source, allSettled[source], generatedAtMs));
    const paywallHealth = health.find((item) => item.source === 'paywall');
    const premiumHealth = combinedPremiumHealth(eventSettled, createdSettled, generatedAtMs);
    const shardHealth = health.find((item) => item.source === 'shards')
        ?? sourceHealth('shards', rejectedRead(), generatedAtMs);
    const paywallAggregate = (0, admin_analytics_trends_core_1.aggregatePaywallTrends)(fulfilledRows(paywallSettled), request, healthForCore(paywallHealth), { includeBreakdowns: request.scope === 'paywall' });
    const premiumRows = Object.freeze([
        ...fulfilledRows(eventSettled),
        ...fulfilledRows(createdSettled),
    ]);
    const premiumAggregate = (0, admin_analytics_trends_core_1.aggregateRevenueCatTrends)(premiumRows, request, healthForCore(premiumHealth));
    const shardAggregate = request.scope === 'paywall'
        ? (0, admin_analytics_trends_core_1.aggregateShardTrends)(fulfilledRows(shardSettled), request, healthForCore(shardHealth))
        : null;
    const retention = retentionMaskSeries(paywallAggregate.countSeries, generatedAtMs);
    const responseHealth = Object.freeze(health.map((item) => (item.source === 'paywall'
        ? paywallHealthWithRetention(item, retention.affected)
        : item)));
    const behavioralBreakdowns = breakdownSections(request.scope, paywallHealth, retention.currentAffected, paywallAggregate.breakdowns);
    const purchaseFailures = purchaseFailureSection(request.scope, failureSettled);
    const state = responseState(responseHealth, premiumHealth, retention.affected);
    return deepFreeze({
        definitionVersion: DEFINITION_VERSION,
        timezone: 'UTC',
        generatedAtMs,
        request,
        state,
        sources: responseHealth,
        sections: {
            behavioralPaywall: { series: retention.series },
            behavioralBreakdowns,
            confirmedStore: { series: premiumAggregate.countSeries },
            grossRevenue: { series: premiumAggregate.moneySeries },
            shardPurchases: { series: shardAggregate?.countSeries ?? Object.freeze([]) },
            purchaseFailures,
        },
    });
}
function composeAdminAnalyticsTrendsResponse(request, generatedAtMs, settled) {
    return buildResponse(request, generatedAtMs, settled);
}
function cacheKey(request) {
    return JSON.stringify(request);
}
function cachedResponse(key, nowMs) {
    for (const [candidate, entry] of responseCache) {
        if (entry.expiresAtMs <= nowMs)
            responseCache.delete(candidate);
    }
    const entry = responseCache.get(key);
    if (!entry)
        return null;
    responseCache.delete(key);
    responseCache.set(key, entry);
    return entry.value;
}
function storeCachedResponse(key, value, nowMs) {
    const existing = responseCache.get(key);
    if (existing && existing.value.generatedAtMs > value.generatedAtMs)
        return;
    responseCache.delete(key);
    responseCache.set(key, { expiresAtMs: nowMs + exports.CACHE_TTL_MS, value });
    while (responseCache.size > exports.CACHE_MAX_ENTRIES) {
        const oldest = responseCache.keys().next().value;
        if (oldest === undefined)
            break;
        responseCache.delete(oldest);
    }
}
function _resetAdminAnalyticsTrendsCacheForTests() {
    cacheEpoch += 1;
    responseCache.clear();
    inFlightResponses.clear();
}
function _adminAnalyticsTrendsCacheSizeForTests() {
    return responseCache.size;
}
function _adminAnalyticsTrendsInFlightSizeForTests() {
    return inFlightResponses.size;
}
async function executeAdminAnalyticsTrends(data, nowMs, readers = DEFAULT_READERS) {
    const request = parseAdminAnalyticsTrendsRequest(data, nowMs);
    const key = cacheKey(request);
    const cached = cachedResponse(key, nowMs);
    if (cached)
        return cached;
    const existingInFlight = inFlightResponses.get(key);
    if (existingInFlight)
        return existingInFlight;
    if (inFlightResponses.size >= exports.CACHE_MAX_ENTRIES) {
        throw new https_1.HttpsError('resource-exhausted', 'Too many analytics trend requests are in progress.');
    }
    const executionEpoch = cacheEpoch;
    const execution = (async () => {
        const window = (0, admin_analytics_trends_core_1.buildTrendWindow)(request);
        const context = Object.freeze({
            fromMs: window.previous?.fromMs ?? window.current.fromMs,
            currentFromMs: window.current.fromMs,
            endExclusiveMs: window.current.toMs + admin_analytics_trends_core_1.DAY_MS,
            granularity: request.granularity,
            platform: request.filters.platform ?? 'all',
            checkedAtMs: nowMs,
        });
        const selected = sourcesForScope(request.scope);
        const outcomes = await Promise.allSettled(selected.map((source) => readers[source](context)));
        const bySource = {};
        selected.forEach((source, index) => { bySource[source] = outcomes[index]; });
        const settled = {
            paywall: (bySource.paywall ?? rejectedRead()),
            premium_event_time: (bySource.premium_event_time ?? rejectedRead()),
            premium_created_at: (bySource.premium_created_at ?? rejectedRead()),
            ...(request.scope === 'paywall' ? {
                shards: (bySource.shards ?? rejectedRead()),
                purchase_failures: (bySource.purchase_failures ?? rejectedRead()),
            } : {}),
        };
        const response = composeAdminAnalyticsTrendsResponse(request, nowMs, settled);
        if (executionEpoch === cacheEpoch
            && (response.state === 'ready' || response.state === 'empty'))
            storeCachedResponse(key, response, nowMs);
        return response;
    })();
    inFlightResponses.set(key, execution);
    try {
        return await execution;
    }
    finally {
        if (inFlightResponses.get(key) === execution)
            inFlightResponses.delete(key);
    }
}
exports.adminGetAnalyticsTrends = (0, https_1.onCall)({
    region: REGION,
    enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK,
    timeoutSeconds: 60,
    memory: '512MiB',
    maxInstances: 4,
    concurrency: 10,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication required.');
    }
    if (!(0, permissions_1.hasClaimedPermission)(request.auth?.token, 'money.read')) {
        throw new https_1.HttpsError('permission-denied', 'money.read permission required');
    }
    return executeAdminAnalyticsTrends(request.data, Date.now());
});
//# sourceMappingURL=admin_analytics_trends.js.map