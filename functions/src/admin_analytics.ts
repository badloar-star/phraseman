import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { hasAdminRole, type AdminRole } from './admin/roles';
import { hasPermission } from './admin/permissions';

const REGION = 'us-central1';
const MAX_ROWS = 5000;

export interface AnalyticsRequest { readonly rangeDays: 7 | 28 | 90; }

export function parseAnalyticsRequest(data: unknown): AnalyticsRequest {
  const value = typeof data === 'object' && data !== null ? Number((data as Record<string, unknown>).rangeDays) : 28;
  if (value !== 7 && value !== 28 && value !== 90) throw new HttpsError('invalid-argument', 'rangeDays must be 7, 28 or 90');
  return Object.freeze({ rangeDays: value });
}

function roleFromToken(token: Record<string, unknown>): AdminRole | null {
  return hasAdminRole(token.adminRole) ? token.adminRole : null;
}

function millis(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') { const parsed = Date.parse(value); return Number.isFinite(parsed) ? parsed : 0; }
  if (value && typeof value === 'object') {
    const timestamp = value as { toMillis?: () => number; seconds?: number };
    if (typeof timestamp.toMillis === 'function') return timestamp.toMillis();
    if (typeof timestamp.seconds === 'number') return timestamp.seconds * 1000;
  }
  return 0;
}

function countBy(rows: readonly Record<string, unknown>[], key: string): Record<string, number> {
  return rows.reduce<Record<string, number>>((result, row) => {
    const value = String(row[key] ?? 'unknown');
    result[value] = (result[value] ?? 0) + 1;
    return result;
  }, {});
}

export const adminGetAnalyticsSnapshot = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    if (!request.auth?.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
    const role = roleFromToken(request.auth.token as Record<string, unknown>);
    if (!role || !hasPermission(role, 'money.read')) throw new HttpsError('permission-denied', 'Role cannot read analytics');
    const { rangeDays } = parseAnalyticsRequest(request.data);
    const toMs = Date.now();
    const fromMs = toMs - rangeDays * 24 * 60 * 60 * 1000;
    const db = admin.firestore();
    const sourceResults = await Promise.all([
      readRows('users', db.collection('users').limit(MAX_ROWS)),
      readRows('app_activity', db.collection('app_activity').where('createdAtMs', '>=', fromMs).where('createdAtMs', '<=', toMs).orderBy('createdAtMs').limit(MAX_ROWS)),
      readRows('revenuecat_premium_events', db.collection('revenuecat_premium_events').where('eventTimestampMs', '>=', fromMs).where('eventTimestampMs', '<=', toMs).orderBy('eventTimestampMs').limit(MAX_ROWS)),
      readRows('paywall_funnel', db.collection('paywall_funnel').where('ts', '>=', fromMs).where('ts', '<=', toMs).orderBy('ts').limit(MAX_ROWS)),
    ]);
    const [users, activity, premium, funnel] = sourceResults;
    const errors = sourceResults.flatMap((source) => source.error ? [source.error] : []);
    const paying = users.rows.filter((row) => {
      const progress = row.progress && typeof row.progress === 'object' ? row.progress as Record<string, unknown> : {};
      return ['monthly', 'yearly', 'annual', 'lifetime'].includes(String(progress.premium_plan ?? '').toLowerCase());
    }).length;
    return {
      rangeDays,
      fromMs,
      toMs,
      state: errors.length ? 'partial' : 'ready',
      sources: { users: sourceState(users), app_activity: sourceState(activity), revenuecat_premium_events: sourceState(premium), paywall_funnel: sourceState(funnel) },
      metrics: {
        loadedUsers: users.rows.length,
        payingNow: paying,
        appActivity: countBy(activity.rows, 'action'),
        revenuecat: countBy(premium.rows, 'eventType'),
        funnel: countBy(funnel.rows, 'step'),
      },
      errors,
      freshness: new Date(toMs).toISOString(),
    };
  },
);

async function readRows(label: string, query: FirebaseFirestore.Query): Promise<{ rows: Record<string, unknown>[]; error?: string; truncated: boolean }> {
  try {
    const snapshot = await query.get();
    return { rows: snapshot.docs.map((doc) => doc.data() as Record<string, unknown>), truncated: snapshot.size >= MAX_ROWS };
  } catch (error) {
    return { rows: [], error: `${label}: ${error instanceof Error ? error.message : String(error)}`, truncated: false };
  }
}

function sourceState(source: { rows: Record<string, unknown>[]; error?: string; truncated: boolean }): { state: 'ready' | 'empty' | 'error' | 'partial'; count: number; truncated: boolean } {
  if (source.error) return { state: 'error', count: 0, truncated: false };
  if (source.truncated) return { state: 'partial', count: source.rows.length, truncated: true };
  return { state: source.rows.length ? 'ready' : 'empty', count: source.rows.length, truncated: false };
}
