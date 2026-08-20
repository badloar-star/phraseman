# PhoneState Immutable Segment Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upload and pull personal operations in bounded immutable segments with durable retry, per-device cursors, checkpoints, strict Rules, and no full-history rescans.

**Architecture:** The client seals SQLite outbox rows into canonical Firestore documents and writes them directly to the owner’s subcollection. A persisted coordinator drives upload/pull on data, connectivity, foreground, hydration, and background; checkpoints accelerate bootstrap but never replace unseen tail operations.

**Tech Stack:** TypeScript, `@react-native-firebase/firestore`, `@react-native-community/netinfo 11.4.1`, SQLite/SQLCipher, Firestore Rules and indexes, Jest

---

## File map

- Create `modules/phone-state/segments.ts`: segment assembly and 50-op/64-KiB sealing.
- Create `modules/phone-state/firestore_repository.ts`: exact cloud paths and incremental queries.
- Create `modules/phone-state/sync_engine.ts`: upload, pull, apply, cursor advance.
- Create `modules/phone-state/sync_coordinator.ts`: persisted retry state and single-flight scheduling.
- Create `modules/phone-state/checkpoints.ts`: vector checkpoints and bootstrap validation.
- Create `functions/src/personal_external_events.ts`: server-sequenced immutable external-event append helper.
- Create `functions/src/personal_external_events.test.ts`: idempotency and monotonic-sequence contract.
- Create `app/phone_state_sync_lifecycle.ts`: AppState/NetInfo/hydration integration only.
- Modify `app/_layout.tsx`: install lifecycle after account hydration.
- Modify `firestore.rules`, `firestore.indexes.json`: close and index new collections.
- Modify `functions/src/jarvis/jarvis_data_contract_guard.test.ts`: record the new schema and intentional reader decision.
- Modify `package.json`, `package-lock.json`: install SDK-pinned NetInfo.

### Task 1: Canonical bounded segment sealing

**Files:**
- Create: `modules/phone-state/segments.ts`
- Create: `tests/phone_state_segments.test.ts`

- [ ] **Step 1: Write failing boundary tests**

```ts
test('twenty answer operations seal as one lesson segment', async () => {
  const rows = Array.from({ length: 20 }, (_, index) => answerOperation(index + 1));
  const result = await assembleSegments(rows, { reason: 'lesson_complete' });
  expect(result).toHaveLength(1);
  expect(result[0].operationCount).toBe(20);
  expect(result[0].byteSize).toBeLessThanOrEqual(64 * 1024);
});

test('segments split before operation 51 or byte 65537', async () => {
  expect((await assembleSegments(makeOperations(51), { reason: 'capacity' }))).toHaveLength(2);
  const segments = await assembleSegments(makeLargeOperations(), { reason: 'capacity' });
  expect(segments.every((segment) => segment.byteSize <= 64 * 1024)).toBe(true);
});
```

- [ ] **Step 2: Run and prove failure**

Run: `npx jest --runInBand --runTestsByPath tests/phone_state_segments.test.ts`

Expected: FAIL with missing segment module.

- [ ] **Step 3: Define the segment contract**

```ts
export type PersonalSyncSegment = Readonly<{
  schemaVersion: 'personal-sync-segment.v1';
  stableUid: string;
  accountGeneration: number;
  deviceId: string;
  firstSequence: number;
  lastSequence: number;
  operationCount: number;
  byteSize: number;
  createdAtMs: number;
  payloadCanonical: string;
  fingerprint: string;
}>;

export const MAX_SEGMENT_OPERATIONS = 50;
export const MAX_SEGMENT_BYTES = 64 * 1024;
```

`payloadCanonical` is a canonical JSON array of full immutable operations. All operations must share account generation/device ID and have contiguous sequence values. The segment ID is `${deviceId}_${String(firstSequence).padStart(16, '0')}` after validating `deviceId` against `^[A-Za-z0-9_-]{16,80}$`.

- [ ] **Step 4: Implement seal triggers**

Expose `shouldSealOpenSegment` with reasons `operation_capacity`, `byte_capacity`, `lesson_complete`, `exam_complete`, `session_complete`, `background`, and `age_2m`. Sealing updates only SQLite `outbox_segments`; it performs no network call.

- [ ] **Step 5: Verify and commit**

Run: `npx jest --runInBand --runTestsByPath tests/phone_state_segments.test.ts`

Expected: PASS, including a single oversized-operation quarantine case.

```powershell
git add modules/phone-state/segments.ts tests/phone_state_segments.test.ts
git commit -m "feat: seal bounded personal sync segments"
```

### Task 2: Firestore repository with exact idempotent create

**Files:**
- Create: `modules/phone-state/firestore_repository.ts`
- Create: `tests/phone_state_firestore_repository.test.ts`

- [ ] **Step 1: Write failing repository tests**

```ts
test('exact retry succeeds and conflicting bytes fail closed', async () => {
  const cloud = createFirestoreHarness();
  const repo = createPhoneStateFirestoreRepository(cloud.firestore);
  await expect(repo.createSegment(segmentA)).resolves.toEqual({ kind: 'created' });
  await expect(repo.createSegment(segmentA)).resolves.toEqual({ kind: 'duplicate' });
  await expect(repo.createSegment({ ...segmentA, fingerprint: 'f'.repeat(64) }))
    .rejects.toThrow('phone_state_segment_id_conflict');
});

test('pull query starts strictly after the durable device cursor', async () => {
  const repo = createPhoneStateFirestoreRepository(createFirestoreHarness().firestore);
  await repo.listSegmentsAfter(scope, 'device-a', 100, 20);
  expect(lastQuery()).toMatchObject({ deviceId: 'device-a', lastSequenceGt: 100, limit: 20 });
});
```

- [ ] **Step 2: Run and prove failure**

Run: `npx jest --runInBand --runTestsByPath tests/phone_state_firestore_repository.test.ts`

Expected: FAIL with missing repository.

- [ ] **Step 3: Implement exact cloud paths and result types**

```ts
export const phoneStatePaths = (stableUid: string) => ({
  segments: `users/${stableUid}/personal_sync_segments`,
  checkpoints: `users/${stableUid}/personal_sync_checkpoints`,
  devices: `users/${stableUid}/sync_devices`,
  externalEvents: `users/${stableUid}/personal_external_events`,
});

export interface PhoneStateCloudRepository {
  createSegment(segment: PersonalSyncSegment): Promise<{ kind: 'created' | 'duplicate' }>;
  ensureDeviceManifest(manifest: DeviceStreamManifest): Promise<{ kind: 'created' | 'duplicate' }>;
  listDeviceManifests(scope: PhoneStateScope): Promise<readonly DeviceStreamManifest[]>;
  listSegmentsAfter(scope: PhoneStateScope, deviceId: string, sequence: number, limit: number): Promise<readonly PersonalSyncSegment[]>;
  listExternalEventsAfter(scope: PhoneStateScope, serverSequence: number, limit: number): Promise<readonly PersonalExternalEvent[]>;
  createCheckpoint(checkpoint: PersonalSyncCheckpoint): Promise<{ kind: 'created' | 'duplicate' }>;
  latestCheckpoint(scope: PhoneStateScope): Promise<PersonalSyncCheckpoint | null>;
}
```

On `already-exists`, read only that document and compare fingerprint. Never scan for duplicates. `sync_devices/{deviceId}` is an immutable discovery manifest created once before the device’s first segment and acknowledged locally; it is not rewritten after every segment.

- [ ] **Step 4: Verify and commit**

Run: `npx jest --runInBand --runTestsByPath tests/phone_state_firestore_repository.test.ts`

Expected: PASS with exact read/write call counts asserted.

```powershell
git add modules/phone-state/firestore_repository.ts tests/phone_state_firestore_repository.test.ts
git commit -m "feat: add immutable personal sync repository"
```

### Task 3: Firestore Rules, indexes, and Jarvis schema contract

**Files:**
- Modify: `firestore.rules`
- Modify: `firestore.indexes.json`
- Modify: `tests/firestore_rules_security.test.ts`
- Modify: `functions/src/jarvis/jarvis_data_contract_guard.test.ts`

- [ ] **Step 1: Write failing Rules and Jarvis tests**

```ts
test('personal sync segments are owner-create, immutable, bounded, and never deletable', () => {
  const block = nestedUserMatch('personal_sync_segments/{segmentId}');
  expect(block).toContain('allow read: if userDocOwnerMatchesAuth(userId)');
  expect(block).toContain("request.resource.data.schemaVersion == 'personal-sync-segment.v1'");
  expect(block).toContain('request.resource.data.payloadCanonical.size() <= 65536');
  expect(block).toContain('request.resource.data == resource.data');
  expect(block).toContain('allow delete: if false');
});

test('Jarvis records personal sync collections as intentionally unread', () => {
  expect(jarvisContractSource).toContain("personal_sync_segments: 'intentionally_unread_personal_payload'");
  expect(jarvisContractSource).toContain("personal_sync_checkpoints: 'intentionally_unread_personal_payload'");
});
```

- [ ] **Step 2: Run and prove failure**

Run:

```powershell
npx jest --runInBand --runTestsByPath `
  tests/firestore_rules_security.test.ts `
  functions/src/jarvis/jarvis_data_contract_guard.test.ts
```

Expected: FAIL because the new collection matches are absent.

- [ ] **Step 3: Add fail-closed Rules**

Add nested matches below `match /users/{userId}`:

```text
match /personal_sync_segments/{segmentId} {
  allow read: if userDocOwnerMatchesAuth(userId);
  allow create: if userDocOwnerMatchesAuth(userId)
    && authLinkMapsToUser(userId)
    && accountDeletionNotPending(userId)
    && request.resource.data.schemaVersion == 'personal-sync-segment.v1'
    && request.resource.data.stableUid == userId
    && request.resource.data.payloadCanonical is string
    && request.resource.data.payloadCanonical.size() <= 65536
    && request.resource.data.operationCount is int
    && request.resource.data.operationCount > 0
    && request.resource.data.operationCount <= 50
    && request.resource.data.fingerprint.matches('^[a-f0-9]{64}$');
  allow update: if userDocOwnerMatchesAuth(userId)
    && request.resource.data == resource.data;
  allow delete: if false;
}
```

Add equivalent immutable bounded checks for checkpoints. `sync_devices` permits owner create, exact-equality retry, and no delete; its device ID/account generation are immutable and it carries no mutable progress head. `personal_external_events` permits owner read and denies every client write.

- [ ] **Step 4: Add the composite index and Jarvis decision**

Add a `personal_sync_segments` collection-group index on `deviceId ASC, lastSequence ASC`. In the Jarvis guard’s collection contract table, record all four new collections and their intentional reader status; do not invent business metrics from opaque personal payloads.

- [ ] **Step 5: Verify and commit**

Run the command from Step 2.

Expected: PASS.

```powershell
git add firestore.rules firestore.indexes.json tests/firestore_rules_security.test.ts functions/src/jarvis/jarvis_data_contract_guard.test.ts
git commit -m "feat: secure immutable personal sync streams"
```

### Task 4: Server-sequenced external event feed

**Files:**
- Create: `functions/src/personal_external_events.ts`
- Create: `functions/src/personal_external_events.test.ts`
- Modify: `firestore.rules`
- Modify: `tests/firestore_rules_security.test.ts`
- Modify: `functions/src/jarvis/jarvis_data_contract_guard.test.ts`

- [ ] **Step 1: Write failing sequence/idempotency tests**

```ts
test('external events receive a monotonic per-account server sequence', async () => {
  const h = externalEventHarness();
  const first = await h.append(event('purchase-1'));
  const second = await h.append(event('refund-1'));
  expect([first.serverSequence, second.serverSequence]).toEqual([1, 2]);
});

test('same event ID and fingerprint replays; changed bytes conflict', async () => {
  const h = externalEventHarness();
  await h.append(event('admin-grant-1'));
  await expect(h.append(event('admin-grant-1'))).resolves.toMatchObject({ duplicate: true });
  await expect(h.append({ ...event('admin-grant-1'), payload: { amount: 999 } }))
    .rejects.toThrow('personal_external_event_id_conflict');
});
```

- [ ] **Step 2: Run and prove failure**

Run: `npx jest --runInBand --runTestsByPath functions/src/personal_external_events.test.ts`

Expected: FAIL with missing append helper.

- [ ] **Step 3: Implement one transactional server helper**

```ts
export type PersonalExternalEvent = Readonly<{
  schemaVersion: 'personal-external-event.v1';
  stableUid: string;
  eventId: string;
  serverSequence: number;
  domain: string;
  kind: string;
  payload: unknown;
  createdAtMs: number;
  fingerprint: string;
}>;

export async function appendPersonalExternalEvent(
  tx: FirebaseFirestore.Transaction,
  userRef: FirebaseFirestore.DocumentReference,
  input: Omit<PersonalExternalEvent, 'serverSequence' | 'fingerprint'>,
): Promise<Readonly<{ event: PersonalExternalEvent; duplicate: boolean }>>;
```

The helper reads `personal_sync_server_state/external_head` and the target event, returns an exact duplicate, rejects changed bytes, otherwise increments `latestSequence` and creates the event in the same transaction. Only external confirmed operations may call it; ordinary personal progress never does.

- [ ] **Step 4: Close the counter and event feed in Rules/Jarvis**

Owner clients may read `personal_external_events` ordered by `serverSequence`; all client writes/deletes are denied. `personal_sync_server_state` denies all client access. Record both collections in the Jarvis contract table.

- [ ] **Step 5: Verify and commit**

Run:

```powershell
npx jest --runInBand --runTestsByPath `
  functions/src/personal_external_events.test.ts `
  tests/firestore_rules_security.test.ts `
  functions/src/jarvis/jarvis_data_contract_guard.test.ts
```

Expected: PASS.

```powershell
git add functions/src/personal_external_events.ts functions/src/personal_external_events.test.ts firestore.rules tests/firestore_rules_security.test.ts functions/src/jarvis/jarvis_data_contract_guard.test.ts
git commit -m "feat: append external facts monotonically"
```

### Task 5: Durable upload/pull engine

**Files:**
- Create: `modules/phone-state/sync_engine.ts`
- Create: `tests/phone_state_sync_engine.test.ts`

- [ ] **Step 1: Write failing crash-window tests**

```ts
test('server accept followed by local crash retries as exact duplicate', async () => {
  const h = await createSyncHarness({ failAfterCloudCreate: true });
  await expect(h.engine.flushOnce()).rejects.toThrow('failpoint:after_cloud_create');
  h.clearFailpoint();
  await expect(h.engine.flushOnce()).resolves.toMatchObject({ uploaded: 1, duplicates: 1 });
  expect(await h.operationCount()).toBe(1);
});

test('cursor advances only after remote segment transaction commits', async () => {
  const h = await createSyncHarness({ failBeforeCursorAdvance: true });
  await expect(h.engine.pullOnce()).rejects.toThrow('failpoint:before_cursor_advance');
  expect(await h.cursor('remote-a')).toBe(0);
  h.clearFailpoint();
  await h.engine.pullOnce();
  expect(await h.cursor('remote-a')).toBe(20);
});

test('external cursor reads only unseen server sequence', async () => {
  const h = await createSyncHarness({ externalCursor: 40, externalEvents: [eventAt(41), eventAt(42)] });
  await h.engine.pullOnce();
  expect(await h.externalCursor()).toBe(42);
  expect(await h.externalEventCount()).toBe(2);
});
```

- [ ] **Step 2: Run and prove failure**

Run: `npx jest --runInBand --runTestsByPath tests/phone_state_sync_engine.test.ts`

Expected: FAIL with missing sync engine.

- [ ] **Step 3: Implement upload and incremental pull**

```ts
export type SyncPassResult = Readonly<{
  uploaded: number;
  duplicates: number;
  downloaded: number;
  quarantined: number;
  hasMore: boolean;
}>;

export interface PhoneStateSyncEngine {
  flushOnce(): Promise<SyncPassResult>;
  pullOnce(): Promise<SyncPassResult>;
  syncOnce(): Promise<SyncPassResult>;
}
```

Upload ensures the immutable device manifest once, selects the oldest sealed non-acknowledged segment, creates it, and marks it acknowledged in SQLite. Pull lists device manifests, queries each stream only for `lastSequence > remoteCursor`, validates stable UID/generation/fingerprint/contiguity, and applies operations plus cursor in one SQLite transaction. A second incremental query reads only `personal_external_events.serverSequence > externalCursor` and commits external facts plus cursor atomically. Unknown schema/domain is quarantined and still records the receipt without changing a projection.

- [ ] **Step 4: Verify and commit**

Run: `npx jest --runInBand --runTestsByPath tests/phone_state_sync_engine.test.ts`

Expected: PASS for duplicate, conflict, process-death, stale-generation, malformed-segment, and bounded-continuation cases.

```powershell
git add modules/phone-state/sync_engine.ts tests/phone_state_sync_engine.test.ts
git commit -m "feat: sync personal streams incrementally"
```

### Task 6: Persisted retry coordinator and lifecycle triggers

**Files:**
- Create: `modules/phone-state/sync_coordinator.ts`
- Create: `app/phone_state_sync_lifecycle.ts`
- Create: `tests/phone_state_sync_coordinator.test.ts`
- Modify: `app/_layout.tsx`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Add NetInfo through the Expo-compatible installer**

Run: `npx expo install @react-native-community/netinfo`

Expected: dependency version resolves to `11.4.1`.

- [ ] **Step 2: Write failing scheduler tests**

```ts
test.each(['sealed_segment', 'connectivity_online', 'foreground', 'hydrated', 'background'])
  ('%s schedules one coalesced pass', async (reason) => {
    const h = createCoordinatorHarness();
    h.trigger(reason);
    h.trigger(reason);
    await h.drain();
    expect(h.syncCalls).toBe(1);
  });

test('process restart restores retry deadline', async () => {
  const h = createCoordinatorHarness({ fail: 'offline', now: 1_000 });
  await h.triggerAndDrain('sealed_segment');
  const persisted = h.retryRow();
  expect(persisted).toMatchObject({ attempts: 1, nextRetryAt: expect.any(Number) });
  expect(createCoordinatorHarness({ persisted, now: 1_001 }).scheduledAt()).toBe(persisted.nextRetryAt);
});
```

- [ ] **Step 3: Run and prove failure**

Run: `npx jest --runInBand --runTestsByPath tests/phone_state_sync_coordinator.test.ts`

Expected: FAIL with missing coordinator.

- [ ] **Step 4: Implement the coordinator**

Persist `{ attempts, nextRetryAt, leaseOwner, leaseExpiresAt, lastErrorClass }` in `sync_retry`. Backoff bases are exactly `[5_000, 30_000, 120_000, 600_000, 3_600_000]`; apply deterministic-testable jitter in production and inject `random()` in tests. A successful empty/full pass clears retry state. A failed pass preserves dirty segments.

`app/phone_state_sync_lifecycle.ts` installs one NetInfo subscription and one AppState subscription after hydration. Background calls `trigger('background')` immediately; it must not wait 1.8 seconds. Cleanup cancels timers/subscriptions and releases no durable work.

- [ ] **Step 5: Wire the dormant lifecycle**

In `app/_layout.tsx`, call `ensurePhoneStateSyncLifecycleInstalled()` only after stable identity/account generation and `PhoneStateStore` hydration succeed. The function itself checks the rollout capability flag; default is false, so current production behavior is unchanged.

- [ ] **Step 6: Verify and commit**

Run: `npx jest --runInBand --runTestsByPath tests/phone_state_sync_coordinator.test.ts`

Expected: PASS with zero leaked timers.

```powershell
git add package.json package-lock.json modules/phone-state/sync_coordinator.ts app/phone_state_sync_lifecycle.ts app/_layout.tsx tests/phone_state_sync_coordinator.test.ts
git commit -m "feat: retry personal sync durably"
```

### Task 7: Checkpoint bootstrap and tail replay

**Files:**
- Create: `modules/phone-state/checkpoints.ts`
- Create: `tests/phone_state_checkpoints.test.ts`

- [ ] **Step 1: Write failing equivalence tests**

```ts
test('checkpoint plus tail equals full operation replay', async () => {
  const operations = mixedDomainOperations(500);
  const checkpoint = await buildCheckpoint(operations.slice(0, 400));
  expect(await restoreFromCheckpoint(checkpoint, operations.slice(400)))
    .toEqual(await fullReplay(operations));
});

test('invalid vector or fingerprint rejects the checkpoint and keeps local state', async () => {
  const local = await populatedLocalState();
  await expect(local.applyCheckpoint(corruptCheckpoint())).rejects.toThrow('phone_state_checkpoint_invalid');
  expect(await local.snapshot()).toEqual(await local.beforeSnapshot());
});
```

- [ ] **Step 2: Run and prove failure**

Run: `npx jest --runInBand --runTestsByPath tests/phone_state_checkpoints.test.ts`

Expected: FAIL with missing checkpoint module.

- [ ] **Step 3: Implement the checkpoint contract**

```ts
export type PersonalSyncCheckpoint = Readonly<{
  schemaVersion: 'personal-sync-checkpoint.v1';
  stableUid: string;
  accountGeneration: number;
  checkpointId: string;
  reducerVersions: Readonly<Record<string, number>>;
  vector: Readonly<Record<string, number>>;
  projectionsCanonical: string;
  byteSize: number;
  createdAtMs: number;
  fingerprint: string;
}>;
```

Create after either 2,000 acknowledged operations or 512 KiB of acknowledged segment payload since the previous checkpoint. Bound checkpoint payload to 512 KiB. Restore validates account, reducer versions, canonical fingerprint, and non-negative vector, then commits projections/vector/checkpoint receipt atomically before requesting tails.

- [ ] **Step 4: Verify and commit**

Run: `npx jest --runInBand --runTestsByPath tests/phone_state_checkpoints.test.ts`

Expected: PASS for full replay equivalence and corrupt/newer-schema rejection.

```powershell
git add modules/phone-state/checkpoints.ts tests/phone_state_checkpoints.test.ts
git commit -m "feat: bootstrap personal state from checkpoints"
```

### Task 8: Deterministic Firebase cost trace

**Files:**
- Create: `modules/phone-state/testing/sync_cost_trace.ts`
- Create: `tests/phone_state_cost_contract.test.ts`

- [ ] **Step 1: Write the cost budget tests**

```ts
test('twenty-answer lesson costs one segment create and no callable', async () => {
  const trace = await traceLessonSync({ answers: 20 });
  expect(trace).toMatchObject({ segmentCreates: 1, progressCallables: 0, transactions: 0 });
});

test('empty foreground is network quiet for personal progress', async () => {
  const trace = await traceForegroundSync({ localDirty: false, remoteHeadsUnchanged: true });
  expect(trace.progressWrites).toBe(0);
  expect(trace.segmentReads).toBe(0);
});

test('second sync reads only unseen tail', async () => {
  const h = await synchronizedDevices({ initialSegments: 100 });
  await h.sync();
  h.appendRemoteSegments(2);
  expect((await h.sync()).segmentReads).toBe(2);
});
```

- [ ] **Step 2: Run and prove the first implementation against the budget**

Run: `npx jest --runInBand --runTestsByPath tests/phone_state_cost_contract.test.ts`

Expected: PASS only after repository/coordinator spies report exact bounded calls.

- [ ] **Step 3: Run the complete Plan 2 gate and commit**

Run:

```powershell
npx jest --runInBand --runTestsByPath `
  tests/phone_state_segments.test.ts `
  tests/phone_state_firestore_repository.test.ts `
  tests/phone_state_sync_engine.test.ts `
  tests/phone_state_sync_coordinator.test.ts `
  tests/phone_state_checkpoints.test.ts `
  tests/phone_state_cost_contract.test.ts `
  tests/firestore_rules_security.test.ts `
  functions/src/jarvis/jarvis_data_contract_guard.test.ts
```

Expected: all suites PASS with no open timer.

```powershell
git add modules/phone-state/testing/sync_cost_trace.ts tests/phone_state_cost_contract.test.ts
git commit -m "test: enforce personal sync cost budgets"
```

## Plan 2 completion gate

- A real internal iOS and Android build exchanges operations between two test accounts/devices.
- Second sync reads only unseen tails.
- Rules prevent mutation/deletion and client-forged external events.
- Jarvis contract names every new collection.
- Production rollout flag remains false; no current progress callsite uses the transport.
