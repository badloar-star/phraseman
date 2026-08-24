import {
  getPaywallCopy,
  getHeroPlannedCopy,
  applyWinBackCopy,
  applyWinBackPlannedCopy,
} from '../app/paywall_copy';

// «Некоторые пейволы имеют неактуальный захардкоженный текст»: после премиум→фри
// в feature paywall был первичный CTA вместо «верни доступ».
// applyWinBackCopy централизованно подменяет заголовок для вернувшегося юзера.

describe('paywall win-back copy', () => {
  it('returns original copy when user never had premium', () => {
    const base = getPaywallCopy('flashcard_limit');
    expect(applyWinBackCopy(base, 'flashcard_limit', false)).toBe(base);
  });

  it('replaces a first-time feature title with win-back for a returning user', () => {
    const base = getPaywallCopy('flashcard_limit');
    const out = applyWinBackCopy(base, 'flashcard_limit', true);
    expect(out.titleRu).toBe('Верни полный доступ Plus');
    expect(out.titleUk).toBe('Поверни повний доступ Plus');
    expect(out.titleEs).toBe('Recupera tu acceso Plus completo');
  });

  it('keeps the subtitle untouched (it describes what Premium gives)', () => {
    const base = getPaywallCopy('flashcard_limit');
    const out = applyWinBackCopy(base, 'flashcard_limit', true);
    expect(out.subtitleRu).toBe(base.subtitleRu);
    expect(out.subtitleUk).toBe(base.subtitleUk);
    expect(out.subtitleEs).toBe(base.subtitleEs);
  });

  it('does NOT double-apply on contexts that are already about returning', () => {
    for (const ctx of ['premium_expired', 'vip_expired', 'intro_ended', 'notification_upsell', 'generic']) {
      const base = getPaywallCopy(ctx);
      expect(applyWinBackCopy(base, ctx, true)).toBe(base);
    }
  });

  it('also applies win-back to several other feature contexts', () => {
    for (const ctx of ['flashcard_training', 'flashcard_limit', 'streak']) {
      const base = getPaywallCopy(ctx);
      const out = applyWinBackCopy(base, ctx, true);
      expect(out.titleRu).toBe('Верни полный доступ Plus');
    }
  });

  it('swaps planned-locale title for returning user, keeps planned subtitle', () => {
    const planned = getHeroPlannedCopy('flashcard_limit', 0);
    const out = applyWinBackPlannedCopy(planned, 'flashcard_limit', true);
    expect(out.title['pt-BR']).toBe('Recupere seu acesso Plus completo');
    expect(out.title.tr).toBe('Tüm Plus erişimini geri kazan');
    expect(out.subtitle).toBe(planned.subtitle);
  });

  it('planned: no change for never-premium or already-return contexts', () => {
    const planned = getHeroPlannedCopy('flashcard_limit', 0);
    expect(applyWinBackPlannedCopy(planned, 'flashcard_limit', false)).toBe(planned);
    const expired = getHeroPlannedCopy('premium_expired', 0);
    expect(applyWinBackPlannedCopy(expired, 'premium_expired', true)).toBe(expired);
  });
});
