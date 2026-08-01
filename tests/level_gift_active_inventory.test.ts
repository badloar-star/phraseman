import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadActiveLevelGiftInventory } from '../app/level_gift_active_inventory';
import { FRIEND_GIFT_INVENTORY_KEY } from '../app/friend_gift_inventory';
import { flashcardsPackTrialGiftKey } from '../app/target_storage_keys';

jest.mock('@react-native-async-storage/async-storage');

const mockStorage: Record<string, string> = {};

const nowMs = Date.UTC(2026, 4, 18, 12, 0, 0);

beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(nowMs);
  Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) =>
    Promise.resolve(mockStorage[key] ?? null),
  );
  (AsyncStorage.removeItem as jest.Mock).mockImplementation((key: string) => {
    delete mockStorage[key];
    return Promise.resolve();
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('active level gift inventory', () => {
  it('lists gifts that are currently active', async () => {
    mockStorage.gift_xp_bank_v1 = JSON.stringify({ remaining: 300, grantedTotal: 300, updatedAt: nowMs });
    mockStorage.gift_xp_multiplier = JSON.stringify({ multiplier: 1.5, expiresAt: nowMs + 10 * 60 * 1000 });
    mockStorage.energy_gift_bonus = JSON.stringify({ amount: 2, expiresAt: nowMs + 60 * 60 * 1000 });
    mockStorage[flashcardsPackTrialGiftKey('en')] = JSON.stringify({ packId: 'official_test', expiresAt: nowMs + 2 * 60 * 60 * 1000 });
    mockStorage.arena_daily_gift_bonus_v1 = JSON.stringify({ date: '2026-05-18', extra: 5 });
    mockStorage['bonus_hints_2026-05-18'] = '3';
    mockStorage.chain_shield = JSON.stringify({ daysLeft: 2, grantedAt: '2026-05-18' });
    mockStorage.wager_discount = '0.25';
    mockStorage.club_gift_free_boost_v1 = '1';

    const items = await loadActiveLevelGiftInventory('uk', nowMs, 'en');

    expect(items.map((item) => item.key)).toEqual([
      'xp_bank',
      'gift_focus',
      'bonus_energy',
      'pack_trial',
      'arena_extra',
      'hints',
      'chain_shield',
      'wager_discount',
      'club_boost',
    ]);
    expect(items.map((item) => item.iconGiftId)).toEqual([
      'xp_bank_300',
      'focus_15m_50',
      'energy_plus2',
      'pack_voucher_48h',
      'arena_extra_5',
      'hint_3',
      'chain_shield_1',
      'wager_discount_25',
      'club_boost_free',
    ]);
    expect(items).toContainEqual(expect.objectContaining({
      key: 'xp_bank',
      iconGiftId: 'xp_bank_300',
      title: 'Бонус ×2',
      desc: 'ще на 300 XP',
    }));
    expect(items).toContainEqual(expect.objectContaining({
      key: 'chain_shield',
      title: 'Захист ланцюжка',
      desc: '2 дн.',
    }));
    expect(items).toContainEqual(expect.objectContaining({
      key: 'club_boost',
      title: 'Буст ліги',
      desc: '1 безкоштовна активація',
    }));
  });

  it('does not list expired or empty active gift states', async () => {
    mockStorage.gift_xp_bank_v1 = JSON.stringify({ remaining: 0, grantedTotal: 300, updatedAt: nowMs });
    mockStorage.gift_xp_multiplier = JSON.stringify({ multiplier: 2, expiresAt: nowMs - 1 });
    mockStorage.energy_gift_bonus = JSON.stringify({ amount: 2, expiresAt: nowMs - 1 });
    mockStorage[flashcardsPackTrialGiftKey('en')] = JSON.stringify({ packId: 'official_test', expiresAt: nowMs - 1 });
    mockStorage.arena_daily_gift_bonus_v1 = JSON.stringify({ date: '2026-05-17', extra: 5 });
    mockStorage.chain_shield = JSON.stringify({ daysLeft: 1, grantedAt: '2026-05-16' });

    await expect(loadActiveLevelGiftInventory('uk')).resolves.toEqual([]);
  });

  it('keeps English legacy bonus hints separate from French bonus hints', async () => {
    mockStorage['bonus_hints_2026-05-18'] = '2';
    mockStorage['lesson_rewards_v2::fr::bonus_hints_2026-05-18'] = '5';

    await expect(loadActiveLevelGiftInventory('uk', nowMs, 'en')).resolves.toEqual([
      expect.objectContaining({ key: 'hints', desc: '2 на сьогодні' }),
    ]);
    await expect(loadActiveLevelGiftInventory('uk', nowMs, 'fr')).resolves.toEqual([
      expect.objectContaining({ key: 'hints', desc: '5 на сьогодні' }),
    ]);
  });

  it('hides French pack trial vouchers while flashcards source gate is closed', async () => {
    mockStorage[flashcardsPackTrialGiftKey('fr')] = JSON.stringify({
      packId: 'official_test',
      expiresAt: nowMs + 2 * 60 * 60 * 1000,
    });

    await expect(loadActiveLevelGiftInventory('uk', nowMs, 'fr')).resolves.toEqual([]);
  });

  it('lists saved friend gifts in the gifts inventory section', async () => {
    mockStorage[FRIEND_GIFT_INVENTORY_KEY] = JSON.stringify([
      {
        id: 'friend-gift-1',
        giftId: 'xp_boost_2x_24h',
        giftLabelRu: 'x2 XP на 24 часа',
        fromUid: 'friend-1',
        fromName: 'Adi',
        ts: nowMs,
        savedAt: nowMs,
      },
    ]);

    await expect(loadActiveLevelGiftInventory('ru', nowMs, 'en')).resolves.toEqual([
      expect.objectContaining({
        key: 'friend_gift_friend-gift-1',
        iconGiftId: 'xp_2x_24h',
        title: 'Подарок от Adi',
        desc: 'x2 XP на 24 часа',
      }),
    ]);
  });
});
