"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MONEY_LOOKBACK_MS = exports.MAX_MONEY_ROWS_PER_SOURCE = void 0;
exports.fetchMoneySource = fetchMoneySource;
/**
 * Тонкая обёртка над Firestore для департамента «Деньги».
 *
 * зачем: revenuecat_premium_events и paywall_funnel читаются по-разному —
 * у первого числовой eventTimestampMs, у второго строковый day (YYYY-MM-DD),
 * см. admin_daily_digest.ts:18 и :721-744. Один интерфейс наружу, две ветки
 * внутри — так департамент не обязан знать про эту разницу схем.
 */
exports.MAX_MONEY_ROWS_PER_SOURCE = 100;
exports.MONEY_LOOKBACK_MS = 24 * 60 * 60 * 1000;
function text(value) {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
}
function dayString(ms) {
    return new Date(ms).toISOString().slice(0, 10);
}
function packResult(sourceId, rows, truncated, droppedCount, observedAtMs) {
    return Object.freeze({
        sourceId,
        state: rows.length === 0 ? 'empty' : 'ready',
        truncated,
        droppedCount,
        rows: Object.freeze(rows),
        observedAtMs,
    });
}
function errorResult(sourceId, observedAtMs) {
    return Object.freeze({ sourceId, state: 'error', truncated: false, droppedCount: 0, rows: Object.freeze([]), observedAtMs });
}
async function fetchRevenuecatEvents(input) {
    const sinceMs = input.nowMs - exports.MONEY_LOOKBACK_MS;
    try {
        const snapshot = await input.collection
            .where('eventTimestampMs', '>=', sinceMs)
            .orderBy('eventTimestampMs', 'desc')
            .limit(exports.MAX_MONEY_ROWS_PER_SOURCE + 1)
            .get();
        const docs = snapshot.docs;
        const truncated = docs.length > exports.MAX_MONEY_ROWS_PER_SOURCE;
        const kept = truncated ? docs.slice(0, exports.MAX_MONEY_ROWS_PER_SOURCE) : docs;
        const rows = kept.map((snap) => {
            const data = snap.data();
            return Object.freeze({ eventType: text(data.eventType), periodType: text(data.periodType) });
        });
        return packResult('revenuecat_premium_events', rows, truncated, truncated ? docs.length - exports.MAX_MONEY_ROWS_PER_SOURCE : 0, input.nowMs);
    }
    catch {
        return errorResult('revenuecat_premium_events', input.nowMs);
    }
}
/** Тот же паттерн, что admin_daily_digest.ts:721-744: ключ day — строка, окно 24ч перекрывает максимум два дня. */
async function fetchPaywallFunnel(input) {
    const sinceMs = input.nowMs - exports.MONEY_LOOKBACK_MS;
    try {
        const fromDay = dayString(sinceMs);
        const toDay = dayString(input.nowMs);
        const snapshot = await input.collection
            .where('day', '>=', fromDay)
            .where('day', '<=', toDay)
            .limit(exports.MAX_MONEY_ROWS_PER_SOURCE + 1)
            .get();
        const docs = snapshot.docs;
        const truncated = docs.length > exports.MAX_MONEY_ROWS_PER_SOURCE;
        const kept = truncated ? docs.slice(0, exports.MAX_MONEY_ROWS_PER_SOURCE) : docs;
        const rows = kept
            .map((snap) => snap.data())
            .filter((data) => data.dev !== true && data.step === 'purchase_completed')
            .map(() => Object.freeze({ eventType: 'purchase_completed', periodType: null }));
        return packResult('paywall_funnel', rows, truncated, truncated ? docs.length - exports.MAX_MONEY_ROWS_PER_SOURCE : 0, input.nowMs);
    }
    catch {
        return errorResult('paywall_funnel', input.nowMs);
    }
}
async function fetchMoneySource(input) {
    return input.sourceId === 'paywall_funnel' ? fetchPaywallFunnel(input) : fetchRevenuecatEvents(input);
}
//# sourceMappingURL=money_firestore_fetcher.js.map