import type { AccountScope } from './account_session';

export type Sha256Hex = string;
export type PersistentLineage = number;
export type DigestSha256 = (value: string) => Promise<string>;
export type NativeStorageManifestErrorCode =
  | 'native_storage_manifest_invalid' | 'native_storage_scope_invalid'
  | 'native_storage_lineage_invalid' | 'native_storage_digest_failed'
  | 'native_storage_digest_invalid' | 'native_storage_identity_invalid'
  | 'native_storage_observation_invalid';

const ERROR_CODES: readonly NativeStorageManifestErrorCode[] = Object.freeze([
  'native_storage_manifest_invalid', 'native_storage_scope_invalid',
  'native_storage_lineage_invalid', 'native_storage_digest_failed',
  'native_storage_digest_invalid', 'native_storage_identity_invalid',
  'native_storage_observation_invalid',
]);

export class NativeStorageManifestError extends Error {
  readonly code: NativeStorageManifestErrorCode;

  constructor(code: NativeStorageManifestErrorCode) {
    const safeCode: NativeStorageManifestErrorCode = (ERROR_CODES as readonly unknown[]).includes(code)
      ? code
      : 'native_storage_observation_invalid';
    super(safeCode);
    this.name = 'NativeStorageManifestError';
    this.code = safeCode;
    delete this.stack;
  }
}

export type AccountNativeStorageManifest = Readonly<{
  manifestVersion: 1;
  namespace: 'account_native_storage_v2';
  hashing: Readonly<{ algorithm: 'SHA-256'; encoding: 'lower_hex'; characters: 64 }>;
  secureStoreService: 'phraseman.account_native_storage.v2';
  sqliteRoot: 'expo_sqlite_default_directory/accounts-v2';
  coverage: Readonly<{ v2Definition: 'closed_world'; implementation: 'not_implemented'; legacy: 'incomplete_unknown'; mayCertifyV2ScopeErase: false; mayCertifyFullUserLocalWipe: false }>;
  artifacts: readonly Readonly<{ id: string; scope: 'account' | 'guest'; medium: 'secure_store' | 'sqlite_file'; selectorTemplate: string; eraseOrder: number; requiredAbsentForV2Erase: boolean }>[];
}>;
export type V2StorageIdentity =
  | Readonly<{ kind: 'account'; scopeKey: `account:${string}`; hash: Sha256Hex; persistentLineage: PersistentLineage }>
  | Readonly<{ kind: 'guest'; scopeKey: `guest:${string}`; hash: Sha256Hex }>;
export type PlannedArtifact = Readonly<{ id: string; medium: 'secure_store' | 'sqlite_file'; selector: string; eraseOrder: number; requiredAbsentForV2Erase: boolean }>;
export type V2StoragePlan = Readonly<{ manifestVersion: 1; scopeKey: AccountScope['scopeKey']; identity: V2StorageIdentity; artifacts: readonly PlannedArtifact[] }>;
export type V2RetirementPlan = Readonly<{ identity: V2StorageIdentity; nextPersistentLineage: number | null }>;
export type ArtifactReadback = Readonly<{ id: string; selector: string; state: 'absent' | 'present' | 'malformed' | 'unreadable' }> | Readonly<{ id: 'v2.account.lineage'; selector: string; state: 'lineage'; value: number; lineageState: 'active' | 'erased_empty' }>;
export type AccountLineageObservation = Readonly<{ kind: 'absent' | 'malformed' | 'unreadable' }> | Readonly<{ kind: 'stored'; value: number; state: 'active' | 'erased_empty' }>;
export type ProvisionObservation =
  | Readonly<{ kind: 'account'; lineage: AccountLineageObservation; key: 'absent' | 'valid' | 'malformed' | 'unreadable'; retirementMarker: 'absent' | 'present' | 'unreadable'; databaseFamily: 'absent' | 'present' | 'unreadable' }>
  | Readonly<{ kind: 'guest'; key: 'absent' | 'valid' | 'malformed' | 'unreadable'; retirementMarker: 'absent' | 'present' | 'unreadable'; databaseFamily: 'absent' | 'present' | 'unreadable' }>;
export type ProvisionDecision = 'provision_new' | 'resume_first_provision' | 'reopen_existing' | 'provision_after_verified_erase' | 'resume_reprovision' | 'empty_recreated_same_identity' | 'recovery_required' | 'quarantine_ambiguous' | 'quarantine_key' | 'quarantine_lineage' | 'quarantine_unreadable';
type V2EraseReadbackClassification = Readonly<{ evidenceKind: 'readback_model_only'; outcome: 'v2_scope_absent_model' | 'v2_scope_residue_model' | 'v2_scope_readback_indeterminate'; authorizesNativeEraseSuccess: false; mayCertifyFullUserLocalWipe: false; remainingIds: readonly string[] }>;

type DataSnapshot = Readonly<{ keys: readonly string[]; values: Readonly<Record<string, unknown>> }>;

function fail(code: NativeStorageManifestErrorCode): never {
  throw new NativeStorageManifestError(code);
}

function snapshotData(value: unknown, code: NativeStorageManifestErrorCode): DataSnapshot {
  try {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) fail(code);
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.some((key) => typeof key !== 'string')) fail(code);
    const keys = ownKeys as string[];
    const values: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined || !('value' in descriptor)) fail(code);
      values[key] = descriptor.value;
    }
    return { keys, values };
  } catch {
    fail(code);
  }
}

function trySnapshotData(value: unknown): DataSnapshot | null {
  try {
    return snapshotData(value, 'native_storage_observation_invalid');
  } catch {
    return null;
  }
}

function exactKeys(snapshot: DataSnapshot, expected: readonly string[]): boolean {
  return snapshot.keys.length === expected.length && expected.every((key) => snapshot.keys.includes(key));
}

function requireRecord(value: unknown, keys: readonly string[], code: NativeStorageManifestErrorCode): Readonly<Record<string, unknown>> {
  const snapshot = snapshotData(value, code);
  if (!exactKeys(snapshot, keys)) fail(code);
  return snapshot.values;
}

function snapshotArray(value: unknown, code: NativeStorageManifestErrorCode): readonly unknown[] {
  try {
    if (!Array.isArray(value)) fail(code);
    const ownKeys = Reflect.ownKeys(value);
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length');
    if (lengthDescriptor === undefined || !('value' in lengthDescriptor)
      || !Number.isSafeInteger(lengthDescriptor.value) || lengthDescriptor.value < 0) fail(code);
    const length = lengthDescriptor.value as number;
    const expectedKeys = [...Array.from({ length }, (_, index) => String(index)), 'length'];
    if (ownKeys.length !== expectedKeys.length || expectedKeys.some((key) => !ownKeys.includes(key))) fail(code);
    const copy: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (descriptor === undefined || !('value' in descriptor)) fail(code);
      copy.push(descriptor.value);
    }
    return copy;
  } catch {
    fail(code);
  }
}

const ARTIFACTS = Object.freeze([
  ['v2.account.lineage', 'account', 'secure_store', 'accounts_v2_account_lineage_{hash}', 0, false],
  ['v2.account.key', 'account', 'secure_store', 'accounts_v2_account_key_{hash}_{lineage}', 40, true],
  ['v2.account.retirement_marker', 'account', 'secure_store', 'accounts_v2_account_retire_{hash}', 70, true],
  ['v2.account.db.main', 'account', 'sqlite_file', 'accounts-v2-a-{hash}-{lineage}.db', 50, true],
  ['v2.account.db.wal', 'account', 'sqlite_file', 'accounts-v2-a-{hash}-{lineage}.db-wal', 51, true],
  ['v2.account.db.shm', 'account', 'sqlite_file', 'accounts-v2-a-{hash}-{lineage}.db-shm', 52, true],
  ['v2.account.db.journal', 'account', 'sqlite_file', 'accounts-v2-a-{hash}-{lineage}.db-journal', 53, true],
  ['v2.guest.key', 'guest', 'secure_store', 'accounts_v2_guest_key_{hash}', 40, true],
  ['v2.guest.retirement_marker', 'guest', 'secure_store', 'accounts_v2_guest_retire_{hash}', 70, true],
  ['v2.guest.db.main', 'guest', 'sqlite_file', 'accounts-v2-g-{hash}.db', 50, true],
  ['v2.guest.db.wal', 'guest', 'sqlite_file', 'accounts-v2-g-{hash}.db-wal', 51, true],
  ['v2.guest.db.shm', 'guest', 'sqlite_file', 'accounts-v2-g-{hash}.db-shm', 52, true],
  ['v2.guest.db.journal', 'guest', 'sqlite_file', 'accounts-v2-g-{hash}.db-journal', 53, true],
] as const);

function validTrimExact(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.trim() === value;
}

function validPositiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}

function validateArtifact(value: unknown, index: number): AccountNativeStorageManifest['artifacts'][number] {
  const fields = requireRecord(value, ['id', 'scope', 'medium', 'selectorTemplate', 'eraseOrder', 'requiredAbsentForV2Erase'], 'native_storage_manifest_invalid');
  const expected = ARTIFACTS[index];
  if (expected === undefined
    || fields.id !== expected[0] || fields.scope !== expected[1] || fields.medium !== expected[2]
    || fields.selectorTemplate !== expected[3] || fields.eraseOrder !== expected[4]
    || fields.requiredAbsentForV2Erase !== expected[5]) fail('native_storage_manifest_invalid');
  return Object.freeze({ id: expected[0], scope: expected[1], medium: expected[2], selectorTemplate: expected[3], eraseOrder: expected[4], requiredAbsentForV2Erase: expected[5] });
}

export function validateAccountNativeStorageManifest(value: unknown): AccountNativeStorageManifest {
  const fields = requireRecord(value, ['manifestVersion', 'namespace', 'hashing', 'secureStoreService', 'sqliteRoot', 'coverage', 'artifacts'], 'native_storage_manifest_invalid');
  const hashing = requireRecord(fields.hashing, ['algorithm', 'encoding', 'characters'], 'native_storage_manifest_invalid');
  const coverage = requireRecord(fields.coverage, ['v2Definition', 'implementation', 'legacy', 'mayCertifyV2ScopeErase', 'mayCertifyFullUserLocalWipe'], 'native_storage_manifest_invalid');
  const artifacts = snapshotArray(fields.artifacts, 'native_storage_manifest_invalid');
  if (fields.manifestVersion !== 1 || fields.namespace !== 'account_native_storage_v2'
    || fields.secureStoreService !== 'phraseman.account_native_storage.v2'
    || fields.sqliteRoot !== 'expo_sqlite_default_directory/accounts-v2'
    || hashing.algorithm !== 'SHA-256' || hashing.encoding !== 'lower_hex' || hashing.characters !== 64
    || coverage.v2Definition !== 'closed_world' || coverage.implementation !== 'not_implemented'
    || coverage.legacy !== 'incomplete_unknown' || coverage.mayCertifyV2ScopeErase !== false
    || coverage.mayCertifyFullUserLocalWipe !== false || artifacts.length !== ARTIFACTS.length) fail('native_storage_manifest_invalid');
  return Object.freeze({
    manifestVersion: 1, namespace: 'account_native_storage_v2',
    hashing: Object.freeze({ algorithm: 'SHA-256', encoding: 'lower_hex', characters: 64 }),
    secureStoreService: 'phraseman.account_native_storage.v2', sqliteRoot: 'expo_sqlite_default_directory/accounts-v2',
    coverage: Object.freeze({ v2Definition: 'closed_world', implementation: 'not_implemented', legacy: 'incomplete_unknown', mayCertifyV2ScopeErase: false, mayCertifyFullUserLocalWipe: false }),
    artifacts: Object.freeze(artifacts.map(validateArtifact)),
  });
}

function validateScope(value: unknown): AccountScope {
  const snapshot = snapshotData(value, 'native_storage_scope_invalid');
  if (snapshot.values.kind === 'account' && exactKeys(snapshot, ['kind', 'uid', 'scopeKey'])
    && validTrimExact(snapshot.values.uid) && snapshot.values.scopeKey === `account:${snapshot.values.uid}`) {
    return Object.freeze({ kind: 'account', uid: snapshot.values.uid, scopeKey: snapshot.values.scopeKey as `account:${string}` });
  }
  if (snapshot.values.kind === 'guest' && exactKeys(snapshot, ['kind', 'installationId', 'scopeKey'])
    && validTrimExact(snapshot.values.installationId) && snapshot.values.scopeKey === `guest:${snapshot.values.installationId}`) {
    return Object.freeze({ kind: 'guest', installationId: snapshot.values.installationId, scopeKey: snapshot.values.scopeKey as `guest:${string}` });
  }
  fail('native_storage_scope_invalid');
}

function validateIdentity(value: unknown): V2StorageIdentity {
  const snapshot = snapshotData(value, 'native_storage_identity_invalid');
  const hash = snapshot.values.hash;
  if (typeof hash !== 'string' || !/^[0-9a-f]{64}$/.test(hash)) fail('native_storage_identity_invalid');
  if (snapshot.values.kind === 'account' && exactKeys(snapshot, ['kind', 'scopeKey', 'hash', 'persistentLineage'])
    && validTrimExact(snapshot.values.scopeKey) && snapshot.values.scopeKey.startsWith('account:')
    && snapshot.values.scopeKey.length > 'account:'.length && validPositiveSafeInteger(snapshot.values.persistentLineage)) {
    return Object.freeze({ kind: 'account', scopeKey: snapshot.values.scopeKey as `account:${string}`, hash, persistentLineage: snapshot.values.persistentLineage });
  }
  if (snapshot.values.kind === 'guest' && exactKeys(snapshot, ['kind', 'scopeKey', 'hash'])
    && validTrimExact(snapshot.values.scopeKey) && snapshot.values.scopeKey.startsWith('guest:')
    && snapshot.values.scopeKey.length > 'guest:'.length) {
    return Object.freeze({ kind: 'guest', scopeKey: snapshot.values.scopeKey as `guest:${string}`, hash });
  }
  fail('native_storage_identity_invalid');
}

export async function deriveV2StorageIdentity(scope: AccountScope, persistentLineage: number | null, digestSha256: DigestSha256): Promise<V2StorageIdentity> {
  const selected = validateScope(scope);
  if (selected.kind === 'account') {
    if (!validPositiveSafeInteger(persistentLineage)) fail('native_storage_lineage_invalid');
  } else if (persistentLineage !== null) fail('native_storage_lineage_invalid');
  const rawId = selected.kind === 'account' ? selected.uid : selected.installationId;
  let hash: unknown;
  try {
    hash = await digestSha256(rawId);
  } catch {
    fail('native_storage_digest_failed');
  }
  if (typeof hash !== 'string' || !/^[0-9a-f]{64}$/.test(hash)) fail('native_storage_digest_invalid');
  return selected.kind === 'account'
    ? Object.freeze({ kind: 'account', scopeKey: selected.scopeKey, hash, persistentLineage: persistentLineage as number })
    : Object.freeze({ kind: 'guest', scopeKey: selected.scopeKey, hash });
}

function assertRetirable(identity: V2StorageIdentity): void {
  if (identity.kind === 'account' && identity.persistentLineage >= Number.MAX_SAFE_INTEGER) fail('native_storage_lineage_invalid');
}

export function planV2StorageArtifacts(manifest: AccountNativeStorageManifest, identity: V2StorageIdentity): V2StoragePlan {
  const checkedManifest = validateAccountNativeStorageManifest(manifest);
  const checkedIdentity = validateIdentity(identity);
  const planned = checkedManifest.artifacts.filter((artifact) => artifact.scope === checkedIdentity.kind)
    .map((artifact): PlannedArtifact => Object.freeze({
      id: artifact.id, medium: artifact.medium,
      selector: artifact.selectorTemplate.replace('{hash}', checkedIdentity.hash)
        .replace('{lineage}', checkedIdentity.kind === 'account' ? String(checkedIdentity.persistentLineage) : ''),
      eraseOrder: artifact.eraseOrder, requiredAbsentForV2Erase: artifact.requiredAbsentForV2Erase,
    }));
  return Object.freeze({ manifestVersion: 1, scopeKey: checkedIdentity.scopeKey, identity: checkedIdentity, artifacts: Object.freeze(planned) });
}

export function planV2Retirement(identity: V2StorageIdentity): V2RetirementPlan {
  const checkedIdentity = validateIdentity(identity);
  assertRetirable(checkedIdentity);
  return Object.freeze({ identity: checkedIdentity, nextPersistentLineage: checkedIdentity.kind === 'account' ? checkedIdentity.persistentLineage + 1 : null });
}

function validateLineageObservation(value: unknown): AccountLineageObservation {
  const snapshot = snapshotData(value, 'native_storage_observation_invalid');
  if ((snapshot.values.kind === 'absent' || snapshot.values.kind === 'malformed' || snapshot.values.kind === 'unreadable')
    && exactKeys(snapshot, ['kind'])) return Object.freeze({ kind: snapshot.values.kind });
  if (snapshot.values.kind === 'stored' && exactKeys(snapshot, ['kind', 'value', 'state'])
    && validPositiveSafeInteger(snapshot.values.value)
    && (snapshot.values.state === 'active' || snapshot.values.state === 'erased_empty')) {
    return Object.freeze({ kind: 'stored', value: snapshot.values.value, state: snapshot.values.state });
  }
  fail('native_storage_observation_invalid');
}

function validateObservation(value: unknown): ProvisionObservation {
  const snapshot = snapshotData(value, 'native_storage_observation_invalid');
  const validKey = snapshot.values.key === 'absent' || snapshot.values.key === 'valid' || snapshot.values.key === 'malformed' || snapshot.values.key === 'unreadable';
  const validMarker = snapshot.values.retirementMarker === 'absent' || snapshot.values.retirementMarker === 'present' || snapshot.values.retirementMarker === 'unreadable';
  const validDatabase = snapshot.values.databaseFamily === 'absent' || snapshot.values.databaseFamily === 'present' || snapshot.values.databaseFamily === 'unreadable';
  if (!validKey || !validMarker || !validDatabase) fail('native_storage_observation_invalid');
  const key = snapshot.values.key as ProvisionObservation['key'];
  const retirementMarker = snapshot.values.retirementMarker as ProvisionObservation['retirementMarker'];
  const databaseFamily = snapshot.values.databaseFamily as ProvisionObservation['databaseFamily'];
  if (snapshot.values.kind === 'account' && exactKeys(snapshot, ['kind', 'lineage', 'key', 'retirementMarker', 'databaseFamily'])) {
    return Object.freeze({ kind: 'account', lineage: validateLineageObservation(snapshot.values.lineage), key, retirementMarker, databaseFamily });
  }
  if (snapshot.values.kind === 'guest' && exactKeys(snapshot, ['kind', 'key', 'retirementMarker', 'databaseFamily'])) {
    return Object.freeze({ kind: 'guest', key, retirementMarker, databaseFamily });
  }
  fail('native_storage_observation_invalid');
}

export function decideProvision(identity: V2StorageIdentity, observation: ProvisionObservation): ProvisionDecision {
  const checkedIdentity = validateIdentity(identity);
  const checked = validateObservation(observation);
  if (checked.kind !== checkedIdentity.kind) fail('native_storage_observation_invalid');
  if (checked.key === 'unreadable' || checked.retirementMarker === 'unreadable' || checked.databaseFamily === 'unreadable'
    || checked.kind === 'account' && checked.lineage.kind === 'unreadable') return 'quarantine_unreadable';
  if (checked.retirementMarker === 'present') return 'recovery_required';
  if (checked.kind === 'account' && checkedIdentity.kind === 'account') {
    const lineage = checked.lineage;
    if (lineage.kind === 'malformed' || lineage.kind === 'stored' && lineage.value !== checkedIdentity.persistentLineage
      || lineage.kind === 'absent' && checkedIdentity.persistentLineage !== 1) return 'quarantine_lineage';
  }
  if (checked.key === 'malformed') return 'quarantine_key';
  if (checked.kind === 'guest') {
    if (checked.key === 'valid' && checked.databaseFamily === 'present') return 'reopen_existing';
    if (checked.key === 'absent' && checked.databaseFamily === 'absent') return 'provision_new';
    if (checked.key === 'valid' && checked.databaseFamily === 'absent') return 'empty_recreated_same_identity';
    return 'quarantine_ambiguous';
  }
  const lineage = checked.lineage;
  if (lineage.kind === 'absent' && checked.key === 'absent' && checked.databaseFamily === 'absent') return 'provision_new';
  if (lineage.kind === 'absent' && checked.key === 'valid') return 'resume_first_provision';
  if (lineage.kind === 'stored' && lineage.state === 'active' && checked.key === 'valid') {
    return checked.databaseFamily === 'present' ? 'reopen_existing' : 'empty_recreated_same_identity';
  }
  if (lineage.kind === 'stored' && lineage.state === 'erased_empty' && checked.key === 'absent' && checked.databaseFamily === 'absent') return 'provision_after_verified_erase';
  if (lineage.kind === 'stored' && lineage.state === 'erased_empty' && checked.key === 'valid') return 'resume_reprovision';
  return 'quarantine_ambiguous';
}

function classification(outcome: V2EraseReadbackClassification['outcome'], remainingIds: readonly string[] = []): V2EraseReadbackClassification {
  return Object.freeze({ evidenceKind: 'readback_model_only', outcome, authorizesNativeEraseSuccess: false, mayCertifyFullUserLocalWipe: false, remainingIds: Object.freeze([...remainingIds]) });
}

function sameIdentity(snapshot: DataSnapshot, right: V2StorageIdentity): boolean {
  const keys = right.kind === 'account' ? ['kind', 'scopeKey', 'hash', 'persistentLineage'] : ['kind', 'scopeKey', 'hash'];
  return exactKeys(snapshot, keys) && keys.every((key) => snapshot.values[key] === right[key as keyof V2StorageIdentity]);
}

function planMatches(snapshot: DataSnapshot, identitySnapshot: DataSnapshot, canonical: V2StoragePlan): boolean {
  if (!exactKeys(snapshot, ['manifestVersion', 'scopeKey', 'identity', 'artifacts'])
    || snapshot.values.manifestVersion !== canonical.manifestVersion || snapshot.values.scopeKey !== canonical.scopeKey
    || !sameIdentity(identitySnapshot, canonical.identity)) return false;
  let artifacts: readonly unknown[];
  try {
    artifacts = snapshotArray(snapshot.values.artifacts, 'native_storage_observation_invalid');
  } catch {
    return false;
  }
  return artifacts.length === canonical.artifacts.length && artifacts.every((value, index) => {
    const artifact = trySnapshotData(value);
    const expected = canonical.artifacts[index];
    return artifact !== null && exactKeys(artifact, ['id', 'medium', 'selector', 'eraseOrder', 'requiredAbsentForV2Erase'])
      && artifact.values.id === expected.id && artifact.values.medium === expected.medium
      && artifact.values.selector === expected.selector && artifact.values.eraseOrder === expected.eraseOrder
      && artifact.values.requiredAbsentForV2Erase === expected.requiredAbsentForV2Erase;
  });
}

export function classifyV2EraseReadback(manifest: AccountNativeStorageManifest, plan: V2StoragePlan, observations: readonly ArtifactReadback[]): V2EraseReadbackClassification {
  const checkedManifest = validateAccountNativeStorageManifest(manifest);
  const planSnapshot = trySnapshotData(plan);
  if (planSnapshot === null || !planSnapshot.keys.includes('identity')) return classification('v2_scope_readback_indeterminate');
  const identitySnapshot = trySnapshotData(planSnapshot.values.identity);
  if (identitySnapshot === null) return classification('v2_scope_readback_indeterminate');
  const identity = validateIdentity(identitySnapshot.values);
  const canonical = planV2StorageArtifacts(checkedManifest, identity);
  if (!planMatches(planSnapshot, identitySnapshot, canonical)) return classification('v2_scope_readback_indeterminate');
  if (identity.kind === 'account' && identity.persistentLineage >= Number.MAX_SAFE_INTEGER) {
    return classification('v2_scope_readback_indeterminate');
  }
  let readbacks: readonly unknown[];
  try {
    readbacks = snapshotArray(observations, 'native_storage_observation_invalid');
  } catch {
    return classification('v2_scope_readback_indeterminate');
  }
  if (readbacks.length !== canonical.artifacts.length) return classification('v2_scope_readback_indeterminate');
  const remaining: string[] = [];
  for (let index = 0; index < readbacks.length; index += 1) {
    const readback = trySnapshotData(readbacks[index]);
    const artifact = canonical.artifacts[index];
    if (readback === null || readback.values.id !== artifact.id || readback.values.selector !== artifact.selector) return classification('v2_scope_readback_indeterminate');
    if (artifact.id === 'v2.account.lineage') {
      if (!exactKeys(readback, ['id', 'selector', 'state', 'value', 'lineageState'])
        || readback.values.state !== 'lineage' || readback.values.lineageState !== 'erased_empty'
        || identity.kind !== 'account' || readback.values.value !== identity.persistentLineage + 1) return classification('v2_scope_readback_indeterminate');
      continue;
    }
    if (!exactKeys(readback, ['id', 'selector', 'state'])
      || (readback.values.state !== 'absent' && readback.values.state !== 'present')) return classification('v2_scope_readback_indeterminate');
    if (readback.values.state === 'present' && artifact.requiredAbsentForV2Erase) remaining.push(artifact.id);
  }
  return remaining.length > 0 ? classification('v2_scope_residue_model', remaining) : classification('v2_scope_absent_model');
}
