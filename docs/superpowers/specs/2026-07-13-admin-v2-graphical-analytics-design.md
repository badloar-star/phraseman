# Admin V2 Graphical Analytics Design

Date: 2026-07-13
Status: approved in interactive design review; ready for implementation planning

## Objective

Add a complete graphical analytics layer to Phraseman Admin V2 without weakening its protected server-side data model.

The result must make useful numbers easier to interpret through the correct visual form: time-series lines, funnels, bars, distributions, cohort views, and status indicators. It must support selectable periods, custom dates, daily or weekly grouping, exact values on hover or keyboard focus, horizontal pan, zoom, and reset.

The approved layout is **Overview + categories**:

- the main `Overview` page shows only three or four decision-grade trends;
- the full `Analytics` page contains the complete categorized set of charts and filters;
- existing tables, metric definitions, source-health information, and non-graphical capabilities remain available.

## Why the feature is needed

The legacy admin contains interactive Chart.js trends for site traffic, store clicks, purchases, and paywall funnel events. Admin V2 migrated totals, filters, cards, and detailed tables, but did not migrate a reusable time-series component or return the required daily series from its protected callables.

This is an incomplete migration, not a browser rendering failure. Admin V2 already exposes many useful totals, but totals alone do not show direction, volatility, seasonality, or the date of a change.

## Approved approach

Build a protected V2-native analytics system.

Rejected alternatives:

1. Drawing charts over the current totals would be fast but would not provide real history or honest date selection.
2. Copying the legacy direct Firestore reads would duplicate logic, increase browser reads, and undo the V2 security boundary.

The V2 solution uses protected Cloud Functions or equivalent admin-only server handlers to return bounded aggregates. The browser never receives raw events, user identifiers, transaction identifiers, collection names supplied by the client, or unrestricted query controls.

## Information architecture

### Overview

The Overview page receives a compact section titled `Что происходит с оплатой` with:

- four headline metrics: paywall impressions, confirmed trial starts, confirmed purchases, and gross revenue when financial coverage is available;
- one main trend chart with no more than three or four visible series;
- a compact paywall funnel;
- source-health and freshness indicators;
- links to the relevant Analytics categories.

Gross revenue must not share a numeric axis with count metrics. It remains a headline metric or uses a separate same-unit currency chart.

The Overview is not the complete analytics workspace. It answers: what changed, is it trustworthy, and where should the operator investigate?

### Full Analytics page

The Analytics page contains these categories:

1. `Пейвол и покупки`
2. `Деньги и подписки`
3. `Продукт и сессии`
4. `Обучение`
5. `Активация и удержание`
6. `Эксперименты`
7. `Надёжность`
8. `Трафик сайта`

Global controls stay visible at the top of the analytics workspace:

- presets: 7, 28, and 90 days;
- custom `from` and `to` dates;
- daily or weekly grouping;
- compare with the previous equal-length period;
- filters supported by the active category;
- reset zoom;
- refresh data.

Filters may include platform, store, paywall context, paywall variant, and plan. Unsupported filters are not shown for a category.

## Chart taxonomy

Not every number becomes a smooth line. Each metric uses the visual form that preserves its meaning.

| Data shape | Visual form |
| --- | --- |
| Change over time | Line or area chart |
| Paywall stage progression | Funnel |
| Sources, versions, plans, contexts, error reasons | Horizontal or grouped bars |
| Session duration and other distributions | Histogram |
| D1/D7/D14/D30 retention | Cohort table or heatmap |
| Current access composition | Metric cards and distribution bars labelled `сейчас` |
| Source completeness and freshness | Status list or table |

Color is never the only signal. Lines also have labels, point focus, and optional dash or marker differences. Tables remain available as the precise accessible representation.

## Metrics by category

### Paywall and purchases

- Lines: paywall impressions, CTA clicks, trial signals, purchase signals, closes, cancellations, and failures.
- Separate confirmed-outcomes chart: RevenueCat trial starts and initial purchases. It is not joined to individual behavioral impressions.
- Behavioral funnel: impression → CTA → store attempt → behavioral trial signal or behavioral purchase signal.
- Bars: paywall context, source, plan, variant, platform, and bounded purchase-failure reason.
- Total closes remain available as a count. Close-reason charts stay unavailable until a governed close-reason field and aggregation exist.

Behavioral application signals must never be merged with RevenueCat-confirmed store truth. Their labels and source descriptions remain visibly different.

### Money and subscriptions

- Lines: initial purchases, renewals, refunds, billing issues, expirations, and shard purchases.
- Financial lines: signed gross revenue and estimated proceeds only when currency and financial coverage are sufficient.
- Bars: store, product, period type, cancellation reason, and expiration reason.
- Cohort views: trial-to-paid, M1/M2/M3 renewal, and subscription-chain LTV at 30/60/90 days.

Subscription-chain LTV is not labelled as customer LTV.

### Product and sessions

- Lines: sessions, active consented app instances, screen views, lesson starts, lesson completes, and review answers.
- Histogram: session-duration buckets.
- Bars: popular screens, entry screens, last-observed screens, app versions, and product-operation failures.

The current `daily_kpi` query is not production-ready until its rows are parsed, returned, tested, and deployed. The design does not treat its current workspace presence as shipped functionality.

### Learning

- Line: weekly effective learners.
- Funnel: lesson start → answer activity → completion.
- Bars or heatmap: abandon and error checkpoints by lesson and phrase position.
- Bars: review-delay buckets, mastery transitions, and content diagnostics.

Observed proximity is not labelled as causation.

### Activation and retention

- Funnel: first touch → onboarding completion → learning start → first completion → return.
- Cohort view: exact and rolling D1/D7/D14/D30 retention for mature cohorts.
- Lines: retention rates only for mature cohorts and with the denominator shown.
- Bars: first-touch acquisition channels and active-day buckets.

Entities remain labelled `consent-observed app instances`, not people, accounts, users, installs, or downloads.

### Experiments and reliability

- Grouped bars: exposure counts by experiment variant and sample size.
- Bars: release adoption by version and bounded operation-failure groups.
- Status blocks: crash-free users, crash-free sessions, ANR, and performance data until governed imports exist.

The UI must not automatically declare an experiment winner without a predeclared mature metric, sufficient sample size, and the existing governance rules.

### Site traffic

- Lines: website visits, iOS store-link clicks, and Android store-link clicks.
- The existing `site_stats/daily_*` source must be exposed through a protected V2 server bridge rather than copied as direct browser reads.
- Store-link clicks are not labelled as installs or downloads.
- Paywall purchases may appear only as a separate, non-attributed comparison panel with their independent source and coverage. They are not labelled as conversions from website visits.

## Sources and readiness

| Source | Current readiness for charts |
| --- | --- |
| `paywall_funnel` with `day` or timestamp | Can be aggregated into daily/weekly series now; current V2 returns totals only |
| RevenueCat premium webhook events | Can be aggregated into confirmed purchase, trial, renewal, refund, and billing series |
| RevenueCat shard transactions | Can be aggregated into a purchase series |
| Product Analytics BigQuery export | Category aggregates exist; `daily_kpi` still requires response wiring and tests |
| Retention cohorts | Existing cohort dates can be visualized |
| Weekly effective learners | Existing weekly rows can be visualized |
| `site_stats/daily_*` | Existing legacy source; requires protected V2 server bridge |
| Current Plus/VIP/trial access snapshot | Current composition only; no honest historical line yet |

Unavailable sources remain visibly unavailable:

- Meta, Google Ads, or TikTok impressions, clicks, spend, CAC, and ROAS;
- App Store and Play Console downloads and final proceeds;
- Crashlytics crash-free aggregates, ANR, and governed performance export;
- historical active-access stock before a daily rollup exists.
- paywall close-reason analytics before a governed close-reason field and aggregation exist;
- RevenueCat refund-reason analytics before a supported refund-reason field and aggregation exist.

Missing imports are never represented as zero.

## Protected trend contract

A dedicated bounded analytics-trend callable is preferred so changing chart dates does not reread the full user-access snapshot.

Example request shape:

```text
group: paywall | revenue | product | learning | retention | reliability | site
presetDays: 7 | 28 | 90
or: fromDate + toDate
granularity: day | week
filters: allowlisted platform, store, context, variant, plan
```

Example response shape:

```text
schemaVersion
generatedAtMs
dataThroughMs
timezone
appliedRange
sourceHealth[]
series[]:
  metricId
  label
  unit
  definition
  sourceId
  coverage
  status
  points[{ periodStartMs, value }]
quality:
  excludedUndatedEvents
  excludedDevEvents
  excludedSandboxEvents
  truncatedSources
```

Contract rules:

- retain the existing admin authentication and permission checks, including `money.read` where applicable;
- allowlist groups, metrics, filters, sort order, and range limits on the server;
- never derive collection or field names from client input;
- return aggregates only, without UID, hashes, raw event payloads, or transaction identifiers;
- preserve BigQuery date pruning, `maximumBytesBilled`, and cache keys scoped to range and filters;
- use UTC for cross-source compatibility and state the timezone in every response;
- cap paywall and product ranges at the honest retained-data window; subscription history may support up to 365 days when the source is complete;
- cache the last successful view in the browser while a refresh is in progress.

## Interaction behavior

- Hover or keyboard focus shows exact period, value, unit, metric definition, and comparison value when enabled.
- Legend controls can show or hide individual series without refetching.
- Mouse wheel or pinch zooms the time axis; drag pans horizontally; reset restores the selected range.
- Period and grouping changes update in place with a 150–300 ms transition.
- `prefers-reduced-motion` disables chart transitions.
- A data-table toggle provides the exact chart values and supports copying or CSV export without exposing raw events.
- URL or session state may preserve the active category and safe filters, but must not store sensitive identifiers.

## Loading, empty, partial, and error states

- `ready`: successfully read absent days may be filled with zero.
- `empty`: show a plain-language empty state for the selected range.
- `partial` or `truncated`: unknown periods are `null` and break the line; they are not filled with zero and are not used for conversion decisions.
- `error`: keep the last successful graph, show the error, and label the displayed snapshot time.
- `stale`: show `dataThroughMs` and the measured source delay.
- events without a usable timestamp are excluded from the line and counted in quality information.
- any `not_decision_grade` source remains visible for diagnosis but cannot drive comparisons, conversion claims, or winner declarations.

Current active Plus, VIP, gift, and trial access values are explicitly labelled `сейчас`. Changing the historical date range must not imply that these stock values belong to the selected period.

## UI and accessibility rules

The implementation follows `docs/design/ADMIN_UI_BIBLE.md`:

- light, calm operational presentation;
- no decorative gradients or card walls;
- one clear primary refresh action;
- Lucide or the existing consistent SVG icon set, never emoji UI icons;
- tooltips on controls and `aria-label` for icon-only controls;
- visible focus, logical keyboard order, and minimum 44×44 px important targets;
- normal text contrast of at least 4.5:1;
- dark foreground on lime or neon-green surfaces;
- responsive layouts at 375, 768, 1024, and 1440 px;
- no page-level horizontal overflow;
- chart legends and tables remain readable without relying on color alone.

Chart.js should be pinned locally in the Admin V2 asset/dependency path rather than loaded at runtime from a CDN.

## Performance

- Load only the active analytics category and Overview summary.
- Reuse cached series when only visibility or client-side grouping changes.
- Bound every server query by date and row/byte limits.
- Avoid animating more than the active chart.
- Keep chart geometry stable during refresh to prevent content jumps.
- Do not retain unbounded client caches; use TTL and maximum-entry eviction.

## Delivery phases

All phases belong to this project, but each phase is independently verifiable and deployable:

1. Shared chart component, protected trend contract, and data-state model.
2. Paywall, RevenueCat, subscription, and shard trends plus the Overview payment summary.
3. Product `daily_kpi`, sessions, screens, and learning charts.
4. Activation, acquisition, retention cohorts, experiments, and reliability charts.
5. Protected site-traffic bridge and traffic charts.
6. Separate future integrations for external ads, store reports, Crashlytics aggregates, and daily active-access stock.

No existing table, metric, filter, source-health explanation, or admin capability is removed during these phases.

## Verification

### Server and aggregation

- unit tests for UTC boundaries, daily and weekly buckets, custom ranges, zero-filled ready days, null partial days, and comparison periods;
- tests for dev and sandbox exclusion, undated events, truncation, and stale sources;
- authorization and permission tests;
- response-contract tests proving no raw identifiers or events escape;
- BigQuery byte cap, date pruning, and cache-key tests.

### Admin UI

- contract tests for every category, global control, state, and source label;
- chart rendering tests for line, funnel, bars, histogram, and cohort views;
- hover and keyboard tooltip tests;
- zoom, pan, reset, legend, data-table, and reduced-motion tests;
- responsive checks at 375, 768, 1024, and 1440 px;
- tooltip, language, action/route, contrast, and focused Admin V2 smoke audits.

### Acceptance criteria

- Overview and Analytics both show the approved graphical structure.
- Every displayed line is backed by dated aggregate points.
- The operator can select presets and custom dates, change granularity, inspect exact dates, pan, zoom, and reset.
- Behavioral purchase signals and RevenueCat-confirmed purchases are visibly distinct.
- Partial and unavailable data cannot look like trustworthy zero values.
- Existing analytics tables and definitions remain accessible.
- Admin V2 performs no direct browser read of analytics collections.
- The focused verification suite passes before deployment.

## Explicit non-goals

- decorative real-time user-presence maps;
- fabricating historical active-access data from the current snapshot;
- importing external advertising, store, or Crashlytics data inside the initial chart implementation;
- replacing RevenueCat as the money source of truth;
- identifying individual people from optional product analytics;
- removing or hiding existing Admin V2 analytics functionality.
