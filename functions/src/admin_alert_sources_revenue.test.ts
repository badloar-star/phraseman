import {
  communityPackAlertFromWrite,
  paidOrderAlertFromWrite,
  promoGiftAlertFromCreate,
  promoRedemptionAlertFromCreate,
  revenueAlertFromReceipt,
} from './admin_alert_sources_revenue';

const NOW_MS = Date.UTC(2026, 8, 12, 21, 0);

describe('RevenueCat Telegram alert source', () => {
  test.each(['web', 'telegram'] as const)('keeps %s payment time and identity stable across retries', (channel) => {
    const after = { status: 'paid_pending_activation', paidAtIso: new Date(NOW_MS - 5000).toISOString(), createdAt: NOW_MS - 90000 };
    const first = paidOrderAlertFromWrite(channel, 'order-1', {status: 'created'}, after, NOW_MS);
    const retry = paidOrderAlertFromWrite(channel, 'order-1', {status: 'created'}, after, NOW_MS + 60000);
    expect(first?.occurredAtMs).toBe(NOW_MS - 5000);
    expect(retry?.sourceId).toBe(first?.sourceId);
  });
  test('does not emit another Stars renewal when unrelated order metadata changes', () => {
    expect(paidOrderAlertFromWrite('telegram', 'charge-1',
      {status: 'paid_renewal_auto', paidAtIso: new Date(NOW_MS).toISOString()},
      {status: 'paid_renewal_auto', paidAtIso: new Date(NOW_MS).toISOString(), note: 'updated'}, NOW_MS + 1000)).toBeNull();
  });
  test('web renewal ISO timestamps do not turn retries into new renewals', () => {
    const before = {status: 'paid', renewalCount: 2};
    const after = {status: 'paid', renewalCount: 3, lastRenewalAtIso: new Date(NOW_MS - 5000).toISOString()};
    expect(paidOrderAlertFromWrite('web', 'o1', before, after, NOW_MS)).toEqual(paidOrderAlertFromWrite('web', 'o1', before, after, NOW_MS + 60000));
    expect(paidOrderAlertFromWrite('web', 'o1', before, after, NOW_MS)?.occurredAtMs).toBe(NOW_MS - 5000);
  });
  test('does not present a free weekly boon as a paid community purchase', () => {
    expect(communityPackAlertFromWrite('gift1', null, {status: 'completed', acquisitionSource: 'weekly_boon_gift', priceShards: 0, createdAt: NOW_MS}, NOW_MS)).toBeNull();
  });
  test.each([
    ['INITIAL_PURCHASE', 'TRIAL', 'trialStart'],
    ['INITIAL_PURCHASE', 'NORMAL', 'premiumPurchase'],
    ['NON_RENEWING_PURCHASE', 'NORMAL', 'premiumPurchase'],
    ['RENEWAL', 'NORMAL', 'renewal'],
    ['CANCELLATION', 'NORMAL', 'cancellation'],
    ['EXPIRATION', 'NORMAL', 'expiration'],
    ['BILLING_ISSUE', 'NORMAL', 'billingIssue'],
    ['REFUND', 'NORMAL', 'refund'],
  ] as const)('maps %s/%s to %s', (eventType, periodType, expectedType) => {
    expect(revenueAlertFromReceipt({
      receiptId: `receipt-${eventType}`,
      data: {
        eventType,
        periodType,
        uid: 'stable-A1B2',
        productId: 'phraseman_premium_yearly',
        store: 'APP_STORE',
        environment: 'PRODUCTION',
        grossPurchasedCurrencyMicros: eventType === 'REFUND' ? -19_990_000 : 19_990_000,
        purchasedCurrency: 'EUR',
        transactionId: 'must-not-leak',
        eventTimestampMs: NOW_MS,
      },
      nowMs: NOW_MS + 1,
    })).toEqual({
      eventType: expectedType,
      source: 'revenuecat.receipt',
      sourceId: `receipt-${eventType}`,
      occurredAtMs: NOW_MS,
      payload: {
        provider: 'APP STORE',
        product: 'phraseman premium yearly',
        environment: 'PRODUCTION',
        amount: 19.99,
        currency: 'EUR',
        uidLast4: 'A1B2',
        status: eventType.toLowerCase().replace(/_/g, ' '),
        route: '#revenue',
      },
    });
  });

  test('ignores transfer and unknown lifecycle rows', () => {
    expect(revenueAlertFromReceipt({ receiptId: 'transfer', data: { eventType: 'TRANSFER' }, nowMs: NOW_MS })).toBeNull();
    expect(revenueAlertFromReceipt({ receiptId: '', data: { eventType: 'RENEWAL' }, nowMs: NOW_MS })).toBeNull();
  });

  test('maps Web, Stars, UGC and gift receipts without customer PII', () => {
    const web = paidOrderAlertFromWrite('web', 'order-1', { status: 'created' }, {
      status: 'paid_pending_activation', provider: 'stripe', plan: 'yearly', amountCents: 3999,
      currency: 'eur', email: 'private@example.com', activationCode: 'SECRET', paidAtMs: NOW_MS,
    }, NOW_MS);
    expect(web).toMatchObject({ eventType: 'premiumPurchase', sourceId: `order-1:purchase:${NOW_MS}`, payload: { provider: 'stripe', amount: 39.99, currency: 'EUR' } });
    expect(JSON.stringify(web)).not.toMatch(/private|SECRET/);

    expect(paidOrderAlertFromWrite('telegram', 'charge-1', null, {
      status: 'paid_pending_activation', plan: 'month', amountStars: 450, telegramUserId: 123, createdAtMs: NOW_MS,
    }, NOW_MS)).toMatchObject({ eventType: 'premiumPurchase', payload: { provider: 'Telegram Stars', amount: 450, currency: 'XTR' } });

    expect(communityPackAlertFromWrite('purchase-1', null, { status: 'completed', priceShards: 100, buyerStableId: 'user-A1B2', createdAt: NOW_MS }, NOW_MS))
      .toMatchObject({ eventType: 'ugcPurchase', payload: { status: 'completed', amount: 100, currency: 'SHARD', uidLast4: 'A1B2' } });
    expect(communityPackAlertFromWrite('purchase-1', { status: 'completed' }, { status: 'refunded', refundedAmountShards: 100, buyerStableId: 'user-A1B2', refundedAtMs: NOW_MS }, NOW_MS))
      .toMatchObject({ eventType: 'ugcPurchase', payload: { status: 'refunded' } });
    expect(promoGiftAlertFromCreate('gift-1', { status: 'generated', plan: 'yearly', email: 'private@example.com', createdAtMs: NOW_MS }, NOW_MS))
      .toMatchObject({ eventType: 'promoGift', payload: { status: 'generated' } });
    expect(promoRedemptionAlertFromCreate('user-A1B2', 'redeem-1', { code: 'PRIVATE-CODE', redeemedAtMs: NOW_MS }, NOW_MS))
      .toMatchObject({ eventType: 'promoGift', sourceId: 'user-A1B2:redeem-1', payload: { status: 'redeemed', uidLast4: 'A1B2' } });
    expect(JSON.stringify(promoRedemptionAlertFromCreate('user-A1B2', 'redeem-1', { code: 'PRIVATE-CODE' }, NOW_MS)))
      .not.toContain('PRIVATE-CODE');
  });

  test('distinguishes Stars and Web renewals plus Web cancellation', () => {
    expect(paidOrderAlertFromWrite('telegram', 'renewal-1', null, {
      status: 'paid_renewal_auto', amountStars: 450, createdAtMs: NOW_MS,
    }, NOW_MS)).toMatchObject({ eventType: 'renewal', sourceId: expect.stringContaining('renewal-1:renewal:') });

    expect(paidOrderAlertFromWrite('web', 'web-1',
      { status: 'paid', renewalCount: 2 },
      { status: 'paid', renewalCount: 3, lastRenewalAtIso: new Date(NOW_MS).toISOString() },
      NOW_MS,
    )).toMatchObject({ eventType: 'renewal', sourceId: expect.stringContaining('web-1:renewal:3:') });

    expect(paidOrderAlertFromWrite('web', 'web-1',
      { status: 'paid', stripeCancelAtPeriodEnd: false },
      { status: 'paid', stripeCancelAtPeriodEnd: true, stripeCancellationRequestedAtMs: NOW_MS },
      NOW_MS,
    )).toMatchObject({ eventType: 'cancellation', sourceId: `web-1:cancellation:${NOW_MS}` });
  });
});
