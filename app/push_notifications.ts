/**
 * Система Push-уведомлений (заготовка)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Lang } from '../constants/i18n';

export interface NotificationSchedule {
  type: 'phrase_of_day' | 'streak_reminder' | 'streak_warning';
  time: string;
  enabled: boolean;
}

const NOTIFICATION_SETTINGS_KEY = 'notification_settings';
const NOTIFICATIONS_ENABLED_KEY = 'notifications_enabled';

export const getNotificationSettings = async (): Promise<NotificationSchedule[]> => {
  try {
    const saved = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [
    { type: 'phrase_of_day', time: '08:00', enabled: true },
    { type: 'streak_reminder', time: '20:00', enabled: true },
    { type: 'streak_warning', time: '21:00', enabled: true },
  ];
};

export const areNotificationsEnabled = async (): Promise<boolean> => {
  try {
    const saved = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
    return saved === null ? true : JSON.parse(saved);
  } catch {
    return true;
  }
};

export const getPhraseOfDayText = (englishPhrase: string, lang: Lang = 'ru') => ({
  title: lang === 'uk' ? 'Фраза дня ✨' : lang === 'es' ? 'Frase del día ✨' : 'Фраза дня ✨',
  body: englishPhrase,
});

export const getStreakReminderText = (streakDays: number, lang: Lang) => ({
  title:
    lang === 'uk'
      ? `Твоя серія: ${streakDays} днів 🔥`
      : lang === 'es'
        ? `Tu racha: ${streakDays} días 🔥`
        : `Твой стрик: ${streakDays} дней 🔥`,
  body: lang === 'uk' ? 'Займайся сьогодні!' : lang === 'es' ? '¡Practica hoy!' : 'Займись сегодня!',
});

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
