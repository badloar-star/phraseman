import {
  ACCOUNTS_V2_LIBRARY_MAX_TOMBSTONES,
  ACCOUNTS_V2_MAX_ENTITY_STATE_BYTES,
  AccountsV2ApplyError,
  applyBatch,
  canonicalJson,
  docIdFor,
  mergeLibraryMembership,
  validateBatch,
  type AccountsV2EntityRecord,
  type AccountsV2OpRecord,
  type AccountsV2Receipt,
  type AccountsV2TxPort,
  type JsonValue,
} from './accounts_v2_apply_core';

/*
 * Account V2, Пакет 3S, ремонт №4 — библиотека: удаление не зависит от порядка
 * прихода, tombstone не блокируют библиотеку навсегда.
 *
 * зачем: живые id хранят ревизию добавления `[id, addedRevision]`, tombstone —
 * ревизию удаления `[id, removedRevision]`. Операция над id применяется, только
 * если устройство ВИДЕЛО последнее изменение этого id (baseRevision ≥ его
 * ревизии); иначе id не трогается и исход conflict. Удаление id, которого нет,
 * — ничего не наблюдало и ничего не пишет. Tombstone вытесняются самые старые,
 * когда их больше предела или состояние не помещается.
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
  const record = (): Doc | null => entities.get(docIdFor('library_membership', 'lib')) ?? null;
  return {
    transact,
    record,
    lib: (): Library => JSON.parse(record()?.stateJson as string),
    revision: (): number => record()?.revision as number,
    entitiesJson: (): string => JSON.stringify([...entities].sort()),
    seed: (revision: number, state: JsonValue): void => {
      entities.set(docIdFor('library_membership', 'lib'), {
        entityType: 'library_membership', entityIdJson: JSON.stringify('lib'), revision, updatedAtMs: NOW,
        lastOperationIdJson: JSON.stringify('seed'), stateJson: canonicalJson(state),
      });
    },
  };
}

type Store = ReturnType<typeof createStore>;

function libOp(id: string, payload: JsonValue, base: number | null) {
  return {
    ownerUid: UID,
    operation: {
      schemaVersion: 1, operationId: id, entityType: 'library_membership', entityId: 'lib',
      clientSequence: 1, baseRevision: base, payload,
    },
  };
}
const add = (id: string, ids: readonly string[], base: number | null) => libOp(id, { itemIds: [...ids] }, base);
const remove = (id: string, ids: readonly string[], base: number | null) =>
  libOp(id, { removeItemIds: [...ids] }, base);

function apply(store: Store, operations: readonly unknown[]): readonly AccountsV2Receipt[] {
  const result = validateBatch({ batchId: 'b', operations: [...operations] });
  if (!result.ok) throw new Error(`invalid batch ${result.code} ${result.path}`);
  return store.transact((port) => applyBatch(port, UID, result.batch, NOW));
}

const firestoreBytes = (state: JsonValue): number => Buffer.byteLength(canonicalJson(state), 'utf8') + 1;
const ids = (entries: readonly Entry[]): string[] => entries.map(([id]) => id);

describe('библиотека: удаление с защитой от воскрешения', () => {
  test('живые id хранят ревизию добавления, удаление оставляет tombstone с ревизией удаления', () => {
    const store = createStore();
    apply(store, [add('op-1', ['a', 'b'], null)]);
    expect(store.lib()).toEqual({ items: [['a', 1], ['b', 1]], removed: [] });
    expect(apply(store, [remove('op-2', ['a'], 1)]))
      .toEqual([{ operationId: 'op-2', outcome: 'applied', serverRevision: 2 }]);
    expect(store.lib()).toEqual({ items: [['b', 1]], removed: [['a', 2]] });
  });

  test('позднее добавление со старым baseRevision не воскрешает удалённое', () => {
    const store = createStore();
    apply(store, [add('op-1', ['a'], null)]);
    apply(store, [remove('op-2', ['a'], 1)]);
    const before = store.entitiesJson();
    expect(apply(store, [add('op-3', ['a'], 1)]))
      .toEqual([{ operationId: 'op-3', outcome: 'conflict', serverRevision: 2 }]);
    expect(store.entitiesJson()).toBe(before);
    expect(apply(store, [add('op-4', ['a', 'c'], 0)]))
      .toEqual([{ operationId: 'op-4', outcome: 'conflict', serverRevision: 3 }]);
    expect(store.lib()).toEqual({ items: [['c', 3]], removed: [['a', 2]] });
  });

  test('повторное добавление после удаления — со свежим baseRevision', () => {
    const store = createStore();
    apply(store, [add('op-1', ['a'], null)]);
    apply(store, [remove('op-2', ['a'], 1)]);
    expect(apply(store, [add('op-3', ['a'], 2)]))
      .toEqual([{ operationId: 'op-3', outcome: 'applied', serverRevision: 3 }]);
    expect(store.lib()).toEqual({ items: [['a', 3]], removed: [] });
  });

  test('устаревшее удаление (база < ревизии добавления) не удаляет id: conflict, остальные id применяются', () => {
    const store = createStore();
    apply(store, [add('op-1', ['a'], null)]);
    apply(store, [add('op-2', ['b'], 1)]);
    expect(apply(store, [remove('op-3', ['a', 'b'], 1)]))
      .toEqual([{ operationId: 'op-3', outcome: 'conflict', serverRevision: 3 }]);
    expect(store.lib()).toEqual({ items: [['b', 2]], removed: [['a', 3]] });
  });

  test('удаление отсутствующего id ничего не наблюдало — без tombstone и без изменений', () => {
    const store = createStore();
    apply(store, [add('op-1', ['s'], null)]);
    const before = store.entitiesJson();
    expect(apply(store, [remove('op-2', ['x'], 1)]))
      .toEqual([{ operationId: 'op-2', outcome: 'applied', serverRevision: 1 }]);
    expect(store.entitiesJson()).toBe(before);
  });

  test('ревью №4: tombstone a@6, X add a (база 10), Y устаревший remove (база 3) — итог одинаков', () => {
    const run = (order: 'XY' | 'YX') => {
      const store = createStore();
      apply(store, [add('r1', ['a'], null)]);
      for (let revision = 1; revision < 5; revision += 1) apply(store, [add(`p${revision}`, [`p${revision}`], revision)]);
      apply(store, [remove('r6', ['a'], 5)]);
      for (let revision = 6; revision < 10; revision += 1) apply(store, [add(`q${revision}`, [`q${revision}`], revision)]);
      expect(store.revision()).toBe(10);
      expect(store.lib().removed).toEqual([['a', 6]]);
      const x = add('X', ['a'], 10);
      const y = remove('Y', ['a'], 3);
      for (const operation of order === 'XY' ? [x, y] : [y, x]) apply(store, [operation]);
      return { revision: store.revision(), lib: store.lib() };
    };
    const xy = run('XY');
    expect(run('YX')).toEqual(xy);
    expect(xy.revision).toBe(11);
    expect(xy.lib.items).toContainEqual(['a', 11]);
    expect(ids(xy.lib.removed)).not.toContain('a');
  });

  test('параллельные add и remove от одной базы: одно членство в любом порядке', () => {
    const run = (seedIds: readonly string[], ops: readonly unknown[]) => {
      const store = createStore();
      apply(store, [add('seed', seedIds, null)]);
      for (const operation of ops) apply(store, [operation]);
      return ids(store.lib().items);
    };
    // id отсутствовал на базе: удаление его не видело — добавление остаётся.
    const absent = [add('op-add', ['x', 'y'], 1), remove('op-rm', ['x'], 1)];
    expect(run(['s'], absent)).toEqual(['s', 'x', 'y']);
    expect(run(['s'], [...absent].reverse())).toEqual(['s', 'x', 'y']);
    // id был на базе: удаление его видело — удаляется в любом порядке.
    const present = [add('op-add', ['x'], 1), remove('op-rm', ['x'], 1)];
    expect(run(['s', 'x'], present)).toEqual(['s']);
    expect(run(['s', 'x'], [...present].reverse())).toEqual(['s']);
  });

  test('идемпотентность: повтор → duplicate; повторное удаление новой операцией — без изменений', () => {
    const store = createStore();
    apply(store, [add('op-1', ['a', 'b'], null)]);
    const op = remove('op-2', ['a'], 1);
    expect(apply(store, [op])).toEqual([{ operationId: 'op-2', outcome: 'applied', serverRevision: 2 }]);
    const before = store.entitiesJson();
    expect(apply(store, [op])).toEqual([{ operationId: 'op-2', outcome: 'duplicate', serverRevision: 2 }]);
    expect(apply(store, [remove('op-3', ['a'], 1)]))
      .toEqual([{ operationId: 'op-3', outcome: 'applied', serverRevision: 2 }]);
    expect(store.entitiesJson()).toBe(before);
  });

  test('baseRevision из будущего → conflict без записи', () => {
    const store = createStore();
    apply(store, [add('op-1', ['a'], null)]);
    apply(store, [remove('op-2', ['a'], 1)]);
    const before = store.entitiesJson();
    expect(apply(store, [add('op-3', ['a'], 9)]))
      .toEqual([{ operationId: 'op-3', outcome: 'conflict', serverRevision: 2 }]);
    expect(apply(store, [remove('op-4', ['b'], 9)]))
      .toEqual([{ operationId: 'op-4', outcome: 'conflict', serverRevision: 2 }]);
    expect(store.entitiesJson()).toBe(before);
  });

  test('форма payload строгая', () => {
    for (const payload of [{ removeItemIds: [] }, { removeItemIds: [''] }, { itemIds: ['a'], removeItemIds: ['b'] },
      { removeItemIds: 'a' }]) {
      expect(mergeLibraryMembership(null, payload as JsonValue, 0, 1)).toEqual({ ok: false, code: 'payload_invalid' });
    }
  });

  test.each([
    ['tombstone из будущего', 1, { items: [], removed: [['a', 2]] }],
    ['живой id из будущего', 1, { items: [['a', 2]], removed: [] }],
    ['id и в членстве, и в tombstone', 1, { items: [['a', 1]], removed: [['a', 1]] }],
    ['старая форма itemIds', 1, { itemIds: ['a'], removed: [] }],
    ['живой id без ревизии', 1, { items: ['a'], removed: [] }],
    ['tombstone с ревизией 0', 1, { items: [], removed: [['a', 0]] }],
    ['tombstone не пара', 1, { items: [], removed: [['a']] }],
    ['повтор id в членстве', 1, { items: [['a', 1], ['a', 1]], removed: [] }],
    ['tombstone больше предела', 1, {
      items: [], removed: Array.from({ length: ACCOUNTS_V2_LIBRARY_MAX_TOMBSTONES + 1 }, (_, i) => [`t${i}`, 1]),
    }],
  ])('сохранённое состояние библиотеки: %s → stored_state_corrupt', (_label, revision, state) => {
    const store = createStore();
    store.seed(revision, state as JsonValue);
    let thrown: unknown;
    try {
      apply(store, [add('op-1', ['z'], 1)]);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(AccountsV2ApplyError);
    expect((thrown as AccountsV2ApplyError).code).toBe('stored_state_corrupt');
  });
});

describe('библиотека: сборка мусора tombstone (ремонт №4)', () => {
  test('удаление у предела проходит: самый старый tombstone вытесняется', () => {
    const pad = 'z'.repeat(40_000);
    const base: Library = {
      items: [[`f${pad}`, 1], ['x', 9]],
      removed: [[`t1${pad}`, 1], [`t2${pad}`, 2]],
    };
    const filler = LIMIT - firestoreBytes(base);
    expect(filler).toBeGreaterThan(0);
    const state: Library = { ...base, items: [[`f${pad}${'y'.repeat(filler)}`, 1], ['x', 9]] };
    expect(firestoreBytes(state)).toBe(LIMIT);
    const store = createStore();
    store.seed(9, state);
    expect(apply(store, [remove('rm-x', ['x'], 9)]))
      .toEqual([{ operationId: 'rm-x', outcome: 'applied', serverRevision: 10 }]);
    const lib = store.lib();
    expect(ids(lib.items)).toEqual([state.items[0][0]]);
    expect(lib.removed).toEqual([[`t2${pad}`, 2], ['x', 10]]);
    expect(firestoreBytes(lib)).toBeLessThanOrEqual(LIMIT);
  });

  test('2×2000 удалений отсутствующих id не блокируют библиотеку', () => {
    const store = createStore();
    apply(store, [add('seed', ['keep'], null)]);
    const before = store.entitiesJson();
    for (const round of [0, 1]) {
      const absent = Array.from({ length: 2000 }, (_, i) => `absent-${round}-${String(i).padStart(4, '0')}-${'q'.repeat(40)}`);
      expect(apply(store, [remove(`rm-${round}`, absent, 1)]))
        .toEqual([{ operationId: `rm-${round}`, outcome: 'applied', serverRevision: 1 }]);
    }
    expect(store.entitiesJson()).toBe(before);
    expect(apply(store, [add('after', ['new'], 1)]))
      .toEqual([{ operationId: 'after', outcome: 'applied', serverRevision: 2 }]);
    expect(apply(store, [remove('rm-keep', ['keep'], 2)])[0].outcome).toBe('applied');
  });

  test('число tombstone ограничено: вытесняются самые старые; их защита от воскрешения теряется', () => {
    const store = createStore();
    const early = Array.from({ length: 600 }, (_, i) => `e${String(i).padStart(4, '0')}`);
    const late = Array.from({ length: 600 }, (_, i) => `l${String(i).padStart(4, '0')}`);
    apply(store, [add('add', [...early, ...late], null)]);
    apply(store, [remove('rm-early', early, 1)]);
    expect(apply(store, [remove('rm-late', late, 2)]))
      .toEqual([{ operationId: 'rm-late', outcome: 'applied', serverRevision: 3 }]);
    const { removed } = store.lib();
    expect(removed).toHaveLength(ACCOUNTS_V2_LIBRARY_MAX_TOMBSTONES);
    // Вытеснены 200 самых старых (ревизия 2, по id): e0000..e0199.
    expect(ids(removed)).not.toContain('e0199');
    expect(ids(removed)).toContain('e0200');
    expect(removed.filter(([, revision]) => revision === 3)).toHaveLength(600);
    // Задокументировано в TEMP: очень старая устаревшая операция воскрешает вытесненный id,
    // невытесненный по-прежнему защищён.
    expect(apply(store, [add('stale-evicted', ['e0000'], 1)])[0].outcome).toBe('applied');
    expect(apply(store, [add('stale-kept', ['e0200'], 1)])[0].outcome).toBe('conflict');
  });

  test('рост живого членства упирается в предел — entity_state_too_large, а не порча', () => {
    const store = createStore();
    const big = 'b'.repeat(60_000);
    apply(store, [add('one', [`1${big}`], null)]);
    apply(store, [add('two', [`2${big}`], 1)]);
    expect(apply(store, [add('three', [`3${big}`], 2)])).toEqual([{
      operationId: 'three', outcome: 'rejected', code: 'entity_state_too_large', serverRevision: 2,
    }]);
    // Удаление, уменьшающее состояние, при этом проходит (ремонт №5: не «всегда» —
    // свежие tombstone не вытесняются, см. accounts_v2_batch_causality.test.ts).
    expect(apply(store, [remove('rm', [`1${big}`], 2)])[0].outcome).toBe('applied');
  });
});
