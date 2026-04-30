import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkAchievements } from './achievements';
import { logStreakExtended, logStreakLost } from './firebase';
import { updateMyGroupPoints } from './firestore_leagues';
import { wasRepairedToday } from './streak_repair';
import { checkWagerProgress } from './streak_wager';
import { sendStreakWarning } from './notifications';

export const LEVEL_BASE: Record<string, number> = { easy: 5, medium: 7, hard: 10 };

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
  } catch { return []; }
};

export const saveLeaderboard = async (entries: LeaderEntry[]) => {
  try { await AsyncStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries)); } catch {}
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
  } catch { return []; }
};

const saveWeekLeaderboard = async (entries: WeekEntry[]) => {
  try { await AsyncStorage.setItem(WEEK_BOARD_KEY, JSON.stringify(entries)); } catch {}
};

// ── ISO номер недели ──────────────────────────────────────────────────────────
export const getWeekKey = (d: Date): string => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
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
    if (!raw) return 0;
    const data: { weekKey: string; points: number } = JSON.parse(raw);
    return data.weekKey === currentWeekKey ? data.points : 0;
  } catch { return 0; }
};

// Одноразовая миграция: сбрасывает week_points_v2 если там накопленный total XP
export const migrateWeekPointsIfNeeded = async (): Promise<void> => {
  try {
    const migrated = await AsyncStorage.getItem('week_points_migrated_v1');
    if (migrated) return;
    const raw = await AsyncStorage.getItem('week_points_v2');
    if (raw) {
      const data: { weekKey: string; points: number } = JSON.parse(raw);
      const totalXpRaw = await AsyncStorage.getItem('user_total_xp');
      const totalXp = totalXpRaw ? parseInt(totalXpRaw) || 0 : 0;
      // Если недельные очки равны total XP — это ошибочная миграция
      if (totalXp > 0 && data.points >= totalXp * 0.9) {
        const currentWeekKey = getWeekKey(new Date());
        await AsyncStorage.setItem('week_points_v2', JSON.stringify({ weekKey: currentWeekKey, points: 0 }));
      }
    }
    await AsyncStorage.setItem('week_points_migrated_v1', '1');
  } catch {}
};

// ── Обновить стрик и week_days_done при активности ───────────────────────────
// Вызывать при ЛЮБОМ начислении опыта
export const updateStreakOnActivity = async (): Promise<number> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const lastActiveKey = 'last_active_date';
    const lastActive = await AsyncStorage.getItem(lastActiveKey);

    // Считаем вчерашнюю дату
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let streak = parseInt(await AsyncStorage.getItem('streak_count') || '0');

    if (lastActive === today) {
      // Уже активны сегодня — стрик не меняем
    } else if (lastActive === yesterdayStr) {
      // Активны вчера — продолжаем стрик
      streak += 1;
      logStreakExtended(streak);
    } else if (lastActive === null || lastActive < yesterdayStr) {
      // Пропустили день — проверяем заморозку / починку стрика
      const dayBefore = new Date();
      dayBefore.setDate(dayBefore.getDate() - 2);
      const dayBeforeStr = dayBefore.toISOString().split('T')[0];

      const freezeRaw = await AsyncStorage.getItem('streak_freeze');
      const freeze = freezeRaw ? JSON.parse(freezeRaw) : null;

      // 1. Заморозка активна и пропущен ровно 1 день
      if (freeze?.active && lastActive && lastActive >= dayBeforeStr) {
        await AsyncStorage.setItem('streak_freeze', JSON.stringify({ ...freeze, active: false }));
        // streak не меняем — заморозка спасла
      }
      // 2. Стрик починен сегодня (2 урока выполнено)
      else if (lastActive && lastActive >= dayBeforeStr && await wasRepairedToday()) {
        // streak не меняем — починка спасла
      }
      // 3. Первый вход в приложение
      else if (lastActive === null) {
        streak = 1;
      }
      // 4. Chain Shield активен — защищает от потери стрика
      else if (lastActive && lastActive >= dayBeforeStr) {
        const csRaw = await AsyncStorage.getItem('chain_shield');
        if (csRaw) {
          const cs = JSON.parse(csRaw) as { daysLeft: number; grantedAt: string };
          if (cs.daysLeft > 0) {
            const newDaysLeft = cs.daysLeft - 1;
            if (newDaysLeft <= 0) {
              await AsyncStorage.removeItem('chain_shield');
            } else {
              await AsyncStorage.setItem('chain_shield', JSON.stringify({ ...cs, daysLeft: newDaysLeft }));
            }
            // streak не меняем — щит спас
          } else {
            logStreakLost(streak);
            AsyncStorage.getItem('app_lang').then(l => sendStreakWarning(streak, l === 'uk' ? 'uk' : 'ru')).catch(() => {});
            streak = 1;
          }
        } else {
          logStreakLost(streak);
          AsyncStorage.getItem('app_lang').then(l => sendStreakWarning(streak, l === 'uk' ? 'uk' : 'ru')).catch(() => {});
          streak = 1;
        }
      }
      // 5. Стрик потерян
      else {
        logStreakLost(streak);
        AsyncStorage.getItem('app_lang').then(l => sendStreakWarning(streak, l === 'uk' ? 'uk' : 'ru')).catch(() => {});
        streak = 1;
      }
    }

    // Сохраняем стрик
    await AsyncStorage.setItem('streak_count', String(streak));
    await AsyncStorage.setItem(lastActiveKey, today);

    // Достижения по стрику + пари (только при реальном изменении — не в firstLoads)
    if (lastActive !== today) {
      checkAchievements({ type: 'streak', streak }).catch(() => {});
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
        checkAchievements({ type: 'perfect_week' }).catch(() => {});
      }
    }

    return streak;
  } catch { return 0; }
};

/**
 * ГЛАВНАЯ ФУНКЦИЯ начисления опыта.
 * Вызывать из: квизов, урока, словаря, глаголов, теста знаний.
 *
 * 1. leaderboard      — накопительный за всё время
 * 2. week_points_v2   — только за текущую неделю (авто-сброс)
 * 3. week_leaderboard — рейтинг за текущую неделю (для клуба недели)
 * 4. daily_stats      — для графика статистики (опыт за день)
 * 5. streak           — стрик дней подряд + week_days_done
 */
export const addOrUpdateScore = async (
  name: string,
  delta: number,
  lang: string,
  avatar?: string,
) => {
  // Разрешаем отрицательный опыт для списания ставок (wagers)
  if (!name || delta === 0) return;

  // ── 1. Leaderboard (накопительный) ──────────────────────────────────────
  const canonicalName = name.trim();
  const board = await loadLeaderboard();
  const idx = board.findIndex(e => e.name.trim().toLowerCase() === canonicalName.toLowerCase());
  if (idx >= 0) {
    board[idx].points += delta;
    board[idx].name = canonicalName; // normalize in place
    if (avatar) board[idx].avatar = avatar;
  } else {
    board.push({ name: canonicalName, points: delta, lang, avatar });
  }
  board.sort((a, b) => b.points - a.points);
  await saveLeaderboard(board);

  // ── 2. week_points_v2 ────────────────────────────────────────────────────
  let newWeekPts = 0;
  try {
    const currentWeekKey = getWeekKey(new Date());
    const wpRaw = await AsyncStorage.getItem('week_points_v2');
    let wpData: { weekKey: string; points: number };

    if (wpRaw) {
      wpData = JSON.parse(wpRaw);
      if (wpData.weekKey !== currentWeekKey) {
        wpData = { weekKey: currentWeekKey, points: 0 };
      }
    } else {
      wpData = { weekKey: currentWeekKey, points: 0 };
    }

    wpData.points += delta;
    newWeekPts = wpData.points;
    await AsyncStorage.setItem('week_points_v2', JSON.stringify(wpData));
    await AsyncStorage.setItem('week_points', String(wpData.points));
  } catch {}

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
  } catch {}

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
  } catch {}

  // ── 5. Стрик и week_days_done — только при положительном начислении ────────
  if (delta > 0) {
    await updateStreakOnActivity();
  }

  // ── 6. Синхронизируем клуб недели (fire-and-forget)
  // leaderboard теперь обновляется только через syncToCloud в xp_manager.ts
  // чтобы избежать race condition (pushMyScore читала старый XP до обновления)
  if (delta > 0) {
    updateMyGroupPoints(newWeekPts).catch(() => {});
  }

};

/**
 * Проверяет, потеряет ли пользователь стрик при следующей активности.
 * Вызывается из home.tsx при загрузке — НЕ изменяет storage.
 *
 * Возвращает { willLose: true } когда:
 *  - был стрик > 1
 *  - пропущен ровно 1 день (заморозка ещё может помочь)
 *  - заморозка не активна
 *  - не premium
 *
 * Если пропущено 2+ дня — freeze всё равно не поможет, поэтому не предлагаем.
 */
export const checkStreakLossPending = async (): Promise<{ willLose: boolean; streakBefore: number }> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const dayBefore = new Date(); dayBefore.setDate(dayBefore.getDate() - 2);
    const dayBeforeStr = dayBefore.toISOString().split('T')[0];

    const lastActive = await AsyncStorage.getItem('last_active_date');
    // Уже активен сегодня или вчера — стрик в порядке
    if (!lastActive || lastActive === today || lastActive >= yesterdayStr) {
      return { willLose: false, streakBefore: 0 };
    }
    // Пропущено более 1 дня — заморозка уже не поможет, не показываем
    if (lastActive < dayBeforeStr) {
      return { willLose: false, streakBefore: 0 };
    }

    const streak = parseInt(await AsyncStorage.getItem('streak_count') || '0');
    if (streak <= 1) return { willLose: false, streakBefore: streak };

    const freezeRaw = await AsyncStorage.getItem('streak_freeze');
    const freeze = freezeRaw ? JSON.parse(freezeRaw) : null;
    const todayStr = new Date().toISOString().split('T')[0];
    // Заморозка уже активна сегодня — стрик будет сохранён автоматически
    if (freeze?.active && freeze?.date === todayStr) return { willLose: false, streakBefore: streak };

    return { willLose: true, streakBefore: streak };
  } catch { return { willLose: false, streakBefore: 0 }; }
};

// ── Сбросить всю статистику (для отладки / по запросу) ───────────────────────
export const resetAllStats = async () => {
  const keys = [
    'leaderboard', 'week_leaderboard', 'week_board_meta',
    'week_points', 'week_points_v2',
    'daily_stats',
    'streak_count', 'last_active_date',
    'week_days_done', 'week_days_week_key',
  ];
  for (const key of keys) {
    try { await AsyncStorage.removeItem(key); } catch {}
  }
};

// Required by Expo Router — not a screen
export default {};
