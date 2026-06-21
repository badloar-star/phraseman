import {
  decidePromoRedemption,
  normalizePromoCode,
  type PromoCodeDoc,
} from './promo_codes';

function code(over: Partial<PromoCodeDoc> = {}): PromoCodeDoc {
  return { rewardDays: 7, enabled: true, maxRedemptions: 0, usedCount: 0, expiresAtMs: 0, ...over };
}

describe('normalizePromoCode', () => {
  it('trim + upper', () => {
    expect(normalizePromoCode('  welcome7 ')).toBe('WELCOME7');
    expect(normalizePromoCode('Free-Month')).toBe('FREE-MONTH');
  });
  it('пусто/мусор → пустая строка', () => {
    expect(normalizePromoCode(undefined)).toBe('');
    expect(normalizePromoCode(null)).toBe('');
  });
});

describe('decidePromoRedemption', () => {
  const now = 1_700_000_000_000;

  it('валидный код → ok с дням награды', () => {
    expect(decidePromoRedemption({ code: code({ rewardDays: 30 }), alreadyRedeemed: false, nowMs: now }))
      .toEqual({ ok: true, rewardDays: 30 });
  });

  it('нет кода → not_found', () => {
    expect(decidePromoRedemption({ code: null, alreadyRedeemed: false, nowMs: now }))
      .toEqual({ ok: false, reason: 'not_found' });
  });

  it('выключенный код → disabled', () => {
    expect(decidePromoRedemption({ code: code({ enabled: false }), alreadyRedeemed: false, nowMs: now }))
      .toEqual({ ok: false, reason: 'disabled' });
  });

  it('истёкший код → expired (0 = бессрочно)', () => {
    expect(decidePromoRedemption({ code: code({ expiresAtMs: now - 1 }), alreadyRedeemed: false, nowMs: now }))
      .toEqual({ ok: false, reason: 'expired' });
    // 0 = бессрочно → не истекает
    expect(decidePromoRedemption({ code: code({ expiresAtMs: 0 }), alreadyRedeemed: false, nowMs: now }).ok).toBe(true);
  });

  it('юзер уже активировал → already_redeemed', () => {
    expect(decidePromoRedemption({ code: code(), alreadyRedeemed: true, nowMs: now }))
      .toEqual({ ok: false, reason: 'already_redeemed' });
  });

  it('лимит активаций исчерпан → limit_reached (0 = без лимита)', () => {
    expect(decidePromoRedemption({ code: code({ maxRedemptions: 5, usedCount: 5 }), alreadyRedeemed: false, nowMs: now }))
      .toEqual({ ok: false, reason: 'limit_reached' });
    // 0 = без лимита → не упирается
    expect(decidePromoRedemption({ code: code({ maxRedemptions: 0, usedCount: 9999 }), alreadyRedeemed: false, nowMs: now }).ok).toBe(true);
  });

  it('нулевая/отрицательная награда → bad_reward', () => {
    expect(decidePromoRedemption({ code: code({ rewardDays: 0 }), alreadyRedeemed: false, nowMs: now }))
      .toEqual({ ok: false, reason: 'bad_reward' });
  });

  it('приоритет проверок: disabled раньше лимита/срока', () => {
    expect(decidePromoRedemption({ code: code({ enabled: false, expiresAtMs: now - 1 }), alreadyRedeemed: true, nowMs: now }))
      .toEqual({ ok: false, reason: 'disabled' });
  });
});
