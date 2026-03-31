/**
 * Tests for Daily Phrase System
 *
 * Tests cover:
 * - Daily phrase generation and caching
 * - Level-based phrase assignment
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getTodayPhrase,
  DailyPhrase,
} from '../app/daily_phrase_system';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

describe('DailyPhraseSystem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getTodayPhrase', () => {
    it('should return a DailyPhrase object with required fields', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const phrase = await getTodayPhrase();

      expect(phrase).toHaveProperty('russian');
      expect(phrase).toHaveProperty('english');
      expect(phrase).toHaveProperty('lessonId');
      expect(phrase).toHaveProperty('level');
      expect(phrase).toHaveProperty('date');
    });

    it('should return the same phrase for the same day', async () => {
      const mockPhrase: DailyPhrase = {
        russian: 'Тест фраза',
        english: 'Test phrase',
        lessonId: 1,
        level: 'A1',
        date: new Date().toISOString().split('T')[0],
      };

      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(new Date().toISOString().split('T')[0]) // savedDate
        .mockResolvedValueOnce(JSON.stringify(mockPhrase)); // phraseStr

      const phrase = await getTodayPhrase();

      expect(phrase).toEqual(mockPhrase);
    });

    it('should generate a new phrase if cache is from a different day', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(yesterdayStr) // old date
        .mockResolvedValueOnce(null); // no phrase returned

      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const phrase = await getTodayPhrase();

      expect(phrase).toBeDefined();
      expect(phrase.russian).toBeDefined();
      expect(phrase.english).toBeDefined();
    });

    it('should return phrases with valid CEFR levels', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const phrase = await getTodayPhrase();

      expect(phrase).toBeDefined();
      expect(['A1', 'A2', 'B1', 'B2']).toContain(phrase.level);
    });

    it('should handle cache read errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const phrase = await getTodayPhrase();

      expect(phrase).toBeDefined();
      expect(phrase.russian).toBeDefined();
      expect(phrase.english).toBeDefined();
    });
  });
});
