import fs from 'fs';
import path from 'path';
import {
  ACCOUNTS_V2_MAX_ENTITY_STATE_BYTES,
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
import {
  ACCOUNTS_V2_LIBRARY_TITLES_KEY,
  ACCOUNTS_V2_LIBRARY_TITLES_MAX_BYTES,
  ACCOUNTS_V2_LIBRARY_TITLES_MAX_PER_OP,
  ACCOUNTS_V2_LIBRARY_TITLE_MAX_CHARS,
} from './accounts_v2_contract';
import { collectLibraryGarbage, type LibraryMembershipState } from './accounts_v2_merge';
import { loadEntityRecord } from './accounts_v2_store';

/*
 * Account V2, Пакет 7C (TEMP из 6G) — названия наборов в сущности библиотеки.
 *
 * зачем: гидрация восстанавливала только id наборов, и шит «Что слушаем?»
 * показывал сырой код набора. Название едет в той же сущности
 * `<target>:community_packs` ОТДЕЛЬНОЙ операцией `{ itemTitles: [[id, ru, uk, es]] }`
 * (урок 7A P2b: старый сервер ответит payload_invalid только на неё, id не
 * теряются). Ноль дополнительных чтений: название приходит тем же pull.
 * Сторож: слияние (только живые id, удаление снимает название, повтор без
 * записи), лимиты, совместимость формы состояния без названий, загрузчик,
 * сборка мусора, паритет констант клиент ↔ сервер.
 */

const UID = 'user-A';
const NOW = 1_790_000_000_000;

type Doc = Readonly<Record<string, unknown>>;

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
    lib: (): Record<string, unknown> => JSON.parse(record()?.stateJson as string),
    revision: (): number => record()?.revision as number,
    seed: (revision: number, state: JsonValue): void => {
      entities.set(docIdFor('library_membership', 'lib'), {
        entityType: 'library_membership', entityIdJson: JSON.stringify('lib'), revision, updatedAtMs: NOW,
        lastOperationIdJson: JSON.stringify('seed'), stateJson: canonicalJson(state),
      });
    },
  };
}

type Store = ReturnType<typeof createStore>;

function libOp(id: string, payload: unknown, base: number | null, sequence = 1) {
  return {
    ownerUid: UID,
    operation: {
      schemaVersion: 1, operationId: id, entityType: 'library_membership', entityId: 'lib',
      clientSequence: sequence, baseRevision: base, payload,
    },
  };
}
const add = (id: string, ids: readonly string[], base: number | null) => libOp(id, { itemIds: [...ids] }, base);
const remove = (id: string, ids: readonly string[], base: number | null) => libOp(id, { removeItemIds: [...ids] }, base);
const titles = (id: string, entries: readonly unknown[], base: number | null) =>
  libOp(id, { itemTitles: [...entries] }, base);

function apply(store: Store, operations: readonly unknown[]): readonly AccountsV2Receipt[] {
  const result = validateBatch({ batchId: 'b', operations: [...operations] });
  if (!result.ok) throw new Error(`invalid batch ${result.code} ${result.path}`);
  return store.transact((port) => applyBatch(port, UID, result.batch, NOW));
}

describe('Account V2 7C — названия наборов в библиотеке', () => {
  test('название живого id сохраняется в состоянии, ревизия растёт', () => {
    const store = createStore();
    apply(store, [add('op-1', ['b', 'a'], null)]);
    expect(apply(store, [titles('op-2', [['b', 'Бэ', 'Бе', 'Be'], ['a', 'А', '', '']], 1)]))
      .toEqual([{ operationId: 'op-2', outcome: 'applied', serverRevision: 2 }]);
    expect(store.lib()).toEqual({
      items: [['a', 1], ['b', 1]], removed: [], titles: [['a', 'А', '', ''], ['b', 'Бэ', 'Бе', 'Be']],
    });
  });

  test('id и название в одном пакете (как шлёт производитель) — оба применены', () => {
    const store = createStore();
    expect(apply(store, [add('op-1', ['a'], 0), { ...titles('op-2', [['a', 'А', 'А', 'A']], 0) }]).map((r) => r.outcome))
      .toEqual(['applied', 'applied']);
    expect(store.lib()).toEqual({ items: [['a', 1]], removed: [], titles: [['a', 'А', 'А', 'A']] });
  });

  test('название для не живого id не пишется (нет записи, applied)', () => {
    const store = createStore();
    apply(store, [add('op-1', ['a'], null)]);
    const before = store.record();
    expect(apply(store, [titles('op-2', [['ghost', 'Призрак', '', '']], 1)]))
      .toEqual([{ operationId: 'op-2', outcome: 'applied', serverRevision: 1 }]);
    expect(store.record()).toEqual(before);
  });

  test('повтор того же названия — без записи; новое название заменяет старое', () => {
    const store = createStore();
    apply(store, [add('op-1', ['a'], null)]);
    apply(store, [titles('op-2', [['a', 'А', '', '']], 1)]);
    expect(apply(store, [titles('op-3', [['a', 'А', '', '']], 2)])[0]).toMatchObject({ outcome: 'applied', serverRevision: 2 });
    expect(store.revision()).toBe(2);
    apply(store, [titles('op-4', [['a', 'Новое', '', '']], 2)]);
    expect(store.lib().titles).toEqual([['a', 'Новое', '', '']]);
  });

  test('без названий форма состояния прежняя (нет ключа titles) — откат функций безопасен', () => {
    const store = createStore();
    apply(store, [add('op-1', ['a', 'b'], null)]);
    apply(store, [remove('op-2', ['a'], 1)]);
    expect(Object.keys(store.lib()).sort()).toEqual(['items', 'removed']);
  });

  test('удаление id снимает его название; последнее — ключ titles исчезает', () => {
    const store = createStore();
    apply(store, [add('op-1', ['a', 'b'], null)]);
    apply(store, [titles('op-2', [['a', 'А', '', ''], ['b', 'Б', '', '']], 1)]);
    apply(store, [remove('op-3', ['a'], 2)]);
    expect(store.lib().titles).toEqual([['b', 'Б', '', '']]);
    apply(store, [remove('op-4', ['b'], 3)]);
    expect(Object.keys(store.lib()).sort()).toEqual(['items', 'removed']);
    // Повторное добавление — без названия, пока его не пришлют снова.
    apply(store, [add('op-5', ['a'], 4)]);
    expect(store.lib().titles).toBeUndefined();
  });

  test('добавление другого id сохраняет имеющиеся названия', () => {
    const store = createStore();
    apply(store, [add('op-1', ['a'], null)]);
    apply(store, [titles('op-2', [['a', 'А', '', '']], 1)]);
    apply(store, [add('op-3', ['c'], 2)]);
    expect(store.lib().titles).toEqual([['a', 'А', '', '']]);
  });

  test('устаревшая база не мешает названию (не разрушающая правка), база «из будущего» — conflict', () => {
    const store = createStore();
    apply(store, [add('op-1', ['a'], null)]);
    apply(store, [add('op-2', ['b'], 1)]);
    expect(apply(store, [titles('op-3', [['a', 'А', '', '']], 0)])[0]).toMatchObject({ outcome: 'applied', serverRevision: 3 });
    expect(apply(store, [titles('op-4', [['a', 'Б', '', '']], 99)])[0]).toMatchObject({ outcome: 'conflict' });
    expect(store.lib().titles).toEqual([['a', 'А', '', '']]);
  });

  const invalid: readonly [string, unknown][] = [
    ['смешанная операция id + названия', { itemIds: ['a'], itemTitles: [['a', 'А', '', '']] }],
    ['пустой список', { itemTitles: [] }],
    ['не массив', { itemTitles: { a: 'А' } }],
    ['не та длина записи', { itemTitles: [['a', 'А', '']] }],
    ['не строка', { itemTitles: [['a', 1, '', '']] }],
    ['пустой id', { itemTitles: [['', 'А', '', '']] }],
    ['все три пустые', { itemTitles: [['a', '', '', '']] }],
    ['повтор id', { itemTitles: [['a', 'А', '', ''], ['a', 'Б', '', '']] }],
    ['длиннее предела', { itemTitles: [['a', 'я'.repeat(ACCOUNTS_V2_LIBRARY_TITLE_MAX_CHARS + 1), '', '']] }],
    ['больше записей, чем можно', {
      itemTitles: Array.from({ length: ACCOUNTS_V2_LIBRARY_TITLES_MAX_PER_OP + 1 }, (_, index) => [`p${index}`, 'А', '', '']),
    }],
  ];
  test.each(invalid)('отказ payload_invalid: %s; состояние не меняется', (_name, payload) => {
    const store = createStore();
    apply(store, [add('op-1', ['a'], null)]);
    const before = store.record();
    expect(apply(store, [libOp('op-2', payload, 1)])[0]).toMatchObject({ outcome: 'rejected', code: 'payload_invalid' });
    expect(store.record()).toEqual(before);
  });

  test('ровно на пределах — принимается', () => {
    const store = createStore();
    const ids = Array.from({ length: ACCOUNTS_V2_LIBRARY_TITLES_MAX_PER_OP }, (_, index) => `p${String(index).padStart(3, '0')}`);
    apply(store, [add('op-1', ids, null)]);
    const entries = ids.map((id, index) => [id, index === 0 ? 'я'.repeat(ACCOUNTS_V2_LIBRARY_TITLE_MAX_CHARS) : 'А', '', '']);
    expect(apply(store, [titles('op-2', entries, 1)])[0]).toMatchObject({ outcome: 'applied', serverRevision: 2 });
  });

  test('сумма названий сверх бюджета — entity_state_too_large, id и прежние названия целы', () => {
    const store = createStore();
    const ids = Array.from({ length: 400 }, (_, index) => `p${String(index).padStart(3, '0')}`);
    apply(store, [add('op-1', ids, null)]);
    const long = 'я'.repeat(ACCOUNTS_V2_LIBRARY_TITLE_MAX_CHARS);
    let base = 1;
    let rejectedAt = -1;
    for (let chunk = 0; chunk < 4 && rejectedAt < 0; chunk += 1) {
      const entries = ids.slice(chunk * 100, chunk * 100 + 100).map((id) => [id, long, long, long]);
      const [receipt] = apply(store, [titles(`op-t${chunk}`, entries, base)]);
      if (receipt.outcome === 'rejected') {
        expect(receipt).toMatchObject({ code: 'entity_state_too_large' });
        rejectedAt = chunk;
      } else base = receipt.serverRevision;
    }
    expect(rejectedAt).toBeGreaterThanOrEqual(0);
    const lib = store.lib();
    expect((lib.items as unknown[]).length).toBe(400);
    const stored = lib.titles as unknown[] | undefined;
    expect(Buffer.byteLength(JSON.stringify(stored ?? []), 'utf8')).toBeLessThanOrEqual(ACCOUNTS_V2_LIBRARY_TITLES_MAX_BYTES);
  });

  test('бюджет названий меньше предела состояния (место под id и tombstone остаётся)', () => {
    expect(ACCOUNTS_V2_LIBRARY_TITLES_MAX_BYTES * 2).toBeLessThan(ACCOUNTS_V2_MAX_ENTITY_STATE_BYTES);
  });
});

describe('Account V2 7C — загрузчик и сборка мусора', () => {
  const record = (state: unknown, revision = 3) => ({
    entityType: 'library_membership', entityIdJson: JSON.stringify('lib'), revision, updatedAtMs: NOW,
    lastOperationIdJson: JSON.stringify('x'), stateJson: JSON.stringify(state),
  });
  const load = (state: unknown) => loadEntityRecord(record(state), 'library_membership', 'lib');

  test('старая форма и форма с названиями читаются', () => {
    expect(load({ items: [['a', 1]], removed: [] })?.state).toEqual({ items: [['a', 1]], removed: [] });
    expect(load({ items: [['a', 1]], removed: [], titles: [['a', 'А', '', '']] })?.state)
      .toEqual({ items: [['a', 1]], removed: [], titles: [['a', 'А', '', '']] });
  });

  test.each([
    ['название не живого id', { items: [['a', 1]], removed: [['b', 2]], titles: [['b', 'Б', '', '']] }],
    ['пустой titles', { items: [['a', 1]], removed: [], titles: [] }],
    ['повтор', { items: [['a', 1]], removed: [], titles: [['a', 'А', '', ''], ['a', 'А', '', '']] }],
    ['не по порядку', { items: [['a', 1], ['b', 1]], removed: [], titles: [['b', 'Б', '', ''], ['a', 'А', '', '']] }],
    ['длинное', { items: [['a', 1]], removed: [], titles: [['a', 'я'.repeat(ACCOUNTS_V2_LIBRARY_TITLE_MAX_CHARS + 1), '', '']] }],
    ['лишний ключ', { items: [['a', 1]], removed: [], titles: [['a', 'А', '', '']], extra: 1 }],
  ])('порча: %s', (_name, state) => {
    expect(() => load(state)).toThrow('stored_state_corrupt');
  });

  test('у предела байт сборка мусора учитывает названия: старые tombstone вытесняются, добавление проходит', () => {
    const store = createStore();
    const pad = 'x'.repeat(110);
    const removed = Array.from({ length: 1000 }, (_, index) => [`${pad}${String(index).padStart(4, '0')}`, 1]);
    const live = Array.from({ length: 50 }, (_, index) => `live${String(index).padStart(2, '0')}`);
    const titleText = 'я'.repeat(ACCOUNTS_V2_LIBRARY_TITLE_MAX_CHARS);
    const seeded = {
      items: live.map((id) => [id, 1]), removed,
      titles: live.map((id) => [id, titleText, titleText, titleText]),
    };
    const bytes = (state: unknown): number => Buffer.byteLength(JSON.stringify(state), 'utf8') + 1;
    // Без названий состояние помещалось бы; с ними — нет: вытеснять обязана именно сборка мусора.
    expect(bytes({ ...seeded, titles: undefined }) + 2_000).toBeLessThan(ACCOUNTS_V2_MAX_ENTITY_STATE_BYTES);
    expect(bytes(seeded)).toBeGreaterThan(ACCOUNTS_V2_MAX_ENTITY_STATE_BYTES - 1_000);
    store.seed(5, seeded as unknown as JsonValue);
    expect(apply(store, [add('op-1', ['new-1', 'new-2'], 5)])[0]).toMatchObject({ outcome: 'applied', serverRevision: 6 });
    const lib = store.lib();
    expect((lib.removed as unknown[]).length).toBeLessThan(1000);
    expect(lib.titles).toEqual(seeded.titles);
    expect(bytes(lib)).toBeLessThanOrEqual(ACCOUNTS_V2_MAX_ENTITY_STATE_BYTES);
  });

  test('сборка мусора сохраняет названия и считает их байты', () => {
    const state = { items: [['a', 5]], removed: [['z', 1]], titles: [['a', 'А', '', '']] } as unknown as LibraryMembershipState;
    expect(collectLibraryGarbage(state, 5)).toBe(state);
    const merged = mergeLibraryMembership(state, { itemIds: ['b'] }, 5, 6);
    expect(merged).toMatchObject({ ok: true, changed: true });
    if (!merged.ok) throw new Error('unexpected');
    expect((merged.state as unknown as { titles: unknown }).titles).toEqual([['a', 'А', '', '']]);
  });
});

describe('Account V2 7C — паритет констант клиент ↔ сервер', () => {
  const clientPath = path.resolve(__dirname, '../../modules/account-session-v2/account_sync_producer_plan.ts');
  const client = fs.readFileSync(clientPath, 'utf8');

  test('ключ и лимиты совпадают по тексту', () => {
    expect(client).toContain(`export const ACCOUNT_SYNC_LIBRARY_TITLES_KEY = '${ACCOUNTS_V2_LIBRARY_TITLES_KEY}';`);
    expect(client).toContain(`export const ACCOUNT_SYNC_LIBRARY_TITLE_MAX_CHARS = ${ACCOUNTS_V2_LIBRARY_TITLE_MAX_CHARS};`);
    expect(client).toContain(`export const ACCOUNT_SYNC_LIBRARY_TITLES_MAX_PER_OP = ${ACCOUNTS_V2_LIBRARY_TITLES_MAX_PER_OP};`);
  });
});
