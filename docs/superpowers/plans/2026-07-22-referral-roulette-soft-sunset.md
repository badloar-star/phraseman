# Referral Roulette Soft Sunset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retire new referral-roulette acquisition safely while honoring time-bounded pending invitations and durable spin credits, with an independent emergency stop.

**Architecture:** A pure policy module defines cutoff and expiry decisions, while a server-only Firestore ledger owns every credit. Existing callables integrate those decisions transactionally, the client consumes a server-derived drain read model, and Admin V2 controls soft OFF and emergency stop separately with permission, confirmation, idempotency, and audit.

**Tech Stack:** TypeScript, Firebase Functions v2, Firestore transactions, Jest, React Native/Expo, AsyncStorage account-scoped caches, Admin V2 vanilla JavaScript.

---

## File structure

- Create `functions/src/referral_roulette_policy.ts`: pure defaults, server-time boundary decisions, legacy anchor, and eligible credit-source rules.
- Create `functions/src/referral_roulette_policy.test.ts`: exact boundary, soft/hard gates, and legacy anchor tests.
- Create `functions/src/referral_spin_ledger.ts`: deterministic IDs, ledger parsing, migration plan, expiry reconciliation, and oldest-valid selection.
- Create `functions/src/referral_spin_ledger.test.ts`: oldest-first, expired retention, replay IDs, and legacy migration tests.
- Modify `functions/src/referral.ts`: policy reads, gated code/apply, transactional qualification/expiry, drain read model, and status analytics.
- Modify `functions/src/referral_claim_spin.ts`: deterministic credit award and aggregate compatibility update.
- Modify `functions/src/referral_spin.ts`: ledger migration/reconciliation and atomic oldest-credit consumption.
- Modify `functions/src/referral_dev_grant.ts`: separate `dev_grant` ledger credit without soft-OFF grandfather rights.
- Modify `functions/src/admin_referrals.ts` and `functions/src/index.ts`: two audited controls and drain health metrics.
- Modify `app/remote_flags.ts` and `app/referral_roulette_flag.ts`: reactive soft/emergency policy.
- Modify `app/referral_cloud.ts`, `app/referral_vip.ts`, and `app/referrals_cache.ts`: typed server drain state and bounded account cache.
- Modify `app/roulette_spin_client.ts`: cached ledger summary and expiry-aware responses.
- Create `app/referral_sunset_copy.ts`: eight-locale deadline and expiry copy.
- Modify `app/referrals.tsx`, `app/(tabs)/friends.tsx`, `app/(tabs)/settings.tsx`, `app/roulette.tsx`, `app/roulette_about.tsx`, `app/referral_code_entry.tsx`, `app/settings_invite_friend.tsx`, and referral overlays: soft-OFF drain-only visibility.
- Modify `admin/v2/scripts/admin-firebase.js` and `admin/v2/scripts/admin-core.js`: separate Application-page controls.
- Create `tests/referral_roulette_soft_sunset_contract.test.ts`: client, Admin V2, localization, and server integration contracts.

### Task 1: Pure policy contract

**Files:**
- Create: `functions/src/referral_roulette_policy.test.ts`
- Create: `functions/src/referral_roulette_policy.ts`

- [ ] **Step 1: Write the failing policy tests**

```ts
expect(canQualifyAt({ softEnabled: false, emergencyStop: false, softOffAtMs: OFF }, CREATED, CREATED + SEVEN_DAYS_MS)).toBe(true);
expect(canQualifyAt({ softEnabled: false, emergencyStop: false, softOffAtMs: OFF }, CREATED, CREATED + SEVEN_DAYS_MS + 1)).toBe(false);
expect(canQualifyAt({ softEnabled: true, emergencyStop: true, softOffAtMs: 0 }, CREATED, CREATED + 1)).toBe(false);
expect(legacyCreditExpiryMs()).toBe(REFERRAL_LEDGER_ROLLOUT_AT_MS + THIRTY_DAYS_MS);
expect(canConsumeCreditSource(false, 'dev_grant')).toBe(false);
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- --runTestsByPath src/referral_roulette_policy.test.ts --runInBand` from `functions/`
Expected: FAIL because `referral_roulette_policy` does not exist.

- [ ] **Step 3: Implement the pure policy**

```ts
export const REFERRAL_LEDGER_ROLLOUT_AT_MS = Date.parse('2026-07-22T00:00:00.000Z');
export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
export const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function canQualifyAt(policy: ReferralRoulettePolicy, createdAtMs: number, passAtMs: number): boolean {
  if (policy.emergencyStop) return false;
  if (policy.softEnabled) return true;
  return createdAtMs > 0
    && policy.softOffAtMs > 0
    && createdAtMs <= policy.softOffAtMs
    && passAtMs <= createdAtMs + SEVEN_DAYS_MS;
}
```

- [ ] **Step 4: Run the policy test and verify GREEN**

Run: `npm test -- --runTestsByPath src/referral_roulette_policy.test.ts --runInBand` from `functions/`
Expected: PASS with all boundary and gate cases green.

### Task 2: Ledger selection and legacy migration contract

**Files:**
- Create: `functions/src/referral_spin_ledger.test.ts`
- Create: `functions/src/referral_spin_ledger.ts`

- [ ] **Step 1: Write the failing ledger tests**

```ts
const result = reconcileLedgerRows([
  row('old-expired', 10, 20),
  row('old-valid', 30, 100),
  row('new-valid', 40, 110),
], 50, { softEnabled: false });
expect(result.expiredIds).toEqual(['old-expired']);
expect(result.oldestValid?.id).toBe('old-valid');
expect(buildLegacyCreditRows(2).map((row) => row.expiresAtMs)).toEqual([
  REFERRAL_LEDGER_ROLLOUT_AT_MS + THIRTY_DAYS_MS,
  REFERRAL_LEDGER_ROLLOUT_AT_MS + THIRTY_DAYS_MS,
]);
```

- [ ] **Step 2: Run the ledger test and verify RED**

Run: `npm test -- --runTestsByPath src/referral_spin_ledger.test.ts --runInBand` from `functions/`
Expected: FAIL because the ledger helpers do not exist.

- [ ] **Step 3: Implement deterministic ledger helpers**

```ts
export function referralCreditId(attributionId: string): string {
  return `referral_${createHash('sha256').update(attributionId).digest('hex').slice(0, 40)}`;
}

export function reconcileLedgerRows(rows: CreditRow[], nowMs: number, policy: Pick<ReferralRoulettePolicy, 'softEnabled'>) {
  const ordered = [...rows].sort((a, b) => a.earnedAtMs - b.earnedAtMs || a.id.localeCompare(b.id));
  const expiredIds = ordered.filter((row) => row.status === 'available' && row.expiresAtMs < nowMs).map((row) => row.id);
  const oldestValid = ordered.find((row) => row.status === 'available' && row.expiresAtMs >= nowMs && canConsumeCreditSource(policy.softEnabled, row.source));
  return { expiredIds, oldestValid };
}
```

- [ ] **Step 4: Run ledger and policy tests and verify GREEN**

Run: `npm test -- --runTestsByPath src/referral_roulette_policy.test.ts src/referral_spin_ledger.test.ts --runInBand` from `functions/`
Expected: PASS; deterministic IDs, fixed legacy grace, expiry retention, and oldest-valid-first are green.

### Task 3: Gate attribution creation and qualification

**Files:**
- Modify: `functions/src/referral.ts`
- Modify: `functions/src/referral.test.ts`

- [ ] **Step 1: Add failing tests for policy parsing and qualification eligibility**

```ts
expect(referralRoulettePolicyFromData({ numbers: {} })).toMatchObject({ softEnabled: true, emergencyStop: false });
expect(referralRoulettePolicyFromData({ numbers: { referral_roulette_enabled: false, referral_roulette_soft_off_at_ms: OFF } }).softOffAtMs).toBe(OFF);
expect(existingQualifiedDrainEligible({ createdAtMs: CREATED, qualifiedAtMs: OFF - 1 }, policyOff)).toBe(true);
```

- [ ] **Step 2: Run `src/referral.test.ts` and verify RED**

Run: `npm test -- --runTestsByPath src/referral.test.ts --runInBand` from `functions/`
Expected: FAIL on missing policy and drain helpers.

- [ ] **Step 3: Integrate policy into `referral.ts`**

```ts
const [configSnap, attSnap, userSnap] = await Promise.all([
  tx.get(db.collection('remote_config').doc('app')),
  tx.get(attRef),
  tx.get(userRef),
]);
const policy = referralRoulettePolicyFromData(configSnap.data());
if (policy.emergencyStop) throw new HttpsError('failed-precondition', 'REFERRAL_ROULETTE_EMERGENCY_STOP');
if (!canQualifyAt(policy, attributionCreatedAtMs, nowMs)) {
  tx.set(attRef, { status: 'expired', deadlineAtMs, expiredAt: FieldValue.serverTimestamp(), expiredAtMs: nowMs }, { merge: true });
  return;
}
```

Gate new code creation and new `referralApply` attribution creation with the same policy snapshot inside their transactions. Preserve idempotent reads of existing code/attribution documents.

- [ ] **Step 4: Run referral tests and verify GREEN**

Run: `npm test -- --runTestsByPath src/referral.test.ts src/referral_roulette_policy.test.ts --runInBand` from `functions/`
Expected: PASS with exact boundary, late lesson, soft-OFF grandfather, and emergency denial.

### Task 4: Award and consume ledger credits transactionally

**Files:**
- Modify: `functions/src/referral_claim_spin.ts`
- Modify: `functions/src/referral_spin.ts`
- Modify: `functions/src/referral_dev_grant.ts`
- Modify: `functions/src/index.ts`
- Test: `functions/src/referral_spin_ledger.test.ts`

- [ ] **Step 1: Extend failing ledger tests for claim replay and dev exclusion**

```ts
expect(referralCreditId('invite-a')).toBe(referralCreditId('invite-a'));
expect(referralCreditId('invite-a')).not.toBe(referralCreditId('invite-b'));
expect(reconcileLedgerRows([devRow], now, { softEnabled: false }).oldestValid).toBeUndefined();
```

- [ ] **Step 2: Run ledger tests and verify RED on the new cases**

Run: `npm test -- --runTestsByPath src/referral_spin_ledger.test.ts --runInBand` from `functions/`
Expected: FAIL until the replay/source behavior is implemented.

- [ ] **Step 3: Update claim, spin, and dev-grant transactions**

```ts
const creditRef = userRef.collection(REFERRAL_SPIN_LEDGER).doc(referralCreditId(attSnap.id));
if (!creditSnap.exists) {
  tx.create(creditRef, buildAvailableCredit({ source: 'referral', attributionId: attSnap.id, earnedAtMs: nowMs }));
  spinsTotal += 1;
}
```

Spin reads the bounded ordered ledger set, marks every discovered expired record as `expired`, marks the selected oldest valid record `consumed`, creates the idempotent spin receipt, writes VIP fields, and updates the aggregate count in the same transaction. Dev grant writes `source='dev_grant'` and never bypasses soft OFF.

- [ ] **Step 4: Run focused function tests and build**

Run: `npm test -- --runTestsByPath src/referral_roulette_policy.test.ts src/referral_spin_ledger.test.ts src/referral.test.ts --runInBand` from `functions/`
Expected: PASS.
Run: `npm run build` from `functions/`
Expected: exit 0.

### Task 5: Return the drain read model and preserve bounded caches

**Files:**
- Modify: `functions/src/referral.ts`
- Modify: `app/referral_cloud.ts`
- Modify: `app/referral_vip.ts`
- Modify: `app/referrals_cache.ts`
- Modify: `app/roulette_spin_client.ts`
- Test: `tests/referral_roulette_soft_sunset_contract.test.ts`

- [ ] **Step 1: Write failing contracts for typed drain state and cache bounds**

```ts
expect(referralCloud).toContain('activePendingCount');
expect(referralCloud).toContain('availableCreditCount');
expect(referralCloud).toContain('earliestCreditExpiryMs');
expect(referralsCache).toContain('MAX_ENTRIES = 2');
```

- [ ] **Step 2: Run the root contract and verify RED**

Run: `npx jest --runTestsByPath tests/referral_roulette_soft_sunset_contract.test.ts --no-cache --runInBand`
Expected: FAIL because the read-model fields and cache integration are absent.

- [ ] **Step 3: Implement the server-derived read model**

```ts
type ReferralDrainState = {
  softEnabled: boolean;
  emergencyStop: boolean;
  serverNowMs: number;
  activePendingCount: number;
  availableCreditCount: number;
  latestPendingDeadlineMs: number;
  earliestCreditExpiryMs: number;
};
```

Return this state from `referralListMyInvites`, store it beside invites in the existing account-scoped two-entry cache, and update spin-credit memory/persistence only from server responses.

- [ ] **Step 4: Re-run the root contract and verify GREEN**

Run: `npx jest --runTestsByPath tests/referral_roulette_soft_sunset_contract.test.ts --no-cache --runInBand`
Expected: PASS for typed state and bounded-cache contracts.

### Task 6: Eight-locale drain-only client UI

**Files:**
- Create: `app/referral_sunset_copy.ts`
- Modify: `app/referrals.tsx`
- Modify: `app/(tabs)/friends.tsx`
- Modify: `app/(tabs)/settings.tsx`
- Modify: `app/roulette.tsx`
- Modify: `app/roulette_about.tsx`
- Modify: `app/referral_code_entry.tsx`
- Modify: `app/settings_invite_friend.tsx`
- Modify: `components/ReferralWelcomeHost.tsx`
- Modify: `components/EntitlementExpiredHost.tsx`
- Test: `tests/referral_roulette_soft_sunset_contract.test.ts`

- [ ] **Step 1: Add failing copy and visibility tests**

```ts
for (const lang of ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']) {
  expect(referralSunsetCopy[lang].pendingDeadline).toBeTruthy();
  expect(referralSunsetCopy[lang].spinExpiry).toBeTruthy();
}
expect(referralsScreen).toContain('drainVisible');
expect(referralsScreen).toContain('referrals-sunset-pending-deadline');
expect(referralsScreen).toContain('referrals-sunset-spin-expiry');
```

- [ ] **Step 2: Run the client contract and verify RED**

Run: `npx jest --runTestsByPath tests/referral_roulette_soft_sunset_contract.test.ts --no-cache --runInBand`
Expected: FAIL on missing locale and visibility behavior.

- [ ] **Step 3: Implement drain-only rendering**

```ts
const drainVisible = !policy.softEnabled
  && !policy.emergencyStop
  && (drain.activePendingCount > 0 || drain.availableCreditCount > 0);
const referralUiVisible = policy.softEnabled || drainVisible;
const marketingVisible = policy.softEnabled && !policy.emergencyStop;
```

Use the cached server read model for the first render, refresh quietly, show deadlines only in drain mode, and remove invite/code/about/marketing entry points when `marketingVisible` is false. Hide every trace when `referralUiVisible` is false.

- [ ] **Step 4: Run locale and existing referral screen contracts**

Run: `npx jest --runTestsByPath tests/referral_roulette_soft_sunset_contract.test.ts tests/referral_roulette_finish_contract.test.ts tests/referral_screens_contract.test.ts tests/friends_locale_runtime.test.ts --no-cache --runInBand`
Expected: PASS with all eight locales and visibility states covered.

### Task 7: Two audited Admin V2 controls and drain health

**Files:**
- Modify: `functions/src/admin_referrals.ts`
- Modify: `functions/src/index.ts`
- Modify: `admin/v2/scripts/admin-firebase.js`
- Modify: `admin/v2/scripts/admin-core.js`
- Test: `tests/referral_roulette_soft_sunset_contract.test.ts`

- [ ] **Step 1: Add failing Admin V2 and backend contracts**

```ts
expect(adminFunctions).toContain('adminSetReferralRouletteEmergencyStop');
expect(adminCore).toContain('Новые приглашения и промо');
expect(adminCore).toContain('Аварийная остановка рулетки');
expect(adminCore).toContain("can('application.config.write')");
expect(adminCore).toContain('idempotencyKey');
expect(adminCore).toContain('confirm(');
```

- [ ] **Step 2: Run the contract and verify RED**

Run: `npx jest --runTestsByPath tests/referral_roulette_soft_sunset_contract.test.ts --no-cache --runInBand`
Expected: FAIL because the emergency callable/control and drain metrics are absent.

- [ ] **Step 3: Implement both controls**

```ts
tx.set(configRef, {
  numbers: {
    referral_roulette_enabled: enabled,
    referral_roulette_soft_off_at_ms: enabled ? 0 : nowMs,
  },
}, { merge: true });
```

The emergency callable writes only `referral_roulette_emergency_stop`; both callables validate permission/reason/request IDs, bind idempotency to actor and fingerprint, and create audit records. `adminReferralHealth` returns both controls and drain counts plus cutoff-derived deadlines.

- [ ] **Step 4: Run Admin syntax and contracts**

Run: `node --check admin/v2/scripts/admin-core.js`
Expected: exit 0.
Run: `node --check admin/v2/scripts/admin-firebase.js`
Expected: exit 0.
Run: `npx jest --runTestsByPath tests/referral_roulette_soft_sunset_contract.test.ts tests/admin_v2_support_ui_contract.test.ts --no-cache --runInBand`
Expected: PASS.

### Task 8: Focused final verification and surgical handoff

**Files:**
- Verify all files listed above.

- [ ] **Step 1: Run fresh focused function verification**

Run: `npm test -- --runTestsByPath src/referral_roulette_policy.test.ts src/referral_spin_ledger.test.ts src/referral.test.ts --runInBand` from `functions/`
Expected: PASS with zero failures.
Run: `npm run build` from `functions/`
Expected: exit 0.

- [ ] **Step 2: Run fresh focused root verification**

Run: `npx jest --runTestsByPath tests/referral_roulette_soft_sunset_contract.test.ts tests/referral_roulette_finish_contract.test.ts tests/referral_screens_contract.test.ts tests/friends_locale_runtime.test.ts tests/remote_flags.test.ts --no-cache --runInBand`
Expected: PASS with zero failures.

- [ ] **Step 3: Run focused client typecheck and inspect diffs**

Run: `npx tsc --noEmit --pretty false` only if the repository exposes a bounded client config; otherwise record the focused Jest and Functions build as the available deterministic gates.
Run: `git diff --check`
Expected: no whitespace errors in feature-owned hunks.

- [ ] **Step 4: Check emulator availability**

Run: `rg -n "referral.*emulator|emulator.*referral" functions/src tests firebase.json`
Expected: if a bounded harness exists, run only that harness; otherwise report Firestore concurrent double-claim/double-spin execution as not emulator-verified.

- [ ] **Step 5: Stage only feature-owned files if they contain no mixed hunks**

```powershell
git status --short
git diff --name-only
```

Do not stage shared files with unrelated dirty hunks. Do not deploy, push, release, change production flags, or move the integration branch pointer.

## Plan self-review

- Spec coverage: tasks cover soft admission closure, grandfather deadlines, emergency stop, durable ledger, aggregate compatibility, legacy grace anchor, Admin V2 safety, analytics, localized visibility, and focused verification.
- Placeholder scan: every task names exact files, assertions, implementation shape, command, and expected result; there are no deferred implementation markers.
- Type consistency: `ReferralRoulettePolicy`, `ReferralDrainState`, ledger statuses, source names, config keys, and timestamp field names are consistent across server, client, tests, and admin tasks.
