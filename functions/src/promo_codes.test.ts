import {
  buildPromoVipPatch,
  buildPromoCodeDeletePlan,
  decidePromoRedemption,
  normalizePromoCode,
  type PromoCodeDoc,
} from './promo_codes';

function code(over: Partial<PromoCodeDoc> = {}): PromoCodeDoc {
  return { rewardDays: 7, rewardKind: 'days', enabled: true, maxRedemptions: 0, usedCount: 0, expiresAtMs: 0, ...over };
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
      .toEqual({ ok: true, rewardDays: 30, rewardKind: 'days' });
  });

  it('глобальный флаг выключен → promo_disabled', () => {
    expect(decidePromoRedemption({ code: code({ rewardDays: 30 }), alreadyRedeemed: false, nowMs: now, globallyEnabled: false }))
      .toEqual({ ok: false, reason: 'promo_disabled' });
  });

  it('lifetime код → ok без дней, но с rewardKind lifetime', () => {
    expect(decidePromoRedemption({ code: code({ rewardDays: 0, rewardKind: 'lifetime' }), alreadyRedeemed: false, nowMs: now }))
      .toEqual({ ok: true, rewardDays: 0, rewardKind: 'lifetime' });
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

describe('buildPromoVipPatch', () => {
  const dayMs = 24 * 60 * 60 * 1000;
  const now = 1_700_000_000_000;

  it('дневной промокод сразу включает Plus на выбранный срок', () => {
    const patch = buildPromoVipPatch(undefined, now, 30, 'days', 'TEST30');

    expect(patch).toMatchObject({
      vip_active: 'true',
      vip_plan: 'promo',
      vip_from: String(now),
      vip_until: String(now + 30 * dayMs),
      vip_admin_override: 'true',
      vip_admin_grant_at: String(now),
      promo_vip_last_code: 'TEST30',
    });
  });

  it('промокод докидывает дни к уже активному будущему Plus', () => {
    const currentUntil = now + 10 * dayMs;
    const patch = buildPromoVipPatch({ vip_until: String(currentUntil) }, now, 30, 'days', 'STACK30');

    expect(patch.vip_plan).toBe('promo');
    expect(patch.vip_until).toBe(String(currentUntil + 30 * dayMs));
  });

  it('lifetime промокод включает бессрочный Plus tier', () => {
    const patch = buildPromoVipPatch(undefined, now, 0, 'lifetime', 'FOREVER');

    expect(patch.vip_active).toBe('true');
    expect(patch.vip_plan).toBe('promo_lifetime');
    expect(patch.vip_until).toBe('0');
    expect(patch.promo_vip_last_code).toBe('FOREVER');
  });
});

describe('promo code deletion', () => {
  const nowMs = Date.UTC(2026, 7, 1, 12, 0, 0);

  it('builds an audit plan for an ordinary promo code', () => {
    expect(buildPromoCodeDeletePlan({
      code: 'WELCOME7',
      promo: code({ rewardDays: 30, maxRedemptions: 1 }),
      giftCertificateExists: false,
      nowMs,
      actorUid: 'owner-uid',
      actorEmail: 'owner@example.com',
      reason: 'Campaign retired',
    })).toEqual({
      code: 'WELCOME7',
      auditDoc: {
        action: 'promo_code_delete',
        targetUid: 'WELCOME7',
        reason: 'Campaign retired',
        details: {
          enabled: true,
          maxRedemptions: 1,
          rewardDays: 30,
          rewardKind: 'days',
          usedCount: 0,
        },
        adminEmail: 'owner@example.com',
        adminUid: 'owner-uid',
        ts: new Date(nowMs).toISOString(),
      },
    });
  });

  it.each([
    ['linked certificate document', code(), true],
    ['certificate identity marker', { ...code(), certificateId: 'GIFT-7QW8E9R2TY' }, false],
    ['certificate batch marker', { ...code(), certificateBatchId: 'gift-batch-1' }, false],
    ['certificate product marker', { ...code(), certificateProduct: 'yearly' }, false],
  ])('refuses a gift-backed code detected by %s', (_label, promo, giftCertificateExists) => {
    expect(() => buildPromoCodeDeletePlan({
      code: 'GIFT-7QW8E9R2TY',
      promo,
      giftCertificateExists,
      nowMs,
      actorUid: 'owner-uid',
      actorEmail: 'owner@example.com',
      reason: '',
    })).toThrow('gift_backed_promo_delete_forbidden');
  });
});
