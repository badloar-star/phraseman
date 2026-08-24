import {
  createEconomyReducer,
  createOrdinaryEconomyAdapter,
  economyProjectionFromReducerState,
  replayOrdinaryEconomy,
  starCreditStateFromEconomyProjection,
  starCreditsFromEconomyProjection,
} from '../modules/phone-state/domains/economy';
import {
  createLearningV2CompletionAdapter,
  createLearningV2Reducer,
  learningV2ProjectionFromReducerState,
  replayLearningV2Completions,
} from '../modules/phone-state/domains/learning_v2';
import type { PersonalOperation } from '../modules/phone-state/contracts';
import fs from 'node:fs';
import path from 'node:path';

const spend = {
  operationId: 'spend-1',
  delta: -10,
  grant: { kind: 'unlock', entitlementId: 'deck-1', exactResult: { unlocked: true } },
} as const;

test('existing economy operation ID imports once and preserves exact grant', () => {
  const state = replayOrdinaryEconomy([spend, spend], 5);
  expect(state.balance).toBe(-5);
  expect(Object.keys(state.receipts)).toEqual(['spend-1']);
  expect(state.receipts['spend-1'].grant).toEqual(spend.grant);
});

test('standalone debit without its exact grant is rejected before journal commit', async () => {
  const commit = jest.fn();
  const adapter = createOrdinaryEconomyAdapter({ commit });
  await expect(adapter.commit({ operationId: 'bad', delta: -1, grant: null as never }))
    .rejects.toThrow('phone_state_economy_composite_invalid');
  expect(commit).not.toHaveBeenCalled();
});

test('Spin star credit persists as an immutable zero-delta receipt without changing pearl balance', () => {
  const exactResult = {
    schemaVersion: 'client-level-spin-star-operation.v1',
    operationId: 'level_spin:request0000000001.base',
    ownerStableId: 'account-a',
    requestId: 'request0000000001',
    lane: 'base',
    deliveryToken: 'delivery0000000001',
    giftId: 'stars_50',
    amount: 50,
    reason: 'level_spin_star_reward',
    grant: {
      kind: 'star_credit',
      subjectId: 'level_spin:request0000000001.base',
      payload: { requestId: 'request0000000001', lane: 'base', giftId: 'stars_50', amount: 50 },
    },
    createdAtMs: 1_800_000_000_000,
    requestFingerprint: 'a'.repeat(64),
  } as const;
  const starCredit = {
    operationId: exactResult.operationId,
    delta: 0,
    grant: {
      kind: 'star_credit',
      entitlementId: exactResult.operationId,
      exactResult,
    },
  } as const;
  const state = replayOrdinaryEconomy([starCredit, starCredit], 17);
  expect(state.balance).toBe(17);
  expect(state.receipts[starCredit.operationId]).toEqual(starCredit);
});

test('an immutable exact acknowledgement suppresses the materialized Spin overlay on every device', () => {
  const exactResult = {
    schemaVersion: 'client-level-spin-star-operation.v1',
    operationId: 'level_spin:request0000000001.base', ownerStableId: 'account-a',
    requestId: 'request0000000001', lane: 'base', giftId: 'stars_50', amount: 50,
    reason: 'level_spin_star_reward', createdAtMs: 1, requestFingerprint: 'a'.repeat(64),
    grant: { kind: 'star_credit', subjectId: 'level_spin:request0000000001.base', payload: {
      requestId: 'request0000000001', lane: 'base', giftId: 'stars_50', amount: 50,
    } },
  } as const;
  const state = replayOrdinaryEconomy([{
    operationId: exactResult.operationId, delta: 0,
    grant: { kind: 'star_credit', entitlementId: exactResult.operationId, exactResult },
  }, {
    operationId: 'level_spin_ack:request0000000001.base', delta: 0,
    grant: {
      kind: 'star_credit_ack', entitlementId: exactResult.operationId,
      exactResult: {
        schemaVersion: 'client-level-spin-star-ack.v1', operationId: exactResult.operationId,
        ownerStableId: 'account-a', requestFingerprint: 'a'.repeat(64),
        starsBalance: 67, starsEarnedTotal: 9, starsSeq: 4,
      },
    },
  }], 17);
  expect(state.balance).toBe(17);
  expect(starCreditsFromEconomyProjection(state)).toEqual([]);
  expect(starCreditStateFromEconomyProjection(state)).toEqual({
    credits: [],
    acknowledgements: [{
      schemaVersion: 'client-level-spin-star-ack.v1', operationId: exactResult.operationId,
      ownerStableId: 'account-a', requestFingerprint: 'a'.repeat(64),
      starsBalance: 67, starsEarnedTotal: 9, starsSeq: 4,
    }],
  });
});

test('malformed Spin acknowledgement is rejected fail-closed', () => {
  expect(() => replayOrdinaryEconomy([{
    operationId: 'level_spin_ack:request0000000001.base', delta: 0,
    grant: {
      kind: 'star_credit_ack', entitlementId: 'level_spin:request0000000001.base',
      exactResult: {
        schemaVersion: 'client-level-spin-star-ack.v1',
        operationId: 'level_spin:request0000000001.premium',
        ownerStableId: 'account-a', requestFingerprint: 'a'.repeat(64),
        starsBalance: 67, starsEarnedTotal: 9, starsSeq: 4, extra: true,
      },
    },
  }], 17)).toThrow('phone_state_economy_composite_invalid');
});

test.each([
  ['null exact result', null],
  ['mismatched gift amount', {
    schemaVersion: 'client-level-spin-star-operation.v1', operationId: 'level-spin-star:request0000000001:base',
    ownerStableId: 'account-a', requestId: 'request0000000001', lane: 'base', giftId: 'stars_50', amount: 100,
    reason: 'level_spin_star_reward', createdAtMs: 1, requestFingerprint: 'a'.repeat(64),
    grant: { kind: 'star_credit', subjectId: 'level-spin-star:request0000000001:base', payload: { requestId: 'request0000000001', lane: 'base', giftId: 'stars_50', amount: 100 } },
  }],
  ['mismatched operation lane', {
    schemaVersion: 'client-level-spin-star-operation.v1', operationId: 'level-spin-star:request0000000001:premium',
    ownerStableId: 'account-a', requestId: 'request0000000001', lane: 'base', giftId: 'stars_50', amount: 50,
    reason: 'level_spin_star_reward', createdAtMs: 1, requestFingerprint: 'a'.repeat(64),
    grant: { kind: 'star_credit', subjectId: 'level-spin-star:request0000000001:premium', payload: { requestId: 'request0000000001', lane: 'base', giftId: 'stars_50', amount: 50 } },
  }],
  ['invalid fingerprint', {
    schemaVersion: 'client-level-spin-star-operation.v1', operationId: 'level-spin-star:request0000000001:base',
    ownerStableId: 'account-a', requestId: 'request0000000001', lane: 'base', giftId: 'stars_50', amount: 50,
    reason: 'level_spin_star_reward', createdAtMs: 1, requestFingerprint: 'not-a-fingerprint',
    grant: { kind: 'star_credit', subjectId: 'level-spin-star:request0000000001:base', payload: { requestId: 'request0000000001', lane: 'base', giftId: 'stars_50', amount: 50 } },
  }],
])('malformed star-credit receipt is rejected: %s', (_name, exactResult) => {
  expect(() => replayOrdinaryEconomy([{
    operationId: 'level-spin-star:request0000000001:base',
    delta: 0,
    grant: {
      kind: 'star_credit',
      entitlementId: 'level-spin-star:request0000000001:base',
      exactResult,
    },
  }], 17)).toThrow('phone_state_economy_composite_invalid');
});

test('unknown zero-delta economy grant remains fail-closed', () => {
  expect(() => replayOrdinaryEconomy([{
    operationId: 'unknown-zero-delta',
    delta: 0,
    grant: { kind: 'unknown', entitlementId: 'unknown', exactResult: {} },
  }], 17)).toThrow('phone_state_economy_composite_invalid');
});

test('Learning V2 mutation has one completion receipt and one journal commit', async () => {
  const commits: string[] = [];
  const adapter = createLearningV2CompletionAdapter({
    commit: async (value) => { commits.push(value.mutationId); return { duplicate: false }; },
  });
  const completion = {
    mutationId: 'mutation-1', requiredSessionId: 'session-1', courseId: 'course-1', exactResult: { done: true },
  };
  await adapter.commit(completion);
  expect(replayLearningV2Completions([completion, completion]).completedSessionIds).toEqual(['session-1']);
  expect(commits).toEqual(['mutation-1']);
});

const personalOperation = (domain: string, kind: string, entityId: string, payload: unknown): PersonalOperation => ({
  schemaVersion: 1, operationId: `device-a:${entityId}`, stableUid: 'account-a', accountGeneration: 2,
  deviceId: 'device-a', deviceSequence: 1, hybridClock: { deviceId: 'device-a', counter: 1 },
  domain, kind, entityId, payload, exactResult: payload, createdAtMs: 1, fingerprint: `fp-${entityId}`,
});

test('economy runtime reducer keeps one immutable composite receipt', () => {
  const reducer = createEconomyReducer();
  const op = personalOperation('economy', 'composite', spend.operationId, spend);
  const state = reducer.apply(reducer.apply(reducer.initial(), op), op);
  expect(economyProjectionFromReducerState(state).receipts[spend.operationId]).toEqual(spend);
  expect(state.appliedOperationIds).toEqual([op.operationId]);
});

test('Learning V2 runtime reducer keeps one completion by mutation id', () => {
  const reducer = createLearningV2Reducer();
  const completion = {
    mutationId: 'mutation-1', requiredSessionId: 'session-1', courseId: 'course-1', exactResult: { done: true },
  };
  const op = personalOperation('learning_v2', 'required_session_completion', completion.mutationId, completion);
  const state = reducer.apply(reducer.apply(reducer.initial(), op), op);
  expect(learningV2ProjectionFromReducerState(state).completedSessionIds).toEqual(['session-1']);
});

test('legacy economy sync delegates to PhoneState and contains no full storage or Firestore scan', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../app/economy/client_shard_operation_sync.ts'), 'utf8',
  );
  expect(source).toContain('requestPhoneStateEconomySync');
  expect(source).not.toContain('getAllKeys');
  expect(source).not.toContain("collection('client_economy_operations')");
});

test('required-session commit short-circuits the legacy outbox after shared PhoneState commit', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../modules/learning-v2/progress/required_session_local_commit.ts'), 'utf8',
  );
  const shared = source.indexOf('commitPhoneStateLearningV2Completion');
  const legacyPrepare = source.indexOf('writeExactly(scope, prepareKey(scope), encoded)', shared);
  expect(shared).toBeGreaterThan(0);
  expect(source.slice(shared, legacyPrepare)).toContain('if (sharedCommitted)');
  expect(source.slice(shared, legacyPrepare)).toContain('return Object.freeze');
});
