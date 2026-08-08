import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { hasClaimedPermission } from './admin/permissions';
import {
  DAY_MS,
  TREND_FRESHNESS_STALE_AFTER_MS,
  TrendValidationError,
  aggregatePaywallTrends,
  aggregateRevenueCatTrends,
  aggregateShardTrends,
  buildTrendWindow,
  extractPaywallFailureBreakdown,
  normalizeTrendRequest,
  startOfUtcDay,
  startOfUtcWeek,
  type NormalizedTrendRequest,
  type PaywallFailureBreakdownRow,
  type PaywallTrendRow,
  type RevenueCatTrendRow,
  type ShardTrendRow,
  type TrendBreakdownRow,
  type TrendGranularity,
  type TrendSeries,
  type TrendSourceState,
} from './admin_analytics_trends_core';
import {
  loadProductAnalyticsPurchaseFailureRows,
  type ProductAnalyticsQueryRow,
} from './admin_product_analytics';
import { ENFORCE_APP_CHECK } from './callable_options';

const REGION = 'us-central1';
const DEFINITION_VERSION = 'admin_v2_graphical_analytics_v1';
const PAYWALL_RETENTION_MS = 90 * DAY_MS;
const SAFE_SOURCE_READ_ERROR = 'source_read_failed';
const SAFE_TRUNCATION_ERROR = 'event_cap_reached';
const NO_LIMITATIONS = Object.freeze([]) as readonly string[];
const SOURCE_PARTIAL_LIMITATIONS = Object.freeze(['source_partial']);
const SOURCE_UNAVAILABLE_LIMITATIONS = Object.freeze(['source_unavailable']);
const PAYWALL_RETENTION_LIMITATIONS = Object.freeze(['bucket_outside_paywall_retention']);
const SCOPE_NOT_REQUESTED_LIMITATIONS = Object.freeze(['scope_not_requested']);
const ANALYTICS_EXPORT_PENDING_LIMITATIONS = Object.freeze(['analytics_export_pending']);

export const EVENT_CAP = 5000;
export const CACHE_TTL_MS = 10 * 60 * 1000;
export const CACHE_MAX_ENTRIES = 24;

export type AdminAnalyticsSource =
  | 'paywall'
  | 'premium_event_time'
  | 'premium_created_at'
  | 'shards'
  | 'purchase_failures';

export interface BoundedSourceRead<T> {
  readonly rows: readonly T[];
  readonly checkedAtMs: number;
  readonly truncated: boolean;
  readonly uncertaintyStartsAtMs: number | null;
  readonly latestAtMs: number | null;
}

export interface PurchaseFailureRead {
  readonly rows: readonly ProductAnalyticsQueryRow[];
  readonly checkedAtMs: number;
  readonly exportPending: boolean;
}

interface ReaderContext {
  readonly fromMs: number;
  readonly currentFromMs: number;
  readonly endExclusiveMs: number;
  readonly granularity: TrendGranularity;
  readonly platform: 'all' | 'ios' | 'android';
  readonly checkedAtMs: number;
}

export interface AdminAnalyticsReaders {
  readonly paywall: (context: Readonly<ReaderContext>) => Promise<BoundedSourceRead<PaywallTrendRow>>;
  readonly premium_event_time: (context: Readonly<ReaderContext>) => Promise<BoundedSourceRead<RevenueCatTrendRow>>;
  readonly premium_created_at: (context: Readonly<ReaderContext>) => Promise<BoundedSourceRead<RevenueCatTrendRow>>;
  readonly shards: (context: Readonly<ReaderContext>) => Promise<BoundedSourceRead<ShardTrendRow>>;
  readonly purchase_failures: (context: Readonly<ReaderContext>) => Promise<PurchaseFailureRead>;
}

export interface AdminAnalyticsSettledReads {
  readonly paywall: PromiseSettledResult<BoundedSourceRead<PaywallTrendRow>>;
  readonly premium_event_time: PromiseSettledResult<BoundedSourceRead<RevenueCatTrendRow>>;
  readonly premium_created_at: PromiseSettledResult<BoundedSourceRead<RevenueCatTrendRow>>;
  readonly shards?: PromiseSettledResult<BoundedSourceRead<ShardTrendRow>>;
  readonly purchase_failures?: PromiseSettledResult<PurchaseFailureRead>;
}

interface SafeSourceHealth {
  readonly source: AdminAnalyticsSource;
  readonly state: TrendSourceState;
  readonly truncated: boolean;
  readonly uncertaintyStartsAtMs: number | null;
  readonly latestAtMs: number | null;
  readonly checkedAtMs: number;
  readonly dataAgeMs: number | null;
  readonly freshness: 'recent' | 'stale_event_watermark' | 'no_events' | 'unknown';
  readonly errorCode: string | null;
  readonly limitations: readonly string[];
}

interface BreakdownSection<Row = TrendBreakdownRow> {
  readonly rows: readonly Readonly<Row>[];
  readonly status: 'ready' | 'empty' | 'partial' | 'unavailable';
  readonly coverage: 'complete' | 'partial' | 'unavailable';
  readonly limitations: readonly string[];
}

type TrendsResponse = ReturnType<typeof buildResponse>;

interface CacheEntry {
  readonly expiresAtMs: number;
  readonly value: TrendsResponse;
}

const responseCache = new Map<string, CacheEntry>();
const inFlightResponses = new Map<string, Promise<TrendsResponse>>();
let cacheEpoch = 0;

const OVERVIEW_SOURCES = Object.freeze([
  'paywall',
  'premium_event_time',
  'premium_created_at',
] as const);
const PAYWALL_SOURCES = Object.freeze([
  'paywall',
  'premium_event_time',
  'premium_created_at',
  'shards',
  'purchase_failures',
] as const);

export function sourcesForScope(scope: 'overview'): typeof OVERVIEW_SOURCES;
export function sourcesForScope(scope: 'paywall'): typeof PAYWALL_SOURCES;
export function sourcesForScope(scope: NormalizedTrendRequest['scope']): readonly AdminAnalyticsSource[];
export function sourcesForScope(
  scope: NormalizedTrendRequest['scope'],
): readonly AdminAnalyticsSource[] {
  return scope === 'paywall' ? PAYWALL_SOURCES : OVERVIEW_SOURCES;
}

export function parseAdminAnalyticsTrendsRequest(
  data: unknown,
  nowMs: number,
): Readonly<NormalizedTrendRequest> {
  try {
    const request = normalizeTrendRequest(data, nowMs);
    buildTrendWindow(request);
    return request;
  } catch (error) {
    if (error instanceof TrendValidationError) {
      throw new HttpsError('invalid-argument', 'Invalid analytics trends request.');
    }
    throw error;
  }
}

function finiteTimestamp(value: number): number | null {
  const normalized = Math.floor(value);
  return Number.isFinite(value)
    && Number.isSafeInteger(normalized)
    && Number.isFinite(new Date(normalized).getTime())
    ? normalized
    : null;
}

export function timestampMillis(value: unknown): number | null {
  try {
    if (typeof value === 'number') return finiteTimestamp(value);
    if (value instanceof Date) return finiteTimestamp(value.getTime());
    if (!value || typeof value !== 'object') return null;
    const candidate = value as {
      toMillis?: unknown;
      seconds?: unknown;
      nanoseconds?: unknown;
    };
    if (typeof candidate.toMillis === 'function') {
      return finiteTimestamp((candidate.toMillis as () => number)());
    }
    if (typeof candidate.seconds === 'number') {
      const nanoseconds = typeof candidate.nanoseconds === 'number' ? candidate.nanoseconds : 0;
      return finiteTimestamp(candidate.seconds * 1000 + nanoseconds / 1_000_000);
    }
    return null;
  } catch {
    return null;
  }
}

function numericTimestampMillis(value: unknown): number | null {
  return typeof value === 'number' ? timestampMillis(value) : null;
}

export function normalizePremiumCreatedAtRows(
  rows: readonly Readonly<Record<string, unknown>>[],
): readonly RevenueCatTrendRow[] {
  return Object.freeze(rows.flatMap((row) => {
    if (numericTimestampMillis(row.eventTimestampMs) !== null) return [];
    const createdAtMs = timestampMillis(row.createdAt);
    if (createdAtMs === null) return [];
    return [Object.freeze({ ...row, eventTimestampMs: createdAtMs, createdAtMs })];
  }));
}

function bucketStart(timestampMs: number, granularity: TrendGranularity): number {
  return granularity === 'week' ? startOfUtcWeek(timestampMs) : startOfUtcDay(timestampMs);
}

function finalizeBoundedRead<T>(
  rows: readonly T[],
  timestampOf: (row: T) => number | null,
  granularity: TrendGranularity,
  checkedAtMs: number,
  truncated: boolean,
): BoundedSourceRead<T> {
  let latestAtMs: number | null = null;
  let lastValidAtMs: number | null = null;
  for (const row of rows) {
    const at = timestampOf(row);
    if (at === null) continue;
    latestAtMs = Math.max(latestAtMs ?? at, at);
    lastValidAtMs = at;
  }
  return Object.freeze({
    rows: Object.freeze([...rows]),
    checkedAtMs,
    truncated,
    uncertaintyStartsAtMs: truncated && lastValidAtMs !== null
      ? bucketStart(lastValidAtMs, granularity)
      : null,
    latestAtMs,
  });
}

function documentRows(
  docs: readonly FirebaseFirestore.QueryDocumentSnapshot[],
): readonly Readonly<Record<string, unknown>>[] {
  return docs.slice(0, EVENT_CAP).map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function readPaywall(context: Readonly<ReaderContext>): Promise<BoundedSourceRead<PaywallTrendRow>> {
  const snapshot = await admin.firestore()
    .collection('paywall_funnel')
    .where('ts', '>=', context.fromMs)
    .where('ts', '<', context.endExclusiveMs)
    .orderBy('ts', 'asc')
    .limit(EVENT_CAP + 1)
    .get();
  const rows = documentRows(snapshot.docs) as readonly PaywallTrendRow[];
  return finalizeBoundedRead(
    rows,
    (row) => numericTimestampMillis(row.ts),
    context.granularity,
    context.checkedAtMs,
    snapshot.docs.length > EVENT_CAP,
  );
}

async function readPremiumEventTime(
  context: Readonly<ReaderContext>,
): Promise<BoundedSourceRead<RevenueCatTrendRow>> {
  const snapshot = await admin.firestore()
    .collection('revenuecat_premium_events')
    .where('eventTimestampMs', '>=', context.fromMs)
    .where('eventTimestampMs', '<', context.endExclusiveMs)
    .orderBy('eventTimestampMs', 'asc')
    .limit(EVENT_CAP + 1)
    .get();
  const rows = documentRows(snapshot.docs) as readonly RevenueCatTrendRow[];
  return finalizeBoundedRead(
    rows,
    (row) => numericTimestampMillis(row.eventTimestampMs),
    context.granularity,
    context.checkedAtMs,
    snapshot.docs.length > EVENT_CAP,
  );
}

async function readPremiumCreatedAt(
  context: Readonly<ReaderContext>,
): Promise<BoundedSourceRead<RevenueCatTrendRow>> {
  const snapshot = await admin.firestore()
    .collection('revenuecat_premium_events')
    .where('createdAt', '>=', admin.firestore.Timestamp.fromMillis(context.fromMs))
    .where('createdAt', '<', admin.firestore.Timestamp.fromMillis(context.endExclusiveMs))
    .orderBy('createdAt', 'asc')
    .limit(EVENT_CAP + 1)
    .get();
  const rows = normalizePremiumCreatedAtRows(documentRows(snapshot.docs));
  return finalizeBoundedRead(
    rows,
    (row) => numericTimestampMillis(row.eventTimestampMs),
    context.granularity,
    context.checkedAtMs,
    snapshot.docs.length > EVENT_CAP,
  );
}

async function readShards(context: Readonly<ReaderContext>): Promise<BoundedSourceRead<ShardTrendRow>> {
  const snapshot = await admin.firestore()
    .collection('revenuecat_shard_transactions')
    .where('eventTimestampMs', '>=', context.fromMs)
    .where('eventTimestampMs', '<', context.endExclusiveMs)
    .orderBy('eventTimestampMs', 'asc')
    .limit(EVENT_CAP + 1)
    .get();
  const rows = documentRows(snapshot.docs) as readonly ShardTrendRow[];
  return finalizeBoundedRead(
    rows,
    (row) => numericTimestampMillis(row.eventTimestampMs),
    context.granularity,
    context.checkedAtMs,
    snapshot.docs.length > EVENT_CAP,
  );
}

async function readPurchaseFailures(context: Readonly<ReaderContext>): Promise<PurchaseFailureRead> {
  const result = await loadProductAnalyticsPurchaseFailureRows({
    startMs: context.currentFromMs,
    endExclusiveMs: context.endExclusiveMs,
    platform: context.platform,
    maximumBytesBilled: '5000000000',
  });
  return Object.freeze({
    rows: Object.freeze([...result.rows]),
    checkedAtMs: context.checkedAtMs,
    exportPending: result.exportPending,
  });
}

const DEFAULT_READERS: AdminAnalyticsReaders = Object.freeze({
  paywall: readPaywall,
  premium_event_time: readPremiumEventTime,
  premium_created_at: readPremiumCreatedAt,
  shards: readShards,
  purchase_failures: readPurchaseFailures,
});

function safeFreshness(
  state: TrendSourceState,
  checkedAtMs: number,
  latestAtMs: number | null,
): Pick<SafeSourceHealth, 'dataAgeMs' | 'freshness'> {
  if (state === 'error' || state === 'unavailable') {
    return { dataAgeMs: null, freshness: 'unknown' };
  }
  if (latestAtMs === null) {
    return { dataAgeMs: null, freshness: state === 'empty' ? 'no_events' : 'unknown' };
  }
  const dataAgeMs = Math.max(0, checkedAtMs - latestAtMs);
  return {
    dataAgeMs,
    freshness: dataAgeMs > TREND_FRESHNESS_STALE_AFTER_MS
      ? 'stale_event_watermark'
      : 'recent',
  };
}

function sourceHealth<T extends { readonly rows: readonly unknown[]; readonly checkedAtMs: number }>(
  source: AdminAnalyticsSource,
  settled: PromiseSettledResult<T>,
  attemptedAtMs: number,
): Readonly<SafeSourceHealth> {
  const safeAttemptedAtMs = timestampMillis(attemptedAtMs) ?? 0;
  if (settled.status === 'rejected') return Object.freeze({
    source,
    state: 'error' as const,
    truncated: false,
    uncertaintyStartsAtMs: null,
    latestAtMs: null,
    checkedAtMs: safeAttemptedAtMs,
    dataAgeMs: null,
    freshness: 'unknown' as const,
    errorCode: SAFE_SOURCE_READ_ERROR,
    limitations: SOURCE_UNAVAILABLE_LIMITATIONS,
  });
  const bounded = settled.value as T & {
    readonly truncated?: boolean;
    readonly uncertaintyStartsAtMs?: number | null;
    readonly latestAtMs?: number | null;
    readonly exportPending?: boolean;
  };
  const truncated = bounded.truncated === true;
  const exportPending = bounded.exportPending === true;
  const state: TrendSourceState = truncated || exportPending
    ? 'partial'
    : bounded.rows.length === 0 ? 'empty' : 'ready';
  const latestAtMs = timestampMillis(bounded.latestAtMs);
  const checkedAtMs = timestampMillis(bounded.checkedAtMs) ?? safeAttemptedAtMs;
  return Object.freeze({
    source,
    state,
    truncated,
    uncertaintyStartsAtMs: timestampMillis(bounded.uncertaintyStartsAtMs),
    latestAtMs,
    checkedAtMs,
    ...safeFreshness(state, checkedAtMs, latestAtMs),
    errorCode: exportPending ? 'analytics_export_pending' : truncated ? SAFE_TRUNCATION_ERROR : null,
    limitations: state === 'partial' ? SOURCE_PARTIAL_LIMITATIONS : NO_LIMITATIONS,
  });
}

function rejectedRead<T>(): PromiseSettledResult<T> {
  return { status: 'rejected', reason: null };
}

function fulfilledRows<T>(settled: PromiseSettledResult<BoundedSourceRead<T>>): readonly T[] {
  return settled.status === 'fulfilled' ? settled.value.rows : [];
}

function healthForCore(health: Readonly<SafeSourceHealth>) {
  return {
    state: health.state,
    truncated: health.truncated,
    uncertaintyStartsAtMs: health.uncertaintyStartsAtMs,
    latestAtMs: health.latestAtMs,
    checkedAtMs: health.checkedAtMs,
    errorCode: health.errorCode,
  } as const;
}

function combinedPremiumHealth(
  eventTime: PromiseSettledResult<BoundedSourceRead<RevenueCatTrendRow>>,
  createdAt: PromiseSettledResult<BoundedSourceRead<RevenueCatTrendRow>>,
  attemptedAtMs: number,
): Readonly<SafeSourceHealth> {
  const eventHealth = sourceHealth('premium_event_time', eventTime, attemptedAtMs);
  const createdHealth = sourceHealth('premium_created_at', createdAt, attemptedAtMs);
  const bothFailed = eventHealth.state === 'error' && createdHealth.state === 'error';
  const anyFailed = eventHealth.state === 'error' || createdHealth.state === 'error';
  const truncated = eventHealth.truncated || createdHealth.truncated;
  const state: TrendSourceState = bothFailed
    ? 'error'
    : anyFailed || truncated || eventHealth.state === 'partial' || createdHealth.state === 'partial'
      ? 'partial'
      : eventHealth.state === 'empty' && createdHealth.state === 'empty' ? 'empty' : 'ready';
  const boundaries = [eventHealth, createdHealth]
    .filter((health) => health.truncated)
    .map((health) => health.uncertaintyStartsAtMs);
  const uncertaintyStartsAtMs = anyFailed || boundaries.some((value) => value === null)
    ? null
    : boundaries.reduce<number | null>((minimum, value) => (
      value === null ? minimum : Math.min(minimum ?? value, value)
    ), null);
  const latestValues = [eventHealth.latestAtMs, createdHealth.latestAtMs]
    .filter((value): value is number => value !== null);
  const latestAtMs = latestValues.length > 0 ? Math.max(...latestValues) : null;
  const checkedAtMs = Math.max(eventHealth.checkedAtMs, createdHealth.checkedAtMs);
  return Object.freeze({
    source: 'premium_event_time' as const,
    state,
    truncated,
    uncertaintyStartsAtMs,
    latestAtMs,
    checkedAtMs,
    ...safeFreshness(state, checkedAtMs, latestAtMs),
    errorCode: bothFailed ? SAFE_SOURCE_READ_ERROR : anyFailed ? 'premium_branch_unavailable' : truncated ? SAFE_TRUNCATION_ERROR : null,
    limitations: state === 'error'
      ? SOURCE_UNAVAILABLE_LIMITATIONS
      : state === 'partial' ? SOURCE_PARTIAL_LIMITATIONS : NO_LIMITATIONS,
  });
}

function retentionMaskSeries(
  series: readonly Readonly<TrendSeries>[],
  generatedAtMs: number,
): {
  readonly series: readonly Readonly<TrendSeries>[];
  readonly currentAffected: boolean;
  readonly previousAffected: boolean;
  readonly affected: boolean;
} {
  const retentionBoundaryMs = generatedAtMs - PAYWALL_RETENTION_MS;
  const outsideRetention = (bucketStart: string) => (
    Date.parse(`${bucketStart}T00:00:00.000Z`) < retentionBoundaryMs
  );
  let currentAffected = false;
  let previousAffected = false;
  const masked = series.map((item) => {
    const currentItemAffected = item.points.some((point) => outsideRetention(point.bucketStart));
    const previousItemAffected = item.previousPoints?.some(
      (point) => outsideRetention(point.bucketStart),
    ) === true;
    currentAffected ||= currentItemAffected;
    previousAffected ||= previousItemAffected;
    if (!currentItemAffected && !previousItemAffected) return item;
    const mask = (points: readonly Readonly<{ bucketStart: string; value: number | null }>[]) => (
      Object.freeze(points.map((point) => (
        outsideRetention(point.bucketStart)
          ? Object.freeze({ ...point, value: null })
          : point
      )))
    );
    return Object.freeze({
      ...item,
      status: item.status === 'unavailable' ? item.status : 'partial' as const,
      coverage: item.coverage === 'unavailable' ? item.coverage : 'partial' as const,
      limitations: Object.freeze([...new Set([
        ...item.limitations,
        'bucket_outside_paywall_retention',
      ])]),
      points: currentItemAffected ? mask(item.points) : item.points,
      previousPoints: item.previousPoints === null
        ? null
        : previousItemAffected ? mask(item.previousPoints) : item.previousPoints,
    });
  });
  return Object.freeze({
    series: Object.freeze(masked),
    currentAffected,
    previousAffected,
    affected: currentAffected || previousAffected,
  });
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value as Readonly<T>;
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return Object.freeze(value);
}

function responseState(
  health: readonly Readonly<SafeSourceHealth>[],
  premiumHealth: Readonly<SafeSourceHealth>,
  retentionAffected: boolean,
): 'ready' | 'empty' | 'partial' | 'error' {
  const logical = [
    health.find((item) => item.source === 'paywall'),
    premiumHealth,
    health.find((item) => item.source === 'shards'),
    health.find((item) => item.source === 'purchase_failures'),
  ].filter((item): item is Readonly<SafeSourceHealth> => item !== undefined);
  if (logical.every((item) => item.state === 'error' || item.state === 'unavailable')) return 'error';
  if (retentionAffected || logical.some((item) => (
    item.state === 'error' || item.state === 'unavailable' || item.state === 'partial'
  ))) return 'partial';
  return logical.every((item) => item.state === 'empty') ? 'empty' : 'ready';
}

function paywallHealthWithRetention(
  health: Readonly<SafeSourceHealth>,
  retentionAffected: boolean,
): Readonly<SafeSourceHealth> {
  if (!retentionAffected) return health;
  return Object.freeze({
    ...health,
    state: health.state === 'error' || health.state === 'unavailable'
      ? health.state
      : 'partial' as const,
    limitations: Object.freeze([...new Set([
      ...health.limitations,
      ...PAYWALL_RETENTION_LIMITATIONS,
    ])]),
  });
}

function frozenBreakdownSection<Row>(
  rows: readonly Readonly<Row>[],
  status: BreakdownSection['status'],
  coverage: BreakdownSection['coverage'],
  limitations: readonly string[],
): Readonly<BreakdownSection<Row>> {
  return Object.freeze({ rows: Object.freeze([...rows]), status, coverage, limitations });
}

function purchaseFailureSection(
  scope: NormalizedTrendRequest['scope'],
  settled: PromiseSettledResult<PurchaseFailureRead>,
): Readonly<BreakdownSection<PaywallFailureBreakdownRow>> {
  if (scope !== 'paywall') {
    return frozenBreakdownSection(
      Object.freeze([]), 'unavailable', 'unavailable', SCOPE_NOT_REQUESTED_LIMITATIONS,
    );
  }
  if (settled.status === 'rejected') {
    return frozenBreakdownSection(
      Object.freeze([]), 'unavailable', 'unavailable', SOURCE_UNAVAILABLE_LIMITATIONS,
    );
  }
  if (settled.value.exportPending) {
    return frozenBreakdownSection(
      Object.freeze([]),
      'unavailable',
      'unavailable',
      ANALYTICS_EXPORT_PENDING_LIMITATIONS,
    );
  }
  const rows = extractPaywallFailureBreakdown(settled.value.rows);
  return frozenBreakdownSection(
    rows,
    rows.length === 0 ? 'empty' : 'ready',
    'complete',
    NO_LIMITATIONS,
  );
}

function breakdownSections(
  scope: NormalizedTrendRequest['scope'],
  health: Readonly<SafeSourceHealth>,
  retentionAffected: boolean,
  breakdowns: Readonly<{
    context: readonly Readonly<TrendBreakdownRow>[];
    variant: readonly Readonly<TrendBreakdownRow>[];
    plan: readonly Readonly<TrendBreakdownRow>[];
  }>,
) {
  if (scope !== 'paywall') {
    const unavailable = frozenBreakdownSection(
      Object.freeze([]), 'unavailable', 'unavailable', SCOPE_NOT_REQUESTED_LIMITATIONS,
    );
    return Object.freeze({ byContext: unavailable, byVariant: unavailable, byPlan: unavailable });
  }
  if (health.state === 'error' || health.state === 'unavailable') {
    const unavailable = frozenBreakdownSection(
      Object.freeze([]), 'unavailable', 'unavailable', SOURCE_UNAVAILABLE_LIMITATIONS,
    );
    return Object.freeze({ byContext: unavailable, byVariant: unavailable, byPlan: unavailable });
  }
  if (retentionAffected) {
    const partial = frozenBreakdownSection(
      Object.freeze([]), 'partial', 'partial', PAYWALL_RETENTION_LIMITATIONS,
    );
    return Object.freeze({ byContext: partial, byVariant: partial, byPlan: partial });
  }
  if (health.state === 'partial' || health.truncated) {
    const partial = frozenBreakdownSection(
      Object.freeze([]), 'partial', 'partial', SOURCE_PARTIAL_LIMITATIONS,
    );
    return Object.freeze({ byContext: partial, byVariant: partial, byPlan: partial });
  }
  const section = (rows: readonly Readonly<TrendBreakdownRow>[]) => frozenBreakdownSection(
    rows,
    rows.length === 0 ? 'empty' : 'ready',
    'complete',
    NO_LIMITATIONS,
  );
  return Object.freeze({
    byContext: section(breakdowns.context),
    byVariant: section(breakdowns.variant),
    byPlan: section(breakdowns.plan),
  });
}

function buildResponse(
  request: Readonly<NormalizedTrendRequest>,
  generatedAtMs: number,
  settled: Readonly<AdminAnalyticsSettledReads>,
) {
  const paywallSettled = settled.paywall;
  const eventSettled = settled.premium_event_time;
  const createdSettled = settled.premium_created_at;
  const shardSettled = settled.shards ?? rejectedRead<BoundedSourceRead<ShardTrendRow>>();
  const failureSettled = settled.purchase_failures ?? rejectedRead<PurchaseFailureRead>();
  const selected = sourcesForScope(request.scope);
  const allSettled: Record<AdminAnalyticsSource, PromiseSettledResult<{
    readonly rows: readonly unknown[];
    readonly checkedAtMs: number;
  }>> = {
    paywall: paywallSettled,
    premium_event_time: eventSettled,
    premium_created_at: createdSettled,
    shards: shardSettled,
    purchase_failures: failureSettled,
  };
  const health = selected.map((source) => sourceHealth(source, allSettled[source], generatedAtMs));
  const paywallHealth = health.find((item) => item.source === 'paywall')!;
  const premiumHealth = combinedPremiumHealth(eventSettled, createdSettled, generatedAtMs);
  const shardHealth = health.find((item) => item.source === 'shards')
    ?? sourceHealth(
      'shards',
      rejectedRead<BoundedSourceRead<ShardTrendRow>>(),
      generatedAtMs,
    );
  const paywallAggregate = aggregatePaywallTrends(
    fulfilledRows(paywallSettled),
    request,
    healthForCore(paywallHealth),
    { includeBreakdowns: request.scope === 'paywall' },
  );
  const premiumRows = Object.freeze([
    ...fulfilledRows(eventSettled),
    ...fulfilledRows(createdSettled),
  ]);
  const premiumAggregate = aggregateRevenueCatTrends(
    premiumRows,
    request,
    healthForCore(premiumHealth),
  );
  const shardAggregate = request.scope === 'paywall'
    ? aggregateShardTrends(fulfilledRows(shardSettled), request, healthForCore(shardHealth))
    : null;
  const retention = retentionMaskSeries(paywallAggregate.countSeries, generatedAtMs);
  const responseHealth = Object.freeze(health.map((item) => (
    item.source === 'paywall'
      ? paywallHealthWithRetention(item, retention.affected)
      : item
  )));
  const behavioralBreakdowns = breakdownSections(
    request.scope,
    paywallHealth,
    retention.currentAffected,
    paywallAggregate.breakdowns,
  );
  const purchaseFailures = purchaseFailureSection(request.scope, failureSettled);
  const state = responseState(responseHealth, premiumHealth, retention.affected);

  return deepFreeze({
    definitionVersion: DEFINITION_VERSION,
    timezone: 'UTC' as const,
    generatedAtMs,
    request,
    state,
    sources: responseHealth,
    sections: {
      behavioralPaywall: { series: retention.series },
      behavioralBreakdowns,
      confirmedStore: { series: premiumAggregate.countSeries },
      grossRevenue: { series: premiumAggregate.moneySeries },
      shardPurchases: { series: shardAggregate?.countSeries ?? Object.freeze([]) },
      purchaseFailures,
    },
  });
}

export function composeAdminAnalyticsTrendsResponse(
  request: Readonly<NormalizedTrendRequest>,
  generatedAtMs: number,
  settled: Readonly<AdminAnalyticsSettledReads>,
): TrendsResponse {
  return buildResponse(request, generatedAtMs, settled);
}

function cacheKey(request: Readonly<NormalizedTrendRequest>): string {
  return JSON.stringify(request);
}

function cachedResponse(key: string, nowMs: number): TrendsResponse | null {
  for (const [candidate, entry] of responseCache) {
    if (entry.expiresAtMs <= nowMs) responseCache.delete(candidate);
  }
  const entry = responseCache.get(key);
  if (!entry) return null;
  responseCache.delete(key);
  responseCache.set(key, entry);
  return entry.value;
}

function storeCachedResponse(key: string, value: TrendsResponse, nowMs: number): void {
  const existing = responseCache.get(key);
  if (existing && existing.value.generatedAtMs > value.generatedAtMs) return;
  responseCache.delete(key);
  responseCache.set(key, { expiresAtMs: nowMs + CACHE_TTL_MS, value });
  while (responseCache.size > CACHE_MAX_ENTRIES) {
    const oldest = responseCache.keys().next().value as string | undefined;
    if (oldest === undefined) break;
    responseCache.delete(oldest);
  }
}

export function _resetAdminAnalyticsTrendsCacheForTests(): void {
  cacheEpoch += 1;
  responseCache.clear();
  inFlightResponses.clear();
}

export function _adminAnalyticsTrendsCacheSizeForTests(): number {
  return responseCache.size;
}

export function _adminAnalyticsTrendsInFlightSizeForTests(): number {
  return inFlightResponses.size;
}

export async function executeAdminAnalyticsTrends(
  data: unknown,
  nowMs: number,
  readers: Readonly<AdminAnalyticsReaders> = DEFAULT_READERS,
): Promise<TrendsResponse> {
  const request = parseAdminAnalyticsTrendsRequest(data, nowMs);
  const key = cacheKey(request);
  const cached = cachedResponse(key, nowMs);
  if (cached) return cached;
  const existingInFlight = inFlightResponses.get(key);
  if (existingInFlight) return existingInFlight;
  if (inFlightResponses.size >= CACHE_MAX_ENTRIES) {
    throw new HttpsError(
      'resource-exhausted',
      'Too many analytics trend requests are in progress.',
    );
  }

  const executionEpoch = cacheEpoch;
  const execution = (async (): Promise<TrendsResponse> => {
    const window = buildTrendWindow(request);
    const context = Object.freeze({
      fromMs: window.previous?.fromMs ?? window.current.fromMs,
      currentFromMs: window.current.fromMs,
      endExclusiveMs: window.current.toMs + DAY_MS,
      granularity: request.granularity,
      platform: request.filters.platform ?? 'all',
      checkedAtMs: nowMs,
    });
    const selected = sourcesForScope(request.scope);
    const outcomes = await Promise.allSettled(selected.map((source) => readers[source](context)));
    const bySource: Partial<Record<AdminAnalyticsSource, PromiseSettledResult<unknown>>> = {};
    selected.forEach((source, index) => { bySource[source] = outcomes[index]; });
    const settled: AdminAnalyticsSettledReads = {
      paywall: (bySource.paywall ?? rejectedRead()) as PromiseSettledResult<BoundedSourceRead<PaywallTrendRow>>,
      premium_event_time: (bySource.premium_event_time ?? rejectedRead()) as PromiseSettledResult<BoundedSourceRead<RevenueCatTrendRow>>,
      premium_created_at: (bySource.premium_created_at ?? rejectedRead()) as PromiseSettledResult<BoundedSourceRead<RevenueCatTrendRow>>,
      ...(request.scope === 'paywall' ? {
        shards: (bySource.shards ?? rejectedRead()) as PromiseSettledResult<BoundedSourceRead<ShardTrendRow>>,
        purchase_failures: (bySource.purchase_failures ?? rejectedRead()) as PromiseSettledResult<PurchaseFailureRead>,
      } : {}),
    };
    const response = composeAdminAnalyticsTrendsResponse(request, nowMs, settled);
    if (
      executionEpoch === cacheEpoch
      && (response.state === 'ready' || response.state === 'empty')
    ) storeCachedResponse(key, response, nowMs);
    return response;
  })();
  inFlightResponses.set(key, execution);
  try {
    return await execution;
  } finally {
    if (inFlightResponses.get(key) === execution) inFlightResponses.delete(key);
  }
}

export const adminGetAnalyticsTrends = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK,
  timeoutSeconds: 60,
  memory: '512MiB',
  maxInstances: 4,
  concurrency: 10,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }
  if (!hasClaimedPermission(request.auth?.token, 'money.read')) {
    throw new HttpsError('permission-denied', 'money.read permission required');
  }
  return executeAdminAnalyticsTrends(request.data, Date.now());
});
