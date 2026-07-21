"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUPPORTED_STORE_EVENT_TYPES = exports.TrendValidationError = exports.MAX_PUBLIC_BREAKDOWN_VALUE_LENGTH = exports.TREND_FRESHNESS_STALE_AFTER_MS = exports.DAY_MS = void 0;
exports.parseProductAnalyticsPayloadValue = parseProductAnalyticsPayloadValue;
exports.extractPaywallFailureBreakdown = extractPaywallFailureBreakdown;
exports.startOfUtcDay = startOfUtcDay;
exports.startOfUtcWeek = startOfUtcWeek;
exports.normalizeTrendRequest = normalizeTrendRequest;
exports.buildTrendWindow = buildTrendWindow;
exports.bucketStarts = bucketStarts;
exports.aggregatePaywallTrends = aggregatePaywallTrends;
exports.aggregateRevenueCatTrends = aggregateRevenueCatTrends;
exports.aggregateShardTrends = aggregateShardTrends;
exports.DAY_MS = 86400000;
exports.TREND_FRESHNESS_STALE_AFTER_MS = 48 * 60 * 60 * 1000;
exports.MAX_PUBLIC_BREAKDOWN_VALUE_LENGTH = 160;
const MAX_RANGE_DAYS = 90;
const PRESETS = [7, 28, 90];
const SCOPES = ['overview', 'paywall'];
const GRANULARITIES = ['day', 'week'];
const VARIANTS = ['A', 'B', 'C'];
const PLANS = ['monthly', 'yearly', 'lifetime'];
const STORES = ['APP_STORE', 'PLAY_STORE', 'STRIPE', 'AMAZON', 'PROMOTIONAL'];
const PLATFORMS = ['ios', 'android'];
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
];
const MAX_PAYWALL_FAILURE_BREAKDOWN_ROWS = 20;
const STRICT_DATE_RE = /^(?!0000)\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const MIN_SUPPORTED_DATE_MS = Date.parse('0001-01-01T00:00:00.000Z');
const MAX_SUPPORTED_DATE_MS = Date.parse('9999-12-31T00:00:00.000Z');
class TrendValidationError extends Error {
    constructor(field, message) {
        super(`${field}: ${message}`);
        this.field = field;
        this.code = 'invalid-argument';
        this.name = 'TrendValidationError';
    }
}
exports.TrendValidationError = TrendValidationError;
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/** Pure JSON boundary shared with the Firebase-backed Product Analytics adapter. */
function parseProductAnalyticsPayloadValue(payload) {
    if (typeof payload !== 'string')
        return null;
    try {
        const parsed = JSON.parse(payload);
        return isRecord(parsed) ? parsed : null;
    }
    catch {
        return null;
    }
}
function normalizePaywallFailureReason(value) {
    return PAYWALL_FAILURE_REASON_IDS.includes(value)
        ? value
        : 'legacy_or_other';
}
function nonNegativeSafeInteger(value) {
    return Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : 0;
}
function cappedSafeIntegerSum(left, right) {
    // Saturation keeps the public number deterministic and safe when exact aggregation is impossible.
    return left > Number.MAX_SAFE_INTEGER - right
        ? Number.MAX_SAFE_INTEGER
        : left + right;
}
function extractPaywallFailureBreakdown(rows) {
    const grouped = new Map();
    for (const row of rows) {
        if (row.row_kind !== 'conversion_failure')
            continue;
        const payload = parseProductAnalyticsPayloadValue(row.payload);
        if (!payload)
            continue;
        const id = normalizePaywallFailureReason(payload.reason);
        const current = grouped.get(id) ?? { events: 0, appInstances: 0 };
        grouped.set(id, {
            events: cappedSafeIntegerSum(current.events, nonNegativeSafeInteger(payload.events)),
            appInstances: cappedSafeIntegerSum(current.appInstances, nonNegativeSafeInteger(payload.app_instances)),
        });
    }
    const result = Array.from(grouped, ([id, counts]) => Object.freeze({ id, ...counts }))
        .sort((left, right) => (right.events - left.events
        || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0)))
        .slice(0, MAX_PAYWALL_FAILURE_BREAKDOWN_ROWS);
    return Object.freeze(result);
}
function enumValue(value, allowed) {
    return allowed.includes(value)
        ? value
        : undefined;
}
function requireEnum(value, allowed, field) {
    const normalized = enumValue(value, allowed);
    if (normalized === undefined)
        throw new TrendValidationError(field, 'unsupported value');
    return normalized;
}
function boundedString(value, maxLength, field) {
    if (value === undefined)
        return undefined;
    if (typeof value !== 'string' || value.length > maxLength) {
        throw new TrendValidationError(field, `must be a string of at most ${maxLength} characters`);
    }
    const normalized = value.trim();
    return normalized || undefined;
}
function parseStrictUtcDate(value, field) {
    if (typeof value !== 'string' || !STRICT_DATE_RE.test(value)) {
        throw new TrendValidationError(field, 'must use YYYY-MM-DD');
    }
    const parsed = Date.parse(`${value}T00:00:00.000Z`);
    if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== value) {
        throw new TrendValidationError(field, 'must be a valid UTC calendar date');
    }
    return parsed;
}
function validTimestamp(value, field) {
    if (!Number.isFinite(value) || !Number.isFinite(new Date(value).getTime())) {
        throw new TrendValidationError(field, 'must be a valid JavaScript Date timestamp');
    }
    return value;
}
function supportedTrendTimestamp(value, field) {
    const timestamp = validTimestamp(value, field);
    if (timestamp < MIN_SUPPORTED_DATE_MS || timestamp > MAX_SUPPORTED_DATE_MS) {
        throw new TrendValidationError(field, 'must be between 0001-01-01 and 9999-12-31 UTC');
    }
    return timestamp;
}
function freezeRange(fromMs, toMs, fromField, toField) {
    return Object.freeze({
        fromMs: supportedTrendTimestamp(fromMs, fromField),
        toMs: supportedTrendTimestamp(toMs, toField),
    });
}
function normalizedRange(fromMs, toMs, fromField = 'fromMs', toField = 'toMs') {
    const from = supportedTrendTimestamp(startOfUtcDay(validTimestamp(fromMs, fromField)), fromField);
    const to = supportedTrendTimestamp(startOfUtcDay(validTimestamp(toMs, toField)), toField);
    if (from > to)
        throw new TrendValidationError(fromField, `must not be after ${toField}`);
    const inclusiveDays = ((to - from) / exports.DAY_MS) + 1;
    if (inclusiveDays > MAX_RANGE_DAYS) {
        throw new TrendValidationError(fromField, `range must not exceed ${MAX_RANGE_DAYS} inclusive days`);
    }
    return freezeRange(from, to, fromField, toField);
}
function formatUtcDate(timestampMs, field) {
    const timestamp = supportedTrendTimestamp(timestampMs, field);
    return new Date(timestamp).toISOString().slice(0, 10);
}
function normalizeFilters(value) {
    if (value === undefined)
        return Object.freeze({});
    if (!isRecord(value))
        throw new TrendValidationError('filters', 'must be an object');
    const filters = {};
    const context = boundedString(value.context, 40, 'filters.context');
    const variant = enumValue(value.variant, VARIANTS);
    const plan = enumValue(value.plan, PLANS);
    const store = enumValue(value.store, STORES);
    const productId = boundedString(value.productId, 120, 'filters.productId');
    const platform = enumValue(value.platform, PLATFORMS);
    if (context !== undefined)
        filters.context = context;
    if (variant !== undefined)
        filters.variant = variant;
    if (plan !== undefined)
        filters.plan = plan;
    if (store !== undefined)
        filters.store = store;
    if (productId !== undefined)
        filters.productId = productId;
    if (platform !== undefined)
        filters.platform = platform;
    return Object.freeze(filters);
}
function startOfUtcDay(timestampMs) {
    const timestamp = validTimestamp(timestampMs, 'timestamp');
    const date = new Date(timestamp);
    date.setUTCHours(0, 0, 0, 0);
    return validTimestamp(date.getTime(), 'timestamp');
}
function startOfUtcWeek(timestampMs) {
    const dayStart = startOfUtcDay(timestampMs);
    const sundayBasedDay = new Date(dayStart).getUTCDay();
    const daysSinceMonday = (sundayBasedDay + 6) % 7;
    return validTimestamp(dayStart - daysSinceMonday * exports.DAY_MS, 'timestamp');
}
function normalizeTrendRequest(data, nowMs) {
    if (!isRecord(data))
        throw new TrendValidationError('request', 'must be an object');
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
    let presetDays;
    let fromMs;
    let toMs;
    if (hasFromDate || hasToDate) {
        if (!hasFromDate || !hasToDate) {
            throw new TrendValidationError(hasFromDate ? 'toDate' : 'fromDate', 'fromDate and toDate are required together');
        }
        presetDays = null;
        fromMs = parseStrictUtcDate(data.fromDate, 'fromDate');
        toMs = parseStrictUtcDate(data.toDate, 'toDate');
    }
    else {
        presetDays = data.presetDays === undefined
            ? 28
            : requireEnum(data.presetDays, PRESETS, 'presetDays');
        toMs = todayMs;
        fromMs = toMs - (presetDays - 1) * exports.DAY_MS;
    }
    if (toMs > todayMs)
        throw new TrendValidationError('toDate', 'must not be in the future');
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
function buildTrendWindow(request) {
    if (!isRecord(request))
        throw new TrendValidationError('request', 'must be an object');
    if (typeof request.comparePrevious !== 'boolean') {
        throw new TrendValidationError('comparePrevious', 'must be boolean');
    }
    const current = normalizedRange(parseStrictUtcDate(request.fromDate, 'fromDate'), parseStrictUtcDate(request.toDate, 'toDate'), 'fromDate', 'toDate');
    if (!request.comparePrevious)
        return Object.freeze({ current, previous: null });
    const rangeLengthMs = current.toMs - current.fromMs + exports.DAY_MS;
    const previous = normalizedRange(current.fromMs - rangeLengthMs, current.fromMs - exports.DAY_MS, 'previous.fromDate', 'previous.toDate');
    return Object.freeze({ current, previous });
}
function bucketStarts(range, granularity) {
    if (!isRecord(range))
        throw new TrendValidationError('range', 'must be an object');
    const normalized = normalizedRange(range.fromMs, range.toMs);
    const validGranularity = requireEnum(granularity, GRANULARITIES, 'granularity');
    const stepMs = validGranularity === 'week' ? 7 * exports.DAY_MS : exports.DAY_MS;
    const firstBucketMs = validGranularity === 'week'
        ? startOfUtcWeek(normalized.fromMs)
        : normalized.fromMs;
    const starts = [];
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
];
const EMPTY_SERIES = Object.freeze([]);
function frozenDefinition(entity, description, numerator, denominator) {
    const definition = { entity, description };
    if (numerator !== undefined)
        definition.numerator = numerator;
    if (denominator !== undefined)
        definition.denominator = denominator;
    return Object.freeze(definition);
}
function frozenStrings(values) {
    return Object.freeze([...values]);
}
const PAYWALL_METRICS = Object.freeze([
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
    definition: frozenDefinition('event', `Количество сохранённых paywall_funnel событий step=${step}.`),
    limitations: frozenStrings([
        'Поведенческий сигнал приложения; он не подтверждает результат магазина.',
        'Источник не хранит честные разрезы по store или platform.',
    ]),
})));
exports.SUPPORTED_STORE_EVENT_TYPES = Object.freeze([
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
]);
const SUPPORTED_STORE_EVENT_TYPE_SET = new Set(exports.SUPPORTED_STORE_EVENT_TYPES);
const STORE_EVENT_METRICS = Object.freeze([
    Object.freeze({
        metricId: 'store.confirmed_trial_start.v1',
        label: 'Подтверждённые начала пробного периода',
        eventType: 'INITIAL_PURCHASE:TRIAL',
        definition: frozenDefinition('event', 'Production-события RevenueCat INITIAL_PURCHASE с periodType=TRIAL.'),
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
        definition: frozenDefinition('event', `Количество production-событий RevenueCat типа ${eventType}.`),
        limitations: frozenStrings(['Событие магазина не связывается с показами paywall.']),
    })),
]);
const SHARD_TRANSACTION_METRIC = Object.freeze({
    metricId: 'shards.store_transaction.v1',
    label: 'Покупки наборов осколков',
    eventType: 'TRANSACTION',
    definition: frozenDefinition('transaction', 'Уникальные production-транзакции из revenuecat_shard_transactions.'),
    limitations: frozenStrings([
        'Транзакции осколков считаются отдельно от событий премиум-доступа RevenueCat.',
    ]),
});
const GROSS_METRIC = Object.freeze({
    metricId: 'revenue.gross_usd_micros.v1',
    label: 'Валовая сумма, USD',
    definition: frozenDefinition('usd_micros', 'Знаковая сумма сохранённого grossUsdMicros для денежных production-событий RevenueCat.'),
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
function cleanText(value) {
    return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}
function upperText(value) {
    return cleanText(value).toUpperCase();
}
function timestampResult(value) {
    if (value === undefined || value === null || value === '') {
        return { kind: 'undated', value: null };
    }
    let candidate;
    if (value instanceof Date)
        candidate = value.getTime();
    else if (typeof value === 'object') {
        const timestamp = value;
        if (typeof timestamp.toMillis === 'function')
            candidate = timestamp.toMillis();
        else if (typeof timestamp.seconds === 'number')
            candidate = timestamp.seconds * 1000;
        else
            return { kind: 'invalid', value: null };
    }
    else if (typeof value === 'number')
        candidate = value;
    else if (typeof value === 'string' && /^\d+$/.test(value.trim()))
        candidate = Number(value);
    else
        return { kind: 'invalid', value: null };
    const normalized = Math.floor(candidate);
    if (!Number.isFinite(candidate)
        || !Number.isFinite(new Date(normalized).getTime())
        || normalized < MIN_SUPPORTED_DATE_MS
        || normalized > MAX_SUPPORTED_DATE_MS + exports.DAY_MS - 1)
        return { kind: 'invalid', value: null };
    return { kind: 'valid', value: normalized };
}
function usableInteger(value) {
    return typeof value === 'number' && Number.isSafeInteger(value) ? value : null;
}
function rangeContains(range, timestampMs) {
    return timestampMs >= range.fromMs && timestampMs < range.toMs + exports.DAY_MS;
}
function relevantRange(window, timestampMs) {
    if (rangeContains(window.current, timestampMs))
        return 'current';
    if (window.previous && rangeContains(window.previous, timestampMs))
        return 'previous';
    return null;
}
function bucketKey(timestampMs, granularity) {
    return granularity === 'week' ? startOfUtcWeek(timestampMs) : startOfUtcDay(timestampMs);
}
function latestValidTimestamp(rows, field) {
    let latest = null;
    for (const candidate of rows) {
        if (!isRecord(candidate))
            continue;
        const parsed = timestampResult(candidate[field]);
        if (parsed.kind === 'valid' && parsed.value !== null) {
            latest = Math.max(latest ?? parsed.value, parsed.value);
        }
    }
    return latest;
}
function resolveHealth(sourceHealth, request, rows, timestampField) {
    const truncated = sourceHealth.truncated === true;
    const unavailable = sourceHealth.state === 'error' || sourceHealth.state === 'unavailable';
    const state = truncated && !unavailable ? 'partial' : sourceHealth.state;
    const suppliedLatest = timestampResult(sourceHealth.latestAtMs);
    const latestAtMs = suppliedLatest.kind === 'valid'
        ? suppliedLatest.value
        : latestValidTimestamp(rows, timestampField);
    const suppliedChecked = timestampResult(sourceHealth.checkedAtMs);
    const checkedAtMs = suppliedChecked.kind === 'valid' && suppliedChecked.value !== null
        ? suppliedChecked.value
        : parseStrictUtcDate(request.toDate, 'toDate') + exports.DAY_MS - 1;
    const dataAgeMs = latestAtMs === null ? null : Math.max(0, checkedAtMs - latestAtMs);
    let freshness;
    if (unavailable)
        freshness = 'unknown';
    else if (latestAtMs === null)
        freshness = state === 'ready' || state === 'empty' ? 'no_events' : 'unknown';
    else
        freshness = dataAgeMs !== null && dataAgeMs > exports.TREND_FRESHNESS_STALE_AFTER_MS
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
function prepareContext(sourceHealth, request, rows, timestampField) {
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
function uncertainBucket(bucketStartMs, granularity, context) {
    if (context.status === 'unavailable')
        return true;
    if (context.coverage !== 'partial')
        return false;
    const boundary = context.health.uncertaintyStartsAtMs;
    if (boundary === null)
        return true;
    const bucketEndExclusive = bucketStartMs + (granularity === 'week' ? 7 * exports.DAY_MS : exports.DAY_MS);
    return bucketEndExclusive > boundary;
}
function frozenPoints(range, granularity, context, valueAt) {
    return Object.freeze(bucketStarts(range, granularity).map((bucketStartMs) => Object.freeze({
        bucketStart: formatUtcDate(bucketStartMs, 'bucketStart'),
        value: uncertainBucket(bucketStartMs, granularity, context) ? null : valueAt(bucketStartMs),
    })));
}
function countSeries(specs, source, counts, request, context) {
    return Object.freeze(specs.map((spec) => {
        const currentValues = counts.get(`current:${spec.eventType}`) ?? new Map();
        const previousValues = counts.get(`previous:${spec.eventType}`) ?? new Map();
        const currentValueAt = (bucketStartMs) => currentValues.get(bucketStartMs) ?? 0;
        const previousValueAt = (bucketStartMs) => previousValues.get(bucketStartMs) ?? 0;
        return Object.freeze({
            metricId: spec.metricId,
            label: spec.label,
            unit: 'count',
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
function increment(counts, metricKey, bucketStartMs) {
    const values = counts.get(metricKey) ?? new Map();
    values.set(bucketStartMs, (values.get(bucketStartMs) ?? 0) + 1);
    counts.set(metricKey, values);
}
function sourceSections(counts, money) {
    const sections = [Object.freeze({
            id: 'counts',
            label: 'Количество событий',
            series: counts,
        })];
    if (money.length > 0)
        sections.push(Object.freeze({
            id: 'money',
            label: 'Деньги',
            series: money,
        }));
    return Object.freeze(sections);
}
function breakdownRows(counts) {
    const sorted = [...counts.entries()]
        .map(([value, events]) => ({ value, events }))
        .sort((left, right) => right.events - left.events
        || (left.value < right.value ? -1 : left.value > right.value ? 1 : 0));
    if (sorted.length <= 20)
        return Object.freeze(sorted.map((row) => Object.freeze(row)));
    const realOtherEvents = counts.get('other') ?? 0;
    const withoutRealOther = sorted.filter((row) => row.value !== 'other');
    const visible = withoutRealOther.slice(0, 19);
    const otherEvents = withoutRealOther.slice(19).reduce((sum, row) => sum + row.events, realOtherEvents);
    return Object.freeze([
        ...visible.map((row) => Object.freeze(row)),
        Object.freeze({ value: 'other', events: otherEvents }),
    ]);
}
function incrementBreakdown(counts, value) {
    const cleaned = cleanText(value);
    const key = !cleaned
        ? 'unknown'
        : cleaned.length > exports.MAX_PUBLIC_BREAKDOWN_VALUE_LENGTH
            ? 'other'
            : cleaned;
    counts.set(key, (counts.get(key) ?? 0) + 1);
}
function baseExcluded() {
    return { undated: 0, invalidTimestamp: 0, outsideWindow: 0, filtered: 0 };
}
function timestampOrExclude(value, excluded) {
    const parsed = timestampResult(value);
    if (parsed.kind === 'undated')
        excluded.undated += 1;
    else if (parsed.kind === 'invalid')
        excluded.invalidTimestamp += 1;
    return parsed.value;
}
function matchesPaywallFilters(row, filters) {
    return (filters.context === undefined || cleanText(row.context) === filters.context)
        && (filters.variant === undefined || cleanText(row.variant) === filters.variant)
        && (filters.plan === undefined || cleanText(row.plan) === filters.plan);
}
function matchesStoreFilters(row, filters) {
    return (filters.store === undefined || upperText(row.store) === filters.store)
        && (filters.productId === undefined || cleanText(row.productId) === filters.productId);
}
function aggregatePaywallTrends(rows, request, sourceHealth, options = {}) {
    const context = prepareContext(sourceHealth, request, rows, 'ts');
    const counts = new Map();
    const includeBreakdowns = options.includeBreakdowns !== false;
    const contextBreakdown = includeBreakdowns ? new Map() : null;
    const variantBreakdown = includeBreakdowns ? new Map() : null;
    const planBreakdown = includeBreakdowns ? new Map() : null;
    const excluded = { ...baseExcluded(), dev: 0, invalidStep: 0 };
    for (const row of rows) {
        if (row.dev === true) {
            excluded.dev += 1;
            continue;
        }
        const step = cleanText(row.step);
        if (!PAYWALL_STEPS.includes(step)) {
            excluded.invalidStep += 1;
            continue;
        }
        if (!matchesPaywallFilters(row, request.filters)) {
            excluded.filtered += 1;
            continue;
        }
        const timestampMs = timestampOrExclude(row.ts, excluded);
        if (timestampMs === null)
            continue;
        const period = relevantRange(context.window, timestampMs);
        if (period === null) {
            excluded.outsideWindow += 1;
            continue;
        }
        increment(counts, `${period}:${step}`, bucketKey(timestampMs, request.granularity));
        if (period === 'current'
            && contextBreakdown !== null
            && variantBreakdown !== null
            && planBreakdown !== null) {
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
        source: 'paywall_funnel',
        health: context.health,
        excluded: frozenExcluded,
        breakdowns,
        countSeries: frozenCounts,
        moneySeries: EMPTY_SERIES,
        sections,
    });
}
function productionEnvironment(value) {
    const environment = upperText(value);
    if (environment === 'PRODUCTION')
        return 'production';
    if (environment === 'SANDBOX')
        return 'sandbox';
    return 'unknown';
}
/** RevenueCat event identity rule: eventId, then document id, then transactionId, then row position. */
function revenueCatIdentity(row, index) {
    const eventId = cleanText(row.eventId);
    if (eventId)
        return `event:${eventId}`;
    const documentId = cleanText(row.id);
    if (documentId)
        return `document:${documentId}`;
    const transactionId = cleanText(row.transactionId);
    return transactionId ? `transaction:${transactionId}` : `row:${index}`;
}
function boundedLegacyIdentity(value) {
    const identity = cleanText(value);
    return identity && identity.length <= 256 ? identity : null;
}
/** The Firestore document id is the transaction key for revenuecat_shard_transactions. */
function shardIdentity(row, index) {
    const documentId = cleanText(row.id);
    if (documentId)
        return `document:${documentId}`;
    const eventId = boundedLegacyIdentity(row.eventId);
    if (eventId)
        return `event:${eventId}`;
    const transactionId = boundedLegacyIdentity(row.transactionId);
    return transactionId ? `transaction:${transactionId}` : `row:${index}`;
}
function moneySeries(moneyBuckets, request, context) {
    const financialPartial = [...moneyBuckets.values()].some((bucket) => bucket.moneyRows !== bucket.usableRows || bucket.unsafeTotal);
    const status = context.status === 'unavailable'
        ? 'unavailable'
        : context.status === 'partial' || financialPartial
            ? 'partial'
            : context.status;
    const coverage = context.coverage === 'unavailable'
        ? 'unavailable'
        : context.coverage === 'partial' || financialPartial
            ? 'partial'
            : 'complete';
    const valueAt = (period, bucketStartMs) => {
        const bucket = moneyBuckets.get(`${period}:${bucketStartMs}`);
        if (!bucket)
            return 0;
        return bucket.moneyRows === bucket.usableRows && !bucket.unsafeTotal ? bucket.sum : null;
    };
    return Object.freeze([Object.freeze({
            metricId: GROSS_METRIC.metricId,
            label: GROSS_METRIC.label,
            unit: 'usd_micros',
            source: 'revenuecat_premium_events',
            definition: GROSS_METRIC.definition,
            status,
            coverage,
            limitations: GROSS_METRIC.limitations,
            points: frozenPoints(context.window.current, request.granularity, context, (bucketStartMs) => valueAt('current', bucketStartMs)),
            previousPoints: context.window.previous
                ? frozenPoints(context.window.previous, request.granularity, context, (bucketStartMs) => valueAt('previous', bucketStartMs))
                : null,
        })]);
}
function aggregateRevenueCatTrends(rows, request, sourceHealth) {
    const context = prepareContext(sourceHealth, request, rows, 'eventTimestampMs');
    const counts = new Map();
    const moneyBuckets = new Map();
    const seen = new Set();
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
        if (environment === 'sandbox') {
            excluded.sandbox += 1;
            return;
        }
        if (environment === 'unknown') {
            excluded.unknownEnvironment += 1;
            return;
        }
        const identity = revenueCatIdentity(row, index);
        if (seen.has(identity)) {
            excluded.duplicates += 1;
            return;
        }
        seen.add(identity);
        if (!matchesStoreFilters(row, request.filters)) {
            excluded.filtered += 1;
            return;
        }
        const timestampMs = timestampOrExclude(row.eventTimestampMs, excluded);
        if (timestampMs === null)
            return;
        const period = relevantRange(context.window, timestampMs);
        if (period === null) {
            excluded.outsideWindow += 1;
            return;
        }
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
                }
                else if (!bucket.unsafeTotal) {
                    bucket.unsafeTotal = true;
                    excluded.unsafeGrossTotalBuckets += 1;
                }
            }
            moneyBuckets.set(moneyBucketKey, bucket);
        }
    });
    const frozenCounts = countSeries(STORE_EVENT_METRICS, 'revenuecat_premium_events', counts, request, context);
    const frozenMoney = moneySeries(moneyBuckets, request, context);
    const sections = sourceSections(frozenCounts, frozenMoney);
    return Object.freeze({
        source: 'revenuecat_premium_events',
        health: context.health,
        excluded: Object.freeze(excluded),
        countSeries: frozenCounts,
        moneySeries: frozenMoney,
        sections,
    });
}
function aggregateShardTrends(rows, request, sourceHealth) {
    const context = prepareContext(sourceHealth, request, rows, 'eventTimestampMs');
    const counts = new Map();
    const seen = new Set();
    const excluded = {
        ...baseExcluded(),
        sandbox: 0,
        unknownEnvironment: 0,
        duplicates: 0,
    };
    rows.forEach((row, index) => {
        const environment = productionEnvironment(row.environment);
        if (environment === 'sandbox') {
            excluded.sandbox += 1;
            return;
        }
        if (environment === 'unknown') {
            excluded.unknownEnvironment += 1;
            return;
        }
        const identity = shardIdentity(row, index);
        if (seen.has(identity)) {
            excluded.duplicates += 1;
            return;
        }
        seen.add(identity);
        if (!matchesStoreFilters(row, request.filters)) {
            excluded.filtered += 1;
            return;
        }
        const timestampMs = timestampOrExclude(row.eventTimestampMs, excluded);
        if (timestampMs === null)
            return;
        const period = relevantRange(context.window, timestampMs);
        if (period === null) {
            excluded.outsideWindow += 1;
            return;
        }
        increment(counts, `${period}:${SHARD_TRANSACTION_METRIC.eventType}`, bucketKey(timestampMs, request.granularity));
    });
    const frozenCounts = countSeries([SHARD_TRANSACTION_METRIC], 'revenuecat_shard_transactions', counts, request, context);
    const sections = sourceSections(frozenCounts, EMPTY_SERIES);
    return Object.freeze({
        source: 'revenuecat_shard_transactions',
        health: context.health,
        excluded: Object.freeze(excluded),
        countSeries: frozenCounts,
        moneySeries: EMPTY_SERIES,
        sections,
    });
}
//# sourceMappingURL=admin_analytics_trends_core.js.map