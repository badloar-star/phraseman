import {
  decideProvision,
  planV2StorageArtifacts,
  validateAccountNativeStorageManifest,
  type AccountLineageObservation,
  type AccountNativeStorageManifest,
  type ProvisionDecision,
  type ProvisionObservation,
  type V2StoragePlan,
} from '../native_storage_manifest';
import type { ScopeStorageConnection } from '../account_scope_store';
import {
  initializeNewAccountSqliteScopeConnection,
  verifyExistingAccountSqliteScopeConnection,
  type AccountSqliteScopeConnectionBundle,
} from './account_sqlite_scope_connection';

export type AccountNativeProvisionCode =
  | 'account_native_provision_invalid_input'
  | 'account_native_provision_observation_failed'
  | 'account_native_provision_attention_required'
  | 'account_native_provision_key_failed'
  | 'account_native_provision_open_failed'
  | 'account_native_provision_proof_failed'
  | 'account_native_provision_schema_failed'
  | 'account_native_provision_lineage_failed'
  | 'account_native_provision_cleanup_required';

export type AccountNativeProvisionLease = object;

export type AccountNativeKeyRead =
  | Readonly<{ kind: 'absent' | 'malformed' | 'unreadable' }>
  | Readonly<{ kind: 'stored'; value: string }>;

export type AccountNativeKeyPolicy = Readonly<{
  service: 'phraseman.account_native_storage.v2';
  requireAuthentication: false;
  accessibility: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY';
}>;

export type AccountNativeProvisionCandidate<H extends object> = Readonly<{
  handle: H;
  scopeConnectionBundle: AccountSqliteScopeConnectionBundle;
  revoke(): undefined;
  close(): Promise<void>;
}>;

/**
 * SDK adapter boundary. The acquired lease must exclusively cover the exact durable
 * key/database identity across every participating process until release resolves.
 * An acquire rejection must leave no lease owned by the caller.
 * A create/open rejection must leave no live native connection or candidate.
 * Once create/open resolves, it must return a manageable candidate so proof failure or
 * any later failure can revoke and close it while the lease remains held.
 * Release may reject only when ownership is provably retained; an adapter that can
 * unlock and then reject is unsupported. Key reads and writes must apply the supplied
 * policy exactly. Key generation must asynchronously return 32 cryptographically secure
 * bytes and must not use a synchronous development fallback. The coordinator provides
 * ordering, not native lock, keying, backup, or cross-process exclusivity proof.
 * The raw candidate lifecycle, its scope connection bundle binding, keyed proof, and
 * opened resource must delegate one complete canonical native connection lifecycle.
 * No residual resource may require a second raw close after cleanup ownership transfers
 * to the admitted scope connection. Types do not prove this native identity or aliasing.
 * These adapter obligations require separate native tests; this type does not prove them.
 */
export type AccountNativeProvisionPorts<H extends object> = Readonly<{
  acquireDurableProvisionLease(plan: V2StoragePlan): Promise<AccountNativeProvisionLease>;
  readLineage(
    lease: AccountNativeProvisionLease,
    selector: string,
  ): Promise<AccountLineageObservation>;
  readKey(
    lease: AccountNativeProvisionLease,
    selector: string,
    policy: AccountNativeKeyPolicy,
  ): Promise<AccountNativeKeyRead>;
  readRetirementMarker(
    lease: AccountNativeProvisionLease,
    selector: string,
  ): Promise<'absent' | 'present' | 'unreadable'>;
  inspectDatabaseFamily(
    lease: AccountNativeProvisionLease,
    selectors: readonly string[],
  ): Promise<'absent' | 'present' | 'unreadable'>;
  generateKeyBytes(): Promise<unknown>;
  writeKey(
    lease: AccountNativeProvisionLease,
    selector: string,
    keyHex: string,
    policy: AccountNativeKeyPolicy,
  ): Promise<void>;
  createNew(
    lease: AccountNativeProvisionLease,
    plan: V2StoragePlan,
    keyHex: string,
  ): Promise<AccountNativeProvisionCandidate<H>>;
  openExisting(
    lease: AccountNativeProvisionLease,
    plan: V2StoragePlan,
    keyHex: string,
  ): Promise<AccountNativeProvisionCandidate<H>>;
  proveKeyedSameConnection(
    lease: AccountNativeProvisionLease,
    candidate: AccountNativeProvisionCandidate<H>,
    plan: V2StoragePlan,
    keyHex: string,
  ): Promise<boolean>;
  writeActiveLineage(
    lease: AccountNativeProvisionLease,
    selector: string,
    lineage: number,
  ): Promise<void>;
  releaseDurableProvisionLease(lease: AccountNativeProvisionLease): Promise<void>;
}>;

export type AccountNativeCleanupResult = Readonly<{
  outcome: 'cleaned' | 'attention';
  code: AccountNativeProvisionCode;
}>;

export type AccountNativeCleanupTicket = Readonly<{
  retryCleanup(): Promise<AccountNativeCleanupResult>;
}>;

export type AccountNativeProvisionResult<H extends object> =
  | Readonly<{
      outcome: 'opened';
      decision: ProvisionDecision;
      handle: H;
      requiresHydration: boolean;
      mayCertifyV2ScopeErase: false;
      mayCertifyFullUserLocalWipe: false;
    }>
  | Readonly<{
      outcome: 'attention';
      decision: ProvisionDecision;
      code: AccountNativeProvisionCode;
      cleanup: AccountNativeCleanupTicket | null;
      mayCertifyV2ScopeErase: false;
      mayCertifyFullUserLocalWipe: false;
    }>;

type DataSnapshot = Readonly<{
  keys: readonly string[];
  values: Readonly<Record<string, unknown>>;
}>;

type CapturedMethod = Readonly<{ receiver: object; method: (...args: never[]) => unknown }>;

type CapturedPorts = Readonly<{
  acquire: CapturedMethod;
  readLineage: CapturedMethod;
  readKey: CapturedMethod;
  readRetirement: CapturedMethod;
  inspectFamily: CapturedMethod;
  generateKey: CapturedMethod;
  writeKey: CapturedMethod;
  createNew: CapturedMethod;
  openExisting: CapturedMethod;
  prove: CapturedMethod;
  writeLineage: CapturedMethod;
  release: CapturedMethod;
}>;

type CandidateState<H extends object> = {
  target: object | null;
  handle: H | null;
  revokeMethod: ((...args: never[]) => unknown) | null;
  closeMethod: ((...args: never[]) => unknown) | null;
  revoked: boolean;
  closed: boolean;
  pendingUnexpectedRevokeResult: boolean;
  closeFlight: Promise<boolean> | null;
};

type CandidateCapture<H extends object> = Readonly<{
  state: CandidateState<H>;
  usable: boolean;
  scopeConnectionBundle: AccountSqliteScopeConnectionBundle | null;
}>;

type ScopeConnectionCapture = Readonly<{
  state: CandidateState<ScopeStorageConnection>;
  usable: boolean;
}>;

type CleanupState<H extends object> = {
  lease: AccountNativeProvisionLease | null;
  candidate: CandidateState<H> | null;
  connection: CandidateState<ScopeStorageConnection> | null;
  flight: Promise<AccountNativeCleanupResult> | null;
  cleanedResult: AccountNativeCleanupResult | null;
};

class SafeProvisionFailure extends Error {
  readonly code: AccountNativeProvisionCode;

  constructor(code: AccountNativeProvisionCode) {
    super(code);
    this.code = code;
    delete this.stack;
  }
}

const KEY_POLICY: AccountNativeKeyPolicy = Object.freeze({
  service: 'phraseman.account_native_storage.v2',
  requireAuthentication: false,
  accessibility: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
});

const OPEN_DECISIONS: readonly ProvisionDecision[] = Object.freeze([
  'provision_new',
  'resume_first_provision',
  'reopen_existing',
  'provision_after_verified_erase',
  'resume_reprovision',
  'empty_recreated_same_identity',
]);

const LINEAGE_WRITE_DECISIONS: readonly ProvisionDecision[] = Object.freeze([
  'provision_new',
  'resume_first_provision',
  'provision_after_verified_erase',
  'resume_reprovision',
]);

function snapshotData(value: unknown): DataSnapshot {
  try {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new SafeProvisionFailure('account_native_provision_invalid_input');
    }
    const rawKeys = Reflect.ownKeys(value);
    if (rawKeys.some((key) => typeof key !== 'string')) {
      throw new SafeProvisionFailure('account_native_provision_invalid_input');
    }
    const keys = rawKeys as string[];
    const values: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined || !('value' in descriptor)) {
        throw new SafeProvisionFailure('account_native_provision_invalid_input');
      }
      values[key] = descriptor.value;
    }
    return Object.freeze({ keys: Object.freeze([...keys]), values: Object.freeze(values) });
  } catch (error) {
    if (error instanceof SafeProvisionFailure) throw error;
    throw new SafeProvisionFailure('account_native_provision_invalid_input');
  }
}

function exactKeys(snapshot: DataSnapshot, keys: readonly string[]): boolean {
  return snapshot.keys.length === keys.length && keys.every((key) => snapshot.keys.includes(key));
}

function snapshotArray(value: unknown): readonly unknown[] {
  try {
    if (!Array.isArray(value)) throw new SafeProvisionFailure('account_native_provision_invalid_input');
    const keys = Reflect.ownKeys(value);
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length');
    if (lengthDescriptor === undefined || !('value' in lengthDescriptor)
      || !Number.isSafeInteger(lengthDescriptor.value) || lengthDescriptor.value < 0) {
      throw new SafeProvisionFailure('account_native_provision_invalid_input');
    }
    const length = lengthDescriptor.value as number;
    if (keys.length !== length + 1) throw new SafeProvisionFailure('account_native_provision_invalid_input');
    const copy: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (descriptor === undefined || !('value' in descriptor)) {
        throw new SafeProvisionFailure('account_native_provision_invalid_input');
      }
      copy.push(descriptor.value);
    }
    return Object.freeze(copy);
  } catch (error) {
    if (error instanceof SafeProvisionFailure) throw error;
    throw new SafeProvisionFailure('account_native_provision_invalid_input');
  }
}

function captureDataProperty(
  target: object,
  name: string,
  failureCode: AccountNativeProvisionCode = 'account_native_provision_open_failed',
): unknown {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(target, name);
    if (descriptor === undefined || !('value' in descriptor)) {
      throw new SafeProvisionFailure(failureCode);
    }
    return descriptor.value;
  } catch (error) {
    if (error instanceof SafeProvisionFailure) throw error;
    throw new SafeProvisionFailure(failureCode);
  }
}

function captureMethod(target: object, name: string): CapturedMethod {
  try {
    let owner: object | null = target;
    for (let depth = 0; depth < 8 && owner !== null; depth += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(owner, name);
      if (descriptor !== undefined) {
        if (!('value' in descriptor) || typeof descriptor.value !== 'function') {
          throw new SafeProvisionFailure('account_native_provision_invalid_input');
        }
        return Object.freeze({
          receiver: target,
          method: descriptor.value as (...args: never[]) => unknown,
        });
      }
      owner = Object.getPrototypeOf(owner) as object | null;
    }
  } catch (error) {
    if (error instanceof SafeProvisionFailure) throw error;
  }
  throw new SafeProvisionFailure('account_native_provision_invalid_input');
}

function capturePorts<H extends object>(ports: AccountNativeProvisionPorts<H>): CapturedPorts {
  if (typeof ports !== 'object' || ports === null) {
    throw new SafeProvisionFailure('account_native_provision_invalid_input');
  }
  const target = ports as object;
  return Object.freeze({
    acquire: captureMethod(target, 'acquireDurableProvisionLease'),
    readLineage: captureMethod(target, 'readLineage'),
    readKey: captureMethod(target, 'readKey'),
    readRetirement: captureMethod(target, 'readRetirementMarker'),
    inspectFamily: captureMethod(target, 'inspectDatabaseFamily'),
    generateKey: captureMethod(target, 'generateKeyBytes'),
    writeKey: captureMethod(target, 'writeKey'),
    createNew: captureMethod(target, 'createNew'),
    openExisting: captureMethod(target, 'openExisting'),
    prove: captureMethod(target, 'proveKeyedSameConnection'),
    writeLineage: captureMethod(target, 'writeActiveLineage'),
    release: captureMethod(target, 'releaseDurableProvisionLease'),
  });
}

async function callPort(
  method: CapturedMethod,
  args: readonly unknown[],
  failureCode: AccountNativeProvisionCode = 'account_native_provision_observation_failed',
): Promise<unknown> {
  let result: unknown;
  try {
    result = Reflect.apply(method.method, method.receiver, [...args]);
  } catch {
    throw new SafeProvisionFailure(failureCode);
  }
  try {
    return await new Promise<unknown>((resolve) => resolve(result));
  } catch {
    throw new SafeProvisionFailure(failureCode);
  }
}

function capturePlanIdentity(value: unknown): V2StoragePlan['identity'] {
  const identity = snapshotData(value);
  if (identity.values.kind === 'account'
    && exactKeys(identity, ['kind', 'scopeKey', 'hash', 'persistentLineage'])) {
    return Object.freeze({
      kind: 'account',
      scopeKey: identity.values.scopeKey,
      hash: identity.values.hash,
      persistentLineage: identity.values.persistentLineage,
    }) as V2StoragePlan['identity'];
  }
  if (identity.values.kind === 'guest'
    && exactKeys(identity, ['kind', 'scopeKey', 'hash'])) {
    return Object.freeze({
      kind: 'guest',
      scopeKey: identity.values.scopeKey,
      hash: identity.values.hash,
    }) as V2StoragePlan['identity'];
  }
  throw new SafeProvisionFailure('account_native_provision_invalid_input');
}

function planSnapshotMatches(snapshot: DataSnapshot, canonical: V2StoragePlan): boolean {
  try {
    if (!exactKeys(snapshot, ['manifestVersion', 'scopeKey', 'identity', 'artifacts'])
      || snapshot.values.manifestVersion !== canonical.manifestVersion
      || snapshot.values.scopeKey !== canonical.scopeKey) return false;
    const artifacts = snapshotArray(snapshot.values.artifacts);
    if (artifacts.length !== canonical.artifacts.length) return false;
    return artifacts.every((artifact, index) => {
      const snapshot = snapshotData(artifact);
      const expected = canonical.artifacts[index];
      return exactKeys(snapshot, [
        'id', 'medium', 'selector', 'eraseOrder', 'requiredAbsentForV2Erase',
      ]) && snapshot.values.id === expected.id
        && snapshot.values.medium === expected.medium
        && snapshot.values.selector === expected.selector
        && snapshot.values.eraseOrder === expected.eraseOrder
        && snapshot.values.requiredAbsentForV2Erase === expected.requiredAbsentForV2Erase;
    });
  } catch {
    return false;
  }
}

function canonicalizeInputs(
  manifest: AccountNativeStorageManifest,
  selectedPlan: V2StoragePlan,
): Readonly<{ manifest: AccountNativeStorageManifest; plan: V2StoragePlan }> {
  try {
    const checkedManifest = validateAccountNativeStorageManifest(manifest);
    const planSnapshot = snapshotData(selectedPlan);
    if (!exactKeys(planSnapshot, ['manifestVersion', 'scopeKey', 'identity', 'artifacts'])) {
      throw new SafeProvisionFailure('account_native_provision_invalid_input');
    }
    const identity = capturePlanIdentity(planSnapshot.values.identity);
    const canonical = planV2StorageArtifacts(checkedManifest, identity);
    if (!planSnapshotMatches(planSnapshot, canonical)) {
      throw new SafeProvisionFailure('account_native_provision_invalid_input');
    }
    return Object.freeze({ manifest: checkedManifest, plan: canonical });
  } catch {
    throw new SafeProvisionFailure('account_native_provision_invalid_input');
  }
}

function artifactSelector(plan: V2StoragePlan, id: string): string {
  const artifact = plan.artifacts.find((candidate) => candidate.id === id);
  if (artifact === undefined) throw new SafeProvisionFailure('account_native_provision_invalid_input');
  return artifact.selector;
}

function databaseSelectors(plan: V2StoragePlan): readonly string[] {
  const suffixes = ['main', 'wal', 'shm', 'journal'] as const;
  return Object.freeze(suffixes.map((suffix) => artifactSelector(
    plan,
    `v2.${plan.identity.kind}.db.${suffix}`,
  )));
}

function snapshotObservationData(value: unknown): DataSnapshot {
  try {
    return snapshotData(value);
  } catch {
    throw new SafeProvisionFailure('account_native_provision_observation_failed');
  }
}

function captureKeyRead(value: unknown): Readonly<{
  state: 'absent' | 'valid' | 'malformed' | 'unreadable';
  keyHex: string | null;
}> {
  const snapshot = snapshotObservationData(value);
  if ((snapshot.values.kind === 'absent' || snapshot.values.kind === 'malformed'
    || snapshot.values.kind === 'unreadable') && exactKeys(snapshot, ['kind'])) {
    return Object.freeze({ state: snapshot.values.kind, keyHex: null });
  }
  if (snapshot.values.kind === 'stored' && exactKeys(snapshot, ['kind', 'value'])) {
    const raw = snapshot.values.value;
    if (typeof raw === 'string' && /^[0-9a-f]{64}$/.test(raw)) {
      return Object.freeze({ state: 'valid', keyHex: raw });
    }
    return Object.freeze({ state: 'malformed', keyHex: null });
  }
  throw new SafeProvisionFailure('account_native_provision_observation_failed');
}

function captureLineage(value: unknown): AccountLineageObservation {
  const snapshot = snapshotObservationData(value);
  if ((snapshot.values.kind === 'absent' || snapshot.values.kind === 'malformed'
    || snapshot.values.kind === 'unreadable') && exactKeys(snapshot, ['kind'])) {
    return Object.freeze({ kind: snapshot.values.kind });
  }
  if (snapshot.values.kind === 'stored' && exactKeys(snapshot, ['kind', 'value', 'state'])
    && Number.isSafeInteger(snapshot.values.value) && (snapshot.values.value as number) > 0
    && (snapshot.values.state === 'active' || snapshot.values.state === 'erased_empty')) {
    return Object.freeze({
      kind: 'stored', value: snapshot.values.value as number, state: snapshot.values.state,
    });
  }
  throw new SafeProvisionFailure('account_native_provision_observation_failed');
}

function requireMarker(value: unknown): 'absent' | 'present' | 'unreadable' {
  if (value === 'absent' || value === 'present' || value === 'unreadable') return value;
  throw new SafeProvisionFailure('account_native_provision_observation_failed');
}

function requireFamily(value: unknown): 'absent' | 'present' | 'unreadable' {
  if (value === 'absent' || value === 'present' || value === 'unreadable') return value;
  throw new SafeProvisionFailure('account_native_provision_observation_failed');
}

function randomKeyHex(value: unknown): string {
  try {
    if (!(value instanceof Uint8Array)
      || Object.getPrototypeOf(value) !== Uint8Array.prototype
      || value.byteLength !== 32) {
      throw new SafeProvisionFailure('account_native_provision_key_failed');
    }
    const copy = new Uint8Array(32);
    for (let index = 0; index < copy.length; index += 1) copy[index] = value[index];
    let hex = '';
    for (const byte of copy) hex += byte.toString(16).padStart(2, '0');
    return hex;
  } catch (error) {
    if (error instanceof SafeProvisionFailure) throw error;
    throw new SafeProvisionFailure('account_native_provision_key_failed');
  }
}

function isThenableCandidate(value: unknown): value is object | ((...args: never[]) => unknown) {
  return (typeof value === 'object' && value !== null) || typeof value === 'function';
}

function captureCandidate<H extends object>(value: unknown): CandidateCapture<H> {
  const target = typeof value === 'object' && value !== null ? value : null;
  const state: CandidateState<H> = {
    target,
    handle: null,
    revokeMethod: null,
    closeMethod: null,
    revoked: false,
    closed: false,
    pendingUnexpectedRevokeResult: false,
    closeFlight: null,
  };
  if (target === null) {
    return Object.freeze({ state, usable: false, scopeConnectionBundle: null });
  }
  let lifecycleUsable = true;
  try {
    state.revokeMethod = captureMethod(target, 'revoke').method;
  } catch {
    lifecycleUsable = false;
  }
  try {
    state.closeMethod = captureMethod(target, 'close').method;
  } catch {
    lifecycleUsable = false;
  }
  let handleUsable = false;
  try {
    const handle = captureDataProperty(target, 'handle');
    if (typeof handle === 'object' && handle !== null) {
      state.handle = handle as H;
      handleUsable = true;
    }
  } catch {
    handleUsable = false;
  }
  let scopeConnectionBundle: AccountSqliteScopeConnectionBundle | null = null;
  try {
    const bundle = captureDataProperty(
      target,
      'scopeConnectionBundle',
      'account_native_provision_schema_failed',
    );
    if (typeof bundle === 'object' && bundle !== null) {
      scopeConnectionBundle = bundle as AccountSqliteScopeConnectionBundle;
    }
  } catch {
    scopeConnectionBundle = null;
  }
  return Object.freeze({
    state,
    usable: lifecycleUsable && handleUsable,
    scopeConnectionBundle,
  });
}

function captureScopeConnection(value: unknown): ScopeConnectionCapture {
  const target = typeof value === 'object' && value !== null ? value : null;
  const state: CandidateState<ScopeStorageConnection> = {
    target,
    handle: target as unknown as ScopeStorageConnection | null,
    revokeMethod: null,
    closeMethod: null,
    revoked: false,
    closed: false,
    pendingUnexpectedRevokeResult: false,
    closeFlight: null,
  };
  if (target === null) return Object.freeze({ state, usable: false });
  try {
    state.revokeMethod = captureMethod(target, 'revoke').method;
    state.closeMethod = captureMethod(target, 'close').method;
    return Object.freeze({ state, usable: true });
  } catch {
    return Object.freeze({ state, usable: false });
  }
}

function relinquishRawCandidate<H extends object>(candidate: CandidateState<H>): void {
  candidate.target = null;
  candidate.handle = null;
  candidate.revokeMethod = null;
  candidate.closeMethod = null;
  candidate.closeFlight = null;
}

function attemptCandidateRevoke<H extends object>(candidate: CandidateState<H>): boolean {
  if (candidate.revoked) return true;
  if (candidate.pendingUnexpectedRevokeResult) return false;
  const target = candidate.target;
  const method = candidate.revokeMethod;
  if (target === null || method === null) return false;
  let result: unknown;
  try {
    result = Reflect.apply(method, target, []);
  } catch {
    return false;
  }
  if (result === undefined) {
    candidate.revoked = true;
    return true;
  }
  if (isThenableCandidate(result)) {
    candidate.pendingUnexpectedRevokeResult = true;
    const observation = new Promise<unknown>((resolve) => resolve(result));
    void observation.then(
      () => { candidate.pendingUnexpectedRevokeResult = false; },
      () => { candidate.pendingUnexpectedRevokeResult = false; },
    );
  }
  return false;
}

function attemptCandidateClose<H extends object>(candidate: CandidateState<H>): Promise<boolean> {
  if (candidate.closed) return Promise.resolve(true);
  if (candidate.closeFlight !== null) return candidate.closeFlight;
  if (!candidate.revoked || candidate.pendingUnexpectedRevokeResult) return Promise.resolve(false);
  const target = candidate.target;
  const method = candidate.closeMethod;
  if (target === null || method === null) return Promise.resolve(false);
  let begin!: () => void;
  const flight = new Promise<boolean>((resolve) => {
    begin = (): void => {
      let result: unknown;
      try {
        result = Reflect.apply(method, target, []);
      } catch {
        candidate.closeFlight = null;
        resolve(false);
        return;
      }
      if (!isThenableCandidate(result)) {
        candidate.closeFlight = null;
        resolve(false);
        return;
      }
      const observation = new Promise<unknown>((adopt) => adopt(result));
      void observation.then(
        (settled) => {
          if (settled !== undefined) {
            candidate.closeFlight = null;
            resolve(false);
            return;
          }
          candidate.closed = true;
          candidate.target = null;
          candidate.handle = null;
          candidate.revokeMethod = null;
          candidate.closeMethod = null;
          resolve(true);
        },
        () => {
          candidate.closeFlight = null;
          resolve(false);
        },
      );
    };
  });
  candidate.closeFlight = flight;
  begin();
  return flight;
}

async function cleanupCandidateOnly<H extends object>(state: CleanupState<H>): Promise<boolean> {
  const connection = state.connection;
  if (connection !== null) {
    if (!attemptCandidateRevoke(connection)) return false;
    if (!await attemptCandidateClose(connection)) return false;
    state.connection = null;
    return true;
  }
  const candidate = state.candidate;
  if (candidate === null) return true;
  if (!attemptCandidateRevoke(candidate)) return false;
  if (!await attemptCandidateClose(candidate)) return false;
  state.candidate = null;
  return true;
}

async function releaseLease<H extends object>(
  state: CleanupState<H>,
  ports: CapturedPorts,
): Promise<boolean> {
  const lease = state.lease;
  if (lease === null) return true;
  try {
    const released = await callPort(ports.release, [lease]);
    if (released !== undefined) return false;
    state.lease = null;
    return true;
  } catch {
    return false;
  }
}

const CLEANED_RESULT: AccountNativeCleanupResult = Object.freeze({
  outcome: 'cleaned', code: 'account_native_provision_cleanup_required',
});
const CLEANUP_ATTENTION: AccountNativeCleanupResult = Object.freeze({
  outcome: 'attention', code: 'account_native_provision_cleanup_required',
});

function runCleanup<H extends object>(
  state: CleanupState<H>,
  ports: CapturedPorts,
): Promise<AccountNativeCleanupResult> {
  if (state.cleanedResult !== null) return Promise.resolve(state.cleanedResult);
  if (state.flight !== null) return state.flight;
  let begin!: () => void;
  const flight = new Promise<AccountNativeCleanupResult>((resolve) => {
    begin = (): void => {
      void (async () => {
        if (!await cleanupCandidateOnly(state) || !await releaseLease(state, ports)) {
          state.flight = null;
          resolve(CLEANUP_ATTENTION);
          return;
        }
        state.cleanedResult = CLEANED_RESULT;
        resolve(CLEANED_RESULT);
      })();
    };
  });
  state.flight = flight;
  begin();
  return flight;
}

function cleanupTicket<H extends object>(
  state: CleanupState<H>,
  ports: CapturedPorts,
): AccountNativeCleanupTicket {
  return Object.freeze({ retryCleanup: (): Promise<AccountNativeCleanupResult> => runCleanup(state, ports) });
}

function attention(
  decision: ProvisionDecision,
  code: AccountNativeProvisionCode,
  cleanup: AccountNativeCleanupTicket | null,
): AccountNativeProvisionResult<ScopeStorageConnection> {
  return Object.freeze({
    outcome: 'attention', decision, code, cleanup,
    mayCertifyV2ScopeErase: false,
    mayCertifyFullUserLocalWipe: false,
  });
}

function opened(
  decision: ProvisionDecision,
  handle: ScopeStorageConnection,
  requiresHydration: boolean,
): AccountNativeProvisionResult<ScopeStorageConnection> {
  return Object.freeze({
    outcome: 'opened', decision, handle, requiresHydration,
    mayCertifyV2ScopeErase: false,
    mayCertifyFullUserLocalWipe: false,
  });
}

async function settlePreCandidateFailure<H extends object>(
  decision: ProvisionDecision,
  code: AccountNativeProvisionCode,
  state: CleanupState<H>,
  ports: CapturedPorts,
): Promise<AccountNativeProvisionResult<ScopeStorageConnection>> {
  if (await releaseLease(state, ports)) return attention(decision, code, null);
  return attention(
    decision,
    'account_native_provision_cleanup_required',
    cleanupTicket(state, ports),
  );
}

async function settlePostCandidateFailure<H extends object>(
  decision: ProvisionDecision,
  code: AccountNativeProvisionCode,
  state: CleanupState<H>,
  ports: CapturedPorts,
): Promise<AccountNativeProvisionResult<ScopeStorageConnection>> {
  const cleaned = await runCleanup(state, ports);
  return cleaned.outcome === 'cleaned'
    ? attention(decision, code, null)
    : attention(
        decision,
        code === 'account_native_provision_schema_failed'
          ? code
          : 'account_native_provision_cleanup_required',
        cleanupTicket(state, ports),
      );
}

function safeDecision(value: ProvisionDecision | null): ProvisionDecision {
  return value ?? 'quarantine_ambiguous';
}

/**
 * Provisions or reopens at most one V2 storage candidate. Returned evidence is only
 * model/port evidence and never certifies storage erasure, full-device cleanup, or
 * production readiness.
 */
export async function provisionOrReopenV2<H extends object>(
  manifest: AccountNativeStorageManifest,
  selectedPlan: V2StoragePlan,
  ports: AccountNativeProvisionPorts<H>,
): Promise<AccountNativeProvisionResult<ScopeStorageConnection>> {
  let canonical: Readonly<{ manifest: AccountNativeStorageManifest; plan: V2StoragePlan }>;
  let capturedPorts: CapturedPorts;
  try {
    canonical = canonicalizeInputs(manifest, selectedPlan);
    capturedPorts = capturePorts(ports);
  } catch {
    return attention('quarantine_ambiguous', 'account_native_provision_invalid_input', null);
  }

  let rawLease: unknown;
  try {
    rawLease = await callPort(capturedPorts.acquire, [canonical.plan]);
  } catch {
    return attention('quarantine_unreadable', 'account_native_provision_observation_failed', null);
  }
  if (typeof rawLease !== 'object' || rawLease === null) {
    return attention('quarantine_unreadable', 'account_native_provision_observation_failed', null);
  }
  const state: CleanupState<H> = {
    lease: rawLease,
    candidate: null,
    connection: null,
    flight: null,
    cleanedResult: null,
  };

  let decision: ProvisionDecision | null = null;
  let keyHex: string | null = null;
  let databaseFamily: 'absent' | 'present' | 'unreadable';
  try {
    const keySelector = artifactSelector(
      canonical.plan,
      `v2.${canonical.plan.identity.kind}.key`,
    );
    const markerSelector = artifactSelector(
      canonical.plan,
      `v2.${canonical.plan.identity.kind}.retirement_marker`,
    );
    const lineage = canonical.plan.identity.kind === 'account'
      ? captureLineage(await callPort(capturedPorts.readLineage, [
          state.lease,
          artifactSelector(canonical.plan, 'v2.account.lineage'),
        ]))
      : null;
    const key = captureKeyRead(await callPort(capturedPorts.readKey, [
      state.lease, keySelector, KEY_POLICY,
    ]));
    keyHex = key.keyHex;
    const marker = requireMarker(await callPort(capturedPorts.readRetirement, [
      state.lease, markerSelector,
    ]));
    databaseFamily = requireFamily(await callPort(capturedPorts.inspectFamily, [
      state.lease, databaseSelectors(canonical.plan),
    ]));
    let observation: ProvisionObservation;
    if (canonical.plan.identity.kind === 'account') {
      if (lineage === null) throw new SafeProvisionFailure('account_native_provision_observation_failed');
      observation = Object.freeze({
        kind: 'account', lineage, key: key.state,
        retirementMarker: marker, databaseFamily,
      });
    } else {
      observation = Object.freeze({
        kind: 'guest', key: key.state,
        retirementMarker: marker, databaseFamily,
      });
    }
    decision = decideProvision(canonical.plan.identity, observation);

    if (!OPEN_DECISIONS.includes(decision)) {
      return await settlePreCandidateFailure(
        decision,
        'account_native_provision_attention_required',
        state,
        capturedPorts,
      );
    }

    if (keyHex === null) {
      if (decision !== 'provision_new' && decision !== 'provision_after_verified_erase') {
        throw new SafeProvisionFailure('account_native_provision_key_failed');
      }
      keyHex = randomKeyHex(await callPort(
        capturedPorts.generateKey,
        [],
        'account_native_provision_key_failed',
      ));
      await callPort(
        capturedPorts.writeKey,
        [state.lease, keySelector, keyHex, KEY_POLICY],
        'account_native_provision_key_failed',
      );
      const readback = captureKeyRead(await callPort(capturedPorts.readKey, [
        state.lease, keySelector, KEY_POLICY,
      ], 'account_native_provision_key_failed'));
      if (readback.state !== 'valid' || readback.keyHex !== keyHex) {
        throw new SafeProvisionFailure('account_native_provision_key_failed');
      }
    }

    const candidateValue = databaseFamily === 'present'
      ? await callPort(
          capturedPorts.openExisting,
          [state.lease, canonical.plan, keyHex],
          'account_native_provision_open_failed',
        )
      : await callPort(
          capturedPorts.createNew,
          [state.lease, canonical.plan, keyHex],
          'account_native_provision_open_failed',
        );
    const capturedCandidate = captureCandidate<H>(candidateValue);
    const candidate = capturedCandidate.state;
    state.candidate = candidate;
    if (!capturedCandidate.usable) {
      throw new SafeProvisionFailure('account_native_provision_open_failed');
    }

    const proof = await callPort(capturedPorts.prove, [
      state.lease,
      candidateValue,
      canonical.plan,
      keyHex,
    ], 'account_native_provision_proof_failed');
    if (proof !== true) throw new SafeProvisionFailure('account_native_provision_proof_failed');

    const scopeConnectionBundle = capturedCandidate.scopeConnectionBundle;
    if (scopeConnectionBundle === null) {
      throw new SafeProvisionFailure('account_native_provision_schema_failed');
    }
    let admittedConnection: ScopeStorageConnection;
    try {
      admittedConnection = databaseFamily === 'present'
        ? await verifyExistingAccountSqliteScopeConnection(
            canonical.manifest,
            canonical.plan,
            scopeConnectionBundle,
          )
        : await initializeNewAccountSqliteScopeConnection(
            canonical.manifest,
            canonical.plan,
            scopeConnectionBundle,
          );
    } catch {
      throw new SafeProvisionFailure('account_native_provision_schema_failed');
    }
    const capturedConnection = captureScopeConnection(admittedConnection);
    if (!capturedConnection.usable) {
      throw new SafeProvisionFailure('account_native_provision_schema_failed');
    }
    state.connection = capturedConnection.state;
    relinquishRawCandidate(candidate);
    state.candidate = null;

    if (canonical.plan.identity.kind === 'account'
      && LINEAGE_WRITE_DECISIONS.includes(decision)) {
      const lineageSelector = artifactSelector(canonical.plan, 'v2.account.lineage');
      await callPort(capturedPorts.writeLineage, [
        state.lease,
        lineageSelector,
        canonical.plan.identity.persistentLineage,
      ], 'account_native_provision_lineage_failed');
      const lineage = captureLineage(await callPort(capturedPorts.readLineage, [
        state.lease,
        lineageSelector,
      ], 'account_native_provision_lineage_failed'));
      if (lineage.kind !== 'stored'
        || lineage.value !== canonical.plan.identity.persistentLineage
        || lineage.state !== 'active') {
        throw new SafeProvisionFailure('account_native_provision_lineage_failed');
      }
    }

    const handle = capturedConnection.state.handle;
    if (handle === null) {
      throw new SafeProvisionFailure('account_native_provision_schema_failed');
    }
    const requiresHydration = databaseFamily === 'absent';
    if (!await releaseLease(state, capturedPorts)) {
      await cleanupCandidateOnly(state);
      return attention(
        decision,
        'account_native_provision_cleanup_required',
        cleanupTicket(state, capturedPorts),
      );
    }
    state.connection = null;
    return opened(decision, handle, requiresHydration);
  } catch (error) {
    const code = error instanceof SafeProvisionFailure
      ? error.code
      : state.candidate === null && state.connection === null
        ? 'account_native_provision_observation_failed'
        : 'account_native_provision_open_failed';
    return state.candidate === null && state.connection === null
      ? settlePreCandidateFailure(safeDecision(decision), code, state, capturedPorts)
      : settlePostCandidateFailure(safeDecision(decision), code, state, capturedPorts);
  }
}
