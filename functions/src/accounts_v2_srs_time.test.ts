import {
  ACCOUNTS_V2_REJECT_CODES,
  ACCOUNTS_V2_SRS_FIELDS,
  ACCOUNTS_V2_SRS_MAX_FUTURE_SKEW_MS,
  ACCOUNTS_V2_SRS_TIME_KEY,
  applyBatch,
  docIdFor,
  validateBatch,
  type AccountsV2EntityRecord,
  type AccountsV2OpRecord,
  type AccountsV2Receipt,
  type AccountsV2TxPort,
  type JsonValue,
} from './accounts_v2_apply_core';

/*
 * Account V2, Пакет 3S, ремонт №4 — SRS «самый свежий» ПО ВРЕМЕНИ ПРАВКИ на
 * телефоне (решение владельца 2026-09-30, пункт 5).
 *
 * зачем: конверт клиента не меняется — время правки лежит внутри SRS-значения
 * (`updatedAtMs`). Порядок победы: [updatedAtMs, baseRevision, clientSequence,
 * канонический JSON]. Время из будущего дальше допуска — окончательный отказ.
 * Проигравшая запись, чьё значение отличается от сохранённого, — conflict.
 */

const UID = 'user-A';
const NOW = 1_790_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

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
  const card = (): { revision: number; fields: Record<string, any> } => {
    const record = entities.get(docIdFor('flashcard', 'card'));
    if (record === undefined) throw new Error('no card');
    return { revision: record.revision as number, fields: JSON.parse(record.stateJson as string).fields };
  };
  return { transact, card, entitiesJson: (): string => JSON.stringify([...entities].sort()) };
}

type Store = ReturnType<typeof createStore>;

function op(id: string, fields: Record<string, JsonValue>, base: number | null, seq: number) {
  return {
    ownerUid: UID,
    operation: {
      schemaVersion: 1, operationId: id, entityType: 'flashcard', entityId: 'card',
      clientSequence: seq, baseRevision: base, payload: { op: 'upsert', fields },
    },
  };
}

function apply(store: Store, operations: readonly unknown[], now = NOW): readonly AccountsV2Receipt[] {
  const result = validateBatch({ batchId: 'b', operations: [...operations] });
  if (!result.ok) throw new Error(`invalid batch ${result.code} ${result.path}`);
  return store.transact((port) => applyBatch(port, UID, result.batch, now));
}

const srs = (updatedAtMs: number, due: JsonValue) => ({ [ACCOUNTS_V2_SRS_TIME_KEY]: updatedAtMs, due });

/** Карточка на ревизии 5 (как в сценарии ревью). */
function cardAtRevision5(): Store {
  const store = createStore();
  apply(store, [op('seed-1', { front: 'a1' }, null, 1)]);
  for (let revision = 1; revision < 5; revision += 1) {
    apply(store, [op(`seed-${revision + 1}`, { front: `a${revision + 1}` }, revision, revision + 1)]);
  }
  expect(store.card().revision).toBe(5);
  return store;
}

function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [[...items]];
  return items.flatMap((item, index) =>
    permutations([...items.slice(0, index), ...items.slice(index + 1)]).map((rest) => [item, ...rest]));
}

describe('SRS ремонт №4: форма значения', () => {
  test('константы: ключ времени, допуск 10 минут, отдельный код отказа', () => {
    expect(ACCOUNTS_V2_SRS_TIME_KEY).toBe('updatedAtMs');
    expect(ACCOUNTS_V2_SRS_MAX_FUTURE_SKEW_MS).toBe(600_000);
    expect(ACCOUNTS_V2_REJECT_CODES as readonly string[]).toContain('srs_time_in_future');
  });

  test.each([
    ['число вместо объекта', 3],
    ['объект без времени', { due: 1 }],
    ['время строкой', { updatedAtMs: '1790000000000', due: 1 }],
    ['время дробное', { updatedAtMs: 1.5, due: 1 }],
    ['время отрицательное', { updatedAtMs: -1, due: 1 }],
    ['время вне safe integer', { updatedAtMs: 2 ** 53, due: 1 }],
    ['массив', [NOW]],
    ['null', null],
  ])('SRS-значение: %s → payload_invalid, операция не применяется целиком', (_label, value) => {
    for (const field of ACCOUNTS_V2_SRS_FIELDS) {
      const store = createStore();
      apply(store, [op('seed', { front: 'a' }, null, 1)]);
      const before = store.entitiesJson();
      expect(apply(store, [op('bad', { front: 'b', [field]: value as JsonValue }, 1, 2)])).toEqual([{
        operationId: 'bad', outcome: 'rejected', code: 'payload_invalid', serverRevision: 1,
      }]);
      expect(store.entitiesJson()).toBe(before);
    }
  });

  test('отметка хранит время: [updatedAtMs, baseRevision, clientSequence]', () => {
    const store = createStore();
    apply(store, [op('a', { srsPolicy: srs(NOW - 5, 'x') }, null, 7)]);
    expect(store.card().fields.srsPolicy).toEqual({
      value: srs(NOW - 5, 'x'), revision: 1, stamp: [NOW - 5, 0, 7], variants: [],
    });
  });
});

describe('SRS ремонт №4: побеждает более поздняя ПРАВКА', () => {
  // Сценарий ревьюера: A правил вчера офлайн (база 5, seq 900), B — сегодня (база 5, seq 12).
  const offlineA = op('A-900', { srs: srs(NOW - DAY, 'from-A') }, 5, 900);
  const todayB = op('B-12', { srs: srs(NOW - 60_000, 'from-B') }, 5, 12);

  test('офлайн-сценарий: B (сегодня) побеждает A (вчера) в любом порядке прихода', () => {
    for (const order of [[offlineA, todayB], [todayB, offlineA]]) {
      const store = cardAtRevision5();
      for (const operation of order) apply(store, [operation]);
      const { value, stamp, variants } = store.card().fields.srs;
      expect({ value, stamp, variants }).toEqual({
        value: srs(NOW - 60_000, 'from-B'), stamp: [NOW - 60_000, 5, 12], variants: [],
      });
    }
  });

  test('проигравшая запись с другим значением → conflict без записи и вариантов (клиент перечитает)', () => {
    const store = cardAtRevision5();
    expect(apply(store, [todayB])).toEqual([{ operationId: 'B-12', outcome: 'applied', serverRevision: 6 }]);
    const before = store.entitiesJson();
    expect(apply(store, [offlineA])).toEqual([{ operationId: 'A-900', outcome: 'conflict', serverRevision: 6 }]);
    expect(store.entitiesJson()).toBe(before);
    expect(store.card().fields.srs.variants).toEqual([]);
  });

  test('проигравшая запись с ТЕМ ЖЕ значением — applied без изменений', () => {
    const store = cardAtRevision5();
    apply(store, [op('new', { srs: srs(NOW, 'same') }, 5, 2)]);
    const before = store.entitiesJson();
    // Тот же объект (вместе со временем), проигрывает только по clientSequence.
    expect(apply(store, [op('old', { srs: srs(NOW, 'same') }, 5, 1)]))
      .toEqual([{ operationId: 'old', outcome: 'applied', serverRevision: 6 }]);
    expect(store.entitiesJson()).toBe(before);
    // Другое время правки — это уже другое значение: проигравший получает conflict.
    expect(apply(store, [op('older', { srs: srs(NOW - 1, 'same') }, 5, 3)])[0].outcome).toBe('conflict');
    expect(store.entitiesJson()).toBe(before);
  });

  test('проигравшее SRS-поле в операции с другими полями: поля применены, исход conflict', () => {
    const store = cardAtRevision5();
    apply(store, [op('new', { srs: srs(NOW, 'fresh') }, 5, 1)]);
    expect(apply(store, [op('mixed', { back: 'кот', srs: srs(NOW - DAY, 'stale') }, 6, 2)]))
      .toEqual([{ operationId: 'mixed', outcome: 'conflict', serverRevision: 7 }]);
    const { fields } = store.card();
    expect(fields.back).toEqual({ value: 'кот', revision: 7, variants: [] });
    expect(fields.srs.value).toEqual(srs(NOW, 'fresh'));
  });

  test('старая база, но более поздняя правка всё равно побеждает (время главнее ревизии)', () => {
    const store = cardAtRevision5();
    apply(store, [op('seen-5', { srs: srs(NOW - DAY, 'seen') }, 5, 1)]);
    expect(apply(store, [op('base-0', { srs: srs(NOW - 1000, 'later') }, 0, 1)])[0].outcome).toBe('applied');
    expect(store.card().fields.srs.stamp).toEqual([NOW - 1000, 0, 1]);
  });
});

describe('SRS ремонт №4: время из будущего', () => {
  test('ровно на допуске — принимается; на 1 мс дальше — rejected srs_time_in_future без записи', () => {
    const store = cardAtRevision5();
    const before = store.entitiesJson();
    const far = NOW + ACCOUNTS_V2_SRS_MAX_FUTURE_SKEW_MS + 1;
    expect(apply(store, [op('far', { front: 'z', srs: srs(far, 'pin') }, 5, 1)])).toEqual([{
      operationId: 'far', outcome: 'rejected', code: 'srs_time_in_future', serverRevision: 5,
    }]);
    expect(store.entitiesJson()).toBe(before);
    const edge = NOW + ACCOUNTS_V2_SRS_MAX_FUTURE_SKEW_MS;
    expect(apply(store, [op('edge', { srs: srs(edge, 'edge') }, 5, 2)])[0].outcome).toBe('applied');
  });

  test('закрепить значение «навсегда» нельзя: правка после допуска побеждает', () => {
    const store = cardAtRevision5();
    const edge = NOW + ACCOUNTS_V2_SRS_MAX_FUTURE_SKEW_MS;
    apply(store, [op('edge', { srs: srs(edge, 'pinned') }, 5, 1)]);
    const later = NOW + ACCOUNTS_V2_SRS_MAX_FUTURE_SKEW_MS + 1;
    // Через 11 минут реального времени обычная правка свежее закреплённой.
    expect(apply(store, [op('real', { srs: srs(later, 'real') }, 6, 2)], NOW + 11 * 60_000)[0].outcome)
      .toBe('applied');
    expect(store.card().fields.srs.value).toEqual(srs(later, 'real'));
  });

  test('повтор отклонённой операции получает тот же отказ, даже когда время сервера догнало', () => {
    const store = cardAtRevision5();
    const far = op('far', { srs: srs(NOW + DAY, 'pin') }, 5, 1);
    const first = apply(store, [far]);
    expect(apply(store, [far], NOW + 2 * DAY)).toEqual(first);
  });
});

describe('SRS ремонт №4: детерминизм и порядок прихода', () => {
  test('равное время: решает база, затем clientSequence, затем канонический JSON', () => {
    const t = NOW - 10;
    const ops = [
      op('p', { srs: srs(t, 'p') }, 3, 50),
      op('q', { srs: srs(t, 'q') }, 5, 1),
      op('r', { srs: srs(t, 'r') }, 5, 2),
      op('s', { srs: srs(t, 's') }, 5, 2),
    ];
    const finals = permutations(ops).map((order) => {
      const store = cardAtRevision5();
      for (const operation of order) apply(store, [operation]);
      const { value, stamp, variants } = store.card().fields.srs;
      return JSON.stringify({ value, stamp, variants });
    });
    expect(new Set(finals).size).toBe(1);
    expect(JSON.parse(finals[0])).toEqual({ value: srs(t, 's'), stamp: [t, 5, 2], variants: [] });
  });

  test('все 24 перестановки смешанных времён, баз и устройств дают один итог', () => {
    const ops = [
      op('a', { srs: srs(NOW - DAY, 'a') }, 5, 900),
      op('b', { srs: srs(NOW - 60_000, 'b') }, 5, 12),
      op('c', { srs: srs(NOW - 60_000, 'c') }, 2, 99),
      op('d', { srs: srs(NOW - 2 * DAY, 'd'), front: 'x' }, 0, 1),
    ];
    const finals = permutations(ops).map((order) => {
      const store = cardAtRevision5();
      for (const operation of order) apply(store, [operation]);
      const { value, stamp } = store.card().fields.srs;
      return JSON.stringify({ value, stamp });
    });
    expect(finals).toHaveLength(24);
    expect(new Set(finals).size).toBe(1);
    expect(JSON.parse(finals[0])).toEqual({ value: srs(NOW - 60_000, 'b'), stamp: [NOW - 60_000, 5, 12] });
  });

  test('srs и srsPolicy решаются независимо, каждое по своему времени', () => {
    const store = cardAtRevision5();
    apply(store, [op('one', { srs: srs(NOW, 's1'), srsPolicy: srs(NOW - DAY, 'p1') }, 5, 1)]);
    expect(apply(store, [op('two', { srs: srs(NOW - 5, 's2'), srsPolicy: srs(NOW - 5, 'p2') }, 6, 2)]))
      .toEqual([{ operationId: 'two', outcome: 'conflict', serverRevision: 7 }]);
    const { fields } = store.card();
    expect(fields.srs.value).toEqual(srs(NOW, 's1'));
    expect(fields.srsPolicy.value).toEqual(srs(NOW - 5, 'p2'));
  });
});
