# Admin Digest and App Codex Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a trustworthy admin digest that covers the interval since the last successful run, reconciles RevenueCat and internal analytics, compares equal periods, renders verified charts, and exposes a searchable, freshness-checked application Codex.

**Architecture:** Split the current monolithic digest into pure contracts/aggregation, source adapters, RevenueCat reconciliation, and orchestration while preserving the existing callable. Extend the existing project atlas with a business-facing Codex projection and render both digest and Codex through small admin modules loaded by `admin/index.html`.

**Tech Stack:** TypeScript, Firebase Cloud Functions v2, Firestore Admin SDK, RevenueCat REST API v2, Jest, browser JavaScript, existing atlas generator, GitHub Actions.

---

## File map

- Create `functions/src/admin_digest_contracts.ts`: schema versions, metric/source registries, time-window and comparison types.
- Create `functions/src/admin_digest_sources.ts`: bounded paginated Firestore adapters and source diagnostics.
- Create `functions/src/admin_digest_revenuecat.ts`: read-only RevenueCat Charts API client and reconciliation.
- Modify `functions/src/admin_daily_digest.ts`: orchestration, prompt contract, run history and callable wiring.
- Modify `functions/src/admin_daily_digest.test.ts`: pure aggregation, prompt, taxonomy and empty/partial behavior.
- Create `functions/src/admin_digest_sources.test.ts`: pagination, time bounds and source-failure tests.
- Create `functions/src/admin_digest_revenuecat.test.ts`: API parsing, retry classification and reconciliation tests.
- Create `admin/admin-digest.js`: digest history, KPI comparison, verified charts and coverage UI.
- Create `admin/app-codex.js`: searchable Codex UI.
- Modify `admin/index.html`: semantic containers/navigation and module loading only.
- Create `tests/admin_digest_v2_contract.test.ts`: DOM, accessibility and client contract guards.
- Modify `scripts/generate_project_atlas.mjs`: business Codex projection and deterministic freshness metadata.
- Create `scripts/check_project_codex_freshness.mjs`: drift check.
- Create `tests/project_codex_contract.test.ts`: Codex schema and coverage guards.
- Modify `package.json`: `codex:generate` and `codex:check` commands.
- Modify `.github/workflows/source-quality.yml`: run Codex drift check.
- Modify `AGENTS.md`: require Codex refresh when routes/data/callables/events/metrics change.
- Generated `docs/atlas/app-codex.json`: searchable admin payload.

### Task 1: Metric contracts, run windows and comparisons

**Files:**
- Create: `functions/src/admin_digest_contracts.ts`
- Modify: `functions/src/admin_daily_digest.test.ts`
- Modify: `functions/src/admin_daily_digest.ts`

- [ ] **Step 1: Write failing tests for last-successful-run windows and equal-period comparison**

```ts
it('starts after the last successful run and compares an equal previous interval', () => {
  expect(resolveDigestWindows(1_000_000, 700_000)).toEqual({
    current: { startMs: 700_000, endMs: 1_000_000 },
    previous: { startMs: 400_000, endMs: 700_000 },
    reason: 'last_successful_digest',
  });
});

it('does not manufacture a percent change from a zero baseline', () => {
  expect(compareMetric(5, 0)).toEqual({ current: 5, previous: 0, absoluteDelta: 5, percentDelta: null });
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `npm --prefix functions test -- admin_daily_digest.test.ts --runInBand`

Expected: FAIL because `resolveDigestWindows` and `compareMetric` are not exported.

- [ ] **Step 3: Add exact contracts and pure functions**

```ts
export const DIGEST_SCHEMA_VERSION = 2;
export type DigestWindow = { startMs: number; endMs: number };
export function resolveDigestWindows(nowMs: number, lastSuccessEndMs?: number) {
  const startMs = lastSuccessEndMs ?? nowMs - 86_400_000;
  const duration = nowMs - startMs;
  return {
    current: { startMs, endMs: nowMs },
    previous: { startMs: startMs - duration, endMs: startMs },
    reason: lastSuccessEndMs ? 'last_successful_digest' as const : 'first_run_fallback' as const,
  };
}
export function compareMetric(current: number, previous: number) {
  return {
    current,
    previous,
    absoluteDelta: current - previous,
    percentDelta: previous === 0 ? null : ((current - previous) / previous) * 100,
  };
}
```

- [ ] **Step 4: Replace ambiguous revenue labels with versioned metric definitions**

Define registry entries for `initial_paid_purchases`, `trial_starts`, `trial_conversions`, `renewals`, `cancellations`, `expirations`, `refunds`, `active_subscriptions`, `unique_payers`, `paywall_impressions`, `paywall_cta`, and `paywall_purchase_signals`, each with formula, source of truth, unit, and caveat.

- [ ] **Step 5: Run the test and commit**

Run: `npm --prefix functions test -- admin_daily_digest.test.ts --runInBand`

Expected: PASS.

Commit: `git commit -m "feat: define digest metric and window contracts"`

### Task 2: Bounded paginated source collection and coverage matrix

**Files:**
- Create: `functions/src/admin_digest_sources.ts`
- Create: `functions/src/admin_digest_sources.test.ts`
- Modify: `functions/src/admin_daily_digest.ts`

- [ ] **Step 1: Write a failing adapter test**

```ts
it('reads every page inside [start,end) and reports partial failures', async () => {
  const result = await readNumberTimestampSource(fakeQueryPages([
    [{ id: 'a', createdAtMs: 110 }], [{ id: 'b', createdAtMs: 190 }],
  ]), { startMs: 100, endMs: 200, pageSize: 1 });
  expect(result.rows.map((row) => row.id)).toEqual(['a', 'b']);
  expect(result.coverage).toMatchObject({ status: 'ok', rowCount: 2, truncated: false });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm --prefix functions test -- admin_digest_sources.test.ts --runInBand`

Expected: FAIL because the adapter does not exist.

- [ ] **Step 3: Implement a common source result**

```ts
export type SourceCoverage = {
  sourceId: string;
  status: 'ok' | 'partial' | 'failed' | 'not_configured';
  rowCount: number;
  uniqueCount: number;
  truncated: boolean;
  timestampField: string;
  errorCode?: string;
};
export type SourceResult<T> = { rows: T[]; coverage: SourceCoverage };
```

Use `orderBy(timestampField)`, lower and upper bounds, `limit(pageSize)`, and `startAfter(lastDocument)` until the final short page. Timestamp adapters must remain explicit for number, Firestore Timestamp and day-string sources.

- [ ] **Step 4: Build the source registry and coverage matrix**

Include every existing digest source plus verified domains discovered from `ADMIN_TAB_KEYS`, atlas Firestore paths and backend callables. Each entry must be `event`, `snapshot`, or `configuration`, and must declare `included` or an explicit exclusion reason.

- [ ] **Step 5: Ensure failures remain unknown**

Replace `catch → []` with `SourceResult` failures. Aggregation must emit `value: null` when the authoritative source is failed and preserve the coverage warning.

- [ ] **Step 6: Run focused tests and commit**

Run: `npm --prefix functions test -- admin_digest_sources.test.ts admin_daily_digest.test.ts --runInBand`

Expected: PASS.

Commit: `git commit -m "feat: add bounded digest source collection"`

### Task 3: RevenueCat Charts API and reconciliation

**Files:**
- Create: `functions/src/admin_digest_revenuecat.ts`
- Create: `functions/src/admin_digest_revenuecat.test.ts`
- Modify: `functions/src/admin_daily_digest.ts`
- Modify: `functions/src/index.ts`

- [ ] **Step 1: Write failing tests with mocked HTTP responses**

```ts
it('keeps dashboard, webhook and funnel numbers separate', () => {
  expect(reconcileRevenue({ dashboard: 60, webhook: 58, funnel: 31 })).toMatchObject({
    dashboard: 60, webhook: 58, funnel: 31, webhookDelta: -2, funnelCoverageRatio: 31 / 60,
  });
});
```

Also test 401/403 as configuration failures, 429 as retryable, malformed payload as failed, and missing project id as `not_configured`.

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm --prefix functions test -- admin_digest_revenuecat.test.ts --runInBand`

Expected: FAIL because the client and reconciliation functions do not exist.

- [ ] **Step 3: Implement a read-only API client**

```ts
export async function fetchRevenueCatChart(input: {
  apiKey: string; projectId: string; chartName: string;
  startDate: string; endDate: string; fetchImpl?: typeof fetch;
}) {
  const url = new URL(`https://api.revenuecat.com/v2/projects/${encodeURIComponent(input.projectId)}/charts/${encodeURIComponent(input.chartName)}`);
  url.searchParams.set('start_date', input.startDate);
  url.searchParams.set('end_date', input.endDate);
  const response = await (input.fetchImpl ?? fetch)(url, {
    headers: { Authorization: `Bearer ${input.apiKey}` },
  });
  return parseRevenueCatChartResponse(response);
}
```

Bind `REVENUECAT_ANALYTICS_API_KEY` only to the server callable. Store the non-secret project id in server config and never expose the secret to `admin/index.html`.

- [ ] **Step 4: Reconcile charts, webhook ledger and funnel**

Return all raw comparable counts, deltas, lag timestamps and semantic warnings. Never force equality between metrics with different definitions.

- [ ] **Step 5: Run focused tests and commit**

Run: `npm --prefix functions test -- admin_digest_revenuecat.test.ts admin_daily_digest.test.ts --runInBand`

Expected: PASS.

Commit: `git commit -m "feat: reconcile digest metrics with RevenueCat"`

### Task 4: Run history, structured prompt and verified chart data

**Files:**
- Modify: `functions/src/admin_daily_digest.ts`
- Modify: `functions/src/admin_daily_digest.test.ts`

- [ ] **Step 1: Add failing orchestration and prompt assertions**

Assert that a failed run does not advance `admin_digest_state/latest`, a successful run records both windows, source coverage and schema versions, and the prompt contains the exact interval, metric dictionary, Codex projection, facts/hypotheses rule and unavailable domains.

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `npm --prefix functions test -- admin_daily_digest.test.ts --runInBand`

Expected: FAIL on the v2 run fields and prompt contract.

- [ ] **Step 3: Implement immutable run documents and latest pointer**

Write `admin_digest_runs/{runId}` as `running`, then `succeeded` or `failed`. Update `admin_digest_state/latest` only after facts, optional AI response and final document are saved successfully.

- [ ] **Step 4: Produce validated structured output**

```ts
export type DigestNarrative = {
  executiveSummary: string;
  verifiedObservations: Array<{ metricId: string; text: string }>;
  anomalies: Array<{ severity: 'info' | 'warning' | 'critical'; text: string }>;
  hypotheses: Array<{ text: string; validationSignal: string }>;
  actions: Array<{ priority: number; text: string; expectedSignal: string }>;
  chartRecommendations: Array<{ seriesId: string; type: 'line' | 'bar' | 'funnel'; reason: string }>;
  sourceWarnings: string[];
};
```

Reject invalid model JSON and fall back to a deterministic facts-only narrative. Do not invoke the production OpenAI key during local verification.

- [ ] **Step 5: Generate deterministic current/previous series**

Build chart series from source aggregates before prompting. Include bucket boundaries, current values, previous values and coverage ids.

- [ ] **Step 6: Run focused tests and commit**

Run: `npm --prefix functions test -- admin_daily_digest.test.ts admin_digest_sources.test.ts admin_digest_revenuecat.test.ts --runInBand`

Expected: PASS.

Commit: `git commit -m "feat: persist comparable digest runs"`

### Task 5: Digest UI and history

**Files:**
- Create: `admin/admin-digest.js`
- Modify: `admin/index.html`
- Create: `tests/admin_digest_v2_contract.test.ts`

- [ ] **Step 1: Write failing DOM contract tests**

Assert presence of one primary generate button, exact period text, history selector, KPI comparison container, chart canvas/SVG container, coverage table, partial/error states, tooltips, `aria-label` on icon-only controls and no emoji navigation icon.

- [ ] **Step 2: Run the contract and confirm it fails**

Run: `npx jest tests/admin_digest_v2_contract.test.ts --runInBand`

Expected: FAIL because the v2 containers/module are absent.

- [ ] **Step 3: Replace only the digest surface with semantic containers**

Keep the existing tab key and callable entry point. Move digest rendering/loading into `admin/admin-digest.js`; preserve unrelated admin functionality. Render `unknown`, `partial`, and zero as visually distinct states.

- [ ] **Step 4: Render verified charts without AI-authored values**

Use the deterministic series returned by the callable. Limit the default view to 2–4 useful charts; expose the remaining series through an accessible selector.

- [ ] **Step 5: Run checks and commit**

Run: `npx jest tests/admin_digest_v2_contract.test.ts tests/admin_revenue_analytics_contract.test.ts --runInBand`

Run: `node --check admin/admin-digest.js`

Expected: all PASS.

Commit: `git commit -m "feat: add comparable admin digest dashboard"`

### Task 6: Application Codex generation, UI and freshness gate

**Files:**
- Modify: `scripts/generate_project_atlas.mjs`
- Create: `scripts/check_project_codex_freshness.mjs`
- Create: `tests/project_codex_contract.test.ts`
- Create: `admin/app-codex.js`
- Modify: `admin/index.html`
- Modify: `package.json`
- Modify: `.github/workflows/source-quality.yml`
- Modify: `AGENTS.md`
- Generate: `docs/atlas/app-codex.json`

- [ ] **Step 1: Write failing Codex contract tests**

```ts
expect(codex.schemaVersion).toBe('phraseman-app-codex-v1');
expect(codex.entities.some((x: any) => x.kind === 'screen' && x.route)).toBe(true);
expect(codex.entities.some((x: any) => x.kind === 'metric' && x.sourceIds.length)).toBe(true);
expect(codex.coverage.adminTabs.missing).toEqual([]);
```

- [ ] **Step 2: Run tests and confirm they fail**

Run: `npx jest tests/project_codex_contract.test.ts --runInBand`

Expected: FAIL because `app-codex.json` and schema do not exist.

- [ ] **Step 3: Extend the atlas generator**

Generate deterministic entities for screens, routes, admin tabs, Firestore paths, callables, storage keys, analytics events, metrics and digest sources. Add relationships `screen_uses_path`, `action_emits_event`, `event_feeds_metric`, and `metric_in_digest`. Record source-file hashes and generator version; do not use wall-clock time in drift-sensitive content.

- [ ] **Step 4: Add freshness commands and CI gate**

Add scripts:

```json
"codex:generate": "node scripts/generate_project_atlas.mjs",
"codex:check": "node scripts/check_project_codex_freshness.mjs"
```

The check regenerates to an ignored temp directory, compares stable JSON, and exits non-zero with changed entity categories.

- [ ] **Step 5: Add the searchable admin screen**

Create a categorized, icon-supported Codex tab with search, kind/domain filters, freshness status, human description first, technical keys second and relationship links. Load `docs/atlas/app-codex.json` through a hosting-safe generated copy under `admin/generated/app-codex.json` if direct docs access is unavailable.

- [ ] **Step 6: Update session instructions**

Add one explicit rule to `AGENTS.md`: changes to routes, screens, Firestore paths, callables, analytics events or metrics must run `npm run codex:generate` and `npm run codex:check`.

- [ ] **Step 7: Generate, verify and commit**

Run: `npm run codex:generate`

Run: `npm run codex:check`

Run: `npx jest tests/project_codex_contract.test.ts tests/admin_digest_v2_contract.test.ts --runInBand`

Run: `node --check admin/app-codex.js`

Expected: all PASS and no drift.

Commit: `git commit -m "feat: add searchable application codex"`

### Task 7: Final focused verification and deployment handoff

**Files:**
- Verify all files listed above; no new source changes unless a check exposes a defect.

- [ ] **Step 1: Build Cloud Functions**

Run: `npm --prefix functions run build`

Expected: TypeScript build succeeds.

- [ ] **Step 2: Run the focused server suite**

Run: `npm --prefix functions test -- admin_daily_digest.test.ts admin_digest_sources.test.ts admin_digest_revenuecat.test.ts --runInBand`

Expected: PASS.

- [ ] **Step 3: Run the focused admin/Codex suite**

Run: `npx jest tests/admin_digest_v2_contract.test.ts tests/project_codex_contract.test.ts tests/admin_revenue_analytics_contract.test.ts --runInBand`

Expected: PASS.

- [ ] **Step 4: Run syntax, drift and secret checks**

Run: `node --check admin/admin-digest.js`

Run: `node --check admin/app-codex.js`

Run: `npm run codex:check`

Run: `npm run scan:secrets`

Expected: all PASS; no RevenueCat key in the repository or generated assets.

- [ ] **Step 5: Inspect final diff and request frontier review**

Run: `git diff --check`

Run: `git status --short`

Provide the advisor with the objective, final diff, focused test output, unresolved production-only checks and the OpenAI firewall constraint. Completion requires `DECISION: APPROVED`.

- [ ] **Step 6: Record deployment prerequisites without deploying**

Document that production needs the configured `REVENUECAT_ANALYTICS_API_KEY`, RevenueCat Project ID, any new Firestore indexes, Functions deployment and Hosting deployment. Do not deploy unless the user explicitly requests it.
