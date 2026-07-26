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
exports.adminGetDirectorDigest = void 0;
exports.getDirectorDigestResponse = getDirectorDigestResponse;
const admin = __importStar(require("firebase-admin"));
const params_1 = require("firebase-functions/params");
const https_1 = require("firebase-functions/v2/https");
const permissions_1 = require("./admin/permissions");
const admin_analytics_trends_1 = require("./admin_analytics_trends");
const admin_director_digest_narrative_1 = require("./admin_director_digest_narrative");
const callable_options_1 = require("./callable_options");
const explain_provider_1 = require("./explain/explain_provider");
const openai_jobs_config_1 = require("./openai_jobs_config");
const REGION = 'us-central1';
const DAY_MS = 86400000;
const ALLOWED_RANGE_DAYS = Object.freeze([1, 3, 7, 28, 90]);
const OPENAI_API_KEY = (0, params_1.defineSecret)('OPENAI_API_KEY');
const SOURCE_IDS = Object.freeze([
    'paywall',
    'premium_event_time',
    'premium_created_at',
]);
const SOURCE_STATES = Object.freeze([
    'ready',
    'empty',
    'partial',
    'error',
    'unavailable',
]);
const FRESHNESS_STATES = Object.freeze([
    'recent',
    'stale_event_watermark',
    'no_events',
    'unknown',
]);
const METRIC_CONTRACT = Object.freeze({
    'paywall.shown.v1': { source: 'paywall_funnel', unit: 'count' },
    'paywall.cta_click.v1': { source: 'paywall_funnel', unit: 'count' },
    'paywall.trial_started.v1': { source: 'paywall_funnel', unit: 'count' },
    'paywall.purchase_completed.v1': { source: 'paywall_funnel', unit: 'count' },
    'paywall.purchase_failed.v1': { source: 'paywall_funnel', unit: 'count' },
    'paywall.purchase_cancelled.v1': { source: 'paywall_funnel', unit: 'count' },
    'paywall.restore_completed.v1': { source: 'paywall_funnel', unit: 'count' },
    'paywall.close.v1': { source: 'paywall_funnel', unit: 'count' },
    'store.confirmed_trial_start.v1': { source: 'revenuecat_premium_events', unit: 'count' },
    'store.initial_purchase.v1': { source: 'revenuecat_premium_events', unit: 'count' },
    'store.non_renewing_purchase.v1': { source: 'revenuecat_premium_events', unit: 'count' },
    'store.renewal.v1': { source: 'revenuecat_premium_events', unit: 'count' },
    'store.refund.v1': { source: 'revenuecat_premium_events', unit: 'count' },
    'store.billing_issue.v1': { source: 'revenuecat_premium_events', unit: 'count' },
    'store.expiration.v1': { source: 'revenuecat_premium_events', unit: 'count' },
    'store.cancellation.v1': { source: 'revenuecat_premium_events', unit: 'count' },
    'store.uncancellation.v1': { source: 'revenuecat_premium_events', unit: 'count' },
    'store.product_change.v1': { source: 'revenuecat_premium_events', unit: 'count' },
    'store.subscription_extended.v1': { source: 'revenuecat_premium_events', unit: 'count' },
    'revenue.gross_usd_micros.v1': {
        source: 'revenuecat_premium_events',
        unit: 'usd_micros',
    },
});
const DEFAULT_DEPENDENCIES = Object.freeze({
    nowMs: () => Date.now(),
    loadTrends: async (request, nowMs) => (0, admin_analytics_trends_1.executeAdminAnalyticsTrends)(request, nowMs),
    generateNarrative: async (prompt) => {
        const config = await (0, openai_jobs_config_1.resolveJobConfig)(admin.firestore(), 'digest');
        (0, openai_jobs_config_1.assertJobEnabled)(config, 'digest');
        const apiKey = OPENAI_API_KEY.value().trim();
        if (!apiKey)
            throw new https_1.HttpsError('failed-precondition', 'OPENAI_API_KEY not configured');
        const result = await (0, explain_provider_1.openAiChat)({
            apiKey,
            model: config.model,
            messages: [
                { role: 'system', content: prompt.system },
                { role: 'user', content: prompt.user },
            ],
            maxTokens: 4000,
            temperature: 0.2,
            responseFormat: { type: 'json_object' },
        });
        return Object.freeze({ text: result.text });
    },
});
function parseRangeDays(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new https_1.HttpsError('invalid-argument', 'Request must contain rangeDays.');
    }
    const request = data;
    if (Object.keys(request).length !== 1
        || !Object.prototype.hasOwnProperty.call(request, 'rangeDays')
        || !Number.isInteger(request.rangeDays)
        || !ALLOWED_RANGE_DAYS.includes(request.rangeDays)) {
        throw new https_1.HttpsError('invalid-argument', 'rangeDays must be one of 1, 3, 7, 28, or 90.');
    }
    return request.rangeDays;
}
function assertDirectorAccess(auth) {
    if (!auth)
        throw new https_1.HttpsError('unauthenticated', 'Authentication required.');
    const uid = String(auth.uid ?? '').trim();
    const role = auth.token?.adminRole;
    if (!uid
        || (role !== 'owner' && role !== 'admin')
        || !(0, permissions_1.hasClaimedPermission)(auth.token, 'briefing.read')) {
        throw new https_1.HttpsError('permission-denied', 'Owner or admin role with briefing.read permission required.');
    }
}
function startOfUtcDay(nowMs) {
    if (!Number.isSafeInteger(nowMs) || !Number.isFinite(new Date(nowMs).getTime())) {
        throw new https_1.HttpsError('internal', 'Server clock is unavailable.');
    }
    const date = new Date(nowMs);
    date.setUTCHours(0, 0, 0, 0);
    return date.getTime();
}
function period(startMs, endExclusiveMs) {
    return Object.freeze({
        startMs,
        endExclusiveMs,
        startIso: new Date(startMs).toISOString(),
        endExclusiveIso: new Date(endExclusiveMs).toISOString(),
    });
}
function finiteSafeInteger(value) {
    return typeof value === 'number' && Number.isSafeInteger(value) ? value : null;
}
function nullableTimestamp(value) {
    const result = finiteSafeInteger(value);
    return result !== null && Number.isFinite(new Date(result).getTime()) ? result : null;
}
function sourceHealth(rows) {
    return Object.freeze(SOURCE_IDS.map((source) => {
        const row = rows.find((candidate) => candidate.source === source);
        const state = row && SOURCE_STATES.includes(row.state)
            ? row.state
            : 'unavailable';
        const freshness = row && FRESHNESS_STATES.includes(row.freshness)
            ? row.freshness
            : 'unknown';
        return Object.freeze({
            source,
            state,
            truncated: row?.truncated === true,
            uncertaintyStartsAtMs: nullableTimestamp(row?.uncertaintyStartsAtMs),
            latestAtMs: nullableTimestamp(row?.latestAtMs),
            checkedAtMs: nullableTimestamp(row?.checkedAtMs),
            dataAgeMs: finiteSafeInteger(row?.dataAgeMs),
            freshness,
        });
    }));
}
function sumPoints(points) {
    if (!Array.isArray(points) || points.length === 0)
        return null;
    let total = 0;
    for (const point of points) {
        const value = finiteSafeInteger(point?.value);
        if (value === null)
            return null;
        const next = total + value;
        if (!Number.isSafeInteger(next))
            return null;
        total = next;
    }
    return total;
}
function metricAvailability(series, current, previous) {
    if (series.status === 'unavailable' || series.coverage === 'unavailable')
        return 'unavailable';
    if (series.status === 'partial'
        || series.coverage === 'partial'
        || current === null
        || previous === null)
        return 'partial';
    return series.status === 'empty' ? 'empty' : 'ready';
}
function comparison(current, previous, availability) {
    if ((availability !== 'ready' && availability !== 'empty')
        || current === null
        || previous === null) {
        return { absoluteDelta: null, percentDelta: null, direction: 'unavailable' };
    }
    const absoluteDelta = current - previous;
    return {
        absoluteDelta,
        percentDelta: previous === 0
            ? null
            : Math.round((absoluteDelta / previous) * 10000) / 100,
        direction: previous === 0 && current > 0
            ? 'new'
            : absoluteDelta > 0 ? 'up' : absoluteDelta < 0 ? 'down' : 'flat',
    };
}
function safeMetrics(response) {
    const sections = response.sections;
    const series = [
        ...(sections?.behavioralPaywall?.series ?? []),
        ...(sections?.confirmedStore?.series ?? []),
        ...(sections?.grossRevenue?.series ?? []),
    ];
    const seen = new Set();
    return Object.freeze(series.flatMap((item) => {
        const id = typeof item.metricId === 'string' ? item.metricId : '';
        const contract = METRIC_CONTRACT[id];
        if (!contract || seen.has(id))
            return [];
        seen.add(id);
        const current = sumPoints(item.points);
        const previous = sumPoints(item.previousPoints);
        const availability = metricAvailability(item, current, previous);
        const unavailable = availability === 'unavailable';
        const safeCurrent = unavailable ? null : current;
        const safePrevious = unavailable ? null : previous;
        return [Object.freeze({
                id,
                ...contract,
                availability,
                current: safeCurrent,
                previous: safePrevious,
                ...comparison(safeCurrent, safePrevious, availability),
            })];
    }));
}
function responseState(trustedState, health, metrics) {
    if (metrics.length === 0)
        return 'unavailable';
    if (trustedState === 'error'
        || health.length === 0
        || health.every((source) => source.state === 'error' || source.state === 'unavailable'))
        return 'unavailable';
    if (trustedState === 'partial'
        || health.some((source) => (source.state === 'partial'
            || source.state === 'error'
            || source.state === 'unavailable'))
        || metrics.some((metric) => (metric.availability === 'partial' || metric.availability === 'unavailable')))
        return 'partial';
    return trustedState === 'empty' ? 'empty' : 'ready';
}
async function getDirectorDigestResponse(data, auth, dependencies = DEFAULT_DEPENDENCIES) {
    assertDirectorAccess(auth);
    const rangeDays = parseRangeDays(data);
    const generatedAtMs = dependencies.nowMs();
    const currentDayStartMs = startOfUtcDay(generatedAtMs);
    const endExclusiveMs = currentDayStartMs + DAY_MS;
    const startMs = endExclusiveMs - rangeDays * DAY_MS;
    const previousStartMs = startMs - rangeDays * DAY_MS;
    const currentPeriod = period(startMs, endExclusiveMs);
    const previousPeriod = period(previousStartMs, startMs);
    const request = Object.freeze({
        scope: 'overview',
        fromDate: currentPeriod.startIso.slice(0, 10),
        toDate: new Date(currentPeriod.endExclusiveMs - 1).toISOString().slice(0, 10),
        granularity: 'day',
        comparePrevious: true,
        filters: Object.freeze({}),
    });
    const trusted = await dependencies.loadTrends(request, generatedAtMs);
    const health = sourceHealth(trusted.sources ?? []);
    const metrics = safeMetrics(trusted);
    const state = responseState(trusted.state, health, metrics);
    const narrativeInput = Object.freeze({
        generatedAtMs,
        rangeDays,
        state,
        period: Object.freeze({
            startMs: currentPeriod.startMs,
            endExclusiveMs: currentPeriod.endExclusiveMs,
        }),
        previousPeriod: Object.freeze({
            startMs: previousPeriod.startMs,
            endExclusiveMs: previousPeriod.endExclusiveMs,
        }),
        sourceHealth: Object.freeze(health.map((source) => Object.freeze({
            source: source.source,
            state: source.state,
            truncated: source.truncated,
            freshness: source.freshness,
        }))),
        metrics,
    });
    let parsedNarrative = (0, admin_director_digest_narrative_1.parseDirectorDigestNarrative)('', narrativeInput);
    if (dependencies.generateNarrative
        && state !== 'unavailable'
        && state !== 'empty') {
        try {
            const prompt = (0, admin_director_digest_narrative_1.buildDirectorDigestNarrativePrompt)(narrativeInput);
            const generated = await dependencies.generateNarrative({
                system: prompt.system,
                user: prompt.user,
            });
            parsedNarrative = (0, admin_director_digest_narrative_1.parseDirectorDigestNarrative)(generated.text, narrativeInput);
        }
        catch {
            parsedNarrative = (0, admin_director_digest_narrative_1.parseDirectorDigestNarrative)('', narrativeInput);
        }
    }
    return Object.freeze({
        schemaVersion: 3,
        generatedAtMs,
        rangeDays,
        state,
        period: currentPeriod,
        previousPeriod,
        sourceHealth: health,
        metrics,
        narrativeState: parsedNarrative.state,
        narrative: parsedNarrative.narrative,
    });
}
exports.adminGetDirectorDigest = (0, https_1.onCall)({
    region: REGION,
    enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK,
    timeoutSeconds: 120,
    memory: '512MiB',
    maxInstances: 4,
    concurrency: 10,
    secrets: [OPENAI_API_KEY],
}, async (request) => getDirectorDigestResponse(request.data, request.auth));
//# sourceMappingURL=admin_director_digest.js.map