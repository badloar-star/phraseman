/**
 * Streak Repair — механика «починки цепочки» (дней подряд).
 *
 * Как работает:
 *  - Пользователь пропустил РОВНО один день (lastActive = 2 дня назад)
 *    и нет активной заморозки.
 *  - Открывает приложение → home.tsx обнаруживает eligibility, показывает карточку.
 *  - Пользователь должен завершить 1 урок сегодня.
 *  - После 1-го урока цепочка «починена» — updateStreakOnActivity() её не обнуляет.
 *
 * Storage key: 'streak_repair_v1'
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { isStreakFreezeActiveToday } from './streak_freeze';
import { recordMissedStreakWeekMarkersEndingYesterday } from './streak_week_markers';
import { getLocalDayKey, isDayBeforeYesterdayFlexible, isSameLocalOrUtcDay, isYesterdayFlexible } from './local_date';

export interface RepairState {
  eligibleDate:  string | null;   // YYYY-MM-DD когда стала доступна починка
  repairDate:    string | null;   // YYYY-MM-DD когда начата починка (= today)
  lessonsToday:  number;          // сколько уроков завершено в repair day
  repaired:      boolean;         // починка выполнена (1+ уроков)
}

const KEY = 'streak_repair_v1';

// Локальная дата устройства — см. app/local_date.ts. repairDate/eligibleDate
// сравниваются точным равенством (это state текущей сессии починки, не стрик),
// но lastActive из last_active_date сравнивается гибко (isYesterdayFlexible и
// т.д.), т.к. он мог быть записан ДО миграции на локальную дату (старая UTC-схема).
const today = () => getLocalDayKey();

/** Returns true if s looks like a valid YYYY-MM-DD date string */
const isValidDateStr = (s: string | null | undefined): s is string =>
  typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));

export const loadRepairState = async (): Promise<RepairState> => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { eligibleDate: null, repairDate: null, lessonsToday: 0, repaired: false };
    const state: RepairState = JSON.parse(raw);
    // Если repairDate не сегодня — сбрасываем счётчики урока и флаг починки,
    // чтобы устаревший state не конфликтовал при следующем eligible событии.
    const t = today();
    if (state.repairDate && state.repairDate !== t) {
      return { ...state, lessonsToday: 0, repaired: false, repairDate: null };
    }
    return state;
  } catch {}
  return { eligibleDate: null, repairDate: null, lessonsToday: 0, repaired: false };
};

const save = async (state: RepairState) => {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(state)); } catch {}
};

/**
 * Проверяет, может ли пользователь починить цепочку сегодня.
 * Починка возможна если:
 *  - пропущен ровно 1 день (lastActive === позавчера)
 *  - длина цепочки > 1
 *  - заморозка не активна
 *  - ещё не починен сегодня
 */
export const isRepairEligible = async (): Promise<boolean> => {
  try {
    const t = today();

    const [lastActive, streakRaw, freezeRaw, repair] = await Promise.all([
      AsyncStorage.getItem('last_active_date'),
      AsyncStorage.getItem('streak_count'),
      AsyncStorage.getItem('streak_freeze'),
      loadRepairState(),
    ]);

    // Guard against missing or malformed date strings
    if (!isValidDateStr(lastActive)) return false;
    if (isSameLocalOrUtcDay(lastActive) || isYesterdayFlexible(lastActive)) return false; // не пропустил
    if (!isDayBeforeYesterdayFlexible(lastActive)) return false;  // пропустил 2+ дней (или lastActive в будущем)

    const streak = parseInt(streakRaw ?? '0');
    if (isNaN(streak) || streak <= 1) return false;             // цепочка уже 0–1

    const freeze = freezeRaw ? JSON.parse(freezeRaw) : null;
    if (isStreakFreezeActiveToday(freeze, t)) return false;       // заморозка спасёт сама

    if (repair.repaired && repair.repairDate === t) return false; // уже починен
    return true;
  } catch { return false; }
};

/**
 * Вызывать при любой активности с XP (из xp_manager.ts).
 * Возвращает { nowRepaired: true } если цепочку только что починили.
 */
export const recordActivityForRepair = async (): Promise<{ nowRepaired: boolean }> => {
  return recordLessonForRepair();
};

/**
 * @deprecated используй recordActivityForRepair
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

    // 1 урок = починка готова
    if (updated.lessonsToday >= 1) {
      updated.repaired = true;
      await save(updated);
      await recordMissedStreakWeekMarkersEndingYesterday('repair').catch(() => {});
      return { nowRepaired: true };
    }

    await save(updated);
    return { nowRepaired: false };
  } catch { return { nowRepaired: false }; }
};

/**
 * Вызывается из updateStreakOnActivity() чтобы проверить, спасти ли цепочку.
 * Если сегодня цепочку починили — возвращает true и заморозка не нужна.
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
