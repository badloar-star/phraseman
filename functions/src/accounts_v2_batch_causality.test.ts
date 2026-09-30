import {
  ACCOUNTS_V2_LIBRARY_MAX_TOMBSTONES,
  ACCOUNTS_V2_MAX_ENTITY_STATE_BYTES,
  ACCOUNTS_V2_SRS_TIME_KEY,
  applyBatch,
  canonicalJson,
  docIdFor,
  validateBatch,
  type AccountsV2EntityRecord,
  type AccountsV2EntityType,
  type AccountsV2OpRecord,
  type AccountsV2Receipt,
  type AccountsV2TxPort,
  type JsonValue,
} from './accounts_v2_apply_core';

/*
 * Account V2, Пакет 3S, ремонт №5 (TG-0DDA5886ECBD) — офлайн-правки одного
 * телефона в одном пакете и сборка мусора, не трогающая свежие tombstone.
 *
 * зачем: телефон офлайн сделал «добавил → удалил» (или «удалил → добавил») с
 * одной и той же базой, и оба действия ушли одним пакетом. Раньше второе
 * действие получало conflict: его база не видела изменения, сделанного первым
 * действием этого же пакета. Теперь внутри пакета операции по одной сущности
 * причинно упорядочены: база ≥ ревизии на начало пакета (R0) ⇒ эффективная база
 * = текущая ревизия сущности внутри пакета. База > R0 — «из будущего», conflict.
 * Между пакетами это обязанность клиента (см. TEMP-контракт в apply_core).
 */

const UID = 'user-A';
const NOW = 1_790_000_000_000;
const LIMIT = ACCOUNTS_V2_MAX_ENTITY_STATE_BYTES;

type Doc = Readonly<Record<string, unknown>>;
type Entry = [string, number];
type Library = { items: Entry[]; removed: Entry[] };

function createStore() {
  let ops = new Map<string, Doc>();
  let entities = new Map<string, Doc>();
  function transact<T>(fn: (port: AccountsV2TxPort) => T): T {
    const draftOps = new Map(ops);
    const draftEntities = new Map(entities);
    const port: AccountsV2TxPort = {
      getOp: (_uid, id) => (draftOps.get(id) ?? null) as AccountsV2OpRecord | null,
      getEntity: (_uid, id) => (draftEntities.get(id) ?? null) as AccountsV2EntityRecord | null,
      putEntity: (_uid, id, record) => { draftEntities.set(id, structuredClone(record) as unknown as Doc); },
      putReceipt: (_uid, id, record) => { draftOps.set(id, structuredClone(record) as unknown as Doc); },
    };
    const result = fn(port);
    ops = draftOps;
    entities = draftEntities;
    return result;
  }
  const record = (type: AccountsV2EntityType, id: string): Doc => {
    const found = entities.get(docIdFor(type, id));
    if (found === undefined) throw new Error('no entity');
    return found;
  };
  return {
    transact,
    lib: (): Library => JSON.parse(record('library_membership', 'lib').stateJson as string),
    libRevision: (): number => record('library_membership', 'lib').revision as number,
    card: (): { revision: number; fields: Record<string, { value: JsonValue; variants: JsonValue[] }> } => {
      const doc = record('flashcard', 'card');
      return { revision: doc.revision as number, fields: JSON.parse(doc.stateJson as string).fields };
    },
    entitiesJson: (): string => JSON.stringify([...entities].sort()),
    seedLibrary: (revision: number, state: JsonValue): void => {
      entities.set(docIdFor('library_membership', 'lib'), {
        entityType: 'library_membership', entityIdJson: JSON.stringify('lib'), revision, updatedAtMs: NOW,
        lastOperationIdJson: JSON.stringify('seed'), stateJson: canonicalJson(state),
      });
    },
  };
}

type Store = ReturnType<typeof createStore>;

function envelope(id: string, entityType: AccountsV2EntityType, entityId: string, payload: JsonValue,
  base: number | null, seq = 1) {
  return {
    ownerUid: UID,
    operation: { schemaVersion: 1, operationId: id, entityType, entityId, clientSequence: seq, baseRevision: base, payload },
  };
}
const add = (id: string, ids: readonly string[], base: number | null) =>
  envelope(id, 'library_membership', 'lib', { itemIds: [...ids] }, base);
const remove = (id: string, ids: readonly string[], base: number | null) =>
  envelope(id, 'library_membership', 'lib', { removeItemIds: [...ids] }, base);
const upsert = (id: string, fields: Record<string, JsonValue>, base: number | null, seq = 1) =>
  envelope(id, 'flashcard', 'card', { op: 'upsert', fields }, base, seq);

function apply(store: Store, operations: readonly unknown[]): readonly AccountsV2Receipt[] {
  const result = validateBatch({ batchId: 'b', operations: [...operations] });
  if (!result.ok) throw new Error(`invalid batch ${result.code} ${result.path}`);
  return store.transact((port) => applyBatch(port, UID, result.batch, NOW));
}

const ids = (entries: readonly Entry[]): string[] => entries.map(([id]) => id);
const firestoreBytes = (state: JsonValue): number => Buffer.byteLength(canonicalJson(state), 'utf8') + 1;

/** Библиотека на ревизии 3: s (и x, если нужно) — живые. */
function libraryAt3(withX: boolean): Store {
  const store = createStore();
  apply(store, [add('seed-1', withX ? ['s', 'x'] : ['s'], null)]);
  apply(store, [add('seed-2', ['p2'], 1)]);
  apply(store, [add('seed-3', ['p3'], 2)]);
  expect(store.libRevision()).toBe(3);
  return store;
}

describe('ремонт №5, P1: офлайн-правки одного телефона в одном пакете', () => {
  test('библиотека: [add X база r, remove X база r] → X удалён, applied/applied', () => {
    const store = libraryAt3(false);
    expect(apply(store, [add('add-x', ['x'], 3), remove('rm-x', ['x'], 3)])).toEqual([
      { operationId: 'add-x', outcome: 'applied', serverRevision: 4 },
      { operationId: 'rm-x', outcome: 'applied', serverRevision: 5 },
    ]);
    expect(ids(store.lib().items)).toEqual(['p2', 'p3', 's']);
    expect(store.lib().removed).toEqual([['x', 5]]);
  });

  test('библиотека: [remove X база r (X был), add X база r] → X в библиотеке, applied/applied', () => {
    const store = libraryAt3(true);
    expect(apply(store, [remove('rm-x', ['x'], 3), add('add-x', ['x'], 3)])).toEqual([
      { operationId: 'rm-x', outcome: 'applied', serverRevision: 4 },
      { operationId: 'add-x', outcome: 'applied', serverRevision: 5 },
    ]);
    expect(store.lib()).toEqual({ items: [['p2', 2], ['p3', 3], ['s', 1], ['x', 5]], removed: [] });
  });

  test('межпакетно с исходной базой — честный conflict (контракт клиента (а): базу не переписывать)', () => {
    // зачем: см. TEMP-контракт в accounts_v2_apply_core.ts, пункт (а) (ремонт №8).
    // Клиент НЕ продвигает базу ни по квитанции, ни по перечитанному состоянию:
    // операция из следующего пакета уходит с исходной базой и получает conflict.
    const store = libraryAt3(false);
    expect(apply(store, [add('add-x', ['x'], 3)])).toEqual([{ operationId: 'add-x', outcome: 'applied', serverRevision: 4 }]);
    expect(apply(store, [remove('rm-x', ['x'], 3)])).toEqual([{ operationId: 'rm-x', outcome: 'conflict', serverRevision: 4 }]);
    expect(ids(store.lib().items)).toContain('x');
    // Разрешение конфликта — НОВАЯ осознанная операция по прочитанному состоянию.
    expect(apply(store, [remove('rm-x2', ['x'], 4)])).toEqual([{ operationId: 'rm-x2', outcome: 'applied', serverRevision: 5 }]);
  });

  test('база «из будущего» считается по ревизии на начало пакета, а не по текущей внутри пакета', () => {
    const store = libraryAt3(false);
    expect(apply(store, [add('add-x', ['x'], 3), remove('rm-x', ['x'], 4)])).toEqual([
      { operationId: 'add-x', outcome: 'applied', serverRevision: 4 },
      { operationId: 'rm-x', outcome: 'conflict', serverRevision: 4 },
    ]);
    expect(ids(store.lib().items)).toContain('x');
  });

  test('устаревшая база (< ревизии на начало пакета) внутри пакета остаётся устаревшей', () => {
    const store = libraryAt3(true);
    apply(store, [remove('rm-x', ['x'], 3)]);
    expect(apply(store, [add('add-y', ['y'], 4), add('stale-x', ['x'], 2)])).toEqual([
      { operationId: 'add-y', outcome: 'applied', serverRevision: 5 },
      { operationId: 'stale-x', outcome: 'conflict', serverRevision: 5 },
    ]);
    expect(ids(store.lib().items)).not.toContain('x');
  });

  test('карточка: две правки одного поля с одной базой в пакете → последняя, без вариантов', () => {
    const store = createStore();
    apply(store, [upsert('seed', { front: 'a', back: 'z' }, null)]);
    expect(apply(store, [upsert('e1', { front: 'b' }, 1, 2), upsert('e2', { front: 'c' }, 1, 3)])).toEqual([
      { operationId: 'e1', outcome: 'applied', serverRevision: 2 },
      { operationId: 'e2', outcome: 'applied', serverRevision: 3 },
    ]);
    const { fields } = store.card();
    expect(fields.front.value).toBe('c');
    expect(fields.front.variants).toEqual([]);
    expect(fields.back.value).toBe('z');
  });

  test('карточка межпакетно с одной базой — по-прежнему вариант и conflict', () => {
    const store = createStore();
    apply(store, [upsert('seed', { front: 'a' }, null)]);
    apply(store, [upsert('e1', { front: 'b' }, 1, 2)]);
    expect(apply(store, [upsert('e2', { front: 'c' }, 1, 3)]))
      .toEqual([{ operationId: 'e2', outcome: 'conflict', serverRevision: 3 }]);
    expect(store.card().fields.front).toMatchObject({ value: 'b', variants: ['c'] });
  });

  test('SRS в одном пакете: порядок по времени правки сохраняется', () => {
    const store = createStore();
    apply(store, [upsert('seed', { front: 'a' }, null)]);
    const srs = (time: number, due: string) => ({ [ACCOUNTS_V2_SRS_TIME_KEY]: time, due });
    expect(apply(store, [
      upsert('late', { srs: srs(NOW - 1000, 'late') }, 1, 2),
      upsert('early', { srs: srs(NOW - 5000, 'early') }, 1, 3),
    ])).toEqual([
      { operationId: 'late', outcome: 'applied', serverRevision: 2 },
      { operationId: 'early', outcome: 'conflict', serverRevision: 2 },
    ]);
    expect(store.card().fields.srs.value).toEqual(srs(NOW - 1000, 'late'));
  });

  test('SRS в пакете при равном времени: отметка берёт ИСХОДНУЮ базу, не эффективную (ремонт №6)', () => {
    // зачем: op2 идёт вторым, и её эффективная база внутри пакета = 2. Если бы
    // отметка брала эффективную базу, [T,2,3] обогнала бы [T,1,5] и op2 победила
    // бы только из-за нарезки пакета. С исходной базой [T,1,3] < [T,1,5] — проигрыш.
    const store = createStore();
    apply(store, [upsert('seed', { front: 'a' }, null)]);
    const time = NOW - 1000;
    const srs = (due: string) => ({ [ACCOUNTS_V2_SRS_TIME_KEY]: time, due });
    expect(apply(store, [
      upsert('op1', { srs: srs('one') }, 1, 5),
      upsert('op2', { srs: srs('two') }, 1, 3),
    ])).toEqual([
      { operationId: 'op1', outcome: 'applied', serverRevision: 2 },
      { operationId: 'op2', outcome: 'conflict', serverRevision: 2 },
    ]);
    const card = store.card();
    expect(card.revision).toBe(2);
    expect(card.fields.srs.value).toEqual(srs('one'));
  });
});

describe('ремонт №5, P3: сборка мусора не вытесняет свежие tombstone', () => {
  /** Библиотека ровно на пределе байт: A, B и длинный F добавлены на ревизии 1, сущность на ревизии 9. */
  function fullLibraryAt9(): Store {
    const base: Library = { items: [['A', 1], ['B', 1], ['f', 1]], removed: [] };
    const filler = LIMIT - firestoreBytes(base);
    const state: Library = { items: [['A', 1], ['B', 1], [`f${'y'.repeat(filler)}`, 1]], removed: [] };
    expect(firestoreBytes(state)).toBe(LIMIT);
    const store = createStore();
    store.seedLibrary(9, state);
    return store;
  }

  test('почти полная библиотека + свежие удаления: свежий tombstone не вытеснен, отказ честный', () => {
    const store = fullLibraryAt9();
    // Второе удаление добавляет 1 байт (ревизия 11 длиннее 1 и лишняя запятая), а
    // вытеснить можно только tombstone A@10 — созданный в этом же пакете.
    expect(apply(store, [remove('rm-a', ['A'], 9), remove('rm-b', ['B'], 9)])).toEqual([
      { operationId: 'rm-a', outcome: 'applied', serverRevision: 10 },
      { operationId: 'rm-b', outcome: 'rejected', code: 'entity_state_too_large', serverRevision: 10 },
    ]);
    const lib = store.lib();
    expect(lib.removed).toEqual([['A', 10]]);
    expect(ids(lib.items).slice(0, 1)).toEqual(['B']);
    expect(firestoreBytes(lib)).toBeLessThanOrEqual(LIMIT);
    // Устаревшее добавление с другого устройства (база до удаления) не воскрешает A.
    const before = store.entitiesJson();
    expect(apply(store, [add('stale-a', ['A'], 5)]))
      .toEqual([{ operationId: 'stale-a', outcome: 'conflict', serverRevision: 10 }]);
    expect(store.entitiesJson()).toBe(before);
  });

  test('старые tombstone (до начала пакета) вытесняются, свежий остаётся', () => {
    const pad = 'z'.repeat(40_000);
    const base: Library = { items: [['f', 1], ['x', 9]], removed: [[`t1${pad}`, 1], [`t2${pad}`, 2]] };
    const filler = LIMIT - firestoreBytes(base);
    const state: Library = { ...base, items: [[`f${'y'.repeat(filler)}`, 1], ['x', 9]] };
    const store = createStore();
    store.seedLibrary(9, state);
    expect(apply(store, [remove('rm-x', ['x'], 9)]))
      .toEqual([{ operationId: 'rm-x', outcome: 'applied', serverRevision: 10 }]);
    expect(store.lib().removed).toEqual([[`t2${pad}`, 2], ['x', 10]]);
    expect(apply(store, [add('stale-x', ['x'], 9)])[0].outcome).toBe('conflict');
  });

  test('tombstone ровно на ревизии начала пакета (R0) — старый, вытесняется (ремонт №6)', () => {
    // зачем: граница «≤ R0» включительная. tombstone t@9 при R0 = 9 создан ДО
    // пакета — его можно вытеснить. Строгое «< R0» оставило бы только его и дало
    // бы ложный entity_state_too_large.
    const pad = 'z'.repeat(40_000);
    const base: Library = { items: [['f', 1], ['x', 8]], removed: [[`t${pad}`, 9]] };
    const filler = LIMIT - firestoreBytes(base);
    const state: Library = { ...base, items: [[`f${'y'.repeat(filler)}`, 1], ['x', 8]] };
    expect(firestoreBytes(state)).toBe(LIMIT);
    const store = createStore();
    store.seedLibrary(9, state);
    // Удаление x: ['x',8] → ['x',10] даёт +1 байт — без вытеснения t@9 не помещается.
    expect(apply(store, [remove('rm-x', ['x'], 9)]))
      .toEqual([{ operationId: 'rm-x', outcome: 'applied', serverRevision: 10 }]);
    const lib = store.lib();
    expect(lib.removed).toEqual([['x', 10]]);
    expect(firestoreBytes(lib)).toBeLessThanOrEqual(LIMIT);
  });

  test('предел числа: пакет, создающий больше предела свежих tombstone, — entity_state_too_large', () => {
    const store = createStore();
    const many = Array.from({ length: ACCOUNTS_V2_LIBRARY_MAX_TOMBSTONES + 1 }, (_, i) => `m${String(i).padStart(4, '0')}`);
    apply(store, [add('seed', many, null)]);
    const before = store.entitiesJson();
    expect(apply(store, [remove('rm-all', many, 1)])).toEqual([
      { operationId: 'rm-all', outcome: 'rejected', code: 'entity_state_too_large', serverRevision: 1 },
    ]);
    // Состояние не менялось, квитанция отказа записана.
    expect(store.entitiesJson()).toBe(before);
    expect(apply(store, [remove('rm-most', many.slice(1), 1)])[0].outcome).toBe('applied');
  });
});
