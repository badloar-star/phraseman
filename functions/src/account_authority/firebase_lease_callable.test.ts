import { readFileSync } from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import type { Firestore } from 'firebase-admin/firestore';
import {
  createFirebaseLeasePorts,
  handleFirebaseAccountAuthorityLeaseAcquire,
  handleFirebaseAccountAuthorityLeaseRelease,
  type FirebaseAccountAuthorityLeaseDependencies,
} from './firebase_lease_callable';
import type { AccountAuthorityCallableBoundaryPorts } from './callable_boundary';
import {
  asAccountId,
  asDeviceId,
  asFirebaseAuthUid,
  asOperationId,
  asProviderSubject,
  asSessionId,
  asTenantId,
  createEmptyAccountLeaseState,
  startOrRenewAccountLease,
} from './lease_contract';

const ROOT = path.resolve(__dirname, '../..');

type FakeDocumentRef = Readonly<{
  path: string;
  collection(name: string): Readonly<{ doc(id: string): FakeDocumentRef }>;
}>;

function fakeFirestore(initial: Readonly<Record<string, unknown>>) {
  const documents = new Map(Object.entries(initial));
  const create = jest.fn((ref: FakeDocumentRef, value: unknown) => {
    if (documents.has(ref.path)) throw new Error('already_exists');
    documents.set(ref.path, value);
  });
  const set = jest.fn((ref: FakeDocumentRef, value: unknown) => {
    documents.set(ref.path, value);
  });
  const reference = (documentPath: string): FakeDocumentRef => Object.freeze({
    path: documentPath,
    collection: (name: string) => Object.freeze({
      doc: (id: string) => reference(`${documentPath}/${name}/${id}`),
    }),
  });
  const transaction = {
    get: jest.fn(async (ref: FakeDocumentRef) => ({
      exists: documents.has(ref.path),
      data: () => documents.get(ref.path),
    })),
    create,
    set,
  };
  const db = {
    collection: (name: string) => Object.freeze({
      doc: (id: string) => reference(`${name}/${id}`),
    }),
    runTransaction: async (work: (value: typeof transaction) => Promise<unknown>) => work(transaction),
  } as unknown as Firestore;
  return { db, documents, create, set };
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function activeFirestoreFixture(bindingToken = 'binding-token-a') {
  const accountId = asAccountId('account-a');
  const tenantId = asTenantId('phraseman-primary');
  const firebaseAuthUid = asFirebaseAuthUid('firebase-a');
  const deviceId = asDeviceId('device-a');
  // S2a, пункт 5: sessionId в форме, которую выдаёт сервер.
  const sessionId = asSessionId('session-0a0a0a0a-0a0a-4a0a-8a0a-0a0a0a0a0a0a');
  const providerSubject = asProviderSubject('provider-a');
  const state = startOrRenewAccountLease(createEmptyAccountLeaseState(accountId, tenantId), {
    principal: { accountId, tenantId, firebaseAuthUid, providerSubject, authEpoch: 1_000 },
    deviceId,
    sessionId,
    operationId: asOperationId('acquire-operation-a'),
    expectedRevision: 0,
    serverNowMs: 1_000,
  }, { isRetired: () => false }).state;
  const bindingTokenHash = sha256(`account-authority-binding-token.v1\u0000${bindingToken}`);
  const authUidHash = sha256(`account-authority-auth-uid.v1\u0000${firebaseAuthUid}`);
  const bindingKey = 'b'.repeat(64);
  // Раунд 2, M1: ключ принципала — от субъекта аренды (хеша uid).
  const principalId = sha256(JSON.stringify([tenantId, `uidh-${authUidHash}`]));
  return {
    accountId,
    firebaseAuthUid,
    sessionId,
    fixture: fakeFirestore({
      [`account_authority_installation_binding_tokens_v1/${bindingTokenHash}`]: {
        schemaVersion: 'account-authority-installation-binding-index.v1',
        bindingKey,
        bindingTokenHash,
        authUidHash,
        rotatedAtMs: 1_000,
      },
      [`account_authority_installation_bindings_v1/${bindingKey}`]: {
        schemaVersion: 'account-authority-installation-binding-record.v1',
        authUidHash,
        installationIdHash: 'c'.repeat(64),
        bindingTokenHash,
        deviceBindingId: deviceId,
        createdAtMs: 1_000,
        rotatedAtMs: 1_000,
        revokedAtMs: null,
      },
      [`account_authority_principals_v1/${principalId}`]: {
        schemaVersion: 'account-authority-principal.v1',
        accountId,
        tenantId,
        firebaseAuthUid,
        providerSubject,
        createdAtMs: 1_000,
      },
      [`account_authority_accounts_v1/${accountId}`]: {
        schemaVersion: 'account-authority-firestore-lease.v1',
        ...state,
      },
    }),
  };
}

function unusedPorts(): AccountAuthorityCallableBoundaryPorts {
  return {
    lease: {
      sessions: {
        issueSessionId: async () => {
          throw new Error('must_not_issue');
        },
      },
      clock: { nowMs: () => 1 },
      transactions: {
        transact: async () => {
          throw new Error('must_not_transact');
        },
      },
      bound: {
        transactAcquire: async () => {
          throw new Error('must_not_transact');
        },
        transactRelease: async () => {
          throw new Error('must_not_transact');
        },
      },
    },
    deletion: {
      clock: { nowMs: () => 1 },
      bound: {
        transactPrepare: async () => {
          throw new Error('must_not_transact');
        },
      },
      claims: {
        issueClaimId: () => {
          throw new Error('must_not_issue');
        },
      },
      transactions: {
        transact: async () => {
          throw new Error('must_not_transact');
        },
      },
      identity: {
        releaseProviderIdentity: async () => {
          throw new Error('must_not_release');
        },
      },
    },
  };
}

describe('Account Authority Firebase lease callable wiring', () => {
  test('rejects an unauthenticated callable before any authority adapter is touched', async () => {
    const deps: FirebaseAccountAuthorityLeaseDependencies = {
      ports: unusedPorts(),
      rolloutEnabled: true,
      trustedInstallationBindingAvailable: true,
    };

    const failure = handleFirebaseAccountAuthorityLeaseAcquire(deps, {
      auth: null,
      app: null,
      data: { operationId: 'operation-a', expectedRevision: 0, bindingToken: 'binding-token-a' },
    });

    await expect(failure).rejects.toEqual(expect.objectContaining({
      code: 'unauthenticated',
      message: 'account_authority_auth_required',
    }));
  });

  test('rollout is disabled by default before any authority adapter work', async () => {
    const failure = handleFirebaseAccountAuthorityLeaseAcquire(
      { ports: unusedPorts() },
      {
        auth: { uid: 'firebase-a', token: { auth_time: 100 } },
        app: null,
        data: { operationId: 'operation-a', expectedRevision: 0, bindingToken: 'binding-token-a' },
      },
    );

    await expect(failure).rejects.toEqual(expect.objectContaining({
      code: 'failed-precondition',
      message: 'account_authority_disabled',
    }));
  });

  test('keeps the production ports factory lazy until both rollout gates pass', async () => {
    const getPorts = jest.fn(unusedPorts);
    const lazyDependencies = {
      getPorts,
      rolloutEnabled: false,
      trustedInstallationBindingAvailable: false,
    } satisfies FirebaseAccountAuthorityLeaseDependencies;
    const request = {
      auth: { uid: 'firebase-a', token: { auth_time: 100, firebase: { sign_in_provider: 'google.com' } } },
      app: null,
      data: { operationId: 'operation-a', expectedRevision: 0, bindingToken: 'binding-token-a' },
    } as const;

    await expect(handleFirebaseAccountAuthorityLeaseAcquire(
      lazyDependencies,
      request,
    )).rejects.toMatchObject({
      code: 'failed-precondition',
      message: 'account_authority_disabled',
    });
    expect(getPorts).not.toHaveBeenCalled();

    await expect(handleFirebaseAccountAuthorityLeaseAcquire(
      {
        ...lazyDependencies,
        rolloutEnabled: true,
        trustedInstallationBindingAvailable: true,
      },
      request,
    )).rejects.toMatchObject({
      code: 'internal',
      message: 'account_authority_unavailable',
    });
    expect(getPorts).toHaveBeenCalledTimes(1);
  });

  test('refuses same-second sessions when no trusted physical-installation binding exists', async () => {
    const deps: FirebaseAccountAuthorityLeaseDependencies = {
      ports: unusedPorts(),
      rolloutEnabled: true,
      trustedInstallationBindingAvailable: false,
    };
    const request = {
      auth: {
        uid: 'firebase-a',
        token: { auth_time: 100, firebase: { sign_in_provider: 'google.com' } },
      },
      app: { appId: 'app-check-shared-by-installations', token: {} },
      data: { operationId: 'operation-a', expectedRevision: 0, bindingToken: 'binding-token-a' },
    } as const;

    const first = handleFirebaseAccountAuthorityLeaseAcquire(deps, request);
    const second = handleFirebaseAccountAuthorityLeaseAcquire(deps, {
      ...request,
      data: { operationId: 'operation-b', expectedRevision: 0, bindingToken: 'binding-token-b' },
    });

    await expect(first).rejects.toEqual(expect.objectContaining({
      code: 'failed-precondition',
      message: 'account_authority_installation_binding_unavailable',
    }));
    await expect(second).rejects.toEqual(expect.objectContaining({
      code: 'failed-precondition',
      message: 'account_authority_installation_binding_unavailable',
    }));
  });

  test('defines the production callable but keeps it out of the Functions entrypoint', () => {
    const index = readFileSync(path.join(ROOT, 'src/index.ts'), 'utf8');
    const source = readFileSync(path.join(ROOT, 'src/account_authority/firebase_lease_callable.ts'), 'utf8');

    // зачем (AA S0, 2026-10-03): до решения координатора о выкладке экспорта в
    // functions/src/index.ts НЕТ — иначе любая полная выкладка функций из любой
    // сессии создала бы callable на проде. Код callable и его гейт остаются.
    // Решение принято → добавить экспорт и перевернуть эту проверку.
    expect(index).not.toMatch(/accountAuthorityLease(Acquire|Release)/);
    expect(index).not.toMatch(/account_authority\/firebase_lease_callable/);
    expect(source).toContain('export const accountAuthorityLeaseAcquire = onCall(');
    expect(source).toContain('getPorts: () => createFirebaseLeasePorts(admin.firestore())');
    expect(source).not.toContain('ports: createFirebaseLeasePorts(admin.firestore())');
    expect(source).toContain('rolloutEnabled: false');
    expect(source).toContain('trustedInstallationBindingAvailable: false');
    // S2a: вход, выход и удаление проверяют привязку внутри своей единой транзакции.
    expect(source).toContain('verifyInstallationBindingInTransaction(');
  });

  test('keeps release default-off and lazy until both authority gates pass', async () => {
    const getPorts = jest.fn(unusedPorts);
    const request = {
      auth: { uid: 'firebase-a', token: {} },
      app: null,
      data: {
        operationId: 'release-operation-a',
        expectedRevision: 1,
        sessionId: 'session-a',
        bindingToken: 'binding-token-a',
      },
    } as const;

    await expect(handleFirebaseAccountAuthorityLeaseRelease({ getPorts }, request))
      .rejects.toMatchObject({
        code: 'failed-precondition',
        message: 'account_authority_disabled',
      });
    expect(getPorts).not.toHaveBeenCalled();

    await expect(handleFirebaseAccountAuthorityLeaseRelease({
      getPorts,
      rolloutEnabled: true,
      trustedInstallationBindingAvailable: false,
    }, request)).rejects.toMatchObject({
      code: 'failed-precondition',
      message: 'account_authority_installation_binding_unavailable',
    });
    expect(getPorts).not.toHaveBeenCalled();
  });

  test('hydrates the active session from Firestore and commits an idempotent durable release', async () => {
    const test = activeFirestoreFixture();
    const ports = createFirebaseLeasePorts(test.fixture.db);
    const request = {
      auth: {
        uid: test.firebaseAuthUid,
        token: { auth_time: 99, stable_id: 'ignored', firebase: { sign_in_provider: 'google.com' } },
      },
      app: null,
      data: {
        operationId: 'release-operation-a',
        expectedRevision: 1,
        sessionId: test.sessionId,
        bindingToken: 'binding-token-a',
      },
    } as const;
    const dependencies: FirebaseAccountAuthorityLeaseDependencies = {
      ports,
      rolloutEnabled: true,
      trustedInstallationBindingAvailable: true,
    };

    const first = await handleFirebaseAccountAuthorityLeaseRelease(dependencies, request);
    const replay = await handleFirebaseAccountAuthorityLeaseRelease(dependencies, request);

    expect(first).toEqual({
      schemaVersion: 'account-authority-lease-release.v1',
      type: 'released',
      revision: 2,
      idempotent: false,
    });
    expect(replay).toEqual({ ...first, idempotent: true });
    expect(test.fixture.documents.get(`account_authority_accounts_v1/${test.accountId}`))
      .toMatchObject({ revision: 2, activeLease: null });
    expect(test.fixture.create.mock.calls.filter(([ref]) => (
      (ref as FakeDocumentRef).path.includes('/account_authority_retired_sessions_v1/')
    ))).toHaveLength(1);
    expect(test.fixture.documents.get(
      `account_authority_accounts_v1/${test.accountId}/account_authority_retired_sessions_v1/${test.sessionId}`,
    )).toMatchObject({
      schemaVersion: 'account-authority-retired-session.v1',
      sessionId: test.sessionId,
      retiredAtMs: expect.any(Number),
    });
  });

  // зачем (ревью M1 + L4): испорченная запись аренды в Firestore — сбой сервера:
  // internal и ровно одна error-строка на всю цепочку (адаптер + граница), без
  // идентификаторов.
  test('corrupted Firestore lease data is internal with exactly one error line', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const logger = require('firebase-functions/logger') as typeof import('firebase-functions/logger');
    const info = jest.spyOn(logger, 'info').mockImplementation(() => undefined);
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const error = jest.spyOn(logger, 'error').mockImplementation(() => undefined);
    try {
      const test = activeFirestoreFixture();
      const accountPath = `account_authority_accounts_v1/${test.accountId}`;
      const stored = test.fixture.documents.get(accountPath) as Record<string, unknown>;
      const activeLease = stored.activeLease as Record<string, unknown>;
      test.fixture.documents.set(accountPath, { ...stored, activeLease: { ...activeLease, deviceId: '../corrupt' } });
      await expect(handleFirebaseAccountAuthorityLeaseRelease({
        ports: createFirebaseLeasePorts(test.fixture.db),
        rolloutEnabled: true,
        trustedInstallationBindingAvailable: true,
      }, {
        auth: { uid: test.firebaseAuthUid, token: { auth_time: 99, firebase: { sign_in_provider: 'google.com' } } },
        app: null,
        data: {
          operationId: 'release-operation-a',
          expectedRevision: 1,
          sessionId: test.sessionId,
          bindingToken: 'binding-token-a',
        },
      })).rejects.toMatchObject({ code: 'internal', message: 'account_authority_unavailable' });
      expect(warn).not.toHaveBeenCalled();
      expect(error).toHaveBeenCalledTimes(1);
      expect(error.mock.calls[0]?.[0]).toBe('[ACCOUNT-AUTHORITY] callable failed');
      expect(error.mock.calls[0]?.[1]).toMatchObject({
        operation: 'lease_release',
        code: 'internal',
        causeKind: 'AccountLeaseError',
        causeCode: 'invalid_input',
        mappedTo: 'internal',
      });
      const logs = JSON.stringify([info.mock.calls, warn.mock.calls, error.mock.calls]);
      for (const identifier of ['account-a', 'firebase-a', 'session-a', '0a0a0a0a', 'device-a', 'provider-a', 'binding-token-a', 'corrupt']) {
        expect(logs).not.toContain(identifier);
      }
    } finally {
      info.mockRestore();
      warn.mockRestore();
      error.mockRestore();
    }
  });

  test('a closed gate is one warn line from the adapter and nothing else', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const logger = require('firebase-functions/logger') as typeof import('firebase-functions/logger');
    const info = jest.spyOn(logger, 'info').mockImplementation(() => undefined);
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const error = jest.spyOn(logger, 'error').mockImplementation(() => undefined);
    try {
      await expect(handleFirebaseAccountAuthorityLeaseAcquire(
        { ports: unusedPorts() },
        { auth: null, app: null, data: {} },
      )).rejects.toMatchObject({ code: 'failed-precondition', message: 'account_authority_disabled' });
      expect(info).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith('[ACCOUNT-AUTHORITY] lease_callable failed', expect.objectContaining({
        operation: 'lease_acquire', code: 'failed-precondition', stage: 'gate', reason: 'rollout_disabled',
      }));
    } finally {
      info.mockRestore();
      warn.mockRestore();
      error.mockRestore();
    }
  });

  test('defines a separately gated release callable without enabling either gate or exporting it', () => {
    const index = readFileSync(path.join(ROOT, 'src/index.ts'), 'utf8');
    const source = readFileSync(path.join(ROOT, 'src/account_authority/firebase_lease_callable.ts'), 'utf8');

    expect(index).not.toMatch(/accountAuthorityLeaseRelease/);
    expect(source).toContain('export const accountAuthorityLeaseRelease = onCall(');
    expect(source).toMatch(/accountAuthorityLeaseRelease[\s\S]*rolloutEnabled: false/);
    expect(source).toMatch(/accountAuthorityLeaseRelease[\s\S]*trustedInstallationBindingAvailable: false/);
  });
});
