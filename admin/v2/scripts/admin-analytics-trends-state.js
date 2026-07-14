export const CLIENT_TREND_CACHE_TTL_MS = 10 * 60 * 1000;
export const CLIENT_TREND_CACHE_MAX_ENTRIES = 6;
export const TREND_LOAD_ERROR_MESSAGE = 'Не удалось обновить графики. Последние успешно загруженные данные сохранены.';

const AGGREGATE_DEFINITION_VERSION = 'admin_v2_graphical_analytics_v1';
const ALLOWED_SCOPES = Object.freeze(['overview', 'paywall']);
const ALLOWED_PRESETS = Object.freeze([7, 28, 90]);
const ALLOWED_GRANULARITIES = Object.freeze(['day', 'week']);
const ALLOWED_VARIANTS = Object.freeze(['A', 'B', 'C']);
const ALLOWED_PLANS = Object.freeze(['monthly', 'yearly', 'lifetime']);
const ALLOWED_STORES = Object.freeze(['APP_STORE', 'PLAY_STORE', 'STRIPE', 'AMAZON', 'PROMOTIONAL']);
const ALLOWED_PLATFORMS = Object.freeze(['ios', 'android']);
const PAYWALL_ROUTES = Object.freeze(['analytics', 'paywall']);
const BLOCKED_METRIC_IDS = Object.freeze(['__proto__', 'prototype', 'constructor']);
const MAX_METRIC_ID_LENGTH = 80;
const MAX_SCHEMA_DEPTH = 16;
const MAX_SCHEMA_NODES = 50_000;
const MAX_SCHEMA_STRING_LENGTH = 500;
const MAX_SOURCES = 8;
const MAX_SERIES_PER_SECTION = 64;
const MAX_POINTS_PER_SERIES = 128;
const MAX_BREAKDOWN_ROWS = 64;
const MAX_LIMITATIONS = 32;
const RESPONSE_FIELDS = Object.freeze([
  'definitionVersion', 'timezone', 'generatedAtMs', 'request', 'state', 'sources', 'sections',
]);
const SERVER_REQUEST_FIELDS = Object.freeze([
  'scope', 'presetDays', 'fromDate', 'toDate', 'granularity', 'comparePrevious', 'filters',
]);
const FILTER_FIELDS = Object.freeze(['context', 'variant', 'plan', 'store', 'productId', 'platform']);
const SOURCE_HEALTH_FIELDS = Object.freeze([
  'source', 'state', 'truncated', 'uncertaintyStartsAtMs', 'latestAtMs', 'checkedAtMs',
  'dataAgeMs', 'freshness', 'errorCode', 'limitations',
]);
const SECTION_FIELDS = Object.freeze([
  'behavioralPaywall', 'behavioralBreakdowns', 'confirmedStore', 'grossRevenue',
  'shardPurchases', 'purchaseFailures',
]);
const BREAKDOWN_GROUP_FIELDS = Object.freeze(['byContext', 'byVariant', 'byPlan']);
const BREAKDOWN_SECTION_FIELDS = Object.freeze(['rows', 'status', 'coverage', 'limitations']);
const SERIES_SECTION_FIELDS = Object.freeze(['series']);
const SERIES_FIELDS = Object.freeze([
  'metricId', 'label', 'unit', 'source', 'definition', 'status', 'coverage',
  'limitations', 'points', 'previousPoints',
]);
const DEFINITION_FIELDS = Object.freeze(['entity', 'description', 'numerator', 'denominator']);
const POINT_FIELDS = Object.freeze(['bucketStart', 'value']);
const TREND_BREAKDOWN_ROW_FIELDS = Object.freeze(['value', 'events']);
const FAILURE_BREAKDOWN_ROW_FIELDS = Object.freeze(['id', 'events', 'appInstances']);
const TREND_SOURCES = Object.freeze([
  'paywall_funnel', 'revenuecat_premium_events', 'revenuecat_shard_transactions',
]);
const HEALTH_SOURCES = Object.freeze([
  'paywall', 'premium_event_time', 'premium_created_at', 'shards', 'purchase_failures',
]);
const SOURCE_STATES = Object.freeze(['ready', 'empty', 'partial', 'error', 'unavailable']);
const SERIES_STATES = Object.freeze(['ready', 'empty', 'partial', 'unavailable']);
const COVERAGE_STATES = Object.freeze(['complete', 'partial', 'unavailable']);
const FRESHNESS_STATES = Object.freeze(['recent', 'stale_event_watermark', 'no_events', 'unknown']);

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function requireAllowed(value, allowed, field) {
  if (!allowed.includes(value)) throw new TypeError(`${field} has an unsupported value`);
  return value;
}

function normalizeScope(value, field = 'scope') {
  return requireAllowed(value, ALLOWED_SCOPES, field);
}

function normalizeBoundedString(value, maxLength, field) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.length > maxLength) {
    throw new TypeError(`${field} must be a string of at most ${maxLength} characters`);
  }
  const normalized = value.trim();
  return normalized || undefined;
}

function normalizedFilters(value) {
  if (value === undefined) return Object.freeze({});
  if (!isRecord(value)) throw new TypeError('filters must be an object');

  const filters = {};
  const context = normalizeBoundedString(
    hasOwn(value, 'context') ? value.context : undefined,
    40,
    'filters.context',
  );
  const productId = normalizeBoundedString(
    hasOwn(value, 'productId') ? value.productId : undefined,
    120,
    'filters.productId',
  );
  if (context !== undefined) filters.context = context;
  if (hasOwn(value, 'variant') && ALLOWED_VARIANTS.includes(value.variant)) filters.variant = value.variant;
  if (hasOwn(value, 'plan') && ALLOWED_PLANS.includes(value.plan)) filters.plan = value.plan;
  if (hasOwn(value, 'store') && ALLOWED_STORES.includes(value.store)) filters.store = value.store;
  if (productId !== undefined) filters.productId = productId;
  if (hasOwn(value, 'platform') && ALLOWED_PLATFORMS.includes(value.platform)) filters.platform = value.platform;
  return Object.freeze(filters);
}

function normalizedDate(value, field) {
  if (typeof value !== 'string' || value.length > 10) {
    throw new TypeError(`${field} must be a bounded date string`);
  }
  return value;
}

function validNow(nowMs) {
  if (!Number.isFinite(nowMs) || nowMs > Number.MAX_SAFE_INTEGER - CLIENT_TREND_CACHE_TTL_MS) {
    throw new TypeError('nowMs must be a finite safe timestamp');
  }
  return nowMs;
}

function stateScope(current) {
  if (!isRecord(current) || !isRecord(current.request)) throw new TypeError('trend state is invalid');
  return normalizeScope(current.request.scope, 'state request scope');
}

function stateCache(current) {
  if (!Array.isArray(current.cache)) throw new TypeError('trend state cache is invalid');
  return current.cache;
}

function stateVisibleSeries(current) {
  if (!isRecord(current.visibleSeries)) throw new TypeError('visibleSeries must be an object');
  return current.visibleSeries;
}

function frozenState({ status, data, error, request, visibleSeries, cache }) {
  return Object.freeze({ status, data, error, request, visibleSeries, cache });
}

function consumeSchemaNode(context, depth, path) {
  context.nodes += 1;
  if (context.nodes > MAX_SCHEMA_NODES || depth > MAX_SCHEMA_DEPTH) {
    throw new TypeError(`aggregate schema is too large at ${path}`);
  }
}

function exactObjectFields(value, path, context, depth, allowedFields, requiredFields = allowedFields) {
  consumeSchemaNode(context, depth, path);
  if (!isRecord(value)) throw new TypeError(`aggregate schema requires an object at ${path}`);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`aggregate schema rejects a custom object prototype at ${path}`);
  }
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new TypeError(`aggregate schema rejects symbol fields at ${path}`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!allowedFields.includes(key)) throw new TypeError(`unknown aggregate schema field: ${path}.${key}`);
    if (!hasOwn(descriptor, 'value')) throw new TypeError(`aggregate schema rejects an accessor at ${path}.${key}`);
    if (!descriptor.enumerable) throw new TypeError(`aggregate schema requires enumerable fields at ${path}.${key}`);
  }
  for (const key of requiredFields) {
    if (!hasOwn(descriptors, key)) throw new TypeError(`aggregate schema field is required: ${path}.${key}`);
  }
  return descriptors;
}

function exactArrayValues(value, path, context, depth, maxLength) {
  consumeSchemaNode(context, depth, path);
  if (!Array.isArray(value)) throw new TypeError(`aggregate schema requires an array at ${path}`);
  if (Object.getPrototypeOf(value) !== Array.prototype) {
    throw new TypeError(`aggregate schema rejects a custom array prototype at ${path}`);
  }
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new TypeError(`aggregate schema rejects symbol fields at ${path}`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const lengthDescriptor = descriptors.length;
  if (!lengthDescriptor || !hasOwn(lengthDescriptor, 'value')) {
    throw new TypeError(`aggregate schema rejects an accessor array length at ${path}`);
  }
  const length = lengthDescriptor.value;
  if (!Number.isSafeInteger(length) || length < 0 || length > maxLength) {
    throw new TypeError(`aggregate schema array is too large at ${path}`);
  }
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (key === 'length') continue;
    const index = Number(key);
    if (!Number.isSafeInteger(index) || index < 0 || index >= length || String(index) !== key) {
      throw new TypeError(`unknown aggregate array field: ${path}.${key}`);
    }
    if (!hasOwn(descriptor, 'value')) throw new TypeError(`aggregate schema rejects an array accessor at ${path}[${index}]`);
    if (!descriptor.enumerable) throw new TypeError(`aggregate schema requires enumerable array items at ${path}[${index}]`);
  }
  const values = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (!descriptor || !hasOwn(descriptor, 'value')) {
      throw new TypeError(`aggregate schema rejects a sparse or accessor array at ${path}[${index}]`);
    }
    values.push(descriptor.value);
  }
  return values;
}

function fieldValue(fields, key) {
  return fields[key].value;
}

function schemaString(value, path, context, depth, maxLength = MAX_SCHEMA_STRING_LENGTH) {
  consumeSchemaNode(context, depth, path);
  if (typeof value !== 'string' || value.length > maxLength) {
    throw new TypeError(`aggregate schema requires a bounded string at ${path}`);
  }
  return value;
}

function schemaCanonicalString(value, path, context, depth, maxLength) {
  const result = schemaString(value, path, context, depth, maxLength);
  if (!result || result.trim() !== result) {
    throw new TypeError(`aggregate schema requires a canonical string at ${path}`);
  }
  return result;
}

function isSafeMetricId(value) {
  return !BLOCKED_METRIC_IDS.includes(value) && /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/.test(value);
}

function schemaMetricId(value, path, context, depth) {
  const result = schemaCanonicalString(value, path, context, depth, MAX_METRIC_ID_LENGTH);
  if (!isSafeMetricId(result)) {
    throw new TypeError(`aggregate schema rejects an unsafe metricId at ${path}`);
  }
  return result;
}

function schemaEnum(value, allowed, path, context, depth) {
  const result = schemaString(value, path, context, depth, 120);
  if (!allowed.includes(result)) throw new TypeError(`aggregate schema has an unsupported value at ${path}`);
  return result;
}

function schemaBoolean(value, path, context, depth) {
  consumeSchemaNode(context, depth, path);
  if (typeof value !== 'boolean') throw new TypeError(`aggregate schema requires a boolean at ${path}`);
  return value;
}

function schemaFiniteNumber(value, path, context, depth) {
  consumeSchemaNode(context, depth, path);
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`aggregate schema requires a finite number at ${path}`);
  }
  return value;
}

function schemaNonNegativeNumber(value, path, context, depth) {
  const result = schemaFiniteNumber(value, path, context, depth);
  if (result < 0) throw new TypeError(`aggregate schema requires a non-negative number at ${path}`);
  return result;
}

function schemaNonNegativeInteger(value, path, context, depth) {
  const result = schemaNonNegativeNumber(value, path, context, depth);
  if (!Number.isSafeInteger(result)) throw new TypeError(`aggregate schema requires an integer at ${path}`);
  return result;
}

function schemaNullableNumber(value, path, context, depth, nonNegative = false) {
  consumeSchemaNode(context, depth, path);
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || (nonNegative && value < 0)) {
    throw new TypeError(`aggregate schema requires a nullable finite number at ${path}`);
  }
  return value;
}

function schemaNullableTimestamp(value, path, context, depth) {
  consumeSchemaNode(context, depth, path);
  if (value === null) return null;
  if (
    typeof value !== 'number'
    || !Number.isSafeInteger(value)
    || !Number.isFinite(new Date(value).getTime())
  ) {
    throw new TypeError(`aggregate schema requires a nullable safe timestamp at ${path}`);
  }
  return value;
}

function schemaNullableString(value, path, context, depth, maxLength = 160) {
  consumeSchemaNode(context, depth, path);
  if (value === null) return null;
  if (typeof value !== 'string' || value.length > maxLength) {
    throw new TypeError(`aggregate schema requires a nullable bounded string at ${path}`);
  }
  return value;
}

function schemaDate(value, path, context, depth) {
  const result = schemaString(value, path, context, depth, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result)) throw new TypeError(`aggregate schema requires a UTC date at ${path}`);
  const parsed = Date.parse(`${result}T00:00:00.000Z`);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== result) {
    throw new TypeError(`aggregate schema requires a valid UTC date at ${path}`);
  }
  return result;
}

function cloneStringList(value, path, context, depth) {
  return Object.freeze(exactArrayValues(value, path, context, depth, MAX_LIMITATIONS).map(
    (item, index) => schemaString(item, `${path}[${index}]`, context, depth + 1, 160),
  ));
}

function cloneServerFilters(value, path, context, depth) {
  const fields = exactObjectFields(value, path, context, depth, FILTER_FIELDS, []);
  const filters = {};
  if (hasOwn(fields, 'context')) {
    filters.context = schemaCanonicalString(fieldValue(fields, 'context'), `${path}.context`, context, depth + 1, 40);
  }
  if (hasOwn(fields, 'variant')) {
    filters.variant = schemaEnum(fieldValue(fields, 'variant'), ALLOWED_VARIANTS, `${path}.variant`, context, depth + 1);
  }
  if (hasOwn(fields, 'plan')) {
    filters.plan = schemaEnum(fieldValue(fields, 'plan'), ALLOWED_PLANS, `${path}.plan`, context, depth + 1);
  }
  if (hasOwn(fields, 'store')) {
    filters.store = schemaEnum(fieldValue(fields, 'store'), ALLOWED_STORES, `${path}.store`, context, depth + 1);
  }
  if (hasOwn(fields, 'productId')) {
    filters.productId = schemaCanonicalString(fieldValue(fields, 'productId'), `${path}.productId`, context, depth + 1, 120);
  }
  if (hasOwn(fields, 'platform')) {
    filters.platform = schemaEnum(fieldValue(fields, 'platform'), ALLOWED_PLATFORMS, `${path}.platform`, context, depth + 1);
  }
  return Object.freeze(filters);
}

function cloneServerRequest(value, path, context, depth) {
  const fields = exactObjectFields(value, path, context, depth, SERVER_REQUEST_FIELDS);
  const rawPreset = fieldValue(fields, 'presetDays');
  consumeSchemaNode(context, depth + 1, `${path}.presetDays`);
  if (rawPreset !== null && !ALLOWED_PRESETS.includes(rawPreset)) {
    throw new TypeError(`aggregate schema has an unsupported preset at ${path}.presetDays`);
  }
  return Object.freeze({
    scope: schemaEnum(fieldValue(fields, 'scope'), ALLOWED_SCOPES, `${path}.scope`, context, depth + 1),
    presetDays: rawPreset,
    fromDate: schemaDate(fieldValue(fields, 'fromDate'), `${path}.fromDate`, context, depth + 1),
    toDate: schemaDate(fieldValue(fields, 'toDate'), `${path}.toDate`, context, depth + 1),
    granularity: schemaEnum(fieldValue(fields, 'granularity'), ALLOWED_GRANULARITIES, `${path}.granularity`, context, depth + 1),
    comparePrevious: schemaBoolean(fieldValue(fields, 'comparePrevious'), `${path}.comparePrevious`, context, depth + 1),
    filters: cloneServerFilters(fieldValue(fields, 'filters'), `${path}.filters`, context, depth + 1),
  });
}

function cloneSourceHealth(value, path, context, depth) {
  const fields = exactObjectFields(value, path, context, depth, SOURCE_HEALTH_FIELDS);
  return Object.freeze({
    source: schemaEnum(fieldValue(fields, 'source'), HEALTH_SOURCES, `${path}.source`, context, depth + 1),
    state: schemaEnum(fieldValue(fields, 'state'), SOURCE_STATES, `${path}.state`, context, depth + 1),
    truncated: schemaBoolean(fieldValue(fields, 'truncated'), `${path}.truncated`, context, depth + 1),
    uncertaintyStartsAtMs: schemaNullableTimestamp(fieldValue(fields, 'uncertaintyStartsAtMs'), `${path}.uncertaintyStartsAtMs`, context, depth + 1),
    latestAtMs: schemaNullableTimestamp(fieldValue(fields, 'latestAtMs'), `${path}.latestAtMs`, context, depth + 1),
    checkedAtMs: schemaNonNegativeNumber(fieldValue(fields, 'checkedAtMs'), `${path}.checkedAtMs`, context, depth + 1),
    dataAgeMs: schemaNullableNumber(fieldValue(fields, 'dataAgeMs'), `${path}.dataAgeMs`, context, depth + 1, true),
    freshness: schemaEnum(fieldValue(fields, 'freshness'), FRESHNESS_STATES, `${path}.freshness`, context, depth + 1),
    errorCode: schemaNullableString(fieldValue(fields, 'errorCode'), `${path}.errorCode`, context, depth + 1),
    limitations: cloneStringList(fieldValue(fields, 'limitations'), `${path}.limitations`, context, depth + 1),
  });
}

function cloneDefinition(value, path, context, depth) {
  const fields = exactObjectFields(
    value,
    path,
    context,
    depth,
    DEFINITION_FIELDS,
    ['entity', 'description'],
  );
  const definition = {
    entity: schemaEnum(fieldValue(fields, 'entity'), ['event', 'transaction', 'usd_micros'], `${path}.entity`, context, depth + 1),
    description: schemaString(fieldValue(fields, 'description'), `${path}.description`, context, depth + 1),
  };
  if (hasOwn(fields, 'numerator')) {
    definition.numerator = schemaString(fieldValue(fields, 'numerator'), `${path}.numerator`, context, depth + 1, 240);
  }
  if (hasOwn(fields, 'denominator')) {
    definition.denominator = schemaString(fieldValue(fields, 'denominator'), `${path}.denominator`, context, depth + 1, 240);
  }
  return Object.freeze(definition);
}

function clonePoint(value, path, context, depth) {
  const fields = exactObjectFields(value, path, context, depth, POINT_FIELDS);
  return Object.freeze({
    bucketStart: schemaDate(fieldValue(fields, 'bucketStart'), `${path}.bucketStart`, context, depth + 1),
    value: schemaNullableNumber(fieldValue(fields, 'value'), `${path}.value`, context, depth + 1),
  });
}

function clonePoints(value, path, context, depth) {
  return Object.freeze(exactArrayValues(value, path, context, depth, MAX_POINTS_PER_SERIES).map(
    (point, index) => clonePoint(point, `${path}[${index}]`, context, depth + 1),
  ));
}

function cloneSeries(value, path, context, depth) {
  const fields = exactObjectFields(value, path, context, depth, SERIES_FIELDS);
  const rawPreviousPoints = fieldValue(fields, 'previousPoints');
  let previousPoints;
  if (rawPreviousPoints === null) {
    consumeSchemaNode(context, depth + 1, `${path}.previousPoints`);
    previousPoints = null;
  } else {
    previousPoints = clonePoints(rawPreviousPoints, `${path}.previousPoints`, context, depth + 1);
  }
  return Object.freeze({
    metricId: schemaMetricId(fieldValue(fields, 'metricId'), `${path}.metricId`, context, depth + 1),
    label: schemaString(fieldValue(fields, 'label'), `${path}.label`, context, depth + 1, 240),
    unit: schemaEnum(fieldValue(fields, 'unit'), ['count', 'ratio', 'usd_micros'], `${path}.unit`, context, depth + 1),
    source: schemaEnum(fieldValue(fields, 'source'), TREND_SOURCES, `${path}.source`, context, depth + 1),
    definition: cloneDefinition(fieldValue(fields, 'definition'), `${path}.definition`, context, depth + 1),
    status: schemaEnum(fieldValue(fields, 'status'), SERIES_STATES, `${path}.status`, context, depth + 1),
    coverage: schemaEnum(fieldValue(fields, 'coverage'), COVERAGE_STATES, `${path}.coverage`, context, depth + 1),
    limitations: cloneStringList(fieldValue(fields, 'limitations'), `${path}.limitations`, context, depth + 1),
    points: clonePoints(fieldValue(fields, 'points'), `${path}.points`, context, depth + 1),
    previousPoints,
  });
}

function cloneSeriesSection(value, path, context, depth) {
  const fields = exactObjectFields(value, path, context, depth, SERIES_SECTION_FIELDS);
  const series = exactArrayValues(
    fieldValue(fields, 'series'),
    `${path}.series`,
    context,
    depth + 1,
    MAX_SERIES_PER_SECTION,
  ).map((item, index) => cloneSeries(item, `${path}.series[${index}]`, context, depth + 2));
  return Object.freeze({ series: Object.freeze(series) });
}

function cloneTrendBreakdownRow(value, path, context, depth) {
  const fields = exactObjectFields(value, path, context, depth, TREND_BREAKDOWN_ROW_FIELDS);
  return Object.freeze({
    value: schemaCanonicalString(fieldValue(fields, 'value'), `${path}.value`, context, depth + 1, 160),
    events: schemaNonNegativeInteger(fieldValue(fields, 'events'), `${path}.events`, context, depth + 1),
  });
}

function cloneFailureBreakdownRow(value, path, context, depth) {
  const fields = exactObjectFields(value, path, context, depth, FAILURE_BREAKDOWN_ROW_FIELDS);
  return Object.freeze({
    id: schemaCanonicalString(fieldValue(fields, 'id'), `${path}.id`, context, depth + 1, 160),
    events: schemaNonNegativeInteger(fieldValue(fields, 'events'), `${path}.events`, context, depth + 1),
    appInstances: schemaNonNegativeInteger(fieldValue(fields, 'appInstances'), `${path}.appInstances`, context, depth + 1),
  });
}

function cloneBreakdownSection(value, path, context, depth, cloneRow) {
  const fields = exactObjectFields(value, path, context, depth, BREAKDOWN_SECTION_FIELDS);
  const rows = exactArrayValues(
    fieldValue(fields, 'rows'),
    `${path}.rows`,
    context,
    depth + 1,
    MAX_BREAKDOWN_ROWS,
  ).map((row, index) => cloneRow(row, `${path}.rows[${index}]`, context, depth + 2));
  return Object.freeze({
    rows: Object.freeze(rows),
    status: schemaEnum(fieldValue(fields, 'status'), SERIES_STATES, `${path}.status`, context, depth + 1),
    coverage: schemaEnum(fieldValue(fields, 'coverage'), COVERAGE_STATES, `${path}.coverage`, context, depth + 1),
    limitations: cloneStringList(fieldValue(fields, 'limitations'), `${path}.limitations`, context, depth + 1),
  });
}

function cloneBehavioralBreakdowns(value, path, context, depth) {
  const fields = exactObjectFields(value, path, context, depth, BREAKDOWN_GROUP_FIELDS);
  return Object.freeze({
    byContext: cloneBreakdownSection(fieldValue(fields, 'byContext'), `${path}.byContext`, context, depth + 1, cloneTrendBreakdownRow),
    byVariant: cloneBreakdownSection(fieldValue(fields, 'byVariant'), `${path}.byVariant`, context, depth + 1, cloneTrendBreakdownRow),
    byPlan: cloneBreakdownSection(fieldValue(fields, 'byPlan'), `${path}.byPlan`, context, depth + 1, cloneTrendBreakdownRow),
  });
}

function cloneSections(value, path, context, depth) {
  const fields = exactObjectFields(value, path, context, depth, SECTION_FIELDS);
  return Object.freeze({
    behavioralPaywall: cloneSeriesSection(fieldValue(fields, 'behavioralPaywall'), `${path}.behavioralPaywall`, context, depth + 1),
    behavioralBreakdowns: cloneBehavioralBreakdowns(fieldValue(fields, 'behavioralBreakdowns'), `${path}.behavioralBreakdowns`, context, depth + 1),
    confirmedStore: cloneSeriesSection(fieldValue(fields, 'confirmedStore'), `${path}.confirmedStore`, context, depth + 1),
    grossRevenue: cloneSeriesSection(fieldValue(fields, 'grossRevenue'), `${path}.grossRevenue`, context, depth + 1),
    shardPurchases: cloneSeriesSection(fieldValue(fields, 'shardPurchases'), `${path}.shardPurchases`, context, depth + 1),
    purchaseFailures: cloneBreakdownSection(fieldValue(fields, 'purchaseFailures'), `${path}.purchaseFailures`, context, depth + 1, cloneFailureBreakdownRow),
  });
}

function cloneAnalyticsResponse(value) {
  const context = { nodes: 0 };
  const fields = exactObjectFields(value, 'response', context, 0, RESPONSE_FIELDS);
  const sources = exactArrayValues(fieldValue(fields, 'sources'), 'response.sources', context, 1, MAX_SOURCES)
    .map((source, index) => cloneSourceHealth(source, `response.sources[${index}]`, context, 2));
  const definitionVersion = schemaString(fieldValue(fields, 'definitionVersion'), 'response.definitionVersion', context, 1, 80);
  if (definitionVersion !== AGGREGATE_DEFINITION_VERSION) {
    throw new TypeError('aggregate response definition version is unsupported');
  }
  const timezone = schemaString(fieldValue(fields, 'timezone'), 'response.timezone', context, 1, 20);
  if (timezone !== 'UTC') throw new TypeError('aggregate response timezone must be UTC');
  return Object.freeze({
    definitionVersion,
    timezone,
    generatedAtMs: schemaNonNegativeNumber(fieldValue(fields, 'generatedAtMs'), 'response.generatedAtMs', context, 1),
    request: cloneServerRequest(fieldValue(fields, 'request'), 'response.request', context, 1),
    state: schemaEnum(fieldValue(fields, 'state'), ['ready', 'empty', 'partial', 'error'], 'response.state', context, 1),
    sources: Object.freeze(sources),
    sections: cloneSections(fieldValue(fields, 'sections'), 'response.sections', context, 1),
  });
}

function assertResponseRequestMatches(responseRequest, expectedRequest) {
  if (!isRecord(responseRequest)) throw new TypeError('aggregate response request is required');
  if (responseRequest.scope !== expectedRequest.scope) {
    throw new TypeError('aggregate response request scope does not match requested scope');
  }
  if (responseRequest.granularity !== expectedRequest.granularity) {
    throw new TypeError('aggregate response request granularity does not match requested granularity');
  }
  if (responseRequest.comparePrevious !== expectedRequest.comparePrevious) {
    throw new TypeError('aggregate response request comparison does not match requested comparison');
  }
  const responseFilters = normalizedFilters(
    hasOwn(responseRequest, 'filters') ? responseRequest.filters : undefined,
  );
  if (JSON.stringify(responseFilters) !== JSON.stringify(expectedRequest.filters)) {
    throw new TypeError('aggregate response request filters do not match requested filters');
  }

  if (expectedRequest.presetDays === null) {
    if (
      responseRequest.presetDays !== null
      || responseRequest.fromDate !== expectedRequest.fromDate
      || responseRequest.toDate !== expectedRequest.toDate
    ) {
      throw new TypeError('aggregate response custom date request does not match requested dates');
    }
    return;
  }
  if (responseRequest.presetDays !== expectedRequest.presetDays) {
    throw new TypeError('aggregate response preset does not match requested preset');
  }
}

function frozenAggregateResponse(response, expectedRequest) {
  if (!isRecord(response)) throw new TypeError('aggregate response must be an object');
  const data = cloneAnalyticsResponse(response);
  assertResponseRequestMatches(data.request, expectedRequest);
  return data;
}

function frozenCache(entries) {
  return Object.freeze(entries);
}

function pruneExpiredCache(cache, nowMs) {
  return cache.filter((entry) => (
    isRecord(entry)
    && typeof entry.key === 'string'
    && Number.isFinite(entry.expiresAtMs)
    && entry.expiresAtMs > nowMs
  ));
}

function cacheEntry(key, request, data, expiresAtMs) {
  return Object.freeze({ key, request, data, expiresAtMs });
}

export function defaultTrendRequest(scope) {
  return Object.freeze({
    scope: normalizeScope(scope),
    presetDays: 28,
    granularity: 'day',
    comparePrevious: false,
    filters: Object.freeze({}),
  });
}

export function normalizeClientTrendRequest(input, expectedScope) {
  if (!isRecord(input)) throw new TypeError('trend request must be an object');
  const scope = normalizeScope(hasOwn(input, 'scope') ? input.scope : undefined);
  if (expectedScope !== undefined && scope !== normalizeScope(expectedScope, 'expected scope')) {
    throw new TypeError('trend request scope does not match state scope');
  }
  const granularity = hasOwn(input, 'granularity') && input.granularity !== undefined
    ? requireAllowed(input.granularity, ALLOWED_GRANULARITIES, 'granularity')
    : 'day';
  const comparePrevious = hasOwn(input, 'comparePrevious') && input.comparePrevious !== undefined
    ? input.comparePrevious
    : false;
  if (typeof comparePrevious !== 'boolean') throw new TypeError('comparePrevious must be boolean');

  const hasFromDate = hasOwn(input, 'fromDate') && input.fromDate !== undefined;
  const hasToDate = hasOwn(input, 'toDate') && input.toDate !== undefined;
  if (hasFromDate !== hasToDate) throw new TypeError('fromDate and toDate must be provided together');
  const filters = normalizedFilters(hasOwn(input, 'filters') ? input.filters : undefined);

  if (hasFromDate) {
    return Object.freeze({
      scope,
      presetDays: null,
      fromDate: normalizedDate(input.fromDate, 'fromDate'),
      toDate: normalizedDate(input.toDate, 'toDate'),
      granularity,
      comparePrevious,
      filters,
    });
  }
  const presetDays = hasOwn(input, 'presetDays') && input.presetDays !== undefined
    ? requireAllowed(input.presetDays, ALLOWED_PRESETS, 'presetDays')
    : 28;
  return Object.freeze({ scope, presetDays, granularity, comparePrevious, filters });
}

export function cacheKey(request) {
  return JSON.stringify(normalizeClientTrendRequest(request));
}

export function createAnalyticsTrendsState(scope) {
  return frozenState({
    status: 'idle',
    data: null,
    error: '',
    request: defaultTrendRequest(scope),
    visibleSeries: Object.freeze({}),
    cache: frozenCache([]),
  });
}

export function initialTrendState(scope = 'paywall') {
  return createAnalyticsTrendsState(scope);
}

export function createAnalyticsTrendScopesState() {
  return Object.freeze({
    overview: createAnalyticsTrendsState('overview'),
    paywall: createAnalyticsTrendsState('paywall'),
  });
}

export function trendsStateForRoute(states, route) {
  if (!isRecord(states)) throw new TypeError('trend scopes state is invalid');
  if (route === 'overview') {
    if (!isRecord(states.overview)) throw new TypeError('overview trend state is missing');
    return states.overview;
  }
  if (PAYWALL_ROUTES.includes(route)) {
    if (!isRecord(states.paywall)) throw new TypeError('paywall trend state is missing');
    return states.paywall;
  }
  throw new TypeError('route does not have an analytics trend scope');
}

export function beginTrendLoad(current, request) {
  const scope = stateScope(current);
  const normalizedRequest = normalizeClientTrendRequest(request, scope);
  return frozenState({
    status: 'loading',
    data: current.data,
    error: '',
    request: normalizedRequest,
    visibleSeries: stateVisibleSeries(current),
    cache: stateCache(current),
  });
}

export function completeTrendLoad(current, response, request, nowMs = Date.now()) {
  const scope = stateScope(current);
  const normalizedRequest = normalizeClientTrendRequest(request, scope);
  if (cacheKey(normalizedRequest) !== cacheKey(current.request)) {
    throw new TypeError('stale analytics trend response does not match the active request');
  }
  const completedAtMs = validNow(nowMs);
  const data = frozenAggregateResponse(response, normalizedRequest);
  if (data.state === 'error') {
    return frozenState({
      status: 'ready',
      data,
      error: '',
      request: normalizedRequest,
      visibleSeries: stateVisibleSeries(current),
      cache: frozenCache(pruneExpiredCache(stateCache(current), completedAtMs)),
    });
  }
  const key = cacheKey(normalizedRequest);
  const retained = pruneExpiredCache(stateCache(current), completedAtMs)
    .filter((entry) => entry.key !== key);
  retained.push(cacheEntry(
    key,
    normalizedRequest,
    data,
    completedAtMs + CLIENT_TREND_CACHE_TTL_MS,
  ));
  const cache = frozenCache(retained.slice(-CLIENT_TREND_CACHE_MAX_ENTRIES));

  return frozenState({
    status: 'ready',
    data,
    error: '',
    request: normalizedRequest,
    visibleSeries: stateVisibleSeries(current),
    cache,
  });
}

export function failTrendLoad(current, _error) {
  stateScope(current);
  return frozenState({
    status: 'error',
    data: current.data,
    error: TREND_LOAD_ERROR_MESSAGE,
    request: current.request,
    visibleSeries: stateVisibleSeries(current),
    cache: stateCache(current),
  });
}

export function lookupTrendCache(current, request, nowMs = Date.now()) {
  const scope = stateScope(current);
  const checkedAtMs = validNow(nowMs);
  const normalizedRequest = normalizeClientTrendRequest(request, scope);
  const key = cacheKey(normalizedRequest);
  const fresh = pruneExpiredCache(stateCache(current), checkedAtMs);
  const matched = fresh.find((entry) => entry.key === key) ?? null;
  const touched = matched
    ? [...fresh.filter((entry) => entry !== matched), matched]
    : fresh;
  const cache = frozenCache(touched);
  const state = matched
    ? frozenState({
      status: 'ready',
      data: matched.data,
      error: '',
      request: normalizedRequest,
      visibleSeries: stateVisibleSeries(current),
      cache,
    })
    : frozenState({
      status: current.status,
      data: current.data,
      error: current.error,
      request: current.request,
      visibleSeries: stateVisibleSeries(current),
      cache,
    });
  return Object.freeze({ hit: Boolean(matched), data: matched?.data ?? null, state });
}

export function toggleVisibleSeries(current, metricId) {
  stateScope(current);
  const normalizedMetricId = normalizeBoundedString(metricId, MAX_METRIC_ID_LENGTH, 'metricId');
  if (
    normalizedMetricId === undefined
    || !isSafeMetricId(normalizedMetricId)
  ) {
    throw new TypeError('metricId is unsafe');
  }
  const visibleSeries = stateVisibleSeries(current);
  const currentlyVisible = hasOwn(visibleSeries, normalizedMetricId)
    ? visibleSeries[normalizedMetricId] !== false
    : true;
  const nextVisibleSeries = Object.freeze({
    ...visibleSeries,
    [normalizedMetricId]: !currentlyVisible,
  });
  return frozenState({
    status: current.status,
    data: current.data,
    error: current.error,
    request: current.request,
    visibleSeries: nextVisibleSeries,
    cache: stateCache(current),
  });
}
