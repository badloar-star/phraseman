import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getEnergyState,
  checkAndRecover,
  spendEnergy,
  addEnergy,
  resetEnergyToMax,
  getTimeUntilNextRecovery,
  formatTimeUntilRecovery,
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
    jest.useRealTimers();
  });

  describe('getEnergyState', () => {
    it('should return default state when storage is empty', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const state = await getEnergyState();

      expect(state.current).toBe(5);
      expect(state.max).toBe(5);
      expect(typeof state.lastRecoveryTime).toBe('number');
    });

    it('should return stored state when available', async () => {
      const storedState: EnergyState = {
        current: 3,
        max: 5,
        lastRecoveryTime: Date.now() - 1000,
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(storedState));

      const state = await getEnergyState();

      expect(state.current).toBe(3);
      expect(state.max).toBe(5);
    });
  });

  describe('spendEnergy', () => {
    it('should spend energy if available', async () => {
      const currentState: EnergyState = {
        current: 3,
        max: 5,
        lastRecoveryTime: Date.now(),
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(currentState));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await spendEnergy(1);

      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should not spend energy if unavailable', async () => {
      const currentState: EnergyState = {
        current: 0,
        max: 5,
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
        max: 5,
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
        max: 5,
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
      expect(state.max).toBe(5);
    });
  });

  describe('formatTimeUntilRecovery', () => {
    it('should format time correctly', () => {
      const ms = 90 * 60 * 1000; // 90 minutes
      const formatted = formatTimeUntilRecovery(ms);
      expect(formatted).toBe('1ч 30м');
    });

    it('should format minutes only', () => {
      const ms = 30 * 60 * 1000; // 30 minutes
      const formatted = formatTimeUntilRecovery(ms);
      expect(formatted).toBe('30м');
    });

    it('should format hours only', () => {
      const ms = 2 * 60 * 60 * 1000; // 2 hours
      const formatted = formatTimeUntilRecovery(ms);
      expect(formatted).toBe('2ч 0м');
    });
  });

  describe('checkAndRecover', () => {
    it('should recover energy after 2 hours', async () => {
      const currentState: EnergyState = {
        current: 2,
        max: 5,
        lastRecoveryTime: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(currentState));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await checkAndRecover();

      expect(result.current).toBe(3);
    });

    it('should not recover energy before 2 hours', async () => {
      const currentState: EnergyState = {
        current: 2,
        max: 5,
        lastRecoveryTime: Date.now() - 1 * 60 * 60 * 1000, // 1 hour ago
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(currentState));

      const result = await checkAndRecover();

      expect(result.current).toBe(2);
    });

    it('should not exceed max energy during recovery', async () => {
      const currentState: EnergyState = {
        current: 4,
        max: 5,
        lastRecoveryTime: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(currentState));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await checkAndRecover();

      expect(result.current).toBe(5);
    });
  });
});
