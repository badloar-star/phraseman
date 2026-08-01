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
exports.adminGetPaywallVariantStats = exports.PAYWALL_STATS_PLANS = exports.PAYWALL_STATS_VARIANTS = exports.PAYWALL_STATS_RANGE_DAYS = exports.PAYWALL_STATS_PRICE_WINDOW_DAYS = void 0;
exports.parsePaywallVariantStatsRange = parsePaywallVariantStatsRange;
exports.averagePlanPricesUsdMicros = averagePlanPricesUsdMicros;
exports.buildPaywallVariantStatsReport = buildPaywallVariantStatsReport;
// ════════════════════════════════════════════════════════════════════════════
// admin_paywall_variant_stats.ts — серверная агрегация воронки пейвол-эксперимента
// для админки V2 (раздел «A/B-тест пейволов» → панель «Статистика вариантов»).
//
// Источники и честные ограничения выручки:
//   • paywall_funnel (app/paywall_funnel.ts) знает variant/plan, но НЕ знает сумму
//     покупки (поле price появилось позже и это локализованная строка, не число).
//   • revenuecat_premium_events знает реальные суммы (grossUsdMicros из вебхука
//     RevenueCat), но НЕ знает, какой вариант пейвола видел пользователь.
//   Поэтому выручка по варианту — ОЦЕНКА (revenueKind: 'estimate'):
//   покупки(variant, plan) × средняя наблюдаемая цена плана за PRICE_WINDOW_DAYS
//   дней из production-событий RevenueCat (INITIAL_PURCHASE / NON_RENEWING_PURCHASE,
//   gross > 0, без SANDBOX). Если наблюдений цены нет вообще — 'unavailable',
//   числа не выдумываются. Точная per-variant выручка невозможна без атрибуции
//   variant → transaction, которой в данных нет.
// ════════════════════════════════════════════════════════════════════════════
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const roles_1 = require("./admin/roles");
const permissions_1 = require("./admin/permissions");
const REGION = 'us-central1';
const DAY_MS = 86400000;
const FUNNEL_PAGE_SIZE = 1000;
const FUNNEL_ROW_CAP = 30000;
const PRICE_PAGE_SIZE = 500;
const PRICE_ROW_CAP = 10000;
/** Верхняя граница строк в разрезе по ситуациям — известных контекстов ~35,
 *  запас на случай будущих/переходных значений без раздувания ответа. */
const CONTEXT_ROW_CAP = 200;
/** Окно наблюдения цен не зависит от периода отчёта: цена плана меняется редко,
 *  а за 7 дней покупок может не быть вовсе. */
exports.PAYWALL_STATS_PRICE_WINDOW_DAYS = 90;
exports.PAYWALL_STATS_RANGE_DAYS = [7, 30, 90];
exports.PAYWALL_STATS_VARIANTS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
exports.PAYWALL_STATS_PLANS = ['monthly', 'yearly', 'lifetime'];
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function parsePaywallVariantStatsRange(data) {
    if (data === undefined || data === null)
        return 30;
    if (!isRecord(data))
        throw new https_1.HttpsError('invalid-argument', 'request body must be an object');
    if (data.rangeDays === undefined || data.rangeDays === null)
        return 30;
    if (typeof data.rangeDays !== 'number' || !exports.PAYWALL_STATS_RANGE_DAYS.includes(data.rangeDays)) {
        throw new https_1.HttpsError('invalid-argument', 'rangeDays must be one of 7, 30, 90');
    }
    return data.rangeDays;
}
function resolveRole(token) {
    const claimed = token.adminRole;
    return (0, roles_1.hasAdminRole)(claimed) ? claimed : null;
}
function text(value) {
    return String(value ?? '').trim();
}
/**
 * Средняя наблюдаемая gross-цена (USD-микро) по каждому плану из событий RevenueCat.
 * Берём только origin-покупки (INITIAL_PURCHASE / NON_RENEWING_PURCHASE) с gross > 0
 * из production: RENEWAL — не цена конверсии пейвола, REFUND — отрицательный.
 */
function averagePlanPricesUsdMicros(priceRows) {
    const sums = { monthly: 0, yearly: 0, lifetime: 0 };
    const counts = { monthly: 0, yearly: 0, lifetime: 0 };
    for (const row of priceRows) {
        const eventType = text(row.eventType).toUpperCase();
        if (eventType !== 'INITIAL_PURCHASE' && eventType !== 'NON_RENEWING_PURCHASE')
            continue;
        if (text(row.environment).toUpperCase() === 'SANDBOX')
            continue;
        const cadence = text(row.billingCadence).toLowerCase();
        if (cadence !== 'monthly' && cadence !== 'yearly' && cadence !== 'lifetime')
            continue;
        const gross = Number(row.grossUsdMicros);
        if (!Number.isSafeInteger(gross) || gross <= 0)
            continue;
        sums[cadence] += gross;
        counts[cadence] += 1;
    }
    const avg = (plan) => (counts[plan] > 0 ? Math.round(sums[plan] / counts[plan]) : null);
    return {
        planPricesMicros: { monthly: avg('monthly'), yearly: avg('yearly'), lifetime: avg('lifetime') },
        priceObservations: { monthly: counts.monthly, yearly: counts.yearly, lifetime: counts.lifetime },
    };
}
function normalizeVariant(value) {
    const letter = text(value).toUpperCase();
    return exports.PAYWALL_STATS_VARIANTS.includes(letter) ? letter : null;
}
function normalizePlan(value) {
    const plan = text(value).toLowerCase();
    return exports.PAYWALL_STATS_PLANS.includes(plan) ? plan : 'unknown';
}
function conversionPct(purchases, shown) {
    if (shown <= 0)
        return null;
    return Math.round((purchases / shown) * 1000) / 10;
}
// зачем: 40 символов — тот же лимит, что paywall_funnel.ts кладёт в context
// на клиенте (String(...).slice(0, 40)); держим агрегатор синхронным с ним.
const CONTEXT_MAX_LEN = 40;
function normalizeContext(value) {
    const raw = text(value);
    return (raw || 'generic').slice(0, CONTEXT_MAX_LEN);
}
function emptyContextBucket() {
    const purchasesByVariant = {};
    for (const variant of exports.PAYWALL_STATS_VARIANTS)
        purchasesByVariant[variant] = 0;
    return { shown: 0, cta: 0, purchasesByVariant };
}
function buildPaywallVariantStatsReport(input) {
    const shown = new Map();
    const cta = new Map();
    const purchases = new Map();
    for (const variant of exports.PAYWALL_STATS_VARIANTS) {
        shown.set(variant, 0);
        cta.set(variant, 0);
        purchases.set(variant, { monthly: 0, yearly: 0, lifetime: 0, unknown: 0 });
    }
    const contexts = new Map();
    for (const doc of input.funnelDocs) {
        if (doc.dev === true)
            continue; // дев-сборки не считаем, как и в продуктовой воронке
        const variant = normalizeVariant(doc.variant);
        if (!variant)
            continue; // legacy v1/v2 и мусор не входят в сравнение A–G
        const step = text(doc.step);
        if (step === 'shown')
            shown.set(variant, (shown.get(variant) ?? 0) + 1);
        else if (step === 'cta_click')
            cta.set(variant, (cta.get(variant) ?? 0) + 1);
        else if (step === 'purchase_completed') {
            const bucket = purchases.get(variant);
            bucket[normalizePlan(doc.plan)] += 1;
        }
        // Разрез «какая ситуация показа конвертит лучше» — тот же проход, без
        // повторного скана 30k документов. Не покупки-по-плану — контексту это
        // не нужно, только показ/клик/покупка на ситуацию + кто выиграл.
        if (step === 'shown' || step === 'cta_click' || step === 'purchase_completed') {
            const ctxKey = normalizeContext(doc.context);
            const ctxBucket = contexts.get(ctxKey) ?? emptyContextBucket();
            if (step === 'shown')
                ctxBucket.shown += 1;
            else if (step === 'cta_click')
                ctxBucket.cta += 1;
            else
                ctxBucket.purchasesByVariant[variant] += 1;
            contexts.set(ctxKey, ctxBucket);
        }
    }
    const { planPricesMicros, priceObservations } = averagePlanPricesUsdMicros(input.priceRows);
    const anyPriceKnown = planPricesMicros.monthly != null || planPricesMicros.yearly != null || planPricesMicros.lifetime != null;
    const revenueKind = anyPriceKnown ? 'estimate' : 'unavailable';
    const variants = exports.PAYWALL_STATS_VARIANTS.map((variant) => {
        const byPlan = purchases.get(variant);
        const variantPurchases = byPlan.monthly + byPlan.yearly + byPlan.lifetime + byPlan.unknown;
        const variantShown = shown.get(variant) ?? 0;
        let revenueMicros = 0;
        let unpricedPurchases = byPlan.unknown;
        for (const plan of exports.PAYWALL_STATS_PLANS) {
            const price = planPricesMicros[plan];
            if (price != null)
                revenueMicros += byPlan[plan] * price;
            else
                unpricedPurchases += byPlan[plan];
        }
        return {
            variant,
            shown: variantShown,
            cta: cta.get(variant) ?? 0,
            purchases: variantPurchases,
            conversionPct: conversionPct(variantPurchases, variantShown),
            purchasesByPlan: Object.freeze({ ...byPlan }),
            revenueMicros: revenueKind === 'estimate' ? revenueMicros : null,
            unpricedPurchases,
        };
    });
    const totalsShown = variants.reduce((sum, row) => sum + row.shown, 0);
    const totalsCta = variants.reduce((sum, row) => sum + row.cta, 0);
    const totalsPurchases = variants.reduce((sum, row) => sum + row.purchases, 0);
    const totalsUnpriced = variants.reduce((sum, row) => sum + row.unpricedPurchases, 0);
    const totalsRevenue = revenueKind === 'estimate'
        ? variants.reduce((sum, row) => sum + (row.revenueMicros ?? 0), 0)
        : null;
    // Сортировка по показам (самые частые ситуации сверху) — тот же принцип, что
    // и у вариантов. CONTEXT_ROW_CAP страхует от раздутого ответа, если в базу
    // когда-нибудь попадёт мусорный/произвольный context (лимит 40 символов на
    // клиенте это не исключает — строк может быть много вариантов написания).
    const contextRows = Array.from(contexts.entries())
        .map(([context, bucket]) => {
        const purchasesTotal = exports.PAYWALL_STATS_VARIANTS.reduce((sum, v) => sum + bucket.purchasesByVariant[v], 0);
        return {
            context,
            shown: bucket.shown,
            cta: bucket.cta,
            purchases: purchasesTotal,
            conversionPct: conversionPct(purchasesTotal, bucket.shown),
            purchasesByVariant: Object.freeze({ ...bucket.purchasesByVariant }),
        };
    })
        .sort((a, b) => b.shown - a.shown)
        .slice(0, CONTEXT_ROW_CAP);
    return {
        ok: true,
        rangeDays: input.rangeDays,
        fromMs: input.fromMs,
        generatedAtMs: input.generatedAtMs,
        priceWindowDays: exports.PAYWALL_STATS_PRICE_WINDOW_DAYS,
        truncated: input.truncated === true,
        funnelDocsScanned: input.funnelDocs.length,
        priceRowsScanned: input.priceRowsScanned ?? input.priceRows.length,
        revenue: { kind: revenueKind, currency: 'USD', planPricesMicros, priceObservations },
        variants: Object.freeze(variants),
        contexts: Object.freeze(contextRows),
        totals: {
            shown: totalsShown,
            cta: totalsCta,
            purchases: totalsPurchases,
            conversionPct: conversionPct(totalsPurchases, totalsShown),
            revenueMicros: totalsRevenue,
            unpricedPurchases: totalsUnpriced,
        },
    };
}
async function loadFunnelDocs(db, fromMs) {
    const docs = [];
    let cursor = null;
    let truncated = false;
    while (docs.length < FUNNEL_ROW_CAP) {
        const pageLimit = Math.min(FUNNEL_PAGE_SIZE, FUNNEL_ROW_CAP - docs.length);
        let query = db.collection('paywall_funnel')
            .where('ts', '>=', fromMs)
            .orderBy('ts', 'desc')
            .limit(pageLimit);
        if (cursor)
            query = query.startAfter(cursor);
        const snapshot = await query.get();
        if (snapshot.empty)
            break;
        for (const doc of snapshot.docs)
            docs.push(doc.data());
        cursor = snapshot.docs[snapshot.docs.length - 1];
        if (snapshot.size < pageLimit)
            break;
    }
    if (docs.length >= FUNNEL_ROW_CAP)
        truncated = true;
    return { docs, truncated };
}
async function loadPriceRows(db, priceFromMs) {
    const rows = [];
    let cursor = null;
    let truncated = false;
    while (rows.length < PRICE_ROW_CAP) {
        let query = db.collection('revenuecat_premium_events')
            .where('createdAt', '>=', admin.firestore.Timestamp.fromMillis(priceFromMs))
            .orderBy('createdAt', 'desc')
            .limit(Math.min(PRICE_PAGE_SIZE, PRICE_ROW_CAP - rows.length));
        if (cursor)
            query = query.startAfter(cursor);
        const snapshot = await query.get();
        if (snapshot.empty)
            break;
        for (const doc of snapshot.docs) {
            const data = doc.data();
            rows.push({
                eventType: data.eventType,
                environment: data.environment,
                billingCadence: data.billingCadence,
                grossUsdMicros: data.grossUsdMicros,
            });
        }
        cursor = snapshot.docs[snapshot.docs.length - 1];
        if (snapshot.size < PRICE_PAGE_SIZE)
            break;
    }
    if (rows.length >= PRICE_ROW_CAP)
        truncated = true;
    return { rows, scanned: rows.length, truncated };
}
exports.adminGetPaywallVariantStats = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    if (!request.auth?.token?.admin)
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    const role = resolveRole(request.auth.token);
    if (!role || !(0, permissions_1.hasPermission)(role, 'money.read')) {
        throw new https_1.HttpsError('permission-denied', 'Role cannot read paywall variant revenue stats');
    }
    const rangeDays = parsePaywallVariantStatsRange(request.data);
    const generatedAtMs = Date.now();
    const fromMs = generatedAtMs - rangeDays * DAY_MS;
    const priceFromMs = generatedAtMs - exports.PAYWALL_STATS_PRICE_WINDOW_DAYS * DAY_MS;
    const db = admin.firestore();
    const [funnel, prices] = await Promise.all([
        loadFunnelDocs(db, fromMs),
        loadPriceRows(db, priceFromMs),
    ]);
    return buildPaywallVariantStatsReport({
        funnelDocs: funnel.docs,
        priceRows: prices.rows,
        priceRowsScanned: prices.scanned,
        rangeDays,
        fromMs,
        generatedAtMs,
        truncated: funnel.truncated || prices.truncated,
    });
});
//# sourceMappingURL=admin_paywall_variant_stats.js.map