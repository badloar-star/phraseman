import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { storageGetString, storageGetNumber, storageSetString } from '../lib/storage';
import { ensureAnonUser, syncToCloud } from './cloud_sync';
import { checkAchievements } from './achievements';
import { getXPMultiplier } from './club_boosts';
import { getLeagueGroupBoostMultiplier } from './league_group_boosts';
import { DebugLogger } from './debug-logger';
import { addOrUpdateScore, streakMultiplier } from './hall_of_fame_utils';
import { loadLeagueState } from './league_engine';
import { consumeGiftXpBank, readGiftMultiplier, readGiftMultiplierForBaseXp } from './level_gift_system';
import { getLeagueBoostMultiplier } from './league_personal_boosts';
import { recordActivityForRepair } from './streak_repair';
import { getLevelFromXP } from '../constants/theme';
import { getBestAvatarForLevel, getBestFrameForLevel } from '../constants/avatars';
import { isCustomAvatarValue } from '../constants/custom_avatars';
import { writeFriendEvent } from './firestore_friend_activity';
import { getTitleString } from '../constants/titles';
import type { Lang } from '../constants/i18n';
import { emitAppEvent } from './events';
import { getCanonicalUserId } from './user_id_policy';
import { addWeeklyXp } from './weekly_xp';
import { consumeLeagueChestXpOverrideMultiplier } from './services/league_chest_rewards';
import { refreshWeeklyRecapNotificationAfterXpChange } from './notifications';
import { syncPublicProfileSnapshot } from './public_profile_snapshot';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import {
  mirrorProgressResultToLocal,
  submitProgressEvent,
  type ProgressEventResult,
  type ProgressEventType,
} from './progress_events_client';
import {
  restoredXPForOld250VisibleLevel,
  XP_LEVEL_RESTORE_250_TO_400_KEY,
} from './xp_level_restore';
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
    leagueBoostM: typeof m.leagueBoostM === 'number' ? m.leagueBoostM : 1,
    leagueGroupBoostM: typeof m.leagueGroupBoostM === 'number' ? m.leagueGroupBoostM : 1,
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
  | 'daily_phrase_quest'
  | 'exam_complete'
  | 'achievement_reward'
  | 'level_up_bonus'
  | 'plan_task_complete';   // Завершение задачи персонального плана

interface XPResult {
  finalDelta: number;
  multiplier: number;
  isBonus: boolean;
}

export type RegisterXPOptions = {
  eventId?: string;
  payload?: Record<string, unknown>;
};

function progressEventTypeForSource(source: XPSource): ProgressEventType | null {
  switch (source) {
    case 'lesson_complete':
    case 'lesson_answer':
    case 'quiz_answer':
    case 'daily_task_reward':
    case 'bonus_chest':
    case 'dialog_complete':
    case 'vocabulary_learned':
    case 'verb_learned':
    case 'preposition_drill_answer':
    case 'preposition_drill_perfect':
    case 'review_answer':
    case 'diagnostic_test':
    case 'daily_login_bonus':
    case 'daily_phrase_quest':
    case 'exam_complete':
    case 'achievement_reward':
    case 'level_up_bonus':
    case 'plan_task_complete':
    case 'wager_win':
      return source;
    case 'wager_bet':
      return null;
    default:
      return null;
  }
}

function progressServerRequired(): boolean {
  return CLOUD_SYNC_ENABLED && !IS_EXPO_GO;
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
const XP_CLOUD_SYNC_DEFER_MS = 3500;

export const registerXP = async (
  amount: number,
  source: XPSource,
  userName: string,
  lang: Lang = 'ru',
  lessonNumber?: number,
  options?: RegisterXPOptions,
): Promise<XPResult> => {
  if (amount === 0) return { finalDelta: 0, multiplier: 1, isBonus: false };
  const result = _xpLock.then(async () => {
  let resolvedName = userName;
  let serverAward: ProgressEventResult | null = null;
  try {
    if (!resolvedName) {
      const [canonicalUid, xpStored] = await Promise.all([
        getCanonicalUserId(),
        storageGetString('user_total_xp'),
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
    const isEarnedXP = ['lesson_complete', 'lesson_answer', 'quiz_answer', 'bonus_chest', 'dialog_complete', 'vocabulary_learned', 'verb_learned', 'preposition_drill_answer', 'preposition_drill_perfect', 'review_answer', 'exam_complete', 'diagnostic_test', 'daily_login_bonus', 'daily_phrase_quest', 'daily_task_reward', 'plan_task_complete'].includes(source);

    if (isEarnedXP && amount > 0) {
      // А) Клуб: XP-буст + уровень клуба недели (один множитель в UI и при начислении)
      const clubM = await getCombinedClubMultiplier();

      // Б) Множитель за длину цепочки (x2, x3, x5)
      const streakRaw = await storageGetString('streak_count');
      const streakM = streakMultiplier(parseInt(streakRaw || '0'));

      // В) Comeback бонус (x2)
      const todayStr = new Date().toISOString().split('T')[0];
      const comebackRaw = await storageGetString('comeback_active');
      const comebackM = (comebackRaw === todayStr) ? 2 : 1;

      // Г) Множитель сложности урока (+5% за каждый урок, только для lesson_answer/lesson_complete)
      const lessonDiffM = (lessonNumber && (source === 'lesson_answer' || source === 'lesson_complete'))
        ? getLessonDifficultyMultiplier(lessonNumber)
        : 1;

      // Д) Подарок за уровень: timed multiplier или запас XP с ×2, без бесконечного стака.
      const giftState = await readGiftMultiplierForBaseXp(amount);
      const giftM = giftState.multiplier;
      // Е) Персональный буст лиги (x2/x3 на ограниченное время)
      const leagueBoostM = await getLeagueBoostMultiplier();
      const leagueGroupBoostM = await getLeagueGroupBoostMultiplier();
      const leagueChestM = await consumeLeagueChestXpOverrideMultiplier();

      totalMultiplier = 1 + (clubM - 1) + (streakM - 1) + (comebackM - 1) + (lessonDiffM - 1) + (giftM - 1) + (leagueBoostM - 1) + (leagueGroupBoostM - 1) + (leagueChestM - 1);
      finalDelta = Math.round(amount * totalMultiplier);
      // Сохраняем множители в arena_profiles/{uid} для показа другим игрокам
      try {
        const db = firestore();
        ensureAnonUser().then((uid: string | null) => {
          if (!uid) return;
          db.collection('arena_profiles').doc(uid).set({
            multipliers: { clubM, streakM, comebackM, giftM, leagueBoostM, leagueGroupBoostM, total: totalMultiplier, updatedAt: Date.now() },
          }, { merge: true }).catch(() => {});
        }).catch(() => {});
      } catch (e) {
        if (__DEV__) console.warn('[xp_manager]', e);
      }

      const eventType = progressEventTypeForSource(source);
      if (progressServerRequired() && eventType && finalDelta > 0) {
        const localTotalBeforeServer = await storageGetNumber('user_total_xp', 0);
        try {
          serverAward = await submitProgressEvent({
            eventId: options?.eventId,
            type: eventType,
            payload: {
              xpDelta: finalDelta,
              baseAmount: amount,
              source,
              lessonId: lessonNumber ?? null,
              lessonNumber: lessonNumber ?? null,
              localTotalBeforeServer,
              multiplier: totalMultiplier,
              ...(options?.payload ?? {}),
            },
          });
          finalDelta = serverAward.xpDelta;
        } catch (serverError) {
          // Событие встало в очередь (offline/network). Продолжаем с локальным XP —
          // сервер синхронизируется при следующем запросе через flushPendingProgressEvents.
          DebugLogger.warn('xp_manager.ts:registerXP', serverError, 'server_queued');
        }
      }
      if (giftState.consumeBank && finalDelta > 0) {
        await consumeGiftXpBank(amount).catch(() => 0);
      }
    }

    // 2. Обновляем основные структуры данных через hall_of_fame_utils
    // Это обновит: leaderboard, week_leaderboard, week_points_v2, daily_stats и цепочку
    const fallbackEventType = progressEventTypeForSource(source);
    if (progressServerRequired() && fallbackEventType && finalDelta > 0 && !serverAward) {
      const localTotalBeforeServer = await storageGetNumber('user_total_xp', 0);
      try {
        serverAward = await submitProgressEvent({
          eventId: options?.eventId,
          type: fallbackEventType,
          payload: {
            xpDelta: finalDelta,
            baseAmount: amount,
            source,
            lessonId: lessonNumber ?? null,
            lessonNumber: lessonNumber ?? null,
            localTotalBeforeServer,
            multiplier: totalMultiplier,
            ...(options?.payload ?? {}),
          },
        });
        finalDelta = serverAward.xpDelta;
      } catch (serverError) {
        DebugLogger.warn('xp_manager.ts:registerXP', serverError, 'server_queued_fallback');
      }
    }
    await addOrUpdateScore(resolvedName, finalDelta, lang);
    if (serverAward) {
      await mirrorProgressResultToLocal(serverAward);
    }

    // 3. Обновляем глобальный счетчик user_total_xp (XP никогда не уходит в минус)
    const currentTotal = serverAward
      ? Math.max(0, serverAward.totalXp - finalDelta)
      : await storageGetNumber('user_total_xp', 0);
    const newTotal = serverAward
      ? serverAward.totalXp
      : Math.max(0, currentTotal + finalDelta);
    if (!serverAward) {
      await storageSetString('user_total_xp', String(newTotal));
    }
    // XP-01: Track weekly XP in lockstep with total XP. addWeeklyXp internally
    // ignores delta <= 0 and self-heals stale week period. Synced to Firestore
    // via SYNC_KEYS in cloud_sync.ts → users/{canonicalUid}.progress.weekly_xp.
    if (finalDelta > 0 && !serverAward) {
      await addWeeklyXp(finalDelta);
      refreshWeeklyRecapNotificationAfterXpChange(lang);
    } else if (finalDelta > 0) {
      refreshWeeklyRecapNotificationAfterXpChange(lang);
    }

    // 3.1. Уведомляем все подписчики о смене XP
    if (finalDelta > 0) {
      emitAppEvent('xp_changed');
    }

    // 3.2. Детектируем level-up прямо здесь — надёжнее чем в home.tsx через listener
    if (finalDelta > 0) {
      const prevLvl = getLevelFromXP(currentTotal);
      const newLvl  = getLevelFromXP(newTotal);
      if (newLvl > prevLvl) {
        // Обновляем аватар и рамку по финальному уровню
        const currentAvatar = await storageGetString('user_avatar');
        const newAv = isCustomAvatarValue(currentAvatar) ? currentAvatar! : getBestAvatarForLevel(newLvl);
        const newFr = getBestFrameForLevel(newLvl);
        // Читаем текущую очередь и добавляем ВСЕ промежуточные уровни текущего начисления
        const queueRaw = await storageGetString('pending_level_up_queue');
        let queue: number[] = [];
        try { if (queueRaw) { const parsed = JSON.parse(queueRaw); queue = Array.isArray(parsed) ? parsed : []; } } catch (e) { if (__DEV__) console.warn('[xp_manager]', e); }
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
        // Лента друзей: клиент (тестеры/registerXP) + CF после синка — один doc id level_up_{lvl}
        writeFriendEvent('level_up', { level: newLvl }).catch(() => {});
        checkAchievements({ type: 'level_reached', level: newLvl }).catch(() => {});
      } else {
        await storageSetString('user_prev_xp', String(newTotal));
      }
    }

    // 4. Ремонт цепочки: любая активность с XP восстанавливает цепочку
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
      await checkAchievements({ type: 'time_of_day' });
    }
    if (finalDelta > 0 && source === 'wager_win') {
      await checkAchievements({ type: 'wager_win' });
    }

    // Синхронизируем прогресс в облако (fire-and-forget)
    syncToCloud({ deferMs: XP_CLOUD_SYNC_DEFER_MS }).catch(() => {});

    // Public profile is local-first: user sees XP immediately, server snapshot refreshes rarely.
    if (finalDelta > 0) {
      const streakVal = (await storageGetNumber('streak_count', 0)) || undefined;
      const frameId = await storageGetString('user_frame');
      const lsRaw = await storageGetString('league_state_v3');
      let leagueId: number | undefined;
      try { if (lsRaw) leagueId = JSON.parse(lsRaw).leagueId; } catch (e) { if (__DEV__) console.warn('[xp_manager]', e); }
      syncPublicProfileSnapshot({
        reason: 'daily_xp',
        name: resolvedName,
        totalXp: newTotal,
        lang,
        avatar: String((await storageGetString('user_avatar')) || getLevelFromXP(newTotal)),
        streak: streakVal,
        leagueId,
        frame: frameId ?? undefined,
      }).catch(() => {});
    }

    return {
      finalDelta,
      multiplier: totalMultiplier,
      isBonus: totalMultiplier > 1
    };
  } catch (error) {
    DebugLogger.error('xp_manager.ts:registerXP', error, 'critical');
    if (serverAward) {
      return { finalDelta: serverAward.xpDelta, multiplier: 1, isBonus: serverAward.xpDelta !== amount };
    }
    // Fallback: пишем как есть в случае критического сбоя (не сетевая ошибка —
    // сетевые перехвачены раньше и событие уже в очереди).
    try { await addOrUpdateScore(resolvedName, amount, lang); } catch (e) { if (__DEV__) console.warn('[xp_manager]', e); }
    return { finalDelta: amount, multiplier: 1, isBonus: false };
  }
  });
  _xpLock = result.catch(() => {});
  return result;
};

const XP_MIGRATION_KEY = 'xp_formula_v2_migrated';

// Старая формула: (L-1)^2 * 50
/**
 * Миграция XP при смене формулы уровней.
 * Сохраняет уровень пользователя, пересчитывает XP под новый порог.
 * Запускать один раз при старте приложения.
 */
export const migrateXPFormulaV2 = async (): Promise<void> => {
  try {
    // Если пользователь уже прошёл миграцию xp_migration_v2 (home.tsx) — он уже на новой формуле.
    // Просто помечаем как мигрированного, не трогаем XP.
    // Do not trust legacy markers here; they may have been set before the
    // 250-to-400 restore actually lifted XP on every account.
    const currentXP = await storageGetNumber('user_total_xp', 0);
    if (currentXP <= 0) {
      await storageSetString(XP_LEVEL_RESTORE_250_TO_400_KEY, '1');
      await storageSetString(XP_MIGRATION_KEY, '1');
      return;
    }

    const restored = restoredXPForOld250VisibleLevel(currentXP);
    const newXP = restored.targetXP;

    // Никогда не уменьшаем XP — только увеличиваем или оставляем как есть
    if (newXP <= currentXP) {
      await storageSetString(XP_LEVEL_RESTORE_250_TO_400_KEY, '1');
      await storageSetString(XP_MIGRATION_KEY, '1');
      return;
    }

    const currentAvatar = await storageGetString('user_avatar');
    const nextLevel = getLevelFromXP(newXP);
    const nextAvatar = isCustomAvatarValue(currentAvatar) ? currentAvatar! : getBestAvatarForLevel(nextLevel);
    const nextFrame = getBestFrameForLevel(nextLevel);
    await AsyncStorage.multiSet([
      ['user_total_xp', String(newXP)],
      ['user_prev_xp', String(newXP)],
      ['user_avatar', nextAvatar],
      ['user_frame', nextFrame.id],
      [XP_LEVEL_RESTORE_250_TO_400_KEY, '1'],
      [XP_MIGRATION_KEY, '1'],
    ]);

    emitAppEvent('xp_changed');
    emitAppEvent('xp_updated', { total: newXP, delta: 0 });
    syncToCloud({ forceNow: true }).catch(() => {});
  } catch (e) {
    if (__DEV__) console.warn('[xp_manager]', e);
  }
};

/**
 * Получить текущий глобальный множитель игрока (для UI)
 */
export const getCurrentMultiplier = async (): Promise<number> => {
  try {
    const clubM = await getCombinedClubMultiplier();
    const streakRaw = await storageGetString('streak_count');
    const streakM = streakMultiplier(parseInt(streakRaw || '0'));

    const todayStr = new Date().toISOString().split('T')[0];
    const comebackRaw = await storageGetString('comeback_active');
    const comebackM = (comebackRaw === todayStr) ? 2 : 1;
    const giftM = await readGiftMultiplier();
    const leagueBoostM = await getLeagueBoostMultiplier();
    const leagueGroupBoostM = await getLeagueGroupBoostMultiplier();

    return 1 + (clubM - 1) + (streakM - 1) + (comebackM - 1) + (giftM - 1) + (leagueBoostM - 1) + (leagueGroupBoostM - 1);
  } catch {
    return 1;
  }
};

export interface MultiplierBreakdown {
  clubM: number;
  streakM: number;
  comebackM: number;
  giftM: number;
  leagueBoostM: number;
  leagueGroupBoostM: number;
  total: number;
}

export const getCurrentMultiplierBreakdown = async (): Promise<MultiplierBreakdown> => {
  try {
    const clubM = await getCombinedClubMultiplier();
    const streakRaw = await storageGetString('streak_count');
    const streakM = streakMultiplier(parseInt(streakRaw || '0'));
    const todayStr = new Date().toISOString().split('T')[0];
    const comebackRaw = await storageGetString('comeback_active');
    const comebackM = (comebackRaw === todayStr) ? 2 : 1;
    const giftM = await readGiftMultiplier();
    const leagueBoostM = await getLeagueBoostMultiplier();
    const leagueGroupBoostM = await getLeagueGroupBoostMultiplier();
    const total = 1 + (clubM - 1) + (streakM - 1) + (comebackM - 1) + (giftM - 1) + (leagueBoostM - 1) + (leagueGroupBoostM - 1);
    return { clubM, streakM, comebackM, giftM, leagueBoostM, leagueGroupBoostM, total };
  } catch {
    return { clubM: 1, streakM: 1, comebackM: 1, giftM: 1, leagueBoostM: 1, leagueGroupBoostM: 1, total: 1 };
  }
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
