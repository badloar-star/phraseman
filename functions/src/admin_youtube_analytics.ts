import { BigQuery } from '@google-cloud/bigquery';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { hasClaimedPermission } from './admin/permissions';
import { DEFAULT_CALLABLE_OPTIONS, ENFORCE_APP_CHECK } from './callable_options';
import {
  aggregateYoutubeAnalytics,
  buildYoutubeAnalyticsDryRunConfig,
  decodeYoutubeAnalyticsQueryRows,
  InvalidYoutubeAnalyticsRequestError,
  normalizeYoutubeAnalyticsRequest,
  type NormalizedYoutubeAnalyticsRequest,
  type YoutubeAnalyticsQueryParams,
  type YoutubeAnalyticsQueryRow,
  type YoutubeAnalyticsRequest,
  type YoutubeAnalyticsSnapshot,
} from './admin_youtube_analytics_core';

export const YOUTUBE_ANALYTICS_CACHE_TTL_MS = 10 * 60 * 1000;
export const YOUTUBE_ANALYTICS_MAX_CACHE_ENTRIES = 50;
export const YOUTUBE_ANALYTICS_MAXIMUM_BYTES_BILLED = '5000000000';

interface CacheEntry {
  readonly expiresAtMs: number;
  readonly snapshot: YoutubeAnalyticsSnapshot;
}

export class YoutubeAnalyticsCache {
  private readonly entries = new Map<string, CacheEntry>();

  constructor(
    private readonly maxEntries = YOUTUBE_ANALYTICS_MAX_CACHE_ENTRIES,
    private readonly ttlMs = YOUTUBE_ANALYTICS_CACHE_TTL_MS,
  ) {
    if (!Number.isSafeInteger(maxEntries) || maxEntries < 1 || !Number.isSafeInteger(ttlMs) || ttlMs < 1) {
      throw new Error('Invalid YouTube analytics cache bounds');
    }
  }

  get(key: string, nowMs: number): YoutubeAnalyticsSnapshot | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAtMs <= nowMs) {
      this.entries.delete(key);
      return undefined;
    }
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.snapshot;
  }

  set(key: string, snapshot: YoutubeAnalyticsSnapshot, nowMs: number): void {
    for (const [candidate, entry] of this.entries) {
      if (entry.expiresAtMs <= nowMs) this.entries.delete(candidate);
    }
    this.entries.delete(key);
    while (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value as string | undefined;
      if (oldest == null) break;
      this.entries.delete(oldest);
    }
    this.entries.set(key, { expiresAtMs: nowMs + this.ttlMs, snapshot });
  }

  get size(): number {
    return this.entries.size;
  }
}

interface YoutubeAnalyticsQueryOptions {
  readonly query: string;
  readonly params: YoutubeAnalyticsQueryParams;
  readonly types: Readonly<Record<keyof YoutubeAnalyticsQueryParams, 'INT64' | 'STRING'>>;
  readonly useLegacySql: false;
  readonly location: string;
  readonly maximumBytesBilled: string;
}

interface YoutubeAnalyticsDependencies {
  readonly nowMs: () => number;
  readonly eventsTable: () => string;
  readonly location: () => string;
  readonly query: (options: YoutubeAnalyticsQueryOptions) => Promise<readonly YoutubeAnalyticsQueryRow[]>;
  readonly cache: YoutubeAnalyticsCache;
}

const sharedCache = new YoutubeAnalyticsCache();
const DATASET_PATTERN = /^(?:[a-z][a-z0-9-]{4,61}[a-z0-9]\.)?[A-Za-z_][A-Za-z0-9_]{0,1023}$/;

function projectId(): string {
  const direct = String(process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? '').trim();
  if (direct) return direct;
  try {
    const config = JSON.parse(process.env.FIREBASE_CONFIG ?? '{}') as { projectId?: unknown };
    return typeof config.projectId === 'string' ? config.projectId.trim() : '';
  } catch {
    return '';
  }
}

export function youtubeAnalyticsEventsTable(): string {
  const dataset = String(process.env.ANALYTICS_BIGQUERY_DATASET ?? '').trim();
  if (!DATASET_PATTERN.test(dataset)) {
    throw new HttpsError('failed-precondition', 'Analytics warehouse is not configured');
  }
  const qualified = dataset.includes('.') ? dataset : `${projectId()}.${dataset}`;
  if (qualified.startsWith('.')) throw new HttpsError('failed-precondition', 'Analytics project is not configured');
  return `${qualified}.events_*`;
}

export function youtubeAnalyticsBigQueryLocation(): string {
  const location = String(process.env.ANALYTICS_BIGQUERY_LOCATION ?? 'US').trim();
  return /^[A-Za-z0-9-]{2,30}$/.test(location) ? location : 'US';
}

export function isYoutubeAnalyticsExportPendingError(error: unknown): boolean {
  const candidate = error as { code?: unknown; message?: unknown } | null;
  const message = String(candidate?.message ?? '').toLowerCase();
  return (Number(candidate?.code) === 404 || message.includes('not found') || message.includes('does not match any table'))
    && (message.includes('events_') || message.includes('does not match any table') || message.includes('not found: table'))
    && !message.includes('not found: dataset');
}

function filterCacheKey(filters: NormalizedYoutubeAnalyticsRequest): string {
  return JSON.stringify([filters.rangeDays, filters.platform, filters.videoId ?? null, filters.channelId ?? null]);
}

const defaultDependencies: YoutubeAnalyticsDependencies = {
  nowMs: () => Date.now(),
  eventsTable: youtubeAnalyticsEventsTable,
  location: youtubeAnalyticsBigQueryLocation,
  cache: sharedCache,
  query: async (options) => {
    const bigquery = new BigQuery();
    const [rows] = await bigquery.query(options);
    return rows as YoutubeAnalyticsQueryRow[];
  },
};

export async function handleAdminYoutubeAnalytics(
  request: { readonly auth?: { readonly token?: unknown }; readonly data?: YoutubeAnalyticsRequest },
  dependencies: YoutubeAnalyticsDependencies = defaultDependencies,
): Promise<YoutubeAnalyticsSnapshot> {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');
  if (!hasClaimedPermission(request.auth.token, 'analytics.read')) {
    throw new HttpsError('permission-denied', 'analytics.read permission required');
  }

  let filters: NormalizedYoutubeAnalyticsRequest;
  try {
    filters = normalizeYoutubeAnalyticsRequest(request.data ?? {});
  } catch (error) {
    if (error instanceof InvalidYoutubeAnalyticsRequestError) {
      throw new HttpsError('invalid-argument', error.message);
    }
    throw error;
  }

  const nowMs = dependencies.nowMs();
  const cacheKey = filterCacheKey(filters);
  const cached = dependencies.cache.get(cacheKey, nowMs);
  if (cached) return cached;

  const toMicros = nowMs * 1000;
  const fromMicros = toMicros - filters.rangeDays * 86_400_000_000;
  const context = { fromMicros, toMicros, generatedAtMicros: toMicros, filters };
  const config = buildYoutubeAnalyticsDryRunConfig(dependencies.eventsTable(), { fromMicros, toMicros, filters });
  let snapshot: YoutubeAnalyticsSnapshot;
  try {
    const rows = await dependencies.query({
      ...config,
      location: dependencies.location(),
      maximumBytesBilled: YOUTUBE_ANALYTICS_MAXIMUM_BYTES_BILLED,
    });
    snapshot = decodeYoutubeAnalyticsQueryRows(rows, context);
  } catch (error) {
    if (isYoutubeAnalyticsExportPendingError(error)) snapshot = aggregateYoutubeAnalytics([], context);
    else if (error instanceof InvalidYoutubeAnalyticsRequestError) {
      throw new HttpsError('internal', 'Analytics warehouse returned an invalid aggregate');
    } else throw error;
  }

  dependencies.cache.set(cacheKey, snapshot, nowMs);
  return snapshot;
}

export const adminYoutubeAnalytics = onCall({
  ...DEFAULT_CALLABLE_OPTIONS,
  enforceAppCheck: ENFORCE_APP_CHECK,
}, async request => handleAdminYoutubeAnalytics(request));
