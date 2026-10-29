import * as admin from 'firebase-admin';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { hasVerifiedCallablePermission } from './admin/permissions';
import { readThroughAnalyticsCache } from './admin_analytics_cache';
import { ENFORCE_APP_CHECK_ADMIN } from './callable_options';
import {
  aggregateProductStatistics,
  PRODUCT_STATISTICS_PROFILE_SCAN_CAP,
  type ProductStatisticsResponse,
  type StatisticsDayScan,
  type StatisticsCountSpec,
} from './admin_statistics_core';

const REGION = 'us-central1';
const ERROR_COOLDOWN_MS = 5 * 60 * 1000;

export const ADMIN_STATISTICS_OPTIONS = Object.freeze({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK_ADMIN,
  timeoutSeconds: 60,
  memory: '256MiB' as const,
  maxInstances: 1,
  concurrency: 1,
});

type StatisticsDb = Pick<admin.firestore.Firestore, 'collection'>;
type StatisticsCacheReader = typeof readThroughAnalyticsCache;

interface AdminStatisticsDependencies {
  readonly nowMs: () => number;
  readonly getDb: () => StatisticsDb;
  readonly readThroughCache: StatisticsCacheReader;
}

const DEFAULT_DEPENDENCIES: AdminStatisticsDependencies = {
  nowMs: () => Date.now(),
  getDb: () => admin.firestore(),
  readThroughCache: readThroughAnalyticsCache,
};

async function countPublicProfiles(db: StatisticsDb, spec: StatisticsCountSpec): Promise<number> {
  let query: admin.firestore.Query = db.collection('public_profiles');
  for (const filter of spec.filters) {
    query = query.where(filter.field, filter.operator, filter.value);
  }
  // guard-ok: every read is a server-side aggregation; profile documents never leave Firestore.
  const snapshot = await query.count().get();
  return Number(snapshot.data().count);
}

async function readProjectedDayProfiles(db: StatisticsDb): Promise<StatisticsDayScan> {
  const snapshot = await db.collection('public_profiles')
    .orderBy(admin.firestore.FieldPath.documentId())
    .select('cardLongestStreak', 'cardAppDays')
    .limit(PRODUCT_STATISTICS_PROFILE_SCAN_CAP + 1)
    .get();
  const truncated = snapshot.docs.length > PRODUCT_STATISTICS_PROFILE_SCAN_CAP;
  return {
    profiles: snapshot.docs.slice(0, PRODUCT_STATISTICS_PROFILE_SCAN_CAP).map((doc) => doc.data()),
    truncated,
    documentReads: snapshot.docs.length,
  };
}

interface StatisticsCacheEnvelope {
  readonly state: ProductStatisticsResponse['state'];
  readonly payload: ProductStatisticsResponse;
}

function isDeterministicCapPartial(response: ProductStatisticsResponse): boolean {
  const projectedReads = response.cost?.projectedDocumentReads;
  return response.state === 'partial'
    && response.totalProfiles !== null
    && response.coverage?.projectedProfilesStatus === 'truncated'
    && typeof projectedReads === 'number'
    && Number.isSafeInteger(projectedReads)
    && projectedReads === response.cost.projectedDocumentReadCap
    && response.totalProfiles >= projectedReads
    && response.metrics.every((metric) => metric.status !== 'error')
    && !response.unavailable.includes('dayHistograms:total_inconsistent');
}

function cacheEnvelope(response: ProductStatisticsResponse): StatisticsCacheEnvelope {
  const intentionalCapPartial = isDeterministicCapPartial(response);
  return {
    // The cache helper persists only `ready`/`empty`. A deterministic cap-partial is safe to
    // share for six hours; the nested payload keeps the externally visible state honest.
    state: intentionalCapPartial ? 'ready' : response.state,
    payload: response,
  };
}

export function createAdminGetProductStatisticsHandler(
  overrides: Partial<AdminStatisticsDependencies> = {},
) {
  const dependencies: AdminStatisticsDependencies = {
    nowMs: overrides.nowMs ?? DEFAULT_DEPENDENCIES.nowMs,
    getDb: overrides.getDb ?? DEFAULT_DEPENDENCIES.getDb,
    readThroughCache: overrides.readThroughCache ?? DEFAULT_DEPENDENCIES.readThroughCache,
  };
  let errorCooldown: Readonly<{ expiresAtMs: number; response: ProductStatisticsResponse }> | null = null;

  return async function handleAdminGetProductStatistics(
    request: CallableRequest<Record<string, unknown>>,
  ): Promise<ProductStatisticsResponse> {
    if (!hasVerifiedCallablePermission(request.auth, 'money.read')) {
      throw new HttpsError('permission-denied', 'money.read permission required');
    }

    const nowMs = dependencies.nowMs();
    if (errorCooldown && errorCooldown.expiresAtMs > nowMs) return errorCooldown.response;

    const db = dependencies.getDb();
    const cached = await dependencies.readThroughCache({
      kind: 'product_statistics_v2',
      // A caller-supplied refresh flag must never bypass the six-hour shared cache.
      data: {},
      nowMs,
      db,
      compute: async () => cacheEnvelope(await aggregateProductStatistics({
        nowMs,
        count: (spec) => countPublicProfiles(db, spec),
        readDayProfiles: () => readProjectedDayProfiles(db),
      })),
    });
    const normalized = cached.payload;
    if ((normalized.state === 'partial' || normalized.state === 'error')
        && !isDeterministicCapPartial(normalized)) {
      // The shared helper intentionally persists only complete answers. This short in-memory
      // cooldown prevents one unhealthy dependency from causing a recompute on every request.
      errorCooldown = { expiresAtMs: nowMs + ERROR_COOLDOWN_MS, response: normalized };
    } else {
      errorCooldown = null;
    }
    return normalized;
  };
}

export const handleAdminGetProductStatistics = createAdminGetProductStatisticsHandler();

export const adminGetProductStatistics = onCall(
  ADMIN_STATISTICS_OPTIONS,
  async (request) => {
    if (!hasVerifiedCallablePermission(request.auth, 'money.read')) {
      throw new HttpsError('permission-denied', 'money.read permission required');
    }
    return handleAdminGetProductStatistics(request);
  },
);
