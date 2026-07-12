import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { hasAdminRole, type AdminRole } from './admin/roles';
import { hasPermission } from './admin/permissions';
import {
  ANALYTICS_DEFINITION_VERSION,
  aggregateActiveAccess,
  aggregateFunnelSignals,
  aggregateRevenueCatPeriod,
  aggregateShardPeriod,
  type AnalyticsUserRow,
  type FunnelEventRow,
  type RevenueCatEventRow,
  type ShardTransactionRow,
} from './admin_analytics_core';

if (admin.apps.length === 0) admin.initializeApp();

const REGION = 'us-central1';
const USER_CAP = 10_000;
const USER_PAGE_SIZE = 1_000;
const EVENT_CAP = 5_000;

export interface AnalyticsRequest { readonly rangeDays: 7 | 28 | 90; }

type SourceState = 'ready' | 'empty' | 'error' | 'partial';
type SnapshotState = 'ready' | 'empty' | 'error' | 'partial';

interface ReadResult {
  readonly rows: Record<string, unknown>[];
  readonly truncated: boolean;
  readonly latestAtMs: number | null;
  readonly errorCode?: string;
}

export interface AnalyticsSourceHealth {
  readonly state: SourceState;
  readonly count: number;
  readonly truncated: boolean;
  readonly latestAtMs: number | null;
  readonly errorCode: string | null;
}

export function parseAnalyticsRequest(data: unknown): AnalyticsRequest {
  const value = typeof data === 'object' && data !== null ? Number((data as Record<string, unknown>).rangeDays) : 28;
  if (value !== 7 && value !== 28 && value !== 90) throw new HttpsError('invalid-argument', 'rangeDays must be 7, 28 or 90');
  return Object.freeze({ rangeDays: value });
}

export function sourceHealth(source: ReadResult): AnalyticsSourceHealth {
  if (source.errorCode) {
    return { state: 'error', count: 0, truncated: false, latestAtMs: null, errorCode: source.errorCode };
  }
  if (source.truncated) {
    return { state: 'partial', count: source.rows.length, truncated: true, latestAtMs: source.latestAtMs, errorCode: null };
  }
  return {
    state: source.rows.length ? 'ready' : 'empty',
    count: source.rows.length,
    truncated: false,
    latestAtMs: source.latestAtMs,
    errorCode: null,
  };
}

export function analyticsSnapshotState(sources: readonly { state: SourceState }[]): SnapshotState {
  if (sources.length === 0 || sources.every((source) => source.state === 'empty')) return 'empty';
  if (sources.every((source) => source.state === 'error')) return 'error';
  if (sources.some((source) => source.state === 'error' || source.state === 'partial')) return 'partial';
  return 'ready';
}

function roleFromToken(token: Record<string, unknown>): AdminRole | null {
  return hasAdminRole(token.adminRole) ? token.adminRole : null;
}

function timestampMillis(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, value);
  if (typeof value === 'string') {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return Math.max(0, numeric);
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }
  if (value && typeof value === 'object') {
    const timestamp = value as { toMillis?: () => number; seconds?: number };
    if (typeof timestamp.toMillis === 'function') return Math.max(0, timestamp.toMillis());
    if (typeof timestamp.seconds === 'number') return Math.max(0, timestamp.seconds * 1000);
  }
  return 0;
}

function latestTimestamp(rows: readonly Record<string, unknown>[], fields: readonly string[]): number | null {
  let latest = 0;
  for (const row of rows) {
    for (const field of fields) latest = Math.max(latest, timestampMillis(row[field]));
  }
  return latest > 0 ? latest : null;
}

function countBy(rows: readonly Record<string, unknown>[], key: string): Record<string, number> {
  return rows.reduce<Record<string, number>>((result, row) => {
    const value = String(row[key] ?? 'unknown');
    result[value] = (result[value] ?? 0) + 1;
    return result;
  }, {});
}

async function readRows(
  label: string,
  query: FirebaseFirestore.Query,
  cap: number,
  timestampFields: readonly string[],
): Promise<ReadResult> {
  try {
    const snapshot = await query.limit(cap + 1).get();
    const truncated = snapshot.size > cap;
    const rows = snapshot.docs.slice(0, cap).map((document) => ({
      id: document.id,
      ...(document.data() as Record<string, unknown>),
    }));
    return { rows, truncated, latestAtMs: latestTimestamp(rows, timestampFields) };
  } catch (error) {
    console.error('admin analytics source read failed', { source: label, errorCode: `${label}_read_failed` });
    return { rows: [], truncated: false, latestAtMs: null, errorCode: `${label}_read_failed` };
  }
}

async function readRowsPaged(
  label: string,
  query: FirebaseFirestore.Query,
  cap: number,
  timestampFields: readonly string[],
): Promise<ReadResult> {
  try {
    const collected: FirebaseFirestore.QueryDocumentSnapshot[] = [];
    let cursor: FirebaseFirestore.QueryDocumentSnapshot | null = null;
    while (collected.length < cap + 1) {
      const pageSize = Math.min(USER_PAGE_SIZE, cap + 1 - collected.length);
      const pageQuery: FirebaseFirestore.Query = cursor ? query.startAfter(cursor).limit(pageSize) : query.limit(pageSize);
      const snapshot: FirebaseFirestore.QuerySnapshot = await pageQuery.get();
      collected.push(...snapshot.docs);
      if (snapshot.size < pageSize) break;
      cursor = snapshot.docs[snapshot.docs.length - 1] ?? null;
      if (!cursor) break;
    }
    const truncated = collected.length > cap;
    const rows = collected.slice(0, cap).map((document) => ({
      id: document.id,
      ...(document.data() as Record<string, unknown>),
    }));
    return { rows, truncated, latestAtMs: latestTimestamp(rows, timestampFields) };
  } catch (error) {
    console.error('admin analytics source read failed', { source: label, errorCode: `${label}_read_failed` });
    return { rows: [], truncated: false, latestAtMs: null, errorCode: `${label}_read_failed` };
  }
}

export const adminGetAnalyticsSnapshot = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds: 60, memory: '512MiB' },
  async (request) => {
    if (!request.auth?.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
    const role = roleFromToken(request.auth.token as Record<string, unknown>);
    if (!role || !hasPermission(role, 'money.read')) throw new HttpsError('permission-denied', 'Role cannot read analytics');

    const { rangeDays } = parseAnalyticsRequest(request.data);
    const generatedAtMs = Date.now();
    const toMs = generatedAtMs;
    const fromMs = toMs - rangeDays * 24 * 60 * 60 * 1000;
    const db = admin.firestore();

    const [users, activity, premium, shards, funnel] = await Promise.all([
      readRowsPaged('users', db.collection('users').orderBy(admin.firestore.FieldPath.documentId()), USER_CAP, ['updatedAt', 'last_active_at']),
      readRows('app_activity', db.collection('app_activity').where('createdAtMs', '>=', fromMs).where('createdAtMs', '<=', toMs).orderBy('createdAtMs'), EVENT_CAP, ['createdAtMs']),
      readRows('revenuecat_premium_events', db.collection('revenuecat_premium_events').where('eventTimestampMs', '>=', fromMs).where('eventTimestampMs', '<=', toMs).orderBy('eventTimestampMs'), EVENT_CAP, ['eventTimestampMs', 'createdAt']),
      readRows('revenuecat_shard_transactions', db.collection('revenuecat_shard_transactions').where('eventTimestampMs', '>=', fromMs).where('eventTimestampMs', '<=', toMs).orderBy('eventTimestampMs'), EVENT_CAP, ['eventTimestampMs', 'createdAt']),
      readRows('paywall_funnel', db.collection('paywall_funnel').where('ts', '>=', fromMs).where('ts', '<=', toMs).orderBy('ts'), EVENT_CAP, ['ts']),
    ]);

    const sources = {
      users: sourceHealth(users),
      app_activity: sourceHealth(activity),
      revenuecat_premium_events: sourceHealth(premium),
      revenuecat_shard_transactions: sourceHealth(shards),
      paywall_funnel: sourceHealth(funnel),
    };
    const state = analyticsSnapshotState(Object.values(sources));
    const access = aggregateActiveAccess(users.rows as unknown as AnalyticsUserRow[], generatedAtMs);
    const storeActivity = aggregateRevenueCatPeriod(premium.rows as unknown as RevenueCatEventRow[]);
    const shardActivity = aggregateShardPeriod(shards.rows as unknown as ShardTransactionRow[]);
    const funnelSignals = aggregateFunnelSignals(funnel.rows as unknown as FunnelEventRow[]);

    return {
      definitionVersion: ANALYTICS_DEFINITION_VERSION,
      generatedAtMs,
      rangeDays,
      fromMs,
      toMs,
      state,
      sources,
      access,
      storeActivity,
      shardActivity,
      funnelSignals,
      appActivity: countBy(activity.rows, 'action'),
      quality: {
        incomplete: Object.values(sources).some((source) => source.state === 'error' || source.state === 'partial'),
        errorCodes: Object.values(sources).flatMap((source) => source.errorCode ? [source.errorCode] : []),
        hiddenUsersExcluded: access.hiddenUsersExcluded,
        revenuecatExcluded: storeActivity.excluded,
        shardExcluded: shardActivity.excluded,
        funnelDevEventsExcluded: funnelSignals.excludedDevEvents,
      },
    };
  },
);
