// notifications.ts
// Push-уведомления для Phraseman
// ВАЖНО: expo-notifications НЕ работает в Expo Go
// Используем lazy import с try/catch — приложение не падает без нативного модуля

import { triLang, type Lang } from '../constants/i18n';
import type { SourceLocale } from './source_locales';
import { resolveNotificationLang } from './notification_lang';

import { Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTodayPhraseForTarget } from './daily_phrase_system';
import { scheduleAfterRootNavigationReady } from './paywall_navigation';
import { getStoredStudyTarget } from './study_target';
import { lessonPassCountKey, storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';
import { getLocalDayKey, isSameLocalOrUtcDay } from './local_date';
import { createDisposableAdoption } from './disposable_adoption';
import { persistPortablePreference } from './phone_state_preference_bridge';
import { cancelRetiredLocalNotificationsOnce as runRetiredLocalNotificationsCancel } from './retired_local_notifications';
import { DebugLogger, reportSwallowed, swallowError } from './debug-logger';
import { ENGLISH_UI_LOCALE_ENABLED } from './config';
import { isDevNotifPermDenied } from './dev_social_state';
import {
  onboardingTrialReminderDelaySeconds,
  trialReminderDelaySeconds,
  type TrialReminderTiming,
} from './trial_end_reminder_schedule';
import { getDevReminderTime } from './dev_robot_display';
import { studyLanguageWord } from '../constants/study_language_words';
import { resolveAutoReminderTime } from './smart_reminder_store';

/** Android 8+: канал с high importance; `channelId` дублируется в каждом триггере. */
const ANDROID_NOTIF_CHANNEL_ID = 'phraseman_reminders';

const getDayIndex = () => Math.floor(Date.now() / 86400000);

const NUM_TRACKED_LESSONS = 32;

type NotificationTargetOpts = { requestPermission?: boolean; studyTarget?: RuntimeStudyTarget };

async function resolveNotificationStudyTarget(
  lang: Lang,
  explicit?: RuntimeStudyTarget,
): Promise<ReturnType<typeof storageStudyTarget>> {
  if (explicit !== undefined && explicit !== null) return storageStudyTarget(explicit);
  const stored = await getStoredStudyTarget(lang).catch((error: unknown) => { reportSwallowed('notifications:resolveNotificationStudyTarget', error); return 'en'; });
  return storageStudyTarget(stored);
}

/** Уроки с ненулевым pass_count для активного study target; streak остаётся общим. */
async function countCompletedLessonsFromStorage(studyTarget?: RuntimeStudyTarget): Promise<number> {
  const keys = Array.from({ length: NUM_TRACKED_LESSONS }, (_, i) => lessonPassCountKey(i + 1, studyTarget));
  const rows = await AsyncStorage.multiGet(keys);
  let n = 0;
  for (const [, v] of rows) {
    if ((parseInt(v || '0', 10) || 0) > 0) n++;
  }
  return n;
}

const WEEKLY_RECAP_HOUR = 20;
const WEEKLY_RECAP_MINUTE = 10;
const D1_REMINDER_HOUR = 20;
const D1_REMINDER_MINUTE = 20;

/** Ближайшее воскресенье 20:10 (локально) для weekly recap; 20:00 занят daily reminder. */
export function getNextWeeklyRecapTime(now: Date = new Date()): Date {
  const target = new Date(now);
  const day = now.getDay();
  if (day === 0) {
    target.setHours(WEEKLY_RECAP_HOUR, WEEKLY_RECAP_MINUTE, 0, 0);
    if (now.getTime() >= target.getTime()) {
      target.setDate(target.getDate() + 7);
    }
  } else {
    target.setDate(now.getDate() + (7 - day));
    target.setHours(WEEKLY_RECAP_HOUR, WEEKLY_RECAP_MINUTE, 0, 0);
  }
  return target;
}

/** Завтрашнее D+1 уведомление после первого урока: 20:20, вне кластера 20:00/20:10. */
export function getNextD1PersonalizedReminderTime(now: Date = new Date()): Date {
  const target = new Date(now);
  target.setDate(target.getDate() + 1);
  target.setHours(D1_REMINDER_HOUR, D1_REMINDER_MINUTE, 0, 0);
  return target;
}

/** YYYY-MM-DD ближайшего срабатывания weekly recap (как в AsyncStorage). */
export function getNextWeeklyRecapDateKey(now: Date = new Date()): string {
  return getNextWeeklyRecapTime(now).toISOString().split('T')[0];
}

// Lazy-загрузка модуля — не падает в Expo Go
let Notifications: any = null;
const getNotifications = async () => {
  if (Notifications) return Notifications;
  try {
    Notifications = await import('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    if (Platform.OS === 'android') {
      try {
        // зачем (I18N_GAPS_AUTH_R1, 13.10): имя канала видно в системных настройках Android и было только по-русски. Канал
        // пересоздаётся при каждом запуске с тем же id — Android обновляет имя, остальные настройки человека сохраняются.
        const channelLangRaw = await AsyncStorage.getItem('app_lang').catch((error: unknown) => {
          console.warn('[notifications] channel_lang:read_failed', error instanceof Error ? error.message : String(error));
          return null;
        });
        const channelLang = resolveNotificationLang(channelLangRaw, 'android_channel');
        await Notifications.setNotificationChannelAsync(ANDROID_NOTIF_CHANNEL_ID, {
          name: triLang(channelLang, { ru: 'Напоминания', uk: 'Нагадування', en: 'Reminders', es: 'Recordatorios', 'pt-BR': 'Lembretes', vi: 'Lời nhắc', id: 'Pengingat', tr: 'Hatırlatıcılar', pl: 'Przypomnienia' }),
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#06141B',
          enableVibrate: true,
        });
      } catch (e) {
        if (__DEV__) console.warn('[notifications]', e);
      }
    }
    return Notifications;
  } catch (e) {
    console.warn('[notifications] expo-notifications unavailable', e);
    return null;
  }
};

/** Expo SDK 54+ / expo-notifications 0.32+: у триггера обязателен `type`, иначе schedule падает. */
function withAndroidChannel<T extends Record<string, unknown>>(base: T): T {
  if (Platform.OS === 'android') {
    return { ...base, channelId: ANDROID_NOTIF_CHANNEL_ID };
  }
  return base;
}

function triggerDaily(hour: number, minute: number) {
  return withAndroidChannel({ type: 'daily' as const, hour, minute });
}

function triggerWeekly(weekday: number, hour: number, minute: number) {
  return withAndroidChannel({ type: 'weekly' as const, weekday, hour, minute });
}

function triggerInterval(seconds: number, repeats?: boolean) {
  const base: { type: 'timeInterval'; seconds: number; repeats?: boolean } = {
    type: 'timeInterval',
    seconds,
  };
  if (repeats) base.repeats = true;
  return withAndroidChannel(base);
}

// ── Запрос разрешений ────────────────────────────────────────────────────────
export const requestNotificationPermission = async (): Promise<boolean> => {
  const res = await requestNotificationPermissionWithFallback();
  return res.granted;
};

export const requestNotificationPermissionWithFallback = async (
  opts: { openSettingsIfBlocked?: boolean } = {},
): Promise<{ granted: boolean; blocked: boolean; openedSettings: boolean }> => {
  // зачем (координатор 12.10, settings-gap-012): dev `notifperm=denied` — «телефон не разрешает» без системного окна и без ухода
  // в системные настройки (робот не должен покидать приложение). В стор-сборке геттер false.
  if (isDevNotifPermDenied()) {
    console.warn('[DEV-STATE] notifications: разрешение подменено отказом (notifperm=denied)', JSON.stringify({ openSettingsIfBlocked: opts.openSettingsIfBlocked === true })); // guard-ok: dev-ветка
    return { granted: false, blocked: true, openedSettings: false };
  }
  try {
    const N = await getNotifications();
    if (!N) return { granted: false, blocked: false, openedSettings: false };
    if (Platform.OS === 'web') return { granted: false, blocked: false, openedSettings: false };

    const current = await N.getPermissionsAsync();
    if (current?.status === 'granted') {
      return { granted: true, blocked: false, openedSettings: false };
    }
    if (current?.status === 'denied' && current?.canAskAgain === false) {
      if (opts.openSettingsIfBlocked) {
        await Linking.openSettings().catch(swallowError('notifications:requestNotificationPermissionWithFallback'));
        return { granted: false, blocked: true, openedSettings: true };
      }
      return { granted: false, blocked: true, openedSettings: false };
    }

    const asked = await N.requestPermissionsAsync();
    if (asked?.status === 'granted') {
      return { granted: true, blocked: false, openedSettings: false };
    }
    if (asked?.status === 'denied' && asked?.canAskAgain === false) {
      if (opts.openSettingsIfBlocked) {
        await Linking.openSettings().catch(swallowError('notifications:requestNotificationPermissionWithFallback'));
        return { granted: false, blocked: true, openedSettings: true };
      }
      return { granted: false, blocked: true, openedSettings: false };
    }
    return { granted: false, blocked: false, openedSettings: false };
  } catch (error) {
    // зачем: немой catch прятал сбой запроса разрешения — «нажал, ничего» без следа.
    console.warn('[NOTIF-PERM] запрос разрешения упал', error instanceof Error ? error.message : String(error));
    return { granted: false, blocked: false, openedSettings: false };
  }
};

export const getNotificationPermissionStatus = async (): Promise<'granted' | 'denied' | 'undetermined' | 'unknown'> => {
  if (isDevNotifPermDenied()) return 'denied';
  try {
    const N = await getNotifications();
    if (!N) return 'unknown';
    if (Platform.OS === 'web') return 'denied';
    const { status } = await N.getPermissionsAsync();
    return status as 'granted' | 'denied' | 'undetermined';
  } catch (error) {
    console.warn('[NOTIF-PERM] статус разрешения не прочитан → unknown', error instanceof Error ? error.message : String(error));
    return 'unknown';
  }
};

export const isNotificationPermissionGranted = async (): Promise<boolean> => {
  const status = await getNotificationPermissionStatus();
  return status === 'granted';
};

const canUseNotifications = async (requestIfNeeded: boolean): Promise<boolean> => {
  try {
    const N = await getNotifications();
    if (!N) return false;
    if (Platform.OS === 'web') return false;
    const { status } = await N.getPermissionsAsync();
    if (status === 'granted') return true;
    if (!requestIfNeeded) return false;
    return await requestNotificationPermission();
  } catch {
    return false;
  }
};

/** Low-level bridge used only after the YouTube screen has completed its explicit opt-in flow. */
export async function scheduleYoutubePremiereLocalNotification(input: {
  type: 'youtube_premiere';
  videoId: string;
  channelId: string;
  title: string;
  triggerAtMs: number;
}): Promise<string | null> {
  try {
    const N = await getNotifications();
    if (!N || !Number.isFinite(input.triggerAtMs) || input.triggerAtMs <= Date.now()) return null;
    return await N.scheduleNotificationAsync({
      content: {
        title: 'YouTube Premiere',
        body: input.title,
        sound: false,
        data: {
          type: 'youtube_premiere' as LocalNotificationType,
          videoId: input.videoId,
          channelId: input.channelId,
        },
      },
      trigger: withAndroidChannel({ type: 'date' as const, date: new Date(input.triggerAtMs) }),
    });
  } catch {
    return null;
  }
}

/**
 * D191 m03 «Напомнить вечером»: ставит одно напоминание, ТОЛЬКО если разрешение уже дано (новый запрос не делаем — решение
 * координатора 14.10), включены общий тумблер и категория «Шпиль». Возвращает id или причину отказа — для лога [D191-REMIND].
 */
export async function scheduleSpireWeekRemindLocalNotification(input: Readonly<{
  title: string;
  body: string;
  triggerAtMs: number;
}>): Promise<Readonly<{ id: string } | { id: null; reason: 'no_module' | 'permission' | 'muted' | 'past' | 'failed' }>> {
  try {
    const N = await getNotifications();
    if (!N) return { id: null, reason: 'no_module' };
    if (!Number.isFinite(input.triggerAtMs) || input.triggerAtMs <= Date.now()) return { id: null, reason: 'past' };
    if (!(await isNotificationPermissionGranted())) return { id: null, reason: 'permission' };
    if (!(await isNotifCategoryEnabled('spire'))) return { id: null, reason: 'muted' };
    const id = await N.scheduleNotificationAsync({
      content: { title: input.title, body: input.body, sound: false, data: { type: 'spire_week_remind' as LocalNotificationType } },
      trigger: withAndroidChannel({ type: 'date' as const, date: new Date(input.triggerAtMs) }),
    });
    return { id };
  } catch (error) {
    console.warn('[D191-REMIND] постановка напоминания упала', error instanceof Error ? error.message : String(error));
    return { id: null, reason: 'failed' };
  }
}

/** D191: доступна ли кнопка «Напомнить вечером» — разрешение уже есть и категория «Шпиль» не выключена (без запроса). */
export async function canOfferSpireWeekRemind(): Promise<Readonly<{ ok: boolean; reason: 'ok' | 'permission' | 'muted' }>> {
  if (!(await isNotificationPermissionGranted())) return { ok: false, reason: 'permission' };
  if (!(await isNotifCategoryEnabled('spire'))) return { ok: false, reason: 'muted' };
  return { ok: true, reason: 'ok' };
}

/** D191: снять одно локальное напоминание по id (повторный тап «Напомнить вечером» заменяет прежнее). */
export async function cancelScheduledLocalNotificationById(notificationId: string): Promise<void> {
  try {
    const N = await getNotifications();
    if (N && notificationId.trim()) await N.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    // Протухший id уже не стоит в расписании — это не ошибка для человека, но след оставляем.
    console.warn('[D191-REMIND] снятие прежнего напоминания не удалось', error instanceof Error ? error.message : String(error));
  }
}

export async function cancelYoutubePremiereLocalNotification(notificationId: string): Promise<void> {
  try {
    const N = await getNotifications();
    if (N && notificationId.trim()) await N.cancelScheduledNotificationAsync(notificationId);
  } catch (e) {
      // A stale native id is already effectively cancelled.
      DebugLogger.error('notifications:N', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

// ── Мотивационные сообщения ──────────────────────────────────────────────────
const MESSAGES_RU = [
  { title: '🔥 Серия ждёт тебя!',          body: '5 минут в день — и серия растёт' },
  { title: '📚 Время для практики',        body: 'Один раунд сегодня — уверенность на всю жизнь' },
  { title: '🎯 Ежедневная цель',           body: 'Осталось совсем немного до завершения вызовов!' },
  { title: '💪 Так держать!',              body: 'Ты уже столько прошёл. Продолжи сегодня' },
  { title: '🧠 Повтори вчерашнее',         body: 'Лучшее время для повторения — сейчас' },
];

const MESSAGES_UK = [
  { title: '🔥 Серія чекає тебе!',         body: '5 хвилин на день — і серія росте' },
  { title: '📚 Час для практики',          body: 'Один раунд сьогодні — впевненість на все життя' },
  { title: '🎯 Щоденна ціль',              body: 'Залишилось зовсім небагато до завершення викликів!' },
  { title: '💪 Так тримати!',              body: 'Ти вже стільки пройшов. Продовжуй сьогодні' },
  { title: '🧠 Повтори вчорашнє',          body: 'Найкращий час для повторення — зараз' },
];

const MESSAGES_FR_TARGET_RU = [
  { title: '🔥 Цепочка ждёт тебя!',        body: 'Не прерывай серию — 5 минут в день изменят всё' },
  { title: '📚 Время для занятия',         body: 'Один урок сегодня — уверенность на всю жизнь' },
  { title: '🎯 Ежедневная цель',           body: 'Осталось совсем немного до завершения заданий!' },
  { title: '💪 Не останавливайся!',        body: 'Ты уже столько прошёл. Продолжи сегодня' },
  { title: '🧠 Повтори вчерашнее',         body: 'Лучшее время для повторения — сейчас' },
];

const MESSAGES_FR_TARGET_UK = [
  { title: '🔥 Стрік чекає тебе!',         body: 'Не переривай серію — 5 хвилин на день змінять все' },
  { title: '📚 Час для заняття',            body: 'Один урок сьогодні — впевненість на все життя' },
  { title: '🎯 Щоденна ціль',              body: 'Залишилось зовсім небагато до завершення завдань!' },
  { title: '💪 Не зупиняйся!',             body: 'Ти вже стільки пройшов. Продовжуй сьогодні' },
  { title: '🧠 Повтори вчорашнє',          body: 'Найкращий час для повторення — зараз' },
];

// зачем (координатор 12.10, подготовка к английскому интерфейсу): английские пуши. Используются только при включённом
// ENGLISH_UI_LOCALE_ENABLED (см. normalizeNotificationLang); планировщик (когда и сколько шлём) не менялся.
const MESSAGES_EN = [
  { title: '🔥 Your streak is waiting!',   body: '5 minutes a day — and the streak grows' },
  { title: '📚 Time to practice',          body: 'One round today — confidence for life' },
  { title: '🎯 Daily goal',                body: 'Just a little left to finish today’s challenges!' },
  { title: '💪 Keep it up!',               body: 'You’ve come so far. Continue today' },
  { title: '🧠 Review yesterday',          body: 'The best time to review is now' },
];

const MESSAGES_FR_TARGET_EN = [
  { title: '🔥 Your streak is waiting!',   body: 'Don’t break the streak — 5 minutes a day change everything' },
  { title: '📚 Time to practice',          body: 'One lesson today — confidence for life' },
  { title: '🎯 Daily goal',                body: 'Just a little left to finish today’s tasks!' },
  { title: '💪 Don’t stop!',               body: 'You’ve come so far. Continue today' },
  { title: '🧠 Review yesterday',          body: 'The best time to review is now' },
];

/** Испанский UX для напоминаний (нейтрал., без кальки). */
const MESSAGES_ES = [
  { title: '🔥 ¡Tu racha cuenta!', body: 'No la cortes: dedica solo 5 minutos al día y verás la diferencia' },
  { title: '📚 Tu momento de práctica', body: 'Una lección hoy puede darte seguridad mañana' },
  { title: '🎯 Objetivo del día', body: '¡Te falta muy poco para cerrar tus metas!' },
  { title: '💪 Sigue sumando', body: 'Ya recorriste mucho camino; continúa hoy' },
  { title: '🧠 Repasa lo de ayer', body: 'Este es un buen momento para refrescar lo aprendido' },
];
const MESSAGES_PT_BR = [
  { title: '🔥 Sua sequência espera por você!', body: 'Não quebre o ritmo: 5 minutos por dia já fazem diferença' },
  { title: '📚 Hora de praticar', body: 'Uma lição hoje traz mais confiança amanhã' },
  { title: '🎯 Meta do dia', body: 'Falta pouco para fechar suas tarefas!' },
  { title: '💪 Continue firme', body: 'Você já avançou bastante. Treine hoje' },
  { title: '🧠 Revise o que viu ontem', body: 'Agora é um ótimo momento para reforçar' },
];
const MESSAGES_VI = [
  { title: '🔥 Chuỗi học đang chờ bạn!', body: 'Đừng ngắt chuỗi: 5 phút mỗi ngày tạo khác biệt' },
  { title: '📚 Đến giờ luyện tập', body: 'Một bài hôm nay, tự tin hơn ngày mai' },
  { title: '🎯 Mục tiêu hôm nay', body: 'Bạn sắp hoàn thành các nhiệm vụ rồi!' },
  { title: '💪 Đừng dừng lại', body: 'Bạn đã đi được một đoạn dài. Học tiếp hôm nay nhé' },
  { title: '🧠 Ôn lại hôm qua', body: 'Bây giờ là lúc tốt để củng cố' },
];
const MESSAGES_ID = [
  { title: '🔥 Streak menunggumu!', body: 'Jangan putuskan ritme: 5 menit sehari sudah berarti' },
  { title: '📚 Waktunya latihan', body: 'Satu pelajaran hari ini, lebih percaya diri besok' },
  { title: '🎯 Target harian', body: 'Sedikit lagi tugasmu selesai!' },
  { title: '💪 Lanjutkan', body: 'Kamu sudah banyak maju. Latihan hari ini' },
  { title: '🧠 Ulangi materi kemarin', body: 'Ini waktu yang pas untuk menguatkan ingatan' },
];
const MESSAGES_TR = [
  { title: '🔥 Serin seni bekliyor!', body: 'Ritmi bozma: günde 5 dakika fark yaratır' },
  { title: '📚 Pratik zamanı', body: 'Bugün bir ders, yarın daha fazla güven' },
  { title: '⭐ Lig sıralamasında geçildin', body: 'Biri puan kazandı. Cevap vermeye hazır mısın?' },
  { title: '🎯 Günlük hedef', body: 'Görevleri tamamlamana çok az kaldı!' },
  { title: '💪 Devam et', body: 'Şimdiden çok ilerledin. Bugün de çalış' },
  { title: '🧠 Dünküleri tekrar et', body: 'Pekiştirmek için iyi bir zaman' },
];
const MESSAGES_PL = [
  { title: '🔥 Twoja seria czeka!', body: 'Nie przerywaj rytmu: 5 minut dziennie robi różnicę' },
  { title: '📚 Czas na praktykę', body: 'Jedna lekcja dziś to więcej pewności jutro' },
  { title: '⭐ Ktoś cię wyprzedził', body: 'Ktoś zdobył punkty w lidze. Odpowiesz?' },
  { title: '🎯 Cel dnia', body: 'Niewiele brakuje do zamknięcia zadań!' },
  { title: '💪 Nie zatrzymuj się', body: 'Masz już spory postęp. Poćwicz dziś' },
  { title: '🧠 Powtórz wczorajsze', body: 'To dobry moment na utrwalenie' },
];

// зачем: пуши — контент, не UI-хром, английского source для них нет (см.
// app/source_locales.ts). NotificationCopy держится на SourceLocale (8 языков),
// а не на Lang (9, с UI-only en) — normalizeNotificationLang уже сводил en
// в RU-фолбэк до расширения Lang, теперь это явно закреплено в типе, а не
// только в рантайм-проверке NOTIFICATION_LANGS.includes.
type NotificationCopy<R> = Record<SourceLocale, R> & { en?: R }; // en — только при включённом английском интерфейсе
const notificationCopy = <R,>(copy: NotificationCopy<R>): NotificationCopy<R> => copy;
const NOTIFICATION_LANGS: readonly SourceLocale[] = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
// экспорт — для тестов языка пушей (tests/notifications_english_copy.test.ts)
export const normalizeNotificationLang = (value: Lang | string | null | undefined): SourceLocale | 'en' => {
  // зачем (координатор 12.10): английские пуши — только при включённом английском интерфейсе; пока флаг выключен en → ru, как раньше.
  if (value === 'en' && ENGLISH_UI_LOCALE_ENABLED) return 'en';
  const key = String(value) as SourceLocale;
  return NOTIFICATION_LANGS.includes(key) ? key : 'ru';
};

export function reminderMessages(forLang: Lang | string, studyTarget?: RuntimeStudyTarget) {
  const key = normalizeNotificationLang(forLang);
  const target = storageStudyTarget(studyTarget);
  const base = notificationCopy({
    ru: MESSAGES_RU,
    uk: MESSAGES_UK,
    es: MESSAGES_ES, en: MESSAGES_EN,
    'pt-BR': MESSAGES_PT_BR,
    vi: MESSAGES_VI,
    id: MESSAGES_ID,
    tr: MESSAGES_TR,
    pl: MESSAGES_PL,
  });
  if (target === 'fr') {
    const frTargetCopy = notificationCopy({
      ...base,
      ru: MESSAGES_FR_TARGET_RU,
      uk: MESSAGES_FR_TARGET_UK,
      en: MESSAGES_FR_TARGET_EN,
    });
    return frTargetCopy[key] ?? frTargetCopy.ru;
  }
  return base[key] ?? base.ru;
}

export function pickNotif<R>(lang: Lang | string, copy: NotificationCopy<R>): R {
  const key = normalizeNotificationLang(lang);
  return copy[key] ?? copy.ru;
}

const DAILY_REMINDER_ID_KEY = 'daily_reminder_notif_id';
const D1_PERSONALIZED_REMINDER_NOTIF_ID_KEY = 'd1_personalized_reminder_notif_id';
const STREAK_WARNING_NOTIF_ID_KEY = 'streak_warning_notif_id';
const PHRASE_OF_DAY_NOTIF_ID_KEY = 'phrase_of_day_notif_id';
const WEEKLY_RECAP_NOTIF_ID_KEY = 'weekly_recap_notif_id';
const MONTHLY_RECAP_NOTIF_ID_KEY = 'monthly_recap_notif_id';
const ENERGY_FULL_NOTIF_ID_KEY = 'energy_full_notif_id';
const IMMEDIATE_NOTIFICATION_LAST_AT_KEY = 'notification_immediate_last_at';
const IMMEDIATE_NOTIFICATION_TYPE_LAST_AT_PREFIX = 'notification_immediate_type_last_at:';

type LocalNotificationType =
  | 'reminder'
  | 'streak_warning'
  | 'energy_full'
  | 'phrase_of_day'
  | 'weekly_recap'
  | 'monthly_recap'
  | 'd1_reminder'
  | 'premium'
  | 'intro_expiring'
  | 'upsell_d4'
  | 'upsell_d7'
  | 'upsell_d14'
  | 'paywall_abandoned'
  | 'gift_expiring'
  | 'youtube_premiere'
  // D191 m03 «Напомнить вечером» (координатор 14.10): одно напоминание сегодня в 19:00, категория «Шпиль».
  | 'spire_week_remind';

const IMMEDIATE_NOTIFICATION_MIN_GAP_MS = 45 * 60 * 1000;
const IMMEDIATE_NOTIFICATION_TYPE_COOLDOWN_MS: Partial<Record<LocalNotificationType, number>> = {
  streak_warning: 23 * 60 * 60 * 1000,
  paywall_abandoned: 23 * 60 * 60 * 1000,
};

function parseStoredNumber(raw: string | null | undefined): number {
  const n = parseInt(raw || '0', 10);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export async function readWeeklyRecapStatsForNotification(
): Promise<{ streak: number }> {
  const [streakRaw] = await Promise.all([
    AsyncStorage.getItem('streak_count'),
  ]);
  return { streak: parseStoredNumber(streakRaw) };
}

async function cancelScheduledNotificationsByType(
  N: Awaited<ReturnType<typeof getNotifications>>,
  types: LocalNotificationType[],
): Promise<void> {
  if (!N?.getAllScheduledNotificationsAsync) return;
  try {
    const scheduled = await N.getAllScheduledNotificationsAsync();
    await Promise.all((scheduled || []).map((request: any) => {
      const type = request?.content?.data?.type;
      const id = request?.identifier;
      if (!id || !types.includes(type)) return Promise.resolve();
      return N.cancelScheduledNotificationAsync(id).catch(swallowError('notifications:cancelScheduledNotificationsByType'));
    }));
  } catch (e) {
    if (__DEV__) console.warn('[notifications]', e);
  }
}

async function claimImmediateNotificationSlot(
  type: LocalNotificationType,
  nowMs: number = Date.now(),
): Promise<boolean> {
  try {
    const typeKey = `${IMMEDIATE_NOTIFICATION_TYPE_LAST_AT_PREFIX}${type}`;
    const [[, lastAnyRaw], [, lastTypeRaw]] = await AsyncStorage.multiGet([
      IMMEDIATE_NOTIFICATION_LAST_AT_KEY,
      typeKey,
    ]);
    const lastAny = parseStoredNumber(lastAnyRaw);
    const lastType = parseStoredNumber(lastTypeRaw);
    const typeCooldown = IMMEDIATE_NOTIFICATION_TYPE_COOLDOWN_MS[type] ?? IMMEDIATE_NOTIFICATION_MIN_GAP_MS;

    if (lastAny > 0 && nowMs - lastAny < IMMEDIATE_NOTIFICATION_MIN_GAP_MS) return false;
    if (lastType > 0 && nowMs - lastType < typeCooldown) return false;

    await AsyncStorage.multiSet([
      [IMMEDIATE_NOTIFICATION_LAST_AT_KEY, String(nowMs)],
      [typeKey, String(nowMs)],
    ]);
    return true;
  } catch {
    return true;
  }
}

// ── Запланировать ежедневное уведомление ─────────────────────────────────────
const DAILY_REMINDER_RETIRED: boolean = true;
export const scheduleDailyReminder = async (
  hour: number = 19,
  minute: number = 0,
  lang: Lang = 'ru',
  opts: NotificationTargetOpts = {}
): Promise<void> => {
  // Retired notification export remains inert for old callers until their UI and
  // notification metadata are physically removed.
  // зачем: флаг вместо голого `return` — иначе TS считает остаток недостижимым, теряет
  // сужение типов (prevPerDayRaw) и ломает проверку типов; поведение то же (функция инертна).
  if (DAILY_REMINDER_RETIRED) {
    // зачем (SMART_REMINDER Этап 1, правило владельца «сперва логи»): окно «включить напоминания» (_layout), шаг уведомлений
    // онбординга (CleanOnboarding, 20:00) и Настройки зовут эту функцию, а она инертна — человек думает, что включил напоминание.
    // Журнал показывает, кто звал (час/минута/запрос разрешения) и что по расписанию дней недели реально включено.
    try {
      const snap = getNotifSettingsSnapshot();
      const enabledDays = Object.values(snap.schedule).filter((d) => d.enabled).length;
      const prefs = getNotifPrefsSnapshot();
      console.warn(
        `[SMART-REMINDER] scheduleDailyReminder:retired requested=${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
        + ` requestPermission=${String(opts.requestPermission ?? true)} master=${String(prefs.master)} perDayEnabled=${enabledDays}/7`
        + ` → НИЧЕГО НЕ ЗАПЛАНИРОВАНО${enabledDays === 0 ? ' (расписание по дням выключено — напоминаний нет совсем)' : ' (живёт расписание по дням)'}`,
      );
    } catch (e) {
      console.warn('[SMART-REMINDER] scheduleDailyReminder:retired snapshot_failed', e instanceof Error ? e.message : String(e));
    }
    return;
  }

  try {
    const N = await getNotifications();
    if (!N) return;

    const hasPermission = await canUseNotifications(opts.requestPermission ?? true);
    if (!hasPermission) return;
    if (!(await isNotifMasterEnabled())) return;

    // Clean up both daily and old per-day reminders before creating the active reminder mode.
    await cancelScheduledNotificationsByType(N, ['reminder']);
    const prevId = await AsyncStorage.getItem(DAILY_REMINDER_ID_KEY);
    if (prevId) {
      await N.cancelScheduledNotificationAsync(prevId).catch(swallowError('notifications:scheduleDailyReminder'));
    }
    const prevPerDayRaw = await AsyncStorage.getItem('per_day_notif_ids');
    if (prevPerDayRaw) {
      try {
        const ids: string[] = JSON.parse(prevPerDayRaw);
        await Promise.all(ids.map(id => N.cancelScheduledNotificationAsync(id).catch(swallowError('notifications:scheduleDailyReminder'))));
      } catch (e) {
        if (__DEV__) console.warn('[notifications]', e);
      }
      await AsyncStorage.removeItem('per_day_notif_ids');
    }

    const studyTarget = await resolveNotificationStudyTarget(lang, opts.studyTarget);
    const messages = reminderMessages(lang, studyTarget);
    const msg = messages[Math.floor(Math.random() * messages.length)];

    const id = await N.scheduleNotificationAsync({
      content: {
        title: msg.title,
        body: msg.body,
        sound: false,
        data: { type: 'reminder', studyTarget },
      },
      trigger: triggerDaily(hour, minute),
    });

    await AsyncStorage.setItem(DAILY_REMINDER_ID_KEY, id);
    await persistPortablePreference('notification_hour', String(hour));
    await persistPortablePreference('notification_minute', String(minute));
    await persistPortablePreference('notifications_enabled', 'true');
  } catch (e) {
    if (__DEV__) console.warn('[notifications]', e);
  }
};

const INTRO_EXPIRING_NOTIF_ID_KEY = 'notification_intro_expiring_id';
/** Один пуш «подарок сгорит через 6 часов» на ближайший сгорающий подарок. */
const GIFT_EXPIRING_NOTIF_ID_KEY = 'gift_expiring_notif_id_v1';

/** Ключи метаданных планирования (не самих payload). Сохранённые в sync с cancelAllScheduledNotificationsAsync. */
const NOTIFICATION_SCHEDULE_STORAGE_KEYS = [
  DAILY_REMINDER_ID_KEY,
  D1_PERSONALIZED_REMINDER_NOTIF_ID_KEY,
  'per_day_notif_ids',
  STREAK_WARNING_NOTIF_ID_KEY,
  PHRASE_OF_DAY_NOTIF_ID_KEY,
  WEEKLY_RECAP_NOTIF_ID_KEY,
  MONTHLY_RECAP_NOTIF_ID_KEY,
  IMMEDIATE_NOTIFICATION_LAST_AT_KEY,
  `${IMMEDIATE_NOTIFICATION_TYPE_LAST_AT_PREFIX}streak_warning`,
  'streak_warning_scheduled',
  'phrase_notif_scheduled',
  'weekly_recap_scheduled',
  'monthly_recap_scheduled',
  // Upsell и intro_expiring — чистим вместе со всеми, иначе повторный вызов
  // scheduleUpsellNotifications думает, что уведомления уже запланированы.
  INTRO_EXPIRING_NOTIF_ID_KEY,
  'notification_upsell_d4_scheduled_at',
  'notification_upsell_d7_scheduled_at',
  'notification_upsell_d14_scheduled_at',
  GIFT_EXPIRING_NOTIF_ID_KEY,
] as const;

async function cancelAllScheduledLocalNotifications(N: Awaited<ReturnType<typeof getNotifications>>): Promise<void> {
  try {
    if (N) await N.cancelAllScheduledNotificationsAsync().catch(swallowError('notifications:cancelAllScheduledLocalNotifications'));
  } catch (e) {
    if (__DEV__) console.warn('[notifications]', e);
  }
  try {
    await AsyncStorage.multiRemove([...NOTIFICATION_SCHEDULE_STORAGE_KEYS]);
  } catch (e) {
    if (__DEV__) console.warn('[notifications]', e);
  }
  await persistPortablePreference('notifications_enabled', 'false');
}

// ── Отменить все уведомления ─────────────────────────────────────────────────
export const cancelAllNotifications = async (): Promise<void> => {
  const N = await getNotifications();
  await cancelAllScheduledLocalNotifications(N);
  // Удаляем токен из Firestore: сервер перестаёт слать re-engage пуши
  // на пользователя, который явно отключил уведомления.
  void import('./push_token_registration').then(({ clearPushTokenForServerPush }) => {
    clearPushTokenForServerPush().catch(swallowError('notifications:cancelAllNotifications'));
  });
};

// ── Уведомление о потере цепочки ───────────────────────────────────────────────
export const sendStreakWarning = async (streak: number, lang: Lang = 'ru'): Promise<void> => {
  try {
    const N = await getNotifications();
    if (!N) return;

    // НЕ запрашиваем разрешение здесь: streak warning не должен поднимать
    // системный диалог push в произвольный момент (потеря цепочки).
    // Запрос разрешения идёт только через NotificationPermissionModal по условиям из _layout.tsx.
    const notifEnabled = await AsyncStorage.getItem('notifications_enabled');
    if (notifEnabled !== 'true') return;
    if (!(await isNotifCategoryEnabled('streak'))) return;
    const hasPermission = await canUseNotifications(false);
    if (!hasPermission) return;
    const canShowNow = await claimImmediateNotificationSlot('streak_warning');
    if (!canShowNow) return;

    const _p = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
    const ruTitle = [`🔥 Защити серию ${streak} дней`, `⭐ Серия ${streak} дней ждёт тебя сегодня`, `💪 Продолжи серию ${streak} дней — один раунд`, `🔥 Серия ${streak} дней — сохрани её сегодня`];
    const ukTitle = [`🔥 Захисти серію ${streak} днів`, `⭐ Серія ${streak} днів чекає на тебе сьогодні`, `💪 Продовж серію ${streak} днів — один раунд`, `🔥 Серія ${streak} днів — збережи її сьогодні`];
    const esTitle = [
      `🔥 Protege tu racha de ${streak} días`,
      `⭐ Tu racha de ${streak} días te espera hoy`,
      `💪 Continúa tu racha de ${streak} días — una ronda`,
      `🔥 Racha de ${streak} días — consérvala hoy`,
    ];
    const enTitle = [`🔥 Protect your ${streak}-day streak`, `⭐ Your ${streak}-day streak is waiting today`, `💪 Continue your ${streak}-day streak — one round`, `🔥 ${streak}-day streak — keep it today`];
    const _title = pickNotif(lang, notificationCopy({
      ru: _p(ruTitle),
      uk: _p(ukTitle),
      es: _p(esTitle), en: _p(enTitle),
      'pt-BR': _p([
        `🔥 Proteja sua sequência de ${streak} dias`,
        `⭐ Sua sequência de ${streak} dias espera por você hoje`,
        `💪 Continue sua sequência de ${streak} dias — uma rodada`,
        `🔥 Sequência de ${streak} dias — mantenha-a hoje`,
      ]),
      vi: _p([
        `🔥 Bảo vệ chuỗi ${streak} ngày của bạn`,
        `⭐ Chuỗi ${streak} ngày đang chờ bạn hôm nay`,
        `💪 Tiếp tục chuỗi ${streak} ngày — một vòng thôi`,
        `🔥 Chuỗi ${streak} ngày — giữ vững hôm nay`,
      ]),
      id: _p([
        `🔥 Lindungi streak ${streak} harimu`,
        `⭐ Streak ${streak} hari menunggumu hari ini`,
        `💪 Lanjutkan streak ${streak} hari — satu ronde`,
        `🔥 Streak ${streak} hari — jaga hari ini`,
      ]),
      tr: _p([
        `🔥 ${streak} günlük serini koru`,
        `⭐ ${streak} günlük serin bugün seni bekliyor`,
        `💪 ${streak} günlük serini sürdür — bir tur`,
        `🔥 ${streak} günlük seri — bugün koru`,
      ]),
      pl: _p([
        `🔥 Chroń swoją serię ${streak} dni`,
        `⭐ Seria ${streak} dni czeka na ciebie dziś`,
        `💪 Kontynuuj serię ${streak} dni — jedna runda`,
        `🔥 Seria ${streak} dni — zachowaj ją dziś`,
      ]),
    }));
    const ruBody = ['Ещё есть время продолжить — один раунд, и день твой.', 'Один раунд — и серия с тобой. Ты справишься!', 'Заходи на 5 минут — и серия живёт.', '5 минут сегодня — и серия растёт дальше!'];
    const ukBody = ['Ще є час продовжити — один раунд, і день твій.', 'Один раунд — і серія з тобою. Ти впораєшся!', 'Зайди на 5 хвилин — і серія живе.', '5 хвилин сьогодні — і серія росте далі!'];
    const esBody = [
      'En unas horas se cortará la racha; entra cuando puedas.',
      'Con una sola lección la salvas. Vamos.',
      'No la dejes apagarse: una sesión marca la diferencia.',
      'Cinco minutos y la racha sigue intacta.',
    ];
    const enBody = ['There’s still time to continue — one round, and the day is yours.', 'One round — and the streak stays with you. You can do it!', 'Drop in for 5 minutes — and the streak lives.', '5 minutes today — and the streak keeps growing!'];
    const _body = pickNotif(lang, notificationCopy({
      ru: _p(ruBody),
      uk: _p(ukBody),
      es: _p(esBody), en: _p(enBody),
      'pt-BR': _p([
        'Faltam poucas horas para a sequência acabar. Entre agora!',
        'Uma lição e a sequência continua. Você consegue!',
        'Não deixe a chama apagar! Uma lição resolve tudo.',
        'Cinco minutos e sua sequência segue viva.',
      ]),
      vi: _p([
        'Chỉ còn vài giờ nữa là chuỗi bị ngắt. Vào học ngay!',
        'Một bài học là giữ được chuỗi. Bạn làm được!',
        'Đừng để ngọn lửa tắt! Một bài học là đủ.',
        'Năm phút thôi, chuỗi vẫn còn.',
      ]),
      id: _p([
        'Tinggal beberapa jam sebelum streak putus. Buka sekarang!',
        'Satu pelajaran dan streak aman. Kamu bisa!',
        'Jangan biarkan semangat padam! Satu pelajaran cukup.',
        'Lima menit dan streak tetap hidup.',
      ]),
      tr: _p([
        'Serinin bitmesine birkaç saat kaldı. Şimdi gir!',
        'Bir dersle seri korunur. Yapabilirsin!',
        'Ateşi söndürme! Bir ders her şeyi çözer.',
        'Beş dakika ve seri yaşamaya devam eder.',
      ]),
      pl: _p([
        'Zostało kilka godzin, zanim seria się przerwie. Wejdź teraz!',
        'Jedna lekcja i seria ocalona. Dasz radę!',
        'Nie pozwól, żeby ogień zgasł! Jedna lekcja wystarczy.',
        'Pięć minut i seria trwa dalej.',
      ]),
    }));
    await N.scheduleNotificationAsync({
      content: { title: _title, body: _body, sound: false, data: { type: 'streak_warning' } },
      trigger: triggerInterval(2),
    });
  } catch (e) {
    if (__DEV__) console.warn('[notifications]', e);
  }
};

// ── D+1 персональное уведомление после первого урока ─────────────────────────
// Вызывается в lesson_complete после lessonId === 1
// Планирует уведомление на следующий день в 20:20 с точным числом фраз и дней цепочки подряд
export const scheduleD1PersonalizedReminder = async (
  phrasesLearned: number,
  streak: number,
  lang: Lang = 'ru',
): Promise<void> => {
  try {
    const N = await getNotifications();
    if (!N) return;
    // НЕ дёргаем системный диалог сразу после первого урока.
    // Запрос разрешения идёт только через NotificationPermissionModal (см. _layout.tsx).
    const hasPermission = await canUseNotifications(false);
    if (!hasPermission) return;
    if (!(await isNotifMasterEnabled())) return;

    const title = pickNotif(lang, notificationCopy({
      ru: `Вчера ты выучил ${phrasesLearned} фраз.`,
      uk: `Вчора ти вивчив ${phrasesLearned} висловів.`,
      es: `Ayer consolidaste ${phrasesLearned} frases nuevas.`, en: `Yesterday you learned ${phrasesLearned} ${phrasesLearned === 1 ? 'phrase' : 'phrases'}.`,
      'pt-BR': `Ontem você aprendeu ${phrasesLearned} frases.`,
      vi: `Hôm qua bạn đã học ${phrasesLearned} cụm từ.`,
      id: `Kemarin kamu mempelajari ${phrasesLearned} frasa.`,
      tr: `Dün ${phrasesLearned} ifade öğrendin.`,
      pl: `Wczoraj poznano ${phrasesLearned} zwrotów.`,
    }));
    const body =
      streak > 0
        ? pickNotif(lang, notificationCopy({
            ru: `Цепочка ${streak} ${streak === 1 ? 'день' : streak < 5 ? 'дня' : 'дней'}. Сегодня +${phrasesLearned} — и ты уже не остановишься!`,
            uk: `Стрік ${streak} ${streak === 1 ? 'день' : 'дні'}. Сьогодні +${phrasesLearned} — і ти вже не зупинишся!`,
            es: `Racha de ${streak} ${streak === 1 ? 'día' : 'días'}. Si hoy sumas ${phrasesLearned} más, no habrá quien te pare.`, en: `Streak: ${streak} ${streak === 1 ? 'day' : 'days'}. Add ${phrasesLearned} today and there’s no stopping you!`,
            'pt-BR': `Sequência de ${streak} ${streak === 1 ? 'dia' : 'dias'}. Some mais ${phrasesLearned} hoje e você embala de vez!`,
            vi: `Chuỗi ${streak} ngày. Hôm nay thêm ${phrasesLearned} cụm từ nữa là bạn vào nhịp rồi!`,
            id: `Streak ${streak} hari. Tambah ${phrasesLearned} lagi hari ini, ritmenya makin kuat!`,
            tr: `${streak} günlük seri. Bugün ${phrasesLearned} ifade daha ekle, ritim otursun!`,
            pl: `Seria ${streak} ${streak === 1 ? 'dnia' : 'dni'}. Dodaj dziś ${phrasesLearned} zwrotów i utrzymaj tempo!`,
          }))
        : pickNotif(lang, notificationCopy({
            ru: `Ещё ${phrasesLearned} сегодня — и цепочка начнётся! Не останавливайся.`,
            uk: `Ще ${phrasesLearned} сьогодні — і стрік почнеться! Не зупиняйся.`,
            es: `${phrasesLearned} frases más hoy y arrancas una racha nueva. ¡Sigue!`, en: `${phrasesLearned} more today and your streak starts! Keep going.`,
            'pt-BR': `Mais ${phrasesLearned} hoje e a sequência começa. Continue.`,
            vi: `Thêm ${phrasesLearned} cụm từ hôm nay là bạn bắt đầu chuỗi mới. Tiếp tục nhé.`,
            id: `Tambah ${phrasesLearned} frasa hari ini dan streak baru dimulai. Lanjut.`,
            tr: `Bugün ${phrasesLearned} ifade daha, yeni seri başlasın. Devam.`,
            pl: `Jeszcze ${phrasesLearned} zwrotów dziś i seria rusza. Nie zatrzymuj się.`,
          }));

    // Завтра в 20:20, чтобы не пересекаться с daily reminder и weekly recap
    const tomorrow = getNextD1PersonalizedReminderTime();
    const secondsUntil = Math.floor((tomorrow.getTime() - Date.now()) / 1000);
    if (secondsUntil <= 0) return;

    await cancelScheduledNotificationsByType(N, ['d1_reminder']);
    const prevD1Id = await AsyncStorage.getItem(D1_PERSONALIZED_REMINDER_NOTIF_ID_KEY);
    if (prevD1Id) await N.cancelScheduledNotificationAsync(prevD1Id).catch(swallowError('notifications:scheduleD1PersonalizedReminder'));

    const d1Id = await N.scheduleNotificationAsync({
      content: { title, body, sound: false, data: { type: 'd1_reminder' } },
      trigger: triggerInterval(secondsUntil),
    });
    await AsyncStorage.setItem(D1_PERSONALIZED_REMINDER_NOTIF_ID_KEY, d1Id);
  } catch (e) {
    if (__DEV__) console.warn('[notifications]', e);
  }
};

// ── Уведомление об активации Premium ─────────────────────────────────────────
export const sendPremiumNotification = async (lang: Lang = 'ru'): Promise<void> => {
  // Пользователь купил Premium — upsell и expiring-уведомления больше не нужны
  cancelIntroExpiringNotification().catch(swallowError('notifications:sendPremiumNotification'));
  cancelUpsellNotifications().catch(swallowError('notifications:sendPremiumNotification'));

  try {
    const N = await getNotifications();
    if (!N) return;
    // НЕ дёргаем системный диалог при активации Premium.
    // Запрос разрешения идёт только через NotificationPermissionModal (см. _layout.tsx).
    const hasPermission = await canUseNotifications(false);
    if (!hasPermission) return;
    const _pp = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
    const _premTitle = pickNotif(lang, notificationCopy({
      ru: _pp(['🎉 Поздравляем с Плюс!', '🏆 Плюс активирован!', '✨ Ты теперь Плюс!', '🚀 Плюс — твой новый уровень!']),
      uk: _pp(['🎉 Вітаємо з Плюс!', '🏆 Плюс активовано!', '✨ Ти тепер Плюс!', '🚀 Плюс — твій новий рівень!']),
      es: _pp(['🎉 ¡Bienvenido a Plus!', '🏆 Plus activado', '✨ Ya eres usuario Plus', '🚀 Plus impulsa tu ritmo']), en: _pp(['🎉 Welcome to Plus!', '🏆 Plus is on!', '✨ You’re Plus now!', '🚀 Plus is your new level!']),
      'pt-BR': _pp(['🎉 Bem-vindo ao Plus!', '🏆 Plus ativado!', '✨ Agora você é Plus!', '🚀 Plus é seu novo nível!']),
      vi: _pp(['🎉 Chào mừng bạn đến Plus!', '🏆 Plus đã kích hoạt!', '✨ Bạn đã là Plus!', '🚀 Plus mở cấp độ mới!']),
      id: _pp(['🎉 Selamat datang di Plus!', '🏆 Plus aktif!', '✨ Sekarang kamu Plus!', '🚀 Plus jadi level barumu!']),
      tr: _pp(['🎉 Plus’a hoş geldin!', '🏆 Plus etkin!', '✨ Artık Plus’sun!', '🚀 Plus yeni seviyen!']),
      pl: _pp(['🎉 Witaj w Plus!', '🏆 Plus aktywowane!', '✨ Masz już Plus!', '🚀 Plus to twój nowy poziom!']),
    }));
    const _premBody = pickNotif(lang, notificationCopy({
      ru: _pp([
        'Plus активен: первые уроки A1, A2, B1 и B2 доступны сразу!',
        'Продолжай курс по порядку без ограничений Free.',
        'Plus открыл продолжение курса, диалоги и расширенную практику.',
        'Уроки A1, A2, B1 и B2 уже доступны — выбирай раздел!',
      ]),
      uk: _pp([
        'Plus активний: перші уроки A1, A2, B1 і B2 доступні одразу!',
        'Продовжуй курс по черзі без обмежень Free.',
        'Plus відкрив продовження курсу, діалоги й розширену практику.',
        'Уроки A1, A2, B1 і B2 вже доступні — обирай розділ!',
      ]),
      es: _pp([
        'Plus está activo: la primera lección de A1, A2, B1 y B2 ya está disponible.',
        'Continúa el curso en orden sin los límites de Free.',
        'Plus abre la continuación del curso, los diálogos y más práctica.',
        'A1, A2, B1 y B2 ya tienen su primera lección lista. ¡Elige un nivel!',
      ]), en: _pp(['Plus is active: the first lessons of A1, A2, B1 and B2 are open right away!', 'Continue the course in order without the Free limits.', 'Plus opened the rest of the course, dialogues and extended practice.', 'The A1, A2, B1 and B2 lessons are already available — pick a section!']),
      'pt-BR': _pp([
        'Plus ativo: a primeira lição de A1, A2, B1 e B2 já está disponível.',
        'Continue o curso em ordem sem os limites do Free.',
        'O Plus abre a continuação do curso, os diálogos e mais prática.',
        'A1, A2, B1 e B2 já têm a primeira lição pronta. Escolha um nível!',
      ]),
      vi: _pp([
        'Plus đã bật: bài đầu của A1, A2, B1 và B2 có sẵn ngay.',
        'Tiếp tục khóa học theo thứ tự mà không bị giới hạn Free.',
        'Plus mở phần tiếp theo của khóa học, hội thoại và nhiều luyện tập hơn.',
        'Bài đầu của A1, A2, B1 và B2 đã sẵn sàng. Chọn một cấp độ nhé!',
      ]),
      id: _pp([
        'Plus aktif: pelajaran pertama A1, A2, B1, dan B2 langsung tersedia.',
        'Lanjutkan kursus secara berurutan tanpa batasan Free.',
        'Plus membuka kelanjutan kursus, dialog, dan lebih banyak latihan.',
        'Pelajaran pertama A1, A2, B1, dan B2 sudah siap. Pilih levelmu!',
      ]),
      tr: _pp([
        'Plus etkin: A1, A2, B1 ve B2’nin ilk dersleri hemen hazır.',
        'Free sınırları olmadan kursa sırayla devam et.',
        'Plus kursun devamını, diyalogları ve daha fazla pratiği açar.',
        'A1, A2, B1 ve B2’nin ilk dersleri hazır. Seviyeni seç!',
      ]),
      pl: _pp([
        'Plus jest aktywny: pierwsze lekcje A1, A2, B1 i B2 są dostępne od razu.',
        'Kontynuuj kurs po kolei bez ograniczeń Free.',
        'Plus otwiera dalszy kurs, dialogi i więcej ćwiczeń.',
        'Pierwsze lekcje A1, A2, B1 i B2 są gotowe. Wybierz poziom!',
      ]),
    }));
    await N.scheduleNotificationAsync({
      content: { title: _premTitle, body: _premBody, sound: false, data: { type: 'premium' } },
      trigger: null,
    });
  } catch (e) {
    if (__DEV__) console.warn('[notifications]', e);
  }
};

// ── Уведомление: Intro Full Access истекает через 2 часа ─────────────────────
// INTRO_EXPIRING_NOTIF_ID_KEY is declared near NOTIFICATION_SCHEDULE_STORAGE_KEYS
// above, which references it at module load (avoids used-before-declaration).

/**
 * Результат планирования конверсионного пуша. Раньше функции возвращали void и
 * молча глушили любую ошибку (только console.warn в DEV) — из-за этого QA-кнопки
 * в админке всегда показывали «Пуш запланирован», даже когда пуш на самом деле НЕ
 * планировался (нет разрешения / Expo-триггер упал). Теперь возвращаем явный итог,
 * чтобы вызывающая сторона (особенно QA) видела ПРАВДУ, а не ложный успех.
 * Обратная совместимость: прод-вызовы игнорируют возвращаемое значение (.catch(()=>{})),
 * для них поведение не меняется.
 */
export type ConversionPushResult =
  | { ok: true; scheduled: number }
  | { ok: false; reason: 'no_module' | 'no_permission' | 'too_soon' | 'schedule_failed' | 'disabled'; error?: string };

export const scheduleIntroExpiringNotification = async (
  endsAtMs: number,
  lang: Lang = 'ru',
  opts: { minSeconds?: number } = {},
): Promise<ConversionPushResult> => {
  try {
    const N = await getNotifications();
    if (!N) return { ok: false, reason: 'no_module' };
    const hasPermission = await canUseNotifications(true);
    if (!hasPermission) return { ok: false, reason: 'no_permission' };
    if (!(await isNotifCategoryEnabled('offers'))) return { ok: false, reason: 'disabled' };

    const twoHoursBeforeMs = endsAtMs - 2 * 60 * 60 * 1000;
    const secondsUntil = Math.floor((twoHoursBeforeMs - Date.now()) / 1000);
    if (secondsUntil <= (opts.minSeconds ?? 60)) return { ok: false, reason: 'too_soon' };

    const prev = await AsyncStorage.getItem(INTRO_EXPIRING_NOTIF_ID_KEY);
    if (prev) await N.cancelScheduledNotificationAsync(prev).catch(swallowError('notifications:scheduleIntroExpiringNotification'));

    const title = pickNotif(lang, notificationCopy({
      ru: 'Твой Плюс истекает через 2 часа',
      uk: 'Твій Плюс закінчується через 2 години',
      es: 'Tu Plus expira en 2 horas', en: 'Your Plus expires in 2 hours',
      'pt-BR': 'Seu Plus expira em 2 horas',
      vi: 'Plus của bạn hết hạn sau 2 giờ',
      id: 'Plus kamu berakhir dalam 2 jam',
      tr: "Plus'ın 2 saat sonra bitiyor",
      pl: 'Twoje Plus wygasa za 2 godziny',
    }));
    const body = pickNotif(lang, notificationCopy({
      ru: 'Ты выучил первые фразы — не останавливайся. Сохрани доступ к урокам и энергии навсегда.',
      uk: 'Ти вивчив перші вислови — не зупиняйся. Збережи доступ до уроків і енергії назавжди.',
      es: 'Ya aprendiste tus primeras frases. No pares ahora — conserva el acceso ilimitado.', en: 'You learned your first phrases — keep going. Keep access to lessons and energy for good.',
      'pt-BR': 'Você aprendeu suas primeiras frases. Não pare agora — mantenha o acesso ilimitado.',
      vi: 'Bạn đã học những cụm từ đầu tiên — đừng dừng lại. Giữ quyền truy cập không giới hạn.',
      id: 'Kamu sudah belajar frasa pertama — jangan berhenti. Pertahankan akses tak terbatas.',
      tr: 'İlk ifadelerini öğrendin — durma. Sınırsız erişimi koru.',
      pl: 'Nauczyłeś się pierwszych zwrotów — nie zatrzymuj się. Zachowaj nieograniczony dostęp.',
    }));

    const id = await N.scheduleNotificationAsync({
      content: { title, body, sound: false, data: { type: 'intro_expiring' } },
      trigger: triggerInterval(secondsUntil),
    });
    await AsyncStorage.setItem(INTRO_EXPIRING_NOTIF_ID_KEY, id);
    return { ok: true, scheduled: 1 };
  } catch (e) {
    if (__DEV__) console.warn('[notifications]', e);
    return { ok: false, reason: 'schedule_failed', error: e instanceof Error ? e.message : String(e) };
  }
};

export const cancelIntroExpiringNotification = async (): Promise<void> => {
  try {
    const N = await getNotifications();
    if (!N) return;
    const id = await AsyncStorage.getItem(INTRO_EXPIRING_NOTIF_ID_KEY);
    if (id) {
      await N.cancelScheduledNotificationAsync(id).catch(swallowError('notifications:cancelIntroExpiringNotification'));
      await AsyncStorage.removeItem(INTRO_EXPIRING_NOTIF_ID_KEY);
    }
  } catch (e) {
    if (__DEV__) console.warn('[notifications]', e);
  }
};

// ── Миграция: отмена старых локальных уведомлений удалённых функций ──────────
// зачем (PM-201): логика вынесена в app/retired_local_notifications.ts (лёгкий модуль, проверяется
// без этого файла). Здесь — только точка вызова с ленивым загрузчиком expo-notifications.
export const cancelRetiredLocalNotificationsOnce = (): Promise<void> =>
  runRetiredLocalNotificationsCancel(getNotifications);

// ── Upsell уведомления для не-Premium пользователей (D+4, D+7, D+14) ─────────
const UPSELL_NOTIF_KEYS = {
  d4: 'notification_upsell_d4_scheduled_at',
  d7: 'notification_upsell_d7_scheduled_at',
  d14: 'notification_upsell_d14_scheduled_at',
};

export const scheduleUpsellNotifications = async (
  introEndedAtMs: number,
  lang: Lang = 'ru',
  opts: { minSeconds?: number } = {},
): Promise<ConversionPushResult> => {
  try {
    const N = await getNotifications();
    if (!N) return { ok: false, reason: 'no_module' };
    const hasPermission = await canUseNotifications(true);
    if (!hasPermission) return { ok: false, reason: 'no_permission' };
    if (!(await isNotifCategoryEnabled('offers'))) return { ok: false, reason: 'disabled' };

    const nowMs = Date.now();

    const slots: Array<{
      key: keyof typeof UPSELL_NOTIF_KEYS;
      delayDays: number;
      title: string;
      body: string;
      type: LocalNotificationType;
    }> = [
      {
        key: 'd4',
        delayDays: 4,
        type: 'upsell_d4',
        title: pickNotif(lang, notificationCopy({
          ru: 'Твой путь продолжается.',
          uk: 'Твій шлях продовжується.',
          es: 'Tu progreso continúa.', en: 'Your journey continues.',
          'pt-BR': 'Seu progresso continua.',
          vi: 'Tiến trình của bạn tiếp tục.',
          id: 'Progresmu terus berlanjut.',
          tr: 'İlerlemeniz devam ediyor.',
          pl: 'Twój postęp trwa.',
        })),
        body: pickNotif(lang, notificationCopy({
          ru: 'С Плюс — энергия без лимита и все курсы открыты. Учись без остановок.',
          uk: 'З Плюс — енергія без ліміту і всі курси відкриті. Вчись без зупинок.',
          es: 'Con Plus — energía ilimitada y todos los cursos abiertos. Sin parar.', en: 'With Plus — unlimited energy and every course open. Learn without stopping.',
          'pt-BR': 'Com Plus — energia ilimitada e todos os cursos abertos. Sem parar.',
          vi: 'Với Plus — năng lượng vô hạn và tất cả khóa học mở. Học không ngừng.',
          id: 'Dengan Plus — energi tak terbatas dan semua kursus terbuka. Belajar tanpa henti.',
          tr: 'Plus ile — sınırsız enerji ve tüm kurslar açık. Durmadan öğren.',
          pl: 'Z Plus — nieograniczona energia i wszystkie kursy otwarte. Ucz się bez przerwy.',
        })),
      },
      {
        key: 'd7',
        delayDays: 7,
        type: 'upsell_d7',
        title: pickNotif(lang, notificationCopy({
          ru: 'Энергия мешает учиться?',
          uk: 'Енергія заважає вчитися?',
          es: '¿La energía te frena?', en: 'Is energy getting in the way?',
          'pt-BR': 'A energia está te travando?',
          vi: 'Năng lượng đang cản trở bạn?',
          id: 'Energi menghambatmu belajar?',
          tr: 'Enerji seni engelliyor mu?',
          pl: 'Energia Cię blokuje?',
        })),
        body: pickNotif(lang, notificationCopy({
          ru: 'С Плюс энергия бесконечная. Никакой перезарядки — учись когда хочешь и сколько хочешь.',
          uk: 'З Плюс енергія безмежна. Ніякої перезарядки — вчись коли хочеш і скільки хочеш.',
          es: 'Con Plus, energía infinita. Sin esperas — estudia cuando quieras y cuanto quieras.', en: 'With Plus, energy is endless. No recharging — learn whenever and as much as you like.',
          'pt-BR': 'Com Plus, energia infinita. Sem espera — estude quando e quanto quiser.',
          vi: 'Với Plus, năng lượng vô hạn. Không cần chờ — học bất cứ lúc nào bạn muốn.',
          id: 'Dengan Plus, energi tak terbatas. Tanpa menunggu — belajar kapan saja dan sebanyak yang kamu mau.',
          tr: 'Plus ile sonsuz enerji. Bekleme yok — istediğin zaman, istediğin kadar çalış.',
          pl: 'Z Plus masz nieskończoną energię. Bez czekania — ucz się kiedy chcesz i ile chcesz.',
        })),
      },
      {
        key: 'd14',
        delayDays: 14,
        type: 'upsell_d14',
        title: pickNotif(lang, notificationCopy({
          ru: '2 недели — и ты всё ещё здесь.',
          uk: '2 тижні — і ти все ще тут.',
          es: '2 semanas y sigues aquí.', en: '2 weeks — and you’re still here.',
          'pt-BR': '2 semanas e você ainda está aqui.',
          vi: '2 tuần — và bạn vẫn còn đây.',
          id: '2 minggu — dan kamu masih di sini.',
          tr: '2 hafta — ve hâlâ buradasın.',
          pl: '2 tygodnie — i nadal tu jesteś.',
        })),
        body: pickNotif(lang, notificationCopy({
          ru: 'Это значит, что ты серьёзен. Разблокируй весь Phraseman — все уроки, бесконечная энергия, нет лимитов.',
          uk: 'Це означає, що ти серйозний. Розблокуй весь Phraseman — всі уроки, безмежна енергія, без лімітів.',
          es: 'Eso dice mucho. Desbloquea todo Phraseman — todas las lecciones, energía infinita, sin límites.', en: 'That means you’re serious. Unlock all of Phraseman — every lesson, endless energy, no limits.',
          'pt-BR': 'Isso diz muito sobre você. Desbloqueie todo o Phraseman — todas as lições, energia infinita, sem limites.',
          vi: 'Điều này nói lên rất nhiều. Mở khóa toàn bộ Phraseman — tất cả bài học, năng lượng vô hạn, không giới hạn.',
          id: 'Ini berarti kamu serius. Buka semua Phraseman — semua pelajaran, energi tak terbatas, tanpa batas.',
          tr: 'Bu çok şey anlatıyor. Tüm Phraseman\'ı aç — tüm dersler, sonsuz enerji, sınır yok.',
          pl: 'To wiele mówi. Odblokuj cały Phraseman — wszystkie lekcje, nieskończona energia, bez limitów.',
        })),
      },
    ];

    let scheduled = 0;
    for (const slot of slots) {
      const alreadyScheduled = await AsyncStorage.getItem(UPSELL_NOTIF_KEYS[slot.key]);
      if (alreadyScheduled) continue;

      const fireAtMs = introEndedAtMs + slot.delayDays * 24 * 60 * 60 * 1000;
      const secondsUntil = Math.floor((fireAtMs - nowMs) / 1000);
      if (secondsUntil <= (opts.minSeconds ?? 60)) continue;

      await N.scheduleNotificationAsync({
        content: { title: slot.title, body: slot.body, sound: false, data: { type: slot.type } },
        trigger: triggerInterval(secondsUntil),
      });
      await AsyncStorage.setItem(UPSELL_NOTIF_KEYS[slot.key], String(nowMs));
      scheduled++;
    }
    // 0 запланировано без ошибки = все слоты уже были запланированы ранее или
    // их время уже прошло (too_soon). Для QA это важная разница с реальным успехом.
    return scheduled > 0 ? { ok: true, scheduled } : { ok: false, reason: 'too_soon' };
  } catch (e) {
    if (__DEV__) console.warn('[notifications]', e);
    return { ok: false, reason: 'schedule_failed', error: e instanceof Error ? e.message : String(e) };
  }
};

export const cancelUpsellNotifications = async (): Promise<void> => {
  try {
    const N = await getNotifications();
    if (!N) return;
    await cancelScheduledNotificationsByType(N, ['upsell_d4', 'upsell_d7', 'upsell_d14']);
    await AsyncStorage.multiRemove(Object.values(UPSELL_NOTIF_KEYS));
  } catch (e) {
    if (__DEV__) console.warn('[notifications]', e);
  }
};

/**
 * План #7: abandoned-paywall push — мягкое напоминание через ~1 час после того,
 * как пользователь открыл пейвол и закрыл без покупки. Targeted (упоминает прогресс) —
 * 7× open rate vs generic (Airship). Один раз за окно (per-type кулдаун 23ч).
 * Bible Стиль 1 Тренер, gain-framing, ≤10 слов.
 */
export const schedulePaywallAbandonedNotification = async (
  lang: Lang = 'ru',
  opts: { delaySeconds?: number } = {},
): Promise<void> => {
  try {
    const N = await getNotifications();
    if (!N) return;
    if (!(await canUseNotifications(true))) return;
    if (!(await isNotifCategoryEnabled('offers'))) return;
    // не спамим: общий слот + per-type кулдаун
    if (!(await claimImmediateNotificationSlot('paywall_abandoned', Date.now()))) return;

    const title = pickNotif(lang, notificationCopy({
      ru: 'Ты почти открыл полный доступ',
      uk: 'Ти майже відкрив повний доступ',
      es: 'Casi abres el acceso completo', en: 'You’re close to full access',
      'pt-BR': 'Você quase abriu o acesso completo',
      vi: 'Bạn gần như đã mở toàn quyền',
      id: 'Kamu hampir membuka akses penuh',
      tr: 'Tam erişimi açmana az kaldı',
      pl: 'Prawie odblokowałeś pełny dostęp',
    }));
    const body = pickNotif(lang, notificationCopy({
      ru: 'Твой путь ждёт. Продолжим?',
      uk: 'Твій шлях чекає. Продовжимо?',
      es: 'Tu progreso te espera. ¿Seguimos?', en: 'Your journey is waiting. Shall we continue?',
      'pt-BR': 'Seu progresso espera. Continuamos?',
      vi: 'Tiến trình đang chờ bạn. Tiếp tục nhé?',
      id: 'Progresmu menunggu. Lanjut?',
      tr: 'İlerlemen seni bekliyor. Devam edelim mi?',
      pl: 'Twój postęp czeka. Kontynuujemy?',
    }));

    await N.scheduleNotificationAsync({
      content: { title, body, sound: false, data: { type: 'paywall_abandoned' as LocalNotificationType } },
      trigger: triggerInterval(Math.max(60, opts.delaySeconds ?? 3600)),
    });
    // Воронка: пуш реально запланирован — фиксируем для baseline/atтрибуции re-engagement.
    void import('./analytics').then(({ trackEvent }) => trackEvent('paywall_abandoned_push_sent', {})).catch(swallowError('notifications:schedulePaywallAbandonedNotification'));
    void import('./firebase').then(({ logPaywallAbandonedPush }) => logPaywallAbandonedPush()).catch(swallowError('notifications:schedulePaywallAbandonedNotification'));
  } catch (e) {
    if (__DEV__) console.warn('[notifications]', e);
  }
};

// ── Типы для расширенных настроек (совместимость с settings_notifications.tsx) ─
// зачем (умное напоминание, владелец 13.10): mode 'auto' — время подбирает телефон (smart_reminder_store), 'manual' — человек
// выбрал сам и его время не трогаем никогда. Нет поля (старые данные) = 'manual': не можем отличить «оставил по умолчанию» от «выбрал».
export type DaySchedule = { enabled: boolean; hour: number; minute: number; mode?: 'auto' | 'manual' };
export type NotifSettings = { schedule: Record<number, DaySchedule> };

// зачем (решение координатора 13.10): время по умолчанию 20:00 — как в образце настроек и фолбэк умного напоминания.
export const DEFAULT_NOTIF: NotifSettings = {
  schedule: Object.fromEntries(
    Array.from({ length: 7 }, (_, i) => [i, { enabled: false, hour: 20, minute: 0 }])
  ),
};

const NOTIF_KEY = 'notif_settings_v2';

function cloneNotif(s: NotifSettings): NotifSettings {
  return JSON.parse(JSON.stringify(s)) as NotifSettings;
}

let notifMemory: NotifSettings = cloneNotif(DEFAULT_NOTIF);

export function getNotifSettingsSnapshot(): NotifSettings {
  const snapshot = cloneNotif(notifMemory);
  // зачем (координатор 13.10, settings-gap-028): dev_state?reminderTime=HH:MM — экран показывает это время. Подменяется только
  // отдаваемая копия: notifMemory, хранилище и расписание уведомлений не меняются. Только dev-сборка.
  const devTime = getDevReminderTime();
  if (!devTime) return snapshot;
  return {
    schedule: Object.fromEntries(
      Object.entries(snapshot.schedule).map(([day, entry]) => [day, { ...entry, hour: devTime.hour, minute: devTime.minute }]),
    ),
  };
}

/** Вызывать в app bootstrap до setReady — первый кадр расписания с правильными тумблерами */
export async function hydrateNotifSettingsFromStorage(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(NOTIF_KEY);
    if (raw) {
      notifMemory = cloneNotif(JSON.parse(raw) as NotifSettings);
    } else {
      notifMemory = cloneNotif(DEFAULT_NOTIF);
    }
  } catch {
    notifMemory = cloneNotif(DEFAULT_NOTIF);
  }
}

export const loadNotifSettings = async (): Promise<NotifSettings> => {
  await hydrateNotifSettingsFromStorage();
  return getNotifSettingsSnapshot();
};

export const saveNotifSettings = async (s: NotifSettings): Promise<void> => {
  notifMemory = cloneNotif(s);
  try {
    await AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(s));
  } catch (e) {
    if (__DEV__) console.warn('[notifications]', e);
  }
};

// ── Категории уведомлений: выбор юзера «какие уведомления получать» ──────────
// зачем: владелец попросил дать юзеру выбор по типам. Раньше экран настроек
// управлял только типом 'reminder', а остальные ~12 типов жили без выключателя —
// отсюда жалоба «уведомления приходят как попало». Теперь у каждого типа есть
// категория, у категории — тумблер. Мастер = легаси-флаг 'notifications_enabled'
// (его уже читают bootstrap, streak и weekly-refresh — не ломаем связи).
export type NotifCategory =
  | 'streak'
  | 'phrase_of_day'
  | 'energy'
  | 'weekly_recap'
  | 'monthly_recap'
  | 'offers'
  | 'gifts'
  // «Вместе» (friends_together §1.3): пуш «Позвал(а)» от друга. Локальных
  // напоминаний нет (см. CATEGORY_LOCAL_TYPES ниже) — шлёт только сервер по чужому тапу.
  | 'friends'
  // Шпиль (первый выпуск, макет profile.html PRF-04 «События Шпиля»): недельный итог и угроза зоне.
  // Локальных напоминаний нет — шлёт только сервер (functions/src/spire_notifications.ts читает pushPrefs.league).
  | 'spire';
export type NotifPrefs = { master: boolean; categories: Record<NotifCategory, boolean> };

export const DEFAULT_NOTIF_PREFS: NotifPrefs = {
  master: true,
  categories: {
    streak: true,
    phrase_of_day: true,
    energy: true,
    weekly_recap: true,
    monthly_recap: true,
    offers: true,
    // зачем (2026-08-02, владелец): пуш «подарок сгорит» — про потерю своего
    // добра, отдельный тумблер, по умолчанию включён (не «предложения»).
    gifts: true,
    // «Вместе»: по умолчанию включено, как и остальные социальные категории;
    // получатель может выключить в настройках (friendsNudge это уважает).
    friends: true,
    // зачем: по умолчанию включено — как раньше, когда пуши Шпиля нельзя было выключить отдельно.
    spire: true,
  },
};

const NOTIF_PREFS_KEY = 'notif_prefs_v1';

/** Маппинг категория → типы локальных уведомлений (для отмены при выключении). */
const CATEGORY_LOCAL_TYPES: Record<NotifCategory, LocalNotificationType[]> = {
  streak: ['streak_warning'],
  phrase_of_day: ['phrase_of_day'],
  energy: ['energy_full'],
  weekly_recap: ['weekly_recap'],
  monthly_recap: ['monthly_recap'],
  offers: ['intro_expiring', 'upsell_d4', 'upsell_d7', 'upsell_d14', 'paywall_abandoned', 'premium'],
  gifts: ['gift_expiring'],
  // Пустой массив: «Позвать» — не локальное напоминание с расписанием, а серверный
  // пуш по тапу другого человека. Отменять здесь нечего.
  friends: [],
  // Шпиль: серверные пуши + одно локальное «Напомнить вечером» из окна итога недели (D191) — его и отменяем.
  spire: ['spire_week_remind'],
};

function normalizeNotifPrefs(raw: unknown): NotifPrefs {
  const src = (raw ?? {}) as Partial<NotifPrefs> & { categories?: Partial<Record<NotifCategory, boolean>> };
  const categories = { ...DEFAULT_NOTIF_PREFS.categories };
  for (const key of Object.keys(categories) as NotifCategory[]) {
    const v = src.categories?.[key];
    if (typeof v === 'boolean') categories[key] = v;
  }
  // зачем (ревью 11.10): Шпиль заменил Лигу (D54/D74). Старые сборки писали тумблер «Лига» в categories.league
  // и pushPrefs.league=false на сервер. Если spire ещё не сохранён — наследуем выбор «Лиги», иначе экран
  // покажет «вкл», а сервер будет молчать.
  const legacyLeague = (src.categories as Record<string, unknown> | undefined)?.league;
  if (typeof src.categories?.spire !== 'boolean' && typeof legacyLeague === 'boolean') categories.spire = legacyLeague;
  return { master: typeof src.master === 'boolean' ? src.master : true, categories };
}

let notifPrefsMemory: NotifPrefs | null = null;

export function getNotifPrefsSnapshot(): NotifPrefs {
  const p = notifPrefsMemory ?? DEFAULT_NOTIF_PREFS;
  return { master: p.master, categories: { ...p.categories } };
}

/**
 * Гидрация префов при старте (вызывается из bootstrap рядом с
 * hydrateNotifSettingsFromStorage). Миграция для существующих юзеров:
 * master выводим из легаси-флага, а если юзер никогда не решал — из системного
 * разрешения (тем, кто выдал разрешение, ничего не выключаем — поведение
 * energy/offers/d1 не меняется).
 */
export async function hydrateNotifPrefsFromStorage(): Promise<NotifPrefs> {
  // зачем (settings-gap-012): красная плашка = «мастер включён, а разрешения нет». Под dev `notifperm=denied` мастер считается
  // включённым только в отдаваемом снимке — в хранилище ничего не пишется (иначе миграция записала бы master=false).
  if (isDevNotifPermDenied()) {
    const base = notifPrefsMemory ?? { ...DEFAULT_NOTIF_PREFS, categories: { ...DEFAULT_NOTIF_PREFS.categories } };
    console.warn('[DEV-STATE] notifications: мастер включён в снимке (notifperm=denied), запись пропущена'); // guard-ok: dev-ветка
    return { ...base, master: true, categories: { ...base.categories } };
  }
  try {
    const raw = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
    if (raw) {
      notifPrefsMemory = normalizeNotifPrefs(JSON.parse(raw));
      return getNotifPrefsSnapshot();
    }
    const legacy = await AsyncStorage.getItem('notifications_enabled');
    let master: boolean;
    if (legacy === 'true') master = true;
    else if (legacy === 'false') master = false;
    else master = await isNotificationPermissionGranted();
    const migrated: NotifPrefs = { ...DEFAULT_NOTIF_PREFS, master, categories: { ...DEFAULT_NOTIF_PREFS.categories } };
    notifPrefsMemory = migrated;
    await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(migrated));
    // Синхронизируем легаси-флаг: его читают streak/weekly-refresh/bootstrap.
    if (master && legacy !== 'true') await persistPortablePreference('notifications_enabled', 'true');
    return getNotifPrefsSnapshot();
  } catch (error) {
    console.warn('[NOTIF-PREFS] настройки уведомлений не прочитаны — по умолчанию', error instanceof Error ? error.message : String(error));
    notifPrefsMemory = notifPrefsMemory ?? { ...DEFAULT_NOTIF_PREFS, categories: { ...DEFAULT_NOTIF_PREFS.categories } };
    return getNotifPrefsSnapshot();
  }
}

/** {enabled, tz} для friendsNudge на сервере: tz — минуты смещения от UTC, знак как getTimezoneOffset()*-1. */
const FRIENDS_PUSH_PREF_KEY = 'friends_push_v1';

function currentTzOffsetMinutes(): number {
  return -new Date().getTimezoneOffset();
}

async function writeFriendsPushPref(enabled: boolean): Promise<void> {
  try {
    const value = JSON.stringify({ enabled, tz: currentTzOffsetMinutes() });
    const prevRaw = await AsyncStorage.getItem(FRIENDS_PUSH_PREF_KEY);
    if (prevRaw === value) return; // не пишем без реального изменения — cloud_sync экономит трафик
    await AsyncStorage.setItem(FRIENDS_PUSH_PREF_KEY, value);
  } catch (e) {
    if (__DEV__) console.warn('[notifications] friends_push_v1', e);
  }
}

/**
 * «Вместе» (friends_together §4): раз в сутки при старте — обновить friends_push_v1,
 * только если реально изменилось (тумблер «Друзья» или сместился часовой пояс
 * устройства). Экспортируется, но НЕ вызывается автоматически из _layout — по заданию
 * это делает UI-агент явно на старте приложения, здесь только сама функция.
 */
export async function syncFriendsPushPrefIfChanged(): Promise<void> {
  const prefs = await getNotifPrefs();
  await writeFriendsPushPref(prefs.master && prefs.categories.friends !== false);
}

export const saveNotifPrefs = async (p: NotifPrefs): Promise<void> => {
  const normalized = normalizeNotifPrefs(p);
  notifPrefsMemory = normalized;
  try {
    await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(normalized));
    // Легаси-флаг = мастер: его уже читают все старые проверки, включая bootstrap.
    await persistPortablePreference('notifications_enabled', normalized.master ? 'true' : 'false');
  } catch (e) {
    if (__DEV__) console.warn('[notifications]', e);
  }
  // «Вместе»: зеркалим категорию «Друзья» в friends_push_v1 (подхватывается
  // cloud_sync через SYNC_KEYS) — при смене тумблера, не только раз в сутки.
  await writeFriendsPushPref(normalized.master && normalized.categories.friends !== false);
  // Зеркалим выбор в облако для серверных пушей — best-effort, 1 write и только
  // при реальном изменении (кэш внутри updateServerPushPrefs). Firebase-экономия:
  // кроны и так читают users-док ради токена, лишних чтений не появляется.
  void import('./push_token_registration')
    .then(({ updateServerPushPrefs }) => updateServerPushPrefs({
      streak: normalized.master && normalized.categories.streak,
      offers: normalized.master && normalized.categories.offers,
      // зачем (profile-006, 11.10): тумблер «События Шпиля» → pushPrefs.league, который сервер Шпиля уже уважает.
      league: normalized.master && normalized.categories.spire,
    }))
    .catch(swallowError('notifications:saveNotifPrefs'));
};

async function getNotifPrefs(): Promise<NotifPrefs> {
  if (notifPrefsMemory) return notifPrefsMemory;
  return hydrateNotifPrefsFromStorage();
}

export async function isNotifMasterEnabled(): Promise<boolean> {
  const p = await getNotifPrefs();
  return p.master;
}

export async function isNotifCategoryEnabled(category: NotifCategory): Promise<boolean> {
  const p = await getNotifPrefs();
  return p.master && p.categories[category] !== false;
}

/**
 * Применить смену префов: отменить уже запланированное для выключенных категорий
 * и перепланировать стандартный набор для включённых. Вызывается экраном настроек
 * ПОСЛЕ saveNotifPrefs; сам экран обновляет состояние мгновенно (optimistic).
 */
export const applyNotifPrefsSideEffects = async (
  prefs: NotifPrefs,
  lang: Lang,
  opts: { studyTarget?: RuntimeStudyTarget } = {},
): Promise<void> => {
  if (!prefs.master) {
    // cancelAllNotifications гасит всё локальное, чистит ключи планирования
    // и удаляет push-токен из облака (сервер перестаёт слать).
    await cancelAllNotifications();
    return;
  }
  const N = await getNotifications();
  if (!N) return;
  for (const key of Object.keys(CATEGORY_LOCAL_TYPES) as NotifCategory[]) {
    if (prefs.categories[key] !== false) continue;
    await cancelScheduledNotificationsByType(N, CATEGORY_LOCAL_TYPES[key]);
  }
  // Чистим scheduled-маркеры выключенных категорий, чтобы повторное включение
  // не думало «уже запланировано».
  const staleKeys: string[] = [];
  if (prefs.categories.streak === false) staleKeys.push('streak_warning_scheduled', STREAK_WARNING_NOTIF_ID_KEY);
  if (prefs.categories.phrase_of_day === false) staleKeys.push('phrase_notif_scheduled', PHRASE_OF_DAY_NOTIF_ID_KEY);
  if (prefs.categories.weekly_recap === false) staleKeys.push('weekly_recap_scheduled', WEEKLY_RECAP_NOTIF_ID_KEY);
  if (prefs.categories.monthly_recap === false) staleKeys.push('monthly_recap_scheduled', MONTHLY_RECAP_NOTIF_ID_KEY);
  if (prefs.categories.energy === false) staleKeys.push(ENERGY_FULL_NOTIF_ID_KEY);
  if (prefs.categories.offers === false) {
    staleKeys.push(
      INTRO_EXPIRING_NOTIF_ID_KEY,
      'notification_upsell_d4_scheduled_at',
      'notification_upsell_d7_scheduled_at',
      'notification_upsell_d14_scheduled_at',
    );
  }
  if (prefs.categories.gifts === false) staleKeys.push(GIFT_EXPIRING_NOTIF_ID_KEY);
  if (staleKeys.length) await AsyncStorage.multiRemove(staleKeys).catch(swallowError('notifications:applyNotifPrefsSideEffects'));

  // Включённые категории: перепланируем стандартный набор (как bootstrap в _layout).
  const scheduleOpts = { requestPermission: false as const, studyTarget: opts.studyTarget };
  if (prefs.categories.streak) scheduleStreakWarningIfNeeded(lang, scheduleOpts).catch(swallowError('notifications:applyNotifPrefsSideEffects'));
  if (prefs.categories.phrase_of_day) schedulePhraseOfDayNotification(lang, scheduleOpts).catch(swallowError('notifications:applyNotifPrefsSideEffects'));
  if (prefs.categories.weekly_recap) scheduleWeeklyRecapNotification(lang, scheduleOpts).catch(swallowError('notifications:applyNotifPrefsSideEffects'));
  if (prefs.categories.monthly_recap) scheduleMonthlyRecapNotification(lang, scheduleOpts).catch(swallowError('notifications:applyNotifPrefsSideEffects'));
  // Мастер включён — вернём push-токен в облако (мог быть удалён при выключении).
  void import('./push_token_registration')
    .then(({ registerPushTokenForServerPush }) => registerPushTokenForServerPush(lang))
    .catch(swallowError('notifications:applyNotifPrefsSideEffects'));
};

// app day index 0=Mon..6=Sun → expo weekday 1=Sun,2=Mon..7=Sat
const appDayToExpoWeekday = (d: number): number => d === 6 ? 1 : d + 2;

// ── Умное время ежедневного напоминания (Этап 1, владелец 13.10) ──────────────────────────────────────────────
const REMINDER_SCHEDULE_SIG_KEY = 'reminder_schedule_sig_v1';

function reminderScheduleSignature(s: NotifSettings, lang: string, studyTarget: unknown): string {
  const days = Object.entries(s.schedule)
    .filter(([, d]) => d.enabled)
    .map(([k, d]) => `${k}@${d.hour}:${d.minute}`)
    .join(',');
  return `${lang}|${String(studyTarget ?? '')}|${days}`;
}

/** Расписание то же и в системе стоят все напоминания — перепланировать не нужно (батарея, лишние отмены). */
async function reminderScheduleUnchanged(N: Awaited<ReturnType<typeof getNotifications>>, signature: string, enabledDays: number): Promise<boolean> {
  try {
    const prevSig = await AsyncStorage.getItem(REMINDER_SCHEDULE_SIG_KEY);
    if (prevSig !== signature) {
      console.log(`[SMART-REMINDER] schedule:replan reason=${prevSig == null ? 'first' : 'changed'}`);
      return false;
    }
    if (!N?.getAllScheduledNotificationsAsync) {
      console.log('[SMART-REMINDER] schedule:replan reason=cannot_list_scheduled');
      return false;
    }
    const scheduled = await N.getAllScheduledNotificationsAsync();
    const reminders = (scheduled || []).filter((r: any) => r?.content?.data?.type === 'reminder').length;
    if (reminders !== enabledDays) {
      console.log(`[SMART-REMINDER] schedule:replan reason=system_count_mismatch scheduled=${reminders} expected=${enabledDays}`);
      return false;
    }
    console.log(`[SMART-REMINDER] schedule:skip reason=unchanged days=${enabledDays}`);
    return true;
  } catch (e) {
    console.warn('[SMART-REMINDER] schedule:check_failed → replan', e instanceof Error ? e.message : String(e));
    return false;
  }
}

/** Дни в режиме 'auto' получают время из истории привычки; ручные — как есть. Новое время сохраняется, чтобы экран показал его. */
async function applyAutoReminderTime(s: NotifSettings): Promise<NotifSettings> {
  const autoDays = Object.values(s.schedule).filter(d => d.enabled && d.mode === 'auto').length;
  if (autoDays === 0) {
    console.log('[SMART-REMINDER] auto:skip reason=no_auto_days (ручное время или расписание выключено)');
    return s;
  }
  try {
    const t = await resolveAutoReminderTime();
    const schedule = Object.fromEntries(
      Object.entries(s.schedule).map(([k, d]) => [k, d.mode === 'auto' ? { ...d, hour: t.hour, minute: t.minute } : d]),
    );
    const next: NotifSettings = { ...s, schedule };
    if (JSON.stringify(next.schedule) !== JSON.stringify(s.schedule)) await saveNotifSettings(next);
    return next;
  } catch (e) {
    console.warn('[SMART-REMINDER] auto:failed → прежнее время', e instanceof Error ? e.message : String(e));
    return s;
  }
}

/**
 * Включить ежедневное напоминание «умно» (решение владельца 13.10, вариант (а)): все 7 дней, время «авто».
 * Зовут окно «включить напоминания», онбординг после согласия и Настройки. Если человек уже включал расписание сам —
 * его выбор не трогаем, только перепланируем.
 */
export async function enableSmartDailyReminder(
  lang: Lang,
  opts: NotificationTargetOpts & { caller: string },
): Promise<void> {
  const snap = getNotifSettingsSnapshot();
  const enabledDays = Object.values(snap.schedule).filter(d => d.enabled).length;
  if (enabledDays > 0) {
    console.log(`[SMART-REMINDER] enable:keep_existing caller=${opts.caller} enabledDays=${enabledDays} → только перепланировка`);
    await scheduleNotifications(snap, lang, 0, opts);
    return;
  }
  const schedule = Object.fromEntries(
    Array.from({ length: 7 }, (_, d) => [d, { enabled: true, hour: DEFAULT_NOTIF.schedule[0].hour, minute: 0, mode: 'auto' as const }]),
  );
  const next: NotifSettings = { schedule };
  await saveNotifSettings(next);
  console.log(`[SMART-REMINDER] enable caller=${opts.caller} days=7 mode=auto requestPermission=${String(opts.requestPermission ?? true)}`);
  await scheduleNotifications(next, lang, 0, opts);
}

export const scheduleNotifications = async (
  s: NotifSettings,
  lang: string,
  _n: number,
  opts: NotificationTargetOpts = {}
): Promise<void> => {
  const N = await getNotifications();
  if (!N) return;
  // зачем (PM-201): гасим уже запланированные уведомления удалённых функций ДО проверок разрешения/мастера —
  // отмена разрешения не требует, а без неё старый пуш сработал бы у тех, кто отключил расписание.
  void cancelRetiredLocalNotificationsOnce();

  const hasPermission = await canUseNotifications(opts.requestPermission ?? true);
  if (!hasPermission) {
    console.log(`[SMART-REMINDER] schedule:skip reason=no_permission requestPermission=${String(opts.requestPermission ?? true)}`);
    return;
  }

  if (!(await isNotifMasterEnabled())) {
    console.log('[SMART-REMINDER] schedule:skip reason=master_off');
    return;
  }

  const anyEnabled = Object.values(s.schedule).some(d => d.enabled);
  if (!anyEnabled) {
    // зачем: выключение «Ежедневного напоминания» раньше вызывало
    // cancelAllScheduledLocalNotifications и гасило ВСЕ категории (фразу дня,
    // итоги, серию) + сбрасывало мастер-флаг. Теперь тумблер расписания
    // управляет только своим типом 'reminder'.
    await cancelScheduledNotificationsByType(N, ['reminder']);
    const stalePerDayRaw = await AsyncStorage.getItem('per_day_notif_ids');
    if (stalePerDayRaw) {
      try {
        const ids: string[] = JSON.parse(stalePerDayRaw);
        await Promise.all(ids.map(id => N.cancelScheduledNotificationAsync(id).catch(swallowError('notifications:scheduleNotifications'))));
      } catch (e) {
        if (__DEV__) console.warn('[notifications]', e);
      }
    }
    const staleDailyId = await AsyncStorage.getItem(DAILY_REMINDER_ID_KEY);
    if (staleDailyId) await N.cancelScheduledNotificationAsync(staleDailyId).catch(swallowError('notifications:scheduleNotifications'));
    await AsyncStorage.multiRemove(['per_day_notif_ids', DAILY_REMINDER_ID_KEY, REMINDER_SCHEDULE_SIG_KEY]);
    console.log('[SMART-REMINDER] schedule:cleared reason=daily_reminder_off');
    return;
  }

  // зачем (умное напоминание): дни в режиме 'auto' получают время из истории привычки; ручные дни не трогаем.
  s = await applyAutoReminderTime(s);
  // зачем (план §3.6): перепланировать только при смене — подпись расписания совпала и в системе стоит столько же
  // напоминаний, сколько включено дней → ничего не отменяем и не создаём заново.
  const signature = reminderScheduleSignature(s, lang, opts.studyTarget);
  if (await reminderScheduleUnchanged(N, signature, Object.values(s.schedule).filter(d => d.enabled).length)) return;

  // Отменяем старые reminder-уведомления, включая orphaned ids после прошлых версий.
  await cancelScheduledNotificationsByType(N, ['reminder']);
  const prevPerDayRaw = await AsyncStorage.getItem('per_day_notif_ids');
  if (prevPerDayRaw) {
    const ids: string[] = JSON.parse(prevPerDayRaw);
    await Promise.all(ids.map(id => N.cancelScheduledNotificationAsync(id).catch(swallowError('notifications:scheduleNotifications'))));
  }
  // Также отменяем старый daily reminder
  const prevId = await AsyncStorage.getItem(DAILY_REMINDER_ID_KEY);
  if (prevId) await N.cancelScheduledNotificationAsync(prevId).catch(swallowError('notifications:scheduleNotifications'));
  await AsyncStorage.removeItem(DAILY_REMINDER_ID_KEY);

  const studyTarget = await resolveNotificationStudyTarget(lang as Lang, opts.studyTarget);
  const messages = reminderMessages(lang, studyTarget);
  const newIds: string[] = [];

  for (const [dayStr, day] of Object.entries(s.schedule)) {
    if (!day.enabled) continue;
    const msg = messages[Math.floor(Math.random() * messages.length)];
    try {
      const id = await N.scheduleNotificationAsync({
        content: { title: msg.title, body: msg.body, sound: false, data: { type: 'reminder', studyTarget } },
        trigger: triggerWeekly(
          appDayToExpoWeekday(Number(dayStr)),
          day.hour,
          day.minute,
        ),
      });
      newIds.push(id);
    } catch (e) {
      if (__DEV__) console.warn('[notifications]', e);
    }
  }

  await AsyncStorage.setItem('per_day_notif_ids', JSON.stringify(newIds));
  await AsyncStorage.setItem(REMINDER_SCHEDULE_SIG_KEY, signature).catch((e: unknown) => {
    console.warn('[SMART-REMINDER] schedule:sig_write_failed', e instanceof Error ? e.message : String(e));
  });
  console.log(`[SMART-REMINDER] schedule created=${newIds.length} days=${Object.entries(s.schedule).filter(([, d]) => d.enabled).map(([k, d]) => `${k}@${String(d.hour).padStart(2, '0')}:${String(d.minute).padStart(2, '0')}${d.mode === 'auto' ? 'A' : 'M'}`).join(',')}`);
  await persistPortablePreference('notifications_enabled', 'true');
  // Сохраняем время первого включённого дня для восстановления после перезапуска
  const first = Object.values(s.schedule).find(d => d.enabled);
  if (first) {
    await persistPortablePreference('notification_hour', String(first.hour));
    await persistPortablePreference('notification_minute', String(first.minute));
  }
};

// ── Авто-предупреждение о потере цепочки (планируется на вечер текущего дня) ──
// Вызывается при старте приложения, если цепочка > 0 и урок сегодня ещё не пройден.
// Персонализированные сообщения в зависимости от длины цепочки.
export const scheduleStreakWarningIfNeeded = async (
  lang: Lang = 'ru',
  opts: { requestPermission?: boolean } = {}
): Promise<void> => {
  try {
    const N = await getNotifications();
    if (!N) return;
    const hasPermission = await canUseNotifications(opts.requestPermission ?? true);
    if (!hasPermission) return;

    const today = getLocalDayKey();

    // Проверяем: цепочка > 0 и урок сегодня ещё не выполнен
    const [streakRaw, lastActiveRaw, notifEnabledRaw] = await Promise.all([
      AsyncStorage.getItem('streak_count'),
      AsyncStorage.getItem('last_active_date'),
      AsyncStorage.getItem('notifications_enabled'),
    ]);

    if (notifEnabledRaw !== 'true') return;
    if (!(await isNotifCategoryEnabled('streak'))) {
      // Категория выключена — вычищаем уже запланированное предупреждение.
      await cancelScheduledNotificationsByType(N, ['streak_warning']);
      const staleWarningId = await AsyncStorage.getItem(STREAK_WARNING_NOTIF_ID_KEY);
      if (staleWarningId) await N.cancelScheduledNotificationAsync(staleWarningId).catch(swallowError('notifications:scheduleStreakWarningIfNeeded'));
      await AsyncStorage.multiRemove(['streak_warning_scheduled', STREAK_WARNING_NOTIF_ID_KEY]);
      return;
    }
    const streak = parseInt(streakRaw || '0') || 0;
    if (streak === 0) return;

    // isSameLocalOrUtcDay: last_active_date мог быть записан ДО миграции на
    // локальную дату (старая UTC-схема) — переходный период принимает оба.
    const lessonDoneToday = isSameLocalOrUtcDay(lastActiveRaw);

    // Если урок уже пройден — ничего не нужно
    if (lessonDoneToday) {
      await cancelScheduledNotificationsByType(N, ['streak_warning']);
      const prevWarningId = await AsyncStorage.getItem(STREAK_WARNING_NOTIF_ID_KEY);
      if (prevWarningId) await N.cancelScheduledNotificationAsync(prevWarningId).catch(swallowError('notifications:scheduleStreakWarningIfNeeded'));
      await AsyncStorage.multiRemove(['streak_warning_scheduled', STREAK_WARNING_NOTIF_ID_KEY]);
      return;
    }

    // Только одно предупреждение в день
    const alreadyScheduled = await AsyncStorage.getItem('streak_warning_scheduled');
    if (alreadyScheduled === today) return;

    // Планируем на 21:00 сегодня
    const now = new Date();
    const warn = new Date(now);
    warn.setHours(21, 0, 0, 0);
    if (warn <= now) return; // уже 21:00+ — не спамим

    const secondsUntil = Math.floor((warn.getTime() - now.getTime()) / 1000);

    // Персонализированные сообщения в зависимости от длины цепочки
    let title: string;
    let body: string;

    const _ps = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
    if (streak >= 15) {
      title = pickNotif(lang, notificationCopy({
        ru: _ps([
          `🏆 Сбереги легендарную серию ${streak} дней`,
          `⭐ ${streak} дней подряд — продолжи сегодня`,
          `🔥 Серия ${streak} дней ждёт тебя — один раунд`,
          `⚡ Один раунд — и серия ${streak} дней с тобой`,
        ]),
        uk: _ps([
          `🏆 Збережи легендарну серію ${streak} днів`,
          `⭐ ${streak} днів поспіль — продовж сьогодні`,
          `🔥 Серія ${streak} днів чекає на тебе — один раунд`,
          `⚡ Один раунд — і серія ${streak} днів з тобою`,
        ]),
        es: _ps([
          `🚨 ¡Tu racha de ${streak} días corre peligro!`,
          `😱 ${streak} días seguidos podrían perderse hoy`,
          `🏆 Llevas ${streak} días como un campeón: no la sueltes`,
          `⚡ No dejes apagar una racha de ${streak} días`,
        ]), en: _ps([`🏆 Save your legendary ${streak}-day streak`, `⭐ ${streak} days in a row — continue today`, `🔥 Your ${streak}-day streak is waiting — one round`, `⚡ One round and your ${streak}-day streak stays with you`]),
        'pt-BR': _ps([
          `🚨 Sua sequência incrível de ${streak} dias está em risco!`,
          `😱 ${streak} dias podem sumir hoje!`,
          `🏆 Sequência lendária de ${streak} dias em perigo!`,
          `⚡ Não deixe apagar uma série de ${streak} dias!`,
        ]),
        vi: _ps([
          `🚨 Chuỗi ${streak} ngày tuyệt vời đang gặp nguy!`,
          `😱 ${streak} ngày có thể mất hôm nay!`,
          `🏆 Chuỗi huyền thoại ${streak} ngày đang nguy hiểm!`,
          `⚡ Đừng để chuỗi ${streak} ngày tắt đi!`,
        ]),
        id: _ps([
          `🚨 Streak luar biasa ${streak} hari terancam!`,
          `😱 ${streak} hari bisa hilang hari ini!`,
          `🏆 Streak legendaris ${streak} hari dalam bahaya!`,
          `⚡ Jangan biarkan seri ${streak} hari padam!`,
        ]),
        tr: _ps([
          `🚨 ${streak} günlük harika serin riskte!`,
          `😱 ${streak} gün bugün yok olabilir!`,
          `🏆 ${streak} günlük efsane seri tehlikede!`,
          `⚡ ${streak} günlük serinin sönmesine izin verme!`,
        ]),
        pl: _ps([
          `🚨 Niesamowita seria ${streak} dni jest zagrożona!`,
          `😱 ${streak} dni może dziś przepaść!`,
          `🏆 Legendarna seria ${streak} dni w niebezpieczeństwie!`,
          `⚡ Nie pozwól, by seria ${streak} dni zgasła!`,
        ]),
      }));
      body = pickNotif(lang, notificationCopy({
        ru: _ps([
          `Один раунд — и серия с тобой.`,
          `Столько усилий уже позади! Один раунд — и день твой.`,
          `${streak} дней труда — продолжи сегодня! Заходи.`,
          `Ты почти легенда. Один раунд — и серия жива! ⭐`,
        ]),
        uk: _ps([
          `Один раунд — і серія з тобою.`,
          `Стільки зусиль уже позаду! Один раунд — і день твій.`,
          `${streak} днів праці — продовж сьогодні! Заходь.`,
          `Ти майже легенда. Один раунд — і серія жива! ⭐`,
        ]),
        es: _ps([
          `Estás al filo: con una lección la salvas.`,
          `Tanto esfuerzo merece continuar: decide con una sesión.`,
          `${streak} días de constancia no se tiran ahora.`,
          `Casi eres leyenda del club: sigue sumando ⭐`,
        ]), en: _ps([`One round — and the streak stays with you.`, `So much effort already behind you! One round — and the day is yours.`, `${streak} days of work — continue today! Come in.`, `You’re almost a legend. One round — and the streak lives! ⭐`]),
        'pt-BR': _ps([
          `Seu progresso está no limite. Uma lição salva a sequência.`,
          `Tanto esforço merece continuar: uma sessão resolve.`,
          `${streak} dias de prática não podem desaparecer agora.`,
          `Você está quase no nível lenda. Uma lição mantém tudo vivo ⭐`,
        ]),
        vi: _ps([
          `Thành quả của bạn đang sát vạch. Một bài học là cứu được chuỗi.`,
          `Bao nhiêu công sức rồi, đừng dừng lại: một bài là đủ.`,
          `${streak} ngày luyện tập không nên biến mất bây giờ.`,
          `Bạn gần như là huyền thoại rồi. Một bài học giữ chuỗi sống ⭐`,
        ]),
        id: _ps([
          `Progresmu di ujung tanduk. Satu pelajaran menyelamatkan streak.`,
          `Usaha sebesar ini layak lanjut: satu sesi cukup.`,
          `${streak} hari latihan jangan hilang sekarang.`,
          `Kamu hampir jadi legenda. Satu pelajaran menjaga streak tetap hidup ⭐`,
        ]),
        tr: _ps([
          `Emeğin sınırda. Bir ders seriyi kurtarır.`,
          `Bu kadar çaba devam etmeyi hak ediyor: bir oturum yeter.`,
          `${streak} günlük emek şimdi kaybolmasın.`,
          `Neredeyse efsanesin. Bir ders seriyi canlı tutar ⭐`,
        ]),
        pl: _ps([
          `Twój wynik jest na krawędzi. Jedna lekcja ratuje serię.`,
          `Tyle wysiłku warto ciągnąć dalej: jedna sesja wystarczy.`,
          `${streak} dni pracy nie powinno teraz zniknąć.`,
          `Prawie jesteś legendą. Jedna lekcja utrzyma serię ⭐`,
        ]),
      }));
    } else if (streak >= 7) {
      title = pickNotif(lang, notificationCopy({
        ru: _ps([
          `🔥 Продолжи серию ${streak} дней сегодня`,
          `⚡ ${streak} дней подряд — не упусти ритм, заходи`,
          `💪 Защити серию ${streak} дней — один раунд`,
          `🎯 Серия из ${streak} дней ждёт тебя сегодня!`,
        ]),
        uk: _ps([
          `🔥 Продовж серію ${streak} днів сьогодні`,
          `⚡ ${streak} днів поспіль — не втрать ритм, заходь`,
          `💪 Захисти серію ${streak} днів — один раунд`,
          `🎯 Серія з ${streak} днів чекає тебе сьогодні!`,
        ]),
        es: _ps([
          `🔥 Racha de ${streak} días en la cuerda floja`,
          `⚠️ ${streak} días seguidos: reacciona hoy`,
          `😤 No abandones una serie de ${streak} días`,
          `🎯 Tu racha ${streak} te espera en la app`,
        ]), en: _ps([`🔥 Continue your ${streak}-day streak today`, `⚡ ${streak} days in a row — don’t lose the rhythm, come in`, `💪 Protect your ${streak}-day streak — one round`, `🎯 Your ${streak}-day streak is waiting today!`]),
        'pt-BR': _ps([
          `🔥 Sua sequência de ${streak} dias está por um fio`,
          `⚠️ ${streak} dias seguidos: aja hoje`,
          `😤 Não entregue uma série de ${streak} dias`,
          `🎯 Sua sequência de ${streak} dias espera por você`,
        ]),
        vi: _ps([
          `🔥 Chuỗi ${streak} ngày của bạn đang mong manh`,
          `⚠️ ${streak} ngày liên tiếp: hành động hôm nay`,
          `😤 Đừng bỏ chuỗi ${streak} ngày`,
          `🎯 Chuỗi ${streak} ngày đang chờ bạn trong app`,
        ]),
        id: _ps([
          `🔥 Streak ${streak} harimu di ujung tanduk`,
          `⚠️ ${streak} hari berturut-turut: bertindak hari ini`,
          `😤 Jangan menyerah pada seri ${streak} hari`,
          `🎯 Streak ${streak} harimu menunggu di aplikasi`,
        ]),
        tr: _ps([
          `🔥 ${streak} günlük serin pamuk ipliğine bağlı`,
          `⚠️ ${streak} gün üst üste: bugün harekete geç`,
          `😤 ${streak} günlük seriyi bırakma`,
          `🎯 ${streak} günlük seri uygulamada seni bekliyor`,
        ]),
        pl: _ps([
          `🔥 Twoja seria ${streak} dni wisi na włosku`,
          `⚠️ ${streak} dni z rzędu: zareaguj dziś`,
          `😤 Nie oddawaj serii ${streak} dni`,
          `🎯 Seria ${streak} dni czeka na ciebie w aplikacji`,
        ]),
      }));
      body = pickNotif(lang, notificationCopy({
        ru: _ps([
          `Сохрани накопленное! Один раунд — и всё с тобой.`,
          `7+ дней усилий — продолжи сегодня!`,
          `Твоя серия заслуживает продолжения. Один раунд — и ты молодец! ⭐`,
          `Зайди на 5 минут — и серия жива!`,
        ]),
        uk: _ps([
          `Збережи накопичене! Один раунд — і все з тобою.`,
          `7+ днів зусиль — продовж сьогодні!`,
          `Твоя серія заслуговує продовження. Один раунд — і ти молодець! ⭐`,
          `Зайди на 5 хвилин — і серія жива!`,
        ]),
        es: _ps([
          `No pierdas lo ganado: una lección lo fija.`,
          `Llevas más de una semana firme — no frenes ahora.`,
          `Tu constancia vale oro; un repaso rápido basta ⭐`,
          `Cinco minutos y la racha sigue contigo.`,
        ]), en: _ps([`Save what you’ve built! One round — and it all stays with you.`, `7+ days of effort — continue today!`, `Your streak deserves to continue. One round — and you’re a star! ⭐`, `Drop in for 5 minutes — and the streak lives!`]),
        'pt-BR': _ps([
          `Não perca o que já conquistou: uma lição mantém tudo.`,
          `Mais de uma semana de esforço — não pare agora.`,
          `Sua constância vale ouro; uma revisão rápida basta ⭐`,
          `Cinco minutos e a sequência continua com você.`,
        ]),
        vi: _ps([
          `Đừng mất những gì đã tích lũy: một bài học giữ lại tất cả.`,
          `Hơn một tuần cố gắng rồi — đừng dừng bây giờ.`,
          `Sự đều đặn của bạn rất đáng giá; ôn nhanh là đủ ⭐`,
          `Năm phút thôi, chuỗi vẫn đi cùng bạn.`,
        ]),
        id: _ps([
          `Jangan hilangkan yang sudah kamu kumpulkan: satu pelajaran cukup.`,
          `Lebih dari seminggu usaha — jangan berhenti sekarang.`,
          `Konsistensimu berharga; review singkat cukup ⭐`,
          `Lima menit dan streak tetap bersamamu.`,
        ]),
        tr: _ps([
          `Kazandığını kaybetme: bir ders yeter.`,
          `Bir haftadan fazla emek verdin — şimdi durma.`,
          `İstikrarın değerli; kısa bir tekrar yeter ⭐`,
          `Beş dakika ve seri seninle kalır.`,
        ]),
        pl: _ps([
          `Nie trać tego, co już zbudowano: jedna lekcja wystarczy.`,
          `Ponad tydzień pracy — nie zatrzymuj się teraz.`,
          `Twoja regularność jest cenna; krótka powtórka wystarczy ⭐`,
          `Pięć minut i seria zostaje z tobą.`,
        ]),
      }));
    } else {
      title = pickNotif(lang, notificationCopy({
        ru: _ps([
          `🔥 Серия ${streak} дней растёт — продолжи сегодня!`,
          `💪 ${streak} дней подряд — так держать!`,
          `📚 Один раунд — и серия растёт!`,
          `⚡ Зайди на 5 минут — серия жива!`,
        ]),
        uk: _ps([
          `🔥 Серія ${streak} днів росте — продовж сьогодні!`,
          `💪 ${streak} дні поспіль — так тримати!`,
          `📚 Один раунд — і серія росте!`,
          `⚡ Зайди на 5 хвилин — серія жива!`,
        ]),
        es: _ps([
          `🔥 ${streak} días de racha: no la cortes hoy`,
          `💪 ${streak} días seguidos y sumando`,
          `📚 Una lección bastará para guardarla`,
          `⚡ No dejes pasar tu sesión de hoy`,
        ]), en: _ps([`🔥 Your ${streak}-day streak is growing — continue today!`, `💪 ${streak} days in a row — keep it up!`, `📚 One round — and the streak grows!`, `⚡ Drop in for 5 minutes — the streak lives!`]),
        'pt-BR': _ps([
          `🔥 Sequência de ${streak} dias: não corte hoje`,
          `💪 ${streak} dias seguidos e contando`,
          `📚 Uma lição basta para manter tudo`,
          `⚡ Não deixe a sessão de hoje passar`,
        ]),
        vi: _ps([
          `🔥 Chuỗi ${streak} ngày: đừng ngắt hôm nay`,
          `💪 ${streak} ngày liên tiếp và vẫn tiếp tục`,
          `📚 Một bài học là giữ được chuỗi`,
          `⚡ Đừng bỏ lỡ buổi học hôm nay`,
        ]),
        id: _ps([
          `🔥 Streak ${streak} hari: jangan putus hari ini`,
          `💪 ${streak} hari berturut-turut dan terus naik`,
          `📚 Satu pelajaran cukup untuk menjaganya`,
          `⚡ Jangan lewatkan sesi hari ini`,
        ]),
        tr: _ps([
          `🔥 ${streak} günlük seri: bugün bozma`,
          `💪 ${streak} gün üst üste ve devamı geliyor`,
          `📚 Bir ders seriyi korumaya yeter`,
          `⚡ Bugünkü oturumu kaçırma`,
        ]),
        pl: _ps([
          `🔥 Seria ${streak} dni: nie przerywaj jej dziś`,
          `💪 ${streak} dni z rzędu i dalej rośnie`,
          `📚 Jedna lekcja wystarczy, by ją utrzymać`,
          `⚡ Nie przegap dzisiejszej sesji`,
        ]),
      }));
      body = pickNotif(lang, notificationCopy({
        ru: _ps([
          `Ещё есть время! Один раунд — и серия растёт.`,
          `Начни — и уже через 5 минут серия станет длиннее!`,
          `Маленький шаг сегодня — большой результат завтра.`,
          `Закрепи привычку — зайди и сделай короткий раунд!`,
        ]),
        uk: _ps([
          `Ще є час! Один раунд — і серія росте.`,
          `Почни — і вже за 5 хвилин серія стане довшою!`,
          `Маленький крок сьогодні — великий результат завтра.`,
          `Закріпи звичку — зайди і зроби короткий раунд!`,
        ]),
        es: _ps([
          `Aún queda margen; una clase la mantiene viva.`,
          `Empieza y en cinco minutos habrás cerrado el día.`,
          `Pequeño esfuerzo hoy, gran fluidez mañana.`,
          `No rompas la costumbre: entra y entrena.`,
        ]), en: _ps([`There’s still time! One round — and the streak grows.`, `Start — and in just 5 minutes the streak will be longer!`, `A small step today — a big result tomorrow.`, `Lock in the habit — drop in and do a short round!`]),
        'pt-BR': _ps([
          `Ainda dá tempo. Uma lição mantém a sequência.`,
          `Comece agora e em cinco minutos o dia estará fechado.`,
          `Pequeno passo hoje, grande resultado amanhã.`,
          `Não deixe o hábito quebrar: entre e faça uma lição.`,
        ]),
        vi: _ps([
          `Vẫn còn thời gian. Một bài học giữ được chuỗi.`,
          `Bắt đầu đi, năm phút nữa là bạn đã hoàn thành hôm nay.`,
          `Bước nhỏ hôm nay, kết quả lớn ngày mai.`,
          `Đừng để thói quen gãy: vào app và học một bài.`,
        ]),
        id: _ps([
          `Masih ada waktu. Satu pelajaran menjaga streak.`,
          `Mulai sekarang, lima menit lagi harimu selesai.`,
          `Langkah kecil hari ini, hasil besar besok.`,
          `Jangan biarkan kebiasaan putus: buka dan kerjakan satu pelajaran.`,
        ]),
        tr: _ps([
          `Hâlâ zaman var. Bir ders seriyi korur.`,
          `Başla; beş dakika içinde günü tamamlamış olursun.`,
          `Bugün küçük adım, yarın büyük sonuç.`,
          `Alışkanlığın kırılmasına izin verme: gir ve bir ders yap.`,
        ]),
        pl: _ps([
          `Wciąż jest czas. Jedna lekcja utrzyma serię.`,
          `Zacznij, a za pięć minut dzień będzie zamknięty.`,
          `Mały krok dziś, duży efekt jutro.`,
          `Nie pozwól przerwać nawyku: wejdź i zrób lekcję.`,
        ]),
      }));
    }

    await cancelScheduledNotificationsByType(N, ['streak_warning']);
    const warningId = await N.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: false,
        data: { type: 'streak_warning' },
      },
      trigger: triggerInterval(secondsUntil),
    });

    await AsyncStorage.setItem('streak_warning_scheduled', today);
    await AsyncStorage.setItem(STREAK_WARNING_NOTIF_ID_KEY, warningId);
  } catch (e) {
    if (__DEV__) console.warn('[notifications]', e);
  }
};

// ── Energy Full уведомление ───────────────────────────────────────────────────
// Привязано к СОБЫТИЮ траты энергии (EnergyContext.spendOne / spendAmount).
// Когда энергия опускается ниже максимума — планируем локальный пуш на точный
// момент полного восстановления. При следующей трате/премиуме/максимуме —
// перепланируем или отменяем. Это закрывает самую прямую петлю возврата
// во freemium: «энергия восстановилась — заходи продолжать».
//
// Тихие часы 23:00–08:00 (локально): если момент полного восстановления
// попадает в ночь, сдвигаем пуш на ближайшее 08:00, чтобы не будить.

const ENERGY_FULL_QUIET_START_HOUR = 23; // включительно
const ENERGY_FULL_QUIET_END_HOUR = 8;    // до 08:00

/** Возвращает momentMs, сдвинутый из тихих часов (23:00–08:00) на ближайшее 08:00. */
export function shiftEnergyMomentOutOfQuietHours(momentMs: number): number {
  const at = new Date(momentMs);
  const hour = at.getHours();
  const inQuiet = hour >= ENERGY_FULL_QUIET_START_HOUR || hour < ENERGY_FULL_QUIET_END_HOUR;
  if (!inQuiet) return momentMs;

  const wake = new Date(momentMs);
  // Если уже после полуночи (0–7ч) — пробуждение сегодня в 08:00,
  // если поздний вечер (23ч) — пробуждение завтра в 08:00.
  if (hour >= ENERGY_FULL_QUIET_START_HOUR) {
    wake.setDate(wake.getDate() + 1);
  }
  wake.setHours(ENERGY_FULL_QUIET_END_HOUR, 0, 0, 0);
  return wake.getTime();
}

/**
 * Отменить запланированный пуш о восстановлении энергии.
 * Вызывается, когда энергия снова на максимуме (или включился премиум/безлимит).
 */
export const cancelEnergyFullNotification = async (): Promise<void> => {
  try {
    const N = await getNotifications();
    if (!N) return;
    await cancelScheduledNotificationsByType(N, ['energy_full']);
    const prevId = await AsyncStorage.getItem(ENERGY_FULL_NOTIF_ID_KEY);
    if (prevId) await N.cancelScheduledNotificationAsync(prevId).catch(swallowError('notifications:cancelEnergyFullNotification'));
    await AsyncStorage.removeItem(ENERGY_FULL_NOTIF_ID_KEY);
  } catch (e) {
    if (__DEV__) console.warn('[notifications]', e);
  }
};

/**
 * Запланировать локальный пуш на момент полного восстановления энергии.
 * @param secondsUntilFull — секунд до момента, когда энергия достигнет максимума.
 *   Вычисляется вызывающей стороной (EnergyContext) по точному recovery interval.
 * @param lang — язык интерфейса для локализованного текста.
 *
 * Идемпотентна: каждый вызов сначала отменяет предыдущий energy_full пуш,
 * затем планирует новый. Безопасно дёргать на каждую трату энергии.
 */
export const scheduleEnergyFullNotification = async (
  secondsUntilFull: number,
  lang: Lang = 'ru',
): Promise<void> => {
  try {
    const N = await getNotifications();
    if (!N) return;
    // Не запрашиваем разрешение здесь (трата энергии — не место для prompt'а);
    // планируем только если разрешение уже выдано.
    const hasPermission = await canUseNotifications(false);
    if (!hasPermission) {
      // Разрешения нет — на всякий случай вычистим старый пуш и выйдем.
      await cancelEnergyFullNotification();
      return;
    }
    if (!(await isNotifCategoryEnabled('energy'))) {
      await cancelEnergyFullNotification();
      return;
    }

    // Энергия уже полная или некорректный ввод — ничего не планируем.
    if (!Number.isFinite(secondsUntilFull) || secondsUntilFull <= 0) {
      await cancelEnergyFullNotification();
      return;
    }

    const now = Date.now();
    const rawMomentMs = now + secondsUntilFull * 1000;
    const momentMs = shiftEnergyMomentOutOfQuietHours(rawMomentMs);
    const secondsUntil = Math.max(1, Math.floor((momentMs - now) / 1000));

    const _pe = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
    const title = pickNotif(lang, notificationCopy({
      ru: _pe(['⚡ Энергия восстановлена!', '⚡ Полный заряд!', '🔋 Энергия снова полная']),
      uk: _pe(['⚡ Енергію відновлено!', '⚡ Повний заряд!', '🔋 Енергія знову повна']),
      es: _pe(['⚡ ¡Energía recargada!', '⚡ ¡Carga completa!', '🔋 Tu energía está al máximo']), en: _pe(['⚡ Energy restored!', '⚡ Fully charged!', '🔋 Energy is full again']),
      'pt-BR': _pe(['⚡ Energia recarregada!', '⚡ Carga completa!', '🔋 Sua energia está cheia']),
      vi: _pe(['⚡ Năng lượng đã hồi đầy!', '⚡ Đầy năng lượng!', '🔋 Năng lượng đã đầy lại']),
      id: _pe(['⚡ Energi pulih penuh!', '⚡ Penuh lagi!', '🔋 Energimu sudah penuh']),
      tr: _pe(['⚡ Enerji doldu!', '⚡ Tam şarj!', '🔋 Enerjin yeniden dolu']),
      pl: _pe(['⚡ Energia odnowiona!', '⚡ Pełne naładowanie!', '🔋 Energia znów pełna']),
    }));
    const body = pickNotif(lang, notificationCopy({
      ru: _pe(['Заходи и продолжи — самое время для урока.', 'Заряд полон. Один урок — и день засчитан.', 'Энергия ждёт. Продолжим практику?']),
      uk: _pe(['Заходь і продовжуй — саме час для уроку.', 'Заряд повний. Один урок — і день зараховано.', 'Енергія чекає. Продовжимо практику?']),
      es: _pe(['Entra y continúa: es buen momento para una clase.', 'Carga completa. Una clase y cierras el día.', 'Tu energía espera. ¿Seguimos practicando?']), en: _pe(['Come in and continue — it’s the perfect time for a lesson.', 'Fully charged. One lesson — and the day counts.', 'Energy is waiting. Shall we practice?']),
      'pt-BR': _pe(['Entre e continue: hora perfeita para uma lição.', 'Carga cheia. Uma lição e o dia está fechado.', 'Sua energia espera. Vamos praticar?']),
      vi: _pe(['Vào học tiếp nào — thời điểm hoàn hảo cho một bài.', 'Đầy năng lượng. Một bài là xong ngày hôm nay.', 'Năng lượng đang chờ. Luyện tập tiếp chứ?']),
      id: _pe(['Masuk dan lanjut — waktu pas untuk satu pelajaran.', 'Energi penuh. Satu pelajaran, harimu beres.', 'Energimu menunggu. Lanjut latihan?']),
      tr: _pe(['Gir ve devam et — bir ders için tam zamanı.', 'Şarj dolu. Bir ders ve gün tamam.', 'Enerjin hazır. Pratiğe devam?']),
      pl: _pe(['Wejdź i kontynuuj — idealny moment na lekcję.', 'Pełna energia. Jedna lekcja i dzień zaliczony.', 'Energia czeka. Ćwiczymy dalej?']),
    }));

    await cancelScheduledNotificationsByType(N, ['energy_full']);
    const prevId = await AsyncStorage.getItem(ENERGY_FULL_NOTIF_ID_KEY);
    if (prevId) await N.cancelScheduledNotificationAsync(prevId).catch(swallowError('notifications:scheduleEnergyFullNotification'));

    const energyId = await N.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: false,
        data: { type: 'energy_full' },
      },
      trigger: triggerInterval(secondsUntil),
    });

    await AsyncStorage.setItem(ENERGY_FULL_NOTIF_ID_KEY, energyId);
  } catch (e) {
    if (__DEV__) console.warn('[notifications]', e);
  }
};

// ── Weekly Recap уведомление ──────────────────────────────────────────────────
// Планируется на ближайшее воскресенье в 20:10
// Содержимое персонализируется по текущим данным в AsyncStorage
let weeklyRecapScheduleLock: Promise<void> = Promise.resolve();

const scheduleWeeklyRecapNotificationUnlocked = async (
  lang: Lang = 'ru',
  opts: NotificationTargetOpts = {}
): Promise<void> => {
  try {
    const N = await getNotifications();
    if (!N) return;
    const hasPermission = await canUseNotifications(opts.requestPermission ?? true);
    if (!hasPermission) return;
    if (!(await isNotifCategoryEnabled('weekly_recap'))) {
      await cancelScheduledNotificationsByType(N, ['weekly_recap']);
      return;
    }

    const now = new Date();
    const { streak } = await readWeeklyRecapStatsForNotification();
    const nextSunday = getNextWeeklyRecapTime(now);
    const secondsUntil = Math.max(1, Math.floor((nextSunday.getTime() - now.getTime()) / 1000));

    const _pw = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
    const title = pickNotif(lang, notificationCopy({
      ru: _pw(['📊 Итоги недели', '🏆 Твоя неделя в цифрах', '🔥 Как прошла твоя неделя?', '⭐ Еженедельный отчёт готов!']),
      uk: _pw(['📊 Підсумок тижня', '🏆 Твій тиждень у цифрах', '🔥 Як пройшов твій тиждень?', '⭐ Тижневий звіт готовий!']),
      es: _pw(['📊 Resumen semanal', '🏆 Tu semana en datos', '🔥 ¿Cómo te fue?', '⭐ ¡Listo tu informe semanal!']), en: _pw(['📊 Your week in review', '🏆 Your week in numbers', '🔥 How was your week?', '⭐ Your weekly report is ready!']),
      'pt-BR': _pw(['📊 Resumo da semana', '🏆 Sua semana em números', '🔥 Como foi sua semana?', '⭐ Seu relatório semanal está pronto!']),
      vi: _pw(['📊 Tổng kết tuần', '🏆 Tuần của bạn qua số liệu', '🔥 Tuần này của bạn thế nào?', '⭐ Báo cáo tuần đã sẵn sàng!']),
      id: _pw(['📊 Ringkasan mingguan', '🏆 Minggumu dalam angka', '🔥 Bagaimana minggu ini?', '⭐ Laporan mingguan siap!']),
      tr: _pw(['📊 Haftalık özet', '🏆 Haftan rakamlarla', '🔥 Haftan nasıl geçti?', '⭐ Haftalık rapor hazır!']),
      pl: _pw(['📊 Podsumowanie tygodnia', '🏆 Twój tydzień w liczbach', '🔥 Jak minął tydzień?', '⭐ Raport tygodniowy gotowy!']),
    }));
    const body = pickNotif(lang, notificationCopy({
      ru: `Твоя цепочка: ${streak} дней Продолжай учиться в своём ритме!`,
      uk: `Твій стрік: ${streak} днів Продовжуй навчатися у своєму ритмі!`,
      es: `Tu racha: ${streak} días ¡Sigue aprendiendo a tu ritmo!`, en: `Your streak: ${streak} ${streak === 1 ? 'day' : 'days'}. Keep learning at your own pace!`,
      'pt-BR': `Sua sequência: ${streak} dias Continue aprendendo no seu ritmo!`,
      vi: `Chuỗi của bạn: ${streak} ngày Hãy tiếp tục học theo nhịp của bạn!`,
      id: `Streak kamu: ${streak} hari Terus belajar dengan ritmemu!`,
      tr: `Serin: ${streak} gün Kendi ritminde öğrenmeye devam et!`,
      pl: `Twoja seria: ${streak} dni Ucz się dalej we własnym rytmie!`,
    }));

    await cancelScheduledNotificationsByType(N, ['weekly_recap']);
    const prevWeeklyId = await AsyncStorage.getItem(WEEKLY_RECAP_NOTIF_ID_KEY);
    if (prevWeeklyId) await N.cancelScheduledNotificationAsync(prevWeeklyId).catch(swallowError('notifications:scheduleWeeklyRecapNotificationUnlocked'));

    const weeklyId = await N.scheduleNotificationAsync({
      content: { title, body, sound: false, data: { type: 'weekly_recap' } },
      trigger: triggerInterval(secondsUntil),
    });

    await AsyncStorage.setItem(WEEKLY_RECAP_NOTIF_ID_KEY, weeklyId);
    await AsyncStorage.setItem('weekly_recap_scheduled', nextSunday.toISOString().split('T')[0]);
  } catch (e) {
    if (__DEV__) console.warn('[notifications]', e);
  }
};

export const scheduleWeeklyRecapNotification = (
  lang: Lang = 'ru',
  opts: NotificationTargetOpts = {},
): Promise<void> => {
  const next = weeklyRecapScheduleLock.then(() => scheduleWeeklyRecapNotificationUnlocked(lang, opts));
  weeklyRecapScheduleLock = next.catch(swallowError('notifications:scheduleWeeklyRecapNotification'));
  return next;
};

let weeklyRecapRefreshTimer: ReturnType<typeof setTimeout> | null = null;

export function refreshWeeklyRecapNotification(langHint?: Lang): void {
  if (weeklyRecapRefreshTimer) clearTimeout(weeklyRecapRefreshTimer);
  weeklyRecapRefreshTimer = setTimeout(() => {
    weeklyRecapRefreshTimer = null;
    void (async () => {
      const enabled = await AsyncStorage.getItem('notifications_enabled').catch((error: unknown) => { reportSwallowed('notifications:refreshWeeklyRecapNotification', error); return null; });
      if (enabled !== 'true') return;
      const storedLang = langHint ?? (await AsyncStorage.getItem('app_lang').catch((error: unknown) => { reportSwallowed('notifications:refreshWeeklyRecapNotification', error); return null; }));
      const lang = normalizeNotificationLang(storedLang);
      await scheduleWeeklyRecapNotification(lang, { requestPermission: false });
    })().catch(swallowError('notifications:refreshWeeklyRecapNotification'));
  }, 1500);
}

// ── Monthly Recap уведомление ─────────────────────────────────────────────────
// Планируется на 1-е следующего месяца в 10:00
export const scheduleMonthlyRecapNotification = async (
  lang: Lang = 'ru',
  opts: NotificationTargetOpts = {}
): Promise<void> => {
  try {
    const N = await getNotifications();
    if (!N) return;
    const hasPermission = await canUseNotifications(opts.requestPermission ?? true);
    if (!hasPermission) return;
    if (!(await isNotifCategoryEnabled('monthly_recap'))) {
      await cancelScheduledNotificationsByType(N, ['monthly_recap']);
      return;
    }

    const studyTarget = await resolveNotificationStudyTarget(lang, opts.studyTarget);
    const [streakRaw, lessons] = await Promise.all([
      AsyncStorage.getItem('streak_count'),
      countCompletedLessonsFromStorage(studyTarget),
    ]);
    const streak = parseInt(streakRaw || '0') || 0;

    // Первое число следующего месяца в 10:00
    const now = new Date();
    const firstNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 10, 0, 0, 0);
    const secondsUntil = Math.max(1, Math.floor((firstNextMonth.getTime() - now.getTime()) / 1000));

    const title = pickNotif(lang, notificationCopy({
      ru: '🏆 Твой месяц в цифрах',
      uk: '🏆 Твій місяць у цифрах',
      es: '🏆 Tu mes en cifras', en: '🏆 Your month in numbers',
      'pt-BR': '🏆 Seu mês em números',
      vi: '🏆 Tháng của bạn qua số liệu',
      id: '🏆 Bulanmu dalam angka',
      tr: '🏆 Ayın rakamlarla',
      pl: '🏆 Twój miesiąc w liczbach',
    }));
    const body = pickNotif(lang, notificationCopy({
      ru: `Уроков: ${lessons} · Цепочка: ${streak}`,
      uk: `Уроків: ${lessons} · Стрік: ${streak}`,
      es: `Lecciones: ${lessons} · Racha: ${streak}`, en: `Lessons: ${lessons} · Streak: ${streak}`,
      'pt-BR': `Lições: ${lessons} · Sequência: ${streak}`,
      vi: `Bài học: ${lessons} · Chuỗi: ${streak}`,
      id: `Pelajaran: ${lessons} · Streak: ${streak}`,
      tr: `Ders: ${lessons} · Seri: ${streak}`,
      pl: `Lekcje: ${lessons} · Seria: ${streak}`,
    }));

    await cancelScheduledNotificationsByType(N, ['monthly_recap']);
    const prevMonthlyId = await AsyncStorage.getItem(MONTHLY_RECAP_NOTIF_ID_KEY);
    if (prevMonthlyId) await N.cancelScheduledNotificationAsync(prevMonthlyId).catch(swallowError('notifications:scheduleMonthlyRecapNotification'));

    const monthlyId = await N.scheduleNotificationAsync({
      content: { title, body, sound: false, data: { type: 'monthly_recap' } },
      trigger: triggerInterval(secondsUntil),
    });

    await AsyncStorage.setItem(MONTHLY_RECAP_NOTIF_ID_KEY, monthlyId);
    await AsyncStorage.setItem('monthly_recap_scheduled', firstNextMonth.toISOString().split('T')[0]);
  } catch (e) {
    if (__DEV__) console.warn('[notifications]', e);
  }
};

// ── Загрузка настроек ─────────────────────────────────────────────────────────
export const loadNotificationSettings = async (): Promise<{
  enabled: boolean;
  hour: number;
  minute: number;
}> => {
  try {
    const [enabled, hour, minute] = await Promise.all([
      AsyncStorage.getItem('notifications_enabled'),
      AsyncStorage.getItem('notification_hour'),
      AsyncStorage.getItem('notification_minute'),
    ]);
    return {
      enabled: enabled === 'true',
      hour:    parseInt(hour   || '19'),
      minute:  parseInt(minute || '0'),
    };
  } catch {
    return { enabled: false, hour: 19, minute: 0 };
  }
};

// ── Ежедневная фраза в 7:00 утра ───────────────────────────────────────────────
// Планируется при старте приложения. Показывает случайную фразу на английском и русском.
export const schedulePhraseOfDayNotification = async (
  lang: Lang = 'ru',
  opts: NotificationTargetOpts = {}
): Promise<void> => {
  try {
    const N = await getNotifications();
    if (!N) return;
    const studyTarget = await resolveNotificationStudyTarget(lang, opts.studyTarget);
    if (storageStudyTarget(studyTarget) === 'fr') {
      await cancelScheduledNotificationsByType(N, ['phrase_of_day']);
      const prevPhraseId = await AsyncStorage.getItem(PHRASE_OF_DAY_NOTIF_ID_KEY);
      if (prevPhraseId) await N.cancelScheduledNotificationAsync(prevPhraseId).catch(swallowError('notifications:schedulePhraseOfDayNotification'));
      await AsyncStorage.removeItem('phrase_notif_scheduled');
      await AsyncStorage.removeItem(PHRASE_OF_DAY_NOTIF_ID_KEY);
      return;
    }
    const hasPermission = await canUseNotifications(opts.requestPermission ?? true);
    if (!hasPermission) return;
    if (!(await isNotifCategoryEnabled('phrase_of_day'))) {
      await cancelScheduledNotificationsByType(N, ['phrase_of_day']);
      const stalePhraseId = await AsyncStorage.getItem(PHRASE_OF_DAY_NOTIF_ID_KEY);
      if (stalePhraseId) await N.cancelScheduledNotificationAsync(stalePhraseId).catch(swallowError('notifications:schedulePhraseOfDayNotification'));
      await AsyncStorage.multiRemove(['phrase_notif_scheduled', PHRASE_OF_DAY_NOTIF_ID_KEY]);
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    // Получить фразу дня
    const phrase = await getTodayPhraseForTarget(studyTarget);
    if (!phrase) return;

    // Используем ежедневный повторяющийся триггер — не слетает после перезагрузки
    // телефона и не требует, чтобы пользователь открывал приложение каждый день.

    // зачем (D188-следствие, владелец 14.10 «У НАС ЖЕ НЕ ТОЛЬКО АНГЛИЙСКИЙ»): фраза дня приходит на языке изучения — и подпись
    // называет ЕГО, а не «English». Где падеж не подставить (uk винительный, tr притяжательный) — нейтрально.
    const studyWord = studyLanguageWord(lang, studyTarget, 'name');
    const studyGen = studyLanguageWord(lang, studyTarget, 'gen');
    const TEASERS_RU = [
      `"${phrase.english}" — знаешь что это значит?`,
      `"${phrase.english}" — открой приложение, чтобы узнать смысл.`,
      `"${phrase.english}" — natives говорят так каждый день. А ты знаешь зачем?`,
      `"${phrase.english}" — это не то, что ты думаешь.`,
      `"${phrase.english}" — одна фраза, которая изменит твой ${studyWord}.`,
    ];
    const TEASERS_UK = [
      `"${phrase.english}" — знаєш що це означає?`,
      `"${phrase.english}" — відкрий додаток, щоб дізнатись зміст.`,
      `"${phrase.english}" — natives кажуть так щодня. А ти знаєш навіщо?`,
      `"${phrase.english}" — це не те, що ти думаєш.`,
      `"${phrase.english}" — один вислів, що підніме твій рівень.`,
    ];
    const TEASERS_ES = [
      `"${phrase.english}" — ¿sabes qué significa?`,
      `"${phrase.english}" — abre la app y descubre el sentido.`,
      `"${phrase.english}" — los nativos lo dicen así a diario ¿tú ya sabes por qué?`,
      `"${phrase.english}" — no es lo que imaginas.`,
      `"${phrase.english}" — una sola frase para subir de nivel en ${studyWord}.`,
    ];
    const TEASERS_PT_BR = [
      `"${phrase.english}" — você sabe o que significa?`,
      `"${phrase.english}" — abra o app para descobrir o sentido.`,
      `"${phrase.english}" — nativos usam isso todo dia. Você sabe por quê?`,
      `"${phrase.english}" — não é bem o que parece.`,
      `"${phrase.english}" — uma frase para subir o nível do seu ${studyWord}.`,
    ];
    const TEASERS_VI = [
      `"${phrase.english}" — bạn biết nghĩa là gì không?`,
      `"${phrase.english}" — mở app để xem ý nghĩa.`,
      `"${phrase.english}" — người bản xứ nói vậy hằng ngày. Bạn biết vì sao chưa?`,
      `"${phrase.english}" — không hẳn như bạn nghĩ đâu.`,
      `"${phrase.english}" — một cụm từ giúp ${studyWord} của bạn lên cấp.`,
    ];
    const TEASERS_ID = [
      `"${phrase.english}" — tahu artinya?`,
      `"${phrase.english}" — buka aplikasi untuk melihat maknanya.`,
      `"${phrase.english}" — native speaker memakainya setiap hari. Kamu tahu kenapa?`,
      `"${phrase.english}" — bukan seperti yang kamu kira.`,
      `"${phrase.english}" — satu frasa untuk menaikkan level ${studyWord}mu.`,
    ];
    const TEASERS_TR = [
      `"${phrase.english}" — ne anlama geldiğini biliyor musun?`,
      `"${phrase.english}" — anlamını görmek için uygulamayı aç.`,
      `"${phrase.english}" — native speaker'lar bunu her gün söyler. Nedenini biliyor musun?`,
      `"${phrase.english}" — düşündüğün şey olmayabilir.`,
      `"${phrase.english}" — seviyeni bir basamak yükseltecek tek ifade.`,
    ];
    const TEASERS_PL = [
      `"${phrase.english}" — wiesz, co to znaczy?`,
      `"${phrase.english}" — otwórz aplikację i sprawdź sens.`,
      `"${phrase.english}" — native speakerzy mówią tak codziennie. Wiesz dlaczego?`,
      `"${phrase.english}" — to nie całkiem to, co myślisz.`,
      `"${phrase.english}" — jeden zwrot, który podnosi poziom ${studyGen}.`,
    ];
    const TEASERS_EN = [
      `"${phrase.english}" — do you know what it means?`,
      `"${phrase.english}" — open the app to find out the meaning.`,
      `"${phrase.english}" — natives say this every day. Do you know why?`,
      `"${phrase.english}" — it’s not what you think.`,
      `"${phrase.english}" — one phrase that will level up your ${studyWord}.`,
    ];
    const teasers = pickNotif(lang, notificationCopy({
      ru: TEASERS_RU,
      uk: TEASERS_UK,
      es: TEASERS_ES, en: TEASERS_EN,
      'pt-BR': TEASERS_PT_BR,
      vi: TEASERS_VI,
      id: TEASERS_ID,
      tr: TEASERS_TR,
      pl: TEASERS_PL,
    }));
    const teaserIdx = getDayIndex() % teasers.length;
    const title = pickNotif(lang, notificationCopy({
      ru: '☀️ Фраза дня',
      uk: '☀️ Вислів дня',
      es: '☀️ Frase del día', en: '☀️ Phrase of the day',
      'pt-BR': '☀️ Frase do dia',
      vi: '☀️ Cụm từ hôm nay',
      id: '☀️ Frasa hari ini',
      tr: '☀️ Günün ifadesi',
      pl: '☀️ Zwrot dnia',
    }));
    const body = teasers[teaserIdx];

    await cancelScheduledNotificationsByType(N, ['phrase_of_day']);
    const prevPhraseId = await AsyncStorage.getItem(PHRASE_OF_DAY_NOTIF_ID_KEY);
    if (prevPhraseId) await N.cancelScheduledNotificationAsync(prevPhraseId).catch(swallowError('notifications:schedulePhraseOfDayNotification'));

    const phraseId = await N.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: false,
        data: { type: 'phrase_of_day', phraseId: phrase.english },
      },
      trigger: triggerDaily(7, 0),
    });

    await AsyncStorage.setItem('phrase_notif_scheduled', today);
    await AsyncStorage.setItem(PHRASE_OF_DAY_NOTIF_ID_KEY, phraseId);
  } catch (e) {
    if (__DEV__) console.warn('[notifications]', e);
  }
};

// ── Обработчик тапа по уведомлению (deep link) ───────────────────────────────
// Вызывать один раз при старте приложения из _layout.tsx
// router — объект от useRouter() или expo-router
export const setupNotificationTapHandler = (
  router: { push: (route: any) => void; replace?: (route: any) => void }
): (() => void) => {
  const lifetime = createDisposableAdoption();
  // Тап по пушу на ХОЛОДНОМ старте прилетает до монтирования Root Layout —
  // прямой router.push/replace здесь крэшил приложение классом
  // «Attempted to navigate before mounting the Root Layout» (билд 1.5.50).
  // Каждая навигация обязана идти через scheduleAfterRootNavigationReady.
  const scheduleNav = (navigate: () => void) => {
    scheduleAfterRootNavigationReady(navigate);
  };
  const navTabHome = () => {
    scheduleNav(() => {
      if (typeof router.replace === 'function') {
        router.replace('/(tabs)/home');
        return;
      }
      router.push('/(tabs)/home');
    });
  };
  let subscription: any = null;
  getNotifications().then(N => {
    if (!N || lifetime.isDisposed()) return;
    subscription = N.addNotificationResponseReceivedListener((response: any) => {
      if (lifetime.isDisposed()) return;
      const data = response?.notification?.request?.content?.data;
      if (!data?.type) return;
      switch (data.type) {
        case 'youtube_premiere':
          scheduleNav(() => {
            router.push({
              pathname: '/lingman_videos',
              params: { videoId: String(data.videoId), channelId: String(data.channelId) },
            } as any);
          });
          break;
        case 'streak_warning':
        case 'reminder':
        case 'd1_reminder':
        case 'premium':
        case 'phrase_of_day':
        case 'weekly_recap':
        case 'monthly_recap':
          navTabHome();
          break;
        case 'streak_at_risk':
        case 'inactive_return':
        case 'inactive_long':
          scheduleNav(() => {
            if (typeof router.replace === 'function') {
              router.replace('/lessons_list' as any);
            } else {
              router.push('/lessons_list' as any);
            }
          });
          break;
        case 'intro_expiring':
        case 'upsell_d4':
        case 'upsell_d7':
        case 'upsell_d14':
          scheduleNav(() => {
            router.push({ pathname: '/premium_modal', params: { context: 'notification_upsell', source: 'notification_upsell' } } as any);
          });
          break;
        case 'gift_expiring':
          // Level gifts are retired; expiring-gift notifications have no destination.
          break;
        case 'arena_friend_invite':
        case 'arena_friend_accepted':
        case 'arena_friend_declined':
        case 'arena_friend_cancelled':
        case 'arena_friend_expired':
          // зачем: D83 — клиентская Арена удалена; тап по старому уведомлению
          // дуэли ведёт на Главную, а не в несуществующий маршрут.
          if (__DEV__) console.warn('[D83-ARENA-RETIRED] legacy arena push tap -> home', { type: data.type });
          navTabHome();
          break;
        case 'activity_like':
        case 'friend_nudge':
          scheduleNav(() => {
            const actorStableUid = String(data.actorStableUid ?? '').trim();
            const eventId = String(data.eventId ?? '').trim();
            router.push({
              pathname: '/(tabs)/friends',
              params: {
                ...(actorStableUid ? { focusFriend: actorStableUid } : {}),
                ...(eventId ? { socialEventId: eventId } : {}),
              },
            });
          });
          break;
        case 'tournament_starting':
          // Owner lock: an already delivered notification is inert. Do not
          // navigate, show a fallback screen, or resurrect a retired route.
          break;
        default:
          // Unknown notifications from older builds always land on a safe screen.
          navTabHome();
      }
    });
    lifetime.adopt(() => subscription.remove?.());
  });
  // Вернуть функцию отписки для useEffect cleanup
  return () => { lifetime.dispose(); };
};

// ── Напоминание о конце триала (обещание таймлайна пейвола v3) ───────────────
// Пейвол обещает «напомним за день до списания» — это обещание ОБЯЗАНО быть
// правдой (паттерн Blinkist: прозрачность триала = +23% стартов, −55% жалоб).
// Живёт максимум одно напоминание; при новом триале пересоздаётся.
const TRIAL_END_REMINDER_ID_KEY = 'trial_end_reminder_id_v1';

export const scheduleTrialEndReminder = async (
  trialDays: number,
  title: string,
  body: string,
  trialStartMs: number = Date.now(),
  timing: TrialReminderTiming = 'onboarding_day_before',
): Promise<boolean> => {
  // зачем (владелец 2026-09-30): «убедись что уведомление действительно отправляется».
  // Каждый ранний выход пишет причину с префиксом [TRIAL-REMINDER] — раньше любой
  // отказ (нет разрешения, выключен мастер, сбой планировщика) был немым `false`.
  DebugLogger.info('[TRIAL-REMINDER]', `schedule: вход trialDays=${trialDays} start=${new Date(trialStartMs).toISOString()} platform=${Platform.OS}`);
  try {
    const N = await getNotifications();
    if (!N || Platform.OS === 'web') {
      DebugLogger.warn('[TRIAL-REMINDER]', `schedule: выход — модуль уведомлений недоступен (N=${N ? 'есть' : 'нет'}, platform=${Platform.OS})`);
      return false;
    }
    const { status } = await N.getPermissionsAsync();
    if (status !== 'granted') {
      DebugLogger.warn('[TRIAL-REMINDER]', `schedule: выход — разрешение=${status}`);
      return false;
    }
    // Сервисное напоминание о конце триала: гейт только мастером (не «Предложениями») —
    // «скоро спишутся деньги» должно дойти, даже если маркетинг выключен.
    const master = await isNotifMasterEnabled();
    if (!master) {
      DebugLogger.warn('[TRIAL-REMINDER]', `schedule: выход — мастер уведомлений в настройках=${master}`);
      return false;
    }

    // Дата: пейвол Plus — старт + (N − 2) дней (обещание «за 2 дня»); онбординг —
    // прежний расчёт «за сутки» без изменений (владелец: онбординг не трогаем).
    const seconds = timing === 'plus_two_days'
      ? trialReminderDelaySeconds(trialStartMs, trialDays, Date.now())
      : onboardingTrialReminderDelaySeconds(trialDays);
    DebugLogger.info('[TRIAL-REMINDER]', `schedule: режим=${timing} seconds=${seconds ?? 'null'}`);
    if (seconds === null) {
      DebugLogger.warn('[TRIAL-REMINDER]', `schedule: выход — пробный ${trialDays} дн. слишком короткий для напоминания за 2 дня`);
      return false;
    }

    const prevId = await AsyncStorage.getItem(TRIAL_END_REMINDER_ID_KEY).catch((error: unknown) => { reportSwallowed('notifications:scheduleTrialEndReminder', error); return null; });
    if (prevId) {
      DebugLogger.info('[TRIAL-REMINDER]', `schedule: снимаем прежнее напоминание id=${prevId}`);
      await N.cancelScheduledNotificationAsync(prevId).catch(swallowError('notifications:scheduleTrialEndReminder'));
    }

    const fireAtIso = new Date(Date.now() + seconds * 1000).toISOString();
    const id = await N.scheduleNotificationAsync({
      content: { title, body, sound: 'default' },
      trigger: triggerInterval(seconds),
    });
    await AsyncStorage.setItem(TRIAL_END_REMINDER_ID_KEY, id).catch(swallowError('notifications:scheduleTrialEndReminder'));
    DebugLogger.info('[TRIAL-REMINDER]', `schedule: поставлено id=${id} через ${seconds} с, сработает ${fireAtIso}`);
    return true;
  } catch (e) {
    DebugLogger.error('[TRIAL-REMINDER] schedule', e instanceof Error ? e : new Error(String(e)), 'warning');
    return false;
  }
};

export const cancelTrialEndReminder = async (): Promise<void> => {
  try {
    const N = await getNotifications();
    if (!N) return;
    const prevId = await AsyncStorage.getItem(TRIAL_END_REMINDER_ID_KEY).catch((error: unknown) => { reportSwallowed('notifications:cancelTrialEndReminder', error); return null; });
    if (prevId) {
      await N.cancelScheduledNotificationAsync(prevId).catch(swallowError('notifications:cancelTrialEndReminder'));
      await AsyncStorage.removeItem(TRIAL_END_REMINDER_ID_KEY).catch(swallowError('notifications:cancelTrialEndReminder'));
    }
  } catch (e) {
      // best-effort
      DebugLogger.error('notifications:prevId', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
