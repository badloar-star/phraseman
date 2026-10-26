export type StatisticsMetricId = 'rank' | 'proCard' | 'longestStreak' | 'activeDays';
export type StatisticsFilterOperator = '==' | '>=' | '<=';

export interface StatisticsCountSpec {
  readonly key: string;
  readonly metricId: StatisticsMetricId | 'total';
  readonly label: string;
  readonly filters: readonly Readonly<{
    field: string;
    operator: StatisticsFilterOperator;
    value: number | boolean;
  }>[];
}

export interface ProductStatisticsMetric {
  readonly id: StatisticsMetricId;
  readonly title: string;
  readonly unit: string;
  readonly description: string;
  readonly knownProfiles: number | null;
  readonly missingProfiles: number | null;
  readonly status: 'available' | 'empty' | 'partial' | 'error';
  readonly buckets: readonly Readonly<{ label: string; count: number | null }>[];
  readonly dayCounts?: readonly (readonly [day: number, count: number])[];
  readonly maximumDays?: number | null;
  readonly observedMaximumDays?: number | null;
  readonly note?: string;
}

export interface ProductStatisticsResponse {
  readonly schemaVersion: 1;
  readonly generatedAtMs: number;
  readonly source: 'public_profiles';
  readonly totalProfiles: number | null;
  readonly state: 'ready' | 'partial' | 'error';
  readonly metrics: readonly ProductStatisticsMetric[];
  readonly coverage: Readonly<{
    projectedProfilesScanned: number | null;
    projectedProfilesCap: number;
    projectedProfilesComplete: boolean;
    projectedProfilesStatus: 'complete' | 'truncated' | 'error';
  }>;
  readonly cost: Readonly<{
    aggregationQueries: number;
    projectedDocumentReads: number | null;
    projectedDocumentReadCap: number;
    ttlHours: 6;
  }>;
  readonly unavailable: readonly string[];
}

export interface StatisticsDayProfile {
  readonly cardLongestStreak?: unknown;
  readonly cardAppDays?: unknown;
}

export interface StatisticsDayScan {
  readonly profiles: readonly StatisticsDayProfile[];
  readonly truncated: boolean;
  readonly documentReads: number;
}

interface MetricDefinition {
  readonly id: StatisticsMetricId;
  readonly title: string;
  readonly unit: string;
  readonly description: string;
  readonly buckets: readonly Readonly<{
    key: string;
    label: string;
    filters: StatisticsCountSpec['filters'];
  }>[];
}

const MAX_CANONICAL_PROFILE_METRIC = 100_000;
export const PRODUCT_STATISTICS_PROFILE_SCAN_CAP = 10_000;
const PRODUCT_STATISTICS_PROFILE_READ_CAP = PRODUCT_STATISTICS_PROFILE_SCAN_CAP + 1;

const rangeBuckets = (field: string) => [
  { key: '0', label: '0 дней', filters: [{ field, operator: '==' as const, value: 0 }] },
  { key: '1-6', label: '1–6 дней', filters: [{ field, operator: '>=' as const, value: 1 }, { field, operator: '<=' as const, value: 6 }] },
  { key: '7-29', label: '7–29 дней', filters: [{ field, operator: '>=' as const, value: 7 }, { field, operator: '<=' as const, value: 29 }] },
  { key: '30-89', label: '30–89 дней', filters: [{ field, operator: '>=' as const, value: 30 }, { field, operator: '<=' as const, value: 89 }] },
  { key: '90+', label: '90+ дней', filters: [{ field, operator: '>=' as const, value: 90 }, { field, operator: '<=' as const, value: MAX_CANONICAL_PROFILE_METRIC }] },
] as const;

const COUNT_METRIC_DEFINITIONS: readonly MetricDefinition[] = [
  {
    id: 'rank',
    title: 'Ранг монет',
    unit: 'профилей',
    description: 'Текущий ранг в синхронизированных профилях.',
    buckets: Array.from({ length: 20 }, (_, rank) => ({
      key: String(rank),
      label: String(rank),
      filters: [{ field: 'coinRank', operator: '==' as const, value: rank }],
    })),
  },
  {
    id: 'proCard',
    title: 'Pro-визитка',
    unit: 'профилей',
    description: 'Владение визиткой; это не число покупок за период.',
    buckets: [
      { key: 'true', label: 'Да', filters: [{ field: 'profileCardPro', operator: '==' as const, value: true }] },
      { key: 'false', label: 'Нет', filters: [{ field: 'profileCardPro', operator: '==' as const, value: false }] },
    ],
  },
];

const DAY_METRIC_DEFINITIONS = [
  {
    id: 'longestStreak' as const,
    field: 'cardLongestStreak' as const,
    title: 'Лучшая серия',
    description: 'Максимальная серия активных дней в синхронизированных профилях.',
  },
  {
    id: 'activeDays' as const,
    field: 'cardAppDays' as const,
    title: 'Активные дни',
    description: 'Количество дней активности в синхронизированных профилях.',
  },
] as const;

export const PRODUCT_STATISTICS_COUNT_SPECS: readonly StatisticsCountSpec[] = [
  { key: 'total', metricId: 'total', label: 'Все профили', filters: [] },
  ...COUNT_METRIC_DEFINITIONS.flatMap((metric) => metric.buckets.map((bucket) => ({
    key: `${metric.id}:${bucket.key}`,
    metricId: metric.id,
    label: bucket.label,
    filters: bucket.filters,
  }))),
];

// The projected scan runs alongside these workers, so the total number of simultaneous
// Firestore operations remains at most four.
const MAX_PARALLEL_COUNT_WORKERS = 3;

async function mapWithConcurrency<T, R>(
  values: readonly T[],
  concurrency: number,
  work: (value: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await work(values[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, worker));
  return results;
}

function safeCount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error('invalid_aggregate_count');
  }
  return value;
}

function validateDayScan(value: StatisticsDayScan): StatisticsDayScan {
  const profileCount = Array.isArray(value?.profiles) ? value.profiles.length : -1;
  const expectedReads = value?.truncated ? PRODUCT_STATISTICS_PROFILE_READ_CAP : profileCount;
  if (profileCount < 0 || profileCount > PRODUCT_STATISTICS_PROFILE_SCAN_CAP
      || typeof value?.truncated !== 'boolean'
      || !Number.isSafeInteger(value?.documentReads)
      || value.documentReads !== expectedReads
      || (value.truncated && profileCount !== PRODUCT_STATISTICS_PROFILE_SCAN_CAP)) {
    throw new Error('invalid_projected_profile_scan');
  }
  return value;
}

function legacyDayBuckets(dayCounts: readonly (readonly [number, number])[]): ProductStatisticsMetric['buckets'] {
  const totals = [0, 0, 0, 0, 0];
  for (const [day, count] of dayCounts) {
    if (day === 0) totals[0] += count;
    else if (day <= 6) totals[1] += count;
    else if (day <= 29) totals[2] += count;
    else if (day <= 89) totals[3] += count;
    else totals[4] += count;
  }
  return rangeBuckets('').map((bucket, index) => ({ label: bucket.label, count: totals[index] }));
}

function failedLegacyDayBuckets(): ProductStatisticsMetric['buckets'] {
  return rangeBuckets('').map((bucket) => ({ label: bucket.label, count: null }));
}

function exactDayMetric(
  definition: typeof DAY_METRIC_DEFINITIONS[number],
  scan: StatisticsDayScan,
  totalProfiles: number | null,
): ProductStatisticsMetric {
  const histogram = new Map<number, number>();
  for (const profile of scan.profiles) {
    const value = profile[definition.field];
    if (typeof value !== 'number' || !Number.isSafeInteger(value)
        || value < 0 || value > MAX_CANONICAL_PROFILE_METRIC) continue;
    histogram.set(value, (histogram.get(value) ?? 0) + 1);
  }
  const dayCounts = [...histogram.entries()].sort(([left], [right]) => right - left);
  const knownProfiles = dayCounts.reduce((sum, [, count]) => sum + count, 0);
  const inconsistentTotal = totalProfiles !== null && !scan.truncated && knownProfiles > totalProfiles;
  const status = inconsistentTotal || scan.truncated
    ? 'partial'
    : knownProfiles === 0
      ? 'empty'
      : 'available';
  const observedMaximumDays = dayCounts[0]?.[0] ?? null;
  return {
    id: definition.id,
    title: definition.title,
    unit: 'профилей',
    description: definition.description,
    knownProfiles,
    missingProfiles: scan.truncated || inconsistentTotal || totalProfiles === null
      ? null
      : totalProfiles - knownProfiles,
    status,
    buckets: legacyDayBuckets(dayCounts),
    dayCounts,
    maximumDays: scan.truncated || inconsistentTotal ? null : observedMaximumDays,
    observedMaximumDays,
    ...(scan.truncated ? { note: 'Охват ограничен первыми 10 000 профилей; точный общий максимум недоступен.' } : {}),
  };
}

function failedDayMetric(
  definition: typeof DAY_METRIC_DEFINITIONS[number],
): ProductStatisticsMetric {
  return {
    id: definition.id,
    title: definition.title,
    unit: 'профилей',
    description: definition.description,
    knownProfiles: null,
    missingProfiles: null,
    status: 'error',
    buckets: failedLegacyDayBuckets(),
    dayCounts: [],
    maximumDays: null,
    observedMaximumDays: null,
  };
}

export async function aggregateProductStatistics(input: Readonly<{
  nowMs: number;
  count: (spec: StatisticsCountSpec) => Promise<number>;
  readDayProfiles: () => Promise<StatisticsDayScan>;
}>): Promise<ProductStatisticsResponse> {
  const [observed, dayScanResult] = await Promise.all([
    mapWithConcurrency(
      PRODUCT_STATISTICS_COUNT_SPECS,
      MAX_PARALLEL_COUNT_WORKERS,
      async (spec) => {
        try {
          return safeCount(await input.count(spec));
        } catch {
          return null;
        }
      },
    ),
    input.readDayProfiles().then(validateDayScan).catch(() => null),
  ]);
  const counts = new Map(PRODUCT_STATISTICS_COUNT_SPECS.map((spec, index) => [spec.key, observed[index]]));
  const totalProfiles = counts.get('total') ?? null;

  const countMetrics = COUNT_METRIC_DEFINITIONS.map<ProductStatisticsMetric>((definition) => {
    const buckets = definition.buckets.map((bucket) => ({
      label: bucket.label,
      count: counts.get(`${definition.id}:${bucket.key}`) ?? null,
    }));
    const hasQueryError = buckets.some((bucket) => bucket.count === null);
    const known = hasQueryError
      ? null
      : buckets.reduce((sum, bucket) => sum + (bucket.count ?? 0), 0);
    const inconsistentTotal = totalProfiles !== null && known !== null && known > totalProfiles;
    const status = hasQueryError || inconsistentTotal
      ? 'error'
      : known === 0
        ? 'empty'
        : 'available';
    return {
      id: definition.id,
      title: definition.title,
      unit: definition.unit,
      description: definition.description,
      knownProfiles: status === 'error' ? null : known,
      missingProfiles: status === 'error' || totalProfiles === null || known === null
        ? null
        : totalProfiles - known,
      status,
      buckets,
    };
  });
  const dayMetrics = DAY_METRIC_DEFINITIONS.map<ProductStatisticsMetric>((definition) =>
    dayScanResult ? exactDayMetric(definition, dayScanResult, totalProfiles) : failedDayMetric(definition));
  const metrics = [...countMetrics, ...dayMetrics];

  const allMetricsFailed = metrics.every((metric) => metric.status === 'error');
  const anyMetricIncomplete = metrics.some((metric) => metric.status === 'error' || metric.status === 'partial');
  const state = totalProfiles === null && allMetricsFailed
    ? 'error'
    : totalProfiles === null || anyMetricIncomplete
      ? 'partial'
      : 'ready';

  const projectedProfilesStatus = dayScanResult === null
    ? 'error' as const
    : dayScanResult.truncated
      ? 'truncated' as const
      : 'complete' as const;
  const unavailable = ['currentStreak:requires_progressAuthority_server_compound_index'];
  const inconsistentDayTotal = dayScanResult !== null && totalProfiles !== null
    && (dayScanResult.truncated
      ? totalProfiles < dayScanResult.documentReads
      : dayMetrics.some((metric) => metric.status === 'partial'));
  if (projectedProfilesStatus === 'truncated') unavailable.push('dayHistograms:profile_scan_cap_reached');
  if (projectedProfilesStatus === 'error') unavailable.push('dayHistograms:source_error');
  if (inconsistentDayTotal) {
    unavailable.push('dayHistograms:total_inconsistent');
  }

  return {
    schemaVersion: 1,
    generatedAtMs: input.nowMs,
    source: 'public_profiles',
    totalProfiles,
    state,
    metrics,
    coverage: {
      projectedProfilesScanned: dayScanResult?.profiles.length ?? null,
      projectedProfilesCap: PRODUCT_STATISTICS_PROFILE_SCAN_CAP,
      projectedProfilesComplete: projectedProfilesStatus === 'complete',
      projectedProfilesStatus,
    },
    cost: {
      aggregationQueries: PRODUCT_STATISTICS_COUNT_SPECS.length,
      projectedDocumentReads: dayScanResult?.documentReads ?? null,
      projectedDocumentReadCap: PRODUCT_STATISTICS_PROFILE_READ_CAP,
      ttlHours: 6,
    },
    unavailable,
  };
}
