import {
  dialogExtraRepliesRuneOperationFingerprint,
  dialogExtraRepliesRuneOperationId,
  hasValidDialogExtraRepliesRuneOperationFingerprint,
  parseDialogExtraRepliesRuneOperation,
  replayOrdinaryEconomy,
} from '../modules/phone-state/domains/economy';

const unsigned = {
  operationId: dialogExtraRepliesRuneOperationId('der1234567890123456')!,
  ownerStableId: 'account-a',
  accountGeneration: 1,
  requestId: 'der1234567890123456',
  runeDelta: -300 as const,
  price: 300 as const,
  repliesGranted: 10 as const,
  balanceBefore: 600,
  balanceAfter: 300,
  reason: 'dialog_extra_replies' as const,
  createdAtMs: 100,
};

describe('dialogue extra-replies exact rune operation', () => {
  test('binds the -300 debit and +10 reply grant in one fingerprinted receipt', async () => {
    const operation = {
      schemaVersion: 'client-dialog-extra-replies-rune-operation.v1' as const,
      ...unsigned,
      requestFingerprint: await dialogExtraRepliesRuneOperationFingerprint(unsigned),
    };

    expect(parseDialogExtraRepliesRuneOperation(operation)).toEqual(operation);
    await expect(hasValidDialogExtraRepliesRuneOperationFingerprint(operation)).resolves.toBe(true);
    expect(parseDialogExtraRepliesRuneOperation({ ...operation, repliesGranted: 9 })).toBeNull();
    expect(parseDialogExtraRepliesRuneOperation({ ...operation, balanceAfter: 600 })).toBeNull();
  });

  test('derives one stable operation id and rejects malformed request ids', () => {
    expect(dialogExtraRepliesRuneOperationId('der1234567890123456')).toBe('dialog_extra_replies:der1234567890123456');
    expect(dialogExtraRepliesRuneOperationId('bad')).toBeNull();
  });

  test('economy reducer accepts only the zero-outer-delta composite receipt', async () => {
    const operation = {
      schemaVersion: 'client-dialog-extra-replies-rune-operation.v1' as const,
      ...unsigned,
      requestFingerprint: await dialogExtraRepliesRuneOperationFingerprint(unsigned),
    };
    const composite = {
      operationId: operation.operationId,
      delta: 0,
      grant: {
        kind: 'dialog_extra_replies_rune_purchase',
        entitlementId: operation.operationId,
        exactResult: operation,
      },
    };
    expect(replayOrdinaryEconomy([composite], 600).balance).toBe(600);
    expect(() => replayOrdinaryEconomy([{ ...composite, delta: -300 }], 600))
      .toThrow('phone_state_economy_composite_invalid');
  });
});
