# PhoneStateStore Local Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an encrypted, account-scoped, transactional local journal whose projections survive crashes and converge under deterministic replay.

**Architecture:** `modules/phone-state` owns contracts, SQLCipher bootstrap, schema, reducers, and the atomic commit API. The module is dormant behind a local capability gate; existing AsyncStorage and cloud paths remain unchanged throughout this plan.

**Tech Stack:** Expo SDK 54, `expo-sqlite ~16.0.10` with SQLCipher, SecureStore, Expo Crypto, TypeScript, Jest

---

## File map

- Create `modules/phone-state/contracts.ts`: immutable operation and projection contracts.
- Create `modules/phone-state/canonical.ts`: canonical JSON, byte count, fingerprint validation.
- Create `modules/phone-state/account_secret.ts`: per-account SQLCipher key lifecycle.
- Create `modules/phone-state/database.ts`: native SQLCipher database opener and adapter.
- Create `modules/phone-state/schema.ts`: versioned DDL only.
- Create `modules/phone-state/reducer_registry.ts`: domain reducer registration and replay.
- Create `modules/phone-state/store.ts`: one transaction for operation + projection + outbox.
- Create `modules/phone-state/reducers/*.ts`: counter, set/max, field-register, entity/tombstone, streak, economy reducers.
- Create `modules/phone-state/testing/memory_database.ts`: deterministic test adapter with failpoints.
- Modify `package.json`, `package-lock.json`, `app.config.js`: install and configure SQLCipher.
- Modify `tests/__mocks__/expo-secure-store.js`, `tests/__mocks__/expo-crypto.js`: deterministic key/fingerprint tests.

### Task 1: Native SQLCipher capability gate

**Files:**
- Create: `tests/phone_state_native_config_contract.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `app.config.js`

- [ ] **Step 1: Write the failing native-config contract**

```ts
// tests/phone_state_native_config_contract.test.ts
const buildConfig = require('../app.config.js');
const pkg = require('../package.json');

test('PhoneStateStore ships expo-sqlite with SQLCipher enabled', () => {
  expect(pkg.dependencies['expo-sqlite']).toBe('~16.0.10');
  const config = buildConfig({ config: {} });
  expect(config.plugins).toContainEqual([
    'expo-sqlite',
    { useSQLCipher: true, enableFTS: false },
  ]);
});

test('Android backup whitelist excludes encrypted PhoneState databases', () => {
  expect(read('android/app/src/main/res/xml/backup_rules.xml')).toContain('path="RKStorage"');
  expect(read('android/app/src/main/res/xml/backup_rules.xml')).not.toContain('phone-state');
  expect(read('android/app/src/main/res/xml/data_extraction_rules.xml')).not.toContain('phone-state');
});
```

- [ ] **Step 2: Run the test and prove it fails**

Run: `npx jest --runInBand --runTestsByPath tests/phone_state_native_config_contract.test.ts`

Expected: FAIL because `expo-sqlite` and its plugin are absent.

- [ ] **Step 3: Install the SDK-pinned package**

Run: `npx expo install expo-sqlite`

Expected: `package.json` contains `"expo-sqlite": "~16.0.10"` and the lockfile changes only for that dependency graph.

- [ ] **Step 4: Add the SQLCipher plugin exactly once**

```js
// app.config.js, next to the existing speech-recognition plugin insertion
const phoneStateSqlitePlugin = [
  'expo-sqlite',
  { useSQLCipher: true, enableFTS: false },
];

if (!expoConfig.plugins.some((plugin) => (
  Array.isArray(plugin) ? plugin[0] === 'expo-sqlite' : plugin === 'expo-sqlite'
))) {
  expoConfig.plugins.push(phoneStateSqlitePlugin);
}
```

- [ ] **Step 5: Verify and commit**

Run: `npx jest --runInBand --runTestsByPath tests/phone_state_native_config_contract.test.ts`

Expected: PASS.

```powershell
git add package.json package-lock.json app.config.js tests/phone_state_native_config_contract.test.ts
git commit -m "build: enable encrypted phone state database"
```

### Task 2: Immutable operation contracts and canonical fingerprints

**Files:**
- Create: `modules/phone-state/contracts.ts`
- Create: `modules/phone-state/canonical.ts`
- Create: `tests/phone_state_contracts.test.ts`

- [ ] **Step 1: Write failing contract tests**

```ts
import {
  canonicalJson,
  operationFingerprint,
  utf8ByteLength,
} from '../modules/phone-state/canonical';

test('canonical form ignores object insertion order', async () => {
  expect(canonicalJson({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
  await expect(operationFingerprint({ b: 2, a: 1 }))
    .resolves.toBe(await operationFingerprint({ a: 1, b: 2 }));
});

test('byte limit counts UTF-8 rather than JS characters', () => {
  expect(utf8ByteLength('жемчуг')).toBe(12);
});
```

- [ ] **Step 2: Run the tests and prove they fail**

Run: `npx jest --runInBand --runTestsByPath tests/phone_state_contracts.test.ts`

Expected: FAIL with missing module.

- [ ] **Step 3: Add the exact public contracts**

```ts
// modules/phone-state/contracts.ts
export type HybridClock = Readonly<{ counter: number; deviceId: string }>;

export type PersonalOperation = Readonly<{
  schemaVersion: 1;
  operationId: string;
  stableUid: string;
  accountGeneration: number;
  deviceId: string;
  deviceSequence: number;
  hybridClock: HybridClock;
  domain: string;
  kind: string;
  entityId: string | null;
  payload: unknown;
  exactResult: unknown;
  createdAtMs: number;
  fingerprint: string;
}>;

export type PendingPersonalOperation = Omit<
  PersonalOperation,
  'operationId' | 'deviceSequence' | 'hybridClock' | 'fingerprint'
>;

export type ProjectionEnvelope = Readonly<{
  schemaVersion: 1;
  domain: string;
  reducerVersion: number;
  state: unknown;
  throughOperationCount: number;
}>;
```

- [ ] **Step 4: Implement canonical serialization with explicit rejection**

`canonicalJson` must sort object keys recursively and reject `undefined`, functions, symbols, bigint, non-finite numbers, cyclic objects, and non-plain prototypes. `operationFingerprint` must call `Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, canonicalJson(value))`. Do not silently stringify unsupported values.

```ts
export const utf8ByteLength = (value: string): number =>
  new TextEncoder().encode(value).length;

export const operationFingerprint = (value: unknown): Promise<string> =>
  Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    canonicalJson(value),
  );
```

- [ ] **Step 5: Verify and commit**

Run: `npx jest --runInBand --runTestsByPath tests/phone_state_contracts.test.ts`

Expected: PASS.

```powershell
git add modules/phone-state/contracts.ts modules/phone-state/canonical.ts tests/phone_state_contracts.test.ts
git commit -m "feat: define immutable phone state operations"
```

### Task 3: Account key lifecycle and SQLCipher opener

**Files:**
- Create: `modules/phone-state/account_secret.ts`
- Create: `modules/phone-state/database.ts`
- Create: `tests/phone_state_database_security.test.ts`
- Modify: `tests/__mocks__/expo-secure-store.js`
- Modify: `tests/__mocks__/expo-crypto.js`

- [ ] **Step 1: Write failing security tests**

```ts
test('database name and key are account scoped and never contain stableUid', async () => {
  const a = await materializePhoneStateCredentials({ stableUid: 'account-A', accountGeneration: 3 });
  const b = await materializePhoneStateCredentials({ stableUid: 'account-B', accountGeneration: 3 });
  expect(a.databaseName).not.toContain('account-A');
  expect(a.databaseName).not.toBe(b.databaseName);
  expect(a.keyHex).toMatch(/^[a-f0-9]{64}$/);
  expect(a.keyHex).not.toBe(b.keyHex);
});

test('Expo Go fails closed instead of opening plaintext SQLite', async () => {
  await expect(openPhoneStateDatabase(scope, { isExpoGo: true }))
    .rejects.toThrow('phone_state_native_unavailable');
});
```

- [ ] **Step 2: Run the test and prove it fails**

Run: `npx jest --runInBand --runTestsByPath tests/phone_state_database_security.test.ts`

Expected: FAIL with missing credential/database modules.

- [ ] **Step 3: Implement per-account credentials**

Use SecureStore service `phraseman.phone_state.sqlcipher.v1`, key name `phone_state_key_v1:<accountHash>:<generation>`, `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`, and 32 random bytes from `Crypto.getRandomBytesAsync(32)`. There is no AsyncStorage fallback for the encryption key.

```ts
export type PhoneStateScope = Readonly<{
  stableUid: string;
  // Persistent account lineage; never the transient runtime race counter.
  accountGeneration: number;
}>;

export async function materializePhoneStateCredentials(scope: PhoneStateScope) {
  const accountHash = await digestStableUid(scope.stableUid);
  const secureKey = `phone_state_key_v1:${accountHash}:${scope.accountGeneration}`;
  const stored = await SecureStore.getItemAsync(secureKey, secureOptions());
  const keyHex = stored ?? bytesToHex(await Crypto.getRandomBytesAsync(32));
  if (!stored) await SecureStore.setItemAsync(secureKey, keyHex, secureOptions());
  return {
    databaseName: `phone-state-v1-${accountHash.slice(0, 32)}-${scope.accountGeneration}.db`,
    keyHex,
    secureKey,
  } as const;
}
```

In the same file define `digestStableUid` as SHA-256 with explicit hex encoding, `bytesToHex` as two lowercase hex characters per byte, and `secureOptions` as `{ keychainService: 'phraseman.phone_state.sqlcipher.v1', keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY }`. Validate stored keys before returning them; malformed SecureStore data throws `phone_state_key_invalid` and never opens plaintext storage.

- [ ] **Step 4: Implement the SQLCipher opener**

Open with `SQLite.openDatabaseAsync`, reject any key not matching 64 lowercase hex characters, then issue the key before all other reads. Use `PRAGMA cipher_integrity_check`, `journal_mode = WAL`, `foreign_keys = ON`, and `busy_timeout = 5000`.

```ts
const keyPragma = `PRAGMA key = "x'${credentials.keyHex}'"`;
await db.execAsync(keyPragma);
const integrity = await db.getFirstAsync<{ cipher_integrity_check: string }>(
  'PRAGMA cipher_integrity_check',
);
if (integrity?.cipher_integrity_check !== 'ok') {
  await db.closeAsync();
  throw new Error('phone_state_cipher_integrity_failed');
}
await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
```

- [ ] **Step 5: Verify, run a native smoke build, and commit**

Run unit test: `npx jest --runInBand --runTestsByPath tests/phone_state_database_security.test.ts`

Run config gate: `npx expo config --type prebuild`

Expected: tests PASS and resolved config contains `expo-sqlite` with SQLCipher.

Before the next task, build one internal Android and one internal iOS binary and run a smoke screen that creates, closes, and reopens an encrypted database. Expo Go is not an accepted verification environment.

```powershell
git add modules/phone-state/account_secret.ts modules/phone-state/database.ts tests/phone_state_database_security.test.ts tests/__mocks__/expo-secure-store.js tests/__mocks__/expo-crypto.js
git commit -m "feat: open account scoped SQLCipher storage"
```

### Task 4: Versioned schema and migrations

**Files:**
- Create: `modules/phone-state/schema.ts`
- Create: `tests/phone_state_schema.test.ts`

- [ ] **Step 1: Write a failing schema test**

```ts
test('schema v1 creates every durable boundary and required index', async () => {
  const db = createMemoryPhoneStateDatabase();
  await migratePhoneStateSchema(db);
  expect(db.tableNames()).toEqual(expect.arrayContaining([
    'operations', 'external_events', 'projections', 'outbox_segments',
    'remote_cursors', 'checkpoints', 'sync_retry', 'quarantine',
    'migrations', 'account_keys', 'device_state',
  ]));
  expect(db.userVersion()).toBe(1);
});
```

- [ ] **Step 2: Run and prove failure**

Run: `npx jest --runInBand --runTestsByPath tests/phone_state_schema.test.ts`

Expected: FAIL with missing schema.

- [ ] **Step 3: Add schema v1**

Create `PHONE_STATE_SCHEMA_V1` with primary keys and constraints:

```sql
CREATE TABLE operations (
  operation_id TEXT PRIMARY KEY NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  device_id TEXT NOT NULL,
  device_sequence INTEGER NOT NULL CHECK(device_sequence > 0),
  domain TEXT NOT NULL,
  kind TEXT NOT NULL,
  entity_id TEXT,
  canonical_operation TEXT NOT NULL,
  fingerprint TEXT NOT NULL CHECK(length(fingerprint) = 64),
  created_at_ms INTEGER NOT NULL,
  UNIQUE(device_id, device_sequence)
);
CREATE INDEX operations_domain_sequence ON operations(domain, device_sequence);
CREATE TABLE projections (
  domain TEXT PRIMARY KEY NOT NULL,
  reducer_version INTEGER NOT NULL,
  canonical_state TEXT NOT NULL,
  through_operation_count INTEGER NOT NULL
);
CREATE TABLE device_state (
  singleton INTEGER PRIMARY KEY CHECK(singleton = 1),
  device_id TEXT NOT NULL,
  next_sequence INTEGER NOT NULL,
  hybrid_counter INTEGER NOT NULL
);
```

The same migration string must create the remaining tables listed by the test. `migratePhoneStateSchema` reads `PRAGMA user_version`, applies each version in an exclusive transaction, and refuses a database newer than the client with `phone_state_schema_too_new`.

- [ ] **Step 4: Verify and commit**

Run: `npx jest --runInBand --runTestsByPath tests/phone_state_schema.test.ts`

Expected: PASS from empty DB, repeated migration, and schema-too-new cases.

```powershell
git add modules/phone-state/schema.ts tests/phone_state_schema.test.ts
git commit -m "feat: add phone state schema v1"
```

### Task 5: Reducer registry and deterministic replay

**Files:**
- Create: `modules/phone-state/reducer_registry.ts`
- Create: `tests/phone_state_reducer_registry.test.ts`

- [ ] **Step 1: Write failing registry tests**

```ts
test('unknown domains quarantine instead of mutating a projection', () => {
  const registry = createReducerRegistry([]);
  expect(registry.reduce(undefined, operation({ domain: 'future' })))
    .toEqual({ kind: 'quarantine', reason: 'unknown_domain' });
});

test('replay and incremental apply are byte-identical', () => {
  const registry = createReducerRegistry([counterReducer]);
  const ops = [xp('a', 3), xp('b', 5)];
  expect(registry.replay('xp', ops)).toEqual(
    registry.reduce(registry.reduce(undefined, ops[0]).projection, ops[1]),
  );
});
```

- [ ] **Step 2: Run and prove failure**

Run: `npx jest --runInBand --runTestsByPath tests/phone_state_reducer_registry.test.ts`

Expected: FAIL with missing registry.

- [ ] **Step 3: Implement the registry contract**

```ts
export type DomainReducer<State> = Readonly<{
  domain: string;
  version: number;
  initial: () => State;
  apply: (state: State, operation: PersonalOperation) => State;
  validate: (state: unknown) => state is State;
}>;

export type ReduceResult =
  | Readonly<{ kind: 'applied'; projection: ProjectionEnvelope }>
  | Readonly<{ kind: 'quarantine'; reason: 'unknown_domain' | 'invalid_operation' }>;
```

The registry freezes reducer registration, rejects duplicate domains, validates existing projection versions, and returns a quarantine result rather than throwing for remote unknown schema/domain.

- [ ] **Step 4: Verify and commit**

Run: `npx jest --runInBand --runTestsByPath tests/phone_state_reducer_registry.test.ts`

Expected: PASS.

```powershell
git add modules/phone-state/reducer_registry.ts tests/phone_state_reducer_registry.test.ts
git commit -m "feat: add deterministic phone state reducers"
```

### Task 6: Atomic commit and crash recovery

**Files:**
- Create: `modules/phone-state/store.ts`
- Create: `modules/phone-state/testing/memory_database.ts`
- Create: `tests/phone_state_store_transaction.test.ts`

- [ ] **Step 1: Write the failing transaction/fault tests**

```ts
for (const failpoint of ['after_sequence', 'after_operation', 'after_projection', 'after_outbox']) {
  test(`rolls back the whole commit at ${failpoint}`, async () => {
    const harness = await createPhoneStateHarness({ failpoint });
    await expect(harness.store.commit(xpGrant(10))).rejects.toThrow(`failpoint:${failpoint}`);
    expect(await harness.snapshot()).toEqual({ operations: [], projections: [], outbox: [] });
  });
}

test('same operation retry is idempotent and changed bytes conflict', async () => {
  const harness = await createPhoneStateHarness();
  const first = await harness.store.commit(xpGrant(10), { idempotencyKey: 'lesson:1:q:1' });
  const retry = await harness.store.commit(xpGrant(10), { idempotencyKey: 'lesson:1:q:1' });
  expect(retry).toEqual(first);
  await expect(harness.store.commit(xpGrant(20), { idempotencyKey: 'lesson:1:q:1' }))
    .rejects.toThrow('phone_state_operation_id_reused');
});
```

- [ ] **Step 2: Run and prove failure**

Run: `npx jest --runInBand --runTestsByPath tests/phone_state_store_transaction.test.ts`

Expected: FAIL with missing store/harness.

- [ ] **Step 3: Implement `PhoneStateStore.commit`**

Inside one `withExclusiveTransactionAsync` call: look up an existing `idempotency_key` before allocating sequence, return it only when the fingerprint matches, otherwise read/increment device sequence and hybrid counter, materialize `operationId`, fingerprint the canonical body, insert operation, reduce projection, insert quarantine or update projection, append the operation ID to the open outbox segment, and commit. Return only after transaction success.

```ts
export type CommitResult = Readonly<{
  operation: PersonalOperation;
  projection: ProjectionEnvelope;
  duplicate: boolean;
}>;

export interface PhoneStateStore {
  commit(
    operation: PendingPersonalOperation,
    options?: Readonly<{ idempotencyKey?: string }>,
  ): Promise<CommitResult>;
  readProjection(domain: string): Promise<ProjectionEnvelope | null>;
  replay(domain: string): Promise<ProjectionEnvelope>;
}
```

An idempotency key is namespaced by account generation and device ID; it is not used as raw SQL or a Firestore path.

- [ ] **Step 4: Verify and commit**

Run: `npx jest --runInBand --runTestsByPath tests/phone_state_store_transaction.test.ts`

Expected: every failpoint leaves zero partial rows; exact retry returns `duplicate: true`.

```powershell
git add modules/phone-state/store.ts modules/phone-state/testing/memory_database.ts tests/phone_state_store_transaction.test.ts
git commit -m "feat: commit phone state atomically"
```

### Task 7: Domain reducers and algebra gates

**Files:**
- Create: `modules/phone-state/reducers/counter.ts`
- Create: `modules/phone-state/reducers/sets.ts`
- Create: `modules/phone-state/reducers/register.ts`
- Create: `modules/phone-state/reducers/entities.ts`
- Create: `modules/phone-state/reducers/streak.ts`
- Create: `modules/phone-state/reducers/economy.ts`
- Create: `modules/phone-state/reducers/index.ts`
- Create: `tests/phone_state_reducer_algebra.test.ts`

- [ ] **Step 1: Write table-driven algebra tests**

```ts
test.each(domainFixtures)('$domain is idempotent, commutative and associative', ({ reducer, operations }) => {
  const once = replay(reducer, operations);
  expect(replay(reducer, [...operations, operations[0]])).toEqual(once);
  expect(replay(reducer, [...operations].reverse())).toEqual(once);
  const split = mergeProjected(
    replay(reducer, operations.slice(0, 1)),
    replay(reducer, operations.slice(1)),
  );
  expect(split).toEqual(once);
});

test('concurrent pearl spends preserve both grants and may project debt', () => {
  const state = replay(economyReducer, [opening(10), spend('a', 8), spend('b', 8)]);
  expect(state.balance).toBe(-6);
  expect(state.grants).toEqual(expect.arrayContaining(['grant:a', 'grant:b']));
  expect(canSpend(state, 1)).toBe(false);
});
```

- [ ] **Step 2: Run and prove failure**

Run: `npx jest --runInBand --runTestsByPath tests/phone_state_reducer_algebra.test.ts`

Expected: FAIL with missing reducers.

- [ ] **Step 3: Implement exact reducer semantics**

- Counter reducer: dedupe operation IDs, sum integer deltas.
- Set/max reducer: union IDs and take maximum finite observation.
- Register reducer: compare `(counter, deviceId)` per field, never global timestamp.
- Entity reducer: OR-set add/update plus tombstone whose field clock dominates older writes.
- Streak reducer: union normalized activity dates, derive count from a versioned timezone policy.
- Economy reducer: replay immutable composite deltas and grants; never reject remote debt and never revoke a grant.

Every reducer state contains only data required for projection plus a compact dedupe structure whose compaction is tied to checkpoint vector coverage.

- [ ] **Step 4: Verify the local-core gate and commit**

Run:

```powershell
npx jest --runInBand --runTestsByPath `
  tests/phone_state_contracts.test.ts `
  tests/phone_state_database_security.test.ts `
  tests/phone_state_schema.test.ts `
  tests/phone_state_reducer_registry.test.ts `
  tests/phone_state_store_transaction.test.ts `
  tests/phone_state_reducer_algebra.test.ts
```

Expected: all suites PASS and Jest exits naturally.

```powershell
git add modules/phone-state/reducers tests/phone_state_reducer_algebra.test.ts
git commit -m "feat: add convergent personal state reducers"
```

## Plan 1 completion gate

- SQLCipher works after a real iOS and Android process restart.
- Wrong/missing key cannot open the database and never falls back to plaintext.
- Every failpoint proves all-or-nothing commit.
- Reducer algebra holds for counters, sets/max, registers, tombstones, streak, and economy.
- No app screen or current cloud path reads from `PhoneStateStore` yet.
- Android Auto Backup continues to whitelist only SharedPreferences and `RKStorage`; encrypted PhoneState databases are rebuilt from cloud segments on a new device rather than restored without their device-bound keys.
- Release evidence records the existing exempt-encryption declaration decision for SQLCipher before store submission.
