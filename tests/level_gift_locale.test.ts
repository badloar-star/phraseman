jest.mock('../app/xp_manager', () => ({ registerXP: jest.fn().mockResolvedValue({ finalDelta: 0 }) }));
jest.mock('../app/premium_guard', () => ({ getVerifiedPremiumStatus: jest.fn().mockResolvedValue(false) }));
jest.mock('../app/arena_daily_limit', () => ({ addArenaPlaysBonusForToday: jest.fn() }));
jest.mock('../app/club_boosts', () => ({ grantClubGiftFreeBoostFromLevel: jest.fn() }));
jest.mock('../app/flashcards/marketplace', () => ({ primeMarketplaceBuiltCardsCacheFromAccessibleStorage: jest.fn() }));
jest.mock('../app/flashcards/pack_trial_gift', () => ({ setRandomPackGiftTrial48h: jest.fn() }));
jest.mock('../app/firebase', () => ({}));
jest.mock('../app/config', () => ({ IS_EXPO_GO: true, CLOUD_SYNC_ENABLED: false }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));

import {
  ALL_LEVEL_GIFT_DEFS,
  giftDescForLang,
  giftTitleForLang,
  type GiftDef,
} from '../app/level_gift_system';

describe('level_gift_system — ES locale coverage', () => {
  it('each gift resolves non-empty Spanish title and description via accessors', () => {
    for (const g of ALL_LEVEL_GIFT_DEFS) {
      const title = giftTitleForLang(g, 'es').trim();
      const desc = giftDescForLang(g, 'es').trim();
      expect(title.length).toBeGreaterThan(0);
      expect(desc.length).toBeGreaterThan(0);
    }
  });

  it('giftTitleForLang / giftDescForLang(es) matches stored ES strings when present', () => {
    for (const g of ALL_LEVEL_GIFT_DEFS) {
      const titleEs = g.titleES ?? g.titleRU;
      const descEs = g.descES ?? g.descRU;
      expect(giftTitleForLang(g, 'es')).toBe(titleEs);
      expect(giftDescForLang(g, 'es')).toBe(descEs);
    }
  });

  it('RU and UK accessors stay aligned with source fields', () => {
    const pick = (g: GiftDef) => ({
      ru: { t: g.titleRU, d: g.descRU },
      uk: { t: g.titleUK, d: g.descUK },
    });
    for (const g of ALL_LEVEL_GIFT_DEFS) {
      const src = pick(g);
      expect(giftTitleForLang(g, 'ru')).toBe(src.ru.t);
      expect(giftDescForLang(g, 'ru')).toBe(src.ru.d);
      expect(giftTitleForLang(g, 'uk')).toBe(src.uk.t);
      expect(giftDescForLang(g, 'uk')).toBe(src.uk.d);
    }
  });
});
