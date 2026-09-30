import {
  ACCOUNTS_V2_CLIENT_OPERATION_KEYS,
  ACCOUNTS_V2_LIMITS,
  ACCOUNTS_V2_OPERATION_MAX_AGE_MS,
  ACCOUNTS_V2_OPERATION_MAX_FUTURE_SKEW_MS,
  ACCOUNTS_V2_REJECT_CODES,
  accountsV2JsonWireBytes,
  applyBatch,
  docIdFor,
  opDocIdFor,
  validateBatch,
  validateClientBatch,
  type AccountsV2EntityRecord,
  type AccountsV2OpRecord,
  type AccountsV2Receipt,
  type AccountsV2TxPort,
  type JsonValue,
} from './accounts_v2_apply_core';

/*
 * Account V2 — серверная проверка возраста операции (TG-DFA918464DFA).
 *
 * зачем: операция, пролежавшая в outbox телефона дольше 170 суток по часам
 * СЕРВЕРА (часы телефона были сбиты вперёд и потом исправлены), могла прийти
 * после истечения TTL квитанции (180 суток) и примениться второй раз. Клиент
 * кладёт в каждую операцию оценку `enqueuedAtServerMs`; сервер отказывает
 * старше 170 суток (`operation_expired`) и дальше 10 минут в будущем
 * (`operation_time_in_future`) — поштучно, без записи квитанции.
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
  return {
    transact,
    hasReceipt: (operationId: string): boolean => ops.has(opDocIdFor(operationId)),
    hasLesson: (entityId: string): boolean => entities.has(docIdFor('lesson_progress', entityId)),
    dropReceipt: (operationId: string): void => { ops.delete(opDocIdFor(operationId)); },
  };
}

type Store = ReturnType<typeof createStore>;

function envelope(id: string, entityId = 'l01', payload: JsonValue = { passed: true, score: 3 }) {
  return {
    schemaVersion: 1, operationId: id, entityType: 'lesson_progress', entityId,
    clientSequence: 1, baseRevision: null, payload,
  };
}

function stamped(id: string, enqueuedAtServerMs: unknown, entityId = id) {
  return { ownerUid: UID, operation: envelope(id, entityId), enqueuedAtServerMs };
}

function apply(store: Store, operations: readonly unknown[], now = NOW): readonly AccountsV2Receipt[] {
  const result = validateClientBatch({ batchId: 'b', operations: [...operations] });
  if (!result.ok) throw new Error(`invalid batch ${result.code} ${result.path}`);
  return store.transact((port) => applyBatch(port, UID, result.batch, now));
}

describe('Account V2: возраст операции по часам сервера', () => {
  test('константы: 170 суток (запас 10 суток до TTL квитанций 180), будущее — 10 минут, коды отказа', () => {
    expect(ACCOUNTS_V2_OPERATION_MAX_AGE_MS).toBe(170 * DAY);
    expect(ACCOUNTS_V2_OPERATION_MAX_FUTURE_SKEW_MS).toBe(10 * 60 * 1000);
    expect(ACCOUNTS_V2_REJECT_CODES).toEqual(expect.arrayContaining(['operation_expired', 'operation_time_in_future']));
    expect(ACCOUNTS_V2_CLIENT_OPERATION_KEYS).toEqual(['ownerUid', 'operation', 'enqueuedAtServerMs']);
  });

  describe('проверка входа клиента', () => {
    test('без enqueuedAtServerMs — missing_field (весь пакет)', () => {
      const result = validateClientBatch({ batchId: 'b', operations: [{ ownerUid: UID, operation: envelope('a') }] });
      expect(result).toEqual({ ok: false, code: 'missing_field', path: '$.operations[0].enqueuedAtServerMs' });
    });

    test.each([
      ['строка', '123', 'invalid_type'],
      ['null', null, 'invalid_type'],
      ['отрицательное', -1, 'invalid_value'],
      ['дробное', 1.5, 'invalid_value'],
      ['больше safe integer', Number.MAX_SAFE_INTEGER + 1, 'invalid_value'],
      ['NaN', Number.NaN, 'invalid_value'],
    ] as const)('%s — %s', (_label, value, code) => {
      const result = validateClientBatch({ batchId: 'b', operations: [stamped('a', value)] });
      expect(result).toEqual({ ok: false, code, path: '$.operations[0].enqueuedAtServerMs' });
    });

    test('лишнее поле рядом — unknown_field', () => {
      const result = validateClientBatch({ batchId: 'b', operations: [{ ...stamped('a', NOW), extra: 1 }] });
      expect(result).toEqual({ ok: false, code: 'unknown_field', path: '$.operations[0].extra' });
    });

    test('оценка сохраняется в проверенном пакете и не входит в конверт', () => {
      const result = validateClientBatch({ batchId: 'b', operations: [stamped('a', NOW - 5)] });
      if (!result.ok) throw new Error(result.code);
      expect(result.batch.operations[0]).toEqual({ ownerUid: UID, operation: envelope('a', 'a'), enqueuedAtServerMs: NOW - 5 });
      expect(Object.keys(result.batch.operations[0].operation)).not.toContain('enqueuedAtServerMs');
    });

    test('серверный пакет (миграция) поле не принимает — callable с ним отклонил бы любой пакет клиента', () => {
      expect(validateBatch({ batchId: 'b', operations: [stamped('a', NOW)] }))
        .toEqual({ ok: false, code: 'unknown_field', path: '$.operations[0].enqueuedAtServerMs' });
    });

    test('байты оценки не считаются в лимиты (сервер не строже клиента)', () => {
      const base = envelope('a', 'l01', { score: '' });
      const pad = ACCOUNTS_V2_LIMITS.maxEnvelopeUtf8Bytes - accountsV2JsonWireBytes(base as unknown as JsonValue);
      const atLimit = envelope('a', 'l01', { score: 'z'.repeat(pad) });
      expect(accountsV2JsonWireBytes(atLimit as unknown as JsonValue)).toBe(ACCOUNTS_V2_LIMITS.maxEnvelopeUtf8Bytes);
      expect(validateClientBatch({ batchId: 'b', operations: [{ ownerUid: UID, operation: atLimit, enqueuedAtServerMs: NOW }] }).ok)
        .toBe(true);
      const over = envelope('a', 'l01', { score: 'z'.repeat(pad + 1) });
      expect(validateClientBatch({ batchId: 'b', operations: [{ ownerUid: UID, operation: over, enqueuedAtServerMs: NOW }] }))
        .toEqual({ ok: false, code: 'envelope_too_large', path: '$.operations[0].operation' });
    });
  });

  describe('отказ по возрасту', () => {
    test('ровно 170 суток — применяется; на 1 мс старше — operation_expired без записи', () => {
      const store = createStore();
      const receipts = apply(store, [
        stamped('edge', NOW - ACCOUNTS_V2_OPERATION_MAX_AGE_MS),
        stamped('old', NOW - ACCOUNTS_V2_OPERATION_MAX_AGE_MS - 1),
      ]);
      expect(receipts).toEqual([
        { operationId: 'edge', outcome: 'applied', serverRevision: 1 },
        { operationId: 'old', outcome: 'rejected', code: 'operation_expired', serverRevision: 0 },
      ]);
      expect(store.hasLesson('edge')).toBe(true);
      expect(store.hasLesson('old')).toBe(false);
      // зачем: отказ зависит от момента прихода, а не от содержимого — квитанцию не пишем.
      expect(store.hasReceipt('old')).toBe(false);
      expect(store.hasReceipt('edge')).toBe(true);
    });

    test('поштучно: старая операция не роняет соседние того же пакета', () => {
      const store = createStore();
      const receipts = apply(store, [
        stamped('fresh-1', NOW - DAY),
        stamped('ancient', NOW - 400 * DAY),
        stamped('fresh-2', NOW),
      ]);
      expect(receipts.map((receipt) => receipt.outcome)).toEqual(['applied', 'rejected', 'applied']);
    });

    test('отказ на сущности отдаёт её текущую ревизию', () => {
      const store = createStore();
      apply(store, [stamped('seed', NOW, 'shared')]);
      const receipts = apply(store, [stamped('late', NOW - 171 * DAY, 'shared')]);
      expect(receipts).toEqual([{ operationId: 'late', outcome: 'rejected', code: 'operation_expired', serverRevision: 1 }]);
    });

    test('квитанция жива — повтор получает duplicate даже для старой операции (идемпотентность прежде возраста)', () => {
      const store = createStore();
      apply(store, [stamped('x', NOW)]);
      const receipts = apply(store, [stamped('x', NOW)], NOW + 175 * DAY);
      expect(receipts).toEqual([{ operationId: 'x', outcome: 'duplicate', serverRevision: 1 }]);
    });

    test('квитанция истекла (TTL) — повтор старой операции НЕ применяется второй раз', () => {
      const store = createStore();
      apply(store, [stamped('x', NOW)]);
      store.dropReceipt('x');
      const receipts = apply(store, [stamped('x', NOW)], NOW + 181 * DAY);
      expect(receipts).toEqual([{ operationId: 'x', outcome: 'rejected', code: 'operation_expired', serverRevision: 1 }]);
      expect(store.hasReceipt('x')).toBe(false);
    });

    test('оценка не входит в отпечаток: тот же id с другой оценкой — duplicate, а не operation_id_reused', () => {
      const store = createStore();
      apply(store, [stamped('x', NOW - 1000)]);
      expect(apply(store, [stamped('x', NOW - 5)])).toEqual([{ operationId: 'x', outcome: 'duplicate', serverRevision: 1 }]);
    });
  });

  describe('отказ по будущему', () => {
    test('на границе окна (10 минут) — применяется; на 1 мс дальше — operation_time_in_future без записи', () => {
      const store = createStore();
      const receipts = apply(store, [
        stamped('edge', NOW + ACCOUNTS_V2_OPERATION_MAX_FUTURE_SKEW_MS),
        stamped('ahead', NOW + ACCOUNTS_V2_OPERATION_MAX_FUTURE_SKEW_MS + 1),
      ]);
      expect(receipts).toEqual([
        { operationId: 'edge', outcome: 'applied', serverRevision: 1 },
        { operationId: 'ahead', outcome: 'rejected', code: 'operation_time_in_future', serverRevision: 0 },
      ]);
      expect(store.hasReceipt('ahead')).toBe(false);
      expect(store.hasLesson('ahead')).toBe(false);
    });

    test('после исправления оценки (клиент узнал смещение) та же операция применяется', () => {
      const store = createStore();
      expect(apply(store, [stamped('x', NOW + DAY)])[0]).toMatchObject({ outcome: 'rejected', code: 'operation_time_in_future' });
      expect(apply(store, [stamped('x', NOW)])).toEqual([{ operationId: 'x', outcome: 'applied', serverRevision: 1 }]);
    });
  });

  test('серверный пакет без оценок (миграция) возраст не проверяет', () => {
    const store = createStore();
    const result = validateBatch({ batchId: 'b', operations: [{ ownerUid: UID, operation: envelope('m') }] });
    if (!result.ok) throw new Error(result.code);
    const receipts = store.transact((port) => applyBatch(port, UID, result.batch, NOW));
    expect(receipts).toEqual([{ operationId: 'm', outcome: 'applied', serverRevision: 1 }]);
  });
});
