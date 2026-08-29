import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getEnergyState,
  checkAndRecover,
  addEnergy,
  resetEnergyToMax,
  getTimeUntilNextRecovery,
  formatTimeUntilRecovery,
  secondsUntilEnergyFull,
  getEffectiveMaxEnergyValue,
  getRecoveryIntervalMs,
  EnergyState,
} from '../app/energy_system';
import * as energySystem from '../app/energy_system';
import { TOTAL_XP_FOR_LEVEL } from '../constants/theme';

// Мокируем AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

describe('Energy System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    try {
      jest.runOnlyPendingTimers();
    } catch {
      // ignore if no fake timers pending
    }
    jest.useRealTimers();
  });

  describe('getEnergyState', () => {
    it('should return default state when storage is empty', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const state = await getEnergyState();

      expect(state.current).toBe(5);
      expect(typeof state.lastRecoveryTime).toBe('number');
    });

    it('should return stored state when available', async () => {
      const storedState: EnergyState = {
        current: 3,
        lastRecoveryTime: Date.now() - 1000,
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(storedState));

      const state = await getEnergyState();

      expect(state.current).toBe(3);
    });
  });

  describe('level-aware capacity', () => {
    it('shares the level-50 sixth slot with legacy gift helpers', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        if (key === 'user_total_xp') return String(TOTAL_XP_FOR_LEVEL(50));
        return null;
      });

      await expect(getEffectiveMaxEnergyValue()).resolves.toBe(6);
    });
  });

  describe('secondsUntilEnergyFull', () => {
    const RECOVERY_MS = 10 * 60 * 1000; // 10 минут
    const NOW = 1_700_000_000_000;

    it('returns 0 when energy is already full', () => {
      expect(secondsUntilEnergyFull(5, 5, RECOVERY_MS, NOW, NOW)).toBe(0);
      expect(secondsUntilEnergyFull(6, 5, RECOVERY_MS, NOW, NOW)).toBe(0);
    });

    it('returns full interval when one unit missing and timer just reset', () => {
      // current=4/5, только что потратили (lastRecovery == now) → ровно 10 минут
      const secs = secondsUntilEnergyFull(4, 5, RECOVERY_MS, NOW, NOW);
      expect(secs).toBe(600);
    });

    it('accounts for elapsed time within the current interval', () => {
      // прошло 4 минуты из 10 текущего интервала, не хватает 1 единицы → осталось 6 минут
      const lastRecovery = NOW - 4 * 60 * 1000;
      const secs = secondsUntilEnergyFull(4, 5, RECOVERY_MS, lastRecovery, NOW);
      expect(secs).toBe(6 * 60);
    });

    it('sums multiple missing units minus elapsed remainder', () => {
      // не хватает 3 единиц = 30 минут, прошло 2 минуты текущего интервала → 28 минут
      const lastRecovery = NOW - 2 * 60 * 1000;
      const secs = secondsUntilEnergyFull(2, 5, RECOVERY_MS, lastRecovery, NOW);
      expect(secs).toBe(28 * 60);
    });

    it('never returns less than 1 second when not full', () => {
      // граничный случай: остаток почти весь интервал прошёл
      const lastRecovery = NOW - (RECOVERY_MS - 100);
      const secs = secondsUntilEnergyFull(4, 5, RECOVERY_MS, lastRecovery, NOW);
      expect(secs).toBeGreaterThanOrEqual(1);
    });

    it('returns 0 for non-positive recovery interval (defensive)', () => {
      expect(secondsUntilEnergyFull(2, 5, 0, NOW, NOW)).toBe(0);
    });
  });

  describe('temporary-capacity recovery projection', () => {
    type RecoveryPlanner = (input: {
      baseEnergy: number;
      maxEnergy: number;
      bonusEnergy: number;
      bonusCapacity: number;
      bonusExpiresAt: number;
      lastRecoveryTime: number;
      recoveryIntervalMs: number;
      now: number;
    }) => {
      baseEnergy: number;
      bonusEnergy: number;
      lastRecoveryTime: number;
    };

    const planner = (): RecoveryPlanner => (
      energySystem as typeof energySystem & { planActiveEnergyRecovery?: RecoveryPlanner }
    ).planActiveEnergyRecovery!;

    it('recovers spent temporary slots from 5/8 through 6/8 to 8/8 without losing the remainder', () => {
      const interval = 1_000;
      const startedAt = 10_000;
      const first = planner()({
        baseEnergy: 5,
        maxEnergy: 5,
        bonusEnergy: 0,
        bonusCapacity: 3,
        bonusExpiresAt: startedAt + 60_000,
        lastRecoveryTime: startedAt,
        recoveryIntervalMs: interval,
        now: startedAt + interval + 400,
      });
      expect(first).toMatchObject({
        baseEnergy: 5,
        bonusEnergy: 1,
        lastRecoveryTime: startedAt + interval,
      });

      const full = planner()({
        ...first,
        maxEnergy: 5,
        bonusCapacity: 3,
        bonusExpiresAt: startedAt + 60_000,
        recoveryIntervalMs: interval,
        now: startedAt + 3 * interval + 400,
      });
      expect(full).toMatchObject({
        baseEnergy: 5,
        bonusEnergy: 3,
        lastRecoveryTime: startedAt + 3 * interval,
      });
    });

    it('does not recover expired temporary capacity', () => {
      const result = planner()({
        baseEnergy: 5,
        maxEnergy: 5,
        bonusEnergy: 0,
        bonusCapacity: 3,
        bonusExpiresAt: 9_999,
        lastRecoveryTime: 9_000,
        recoveryIntervalMs: 1_000,
        now: 10_000,
      });
      expect(result).toMatchObject({ baseEnergy: 5, bonusEnergy: 0 });
    });
  });

  describe('addEnergy', () => {
    it('should add energy up to max', async () => {
      const currentState: EnergyState = {
        current: 4,
        lastRecoveryTime: Date.now(),
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(currentState));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await addEnergy(1);

      expect(result.current).toBe(5);
    });

    it('should not exceed max energy', async () => {
      const currentState: EnergyState = {
        current: 5,
        lastRecoveryTime: Date.now(),
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(currentState));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await addEnergy(2);

      expect(result.current).toBe(5);
    });
  });

  describe('resetEnergyToMax', () => {
    it('should reset energy to maximum', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const state = await resetEnergyToMax();

      expect(state.current).toBe(5);
    });
  });

  describe('formatTimeUntilRecovery', () => {
    it('should format time correctly', () => {
      const ms = 90 * 60 * 1000; // 90 minutes
      const formatted = formatTimeUntilRecovery(ms);
      expect(formatted).toBe('1ч 30м 0с');
    });

    it('should format minutes and seconds', () => {
      const ms = 30 * 60 * 1000; // 30 minutes
      const formatted = formatTimeUntilRecovery(ms);
      expect(formatted).toBe('30м 0с');
    });

    it('should format hours with minutes and seconds', () => {
      const ms = 2 * 60 * 60 * 1000; // 2 hours
      const formatted = formatTimeUntilRecovery(ms);
      expect(formatted).toBe('2ч 0м 0с');
    });

    it('should format sub-minute as seconds only', () => {
      expect(formatTimeUntilRecovery(45 * 1000)).toBe('45с');
      expect(formatTimeUntilRecovery(59 * 1000)).toBe('59с');
    });

    it('should format minute with trailing seconds', () => {
      expect(formatTimeUntilRecovery(90 * 1000)).toBe('1м 30с');
    });
  });

  describe('checkAndRecover', () => {
    // зачем: интервал берём из самой системы, а не магическим числом — владелец
    // 2026-08-23 сменил его с 10 на 30 минут, и хардкод в тесте это ловил как
    // «поломку», хотя менялось правило, а не код восстановления.
    it('should recover one unit after a full recovery interval', async () => {
      const currentState: EnergyState = {
        current: 2,
        lastRecoveryTime: Date.now() - getRecoveryIntervalMs(), // ровно 1 цикл назад
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(currentState));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await checkAndRecover();

      expect(result.current).toBe(3);
    });

    it('should preserve partial recovery progress after completed intervals', async () => {
      // зачем: считаем от фактического интервала, а не от «25 минут» — при базе
      // 30 минут прежний хардкод давал 0 циклов вместо 2 и тест ловил смену
      // правила как поломку кода.
      const interval = getRecoveryIntervalMs();
      const now = Date.now();
      const currentState: EnergyState = {
        current: 1,
        // Ровно 2 полных цикла + половина третьего (остаток не должен теряться).
        lastRecoveryTime: now - (2 * interval + Math.floor(interval / 2)),
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(currentState));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await checkAndRecover();

      expect(result.current).toBe(3);
      expect(result.lastRecoveryTime).toBe(currentState.lastRecoveryTime + 2 * interval);
    });

    it('should not recover energy before a full interval has passed', async () => {
      const currentState: EnergyState = {
        current: 2,
        // Заведомо меньше одного интервала восстановления → 0 циклов.
        lastRecoveryTime: Date.now() - Math.floor(getRecoveryIntervalMs() * 0.9),
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(currentState));

      const result = await checkAndRecover();

      expect(result.current).toBe(2);
    });

    it('should not speed up recovery for 7+ day streaks', async () => {
      const currentState: EnergyState = {
        current: 2,
        lastRecoveryTime: Date.now() - 8 * 60 * 1000, // streak does not affect energy recovery
      };
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        if (key === 'streak_count') return '7';
        return JSON.stringify(currentState);
      });
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await checkAndRecover();

      expect(result.current).toBe(2);
    });

    it('should not exceed max energy during recovery', async () => {
      const currentState: EnergyState = {
        current: 4,
        lastRecoveryTime: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(currentState));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await checkAndRecover();

      expect(result.current).toBe(5);
    });
  });
});
