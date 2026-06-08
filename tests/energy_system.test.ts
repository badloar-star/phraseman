import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getEnergyState,
  checkAndRecover,
  spendEnergy,
  addEnergy,
  resetEnergyToMax,
  getTimeUntilNextRecovery,
  formatTimeUntilRecovery,
  secondsUntilEnergyFull,
  EnergyState,
} from '../app/energy_system';

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

  describe('spendEnergy', () => {
    it('should spend energy if available', async () => {
      const currentState: EnergyState = {
        current: 3,
        lastRecoveryTime: Date.now(),
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(currentState));
      (AsyncStorage.multiGet as jest.Mock).mockResolvedValue([
        ['premium_active', 'false'],
        ['premium_expiry', '0'],
      ]);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await spendEnergy(1);

      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should not spend energy if unavailable', async () => {
      const currentState: EnergyState = {
        current: 0,
        lastRecoveryTime: Date.now(),
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(currentState));

      const result = await spendEnergy(1);

      expect(result).toBe(false);
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
    it('should recover energy after 10 minutes', async () => {
      const currentState: EnergyState = {
        current: 2,
        lastRecoveryTime: Date.now() - 10 * 60 * 1000, // 10 min ago = 1 cycle
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(currentState));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await checkAndRecover();

      expect(result.current).toBe(3);
    });

    it('should preserve partial recovery progress after completed intervals', async () => {
      const now = Date.now();
      const currentState: EnergyState = {
        current: 1,
        lastRecoveryTime: now - 25 * 60 * 1000, // 2 cycles + 5 min remainder
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(currentState));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await checkAndRecover();

      expect(result.current).toBe(3);
      expect(result.lastRecoveryTime).toBe(currentState.lastRecoveryTime + 20 * 60 * 1000);
    });

    it('should not recover energy before 10 minutes', async () => {
      const currentState: EnergyState = {
        current: 2,
        lastRecoveryTime: Date.now() - 9 * 60 * 1000, // 9 min ago = 0 cycles
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
