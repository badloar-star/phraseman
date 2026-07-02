import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  applyMonthlyPremiumFreezeAllowance,
  readPremiumFreezesLeftThisMonth,
  PREMIUM_FREE_FREEZES_PER_MONTH,
  PREMIUM_FREEZE_USED_FLAG_KEY,
  PREMIUM_FREEZE_MONTH_STATE_KEY,
} from '../app/premium_freeze_allowance';
import { getVerifiedPremiumStatus } from '../app/premium_guard';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/premium_guard', () => ({ getVerifiedPremiumStatus: jest.fn().mockResolvedValue(false) }));

const mockStorage: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
  (getVerifiedPremiumStatus as jest.Mock).mockResolvedValue(false);
  (AsyncStorage.getItem as jest.Mock).mockImplementation((k: string) =>
    Promise.resolve(mockStorage[k] ?? null),
  );
  (AsyncStorage.setItem as jest.Mock).mockImplementation((k: string, v: string) => {
    mockStorage[k] = v;
    return Promise.resolve();
  });
});

const JUNE = new Date('2026-06-15T12:00:00Z');
const JULY = new Date('2026-07-15T12:00:00Z');

/** Симулирует «юзер потратил бесплатную заморозку» (как home.tsx/streak_stats.tsx). */
const useFreeFreeze = () => {
  mockStorage[PREMIUM_FREEZE_USED_FLAG_KEY] = 'true';
};

describe('premium_freeze_allowance', () => {
  it('не трогает флаг у не-premium', async () => {
    useFreeFreeze();
    await applyMonthlyPremiumFreezeAllowance(JUNE);
    expect(mockStorage[PREMIUM_FREEZE_USED_FLAG_KEY]).toBe('true');
    expect(mockStorage[PREMIUM_FREEZE_MONTH_STATE_KEY]).toBeUndefined();
  });

  it('premium: потраченная заморозка списывается из месячных и флаг возвращается', async () => {
    (getVerifiedPremiumStatus as jest.Mock).mockResolvedValue(true);
    useFreeFreeze();
    await applyMonthlyPremiumFreezeAllowance(JUNE);
    expect(mockStorage[PREMIUM_FREEZE_USED_FLAG_KEY]).toBe('false');
    await expect(readPremiumFreezesLeftThisMonth(JUNE)).resolves.toBe(PREMIUM_FREE_FREEZES_PER_MONTH - 1);
  });

  it('premium: повторные запуски без новой траты не списывают ещё раз', async () => {
    (getVerifiedPremiumStatus as jest.Mock).mockResolvedValue(true);
    useFreeFreeze();
    await applyMonthlyPremiumFreezeAllowance(JUNE);
    await applyMonthlyPremiumFreezeAllowance(JUNE);
    await applyMonthlyPremiumFreezeAllowance(JUNE);
    await expect(readPremiumFreezesLeftThisMonth(JUNE)).resolves.toBe(PREMIUM_FREE_FREEZES_PER_MONTH - 1);
  });

  it('premium: после исчерпания месячного лимита флаг больше не сбрасывается', async () => {
    (getVerifiedPremiumStatus as jest.Mock).mockResolvedValue(true);
    for (let i = 0; i < PREMIUM_FREE_FREEZES_PER_MONTH; i += 1) {
      useFreeFreeze();
      await applyMonthlyPremiumFreezeAllowance(JUNE);
    }
    expect(mockStorage[PREMIUM_FREEZE_USED_FLAG_KEY]).toBe('true'); // лимит месяца исчерпан
    await expect(readPremiumFreezesLeftThisMonth(JUNE)).resolves.toBe(0);
  });

  it('premium: новый месяц обнуляет счётчик и снова выдаёт заморозки', async () => {
    (getVerifiedPremiumStatus as jest.Mock).mockResolvedValue(true);
    for (let i = 0; i < PREMIUM_FREE_FREEZES_PER_MONTH; i += 1) {
      useFreeFreeze();
      await applyMonthlyPremiumFreezeAllowance(JUNE);
    }
    await applyMonthlyPremiumFreezeAllowance(JULY);
    expect(mockStorage[PREMIUM_FREEZE_USED_FLAG_KEY]).toBe('false');
    // Перенесённый из июня «потраченный» флаг списан как первая июльская.
    await expect(readPremiumFreezesLeftThisMonth(JULY)).resolves.toBe(PREMIUM_FREE_FREEZES_PER_MONTH - 1);
  });
});
