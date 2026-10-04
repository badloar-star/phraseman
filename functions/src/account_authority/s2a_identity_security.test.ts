import { createHash } from 'crypto';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import {
  createFirebaseLeasePorts,
  handleFirebaseAccountAuthorityLeaseAcquire,
  handleFirebaseAccountAuthorityLeaseRelease,
} from './firebase_lease_callable';
import {
  createFirebaseInstallationBindingPorts,
  handleInstallationBindingCallable,
} from './installation_binding_callable';
import { handleAccountDeleteBeginCallable } from './callable_boundary';
import { type AccountDeleteContractState } from './delete_contract';
import { asClaimId } from './lease_contract';
import {
  ACCOUNT_AUTHORITY_RECORD_TTL_MS,
  INSTALLATION_BINDING_ACTIVE_LIMIT,
  INSTALLATION_BINDING_CREATE_MAX_PER_WINDOW,
  isStrictAccountSessionId,
} from './account_authority_policy';

/*
 * Account Authority 2.0, этап S2a (сервер): личность и безопасность.
 *
 * зачем: каждый тест здесь закрывает один пункт пакета
 * docs/work/tasks/aa-s2-identity-security-2026-10-03.md (1–7). Фейковый
 * Firestore ниже ведёт себя как настоящая оптимистичная транзакция: читает
 * версии документов и при изменении прочитанного повторяет работу. Только так
 * можно честно проверить «отзыв привязки между шагами не выдаёт аренду».
 */

const RAW_UID = 'RawFirebaseUidA1234567890';
const OTHER_UID = 'RawFirebaseUidB1234567890';
const GOOGLE_TOKEN = Object.freeze({ firebase: Object.freeze({ sign_in_provider: 'google.com' }) });
const ANON_TOKEN = Object.freeze({ firebase: Object.freeze({ sign_in_provider: 'anonymous' }) });
const INSTALLATION_ID = '550e8400-e29b-41d4-a716-446655440000';
const DAY_MS = 24 * 60 * 60_000;

type Ref = Readonly<{
  path: string;
  id: string;
  collection(name: string): Readonly<{ doc(id: string): Ref }>;
}>;

type Write = Readonly<{ kind: 'set' | 'create' | 'delete'; ref: Ref; value?: unknown }>;

function fakeDb(initial: Readonly<Record<string, unknown>> = {}) {
  const documents = new Map<string, unknown>(Object.entries(initial));
  const versions = new Map<string, number>();
  const reads: string[] = [];
  const committedWrites: Write[] = [];
  let transactions = 0;
  let onRead: ((path: string, attempt: number) => void) | null = null;
  const bump = (docPath: string) => versions.set(docPath, (versions.get(docPath) ?? 0) + 1);
  const reference = (docPath: string): Ref => Object.freeze({
    path: docPath,
    id: docPath.split('/').pop() as string,
    collection: (name: string) => Object.freeze({ doc: (id: string) => reference(`${docPath}/${name}/${id}`) }),
  });
  const db = {
    collection: (name: string) => Object.freeze({ doc: (id: string) => reference(`${name}/${id}`) }),
    runTransaction: async <T>(work: (tx: unknown) => Promise<T>): Promise<T> => {
      transactions += 1;
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const readVersions = new Map<string, number>();
        const writes: Write[] = [];
        const tx = {
          get: async (ref: Ref) => {
            if (writes.length > 0) throw new Error('fake_read_after_write');
            reads.push(ref.path);
            readVersions.set(ref.path, versions.get(ref.path) ?? 0);
            onRead?.(ref.path, attempt);
            const data = documents.get(ref.path);
            return { exists: data !== undefined, data: () => data };
          },
          set: (ref: Ref, value: unknown) => { writes.push({ kind: 'set', ref, value }); },
          create: (ref: Ref, value: unknown) => { writes.push({ kind: 'create', ref, value }); },
          delete: (ref: Ref) => { writes.push({ kind: 'delete', ref }); },
        };
        const result = await work(tx);
        const conflict = [...readVersions].some(([docPath, version]) => (versions.get(docPath) ?? 0) !== version);
        if (conflict) continue;
        for (const write of writes) {
          if (write.kind === 'create' && documents.has(write.ref.path)) {
            throw Object.assign(new Error('6 ALREADY_EXISTS: document exists'), { code: 6 });
          }
          if (write.kind === 'delete') documents.delete(write.ref.path);
          else documents.set(write.ref.path, write.value);
          bump(write.ref.path);
          committedWrites.push(write);
        }
        return result;
      }
      throw Object.assign(new Error('10 ABORTED: too much contention'), { code: 10 });
    },
  } as unknown as Firestore;
  return {
    db,
    documents,
    reads,
    committedWrites,
    transactions: () => transactions,
    setOnRead(handler: ((path: string, attempt: number) => void) | null) { onRead = handler; },
    externalSet(docPath: string, value: unknown) { documents.set(docPath, value); bump(docPath); },
    /** Запись «мимо» версий: так фейк изображает гонку, которую Firestore отдаёт как ALREADY_EXISTS. */
    externalSetSilently(docPath: string, value: unknown) { documents.set(docPath, value); },
    externalDelete(docPath: string) { documents.delete(docPath); bump(docPath); },
  };
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function enabledLease(db: Firestore, options: Parameters<typeof createFirebaseLeasePorts>[1] = {}) {
  return {
    ports: createFirebaseLeasePorts(db, options),
    rolloutEnabled: true,
    trustedInstallationBindingAvailable: true,
  } as const;
}

async function bind(
  fixture: ReturnType<typeof fakeDb>,
  uid = RAW_UID,
  installationId = INSTALLATION_ID,
  // Раунд 2, M3: привязка с истёкшим expireAt аренды не даёт — по умолчанию «сейчас».
  nowMs = Date.now(),
): Promise<{ bindingToken: string; deviceBindingId: string }> {
  return handleInstallationBindingCallable(
    { ports: { ...createFirebaseInstallationBindingPorts(fixture.db), clock: { nowMs: () => nowMs } }, rolloutEnabled: true },
    { auth: { uid, token: GOOGLE_TOKEN }, data: { installationId } },
  );
}

function acquireRequest(bindingToken: string, uid = RAW_UID, token: unknown = GOOGLE_TOKEN, operationId = 'operation-a') {
  return {
    auth: { uid, token },
    app: null,
    data: { operationId, expectedRevision: null, bindingToken },
  };
}

function installationId(index: number): string {
  return `550e8400-e29b-41d4-a716-4466554400${String(index).padStart(2, '0')}`;
}

describe('S2a item 1: anonymous sign-in is refused in both callables', () => {
  test('lease acquire refuses an anonymous token with permission-denied before any Firestore access', async () => {
    const fixture = fakeDb();
    await expect(handleFirebaseAccountAuthorityLeaseAcquire(
      enabledLease(fixture.db),
      acquireRequest('binding-token-a', RAW_UID, ANON_TOKEN),
    )).rejects.toMatchObject({ code: 'permission-denied', message: 'account_authority_anonymous_rejected' });
    expect(fixture.transactions()).toBe(0);
  });

  test('lease acquire fails closed when the token carries no sign-in provider', async () => {
    const fixture = fakeDb();
    await expect(handleFirebaseAccountAuthorityLeaseAcquire(
      enabledLease(fixture.db),
      acquireRequest('binding-token-a', RAW_UID, { auth_time: 1 }),
    )).rejects.toMatchObject({ code: 'permission-denied', message: 'account_authority_sign_in_provider_rejected' });
    expect(fixture.transactions()).toBe(0);
  });

  test('installation binding refuses an anonymous token before the ports factory runs', async () => {
    const getPorts = jest.fn(() => createFirebaseInstallationBindingPorts(fakeDb().db));
    await expect(handleInstallationBindingCallable(
      { getPorts, rolloutEnabled: true },
      { auth: { uid: RAW_UID, token: ANON_TOKEN }, data: { installationId: INSTALLATION_ID } },
    )).rejects.toMatchObject({ code: 'permission-denied', message: 'account_authority_anonymous_rejected' });
    await expect(handleInstallationBindingCallable(
      { getPorts, rolloutEnabled: true },
      { auth: { uid: RAW_UID }, data: { installationId: INSTALLATION_ID } },
    )).rejects.toMatchObject({ code: 'permission-denied', message: 'account_authority_sign_in_provider_rejected' });
    expect(getPorts).not.toHaveBeenCalled();
  });
});

describe('S2a logging: every refusal is one safe line with its branch', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const logger = require('firebase-functions/logger') as typeof import('firebase-functions/logger');

  async function captured(work: () => Promise<unknown>): Promise<{ warn: unknown[][]; all: string }> {
    const info = jest.spyOn(logger, 'info').mockImplementation(() => undefined);
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const error = jest.spyOn(logger, 'error').mockImplementation(() => undefined);
    try {
      await work().catch(() => undefined);
      return {
        warn: [...warn.mock.calls, ...error.mock.calls],
        all: JSON.stringify([info.mock.calls, warn.mock.calls, error.mock.calls]),
      };
    } finally {
      info.mockRestore();
      warn.mockRestore();
      error.mockRestore();
    }
  }

  test('anonymous refusal: one warn line with reason=anonymous and no uid', async () => {
    const fixture = fakeDb();
    const logs = await captured(() => handleFirebaseAccountAuthorityLeaseAcquire(
      enabledLease(fixture.db),
      acquireRequest('binding-token-a', RAW_UID, ANON_TOKEN),
    ));
    expect(logs.warn).toHaveLength(1);
    expect(logs.warn[0]?.[1]).toMatchObject({ code: 'permission-denied', stage: 'auth', reason: 'anonymous' });
    expect(logs.all).not.toContain(RAW_UID);
    expect(logs.all).not.toContain('binding-token-a');
  });

  test('binding mismatch and identity refusals name their branch without identifiers', async () => {
    const fixture = fakeDb({ 'auth_links/RawFirebaseUidA1234567890': { stable_id: 'stable-account-a' } });
    const { bindingToken } = await bind(fixture);
    const identity = await captured(() => handleFirebaseAccountAuthorityLeaseAcquire(
      enabledLease(fixture.db), acquireRequest(bindingToken),
    ));
    expect(identity.warn).toHaveLength(1);
    expect(identity.warn[0]?.[1]).toMatchObject({ stage: 'principal', reason: 'user_missing' });
    const foreign = await bind(fixture, OTHER_UID);
    const mismatch = await captured(() => handleFirebaseAccountAuthorityLeaseAcquire(
      enabledLease(fixture.db), acquireRequest(foreign.bindingToken),
    ));
    expect(mismatch.warn).toHaveLength(1);
    expect(mismatch.warn[0]?.[1]).toMatchObject({ stage: 'binding', reason: 'binding_mismatch' });
    for (const text of [identity.all, mismatch.all]) {
      for (const secret of [RAW_UID, OTHER_UID, bindingToken, foreign.bindingToken, 'stable-account-a']) {
        expect(text).not.toContain(secret);
      }
    }
  });

  test('throttle refusal carries its own branch code', async () => {
    const fixture = fakeDb();
    for (let index = 0; index < INSTALLATION_BINDING_CREATE_MAX_PER_WINDOW; index += 1) {
      await bind(fixture, RAW_UID, INSTALLATION_ID, 5_000_000 + index);
    }
    const logs = await captured(() => bind(fixture, RAW_UID, INSTALLATION_ID, 5_000_100));
    expect(logs.warn).toHaveLength(1);
    expect(logs.warn[0]?.[1]).toMatchObject({ code: 'resource-exhausted', reason: 'binding_throttled' });
    expect(logs.all).not.toContain(RAW_UID);
  });
});

describe('S2a item 2: active binding limit and creation throttle per uid', () => {
  // зачем (раунд 2, M2): 6-я установка не отказ, а вытеснение самой давно не
  // использованной привязки; вытесненная больше не даёт аренду.
  test('the sixth installation evicts the least recently used binding, which then gets no lease', async () => {
    const fixture = fakeDb();
    const base = Date.now() - 30 * DAY_MS;
    const tokens: string[] = [];
    for (let index = 0; index < INSTALLATION_BINDING_ACTIVE_LIMIT; index += 1) {
      tokens.push((await bind(fixture, RAW_UID, installationId(index), base + index * 60_000)).bindingToken);
    }
    // Привязка 0 — самая старая по созданию, но ею пользовались (вход продлил срок).
    await handleFirebaseAccountAuthorityLeaseAcquire(enabledLease(fixture.db), acquireRequest(tokens[0] as string));
    const sixth = await bind(fixture, RAW_UID, installationId(9), Date.now());
    expect(sixth.bindingToken).toEqual(expect.any(String));
    // Вытеснена привязка 1 (самая давно не использованная), а не 0.
    await expect(handleFirebaseAccountAuthorityLeaseAcquire(
      enabledLease(fixture.db), acquireRequest(tokens[1] as string, RAW_UID, GOOGLE_TOKEN, 'operation-evicted'),
    )).rejects.toMatchObject({ code: 'failed-precondition', message: 'account_authority_binding_missing' });
    await expect(handleFirebaseAccountAuthorityLeaseAcquire(
      enabledLease(fixture.db), acquireRequest(tokens[0] as string, RAW_UID, GOOGLE_TOKEN, 'operation-kept'),
    )).resolves.toMatchObject({ type: 'renewed' });
    const revoked = [...fixture.documents.entries()].filter(([key, value]) => (
      key.startsWith('account_authority_installation_bindings_v1/') && (value as { revokedAtMs: unknown }).revokedAtMs !== null
    ));
    expect(revoked).toHaveLength(1);
    const later = Date.now();
    await expect(bind(fixture, RAW_UID, installationId(0), later)).resolves.toMatchObject({
      bindingToken: expect.any(String),
    });
    // Другой uid живёт со своим счётчиком.
    await expect(bind(fixture, OTHER_UID, installationId(9), later)).resolves.toMatchObject({
      bindingToken: expect.any(String),
    });
  });

  test('a binding past its retention window frees its slot without evicting a live one', async () => {
    const fixture = fakeDb();
    for (let index = 0; index < INSTALLATION_BINDING_ACTIVE_LIMIT; index += 1) {
      await bind(fixture, RAW_UID, installationId(index), 1_000_000 + index * 60_000);
    }
    await expect(bind(fixture, RAW_UID, installationId(9), 1_000_000 + ACCOUNT_AUTHORITY_RECORD_TTL_MS + 1))
      .resolves.toMatchObject({ bindingToken: expect.any(String) });
    const revoked = [...fixture.documents.values()].filter((value) => (
      (value as { schemaVersion?: unknown }).schemaVersion === 'account-authority-installation-binding-record.v1'
      && (value as { revokedAtMs: unknown }).revokedAtMs !== null
    ));
    expect(revoked).toHaveLength(0);
  });

  test('more than N binding calls per minute for one uid are throttled, and the window slides', async () => {
    const fixture = fakeDb();
    const start = 5_000_000;
    for (let index = 0; index < INSTALLATION_BINDING_CREATE_MAX_PER_WINDOW; index += 1) {
      await bind(fixture, RAW_UID, INSTALLATION_ID, start + index);
    }
    await expect(bind(fixture, RAW_UID, INSTALLATION_ID, start + 30_000))
      .rejects.toMatchObject({ code: 'resource-exhausted', message: 'account_authority_installation_binding_throttled' });
    await expect(bind(fixture, RAW_UID, INSTALLATION_ID, start + 60_000 + 10))
      .resolves.toMatchObject({ bindingToken: expect.any(String) });
  });

  test('the quota document is keyed and filled only by hashes, never by the raw uid', async () => {
    const fixture = fakeDb();
    await bind(fixture);
    const quotaPaths = [...fixture.documents.keys()].filter((key) => key.startsWith('account_authority_installation_binding_quota_v1/'));
    expect(quotaPaths).toEqual([
      `account_authority_installation_binding_quota_v1/${sha256(`account-authority-auth-uid.v1\u0000${RAW_UID}`)}`,
    ]);
    expect(JSON.stringify([...fixture.documents.entries()])).not.toContain(RAW_UID);
  });
});

describe('S2a item 3: binding proof and lease live in ONE transaction', () => {
  test('a revocation that lands between the binding read and the lease write grants no lease', async () => {
    const fixture = fakeDb({
      'auth_links/RawFirebaseUidA1234567890': { stable_id: 'stable-account-a' },
      'users/stable-account-a': { firebaseAuthUid: RAW_UID },
    });
    const { bindingToken } = await bind(fixture);
    const bindingPath = [...fixture.documents.keys()].find((key) => key.startsWith('account_authority_installation_bindings_v1/')) as string;
    fixture.setOnRead((docPath, attempt) => {
      if (attempt === 0 && docPath.startsWith('account_authority_accounts_v1/')) {
        const record = fixture.documents.get(bindingPath) as Record<string, unknown>;
        fixture.externalSet(bindingPath, { ...record, revokedAtMs: 2_000_000 });
      }
    });

    await expect(handleFirebaseAccountAuthorityLeaseAcquire(enabledLease(fixture.db), acquireRequest(bindingToken)))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'account_authority_binding_mismatch' });
    expect([...fixture.documents.keys()].some((key) => key.startsWith('account_authority_accounts_v1/'))).toBe(false);
    expect([...fixture.documents.keys()].some((key) => key.startsWith('account_authority_principals_v1/'))).toBe(false);
  });

  // Раунд 2: +1 auth_links (H1), +2 метки удаления uid (H2). Раунд 3 (M-R2-1, L-R2-1):
  // у привязанного к stableId принципала +2 надгробие/отказ аккаунта и +1 users.
  test('steady-state acquire is one transaction with at most 12 reads (was 4 transactions and 8 reads)', async () => {
    const fixture = fakeDb({
      'auth_links/RawFirebaseUidA1234567890': { stable_id: 'stable-account-a' },
      'users/stable-account-a': { firebaseAuthUid: RAW_UID },
    });
    const { bindingToken } = await bind(fixture);
    await handleFirebaseAccountAuthorityLeaseAcquire(enabledLease(fixture.db), acquireRequest(bindingToken));
    const transactionsBefore = fixture.transactions();
    const readsBefore = fixture.reads.length;

    const renewed = await handleFirebaseAccountAuthorityLeaseAcquire(
      enabledLease(fixture.db),
      acquireRequest(bindingToken, RAW_UID, GOOGLE_TOKEN, 'operation-b'),
    );

    expect(renewed).toMatchObject({ type: 'renewed', accountId: 'stable-account-a' });
    expect(fixture.transactions() - transactionsBefore).toBe(1);
    expect(fixture.reads.length - readsBefore).toBeLessThanOrEqual(12);
  });
});

describe('S2a item 4: distinguishable final and retryable failure codes', () => {
  test('an unknown token is the final binding_missing', async () => {
    const fixture = fakeDb();
    await expect(handleFirebaseAccountAuthorityLeaseAcquire(enabledLease(fixture.db), acquireRequest('never-issued-token')))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'account_authority_binding_missing' });
  });

  test('a token of another uid is the final binding_mismatch', async () => {
    const fixture = fakeDb();
    const { bindingToken } = await bind(fixture, OTHER_UID);
    await expect(handleFirebaseAccountAuthorityLeaseAcquire(enabledLease(fixture.db), acquireRequest(bindingToken)))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'account_authority_binding_mismatch' });
  });

  test('storage contention is the retryable unavailable', async () => {
    const fixture = fakeDb();
    const { bindingToken } = await bind(fixture);
    fixture.setOnRead((docPath) => {
      if (docPath.startsWith('account_authority_installation_bindings_v1/')) {
        throw Object.assign(new Error('14 UNAVAILABLE: backend RawFirebaseUidA1234567890'), { code: 14 });
      }
    });
    await expect(handleFirebaseAccountAuthorityLeaseAcquire(enabledLease(fixture.db), acquireRequest(bindingToken)))
      .rejects.toMatchObject({ code: 'unavailable' });
  });

  test('malformed client input is invalid-argument', async () => {
    const fixture = fakeDb();
    await expect(handleFirebaseAccountAuthorityLeaseAcquire(enabledLease(fixture.db), {
      ...acquireRequest('token'),
      data: { operationId: 'operation-a', expectedRevision: -1, bindingToken: 'token' },
    })).rejects.toMatchObject({ code: 'invalid-argument', message: 'account_authority_request_invalid' });
    expect(fixture.transactions()).toBe(0);
  });
});

describe('S2a item 5: strict session id format', () => {
  test.each([
    'session-a',
    'session-550e8400-e29b-11d4-a716-446655440000',
    'session-550E8400-E29B-41D4-A716-446655440000',
    '550e8400-e29b-41d4-a716-446655440000',
    'session-550e8400-e29b-41d4-a716-446655440000 ',
  ])('release with session id %p is invalid-argument before Firestore', async (sessionId) => {
    const fixture = fakeDb();
    await expect(handleFirebaseAccountAuthorityLeaseRelease(enabledLease(fixture.db), {
      auth: { uid: RAW_UID, token: GOOGLE_TOKEN },
      app: null,
      data: { operationId: 'release-a', expectedRevision: 1, sessionId, bindingToken: 'token' },
    })).rejects.toMatchObject({ code: 'invalid-argument', message: 'account_authority_request_invalid' });
    expect(fixture.transactions()).toBe(0);
  });

  test('the predicate accepts exactly session-<uuid v4>', () => {
    expect(isStrictAccountSessionId('session-550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isStrictAccountSessionId('session-550e8400-e29b-41d4-c716-446655440000')).toBe(false);
    expect(isStrictAccountSessionId(42)).toBe(false);
  });
});

describe('S2a item 6 (D-AA1): an existing stableId becomes the accountId', () => {
  function existingAccountFixture(extra: Readonly<Record<string, unknown>> = {}) {
    return fakeDb({
      'auth_links/RawFirebaseUidA1234567890': { stable_id: 'stable-account-a' },
      'users/stable-account-a': { firebaseAuthUid: RAW_UID },
      ...extra,
    });
  }

  test('opens the existing area without minting a new uuid, idempotently', async () => {
    const fixture = existingAccountFixture();
    const newAccountId = jest.fn(() => 'acct-must-not-be-used');
    const { bindingToken } = await bind(fixture);
    const first = await handleFirebaseAccountAuthorityLeaseAcquire(
      enabledLease(fixture.db, { newAccountId }),
      acquireRequest(bindingToken),
    );
    const second = await handleFirebaseAccountAuthorityLeaseAcquire(
      enabledLease(fixture.db, { newAccountId }),
      acquireRequest(bindingToken, RAW_UID, GOOGLE_TOKEN, 'operation-b'),
    );
    expect(first.accountId).toBe('stable-account-a');
    expect(second.accountId).toBe('stable-account-a');
    expect(newAccountId).not.toHaveBeenCalled();
    const principals = [...fixture.documents.entries()].filter(([key]) => key.startsWith('account_authority_principals_v1/'));
    expect(principals).toHaveLength(1);
    expect(principals[0]?.[1]).toMatchObject({ accountId: 'stable-account-a', accountSource: 'existing_stable_id' });
  });

  test('a uid without an auth link gets a brand-new account id', async () => {
    const fixture = fakeDb();
    const { bindingToken } = await bind(fixture);
    const result = await handleFirebaseAccountAuthorityLeaseAcquire(
      enabledLease(fixture.db, { newAccountId: () => 'acct-11111111-2222-4333-8444-555555555555' }),
      acquireRequest(bindingToken),
    );
    expect(result.accountId).toBe('acct-11111111-2222-4333-8444-555555555555');
  });

  test('ownership is the auth link of the CALLING uid: another uid linked to the stableId does not leak it', async () => {
    const fixture = fakeDb({
      'auth_links/RawFirebaseUidB1234567890': { stable_id: 'stable-account-a' },
      'users/stable-account-a': { firebaseAuthUid: OTHER_UID },
    });
    const { bindingToken } = await bind(fixture);
    const result = await handleFirebaseAccountAuthorityLeaseAcquire(
      enabledLease(fixture.db, { newAccountId: () => 'acct-11111111-2222-4333-8444-555555555555' }),
      acquireRequest(bindingToken),
    );
    expect(result.accountId).not.toBe('stable-account-a');
  });

  test('a hidden duplicate whose canonical account belongs to someone else is refused and writes nothing', async () => {
    const fixture = existingAccountFixture({
      'users/stable-account-a': { firebaseAuthUid: RAW_UID, identityHidden: true, canonicalStableId: 'stable-canonical' },
      'users/stable-canonical': { firebaseAuthUid: OTHER_UID },
    });
    const { bindingToken } = await bind(fixture);
    await expect(handleFirebaseAccountAuthorityLeaseAcquire(enabledLease(fixture.db), acquireRequest(bindingToken)))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'account_authority_identity_unresolved' });
    expect([...fixture.documents.keys()].some((key) => key.startsWith('account_authority_principals_v1/'))).toBe(false);
  });

  test('a hidden duplicate follows its canonical account when the canonical belongs to the caller', async () => {
    const fixture = existingAccountFixture({
      'users/stable-account-a': { firebaseAuthUid: RAW_UID, identityHidden: true, canonicalStableId: 'stable-canonical' },
      'users/stable-canonical': { firebaseAuthUid: RAW_UID },
    });
    const { bindingToken } = await bind(fixture);
    await expect(handleFirebaseAccountAuthorityLeaseAcquire(enabledLease(fixture.db), acquireRequest(bindingToken)))
      .resolves.toMatchObject({ accountId: 'stable-canonical' });
  });

  test('an auth link to a missing user document is refused instead of minting a second account', async () => {
    const fixture = fakeDb({ 'auth_links/RawFirebaseUidA1234567890': { stable_id: 'stable-account-a' } });
    const { bindingToken } = await bind(fixture);
    await expect(handleFirebaseAccountAuthorityLeaseAcquire(enabledLease(fixture.db), acquireRequest(bindingToken)))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'account_authority_identity_unresolved' });
  });
});

describe('S2a item 7: raw uid minimised, expireAt on lease and binding records', () => {
  test('no stored Account Authority document carries the raw Firebase uid', async () => {
    const fixture = fakeDb({
      'auth_links/RawFirebaseUidA1234567890': { stable_id: 'stable-account-a' },
      'users/stable-account-a': { firebaseAuthUid: RAW_UID },
    });
    const { bindingToken } = await bind(fixture);
    await handleFirebaseAccountAuthorityLeaseAcquire(enabledLease(fixture.db), acquireRequest(bindingToken));
    const authorityDocs = [...fixture.documents.entries()].filter(([key]) => key.startsWith('account_authority_'));
    expect(authorityDocs.length).toBeGreaterThanOrEqual(5);
    expect(JSON.stringify(authorityDocs)).not.toContain(RAW_UID);
  });

  test('account, binding, token index and quota carry expireAt = now + 90 days; the principal does not', async () => {
    const fixture = fakeDb();
    const { bindingToken } = await bind(fixture);
    const before = Date.now();
    await handleFirebaseAccountAuthorityLeaseAcquire(enabledLease(fixture.db), acquireRequest(bindingToken));
    await handleFirebaseAccountAuthorityLeaseAcquire(
      enabledLease(fixture.db),
      acquireRequest(bindingToken, RAW_UID, GOOGLE_TOKEN, 'operation-b'),
    );
    // Раунд 2, M4: принципал — якорь личности, без TTL.
    const principal = [...fixture.documents.entries()].find(([key]) => key.startsWith('account_authority_principals_v1/'));
    expect(principal).toBeDefined();
    expect((principal?.[1] as { expireAt?: unknown }).expireAt ?? null).toBeNull();
    for (const prefix of [
      'account_authority_accounts_v1/',
      'account_authority_installation_bindings_v1/',
      'account_authority_installation_binding_tokens_v1/',
      'account_authority_installation_binding_quota_v1/',
    ]) {
      const entry = [...fixture.documents.entries()].find(([key]) => key.startsWith(prefix) && !key.includes('/account_authority_retired_sessions_v1/'));
      const expireAt = (entry?.[1] as { expireAt?: unknown } | undefined)?.expireAt;
      expect({ prefix, isTimestamp: expireAt instanceof Timestamp }).toEqual({ prefix, isTimestamp: true });
    }
    const account = [...fixture.documents.entries()].find(([key]) => key.startsWith('account_authority_accounts_v1/') && !key.includes('/account_authority_retired_sessions_v1/'));
    const accountExpireMs = ((account?.[1] as { expireAt: Timestamp }).expireAt).toMillis();
    expect(accountExpireMs).toBeGreaterThanOrEqual(before + ACCOUNT_AUTHORITY_RECORD_TTL_MS);
    expect(accountExpireMs).toBeLessThanOrEqual(Date.now() + ACCOUNT_AUTHORITY_RECORD_TTL_MS);
  });

  test('release retires the session with an expireAt and the account keeps one', async () => {
    const fixture = fakeDb();
    const { bindingToken } = await bind(fixture);
    const acquired = await handleFirebaseAccountAuthorityLeaseAcquire(enabledLease(fixture.db), acquireRequest(bindingToken));
    await handleFirebaseAccountAuthorityLeaseRelease(enabledLease(fixture.db), {
      auth: { uid: RAW_UID, token: GOOGLE_TOKEN },
      app: null,
      data: { operationId: 'release-a', expectedRevision: acquired.revision, sessionId: acquired.sessionId, bindingToken },
    });
    const retired = [...fixture.documents.entries()].find(([key]) => key.includes('/account_authority_retired_sessions_v1/'));
    expect((retired?.[1] as { expireAt?: unknown }).expireAt).toBeInstanceOf(Timestamp);
    expect(JSON.stringify([...fixture.documents.entries()])).not.toContain(RAW_UID);
  });

  test('a stale binding expireAt is refreshed on use, a fresh one is not rewritten', async () => {
    const fixture = fakeDb();
    const { bindingToken } = await bind(fixture, RAW_UID, INSTALLATION_ID, Date.now() - 30 * DAY_MS);
    const bindingPath = [...fixture.documents.keys()].find((key) => key.startsWith('account_authority_installation_bindings_v1/')) as string;
    const staleMs = (fixture.documents.get(bindingPath) as { expireAt: Timestamp }).expireAt.toMillis();
    await handleFirebaseAccountAuthorityLeaseAcquire(enabledLease(fixture.db), acquireRequest(bindingToken));
    const refreshedMs = (fixture.documents.get(bindingPath) as { expireAt: Timestamp }).expireAt.toMillis();
    expect(refreshedMs).toBeGreaterThan(staleMs);

    const writesBefore = fixture.committedWrites.length;
    await handleFirebaseAccountAuthorityLeaseAcquire(
      enabledLease(fixture.db),
      acquireRequest(bindingToken, RAW_UID, GOOGLE_TOKEN, 'operation-b'),
    );
    const bindingWrites = fixture.committedWrites.slice(writesBefore)
      .filter((write) => write.ref.path.startsWith('account_authority_installation_binding'));
    expect(bindingWrites).toHaveLength(0);
  });
});

/*
 * Раунд 2 (security-ревью REQUEST_CHANGES): H1, H2, M1, M3, L1, L3, L4, L5.
 * M2 и M4 — в блоках пунктов 2 и 7 выше.
 */
const STABLE_A = 'stable-account-a';
const STABLE_B = 'stable-account-b';

function linkedFixture(extra: Readonly<Record<string, unknown>> = {}) {
  return fakeDb({
    'auth_links/RawFirebaseUidA1234567890': { stable_id: STABLE_A },
    [`users/${STABLE_A}`]: { firebaseAuthUid: RAW_UID },
    ...extra,
  });
}

function accountDoc(fixture: ReturnType<typeof fakeDb>, accountId: string): Record<string, unknown> | undefined {
  return fixture.documents.get(`account_authority_accounts_v1/${accountId}`) as Record<string, unknown> | undefined;
}

/**
 * Шов S4: состояние удаления в тестовой коллекции фейкового Firestore (в адаптере
 * оно ещё не подключено). Пишет через ту же транзакцию — как будет на S4, —
 * поэтому повтор транзакции не оставляет «осиротевшей» записи.
 */
const TEST_DELETE_STATE = 'test_account_delete_state';
function memoryDeleteStateStore(fixture: ReturnType<typeof fakeDb>) {
  type Tx = Readonly<{ get(ref: unknown): Promise<{ exists: boolean; data(): unknown }>; set(ref: unknown, value: unknown): void }>;
  const port = {
    async read(transaction: unknown, identity: Readonly<{ accountId: string }>) {
      const snapshot = await (transaction as Tx).get(fixture.db.collection(TEST_DELETE_STATE).doc(identity.accountId));
      return snapshot.exists ? (snapshot.data() as { state: AccountDeleteContractState }).state : null;
    },
    write(transaction: unknown, identity: Readonly<{ accountId: string }>, state: AccountDeleteContractState) {
      (transaction as Tx).set(fixture.db.collection(TEST_DELETE_STATE).doc(identity.accountId), { state });
    },
  };
  const states = {
    get size() { return [...fixture.documents.keys()].filter((key) => key.startsWith(`${TEST_DELETE_STATE}/`)).length; },
    get(accountId: string) {
      return (fixture.documents.get(`${TEST_DELETE_STATE}/${accountId}`) as { state: AccountDeleteContractState } | undefined)?.state;
    },
  };
  return { states, port };
}

function withMemoryDeletionSideEffects(ports: ReturnType<typeof createFirebaseLeasePorts>): ReturnType<typeof createFirebaseLeasePorts> {
  let claim = 0;
  return {
    ...ports,
    deletion: {
      ...ports.deletion,
      claims: { issueClaimId: () => asClaimId(`claim-${++claim}`) },
      identity: { releaseProviderIdentity: async () => undefined },
    },
  };
}

describe('S2a round 2 H1: the principal follows the live auth link on every acquire', () => {
  test('acquire before ensureLink, then the anchor appears: the principal moves to the stableId and the old lease is released', async () => {
    const fixture = fakeDb({ [`users/${STABLE_A}`]: { firebaseAuthUid: RAW_UID } });
    const { bindingToken } = await bind(fixture);
    const ports = { newAccountId: () => 'acct-11111111-2222-4333-8444-555555555555' };
    const first = await handleFirebaseAccountAuthorityLeaseAcquire(enabledLease(fixture.db, ports), acquireRequest(bindingToken));
    expect(first.accountId).toBe('acct-11111111-2222-4333-8444-555555555555');

    fixture.externalSet('auth_links/RawFirebaseUidA1234567890', { stable_id: STABLE_A });
    const second = await handleFirebaseAccountAuthorityLeaseAcquire(
      enabledLease(fixture.db, ports), acquireRequest(bindingToken, RAW_UID, GOOGLE_TOKEN, 'operation-b'),
    );
    expect(second.accountId).toBe(STABLE_A);
    expect(accountDoc(fixture, 'acct-11111111-2222-4333-8444-555555555555')).toMatchObject({ activeLease: null });
    const principal = [...fixture.documents.entries()].find(([key]) => key.startsWith('account_authority_principals_v1/'));
    expect(principal?.[1]).toMatchObject({ accountId: STABLE_A, accountSource: 'rebound' });

    // Повтор идемпотентен: без новой перепривязки и без записи принципала.
    const writesBefore = fixture.committedWrites.length;
    const third = await handleFirebaseAccountAuthorityLeaseAcquire(
      enabledLease(fixture.db, ports), acquireRequest(bindingToken, RAW_UID, GOOGLE_TOKEN, 'operation-c'),
    );
    expect(third.accountId).toBe(STABLE_A);
    expect(fixture.committedWrites.slice(writesBefore).filter((write) => write.ref.path.startsWith('account_authority_principals_v1/')))
      .toHaveLength(0);
  });

  test('relink X -> owner: X no longer gets a lease on the stableId it lost', async () => {
    const fixture = linkedFixture({ [`users/${STABLE_B}`]: { firebaseAuthUid: RAW_UID } });
    const { bindingToken } = await bind(fixture);
    const first = await handleFirebaseAccountAuthorityLeaseAcquire(enabledLease(fixture.db), acquireRequest(bindingToken));
    expect(first.accountId).toBe(STABLE_A);
    // Сервер (merge/recovery/админ) перепривязал якорь uid на другой аккаунт.
    fixture.externalSet('auth_links/RawFirebaseUidA1234567890', { stable_id: STABLE_B });
    const second = await handleFirebaseAccountAuthorityLeaseAcquire(
      enabledLease(fixture.db), acquireRequest(bindingToken, RAW_UID, GOOGLE_TOKEN, 'operation-b'),
    );
    expect(second.accountId).toBe(STABLE_B);
    expect(accountDoc(fixture, STABLE_A)).toMatchObject({ activeLease: null });
  });

  test('without an anchor the principal stays as it is', async () => {
    const fixture = fakeDb();
    const { bindingToken } = await bind(fixture);
    const ports = { newAccountId: () => 'acct-11111111-2222-4333-8444-555555555555' };
    await handleFirebaseAccountAuthorityLeaseAcquire(enabledLease(fixture.db, ports), acquireRequest(bindingToken));
    await expect(handleFirebaseAccountAuthorityLeaseAcquire(
      enabledLease(fixture.db, ports), acquireRequest(bindingToken, RAW_UID, GOOGLE_TOKEN, 'operation-b'),
    )).resolves.toMatchObject({ accountId: 'acct-11111111-2222-4333-8444-555555555555', type: 'renewed' });
  });
});

describe('S2a round 2 H2: deletion markers and tombstones refuse the lease', () => {
  const PENDING = { status: 'pending', graceDeadlineMs: Date.now() + 10 * DAY_MS };

  test('an auth deletion marker on the uid refuses every acquire and writes nothing', async () => {
    const fixture = linkedFixture();
    const { bindingToken } = await bind(fixture);
    fixture.externalSet('account_deletion_auth_markers/RawFirebaseUidA1234567890', PENDING);
    const writesBefore = fixture.committedWrites.length;
    await expect(handleFirebaseAccountAuthorityLeaseAcquire(enabledLease(fixture.db), acquireRequest(bindingToken)))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'account_authority_deletion_pending' });
    expect(fixture.committedWrites.length).toBe(writesBefore);
  });

  test('a tombstone on the linked stableId refuses principal creation', async () => {
    const fixture = linkedFixture({ [`account_deletion_tombstones/${STABLE_A}`]: PENDING });
    const { bindingToken } = await bind(fixture);
    await expect(handleFirebaseAccountAuthorityLeaseAcquire(enabledLease(fixture.db), acquireRequest(bindingToken)))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'account_authority_deletion_pending' });
    expect([...fixture.documents.keys()].some((key) => key.startsWith('account_authority_principals_v1/'))).toBe(false);
  });

  test('a tombstone on the canonical account refuses a hidden duplicate', async () => {
    const fixture = linkedFixture({
      [`users/${STABLE_A}`]: { firebaseAuthUid: RAW_UID, identityHidden: true, canonicalStableId: STABLE_B },
      [`users/${STABLE_B}`]: { firebaseAuthUid: RAW_UID },
      [`account_deletion_tombstones/${STABLE_B}`]: { status: 'purging' },
    });
    const { bindingToken } = await bind(fixture);
    await expect(handleFirebaseAccountAuthorityLeaseAcquire(enabledLease(fixture.db), acquireRequest(bindingToken)))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'account_authority_deletion_pending' });
  });

  test('a rebind onto a tombstoned stableId is refused and the old principal stays', async () => {
    const fixture = linkedFixture({ [`users/${STABLE_B}`]: { firebaseAuthUid: RAW_UID } });
    const { bindingToken } = await bind(fixture);
    await handleFirebaseAccountAuthorityLeaseAcquire(enabledLease(fixture.db), acquireRequest(bindingToken));
    fixture.externalSet(`account_deletion_tombstones/${STABLE_B}`, PENDING);
    fixture.externalSet('auth_links/RawFirebaseUidA1234567890', { stable_id: STABLE_B });
    await expect(handleFirebaseAccountAuthorityLeaseAcquire(
      enabledLease(fixture.db), acquireRequest(bindingToken, RAW_UID, GOOGLE_TOKEN, 'operation-b'),
    )).rejects.toMatchObject({ message: 'account_authority_deletion_pending' });
    const principal = [...fixture.documents.entries()].find(([key]) => key.startsWith('account_authority_principals_v1/'));
    expect(principal?.[1]).toMatchObject({ accountId: STABLE_A });
  });
});

describe('S2a round 2 M1: one uid hash for acquire, release and delete', () => {
  test('acquire then delete_begin through the Firebase adapter does not hit identity_mismatch', async () => {
    const fixture = linkedFixture();
    const { bindingToken } = await bind(fixture);
    const deleteStates = memoryDeleteStateStore(fixture);
    const firebasePorts = createFirebaseLeasePorts(fixture.db, { deleteStateStore: deleteStates.port });
    await handleFirebaseAccountAuthorityLeaseAcquire(
      { ports: firebasePorts, rolloutEnabled: true, trustedInstallationBindingAvailable: true },
      acquireRequest(bindingToken),
    );
    const result = await handleAccountDeleteBeginCallable(withMemoryDeletionSideEffects(firebasePorts), {
      auth: { uid: RAW_UID, token: GOOGLE_TOKEN },
      app: null,
      data: { operationId: 'delete-operation-a', expectedRevision: 1, bindingToken },
    });
    expect(result).toMatchObject({ schemaVersion: 'account-authority-delete.v1' });
    expect(accountDoc(fixture, STABLE_A)).toMatchObject({ activeLease: null, lifecycle: { status: 'deleting' } });
  });

  test('delete_begin without the binding token is invalid-argument (no null-token path)', async () => {
    const fixture = linkedFixture();
    await expect(handleAccountDeleteBeginCallable(createFirebaseLeasePorts(fixture.db), {
      auth: { uid: RAW_UID, token: GOOGLE_TOKEN },
      app: null,
      data: { operationId: 'delete-operation-a', expectedRevision: 1 },
    })).rejects.toMatchObject({ code: 'invalid-argument' });
    expect(fixture.transactions()).toBe(0);
  });
});

describe('S2a round 2 M3: an expired binding is refused', () => {
  test('a binding whose expireAt is in the past is the final binding_missing', async () => {
    const fixture = fakeDb();
    const { bindingToken } = await bind(fixture, RAW_UID, INSTALLATION_ID, Date.now() - ACCOUNT_AUTHORITY_RECORD_TTL_MS - DAY_MS);
    await expect(handleFirebaseAccountAuthorityLeaseAcquire(enabledLease(fixture.db), acquireRequest(bindingToken)))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'account_authority_binding_missing' });
  });
});

describe('S2a round 2 L1/L4: explicit sign-in provider allowlist', () => {
  test.each([
    ['empty firebase object', { firebase: {} }],
    ['empty provider', { firebase: { sign_in_provider: '' } }],
    ['password', { firebase: { sign_in_provider: 'password' } }],
    ['phone', { firebase: { sign_in_provider: 'phone' } }],
    ['custom without the recovery claim', { firebase: { sign_in_provider: 'custom' } }],
    ['custom with a non-true recovery claim', { firebase: { sign_in_provider: 'custom' }, phrasemanRecovery: 'true' }],
  ])('%s is refused before Firestore', async (_name, token) => {
    const fixture = fakeDb();
    await expect(handleFirebaseAccountAuthorityLeaseAcquire(enabledLease(fixture.db), acquireRequest('binding-token-a', RAW_UID, token)))
      .rejects.toMatchObject({ code: 'permission-denied', message: 'account_authority_sign_in_provider_rejected' });
    expect(fixture.transactions()).toBe(0);
  });

  test.each([
    ['google.com', { firebase: { sign_in_provider: 'google.com' } }],
    ['apple.com', { firebase: { sign_in_provider: 'apple.com' } }],
    ['custom recovery', { firebase: { sign_in_provider: 'custom' }, phrasemanRecovery: true }],
  ])('%s is allowed to bind', async (_name, token) => {
    const fixture = fakeDb();
    await expect(handleInstallationBindingCallable(
      { ports: createFirebaseInstallationBindingPorts(fixture.db), rolloutEnabled: true },
      { auth: { uid: RAW_UID, token }, data: { installationId: INSTALLATION_ID } },
    )).resolves.toMatchObject({ bindingToken: expect.any(String) });
  });
});

describe('S2a round 2 L3: ALREADY_EXISTS on principal creation is retryable', () => {
  test('a lost creation race answers unavailable, not internal', async () => {
    const fixture = linkedFixture();
    const { bindingToken } = await bind(fixture);
    fixture.setOnRead((docPath, attempt) => {
      // Принципал уже прочитан как отсутствующий; параллельный вход создаёт его.
      if (attempt === 0 && docPath.startsWith('account_authority_accounts_v1/')) {
        const principalPath = fixture.reads.find((read) => read.startsWith('account_authority_principals_v1/')) as string;
        fixture.externalSetSilently(principalPath, { schemaVersion: 'account-authority-principal.v2' });
      }
    });
    await expect(handleFirebaseAccountAuthorityLeaseAcquire(enabledLease(fixture.db), acquireRequest(bindingToken)))
      .rejects.toMatchObject({ code: 'unavailable' });
  });
});

describe('S2a round 2 L5: release is one transaction and never creates a principal', () => {
  test('release after acquire is a single transaction with at most 5 reads', async () => {
    const fixture = linkedFixture();
    const { bindingToken } = await bind(fixture);
    const acquired = await handleFirebaseAccountAuthorityLeaseAcquire(enabledLease(fixture.db), acquireRequest(bindingToken));
    const transactionsBefore = fixture.transactions();
    const readsBefore = fixture.reads.length;
    await expect(handleFirebaseAccountAuthorityLeaseRelease(enabledLease(fixture.db), {
      auth: { uid: RAW_UID, token: GOOGLE_TOKEN },
      app: null,
      data: { operationId: 'release-a', expectedRevision: acquired.revision, sessionId: acquired.sessionId, bindingToken },
    })).resolves.toMatchObject({ type: 'released', idempotent: false });
    expect(fixture.transactions() - transactionsBefore).toBe(1);
    expect(fixture.reads.length - readsBefore).toBeLessThanOrEqual(5);
  });

  test('release without a principal is an idempotent no-op and creates nothing', async () => {
    const fixture = linkedFixture();
    const { bindingToken } = await bind(fixture);
    const writesBefore = fixture.committedWrites.length;
    await expect(handleFirebaseAccountAuthorityLeaseRelease(enabledLease(fixture.db), {
      auth: { uid: RAW_UID, token: GOOGLE_TOKEN },
      app: null,
      data: { operationId: 'release-a', expectedRevision: 0, sessionId: 'session-0a0a0a0a-0a0a-4a0a-8a0a-0a0a0a0a0a0a', bindingToken },
    })).resolves.toMatchObject({ type: 'released', idempotent: true });
    expect(fixture.committedWrites.length).toBe(writesBefore);
  });
});

/*
 * Раунд 3 (повторное security-ревью): M-R2-1, L-R2-1, L-R2-2, L-R2-3, L-R2-4.
 */
describe('S2a round 3 M-R2-1: a vanished anchor or a deleted account closes the lease', () => {
  test('the anchor disappearing (legacy deletion wipes auth_links) refuses with anchor_removed and writes nothing', async () => {
    const fixture = linkedFixture();
    const { bindingToken } = await bind(fixture);
    await handleFirebaseAccountAuthorityLeaseAcquire(enabledLease(fixture.db), acquireRequest(bindingToken));
    fixture.externalDelete('auth_links/RawFirebaseUidA1234567890');
    const writesBefore = fixture.committedWrites.length;
    const logs: unknown[][] = [];
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const logger = require('firebase-functions/logger') as typeof import('firebase-functions/logger');
    const warn = jest.spyOn(logger, 'warn').mockImplementation((...args: unknown[]) => { logs.push(args); });
    try {
      await expect(handleFirebaseAccountAuthorityLeaseAcquire(
        enabledLease(fixture.db), acquireRequest(bindingToken, RAW_UID, GOOGLE_TOKEN, 'operation-b'),
      )).rejects.toMatchObject({ code: 'failed-precondition', message: 'account_authority_identity_unresolved' });
    } finally {
      warn.mockRestore();
    }
    expect(logs[0]?.[1]).toMatchObject({ stage: 'principal', reason: 'anchor_removed' });
    expect(fixture.committedWrites.length).toBe(writesBefore);
  });

  test('a tombstone on the principal account with an unchanged anchor refuses every acquire', async () => {
    const fixture = linkedFixture();
    const { bindingToken } = await bind(fixture);
    await handleFirebaseAccountAuthorityLeaseAcquire(enabledLease(fixture.db), acquireRequest(bindingToken));
    fixture.externalSet(`account_deletion_tombstones/${STABLE_A}`, { status: 'pending', graceDeadlineMs: Date.now() + DAY_MS });
    const writesBefore = fixture.committedWrites.length;
    await expect(handleFirebaseAccountAuthorityLeaseAcquire(
      enabledLease(fixture.db), acquireRequest(bindingToken, RAW_UID, GOOGLE_TOKEN, 'operation-b'),
    )).rejects.toMatchObject({ code: 'failed-precondition', message: 'account_authority_deletion_pending' });
    expect(fixture.committedWrites.length).toBe(writesBefore);
  });
});

describe('S2a round 3 L-R2-1: canonicalisation without an anchor change', () => {
  test('the account becoming a hidden duplicate of the caller-owned canonical moves the principal there', async () => {
    const fixture = linkedFixture({ [`users/${STABLE_B}`]: { firebaseAuthUid: RAW_UID } });
    const { bindingToken } = await bind(fixture);
    await handleFirebaseAccountAuthorityLeaseAcquire(enabledLease(fixture.db), acquireRequest(bindingToken));
    fixture.externalSet(`users/${STABLE_A}`, { firebaseAuthUid: RAW_UID, identityHidden: true, canonicalStableId: STABLE_B });
    await expect(handleFirebaseAccountAuthorityLeaseAcquire(
      enabledLease(fixture.db), acquireRequest(bindingToken, RAW_UID, GOOGLE_TOKEN, 'operation-b'),
    )).resolves.toMatchObject({ accountId: STABLE_B });
    expect(accountDoc(fixture, STABLE_A)).toMatchObject({ activeLease: null });
  });

  test('a hidden duplicate whose canonical belongs to someone else is refused', async () => {
    const fixture = linkedFixture({ [`users/${STABLE_B}`]: { firebaseAuthUid: OTHER_UID } });
    const { bindingToken } = await bind(fixture);
    await handleFirebaseAccountAuthorityLeaseAcquire(enabledLease(fixture.db), acquireRequest(bindingToken));
    fixture.externalSet(`users/${STABLE_A}`, { firebaseAuthUid: RAW_UID, identityHidden: true, canonicalStableId: STABLE_B });
    await expect(handleFirebaseAccountAuthorityLeaseAcquire(
      enabledLease(fixture.db), acquireRequest(bindingToken, RAW_UID, GOOGLE_TOKEN, 'operation-b'),
    )).rejects.toMatchObject({ message: 'account_authority_identity_unresolved' });
  });
});

describe('S2a round 3 L-R2-2 / L-R2-3: rebinding and the old account lease', () => {
  test('a rebind leaves the lease of ANOTHER uid on the old account untouched', async () => {
    const fixture = linkedFixture({
      'auth_links/RawFirebaseUidB1234567890': { stable_id: STABLE_A },
      [`users/${STABLE_B}`]: { firebaseAuthUid: RAW_UID },
    });
    const mine = await bind(fixture, RAW_UID, INSTALLATION_ID, Date.now() - 5_000);
    const theirs = await bind(fixture, OTHER_UID, installationId(7), Date.now());
    await handleFirebaseAccountAuthorityLeaseAcquire(enabledLease(fixture.db), acquireRequest(mine.bindingToken));
    await handleFirebaseAccountAuthorityLeaseAcquire(enabledLease(fixture.db), acquireRequest(theirs.bindingToken, OTHER_UID, GOOGLE_TOKEN, 'operation-other'));
    const before = accountDoc(fixture, STABLE_A) as { revision: number; activeLease: { firebaseAuthUid: string } };
    expect(before.activeLease.firebaseAuthUid).toBe(`uidh-${sha256(`account-authority-auth-uid.v1\u0000${OTHER_UID}`)}`);
    fixture.externalSet('auth_links/RawFirebaseUidA1234567890', { stable_id: STABLE_B });
    await expect(handleFirebaseAccountAuthorityLeaseAcquire(
      enabledLease(fixture.db), acquireRequest(mine.bindingToken, RAW_UID, GOOGLE_TOKEN, 'operation-b'),
    )).resolves.toMatchObject({ accountId: STABLE_B });
    expect(accountDoc(fixture, STABLE_A)).toMatchObject({ revision: before.revision, activeLease: before.activeLease });
  });

  test('an old account that is already deleting is not released, and the move still succeeds', async () => {
    const fixture = linkedFixture({ [`users/${STABLE_B}`]: { firebaseAuthUid: RAW_UID } });
    const { bindingToken } = await bind(fixture);
    await handleFirebaseAccountAuthorityLeaseAcquire(enabledLease(fixture.db), acquireRequest(bindingToken));
    const old = accountDoc(fixture, STABLE_A) as Record<string, unknown>;
    fixture.externalSet(`account_authority_accounts_v1/${STABLE_A}`, {
      ...old, lifecycle: { status: 'deleting', jobId: 'job-a', changedAtMs: Date.now() },
    });
    fixture.externalSet('auth_links/RawFirebaseUidA1234567890', { stable_id: STABLE_B });
    await expect(handleFirebaseAccountAuthorityLeaseAcquire(
      enabledLease(fixture.db), acquireRequest(bindingToken, RAW_UID, GOOGLE_TOKEN, 'operation-b'),
    )).resolves.toMatchObject({ accountId: STABLE_B });
    expect(accountDoc(fixture, STABLE_A)).toMatchObject({ lifecycle: { status: 'deleting' }, revision: old.revision });
  });
});

describe('S2a round 3 L-R2-4: delete_begin proves the binding in the same transaction', () => {
  test('a binding revoked during delete preparation stops the deletion and keeps the lease', async () => {
    const fixture = linkedFixture();
    const { bindingToken } = await bind(fixture);
    const deleteStates = memoryDeleteStateStore(fixture);
    const ports = createFirebaseLeasePorts(fixture.db, { deleteStateStore: deleteStates.port });
    await handleFirebaseAccountAuthorityLeaseAcquire(
      { ports, rolloutEnabled: true, trustedInstallationBindingAvailable: true }, acquireRequest(bindingToken),
    );
    const bindingPath = [...fixture.documents.keys()].find((key) => key.startsWith('account_authority_installation_bindings_v1/')) as string;
    fixture.setOnRead((docPath, attempt) => {
      if (attempt === 0 && docPath === `account_authority_accounts_v1/${STABLE_A}`) {
        const record = fixture.documents.get(bindingPath) as Record<string, unknown>;
        fixture.externalSet(bindingPath, { ...record, revokedAtMs: Date.now() });
      }
    });
    await expect(handleAccountDeleteBeginCallable(withMemoryDeletionSideEffects(ports), {
      auth: { uid: RAW_UID, token: GOOGLE_TOKEN },
      app: null,
      data: { operationId: 'delete-operation-a', expectedRevision: 1, bindingToken },
    })).rejects.toMatchObject({ code: 'failed-precondition', message: 'account_authority_binding_mismatch' });
    expect(accountDoc(fixture, STABLE_A)).toMatchObject({ lifecycle: { status: 'active' }, revision: 1 });
    expect(deleteStates.states.size).toBe(0);
  });

  // 5 чтений адаптера (токен, привязка, принципал, аренда, отметка сессии) + 1 чтение шва S4.
  test('delete preparation is one transaction with at most 6 reads before the identity release', async () => {
    const fixture = linkedFixture();
    const { bindingToken } = await bind(fixture);
    const deleteStates = memoryDeleteStateStore(fixture);
    const ports = createFirebaseLeasePorts(fixture.db, { deleteStateStore: deleteStates.port });
    await handleFirebaseAccountAuthorityLeaseAcquire(
      { ports, rolloutEnabled: true, trustedInstallationBindingAvailable: true }, acquireRequest(bindingToken),
    );
    const transactionsBefore = fixture.transactions();
    const readsBefore = fixture.reads.length;
    fixture.setOnRead(null);
    let firstTransactionReads = -1;
    fixture.setOnRead(() => {
      if (fixture.transactions() === transactionsBefore + 1) firstTransactionReads = fixture.reads.length - readsBefore;
    });
    await handleAccountDeleteBeginCallable(withMemoryDeletionSideEffects(ports), {
      auth: { uid: RAW_UID, token: GOOGLE_TOKEN },
      app: null,
      data: { operationId: 'delete-operation-a', expectedRevision: 1, bindingToken },
    });
    expect(firstTransactionReads).toBeGreaterThan(0);
    expect(firstTransactionReads).toBeLessThanOrEqual(6);
    expect(deleteStates.states.get(STABLE_A)?.job).toMatchObject({ accountId: STABLE_A });
  });

  test('without the S4 delete-state store the adapter refuses deletion as not wired', async () => {
    const fixture = linkedFixture();
    const { bindingToken } = await bind(fixture);
    await handleFirebaseAccountAuthorityLeaseAcquire(enabledLease(fixture.db), acquireRequest(bindingToken));
    await expect(handleAccountDeleteBeginCallable(createFirebaseLeasePorts(fixture.db), {
      auth: { uid: RAW_UID, token: GOOGLE_TOKEN },
      app: null,
      data: { operationId: 'delete-operation-a', expectedRevision: 1, bindingToken },
    })).rejects.toMatchObject({ code: 'internal', message: 'account_authority_unavailable' });
    expect(accountDoc(fixture, STABLE_A)).toMatchObject({ lifecycle: { status: 'active' } });
  });
});

/*
 * Раунд 4 (LOW из ревью раунда 3): L-R3-1, L-R3-2, L-R3-3.
 */
describe('S2a round 4 L-R3-1: the anchor itself is re-verified on every acquire', () => {
  test('when the canonical account changes owner, a principal reached through a hidden duplicate does not stay on it', async () => {
    const fixture = linkedFixture({
      [`users/${STABLE_A}`]: { firebaseAuthUid: RAW_UID, identityHidden: true, canonicalStableId: STABLE_B },
      [`users/${STABLE_B}`]: { firebaseAuthUid: RAW_UID },
    });
    const { bindingToken } = await bind(fixture);
    await expect(handleFirebaseAccountAuthorityLeaseAcquire(enabledLease(fixture.db), acquireRequest(bindingToken)))
      .resolves.toMatchObject({ accountId: STABLE_B });
    // Владелец канонического сменился; якорь вызывающего прежний (STABLE_A).
    fixture.externalSet(`users/${STABLE_B}`, { firebaseAuthUid: OTHER_UID });
    const writesBefore = fixture.committedWrites.length;
    await expect(handleFirebaseAccountAuthorityLeaseAcquire(
      enabledLease(fixture.db), acquireRequest(bindingToken, RAW_UID, GOOGLE_TOKEN, 'operation-b'),
    )).rejects.toMatchObject({ message: 'account_authority_identity_unresolved' });
    expect(fixture.committedWrites.length).toBe(writesBefore);
  });
});

describe('S2a round 4 L-R3-2: delete from another device of the same uid', () => {
  test('a second installation of the same uid cannot delete while another device holds the lease', async () => {
    const fixture = linkedFixture();
    const first = await bind(fixture, RAW_UID, INSTALLATION_ID, Date.now() - 5_000);
    const second = await bind(fixture, RAW_UID, installationId(3), Date.now());
    const deleteStates = memoryDeleteStateStore(fixture);
    const ports = createFirebaseLeasePorts(fixture.db, { deleteStateStore: deleteStates.port });
    await handleFirebaseAccountAuthorityLeaseAcquire(
      { ports, rolloutEnabled: true, trustedInstallationBindingAvailable: true }, acquireRequest(first.bindingToken),
    );
    await expect(handleAccountDeleteBeginCallable(withMemoryDeletionSideEffects(ports), {
      auth: { uid: RAW_UID, token: GOOGLE_TOKEN },
      app: null,
      data: { operationId: 'delete-operation-a', expectedRevision: 1, bindingToken: second.bindingToken },
    })).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(accountDoc(fixture, STABLE_A)).toMatchObject({ lifecycle: { status: 'active' }, revision: 1 });
    expect(deleteStates.states.size).toBe(0);
  });
});

describe('S2a round 4 L-R3-3: a full receipt journal does not keep the old lease', () => {
  test('release_rejected (stale_lease) on an active old account force-clears this uid lease without a receipt', async () => {
    const fixture = linkedFixture({ [`users/${STABLE_B}`]: { firebaseAuthUid: RAW_UID } });
    const { bindingToken } = await bind(fixture);
    await handleFirebaseAccountAuthorityLeaseAcquire(enabledLease(fixture.db), acquireRequest(bindingToken));
    const old = accountDoc(fixture, STABLE_A) as Record<string, unknown> & {
      revision: number;
      receiptLedger: Record<string, unknown> & { entries: unknown[] };
      activeLease: { sessionId: string };
    };
    // Раунд 5: переполнение журнала больше не отказ (вытеснение). Страховка
    // L-R3-3 проверяется на другом отказе контракта выхода: активная сессия
    // старого аккаунта уже отмечена как отозванная (stale_lease).
    fixture.externalSet(
      `account_authority_accounts_v1/${STABLE_A}/account_authority_retired_sessions_v1/${old.activeLease.sessionId}`,
      { schemaVersion: 'account-authority-retired-session.v1' },
    );
    fixture.externalSet('auth_links/RawFirebaseUidA1234567890', { stable_id: STABLE_B });
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const logger = require('firebase-functions/logger') as typeof import('firebase-functions/logger');
    const lines: unknown[][] = [];
    const warn = jest.spyOn(logger, 'warn').mockImplementation((...args: unknown[]) => { lines.push(args); });
    try {
      await expect(handleFirebaseAccountAuthorityLeaseAcquire(
        enabledLease(fixture.db), acquireRequest(bindingToken, RAW_UID, GOOGLE_TOKEN, 'operation-b'),
      )).resolves.toMatchObject({ accountId: STABLE_B });
    } finally {
      warn.mockRestore();
    }
    const after = accountDoc(fixture, STABLE_A) as typeof old;
    expect(after).toMatchObject({ activeLease: null, revision: old.revision + 1 });
    expect(after.receiptLedger.entries).toHaveLength(old.receiptLedger.entries.length);
    expect(fixture.documents.has(`account_authority_accounts_v1/${STABLE_A}/account_authority_retired_sessions_v1/${old.activeLease.sessionId}`)).toBe(true);
    expect(lines.some((line) => line[0] === '[ACCOUNT-AUTHORITY] principal_rebound lease forced'
      && (line[1] as { reason?: unknown }).reason === 'stale_lease')).toBe(true);
    expect(JSON.stringify(lines)).not.toContain(RAW_UID);
  });
});

describe('S2a round 4 L-R3-4: the two-step identity resolver stays removed', () => {
  test('neither the binding identity port nor the callable identity port comes back', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { readFileSync } = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { join } = require('path') as typeof import('path');
    for (const file of ['installation_binding_callable.ts', 'callable_boundary.ts', 'firebase_lease_callable.ts']) {
      const source = readFileSync(join(__dirname, file), 'utf8');
      expect({ file, port: /createFirebaseInstallationBindingIdentityPort|AccountAuthorityCallableIdentityPort/.test(source) })
        .toEqual({ file, port: false });
    }
  });
});

describe('S2a round 5: the lease receipt journal never refuses an active user', () => {
  test('a renewal through the Firebase adapter adds no receipt and evictions are logged', async () => {
    const fixture = linkedFixture();
    const { bindingToken } = await bind(fixture);
    await handleFirebaseAccountAuthorityLeaseAcquire(enabledLease(fixture.db), acquireRequest(bindingToken));
    for (let index = 0; index < 5; index += 1) {
      await expect(handleFirebaseAccountAuthorityLeaseAcquire(
        enabledLease(fixture.db), acquireRequest(bindingToken, RAW_UID, GOOGLE_TOKEN, `operation-renew-${index}`),
      )).resolves.toMatchObject({ type: 'renewed', revision: 1 });
    }
    const account = accountDoc(fixture, STABLE_A) as { receiptLedger: { entries: unknown[]; retentionMs: number } };
    expect(account.receiptLedger.entries).toHaveLength(1);
    expect(account.receiptLedger.retentionMs).toBe(60 * 60_000);

    // Забитый журнал (ёмкость = живым квитанциям): вход другого устройства не отказ, а вытеснение + лог.
    const second = await bind(fixture, RAW_UID, installationId(4), Date.now() + 1);
    const stored = accountDoc(fixture, STABLE_A) as Record<string, unknown> & { receiptLedger: Record<string, unknown> & { entries: unknown[] } };
    fixture.externalSet(`account_authority_accounts_v1/${STABLE_A}`, {
      ...stored, receiptLedger: { ...stored.receiptLedger, maxEntries: stored.receiptLedger.entries.length },
    });
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const logger = require('firebase-functions/logger') as typeof import('firebase-functions/logger');
    const lines: unknown[][] = [];
    const warn = jest.spyOn(logger, 'warn').mockImplementation((...args: unknown[]) => { lines.push(args); });
    try {
      await expect(handleFirebaseAccountAuthorityLeaseAcquire(
        enabledLease(fixture.db), acquireRequest(second.bindingToken, RAW_UID, GOOGLE_TOKEN, 'operation-device-2'),
      )).resolves.toMatchObject({ type: 'acquired', revision: 2 });
    } finally {
      warn.mockRestore();
    }
    expect(lines.some((line) => line[0] === '[ACCOUNT-AUTHORITY] lease receipts evicted'
      && (line[1] as { evicted?: unknown }).evicted === 1)).toBe(true);
  });
});
