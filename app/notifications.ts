// notifications.ts
// Push-уведомления для Phraseman
// ВАЖНО: expo-notifications НЕ работает в Expo Go
// Используем lazy import с try/catch — приложение не падает без нативного модуля

import type { Lang } from '../constants/i18n';

import { Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTodayPhrase } from './daily_phrase_system';

/** Android 8+: канал с high importance; `channelId` дублируется в каждом триггере. */
const ANDROID_NOTIF_CHANNEL_ID = 'phraseman_reminders';

const getDayIndex = () => Math.floor(Date.now() / 86400000);

const NUM_TRACKED_LESSONS = 32;

/** Уроки с ненулевым lessonN_pass_count (для статистики в пуше). */
async function countCompletedLessonsFromStorage(): Promise<number> {
  const keys = Array.from({ length: NUM_TRACKED_LESSONS }, (_, i) => `lesson${i + 1}_pass_count`);
  const rows = await AsyncStorage.multiGet(keys);
  let n = 0;
  for (const [, v] of rows) {
    if ((parseInt(v || '0', 10) || 0) > 0) n++;
  }
  return n;
}

/** Ближайшее воскресенье 20:00 (локальное) для weekly recap. */
function getNextWeeklyRecapTime(now: Date = new Date()): Date {
  const target = new Date(now);
  const day = now.getDay();
  if (day === 0) {
    target.setHours(20, 0, 0, 0);
    if (now.getTime() >= target.getTime()) {
      target.setDate(target.getDate() + 7);
    }
  } else {
    target.setDate(now.getDate() + (7 - day));
    target.setHours(20, 0, 0, 0);
  }
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
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync(ANDROID_NOTIF_CHANNEL_ID, {
          name: 'Напоминания',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#06141B',
          sound: 'default',
          enableVibrate: true,
        });
      } catch {
        /* no-op */
      }
    }
    return Notifications;
  } catch {
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
        await Linking.openSettings().catch(() => {});
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
        await Linking.openSettings().catch(() => {});
        return { granted: false, blocked: true, openedSettings: true };
      }
      return { granted: false, blocked: true, openedSettings: false };
    }
    return { granted: false, blocked: false, openedSettings: false };
  } catch {
    return { granted: false, blocked: false, openedSettings: false };
  }
};

export const getNotificationPermissionStatus = async (): Promise<'granted' | 'denied' | 'undetermined' | 'unknown'> => {
  try {
    const N = await getNotifications();
    if (!N) return 'unknown';
    if (Platform.OS === 'web') return 'denied';
    const { status } = await N.getPermissionsAsync();
    return status as 'granted' | 'denied' | 'undetermined';
  } catch {
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

// ── Мотивационные сообщения ──────────────────────────────────────────────────
const MESSAGES_RU = [
  { title: '🔥 Стрик ждёт тебя!',        body: 'Не прерывай серию — 5 минут в день изменят всё' },
  { title: '📚 Время для English',         body: 'Один урок сегодня — уверенность на всю жизнь' },
  { title: '⭐ Обгони соперника!',          body: 'Кто-то обошёл тебя в лиге. Ответный ход?' },
  { title: '🎯 Ежедневная цель',           body: 'Осталось совсем немного до завершения заданий!' },
  { title: '💪 Не останавливайся!',        body: 'Ты уже столько прошёл. Продолжи сегодня' },
  { title: '🧠 Повтори вчерашнее',         body: 'Лучшее время для повторения — сейчас' },
];

const MESSAGES_UK = [
  { title: '🔥 Стрік чекає тебе!',         body: 'Не переривай серію — 5 хвилин на день змінять все' },
  { title: '📚 Час для English',            body: 'Один урок сьогодні — впевненість на все життя' },
  { title: '⭐ Обжени суперника!',           body: 'Хтось обійшов тебе в лізі. Час дати відповідь?' },
  { title: '🎯 Щоденна ціль',              body: 'Залишилось зовсім небагато до завершення завдань!' },
  { title: '💪 Не зупиняйся!',             body: 'Ти вже стільки пройшов. Продовж сьогодні' },
  { title: '🧠 Повтори вчорашнє',          body: 'Найкращий час для повторення — зараз' },
];

/** Испанский UX для напоминаний (нейтрал., без кальки). */
const MESSAGES_ES = [
  { title: '🔥 ¡Tu racha cuenta!', body: 'No la cortes: dedica solo 5 minutos al día y verás la diferencia' },
  { title: '📚 Tu momento de inglés', body: 'Una lección hoy puede darte seguridad mañana' },
  { title: '⭐ Te adelantaron', body: 'Alguien ganó puntos en la liga. ¿Te animas a responder?' },
  { title: '🎯 Objetivo del día', body: '¡Te falta muy poco para cerrar tus metas!' },
  { title: '💪 Sigue sumando', body: 'Ya recorriste mucho camino; continúa hoy' },
  { title: '🧠 Repasa lo de ayer', body: 'Este es un buen momento para refrescar lo aprendido' },
];

function reminderMessages(forLang: Lang | string) {
  const key = typeof forLang === 'string' ? forLang : forLang;
  if (key === 'uk') return MESSAGES_UK;
  if (key === 'es') return MESSAGES_ES;
  return MESSAGES_RU;
}

/** Тройной выбор копирайта для пушей. */
function pickNotif<R>(lang: Lang | string, ru: R, uk: R, es: R): R {
  const key = lang === 'uk' || lang === 'es' || lang === 'ru' ? lang : String(lang);
  if (key === 'uk') return uk;
  if (key === 'es') return es;
  return ru;
}

const DAILY_REMINDER_ID_KEY = 'daily_reminder_notif_id';
const WEEKLY_RECAP_NOTIF_ID_KEY = 'weekly_recap_notif_id';
const MONTHLY_RECAP_NOTIF_ID_KEY = 'monthly_recap_notif_id';

// ── Запланировать ежедневное уведомление ─────────────────────────────────────
export const scheduleDailyReminder = async (
  hour: number = 19,
  minute: number = 0,
  lang: Lang = 'ru',
  opts: { requestPermission?: boolean } = {}
): Promise<void> => {
  try {
    const N = await getNotifications();
    if (!N) return;

    const hasPermission = await canUseNotifications(opts.requestPermission ?? true);
    if (!hasPermission) return;

    // Отменяем только предыдущее daily reminder, не трогаем остальные уведомления
    const prevId = await AsyncStorage.getItem(DAILY_REMINDER_ID_KEY);
    if (prevId) {
      await N.cancelScheduledNotificationAsync(prevId).catch(() => {});
    }

    const messages = reminderMessages(lang);
    const msg = messages[Math.floor(Math.random() * messages.length)];

    const id = await N.scheduleNotificationAsync({
      content: {
        title: msg.title,
        body: msg.body,
        sound: true,
        data: { type: 'reminder' },
      },
      trigger: triggerDaily(hour, minute),
    });

    await AsyncStorage.setItem(DAILY_REMINDER_ID_KEY, id);
    await AsyncStorage.setItem('notification_hour', String(hour));
    await AsyncStorage.setItem('notification_minute', String(minute));
    await AsyncStorage.setItem('notifications_enabled', 'true');
  } catch {}
};

/** Ключи метаданных планирования (не самих payload). Сохранённые в sync с cancelAllScheduledNotificationsAsync. */
const NOTIFICATION_SCHEDULE_STORAGE_KEYS = [
  DAILY_REMINDER_ID_KEY,
  'per_day_notif_ids',
  WEEKLY_RECAP_NOTIF_ID_KEY,
  MONTHLY_RECAP_NOTIF_ID_KEY,
  'streak_warning_scheduled',
  'phrase_notif_scheduled',
  'weekly_recap_scheduled',
  'monthly_recap_scheduled',
] as const;

async function cancelAllScheduledLocalNotifications(N: Awaited<ReturnType<typeof getNotifications>>): Promise<void> {
  try {
    if (N) await N.cancelAllScheduledNotificationsAsync().catch(() => {});
  } catch {}
  try {
    await AsyncStorage.multiRemove([...NOTIFICATION_SCHEDULE_STORAGE_KEYS]);
  } catch {}
  await AsyncStorage.setItem('notifications_enabled', 'false');
}

// ── Отменить все уведомления ─────────────────────────────────────────────────
export const cancelAllNotifications = async (): Promise<void> => {
  const N = await getNotifications();
  await cancelAllScheduledLocalNotifications(N);
};

// ── Уведомление о потере стрика ───────────────────────────────────────────────
export const sendStreakWarning = async (streak: number, lang: Lang = 'ru'): Promise<void> => {
  try {
    const N = await getNotifications();
    if (!N) return;

    // НЕ запрашиваем разрешение здесь: streak warning не должен поднимать
    // системный диалог push в произвольный момент (потеря стрика).
    // Запрос разрешения идёт только через NotificationPermissionModal по условиям из _layout.tsx.
    const hasPermission = await canUseNotifications(false);
    if (!hasPermission) return;

    const _p = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
    const ruTitle = [`🔥 Стрик ${streak} дней под угрозой!`, `⚠️ Твой стрик ${streak} дней может исчезнуть сегодня!`, `😱 ${streak} дней в опасности — зайди сейчас!`, `🚨 Не сломай серию из ${streak} дней!`];
    const ukTitle = [`🔥 Стрік ${streak} днів під загрозою!`, `⚠️ Твій стрік ${streak} днів може зникнути сьогодні!`, `😱 ${streak} днів у небезпеці — зайди зараз!`, `🚨 Не зламай серію з ${streak} днів!`];
    const esTitle = [
      `🔥 ¡Tu racha de ${streak} días puede romperse!`,
      `⚠️ Vas ${streak} días seguidos; hoy no la desperdicies`,
      `😱 ¡${streak} días de constancia — no tires la toalla ahora!`,
      `🚨 No pierdas una racha de ${streak} días`,
    ];
    const _title = pickNotif(lang, _p(ruTitle), _p(ukTitle), _p(esTitle));
    const ruBody = ['Ещё несколько часов и серия прервётся. Зайди сейчас!', 'Один урок — и стрик сохранён. Ты можешь это! 💪', 'Не дай огню погаснуть! Один урок решает всё 🔥', '5 минут — и серия жива. Не останавливайся!'];
    const ukBody = ['Ще кілька годин і серія зірветься. Зайди зараз!', 'Один урок — і стрік збережено. Ти можеш це зробити! 💪', 'Не дай вогню згаснути! Один урок вирішує все 🔥', '5 хвилин — і серія жива. Не зупиняйся!'];
    const esBody = [
      'En unas horas se cortará la racha; entra cuando puedas.',
      'Con una sola lección la salvas. Vamos 💪',
      'No la dejes apagarse: una sesión marca la diferencia 🔥',
      'Cinco minutos y la racha sigue intacta.',
    ];
    const _body = pickNotif(lang, _p(ruBody), _p(ukBody), _p(esBody));
    await N.scheduleNotificationAsync({
      content: { title: _title, body: _body, sound: true, data: { type: 'streak_warning' } },
      trigger: triggerInterval(2),
    });
  } catch {}
};

// ── D+1 персональное уведомление после первого урока ─────────────────────────
// Вызывается в lesson_complete после lessonId === 1
// Планирует уведомление на следующий день в 20:00 с точным кол-вом выученных фраз и стриком
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

    const title = pickNotif(
      lang,
      `Вчера ты выучил ${phrasesLearned} фраз 🔥`,
      `Вчора ти вивчив ${phrasesLearned} фраз 🔥`,
      `Ayer consolidaste ${phrasesLearned} frases nuevas 🔥`,
    );
    const body =
      streak > 0
        ? pickNotif(
            lang,
            `Стрик ${streak} ${streak === 1 ? 'день' : streak < 5 ? 'дня' : 'дней'}. Сегодня +${phrasesLearned} — и ты уже не остановишься!`,
            `Стрік ${streak} ${streak === 1 ? 'день' : 'дні'}. Сьогодні +${phrasesLearned} — і ти вже не зупинишся!`,
            `Racha de ${streak} ${streak === 1 ? 'día' : 'días'}. Si hoy sumas ${phrasesLearned} más, no habrá quien te pare.`,
          )
        : pickNotif(
            lang,
            `Ещё ${phrasesLearned} сегодня — и стрик начнётся! Не останавливайся 💪`,
            `Ще ${phrasesLearned} сьогодні — і стрік почнеться! Не зупиняйся 💪`,
            `${phrasesLearned} frases más hoy y arrancas una racha nueva. ¡Sigue! 💪`,
          );

    // Завтра в 20:00
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(20, 0, 0, 0);
    const secondsUntil = Math.floor((tomorrow.getTime() - Date.now()) / 1000);
    if (secondsUntil <= 0) return;

    await N.scheduleNotificationAsync({
      content: { title, body, sound: true, data: { type: 'd1_reminder' } },
      trigger: triggerInterval(secondsUntil),
    });
  } catch {}
};

// ── Уведомление об активации Premium ─────────────────────────────────────────
export const sendPremiumNotification = async (lang: Lang = 'ru'): Promise<void> => {
  try {
    const N = await getNotifications();
    if (!N) return;
    // НЕ дёргаем системный диалог при активации Premium.
    // Запрос разрешения идёт только через NotificationPermissionModal (см. _layout.tsx).
    const hasPermission = await canUseNotifications(false);
    if (!hasPermission) return;
    const _pp = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
    const _premTitle = pickNotif(
      lang,
      _pp(['🎉 Поздравляем с Premium!', '🏆 Premium активирован!', '✨ Ты теперь Premium!', '🚀 Premium — твой новый уровень!']),
      _pp(['🎉 Вітаємо з Premium!', '🏆 Premium активовано!', '✨ Ти тепер Premium!', '🚀 Premium — твій новий рівень!']),
      _pp(['🎉 ¡Bienvenido a Premium!', '🏆 Premium activado', '✨ Ya eres usuario Premium', '🚀 Premium impulsa tu ritmo']),
    );
    const _premBody = pickNotif(
      lang,
      _pp([
        'Все 32 урока, квизы и диалоги теперь открыты для вас!',
        'Никаких ограничений — учись сколько хочешь! 🔥',
        'Весь контент в твоём распоряжении. Время покорять English! 💪',
        '32 урока, все квизы и диалоги — твои! Поехали! 🚀',
      ]),
      _pp([
        'Усі 32 уроки, квізи та діалоги відкриті для вас!',
        'Жодних обмежень — вчи скільки хочеш! 🔥',
        'Весь контент у твоєму розпорядженні. Час завойовувати English! 💪',
        '32 уроки, всі квізи та діалоги — твої! Поїхали! 🚀',
      ]),
      _pp([
        'Tienes abiertas las 32 lecciones, los cuestionarios y los diálogos.',
        'Sin límites rigurosos: practica al ritmo que necesites 🔥',
        'Todo el contenido listo para llevar tu inglés al siguiente nivel 💪',
        '32 lecciones y retos avanzados te esperan: ¡vamos! 🚀',
      ]),
    );
    await N.scheduleNotificationAsync({
      content: { title: _premTitle, body: _premBody, sound: true, data: { type: 'premium' } },
      trigger: null,
    });
  } catch {}
};

// ── Типы для расширенных настроек (совместимость с settings_notifications.tsx) ─
export type DaySchedule = { enabled: boolean; hour: number; minute: number };
export type NotifSettings = { schedule: Record<number, DaySchedule> };

export const DEFAULT_NOTIF: NotifSettings = {
  schedule: Object.fromEntries(
    Array.from({ length: 7 }, (_, i) => [i, { enabled: false, hour: 19, minute: 0 }])
  ),
};

const NOTIF_KEY = 'notif_settings_v2';

function cloneNotif(s: NotifSettings): NotifSettings {
  return JSON.parse(JSON.stringify(s)) as NotifSettings;
}

let notifMemory: NotifSettings = cloneNotif(DEFAULT_NOTIF);

export function getNotifSettingsSnapshot(): NotifSettings {
  return cloneNotif(notifMemory);
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
  } catch {}
};

// app day index 0=Mon..6=Sun → expo weekday 1=Sun,2=Mon..7=Sat
const appDayToExpoWeekday = (d: number): number => d === 6 ? 1 : d + 2;

export const scheduleNotifications = async (
  s: NotifSettings,
  lang: string,
  _n: number,
  opts: { requestPermission?: boolean } = {}
): Promise<void> => {
  const N = await getNotifications();
  if (!N) return;

  const hasPermission = await canUseNotifications(opts.requestPermission ?? true);
  if (!hasPermission) return;

  const anyEnabled = Object.values(s.schedule).some(d => d.enabled);
  if (!anyEnabled) {
    await cancelAllScheduledLocalNotifications(N);
    return;
  }

  // Отменяем старые per-day уведомления
  const prevPerDayRaw = await AsyncStorage.getItem('per_day_notif_ids');
  if (prevPerDayRaw) {
    const ids: string[] = JSON.parse(prevPerDayRaw);
    await Promise.all(ids.map(id => N.cancelScheduledNotificationAsync(id).catch(() => {})));
  }
  // Также отменяем старый daily reminder
  const prevId = await AsyncStorage.getItem(DAILY_REMINDER_ID_KEY);
  if (prevId) await N.cancelScheduledNotificationAsync(prevId).catch(() => {});
  await AsyncStorage.removeItem(DAILY_REMINDER_ID_KEY);

  const prevW = await AsyncStorage.getItem(WEEKLY_RECAP_NOTIF_ID_KEY);
  if (prevW) await N.cancelScheduledNotificationAsync(prevW).catch(() => {});
  const prevM = await AsyncStorage.getItem(MONTHLY_RECAP_NOTIF_ID_KEY);
  if (prevM) await N.cancelScheduledNotificationAsync(prevM).catch(() => {});
  await AsyncStorage.multiRemove([
    WEEKLY_RECAP_NOTIF_ID_KEY,
    MONTHLY_RECAP_NOTIF_ID_KEY,
    'weekly_recap_scheduled',
    'monthly_recap_scheduled',
  ]).catch(() => {});

  const messages = reminderMessages(lang);
  const newIds: string[] = [];

  for (const [dayStr, day] of Object.entries(s.schedule)) {
    if (!day.enabled) continue;
    const msg = messages[Math.floor(Math.random() * messages.length)];
    try {
      const id = await N.scheduleNotificationAsync({
        content: { title: msg.title, body: msg.body, sound: true, data: { type: 'reminder' } },
        trigger: triggerWeekly(
          appDayToExpoWeekday(Number(dayStr)),
          day.hour,
          day.minute,
        ),
      });
      newIds.push(id);
    } catch {}
  }

  await AsyncStorage.setItem('per_day_notif_ids', JSON.stringify(newIds));
  await AsyncStorage.setItem('notifications_enabled', 'true');
  // Сохраняем время первого включённого дня для восстановления после перезапуска
  const first = Object.values(s.schedule).find(d => d.enabled);
  if (first) {
    await AsyncStorage.setItem('notification_hour', String(first.hour));
    await AsyncStorage.setItem('notification_minute', String(first.minute));
  }
};

// ── Авто-предупреждение о потере стрика (планируется на вечер текущего дня) ──
// Вызывается при старте приложения, если стрик > 0 и урок сегодня ещё не пройден.
// Персонализированные сообщения в зависимости от длины стрика.
export const scheduleStreakWarningIfNeeded = async (
  lang: Lang = 'ru',
  opts: { requestPermission?: boolean } = {}
): Promise<void> => {
  try {
    const N = await getNotifications();
    if (!N) return;
    const hasPermission = await canUseNotifications(opts.requestPermission ?? true);
    if (!hasPermission) return;

    const today = new Date().toISOString().split('T')[0];

    // Проверяем: стрик > 0 и урок сегодня ещё не выполнен
    const [streakRaw, lastActiveRaw, notifEnabledRaw] = await Promise.all([
      AsyncStorage.getItem('streak_count'),
      AsyncStorage.getItem('last_active_date'),
      AsyncStorage.getItem('notifications_enabled'),
    ]);

    if (notifEnabledRaw !== 'true') return;
    const streak = parseInt(streakRaw || '0') || 0;
    if (streak === 0) return;

    const lessonDoneToday = lastActiveRaw === today;

    // Если урок уже пройден — ничего не нужно
    if (lessonDoneToday) {
      await AsyncStorage.removeItem('streak_warning_scheduled');
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

    // Персонализированные сообщения в зависимости от длины стрика
    let title: string;
    let body: string;

    const _ps = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
    if (streak >= 15) {
      title = pickNotif(
        lang,
        _ps([
          `🚨 Невероятный стрик ${streak} дней под угрозой!`,
          `😱 ${streak} дней — и всё может исчезнуть сегодня!`,
          `🏆 Стрик-легенда ${streak} дней в опасности!`,
          `⚡ Не дай погаснуть ${streak}-дневной серии!`,
        ]),
        _ps([
          `🚨 Неймовірний стрік ${streak} днів під загрозою!`,
          `😱 ${streak} днів — і все може зникнути сьогодні!`,
          `🏆 Стрік-легенда ${streak} днів у небезпеці!`,
          `⚡ Не дай згаснути ${streak}-денній серії!`,
        ]),
        _ps([
          `🚨 ¡Tu racha de ${streak} días corre peligro!`,
          `😱 ${streak} días seguidos podrían perderse hoy`,
          `🏆 Llevas ${streak} días como un campeón: no la sueltes`,
          `⚡ No dejes apagar una racha de ${streak} días`,
        ]),
      );
      body = pickNotif(
        lang,
        _ps([
          `Твой результат на грани! Один урок — и серия спасена 🔥`,
          `Столько усилий! Не останавливайся — один урок решает всё 💪`,
          `${streak} дней труда — не дай им исчезнуть! Зайди сейчас 🚀`,
          `Ты почти легенда. Один урок — и стрик живой! ⭐`,
        ]),
        _ps([
          `Твій результат на межі! Один урок — і серія спасена 🔥`,
          `Стільки зусиль! Не зупиняйся тепер — один урок вирішує все 💪`,
          `${streak} днів праці — не дай їм зникнути! Зайди зараз 🚀`,
          `Ти майже легенда. Один урок — і стрік живий! ⭐`,
        ]),
        _ps([
          `Estás al filo: con una lección la salvas 🔥`,
          `Tanto esfuerzo merece continuar: decide con una sesión 💪`,
          `${streak} días de constancia no se tiran ahora 🚀`,
          `Casi eres leyenda del club: sigue sumando ⭐`,
        ]),
      );
    } else if (streak >= 7) {
      title = pickNotif(
        lang,
        _ps([
          `🔥 Твой стрик ${streak} дней в опасности!`,
          `⚠️ ${streak} дней под угрозой — действуй!`,
          `😤 Не сдавай ${streak}-дневную серию!`,
          `🎯 Стрик ${streak} дней ждёт тебя сегодня!`,
        ]),
        _ps([
          `🔥 Твій стрік ${streak} днів у небезпеці!`,
          `⚠️ ${streak} дні під загрозою — діяй!`,
          `😤 Не здавай ${streak}-денню серію!`,
          `🎯 Стрік ${streak} днів чекає тебе сьогодні!`,
        ]),
        _ps([
          `🔥 Racha de ${streak} días en la cuerda floja`,
          `⚠️ ${streak} días seguidos: reacciona hoy`,
          `😤 No abandones una serie de ${streak} días`,
          `🎯 Tu racha ${streak} te espera en la app`,
        ]),
      );
      body = pickNotif(
        lang,
        _ps([
          `Не теряй накопленное! Один урок — и всё сохранено 💪`,
          `7+ дней усилий — не останавливайся сейчас! 🔥`,
          `Твой стрик заслуживает продолжения. Один урок — и ты молодец! ⭐`,
          `Зайди на 5 минут — и серия жива! 🚀`,
        ]),
        _ps([
          `Не втрачай накопичене! Один урок — і все збережено 💪`,
          `7+ днів зусиль — не зупиняйся зараз! 🔥`,
          `Твій стрік заслуговує продовження. Один урок — і ти молодець! ⭐`,
          `Зайди на 5 хвилин — і серія жива! 🚀`,
        ]),
        _ps([
          `No pierdas lo ganado: una lección lo fija 💪`,
          `Llevas más de una semana firme — no frenes ahora 🔥`,
          `Tu constancia vale oro; un repaso rápido basta ⭐`,
          `Cinco minutos y la racha sigue contigo 🚀`,
        ]),
      );
    } else {
      title = pickNotif(
        lang,
        _ps([
          `🔥 Стрик ${streak} дней — не прерывай сегодня!`,
          `💪 ${streak} дней подряд — не останавливайся!`,
          `📚 Один урок — и стрик сохранён!`,
          `⚡ Не пропусти сегодняшний урок!`,
        ]),
        _ps([
          `🔥 Стрік ${streak} днів — не переривай сьогодні!`,
          `💪 ${streak} дні поспіль — не зупиняйся!`,
          `📚 Один урок — і стрік збережено!`,
          `⚡ Не пропусти сьогоднішній урок!`,
        ]),
        _ps([
          `🔥 ${streak} días de racha: no la cortes hoy`,
          `💪 ${streak} días seguidos y sumando`,
          `📚 Una lección bastará para guardarla`,
          `⚡ No dejes pasar tu sesión de hoy`,
        ]),
      );
      body = pickNotif(
        lang,
        _ps([
          `Ещё есть время! Один урок сохранит серию.`,
          `Начни — и уже через 5 минут стрик будет сохранён! 🎯`,
          `Маленький шаг сегодня — большой результат завтра 🚀`,
          `Не давай привычке сломаться — зайди и сделай урок! 💪`,
        ]),
        _ps([
          `Ще є час! Один урок збереже серію.`,
          `Почни — і вже за 5 хвилин стрік буде збережено! 🎯`,
          `Маленький крок сьогодні — великий результат завтра 🚀`,
          `Не давай звичці зламатися — зайди і зроби урок! 💪`,
        ]),
        _ps([
          `Aún queda margen; una clase la mantiene viva.`,
          `Empieza y en cinco minutos habrás cerrado el día 🎯`,
          `Pequeño esfuerzo hoy, gran fluidez mañana 🚀`,
          `No rompas la costumbre: entra y entrena 💪`,
        ]),
      );
    }

    await N.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data: { type: 'streak_warning' },
      },
      trigger: triggerInterval(secondsUntil),
    });

    await AsyncStorage.setItem('streak_warning_scheduled', today);
  } catch {}
};

// ── Weekly Recap уведомление ──────────────────────────────────────────────────
// Планируется на ближайшее воскресенье в 20:00
// Содержимое персонализируется по текущим данным в AsyncStorage
export const scheduleWeeklyRecapNotification = async (
  lang: Lang = 'ru',
  opts: { requestPermission?: boolean } = {}
): Promise<void> => {
  try {
    const N = await getNotifications();
    if (!N) return;
    const hasPermission = await canUseNotifications(opts.requestPermission ?? true);
    if (!hasPermission) return;

    // Читаем текущую статистику
    const [xpRaw, streakRaw] = await Promise.all([
      AsyncStorage.getItem('user_total_xp'),
      AsyncStorage.getItem('streak_count'),
    ]);
    const totalXP = parseInt(xpRaw || '0') || 0;
    const streak = parseInt(streakRaw || '0') || 0;

    const now = new Date();
    const nextSunday = getNextWeeklyRecapTime(now);
    const secondsUntil = Math.max(1, Math.floor((nextSunday.getTime() - now.getTime()) / 1000));

    const _pw = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
    const title = pickNotif(
      lang,
      _pw(['📊 Итоги недели', '🏆 Твоя неделя в цифрах', '🔥 Как прошла твоя неделя?', '⭐ Еженедельный отчёт готов!']),
      _pw(['📊 Підсумок тижня', '🏆 Твій тиждень у цифрах', '🔥 Як пройшов твій тиждень?', '⭐ Тижневий звіт готовий!']),
      _pw(['📊 Resumen semanal', '🏆 Tu semana en datos', '🔥 ¿Cómo te fue?', '⭐ ¡Listo tu informe semanal!']),
    );
    const body = pickNotif(
      lang,
      _pw([
        `Стрик: ${streak} 🔥 · Всего XP: ${totalXP} ⭐ — так держать!`,
        `Ты сделал ${streak} дней подряд! XP: ${totalXP} ⭐ Продолжай в том же духе! 💪`,
        `${totalXP} XP за неделю — ты движешься к цели! 🚀 Стрик: ${streak} 🔥`,
        `Невероятная неделя! Стрик ${streak} дней · ${totalXP} XP. Молодец! 🎯`,
      ]),
      _pw([
        `Стрік: ${streak} 🔥 · Всього XP: ${totalXP} ⭐ — так тримати!`,
        `Ти зробив ${streak} днів поспіль! XP: ${totalXP} ⭐ Продовжуй у тому ж дусі! 💪`,
        `${totalXP} XP за тиждень — ти рухаєшся до мети! 🚀 Стрік: ${streak} 🔥`,
        `Неймовірний тиждень! Стрік ${streak} днів · ${totalXP} XP. Ти молодець! 🎯`,
      ]),
      _pw([
        `Racha: ${streak} 🔥 · XP total: ${totalXP} ⭐ ¡sigue así!`,
        `${streak} días seguidos y ${totalXP} XP acumulados; mantén el impulso 💪`,
        `+${totalXP} XP esta semana: vas en serio 🚀 Racha ${streak} 🔥`,
        `Semana redonda: racha ${streak} · ${totalXP} XP. Buen trabajo 🎯`,
      ]),
    );

    const prevWeeklyId = await AsyncStorage.getItem(WEEKLY_RECAP_NOTIF_ID_KEY);
    if (prevWeeklyId) await N.cancelScheduledNotificationAsync(prevWeeklyId).catch(() => {});

    const weeklyId = await N.scheduleNotificationAsync({
      content: { title, body, sound: true, data: { type: 'weekly_recap' } },
      trigger: triggerInterval(secondsUntil),
    });

    await AsyncStorage.setItem(WEEKLY_RECAP_NOTIF_ID_KEY, weeklyId);
    await AsyncStorage.setItem('weekly_recap_scheduled', nextSunday.toISOString().split('T')[0]);
  } catch {}
};

// ── Monthly Recap уведомление ─────────────────────────────────────────────────
// Планируется на 1-е следующего месяца в 10:00
export const scheduleMonthlyRecapNotification = async (
  lang: Lang = 'ru',
  opts: { requestPermission?: boolean } = {}
): Promise<void> => {
  try {
    const N = await getNotifications();
    if (!N) return;
    const hasPermission = await canUseNotifications(opts.requestPermission ?? true);
    if (!hasPermission) return;

    const [xpRaw, streakRaw, lessons] = await Promise.all([
      AsyncStorage.getItem('user_total_xp'),
      AsyncStorage.getItem('streak_count'),
      countCompletedLessonsFromStorage(),
    ]);
    const totalXP = parseInt(xpRaw || '0') || 0;
    const streak = parseInt(streakRaw || '0') || 0;

    // Первое число следующего месяца в 10:00
    const now = new Date();
    const firstNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 10, 0, 0, 0);
    const secondsUntil = Math.max(1, Math.floor((firstNextMonth.getTime() - now.getTime()) / 1000));

    const title = pickNotif(lang, '🏆 Твой месяц в цифрах', '🏆 Твій місяць у цифрах', '🏆 Tu mes en cifras');
    const body = pickNotif(
      lang,
      `Уроков: ${lessons} · Стрик: ${streak} 🔥 · XP: ${totalXP} ⭐`,
      `Уроків: ${lessons} · Стрік: ${streak} 🔥 · XP: ${totalXP} ⭐`,
      `Lecciones: ${lessons} · Racha: ${streak} 🔥 · XP: ${totalXP} ⭐`,
    );

    const prevMonthlyId = await AsyncStorage.getItem(MONTHLY_RECAP_NOTIF_ID_KEY);
    if (prevMonthlyId) await N.cancelScheduledNotificationAsync(prevMonthlyId).catch(() => {});

    const monthlyId = await N.scheduleNotificationAsync({
      content: { title, body, sound: true, data: { type: 'monthly_recap' } },
      trigger: triggerInterval(secondsUntil),
    });

    await AsyncStorage.setItem(MONTHLY_RECAP_NOTIF_ID_KEY, monthlyId);
    await AsyncStorage.setItem('monthly_recap_scheduled', firstNextMonth.toISOString().split('T')[0]);
  } catch {}
};

// ── «Соперник обогнал тебя в лиге» — локальное уведомление ──────────────────
// Вызывается при старте приложения. Сравниваем сохранённый ранг с текущим.
// Если ранг ухудшился (стали ниже) — отправляем немедленное уведомление.
export const checkLeagueOvertakeNotification = async (
  currentRank: number,
  leaderName: string,       // имя игрока на 1 место выше нас
  lang: Lang = 'ru',
  opts: { requestPermission?: boolean } = {},
): Promise<void> => {
  try {
    const N = await getNotifications();
    if (!N) return;
    const notifEnabled = await AsyncStorage.getItem('notifications_enabled');
    if (notifEnabled !== 'true') return;

    const savedRankRaw = await AsyncStorage.getItem('last_known_league_rank');
    const savedRank = savedRankRaw ? parseInt(savedRankRaw) : null;
    await AsyncStorage.setItem('last_known_league_rank', String(currentRank));

    // Ранг ухудшился (число больше = ниже в таблице)
    if (savedRank === null || currentRank <= savedRank) return;

    const hasPermission = await canUseNotifications(opts.requestPermission ?? true);
    if (!hasPermission) return;

    const _po = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
    const ruT = [`😤 ${leaderName} обогнал тебя в клубе!`, `⚔️ ${leaderName} вырвался вперёд! Твой ход!`, `🔥 ${leaderName} наступает — не сдавай позиции!`, `😱 Тебя обошли! ${leaderName} теперь впереди.`];
    const ukT = [`😤 ${leaderName} обігнав тебе в клубі!`, `⚔️ ${leaderName} вирвався вперед! Твоя черга!`, `🔥 ${leaderName} наступає — не здавай позиції!`, `😱 Тебе обійшли! ${leaderName} тепер попереду.`];
    const esT = [`😤 ${leaderName} te adelantó en el club`, `⚔️ ${leaderName} se colocó por delante: te toca responder`, `🔥 ${leaderName} escala posiciones — no pierdas el ritmo`, `😱 ¡Te han superado! ${leaderName} va ahora por delante.`];
    const title = pickNotif(lang, _po(ruT), _po(ukT), _po(esT));
    const ruB = [`Ты на ${currentRank} месте. Отвечай прямо сейчас!`, `${currentRank} место — это временно. Один урок вернёт лидерство!`, `Покажи ${leaderName} кто тут настоящий лингвист! 💪`, `Время ответить! Верни своё место в рейтинге. 🎯`];
    const ukB = [`Ти на ${currentRank} місці. Відповідай прямо зараз!`, `${currentRank} місце — це тимчасово. Один урок поверне лідерство!`, `Покажи ${leaderName} хто тут справжній лінгвіст! 💪`, `Час дати відповідь! Поверни своє місце в рейтингу. 🎯`];
    const esB = [`Estás en el puesto ${currentRank}: contesta cuando puedas`, `El ${currentRank} es solo provisional; recupera tu sitio en una sesión`, `Enséñale a ${leaderName} quién marca el ritmo 💪`, `Reacciona y vuelve a subir posiciones 🎯`];
    const body = pickNotif(lang, _po(ruB), _po(ukB), _po(esB));

    await N.scheduleNotificationAsync({
      content: { title, body, sound: true, data: { type: 'league_overtake' } },
      trigger: null, // немедленное уведомление
    });
  } catch {}
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
export const schedulePhrasOfDayNotification = async (
  lang: Lang = 'ru',
  opts: { requestPermission?: boolean } = {}
): Promise<void> => {
  try {
    const N = await getNotifications();
    if (!N) return;
    const hasPermission = await canUseNotifications(opts.requestPermission ?? true);
    if (!hasPermission) return;

    const today = new Date().toISOString().split('T')[0];

    // Только одно уведомление в день
    const lastScheduled = await AsyncStorage.getItem('phrase_notif_scheduled');
    if (lastScheduled === today) return;

    // Получить фразу дня
    const phrase = await getTodayPhrase();

    // Планируем на 7:00 утра
    const now = new Date();
    const phraseTime = new Date(now);
    phraseTime.setHours(7, 0, 0, 0);

    // Если уже прошло 7:00 — планируем на завтра
    let secondsUntil = Math.floor((phraseTime.getTime() - now.getTime()) / 1000);
    if (secondsUntil <= 0) {
      phraseTime.setDate(phraseTime.getDate() + 1);
      secondsUntil = Math.floor((phraseTime.getTime() - now.getTime()) / 1000);
    }

    const TEASERS_RU = [
      `"${phrase.english}" — знаешь что это значит? 👀`,
      `"${phrase.english}" — открой приложение, чтобы узнать смысл ✨`,
      `"${phrase.english}" — natives говорят так каждый день. А ты знаешь зачем? 🤔`,
      `"${phrase.english}" — это не то, что ты думаешь 😏`,
      `"${phrase.english}" — одна фраза, которая изменит твой English 🚀`,
    ];
    const TEASERS_UK = [
      `"${phrase.english}" — знаєш що це означає? 👀`,
      `"${phrase.english}" — відкрий додаток, щоб дізнатись зміст ✨`,
      `"${phrase.english}" — natives кажуть так щодня. А ти знаєш навіщо? 🤔`,
      `"${phrase.english}" — це не те, що ти думаєш 😏`,
      `"${phrase.english}" — одна фраза, що змінить твій English 🚀`,
    ];
    const TEASERS_ES = [
      `"${phrase.english}" — ¿sabes qué significa? 👀`,
      `"${phrase.english}" — abre la app y descubre el sentido ✨`,
      `"${phrase.english}" — los nativos lo dicen así a diario ¿tú ya sabes por qué? 🤔`,
      `"${phrase.english}" — no es lo que imaginas 😏`,
      `"${phrase.english}" — una sola frase para subir de nivel en inglés 🚀`,
    ];
    const teasers = pickNotif(lang, TEASERS_RU, TEASERS_UK, TEASERS_ES);
    const teaserIdx = getDayIndex() % teasers.length;
    const title = pickNotif(lang, '☀️ Фраза дня', '☀️ Фраза дня', '☀️ Frase del día');
    const body = teasers[teaserIdx];

    await N.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data: { type: 'phrase_of_day', phraseId: phrase.english },
      },
      trigger: triggerInterval(secondsUntil),
    });

    await AsyncStorage.setItem('phrase_notif_scheduled', today);
  } catch {
  }
};

// ── Обработчик тапа по уведомлению (deep link) ───────────────────────────────
// Вызывать один раз при старте приложения из _layout.tsx
// router — объект от useRouter() или expo-router
export const setupNotificationTapHandler = (
  router: { push: (route: any) => void; replace?: (route: any) => void }
): (() => void) => {
  const navTabHome = () => {
    if (typeof router.replace === 'function') {
      router.replace('/(tabs)/home');
      return;
    }
    router.push('/(tabs)/home');
  };
  let subscription: any = null;
  getNotifications().then(N => {
    if (!N) return;
    subscription = N.addNotificationResponseReceivedListener((response: any) => {
      const data = response?.notification?.request?.content?.data;
      if (!data?.type) return;
      switch (data.type) {
        case 'arena_match':
          if (data.sessionId && data.userId) {
            router.push({
              pathname: '/arena_game' as any,
              params: { sessionId: data.sessionId, userId: data.userId },
            });
          }
          break;
        case 'streak_warning':
        case 'reminder':
        case 'd1_reminder':
        case 'premium':
        case 'league_overtake':
        case 'phrase_of_day':
          navTabHome();
          break;
        case 'weekly_recap':
        case 'monthly_recap':
          router.push('/hall_of_fame_screen');
          break;
        default:
          navTabHome();
      }
    });
  });
  // Вернуть функцию отписки для useEffect cleanup
  return () => { subscription?.remove?.(); };
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
