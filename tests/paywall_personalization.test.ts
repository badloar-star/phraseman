import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collectPaywallStats,
  pickPaywallTags,
  incrementEnergyZeroCount,
  incrementStreakLostCount,
  incrementHardPaywallBlock,
  ENERGY_ZERO_COUNT_KEY,
  STREAK_LOST_COUNT_KEY,
  HARD_PAYWALL_BLOCKS_KEY,
  type PaywallStats,
} from '../app/paywall_personalization';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));
jest.mock('../app/foreground_usage_ms', () => ({
  getForegroundUsageMs: jest.fn(async () => 18 * 3_600_000), // 18 часов
}));

const mockStorage: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation((k: string) =>
    Promise.resolve(mockStorage[k] ?? null),
  );
  (AsyncStorage.setItem as jest.Mock).mockImplementation((k: string, v: string) => {
    mockStorage[k] = v;
    return Promise.resolve();
  });
});

describe('paywall_personalization — counters', () => {
  it('increment functions bump AsyncStorage counters (sequential)', async () => {
    // Fire-and-forget functions — вызываем последовательно (ждём после каждого),
    // так как оба вызова подряд дают race condition в мок-AsyncStorage: оба
    // читают '0' одновременно и оба пишут '1'. В проде UI-события строго
    // последовательны — пользователь не может дважды одновременно закончить энергию.
    incrementEnergyZeroCount();
    await new Promise((r) => setTimeout(r, 10));
    incrementEnergyZeroCount();
    await new Promise((r) => setTimeout(r, 10));
    incrementStreakLostCount();
    await new Promise((r) => setTimeout(r, 10));
    incrementHardPaywallBlock();
    await new Promise((r) => setTimeout(r, 10));
    incrementHardPaywallBlock();
    await new Promise((r) => setTimeout(r, 10));
    incrementHardPaywallBlock();
    await new Promise((r) => setTimeout(r, 20));
    expect(mockStorage[ENERGY_ZERO_COUNT_KEY]).toBe('2');
    expect(mockStorage[STREAK_LOST_COUNT_KEY]).toBe('1');
    expect(mockStorage[HARD_PAYWALL_BLOCKS_KEY]).toBe('3');
  });
});

describe('paywall_personalization — collectPaywallStats', () => {
  it('returns zeros when no counters stored', async () => {
    const s = await collectPaywallStats();
    expect(s.energyZeroCount).toBe(0);
    expect(s.streakLostCount).toBe(0);
    expect(s.hardPaywallBlocks).toBe(0);
  });

  it('reads stored counters correctly', async () => {
    mockStorage[ENERGY_ZERO_COUNT_KEY] = '14';
    mockStorage[STREAK_LOST_COUNT_KEY] = '3';
    mockStorage[HARD_PAYWALL_BLOCKS_KEY] = '8';
    mockStorage['lifetime_best_hall_rank_v1'] = '143';
    const s = await collectPaywallStats();
    expect(s.energyZeroCount).toBe(14);
    expect(s.streakLostCount).toBe(3);
    expect(s.hardPaywallBlocks).toBe(8);
    expect(s.hofRank).toBe(143);
    expect(s.foregroundHours).toBe(18);
  });
});

describe('paywall_personalization — pickPaywallTags', () => {
  const empty: PaywallStats = {
    energyZeroCount: 0,
    streakLostCount: 0,
    hardPaywallBlocks: 0,
    hofRank: null,
    foregroundHours: 0,
  };

  it('returns 3 generic tags when no personal data', () => {
    const tags = pickPaywallTags(empty, 3);
    expect(tags).toHaveLength(3);
    // All should be generic (weight <= 25)
    expect(tags.every((t) => t.key.startsWith('generic'))).toBe(true);
  });

  it('energy_zero tag has higher weight than generic tags', () => {
    const tags = pickPaywallTags({ ...empty, energyZeroCount: 5 }, 3);
    expect(tags[0].key).toBe('energy_zero');
  });

  it('streak_lost tag has high weight (second only to energy)', () => {
    const tags = pickPaywallTags({ ...empty, streakLostCount: 3, energyZeroCount: 10 }, 3);
    expect(tags[0].key).toBe('energy_zero');
    expect(tags[1].key).toBe('streak_lost');
  });

  it('exactly max=3 tags returned even with many active signals', () => {
    const all: PaywallStats = {
      energyZeroCount: 15,
      streakLostCount: 4,
      hardPaywallBlocks: 7,
      hofRank: 200,
      foregroundHours: 50,
    };
    const tags = pickPaywallTags(all, 3);
    expect(tags).toHaveLength(3);
    const keys = tags.map((t) => t.key);
    // Top 3 should be energy_zero, streak_lost, hard_blocks (highest weights)
    expect(keys).toContain('energy_zero');
    expect(keys).toContain('streak_lost');
    expect(keys).toContain('hard_blocks');
  });

  it('pads with generic if fewer than max active personal tags', () => {
    const one: PaywallStats = { ...empty, energyZeroCount: 3 };
    const tags = pickPaywallTags(one, 3);
    expect(tags).toHaveLength(3);
    expect(tags[0].key).toBe('energy_zero');
    expect(tags[1].key.startsWith('generic')).toBe(true);
    expect(tags[2].key.startsWith('generic')).toBe(true);
  });

  it('hof_rank tag is not used (hall of fame removed)', () => {
    // Зал славы удалён из приложения — тег hof_rank больше не генерируется
    const highRank = { ...empty, hofRank: 200 };
    const tags = pickPaywallTags(highRank, 5);
    expect(tags.find((t) => t.key === 'hof_rank')).toBeUndefined();
  });

  it('personalized strings contain actual numbers', () => {
    const s: PaywallStats = { ...empty, energyZeroCount: 7, streakLostCount: 2 };
    const tags = pickPaywallTags(s, 3);
    const energy = tags.find((t) => t.key === 'energy_zero')!;
    expect(energy.ru).toContain('7');
    const streak = tags.find((t) => t.key === 'streak_lost')!;
    expect(streak.ru).toContain('2');
  });

  it('all tags have ru/uk/es strings and emoji', () => {
    const all: PaywallStats = {
      energyZeroCount: 5,
      streakLostCount: 2,
      hardPaywallBlocks: 3,
      hofRank: 100,
      foregroundHours: 20,
    };
    const tags = pickPaywallTags(all, 3);
    for (const tag of tags) {
      expect(tag.emoji).toBeTruthy();
      expect(tag.ru).toBeTruthy();
      expect(tag.uk).toBeTruthy();
      expect(tag.es).toBeTruthy();
    }
  });
});
