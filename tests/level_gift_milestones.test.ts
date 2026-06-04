import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  applyGift,
  getMilestoneLevelGift,
  isFlashcardPackLevelGiftId,
  rollF2pLevelGiftForUser,
  rollPremiumLevelGiftForUser,
} from '../app/level_gift_system';
import {
  CUSTOM_AVATAR_GIFT_POOL,
  CUSTOM_AVATAR_SHOP,
  getCustomAvatarGiftWeight,
  isCustomAvatarGiftOnly,
  isCustomAvatarShardShop,
} from '../constants/custom_avatars';

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
  SPANISH_UI_LOCALE_ENABLED: true,
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

  it('source-gates pack gift milestones for French while preserving English legacy rewards', async () => {
    expect(getMilestoneLevelGift(25, { studyTarget: 'en' })?.id).toBe('pack_voucher_48h');
    expect(getMilestoneLevelGift(25, { studyTarget: 'fr' })?.id).toBe('shards_10');

    await expect(rollF2pLevelGiftForUser(25, { studyTarget: 'en' })).resolves.toMatchObject({ id: 'pack_voucher_48h' });
    await expect(rollF2pLevelGiftForUser(25, { studyTarget: 'fr' })).resolves.toMatchObject({ id: 'shards_10' });
  });

  it('does not roll English flashcard pack gifts from the French premium level chest', async () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.01);
    try {
      const gift = await rollPremiumLevelGiftForUser(30, { studyTarget: 'fr' });
      expect(isFlashcardPackLevelGiftId(gift.id)).toBe(false);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it('converts stale French pack gifts to safe shard rewards instead of opening English packs', async () => {
    const marketplace = jest.requireMock('../app/flashcards/marketplace') as {
      addOwnedPackId: jest.Mock;
    };
    const packTrialGift = jest.requireMock('../app/flashcards/pack_trial_gift') as {
      setRandomPackGiftTrial48h: jest.Mock;
    };

    const result = await applyGift({
      id: 'prem_level_unlock_negotiator',
      rarity: 'epic',
      icon: '🎁',
      weight: 1,
      titleRU: 'Набор «Negotiator»',
      titleUK: 'Набір «Negotiator»',
      titleES: 'Pack «Negotiator»',
      descRU: 'Полный набор добавлен к твоим карточкам — навсегда.',
      descUK: 'Повний набір додано до твоїх карток — назавжди.',
      descES: 'Todo el contenido ya está entre tus mazos, para siempre.',
    }, 'TestUser', 3, 5, jest.fn(), { isPremium: true, studyTarget: 'fr' });

    expect(result).toEqual({ success: true });
    expect(marketplace.addOwnedPackId).not.toHaveBeenCalled();
    expect(packTrialGift.setRandomPackGiftTrial48h).not.toHaveBeenCalled();
  });

  it('activates the one-time wager discount gift', async () => {
    const result = await applyGift({
      id: 'wager_discount_25',
      rarity: 'epic',
      icon: '🎲',
      weight: 1,
      titleRU: 'Скидка на пари −25%',
      titleUK: 'Знижка на пари −25%',
      titleES: '−25 % en la apuesta',
      descRU: 'Следующее пари дешевле',
      descUK: 'Наступне парі дешевше',
      descES: 'La siguiente apuesta cuesta menos',
    }, 'TestUser', 3, 5, jest.fn());

    expect(result).toEqual({ success: true });
    expect(mockStorage.wager_discount).toBe('0.25');
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

  it('unlocks a paid custom avatar gift when the catalog is populated', async () => {
    const gift = getMilestoneLevelGift(15)!;
    const result = await applyGift(gift, 'TestUser', 3, 5, jest.fn());

    const unlocked = result.cosmeticUnlocked;
    expect(CUSTOM_AVATAR_GIFT_POOL).toHaveLength(40);
    expect(unlocked).toMatchObject({ kind: 'avatar' });
    expect(CUSTOM_AVATAR_GIFT_POOL.some((avatar) => avatar.id === unlocked?.id)).toBe(true);
    expect(unlocked?.gradientId).toBeTruthy();
    expect(unlocked?.logoColor === 'black' || unlocked?.logoColor === 'white').toBe(true);
    expect(mockStorage.custom_avatar_gift_owned_v1).toBe(unlocked?.id);

    const owned = JSON.parse(mockStorage.custom_avatar_owned_v1 || '{}');
    expect(owned[unlocked!.id]).toBe(`${unlocked!.gradientId}:${unlocked!.logoColor}`);
    expect(mockStorage.avatar_aura_gift_owned_v1).toBeUndefined();
  });

  it('keeps people and animal avatars out of the shard shop', () => {
    expect(CUSTOM_AVATAR_SHOP).toHaveLength(22);
    expect(CUSTOM_AVATAR_SHOP.every((avatar) => !isCustomAvatarGiftOnly(avatar.id))).toBe(true);
    expect(CUSTOM_AVATAR_SHOP.every((avatar) => isCustomAvatarShardShop(avatar.id))).toBe(true);
    expect(CUSTOM_AVATAR_SHOP.some((avatar) => avatar.id === 'custom-gen-21')).toBe(false);
    expect(CUSTOM_AVATAR_SHOP.some((avatar) => avatar.id === 'custom-gen-41')).toBe(true);
    expect(CUSTOM_AVATAR_SHOP.some((avatar) => avatar.id === 'custom-gen-62')).toBe(true);
    expect(CUSTOM_AVATAR_GIFT_POOL.some((avatar) => isCustomAvatarGiftOnly(avatar.id))).toBe(true);
    expect(CUSTOM_AVATAR_GIFT_POOL.some((avatar) => avatar.id === 'custom-gen-41')).toBe(false);
    expect(CUSTOM_AVATAR_GIFT_POOL.some((avatar) => avatar.id === 'custom-gen-62')).toBe(false);
    expect(isCustomAvatarGiftOnly('custom-gen-31')).toBe(true);
    expect(getCustomAvatarGiftWeight('custom-gen-31')).toBeLessThan(getCustomAvatarGiftWeight('custom-gen-21'));
  });
});
