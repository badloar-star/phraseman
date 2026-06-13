/**
 * analytics.ts — единый фасад продуктовой аналитики Phraseman.
 *
 * Раньше этот модуль был «мёртвым» (писал только в локальную очередь с TODO).
 * Теперь каждый вызов trackEvent():
 *   1. идёт в Firebase Analytics (logEvent) — работает в проде уже сейчас;
 *   2. идёт в PostHog (capture), когда задан ключ EXPO_PUBLIC_POSTHOG_KEY —
 *      даёт воронки/когорты/retention без доработок;
 *   3. дублируется в offline-очередь AsyncStorage (для отладки / резерва).
 *
 * Цель: команда видит ВСЮ воронку конверсии (онбординг → intro → пейвол →
 * trial_start → purchase), а не только разрозненные paywall-события.
 *
 * Использование:
 *   trackEvent('paywall_shown', { context: 'streak', source: 'automatic' });
 *   trackEvent('purchase_started', { context: 'quiz_limit', plan: 'yearly' });
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logEvent as firebaseLogEvent } from './firebase';
import {
  capturePostHog,
  identifyPostHog,
  resetPostHog,
  isPostHogEnabled,
} from './posthog_client';

// ── Типы событий ──────────────────────────────────────────────────────────────
// Воронка конверсии (новые, ранее не трекавшиеся) выделена отдельным блоком.
export type AnalyticsEvent =
  // обучение
  | 'app_open'
  | 'lesson_start'
  | 'lesson_complete'
  | 'lesson_abandon'
  | 'quiz_start'
  | 'quiz_complete'
  | 'dialog_complete'
  // ИИ-диалоги (Фаза 0 — воронка спроса)
  | 'ai_dialog_card_shown'
  | 'ai_dialog_card_tapped'
  | 'ai_dialog_started'
  | 'ai_dialog_message_sent'
  | 'ai_dialog_suggested_tapped'
  | 'ai_dialog_completed'
  | 'ai_dialog_abandoned'
  | 'ai_dialog_limit_hit'
  | 'ai_dialog_tts_used'
  | 'ai_dialog_phrase_tapped'
  | 'ai_dialog_translation_used'
  // «Объясни как для 5-летнего» (Фаза 5 — adoption/cohort + health кэш-хитов)
  | 'explain_button_shown'
  | 'explain_sheet_opened'
  | 'explain_sheet_closed'
  | 'review_session'
  | 'words_session'
  | 'verbs_session'
  | 'exam_start'
  | 'exam_complete'
  | 'diagnostic_start'
  | 'diagnostic_complete'
  | 'streak_achieved'
  | 'streak_lost'
  | 'wager_placed'
  | 'wager_won'
  | 'wager_lost'
  | 'achievement_unlocked'
  | 'treasure_chest_opened'
  | 'login_bonus_received'
  // ── ВОРОНКА КОНВЕРСИИ ──────────────────────────────────────────────────
  | 'onboarding_step_view'        // показан шаг онбординга (props.step)
  | 'onboarding_complete'
  | 'onboarding_plan_paywall_view'
  | 'onboarding_plan_trial_cta'   // нажата CTA триала/подписки в онбординге
  | 'onboarding_continue_free'    // «Продолжить без плана»
  | 'intro_full_access_started'   // активирован 72ч полный доступ
  | 'intro_welcome_shown'
  | 'intro_welcome_cta'
  | 'intro_ended_shown'           // показана модалка «3 дня закончились»
  | 'intro_ended_cta'             // нажата «Открыть полный доступ»
  | 'intro_ended_dismiss'         // «Продолжить бесплатно»
  | 'paywall_shown'
  | 'paywall_plan_select'
  | 'paywall_cta_click'
  | 'paywall_close'
  | 'paywall_continue_free'
  | 'paywall_scroll_depth'        // эксперимент v3: глубина чтения галереи доказательств (B/C)
  | 'purchase_started'            // нажат CTA, открывается диалог стора
  | 'purchase_completed'
  | 'purchase_failed'
  | 'purchase_cancelled'
  | 'subscription_restored'
  | 'trial_started'
  | 'trial_reminder_scheduled'    // поставлен локальный пуш «триал кончается завтра»
  // ── after-win апсейл / re-engagement (план #3, #7) ────────────────────────
  | 'afterwin_upsell_shown'
  | 'afterwin_upsell_cta'
  | 'paywall_abandoned_push_sent'
  | 'winback_shown';

interface EventRecord {
  event: AnalyticsEvent;
  props: Record<string, unknown>;
  ts: number; // unix ms
}

const STORAGE_KEY = 'analytics_queue';
const MAX_QUEUE = 200; // не накапливать бесконечно

/** Firebase-имена событий допускают [a-zA-Z0-9_], начинаются с буквы, ≤40 симв. */
function firebaseSafeName(event: string): string {
  return event.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 40);
}

/** В Firebase params значения должны быть string|number. Приводим безопасно. */
function firebaseSafeParams(props: Record<string, unknown>): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(props)) {
    if (v == null) continue;
    out[k.slice(0, 40)] = typeof v === 'number' ? v : String(v).slice(0, 100);
  }
  return out;
}

// ── Идентификация пользователя (фасад над posthog_client) ───────────────────────
// Единая реализация PostHog живёт в ./posthog_client. Эти обёртки сохраняют
// API, на который завязаны auth_provider.ts и _layout.tsx (identifyUser /
// resetAnalyticsIdentity), не дублируя инициализацию SDK.

/** Активна ли отправка в PostHog (ключ задан, пакет установлен). */
export function isPosthogEnabled(): boolean {
  return isPostHogEnabled();
}

/** Привязать события к пользователю (вызывать после логина/восстановления). */
export const identifyUser = async (userId: string, props: Record<string, unknown> = {}): Promise<void> => {
  try {
    identifyPostHog(userId, props);
  } catch {
    // analytics must never crash the app
  }
};

/** Сбросить идентификацию (вызывать при выходе). */
export const resetAnalyticsIdentity = async (): Promise<void> => {
  try {
    resetPostHog();
  } catch {
    // ignore
  }
};

// ── Запись события (фасад) ─────────────────────────────────────────────────────
export const trackEvent = async (
  event: AnalyticsEvent,
  props: Record<string, unknown> = {},
): Promise<void> => {
  // 1) Firebase — синхронно, не блокирует
  try {
    firebaseLogEvent(firebaseSafeName(event), firebaseSafeParams(props));
  } catch {
    /* аналитика не должна ломать приложение */
  }

  // 2) PostHog — no-op, если ключ не задан
  try {
    capturePostHog(event, props);
  } catch {
    /* no-op */
  }

  // 3) Offline-очередь (резерв/отладка)
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const queue: EventRecord[] = raw ? JSON.parse(raw) : [];
    queue.push({ event, props, ts: Date.now() });
    if (queue.length > MAX_QUEUE) queue.splice(0, queue.length - MAX_QUEUE);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    /* no-op */
  }
};

// ── Очередь (отладка / резерв) ─────────────────────────────────────────────────
export const getEventQueue = async (): Promise<EventRecord[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const clearEventQueue = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    /* no-op */
  }
};

/** Сброс локальной очереди (события уже ушли в Firebase/PostHog в реальном времени). */
export const flushAnalytics = async (): Promise<void> => {
  try {
    const queue = await getEventQueue();
    if (queue.length === 0) return;

    // PostHog (когда включён) получает события в реальном времени через
    // trackEvent → capturePostHog. Локальная очередь — резерв/отладка; чистим её,
    // чтобы не копить дубли. Если PostHog выключен — очередь просто очищается
    // (события всё равно записаны локально до этого вызова).
    if (isPostHogEnabled()) {
      for (const e of queue) {
        try { capturePostHog(e.event, e.props); } catch { /* ignore */ }
      }
    }

    if (__DEV__) {
      console.log(`[Analytics] flushed ${queue.length} events (posthog=${isPostHogEnabled()})`);
    }

    await clearEventQueue();
  } catch {}
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
