"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregateServerRevenueAnalytics = aggregateServerRevenueAnalytics;
const DAY_MS = 86400000;
const MONEY_EVENT_TYPES = new Set(['INITIAL_PURCHASE', 'NON_RENEWING_PURCHASE', 'RENEWAL', 'REFUND']);
const POSITIVE_EVENT_TYPES = new Set(['INITIAL_PURCHASE', 'NON_RENEWING_PURCHASE', 'RENEWAL']);
const ORIGIN_EVENT_TYPES = new Set(['INITIAL_PURCHASE', 'NON_RENEWING_PURCHASE']);
function text(value) { return String(value ?? '').trim(); }
function int(value) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : null;
}
function timestamp(value) {
    const parsed = int(value);
    return parsed != null && parsed > 0 ? parsed : null;
}
function ratio(numerator, denominator) {
    return denominator > 0 ? numerator / denominator : null;
}
function monthStart(ms) {
    const date = new Date(ms);
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
}
function addUtcMonths(ms, months) {
    const date = new Date(ms);
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1);
}
function normalizeRows(rows, fromMs) {
    const seen = new Set();
    const out = [];
    let maxAt = null;
    rows.forEach((row) => {
        if (text(row.environment).toUpperCase() === 'SANDBOX')
            return;
        const eventId = text(row.eventId);
        if (eventId && seen.has(eventId))
            return;
        if (eventId)
            seen.add(eventId);
        const at = timestamp(row.eventTimestampMs) ?? timestamp(row.createdAtMs);
        if (at == null)
            return;
        if (fromMs != null && at < fromMs)
            return;
        maxAt = Math.max(maxAt ?? 0, at);
        const financialCoverage = text(row.financialCoverage);
        out.push({
            type: text(row.eventType).toUpperCase() || 'UNKNOWN',
            chain: text(row.originalTransactionId) || text(row.transactionId) || null,
            cadence: text(row.billingCadence).toLowerCase(),
            periodType: text(row.periodType).toUpperCase(),
            at,
            expiresAt: timestamp(row.expirationAtMs),
            gross: int(row.grossUsdMicros),
            proceeds: int(row.estimatedProceedsUsdMicros),
            coverage: financialCoverage === 'complete' || financialCoverage === 'partial' ? financialCoverage : 'unavailable',
            trialConversion: typeof row.isTrialConversion === 'boolean' ? row.isTrialConversion : null,
            expirationReason: text(row.expirationReason).toUpperCase(),
        });
    });
    return { rows: out.sort((a, b) => a.at - b.at), maxAt };
}
function aggregateServerRevenueAnalytics(inputRows, options = {}) {
    const normalized = normalizeRows(inputRows, timestamp(options.fromMs) ?? undefined);
    const rows = normalized.rows;
    const watermarkMs = timestamp(options.watermarkMs) ?? normalized.maxAt;
    const financialRows = rows.filter((row) => MONEY_EVENT_TYPES.has(row.type));
    const coveredGross = financialRows.filter((row) => row.gross != null);
    const coveredProceeds = financialRows.filter((row) => row.proceeds != null);
    const positiveRows = financialRows.filter((row) => POSITIVE_EVENT_TYPES.has(row.type) && (row.gross ?? 0) > 0);
    const refundRows = financialRows.filter((row) => row.type === 'REFUND' && (row.gross ?? 0) < 0);
    const grossRevenueUsdMicros = coveredGross.length > 0
        ? coveredGross.reduce((sum, row) => sum + (row.gross ?? 0), 0)
        : null;
    const estimatedProceedsUsdMicros = coveredProceeds.length > 0
        ? coveredProceeds.reduce((sum, row) => sum + (row.proceeds ?? 0), 0)
        : null;
    const positiveGross = positiveRows.reduce((sum, row) => sum + (row.gross ?? 0), 0);
    const refundGrossAbs = Math.abs(refundRows.reduce((sum, row) => sum + (row.gross ?? 0), 0));
    const paidChains = new Set(positiveRows.map((row) => row.chain).filter((chain) => Boolean(chain)));
    const chainRows = new Map();
    rows.forEach((row) => {
        if (!row.chain)
            return;
        const current = chainRows.get(row.chain) ?? [];
        current.push(row);
        chainRows.set(row.chain, current);
    });
    let eligibleTrialChains = 0;
    let convertedTrialChains = 0;
    let immatureTrialChains = 0;
    chainRows.forEach((chain) => {
        const trial = chain.find((row) => ORIGIN_EVENT_TYPES.has(row.type) && row.periodType === 'TRIAL');
        if (!trial)
            return;
        if (trial.expiresAt == null || watermarkMs == null || watermarkMs < trial.expiresAt) {
            immatureTrialChains += 1;
            return;
        }
        eligibleTrialChains += 1;
        if (chain.some((row) => row.at >= trial.at
            && POSITIVE_EVENT_TYPES.has(row.type)
            && ((row.gross ?? 0) > 0 || row.trialConversion === true)))
            convertedTrialChains += 1;
    });
    const chainOrigins = new Map();
    chainRows.forEach((chain, chainId) => {
        const origin = chain.find((row) => ORIGIN_EVENT_TYPES.has(row.type));
        if (origin)
            chainOrigins.set(chainId, origin);
    });
    const leftTruncatedChains = [...chainRows.entries()].filter(([chainId, chain]) => !chainOrigins.has(chainId) && chain.some((row) => MONEY_EVENT_TYPES.has(row.type))).length;
    const monthlyFirstPaid = [...chainRows.entries()]
        .map(([chainId, chain]) => {
        const origin = chainOrigins.get(chainId);
        if (!origin)
            return undefined;
        return chain.find((row) => row.at >= origin.at && row.cadence === 'monthly'
            && POSITIVE_EVENT_TYPES.has(row.type) && (row.gross ?? 0) > 0);
    })
        .filter((row) => Boolean(row));
    const monthlyRenewal = [1, 2, 3].map((monthOffset) => {
        let eligibleChains = 0;
        let renewedChains = 0;
        monthlyFirstPaid.forEach((first) => {
            const cohortMonth = monthStart(first.at);
            const targetStart = addUtcMonths(cohortMonth, monthOffset);
            const targetEnd = addUtcMonths(cohortMonth, monthOffset + 1);
            if (watermarkMs == null || watermarkMs < targetEnd)
                return;
            eligibleChains += 1;
            const chain = first.chain ? chainRows.get(first.chain) ?? [] : [];
            if (chain.some((row) => row.cadence === 'monthly'
                && row.at >= targetStart && row.at < targetEnd
                && POSITIVE_EVENT_TYPES.has(row.type) && (row.gross ?? 0) > 0))
                renewedChains += 1;
        });
        return {
            metricId: `revenue.monthly_renewal_m${monthOffset}.v1`,
            monthOffset,
            eligibleChains,
            renewedChains,
            rate: ratio(renewedChains, eligibleChains),
            maturity: eligibleChains > 0 ? 'mature' : 'no_mature_cohorts',
        };
    });
    const ltv = [30, 60, 90].map((windowDays) => {
        let maturePaidChains = 0;
        let signedGross = 0;
        chainRows.forEach((chain) => {
            const origin = chain.find((row) => ORIGIN_EVENT_TYPES.has(row.type));
            if (!origin)
                return;
            const firstPaid = chain.find((row) => row.at >= origin.at && POSITIVE_EVENT_TYPES.has(row.type) && (row.gross ?? 0) > 0);
            if (!firstPaid || watermarkMs == null)
                return;
            const end = firstPaid.at + windowDays * DAY_MS;
            if (watermarkMs < end)
                return;
            maturePaidChains += 1;
            signedGross += chain
                .filter((row) => MONEY_EVENT_TYPES.has(row.type) && row.at >= firstPaid.at && row.at < end && row.gross != null)
                .reduce((sum, row) => sum + (row.gross ?? 0), 0);
        });
        return {
            metricId: `revenue.subscription_chain_ltv_${windowDays}d_gross_usd.v1`,
            windowDays,
            maturePaidChains,
            ltvGrossUsdMicros: maturePaidChains > 0 ? Math.round(signedGross / maturePaidChains) : null,
            maturity: maturePaidChains > 0 ? 'mature' : 'no_mature_cohorts',
        };
    });
    let realizedChurnChains = 0;
    let voluntaryChurnChains = 0;
    let billingErrorChurnChains = 0;
    chainRows.forEach((chain) => {
        if (!chain.some((row) => ORIGIN_EVENT_TYPES.has(row.type)))
            return;
        const expiration = [...chain].reverse().find((row) => row.type === 'EXPIRATION');
        if (!expiration || chain.some((row) => row.at > expiration.at && row.type === 'RENEWAL' && (row.gross ?? 0) > 0))
            return;
        realizedChurnChains += 1;
        if (expiration.expirationReason === 'UNSUBSCRIBE' || expiration.expirationReason === 'VOLUNTARY')
            voluntaryChurnChains += 1;
        if (expiration.expirationReason.includes('BILLING'))
            billingErrorChurnChains += 1;
    });
    const completeEvents = financialRows.filter((row) => row.coverage === 'complete').length;
    const partialEvents = financialRows.filter((row) => row.coverage === 'partial').length;
    const unavailableEvents = financialRows.filter((row) => row.coverage === 'unavailable').length;
    return {
        metricVersion: 1,
        entity: 'subscription_chain',
        source: 'revenuecat_production_webhook_events',
        status: options.truncated ? 'truncated_not_decision_grade' : 'available_with_coverage_limits',
        watermarkMs,
        coverage: {
            completeEvents,
            partialEvents,
            unavailableEvents,
            legacyFinancialUnavailable: unavailableEvents,
        },
        leftTruncatedChains,
        money: {
            grossRevenueUsdMicros,
            estimatedProceedsUsdMicros,
            finalStoreProceeds: 'unavailable_not_imported',
            positiveTransactionCount: positiveRows.length,
            refundTransactionCount: refundRows.length,
            refundTransactionRate: ratio(refundRows.length, positiveRows.length),
            refundAmountRate: ratio(refundGrossAbs, positiveGross),
            distinctPaidChains: paidChains.size,
            arppuGrossUsdMicros: paidChains.size > 0 && grossRevenueUsdMicros != null
                ? Math.round(grossRevenueUsdMicros / paidChains.size)
                : null,
            arpu: 'unavailable_no_aligned_population_denominator',
        },
        trialToPaid: {
            metricId: 'revenue.trial_to_paid_subscription_chain.v1',
            eligibleTrialChains,
            convertedTrialChains,
            immatureTrialChains,
            rate: ratio(convertedTrialChains, eligibleTrialChains),
        },
        monthlyRenewal,
        ltv,
        churn: { realizedChurnChains, voluntaryChurnChains, billingErrorChurnChains },
    };
}
//# sourceMappingURL=admin_revenue_analytics_core.js.map