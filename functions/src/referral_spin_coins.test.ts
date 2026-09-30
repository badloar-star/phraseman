/**
 * D100 (владелец, 2026-09-30): владелец вечного Pro получает приз реферальной
 * рулетки МОНЕТАМИ (журнал stars_ledger) вместо жемчуга.
 *
 * Сторож держит три вещи: таблица монет совпадает по длине с лестницей дней и
 * влезает в предел одной операции журнала; причина 'referral_spin' — grant (не
 * двигает очки лиги) в строке «спин»; ключ операции детерминирован и проходит
 * формат журнала — иначе повтор спина начислил бы монеты второй раз или журнал
 * отверг бы операцию.
 */
import { referralSpinCoinOpId } from './referral_spin';
import { REFERRAL_SPIN_PRIZE_COINS, REFERRAL_SPIN_PRIZE_DAYS } from './referral_spin_logic';
import { STAR_OP_CLASS, STAR_OP_MAX_ABS_DELTA, STAR_OP_SOURCE } from './stars_ledger';

const OP_ID_FORMAT = /^[a-z0-9_]{1,32}:[A-Za-z0-9_.-]{1,96}$/;

describe('referral spin coins prize (D100)', () => {
  it('has one positive coin amount per prize index within the ledger delta cap', () => {
    expect(REFERRAL_SPIN_PRIZE_COINS).toHaveLength(REFERRAL_SPIN_PRIZE_DAYS.length);
    for (const amount of REFERRAL_SPIN_PRIZE_COINS) {
      expect(Number.isSafeInteger(amount)).toBe(true);
      expect(amount).toBeGreaterThan(0);
      expect(amount).toBeLessThanOrEqual(STAR_OP_MAX_ABS_DELTA);
    }
  });

  it('books the prize as a grant in the spin source row', () => {
    expect(STAR_OP_CLASS.referral_spin).toBe('grant');
    expect(STAR_OP_SOURCE.referral_spin).toBe('spin');
  });

  it('derives a deterministic ledger-valid operation id from spinRequestId', () => {
    const uuid = '3f1c2a8e-9b7d-4c1e-8f00-1234567890ab';
    const weird = 'x'.repeat(128) + '/../$#';
    expect(referralSpinCoinOpId(uuid)).toBe(referralSpinCoinOpId(uuid));
    expect(referralSpinCoinOpId(uuid)).not.toBe(referralSpinCoinOpId(`${uuid}-2`));
    expect(referralSpinCoinOpId(uuid)).toMatch(OP_ID_FORMAT);
    expect(referralSpinCoinOpId(weird)).toMatch(OP_ID_FORMAT);
  });
});
