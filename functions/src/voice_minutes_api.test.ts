import {
  voiceMinuteWalletResponse,
  voiceMinuteExpectedCredit,
} from './voice_minutes_api';

describe('voiceMinuteWalletMine response', () => {
  it('returns only bounded wallet status and exact verified credit state', () => {
    const wallet = {
      schemaVersion: 1 as const,
      ownerStableId: 'stable-a',
      grantedSeconds: 7_200,
      refundedSeconds: 0,
      chargedSeconds: 61,
      reservedSeconds: 120,
      netSeconds: 7_139,
      availableSeconds: 7_019,
      eventCount: 3,
      lastEventId: 'vm_purchase_grant_x',
      updatedAtMs: 1_000,
      activeReservationSessionId: 'secret-session',
      reservationRootSessionId: 'secret-root',
      canonicalOwnerStableId: null,
      mergeOperationId: null,
    };
    const credit = voiceMinuteExpectedCredit({
      expectedTransactionId: 'store-tx',
      expectedProductId: 'phraseman_voice_minutes_120',
      stableUid: 'stable-a',
      event: {
        kind: 'purchase_grant',
        ownerStableId: 'stable-a',
        productId: 'phraseman_voice_minutes_120',
      },
    });

    expect(voiceMinuteWalletResponse(wallet, credit)).toEqual({
      ok: true,
      availableSeconds: 7_019,
      reservedSeconds: 120,
      eventCount: 3,
      lastEventId: 'vm_purchase_grant_x',
      updatedAtMs: 1_000,
      credited: true,
    });
  });

  it('does not confirm another owner or product', () => {
    expect(voiceMinuteExpectedCredit({
      expectedTransactionId: 'store-tx',
      expectedProductId: 'phraseman_voice_minutes_30',
      stableUid: 'stable-a',
      event: { kind: 'purchase_grant', ownerStableId: 'stable-b', productId: 'phraseman_voice_minutes_30' },
    })).toBe(false);
  });
});
