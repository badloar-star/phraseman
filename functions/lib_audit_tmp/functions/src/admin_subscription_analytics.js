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
exports.adminSubscriptionAnalytics = void 0;
exports.clampSubscriptionAnalyticsDays = clampSubscriptionAnalyticsDays;
exports.normalizeSubscriptionStore = normalizeSubscriptionStore;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const permissions_1 = require("./admin/permissions");
const admin_subscription_analytics_core_1 = require("./admin_subscription_analytics_core");
const admin_revenue_analytics_core_1 = require("./admin_revenue_analytics_core");
const REGION = 'us-central1';
const PAGE_SIZE = 500;
const DOCUMENT_CAP = 5000;
const SUPPORTED_DAYS = new Set([7, 28, 90, 365]);
const SUPPORTED_STORES = new Set(['APP_STORE', 'PLAY_STORE', 'STRIPE', 'AMAZON', 'PROMOTIONAL']);
function clampSubscriptionAnalyticsDays(value) {
    const parsed = Math.round(Number(value));
    return SUPPORTED_DAYS.has(parsed) ? parsed : 28;
}
function normalizeSubscriptionStore(value) {
    const store = String(value ?? '').trim().toUpperCase();
    return SUPPORTED_STORES.has(store) ? store : 'all';
}
function normalizeProductId(value) {
    return String(value ?? '').trim().slice(0, 120);
}
function firestoreTimestampMs(value) {
    if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
        return value.toMillis();
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
}
exports.adminSubscriptionAnalytics = (0, https_1.onCall)({
    region: REGION,
    enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK,
    timeoutSeconds: 60,
    memory: '512MiB',
}, async (request) => {
    if (!(0, permissions_1.hasClaimedPermission)(request.auth?.token, 'money.read')) {
        throw new https_1.HttpsError('permission-denied', 'money.read permission required');
    }
    const rangeDays = clampSubscriptionAnalyticsDays(request.data?.rangeDays);
    const store = normalizeSubscriptionStore(request.data?.store);
    const productId = normalizeProductId(request.data?.productId);
    const fromMs = Date.now() - rangeDays * 24 * 60 * 60 * 1000;
    const rows = [];
    let cursor = null;
    let reachedCap = false;
    while (rows.length < DOCUMENT_CAP) {
        let query = admin.firestore()
            .collection('revenuecat_premium_events')
            .orderBy('createdAt', 'desc')
            .limit(Math.min(PAGE_SIZE, DOCUMENT_CAP - rows.length));
        if (cursor)
            query = query.startAfter(cursor);
        const snapshot = await query.get();
        if (snapshot.empty)
            break;
        rows.push(...snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                eventId: doc.id,
                ...data,
                createdAtMs: firestoreTimestampMs(data.createdAt),
            };
        }));
        cursor = snapshot.docs[snapshot.docs.length - 1];
        if (snapshot.size < PAGE_SIZE)
            break;
        if (rows.length >= DOCUMENT_CAP)
            reachedCap = true;
    }
    const filtered = rows.filter((row) => {
        if (store !== 'all' && String(row.store ?? '').toUpperCase() !== store)
            return false;
        if (productId && String(row.productId ?? '') !== productId)
            return false;
        return true;
    });
    const metrics = (0, admin_subscription_analytics_core_1.aggregateSubscriptionAnalytics)(filtered, reachedCap, { fromMs });
    const revenue = (0, admin_revenue_analytics_core_1.aggregateServerRevenueAnalytics)(filtered, {
        watermarkMs: metrics.dataThroughMs ?? undefined,
        fromMs,
        truncated: reachedCap,
    });
    return {
        cohortDefinition: 'revenuecat_production_webhook_events',
        rangeDays,
        store,
        productId: productId || 'all',
        metrics,
        revenue,
        limitations: [
            'reasons_available_for_new_webhook_events_only',
            'historical_cancel_reason_not_stored',
            'historical_expiration_reason_not_stored',
            'no_screen_subscription_join',
            'cancellation_is_not_entitlement_end',
            'historical_financial_fields_are_not_backfilled',
            'final_store_proceeds_not_imported',
            'arpu_unavailable_without_aligned_population_denominator',
            'subscription_chain_ltv_is_not_customer_ltv',
        ],
        generatedAtMs: Date.now(),
        dataThroughMs: metrics.dataThroughMs,
    };
});
//# sourceMappingURL=admin_subscription_analytics.js.map