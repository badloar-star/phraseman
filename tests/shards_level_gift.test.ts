import AsyncStorage from '@react-native-async-storage/async-storage';
import { rollGift, applyGift, GIFT_POOL, GiftDef, giftLocaleStrings, giftRarityUiLabel } from '../app/level_gift_system';
import { getShardsBalance } from '../app/shards_system';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/xp_manager', () => ({ registerXP: jest.fn().mockResolvedValue({ finalDelta: 0 }) }));
jest.mock('../app/premium_guard', () => ({ getVerifiedPremiumStatus: jest.fn().mockResolvedValue(false) }));
jest.mock('../app/arena_daily_limit', () => ({ addArenaPlaysBonusForToday: jest.fn() }));
jest.mock('../app/club_boosts', () => ({ grantClubGiftFreeBoostFromLevel: jest.fn() }));
jest.mock('../app/flashcards/marketplace', () => ({ primeMarketplaceBuiltCardsCacheFromAccessibleStorage: jest.fn() }));
jest.mock('../app/flashcards/pack_trial_gift', () => ({ setRandomPackGiftTrial48h: jest.fn() }));
jest.mock('../app/firebase', () => ({}));
jest.mock('../app/config', () => ({ IS_EXPO_GO: true, CLOUD_SYNC_ENABLED: false }));
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

  it('applyGift shards_3 добавляет +3 к балансу осколков', async () => {
    const gift = GIFT_POOL.find((g: GiftDef) => g.id === 'shards_3')!;
    await applyGift(gift, 'TestUser', 3, 5, jest.fn());
    const balance = await getShardsBalance();
    expect(balance).toBe(3);
  });

  it('applyGift shards_3 суммируется с уже имеющимися осколками', async () => {
    mockStorage['shards_balance'] = '5';
    const gift = GIFT_POOL.find((g: GiftDef) => g.id === 'shards_3')!;
    await applyGift(gift, 'TestUser', 3, 5, jest.fn());
    const balance = await getShardsBalance();
    expect(balance).toBe(8);
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
