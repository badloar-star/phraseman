"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminGetRevenueCatOverviewMetrics = exports.REVENUECAT_PROJECT_ID = void 0;
exports.parseRevenueCatOverview = parseRevenueCatOverview;
const params_1 = require("firebase-functions/params");
const https_1 = require("firebase-functions/v2/https");
const permissions_1 = require("./admin/permissions");
const roles_1 = require("./admin/roles");
const callable_options_1 = require("./callable_options");
const REGION = 'us-central1';
const CACHE_TTL_MS = 60000;
const REQUEST_TIMEOUT_MS = 8000;
exports.REVENUECAT_PROJECT_ID = 'proj6af7e8d5';
const REVENUECAT_OVERVIEW_URL = `https://api.revenuecat.com/v2/projects/${exports.REVENUECAT_PROJECT_ID}/metrics/overview`;
const REVENUECAT_SECRET_API_KEY = (0, params_1.defineSecret)('REVENUECAT_SECRET_API_KEY');
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function metricRows(payload) {
    if (!isRecord(payload) || !Array.isArray(payload.metrics))
        return [];
    return payload.metrics.filter(isRecord);
}
function findMetric(rows, id) {
    return rows.find((row) => row.id === id) ?? null;
}
function countMetric(rows, id, unavailableMessage) {
    const value = Number(findMetric(rows, id)?.value);
    if (!Number.isSafeInteger(value) || value < 0)
        throw new Error(unavailableMessage);
    return value;
}
function moneyMetric(rows, id) {
    const row = findMetric(rows, id);
    if (!row)
        return null;
    const value = Number(row.value);
    if (!Number.isFinite(value) || value < 0)
        return null;
    return {
        value,
        currency: 'USD',
        period: typeof row.period === 'string' ? row.period : '',
    };
}
function parseRevenueCatOverview(payload) {
    const rows = metricRows(payload);
    return {
        activeSubscriptions: countMetric(rows, 'active_subscriptions', 'RevenueCat active subscription metric is unavailable'),
        activeTrials: countMetric(rows, 'active_trials', 'RevenueCat active trial metric is unavailable'),
        mrr: moneyMetric(rows, 'mrr'),
        revenue: moneyMetric(rows, 'revenue'),
    };
}
function resolveRole(token) {
    return (0, roles_1.hasAdminRole)(token.adminRole) ? token.adminRole : null;
}
let cached = null;
async function loadRevenueCatOverview() {
    const now = Date.now();
    if (cached && now - cached.fetchedAtMs < CACHE_TTL_MS)
        return cached;
    let response;
    try {
        response = await fetch(REVENUECAT_OVERVIEW_URL, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${REVENUECAT_SECRET_API_KEY.value()}`,
            },
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
    }
    catch {
        throw new https_1.HttpsError('unavailable', 'RevenueCat metrics are temporarily unavailable');
    }
    if (!response.ok) {
        console.warn('RevenueCat overview request failed', { status: response.status });
        throw new https_1.HttpsError('unavailable', 'RevenueCat metrics are temporarily unavailable');
    }
    try {
        const metrics = parseRevenueCatOverview(await response.json());
        cached = {
            ok: true,
            source: 'revenuecat_api_v2',
            projectId: exports.REVENUECAT_PROJECT_ID,
            fetchedAtMs: now,
            ...metrics,
        };
        return cached;
    }
    catch {
        throw new https_1.HttpsError('unavailable', 'RevenueCat metrics are temporarily unavailable');
    }
}
exports.adminGetRevenueCatOverviewMetrics = (0, https_1.onCall)({
    region: REGION,
    enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK,
    secrets: [REVENUECAT_SECRET_API_KEY],
    timeoutSeconds: 15,
    memory: '256MiB',
}, async (request) => {
    if (!request.auth?.token?.admin)
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    const role = resolveRole(request.auth.token);
    if (!role || !(0, permissions_1.hasPermission)(role, 'money.read')) {
        throw new https_1.HttpsError('permission-denied', 'Role cannot read RevenueCat metrics');
    }
    return loadRevenueCatOverview();
});
//# sourceMappingURL=admin_revenuecat_overview.js.map