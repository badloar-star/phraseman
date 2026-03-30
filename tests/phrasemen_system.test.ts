// ════════════════════════════════════════════════════════════════════════════
// phrasemen_system.test.ts — Тесты для системы фразменов
// ════════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getPhrasemenBalance,
  addPhrasemen,
  spendPhrasemen,
  getTransactionHistory,
  getPhrasemenStats,
  clearPhrasemenData,
  setLastDailyBonus,
  getLastDailyBonus,
} from '../app/phrasemen_system';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

describe('PhrasemenSystem', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await clearPhrasemenData();
  });

  describe('getPhrasemenBalance', () => {
    test('should return 0 for new user', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const balance = await getPhrasemenBalance();
      expect(balance).toBe(0);
    });

    test('should return existing balance', async () => {
      const state = {
        balance: 100,
        totalEarned: 150,
        totalSpent: 50,
        transactions: [],
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(state));

      const balance = await getPhrasemenBalance();
      expect(balance).toBe(100);
    });
  });

  describe('addPhrasemen', () => {
    test('should add phrasemen to balance', async () => {
      const mockStorage: Record<string, string> = {};
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        return Promise.resolve(mockStorage[key] || null);
      });
      (AsyncStorage.setItem as jest.Mock).mockImplementation((key, value) => {
        mockStorage[key] = value;
        return Promise.resolve();
      });

      await addPhrasemen(50, 'daily_task', 'Test task reward');

      // Verify that setItem was called with updated state
      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const savedState = JSON.parse(mockStorage['phrasemen_state']);

      expect(savedState.balance).toBe(50);
      expect(savedState.totalEarned).toBe(50);
      expect(savedState.transactions.length).toBe(1);
      expect(savedState.transactions[0].type).toBe('daily_task');
    });

    test('should reject negative amount', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      await expect(addPhrasemen(-10, 'daily_task', 'Invalid')).rejects.toThrow();
    });

    test('should track transaction history', async () => {
      const mockStorage: Record<string, string> = {};
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        return Promise.resolve(mockStorage[key] || null);
      });
      (AsyncStorage.setItem as jest.Mock).mockImplementation((key, value) => {
        mockStorage[key] = value;
        return Promise.resolve();
      });

      await addPhrasemen(30, 'streak_bonus', 'Streak bonus');
      await addPhrasemen(20, 'daily_task', 'Task reward');

      const savedState = JSON.parse(mockStorage['phrasemen_state']);

      expect(savedState.transactions.length).toBe(2);
      expect(savedState.transactions[0].amount).toBe(20); // Most recent first
      expect(savedState.transactions[1].amount).toBe(30);
    });
  });

  describe('spendPhrasemen', () => {
    test('should spend phrasemen if balance is sufficient', async () => {
      const mockStorage: Record<string, string> = {
        phrasemen_state: JSON.stringify({
          balance: 100,
          totalEarned: 100,
          totalSpent: 0,
          transactions: [],
        }),
      };
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        return Promise.resolve(mockStorage[key] || null);
      });
      (AsyncStorage.setItem as jest.Mock).mockImplementation((key, value) => {
        mockStorage[key] = value;
        return Promise.resolve();
      });

      const success = await spendPhrasemen(25, 'energy_purchase', 'Buy energy');

      expect(success).toBe(true);
      const savedState = JSON.parse(mockStorage['phrasemen_state']);

      expect(savedState.balance).toBe(75);
      expect(savedState.totalSpent).toBe(25);
    });

    test('should reject spending if balance is insufficient', async () => {
      const mockStorage: Record<string, string> = {
        phrasemen_state: JSON.stringify({
          balance: 10,
          totalEarned: 10,
          totalSpent: 0,
          transactions: [],
        }),
      };
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        return Promise.resolve(mockStorage[key] || null);
      });

      const success = await spendPhrasemen(25, 'energy_purchase', 'Buy energy');

      expect(success).toBe(false);
    });

    test('should reject negative amount', async () => {
      const mockStorage: Record<string, string> = {};
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        return Promise.resolve(mockStorage[key] || null);
      });

      await expect(spendPhrasemen(-10, 'energy_purchase', 'Invalid')).rejects.toThrow();
    });

    test('should mark transaction as spending', async () => {
      const mockStorage: Record<string, string> = {
        phrasemen_state: JSON.stringify({
          balance: 100,
          totalEarned: 100,
          totalSpent: 0,
          transactions: [],
        }),
      };
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        return Promise.resolve(mockStorage[key] || null);
      });
      (AsyncStorage.setItem as jest.Mock).mockImplementation((key, value) => {
        mockStorage[key] = value;
        return Promise.resolve();
      });

      await spendPhrasemen(30, 'xp_booster_purchase', 'Buy XP booster');

      const savedState = JSON.parse(mockStorage['phrasemen_state']);

      expect(savedState.transactions[0].isSpending).toBe(true);
    });
  });

  describe('getPhrasemenStats', () => {
    test('should return correct statistics', async () => {
      const mockStorage: Record<string, string> = {
        phrasemen_state: JSON.stringify({
          balance: 75,
          totalEarned: 150,
          totalSpent: 75,
          transactions: [
            { id: '1', type: 'daily_task' as const, amount: 50, reason: 'Task', timestamp: Date.now(), isSpending: false },
            { id: '2', type: 'energy_purchase' as const, amount: 25, reason: 'Energy', timestamp: Date.now(), isSpending: true },
          ],
        }),
      };
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        return Promise.resolve(mockStorage[key] || null);
      });

      const stats = await getPhrasemenStats();

      expect(stats.balance).toBe(75);
      expect(stats.totalEarned).toBe(150);
      expect(stats.totalSpent).toBe(75);
      expect(stats.transactionCount).toBe(2);
    });
  });

  describe('Last Daily Bonus', () => {
    test('should set and retrieve last daily bonus timestamp', async () => {
      const mockStorage: Record<string, string> = {};
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        return Promise.resolve(mockStorage[key] || null);
      });
      (AsyncStorage.setItem as jest.Mock).mockImplementation((key, value) => {
        mockStorage[key] = value;
        return Promise.resolve();
      });

      const now = Date.now();
      await setLastDailyBonus(now);

      const lastBonus = await getLastDailyBonus();
      expect(lastBonus).toBe(now);
    });

    test('should return undefined for new user', async () => {
      const mockStorage: Record<string, string> = {};
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        return Promise.resolve(mockStorage[key] || null);
      });

      const lastBonus = await getLastDailyBonus();
      expect(lastBonus).toBeUndefined();
    });
  });

  describe('Transaction History', () => {
    test('should retrieve limited transaction history', async () => {
      const transactions = Array.from({ length: 150 }, (_, i) => ({
        id: `${i}`,
        type: 'daily_task' as const,
        amount: 10,
        reason: 'Task',
        timestamp: Date.now(),
        isSpending: false,
      }));

      const mockStorage: Record<string, string> = {
        phrasemen_state: JSON.stringify({
          balance: 100,
          totalEarned: 100,
          totalSpent: 0,
          transactions,
        }),
      };
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        return Promise.resolve(mockStorage[key] || null);
      });

      const history = await getTransactionHistory(50);

      expect(history.length).toBe(50);
    });
  });
});
