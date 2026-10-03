import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';
import type { Firestore } from 'firebase-admin/firestore';
import type {
  InstallationBindingPorts,
  InstallationBindingRecord,
  InstallationBindingStorePort,
} from './installation_binding_contract';
import { createInstallationBinding } from './installation_binding_contract';
import {
  createFirebaseInstallationBindingIdentityPort,
  createFirebaseInstallationBindingPorts,
  createFirestoreInstallationBindingStore,
  handleInstallationBindingCallable,
  type InstallationBindingCallableDependencies,
} from './installation_binding_callable';

const ROOT = path.resolve(__dirname, '../..');
const INSTALLATION_ID = '550e8400-e29b-41d4-a716-446655440000';

function memoryPorts(overrides: Partial<InstallationBindingPorts> = {}): InstallationBindingPorts {
  const records = new Map<string, InstallationBindingRecord>();
  const store: InstallationBindingStorePort = {
    async transact(bindingKey, transition) {
      const result = transition(records.get(bindingKey) ?? null);
      records.set(bindingKey, result.record);
      return result.response;
    },
  };
  return {
    hash: { digest: (value) => `hash(${value})` },
    ids: {
      issueBindingToken: () => 'server-binding-token',
      issueDeviceBindingId: () => 'server-device-binding-id',
    },
    clock: { nowMs: () => 1_000 },
    store,
    ...overrides,
  };
}

function enabledDependencies(
  ports: InstallationBindingPorts = memoryPorts(),
): InstallationBindingCallableDependencies {
  return { ports, rolloutEnabled: true };
}

describe('installation binding Firebase callable adapter', () => {
  test('keeps an explicit disabled gate ahead of the lazy Firestore adapter', async () => {
    const getPorts = jest.fn(() => memoryPorts());

    await expect(handleInstallationBindingCallable(
      { getPorts, rolloutEnabled: false },
      { auth: { uid: 'firebase-auth-a' }, data: { installationId: INSTALLATION_ID } },
    )).rejects.toMatchObject({
      code: 'failed-precondition',
      message: 'account_authority_installation_binding_disabled',
    });
    expect(getPorts).not.toHaveBeenCalled();
  });

  test('requires Firebase auth before touching the binding adapter', async () => {
    const getPorts = jest.fn(() => memoryPorts());

    await expect(handleInstallationBindingCallable(
      { getPorts, rolloutEnabled: true },
      { auth: null, data: { installationId: INSTALLATION_ID } },
    )).rejects.toMatchObject({
      code: 'unauthenticated',
      message: 'account_authority_auth_required',
    });
    expect(getPorts).not.toHaveBeenCalled();
  });

  test('derives the principal only from auth and preserves exact request validation', async () => {
    const digest = jest.fn((value: string) => `hash(${value})`);
    const ports = memoryPorts({ hash: { digest } });

    await expect(handleInstallationBindingCallable(
      enabledDependencies(ports),
      {
        auth: { uid: 'trusted-firebase-auth' },
        data: { installationId: INSTALLATION_ID, firebaseAuthUid: 'spoofed-client-auth' },
      },
    )).rejects.toMatchObject({
      code: 'invalid-argument',
      message: 'account_authority_installation_request_invalid',
    });
    expect(digest).not.toHaveBeenCalled();

    await expect(handleInstallationBindingCallable(
      enabledDependencies(ports),
      { auth: { uid: 'trusted-firebase-auth' }, data: { installationId: INSTALLATION_ID } },
    )).resolves.toEqual({
      bindingToken: 'server-binding-token',
      deviceBindingId: 'server-device-binding-id',
    });
    expect(digest.mock.calls.flat().join('\n')).toContain('trusted-firebase-auth');
    expect(digest.mock.calls.flat().join('\n')).not.toContain('spoofed-client-auth');
  });

  test('maps unexpected adapter failures to a redacted internal callable error', async () => {
    const rawFailure = new Error('users/raw-uid secret binding token');
    const store: InstallationBindingStorePort = {
      transact: async () => { throw rawFailure; },
    };

    await expect(handleInstallationBindingCallable(
      enabledDependencies(memoryPorts({ store })),
      { auth: { uid: 'trusted-firebase-auth' }, data: { installationId: INSTALLATION_ID } },
    )).rejects.toMatchObject({
      code: 'internal',
      message: 'account_authority_installation_binding_unavailable',
    });
  });

  test('reads, transitions, and writes only contract fields in one Firestore transaction', async () => {
    const current: InstallationBindingRecord = {
      schemaVersion: 'account-authority-installation-binding-record.v1',
      authUidHash: 'auth-hash',
      installationIdHash: 'installation-hash',
      bindingTokenHash: 'old-token-hash',
      deviceBindingId: 'device-binding-id',
      createdAtMs: 1_000,
      rotatedAtMs: 1_000,
      revokedAtMs: null,
    };
    const next: InstallationBindingRecord = { ...current, bindingTokenHash: 'new-token-hash', rotatedAtMs: 2_000 };
    const documentRef = Object.freeze({ path: 'binding/document' });
    const set = jest.fn();
    const remove = jest.fn();
    const transaction = {
      get: jest.fn(async () => ({ exists: true, data: () => ({ ...current }) })),
      set,
      delete: remove,
    };
    const runTransaction = jest.fn(async (work: (value: typeof transaction) => Promise<unknown>) => work(transaction));
    const doc = jest.fn(() => documentRef);
    const collection = jest.fn(() => ({ doc }));
    const db = { collection, runTransaction } as unknown as Firestore;
    const store = createFirestoreInstallationBindingStore(db);
    const transition = jest.fn((record: InstallationBindingRecord | null) => {
      expect(record).toEqual(current);
      return {
        record: next,
        response: { bindingToken: 'opaque-token', deviceBindingId: 'device-binding-id' },
      };
    });

    await expect(store.transact('binding-key', transition)).resolves.toEqual({
      bindingToken: 'opaque-token',
      deviceBindingId: 'device-binding-id',
    });
    expect(collection).toHaveBeenCalledWith('account_authority_installation_bindings_v1');
    expect(doc).toHaveBeenCalledWith('binding-key');
    expect(runTransaction).toHaveBeenCalledTimes(1);
    expect(transaction.get).toHaveBeenCalledWith(documentRef);
    expect(set.mock.calls[0]).toEqual([documentRef, next]);
    expect(Object.keys(set.mock.calls[0][1])).toEqual([
      'schemaVersion',
      'authUidHash',
      'installationIdHash',
      'bindingTokenHash',
      'deviceBindingId',
      'createdAtMs',
      'rotatedAtMs',
      'revokedAtMs',
    ]);
    expect(set.mock.calls[1][1]).toEqual({
      schemaVersion: 'account-authority-installation-binding-index.v1',
      bindingKey: 'binding-key',
      bindingTokenHash: 'new-token-hash',
      authUidHash: 'auth-hash',
      rotatedAtMs: 2_000,
    });
    expect(remove).toHaveBeenCalledTimes(1);
  });

  test('uses random UUID credentials and persists only their SHA-256 hashes', async () => {
    const set = jest.fn();
    const transaction = {
      get: jest.fn(async () => ({ exists: false, data: () => undefined })),
      set,
    };
    const db = {
      collection: () => ({ doc: () => Object.freeze({ path: 'binding/document' }) }),
      runTransaction: async (work: (value: typeof transaction) => Promise<unknown>) => work(transaction),
    } as unknown as Firestore;
    const ports = createFirebaseInstallationBindingPorts(db);

    const response = await createInstallationBinding(
      ports,
      'raw-firebase-auth-uid',
      { installationId: INSTALLATION_ID },
    );

    expect(response.bindingToken).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(response.deviceBindingId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    const stored = set.mock.calls[0][1] as InstallationBindingRecord;
    expect(stored.authUidHash).toBe(createHash('sha256').update(
      'account-authority-auth-uid.v1\u0000raw-firebase-auth-uid',
      'utf8',
    ).digest('hex'));
    expect(stored.installationIdHash).toBe(createHash('sha256').update(
      `account-authority-installation-id.v1\u0000${INSTALLATION_ID}`,
      'utf8',
    ).digest('hex'));
    expect(stored.bindingTokenHash).toBe(createHash('sha256').update(
      `account-authority-binding-token.v1\u0000${response.bindingToken}`,
      'utf8',
    ).digest('hex'));
    expect(JSON.stringify(stored)).not.toContain('raw-firebase-auth-uid');
    expect(JSON.stringify(stored)).not.toContain(INSTALLATION_ID);
    expect(JSON.stringify(stored)).not.toContain(response.bindingToken);
  });

  test('resolves only the current non-revoked token for the authenticated uid', async () => {
    const bindingToken = 'opaque-binding-token';
    const tokenHash = createHash('sha256').update(
      `account-authority-binding-token.v1\u0000${bindingToken}`,
      'utf8',
    ).digest('hex');
    const authUidHash = createHash('sha256').update(
      'account-authority-auth-uid.v1\u0000firebase-auth-a',
      'utf8',
    ).digest('hex');
    const indexRef = Object.freeze({ path: `account_authority_installation_binding_tokens_v1/${tokenHash}` });
    const bindingKey = 'b'.repeat(64);
    const bindingRef = Object.freeze({ path: `account_authority_installation_bindings_v1/${bindingKey}` });
    const transaction = {
      get: jest.fn(async (ref: { path: string }) => {
        if (ref.path === indexRef.path) {
          return {
            exists: true,
            data: () => ({
              schemaVersion: 'account-authority-installation-binding-index.v1',
              bindingKey,
              bindingTokenHash: tokenHash,
              authUidHash,
              rotatedAtMs: 2_000,
            }),
          };
        }
        if (ref.path === bindingRef.path) {
          return {
            exists: true,
            data: () => ({
              schemaVersion: 'account-authority-installation-binding-record.v1',
              authUidHash,
              installationIdHash: 'f'.repeat(64),
              bindingTokenHash: tokenHash,
              deviceBindingId: 'server-device-binding-a',
              createdAtMs: 1_000,
              rotatedAtMs: 2_000,
              revokedAtMs: null,
            }),
          };
        }
        throw new Error(`unexpected_ref:${ref.path}`);
      }),
    };
    const db = {
      collection: (name: string) => ({
        doc: (id: string) => Object.freeze({ path: `${name}/${id}` }),
      }),
      runTransaction: async (work: (value: typeof transaction) => Promise<unknown>) => work(transaction),
    } as unknown as Firestore;
    const port = createFirebaseInstallationBindingIdentityPort(db);

    await expect(port.resolve({
      firebaseAuthUid: 'firebase-auth-a' as never,
      authToken: { auth_time: 1234 },
      app: null,
    }, bindingToken)).resolves.toEqual({
      tenantId: 'phraseman-primary',
      deviceId: 'server-device-binding-a',
      authEpoch: 2_000,
    });
  });

  test.each([
    ['wrong uid', { authUidHash: '0'.repeat(64), revokedAtMs: null }],
    ['revoked binding', { authUidHash: null, revokedAtMs: 2_001 }],
  ])('rejects a %s token without exposing binding details', async (_name, mutation) => {
    const bindingToken = 'opaque-binding-token';
    const tokenHash = createHash('sha256').update(
      `account-authority-binding-token.v1\u0000${bindingToken}`,
      'utf8',
    ).digest('hex');
    const correctAuthHash = createHash('sha256').update(
      'account-authority-auth-uid.v1\u0000firebase-auth-a',
      'utf8',
    ).digest('hex');
    const authUidHash = mutation.authUidHash ?? correctAuthHash;
    const bindingKey = 'b'.repeat(64);
    const transaction = {
      get: jest.fn(async (ref: { path: string }) => ({
        exists: true,
        data: () => ref.path.includes('binding_tokens') ? {
          schemaVersion: 'account-authority-installation-binding-index.v1',
          bindingKey,
          bindingTokenHash: tokenHash,
          authUidHash,
          rotatedAtMs: 2_000,
        } : {
          schemaVersion: 'account-authority-installation-binding-record.v1',
          authUidHash,
          installationIdHash: 'f'.repeat(64),
          bindingTokenHash: tokenHash,
          deviceBindingId: 'server-device-binding-a',
          createdAtMs: 1_000,
          rotatedAtMs: 2_000,
          revokedAtMs: mutation.revokedAtMs,
        },
      })),
    };
    const db = {
      collection: (name: string) => ({
        doc: (id: string) => Object.freeze({ path: `${name}/${id}` }),
      }),
      runTransaction: async (work: (value: typeof transaction) => Promise<unknown>) => work(transaction),
    } as unknown as Firestore;

    await expect(createFirebaseInstallationBindingIdentityPort(db).resolve({
      firebaseAuthUid: 'firebase-auth-a' as never,
      authToken: { auth_time: 1234 },
      app: null,
    }, bindingToken)).rejects.toMatchObject({
      code: 'failed-precondition',
      message: 'account_authority_request_rejected',
    });
  });

  // зачем (AA S0): временный сбой Firestore раньше превращался в «отклонено».
  test('maps a transient Firestore failure to the retryable unavailable code and logs only its safe code', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const logger = require('firebase-functions/logger') as typeof import('firebase-functions/logger');
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const db = {
      collection: (name: string) => ({
        doc: (id: string) => Object.freeze({ path: `${name}/${id}` }),
      }),
      runTransaction: async () => {
        throw Object.assign(new Error('10 ABORTED: contention on firebase-auth-a'), { code: 10 });
      },
    } as unknown as Firestore;
    try {
      await expect(createFirebaseInstallationBindingIdentityPort(db).resolve({
        firebaseAuthUid: 'firebase-auth-a' as never,
        authToken: {},
        app: null,
      }, 'some-binding-token')).rejects.toMatchObject({
        code: 'unavailable',
        message: 'account_authority_installation_binding_unavailable',
      });
      expect(warn).toHaveBeenCalledWith('[ACCOUNT-AUTHORITY] installation_binding resolve_unavailable', {
        kind: 'Error',
        code: '10',
      });
      expect(JSON.stringify(warn.mock.calls)).not.toContain('firebase-auth-a');
      expect(JSON.stringify(warn.mock.calls)).not.toContain('some-binding-token');
    } finally {
      warn.mockRestore();
    }
  });

  test('logs the rejection branch without identifiers', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const logger = require('firebase-functions/logger') as typeof import('firebase-functions/logger');
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const transaction = { get: jest.fn(async () => ({ exists: false, data: () => undefined })) };
    const db = {
      collection: (name: string) => ({
        doc: (id: string) => Object.freeze({ path: `${name}/${id}` }),
      }),
      runTransaction: async (work: (value: typeof transaction) => Promise<unknown>) => work(transaction),
    } as unknown as Firestore;
    try {
      await expect(createFirebaseInstallationBindingIdentityPort(db).resolve({
        firebaseAuthUid: 'firebase-auth-a' as never,
        authToken: {},
        app: null,
      }, 'unknown-binding-token')).rejects.toMatchObject({ code: 'failed-precondition' });
      expect(warn).toHaveBeenCalledWith('[ACCOUNT-AUTHORITY] installation_binding resolve_rejected', {
        reason: 'token_unknown',
      });
    } finally {
      warn.mockRestore();
    }
  });

  test('rejects an unknown binding token before any binding record is read', async () => {
    const transaction = {
      get: jest.fn(async () => ({ exists: false, data: () => undefined })),
    };
    const db = {
      collection: (name: string) => ({
        doc: (id: string) => Object.freeze({ path: `${name}/${id}` }),
      }),
      runTransaction: async (work: (value: typeof transaction) => Promise<unknown>) => work(transaction),
    } as unknown as Firestore;

    await expect(createFirebaseInstallationBindingIdentityPort(db).resolve({
      firebaseAuthUid: 'firebase-auth-a' as never,
      authToken: {},
      app: null,
    }, 'unknown-binding-token')).rejects.toMatchObject({
      code: 'failed-precondition',
      message: 'account_authority_request_rejected',
    });
    expect(transaction.get).toHaveBeenCalledTimes(1);
  });

  test('keeps the callable out of the Functions entrypoint with a hardcoded default-off rollout gate', () => {
    const index = readFileSync(path.join(ROOT, 'src/index.ts'), 'utf8');
    const source = readFileSync(path.join(__dirname, 'installation_binding_callable.ts'), 'utf8');

    // зачем (AA S0, 2026-10-03): до решения координатора о выкладке экспорта в
    // functions/src/index.ts НЕТ — иначе любая полная выкладка функций из любой
    // сессии создала бы callable на проде. Код callable и его гейт остаются.
    // Решение принято → добавить экспорт и перевернуть эту проверку.
    expect(index).not.toMatch(/accountAuthorityInstallationBindingCreate/);
    expect(index).not.toMatch(/account_authority\/installation_binding_callable/);
    expect(source).toContain('export const accountAuthorityInstallationBindingCreate = onCall(');
    expect(source).toContain('getPorts: () => createFirebaseInstallationBindingPorts(admin.firestore())');
    expect(source).not.toContain('ports: createFirebaseInstallationBindingPorts(admin.firestore())');
    expect(source).toContain('rolloutEnabled: false');
  });
});
