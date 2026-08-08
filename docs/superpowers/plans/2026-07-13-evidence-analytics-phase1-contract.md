# Evidence Analytics Phase 1: Contract Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a governed analytics catalog and an automated declared-to-measured coverage gate without changing user-visible analytics behavior.

**Architecture:** A pure TypeScript catalog declares canonical events, compatibility aliases, privacy classification, warehouse ownership, and metric consumers. A repository scanner compares the catalog with production call sites and BigQuery allowlists, while focused Jest contracts prevent drift. Phase 1 does not add new telemetry or modify consent behavior.

**Tech Stack:** TypeScript, Jest, Node.js, Firebase Analytics source contracts, BigQuery SQL source inspection.

---

**Implementation status (2026-07-13):** Implemented, verified locally, and
approved by the mandatory final Advisor review. Evidence is recorded in
`docs/reports/evidence-analytics-phase1-2026-07-13.md`.

### Final hardening after Advisor review

The original task snippets below describe the first TDD shape. The reviewed
implementation strengthens that shape in four ways and is authoritative where it
differs from an earlier snippet:

- `app/product_analytics_governance.json` is the machine-readable catalog source;
  the audit no longer regex-parses TypeScript definitions.
- fields use a centrally reviewed safe-field registry with value classes;
  unknown fields fail instead of relying on a short denylist.
- metrics live in a separately validated registry and must reference SQL row
  kinds that exist in the current aggregate query.
- call coverage includes validated dynamic runtime emission and the audit fails
  on either direction of catalog/SQL drift.

## File map

- Create `app/product_analytics_event_catalog.ts`: governed canonical event metadata and alias normalization.
- Create `scripts/analytics-contract-audit.mjs`: deterministic source scanner and JSON/console report.
- Create `tests/product_analytics_event_catalog.test.ts`: pure catalog and privacy tests.
- Create `tests/analytics_contract_audit.test.ts`: repository contract for declared/called/warehoused/measured coverage.
- Modify `app/analytics.ts`: import the governed event-name type while preserving the existing public union during migration.
- Modify `functions/src/admin_product_analytics.ts`: source its warehouse event allowlist from a clearly delimited generated/checked contract block.
- Modify `package.json`: add a read-only `analytics:contract:audit` command.

### Task 1: Canonical event catalog

**Files:**
- Create: `app/product_analytics_event_catalog.ts`
- Test: `tests/product_analytics_event_catalog.test.ts`

- [ ] **Step 1: Write the failing catalog test**

```ts
import {
  PRODUCT_ANALYTICS_EVENT_CATALOG,
  canonicalProductAnalyticsEventName,
  validateProductAnalyticsCatalog,
} from '../app/product_analytics_event_catalog';

describe('product analytics event catalog', () => {
  it('normalizes the legacy lesson abandon spelling to the warehouse name', () => {
    expect(canonicalProductAnalyticsEventName('lesson_abandon')).toBe('lesson_abandoned');
    expect(canonicalProductAnalyticsEventName('lesson_abandoned')).toBe('lesson_abandoned');
  });

  it('has unique names, aliases and metric ids with no free-form fields', () => {
    expect(validateProductAnalyticsCatalog(PRODUCT_ANALYTICS_EVENT_CATALOG)).toEqual([]);
  });
});
```

- [ ] **Step 2: Verify RED**

Run:

```powershell
npx jest --runTestsByPath tests/product_analytics_event_catalog.test.ts --no-cache --runInBand
```

Expected: FAIL because `app/product_analytics_event_catalog.ts` does not exist.

- [ ] **Step 3: Implement the minimal catalog API**

```ts
export type ProductAnalyticsEntity =
  | 'app_instance' | 'session' | 'attempt' | 'impression' | 'event';

export interface ProductAnalyticsEventDefinition {
  readonly name: string;
  readonly aliases?: readonly string[];
  readonly entity: ProductAnalyticsEntity;
  readonly warehouse: 'product' | 'revenue' | 'telemetry_only';
  readonly metricIds: readonly string[];
  readonly allowedFields: readonly string[];
}

export const PRODUCT_ANALYTICS_EVENT_CATALOG = [
  {
    name: 'lesson_abandoned',
    aliases: ['lesson_abandon'],
    entity: 'attempt',
    warehouse: 'product',
    metricIds: ['learning.lesson_abandon_rate.v1'],
    allowedFields: [
      'schema_version', 'event_id', 'lesson_attempt_id', 'lesson_id',
      'phrase_index', 'total_phrases', 'study_target',
    ],
  },
] as const satisfies readonly ProductAnalyticsEventDefinition[];

const FORBIDDEN_FIELDS = new Set([
  'email', 'name', 'uid', 'stable_id', 'answer_text', 'phrase_text',
  'message', 'report_text', 'error_message',
]);

export function canonicalProductAnalyticsEventName(value: string): string {
  for (const event of PRODUCT_ANALYTICS_EVENT_CATALOG) {
    if (event.name === value || event.aliases?.includes(value as never)) return event.name;
  }
  return value;
}

export function validateProductAnalyticsCatalog(
  catalog: readonly ProductAnalyticsEventDefinition[],
): string[] {
  const errors: string[] = [];
  const names = new Set<string>();
  const metricIds = new Set<string>();
  for (const event of catalog) {
    for (const name of [event.name, ...(event.aliases ?? [])]) {
      if (names.has(name)) errors.push(`duplicate_event_name:${name}`);
      names.add(name);
    }
    for (const metricId of event.metricIds) {
      if (metricIds.has(metricId)) errors.push(`duplicate_metric_id:${metricId}`);
      metricIds.add(metricId);
    }
    for (const field of event.allowedFields) {
      if (FORBIDDEN_FIELDS.has(field)) errors.push(`forbidden_field:${event.name}:${field}`);
    }
  }
  return errors;
}
```

- [ ] **Step 4: Verify GREEN**

Run the Step 2 command. Expected: PASS.

### Task 2: Expand the catalog to current governed events

**Files:**
- Modify: `app/product_analytics_event_catalog.ts`
- Modify: `tests/product_analytics_event_catalog.test.ts`

- [ ] **Step 1: Add a failing expectation for the current warehouse set**

The test imports `PRODUCT_ANALYTICS_WAREHOUSE_EVENTS` from the catalog and asserts
that it contains the current session, screen, lesson, paywall, purchase-behavior,
and inventory events used by `admin_product_analytics.ts`.

```ts
expect(PRODUCT_ANALYTICS_WAREHOUSE_EVENTS).toEqual(expect.arrayContaining([
  'product_session_start', 'product_screen_view', 'lesson_start',
  'lesson_answer', 'lesson_abandoned', 'lesson_complete', 'paywall_shown',
  'paywall_cta_click', 'purchase_started', 'purchase_completed',
  'paywall_inventory_resolved',
]));
```

- [ ] **Step 2: Verify RED**

Run the Task 1 test command. Expected: FAIL because the exported warehouse set is missing.

- [ ] **Step 3: Add explicit definitions for every current warehouse event**

Use one object per canonical event. Each object must declare a non-empty metric ID
or `warehouse: 'telemetry_only'`. Export the derived immutable array:

```ts
export const PRODUCT_ANALYTICS_WAREHOUSE_EVENTS = Object.freeze(
  PRODUCT_ANALYTICS_EVENT_CATALOG
    .filter((event) => event.warehouse === 'product')
    .map((event) => event.name),
);
```

- [ ] **Step 4: Verify GREEN**

Run the Task 1 test command. Expected: PASS.

### Task 3: Read-only repository audit

**Files:**
- Create: `scripts/analytics-contract-audit.mjs`
- Create: `tests/analytics_contract_audit.test.ts`

- [ ] **Step 1: Write a failing subprocess contract**

```ts
import { execFileSync } from 'node:child_process';
import path from 'node:path';

it('reports no unknown governed call sites or warehouse events', () => {
  const stdout = execFileSync(process.execPath, [
    path.join(process.cwd(), 'scripts/analytics-contract-audit.mjs'), '--json',
  ], { encoding: 'utf8' });
  const report = JSON.parse(stdout);
  expect(report.errors).toEqual([]);
  expect(report.summary.declared).toBeGreaterThan(0);
  expect(report.summary.warehoused).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Verify RED**

Run:

```powershell
npx jest --runTestsByPath tests/analytics_contract_audit.test.ts --no-cache --runInBand
```

Expected: FAIL because the audit script does not exist.

- [ ] **Step 3: Implement deterministic scanning**

The script reads only these bounded roots: `app`, `components`, `hooks`, and
`functions/src/admin_product_analytics.ts`. It excludes tests, generated output,
and reports. It extracts literal `trackEvent('...')`, `logEvent('...')`, and the
delimited BigQuery `event_name IN (...)` block. It loads a machine-readable
catalog snapshot exported by a tiny TypeScript-free JSON-compatible module or
parses the catalog's literal definitions deterministically.

The JSON result has this stable shape:

```js
{
  schemaVersion: 1,
  summary: { declared: 0, called: 0, warehoused: 0, measured: 0 },
  unknownCalled: [],
  unknownWarehoused: [],
  declaredWithoutCallSite: [],
  warehousedWithoutMetric: [],
  errors: [],
}
```

Unknown called events are warnings until they are explicitly brought under the
governed catalog. Unknown warehouse events and catalog events without a metric or
telemetry-only designation are errors. `--strict-all-events` upgrades unknown
call sites to errors for the later migration gate.

- [ ] **Step 4: Verify GREEN**

Run the Step 2 command. Expected: PASS with zero governed coverage errors.

### Task 4: Guard the BigQuery allowlist boundary

**Files:**
- Modify: `functions/src/admin_product_analytics.ts`
- Modify: `tests/analytics_contract_audit.test.ts`

- [ ] **Step 1: Add a failing source-boundary assertion**

```ts
const source = fs.readFileSync(
  path.join(process.cwd(), 'functions/src/admin_product_analytics.ts'), 'utf8',
);
expect(source).toContain('-- ANALYTICS_EVENT_ALLOWLIST_START');
expect(source).toContain('-- ANALYTICS_EVENT_ALLOWLIST_END');
```

- [ ] **Step 2: Verify RED**

Run the Task 3 command. Expected: FAIL because the markers are absent.

- [ ] **Step 3: Add SQL comment markers around the existing event list**

Do not change the events or query behavior in this task. Add only:

```sql
-- ANALYTICS_EVENT_ALLOWLIST_START
AND event_name IN (...)
-- ANALYTICS_EVENT_ALLOWLIST_END
```

- [ ] **Step 4: Verify GREEN**

Run the Task 3 command. Expected: PASS.

### Task 5: Integrate the catalog type without changing consent or delivery

**Files:**
- Modify: `app/analytics.ts`
- Modify: `tests/product_analytics_event_catalog.test.ts`
- Test: `tests/analytics_consent_subscription.test.ts`
- Test: `tests/analytics_funnel_coverage.test.ts`

- [ ] **Step 1: Add a failing type/source contract**

The test asserts that `app/analytics.ts` imports
`GovernedProductAnalyticsEventName` and that the canonical warehouse spelling
`lesson_abandoned` is accepted without deleting the legacy alias.

- [ ] **Step 2: Verify RED**

Run:

```powershell
npx jest --runTestsByPath tests/product_analytics_event_catalog.test.ts tests/analytics_consent_subscription.test.ts tests/analytics_funnel_coverage.test.ts --no-cache --runInBand
```

Expected: FAIL only on the new source contract.

- [ ] **Step 3: Compose the existing public event type with the governed type**

Import the type and include it in `AnalyticsEvent`. Do not modify `trackEvent`,
Firebase consent gating, PostHog consent gating, queue behavior, or event payloads.
Keep the legacy alias during migration.

- [ ] **Step 4: Verify GREEN**

Run the Step 2 command. Expected: PASS.

### Task 6: Package command and phase verification

**Files:**
- Modify: `package.json`
- Test: `tests/product_analytics_event_catalog.test.ts`
- Test: `tests/analytics_contract_audit.test.ts`

- [ ] **Step 1: Add the read-only script**

```json
"analytics:contract:audit": "node scripts/analytics-contract-audit.mjs --json"
```

- [ ] **Step 2: Run the focused phase gate**

```powershell
npx jest --runTestsByPath tests/product_analytics_event_catalog.test.ts tests/analytics_contract_audit.test.ts tests/analytics_consent_subscription.test.ts tests/analytics_funnel_coverage.test.ts tests/admin_product_analytics_contract.test.ts --no-cache --runInBand
npm run analytics:contract:audit
Set-Location functions
npx jest src/admin_product_analytics.test.ts --runInBand
npm run build
```

Expected: all commands exit 0. The audit may list non-governed call-site warnings,
but `errors` must be empty.

- [ ] **Step 3: Inspect protected behavior and diff**

Confirm no changes to analytics consent ordering, auth/account deletion, purchase
handling, raw user text, Firestore writes, or Admin UI. Confirm the audit script
performs only bounded reads and writes nothing.

- [ ] **Step 4: Record phase evidence**

Save the exact commands, exit codes, coverage summary, warnings, and remaining
phase-2 prerequisites in `docs/reports/evidence-analytics-phase1-2026-07-13.md`.
