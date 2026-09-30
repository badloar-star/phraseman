import type { SessionFence } from '../modules/account-session-v2/account_session';
import {
  ACCOUNT_SYNC_LIMITS,
  AccountSyncInvariantError,
  createInitialAccountSyncState,
  reduceAccountSync,
  type AccountSyncOwnedOperation,
  type AccountSyncReduceResult,
  type AccountSyncState,
} from '../modules/account-session-v2/account_sync';

const fenceA: SessionFence = Object.freeze({
  scopeKey: 'account:uid/a-юзер', uid: 'uid/a-юзер', generation: 4, nonce: 'nonce/четыре',
});
const operationA: AccountSyncOwnedOperation = Object.freeze({
  ownerUid: 'uid/a-юзер',
  operation: Object.freeze({
    schemaVersion: 1,
    operationId: 'operation-1',
    entityType: 'lesson_progress',
    entityId: 'course/урок/7',
    clientSequence: 3,
    baseRevision: 2,
    payload: Object.freeze({
      completed: true,
      unknownFutureField: Object.freeze({ text: 'preserve-\uD800-code-unit' }),
    }),
  }),
});
const receipts = [{ operationId: 'operation-1', outcome: 'applied', serverRevision: 3 }];

function applied(result: AccountSyncReduceResult): AccountSyncState {
  expect(result.evidenceKind).toBe('sync_model_only');
  expect(result.outcome).toBe('applied');
  return result.state;
}

function loading(pendingCount = 1): AccountSyncState {
  return applied(reduceAccountSync(
    createInitialAccountSyncState('uid/a-юзер', fenceA, pendingCount),
    { type: 'SYNC_REQUESTED' },
  ));
}

function driveToDispatch(operation = operationA, pendingCount = 1): AccountSyncState {
  return applied(reduceAccountSync(loading(pendingCount), {
    type: 'OUTBOX_BATCH_LOADED', expectedFence: fenceA, attemptEpoch: 1,
    batchId: 'batch-1', operations: [operation], pendingCount,
  }));
}

function driveToAck(): AccountSyncState {
  return applied(reduceAccountSync(driveToDispatch(), {
    type: 'DISPATCH_RESPONSE_RECEIVED', expectedFence: fenceA, attemptEpoch: 2,
    batchId: 'batch-1', receipts,
  }));
}

function ownedOperation(
  operationId: string,
  payload: unknown = Object.freeze({ value: true }),
  ownerUid = 'uid/a-юзер',
): AccountSyncOwnedOperation {
  return {
    ownerUid,
    operation: {
      schemaVersion: 1,
      operationId,
      entityType: 'lesson_progress',
      entityId: 'opaque entity/路径',
      clientSequence: 1,
      baseRevision: null,
      payload,
    },
  };
}

function expectAttention(state: AccountSyncState, code: string, stage: string): void {
  expect(state.phase).toMatchObject({ tag: 'sync_attention', code, retry: { stage } });
}

function testStringWireBytes(value: string): number {
  let bytes = 2;
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit === 0x22 || unit === 0x5c
      || unit === 0x08 || unit === 0x09 || unit === 0x0a
      || unit === 0x0c || unit === 0x0d) bytes += 2;
    else if (unit < 0x20) bytes += 6;
    else if (unit < 0x80) bytes += 1;
    else if (unit < 0x800) bytes += 2;
    else if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = index + 1 < value.length ? value.charCodeAt(index + 1) : -1;
      if (next >= 0xdc00 && next <= 0xdfff) { bytes += 4; index += 1; }
      else bytes += 6;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) bytes += 6;
    else bytes += 3;
  }
  return bytes;
}

function testObjectBase(keys: readonly string[]): number {
  return 2 + Math.max(0, keys.length - 1)
    + keys.reduce((total, key) => total + testStringWireBytes(key) + 1, 0);
}

function testEnvelopeBytes(row: AccountSyncOwnedOperation): number {
  const operation = row.operation;
  if (typeof operation.payload !== 'string') throw new Error('test payload must be string');
  return testObjectBase([
    'schemaVersion', 'operationId', 'entityType', 'entityId',
    'clientSequence', 'baseRevision', 'payload',
  ]) + 1 + testStringWireBytes(operation.operationId)
    + testStringWireBytes(operation.entityType) + testStringWireBytes(operation.entityId)
    + String(operation.clientSequence).length
    + (operation.baseRevision === null ? 4 : String(operation.baseRevision).length)
    + testStringWireBytes(operation.payload);
}

function testOwnedBytes(row: AccountSyncOwnedOperation): number {
  return testObjectBase(['ownerUid', 'operation'])
    + testStringWireBytes(row.ownerUid) + testEnvelopeBytes(row);
}

function testBatchBytes(batchId: string, rows: readonly AccountSyncOwnedOperation[]): number {
  return testObjectBase(['batchId', 'operations']) + testStringWireBytes(batchId)
    + 2 + Math.max(0, rows.length - 1)
    + rows.reduce((total, row) => total + testOwnedBytes(row), 0);
}

describe('account sync v2 identity, epochs and correlation', () => {
  test('accepts exact account identity while guest and foreign completion fences are stale', () => {
    const state = loading();
    expect(state).toMatchObject({ ownerUid: 'uid/a-юзер', pendingCount: 1, attemptEpoch: 1 });
    const guest: SessionFence = {
      scopeKey: 'guest:device/гость', uid: null, generation: 4, nonce: 'guest/nonce',
    };
    const foreign: SessionFence = {
      scopeKey: 'account:other', uid: 'other', generation: 4, nonce: 'nonce/четыре',
    };
    // зачем (TG-831C22D22486): явный тип — scopeKey стал шаблонным типом в account_session.ts.
    const staleFences: readonly SessionFence[] = [guest, foreign, { ...fenceA, generation: 5 },
      { ...fenceA, scopeKey: 'account:other' }, { ...fenceA, nonce: 'different' }];
    for (const expectedFence of staleFences) {
      const result = reduceAccountSync(state, {
        type: 'OUTBOX_BATCH_LOADED', expectedFence, attemptEpoch: 1,
        batchId: 'batch-1', operations: [operationA], pendingCount: 1,
      });
      expect(result).toMatchObject({ outcome: 'stale', state });
      expect(result.state).toBe(state);
      expect(result.effects).toEqual([]);
    }
  });

  test('increments every begun stage and retry and rejects overflow', () => {
    const dispatch = driveToDispatch();
    expect(dispatch.phase).toMatchObject({ tag: 'dispatching', attemptEpoch: 2 });
    const failed = applied(reduceAccountSync(dispatch, {
      type: 'DISPATCH_FAILED', expectedFence: fenceA, attemptEpoch: 2,
      batchId: 'batch-1', reason: 'transport',
    }));
    const retried = applied(reduceAccountSync(failed, { type: 'RETRY_REQUESTED' }));
    expect(retried.phase).toMatchObject({ tag: 'dispatching', attemptEpoch: 3 });
    const ack = applied(reduceAccountSync(retried, {
      type: 'DISPATCH_RESPONSE_RECEIVED', expectedFence: fenceA, attemptEpoch: 3,
      batchId: 'batch-1', receipts,
    }));
    expect(ack.phase).toMatchObject({ tag: 'ack_commit_pending', attemptEpoch: 4 });
    const overflow = Object.freeze({
      ...createInitialAccountSyncState('uid/a-юзер', fenceA, 0),
      attemptEpoch: Number.MAX_SAFE_INTEGER,
      phase: Object.freeze({ tag: 'idle' as const }),
    });
    expect(() => reduceAccountSync(overflow, { type: 'SYNC_REQUESTED' }))
      .toThrow('account_sync_invalid_input');
  });

  test('old dispatch attempt is stale after retry with same fence and batch', () => {
    const failed = applied(reduceAccountSync(driveToDispatch(), {
      type: 'DISPATCH_FAILED', expectedFence: fenceA, attemptEpoch: 2,
      batchId: 'batch-1', reason: 'transport',
    }));
    const retry = applied(reduceAccountSync(failed, { type: 'RETRY_REQUESTED' }));
    const old = reduceAccountSync(retry, {
      type: 'DISPATCH_RESPONSE_RECEIVED', expectedFence: fenceA, attemptEpoch: 2,
      batchId: 'batch-1', receipts,
    });
    expect(old.outcome).toBe('stale');
    expect(old.state).toBe(retry);
    expect(old.effects).toEqual([]);
    const current = reduceAccountSync(retry, {
      type: 'DISPATCH_RESPONSE_RECEIVED', expectedFence: fenceA, attemptEpoch: 3,
      batchId: 'batch-1', receipts: [
        { operationId: 'operation-1', outcome: 'duplicate', serverRevision: 3 },
      ],
    });
    expect(applied(current).phase).toMatchObject({ tag: 'ack_commit_pending', attemptEpoch: 4 });
    expect(current.effects.map((effect) => effect.type)).toEqual(['COMMIT_OUTBOX_ACKS']);
  });
});

describe('account sync v2 bounded JSON snapshots', () => {
  test('preserves unknown fields, lone UTF-16 units, __proto__ data and -0 semantics', () => {
    const payload = Object.create(null) as Record<string, unknown>;
    Object.defineProperty(payload, '__proto__', {
      value: Object.freeze({ text: '\uD800', number: -0 }), enumerable: true,
    });
    const state = driveToDispatch(ownedOperation('opaque-id', payload));
    const copiedPayload = (state.phase as Extract<AccountSyncState['phase'], { tag: 'dispatching' }>)
      .batch.operations[0].operation.payload as Record<string, unknown>;
    expect(Object.prototype.hasOwnProperty.call(copiedPayload, '__proto__')).toBe(true);
    const nested = copiedPayload.__proto__ as { text: string; number: number };
    expect(nested.text).toBe('\uD800');
    expect(nested.text.charCodeAt(0)).toBe(0xd800);
    expect(nested.number).toBe(0);
    expect(Object.is(nested.number, -0)).toBe(false);
    expect(Object.getPrototypeOf(copiedPayload)).toBeNull();
    expect(Object.isFrozen(nested)).toBe(true);
    expect(Object.isFrozen(state)).toBe(true);
  });

  test.each([
    ['cycle', () => { const value: unknown[] = []; value.push(value); return value; }],
    ['sparse', () => { const value = new Array(2); value[0] = true; return value; }],
    ['array extra', () => Object.assign([true], { extra: true })],
    ['symbol key', () => ({ [Symbol('secret')]: true })],
    ['accessor', () => Object.defineProperty({}, 'value', { enumerable: true, get: () => true })],
    ['exotic', () => new Date()],
    ['unsupported', () => ({ value: undefined })],
    ['bigint', () => ({ value: BigInt(1) })],
    ['symbol', () => ({ value: Symbol('unsupported') })],
    ['function', () => ({ value: () => true })],
    ['NaN', () => ({ value: Number.NaN })],
    ['positive infinity', () => ({ value: Number.POSITIVE_INFINITY })],
    ['negative infinity', () => ({ value: Number.NEGATIVE_INFINITY })],
  ])('maps invalid current payload %s to finite outbox attention', (_label, makePayload) => {
    const state = applied(reduceAccountSync(loading(), {
      type: 'OUTBOX_BATCH_LOADED', expectedFence: fenceA, attemptEpoch: 1,
      batchId: 'batch-1', operations: [ownedOperation('bad', makePayload())], pendingCount: 1,
    }));
    expectAttention(state, 'sync_outbox_invalid', 'load');
  });

  test('reads each payload descriptor once and owns the first captured values', () => {
    const payload: Record<string, unknown> = {};
    let descriptorReads = 0;
    const proxy = new Proxy(payload, {
      ownKeys: () => ['value'],
      getOwnPropertyDescriptor: (_target, key) => {
        descriptorReads += 1;
        return { value: key === 'value' && descriptorReads === 1 ? 'first' : 'changed',
          enumerable: true, configurable: true, writable: true };
      },
    });
    const state = driveToDispatch(ownedOperation('once', proxy));
    const batch = (state.phase as Extract<AccountSyncState['phase'], { tag: 'dispatching' }>).batch;
    expect(batch.operations[0].operation.payload).toEqual({ value: 'first' });
    expect(descriptorReads).toBe(1);
  });

  test('captures event, stored phase and current operation array containers exactly once', () => {
    const phaseCounts = { prototype: 0, extensible: 0, keys: 0, descriptors: 0 };
    const phaseTarget = Object.freeze({ tag: 'idle' as const });
    const phase = new Proxy(phaseTarget, {
      getPrototypeOf(target) { phaseCounts.prototype += 1; return Reflect.getPrototypeOf(target); },
      isExtensible(target) { phaseCounts.extensible += 1; return Reflect.isExtensible(target); },
      ownKeys(target) { phaseCounts.keys += 1; return Reflect.ownKeys(target); },
      getOwnPropertyDescriptor(target, key) {
        phaseCounts.descriptors += 1;
        return Reflect.getOwnPropertyDescriptor(target, key);
      },
    });
    const initial = createInitialAccountSyncState('uid/a-юзер', fenceA, 1);
    const proxiedState = Object.freeze({ ...initial, phase });
    const requested = reduceAccountSync(proxiedState, { type: 'SYNC_REQUESTED' });
    expect(requested.outcome).toBe('applied');
    expect(phaseCounts).toEqual({ prototype: 1, extensible: 1, keys: 1, descriptors: 1 });

    const eventCounts = { keys: 0, descriptors: 0 };
    let arrayOwnKeys = 0;
    const operationsTarget: unknown[] = [operationA];
    const operations = new Proxy(operationsTarget, {
      ownKeys(target) {
        arrayOwnKeys += 1;
        if (arrayOwnKeys > 1) target.push(ownedOperation('late-mutation'));
        return Reflect.ownKeys(target);
      },
    });
    const eventTarget = {
      type: 'OUTBOX_BATCH_LOADED' as const,
      expectedFence: fenceA,
      attemptEpoch: 1,
      batchId: 'batch-1',
      operations,
      pendingCount: 1,
    };
    const event = new Proxy(eventTarget, {
      ownKeys(target) { eventCounts.keys += 1; return Reflect.ownKeys(target); },
      getOwnPropertyDescriptor(target, key) {
        eventCounts.descriptors += 1;
        return Reflect.getOwnPropertyDescriptor(target, key);
      },
    });
    const state = applied(reduceAccountSync(applied(requested), event));
    expect(eventCounts).toEqual({ keys: 1, descriptors: 6 });
    expect(arrayOwnKeys).toBe(1);
    expect((state.phase as Extract<AccountSyncState['phase'], { tag: 'dispatching' }>)
      .batch.operations).toHaveLength(1);
  });

  test('stops envelope and batch byte traversal before touching later nested inputs', () => {
    let laterPayloadTouched = false;
    const laterPayload = new Proxy({}, {
      getPrototypeOf(target) { laterPayloadTouched = true; return Reflect.getPrototypeOf(target); },
    });
    const oversizedPayload = {
      first: 'x'.repeat(ACCOUNT_SYNC_LIMITS.maxEnvelopeUtf8Bytes),
      later: laterPayload,
    };
    expectAttention(applied(reduceAccountSync(loading(), {
      type: 'OUTBOX_BATCH_LOADED', expectedFence: fenceA, attemptEpoch: 1,
      batchId: 'batch-1', operations: [ownedOperation('oversized', oversizedPayload)],
      pendingCount: 1,
    })), 'sync_outbox_invalid', 'load');
    expect(laterPayloadTouched).toBe(false);

    let laterOperationTouched = false;
    const laterOperation = new Proxy(ownedOperation('must-not-be-read'), {
      getPrototypeOf(target) { laterOperationTouched = true; return Reflect.getPrototypeOf(target); },
    });
    const large = Array.from({ length: 5 }, (_, index) => (
      ownedOperation(`large-${index}`, 'x'.repeat(120_000))
    ));
    expectAttention(applied(reduceAccountSync(loading(large.length + 1), {
      type: 'OUTBOX_BATCH_LOADED', expectedFence: fenceA, attemptEpoch: 1,
      batchId: 'batch-1', operations: [...large, laterOperation],
      pendingCount: large.length + 1,
    })), 'sync_outbox_invalid', 'load');
    expect(laterOperationTouched).toBe(false);
  });

  test('rejects depth, node and protocol-array bounds without erasing pending work', () => {
    let deep: unknown = true;
    for (let index = 0; index < ACCOUNT_SYNC_LIMITS.maxPayloadDepth + 1; index += 1) {
      deep = [deep];
    }
    const tooManyNodes = Array.from(
      { length: ACCOUNT_SYNC_LIMITS.maxPayloadNodes }, () => null,
    );
    for (const payload of [deep, tooManyNodes]) {
      const state = applied(reduceAccountSync(loading(3), {
        type: 'OUTBOX_BATCH_LOADED', expectedFence: fenceA, attemptEpoch: 1,
        batchId: 'batch-1', operations: [ownedOperation('bounded', payload)], pendingCount: 3,
      }));
      expectAttention(state, 'sync_outbox_invalid', 'load');
      expect(state.pendingCount).toBe(3);
    }
    const operations = Array.from(
      { length: ACCOUNT_SYNC_LIMITS.maxBatchOperations + 1 },
      (_, index) => ownedOperation(`operation-${index}`),
    );
    expectAttention(applied(reduceAccountSync(loading(operations.length), {
      type: 'OUTBOX_BATCH_LOADED', expectedFence: fenceA, attemptEpoch: 1,
      batchId: 'batch-1', operations, pendingCount: operations.length,
    })), 'sync_outbox_invalid', 'load');
  });

  test('enforces JSON-encoded operation and batch ID byte limits including escapes', () => {
    const acceptedId = `id-${'x'.repeat(ACCOUNT_SYNC_LIMITS.maxOperationIdUtf8Bytes - 5)}\\`;
    expect(driveToDispatch(ownedOperation(acceptedId)).phase.tag).toBe('dispatching');
    const rejectedId = `${acceptedId}x`;
    expectAttention(applied(reduceAccountSync(loading(), {
      type: 'OUTBOX_BATCH_LOADED', expectedFence: fenceA, attemptEpoch: 1,
      batchId: 'batch-1', operations: [ownedOperation(rejectedId)], pendingCount: 1,
    })), 'sync_outbox_invalid', 'load');
    const longBatch = `b${'😀'.repeat(40)}`;
    expect(() => reduceAccountSync(loading(), {
      type: 'OUTBOX_BATCH_LOADED', expectedFence: fenceA, attemptEpoch: 1,
      batchId: longBatch, operations: [], pendingCount: 0,
    })).toThrow('account_sync_invalid_input');
  });

  test('admits exact envelope and batch byte limits and rejects one byte more', () => {
    const escapedPrefix = '\\"\uD800😀';
    const envelopeBase = ownedOperation('envelope-boundary', escapedPrefix);
    const envelopeFill = ACCOUNT_SYNC_LIMITS.maxEnvelopeUtf8Bytes
      - testEnvelopeBytes(envelopeBase);
    expect(envelopeFill).toBeGreaterThan(0);
    const exactEnvelope = ownedOperation(
      'envelope-boundary', `${escapedPrefix}${'x'.repeat(envelopeFill)}`,
    );
    expect(testEnvelopeBytes(exactEnvelope)).toBe(ACCOUNT_SYNC_LIMITS.maxEnvelopeUtf8Bytes);
    expect(driveToDispatch(exactEnvelope).phase.tag).toBe('dispatching');
    expectAttention(applied(reduceAccountSync(loading(), {
      type: 'OUTBOX_BATCH_LOADED', expectedFence: fenceA, attemptEpoch: 1,
      batchId: 'batch-1',
      operations: [ownedOperation(
        'envelope-boundary', `${escapedPrefix}${'x'.repeat(envelopeFill + 1)}`,
      )],
      pendingCount: 1,
    })), 'sync_outbox_invalid', 'load');

    const prefix = Array.from({ length: 4 }, (_, index) => (
      ownedOperation(`batch-prefix-${index}`, 'x'.repeat(130_000))
    ));
    const emptyLast = ownedOperation('batch-last', escapedPrefix);
    const batchFill = ACCOUNT_SYNC_LIMITS.maxBatchUtf8Bytes
      - testBatchBytes('batch-boundary', [...prefix, emptyLast]);
    expect(batchFill).toBeGreaterThan(0);
    const exactLast = ownedOperation('batch-last', `${escapedPrefix}${'x'.repeat(batchFill)}`);
    const exactBatch = [...prefix, exactLast];
    expect(testEnvelopeBytes(exactLast)).toBeLessThanOrEqual(
      ACCOUNT_SYNC_LIMITS.maxEnvelopeUtf8Bytes,
    );
    expect(testBatchBytes('batch-boundary', exactBatch)).toBe(
      ACCOUNT_SYNC_LIMITS.maxBatchUtf8Bytes,
    );
    expect(applied(reduceAccountSync(loading(exactBatch.length), {
      type: 'OUTBOX_BATCH_LOADED', expectedFence: fenceA, attemptEpoch: 1,
      batchId: 'batch-boundary', operations: exactBatch, pendingCount: exactBatch.length,
    })).phase.tag).toBe('dispatching');
    const tooLargeBatch = [
      ...prefix,
      ownedOperation('batch-last', `${escapedPrefix}${'x'.repeat(batchFill + 1)}`),
    ];
    expect(testBatchBytes('batch-boundary', tooLargeBatch)).toBe(
      ACCOUNT_SYNC_LIMITS.maxBatchUtf8Bytes + 1,
    );
    expectAttention(applied(reduceAccountSync(loading(tooLargeBatch.length), {
      type: 'OUTBOX_BATCH_LOADED', expectedFence: fenceA, attemptEpoch: 1,
      batchId: 'batch-boundary', operations: tooLargeBatch,
      pendingCount: tooLargeBatch.length,
    })), 'sync_outbox_invalid', 'load');
  });
});

describe('account sync v2 load, duplicate and receipt handling', () => {
  test('handles empty, partial and newly observed pending counts without automatic drain', () => {
    const empty = applied(reduceAccountSync(loading(0), {
      type: 'OUTBOX_BATCH_LOADED', expectedFence: fenceA, attemptEpoch: 1,
      batchId: 'batch-empty', operations: [], pendingCount: 0,
    }));
    expect(empty).toMatchObject({ pendingCount: 0, phase: { tag: 'idle' } });
    expect(applied(reduceAccountSync(loading(2), {
      type: 'OUTBOX_BATCH_LOADED', expectedFence: fenceA, attemptEpoch: 1,
      batchId: 'batch-empty', operations: [], pendingCount: 2,
    })).phase).toMatchObject({ tag: 'sync_attention', code: 'sync_outbox_invalid' });
    const observed = applied(reduceAccountSync(loading(0), {
      type: 'OUTBOX_BATCH_LOADED', expectedFence: fenceA, attemptEpoch: 1,
      batchId: 'batch-1', operations: [operationA], pendingCount: 1,
    }));
    expect(observed).toMatchObject({ pendingCount: 1, phase: { tag: 'dispatching' } });
  });

  test('distinguishes foreign ownership and identical versus conflicting duplicate IDs', () => {
    const foreign = applied(reduceAccountSync(loading(), {
      type: 'OUTBOX_BATCH_LOADED', expectedFence: fenceA, attemptEpoch: 1,
      batchId: 'batch-1', operations: [ownedOperation('one', {}, 'foreign')], pendingCount: 1,
    }));
    expectAttention(foreign, 'sync_outbox_invalid', 'load');
    const first = ownedOperation('same', Object.freeze({ value: 1 }));
    const identical = ownedOperation('same', Object.freeze({ value: 1 }));
    expectAttention(applied(reduceAccountSync(loading(2), {
      type: 'OUTBOX_BATCH_LOADED', expectedFence: fenceA, attemptEpoch: 1,
      batchId: 'batch-1', operations: [first, identical], pendingCount: 2,
    })), 'sync_outbox_invalid', 'load');
    const conflict = ownedOperation('same', Object.freeze({ value: 2 }));
    expectAttention(applied(reduceAccountSync(loading(2), {
      type: 'OUTBOX_BATCH_LOADED', expectedFence: fenceA, attemptEpoch: 1,
      batchId: 'batch-1', operations: [first, conflict], pendingCount: 2,
    })), 'sync_operation_conflict', 'load');
  });

  // зачем (TG-831C22D22486): каждая строка обёрнута в кортеж — jest раскладывает
  // строку-массив в аргументы, и тест получал не массив квитанций, а его первый элемент.
  test.each<[readonly unknown[]]>([
    [[]],
    [[...receipts, { operationId: 'extra', outcome: 'applied', serverRevision: 1 }]],
    [[...receipts, ...receipts]],
    [[{ operationId: 'wrong', outcome: 'applied', serverRevision: 1 }]],
    [[{ operationId: 'operation-1', outcome: 'unknown', serverRevision: 1 }]],
  ])('retains dispatch batch for invalid receipts %#', (invalidReceipts) => {
    const dispatch = driveToDispatch();
    const state = applied(reduceAccountSync(dispatch, {
      type: 'DISPATCH_RESPONSE_RECEIVED', expectedFence: fenceA,
      attemptEpoch: 2, batchId: 'batch-1', receipts: invalidReceipts,
    }));
    expectAttention(state, 'sync_receipt_invalid', 'dispatch');
    expect(state.pendingCount).toBe(dispatch.pendingCount);
  });

  test('normalizes valid receipts to batch order and emits only local commit work', () => {
    const second = ownedOperation('operation-2');
    const dispatch = applied(reduceAccountSync(loading(2), {
      type: 'OUTBOX_BATCH_LOADED', expectedFence: fenceA, attemptEpoch: 1,
      batchId: 'batch-1', operations: [operationA, second], pendingCount: 2,
    }));
    const result = reduceAccountSync(dispatch, {
      type: 'DISPATCH_RESPONSE_RECEIVED', expectedFence: fenceA, attemptEpoch: 2,
      batchId: 'batch-1', receipts: [
        { operationId: 'operation-2', outcome: 'duplicate', serverRevision: 5 },
        { operationId: 'operation-1', outcome: 'applied', serverRevision: 3 },
      ],
    });
    const state = applied(result);
    expect((state.phase as Extract<AccountSyncState['phase'], { tag: 'ack_commit_pending' }>)
      .receipts.map((receipt) => receipt.operationId)).toEqual(['operation-1', 'operation-2']);
    expect(result.effects.map((effect) => effect.type)).toEqual(['COMMIT_OUTBOX_ACKS']);
  });
});

describe('account sync v2 acknowledgement, retry and invalidation', () => {
  test('ack count is observational and may increase after concurrent enqueue', () => {
    const ack = driveToAck();
    const result = reduceAccountSync(ack, {
      type: 'ACK_COMMIT_CONFIRMED', expectedFence: fenceA, attemptEpoch: 3,
      batchId: 'batch-1', committedOperationIds: ['operation-1'],
      remainingPendingCountObserved: 2,
    });
    expect(applied(result)).toMatchObject({ pendingCount: 2, attemptEpoch: 3,
      phase: { tag: 'idle' } });
    expect(result.effects).toEqual([{
      type: 'REPORT_SYNC_CONFIRMED', ownerUid: 'uid/a-юзер', expectedFence: fenceA,
      attemptEpoch: 3, batchId: 'batch-1', confirmedOperationIds: ['operation-1'],
      remainingPendingCountObserved: 2,
    }]);
  });

  // зачем (TG-831C22D22486): строки обёрнуты в кортеж (см. выше) — иначе jest раскладывал их в аргументы.
  test.each<[readonly unknown[]]>([
    [[]], [['operation-1', 'extra']], [['operation-1', 'operation-1']], [[1]],
  ])('retains ack data for invalid committed IDs %#', (committedOperationIds) => {
    const ack = driveToAck();
    const state = applied(reduceAccountSync(ack, {
      type: 'ACK_COMMIT_CONFIRMED', expectedFence: fenceA, attemptEpoch: 3,
      batchId: 'batch-1', committedOperationIds,
      remainingPendingCountObserved: 1,
    }));
    expectAttention(state, 'sync_ack_commit_invalid', 'ack_commit');
    expect(state.pendingCount).toBe(ack.pendingCount);
  });

  test('failed stages retain retry data and retry with a fresh epoch', () => {
    const loadFailure = applied(reduceAccountSync(loading(4), {
      type: 'OUTBOX_LOAD_FAILED', expectedFence: fenceA, attemptEpoch: 1,
    }));
    expectAttention(loadFailure, 'sync_load_failed', 'load');
    expect(applied(reduceAccountSync(loadFailure, { type: 'RETRY_REQUESTED' })))
      .toMatchObject({ pendingCount: 4, attemptEpoch: 2, phase: { tag: 'loading' } });
    const ack = driveToAck();
    const ackFailure = applied(reduceAccountSync(ack, {
      type: 'ACK_COMMIT_FAILED', expectedFence: fenceA, attemptEpoch: 3, batchId: 'batch-1',
    }));
    const retry = reduceAccountSync(ackFailure, { type: 'RETRY_REQUESTED' });
    expect(applied(retry)).toMatchObject({ attemptEpoch: 4,
      phase: { tag: 'ack_commit_pending' } });
    expect(retry.effects.map((effect) => effect.type)).toEqual(['COMMIT_OUTBOX_ACKS']);
  });

  test('matching invalidation stops without erasing pending intent and late completions are stale', () => {
    const dispatch = driveToDispatch(operationA, 3);
    const stopped = applied(reduceAccountSync(dispatch, {
      type: 'SESSION_INVALIDATED', expectedFence: fenceA,
    }));
    expect(stopped).toMatchObject({ pendingCount: 3, phase: { tag: 'stopped' } });
    const late = reduceAccountSync(stopped, {
      type: 'DISPATCH_RESPONSE_RECEIVED', expectedFence: fenceA,
      attemptEpoch: 2, batchId: 'batch-1', receipts,
    });
    expect(late.state).toBe(stopped);
    expect(late.outcome).toBe('stale');
    expect(late.effects).toEqual([]);
  });
});

describe('account sync v2 validation and model-only evidence', () => {
  test('stale content arrays are not traversed', () => {
    let touched = false;
    const hostile = new Proxy([], {
      ownKeys() { touched = true; throw new Error('must not traverse stale content'); },
    });
    const state = loading();
    const result = reduceAccountSync(state, {
      type: 'OUTBOX_BATCH_LOADED', expectedFence: { ...fenceA, generation: 5 },
      attemptEpoch: 1, batchId: 'batch-1', operations: hostile, pendingCount: 1,
    });
    expect(result.outcome).toBe('stale');
    expect(touched).toBe(false);
  });

  test('rejects mutable stored state and invalid commands for phase', () => {
    const initial = createInitialAccountSyncState('uid/a-юзер', fenceA, 0);
    expect(() => reduceAccountSync({ ...initial }, { type: 'SYNC_REQUESTED' }))
      .toThrow('account_sync_invalid_input');
    expect(() => reduceAccountSync(initial, { type: 'RETRY_REQUESTED' }))
      .toThrow('account_sync_invalid_event_for_state');
  });

  test.each([undefined, BigInt(1), Symbol('bad'), () => true, Number.NaN,
    Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects unsupported payload %p in deeply frozen stored state',
    (payload) => {
      const invalidOperation = Object.freeze({
        ownerUid: 'uid/a-юзер',
        operation: Object.freeze({
          schemaVersion: 1 as const,
          operationId: 'stored-invalid',
          entityType: 'lesson_progress' as const,
          entityId: 'opaque', clientSequence: 1, baseRevision: null, payload,
        }),
      });
      const batch = Object.freeze({
        batchId: 'batch-invalid', operations: Object.freeze([invalidOperation]),
      });
      const invalidState = Object.freeze({
        ownerUid: 'uid/a-юзер', fence: fenceA, pendingCount: 1, attemptEpoch: 1,
        phase: Object.freeze({ tag: 'dispatching' as const, attemptEpoch: 1, batch }),
      });
      expect(() => reduceAccountSync(invalidState, {
        type: 'DISPATCH_FAILED', expectedFence: fenceA, attemptEpoch: 1,
        batchId: 'batch-invalid', reason: 'transport',
      })).toThrow('account_sync_invalid_input');
    },
  );

  test('errors expose only immutable finite fields', () => {
    const error = new AccountSyncInvariantError('raw-private-code');
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe('account_sync_invalid_input');
    expect(Reflect.ownKeys(error).sort()).toEqual(['code', 'message', 'name']);
    expect(Object.isFrozen(error)).toBe(true);
    expect(() => { (error as { code: string }).code = 'raw'; }).toThrow();
  });

  test('never mutates inputs or emits erase/domain/economy effects', () => {
    const input = ownedOperation('operation-copy', { score: 10, paidRight: true });
    const result = reduceAccountSync(loading(), {
      type: 'OUTBOX_BATCH_LOADED', expectedFence: fenceA, attemptEpoch: 1,
      batchId: 'batch-1', operations: [input], pendingCount: 1,
    });
    expect(Object.isFrozen(input)).toBe(false);
    expect(Object.isFrozen(input.operation.payload)).toBe(false);
    expect(Object.isFrozen(result)).toBe(true);
    expect(result.evidenceKind).toBe('sync_model_only');
    expect(result.effects.map((effect) => effect.type)).toEqual(['DISPATCH_OUTBOX_BATCH']);
    const effect = result.effects[0];
    expect(Reflect.ownKeys(effect).sort()).toEqual([
      'attemptEpoch', 'batch', 'expectedFence', 'ownerUid', 'type',
    ]);
    expect(effect).not.toHaveProperty('erase');
    expect(effect).not.toHaveProperty('delete');
    expect(effect).not.toHaveProperty('domainDecision');
    expect(effect).not.toHaveProperty('economyDecision');
    expect((effect as Extract<typeof effect, { type: 'DISPATCH_OUTBOX_BATCH' }>)
      .batch.operations[0].operation.payload).toEqual({ score: 10, paidRight: true });
  });
});
