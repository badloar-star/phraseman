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
exports.DECISION_PACK_REVENUECAT_ROW_CAP = void 0;
exports.optionalFiniteNumber = optionalFiniteNumber;
exports.buildDecisionPackAggregateInput = buildDecisionPackAggregateInput;
exports.loadDecisionPackAggregateInput = loadDecisionPackAggregateInput;
exports.isExpectedProductSourceUnavailableError = isExpectedProductSourceUnavailableError;
const admin = __importStar(require("firebase-admin"));
const admin_product_analytics_1 = require("./admin_product_analytics");
const admin_revenue_analytics_core_1 = require("./admin_revenue_analytics_core");
const monthly_decision_pack_firestore_sources_1 = require("./monthly_decision_pack_firestore_sources");
const REVENUECAT_PAGE_SIZE = 500;
exports.DECISION_PACK_REVENUECAT_ROW_CAP = 10000;
function payloads(rows, kind) {
    return rows.filter((row) => row.row_kind === kind).flatMap((row) => {
        try {
            return row.payload ? [JSON.parse(row.payload)] : [];
        }
        catch {
            return [];
        }
    });
}
function first(rows, kind) {
    return payloads(rows, kind)[0] ?? {};
}
function optionalFiniteNumber(value) {
    if (value == null || typeof value === 'boolean' || (typeof value === 'string' && value.trim() === ''))
        return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}
const finite = optionalFiniteNumber;
function record(value) {
    return value && typeof value === 'object' ? value : {};
}
function addExecutiveRows(target, scope, quality) {
    for (const metricId of ['consented_app_instances', 'sessions', 'screen_views']) {
        const value = finite(quality[metricId]);
        if (value != null)
            target.push({ scope, metric_id: metricId, value, denominator: value, status: 'available' });
    }
}
function addProductRows(sections, scope, rows) {
    const quality = first(rows, 'quality');
    addExecutiveRows(sections.executive_kpis, scope, quality);
    for (const row of payloads(rows, 'daily_kpi')) {
        for (const metricId of ['sessions', 'active_consented_app_instances', 'screen_views', 'lesson_starts', 'lesson_completes', 'review_answers']) {
            const value = finite(row[metricId]);
            if (value != null)
                sections.daily_timeseries.push({ scope, date: String(row.local_date ?? ''), metric_id: metricId, value, denominator: value, status: 'available' });
        }
    }
    for (const row of payloads(rows, 'screen')) {
        const instances = finite(row.app_instances);
        sections.feature_adoption.push({ scope, feature: `screen:${String(row.screen_id ?? 'unknown')}`, app_instances: instances, sessions: null, rate: null, denominator: instances, status: 'screen_reach_only' });
    }
    const acquisition = payloads(rows, 'acquisition_channel');
    for (const row of acquisition) {
        const count = finite(row.consented_first_touch_app_instances);
        sections.acquisition_activation.push({ scope, channel: String(row.acquisition_channel ?? row.channel ?? 'unknown'), stage: 'first_touch', app_instances: count, denominator: count, status: 'available' });
    }
    const activation = first(rows, 'activation_summary');
    const firstTouch = finite(activation.cohort_app_instances);
    for (const [stage, key] of [
        ['first_touch', 'cohort_app_instances'], ['onboarding_complete', 'onboarding_completed'],
        ['learning_start', 'learning_started'], ['learning_complete', 'learning_completed'],
        ['return_72h', 'returned_within_72h'], ['return_d7', 'returned_d7'],
    ]) {
        const count = finite(activation[key]);
        if (count != null)
            sections.acquisition_activation.push({ scope, channel: 'all_consent_observed', stage, app_instances: count, rate: firstTouch && firstTouch > 0 ? count / firstTouch : null, denominator: firstTouch, status: 'available' });
    }
    for (const row of payloads(rows, 'true_retention_day')) {
        for (const day of [1, 7, 14, 30]) {
            const eligible = finite(row[`eligible_d${day}`]);
            if (eligible != null && eligible > 0)
                sections.retention_cohorts.push({
                    scope,
                    cohort: String(row.cohort_date ?? ''),
                    day,
                    eligible_instances: eligible,
                    returned_instances: finite(row[`exact_returned_d${day}`]),
                    rate: finite(row[`exact_d${day}_rate`]),
                    denominator: eligible,
                    status: 'mature_exact_calendar_day',
                });
        }
    }
    const review = first(rows, 'review_summary');
    const reviewDenominator = finite(review.consented_app_instances);
    for (const [metricId, key] of [
        ['first_answer_accuracy', 'first_answer_accuracy'], ['delayed_recall_accuracy', 'delayed_recall_accuracy'],
        ['persisted_answers', 'persisted_answers'], ['mastered_transitions', 'mastered_transitions'],
    ]) {
        const value = finite(review[key]);
        if (value != null)
            sections.learning_outcomes.push({ scope, metric_id: metricId, value, denominator: reviewDenominator, status: 'available' });
    }
    for (const row of payloads(rows, 'review_delay')) {
        sections.learning_outcomes.push({ scope, metric_id: 'delayed_recall_accuracy', value: finite(row.accuracy), denominator: finite(row.consented_app_instances), delay_bucket: String(row.delay_bucket ?? ''), status: 'available' });
    }
    for (const row of payloads(rows, 'review_content')) {
        sections.content_diagnostics.push({ scope, diagnostic_group: String(row.diagnostic_group ?? ''), answers: finite(row.answers), accuracy: finite(row.accuracy), denominator: finite(row.consented_app_instances), status: 'available' });
    }
    for (const row of payloads(rows, 'conversion_context')) {
        const impressions = finite(row.views ?? row.impressions);
        const attempts = finite(row.store_starts);
        const purchases = finite(row.purchases);
        sections.paywall_funnels.push({ scope, context: String(row.context ?? ''), source: String(row.source ?? ''), impressions, attempts, purchases, rate: attempts && attempts > 0 && purchases != null ? purchases / attempts : null, denominator: impressions, status: 'available' });
    }
    for (const row of payloads(rows, 'experiment_exposure')) {
        sections.experiments.push({ scope, experiment_id: String(row.experiment_id ?? ''), definition_version: finite(row.definition_version), variant_id: String(row.variant_id ?? ''), exposures: finite(row.exposures), app_instances: finite(row.consented_app_instances), denominator: finite(row.consented_app_instances), status: 'exposure_only_no_causal_outcome' });
    }
    for (const row of payloads(rows, 'release_adoption')) {
        const instances = finite(row.consented_app_instances);
        sections.reliability_releases.push({ scope, app_version: String(row.app_version ?? 'unknown'), build_number: String(row.build_number ?? 'unknown'), platform: String(row.platform ?? 'unknown'), metric_id: 'release_adoption_app_instances', value: instances, denominator: instances, status: 'available' });
    }
    for (const row of payloads(rows, 'operation_failure')) {
        sections.reliability_releases.push({ scope, app_version: String(row.app_version ?? 'unknown'), build_number: String(row.build_number ?? 'unknown'), platform: String(row.platform ?? 'unknown'), metric_id: `operation_failure:${String(row.feature ?? 'unknown')}:${String(row.failure_code ?? 'unknown')}`, value: finite(row.failures), denominator: finite(row.affected_consented_app_instances), status: 'diagnostic_not_crash_rate' });
    }
    for (const [metricId, key] of [
        ['unknown_screen_rate', 'unknown_screen_rate'], ['missing_event_ids', 'missing_event_ids'],
        ['missing_session_ids', 'missing_session_ids'], ['duplicate_events', 'duplicate_events'],
        ['invalid_schema_events', 'invalid_schema_events'], ['first_touch_coverage_rate', 'first_touch_coverage_rate'],
    ]) {
        const value = finite(quality[key]);
        if (value != null)
            sections.data_quality.push({ scope, source: 'firebase_analytics', metric_id: metricId, value, denominator: finite(quality.consented_app_instances), status: 'available' });
    }
}
function addRevenueRows(target, scope, analytics) {
    const money = record(analytics.money);
    const coverage = record(analytics.coverage);
    const status = String(analytics.status ?? 'unavailable');
    const chains = finite(money.distinctPaidChains);
    for (const [metricId, key] of [
        ['gross_revenue_usd', 'grossRevenueUsdMicros'],
        ['estimated_proceeds_usd', 'estimatedProceedsUsdMicros'],
        ['arppu_gross_usd', 'arppuGrossUsdMicros'],
    ]) {
        const value = finite(money[key]);
        if (value != null)
            target.push({ scope, metric_id: metricId, unit: 'usd_micros', currency: 'USD', value: null, value_micros: value, chains, denominator: chains, coverage: JSON.stringify(coverage), status });
    }
    const trial = record(analytics.trialToPaid);
    if (finite(trial.eligibleTrialChains) != null)
        target.push({ scope, metric_id: 'trial_to_paid_rate', unit: 'ratio', currency: '', value: finite(trial.rate), value_micros: null, chains: finite(trial.convertedTrialChains), denominator: finite(trial.eligibleTrialChains), coverage: JSON.stringify(coverage), status });
    for (const row of Array.isArray(analytics.ltv) ? analytics.ltv : []) {
        const item = record(row);
        target.push({ scope, metric_id: String(item.metricId ?? 'subscription_chain_ltv'), unit: 'usd_micros_per_mature_paid_chain', currency: 'USD', value: null, value_micros: finite(item.ltvGrossUsdMicros), chains: finite(item.maturePaidChains), denominator: finite(item.maturePaidChains), coverage: JSON.stringify(coverage), status: String(item.maturity ?? status) });
    }
}
function buildDecisionPackAggregateInput(input) {
    const sections = {
        metric_dictionary: [
            { metric_id: 'consented_app_instances', definition: 'distinct consent-observed app instances', entity: 'app_instance', unit: 'count', coverage: 'analytics_consent_only', decision_grade: true },
            { metric_id: 'sessions', definition: 'distinct governed product session ids', entity: 'session', unit: 'count', coverage: 'analytics_consent_only', decision_grade: true },
            { metric_id: 'screen_views', definition: 'governed product screen view events', entity: 'event', unit: 'count', coverage: 'analytics_consent_only', decision_grade: true },
            { metric_id: 'activation_stage_rate', definition: 'stage completions divided by consent-observed first-touch cohort', entity: 'app_instance', unit: 'ratio', coverage: 'analytics_consent_only', decision_grade: true },
            { metric_id: 'exact_retention', definition: 'activity on the exact mature calendar day after first touch', entity: 'app_instance', unit: 'ratio', coverage: 'analytics_consent_only_mature_cohorts', decision_grade: true },
            { metric_id: 'first_answer_accuracy', definition: 'correct persisted first review answers divided by persisted answers', entity: 'review_answer', unit: 'ratio', coverage: 'analytics_consent_only', decision_grade: true },
            { metric_id: 'delayed_recall_accuracy', definition: 'correct persisted recalls after measured delay of at least 24 hours', entity: 'review_answer', unit: 'ratio', coverage: 'analytics_consent_only', decision_grade: true },
            { metric_id: 'paywall_purchase_rate', definition: 'completed client purchase events divided by store starts within governed context', entity: 'event', unit: 'ratio', coverage: 'analytics_consent_only_not_revenue', decision_grade: true },
            { metric_id: 'gross_revenue_usd', definition: 'signed RevenueCat webhook gross price in USD', entity: 'subscription_event', unit: 'usd_micros', coverage: 'server_webhooks_with_financial_fields', decision_grade: !input.revenueTruncated },
            { metric_id: 'experiment_exposure', definition: 'distinct rendered governed experiment exposures; not a causal outcome', entity: 'exposure', unit: 'count', coverage: 'analytics_consent_only', decision_grade: false },
            { metric_id: 'release_adoption', definition: 'consent-observed app instances by exact app version and build', entity: 'app_instance', unit: 'count', coverage: 'analytics_consent_only', decision_grade: true },
        ],
        executive_kpis: [], daily_timeseries: [], acquisition_activation: [], retention_cohorts: [], learning_outcomes: [],
        content_diagnostics: [], feature_adoption: [], paywall_funnels: [], subscriptions_revenue: [], experiments: [],
        notifications_referrals: [], social_features: [], reliability_releases: [], feedback_support: [], data_quality: [],
    };
    addProductRows(sections, 'reporting_month', input.productMonthRows);
    addProductRows(sections, 'baseline_12m', input.productBaselineRows);
    addRevenueRows(sections.subscriptions_revenue, 'reporting_month', input.revenueMonth);
    addRevenueRows(sections.subscriptions_revenue, 'baseline_12m', input.revenueBaseline);
    const firebaseQuality = first(input.productMonthRows, 'quality');
    const dataThroughMicros = finite(firebaseQuality.data_through_micros);
    const revenueWatermark = finite(input.revenueMonth.watermarkMs);
    return {
        window: input.window,
        generatedAtMs: input.generatedAtMs,
        sources: [
            { id: 'governed_contract', status: 'available' },
            { id: 'firebase_analytics', status: input.productExportPending ? 'unavailable' : 'available', reason: input.productExportPending ? (input.productUnavailableReason ?? 'waiting_for_daily_export') : undefined, dataThroughMs: dataThroughMicros == null ? undefined : Math.round(dataThroughMicros / 1000), analysisCutoffMs: input.window.endExclusiveMs - 1, queryAsOfMs: input.generatedAtMs },
            { id: 'revenuecat_webhooks', status: input.revenueTruncated ? 'truncated_not_decision_grade' : 'available', dataThroughMs: revenueWatermark ?? undefined, reason: revenueWatermark == null ? 'watermark_unavailable_no_observed_events' : undefined, analysisCutoffMs: input.window.endExclusiveMs - 1, queryAsOfMs: input.generatedAtMs, rowCount: input.revenueRows, rowCap: exports.DECISION_PACK_REVENUECAT_ROW_CAP },
            { id: 'store_acquisition', status: 'unavailable', reason: 'not_configured' },
            { id: 'notifications_referrals', status: 'unavailable', reason: 'governed_aggregate_not_connected' },
            { id: 'social_features', status: 'unavailable', reason: 'governed_aggregate_not_connected' },
            { id: 'feedback_support', status: 'unavailable', reason: 'governed_aggregate_not_connected' },
            { id: 'crashlytics', status: 'unavailable', reason: 'aggregate_export_not_connected' },
        ],
        sections,
    };
}
function timestampMs(value) {
    if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function')
        return value.toMillis();
    return finite(value);
}
async function loadRevenueRows(fromMs) {
    const rows = [];
    let cursor = null;
    while (rows.length < exports.DECISION_PACK_REVENUECAT_ROW_CAP) {
        let query = admin.firestore().collection('revenuecat_premium_events')
            .where('createdAt', '>=', admin.firestore.Timestamp.fromMillis(fromMs))
            .orderBy('createdAt', 'desc')
            .limit(Math.min(REVENUECAT_PAGE_SIZE, exports.DECISION_PACK_REVENUECAT_ROW_CAP - rows.length));
        if (cursor)
            query = query.startAfter(cursor);
        const snapshot = await query.get();
        if (snapshot.empty)
            break;
        rows.push(...snapshot.docs.map((doc) => {
            const data = doc.data();
            return { eventId: doc.id, ...data, createdAtMs: timestampMs(data.createdAt) };
        }));
        cursor = snapshot.docs[snapshot.docs.length - 1];
        if (snapshot.size < REVENUECAT_PAGE_SIZE)
            break;
    }
    return { rows, truncated: rows.length >= exports.DECISION_PACK_REVENUECAT_ROW_CAP };
}
async function loadDecisionPackAggregateInput(window, generatedAtMs) {
    const loadProductScope = async (startMs, endExclusiveMs) => {
        try {
            const result = await (0, admin_product_analytics_1.loadProductAnalyticsAggregateRows)({ startMs, endExclusiveMs, reportingTimezone: window.timezone });
            return { ...result, unavailableReason: result.exportPending ? 'waiting_for_daily_export' : undefined };
        }
        catch (error) {
            if (!isExpectedProductSourceUnavailableError(error))
                throw error;
            return { rows: [], exportPending: true, unavailableReason: 'warehouse_not_configured' };
        }
    };
    const [productMonth, productBaseline, revenue, operational] = await Promise.all([
        loadProductScope(window.startMs, window.endExclusiveMs),
        loadProductScope(window.baselineStartMs, window.baselineEndExclusiveMs),
        loadRevenueRows(window.baselineStartMs),
        (0, monthly_decision_pack_firestore_sources_1.loadOperationalAggregateProjection)({
            db: admin.firestore(),
            monthStartMs: window.startMs,
            monthEndExclusiveMs: window.endExclusiveMs,
            baselineStartMs: window.baselineStartMs,
            baselineEndExclusiveMs: window.baselineEndExclusiveMs,
            generatedAtMs,
        }),
    ]);
    const inWindow = (row, start, end) => {
        const at = finite(row.eventTimestampMs) ?? finite(row.createdAtMs);
        return at != null && at >= start && at < end;
    };
    const monthRows = revenue.rows.filter((row) => inWindow(row, window.startMs, window.endExclusiveMs));
    const baselineRows = revenue.rows.filter((row) => inWindow(row, window.baselineStartMs, window.baselineEndExclusiveMs));
    const projected = buildDecisionPackAggregateInput({
        window,
        generatedAtMs,
        productMonthRows: productMonth.rows,
        productBaselineRows: productBaseline.rows,
        productExportPending: productMonth.exportPending || productBaseline.exportPending,
        productUnavailableReason: productMonth.unavailableReason ?? productBaseline.unavailableReason,
        revenueMonth: (0, admin_revenue_analytics_core_1.aggregateServerRevenueAnalytics)(monthRows, { fromMs: window.startMs, truncated: revenue.truncated }),
        revenueBaseline: (0, admin_revenue_analytics_core_1.aggregateServerRevenueAnalytics)(baselineRows, { fromMs: window.baselineStartMs, truncated: revenue.truncated }),
        revenueTruncated: revenue.truncated,
        revenueRows: revenue.rows.length,
    });
    const operationalSources = new Map(operational.sources.map((source) => [source.id, source]));
    const sections = projected.sections ?? {};
    sections.notifications_referrals = operational.notificationsReferrals;
    sections.social_features = operational.socialFeatures;
    sections.feedback_support = operational.feedbackSupport;
    return {
        ...projected,
        sources: projected.sources.map((source) => operationalSources.get(source.id) ?? source),
        sections,
    };
}
function isExpectedProductSourceUnavailableError(error) {
    const candidate = error;
    return String(candidate?.code ?? '').includes('failed-precondition')
        && String(candidate?.message ?? '').toLowerCase().includes('analytics warehouse is not configured');
}
//# sourceMappingURL=monthly_decision_pack_sources.js.map