import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import {
  AccountsV2ApplyError,
  docIdFor,
  opDocIdFor,
  planBatchReads,
  validateBatch,
  type ValidatedBatch,
} from '../accounts_v2_apply_core';
import {
  ACCOUNTS_V2_RECEIPT_TTL_MS,
  accountsV2EntityPath,
  accountsV2MetaPath,
  accountsV2OpPath,
  accountsV2UidPathSafe,
  applyBatchInFirestore,
  createAccountsV2SnapshotPort,
  type AccountsV2TxGuard,
} from './firestore_port';

/*
 * Account V2, Пакет 3A-srv — Firestore-адаптер порта ядра 3S.
 *
 * зачем: адаптер — единственное место, где ядро встречается с Firestore. Тесты
 * гоняют его на фейковой транзакции (без эмулятора и сети) с настоящей
 * семантикой: записи копятся в черновике и попадают в базу только при коммите,
 * исключение внутри функции транзакции не оставляет ни одной записи, а
 * «конфликт» Firestore перезапускает функцию целиком (retry).
 * Ремонт №1 (TG-A09A44FE758E): сторож читается ПЕРВЫМ отдельным tx.get, отказ
 * стоит одно чтение, «ядовитый» пакет коммитит только сторожа.
 */

const UID = 'user-A';
const NOW = 1_790_000_000_000;

type Data = Record<string, unknown>;
type Ref = Readonly<{ path: string; id: string }>;

type FakeFirestore = {
  db: Firestore;
  committed: Map<string, Data>;
  getAllCalls: string[][];
  events: string[];
  attempts: () => number;
  commits: () => number;
  /** Прочитано документов (tx.get + tx.getAll) — единица оплаты Firestore. */
  reads: () => number;
  /** Сколько следующих попыток «проиграют» конфликт ПОСЛЕ выполнения функции. */
  abortNext: (count: number) => void;
  /** Вызывается между проигранной попыткой и следующей: «чужой» коммит в это окно. */
  onAbort: (hook: () => void) => void;
};

function createFakeFirestore(): FakeFirestore {
  const committed = new Map<string, Data>();
  const getAllCalls: string[][] = [];
  const events: string[] = [];
  let attempts = 0;
  let commits = 0;
  let aborts = 0;
  let reads = 0;
  let abortHook: () => void = () => undefined;
  const ref = (path: string): Ref => ({ path, id: path.split('/').pop() ?? '' });
  const snap = (item: Ref) => {
    const data = committed.get(item.path);
    return { ref: item, exists: data !== undefined, data: () => (data === undefined ? undefined : { ...data }) };
  };
  const db = {
    doc: (path: string) => ref(path),
    async runTransaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
      for (let round = 0; round < 5; round += 1) {
        attempts += 1;
        const staged = new Map<string, Data>();
        let wrote = false;
        const tx = {
          async getAll(...refs: Ref[]) {
            // Firestore: все чтения транзакции — до первой записи.
            if (wrote) throw new Error('fake_read_after_write');
            getAllCalls.push(refs.map((item) => item.path));
            events.push(`getAll:${refs.length}`);
            reads += refs.length;
            return refs.map(snap);
          },
          async get(item: Ref) {
            if (wrote) throw new Error('fake_read_after_write');
            events.push(`get:${item.path}`);
            reads += 1;
            return snap(item);
          },
          set(item: Ref, data: Data) {
            wrote = true;
            events.push(`set:${item.path}`);
            staged.set(item.path, { ...data });
            return tx;
          },
        };
        const result = await fn(tx);
        if (aborts > 0) {
          aborts -= 1;
          events.push('abort');
          abortHook();
          continue;
        }
        for (const [path, data] of staged) committed.set(path, data);
        commits += 1;
        events.push('commit');
        return result;
      }
      throw new Error('fake_too_much_contention');
    },
  };
  return {
    db: db as unknown as Firestore,
    committed,
    getAllCalls,
    events,
    attempts: () => attempts,
    commits: () => commits,
    reads: () => reads,
    abortNext: (count: number) => {
      aborts = count;
    },
    onAbort: (hook: () => void) => {
      abortHook = hook;
    },
  };
}

type EntityType = 'lesson_progress' | 'flashcard' | 'library_membership';

function rawOp(
  operationId: string,
  entityType: EntityType,
  entityId: string,
  payload: unknown,
  ownerUid = UID,
): Record<string, unknown> {
  return {
    ownerUid,
    operation: { schemaVersion: 1, operationId, entityType, entityId, clientSequence: 1, baseRevision: null, payload },
  };
}

function valid(operations: readonly unknown[]): ValidatedBatch {
  const result = validateBatch({ batchId: 'batch-1', operations: [...operations] });
  if (!result.ok) throw new Error(`unexpected invalid batch: ${result.code}`);
  return result.batch;
}

const lesson = (operationId: string, entityId = 'l01', score = 80): Record<string, unknown> =>
  rawOp(operationId, 'lesson_progress', entityId, { passed: true, score });

function sortedPaths(paths: readonly string[]): string[] {
  return [...paths].sort();
}

const corruptLesson = (): Data => ({
  entityType: 'lesson_progress', entityIdJson: '"l01"', revision: 1, updatedAtMs: NOW,
  lastOperationIdJson: '"op-0"', stateJson: '{not json',
});

describe('accounts_v2_firestore_port: пути', () => {
  it('сущности и квитанции лежат под uid вызывающего', async () => {
    const fake = createFakeFirestore();
    await applyBatchInFirestore(fake.db, UID, valid([lesson('op-1')]), NOW);
    // Имена коллекций закреплены литералами: их же считает тест бюджета коммита.
    const entityPath = `accounts_v2/${UID}/accounts_v2_entities/${docIdFor('lesson_progress', 'l01')}`;
    const opPath = `accounts_v2/${UID}/accounts_v2_ops/${opDocIdFor('op-1')}`;
    expect(accountsV2EntityPath(UID, docIdFor('lesson_progress', 'l01'))).toBe(entityPath);
    expect(accountsV2OpPath(UID, opDocIdFor('op-1'))).toBe(opPath);
    expect(accountsV2MetaPath(UID, 'rate')).toBe(`accounts_v2/${UID}/accounts_v2_meta/rate`);
    expect(sortedPaths([...fake.committed.keys()])).toEqual(sortedPaths([entityPath, opPath]));
  });

  it('uid, непригодный для пути, отклоняется до любого чтения', async () => {
    const fake = createFakeFirestore();
    for (const uid of ['a/b', '.', '..', '__x__']) {
      await expect(applyBatchInFirestore(fake.db, uid, valid([lesson('op-1', 'l01', 80)].map((op) => ({
        ...op, ownerUid: uid,
      }))), NOW)).rejects.toThrow('accounts_v2_uid_not_path_safe');
    }
    expect(fake.getAllCalls).toHaveLength(0);
    expect(fake.committed.size).toBe(0);
    for (const uid of ['a/b', '.', '..', '__x__', '']) expect(accountsV2UidPathSafe(uid)).toBe(false);
    expect(accountsV2UidPathSafe(UID)).toBe(true);
  });

  it('ключ документа обязан быть sha256-hex', () => {
    expect(() => accountsV2EntityPath(UID, 'not-a-hash')).toThrow();
    expect(() => accountsV2OpPath(UID, 'x/y')).toThrow();
  });
});

describe('accounts_v2_firestore_port: чтения', () => {
  it('getAll ровно по плану и одним вызовом (сущность пакета читается один раз)', async () => {
    const fake = createFakeFirestore();
    const batch = valid([lesson('op-1'), lesson('op-2', 'l01', 90), lesson('op-3', 'l02')]);
    const plan = planBatchReads(batch);
    await applyBatchInFirestore(fake.db, UID, batch, NOW);
    expect(fake.getAllCalls).toHaveLength(1);
    const expected = [
      ...plan.operations.map(({ opDocId }) => accountsV2OpPath(UID, opDocId)),
      ...plan.entities.map(({ docId }) => accountsV2EntityPath(UID, docId)),
    ];
    expect(sortedPaths(fake.getAllCalls[0])).toEqual(sortedPaths(expected));
    expect(fake.getAllCalls[0]).toHaveLength(5);
    expect(fake.reads()).toBe(5);
  });

  it('все записи — после единственного getAll, коммит один', async () => {
    const fake = createFakeFirestore();
    await applyBatchInFirestore(fake.db, UID, valid([lesson('op-1'), lesson('op-2', 'l02')]), NOW);
    expect(fake.events[0]).toBe('getAll:4');
    expect(fake.events.filter((event) => event.startsWith('set:'))).toHaveLength(4);
    expect(fake.events[fake.events.length - 1]).toBe('commit');
    expect(fake.commits()).toBe(1);
  });

  it('несовпадение числа снапшотов getAll — accounts_v2_getall_mismatch без записи', async () => {
    const fake = createFakeFirestore();
    const broken = {
      doc: (path: string) => ({ path, id: path }),
      runTransaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => fn({
        getAll: async () => [],
        set: () => {
          throw new Error('must_not_write');
        },
      }),
    } as unknown as Firestore;
    await expect(applyBatchInFirestore(broken, UID, valid([lesson('op-1')]), NOW))
      .rejects.toThrow('accounts_v2_getall_mismatch');
    expect(fake.committed.size).toBe(0);
  });
});

describe('accounts_v2_firestore_port: синхронный порт поверх снапшотов', () => {
  const batch = valid([lesson('op-1')]);
  const plan = planBatchReads(batch);
  const opDocId = plan.operations[0].opDocId;
  const entityDocId = plan.entities[0].docId;
  const make = () => createAccountsV2SnapshotPort(
    UID, plan, new Map([[opDocId, null]]), new Map([[entityDocId, null]]),
  );

  it('ключ вне плана бросает — и на чтении, и на записи', () => {
    const { port } = make();
    const stranger = docIdFor('lesson_progress', 'l99');
    expect(() => port.getEntity(UID, stranger)).toThrow('accounts_v2_port_key_outside_plan');
    expect(() => port.getOp(UID, opDocIdFor('op-x'))).toThrow('accounts_v2_port_key_outside_plan');
    expect(() => port.putEntity(UID, stranger, {} as never)).toThrow('accounts_v2_port_key_outside_plan');
    expect(() => port.putReceipt(UID, opDocIdFor('op-x'), {} as never)).toThrow('accounts_v2_port_key_outside_plan');
  });

  it('чужой uid на порту бросает', () => {
    const { port } = make();
    expect(() => port.getEntity('user-B', entityDocId)).toThrow('accounts_v2_port_uid_mismatch');
    expect(() => port.getOp('user-B', opDocId)).toThrow('accounts_v2_port_uid_mismatch');
  });

  it('отсутствующий документ плана — null', () => {
    const { port } = make();
    expect(port.getEntity(UID, entityDocId)).toBeNull();
    expect(port.getOp(UID, opDocId)).toBeNull();
  });

  it('служебное поле TTL квитанции ядру не отдаётся', () => {
    const stored = {
      operationIdJson: '"op-1"', fingerprint: 'a'.repeat(64),
      receipt: { outcome: 'applied', serverRevision: 1 }, recordedAtMs: NOW,
      expireAt: Timestamp.fromMillis(NOW),
    };
    const { port } = createAccountsV2SnapshotPort(
      UID, plan, new Map([[opDocId, stored]]), new Map([[entityDocId, null]]),
    );
    expect(Object.keys(port.getOp(UID, opDocId) ?? {}).sort())
      .toEqual(['fingerprint', 'operationIdJson', 'receipt', 'recordedAtMs']);
  });
});

describe('accounts_v2_firestore_port: TTL квитанций', () => {
  it('квитанция получает expireAt = now + срок, сущность — нет', async () => {
    const fake = createFakeFirestore();
    await applyBatchInFirestore(fake.db, UID, valid([lesson('op-1')]), NOW);
    const op = fake.committed.get(accountsV2OpPath(UID, opDocIdFor('op-1')));
    const entity = fake.committed.get(accountsV2EntityPath(UID, docIdFor('lesson_progress', 'l01')));
    expect(op?.expireAt).toBeInstanceOf(Timestamp);
    expect((op?.expireAt as Timestamp).toMillis()).toBe(NOW + ACCOUNTS_V2_RECEIPT_TTL_MS);
    expect(entity).toBeDefined();
    expect(entity).not.toHaveProperty('expireAt');
  });

  it('срок квитанции не короче 180 суток', () => {
    expect(ACCOUNTS_V2_RECEIPT_TTL_MS).toBeGreaterThanOrEqual(180 * 24 * 60 * 60 * 1000);
  });

  it('квитанция с expireAt читается повтором: duplicate, без повторного применения', async () => {
    const fake = createFakeFirestore();
    const first = await applyBatchInFirestore(fake.db, UID, valid([lesson('op-1')]), NOW);
    const before = JSON.stringify([...fake.committed.entries()].map(([key, value]) => [key, value.stateJson ?? null]));
    const again = await applyBatchInFirestore(fake.db, UID, valid([lesson('op-1')]), NOW + 1000);
    expect(first[0].outcome).toBe('applied');
    expect(again).toEqual([{ operationId: 'op-1', outcome: 'duplicate', serverRevision: 1 }]);
    const after = JSON.stringify([...fake.committed.entries()].map(([key, value]) => [key, value.stateJson ?? null]));
    expect(after).toBe(before);
  });
});

describe('accounts_v2_firestore_port: атомарность', () => {
  it('ошибка ядра (порча хранимого состояния) без сторожа — ни одной записи', async () => {
    const fake = createFakeFirestore();
    fake.committed.set(accountsV2EntityPath(UID, docIdFor('lesson_progress', 'l01')), corruptLesson());
    const snapshot = JSON.stringify([...fake.committed.entries()]);
    await expect(applyBatchInFirestore(fake.db, UID, valid([lesson('op-1'), lesson('op-2', 'l02')]), NOW))
      .rejects.toBeInstanceOf(AccountsV2ApplyError);
    expect(fake.events.some((event) => event.startsWith('set:'))).toBe(false);
    expect(JSON.stringify([...fake.committed.entries()])).toBe(snapshot);
  });

  it('повтор транзакции Firestore даёт тот же результат и то же состояние', async () => {
    const once = createFakeFirestore();
    const retried = createFakeFirestore();
    const ops = [lesson('op-1'), lesson('op-2', 'l02', 55)];
    const expected = await applyBatchInFirestore(once.db, UID, valid(ops), NOW);
    retried.abortNext(2);
    const actual = await applyBatchInFirestore(retried.db, UID, valid(ops), NOW);
    expect(retried.attempts()).toBe(3);
    expect(retried.getAllCalls).toHaveLength(3);
    expect(retried.commits()).toBe(1);
    expect(actual).toEqual(expected);
    const dump = (fake: FakeFirestore) => JSON.stringify([...fake.committed.entries()].sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => [key, { ...value, expireAt: (value.expireAt as Timestamp | undefined)?.toMillis() ?? null }]));
    expect(dump(retried)).toBe(dump(once));
  });

  it('между попытками коммитится чужая квитанция op-1: вторая попытка — duplicate, сущность первой не записана', async () => {
    // Квитанция op-1 ровно такая, какой её записал бы параллельный вызов.
    const foreign = createFakeFirestore();
    await applyBatchInFirestore(foreign.db, UID, valid([lesson('op-1')]), NOW);
    const op1Path = accountsV2OpPath(UID, opDocIdFor('op-1'));
    const foreignReceipt = foreign.committed.get(op1Path);
    expect(foreignReceipt).toBeDefined();

    const fake = createFakeFirestore();
    fake.abortNext(1);
    fake.onAbort(() => fake.committed.set(op1Path, { ...(foreignReceipt as Data) }));
    const receipts = await applyBatchInFirestore(fake.db, UID, valid([lesson('op-1'), lesson('op-2', 'l02', 55)]), NOW);

    expect(fake.attempts()).toBe(2);
    expect(receipts).toEqual([
      { operationId: 'op-1', outcome: 'duplicate', serverRevision: 1 },
      { operationId: 'op-2', outcome: 'applied', serverRevision: 1 },
    ]);
    // Первая попытка применила op-1 к l01 — эта запись обязана умереть вместе с попыткой.
    expect(fake.committed.get(accountsV2EntityPath(UID, docIdFor('lesson_progress', 'l01')))).toBeUndefined();
    expect(fake.committed.get(accountsV2EntityPath(UID, docIdFor('lesson_progress', 'l02')))).toBeDefined();
    expect(fake.committed.get(op1Path)).toEqual(foreignReceipt);
    expect(fake.committed.size).toBe(3);
  });
});

describe('accounts_v2_firestore_port: сторож (счётчик частоты) читается ПЕРВЫМ', () => {
  const guardPath = accountsV2MetaPath(UID, 'rate');
  const allow = (write: Data): AccountsV2TxGuard => ({ path: guardPath, decide: () => ({ allowed: true, write }) });

  it('порядок: get(сторож) → getAll(ровно план) → записи; чтений = 1 + план', async () => {
    const fake = createFakeFirestore();
    await applyBatchInFirestore(fake.db, UID, valid([lesson('op-1'), lesson('op-2', 'l02')]), NOW, allow({ count: 1 }));
    expect(fake.events[0]).toBe(`get:${guardPath}`);
    expect(fake.events[1]).toBe('getAll:4');
    expect(fake.getAllCalls[0]).not.toContain(guardPath);
    expect(fake.reads()).toBe(5);
    expect(fake.committed.get(guardPath)).toEqual({ count: 1 });
  });

  it('отказ сторожа стоит ОДНО чтение: план не читается, пишется только запись сторожа', async () => {
    const fake = createFakeFirestore();
    const refusal = new Error('refused_for_test');
    const guard: AccountsV2TxGuard = {
      path: guardPath,
      decide: () => ({ allowed: false, write: { blockedUntilMs: NOW + 1 }, error: refusal }),
    };
    await expect(applyBatchInFirestore(fake.db, UID, valid([lesson('op-1')]), NOW, guard)).rejects.toBe(refusal);
    expect(fake.reads()).toBe(1);
    expect(fake.getAllCalls).toHaveLength(0);
    expect([...fake.committed.keys()]).toEqual([guardPath]);
  });

  it('отказ без записи (блок уже записан) — одно чтение, ноль записей', async () => {
    const fake = createFakeFirestore();
    const guard: AccountsV2TxGuard = {
      path: guardPath,
      decide: () => ({ allowed: false, write: null, error: new Error('refused_for_test') }),
    };
    await expect(applyBatchInFirestore(fake.db, UID, valid([lesson('op-1')]), NOW, guard)).rejects.toThrow('refused_for_test');
    expect(fake.reads()).toBe(1);
    expect(fake.events.some((event) => event.startsWith('set:'))).toBe(false);
  });

  it('«ядовитый» пакет (ошибка ядра): коммитится только счётчик, ошибка бросается после коммита', async () => {
    const fake = createFakeFirestore();
    const entityPath = accountsV2EntityPath(UID, docIdFor('lesson_progress', 'l01'));
    fake.committed.set(entityPath, corruptLesson());
    await expect(applyBatchInFirestore(fake.db, UID, valid([lesson('op-1'), lesson('op-2', 'l02')]), NOW, allow({ count: 7 })))
      .rejects.toBeInstanceOf(AccountsV2ApplyError);
    expect(fake.commits()).toBe(1);
    expect(fake.events.filter((event) => event.startsWith('set:'))).toEqual([`set:${guardPath}`]);
    expect(fake.committed.get(guardPath)).toEqual({ count: 7 });
    expect(fake.committed.get(entityPath)).toEqual(corruptLesson());
    expect(fake.committed.size).toBe(2);
  });

  it('путь сторожа вне accounts_v2/{uid}/ — отказ до любого чтения', async () => {
    const fake = createFakeFirestore();
    const foreignPaths = [accountsV2MetaPath('user-B', 'rate'), 'users/user-A', `accounts_v2/${UID}x/accounts_v2_meta/rate`];
    for (const path of foreignPaths) {
      await expect(applyBatchInFirestore(
        fake.db, UID, valid([lesson('op-1')]), NOW, { path, decide: () => ({ allowed: true, write: {} }) },
      )).rejects.toThrow('accounts_v2_guard_path_foreign');
    }
    expect(fake.reads()).toBe(0);
    expect(fake.committed.size).toBe(0);
  });
});
