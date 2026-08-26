import { createHash } from 'node:crypto';
import {
  commitPhoneStateEconomyOperation,
  commitPhoneStateNonMonetaryEconomyGrant,
  configurePhoneStateEconomyBridge,
  requestPhoneStateEconomySync,
} from '../app/phone_state_economy_bridge';

const validStarFingerprint = createHash('sha256').update(JSON.stringify({
  schemaVersion: 1, ownerStableId: 'account-a', requestId: 'request0000000001',
  lane: 'base', deliveryToken: null, giftId: 'stars_50', amount: 50,
  reason: 'level_spin_star_reward',
})).digest('hex');

const validAttemptRestoreCreditFingerprint = createHash('sha256').update(JSON.stringify({
  schemaVersion: 1,
  ownerStableId: 'account-a',
  spinRequestId: 'spinrequest000001',
  lane: 'base',
  giftId: 'attempt_restore_all',
  quantity: 1,
})).digest('hex');

const validAttemptRestoreConsumeFingerprint = createHash('sha256').update(JSON.stringify({
  schemaVersion: 1,
  ownerStableId: 'account-a',
  sessionId: 'lesson-session-1',
  questionId: 'question-1',
  recoveryOrdinal: 1,
  quantity: 1,
  attemptsGranted: 3,
})).digest('hex');

const operation = {
  operationId: 'purchase-123',
  ownerStableId: 'account-a',
  authority: 'client' as const,
  direction: 'debit' as const,
  amount: 10,
  delta: -10,
  reason: 'deck_unlock',
  grant: { kind: 'unlock', subjectId: 'deck-1', payload: { unlocked: true } },
  revision: 1,
  balanceBefore: 20,
  balanceAfter: 10,
  createdAtMs: 10,
  requestFingerprint: 'a'.repeat(64),
};

describe('PhoneState economy bridge', () => {
  afterEach(() => configurePhoneStateEconomyBridge(null));

  test('commits one exact composite with the legacy operation id', async () => {
    const commit = jest.fn(async () => ({ duplicate: false }));
    const triggerSync = jest.fn();
    configurePhoneStateEconomyBridge({
      scope: { stableUid: 'account-a', accountGeneration: 3 }, runtimeGeneration: 3, deviceId: 'device-a',
      store: { commit, readProjection: jest.fn(), replay: jest.fn() } as never, triggerSync,
    });
    await expect(commitPhoneStateEconomyOperation(operation)).resolves.toBe(true);
    expect(commit).toHaveBeenCalledWith(expect.objectContaining({
      domain: 'economy', kind: 'composite', entityId: 'purchase-123',
      payload: expect.objectContaining({ operationId: 'purchase-123', delta: -10 }),
    }), { idempotencyKey: 'economy:purchase-123' });
    expect(triggerSync).toHaveBeenCalledTimes(1);
  });

  test('rejects an external event from the personal client journal', async () => {
    configurePhoneStateEconomyBridge({
      scope: { stableUid: 'account-a', accountGeneration: 3 }, runtimeGeneration: 3, deviceId: 'device-a',
      store: { commit: jest.fn(), readProjection: jest.fn(), replay: jest.fn() } as never,
      triggerSync: jest.fn(),
    });
    await expect(commitPhoneStateEconomyOperation({ ...operation, authority: 'external' }))
      .resolves.toBe(false);
  });

  test('shared sync request is a no-op until runtime is installed', () => {
    expect(requestPhoneStateEconomySync()).toBe(false);
  });

  test('non-monetary premium benefit is still one exact composite grant', async () => {
    const commit = jest.fn(async () => ({ duplicate: false }));
    configurePhoneStateEconomyBridge({
      scope: { stableUid: 'account-a', accountGeneration: 3 }, runtimeGeneration: 3, deviceId: 'device-a',
      store: { commit, readProjection: jest.fn(), replay: jest.fn() } as never,
      triggerSync: jest.fn(),
    });
    await expect(commitPhoneStateNonMonetaryEconomyGrant({
      operationId: 'premium-freeze:2026-08-21',
      kind: 'premium_freeze',
      entitlementId: '2026-08-21',
      exactResult: { active: true, date: '2026-08-21' },
    })).resolves.toBe(true);
    expect(commit).toHaveBeenCalledWith(expect.objectContaining({
      domain: 'economy', kind: 'composite', entityId: 'premium-freeze:2026-08-21',
      payload: expect.objectContaining({ delta: 0 }),
    }), { idempotencyKey: 'economy:premium-freeze:2026-08-21' });
  });

  test('Spin star credit uses the same opaque immutable journal without changing pearl balance', async () => {
    const commit = jest.fn(async () => ({ duplicate: false }));
    configurePhoneStateEconomyBridge({
      scope: { stableUid: 'account-a', accountGeneration: 3 }, runtimeGeneration: 3, deviceId: 'device-a',
      store: { commit, readProjection: jest.fn(), replay: jest.fn() } as never,
      triggerSync: jest.fn(),
    });
    await expect(commitPhoneStateNonMonetaryEconomyGrant({
      operationId: 'level_spin:request0000000001.base',
      kind: 'star_credit',
      entitlementId: 'level_spin:request0000000001.base',
      expectedOwnerStableId: 'account-a',
      expectedAccountGeneration: 3,
      exactResult: {
        schemaVersion: 'client-level-spin-star-operation.v1',
        operationId: 'level_spin:request0000000001.base',
        ownerStableId: 'account-a', requestId: 'request0000000001', lane: 'base',
        giftId: 'stars_50', amount: 50, reason: 'level_spin_star_reward',
        createdAtMs: 1_800_000_000_000, requestFingerprint: validStarFingerprint,
        grant: { kind: 'star_credit', subjectId: 'level_spin:request0000000001.base', payload: {
          requestId: 'request0000000001', lane: 'base', giftId: 'stars_50', amount: 50,
        } },
      },
    })).resolves.toBe(true);
    expect(commit).toHaveBeenCalledWith(expect.objectContaining({
      domain: 'economy', kind: 'composite', entityId: 'level_spin:request0000000001.base',
      payload: expect.objectContaining({
        operationId: 'level_spin:request0000000001.base',
        delta: 0,
        grant: expect.objectContaining({ kind: 'star_credit' }),
      }),
    }), { idempotencyKey: 'economy:level_spin:request0000000001.base' });
  });

  test('commits a closed immutable Spin materialization acknowledgement', async () => {
    const commit = jest.fn(async () => ({ duplicate: false }));
    configurePhoneStateEconomyBridge({
      scope: { stableUid: 'account-a', accountGeneration: 3 }, runtimeGeneration: 3, deviceId: 'device-a',
      store: { commit, readProjection: jest.fn(), replay: jest.fn() } as never, triggerSync: jest.fn(),
    });
    await expect(commitPhoneStateNonMonetaryEconomyGrant({
      operationId: 'level_spin_ack:request0000000001.base',
      kind: 'star_credit_ack',
      entitlementId: 'level_spin:request0000000001.base',
      expectedOwnerStableId: 'account-a', expectedAccountGeneration: 3,
      exactResult: {
        schemaVersion: 'client-level-spin-star-ack.v1',
        operationId: 'level_spin:request0000000001.base',
        ownerStableId: 'account-a', requestFingerprint: validStarFingerprint,
        starsBalance: 50, starsEarnedTotal: 7, starsSeq: 3,
      },
    })).resolves.toBe(true);
    expect(commit).toHaveBeenCalledWith(expect.objectContaining({
      entityId: 'level_spin_ack:request0000000001.base',
      payload: expect.objectContaining({
        delta: 0,
        grant: expect.objectContaining({
          kind: 'star_credit_ack', entitlementId: 'level_spin:request0000000001.base',
        }),
      }),
    }), { idempotencyKey: 'economy:level_spin_ack:request0000000001.base' });
  });

  test('star credit rejects a stale installed runtime before commit', async () => {
    const commit = jest.fn();
    configurePhoneStateEconomyBridge({
      scope: { stableUid: 'account-b', accountGeneration: 4 }, runtimeGeneration: 4, deviceId: 'device-b',
      store: { commit, readProjection: jest.fn(), replay: jest.fn() } as never,
      triggerSync: jest.fn(),
    });
    await expect(commitPhoneStateNonMonetaryEconomyGrant({
      operationId: 'level_spin:request0000000001.base', kind: 'star_credit',
      entitlementId: 'level_spin:request0000000001.base',
      expectedOwnerStableId: 'account-a', expectedAccountGeneration: 3,
      exactResult: null,
    })).resolves.toBe(false);
    expect(commit).not.toHaveBeenCalled();
  });

  test('attempt restore credit commits only its closed exact zero-delta result', async () => {
    const commit = jest.fn(async () => ({ duplicate: false }));
    configurePhoneStateEconomyBridge({
      scope: { stableUid: 'account-a', accountGeneration: 3 }, runtimeGeneration: 3, deviceId: 'device-a',
      store: { commit, readProjection: jest.fn(), replay: jest.fn() } as never,
      triggerSync: jest.fn(),
    });
    const operationId = 'attempt_restore_credit:spinrequest000001.base';
    await expect(commitPhoneStateNonMonetaryEconomyGrant({
      operationId,
      kind: 'attempt_restore_inventory_credit',
      entitlementId: operationId,
      expectedOwnerStableId: 'account-a',
      expectedAccountGeneration: 3,
      exactResult: {
        schemaVersion: 'client-attempt-restore-gift-credit.v1',
        operationId,
        ownerStableId: 'account-a',
        spinRequestId: 'spinrequest000001',
        lane: 'base',
        giftId: 'attempt_restore_all',
        quantity: 1,
        createdAtMs: 100,
        requestFingerprint: validAttemptRestoreCreditFingerprint,
      },
    })).resolves.toBe(true);
    expect(commit).toHaveBeenCalledWith(expect.objectContaining({
      domain: 'economy', kind: 'composite', entityId: operationId,
      payload: expect.objectContaining({
        delta: 0,
        grant: expect.objectContaining({ kind: 'attempt_restore_inventory_credit' }),
      }),
    }), { idempotencyKey: `economy:${operationId}` });
  });

  test('attempt restore credit rejects a mismatched immutable fingerprint', async () => {
    const commit = jest.fn();
    configurePhoneStateEconomyBridge({
      scope: { stableUid: 'account-a', accountGeneration: 3 }, runtimeGeneration: 3, deviceId: 'device-a',
      store: { commit, readProjection: jest.fn(), replay: jest.fn() } as never,
      triggerSync: jest.fn(),
    });
    const operationId = 'attempt_restore_credit:spinrequest000001.base';
    await expect(commitPhoneStateNonMonetaryEconomyGrant({
      operationId,
      kind: 'attempt_restore_inventory_credit',
      entitlementId: operationId,
      expectedOwnerStableId: 'account-a',
      expectedAccountGeneration: 3,
      exactResult: {
        schemaVersion: 'client-attempt-restore-gift-credit.v1',
        operationId,
        ownerStableId: 'account-a',
        spinRequestId: 'spinrequest000001',
        lane: 'base',
        giftId: 'attempt_restore_all',
        quantity: 1,
        createdAtMs: 100,
        requestFingerprint: 'b'.repeat(64),
      },
    })).resolves.toBe(false);
    expect(commit).not.toHaveBeenCalled();
  });

  test('attempt restore consume is a closed zero-delta grant of exactly three attempts', async () => {
    const commit = jest.fn(async () => ({ duplicate: false }));
    configurePhoneStateEconomyBridge({
      scope: { stableUid: 'account-a', accountGeneration: 3 }, runtimeGeneration: 3, deviceId: 'device-a',
      store: { commit, readProjection: jest.fn(), replay: jest.fn() } as never,
      triggerSync: jest.fn(),
    });
    const operationId = 'attempt_restore_consume:lesson-session-1:1';
    await expect(commitPhoneStateNonMonetaryEconomyGrant({
      operationId,
      kind: 'attempt_restore_inventory_consume',
      entitlementId: operationId,
      expectedOwnerStableId: 'account-a',
      expectedAccountGeneration: 3,
      exactResult: {
        schemaVersion: 'client-attempt-restore-gift-consume.v1',
        operationId,
        ownerStableId: 'account-a',
        sessionId: 'lesson-session-1',
        questionId: 'question-1',
        recoveryOrdinal: 1,
        quantity: 1,
        attemptsGranted: 3,
        createdAtMs: 101,
        requestFingerprint: validAttemptRestoreConsumeFingerprint,
      },
    })).resolves.toBe(true);
    expect(commit).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({
        delta: 0,
        grant: expect.objectContaining({ kind: 'attempt_restore_inventory_consume' }),
      }),
    }), { idempotencyKey: `economy:${operationId}` });
  });

  test('star credit rejects a well-shaped receipt whose immutable fingerprint is false', async () => {
    const commit = jest.fn();
    configurePhoneStateEconomyBridge({
      scope: { stableUid: 'account-a', accountGeneration: 99 }, runtimeGeneration: 3, deviceId: 'device-a',
      store: { commit, readProjection: jest.fn(), replay: jest.fn() } as never,
      triggerSync: jest.fn(),
    });
    const operationId = 'level_spin:request0000000001.base';
    await expect(commitPhoneStateNonMonetaryEconomyGrant({
      operationId, kind: 'star_credit', entitlementId: operationId,
      expectedOwnerStableId: 'account-a', expectedAccountGeneration: 3,
      exactResult: {
        schemaVersion: 'client-level-spin-star-operation.v1', operationId,
        ownerStableId: 'account-a', requestId: 'request0000000001', lane: 'base',
        giftId: 'stars_50', amount: 50, reason: 'level_spin_star_reward',
        createdAtMs: 1, requestFingerprint: 'b'.repeat(64),
        grant: { kind: 'star_credit', subjectId: operationId, payload: {
          requestId: 'request0000000001', lane: 'base', giftId: 'stars_50', amount: 50,
        } },
      },
    })).resolves.toBe(false);
    expect(commit).not.toHaveBeenCalled();
  });

  test('star credit reports false when runtime changes during commit await', async () => {
    let resolveCommit!: () => void;
    const commit = jest.fn(() => new Promise<{ duplicate: false }>((resolve) => {
      resolveCommit = () => resolve({ duplicate: false });
    }));
    configurePhoneStateEconomyBridge({
      scope: { stableUid: 'account-a', accountGeneration: 3 }, runtimeGeneration: 3, deviceId: 'device-a',
      store: { commit, readProjection: jest.fn(), replay: jest.fn() } as never,
      triggerSync: jest.fn(),
    });
    const exactResult = {
      schemaVersion: 'client-level-spin-star-operation.v1' as const,
      operationId: 'level_spin:request0000000001.base', ownerStableId: 'account-a',
      requestId: 'request0000000001', lane: 'base' as const, giftId: 'stars_50', amount: 50,
      reason: 'level_spin_star_reward' as const, createdAtMs: 1, requestFingerprint: validStarFingerprint,
      grant: { kind: 'star_credit' as const, subjectId: 'level_spin:request0000000001.base', payload: {
        requestId: 'request0000000001', lane: 'base' as const, giftId: 'stars_50', amount: 50,
      } },
    };
    const pending = commitPhoneStateNonMonetaryEconomyGrant({
      operationId: exactResult.operationId, kind: 'star_credit', entitlementId: exactResult.operationId,
      expectedOwnerStableId: 'account-a', expectedAccountGeneration: 3, exactResult,
    });
    for (let index = 0; index < 5 && commit.mock.calls.length === 0; index += 1) {
      await Promise.resolve();
    }
    expect(commit).toHaveBeenCalledTimes(1);
    configurePhoneStateEconomyBridge({
      scope: { stableUid: 'account-b', accountGeneration: 4 }, runtimeGeneration: 4, deviceId: 'device-b',
      store: { commit: jest.fn(), readProjection: jest.fn(), replay: jest.fn() } as never,
      triggerSync: jest.fn(),
    });
    resolveCommit();
    await expect(pending).resolves.toBe(false);
  });
});
