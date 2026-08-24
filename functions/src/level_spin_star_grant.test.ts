import { createHash } from 'node:crypto';
import {
  assertLevelSpinStarOwner,
  levelSpinStarGrant,
  levelSpinStarLedgerOperation,
  levelSpinStarReplayMatches,
  parseLevelSpinStarComposite,
  type LevelSpinStarComposite,
} from './level_spin_star_grant';

function composite(over: Partial<LevelSpinStarComposite> = {}): LevelSpinStarComposite {
  const lane = over.lane ?? 'base';
  const requestId = over.requestId ?? 'request0000000001';
  const giftId = over.giftId ?? 'stars_50';
  const amount = giftId === 'stars_50' ? 50 : giftId === 'stars_1000' ? 1_000 : 10;
  const ownerStableId = over.ownerStableId ?? 'account-a';
  const operationId = `level_spin:${requestId}.${lane}`;
  const requestFingerprint = createHash('sha256').update(JSON.stringify({
    schemaVersion: 1, ownerStableId, requestId, lane,
    deliveryToken: over.deliveryToken ?? null, giftId, amount,
    reason: 'level_spin_star_reward',
  })).digest('hex');
  return Object.freeze({
    schemaVersion: 'client-level-spin-star-operation.v1', operationId, ownerStableId,
    requestId, lane, ...(over.deliveryToken ? { deliveryToken: over.deliveryToken } : {}),
    giftId, amount, reason: 'level_spin_star_reward', createdAtMs: 1_800_000_000_000,
    requestFingerprint,
    grant: Object.freeze({ kind: 'star_credit', subjectId: operationId, payload: Object.freeze({
      requestId, lane, giftId, amount,
    }) }),
    ...over,
  });
}

const invoke = (auth: { uid: string; token: Record<string, unknown> } | undefined, data: unknown) => (
  levelSpinStarGrant.run({
    auth, data, rawRequest: { headers: {} }, app: undefined, instanceIdToken: undefined,
  } as never)
);

test('rejects unauthenticated exact and legacy requests before persistence', async () => {
  await expect(invoke(undefined, { operation: composite() }))
    .rejects.toMatchObject({ code: 'unauthenticated', message: 'auth_required' });
  await expect(invoke(undefined, { requestId: 'request0000000001', giftId: 'stars_50' }))
    .rejects.toMatchObject({ code: 'unauthenticated', message: 'auth_required' });
});

test('accepts only the closed exact composite and derives one stable ledger operation', () => {
  const exact = parseLevelSpinStarComposite(composite());
  expect(levelSpinStarLedgerOperation(exact)).toEqual(expect.objectContaining({
    opId: 'level_spin:request0000000001.base', delta: 50,
    reason: 'level_spin_grant', sourceKind: 'level_spin_client_composite',
    sourceId: 'request0000000001.base',
    meta: expect.objectContaining({ clientFingerprint: exact.requestFingerprint, giftId: 'stars_50', lane: 'base' }),
  }));
});

test.each([
  ['legacy request/gift payload', { requestId: 'request0000000001', lane: 'base', giftId: 'stars_50' }],
  ['unauthorized short request id', composite({ requestId: 'attacker' })],
  ['forged short delivery token', composite({ deliveryToken: 'forged-token' })],
  ['unknown field', { ...composite(), mintedByClient: true }],
  ['wrong gift amount', { ...composite(), giftId: 'stars_1000', amount: 1_000 }],
  ['wrong lane/op id', { ...composite(), lane: 'premium' }],
  ['wrong fingerprint', { ...composite(), requestFingerprint: 'a'.repeat(64) }],
  ['wrong owner shape', { ...composite(), ownerStableId: 'account/a' }],
])('rejects malformed or self-inconsistent operation: %s', (_name, value) => {
  expect(() => parseLevelSpinStarComposite(value)).toThrow();
});

test('authenticated stable identity cannot persist another owner composite', () => {
  expect(() => assertLevelSpinStarOwner('account-b', composite({ ownerStableId: 'account-a' })))
    .toThrow('level_spin_star_owner_mismatch');
  expect(() => assertLevelSpinStarOwner('account-a', composite({ ownerStableId: 'account-a' })))
    .not.toThrow();
});

test('exact replay matches immutable receipt while wrong gift, lane, or fingerprint conflicts', () => {
  const exact = composite();
  const operation = levelSpinStarLedgerOperation(exact);
  const receipt = {
    ...operation,
    balanceAfter: 50,
    earnedTotalAfter: 0,
  };
  expect(levelSpinStarReplayMatches(receipt, exact)).toBe(true);
  expect(levelSpinStarReplayMatches({ ...receipt, meta: { ...receipt.meta, giftId: 'stars_1000' } }, exact)).toBe(false);
  expect(levelSpinStarReplayMatches({ ...receipt, sourceId: 'request0000000001.premium' }, exact)).toBe(false);
  expect(levelSpinStarReplayMatches({ ...receipt, meta: { ...receipt.meta, clientFingerprint: 'b'.repeat(64) } }, exact)).toBe(false);
});

test('base and premium lanes cannot collide in the unified ledger', () => {
  const base = levelSpinStarLedgerOperation(composite({ lane: 'base' }));
  const premium = levelSpinStarLedgerOperation(composite({ lane: 'premium' }));
  expect(base.opId).toBe('level_spin:request0000000001.base');
  expect(premium.opId).toBe('level_spin:request0000000001.premium');
  expect(base.opId).not.toBe(premium.opId);
});
