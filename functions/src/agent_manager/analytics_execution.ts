import * as admin from 'firebase-admin';
import { buildAnalyticsDecisionBrief } from './analytics_brief';
import type { ExecutionClaimHandler } from './execution_worker';

type DigestProjection = Readonly<{
  reports: Readonly<{ total: number; open: number }>;
  appErrors: Readonly<{ total: number; critical: number }>;
  revenue: Readonly<{ newPaying: number; refunds: number; paywallPurchases: number }>;
  sourceCoverage: readonly Readonly<{ sourceId: string; status: 'ok' | 'partial' | 'failed'; rowCount: number; truncated: boolean }>[];
}>;

function object(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function count(value: unknown): number { return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0; }
function status(value: unknown): 'ok' | 'partial' | 'failed' { return value === 'partial' || value === 'failed' ? value : 'ok'; }

/** Extracts the strict aggregate subset used by the analyst; source text and identifiers are discarded. */
export function projectDigestForAnalytics(value: unknown): DigestProjection {
  const hasDigest = Boolean(value && typeof value === 'object' && !Array.isArray(value));
  const input = object(value); const facts = object(input.facts);
  const reports = object(facts.reports); const appErrors = object(facts.appErrors); const revenue = object(facts.revenue);
  const sourceCoverage = Array.isArray(input.sourceCoverage) ? input.sourceCoverage.slice(0, 32).map((entry) => {
    const source = object(entry);
    return Object.freeze({ sourceId: typeof source.sourceId === 'string' && /^[a-z_]{3,64}$/.test(source.sourceId) ? source.sourceId : 'unknown', status: status(source.status), rowCount: count(source.rowCount), truncated: source.truncated === true });
  }) : hasDigest ? [] : [Object.freeze({ sourceId: 'digest_snapshot', status: 'failed' as const, rowCount: 0, truncated: false })];
  return Object.freeze({
    reports: Object.freeze({ total: count(reports.total), open: count(reports.open) }),
    appErrors: Object.freeze({ total: count(appErrors.total), critical: count(appErrors.critical) }),
    revenue: Object.freeze({ newPaying: count(revenue.newPaying), refunds: count(revenue.refunds), paywallPurchases: count(revenue.paywallPurchases) }),
    sourceCoverage: Object.freeze(sourceCoverage),
  });
}

async function latestDigest(db: FirebaseFirestore.Firestore): Promise<Record<string, unknown> | null> {
  const state = await db.doc('admin_digest_state/owner').get();
  const runId = String(state.data()?.latestRunId || '').trim();
  if (runId) {
    const run = await db.collection('admin_digest_runs').doc(runId).get();
    if (run.exists) return run.data() as Record<string, unknown>;
  }
  const latest = await db.collection('admin_digests').orderBy('generatedAtMs', 'desc').limit(1).get();
  return latest.empty ? null : latest.docs[0].data() as Record<string, unknown>;
}

/** Reads one existing server-side digest and returns a review-only aggregate recommendation. */
export function createAnalyticsExecutionHandler(db: FirebaseFirestore.Firestore): ExecutionClaimHandler {
  return async (claim) => {
    if (claim.job.scope !== 'analysis_only') return null;
    const digest = await latestDigest(db);
    const projection = projectDigestForAnalytics(digest);
    return Object.freeze({ result: buildAnalyticsDecisionBrief(projection) });
  };
}
