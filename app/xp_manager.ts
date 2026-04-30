import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { ensureAnonUser, syncToCloud } from './cloud_sync';
import { checkAchievements } from './achievements';
import { getXPMultiplier } from './club_boosts';
import { DebugLogger } from './debug-logger';
import { addOrUpdateScore, streakMultiplier } from './hall_of_fame_utils';
import { pushMyScore } from './firestore_leaderboard';
import { loadLeagueState } from './league_engine';
import { readGiftMultiplier } from './level_gift_system';
import { getLeagueBoostMultiplier } from './league_personal_boosts';
import { getVerifiedPremiumStatus } from './premium_guard';
import { recordActivityForRepair } from './streak_repair';
import { getLevelFromXP, TOTAL_XP_FOR_LEVEL } from '../constants/theme';
import { getBestAvatarForLevel, getBestFrameForLevel } from '../constants/avatars';
import { getTitleString } from '../constants/titles';
import type { Lang } from '../constants/i18n';
import { emitAppEvent } from './events';
import { getCanonicalUserId } from './user_id_policy';
// stationary_clubs feature удалён — мультипликатор фиксирован 1.

/** Уровень клуба недели (очки группы): +0.1 к множителю за каждый шаг от базового. */
async function getClubWeekTierMultiplier(): Promise<number> {
  try {
    const state = await loadLeagueState();
    return 1 + (state?.leagueId ?? 0) * 0.1;
  } catch {
    return 1;
  }
}

/** Клуб в XP: активный буст + уровень клуба недели (как раньше: boost + tier − 1 в аддитивной сумме). */
async function getCombinedClubMultiplier(): Promise<number> {
  const boostM = await getXPMultiplier();
  const tierM = await getClubWeekTierMultiplier();
  // stationary_clubs feature удалён → его мультипликатор всегда был бы 1.
  // Аддитивная формула boost + tier + 1 - 2 = boost + tier - 1.
  return boostM + tierM - 1;
}

/** Старые arena_profiles: clubM только буст + отдельное поле leagueM — склеиваем в один clubM. */
export function normalizeArenaMultipliersFirestore(raw: unknown): MultiplierBreakdown | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as Record<string, unknown>;
  const boostOnly = typeof m.clubM === 'number' ? m.clubM : 1;
  const legacyLeague = typeof m.leagueM === 'number' ? m.leagueM : 1;
  const hasLegacyLeague = Object.prototype.hasOwnProperty.call(m, 'leagueM') && legacyLeague !== 1;
  const clubM = hasLegacyLeague ? boostOnly + legacyLeague - 1 : boostOnly;
  return {
    clubM,
    streakM: typeof m.streakM === 'number' ? m.streakM : 1,
    comebackM: typeof m.comebackM === 'number' ? m.comebackM : 1,
    giftM: typeof m.giftM === 'number' ? m.giftM : 1,
    total: typeof m.total === 'number' ? m.total : 1,
  };
}

/**
 * Типы источников опыта
 */
export type XPSource = 
  | 'lesson_complete' 
  | 'lesson_answer'
  | 'quiz_answer' 
  | 'daily_task_reward' 
  | 'bonus_chest' 
  | 'wager_bet'    // Отрицательный (трата)
  | 'wager_win'    // Положительный (выигрыш)
  | 'dialog_complete'
  | 'vocabulary_learned'
  | 'verb_learned'
  | 'preposition_drill_answer'    // Правильный ответ в тренажёре предлогов (+2)
  | 'preposition_drill_perfect'   // Идеальное прохождение тренажёра предлогов (+10, разово на урок)
  | 'review_answer'
  | 'diagnostic_test'
  | 'daily_login_bonus'
  | 'exam_complete'
  | 'achievement_reward'
  | 'level_up_bonus';

interface XPResult {
  finalDelta: number;
  multiplier: number;
  isBonus: boolean;
}

/**
 * ЕДИНЫЙ МЕНЕДЖЕР ОПЫТА (XP Manager)
 * Центральный узел для всех изменений XP в приложении.
 */
/** Шаг роста множителя за номер урока (раньше 0.05 — слишком разгоняло позднюю игру). */
const LESSON_DIFF_PER_LESSON = 0.03;
/** Потолок множителя по уроку (без cap при +3%/урок на 32-м было бы ~×1.93). */
const LESSON_DIFF_CAP = 1.5;

/**
 * Множитель сложности урока: +3% за каждый урок, не выше LESSON_DIFF_CAP.
 * Урок 1 = ×1.00, урок 10 = ×1.27, урок 17+ = ×1.50 (cap).
 */
export const getLessonDifficultyMultiplier = (lessonNumber: number): number => {
  if (!lessonNumber || lessonNumber < 1) return 1;
  const raw = 1 + (lessonNumber - 1) * LESSON_DIFF_PER_LESSON;
  return Math.min(LESSON_DIFF_CAP, raw);
};

// Сериализует все вызовы registerXP — предотвращает race condition на user_total_xp
// при быстрых параллельных ответах (fire-and-forget без await).
let _xpLock: Promise<unknown> = Promise.resolve();

export const registerXP = async (
  amount: number,
  source: XPSource,
  userName: string,
  lang: Lang = 'ru',
  lessonNumber?: number
): Promise<XPResult> => {
  if (amount === 0) return { finalDelta: 0, multiplier: 1, isBonus: false };
  const result = _xpLock.then(async () => {
  let resolvedName = userName;
  try {
    if (!resolvedName) {
      const [canonicalUid, xpStored] = await Promise.all([
        getCanonicalUserId(),
        AsyncStorage.getItem('user_total_xp'),
      ]);
      const level = getLevelFromXP(parseInt(xpStored || '0', 10));
      const title = getTitleString(level, lang);
      const suffix = canonicalUid ? canonicalUid.replace(/-/g, '').slice(-4) : String(Math.floor(1000 + Math.random() * 9000));
      resolvedName = title + ' #' + suffix;
    }
    let finalDelta = amount;
    let totalMultiplier = 1;

    // 1. Множители применяются к заработку (уроки, квизы, сундуки, ежедневные задания)
    // К ставкам и выигрышам по ставкам множители не применяются.
    const isEarnedXP = ['lesson_complete', 'lesson_answer', 'quiz_answer', 'bonus_chest', 'dialog_complete', 'vocabulary_learned', 'verb_learned', 'preposition_drill_answer', 'preposition_drill_perfect', 'review_answer', 'exam_complete', 'diagnostic_test', 'daily_login_bonus', 'daily_task_reward'].includes(source);

    if (isEarnedXP && amount > 0) {
      // А) Клуб: XP-буст + уровень клуба недели (один множитель в UI и при начислении)
      const clubM = await getCombinedClubMultiplier();

      // Б) Множитель за стрик (x2, x3, x5)
      const streakRaw = await AsyncStorage.getItem('streak_count');
      const streakM = streakMultiplier(parseInt(streakRaw || '0'));

      // В) Comeback бонус (x2)
      const todayStr = new Date().toISOString().split('T')[0];
      const comebackRaw = await AsyncStorage.getItem('comeback_active');
      const comebackM = (comebackRaw === todayStr) ? 2 : 1;

      // Г) Множитель сложности урока (+5% за каждый урок, только для lesson_answer/lesson_complete)
      const lessonDiffM = (lessonNumber && (source === 'lesson_answer' || source === 'lesson_complete'))
        ? getLessonDifficultyMultiplier(lessonNumber)
        : 1;

      // Д) Подарок за уровень (×2 XP на час)
      const giftM = await readGiftMultiplier();
      // Е) Персональный буст лиги (x2/x3 на ограниченное время)
      const leagueBoostM = await getLeagueBoostMultiplier();

      totalMultiplier = 1 + (clubM - 1) + (streakM - 1) + (comebackM - 1) + (lessonDiffM - 1) + (giftM - 1) + (leagueBoostM - 1);
      finalDelta = Math.round(amount * totalMultiplier);

      // Сохраняем множители в arena_profiles/{uid} для показа другим игрокам
      try {
        const db = firestore();
        ensureAnonUser().then((uid: string | null) => {
          if (!uid) return;
          db.collection('arena_profiles').doc(uid).set({
            multipliers: { clubM, streakM, comebackM, giftM: giftM + leagueBoostM - 1, total: totalMultiplier, updatedAt: Date.now() },
          }, { merge: true }).catch(() => {});
        }).catch(() => {});
      } catch {}
    }

    // 2. Обновляем основные структуры данных через hall_of_fame_utils
    // Это обновит: leaderboard, week_leaderboard, week_points_v2, daily_stats и стрик
    await addOrUpdateScore(resolvedName, finalDelta, lang);

    // 3. Обновляем глобальный счетчик user_total_xp (XP никогда не уходит в минус)
    const totalXPRaw = await AsyncStorage.getItem('user_total_xp');
    const currentTotal = parseInt(totalXPRaw || '0');
    const newTotal = Math.max(0, currentTotal + finalDelta);
    await AsyncStorage.setItem('user_total_xp', String(newTotal));

    // 3.1. Уведомляем все подписчики о смене XP
    if (finalDelta > 0) {
      emitAppEvent('xp_changed');
    }

    // 3.2. Детектируем level-up прямо здесь — надёжнее чем в home.tsx через listener
    if (finalDelta > 0) {
      const prevXPRaw = await AsyncStorage.getItem('user_prev_xp');
      const prevXP = parseInt(prevXPRaw || '0') || 0;
      if (newTotal > prevXP) {
        const prevLvl = getLevelFromXP(prevXP);
        const newLvl  = getLevelFromXP(newTotal);
        if (newLvl > prevLvl) {
          // Обновляем аватар и рамку по финальному уровню
          const newAv = getBestAvatarForLevel(newLvl);
          const newFr = getBestFrameForLevel(newLvl);
          // Читаем текущую очередь и добавляем ВСЕ промежуточные уровни
          const queueRaw = await AsyncStorage.getItem('pending_level_up_queue');
          let queue: number[] = [];
          try { if (queueRaw) { const parsed = JSON.parse(queueRaw); queue = Array.isArray(parsed) ? parsed : []; } } catch {}
          for (let lvl = prevLvl + 1; lvl <= newLvl; lvl++) {
            if (!queue.includes(lvl)) queue.push(lvl);
          }
          await AsyncStorage.multiSet([
            ['user_avatar', newAv],
            ['user_frame', newFr.id],
            ['pending_level_up_queue', JSON.stringify(queue)],
            ['user_prev_xp', String(newTotal)],
          ]);
          emitAppEvent('level_up_pending');
          emitAppEvent('energy_reload'); // перезагружаем энергию после level-up
          emitAppEvent('xp_changed');    // обновляем UI в home.tsx
        } else {
          await AsyncStorage.setItem('user_prev_xp', String(newTotal));
        }
      }
    }

    // 4. Стрик-ремонт: любая активность с XP чинит стрик
    if (isEarnedXP && finalDelta > 0) {
      recordActivityForRepair().catch(() => {});
    }

    // 5. ТРИГГЕРЫ: Автоматизация прогресса

    // А) lesson_answer/quiz_answer обновляются в экранах-источниках,
    // чтобы избежать дублей и расхождения с фактическими условиями задач.

    // Б) Проверка достижений по общему количеству XP (achievements.ts)
    // Пропускаем если source === 'achievement_reward', чтобы не создавать рекурсию:
    // checkAchievements → registerXP('achievement_reward') → checkAchievements → ...
    if (finalDelta > 0 && source !== 'achievement_reward' && source !== 'level_up_bonus') {
      await checkAchievements({ type: 'xp', totalXP: newTotal });
    }

    // Синхронизируем прогресс в облако (fire-and-forget)
    syncToCloud().catch(() => {});

    // Обновляем leaderboard/{uid} напрямую — не ждём Cloud Function
    if (finalDelta > 0) {
      const weekPtsRaw = await AsyncStorage.getItem('week_points_v2').catch(() => null);
      let weekPoints = 0;
      try {
        if (weekPtsRaw) weekPoints = (JSON.parse(weekPtsRaw) as any).points ?? 0;
      } catch {}
      const streakVal = parseInt((await AsyncStorage.getItem('streak_count').catch(() => '0')) || '0') || undefined;
      const frameId = await AsyncStorage.getItem('user_frame').catch(() => null);
      const lsRaw = await AsyncStorage.getItem('league_state_v3').catch(() => null);
      let leagueId: number | undefined;
      try { if (lsRaw) leagueId = JSON.parse(lsRaw).leagueId; } catch {}
      const premiumStatus = await getVerifiedPremiumStatus().catch(() => false);
      pushMyScore(
        resolvedName,
        newTotal,
        weekPoints,
        lang,
        String(getLevelFromXP(newTotal)),
        streakVal,
        leagueId,
        frameId ?? undefined,
        premiumStatus,
      ).catch(() => {});
    }

    return {
      finalDelta,
      multiplier: totalMultiplier,
      isBonus: totalMultiplier > 1
    };
  } catch (error) {
    DebugLogger.error('xp_manager.ts:registerXP', error, 'critical');
    // Fallback: пишем как есть в случае критического сбоя
    try { await addOrUpdateScore(resolvedName, amount, lang); } catch {}
    return { finalDelta: amount, multiplier: 1, isBonus: false };
  }
  });
  _xpLock = result.catch(() => {});
  return result;
};

const XP_MIGRATION_KEY = 'xp_formula_v2_migrated';

// Старая формула: (L-1)^2 * 50
const oldLevelFromXP = (xp: number): number => {
  if (xp <= 0) return 1;
  return Math.min(50, Math.floor(Math.sqrt(xp / 50)) + 1);
};

/**
 * Миграция XP при смене формулы уровней.
 * Сохраняет уровень пользователя, пересчитывает XP под новый порог.
 * Запускать один раз при старте приложения.
 */
export const migrateXPFormulaV2 = async (): Promise<void> => {
  try {
    const done = await AsyncStorage.getItem(XP_MIGRATION_KEY);
    if (done) return;

    // Если пользователь уже прошёл миграцию xp_migration_v2 (home.tsx) — он уже на новой формуле.
    // Просто помечаем как мигрированного, не трогаем XP.
    const newFormulaDone = await AsyncStorage.getItem('xp_migration_v2');
    if (newFormulaDone) {
      await AsyncStorage.setItem(XP_MIGRATION_KEY, '1');
      return;
    }

    const raw = await AsyncStorage.getItem('user_total_xp');
    const currentXP = parseInt(raw || '0', 10);
    if (currentXP <= 0) {
      await AsyncStorage.setItem(XP_MIGRATION_KEY, '1');
      return;
    }

    const oldLevel = oldLevelFromXP(currentXP);
    const newXP = TOTAL_XP_FOR_LEVEL(oldLevel);

    // Никогда не уменьшаем XP — только увеличиваем или оставляем как есть
    if (newXP <= currentXP) {
      await AsyncStorage.setItem(XP_MIGRATION_KEY, '1');
      return;
    }

    await AsyncStorage.multiSet([
      ['user_total_xp', String(newXP)],
      ['user_prev_xp', String(newXP)],
      [XP_MIGRATION_KEY, '1'],
    ]);

    emitAppEvent('xp_updated', { total: newXP, delta: 0 });
  } catch {}
};

/**
 * Получить текущий глобальный множитель игрока (для UI)
 */
export const getCurrentMultiplier = async (): Promise<number> => {
  try {
    const clubM = await getCombinedClubMultiplier();
    const streakRaw = await AsyncStorage.getItem('streak_count');
    const streakM = streakMultiplier(parseInt(streakRaw || '0'));

    const todayStr = new Date().toISOString().split('T')[0];
    const comebackRaw = await AsyncStorage.getItem('comeback_active');
    const comebackM = (comebackRaw === todayStr) ? 2 : 1;
    const giftM = await readGiftMultiplier();
    const leagueBoostM = await getLeagueBoostMultiplier();

    return 1 + (clubM - 1) + (streakM - 1) + (comebackM - 1) + (giftM - 1) + (leagueBoostM - 1);
  } catch {
    return 1;
  }
};

export interface MultiplierBreakdown {
  clubM: number;
  streakM: number;
  comebackM: number;
  giftM: number;
  total: number;
}

export const getCurrentMultiplierBreakdown = async (): Promise<MultiplierBreakdown> => {
  try {
    const clubM = await getCombinedClubMultiplier();
    const streakRaw = await AsyncStorage.getItem('streak_count');
    const streakM = streakMultiplier(parseInt(streakRaw || '0'));
    const todayStr = new Date().toISOString().split('T')[0];
    const comebackRaw = await AsyncStorage.getItem('comeback_active');
    const comebackM = (comebackRaw === todayStr) ? 2 : 1;
    const giftM = await readGiftMultiplier();
    const leagueBoostM = await getLeagueBoostMultiplier();
    const combinedGiftM = giftM + leagueBoostM - 1;
    const total = 1 + (clubM - 1) + (streakM - 1) + (comebackM - 1) + (combinedGiftM - 1);
    return { clubM, streakM, comebackM, giftM: combinedGiftM, total };
  } catch {
    return { clubM: 1, streakM: 1, comebackM: 1, giftM: 1, total: 1 };
  }
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
