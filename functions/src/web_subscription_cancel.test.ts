import {
  assertAdminStripeCancellationAccess,
  assertCancellableStripeWebOrder,
  assertStripeSubscriptionOrderBinding,
  normalizeAdminStripeCancellationInput,
  parseStripeCancellationResult,
  planStripeSubscriptionCancellationReservation,
  stripeCancellationOperationId,
} from './web_checkout';

describe('admin Stripe subscription cancellation', () => {
  const orderId = 'AbCdEfGhIjKlMnOpQrSt';
  const idempotencyKey = '7d71d9f8-8428-4adb-88fa-508a5a59f206';
  const operationId = stripeCancellationOperationId(orderId, idempotencyKey);
  const nowMs = Date.UTC(2026, 8, 3, 12, 0, 0);

  it('requires an authenticated admin with the existing money mutation permission', () => {
    expect(() => assertAdminStripeCancellationAccess(undefined)).toThrow('Admin only');
    expect(() => assertAdminStripeCancellationAccess({
      uid: 'analyst-uid',
      token: { admin: true, adminRole: 'analyst' },
    })).toThrow('Role cannot manage subscriptions');
    expect(() => assertAdminStripeCancellationAccess({
      uid: 'owner-uid',
      token: { admin: true, adminRole: 'owner' },
    })).not.toThrow();
  });

  it('accepts only one stored order id and a bounded audit reason', () => {
    expect(normalizeAdminStripeCancellationInput({
      orderId,
      reason: 'Запрос владельца карты: остановить будущие списания',
      idempotencyKey,
    })).toEqual({
      orderId,
      reason: 'Запрос владельца карты: остановить будущие списания',
      idempotencyKey,
    });
    expect(() => normalizeAdminStripeCancellationInput({ orderId: '../other', reason: 'valid reason' }))
      .toThrow('invalid_web_order_id');
    expect(() => normalizeAdminStripeCancellationInput({ orderId, reason: '' }))
      .toThrow('cancellation_reason_required');
    expect(() => normalizeAdminStripeCancellationInput({ orderId, reason: 'valid reason', idempotencyKey: 'retry-1' }))
      .toThrow('invalid_stripe_cancellation_idempotency_key');
  });

  it('allows only a recurring Stripe order with a persisted subscription id', () => {
    expect(assertCancellableStripeWebOrder(orderId, {
      provider: 'stripe',
      plan: 'monthly',
      gift: false,
      stripeSubscriptionId: 'sub_1Qwerty123456789',
    })).toEqual({ orderId, stripeSubscriptionId: 'sub_1Qwerty123456789' });

    for (const invalid of [
      { provider: 'paypal', plan: 'monthly', stripeSubscriptionId: 'sub_1Qwerty123456789' },
      { provider: 'stripe', plan: 'lifetime', stripeSubscriptionId: 'sub_1Qwerty123456789' },
      { provider: 'stripe', plan: 'monthly', gift: true, stripeSubscriptionId: 'sub_1Qwerty123456789' },
      { provider: 'stripe', plan: 'monthly', stripeSubscriptionId: '' },
      { provider: 'stripe', plan: 'monthly', stripeSubscriptionId: 'cus_not_a_subscription' },
    ]) {
      expect(() => assertCancellableStripeWebOrder(orderId, invalid)).toThrow();
    }
  });

  it('uses one stable attempt id and replays the immutable completed receipt', () => {
    expect(operationId).toMatch(/^stripe_subscription_cancel_[0-9a-f]{40}$/);
    expect(stripeCancellationOperationId(orderId, idempotencyKey)).toBe(operationId);
    expect(stripeCancellationOperationId(orderId, '932f11e1-93ac-45f9-92cf-bca37737ce29')).not.toBe(operationId);

    const reserved = planStripeSubscriptionCancellationReservation(undefined, {
      operationId,
      orderId,
      stripeSubscriptionId: 'sub_1Qwerty123456789',
      actorUid: 'owner-uid',
      actorEmail: 'owner@example.com',
      reason: 'Requested by cardholder',
      nowMs,
    });
    expect(reserved).toEqual({
      kind: 'reserve',
      document: expect.objectContaining({
        schemaVersion: 'stripe-subscription-cancellation-operation.v1',
        state: 'pending',
        operationId,
        orderId,
        stripeSubscriptionId: 'sub_1Qwerty123456789',
      }),
    });
    if (reserved.kind !== 'reserve') throw new Error('expected reservation');
    expect(planStripeSubscriptionCancellationReservation(reserved.document, {
      operationId,
      orderId,
      stripeSubscriptionId: 'sub_1Qwerty123456789',
      actorUid: 'owner-uid',
      actorEmail: 'owner@example.com',
      reason: 'Requested by cardholder',
      nowMs: nowMs + 1,
    })).toEqual({ kind: 'continue' });

    const response = {
      ok: true as const,
      operationId,
      orderId,
      stripeSubscriptionId: 'sub_1Qwerty123456789',
      cancelAtPeriodEnd: true as const,
      accessEndsAtMs: 1_788_000_000_000,
      auditId: 'audit-1',
    };
    expect(planStripeSubscriptionCancellationReservation({
      ...reserved.document,
      state: 'completed',
      response,
    }, {
      operationId,
      orderId,
      stripeSubscriptionId: 'sub_1Qwerty123456789',
      actorUid: 'owner-uid',
      actorEmail: 'owner@example.com',
      reason: 'Requested by cardholder',
      nowMs: nowMs + 2,
    })).toEqual({ kind: 'replay', response });
  });

  it('binds a pending operation to the original actor and audit reason', () => {
    const reserved = planStripeSubscriptionCancellationReservation(undefined, {
      operationId,
      orderId,
      stripeSubscriptionId: 'sub_1Qwerty123456789',
      actorUid: 'owner-uid',
      actorEmail: 'owner@example.com',
      reason: 'Requested by cardholder',
      nowMs,
    });
    if (reserved.kind !== 'reserve') throw new Error('expected reservation');
    for (const patch of [
      { actorUid: 'different-owner' },
      { actorEmail: 'different@example.com' },
      { reason: 'Different reason' },
    ]) {
      expect(() => planStripeSubscriptionCancellationReservation(reserved.document, {
        operationId,
        orderId,
        stripeSubscriptionId: 'sub_1Qwerty123456789',
        actorUid: 'owner-uid',
        actorEmail: 'owner@example.com',
        reason: 'Requested by cardholder',
        nowMs: nowMs + 1,
        ...patch,
      })).toThrow('stripe_cancellation_operation_conflict');
    }
  });

  it('verifies the live Stripe subscription belongs to the stored web order', () => {
    expect(assertStripeSubscriptionOrderBinding({
      id: 'sub_1Qwerty123456789',
      status: 'active',
      metadata: { orderId },
    }, 'sub_1Qwerty123456789', orderId)).toEqual(expect.objectContaining({
      id: 'sub_1Qwerty123456789',
      status: 'active',
    }));
    expect(() => assertStripeSubscriptionOrderBinding({
      id: 'sub_1Qwerty123456789',
      status: 'active',
      metadata: { orderId: 'DifferentOrder1234567' },
    }, 'sub_1Qwerty123456789', orderId)).toThrow('stripe_subscription_order_mismatch');
  });

  it('fails closed if an operation id is ever associated with another order or Stripe subscription', () => {
    const reserved = planStripeSubscriptionCancellationReservation(undefined, {
      operationId,
      orderId,
      stripeSubscriptionId: 'sub_1Qwerty123456789',
      actorUid: 'owner-uid',
      actorEmail: 'owner@example.com',
      reason: 'Requested by cardholder',
      nowMs,
    });
    if (reserved.kind !== 'reserve') throw new Error('expected reservation');
    expect(() => planStripeSubscriptionCancellationReservation(reserved.document, {
      operationId,
      orderId: 'DifferentOrder1234567',
      stripeSubscriptionId: 'sub_1Qwerty123456789',
      actorUid: 'owner-uid',
      actorEmail: 'owner@example.com',
      reason: 'Retry',
      nowMs: nowMs + 1,
    })).toThrow('stripe_cancellation_operation_conflict');
  });

  it('accepts only Stripe confirmation that preserves access until the paid period ends', () => {
    expect(parseStripeCancellationResult({
      id: 'sub_1Qwerty123456789',
      cancel_at_period_end: true,
      current_period_end: 1_788_000_000,
    }, 'sub_1Qwerty123456789')).toEqual({
      stripeSubscriptionId: 'sub_1Qwerty123456789',
      cancelAtPeriodEnd: true,
      accessEndsAtMs: 1_788_000_000_000,
    });
    expect(() => parseStripeCancellationResult({
      id: 'sub_1Qwerty123456789',
      cancel_at_period_end: false,
      current_period_end: 1_788_000_000,
    }, 'sub_1Qwerty123456789')).toThrow('stripe_cancellation_not_confirmed');
    expect(() => parseStripeCancellationResult({
      id: 'sub_different',
      cancel_at_period_end: true,
      current_period_end: 1_788_000_000,
    }, 'sub_1Qwerty123456789')).toThrow('stripe_cancellation_identity_mismatch');
  });
});
