import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import {
  AA_ACCOUNTS_COLLECTION,
  AA_DELETE_JOBS_COLLECTION,
  AA_INSTALLATION_BINDING_TOKENS_COLLECTION,
  AA_INSTALLATION_BINDINGS_COLLECTION,
  AA_PRINCIPALS_COLLECTION,
} from './account_authority_collections';
import { accountAuthorityAuthUidHash, accountAuthorityFingerprintFromAuthUidHash } from './account_authority_policy';
import {
  ACCOUNT_DELETE_IDENTITY_RETRY_BASE_MS,
  ACCOUNT_DELETE_IDENTITY_RETRY_MAX_MS,
  ACCOUNT_DELETE_PENDING_AUTH_UID_FIELD,
  ACCOUNT_DELETE_WORK_MAX_FAILURES,
  ACCOUNT_DELETE_WORK_RETRY_MAX_MS,
  accountDeleteIdentityRetryDelayMs,
  countQuarantinedAccountDeleteJobs,
  recordAccountDeleteWorkFailure,
  accountDeletePendingWorkAtMs,
  listDueAccountDeletePendingWork,
} from './account_delete_store';
import { runAccountDeleteWorkerPass } from './account_delete_worker';
import { ACCOUNT_DELETE_RECEIPT_RETENTION_MS } from './delete_contract';
import {
  createFirebaseAccountDeleteWorkerPorts,
  createFirebaseLeasePorts,
  handleFirebaseAccountAuthorityDeleteBegin,
} from './firebase_lease_callable';
import { handleAccountDeleteBeginCallable } from './callable_boundary';
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

/*
 * AA S4a (сервер): порты удаления подключены по умолчанию; фоновый обработчик
 * повторяет освобождение Auth, гонит ограниченный purge и истекает квитанции.
 * Firestore — фейк в памяти (эмулятор — S8).
 */

type Doc = Record<string, unknown>;
type Filter = Readonly<{ field: string; op: '==' | '<=' | '>'; value: unknown }>;

const TENANT = asTenantId('phraseman-primary');
const RAW = 'RawUidS4a01';
const STABLE = 'stable-s4a-a';
const TOKEN = ['binding', 'token', 's4a'].join('-');
const GOOGLE = { firebase: { sign_in_provider: 'google.com' } };
const JOB_PATH = `${AA_DELETE_JOBS_COLLECTION}/${STABLE}`;

function isDeleteSentinel(value: unknown): boolean {
  return typeof value === 'object' && value !== null && typeof (value as { isEqual?: unknown }).isEqual === 'function'
    && (value as { isEqual: (other: unknown) => boolean }).isEqual(FieldValue.delete());
}

function fakeFirestore(initial: Readonly<Record<string, Doc>> = {}) {
  const documents = new Map<string, Doc>(Object.entries(initial));
  const stats = { transactions: 0, queryLimits: [] as number[], unboundedQueries: 0, directSets: 0, countQueries: 0 };
  const snap = (p: string) => ({ exists: documents.has(p), id: p.split('/').pop(), data: () => documents.get(p), ref: docRef(p) });
  const matches = (data: Doc, filters: readonly Filter[]) => filters.every((f) => {
    if (f.op === '==') return data[f.field] === f.value;
    if (typeof data[f.field] !== 'number') return false;
    return f.op === '<=' ? (data[f.field] as number) <= (f.value as number) : (data[f.field] as number) > (f.value as number);
  });
  function query(col: string, filters: readonly Filter[], limit: number | null): Doc {
    return {
      where: (field: string, op: '==' | '<=' | '>', value: unknown) => query(col, [...filters, { field, op, value }], limit),
      // S4a раунд 3 (L-A2): серверная агрегация — документы наружу не отдаются.
      count: () => ({
        get: async () => {
          stats.countQueries += 1;
          const prefix = `${col}/`;
          const count = [...documents.keys()]
            .filter((k) => k.startsWith(prefix) && !k.slice(prefix.length).includes('/'))
            .filter((k) => matches(documents.get(k) as Doc, filters)).length;
          return { data: () => ({ count }) };
        },
      }),
      limit: (value: number) => query(col, filters, value),
      get: async () => {
        if (limit === null) stats.unboundedQueries += 1;
        else stats.queryLimits.push(limit);
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
      // S4a раунд 2: точечная запись служебных полей задачи (merge, FieldValue.delete).
      set: async (value: Doc, options?: { merge?: boolean }) => {
        stats.directSets += 1;
        const base = options?.merge === true ? { ...(documents.get(p) ?? {}) } : {};
        for (const [key, item] of Object.entries(value)) {
          if (isDeleteSentinel(item)) delete base[key];
          else base[key] = item;
        }
        documents.set(p, base);
      },
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
      stats.transactions += 1;
      const writes: Array<() => void> = [];
      const tx = {
        get: async (ref: { path: string }) => snap(ref.path),
        set: (ref: { path: string }, value: Doc, options?: { merge?: boolean }) => {
          writes.push(() => {
            const base = options?.merge === true ? { ...(documents.get(ref.path) ?? {}) } : {};
            for (const [key, item] of Object.entries(value)) {
              if (isDeleteSentinel(item)) delete base[key];
              else base[key] = item;
            }
            documents.set(ref.path, base);
          });
        },
        create: (ref: { path: string }, value: Doc) => { writes.push(() => documents.set(ref.path, value)); },
        delete: (ref: { path: string }) => { writes.push(() => documents.delete(ref.path)); },
      };
      const result = await work(tx);
      for (const write of writes) write();
      return result;
    },
  } as unknown as Firestore;
  return { db, documents, stats };
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function principalPath(uid: string): string {
  const fingerprint = accountAuthorityFingerprintFromAuthUidHash(accountAuthorityAuthUidHash(uid));
  return `${AA_PRINCIPALS_COLLECTION}/${sha256(JSON.stringify([TENANT, fingerprint]))}`;
}

/** Живой аккаунт: индекс токена, привязка, принципал v2, аренда с активной сессией. */
function deleteBeginFixture(): Record<string, Doc> {
  const hash = accountAuthorityAuthUidHash(RAW);
  const subject = asFirebaseAuthUid(accountAuthorityFingerprintFromAuthUidHash(hash));
  const tokenHash = sha256(`account-authority-binding-token.v1\u0000${TOKEN}`);
  const bindingKey = 'f'.repeat(64);
  const providerSubject = asProviderSubject(`firebase-${sha256(RAW)}`);
  const lease = startOrRenewAccountLease(createEmptyAccountLeaseState(asAccountId(STABLE), TENANT), {
    principal: { accountId: asAccountId(STABLE), tenantId: TENANT, firebaseAuthUid: subject, providerSubject, authEpoch: 1_000 },
    deviceId: asDeviceId('device-binding-s4a'),
    sessionId: asSessionId('session-0c0c0c0c-0c0c-4c0c-8c0c-0c0c0c0c0c0c'),
    operationId: asOperationId('acquire-s4a-a'),
    expectedRevision: 0,
    serverNowMs: 1_000,
  }, { isRetired: () => false }).state;
  return {
    [`${AA_INSTALLATION_BINDING_TOKENS_COLLECTION}/${tokenHash}`]: {
      schemaVersion: 'account-authority-installation-binding-index.v1',
      bindingKey, bindingTokenHash: tokenHash, authUidHash: hash, rotatedAtMs: 1_000,
    },
    [`${AA_INSTALLATION_BINDINGS_COLLECTION}/${bindingKey}`]: {
      schemaVersion: 'account-authority-installation-binding-record.v1',
      authUidHash: hash, installationIdHash: 'e'.repeat(64), bindingTokenHash: tokenHash,
      deviceBindingId: 'device-binding-s4a', createdAtMs: 1_000, rotatedAtMs: 1_000, revokedAtMs: null,
    },
    [principalPath(RAW)]: {
      schemaVersion: 'account-authority-principal.v2', accountId: STABLE, tenantId: TENANT,
      authUidHash: hash, providerSubject, accountSource: 'existing_stable_id', anchorLink: STABLE,
    },
    [`${AA_ACCOUNTS_COLLECTION}/${STABLE}`]: { schemaVersion: 'account-authority-firestore-lease.v1', ...lease, expireAt: null },
  };
}

function clock(start = 10_000) {
  let now = start;
  return { nowMs: () => (now += 1), jump: (ms: number) => { now += ms; } };
}

function deleteBegin(fake: ReturnType<typeof fakeFirestore>, ports: ReturnType<typeof createFirebaseLeasePorts>, operationId = 'delete-operation-s4a') {
  return handleAccountDeleteBeginCallable(ports, {
    auth: { uid: RAW, token: GOOGLE },
    app: null,
    data: { operationId, expectedRevision: 1, bindingToken: TOKEN },
  });
}

describe('AA S4a: порты удаления подключены по умолчанию', () => {
  test('без подмен хранилища/освобождения delete_begin пишет задачу и удаляет Auth в запросе', async () => {
    const fake = fakeFirestore(deleteBeginFixture());
    const time = clock();
    const deleteAuthUser = jest.fn(async () => undefined);
    const ports = createFirebaseLeasePorts(fake.db, { nowMs: time.nowMs, deleteAuthUser });
    await expect(deleteBegin(fake, ports)).resolves.toMatchObject({ status: 'purge_queued' });
    expect(deleteAuthUser).toHaveBeenCalledWith(RAW);
    const job = fake.documents.get(JOB_PATH) as Doc;
    expect(job).toMatchObject({ job: { status: 'purge_queued', pendingProviderIdentity: null } });
    expect(job).not.toHaveProperty(ACCOUNT_DELETE_PENDING_AUTH_UID_FIELD);
    // зачем: задача без срока квитанции видна фоновому обработчику по pendingWorkAtMs.
    expect(typeof job.pendingWorkAtMs).toBe('number');
  });

  test('повтор delete_begin идемпотентен: тот же jobId, Auth не удаляется повторно', async () => {
    const fake = fakeFirestore(deleteBeginFixture());
    const time = clock();
    const deleteAuthUser = jest.fn(async () => undefined);
    const ports = createFirebaseLeasePorts(fake.db, { nowMs: time.nowMs, deleteAuthUser });
    const first = await deleteBegin(fake, ports);
    const second = await deleteBegin(fake, ports, 'delete-operation-s4a-retry');
    expect(second.jobId).toBe(first.jobId);
    expect(second.status).toBe('purge_queued');
    expect(deleteAuthUser).toHaveBeenCalledTimes(1);
  });

  test('ворота: rollout выключен — отказ до любых транзакций', async () => {
    const fake = fakeFirestore(deleteBeginFixture());
    await expect(handleFirebaseAccountAuthorityDeleteBegin(
      { ports: createFirebaseLeasePorts(fake.db, { deleteAuthUser: async () => undefined }), rolloutEnabled: false },
      { auth: { uid: RAW, token: GOOGLE }, app: null, data: { operationId: 'x-op-1', expectedRevision: 1, bindingToken: TOKEN } },
    )).rejects.toMatchObject({ code: 'failed-precondition', message: 'account_authority_disabled' });
    expect(fake.stats.transactions).toBe(0);
  });

  test('обработчик и callable удаления не экспортируются из index.ts; rollout выключен в исходнике', () => {
    const index = readFileSync(path.join(__dirname, '..', 'index.ts'), 'utf8');
    expect(index).not.toMatch(/account_authority\/(account_delete_worker|firebase_lease_callable)/);
    expect(index).not.toMatch(/accountAuthorityDeleteBegin|runAccountDeleteWorkerPass/);
    const source = readFileSync(path.join(__dirname, 'firebase_lease_callable.ts'), 'utf8');
    expect(source.match(/rolloutEnabled: false/g)?.length).toBe(3);
  });
});

describe('AA S4a: фоновый обработчик повтора / purge / истечения', () => {
  async function beginWithFailedAuth() {
    const fake = fakeFirestore(deleteBeginFixture());
    const time = clock();
    const offline = Object.assign(new Error('offline'), { code: 'auth/internal-error' });
    const failing = jest.fn(async () => { throw offline; });
    const ports = createFirebaseLeasePorts(fake.db, { nowMs: time.nowMs, deleteAuthUser: failing });
    await expect(deleteBegin(fake, ports)).resolves.toMatchObject({ status: 'identity_release_pending' });
    expect(fake.documents.get(JOB_PATH)).toMatchObject({ [ACCOUNT_DELETE_PENDING_AUTH_UID_FIELD]: RAW });
    // S4a раунд 2 (LOW-1): после сбоя в запросе — пауза перед повтором.
    time.jump(ACCOUNT_DELETE_IDENTITY_RETRY_BASE_MS);
    return { fake, time };
  }

  test('повтор освобождает Auth, стирает pendingAuthUid и доводит purge до конца', async () => {
    const { fake, time } = await beginWithFailedAuth();
    const recovered = jest.fn(async () => undefined);
    const summary = await runAccountDeleteWorkerPass({
      db: fake.db, nowMs: time.nowMs, overrides: { nowMs: time.nowMs, deleteAuthUser: recovered },
    });
    expect(recovered).toHaveBeenCalledWith(RAW);
    expect(summary).toMatchObject({ pendingListed: 1, identityReleased: 1, purged: 1, failed: 0 });
    const job = fake.documents.get(JOB_PATH) as Doc;
    expect(job).not.toHaveProperty(ACCOUNT_DELETE_PENDING_AUTH_UID_FIELD);
    expect(job).toMatchObject({ job: { status: 'purged' }, pendingWorkAtMs: null });
    expect(fake.documents.has(principalPath(RAW))).toBe(false);
    expect([...fake.documents.keys()].some((k) => k.startsWith(`${AA_INSTALLATION_BINDINGS_COLLECTION}/`))).toBe(false);
    expect(fake.documents.get(`${AA_ACCOUNTS_COLLECTION}/${STABLE}`)).toMatchObject({ lifecycle: { status: 'deleted' } });
    // Firebase-экономия: все запросы обработчика и purge — с лимитом.
    expect(fake.stats.unboundedQueries).toBe(0);
  });

  test('сбой повтора оставляет задачу должной; следующий проход завершает', async () => {
    const { fake, time } = await beginWithFailedAuth();
    const stillOffline = jest.fn(async () => { throw Object.assign(new Error('x'), { code: 'auth/internal-error' }); });
    const first = await runAccountDeleteWorkerPass({
      db: fake.db, nowMs: time.nowMs, overrides: { nowMs: time.nowMs, deleteAuthUser: stillOffline },
    });
    expect(first).toMatchObject({ identityRetryScheduled: 1, purged: 0 });
    expect(fake.documents.get(JOB_PATH)).toMatchObject({ [ACCOUNT_DELETE_PENDING_AUTH_UID_FIELD]: RAW });
    // Второй сбой — пауза 2 мин: сразу задача не должна.
    expect(await listDueAccountDeletePendingWork(fake.db, time.nowMs(), 10)).toEqual([]);
    time.jump(2 * ACCOUNT_DELETE_IDENTITY_RETRY_BASE_MS);
    const second = await runAccountDeleteWorkerPass({
      db: fake.db, nowMs: time.nowMs, overrides: { nowMs: time.nowMs, deleteAuthUser: async () => undefined },
    });
    expect(second).toMatchObject({ identityReleased: 1, purged: 1 });
  });

  test('задача без шага (purged) не попадает в список; истекшая квитанция переводится в expired', async () => {
    const { fake, time } = await beginWithFailedAuth();
    await runAccountDeleteWorkerPass({ db: fake.db, nowMs: time.nowMs, overrides: { nowMs: time.nowMs, deleteAuthUser: async () => undefined } });
    expect(await listDueAccountDeletePendingWork(fake.db, time.nowMs(), 10)).toEqual([]);
    time.jump(ACCOUNT_DELETE_RECEIPT_RETENTION_MS + 1);
    const summary = await runAccountDeleteWorkerPass({
      db: fake.db, nowMs: time.nowMs, overrides: { nowMs: time.nowMs, deleteAuthUser: async () => undefined },
    });
    expect(summary).toMatchObject({ pendingListed: 0, expiredListed: 1, expired: 1 });
    expect(fake.documents.get(JOB_PATH)).toMatchObject({ job: { status: 'expired' }, expirySweepAtMs: null });
  });

  test('сбой одной задачи не останавливает проход и пишется в лог', async () => {
    const { fake, time } = await beginWithFailedAuth();
    const ports = createFirebaseAccountDeleteWorkerPorts(fake.db, { nowMs: time.nowMs, deleteAuthUser: async () => undefined });
    const broken = { ...ports, transactions: { transact: async () => { throw Object.assign(new Error('aborted'), { code: 10 }); } } };
    const summary = await runAccountDeleteWorkerPass({ db: fake.db, nowMs: time.nowMs, ports: broken });
    expect(summary).toMatchObject({ pendingListed: 1, failed: 1, purged: 0, backedOff: 1 });
    expect(fake.documents.get(JOB_PATH)).toMatchObject({ workFailures: 1, workLastFailureCode: expect.any(String) });
  });

  test('LOW-1: пауза между повторами освобождения Auth нарастает и ограничена', () => {
    expect(accountDeleteIdentityRetryDelayMs(0)).toBe(0);
    expect(accountDeleteIdentityRetryDelayMs(1)).toBe(ACCOUNT_DELETE_IDENTITY_RETRY_BASE_MS);
    expect(accountDeleteIdentityRetryDelayMs(2)).toBe(2 * ACCOUNT_DELETE_IDENTITY_RETRY_BASE_MS);
    expect(accountDeleteIdentityRetryDelayMs(3)).toBe(4 * ACCOUNT_DELETE_IDENTITY_RETRY_BASE_MS);
    expect(accountDeleteIdentityRetryDelayMs(40)).toBe(ACCOUNT_DELETE_IDENTITY_RETRY_MAX_MS);
    const base = { accountId: asAccountId('a'), tenantId: TENANT, lastServerNowMs: 1 };
    const job = { status: 'identity_release_pending', updatedAtMs: 1_000, identityReleaseClaim: null, purgeClaim: null };
    expect(accountDeletePendingWorkAtMs({ ...base, job: { ...job, identityReleaseFailuresCompleted: 0 } } as never)).toBe(1_000);
    expect(accountDeletePendingWorkAtMs({ ...base, job: { ...job, identityReleaseFailuresCompleted: 2 } } as never))
      .toBe(1_000 + 2 * ACCOUNT_DELETE_IDENTITY_RETRY_BASE_MS);
  });

  test('LOW-1: после сбоя Auth в запросе задача не должна до конца паузы', async () => {
    const fake = fakeFirestore(deleteBeginFixture());
    const time = clock();
    const ports = createFirebaseLeasePorts(fake.db, {
      nowMs: time.nowMs, deleteAuthUser: async () => { throw Object.assign(new Error('x'), { code: 'auth/internal-error' }); },
    });
    await deleteBegin(fake, ports);
    expect(await listDueAccountDeletePendingWork(fake.db, time.nowMs(), 10)).toEqual([]);
    time.jump(ACCOUNT_DELETE_IDENTITY_RETRY_BASE_MS);
    expect(await listDueAccountDeletePendingWork(fake.db, time.nowMs(), 10)).toHaveLength(1);
  });

  test('pendingWorkAtMs: занятая задача становится должной по истечении claim', () => {
    const base = { accountId: asAccountId('a'), tenantId: TENANT, lastServerNowMs: 1 };
    const job = { status: 'purge_queued', updatedAtMs: 50, purgeClaim: { leaseExpiresAtMs: 90 }, identityReleaseClaim: null };
    expect(accountDeletePendingWorkAtMs({ ...base, job } as never)).toBe(90);
    expect(accountDeletePendingWorkAtMs({ ...base, job: { ...job, purgeClaim: null } } as never)).toBe(50);
    expect(accountDeletePendingWorkAtMs({ ...base, job: { ...job, status: 'purged' } } as never)).toBeNull();
    expect(accountDeletePendingWorkAtMs({ ...base, job: null } as never)).toBeNull();
  });
});

describe('AA S4a раунд 2 (M-S4a-1): отравленные задачи не держат очередь', () => {
  /** Документ, который проходит выборку, но не разбирается контрактом (сбой ДО записи). */
  function poisoned(id: string): Doc {
    return {
      schemaVersion: 'account-authority-delete-state.v1', accountId: id, tenantId: TENANT, lastServerNowMs: 1,
      job: { jobId: `job-${id}`, status: 'purge_queued', recentPurgeCursors: 'bad' }, pendingWorkAtMs: 0,
    };
  }

  test('20 отравленных + 1 здоровая: здоровая обработана за ≤ 2 проходов, отравленные отодвинуты', async () => {
    const docs = deleteBeginFixture();
    for (let index = 0; index < 20; index += 1) {
      const id = `a-poison-${String(index).padStart(2, '0')}`;
      docs[`${AA_DELETE_JOBS_COLLECTION}/${id}`] = poisoned(id);
    }
    const fake = fakeFirestore(docs);
    const time = clock();
    const ports = createFirebaseLeasePorts(fake.db, { nowMs: time.nowMs, deleteAuthUser: async () => undefined });
    await expect(deleteBegin(fake, ports)).resolves.toMatchObject({ status: 'purge_queued' });
    const run = () => runAccountDeleteWorkerPass({
      db: fake.db, nowMs: time.nowMs, overrides: { nowMs: time.nowMs, deleteAuthUser: async () => undefined },
    });
    const first = await run();
    expect(first).toMatchObject({ pendingListed: 20, failed: 20, backedOff: 20, purged: 0 });
    const second = await run();
    expect(second).toMatchObject({ pendingListed: 1, purged: 1, failed: 0 });
    expect(fake.documents.get(JOB_PATH)).toMatchObject({ job: { status: 'purged' } });
    // job отравленной задачи не тронут (служебные поля — вне job).
    expect(fake.documents.get(`${AA_DELETE_JOBS_COLLECTION}/a-poison-00`)).toMatchObject({
      job: { recentPurgeCursors: 'bad' }, workFailures: 1,
    });
  });

  test(`после ${ACCOUNT_DELETE_WORK_MAX_FAILURES} сбоев задача снимается с очереди и больше не выбирается`, async () => {
    const path = `${AA_DELETE_JOBS_COLLECTION}/a-poison-q`;
    const fake = fakeFirestore({ [path]: poisoned('a-poison-q') });
    const time = clock();
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      for (let pass = 1; pass <= ACCOUNT_DELETE_WORK_MAX_FAILURES; pass += 1) {
        const summary = await runAccountDeleteWorkerPass({ db: fake.db, nowMs: time.nowMs, overrides: { nowMs: time.nowMs } });
        expect(summary.pendingListed).toBe(1);
        expect(summary.quarantined).toBe(pass === ACCOUNT_DELETE_WORK_MAX_FAILURES ? 1 : 0);
        time.jump(ACCOUNT_DELETE_WORK_RETRY_MAX_MS);
      }
    } finally {
      error.mockRestore();
    }
    expect(fake.documents.get(path)).toMatchObject({
      pendingWorkAtMs: null, workFailures: ACCOUNT_DELETE_WORK_MAX_FAILURES, workQuarantinedAtMs: expect.any(Number),
      job: { recentPurgeCursors: 'bad' },
    });
    const after = await runAccountDeleteWorkerPass({ db: fake.db, nowMs: time.nowMs, overrides: { nowMs: time.nowMs } });
    expect(after.pendingListed).toBe(0);
    // L-A2: счётчик снятых — агрегация .count(), без выкачивания документов.
    expect(await countQuarantinedAccountDeleteJobs(fake.db)).toBe(1);
    expect(fake.stats.countQueries).toBe(1);
  });

  test('M-A1: контракт перевёл задачу в purged между выборкой и записью сбоя — не воскресает и не снимается', async () => {
    const fake = fakeFirestore(deleteBeginFixture());
    const time = clock();
    const ports = createFirebaseAccountDeleteWorkerPorts(fake.db, { nowMs: time.nowMs, deleteAuthUser: async () => undefined });
    await deleteBegin(fake, createFirebaseLeasePorts(fake.db, { nowMs: time.nowMs, deleteAuthUser: async () => undefined }));
    const racing = {
      ...ports,
      transactions: {
        transact: async () => {
          // Параллельный проход успел завершить purge, а этот упал.
          const doc = fake.documents.get(JOB_PATH) as Doc;
          fake.documents.set(JOB_PATH, { ...doc, job: { ...(doc.job as Doc), status: 'purged' }, pendingWorkAtMs: null });
          throw Object.assign(new Error('aborted'), { code: 10 });
        },
      },
    };
    const summary = await runAccountDeleteWorkerPass({ db: fake.db, nowMs: time.nowMs, ports: racing });
    expect(summary).toMatchObject({ failed: 1, backedOff: 0, quarantined: 0, staleFailures: 1 });
    const doc = fake.documents.get(JOB_PATH) as Doc;
    expect(doc).toMatchObject({ job: { status: 'purged' }, pendingWorkAtMs: null });
    expect(doc).not.toHaveProperty('workFailures');
    expect(doc).not.toHaveProperty('workQuarantinedAtMs');
  });

  test('M-A1: запись сбоя с устаревшим наблюдением ничего не пишет', async () => {
    const path = `${AA_DELETE_JOBS_COLLECTION}/a-poison-s`;
    const fake = fakeFirestore({ [path]: poisoned('a-poison-s') });
    const before = JSON.stringify(fake.documents.get(path));
    const outcome = await recordAccountDeleteWorkFailure(fake.db, 'a-poison-s', {
      jobId: 'job-a-poison-s', status: 'purge_queued', pendingWorkAtMs: 999,
    }, 10, 'aborted');
    expect(outcome.outcome).toBe('stale');
    expect(JSON.stringify(fake.documents.get(path))).toBe(before);
  });

  test('испорченный документ (нет job / чужой статус / битый accountId) снимается сразу при выборке', async () => {
    const fake = fakeFirestore({
      [`${AA_DELETE_JOBS_COLLECTION}/a-bad-1`]: { accountId: 'a-bad-1', tenantId: TENANT, job: null, pendingWorkAtMs: 0 },
      [`${AA_DELETE_JOBS_COLLECTION}/a-bad-2`]: { accountId: 'a-bad-2', tenantId: TENANT, job: { jobId: 'j', status: 'purged' }, pendingWorkAtMs: 0 },
      [`${AA_DELETE_JOBS_COLLECTION}/a-bad-3`]: { accountId: '', tenantId: TENANT, job: { jobId: 'j', status: 'purge_queued' }, pendingWorkAtMs: 0 },
    });
    expect(await listDueAccountDeletePendingWork(fake.db, 10, 10)).toEqual([]);
    for (const id of ['a-bad-1', 'a-bad-2', 'a-bad-3']) {
      expect(fake.documents.get(`${AA_DELETE_JOBS_COLLECTION}/${id}`)).toMatchObject({
        pendingWorkAtMs: null, workQuarantinedAtMs: 10,
      });
    }
    expect(await listDueAccountDeletePendingWork(fake.db, 20, 10)).toEqual([]);
  });

  test('удачный шаг обнуляет счётчик сбоев', async () => {
    const fake = fakeFirestore(deleteBeginFixture());
    const time = clock();
    const ports = createFirebaseLeasePorts(fake.db, { nowMs: time.nowMs, deleteAuthUser: async () => undefined });
    await deleteBegin(fake, ports);
    fake.documents.set(JOB_PATH, { ...(fake.documents.get(JOB_PATH) as Doc), workFailures: 3, workLastFailureCode: 'aborted' });
    await runAccountDeleteWorkerPass({ db: fake.db, nowMs: time.nowMs, overrides: { nowMs: time.nowMs } });
    const doc = fake.documents.get(JOB_PATH) as Doc;
    expect(doc).toMatchObject({ job: { status: 'purged' } });
    expect(doc).not.toHaveProperty('workFailures');
    expect(doc).not.toHaveProperty('workLastFailureCode');
  });

  test('снятая с очереди задача не возвращается в очередь записью контракта (повтор delete_begin)', async () => {
    const fake = fakeFirestore(deleteBeginFixture());
    const time = clock();
    const failing = async () => { throw Object.assign(new Error('x'), { code: 'auth/internal-error' }); };
    const ports = createFirebaseLeasePorts(fake.db, { nowMs: time.nowMs, deleteAuthUser: failing });
    await deleteBegin(fake, ports);
    fake.documents.set(JOB_PATH, { ...(fake.documents.get(JOB_PATH) as Doc), pendingWorkAtMs: null, workQuarantinedAtMs: 5 });
    time.jump(ACCOUNT_DELETE_IDENTITY_RETRY_MAX_MS);
    await expect(deleteBegin(fake, ports, 'delete-operation-s4a-replay')).resolves.toMatchObject({ status: 'identity_release_pending' });
    expect(fake.documents.get(JOB_PATH)).toMatchObject({ pendingWorkAtMs: null, workQuarantinedAtMs: 5 });
  });
});
