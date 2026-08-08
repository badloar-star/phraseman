import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  applyGift,
  getMilestoneLevelGift,
  isFlashcardPackLevelGiftId,
  premiumSafeLevelGiftId,
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
import { AVATAR_AURAS } from '../constants/avatar_auras';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  captureAccountGeneration,
  invalidateAccountGeneration,
  withAccountTransitionLock,
} from '../app/account_generation';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/xp_manager', () => ({ registerXP: jest.fn().mockResolvedValue({ finalDelta: 0 }) }));
jest.mock('../app/premium_guard', () => ({ getVerifiedPremiumStatus: jest.fn().mockResolvedValue(false) }));
jest.mock('../app/club_boosts', () => ({ grantClubGiftFreeBoostFromLevel: jest.fn() }));
jest.mock('../app/flashcards/marketplace', () => ({
  primeMarketplaceBuiltCardsCacheFromAccessibleStorage: jest.fn(),
  loadOwnedPackIds: jest.fn().mockResolvedValue([]),
  addOwnedPackId: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../app/flashcards/pack_trial_gift', () => ({ setRandomPackGiftTrial48h: jest.fn() }));
jest.mock('../app/community_packs/functionsClient', () => ({
  callLevelGiftReserve: jest.fn().mockRejectedValue(new Error('offline')),
  callLevelGiftActivatePackGift: jest.fn().mockRejectedValue(new Error('offline')),
  callFlashcardPackGiftRedeem: jest.fn().mockRejectedValue(new Error('offline')),
}));
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: jest.fn().mockRejectedValue(new Error('offline')) }));
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
  __resetAccountGenerationForTests();
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
  it('serializes a delayed account-A gift effect so the queued wipe leaves account B untouched', async () => {
    beginAccountGeneration('account-a');
    const accountToken = captureAccountGeneration();
    let releaseWrite!: () => void;
    let signalWriteStarted!: () => void;
    const writeGate = new Promise<void>((resolve) => { releaseWrite = resolve; });
    const writeStarted = new Promise<void>((resolve) => { signalWriteStarted = resolve; });
    (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
      if (key === 'wager_discount') {
        signalWriteStarted();
        await writeGate;
      }
      mockStorage[key] = value;
    });

    const applying = applyGift({
      id: 'wager_discount_25',
      rarity: 'epic',
      icon: 'gift',
      weight: 1,
      titleRU: 'A',
      titleUK: 'A',
      descRU: 'A',
      descUK: 'A',
    }, 'Account A', 3, 5, jest.fn(), { isPremium: false, accountToken });
    await writeStarted;
    invalidateAccountGeneration();
    const switchToB = withAccountTransitionLock(async () => {
      delete mockStorage.wager_discount;
      beginAccountGeneration('account-b');
      mockStorage.account_marker = 'account-b';
    });

    releaseWrite();
    await expect(applying).resolves.toEqual({ success: true });
    await expect(switchToB).resolves.toBeUndefined();
    expect(mockStorage.wager_discount).toBeUndefined();
    expect(mockStorage.account_marker).toBe('account-b');
  });

  it('returns guaranteed milestone gifts for key levels', async () => {
    await expect(rollF2pLevelGiftForUser(5)).resolves.toMatchObject({ id: 'xp_bank_150' });
    await expect(rollF2pLevelGiftForUser(10)).resolves.toMatchObject({ id: 'xp_bank_300' });
    await expect(rollF2pLevelGiftForUser(15)).resolves.toMatchObject({ id: 'cosmetic_avatar_common' });
    await expect(rollF2pLevelGiftForUser(25)).rejects.toThrow('offline');
    await expect(rollF2pLevelGiftForUser(35)).resolves.toMatchObject({ id: 'cosmetic_avatar_aura' });
    await expect(rollF2pLevelGiftForUser(40)).resolves.toMatchObject({ id: 'xp_bank_600' });
    await expect(rollF2pLevelGiftForUser(45)).resolves.toMatchObject({ id: 'cosmetic_avatar_aura' });
  });

  it('returns guaranteed milestone gifts beyond level 50', async () => {
    await expect(rollF2pLevelGiftForUser(55)).resolves.toMatchObject({ id: 'chain_shield_3' });
    await expect(rollF2pLevelGiftForUser(70)).resolves.toMatchObject({ id: 'xp_2x_48h' });
    await expect(rollF2pLevelGiftForUser(80)).resolves.toMatchObject({ id: 'cosmetic_avatar_aura' });
    await expect(rollF2pLevelGiftForUser(90)).rejects.toThrow('offline');
  });

  it('uses a dual-modal safe replacement for choice milestones', () => {
    expect(getMilestoneLevelGift(30)?.id).toBe('choice_3_level');
    expect(getMilestoneLevelGift(30, { premiumSafe: true })?.id).toBe('xp_bank_600');
    expect(getMilestoneLevelGift(50)?.id).toBe('choice_3_level');
    expect(getMilestoneLevelGift(60)?.id).toBe('choice_3_level');
    expect(getMilestoneLevelGift(100)?.id).toBe('choice_3_level');
    expect(getMilestoneLevelGift(100, { premiumSafe: true })?.id).toBe('xp_bank_600');
  });

  it('keeps the global pack voucher milestone available for both study targets', async () => {
    expect(getMilestoneLevelGift(25, { studyTarget: 'en' })?.id).toBe('pack_voucher_48h');
    expect(getMilestoneLevelGift(25, { studyTarget: 'fr' })?.id).toBe('pack_voucher_48h');
    expect(getMilestoneLevelGift(90, { studyTarget: 'en' })?.id).toBe('pack_voucher_48h');
    expect(getMilestoneLevelGift(90, { studyTarget: 'fr' })?.id).toBe('pack_voucher_48h');

    await expect(rollF2pLevelGiftForUser(25, { studyTarget: 'en' })).rejects.toThrow('offline');
    await expect(rollF2pLevelGiftForUser(25, { studyTarget: 'fr' })).rejects.toThrow('offline');
  });

  it('returns guaranteed non-pack milestones without identity or network access', async () => {
    await expect(rollF2pLevelGiftForUser(5)).resolves.toMatchObject({ id: 'xp_bank_150' });
    await expect(rollF2pLevelGiftForUser(15)).resolves.toMatchObject({ id: 'cosmetic_avatar_common' });
    await expect(rollF2pLevelGiftForUser(55)).resolves.toMatchObject({ id: 'chain_shield_3' });
  });

  it('falls back to non-access rewards when an ordinary random server roll is offline', async () => {
    const f2p = await rollF2pLevelGiftForUser(17);
    const premium = await rollPremiumLevelGiftForUser(17);
    expect(isFlashcardPackLevelGiftId(f2p.id)).toBe(false);
    expect(isFlashcardPackLevelGiftId(premium.id)).toBe(false);
  });

  it('never falls back to an energy or retired Arena reward for a Plus user while offline', async () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
    try {
      const gift = await rollF2pLevelGiftForUser(17, { premiumSafe: true });
      expect([
        'energy_full',
        'energy_plus1',
        'energy_plus2',
        'energy_plus3',
        'arena_extra_5',
        'choice_3_level',
      ]).not.toContain(gift.id);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it.each(['energy_full', 'energy_plus1', 'energy_plus2', 'energy_plus3', 'choice_3_level'])(
    'canonicalizes blocked Plus reward %s for replay and offline display',
    (giftId) => {
      expect(premiumSafeLevelGiftId(giftId)).not.toBe(giftId);
    },
  );

  it('sanitizes a replayed obsolete Plus reservation before it reaches the UI', async () => {
    const functionsClient = jest.requireMock('../app/community_packs/functionsClient') as {
      callLevelGiftReserve: jest.Mock;
    };
    const userIdPolicy = jest.requireMock('../app/user_id_policy') as {
      getCanonicalUserId: jest.Mock;
    };
    userIdPolicy.getCanonicalUserId.mockResolvedValueOnce('account-a');
    functionsClient.callLevelGiftReserve.mockResolvedValueOnce({
      reservationId: 'account-a_17_f2p_en',
      giftId: 'energy_full',
      replayed: true,
    });

    const gift = await rollF2pLevelGiftForUser(17, { premiumSafe: true, studyTarget: 'en' });

    expect(gift.id).not.toBe('energy_full');
    expect(gift.id).not.toBe('arena_extra_5');
  });

  it('does not roll the retired Arena reward for any user during an offline fallback', async () => {
    const randomSpy = jest.spyOn(Math, 'random')
      .mockReturnValueOnce(0.1)
      .mockReturnValueOnce(0.999);
    try {
      const gift = await rollF2pLevelGiftForUser(17);
      expect(gift.id).not.toBe('arena_extra_5');
    } finally {
      randomSpy.mockRestore();
    }
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

  it('converts an aura gift to XP when every gift aura is already owned', async () => {
    const { registerXP } = jest.requireMock('../app/xp_manager') as { registerXP: jest.Mock };
    mockStorage.avatar_aura_owned_v1 = JSON.stringify(Object.fromEntries(
      AVATAR_AURAS
        .filter(aura => !aura.premiumOnly && aura.unlockLevel === undefined)
        .map(aura => [aura.id, true]),
    ));

    const result = await applyGift(getMilestoneLevelGift(35)!, 'TestUser', 3, 5, jest.fn(), {
      occurrenceId: 'level:35:f2p',
    });

    expect(result).toEqual({ success: true });
    expect(registerXP).toHaveBeenCalledWith(
      350,
      'achievement_reward',
      'TestUser',
      'ru',
      undefined,
      expect.objectContaining({ payload: expect.objectContaining({ giftId: 'cosmetic_avatar_aura' }) }),
    );
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
