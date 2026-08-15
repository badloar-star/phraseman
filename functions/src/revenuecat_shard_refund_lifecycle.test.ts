import {
  reduceShardRefundLifecycle,
  type ShardRefundLifecycle,
} from './revenuecat_shards';

const purchased = (): ShardRefundLifecycle => ({
  status: 'active', epoch: 0, lastEventAtMs: 100,
  lastEventType: 'PURCHASE', lastEventId: 'purchase-1',
});

describe('RevenueCat consumable refund lifecycle', () => {
  it('does not credit a duplicate reversal and debits again after a real reversal', () => {
    const refund1 = reduceShardRefundLifecycle(purchased(), {
      type: 'REFUND', eventId: 'refund-1', eventTimestampMs: 200,
    });
    expect(refund1).toMatchObject({ applyDelta: -1, reason: 'refunded', next: { status: 'refunded', epoch: 1 } });

    const reversal1 = reduceShardRefundLifecycle(refund1.next, {
      type: 'REFUND_REVERSED', eventId: 'reversal-1', eventTimestampMs: 300,
    });
    expect(reversal1).toMatchObject({ applyDelta: 1, reason: 'restored', next: { status: 'active', epoch: 1 } });

    const duplicateReversal = reduceShardRefundLifecycle(reversal1.next, {
      type: 'REFUND_REVERSED', eventId: 'reversal-duplicate', eventTimestampMs: 310,
    });
    expect(duplicateReversal).toMatchObject({ applyDelta: 0, reason: 'already_active', next: { epoch: 1 } });

    const refund2 = reduceShardRefundLifecycle(duplicateReversal.next, {
      type: 'REFUND', eventId: 'refund-2', eventTimestampMs: 400,
    });
    expect(refund2).toMatchObject({ applyDelta: -1, reason: 'refunded', next: { status: 'refunded', epoch: 2 } });
  });

  it.each([
    ['duplicate refund before reversal', ['REFUND', 'REFUND', 'REFUND_REVERSED'], [-1, 0, 1]],
    ['duplicate reversal after restore', ['REFUND', 'REFUND_REVERSED', 'REFUND_REVERSED'], [-1, 1, 0]],
    ['two complete epochs', ['REFUND', 'REFUND_REVERSED', 'REFUND', 'REFUND_REVERSED'], [-1, 1, -1, 1]],
  ] as const)('%s', (_name, sequence, expected) => {
    let state = purchased();
    const deltas = sequence.map((type, index) => {
      const decision = reduceShardRefundLifecycle(state, {
        type, eventId: `${type}-${index}`, eventTimestampMs: 200 + index,
      });
      state = decision.next;
      return decision.applyDelta;
    });
    expect(deltas).toEqual(expected);
  });

  it('fences a late old event and asks RevenueCat to retry reversal-before-refund', () => {
    const beforeRefund = reduceShardRefundLifecycle(purchased(), {
      type: 'REFUND_REVERSED', eventId: 'early-reversal', eventTimestampMs: 200,
    });
    expect(beforeRefund).toMatchObject({ applyDelta: 0, reason: 'refund_not_found' });

    const refunded = reduceShardRefundLifecycle(purchased(), {
      type: 'REFUND', eventId: 'refund', eventTimestampMs: 400,
    });
    const stale = reduceShardRefundLifecycle(refunded.next, {
      type: 'REFUND_REVERSED', eventId: 'old-reversal', eventTimestampMs: 300,
    });
    expect(stale).toMatchObject({ applyDelta: 0, reason: 'stale_event', next: refunded.next });
  });
});
