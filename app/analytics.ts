/**
 * analytics.ts — Простой event-трекинг для Phraseman.
 *
 * Хранит события локально в AsyncStorage (offline-first).
 * Готов к интеграции с Amplitude/Mixpanel/PostHog — просто заменить flush().
 *
 * Использование:
 *   trackEvent('lesson_complete', { lessonId: 5, score: 8, total: 10 });
 *   trackEvent('quiz_start', { level: 'hard' });
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Типы событий ──────────────────────────────────────────────────────────────
export type AnalyticsEvent =
  | 'app_open'
  | 'lesson_start'
  | 'lesson_complete'
  | 'lesson_abandon'
  | 'quiz_start'
  | 'quiz_complete'
  | 'dialog_complete'
  | 'review_session'
  | 'words_session'
  | 'verbs_session'
  | 'exam_start'
  | 'exam_complete'
  | 'diagnostic_start'
  | 'diagnostic_complete'
  | 'paywall_shown'
  | 'subscription_started'
  | 'subscription_restored'
  | 'streak_achieved'
  | 'streak_lost'
  | 'wager_placed'
  | 'wager_won'
  | 'wager_lost'
  | 'achievement_unlocked'
  | 'treasure_chest_opened'
  | 'login_bonus_received'
  | 'onboarding_complete';

interface EventRecord {
  event: AnalyticsEvent;
  props: Record<string, any>;
  ts: number; // unix ms
}

const STORAGE_KEY = 'analytics_queue';
const MAX_QUEUE = 200; // не накапливать бесконечно

// ── Запись события ────────────────────────────────────────────────────────────
export const trackEvent = async (
  event: AnalyticsEvent,
  props: Record<string, any> = {}
): Promise<void> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const queue: EventRecord[] = raw ? JSON.parse(raw) : [];

    queue.push({ event, props, ts: Date.now() });

    // Обрезаем если очередь переполнена
    if (queue.length > MAX_QUEUE) queue.splice(0, queue.length - MAX_QUEUE);

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Аналитика не должна ломать приложение
  }
};

// ── Получить очередь (для отладки или отправки) ───────────────────────────────
export const getEventQueue = async (): Promise<EventRecord[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

// ── Очистить очередь после отправки ──────────────────────────────────────────
export const clearEventQueue = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {}
};

/**
 * flush() — точка интеграции с внешним сервисом.
 * Сейчас логирует в dev-режиме. Заменить тело на Amplitude.track() / Mixpanel.track().
 */
export const flushAnalytics = async (): Promise<void> => {
  try {
    const queue = await getEventQueue();
    if (queue.length === 0) return;

    // TODO: заменить на реальный SDK когда выберете платформу
    // Пример с Amplitude:
    //   for (const e of queue) await amplitude.track(e.event, e.props);
    // Пример с PostHog:
    //   for (const e of queue) posthog.capture(e.event, e.props);

    if (__DEV__) {
      console.log(`[Analytics] ${queue.length} events in queue:`, queue.map(e => e.event));
    }

    await clearEventQueue();
  } catch {}
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
