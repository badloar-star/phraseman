import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import {
  ACCOUNTS_V2_PURGE_KNOWN_COLLECTIONS,
  accountsV2DeletionStatusForCallable,
  completeAccountsV2DeletionReceipt,
  createFirestoreAccountsV2PurgePort,
  issueAccountsV2DeletionReceipt,
  purgeAccountsV2ForDeletion,
  revokeAccountsV2DeletionReceipt,
} from './firestore_ports';
import { ACCOUNTS_V2_DELETION_PURPOSE, deletionReceiptDocId, deletionReceiptPath } from './receipt';

/*
 * Account V2, Пакет 4 — тонкий адаптер Firestore (квитанции + удаление).
 * зачем: проверить то, чего не видит чистое ядро: TTL-поле Timestamp рядом с
 * expireAtMs, путь квитанции под закрытым accounts_v2, порции батча ≤ 450,
 * запрос с курсором startAfter, и что наружу уходит HttpsError только с кодом.
 */

const NOW = 1_790_000_000_000;
const UID = 'OldUid1234567890abcdefghijkl';
const OTHER = 'OtherUid234567890abcdefghijk';
const key = (seed: number): string => Buffer.from(Array.from({ length: 32 }, (_unused, i) => (i * 31 + seed * 17 + 1) & 255)).toString('base64url');
const CRED = { operationId: 'op-0123456789abcdef', capability: key(1) };
const REQ = { purpose: ACCOUNTS_V2_DELETION_PURPOSE, ...CRED };

type Data = Record<string, unknown>;

function fakeFirestore() {
  const docs = new Map<string, Data>();
  const batches: number[] = [];
  const queries: { path: string; after: string | null; limit: number }[] = [];
  const snapshot = (path: string) => ({
    exists: docs.has(path),
    id: path.split('/').pop() as string,
    data: () => (docs.has(path) ? { ...docs.get(path) } : undefined),
  });
  const docRef = (path: string) => ({
    path,
    id: path.split('/').pop() as string,
    get: async () => snapshot(path),
    delete: async () => { docs.delete(path); },
    listCollections: async () => {
      const names = new Set<string>();
      for (const key of docs.keys()) {
        if (!key.startsWith(`${path}/`)) continue;
        const rest = key.slice(path.length + 1).split('/');
        if (rest.length >= 2) names.add(rest[0]);
      }
      return [...names].map((id) => ({ id }));
    },
  });
  const query = (path: string, state: { after: string | null; limit: number }) => ({
    orderBy: () => query(path, state),
    limit: (limit: number) => query(path, { ...state, limit }),
    startAfter: (after: string) => query(path, { ...state, after }),
    select: () => query(path, state),
    get: async () => {
      queries.push({ path, ...state });
      const ids = [...docs.keys()]
        .filter((key) => key.startsWith(`${path}/`) && key.slice(path.length + 1).split('/').length === 1)
        .map((key) => key.slice(path.length + 1))
        .sort()
        .filter((id) => state.after === null || id > state.after)
        .slice(0, state.limit);
      return { docs: ids.map((id) => ({ id })) };
    },
  });
  const db = {
    doc: (path: string) => docRef(path),
    collection: (path: string) => query(path, { after: null, limit: Number.POSITIVE_INFINITY }),
    batch: () => {
      const pending: string[] = [];
      return {
        delete: (ref: { path: string }) => { pending.push(ref.path); },
        commit: async () => { batches.push(pending.length); for (const path of pending) docs.delete(path); },
      };
    },
    runTransaction: async <T>(fn: (tx: unknown) => Promise<T>) => {
      const writes: [string, Data | null][] = [];
      const tx = {
        get: async (ref: { path: string }) => snapshot(ref.path),
        set: (ref: { path: string }, data: Data) => { writes.push([ref.path, data]); },
        delete: (ref: { path: string }) => { writes.push([ref.path, null]); },
      };
      const result = await fn(tx);
      for (const [path, data] of writes) { if (data === null) docs.delete(path); else docs.set(path, data); }
      return result;
    },
  };
  return { db: db as unknown as Firestore, docs, batches, queries };
}

function seed(docs: Map<string, Data>, uid: string, collection: string, count: number): void {
  for (let i = 0; i < count; i += 1) docs.set(`accounts_v2/${uid}/${collection}/${i.toString(16).padStart(64, '0')}`, { v: i });
}

describe('purgeAccountsV2ForDeletion (Firestore)', () => {
  test('удаляет все V2-коллекции uid порциями ≤ 450, чужой uid и квитанции целы', async () => {
    const fake = fakeFirestore();
    seed(fake.docs, UID, 'accounts_v2_entities', 700);
    seed(fake.docs, UID, 'accounts_v2_ops', 3);
    fake.docs.set(`accounts_v2/${UID}/accounts_v2_meta/rate`, { n: 1 });
    seed(fake.docs, OTHER, 'accounts_v2_entities', 2);
    await issueAccountsV2DeletionReceipt(fake.db, UID, CRED, NOW);
    const result = await purgeAccountsV2ForDeletion(fake.db, UID);
    expect(result).toMatchObject({ done: true, deletedDocs: 704 });
    expect([...fake.docs.keys()].filter((key) => key.startsWith(`accounts_v2/${UID}/`))).toEqual([]);
    expect([...fake.docs.keys()].filter((key) => key.startsWith(`accounts_v2/${OTHER}/`))).toHaveLength(2);
    expect(fake.docs.has(deletionReceiptPath(deletionReceiptDocId(CRED.operationId)))).toBe(true);
    expect(Math.max(...fake.batches)).toBeLessThanOrEqual(450);
  });

  test('курсор уходит в запрос как startAfter', async () => {
    const fake = fakeFirestore();
    seed(fake.docs, UID, 'accounts_v2_ops', 3);
    const cursor = { collection: 'accounts_v2_ops', afterDocId: '0'.repeat(63) + '1' };
    await purgeAccountsV2ForDeletion(fake.db, UID, { cursor });
    expect(fake.queries[0]).toMatchObject({ path: `accounts_v2/${UID}/accounts_v2_ops`, after: cursor.afterDocId, limit: 450 });
  });

  test('порт сам отвергает опасный uid и имя коллекции', async () => {
    const port = createFirestoreAccountsV2PurgePort(fakeFirestore().db);
    await expect(port.listDocIds('a/b', 'accounts_v2_ops', null, 10)).rejects.toThrow('accounts_v2_purge_uid_invalid');
    await expect(port.deleteDocs(UID, 'x/y', ['a'])).rejects.toThrow('accounts_v2_purge_collection_invalid');
    await expect(port.deleteDocs(UID, 'accounts_v2_ops', new Array(451).fill('a'))).rejects.toThrow('accounts_v2_purge_chunk_invalid');
  });

  test('список известных коллекций = коллекции адаптера', () => {
    expect([...ACCOUNTS_V2_PURGE_KNOWN_COLLECTIONS]).toEqual(['accounts_v2_entities', 'accounts_v2_ops', 'accounts_v2_meta']);
  });
});

describe('квитанция и статус (Firestore)', () => {
  test('квитанция: TTL-поле Timestamp = expireAtMs, без uid и секрета', async () => {
    const fake = fakeFirestore();
    const { receiptId } = await issueAccountsV2DeletionReceipt(fake.db, UID, CRED, NOW);
    const stored = fake.docs.get(deletionReceiptPath(receiptId)) as Data;
    expect(stored.expireAt).toBeInstanceOf(Timestamp);
    expect((stored.expireAt as Timestamp).toMillis()).toBe(stored.expireAtMs);
    expect(JSON.stringify(stored)).not.toContain(UID);
    expect(JSON.stringify(stored)).not.toContain(CRED.capability);
    await completeAccountsV2DeletionReceipt(fake.db, receiptId, NOW + 1);
    const done = fake.docs.get(deletionReceiptPath(receiptId)) as Data;
    expect((done.expireAt as Timestamp).toMillis()).toBe(NOW + 1 + 30 * 24 * 60 * 60 * 1000);
  });

  test('статус с толчком: удаляет данные старого uid и отдаёт только этап', async () => {
    const fake = fakeFirestore();
    seed(fake.docs, UID, 'accounts_v2_entities', 5);
    await issueAccountsV2DeletionReceipt(fake.db, UID, CRED, NOW);
    const result = await accountsV2DeletionStatusForCallable(fake.db, REQ, { nudge: true, nowMs: NOW + 1 });
    expect(result).toEqual({ stage: 'v2_purged' });
    expect([...fake.docs.keys()].some((key) => key.startsWith(`accounts_v2/${UID}/`))).toBe(false);
  });

  test('отказ → HttpsError permission-denied с кодом, без секрета и uid', async () => {
    const fake = fakeFirestore();
    await issueAccountsV2DeletionReceipt(fake.db, UID, CRED, NOW);
    const error = await accountsV2DeletionStatusForCallable(fake.db, { ...REQ, capability: key(7) }, { nowMs: NOW })
      .then(() => null, (caught: unknown) => caught);
    expect(error).toBeInstanceOf(HttpsError);
    expect(error).toMatchObject({ code: 'permission-denied', message: 'account_v2_deletion_status_denied' });
    expect(JSON.stringify(error)).not.toContain(UID);
    expect(JSON.stringify(error)).not.toContain(key(7));
  });
});

describe('Ремонт №1 P2-2 (Firestore): отзыв квитанции', () => {
  test('pending удаляется транзакцией, completed — нет', async () => {
    const fake = fakeFirestore();
    const { receiptId } = await issueAccountsV2DeletionReceipt(fake.db, UID, CRED, NOW);
    expect(await revokeAccountsV2DeletionReceipt(fake.db, receiptId)).toBe('revoked');
    expect(fake.docs.has(deletionReceiptPath(receiptId))).toBe(false);
    const again = await issueAccountsV2DeletionReceipt(fake.db, UID, CRED, NOW);
    await completeAccountsV2DeletionReceipt(fake.db, again.receiptId, NOW);
    expect(await revokeAccountsV2DeletionReceipt(fake.db, again.receiptId)).toBe('completed');
    expect(fake.docs.has(deletionReceiptPath(again.receiptId))).toBe(true);
  });
});
