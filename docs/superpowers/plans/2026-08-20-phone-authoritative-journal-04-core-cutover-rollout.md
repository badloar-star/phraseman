# PhoneState Core Progress Cutover and Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make PhoneState authoritative for XP, streak, lessons, and exams, remove ordinary sync-error UX, cut proven Firebase waste, and roll out from 1% to 100% with reversible stop gates.

**Architecture:** A cohort-aware progress facade commits PhoneState first and writes one-way legacy mirrors for compatibility. New-cohort clients never call the server progress engine; multi-device state arrives only through segments. Existing external authority, old-client compatibility, Auth deletion, payments, competitive results, and inter-user actions remain isolated.

**Tech Stack:** TypeScript, React Native, PhoneStateStore, Firestore, Cloud Functions compatibility endpoints, Remote Config, Jest

---

## File map

- Create `modules/phone-state/domains/progress_api.ts`: XP/streak/completion commit/read facade.
- Create `modules/phone-state/domains/progress_projection.ts`: stable public projection shape.
- Create `app/personal_progress_store.ts`: hydrated observable UI snapshot.
- Create `app/phone_state_health.ts`: local invariant stop gate and bounded metrics.
- Modify `app/xp_manager.ts`, `app/progress_events_client.ts`: cohort authority switch.
- Modify `app/cloud_sync.ts`: migrated-key exclusion from snapshot restore/push.
- Modify progress readers named by the inventory guard: use `personal_progress_store` or the derived mirror contract.
- Modify `app/_layout.tsx`, `app/language_welcome.tsx`, `app/flashcards/useCollectionData.ts`, `components/SeasonGiftModal.tsx`, `app/(tabs)/friends.tsx`: ordinary error/offline UX.
- Create `components/PhoneStateRecoveryScreen.tsx`: automatic local-durability recovery only.
- Modify `components/PremiumContext.tsx` plus entitlement writers: move live access state to a tiny server-owned document.
- Create `app/friends_account_store.ts`: one account-scoped friends/gift snapshot owner.
- Modify `app/app_messages.ts`, `app/_layout.tsx`, `app/(tabs)/home.tsx`, `app/league_engine.ts`, `app/flashcards/marketplace.ts`, `app/flashcards/useCollectionData.ts`, `components/GlobalFriendGiftHost.tsx`, `app/(tabs)/friends.tsx`: cost contracts.
- Modify `admin/v2/legacy.html`: rollout controls only, following `docs/design/ADMIN_UI_BIBLE.md`.
- Modify `functions/src/progress_events.ts`, `functions/src/index.ts`, `firestore.rules`: compatibility retirement only after the final gate.

### Task 1: Cohort-aware personal progress facade

**Files:**
- Create: `modules/phone-state/domains/progress_projection.ts`
- Create: `modules/phone-state/domains/progress_api.ts`
- Create: `tests/phone_state_progress_api.test.ts`

- [ ] **Step 1: Write failing authority tests**

```ts
test('commit returns only after journal and projection are durable', async () => {
  const h = progressHarness();
  const pending = h.api.grantXp(xpInput({ amount: 10, eventId: 'lesson:1:a:1' }));
  expect(h.uiSuccesses()).toBe(0);
  h.releaseSqlCommit();
  await expect(pending).resolves.toMatchObject({ totalXp: 10, duplicate: false });
});

test('server time and server balance are absent from ordinary progress inputs', () => {
  expect(Object.keys(xpInput({ amount: 10, eventId: 'x' })))
    .not.toEqual(expect.arrayContaining(['serverTime', 'serverTotalXp', 'serverStreak']));
});
```

- [ ] **Step 2: Run and prove failure**

Run: `npx jest --runInBand --runTestsByPath tests/phone_state_progress_api.test.ts`

Expected: FAIL with missing progress facade.

- [ ] **Step 3: Define the public projection and commands**

```ts
export type PersonalProgressProjection = Readonly<{
  totalXp: number;
  level: number;
  weeklyXp: number;
  activityDates: readonly string[];
  streakCount: number;
  completedLessons: readonly string[];
  passedExams: readonly string[];
  unlockedLessons: readonly string[];
  bestResults: Readonly<Record<string, number>>;
}>;

export interface PersonalProgressApi {
  grantXp(input: Readonly<{
    eventId: string;
    amount: number;
    source: string;
    activityDate: string;
    exactResult: unknown;
  }>): Promise<Readonly<{ totalXp: number; level: number; streakCount: number; duplicate: boolean }>>;
  completeLesson(input: Readonly<{ eventId: string; lessonId: string; bestPct?: number }>): Promise<PersonalProgressProjection>;
  completeExam(input: Readonly<{ eventId: string; examId: string; bestPct: number }>): Promise<PersonalProgressProjection>;
  read(): Promise<PersonalProgressProjection>;
}
```

Each method delegates to one PhoneState transaction and then updates the one-way compatibility mirror. A mirror failure records diagnostics but does not fail an already committed operation.

- [ ] **Step 4: Verify and commit**

Run: `npx jest --runInBand --runTestsByPath tests/phone_state_progress_api.test.ts`

Expected: PASS for duplicates, negative/unsafe input rejection, date union, best max, and mirror failure.

```powershell
git add modules/phone-state/domains/progress_projection.ts modules/phone-state/domains/progress_api.ts tests/phone_state_progress_api.test.ts
git commit -m "feat: add phone authoritative progress facade"
```

### Task 2: Switch XP and completion writes without per-answer callable

**Files:**
- Modify: `app/xp_manager.ts`
- Modify: `app/progress_events_client.ts`
- Modify: `app/lesson_complete.tsx`
- Modify: `app/lesson1.tsx`
- Modify: `app/exam.tsx`
- Modify: `app/level_exam.tsx`
- Create: `tests/phone_state_progress_cutover.test.ts`

- [ ] **Step 1: Write failing cutover tests**

```ts
test('cutover cohort grants XP through PhoneState and never submits progress callable', async () => {
  const h = cutoverHarness({ enabled: true });
  await h.registerXP(10, 'lesson_answer', { eventId: 'lesson:1:a:1' });
  expect(h.phoneStateOperations()).toHaveLength(1);
  expect(h.callableCalls('progressSubmitEvent')).toBe(0);
});

test('legacy cohort behavior remains available during compatibility horizon', async () => {
  const h = cutoverHarness({ enabled: false });
  await h.registerXP(10, 'lesson_answer', { eventId: 'lesson:1:a:1' });
  expect(h.callableCalls('progressSubmitEvent')).toBe(1);
});

test('twenty answers and lesson completion seal one segment', async () => {
  const h = cutoverHarness({ enabled: true });
  await h.completeTwentyAnswerLesson();
  expect(h.sealedSegments()).toHaveLength(1);
});
```

- [ ] **Step 2: Run and prove failure**

Run: `npx jest --runInBand --runTestsByPath tests/phone_state_progress_cutover.test.ts`

Expected: FAIL because server submission still owns the cutover path.

- [ ] **Step 3: Refactor `registerXP` around one computed exact result**

Keep all existing multiplier/product rules. After computing the final amount, branch once:

```ts
if (await isPhoneStateCutoverEnabled(accountToken.stableId)) {
  const committed = await personalProgressApi.grantXp({
    eventId: requireStableXpEventId(options),
    amount: finalXp,
    source,
    activityDate: localActivityDate(),
    exactResult: exactXpResult,
  });
  publishXpProjection(committed);
  return existingRegisterXpReturnShape(committed);
}
return registerXpLegacyPath(/* existing inputs */);
```

No fire-and-forget before the local commit. The compatibility mirror is derived from the committed projection, not a second independent calculation.

- [ ] **Step 4: Convert completion submissions for the cohort**

In `progress_events_client.ts`, `lesson_complete.tsx`, `lesson1.tsx`, `exam.tsx`, and `level_exam.tsx`, map existing stable attempt/event IDs to `completeLesson`/`completeExam`. For the cutover cohort, `submitProgressEvent` returns a local compatibility result and skips App Check, migration callable, and `progressSubmitEvent`. External rewards/competitive submissions remain unchanged.

- [ ] **Step 5: Verify both cohorts and commit**

Run:

```powershell
npx jest --runInBand --runTestsByPath `
  tests/phone_state_progress_cutover.test.ts `
  tests/progress_events_client_queue.test.ts `
  tests/cloud_sync_lesson_union_restore.test.ts `
  tests/economy_constitution_contract.test.ts
```

Expected: PASS for both cohorts; new cohort reports zero progress callables.

```powershell
git add app/xp_manager.ts app/progress_events_client.ts app/lesson_complete.tsx app/lesson1.tsx app/exam.tsx app/level_exam.tsx tests/phone_state_progress_cutover.test.ts
git commit -m "feat: cut core progress over to the phone journal"
```

### Task 3: PhoneState-backed progress reads and subscriptions

**Files:**
- Create: `app/personal_progress_store.ts`
- Create: `tests/personal_progress_store.test.ts`
- Modify: `app/app_snapshot_bootstrap.ts`
- Modify: `app/app_snapshot_store.ts`
- Modify: `app/(tabs)/home.tsx`
- Modify: `app/(tabs)/lessons.tsx`
- Modify: `app/(tabs)/settings.tsx`
- Modify: `app/achievements.ts`
- Modify: `app/achievements_screen.tsx`
- Modify: `components/EnergyContext.tsx`
- Modify: `components/DialogsTabContent.tsx`
- Modify: `app/public_profile_snapshot.ts`
- Create: `tests/phone_state_direct_progress_read_guard.test.ts`

- [ ] **Step 1: Write failing hydration/subscription tests**

```ts
test('hydration publishes PhoneState projection before screens render cutover data', async () => {
  const h = progressStoreHarness({ phoneState: { totalXp: 120, streakCount: 4 }, legacy: { totalXp: 90 } });
  await h.hydrate();
  expect(h.snapshot()).toMatchObject({ totalXp: 120, streakCount: 4, hydrated: true });
});

test('local commit updates subscribers without any cloud event', async () => {
  const h = progressStoreHarness();
  const observed: number[] = [];
  h.subscribe(() => observed.push(h.snapshot().totalXp));
  await h.grantXp(10);
  expect(observed.at(-1)).toBe(10);
});
```

- [ ] **Step 2: Run and prove failure**

Run: `npx jest --runInBand --runTestsByPath tests/personal_progress_store.test.ts`

Expected: FAIL with missing store.

- [ ] **Step 3: Implement the observable store**

Expose `hydratePersonalProgress`, `getPersonalProgressSnapshot`, and `subscribePersonalProgress` using the same external-store pattern as `app/app_snapshot_store.ts`. Cutover screens never read AsyncStorage to decide XP/streak/lesson state.

```ts
export type PersonalProgressSnapshot = PersonalProgressProjection & Readonly<{
  hydrated: boolean;
  source: 'phone_state' | 'legacy';
}>;
```

- [ ] **Step 4: Replace the named direct readers**

Update the files in this task to read the store or an explicit projection passed from it. Preserve current public-profile/competitive uploads as outbound projections; they do not become personal authority.

Add a static guard scanning current inventory writer paths and forbidding direct `AsyncStorage.getItem('user_total_xp'|'streak_count')` in cutover UI modules. Its allowlist is limited to migration, legacy mirror, old-client compatibility, and diagnostics.

- [ ] **Step 5: Verify and commit**

Run:

```powershell
npx jest --runInBand --runTestsByPath `
  tests/personal_progress_store.test.ts `
  tests/phone_state_direct_progress_read_guard.test.ts `
  tests/home_screen_hydration.test.ts `
  tests/app_snapshot_store_contract.test.ts
```

Expected: PASS and guard prints zero unauthorized direct core-progress reads.

```powershell
git add app/personal_progress_store.ts app/app_snapshot_bootstrap.ts app/app_snapshot_store.ts 'app/(tabs)/home.tsx' 'app/(tabs)/lessons.tsx' 'app/(tabs)/settings.tsx' app/achievements.ts app/achievements_screen.tsx components/EnergyContext.tsx components/DialogsTabContent.tsx app/public_profile_snapshot.ts tests/personal_progress_store.test.ts tests/phone_state_direct_progress_read_guard.test.ts
git commit -m "refactor: read core progress from phone state"
```

### Task 4: Remove core progress from giant snapshot authority

**Files:**
- Modify: `app/cloud_sync.ts`
- Modify: `tests/cloud_sync_lesson_union_restore.test.ts`
- Create: `tests/phone_state_cloud_boundary.test.ts`

- [ ] **Step 1: Write failing cloud-boundary tests**

```ts
test('cutover cohort neither uploads nor restores core progress through users.progress', async () => {
  const h = cloudBoundaryHarness({ cutover: true });
  await h.forceSync();
  expect(h.lastUserProgressWrite()).not.toEqual(expect.objectContaining({
    user_total_xp: expect.anything(),
    streak_count: expect.anything(),
    unlocked_lessons: expect.anything(),
  }));
  await h.restore({ user_total_xp: '1', streak_count: '1' });
  expect(h.phoneProjection()).toMatchObject({ totalXp: 100, streakCount: 7 });
});

test('unrelated fields are never conflict-resolved by XP', async () => {
  const h = cloudBoundaryHarness({ cutover: true });
  await h.restore({ user_total_xp: '999', app_lang: 'es' });
  expect(h.registerDecision('app_lang')).not.toContain('xp');
});
```

- [ ] **Step 2: Run and prove failure**

Run: `npx jest --runInBand --runTestsByPath tests/phone_state_cloud_boundary.test.ts`

Expected: FAIL because restore still uses global XP authority.

- [ ] **Step 3: Install a strict migrated-key boundary**

For cutover accounts, filter core progress before all generic upload paths, including `forceSyncToCloud`. On restore, never apply root/cloud core progress after `legacy-opening-checkpoint.v1`; only the PhoneState segment/checkpoint pipeline may advance it. Remove XP/streak from the decision clock for unrelated keys and route remaining portable fields through their inventory reducer or leave them on legacy authority until their own plan.

- [ ] **Step 4: Verify and commit**

Run:

```powershell
npx jest --runInBand --runTestsByPath `
  tests/phone_state_cloud_boundary.test.ts `
  tests/cloud_sync_lesson_union_restore.test.ts `
  tests/cloud_sync_customization_account_isolation.test.ts
```

Expected: PASS; stale `users.progress` cannot lower PhoneState.

```powershell
git add app/cloud_sync.ts tests/cloud_sync_lesson_union_restore.test.ts tests/phone_state_cloud_boundary.test.ts
git commit -m "fix: remove snapshot authority from core progress"
```

### Task 5: Remove ordinary sync-error UX and offline gates

**Files:**
- Create: `tests/phone_state_ordinary_error_contract.test.ts`
- Create: `tests/phone_state_local_durability_recovery.test.ts`
- Create: `components/PhoneStateRecoveryScreen.tsx`
- Modify: `app/_layout.tsx`
- Modify: `app/language_welcome.tsx`
- Modify: `app/flashcards/useCollectionData.ts`
- Modify: `components/SeasonGiftModal.tsx`
- Modify: `app/(tabs)/friends.tsx`
- Modify: `components/account/AccountLogoutFlow.tsx`

- [ ] **Step 1: Write the failing static/behavioral contract**

```ts
test('ordinary paths contain no network save toast, rollback, or pre-queue NetInfo gate', () => {
  expect(source('_layout.tsx')).not.toContain('облачные данные временно недоступны');
  expect(source('language_welcome.tsx')).not.toContain('Проверь соединение');
  expect(source('friends.tsx')).not.toMatch(/NetInfo[\s\S]{0,800}friendGiftOutbox/);
});

test('local reward success closes the modal even when background sync fails', async () => {
  const h = seasonGiftHarness({ localApply: 'success', cloudSync: 'offline' });
  await h.claim();
  expect(h.closed()).toBe(true);
  expect(h.visibleError()).toBeNull();
});

test('repeated local disk failure shows recovery without claiming network loss or saved state', async () => {
  const h = localDurabilityHarness({ failAfterCacheCleanup: true });
  await h.commit();
  expect(h.recoveryScreen()).toMatchObject({ visible: true, automaticRetry: true });
  expect(h.copy()).not.toMatch(/интернет|облако|сохранено/i);
});
```

- [ ] **Step 2: Run and prove failure**

Run: `npx jest --runInBand --runTestsByPath tests/phone_state_ordinary_error_contract.test.ts`

Expected: FAIL on the known audit strings/gates.

- [ ] **Step 3: Make ordinary refresh/save silent and cache-first**

- `_layout.tsx`: cloud restore failure keeps local state and schedules durable retry; no ordinary toast.
- `language_welcome.tsx`: await local commit; network prefetch failure is ignored. Local disk failure routes to PhoneState recovery, not a connection alert.
- `useCollectionData.ts`: render persisted collection snapshot; background refresh failure leaves it intact without an error toast.
- `SeasonGiftModal.tsx`: once local idempotent reward apply succeeds, close and sync in background.
- `friends.tsx`: enqueue gift intent before connectivity check. Because it is inter-user external state, show neutral `pending` until server confirmation, not a fake completed transfer.
- `AccountLogoutFlow.tsx`: distinguish durable `saved on phone / cloud pending` from true local durability failure; retain the exceptional account-boundary warning without claiming offline data loss.
- `PhoneStateRecoveryScreen.tsx`: after automatic reproducible-cache cleanup and bounded retry both fail, block only the unsaved action with neutral copy `Освобождаем место и восстанавливаем сохранение…`; retry automatically and expose diagnostics only in Settings/dev tools. Use the project’s Motion Hybrid fullscreen shell and accessibility semantics.

- [ ] **Step 4: Preserve legitimate external errors and verify**

The contract allowlist keeps provider Auth, real payment/refund, unique public nickname, competitive settlement, moderation, and AI/voice request failures visible.

Run:

```powershell
npx jest --runInBand --runTestsByPath `
  tests/phone_state_ordinary_error_contract.test.ts `
  tests/phone_state_local_durability_recovery.test.ts `
  tests/friends_tab_gift_interaction_contract.test.ts `
  tests/gift_modal_closes_on_apply_contract.test.ts `
  tests/account_delete_flow_contract.test.ts
```

Expected: PASS.

```powershell
git add app/_layout.tsx app/language_welcome.tsx app/flashcards/useCollectionData.ts components/SeasonGiftModal.tsx components/PhoneStateRecoveryScreen.tsx 'app/(tabs)/friends.tsx' components/account/AccountLogoutFlow.tsx tests/phone_state_ordinary_error_contract.test.ts tests/phone_state_local_durability_recovery.test.ts
git commit -m "fix: keep ordinary sync failures out of user flows"
```

### Task 6: Fix proven Firebase read amplification

**Files:**
- Create: `tests/phone_state_firebase_quiet_contract.test.ts`
- Modify: `app/_layout.tsx`
- Modify: `app/app_messages.ts`
- Modify: `app/(tabs)/home.tsx`
- Modify: `app/league_engine.ts`
- Modify: `app/flashcards/marketplace.ts`
- Modify: `app/flashcards/useCollectionData.ts`
- Modify: `components/GlobalFriendGiftHost.tsx`
- Modify: `app/(tabs)/friends.tsx`
- Modify: `components/PlayerProfileModal.tsx`
- Modify: `components/SeasonGiftModal.tsx`
- Create: `app/friends_account_store.ts`
- Create: `tests/friends_account_store.test.ts`

- [ ] **Step 1: Write failing cost-policy guards**

```ts
test('foreground respects app-message TTL', () => {
  expect(source('app/_layout.tsx')).not.toContain('refreshAppMessagesSnapshotOnce({ force: true, minIntervalMs: 0 })');
});

test('home does not fetch foreign league data', () => {
  expect(source('app/(tabs)/home.tsx')).not.toContain('checkLeagueOnAppOpen(');
});

test('marketplace and gifts have one shared TTL owner', () => {
  expect(marketplacePolicy().minimumTtlMs).toBeGreaterThanOrEqual(6 * 60 * 60 * 1000);
  expect(giftInboxPolicy().pollOwners).toEqual(['GlobalFriendGiftHost']);
});
```

- [ ] **Step 2: Run and prove failure**

Run: `npx jest --runInBand --runTestsByPath tests/phone_state_firebase_quiet_contract.test.ts`

Expected: FAIL on forced foreground messages, Home league fetch, absent marketplace TTL, and duplicate gift polling.

- [ ] **Step 3: Apply exact cost policies**

- Foreground app messages call `refreshAppMessagesSnapshotOnce()` with the existing 24-hour snapshot TTL; inbox retains its 12-hour policy.
- Home reads only cached/pending local league result. Foreign group refresh remains in `club_screen.tsx`, TTL at least 6 hours, with existing week-change and explicit pull-to-refresh exceptions.
- Marketplace returns the persisted/warm snapshot until a 6-hour TTL expires; collection focus does not force the 50 + 80 document queries.
- `GlobalFriendGiftHost` becomes the only poll owner. Friends consumes the shared cached result and does not call `claimUnseenFriendGifts` on focus.
- Duplicate friend listeners are consolidated into one account-scoped store before modals subscribe to it.

`app/friends_account_store.ts` owns the single friends listener and the cached gift-inbox projection. `friends.tsx`, `PlayerProfileModal.tsx`, and `SeasonGiftModal.tsx` subscribe through its `getSnapshot/subscribe` API; opening a modal must not create a second Firestore listener.

- [ ] **Step 4: Run owner guards and commit**

Run:

```powershell
npx jest --runInBand --runTestsByPath `
  tests/phone_state_firebase_quiet_contract.test.ts `
  tests/friends_account_store.test.ts `
  tests/league_zero_points_demotion.test.ts `
  tests/league_engine_rollover.test.ts
node scripts/guard_league_refresh_ttl.mjs
node scripts/guard_league_demotion.mjs
```

Expected: PASS; league demotion logic is unchanged and remote refresh stays club-only/6-hour.

```powershell
git add app/_layout.tsx app/app_messages.ts 'app/(tabs)/home.tsx' app/league_engine.ts app/flashcards/marketplace.ts app/flashcards/useCollectionData.ts app/friends_account_store.ts components/GlobalFriendGiftHost.tsx components/PlayerProfileModal.tsx components/SeasonGiftModal.tsx 'app/(tabs)/friends.tsx' tests/phone_state_firebase_quiet_contract.test.ts tests/friends_account_store.test.ts
git commit -m "perf: enforce quiet Firebase refresh policies"
```

### Task 7: Move live entitlement access off the giant user document

**Files:**
- Create: `functions/src/access_projection.ts`
- Create: `functions/src/access_projection.test.ts`
- Create: `scripts/backfill_access_projection.mjs`
- Create: `tests/access_projection_writer_contract.test.ts`
- Modify: `functions/src/admin_access_controls.ts`
- Modify: `functions/src/auth_merge.ts`
- Modify: `functions/src/revenuecat_premium_lineage.ts`
- Modify: `functions/src/promo_codes.ts`
- Modify: `functions/src/referral.ts`
- Modify: `functions/src/referral_spin.ts`
- Modify: `functions/src/telegram_premium_admin.ts`
- Modify: `functions/src/telegram_premium_bot.ts`
- Modify: `functions/src/web_checkout.ts`
- Modify: `functions/src/vip_orphan_reconcile.ts`
- Modify: `functions/src/vip_revoke.ts`
- Modify: `functions/src/premium_expiry_cron.ts`
- Modify: `components/PremiumContext.tsx`
- Modify: `firestore.rules`
- Modify: `tests/firestore_rules_security.test.ts`
- Modify: `functions/src/jarvis/jarvis_data_contract_guard.test.ts`

- [ ] **Step 1: Write failing access-security tests**

```ts
test('access projection contains only bounded server-owned access fields', () => {
  expect(buildAccessProjection(userProgress)).toEqual({
    schemaVersion: 'access-projection.v1',
    premiumActive: true,
    premiumPlan: 'yearly',
    premiumExpiresAtMs: 2_000,
    vipActive: false,
    updatedAtMs: 1_000,
  });
});

test('PremiumContext listens to the tiny access doc, not users/{uid}', () => {
  expect(source('components/PremiumContext.tsx')).toContain("collection('access_projection').doc('current')");
  expect(source('components/PremiumContext.tsx')).not.toMatch(/collection\('users'\)\.doc\(uid\)\.onSnapshot/);
});

test('every premium/VIP writer updates the tiny access projection in the same mutation boundary', () => {
  expect(auditAccessProjectionWriters()).toEqual({ missing: [] });
});
```

- [ ] **Step 2: Run and prove failure**

Run:

```powershell
npx jest --runInBand --runTestsByPath `
  functions/src/access_projection.test.ts `
  tests/firestore_rules_security.test.ts
```

Expected: FAIL because the projection does not exist.

- [ ] **Step 3: Add one shared server writer**

```ts
export function writeAccessProjection(
  writer: FirebaseFirestore.WriteBatch | FirebaseFirestore.Transaction,
  userRef: FirebaseFirestore.DocumentReference,
  projection: AccessProjection,
): void {
  writer.set(userRef.collection('access_projection').doc('current'), projection, { merge: false });
}
```

Call this helper in the same batch/transaction as each entitlement mutation in the named writer files. Never let the client create/update this document. `tests/access_projection_writer_contract.test.ts` statically inventories every write of `premium_plan`, `premium_expiry`, `premium_rc_*`, `admin_premium_override`, and `vip_until`; it fails when the containing mutation boundary does not also call the projection helper.

`scripts/backfill_access_projection.mjs` defaults to dry-run, pages users in bounded batches, prints only counts, and requires `--apply --confirm-project phraseman-ea0b3` for writes. It is idempotent by projection equality. Run dry-run, compare eligible/projected/error counts, then run apply before switching the listener.

- [ ] **Step 4: Switch listener, Rules, and Jarvis**

Owner clients may read `users/{uid}/access_projection/current`; all writes/deletes are denied. `PremiumContext` seeds from local RevenueCat/cache, then listens only to the tiny document. Jarvis either reads the new projection explicitly or records it in the contract table while existing analytics continue reading legacy fields during the migration.

- [ ] **Step 5: Run critical access gates and commit**

Run:

```powershell
npx jest --runInBand --runTestsByPath `
  functions/src/access_projection.test.ts `
  tests/access_projection_writer_contract.test.ts `
  functions/src/admin_sensitive_writes.test.ts `
  functions/src/revenuecat_premium_lineage.test.ts `
  tests/firestore_rules_security.test.ts `
  functions/src/jarvis/jarvis_data_contract_guard.test.ts
```

Expected: PASS; admin App Check remains disabled per owner rule.

```powershell
git add functions/src/access_projection.ts functions/src/access_projection.test.ts scripts/backfill_access_projection.mjs tests/access_projection_writer_contract.test.ts functions/src/admin_access_controls.ts functions/src/auth_merge.ts functions/src/revenuecat_premium_lineage.ts functions/src/promo_codes.ts functions/src/referral.ts functions/src/referral_spin.ts functions/src/telegram_premium_admin.ts functions/src/telegram_premium_bot.ts functions/src/web_checkout.ts functions/src/vip_orphan_reconcile.ts functions/src/vip_revoke.ts functions/src/premium_expiry_cron.ts components/PremiumContext.tsx firestore.rules tests/firestore_rules_security.test.ts functions/src/jarvis/jarvis_data_contract_guard.test.ts
git commit -m "perf: isolate live access projection"
```

### Task 8: Health stop gate and rollout controls

**Files:**
- Create: `app/phone_state_health.ts`
- Create: `tests/phone_state_health.test.ts`
- Modify: `app/remote_flags.ts`
- Modify: `admin/v2/legacy.html`
- Create: `tests/admin_phone_state_rollout_contract.test.ts`

- [ ] **Step 1: Read the mandatory admin UI contract**

Read: `docs/design/ADMIN_UI_BIBLE.md`

Expected: controls use the existing categorized, icon-supported, tooltip-rich pattern in `admin/v2/legacy.html`; no other admin HTML file is edited.

- [ ] **Step 2: Write failing health/rollout tests**

```ts
test.each(['lost_operation', 'duplicate_result', 'orphan_debit', 'projection_downgrade', 'account_leak'])
  ('%s disables local cutover immediately', async (failure) => {
    const h = healthHarness();
    await h.recordCritical(failure);
    expect(h.cutoverEnabled()).toBe(false);
    expect(h.journalPreserved()).toBe(true);
  });

test('admin rollout controls expose only shadow, sync, percent and emergency stop', () => {
  expect(phoneStateAdminControls()).toEqual([
    'phone_state_shadow_enabled',
    'phone_state_sync_enabled',
    'phone_state_cutover_percent',
    'phone_state_emergency_stop',
  ]);
});
```

- [ ] **Step 3: Run and prove failure**

Run:

```powershell
npx jest --runInBand --runTestsByPath `
  tests/phone_state_health.test.ts `
  tests/admin_phone_state_rollout_contract.test.ts
```

Expected: FAIL with missing health state and controls.

- [ ] **Step 4: Implement fail-local health and admin controls**

Persist critical health in SQLCipher and force `isPhoneStateCutoverEnabled` false for that account without deleting journal rows. Emit bounded privacy-safe metrics for pending age, retries, cursor lag, duplicates, quarantine, replay mismatch, and read/write trace. Add `phone_state_emergency_stop` default true until internal/shadow acceptance, then owner deliberately sets false before 1%.

Add one admin section with current values, cohort percent input 0–100, emergency stop, last update actor/time, and explicit tooltip text. Reuse existing remote-config callable; do not enable App Check.

- [ ] **Step 5: Verify and commit**

Run the command from Step 3 plus `tests/admin_single_surface_contract.test.ts` and `tests/admin_v2_app_check_contract.test.ts`.

Expected: PASS; only `admin/v2/legacy.html` is the live UI surface.

```powershell
git add app/phone_state_health.ts app/remote_flags.ts admin/v2/legacy.html tests/phone_state_health.test.ts tests/admin_phone_state_rollout_contract.test.ts
git commit -m "feat: add phone state rollout stop controls"
```

### Task 9: Cohort rollout and compatibility retirement

**Files:**
- Modify: `functions/src/progress_events.ts`
- Modify: `functions/src/index.ts`
- Modify: `app/progress_events_client.ts`
- Modify: `app/cloud_sync.ts`
- Modify: `firestore.rules`
- Modify: `tests/progress_events_client_queue.test.ts`
- Modify: `functions/src/progress_events.test.ts`
- Create: `tests/phone_state_legacy_retirement_contract.test.ts`
- Modify: `functions/src/jarvis/jarvis_data_contract_guard.test.ts`

- [ ] **Step 1: Execute the release ladder with evidence at each step**

For internal, shadow, 1%, 10%, 50%, and 100%, capture the same bounded report:

```json
{
  "lostOperations": 0,
  "duplicateResults": 0,
  "orphanDebits": 0,
  "projectionDowngrades": 0,
  "accountLeaks": 0,
  "visibleOrdinarySyncErrors": 0,
  "lesson20SegmentWritesP95": 1,
  "lesson20ProgressCallablesP95": 0
}
```

Any non-zero invariant metric or cost breach sets emergency stop and blocks the next percentage. An unexplained shadow mismatch also blocks advancement.

- [ ] **Step 2: Hold two stable production releases at 100%**

Do not edit legacy Functions/Rules during this observation window. Require the minimum supported app version to be a PhoneState-capable binary before server endpoint retirement; preserve existing force-update owner controls.

- [ ] **Step 3: Write the failing retirement contract**

```ts
test('supported clients have no server-authoritative ordinary progress path', () => {
  expect(source('app/progress_events_client.ts')).not.toContain('progressSubmitEvent');
  expect(source('app/cloud_sync.ts')).not.toContain('progressServerAuthoritative');
  expect(source('functions/src/index.ts')).not.toMatch(/export.*progressSubmitEvent/);
});

test('external authority and immutable personal segments remain protected', () => {
  expect(rules()).toContain('personal_external_events');
  expect(rules()).toContain('allow create, update, delete: if false');
  expect(rules()).toContain('personal_sync_segments');
});
```

- [ ] **Step 4: Retire only the obsolete compatibility path**

After the two-release/minimum-version gates, remove supported-client use/export of `progressSubmitEvent`, `progressMigrateSnapshot`, server caps/rejections, `progressServerAuthoritative`, and core progress snapshot restore. Preserve unrelated Functions, external events, Auth, access, competitive, and old immutable server receipts required for audit. Update Jarvis contract in the same change.

- [ ] **Step 5: Run the final narrow gate and commit**

Run:

```powershell
npx jest --runInBand --runTestsByPath `
  tests/phone_state_legacy_retirement_contract.test.ts `
  tests/phone_state_progress_cutover.test.ts `
  tests/phone_state_cloud_boundary.test.ts `
  tests/phone_state_cost_contract.test.ts `
  tests/phone_state_ordinary_error_contract.test.ts `
  tests/phone_state_account_isolation.test.ts `
  tests/firestore_rules_security.test.ts `
  tests/economy_constitution_contract.test.ts `
  functions/src/jarvis/jarvis_data_contract_guard.test.ts
```

Expected: PASS; no supported ordinary server-authority path remains.

```powershell
git add functions/src/progress_events.ts functions/src/index.ts app/progress_events_client.ts app/cloud_sync.ts firestore.rules tests/progress_events_client_queue.test.ts functions/src/progress_events.test.ts tests/phone_state_legacy_retirement_contract.test.ts functions/src/jarvis/jarvis_data_contract_guard.test.ts
git commit -m "refactor: retire server authoritative progress"
```

## Plan 4 completion gate

- PhoneState is the read/write authority for core progress in all supported clients.
- Twenty-answer lesson produces at most one segment write and zero progress callables.
- Stale giant snapshots cannot lower or choose unrelated fields.
- Ordinary sync failure is silent and durable retry continues.
- Entitlement listener reads only a tiny server-owned access document.
- League, app messages, marketplace, gifts, and friends obey the documented read policies.
- Two stable 100% releases show zero loss, duplicate, orphan debit, downgrade, account leak, and visible ordinary sync errors.
- Removal affects only the explicitly replaced legacy progress authority paths.
