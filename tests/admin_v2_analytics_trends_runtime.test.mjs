import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  CLIENT_TREND_CACHE_MAX_ENTRIES,
  CLIENT_TREND_CACHE_TTL_MS,
  TREND_LOAD_ERROR_MESSAGE,
  beginTrendLoad,
  cacheKey,
  completeTrendLoad,
  createAnalyticsTrendScopesState,
  createAnalyticsTrendsState,
  defaultTrendRequest,
  failTrendLoad,
  initialTrendState,
  lookupTrendCache,
  normalizeClientTrendRequest,
  toggleVisibleSeries,
  trendsStateForRoute,
} from '../admin/v2/scripts/admin-analytics-trends-state.js';

const trendsViewModuleUrl = new URL(
  '../admin/v2/scripts/admin-analytics-trends-view.js',
  import.meta.url,
);
const trendsViewModule = fs.existsSync(trendsViewModuleUrl)
  ? await import(trendsViewModuleUrl)
  : null;

globalThis.window = globalThis.window ?? {};
const analyticsViewModuleUrl = new URL(
  '../admin/v2/scripts/admin-analytics-view.js',
  import.meta.url,
);
const analyticsViewModule = fs.existsSync(analyticsViewModuleUrl)
  ? await import(analyticsViewModuleUrl)
  : null;

const NOW = Date.UTC(2026, 6, 14, 12);
const DAY_MS = 86_400_000;

function aggregateResponse(requestOrScope, overrides = {}) {
  const request = typeof requestOrScope === 'string'
    ? defaultTrendRequest(requestOrScope)
    : normalizeClientTrendRequest(requestOrScope);
  const toDate = '2026-07-14';
  const fromDate = request.presetDays === null
    ? request.fromDate
    : new Date(Date.parse(`${toDate}T00:00:00.000Z`) - (request.presetDays - 1) * DAY_MS)
      .toISOString()
      .slice(0, 10);
  const emptyBreakdown = () => ({
    rows: [], status: 'empty', coverage: 'complete', limitations: [],
  });
  const sampleSeries = {
    metricId: 'paywall_opened',
    label: 'Paywall opened',
    unit: 'count',
    source: 'paywall_funnel',
    definition: { entity: 'event', description: 'Rendered paywall events.' },
    status: 'ready',
    coverage: 'complete',
    limitations: [],
    points: [{ bucketStart: '2026-07-14', value: 2 }],
    previousPoints: null,
  };
  return {
    definitionVersion: 'admin_v2_graphical_analytics_v1',
    timezone: 'UTC',
    generatedAtMs: NOW,
    request: {
      scope: request.scope,
      presetDays: request.presetDays,
      fromDate,
      toDate: request.presetDays === null ? request.toDate : toDate,
      granularity: request.granularity,
      comparePrevious: request.comparePrevious,
      filters: request.filters,
    },
    state: 'ready',
    sources: [{
      source: 'paywall',
      state: 'ready',
      truncated: false,
      uncertaintyStartsAtMs: null,
      latestAtMs: NOW - 1000,
      checkedAtMs: NOW,
      dataAgeMs: 1000,
      freshness: 'recent',
      errorCode: null,
      limitations: [],
    }],
    sections: {
      behavioralPaywall: { series: [sampleSeries] },
      behavioralBreakdowns: {
        byContext: {
          rows: [{ value: 'onboarding', events: 2 }],
          status: 'ready',
          coverage: 'complete',
          limitations: [],
        },
        byVariant: emptyBreakdown(),
        byPlan: emptyBreakdown(),
      },
      confirmedStore: { series: [] },
      grossRevenue: { series: [] },
      shardPurchases: { series: [] },
      purchaseFailures: {
        rows: [{ id: 'network_error', events: 2, appInstances: 1 }],
        status: 'ready',
        coverage: 'complete',
        limitations: [],
      },
    },
    ...overrides,
  };
}

test('keeps the last good aggregate while loading and after a safe fixed error', () => {
  const ready = completeTrendLoad(
    createAnalyticsTrendsState('paywall'),
    aggregateResponse('paywall'),
    defaultTrendRequest('paywall'),
    NOW,
  );
  const loading = beginTrendLoad(ready, { scope: 'paywall', presetDays: 7 });
  const failed = failTrendLoad(loading, new Error('secret stack: service-account@example.com'));

  assert.equal(loading.status, 'loading');
  assert.equal(loading.data, ready.data);
  assert.equal(loading.visibleSeries, ready.visibleSeries);
  assert.equal(loading.cache, ready.cache);
  assert.equal(failed.status, 'error');
  assert.equal(failed.data, ready.data);
  assert.equal(failed.request, loading.request);
  assert.equal(failed.cache, ready.cache);
  assert.equal(failed.error, TREND_LOAD_ERROR_MESSAGE);
  assert.doesNotMatch(failed.error, /secret|service-account|stack/i);
});

test('accepts all-source error diagnostics without caching them as last good data', () => {
  const readyRequest = defaultTrendRequest('paywall');
  const ready = completeTrendLoad(
    createAnalyticsTrendsState('paywall'),
    aggregateResponse(readyRequest),
    readyRequest,
    NOW,
  );
  const errorRequest = normalizeClientTrendRequest({ scope: 'paywall', presetDays: 7 });
  const loading = beginTrendLoad(ready, errorRequest);
  const errorResponse = aggregateResponse(errorRequest);
  errorResponse.state = 'error';
  errorResponse.sources = errorResponse.sources.map((source) => ({
    ...source,
    state: 'error',
    latestAtMs: null,
    dataAgeMs: null,
    freshness: 'unknown',
    errorCode: 'source_unavailable',
    limitations: ['Источник временно недоступен.'],
  }));

  const completed = completeTrendLoad(loading, errorResponse, errorRequest, NOW + 1);

  assert.equal(completed.status, 'ready');
  assert.equal(completed.data.state, 'error');
  assert.equal(completed.data.sources[0].state, 'error');
  assert.equal(completed.data.sources[0].errorCode, 'source_unavailable');
  assert.equal(completed.cache.length, 1);
  assert.equal(completed.cache[0].key, cacheKey(readyRequest));
  assert.equal(completed.cache[0].data, ready.data);
  assert.equal(completed.cache.some((entry) => entry.key === cacheKey(errorRequest)), false);

  assert.ok(trendsViewModule, 'paywall analytics renderer module must exist');
  if (!trendsViewModule) return;
  const html = trendsViewModule.renderPaywallAnalyticsCategory(paywallViewModel({
    ...completed,
    authorized: true,
  }));
  assert.match(html, /Источники графиков недоступны/);
  assert.match(html, /source_unavailable/);
});

test('reuses fresh cache entries and expires them at exactly ten minutes', () => {
  const request = defaultTrendRequest('paywall');
  const ready = completeTrendLoad(
    createAnalyticsTrendsState('paywall'),
    aggregateResponse('paywall'),
    request,
    NOW,
  );

  const fresh = lookupTrendCache(ready, request, NOW + CLIENT_TREND_CACHE_TTL_MS - 1);
  assert.equal(fresh.hit, true);
  assert.equal(fresh.state.status, 'ready');
  assert.equal(fresh.data, ready.data);

  const expired = lookupTrendCache(fresh.state, request, NOW + CLIENT_TREND_CACHE_TTL_MS);
  assert.equal(expired.hit, false);
  assert.equal(expired.data, null);
  assert.equal(expired.state.cache.length, 0);
});

test('bounds the cache to six true-LRU entries and keeps a touched entry', () => {
  let state = createAnalyticsTrendsState('paywall');
  const requests = [];
  for (let index = 0; index < CLIENT_TREND_CACHE_MAX_ENTRIES; index += 1) {
    const request = normalizeClientTrendRequest({
      scope: 'paywall',
      filters: { context: `context-${index}` },
    });
    requests.push(request);
    state = beginTrendLoad(state, request);
    state = completeTrendLoad(state, aggregateResponse(request), request, NOW + index);
  }

  const touched = lookupTrendCache(state, requests[0], NOW + 100);
  assert.equal(touched.hit, true);
  state = touched.state;
  const seventh = normalizeClientTrendRequest({
    scope: 'paywall',
    filters: { context: 'context-6' },
  });
  state = beginTrendLoad(state, seventh);
  state = completeTrendLoad(state, aggregateResponse(seventh), seventh, NOW + 101);

  assert.equal(state.cache.length, CLIENT_TREND_CACHE_MAX_ENTRIES);
  assert.equal(lookupTrendCache(state, requests[0], NOW + 102).hit, true);
  assert.equal(lookupTrendCache(state, requests[1], NOW + 102).hit, false);
});

test('separates scope keys and rejects cross-scope requests and responses', () => {
  const overview = defaultTrendRequest('overview');
  const paywall = defaultTrendRequest('paywall');
  assert.notEqual(cacheKey(overview), cacheKey(paywall));

  const current = createAnalyticsTrendsState('overview');
  assert.throws(() => beginTrendLoad(current, paywall), /scope/i);
  assert.throws(
    () => completeTrendLoad(current, aggregateResponse('paywall'), overview, NOW),
    /scope/i,
  );
  assert.equal(current.cache.length, 0);
  assert.equal(current.request.scope, 'overview');
});

test('keeps overview and paywall route state independent without relabeling data', () => {
  const initial = createAnalyticsTrendScopesState();
  assert.notEqual(initial.overview, initial.paywall);
  assert.notEqual(initial.overview.request, initial.paywall.request);

  const overview = completeTrendLoad(
    initial.overview,
    aggregateResponse('overview'),
    defaultTrendRequest('overview'),
    NOW,
  );
  const states = Object.freeze({ overview, paywall: initial.paywall });

  assert.equal(trendsStateForRoute(states, 'overview'), overview);
  assert.equal(trendsStateForRoute(states, 'analytics'), initial.paywall);
  assert.equal(trendsStateForRoute(states, 'paywall'), initial.paywall);
  assert.equal(overview.data.request.scope, 'overview');
  assert.equal(initial.paywall.data, null);
});

test('toggles only local visible-series state without changing the request key or status', () => {
  const current = completeTrendLoad(
    initialTrendState(),
    aggregateResponse('paywall'),
    defaultTrendRequest('paywall'),
    NOW,
  );
  const beforeKey = cacheKey(current.request);
  const toggled = toggleVisibleSeries(current, 'gross_revenue_usd');

  assert.equal(toggled.visibleSeries.gross_revenue_usd, false);
  assert.equal(toggled.status, current.status);
  assert.equal(toggled.request, current.request);
  assert.equal(toggled.cache, current.cache);
  assert.equal(toggled.data, current.data);
  assert.equal(cacheKey(toggled.request), beforeKey);
});

test('normalizes equivalent inputs to the same deterministic cache key', () => {
  const minimal = normalizeClientTrendRequest({ scope: 'paywall' });
  const noisy = normalizeClientTrendRequest({
    scope: 'paywall',
    presetDays: 28,
    granularity: 'day',
    comparePrevious: false,
    filters: { unknown: 'ignored' },
    visibleSeries: { gross_revenue_usd: false },
    query: 'not-a-server-field',
    source: 'events',
    limit: 5000,
    sql: 'select *',
    timezone: 'Europe/Dublin',
  });

  assert.deepEqual(noisy, minimal);
  assert.equal(cacheKey(noisy), cacheKey(minimal));
  assert.deepEqual(Object.keys(noisy), [
    'scope', 'presetDays', 'granularity', 'comparePrevious', 'filters',
  ]);
});

test('requires the aggregate response request to match the normalized requested semantics', () => {
  const requested = defaultTrendRequest('paywall');
  const lastGood = completeTrendLoad(
    createAnalyticsTrendsState('paywall'),
    aggregateResponse(requested),
    requested,
    NOW,
  );
  const mismatchedResponses = [
    aggregateResponse({ scope: 'paywall', presetDays: 7 }),
    aggregateResponse({ ...requested, granularity: 'week' }),
    aggregateResponse({ ...requested, comparePrevious: true }),
    aggregateResponse({ ...requested, filters: { platform: 'ios' } }),
  ];

  for (const response of mismatchedResponses) {
    assert.throws(
      () => completeTrendLoad(lastGood, response, requested, NOW + 1),
      /request|match|preset|granularity|filter|compare/i,
    );
    assert.equal(lastGood.data.request.presetDays, 28);
    assert.equal(lastGood.cache.length, 1);
    assert.equal(Object.isFrozen(response), false);
  }

  const equivalentNoisyRequest = {
    ...requested,
    visibleSeries: { ignored: false },
    query: 'ignored',
    filters: { unknown: 'ignored' },
  };
  const accepted = completeTrendLoad(
    lastGood,
    aggregateResponse(requested),
    equivalentNoisyRequest,
    NOW + 2,
  );
  assert.equal(accepted.status, 'ready');
  assert.equal(accepted.data.request.presetDays, 28);

  const custom = normalizeClientTrendRequest({
    scope: 'paywall',
    fromDate: '2026-07-01',
    toDate: '2026-07-14',
    granularity: 'week',
    comparePrevious: true,
    filters: { plan: 'yearly' },
  });
  const customLoading = beginTrendLoad(accepted, custom);
  const customReady = completeTrendLoad(customLoading, aggregateResponse(custom), custom, NOW + 3);
  assert.equal(customReady.data.request.presetDays, null);
  assert.equal(customReady.data.request.fromDate, custom.fromDate);

  for (const responseRequest of [
    { ...aggregateResponse(custom).request, fromDate: '2026-07-02' },
    { ...aggregateResponse(custom).request, presetDays: 28 },
  ]) {
    const response = aggregateResponse(custom, { request: responseRequest });
    assert.throws(
      () => completeTrendLoad(customReady, response, custom, NOW + 4),
      /request|match|date|preset/i,
    );
    assert.equal(customReady.data.request.fromDate, '2026-07-01');
    assert.equal(customReady.cache.length, 2);
  }
});

test('rejects an out-of-order completion that no longer matches the active request', () => {
  const request28 = defaultTrendRequest('paywall');
  const request7 = normalizeClientTrendRequest({ scope: 'paywall', presetDays: 7 });
  const ready = completeTrendLoad(
    createAnalyticsTrendsState('paywall'),
    aggregateResponse(request28),
    request28,
    NOW,
  );
  const loading7 = beginTrendLoad(ready, request7);
  const latestLoading = beginTrendLoad(loading7, {
    ...request28,
    visibleSeries: { ignored: false },
  });

  assert.throws(
    () => completeTrendLoad(latestLoading, aggregateResponse(request7), request7, NOW + 1),
    /stale|active|request|match/i,
  );
  assert.equal(latestLoading.status, 'loading');
  assert.equal(latestLoading.request.presetDays, 28);
  assert.equal(latestLoading.data, ready.data);
  assert.equal(latestLoading.cache, ready.cache);

  const accepted = completeTrendLoad(
    latestLoading,
    aggregateResponse(request28),
    { ...request28, visibleSeries: { ignored: true } },
    NOW + 2,
  );
  assert.equal(accepted.status, 'ready');
  assert.equal(accepted.request.presetDays, 28);
});

test('handles invalid scope, oversized bounded strings and prototype keys safely', () => {
  assert.throws(() => defaultTrendRequest('users'), /scope/i);
  assert.throws(
    () => normalizeClientTrendRequest({ scope: 'paywall', filters: { context: 'x'.repeat(41) } }),
    /context/i,
  );
  assert.throws(() => toggleVisibleSeries(initialTrendState(), '__proto__'), /metric/i);

  const polluted = JSON.parse('{"scope":"paywall","filters":{"__proto__":{"polluted":true}}}');
  const normalized = normalizeClientTrendRequest(polluted);
  assert.deepEqual(normalized.filters, {});
  assert.equal({}.polluted, undefined);
});

test('rejects raw-event-like responses but allows aggregate breakdown rows', () => {
  const current = createAnalyticsTrendsState('paywall');
  const request = defaultTrendRequest('paywall');
  const valid = completeTrendLoad(current, aggregateResponse('paywall'), request, NOW);
  assert.equal(valid.data.sections.behavioralBreakdowns.byContext.rows.length, 1);
  assert.deepEqual(valid.data.sections.behavioralBreakdowns.byContext.rows[0], {
    value: 'onboarding', events: 2,
  });
  assert.deepEqual(valid.data.sections.purchaseFailures.rows[0], {
    id: 'network_error', events: 2, appInstances: 1,
  });

  for (const rawRoot of [
    { events: [{ uid: 'private-user' }] },
    { rows: [{ uid: 'private-user' }] },
    { rawRows: [{ email: 'private@example.com' }] },
    { identifiers: ['private-user'] },
  ]) {
    assert.throws(
      () => completeTrendLoad(valid, aggregateResponse('paywall', rawRoot), request, NOW + 1),
      /aggregate|raw|identifier/i,
    );
  }

  const validSections = aggregateResponse(request).sections;
  for (const sections of [
    { ...validSections, rawEvents: [{ uid: 'private-user', email: 'secret@example.com' }] },
    {
      ...validSections,
      confirmedStore: { series: [{ metadata: { originalTransactionId: 'private-transaction' } }] },
    },
    {
      ...validSections,
      purchaseFailures: { rows: [{ id: 'network_error', candidates: ['private-user'] }] },
    },
  ]) {
    const response = aggregateResponse(request, { sections });
    assert.throws(
      () => completeTrendLoad(valid, response, request, NOW + 1),
      /aggregate|raw|identity|identifier|transaction|candidate/i,
    );
    assert.equal(valid.cache.length, 1);
    assert.equal(Object.isFrozen(response), false);
  }
  assert.equal(valid.cache.length, 1);
  assert.equal(valid.data.request.scope, 'paywall');
});

test('rejects unsafe metric ids at the aggregate boundary and keeps the last good response', () => {
  const request = defaultTrendRequest('paywall');
  const ready = completeTrendLoad(
    createAnalyticsTrendsState('paywall'),
    aggregateResponse(request),
    request,
    NOW,
  );
  const loading = beginTrendLoad(ready, request);
  for (const unsafeMetricId of ['bad id', '__proto__', `a${'b'.repeat(80)}`]) {
    const unsafe = aggregateResponse(request);
    unsafe.sections.behavioralPaywall.series[0].metricId = unsafeMetricId;
    assert.throws(
      () => completeTrendLoad(loading, unsafe, request, NOW + 1),
      /metricId|unsafe|invalid|schema|bounded/i,
    );
  }
  assert.equal(loading.data, ready.data);
  const failed = failTrendLoad(loading, new TypeError('unsafe metricId'));
  assert.equal(failed.data, ready.data);
  assert.equal(failed.status, 'error');
});

test('rejects every unknown response field while accepting only the stable v1 aggregate schema', () => {
  const request = defaultTrendRequest('paywall');
  const ready = completeTrendLoad(
    createAnalyticsTrendsState('paywall'),
    aggregateResponse(request),
    request,
    NOW,
  );
  const base = aggregateResponse(request);
  const baseSeries = base.sections.behavioralPaywall.series[0];
  const unknownResponses = [
    { ...base, eventPayloads: [] },
    aggregateResponse(request, { sections: { ...base.sections, ipAddress: '127.0.0.1' } }),
    aggregateResponse(request, { sources: [{ ...base.sources[0], rawVariants: [] }] }),
    aggregateResponse(request, {
      sections: {
        ...base.sections,
        behavioralPaywall: { series: [{ ...baseSeries, eventPayloads: [] }] },
      },
    }),
    aggregateResponse(request, {
      sections: {
        ...base.sections,
        behavioralPaywall: {
          series: [{
            ...baseSeries,
            points: [{ ...baseSeries.points[0], ipAddress: '127.0.0.1' }],
          }],
        },
      },
    }),
    aggregateResponse(request, {
      sections: {
        ...base.sections,
        purchaseFailures: {
          ...base.sections.purchaseFailures,
          rows: [{ ...base.sections.purchaseFailures.rows[0], eventPayloads: [] }],
        },
      },
    }),
  ];

  for (const response of unknownResponses) {
    assert.throws(
      () => completeTrendLoad(ready, response, request, NOW + 1),
      /unknown|schema|field|aggregate/i,
    );
    assert.equal(ready.cache.length, 1);
    assert.equal(ready.data.request.presetDays, 28);
    assert.equal(Object.isFrozen(response), false);
  }
});

test('rejects array accessors without invoking them and rejects Array subclasses', () => {
  const request = defaultTrendRequest('paywall');
  const ready = completeTrendLoad(
    createAnalyticsTrendsState('paywall'),
    aggregateResponse(request),
    request,
    NOW,
  );
  const base = aggregateResponse(request);
  let getterCalls = 0;
  const accessorSeries = [];
  Object.defineProperty(accessorSeries, '0', {
    enumerable: true,
    configurable: true,
    get() {
      getterCalls += 1;
      return base.sections.behavioralPaywall.series[0];
    },
  });
  accessorSeries.length = 1;
  const accessorResponse = aggregateResponse(request, {
    sections: {
      ...base.sections,
      behavioralPaywall: { series: accessorSeries },
    },
  });
  assert.throws(
    () => completeTrendLoad(ready, accessorResponse, request, NOW + 1),
    /accessor|array|schema/i,
  );
  assert.equal(getterCalls, 0);

  class CustomSeriesArray extends Array {}
  const subclassSeries = new CustomSeriesArray(base.sections.behavioralPaywall.series[0]);
  const subclassResponse = aggregateResponse(request, {
    sections: {
      ...base.sections,
      behavioralPaywall: { series: subclassSeries },
    },
  });
  assert.throws(
    () => completeTrendLoad(ready, subclassResponse, request, NOW + 1),
    /array|prototype|schema/i,
  );
  assert.equal(Object.isFrozen(subclassSeries), false);
  assert.equal(ready.cache.length, 1);
});

test('accepts a full backend-compatible v1 shape with negative historical source timestamps', () => {
  const request = defaultTrendRequest('paywall');
  const response = aggregateResponse(request);
  response.sources = [{
    ...response.sources[0],
    uncertaintyStartsAtMs: -86_400_000,
    latestAtMs: -43_200_000,
  }];
  response.sections.behavioralBreakdowns.byContext.rows = [
    { value: 'other', events: 2 },
    { value: 'x'.repeat(160), events: 1 },
  ];

  const ready = completeTrendLoad(
    createAnalyticsTrendsState('paywall'),
    response,
    request,
    NOW,
  );
  assert.equal(ready.status, 'ready');
  assert.equal(ready.cache.length, 1);
  assert.equal(ready.data.sources[0].uncertaintyStartsAtMs, -86_400_000);
  assert.equal(ready.data.sources[0].latestAtMs, -43_200_000);
  assert.equal(Object.isFrozen(ready.data.sources[0]), true);
  assert.deepEqual(Object.keys(ready.data.sections), [
    'behavioralPaywall', 'behavioralBreakdowns', 'confirmedStore',
    'grossRevenue', 'shardPurchases', 'purchaseFailures',
  ]);
  assert.equal(ready.data.sections.behavioralPaywall.series.length, 1);

  for (const invalidTimestamp of [Number.NaN, Number.POSITIVE_INFINITY]) {
    const invalidResponse = aggregateResponse(request);
    invalidResponse.sources = [{ ...invalidResponse.sources[0], latestAtMs: invalidTimestamp }];
    assert.throws(
      () => completeTrendLoad(ready, invalidResponse, request, NOW + 1),
      /finite|number|schema/i,
    );
    assert.equal(ready.data.sources[0].latestAtMs, -43_200_000);
    assert.equal(ready.cache.length, 1);
  }
});

test('returns fresh frozen states without mutating input state or response objects', () => {
  const current = createAnalyticsTrendsState('overview');
  const currentSnapshot = {
    status: current.status,
    data: current.data,
    error: current.error,
    request: current.request,
    visibleSeries: current.visibleSeries,
    cache: current.cache,
  };
  const response = aggregateResponse('overview');
  const next = completeTrendLoad(current, response, current.request, NOW);

  assert.notEqual(next, current);
  assert.deepEqual(current, currentSnapshot);
  assert.equal(Object.isFrozen(current), true);
  assert.equal(Object.isFrozen(current.request), true);
  assert.equal(Object.isFrozen(next), true);
  assert.equal(Object.isFrozen(next.data), true);
  assert.equal(Object.isFrozen(next.cache), true);
  assert.equal(Object.isFrozen(next.cache[0]), true);
  assert.notEqual(next.data, response);
  assert.equal(Object.isFrozen(response), false);
});

test('exposes one analytics trends callable through the browser Firebase bridge', () => {
  const source = fs.readFileSync(new URL('../admin/v2/scripts/admin-firebase.js', import.meta.url), 'utf8');
  assert.equal(
    source.match(/const analyticsTrendsCallable = httpsCallable\(functionsUs, 'adminGetAnalyticsTrends'\);/g)?.length,
    1,
  );
  assert.match(
    source,
    /loadAnalyticsTrends: async \(input\) => unwrap\(await analyticsTrendsCallable\(input\)\)/,
  );
});

test('makes the new state module required and smoke-guards every analytics browser module', () => {
  const source = fs.readFileSync(new URL('../scripts/admin-v2-smoke.mjs', import.meta.url), 'utf8');
  assert.match(source, /admin\/v2\/scripts\/admin-analytics-trends-state\.js/);
  assert.match(source, /analyticsModuleFiles[^;]+admin\/v2\/scripts\/admin-core\.js/s);
  assert.match(source, /analyticsModuleFiles/);
  assert.match(source, /file\.startsWith\('admin\/v2\/scripts\/admin-analytics-'\)/);
  assert.match(source, /file\.endsWith\('-diagnostics\.js'\)/);
  assert.match(source, /admin\/v2\/scripts\/pages\/product-sessions\.js/);
  assert.match(source, /requiredGuardedAnalyticsFiles/);
  assert.doesNotMatch(source, /moduleFiles\.filter\(\(file\) => file\.includes\('analytics'\)\)/);
  assert.match(source, /admin-firebase\.js[^\n]+must not be analytics-guarded/);
  assert.match(source, /firebase-firestore/);
  assert.match(source, /firebase\\\/firestore/);
  assert.match(source, /getFirestore/);
  assert.match(source, /getAggregateFromServer/);
  assert.match(source, /getCountFromServer/);
  assert.match(source, /forbiddenFirestoreFixtures/);
  assert.match(source, /allowedFirestoreFixtures/);
  assert.match(source, /collection\(rows\)/);
  assert.match(source, /onSnapshot/);
  assert.match(source, /direct browser Firestore reads/);
});

function paywallViewModel(overrides = {}) {
  const malicious = '"><img src=x onerror=alert(1)>';
  const metric = (metricId, label, value) => ({
    metricId,
    label,
    unit: 'count',
    source: 'paywall_funnel',
    definition: { entity: 'event', description: `${label} definition` },
    status: 'ready',
    coverage: 'complete',
    limitations: [],
    points: [{ bucketStart: '2026-07-14', value }],
    previousPoints: null,
  });
  const behavioral = [
    metric('paywall.shown.v1', 'Показы', 100),
    metric('paywall.cta_click.v1', 'Нажатия CTA', 40),
    metric('paywall.trial_started.v1', 'Сигналы trial', 20),
    metric('paywall.purchase_completed.v1', 'Сигналы покупки', 10),
    metric('paywall.purchase_failed.v1', 'Ошибки', 4),
    metric('paywall.purchase_cancelled.v1', 'Отмены', 3),
    metric('paywall.restore_completed.v1', 'Восстановления', 2),
    metric('paywall.close.v1', malicious, 1),
  ];
  const storeMetric = {
    ...metric('store.initial_purchase.v1', 'Подтверждённые покупки', 8),
    source: 'revenuecat_premium_events',
  };
  const storeTrialMetric = {
    ...metric('store.confirmed_trial_start.v1', 'Подтверждённые начала пробного периода', 12),
    source: 'revenuecat_premium_events',
  };
  const moneyMetric = {
    ...metric('revenue.gross_usd_micros.v1', 'Валовая сумма, USD', 12_500_000),
    unit: 'usd_micros',
    source: 'revenuecat_premium_events',
  };
  const shardMetric = {
    ...metric('shards.store_transaction.v1', 'Покупки осколков', 5),
    source: 'revenuecat_shard_transactions',
  };
  return {
    authorized: true,
    status: 'ready',
    error: '',
    request: defaultTrendRequest('paywall'),
    visibleSeries: {},
    draft: {
      preset: '28', fromDate: '2026-06-17', toDate: '2026-07-14',
      granularity: 'day', comparePrevious: false,
      context: malicious, variant: '', plan: '', store: '', productId: '', platform: '',
    },
    data: {
      definitionVersion: 'admin_v2_graphical_analytics_v1',
      timezone: 'UTC',
      generatedAtMs: NOW,
      request: {
        scope: 'paywall', presetDays: 28, fromDate: '2026-06-17', toDate: '2026-07-14',
        granularity: 'day', comparePrevious: false, filters: {},
      },
      state: 'ready',
      sources: [{
        source: malicious,
        state: 'ready',
        truncated: false,
        uncertaintyStartsAtMs: null,
        latestAtMs: NOW - 1_000,
        checkedAtMs: NOW,
        dataAgeMs: 1_000,
        freshness: 'recent',
        errorCode: null,
        limitations: [malicious],
      }],
      sections: {
        behavioralPaywall: { series: behavioral },
        behavioralBreakdowns: {
          byContext: { rows: [{ value: malicious, events: 100 }], status: 'ready', coverage: 'complete', limitations: [] },
          byVariant: { rows: [{ value: 'A', events: 80 }], status: 'ready', coverage: 'complete', limitations: [] },
          byPlan: { rows: [{ value: 'yearly', events: 60 }], status: 'ready', coverage: 'complete', limitations: [] },
        },
        confirmedStore: { series: [storeMetric, storeTrialMetric] },
        grossRevenue: { series: [moneyMetric] },
        shardPurchases: { series: [shardMetric] },
        purchaseFailures: {
          rows: [{ id: malicious, events: 4, appInstances: 3 }],
          status: 'ready', coverage: 'complete', limitations: [],
        },
      },
    },
    ...overrides,
  };
}

test('renders every paywall category and escapes malicious text and attribute boundaries', () => {
  assert.ok(trendsViewModule, 'paywall analytics renderer module must exist');
  if (!trendsViewModule) return;
  const payload = '"><img src=x onerror=alert(1)>';
  const html = trendsViewModule.renderPaywallAnalyticsCategory(paywallViewModel());

  assert.equal(
    trendsViewModule.escapeAnalyticsHtml(payload),
    '&quot;&gt;&lt;img src=x onerror=alert(1)&gt;',
  );
  assert.doesNotMatch(html, /<img\b/i);
  assert.doesNotMatch(html, /value=""><img/i);
  assert.match(html, /&quot;&gt;&lt;img src=x onerror=alert\(1\)&gt;/);
  for (const heading of [
    'Поведенческие сигналы приложения', 'Семантическая воронка paywall',
    'Разрезы поведенческих сигналов', 'Подтверждённые покупки RevenueCat',
    'Валовая выручка по валютной шкале', 'Покупки осколков',
    'Причины ошибок покупки', 'Свежесть и состояние источников',
  ]) assert.match(html, new RegExp(heading));
});

test('renders focusable analytics actions with identical escaped title and data tooltips', () => {
  assert.ok(trendsViewModule, 'paywall analytics renderer module must exist');
  if (!trendsViewModule) return;
  const html = trendsViewModule.renderPaywallAnalyticsCategory(paywallViewModel());
  const buttonTags = [...html.matchAll(/<button\b[^>]*>/g)].map((match) => match[0]);
  const attributes = (tag) => Object.fromEntries(
    [...tag.matchAll(/([a-z][a-z0-9-]*)="([^"]*)"/gi)]
      .map((match) => [match[1], match[2]]),
  );
  const actionButtons = buttonTags.map((tag) => ({ tag, attributes: attributes(tag) }));

  for (const action of ['reset-analytics-zoom', 'load-analytics-trends']) {
    const button = actionButtons.find((item) => item.attributes['data-action'] === action);
    assert.ok(button, `${action} button must render`);
    assert.ok(button.attributes.title, `${action} needs a nonempty title`);
    assert.equal(button.attributes['data-tooltip'], button.attributes.title);
  }

  const seriesButtons = actionButtons.filter(
    (item) => item.attributes['data-action'] === 'toggle-analytics-series',
  );
  assert.equal(seriesButtons.length, 8);
  for (const button of seriesButtons) {
    assert.ok(button.attributes.title);
    assert.equal(button.attributes['data-tooltip'], button.attributes.title);
  }
  const maliciousButton = seriesButtons.find(
    (item) => item.attributes['data-metric-id'] === 'paywall.close.v1',
  );
  assert.ok(maliciousButton);
  assert.match(maliciousButton.attributes['data-tooltip'], /&quot;&gt;&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(maliciousButton.tag, /<img\b/i);
});

test('renders unavailable source truth without epoch dates or false completeness', () => {
  assert.ok(trendsViewModule, 'paywall analytics renderer module must exist');
  if (!trendsViewModule) return;
  const model = paywallViewModel();
  model.data = {
    ...model.data,
    sources: [{
      source: 'purchase_failures',
      state: 'error',
      truncated: false,
      uncertaintyStartsAtMs: null,
      latestAtMs: null,
      checkedAtMs: NOW,
      dataAgeMs: null,
      freshness: 'unknown',
      errorCode: '"><img src=x onerror=alert(1)>',
      limitations: ['read unavailable'],
    }],
  };

  const html = trendsViewModule.renderPaywallAnalyticsCategory(model);
  assert.match(html, /Последнее событие<\/dt><dd>Нет данных<\/dd>/);
  assert.doesNotMatch(html, /1970/);
  assert.match(html, /Проверено<\/dt><dd>(?!Нет данных)/);
  assert.match(html, /Полнота<\/dt><dd>(?:Неизвестно|Недоступно)<\/dd>/);
  assert.doesNotMatch(html, /Лимит не достигнут/);
  assert.doesNotMatch(html, /<img\b/i);
  assert.match(html, /&quot;&gt;&lt;img src=x onerror=alert\(1\)&gt;/);
});

test('creates source-specific descriptors and paints at most four behavioral lines by default', () => {
  assert.ok(trendsViewModule, 'paywall analytics renderer module must exist');
  if (!trendsViewModule) return;
  const model = paywallViewModel();
  const descriptors = trendsViewModule.createPaywallAnalyticsChartDescriptors(model);
  const byId = new Map(descriptors.map((entry) => [entry.descriptor.id, entry]));
  const behavioral = byId.get('paywall-behavioral-trend');

  assert.ok(behavioral);
  assert.equal(behavioral.kind, 'time-series');
  assert.deepEqual(
    behavioral.descriptor.series.map((series) => series.metricId),
    [
      'paywall.shown.v1', 'paywall.cta_click.v1',
      'paywall.trial_started.v1', 'paywall.purchase_completed.v1',
    ],
  );
  assert.equal(behavioral.descriptor.series.length, 4);
  assert.equal(byId.get('paywall-confirmed-store-trend').descriptor.series[0].sourceLabel, 'RevenueCat — подтверждённая покупка');
  assert.equal(byId.get('paywall-gross-revenue-trend').descriptor.series[0].unit, 'usd_micros');
  assert.equal(byId.get('paywall-context-breakdown').kind, 'bar');
  assert.equal(byId.get('paywall-purchase-failures').descriptor.rows[0].value, 4);
});

test('uses only the restrained analytics palette for default and optional descriptor series', () => {
  assert.ok(trendsViewModule, 'paywall analytics renderer module must exist');
  if (!trendsViewModule) return;
  const approvedPalette = [
    '#3B82F6', '#8B5CF6', '#0D9488', '#6366F1',
    '#0284C7', '#A855F7', '#0891B2', '#4F7FEA',
  ];
  const semanticStatusColors = new Set(['#B45309', '#BE123C', '#4D7C0F']);
  const behavioralDescriptor = (model) => trendsViewModule
    .createPaywallAnalyticsChartDescriptors(model)
    .find((entry) => entry.descriptor.id === 'paywall-behavioral-trend')
    .descriptor;

  const defaultColors = behavioralDescriptor(paywallViewModel())
    .series.map((series) => series.color);
  assert.deepEqual(defaultColors, approvedPalette.slice(0, 4));

  const optionalModel = paywallViewModel({
    visibleSeries: {
      'paywall.purchase_failed.v1': true,
      'paywall.purchase_cancelled.v1': true,
      'paywall.restore_completed.v1': true,
      'paywall.close.v1': true,
    },
  });
  const optionalColors = behavioralDescriptor(optionalModel)
    .series.map((series) => series.color);
  assert.deepEqual(optionalColors, approvedPalette);
  assert.ok(optionalColors.every((color) => approvedPalette.includes(color)));
  assert.ok(optionalColors.every((color) => !semanticStatusColors.has(color)));
});

test('keeps every actual descriptor color at 3:1 contrast on supported chart surfaces', () => {
  assert.ok(trendsViewModule, 'paywall analytics renderer module must exist');
  if (!trendsViewModule) return;
  const relativeLuminance = (hex) => {
    assert.match(hex, /^#[0-9A-F]{6}$/i);
    const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
    const linear = channels.map((channel) => (
      channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4
    ));
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };
  const contrastRatio = (first, second) => {
    const firstLuminance = relativeLuminance(first);
    const secondLuminance = relativeLuminance(second);
    return (Math.max(firstLuminance, secondLuminance) + 0.05)
      / (Math.min(firstLuminance, secondLuminance) + 0.05);
  };
  const supportedSurfaces = ['#FFFFFF', '#182132', '#202B3D'];
  const optionalModel = paywallViewModel({
    visibleSeries: {
      'paywall.purchase_failed.v1': true,
      'paywall.purchase_cancelled.v1': true,
      'paywall.restore_completed.v1': true,
      'paywall.close.v1': true,
    },
  });
  const actualDescriptorColors = trendsViewModule
    .createPaywallAnalyticsChartDescriptors(optionalModel)
    .filter((entry) => entry.kind === 'time-series')
    .flatMap((entry) => entry.descriptor.series.map((series) => series.color));
  const failures = [];

  for (const color of actualDescriptorColors) {
    for (const surface of supportedSurfaces) {
      const ratio = contrastRatio(color, surface);
      if (ratio < 3) failures.push(`${color} on ${surface}: ${ratio.toFixed(2)}:1`);
    }
  }

  assert.deepEqual(failures, []);
});

test('renders a safe stable Overview payment summary with exactly three count series', () => {
  assert.ok(trendsViewModule, 'paywall analytics renderer module must exist');
  if (!trendsViewModule) return;
  const html = trendsViewModule.renderOverviewPaymentSummary(paywallViewModel());
  const descriptors = trendsViewModule.createOverviewPaymentChartDescriptors(paywallViewModel());

  assert.match(html, /Что происходит с оплатой/);
  assert.equal((html.match(/class="overview-payment-headline"/g) || []).length, 4);
  assert.match(html, /href="#analytics"[^>]+title="[^"]+"[^>]*>Открыть всю аналитику/);
  assert.doesNotMatch(html, /<img\b/i);
  assert.match(html, /&quot;&gt;&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.equal(descriptors.length, 1);
  assert.deepEqual(
    descriptors[0].descriptor.series.map((series) => series.metricId),
    [
      'paywall.shown.v1',
      'store.confirmed_trial_start.v1',
      'store.initial_purchase.v1',
    ],
  );
  assert.ok(descriptors[0].descriptor.series.every((series) => series.unit === 'count'));
  assert.doesNotMatch(JSON.stringify(descriptors), /revenue\.gross_usd_micros\.v1/);
});

test('renders the cold Overview payment load with final-shape accessible skeletons', () => {
  assert.ok(trendsViewModule, 'paywall analytics renderer module must exist');
  if (!trendsViewModule) return;
  const coldModel = {
    authorized: true,
    status: 'loading',
    error: '',
    request: defaultTrendRequest('overview'),
    visibleSeries: {},
    data: null,
  };
  const coldHtml = trendsViewModule.renderOverviewPaymentSummary(coldModel);
  const lastGoodHtml = trendsViewModule.renderOverviewPaymentSummary(
    paywallViewModel({ status: 'loading' }),
  );
  const readyHtml = trendsViewModule.renderOverviewPaymentSummary(paywallViewModel());
  const coldFunnelHtml = coldHtml.match(/<ol class="analytics-semantic-funnel">([\s\S]*?)<\/ol>/)?.[1] || '';
  const readyFunnelHtml = readyHtml.match(/<ol class="analytics-semantic-funnel">([\s\S]*?)<\/ol>/)?.[1] || '';

  assert.match(coldHtml, /<section class="card section overview-payment"[^>]*aria-busy="true"/);
  assert.match(coldHtml, /role="status" aria-live="polite">Загружаем сводку оплаты/);
  assert.equal((coldHtml.match(/class="overview-payment-headline"/g) || []).length, 4);
  assert.equal((readyHtml.match(/class="overview-payment-headline"/g) || []).length, 4);
  assert.equal((coldFunnelHtml.match(/<li>/g) || []).length, 4);
  assert.equal((readyFunnelHtml.match(/<li>/g) || []).length, 4);
  assert.match(coldHtml, /id="overview-payment-count-chart" class="analytics-trends-chart-host overview-payment-chart-frame"/);
  assert.match(coldHtml, /class="overview-payment-skeleton overview-payment-chart-skeleton" aria-hidden="true"/);
  assert.match(readyHtml, /id="overview-payment-count-chart" class="analytics-trends-chart-host overview-payment-chart-frame"/);
  assert.match(coldHtml, /class="analytics-source-grid analytics-trends-source-health overview-payment-source-skeleton-grid"/);
  assert.equal((coldHtml.match(/class="overview-payment-source-skeleton" aria-hidden="true"/g) || []).length, 3);
  assert.match(coldHtml, /href="#analytics"[^>]*>Открыть всю аналитику<\/a>/);
  assert.ok((coldHtml.match(/overview-payment-skeleton[^>]*aria-hidden="true"/g) || []).length >= 9);

  assert.match(lastGoodHtml, /<section class="card section overview-payment"[^>]*aria-busy="true"/);
  assert.doesNotMatch(lastGoodHtml, /overview-payment-skeleton/);
  assert.match(lastGoodHtml, /Последние успешные данные остаются на экране/);
  assert.match(lastGoodHtml, /<strong>100<\/strong>/);
});

test('reports Overview refresh and failure status ahead of retained ready data', () => {
  assert.ok(trendsViewModule, 'paywall analytics renderer module must exist');
  if (!trendsViewModule) return;
  const loadingHtml = trendsViewModule.renderOverviewPaymentSummary(
    paywallViewModel({ status: 'loading' }),
  );
  const errorHtml = trendsViewModule.renderOverviewPaymentSummary(
    paywallViewModel({ status: 'error', error: 'offline' }),
  );
  const partialModel = paywallViewModel();
  partialModel.data = { ...partialModel.data, state: 'partial' };
  const emptyModel = paywallViewModel();
  emptyModel.data = { ...emptyModel.data, state: 'empty' };
  const readyHtml = trendsViewModule.renderOverviewPaymentSummary(paywallViewModel());
  const partialHtml = trendsViewModule.renderOverviewPaymentSummary(partialModel);
  const emptyHtml = trendsViewModule.renderOverviewPaymentSummary(emptyModel);

  assert.match(loadingHtml, /<span class="badge warning">Обновление<\/span>/);
  assert.match(loadingHtml, /aria-busy="true"/);
  assert.match(loadingHtml, /Последние успешные данные остаются на экране/);
  assert.match(loadingHtml, /<strong>100<\/strong>/);
  assert.doesNotMatch(loadingHtml, /overview-payment-skeleton/);

  assert.match(errorHtml, /<span class="badge danger">Ошибка<\/span>/);
  assert.match(errorHtml, /aria-busy="false"/);
  assert.match(errorHtml, /class="notice danger" role="alert"/);
  assert.match(errorHtml, /Последние успешные данные сохранены/);
  assert.match(errorHtml, /<strong>100<\/strong>/);
  assert.doesNotMatch(errorHtml, /overview-payment-skeleton/);

  assert.match(readyHtml, /<span class="badge success">Готово<\/span>/);
  assert.match(partialHtml, /<span class="badge warning">Неполные данные<\/span>/);
  assert.match(emptyHtml, /<span class="badge ">Нет данных<\/span>/);
});

test('keeps Overview geometry and hides incomplete financial or behavioral subtotals', () => {
  assert.ok(trendsViewModule, 'paywall analytics renderer module must exist');
  if (!trendsViewModule) return;
  const model = paywallViewModel({ status: 'loading' });
  const money = model.data.sections.grossRevenue.series[0];
  const shown = model.data.sections.behavioralPaywall.series[0];
  model.data = {
    ...model.data,
    sections: {
      ...model.data.sections,
      grossRevenue: { series: [{ ...money, coverage: 'partial' }] },
      behavioralPaywall: { series: [{ ...shown, coverage: 'partial' }, ...model.data.sections.behavioralPaywall.series.slice(1)] },
    },
  };

  const html = trendsViewModule.renderOverviewPaymentSummary(model);
  const grossHeadline = html.match(/<article class="overview-payment-headline"><span>Валовая выручка с полным покрытием<\/span>([\s\S]*?)<\/article>/)?.[1] || '';
  const funnelShown = html.match(/<strong>Показы<\/strong>[\s\S]*?<div><strong>([^<]+)<\/strong>/)?.[1] || '';

  assert.equal((html.match(/class="overview-payment-headline"/g) || []).length, 4);
  assert.match(html, /Последние успешные данные остаются на экране/);
  assert.match(grossHeadline, /<strong>—<\/strong>/);
  assert.match(grossHeadline, /финансовое покрытие неполное/);
  assert.equal(funnelShown, '—');
});

test('quiet Overview loading reuses TTL cache, deduplicates requests and guards route and auth changes', async () => {
  const savedDocument = globalThis.document;
  const savedLocation = globalThis.location;
  const savedDateNow = Date.now;
  let clock = NOW;
  let html = '';
  const app = {
    get innerHTML() { return html; },
    set innerHTML(value) { html = String(value); },
    querySelector: () => null,
    querySelectorAll: () => [],
  };
  globalThis.document = {
    getElementById: (id) => (id === 'app' ? app : null),
    querySelectorAll: () => [],
  };
  globalThis.location = { hash: '#overview' };
  Date.now = () => clock;

  const pending = [];
  const requests = [];
  const actions = {
    getDailyBriefing: async () => ({ state: 'empty', digest: null, fetchedAtMs: clock }),
    loadAnalyticsTrends: (input) => {
      requests.push(input);
      return new Promise((resolve, reject) => pending.push({ resolve, reject }));
    },
  };
  const flush = async () => {
    for (let index = 0; index < 8; index += 1) await Promise.resolve();
  };

  const coreModuleUrl = new URL('../admin/v2/scripts/admin-core.js', import.meta.url);
  const coreModule = await import(coreModuleUrl);
  try {
    coreModule.setAdminActions(actions);
    coreModule.setAuthState({ authorized: true, email: 'owner@example.com', role: 'owner' });
    await flush();
    assert.equal(requests.length, 1);
    assert.equal(requests[0].scope, 'overview');

    coreModule.renderRoute('overview');
    await flush();
    assert.equal(requests.length, 1, 'a loading Overview request must not be duplicated');

    pending[0].resolve(aggregateResponse('overview'));
    await flush();
    coreModule.renderRoute('analytics');
    coreModule.renderRoute('overview');
    await flush();
    assert.equal(requests.length, 1, 'a fresh Overview cache entry must avoid the network');

    clock += CLIENT_TREND_CACHE_TTL_MS + 1;
    coreModule.renderRoute('analytics');
    coreModule.renderRoute('overview');
    coreModule.renderRoute('overview');
    await flush();
    assert.equal(requests.length, 2, 'an expired cache entry must start exactly one request');

    pending[1].reject(new Error('offline'));
    await flush();
    assert.match(html, /Последние успешные данные сохранены/);
    coreModule.renderRoute('overview');
    await flush();
    assert.equal(requests.length, 3, 'an error may retry on the next Overview entry');

    coreModule.renderRoute('analytics');
    const analyticsHtml = html;
    pending[2].resolve(aggregateResponse('overview'));
    await flush();
    assert.equal(html, analyticsHtml, 'an Overview completion must not rerender another route');
    coreModule.renderRoute('overview');
    await flush();
    assert.equal(requests.length, 3, 'the response completed off-route remains a fresh Overview cache entry');

    clock += CLIENT_TREND_CACHE_TTL_MS + 1;
    coreModule.renderRoute('analytics');
    coreModule.renderRoute('overview');
    await flush();
    assert.equal(requests.length, 4);
    coreModule.setAuthState({ authorized: false, email: '', role: '' });
    pending[3].resolve(aggregateResponse('overview'));
    await flush();
    coreModule.setAuthState({ authorized: true, email: 'owner@example.com', role: 'owner' });
    await flush();
    assert.equal(requests.length, 5, 'a stale pre-sign-out response must not hydrate the next auth generation');
    assert.ok(requests.every((request) => request.scope === 'overview'));
    pending[4].resolve(aggregateResponse('overview'));
    await flush();
  } finally {
    coreModule.setAuthState({ authorized: false, email: '', role: '' });
    globalThis.document = savedDocument;
    globalThis.location = savedLocation;
    Date.now = savedDateNow;
  }
});

test('preserved charts use the response granularity while loading controls show the new draft', () => {
  assert.ok(trendsViewModule, 'paywall analytics renderer module must exist');
  if (!trendsViewModule) return;
  const model = paywallViewModel({
    status: 'loading',
    request: { ...defaultTrendRequest('paywall'), granularity: 'week' },
    draft: {
      ...paywallViewModel().draft,
      granularity: 'week',
    },
  });

  const html = trendsViewModule.renderPaywallAnalyticsCategory(model);
  const descriptors = trendsViewModule.createPaywallAnalyticsChartDescriptors(model);
  const timeSeries = descriptors.filter((entry) => entry.kind === 'time-series');

  assert.match(html, /<option value="week" selected>/);
  assert.ok(timeSeries.length > 0);
  assert.ok(timeSeries.every((entry) => entry.descriptor.granularity === 'day'));
});

test('independent analytics settlement still refreshes the legacy snapshot when trend validation fails', async () => {
  assert.equal(typeof analyticsViewModule?.settleIndependentAnalyticsRefreshes, 'function');
  if (typeof analyticsViewModule?.settleIndependentAnalyticsRefreshes !== 'function') return;
  let snapshotCalls = 0;
  const lastGood = completeTrendLoad(
    createAnalyticsTrendsState('paywall'),
    aggregateResponse('paywall'),
    defaultTrendRequest('paywall'),
    NOW,
  );
  let trendState = lastGood;
  const validationError = new TypeError('invalid custom date range');

  const results = await analyticsViewModule.settleIndependentAnalyticsRefreshes(
    async () => {
      snapshotCalls += 1;
      return { snapshot: 'fresh' };
    },
    async () => {
      trendState = failTrendLoad(trendState, validationError);
      throw validationError;
    },
  );

  assert.equal(snapshotCalls, 1);
  assert.deepEqual(results.map((result) => result.status), ['fulfilled', 'rejected']);
  assert.equal(trendState.status, 'error');
  assert.equal(trendState.data, lastGood.data);
  assert.equal(trendState.error, TREND_LOAD_ERROR_MESSAGE);
  assert.equal(
    analyticsViewModule.classifyAnalyticsRefreshResults(results, Symbol('stale'), false),
    'partial',
  );
});

test('stale analytics settlements never classify as updated or as an auth-change failure', () => {
  assert.equal(typeof analyticsViewModule?.classifyAnalyticsRefreshResults, 'function');
  if (typeof analyticsViewModule?.classifyAnalyticsRefreshResults !== 'function') return;
  const stale = Symbol('stale-auth');

  assert.equal(analyticsViewModule.classifyAnalyticsRefreshResults([
    { status: 'fulfilled', value: { snapshot: 'fresh' } },
    { status: 'fulfilled', value: stale },
  ], stale, false), 'stale');
  assert.equal(analyticsViewModule.classifyAnalyticsRefreshResults([
    { status: 'rejected', reason: new Error('permission changed') },
    { status: 'rejected', reason: new Error('permission changed') },
  ], stale, true), 'stale');
});

test('preserves loaded legacy workspace nodes through trend rerenders without forced reloads', () => {
  assert.equal(typeof analyticsViewModule?.captureLegacyAnalyticsWorkspaces, 'function');
  assert.equal(typeof analyticsViewModule?.restoreLegacyAnalyticsWorkspaces, 'function');
  if (
    typeof analyticsViewModule?.captureLegacyAnalyticsWorkspaces !== 'function'
    || typeof analyticsViewModule?.restoreLegacyAnalyticsWorkspaces !== 'function'
  ) return;

  const makeRoot = (entries) => {
    const nodes = new Map();
    const root = {
      querySelector(selector) {
        return nodes.get(String(selector).replace(/^#/, '')) ?? null;
      },
    };
    for (const [id, value] of Object.entries(entries)) {
      const node = {
        id,
        value,
        replaceWith(replacement) { nodes.set(id, replacement); },
      };
      nodes.set(id, node);
    }
    return root;
  };
  let root = makeRoot({
    'monthly-decision-pack-panel': 'prepared monthly preview',
    'product-analytics-panel': 'loaded product rows; range=90; platform=ios',
    'subscription-analytics-panel': 'loaded subscription rows; range=365; store=APP_STORE',
  });
  const originalProduct = root.querySelector('#product-analytics-panel');
  let networkCalls = 0;
  const alreadyLoadedLegacyLoader = (force = false) => {
    if (!force) return;
    networkCalls += 1;
  };

  // A local series toggle must leave the live legacy nodes untouched.
  const toggled = toggleVisibleSeries(createAnalyticsTrendsState('paywall'), 'paywall.shown.v1');
  assert.equal(toggled.visibleSeries['paywall.shown.v1'], false);
  assert.equal(root.querySelector('#product-analytics-panel'), originalProduct);

  for (const phase of ['loading', 'completion']) {
    const snapshot = analyticsViewModule.captureLegacyAnalyticsWorkspaces(root);
    const nextRoot = makeRoot({
      'monthly-decision-pack-panel': `blank monthly ${phase}`,
      'product-analytics-panel': `blank product ${phase}`,
      'subscription-analytics-panel': `blank subscription ${phase}`,
    });
    analyticsViewModule.restoreLegacyAnalyticsWorkspaces(nextRoot, snapshot);
    alreadyLoadedLegacyLoader();
    assert.equal(nextRoot.querySelector('#product-analytics-panel'), originalProduct);
    assert.equal(nextRoot.querySelector('#product-analytics-panel').value, 'loaded product rows; range=90; platform=ios');
    root = nextRoot;
  }
  assert.equal(networkCalls, 0);
});

test('isolates descriptor mount failures and continues mounting later safe charts', () => {
  assert.ok(trendsViewModule, 'paywall analytics renderer module must exist');
  if (!trendsViewModule) return;
  const hosts = new Map([
    ['#bad-host', { id: 'bad-host' }],
    ['#good-host', { id: 'good-host' }],
  ]);
  const mounted = [];
  const errors = [];
  const results = trendsViewModule.mountPaywallAnalyticsChartsWhenCurrent(
    { querySelector: (selector) => hosts.get(selector) ?? null },
    [
      { kind: 'time-series', hostId: 'bad-host', descriptor: { id: 'bad-chart' } },
      { kind: 'time-series', hostId: 'good-host', descriptor: { id: 'good-chart' } },
    ],
    () => true,
    {
      chartFactory: function FakeChart() {},
      mountTimeSeriesChart: (_host, descriptor) => {
        if (descriptor.id === 'bad-chart') throw new TypeError('invalid descriptor');
        mounted.push(descriptor.id);
        return descriptor.id;
      },
      onMountError: (error, entry) => errors.push([error.message, entry.descriptor.id]),
    },
  );

  assert.deepEqual(mounted, ['good-chart']);
  assert.deepEqual(results, ['good-chart']);
  assert.deepEqual(errors, [['invalid descriptor', 'bad-chart']]);
});

test('rapid rerender mounts descriptors only for the latest render generation', async () => {
  assert.ok(trendsViewModule, 'paywall analytics renderer module must exist');
  if (!trendsViewModule) return;
  const hosts = new Map([
    ['#old-host', { id: 'old-host' }],
    ['#new-host', { id: 'new-host' }],
  ]);
  const root = { querySelector: (selector) => hosts.get(selector) ?? null };
  const mounted = [];
  const dependencies = {
    chartFactory: function FakeChart() {},
    mountTimeSeriesChart: (_host, descriptor) => mounted.push(descriptor.id),
    mountBarChart: (_host, descriptor) => mounted.push(descriptor.id),
  };
  let generation = 0;
  const schedule = (id, hostId) => {
    const captured = ++generation;
    queueMicrotask(() => trendsViewModule.mountPaywallAnalyticsChartsWhenCurrent(
      root,
      [{ kind: 'time-series', hostId, descriptor: { id } }],
      () => captured === generation,
      dependencies,
    ));
  };

  schedule('old-chart', 'old-host');
  schedule('new-chart', 'new-host');
  await Promise.resolve();
  await Promise.resolve();

  assert.deepEqual(mounted, ['new-chart']);
});

test('live trend status updates use textContent and never parse HTML', () => {
  assert.ok(trendsViewModule, 'paywall analytics renderer module must exist');
  if (!trendsViewModule) return;
  const live = { textContent: '', set innerHTML(_value) { throw new Error('innerHTML forbidden'); } };
  const root = { querySelector: () => live };
  const payload = '"><img src=x onerror=alert(1)>';

  assert.equal(trendsViewModule.updatePaywallAnalyticsLiveRegion(root, payload), true);
  assert.equal(live.textContent, payload);
});
