export const DAY_MS = 86_400_000;
export const TREND_FRESHNESS_STALE_AFTER_MS = 48 * 60 * 60 * 1000;
export const MAX_PUBLIC_BREAKDOWN_VALUE_LENGTH = 160;

const MAX_RANGE_DAYS = 90;
const PRESETS = [7, 28, 90] as const;
const SCOPES = ['overview', 'paywall'] as const;
const GRANULARITIES = ['day', 'week'] as const;
const VARIANTS = ['A', 'B', 'C'] as const;
const PLANS = ['monthly', 'yearly', 'lifetime', 'max_monthly'] as const;
const STORES = ['APP_STORE', 'PLAY_STORE', 'STRIPE', 'AMAZON', 'PROMOTIONAL'] as const;
const PLATFORMS = ['ios', 'android'] as const;
const PAYWALL_FAILURE_REASON_IDS = [
  'identity_sync',
  'no_active_entitlement_after_purchase',
  'payment_pending',
  'network_error',
  'payment_error',
  'store_error',
  'configuration_error',
  'sdk_other',
  'unknown',
  'legacy_or_other',
] as const;
const MAX_PAYWALL_FAILURE_BREAKDOWN_ROWS = 20;
const STRICT_DATE_RE = /^(?!0000)\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const MIN_SUPPORTED_DATE_MS = Date.parse('0001-01-01T00:00:00.000Z');
const MAX_SUPPORTED_DATE_MS = Date.parse('9999-12-31T00:00:00.000Z');

export type TrendScope = typeof SCOPES[number];
export type TrendGranularity = typeof GRANULARITIES[number];
export type TrendPreset = typeof PRESETS[number];
export type TrendVariant = typeof VARIANTS[number];
export type TrendPlan = typeof PLANS[number];
export type TrendStore = typeof STORES[number];
export type TrendPlatform = typeof PLATFORMS[number];
export type PaywallFailureReasonId = typeof PAYWALL_FAILURE_REASON_IDS[number];

export interface PaywallFailureBreakdownRow {
  readonly id: PaywallFailureReasonId;
  readonly events: number;
  readonly appInstances: number;
}

export interface TrendFilters {
  readonly context?: string;
  readonly variant?: TrendVariant;
  readonly plan?: TrendPlan;
  readonly store?: TrendStore;
  readonly productId?: string;
  readonly platform?: TrendPlatform;
}

export interface NormalizedTrendRequest {
  readonly scope: TrendScope;
  readonly presetDays: TrendPreset | null;
  readonly fromDate: string;
  readonly toDate: string;
  readonly granularity: TrendGranularity;
  readonly comparePrevious: boolean;
  readonly filters: Readonly<TrendFilters>;
}

export interface TrendWindowRequest {
  readonly fromDate: string;
  readonly toDate: string;
  readonly comparePrevious: boolean;
}

export interface TrendRange {
  readonly fromMs: number;
  readonly toMs: number;
}

export interface TrendWindow {
  readonly current: Readonly<TrendRange>;
  readonly previous: Readonly<TrendRange> | null;
}

export type TrendMetricEntity = 'event' | 'transaction' | 'usd_micros';
export type TrendUnit = 'count' | 'ratio' | 'usd_micros';
export type TrendSeriesSource =
  | 'paywall_funnel'
  | 'revenuecat_premium_events'
  | 'revenuecat_shard_transactions';
export type TrendSeriesStatus = 'ready' | 'empty' | 'partial' | 'unavailable';
export type TrendCoverage = 'complete' | 'partial' | 'unavailable';
export type TrendFreshness = 'recent' | 'stale_event_watermark' | 'no_events' | 'unknown';
export type TrendSourceState = 'ready' | 'empty' | 'partial' | 'error' | 'unavailable';

export interface TrendMetricDefinition {
  readonly entity: TrendMetricEntity;
  readonly description: string;
  readonly numerator?: string;
  readonly denominator?: string;
}

export interface TrendPoint {
  readonly bucketStart: string;
  readonly value: number | null;
}

export interface TrendSeries {
  readonly metricId: string;
  readonly label: string;
  readonly unit: TrendUnit;
  readonly source: TrendSeriesSource;
  readonly definition: Readonly<TrendMetricDefinition>;
  readonly status: TrendSeriesStatus;
  readonly coverage: TrendCoverage;
  readonly limitations: readonly string[];
  readonly points: readonly Readonly<TrendPoint>[];
  readonly previousPoints: readonly Readonly<TrendPoint>[] | null;
}

/** Read truth supplied by the source adapter. Freshness fields are normalized by each aggregator. */
export interface TrendSourceHealth {
  readonly state: TrendSourceState;
  readonly truncated?: boolean;
  readonly uncertaintyStartsAtMs?: number | null;
  readonly latestAtMs?: number | null;
  readonly checkedAtMs?: number;
  readonly dataAgeMs?: number | null;
  readonly freshness?: TrendFreshness;
  readonly errorCode?: string | null;
}

export interface ResolvedTrendSourceHealth {
  readonly state: TrendSourceState;
  readonly truncated: boolean;
  readonly uncertaintyStartsAtMs: number | null;
  readonly latestAtMs: number | null;
  readonly checkedAtMs: number;
  readonly dataAgeMs: number | null;
  readonly freshness: TrendFreshness;
  readonly errorCode: string | null;
}

export interface TrendSection {
  readonly id: 'counts' | 'money';
  readonly label: string;
  readonly series: readonly Readonly<TrendSeries>[];
}

export interface TrendBreakdownRow {
  readonly value: string;
  readonly events: number;
}

export interface PaywallTrendRow {
  readonly step?: unknown;
  readonly ts?: unknown;
  readonly dev?: unknown;
  readonly context?: unknown;
  readonly variant?: unknown;
  readonly plan?: unknown;
}

export interface AggregatePaywallTrendOptions {
  readonly includeBreakdowns?: boolean;
}

export interface RevenueCatTrendRow {
  readonly id?: unknown;
  readonly eventId?: unknown;
  readonly transactionId?: unknown;
  readonly eventType?: unknown;
  readonly periodType?: unknown;
  readonly environment?: unknown;
  readonly eventTimestampMs?: unknown;
  readonly store?: unknown;
  readonly productId?: unknown;
  readonly grossUsdMicros?: unknown;
  readonly estimatedProceedsUsdMicros?: unknown;
  readonly financialCoverage?: unknown;
}

export interface ShardTrendRow {
  readonly id?: unknown;
  readonly eventId?: unknown;
  readonly transactionId?: unknown;
  readonly eventType?: unknown;
  readonly environment?: unknown;
  readonly eventTimestampMs?: unknown;
  readonly store?: unknown;
  readonly productId?: unknown;
}

export class TrendValidationError extends Error {
  readonly code = 'invalid-argument' as const;

  constructor(readonly field: string, message: string) {
    super(`${field}: ${message}`);
    this.name = 'TrendValidationError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Pure JSON boundary shared with the Firebase-backed Product Analytics adapter. */
export function parseProductAnalyticsPayloadValue(payload: unknown): Record<string, unknown> | null {
  if (typeof payload !== 'string') return null;
  try {
    const parsed: unknown = JSON.parse(payload);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function normalizePaywallFailureReason(value: unknown): PaywallFailureReasonId {
  return PAYWALL_FAILURE_REASON_IDS.includes(value as PaywallFailureReasonId)
    ? value as PaywallFailureReasonId
    : 'legacy_or_other';
}

function nonNegativeSafeInteger(value: unknown): number {
  return Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : 0;
}

function cappedSafeIntegerSum(left: number, right: number): number {
  // Saturation keeps the public number deterministic and safe when exact aggregation is impossible.
  return left > Number.MAX_SAFE_INTEGER - right
    ? Number.MAX_SAFE_INTEGER
    : left + right;
}

export function extractPaywallFailureBreakdown(
  rows: readonly Readonly<{ row_kind?: unknown; payload?: unknown }>[],
): readonly Readonly<PaywallFailureBreakdownRow>[] {
  const grouped = new Map<PaywallFailureReasonId, { events: number; appInstances: number }>();
  for (const row of rows) {
    if (row.row_kind !== 'conversion_failure') continue;
    const payload = parseProductAnalyticsPayloadValue(row.payload);
    if (!payload) continue;

    const id = normalizePaywallFailureReason(payload.reason);
    const current = grouped.get(id) ?? { events: 0, appInstances: 0 };
    grouped.set(id, {
      events: cappedSafeIntegerSum(current.events, nonNegativeSafeInteger(payload.events)),
      appInstances: cappedSafeIntegerSum(
        current.appInstances,
        nonNegativeSafeInteger(payload.app_instances),
      ),
    });
  }

  const result = Array.from(grouped, ([id, counts]) => Object.freeze({ id, ...counts }))
    .sort((left, right) => (
      right.events - left.events
      || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0)
    ))
    .slice(0, MAX_PAYWALL_FAILURE_BREAKDOWN_ROWS);
  return Object.freeze(result);
}

function enumValue<T extends string | number>(value: unknown, allowed: readonly T[]): T | undefined {
  return allowed.includes(value as T)
    ? value as T
    : undefined;
}

function requireEnum<T extends string | number>(
  value: unknown,
  allowed: readonly T[],
  field: string,
): T {
  const normalized = enumValue(value, allowed);
  if (normalized === undefined) throw new TrendValidationError(field, 'unsupported value');
  return normalized;
}

function boundedString(value: unknown, maxLength: number, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.length > maxLength) {
    throw new TrendValidationError(field, `must be a string of at most ${maxLength} characters`);
  }
  const normalized = value.trim();
  return normalized || undefined;
}

function parseStrictUtcDate(value: unknown, field: string): number {
  if (typeof value !== 'string' || !STRICT_DATE_RE.test(value)) {
    throw new TrendValidationError(field, 'must use YYYY-MM-DD');
  }
  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== value) {
    throw new TrendValidationError(field, 'must be a valid UTC calendar date');
  }
  return parsed;
}

function validTimestamp(value: number, field: string): number {
  if (!Number.isFinite(value) || !Number.isFinite(new Date(value).getTime())) {
    throw new TrendValidationError(field, 'must be a valid JavaScript Date timestamp');
  }
  return value;
}

function supportedTrendTimestamp(value: number, field: string): number {
  const timestamp = validTimestamp(value, field);
  if (timestamp < MIN_SUPPORTED_DATE_MS || timestamp > MAX_SUPPORTED_DATE_MS) {
    throw new TrendValidationError(field, 'must be between 0001-01-01 and 9999-12-31 UTC');
  }
  return timestamp;
}

function freezeRange(
  fromMs: number,
  toMs: number,
  fromField: string,
  toField: string,
): Readonly<TrendRange> {
  return Object.freeze({
    fromMs: supportedTrendTimestamp(fromMs, fromField),
    toMs: supportedTrendTimestamp(toMs, toField),
  });
}

function normalizedRange(
  fromMs: number,
  toMs: number,
  fromField = 'fromMs',
  toField = 'toMs',
): Readonly<TrendRange> {
  const from = supportedTrendTimestamp(startOfUtcDay(validTimestamp(fromMs, fromField)), fromField);
  const to = supportedTrendTimestamp(startOfUtcDay(validTimestamp(toMs, toField)), toField);
  if (from > to) throw new TrendValidationError(fromField, `must not be after ${toField}`);
  const inclusiveDays = ((to - from) / DAY_MS) + 1;
  if (inclusiveDays > MAX_RANGE_DAYS) {
    throw new TrendValidationError(fromField, `range must not exceed ${MAX_RANGE_DAYS} inclusive days`);
  }
  return freezeRange(from, to, fromField, toField);
}

function formatUtcDate(timestampMs: number, field: string): string {
  const timestamp = supportedTrendTimestamp(timestampMs, field);
  return new Date(timestamp).toISOString().slice(0, 10);
}

function normalizeFilters(value: unknown): Readonly<TrendFilters> {
  if (value === undefined) return Object.freeze({});
  if (!isRecord(value)) throw new TrendValidationError('filters', 'must be an object');

  const filters: {
    context?: string;
    variant?: TrendVariant;
    plan?: TrendPlan;
    store?: TrendStore;
    productId?: string;
    platform?: TrendPlatform;
  } = {};
  const context = boundedString(value.context, 40, 'filters.context');
  const variant = enumValue(value.variant, VARIANTS);
  const plan = enumValue(value.plan, PLANS);
  const store = enumValue(value.store, STORES);
  const productId = boundedString(value.productId, 120, 'filters.productId');
  const platform = enumValue(value.platform, PLATFORMS);

  if (context !== undefined) filters.context = context;
  if (variant !== undefined) filters.variant = variant;
  if (plan !== undefined) filters.plan = plan;
  if (store !== undefined) filters.store = store;
  if (productId !== undefined) filters.productId = productId;
  if (platform !== undefined) filters.platform = platform;
  return Object.freeze(filters);
}

export function startOfUtcDay(timestampMs: number): number {
  const timestamp = validTimestamp(timestampMs, 'timestamp');
  const date = new Date(timestamp);
  date.setUTCHours(0, 0, 0, 0);
  return validTimestamp(date.getTime(), 'timestamp');
}

export function startOfUtcWeek(timestampMs: number): number {
  const dayStart = startOfUtcDay(timestampMs);
  const sundayBasedDay = new Date(dayStart).getUTCDay();
  const daysSinceMonday = (sundayBasedDay + 6) % 7;
  return validTimestamp(dayStart - daysSinceMonday * DAY_MS, 'timestamp');
}

export function normalizeTrendRequest(data: unknown, nowMs: number): Readonly<NormalizedTrendRequest> {
  if (!isRecord(data)) throw new TrendValidationError('request', 'must be an object');

  const scope = requireEnum(data.scope, SCOPES, 'scope');
  const granularity = data.granularity === undefined
    ? 'day'
    : requireEnum(data.granularity, GRANULARITIES, 'granularity');
  if (data.comparePrevious !== undefined && typeof data.comparePrevious !== 'boolean') {
    throw new TrendValidationError('comparePrevious', 'must be boolean');
  }
  const comparePrevious = data.comparePrevious ?? false;
  const todayMs = startOfUtcDay(validTimestamp(nowMs, 'nowMs'));

  const hasFromDate = data.fromDate !== undefined;
  const hasToDate = data.toDate !== undefined;
  let presetDays: TrendPreset | null;
  let fromMs: number;
  let toMs: number;
  if (hasFromDate || hasToDate) {
    if (!hasFromDate || !hasToDate) {
      throw new TrendValidationError(
        hasFromDate ? 'toDate' : 'fromDate',
        'fromDate and toDate are required together',
      );
    }
    presetDays = null;
    fromMs = parseStrictUtcDate(data.fromDate, 'fromDate');
    toMs = parseStrictUtcDate(data.toDate, 'toDate');
  } else {
    presetDays = data.presetDays === undefined
      ? 28
      : requireEnum(data.presetDays, PRESETS, 'presetDays');
    toMs = todayMs;
    fromMs = toMs - (presetDays - 1) * DAY_MS;
  }

  if (toMs > todayMs) throw new TrendValidationError('toDate', 'must not be in the future');
  const range = normalizedRange(fromMs, toMs, 'fromDate', 'toDate');
  return Object.freeze({
    scope,
    presetDays,
    fromDate: formatUtcDate(range.fromMs, 'fromDate'),
    toDate: formatUtcDate(range.toMs, 'toDate'),
    granularity,
    comparePrevious,
    filters: normalizeFilters(data.filters),
  });
}

export function buildTrendWindow(
  request: Readonly<TrendWindowRequest>,
): Readonly<TrendWindow> {
  if (!isRecord(request)) throw new TrendValidationError('request', 'must be an object');
  if (typeof request.comparePrevious !== 'boolean') {
    throw new TrendValidationError('comparePrevious', 'must be boolean');
  }
  const current = normalizedRange(
    parseStrictUtcDate(request.fromDate, 'fromDate'),
    parseStrictUtcDate(request.toDate, 'toDate'),
    'fromDate',
    'toDate',
  );
  if (!request.comparePrevious) return Object.freeze({ current, previous: null });

  const rangeLengthMs = current.toMs - current.fromMs + DAY_MS;
  const previous = normalizedRange(
    current.fromMs - rangeLengthMs,
    current.fromMs - DAY_MS,
    'previous.fromDate',
    'previous.toDate',
  );
  return Object.freeze({ current, previous });
}

export function bucketStarts(
  range: Readonly<TrendRange>,
  granularity: TrendGranularity,
): readonly number[] {
  if (!isRecord(range)) throw new TrendValidationError('range', 'must be an object');
  const normalized = normalizedRange(range.fromMs, range.toMs);
  const validGranularity = requireEnum(granularity, GRANULARITIES, 'granularity');
  const stepMs = validGranularity === 'week' ? 7 * DAY_MS : DAY_MS;
  const firstBucketMs = validGranularity === 'week'
    ? startOfUtcWeek(normalized.fromMs)
    : normalized.fromMs;
  const starts: number[] = [];
  for (let cursor = firstBucketMs; cursor <= normalized.toMs; cursor += stepMs) {
    starts.push(cursor);
  }
  return Object.freeze(starts);
}

const PAYWALL_STEPS = [
  'shown',
  'cta_click',
  'trial_started',
  'purchase_completed',
  'purchase_failed',
  'purchase_cancelled',
  'restore_completed',
  'close',
] as const;

type PaywallStep = typeof PAYWALL_STEPS[number];

interface CountMetricSpec {
  readonly metricId: string;
  readonly label: string;
  readonly eventType: string;
  readonly definition: Readonly<TrendMetricDefinition>;
  readonly limitations: readonly string[];
}

interface PreparedTrendContext {
  readonly window: Readonly<TrendWindow>;
  readonly health: Readonly<ResolvedTrendSourceHealth>;
  readonly status: TrendSeriesStatus;
  readonly coverage: TrendCoverage;
}

interface TimestampResult {
  readonly kind: 'valid' | 'undated' | 'invalid';
  readonly value: number | null;
}

interface MoneyBucket {
  sum: number;
  moneyRows: number;
  usableRows: number;
  unsafeTotal: boolean;
}

const EMPTY_SERIES = Object.freeze([]) as readonly Readonly<TrendSeries>[];

function frozenDefinition(
  entity: TrendMetricEntity,
  description: string,
  numerator?: string,
  denominator?: string,
): Readonly<TrendMetricDefinition> {
  const definition: {
    entity: TrendMetricEntity;
    description: string;
    numerator?: string;
    denominator?: string;
  } = { entity, description };
  if (numerator !== undefined) definition.numerator = numerator;
  if (denominator !== undefined) definition.denominator = denominator;
  return Object.freeze(definition);
}

function frozenStrings(values: readonly string[]): readonly string[] {
  return Object.freeze([...values]);
}

const PAYWALL_METRICS: readonly CountMetricSpec[] = Object.freeze([
  ['shown', 'Показы предложения'],
  ['cta_click', 'Нажатия на основную кнопку'],
  ['trial_started', 'Сигналы начала пробного периода'],
  ['purchase_completed', 'Сигналы завершения покупки'],
  ['purchase_failed', 'Ошибки покупки'],
  ['purchase_cancelled', 'Отмены покупки'],
  ['restore_completed', 'Завершённые восстановления'],
  ['close', 'Закрытия предложения'],
].map(([step, label]) => Object.freeze({
  metricId: `paywall.${step}.v1`,
  label,
  eventType: step,
  definition: frozenDefinition(
    'event',
    `Количество сохранённых paywall_funnel событий step=${step}.`,
  ),
  limitations: frozenStrings([
    'Поведенческий сигнал приложения; он не подтверждает результат магазина.',
    'Источник не хранит честные разрезы по store или platform.',
  ]),
})));

export const SUPPORTED_STORE_EVENT_TYPES = Object.freeze([
  'INITIAL_PURCHASE',
  'NON_RENEWING_PURCHASE',
  'RENEWAL',
  'REFUND',
  'BILLING_ISSUE',
  'EXPIRATION',
  'CANCELLATION',
  'UNCANCELLATION',
  'PRODUCT_CHANGE',
  'SUBSCRIPTION_EXTENDED',
] as const);

const SUPPORTED_STORE_EVENT_TYPE_SET = new Set<string>(SUPPORTED_STORE_EVENT_TYPES);

const STORE_EVENT_METRICS: readonly CountMetricSpec[] = Object.freeze([
  Object.freeze({
    metricId: 'store.confirmed_trial_start.v1',
    label: 'Подтверждённые начала пробного периода',
    eventType: 'INITIAL_PURCHASE:TRIAL',
    definition: frozenDefinition(
      'event',
      'Production-события RevenueCat INITIAL_PURCHASE с periodType=TRIAL.',
    ),
    limitations: frozenStrings(['Событие магазина не связывается с показами paywall.']),
  }),
  ...[
    ['INITIAL_PURCHASE', 'store.initial_purchase.v1', 'Первичные покупки'],
    ['NON_RENEWING_PURCHASE', 'store.non_renewing_purchase.v1', 'Разовые покупки'],
    ['RENEWAL', 'store.renewal.v1', 'Продления'],
    ['REFUND', 'store.refund.v1', 'Возвраты'],
    ['BILLING_ISSUE', 'store.billing_issue.v1', 'Проблемы оплаты'],
    ['EXPIRATION', 'store.expiration.v1', 'Истечения доступа'],
    ['CANCELLATION', 'store.cancellation.v1', 'Отмены продления'],
    ['UNCANCELLATION', 'store.uncancellation.v1', 'Отмены отключения продления'],
    ['PRODUCT_CHANGE', 'store.product_change.v1', 'Изменения продукта'],
    ['SUBSCRIPTION_EXTENDED', 'store.subscription_extended.v1', 'Продления срока доступа'],
  ].map(([eventType, metricId, label]) => Object.freeze({
    metricId,
    label,
    eventType,
    definition: frozenDefinition(
      'event',
      `Количество production-событий RevenueCat типа ${eventType}.`,
    ),
    limitations: frozenStrings(['Событие магазина не связывается с показами paywall.']),
  })),
]);

const SHARD_TRANSACTION_METRIC: CountMetricSpec = Object.freeze({
  metricId: 'shards.store_transaction.v1',
  label: 'Покупки наборов осколков',
  eventType: 'TRANSACTION',
  definition: frozenDefinition(
    'transaction',
    'Уникальные production-транзакции из revenuecat_shard_transactions.',
  ),
  limitations: frozenStrings([
    'Транзакции осколков считаются отдельно от событий премиум-доступа RevenueCat.',
  ]),
});

const GROSS_METRIC = Object.freeze({
  metricId: 'revenue.gross_usd_micros.v1',
  label: 'Валовая сумма, USD',
  definition: frozenDefinition(
    'usd_micros',
    'Знаковая сумма сохранённого grossUsdMicros для денежных production-событий RevenueCat.',
  ),
  limitations: frozenStrings([
    'Неполная сумма bucket скрывается целиком и не показывается как известный subtotal.',
    'grossUsdMicros не выводится из proceeds, tax или других финансовых полей.',
  ]),
});

const MONEY_EVENT_TYPES = new Set([
  'INITIAL_PURCHASE',
  'NON_RENEWING_PURCHASE',
  'RENEWAL',
  'REFUND',
]);

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

function upperText(value: unknown): string {
  return cleanText(value).toUpperCase();
}

function timestampResult(value: unknown): TimestampResult {
  if (value === undefined || value === null || value === '') {
    return { kind: 'undated', value: null };
  }
  let candidate: number;
  if (value instanceof Date) candidate = value.getTime();
  else if (typeof value === 'object') {
    const timestamp = value as { toMillis?: () => number; seconds?: number };
    if (typeof timestamp.toMillis === 'function') candidate = timestamp.toMillis();
    else if (typeof timestamp.seconds === 'number') candidate = timestamp.seconds * 1000;
    else return { kind: 'invalid', value: null };
  } else if (typeof value === 'number') candidate = value;
  else if (typeof value === 'string' && /^\d+$/.test(value.trim())) candidate = Number(value);
  else return { kind: 'invalid', value: null };

  const normalized = Math.floor(candidate);
  if (
    !Number.isFinite(candidate)
    || !Number.isFinite(new Date(normalized).getTime())
    || normalized < MIN_SUPPORTED_DATE_MS
    || normalized > MAX_SUPPORTED_DATE_MS + DAY_MS - 1
  ) return { kind: 'invalid', value: null };
  return { kind: 'valid', value: normalized };
}

function usableInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : null;
}

function rangeContains(range: Readonly<TrendRange>, timestampMs: number): boolean {
  return timestampMs >= range.fromMs && timestampMs < range.toMs + DAY_MS;
}

function relevantRange(window: Readonly<TrendWindow>, timestampMs: number): 'current' | 'previous' | null {
  if (rangeContains(window.current, timestampMs)) return 'current';
  if (window.previous && rangeContains(window.previous, timestampMs)) return 'previous';
  return null;
}

function bucketKey(timestampMs: number, granularity: TrendGranularity): number {
  return granularity === 'week' ? startOfUtcWeek(timestampMs) : startOfUtcDay(timestampMs);
}

function latestValidTimestamp(rows: readonly unknown[], field: string): number | null {
  let latest: number | null = null;
  for (const candidate of rows) {
    if (!isRecord(candidate)) continue;
    const parsed = timestampResult(candidate[field]);
    if (parsed.kind === 'valid' && parsed.value !== null) {
      latest = Math.max(latest ?? parsed.value, parsed.value);
    }
  }
  return latest;
}

function resolveHealth(
  sourceHealth: Readonly<TrendSourceHealth>,
  request: Readonly<NormalizedTrendRequest>,
  rows: readonly unknown[],
  timestampField: string,
): Readonly<ResolvedTrendSourceHealth> {
  const truncated = sourceHealth.truncated === true;
  const unavailable = sourceHealth.state === 'error' || sourceHealth.state === 'unavailable';
  const state: TrendSourceState = truncated && !unavailable ? 'partial' : sourceHealth.state;
  const suppliedLatest = timestampResult(sourceHealth.latestAtMs);
  const latestAtMs = suppliedLatest.kind === 'valid'
    ? suppliedLatest.value
    : latestValidTimestamp(rows, timestampField);
  const suppliedChecked = timestampResult(sourceHealth.checkedAtMs);
  const checkedAtMs = suppliedChecked.kind === 'valid' && suppliedChecked.value !== null
    ? suppliedChecked.value
    : parseStrictUtcDate(request.toDate, 'toDate') + DAY_MS - 1;
  const dataAgeMs = latestAtMs === null ? null : Math.max(0, checkedAtMs - latestAtMs);
  let freshness: TrendFreshness;
  if (unavailable) freshness = 'unknown';
  else if (latestAtMs === null) freshness = state === 'ready' || state === 'empty' ? 'no_events' : 'unknown';
  else freshness = dataAgeMs !== null && dataAgeMs > TREND_FRESHNESS_STALE_AFTER_MS
    ? 'stale_event_watermark'
    : 'recent';
  const uncertainty = timestampResult(sourceHealth.uncertaintyStartsAtMs);
  return Object.freeze({
    state,
    truncated,
    uncertaintyStartsAtMs: uncertainty.kind === 'valid' ? uncertainty.value : null,
    latestAtMs,
    checkedAtMs,
    dataAgeMs,
    freshness,
    errorCode: cleanText(sourceHealth.errorCode) || null,
  });
}

function prepareContext(
  sourceHealth: Readonly<TrendSourceHealth>,
  request: Readonly<NormalizedTrendRequest>,
  rows: readonly unknown[],
  timestampField: string,
): PreparedTrendContext {
  const window = buildTrendWindow(request);
  const health = resolveHealth(sourceHealth, request, rows, timestampField);
  if (health.state === 'error' || health.state === 'unavailable') {
    return { window, health, status: 'unavailable', coverage: 'unavailable' };
  }
  if (health.state === 'partial' || health.truncated) {
    return { window, health, status: 'partial', coverage: 'partial' };
  }
  return {
    window,
    health,
    status: health.state === 'empty' ? 'empty' : 'ready',
    coverage: 'complete',
  };
}

function uncertainBucket(
  bucketStartMs: number,
  granularity: TrendGranularity,
  context: PreparedTrendContext,
): boolean {
  if (context.status === 'unavailable') return true;
  if (context.coverage !== 'partial') return false;
  const boundary = context.health.uncertaintyStartsAtMs;
  if (boundary === null) return true;
  const bucketEndExclusive = bucketStartMs + (granularity === 'week' ? 7 * DAY_MS : DAY_MS);
  return bucketEndExclusive > boundary;
}

function frozenPoints(
  range: Readonly<TrendRange>,
  granularity: TrendGranularity,
  context: PreparedTrendContext,
  valueAt: (bucketStartMs: number) => number | null,
): readonly Readonly<TrendPoint>[] {
  return Object.freeze(bucketStarts(range, granularity).map((bucketStartMs) => Object.freeze({
    bucketStart: formatUtcDate(bucketStartMs, 'bucketStart'),
    value: uncertainBucket(bucketStartMs, granularity, context) ? null : valueAt(bucketStartMs),
  })));
}

function countSeries(
  specs: readonly CountMetricSpec[],
  source: TrendSeriesSource,
  counts: ReadonlyMap<string, ReadonlyMap<number, number>>,
  request: Readonly<NormalizedTrendRequest>,
  context: PreparedTrendContext,
): readonly Readonly<TrendSeries>[] {
  return Object.freeze(specs.map((spec) => {
    const currentValues = counts.get(`current:${spec.eventType}`) ?? new Map<number, number>();
    const previousValues = counts.get(`previous:${spec.eventType}`) ?? new Map<number, number>();
    const currentValueAt = (bucketStartMs: number) => currentValues.get(bucketStartMs) ?? 0;
    const previousValueAt = (bucketStartMs: number) => previousValues.get(bucketStartMs) ?? 0;
    return Object.freeze({
      metricId: spec.metricId,
      label: spec.label,
      unit: 'count' as const,
      source,
      definition: spec.definition,
      status: context.status,
      coverage: context.coverage,
      limitations: spec.limitations,
      points: frozenPoints(context.window.current, request.granularity, context, currentValueAt),
      previousPoints: context.window.previous
        ? frozenPoints(context.window.previous, request.granularity, context, previousValueAt)
        : null,
    });
  }));
}

function increment(
  counts: Map<string, Map<number, number>>,
  metricKey: string,
  bucketStartMs: number,
): void {
  const values = counts.get(metricKey) ?? new Map<number, number>();
  values.set(bucketStartMs, (values.get(bucketStartMs) ?? 0) + 1);
  counts.set(metricKey, values);
}

function sourceSections(
  counts: readonly Readonly<TrendSeries>[],
  money: readonly Readonly<TrendSeries>[],
): readonly Readonly<TrendSection>[] {
  const sections: Readonly<TrendSection>[] = [Object.freeze({
    id: 'counts' as const,
    label: 'Количество событий',
    series: counts,
  })];
  if (money.length > 0) sections.push(Object.freeze({
    id: 'money' as const,
    label: 'Деньги',
    series: money,
  }));
  return Object.freeze(sections);
}

function breakdownRows(counts: ReadonlyMap<string, number>): readonly Readonly<TrendBreakdownRow>[] {
  const sorted = [...counts.entries()]
    .map(([value, events]) => ({ value, events }))
    .sort((left, right) => right.events - left.events
      || (left.value < right.value ? -1 : left.value > right.value ? 1 : 0));
  if (sorted.length <= 20) return Object.freeze(sorted.map((row) => Object.freeze(row)));
  const realOtherEvents = counts.get('other') ?? 0;
  const withoutRealOther = sorted.filter((row) => row.value !== 'other');
  const visible = withoutRealOther.slice(0, 19);
  const otherEvents = withoutRealOther.slice(19).reduce((sum, row) => sum + row.events, realOtherEvents);
  return Object.freeze([
    ...visible.map((row) => Object.freeze(row)),
    Object.freeze({ value: 'other', events: otherEvents }),
  ]);
}

function incrementBreakdown(counts: Map<string, number>, value: unknown): void {
  const cleaned = cleanText(value);
  const key = !cleaned
    ? 'unknown'
    : cleaned.length > MAX_PUBLIC_BREAKDOWN_VALUE_LENGTH
      ? 'other'
      : cleaned;
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

function baseExcluded(): { undated: number; invalidTimestamp: number; outsideWindow: number; filtered: number } {
  return { undated: 0, invalidTimestamp: 0, outsideWindow: 0, filtered: 0 };
}

function timestampOrExclude(
  value: unknown,
  excluded: { undated: number; invalidTimestamp: number },
): number | null {
  const parsed = timestampResult(value);
  if (parsed.kind === 'undated') excluded.undated += 1;
  else if (parsed.kind === 'invalid') excluded.invalidTimestamp += 1;
  return parsed.value;
}

function matchesPaywallFilters(
  row: PaywallTrendRow,
  filters: Readonly<TrendFilters>,
): boolean {
  return (filters.context === undefined || cleanText(row.context) === filters.context)
    && (filters.variant === undefined || cleanText(row.variant) === filters.variant)
    && (filters.plan === undefined || cleanText(row.plan) === filters.plan);
}

function matchesStoreFilters(
  row: Pick<RevenueCatTrendRow, 'store' | 'productId'>,
  filters: Readonly<TrendFilters>,
): boolean {
  return (filters.store === undefined || upperText(row.store) === filters.store)
    && (filters.productId === undefined || cleanText(row.productId) === filters.productId);
}

export function aggregatePaywallTrends(
  rows: readonly PaywallTrendRow[],
  request: Readonly<NormalizedTrendRequest>,
  sourceHealth: Readonly<TrendSourceHealth>,
  options: Readonly<AggregatePaywallTrendOptions> = {},
) {
  const context = prepareContext(sourceHealth, request, rows, 'ts');
  const counts = new Map<string, Map<number, number>>();
  const includeBreakdowns = options.includeBreakdowns !== false;
  const contextBreakdown = includeBreakdowns ? new Map<string, number>() : null;
  const variantBreakdown = includeBreakdowns ? new Map<string, number>() : null;
  const planBreakdown = includeBreakdowns ? new Map<string, number>() : null;
  const excluded = { ...baseExcluded(), dev: 0, invalidStep: 0 };

  for (const row of rows) {
    if (row.dev === true) { excluded.dev += 1; continue; }
    const step = cleanText(row.step) as PaywallStep;
    if (!PAYWALL_STEPS.includes(step)) { excluded.invalidStep += 1; continue; }
    if (!matchesPaywallFilters(row, request.filters)) { excluded.filtered += 1; continue; }
    const timestampMs = timestampOrExclude(row.ts, excluded);
    if (timestampMs === null) continue;
    const period = relevantRange(context.window, timestampMs);
    if (period === null) { excluded.outsideWindow += 1; continue; }
    increment(counts, `${period}:${step}`, bucketKey(timestampMs, request.granularity));
    if (
      period === 'current'
      && contextBreakdown !== null
      && variantBreakdown !== null
      && planBreakdown !== null
    ) {
      incrementBreakdown(contextBreakdown, row.context);
      incrementBreakdown(variantBreakdown, row.variant);
      incrementBreakdown(planBreakdown, row.plan);
    }
  }

  const frozenCounts = countSeries(PAYWALL_METRICS, 'paywall_funnel', counts, request, context);
  const frozenExcluded = Object.freeze(excluded);
  const breakdowns = Object.freeze({
    context: contextBreakdown === null ? Object.freeze([]) : breakdownRows(contextBreakdown),
    variant: variantBreakdown === null ? Object.freeze([]) : breakdownRows(variantBreakdown),
    plan: planBreakdown === null ? Object.freeze([]) : breakdownRows(planBreakdown),
  });
  const sections = sourceSections(frozenCounts, EMPTY_SERIES);
  return Object.freeze({
    source: 'paywall_funnel' as const,
    health: context.health,
    excluded: frozenExcluded,
    breakdowns,
    countSeries: frozenCounts,
    moneySeries: EMPTY_SERIES,
    sections,
  });
}

function productionEnvironment(value: unknown): 'production' | 'sandbox' | 'unknown' {
  const environment = upperText(value);
  if (environment === 'PRODUCTION') return 'production';
  if (environment === 'SANDBOX') return 'sandbox';
  return 'unknown';
}

/** RevenueCat event identity rule: eventId, then document id, then transactionId, then row position. */
function revenueCatIdentity(row: RevenueCatTrendRow, index: number): string {
  const eventId = cleanText(row.eventId);
  if (eventId) return `event:${eventId}`;
  const documentId = cleanText(row.id);
  if (documentId) return `document:${documentId}`;
  const transactionId = cleanText(row.transactionId);
  return transactionId ? `transaction:${transactionId}` : `row:${index}`;
}

function boundedLegacyIdentity(value: unknown): string | null {
  const identity = cleanText(value);
  return identity && identity.length <= 256 ? identity : null;
}

/** The Firestore document id is the transaction key for revenuecat_shard_transactions. */
function shardIdentity(row: ShardTrendRow, index: number): string {
  const documentId = cleanText(row.id);
  if (documentId) return `document:${documentId}`;
  const eventId = boundedLegacyIdentity(row.eventId);
  if (eventId) return `event:${eventId}`;
  const transactionId = boundedLegacyIdentity(row.transactionId);
  return transactionId ? `transaction:${transactionId}` : `row:${index}`;
}

function moneySeries(
  moneyBuckets: ReadonlyMap<string, MoneyBucket>,
  request: Readonly<NormalizedTrendRequest>,
  context: PreparedTrendContext,
): readonly Readonly<TrendSeries>[] {
  const financialPartial = [...moneyBuckets.values()].some(
    (bucket) => bucket.moneyRows !== bucket.usableRows || bucket.unsafeTotal,
  );
  const status: TrendSeriesStatus = context.status === 'unavailable'
    ? 'unavailable'
    : context.status === 'partial' || financialPartial
      ? 'partial'
      : context.status;
  const coverage: TrendCoverage = context.coverage === 'unavailable'
    ? 'unavailable'
    : context.coverage === 'partial' || financialPartial
      ? 'partial'
      : 'complete';
  const valueAt = (period: 'current' | 'previous', bucketStartMs: number): number | null => {
    const bucket = moneyBuckets.get(`${period}:${bucketStartMs}`);
    if (!bucket) return 0;
    return bucket.moneyRows === bucket.usableRows && !bucket.unsafeTotal ? bucket.sum : null;
  };
  return Object.freeze([Object.freeze({
    metricId: GROSS_METRIC.metricId,
    label: GROSS_METRIC.label,
    unit: 'usd_micros' as const,
    source: 'revenuecat_premium_events' as const,
    definition: GROSS_METRIC.definition,
    status,
    coverage,
    limitations: GROSS_METRIC.limitations,
    points: frozenPoints(
      context.window.current,
      request.granularity,
      context,
      (bucketStartMs) => valueAt('current', bucketStartMs),
    ),
    previousPoints: context.window.previous
      ? frozenPoints(
        context.window.previous,
        request.granularity,
        context,
        (bucketStartMs) => valueAt('previous', bucketStartMs),
      )
      : null,
  })]);
}

export function aggregateRevenueCatTrends(
  rows: readonly RevenueCatTrendRow[],
  request: Readonly<NormalizedTrendRequest>,
  sourceHealth: Readonly<TrendSourceHealth>,
) {
  const context = prepareContext(sourceHealth, request, rows, 'eventTimestampMs');
  const counts = new Map<string, Map<number, number>>();
  const moneyBuckets = new Map<string, MoneyBucket>();
  const seen = new Set<string>();
  const excluded = {
    ...baseExcluded(),
    sandbox: 0,
    unknownEnvironment: 0,
    duplicates: 0,
    unknownEventType: 0,
    unsafeGrossTotalBuckets: 0,
  };

  rows.forEach((row, index) => {
    const environment = productionEnvironment(row.environment);
    if (environment === 'sandbox') { excluded.sandbox += 1; return; }
    if (environment === 'unknown') { excluded.unknownEnvironment += 1; return; }
    const identity = revenueCatIdentity(row, index);
    if (seen.has(identity)) { excluded.duplicates += 1; return; }
    seen.add(identity);
    if (!matchesStoreFilters(row, request.filters)) { excluded.filtered += 1; return; }
    const timestampMs = timestampOrExclude(row.eventTimestampMs, excluded);
    if (timestampMs === null) return;
    const period = relevantRange(context.window, timestampMs);
    if (period === null) { excluded.outsideWindow += 1; return; }
    const eventType = upperText(row.eventType);
    if (!SUPPORTED_STORE_EVENT_TYPE_SET.has(eventType)) {
      excluded.unknownEventType += 1;
      return;
    }
    const bucketStartMs = bucketKey(timestampMs, request.granularity);
    increment(counts, `${period}:${eventType}`, bucketStartMs);
    if (eventType === 'INITIAL_PURCHASE' && upperText(row.periodType) === 'TRIAL') {
      increment(counts, `${period}:INITIAL_PURCHASE:TRIAL`, bucketStartMs);
    }
    if (MONEY_EVENT_TYPES.has(eventType)) {
      const moneyBucketKey = `${period}:${bucketStartMs}`;
      const bucket = moneyBuckets.get(moneyBucketKey) ?? {
        sum: 0,
        moneyRows: 0,
        usableRows: 0,
        unsafeTotal: false,
      };
      bucket.moneyRows += 1;
      const gross = usableInteger(row.grossUsdMicros);
      if (gross !== null) {
        bucket.usableRows += 1;
        const nextTotal = bucket.sum + gross;
        if (!bucket.unsafeTotal && Number.isSafeInteger(nextTotal)) {
          bucket.sum = nextTotal;
        } else if (!bucket.unsafeTotal) {
          bucket.unsafeTotal = true;
          excluded.unsafeGrossTotalBuckets += 1;
        }
      }
      moneyBuckets.set(moneyBucketKey, bucket);
    }
  });

  const frozenCounts = countSeries(
    STORE_EVENT_METRICS,
    'revenuecat_premium_events',
    counts,
    request,
    context,
  );
  const frozenMoney = moneySeries(moneyBuckets, request, context);
  const sections = sourceSections(frozenCounts, frozenMoney);
  return Object.freeze({
    source: 'revenuecat_premium_events' as const,
    health: context.health,
    excluded: Object.freeze(excluded),
    countSeries: frozenCounts,
    moneySeries: frozenMoney,
    sections,
  });
}

export function aggregateShardTrends(
  rows: readonly ShardTrendRow[],
  request: Readonly<NormalizedTrendRequest>,
  sourceHealth: Readonly<TrendSourceHealth>,
) {
  const context = prepareContext(sourceHealth, request, rows, 'eventTimestampMs');
  const counts = new Map<string, Map<number, number>>();
  const seen = new Set<string>();
  const excluded = {
    ...baseExcluded(),
    sandbox: 0,
    unknownEnvironment: 0,
    duplicates: 0,
  };

  rows.forEach((row, index) => {
    const environment = productionEnvironment(row.environment);
    if (environment === 'sandbox') { excluded.sandbox += 1; return; }
    if (environment === 'unknown') { excluded.unknownEnvironment += 1; return; }
    const identity = shardIdentity(row, index);
    if (seen.has(identity)) { excluded.duplicates += 1; return; }
    seen.add(identity);
    if (!matchesStoreFilters(row, request.filters)) { excluded.filtered += 1; return; }
    const timestampMs = timestampOrExclude(row.eventTimestampMs, excluded);
    if (timestampMs === null) return;
    const period = relevantRange(context.window, timestampMs);
    if (period === null) { excluded.outsideWindow += 1; return; }
    increment(
      counts,
      `${period}:${SHARD_TRANSACTION_METRIC.eventType}`,
      bucketKey(timestampMs, request.granularity),
    );
  });

  const frozenCounts = countSeries(
    [SHARD_TRANSACTION_METRIC],
    'revenuecat_shard_transactions',
    counts,
    request,
    context,
  );
  const sections = sourceSections(frozenCounts, EMPTY_SERIES);
  return Object.freeze({
    source: 'revenuecat_shard_transactions' as const,
    health: context.health,
    excluded: Object.freeze(excluded),
    countSeries: frozenCounts,
    moneySeries: EMPTY_SERIES,
    sections,
  });
}
