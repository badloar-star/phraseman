"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectDigestForAnalytics = projectDigestForAnalytics;
exports.createAnalyticsExecutionHandler = createAnalyticsExecutionHandler;
const analytics_brief_1 = require("./analytics_brief");
function object(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
function count(value) { return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0; }
function status(value) { return value === 'partial' || value === 'failed' ? value : 'ok'; }
/** Extracts the strict aggregate subset used by the analyst; source text and identifiers are discarded. */
function projectDigestForAnalytics(value) {
    const hasDigest = Boolean(value && typeof value === 'object' && !Array.isArray(value));
    const input = object(value);
    const facts = object(input.facts);
    const reports = object(facts.reports);
    const appErrors = object(facts.appErrors);
    const revenue = object(facts.revenue);
    const sourceCoverage = Array.isArray(input.sourceCoverage) ? input.sourceCoverage.slice(0, 32).map((entry) => {
        const source = object(entry);
        return Object.freeze({ sourceId: typeof source.sourceId === 'string' && /^[a-z_]{3,64}$/.test(source.sourceId) ? source.sourceId : 'unknown', status: status(source.status), rowCount: count(source.rowCount), truncated: source.truncated === true });
    }) : hasDigest ? [] : [Object.freeze({ sourceId: 'digest_snapshot', status: 'failed', rowCount: 0, truncated: false })];
    return Object.freeze({
        reports: Object.freeze({ total: count(reports.total), open: count(reports.open) }),
        appErrors: Object.freeze({ total: count(appErrors.total), critical: count(appErrors.critical) }),
        revenue: Object.freeze({ newPaying: count(revenue.newPaying), refunds: count(revenue.refunds), paywallPurchases: count(revenue.paywallPurchases) }),
        sourceCoverage: Object.freeze(sourceCoverage),
    });
}
async function latestDigest(db) {
    const state = await db.doc('admin_digest_state/owner').get();
    const runId = String(state.data()?.latestRunId || '').trim();
    if (runId) {
        const run = await db.collection('admin_digest_runs').doc(runId).get();
        if (run.exists)
            return run.data();
    }
    const latest = await db.collection('admin_digests').orderBy('generatedAtMs', 'desc').limit(1).get();
    return latest.empty ? null : latest.docs[0].data();
}
/** Reads one existing server-side digest and returns a review-only aggregate recommendation. */
function createAnalyticsExecutionHandler(db) {
    return async (claim) => {
        if (claim.job.scope !== 'analysis_only')
            return null;
        const digest = await latestDigest(db);
        const projection = projectDigestForAnalytics(digest);
        return Object.freeze({ result: (0, analytics_brief_1.buildAnalyticsDecisionBrief)(projection) });
    };
}
//# sourceMappingURL=analytics_execution.js.map