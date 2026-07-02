import { activationRewardForPlan, generateActivationCode } from './web_checkout';

describe('activationRewardForPlan', () => {
  it('monthly → 31 день', () => {
    expect(activationRewardForPlan('monthly')).toEqual({ rewardDays: 31, rewardKind: 'days' });
  });
  it('yearly → 366 дней', () => {
    expect(activationRewardForPlan('yearly')).toEqual({ rewardDays: 366, rewardKind: 'days' });
  });
  it('lifetime → бессрочный VIP', () => {
    expect(activationRewardForPlan('lifetime')).toEqual({ rewardDays: 0, rewardKind: 'lifetime' });
  });
});

describe('generateActivationCode', () => {
  it('формат WEB-XXXXXXXXXX, совместим с promoCodeRedeem (CODE_RE), без похожих символов', () => {
    for (let i = 0; i < 50; i += 1) {
      const code = generateActivationCode();
      // Тот же контракт, что CODE_RE в promo_codes.ts: A-Z 0-9 _ - длиной 3..32.
      expect(code).toMatch(/^WEB-[A-HJ-NP-Z2-9]{10}$/);
      expect(code).not.toMatch(/[01IO]/);
      expect(code.length).toBeLessThanOrEqual(32);
    }
  });
  it('коды не повторяются', () => {
    const seen = new Set(Array.from({ length: 200 }, () => generateActivationCode()));
    expect(seen.size).toBe(200);
  });
});
