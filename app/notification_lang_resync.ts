/**
 * [PUSH-LANG] Смена языка интерфейса → локальные напоминания и язык push-токена на новом языке, без перезапуска.
 *
 * зачем (координатор 12.10, аудит Авторизации §AUTH-0110 п.1): напоминания, предупреждение серии, фраза дня, итоги недели и
 * месяца и язык push-токена ставились ОДИН раз — в runSessionChecks на старте (app/_layout.tsx). Человек менял язык в
 * настройках — уведомления приходили на старом до перезапуска. Теперь событие app_lang_changed (после дебаунса) пересчитывает
 * язык уведомлений и, только если он реально изменился, ставит те же уведомления заново. Запись языка токена в облако —
 * внутри registerPushTokenForServerPush: она и так пропускается, если язык/токен/пояс не изменились (одна запись на смену).
 * Модуль без React и без сети: зависимости передаются снаружи, чтобы проверять тестом.
 */
import { DeviceEventEmitter } from 'react-native';

const LOG = '[PUSH-LANG]';

// зачем: то же имя, что APP_LANG_CHANGED в components/LangContext.tsx (полезная нагрузка { lang, previous }). Не импортируем
// React-контекст в модуль корня, чтобы не тянуть его граф и не ловить цикл; равенство имён сторожит тест.
export const NOTIFICATION_LANG_EVENT = 'app_lang_changed';
type LangChangedPayload = { lang?: unknown; previous?: unknown };

/** Быстрое переключение языков в настройках — одна перестановка, а не по штуке на каждый тап. */
export const NOTIFICATION_LANG_RESYNC_DEBOUNCE_MS = 1_500;

export type NotificationLangResyncDeps = Readonly<{
  /** Язык уведомлений для нового языка интерфейса (resolvePushUiLang). */
  resolveLang: (uiLang: string) => Promise<string>;
  /** Включены ли уведомления (notifications_enabled === 'true'). */
  isEnabled: () => Promise<boolean>;
  /** Поставить локальные уведомления и обновить язык токена на `lang`. */
  reschedule: (lang: string, reason: 'lang_changed') => Promise<void>;
  debounceMs?: number;
  /** Подписка на событие смены языка; по умолчанию — DeviceEventEmitter (в тестах — свой источник). */
  subscribe?: (listener: (event: LangChangedPayload | undefined) => void) => { remove: () => void };
}>;

let scheduledLang: string | null = null;

/** Старт (runSessionChecks) сообщает, на каком языке уведомления уже стоят. */
export function noteNotificationsScheduledLang(lang: string): void {
  scheduledLang = lang;
}

export function peekNotificationsScheduledLang(): string | null {
  return scheduledLang;
}

/** Обработать смену языка (после дебаунса). Возвращает, что сделано — для лога и теста. */
export async function resyncNotificationLang(
  uiLang: string,
  deps: NotificationLangResyncDeps,
): Promise<'rescheduled' | 'same_lang' | 'disabled' | 'failed'> {
  try {
    const lang = await deps.resolveLang(uiLang);
    if (lang === scheduledLang) {
      console.log(LOG, JSON.stringify({ step: 'lang_changed', uiLang, lang, action: 'skip', reason: 'same_lang' }));
      return 'same_lang';
    }
    const enabled = await deps.isEnabled();
    if (!enabled) {
      // Уведомления выключены — ставить нечего; язык запомним, чтобы включение пошло уже на новом (его ставит runSessionChecks/настройки).
      console.log(LOG, JSON.stringify({ step: 'lang_changed', uiLang, from: scheduledLang, to: lang, action: 'skip', reason: 'notifications_disabled' }));
      return 'disabled';
    }
    const from = scheduledLang;
    await deps.reschedule(lang, 'lang_changed');
    scheduledLang = lang;
    console.log(LOG, JSON.stringify({ step: 'lang_changed', uiLang, from, to: lang, action: 'rescheduled' }));
    return 'rescheduled';
  } catch (error: unknown) {
    console.warn(LOG, JSON.stringify({ step: 'lang_changed', uiLang, action: 'failed', reason: error instanceof Error ? error.message : String(error) }));
    return 'failed';
  }
}

let installed: (() => void) | null = null;

/** Подписка на app_lang_changed с дебаунсом; одна на процесс (повторный вызов возвращает ту же отписку). */
export function installNotificationLangResync(deps: NotificationLangResyncDeps): () => void {
  if (installed) return installed;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingUiLang: string | null = null;
  const subscribe = deps.subscribe
    ?? ((listener: (event: LangChangedPayload | undefined) => void) => DeviceEventEmitter.addListener(NOTIFICATION_LANG_EVENT, listener));
  const sub = subscribe((event: LangChangedPayload | undefined) => {
    const uiLang = typeof event?.lang === 'string' ? event.lang : null;
    if (!uiLang) {
      console.warn(LOG, JSON.stringify({ step: 'lang_changed', action: 'skip', reason: 'no_lang_in_event' }));
      return;
    }
    pendingUiLang = uiLang;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      const next = pendingUiLang;
      pendingUiLang = null;
      if (next) void resyncNotificationLang(next, deps);
    }, deps.debounceMs ?? NOTIFICATION_LANG_RESYNC_DEBOUNCE_MS);
  });
  installed = () => {
    if (timer) clearTimeout(timer);
    sub.remove();
    installed = null;
  };
  return installed;
}

/** Только для тестов. */
export function resetNotificationLangResyncForTests(): void {
  installed?.();
  installed = null;
  scheduledLang = null;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
