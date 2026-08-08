import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  rollGift,
  applyGift,
  ALL_LEVEL_GIFT_DEFS,
  GIFT_POOL,
  GiftDef,
  getBonusHintsToday,
  giftDisplayTitleForLang,
  giftLocaleStrings,
  giftRarityUiLabel,
} from '../app/level_gift_system';
import { getShardsBalance } from '../app/shards_system';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  captureAccountGeneration,
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
  (AsyncStorage.removeItem as jest.Mock).mockImplementation((k: string) => {
    delete mockStorage[k];
    return Promise.resolve();
  });
});

describe('level_gift_system — shards_3', () => {
  it('shards_3 присутствует в GIFT_POOL как common', () => {
    const gift = GIFT_POOL.find((g: GiftDef) => g.id === 'shards_3');
    expect(gift).toBeDefined();
    expect(gift!.rarity).toBe('common');
    expect(gift!.weight).toBe(7);
  });

  // зачем (2026-08-02, владелец): «+жемчужины» платили 0 — обман. Бывшие жемчужные подарки
  // теперь честно начисляют мгновенный XP и не трогают баланс жемчуга.
  it('applyGift shards_3 начисляет +150 XP и не трогает баланс жемчуга', async () => {
    const { registerXP } = jest.requireMock('../app/xp_manager') as { registerXP: jest.Mock };
    const gift = GIFT_POOL.find((g: GiftDef) => g.id === 'shards_3')!;
    const result = await applyGift(gift, 'TestUser', 3, 5, jest.fn());
    expect(result.success).toBe(true);
    expect(registerXP).toHaveBeenCalledWith(
      150,
      'achievement_reward',
      'TestUser',
      'ru',
      undefined,
      expect.objectContaining({
        payload: expect.objectContaining({ giftId: 'shards_3', surface: 'level_gift' }),
      }),
    );
    await expect(getShardsBalance()).resolves.toBe(0);
  });

  it('uses the gift occurrence in the XP event id so equal gifts from two levels both apply', async () => {
    const { registerXP } = jest.requireMock('../app/xp_manager') as { registerXP: jest.Mock };
    const gift = GIFT_POOL.find((g: GiftDef) => g.id === 'shards_3')!;

    await applyGift(gift, 'TestUser', 3, 5, jest.fn(), { occurrenceId: 'level:7:f2p' });
    await applyGift(gift, 'TestUser', 3, 5, jest.fn(), { occurrenceId: 'level:8:f2p' });

    const firstEventId = registerXP.mock.calls[0]?.[5]?.eventId;
    const secondEventId = registerXP.mock.calls[1]?.[5]?.eventId;
    expect(firstEventId).toContain('level:7:f2p');
    expect(secondEventId).toContain('level:8:f2p');
    expect(secondEventId).not.toBe(firstEventId);
  });

  it('бывшие жемчужные подарки не пишут в хранилище баланса жемчуга', async () => {
    const { registerXP } = jest.requireMock('../app/xp_manager') as { registerXP: jest.Mock };
    mockStorage['shards_balance'] = '5';
    const gift = GIFT_POOL.find((g: GiftDef) => g.id === 'shards_6')!;
    const result = await applyGift(gift, 'TestUser', 3, 5, jest.fn());
    expect(result.success).toBe(true);
    expect(registerXP).toHaveBeenCalledWith(
      350,
      'achievement_reward',
      'TestUser',
      'ru',
      undefined,
      expect.objectContaining({
        payload: expect.objectContaining({ giftId: 'shards_6', surface: 'level_gift' }),
      }),
    );
    // Баланс в сторадже не тронут: XP-подарок не имеет права писать в жемчуг.
    expect(mockStorage['shards_balance']).toBe('5');
  });

  it('completes the token-bound XP grant without re-entering the transition lock', async () => {
    beginAccountGeneration('account-a');
    const accountToken = captureAccountGeneration();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const gift = GIFT_POOL.find((g: GiftDef) => g.id === 'shards_3')!;
      const result = await Promise.race([
        applyGift(gift, 'TestUser', 3, 5, jest.fn(), { isPremium: false, accountToken }),
        new Promise<'timeout'>((resolve) => { timeout = setTimeout(() => resolve('timeout'), 1000); }),
      ]);

      expect(result).toEqual({ success: true });
      await expect(getShardsBalance()).resolves.toBe(0);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  });

  it('keeps bonus lesson hints isolated between English legacy and French', async () => {
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2026-05-20T12:00:00.000Z');
    const gift = GIFT_POOL.find((g: GiftDef) => g.id === 'hint_1')!;

    await applyGift(gift, 'TestUser', 3, 5, jest.fn(), { studyTarget: 'en' });
    await applyGift(gift, 'TestUser', 3, 5, jest.fn(), { studyTarget: 'fr' });
    await applyGift(gift, 'TestUser', 3, 5, jest.fn(), { studyTarget: 'fr' });

    expect(mockStorage['bonus_hints_2026-05-20']).toBe('1');
    expect(mockStorage['lesson_rewards_v2::fr::bonus_hints_2026-05-20']).toBe('2');
    await expect(getBonusHintsToday('en')).resolves.toBe(1);
    await expect(getBonusHintsToday('fr')).resolves.toBe(2);
  });

  it('giftLocaleStrings возвращает ES для подарков с переводами', () => {
    const gift = GIFT_POOL.find((g: GiftDef) => g.id === 'hint_1')!;
    expect(giftLocaleStrings('es', gift).title).toContain('pista');
    expect(giftLocaleStrings('ru', gift).title).toContain('подсказ');
  });

  it('giftRarityUiLabel — рядок редкости для es', () => {
    expect(giftRarityUiLabel('epic', 'es')).toContain('Épico');
    expect(giftRarityUiLabel('common', 'ru')).toBeTruthy();
  });

  it('premium XP gifts keep Plus as a badge, not as title text', () => {
    const gift = ALL_LEVEL_GIFT_DEFS.find((g: GiftDef) => g.id === 'prem_shards_15')!;

    expect(giftDisplayTitleForLang(gift, 'ru')).toBe('+800 XP');
    expect(giftDisplayTitleForLang(gift, 'es')).toBe('+800 XP');
    expect(giftDisplayTitleForLang(gift, 'pt-BR')).toBe('+800 XP');
    expect(giftDisplayTitleForLang(gift, 'ru')).not.toMatch(/плюс/i);
    expect(giftDisplayTitleForLang(gift, 'es')).not.toMatch(/plus/i);
  });

  // Контракт честности: ни одна карточка пулов не обещает жемчуг/осколки —
  // выплата валюты из level-gift отключена §7, обещание было бы обманом.
  it('ни один подарок пула не обещает жемчуг или осколки в заголовке', () => {
    const currencyPromise = /жемчуж|перлин|осколк|perla|pérola/i;
    for (const g of ALL_LEVEL_GIFT_DEFS) {
      expect(`${g.titleRU} ${g.titleUK} ${g.titleES ?? ''}`).not.toMatch(currencyPromise);
      for (const choice of g.choices ?? []) {
        expect(`${choice.titleRU} ${choice.titleUK} ${choice.titleES ?? ''}`).not.toMatch(currencyPromise);
      }
    }
  });
});

describe('level_gift_system — rollGift', () => {
  it('на обычном уровне может выпасть rare', () => {
    jest.spyOn(Math, 'random')
      .mockReturnValueOnce(0.7)   // rarityRoll → rare (0.60–0.90)
      .mockReturnValueOnce(0.5);
    const gift = rollGift(5);
    expect(gift.rarity).toBe('rare');
  });

  it('на круглом уровне (10) выпадает только rare или epic', () => {
    for (let i = 0; i < 20; i++) {
      const gift = rollGift(10);
      expect(['rare', 'epic']).toContain(gift.rarity);
    }
  });

  it('rollGift всегда возвращает валидный подарок', () => {
    for (let i = 1; i <= 50; i++) {
      const gift = rollGift(i);
      expect(gift).toBeDefined();
      expect(gift.id).toBeTruthy();
    }
  });
});
