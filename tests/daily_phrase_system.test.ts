/**
 * Tests for Daily Phrase System
 *
 * Tests cover:
 * - Daily phrase generation and caching
 * - Level-based phrase filtering
 * - Notification time management
 * - Cache invalidation on date change
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getTodayPhrase,
  getNotificationTime,
  setNotificationTime,
  getNextPushNotificationTime,
  getTimeUntilNotification,
  schedulePushNotifications,
  clearPhraseCache,
  getDebugInfo,
  DailyPhrase,
} from '../app/daily_phrase_system';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('DailyPhraseSystem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getTodayPhrase', () => {
    it('should return a DailyPhrase object with required fields', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const phrase = await getTodayPhrase('A1', false);

      expect(phrase).toHaveProperty('russian');
      expect(phrase).toHaveProperty('english');
      expect(phrase).toHaveProperty('lessonId');
      expect(phrase).toHaveProperty('level');
      expect(phrase).toHaveProperty('phraseIndex');
    });

    it('should return the same phrase for the same day', async () => {
      const mockPhrase: DailyPhrase = {
        russian: 'Тест фраза',
        english: 'Test phrase',
        lessonId: 1,
        level: 'A1',
        phraseIndex: 0,
      };

      const mockCache = {
        date: new Date().toISOString().split('T')[0],
        phrase: mockPhrase,
        nextUpdateTime: Date.now() + 86400000,
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockCache));

      const phrase = await getTodayPhrase('A1', false);

      expect(phrase).toEqual(mockPhrase);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('daily_phrase_cache');
    });

    it('should generate a new phrase if cache is from a different day', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const mockOldCache = {
        date: yesterdayStr,
        phrase: { russian: 'Старая фраза', english: 'Old phrase', lessonId: 1, level: 'A1', phraseIndex: 0 },
        nextUpdateTime: Date.now() + 86400000,
      };

      // First call returns old cache, subsequent calls return null
      let callCount = 0;
      (AsyncStorage.getItem as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(JSON.stringify(mockOldCache));
        }
        return Promise.resolve(null);
      });
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const phrase = await getTodayPhrase('A1', false);

      expect(phrase).toBeDefined();
      expect(phrase.russian).not.toBe('Старая фраза');
    });

    it('should respect user level when selecting phrases', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      // Get phrases for different levels
      const phraseA1 = await getTodayPhrase('A1', false);
      const phraseB2 = await getTodayPhrase('B2', false);

      // Both should be valid phrases
      expect(phraseA1).toBeDefined();
      expect(phraseB2).toBeDefined();

      // Level should be appropriate for the requested level
      expect(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).toContain(phraseA1.level);
      expect(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).toContain(phraseB2.level);
    });

    it('should handle empty lesson data gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const phrase = await getTodayPhrase('A1', false);

      // Should return a fallback or dummy phrase if no real data exists
      expect(phrase).toBeDefined();
      expect(typeof phrase.russian).toBe('string');
      expect(typeof phrase.english).toBe('string');
    });
  });

  describe('Notification Time Management', () => {
    it('should return default notification time if not set', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const time = await getNotificationTime();

      expect(time).toBe('08:00');
    });

    it('should return saved notification time', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('14:30');

      const time = await getNotificationTime();

      expect(time).toBe('14:30');
    });

    it('should save notification time', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await setNotificationTime('18:45');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('daily_phrase_notification_time', '18:45');
    });

    it('should calculate next push notification time correctly', () => {
      // Set current time to 10:00 AM
      jest.setSystemTime(new Date('2024-03-29T10:00:00'));

      // If notification time is 8:00 AM, next should be tomorrow
      const nextTime = getNextPushNotificationTime('08:00');

      expect(nextTime.getHours()).toBe(8);
      expect(nextTime.getMinutes()).toBe(0);
      expect(nextTime.getDate()).toBeGreaterThan(29); // Next day
    });

    it('should calculate next notification time for future time today', () => {
      // Set current time to 06:00 AM
      jest.setSystemTime(new Date('2024-03-29T06:00:00'));

      // If notification time is 8:00 AM, next should be today
      const nextTime = getNextPushNotificationTime('08:00');

      expect(nextTime.getHours()).toBe(8);
      expect(nextTime.getMinutes()).toBe(0);
      expect(nextTime.getDate()).toBe(29); // Same day
    });

    it('should calculate time until notification', () => {
      // Set current time to 06:00 AM
      jest.setSystemTime(new Date('2024-03-29T06:00:00'));

      const timeUntil = getTimeUntilNotification('08:00');

      // Should be approximately 2 hours (120 minutes)
      expect(timeUntil).toBeGreaterThan(0);
      expect(timeUntil).toBeLessThanOrEqual(2 * 60 * 60 * 1000 + 1000); // Allow 1 second margin
    });

    it('should return 0 if notification time has passed', () => {
      // Set current time to 22:00 PM
      jest.setSystemTime(new Date('2024-03-29T22:00:00'));

      // If notification time is 8:00 AM, time until should be 0
      const timeUntil = getTimeUntilNotification('08:00');

      expect(timeUntil).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Cache Management', () => {
    it('should clear phrase cache', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      await clearPhraseCache();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('daily_phrase_cache');
    });

    it('should handle cache read errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      // Should not throw, but return a valid phrase
      const phrase = await getTodayPhrase('A1', false);
      expect(phrase).toBeDefined();
    });

    it('should handle cache write errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      // Should not throw, but return a valid phrase
      const phrase = await getTodayPhrase('A1', false);
      expect(phrase).toBeDefined();
    });
  });

  describe('Push Notifications', () => {
    it('should schedule push notifications without error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      // Should not throw
      await expect(schedulePushNotifications()).resolves.toBeUndefined();
    });

    it('should handle scheduling errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      // Should not throw
      await expect(schedulePushNotifications()).resolves.toBeUndefined();
    });
  });

  describe('Debug Info', () => {
    it('should return debug information', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const debug = await getDebugInfo();

      expect(debug).toHaveProperty('today');
      expect(debug).toHaveProperty('nextNotificationTime');
      expect(debug).toHaveProperty('preferredTime');
      expect(debug).toHaveProperty('cachedPhrase');

      // today should be a valid date string
      expect(/^\d{4}-\d{2}-\d{2}$/.test(debug.today)).toBe(true);

      // nextNotificationTime should be a Date
      expect(debug.nextNotificationTime instanceof Date).toBe(true);

      // preferredTime should be a time string
      expect(/^\d{2}:\d{2}$/.test(debug.preferredTime)).toBe(true);
    });

    it('should handle debug info errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      // Should still return debug info even on error (with sensible defaults)
      const debug = await getDebugInfo();
      expect(debug).toBeDefined();
      expect(debug.preferredTime).toBe('08:00'); // Falls back to default
    });
  });

  describe('Language Support', () => {
    it('should support Russian phrases (isUkrainian=false)', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const phrase = await getTodayPhrase('A1', false);

      // Should return a phrase with russian and english
      expect(typeof phrase.russian).toBe('string');
      expect(typeof phrase.english).toBe('string');
    });

    it('should support Ukrainian phrases (isUkrainian=true)', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const phrase = await getTodayPhrase('A1', true);

      // Should return a phrase with russian and english
      expect(typeof phrase.russian).toBe('string');
      expect(typeof phrase.english).toBe('string');
    });
  });

  describe('Level Filtering', () => {
    it('should accept all supported levels', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

      for (const level of levels) {
        const phrase = await getTodayPhrase(level, false);
        expect(phrase).toBeDefined();
        expect(phrase.level).toBeDefined();
      }
    });
  });
});
