import fs from 'fs';
import path from 'path';
import * as storeModule from './accounts_v2_store';
import {
  ACCOUNTS_V2_ENTITY_TYPES,
  ACCOUNTS_V2_INDEX_EXEMPT_FIELDS,
  ACCOUNTS_V2_LIMITS,
  ACCOUNTS_V2_MAX_ENTITY_STATE_BYTES,
  ACCOUNTS_V2_RECEIPT_OUTCOMES,
  ACCOUNTS_V2_REJECT_CODES,
  accountsV2JsonWireBytes,
  applyBatch,
  canonicalJson,
  docIdFor,
  firestoreStringBytes,
  mergeFlashcard,
  mergeLessonProgress,
  mergeLibraryMembership,
  validateBatch,
  type AccountsV2EntityRecord,
  type AccountsV2OpRecord,
  type AccountsV2Receipt,
  type AccountsV2TxPort,
  type JsonValue,
  type ValidatedBatch,
} from './accounts_v2_apply_core';

/*
 * Account V2, Пакет 3S — правила доменов и бюджеты (вынесено из
 * accounts_v2_apply_core.test.ts, чтобы тест-файлы оставались ≤ ~800 строк).
 *
 * зачем: здесь лимиты входа, слияние урока/карточки/библиотеки, SRS по
 * правилу «побеждает самый свежий» (решение владельца 2026-09-30), удаление
 * из библиотеки с защитой от воскрешения и бюджет одной транзакции Firestore.
 * Порт — простой in-memory с коммитом только при успехе; строгий порт с
 * имитацией ограничений Firestore живёт в accounts_v2_apply_core.test.ts.
 */

const UID = 'user-A';
const NOW = 1_790_000_000_000;

type EntityType = 'lesson_progress' | 'flashcard' | 'library_membership';
type Doc = Readonly<Record<string, unknown>>;
type MemoryState = { ops: Map<string, Doc>; entities: Map<string, Doc> };

function createMemoryStore() {
  let committed: MemoryState = { ops: new Map(), entities: new Map() };
  const entityKey = (entityType: EntityType, entityId: string): string =>
    docIdFor(entityType, entityId);

  function transact<T>(fn: (port: AccountsV2TxPort) => T): T {
    const draft: MemoryState = { ops: new Map(committed.ops), entities: new Map(committed.entities) };
    const port: AccountsV2TxPort = {
      getOp: (_uid, opDocId) => (draft.ops.get(opDocId) ?? null) as AccountsV2OpRecord | null,
      getEntity: (_uid, docId) => (draft.entities.get(docId) ?? null) as AccountsV2EntityRecord | null,
      putEntity: (_uid, docId, record) => { draft.entities.set(docId, structuredClone(record) as unknown as Doc); },
      putReceipt: (_uid, opDocId, record) => { draft.ops.set(opDocId, structuredClone(record) as unknown as Doc); },
    };
    const result = fn(port);
    committed = draft;
    return result;
  }

  const entity = (_uid: string, entityType: EntityType, entityId: string): Doc | null =>
    committed.entities.get(entityKey(entityType, entityId)) ?? null;

  return {
    transact,
    entity,
    state: (uid: string, entityType: EntityType, entityId: string): any => {
      const record = entity(uid, entityType, entityId);
      return record === null ? null : JSON.parse(record.stateJson as string);
    },
    seedEntity: (_uid: string, entityType: EntityType, entityId: string, record: Doc): void => {
      committed.entities.set(entityKey(entityType, entityId), structuredClone(record));
    },
    snapshot: (): string => JSON.stringify({
      ops: [...committed.ops].sort(),
      entities: [...committed.entities].sort(),
    }),
  };
}

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

function apply(store: ReturnType<typeof createMemoryStore>, operations: readonly unknown[]): readonly AccountsV2Receipt[] {
  const batch = valid(rawBatch(operations));
  return store.transact((port) => applyBatch(port, UID, batch, NOW));
}

function wireBytes(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), 'utf8');
}

function expectInvalid(raw: unknown, code: string, path: string): void {
  const result = validateBatch(raw);
  expect(result).toEqual({ ok: false, code, path });
}

function sortedJson(value: unknown): string {
  if (typeof value !== 'object' || value === null) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(sortedJson).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${sortedJson((value as Record<string, unknown>)[key])}`).join(',')}}`;
}

describe('validateBatch: каждый лимит ACCOUNT_SYNC_LIMITS', () => {
  test('maxBatchOperations: 50 проходит, 51 отказ', () => {
    const ops = (count: number) => Array.from({ length: count }, (_, index) =>
      rawOp(`op-${index}`, 'flashcard', `c-${index}`, { op: 'tombstone' }));
    expect(validateBatch(rawBatch(ops(ACCOUNTS_V2_LIMITS.maxBatchOperations))).ok).toBe(true);
    expectInvalid(rawBatch(ops(ACCOUNTS_V2_LIMITS.maxBatchOperations + 1)),
      'batch_too_many_operations', '$.operations');
  });

  test('maxOperationIdUtf8Bytes: 160 байт проходит, 161 и многобайтовые 162 — отказ', () => {
    const at = (id: string) => rawBatch([rawOp(id, 'flashcard', 'c', { op: 'tombstone' })]);
    expect(validateBatch(at('a'.repeat(160))).ok).toBe(true);
    expectInvalid(at('a'.repeat(161)), 'operation_id_too_large', '$.operations[0].operation.operationId');
    expect(validateBatch(at('я'.repeat(80))).ok).toBe(true);
    expectInvalid(at('я'.repeat(81)), 'operation_id_too_large', '$.operations[0].operation.operationId');
  });

  test('maxBatchIdUtf8Bytes: 160 проходит, 161 отказ', () => {
    const op = rawOp('op', 'flashcard', 'c', { op: 'tombstone' });
    expect(validateBatch(rawBatch([op], 'b'.repeat(160))).ok).toBe(true);
    expectInvalid(rawBatch([op], 'b'.repeat(161)), 'batch_id_too_large', '$.batchId');
  });

  test('maxPayloadDepth: 32 уровня проходит, 33 отказ', () => {
    const nest = (levels: number): unknown => {
      let value: unknown = 1;
      for (let index = 0; index < levels; index += 1) value = { a: value };
      return value;
    };
    expect(validateBatch(rawBatch([rawOp('op', 'flashcard', 'c', nest(32))])).ok).toBe(true);
    const result = validateBatch(rawBatch([rawOp('op', 'flashcard', 'c', nest(33))]));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('payload_too_deep');
      expect(result.path).toBe(`$.operations[0].operation.payload${'.a'.repeat(32)}`);
    }
  });

  test('maxPayloadNodes: 4096 узлов проходит, 4097 отказ', () => {
    const nodes = (count: number) => Array.from({ length: count - 1 }, () => 0);
    expect(validateBatch(rawBatch([rawOp('op', 'flashcard', 'c', nodes(4096))])).ok).toBe(true);
    expectInvalid(rawBatch([rawOp('op', 'flashcard', 'c', nodes(4097))]),
      'payload_too_many_nodes', '$.operations[0].operation.payload');
  });

  test('maxEnvelopeUtf8Bytes: ровно 131072 байта проходит, +1 отказ', () => {
    const base = rawOp('op', 'flashcard', 'c', '');
    const baseBytes = wireBytes(base.operation);
    const fill = ACCOUNTS_V2_LIMITS.maxEnvelopeUtf8Bytes - baseBytes;
    const exact = rawOp('op', 'flashcard', 'c', 'x'.repeat(fill));
    expect(wireBytes(exact.operation)).toBe(ACCOUNTS_V2_LIMITS.maxEnvelopeUtf8Bytes);
    expect(validateBatch(rawBatch([exact])).ok).toBe(true);
    expectInvalid(rawBatch([rawOp('op', 'flashcard', 'c', 'x'.repeat(fill + 1))]),
      'envelope_too_large', '$.operations[0].operation');
    // Многобайтовый UTF-8 и экранирование JSON считаются как на клиенте.
    const cyr = rawOp('op', 'flashcard', 'c', 'я'.repeat(Math.floor(fill / 2) + 1));
    expect(wireBytes(cyr.operation)).toBeGreaterThan(ACCOUNTS_V2_LIMITS.maxEnvelopeUtf8Bytes);
    expectInvalid(rawBatch([cyr]), 'envelope_too_large', '$.operations[0].operation');
  });

  test('maxBatchUtf8Bytes: ровно 524288 байт проходит, +1 отказ', () => {
    const count = 5;
    const build = (sizes: readonly number[]) => rawBatch(sizes.map((size, index) =>
      rawOp(`op-${index}`, 'flashcard', `c-${index}`, 'x'.repeat(size))));
    const emptyBytes = wireBytes(build(Array.from({ length: count }, () => 0)));
    const extra = ACCOUNTS_V2_LIMITS.maxBatchUtf8Bytes - emptyBytes;
    const sizes = Array.from({ length: count }, (_, index) =>
      Math.floor(extra / count) + (index < extra % count ? 1 : 0));
    const exact = build(sizes);
    expect(wireBytes(exact)).toBe(ACCOUNTS_V2_LIMITS.maxBatchUtf8Bytes);
    expect(validateBatch(exact).ok).toBe(true);
    const over = build(sizes.map((size, index) => (index === 0 ? size + 1 : size)));
    expectInvalid(over, 'batch_too_large', '$');
  });
});

describe('ревизия у предела MAX_SAFE_INTEGER', () => {
  test('переполнение ревизии → rejected revision_overflow, ничего не записано', () => {
    const store = createMemoryStore();
    store.seedEntity(UID, 'flashcard', 'card', {
      entityType: 'flashcard', entityIdJson: JSON.stringify('card'), revision: Number.MAX_SAFE_INTEGER,
      updatedAtMs: NOW, lastOperationIdJson: JSON.stringify('seed'),
      stateJson: JSON.stringify({ deleted: false, fields: { front: { revision: 1, value: 'a', variants: [] } } }),
    });
    const before = store.snapshot();
    const receipts = apply(store, [
      rawOp('op-1', 'flashcard', 'card', { op: 'upsert', fields: { front: 'b' } }, Number.MAX_SAFE_INTEGER),
    ]);
    expect(receipts).toEqual([{
      operationId: 'op-1', outcome: 'rejected', code: 'revision_overflow', serverRevision: Number.MAX_SAFE_INTEGER,
    }]);
    expect(store.entity(UID, 'flashcard', 'card')).toEqual(JSON.parse(before).entities[0][1]);
  });
});

describe('validateBatch: неожиданный сбой пишет лог без данных', () => {
  test('прокси бросает — invalid_value, в логе только имя ошибки', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const hostile = new Proxy({}, {
        ownKeys() { throw new TypeError('секрет-123'); },
      });
      const op = rawOp('op-1', 'flashcard', 'card', hostile);
      expectInvalid(rawBatch([op]), 'invalid_value', '$');
      const logged = warn.mock.calls.map((args) => args.map(String).join(' ')).join('\n');
      expect(logged).toContain('[ACCOUNTS-V2-CORE]');
      expect(logged).toContain('TypeError');
      expect(logged).not.toContain('секрет');
    } finally {
      warn.mockRestore();
    }
  });

  test('огромный ключ-идентификатор в пути отказа усечён', () => {
    const op = rawOp('op-1', 'flashcard', 'card', { ['k'.repeat(5000)]: Infinity });
    const result = validateBatch(rawBatch([op]));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('number_not_finite');
      expect(result.path.length).toBeLessThan(200);
    }
  });
});

describe('lesson_progress: D66', () => {
  test('результат хуже сохранённого не меняет лучший результат', () => {
    const store = createMemoryStore();
    apply(store, [rawOp('op-1', 'lesson_progress', 'l01', { passed: true, score: 90, stars: 3 })]);
    const receipts = apply(store, [rawOp('op-2', 'lesson_progress', 'l01', { passed: false, score: 95 }, 0)]);
    expect(receipts).toEqual([{ operationId: 'op-2', outcome: 'applied', serverRevision: 1 }]);
    expect(store.state(UID, 'lesson_progress', 'l01')).toEqual({
      best: { passed: true, score: 90, stars: 3 },
    });
    const lower = apply(store, [rawOp('op-3', 'lesson_progress', 'l01', { passed: true, score: 10 }, 1)]);
    expect(lower[0].serverRevision).toBe(1);
  });

  test('сервер не пересчитывает pass/score: хранит присланное как есть', () => {
    const result = mergeLessonProgress(null, { passed: true, score: 1, weird: 'клиент решил' });
    expect(result).toEqual({
      ok: true, changed: true, state: { best: { passed: true, score: 1, weird: 'клиент решил' } },
    });
  });

  test('устаревший baseRevision урока не отклоняется (D66), лучший сохраняется', () => {
    const store = createMemoryStore();
    apply(store, [rawOp('op-1', 'lesson_progress', 'l01', { passed: false, score: 40 })]);
    apply(store, [rawOp('op-2', 'lesson_progress', 'l01', { passed: false, score: 60 }, 1)]);
    const receipts = apply(store, [rawOp('op-3', 'lesson_progress', 'l01', { passed: true, score: 55 }, 0)]);
    expect(receipts).toEqual([{ operationId: 'op-3', outcome: 'applied', serverRevision: 3 }]);
    expect(store.state(UID, 'lesson_progress', 'l01').best).toEqual({ passed: true, score: 55 });
  });

  test('payload без passed/score → rejected payload_invalid, без записи сущности', () => {
    const store = createMemoryStore();
    const receipts = apply(store, [rawOp('op-1', 'lesson_progress', 'l01', { score: '90' })]);
    expect(receipts).toEqual([{
      operationId: 'op-1', outcome: 'rejected', code: 'payload_invalid', serverRevision: 0,
    }]);
    expect(store.entity(UID, 'lesson_progress', 'l01')).toBeNull();
  });
});

describe('flashcard: слияние', () => {
  test('непересекающиеся поля сливаются', () => {
    const store = createMemoryStore();
    apply(store, [rawOp('op-1', 'flashcard', 'card', { op: 'upsert', fields: { front: 'a', back: 'b' } })]);
    apply(store, [rawOp('op-2', 'flashcard', 'card', { op: 'upsert', fields: { front: 'A' } }, 1)]);
    const receipts = apply(store, [
      rawOp('op-3', 'flashcard', 'card', { op: 'upsert', fields: { back: 'B' } }, 1),
    ]);
    expect(receipts).toEqual([{ operationId: 'op-3', outcome: 'applied', serverRevision: 3 }]);
    const state = store.state(UID, 'flashcard', 'card');
    expect(state.fields.front).toEqual({ value: 'A', revision: 2, variants: [] });
    expect(state.fields.back).toEqual({ value: 'B', revision: 3, variants: [] });
  });

  test('два варианта одного поля сохраняются оба', () => {
    const result = mergeFlashcard(
      { deleted: false, fields: { front: { value: 'dog', revision: 2, variants: [] } } },
      { op: 'upsert', fields: { front: 'puppy' } },
      1,
      3,
      1,
      NOW,
    );
    expect(result).toEqual({
      ok: true, changed: true, conflict: true,
      state: { deleted: false, fields: { front: { value: 'dog', revision: 3, variants: ['puppy'] } } },
    });
  });

  test('P1: вариант повышает ревизию поля — конкурент со старым base не затирает вариант', () => {
    const store = createMemoryStore();
    apply(store, [rawOp('op-1', 'flashcard', 'card', { op: 'upsert', fields: { front: 'cat' } })]);
    apply(store, [rawOp('op-2', 'flashcard', 'card', { op: 'upsert', fields: { front: 'Cat' } }, 1)]);
    // Устройство C видело ревизию 1: его значение уходит в варианты, сущность → 3.
    const fromC = apply(store, [
      rawOp('op-c', 'flashcard', 'card', { op: 'upsert', fields: { front: 'kitten' } }, 1),
    ]);
    expect(fromC).toEqual([{ operationId: 'op-c', outcome: 'conflict', serverRevision: 3 }]);
    expect(store.state(UID, 'flashcard', 'card').fields.front)
      .toEqual({ value: 'Cat', revision: 3, variants: ['kitten'] });
    // Устройство B видело ревизию 2 — но не вариант kitten. Затирать нельзя.
    const fromB = apply(store, [
      rawOp('op-b', 'flashcard', 'card', { op: 'upsert', fields: { front: 'CAT' } }, 2),
    ]);
    expect(fromB).toEqual([{ operationId: 'op-b', outcome: 'conflict', serverRevision: 4 }]);
    expect(store.state(UID, 'flashcard', 'card').fields.front)
      .toEqual({ value: 'Cat', revision: 4, variants: ['kitten', 'CAT'] });
  });

  test('P1: присылка того же значения или нового при актуальном base не сбрасывает варианты', () => {
    const store = createMemoryStore();
    apply(store, [rawOp('op-1', 'flashcard', 'card', { op: 'upsert', fields: { front: 'cat' } })]);
    apply(store, [rawOp('op-2', 'flashcard', 'card', { op: 'upsert', fields: { front: 'Cat' } }, 1)]);
    apply(store, [rawOp('op-3', 'flashcard', 'card', { op: 'upsert', fields: { front: 'kitten' } }, 1)]);
    const same = apply(store, [rawOp('op-4', 'flashcard', 'card', { op: 'upsert', fields: { front: 'Cat' } }, 3)]);
    expect(same).toEqual([{ operationId: 'op-4', outcome: 'applied', serverRevision: 3 }]);
    expect(store.state(UID, 'flashcard', 'card').fields.front)
      .toEqual({ value: 'Cat', revision: 3, variants: ['kitten'] });
    const next = apply(store, [rawOp('op-5', 'flashcard', 'card', { op: 'upsert', fields: { front: 'Dog' } }, 3)]);
    expect(next).toEqual([{ operationId: 'op-5', outcome: 'applied', serverRevision: 4 }]);
    expect(store.state(UID, 'flashcard', 'card').fields.front)
      .toEqual({ value: 'Dog', revision: 4, variants: ['kitten'] });
    // Значение из вариантов, выбранное как основное, уходит из вариантов — не дублируется.
    apply(store, [rawOp('op-6', 'flashcard', 'card', { op: 'upsert', fields: { front: 'kitten' } }, 4)]);
    expect(store.state(UID, 'flashcard', 'card').fields.front)
      .toEqual({ value: 'kitten', revision: 5, variants: [] });
  });

  test('conflict на операции из нескольких полей: непересекающиеся поля применены', () => {
    const store = createMemoryStore();
    apply(store, [rawOp('op-1', 'flashcard', 'card', { op: 'upsert', fields: { front: 'cat' } })]);
    apply(store, [rawOp('op-2', 'flashcard', 'card', { op: 'upsert', fields: { front: 'Cat' } }, 1)]);
    const receipts = apply(store, [
      rawOp('op-3', 'flashcard', 'card', { op: 'upsert', fields: { front: 'kitten', back: 'кот' } }, 1),
    ]);
    expect(receipts).toEqual([{ operationId: 'op-3', outcome: 'conflict', serverRevision: 3 }]);
    const state = store.state(UID, 'flashcard', 'card');
    expect(state.fields.back).toEqual({ value: 'кот', revision: 3, variants: [] });
    expect(state.fields.front).toEqual({ value: 'Cat', revision: 3, variants: ['kitten'] });
  });

  test('устаревший tombstone — не конфликт: удаление применяется', () => {
    const store = createMemoryStore();
    apply(store, [rawOp('op-1', 'flashcard', 'card', { op: 'upsert', fields: { front: 'a' } })]);
    apply(store, [rawOp('op-2', 'flashcard', 'card', { op: 'upsert', fields: { front: 'b' } }, 1)]);
    const receipts = apply(store, [rawOp('op-3', 'flashcard', 'card', { op: 'tombstone' }, 1)]);
    expect(receipts).toEqual([{ operationId: 'op-3', outcome: 'applied', serverRevision: 3 }]);
    expect(store.state(UID, 'flashcard', 'card')).toEqual({ deleted: true, fields: {} });
  });

  test('tombstone главнее позднего update', () => {
    const store = createMemoryStore();
    apply(store, [rawOp('op-1', 'flashcard', 'card', { op: 'upsert', fields: { front: 'a' } })]);
    apply(store, [rawOp('op-2', 'flashcard', 'card', { op: 'tombstone' }, 1)]);
    const receipts = apply(store, [
      rawOp('op-3', 'flashcard', 'card', { op: 'upsert', fields: { front: 'late' } }, 2),
    ]);
    expect(receipts).toEqual([{ operationId: 'op-3', outcome: 'conflict', serverRevision: 2 }]);
    expect(store.state(UID, 'flashcard', 'card')).toEqual({ deleted: true, fields: {} });
  });

  test('неизвестное поле карточки и SRS-поле хранятся байт-в-байт', () => {
    const store = createMemoryStore();
    const unknownField = { 'z': 1, 'a': [0.1, -2e-7, 'ü 😀'], 'nested': { '_proto_': 'x', 'b': null } };
    const srs = { updatedAtMs: NOW - 1, dueAtMs: 1790000000000, intervalDays: 3.5, ease: 2.35, history: [1, 0, 1] };
    apply(store, [rawOp('op-1', 'flashcard', 'card', {
      op: 'upsert', fields: { customExtra: unknownField, srs },
    })]);
    const state = store.state(UID, 'flashcard', 'card');
    expect(sortedJson(state.fields.customExtra.value)).toBe(sortedJson(unknownField));
    expect(state.fields.customExtra.value).toEqual(unknownField);
    expect(state.fields.srs.value).toEqual(srs);
  });

  test('неверная форма payload карточки → payload_invalid', () => {
    expect(mergeFlashcard(null, { op: 'upsert', fields: {} }, 0, 1, 1, NOW))
      .toEqual({ ok: false, code: 'payload_invalid' });
    expect(mergeFlashcard(null, { op: 'merge', fields: { a: 1 } }, 0, 1, 1, NOW))
      .toEqual({ ok: false, code: 'payload_invalid' });
  });
});

// SRS по времени правки и библиотека (порядок прихода, сборка мусора tombstone) —
// в accounts_v2_srs_time.test.ts и accounts_v2_library_order.test.ts (ремонт №4).

describe('P1: бюджет одной транзакции Firestore (≤ 10 МиБ, цель 9,5 МиБ)', () => {
  const MIB = 1024 * 1024;
  const fsString = (text: string): number => Buffer.byteLength(text, 'utf8') + 1;
  const maxOf = (items: readonly string[]): number => Math.max(...items.map(fsString));
  // Имя документа users/{uid ≤ 128}/…/{64 hex} с запасом до 1 КБ, плюс 32 служебных байта документа.
  const DOC_OVERHEAD = 1024 + 32;
  const INT = 8;
  const maxOpIdJson = ACCOUNTS_V2_LIMITS.maxOperationIdUtf8Bytes + 2 + 1;

  test('инвариант из констант: 50 × (состояние + op-запись + накладные) + все entityId < 9,5 МиБ', () => {
    const entityDocWithoutId = DOC_OVERHEAD
      + fsString('entityType') + maxOf(ACCOUNTS_V2_ENTITY_TYPES)
      + fsString('entityIdJson')
      + fsString('revision') + INT
      + fsString('updatedAtMs') + INT
      + fsString('lastOperationIdJson') + maxOpIdJson
      + fsString('stateJson') + ACCOUNTS_V2_MAX_ENTITY_STATE_BYTES;
    const opDoc = DOC_OVERHEAD
      + fsString('operationIdJson') + maxOpIdJson
      + fsString('fingerprint') + fsString('f'.repeat(64))
      + fsString('receipt')
      + fsString('outcome') + maxOf(ACCOUNTS_V2_RECEIPT_OUTCOMES)
      + fsString('code') + maxOf(ACCOUNTS_V2_REJECT_CODES)
      + fsString('serverRevision') + INT
      + fsString('recordedAtMs') + INT;
    // Каждый entityId лежит в конверте пакета, а JSON-строка id весит ровно его wire-байты:
    // сумма entityIdJson по пакету ≤ maxBatchUtf8Bytes (+1 байт Firestore на строку).
    const entityIdsTotal = ACCOUNTS_V2_LIMITS.maxBatchUtf8Bytes + ACCOUNTS_V2_LIMITS.maxBatchOperations;
    const worst = ACCOUNTS_V2_LIMITS.maxBatchOperations * (entityDocWithoutId + opDoc) + entityIdsTotal;
    expect(worst).toBeLessThan(9.5 * MIB);
    expect(worst).toBeLessThan(10 * MIB);
    expect(ACCOUNTS_V2_MAX_ENTITY_STATE_BYTES).toBe(180_000);
  });

  test('JSON-строка entityId весит ровно его wire-байты (основа суммы entityId по пакету)', () => {
    for (const id of ['a', 'я😀', 'x\uD800', 'a\u0001"\\\n', ' ']) {
      expect(accountsV2JsonWireBytes(id)).toBe(Buffer.byteLength(JSON.stringify(id), 'utf8'));
    }
  });
});

describe('P3: адаптер, экспорт и кодирование', () => {
  test('исключения из индексов покрывают все *Json-поля записей и отпечаток', () => {
    const store = createMemoryStore();
    apply(store, [rawOp('op-1', 'flashcard', 'card', { op: 'upsert', fields: { front: 'a' } })]);
    const snapshot = JSON.parse(store.snapshot());
    const recordKeys = [...snapshot.ops, ...snapshot.entities].flatMap(([, record]) => Object.keys(record));
    const expected = [...new Set(recordKeys.filter((key) => key.endsWith('Json') || key === 'fingerprint'))].sort();
    expect([...ACCOUNTS_V2_INDEX_EXEMPT_FIELDS].sort()).toEqual(expected);
    expect(expected).toEqual(['entityIdJson', 'fingerprint', 'lastOperationIdJson', 'operationIdJson', 'stateJson']);
  });

  test('apply_core экспортирует публичный API поимённо, без export *', () => {
    const source = fs.readFileSync(path.join(__dirname, 'accounts_v2_apply_core.ts'), 'utf8');
    expect(source).not.toMatch(/export\s*\*/);
  });

  test('состояние сущности кодируется один раз — итоговое, а не после каждой операции', () => {
    const spy = jest.spyOn(storeModule, 'encodeState');
    try {
      const store = createMemoryStore();
      apply(store, [
        ...Array.from({ length: 5 }, (_, index) =>
          rawOp(`a-${index}`, 'flashcard', 'card', { op: 'upsert', fields: { [`f${index}`]: index } }, 0, UID, index)),
        rawOp('b-0', 'library_membership', 'lib', { itemIds: ['x'] }),
        rawOp('b-1', 'library_membership', 'lib', { removeItemIds: ['x'] }),
      ]);
      expect(spy).toHaveBeenCalledTimes(2);
      expect(Object.keys(store.state(UID, 'flashcard', 'card').fields)).toHaveLength(5);
    } finally {
      spy.mockRestore();
    }
  });

  test('размер состояния без построения строки = байты канонического JSON по формуле Firestore', () => {
    const states: readonly JsonValue[] = [
      { items: [['a\u0001', 1], ['b\uD800', 3], ['я😀', 1]], removed: [['"q"', 2]] },
      { deleted: false, fields: { 'k\n': { revision: 1, value: [1e21, -0, 0.1, null, true], variants: [] } } },
    ];
    for (const state of states) {
      expect(storeModule.stateFirestoreBytes(state)).toBe(firestoreStringBytes(canonicalJson(state)));
    }
  });
});

describe('SEC P1-2: предел состояния по формуле Firestore (байты UTF-8 + 1)', () => {
  const LIMIT = ACCOUNTS_V2_MAX_ENTITY_STATE_BYTES;
  const storedBytes = (text: string): number => Buffer.byteLength(text, 'utf8') + 1;
  const CHUNK = 25_000;

  function prefilled(): Readonly<{ store: ReturnType<typeof createMemoryStore>; fill: number }> {
    const store = createMemoryStore();
    for (let index = 0; index < 7; index += 1) {
      const receipts = apply(store, [rawOp(`fill-${index}`, 'flashcard', 'big', {
        op: 'upsert', fields: { [`f${index}`]: 'x'.repeat(CHUNK) },
      }, index)]);
      expect(receipts[0].outcome).toBe('applied');
    }
    const current = storedBytes(store.entity(UID, 'flashcard', 'big')?.stateJson as string);
    // Новое поле в каноническом JSON: `,"last":{"revision":8,"value":"…","variants":[]}`.
    const entryBytes = Buffer.byteLength(JSON.stringify({ last: { revision: 8, value: '', variants: [] } }), 'utf8') - 2 + 1;
    return { store, fill: LIMIT - current - entryBytes };
  }

  const lastOp = (id: string, value: string) =>
    rawOp(id, 'flashcard', 'big', { op: 'upsert', fields: { last: value } }, 7);

  test('константа — 180 000 байт, и худший документ всё равно влезает в 1 МиБ Firestore', () => {
    expect(LIMIT).toBe(180_000);
    // Худший случай: entityId во весь конверт, максимальный operationId, состояние на пределе.
    const entityIdJson = JSON.stringify('z'.repeat(ACCOUNTS_V2_LIMITS.maxEnvelopeUtf8Bytes));
    const lastOperationIdJson = JSON.stringify('o'.repeat(ACCOUNTS_V2_LIMITS.maxOperationIdUtf8Bytes));
    const fields: Record<string, number> = {
      entityType: storedBytes('library_membership'),
      entityIdJson: storedBytes(entityIdJson),
      revision: 8,
      updatedAtMs: 8,
      lastOperationIdJson: storedBytes(lastOperationIdJson),
      stateJson: LIMIT,
    };
    const fieldBytes = Object.entries(fields).reduce((total, [name, size]) => total + storedBytes(name) + size, 0);
    // Имя документа: users/{uid ≤ 128}/…/{64 hex} с запасом 1 КБ, плюс 32 байта служебных.
    const documentBytes = fieldBytes + 1024 + 32;
    expect(documentBytes).toBeLessThanOrEqual(1_048_576);
  });

  test('ровно на пределе проходит, +1 байт — entity_state_too_large без записи', () => {
    const { store, fill } = prefilled();
    expect(fill).toBeGreaterThan(0);
    expect(fill).toBeLessThan(ACCOUNTS_V2_LIMITS.maxEnvelopeUtf8Bytes - 200);
    const before = store.snapshot();
    expect(apply(store, [lastOp('over', 'x'.repeat(fill + 1))])).toEqual([{
      operationId: 'over', outcome: 'rejected', code: 'entity_state_too_large', serverRevision: 7,
    }]);
    expect(JSON.parse(store.snapshot()).entities).toEqual(JSON.parse(before).entities);
    expect(apply(store, [lastOp('exact', 'x'.repeat(fill))]))
      .toEqual([{ operationId: 'exact', outcome: 'applied', serverRevision: 8 }]);
    expect(storedBytes(store.entity(UID, 'flashcard', 'big')?.stateJson as string)).toBe(LIMIT);
  });

  test('многобайтовые символы считаются в байтах UTF-8, а не в единицах UTF-16', () => {
    const { store, fill } = prefilled();
    const half = Math.floor(fill / 2);
    const exact = `${'я'.repeat(half)}${'x'.repeat(fill - 2 * half)}`;
    const over = `${exact}x`;
    expect(Buffer.byteLength(over, 'utf8')).toBe(fill + 1);
    expect(over.length).toBeLessThan(fill);
    expect(apply(store, [lastOp('over', over)])[0]).toEqual({
      operationId: 'over', outcome: 'rejected', code: 'entity_state_too_large', serverRevision: 7,
    });
    expect(apply(store, [lastOp('exact', exact)])[0].outcome).toBe('applied');
    expect(storedBytes(store.entity(UID, 'flashcard', 'big')?.stateJson as string)).toBe(LIMIT);
  });
});

describe('library_membership: объединение без права/покупки', () => {
  test('объединение ID, никаких полей покупки или права', () => {
    const store = createMemoryStore();
    apply(store, [rawOp('op-1', 'library_membership', 'lib', { itemIds: ['b', 'a'] })]);
    const receipts = apply(store, [rawOp('op-2', 'library_membership', 'lib', { itemIds: ['c', 'a'] }, 0)]);
    expect(receipts).toEqual([{ operationId: 'op-2', outcome: 'applied', serverRevision: 2 }]);
    const state = store.state(UID, 'library_membership', 'lib');
    expect(state).toEqual({ items: [['a', 1], ['b', 1], ['c', 2]], removed: [] });
    expect(Object.keys(state)).toEqual(['items', 'removed']);
    const text = JSON.stringify(store.snapshot());
    for (const forbidden of ['purchase', 'entitle', 'premium', 'paid', 'owned', 'right']) {
      expect(text.toLowerCase()).not.toContain(forbidden);
    }
  });

  test('payload с полем покупки → payload_invalid, право не выводится', () => {
    expect(mergeLibraryMembership(null, { itemIds: ['a'], purchased: true }, 0, 1))
      .toEqual({ ok: false, code: 'payload_invalid' });
    expect(mergeLibraryMembership({ items: [['a', 1]], removed: [] }, { itemIds: ['a'] }, 1, 2))
      .toEqual({ ok: true, changed: false, conflict: false, state: { items: [['a', 1]], removed: [] } });
    expect(mergeLibraryMembership(null, { itemIds: ['a', ''] }, 0, 1))
      .toEqual({ ok: false, code: 'payload_invalid' });
  });

  test('id предметов с управляющими символами и суррогатами принимаются и round-trip', () => {
    const store = createMemoryStore();
    expect(apply(store, [rawOp('op-1', 'library_membership', 'lib', { itemIds: ['a\u0001', 'b\uD800'] })]))
      .toEqual([{ operationId: 'op-1', outcome: 'applied', serverRevision: 1 }]);
    expect(store.state(UID, 'library_membership', 'lib')).toEqual({ items: [['a\u0001', 1], ['b\uD800', 1]], removed: [] });
  });
});