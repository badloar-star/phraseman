# Admin V2 Paywall Graphical Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить в Admin V2 первый полностью рабочий графический релиз: общую инфраструктуру графиков, защищённые временные ряды, категорию «Пейвол и покупки» в Analytics и компактную платёжную сводку в Overview.

**Architecture:** Новый admin-only callable возвращает только ограниченные агрегаты по дням или неделям. Поведенческие события `paywall_funnel`, подтверждённые события RevenueCat, денежные суммы RevenueCat, покупки шардов и ограниченные причины ошибок остаются раздельными источниками и раздельными рядами. Браузер хранит последний успешный ответ, монтирует локально закреплённый Chart.js после строкового рендера Admin V2 и показывает `null`, а не ноль, когда источник неполный или недоступен.

**Tech Stack:** TypeScript, Firebase Functions v2, Firestore, BigQuery aggregate helper, vanilla ES modules, Chart.js 4.4.3, chartjs-plugin-zoom 2.0.1, Hammer.js 2.0.8, Jest, Node test runner.

---

## Scope and release boundary

Этот план объединяет фазы 1 и 2 утверждённого дизайна в один самостоятельно развёртываемый релиз:

- общий контракт временных рядов и модель состояний;
- локально закреплённый графический движок;
- графики пейвола, RevenueCat, денежной суммы и покупок шардов;
- ограниченная диаграмма причин ошибок покупки из аналитического хранилища;
- краткая платёжная сводка на Overview;
- периоды 7/28/90 дней, собственные даты, день/неделя, предыдущий период, панорамирование, масштабирование и сброс;
- сохранение всех существующих карточек, таблиц, определений и подробных модулей.

Следующие категории не входят в этот релиз и потребуют отдельных планов: продукт/сессии, обучение, активация/удержание, эксперименты/надёжность и трафик сайта.

## File responsibility map

### New server files

- `functions/src/admin_analytics_trends_core.ts` — чистая нормализация диапазонов, дневные/недельные корзины, фильтры, дедупликация, агрегирование рядов и правила `zero`/`null`.
- `functions/src/admin_analytics_trends_core.test.ts` — граничные даты UTC, сравнение периодов, фильтры, исключения dev/sandbox, покрытие денег и усечение.
- `functions/src/admin_analytics_trends.ts` — защищённый callable, ограниченные чтения Firestore, подключение BigQuery-причин, health-метаданные и ограниченный кеш.
- `functions/src/admin_analytics_trends.test.ts` — контракт запроса, разрешение `money.read`, ограничения, отсутствие сырых идентификаторов и неограниченных управляющих параметров.

### Changed server files

- `functions/src/index.ts` — экспорт `adminGetAnalyticsTrends`.
- `functions/src/admin_product_analytics.ts` — только переиспользуемый экспорт парсера агрегированных BigQuery-строк; существующий ответ не меняется и не удаляется.

### New Admin V2 files

- `admin/v2/scripts/admin-analytics-trends-state.js` — состояние загрузки, нормализованный запрос, TTL/LRU-кеш и сохранение последнего успешного ответа.
- `admin/v2/scripts/admin-analytics-trends-view.js` — HTML категории, Overview-сводки, панели фильтров, воронки, таблицы данных и mount descriptors.
- `admin/v2/scripts/components/admin-time-series-chart.js` — безопасная обёртка Chart.js, клавиатурное исследование, tooltip, zoom/pan, reset и destroy.
- `admin/v2/scripts/components/admin-bar-chart.js` — горизонтальные столбцы причин с теми же правилами доступности и уничтожения.
- `admin/v2/vendor/chart.umd.js`, `admin/v2/vendor/chartjs-plugin-zoom.min.js`, `admin/v2/vendor/hammer.min.js` — локально закреплённые браузерные артефакты.
- `scripts/sync-admin-v2-chart-assets.mjs` — детерминированное копирование закреплённых артефактов из `node_modules`.

### Changed Admin V2 files

- `admin/v2/scripts/admin-firebase.js` — bridge `loadAnalyticsTrends`.
- `admin/v2/scripts/admin-analytics-view.js` — встраивание новой категории без удаления текущих карточек и таблиц.
- `admin/v2/scripts/admin-core.js` — состояние, загрузка, автоматическая загрузка Overview, mount/destroy после рендера и действия контролов.
- `admin/v2/index.html` — локальные vendor scripts в правильном порядке.
- `admin/v2/styles/admin.css` — стабильная геометрия, адаптивность, контраст, клавиатурный фокус и reduced motion.
- `scripts/admin-v2-smoke.mjs` — новые модули и запрет внешнего CDN для графиков.
- `package.json`, `package-lock.json` — закреплённые зависимости и команда синхронизации.

### New/changed tests

- `tests/admin_v2_analytics_trends_contract.test.ts` — DOM/bridge/security/source-separation contract.
- `tests/admin_v2_analytics_trends_runtime.test.mjs` — state/cache/request behavior.
- `tests/admin_v2_chart_runtime.test.mjs` — конфигурация, `null`-разрывы, клавиатура, reset и destroy на fake Chart.
- `tests/admin_v2_analytics_contract.test.ts` — расширение текущего контракта без ослабления старых проверок.

## Stable response contract

Callable `adminGetAnalyticsTrends` принимает только нормализуемую структуру:

```ts
type TrendGranularity = 'day' | 'week';

interface AdminAnalyticsTrendsRequest {
  scope: 'overview' | 'paywall';
  presetDays?: 7 | 28 | 90;
  fromDate?: string; // YYYY-MM-DD UTC, inclusive
  toDate?: string;   // YYYY-MM-DD UTC, inclusive
  granularity?: TrendGranularity;
  comparePrevious?: boolean;
  filters?: {
    context?: string;
    variant?: 'A' | 'B' | 'C';
    plan?: 'monthly' | 'yearly' | 'lifetime';
    store?: 'APP_STORE' | 'PLAY_STORE' | 'STRIPE' | 'AMAZON' | 'PROMOTIONAL';
    productId?: string;
    platform?: 'ios' | 'android';
  };
}
```

Правила запроса:

- если собственные даты отсутствуют, используется `presetDays`, по умолчанию 28;
- `scope` обязателен и допускает только `overview` или `paywall`; Overview не запускает BigQuery, shard-чтение и подробные breakdown-агрегаты;
- собственный диапазон включает обе даты, не может заходить в будущее и не может быть длиннее 90 дней;
- день начинается в UTC; неделя начинается в понедельник UTC;
- предыдущий период имеет ту же длину и заканчивается непосредственно перед текущим;
- `context` и `productId` ограничены 40 и 120 символами, нормализуются и применяются только после ограниченного чтения;
- клиент не передаёт коллекцию, поле сортировки, лимит, SQL, timezone или произвольное имя метрики.

Ответ не содержит событий и идентификаторов:

```ts
interface AdminAnalyticsTrendsResponse {
  definitionVersion: 'admin_v2_graphical_analytics_v1';
  timezone: 'UTC';
  generatedAtMs: number;
  request: NormalizedTrendRequest;
  state: 'ready' | 'empty' | 'partial' | 'error';
  sources: Record<string, TrendSourceHealth>;
  sections: {
    behavioralPaywall: TrendSection;
    behavioralBreakdowns: {
      byContext: BreakdownSection;
      byVariant: BreakdownSection;
      byPlan: BreakdownSection;
    };
    confirmedStore: TrendSection;
    grossRevenue: TrendSection;
    shardPurchases: TrendSection;
    purchaseFailures: BreakdownSection;
  };
}
```

Каждая серия содержит только `metricId`, русскую подпись, единицу, источник, неизменяемое определение метрики, `status`, `coverage`, `limitations` и точки `{ bucketStart, value }`. Определение явно описывает сущность и правило счёта; для коэффициента также называет числитель и знаменатель. `value` равен `null`, если корзина неполная или источник недоступен. Ноль допустим только для полностью прочитанной корзины готового/пустого источника.

```ts
interface TrendMetricDefinition {
  entity: 'event' | 'transaction' | 'usd_micros';
  description: string;
  numerator?: string;
  denominator?: string;
}

interface TrendSeries {
  metricId: string;
  label: string;
  unit: 'count' | 'ratio' | 'usd_micros';
  source: string;
  definition: TrendMetricDefinition;
  status: 'ready' | 'empty' | 'partial' | 'unavailable';
  coverage: 'complete' | 'partial' | 'unavailable';
  limitations: string[];
  points: TrendPoint[];
  previousPoints: TrendPoint[] | null;
}
```

Рабочее дерево уже содержит несвязанные изменения пользователя. Поэтому этот план не выполняет автоматические `git add` или `git commit`. Если пользователь позже отдельно разрешит коммит, исполнитель обязан применить hunk-level staging, проверить `git diff --cached` и убедиться, что staged-набор содержит только изменения этого релиза.

## Task 1: Lock the trend request and bucket semantics with tests

**Files:**

- Create: `functions/src/admin_analytics_trends_core.test.ts`
- Create: `functions/src/admin_analytics_trends_core.ts`

- [ ] **Step 1: Write failing range and bucket tests**

```ts
import {
  buildTrendWindow,
  bucketStarts,
  normalizeTrendRequest,
} from './admin_analytics_trends_core';

describe('admin analytics trend request', () => {
  const nowMs = Date.UTC(2026, 6, 13, 12);

  it('uses an inclusive 28-day UTC preset', () => {
    expect(normalizeTrendRequest({ scope: 'paywall', presetDays: 28 }, nowMs)).toMatchObject({
      fromDate: '2026-06-16',
      toDate: '2026-07-13',
      granularity: 'day',
    });
  });

  it('rejects future, reversed and longer-than-90-day custom ranges', () => {
    expect(() => normalizeTrendRequest({ scope: 'paywall', fromDate: '2026-07-14', toDate: '2026-07-14' }, nowMs)).toThrow();
    expect(() => normalizeTrendRequest({ scope: 'paywall', fromDate: '2026-07-13', toDate: '2026-07-12' }, nowMs)).toThrow();
    expect(() => normalizeTrendRequest({ scope: 'paywall', fromDate: '2026-01-01', toDate: '2026-07-13' }, nowMs)).toThrow();
  });

  it('starts weekly buckets on Monday UTC and builds an adjacent comparison', () => {
    const request = normalizeTrendRequest({ scope: 'paywall', fromDate: '2026-07-01', toDate: '2026-07-13', granularity: 'week', comparePrevious: true }, nowMs);
    expect(bucketStarts(buildTrendWindow(request).current)).toEqual(['2026-06-29', '2026-07-06', '2026-07-13']);
    expect(buildTrendWindow(request).previous).toMatchObject({ fromDate: '2026-06-18', toDate: '2026-06-30' });
  });
});
```

- [ ] **Step 2: Run the focused test and confirm it fails because the module does not exist**

Run:

```powershell
npm --prefix functions test -- --runTestsByPath src/admin_analytics_trends_core.test.ts --runInBand
```

Expected: FAIL with `Cannot find module './admin_analytics_trends_core'`.

- [ ] **Step 3: Implement the minimal UTC parser and bucket builder**

```ts
export const DAY_MS = 86_400_000;
export type TrendGranularity = 'day' | 'week';

export function normalizeTrendRequest(data: unknown, nowMs = Date.now()): NormalizedTrendRequest {
  // Parse only allowlisted fields, validate YYYY-MM-DD strictly, cap at 90 inclusive days,
  // reject future dates, and freeze the normalized result.
}

export function startOfUtcWeek(ms: number): number {
  const day = new Date(ms).getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return startOfUtcDay(ms) + mondayOffset * DAY_MS;
}
```

Do not use local-time constructors such as `new Date(2026, 6, 13)`.

- [ ] **Step 4: Add pure tests for strict filter allowlists and bounded strings**

Verify unknown keys are ignored, invalid enum values become absent, and oversized `context`/`productId` produce a typed pure validation error. The conversion of that error to `HttpsError('invalid-argument')` belongs to Task 4 and is tested there.

- [ ] **Step 5: Run the focused test**

Expected: PASS.

## Task 2: Build honest paywall and store time-series aggregators

**Files:**

- Modify: `functions/src/admin_analytics_trends_core.ts`
- Modify: `functions/src/admin_analytics_trends_core.test.ts`

- [ ] **Step 1: Add failing tests for behavioral paywall filtering**

```ts
it('filters paywall rows and excludes dev events', () => {
  const result = aggregatePaywallTrends([
    { ts: utc('2026-07-10'), step: 'shown', variant: 'C', context: 'onboarding', plan: 'yearly' },
    { ts: utc('2026-07-10'), step: 'cta_click', variant: 'C', context: 'onboarding', plan: 'yearly' },
    { ts: utc('2026-07-10'), step: 'purchase_failed', variant: 'C', context: 'onboarding', plan: 'yearly' },
    { ts: utc('2026-07-10'), step: 'shown', variant: 'C', context: 'onboarding', plan: 'yearly', dev: true },
  ], request, readySource());

  expect(values(result, 'paywall.shown.v1')).toContain(1);
  expect(values(result, 'paywall.cta_click.v1')).toContain(1);
  expect(values(result, 'paywall.purchase_failed.v1')).toContain(1);
  expect(result.excluded.dev).toBe(1);
});
```

Cover all stored steps: `shown`, `cta_click`, `trial_started`, `purchase_completed`, `purchase_failed`, `purchase_cancelled`, `restore_completed`, and `close`.

Add breakdown assertions for the three dimensions actually stored by `paywall_funnel`: context, variant and plan. Sort descending by event count, cap each breakdown at 20 rows and collapse the remainder into `other`. Do not claim source or platform breakdowns from this Firestore collection because those fields are not stored there.

- [ ] **Step 2: Add failing tests for RevenueCat and shard truth separation**

```ts
it('deduplicates production RevenueCat events without joining them to paywall impressions', () => {
  const result = aggregateRevenueCatTrends([
    rc('buy-1', 'INITIAL_PURCHASE', 'TRIAL', 10),
    rc('buy-1', 'INITIAL_PURCHASE', 'TRIAL', 10),
    rc('renew-1', 'RENEWAL', 'NORMAL', 12),
    rc('sandbox', 'INITIAL_PURCHASE', 'TRIAL', 11, 'SANDBOX'),
  ], request, readySource());
  expect(result.series.map((series) => series.metricId)).toEqual(expect.arrayContaining([
    'store.confirmed_trial_start.v1',
    'store.initial_purchase.v1',
    'store.renewal.v1',
  ]));
  expect(result.excluded).toMatchObject({ duplicates: 1, sandbox: 1 });
});
```

Add a separate shard test for production-only, deduplicated transactions.

- [ ] **Step 3: Add failing financial-coverage tests**

Required cases:

- covered signed `grossUsdMicros` values sum inside a currency-only series;
- a bucket containing money events but no usable financial fields returns `null`;
- a mixed bucket with some money events carrying `grossUsdMicros` and others missing it returns `null`, `coverage: 'partial'`, and never exposes the known subtotal as if it were the total;
- a `financialCoverage: 'partial'` row may participate in gross revenue only when `grossUsdMicros` itself is present; coverage for gross is computed field-by-field, not inferred from proceeds/tax completeness;
- an empty bucket from a fully ready source returns `0`;
- refund values remain signed and are not converted into purchase counts;
- gross revenue never appears in the count section.

- [ ] **Step 4: Add failing source-state tests**

```ts
it('uses null from the first uncertain bucket after an ascending capped read', () => {
  const source = { state: 'partial', truncated: true, uncertaintyStartsAtMs: utc('2026-07-11') };
  expect(values(aggregatePaywallTrends(rows, request, source), 'paywall.shown.v1')).toEqual([0, 2, null, null]);
});

it('uses zeros only when an empty source was read successfully', () => {
  expect(values(aggregatePaywallTrends([], request, emptySource()), 'paywall.shown.v1')).toEqual([0, 0, 0, 0]);
  expect(values(aggregatePaywallTrends([], request, errorSource()), 'paywall.shown.v1')).toEqual([null, null, null, null]);
});
```

- [ ] **Step 5: Run the tests and confirm the new cases fail**

Run the same focused Jest command as Task 1.

- [ ] **Step 6: Implement pure aggregators**

```ts
export interface TrendPoint { bucketStart: string; value: number | null }
export interface TrendSeries {
  metricId: string;
  label: string;
  unit: 'count' | 'ratio' | 'usd_micros';
  source: 'paywall_funnel' | 'revenuecat_premium_events' | 'revenuecat_shard_transactions';
  definition: TrendMetricDefinition;
  status: 'ready' | 'empty' | 'partial' | 'unavailable';
  coverage: 'complete' | 'partial' | 'unavailable';
  limitations: string[];
  points: TrendPoint[];
  previousPoints: TrendPoint[] | null;
}

function finalizeBucket(value: number, bucketMs: number, health: TrendSourceHealth): number | null {
  if (health.state === 'error' || health.state === 'unavailable') return null;
  if (health.truncated && health.uncertaintyStartsAtMs != null && bucketMs >= health.uncertaintyStartsAtMs) return null;
  return value;
}
```

Use one shared `eventIdentity` dedupe rule per source and never return the dedupe key.

Compute `latestAtMs`, `dataAgeMs` and `freshness: 'recent' | 'stale_event_watermark' | 'no_events' | 'unknown'` independently from completeness. A stale last-event watermark is an operator hint; it must not convert an otherwise complete zero bucket into `null`.

- [ ] **Step 7: Re-run the focused tests**

Expected: PASS.

## Task 3: Add bounded purchase-failure reasons from the governed warehouse

**Files:**

- Modify: `functions/src/admin_analytics_trends_core.ts`
- Modify: `functions/src/admin_analytics_trends_core.test.ts`
- Modify: `functions/src/admin_product_analytics.ts`

- [ ] **Step 1: Add a failing parser test for the existing `conversion_failure` rows**

```ts
it('returns only bounded governed purchase-failure groups', () => {
  const rows = [
    { row_kind: 'conversion_failure', payload: JSON.stringify({ reason: 'network_error', events: 4, app_instances: 3 }) },
    { row_kind: 'conversion_failure', payload: JSON.stringify({ reason: 'unexpected_raw_message', events: 2 }) },
  ];
  expect(extractPaywallFailureBreakdown(rows)).toEqual([
    { id: 'network_error', events: 4, appInstances: 3 },
    { id: 'legacy_or_other', events: 2, appInstances: 0 },
  ]);
});
```

- [ ] **Step 2: Export only the reusable payload parser from product analytics**

Change the existing private function to:

```ts
export function parseProductAnalyticsPayload(row: ProductAnalyticsQueryRow): Record<string, unknown> | null {
  try {
    return typeof row.payload === 'string' ? JSON.parse(row.payload) as Record<string, unknown> : null;
  } catch {
    return null;
  }
}
```

Update its internal call sites without changing the current `adminProductAnalytics` response.

- [ ] **Step 3: Implement the allowlisted reason extractor**

Allow only the governed groups already emitted by the SQL:

```ts
const PURCHASE_FAILURE_REASONS = new Set([
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
]);
```

Unknown values collapse to `legacy_or_other`; raw error strings never leave the server.

- [ ] **Step 4: Run the focused core test and existing product analytics test**

```powershell
npm --prefix functions test -- --runTestsByPath src/admin_analytics_trends_core.test.ts src/admin_product_analytics.test.ts --runInBand
```

Expected: PASS.

## Task 4: Implement the protected aggregate callable

**Files:**

- Create: `functions/src/admin_analytics_trends.ts`
- Create: `functions/src/admin_analytics_trends.test.ts`
- Modify: `functions/src/index.ts`

- [ ] **Step 1: Write failing callable contract tests**

```ts
describe('admin analytics trends callable contract', () => {
  const source = fs.readFileSync(path.join(__dirname, 'admin_analytics_trends.ts'), 'utf8');

  it('requires money.read and app check', () => {
    expect(source).toContain("hasClaimedPermission(request.auth?.token, 'money.read')");
    expect(source).toContain('enforceAppCheck: ENFORCE_APP_CHECK');
  });

  it('reads only fixed sources with fixed bounds', () => {
    expect(source).toContain("collection('paywall_funnel')");
    expect(source).toContain("collection('revenuecat_premium_events')");
    expect(source).toContain("collection('revenuecat_shard_transactions')");
    expect(source).toContain('EVENT_CAP + 1');
    expect(source).not.toMatch(/collection\(request\.|orderBy\(request\.|limit\(request\./);
  });

  it('maps pure validation failures to an invalid-argument HttpsError', () => {
    expect(() => parseAdminAnalyticsTrendsRequest({ scope: 'unknown' }, NOW)).toThrow(HttpsError);
    expect(() => parseAdminAnalyticsTrendsRequest({ scope: 'paywall', filters: { context: 'x'.repeat(41) } }, NOW)).toThrow(HttpsError);
  });

  it('uses the allowlisted minimal source plan for each scope', () => {
    expect(sourcesForScope('overview')).toEqual(['paywall', 'premium_event_time', 'premium_created_at']);
    expect(sourcesForScope('paywall')).toEqual([
      'paywall', 'premium_event_time', 'premium_created_at', 'shards', 'purchase_failures',
    ]);
  });
});
```

Add a response-key test that creates a pure aggregate sample and proves serialized output contains none of: `uid`, `uidh`, `eventId`, `transactionId`, `originalTransactionId`, `candidates`, raw rows, or raw error messages.
Add a settled-read test where paywall fails but RevenueCat succeeds; the response must be `partial`, paywall points must be `null`, and confirmed-store points must remain available. Add the inverse case and the all-source failure case.

- [ ] **Step 2: Run the tests and confirm failure**

```powershell
npm --prefix functions test -- --runTestsByPath src/admin_analytics_trends.test.ts --runInBand
```

Expected: FAIL because the callable file does not exist.

- [ ] **Step 3: Implement ascending bounded reads**

```ts
const EVENT_CAP = 5_000;
const CACHE_TTL_MS = 10 * 60 * 1_000;
const CACHE_MAX_ENTRIES = 24;

async function readTrendRows(
  query: FirebaseFirestore.Query,
  timestampField: string,
  granularity: TrendGranularity,
): Promise<TrendReadResult> {
  const snapshot = await query.limit(EVENT_CAP + 1).get();
  const truncated = snapshot.size > EVENT_CAP;
  const docs = snapshot.docs.slice(0, EVENT_CAP);
  const lastAtMs = docs.length ? timestampMillis(docs[docs.length - 1].get(timestampField)) : null;
  return {
    rows: docs.map((doc) => ({ id: doc.id, ...doc.data() })),
    truncated,
    uncertaintyStartsAtMs: truncated ? startOfBucket(lastAtMs, granularity) : null,
  };
}
```

Read the combined comparison/current window. For a truncated ascending query, mark the bucket containing the last returned row and every later bucket as `null`.

- [ ] **Step 4: Compose the sources without cross-source joins**

Choose an allowlisted execution plan before reading:

- `scope: 'overview'` reads only paywall and RevenueCat premium data needed for the four summary metrics and three count lines;
- `scope: 'paywall'` additionally reads shards, detailed behavioral breakdowns and the bounded BigQuery failure groups;
- no scope can request arbitrary sources or skip the fixed caps.

Run the selected reads with `Promise.allSettled` and convert each failure into safe source health. One unavailable source must produce an overall `partial` response while other successful sections remain usable; only an all-source failure produces `state: 'error'`.

Fixed reads are:

- `paywall_funnel` by numeric `ts`;
- `revenuecat_premium_events` by numeric `eventTimestampMs` plus a second bounded `createdAt` range read that retains only rows with missing/invalid `eventTimestampMs` and assigns `createdAtMs` as the effective event time;
- `revenuecat_shard_transactions` by numeric `eventTimestampMs`;
- `loadProductAnalyticsAggregateRows` with fixed UTC dates, selected platform and `maximumBytesBilled: '5000000000'`.

Merge and deduplicate the two RevenueCat branches before aggregation. If either branch is truncated or fails, mark the RevenueCat source partial and turn affected/uncertain buckets into `null`; never silently discard legacy rows. Return separate sections. Do not divide RevenueCat events by Firestore impressions and do not infer attribution.

Every successful response explicitly returns `timezone: 'UTC'`. Every series returns its immutable metric definition, source, unit, status, coverage and limitations. Tests assert these fields for current and previous-period series.

- [ ] **Step 5: Encode paywall retention limits honestly**

`paywall_funnel` has a 90-day TTL. For every current or comparison bucket older than `generatedAtMs - 90 days`, return `null` and publish source limitation `bucket_outside_paywall_retention`; do not fabricate zeros. This allows an older custom RevenueCat range to remain useful while clearly marking the paywall part unavailable.

- [ ] **Step 6: Add a bounded TTL/LRU cache**

```ts
const cache = new Map<string, { expiresAtMs: number; value: AdminAnalyticsTrendsResponse }>();

function cacheSet(key: string, value: AdminAnalyticsTrendsResponse, nowMs: number): void {
  for (const [candidate, entry] of cache) if (entry.expiresAtMs <= nowMs) cache.delete(candidate);
  cache.set(key, { expiresAtMs: nowMs + CACHE_TTL_MS, value });
  while (cache.size > CACHE_MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
}
```

The cache key is the serialized normalized request including `scope`, never raw request input.

- [ ] **Step 7: Export the callable**

Add to `functions/src/index.ts`:

```ts
export { adminGetAnalyticsTrends } from './admin_analytics_trends';
```

- [ ] **Step 8: Run focused server verification**

```powershell
npm --prefix functions test -- --runTestsByPath src/admin_analytics_trends_core.test.ts src/admin_analytics_trends.test.ts src/admin_analytics_core.test.ts src/admin_product_analytics.test.ts src/admin_subscription_analytics_core.test.ts src/admin_revenue_analytics_core.test.ts --runInBand
npm --prefix functions run build
```

Expected: all tests PASS and TypeScript build exits 0.

## Task 5: Add the browser bridge and resilient trend state

**Files:**

- Create: `admin/v2/scripts/admin-analytics-trends-state.js`
- Create: `tests/admin_v2_analytics_trends_runtime.test.mjs`
- Modify: `admin/v2/scripts/admin-firebase.js`
- Modify: `scripts/admin-v2-smoke.mjs`

- [ ] **Step 1: Write failing state tests**

```js
test('keeps the last good trends during loading and an error', () => {
  const ready = completeTrendLoad(initialTrendState(), response('ready'), request);
  const loading = beginTrendLoad(ready, request);
  const failed = failTrendLoad(loading, new Error('offline'));
  assert.equal(failed.data, ready.data);
  assert.equal(failed.status, 'error');
});

test('reuses a fresh normalized request but evicts expired and old entries', () => {
  // Assert max six client entries and ten-minute TTL.
});

test('keeps overview and paywall scope caches separate', () => {
  assert.notEqual(cacheKey({ ...request, scope: 'overview' }), cacheKey({ ...request, scope: 'paywall' }));
});

test('route switching selects an independent scoped state without relabelling cached data', () => {
  const states = createAnalyticsTrendScopesState();
  states.overview = completeTrendLoad(states.overview, response('ready', 'overview'), overviewRequest);
  assert.equal(trendsStateForRoute(states, 'overview').request.scope, 'overview');
  assert.equal(trendsStateForRoute(states, 'analytics').request.scope, 'paywall');
  assert.equal(states.paywall.data, null);
  assert.equal(states.overview.data.request.scope, 'overview');
});
```

Also test that changing only a visible-series toggle does not create a server request.

- [ ] **Step 2: Run and confirm the module-not-found failure**

```powershell
node --test tests/admin_v2_analytics_trends_runtime.test.mjs
```

- [ ] **Step 3: Implement the finite client state model**

```js
export function createAnalyticsTrendsState(scope) {
  return {
    status: 'idle',
    data: null,
    error: '',
    request: defaultTrendRequest(scope),
    visibleSeries: {},
    cache: [],
  };
}

export function failTrendLoad(current, error) {
  return { ...current, status: 'error', data: current.data, error: safeErrorMessage(error) };
}

export function createAnalyticsTrendScopesState() {
  return {
    overview: createAnalyticsTrendsState('overview'),
    paywall: createAnalyticsTrendsState('paywall'),
  };
}

export function trendsStateForRoute(states, route) {
  return route === 'overview' ? states.overview : states.paywall;
}
```

Keep at most six aggregate responses in the client cache and never cache raw events.
`defaultTrendRequest(scope)` requires an explicit allowlisted scope. The root state keeps independent `overview` and `paywall` branches; route changes never reuse or relabel a narrower Overview response as if it were a complete paywall-category response.

- [ ] **Step 4: Add the callable bridge**

In `admin-firebase.js`:

```js
const analyticsTrendsCallable = httpsCallable(functionsUs, 'adminGetAnalyticsTrends');
// ...
loadAnalyticsTrends: async (input) => unwrap(await analyticsTrendsCallable(input)),
```

- [ ] **Step 5: Add the new state module to the smoke file list**

The smoke test must also assert that no Admin V2 analytics module calls Firestore browser methods.

- [ ] **Step 6: Run focused tests**

```powershell
node --test tests/admin_v2_analytics_trends_runtime.test.mjs
npx jest --runTestsByPath tests/admin_v2_analytics_contract.test.ts --runInBand --no-cache
node scripts/admin-v2-smoke.mjs
```

Expected: PASS.

## Task 6: Pin and vendor the chart runtime locally

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `scripts/sync-admin-v2-chart-assets.mjs`
- Create: `admin/v2/vendor/chart.umd.js`
- Create: `admin/v2/vendor/chartjs-plugin-zoom.min.js`
- Create: `admin/v2/vendor/hammer.min.js`
- Modify: `admin/v2/index.html`
- Create: `tests/admin_v2_analytics_trends_contract.test.ts`

- [ ] **Step 1: Write a failing local-asset contract**

```ts
test('loads pinned local chart assets and no chart CDN', () => {
  const html = read('admin/v2/index.html');
  expect(html).toContain('/v2/vendor/hammer.min.js');
  expect(html).toContain('/v2/vendor/chart.umd.js');
  expect(html).toContain('/v2/vendor/chartjs-plugin-zoom.min.js');
  expect(html).not.toMatch(/unpkg|jsdelivr|cdnjs/);
  expect(html.indexOf('hammer.min.js')).toBeLessThan(html.indexOf('chartjs-plugin-zoom.min.js'));
});
```

- [ ] **Step 2: Run and confirm failure**

```powershell
npx jest --runTestsByPath tests/admin_v2_analytics_trends_contract.test.ts --runInBand --no-cache
```

- [ ] **Step 3: Install exact versions**

```powershell
npm install --save-exact chart.js@4.4.3 chartjs-plugin-zoom@2.0.1 hammerjs@2.0.8
```

Do not use a CDN and do not loosen these versions to `^` or `~`.

- [ ] **Step 4: Add deterministic asset synchronization**

```js
const assets = [
  ['node_modules/chart.js/dist/chart.umd.js', 'admin/v2/vendor/chart.umd.js'],
  ['node_modules/chartjs-plugin-zoom/dist/chartjs-plugin-zoom.min.js', 'admin/v2/vendor/chartjs-plugin-zoom.min.js'],
  ['node_modules/hammerjs/hammer.min.js', 'admin/v2/vendor/hammer.min.js'],
];
```

The script must fail if a source is missing and use `fs.copyFile`, not network access.

Add package script:

```json
"admin:v2:sync-chart-assets": "node scripts/sync-admin-v2-chart-assets.mjs"
```

- [ ] **Step 5: Generate the committed vendor files and add script tags**

```powershell
npm run admin:v2:sync-chart-assets
```

Load Hammer, Chart.js, then zoom plugin before the Admin V2 module router.

- [ ] **Step 6: Verify local assets and contract**

```powershell
npx jest --runTestsByPath tests/admin_v2_analytics_trends_contract.test.ts --runInBand --no-cache
node scripts/admin-v2-smoke.mjs
```

Expected: PASS.

## Task 7: Build the accessible reusable chart components

**Files:**

- Create: `admin/v2/scripts/components/admin-time-series-chart.js`
- Create: `admin/v2/scripts/components/admin-bar-chart.js`
- Create: `tests/admin_v2_chart_runtime.test.mjs`
- Modify: `scripts/admin-v2-smoke.mjs`

- [ ] **Step 1: Write failing fake-Chart runtime tests**

Test these exact behaviors:

- `spanGaps: false` and `null` values stay `null`;
- category-axis labels use ISO bucket keys, so no date adapter is required;
- hover and keyboard focus render the exact Russian date/range, current value with unit, previous-period value when enabled, source label and metric definition;
- `prefers-reduced-motion` disables chart animation;
- ArrowLeft/ArrowRight on the canvas changes the active bucket and updates an `aria-live` region;
- `resetZoom()` is called by the reset action;
- every chart is destroyed before DOM replacement;
- legend buttons can hide/show series without a server reload.

```js
test('does not bridge a partial gap', () => {
  const chart = mountTimeSeriesChart(host, descriptorWith([1, null, 3]), fakeChartFactory);
  assert.equal(chart.config.data.datasets[0].spanGaps, false);
  assert.deepEqual(chart.config.data.datasets[0].data, [1, null, 3]);
});
```

- [ ] **Step 2: Run and confirm failure**

```powershell
node --test tests/admin_v2_chart_runtime.test.mjs
```

- [ ] **Step 3: Implement the line-chart component**

```js
export function mountTimeSeriesChart(host, descriptor, chartFactory = globalThis.Chart) {
  const canvas = host.querySelector('canvas');
  canvas.tabIndex = 0;
  const chart = new chartFactory(canvas, {
    type: 'line',
    data: buildData(descriptor),
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: reducedMotion() ? false : { duration: 240 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        zoom: {
          pan: { enabled: true, mode: 'x' },
          zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' },
        },
      },
      scales: { x: { type: 'category' }, y: { beginAtZero: true } },
    },
  });
  return bindKeyboardInspection(host, chart, descriptor);
}
```

Each current-period line uses `tension: 0.28`, `spanGaps: false` and visible point emphasis only on hover/focus. Previous-period lines use the same semantic color with a dashed border and remain off by default until comparison is enabled. Never combine `count` and `usd_micros` datasets in one descriptor.

- [ ] **Step 4: Implement horizontal bars and shared lifecycle**

The bar chart uses `indexAxis: 'y'`, no smoothing, bounded category labels, and the same keyboard/data-table contract.

Export a registry:

```js
const liveCharts = new Map();
export function destroyAdminCharts() {
  for (const mounted of liveCharts.values()) mounted.destroy();
  liveCharts.clear();
}
```

- [ ] **Step 5: Add an accessible data table to every descriptor**

The canvas receives a concise `aria-label`; a `<details>` table contains every bucket/value/source and remains usable without hover. Unavailable values render as `—`, never `0`.

The `aria-live` text and visual tooltip use one formatter so they cannot disagree. A runtime test focuses a bucket with comparison enabled and asserts the complete string contains definition, source, exact period, current value/unit and previous-period value.

- [ ] **Step 6: Run runtime and smoke tests**

```powershell
node --test tests/admin_v2_chart_runtime.test.mjs
node scripts/admin-v2-smoke.mjs
```

Expected: PASS.

## Task 8: Render the Paywall and purchases category without removing existing analytics

**Files:**

- Create: `admin/v2/scripts/admin-analytics-trends-view.js`
- Modify: `admin/v2/scripts/admin-analytics-view.js`
- Modify: `admin/v2/scripts/admin-core.js`
- Modify: `tests/admin_v2_analytics_trends_contract.test.ts`
- Modify: `tests/admin_v2_analytics_trends_runtime.test.mjs`
- Modify: `tests/admin_v2_analytics_contract.test.ts`

- [ ] **Step 1: Write failing UI contract tests**

Require:

- presets 7/28/90;
- `from`/`to` date inputs;
- daily/weekly select;
- previous-period checkbox;
- source-scoped context/variant/plan, store/product and platform controls;
- reset zoom and refresh actions;
- separate headings for behavioral and confirmed store truth;
- separate currency chart;
- context, variant and plan breakdown bars from the behavioral Firestore source;
- failure-reason bars;
- source freshness/status;
- existing `Активные доступы`, store totals, funnel totals, activity table and detailed workspaces still present.
- a rapid-rerender runtime case where only the latest render generation mounts charts and no stale/duplicate Chart instance survives.
- a malicious breakdown label such as `\"><img src=x onerror=alert(1)>` is rendered only as escaped text, never as an element or attribute boundary.

```ts
expect(view).toContain('Поведение внутри пейвола');
expect(view).toContain('Подтверждено магазином');
expect(view).toContain('Валовая выручка');
expect(view).toContain('Причины ошибок покупки');
expect(view).toContain('data-action="reset-analytics-zoom"');
expect(existingView).toContain('Активные доступы');
```

- [ ] **Step 2: Run and confirm failure**

```powershell
npx jest --runTestsByPath tests/admin_v2_analytics_trends_contract.test.ts tests/admin_v2_analytics_contract.test.ts --runInBand --no-cache
```

- [ ] **Step 3: Implement pure renderers and descriptors**

Define and export a local escaping helper because the helper in `admin-analytics-view.js` is module-private. Every dynamic value interpolated into HTML text or an attribute must pass through it; live-region updates must use `textContent`, never `innerHTML`:

```js
export function escapeAnalyticsHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}
```

The runtime test renders the malicious context above and asserts the result contains neither a raw `<img` tag nor the raw `\"><img` attribute boundary, while `&quot;&gt;&lt;img` does occur. When a DOM implementation is available, also assert `querySelector('img')` returns `null`.

```js
export function renderPaywallAnalyticsCategory(model) {
  return `<section class="analytics-category" aria-labelledby="paywall-analytics-title">
    ${renderTrendToolbar(model)}
    ${renderBehavioralChart(model.data?.sections?.behavioralPaywall)}
    ${renderPaywallFunnel(model.data?.sections?.behavioralPaywall)}
    ${renderBehavioralBreakdowns(model.data?.sections?.behavioralBreakdowns)}
    ${renderConfirmedStoreChart(model.data?.sections?.confirmedStore)}
    ${renderRevenueChart(model.data?.sections?.grossRevenue)}
    ${renderShardChart(model.data?.sections?.shardPurchases)}
    ${renderFailureBars(model.data?.sections?.purchaseFailures)}
    ${renderTrendSources(model.data?.sources)}
  </section>`;
}
```

The behavioral funnel is semantic HTML/CSS, not a decorative line. Keep `purchase signal` wording for Firestore and `confirmed purchase` wording for RevenueCat.

Show at most four behavioral lines by default: impressions, CTA clicks, trial signals and purchase signals. Close, cancellation, failure and restore series remain available through explicit legend toggles; they are not all painted at once.

- [ ] **Step 4: Preserve source-scoped filter meaning**

- context/variant/plan affect only `paywall_funnel` cards;
- store/product affect only RevenueCat and money cards;
- platform affects only governed warehouse failure reasons;
- each control group includes a short visible scope note and tooltip;
- no control silently changes unrelated charts.

- [ ] **Step 5: Integrate state and loading actions into `admin-core.js`**

Add state beside, not instead of, current `state.analytics`:

```js
analyticsTrends: createAnalyticsTrendScopesState(),
```

The existing primary `load-analytics` action starts both the current snapshot and `state.analyticsTrends.paywall` with `scope: 'paywall'` via `Promise.allSettled`. Overview quiet loading changes only `state.analyticsTrends.overview`. Each branch succeeds/fails independently, so a trend failure cannot erase valid totals, a snapshot failure cannot erase valid trends, and route switching cannot overwrite another scope's last-good response.

Add actions:

```js
if (action === 'load-analytics-trends') return loadAnalyticsTrends({ force: true });
if (action === 'reset-analytics-zoom') return resetAllAdminChartZoom();
if (action === 'toggle-analytics-series') return toggleVisibleSeries(target.dataset.metricId);
```

- [ ] **Step 6: Mount and destroy charts around Admin V2 string rendering**

At the start of `renderCurrentPage()`, increment a render generation and call `destroyAdminCharts()`. After `target.innerHTML` and guidance setup, use one `queueMicrotask` to mount descriptors only if its captured generation is still current:

```js
let renderGeneration = 0;

function renderCurrentPage() {
  const generation = ++renderGeneration;
  destroyAdminCharts();
  // Existing string render and guidance setup.
  queueMicrotask(() => {
    if (generation !== renderGeneration) return;
    mountAnalyticsChartsForRoute(state.route);
  });
}
```

The runtime test triggers two renders before queued callbacks flush and asserts the stale generation mounts nothing.

- [ ] **Step 7: Keep custom-date values stable through render**

Read controls into a normalized draft before starting the request. During loading, rerender using the draft; do not reset dates to 28 days.

- [ ] **Step 8: Run focused contracts and runtime tests**

```powershell
npx jest --runTestsByPath tests/admin_v2_analytics_trends_contract.test.ts tests/admin_v2_analytics_contract.test.ts --runInBand --no-cache
node --test tests/admin_v2_analytics_trends_runtime.test.mjs tests/admin_v2_chart_runtime.test.mjs
node scripts/admin-v2-smoke.mjs
```

Expected: PASS.

## Task 9: Add the compact Overview payment summary

**Files:**

- Modify: `admin/v2/scripts/admin-analytics-trends-view.js`
- Modify: `admin/v2/scripts/admin-core.js`
- Modify: `tests/admin_v2_analytics_trends_contract.test.ts`

- [ ] **Step 1: Add failing Overview contract tests**

Require the section title `Что происходит с оплатой`, four headline slots (paywall impressions, confirmed trial starts, confirmed initial purchases and covered gross revenue), one count-only trend with no more than three visible series, compact behavioral funnel, source health and links to `#analytics`.

Explicitly reject a mixed money/count descriptor:

```ts
expect(source).toContain('renderOverviewPaymentSummary');
expect(source).toContain('Что происходит с оплатой');
expect(source).not.toContain("overviewSeries: ['paywall.shown.v1', 'revenue.gross_usd_micros.v1']");
```

- [ ] **Step 2: Run and confirm failure**

Run the Admin V2 trends contract test.

- [ ] **Step 3: Implement the compact renderer**

```js
export function renderOverviewPaymentSummary(model) {
  return `<section class="card overview-payment" aria-labelledby="overview-payment-title">
    <div class="card-header">...</div>
    <div class="card-body">
      ${renderOverviewHeadlineMetrics(model)}
      ${renderOverviewCountTrend(model)}
      ${renderCompactFunnel(model)}
      ${renderOverviewSourceHealth(model)}
      <a class="button" href="#analytics">Открыть всю аналитику</a>
    </div>
  </section>`;
}
```

Headline gross revenue may be shown only when financial coverage is usable. It is not a dataset on the count chart.

- [ ] **Step 4: Add quiet Overview loading**

When entering Overview with `money.read`, request `scope: 'overview'` and load cached/fresh trends only if the client TTL expired. The server must skip BigQuery, shards and detailed breakdown work for this scope. Keep final card geometry with skeletons and do not replace the whole Overview with a spinner.

- [ ] **Step 5: Run focused tests**

```powershell
npx jest --runTestsByPath tests/admin_v2_analytics_trends_contract.test.ts tests/admin_v2_operational_snapshot.test.ts --runInBand --no-cache
node --test tests/admin_v2_analytics_trends_runtime.test.mjs tests/admin_v2_chart_runtime.test.mjs
```

Expected: PASS.

## Task 10: Apply the Admin UI Bible, responsiveness and reduced motion

**Files:**

- Modify: `admin/v2/styles/admin.css`
- Modify: `tests/admin_v2_analytics_trends_contract.test.ts`

- [ ] **Step 1: Add failing CSS contract checks**

Require named rules for:

- `.analytics-trend-toolbar`;
- `.analytics-chart-frame` with stable min-height;
- `.analytics-chart-canvas`;
- `.analytics-funnel` and stages;
- `.analytics-source-scope`;
- `:focus-visible`;
- breakpoints covering 375, 768, 1024 and wide desktop behavior;
- reduced-motion chart/container transitions;
- lime foreground via `var(--lime-ink)`.

- [ ] **Step 2: Implement the visual system**

```css
.analytics-chart-frame {
  position: relative;
  min-height: 20rem;
  overflow: hidden;
}

.analytics-chart-canvas {
  height: 20rem;
}

.analytics-filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  gap: 12px;
}

@media (max-width: 760px) {
  .analytics-chart-canvas { height: 17rem; }
  .analytics-trend-toolbar { align-items: stretch; }
}

@media (prefers-reduced-motion: reduce) {
  .analytics-chart-frame, .analytics-funnel-stage { transition: none; }
}
```

Use the existing neutral palette. Reserve semantic green/amber/red for status and source health; series differentiation uses restrained blue/violet/teal plus dash styles, not a rainbow.

- [ ] **Step 3: Verify keyboard focus and narrow-width overflow**

Controls wrap; chart panels never force the whole page wider than 375 px; only the chart viewport pans horizontally. Data tables use the existing `.table-scroll` pattern.

- [ ] **Step 4: Run UI audits**

```powershell
npx jest --runTestsByPath tests/admin_v2_analytics_trends_contract.test.ts tests/admin_v2_analytics_contract.test.ts --runInBand --no-cache
node scripts/admin-v2-tooltip-audit.mjs
node scripts/admin-v2-language-audit.mjs
node scripts/admin-v2-visible-text-audit.mjs
node scripts/admin-v2-smoke.mjs
```

Expected: all commands PASS.

## Task 11: Verify the complete release and document evidence

**Files:**

- Modify only if a real defect is found by verification; do not update snapshots or weaken guards.

- [ ] **Step 1: Run the complete focused server gate**

```powershell
npm --prefix functions test -- --runTestsByPath src/admin_analytics_trends_core.test.ts src/admin_analytics_trends.test.ts src/admin_analytics_core.test.ts src/admin_product_analytics.test.ts src/admin_subscription_analytics_core.test.ts src/admin_revenue_analytics_core.test.ts --runInBand
npm --prefix functions run build
```

- [ ] **Step 2: Run the complete focused Admin V2 gate**

```powershell
npx jest --runTestsByPath tests/admin_v2_analytics_trends_contract.test.ts tests/admin_v2_analytics_contract.test.ts tests/admin_v2_operational_snapshot.test.ts tests/admin_v2_plain_language_contract.test.ts tests/admin_v2_smoke_current_contract.test.ts --runInBand --no-cache
node --test tests/admin_v2_analytics_trends_runtime.test.mjs tests/admin_v2_chart_runtime.test.mjs tests/admin_v2_analytics_runtime.test.mjs
node scripts/admin-v2-tooltip-audit.mjs
node scripts/admin-v2-language-audit.mjs
node scripts/admin-v2-visible-text-audit.mjs
node scripts/admin-v2-smoke.mjs
```

- [ ] **Step 3: Check syntax and changed-file hygiene**

```powershell
node --check admin/v2/scripts/admin-analytics-trends-state.js
node --check admin/v2/scripts/admin-analytics-trends-view.js
node --check admin/v2/scripts/components/admin-time-series-chart.js
node --check admin/v2/scripts/components/admin-bar-chart.js
node --check scripts/sync-admin-v2-chart-assets.mjs
git diff --check
git status --short
```

- [ ] **Step 4: Perform manual browser acceptance at four widths**

Run:

```powershell
npm run admin:serve
```

Inspect authenticated Admin V2 at 375, 768, 1024 and 1440 px:

- Overview keeps stable geometry and shows payment trends when permitted;
- Analytics presets and custom dates survive refresh;
- day/week and previous-period controls update labels correctly;
- hover shows date and values;
- keyboard arrows inspect exact buckets and update the live region;
- mouse/touch pan and wheel/pinch zoom work;
- reset restores the full range;
- `null` gaps are visibly broken, never connected;
- behavioral signals and confirmed store outcomes are visibly separate;
- currency is never plotted on a count axis;
- source errors preserve the last good charts and show an honest warning;
- existing tables and detailed analytics modules remain available.

- [ ] **Step 5: Verify the built hosting directory without deploying**

Confirm `admin/v2/vendor/*` resolves through the local server and that browser network requests contain no chart CDN. Do not run `npm run hosting:admin` unless the user explicitly authorizes deployment.

- [ ] **Step 6: Obtain the mandatory Advisor review without mutating git state**

If verification required fixes, rerun the affected focused checks. Do not stage or commit in the dirty workspace. Give Advisor the objective, approved spec, actual final diff, commands and results, manual viewport evidence, source limitations and unresolved uncertainty. Completion requires `DECISION: APPROVED`.

## Release acceptance checklist

- [ ] Overview and Analytics both contain the approved first-release graphical structure.
- [ ] Every line point comes from a dated aggregate bucket.
- [ ] 7/28/90, custom dates, day/week and previous-period controls work.
- [ ] Hover and keyboard inspection expose exact date/value/source.
- [ ] Horizontal pan, zoom and reset work without page-wide overflow.
- [ ] Firestore behavioral signals are never labelled as store-confirmed truth.
- [ ] RevenueCat trial/purchase/renewal/refund counts are separate from behavioral signals.
- [ ] Gross revenue has a currency-only chart and coverage state.
- [ ] Shard purchases remain a separate source.
- [ ] Failure reasons use only the governed bounded groups.
- [ ] Ready empty buckets are zero; partial/error/unavailable buckets are `null`.
- [ ] Last good data remains visible on refresh errors.
- [ ] No raw event, person, transaction or dedupe identifier reaches the browser.
- [ ] No Admin V2 analytics module performs direct browser Firestore reads.
- [ ] Existing cards, tables, definitions, modules and permissions remain intact.
- [ ] Focused tests, audits, TypeScript build and four-width manual checks pass.
- [ ] No deployment is performed without explicit user authorization.
