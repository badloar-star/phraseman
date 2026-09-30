import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { AccountScope } from '../modules/account-session-v2/account_session';
import {
  NativeStorageManifestError,
  classifyV2EraseReadback,
  decideProvision,
  deriveV2StorageIdentity,
  planV2Retirement,
  planV2StorageArtifacts,
  validateAccountNativeStorageManifest,
  type AccountNativeStorageManifest,
  type ArtifactReadback,
  type ProvisionObservation,
  type V2StorageIdentity,
  type V2StoragePlan,
} from '../modules/account-session-v2/native_storage_manifest';

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);
const SQLITE_ROOT = 'expo_sqlite_default_directory/accounts-v2' as const;

function rawManifest(): unknown {
  return JSON.parse(
    readFileSync(join(process.cwd(), 'config/account-native-storage-v2-manifest.json'), 'utf8'),
  );
}

function manifest(): AccountNativeStorageManifest {
  return validateAccountNativeStorageManifest(rawManifest());
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

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function expectCode(action: () => unknown, code: NativeStorageManifestError['code']): void {
  try {
    action();
    throw new Error('expected NativeStorageManifestError');
  } catch (error) {
    expect(error).toBeInstanceOf(NativeStorageManifestError);
    expect((error as NativeStorageManifestError).code).toBe(code);
  }
}

async function expectAsyncCode(
  action: () => Promise<unknown>,
  code: NativeStorageManifestError['code'],
): Promise<void> {
  try {
    await action();
    throw new Error('expected NativeStorageManifestError');
  } catch (error) {
    expect(error).toBeInstanceOf(NativeStorageManifestError);
    expect((error as NativeStorageManifestError).code).toBe(code);
  }
}

function absentReadback(plan: V2StoragePlan): ArtifactReadback[] {
  return plan.artifacts.map((artifact) =>
    artifact.id === 'v2.account.lineage'
      ? {
          id: 'v2.account.lineage' as const,
          selector: artifact.selector,
          state: 'lineage' as const,
          value: (plan.identity.kind === 'account' ? plan.identity.persistentLineage : 0) + 1,
          lineageState: 'erased_empty' as const,
        }
      : { id: artifact.id, selector: artifact.selector, state: 'absent' as const },
  );
}

function accountObservation(
  overrides: Partial<Extract<ProvisionObservation, { kind: 'account' }>> = {},
): Extract<ProvisionObservation, { kind: 'account' }> {
  return {
    kind: 'account',
    lineage: { kind: 'stored', value: 7, state: 'active' },
    key: 'valid',
    retirementMarker: 'absent',
    databaseFamily: 'present',
    ...overrides,
  };
}

describe('account native storage V2 manifest', () => {
  test('parses JSON then accepts only the exact closed V2 definition with incomplete legacy', () => {
    const raw = rawManifest();
    const validated = validateAccountNativeStorageManifest(raw);

    expect(validated).toEqual(raw);
    expect(validated.coverage).toEqual({
      v2Definition: 'closed_world',
      implementation: 'not_implemented',
      legacy: 'incomplete_unknown',
      mayCertifyV2ScopeErase: false,
      mayCertifyFullUserLocalWipe: false,
    });
    expect(validated.sqliteRoot).toBe(SQLITE_ROOT);
    expect((raw as { sqliteRoot?: unknown }).sqliteRoot).toBe(SQLITE_ROOT);
    expect(validated.artifacts).toHaveLength(13);
    expect(validated).not.toBe(raw);
    expect(validated.artifacts).not.toBe((raw as { artifacts: unknown }).artifacts);
    expect(Object.isFrozen(validated)).toBe(true);
    expect(Object.isFrozen(validated.hashing)).toBe(true);
    expect(Object.isFrozen(validated.coverage)).toBe(true);
    expect(Object.isFrozen(validated.artifacts)).toBe(true);
    expect(validated.artifacts.every(Object.isFrozen)).toBe(true);
    expect(Object.isFrozen(raw)).toBe(false);
  });

  test.each([
    ['old shared root', 'expo_sqlite_default_directory'],
    ['parent basename only', 'accounts-v2'],
    ['trailing slash', 'expo_sqlite_default_directory/accounts-v2/'],
    ['parent traversal', 'expo_sqlite_default_directory/../accounts-v2'],
    ['alternate case', 'expo_sqlite_default_directory/Accounts-V2'],
    ['backslash', 'expo_sqlite_default_directory\\accounts-v2'],
    ['absolute path', '/expo_sqlite_default_directory/accounts-v2'],
    ['nested child', 'expo_sqlite_default_directory/accounts-v2/extra'],
  ])('rejects noncanonical sqliteRoot: %s', (_label, sqliteRoot) => {
    const value = rawManifest() as { sqliteRoot: unknown };
    value.sqliteRoot = sqliteRoot;
    expectCode(() => validateAccountNativeStorageManifest(value), 'native_storage_manifest_invalid');
  });

  test.each([
    ['missing', (value: any) => value.artifacts.splice(2, 1)],
    ['duplicate', (value: any) => value.artifacts.splice(2, 0, clone(value.artifacts[1]))],
    ['unknown', (value: any) => { value.artifacts[2].id = 'v2.account.db.unknown'; }],
    ['reordered', (value: any) => { [value.artifacts[1], value.artifacts[2]] = [value.artifacts[2], value.artifacts[1]]; }],
    ['V2 certification', (value: any) => { value.coverage.mayCertifyV2ScopeErase = true; }],
    ['full wipe certification', (value: any) => { value.coverage.mayCertifyFullUserLocalWipe = true; }],
    ['extra top-level field', (value: any) => { value.directory = '/tmp'; }],
    ['extra artifact field', (value: any) => { value.artifacts[0].keyBytes = 'sentinel-secret'; }],
  ])('rejects %s manifest drift', (_label, mutate) => {
    const value = rawManifest() as any;
    mutate(value);
    expectCode(() => validateAccountNativeStorageManifest(value), 'native_storage_manifest_invalid');
  });

  test('rejects accessors without invoking getters and sanitizes manifest Proxy traps', () => {
    let getterCalls = 0;
    const withGetter = rawManifest() as Record<string, unknown>;
    Object.defineProperty(withGetter, 'namespace', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 'account_native_storage_v2';
      },
    });

    expectCode(() => validateAccountNativeStorageManifest(withGetter), 'native_storage_manifest_invalid');
    expect(getterCalls).toBe(0);

    const ownKeysTrap = new Proxy({}, { ownKeys: () => { throw new Error('manifest-sentinel'); } });
    const descriptorTrap = new Proxy(rawManifest() as object, {
      getOwnPropertyDescriptor: () => { throw new Error('descriptor-sentinel'); },
    });
    expectCode(() => validateAccountNativeStorageManifest(ownKeysTrap), 'native_storage_manifest_invalid');
    expectCode(() => validateAccountNativeStorageManifest(descriptorTrap), 'native_storage_manifest_invalid');
  });
});

describe('V2 storage identity and artifact plan', () => {
  test('keeps every SQLite artifact selector a bare filename under the dedicated root', () => {
    for (const planned of [
      planV2StorageArtifacts(manifest(), accountIdentity()),
      planV2StorageArtifacts(manifest(), guestIdentity()),
    ]) {
      for (const artifact of planned.artifacts.filter(({ medium }) => medium === 'sqlite_file')) {
        expect(artifact.selector).not.toMatch(/[\\/]/);
        expect(artifact.selector).toBe(artifact.selector.trim());
      }
    }
  });

  test.each([
    [{ kind: 'account', uid: 'raw-user', scopeKey: 'account:raw-user' }, 3, 'raw-user', 'account'],
    [{ kind: 'guest', installationId: 'raw-install', scopeKey: 'guest:raw-install' }, null, 'raw-install', 'guest'],
  ] as const)('digests the raw identifier exactly once for %s', async (scope, lineage, rawId, kind) => {
    const digest = jest.fn(async () => HASH_A);
    const result = await deriveV2StorageIdentity(scope, lineage, digest);

    expect(digest).toHaveBeenCalledTimes(1);
    expect(digest).toHaveBeenCalledWith(rawId);
    expect(digest).not.toHaveBeenCalledWith(scope.scopeKey);
    expect(result.kind).toBe(kind);
    expect(result.scopeKey).toBe(scope.scopeKey);
    expect(Object.isFrozen(result)).toBe(true);
  });

  test('snapshots validated scope before awaiting the digest', async () => {
    const mutableScope: { kind: 'account'; uid: string; scopeKey: `account:${string}` } = {
      kind: 'account' as const,
      uid: 'before',
      scopeKey: 'account:before',
    };
    let resolveDigest!: (value: string) => void;
    const digestPromise = new Promise<string>((resolve) => { resolveDigest = resolve; });
    const pending = deriveV2StorageIdentity(mutableScope, 9, async () => digestPromise);

    mutableScope.uid = 'after';
    mutableScope.scopeKey = 'account:after';
    resolveDigest(HASH_A);

    await expect(pending).resolves.toEqual({
      kind: 'account',
      scopeKey: 'account:before',
      hash: HASH_A,
      persistentLineage: 9,
    });
    expect(Object.isFrozen(mutableScope)).toBe(false);
  });

  test('sanitizes digest rejection and invalid digest to distinct finite codes', async () => {
    const scope: AccountScope = { kind: 'account', uid: 'secret-user', scopeKey: 'account:secret-user' };
    await expectAsyncCode(
      () => deriveV2StorageIdentity(scope, 1, async () => { throw new Error('digest-secret'); }),
      'native_storage_digest_failed',
    );
    await expectAsyncCode(
      () => deriveV2StorageIdentity(scope, 1, async () => `A${'a'.repeat(63)}`),
      'native_storage_digest_invalid',
    );
  });

  test.each([
    [{ kind: 'account', uid: '', scopeKey: 'account:' }, 1],
    [{ kind: 'account', uid: ' user', scopeKey: 'account: user' }, 1],
    [{ kind: 'account', uid: 'user', scopeKey: 'account:other' }, 1],
    [{ kind: 'account', uid: 'user', scopeKey: 'account:user', generation: 1 }, 1],
    [{ kind: 'account', uid: 'user', scopeKey: 'account:user', nonce: 'x' }, 1],
    [{ kind: 'guest', installationId: 'install', scopeKey: 'guest:install' }, 1],
    [{ kind: 'account', uid: 'user', scopeKey: 'account:user' }, null],
    [{ kind: 'account', uid: 'user', scopeKey: 'account:user' }, 0],
    [{ kind: 'account', uid: 'user', scopeKey: 'account:user' }, Number.MAX_SAFE_INTEGER + 1],
  ])('rejects invalid scope or lineage %#', async (scope, lineage) => {
    const expected = (scope as any).kind === 'guest' && lineage !== null
      || (scope as any).kind === 'account' && (lineage === null || !Number.isSafeInteger(lineage) || lineage === 0)
      ? 'native_storage_lineage_invalid'
      : 'native_storage_scope_invalid';
    await expectAsyncCode(
      () => deriveV2StorageIdentity(scope as AccountScope, lineage, async () => HASH_A),
      expected,
    );
  });

  test('rejects scope accessor and Proxy traps without invoking getters', async () => {
    let calls = 0;
    const accessorScope = { uid: 'user', scopeKey: 'account:user' } as Record<string, unknown>;
    Object.defineProperty(accessorScope, 'kind', {
      enumerable: true,
      get() { calls += 1; return 'account'; },
    });
    await expectAsyncCode(
      () => deriveV2StorageIdentity(accessorScope as AccountScope, 1, async () => HASH_A),
      'native_storage_scope_invalid',
    );
    expect(calls).toBe(0);

    const scopeTrap = new Proxy({}, { ownKeys: () => { throw new Error('scope-sentinel'); } });
    await expectAsyncCode(
      () => deriveV2StorageIdentity(scopeTrap as AccountScope, 1, async () => HASH_A),
      'native_storage_scope_invalid',
    );
  });

  test('uses all 64 hash characters and persistent lineage for account selectors', () => {
    const result = planV2StorageArtifacts(manifest(), accountIdentity(73));

    expect(result.artifacts).toHaveLength(7);
    expect(result.artifacts.map((artifact) => artifact.selector)).toEqual([
      `accounts_v2_account_lineage_${HASH_A}`,
      `accounts_v2_account_key_${HASH_A}_73`,
      `accounts_v2_account_retire_${HASH_A}`,
      `accounts-v2-a-${HASH_A}-73.db`,
      `accounts-v2-a-${HASH_A}-73.db-wal`,
      `accounts-v2-a-${HASH_A}-73.db-shm`,
      `accounts-v2-a-${HASH_A}-73.db-journal`,
    ]);
    expect(result.artifacts.every((artifact) => artifact.selector.includes(HASH_A))).toBe(true);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.identity)).toBe(true);
    expect(Object.isFrozen(result.artifacts)).toBe(true);
    expect(result.artifacts.every(Object.isFrozen)).toBe(true);
  });

  test('uses all 64 hash characters and no lineage for guest selectors', () => {
    const result = planV2StorageArtifacts(manifest(), guestIdentity());

    expect(result.artifacts).toHaveLength(6);
    expect(result.artifacts.map((artifact) => artifact.selector)).toEqual([
      `accounts_v2_guest_key_${HASH_B}`,
      `accounts_v2_guest_retire_${HASH_B}`,
      `accounts-v2-g-${HASH_B}.db`,
      `accounts-v2-g-${HASH_B}.db-wal`,
      `accounts-v2-g-${HASH_B}.db-shm`,
      `accounts-v2-g-${HASH_B}.db-journal`,
    ]);
    expect(result.artifacts.some((artifact) => artifact.selector.includes('_7'))).toBe(false);
  });

  test.each([
    { kind: 'account', scopeKey: 'account:user-7', hash: HASH_A },
    { kind: 'guest', scopeKey: 'guest:install-7', hash: HASH_B, persistentLineage: 1 },
    { kind: 'account', scopeKey: 'guest:user-7', hash: HASH_A, persistentLineage: 1 },
    { kind: 'account', scopeKey: 'account:user-7', hash: HASH_A.slice(1), persistentLineage: 1 },
    { kind: 'account', scopeKey: 'account:user-7', hash: HASH_A, persistentLineage: 1, nonce: 'x' },
  ])('rejects invalid runtime identity %#', (identity) => {
    expectCode(
      () => planV2StorageArtifacts(manifest(), identity as V2StorageIdentity),
      'native_storage_identity_invalid',
    );
  });

  test('copies identity and does not freeze planner inputs', () => {
    const input = { kind: 'account' as const, scopeKey: 'account:user-7' as const, hash: HASH_A, persistentLineage: 7 };
    const result = planV2StorageArtifacts(manifest(), input);

    expect(result.identity).not.toBe(input);
    expect(Object.isFrozen(input)).toBe(false);
  });

  test('resolves MAX_SAFE_INTEGER artifact selectors but rejects retirement overflow', () => {
    const maxIdentity = accountIdentity(Number.MAX_SAFE_INTEGER);
    const planned = planV2StorageArtifacts(manifest(), maxIdentity);

    expect(planned.artifacts.map((artifact) => artifact.selector)).toEqual([
      `accounts_v2_account_lineage_${HASH_A}`,
      `accounts_v2_account_key_${HASH_A}_${Number.MAX_SAFE_INTEGER}`,
      `accounts_v2_account_retire_${HASH_A}`,
      `accounts-v2-a-${HASH_A}-${Number.MAX_SAFE_INTEGER}.db`,
      `accounts-v2-a-${HASH_A}-${Number.MAX_SAFE_INTEGER}.db-wal`,
      `accounts-v2-a-${HASH_A}-${Number.MAX_SAFE_INTEGER}.db-shm`,
      `accounts-v2-a-${HASH_A}-${Number.MAX_SAFE_INTEGER}.db-journal`,
    ]);
    expectCode(() => planV2Retirement(maxIdentity), 'native_storage_lineage_invalid');
    expect(planV2Retirement(guestIdentity())).toEqual({
      identity: guestIdentity(),
      nextPersistentLineage: null,
    });
  });
});

describe('provision decision', () => {
  test.each([
    ['lineage', accountObservation({ lineage: { kind: 'unreadable' }, retirementMarker: 'present' })],
    ['key', accountObservation({ key: 'unreadable', retirementMarker: 'present' })],
    ['marker', accountObservation({ retirementMarker: 'unreadable' })],
    ['database', accountObservation({ databaseFamily: 'unreadable', retirementMarker: 'present' })],
  ])('gives unreadable %s first precedence', (_field, observation) => {
    expect(decideProvision(accountIdentity(), observation)).toBe('quarantine_unreadable');
  });

  test('applies marker lineage and key precedence in order', () => {
    expect(decideProvision(accountIdentity(), accountObservation({
      lineage: { kind: 'malformed' }, key: 'malformed', retirementMarker: 'present',
    }))).toBe('recovery_required');
    expect(decideProvision(accountIdentity(), accountObservation({
      lineage: { kind: 'malformed' }, key: 'malformed',
    }))).toBe('quarantine_lineage');
    expect(decideProvision(accountIdentity(), accountObservation({ key: 'malformed' }))).toBe('quarantine_key');
  });

  test.each([
    [{ kind: 'stored', value: 8, state: 'active' } as const, 7, 'quarantine_lineage'],
    [{ kind: 'absent' } as const, 2, 'quarantine_lineage'],
    [{ kind: 'absent' } as const, 1, 'provision_new'],
  ])('requires account lineage value equality and permits absent only for lineage one', (lineage, identityLineage, decision) => {
    expect(decideProvision(accountIdentity(identityLineage), accountObservation({
      lineage,
      key: 'absent',
      databaseFamily: 'absent',
    }))).toBe(decision);
  });

  test.each([
    [accountIdentity(1), accountObservation({ lineage: { kind: 'absent' }, key: 'absent', databaseFamily: 'absent' }), 'provision_new'],
    [accountIdentity(1), accountObservation({ lineage: { kind: 'absent' }, key: 'valid', databaseFamily: 'absent' }), 'resume_first_provision'],
    [accountIdentity(1), accountObservation({ lineage: { kind: 'absent' }, key: 'valid', databaseFamily: 'present' }), 'resume_first_provision'],
    [accountIdentity(), accountObservation(), 'reopen_existing'],
    [accountIdentity(), accountObservation({ databaseFamily: 'absent' }), 'empty_recreated_same_identity'],
    [accountIdentity(), accountObservation({ lineage: { kind: 'stored', value: 7, state: 'erased_empty' }, key: 'absent', databaseFamily: 'absent' }), 'provision_after_verified_erase'],
    [accountIdentity(), accountObservation({ lineage: { kind: 'stored', value: 7, state: 'erased_empty' }, databaseFamily: 'absent' }), 'resume_reprovision'],
    [accountIdentity(), accountObservation({ lineage: { kind: 'stored', value: 7, state: 'erased_empty' } }), 'resume_reprovision'],
    [guestIdentity(), { kind: 'guest', key: 'valid', retirementMarker: 'absent', databaseFamily: 'present' }, 'reopen_existing'],
    [guestIdentity(), { kind: 'guest', key: 'absent', retirementMarker: 'absent', databaseFamily: 'absent' }, 'provision_new'],
    [guestIdentity(), { kind: 'guest', key: 'valid', retirementMarker: 'absent', databaseFamily: 'absent' }, 'empty_recreated_same_identity'],
  ] as const)('matches exact success tuple %#', (identity, observation, decision) => {
    expect(decideProvision(identity, observation)).toBe(decision);
  });

  test.each([
    [accountIdentity(), accountObservation({ key: 'absent' })],
    [accountIdentity(), accountObservation({ lineage: { kind: 'stored', value: 7, state: 'erased_empty' }, key: 'absent', databaseFamily: 'present' })],
    [guestIdentity(), { kind: 'guest', key: 'absent', retirementMarker: 'absent', databaseFamily: 'present' }],
  ] as const)('quarantines well-formed non-allowlisted tuple %#', (identity, observation) => {
    expect(decideProvision(identity, observation)).toBe('quarantine_ambiguous');
  });

  test('exhaustively classifies every finite well-formed account and guest tuple', () => {
    const keys = ['absent', 'valid', 'malformed', 'unreadable'] as const;
    const markers = ['absent', 'present', 'unreadable'] as const;
    const databases = ['absent', 'present', 'unreadable'] as const;
    const accountCases = [
      { identityLineage: 1, lineage: { kind: 'absent' } as const },
      { identityLineage: 7, lineage: { kind: 'absent' } as const },
      { identityLineage: 7, lineage: { kind: 'malformed' } as const },
      { identityLineage: 7, lineage: { kind: 'unreadable' } as const },
      { identityLineage: 7, lineage: { kind: 'stored', value: 7, state: 'active' } as const },
      { identityLineage: 7, lineage: { kind: 'stored', value: 8, state: 'active' } as const },
      { identityLineage: 7, lineage: { kind: 'stored', value: 7, state: 'erased_empty' } as const },
      { identityLineage: 7, lineage: { kind: 'stored', value: 8, state: 'erased_empty' } as const },
    ];

    const expectedAccount = (
      identityLineage: number,
      lineage: (typeof accountCases)[number]['lineage'],
      key: (typeof keys)[number],
      marker: (typeof markers)[number],
      database: (typeof databases)[number],
    ): string => {
      if (lineage.kind === 'unreadable' || key === 'unreadable' || marker === 'unreadable' || database === 'unreadable') return 'quarantine_unreadable';
      if (marker === 'present') return 'recovery_required';
      if (lineage.kind === 'malformed' || lineage.kind === 'stored' && lineage.value !== identityLineage || lineage.kind === 'absent' && identityLineage !== 1) return 'quarantine_lineage';
      if (key === 'malformed') return 'quarantine_key';
      if (lineage.kind === 'absent' && key === 'absent' && database === 'absent') return 'provision_new';
      if (lineage.kind === 'absent' && key === 'valid') return 'resume_first_provision';
      if (lineage.kind === 'stored' && lineage.state === 'active' && key === 'valid' && database === 'present') return 'reopen_existing';
      if (lineage.kind === 'stored' && lineage.state === 'active' && key === 'valid' && database === 'absent') return 'empty_recreated_same_identity';
      if (lineage.kind === 'stored' && lineage.state === 'erased_empty' && key === 'absent' && database === 'absent') return 'provision_after_verified_erase';
      if (lineage.kind === 'stored' && lineage.state === 'erased_empty' && key === 'valid') return 'resume_reprovision';
      return 'quarantine_ambiguous';
    };

    for (const { identityLineage, lineage } of accountCases) {
      for (const key of keys) for (const retirementMarker of markers) for (const databaseFamily of databases) {
        const observation = { kind: 'account' as const, lineage, key, retirementMarker, databaseFamily };
        expect(decideProvision(accountIdentity(identityLineage), observation)).toBe(
          expectedAccount(identityLineage, lineage, key, retirementMarker, databaseFamily),
        );
      }
    }

    const expectedGuest = (
      key: (typeof keys)[number],
      marker: (typeof markers)[number],
      database: (typeof databases)[number],
    ): string => {
      if (key === 'unreadable' || marker === 'unreadable' || database === 'unreadable') return 'quarantine_unreadable';
      if (marker === 'present') return 'recovery_required';
      if (key === 'malformed') return 'quarantine_key';
      if (key === 'valid' && database === 'present') return 'reopen_existing';
      if (key === 'absent' && database === 'absent') return 'provision_new';
      if (key === 'valid' && database === 'absent') return 'empty_recreated_same_identity';
      return 'quarantine_ambiguous';
    };

    for (const key of keys) for (const retirementMarker of markers) for (const databaseFamily of databases) {
      const observation = { kind: 'guest' as const, key, retirementMarker, databaseFamily };
      expect(decideProvision(guestIdentity(), observation)).toBe(
        expectedGuest(key, retirementMarker, databaseFamily),
      );
    }
  });

  test('rejects observation kind mismatch extras and malformed stored lineage', () => {
    expectCode(
      () => decideProvision(accountIdentity(), { kind: 'guest', key: 'valid', retirementMarker: 'absent', databaseFamily: 'present' }),
      'native_storage_observation_invalid',
    );
    expectCode(
      () => decideProvision(guestIdentity(), { kind: 'guest', key: 'valid', retirementMarker: 'absent', databaseFamily: 'present', lineage: { kind: 'absent' } } as any),
      'native_storage_observation_invalid',
    );
    expectCode(
      () => decideProvision(accountIdentity(), accountObservation({ lineage: { kind: 'stored', value: 0, state: 'active' } })),
      'native_storage_observation_invalid',
    );
  });
});

describe('erase readback classifier', () => {
  test.each([
    ['partial', (plan: any) => { plan.artifacts.pop(); }],
    ['extra', (plan: any) => { plan.extra = true; }],
    ['reordered', (plan: any) => { [plan.artifacts[0], plan.artifacts[1]] = [plan.artifacts[1], plan.artifacts[0]]; }],
    ['field-altered', (plan: any) => { plan.artifacts[1].eraseOrder = 999; }],
    ['identity-altered', (plan: any) => { plan.identity.scopeKey = 'account:other'; }],
  ])('makes %s plan indeterminate', (_label, mutate) => {
    const canonical = planV2StorageArtifacts(manifest(), accountIdentity());
    const altered = clone(canonical) as any;
    mutate(altered);
    expect(classifyV2EraseReadback(manifest(), altered, absentReadback(canonical))).toMatchObject({
      outcome: 'v2_scope_readback_indeterminate',
      remainingIds: [],
    });
  });

  test('makes trapping plan identity inaccessible and indeterminate', () => {
    const planTrap = new Proxy({}, { getOwnPropertyDescriptor: () => { throw new Error('plan-sentinel'); } });
    expect(classifyV2EraseReadback(manifest(), planTrap as V2StoragePlan, [])).toMatchObject({
      outcome: 'v2_scope_readback_indeterminate',
      remainingIds: [],
    });
  });

  test.each([
    ['ownKeys', { ownKeys: () => { throw new Error('nested-own-keys-sentinel'); } }],
    ['descriptor', { getOwnPropertyDescriptor: () => { throw new Error('nested-descriptor-sentinel'); } }],
  ] as const)('makes nested identity %s trap indeterminate', (_label, handler) => {
    const canonical = planV2StorageArtifacts(manifest(), accountIdentity());
    const hostileIdentity = new Proxy(canonical.identity, handler);
    const hostilePlan = { ...canonical, identity: hostileIdentity } as V2StoragePlan;

    expect(() => classifyV2EraseReadback(manifest(), hostilePlan, absentReadback(canonical))).not.toThrow();
    expect(classifyV2EraseReadback(manifest(), hostilePlan, absentReadback(canonical))).toEqual({
      evidenceKind: 'readback_model_only',
      outcome: 'v2_scope_readback_indeterminate',
      authorizesNativeEraseSuccess: false,
      mayCertifyFullUserLocalWipe: false,
      remainingIds: [],
    });
  });

  test('rejects nested identity accessors without invoking getters', () => {
    const canonical = planV2StorageArtifacts(manifest(), accountIdentity());
    let getterCalls = 0;
    const hostileIdentity = { ...canonical.identity } as Record<string, unknown>;
    Object.defineProperty(hostileIdentity, 'hash', {
      enumerable: true,
      get() { getterCalls += 1; return HASH_A; },
    });
    const hostilePlan = { ...canonical, identity: hostileIdentity } as V2StoragePlan;

    expect(classifyV2EraseReadback(manifest(), hostilePlan, absentReadback(canonical)).outcome)
      .toBe('v2_scope_readback_indeterminate');
    expect(getterCalls).toBe(0);
  });

  test('snapshots a readable nested identity exactly once', () => {
    const canonical = planV2StorageArtifacts(manifest(), accountIdentity());
    let ownKeysCalls = 0;
    const unstableIdentity = new Proxy(canonical.identity, {
      ownKeys(target) {
        ownKeysCalls += 1;
        if (ownKeysCalls > 1) throw new Error('nested-second-read-sentinel');
        return Reflect.ownKeys(target);
      },
    });
    const unstablePlan = { ...canonical, identity: unstableIdentity } as V2StoragePlan;

    expect(classifyV2EraseReadback(manifest(), unstablePlan, absentReadback(canonical)).outcome)
      .toBe('v2_scope_absent_model');
    expect(ownKeysCalls).toBe(1);
  });

  test.each([
    { kind: 'account', scopeKey: 'account:user-7', hash: 'invalid', persistentLineage: 7 },
    { kind: 'account', scopeKey: 'account:user-7', hash: HASH_A },
    { kind: 'account', scopeKey: 'account:user-7', hash: HASH_A, persistentLineage: '7' },
  ])('throws a typed sanitized error for readable invalid identity %#', (identity) => {
    const canonical = planV2StorageArtifacts(manifest(), accountIdentity());
    const invalid = { ...canonical, identity } as unknown as V2StoragePlan;
    expectCode(
      () => classifyV2EraseReadback(manifest(), invalid, absentReadback(canonical)),
      'native_storage_identity_invalid',
    );
  });

  test('keeps MAX_SAFE_INTEGER erase readback indeterminate and non-authorizing', () => {
    const canonical = planV2StorageArtifacts(manifest(), accountIdentity(Number.MAX_SAFE_INTEGER));
    const observations = canonical.artifacts.map((artifact): ArtifactReadback =>
      artifact.id === 'v2.account.lineage'
        ? { id: 'v2.account.lineage', selector: artifact.selector, state: 'lineage', value: Number.MAX_SAFE_INTEGER, lineageState: 'erased_empty' }
        : { id: artifact.id, selector: artifact.selector, state: 'absent' as const },
    );

    expect(classifyV2EraseReadback(manifest(), canonical, observations)).toEqual({
      evidenceKind: 'readback_model_only',
      outcome: 'v2_scope_readback_indeterminate',
      authorizesNativeEraseSuccess: false,
      mayCertifyFullUserLocalWipe: false,
      remainingIds: [],
    });
  });

  test.each([
    ['empty', (_plan: V2StoragePlan, _observations: ArtifactReadback[]) => []],
    ['missing', (_plan: V2StoragePlan, observations: ArtifactReadback[]) => observations.slice(0, -1)],
    ['unknown', (_plan: V2StoragePlan, observations: ArtifactReadback[]) => observations.map((o, index) => index === 1 ? { ...o, id: 'v2.unknown' } : o)],
    ['duplicate', (_plan: V2StoragePlan, observations: ArtifactReadback[]) => observations.map((o, index) => index === 1 ? { ...o, id: observations[0].id } : o)],
    ['extra', (_plan: V2StoragePlan, observations: ArtifactReadback[]) => [...observations, observations[0]]],
    ['wrong selector', (_plan: V2StoragePlan, observations: ArtifactReadback[]) => observations.map((o, index) => index === 1 ? { ...o, selector: 'cross-scope' } : o)],
    ['reordered', (_plan: V2StoragePlan, observations: ArtifactReadback[]) => [observations[1], observations[0], ...observations.slice(2)]],
    ['extra field', (_plan: V2StoragePlan, observations: ArtifactReadback[]) => observations.map((o, index) => index === 1 ? { ...o, keyBytes: 'secret' } : o)],
    ['malformed', (_plan: V2StoragePlan, observations: ArtifactReadback[]) => observations.map((o, index) => index === 1 ? { ...o, state: 'malformed' as const } : o)],
    ['unreadable', (_plan: V2StoragePlan, observations: ArtifactReadback[]) => observations.map((o, index) => index === 1 ? { ...o, state: 'unreadable' as const } : o)],
  ])('makes %s observations indeterminate', (_label, mutate) => {
    const canonical = planV2StorageArtifacts(manifest(), accountIdentity());
    const observations = mutate(canonical, absentReadback(canonical)) as ArtifactReadback[];
    expect(classifyV2EraseReadback(manifest(), canonical, observations)).toMatchObject({
      outcome: 'v2_scope_readback_indeterminate',
      remainingIds: [],
    });
  });

  test.each([
    ['absent', (guard: any) => { guard.state = 'absent'; delete guard.value; delete guard.lineageState; }],
    ['wrong next value', (guard: any) => { guard.value += 1; }],
    ['wrong state', (guard: any) => { guard.lineageState = 'active'; }],
    ['malformed', (guard: any) => { guard.state = 'malformed'; delete guard.value; delete guard.lineageState; }],
    ['unreadable', (guard: any) => { guard.state = 'unreadable'; delete guard.value; delete guard.lineageState; }],
  ])('requires exact next erased_empty account guard: %s', (_label, mutate) => {
    const canonical = planV2StorageArtifacts(manifest(), accountIdentity());
    const observations = absentReadback(canonical) as any[];
    mutate(observations[0]);
    expect(classifyV2EraseReadback(manifest(), canonical, observations)).toMatchObject({
      outcome: 'v2_scope_readback_indeterminate',
      remainingIds: [],
    });
  });

  test('returns residue using only canonical IDs', () => {
    const canonical = planV2StorageArtifacts(manifest(), accountIdentity());
    const observations = absentReadback(canonical);
    observations[1] = { ...observations[1], state: 'present' } as ArtifactReadback;
    observations[3] = { ...observations[3], state: 'present' } as ArtifactReadback;

    expect(classifyV2EraseReadback(manifest(), canonical, observations)).toEqual({
      evidenceKind: 'readback_model_only',
      outcome: 'v2_scope_residue_model',
      authorizesNativeEraseSuccess: false,
      mayCertifyFullUserLocalWipe: false,
      remainingIds: ['v2.account.key', 'v2.account.db.main'],
    });
  });

  test.each([accountIdentity(), guestIdentity()])('returns deeply frozen non-authorizing absence evidence %#', (identity) => {
    const canonical = planV2StorageArtifacts(manifest(), identity);
    const result = classifyV2EraseReadback(manifest(), canonical, absentReadback(canonical));

    expect(result).toEqual({
      evidenceKind: 'readback_model_only',
      outcome: 'v2_scope_absent_model',
      authorizesNativeEraseSuccess: false,
      mayCertifyFullUserLocalWipe: false,
      remainingIds: [],
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.remainingIds)).toBe(true);
  });

  test('sanitizes observation accessors and Proxy traps as indeterminate without invoking getters', () => {
    const canonical = planV2StorageArtifacts(manifest(), guestIdentity());
    const observations = absentReadback(canonical) as Record<string, unknown>[];
    let calls = 0;
    Object.defineProperty(observations[0], 'state', {
      enumerable: true,
      get() { calls += 1; return 'absent'; },
    });
    expect(classifyV2EraseReadback(manifest(), canonical, observations as ArtifactReadback[]).outcome)
      .toBe('v2_scope_readback_indeterminate');
    expect(calls).toBe(0);

    const trap = new Proxy([], { ownKeys: () => { throw new Error('observation-sentinel'); } });
    expect(classifyV2EraseReadback(manifest(), canonical, trap as ArtifactReadback[]).outcome)
      .toBe('v2_scope_readback_indeterminate');
  });
});

describe('sanitized public errors', () => {
  test('exposes exactly name code and message with no stack cause or sentinel', () => {
    const direct = new NativeStorageManifestError('sentinel-arbitrary' as NativeStorageManifestError['code']);

    expect(Reflect.ownKeys(direct).sort()).toEqual(['code', 'message', 'name']);
    expect(direct).toEqual(expect.objectContaining({
      name: 'NativeStorageManifestError',
      code: 'native_storage_observation_invalid',
      message: 'native_storage_observation_invalid',
    }));
    expect('stack' in direct).toBe(false);
    expect('cause' in direct).toBe(false);
    expect(JSON.stringify(direct)).not.toContain('sentinel-arbitrary');
  });
});
