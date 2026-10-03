import fs from 'fs';
import path from 'path';
import { accountAuthorityGeneration } from '../modules/account-authority-v2/account_authority_contract';
import {
  createAccountAuthorityProductionBootstrapRegistry,
  type AccountAuthorityProductionBootstrap,
} from '../modules/account-authority-v2/account_authority_bootstrap_contract';
import {
  parseAccountId,
  parseDeviceId,
  parseFirebaseAuthUid,
  parseOperationId,
  parseSessionId,
} from '../modules/account-authority-v2/account_authority_ids';
import type {
  AccountAuthorityLocalScope,
  AccountAuthorityLocalStorePort,
  AccountAuthorityOperationKind,
} from '../modules/account-authority-v2/account_authority_local_store';

const ROOT = path.resolve(__dirname, '..');
const read = (relative: string): string => fs.readFileSync(path.join(ROOT, relative), 'utf8');

function localStore(): AccountAuthorityLocalStorePort {
  let generation = accountAuthorityGeneration(0);
  let scope: AccountAuthorityLocalScope | null = null;
  const operations = new Map<string, AccountAuthorityOperationKind>();
  return {
    getAuthorityGeneration: () => generation,
    advanceAuthorityGeneration: (next) => {
      if (next.value > generation.value) generation = next;
      return generation;
    },
    getOperationKind: (operationId) => operations.get(operationId.value) ?? null,
    getDestructiveOperation: () => null,
    reserveOperation: (operationId, kind) => { operations.set(operationId.value, kind); },
    bindDeferredDestructiveOperation: () => undefined,
    markDestructiveOperationLocalApplied: () => undefined,
    completeDestructiveOperation: () => undefined,
    getOpenScope: () => scope,
    openScope: async (next) => { scope = next; },
    closeScope: async () => { scope = null; },
    clearAccountData: () => undefined,
    commitPreservedWrite: async () => undefined,
  };
}

function validBootstrap(
  overrides: Partial<AccountAuthorityProductionBootstrap> = {},
): AccountAuthorityProductionBootstrap {
  return {
    deviceId: parseDeviceId('device-production-a'),
    lease: {
      acquire: async () => ({
        accountId: parseAccountId('account-server-a'),
        sessionId: parseSessionId('session-server-a'),
      }),
      release: async () => undefined,
      deleteAccount: async () => undefined,
    },
    localStore: localStore(),
    providerSignOut: async () => undefined,
    ...overrides,
  };
}

describe('Account Authority production bootstrap contract', () => {
  test('fails closed while bootstrap is missing', () => {
    const registry = createAccountAuthorityProductionBootstrapRegistry();

    expect(() => registry.requireInstalled()).toThrow('account_authority_bootstrap_missing');
  });

  test.each(['deviceId', 'lease', 'localStore', 'providerSignOut'] as const)(
    'rejects a partial bootstrap missing %s without poisoning a later valid install',
    (field) => {
      const registry = createAccountAuthorityProductionBootstrapRegistry();
      const partial = { ...validBootstrap(), [field]: undefined };

      expect(() => registry.install(partial)).toThrow('account_authority_bootstrap_invalid');
      expect(() => registry.requireInstalled()).toThrow('account_authority_bootstrap_missing');
      expect(() => registry.install(validBootstrap())).not.toThrow();
    },
  );

  test('rejects rebound and keeps the first provider sign-out binding', async () => {
    const registry = createAccountAuthorityProductionBootstrapRegistry();
    const firstProviderSignOut = jest.fn(async () => undefined);
    const secondProviderSignOut = jest.fn(async () => undefined);
    registry.install(validBootstrap({ providerSignOut: firstProviderSignOut }));

    expect(() => registry.install(validBootstrap({ providerSignOut: secondProviderSignOut })))
      .toThrow('account_authority_bootstrap_already_installed');

    await registry.requireInstalled().providerSignOut();
    expect(firstProviderSignOut).toHaveBeenCalledTimes(1);
    expect(secondProviderSignOut).not.toHaveBeenCalled();
  });

  test('binds authenticated Firebase ownership only through the server lease accountId', async () => {
    const registry = createAccountAuthorityProductionBootstrapRegistry();
    const accountId = parseAccountId('account-server-owned');
    const sessionId = parseSessionId('session-server-issued');
    const acquire = jest.fn(async () => ({
      accountId,
      sessionId,
      credential: 'must-not-cross-bootstrap-boundary',
      firebaseAuthUid: 'must-not-be-returned',
    }));
    registry.install(validBootstrap({
      lease: {
        acquire,
        release: async () => undefined,
        deleteAccount: async () => undefined,
      },
    }));
    const request = Object.freeze({
      firebaseAuthUid: parseFirebaseAuthUid('firebase-auth-owner'),
      deviceId: parseDeviceId('device-production-a'),
      operationId: parseOperationId('operation-sign-in-a'),
    });

    const lease = await registry.requireInstalled().lease.acquire(request);

    expect(acquire).toHaveBeenCalledWith(request);
    expect(lease).toEqual({ accountId, sessionId });
    expect(Object.keys(lease)).toEqual(['accountId', 'sessionId']);
    expect(lease.accountId.value).not.toBe(request.firebaseAuthUid.value);
  });

  test('does not expose prebound account, session, credential, or extra port state', () => {
    const registry = createAccountAuthorityProductionBootstrapRegistry();
    const bootstrap = validBootstrap();
    Object.assign(bootstrap.lease, { credential: 'lease-secret' });
    Object.assign(bootstrap.localStore, { accountId: 'stale-account', sessionId: 'stale-session' });
    registry.install(bootstrap);

    const installed = registry.requireInstalled() as unknown as Record<string, unknown>;
    expect(Object.keys(installed).sort()).toEqual(['deviceId', 'lease', 'localStore', 'providerSignOut']);
    expect(installed).not.toHaveProperty('accountId');
    expect(installed).not.toHaveProperty('sessionId');
    expect(installed).not.toHaveProperty('credential');
    expect(installed.lease).not.toHaveProperty('credential');
    expect(installed.localStore).not.toHaveProperty('accountId');
    expect(installed.localStore).not.toHaveProperty('sessionId');
  });

  test('masks malformed lease payload details and does not publish partial ownership', async () => {
    const registry = createAccountAuthorityProductionBootstrapRegistry();
    registry.install(validBootstrap({
      lease: {
        acquire: async () => ({
          accountId: parseAccountId('account-sensitive'),
          sessionId: undefined,
          credential: 'credential-sensitive',
        }) as never,
        release: async () => undefined,
        deleteAccount: async () => undefined,
      },
    }));

    const failure = registry.requireInstalled().lease.acquire({
      firebaseAuthUid: parseFirebaseAuthUid('firebase-sensitive'),
      deviceId: parseDeviceId('device-production-a'),
      operationId: parseOperationId('operation-sensitive'),
    });

    await expect(failure).rejects.toThrow('account_authority_lease_invalid');
    await expect(failure).rejects.not.toThrow(/account-sensitive|credential-sensitive|firebase-sensitive/);
  });

  test('is consumed by the client runtime while global cutover remains hardcoded off', () => {
    const runtime = read('modules/account-session-v2/accounts_v2_client_runtime.ts');
    const gate = read('app/accounts_v2_client_flag.ts');

    expect(runtime).toContain("from '../account-authority-v2/account_authority_bootstrap_contract'");
    expect(runtime).toContain('createAccountAuthorityProductionBootstrapRegistry()');
    expect(runtime).toContain('accountAuthorityBootstrap.install(bootstrap)');
    expect(runtime).toContain('accountAuthorityBootstrap.requireInstalled()');
    expect(gate).toContain('const ACCOUNT_AUTHORITY_V2_GLOBAL_CUTOVER_ENABLED = false;');
    expect(gate).not.toContain('const ACCOUNT_AUTHORITY_V2_GLOBAL_CUTOVER_ENABLED = true;');
  });
});
