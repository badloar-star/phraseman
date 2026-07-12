# Admin v2 Trustworthy Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a trustworthy, server-calculated analytics dashboard in standalone Admin v2 without touching the legacy admin or deploying production resources.

**Architecture:** Pure aggregation functions define metric semantics and are fixture-tested independently of Firestore. The existing admin-only callable orchestrates bounded reads and returns typed metrics plus source-health metadata; a dedicated view module renders accessible cards and tables while `admin-core.js` owns only loading state.

**Tech Stack:** TypeScript, Firebase Admin/Cloud Functions v2, Firestore, vanilla ES modules, CSS, Jest/ts-jest.

---

## File map

- Create `functions/src/admin_analytics_core.ts`: pure classifiers, aggregators, snapshot types.
- Create `functions/src/admin_analytics_core.test.ts`: numeric fixture tests.
- Modify `functions/src/admin_analytics.ts`: authenticated Firestore orchestration and safe source states.
- Modify `functions/src/admin_analytics.test.ts`: callable input/source contract tests.
- Create `admin/v2/scripts/admin-analytics-view.js`: escaped semantic analytics renderer.
- Modify `admin/v2/scripts/admin-core.js`: analytics state machine and action wiring.
- Modify `admin/v2/styles/admin.css`: responsive analytics layout and state skeletons.
- Create `tests/admin_v2_analytics_contract.test.ts`: UI and integration contract.

### Task 1: Pure analytics definitions

**Files:**
- Create: `functions/src/admin_analytics_core.ts`
- Create: `functions/src/admin_analytics_core.test.ts`

- [ ] **Step 1: Write failing access-classification tests**

Create fixtures for RC monthly future/expired/grace, trial, lifetime, admin grant, revoked VIP, active VIP, gift, store+VIP overlap, hidden identity and stale manual plan. Assert an exclusive result:

```ts
expect(classifyActiveAccess(user({ premium_plan: 'yearly', premium_rc_product_id: 'annual', premium_rc_expiry_ms: future }), NOW).kind)
  .toBe('store_subscription');
expect(classifyActiveAccess(user({ premium_plan: 'yearly', premium_rc_expiry_ms: expiredBeyondGrace }), NOW)).toBeNull();
expect(aggregateActiveAccess(rows, NOW).activeAccessTotal)
  .toBe(Object.values(aggregateActiveAccess(rows, NOW).byKind).reduce((a, b) => a + b, 0));
```

- [ ] **Step 2: Run the access tests and verify RED**

Run: `npm --prefix functions test -- --runInBand src/admin_analytics_core.test.ts`

Expected: FAIL because `admin_analytics_core.ts` does not exist.

- [ ] **Step 3: Implement minimal exclusive access classification**

Define `AccessKind`, `AnalyticsUserRow`, `classifyActiveAccess` and `aggregateActiveAccess`. Use 72-hour RC grace and priority `store_trial → store_lifetime → store_subscription → gift → admin_grant → vip → manual_or_unknown`. Exclude `identityHidden === true`.

- [ ] **Step 4: Add failing event-aggregation tests**

Cover exact production predicates and exclusions:

```ts
expect(aggregateRevenueCatPeriod(events).trialStarts).toBe(1);
expect(aggregateRevenueCatPeriod(events).excluded.sandbox).toBe(1);
expect(aggregateShardPeriod(shards).productionPurchases).toBe(1);
expect(aggregateFunnelSignals(funnel).purchaseSignalRate).toBeCloseTo(0.25);
```

Include duplicate IDs, `RENEWAL + TRIAL`, `CANCELLATION + TRIAL`, refund, sandbox, unknown environment, dev funnel and zero shown.

- [ ] **Step 5: Implement event aggregators and pass all core tests**

Run: `npm --prefix functions test -- --runInBand src/admin_analytics_core.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the pure core**

```powershell
git add -- functions/src/admin_analytics_core.ts functions/src/admin_analytics_core.test.ts
git commit -m "feat: define trustworthy admin analytics metrics"
```

### Task 2: Server snapshot orchestration

**Files:**
- Modify: `functions/src/admin_analytics.ts`
- Modify: `functions/src/admin_analytics.test.ts`

- [ ] **Step 1: Write failing callable contract tests**

Assert the source list includes users, app activity, RevenueCat premium events, RevenueCat shard transactions and paywall funnel; assert the source shape exposes state, count, truncated, latestAtMs and a sanitized error code. Assert source caps use `cap + 1` detection and the response contains `definitionVersion`, `generatedAtMs`, `quality`, `access`, `storeActivity`, `funnelSignals` and `appActivity`.

- [ ] **Step 2: Run callable tests and verify RED**

Run: `npm --prefix functions test -- --runInBand src/admin_analytics.test.ts`

Expected: FAIL on the old snapshot shape.

- [ ] **Step 3: Replace browser-style counting with core aggregators**

Keep these gates unchanged:

```ts
if (!request.auth?.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
if (!role || !hasPermission(role, 'money.read')) throw new HttpsError('permission-denied', 'Role cannot read analytics');
```

Read bounded rows, map `doc.id` into each event for dedupe, compute latest timestamp per source, and return only aggregate output. Convert caught errors to stable codes such as `users_read_failed`; never return raw Firestore error messages.

- [ ] **Step 4: Verify Functions tests and build**

Run:

```powershell
npm --prefix functions test -- --runInBand src/admin_analytics_core.test.ts src/admin_analytics.test.ts
npm --prefix functions run build
```

Expected: PASS and TypeScript build exit 0.

- [ ] **Step 5: Commit orchestration**

```powershell
git add -- functions/src/admin_analytics.ts functions/src/admin_analytics.test.ts
git commit -m "feat: return source-aware admin analytics snapshot"
```

### Task 3: Native Admin v2 analytics view

**Files:**
- Create: `admin/v2/scripts/admin-analytics-view.js`
- Modify: `admin/v2/scripts/admin-core.js`
- Modify: `admin/v2/styles/admin.css`
- Create: `tests/admin_v2_analytics_contract.test.ts`

- [ ] **Step 1: Write the failing UI contract**

Assert:

```ts
expect(core).toContain("import { renderAdminAnalytics } from './admin-analytics-view.js'");
expect(core).not.toContain('JSON.stringify(snapshot, null, 2)');
expect(view).toContain('События, не уникальные пользователи и не деньги');
expect(view).toContain('Активные доступы');
expect(view).toContain('Качество источников');
expect(core).toContain("status: 'idle'");
expect(core).toContain("status: 'loading'");
expect(core).toContain("status: 'error'");
```

Also assert one primary refresh button, labeled range select with 7/28/90 values, tooltip, `aria-live`, no legacy analytics link and no emoji.

- [ ] **Step 2: Run UI contract and verify RED**

Run: `npx jest --runInBand --runTestsByPath tests/admin_v2_analytics_contract.test.ts`

Expected: FAIL because the view module does not exist and raw JSON remains.

- [ ] **Step 3: Implement the renderer**

Export `renderAdminAnalytics(model)` and keep all interpolation escaped. Render stable geometry for summary cards, store activity, consented funnel, app activity and source health. Display `—` for unavailable metrics, not zero. Mark incomplete dependent blocks when a source is partial/error.

- [ ] **Step 4: Wire the state machine**

Initialize:

```js
analytics: { status: 'idle', snapshot: null, error: '' },
```

On refresh, preserve `snapshot`, set loading, then set `ready|partial|empty`; on failure keep the snapshot and set `error`. Gate the CTA with `disabledWhenUnauthorized('money.read')`.

- [ ] **Step 5: Add responsive accessible styles**

Use existing variables/components. Add grid breakpoints without page-level horizontal scroll, 44px controls, visible focus, `prefers-reduced-motion`, and dark text on the lime primary action.

- [ ] **Step 6: Verify UI tests and syntax**

Run:

```powershell
npx jest --runInBand --runTestsByPath tests/admin_v2_analytics_contract.test.ts tests/admin_v2_native_capability_routing.test.ts
node --check admin/v2/scripts/admin-core.js
node --check admin/v2/scripts/admin-analytics-view.js
```

Expected: PASS and both syntax checks exit 0.

- [ ] **Step 7: Commit UI**

```powershell
git add -- admin/v2/scripts/admin-analytics-view.js admin/v2/scripts/admin-core.js admin/v2/styles/admin.css tests/admin_v2_analytics_contract.test.ts
git commit -m "feat: render trustworthy analytics in admin v2"
```

### Task 4: Reconciliation and final gates

**Files:**
- No production writes.
- Update tests only if a discovered definition bug requires an explicit fixture.

- [ ] **Step 1: Run all focused gates from Tasks 1–3**

Expected: all PASS.

- [ ] **Step 2: Run a read-only fixture reconciliation**

Using the already-authorized service account, call the pure aggregators over read-only production snapshots for UTC 2026-06-15 through 2026-07-12. Confirm categories reconcile, actual trial-start predicate differs from lifecycle TRIAL count, funnel raw counts match the audit, and sandbox shard purchases are excluded. Do not write results into source or tests.

- [ ] **Step 3: Verify scope and diff**

Run:

```powershell
git diff f167d4211 --check
git diff f167d4211 --stat
git status --short
```

Assert `admin/index.html` is absent from the diff and no deployment/config secret files changed.

- [ ] **Step 4: Request Advisor final review**

Provide objective, constraints, actual diff, focused test evidence and remaining uncertainty. Apply requested corrections and resubmit until `DECISION: APPROVED`.

- [ ] **Step 5: Do not deploy or merge**

Report the isolated branch and verification. Integration into `codex/admin-language-factory` waits until its Free/Plus work is committed and conflicts can be resolved deliberately.
