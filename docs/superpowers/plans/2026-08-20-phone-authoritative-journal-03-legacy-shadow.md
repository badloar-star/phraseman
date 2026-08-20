# PhoneState Legacy Import and Shadow Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import all classified portable legacy state exactly once, record new core progress in shadow, and prove new projections match without changing user-visible authority.

**Architecture:** A generated-and-reviewed inventory is the allowlist for import and legacy mirroring. Import runs only after provider identity resolution under the existing account transition lock, writes a fingerprinted opening checkpoint, and then shadow adapters compare PhoneState projections with current AsyncStorage/cloud behavior.

**Tech Stack:** TypeScript, AsyncStorage, SQLCipher PhoneStateStore, existing account-generation locks, Remote Config, Jest

---

## File map

- Create `config/phone-state-legacy-inventory.v1.json`: complete classified key/prefix registry.
- Create `scripts/guard_phone_state_legacy_inventory.mjs`: static discovery and unknown-key failure.
- Create `modules/phone-state/legacy_inventory.ts`: validated runtime registry.
- Create `modules/phone-state/legacy_reader.ts`: bounded account-scoped snapshot reads.
- Create `modules/phone-state/opening_checkpoint.ts`: conservative legacy merge and fingerprint receipt.
- Create `modules/phone-state/legacy_mirror.ts`: one-way projection compatibility writes.
- Create `modules/phone-state/shadow_compare.ts`: domain comparison and mismatch classification.
- Create `app/phone_state_bootstrap.ts`: identity-safe import/shadow bootstrap.
- Create `app/phone_state_shadow_adapters.ts`: XP/completion shadow append API.
- Modify `app/xp_manager.ts`, `app/progress_events_client.ts`: shadow-only adapters after legacy commit.
- Modify `app/_layout.tsx`: bootstrap after provider anchor resolution and before background sync.
- Modify `app/remote_flags.ts`, `app/remote_config_client.ts`: dormant rollout flags.
- Modify `app/cloud_sync.ts`, `app/auth_provider.ts`: account transition barriers and one-way mirror preservation.

### Task 1: Machine-enforced legacy inventory

**Files:**
- Create: `config/phone-state-legacy-inventory.v1.json`
- Create: `scripts/guard_phone_state_legacy_inventory.mjs`
- Create: `tests/phone_state_legacy_inventory.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing inventory contract**

```ts
test('every portable cloud key and account-scoped storage key is classified', () => {
  const report = auditPhoneStateLegacyInventory({ rootDir: projectRoot });
  expect(report.unknownKeys).toEqual([]);
  expect(report.unknownPrefixes).toEqual([]);
  expect(report.duplicateOwners).toEqual([]);
});

test('every inventory row declares import, merge, mirror and sensitivity policy', () => {
  for (const row of inventory.rows) {
    expect(row).toEqual(expect.objectContaining({
      domain: expect.any(String),
      scope: expect.stringMatching(/^(portable|device_only|external)$/),
      reducer: expect.stringMatching(/^(sum_unique|max|union|date_union|field_register|or_set|composite_economy|none)$/),
      importSource: expect.any(Array),
      legacyMirror: expect.any(Boolean),
      sensitivity: expect.stringMatching(/^(low|personal|sensitive)$/),
    }));
  }
});
```

- [ ] **Step 2: Run and prove failure**

Run: `npx jest --runInBand --runTestsByPath tests/phone_state_legacy_inventory.test.ts`

Expected: FAIL because inventory and scanner are absent.

- [ ] **Step 3: Implement deterministic discovery**

The guard parses:

- `SYNC_KEYS` and dynamic lesson/exam builders in `app/cloud_sync.ts`;
- `TARGET_ACCOUNT_STORAGE_KEYS` and prefixes in `app/target_storage_keys.ts`;
- known durable outbox/ledger constants in `app/progress_events_client.ts`, `app/economy/client_shard_operation_ledger.ts`, `modules/learning-v2/progress/progress_outbox.ts`, and `app/friend_gift_outbox.ts`;
- string-literal keys passed to AsyncStorage/storage helpers under `app`, `components`, `hooks`, `contexts`, `lib`, and `modules`.

The script supports only `--print-candidates` and `--check`. It never rewrites source. `--check` exits non-zero with the exact key and writer paths when no exact row or reviewed prefix rule covers a candidate.

- [ ] **Step 4: Create the reviewed manifest**

```json
{
  "schemaVersion": "phone-state-legacy-inventory.v1",
  "rows": [
    {
      "key": "user_total_xp",
      "domain": "xp",
      "scope": "portable",
      "reducer": "max",
      "importSource": ["async_storage", "last_sync_snapshot", "cloud_progress"],
      "legacyMirror": true,
      "sensitivity": "personal"
    },
    {
      "key": "tester_no_premium",
      "domain": "device_debug",
      "scope": "device_only",
      "reducer": "none",
      "importSource": [],
      "legacyMirror": false,
      "sensitivity": "low"
    }
  ],
  "prefixRules": []
}
```

Run `node scripts/guard_phone_state_legacy_inventory.mjs --print-candidates`, classify every emitted candidate, then run `--check` until it reports `unknownKeys=0 unknownPrefixes=0`. Do not use a catch-all prefix.

- [ ] **Step 5: Add the package guard and commit**

Add `"guard:phone-state-inventory": "node scripts/guard_phone_state_legacy_inventory.mjs --check"`.

Run:

```powershell
npm run guard:phone-state-inventory
npx jest --runInBand --runTestsByPath tests/phone_state_legacy_inventory.test.ts
```

Expected: PASS and exact zero unknown counts.

```powershell
git add config/phone-state-legacy-inventory.v1.json scripts/guard_phone_state_legacy_inventory.mjs tests/phone_state_legacy_inventory.test.ts package.json
git commit -m "test: classify every legacy personal state key"
```

### Task 2: Validated inventory runtime and bounded reader

**Files:**
- Create: `modules/phone-state/legacy_inventory.ts`
- Create: `modules/phone-state/legacy_reader.ts`
- Create: `tests/phone_state_legacy_reader.test.ts`

- [ ] **Step 1: Write failing reader tests**

```ts
test('reader returns only portable rows for the active account', async () => {
  const snapshot = await readLegacyPortableSnapshot(scope, sourcesWithMixedKeys());
  expect(snapshot.values).toHaveProperty('user_total_xp');
  expect(snapshot.values).not.toHaveProperty('tester_no_premium');
  expect(snapshot.stableUid).toBe(scope.stableUid);
});

test('account generation change aborts without returning mixed data', async () => {
  const sources = sourcesThatSwitchGenerationDuringMultiGet();
  await expect(readLegacyPortableSnapshot(scope, sources))
    .rejects.toThrow('phone_state_generation_stale');
});
```

- [ ] **Step 2: Run and prove failure**

Run: `npx jest --runInBand --runTestsByPath tests/phone_state_legacy_reader.test.ts`

Expected: FAIL with missing runtime/reader.

- [ ] **Step 3: Implement validated registry and snapshot contract**

```ts
export type LegacyPortableSnapshot = Readonly<{
  schemaVersion: 'legacy-portable-snapshot.v1';
  stableUid: string;
  accountGeneration: number;
  values: Readonly<Record<string, Readonly<{
    local: string | null;
    lastSynced: string | null;
    cloud: unknown;
  }>>>;
  journals: readonly LegacyJournalEnvelope[];
  capturedAtMs: number;
}>;
```

Load exact keys with chunked `multiGet`, never `getAllKeys` in the runtime path. Read existing journals by their reviewed prefix rules with bounded count/bytes. Capture the existing runtime account token before and after every awaited source and reject stale generation.

- [ ] **Step 4: Verify and commit**

Run: `npx jest --runInBand --runTestsByPath tests/phone_state_legacy_reader.test.ts`

Expected: PASS, including size-limit and malformed-value quarantine cases.

```powershell
git add modules/phone-state/legacy_inventory.ts modules/phone-state/legacy_reader.ts tests/phone_state_legacy_reader.test.ts
git commit -m "feat: read classified legacy state safely"
```

### Task 3: Idempotent opening checkpoint merge

**Files:**
- Create: `modules/phone-state/opening_checkpoint.ts`
- Create: `tests/phone_state_legacy_import.test.ts`

- [ ] **Step 1: Write failing migration fixtures**

```ts
test('snapshot counters use max and sets use union without double count', async () => {
  const result = await importLegacyOpeningCheckpoint(fixture({
    local: { user_total_xp: '120', unlocked_lessons: '[1,2]' },
    lastSynced: { user_total_xp: '100', unlocked_lessons: '[1]' },
    cloud: { user_total_xp: '110', unlocked_lessons: '[1,3]' },
  }));
  expect(result.projections.xp.total).toBe(120);
  expect(result.projections.lessons.unlocked).toEqual([1, 2, 3]);
});

test('repeat import returns the same receipt and preserves journal operation IDs', async () => {
  const first = await importLegacyOpeningCheckpoint(fixtureWithEconomyAndL2Outboxes());
  const second = await importLegacyOpeningCheckpoint(fixtureWithEconomyAndL2Outboxes());
  expect(second.receipt).toEqual(first.receipt);
  expect(second.insertedOperations).toBe(0);
});
```

- [ ] **Step 2: Run and prove failure**

Run: `npx jest --runInBand --runTestsByPath tests/phone_state_legacy_import.test.ts`

Expected: FAIL with missing importer.

- [ ] **Step 3: Define and implement the opening receipt**

```ts
export type LegacyOpeningReceipt = Readonly<{
  schemaVersion: 'legacy-opening-checkpoint.v1';
  stableUid: string;
  accountGeneration: number;
  sourceFingerprint: string;
  checkpointId: string;
  importedOperationIds: readonly string[];
  quarantinedKeys: readonly string[];
  createdAtMs: number;
}>;
```

In one PhoneState transaction: check `migrations` for the fingerprint, import existing ledgers with original IDs, create deterministic opening operations for snapshot-only values, apply max/union/date-union/register rules from the manifest, write projections/checkpoint/receipt, and commit. External entitlements go to `external_events`; they never become personal grants.

For a local value different from `lastSynced`, the opening register clock must dominate the cloud opening register. No source timestamps are used.

- [ ] **Step 4: Verify and commit**

Run: `npx jest --runInBand --runTestsByPath tests/phone_state_legacy_import.test.ts`

Expected: PASS for clean, partial, corrupt, repeated, economy, Learning V2, and cloud-missing fixtures.

```powershell
git add modules/phone-state/opening_checkpoint.ts tests/phone_state_legacy_import.test.ts
git commit -m "feat: import legacy state idempotently"
```

### Task 4: Account lifecycle and durable lineage

**Files:**
- Create: `app/phone_state_bootstrap.ts`
- Create: `tests/phone_state_account_isolation.test.ts`
- Modify: `app/account_generation.ts`
- Modify: `app/cloud_sync.ts`
- Modify: `app/auth_provider.ts`
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Write failing lifecycle tests**

```ts
test('provider-linked stableUid is resolved before any import', async () => {
  const h = accountBootstrapHarness({ localStableUid: 'anon-A', providerStableUid: 'account-B' });
  await h.bootstrap();
  expect(h.openedScopes()).toEqual(['account-B']);
  expect(h.importedKeysFrom('anon-A')).toEqual([]);
});

test('logout closes but preserves the owner queue and blocks the next account', async () => {
  const h = accountBootstrapHarness({ stableUid: 'account-A' });
  await h.appendPending();
  await h.switchTo('account-B');
  expect(h.visibleOperations('account-B')).toEqual([]);
  await h.switchTo('account-A');
  expect(h.pendingOperations('account-A')).toHaveLength(1);
});
```

- [ ] **Step 2: Run and prove failure**

Run: `npx jest --runInBand --runTestsByPath tests/phone_state_account_isolation.test.ts`

Expected: FAIL with missing bootstrap lifecycle.

- [ ] **Step 3: Separate durable account lineage from runtime race generation**

`captureAccountGeneration()` remains the in-flight race guard. Add a persistent PhoneState lineage record `phone_state_lineage_v1:<accountHash>` in the same SecureStore service as the SQLCipher key; it is a validated positive integer, starts at `1`, survives logout/login, and changes only when the identity is irreversibly deleted/replaced. `PersonalOperation.accountGeneration` uses this durable lineage, not the transient process counter.

```ts
export type PhoneStateAccountContext = Readonly<{
  stableUid: string;
  lineage: number;
  runtimeToken: AccountGenerationToken;
}>;
```

Update Plan 1 credential calls to use `lineage` in database/key names while checking `runtimeToken` around every await.

- [ ] **Step 4: Wire bootstrap at the correct identity boundary**

After `signInWithProvider`/auth-link repair has selected the provider-linked stable UID and after old account wipe/restore locks are idle, `bootstrapPhoneState` opens that account DB, runs schema migration/import, then installs dormant sync. Account switch closes handles before local wipe. Deletion clears the deleted account’s SQLCipher key only after the existing point-of-no-return guard is durable; the UI still awaits only `beginAccountDeletion()`.

- [ ] **Step 5: Run all Auth invariants and commit**

Run:

```powershell
npx jest --runInBand --runTestsByPath `
  tests/phone_state_account_isolation.test.ts `
  tests/auth_provider_stable_link.test.ts `
  tests/account_delete_flow_contract.test.ts `
  tests/stable_id.test.ts `
  tests/auth_identity_anon_relink.test.ts
```

Expected: PASS; account deletion UI never awaits the full background completion.

```powershell
git add app/phone_state_bootstrap.ts app/account_generation.ts app/cloud_sync.ts app/auth_provider.ts app/_layout.tsx tests/phone_state_account_isolation.test.ts
git commit -m "feat: isolate phone state across account transitions"
```

### Task 5: Dormant rollout flags

**Files:**
- Modify: `app/remote_flags.ts`
- Modify: `app/remote_config_client.ts`
- Create: `tests/phone_state_rollout_flags.test.ts`

- [ ] **Step 1: Write the failing default-off test**

```ts
test('all PhoneState authority flags default off', () => {
  expect(getRemoteBool('phone_state_shadow_enabled')).toBe(false);
  expect(getRemoteBool('phone_state_sync_enabled')).toBe(false);
  expect(getRemoteNumber('phone_state_cutover_percent')).toBe(0);
});

test('cohort assignment is stable and never exceeds the configured percent', () => {
  expect(assignPhoneStateCohort('stable-A', 0)).toBe(false);
  expect(assignPhoneStateCohort('stable-A', 10)).toBe(assignPhoneStateCohort('stable-A', 10));
});
```

- [ ] **Step 2: Run and prove failure**

Run: `npx jest --runInBand --runTestsByPath tests/phone_state_rollout_flags.test.ts`

Expected: FAIL because the keys are not part of the exact unions/defaults.

- [ ] **Step 3: Add exact flags and stable cohort hashing**

Add bool keys `phone_state_shadow_enabled`, `phone_state_sync_enabled`; add number key `phone_state_cutover_percent`, clamped to integer 0–100. Cohort hashing uses `stableUid` plus a versioned salt, never random state or Firebase reads.

- [ ] **Step 4: Verify and commit**

Run: `npx jest --runInBand --runTestsByPath tests/phone_state_rollout_flags.test.ts`

Expected: PASS.

```powershell
git add app/remote_flags.ts app/remote_config_client.ts tests/phone_state_rollout_flags.test.ts
git commit -m "feat: add dormant phone state rollout gates"
```

### Task 6: Core-progress shadow adapters

**Files:**
- Create: `app/phone_state_shadow_adapters.ts`
- Create: `tests/phone_state_shadow_recording.test.ts`
- Modify: `app/xp_manager.ts`
- Modify: `app/progress_events_client.ts`

- [ ] **Step 1: Write failing adapter tests**

```ts
test('XP commits locally first and shadow failure cannot change its result', async () => {
  const h = xpHarness({ shadowAppend: () => Promise.reject(new Error('shadow_disk')) });
  await expect(h.registerXP(10, { eventId: 'lesson:1:a:1' })).resolves.toMatchObject({ xp: 10 });
  expect(h.legacyTotal()).toBe(10);
  expect(h.visibleErrors()).toEqual([]);
});

test('lesson completion and XP reuse stable semantic IDs', async () => {
  const h = shadowAdapterHarness();
  await h.completeLessonTwice('lesson-1', 'run-7');
  expect(h.phoneStateOperations('lesson_completion')).toHaveLength(1);
});
```

- [ ] **Step 2: Run and prove failure**

Run: `npx jest --runInBand --runTestsByPath tests/phone_state_shadow_recording.test.ts`

Expected: FAIL with missing adapters.

- [ ] **Step 3: Implement shadow-only writes**

`recordShadowXpGrant` maps the already-computed local XP result into an immutable `xp/grant` operation with exact result and an existing stable event ID. `recordShadowProgressEvent` maps lesson/exam completion facts but does not submit, recalculate, or affect current UI. Both return a diagnostic disposition and never throw across their current legacy callsite.

Insert calls only after the existing local AsyncStorage result is durable. Do not create a second XP operation from `progress_events_client.ts`; that file records completion facts only.

- [ ] **Step 4: Verify current behavior and commit**

Run:

```powershell
npx jest --runInBand --runTestsByPath `
  tests/phone_state_shadow_recording.test.ts `
  tests/progress_events_client_queue.test.ts `
  tests/cloud_sync_lesson_union_restore.test.ts
```

Expected: PASS; existing server queue behavior is unchanged while the cutover flag is zero.

```powershell
git add app/phone_state_shadow_adapters.ts app/xp_manager.ts app/progress_events_client.ts tests/phone_state_shadow_recording.test.ts
git commit -m "feat: shadow core progress into phone state"
```

### Task 7: Shadow comparison and one-way compatibility mirror

**Files:**
- Create: `modules/phone-state/shadow_compare.ts`
- Create: `modules/phone-state/legacy_mirror.ts`
- Create: `tests/phone_state_shadow_compare.test.ts`
- Modify: `app/phone_state_bootstrap.ts`

- [ ] **Step 1: Write failing mismatch and downgrade tests**

```ts
test('comparison classifies known semantic differences per domain', () => {
  expect(compareDomain('xp', { legacy: 100, phone: 110 })).toEqual({
    kind: 'phone_ahead', delta: 10,
  });
  expect(compareDomain('lessons', { legacy: [1, 2], phone: [1, 2, 3] }).kind)
    .toBe('phone_superset');
});

test('legacy mirror never lowers a legacy monotonic value', async () => {
  const storage = legacyStorage({ user_total_xp: '120' });
  await mirrorProjection(storage, 'xp', { total: 110 });
  expect(await storage.getItem('user_total_xp')).toBe('120');
});
```

- [ ] **Step 2: Run and prove failure**

Run: `npx jest --runInBand --runTestsByPath tests/phone_state_shadow_compare.test.ts`

Expected: FAIL with missing compare/mirror modules.

- [ ] **Step 3: Implement domain-aware comparisons**

Comparisons use inventory reducer semantics: exact sum/max, set differences, per-field register values, date sets, tombstones, and economy operation IDs. Emit only bounded metadata `{ domain, kind, counts, delta, schemaVersion }`; never log card text, user names, payloads, stable UID, or SQLCipher keys.

The one-way mirror is generated from inventory rows with `legacyMirror: true`; monotonic/set fields cannot be lowered, and mirror writes carry an in-memory/source marker so they do not create new shadow operations.

- [ ] **Step 4: Add shadow boot comparison and verify**

After opening/import, compare current legacy projections with PhoneState. On a mismatch, persist a bounded local diagnostic row and emit the existing privacy-safe analytics event. UI remains legacy-authoritative.

Run:

```powershell
npm run guard:phone-state-inventory
npx jest --runInBand --runTestsByPath `
  tests/phone_state_legacy_inventory.test.ts `
  tests/phone_state_legacy_reader.test.ts `
  tests/phone_state_legacy_import.test.ts `
  tests/phone_state_account_isolation.test.ts `
  tests/phone_state_rollout_flags.test.ts `
  tests/phone_state_shadow_recording.test.ts `
  tests/phone_state_shadow_compare.test.ts
```

Expected: all suites PASS.

```powershell
git add modules/phone-state/shadow_compare.ts modules/phone-state/legacy_mirror.ts app/phone_state_bootstrap.ts tests/phone_state_shadow_compare.test.ts
git commit -m "feat: compare phone state in shadow mode"
```

## Plan 3 completion gate

- Inventory reports zero unknown account-scoped keys/prefixes.
- Import is idempotent on all production-shaped fixtures.
- Provider-linked identity is resolved before DB open/import.
- Switching accounts exposes no previous-account rows and preserves the owner’s pending queue.
- Shadow mode runs for the agreed observation window with zero unexplained mismatch.
- UI and current cloud authority are still unchanged.
