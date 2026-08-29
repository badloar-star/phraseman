import {
  VOICE_MINUTE_PRODUCTS,
  createVoiceMinuteAdminGrantEvent,
  createVoiceMinuteCallChargeEvent,
  createVoiceMinutePurchaseEvent,
  createVoiceMinuteRefundEvent,
  reduceVoiceMinuteEvents,
  mergeVoiceMinuteWalletProjections,
  validateVoiceMinuteEventReplay,
  type VoiceMinuteAccessType,
} from './voice_minutes';

describe('voice minute immutable domain', () => {
  it('accepts only the exact paid-minute product allowlist', () => {
    expect(VOICE_MINUTE_PRODUCTS).toEqual({
      phraseman_voice_minutes_30: 30 * 60,
      phraseman_voice_minutes_120: 120 * 60,
      phraseman_voice_minutes_300: 300 * 60,
    });

    expect(() => createVoiceMinutePurchaseEvent({
      sourceId: 'tx-unknown',
      ownerStableId: 'stable-1',
      productId: 'phraseman_voice_minutes_999',
      occurredAtMs: 1_800_000_000_000,
    })).toThrow('voice_minute_product_unknown');
  });

  it('treats an identical purchase retry as a duplicate', () => {
    const event = createVoiceMinutePurchaseEvent({
      sourceId: 'tx-30',
      ownerStableId: 'stable-1',
      productId: 'phraseman_voice_minutes_30',
      occurredAtMs: 1_800_000_000_000,
    });
    expect(validateVoiceMinuteEventReplay(event, { ...event })).toBe('duplicate');
  });

  it('rejects the same immutable source id with a different payload', () => {
    const original = createVoiceMinutePurchaseEvent({
      sourceId: 'tx-conflict',
      ownerStableId: 'stable-1',
      productId: 'phraseman_voice_minutes_30',
      occurredAtMs: 1_800_000_000_000,
    });
    const conflicting = createVoiceMinutePurchaseEvent({
      sourceId: 'tx-conflict',
      ownerStableId: 'stable-1',
      productId: 'phraseman_voice_minutes_120',
      occurredAtMs: 1_800_000_000_000,
    });
    expect(() => validateVoiceMinuteEventReplay(original, conflicting))
      .toThrow('voice_minute_event_fingerprint_conflict');
  });

  it('keeps refunds and completed call charges as immutable balance facts', () => {
    const purchase = createVoiceMinutePurchaseEvent({
      sourceId: 'tx-120',
      ownerStableId: 'stable-1',
      productId: 'phraseman_voice_minutes_120',
      occurredAtMs: 1_800_000_000_000,
    });
    const charge = createVoiceMinuteCallChargeEvent({
      sessionId: 'session-1',
      ownerStableId: 'stable-1',
      chargedSeconds: 300,
      occurredAtMs: 1_800_000_300_000,
    });
    const refund = createVoiceMinuteRefundEvent({
      sourceId: 'refund-1',
      ownerStableId: 'stable-1',
      originalEventId: purchase.eventId,
      reversedSeconds: purchase.seconds,
      occurredAtMs: 1_800_000_400_000,
    });

    expect(reduceVoiceMinuteEvents([purchase, charge])).toMatchObject({
      grantedSeconds: 7_200,
      chargedSeconds: 300,
      availableSeconds: 6_900,
    });
    expect(reduceVoiceMinuteEvents([purchase, charge, refund])).toMatchObject({
      refundedSeconds: 7_200,
      chargedSeconds: 300,
      availableSeconds: 0,
      netSeconds: -300,
    });
  });

  it('binds an admin grant to one immutable operation and adds its seconds to the wallet projection', () => {
    const grant = createVoiceMinuteAdminGrantEvent({
      sourceId: 'admin-operation-1',
      ownerStableId: 'stable-1',
      grantedMinutes: 45,
      occurredAtMs: 1_800_000_000_000,
      actorUid: 'admin-1',
      requestId: 'admin-request-1',
      reason: 'Компенсация после подтверждённой ошибки звонка',
      comment: 'Обращение support-42',
    });

    expect(grant).toMatchObject({
      kind: 'admin_grant',
      ownerStableId: 'stable-1',
      seconds: 2_700,
      grantedMinutes: 45,
      environment: 'ADMIN',
      actorUid: 'admin-1',
      requestId: 'admin-request-1',
    });
    expect(validateVoiceMinuteEventReplay(grant, { ...grant })).toBe('duplicate');
    expect(reduceVoiceMinuteEvents([grant, { ...grant }])).toMatchObject({
      grantedSeconds: 2_700,
      availableSeconds: 2_700,
    });

    const changed = createVoiceMinuteAdminGrantEvent({
      sourceId: 'admin-operation-1',
      ownerStableId: 'stable-1',
      grantedMinutes: 46,
      occurredAtMs: 1_800_000_000_000,
      actorUid: 'admin-1',
      requestId: 'admin-request-1',
      reason: 'Компенсация после подтверждённой ошибки звонка',
      comment: 'Обращение support-42',
    });
    expect(() => validateVoiceMinuteEventReplay(grant, changed))
      .toThrow('voice_minute_event_fingerprint_conflict');
  });

  it('deduplicates a paid call charge by sessionId and rejects a changed retry', () => {
    const charge = createVoiceMinuteCallChargeEvent({
      sessionId: 'session-retry',
      ownerStableId: 'stable-1',
      chargedSeconds: 75,
      occurredAtMs: 1_800_000_075_000,
    });
    expect(validateVoiceMinuteEventReplay(charge, { ...charge })).toBe('duplicate');

    const changed = createVoiceMinuteCallChargeEvent({
      sessionId: 'session-retry',
      ownerStableId: 'stable-1',
      chargedSeconds: 76,
      occurredAtMs: 1_800_000_075_000,
    });
    expect(() => validateVoiceMinuteEventReplay(charge, changed))
      .toThrow('voice_minute_event_fingerprint_conflict');
  });

  it('defines trial, paid-minute, and admin access independently from subscriptions', () => {
    const accessTypes: VoiceMinuteAccessType[] = ['trial', 'paid_minutes', 'admin'];
    expect(accessTypes).toHaveLength(3);
  });

  it('merges a loser wallet into the canonical wallet once without mutating events', () => {
    const merged = mergeVoiceMinuteWalletProjections({
      winnerStableId: 'stable-a',
      loserStableId: 'stable-b',
      mergeOperationId: 'merge-a-b',
      occurredAtMs: 2_000,
      winner: {
        grantedSeconds: 1_800,
        refundedSeconds: 0,
        chargedSeconds: 60,
        eventCount: 2,
        updatedAtMs: 1_000,
      },
      loser: {
        grantedSeconds: 7_200,
        refundedSeconds: 1_800,
        chargedSeconds: 120,
        eventCount: 3,
        updatedAtMs: 1_500,
      },
    });

    expect(merged.winner).toMatchObject({
      ownerStableId: 'stable-a',
      grantedSeconds: 9_000,
      refundedSeconds: 1_800,
      chargedSeconds: 180,
      availableSeconds: 7_020,
      eventCount: 5,
    });
    expect(merged.loser).toMatchObject({
      ownerStableId: 'stable-b',
      canonicalOwnerStableId: 'stable-a',
      mergeOperationId: 'merge-a-b',
      grantedSeconds: 0,
      availableSeconds: 0,
    });
  });
});
