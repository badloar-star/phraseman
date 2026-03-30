/**
 * Streak Repair — механика "починки стрика".
 *
 * Как работает:
 *  - Пользователь пропустил РОВНО один день (lastActive = 2 дня назад)
 *    и нет активной заморозки.
 *  - Открывает приложение → home.tsx обнаруживает eligibility, показывает карточку.
 *  - Пользователь должен завершить 2 урока сегодня.
 *  - После 2-го урока стрик «починен» — updateStreakOnActivity() его не обнулит.
 *
 * Storage key: 'streak_repair_v1'
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RepairState {
  eligibleDate:  string | null;   // YYYY-MM-DD когда стала доступна починка
  repairDate:    string | null;   // YYYY-MM-DD когда начата починка (= today)
  lessonsToday:  number;          // сколько уроков завершено в repair day
  repaired:      boolean;         // починка выполнена (2+ уроков)
}

const KEY = 'streak_repair_v1';

const today = () => new Date().toISOString().split('T')[0];

/** Returns true if s looks like a valid YYYY-MM-DD date string */
const isValidDateStr = (s: string | null | undefined): s is string =>
  typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));

export const loadRepairState = async (): Promise<RepairState> => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { eligibleDate: null, repairDate: null, lessonsToday: 0, repaired: false };
};

const save = async (state: RepairState) => {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(state)); } catch {}
};

/**
 * Проверяет, может ли пользователь починить стрик сегодня.
 * Стрик починки возможен если:
 *  - пропущен ровно 1 день (lastActive === позавчера)
 *  - стрик > 1
 *  - заморозка не активна
 *  - ещё не починен сегодня
 */
export const isRepairEligible = async (): Promise<boolean> => {
  try {
    const t = today();
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const dayBefore = new Date(); dayBefore.setDate(dayBefore.getDate() - 2);
    const dayBeforeStr = dayBefore.toISOString().split('T')[0];

    const [lastActive, streakRaw, freezeRaw, repair] = await Promise.all([
      AsyncStorage.getItem('last_active_date'),
      AsyncStorage.getItem('streak_count'),
      AsyncStorage.getItem('streak_freeze'),
      loadRepairState(),
    ]);

    // Guard against missing or malformed date strings
    if (!isValidDateStr(lastActive)) return false;
    if (lastActive >= yesterdayStr) return false;                // не пропустил
    if (lastActive < dayBeforeStr) return false;                 // пропустил 2+ дней

    const streak = parseInt(streakRaw ?? '0');
    if (isNaN(streak) || streak <= 1) return false;             // стрик уже 0-1

    const freeze = freezeRaw ? JSON.parse(freezeRaw) : null;
    if (freeze?.active) return false;                            // заморозка спасёт сама

    if (repair.repaired && repair.repairDate === t) return false; // уже починен
    return true;
  } catch { return false; }
};

/**
 * Вызывать после завершения каждого урока (из lesson_complete.tsx).
 * Возвращает { nowRepaired: true } если 2-й урок только что завершён.
 */
export const recordLessonForRepair = async (): Promise<{ nowRepaired: boolean }> => {
  try {
    const t = today();
    const eligible = await isRepairEligible();
    if (!eligible) return { nowRepaired: false };

    const state = await loadRepairState();
    const updated: RepairState = {
      ...state,
      repairDate:   t,
      eligibleDate: t,
      lessonsToday: (state.repairDate === t ? state.lessonsToday : 0) + 1,
      repaired:     false,
    };

    // 2 урока = починка готова
    if (updated.lessonsToday >= 2) {
      updated.repaired = true;
      await save(updated);
      return { nowRepaired: true };
    }

    await save(updated);
    return { nowRepaired: false };
  } catch { return { nowRepaired: false }; }
};

/**
 * Вызывается из updateStreakOnActivity() чтобы проверить, спасти ли стрик.
 * Если сегодня стрик починен — возвращает true и заморозка не нужна.
 */
export const wasRepairedToday = async (): Promise<boolean> => {
  try {
    const state = await loadRepairState();
    return state.repaired && state.repairDate === today();
  } catch { return false; }
};

/** Количество уроков, завершённых сегодня в рамках починки */
export const getRepairProgress = async (): Promise<{ lessons: number; repaired: boolean }> => {
  try {
    const state = await loadRepairState();
    const t = today();
    if (state.repairDate !== t) return { lessons: 0, repaired: false };
    return { lessons: state.lessonsToday, repaired: state.repaired };
  } catch { return { lessons: 0, repaired: false }; }
};

// Required by Expo Router — not a screen
export default {};
