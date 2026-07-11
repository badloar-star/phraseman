import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { storageGetString, storageGetNumber, storageSetString } from '../lib/storage';
import { ensureAnonUser, markCloudSyncPending } from './cloud_sync';
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
import { consumeLeagueChestXpOverrideMultiplier, peekLeagueChestXpOverrideMultiplier } from './services/league_chest_rewards';
import { boonXpMultiplierContribution } from './boons/boon_effects_xp';
import { refreshWeeklyRecapNotificationAfterXpChange } from './notifications';
import { syncPublicProfileSnapshot } from './public_profile_snapshot';
import { patchAppSnapshot } from './app_snapshot_store';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import {
  prepareProgressMigrationSnapshot,
  submitProgressEvent,
  makeDeterministicProgressEventId,
  type ProgressEventRequest,
  type ProgressEventType,
} from './progress_events_client';
import {
  XP_LEVEL_RESTORE_250_TO_400_KEY,
} from './xp_level_restore';
import { getLocalDayKey, isSameLocalOrUtcDay, isYesterdayFlexible } from './local_date';
import { reconcileLevelUpRewards } from './level_up_reward_reconciler';
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
    // Старые arena_profiles этих полей не хранят — дефолтим к нейтральным.
    leagueChestM: typeof m.leagueChestM === 'number' ? m.leagueChestM : 1,
    boonXpContribution: typeof m.boonXpContribution === 'number' ? m.boonXpContribution : 0,
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
  | 'plan_task_complete'    // Завершение задачи персонального плана
  | 'club_mission_complete'; // Первое прохождение миссии «Разговорного клуба»

interface XPResult {
  finalDelta: number;
  multiplier: number;
  isBonus: boolean;
}

export type RegisterXPOptions = {
  eventId?: string;
  payload?: Record<string, unknown>;
  skipLeagueChestMultiplier?: boolean;
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
    case 'club_mission_complete':
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

const LOCAL_PROGRESS_EVENT_LEDGER_KEY = 'progress_local_event_applied_v1';
const LOCAL_PROGRESS_EVENT_LEDGER_MAX = 1_000;
const MAX_LOCAL_XP_MULTIPLIER = 20;
const MAX_LOCAL_XP_DELTA = 25_000;

function localProgressEventLedgerKey(stableUid: string): string {
  return `${LOCAL_PROGRESS_EVENT_LEDGER_KEY}:${encodeURIComponent(stableUid)}`;
}

function sanitizeLocalXpAmount(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.max(-MAX_LOCAL_XP_DELTA, Math.min(MAX_LOCAL_XP_DELTA, amount));
}

function sanitizeLocalXpMultiplier(multiplier: number): number {
  if (!Number.isFinite(multiplier)) return 1;
  return Math.max(1, Math.min(MAX_LOCAL_XP_MULTIPLIER, multiplier));
}

function patchProfileXpSnapshot(totalXp: number): void {
  const safeTotalXp = Math.max(0, Math.floor(Number(totalXp) || 0));
  try {
    patchAppSnapshot((current) => current.profile ? {
      profile: {
        ...current.profile,
        totalXp: safeTotalXp,
        level: getLevelFromXP(safeTotalXp),
        source: 'local',
        updatedAt: Date.now(),
      },
    } : {});
  } catch {
    // Snapshot is a UI cache only; AsyncStorage remains the source of truth.
  }
}

async function reserveLocalProgressEvent(eventId?: string): Promise<boolean> {
  const safeId = typeof eventId === 'string' ? eventId.trim() : '';
  if (!safeId) return true;
  try {
    const stableUid = String(await getCanonicalUserId() ?? '').trim();
    if (!stableUid) return true;
    const ledgerKey = localProgressEventLedgerKey(stableUid);
    const raw = await AsyncStorage.getItem(ledgerKey);
    const parsed = raw ? JSON.parse(raw) : [];
    const ids = Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string' && item.length > 0)
      : [];
    if (ids.includes(safeId)) return false;
    ids.push(safeId);
    await AsyncStorage.setItem(
      ledgerKey,
      JSON.stringify(ids.slice(-LOCAL_PROGRESS_EVENT_LEDGER_MAX)),
    );
  } catch {
    // If the tiny local ledger fails, keep the reward flow alive.
  }
  return true;
}

function submitProgressEventOptimistically(
  request: ProgressEventRequest,
  migrationSnapshot: Promise<Record<string, string> | null> | null,
  logLabel: string,
): void {
  void (async () => {
    const snapshot = migrationSnapshot ? await migrationSnapshot : null;
    return submitProgressEvent(request, { migrationSnapshot: snapshot });
  })()
    .then(() => {
      emitAppEvent('xp_changed');
    })
    .catch((serverError) => {
      DebugLogger.error(logLabel, serverError, 'warning');
    });
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
// Таймаут — только страховка от «зависшего» предыдущего вызова (внутри лока
// НЕТ ожидаемых сетевых операций — всё AsyncStorage; сервер fire-and-forget).
// 1200мс были малы: медленный storage бюджетного Android при серии быстрых
// ответов превышал их, вызовы шли параллельно, и read-modify-write
// user_total_xp терял одно из начислений. 10с закрывает окно гонки, оставаясь
// защитой от вечного дедлока.
const XP_LOCK_WAIT_TIMEOUT_MS = 10_000;

function waitForPreviousXpLock(lock: Promise<unknown>): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const finish = () => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve();
    };
    timer = setTimeout(finish, XP_LOCK_WAIT_TIMEOUT_MS);
    (timer as any)?.unref?.();
    lock.then(finish, finish);
  });
}

export const registerXP = async (
  amount: number,
  source: XPSource,
  userName: string,
  lang: Lang = 'ru',
  lessonNumber?: number,
  options?: RegisterXPOptions,
): Promise<XPResult> => {
  amount = sanitizeLocalXpAmount(amount);
  if (amount === 0) return { finalDelta: 0, multiplier: 1, isBonus: false };
  const result = waitForPreviousXpLock(_xpLock).then(async () => {
  let resolvedName = userName;
  let appliedDelta = amount;
  let scoreWritten = false;
  let totalXpWritten = false;
  let weeklyXpWritten = false;
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
    let progressEventRequest: ProgressEventRequest | null = null;
    let progressEventMigrationSnapshot: Promise<Record<string, string> | null> | null = null;
    let progressEventLogLabel = 'xp_manager.ts:registerXP:server_queued';

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
      const leagueChestM = options?.skipLeagueChestMultiplier
        ? 1
        : await consumeLeagueChestXpOverrideMultiplier();

      // Ж) Weekly Boons: «Двойной четверг» (×2) + «Ранняя пташка» (×1.1 до 10:00).
      // Аддитивный вклад в ту же формулу, что и остальные множители.
      const boonXpContribution = boonXpMultiplierContribution();

      totalMultiplier = sanitizeLocalXpMultiplier(
        1 + (clubM - 1) + (streakM - 1) + (comebackM - 1) + (lessonDiffM - 1) + (giftM - 1) + (leagueBoostM - 1) + (leagueGroupBoostM - 1) + (leagueChestM - 1) + boonXpContribution,
      );
      finalDelta = sanitizeLocalXpAmount(Math.round(amount * totalMultiplier));
      appliedDelta = finalDelta;
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
        progressEventMigrationSnapshot = prepareProgressMigrationSnapshot().catch(() => null);
        const basePayload = {
          xpDelta: finalDelta,
          baseAmount: amount,
          source,
          lessonId: lessonNumber ?? null,
          lessonNumber: lessonNumber ?? null,
          multiplier: totalMultiplier,
          ...(options?.payload ?? {}),
        };
        progressEventRequest = {
          eventId: options?.eventId || makeDeterministicProgressEventId(eventType, {
            ...basePayload,
          }),
          type: eventType,
          payload: basePayload,
        };
      }
      if (giftState.consumeBank && finalDelta > 0) {
        await consumeGiftXpBank(amount).catch(() => 0);
      }
    }

    // 2. Обновляем основные структуры данных через hall_of_fame_utils
    // Это обновит: leaderboard, week_leaderboard, week_points_v2, daily_stats и цепочку
    const fallbackEventType = progressEventTypeForSource(source);
      if (progressServerRequired() && fallbackEventType && finalDelta > 0 && !progressEventRequest) {
        progressEventMigrationSnapshot = prepareProgressMigrationSnapshot().catch(() => null);
        const baseFallbackPayload = {
          xpDelta: finalDelta,
          baseAmount: amount,
          source,
          lessonId: lessonNumber ?? null,
          lessonNumber: lessonNumber ?? null,
          multiplier: totalMultiplier,
          ...(options?.payload ?? {}),
        };
        progressEventLogLabel = 'xp_manager.ts:registerXP:server_queued_fallback';
        progressEventRequest = {
          eventId: options?.eventId || makeDeterministicProgressEventId(fallbackEventType, {
            ...baseFallbackPayload,
          }),
          type: fallbackEventType,
          payload: baseFallbackPayload,
        };
      }
      if (finalDelta > 0 && !(await reserveLocalProgressEvent(progressEventRequest?.eventId))) {
        if (progressEventRequest) {
          submitProgressEventOptimistically(progressEventRequest, progressEventMigrationSnapshot, progressEventLogLabel);
        }
      return { finalDelta: 0, multiplier: totalMultiplier, isBonus: false };
    }

    // 3. Обновляем глобальный счетчик user_total_xp (XP никогда не уходит в минус)
    const currentTotal = await storageGetNumber('user_total_xp', 0);
    const newTotal = Math.max(0, currentTotal + finalDelta);
    let scoreAvatar: string | undefined;
    await storageSetString('user_total_xp', String(newTotal));
    patchProfileXpSnapshot(newTotal);
    totalXpWritten = true;
    // Offline: streak_count не приходит через mirrorProgressResultToLocal —
    // обновляем локально сами чтобы UI показывал правильный стрик сразу.
    // Ключ дня — ЛОКАЛЬНАЯ дата устройства (getLocalDayKey), не UTC: иначе
    // пользователь вечером в UTC+N или утром в UTC-N может "пропустить" день
    // по UTC-часам, хотя занимался каждый календарный день у себя дома.
    // isYesterdayFlexible на переходный период принимает и старый (UTC), и
    // новый (локальный) ключ "вчера" как валидный — чтобы апдейт не сжёг стрик.
    if (finalDelta > 0) {
      const todayKey = getLocalDayKey();
      const lastDate = await AsyncStorage.getItem('last_active_date');
      if (!isSameLocalOrUtcDay(lastDate)) {
        const prevStreak = Number((await AsyncStorage.getItem('streak_count')) ?? '0') || 0;
        const next = isYesterdayFlexible(lastDate) ? prevStreak + 1 : 1;
        await AsyncStorage.multiSet([
          ['streak_count', String(next)],
          ['last_active_date', todayKey],
          ['streak_last_date', todayKey],
        ]);
      }
    }
    // XP-01: Track weekly XP in lockstep with total XP. addWeeklyXp internally
    // ignores delta <= 0 and self-heals stale week period. Synced to Firestore
    // via SYNC_KEYS in cloud_sync.ts → users/{canonicalUid}.progress.weekly_xp.
    if (finalDelta > 0) {
      await addWeeklyXp(finalDelta);
      weeklyXpWritten = true;
      refreshWeeklyRecapNotificationAfterXpChange(lang);
    }

    // 3.1. Уведомляем все подписчики о смене XP
    if (finalDelta > 0) {
      emitAppEvent('xp_changed');
    }
    if (progressEventRequest) {
      submitProgressEventOptimistically(progressEventRequest, progressEventMigrationSnapshot, progressEventLogLabel);
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
        scoreAvatar = newAv;
        await AsyncStorage.multiSet([
          ['user_avatar', newAv],
          ['user_frame', newFr.id],
          ['user_prev_xp', String(newTotal)],
        ]);
        await reconcileLevelUpRewards(currentTotal, newTotal);
        emitAppEvent('energy_reload'); // перезагружаем энергию после level-up
        emitAppEvent('xp_changed');    // обновляем UI в home.tsx
        // Лента друзей: клиент (тестеры/registerXP) + CF после синка — один doc id level_up_{lvl}
        writeFriendEvent('level_up', { level: newLvl }).catch(() => {});
        checkAchievements({ type: 'level_reached', level: newLvl }).catch(() => {});
      } else {
        await storageSetString('user_prev_xp', String(newTotal));
        scoreAvatar = (await storageGetString('user_avatar')) ?? String(getBestAvatarForLevel(newLvl));
      }
    }

    scoreWritten = true;
    void addOrUpdateScore(resolvedName, finalDelta, lang, scoreAvatar).catch((scoreError) => {
      DebugLogger.error('xp_manager.ts:registerXP:addOrUpdateScore', scoreError, 'warning');
    });

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
      checkAchievements({ type: 'xp', totalXP: newTotal }).catch(() => {});
      checkAchievements({ type: 'time_of_day' }).catch(() => {});
    }
    if (finalDelta > 0 && source === 'wager_win') {
      checkAchievements({ type: 'wager_win' }).catch(() => {});
    }

    // XP is local-first. Mark cloud sync as pending; the app-level
    // background/inactive flush decides when to send the phone's state.
    markCloudSyncPending();

    // Public profile is local-first: user sees XP immediately, server snapshot refreshes rarely.
    if (finalDelta > 0) {
      void (async () => {
        const streakVal = (await storageGetNumber('streak_count', 0)) || undefined;
        const frameId = await storageGetString('user_frame');
        const lsRaw = await storageGetString('league_state_v3');
        let leagueId: number | undefined;
        try { if (lsRaw) leagueId = JSON.parse(lsRaw).leagueId; } catch (e) { if (__DEV__) console.warn('[xp_manager]', e); }
        await syncPublicProfileSnapshot({
          reason: 'daily_xp',
          name: resolvedName,
          totalXp: newTotal,
          lang,
          avatar: String((await storageGetString('user_avatar')) || getLevelFromXP(newTotal)),
          streak: streakVal,
          leagueId,
          frame: frameId ?? undefined,
        });
      })().catch(() => {});
    }

    return {
      finalDelta,
      multiplier: totalMultiplier,
      isBonus: totalMultiplier > 1
    };
  } catch (error) {
    DebugLogger.error('xp_manager.ts:registerXP', error, 'critical');
    const fallbackDelta = Number.isFinite(appliedDelta) ? appliedDelta : amount;
    // Fallback: the XP counter is the source of truth. Optional surfaces
    // (leaderboards, boosts, achievements, notifications) must not be able to
    // make a completed lesson look like it awarded nothing.
    if (!totalXpWritten && fallbackDelta !== 0) {
      try {
        const currentTotal = await storageGetNumber('user_total_xp', 0);
        const fallbackTotal = Math.max(0, currentTotal + fallbackDelta);
        await storageSetString('user_total_xp', String(fallbackTotal));
        patchProfileXpSnapshot(fallbackTotal);
        totalXpWritten = true;
      } catch (storageError) {
        if (__DEV__) console.warn('[xp_manager]', storageError);
      }
    }
    if (fallbackDelta > 0 && !weeklyXpWritten) {
      try {
        await addWeeklyXp(fallbackDelta);
        weeklyXpWritten = true;
      } catch (weeklyError) {
        if (__DEV__) console.warn('[xp_manager]', weeklyError);
      }
    }
    if (fallbackDelta > 0) {
      emitAppEvent('xp_changed');
    }
    if (!scoreWritten) {
      scoreWritten = true;
      void addOrUpdateScore(resolvedName, fallbackDelta, lang).catch((scoreError) => {
        if (__DEV__) console.warn('[xp_manager]', scoreError);
      });
    }
    return { finalDelta: fallbackDelta, multiplier: 1, isBonus: false };
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
    // This marker must be the first storage read. A restored intermediate value
    // (for example 10,000 -> 14,192) must never be interpreted a second time.
    const restoreMarker = await storageGetString(XP_LEVEL_RESTORE_250_TO_400_KEY);
    if (restoreMarker === '1') return;

    // Legacy-маркер «xp_migration_v2»: раньше ставился one-shot эффектом при маунте
    // home.tsx (D4 — миграциям не место в экране). Сам XP он не меняет — маркер
    // читают handleOnboardingDone (_layout.tsx) и cloud_sync.
    const currentXP = await storageGetNumber('user_total_xp', 0);
    // Level-formula repair is a server/admin migration, not a boot-time client
    // mutation. A local device must never infer a new XP balance from an old
    // curve and silently jump the user through multiple levels.
    await AsyncStorage.multiSet([
      ['user_total_xp', String(currentXP)],
      ['user_prev_xp', String(currentXP)],
      ['xp_migration_v2', '1'],
      [XP_LEVEL_RESTORE_250_TO_400_KEY, '1'],
      [XP_MIGRATION_KEY, '1'],
    ]);
  } catch (e) {
    if (__DEV__) console.warn('[xp_manager]', e);
  }
};

export const __xpManagerTestHooks = {
  sanitizeLocalXpAmount,
  sanitizeLocalXpMultiplier,
  localProgressEventLedgerKey,
  progressEventTypeForSource,
  LOCAL_PROGRESS_EVENT_LEDGER_MAX,
  MAX_LOCAL_XP_MULTIPLIER,
  MAX_LOCAL_XP_DELTA,
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
    // H13: ранее UI занижал множитель — не учитывал leagueChestM и boonXpContribution,
    // которые registerXP уже добавляет к финальной формуле. Используем peek (НЕ consume),
    // иначе UI прожжёт одноразовый league chest бонус.
    const leagueChestM = await peekLeagueChestXpOverrideMultiplier();
    const boonXpContribution = boonXpMultiplierContribution();

    return 1 + (clubM - 1) + (streakM - 1) + (comebackM - 1) + (giftM - 1) + (leagueBoostM - 1) + (leagueGroupBoostM - 1) + (leagueChestM - 1) + boonXpContribution;
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
  /** Доступный одноразовый множитель «сундука лиги» (peek, не consume). */
  leagueChestM: number;
  /** Аддитивный вклад weekly boons (двойной четверг / ранняя пташка). */
  boonXpContribution: number;
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
    const leagueChestM = await peekLeagueChestXpOverrideMultiplier();
    const boonXpContribution = boonXpMultiplierContribution();
    const total = 1 + (clubM - 1) + (streakM - 1) + (comebackM - 1) + (giftM - 1) + (leagueBoostM - 1) + (leagueGroupBoostM - 1) + (leagueChestM - 1) + boonXpContribution;
    return { clubM, streakM, comebackM, giftM, leagueBoostM, leagueGroupBoostM, leagueChestM, boonXpContribution, total };
  } catch {
    return { clubM: 1, streakM: 1, comebackM: 1, giftM: 1, leagueBoostM: 1, leagueGroupBoostM: 1, leagueChestM: 1, boonXpContribution: 0, total: 1 };
  }
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
