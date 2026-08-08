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

import fs from 'fs';
import path from 'path';

import { ALL_LEVEL_GIFT_DEFS } from '../app/level_gift_system';
import {
  LEVEL_GIFT_REWARD_ICON_IDS,
  LEVEL_GIFT_REWARD_ICON_SOURCES,
  getLevelGiftRewardIcon,
} from '../constants/levelGiftRewardIcons';

describe('level gift reward icons', () => {
  it('has a reward icon for every concrete level gift definition', () => {
    const iconIds = new Set(LEVEL_GIFT_REWARD_ICON_IDS);

    for (const gift of ALL_LEVEL_GIFT_DEFS) {
      expect(iconIds.has(gift.id)).toBe(true);
      expect(getLevelGiftRewardIcon(gift.id)).toBeTruthy();

      const assetPath = path.join(
        process.cwd(),
        'assets',
        'images',
        'level_gift_reward_icons',
        `${gift.id}.webp`,
      );
      expect(fs.existsSync(assetPath)).toBe(true);
    }
  });

  it('falls back to the choice reward icon for unknown gifts', () => {
    expect(getLevelGiftRewardIcon('unknown_gift')).toBe(getLevelGiftRewardIcon('choice_3_level'));
  });

  it('exports reward icon sources for startup preloading', () => {
    const preloadSources = new Set(LEVEL_GIFT_REWARD_ICON_SOURCES);

    for (const iconId of LEVEL_GIFT_REWARD_ICON_IDS) {
      expect(preloadSources.has(getLevelGiftRewardIcon(iconId))).toBe(true);
    }
  });

  it('keeps reward icons in the global image preload pipeline', () => {
    const preloadSource = fs.readFileSync(path.join(process.cwd(), 'app', 'image_preload.ts'), 'utf8');

    expect(preloadSource).toContain('LEVEL_GIFT_IMAGE_SOURCES');
    expect(preloadSource).toContain('LEVEL_GIFT_REWARD_ICON_SOURCES');
    expect(preloadSource).toContain('OSKOLOK_IMAGE_SOURCES');
    expect(preloadSource).toContain('...LEVEL_GIFT_IMAGE_SOURCES');
    expect(preloadSource).toContain('...LEVEL_GIFT_REWARD_ICON_SOURCES');
    expect(preloadSource).toContain('...OSKOLOK_IMAGE_SOURCES');
  });

  it('uses concrete reward icons in the gifts inventory card art slot', () => {
    const inventorySource = fs.readFileSync(path.join(process.cwd(), 'app', 'level_gifts_inventory.tsx'), 'utf8');

    expect(inventorySource).not.toContain("import LevelGiftArt");
    expect(inventorySource).toContain('getLevelGiftRewardIcon(primaryGift.id, themeMode)');
  });
});
