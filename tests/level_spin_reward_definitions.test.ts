jest.mock('../app/xp_manager', () => ({ registerXP: jest.fn().mockResolvedValue({ finalDelta: 0 }) }));
jest.mock('../app/premium_guard', () => ({ getVerifiedPremiumStatus: jest.fn().mockResolvedValue(false) }));
jest.mock('../app/club_boosts', () => ({ grantClubGiftFreeBoostFromLevel: jest.fn() }));
jest.mock('../app/flashcards/marketplace', () => ({
  primeMarketplaceBuiltCardsCacheFromAccessibleStorage: jest.fn(),
  loadOwnedPackIds: jest.fn().mockResolvedValue([]),
  addOwnedPackId: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../app/flashcards/pack_trial_gift', () => ({ setRandomPackGiftTrial48h: jest.fn() }));
jest.mock('../app/firebase', () => ({}));
jest.mock('../app/config', () => ({
  ...jest.requireActual<typeof import('../app/config')>('../app/config'),
  IS_EXPO_GO: true,
  CLOUD_SYNC_ENABLED: false,
  SPANISH_UI_LOCALE_ENABLED: true,
}));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));

import { LEVEL_SPIN_REWARD_CATALOG } from '../app/level_spin_reward_catalog';
import {
  ALL_LEVEL_GIFT_DEFS,
  giftDescForLang,
  giftShardAmount,
  giftSpinTier,
  giftSpinTierUiLabel,
  giftTitleForLang,
} from '../app/level_gift_system';

const LANGS = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('level Spin v2 reward definitions', () => {
  test('every catalog reward has one resolvable localized definition', () => {
    for (const reward of LEVEL_SPIN_REWARD_CATALOG) {
      const matches = ALL_LEVEL_GIFT_DEFS.filter((gift) => gift.id === reward.id);
      expect(matches).toHaveLength(1);
      for (const lang of LANGS) {
        expect(giftTitleForLang(matches[0]!, lang).trim()).not.toBe('');
        expect(giftDescForLang(matches[0]!, lang).trim()).not.toBe('');
      }
    }
  });

  test('new rolls contain the approved random aura and all-custom-avatar rewards', () => {
    expect(LEVEL_SPIN_REWARD_CATALOG.filter((reward) => reward.id === 'cosmetic_avatar_aura')).toHaveLength(1);
    expect(LEVEL_SPIN_REWARD_CATALOG.filter((reward) => reward.id === 'cosmetic_avatar_common')).toHaveLength(1);
    expect(ALL_LEVEL_GIFT_DEFS.some((gift) => gift.id === 'cosmetic_avatar_common')).toBe(true);
    expect(ALL_LEVEL_GIFT_DEFS.some((gift) => gift.id === 'cosmetic_avatar_aura')).toBe(true);
  });

  test('defines the permanent all-attempt restore gift without an expiry', () => {
    const gift = ALL_LEVEL_GIFT_DEFS.find((candidate) => candidate.id === 'attempt_restore_all');
    expect(gift).toMatchObject({
      id: 'attempt_restore_all',
      titleRU: 'Второй шанс',
      descRU: 'Восстанавливает все 3 попытки во время сессии',
      spinTier: 'ordinary',
    });
    expect(JSON.stringify(gift)).not.toContain('expiresAt');
  });

  test('currency cards name pearls and the one unified star currency honestly', () => {
    const byId = new Map(ALL_LEVEL_GIFT_DEFS.map((gift) => [gift.id, gift]));
    expect(byId.get('pearls_500')?.titleRU).toBe('+500 жемчужин');
    expect(byId.get('stars_1000')?.titleRU).toBe('+1000 рун');
    expect(byId.get('plus_days_3')?.descRU).toContain('3 дня');
    expect(byId.get('plus_days_7')?.descRU).toContain('7 дней');
    expect(giftShardAmount('pearls_500')).toBe(500);
    expect(giftShardAmount('shards_10')).toBe(0);
  });

  test('new rewards have authored non-Spanish copy in all five planned locales', () => {
    const newIds = LEVEL_SPIN_REWARD_CATALOG.map(({ id }) => id).filter((id) => (
      /^xp_(?:500|1000|3000|5000|10000|25000|50000)$/.test(id)
      || /^(?:pearls|stars)_/.test(id)
      || /^plus_days_/.test(id)
    ));
    for (const id of newIds) {
      const gift = ALL_LEVEL_GIFT_DEFS.find((candidate) => candidate.id === id)!;
      for (const lang of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
        const localized = `${giftTitleForLang(gift, lang)}\n${giftDescForLang(gift, lang)}`;
        const spanish = `${giftTitleForLang(gift, 'es')}\n${giftDescForLang(gift, 'es')}`;
        expect(localized).not.toBe(spanish);
      }
    }
  });

  test('Spin presentation preserves all four v2 tiers without changing legacy rarity', () => {
    const legacy = ALL_LEVEL_GIFT_DEFS.find((gift) => gift.id === 'energy_plus2')!;
    expect(legacy.rarity).toBe('rare');
    expect(giftSpinTier(legacy)).toBe('ordinary');
    expect(giftSpinTierUiLabel({ ...legacy, spinTier: 'ultra' }, 'ru')).toContain('Ультра');
    expect(giftSpinTierUiLabel({ ...legacy, spinTier: 'exceptional' }, 'ru')).toContain('Исключ');
  });
});
