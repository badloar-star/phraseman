import { aggregateSubscriptionAnalytics } from './admin_subscription_analytics_core';

describe('aggregateSubscriptionAnalytics', () => {
  it('deduplicates events, excludes sandbox and separates lifecycle truth', () => {
    const metrics = aggregateSubscriptionAnalytics([
      { eventId: 'buy-1', eventType: 'INITIAL_PURCHASE', periodType: 'TRIAL', productId: 'monthly', store: 'APP_STORE', environment: 'PRODUCTION', transactionId: 'tx-1', eventTimestampMs: 100 },
      { eventId: 'buy-1', eventType: 'INITIAL_PURCHASE', periodType: 'TRIAL', productId: 'monthly', store: 'APP_STORE', environment: 'PRODUCTION', transactionId: 'tx-1', eventTimestampMs: 100 },
      { eventId: 'sandbox', eventType: 'INITIAL_PURCHASE', productId: 'monthly', environment: 'SANDBOX', eventTimestampMs: 110 },
      { eventId: 'renew', eventType: 'RENEWAL', productId: 'monthly', store: 'APP_STORE', environment: 'PRODUCTION', originalTransactionId: 'tx-1', eventTimestampMs: 200 },
      { eventId: 'cancel', eventType: 'CANCELLATION', productId: 'monthly', store: 'APP_STORE', environment: 'PRODUCTION', originalTransactionId: 'tx-1', eventTimestampMs: 300 },
      { eventId: 'expire', eventType: 'EXPIRATION', productId: 'monthly', store: 'APP_STORE', environment: 'PRODUCTION', originalTransactionId: 'tx-1', eventTimestampMs: 400 },
      { eventId: 'refund', eventType: 'REFUND', productId: 'monthly', store: 'APP_STORE', environment: 'PRODUCTION', originalTransactionId: 'tx-1', eventTimestampMs: 500 },
      { eventId: 'life', eventType: 'NON_RENEWING_PURCHASE', productId: 'lifetime', store: 'PLAY_STORE', environment: 'PRODUCTION', transactionId: 'tx-life', eventTimestampMs: 600 },
      { eventId: 'back', eventType: 'UNCANCELLATION', productId: 'monthly', store: 'APP_STORE', environment: 'PRODUCTION', originalTransactionId: 'tx-1', eventTimestampMs: 700 },
    ]);

    expect(metrics).toMatchObject({
      purchases: 1,
      lifetimePurchases: 1,
      renewals: 1,
      trialEvents: 1,
      cancellations: 1,
      uncancellations: 1,
      expirations: 1,
      refunds: 1,
      distinctTransactions: 2,
      dataThroughMs: 700,
    });
  });

  it('does not return user or transaction identifiers', () => {
    const metrics = aggregateSubscriptionAnalytics([
      { eventId: 'e1', eventType: 'BILLING_ISSUE', uid: 'secret-user', candidates: ['secret-user'], transactionId: 'secret-tx', eventTimestampMs: null },
    ]);
    const serialized = JSON.stringify(metrics);
    expect(metrics.billingIssues).toBe(0);
    expect(metrics.missingTimestampEvents).toBe(1);
    expect(serialized).not.toContain('secret-user');
    expect(serialized).not.toContain('secret-tx');
  });

  it('uses ingestion time for range filtering and excludes undated events', () => {
    const metrics = aggregateSubscriptionAnalytics([
      { eventId: 'old', eventType: 'RENEWAL', createdAtMs: 100 },
      { eventId: 'recent', eventType: 'RENEWAL', createdAtMs: 900 },
      { eventId: 'undated', eventType: 'CANCELLATION' },
    ], false, { fromMs: 500 });
    expect(metrics.renewals).toBe(1);
    expect(metrics.cancellations).toBe(0);
    expect(metrics.usedCreatedAtFallback).toBe(1);
    expect(metrics.missingEventTimestamp).toBe(1);
    expect(metrics.undatedEvents).toBe(1);
  });

  it('keeps transfers out of product, store and period breakdowns', () => {
    const metrics = aggregateSubscriptionAnalytics([
      { eventId: 'transfer', eventType: 'TRANSFER', productId: 'unknown-product', store: 'unknown-store', periodType: 'unknown-period', eventTimestampMs: 1000 },
    ]);
    expect(metrics.transfers).toBe(1);
    expect(metrics.byProduct).toEqual([]);
    expect(metrics.byStore).toEqual([]);
    expect(metrics.byPeriodType).toEqual([]);
  });

  it('aggregates lifecycle reasons with honest historical coverage', () => {
    const metrics = aggregateSubscriptionAnalytics([
      { eventId: 'c1', eventType: 'CANCELLATION', cancelReason: 'UNSUBSCRIBE', eventTimestampMs: 100 },
      { eventId: 'c2', eventType: 'CANCELLATION', eventTimestampMs: 200 },
      { eventId: 'e1', eventType: 'EXPIRATION', expirationReason: 'BILLING_ERROR', eventTimestampMs: 300 },
      { eventId: 'e2', eventType: 'EXPIRATION', eventTimestampMs: 400 },
      { eventId: 'wrong', eventType: 'RENEWAL', cancelReason: 'UNSUBSCRIBE', expirationReason: 'BILLING_ERROR', eventTimestampMs: 500 },
    ]);
    expect(metrics.byCancellationReason).toEqual([{ id: 'UNSUBSCRIBE', events: 1 }]);
    expect(metrics.byExpirationReason).toEqual([{ id: 'BILLING_ERROR', events: 1 }]);
    expect(metrics.cancellationsWithReason).toBe(1);
    expect(metrics.cancellationReasonUnavailable).toBe(1);
    expect(metrics.expirationsWithReason).toBe(1);
    expect(metrics.expirationReasonUnavailable).toBe(1);
  });
});
