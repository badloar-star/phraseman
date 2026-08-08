import {
  computeWagerPlacement,
  validateStreakWagerPlaceInput,
  type WagerPlacementReceipt,
} from './streak_wager';
import fs from 'fs';
import path from 'path';

const base = {
  tierIdx: 3,
  currentStreak: 12,
  balance: 20,
  giftDiscountCount: 1,
  premium: false,
  activeWager: null,
  existingReceipt: null,
  now: Date.UTC(2026, 7, 8),
};

describe('server-authoritative streak wager placement', () => {
  test('exports an authenticated AppCheck callable with a transactional receipt boundary', () => {
    const source = fs.readFileSync(path.join(__dirname, 'streak_wager.ts'), 'utf8');
    const index = fs.readFileSync(path.join(__dirname, 'index.ts'), 'utf8');
    expect(source).toContain('export const streakWagerPlace = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }');
    expect(source).toContain('resolveStableUidForAuth(db, request.auth.uid');
    expect(source).toContain('db.runTransaction(async (tx) =>');
    expect(source).toContain("collection('streak_wager_placements').doc(input.idempotencyKey)");
    expect(source).toContain('tx.create(receiptRef');
    expect(index).toContain("require('./streak_wager')");
    expect(index).toContain('exports.streakWagerPlace = streakWagerPlace');
  });

  test('rejects missing/invalid durable idempotency keys and malformed direct calls', () => {
    expect(validateStreakWagerPlaceInput({ tierIdx: 3, currentStreak: 12, idempotencyKey: '' }).ok).toBe(false);
    expect(validateStreakWagerPlaceInput({ tierIdx: 99, currentStreak: 12, idempotencyKey: 'wager_12345678' }).ok).toBe(false);
    expect(validateStreakWagerPlaceInput({ tierIdx: 3, currentStreak: -1, idempotencyKey: 'wager_12345678' }).ok).toBe(false);
    expect(validateStreakWagerPlaceInput({ tierIdx: 3, currentStreak: 12, idempotencyKey: 'wager_12345678' }))
      .toEqual({ ok: true, value: { tierIdx: 3, currentStreak: 12, idempotencyKey: 'wager_12345678' } });
  });

  test('atomically spends the discounted stake and consumes exactly one canonical voucher', () => {
    const result = computeWagerPlacement(base);
    expect(result).toMatchObject({
      ok: true,
      alreadyApplied: false,
      balanceAfter: 17,
      wagerDiscountCountAfter: 0,
      usedGiftDiscount: true,
    });
    expect(result.wager).toMatchObject({ active: true, tierIdx: 3, betShards: 3, startStreak: 12 });
  });

  test('two devices cannot consume one voucher or place two active wagers', () => {
    const first = computeWagerPlacement(base);
    const second = computeWagerPlacement({
      ...base,
      balance: first.balanceAfter,
      giftDiscountCount: first.wagerDiscountCountAfter,
      activeWager: first.wager,
    });
    expect(second).toMatchObject({ ok: false, error: 'already_active', balanceAfter: 17, wagerDiscountCountAfter: 0 });
  });

  test('lost response replays the exact placement without a second spend or consume', () => {
    const first = computeWagerPlacement(base);
    const receipt: WagerPlacementReceipt = {
      idempotencyKey: 'wager_12345678',
      response: first,
    };
    const replay = computeWagerPlacement({
      ...base,
      balance: first.balanceAfter,
      giftDiscountCount: first.wagerDiscountCountAfter,
      activeWager: first.wager,
      existingReceipt: receipt,
    });
    expect(replay).toEqual({ ...first, alreadyApplied: true });
  });

  test('Plus applies the discount without consuming a queued gift voucher', () => {
    expect(computeWagerPlacement({ ...base, premium: true })).toMatchObject({
      ok: true,
      balanceAfter: 17,
      wagerDiscountCountAfter: 1,
      usedGiftDiscount: false,
      premiumDiscount: true,
    });
  });

  test('insufficient shards makes no wager and consumes no voucher', () => {
    expect(computeWagerPlacement({ ...base, balance: 2 })).toMatchObject({
      ok: false,
      error: 'insufficient_shards',
      balanceAfter: 2,
      wagerDiscountCountAfter: 1,
      wager: null,
    });
  });
});
