import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  provisionOrReopenV2,
  type AccountNativeProvisionCandidate,
  type AccountNativeProvisionLease,
  type AccountNativeProvisionPorts,
  type AccountNativeProvisionResult,
} from '../modules/account-session-v2/native/account_native_provisioner';
import type { ScopeStorageConnection } from '../modules/account-session-v2/account_scope_store';
import type {
  AccountSqliteColumn,
  AccountSqliteParameterizedConnection,
  AccountSqliteRow,
  AccountSqliteScopeConnectionBundle,
} from '../modules/account-session-v2/native/account_sqlite_scope_connection';
import type {
  AccountSqliteLeaseBinding,
  AccountSqliteLeaseCommitOutcome,
} from '../modules/account-session-v2/native/account_sqlite_lease_binding';
import {
  planV2StorageArtifacts,
  validateAccountNativeStorageManifest,
  type AccountLineageObservation,
  type AccountNativeStorageManifest,
  type ProvisionDecision,
  type V2StorageIdentity,
  type V2StoragePlan,
} from '../modules/account-session-v2/native_storage_manifest';

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);
const EXISTING_KEY = '1'.repeat(64);
const GENERATED_KEY = '2'.repeat(64);

const SCOPE_SQL = Object.freeze({
  begin: 'BEGIN IMMEDIATE',
  rollback: 'ROLLBACK',
  createMetadata: 'CREATE TABLE account_scope_metadata_v1 (singleton INTEGER PRIMARY KEY CHECK (singleton = 1), schema_version INTEGER NOT NULL, manifest_version INTEGER NOT NULL, namespace TEXT NOT NULL, scope_key TEXT NOT NULL, identity_kind TEXT NOT NULL, identity_hash TEXT NOT NULL, persistent_lineage INTEGER, database_selector TEXT NOT NULL) STRICT',
  createRecords: 'CREATE TABLE account_scope_records_v1 (record_key TEXT PRIMARY KEY NOT NULL, value_json TEXT NOT NULL) STRICT, WITHOUT ROWID',
  insertMetadata: 'INSERT INTO account_scope_metadata_v1 (singleton, schema_version, manifest_version, namespace, scope_key, identity_kind, identity_hash, persistent_lineage, database_selector) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  listSchema: 'SELECT type, name, tbl_name, sql FROM sqlite_schema WHERE substr(name, 1, 7) <> ? ORDER BY type, name',
  readMetadata: 'SELECT singleton, schema_version, manifest_version, namespace, scope_key, identity_kind, identity_hash, persistent_lineage, database_selector FROM account_scope_metadata_v1 ORDER BY singleton',
  readRecord: 'SELECT record_key, value_json FROM account_scope_records_v1 WHERE record_key = ?',
  putRecord: 'INSERT INTO account_scope_records_v1 (record_key, value_json) VALUES (?, ?) ON CONFLICT(record_key) DO UPDATE SET value_json = excluded.value_json',
  deleteRecord: 'DELETE FROM account_scope_records_v1 WHERE record_key = ?',
});

type TestHandle = Readonly<{ label: string }>;
type KeyRead =
  | Readonly<{ kind: 'absent' | 'malformed' | 'unreadable' }>
  | Readonly<{ kind: 'stored'; value: string }>;
type MarkerRead = 'absent' | 'present' | 'unreadable';
type FamilyRead = 'absent' | 'present' | 'unreadable';

function manifest(): AccountNativeStorageManifest {
  return validateAccountNativeStorageManifest(JSON.parse(readFileSync(
    join(process.cwd(), 'config/account-native-storage-v2-manifest.json'),
    'utf8',
  )));
}

function accountIdentity(lineage = 7): V2StorageIdentity {
  return Object.freeze({
    kind: 'account' as const,
    scopeKey: 'account:user-7' as const,
    hash: HASH_A,
    persistentLineage: lineage,
  });
}

function guestIdentity(): V2StorageIdentity {
  return Object.freeze({
    kind: 'guest' as const,
    scopeKey: 'guest:install-7' as const,
    hash: HASH_B,
  });
}

function plan(identity: V2StorageIdentity): V2StoragePlan {
  return planV2StorageArtifacts(manifest(), identity);
}

function bytesFor(hex: string): Uint8Array {
  const bytes = new Uint8Array(32);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

type Deferred<T> = Readonly<{
  promise: Promise<T>;
  resolve(value: T): void;
  reject(reason: unknown): void;
}>;

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return Object.freeze({ promise, resolve, reject });
}

class FakeScopeSql implements AccountSqliteParameterizedConnection {
  readonly events: string[];
  schemaPresent = false;
  metadata: AccountSqliteRow | null = null;
  stagedSchemaPresent = false;
  stagedMetadata: AccountSqliteRow | null = null;
  schemaFailure: 'list' | 'create_records' | null = null;
  listGate: Promise<void> | null = null;
  listEntered: Deferred<void> | null = null;

  constructor(events: string[]) {
    this.events = events;
  }

  configureExisting(selected: V2StoragePlan): void {
    this.schemaPresent = true;
    this.metadata = this.metadataFor(selected);
  }

  private metadataFor(selected: V2StoragePlan): AccountSqliteRow {
    const selector = selected.artifacts.find((artifact) => artifact.id
      === `v2.${selected.identity.kind}.db.main`)?.selector;
    if (selector === undefined) throw new Error('missing fake main selector');
    return Object.freeze({
      singleton: 1,
      schema_version: 1,
      manifest_version: 1,
      namespace: 'account_native_storage_v2',
      scope_key: selected.scopeKey,
      identity_kind: selected.identity.kind,
      identity_hash: selected.identity.hash,
      persistent_lineage: selected.identity.kind === 'account'
        ? selected.identity.persistentLineage
        : null,
      database_selector: selector,
    });
  }

  async run(
    sql: string,
    parameters: readonly AccountSqliteColumn[],
  ): Promise<Readonly<{ changes: number }>> {
    if (sql === SCOPE_SQL.begin) {
      this.events.push('schema.begin');
      this.stagedSchemaPresent = this.schemaPresent;
      this.stagedMetadata = this.metadata;
    } else if (sql === SCOPE_SQL.createMetadata) {
      this.events.push('schema.create_metadata');
      this.stagedSchemaPresent = true;
    } else if (sql === SCOPE_SQL.createRecords) {
      this.events.push('schema.create_records');
      if (this.schemaFailure === 'create_records') throw new Error('schema-private');
      this.stagedSchemaPresent = true;
    } else if (sql === SCOPE_SQL.insertMetadata) {
      this.events.push('schema.insert_metadata');
      this.stagedMetadata = Object.freeze({
        singleton: parameters[0] as AccountSqliteColumn,
        schema_version: parameters[1] as AccountSqliteColumn,
        manifest_version: parameters[2] as AccountSqliteColumn,
        namespace: parameters[3] as AccountSqliteColumn,
        scope_key: parameters[4] as AccountSqliteColumn,
        identity_kind: parameters[5] as AccountSqliteColumn,
        identity_hash: parameters[6] as AccountSqliteColumn,
        persistent_lineage: parameters[7] as AccountSqliteColumn,
        database_selector: parameters[8] as AccountSqliteColumn,
      });
    } else if (sql === SCOPE_SQL.rollback) {
      this.events.push('schema.rollback');
      this.stagedSchemaPresent = this.schemaPresent;
      this.stagedMetadata = this.metadata;
    } else if (sql === SCOPE_SQL.putRecord || sql === SCOPE_SQL.deleteRecord) {
      this.events.push('schema.record_write');
    } else {
      throw new Error('unexpected fake SQL run');
    }
    return Object.freeze({ changes: 0 });
  }

  async getFirst(
    sql: string,
    _parameters: readonly AccountSqliteColumn[],
  ): Promise<AccountSqliteRow | null> {
    if (sql !== SCOPE_SQL.readRecord) throw new Error('unexpected fake SQL first');
    this.events.push('schema.record_read');
    return null;
  }

  async getAll(
    sql: string,
    parameters: readonly AccountSqliteColumn[],
  ): Promise<readonly AccountSqliteRow[]> {
    if (sql === SCOPE_SQL.listSchema) {
      this.events.push('schema.list');
      expect(parameters).toEqual(['sqlite_']);
      this.listEntered?.resolve(undefined);
      if (this.listGate !== null) await this.listGate;
      if (this.schemaFailure === 'list') throw new Error('schema-list-private');
      if (!this.schemaPresent) return Object.freeze([]);
      return Object.freeze([
        Object.freeze({
          type: 'table', name: 'account_scope_metadata_v1',
          tbl_name: 'account_scope_metadata_v1', sql: SCOPE_SQL.createMetadata,
        }),
        Object.freeze({
          type: 'table', name: 'account_scope_records_v1',
          tbl_name: 'account_scope_records_v1', sql: SCOPE_SQL.createRecords,
        }),
      ]);
    }
    if (sql === SCOPE_SQL.readMetadata) {
      this.events.push('schema.read_metadata');
      expect(parameters).toEqual([]);
      return this.metadata === null ? Object.freeze([]) : Object.freeze([this.metadata]);
    }
    throw new Error('unexpected fake SQL all');
  }

  commit(): void {
    this.events.push('schema.commit');
    this.schemaPresent = this.stagedSchemaPresent;
    this.metadata = this.stagedMetadata;
  }
}

class FakeCandidate implements AccountNativeProvisionCandidate<TestHandle> {
  readonly handle: TestHandle;
  readonly events: string[];
  readonly sql: FakeScopeSql;
  readonly scopeConnectionBundle: AccountSqliteScopeConnectionBundle;
  revokeCalls = 0;
  closeCalls = 0;
  revokeFailures = 0;
  closeFailures = 0;
  closeGate: Promise<void> | null = null;
  revokeResult: unknown = undefined;

  constructor(label: string, events: string[]) {
    this.handle = Object.freeze({ label });
    this.events = events;
    this.sql = new FakeScopeSql(events);
    const leaseBinding: AccountSqliteLeaseBinding = Object.freeze({
      revoke: (): undefined => this.revokeAs('scope.revoke'),
      commitIfActive: (): Promise<AccountSqliteLeaseCommitOutcome> => {
        if (this.revokeCalls > 0) return Promise.resolve('revoked');
        this.sql.commit();
        return Promise.resolve('committed');
      },
      close: (): Promise<void> => this.closeAs('scope.close'),
    });
    this.scopeConnectionBundle = Object.freeze({ sql: this.sql, leaseBinding });
  }

  revoke(): undefined {
    return this.revokeAs('candidate.revoke');
  }

  private revokeAs(event: string): undefined {
    this.events.push(event);
    this.revokeCalls += 1;
    if (this.revokeFailures > 0) {
      this.revokeFailures -= 1;
      throw new Error('native-revoke-secret');
    }
    return this.revokeResult as undefined;
  }

  async close(): Promise<void> {
    return this.closeAs('candidate.close');
  }

  private async closeAs(event: string): Promise<void> {
    this.events.push(event);
    this.closeCalls += 1;
    if (this.closeFailures > 0) {
      this.closeFailures -= 1;
      throw new Error('native-close-secret');
    }
    if (this.closeGate !== null) await this.closeGate;
  }
}

class SharedLeaseAuthority {
  private owner: FakePorts | null = null;
  private readonly waiters: Array<Readonly<{
    requester: FakePorts;
    gate: Deferred<void>;
  }>> = [];

  async acquire(requester: FakePorts): Promise<void> {
    if (this.owner === null) {
      this.owner = requester;
      return;
    }
    const gate = deferred<void>();
    this.waiters.push(Object.freeze({ requester, gate }));
    await gate.promise;
  }

  release(requester: FakePorts): void {
    expect(this.owner).toBe(requester);
    const next = this.waiters.shift() ?? null;
    this.owner = next?.requester ?? null;
    next?.gate.resolve(undefined);
  }
}

class FakePorts implements AccountNativeProvisionPorts<TestHandle> {
  readonly events: string[] = [];
  readonly lease: AccountNativeProvisionLease;
  readonly candidate: FakeCandidate;
  candidateResult: unknown;
  lineage: AccountLineageObservation = Object.freeze({
    kind: 'stored', value: 7, state: 'active',
  });
  key: unknown = Object.freeze({ kind: 'stored', value: EXISTING_KEY });
  marker: MarkerRead = 'absent';
  family: FamilyRead = 'present';
  randomBytes: unknown = bytesFor(GENERATED_KEY);
  proveResult = true;
  releaseFailures = 0;
  acquireFailure: unknown = null;
  readFailure: unknown = null;
  writeKeyFailure: unknown = null;
  openFailure: unknown = null;
  proofFailure: unknown = null;
  lineageWriteFailure: unknown = null;
  lineageReadbackFailure: unknown = null;
  writtenKey: string | null = null;
  keyReadbackValue: string | null = null;
  lineageReadbackValue: AccountLineageObservation | null = null;
  releaseCalls = 0;
  createCalls = 0;
  openCalls = 0;
  proofCalls = 0;
  lineageWrites = 0;
  keyWrites = 0;
  keyPolicy: unknown = null;
  readonly keyReadPolicies: unknown[] = [];
  acquireGate: Promise<void> | null = null;
  lineageReadbackGate: Promise<void> | null = null;
  lineageReadbackEntered: Deferred<void> | null = null;
  releaseGate: Promise<void> | null = null;
  releaseEntered: Deferred<void> | null = null;
  writeKeyPersistsBeforeFailure = false;
  mutateRandomBytesOnWrite = false;
  readonly authority: SharedLeaseAuthority | null;

  constructor(leaseId = 'lease-1', authority: SharedLeaseAuthority | null = null) {
    this.lease = Object.freeze({ leaseId });
    this.candidate = new FakeCandidate('candidate-handle', this.events);
    this.candidateResult = this.candidate;
    this.authority = authority;
  }

  private useLease(lease: AccountNativeProvisionLease, event: string): void {
    expect(lease).toBe(this.lease);
    this.events.push(event);
  }

  async acquireDurableProvisionLease(_plan: V2StoragePlan): Promise<AccountNativeProvisionLease> {
    this.events.push('lease.acquire');
    if (this.acquireGate !== null) await this.acquireGate;
    if (this.acquireFailure !== null) throw this.acquireFailure;
    if (this.authority !== null) await this.authority.acquire(this);
    return this.lease;
  }

  async readLineage(
    lease: AccountNativeProvisionLease,
    _selector: string,
  ): Promise<AccountLineageObservation> {
    this.useLease(lease, 'lineage.read');
    if (this.readFailure !== null) throw this.readFailure;
    if (this.lineageReadbackFailure !== null && this.lineageWrites > 0) {
      throw this.lineageReadbackFailure;
    }
    if (this.lineageWrites > 0) {
      this.lineageReadbackEntered?.resolve(undefined);
      if (this.lineageReadbackGate !== null) await this.lineageReadbackGate;
      if (this.lineageReadbackValue !== null) return this.lineageReadbackValue;
    }
    return this.lineage;
  }

  async readKey(
    lease: AccountNativeProvisionLease,
    _selector: string,
    policy: unknown,
  ): Promise<KeyRead> {
    this.useLease(lease, 'key.read');
    this.keyReadPolicies.push(policy);
    if (this.readFailure !== null) throw this.readFailure;
    if (this.writtenKey !== null) {
      return Object.freeze({
        kind: 'stored', value: this.keyReadbackValue ?? this.writtenKey,
      });
    }
    return this.key as KeyRead;
  }

  async readRetirementMarker(
    lease: AccountNativeProvisionLease,
    _selector: string,
  ): Promise<MarkerRead> {
    this.useLease(lease, 'retirement.read');
    if (this.readFailure !== null) throw this.readFailure;
    return this.marker;
  }

  async inspectDatabaseFamily(
    lease: AccountNativeProvisionLease,
    selectors: readonly string[],
  ): Promise<FamilyRead> {
    this.useLease(lease, 'family.read');
    expect(selectors).toHaveLength(4);
    expect(Object.isFrozen(selectors)).toBe(true);
    if (this.readFailure !== null) throw this.readFailure;
    return this.family;
  }

  async generateKeyBytes(): Promise<unknown> {
    this.events.push('key.generate');
    return this.randomBytes;
  }

  async writeKey(
    lease: AccountNativeProvisionLease,
    _selector: string,
    keyHex: string,
    policy: unknown,
  ): Promise<void> {
    this.useLease(lease, 'key.write');
    this.keyWrites += 1;
    this.keyPolicy = policy;
    if (this.mutateRandomBytesOnWrite && this.randomBytes instanceof Uint8Array) {
      this.randomBytes.fill(255);
    }
    if (this.writeKeyFailure !== null) {
      if (this.writeKeyPersistsBeforeFailure) this.writtenKey = keyHex;
      throw this.writeKeyFailure;
    }
    this.writtenKey = keyHex;
  }

  async createNew(
    lease: AccountNativeProvisionLease,
    _selectedPlan: V2StoragePlan,
    keyHex: string,
  ): Promise<AccountNativeProvisionCandidate<TestHandle>> {
    this.useLease(lease, 'db.create');
    expect(keyHex).toMatch(/^[0-9a-f]{64}$/);
    this.createCalls += 1;
    if (this.openFailure !== null) throw this.openFailure;
    if (this.candidateResult === this.candidate) {
      this.candidate.sql.schemaPresent = false;
      this.candidate.sql.metadata = null;
      this.candidate.sql.stagedSchemaPresent = false;
      this.candidate.sql.stagedMetadata = null;
    }
    return this.candidateResult as AccountNativeProvisionCandidate<TestHandle>;
  }

  async openExisting(
    lease: AccountNativeProvisionLease,
    selectedPlan: V2StoragePlan,
    keyHex: string,
  ): Promise<AccountNativeProvisionCandidate<TestHandle>> {
    this.useLease(lease, 'db.open');
    expect(keyHex).toBe(EXISTING_KEY);
    this.openCalls += 1;
    if (this.openFailure !== null) throw this.openFailure;
    if (this.candidateResult === this.candidate) {
      this.candidate.sql.configureExisting(selectedPlan);
    }
    return this.candidateResult as AccountNativeProvisionCandidate<TestHandle>;
  }

  async proveKeyedSameConnection(
    lease: AccountNativeProvisionLease,
    candidate: AccountNativeProvisionCandidate<TestHandle>,
    _plan: V2StoragePlan,
    _keyHex: string,
  ): Promise<boolean> {
    this.useLease(lease, 'db.prove');
    expect(candidate).toBe(this.candidateResult);
    this.proofCalls += 1;
    if (this.proofFailure !== null) throw this.proofFailure;
    return this.proveResult;
  }

  async writeActiveLineage(
    lease: AccountNativeProvisionLease,
    _selector: string,
    lineage: number,
  ): Promise<void> {
    this.useLease(lease, 'lineage.write');
    this.lineageWrites += 1;
    if (this.lineageWriteFailure !== null) throw this.lineageWriteFailure;
    this.lineage = Object.freeze({ kind: 'stored', value: lineage, state: 'active' });
  }

  async releaseDurableProvisionLease(lease: AccountNativeProvisionLease): Promise<void> {
    this.useLease(lease, 'lease.release');
    this.releaseCalls += 1;
    this.releaseEntered?.resolve(undefined);
    if (this.releaseGate !== null) await this.releaseGate;
    if (this.releaseFailures > 0) {
      this.releaseFailures -= 1;
      throw new Error('lease-release-secret');
    }
    this.authority?.release(this);
  }
}

function expectFlags(result: AccountNativeProvisionResult<ScopeStorageConnection>): void {
  expect(result.mayCertifyV2ScopeErase).toBe(false);
  expect(result.mayCertifyFullUserLocalWipe).toBe(false);
  expect(Object.isFrozen(result)).toBe(true);
}

async function run(
  ports: FakePorts,
  identity: V2StorageIdentity = accountIdentity(),
): Promise<AccountNativeProvisionResult<ScopeStorageConnection>> {
  const selectedPlan = plan(identity);
  return provisionOrReopenV2(manifest(), selectedPlan, ports);
}

describe('account native provisioner V2 coordinator', () => {
  test('provisions a new account in exact order and publishes only after lineage readback and lease release', async () => {
    const ports = new FakePorts();
    ports.lineage = Object.freeze({ kind: 'absent' });
    ports.key = Object.freeze({ kind: 'absent' });
    ports.family = 'absent';

    const result = await run(ports, accountIdentity(1));

    expect(result.outcome).toBe('opened');
    if (result.outcome !== 'opened') throw new Error('expected opened');
    expect(result.decision).toBe('provision_new');
    expect(result.handle).not.toBe(ports.candidate.handle);
    expect(typeof (result.handle as unknown as ScopeStorageConnection).readRecord).toBe('function');
    expect(result.requiresHydration).toBe(true);
    expect(ports.events).toEqual([
      'lease.acquire', 'lineage.read', 'key.read', 'retirement.read', 'family.read',
      'key.generate', 'key.write', 'key.read', 'db.create', 'db.prove',
      'schema.list', 'schema.begin', 'schema.create_metadata', 'schema.create_records',
      'schema.insert_metadata', 'schema.commit',
      'lineage.write', 'lineage.read', 'lease.release',
    ]);
    expect(ports.keyPolicy).toEqual({
      service: 'phraseman.account_native_storage.v2',
      requireAuthentication: false,
      accessibility: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
    });
    expect(ports.keyReadPolicies).toEqual([
      ports.keyPolicy, ports.keyPolicy,
    ]);
    expect(ports.writtenKey).toBe(GENERATED_KEY);
    expectFlags(result);
  });

  test('verifies an existing schema after keyed proof and publishes the admitted scope connection only after release', async () => {
    const ports = new FakePorts();

    const result = await run(ports);

    expect(result.outcome).toBe('opened');
    if (result.outcome !== 'opened') throw new Error('expected opened');
    expect(result.handle).not.toBe(ports.candidate.handle);
    expect(typeof (result.handle as unknown as ScopeStorageConnection).withGuardedTransaction)
      .toBe('function');
    expect(ports.events.indexOf('db.prove')).toBeLessThan(ports.events.indexOf('schema.list'));
    expect(ports.events.indexOf('schema.list'))
      .toBeLessThan(ports.events.indexOf('schema.read_metadata'));
    expect(ports.events.indexOf('schema.read_metadata'))
      .toBeLessThan(ports.events.indexOf('lease.release'));
    expect(ports.events).not.toContain('schema.begin');
  });

  test('does not publish or advance lineage while actual schema admission is pending', async () => {
    const ports = new FakePorts();
    ports.lineage = Object.freeze({ kind: 'absent' });
    ports.key = Object.freeze({ kind: 'absent' });
    ports.family = 'absent';
    const schemaGate = deferred<void>();
    const schemaEntered = deferred<void>();
    ports.candidate.sql.listGate = schemaGate.promise;
    ports.candidate.sql.listEntered = schemaEntered;
    let settled = false;

    const flight = run(ports, accountIdentity(1));
    void flight.then(() => { settled = true; });
    await schemaEntered.promise;

    expect(settled).toBe(false);
    expect(ports.events).not.toContain('lineage.write');
    expect(ports.events).not.toContain('lease.release');
    schemaGate.resolve(undefined);
    const result = await flight;
    expect(result.outcome).toBe('opened');
  });

  test('keeps raw candidate cleanup ownership when actual schema admission rejects', async () => {
    const ports = new FakePorts();
    ports.candidate.sql.schemaFailure = 'list';
    ports.candidate.closeFailures = 1;

    const result = await run(ports);

    expect(result.outcome).toBe('attention');
    if (result.outcome !== 'attention' || result.cleanup === null) {
      throw new Error('expected retained raw cleanup');
    }
    expect(result.code).toBe('account_native_provision_schema_failed');
    expect(ports.events).toContain('candidate.revoke');
    expect(ports.events).toContain('candidate.close');
    expect(ports.events).not.toContain('scope.revoke');
    expect(ports.releaseCalls).toBe(0);
    expect((await result.cleanup.retryCleanup()).outcome).toBe('cleaned');
    expect(ports.releaseCalls).toBe(1);
  });

  test('captures a data-only schema bundle without invoking accessors and retains raw cleanup', async () => {
    const ports = new FakePorts();
    let getterCalls = 0;
    let revokeCalls = 0;
    let closeCalls = 0;
    const candidate: Record<string, unknown> = {
      handle: Object.freeze({ label: 'raw-private' }),
      revoke: (): undefined => { revokeCalls += 1; return undefined; },
      close: (): Promise<void> => { closeCalls += 1; return Promise.resolve(); },
    };
    Object.defineProperty(candidate, 'scopeConnectionBundle', {
      configurable: false,
      enumerable: true,
      get: () => { getterCalls += 1; return ports.candidate.scopeConnectionBundle; },
    });
    ports.candidateResult = candidate;

    const result = await run(ports);

    expect(result.outcome).toBe('attention');
    if (result.outcome !== 'attention') throw new Error('expected attention');
    expect(result.code).toBe('account_native_provision_schema_failed');
    expect(getterCalls).toBe(0);
    expect(revokeCalls).toBe(1);
    expect(closeCalls).toBe(1);
    expect(ports.releaseCalls).toBe(1);
  });

  test('covers each allowed decision with key reuse, create/open selection and hydration semantics', async () => {
    const cases: readonly Readonly<{
      decision: ProvisionDecision;
      identity: V2StorageIdentity;
      configure(ports: FakePorts): void;
      create: number;
      open: number;
      lineageWrites: number;
      hydration: boolean;
    }>[] = [
      {
        decision: 'resume_first_provision', identity: accountIdentity(1), create: 1, open: 0,
        lineageWrites: 1, hydration: true,
        configure: (ports) => {
          ports.lineage = Object.freeze({ kind: 'absent' });
          ports.family = 'absent';
        },
      },
      {
        decision: 'reopen_existing', identity: accountIdentity(), create: 0, open: 1,
        lineageWrites: 0, hydration: false, configure: () => undefined,
      },
      {
        decision: 'provision_after_verified_erase', identity: accountIdentity(), create: 1, open: 0,
        lineageWrites: 1, hydration: true,
        configure: (ports) => {
          ports.lineage = Object.freeze({ kind: 'stored', value: 7, state: 'erased_empty' });
          ports.key = Object.freeze({ kind: 'absent' });
          ports.family = 'absent';
        },
      },
      {
        decision: 'resume_reprovision', identity: accountIdentity(), create: 1, open: 0,
        lineageWrites: 1, hydration: true,
        configure: (ports) => {
          ports.lineage = Object.freeze({ kind: 'stored', value: 7, state: 'erased_empty' });
          ports.family = 'absent';
        },
      },
      {
        decision: 'empty_recreated_same_identity', identity: accountIdentity(), create: 1, open: 0,
        lineageWrites: 0, hydration: true,
        configure: (ports) => { ports.family = 'absent'; },
      },
      {
        decision: 'reopen_existing', identity: guestIdentity(), create: 0, open: 1,
        lineageWrites: 0, hydration: false, configure: () => undefined,
      },
      {
        decision: 'provision_new', identity: guestIdentity(), create: 1, open: 0,
        lineageWrites: 0, hydration: true,
        configure: (ports) => {
          ports.key = Object.freeze({ kind: 'absent' });
          ports.family = 'absent';
        },
      },
      {
        decision: 'empty_recreated_same_identity', identity: guestIdentity(), create: 1, open: 0,
        lineageWrites: 0, hydration: true,
        configure: (ports) => { ports.family = 'absent'; },
      },
    ];

    for (const item of cases) {
      const ports = new FakePorts();
      item.configure(ports);
      const result = await run(ports, item.identity);
      expect(result.outcome).toBe('opened');
      if (result.outcome !== 'opened') throw new Error('expected opened');
      expect(result.decision).toBe(item.decision);
      expect(result.requiresHydration).toBe(item.hydration);
      expect(ports.createCalls).toBe(item.create);
      expect(ports.openCalls).toBe(item.open);
      expect(ports.lineageWrites).toBe(item.lineageWrites);
      expect(ports.keyWrites).toBe(item.decision === 'provision_new'
        || item.decision === 'provision_after_verified_erase' ? 1 : 0);
      if (item.identity.kind === 'guest') expect(ports.events).not.toContain('lineage.read');
      expectFlags(result);
    }
  });

  test('returns frozen zero-effect attention for every quarantine and recovery decision', async () => {
    const cases: readonly Readonly<{
      configure(ports: FakePorts): void;
      decision: ProvisionDecision;
    }>[] = [
      { decision: 'recovery_required', configure: (ports) => { ports.marker = 'present'; } },
      { decision: 'quarantine_key', configure: (ports) => {
        ports.key = Object.freeze({ kind: 'malformed' });
      } },
      { decision: 'quarantine_lineage', configure: (ports) => {
        ports.lineage = Object.freeze({ kind: 'malformed' });
      } },
      { decision: 'quarantine_unreadable', configure: (ports) => { ports.family = 'unreadable'; } },
      { decision: 'quarantine_ambiguous', configure: (ports) => {
        ports.key = Object.freeze({ kind: 'absent' });
      } },
    ];
    for (const item of cases) {
      const ports = new FakePorts();
      item.configure(ports);
      const result = await run(ports);
      expect(result.outcome).toBe('attention');
      if (result.outcome !== 'attention') throw new Error('expected attention');
      expect(result.decision).toBe(item.decision);
      expect(result.cleanup).toBe(null);
      expect(ports.events).not.toContain('key.generate');
      expect(ports.events).not.toContain('key.write');
      expect(ports.events).not.toContain('db.create');
      expect(ports.events).not.toContain('db.open');
      expect(ports.releaseCalls).toBe(1);
      expectFlags(result);
    }
  });

  test('rejects noncanonical plans before acquiring a lease or invoking any port', async () => {
    const ports = new FakePorts();
    const canonical = plan(accountIdentity());
    const drifted = {
      ...canonical,
      artifacts: canonical.artifacts.map((artifact, index) => index === 1
        ? { ...artifact, selector: '../foreign.db' }
        : artifact),
    } as V2StoragePlan;

    const result = await provisionOrReopenV2(manifest(), drifted, ports);

    expect(result.outcome).toBe('attention');
    expect(ports.events).toEqual([]);
    expectFlags(result);
  });

  test('captures the selected plan container once before any asynchronous effect', async () => {
    const ports = new FakePorts();
    const canonical = plan(accountIdentity());
    let ownKeysCalls = 0;
    const selected = new Proxy(canonical, {
      ownKeys: (target) => {
        ownKeysCalls += 1;
        return Reflect.ownKeys(target);
      },
    });

    const result = await provisionOrReopenV2(manifest(), selected, ports);

    expect(result.outcome).toBe('opened');
    expect(ownKeysCalls).toBe(1);
  });

  test('never overwrites existing keys and quarantines invalid stored key text', async () => {
    for (const value of ['A'.repeat(64), ` ${EXISTING_KEY}`, `${EXISTING_KEY}\n`, 'short']) {
      const ports = new FakePorts();
      ports.key = Object.freeze({ kind: 'stored', value });
      const result = await run(ports);
      expect(result.outcome).toBe('attention');
      expect(ports.keyWrites).toBe(0);
      expect(ports.createCalls + ports.openCalls).toBe(0);
      expect(ports.events).not.toContain('key.generate');
    }
  });

  test('fails closed on invalid RNG, key write/readback mismatch and does not open a database', async () => {
    const invalidValues: readonly unknown[] = [
      new Uint8Array(31), new Uint8Array(33), [1, 2, 3], null,
    ];
    for (const value of invalidValues) {
      const ports = new FakePorts();
      ports.lineage = Object.freeze({ kind: 'absent' });
      ports.key = Object.freeze({ kind: 'absent' });
      ports.family = 'absent';
      ports.randomBytes = value;
      const result = await run(ports, accountIdentity(1));
      expect(result.outcome).toBe('attention');
      expect(ports.createCalls).toBe(0);
    }

    const mismatch = new FakePorts();
    mismatch.lineage = Object.freeze({ kind: 'absent' });
    mismatch.key = Object.freeze({ kind: 'absent' });
    mismatch.family = 'absent';
    mismatch.keyReadbackValue = '3'.repeat(64);
    const result = await run(mismatch, accountIdentity(1));
    expect(result.outcome).toBe('attention');
    expect(mismatch.createCalls).toBe(0);
  });

  test('sanitizes observation, key, open, proof and lineage failures without leaking keys or raw errors', async () => {
    const configure: readonly ((ports: FakePorts) => void)[] = [
      (ports) => { ports.readFailure = new Error('read-secret'); },
      (ports) => {
        ports.lineage = Object.freeze({ kind: 'absent' });
        ports.key = Object.freeze({ kind: 'absent' });
        ports.family = 'absent';
        ports.writeKeyFailure = new Error('write-secret');
      },
      (ports) => { ports.openFailure = new Error('open-secret'); },
      (ports) => { ports.proofFailure = new Error('proof-secret'); },
      (ports) => { ports.proveResult = false; },
      (ports) => {
        ports.lineage = Object.freeze({ kind: 'absent' });
        ports.family = 'absent';
        ports.lineageWriteFailure = new Error('lineage-secret');
      },
      (ports) => {
        ports.lineage = Object.freeze({ kind: 'absent' });
        ports.family = 'absent';
        ports.lineageReadbackFailure = new Error('lineage-readback-secret');
      },
    ];
    for (const setup of configure) {
      const ports = new FakePorts();
      setup(ports);
      const result = await run(ports, ports.lineage.kind === 'absent' ? accountIdentity(1) : accountIdentity());
      expect(result.outcome).toBe('attention');
      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain(EXISTING_KEY);
      expect(serialized).not.toContain(GENERATED_KEY);
      expect(serialized).not.toMatch(/read-secret|write-secret|open-secret|proof-secret|lineage-secret/);
      expectFlags(result);
    }
  });

  test('revokes then closes post-open failures while the lease is still held', async () => {
    const ports = new FakePorts();
    ports.proveResult = false;

    const result = await run(ports);

    expect(result.outcome).toBe('attention');
    expect(ports.events).toEqual(expect.arrayContaining([
      'db.open', 'db.prove', 'candidate.revoke', 'candidate.close', 'lease.release',
    ]));
    expect(ports.events.indexOf('candidate.revoke')).toBeLessThan(ports.events.indexOf('candidate.close'));
    expect(ports.events.indexOf('candidate.close')).toBeLessThan(ports.events.indexOf('lease.release'));
    expect(ports.events).not.toContain('schema.list');
    expect(JSON.stringify(result)).not.toContain('candidate-handle');
  });

  test('retains candidate and lease only inside a single-flight cleanup ticket until close succeeds', async () => {
    const ports = new FakePorts();
    ports.proveResult = false;
    ports.candidate.closeFailures = 1;
    const result = await run(ports);
    expect(result.outcome).toBe('attention');
    if (result.outcome !== 'attention' || result.cleanup === null) {
      throw new Error('expected cleanup ticket');
    }
    expect(Object.isFrozen(result.cleanup)).toBe(true);
    expect('handle' in result.cleanup).toBe(false);
    expect(ports.releaseCalls).toBe(0);

    const first = result.cleanup.retryCleanup();
    const duplicate = result.cleanup.retryCleanup();
    expect(duplicate).toBe(first);
    await first;
    expect(ports.candidate.closeCalls).toBe(2);
    expect(ports.releaseCalls).toBe(1);
    const afterSuccess = await result.cleanup.retryCleanup();
    expect(afterSuccess.outcome).toBe('cleaned');
    expect(ports.candidate.closeCalls).toBe(2);
    expect(ports.releaseCalls).toBe(1);
  });

  test('retries failed revoke before close and never exposes an operational handle', async () => {
    const ports = new FakePorts();
    ports.proveResult = false;
    ports.candidate.revokeFailures = 1;
    const result = await run(ports);
    expect(result.outcome).toBe('attention');
    if (result.outcome !== 'attention' || result.cleanup === null) {
      throw new Error('expected cleanup ticket');
    }
    expect(ports.candidate.closeCalls).toBe(0);
    await result.cleanup.retryCleanup();
    expect(ports.candidate.revokeCalls).toBe(2);
    expect(ports.candidate.closeCalls).toBe(1);
    expect(ports.releaseCalls).toBe(1);
    expect(JSON.stringify(result)).not.toContain('candidate-handle');
  });

  test('release failure after a prospective success closes candidate once and retries only release', async () => {
    const ports = new FakePorts();
    ports.releaseFailures = 1;
    const result = await run(ports);
    expect(result.outcome).toBe('attention');
    if (result.outcome !== 'attention' || result.cleanup === null) {
      throw new Error('expected cleanup ticket');
    }
    expect(ports.candidate.revokeCalls).toBe(1);
    expect(ports.candidate.closeCalls).toBe(1);
    expect(ports.events).toContain('scope.revoke');
    expect(ports.events).toContain('scope.close');
    expect(ports.events).not.toContain('candidate.revoke');
    expect(ports.releaseCalls).toBe(1);
    await result.cleanup.retryCleanup();
    expect(ports.candidate.closeCalls).toBe(1);
    expect(ports.releaseCalls).toBe(2);
    expect(JSON.stringify(result)).not.toContain('candidate-handle');
  });

  test('pre-candidate release failure retains only the lease in cleanup', async () => {
    const ports = new FakePorts();
    ports.marker = 'present';
    ports.releaseFailures = 1;
    const result = await run(ports);
    expect(result.outcome).toBe('attention');
    if (result.outcome !== 'attention' || result.cleanup === null) {
      throw new Error('expected cleanup ticket');
    }
    expect(ports.candidate.revokeCalls).toBe(0);
    expect(ports.candidate.closeCalls).toBe(0);
    await result.cleanup.retryCleanup();
    expect(ports.releaseCalls).toBe(2);
  });

  test('does not publish a handle before deferred lineage readback and lease release both succeed', async () => {
    const ports = new FakePorts();
    ports.lineage = Object.freeze({ kind: 'absent' });
    ports.key = Object.freeze({ kind: 'absent' });
    ports.family = 'absent';
    const readbackGate = deferred<void>();
    const readbackEntered = deferred<void>();
    const releaseGate = deferred<void>();
    const releaseEntered = deferred<void>();
    ports.lineageReadbackGate = readbackGate.promise;
    ports.lineageReadbackEntered = readbackEntered;
    ports.releaseGate = releaseGate.promise;
    ports.releaseEntered = releaseEntered;
    let settled = false;

    const flight = run(ports, accountIdentity(1));
    void flight.then(() => { settled = true; });
    await readbackEntered.promise;
    expect(settled).toBe(false);
    expect(ports.events).not.toContain('lease.release');
    readbackGate.resolve(undefined);
    await releaseEntered.promise;
    expect(settled).toBe(false);
    releaseGate.resolve(undefined);

    const result = await flight;
    expect(result.outcome).toBe('opened');
  });

  test('revokes and closes on lineage write rejection or wrong readable lineage readback', async () => {
    const rejected = new FakePorts();
    rejected.lineage = Object.freeze({ kind: 'absent' });
    rejected.family = 'absent';
    rejected.lineageWriteFailure = new Error('lineage-write-private');
    const rejectedResult = await run(rejected, accountIdentity(1));
    expect(rejectedResult.outcome).toBe('attention');
    expect(rejected.candidate.revokeCalls).toBe(1);
    expect(rejected.candidate.closeCalls).toBe(1);
    expect(rejected.events).toContain('scope.revoke');
    expect(rejected.events).toContain('scope.close');
    expect(rejected.events).not.toContain('candidate.revoke');
    expect(rejected.releaseCalls).toBe(1);

    const readRejected = new FakePorts();
    readRejected.lineage = Object.freeze({ kind: 'absent' });
    readRejected.family = 'absent';
    readRejected.lineageReadbackFailure = new Error('lineage-readback-private');
    const readRejectedResult = await run(readRejected, accountIdentity(1));
    expect(readRejectedResult.outcome).toBe('attention');
    expect(readRejected.candidate.revokeCalls).toBe(1);
    expect(readRejected.candidate.closeCalls).toBe(1);
    expect(readRejected.releaseCalls).toBe(1);

    const wrong = new FakePorts();
    wrong.lineage = Object.freeze({ kind: 'absent' });
    wrong.family = 'absent';
    wrong.lineageReadbackValue = Object.freeze({
      kind: 'stored', value: 2, state: 'active',
    });
    wrong.candidate.closeFailures = 1;
    const wrongResult = await run(wrong, accountIdentity(1));
    expect(wrongResult.outcome).toBe('attention');
    if (wrongResult.outcome !== 'attention' || wrongResult.cleanup === null) {
      throw new Error('expected retained cleanup');
    }
    expect(wrong.releaseCalls).toBe(0);
    expect(JSON.stringify(wrongResult)).not.toContain('lineage-write-private');
    await wrongResult.cleanup.retryCleanup();
    expect(wrong.candidate.closeCalls).toBe(2);
    expect(wrong.releaseCalls).toBe(1);
  });

  test('observes malformed asynchronous revoke rejection and blocks close and shared-scope acquisition until retry', async () => {
    const authority = new SharedLeaseAuthority();
    const first = new FakePorts('shared-first', authority);
    const second = new FakePorts('shared-second', authority);
    first.proveResult = false;
    const malformedRevoke = deferred<void>();
    first.candidate.revokeResult = malformedRevoke.promise;

    const firstResult = await run(first);
    expect(firstResult.outcome).toBe('attention');
    if (firstResult.outcome !== 'attention' || firstResult.cleanup === null) {
      throw new Error('expected retained cleanup');
    }
    expect(first.candidate.closeCalls).toBe(0);
    expect(first.releaseCalls).toBe(0);

    const secondFlight = run(second);
    expect(second.events).toEqual(['lease.acquire']);
    const retryOne = firstResult.cleanup.retryCleanup();
    const retryDuplicate = firstResult.cleanup.retryCleanup();
    expect(retryDuplicate).toBe(retryOne);
    expect((await retryOne).outcome).toBe('attention');
    expect(first.candidate.revokeCalls).toBe(1);
    expect(first.candidate.closeCalls).toBe(0);
    expect(second.events).toEqual(['lease.acquire']);

    malformedRevoke.reject(new Error('async-native-revoke-private'));
    await Promise.resolve();
    await Promise.resolve();
    first.candidate.revokeResult = undefined;
    expect((await firstResult.cleanup.retryCleanup()).outcome).toBe('cleaned');
    const secondResult = await secondFlight;
    expect(secondResult.outcome).toBe('opened');
    expect(first.candidate.closeCalls).toBe(1);
    expect(first.releaseCalls).toBe(1);
  });

  test('installs the unexpected-revoke latch before assimilating a getter-bearing thenable', async () => {
    const ports = new FakePorts();
    ports.proveResult = false;
    const settlement = deferred<void>();
    let getterCalls = 0;
    const thenable: object = {};
    Object.defineProperty(thenable, 'then', {
      configurable: false,
      enumerable: true,
      get: () => {
        getterCalls += 1;
        return (resolve: (value: unknown) => void, reject: (reason: unknown) => void): void => {
          void settlement.promise.then(resolve, reject);
        };
      },
    });
    ports.candidate.revokeResult = thenable;

    const result = await run(ports);
    expect(result.outcome).toBe('attention');
    if (result.outcome !== 'attention' || result.cleanup === null) {
      throw new Error('expected retained cleanup');
    }
    expect(getterCalls).toBe(1);
    expect(ports.candidate.closeCalls).toBe(0);
    expect((await result.cleanup.retryCleanup()).outcome).toBe('attention');
    expect(getterCalls).toBe(1);
    settlement.reject(new Error('thenable-private'));
    await Promise.resolve();
    await Promise.resolve();
    ports.candidate.revokeResult = undefined;
    expect((await result.cleanup.retryCleanup()).outcome).toBe('cleaned');
  });

  test('holds one durable identity through revoke, close, or release cleanup failures', async () => {
    const setups: readonly ((ports: FakePorts) => void)[] = [
      (ports) => { ports.proveResult = false; ports.candidate.revokeFailures = 1; },
      (ports) => { ports.proveResult = false; ports.candidate.closeFailures = 1; },
      (ports) => { ports.releaseFailures = 1; },
    ];
    for (const setup of setups) {
      const authority = new SharedLeaseAuthority();
      const first = new FakePorts('same-identity-first', authority);
      const second = new FakePorts('same-identity-second', authority);
      setup(first);
      const firstResult = await run(first);
      expect(firstResult.outcome).toBe('attention');
      if (firstResult.outcome !== 'attention' || firstResult.cleanup === null) {
        throw new Error('expected retained cleanup');
      }
      const secondFlight = run(second);
      expect(second.events).toEqual(['lease.acquire']);
      expect((await firstResult.cleanup.retryCleanup()).outcome).toBe('cleaned');
      expect((await secondFlight).outcome).toBe('opened');
    }
  });

  test('preserves existing artifacts for wrong-key, NOTADB, and corrupt open failures', async () => {
    for (const raw of ['wrong-key-private', 'SQLITE_NOTADB private', 'corrupt-page private']) {
      const ports = new FakePorts();
      ports.openFailure = new Error(raw);
      const result = await run(ports);
      expect(result.outcome).toBe('attention');
      expect(ports.openCalls).toBe(1);
      expect(ports.createCalls).toBe(0);
      expect(ports.keyWrites).toBe(0);
      expect(ports.lineageWrites).toBe(0);
      expect(ports.releaseCalls).toBe(1);
      expect(JSON.stringify(result)).not.toContain(raw);
    }
  });

  test('never retries an uncertain persisted key write and never opens after readback mismatch', async () => {
    const uncertain = new FakePorts();
    uncertain.lineage = Object.freeze({ kind: 'absent' });
    uncertain.key = Object.freeze({ kind: 'absent' });
    uncertain.family = 'absent';
    uncertain.writeKeyPersistsBeforeFailure = true;
    uncertain.writeKeyFailure = new Error('unlock-state-unknown');
    const uncertainResult = await run(uncertain, accountIdentity(1));
    expect(uncertainResult.outcome).toBe('attention');
    expect(uncertain.keyWrites).toBe(1);
    expect(uncertain.writtenKey).toBe(GENERATED_KEY);
    expect(uncertain.createCalls + uncertain.openCalls).toBe(0);
    expect(uncertain.lineageWrites).toBe(0);
    expect(uncertain.events.filter((event) => event === 'key.write')).toHaveLength(1);

    const mismatch = new FakePorts();
    mismatch.lineage = Object.freeze({ kind: 'absent' });
    mismatch.key = Object.freeze({ kind: 'absent' });
    mismatch.family = 'absent';
    mismatch.keyReadbackValue = '3'.repeat(64);
    const mismatchResult = await run(mismatch, accountIdentity(1));
    expect(mismatchResult.outcome).toBe('attention');
    expect(mismatch.keyWrites).toBe(1);
    expect(mismatch.createCalls + mismatch.openCalls).toBe(0);
    expect(mismatch.releaseCalls).toBe(1);
  });

  test('uses one exact frozen key policy for reads and writes without prompt or access-group fields', async () => {
    const created = new FakePorts();
    created.lineage = Object.freeze({ kind: 'absent' });
    created.key = Object.freeze({ kind: 'absent' });
    created.family = 'absent';
    expect((await run(created, accountIdentity(1))).outcome).toBe('opened');
    const policy = created.keyReadPolicies[0] as Record<string, unknown>;
    expect(Object.isFrozen(policy)).toBe(true);
    expect(Object.keys(policy).sort()).toEqual([
      'accessibility', 'requireAuthentication', 'service',
    ]);
    expect(policy).not.toHaveProperty('prompt');
    expect(policy).not.toHaveProperty('accessGroup');
    expect(created.keyPolicy).toBe(policy);
    for (const observed of created.keyReadPolicies) expect(observed).toBe(policy);

    const reopened = new FakePorts();
    expect((await run(reopened)).outcome).toBe('opened');
    const quarantined = new FakePorts();
    quarantined.key = Object.freeze({ kind: 'malformed' });
    expect((await run(quarantined)).outcome).toBe('attention');
    expect(reopened.keyReadPolicies[0]).toBe(policy);
    expect(quarantined.keyReadPolicies[0]).toBe(policy);
  });

  test('does not invoke getter-bearing observation fields or release an unmanageable opened candidate', async () => {
    const getterPorts = new FakePorts();
    let getterCalls = 0;
    getterPorts.key = Object.defineProperty({}, 'kind', {
      enumerable: true,
      get: () => { getterCalls += 1; return 'stored'; },
    });
    const getterResult = await run(getterPorts);
    expect(getterResult.outcome).toBe('attention');
    expect(getterCalls).toBe(0);
    expect(getterPorts.releaseCalls).toBe(1);

    const malformedCandidate = new FakePorts();
    malformedCandidate.candidateResult = Object.freeze({ handle: Object.freeze({ label: 'hidden' }) });
    const malformedResult = await run(malformedCandidate);
    expect(malformedResult.outcome).toBe('attention');
    if (malformedResult.outcome !== 'attention' || malformedResult.cleanup === null) {
      throw new Error('expected fail-closed cleanup');
    }
    expect(malformedCandidate.releaseCalls).toBe(0);
    expect((await malformedResult.cleanup.retryCleanup()).outcome).toBe('attention');
    expect(JSON.stringify(malformedResult)).not.toContain('hidden');
  });

  test('maps malformed key and lineage structures to observation failure without invoking accessors', async () => {
    const cases: readonly Readonly<{
      stage: 'key' | 'lineage';
      value: unknown;
      getterCalls(): number;
    }>[] = [
      { stage: 'key', value: null, getterCalls: () => 0 },
      { stage: 'lineage', value: 7, getterCalls: () => 0 },
      (() => {
        let calls = 0;
        return {
          stage: 'key' as const,
          value: Object.defineProperty({}, 'kind', {
            enumerable: true,
            get: () => { calls += 1; return 'stored'; },
          }),
          getterCalls: () => calls,
        };
      })(),
      (() => {
        let calls = 0;
        return {
          stage: 'lineage' as const,
          value: Object.defineProperty({}, 'kind', {
            enumerable: true,
            get: () => { calls += 1; return 'stored'; },
          }),
          getterCalls: () => calls,
        };
      })(),
    ];

    for (const item of cases) {
      const ports = new FakePorts();
      if (item.stage === 'key') ports.key = item.value;
      else ports.lineage = item.value as AccountLineageObservation;
      const result = await run(ports);
      expect(result.outcome).toBe('attention');
      if (result.outcome !== 'attention') throw new Error('expected attention');
      expect(result.code).toBe('account_native_provision_observation_failed');
      expect(item.getterCalls()).toBe(0);
      expect(ports.keyWrites).toBe(0);
      expect(ports.createCalls + ports.openCalls).toBe(0);
      expect(ports.releaseCalls).toBe(1);
    }
  });

  test('documents the injected adapter ownership boundary without claiming native proof', () => {
    const source = readFileSync(join(
      process.cwd(),
      'modules/account-session-v2/native/account_native_provisioner.ts',
    ), 'utf8');
    expect(source).toContain('An acquire rejection must leave no lease owned by the caller.');
    expect(source).toContain('A create/open rejection must leave no live native connection or candidate.');
    expect(source).toContain('These adapter obligations require separate native tests; this type does not prove them.');
  });

  test('rejects non-object candidate handles while independently retaining valid lifecycle methods', async () => {
    const cases: readonly Readonly<{
      label: string;
      installHandle(candidate: Record<string, unknown>, onGetter: () => void): void;
    }>[] = [
      { label: 'missing', installHandle: () => undefined },
      { label: 'null', installHandle: (candidate) => { candidate.handle = null; } },
      { label: 'undefined', installHandle: (candidate) => { candidate.handle = undefined; } },
      { label: 'boolean', installHandle: (candidate) => { candidate.handle = false; } },
      { label: 'number', installHandle: (candidate) => { candidate.handle = 0; } },
      { label: 'string', installHandle: (candidate) => { candidate.handle = 'private-handle'; } },
      {
        label: 'accessor',
        installHandle: (candidate, onGetter) => {
          Object.defineProperty(candidate, 'handle', {
            enumerable: true,
            configurable: false,
            get: () => { onGetter(); return Object.freeze({ label: 'must-not-read' }); },
          });
        },
      },
    ];

    for (const item of cases) {
      const ports = new FakePorts();
      let getterCalls = 0;
      let revokeCalls = 0;
      let closeCalls = 0;
      const candidate: Record<string, unknown> = {
        revoke: (): undefined => {
          ports.events.push(`invalid.${item.label}.revoke`);
          revokeCalls += 1;
          return undefined;
        },
        close: async (): Promise<void> => {
          ports.events.push(`invalid.${item.label}.close`);
          closeCalls += 1;
        },
      };
      item.installHandle(candidate, () => { getterCalls += 1; });
      ports.candidateResult = candidate;

      const result = await run(ports);

      expect(result.outcome).toBe('attention');
      if (result.outcome !== 'attention') throw new Error('expected attention');
      expect(result.cleanup).toBe(null);
      expect(getterCalls).toBe(0);
      expect(revokeCalls).toBe(1);
      expect(closeCalls).toBe(1);
      expect(ports.proofCalls).toBe(0);
      expect(ports.releaseCalls).toBe(1);
      expect(ports.events.indexOf(`invalid.${item.label}.revoke`))
        .toBeLessThan(ports.events.indexOf(`invalid.${item.label}.close`));
      expect(ports.events.indexOf(`invalid.${item.label}.close`))
        .toBeLessThan(ports.events.indexOf('lease.release'));
      expect(JSON.stringify(result)).not.toMatch(/private-handle|must-not-read/);
    }
  });

  test('copies generated key material before the write port can mutate its source buffer', async () => {
    const ports = new FakePorts();
    ports.lineage = Object.freeze({ kind: 'absent' });
    ports.key = Object.freeze({ kind: 'absent' });
    ports.family = 'absent';
    ports.mutateRandomBytesOnWrite = true;
    const result = await run(ports, accountIdentity(1));
    expect(result.outcome).toBe('opened');
    expect(ports.writtenKey).toBe(GENERATED_KEY);
    expect(ports.randomBytes).toEqual(new Uint8Array(32).fill(255));
  });

  test('keeps concurrent calls on their own acquired leases and never auto-releases an opaque lease', async () => {
    const firstPorts = new FakePorts();
    const secondPorts = new FakePorts('lease-2');
    const gate = deferred<void>();
    firstPorts.acquireGate = gate.promise;
    const first = run(firstPorts);
    const second = run(secondPorts);
    const secondResult = await second;
    gate.resolve(undefined);
    const firstResult = await first;
    expect(firstResult.outcome).toBe('opened');
    expect(secondResult.outcome).toBe('opened');
    expect(firstPorts.releaseCalls).toBe(1);
    expect(secondPorts.releaseCalls).toBe(1);
    expect(firstPorts.events.filter((event) => event === 'lease.acquire')).toHaveLength(1);
    expect(secondPorts.events.filter((event) => event === 'lease.acquire')).toHaveLength(1);
  });
});
