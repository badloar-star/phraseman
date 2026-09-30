import { createHash } from 'crypto';
import {
  AccountsV2ApplyError,
  applyBatch,
  docIdFor,
  opDocIdFor,
  planBatchReads,
  validateBatch,
  type AccountsV2Batch,
  type AccountsV2EntityRecord,
  type AccountsV2OpRecord,
  type AccountsV2Receipt,
  type AccountsV2TxPort,
  type ValidatedBatch,
} from './accounts_v2_apply_core';

/*
 * Account V2, Пакет 3S — ядро применения синхронизации на сервере.
 *
 * зачем: ядро не подключено к index.ts и не знает Firestore. Тесты гоняют его
 * через in-memory порт с настоящей транзакционной семантикой (черновик →
 * коммит только при успехе), чтобы доказать: ошибка посреди пакета не
 * оставляет ни одной частичной записи и ни одной квитанции. Порт вдобавок
 * изображает ограничения Firestore (вложенные массивы, глубина, имена полей,
 * одиночные суррогаты) — запись, которую Firestore не принял бы, роняет тест.
 */

const UID = 'user-A';
const OTHER_UID = 'user-B';
const NOW = 1_790_000_000_000;

type PortMethod = 'getOp' | 'getEntity' | 'putEntity' | 'putReceipt';
type Fault = Readonly<{ method: PortMethod; nth: number }>;
type Doc = Readonly<Record<string, unknown>>;

type MemoryState = {
  ops: Map<string, Doc>;
  entities: Map<string, Doc>;
};

function cloneState(state: MemoryState): MemoryState {
  return {
    ops: new Map([...state.ops].map(([key, value]) => [key, structuredClone(value)])),
    entities: new Map([...state.entities].map(([key, value]) => [key, structuredClone(value)])),
  };
}

// Firestore принимает id документа без `/`, не `.`/`..`, не `__.*__`, ≤ 1500 байт.
// Порт требует ровно sha256-hex — так любой пользовательский id безопасен.
const HEX_DOC_ID = /^[0-9a-f]{64}$/;
const FIRESTORE_MAX_DEPTH = 20;
const FIRESTORE_MAX_FIELD_NAME_BYTES = 1500;

function wellFormed(text: string): boolean {
  for (let index = 0; index < text.length; index += 1) {
    const unit = text.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = index + 1 < text.length ? text.charCodeAt(index + 1) : -1;
      if (next < 0xdc00 || next > 0xdfff) return false;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return false;
  }
  return true;
}

/** Бросает, если такой документ Firestore не принял бы (или исказил). */
function assertFirestoreStorable(value: unknown, path: string, depth: number, inArray: boolean): void {
  if (typeof value === 'string') {
    if (!wellFormed(value)) throw new Error(`firestore_lone_surrogate:${path}`);
    return;
  }
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return;
  if (typeof value !== 'object') throw new Error(`firestore_unsupported:${path}`);
  if (depth > FIRESTORE_MAX_DEPTH) throw new Error(`firestore_too_deep:${path}`);
  if (Array.isArray(value)) {
    if (inArray) throw new Error(`firestore_nested_array:${path}`);
    value.forEach((item, index) => assertFirestoreStorable(item, `${path}[${index}]`, depth + 1, true));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === '' || /^__[\s\S]*__$/.test(key) || !wellFormed(key)
      || Buffer.byteLength(key, 'utf8') > FIRESTORE_MAX_FIELD_NAME_BYTES) {
      throw new Error(`firestore_field_name:${path}`);
    }
    assertFirestoreStorable(child, `${path}.${key}`, depth + 1, false);
  }
}

function createMemoryStore() {
  let committed: MemoryState = { ops: new Map(), entities: new Map() };
  const calls: string[] = [];
  const reads: string[] = [];
  const docKey = (uid: string, docId: string): string => {
    if (!HEX_DOC_ID.test(docId)) throw new Error(`firestore_invalid_doc_id:${docId}`);
    return JSON.stringify([uid, docId]);
  };
  const opKey = (uid: string, operationId: string): string => docKey(uid, opDocIdFor(operationId));
  const entityKey = (uid: string, entityType: EntityType, entityId: string): string =>
    docKey(uid, docIdFor(entityType, entityId));

  function transact<T>(fn: (port: AccountsV2TxPort) => T, fault?: Fault, allowed?: ReadonlySet<string>): T {
    const draft = cloneState(committed);
    const counters: Record<PortMethod, number> = { getOp: 0, getEntity: 0, putEntity: 0, putReceipt: 0 };
    const hit = (method: PortMethod, docId: string): void => {
      // Порт адаптера знает план: ключ вне planBatchReads — ошибка, а не тихое чтение.
      if (allowed !== undefined && !allowed.has(docId)) throw new Error('port_key_outside_plan');
      counters[method] += 1;
      if (fault !== undefined && fault.method === method && fault.nth === counters[method]) {
        throw new Error(`port_fault_${method}_${fault.nth}`);
      }
    };
    const port: AccountsV2TxPort = {
      getOp(uid, opDocId) {
        calls.push(`getOp:${uid}`);
        reads.push(`op:${opDocId}`);
        hit('getOp', opDocId);
        return (draft.ops.get(docKey(uid, opDocId)) ?? null) as AccountsV2OpRecord | null;
      },
      getEntity(uid, entityDocId) {
        calls.push(`getEntity:${uid}`);
        reads.push(`entity:${entityDocId}`);
        hit('getEntity', entityDocId);
        return (draft.entities.get(docKey(uid, entityDocId)) ?? null) as AccountsV2EntityRecord | null;
      },
      putEntity(uid, entityDocId, record) {
        calls.push(`putEntity:${uid}`);
        hit('putEntity', entityDocId);
        assertFirestoreStorable(record, '$', 0, false);
        draft.entities.set(docKey(uid, entityDocId), structuredClone(record) as unknown as Doc);
      },
      putReceipt(uid, opDocId, record) {
        calls.push(`putReceipt:${uid}`);
        hit('putReceipt', opDocId);
        assertFirestoreStorable(record, '$', 0, false);
        draft.ops.set(docKey(uid, opDocId), structuredClone(record) as unknown as Doc);
      },
    };
    const result = fn(port);
    committed = draft;
    return result;
  }

  const entity = (uid: string, entityType: EntityType, entityId: string): Doc | null =>
    committed.entities.get(entityKey(uid, entityType, entityId)) ?? null;

  return {
    transact,
    calls,
    reads,
    entity,
    /** Состояние сущности, как его увидит адаптер: JSON.parse(stateJson). */
    state: (uid: string, entityType: EntityType, entityId: string): any => {
      const record = entity(uid, entityType, entityId);
      return record === null ? null : JSON.parse(record.stateJson as string);
    },
    op: (uid: string, operationId: string): any => committed.ops.get(opKey(uid, operationId)) ?? null,
    seedEntity: (uid: string, entityType: EntityType, entityId: string, record: Doc): void => {
      committed.entities.set(entityKey(uid, entityType, entityId), structuredClone(record));
    },
    snapshot: (): string => JSON.stringify({
      ops: [...committed.ops].sort(),
      entities: [...committed.entities].sort(),
    }),
    size: () => committed.ops.size + committed.entities.size,
  };
}

type EntityType = 'lesson_progress' | 'flashcard' | 'library_membership';

function rawOp(
  operationId: string,
  entityType: EntityType,
  entityId: string,
  payload: unknown,
  baseRevision: number | null = null,
  ownerUid = UID,
  clientSequence = 1,
): Record<string, unknown> {
  return {
    ownerUid,
    operation: {
      schemaVersion: 1, operationId, entityType, entityId, clientSequence, baseRevision, payload,
    },
  };
}

function rawBatch(operations: readonly unknown[], batchId = 'batch-1'): Record<string, unknown> {
  return { batchId, operations: [...operations] };
}

function valid(raw: unknown): ValidatedBatch {
  const result = validateBatch(raw);
  if (!result.ok) throw new Error(`unexpected invalid batch: ${result.code} at ${result.path}`);
  return result.batch;
}

function apply(
  store: ReturnType<typeof createMemoryStore>,
  operations: readonly unknown[],
  fault?: Fault,
): readonly AccountsV2Receipt[] {
  const batch = valid(rawBatch(operations));
  return store.transact((port) => applyBatch(port, UID, batch, NOW), fault);
}

function sortedJson(value: unknown): string {
  if (typeof value !== 'object' || value === null) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(sortedJson).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${sortedJson((value as Record<string, unknown>)[key])}`).join(',')}}`;
}

function expectCode(fn: () => unknown, code: string): void {
  let thrown: unknown;
  try {
    fn();
  } catch (error) {
    thrown = error;
  }
  expect(thrown).toBeInstanceOf(AccountsV2ApplyError);
  expect((thrown as AccountsV2ApplyError).code).toBe(code);
}

describe('applyBatch: чужой ownerUid в пакете', () => {
  test('uid_mismatch и ноль записей, ноль чтений', () => {
    const store = createMemoryStore();
    const batch = valid(rawBatch([
      rawOp('op-1', 'library_membership', 'lib', { itemIds: ['a'] }),
      rawOp('op-2', 'library_membership', 'lib', { itemIds: ['b'] }, null, OTHER_UID),
    ]));
    expectCode(() => store.transact((port) => applyBatch(port, UID, batch, NOW)), 'uid_mismatch');
    expect(store.size()).toBe(0);
    expect(store.calls).toEqual([]);
  });

  test('все обращения к порту идут только с uid вызывающего', () => {
    const store = createMemoryStore();
    apply(store, [rawOp('op-1', 'library_membership', 'lib', { itemIds: ['a'] })]);
    expect(store.calls.length).toBeGreaterThan(0);
    expect(store.calls.every((call) => call.endsWith(`:${UID}`))).toBe(true);
  });
});

describe('applyBatch: идемпотентность и ревизии', () => {
  test('повтор operationId → duplicate с тем же serverRevision, без новых записей', () => {
    const store = createMemoryStore();
    const op = rawOp('op-1', 'lesson_progress', 'l01', { passed: true, score: 80 });
    const first = apply(store, [op]);
    expect(first).toEqual([{ operationId: 'op-1', outcome: 'applied', serverRevision: 1 }]);
    const before = store.snapshot();
    const second = apply(store, [op]);
    expect(second).toEqual([{ operationId: 'op-1', outcome: 'duplicate', serverRevision: 1 }]);
    expect(store.snapshot()).toBe(before);
  });

  test('тот же operationId с другим содержимым → rejected operation_id_reused, данные не тронуты', () => {
    const store = createMemoryStore();
    apply(store, [rawOp('op-1', 'lesson_progress', 'l01', { passed: true, score: 80 })]);
    const before = store.snapshot();
    const receipts = apply(store, [rawOp('op-1', 'lesson_progress', 'l01', { passed: true, score: 99 })]);
    expect(receipts).toEqual([{
      operationId: 'op-1', outcome: 'rejected', code: 'operation_id_reused', serverRevision: 1,
    }]);
    expect(store.snapshot()).toBe(before);
  });

  test('P3: тот же operationId с другим baseRevision → operation_id_reused, данные не тронуты', () => {
    const store = createMemoryStore();
    apply(store, [rawOp('op-1', 'flashcard', 'card', { op: 'upsert', fields: { front: 'a' } }, 0)]);
    const before = store.snapshot();
    expect(apply(store, [rawOp('op-1', 'flashcard', 'card', { op: 'upsert', fields: { front: 'a' } }, 1)]))
      .toEqual([{ operationId: 'op-1', outcome: 'rejected', code: 'operation_id_reused', serverRevision: 1 }]);
    // null и 0 — разные конверты для клиента (operationEqual), значит и разные отпечатки.
    expect(apply(store, [rawOp('op-1', 'flashcard', 'card', { op: 'upsert', fields: { front: 'a' } }, null)]))
      .toEqual([{ operationId: 'op-1', outcome: 'rejected', code: 'operation_id_reused', serverRevision: 1 }]);
    expect(store.snapshot()).toBe(before);
  });

  test('P3: переставленные ключи payload — та же операция → duplicate', () => {
    const store = createMemoryStore();
    const payload = { op: 'upsert', fields: { front: 'a', back: { y: 1, x: [2, { d: 1, c: 0 }] } } };
    const reordered = { fields: { back: { x: [2, { c: 0, d: 1 }], y: 1 }, front: 'a' }, op: 'upsert' };
    expect(apply(store, [rawOp('op-1', 'flashcard', 'card', payload)]))
      .toEqual([{ operationId: 'op-1', outcome: 'applied', serverRevision: 1 }]);
    const before = store.snapshot();
    expect(apply(store, [rawOp('op-1', 'flashcard', 'card', reordered)]))
      .toEqual([{ operationId: 'op-1', outcome: 'duplicate', serverRevision: 1 }]);
    expect(store.snapshot()).toBe(before);
  });

  test('P3: tombstone с baseRevision из будущего → conflict без записи', () => {
    const store = createMemoryStore();
    apply(store, [rawOp('op-1', 'flashcard', 'card', { op: 'upsert', fields: { front: 'cat' } })]);
    const before = store.snapshot();
    expect(apply(store, [rawOp('op-2', 'flashcard', 'card', { op: 'tombstone' }, 2)]))
      .toEqual([{ operationId: 'op-2', outcome: 'conflict', serverRevision: 1 }]);
    expect(JSON.parse(store.snapshot()).entities).toEqual(JSON.parse(before).entities);
  });

  test('устаревший baseRevision по тому же полю → conflict, значение не перезаписано', () => {
    const store = createMemoryStore();
    apply(store, [rawOp('op-1', 'flashcard', 'card', { op: 'upsert', fields: { front: 'cat' } })]);
    apply(store, [rawOp('op-2', 'flashcard', 'card', { op: 'upsert', fields: { front: 'Cat' } }, 1)]);
    const receipts = apply(store, [
      rawOp('op-3', 'flashcard', 'card', { op: 'upsert', fields: { front: 'kitten' } }, 1),
    ]);
    expect(receipts).toEqual([{ operationId: 'op-3', outcome: 'conflict', serverRevision: 3 }]);
    const state = store.state(UID, 'flashcard', 'card');
    expect(state.fields.front.value).toBe('Cat');
    expect(state.fields.front.variants).toEqual(['kitten']);
  });

  test('baseRevision из будущего → conflict без записи', () => {
    const store = createMemoryStore();
    apply(store, [rawOp('op-1', 'flashcard', 'card', { op: 'upsert', fields: { front: 'cat' } })]);
    const before = store.snapshot();
    const receipts = apply(store, [
      rawOp('op-2', 'flashcard', 'card', { op: 'upsert', fields: { front: 'dog' } }, 7),
    ]);
    expect(receipts).toEqual([{ operationId: 'op-2', outcome: 'conflict', serverRevision: 1 }]);
    expect(store.entity(UID, 'flashcard', 'card')).toEqual(JSON.parse(before).entities[0][1]);
  });

  test('ошибка порта посреди пакета откатывает всё: ни записей, ни квитанций', () => {
    for (const fault of [
      { method: 'getEntity', nth: 2 },
      { method: 'putEntity', nth: 2 },
      { method: 'putReceipt', nth: 3 },
    ] as const) {
      const store = createMemoryStore();
      apply(store, [rawOp('seed', 'library_membership', 'lib', { itemIds: ['seed'] })]);
      const before = store.snapshot();
      let receipts: readonly AccountsV2Receipt[] | undefined;
      expect(() => {
        receipts = apply(store, [
          rawOp('op-1', 'library_membership', 'lib', { itemIds: ['a'] }),
          rawOp('op-2', 'lesson_progress', 'l01', { passed: true, score: 50 }),
          rawOp('op-3', 'flashcard', 'card', { op: 'upsert', fields: { front: 'x' } }),
        ], fault);
      }).toThrow(`port_fault_${fault.method}_${fault.nth}`);
      expect(receipts).toBeUndefined();
      expect(store.snapshot()).toBe(before);
    }
  });

  test('все чтения идут до первой записи (правило транзакций Firestore)', () => {
    const store = createMemoryStore();
    apply(store, [
      rawOp('op-1', 'library_membership', 'lib', { itemIds: ['a'] }),
      rawOp('op-2', 'flashcard', 'card', { op: 'upsert', fields: { front: 'x' } }),
    ]);
    const firstWrite = store.calls.findIndex((call) => call.startsWith('put'));
    const lastRead = store.calls.map((call) => call.startsWith('get')).lastIndexOf(true);
    expect(firstWrite).toBeGreaterThan(lastRead);
  });

  test('planBatchReads перечисляет ровно то, что прочитает applyBatch', () => {
    const batch = valid(rawBatch([
      rawOp('op-1', 'flashcard', 'card', { op: 'tombstone' }),
      rawOp('op-2', 'flashcard', 'card', { op: 'tombstone' }),
      rawOp('op-3', 'library_membership', 'lib', { itemIds: ['a'] }),
    ]));
    expect(planBatchReads(batch)).toEqual({
      operations: ['op-1', 'op-2', 'op-3'].map((operationId) => ({
        operationId, opDocId: opDocIdFor(operationId),
      })),
      entities: [
        { entityType: 'flashcard', entityId: 'card', docId: docIdFor('flashcard', 'card') },
        { entityType: 'library_membership', entityId: 'lib', docId: docIdFor('library_membership', 'lib') },
      ],
    });
  });

  test('applyBatch реально читает ровно ключи из planBatchReads и ничего вне их', () => {
    const store = createMemoryStore();
    apply(store, [rawOp('seed', 'flashcard', 'card', { op: 'upsert', fields: { front: 'a' } })]);
    store.reads.length = 0;
    const raw = [
      rawOp('op-1', 'flashcard', 'card', { op: 'upsert', fields: { back: 'b' } }, 1),
      rawOp('op-2', 'flashcard', 'card', { op: 'tombstone' }, 2),
      rawOp('op-3', 'library_membership', 'lib', { itemIds: ['a'] }),
      rawOp('seed', 'flashcard', 'card', { op: 'upsert', fields: { front: 'a' } }),
    ];
    const plan = planBatchReads(valid(rawBatch(raw)));
    const planned = [
      ...plan.operations.map(({ opDocId }) => `op:${opDocId}`),
      ...plan.entities.map(({ docId }) => `entity:${docId}`),
    ];
    apply(store, raw);
    expect([...store.reads].sort()).toEqual([...planned].sort());
  });

  test('P3: порт, знающий только план, пропускает applyBatch и бросает на ключ вне плана', () => {
    const store = createMemoryStore();
    const batch = valid(rawBatch([
      rawOp('op-1', 'flashcard', 'card', { op: 'upsert', fields: { front: 'a' } }),
      rawOp('op-2', 'library_membership', 'lib', { itemIds: ['x'] }),
    ]));
    const keysOf = (target: ValidatedBatch): ReadonlySet<string> => {
      const plan = planBatchReads(target);
      return new Set([...plan.operations.map(({ opDocId }) => opDocId), ...plan.entities.map(({ docId }) => docId)]);
    };
    const receipts = store.transact((port) => applyBatch(port, UID, batch, NOW), undefined, keysOf(batch));
    expect(receipts.map(({ outcome }) => outcome)).toEqual(['applied', 'applied']);
    const other = valid(rawBatch([rawOp('op-9', 'flashcard', 'other', { op: 'tombstone' })]));
    const before = store.snapshot();
    expect(() => store.transact((port) => applyBatch(port, UID, batch, NOW), undefined, keysOf(other)))
      .toThrow('port_key_outside_plan');
    expect(store.snapshot()).toBe(before);
  });

  test('повтор conflict и rejected после роста сервера отдаёт ту же сохранённую квитанцию', () => {
    const store = createMemoryStore();
    apply(store, [rawOp('op-1', 'flashcard', 'card', { op: 'upsert', fields: { front: 'cat' } })]);
    apply(store, [rawOp('op-2', 'flashcard', 'card', { op: 'upsert', fields: { front: 'Cat' } }, 1)]);
    const conflictOp = rawOp('op-c', 'flashcard', 'card', { op: 'upsert', fields: { front: 'kitten' } }, 1);
    const rejectedOp = rawOp('op-r', 'lesson_progress', 'l01', { score: 'bad' });
    const first = apply(store, [conflictOp, rejectedOp]);
    expect(first).toEqual([
      { operationId: 'op-c', outcome: 'conflict', serverRevision: 3 },
      { operationId: 'op-r', outcome: 'rejected', code: 'payload_invalid', serverRevision: 0 },
    ]);
    apply(store, [rawOp('op-4', 'flashcard', 'card', { op: 'upsert', fields: { back: 'x' } }, 3)]);
    apply(store, [rawOp('op-5', 'lesson_progress', 'l01', { passed: true, score: 10 })]);
    expect(store.entity(UID, 'flashcard', 'card')?.revision).toBe(4);
    expect(apply(store, [conflictOp, rejectedOp])).toEqual(first);
  });
});

describe('ключи документов: sha256 от канонического JSON', () => {
  const sha = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');
  const weird = ['a/b', 'a/b/c', '.', '..', '__x__', 'x'.repeat(2000), 'я/../__id__', 'x\uD800', 'a\u0000b'];

  test('docIdFor/opDocIdFor — ровно sha256 hex от JSON.stringify([...])', () => {
    for (const id of weird) {
      expect(docIdFor('flashcard', id)).toBe(sha(JSON.stringify(['flashcard', id])));
      expect(opDocIdFor(id)).toBe(sha(JSON.stringify([id])));
      expect(docIdFor('flashcard', id)).toMatch(HEX_DOC_ID);
    }
    const all = weird.map((id) => docIdFor('flashcard', id));
    expect(new Set(all).size).toBe(weird.length);
    expect(docIdFor('flashcard', 'a')).not.toBe(docIdFor('lesson_progress', 'a'));
    // Склейка не путает границы: ["a/b","c"] ≠ ["a","b/c"].
    expect(opDocIdFor('a')).not.toBe(docIdFor('flashcard', 'a'));
    // Одиночные суррогаты не сливаются в один ключ (JSON их экранирует, а не заменяет на U+FFFD).
    expect(opDocIdFor('\uD800')).not.toBe(opDocIdFor('\uD801'));
    expect(opDocIdFor('\uD800')).not.toBe(opDocIdFor('�'));
  });

  test('опасные для Firestore id применяются, порт видит только hex-ключи', () => {
    const store = createMemoryStore();
    const opIds = ['a/b', 'a/b/c', '.', '__op__', `op/${'y'.repeat(140)}`, 'op/5', 'op/6', 'op\uD800', 'op\u0001'];
    const receipts = apply(store, weird.map((id, index) =>
      rawOp(opIds[index], 'flashcard', id, { op: 'upsert', fields: { front: id.slice(0, 10) } },
        null, UID, index)));
    expect(receipts.map((receipt) => receipt.outcome)).toEqual(weird.map(() => 'applied'));
    expect(store.op(UID, 'a/b')?.receipt.outcome).toBe('applied');
    const second = apply(store, [
      rawOp('..', 'flashcard', '..', { op: 'tombstone' }),
      rawOp('x/../y', 'library_membership', 'a/b/c', { itemIds: ['x/y', '..'] }),
    ]);
    expect(second.map((receipt) => receipt.outcome)).toEqual(['applied', 'applied']);
    expect(JSON.parse(store.entity(UID, 'library_membership', 'a/b/c')?.entityIdJson as string)).toBe('a/b/c');
  });
});

describe('SEC P1-1: сервер не строже клиента к id и ключам', () => {
  test.each([
    ['entityId с управляющим символом', (op: Record<string, any>) => { op.operation.entityId = 'a\u0001b'; }],
    ['entityId одиночный суррогат', (op: Record<string, any>) => { op.operation.entityId = 'x\uD800'; }],
    ['entityId одиночный низкий суррогат', (op: Record<string, any>) => { op.operation.entityId = 'a\uDC00'; }],
    ['entityId с NUL', (op: Record<string, any>) => { op.operation.entityId = 'a\u0000b'; }],
    ['entityId с пробелами по краям (клиент пускает)', (op: Record<string, any>) => { op.operation.entityId = ' x '; }],
    ['operationId одиночный суррогат', (op: Record<string, any>) => { op.operation.operationId = 'x\uD800'; }],
    ['operationId с DEL', (op: Record<string, any>) => { op.operation.operationId = 'op\u007f'; }],
    ['operationId с управляющим символом', (op: Record<string, any>) => { op.operation.operationId = 'a\u0001b'; }],
    ['ownerUid одиночный суррогат', (op: Record<string, any>) => { op.ownerUid = 'u\uDBFF'; }],
    ['ключ payload с переводом строки', (op: Record<string, any>) => {
      op.operation.payload = { op: 'upsert', fields: { 'a\nb': 1 } };
    }],
    ['ключ payload одиночный суррогат', (op: Record<string, any>) => { op.operation.payload = { '\uD800': 1 }; }],
    ['пустой ключ payload', (op: Record<string, any>) => { op.operation.payload = { '': 1 }; }],
  ])('%s → validateBatch принимает', (_label, mutate) => {
    const op = rawOp('op-1', 'flashcard', 'card', { op: 'tombstone' });
    mutate(op as Record<string, any>);
    expect(validateBatch(rawBatch([op])).ok).toBe(true);
  });

  test('batchId с переводом строки внутри принимается (клиент пускает)', () => {
    expect(validateBatch(rawBatch([rawOp('op-1', 'flashcard', 'c', { op: 'tombstone' })], 'b\nx')).ok).toBe(true);
  });

  test('кривые id и ключи round-trip через порт; в документах только well-formed строки', () => {
    const store = createMemoryStore();
    const entityId = 'a\u0001b';
    const operationId = 'x\uD800';
    const fields = { 'a\nb': 'x\uD800', '\uDC00': ['\u0000', { '': 'y\uDBFF' }] };
    const receipts = apply(store, [rawOp(operationId, 'flashcard', entityId, { op: 'upsert', fields })]);
    expect(receipts).toEqual([{ operationId, outcome: 'applied', serverRevision: 1 }]);
    const record = store.entity(UID, 'flashcard', entityId) as Record<string, unknown>;
    expect(record.entityIdJson).toBe(JSON.stringify(entityId));
    expect(record.entityIdJson).toBe('"a\\u0001b"');
    expect(JSON.parse(record.lastOperationIdJson as string)).toBe(operationId);
    expect(record.lastOperationIdJson).toBe('"x\\ud800"');
    const state = store.state(UID, 'flashcard', entityId);
    expect(state.fields['a\nb'].value).toBe('x\uD800');
    expect(state.fields['\uDC00'].value).toEqual(['\u0000', { '': 'y\uDBFF' }]);
    const opRecord = store.op(UID, operationId);
    expect(JSON.parse(opRecord.operationIdJson)).toBe(operationId);
    // Повтор той же операции сверяет идентичность по распарсенным значениям.
    const before = store.snapshot();
    expect(apply(store, [rawOp(operationId, 'flashcard', entityId, { op: 'upsert', fields })]))
      .toEqual([{ operationId, outcome: 'duplicate', serverRevision: 1 }]);
    expect(store.snapshot()).toBe(before);
  });

  test('SEC P2: одиночный суррогат в значении не даёт вечного расхождения ревизий и вариантов', () => {
    const store = createMemoryStore();
    apply(store, [rawOp('op-1', 'flashcard', 'card', { op: 'upsert', fields: { front: 'x\uD800' } })]);
    // Новая операция с тем же значением при актуальной базе — без роста ревизии.
    expect(apply(store, [rawOp('op-2', 'flashcard', 'card', { op: 'upsert', fields: { front: 'x\uD800' } }, 1)]))
      .toEqual([{ operationId: 'op-2', outcome: 'applied', serverRevision: 1 }]);
    apply(store, [rawOp('op-3', 'flashcard', 'card', { op: 'upsert', fields: { front: 'y' } }, 1)]);
    // Конфликтующий вариант с суррогатом дважды — один вариант, вторая не растит ревизию вариантов.
    expect(apply(store, [rawOp('op-4', 'flashcard', 'card', { op: 'upsert', fields: { front: 'z\uDC00' } }, 1)]))
      .toEqual([{ operationId: 'op-4', outcome: 'conflict', serverRevision: 3 }]);
    expect(apply(store, [rawOp('op-5', 'flashcard', 'card', { op: 'upsert', fields: { front: 'z\uDC00' } }, 1)]))
      .toEqual([{ operationId: 'op-5', outcome: 'conflict', serverRevision: 3 }]);
    expect(store.state(UID, 'flashcard', 'card').fields.front)
      .toEqual({ value: 'y', revision: 3, variants: ['z\uDC00'] });
  });
});

describe('ValidatedBatch: applyBatch и planBatchReads принимают только выданное validateBatch', () => {
  test('самодельный пакет той же формы → invalid_batch до первого чтения', () => {
    const store = createMemoryStore();
    const batch = valid(rawBatch([rawOp('op-1', 'library_membership', 'lib', { itemIds: ['a'] })]));
    const forged: AccountsV2Batch = JSON.parse(JSON.stringify(batch));
    // @ts-expect-error — обычный AccountsV2Batch не является ValidatedBatch.
    expectCode(() => store.transact((port) => applyBatch(port, UID, forged, NOW)), 'invalid_batch');
    expect(store.calls).toEqual([]);
    expect(store.size()).toBe(0);
  });

  test('поверхностная копия выданного пакета тоже отклоняется (рантайм, не только тип)', () => {
    const store = createMemoryStore();
    const batch = valid(rawBatch([rawOp('op-1', 'library_membership', 'lib', { itemIds: ['a'] })]));
    const copy = { ...batch } as ValidatedBatch;
    expect(() => store.transact((port) => applyBatch(port, UID, copy, NOW))).toThrow('invalid_batch');
    expect(store.calls).toEqual([]);
  });

  test('SEC P3: planBatchReads на неизданном объекте → invalid_batch', () => {
    const batch = valid(rawBatch([rawOp('op-1', 'library_membership', 'lib', { itemIds: ['a'] })]));
    expectCode(() => planBatchReads({ ...batch } as ValidatedBatch), 'invalid_batch');
    expectCode(() => planBatchReads(JSON.parse(JSON.stringify(batch)) as ValidatedBatch), 'invalid_batch');
  });
});

describe('сохранённые записи: fail closed без TypeError', () => {
  const batchFor = (): ValidatedBatch => valid(rawBatch([
    rawOp('op-1', 'flashcard', 'card', { op: 'upsert', fields: { front: 'a' } }),
  ]));
  const portWith = (op: unknown, entity: unknown): AccountsV2TxPort => ({
    getOp: () => op as AccountsV2OpRecord | null,
    getEntity: () => entity as AccountsV2EntityRecord | null,
    putEntity: () => { throw new Error('no_write_expected'); },
    putReceipt: () => { throw new Error('no_write_expected'); },
  });
  const expectCorrupt = (op: unknown, entity: unknown): void => {
    expectCode(() => applyBatch(portWith(op, entity), UID, batchFor(), NOW), 'stored_state_corrupt');
  };
  const goodReceipt = { outcome: 'rejected', code: 'payload_invalid', serverRevision: 0 };
  const goodOp = (receipt: unknown, operationIdJson: unknown = JSON.stringify('op-1')) => ({
    operationIdJson, fingerprint: 'f'.repeat(64), receipt, recordedAtMs: NOW,
  });
  const goodEntity = (patch: Record<string, unknown>) => ({
    entityType: 'flashcard', entityIdJson: JSON.stringify('card'), revision: 1, updatedAtMs: NOW,
    lastOperationIdJson: JSON.stringify('op-0'),
    stateJson: JSON.stringify({ deleted: false, fields: { front: { revision: 1, value: 'a', variants: [] } } }),
    ...patch,
  });

  test.each([
    ['запись операции undefined', undefined, null],
    ['запись операции число', 5, null],
    ['запись сущности undefined', null, undefined],
    ['запись сущности строка', null, 'x'],
    ['rejected с неизвестным кодом', goodOp({ ...goodReceipt, code: 'pwned' }), null],
    ['rejected без кода', goodOp({ outcome: 'rejected', serverRevision: 0 }), null],
    ['rejected с лишним ключом', goodOp({ ...goodReceipt, secret: 'x' }), null],
    ['applied с лишним ключом code', goodOp({ ...goodReceipt, outcome: 'applied' }), null],
    ['квитанция с сырым operationId', goodOp({ ...goodReceipt, operationId: 'op-1' }), null],
    ['operationIdJson не JSON', goodOp(goodReceipt, 'op-1'), null],
    ['operationIdJson чужой операции', goodOp(goodReceipt, JSON.stringify('op-2')), null],
    ['operationIdJson не строка внутри', goodOp(goodReceipt, '["op-1"]'), null],
    ['сущность в старом формате (сырое state)', null, {
      entityType: 'flashcard', entityId: 'card', revision: 1, updatedAtMs: NOW, lastOperationId: 'op-0',
      state: { deleted: false, fields: {} },
    }],
    ['stateJson не JSON', null, goodEntity({ stateJson: '{' })],
    ['stateJson не строка', null, goodEntity({ stateJson: { deleted: false, fields: {} } })],
    ['stateJson чужой формы', null, goodEntity({ stateJson: JSON.stringify({ itemIds: [] }) })],
    ['entityIdJson чужой сущности', null, goodEntity({ entityIdJson: JSON.stringify('other') })],
    ['lastOperationIdJson не JSON-строка', null, goodEntity({ lastOperationIdJson: '7' })],
    ['лишнее поле сущности', null, goodEntity({ extra: 1 })],
    ['P3: ревизия поля больше ревизии сущности', null, goodEntity({ stateJson: JSON.stringify({
      deleted: false, fields: { front: { revision: 2, value: 'a', variants: [] } },
    }) })],
    ['ревизия поля 0', null, goodEntity({ stateJson: JSON.stringify({
      deleted: false, fields: { front: { revision: 0, value: 'a', variants: [] } },
    }) })],
    ['SRS-поле без отметки порядка', null, goodEntity({ stateJson: JSON.stringify({
      deleted: false, fields: { srs: { revision: 1, value: { updatedAtMs: 5 }, variants: [] } },
    }) })],
    ['SRS-поле с вариантами', null, goodEntity({ stateJson: JSON.stringify({
      deleted: false, fields: { srs: { revision: 1, stamp: [5, 0, 1], value: { updatedAtMs: 5 }, variants: [2] } },
    }) })],
    ['отметка SRS из будущего (база > ревизии сущности)', null, goodEntity({ stateJson: JSON.stringify({
      deleted: false, fields: { srs: { revision: 1, stamp: [5, 2, 1], value: { updatedAtMs: 5 }, variants: [] } },
    }) })],
    ['ремонт №4: отметка SRS старой формы [база, clientSequence]', null, goodEntity({ stateJson: JSON.stringify({
      deleted: false, fields: { srs: { revision: 1, stamp: [0, 1], value: { updatedAtMs: 5 }, variants: [] } },
    }) })],
    ['ремонт №4: время отметки не совпадает с updatedAtMs значения', null, goodEntity({ stateJson: JSON.stringify({
      deleted: false, fields: { srs: { revision: 1, stamp: [6, 0, 1], value: { updatedAtMs: 5 }, variants: [] } },
    }) })],
    ['ремонт №4: SRS-значение без времени правки', null, goodEntity({ stateJson: JSON.stringify({
      deleted: false, fields: { srs: { revision: 1, stamp: [5, 0, 1], value: 1, variants: [] } },
    }) })],
    ['отметка порядка у обычного поля', null, goodEntity({ stateJson: JSON.stringify({
      deleted: false, fields: { front: { revision: 1, stamp: [5, 0, 1], value: 'a', variants: [] } },
    }) })],
  ])('%s → stored_state_corrupt', (_label, op, entity) => {
    expectCorrupt(op, entity);
  });

  test('сохранённая rejected-квитанция отдаётся копией ровно из трёх+код полей', () => {
    const port = portWith(goodOp(goodReceipt), null);
    // Отпечаток не совпадёт → operation_id_reused; проверяем форму ответа.
    const receipts = applyBatch(port, UID, batchFor(), NOW);
    expect(receipts).toEqual([{
      operationId: 'op-1', outcome: 'rejected', code: 'operation_id_reused', serverRevision: 0,
    }]);
  });

  test('корректная сохранённая сущность читается и дописывается', () => {
    const writes: unknown[] = [];
    const port: AccountsV2TxPort = {
      getOp: () => null,
      getEntity: () => goodEntity({}) as unknown as AccountsV2EntityRecord,
      putEntity: (_uid, _id, record) => { writes.push(record); },
      putReceipt: () => undefined,
    };
    const batch = valid(rawBatch([rawOp('op-1', 'flashcard', 'card', { op: 'upsert', fields: { back: 'b' } }, 1)]));
    expect(applyBatch(port, UID, batch, NOW)).toEqual([{ operationId: 'op-1', outcome: 'applied', serverRevision: 2 }]);
    expect(JSON.parse((writes[0] as { stateJson: string }).stateJson).fields.back.value).toBe('b');
  });
});

describe('хранение строкой JSON: Firestore видит только плоские записи', () => {
  const nest = (levels: number): unknown => {
    let value: unknown = 1;
    for (let index = 0; index < levels; index += 1) value = { a: value };
    return value;
  };
  const ENTITY_KEYS = ['entityIdJson', 'entityType', 'lastOperationIdJson', 'revision', 'stateJson', 'updatedAtMs'];

  test('SPEC P1: вариант-список (tags) даёт вложенный массив внутри JSON, порт его принимает', () => {
    const store = createMemoryStore();
    apply(store, [rawOp('op-a', 'flashcard', 'card', { op: 'upsert', fields: { tags: ['a'] } })]);
    const receipts = apply(store, [rawOp('op-b', 'flashcard', 'card', { op: 'upsert', fields: { tags: ['a', 'b'] } }, 0)]);
    expect(receipts).toEqual([{ operationId: 'op-b', outcome: 'conflict', serverRevision: 2 }]);
    expect(store.state(UID, 'flashcard', 'card').fields.tags)
      .toEqual({ value: ['a'], revision: 2, variants: [['a', 'b']] });
    const record = store.entity(UID, 'flashcard', 'card') as Record<string, unknown>;
    expect(Object.keys(record).sort()).toEqual(ENTITY_KEYS);
    // Каждое поле документа — примитив: одна индексная запись на поле, без map/array.
    expect(Object.values(record).every((value) => typeof value !== 'object')).toBe(true);
  });

  test('stateJson канонический: ключи отсортированы на всех уровнях', () => {
    const store = createMemoryStore();
    apply(store, [rawOp('op-1', 'flashcard', 'card', {
      op: 'upsert', fields: { zeta: { y: 1, b: [{ d: 1, c: 2 }] }, alpha: 1 },
    })]);
    const stateJson = store.entity(UID, 'flashcard', 'card')?.stateJson as string;
    expect(stateJson).toBe(sortedJson(JSON.parse(stateJson)));
  });

  test('глубина 32 уровня payload + обёртка состояния хранятся и round-trip', () => {
    const store = createMemoryStore();
    // payload(1) → fields(2) → deep: 30 контейнеров (3..32) — ровно предел клиента.
    const deep = nest(30);
    const payload = { op: 'upsert', fields: { deep } };
    expect(validateBatch(rawBatch([rawOp('op-1', 'flashcard', 'c', payload)])).ok).toBe(true);
    expect(apply(store, [rawOp('op-1', 'flashcard', 'c', payload)]))
      .toEqual([{ operationId: 'op-1', outcome: 'applied', serverRevision: 1 }]);
    expect(store.state(UID, 'flashcard', 'c').fields.deep.value).toEqual(deep);
    expect(apply(store, [rawOp('op-2', 'lesson_progress', 'l', { passed: true, score: 1, x: nest(31) })]))
      .toEqual([{ operationId: 'op-2', outcome: 'applied', serverRevision: 1 }]);
  });

  test('имена полей "", __x__, __proto__ и имя > 1500 байт хранятся и round-trip своими ключами', () => {
    const store = createMemoryStore();
    const longName = 'k'.repeat(1600);
    const fields = { '': 1, __name__: 2, front: { inner: { __x__: 3 }, list: [{ '': 4 }] }, [longName]: 5 };
    const payload = { op: 'upsert', fields: { ...fields, nested: { ['__proto__']: 'x', b: null } } };
    expect(Object.keys(payload.fields.nested)).toEqual(['__proto__', 'b']);
    expect(apply(store, [rawOp('op-1', 'flashcard', 'c', payload)]))
      .toEqual([{ operationId: 'op-1', outcome: 'applied', serverRevision: 1 }]);
    const state = store.state(UID, 'flashcard', 'c');
    expect(state.fields[''].value).toBe(1);
    expect(state.fields.__name__.value).toBe(2);
    expect(state.fields.front.value).toEqual({ inner: { __x__: 3 }, list: [{ '': 4 }] });
    expect(state.fields[longName].value).toBe(5);
    const nested = state.fields.nested.value;
    expect(Object.keys(nested)).toEqual(['__proto__', 'b']);
    expect(Reflect.getPrototypeOf(nested)).toBe(Object.prototype);
    expect(apply(store, [rawOp('op-2', 'lesson_progress', 'l', { passed: true, score: 1, __x__: 1 })]))
      .toEqual([{ operationId: 'op-2', outcome: 'applied', serverRevision: 1 }]);
  });

  test('тысячи полей карточки — всё равно шесть полей документа', () => {
    const store = createMemoryStore();
    const many = (prefix: string) => Object.fromEntries(Array.from({ length: 1500 }, (_, index) => [`${prefix}${index}`, index]));
    apply(store, [rawOp('op-1', 'flashcard', 'c', { op: 'upsert', fields: many('a') })]);
    apply(store, [rawOp('op-2', 'flashcard', 'c', { op: 'upsert', fields: many('b') }, 1)]);
    expect(Object.keys(store.state(UID, 'flashcard', 'c').fields)).toHaveLength(3000);
    expect(Object.keys(store.entity(UID, 'flashcard', 'c') as object).sort()).toEqual(ENTITY_KEYS);
  });
});
