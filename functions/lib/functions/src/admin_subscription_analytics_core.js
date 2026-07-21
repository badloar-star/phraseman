"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregateSubscriptionAnalytics = aggregateSubscriptionAnalytics;
function text(value) {
    return String(value ?? '').trim();
}
function timestamp(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
}
function reasonCode(value) {
    const reason = text(value).toUpperCase();
    return reason.length <= 64 && /^[A-Z][A-Z0-9_]*$/.test(reason) ? reason : '';
}
function breakdown(counts) {
    return [...counts.entries()]
        .map(([id, events]) => ({ id, events }))
        .sort((a, b) => b.events - a.events || a.id.localeCompare(b.id));
}
function aggregateSubscriptionAnalytics(rows, truncated = false, options = {}) {
    const seenEvents = new Set();
    const transactions = new Set();
    const byProduct = new Map();
    const byStore = new Map();
    const byPeriodType = new Map();
    const byEventType = new Map();
    const byCancellationReason = new Map();
    const byExpirationReason = new Map();
    let purchases = 0;
    let lifetimePurchases = 0;
    let renewals = 0;
    let trialEvents = 0;
    let cancellations = 0;
    let uncancellations = 0;
    let billingIssues = 0;
    let expirations = 0;
    let refunds = 0;
    let productChanges = 0;
    let extensions = 0;
    let transfers = 0;
    let missingEventTimestamp = 0;
    let usedCreatedAtFallback = 0;
    let undatedEvents = 0;
    let dataThroughMs = null;
    let cancellationsWithReason = 0;
    let cancellationReasonUnavailable = 0;
    let expirationsWithReason = 0;
    let expirationReasonUnavailable = 0;
    rows.forEach((row, index) => {
        if (text(row.environment).toUpperCase() === 'SANDBOX')
            return;
        const eventType = text(row.eventType).toUpperCase() || 'UNKNOWN';
        const eventId = text(row.eventId) || `missing:${eventType}:${timestamp(row.eventTimestampMs) ?? 'none'}:${index}`;
        if (seenEvents.has(eventId))
            return;
        seenEvents.add(eventId);
        const eventAtMs = timestamp(row.eventTimestampMs);
        const createdAtMs = timestamp(row.createdAtMs);
        const effectiveEventAtMs = eventAtMs ?? createdAtMs;
        if (effectiveEventAtMs == null) {
            undatedEvents += 1;
            return;
        }
        if (options.fromMs != null && effectiveEventAtMs < options.fromMs)
            return;
        if (eventAtMs == null) {
            missingEventTimestamp += 1;
            usedCreatedAtFallback += 1;
        }
        dataThroughMs = Math.max(dataThroughMs ?? 0, effectiveEventAtMs);
        if (eventType === 'TRANSFER') {
            transfers += 1;
            byEventType.set(eventType, (byEventType.get(eventType) ?? 0) + 1);
            return;
        }
        const productId = text(row.productId) || 'unknown';
        const store = text(row.store).toUpperCase() || 'unknown';
        const periodType = text(row.periodType).toUpperCase() || 'unknown';
        byProduct.set(productId, (byProduct.get(productId) ?? 0) + 1);
        byStore.set(store, (byStore.get(store) ?? 0) + 1);
        byPeriodType.set(periodType, (byPeriodType.get(periodType) ?? 0) + 1);
        byEventType.set(eventType, (byEventType.get(eventType) ?? 0) + 1);
        const transaction = text(row.originalTransactionId) || text(row.transactionId);
        if (transaction)
            transactions.add(transaction);
        if (eventType === 'INITIAL_PURCHASE')
            purchases += 1;
        if (eventType === 'NON_RENEWING_PURCHASE')
            lifetimePurchases += 1;
        if (eventType === 'RENEWAL')
            renewals += 1;
        if (periodType === 'TRIAL' && (eventType === 'INITIAL_PURCHASE' || eventType === 'NON_RENEWING_PURCHASE'))
            trialEvents += 1;
        if (eventType === 'CANCELLATION') {
            cancellations += 1;
            const reason = reasonCode(row.cancelReason);
            if (reason) {
                cancellationsWithReason += 1;
                byCancellationReason.set(reason, (byCancellationReason.get(reason) ?? 0) + 1);
            }
            else
                cancellationReasonUnavailable += 1;
        }
        if (eventType === 'UNCANCELLATION')
            uncancellations += 1;
        if (eventType === 'BILLING_ISSUE')
            billingIssues += 1;
        if (eventType === 'EXPIRATION') {
            expirations += 1;
            const reason = reasonCode(row.expirationReason);
            if (reason) {
                expirationsWithReason += 1;
                byExpirationReason.set(reason, (byExpirationReason.get(reason) ?? 0) + 1);
            }
            else
                expirationReasonUnavailable += 1;
        }
        if (eventType === 'REFUND')
            refunds += 1;
        if (eventType === 'PRODUCT_CHANGE')
            productChanges += 1;
        if (eventType === 'SUBSCRIPTION_EXTENDED')
            extensions += 1;
    });
    return {
        purchases,
        lifetimePurchases,
        renewals,
        trialEvents,
        cancellations,
        uncancellations,
        billingIssues,
        expirations,
        refunds,
        productChanges,
        extensions,
        transfers,
        distinctTransactions: transactions.size,
        byProduct: breakdown(byProduct),
        byStore: breakdown(byStore),
        byPeriodType: breakdown(byPeriodType),
        byEventType: breakdown(byEventType),
        byCancellationReason: breakdown(byCancellationReason),
        byExpirationReason: breakdown(byExpirationReason),
        cancellationsWithReason,
        cancellationReasonUnavailable,
        expirationsWithReason,
        expirationReasonUnavailable,
        dataThroughMs,
        missingTimestampEvents: missingEventTimestamp + undatedEvents,
        missingEventTimestamp,
        usedCreatedAtFallback,
        undatedEvents,
        truncated,
    };
}
//# sourceMappingURL=admin_subscription_analytics_core.js.map