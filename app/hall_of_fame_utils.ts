import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkAchievements } from './achievements';
import { emitAppEvent } from './events';
import { logStreakExtended, logStreakLost } from './firebase';
import { updateMyGroupPoints } from './firestore_leagues';
import { wasRepairedToday } from './streak_repair';
import { checkWagerProgress } from './streak_wager';
import { sendStreakWarning } from './notifications';
import { markStreakLost } from './streak_revive';
import { incrementStreakLostCount } from './paywall_personalization';
import { repairDevSeededStreakInStorage } from './streak_safety';
import { isStreakFreezeActiveToday } from './streak_freeze';
import { getCardStreakShieldStatus, tryConsumeCardStreakShield } from './profile_card_streak_shield';
import { STREAK_WEEK_MARKERS_KEY, addDaysToDateKey, recordStreakWeekMarker } from './streak_week_markers';
import {
  getLocalDayKey,
  isDayBeforeYesterdayFlexible,
  isSameLocalOrUtcDay,
  isYesterdayFlexible,
} from './local_date';
import type { Lang } from '../constants/i18n';
import { getBestAvatarForLevel } from '../constants/avatars';
import { getLevelFromXP } from '../constants/theme';
import { getCurrentWeekStartIso } from './weekly_xp';
import {
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from './account_generation';

export const LEVEL_BASE: Record<string, number> = { easy: 5, medium: 7, hard: 10 };

const notificationLangFromStorageValue = (value: string | null): Lang =>
  value === 'uk' ? 'uk' : value === 'es' ? 'es' : 'ru';

const DAY_MS = 24 * 60 * 60 * 1000;

const dateKeyToUtcMs = (dateKey: string): number | null => {
  const [year, month, day] = dateKey.split('-').map(Number);
  if (!year || !month || !day) return null;
  return Date.UTC(year, month - 1, day);
};

const countMissedDays = (lastActive: string, today: string): number => {
  const lastMs = dateKeyToUtcMs(lastActive);
  const todayMs = dateKeyToUtcMs(today);
  if (lastMs === null || todayMs === null || todayMs <= lastMs) return 1;
  return Math.max(1, Math.floor((todayMs - lastMs) / DAY_MS) - 1);
};

export const streakMultiplier = (s: number): number =>
  s >= 30 ? 1.8 : s >= 14 ? 1.6 : s >= 7 ? 1.4 : s >= 3 ? 1.2 : 1;

export const pointsForAnswer = (level: string, streak: number): number =>
  Math.round(LEVEL_BASE[level] * streakMultiplier(streak) * 10) / 10;

// ── Leaderboard (накопительный за всё время) ─────────────────────────────────
export interface LeaderEntry { name: string; points: number; lang: string; avatar?: string; uid?: string; }
export const LEADERBOARD_KEY = 'leaderboard';

export const loadLeaderboard = async (): Promise<LeaderEntry[]> => {
  try {
    const s = await AsyncStorage.getItem(LEADERBOARD_KEY);
    if (!s) return [];
    const parsed = JSON.parse(s);
    if (!Array.isArray(parsed)) return [];
    const arr: LeaderEntry[] = parsed;
    // Deduplicate: merge entries with same name (case-insensitive)
    const seen = new Map<string, LeaderEntry>();
    for (const e of arr) {
      if (!e || typeof e.name !== 'string') continue;
      const key = e.name.trim().toLowerCase();
      const existing = seen.get(key);
      if (existing) {
        existing.points += e.points;
        if (e.avatar) existing.avatar = e.avatar;
      } else {
        seen.set(key, { ...e, name: e.name.trim() });
      }
    }
    return Array.from(seen.values()).sort((a, b) => b.points - a.points);
  } catch (e) {
    if (__DEV__) console.warn('[hall_of_fame_utils]', e);
    return [];
  }
};

export const saveLeaderboard = async (entries: LeaderEntry[]) => {
  try { await AsyncStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries)); } catch (e) { if (__DEV__) console.warn('[hall_of_fame_utils]', e); }
};

// ── Week leaderboard (только за текущую неделю) ──────────────────────────────
export interface WeekEntry { name: string; points: number; lang: string; }
export const WEEK_BOARD_KEY = 'week_leaderboard';

export const loadWeekLeaderboard = async (): Promise<WeekEntry[]> => {
  try {
    const s = await AsyncStorage.getItem(WEEK_BOARD_KEY);
    if (!s) return [];
    const parsed = JSON.parse(s);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    if (__DEV__) console.warn('[hall_of_fame_utils]', e);
    return [];
  }
};

export function parseWeekPointsForWeek(raw: string | null | undefined, weekKey: string = getWeekKey(new Date())): number {
  try {
    if (!raw) return 0;
    const data: { weekKey?: string; points?: number } = JSON.parse(raw);
    if (data.weekKey !== weekKey) return 0;
    const points = Number(data.points ?? 0);
    return Number.isFinite(points) ? points : 0;
  } catch (e) {
    if (__DEV__) console.warn('[hall_of_fame_utils]', e);
    return 0;
  }
}

export const resetWeekPointsIfStale = async (): Promise<void> => {
  try {
    const currentWeekKey = getWeekKey(new Date());
    const raw = await AsyncStorage.getItem('week_points_v2');
    if (!raw) return;
    const data: { weekKey?: string; points?: number } = JSON.parse(raw);
    if (data.weekKey !== currentWeekKey) {
      await AsyncStorage.multiSet([
        // Финал завершившейся недели — до обнуления, чтобы лиговый rollover
        // мог считать переход по реальным очкам, а не по устаревшему кэшу группы.
        ['week_points_last_final', JSON.stringify({ weekKey: data.weekKey ?? '', points: Number(data.points ?? 0) || 0 })],
        ['week_points_v2', JSON.stringify({ weekKey: currentWeekKey, points: 0 })],
        ['week_points', '0'],
      ]);
    }
  } catch (e) {
    if (__DEV__) console.warn('[hall_of_fame_utils]', e);
  }
};

// Возвращает финальные очки завершившейся недели, сохранённые resetWeekPointsIfStale,
// если сохранённый weekKey совпадает с запрошенным weekId; иначе null.
export const getLastWeekFinalPoints = async (weekId: string): Promise<number | null> => {
  try {
    const raw = await AsyncStorage.getItem('week_points_last_final');
    if (!raw) return null;
    const data: { weekKey?: string; points?: number } = JSON.parse(raw);
    if (data.weekKey !== weekId) return null;
    const points = Number(data.points ?? 0);
    return Number.isFinite(points) ? points : null;
  } catch (e) {
    if (__DEV__) console.warn('[hall_of_fame_utils]', e);
    return null;
  }
};

const saveWeekLeaderboard = async (entries: WeekEntry[]) => {
  try { await AsyncStorage.setItem(WEEK_BOARD_KEY, JSON.stringify(entries)); } catch (e) { if (__DEV__) console.warn('[hall_of_fame_utils]', e); }
};

// ── ISO номер недели ──────────────────────────────────────────────────────────
export const getWeekKey = (d: Date): string => {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
};

// ── Получить недельные очки текущего пользователя ────────────────────────────
export const getMyWeekPoints = async (): Promise<number> => {
  try {
    const currentWeekKey = getWeekKey(new Date());
    const raw = await AsyncStorage.getItem('week_points_v2');
    const parsed = parseWeekPointsForWeek(raw, currentWeekKey);
    try {
      const rawData = raw ? JSON.parse(raw) as { weekKey?: unknown } : null;
      if (rawData?.weekKey === currentWeekKey) return parsed;
    } catch {
      // Fall through to the server-mirrored weekly counter.
    }
    const [[, weeklyXpRaw], [, periodRaw], [, legacyWeekPointsRaw]] = await AsyncStorage.multiGet([
      'weekly_xp',
      'weekly_xp_period_start',
      'week_points',
    ]);
    if (periodRaw === getCurrentWeekStartIso()) {
      return Math.max(
        0,
        parseInt(weeklyXpRaw ?? '0', 10) || 0,
        parseInt(legacyWeekPointsRaw ?? '0', 10) || 0,
      );
    }
    return parsed;
  } catch (e) {
    if (__DEV__) console.warn('[hall_of_fame_utils]', e);
    return 0;
  }
};

// Одноразовая миграция: сбрасывает week_points_v2 если там накопленный total XP
export const migrateWeekPointsIfNeeded = async (): Promise<void> => {
  try {
    await resetWeekPointsIfStale();
    const migrated = await AsyncStorage.getItem('week_points_migrated_v1');
    if (migrated) return;
    const currentWeekKey = getWeekKey(new Date());
    const raw = await AsyncStorage.getItem('week_points_v2');
    if (raw) {
      const data = JSON.parse(raw);
      const weekKey = typeof data?.weekKey === 'string' ? data.weekKey : '';
      const points = Number(data?.points);
      const isWellFormedWeekPoints = weekKey === currentWeekKey
        && Number.isFinite(points)
        && points >= 0
        && points <= 1_000_000_000;
      if (!isWellFormedWeekPoints) {
        await AsyncStorage.setItem('week_points_v2', JSON.stringify({ weekKey: currentWeekKey, points: 0 }));
      }
    }
    await AsyncStorage.setItem('week_points_migrated_v1', '1');
  } catch (e) {
    if (__DEV__) console.warn('[hall_of_fame_utils]', e);
  }
};

// ── Обновить цепочку (дней подряд) и week_days_done при активности ───────────────────────────
// Вызывать при ЛЮБОМ начислении опыта
export const updateStreakOnActivity = async (
  accountToken?: AccountGenerationToken,
): Promise<number> => {
  try {
    await repairDevSeededStreakInStorage();

    // Ключ дня — ЛОКАЛЬНАЯ дата устройства: пользователь, занимающийся каждый
    // календарный день у себя дома вечером в UTC+N или утром в UTC-N, не должен
    // терять стрик из-за того, что его локальный день не совпал с UTC-днём.
    // isSameLocalOrUtcDay/isYesterdayFlexible/isDayBeforeYesterdayFlexible
    // на переходный период принимают И старый (UTC), И новый (локальный) ключ —
    // last_active_date, записанный ДО этого апдейта, ещё может быть в старой схеме.
    const today = getLocalDayKey();
    const lastActiveKey = 'last_active_date';
    const lastActive = await AsyncStorage.getItem(lastActiveKey);

    let streak = parseInt(await AsyncStorage.getItem('streak_count') || '0');

    if (isSameLocalOrUtcDay(lastActive)) {
      // Уже активны сегодня — цепочку не меняем
    } else if (isYesterdayFlexible(lastActive)) {
      // Активны вчера — продолжаем цепочку
      streak += 1;
      logStreakExtended(streak);
    } else {
      // Пропустили день — проверяем заморозку / починку цепочки
      const missedDays = lastActive ? countMissedDays(lastActive, today) : 1;
      const missedExactlyOneDay = lastActive !== null && isDayBeforeYesterdayFlexible(lastActive);

      const freezeRaw = await AsyncStorage.getItem('streak_freeze');
      const freeze = freezeRaw ? JSON.parse(freezeRaw) : null;

      // 1. Заморозка активна и пропущен ровно 1 день
      if (isStreakFreezeActiveToday(freeze, today) && lastActive && missedExactlyOneDay) {
        await AsyncStorage.setItem('streak_freeze', JSON.stringify({ ...freeze, active: false }));
        await recordStreakWeekMarker(addDaysToDateKey(lastActive, 1), 'freeze').catch(() => {});
        // streak не меняем — заморозка спасла. Расходник потрачен — юзер должен узнать
        // (аудит «немых мест» 2026-06-11, находка №6).
        emitAppEvent('action_toast', {
          type: 'reward',
          messageRu: `Заморозка спасла цепочку ${streak} дн. 🧊`,
          messageUk: `Заморозка врятувала ланцюжок ${streak} дн. 🧊`,
          messageEs: `La congelación salvó tu racha de ${streak} días 🧊`,
        });
      }
      // 2. Цепочка починена сегодня (2 урока выполнено)
      else if (lastActive && missedExactlyOneDay && await wasRepairedToday()) {
        // streak не меняем — починка спасла
      }
      // 3. Карточный щит III+ (Фаза 3): бесплатная авто-заморозка 1 раз в 7 дней.
      // Приоритет ниже ручной заморозки и починки, но выше щита друга (его бережём).
      // Достижение streak_freeze_used здесь НЕ эмитим — оно считает ручные заморозки.
      else if (lastActive && missedExactlyOneDay && await tryConsumeCardStreakShield(today)) {
        // streak не меняем — щит карточки спас. Маркер недели — как у ручной заморозки.
        await recordStreakWeekMarker(addDaysToDateKey(lastActive, 1), 'freeze').catch(() => {});
        emitAppEvent('action_toast', {
          type: 'reward',
          messageRu: `🛡 Карточка спасла цепочку ${streak} дн.`,
          messageUk: `🛡 Картка врятувала ланцюжок ${streak} дн.`,
          messageEs: `🛡 La tarjeta salvó tu racha de ${streak} días`,
        });
      }
      // 4. Первый вход в приложение
      else if (lastActive === null) {
        streak = 1;
      }
      // 5. Chain Shield активен — защищает от потери цепочки
      else if (lastActive && missedExactlyOneDay) {
        const csRaw = await AsyncStorage.getItem('chain_shield');
        if (csRaw) {
          const cs = JSON.parse(csRaw) as { daysLeft: number; grantedAt: string };
          const daysLeft = Math.max(0, Math.floor(Number(cs.daysLeft) || 0));
          if (daysLeft > 0) {
            const newDaysLeft = daysLeft - 1;
            if (newDaysLeft <= 0) {
              // Щит исчерпан — удаляем, не храним нулевое состояние
              await AsyncStorage.removeItem('chain_shield');
            } else {
              await AsyncStorage.setItem('chain_shield', JSON.stringify({ ...cs, daysLeft: newDaysLeft }));
            }
            // streak не меняем — щит спас. Социальный момент благодарности — не молчим
            // (аудит «немых мест» 2026-06-11, находка №7).
            emitAppEvent('action_toast', {
              type: 'reward',
              messageRu: newDaysLeft > 0
                ? `Щит друга спас цепочку 🛡️ Осталось дней: ${newDaysLeft}`
                : 'Щит друга спас цепочку 🛡️ Это был последний день защиты',
              messageUk: newDaysLeft > 0
                ? `Щит друга врятував ланцюжок 🛡️ Залишилось днів: ${newDaysLeft}`
                : 'Щит друга врятував ланцюжок 🛡️ Це був останній день захисту',
              messageEs: newDaysLeft > 0
                ? `El escudo de tu amigo salvó la racha 🛡️ Días restantes: ${newDaysLeft}`
                : 'El escudo de tu amigo salvó la racha 🛡️ Era el último día',
            });
          } else {
            // daysLeft === 0: испорченное состояние — чистим и теряем цепочку
            await AsyncStorage.removeItem('chain_shield');
            const prevStreak = streak;
            logStreakLost(prevStreak);
            AsyncStorage.getItem('app_lang').then(l => sendStreakWarning(prevStreak, notificationLangFromStorageValue(l))).catch(() => {});
            void markStreakLost(prevStreak, missedDays);
            incrementStreakLostCount();
            streak = 1;
          }
        } else {
          const prevStreak = streak;
          logStreakLost(prevStreak);
          AsyncStorage.getItem('app_lang').then(l => sendStreakWarning(prevStreak, notificationLangFromStorageValue(l))).catch(() => {});
          void markStreakLost(prevStreak, missedDays);
          incrementStreakLostCount();
          streak = 1;
        }
      }
      // 6. Цепочка потеряна
      else {
        const prevStreak = streak;
        logStreakLost(prevStreak);
        AsyncStorage.getItem('app_lang').then(l => sendStreakWarning(prevStreak, notificationLangFromStorageValue(l))).catch(() => {});
        void markStreakLost(prevStreak, missedDays);
        incrementStreakLostCount();
        streak = 1;
      }
    }

    // Сохраняем цепочку
    await AsyncStorage.setItem('streak_count', String(streak));
    await AsyncStorage.setItem(lastActiveKey, today);

    // Достижения по цепочке + пари (только при реальном изменении — не в firstLoads)
    if (!isSameLocalOrUtcDay(lastActive)) {
      checkAchievements({ type: 'streak', streak }, accountToken).catch(() => {});
      checkWagerProgress(streak).catch(() => {});
    }

    // Обновляем week_days_done (0=Пн..6=Вс)
    const todayIdx = (new Date().getDay() + 6) % 7;
    const weekDoneRaw = await AsyncStorage.getItem('week_days_done');
    const weekDone: boolean[] = weekDoneRaw ? JSON.parse(weekDoneRaw) : new Array(7).fill(false);

    // Если новая неделя — сбрасываем массив
    const weekKey = getWeekKey(new Date());
    const savedWeekKey = await AsyncStorage.getItem('week_days_week_key');
    if (savedWeekKey !== weekKey) {
      const fresh = new Array(7).fill(false);
      fresh[todayIdx] = true;
      await AsyncStorage.setItem('week_days_done', JSON.stringify(fresh));
      await AsyncStorage.setItem('week_days_week_key', weekKey);
    } else {
      weekDone[todayIdx] = true;
      await AsyncStorage.setItem('week_days_done', JSON.stringify(weekDone));
      // Проверяем идеальную неделю (все 7 дней)
      if (weekDone.every(Boolean)) {
        checkAchievements({ type: 'perfect_week' }, accountToken).catch(() => {});
      }
    }

    return streak;
  } catch (e) {
    if (__DEV__) console.warn('[hall_of_fame_utils]', e);
    return 0;
  }
};

/**
 * ГЛАВНАЯ ФУНКЦИЯ начисления опыта.
 * Вызывать из: квизов, урока, словаря, глаголов, теста знаний.
 *
 * 1. leaderboard      — накопительный за всё время
 * 2. week_points_v2   — только за текущую неделю (авто-сброс)
 * 3. week_leaderboard — рейтинг за текущую неделю (для клуба недели)
 * 4. daily_stats      — для графика статистики (опыт за день)
 * 5. streak           — цепочка дней подряд + week_days_done
 */
const addOrUpdateScoreUnsafe = async (
  name: string,
  delta: number,
  lang: string,
  avatar?: string,
  accountToken?: AccountGenerationToken,
) => {
  // Разрешаем отрицательный опыт для списания ставок (wagers)
  if (!name || delta === 0) return;

  // DEV-ONLY: трейс источника XP. Помогает отлаживать "12 опыта на этой неделе"
  // в начале новой недели — ловим какой кодпуть начислил и со стэком вызовов.
  const isJestRuntime = typeof process !== 'undefined' && Boolean(process.env.JEST_WORKER_ID);
  const debugXpTraceEnabled =
    typeof process !== 'undefined' && process.env.EXPO_PUBLIC_DEBUG_XP_TRACE === '1';
  if (__DEV__ && !isJestRuntime && debugXpTraceEnabled) {
    try {
      const stack = (new Error().stack || '').split('\n').slice(2, 7).join('\n');
      console.log(
        `[addOrUpdateScore] +${delta} XP for "${name}" (lang=${lang}, weekKey=${getWeekKey(new Date())})\n${stack}`,
      );
    } catch (e) {
      if (__DEV__) console.warn('[hall_of_fame_utils]', e);
    }
  }

  // ── 1. Leaderboard (накопительный) ──────────────────────────────────────
  const storedTotalXp = parseInt((await AsyncStorage.getItem('user_total_xp')) || '0', 10) || 0;
  const computedLevelAvatar = String(getBestAvatarForLevel(getLevelFromXP(Math.max(0, storedTotalXp + delta))));
  let resolvedAvatar = avatar?.trim() || computedLevelAvatar;
  try {
    const storedAvatar = (await AsyncStorage.getItem('user_avatar'))?.trim();
    if (storedAvatar && !/^\d+$/.test(storedAvatar) && (!resolvedAvatar || /^\d+$/.test(resolvedAvatar))) {
      resolvedAvatar = storedAvatar;
    }
  } catch (e) {
    if (__DEV__) console.warn('[hall_of_fame_utils]', e);
  }
  if (!resolvedAvatar || /^\d+$/.test(resolvedAvatar)) resolvedAvatar = computedLevelAvatar;

  const canonicalName = name.trim();
  const board = await loadLeaderboard();
  const idx = board.findIndex(e => e.name.trim().toLowerCase() === canonicalName.toLowerCase());
  if (idx >= 0) {
    board[idx].points += delta;
    board[idx].name = canonicalName; // normalize in place
    if (resolvedAvatar) board[idx].avatar = resolvedAvatar;
  } else {
    board.push({ name: canonicalName, points: delta, lang, avatar: resolvedAvatar });
  }
  board.sort((a, b) => b.points - a.points);
  await saveLeaderboard(board);

  // ── 2. week_points_v2 ────────────────────────────────────────────────────
  let newWeekPts = 0;
  try {
    const currentWeekKey = getWeekKey(new Date());
    const wpRaw = await AsyncStorage.getItem('week_points_v2');
    let wpData: { weekKey: string; points: number };

    const PB_KEY = 'week_xp_peak_best_v1';

    if (wpRaw) {
      wpData = JSON.parse(wpRaw);
      if (wpData.weekKey !== currentWeekKey) {
        const finalizedWeekXp = wpData.points;
        const prevPeakRoll = parseInt((await AsyncStorage.getItem(PB_KEY)) || '0', 10) || 0;
        if (finalizedWeekXp > prevPeakRoll) {
          await AsyncStorage.setItem(PB_KEY, String(finalizedWeekXp));
          if (prevPeakRoll > 0) {
            checkAchievements({ type: 'personal_best' }, accountToken).catch(() => {});
          }
        }
        wpData = { weekKey: currentWeekKey, points: 0 };
      }
    } else {
      wpData = { weekKey: currentWeekKey, points: 0 };
    }

    wpData.points += delta;
    newWeekPts = wpData.points;
    await AsyncStorage.setItem('week_points_v2', JSON.stringify(wpData));
    await AsyncStorage.setItem('week_points', String(wpData.points));

    const prevPeak = parseInt((await AsyncStorage.getItem(PB_KEY)) || '0', 10) || 0;
    if (wpData.points > prevPeak) {
      await AsyncStorage.setItem(PB_KEY, String(wpData.points));
      if (prevPeak > 0) {
        checkAchievements({ type: 'personal_best' }, accountToken).catch(() => {});
      }
    }
  } catch (e) {
    if (__DEV__) console.warn('[hall_of_fame_utils]', e);
  }

  // ── 3. week_leaderboard ──────────────────────────────────────────────────
  try {
    const currentWeekKey = getWeekKey(new Date());
    const wbRaw = await AsyncStorage.getItem('week_board_meta');
    let weekMeta: { weekKey: string } = wbRaw ? JSON.parse(wbRaw) : { weekKey: '' };
    let weekBoard = await loadWeekLeaderboard();

    if (weekMeta.weekKey !== currentWeekKey) {
      weekBoard = [];
      await AsyncStorage.setItem('week_board_meta', JSON.stringify({ weekKey: currentWeekKey }));
    }

    const wi = weekBoard.findIndex(e => e.name.trim().toLowerCase() === canonicalName.toLowerCase());
    if (wi >= 0) {
      weekBoard[wi].points += delta;
      weekBoard[wi].name = canonicalName;
    } else {
      weekBoard.push({ name: canonicalName, points: delta, lang });
    }
    weekBoard.sort((a, b) => b.points - a.points);
    await saveWeekLeaderboard(weekBoard);
  } catch (e) {
    if (__DEV__) console.warn('[hall_of_fame_utils]', e);
  }

  // ── 4. daily_stats ────────────────────────────────────────────────────────
  try {
    const today = new Date().toISOString().split('T')[0];
    const raw = await AsyncStorage.getItem('daily_stats');
    const stats: Record<string, any> = raw ? JSON.parse(raw) : {};

    const existing = stats[today];
    let currentPts = 0;
    if (typeof existing === 'number') currentPts = existing;
    else if (existing?.points) currentPts = existing.points;

    const streakVal = parseInt(await AsyncStorage.getItem('streak_count') || '0');
    stats[today] = { points: currentPts + delta, streak: streakVal };
    await AsyncStorage.setItem('daily_stats', JSON.stringify(stats));
  } catch (e) {
    if (__DEV__) console.warn('[hall_of_fame_utils]', e);
  }

  // ── 5. Цепочка и week_days_done — только при положительном начислении ────────
  if (delta > 0) {
    await updateStreakOnActivity(accountToken);
  }

  // ── 6. Синхронизируем клуб недели (fire-and-forget)
  // leaderboard теперь обновляется только через syncToCloud в xp_manager.ts
  // чтобы избежать race condition (pushMyScore читала старый XP до обновления)
  if (delta > 0) {
    updateMyGroupPoints(newWeekPts, accountToken).catch(() => {});
  }

};

export const addOrUpdateScore = async (
  name: string,
  delta: number,
  lang: string,
  avatar?: string,
  accountToken?: AccountGenerationToken,
): Promise<void> => {
  if (!accountToken) {
    await addOrUpdateScoreUnsafe(name, delta, lang, avatar);
    return;
  }
  await withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(accountToken)) return;
    await addOrUpdateScoreUnsafe(name, delta, lang, avatar, accountToken);
  });
};

type PendingSecondaryXpProjection = {
  name: string;
  delta: number;
  lang: string;
  avatar?: string;
  accountToken?: AccountGenerationToken;
  timer: ReturnType<typeof setTimeout> | null;
  waiters: Array<{ resolve: () => void; reject: (error: unknown) => void }>;
};

// Leaderboards, daily chart and streak mirrors are projections of already committed
// XP. Coalescing a burst keeps the first-frame XP contract intact while replacing
// dozens of repeated AsyncStorage read/write cycles with one account-scoped commit.
const SECONDARY_XP_PROJECTION_BATCH_MS = 300;
const pendingSecondaryXpProjections = new Map<string, PendingSecondaryXpProjection>();

const secondaryProjectionKey = (accountToken?: AccountGenerationToken): string =>
  accountToken ? `${accountToken.generation}:${accountToken.stableId ?? 'anonymous'}` : 'legacy';

const flushSecondaryXpProjection = async (key: string): Promise<void> => {
  const pending = pendingSecondaryXpProjections.get(key);
  if (!pending) return;
  pendingSecondaryXpProjections.delete(key);
  if (pending.timer) clearTimeout(pending.timer);
  try {
    await addOrUpdateScore(pending.name, pending.delta, pending.lang, pending.avatar, pending.accountToken);
    pending.waiters.forEach(({ resolve }) => resolve());
  } catch (error) {
    pending.waiters.forEach(({ reject }) => reject(error));
  }
};

/** Batch non-authoritative score projections without delaying the visible XP award. */
export const enqueueSecondaryXpProjection = (
  name: string,
  delta: number,
  lang: string,
  avatar?: string,
  accountToken?: AccountGenerationToken,
): Promise<void> => {
  if (!name || delta === 0) return Promise.resolve();
  const key = secondaryProjectionKey(accountToken);
  return new Promise<void>((resolve, reject) => {
    const existing = pendingSecondaryXpProjections.get(key);
    if (existing) {
      existing.name = name;
      existing.delta += delta;
      existing.lang = lang;
      existing.avatar = avatar?.trim() || existing.avatar;
      existing.waiters.push({ resolve, reject });
      return;
    }
    const pending: PendingSecondaryXpProjection = {
      name,
      delta,
      lang,
      avatar,
      accountToken,
      timer: null,
      waiters: [{ resolve, reject }],
    };
    pending.timer = setTimeout(() => {
      void flushSecondaryXpProjection(key);
    }, SECONDARY_XP_PROJECTION_BATCH_MS);
    pendingSecondaryXpProjections.set(key, pending);
  });
};

/**
 * Проверяет, потеряет ли пользователь цепочку при следующей активности.
 * Вызывается из home.tsx при загрузке — НЕ изменяет storage.
 *
 * Возвращает { willLose: true } когда:
 *  - была цепочка > 1
 *  - пропущен ровно 1 день (заморозка ещё может помочь)
 *  - заморозка не активна
 *  - не premium
 *
 * Если пропущено 2+ дня — freeze всё равно не поможет, поэтому не предлагаем.
 */
export const checkStreakLossPending = async (): Promise<{ willLose: boolean; streakBefore: number }> => {
  try {
    const lastActive = await AsyncStorage.getItem('last_active_date');
    // Уже активен сегодня или вчера — цепочка в порядке
    if (!lastActive || isSameLocalOrUtcDay(lastActive) || isYesterdayFlexible(lastActive)) {
      return { willLose: false, streakBefore: 0 };
    }
    // Пропущено более 1 дня — заморозка уже не поможет, не показываем
    if (!isDayBeforeYesterdayFlexible(lastActive)) {
      return { willLose: false, streakBefore: 0 };
    }

    const streak = parseInt(await AsyncStorage.getItem('streak_count') || '0');
    if (streak <= 1) return { willLose: false, streakBefore: streak };

    const freezeRaw = await AsyncStorage.getItem('streak_freeze');
    const freeze = freezeRaw ? JSON.parse(freezeRaw) : null;
    const todayStr = getLocalDayKey();
    // Заморозка уже активна сегодня — цепочка сохранится автоматически
    if (isStreakFreezeActiveToday(freeze, todayStr)) return { willLose: false, streakBefore: streak };

    // Карточный щит III+ уже сработал сегодня — цепочка спасена, риск/paywall не показываем.
    const cardShield = await getCardStreakShieldStatus(todayStr);
    if (cardShield.usedToday) return { willLose: false, streakBefore: streak };

    return { willLose: true, streakBefore: streak };
  } catch (e) {
    if (__DEV__) console.warn('[hall_of_fame_utils]', e);
    return { willLose: false, streakBefore: 0 };
  }
};

// ── Сбросить всю статистику (для отладки / по запросу) ───────────────────────
export const resetAllStats = async () => {
  const keys = [
    'leaderboard', 'week_leaderboard', 'week_board_meta',
    'week_points', 'week_points_v2',
    'daily_stats',
    'streak_count', 'last_active_date',
    'week_days_done', 'week_days_week_key', STREAK_WEEK_MARKERS_KEY,
  ];
  for (const key of keys) {
    try { await AsyncStorage.removeItem(key); } catch (e) { if (__DEV__) console.warn('[hall_of_fame_utils]', e); }
  }
};

// Required by Expo Router — not a screen
export default {};
