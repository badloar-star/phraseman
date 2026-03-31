/**
 * Tests for Club Boosts System
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  activateBoost,
  getActiveBoosts,
  getActiveBoostById,
  getXPMultiplier,
  hasEnergyBoost,
  getBoostTimeRemaining,
  formatBoostTimeRemaining,
  getBoostDef,
  getBoostsHistory,
  clearAllBoosts,
  clearBoostHistory,
  CLUB_BOOSTS,
  ActiveBoost,
} from '../app/club_boosts';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('Club Boosts System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Базовые mocks для AsyncStorage
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockAsyncStorage.removeItem.mockResolvedValue(undefined);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BOOST DEFINITIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Boost Definitions', () => {
    test('should have 4 different boosts', () => {
      expect(CLUB_BOOSTS).toHaveLength(4);
    });

    test('should have correct boost IDs', () => {
      const ids = CLUB_BOOSTS.map(b => b.id);
      expect(ids).toContain('xp_2x_2h_250xp');
      expect(ids).toContain('xp_2x_1h');
      expect(ids).toContain('xp_1_5x_2h');
      expect(ids).toContain('energy_plus_1');
    });

    test('should have correct costs', () => {
      const xp2x = CLUB_BOOSTS.find(b => b.id === 'xp_2x_1h');
      const xp1_5x = CLUB_BOOSTS.find(b => b.id === 'xp_1_5x_2h');
      const energy = CLUB_BOOSTS.find(b => b.id === 'energy_plus_1');

      expect(xp2x?.cost).toBe(50);
      expect(xp1_5x?.cost).toBe(35);
      expect(energy?.cost).toBe(30);
    });

    test('should have correct durations', () => {
      const xp2x = CLUB_BOOSTS.find(b => b.id === 'xp_2x_1h');
      const xp1_5x = CLUB_BOOSTS.find(b => b.id === 'xp_1_5x_2h');

      expect(xp2x?.durationMs).toBe(1 * 60 * 60 * 1000); // 1 hour
      expect(xp1_5x?.durationMs).toBe(2 * 60 * 60 * 1000); // 2 hours
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIVATION & RETRIEVAL
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Boost Activation', () => {
    test('should activate a single boost', async () => {
      const mockData: { [key: string]: any } = {};
      mockAsyncStorage.getItem.mockImplementation((key: string) => {
        return Promise.resolve(
          mockData[key] ? JSON.stringify(mockData[key]) : null
        );
      });
      mockAsyncStorage.setItem.mockImplementation((key: string, value: string) => {
        mockData[key] = JSON.parse(value);
        return Promise.resolve(undefined);
      });

      const result = await activateBoost('xp_2x_1h', 'TestPlayer', 50);

      expect(result).toBe(true);
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });

    test('should activate boost and store in history', async () => {
      const mockData: { [key: string]: any } = {};
      mockAsyncStorage.getItem.mockImplementation((key: string) => {
        return Promise.resolve(
          mockData[key] ? JSON.stringify(mockData[key]) : null
        );
      });
      mockAsyncStorage.setItem.mockImplementation((key: string, value: string) => {
        mockData[key] = JSON.parse(value);
        return Promise.resolve(undefined);
      });

      await activateBoost('xp_2x_1h', 'TestPlayer', 50);

      // Check history was saved
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'club_boosts_history',
        expect.any(String)
      );
    });

    test('should reject invalid boost ID', async () => {
      const result = await activateBoost('invalid_boost', 'TestPlayer', 50);
      expect(result).toBe(false);
    });

    test('should allow multiple XP boosts simultaneously', async () => {
      const mockData: { [key: string]: any } = {};
      mockAsyncStorage.getItem.mockImplementation((key: string) => {
        return Promise.resolve(
          mockData[key] ? JSON.stringify(mockData[key]) : null
        );
      });
      mockAsyncStorage.setItem.mockImplementation((key: string, value: string) => {
        mockData[key] = JSON.parse(value);
        return Promise.resolve(undefined);
      });

      await activateBoost('xp_2x_1h', 'Player1', 50);
      await activateBoost('xp_1_5x_2h', 'Player2', 35);

      // Should have both boosts stored
      const boosts = mockData['club_active_boosts'];
      expect(Object.keys(boosts).length).toBeGreaterThanOrEqual(2);
    });

    test('should replace energy boost when activating new one', async () => {
      const mockData: { [key: string]: any } = {
        club_active_boosts: {
          energy_plus_1: {
            id: 'energy_plus_1',
            activatedBy: 'Player1',
            activatedAt: Date.now() - 10000,
            durationMs: 0,
          },
        },
      };

      mockAsyncStorage.getItem.mockImplementation((key: string) => {
        return Promise.resolve(
          mockData[key] ? JSON.stringify(mockData[key]) : null
        );
      });
      mockAsyncStorage.setItem.mockImplementation((key: string, value: string) => {
        mockData[key] = JSON.parse(value);
        return Promise.resolve(undefined);
      });

      await activateBoost('energy_plus_1', 'Player2', 30);

      const boosts = mockData['club_active_boosts'];
      // Should only have one energy boost (the new one)
      const energyBoosts = Object.values(boosts).filter(
        (b: any) => b.id === 'energy_plus_1'
      );
      expect(energyBoosts.length).toBe(1);
      expect((energyBoosts[0] as any).activatedBy).toBe('Player2');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RETRIEVAL & FILTERING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Boost Retrieval', () => {
    test('should return empty array when no boosts active', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const boosts = await getActiveBoosts();
      expect(boosts).toEqual([]);
    });

    test('should return active boosts', async () => {
      const now = Date.now();
      const mockBoosts = {
        xp_2x_1h: {
          id: 'xp_2x_1h',
          activatedBy: 'TestPlayer',
          activatedAt: now,
          durationMs: 1 * 60 * 60 * 1000,
        },
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockBoosts));
      mockAsyncStorage.setItem.mockResolvedValue(undefined);

      const boosts = await getActiveBoosts();
      expect(boosts.length).toBeGreaterThan(0);
      expect(boosts[0].id).toBe('xp_2x_1h');
    });

    test('should filter out expired boosts', async () => {
      const now = Date.now();
      const mockBoosts = {
        xp_2x_1h: {
          id: 'xp_2x_1h',
          activatedBy: 'TestPlayer',
          activatedAt: now - 2 * 60 * 60 * 1000, // 2 hours ago
          durationMs: 1 * 60 * 60 * 1000, // 1 hour duration
        },
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockBoosts));
      mockAsyncStorage.setItem.mockResolvedValue(undefined);

      const boosts = await getActiveBoosts();
      expect(boosts).toEqual([]);
    });

    test('should get boost by ID', async () => {
      const now = Date.now();
      const mockBoosts = {
        xp_2x_1h: {
          id: 'xp_2x_1h',
          activatedBy: 'TestPlayer',
          activatedAt: now,
          durationMs: 1 * 60 * 60 * 1000,
        },
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockBoosts));
      mockAsyncStorage.setItem.mockResolvedValue(undefined);

      const boost = await getActiveBoostById('xp_2x_1h');
      expect(boost).not.toBeNull();
      expect(boost?.id).toBe('xp_2x_1h');
    });

    test('should return null for expired boost by ID', async () => {
      const now = Date.now();
      const mockBoosts = {
        xp_2x_1h: {
          id: 'xp_2x_1h',
          activatedBy: 'TestPlayer',
          activatedAt: now - 2 * 60 * 60 * 1000,
          durationMs: 1 * 60 * 60 * 1000,
        },
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockBoosts));
      mockAsyncStorage.setItem.mockResolvedValue(undefined);

      const boost = await getActiveBoostById('xp_2x_1h');
      expect(boost).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MULTIPLIER CALCULATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('XP Multiplier', () => {
    test('should return 1.0 when no boosts active', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const multiplier = await getXPMultiplier();
      expect(multiplier).toBe(1.0);
    });

    test('should return 2.0 when ×2 boost active', async () => {
      const now = Date.now();
      const mockBoosts = {
        xp_2x_1h: {
          id: 'xp_2x_1h',
          activatedBy: 'TestPlayer',
          activatedAt: now,
          durationMs: 1 * 60 * 60 * 1000,
        },
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockBoosts));

      const multiplier = await getXPMultiplier();
      expect(multiplier).toBe(2.0);
    });

    test('should return maximum multiplier when multiple XP boosts active', async () => {
      const now = Date.now();
      const mockBoosts = {
        xp_2x_1h: {
          id: 'xp_2x_1h',
          activatedBy: 'Player1',
          activatedAt: now,
          durationMs: 1 * 60 * 60 * 1000,
        },
        xp_1_5x_2h: {
          id: 'xp_1_5x_2h',
          activatedBy: 'Player2',
          activatedAt: now,
          durationMs: 2 * 60 * 60 * 1000,
        },
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockBoosts));

      const multiplier = await getXPMultiplier();
      expect(multiplier).toBe(2.0); // Maximum
    });

    test('should ignore energy boosts in XP multiplier', async () => {
      const now = Date.now();
      const mockBoosts = {
        energy_plus_1: {
          id: 'energy_plus_1',
          activatedBy: 'TestPlayer',
          activatedAt: now,
          durationMs: 0,
        },
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockBoosts));

      const multiplier = await getXPMultiplier();
      expect(multiplier).toBe(1.0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ENERGY BOOST
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Energy Boost', () => {
    test('should return false when no energy boost', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockAsyncStorage.setItem.mockResolvedValue(undefined);

      const has = await hasEnergyBoost();
      expect(has).toBe(false);
    });

    test('should return true when energy boost active', async () => {
      const now = Date.now();
      const mockBoosts = {
        energy_plus_1: {
          id: 'energy_plus_1',
          activatedBy: 'TestPlayer',
          activatedAt: now,
          durationMs: 1 * 60 * 60 * 1000, // Дадим полный час дюрейшена
        },
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockBoosts));
      mockAsyncStorage.setItem.mockResolvedValue(undefined);

      const has = await hasEnergyBoost();
      expect(has).toBe(true);
    });

    test('should return true when both XP and energy boost active', async () => {
      const now = Date.now();
      const mockBoosts = {
        xp_2x_1h: {
          id: 'xp_2x_1h',
          activatedBy: 'Player1',
          activatedAt: now,
          durationMs: 1 * 60 * 60 * 1000,
        },
        energy_plus_1: {
          id: 'energy_plus_1',
          activatedBy: 'Player2',
          activatedAt: now,
          durationMs: 1 * 60 * 60 * 1000, // Дадим полный час дюрейшена
        },
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockBoosts));
      mockAsyncStorage.setItem.mockResolvedValue(undefined);

      const has = await hasEnergyBoost();
      expect(has).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TIME CALCULATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Time Calculations', () => {
    test('should calculate time remaining correctly', () => {
      const now = Date.now();
      const boost: ActiveBoost = {
        id: 'xp_2x_1h',
        activatedBy: 'TestPlayer',
        activatedAt: now,
        durationMs: 1 * 60 * 60 * 1000,
      };

      const remaining = getBoostTimeRemaining(boost);
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(1 * 60 * 60 * 1000);
    });

    test('should return 0 for expired boost', () => {
      const now = Date.now();
      const boost: ActiveBoost = {
        id: 'xp_2x_1h',
        activatedBy: 'TestPlayer',
        activatedAt: now - 2 * 60 * 60 * 1000,
        durationMs: 1 * 60 * 60 * 1000,
      };

      const remaining = getBoostTimeRemaining(boost);
      expect(remaining).toBeLessThanOrEqual(0);
    });

    test('should format boost time correctly', () => {
      const now = Date.now();
      const boost: ActiveBoost = {
        id: 'xp_2x_1h',
        activatedBy: 'TestPlayer',
        activatedAt: now,
        durationMs: 1 * 60 * 60 * 1000,
      };

      const formatted = formatBoostTimeRemaining(boost);
      // Может быть "1ч 0м" или "59м 59s" в зависимости от точного времени
      expect(formatted).toBeTruthy();
      expect(formatted.length).toBeGreaterThan(0);
    });

    test('should format small remaining time', () => {
      const now = Date.now();
      const boost: ActiveBoost = {
        id: 'xp_2x_1h',
        activatedBy: 'TestPlayer',
        activatedAt: now - (59 * 60 * 1000),
        durationMs: 1 * 60 * 60 * 1000,
      };

      const formatted = formatBoostTimeRemaining(boost);
      expect(formatted).toContain('м');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BOOST DEFINITIONS & HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Boost Definition Helpers', () => {
    test('should find boost definition by ID', () => {
      const boost = getBoostDef('xp_2x_1h');
      expect(boost).toBeDefined();
      expect(boost?.id).toBe('xp_2x_1h');
      expect(boost?.cost).toBe(50);
    });

    test('should return undefined for unknown boost ID', () => {
      const boost = getBoostDef('unknown_boost');
      expect(boost).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HISTORY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Boost History', () => {
    test('should return empty history initially', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const history = await getBoostsHistory();
      expect(history).toEqual([]);
    });

    test('should retrieve boost history', async () => {
      const mockHistory = [
        {
          boostId: 'xp_2x_1h',
          activatedBy: 'Player1',
          activatedAt: Date.now(),
          cost: 50,
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockHistory));

      const history = await getBoostsHistory();
      expect(history.length).toBe(1);
      expect(history[0].boostId).toBe('xp_2x_1h');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INTEGRATION TEST: Full Boost Lifecycle
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Integration: Full Boost Lifecycle', () => {
    test('should complete full boost lifecycle', async () => {
      const mockData: { [key: string]: any } = {};

      mockAsyncStorage.getItem.mockImplementation((key: string) => {
        return Promise.resolve(
          mockData[key] ? JSON.stringify(mockData[key]) : null
        );
      });

      mockAsyncStorage.setItem.mockImplementation((key: string, value: string) => {
        mockData[key] = JSON.parse(value);
        return Promise.resolve(undefined);
      });

      // 1. Activate boost
      const activated = await activateBoost('xp_2x_1h', 'TestPlayer', 50);
      expect(activated).toBe(true);

      // 2. Retrieve active boosts
      const boosts = await getActiveBoosts();
      expect(boosts.length).toBeGreaterThan(0);

      // 3. Check XP multiplier
      const multiplier = await getXPMultiplier();
      expect(multiplier).toBe(2.0);

      // 4. Check history
      const history = await getBoostsHistory();
      expect(history.length).toBe(1);
      expect(history[0].activatedBy).toBe('TestPlayer');
    });
  });
});
