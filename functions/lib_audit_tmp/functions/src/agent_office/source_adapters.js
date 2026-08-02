"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAgentOfficeObservationFromInternalSources = runAgentOfficeObservationFromInternalSources;
const https_1 = require("firebase-functions/v2/https");
const contracts_1 = require("./contracts");
const observation_runner_1 = require("./observation_runner");
const MAX_SOURCE_ROWS = 100;
const MAX_SOURCE_AGE_MS = 15 * 60 * 1000;
const MAX_SOURCE_FUTURE_SKEW_MS = 60 * 1000;
// These names mirror the existing, inspected server source contracts. This module
// intentionally provides no live Firestore reader: callers must inject trusted,
// read-only collectors once a shared internal collection seam exists.
const ANALYTICS_SOURCE_NAMES = [
    'users',
    'app_activity',
    'revenuecat_premium_events',
    'revenuecat_shard_transactions',
    'paywall_funnel',
];
const REPORT_SOURCE_NAMES = [
    'error_reports',
    'user_reports',
    'community_pack_reports',
    'explain_report_entries',
    'app_errors',
];
const SAFE_REPORT_CATEGORIES = new Set([
    'audio',
    'bug',
    'content',
    'crash',
    'other',
    'payment',
    'safety',
    'spam',
    'typo',
    'unknown',
]);
const SAFE_REPORT_SCREENS = new Set([
    'home',
    'lesson',
    'profile',
    'quiz',
    'settings',
    'unknown_screen',
]);
function unsafe(source, reason) {
    throw new https_1.HttpsError('failed-precondition', `Agent Office ${source} source receipt is unsafe: ${reason}`);
}
function sourceRecord(value, source) {
    if (!(0, contracts_1.isRecord)(value))
        unsafe(source, 'object required');
    return value;
}
function explicitCount(value, source) {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
        unsafe(source, 'explicit non-negative count required');
    }
    return value;
}
function explicitTimestamp(value, source) {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
        unsafe(source, 'explicit non-negative timestamp required');
    }
    return value;
}
function requireFreshSourceTimestamp(value, source, nowMs) {
    const sourceObservedAtMs = explicitTimestamp(value, source);
    if (sourceObservedAtMs > nowMs && sourceObservedAtMs - nowMs > MAX_SOURCE_FUTURE_SKEW_MS) {
        unsafe(source, 'source timestamp exceeds future skew');
    }
    if (sourceObservedAtMs <= nowMs && nowMs - sourceObservedAtMs > MAX_SOURCE_AGE_MS) {
        unsafe(source, 'source timestamp is stale');
    }
    return sourceObservedAtMs;
}
function requireNoErrorMarkers(value, source) {
    for (const field of ['error', 'errorCode']) {
        const marker = value[field];
        if (marker !== undefined && marker !== null && marker !== '')
            unsafe(source, 'complete receipt has an error marker');
    }
}
function completeReceipt(value, source, expectedSource) {
    const receipt = sourceRecord(value, source);
    if (expectedSource !== undefined && receipt.source !== expectedSource)
        unsafe(source, 'source name mismatch');
    if (receipt.state !== 'ready' && receipt.state !== 'empty')
        unsafe(source, 'source is not complete');
    requireNoErrorMarkers(receipt, source);
    const count = explicitCount(receipt.count, source);
    if (receipt.truncated !== false)
        unsafe(source, 'source is truncated or lacks an explicit truncation receipt');
    if ((receipt.state === 'empty') !== (count === 0))
        unsafe(source, 'state and count disagree');
    return Object.freeze({ state: receipt.state, count });
}
function checkedTotal(values, source) {
    let total = 0;
    for (const value of values) {
        total += value;
        if (!Number.isSafeInteger(total))
            unsafe(source, 'count total is unsafe');
    }
    return total;
}
function validateAggregateState(value, count, source) {
    const expected = count === 0 ? 'empty' : 'ready';
    if (value !== expected)
        unsafe(source, 'aggregate state and count disagree');
    return expected;
}
function adaptAnalytics(value, nowMs) {
    const snapshot = sourceRecord(value, 'analytics');
    requireNoErrorMarkers(snapshot, 'analytics');
    const sourceObservedAtMs = requireFreshSourceTimestamp(snapshot.generatedAtMs, 'analytics', nowMs);
    const sources = sourceRecord(snapshot.sources, 'analytics');
    const sourceKeys = Object.keys(sources).sort();
    const expectedKeys = [...ANALYTICS_SOURCE_NAMES].sort();
    if (sourceKeys.length !== expectedKeys.length || sourceKeys.some((key, index) => key !== expectedKeys[index])) {
        unsafe('analytics', 'exact source set required');
    }
    const receipts = ANALYTICS_SOURCE_NAMES.map((source) => completeReceipt(sources[source], 'analytics'));
    const count = checkedTotal(receipts.map((receipt) => receipt.count), 'analytics');
    const state = validateAggregateState(snapshot.state, count, 'analytics');
    const quality = sourceRecord(snapshot.quality, 'analytics');
    requireNoErrorMarkers(quality, 'analytics');
    if (quality.incomplete !== false || !Array.isArray(quality.errorCodes) || quality.errorCodes.length !== 0) {
        unsafe('analytics', 'quality receipt is incomplete');
    }
    return Object.freeze({
        receipt: Object.freeze({ source: 'analytics', state, count, truncated: false }),
        sourceObservedAtMs,
    });
}
function exactNamedReceipts(value, names, source) {
    if (!Array.isArray(value) || value.length !== names.length)
        unsafe(source, 'exact source health set required');
    const byName = new Map();
    for (const candidate of value) {
        const receipt = sourceRecord(candidate, source);
        if (typeof receipt.source !== 'string' || byName.has(receipt.source))
            unsafe(source, 'unique source names required');
        byName.set(receipt.source, candidate);
    }
    if (byName.size !== names.length || names.some((name) => !byName.has(name)))
        unsafe(source, 'exact source health set required');
    return Object.freeze(names.map((name) => completeReceipt(byName.get(name), source, name)));
}
function safeReportSource(value) {
    if (typeof value !== 'string' || !REPORT_SOURCE_NAMES.includes(value)) {
        unsafe('reports', 'report source is not allowlisted');
    }
    return value;
}
function safeReportMetadata(value, allowlist, fallback) {
    return typeof value === 'string' && allowlist.has(value) ? value : fallback;
}
function adaptReportRows(value) {
    if (!Array.isArray(value) || value.length > MAX_SOURCE_ROWS)
        unsafe('reports', 'bounded rows required');
    return Object.freeze(value.map((candidate) => {
        const row = sourceRecord(candidate, 'reports');
        const context = (0, contracts_1.isRecord)(row.context) ? row.context : {};
        return Object.freeze({
            source: safeReportSource(row.source),
            category: safeReportMetadata(row.category, SAFE_REPORT_CATEGORIES, 'other'),
            screen: safeReportMetadata(context.screen, SAFE_REPORT_SCREENS, 'unknown_screen'),
        });
    }));
}
function adaptReports(value, nowMs) {
    const queue = sourceRecord(value, 'reports');
    if (queue.ok !== true)
        unsafe('reports', 'explicit success receipt required');
    requireNoErrorMarkers(queue, 'reports');
    const sourceObservedAtMs = requireFreshSourceTimestamp(queue.fetchedAtMs, 'reports', nowMs);
    const rows = adaptReportRows(queue.items);
    const count = explicitCount(queue.count, 'reports');
    if (count !== rows.length)
        unsafe('reports', 'count does not match bounded rows');
    const health = exactNamedReceipts(queue.sourceHealth, REPORT_SOURCE_NAMES, 'reports');
    if (checkedTotal(health.map((receipt) => receipt.count), 'reports') !== count)
        unsafe('reports', 'source counts disagree');
    if (!Array.isArray(queue.omittedSources) || queue.omittedSources.length !== 0)
        unsafe('reports', 'omitted sources are unsafe');
    if (queue.state !== 'ready' && queue.state !== 'empty')
        unsafe('reports', 'source is not complete');
    if (queue.state === 'empty' && count !== 0)
        unsafe('reports', 'aggregate state and count disagree');
    const state = count === 0 ? 'empty' : 'ready';
    return Object.freeze({
        receipt: Object.freeze({ source: 'reports', state, count, truncated: false }),
        sourceObservedAtMs,
        rows,
    });
}
function adaptAudit(value, nowMs) {
    const audit = sourceRecord(value, 'audit');
    if (audit.ok !== true)
        unsafe('audit', 'explicit success receipt required');
    requireNoErrorMarkers(audit, 'audit');
    const sourceObservedAtMs = requireFreshSourceTimestamp(audit.fetchedAtMs, 'audit', nowMs);
    if (!Array.isArray(audit.items) || audit.items.length > MAX_SOURCE_ROWS)
        unsafe('audit', 'bounded rows required');
    const count = explicitCount(audit.count, 'audit');
    if (count !== audit.items.length)
        unsafe('audit', 'count does not match bounded rows');
    const health = exactNamedReceipts(audit.sourceHealth, ['admin_log'], 'audit');
    if (health[0].count !== count)
        unsafe('audit', 'source count disagrees');
    const state = validateAggregateState(audit.state, count, 'audit');
    return Object.freeze({
        receipt: Object.freeze({ source: 'audit', state, count, truncated: false }),
        sourceObservedAtMs,
    });
}
function requireCollectors(value) {
    if (!value || typeof value.collectAnalytics !== 'function'
        || typeof value.collectReports !== 'function'
        || typeof value.collectAudit !== 'function') {
        unsafe('collectors', 'all trusted collectors are required');
    }
}
/**
 * The sole server-internal bridge from existing source response shapes to the
 * observation runner. It validates all three receipts before persistence starts.
 */
async function runAgentOfficeObservationFromInternalSources(repository, collectors, now = Date.now) {
    requireCollectors(collectors);
    const observedAtMs = explicitTimestamp(now(), 'clock');
    let collected;
    try {
        collected = await Promise.all([
            collectors.collectAnalytics(),
            collectors.collectReports(),
            collectors.collectAudit(),
        ]);
    }
    catch {
        unsafe('collectors', 'source collection failed');
    }
    const analytics = adaptAnalytics(collected[0], observedAtMs);
    const reports = adaptReports(collected[1], observedAtMs);
    const audit = adaptAudit(collected[2], observedAtMs);
    const validatedSources = Object.freeze([analytics, reports, audit]);
    const input = Object.freeze({
        observedAtMs,
        sourceHealth: Object.freeze(validatedSources.map((source) => Object.freeze({
            ...source.receipt,
            observedAtMs: source.sourceObservedAtMs,
        }))),
        rows: reports.rows,
    });
    return (0, observation_runner_1.runAgentOfficeObservation)(repository, input, () => observedAtMs);
}
//# sourceMappingURL=source_adapters.js.map