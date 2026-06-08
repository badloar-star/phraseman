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

// ── PostHog bridge ──────────────────────────────────────────────────────────
// Активируется ТОЛЬКО при наличии EXPO_PUBLIC_POSTHOG_KEY. Без ключа — no-op,
// события продолжают копиться в локальной очереди (offline-first). Ключ НЕ
// хардкодим: задаётся через env. SDK грузится лениво, чтобы отсутствие пакета
// (Expo Go / web) не ломало приложение.
const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

type PosthogLike = {
  capture: (event: string, props?: Record<string, any>) => void;
  identify: (id: string, props?: Record<string, any>) => void;
  reset: () => void;
};

let _posthog: PosthogLike | null = null;
let _posthogInitPromise: Promise<PosthogLike | null> | null = null;

export function isPosthogEnabled(): boolean {
  return typeof POSTHOG_KEY === 'string' && POSTHOG_KEY.length > 0;
}

async function getPosthog(): Promise<PosthogLike | null> {
  if (!isPosthogEnabled()) return null;
  if (_posthog) return _posthog;
  if (_posthogInitPromise) return _posthogInitPromise;
  _posthogInitPromise = (async () => {
    try {
      const mod = await import('posthog-react-native');
      const PostHog = (mod as any).default ?? (mod as any).PostHog;
      const client = new PostHog(POSTHOG_KEY as string, { host: POSTHOG_HOST });
      _posthog = client as PosthogLike;
      return _posthog;
    } catch {
      return null;
    }
  })();
  return _posthogInitPromise;
}

/** Привязать события к пользователю (вызывать после логина/восстановления). */
export const identifyUser = async (userId: string, props: Record<string, any> = {}): Promise<void> => {
  try {
    const ph = await getPosthog();
    ph?.identify(userId, props);
  } catch {
    // analytics must never crash the app
  }
};

/** Сбросить идентификацию (вызывать при выходе). */
export const resetAnalyticsIdentity = async (): Promise<void> => {
  try {
    const ph = await getPosthog();
    ph?.reset();
  } catch {
    // ignore
  }
};

// ── Запись события ────────────────────────────────────────────────────────────
export const trackEvent = async (
  event: AnalyticsEvent,
  props: Record<string, any> = {}
): Promise<void> => {
  // Forward to PostHog when enabled (fire-and-forget; never blocks).
  if (isPosthogEnabled()) {
    void getPosthog().then((ph) => {
      try {
        ph?.capture(event, props);
      } catch {
        // ignore
      }
    });
  }
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

    // PostHog (когда включён) получает события в реальном времени через
    // trackEvent → capture. Локальная очередь — резерв/отладка; чистим её,
    // чтобы не копить дубли. Если PostHog выключен — очередь просто очищается
    // (события всё равно записаны локально до этого вызова).
    if (isPosthogEnabled()) {
      const ph = await getPosthog();
      if (ph) {
        for (const e of queue) {
          try { ph.capture(e.event, e.props); } catch { /* ignore */ }
        }
      }
    }

    if (__DEV__) {
      console.log(`[Analytics] flushed ${queue.length} events (posthog=${isPosthogEnabled()})`);
    }

    await clearEventQueue();
  } catch {}
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
