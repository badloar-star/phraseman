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
import { LEVEL_GIFT_REWARD_ICON_IDS } from '../constants/levelGiftRewardIcons';

describe('level gift reward art', () => {
  it('preserves every reward id as a data contract', () => {
    const iconIds = new Set(LEVEL_GIFT_REWARD_ICON_IDS);
    for (const gift of ALL_LEVEL_GIFT_DEFS) expect(iconIds.has(gift.id)).toBe(true);
  });

  it('removes gift raster sources from the preload pipeline', () => {
    const preload = fs.readFileSync(path.join(process.cwd(), 'app', 'image_preload.ts'), 'utf8');
    expect(preload).not.toContain('LEVEL_GIFT_IMAGE_SOURCES');
    expect(preload).not.toContain('LEVEL_GIFT_REWARD_ICON_SOURCES');
    expect(preload).toContain('OSKOLOK_IMAGE_SOURCES');
  });

  it('uses universal Level Spin art at every gift render site', () => {
    for (const file of [
      'components/LevelGiftModal.tsx',
      'components/LevelGiftDualModal.tsx',
      'components/LevelSpinRewardModal.tsx',
      'components/LevelSpinFinishLine.tsx',
      'app/level_gifts_inventory.tsx',
    ]) {
      const component = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
      expect(component).toContain('LevelSpinRewardArt');
      expect(component).not.toContain('<RetiredRasterFallback');
    }
    const inventory = fs.readFileSync(path.join(process.cwd(), 'app/level_gifts_inventory.tsx'), 'utf8');
    expect(inventory).not.toContain('oskolokImageForPackShards');
  });
});
