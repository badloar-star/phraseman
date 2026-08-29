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
 *   trackEvent('purchase_started', { context: 'lesson_complete', plan: 'yearly' });
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logEvent as firebaseLogEvent } from './firebase';
import {
  capturePostHog,
  identifyPostHog,
  resetPostHog,
  isPostHogEnabled,
} from './posthog_client';
import {
  SOFT_UPSELL_CONTEXTS,
  SOFT_UPSELL_TRIGGERS,
  type SoftUpsellContext,
  type SoftUpsellDestination,
  type SoftUpsellStudyTarget,
  type SoftUpsellSuppressionReason,
  type SoftUpsellTrigger,
} from './soft_upsell_core';
import type { GovernedProductAnalyticsEventName } from './product_analytics_event_catalog';
import { DebugLogger } from './debug-logger';

// ── Типы событий ──────────────────────────────────────────────────────────────
// Воронка конверсии (новые, ранее не трекавшиеся) выделена отдельным блоком.
export type AnalyticsEvent =
  | GovernedProductAnalyticsEventName
  // Consent-gated product navigation/session analytics (schema v1).
  | 'product_session_start'
  | 'product_session_resume'
  | 'product_session_background'
  | 'product_screen_view'
  | 'product_screen_leave'
  | 'product_operation_failure'
  | 'soft_upsell_eligible'
  | 'soft_upsell_impression'
  | 'soft_upsell_cta'
  | 'soft_upsell_dismiss'
  | 'soft_upsell_suppressed'
  | 'settings_message_impression'
  | 'settings_poll_vote'
  // обучение
  | 'app_open'
  | 'lesson_start'
  | 'lesson_complete'
  | 'lesson_abandon'
  | 'dialog_complete'
  | 'plan_content_source'
  | 'plan_content_fallback'
  | 'mistake_practice_menu_opened'
  | 'mistake_practice_setup_started'
  | 'mistake_practice_session_started'
  | 'mistake_practice_answered'
  | 'mistake_practice_session_completed'
  | 'mistake_practice_session_abandoned'
  | 'mistake_practice_hidden'
  | 'mistake_practice_restored'
  | 'mistake_practice_voice_outcome'
  | 'mistake_practice_content_unavailable'
  | 'mistake_practice_loop_available'
  | 'mistake_practice_loop_started'
  // ИИ-диалоги (Фаза 0 — воронка спроса)
  | 'ai_dialog_card_shown'
  | 'ai_dialog_card_tapped'
  | 'ai_dialog_started'
  | 'ai_dialog_message_sent'
  | 'ai_dialog_suggested_tapped'
  // зачем (аудит 2026-08-23): экран диалога слал это событие, но в реестре его
  // не было — открытия подсказки не измерялись. В событии только scenarioId.
  | 'ai_dialog_hint_opened'
  | 'ai_dialog_completed'
  | 'ai_dialog_abandoned'
  | 'ai_dialog_limit_hit'
  | 'ai_dialog_tts_used'
  | 'ai_dialog_phrase_tapped'
  | 'ai_dialog_translation_used'
  | 'ai_dialog_translate_requested'
  | 'ai_dialog_translate_shown'
  | 'ai_dialog_translate_error'
  | 'ai_dialog_outcome'
  | 'ai_dialog_retry_scenario'
  // Финальный «разбор полётов» диалога (premiumDialogReview).
  | 'ai_dialog_review_shown'
  | 'ai_dialog_review_failed'
  | 'ai_dialog_locked_scenario_tapped'
  | 'ai_dialog_send_error'
  | 'ai_dialog_retry'
  // Говорение («Устно»): успешная попытка проговорить фразу вслух (premium).
  | 'speaking_attempt_passed'
  | 'max_tutor_board_shown'
  | 'max_tutor_board_listened'
  | 'max_tutor_board_dismissed'
  | 'max_tutor_topic_changed'
  | 'max_tutor_review_practice_started'
  // зачем (аудит 2026-08-23): экран разбора звонка слал это событие, но в
  // реестре его не было — событие терялось, а отклик на отзывы не измерялся.
  | 'max_voice_feedback_sent'
  | 'feedback_entry_sent'
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
  | 'onboarding_skip'             // нажал «Пропустить» (props.step — откуда ушёл)
  | 'onboarding_welcome_sheet_view' // показана приветственная шторка после онбординга
  | 'onboarding_consent_done'      // согласия и возраст собраны на шаге «name» (ДО пробного и цен)
  | 'onboarding_complete'          // онбординг окончен — любой выход с пейвола (после согласий)
  | 'onboarding_source_select'
  | 'onboarding_plan_goal_select'    // выбрана цель плана (props.goal)
  | 'onboarding_plan_level_select'   // выбран уровень (props.level)
  | 'onboarding_plan_minutes_select' // выбраны минуты/день (props.minutes)
  | 'onboarding_plan_billing_select' // выбран тариф на onboarding paywall (props.plan)
  | 'onboarding_trial_reminder_choice' // выбран режим напоминания о конце триала
  | 'onboarding_plan_phrase_done'    // собрал первую фразу (props.correct) — сигнал активации
  | 'onboarding_plan_paywall_view'
  | 'onboarding_plan_trial_cta'   // нажата CTA триала/подписки в онбординге
  | 'onboarding_continue_free'    // «Продолжить без плана»
  | 'onboarding_promo_redeemed'   // промокод активирован из меню пейвола (props.kind)
  | 'onboarding_referral_applied' // код друга применён из меню пейвола (props.already)
  | 'intro_full_access_started'   // активирован 72ч полный доступ
  | 'intro_welcome_shown'
  | 'intro_welcome_cta'
  | 'intro_ended_shown'           // показана модалка «3 дня закончились»
  | 'intro_ended_cta'             // нажата «Открыть полный доступ»
  | 'intro_ended_dismiss'         // «Продолжить бесплатно»
  // ── Подарок лояльности (72ч существующим free-юзерам в честь обновления) ──
  | 'loyalty_gift_offer_shown'    // показан модал «обновление + подарок» (free)
  | 'loyalty_gift_offer_cta'      // нажата «Получить 3 дня премиум»
  | 'loyalty_gift_offer_dismiss'  // «Может позже»
  | 'loyalty_update_announce_shown' // показан модал обновления премиум/VIP (без подарка)
  | 'loyalty_update_announce_cta'   // премиум/VIP закрыл анонс кнопкой «Посмотреть»
  | 'loyalty_ideas_block_tapped'    // тап по блоку «год доступа за идею» → Настройки → Идеи
  | 'loyalty_gift_started'        // активирован 72ч подарок лояльности
  | 'loyalty_gift_ended_shown'    // показана модалка «подарок закончился»
  | 'loyalty_gift_ended_cta'      // нажата «Открыть полный доступ» после истечения
  | 'loyalty_gift_ended_dismiss'  // «Продолжить бесплатно» после истечения
  | 'paywall_shown'
  | 'experiment_exposure'
  | 'paywall_personalization_tag_shown'
  | 'paywall_plan_select'
  | 'paywall_cta_click'
  | 'paywall_close'
  | 'paywall_continue_free'
  | 'paywall_scroll_depth'        // эксперимент v3: глубина чтения галереи доказательств (B/C)
  | 'paywall_exit_offer_shown'    // exit-intent: показан тёплый триал-оффер при попытке уйти
  | 'paywall_exit_offer_accepted' // exit-intent: юзер согласился попробовать триал
  | 'paywall_exit_offer_declined' // exit-intent: юзер отказался и закрыл
  // Удержание в момент отмены подписки (аудит 2026-08-24): причина отмены → шаг
  // удержания. Пара shown/skipped показывает, на сколько отмен нашёлся ответ.
  | 'cancel_save_offer_shown'     // показан шаг удержания (в payload: reason, offer)
  | 'cancel_save_offer_skipped'   // предложить было нечего — ушёл в стор сразу
  | 'cancel_save_offer_accepted'  // принял удержание (годовой / поддержка / остался)
  | 'cancel_save_offer_declined'  // отказался и ушёл в стор отменять
  | 'paywall_inventory_resolved'
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
  // ── управление подпиской ──────────────────────────────────────────────────
  | 'subscription_cancel_survey'   // отправлен опрос «почему уходишь»
  | 'change_plan_started'          // нажал «перейти на годовой»
  | 'change_plan_completed'
  | 'change_plan_failed'
  | 'winback_shown'
  ;

interface EventRecord {
  event: AnalyticsEvent;
  props: Record<string, unknown>;
  ts: number; // unix ms
}

const STORAGE_KEY = 'analytics_queue';
const MAX_QUEUE = 200; // не накапливать бесконечно
const DUPLICATE_EVENT_WINDOW_MS = 750;
const LOCAL_ANALYTICS_QUEUE_ENABLED = false;
let lastEventKey = '';
let lastEventAt = 0;
let eventQueueCache: EventRecord[] | null = null;

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

function parseEventQueue(raw: string | null): EventRecord[] {
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item): item is EventRecord => (
        item != null
        && typeof item === 'object'
        && typeof (item as EventRecord).event === 'string'
        && typeof (item as EventRecord).props === 'object'
        && typeof (item as EventRecord).ts === 'number'
      ))
      : [];
  } catch {
    return [];
  }
}

async function readEventQueueFromStorage(): Promise<EventRecord[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
  return parseEventQueue(raw);
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
  } catch (e) {
      // analytics must never crash the app
      DebugLogger.error('analytics:identifyUser', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
};

/** Сбросить идентификацию (вызывать при выходе). */
export const resetAnalyticsIdentity = async (): Promise<void> => {
  try {
    resetPostHog();
  } catch (e) {
      // ignore
      DebugLogger.error('analytics:resetAnalyticsIdentity', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
};

// ── Запись события (фасад) ─────────────────────────────────────────────────────
export const trackEvent = async (
  event: AnalyticsEvent,
  props: Record<string, unknown> = {},
): Promise<void> => {
  const now = Date.now();
  const eventKey = `${event}|${JSON.stringify(props)}`;
  if (eventKey === lastEventKey && now - lastEventAt < DUPLICATE_EVENT_WINDOW_MS) return;
  lastEventKey = eventKey;
  lastEventAt = now;

  // 1) Firebase — синхронно, не блокирует
  try {
    firebaseLogEvent(firebaseSafeName(event), firebaseSafeParams(props));
  } catch (e) {
      // аналитика не должна ломать приложение
      DebugLogger.error('analytics:eventKey', e instanceof Error ? e : new Error(String(e)), 'warning');
    }

  // 2) PostHog — no-op, если ключ не задан
  try {
    capturePostHog(event, props);
  } catch (e) {
      // no-op
      DebugLogger.error('analytics:eventKey', e instanceof Error ? e : new Error(String(e)), 'warning');
    }

  // 3) Offline-очередь (резерв/отладка)
  try {
    if (!LOCAL_ANALYTICS_QUEUE_ENABLED) return;
    if (eventQueueCache === null) {
      eventQueueCache = await readEventQueueFromStorage();
    }
    eventQueueCache.push({ event, props, ts: now });
    if (eventQueueCache.length > MAX_QUEUE) eventQueueCache.splice(0, eventQueueCache.length - MAX_QUEUE);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(eventQueueCache));
  } catch (e) {
      // no-op
      DebugLogger.error('analytics:eventKey', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
};

export const SOFT_UPSELL_ANALYTICS_EVENTS = [
  'soft_upsell_eligible',
  'soft_upsell_impression',
  'soft_upsell_cta',
  'soft_upsell_dismiss',
  'soft_upsell_suppressed',
] as const;

type SoftUpsellAnalyticsEvent = (typeof SOFT_UPSELL_ANALYTICS_EVENTS)[number];
type SoftUpsellAnalyticsBase = {
  context: SoftUpsellContext;
  trigger: SoftUpsellTrigger;
  studyTarget: SoftUpsellStudyTarget;
  overlayOccupied: boolean;
  schemaVersion: 1;
  triggerValue: number;
};
type SoftUpsellNoOutcomeFields = {
  destination?: never;
  suppressionReason?: never;
};
export type SoftUpsellAnalyticsPayloadByEvent = {
  soft_upsell_eligible: SoftUpsellAnalyticsBase & SoftUpsellNoOutcomeFields;
  soft_upsell_impression: SoftUpsellAnalyticsBase & {
    destination: SoftUpsellDestination;
    suppressionReason?: never;
  };
  soft_upsell_cta: SoftUpsellAnalyticsBase & {
    destination: SoftUpsellDestination;
    suppressionReason?: never;
  };
  soft_upsell_dismiss: SoftUpsellAnalyticsBase & SoftUpsellNoOutcomeFields;
  soft_upsell_suppressed: SoftUpsellAnalyticsBase & {
    destination?: never;
    suppressionReason: SoftUpsellSuppressionReason;
  };
};

const SOFT_UPSELL_DESTINATIONS: readonly SoftUpsellDestination[] = ['paywall'];
const SOFT_UPSELL_SUPPRESSION_REASONS: readonly SoftUpsellSuppressionReason[] = [
  'no_candidate', 'premium', 'disabled', 'overlay_occupied', 'session_cap',
  'global_cooldown', 'context_cooldown', 'milestone_consumed', 'invalid_trigger_value',
];

export async function trackSoftUpsellEvent<Event extends SoftUpsellAnalyticsEvent>(
  event: Event,
  payload: SoftUpsellAnalyticsPayloadByEvent[Event],
): Promise<void> {
  const candidate = payload as SoftUpsellAnalyticsBase & {
    destination?: unknown;
    suppressionReason?: unknown;
  };
  if (!SOFT_UPSELL_ANALYTICS_EVENTS.includes(event)) return;
  if (!SOFT_UPSELL_CONTEXTS.includes(candidate?.context)) return;
  if (!SOFT_UPSELL_TRIGGERS.includes(candidate?.trigger)) return;
  if (candidate?.studyTarget !== 'en' && candidate?.studyTarget !== 'fr') return;
  if (typeof candidate?.overlayOccupied !== 'boolean' || candidate?.schemaVersion !== 1) return;
  if (!Number.isSafeInteger(candidate?.triggerValue) || candidate.triggerValue < 0 || candidate.triggerValue > 10_000) return;

  const destinationAllowed = event === 'soft_upsell_impression' || event === 'soft_upsell_cta';
  if (destinationAllowed) {
    if (!SOFT_UPSELL_DESTINATIONS.includes(candidate.destination as SoftUpsellDestination)) return;
  } else if (candidate.destination != null) return;

  if (event === 'soft_upsell_suppressed') {
    if (!SOFT_UPSELL_SUPPRESSION_REASONS.includes(candidate.suppressionReason as SoftUpsellSuppressionReason)) return;
  } else if (candidate.suppressionReason != null) return;

  const props: Record<string, string | number | boolean> = {
    context: candidate.context,
    trigger: candidate.trigger,
    studyTarget: candidate.studyTarget,
    overlayOccupied: candidate.overlayOccupied,
    schemaVersion: candidate.schemaVersion,
    triggerValue: candidate.triggerValue,
  };
  if (destinationAllowed) props.destination = candidate.destination as SoftUpsellDestination;
  if (event === 'soft_upsell_suppressed') {
    props.suppressionReason = candidate.suppressionReason as SoftUpsellSuppressionReason;
  }
  await trackEvent(event, props);
}

// ── Очередь (отладка / резерв) ─────────────────────────────────────────────────
export const getEventQueue = async (): Promise<EventRecord[]> => {
  try {
    if (eventQueueCache !== null) return eventQueueCache.slice();
    return readEventQueueFromStorage();
  } catch {
    return [];
  }
};

export const clearEventQueue = async (): Promise<void> => {
  try {
    eventQueueCache = [];
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (e) {
      // no-op
      DebugLogger.error('analytics:clearEventQueue', e instanceof Error ? e : new Error(String(e)), 'warning');
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
        try { capturePostHog(e.event, e.props); } catch (e) {
      // ignore
      DebugLogger.error('analytics:queue', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
      }
    }

    if (__DEV__) {
      console.log(`[Analytics] flushed ${queue.length} events (posthog=${isPostHogEnabled()})`);
    }

    await clearEventQueue();
  } catch (e) {
      DebugLogger.error('analytics:queue', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
