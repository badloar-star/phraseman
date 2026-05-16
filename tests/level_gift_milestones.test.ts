import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  applyGift,
  getMilestoneLevelGift,
  rollF2pLevelGiftForUser,
} from '../app/level_gift_system';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/xp_manager', () => ({ registerXP: jest.fn().mockResolvedValue({ finalDelta: 0 }) }));
jest.mock('../app/premium_guard', () => ({ getVerifiedPremiumStatus: jest.fn().mockResolvedValue(false) }));
jest.mock('../app/arena_daily_limit', () => ({ addArenaPlaysBonusForToday: jest.fn() }));
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
  ENABLE_SPANISH_LOCALE: true,
}));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));

const mockStorage: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation((k: string) =>
    Promise.resolve(mockStorage[k] ?? null)
  );
  (AsyncStorage.setItem as jest.Mock).mockImplementation((k: string, v: string) => {
    mockStorage[k] = v;
    return Promise.resolve();
  });
  (AsyncStorage.multiSet as jest.Mock).mockImplementation((pairs: Array<[string, string]>) => {
    for (const [k, v] of pairs) mockStorage[k] = v;
    return Promise.resolve();
  });
});

describe('level gift milestone rewards', () => {
  it('returns guaranteed milestone gifts for key levels', async () => {
    await expect(rollF2pLevelGiftForUser(5)).resolves.toMatchObject({ id: 'xp_bank_150' });
    await expect(rollF2pLevelGiftForUser(15)).resolves.toMatchObject({ id: 'cosmetic_avatar_common' });
    await expect(rollF2pLevelGiftForUser(25)).resolves.toMatchObject({ id: 'pack_voucher_48h' });
    await expect(rollF2pLevelGiftForUser(35)).resolves.toMatchObject({ id: 'cosmetic_avatar_aura' });
    await expect(rollF2pLevelGiftForUser(40)).resolves.toMatchObject({ id: 'xp_bank_600' });
    await expect(rollF2pLevelGiftForUser(45)).resolves.toMatchObject({ id: 'cosmetic_avatar_aura' });
  });

  it('uses a dual-modal safe replacement for choice milestones', () => {
    expect(getMilestoneLevelGift(30)?.id).toBe('choice_3_level');
    expect(getMilestoneLevelGift(30, { premiumSafe: true })?.id).toBe('xp_bank_600');
  });

  it('unlocks and activates an avatar aura gift', async () => {
    const gift = getMilestoneLevelGift(35)!;
    const result = await applyGift(gift, 'TestUser', 3, 5, jest.fn());

    const owned = JSON.parse(mockStorage.avatar_aura_owned_v1 || '{}');
    const activeAura = mockStorage.user_avatar_aura;
    expect(activeAura).toBeTruthy();
    expect(owned[activeAura]).toBe(true);
    expect(mockStorage.avatar_aura_gift_owned_v1).toBe(activeAura);
    expect(result.cosmeticUnlocked).toMatchObject({
      kind: 'aura',
      id: activeAura,
    });
    expect(result.cosmeticUnlocked?.labelRu).toBeTruthy();
  });

  it('unlocks a gifted custom avatar with preview style metadata', async () => {
    const gift = getMilestoneLevelGift(15)!;
    const result = await applyGift(gift, 'TestUser', 3, 5, jest.fn());

    const unlocked = result.cosmeticUnlocked;
    expect(unlocked).toMatchObject({ kind: 'avatar' });
    expect(unlocked?.id).toBeTruthy();
    expect(unlocked?.gradientId).toBeTruthy();
    expect(unlocked?.logoColor === 'black' || unlocked?.logoColor === 'white').toBe(true);
    expect(mockStorage.custom_avatar_gift_owned_v1).toBe(unlocked?.id);

    const owned = JSON.parse(mockStorage.custom_avatar_owned_v1 || '{}');
    expect(owned[unlocked!.id]).toBe(`${unlocked!.gradientId}:${unlocked!.logoColor}`);
  });
});
