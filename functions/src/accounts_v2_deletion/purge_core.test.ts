import {
  ACCOUNTS_V2_PURGE_DEFAULT_MAX_COMMITS,
  ACCOUNTS_V2_PURGE_MAX_WRITES_PER_COMMIT,
  runAccountsV2Purge,
  type AccountsV2PurgeCursor,
  type AccountsV2PurgePort,
} from './purge_core';

/*
 * Account V2, Пакет 4 — чистое ядро удаления accounts_v2/{uid}/**.
 * зачем: удаление обязано быть ПОЛНЫМ и не зависать: порции ≤ 450 записей на
 * коммит, повторяемое (удалить удалённое — не ошибка), возобновление с курсора
 * после падения в любом месте. Здесь — матрица обрывов на памяти.
 */

const KNOWN = ['accounts_v2_entities', 'accounts_v2_ops', 'accounts_v2_meta'] as const;
const UID = 'OldUid1234567890abcdefghijkl';

type Store = Map<string, Map<string, Map<string, true>>>;

function hexId(n: number): string {
  return n.toString(16).padStart(64, '0');
}

function seed(counts: Record<string, number>, uid = UID, store: Store = new Map()): Store {
  const user = store.get(uid) ?? new Map<string, Map<string, true>>();
  for (const [collection, count] of Object.entries(counts)) {
    const docs = user.get(collection) ?? new Map<string, true>();
    for (let i = 0; i < count; i += 1) docs.set(collection === 'accounts_v2_meta' ? `rate${i}` : hexId(i), true);
    user.set(collection, docs);
  }
  store.set(uid, user);
  return store;
}

type Fault = 'delete_before_commit' | 'none';

function memoryPort(store: Store): AccountsV2PurgePort & {
  commits: number[];
  lists: { collection: string; after: string | null }[];
  failNextDelete: (fault: Fault) => void;
  rootDeletes: number;
} {
  let nextFault: Fault = 'none';
  const commits: number[] = [];
  const lists: { collection: string; after: string | null }[] = [];
  const port = {
    commits,
    lists,
    rootDeletes: 0,
    failNextDelete(fault: Fault) { nextFault = fault; },
    async listSubcollections(uid: string) {
      const user = store.get(uid);
      return user ? [...user.entries()].filter(([, docs]) => docs.size > 0).map(([name]) => name) : [];
    },
    async listDocIds(uid: string, collection: string, afterDocId: string | null, limit: number) {
      lists.push({ collection, after: afterDocId });
      const docs = [...(store.get(uid)?.get(collection)?.keys() ?? [])].sort();
      return docs.filter((id) => afterDocId === null || id > afterDocId).slice(0, limit);
    },
    async deleteDocs(uid: string, collection: string, docIds: readonly string[]) {
      if (nextFault === 'delete_before_commit') {
        nextFault = 'none';
        throw new Error('simulated_crash_before_commit');
      }
      commits.push(docIds.length);
      const docs = store.get(uid)?.get(collection);
      for (const id of docIds) docs?.delete(id);
    },
    async deleteRoot() { port.rootDeletes += 1; },
  };
  return port;
}

function remaining(store: Store, uid = UID): number {
  return [...(store.get(uid)?.values() ?? [])].reduce((sum, docs) => sum + docs.size, 0);
}

describe('runAccountsV2Purge', () => {
  test('удаляет всё под uid порциями ≤ 450, чужой uid не трогает', async () => {
    const store = seed({ accounts_v2_entities: 1000, accounts_v2_ops: 451, accounts_v2_meta: 1 });
    seed({ accounts_v2_entities: 5 }, 'OtherUid', store);
    const port = memoryPort(store);
    const result = await runAccountsV2Purge(port, UID, { knownCollections: KNOWN });
    expect(result).toMatchObject({ done: true, cursor: null, deletedDocs: 1452 });
    expect(remaining(store)).toBe(0);
    expect(remaining(store, 'OtherUid')).toBe(5);
    expect(Math.max(...port.commits)).toBeLessThanOrEqual(ACCOUNTS_V2_PURGE_MAX_WRITES_PER_COMMIT);
    expect(ACCOUNTS_V2_PURGE_MAX_WRITES_PER_COMMIT).toBe(450);
    expect(port.rootDeletes).toBe(1);
  });

  test('повтор после завершения — ничего не ломает (идемпотентно)', async () => {
    const store = seed({ accounts_v2_entities: 3 });
    const port = memoryPort(store);
    await runAccountsV2Purge(port, UID, { knownCollections: KNOWN });
    const again = await runAccountsV2Purge(port, UID, { knownCollections: KNOWN });
    expect(again).toMatchObject({ done: true, deletedDocs: 0 });
  });

  test('бюджет коммитов: останавливается с курсором и продолжает с него', async () => {
    const store = seed({ accounts_v2_entities: 1000, accounts_v2_ops: 10 });
    const port = memoryPort(store);
    const first = await runAccountsV2Purge(port, UID, { knownCollections: KNOWN, maxCommits: 1 });
    expect(first.done).toBe(false);
    expect(first.cursor).toEqual({ collection: 'accounts_v2_entities', afterDocId: hexId(449) });
    const listsBefore = port.lists.length;
    const second = await runAccountsV2Purge(port, UID, { knownCollections: KNOWN, cursor: first.cursor });
    expect(second.done).toBe(true);
    expect(port.lists[listsBefore]).toEqual({ collection: 'accounts_v2_entities', after: hexId(449) });
    expect(remaining(store)).toBe(0);
  });

  test('падение посреди порции (до коммита): повтор с сохранённого курсора доводит до конца', async () => {
    const store = seed({ accounts_v2_entities: 900 });
    const port = memoryPort(store);
    const saved: AccountsV2PurgeCursor[] = [];
    port.failNextDelete('none');
    let calls = 0;
    const origDelete = port.deleteDocs;
    port.deleteDocs = async (uid, collection, ids) => {
      calls += 1;
      if (calls === 2) throw new Error('simulated_crash_before_commit');
      return origDelete(uid, collection, ids);
    };
    await expect(runAccountsV2Purge(port, UID, {
      knownCollections: KNOWN,
      onProgress: async (cursor) => { saved.push(cursor); },
    })).rejects.toThrow('simulated_crash_before_commit');
    expect(remaining(store)).toBe(450);
    const resumed = await runAccountsV2Purge(port, UID, { knownCollections: KNOWN, cursor: saved[saved.length - 1] });
    expect(resumed.done).toBe(true);
    expect(remaining(store)).toBe(0);
  });

  test('падение ПОСЛЕ коммита, но до сохранения курсора: старый курсор безопасен', async () => {
    const store = seed({ accounts_v2_entities: 900 });
    const port = memoryPort(store);
    await expect(runAccountsV2Purge(port, UID, {
      knownCollections: KNOWN,
      onProgress: async () => { throw new Error('simulated_cursor_save_lost'); },
    })).rejects.toThrow('simulated_cursor_save_lost');
    expect(remaining(store)).toBe(450);
    const resumed = await runAccountsV2Purge(port, UID, { knownCollections: KNOWN, cursor: null });
    expect(resumed).toMatchObject({ done: true, deletedDocs: 450 });
  });

  test('неизвестная подколлекция под uid тоже удаляется (страховка полноты)', async () => {
    const store = seed({ accounts_v2_entities: 2, accounts_v2_future: 3 });
    const port = memoryPort(store);
    const result = await runAccountsV2Purge(port, UID, { knownCollections: KNOWN });
    expect(result).toMatchObject({ done: true, deletedDocs: 5 });
    expect(remaining(store)).toBe(0);
  });

  test('курсор на исчезнувшую коллекцию — начинает сначала, а не зависает', async () => {
    const store = seed({ accounts_v2_ops: 2 });
    const port = memoryPort(store);
    const result = await runAccountsV2Purge(port, UID, {
      knownCollections: KNOWN,
      cursor: { collection: 'accounts_v2_gone', afterDocId: 'zzz' },
    });
    expect(result.done).toBe(true);
    expect(remaining(store)).toBe(0);
  });

  test('запись, прилетевшая во время удаления, ловится финальной проверкой (done=false)', async () => {
    const store = seed({ accounts_v2_entities: 1 });
    const port = memoryPort(store);
    const origRoot = port.deleteRoot;
    let raced = false;
    port.deleteRoot = async (uid) => {
      if (!raced) { raced = true; seed({ accounts_v2_ops: 1 }, UID, store); }
      return origRoot(uid);
    };
    const first = await runAccountsV2Purge(port, UID, { knownCollections: KNOWN });
    expect(first).toMatchObject({ done: false, cursor: null });
    const second = await runAccountsV2Purge(port, UID, { knownCollections: KNOWN });
    expect(second.done).toBe(true);
    expect(remaining(store)).toBe(0);
  });

  test.each([
    ['пустой uid', ''],
    ['слэш', 'a/b'],
    ['точка-точка', '..'],
    ['служебный __x__', '__x__'],
    ['контейнер квитанций', '_deletion_receipts_v1'],
  ])('опасный uid отклоняется без единого чтения: %s', async (_name, uid) => {
    const port = memoryPort(new Map());
    await expect(runAccountsV2Purge(port, uid, { knownCollections: KNOWN })).rejects.toThrow('accounts_v2_purge_uid_invalid');
    expect(port.lists).toHaveLength(0);
  });

  test('порция больше 450 запрещена', async () => {
    const port = memoryPort(new Map());
    await expect(runAccountsV2Purge(port, UID, { knownCollections: KNOWN, chunkSize: 451 }))
      .rejects.toThrow('accounts_v2_purge_chunk_invalid');
  });
});

describe('Ремонт №1 P3-4: верхняя граница коммитов по умолчанию', () => {
  test('без maxCommits вызов останавливается на пределе и отдаёт курсор', async () => {
    const store = seed({ accounts_v2_entities: ACCOUNTS_V2_PURGE_DEFAULT_MAX_COMMITS + 5 });
    const port = memoryPort(store);
    const result = await runAccountsV2Purge(port, UID, { knownCollections: KNOWN, chunkSize: 1 });
    expect(ACCOUNTS_V2_PURGE_DEFAULT_MAX_COMMITS).toBeGreaterThan(0);
    expect(Number.isFinite(ACCOUNTS_V2_PURGE_DEFAULT_MAX_COMMITS)).toBe(true);
    expect(result).toMatchObject({ done: false, commits: ACCOUNTS_V2_PURGE_DEFAULT_MAX_COMMITS });
    expect(result.cursor).not.toBeNull();
  });

  test.each([0, -1, 1.5, Number.POSITIVE_INFINITY])('некорректный maxCommits %p отклоняется', async (maxCommits) => {
    const port = memoryPort(seed({ accounts_v2_entities: 1 }));
    await expect(runAccountsV2Purge(port, UID, { knownCollections: KNOWN, maxCommits }))
      .rejects.toThrow('accounts_v2_purge_max_commits_invalid');
  });
});
