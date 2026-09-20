import {
  dialogExtraRepliesOperationFingerprint,
  hasValidDialogExtraRepliesOperationFingerprint,
  nextDialogQuotaAfterPurchase,
  parseDialogExtraRepliesOperation,
} from './dialog_extra_replies_contract';

const unsigned = {
  operationId: 'dialog_extra_replies:der1234567890123456',
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

test('accepts only the exact client-authored debit/grant bytes', () => {
  const operation = {
    schemaVersion: 'client-dialog-extra-replies-rune-operation.v1' as const,
    ...unsigned,
    requestFingerprint: dialogExtraRepliesOperationFingerprint(unsigned),
  };
  expect(parseDialogExtraRepliesOperation(operation)).toEqual(operation);
  expect(hasValidDialogExtraRepliesOperationFingerprint(operation)).toBe(true);
  expect(hasValidDialogExtraRepliesOperationFingerprint({ ...operation, balanceAfter: 600 })).toBe(false);
  expect(hasValidDialogExtraRepliesOperationFingerprint({ ...operation, repliesGranted: 9 })).toBe(false);
});

test('rejects every one-field mutation of the signed server operation', () => {
  const operation = {
    schemaVersion: 'client-dialog-extra-replies-rune-operation.v1' as const,
    ...unsigned,
    requestFingerprint: dialogExtraRepliesOperationFingerprint(unsigned),
  };
  const mutations: readonly (readonly [string, Record<string, unknown>])[] = [
    ['schemaVersion', { schemaVersion: 'client-dialog-extra-replies-rune-operation.v2' }],
    ['operationId', { operationId: 'dialog_extra_replies:der1234567890123457' }],
    ['ownerStableId', { ownerStableId: 'account-b' }],
    ['accountGeneration', { accountGeneration: 2 }],
    ['requestId', { requestId: 'der1234567890123457' }],
    ['runeDelta', { runeDelta: -301 }],
    ['price', { price: 301 }],
    ['repliesGranted', { repliesGranted: 11 }],
    ['balanceBefore', { balanceBefore: 601 }],
    ['balanceAfter', { balanceAfter: 299 }],
    ['reason', { reason: 'dialog_extra_replies_changed' }],
    ['createdAtMs', { createdAtMs: 101 }],
    ['requestFingerprint', {
      requestFingerprint: `${operation.requestFingerprint[0] === '0' ? '1' : '0'}${operation.requestFingerprint.slice(1)}`,
    }],
    ['extra field', { unexpected: true }],
  ];

  for (const [field, mutation] of mutations) {
    expect(hasValidDialogExtraRepliesOperationFingerprint({ ...operation, ...mutation }))
      .toBe(false);
    expect(field).toBeTruthy();
  }
});

test('fresh-day purchase clears yesterday dailyCount and starts one new +10 grant', () => {
  const now = Date.UTC(2026, 8, 20, 1);
  const nextReset = Date.UTC(2026, 8, 21);
  expect(nextDialogQuotaAfterPurchase({
    dailyCap: 10,
    dailyCount: 10,
    extraCapToday: 20,
    resetAtMs: now - 1,
    quotaVersion: 7,
  }, now, () => nextReset)).toEqual({
    dailyCap: 10,
    dailyCount: 0,
    extraCapToday: 10,
    resetAtMs: nextReset,
    quotaVersion: 8,
    observation: { remainingQuota: 20, resetAtMs: nextReset, quotaVersion: 8 },
  });
});

test('same-day purchase preserves usage and adds exactly ten', () => {
  const now = Date.UTC(2026, 8, 20, 1);
  const resetAtMs = Date.UTC(2026, 8, 21);
  expect(nextDialogQuotaAfterPurchase({
    dailyCap: 10, dailyCount: 10, extraCapToday: 0, resetAtMs, quotaVersion: 2,
  }, now, () => 0).observation).toEqual({
    remainingQuota: 10, resetAtMs, quotaVersion: 3,
  });
});
