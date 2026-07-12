# Admin Onboarding Analytics Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a trustworthy consented-user onboarding funnel and data-quality view to Admin v2 without storing raw product events in Firestore.

**Architecture:** The app emits a versioned onboarding event envelope only after analytics consent. Firebase Analytics exports those events to an EU BigQuery dataset. A scheduled Cloud Function materializes daily aggregate documents; an admin-only callable returns compact rollups to the static Admin v2 UI.

**Tech Stack:** React Native/Expo, TypeScript, Firebase Analytics, BigQuery, Firebase Cloud Functions, Firestore aggregate documents, static Admin v2 HTML/JavaScript, Jest.

---

### Task 0: Low-friction 16+ gate and early analytics choice

**Files:**
- Modify: `components/CleanOnboarding.tsx`
- Modify: `app/age_gate.ts`
- Modify: `app/age_consent_cloud.ts`
- Modify: `app/analytics_consent.ts`
- Test: `tests/onboarding_age_and_analytics_order_contract.test.ts`
- Test: `tests/age_post_onboarding_no_blockers_contract.test.ts`

- [ ] **Step 1: Write contracts for the approved 16+ flow**

The contract must prove this exact order: value-only welcome, age gate, optional analytics choice, measurable personalization. It must also prove that under-16 stops before account/cloud/UGC/analytics, `denied` continues without events, and no source contains `currentYear - MIN_FULL_ACCESS_AGE` or writes a fabricated `birthYear`.

- [ ] **Step 2: Run the focused tests and verify failure**

```powershell
npx jest --runTestsByPath tests/onboarding_age_and_analytics_order_contract.test.ts tests/age_post_onboarding_no_blockers_contract.test.ts --no-cache --runInBand
```

- [ ] **Step 3: Implement the approved screen order**

Use a pre-prompt before any Apple/Google age-range request. If a platform signal is unavailable or the user declines to share it, show the equal-weight fallback choices `Мне меньше 16` and `Мне 16 или больше`. A platform under-16 signal cannot be overwritten by self-declaration. Under-16 sees a calm stop screen; 16+ proceeds to an analytics screen with equal-weight `Разрешить аналитику` and `Не сейчас` actions.

Do not buffer or replay pre-consent actions. Show only a privacy notice before analytics. Keep one required Terms clickwrap immediately before the first cloud write, account creation, paywall, or UGC action; do not show legal acceptance twice.

- [ ] **Step 4: Re-run the focused tests**

Run the command from Step 2. Expected: PASS.

### Task 1: Versioned onboarding analytics contract

**Files:**
- Create: `app/onboarding_analytics_contract.ts`
- Modify: `app/analytics.ts`
- Test: `tests/onboarding_analytics_contract.test.ts`

- [ ] **Step 1: Write the failing contract test**

```ts
import {
  ONBOARDING_ANALYTICS_SCHEMA_VERSION,
  buildOnboardingEvent,
} from '../app/onboarding_analytics_contract';

describe('onboarding analytics contract', () => {
  it('builds a versioned PII-free event envelope', () => {
    const event = buildOnboardingEvent({
      eventId: 'evt-1',
      eventName: 'onboarding_step_view',
      sessionId: 'session-1',
      flowVersion: 'flow-1',
      step: 'goal',
      platform: 'ios',
      appVersion: '2.0.0',
      buildNumber: '200',
      studyTarget: 'en',
      occurredAtMs: 1000,
    });

    expect(event.schemaVersion).toBe(ONBOARDING_ANALYTICS_SCHEMA_VERSION);
    expect(event.step).toBe('goal');
    expect(Object.keys(event).sort()).toEqual([
      'appVersion', 'buildNumber', 'eventId', 'eventName', 'flowVersion',
      'occurredAtMs', 'platform', 'schemaVersion', 'sessionId', 'step', 'studyTarget',
    ]);
  });
});
```

- [ ] **Step 2: Run the test and confirm the missing-module failure**

Run:

```powershell
npx jest --runTestsByPath tests/onboarding_analytics_contract.test.ts --no-cache --runInBand
```

Expected: FAIL because `app/onboarding_analytics_contract.ts` does not exist.

- [ ] **Step 3: Implement the minimal typed envelope and PII denylist**

```ts
export const ONBOARDING_ANALYTICS_SCHEMA_VERSION = 1;

export type OnboardingAnalyticsEventName =
  | 'onboarding_started'
  | 'onboarding_step_view'
  | 'onboarding_step_continue'
  | 'onboarding_step_back'
  | 'onboarding_step_error'
  | 'onboarding_completed';

export interface OnboardingAnalyticsEvent {
  schemaVersion: number;
  eventId: string;
  eventName: OnboardingAnalyticsEventName;
  sessionId: string;
  flowVersion: string;
  step: string;
  platform: 'ios' | 'android';
  appVersion: string;
  buildNumber: string;
  studyTarget: string;
  occurredAtMs: number;
}

export function buildOnboardingEvent(
  input: Omit<OnboardingAnalyticsEvent, 'schemaVersion'>,
): OnboardingAnalyticsEvent {
  return {
    schemaVersion: ONBOARDING_ANALYTICS_SCHEMA_VERSION,
    eventId: input.eventId,
    eventName: input.eventName,
    sessionId: input.sessionId,
    flowVersion: input.flowVersion,
    step: input.step,
    platform: input.platform,
    appVersion: input.appVersion,
    buildNumber: input.buildNumber,
    studyTarget: input.studyTarget,
    occurredAtMs: input.occurredAtMs,
  };
}
```

The explicit return object is the allowlist. Extra caller fields must never be spread into analytics properties.

- [ ] **Step 4: Run the focused test**

Run the command from Step 2. Expected: PASS.

### Task 2: Consent-aware onboarding session instrumentation

**Files:**
- Create: `app/onboarding_analytics_session.ts`
- Modify: `components/CleanOnboarding.tsx`
- Test: `tests/onboarding_analytics_session.test.ts`
- Test: `tests/onboarding_study_target_choice_contract.test.ts`

- [ ] **Step 1: Write tests proving stable session IDs and consent gating**

```ts
import {
  createOnboardingAnalyticsSession,
  shouldEmitOnboardingAnalytics,
} from '../app/onboarding_analytics_session';

describe('onboarding analytics session', () => {
  it('keeps one session id for the onboarding run', () => {
    const session = createOnboardingAnalyticsSession(() => 'uuid-1');
    expect(session.sessionId).toBe('uuid-1');
    expect(session.sessionId).toBe('uuid-1');
  });

  it('emits product events only after granted consent', () => {
    expect(shouldEmitOnboardingAnalytics('granted')).toBe(true);
    expect(shouldEmitOnboardingAnalytics('denied')).toBe(false);
    expect(shouldEmitOnboardingAnalytics('unset')).toBe(false);
  });
});
```

- [ ] **Step 2: Verify failure before implementation**

Run:

```powershell
npx jest --runTestsByPath tests/onboarding_analytics_session.test.ts --no-cache --runInBand
```

Expected: FAIL because the session module is missing.

- [ ] **Step 3: Implement the session helper and wire semantic events**

```ts
import type { AnalyticsConsentState } from './analytics_consent';

export function createOnboardingAnalyticsSession(createId: () => string) {
  return Object.freeze({ sessionId: createId() });
}

export function shouldEmitOnboardingAnalytics(state: AnalyticsConsentState): boolean {
  return state === 'granted';
}
```

In `CleanOnboarding.tsx`, emit `onboarding_started` once for the first measurable personalization screen after the Task 0 choice, then emit view/continue/back/error/completed with the same session ID. Do not buffer or replay pre-consent events. Map envelope fields to Firebase parameters exactly as `schema_version`, `event_id`, `session_id`, `flow_version`, `step`, `platform`, `app_version`, `build_number`, `study_target`, and `occurred_at_ms`.

- [ ] **Step 4: Run the focused onboarding guards**

```powershell
npx jest --runTestsByPath tests/onboarding_analytics_session.test.ts tests/onboarding_study_target_choice_contract.test.ts tests/analytics_funnel_coverage.test.ts --no-cache --runInBand
```

Expected: PASS.

### Task 3: BigQuery row contract and fixture rollup calculator

**Files:**
- Create: `functions/src/onboarding_analytics_rollup.ts`
- Test: `functions/src/onboarding_analytics_rollup.test.ts`

- [ ] **Step 1: Write fixture-based rollup tests**

```ts
import { computeOnboardingDailyRollup } from './onboarding_analytics_rollup';

it('computes unique sessions, transitions, backtracks and invalid rows', () => {
  const result = computeOnboardingDailyRollup([
    { eventId: '1', sessionId: 'a', eventName: 'onboarding_step_view', step: 'goal', occurredAtMs: 1000 },
    { eventId: '2', sessionId: 'a', eventName: 'onboarding_step_continue', step: 'goal', occurredAtMs: 2000 },
    { eventId: '3', sessionId: 'a', eventName: 'onboarding_step_view', step: 'minutes', occurredAtMs: 2100 },
    { eventId: '3', sessionId: 'a', eventName: 'onboarding_step_view', step: 'minutes', occurredAtMs: 2100 },
    { eventId: '', sessionId: '', eventName: 'bad', step: '', occurredAtMs: 0 },
  ]);

  expect(result.uniqueSessions).toBe(1);
  expect(result.steps.goal.views).toBe(1);
  expect(result.steps.goal.continues).toBe(1);
  expect(result.duplicateEvents).toBe(1);
  expect(result.invalidEvents).toBe(1);
});
```

- [ ] **Step 2: Run and confirm failure**

```powershell
Set-Location functions
npx jest src/onboarding_analytics_rollup.test.ts --runInBand
```

Expected: FAIL because the calculator is missing.

- [ ] **Step 3: Implement a pure rollup calculator**

The fixture calculator must deduplicate by `eventId`, reject missing required fields, aggregate per step, compute unique sessions, and return deterministic p50/p90 duration fields from matched view/continue pairs. It must not import Firebase so fixture tests stay deterministic. Production must not feed a whole raw day into this function; Task 4 performs aggregation inside BigQuery SQL.

- [ ] **Step 4: Run the Functions test**

Run the command from Step 2. Expected: PASS.

### Task 4: BigQuery materializer and aggregate storage

**Files:**
- Create: `functions/src/onboarding_analytics_materializer.ts`
- Create: `functions/src/onboarding_analytics_query.ts`
- Modify: `functions/src/index.ts`
- Modify: `functions/package.json`
- Modify: `functions/.env.example`
- Test: `functions/src/onboarding_analytics_materializer.test.ts`
- Test: `functions/src/onboarding_analytics_query.test.ts`

- [ ] **Step 1: Add tests for partition bounds and aggregate paths**

```ts
import { onboardingRollupDocumentId, utcDayBounds } from './onboarding_analytics_materializer';

it('uses a deterministic aggregate id', () => {
  expect(onboardingRollupDocumentId({
    day: '2026-07-11', flowVersion: 'flow-1', platform: 'ios', buildNumber: '200', studyTarget: 'en',
  })).toBe('2026-07-11__flow-1__ios__200__en');
});

it('builds one UTC day window', () => {
  expect(utcDayBounds('2026-07-11')).toEqual({
    startMs: Date.parse('2026-07-11T00:00:00.000Z'),
    endMs: Date.parse('2026-07-12T00:00:00.000Z'),
  });
});
```

- [ ] **Step 2: Verify the tests fail**

```powershell
Set-Location functions
npx jest src/onboarding_analytics_materializer.test.ts --runInBand
```

- [ ] **Step 3: Define infrastructure and SQL mapping**

Configure `ONBOARDING_ANALYTICS_BQ_PROJECT`, `ONBOARDING_ANALYTICS_BQ_DATASET`, and the Analytics table pattern through Functions environment configuration. Keep Functions in the existing project region, run the scheduler in UTC, and grant its service account read access only to the selected EU dataset plus write access to aggregate documents. No credentials or service-account keys belong in the repository.

The query must use `_TABLE_SUFFIX` partition bounds and `UNNEST(event_params)` for the exact Task 2 parameter names. Use Firebase `event_timestamp` as the authoritative ordering time; retain `occurred_at_ms` only for skew diagnostics. Accept only supported `schema_version` values. Generate/deduplicate by `event_id` and suppress duplicate step views for the same session/step transition.

Aggregate and calculate p50/p90 in BigQuery SQL. Add a maximum-bytes-billed/query cost guard and test the generated query using a mocked `@google-cloud/bigquery` client.

- [ ] **Step 4: Implement rolling scheduled materialization**

Recalculate the latest three UTC days on every scheduled run so delayed Firebase export rows are incorporated. BigQuery returns already aggregated rows. Write one idempotent document per dimension set under `admin_analytics_onboarding_daily/{documentId}` using `set`, not increments. Persist `materializedAt`, `sourceDay`, `sourceWatermark`, `status: 'preliminary' | 'final'`, `schemaVersions`, `invalidEvents`, and `duplicateEvents`. Never load or persist raw event rows.

- [ ] **Step 5: Run query and materializer tests**

```powershell
Set-Location functions
npx jest src/onboarding_analytics_rollup.test.ts src/onboarding_analytics_query.test.ts src/onboarding_analytics_materializer.test.ts --runInBand
```

Expected: PASS.

### Task 5: Admin-only aggregate reader

**Files:**
- Create: `functions/src/admin_onboarding_analytics.ts`
- Modify: `functions/src/index.ts`
- Test: `functions/src/admin_onboarding_analytics.test.ts`

- [ ] **Step 1: Test authorization, range caps, response limits and response shape**

The test must assert that non-admin calls fail, ranges over 180 days fail, oversized responses fail, small sensitive cohorts are suppressed, and successful calls return only aggregate fields without session IDs or event IDs.

- [ ] **Step 2: Implement the callable**

Require authenticated `admin` claim, validate ISO dates and filters, cap the range at 180 days, query aggregate documents by `sourceDay`, apply platform/build/study-target filters in the backend, and cap documents and response bytes. Return `{ rows, cohortDefinition: 'analytics_consent_granted', generatedAtMs }`. Do not return an abstract coverage percentage. A later coverage metric is permitted only with a named denominator, source, and formula.

- [ ] **Step 3: Run the focused Functions tests**

```powershell
Set-Location functions
npx jest src/admin_onboarding_analytics.test.ts --runInBand
```

Expected: PASS.

### Task 6: Admin v2 onboarding funnel and data-quality UI

**Files:**
- Create: `admin/scripts/admin-onboarding-analytics.js`
- Modify: `admin/index.html`
- Read before editing: `docs/design/ADMIN_UI_BIBLE.md`
- Test: `tests/admin_onboarding_analytics_contract.test.ts`
- Test: `scripts/admin-v2-smoke.mjs`

- [ ] **Step 1: Write static UI contracts**

Assert that the screen lives under the existing analytics/overview category, contains period/platform/build/study-target filters, shows `N`, previous-step conversion, start conversion, loss, p50/p90 time, and includes the permanent notice `Только пользователи, разрешившие аналитику`.

- [ ] **Step 2: Add the UI module and route wiring**

The module must call the admin-only backend reader, never read the rollup collection directly, render loading/empty/error/preliminary/final states, and provide a table alternative for the funnel chart. Buttons need tooltips, controls need labels, focus must remain visible, and no new first-level navigation category may be added. Show `Только пользователи, разрешившие аналитику` and state that pre-consent historical steps are unavailable. Keep source and UI text in normal UTF-8.

- [ ] **Step 3: Run focused Admin contracts**

```powershell
npx jest --runTestsByPath tests/admin_onboarding_analytics_contract.test.ts tests/admin_revenue_analytics_contract.test.ts --no-cache --runInBand
node scripts/admin-v2-smoke.mjs
```

Expected: PASS without deploying Hosting.

### Task 7: Focused verification and handoff

**Files:**
- Modify only if verification exposes a scoped defect in files already listed above.

- [ ] **Step 1: Run the complete focused gate**

```powershell
npx jest --runTestsByPath tests/onboarding_analytics_contract.test.ts tests/onboarding_analytics_session.test.ts tests/analytics_funnel_coverage.test.ts tests/admin_onboarding_analytics_contract.test.ts tests/admin_revenue_analytics_contract.test.ts --no-cache --runInBand
Set-Location functions
npx jest src/onboarding_analytics_rollup.test.ts src/onboarding_analytics_materializer.test.ts src/admin_onboarding_analytics.test.ts --runInBand
```

- [ ] **Step 2: Inspect the final diff**

```powershell
git diff -- app/onboarding_analytics_contract.ts app/onboarding_analytics_session.ts app/analytics.ts components/CleanOnboarding.tsx functions/src/onboarding_analytics_rollup.ts functions/src/onboarding_analytics_materializer.ts functions/src/admin_onboarding_analytics.ts functions/src/index.ts functions/package.json admin/index.html admin/scripts/admin-onboarding-analytics.js tests/onboarding_analytics_contract.test.ts tests/onboarding_analytics_session.test.ts tests/admin_onboarding_analytics_contract.test.ts
```

Confirm that there is no DOB, user name, email, answer text, chat text, raw event Firestore collection, or hidden Admin v2 first-level tab.

- [ ] **Step 3: Do not deploy automatically**

Return the verified local result for review. Hosting and Functions deployment require an explicit release decision because this plan changes backend processing and the production admin surface.
