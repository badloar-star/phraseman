// notifications.ts
// Push-уведомления для Phraseman
// ВАЖНО: expo-notifications НЕ работает в Expo Go
// Используем lazy import с try/catch — приложение не падает без нативного модуля

import type { Lang } from '../constants/i18n';

import { Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTodayPhraseForTarget } from './daily_phrase_system';
import { reserveArenaGameEntry } from './arena_access_gate';
import { getCurrentWeekStartIso, WEEKLY_XP_KEY, WEEKLY_XP_PERIOD_START_KEY } from './weekly_xp';
import { getStoredStudyTarget } from './study_target';
import { lessonPassCountKey, storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';

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
  const stored = await getStoredStudyTarget(lang).catch(() => 'en');
  return storageStudyTarget(stored);
}

/** Уроки с ненулевым pass_count для активного study target. XP/streak остаются общими. */
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
        await Notifications.setNotificationChannelAsync(ANDROID_NOTIF_CHANNEL_ID, {
          name: 'Напоминания',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#06141B',
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
  { title: '🔥 Цепочка ждёт тебя!',        body: 'Не прерывай серию — 5 минут в день изменят всё' },
  { title: '📚 Время для English',         body: 'Один урок сегодня — уверенность на всю жизнь' },
  { title: '⭐ Обгони соперника!',          body: 'Кто-то обошёл тебя в лиге. Ответный ход?' },
  { title: '🎯 Ежедневная цель',           body: 'Осталось совсем немного до завершения заданий!' },
  { title: '💪 Не останавливайся!',        body: 'Ты уже столько прошёл. Продолжи сегодня' },
  { title: '🧠 Повтори вчерашнее',         body: 'Лучшее время для повторения — сейчас' },
];

const MESSAGES_UK = [
  { title: '🔥 Стрік чекає тебе!',         body: 'Не переривай серію — 5 хвилин на день змінять все' },
  { title: '📚 Час для English',            body: 'Один урок сьогодні — впевненість на все життя' },
  { title: '⭐ Виперед суперника!',          body: 'Хтось обійшов тебе в лізі. Час дати відповідь?' },
  { title: '🎯 Щоденна ціль',              body: 'Залишилось зовсім небагато до завершення завдань!' },
  { title: '💪 Не зупиняйся!',             body: 'Ти вже стільки пройшов. Продовжуй сьогодні' },
  { title: '🧠 Повтори вчорашнє',          body: 'Найкращий час для повторення — зараз' },
];

const MESSAGES_FR_TARGET_RU = [
  { title: '🔥 Цепочка ждёт тебя!',        body: 'Не прерывай серию — 5 минут в день изменят всё' },
  { title: '📚 Время для занятия',         body: 'Один урок сегодня — уверенность на всю жизнь' },
  { title: '⭐ Обгони соперника!',          body: 'Кто-то обошёл тебя в лиге. Ответный ход?' },
  { title: '🎯 Ежедневная цель',           body: 'Осталось совсем немного до завершения заданий!' },
  { title: '💪 Не останавливайся!',        body: 'Ты уже столько прошёл. Продолжи сегодня' },
  { title: '🧠 Повтори вчерашнее',         body: 'Лучшее время для повторения — сейчас' },
];

const MESSAGES_FR_TARGET_UK = [
  { title: '🔥 Стрік чекає тебе!',         body: 'Не переривай серію — 5 хвилин на день змінять все' },
  { title: '📚 Час для заняття',            body: 'Один урок сьогодні — впевненість на все життя' },
  { title: '⭐ Виперед суперника!',          body: 'Хтось обійшов тебе в лізі. Час дати відповідь?' },
  { title: '🎯 Щоденна ціль',              body: 'Залишилось зовсім небагато до завершення завдань!' },
  { title: '💪 Не зупиняйся!',             body: 'Ти вже стільки пройшов. Продовжуй сьогодні' },
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
const MESSAGES_PT_BR = [
  { title: '🔥 Sua sequência espera por você!', body: 'Não quebre o ritmo: 5 minutos por dia já fazem diferença' },
  { title: '📚 Hora do inglês', body: 'Uma lição hoje traz mais confiança amanhã' },
  { title: '⭐ Passaram você na liga', body: 'Alguém subiu no ranking. Hora de responder?' },
  { title: '🎯 Meta do dia', body: 'Falta pouco para fechar suas tarefas!' },
  { title: '💪 Continue firme', body: 'Você já avançou bastante. Treine hoje' },
  { title: '🧠 Revise o que viu ontem', body: 'Agora é um ótimo momento para reforçar' },
];
const MESSAGES_VI = [
  { title: '🔥 Chuỗi học đang chờ bạn!', body: 'Đừng ngắt chuỗi: 5 phút mỗi ngày tạo khác biệt' },
  { title: '📚 Đến giờ học tiếng Anh', body: 'Một bài hôm nay, tự tin hơn ngày mai' },
  { title: '⭐ Có người vượt bạn', body: 'Ai đó đã tăng hạng trong league. Bạn đáp lại chứ?' },
  { title: '🎯 Mục tiêu hôm nay', body: 'Bạn sắp hoàn thành các nhiệm vụ rồi!' },
  { title: '💪 Đừng dừng lại', body: 'Bạn đã đi được một đoạn dài. Học tiếp hôm nay nhé' },
  { title: '🧠 Ôn lại hôm qua', body: 'Bây giờ là lúc tốt để củng cố' },
];
const MESSAGES_ID = [
  { title: '🔥 Streak menunggumu!', body: 'Jangan putuskan ritme: 5 menit sehari sudah berarti' },
  { title: '📚 Waktunya bahasa Inggris', body: 'Satu pelajaran hari ini, lebih percaya diri besok' },
  { title: '⭐ Kamu disusul di liga', body: 'Ada yang naik peringkat. Mau balas sekarang?' },
  { title: '🎯 Target harian', body: 'Sedikit lagi tugasmu selesai!' },
  { title: '💪 Lanjutkan', body: 'Kamu sudah banyak maju. Latihan hari ini' },
  { title: '🧠 Ulangi materi kemarin', body: 'Ini waktu yang pas untuk menguatkan ingatan' },
];
const MESSAGES_TR = [
  { title: '🔥 Serin seni bekliyor!', body: 'Ritmi bozma: günde 5 dakika fark yaratır' },
  { title: '📚 İngilizce zamanı', body: 'Bugün bir ders, yarın daha fazla güven' },
  { title: '⭐ Lig sıralamasında geçildin', body: 'Biri puan kazandı. Cevap vermeye hazır mısın?' },
  { title: '🎯 Günlük hedef', body: 'Görevleri tamamlamana çok az kaldı!' },
  { title: '💪 Devam et', body: 'Şimdiden çok ilerledin. Bugün de çalış' },
  { title: '🧠 Dünküleri tekrar et', body: 'Pekiştirmek için iyi bir zaman' },
];
const MESSAGES_PL = [
  { title: '🔥 Twoja seria czeka!', body: 'Nie przerywaj rytmu: 5 minut dziennie robi różnicę' },
  { title: '📚 Czas na angielski', body: 'Jedna lekcja dziś to więcej pewności jutro' },
  { title: '⭐ Ktoś cię wyprzedził', body: 'Ktoś zdobył punkty w lidze. Odpowiesz?' },
  { title: '🎯 Cel dnia', body: 'Niewiele brakuje do zamknięcia zadań!' },
  { title: '💪 Nie zatrzymuj się', body: 'Masz już spory postęp. Poćwicz dziś' },
  { title: '🧠 Powtórz wczorajsze', body: 'To dobry moment na utrwalenie' },
];

type NotificationCopy<R> = Record<Lang, R>;
const notificationCopy = <R,>(copy: NotificationCopy<R>): NotificationCopy<R> => copy;
const NOTIFICATION_LANGS: readonly Lang[] = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
const normalizeNotificationLang = (value: Lang | string | null | undefined): Lang => {
  const key = String(value) as Lang;
  return NOTIFICATION_LANGS.includes(key) ? key : 'ru';
};

function reminderMessages(forLang: Lang | string, studyTarget?: RuntimeStudyTarget) {
  const key = normalizeNotificationLang(forLang);
  const target = storageStudyTarget(studyTarget);
  const base = notificationCopy({
    ru: MESSAGES_RU,
    uk: MESSAGES_UK,
    es: MESSAGES_ES,
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
    });
    return frTargetCopy[key] ?? frTargetCopy.ru;
  }
  return base[key] ?? base.ru;
}

function pickNotif<R>(lang: Lang | string, copy: NotificationCopy<R>): R {
  const key = normalizeNotificationLang(lang);
  return copy[key] ?? copy.ru;
}

const DAILY_REMINDER_ID_KEY = 'daily_reminder_notif_id';
const D1_PERSONALIZED_REMINDER_NOTIF_ID_KEY = 'd1_personalized_reminder_notif_id';
const STREAK_WARNING_NOTIF_ID_KEY = 'streak_warning_notif_id';
const PHRASE_OF_DAY_NOTIF_ID_KEY = 'phrase_of_day_notif_id';
const WEEKLY_RECAP_NOTIF_ID_KEY = 'weekly_recap_notif_id';
const MONTHLY_RECAP_NOTIF_ID_KEY = 'monthly_recap_notif_id';

type LocalNotificationType =
  | 'reminder'
  | 'streak_warning'
  | 'phrase_of_day'
  | 'weekly_recap'
  | 'monthly_recap'
  | 'league_overtake'
  | 'arena_match'
  | 'd1_reminder'
  | 'premium';

function parseStoredNumber(raw: string | null | undefined): number {
  const n = parseInt(raw || '0', 10);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function getIsoWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function parseWeekPointsForCurrentWeek(raw: string | null | undefined, weekKey: string): number {
  try {
    if (!raw) return 0;
    const data = JSON.parse(raw) as { weekKey?: string; points?: number };
    if (data.weekKey !== weekKey) return 0;
    const points = Number(data.points ?? 0);
    return Number.isFinite(points) ? Math.max(0, points) : 0;
  } catch {
    return 0;
  }
}

export async function readWeeklyRecapStatsForNotification(
  now: Date = new Date(),
): Promise<{ weekXP: number; streak: number }> {
  const [weeklyXpRaw, weeklyPeriodRaw, weekPointsV2Raw, weekPointsRaw, streakRaw] = await Promise.all([
    AsyncStorage.getItem(WEEKLY_XP_KEY),
    AsyncStorage.getItem(WEEKLY_XP_PERIOD_START_KEY),
    AsyncStorage.getItem('week_points_v2'),
    AsyncStorage.getItem('week_points'),
    AsyncStorage.getItem('streak_count'),
  ]);

  const currentWeeklyXpPeriod = getCurrentWeekStartIso(now);
  const currentWeekPointsKey = getIsoWeekKey(now);
  const recoveredWeekPoints = parseWeekPointsForCurrentWeek(weekPointsV2Raw, currentWeekPointsKey)
    || (weekPointsV2Raw ? 0 : parseStoredNumber(weekPointsRaw));
  const currentWeeklyXp = weeklyPeriodRaw === currentWeeklyXpPeriod
    ? parseStoredNumber(weeklyXpRaw)
    : 0;

  return {
    weekXP: currentWeeklyXp > 0 ? currentWeeklyXp : recoveredWeekPoints,
    streak: parseStoredNumber(streakRaw),
  };
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
      return N.cancelScheduledNotificationAsync(id).catch(() => {});
    }));
  } catch {}
}

// ── Запланировать ежедневное уведомление ─────────────────────────────────────
export const scheduleDailyReminder = async (
  hour: number = 19,
  minute: number = 0,
  lang: Lang = 'ru',
  opts: NotificationTargetOpts = {}
): Promise<void> => {
  try {
    const N = await getNotifications();
    if (!N) return;

    const hasPermission = await canUseNotifications(opts.requestPermission ?? true);
    if (!hasPermission) return;

    // Clean up both daily and old per-day reminders before creating the active reminder mode.
    await cancelScheduledNotificationsByType(N, ['reminder']);
    const prevId = await AsyncStorage.getItem(DAILY_REMINDER_ID_KEY);
    if (prevId) {
      await N.cancelScheduledNotificationAsync(prevId).catch(() => {});
    }
    const prevPerDayRaw = await AsyncStorage.getItem('per_day_notif_ids');
    if (prevPerDayRaw) {
      try {
        const ids: string[] = JSON.parse(prevPerDayRaw);
        await Promise.all(ids.map(id => N.cancelScheduledNotificationAsync(id).catch(() => {})));
      } catch {}
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
    await AsyncStorage.setItem('notification_hour', String(hour));
    await AsyncStorage.setItem('notification_minute', String(minute));
    await AsyncStorage.setItem('notifications_enabled', 'true');
  } catch {}
};

/** Ключи метаданных планирования (не самих payload). Сохранённые в sync с cancelAllScheduledNotificationsAsync. */
const NOTIFICATION_SCHEDULE_STORAGE_KEYS = [
  DAILY_REMINDER_ID_KEY,
  D1_PERSONALIZED_REMINDER_NOTIF_ID_KEY,
  'per_day_notif_ids',
  STREAK_WARNING_NOTIF_ID_KEY,
  PHRASE_OF_DAY_NOTIF_ID_KEY,
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

// ── Уведомление о потере цепочки ───────────────────────────────────────────────
export const sendStreakWarning = async (streak: number, lang: Lang = 'ru'): Promise<void> => {
  try {
    const N = await getNotifications();
    if (!N) return;

    // НЕ запрашиваем разрешение здесь: streak warning не должен поднимать
    // системный диалог push в произвольный момент (потеря цепочки).
    // Запрос разрешения идёт только через NotificationPermissionModal по условиям из _layout.tsx.
    const hasPermission = await canUseNotifications(false);
    if (!hasPermission) return;

    const _p = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
    const ruTitle = [`🔥 Цепочка ${streak} дней под угрозой!`, `⚠️ Твоя цепочка ${streak} дней может исчезнуть сегодня!`, `😱 ${streak} дней подряд в опасности — зайди сейчас!`, `🚨 Не сломай серию из ${streak} дней!`];
    const ukTitle = [`🔥 Стрік ${streak} днів під загрозою!`, `⚠️ Твій стрік ${streak} днів може зникнути сьогодні!`, `😱 ${streak} днів у небезпеці — зайди зараз!`, `🚨 Не зламай серію з ${streak} днів!`];
    const esTitle = [
      `🔥 ¡Tu racha de ${streak} días puede romperse!`,
      `⚠️ Vas ${streak} días seguidos; hoy no la desperdicies`,
      `😱 ¡${streak} días de constancia — no tires la toalla ahora!`,
      `🚨 No pierdas una racha de ${streak} días`,
    ];
    const _title = pickNotif(lang, notificationCopy({
      ru: _p(ruTitle),
      uk: _p(ukTitle),
      es: _p(esTitle),
      'pt-BR': _p([
        `🔥 Sua sequência de ${streak} dias está em risco!`,
        `⚠️ Sua sequência de ${streak} dias pode acabar hoje!`,
        `😱 ${streak} dias seguidos em perigo — entre agora!`,
        `🚨 Não quebre uma sequência de ${streak} dias!`,
      ]),
      vi: _p([
        `🔥 Chuỗi ${streak} ngày của bạn đang gặp nguy!`,
        `⚠️ Chuỗi ${streak} ngày có thể mất hôm nay!`,
        `😱 ${streak} ngày liên tiếp đang nguy hiểm — vào học ngay!`,
        `🚨 Đừng làm đứt chuỗi ${streak} ngày!`,
      ]),
      id: _p([
        `🔥 Streak ${streak} harimu terancam!`,
        `⚠️ Streak ${streak} hari bisa hilang hari ini!`,
        `😱 ${streak} hari berturut-turut dalam bahaya — buka sekarang!`,
        `🚨 Jangan putuskan streak ${streak} hari!`,
      ]),
      tr: _p([
        `🔥 ${streak} günlük serin riskte!`,
        `⚠️ ${streak} günlük serin bugün bitebilir!`,
        `😱 ${streak} gün üst üste emek tehlikede — şimdi gir!`,
        `🚨 ${streak} günlük seriyi bozma!`,
      ]),
      pl: _p([
        `🔥 Twoja seria ${streak} dni jest zagrożona!`,
        `⚠️ Seria ${streak} dni może dziś przepaść!`,
        `😱 ${streak} dni z rzędu wisi na włosku — wejdź teraz!`,
        `🚨 Nie przerwij serii ${streak} dni!`,
      ]),
    }));
    const ruBody = ['Ещё несколько часов и серия прервётся. Зайди сейчас!', 'Один урок — и цепочка сохранена. Ты можешь это! 💪', 'Не дай огню погаснуть! Один урок решает всё 🔥', '5 минут — и серия жива. Не останавливайся!'];
    const ukBody = ['Ще кілька годин і серія зірветься. Зайди зараз!', 'Один урок — і стрік збережено. Ти можеш це зробити! 💪', 'Не дай вогню згаснути! Один урок вирішує все 🔥', '5 хвилин — і серія жива. Не зупиняйся!'];
    const esBody = [
      'En unas horas se cortará la racha; entra cuando puedas.',
      'Con una sola lección la salvas. Vamos 💪',
      'No la dejes apagarse: una sesión marca la diferencia 🔥',
      'Cinco minutos y la racha sigue intacta.',
    ];
    const _body = pickNotif(lang, notificationCopy({
      ru: _p(ruBody),
      uk: _p(ukBody),
      es: _p(esBody),
      'pt-BR': _p([
        'Faltam poucas horas para a sequência acabar. Entre agora!',
        'Uma lição e a sequência continua. Você consegue! 💪',
        'Não deixe a chama apagar! Uma lição resolve tudo 🔥',
        'Cinco minutos e sua sequência segue viva.',
      ]),
      vi: _p([
        'Chỉ còn vài giờ nữa là chuỗi bị ngắt. Vào học ngay!',
        'Một bài học là giữ được chuỗi. Bạn làm được! 💪',
        'Đừng để ngọn lửa tắt! Một bài học là đủ 🔥',
        'Năm phút thôi, chuỗi vẫn còn.',
      ]),
      id: _p([
        'Tinggal beberapa jam sebelum streak putus. Buka sekarang!',
        'Satu pelajaran dan streak aman. Kamu bisa! 💪',
        'Jangan biarkan semangat padam! Satu pelajaran cukup 🔥',
        'Lima menit dan streak tetap hidup.',
      ]),
      tr: _p([
        'Serinin bitmesine birkaç saat kaldı. Şimdi gir!',
        'Bir dersle seri korunur. Yapabilirsin! 💪',
        'Ateşi söndürme! Bir ders her şeyi çözer 🔥',
        'Beş dakika ve seri yaşamaya devam eder.',
      ]),
      pl: _p([
        'Zostało kilka godzin, zanim seria się przerwie. Wejdź teraz!',
        'Jedna lekcja i seria ocalona. Dasz radę! 💪',
        'Nie pozwól, żeby ogień zgasł! Jedna lekcja wystarczy 🔥',
        'Pięć minut i seria trwa dalej.',
      ]),
    }));
    await N.scheduleNotificationAsync({
      content: { title: _title, body: _body, sound: false, data: { type: 'streak_warning' } },
      trigger: triggerInterval(2),
    });
  } catch {}
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

    const title = pickNotif(lang, notificationCopy({
      ru: `Вчера ты выучил ${phrasesLearned} фраз 🔥`,
      uk: `Вчора ти вивчив ${phrasesLearned} фраз 🔥`,
      es: `Ayer consolidaste ${phrasesLearned} frases nuevas 🔥`,
      'pt-BR': `Ontem você aprendeu ${phrasesLearned} frases 🔥`,
      vi: `Hôm qua bạn đã học ${phrasesLearned} cụm từ 🔥`,
      id: `Kemarin kamu mempelajari ${phrasesLearned} frasa 🔥`,
      tr: `Dün ${phrasesLearned} ifade öğrendin 🔥`,
      pl: `Wczoraj poznano ${phrasesLearned} zwrotów 🔥`,
    }));
    const body =
      streak > 0
        ? pickNotif(lang, notificationCopy({
            ru: `Цепочка ${streak} ${streak === 1 ? 'день' : streak < 5 ? 'дня' : 'дней'}. Сегодня +${phrasesLearned} — и ты уже не остановишься!`,
            uk: `Стрік ${streak} ${streak === 1 ? 'день' : 'дні'}. Сьогодні +${phrasesLearned} — і ти вже не зупинишся!`,
            es: `Racha de ${streak} ${streak === 1 ? 'día' : 'días'}. Si hoy sumas ${phrasesLearned} más, no habrá quien te pare.`,
            'pt-BR': `Sequência de ${streak} ${streak === 1 ? 'dia' : 'dias'}. Some mais ${phrasesLearned} hoje e você embala de vez!`,
            vi: `Chuỗi ${streak} ngày. Hôm nay thêm ${phrasesLearned} cụm từ nữa là bạn vào nhịp rồi!`,
            id: `Streak ${streak} hari. Tambah ${phrasesLearned} lagi hari ini, ritmenya makin kuat!`,
            tr: `${streak} günlük seri. Bugün ${phrasesLearned} ifade daha ekle, ritim otursun!`,
            pl: `Seria ${streak} ${streak === 1 ? 'dnia' : 'dni'}. Dodaj dziś ${phrasesLearned} zwrotów i utrzymaj tempo!`,
          }))
        : pickNotif(lang, notificationCopy({
            ru: `Ещё ${phrasesLearned} сегодня — и цепочка начнётся! Не останавливайся 💪`,
            uk: `Ще ${phrasesLearned} сьогодні — і стрік почнеться! Не зупиняйся 💪`,
            es: `${phrasesLearned} frases más hoy y arrancas una racha nueva. ¡Sigue! 💪`,
            'pt-BR': `Mais ${phrasesLearned} hoje e a sequência começa. Continue 💪`,
            vi: `Thêm ${phrasesLearned} cụm từ hôm nay là bạn bắt đầu chuỗi mới. Tiếp tục nhé 💪`,
            id: `Tambah ${phrasesLearned} frasa hari ini dan streak baru dimulai. Lanjut 💪`,
            tr: `Bugün ${phrasesLearned} ifade daha, yeni seri başlasın. Devam 💪`,
            pl: `Jeszcze ${phrasesLearned} zwrotów dziś i seria rusza. Nie zatrzymuj się 💪`,
          }));

    // Завтра в 20:20, чтобы не пересекаться с daily reminder и weekly recap
    const tomorrow = getNextD1PersonalizedReminderTime();
    const secondsUntil = Math.floor((tomorrow.getTime() - Date.now()) / 1000);
    if (secondsUntil <= 0) return;

    await cancelScheduledNotificationsByType(N, ['d1_reminder']);
    const prevD1Id = await AsyncStorage.getItem(D1_PERSONALIZED_REMINDER_NOTIF_ID_KEY);
    if (prevD1Id) await N.cancelScheduledNotificationAsync(prevD1Id).catch(() => {});

    const d1Id = await N.scheduleNotificationAsync({
      content: { title, body, sound: false, data: { type: 'd1_reminder' } },
      trigger: triggerInterval(secondsUntil),
    });
    await AsyncStorage.setItem(D1_PERSONALIZED_REMINDER_NOTIF_ID_KEY, d1Id);
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
    const _premTitle = pickNotif(lang, notificationCopy({
      ru: _pp(['🎉 Поздравляем с Premium!', '🏆 Premium активирован!', '✨ Ты теперь Premium!', '🚀 Premium — твой новый уровень!']),
      uk: _pp(['🎉 Вітаємо з Premium!', '🏆 Premium активовано!', '✨ Ти тепер Premium!', '🚀 Premium — твій новий рівень!']),
      es: _pp(['🎉 ¡Bienvenido a Premium!', '🏆 Premium activado', '✨ Ya eres usuario Premium', '🚀 Premium impulsa tu ritmo']),
      'pt-BR': _pp(['🎉 Bem-vindo ao Premium!', '🏆 Premium ativado!', '✨ Agora você é Premium!', '🚀 Premium é seu novo nível!']),
      vi: _pp(['🎉 Chào mừng bạn đến Premium!', '🏆 Premium đã kích hoạt!', '✨ Bạn đã là Premium!', '🚀 Premium mở cấp độ mới!']),
      id: _pp(['🎉 Selamat datang di Premium!', '🏆 Premium aktif!', '✨ Sekarang kamu Premium!', '🚀 Premium jadi level barumu!']),
      tr: _pp(['🎉 Premium’a hoş geldin!', '🏆 Premium etkin!', '✨ Artık Premium’sun!', '🚀 Premium yeni seviyen!']),
      pl: _pp(['🎉 Witaj w Premium!', '🏆 Premium aktywowane!', '✨ Masz już Premium!', '🚀 Premium to twój nowy poziom!']),
    }));
    const _premBody = pickNotif(lang, notificationCopy({
      ru: _pp([
        'Все 32 урока, квизы и диалоги теперь открыты для вас!',
        'Никаких ограничений — учись сколько хочешь! 🔥',
        'Весь контент в твоём распоряжении. Время покорять English! 💪',
        '32 урока, все квизы и диалоги — твои! Поехали! 🚀',
      ]),
      uk: _pp([
        'Усі 32 уроки, квізи та діалоги відкриті для вас!',
        'Жодних обмежень — вчи скільки хочеш! 🔥',
        'Весь контент у твоєму розпорядженні. Час завойовувати English! 💪',
        '32 уроки, всі квізи та діалоги — твої! Поїхали! 🚀',
      ]),
      es: _pp([
        'Tienes abiertas las 32 lecciones, los cuestionarios y los diálogos.',
        'Sin límites rigurosos: practica al ritmo que necesites 🔥',
        'Todo el contenido listo para llevar tu inglés al siguiente nivel 💪',
        '32 lecciones y retos avanzados te esperan: ¡vamos! 🚀',
      ]),
      'pt-BR': _pp([
        'As 32 lições, quizzes e diálogos estão liberados.',
        'Sem limites: pratique no seu ritmo 🔥',
        'Todo o conteúdo pronto para levar seu inglês adiante 💪',
        '32 lições e desafios avançados esperam por você. Vamos! 🚀',
      ]),
      vi: _pp([
        'Toàn bộ 32 bài học, quiz và hội thoại đã mở.',
        'Không giới hạn: học theo nhịp của bạn 🔥',
        'Tất cả nội dung đã sẵn sàng để nâng tiếng Anh của bạn 💪',
        '32 bài học và thử thách nâng cao đang chờ. Bắt đầu thôi! 🚀',
      ]),
      id: _pp([
        'Semua 32 pelajaran, kuis, dan dialog sudah terbuka.',
        'Tanpa batas: belajar sesuai ritmemu 🔥',
        'Semua konten siap membawa bahasa Inggrismu lebih jauh 💪',
        '32 pelajaran dan tantangan lanjutan menantimu. Ayo! 🚀',
      ]),
      tr: _pp([
        '32 dersin, quizlerin ve diyalogların tamamı açıldı.',
        'Sınır yok: kendi ritminde çalış 🔥',
        'Tüm içerik İngilizceni ileri taşımaya hazır 💪',
        '32 ders ve ileri seviye alıştırmalar seni bekliyor. Hadi! 🚀',
      ]),
      pl: _pp([
        'Wszystkie 32 lekcje, quizy i dialogi są odblokowane.',
        'Bez limitów: ćwicz we własnym tempie 🔥',
        'Cała zawartość jest gotowa, by podnieść twój angielski 💪',
        '32 lekcje i zaawansowane wyzwania czekają. Start! 🚀',
      ]),
    }));
    await N.scheduleNotificationAsync({
      content: { title: _premTitle, body: _premBody, sound: false, data: { type: 'premium' } },
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
  opts: NotificationTargetOpts = {}
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

  // Отменяем старые reminder-уведомления, включая orphaned ids после прошлых версий.
  await cancelScheduledNotificationsByType(N, ['reminder']);
  const prevPerDayRaw = await AsyncStorage.getItem('per_day_notif_ids');
  if (prevPerDayRaw) {
    const ids: string[] = JSON.parse(prevPerDayRaw);
    await Promise.all(ids.map(id => N.cancelScheduledNotificationAsync(id).catch(() => {})));
  }
  // Также отменяем старый daily reminder
  const prevId = await AsyncStorage.getItem(DAILY_REMINDER_ID_KEY);
  if (prevId) await N.cancelScheduledNotificationAsync(prevId).catch(() => {});
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

    const today = new Date().toISOString().split('T')[0];

    // Проверяем: цепочка > 0 и урок сегодня ещё не выполнен
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
      await cancelScheduledNotificationsByType(N, ['streak_warning']);
      const prevWarningId = await AsyncStorage.getItem(STREAK_WARNING_NOTIF_ID_KEY);
      if (prevWarningId) await N.cancelScheduledNotificationAsync(prevWarningId).catch(() => {});
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
          `🚨 Невероятная цепочка из ${streak} дней под угрозой!`,
          `😱 ${streak} дней — и всё может исчезнуть сегодня!`,
          `🏆 Легендарная цепочка ${streak} дней в опасности!`,
          `⚡ Не дай погаснуть ${streak}-дневной серии!`,
        ]),
        uk: _ps([
          `🚨 Неймовірний стрік ${streak} днів під загрозою!`,
          `😱 ${streak} днів — і все може зникнути сьогодні!`,
          `🏆 Стрік-легенда ${streak} днів у небезпеці!`,
          `⚡ Не дай згаснути ${streak}-денній серії!`,
        ]),
        es: _ps([
          `🚨 ¡Tu racha de ${streak} días corre peligro!`,
          `😱 ${streak} días seguidos podrían perderse hoy`,
          `🏆 Llevas ${streak} días como un campeón: no la sueltes`,
          `⚡ No dejes apagar una racha de ${streak} días`,
        ]),
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
          `Твой результат на грани! Один урок — и серия спасена 🔥`,
          `Столько усилий! Не останавливайся — один урок решает всё 💪`,
          `${streak} дней труда — не дай им исчезнуть! Зайди сейчас 🚀`,
          `Ты почти легенда. Один урок — и цепочка жива! ⭐`,
        ]),
        uk: _ps([
          `Твій результат на межі! Один урок — і серія спасена 🔥`,
          `Стільки зусиль! Не зупиняйся тепер — один урок вирішує все 💪`,
          `${streak} днів праці — не дай їм зникнути! Зайди зараз 🚀`,
          `Ти майже легенда. Один урок — і стрік живий! ⭐`,
        ]),
        es: _ps([
          `Estás al filo: con una lección la salvas 🔥`,
          `Tanto esfuerzo merece continuar: decide con una sesión 💪`,
          `${streak} días de constancia no se tiran ahora 🚀`,
          `Casi eres leyenda del club: sigue sumando ⭐`,
        ]),
        'pt-BR': _ps([
          `Seu progresso está no limite. Uma lição salva a sequência 🔥`,
          `Tanto esforço merece continuar: uma sessão resolve 💪`,
          `${streak} dias de prática não podem desaparecer agora 🚀`,
          `Você está quase no nível lenda. Uma lição mantém tudo vivo ⭐`,
        ]),
        vi: _ps([
          `Thành quả của bạn đang sát vạch. Một bài học là cứu được chuỗi 🔥`,
          `Bao nhiêu công sức rồi, đừng dừng lại: một bài là đủ 💪`,
          `${streak} ngày luyện tập không nên biến mất bây giờ 🚀`,
          `Bạn gần như là huyền thoại rồi. Một bài học giữ chuỗi sống ⭐`,
        ]),
        id: _ps([
          `Progresmu di ujung tanduk. Satu pelajaran menyelamatkan streak 🔥`,
          `Usaha sebesar ini layak lanjut: satu sesi cukup 💪`,
          `${streak} hari latihan jangan hilang sekarang 🚀`,
          `Kamu hampir jadi legenda. Satu pelajaran menjaga streak tetap hidup ⭐`,
        ]),
        tr: _ps([
          `Emeğin sınırda. Bir ders seriyi kurtarır 🔥`,
          `Bu kadar çaba devam etmeyi hak ediyor: bir oturum yeter 💪`,
          `${streak} günlük emek şimdi kaybolmasın 🚀`,
          `Neredeyse efsanesin. Bir ders seriyi canlı tutar ⭐`,
        ]),
        pl: _ps([
          `Twój wynik jest na krawędzi. Jedna lekcja ratuje serię 🔥`,
          `Tyle wysiłku warto ciągnąć dalej: jedna sesja wystarczy 💪`,
          `${streak} dni pracy nie powinno teraz zniknąć 🚀`,
          `Prawie jesteś legendą. Jedna lekcja utrzyma serię ⭐`,
        ]),
      }));
    } else if (streak >= 7) {
      title = pickNotif(lang, notificationCopy({
        ru: _ps([
          `🔥 Твоя цепочка ${streak} дней в опасности!`,
          `⚠️ ${streak} дней подряд под угрозой — действуй!`,
          `😤 Не сдавай ${streak}-дневную серию!`,
          `🎯 Цепочка из ${streak} дней ждёт тебя сегодня!`,
        ]),
        uk: _ps([
          `🔥 Твій стрік ${streak} днів у небезпеці!`,
          `⚠️ ${streak} дні під загрозою — діяй!`,
          `😤 Не здавай ${streak}-денню серію!`,
          `🎯 Стрік ${streak} днів чекає тебе сьогодні!`,
        ]),
        es: _ps([
          `🔥 Racha de ${streak} días en la cuerda floja`,
          `⚠️ ${streak} días seguidos: reacciona hoy`,
          `😤 No abandones una serie de ${streak} días`,
          `🎯 Tu racha ${streak} te espera en la app`,
        ]),
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
          `Не теряй накопленное! Один урок — и всё сохранено 💪`,
          `7+ дней усилий — не останавливайся сейчас! 🔥`,
          `Твоя цепочка заслуживает продолжения. Один урок — и ты молодец! ⭐`,
          `Зайди на 5 минут — и серия жива! 🚀`,
        ]),
        uk: _ps([
          `Не втрачай накопичене! Один урок — і все збережено 💪`,
          `7+ днів зусиль — не зупиняйся зараз! 🔥`,
          `Твій стрік заслуговує продовження. Один урок — і ти молодець! ⭐`,
          `Зайди на 5 хвилин — і серія жива! 🚀`,
        ]),
        es: _ps([
          `No pierdas lo ganado: una lección lo fija 💪`,
          `Llevas más de una semana firme — no frenes ahora 🔥`,
          `Tu constancia vale oro; un repaso rápido basta ⭐`,
          `Cinco minutos y la racha sigue contigo 🚀`,
        ]),
        'pt-BR': _ps([
          `Não perca o que já conquistou: uma lição mantém tudo 💪`,
          `Mais de uma semana de esforço — não pare agora 🔥`,
          `Sua constância vale ouro; uma revisão rápida basta ⭐`,
          `Cinco minutos e a sequência continua com você 🚀`,
        ]),
        vi: _ps([
          `Đừng mất những gì đã tích lũy: một bài học giữ lại tất cả 💪`,
          `Hơn một tuần cố gắng rồi — đừng dừng bây giờ 🔥`,
          `Sự đều đặn của bạn rất đáng giá; ôn nhanh là đủ ⭐`,
          `Năm phút thôi, chuỗi vẫn đi cùng bạn 🚀`,
        ]),
        id: _ps([
          `Jangan hilangkan yang sudah kamu kumpulkan: satu pelajaran cukup 💪`,
          `Lebih dari seminggu usaha — jangan berhenti sekarang 🔥`,
          `Konsistensimu berharga; review singkat cukup ⭐`,
          `Lima menit dan streak tetap bersamamu 🚀`,
        ]),
        tr: _ps([
          `Kazandığını kaybetme: bir ders yeter 💪`,
          `Bir haftadan fazla emek verdin — şimdi durma 🔥`,
          `İstikrarın değerli; kısa bir tekrar yeter ⭐`,
          `Beş dakika ve seri seninle kalır 🚀`,
        ]),
        pl: _ps([
          `Nie trać tego, co już zbudowano: jedna lekcja wystarczy 💪`,
          `Ponad tydzień pracy — nie zatrzymuj się teraz 🔥`,
          `Twoja regularność jest cenna; krótka powtórka wystarczy ⭐`,
          `Pięć minut i seria zostaje z tobą 🚀`,
        ]),
      }));
    } else {
      title = pickNotif(lang, notificationCopy({
        ru: _ps([
          `🔥 Цепочка ${streak} дней — не прерывай сегодня!`,
          `💪 ${streak} дней подряд — не останавливайся!`,
          `📚 Один урок — и цепочка сохранена!`,
          `⚡ Не пропусти сегодняшний урок!`,
        ]),
        uk: _ps([
          `🔥 Стрік ${streak} днів — не переривай сьогодні!`,
          `💪 ${streak} дні поспіль — не зупиняйся!`,
          `📚 Один урок — і стрік збережено!`,
          `⚡ Не пропусти сьогоднішній урок!`,
        ]),
        es: _ps([
          `🔥 ${streak} días de racha: no la cortes hoy`,
          `💪 ${streak} días seguidos y sumando`,
          `📚 Una lección bastará para guardarla`,
          `⚡ No dejes pasar tu sesión de hoy`,
        ]),
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
          `Ещё есть время! Один урок сохранит серию.`,
          `Начни — и уже через 5 минут цепочка будет сохранена! 🎯`,
          `Маленький шаг сегодня — большой результат завтра 🚀`,
          `Не давай привычке сломаться — зайди и сделай урок! 💪`,
        ]),
        uk: _ps([
          `Ще є час! Один урок збереже серію.`,
          `Почни — і вже за 5 хвилин стрік буде збережено! 🎯`,
          `Маленький крок сьогодні — великий результат завтра 🚀`,
          `Не давай звичці зламатися — зайди і зроби урок! 💪`,
        ]),
        es: _ps([
          `Aún queda margen; una clase la mantiene viva.`,
          `Empieza y en cinco minutos habrás cerrado el día 🎯`,
          `Pequeño esfuerzo hoy, gran fluidez mañana 🚀`,
          `No rompas la costumbre: entra y entrena 💪`,
        ]),
        'pt-BR': _ps([
          `Ainda dá tempo. Uma lição mantém a sequência.`,
          `Comece agora e em cinco minutos o dia estará fechado 🎯`,
          `Pequeno passo hoje, grande resultado amanhã 🚀`,
          `Não deixe o hábito quebrar: entre e faça uma lição 💪`,
        ]),
        vi: _ps([
          `Vẫn còn thời gian. Một bài học giữ được chuỗi.`,
          `Bắt đầu đi, năm phút nữa là bạn đã hoàn thành hôm nay 🎯`,
          `Bước nhỏ hôm nay, kết quả lớn ngày mai 🚀`,
          `Đừng để thói quen gãy: vào app và học một bài 💪`,
        ]),
        id: _ps([
          `Masih ada waktu. Satu pelajaran menjaga streak.`,
          `Mulai sekarang, lima menit lagi harimu selesai 🎯`,
          `Langkah kecil hari ini, hasil besar besok 🚀`,
          `Jangan biarkan kebiasaan putus: buka dan kerjakan satu pelajaran 💪`,
        ]),
        tr: _ps([
          `Hâlâ zaman var. Bir ders seriyi korur.`,
          `Başla; beş dakika içinde günü tamamlamış olursun 🎯`,
          `Bugün küçük adım, yarın büyük sonuç 🚀`,
          `Alışkanlığın kırılmasına izin verme: gir ve bir ders yap 💪`,
        ]),
        pl: _ps([
          `Wciąż jest czas. Jedna lekcja utrzyma serię.`,
          `Zacznij, a za pięć minut dzień będzie zamknięty 🎯`,
          `Mały krok dziś, duży efekt jutro 🚀`,
          `Nie pozwól przerwać nawyku: wejdź i zrób lekcję 💪`,
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
  } catch {}
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

    const now = new Date();
    const { weekXP, streak } = await readWeeklyRecapStatsForNotification(now);
    const nextSunday = getNextWeeklyRecapTime(now);
    const secondsUntil = Math.max(1, Math.floor((nextSunday.getTime() - now.getTime()) / 1000));

    const _pw = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
    const title = pickNotif(lang, notificationCopy({
      ru: _pw(['📊 Итоги недели', '🏆 Твоя неделя в цифрах', '🔥 Как прошла твоя неделя?', '⭐ Еженедельный отчёт готов!']),
      uk: _pw(['📊 Підсумок тижня', '🏆 Твій тиждень у цифрах', '🔥 Як пройшов твій тиждень?', '⭐ Тижневий звіт готовий!']),
      es: _pw(['📊 Resumen semanal', '🏆 Tu semana en datos', '🔥 ¿Cómo te fue?', '⭐ ¡Listo tu informe semanal!']),
      'pt-BR': _pw(['📊 Resumo da semana', '🏆 Sua semana em números', '🔥 Como foi sua semana?', '⭐ Seu relatório semanal está pronto!']),
      vi: _pw(['📊 Tổng kết tuần', '🏆 Tuần của bạn qua số liệu', '🔥 Tuần này của bạn thế nào?', '⭐ Báo cáo tuần đã sẵn sàng!']),
      id: _pw(['📊 Ringkasan mingguan', '🏆 Minggumu dalam angka', '🔥 Bagaimana minggu ini?', '⭐ Laporan mingguan siap!']),
      tr: _pw(['📊 Haftalık özet', '🏆 Haftan rakamlarla', '🔥 Haftan nasıl geçti?', '⭐ Haftalık rapor hazır!']),
      pl: _pw(['📊 Podsumowanie tygodnia', '🏆 Twój tydzień w liczbach', '🔥 Jak minął tydzień?', '⭐ Raport tygodniowy gotowy!']),
    }));
    const body = pickNotif(lang, notificationCopy({
      ru: _pw([
        `Цепочка: ${streak} 🔥 · XP за неделю: ${weekXP} ⭐ — так держать!`,
        `Ты сделал ${streak} дней подряд! За неделю: ${weekXP} XP ⭐ Продолжай в том же духе! 💪`,
        `${weekXP} XP за неделю — ты движешься к цели! 🚀 Цепочка: ${streak} 🔥`,
        `Невероятная неделя! Цепочка ${streak} дней · ${weekXP} XP. Молодец! 🎯`,
      ]),
      uk: _pw([
        `Стрік: ${streak} 🔥 · XP за тиждень: ${weekXP} ⭐ — так тримати!`,
        `Ти зробив ${streak} днів поспіль! За тиждень: ${weekXP} XP ⭐ Продовжуй у тому ж дусі! 💪`,
        `${weekXP} XP за тиждень — ти рухаєшся до мети! 🚀 Стрік: ${streak} 🔥`,
        `Неймовірний тиждень! Стрік ${streak} днів · ${weekXP} XP. Ти молодець! 🎯`,
      ]),
      es: _pw([
        `Racha: ${streak} 🔥 · XP semanal: ${weekXP} ⭐ ¡sigue así!`,
        `${streak} días seguidos y ${weekXP} XP esta semana; mantén el impulso 💪`,
        `+${weekXP} XP esta semana: vas en serio 🚀 Racha ${streak} 🔥`,
        `Semana redonda: racha ${streak} · ${weekXP} XP. Buen trabajo 🎯`,
      ]),
      'pt-BR': _pw([
        `Sequência: ${streak} 🔥 · XP da semana: ${weekXP} ⭐ Continue assim!`,
        `${streak} dias seguidos e ${weekXP} XP na semana. Mantenha o ritmo 💪`,
        `+${weekXP} XP nesta semana: você está avançando 🚀 Sequência ${streak} 🔥`,
        `Semana forte: sequência ${streak} · ${weekXP} XP. Muito bem 🎯`,
      ]),
      vi: _pw([
        `Chuỗi: ${streak} 🔥 · XP tuần này: ${weekXP} ⭐ Cứ tiếp tục nhé!`,
        `${streak} ngày liên tiếp và ${weekXP} XP tuần này. Giữ nhịp nào 💪`,
        `+${weekXP} XP tuần này: bạn đang tiến lên 🚀 Chuỗi ${streak} 🔥`,
        `Một tuần thật tốt: chuỗi ${streak} · ${weekXP} XP. Làm tốt lắm 🎯`,
      ]),
      id: _pw([
        `Streak: ${streak} 🔥 · XP minggu ini: ${weekXP} ⭐ Pertahankan!`,
        `${streak} hari berturut-turut dan ${weekXP} XP minggu ini. Jaga ritme 💪`,
        `+${weekXP} XP minggu ini: kamu terus maju 🚀 Streak ${streak} 🔥`,
        `Minggu yang kuat: streak ${streak} · ${weekXP} XP. Mantap 🎯`,
      ]),
      tr: _pw([
        `Seri: ${streak} 🔥 · Haftalık XP: ${weekXP} ⭐ Böyle devam!`,
        `${streak} gün üst üste ve bu hafta ${weekXP} XP. Ritmi koru 💪`,
        `Bu hafta +${weekXP} XP: ilerliyorsun 🚀 Seri ${streak} 🔥`,
        `Güçlü hafta: seri ${streak} · ${weekXP} XP. Harika iş 🎯`,
      ]),
      pl: _pw([
        `Seria: ${streak} 🔥 · XP w tygodniu: ${weekXP} ⭐ Tak trzymaj!`,
        `${streak} dni z rzędu i ${weekXP} XP w tym tygodniu. Utrzymaj tempo 💪`,
        `+${weekXP} XP w tym tygodniu: idziesz do przodu 🚀 Seria ${streak} 🔥`,
        `Mocny tydzień: seria ${streak} · ${weekXP} XP. Dobra robota 🎯`,
      ]),
    }));

    await cancelScheduledNotificationsByType(N, ['weekly_recap']);
    const prevWeeklyId = await AsyncStorage.getItem(WEEKLY_RECAP_NOTIF_ID_KEY);
    if (prevWeeklyId) await N.cancelScheduledNotificationAsync(prevWeeklyId).catch(() => {});

    const weeklyId = await N.scheduleNotificationAsync({
      content: { title, body, sound: false, data: { type: 'weekly_recap' } },
      trigger: triggerInterval(secondsUntil),
    });

    await AsyncStorage.setItem(WEEKLY_RECAP_NOTIF_ID_KEY, weeklyId);
    await AsyncStorage.setItem('weekly_recap_scheduled', nextSunday.toISOString().split('T')[0]);
  } catch {}
};

export const scheduleWeeklyRecapNotification = (
  lang: Lang = 'ru',
  opts: NotificationTargetOpts = {},
): Promise<void> => {
  const next = weeklyRecapScheduleLock.then(() => scheduleWeeklyRecapNotificationUnlocked(lang, opts));
  weeklyRecapScheduleLock = next.catch(() => {});
  return next;
};

let weeklyRecapRefreshTimer: ReturnType<typeof setTimeout> | null = null;

export function refreshWeeklyRecapNotificationAfterXpChange(langHint?: Lang): void {
  if (weeklyRecapRefreshTimer) clearTimeout(weeklyRecapRefreshTimer);
  weeklyRecapRefreshTimer = setTimeout(() => {
    weeklyRecapRefreshTimer = null;
    void (async () => {
      const enabled = await AsyncStorage.getItem('notifications_enabled').catch(() => null);
      if (enabled !== 'true') return;
      const storedLang = langHint ?? (await AsyncStorage.getItem('app_lang').catch(() => null));
      const lang = normalizeNotificationLang(storedLang);
      await scheduleWeeklyRecapNotification(lang, { requestPermission: false });
    })().catch(() => {});
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

    const studyTarget = await resolveNotificationStudyTarget(lang, opts.studyTarget);
    const [xpRaw, streakRaw, lessons] = await Promise.all([
      AsyncStorage.getItem('user_total_xp'),
      AsyncStorage.getItem('streak_count'),
      countCompletedLessonsFromStorage(studyTarget),
    ]);
    const totalXP = parseInt(xpRaw || '0') || 0;
    const streak = parseInt(streakRaw || '0') || 0;

    // Первое число следующего месяца в 10:00
    const now = new Date();
    const firstNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 10, 0, 0, 0);
    const secondsUntil = Math.max(1, Math.floor((firstNextMonth.getTime() - now.getTime()) / 1000));

    const title = pickNotif(lang, notificationCopy({
      ru: '🏆 Твой месяц в цифрах',
      uk: '🏆 Твій місяць у цифрах',
      es: '🏆 Tu mes en cifras',
      'pt-BR': '🏆 Seu mês em números',
      vi: '🏆 Tháng của bạn qua số liệu',
      id: '🏆 Bulanmu dalam angka',
      tr: '🏆 Ayın rakamlarla',
      pl: '🏆 Twój miesiąc w liczbach',
    }));
    const body = pickNotif(lang, notificationCopy({
      ru: `Уроков: ${lessons} · Цепочка: ${streak} 🔥 · XP: ${totalXP} ⭐`,
      uk: `Уроків: ${lessons} · Стрік: ${streak} 🔥 · XP: ${totalXP} ⭐`,
      es: `Lecciones: ${lessons} · Racha: ${streak} 🔥 · XP: ${totalXP} ⭐`,
      'pt-BR': `Lições: ${lessons} · Sequência: ${streak} 🔥 · XP: ${totalXP} ⭐`,
      vi: `Bài học: ${lessons} · Chuỗi: ${streak} 🔥 · XP: ${totalXP} ⭐`,
      id: `Pelajaran: ${lessons} · Streak: ${streak} 🔥 · XP: ${totalXP} ⭐`,
      tr: `Ders: ${lessons} · Seri: ${streak} 🔥 · XP: ${totalXP} ⭐`,
      pl: `Lekcje: ${lessons} · Seria: ${streak} 🔥 · XP: ${totalXP} ⭐`,
    }));

    await cancelScheduledNotificationsByType(N, ['monthly_recap']);
    const prevMonthlyId = await AsyncStorage.getItem(MONTHLY_RECAP_NOTIF_ID_KEY);
    if (prevMonthlyId) await N.cancelScheduledNotificationAsync(prevMonthlyId).catch(() => {});

    const monthlyId = await N.scheduleNotificationAsync({
      content: { title, body, sound: false, data: { type: 'monthly_recap' } },
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
    const title = pickNotif(lang, notificationCopy({
      ru: _po(ruT),
      uk: _po(ukT),
      es: _po(esT),
      'pt-BR': _po([
        `😤 ${leaderName} passou você no clube!`,
        `⚔️ ${leaderName} abriu vantagem. Sua vez!`,
        `🔥 ${leaderName} está subindo — não perca o ritmo`,
        `😱 Você foi ultrapassado! ${leaderName} está na frente agora.`,
      ]),
      vi: _po([
        `😤 ${leaderName} đã vượt bạn trong câu lạc bộ!`,
        `⚔️ ${leaderName} đã vươn lên. Đến lượt bạn!`,
        `🔥 ${leaderName} đang leo hạng — đừng mất nhịp`,
        `😱 Bạn đã bị vượt! ${leaderName} đang ở phía trước.`,
      ]),
      id: _po([
        `😤 ${leaderName} melewatimu di klub!`,
        `⚔️ ${leaderName} unggul. Giliranmu!`,
        `🔥 ${leaderName} naik peringkat — jangan kehilangan ritme`,
        `😱 Kamu tersalip! ${leaderName} sekarang di depan.`,
      ]),
      tr: _po([
        `😤 ${leaderName} kulüpte seni geçti!`,
        `⚔️ ${leaderName} öne geçti. Sıra sende!`,
        `🔥 ${leaderName} yükseliyor — ritmi kaybetme`,
        `😱 Geçildin! ${leaderName} artık önde.`,
      ]),
      pl: _po([
        `😤 ${leaderName} wyprzedza cię w klubie!`,
        `⚔️ ${leaderName} wysunął się do przodu. Twoja kolej!`,
        `🔥 ${leaderName} pnie się w górę — nie trać tempa`,
        `😱 Ktoś cię wyprzedził! ${leaderName} jest teraz przed tobą.`,
      ]),
    }));
    const ruB = [`Ты на ${currentRank} месте. Отвечай прямо сейчас!`, `${currentRank} место — это временно. Один урок вернёт лидерство!`, `Покажи ${leaderName} кто тут настоящий лингвист! 💪`, `Время ответить! Верни своё место в рейтинге. 🎯`];
    const ukB = [`Ти на ${currentRank} місці. Відповідай прямо зараз!`, `${currentRank} місце — це тимчасово. Один урок поверне лідерство!`, `Покажи ${leaderName} хто тут справжній лінгвіст! 💪`, `Час дати відповідь! Поверни своє місце в рейтингу. 🎯`];
    const esB = [`Estás en el puesto ${currentRank}: contesta cuando puedas`, `El ${currentRank} es solo provisional; recupera tu sitio en una sesión`, `Enséñale a ${leaderName} quién marca el ritmo 💪`, `Reacciona y vuelve a subir posiciones 🎯`];
    const body = pickNotif(lang, notificationCopy({
      ru: _po(ruB),
      uk: _po(ukB),
      es: _po(esB),
      'pt-BR': _po([
        `Você está em ${currentRank}º lugar. Responda agora!`,
        `${currentRank}º lugar é só temporário. Uma lição pode mudar tudo!`,
        `Mostre a ${leaderName} quem dita o ritmo 💪`,
        `Hora de reagir e recuperar posições 🎯`,
      ]),
      vi: _po([
        `Bạn đang ở hạng ${currentRank}. Đáp lại ngay!`,
        `Hạng ${currentRank} chỉ là tạm thời. Một bài học có thể đổi cục diện!`,
        `Cho ${leaderName} thấy ai mới là người giữ nhịp 💪`,
        `Đến lúc phản công và leo hạng lại 🎯`,
      ]),
      id: _po([
        `Kamu di peringkat ${currentRank}. Balas sekarang!`,
        `Peringkat ${currentRank} hanya sementara. Satu pelajaran bisa mengubahnya!`,
        `Tunjukkan pada ${leaderName} siapa yang memimpin ritme 💪`,
        `Waktunya merespons dan naik lagi 🎯`,
      ]),
      tr: _po([
        `${currentRank}. sıradasın. Şimdi karşılık ver!`,
        `${currentRank}. sıra geçici. Bir ders her şeyi değiştirebilir!`,
        `${leaderName} kimin ritmi belirlediğini görsün 💪`,
        `Cevap verme ve yeniden yükselme zamanı 🎯`,
      ]),
      pl: _po([
        `Jesteś na miejscu ${currentRank}. Odpowiedz teraz!`,
        `Miejsce ${currentRank} jest tylko chwilowe. Jedna lekcja może zmienić układ!`,
        `Pokaż ${leaderName}, kto trzyma tempo 💪`,
        `Czas zareagować i wrócić wyżej 🎯`,
      ]),
    }));

    await N.scheduleNotificationAsync({
      content: { title, body, sound: false, data: { type: 'league_overtake' } },
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
  opts: NotificationTargetOpts = {}
): Promise<void> => {
  try {
    const N = await getNotifications();
    if (!N) return;
    const studyTarget = await resolveNotificationStudyTarget(lang, opts.studyTarget);
    if (studyTarget === 'fr') {
      await cancelScheduledNotificationsByType(N, ['phrase_of_day']);
      const prevPhraseId = await AsyncStorage.getItem(PHRASE_OF_DAY_NOTIF_ID_KEY);
      if (prevPhraseId) await N.cancelScheduledNotificationAsync(prevPhraseId).catch(() => {});
      await AsyncStorage.removeItem('phrase_notif_scheduled');
      await AsyncStorage.removeItem(PHRASE_OF_DAY_NOTIF_ID_KEY);
      return;
    }
    const hasPermission = await canUseNotifications(opts.requestPermission ?? true);
    if (!hasPermission) return;

    const today = new Date().toISOString().split('T')[0];

    // Получить фразу дня
    const phrase = await getTodayPhraseForTarget(studyTarget);
    if (!phrase) return;

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
    const TEASERS_PT_BR = [
      `"${phrase.english}" — você sabe o que significa? 👀`,
      `"${phrase.english}" — abra o app para descobrir o sentido ✨`,
      `"${phrase.english}" — nativos usam isso todo dia. Você sabe por quê? 🤔`,
      `"${phrase.english}" — não é bem o que parece 😏`,
      `"${phrase.english}" — uma frase para subir o nível do seu inglês 🚀`,
    ];
    const TEASERS_VI = [
      `"${phrase.english}" — bạn biết nghĩa là gì không? 👀`,
      `"${phrase.english}" — mở app để xem ý nghĩa ✨`,
      `"${phrase.english}" — người bản xứ nói vậy hằng ngày. Bạn biết vì sao chưa? 🤔`,
      `"${phrase.english}" — không hẳn như bạn nghĩ đâu 😏`,
      `"${phrase.english}" — một cụm từ giúp tiếng Anh của bạn lên cấp 🚀`,
    ];
    const TEASERS_ID = [
      `"${phrase.english}" — tahu artinya? 👀`,
      `"${phrase.english}" — buka aplikasi untuk melihat maknanya ✨`,
      `"${phrase.english}" — native speaker memakainya setiap hari. Kamu tahu kenapa? 🤔`,
      `"${phrase.english}" — bukan seperti yang kamu kira 😏`,
      `"${phrase.english}" — satu frasa untuk menaikkan level bahasa Inggrismu 🚀`,
    ];
    const TEASERS_TR = [
      `"${phrase.english}" — ne anlama geldiğini biliyor musun? 👀`,
      `"${phrase.english}" — anlamını görmek için uygulamayı aç ✨`,
      `"${phrase.english}" — native speaker'lar bunu her gün söyler. Nedenini biliyor musun? 🤔`,
      `"${phrase.english}" — düşündüğün şey olmayabilir 😏`,
      `"${phrase.english}" — İngilizceni bir seviye yükseltecek tek ifade 🚀`,
    ];
    const TEASERS_PL = [
      `"${phrase.english}" — wiesz, co to znaczy? 👀`,
      `"${phrase.english}" — otwórz aplikację i sprawdź sens ✨`,
      `"${phrase.english}" — native speakerzy mówią tak codziennie. Wiesz dlaczego? 🤔`,
      `"${phrase.english}" — to nie całkiem to, co myślisz 😏`,
      `"${phrase.english}" — jeden zwrot, który podnosi poziom angielskiego 🚀`,
    ];
    const teasers = pickNotif(lang, notificationCopy({
      ru: TEASERS_RU,
      uk: TEASERS_UK,
      es: TEASERS_ES,
      'pt-BR': TEASERS_PT_BR,
      vi: TEASERS_VI,
      id: TEASERS_ID,
      tr: TEASERS_TR,
      pl: TEASERS_PL,
    }));
    const teaserIdx = getDayIndex() % teasers.length;
    const title = pickNotif(lang, notificationCopy({
      ru: '☀️ Фраза дня',
      uk: '☀️ Фраза дня',
      es: '☀️ Frase del día',
      'pt-BR': '☀️ Frase do dia',
      vi: '☀️ Cụm từ hôm nay',
      id: '☀️ Frasa hari ini',
      tr: '☀️ Günün ifadesi',
      pl: '☀️ Zwrot dnia',
    }));
    const body = teasers[teaserIdx];

    await cancelScheduledNotificationsByType(N, ['phrase_of_day']);
    const prevPhraseId = await AsyncStorage.getItem(PHRASE_OF_DAY_NOTIF_ID_KEY);
    if (prevPhraseId) await N.cancelScheduledNotificationAsync(prevPhraseId).catch(() => {});

    const phraseId = await N.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: false,
        data: { type: 'phrase_of_day', phraseId: phrase.english },
      },
      trigger: triggerInterval(secondsUntil),
    });

    await AsyncStorage.setItem('phrase_notif_scheduled', today);
    await AsyncStorage.setItem(PHRASE_OF_DAY_NOTIF_ID_KEY, phraseId);
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
            void (async () => {
              await reserveArenaGameEntry(String(data.sessionId), 'notification');
              router.push({
                pathname: '/arena_game' as any,
                params: { sessionId: data.sessionId, userId: data.userId },
              });
            })();
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
          navTabHome();
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
