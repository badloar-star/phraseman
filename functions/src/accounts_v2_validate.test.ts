import {
  resolveCallerUid,
  validateBatch,
} from './accounts_v2_apply_core';

/*
 * Account V2, Пакет 3S — вход ядра: uid только из auth и строгая схема v1.
 *
 * зачем: вынесено из accounts_v2_apply_core.test.ts, чтобы тест-файлы оставались
 * ≤ ~800 строк. Здесь только чистые проверки входа — без порта хранилища.
 */

const UID = 'user-A';
const OTHER_UID = 'user-B';

function rawOp(operationId: string, entityType: string, entityId: string, payload: unknown): Record<string, unknown> {
  return {
    ownerUid: UID,
    operation: { schemaVersion: 1, operationId, entityType, entityId, clientSequence: 1, baseRevision: null, payload },
  };
}

function rawBatch(operations: readonly unknown[], batchId = 'batch-1'): Record<string, unknown> {
  return { batchId, operations: [...operations] };
}

function expectInvalid(raw: unknown, code: string, path: string): void {
  expect(validateBatch(raw)).toEqual({ ok: false, code, path });
}

describe('resolveCallerUid: uid только из auth', () => {
  test('нет auth → unauthenticated', () => {
    expect(resolveCallerUid(null)).toEqual({ ok: false, code: 'unauthenticated' });
    expect(resolveCallerUid({})).toEqual({ ok: false, code: 'unauthenticated' });
    expect(resolveCallerUid({ uid: '' })).toEqual({ ok: false, code: 'unauthenticated' });
    expect(resolveCallerUid(null, UID)).toEqual({ ok: false, code: 'unauthenticated' });
  });

  test('uid из payload не даёт полномочий: чужой → uid_mismatch', () => {
    expect(resolveCallerUid({ uid: UID }, OTHER_UID)).toEqual({ ok: false, code: 'uid_mismatch' });
    expect(resolveCallerUid({ uid: UID }, null)).toEqual({ ok: false, code: 'uid_mismatch' });
    expect(resolveCallerUid({ uid: UID }, ` ${UID}`)).toEqual({ ok: false, code: 'uid_mismatch' });
  });

  test('uid отсутствует в payload или точно совпадает → uid из auth', () => {
    expect(resolveCallerUid({ uid: UID })).toEqual({ ok: true, uid: UID });
    expect(resolveCallerUid({ uid: UID }, UID)).toEqual({ ok: true, uid: UID });
  });
});

describe('validateBatch: схема v1 без приведения типов', () => {
  const ok = (): Record<string, unknown> => rawOp('op-1', 'flashcard', 'card-1', { op: 'tombstone' });

  test('корректный пакет принимается', () => {
    const result = validateBatch(rawBatch([ok()]));
    expect(result.ok).toBe(true);
  });

  test.each([
    ['schemaVersion строкой', (op: Record<string, any>) => { op.operation.schemaVersion = '1'; },
      'invalid_type', '$.operations[0].operation.schemaVersion'],
    ['schemaVersion 2', (op: Record<string, any>) => { op.operation.schemaVersion = 2; },
      'schema_version_unsupported', '$.operations[0].operation.schemaVersion'],
    ['entityType чужой', (op: Record<string, any>) => { op.operation.entityType = 'wallet'; },
      'entity_type_unknown', '$.operations[0].operation.entityType'],
    ['clientSequence строкой', (op: Record<string, any>) => { op.operation.clientSequence = '1'; },
      'invalid_type', '$.operations[0].operation.clientSequence'],
    ['clientSequence дробный', (op: Record<string, any>) => { op.operation.clientSequence = 1.5; },
      'invalid_value', '$.operations[0].operation.clientSequence'],
    ['baseRevision строкой', (op: Record<string, any>) => { op.operation.baseRevision = '0'; },
      'invalid_type', '$.operations[0].operation.baseRevision'],
    ['лишнее поле конверта', (op: Record<string, any>) => { op.operation.pearls = 5; },
      'unknown_field', '$.operations[0].operation.pearls'],
    ['нет поля payload', (op: Record<string, any>) => { delete op.operation.payload; },
      'missing_field', '$.operations[0].operation.payload'],
    ['ownerUid числом', (op: Record<string, any>) => { op.ownerUid = 7; },
      'invalid_type', '$.operations[0].ownerUid'],
    ['ownerUid пустой', (op: Record<string, any>) => { op.ownerUid = ''; },
      'invalid_value', '$.operations[0].ownerUid'],
    ['operationId с пробелом по краю', (op: Record<string, any>) => { op.operation.operationId = ' x'; },
      'invalid_value', '$.operations[0].operation.operationId'],
    ['operationId пустой', (op: Record<string, any>) => { op.operation.operationId = ''; },
      'invalid_value', '$.operations[0].operation.operationId'],
    ['entityId пустой', (op: Record<string, any>) => { op.operation.entityId = ''; },
      'invalid_value', '$.operations[0].operation.entityId'],
    ['Infinity в payload', (op: Record<string, any>) => { op.operation.payload = { a: [1, Infinity] }; },
      'number_not_finite', '$.operations[0].operation.payload.a[1]'],
    ['undefined в payload', (op: Record<string, any>) => { op.operation.payload = { a: undefined }; },
      'invalid_type', '$.operations[0].operation.payload.a'],
    ['Date в payload', (op: Record<string, any>) => { op.operation.payload = { a: new Date(0) }; },
      'not_plain_object', '$.operations[0].operation.payload.a'],
    ['символ-ключ в payload', (op: Record<string, any>) => { op.operation.payload = { [Symbol('s')]: 1 }; },
      'invalid_key', '$.operations[0].operation.payload'],
  ])('%s → отказ с путём', (_label, mutate, code, path) => {
    const op = ok();
    mutate(op as Record<string, any>);
    expectInvalid(rawBatch([op]), code, path);
  });

  test('геттер вместо значения отклоняется, не вызывается', () => {
    const op = ok();
    let called = 0;
    Object.defineProperty(op.operation as object, 'entityId', {
      enumerable: true, configurable: true, get() { called += 1; return 'card'; },
    });
    expectInvalid(rawBatch([op]), 'accessor_property', '$.operations[0].operation.entityId');
    expect(called).toBe(0);
  });

  test('пустой пакет и повтор operationId в пакете', () => {
    expectInvalid(rawBatch([]), 'batch_empty', '$.operations');
    expectInvalid(rawBatch([ok(), ok()]), 'duplicate_operation_id', '$.operations[1].operation.operationId');
  });

  test('лишнее поле пакета и не-объект', () => {
    expectInvalid({ batchId: 'b', operations: [ok()], uid: UID }, 'unknown_field', '$.uid');
    expectInvalid([ok()], 'not_plain_object', '$');
    expectInvalid(null, 'not_plain_object', '$');
  });
});
