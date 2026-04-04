import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { AchievementProvider, useAchievement } from '../components/AchievementContext';
import AchievementToast from '../components/AchievementToast';
import { LangProvider, useLang } from '../components/LangContext';
import Onboarding from '../components/onboarding';
import { ThemeProvider } from '../components/ThemeContext';
import { checkAchievements, getPendingNotifications, markAchievementsNotified } from './achievements';
import { preloadImages } from './image_preload';
import { scheduleMonthlyRecapNotification, schedulePhrasOfDayNotification, scheduleStreakWarningIfNeeded, scheduleWeeklyRecapNotification, setupNotificationTapHandler } from './notifications';
import { initRevenueCat } from './revenuecat_init';
import { registerXP } from './xp_manager';

// RevenueCat API keys must be set via environment variables.
// See revenuecat_init.ts for singleton initialization pattern.

// ── Daily Login Bonus + Comeback Bonus — запускается при каждом старте ────────
const runSessionChecks = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // ── 1. Daily Login Bonus ────────────────────────────────────────────────
    // Храним consecutive login days отдельно от lesson-стрика
    const loginRaw = await AsyncStorage.getItem('login_bonus_v1');
    let login = { lastDate: null as string | null, consecutiveDays: 0 };
    try {
      if (loginRaw) {
        const parsed = JSON.parse(loginRaw);
        login = {
          lastDate: typeof parsed.lastDate === 'string' ? parsed.lastDate : null,
          consecutiveDays: typeof parsed.consecutiveDays === 'number' ? parsed.consecutiveDays : 0,
        };
      }
    } catch {}

    if (login.lastDate !== today) {
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const consecutive = login.lastDate === yesterdayStr
        ? login.consecutiveDays + 1
        : 1;

      // XP по циклу: дни 1-2 = 5, 3-4 = 10, 5-6 = 15, день 7 = 50, потом заново
      const cycle = ((consecutive - 1) % 7) + 1;
      const bonusXP = cycle === 7 ? 50 : cycle >= 5 ? 15 : cycle >= 3 ? 10 : 5;

      const name = await AsyncStorage.getItem('user_name');
      if (name) {
        await registerXP(bonusXP, 'daily_login_bonus', name);
      }

      // Сохранить бонус для отображения на Home
      await AsyncStorage.setItem('login_bonus_pending', JSON.stringify({ xp: bonusXP, cycle }));
      await AsyncStorage.setItem('login_bonus_v1', JSON.stringify({ lastDate: today, consecutiveDays: consecutive }));

      // Ачивки за логин
      checkAchievements({ type: 'login', consecutiveDays: consecutive }).catch(() => {});
    }

    // ── 2. Comeback Bonus ───────────────────────────────────────────────────
    // Вернулся после 3+ дней — 2× XP на весь сегодняшний день
    const lastActive = await AsyncStorage.getItem('last_active_date');
    if (lastActive) {
      const daysBefore3 = new Date(); daysBefore3.setDate(daysBefore3.getDate() - 3);
      const threshold = daysBefore3.toISOString().split('T')[0];
      if (lastActive <= threshold) {
        await AsyncStorage.setItem('comeback_active', today);
        await AsyncStorage.setItem('comeback_pending', 'true');
        checkAchievements({ type: 'comeback' }).catch(() => {});
      }
    }

    // ── 3. Weekly / Monthly Recap уведомления ───────────────────────────────
    // Перепланируем если ещё не запланированы на текущую неделю/месяц
    const langRaw = await AsyncStorage.getItem('app_lang');
    const lang = (langRaw === 'uk' ? 'uk' : 'ru') as 'ru' | 'uk';

    const weeklyScheduled = await AsyncStorage.getItem('weekly_recap_scheduled');
    const now = new Date();
    const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + daysUntilSunday);
    const nextSundayStr = nextSunday.toISOString().split('T')[0];
    if (weeklyScheduled !== nextSundayStr) {
      scheduleWeeklyRecapNotification(lang).catch(() => {});
    }

    const monthlyScheduled = await AsyncStorage.getItem('monthly_recap_scheduled');
    const firstNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const firstNextMonthStr = firstNextMonth.toISOString().split('T')[0];
    if (monthlyScheduled !== firstNextMonthStr) {
      scheduleMonthlyRecapNotification(lang).catch(() => {});
    }

    // ── 4. Streak Warning ───────────────────────────────────────────────────
    // Планируем вечернее предупреждение если стрик > 0 и урок ещё не пройден
    scheduleStreakWarningIfNeeded(lang).catch(() => {});

    // ── 5. Phrase of Day Notification ───────────────────────────────────────
    // Планируем уведомление на 7:00 утра с фразой дня
    schedulePhrasOfDayNotification(lang).catch(() => {});
  } catch {}
};

// Вынесено в дочерний компонент чтобы иметь доступ к LangContext + AchievementContext
function AppContent() {
  const [ready, setReady]         = useState(false);
  const [showOnboarding, setShow] = useState(false);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);
  const { setLang } = useLang();
  const { showAchievement } = useAchievement();
  const router = useRouter();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Обработчик тапа по уведомлению — deep link в нужный экран
  useEffect(() => {
    const unsub = setupNotificationTapHandler(router);
    return unsub;
  }, []);

  // Проверяем pending-ачивки и показываем тосты
  // Вызывается сразу при старте и каждые 4 секунды (покрывает async checkAchievements из addOrUpdateScore)
  const flushPending = useCallback(async () => {
    const pending = await getPendingNotifications();
    if (pending.length > 0) {
      // Пометить как notified ДО показа, чтобы повторный вызов не задублировал
      await markAchievementsNotified(pending.map(a => a.id));
      pending.forEach(a => showAchievement(a));
    }
  }, [showAchievement]);

  useEffect(() => {
    // Глобальный таймаут — приложение ВСЕГДА запустится не позже 10 секунд (было 6)
    // Увеличено с 6s чтобы дать время RevenueCat (таймаут 8s) завершиться
    const safetyTimer = setTimeout(() => setReady(true), 10000);

    const init = async () => {
      try {
        // Singleton инициализация RevenueCat с retry-защитой и логированием
        await initRevenueCat();

        // Логин-бонус и Comeback запускаем при каждом старте (fire-and-forget)
        runSessionChecks();

        // Pre-load all images to ensure they're cached locally (prevents disappearing on PC offline)
        preloadImages().catch(() => {});

        const val = await AsyncStorage.getItem('onboarding_done');
        setShow(!val);
      } catch {}

      clearTimeout(safetyTimer);
      setReady(true);

      // Первая проверка — с задержкой чтобы runSessionChecks успел записать ачивки
      setTimeout(flushPending, 1200);
    };
    init();

    // Polling: XP-ачивки записываются через setTimeout(50ms) в addOrUpdateScore,
    // polling каждые 4с гарантирует что тост появится максимум через 4с после урока.
    pollRef.current = setInterval(flushPending, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // Вызывается из онбординга при выборе языка — синхронизирует контекст
  const handleLangSelect = useCallback(async (lang: 'ru' | 'uk') => {
    await setLang(lang);
  }, [setLang]);

  // Навигация после онбординга — прямо в тест/урок без промежуточного шага
  const handleOnboardingDone = useCallback(async () => {
    const pairs = await AsyncStorage.multiGet(['open_diagnostic', 'open_lesson_zero']);
    if (pairs[0][1] === '1') {
      await AsyncStorage.removeItem('open_diagnostic');
      setPendingRoute('/diagnostic_test?fromOnboarding=1');
    } else if (pairs[1][1] === '1') {
      await AsyncStorage.removeItem('open_lesson_zero');
      // lesson_zero удалён — просто идём на главную
    }
    setShow(false);
  }, []);

  // После закрытия онбординга и монтирования Stack — переходим на нужный экран
  useEffect(() => {
    if (!showOnboarding && pendingRoute) {
      const t = setTimeout(() => {
        router.replace(pendingRoute as any);
        setPendingRoute(null);
      }, 50);
      return () => clearTimeout(t);
    }
  }, [showOnboarding, pendingRoute]);

  if (!ready) return <View style={{ flex:1, backgroundColor:'#06141B' }} />;

  if (showOnboarding) {
    return <Onboarding onDone={handleOnboardingDone} onLangSelect={handleLangSelect} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="lesson1" />
      <Stack.Screen name="lesson_menu" />
      <Stack.Screen name="lesson_words" />
      <Stack.Screen name="lesson_irregular_verbs" />
      <Stack.Screen name="lesson_complete" />


      <Stack.Screen name="help" />
      <Stack.Screen name="hint" />
      <Stack.Screen name="lesson_help" />
      <Stack.Screen name="settings_edu" />
      <Stack.Screen name="settings_notifications" />
      <Stack.Screen name="league_screen" />
      <Stack.Screen name="streak_stats" />
      <Stack.Screen name="diagnostic_test" />
      <Stack.Screen name="exam" />
      <Stack.Screen name="dialogs" />
      <Stack.Screen name="dialog_vocab" />
      <Stack.Screen name="daily_tasks_screen" />
      <Stack.Screen name="premium_modal" options={{ presentation: 'modal' }} />
      <Stack.Screen name="avatar_select" />
      <Stack.Screen name="flashcards" />
      <Stack.Screen name="achievements_screen" />
      <Stack.Screen name="level_exam" />
      <Stack.Screen name="review" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <LangProvider>
        <AchievementProvider>
          <AppContent />
          {/* Тост монтируется поверх всего Stack-навигатора */}
          <AchievementToast />
        </AchievementProvider>
      </LangProvider>
    </ThemeProvider>
  );
}
