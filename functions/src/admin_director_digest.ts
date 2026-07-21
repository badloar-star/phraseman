import * as admin from 'firebase-admin';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { hasClaimedPermission } from './admin/permissions';
import { executeAdminAnalyticsTrends } from './admin_analytics_trends';
import {
  buildDirectorDigestNarrativePrompt,
  parseDirectorDigestNarrative,
  type DirectorDigestNarrative,
  type DirectorDigestNarrativeInput,
} from './admin_director_digest_narrative';
import { ENFORCE_APP_CHECK } from './callable_options';
import { openAiChat } from './explain/explain_provider';
import { assertJobEnabled, resolveJobConfig } from './openai_jobs_config';

const REGION = 'us-central1';
const DAY_MS = 86_400_000;
const ALLOWED_RANGE_DAYS = Object.freeze([1, 3, 7, 28, 90] as const);
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

type DirectorDigestRangeDays = typeof ALLOWED_RANGE_DAYS[number];
type DirectorDigestState = 'ready' | 'empty' | 'partial' | 'unavailable';
type DirectorMetricAvailability = 'ready' | 'empty' | 'partial' | 'unavailable';
type DirectorMetricDirection = 'up' | 'down' | 'flat' | 'new' | 'unavailable';
type TrustedSourceState = 'ready' | 'empty' | 'partial' | 'error' | 'unavailable';
type TrustedFreshness = 'recent' | 'stale_event_watermark' | 'no_events' | 'unknown';

interface DirectorDigestAuth {
  readonly uid?: string;
  readonly token?: Record<string, unknown>;
}

interface TrustedPoint {
  readonly bucketStart?: unknown;
  readonly value?: unknown;
}

interface TrustedSeries {
  readonly metricId?: unknown;
  readonly unit?: unknown;
  readonly source?: unknown;
  readonly status?: unknown;
  readonly coverage?: unknown;
  readonly points?: readonly TrustedPoint[];
  readonly previousPoints?: readonly TrustedPoint[] | null;
  readonly [key: string]: unknown;
}

interface TrustedSourceHealth {
  readonly source?: unknown;
  readonly state?: unknown;
  readonly truncated?: unknown;
  readonly uncertaintyStartsAtMs?: unknown;
  readonly latestAtMs?: unknown;
  readonly checkedAtMs?: unknown;
  readonly dataAgeMs?: unknown;
  readonly freshness?: unknown;
  readonly [key: string]: unknown;
}

export interface DirectorDigestTrendsResponse {
  readonly state?: unknown;
  readonly sources?: readonly TrustedSourceHealth[];
  readonly sections?: {
    readonly behavioralPaywall?: { readonly series?: readonly TrustedSeries[] };
    readonly confirmedStore?: { readonly series?: readonly TrustedSeries[] };
    readonly grossRevenue?: { readonly series?: readonly TrustedSeries[] };
  };
  readonly [key: string]: unknown;
}

interface DirectorTrendRequest {
  readonly scope: 'overview';
  readonly fromDate: string;
  readonly toDate: string;
  readonly granularity: 'day';
  readonly comparePrevious: true;
  readonly filters: Readonly<Record<string, never>>;
}

export interface DirectorDigestDependencies {
  readonly nowMs: () => number;
  readonly loadTrends: (
    request: DirectorTrendRequest,
    nowMs: number,
  ) => Promise<DirectorDigestTrendsResponse>;
  readonly generateNarrative?: (
    prompt: Readonly<{ system: string; user: string }>,
  ) => Promise<Readonly<{ text: string }>>;
}

interface DirectorDigestPeriod {
  readonly startMs: number;
  readonly endExclusiveMs: number;
  readonly startIso: string;
  readonly endExclusiveIso: string;
}

interface DirectorSourceHealth {
  readonly source: 'paywall' | 'premium_event_time' | 'premium_created_at';
  readonly state: TrustedSourceState;
  readonly truncated: boolean;
  readonly uncertaintyStartsAtMs: number | null;
  readonly latestAtMs: number | null;
  readonly checkedAtMs: number | null;
  readonly dataAgeMs: number | null;
  readonly freshness: TrustedFreshness;
}

interface DirectorMetric {
  readonly id: string;
  readonly source: 'paywall_funnel' | 'revenuecat_premium_events';
  readonly unit: 'count' | 'usd_micros';
  readonly availability: DirectorMetricAvailability;
  readonly current: number | null;
  readonly previous: number | null;
  readonly absoluteDelta: number | null;
  readonly percentDelta: number | null;
  readonly direction: DirectorMetricDirection;
}

export interface DirectorDigestResponse {
  readonly schemaVersion: 3;
  readonly generatedAtMs: number;
  readonly rangeDays: DirectorDigestRangeDays;
  readonly state: DirectorDigestState;
  readonly period: DirectorDigestPeriod;
  readonly previousPeriod: DirectorDigestPeriod;
  readonly sourceHealth: readonly DirectorSourceHealth[];
  readonly metrics: readonly DirectorMetric[];
  readonly narrativeState: 'generated' | 'fallback';
  readonly narrative: DirectorDigestNarrative;
}

const SOURCE_IDS = Object.freeze([
  'paywall',
  'premium_event_time',
  'premium_created_at',
] as const);

const SOURCE_STATES = Object.freeze([
  'ready',
  'empty',
  'partial',
  'error',
  'unavailable',
] as const);

const FRESHNESS_STATES = Object.freeze([
  'recent',
  'stale_event_watermark',
  'no_events',
  'unknown',
] as const);

const METRIC_CONTRACT: Readonly<Record<
  string,
  Readonly<Pick<DirectorMetric, 'source' | 'unit'>>
>> = Object.freeze({
  'paywall.shown.v1': { source: 'paywall_funnel', unit: 'count' },
  'paywall.cta_click.v1': { source: 'paywall_funnel', unit: 'count' },
  'paywall.trial_started.v1': { source: 'paywall_funnel', unit: 'count' },
  'paywall.purchase_completed.v1': { source: 'paywall_funnel', unit: 'count' },
  'paywall.purchase_failed.v1': { source: 'paywall_funnel', unit: 'count' },
  'paywall.purchase_cancelled.v1': { source: 'paywall_funnel', unit: 'count' },
  'paywall.restore_completed.v1': { source: 'paywall_funnel', unit: 'count' },
  'paywall.close.v1': { source: 'paywall_funnel', unit: 'count' },
  'store.confirmed_trial_start.v1': { source: 'revenuecat_premium_events', unit: 'count' },
  'store.initial_purchase.v1': { source: 'revenuecat_premium_events', unit: 'count' },
  'store.non_renewing_purchase.v1': { source: 'revenuecat_premium_events', unit: 'count' },
  'store.renewal.v1': { source: 'revenuecat_premium_events', unit: 'count' },
  'store.refund.v1': { source: 'revenuecat_premium_events', unit: 'count' },
  'store.billing_issue.v1': { source: 'revenuecat_premium_events', unit: 'count' },
  'store.expiration.v1': { source: 'revenuecat_premium_events', unit: 'count' },
  'store.cancellation.v1': { source: 'revenuecat_premium_events', unit: 'count' },
  'store.uncancellation.v1': { source: 'revenuecat_premium_events', unit: 'count' },
  'store.product_change.v1': { source: 'revenuecat_premium_events', unit: 'count' },
  'store.subscription_extended.v1': { source: 'revenuecat_premium_events', unit: 'count' },
  'revenue.gross_usd_micros.v1': {
    source: 'revenuecat_premium_events',
    unit: 'usd_micros',
  },
});

const DEFAULT_DEPENDENCIES: DirectorDigestDependencies = Object.freeze({
  nowMs: () => Date.now(),
  loadTrends: async (
    request: DirectorTrendRequest,
    nowMs: number,
  ) => executeAdminAnalyticsTrends(request, nowMs),
  generateNarrative: async (
    prompt: Readonly<{ system: string; user: string }>,
  ) => {
    const config = await resolveJobConfig(admin.firestore(), 'digest');
    assertJobEnabled(config, 'digest');
    const apiKey = OPENAI_API_KEY.value().trim();
    if (!apiKey) throw new HttpsError('failed-precondition', 'OPENAI_API_KEY not configured');
    const result = await openAiChat({
      apiKey,
      model: config.model,
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      maxTokens: 4_000,
      temperature: 0.2,
      responseFormat: { type: 'json_object' },
    });
    return Object.freeze({ text: result.text });
  },
});

function parseRangeDays(data: unknown): DirectorDigestRangeDays {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new HttpsError('invalid-argument', 'Request must contain rangeDays.');
  }
  const request = data as Record<string, unknown>;
  if (
    Object.keys(request).length !== 1
    || !Object.prototype.hasOwnProperty.call(request, 'rangeDays')
    || !Number.isInteger(request.rangeDays)
    || !ALLOWED_RANGE_DAYS.includes(request.rangeDays as DirectorDigestRangeDays)
  ) {
    throw new HttpsError('invalid-argument', 'rangeDays must be one of 1, 3, 7, 28, or 90.');
  }
  return request.rangeDays as DirectorDigestRangeDays;
}

function assertDirectorAccess(auth: DirectorDigestAuth | null | undefined): void {
  if (!auth) throw new HttpsError('unauthenticated', 'Authentication required.');
  const uid = String(auth.uid ?? '').trim();
  const role = auth.token?.adminRole;
  if (
    !uid
    || (role !== 'owner' && role !== 'admin')
    || !hasClaimedPermission(auth.token, 'briefing.read')
  ) {
    throw new HttpsError(
      'permission-denied',
      'Owner or admin role with briefing.read permission required.',
    );
  }
}

function startOfUtcDay(nowMs: number): number {
  if (!Number.isSafeInteger(nowMs) || !Number.isFinite(new Date(nowMs).getTime())) {
    throw new HttpsError('internal', 'Server clock is unavailable.');
  }
  const date = new Date(nowMs);
  date.setUTCHours(0, 0, 0, 0);
  return date.getTime();
}

function period(startMs: number, endExclusiveMs: number): DirectorDigestPeriod {
  return Object.freeze({
    startMs,
    endExclusiveMs,
    startIso: new Date(startMs).toISOString(),
    endExclusiveIso: new Date(endExclusiveMs).toISOString(),
  });
}

function finiteSafeInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : null;
}

function nullableTimestamp(value: unknown): number | null {
  const result = finiteSafeInteger(value);
  return result !== null && Number.isFinite(new Date(result).getTime()) ? result : null;
}

function sourceHealth(rows: readonly TrustedSourceHealth[]): readonly DirectorSourceHealth[] {
  return Object.freeze(SOURCE_IDS.map((source) => {
    const row = rows.find((candidate) => candidate.source === source);
    const state = row && SOURCE_STATES.includes(row.state as TrustedSourceState)
      ? row.state as TrustedSourceState
      : 'unavailable';
    const freshness = row && FRESHNESS_STATES.includes(row.freshness as TrustedFreshness)
      ? row.freshness as TrustedFreshness
      : 'unknown';
    return Object.freeze({
      source,
      state,
      truncated: row?.truncated === true,
      uncertaintyStartsAtMs: nullableTimestamp(row?.uncertaintyStartsAtMs),
      latestAtMs: nullableTimestamp(row?.latestAtMs),
      checkedAtMs: nullableTimestamp(row?.checkedAtMs),
      dataAgeMs: finiteSafeInteger(row?.dataAgeMs),
      freshness,
    });
  }));
}

function sumPoints(points: readonly TrustedPoint[] | null | undefined): number | null {
  if (!Array.isArray(points) || points.length === 0) return null;
  let total = 0;
  for (const point of points) {
    const value = finiteSafeInteger(point?.value);
    if (value === null) return null;
    const next = total + value;
    if (!Number.isSafeInteger(next)) return null;
    total = next;
  }
  return total;
}

function metricAvailability(
  series: TrustedSeries,
  current: number | null,
  previous: number | null,
): DirectorMetricAvailability {
  if (series.status === 'unavailable' || series.coverage === 'unavailable') return 'unavailable';
  if (
    series.status === 'partial'
    || series.coverage === 'partial'
    || current === null
    || previous === null
  ) return 'partial';
  return series.status === 'empty' ? 'empty' : 'ready';
}

function comparison(
  current: number | null,
  previous: number | null,
  availability: DirectorMetricAvailability,
): Pick<DirectorMetric, 'absoluteDelta' | 'percentDelta' | 'direction'> {
  if (
    (availability !== 'ready' && availability !== 'empty')
    || current === null
    || previous === null
  ) {
    return { absoluteDelta: null, percentDelta: null, direction: 'unavailable' };
  }
  const absoluteDelta = current - previous;
  return {
    absoluteDelta,
    percentDelta: previous === 0
      ? null
      : Math.round((absoluteDelta / previous) * 10_000) / 100,
    direction: previous === 0 && current > 0
      ? 'new'
      : absoluteDelta > 0 ? 'up' : absoluteDelta < 0 ? 'down' : 'flat',
  };
}

function safeMetrics(response: DirectorDigestTrendsResponse): readonly DirectorMetric[] {
  const sections = response.sections;
  const series = [
    ...(sections?.behavioralPaywall?.series ?? []),
    ...(sections?.confirmedStore?.series ?? []),
    ...(sections?.grossRevenue?.series ?? []),
  ];
  const seen = new Set<string>();
  return Object.freeze(series.flatMap((item) => {
    const id = typeof item.metricId === 'string' ? item.metricId : '';
    const contract = METRIC_CONTRACT[id];
    if (!contract || seen.has(id)) return [];
    seen.add(id);
    const current = sumPoints(item.points);
    const previous = sumPoints(item.previousPoints);
    const availability = metricAvailability(item, current, previous);
    const unavailable = availability === 'unavailable';
    const safeCurrent = unavailable ? null : current;
    const safePrevious = unavailable ? null : previous;
    return [Object.freeze({
      id,
      ...contract,
      availability,
      current: safeCurrent,
      previous: safePrevious,
      ...comparison(safeCurrent, safePrevious, availability),
    })];
  }));
}

function responseState(
  trustedState: unknown,
  health: readonly DirectorSourceHealth[],
  metrics: readonly DirectorMetric[],
): DirectorDigestState {
  if (metrics.length === 0) return 'unavailable';
  if (
    trustedState === 'error'
    || health.length === 0
    || health.every((source) => source.state === 'error' || source.state === 'unavailable')
  ) return 'unavailable';
  if (
    trustedState === 'partial'
    || health.some((source) => (
      source.state === 'partial'
      || source.state === 'error'
      || source.state === 'unavailable'
    ))
    || metrics.some((metric) => (
      metric.availability === 'partial' || metric.availability === 'unavailable'
    ))
  ) return 'partial';
  return trustedState === 'empty' ? 'empty' : 'ready';
}

export async function getDirectorDigestResponse(
  data: unknown,
  auth: DirectorDigestAuth | null | undefined,
  dependencies: DirectorDigestDependencies = DEFAULT_DEPENDENCIES,
): Promise<DirectorDigestResponse> {
  assertDirectorAccess(auth);
  const rangeDays = parseRangeDays(data);
  const generatedAtMs = dependencies.nowMs();
  const currentDayStartMs = startOfUtcDay(generatedAtMs);
  const endExclusiveMs = currentDayStartMs + DAY_MS;
  const startMs = endExclusiveMs - rangeDays * DAY_MS;
  const previousStartMs = startMs - rangeDays * DAY_MS;
  const currentPeriod = period(startMs, endExclusiveMs);
  const previousPeriod = period(previousStartMs, startMs);
  const request: DirectorTrendRequest = Object.freeze({
    scope: 'overview',
    fromDate: currentPeriod.startIso.slice(0, 10),
    toDate: new Date(currentPeriod.endExclusiveMs - 1).toISOString().slice(0, 10),
    granularity: 'day',
    comparePrevious: true,
    filters: Object.freeze({}),
  });
  const trusted = await dependencies.loadTrends(request, generatedAtMs);
  const health = sourceHealth(trusted.sources ?? []);
  const metrics = safeMetrics(trusted);
  const state = responseState(trusted.state, health, metrics);
  const narrativeInput: DirectorDigestNarrativeInput = Object.freeze({
    generatedAtMs,
    rangeDays,
    state,
    period: Object.freeze({
      startMs: currentPeriod.startMs,
      endExclusiveMs: currentPeriod.endExclusiveMs,
    }),
    previousPeriod: Object.freeze({
      startMs: previousPeriod.startMs,
      endExclusiveMs: previousPeriod.endExclusiveMs,
    }),
    sourceHealth: Object.freeze(health.map((source) => Object.freeze({
      source: source.source,
      state: source.state,
      truncated: source.truncated,
      freshness: source.freshness,
    }))),
    metrics,
  });
  let parsedNarrative = parseDirectorDigestNarrative('', narrativeInput);
  if (
    dependencies.generateNarrative
    && state !== 'unavailable'
    && state !== 'empty'
  ) {
    try {
      const prompt = buildDirectorDigestNarrativePrompt(narrativeInput);
      const generated = await dependencies.generateNarrative({
        system: prompt.system,
        user: prompt.user,
      });
      parsedNarrative = parseDirectorDigestNarrative(generated.text, narrativeInput);
    } catch {
      parsedNarrative = parseDirectorDigestNarrative('', narrativeInput);
    }
  }
  return Object.freeze({
    schemaVersion: 3,
    generatedAtMs,
    rangeDays,
    state,
    period: currentPeriod,
    previousPeriod,
    sourceHealth: health,
    metrics,
    narrativeState: parsedNarrative.state,
    narrative: parsedNarrative.narrative,
  });
}

export const adminGetDirectorDigest = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK,
  timeoutSeconds: 120,
  memory: '512MiB',
  maxInstances: 4,
  concurrency: 10,
  secrets: [OPENAI_API_KEY],
}, async (request) => getDirectorDigestResponse(request.data, request.auth));
