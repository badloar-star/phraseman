import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import {
  AA_ACCOUNTS_COLLECTION,
  AA_DELETE_JOBS_COLLECTION,
  AA_PRINCIPALS_COLLECTION,
} from './account_authority_collections';
import { runAccountDeleteWorkerPass } from './account_delete_worker';
import { handleAccountDeleteBeginCallable } from './callable_boundary';
import {
  createFirebaseLeasePorts,
  handleFirebaseAccountAuthorityLeaseAcquire,
} from './firebase_lease_callable';
import {
  createFirebaseInstallationBindingPorts,
  handleInstallationBindingCallable,
} from './installation_binding_callable';
import { evaluateLegacyWriterPreservedWrite } from '../accounts_v2_migration/preserved_domains';

/*
 * AA S6: матрица сценариев — серверная сторона. Имена тестов `AA-S6 Mxx server …`
 * сверяются с матрицей в пакете сторожем клиентского файла
 * tests/aa_s6_scenario_matrix.test.ts. Firestore — фейк в памяти (эмулятор — S8).
 */

type Doc = Record<string, unknown>;
type Filter = Readonly<{ field: string; op: '==' | '<='; value: unknown }>;

const GOOGLE = Object.freeze({ firebase: Object.freeze({ sign_in_provider: 'google.com' }) });
const ANON = Object.freeze({ firebase: Object.freeze({ sign_in_provider: 'anonymous' }) });
const UID_A = 'RawFirebaseUidA1234567890';
const UID_B = 'RawFirebaseUidB1234567890';
const DEVICE_1 = '550e8400-e29b-41d4-a716-446655440001';
const DEVICE_2 = '550e8400-e29b-41d4-a716-446655440002';
const STABLE_A = 'stable-s6-a';

function isDeleteSentinel(value: unknown): boolean {
  return typeof value === 'object' && value !== null && typeof (value as { isEqual?: unknown }).isEqual === 'function'
    && (value as { isEqual: (other: unknown) => boolean }).isEqual(FieldValue.delete());
}

function fakeFirestore(initial: Readonly<Record<string, Doc>> = {}) {
  const documents = new Map<string, Doc>(Object.entries(initial));
  const snap = (p: string) => ({ exists: documents.has(p), id: p.split('/').pop(), data: () => documents.get(p), ref: docRef(p) });
  const apply = (p: string, value: Doc, merge: boolean) => {
    const base = merge ? { ...(documents.get(p) ?? {}) } : {};
    for (const [key, item] of Object.entries(value)) {
      if (isDeleteSentinel(item)) delete base[key];
      else base[key] = item;
    }
    documents.set(p, base);
  };
  const matches = (data: Doc, filters: readonly Filter[]) => filters.every((f) => (
    f.op === '==' ? data[f.field] === f.value
      : typeof data[f.field] === 'number' && (data[f.field] as number) <= (f.value as number)
  ));
  function query(col: string, filters: readonly Filter[], limit: number | null): Doc {
    return {
      where: (field: string, op: '==' | '<=', value: unknown) => query(col, [...filters, { field, op, value }], limit),
      limit: (value: number) => query(col, filters, value),
      get: async () => {
        const prefix = `${col}/`;
        const docs = [...documents.keys()].sort()
          .filter((k) => k.startsWith(prefix) && !k.slice(prefix.length).includes('/'))
          .filter((k) => matches(documents.get(k) as Doc, filters))
          .slice(0, limit ?? undefined)
          .map(snap);
        return { docs, size: docs.length, empty: docs.length === 0 };
      },
    };
  }
  function colRef(p: string): Doc { return { path: p, doc: (id: string) => docRef(`${p}/${id}`), ...query(p, [], null) }; }
  function docRef(p: string): Doc {
    return {
      path: p,
      id: p.split('/').pop(),
      collection: (n: string) => colRef(`${p}/${n}`),
      get: async () => snap(p),
      set: async (value: Doc, options?: { merge?: boolean }) => apply(p, value, options?.merge === true),
    };
  }
  const db = {
    collection: (n: string) => colRef(n),
    batch: () => {
      const pending: string[] = [];
      return {
        delete: (ref: { path: string }) => { pending.push(ref.path); },
        commit: async () => { for (const p of pending) documents.delete(p); },
      };
    },
    runTransaction: async (work: (tx: unknown) => Promise<unknown>) => {
      const writes: Array<() => void> = [];
      const tx = {
        get: async (ref: { path: string }) => snap(ref.path),
        set: (ref: { path: string }, value: Doc, options?: { merge?: boolean }) => {
          writes.push(() => apply(ref.path, value, options?.merge === true));
        },
        create: (ref: { path: string }, value: Doc) => {
          writes.push(() => {
            if (documents.has(ref.path)) throw Object.assign(new Error('6 ALREADY_EXISTS'), { code: 6 });
            documents.set(ref.path, value);
          });
        },
        delete: (ref: { path: string }) => { writes.push(() => documents.delete(ref.path)); },
      };
      const result = await work(tx);
      for (const write of writes) write();
      return result;
    },
  } as unknown as Firestore;
  return { db, documents };
}

type Fake = ReturnType<typeof fakeFirestore>;

function clock(start = Date.now()) {
  let now = start;
  return () => (now += 1);
}

async function bind(fake: Fake, uid: string, installationId: string, nowMs: () => number) {
  return handleInstallationBindingCallable(
    { ports: { ...createFirebaseInstallationBindingPorts(fake.db), clock: { nowMs } }, rolloutEnabled: true },
    { auth: { uid, token: GOOGLE }, data: { installationId } },
  );
}

function leaseDeps(fake: Fake, nowMs: () => number) {
  return {
    ports: createFirebaseLeasePorts(fake.db, { nowMs, deleteAuthUser: async () => undefined }),
    rolloutEnabled: true,
    trustedInstallationBindingAvailable: true,
  } as const;
}

function acquire(fake: Fake, nowMs: () => number, uid: string, bindingToken: string, operationId: string, expectedRevision: number | null) {
  return handleFirebaseAccountAuthorityLeaseAcquire(leaseDeps(fake, nowMs), {
    auth: { uid, token: GOOGLE }, app: null, data: { operationId, expectedRevision, bindingToken },
  });
}

function principals(fake: Fake): Doc[] {
  return [...fake.documents.entries()].filter(([key]) => key.startsWith(`${AA_PRINCIPALS_COLLECTION}/`)).map(([, value]) => value);
}

function leaseDoc(fake: Fake, accountId: string): Doc {
  return fake.documents.get(`${AA_ACCOUNTS_COLLECTION}/${accountId}`) as Doc;
}

function linked(): Fake {
  return fakeFirestore({ [`auth_links/${UID_A}`]: { stable_id: STABLE_A }, [`users/${STABLE_A}`]: { firebaseAuthUid: UID_A } });
}

describe('AA-S6 матрица: сервер', () => {
  test('AA-S6 M01 server новый пользователь: принципал acct-…, активная аренда этого устройства', async () => {
    const fake = fakeFirestore();
    const now = clock();
    const { bindingToken } = await bind(fake, UID_A, DEVICE_1, now);
    const lease = await acquire(fake, now, UID_A, bindingToken, 'op-a-1', null);
    expect(lease).toMatchObject({ type: 'acquired', revision: 1, previousLeaseRevoked: false });
    expect(lease.accountId).toMatch(/^acct-/);
    expect(principals(fake)).toEqual([expect.objectContaining({ accountId: lease.accountId, accountSource: 'new_account' })]);
    expect(leaseDoc(fake, lease.accountId)).toMatchObject({ activeLease: { sessionId: lease.sessionId }, lifecycle: { status: 'active' } });
  });

  test('AA-S6 M02 server существующий аккаунт: принципал на stableId, повторный вход — продление', async () => {
    const fake = linked();
    const now = clock();
    const { bindingToken } = await bind(fake, UID_A, DEVICE_1, now);
    const first = await acquire(fake, now, UID_A, bindingToken, 'op-a-1', null);
    expect(first.accountId).toBe(STABLE_A);
    const renewed = await acquire(fake, now, UID_A, bindingToken, 'op-a-2', first.revision);
    expect(renewed).toMatchObject({ type: 'renewed', accountId: STABLE_A, sessionId: first.sessionId, revision: first.revision });
  });

  test('AA-S6 M03 server аноним: вход отклонён до чтений Firestore', async () => {
    const fake = fakeFirestore();
    await expect(handleFirebaseAccountAuthorityLeaseAcquire(leaseDeps(fake, clock()), {
      auth: { uid: UID_A, token: ANON }, app: null, data: { operationId: 'op-anon', expectedRevision: null, bindingToken: 'x' },
    })).rejects.toMatchObject({ code: 'permission-denied', message: 'account_authority_anonymous_rejected' });
    expect(fake.documents.size).toBe(0);
  });

  test('AA-S6 M04 server смена A→B→A на одном устройстве: раздельные принципалы и аренды', async () => {
    const fake = fakeFirestore();
    const now = clock();
    const bindA = await bind(fake, UID_A, DEVICE_1, now);
    const a1 = await acquire(fake, now, UID_A, bindA.bindingToken, 'op-a-1', null);
    const bindB = await bind(fake, UID_B, DEVICE_1, now);
    const b1 = await acquire(fake, now, UID_B, bindB.bindingToken, 'op-b-1', null);
    const a2 = await acquire(fake, now, UID_A, bindA.bindingToken, 'op-a-2', a1.revision);
    expect(b1.accountId).not.toBe(a1.accountId);
    expect(a2.accountId).toBe(a1.accountId);
    expect(principals(fake)).toHaveLength(2);
    expect(JSON.stringify(leaseDoc(fake, a1.accountId))).not.toContain(b1.sessionId);
    expect(JSON.stringify(leaseDoc(fake, b1.accountId))).not.toContain(a1.sessionId);
  });

  test('AA-S6 M05 server два устройства: вход второго отзывает аренду первого; продление первого — revision_mismatch', async () => {
    const fake = linked();
    const now = clock();
    const d1 = await bind(fake, UID_A, DEVICE_1, now);
    const first = await acquire(fake, now, UID_A, d1.bindingToken, 'op-d1-1', null);
    const d2 = await bind(fake, UID_A, DEVICE_2, now);
    const second = await acquire(fake, now, UID_A, d2.bindingToken, 'op-d2-1', null);
    expect(second).toMatchObject({ type: 'acquired', previousLeaseRevoked: true, revision: first.revision + 1 });
    await expect(acquire(fake, now, UID_A, d1.bindingToken, 'op-d1-2', first.revision))
      .rejects.toMatchObject({ code: 'failed-precondition', details: { leaseCode: 'revision_mismatch' } });
  });

  test('AA-S6 M06 server возврат входом: новая эпоха привязки + вход без ревизии забирает аренду обратно', async () => {
    const fake = linked();
    const now = clock();
    const d1 = await bind(fake, UID_A, DEVICE_1, now);
    await acquire(fake, now, UID_A, d1.bindingToken, 'op-d1-1', null);
    const d2 = await bind(fake, UID_A, DEVICE_2, now);
    const second = await acquire(fake, now, UID_A, d2.bindingToken, 'op-d2-1', null);
    // Старая эпоха первого устройства — stale_auth_epoch; клиент ротирует привязку.
    await expect(acquire(fake, now, UID_A, d1.bindingToken, 'op-d1-2', null))
      .rejects.toMatchObject({ details: { leaseCode: 'stale_auth_epoch' } });
    const rotated = await bind(fake, UID_A, DEVICE_1, now);
    const back = await acquire(fake, now, UID_A, rotated.bindingToken, 'op-d1-3', null);
    expect(back).toMatchObject({ type: 'acquired', previousLeaseRevoked: true, revision: second.revision + 1 });
  });

  test('AA-S6 M10 server обрыв при входе: повтор той же операции идемпотентен', async () => {
    const fake = fakeFirestore();
    const now = clock();
    const { bindingToken } = await bind(fake, UID_A, DEVICE_1, now);
    const first = await acquire(fake, now, UID_A, bindingToken, 'op-a-1', null);
    const replay = await acquire(fake, now, UID_A, bindingToken, 'op-a-1', null);
    expect(replay).toMatchObject({ idempotent: true, sessionId: first.sessionId, revision: first.revision });
  });

  test('AA-S6 M11 server обрыв при удалении: повтор delete_begin отдаёт ту же задачу; фоновый проход доводит purge', async () => {
    const fake = linked();
    const now = clock();
    const { bindingToken } = await bind(fake, UID_A, DEVICE_1, now);
    const lease = await acquire(fake, now, UID_A, bindingToken, 'op-a-1', null);
    const ports = createFirebaseLeasePorts(fake.db, { nowMs: now, deleteAuthUser: async () => { throw Object.assign(new Error('x'), { code: 'auth/internal-error' }); } });
    const request = (operationId: string) => ({
      auth: { uid: UID_A, token: GOOGLE }, app: null, data: { operationId, expectedRevision: lease.revision, bindingToken },
    });
    const first = await handleAccountDeleteBeginCallable(ports, request('del-1'));
    const replay = await handleAccountDeleteBeginCallable(ports, request('del-1'));
    expect(replay.jobId).toBe(first.jobId);
    expect(first.status).toBe('identity_release_pending');
    const summary = await runAccountDeleteWorkerPass({
      db: fake.db, nowMs: () => now() + 60 * 60_000, overrides: { nowMs: () => now() + 60 * 60_000, deleteAuthUser: async () => undefined },
    });
    expect(summary).toMatchObject({ purged: 1 });
    expect(fake.documents.get(`${AA_DELETE_JOBS_COLLECTION}/${STABLE_A}`)).toMatchObject({ job: { status: 'purged' } });
    expect(principals(fake)).toHaveLength(0);
  });

  test('AA-S6 M13 server удаление + повтор новым запросом: та же задача, Auth удаляется один раз', async () => {
    const fake = linked();
    const now = clock();
    const { bindingToken } = await bind(fake, UID_A, DEVICE_1, now);
    const lease = await acquire(fake, now, UID_A, bindingToken, 'op-a-1', null);
    const deleteAuthUser = jest.fn(async () => undefined);
    const ports = createFirebaseLeasePorts(fake.db, { nowMs: now, deleteAuthUser });
    const request = (operationId: string) => ({
      auth: { uid: UID_A, token: GOOGLE }, app: null, data: { operationId, expectedRevision: lease.revision, bindingToken },
    });
    const first = await handleAccountDeleteBeginCallable(ports, request('del-1'));
    const second = await handleAccountDeleteBeginCallable(ports, request('del-2'));
    expect(second.jobId).toBe(first.jobId);
    expect(deleteAuthUser).toHaveBeenCalledTimes(1);
    expect(leaseDoc(fake, STABLE_A)).toMatchObject({ activeLease: null, lifecycle: { status: 'deleting' } });
  });

  test('AA-S6 M14 server переустановка: новая установка того же uid получает привязку и аренду', async () => {
    const fake = linked();
    const now = clock();
    const before = await bind(fake, UID_A, DEVICE_1, now);
    const first = await acquire(fake, now, UID_A, before.bindingToken, 'op-a-1', null);
    const after = await bind(fake, UID_A, DEVICE_2, now);
    expect(after.bindingToken).not.toBe(before.bindingToken);
    const lease = await acquire(fake, now, UID_A, after.bindingToken, 'op-reinstall-1', null);
    expect(lease).toMatchObject({ accountId: STABLE_A, type: 'acquired', previousLeaseRevoked: true });
    expect(lease.sessionId).not.toBe(first.sessionId);
  });

  test('AA-S6 M16 server 1.6.24 рядом: контракт допуска старого писателя', () => {
    const base = { writer: 'legacy_1_6_24', domain: 'lesson_progress', cutoverEnabled: true } as const;
    expect(evaluateLegacyWriterPreservedWrite({ ...base, cutoverEnabled: false, accountMigration: 'migrated' }))
      .toMatchObject({ allowed: true, reason: 'cutover_off' });
    expect(evaluateLegacyWriterPreservedWrite({ ...base, accountMigration: 'unknown' }))
      .toMatchObject({ allowed: true, reason: 'migration_state_unknown_allowed' });
    expect(evaluateLegacyWriterPreservedWrite({ ...base, accountMigration: 'migrated' }))
      .toMatchObject({ allowed: false, reason: 'legacy_write_after_authority_migration' });
  });

  test('AA-S6 M17 server удаление A не трогает B: принципал и аренда B на месте', async () => {
    const fake = linked();
    const now = clock();
    const bindA = await bind(fake, UID_A, DEVICE_1, now);
    const a = await acquire(fake, now, UID_A, bindA.bindingToken, 'op-a-1', null);
    const bindB = await bind(fake, UID_B, DEVICE_2, now);
    const b = await acquire(fake, now, UID_B, bindB.bindingToken, 'op-b-1', null);
    const ports = createFirebaseLeasePorts(fake.db, { nowMs: now, deleteAuthUser: async () => undefined });
    await handleAccountDeleteBeginCallable(ports, {
      auth: { uid: UID_A, token: GOOGLE }, app: null, data: { operationId: 'del-a', expectedRevision: a.revision, bindingToken: bindA.bindingToken },
    });
    await runAccountDeleteWorkerPass({ db: fake.db, nowMs: now, overrides: { nowMs: now, deleteAuthUser: async () => undefined } });
    expect(principals(fake)).toEqual([expect.objectContaining({ accountId: b.accountId })]);
    expect(leaseDoc(fake, b.accountId)).toMatchObject({ activeLease: { sessionId: b.sessionId }, lifecycle: { status: 'active' } });
  });

  test('AA-S6 M18 server логи сценариев без сырого uid и токенов', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const logger = require('firebase-functions/logger') as typeof import('firebase-functions/logger');
    const calls: unknown[] = [];
    const spies = (['info', 'warn', 'error'] as const).map((level) => jest.spyOn(logger, level).mockImplementation((...args: unknown[]) => {
      calls.push(args);
    }));
    try {
      const fake = linked();
      const now = clock();
      const { bindingToken } = await bind(fake, UID_A, DEVICE_1, now);
      const lease = await acquire(fake, now, UID_A, bindingToken, 'op-a-1', null);
      const ports = createFirebaseLeasePorts(fake.db, { nowMs: now, deleteAuthUser: async () => undefined });
      await handleAccountDeleteBeginCallable(ports, {
        auth: { uid: UID_A, token: GOOGLE }, app: null, data: { operationId: 'del-a', expectedRevision: lease.revision, bindingToken },
      });
      const text = JSON.stringify(calls);
      expect(calls.length).toBeGreaterThan(5);
      expect(text).not.toContain(UID_A);
      expect(text).not.toContain(bindingToken);
      expect(text).not.toContain(STABLE_A);
    } finally {
      for (const spy of spies) spy.mockRestore();
    }
  });
});
