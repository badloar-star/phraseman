import { createHash } from 'crypto';
import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import {
  AA_ACCOUNTS_COLLECTION,
  AA_DELETE_JOBS_COLLECTION,
  AA_INSTALLATION_BINDING_QUOTA_COLLECTION,
  AA_INSTALLATION_BINDING_TOKENS_COLLECTION,
  AA_INSTALLATION_BINDINGS_COLLECTION,
  AA_PRINCIPALS_COLLECTION,
  AA_RETIRED_SESSIONS_SUBCOLLECTION,
  AA_ROOT_COLLECTIONS,
  AA_TTL_COLLECTION_GROUPS,
  AA_TTL_FIELD,
} from './account_authority_collections';
import { accountAuthorityAuthUidHash, accountAuthorityFingerprintFromAuthUidHash } from './account_authority_policy';
import {
  createFirestoreAccountDeletePurgePort,
  legacyPrincipalAccountDecision,
  purgeAccountAuthorityForLegacyIdentities,
} from './account_authority_purge';
import {
  ACCOUNT_DELETE_JOB_KEYS,
  ACCOUNT_DELETE_PENDING_AUTH_UID_FIELD,
  createFirebaseProviderIdentityReleasePort,
  createFirestoreAccountDeleteStateStore,
  firestorePendingAuthUidReader,
  listDueAccountDeleteExpirySweeps,
  parseAccountDeleteState,
  storedAccountDeleteState,
} from './account_delete_store';
import {
  ACCOUNT_DELETE_RECEIPT_RETENTION_MS,
  runBoundedDeletePurge,
  runIdentityReleaseAttempt,
  type AccountDeleteJob,
} from './delete_contract';
import { createFirebaseLeasePorts } from './firebase_lease_callable';
import { handleAccountDeleteBeginCallable } from './callable_boundary';
import {
  asAccountId,
  asClaimId,
  asDeviceId,
  asFirebaseAuthUid,
  asOperationId,
  asProviderSubject,
  asSessionId,
  asTenantId,
  createEmptyAccountLeaseState,
  releaseActiveAccountLease,
  startOrRenewAccountLease,
} from './lease_contract';

/*
 * AA S3: удаление (порты состояния, purge, освобождение личности), старое
 * удаление, правила deny-all и TTL. Firestore — фейк в памяти (эмулятор — S8).
 */

const ROOT = path.resolve(__dirname, '../../..');
const TENANT = asTenantId('phraseman-primary');
const JOB_ID = 'aadel_job_a';

type Doc = Record<string, unknown>;
type Filter = Readonly<{ field: string; op: '==' | '<='; value: unknown }>;

function isDeleteSentinel(value: unknown): boolean {
  return typeof value === 'object' && value !== null && typeof (value as { isEqual?: unknown }).isEqual === 'function'
    && (value as { isEqual: (other: unknown) => boolean }).isEqual(FieldValue.delete());
}

// ── Фейковый Firestore (where '=='/'<=', limit, подколлекции, batch, транзакции)
function fakeFirestore(initial: Readonly<Record<string, Doc>> = {}) {
  const documents = new Map<string, Doc>(Object.entries(initial));
  const stats = { commits: 0, deletesPerCommit: [] as number[], queryLimits: [] as number[] };
  let failCommit = false;
  const snap = (p: string) => ({ exists: documents.has(p), id: p.split('/').pop(), data: () => documents.get(p), ref: docRef(p) });
  const matches = (data: Doc, filters: readonly Filter[]) => filters.every((f) => (
    f.op === '==' ? data[f.field] === f.value
      : typeof data[f.field] === 'number' && (data[f.field] as number) <= (f.value as number)
  ));
  function query(col: string, filters: readonly Filter[], limit: number | null): Doc {
    return {
      where: (field: string, op: '==' | '<=', value: unknown) => query(col, [...filters, { field, op, value }], limit),
      limit: (value: number) => query(col, filters, value),
      get: async () => {
        if (limit !== null) stats.queryLimits.push(limit);
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
    return { path: p, id: p.split('/').pop(), collection: (n: string) => colRef(`${p}/${n}`), get: async () => snap(p) };
  }
  const db = {
    collection: (n: string) => colRef(n),
    batch: () => {
      const pending: string[] = [];
      return {
        delete: (ref: { path: string }) => { pending.push(ref.path); },
        commit: async () => {
          if (failCommit) { failCommit = false; throw Object.assign(new Error('deadline'), { code: 4 }); }
          stats.commits += 1;
          stats.deletesPerCommit.push(pending.length);
          for (const p of pending) documents.delete(p);
        },
      };
    },
    runTransaction: async (work: (tx: unknown) => Promise<unknown>) => {
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
  return { db, documents, stats, failNextCommit: () => { failCommit = true; } };
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function principalPath(uid: string): string {
  const fingerprint = accountAuthorityFingerprintFromAuthUidHash(accountAuthorityAuthUidHash(uid));
  return `${AA_PRINCIPALS_COLLECTION}/${sha256(JSON.stringify([TENANT, fingerprint]))}`;
}

/** Принципал uid + 2 привязки, 2 записи индекса токенов, счётчик квоты. */
function seedUid(
  docs: Record<string, Doc>, uid: string, accountId: string, schema: 'v1' | 'v2' = 'v2', accountSource?: string,
): void {
  const hash = accountAuthorityAuthUidHash(uid);
  docs[principalPath(uid)] = schema === 'v2'
    ? { schemaVersion: 'account-authority-principal.v2', accountId, tenantId: TENANT, authUidHash: hash, providerSubject: `firebase-${sha256(uid)}` }
    : { schemaVersion: 'account-authority-principal.v1', accountId, tenantId: TENANT, firebaseAuthUid: uid, providerSubject: `firebase-${sha256(uid)}` };
  if (accountSource !== undefined) (docs[principalPath(uid)] as Doc).accountSource = accountSource;
  for (const index of [1, 2]) {
    const bindingKey = sha256(`binding:${uid}:${index}`);
    const tokenHash = sha256(`token:${uid}:${index}`);
    docs[`${AA_INSTALLATION_BINDINGS_COLLECTION}/${bindingKey}`] = { authUidHash: hash, bindingTokenHash: tokenHash };
    docs[`${AA_INSTALLATION_BINDING_TOKENS_COLLECTION}/${tokenHash}`] = { authUidHash: hash, bindingKey };
  }
  docs[`${AA_INSTALLATION_BINDING_QUOTA_COLLECTION}/${hash}`] = { bindings: {}, recentCallsAtMs: [] };
}

function deletingLeaseDoc(accountId: string, uid: string): Doc {
  const id = asAccountId(accountId);
  const subject = asFirebaseAuthUid(accountAuthorityFingerprintFromAuthUidHash(accountAuthorityAuthUidHash(uid)));
  const sessionId = asSessionId('session-0a0a0a0a-0a0a-4a0a-8a0a-0a0a0a0a0a0a');
  const acquired = startOrRenewAccountLease(createEmptyAccountLeaseState(id, TENANT), {
    principal: { accountId: id, tenantId: TENANT, firebaseAuthUid: subject, providerSubject: asProviderSubject('provider-a'), authEpoch: 1_000 },
    deviceId: asDeviceId('device-a'),
    sessionId,
    operationId: asOperationId('acquire-a'),
    expectedRevision: 0,
    serverNowMs: 1_000,
  }, { isRetired: () => false }).state;
  const released = releaseActiveAccountLease(acquired, {
    accountId: id, tenantId: TENANT, deviceId: asDeviceId('device-a'), sessionId,
    operationId: asOperationId('release-a'), expectedRevision: 1, serverNowMs: 1_001,
  }, { isRetired: () => false }).state;
  return {
    schemaVersion: 'account-authority-firestore-lease.v1',
    ...released,
    lifecycle: { status: 'deleting', jobId: JOB_ID, changedAtMs: 1_001 },
    expireAt: null,
  };
}

function queuedJob(accountId: string): AccountDeleteJob {
  return {
    jobId: JOB_ID, accountId: asAccountId(accountId), tenantId: TENANT,
    firstOperationId: asOperationId('delete-a'), deviceId: asDeviceId('device-a'),
    sessionId: asSessionId('session-0a0a0a0a-0a0a-4a0a-8a0a-0a0a0a0a0a0a'),
    status: 'purge_queued', createdAtMs: 1_001, updatedAtMs: 1_002,
    pendingProviderIdentity: null,
    identityReleaseAttemptsStarted: 1, identityReleaseAttemptsCompleted: 1, identityReleaseFailuresCompleted: 0,
    identityReleaseClaim: null, identityReleasedAtMs: 1_002,
    purgeCursor: null, recentPurgeCursors: [], purgeAttempts: 0, purgeFailures: 0, purgeClaim: null,
    purgedItems: 0, completedAtMs: null, receiptExpiresAtMs: null,
  };
}

/** Аккаунт A (два uid: v2 и старый v1, 3 отметки сессий) и чужой аккаунт B. */
function twoAccounts() {
  const docs: Record<string, Doc> = {};
  seedUid(docs, 'RawUidA1', 'account-a', 'v2');
  seedUid(docs, 'RawUidA2', 'account-a', 'v1');
  seedUid(docs, 'RawUidB1', 'account-b', 'v2');
  docs[`${AA_ACCOUNTS_COLLECTION}/account-a`] = deletingLeaseDoc('account-a', 'RawUidA1');
  docs[`${AA_ACCOUNTS_COLLECTION}/account-b`] = { untouched: true };
  for (const n of [1, 2, 3]) docs[`${AA_ACCOUNTS_COLLECTION}/account-a/${AA_RETIRED_SESSIONS_SUBCOLLECTION}/s${n}`] = { n };
  docs[`${AA_ACCOUNTS_COLLECTION}/account-b/${AA_RETIRED_SESSIONS_SUBCOLLECTION}/s1`] = { n: 1 };
  docs[`${AA_DELETE_JOBS_COLLECTION}/account-a`] = storedAccountDeleteState(
    { accountId: asAccountId('account-a'), tenantId: TENANT, job: queuedJob('account-a'), lastServerNowMs: 1_002 }, [],
  );
  return docs;
}

const ACCOUNT_A_PURGEABLE = 3 /* отметки */ + 2 * (1 /* принципал */ + 2 + 2 + 1);

function deletionHarness(initial: Record<string, Doc>) {
  const fake = fakeFirestore(initial);
  let nowMs = 10_000;
  let claim = 0;
  const ports = createFirebaseLeasePorts(fake.db, {
    nowMs: () => nowMs,
    deleteStateStore: createFirestoreAccountDeleteStateStore(fake.db),
  });
  const workerPorts = {
    clock: { nowMs: () => (nowMs += 1) },
    claims: { issueClaimId: () => asClaimId(`claim-${++claim}`) },
    transactions: ports.deletion.transactions,
  };
  const purgePort = createFirestoreAccountDeletePurgePort(fake.db);
  const request = { accountId: asAccountId('account-a'), tenantId: TENANT, jobId: JOB_ID };
  return { fake, workerPorts, purgePort, request };
}

function keysOf(fake: ReturnType<typeof fakeFirestore>): string[] {
  return [...fake.documents.keys()];
}

function accountAKeysLeft(fake: ReturnType<typeof fakeFirestore>): string[] {
  const a = [accountAuthorityAuthUidHash('RawUidA1'), accountAuthorityAuthUidHash('RawUidA2')];
  return keysOf(fake).filter((key) => {
    const data = fake.documents.get(key) as Doc;
    return key.startsWith(`${AA_ACCOUNTS_COLLECTION}/account-a/`)
      || key === principalPath('RawUidA1') || key === principalPath('RawUidA2')
      || a.includes(String(data.authUidHash)) || a.some((h) => key.endsWith(`/${h}`));
  });
}

describe('S3 пункт 2: purge удаляет все коллекции AA аккаунта и только их', () => {
  test('один проход: всё AA аккаунта A стёрто, B не тронут, надгробие и квитанция остались', async () => {
    const h = deletionHarness(twoAccounts());
    const keysB = keysOf(h.fake).filter((k) => k.includes('account-b') || JSON.stringify(h.fake.documents.get(k)).includes('account-b')
      || JSON.stringify(h.fake.documents.get(k)).includes(accountAuthorityAuthUidHash('RawUidB1')));
    const result = await runBoundedDeletePurge(h.workerPorts, h.purgePort, h.request);
    expect(result.type).toBe('progressed');
    expect(result.job).toMatchObject({ status: 'purged', purgedItems: ACCOUNT_A_PURGEABLE });
    expect(accountAKeysLeft(h.fake)).toEqual([]);
    for (const key of keysB) expect(h.fake.documents.has(key)).toBe(true);
    const lease = h.fake.documents.get(`${AA_ACCOUNTS_COLLECTION}/account-a`) as Doc;
    expect(lease).toMatchObject({ lifecycle: { status: 'deleted', jobId: JOB_ID }, activeLease: null, expireAt: null });
    // Надгробие без квитанций (в них хеш uid, провайдер, устройство).
    expect((lease.receiptLedger as Doc).entries).toEqual([]);
    const state = h.fake.documents.get(`${AA_DELETE_JOBS_COLLECTION}/account-a`) as Doc;
    expect(state).toMatchObject({ job: { status: 'purged' } });
    expect(state.expirySweepAtMs).toBe((state.job as Doc).receiptExpiresAtMs);
  });

  test('повтор после завершения идемпотентен: terminal, ни одного удаления', async () => {
    const h = deletionHarness(twoAccounts());
    await runBoundedDeletePurge(h.workerPorts, h.purgePort, h.request);
    const commits = h.fake.stats.commits;
    const again = await runBoundedDeletePurge(h.workerPorts, h.purgePort, h.request);
    expect(again.type).toBe('terminal');
    expect(h.fake.stats.commits).toBe(commits);
  });

  test('повтор того же прохода порта с тем же курсором безопасен', async () => {
    const h = deletionHarness(twoAccounts());
    const call = { accountId: h.request.accountId, tenantId: TENANT, cursor: null, maxItems: 450, idempotencyKey: 'purge:x:1' };
    const first = await h.purgePort.purge(call);
    const second = await h.purgePort.purge(call);
    expect(first).toEqual({ done: true, cursor: null, purgedItems: ACCOUNT_A_PURGEABLE });
    expect(second).toEqual({ done: true, cursor: null, purgedItems: 0 });
  });
});

describe('S3 пункт 2: ограниченный проход, курсор, обрыв', () => {
  test('бюджет 3: каждый проход ≤ 3 удалений, курсоры разные, итог — всё стёрто', async () => {
    const h = deletionHarness(twoAccounts());
    const cursors: Array<string | null> = [];
    let last;
    for (let i = 0; i < 20; i += 1) {
      last = await runBoundedDeletePurge(h.workerPorts, h.purgePort, { ...h.request, maxItems: 3 });
      cursors.push(last.job.purgeCursor);
      // Инвариант: принципал не исчезает раньше своих привязок.
      for (const uid of ['RawUidA1', 'RawUidA2']) {
        if (!h.fake.documents.has(principalPath(uid))) {
          const hash = accountAuthorityAuthUidHash(uid);
          expect(keysOf(h.fake).some((k) => (h.fake.documents.get(k) as Doc).authUidHash === hash)).toBe(false);
        }
      }
      if (last.job.status === 'purged') break;
    }
    expect(last?.job.status).toBe('purged');
    expect(Math.max(...h.fake.stats.deletesPerCommit)).toBeLessThanOrEqual(3);
    expect(h.fake.stats.commits).toBeGreaterThanOrEqual(Math.ceil(ACCOUNT_A_PURGEABLE / 3));
    const nonNull = cursors.filter((c): c is string => c !== null);
    expect(new Set(nonNull).size).toBe(nonNull.length);
    expect(accountAKeysLeft(h.fake)).toEqual([]);
    expect(last?.job.purgedItems).toBe(ACCOUNT_A_PURGEABLE);
  });

  test('обрыв записи посреди: retry_scheduled, следующий проход возобновляет и доводит', async () => {
    const h = deletionHarness(twoAccounts());
    const first = await runBoundedDeletePurge(h.workerPorts, h.purgePort, { ...h.request, maxItems: 4 });
    expect(first.job.status).toBe('purge_queued');
    h.fake.failNextCommit();
    const broken = await runBoundedDeletePurge(h.workerPorts, h.purgePort, { ...h.request, maxItems: 4 });
    expect(broken.type).toBe('retry_scheduled');
    expect(broken.job.purgeFailures).toBe(1);
    expect(broken.job.purgeCursor).toBe(first.job.purgeCursor);
    let last = broken;
    for (let i = 0; i < 20 && last.job.status !== 'purged'; i += 1) {
      last = await runBoundedDeletePurge(h.workerPorts, h.purgePort, { ...h.request, maxItems: 4 });
    }
    expect(last.job.status).toBe('purged');
    expect(accountAKeysLeft(h.fake)).toEqual([]);
  });

  test('испорченный курсор — отказ прохода (контракт считает сбой)', async () => {
    const h = deletionHarness(twoAccounts());
    await expect(h.purgePort.purge({
      accountId: h.request.accountId, tenantId: TENANT, cursor: 'foreign-cursor', maxItems: 10, idempotencyKey: 'k',
    })).rejects.toThrow('account_authority_purge_cursor_invalid');
  });

  test('запросы ограничены бюджетом прохода (нет выкачивания коллекций)', async () => {
    const h = deletionHarness(twoAccounts());
    await h.purgePort.purge({ accountId: h.request.accountId, tenantId: TENANT, cursor: null, maxItems: 5, idempotencyKey: 'k' });
    expect(h.fake.stats.queryLimits.length).toBeGreaterThan(0);
    for (const limit of h.fake.stats.queryLimits) expect(limit).toBeLessThanOrEqual(5);
  });
});

describe('S3 пункт 3: старое удаление чистит AA', () => {
  test('по stableId и uid стираются аренда, отметки, состояние удаления, принципалы, привязки, квота', async () => {
    const docs = twoAccounts();
    // uid A3 был привязан к новому acct-… (найден только через его принципала).
    seedUid(docs, 'RawUidA3', 'acct-new', 'v2', 'new_account');
    docs[`${AA_ACCOUNTS_COLLECTION}/acct-new`] = { x: 1 };
    docs[`${AA_ACCOUNTS_COLLECTION}/acct-new/${AA_RETIRED_SESSIONS_SUBCOLLECTION}/s1`] = { n: 1 };
    const fake = fakeFirestore(docs);
    const before = keysOf(fake).filter((k) => !k.startsWith(`${AA_ACCOUNTS_COLLECTION}/account-b`)
      && (fake.documents.get(k) as Doc).accountId !== 'account-b'
      && (fake.documents.get(k) as Doc).authUidHash !== accountAuthorityAuthUidHash('RawUidB1')
      && !k.endsWith(accountAuthorityAuthUidHash('RawUidB1')) && k !== principalPath('RawUidB1'));
    const result = await purgeAccountAuthorityForLegacyIdentities(fake.db, ['account-a', 'RawUidA1', 'RawUidA3'], { maxItemsPerPass: 4 });
    expect(result.deleted).toBe(before.length);
    for (const key of before) expect(fake.documents.has(key)).toBe(false);
    expect(fake.documents.has(principalPath('RawUidB1'))).toBe(true);
    expect(fake.documents.has(`${AA_ACCOUNTS_COLLECTION}/account-b`)).toBe(true);
    expect(fake.documents.has(`${AA_ACCOUNTS_COLLECTION}/account-b/${AA_RETIRED_SESSIONS_SUBCOLLECTION}/s1`)).toBe(true);
    const again = await purgeAccountAuthorityForLegacyIdentities(fake.db, ['account-a', 'RawUidA1', 'RawUidA3']);
    expect(again.deleted).toBe(0);
  });

  test('испорченный принципал uid (нет accountId) стирается по ключу хеша uid', async () => {
    const docs = twoAccounts();
    seedUid(docs, 'RawUidC1', 'account-c', 'v2');
    docs[principalPath('RawUidC1')] = { schemaVersion: 'account-authority-principal.v2', tenantId: TENANT };
    const fake = fakeFirestore(docs);
    await purgeAccountAuthorityForLegacyIdentities(fake.db, ['RawUidC1']);
    expect(fake.documents.has(principalPath('RawUidC1'))).toBe(false);
    const hash = accountAuthorityAuthUidHash('RawUidC1');
    expect(keysOf(fake).some((k) => (fake.documents.get(k) as Doc).authUidHash === hash || k.endsWith(hash))).toBe(false);
    expect(fake.documents.has(principalPath('RawUidA1'))).toBe(true);
  });

  test('не уложился в лимит проходов — стадия падает (задача повторится)', async () => {
    const fake = fakeFirestore(twoAccounts());
    await expect(purgeAccountAuthorityForLegacyIdentities(fake.db, ['account-a', 'RawUidA1'], { maxItemsPerPass: 1, maxPasses: 2 }))
      .rejects.toThrow('account_authority_legacy_purge_incomplete');
  });

  test('ядро старого удаления вызывает стадию account_authority_purge до стирания V2 и надгробия', () => {
    const source = readFileSync(path.join(__dirname, '..', 'account_delete.ts'), 'utf8');
    const body = source.slice(source.indexOf('export async function executeAccountDeletion'), source.indexOf('export async function enqueueForAuthenticatedAccount'));
    const stage = body.indexOf("'account_authority_purge'");
    expect(stage).toBeGreaterThan(body.indexOf("'merge_identity_records'"));
    expect(stage).toBeLessThan(body.indexOf("'accounts_v2_purge'"));
    expect(body).toContain('purgeAccountAuthorityForLegacyIdentities(db, [...identities, stableUid, authUid])');
  });
});

describe('S3 пункт 1: состояние удаления в Firestore', () => {
  const identity = { accountId: asAccountId('account-a'), tenantId: TENANT };

  test('запись и чтение без потерь; срок sweep — из расписания', () => {
    const job = { ...queuedJob('account-a'), status: 'purged' as const, receiptExpiresAtMs: 5_000 + ACCOUNT_DELETE_RECEIPT_RETENTION_MS };
    const state = { ...identity, job, lastServerNowMs: 5_000 };
    const stored = storedAccountDeleteState(state, [{ type: 'schedule_delete_job_expiry', jobId: JOB_ID, expiresAtMs: job.receiptExpiresAtMs }]);
    expect(stored.expirySweepAtMs).toBe(job.receiptExpiresAtMs);
    expect(parseAccountDeleteState(JSON.parse(JSON.stringify(stored)), identity)).toEqual(state);
  });

  test('expired и пустой job — срока sweep нет', () => {
    expect(storedAccountDeleteState({ ...identity, job: null, lastServerNowMs: 1 }, []).expirySweepAtMs).toBeNull();
    const expired = { ...queuedJob('account-a'), status: 'expired' as const, receiptExpiresAtMs: 9 };
    expect(storedAccountDeleteState({ ...identity, job: expired, lastServerNowMs: 1 }, []).expirySweepAtMs).toBeNull();
  });

  test('чужой аккаунт/тенант или порча — ошибка, а не пустое состояние', () => {
    const stored = storedAccountDeleteState({ ...identity, job: queuedJob('account-a'), lastServerNowMs: 1 }, []);
    expect(() => parseAccountDeleteState(stored, { accountId: asAccountId('account-b'), tenantId: TENANT })).toThrow();
    expect(() => parseAccountDeleteState({ ...stored, job: { ...(stored.job as Doc), status: 'weird' } }, identity)).toThrow();
    expect(() => parseAccountDeleteState({ ...stored, schemaVersion: 'x' }, identity)).toThrow();
  });

  test('просроченные квитанции находятся одним запросом с лимитом', async () => {
    const fake = fakeFirestore({
      [`${AA_DELETE_JOBS_COLLECTION}/account-a`]: { accountId: 'account-a', tenantId: TENANT, job: { jobId: JOB_ID }, expirySweepAtMs: 100 },
      [`${AA_DELETE_JOBS_COLLECTION}/account-b`]: { accountId: 'account-b', tenantId: TENANT, job: { jobId: 'j-b' }, expirySweepAtMs: 900 },
    });
    const due = await listDueAccountDeleteExpirySweeps(fake.db, 500, 10);
    expect(due).toEqual([{ accountId: 'account-a', tenantId: TENANT, jobId: JOB_ID }]);
    expect(fake.stats.queryLimits).toEqual([10]);
  });

  test('без подключённого хранилища адаптер по-прежнему отказывает (rollout выключен)', () => {
    const source = readFileSync(path.join(__dirname, 'firebase_lease_callable.ts'), 'utf8');
    expect(source).toContain('overrides.deleteStateStore ?? DELETE_STATE_STORE_NOT_WIRED');
    expect(source.match(/rolloutEnabled: false/g)?.length).toBe(2);
  });
});

describe('S3 раунд 2: освобождение Firebase Auth (порт)', () => {
  const RAW = 'RawUidA1';
  const request = {
    accountId: asAccountId('account-a'), tenantId: TENANT,
    firebaseAuthUid: asFirebaseAuthUid(accountAuthorityFingerprintFromAuthUidHash(accountAuthorityAuthUidHash(RAW))),
    providerSubject: asProviderSubject('p'), idempotencyKey: 'identity_release:j',
  };
  const port = (uid: string | null, deleteAuthUser: (raw: string) => Promise<void>) => (
    createFirebaseProviderIdentityReleasePort({ readPendingAuthUid: async () => uid, deleteAuthUser })
  );

  test('удаляет пользователя Auth по сырому uid из задачи', async () => {
    const deleteAuthUser = jest.fn(async () => undefined);
    await port(RAW, deleteAuthUser).releaseProviderIdentity(request);
    expect(deleteAuthUser).toHaveBeenCalledWith(RAW);
  });

  test('«пользователя уже нет» — успех только с uid из задачи', async () => {
    const gone = jest.fn(async () => { throw Object.assign(new Error('gone'), { code: 'auth/user-not-found' }); });
    await expect(port(RAW, gone).releaseProviderIdentity(request)).resolves.toBeUndefined();
    const notCalled = jest.fn(async () => undefined);
    await expect(port(null, notCalled).releaseProviderIdentity(request)).rejects.toThrow('account_authority_delete_identity_unresolved');
    expect(notCalled).not.toHaveBeenCalled();
  });

  test('uid задачи не совпал с субъектом аренды — отказ без вызова Auth', async () => {
    const deleteAuthUser = jest.fn(async () => undefined);
    await expect(port('SomeoneElse9', deleteAuthUser).releaseProviderIdentity(request))
      .rejects.toThrow('account_authority_delete_identity_mismatch');
    expect(deleteAuthUser).not.toHaveBeenCalled();
  });

  test('сбой Auth пробрасывается (контракт повторит)', async () => {
    const offline = Object.assign(new Error('offline'), { code: 'auth/internal-error' });
    await expect(port(RAW, async () => { throw offline; }).releaseProviderIdentity(request)).rejects.toBe(offline);
  });
});

describe('S3 раунд 2: delete_begin удаляет Auth сразу, uid в задаче — только до освобождения', () => {
  const RAW = 'RawUidDel1';
  const STABLE = 'stable-del-a';
  const TOKEN = ['binding', 'token', 'del'].join('-');
  const GOOGLE = { firebase: { sign_in_provider: 'google.com' } };
  const JOB_PATH = `${AA_DELETE_JOBS_COLLECTION}/${STABLE}`;

  function deleteBeginFixture() {
    const hash = accountAuthorityAuthUidHash(RAW);
    const subject = asFirebaseAuthUid(accountAuthorityFingerprintFromAuthUidHash(hash));
    const tokenHash = sha256(`account-authority-binding-token.v1\u0000${TOKEN}`);
    const bindingKey = 'd'.repeat(64);
    const providerSubject = asProviderSubject(`firebase-${sha256(RAW)}`);
    const sessionId = asSessionId('session-0b0b0b0b-0b0b-4b0b-8b0b-0b0b0b0b0b0b');
    const lease = startOrRenewAccountLease(createEmptyAccountLeaseState(asAccountId(STABLE), TENANT), {
      principal: { accountId: asAccountId(STABLE), tenantId: TENANT, firebaseAuthUid: subject, providerSubject, authEpoch: 1_000 },
      deviceId: asDeviceId('device-binding-a'),
      sessionId,
      operationId: asOperationId('acquire-del-a'),
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
        deviceBindingId: 'device-binding-a', createdAtMs: 1_000, rotatedAtMs: 1_000, revokedAtMs: null,
      },
      [principalPath(RAW)]: {
        schemaVersion: 'account-authority-principal.v2', accountId: STABLE, tenantId: TENANT,
        authUidHash: hash, providerSubject, accountSource: 'existing_stable_id', anchorLink: STABLE,
      },
      [`${AA_ACCOUNTS_COLLECTION}/${STABLE}`]: { schemaVersion: 'account-authority-firestore-lease.v1', ...lease, expireAt: null },
    } as Record<string, Doc>;
  }

  function begin(fake: ReturnType<typeof fakeFirestore>, deleteAuthUser: (raw: string) => Promise<void>) {
    let nowMs = 10_000;
    const ports = createFirebaseLeasePorts(fake.db, {
      nowMs: () => (nowMs += 1),
      deleteStateStore: createFirestoreAccountDeleteStateStore(fake.db),
      providerIdentityRelease: createFirebaseProviderIdentityReleasePort({
        readPendingAuthUid: firestorePendingAuthUidReader(fake.db), deleteAuthUser,
      }),
    });
    const result = handleAccountDeleteBeginCallable(ports, {
      auth: { uid: RAW, token: GOOGLE },
      app: null,
      data: { operationId: 'delete-operation-a', expectedRevision: 1, bindingToken: TOKEN },
    });
    return { ports, result };
  }

  test('успех в запросе: Auth удалён этим же вызовом, поля с uid в задаче нет', async () => {
    const fake = fakeFirestore(deleteBeginFixture());
    const deleteAuthUser = jest.fn(async () => undefined);
    const { result } = begin(fake, deleteAuthUser);
    await expect(result).resolves.toMatchObject({ status: 'purge_queued' });
    expect(deleteAuthUser).toHaveBeenCalledWith(RAW);
    const job = fake.documents.get(JOB_PATH) as Doc;
    expect(job).toMatchObject({ job: { status: 'purge_queued', pendingProviderIdentity: null } });
    expect(job).not.toHaveProperty(ACCOUNT_DELETE_PENDING_AUTH_UID_FIELD);
  });

  test('сбой в запросе: uid сохранён в задаче → фоновый повтор освобождает → поле стёрто', async () => {
    const fake = fakeFirestore(deleteBeginFixture());
    const offline = Object.assign(new Error('offline'), { code: 'auth/internal-error' });
    const failing = jest.fn(async () => { throw offline; });
    const { ports, result } = begin(fake, failing);
    await expect(result).resolves.toMatchObject({ status: 'identity_release_pending' });
    expect(fake.documents.get(JOB_PATH)).toMatchObject({ [ACCOUNT_DELETE_PENDING_AUTH_UID_FIELD]: RAW });

    const recovered = jest.fn(async () => undefined);
    const retryPorts = {
      clock: ports.deletion.clock,
      claims: ports.deletion.claims,
      transactions: ports.deletion.transactions,
      identity: createFirebaseProviderIdentityReleasePort({
        readPendingAuthUid: firestorePendingAuthUidReader(fake.db), deleteAuthUser: recovered,
      }),
    };
    const jobId = ((fake.documents.get(JOB_PATH) as Doc).job as Doc).jobId as string;
    const retried = await runIdentityReleaseAttempt(retryPorts, { accountId: asAccountId(STABLE), tenantId: TENANT, jobId });
    expect(retried.type).toBe('released');
    expect(recovered).toHaveBeenCalledWith(RAW);
    expect(fake.documents.get(JOB_PATH)).not.toHaveProperty(ACCOUNT_DELETE_PENDING_AUTH_UID_FIELD);
  });
});

describe('S3 пункты 4–7: правила, TTL, единый список коллекций, Джарвис, экспорт', () => {
  const rules = readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8');
  const indexes = JSON.parse(readFileSync(path.join(ROOT, 'firestore.indexes.json'), 'utf8')) as {
    fieldOverrides: Array<{ collectionGroup: string; fieldPath: string; ttl?: boolean }>;
  };

  test.each(AA_ROOT_COLLECTIONS.map((c) => [c]))('%s: явный deny-all для клиента', (collection) => {
    const block = new RegExp(`match /${collection}/\\{document=\\*\\*\\}\\s*\\{\\s*allow read, write: if false;\\s*\\}`);
    expect(rules).toMatch(block);
  });

  test('админский catch-all исключает весь префикс account_authority_', () => {
    expect(rules).toMatch(/function isServerOwnedAccountAuthorityRoot\(collection\)\s*\{\s*return collection\.matches\('account_authority_\.\*'\);/);
    const start = rules.indexOf('match /{collection}/{document=**} {');
    expect(start).toBeGreaterThan(-1);
    const catchAll = rules.slice(start, rules.indexOf('\n    }', start));
    expect(catchAll).toContain('&& !isServerOwnedAccountAuthorityRoot(collection)');
    for (const collection of AA_ROOT_COLLECTIONS) expect(collection.startsWith('account_authority_')).toBe(true);
  });

  test('никакое правило не разрешает клиенту коллекции account_authority_', () => {
    const lines = rules.split('\n');
    lines.forEach((line, i) => {
      if (!/match \/account_authority_/.test(line)) return;
      expect(lines[i + 1]).toMatch(/allow read, write: if false;/);
    });
  });

  test('раунд 2 H-S3-1: в firestore.indexes.json НЕТ TTL на коллекциях AA (деплой правил несёт и индексы)', () => {
    const aaGroups = new Set([...AA_ROOT_COLLECTIONS, ...AA_TTL_COLLECTION_GROUPS]);
    const aaTtl = indexes.fieldOverrides.filter((item) => item.ttl === true
      && (aaGroups.has(item.collectionGroup) || item.collectionGroup.startsWith('account_authority_')));
    expect(aaTtl).toEqual([]);
  });

  test('TTL описан в документе развёртывания: каждая группа с командой, принципала и задачи удаления нет', () => {
    const doc = readFileSync(path.join(ROOT, 'docs', 'phraseman-2.0', 'deploy', 'account_authority_ttl.md'), 'utf8');
    for (const group of AA_TTL_COLLECTION_GROUPS) {
      expect(doc).toContain(`ttls update ${AA_TTL_FIELD} --collection-group=${group} --enable-ttl`);
    }
    for (const group of [AA_PRINCIPALS_COLLECTION, AA_DELETE_JOBS_COLLECTION]) {
      expect(doc).not.toContain(`--collection-group=${group} `);
      expect(AA_TTL_COLLECTION_GROUPS).not.toContain(group);
    }
  });

  test('раунд 2: имя подколлекции отметок уникально (TTL группы не заденет чужие коллекции)', () => {
    expect(AA_RETIRED_SESSIONS_SUBCOLLECTION).toBe('account_authority_retired_sessions_v1');
    for (const group of AA_TTL_COLLECTION_GROUPS) expect(group.startsWith('account_authority_')).toBe(true);
  });

  test('имена коллекций AA живут только в account_authority_collections.ts', () => {
    const dir = __dirname;
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts') && f !== 'account_authority_collections.ts')) {
      const source = readFileSync(path.join(dir, file), 'utf8');
      expect({ file, literals: source.match(/'account_authority_[a-z_]+_v1'/g) ?? [] }).toEqual({ file, literals: [] });
    }
  });

  test('Джарвис не читает коллекции AA (контракт данных не меняется)', () => {
    const jarvisDir = path.join(__dirname, '..', 'jarvis');
    for (const file of readdirSync(jarvisDir).filter((f) => f.endsWith('_firestore_fetcher.ts'))) {
      expect(readFileSync(path.join(jarvisDir, file), 'utf8')).not.toMatch(/account_authority|AA_[A-Z_]+_COLLECTION/);
    }
  });

  test('модули S3 не экспортируются из index.ts', () => {
    const index = readFileSync(path.join(__dirname, '..', 'index.ts'), 'utf8');
    expect(index).not.toMatch(/account_authority\/(account_delete_store|account_authority_purge)/);
  });
});

describe('S3 раунд 2 H-S3-2: старое удаление не трогает чужой аккаунт за устаревшим принципалом', () => {
  test('X перепривязан к S2, удаляется S — S2 и его принципалы не тронуты, у X стёрты только свои записи', async () => {
    const docs: Record<string, Doc> = {};
    seedUid(docs, 'RawUidX1', 'stable-s2', 'v2', 'rebound');
    seedUid(docs, 'RawUidY1', 'stable-s2', 'v2', 'existing_stable_id');
    docs[`${AA_ACCOUNTS_COLLECTION}/stable-s2`] = { owner: 'y' };
    docs[`${AA_ACCOUNTS_COLLECTION}/stable-s2/${AA_RETIRED_SESSIONS_SUBCOLLECTION}/s1`] = { n: 1 };
    docs[`${AA_DELETE_JOBS_COLLECTION}/stable-s2`] = { keep: true };
    docs[`${AA_ACCOUNTS_COLLECTION}/stable-s`] = { owner: 'x-old' };
    const fake = fakeFirestore(docs);
    await purgeAccountAuthorityForLegacyIdentities(fake.db, ['stable-s', 'RawUidX1']);
    const hashX = accountAuthorityAuthUidHash('RawUidX1');
    const hashY = accountAuthorityAuthUidHash('RawUidY1');
    expect(fake.documents.has(principalPath('RawUidX1'))).toBe(false);
    expect(keysOf(fake).some((k) => (fake.documents.get(k) as Doc).authUidHash === hashX || k.endsWith(hashX))).toBe(false);
    expect(fake.documents.has(`${AA_ACCOUNTS_COLLECTION}/stable-s`)).toBe(false);
    expect(fake.documents.has(`${AA_ACCOUNTS_COLLECTION}/stable-s2`)).toBe(true);
    expect(fake.documents.has(`${AA_ACCOUNTS_COLLECTION}/stable-s2/${AA_RETIRED_SESSIONS_SUBCOLLECTION}/s1`)).toBe(true);
    expect(fake.documents.has(`${AA_DELETE_JOBS_COLLECTION}/stable-s2`)).toBe(true);
    expect(fake.documents.has(principalPath('RawUidY1'))).toBe(true);
    expect(keysOf(fake).filter((k) => (fake.documents.get(k) as Doc).authUidHash === hashY).length).toBe(5); // принципал v2 + 2 привязки + 2 индекса
  });

  test.each([
    [{ accountId: 'stable-s' }, true, 'in_closure'],
    [{ accountId: 'acct-1', accountSource: 'new_account' }, true, 'own_new_account'],
    [{ accountId: 'acct-1', accountSource: 'rebound' }, false, 'foreign_account'],
    [{ accountId: 'stable-other', accountSource: 'new_account' }, false, 'foreign_account'],
    [{}, false, 'no_account_id'],
  ])('решение по принципалу %p → стирать аккаунт: %p (%s)', (data, wipe, reason) => {
    expect(legacyPrincipalAccountDecision(data, new Set(['stable-s', 'RawUidX1']))).toMatchObject({ wipe, reason });
  });
});

describe('S3 раунд 2: тесты на выжившие мутации', () => {
  test('(Ma) старое удаление: принципал uid не исчезает раньше своих зависимых ни при каком бюджете', async () => {
    for (let budget = 1; budget <= 30; budget += 1) {
      const docs = twoAccounts();
      seedUid(docs, 'RawUidA3', 'acct-new', 'v2', 'new_account');
      const fake = fakeFirestore(docs);
      await purgeAccountAuthorityForLegacyIdentities(fake.db, ['account-a', 'RawUidA1', 'RawUidA2', 'RawUidA3'], {
        maxItemsPerPass: budget, maxPasses: 1,
      }).catch((error: Error) => expect(error.message).toBe('account_authority_legacy_purge_incomplete'));
      for (const uid of ['RawUidA1', 'RawUidA2', 'RawUidA3']) {
        if (fake.documents.has(principalPath(uid))) continue;
        const hash = accountAuthorityAuthUidHash(uid);
        expect({ budget, uid, orphans: keysOf(fake).filter((k) => (fake.documents.get(k) as Doc).authUidHash === hash || k.endsWith(hash)) })
          .toEqual({ budget, uid, orphans: [] });
      }
    }
  });

  test('(Ma) обрыв старого удаления на любом бюджете: повтор задачи находит и стирает всё (связь uid → acct- не теряется)', async () => {
    for (let budget = 1; budget <= 30; budget += 1) {
      const docs = twoAccounts();
      seedUid(docs, 'RawUidA3', 'acct-new', 'v2', 'new_account');
      docs[`${AA_ACCOUNTS_COLLECTION}/acct-new`] = { x: 1 };
      docs[`${AA_ACCOUNTS_COLLECTION}/acct-new/${AA_RETIRED_SESSIONS_SUBCOLLECTION}/s1`] = { n: 1 };
      const fake = fakeFirestore(docs);
      const identities = ['account-a', 'RawUidA1', 'RawUidA3'];
      await purgeAccountAuthorityForLegacyIdentities(fake.db, identities, { maxItemsPerPass: budget, maxPasses: 1 })
        .catch((error: Error) => expect(error.message).toBe('account_authority_legacy_purge_incomplete'));
      await purgeAccountAuthorityForLegacyIdentities(fake.db, identities);
      const left = keysOf(fake).filter((k) => k.includes('acct-new') || k === principalPath('RawUidA3')
        || (fake.documents.get(k) as Doc).accountId === 'acct-new');
      expect({ budget, left }).toEqual({ budget, left: [] });
    }
  });

  test('(Mb) purge AA-аккаунта не трогает принципал того же accountId из другого тенанта', async () => {
    const docs = twoAccounts();
    seedUid(docs, 'RawUidT1', 'account-a', 'v2');
    (docs[principalPath('RawUidT1')] as Doc).tenantId = 'other-tenant';
    const h = deletionHarness(docs);
    const result = await runBoundedDeletePurge(h.workerPorts, h.purgePort, h.request);
    expect(result.job.status).toBe('purged');
    expect(h.fake.documents.has(principalPath('RawUidT1'))).toBe(true);
    const hash = accountAuthorityAuthUidHash('RawUidT1');
    expect(keysOf(h.fake).filter((k) => (h.fake.documents.get(k) as Doc).authUidHash === hash).length).toBe(5); // принципал v2 + 2 привязки + 2 индекса
  });
});

describe('S3 раунд 3: сверка uid задачи и закрытая форма job', () => {
  const ACCOUNT = asAccountId('account-uv');
  const identity = { accountId: ACCOUNT, tenantId: TENANT };
  const subjectOf = (raw: string) => asFirebaseAuthUid(accountAuthorityFingerprintFromAuthUidHash(accountAuthorityAuthUidHash(raw)));
  const pendingJob = (raw: string): AccountDeleteJob => ({
    ...queuedJob('account-uv'),
    status: 'identity_release_pending',
    identityReleasedAtMs: null,
    pendingProviderIdentity: { tenantId: TENANT, firebaseAuthUid: subjectOf(raw), providerSubject: asProviderSubject('p-v') },
  });
  const JOB_DOC = `${AA_DELETE_JOBS_COLLECTION}/account-uv`;

  async function rewriteWith(fake: ReturnType<typeof fakeFirestore>, offered: readonly string[]) {
    const store = createFirestoreAccountDeleteStateStore(fake.db);
    await fake.db.runTransaction(async (tx) => {
      const state = await store.read(tx, identity);
      for (const raw of offered) store.rememberProviderUid?.(tx, identity, raw);
      store.write(tx, identity, state as NonNullable<typeof state>, []);
    });
  }

  test('(L-1) удаление начал V; повторный delete_begin от U не пишет uid U и не стирает uid V', async () => {
    const fake = fakeFirestore({
      [JOB_DOC]: {
        ...storedAccountDeleteState({ ...identity, job: pendingJob('RawUidV1'), lastServerNowMs: 1_002 }, []),
        [ACCOUNT_DELETE_PENDING_AUTH_UID_FIELD]: 'RawUidV1',
      },
    });
    await rewriteWith(fake, ['RawUidU1']);
    expect((fake.documents.get(JOB_DOC) as Doc)[ACCOUNT_DELETE_PENDING_AUTH_UID_FIELD]).toBe('RawUidV1');
  });

  test('(L-1) без сохранённого uid: чужой uid не записывается, свой — записывается', async () => {
    const seed = { [JOB_DOC]: storedAccountDeleteState({ ...identity, job: pendingJob('RawUidV1'), lastServerNowMs: 1_002 }, []) };
    const foreign = fakeFirestore(seed);
    await rewriteWith(foreign, ['RawUidU1']);
    expect(foreign.documents.get(JOB_DOC)).not.toHaveProperty(ACCOUNT_DELETE_PENDING_AUTH_UID_FIELD);
    const own = fakeFirestore(seed);
    await rewriteWith(own, ['RawUidU1', 'RawUidV1']);
    expect((own.documents.get(JOB_DOC) as Doc)[ACCOUNT_DELETE_PENDING_AUTH_UID_FIELD]).toBe('RawUidV1');
  });

  test('(L-3) список ключей job совпадает с типом (фикстура) и с разбором документа', () => {
    const expected = [...ACCOUNT_DELETE_JOB_KEYS].sort();
    const job = pendingJob('RawUidV1');
    expect(Object.keys(job).sort()).toEqual(expected);
    const stored = storedAccountDeleteState({ ...identity, job, lastServerNowMs: 1_002 }, []);
    expect(Object.keys(stored.job as Doc).sort()).toEqual(expected);
    const parsed = parseAccountDeleteState(JSON.parse(JSON.stringify(stored)), identity);
    expect(Object.keys(parsed.job as AccountDeleteJob).sort()).toEqual(expected);
  });

  test('(L-3) job с ключом вне закрытого списка не записывается (merge не оставит мусор)', () => {
    const job = { ...pendingJob('RawUidV1'), strayKey: 1 } as unknown as AccountDeleteJob;
    expect(() => storedAccountDeleteState({ ...identity, job, lastServerNowMs: 1_002 }, [])).toThrow('account_authority_delete_state_invalid');
  });
});
