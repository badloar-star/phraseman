// notifications.ts
// Push-уведомления для Phraseman
// ВАЖНО: expo-notifications НЕ работает в Expo Go
// Используем lazy import с try/catch — приложение не падает без нативного модуля

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTodayPhrase } from './daily_phrase_system';

const getDayIndex = () => Math.floor(Date.now() / 86400000);

// Lazy-загрузка модуля — не падает в Expo Go
let Notifications: any = null;
const getNotifications = async () => {
  if (Notifications) return Notifications;
  try {
    Notifications = await import('expo-notifications');
    // Настройка поведения
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    return Notifications;
  } catch {
    return null;
  }
};

// ── Запрос разрешений ────────────────────────────────────────────────────────
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    const N = await getNotifications();
    if (!N) return false;
    if (Platform.OS === 'web') return false;

    const { status: existing } = await N.getPermissionsAsync();
    if (existing === 'granted') return true;

    const { status } = await N.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
};

// ── Мотивационные сообщения ──────────────────────────────────────────────────
const MESSAGES_RU = [
  { title: '🔥 Стрик ждёт тебя!',        body: 'Не прерывай серию — 5 минут в день изменят всё' },
  { title: '📚 Время для English',         body: 'Один урок сегодня — уверенность на всю жизнь' },
  { title: '⭐ Обгони соперника!',          body: 'Анна опередила тебя в лиге. Ответный ход?' },
  { title: '🎯 Ежедневная цель',           body: 'Осталось совсем немного до завершения заданий!' },
  { title: '💪 Не останавливайся!',        body: 'Ты уже столько прошёл. Продолжи сегодня' },
  { title: '🧠 Повтори вчерашнее',         body: 'Лучшее время для повторения — сейчас' },
];

const MESSAGES_UK = [
  { title: '🔥 Стрік чекає тебе!',         body: 'Не переривай серію — 5 хвилин на день змінять все' },
  { title: '📚 Час для English',            body: 'Один урок сьогодні — впевненість на все життя' },
  { title: '⭐ Обжени суперника!',           body: 'Анна обігнала тебе в лізі. Час дати відповідь?' },
  { title: '🎯 Щоденна ціль',              body: 'Залишилось зовсім небагато до завершення завдань!' },
  { title: '💪 Не зупиняйся!',             body: 'Ти вже стільки пройшов. Продовж сьогодні' },
  { title: '🧠 Повтори вчорашнє',          body: 'Найкращий час для повторення — зараз' },
];

// ── Запланировать ежедневное уведомление ─────────────────────────────────────
export const scheduleDailyReminder = async (
  hour: number = 19,
  minute: number = 0,
  lang: 'ru' | 'uk' = 'ru'
): Promise<void> => {
  try {
    const N = await getNotifications();
    if (!N) return; // Expo Go или нет модуля — тихо выходим

    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return;

    await N.cancelAllScheduledNotificationsAsync();

    const messages = lang === 'uk' ? MESSAGES_UK : MESSAGES_RU;
    const msg = messages[Math.floor(Math.random() * messages.length)];

    await N.scheduleNotificationAsync({
      content: {
        title: msg.title,
        body: msg.body,
        sound: true,
      },
      trigger: {
        hour,
        minute,
        repeats: true,
      } as any,
    });

    await AsyncStorage.setItem('notification_hour', String(hour));
    await AsyncStorage.setItem('notification_minute', String(minute));
    await AsyncStorage.setItem('notifications_enabled', 'true');
  } catch (e) {
  }
};

// ── Отменить все уведомления ─────────────────────────────────────────────────
export const cancelAllNotifications = async (): Promise<void> => {
  try {
    const N = await getNotifications();
    if (!N) return;
    await N.cancelAllScheduledNotificationsAsync();
  } catch {}
  await AsyncStorage.setItem('notifications_enabled', 'false');
};

// ── Уведомление о потере стрика ───────────────────────────────────────────────
export const sendStreakWarning = async (streak: number, lang: 'ru' | 'uk' = 'ru'): Promise<void> => {
  try {
    const N = await getNotifications();
    if (!N) return;

    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return;

    await N.scheduleNotificationAsync({
      content: {
        title: lang === 'uk'
          ? `🔥 Стрік ${streak} днів під загрозою!`
          : `🔥 Стрик ${streak} дней под угрозой!`,
        body: lang === 'uk'
          ? 'Ще кілька годин і серія зірветься. Зайди зараз!'
          : 'Ещё несколько часов и серия прервётся. Зайди сейчас!',
        sound: true,
      },
      trigger: { seconds: 2 } as any,
    });
  } catch {}
};

// ── Уведомление об активации Premium ─────────────────────────────────────────
export const sendPremiumNotification = async (lang: 'ru' | 'uk' = 'ru'): Promise<void> => {
  try {
    const N = await getNotifications();
    if (!N) return;
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return;
    await N.scheduleNotificationAsync({
      content: {
        title: lang === 'uk' ? '🎉 Вітаємо з Premium!' : '🎉 Поздравляем с Premium!',
        body: lang === 'uk'
          ? 'Усі 32 уроки, квізи та діалоги відкриті для вас!'
          : 'Все 32 урока, квизы и диалоги теперь открыты для вас!',
        sound: true,
      },
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

export const loadNotifSettings = async (): Promise<NotifSettings> => {
  try {
    const raw = await AsyncStorage.getItem('notif_settings_v2');
    if (raw) return JSON.parse(raw) as NotifSettings;
  } catch {}
  return DEFAULT_NOTIF;
};

export const saveNotifSettings = async (s: NotifSettings): Promise<void> => {
  try {
    await AsyncStorage.setItem('notif_settings_v2', JSON.stringify(s));
  } catch {}
};

export const scheduleNotifications = async (
  s: NotifSettings,
  lang: string,
  _n: number
): Promise<void> => {
  const anyEnabled = Object.values(s.schedule).some(d => d.enabled);
  if (!anyEnabled) { await cancelAllNotifications(); return; }
  const first = Object.values(s.schedule).find(d => d.enabled);
  if (first) await scheduleDailyReminder(first.hour, first.minute, lang as 'ru'|'uk');
};

// ── Авто-предупреждение о потере стрика (планируется на вечер текущего дня) ──
// Вызывается при старте приложения, если стрик > 0 и урок сегодня ещё не пройден.
// Персонализированные сообщения в зависимости от длины стрика.
export const scheduleStreakWarningIfNeeded = async (lang: 'ru' | 'uk' = 'ru'): Promise<void> => {
  try {
    const N = await getNotifications();
    if (!N) return;
    const hasPermission = await requestNotificationPermission();
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

    if (streak >= 15) {
      // Очень высокий стрик — сильный мотив
      title = lang === 'uk'
        ? `🚨 Неймовірний стрік ${streak} днів під загрозою!`
        : `🚨 Невероятный стрик ${streak} дней под угрозой!`;
      body = lang === 'uk'
        ? `Твій звдвижний результат на межі! Один урок — и серія спасена 🔥`
        : `Твой невероятный результат на грани! Один урок — и серия спасена 🔥`;
    } else if (streak >= 7) {
      // Хороший стрик — мотивирующее сообщение
      title = lang === 'uk'
        ? `🔥 Твій стрік ${streak} днів у небезпеці!`
        : `🔥 Твой стрик ${streak} дней в опасности!`;
      body = lang === 'uk'
        ? `Не втрачай накопичене! Один урок — і все збережено 💪`
        : `Не теряй накопленное! Один урок — и всё сохранено 💪`;
    } else {
      // Начинающий стрик — простое напоминание
      title = lang === 'uk'
        ? `🔥 Стрік ${streak} днів — не переривай сьогодні!`
        : `🔥 Стрик ${streak} дней — не прерывай сегодня!`;
      body = lang === 'uk'
        ? `Ще є час! Один урок збереже серію.`
        : `Ещё есть время! Один урок сохранит серию.`;
    }

    await N.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: { seconds: secondsUntil } as any,
    });

    await AsyncStorage.setItem('streak_warning_scheduled', today);
  } catch {}
};

// ── Weekly Recap уведомление ──────────────────────────────────────────────────
// Планируется на ближайшее воскресенье в 20:00
// Содержимое персонализируется по текущим данным в AsyncStorage
export const scheduleWeeklyRecapNotification = async (lang: 'ru' | 'uk' = 'ru'): Promise<void> => {
  try {
    const N = await getNotifications();
    if (!N) return;
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return;

    // Читаем текущую статистику
    const [xpRaw, streakRaw] = await Promise.all([
      AsyncStorage.getItem('user_total_xp'),
      AsyncStorage.getItem('lesson_streak'),
    ]);
    const totalXP = parseInt(xpRaw || '0') || 0;
    const streak = parseInt(streakRaw || '0') || 0;

    // Считаем дни до ближайшего воскресенья (day 0)
    const now = new Date();
    const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + daysUntilSunday);
    nextSunday.setHours(20, 0, 0, 0);
    const secondsUntil = Math.floor((nextSunday.getTime() - now.getTime()) / 1000);

    const title = lang === 'uk'
      ? '📊 Підсумок тижня'
      : '📊 Итоги недели';
    const body = lang === 'uk'
      ? `Стрік: ${streak} 🔥 · Всього XP: ${totalXP} ⭐ — так тримати!`
      : `Стрик: ${streak} 🔥 · Всего XP: ${totalXP} ⭐ — так держать!`;

    await N.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: { seconds: secondsUntil } as any,
    });

    await AsyncStorage.setItem('weekly_recap_scheduled', nextSunday.toISOString().split('T')[0]);
  } catch {}
};

// ── Monthly Recap уведомление ─────────────────────────────────────────────────
// Планируется на 1-е следующего месяца в 10:00
export const scheduleMonthlyRecapNotification = async (lang: 'ru' | 'uk' = 'ru'): Promise<void> => {
  try {
    const N = await getNotifications();
    if (!N) return;
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return;

    const [xpRaw, streakRaw, lessonsRaw] = await Promise.all([
      AsyncStorage.getItem('user_total_xp'),
      AsyncStorage.getItem('lesson_streak'),
      AsyncStorage.getItem('lessons_completed_count'),
    ]);
    const totalXP = parseInt(xpRaw || '0') || 0;
    const streak = parseInt(streakRaw || '0') || 0;
    const lessons = parseInt(lessonsRaw || '0') || 0;

    // Первое число следующего месяца в 10:00
    const now = new Date();
    const firstNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 10, 0, 0, 0);
    const secondsUntil = Math.floor((firstNextMonth.getTime() - now.getTime()) / 1000);

    const title = lang === 'uk'
      ? '🏆 Твій місяць у цифрах'
      : '🏆 Твой месяц в цифрах';
    const body = lang === 'uk'
      ? `Уроків: ${lessons} · Стрік: ${streak} 🔥 · XP: ${totalXP} ⭐`
      : `Уроков: ${lessons} · Стрик: ${streak} 🔥 · XP: ${totalXP} ⭐`;

    await N.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: { seconds: secondsUntil } as any,
    });

    await AsyncStorage.setItem('monthly_recap_scheduled', firstNextMonth.toISOString().split('T')[0]);
  } catch {}
};

// ── «Соперник обогнал тебя в лиге» — локальное уведомление ──────────────────
// Вызывается при старте приложения. Сравниваем сохранённый ранг с текущим.
// Если ранг ухудшился (стали ниже) — отправляем немедленное уведомление.
export const checkLeagueOvertakeNotification = async (
  currentRank: number,
  leaderName: string,       // имя игрока на 1 место выше нас
  lang: 'ru' | 'uk' = 'ru',
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

    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return;

    const title = lang === 'uk'
      ? `😤 ${leaderName} обігнав тебе в клубі!`
      : `😤 ${leaderName} обогнал тебя в клубе!`;
    const body = lang === 'uk'
      ? `Ти на ${currentRank} місці. Відповідай прямо зараз!`
      : `Ты на ${currentRank} месте. Отвечай прямо сейчас!`;

    await N.scheduleNotificationAsync({
      content: { title, body, sound: true },
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
export const schedulePhrasOfDayNotification = async (lang: 'ru' | 'uk' = 'ru'): Promise<void> => {
  try {
    const N = await getNotifications();
    if (!N) return;
    const hasPermission = await requestNotificationPermission();
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
    const teasers = lang === 'uk' ? TEASERS_UK : TEASERS_RU;
    const teaserIdx = getDayIndex() % teasers.length;
    const title = '☀️ Фраза дня';
    const body = teasers[teaserIdx];

    await N.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data: { type: 'phrase_of_day', phraseId: phrase.lessonId },
      },
      trigger: { seconds: secondsUntil } as any,
    });

    await AsyncStorage.setItem('phrase_notif_scheduled', today);
  } catch (e) {
  }
};
