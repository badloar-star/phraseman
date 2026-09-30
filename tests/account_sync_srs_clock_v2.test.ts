import type { AccountSyncOwnedOperation } from '../modules/account-session-v2/account_sync';
import {
  accountSyncHybridSrsUpdatedAtMs,
  accountSyncServerClockOffsetMs,
} from '../modules/account-session-v2/account_sync_clock';
import { planAccountSyncSrsReissue } from '../modules/account-session-v2/account_sync_srs_reissue';

/*
 * Account V2 (TG-831C22D22486) — гибридные часы SRS и перевыпуск после
 * `rejected srs_time_in_future` (TEMP-контракт сервера (б)–(г)).
 */

const UID = 'uid/srs';
const FUTURE = 9_000_000_000_000;

function card(fields: Record<string, unknown>, operationId = 'card-op-1'): AccountSyncOwnedOperation {
  return Object.freeze({
    ownerUid: UID,
    operation: Object.freeze({
      schemaVersion: 1 as const, operationId, entityType: 'flashcard' as const, entityId: 'card/7',
      clientSequence: 11, baseRevision: 6, payload: Object.freeze({ op: 'upsert', fields: Object.freeze(fields) }),
    }),
  });
}

const rejected = Object.freeze({
  operationId: 'card-op-1', outcome: 'rejected' as const, code: 'srs_time_in_future' as const, serverRevision: 6,
});

describe('server clock offset and hybrid SRS time', () => {
  test('offset is serverNowMs minus local now', () => {
    expect(accountSyncServerClockOffsetMs(1_000_750, 1_000_000)).toBe(750);
    expect(accountSyncServerClockOffsetMs(1_000_000, 1_000_750)).toBe(-750);
    expect(() => accountSyncServerClockOffsetMs(Number.NaN, 1)).toThrow('account_sync_invalid_input');
    expect(() => accountSyncServerClockOffsetMs(-1, 1)).toThrow('account_sync_invalid_input');
  });

  test('updatedAtMs = max(local + offset, seen + 1)', () => {
    expect(accountSyncHybridSrsUpdatedAtMs({ localNowMs: 1_000, serverOffsetMs: 500, seenUpdatedAtMs: null })).toBe(1_500);
    expect(accountSyncHybridSrsUpdatedAtMs({ localNowMs: 1_000, serverOffsetMs: 500, seenUpdatedAtMs: 5_000 })).toBe(5_001);
    expect(accountSyncHybridSrsUpdatedAtMs({ localNowMs: 1_000, serverOffsetMs: -400, seenUpdatedAtMs: 100 })).toBe(600);
    expect(accountSyncHybridSrsUpdatedAtMs({ localNowMs: 10, serverOffsetMs: -400, seenUpdatedAtMs: null })).toBe(0);
    expect(() => accountSyncHybridSrsUpdatedAtMs({ localNowMs: 1, serverOffsetMs: 0, seenUpdatedAtMs: -5 }))
      .toThrow('account_sync_invalid_input');
    expect(() => accountSyncHybridSrsUpdatedAtMs({ localNowMs: 1.5, serverOffsetMs: 0, seenUpdatedAtMs: null }))
      .toThrow('account_sync_invalid_input');
  });
});

describe('re-issue after rejected srs_time_in_future', () => {
  const base = {
    receipt: rejected, localNowMs: 2_000_000, serverOffsetMs: 250,
    laterOperations: Object.freeze([]), nextClientSequence: 20,
  };

  test('splits SRS into its own NEW operation with corrected time and keeps the other fields', () => {
    const original = card({
      front: 'hello', srs: { interval: 3, updatedAtMs: FUTURE }, srsPolicy: { mode: 'x', updatedAtMs: FUTURE },
    });
    const plan = planAccountSyncSrsReissue({
      ...base, rejected: original, seenSrsUpdatedAtMs: { srs: 2_100_000, srsPolicy: null },
    });
    expect(plan).toEqual([
      { ownerUid: UID, operation: {
        schemaVersion: 1, operationId: 'card-op-1:rest', entityType: 'flashcard', entityId: 'card/7',
        clientSequence: 20, baseRevision: 6, payload: { op: 'upsert', fields: { front: 'hello' } },
      } },
      { ownerUid: UID, operation: {
        schemaVersion: 1, operationId: 'card-op-1:srs', entityType: 'flashcard', entityId: 'card/7',
        clientSequence: 21, baseRevision: 6, payload: { op: 'upsert', fields: {
          srs: { interval: 3, updatedAtMs: 2_100_001 },
          srsPolicy: { mode: 'x', updatedAtMs: 2_000_250 },
        } },
      } },
    ]);
    expect(original.operation.payload).toEqual({ op: 'upsert', fields: {
      front: 'hello', srs: { interval: 3, updatedAtMs: FUTURE }, srsPolicy: { mode: 'x', updatedAtMs: FUTURE },
    } });
  });

  test('an SRS-only operation becomes exactly one new operation', () => {
    const plan = planAccountSyncSrsReissue({
      ...base, rejected: card({ srs: { interval: 1, updatedAtMs: FUTURE } }), seenSrsUpdatedAtMs: {},
    });
    expect(plan.map(({ operation }) => operation.operationId)).toEqual(['card-op-1:srs']);
    expect(plan[0].operation.clientSequence).toBe(20);
    expect(plan[0].operation.payload).toEqual({ op: 'upsert', fields: { srs: { interval: 1, updatedAtMs: 2_000_250 } } });
  });

  test.each([
    ['another reject code', { rejected: card({ srs: { updatedAtMs: FUTURE } }),
      receipt: { ...rejected, code: 'payload_invalid' as const } }],
    ['receipt of another operation', { rejected: card({ srs: { updatedAtMs: FUTURE } }),
      receipt: { ...rejected, operationId: 'other' } }],
    ['no SRS fields', { rejected: card({ front: 'x' }) }],
    ['SRS value is not an object', { rejected: card({ srs: 5 }) }],
    ['a later operation of another card', { rejected: card({ srs: { updatedAtMs: FUTURE } }),
      laterOperations: [card({ front: 'y' }, 'card-op-9')].map((later) => Object.freeze({
        ...later, operation: Object.freeze({ ...later.operation, entityId: 'card/other' }) })) }],
    ['tombstone payload', { rejected: Object.freeze({ ownerUid: UID, operation: Object.freeze({
      ...card({}).operation, payload: Object.freeze({ op: 'tombstone' }) }) }) }],
  ])('refuses to plan: %s', (_label, override) => {
    expect(() => planAccountSyncSrsReissue({ ...base, seenSrsUpdatedAtMs: {}, ...override }))
      .toThrow('account_sync_invalid_input');
  });
});
