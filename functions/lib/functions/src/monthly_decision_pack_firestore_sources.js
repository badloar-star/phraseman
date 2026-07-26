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
exports.buildOperationalAggregateProjection = buildOperationalAggregateProjection;
exports.loadOperationalAggregateProjection = loadOperationalAggregateProjection;
const admin = __importStar(require("firebase-admin"));
const SPECS = [
    { source: 'notifications_referrals', metricId: 'referral_attributions_created', collection: 'referral_attributions', timeField: 'createdAt', timeKind: 'timestamp' },
    { source: 'social_features', metricId: 'community_pack_purchases', collection: 'community_pack_purchases', timeField: 'createdAt', timeKind: 'number' },
    { source: 'social_features', metricId: 'arena_rooms_created', collection: 'arena_rooms_live', timeField: 'createdAt', timeKind: 'number' },
    { source: 'feedback_support', metricId: 'error_reports_created', collection: 'error_reports', timeField: 'createdAtMs', timeKind: 'number' },
    { source: 'feedback_support', metricId: 'user_reports_created', collection: 'user_reports', timeField: 'createdAtMs', timeKind: 'number' },
    { source: 'feedback_support', metricId: 'support_messages_received', collection: 'support_inbox', timeField: 'receivedAtMs', timeKind: 'number' },
    { source: 'feedback_support', metricId: 'website_contacts_received', collection: 'website_contact_inbox', timeField: 'createdAt', timeKind: 'timestamp' },
    { source: 'feedback_support', metricId: 'app_errors_created', collection: 'app_errors', timeField: 'createdAtMs', timeKind: 'number' },
];
function sourceStatus(results) {
    const available = results.filter((result) => result.count != null).length;
    if (available === 0)
        return { status: 'unavailable', reason: 'aggregate_queries_failed' };
    if (available < results.length)
        return { status: 'partial', reason: 'one_or_more_aggregate_queries_failed' };
    return { status: 'available', reason: 'aggregate_counts_without_raw_documents' };
}
function buildOperationalAggregateProjection(month, baseline, generatedAtMs, analysisCutoffMs) {
    const both = [month, baseline];
    const grouped = (source) => both.flatMap((scope) => source === 'notifications_referrals'
        ? scope.notificationsReferrals
        : source === 'social_features'
            ? scope.socialFeatures
            : scope.feedbackSupport);
    const sources = ['notifications_referrals', 'social_features', 'feedback_support'].map((id) => ({
        id,
        ...sourceStatus(grouped(id)),
        analysisCutoffMs,
        queryAsOfMs: generatedAtMs,
        rowCount: grouped(id).reduce((sum, result) => sum + (result.count == null ? 0 : 1), 0),
    }));
    const status = (source) => sources.find((item) => item.id === source)?.status ?? 'unavailable';
    return {
        sources,
        notificationsReferrals: both.flatMap((scope) => scope.notificationsReferrals.flatMap((result) => result.count == null ? [] : [{
                scope: scope.scope,
                surface: 'referrals',
                metric_id: result.metricId,
                value: result.count,
                denominator: result.count,
                status: status('notifications_referrals'),
            }])),
        socialFeatures: both.flatMap((scope) => scope.socialFeatures.flatMap((result) => result.count == null ? [] : [{
                scope: scope.scope,
                feature: result.metricId.startsWith('arena_') ? 'arena' : 'community_packs',
                metric_id: result.metricId,
                value: result.count,
                denominator: result.count,
                status: status('social_features'),
            }])),
        feedbackSupport: both.flatMap((scope) => scope.feedbackSupport.flatMap((result) => result.count == null ? [] : [{
                scope: scope.scope,
                category: result.metricId,
                reports: result.count,
                resolved: null,
                denominator: result.count,
                status: status('feedback_support'),
            }])),
    };
}
async function countSpec(db, spec, startMs, endExclusiveMs) {
    const lower = spec.timeKind === 'timestamp' ? admin.firestore.Timestamp.fromMillis(startMs) : startMs;
    const upper = spec.timeKind === 'timestamp' ? admin.firestore.Timestamp.fromMillis(endExclusiveMs) : endExclusiveMs;
    try {
        const snapshot = await db.collection(spec.collection)
            .where(spec.timeField, '>=', lower)
            .where(spec.timeField, '<', upper)
            .count()
            .get();
        return { metricId: spec.metricId, count: snapshot.data().count };
    }
    catch (error) {
        console.warn(`monthly_decision_pack: aggregate count failed for ${spec.collection}`, error);
        return { metricId: spec.metricId, count: null };
    }
}
async function loadScope(db, scope, startMs, endExclusiveMs) {
    const results = await Promise.all(SPECS.map((spec) => countSpec(db, spec, startMs, endExclusiveMs)));
    const forSource = (source) => SPECS.flatMap((spec, index) => spec.source === source ? [results[index]] : []);
    return {
        scope,
        notificationsReferrals: forSource('notifications_referrals'),
        socialFeatures: forSource('social_features'),
        feedbackSupport: forSource('feedback_support'),
    };
}
async function loadOperationalAggregateProjection(input) {
    const [month, baseline] = await Promise.all([
        loadScope(input.db, 'reporting_month', input.monthStartMs, input.monthEndExclusiveMs),
        loadScope(input.db, 'baseline_12m', input.baselineStartMs, input.baselineEndExclusiveMs),
    ]);
    return buildOperationalAggregateProjection(month, baseline, input.generatedAtMs, input.monthEndExclusiveMs - 1);
}
//# sourceMappingURL=monthly_decision_pack_firestore_sources.js.map