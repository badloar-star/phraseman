import {
  hasValidPaidLevelSpinRuneFingerprint,
  paidLevelSpinOperationId,
  paidLevelSpinRuneFingerprint,
  parsePaidLevelSpinRuneOperation,
  replayOrdinaryEconomy,
  type PaidLevelSpinRuneOperationV1,
} from '../modules/phone-state/domains/economy';

const REQUEST_ID = 'paidspinrequest01';

async function exactPaidSpin(
  patch: Partial<PaidLevelSpinRuneOperationV1> = {},
): Promise<PaidLevelSpinRuneOperationV1> {
  const payload = {
    operationId: paidLevelSpinOperationId(REQUEST_ID)!,
    ownerStableId: 'owner-a',
    accountGeneration: 7,
    requestId: REQUEST_ID,
    giftId: 'energy_full',
    catalogVersion: 6,
    runeDelta: -300 as const,
    price: 300 as const,
    balanceBefore: 900,
    balanceAfter: 600,
    reason: 'paid_level_spin' as const,
    createdAtMs: 1_777_777_777,
    ...patch,
  };
  const requestFingerprint = await paidLevelSpinRuneFingerprint(payload);
  return Object.freeze({
    schemaVersion: 'client-paid-level-spin-rune-operation.v1',
    ...payload,
    requestFingerprint,
  });
}

function asPhoneStateComposite(exact: PaidLevelSpinRuneOperationV1) {
  return Object.freeze({
    operationId: exact.operationId,
    delta: 0,
    grant: Object.freeze({
      kind: 'paid_level_spin_rune_purchase',
      entitlementId: exact.operationId,
      exactResult: exact,
    }),
  });
}

test('accepts one exact 300-rune debit bound to the selected spin reward', async () => {
  const exact = await exactPaidSpin();
  expect(parsePaidLevelSpinRuneOperation(exact)).toEqual(exact);
  await expect(hasValidPaidLevelSpinRuneFingerprint(exact)).resolves.toBe(true);
  expect(replayOrdinaryEconomy([asPhoneStateComposite(exact)], 123).balance).toBe(123);
});

test.each([
  ['wrong price', { price: 299, runeDelta: -299, balanceAfter: 601 }],
  ['wrong arithmetic', { balanceAfter: 599 }],
  ['unknown gift/catalog pair', { giftId: 'attempt_restore_all', catalogVersion: 2 }],
  ['wrong owner', { ownerStableId: 'owner/a' }],
])('rejects %s', async (_name, patch) => {
  const exact = await exactPaidSpin(patch as Partial<PaidLevelSpinRuneOperationV1>);
  expect(parsePaidLevelSpinRuneOperation(exact)).toBeNull();
  await expect(hasValidPaidLevelSpinRuneFingerprint(exact)).resolves.toBe(false);
});

test('reused operation id with another exact gift fails closed', async () => {
  const first = await exactPaidSpin();
  const altered = await exactPaidSpin({ giftId: 'xp_250' });
  expect(parsePaidLevelSpinRuneOperation(altered)).toEqual(altered);
  expect(() => replayOrdinaryEconomy([
    asPhoneStateComposite(first),
    asPhoneStateComposite(altered),
  ], 0)).toThrow('phone_state_economy_operation_id_reused');
});

test('standalone outer debit is rejected even with a valid exact paid-spin result', async () => {
  const exact = await exactPaidSpin();
  expect(() => replayOrdinaryEconomy([
    { ...asPhoneStateComposite(exact), delta: -300 },
  ], 900)).toThrow('phone_state_economy_composite_invalid');
});
