import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageGetString, storageGetNumber, storageSetString } from '../lib/storage';
import { markCloudSyncPending } from './cloud_sync';
import { enqueueLevelSpinLevelUps } from './level_spin_level_up_queue';
import { checkAchievements } from './achievements';
import { getXPMultiplier } from './club_boosts';
import { getLeagueGroupBoostMultiplier } from './league_group_boosts';
import { getLeagueHotHoursMultiplier } from './league_hot_hours';
import { DebugLogger } from './debug-logger';
import { enqueueSecondaryXpProjection, streakMultiplier } from './hall_of_fame_utils';
import { getWeekId, loadLeagueState } from './league_engine';
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
import { consumeSeasonGoldenLessonMultiplier, peekSeasonGoldenLessonCharges } from './season_reward_apply';
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
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountTransitionLockLease,
  type AccountGenerationToken,
} from './account_generation';
import { accountScopeKey } from './account_scope_key';
// stationary_clubs feature удалён — мультипликатор фиксирован 1.

/** Уровень клуба недели (очки группы): +0.1 к множителю за каждый шаг от базового. */
async function getClubWeekTierMultiplier(): Promise<number> {
  try {
    const state = await loadLeagueState();
    if (!state || state.weekId !== getWeekId()) return 1;
    const leagueId = Math.max(0, Math.min(11, Math.trunc(Number(state.leagueId) || 0)));
    return 1 + leagueId * 0.1;
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

/**
 * Типы источников опыта
 */
export type XPSource = 
  | 'lesson_complete' 
  | 'lesson_answer'
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
  | 'plan_task_complete';    // Завершение задачи персонального плана

interface XPResult {
  finalDelta: number;
  multiplier: number;
  isBonus: boolean;
}

export type RegisterXPOptions = {
  eventId?: string;
  payload?: Record<string, unknown>;
  skipLeagueChestMultiplier?: boolean;
  accountToken?: AccountGenerationToken;
  /** Internal capability propagated only by withAccountTransitionLock. */
  accountTransitionLockLease?: AccountTransitionLockLease;
  /** Internal capability propagated only by withXpAccountOperationQueue. */
  xpOperationLease?: XpOperationLease;
};

function isXpAccountGenerationCurrent(token: AccountGenerationToken): boolean {
  return isCurrentAccountGeneration(token);
}

function progressEventTypeForSource(source: XPSource): ProgressEventType | null {
  switch (source) {
    case 'lesson_complete':
    case 'lesson_answer':
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

/**
 * Фаза 1 бонусов карточки: постоянный XP-буст +2% (×1.02) для уровня карточки II+.
 * Значение зеркалит PROFILE_CARD_XP_BOOST, а ключ — PROFILE_CARD_LEVEL_KEY из
 * app/profile_card_system.ts — модуль НЕ импортируем сюда, чтобы не поймать цикл
 * импортов через shards_system/events (паттерн 'streak_count'/'comeback_active').
 */
async function readProfileCardXpMultiplier(): Promise<number> {
  const raw = await storageGetString('profile_card_level');
  return parseInt(raw || '0') >= 2 ? 1.02 : 1;
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

function isStorageFullError(error: unknown): boolean {
  const message = String((error as { message?: unknown })?.message ?? error).toLowerCase();
  return message.includes('sqlite_full')
    || message.includes('database or disk is full')
    || message.includes('disk full');
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
      // зачем: XP уже начислен локально, сервер тут только догоняет. 'progress_event_pending'
      // и 'progress_server_unavailable' — штатные состояния (нет сети / событие ещё в durable
      // очереди и уйдёт следующим флашем), а не сбой: они попадали в лог как WARNING и пугали
      // владельца красным Console Error на экране, хотя опыт не терялся. Настоящие сбои
      // отправки логируем как раньше.
      const diagnostic = String((serverError as { message?: string })?.message ?? serverError);
      const isExpectedRetry = diagnostic.includes('progress_event_pending')
        || diagnostic.includes('progress_server_unavailable');
      if (isExpectedRetry) {
        if (__DEV__) console.info('[xp_manager] progress event queued for retry:', diagnostic);
        return;
      }
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

// Same-account awards stay strictly serialized. The timeout only reports a
// stalled operation; it must never let a second stateful award overtake it.
const XP_LOCK_WAIT_TIMEOUT_MS = 10_000;
const XP_QUEUE_MAX_ACCOUNTS = 8;
const XP_MULTIPLIER_CACHE_MAX_ACCOUNTS = 8;

type XpQueueEntry = {
  token: AccountGenerationToken;
  tail: Promise<void>;
};

declare const XP_OPERATION_LEASE: unique symbol;
export type XpOperationLease = Readonly<{
  [XP_OPERATION_LEASE]: true;
}>;

type XpMultiplierSnapshot = {
  token: AccountGenerationToken;
  club: number;
  leagueGroup: number;
  refresh: Promise<void> | null;
};

const xpQueueByAccount = new Map<string, XpQueueEntry>();
const xpMultiplierByAccount = new Map<string, XpMultiplierSnapshot>();
let activeXpOperationLeases = new WeakMap<object, string>();

function pruneStaleXpRuntimeState(): void {
  for (const [key, entry] of xpQueueByAccount) {
    if (!isXpAccountGenerationCurrent(entry.token)) xpQueueByAccount.delete(key);
  }
  for (const [key, entry] of xpMultiplierByAccount) {
    if (!isXpAccountGenerationCurrent(entry.token)) xpMultiplierByAccount.delete(key);
  }
}

function enqueueXpOperation<T>(
  token: AccountGenerationToken,
  operation: (lease: XpOperationLease) => Promise<T>,
  staleValue: T,
  inheritedLease?: XpOperationLease,
): Promise<T> {
  const key = accountScopeKey(token);
  if (!key || !isXpAccountGenerationCurrent(token)) return Promise.resolve(staleValue);
  if (inheritedLease && activeXpOperationLeases.get(inheritedLease) === key) {
    return operation(inheritedLease);
  }
  pruneStaleXpRuntimeState();
  const previous = xpQueueByAccount.get(key)?.tail ?? Promise.resolve();
  const result = previous.then(async () => {
    let watchdog: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      DebugLogger.error(
        'xp_manager.ts:registerXP:watchdog',
        new Error('xp_operation_exceeded_10s'),
        'warning',
      );
    }, XP_LOCK_WAIT_TIMEOUT_MS);
    (watchdog as any)?.unref?.();
    const lease = Object.freeze({}) as XpOperationLease;
    activeXpOperationLeases.set(lease, key);
    try {
      return await operation(lease);
    } finally {
      activeXpOperationLeases.delete(lease);
      if (watchdog) clearTimeout(watchdog);
      watchdog = null;
    }
  });
  const tail = result.then(() => undefined, () => undefined).finally(() => {
    if (xpQueueByAccount.get(key)?.tail === tail) xpQueueByAccount.delete(key);
  });
  xpQueueByAccount.set(key, { token, tail });
  if (xpQueueByAccount.size > XP_QUEUE_MAX_ACCOUNTS) pruneStaleXpRuntimeState();
  return result;
}

export function withXpAccountOperationQueue<T>(
  token: AccountGenerationToken,
  operation: (lease: XpOperationLease) => Promise<T>,
  staleValue: T,
): Promise<T> {
  return enqueueXpOperation(token, operation, staleValue);
}

function getXpMultiplierSnapshot(token: AccountGenerationToken): XpMultiplierSnapshot {
  pruneStaleXpRuntimeState();
  const key = accountScopeKey(token);
  const existing = key ? xpMultiplierByAccount.get(key) : undefined;
  if (existing) return existing;
  const snapshot: XpMultiplierSnapshot = { token, club: 1, leagueGroup: 1, refresh: null };
  if (key) {
    xpMultiplierByAccount.set(key, snapshot);
    if (xpMultiplierByAccount.size > XP_MULTIPLIER_CACHE_MAX_ACCOUNTS) pruneStaleXpRuntimeState();
  }
  return snapshot;
}

function refreshXpMultiplierSnapshot(
  token: AccountGenerationToken,
  snapshot: XpMultiplierSnapshot,
): void {
  if (snapshot.refresh || !isXpAccountGenerationCurrent(token)) return;
  snapshot.refresh = Promise.allSettled([
    getCombinedClubMultiplier(),
    getLeagueGroupBoostMultiplier(),
  ]).then(([club, leagueGroup]) => {
    if (!isXpAccountGenerationCurrent(token)) return;
    if (club.status === 'fulfilled') snapshot.club = sanitizeLocalXpMultiplier(club.value);
    if (leagueGroup.status === 'fulfilled') {
      snapshot.leagueGroup = sanitizeLocalXpMultiplier(leagueGroup.value);
    }
  }).finally(() => {
    snapshot.refresh = null;
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
  const accountToken = options?.accountToken ?? captureAccountGeneration();
  const staleResult = (multiplier = 1): XPResult => ({ finalDelta: 0, multiplier, isBonus: false });
  const withXpAccountCommitLock = <T>(work: () => Promise<T>): Promise<T> => withAccountTransitionLock(
    work,
    options?.accountTransitionLockLease,
  );
  return enqueueXpOperation(accountToken, async () => {
  let resolvedName = userName;
  let appliedDelta = amount;
  let scoreWritten = false;
  let totalXpWritten = false;
  let weeklyXpWritten = false;
  try {
    if (!isXpAccountGenerationCurrent(accountToken)) return staleResult();
    if (!resolvedName) {
      const [canonicalUid, xpStored] = await Promise.all([
        getCanonicalUserId(),
        storageGetString('user_total_xp'),
      ]);
      if (!isXpAccountGenerationCurrent(accountToken)) return staleResult();
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

    // 1. Множители применяются к заработку (уроки, тренировки, сундуки, ежедневные задания)
    // К ставкам и выигрышам по ставкам множители не применяются.
    const isEarnedXP = ['lesson_complete', 'lesson_answer', 'bonus_chest', 'dialog_complete', 'vocabulary_learned', 'verb_learned', 'preposition_drill_answer', 'preposition_drill_perfect', 'review_answer', 'exam_complete', 'diagnostic_test', 'daily_login_bonus', 'daily_phrase_quest', 'daily_task_reward', 'plan_task_complete'].includes(source);

    if (isEarnedXP && amount > 0) {
      // А) Клуб: XP-буст + уровень клуба недели (один множитель в UI и при начислении)
      const multiplierSnapshot = getXpMultiplierSnapshot(accountToken);
      const clubM = multiplierSnapshot.club;
      const leagueGroupBoostM = multiplierSnapshot.leagueGroup;
      refreshXpMultiplierSnapshot(accountToken, multiplierSnapshot);

      // Б) Множитель за длину цепочки (x2, x3, x5)
      const streakRaw = await storageGetString('streak_count');
      if (!isXpAccountGenerationCurrent(accountToken)) return staleResult();
      const streakM = streakMultiplier(parseInt(streakRaw || '0'));

      // В) Comeback бонус (x2)
      const todayStr = new Date().toISOString().split('T')[0];
      const comebackRaw = await storageGetString('comeback_active');
      if (!isXpAccountGenerationCurrent(accountToken)) return staleResult();
      const comebackM = (comebackRaw === todayStr) ? 2 : 1;

      // Г) Множитель сложности урока (+5% за каждый урок, только для lesson_answer/lesson_complete)
      const lessonDiffM = (lessonNumber && (source === 'lesson_answer' || source === 'lesson_complete'))
        ? getLessonDifficultyMultiplier(lessonNumber)
        : 1;

      // Д) Подарок за уровень: timed multiplier или запас XP с ×2, без бесконечного стака.
      const giftState = await readGiftMultiplierForBaseXp(amount);
      if (!isXpAccountGenerationCurrent(accountToken)) return staleResult();
      const giftM = giftState.multiplier;
      // Е) Персональный буст лиги (x2/x3 на ограниченное время)
      const leagueBoostM = await getLeagueBoostMultiplier();
      if (!isXpAccountGenerationCurrent(accountToken)) return staleResult();
      // Горячие 2 часа: ×2 для зоны вылета в конце недели (локальный кэш лиги, без сети).
      const hotHoursM = await getLeagueHotHoursMultiplier();
      if (!isXpAccountGenerationCurrent(accountToken)) return staleResult();
      const leagueChestM = options?.skipLeagueChestMultiplier
        ? 1
        : await consumeLeagueChestXpOverrideMultiplier();
      if (!isXpAccountGenerationCurrent(accountToken)) return staleResult();

      // Ж) Weekly Boons: «Двойной четверг» (×2) + «Ранняя пташка» (×1.1 до 10:00).
      // Аддитивный вклад в ту же формулу, что и остальные множители.
      const boonXpContribution = boonXpMultiplierContribution();

      // З) Фаза 1: постоянный XP-буст карточки уровня II+ (×1.02) — как остальные
      // множители, только для заработанного XP (внутри if isEarnedXP).
      const cardM = await readProfileCardXpMultiplier();
      if (!isXpAccountGenerationCurrent(accountToken)) return staleResult();

      // И) Season Pass «Золотой урок» (владелец 2026-08-03): ×3 на ВЕСЬ следующий
      // урок — peek на каждом ответе урока, заряд списывается на lesson_complete
      // (иначе первый же ответ съел бы заряд, а «урок» = все ответы + завершение).
      const isLessonXp = source === 'lesson_answer' || source === 'lesson_complete';
      const goldenCharges = isLessonXp ? await peekSeasonGoldenLessonCharges() : 0;
      const goldenLessonM = goldenCharges > 0 ? 3 : 1;
      if (source === 'lesson_complete' && goldenCharges > 0) {
        // guard-ok: декремент ЗАРЯДА расходника (season_golden_lesson_v1.remaining),
        // не баланс/XP юзера — тот же класс, что remainingUses у xp_boost сундука.
        void consumeSeasonGoldenLessonMultiplier().catch(() => {});
      }

      totalMultiplier = sanitizeLocalXpMultiplier(
        1 + (clubM - 1) + (streakM - 1) + (comebackM - 1) + (lessonDiffM - 1) + (giftM - 1) + (leagueBoostM - 1) + (leagueGroupBoostM - 1) + (leagueChestM - 1) + boonXpContribution + (cardM - 1) + (hotHoursM - 1) + (goldenLessonM - 1),
      );
      finalDelta = sanitizeLocalXpAmount(Math.round(amount * totalMultiplier));
      appliedDelta = finalDelta;
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
        const giftBankCommitted = await withXpAccountCommitLock(async () => {
          if (!isXpAccountGenerationCurrent(accountToken)) return false;
          await consumeGiftXpBank(amount).catch(() => 0);
          return isXpAccountGenerationCurrent(accountToken);
        });
        if (!giftBankCommitted) return staleResult(totalMultiplier);
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
      const reservation = await withXpAccountCommitLock(async () => {
        if (!isXpAccountGenerationCurrent(accountToken)) return { stale: true, reserved: false };
        const reserved = finalDelta <= 0
          || await reserveLocalProgressEvent(progressEventRequest?.eventId);
        return { stale: !isXpAccountGenerationCurrent(accountToken), reserved };
      });
      if (reservation.stale) return staleResult(totalMultiplier);
      if (finalDelta > 0 && !reservation.reserved) {
        if (progressEventRequest) {
          if (!isXpAccountGenerationCurrent(accountToken)) return staleResult(totalMultiplier);
          submitProgressEventOptimistically(progressEventRequest, progressEventMigrationSnapshot, progressEventLogLabel);
        }
      return { finalDelta: 0, multiplier: totalMultiplier, isBonus: false };
    }

    // 3. Обновляем глобальный счетчик user_total_xp (XP никогда не уходит в минус)
    let currentTotal = 0;
    let newTotal = 0;
    let scoreAvatar: string | undefined;
    const localCommit = await withXpAccountCommitLock(async () => {
    if (!isXpAccountGenerationCurrent(accountToken)) return false;
    currentTotal = await storageGetNumber('user_total_xp', 0);
    if (!isXpAccountGenerationCurrent(accountToken)) return false;
    newTotal = Math.max(0, currentTotal + finalDelta);
    await storageSetString('user_total_xp', String(newTotal));
    if (!isXpAccountGenerationCurrent(accountToken)) return false;
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
      if (!isXpAccountGenerationCurrent(accountToken)) return false;
      if (!isSameLocalOrUtcDay(lastDate)) {
        const prevStreak = Number((await AsyncStorage.getItem('streak_count')) ?? '0') || 0;
        if (!isXpAccountGenerationCurrent(accountToken)) return false;
        const next = isYesterdayFlexible(lastDate) ? prevStreak + 1 : 1;
        await AsyncStorage.multiSet([
          ['streak_count', String(next)],
          ['last_active_date', todayKey],
          ['streak_last_date', todayKey],
        ]);
        if (!isXpAccountGenerationCurrent(accountToken)) return false;
      }
    }
    // XP-01: Track weekly XP in lockstep with total XP. addWeeklyXp internally
    // ignores delta <= 0 and self-heals stale week period. Synced to Firestore
    // via SYNC_KEYS in cloud_sync.ts → users/{canonicalUid}.progress.weekly_xp.
    if (finalDelta > 0) {
      await addWeeklyXp(finalDelta);
      if (!isXpAccountGenerationCurrent(accountToken)) return false;
      weeklyXpWritten = true;
      // зачем 2026-08-03 (владелец: «сезон очки капали не за опыт а за звёзды»):
      // здесь стоял `void addSeasonPassXp(finalDelta)` — дорожка сезона качалась
      // ЛЮБЫМ начислением опыта, включая уроки, повторения и бусты. Сезон из-за
      // этого был не про турниры вообще. Начисление перенесено в турнирный
      // экран (addSeasonPassStars), а опыт сезон больше не двигает.
    }
    return isXpAccountGenerationCurrent(accountToken);
    });
    if (!localCommit) return staleResult(totalMultiplier);
    if (finalDelta > 0) refreshWeeklyRecapNotificationAfterXpChange(lang);

    // 3.1. Уведомляем все подписчики о смене XP
    if (finalDelta > 0 && isXpAccountGenerationCurrent(accountToken)) {
      emitAppEvent('xp_changed');
    }
    if (progressEventRequest && isXpAccountGenerationCurrent(accountToken)) {
      submitProgressEventOptimistically(progressEventRequest, progressEventMigrationSnapshot, progressEventLogLabel);
    }

    // 3.2. Детектируем level-up прямо здесь — надёжнее чем в home.tsx через listener
    if (finalDelta > 0) {
      if (!isXpAccountGenerationCurrent(accountToken)) return staleResult(totalMultiplier);
      const prevLvl = getLevelFromXP(currentTotal);
      const newLvl  = getLevelFromXP(newTotal);
      if (newLvl > prevLvl) {
        // Spins are device-owned: award the local credit before optional cloud work.
        await (options?.accountTransitionLockLease
          ? enqueueLevelSpinLevelUps(prevLvl, newLvl, options.accountTransitionLockLease)
          : enqueueLevelSpinLevelUps(prevLvl, newLvl));
        if (!isXpAccountGenerationCurrent(accountToken)) return staleResult(totalMultiplier);
        // Обновляем аватар и рамку по финальному уровню
        const currentAvatar = await storageGetString('user_avatar');
        if (!isXpAccountGenerationCurrent(accountToken)) return staleResult(totalMultiplier);
        const newAv = isCustomAvatarValue(currentAvatar) ? currentAvatar! : getBestAvatarForLevel(newLvl);
        const newFr = getBestFrameForLevel(newLvl);
        scoreAvatar = newAv;
        const profileCommitted = await withXpAccountCommitLock(async () => {
          if (!isXpAccountGenerationCurrent(accountToken)) return false;
          await AsyncStorage.multiSet([
            ['user_avatar', newAv],
            ['user_frame', newFr.id],
            ['user_prev_xp', String(newTotal)],
          ]);
          return isXpAccountGenerationCurrent(accountToken);
        });
        if (!profileCommitted) return staleResult(totalMultiplier);
        emitAppEvent('energy_reload'); // перезагружаем энергию после level-up
        emitAppEvent('xp_changed');    // обновляем UI в home.tsx
        // Лента друзей: клиент (тестеры/registerXP) + CF после синка — один doc id level_up_{lvl}
        writeFriendEvent('level_up', { level: newLvl }).catch(() => {});
        // зачем: владелец на новом аккаунте получил лавину модалок и тостов. Причина —
        // самоподдерживающийся каскад: достижение → registerXP('achievement_reward') →
        // новый уровень → level_reached → новые достижения → снова XP → снова уровень.
        // Рекурсия по XP-достижениям была заглушена ниже (см. проверку source), но
        // level_reached вызывался БЕЗУСЛОВНО и оставался открытой дверью для нового витка.
        // Уровень, аватар, рамка и сундук начисляются как прежде — гасим только повторную
        // проверку достижений от XP, который сам был наградой за достижение/уровень.
        if (source !== 'achievement_reward' && source !== 'level_up_bonus') {
          checkAchievements({ type: 'level_reached', level: newLvl }, accountToken).catch(() => {});
        }
      } else {
        await withXpAccountCommitLock(async () => {
          if (!isXpAccountGenerationCurrent(accountToken)) return;
          await storageSetString('user_prev_xp', String(newTotal));
        });
        if (!isXpAccountGenerationCurrent(accountToken)) return staleResult(totalMultiplier);
        scoreAvatar = (await storageGetString('user_avatar')) ?? String(getBestAvatarForLevel(newLvl));
        if (!isXpAccountGenerationCurrent(accountToken)) return staleResult(totalMultiplier);
      }
    }

    if (!isXpAccountGenerationCurrent(accountToken)) return staleResult(totalMultiplier);
    scoreWritten = true;
    void enqueueSecondaryXpProjection(resolvedName, finalDelta, lang, scoreAvatar, accountToken).catch((scoreError) => {
      DebugLogger.error('xp_manager.ts:registerXP:secondaryProjection', scoreError, 'warning');
    });

    // 4. Ремонт цепочки: любая активность с XP восстанавливает цепочку
    if (isEarnedXP && finalDelta > 0) {
      if (!isXpAccountGenerationCurrent(accountToken)) return staleResult(totalMultiplier);
      recordActivityForRepair(accountToken).catch(() => {});
    }

    // 5. ТРИГГЕРЫ: Автоматизация прогресса

    // А) lesson_answer обновляется в экране-источнике,
    // чтобы избежать дублей и расхождения с фактическими условиями задач.

    // Б) Проверка достижений по общему количеству XP (achievements.ts)
    // Пропускаем если source === 'achievement_reward', чтобы не создавать рекурсию:
    // checkAchievements → registerXP('achievement_reward') → checkAchievements → ...
    if (finalDelta > 0 && source !== 'achievement_reward' && source !== 'level_up_bonus') {
      if (!isXpAccountGenerationCurrent(accountToken)) return staleResult(totalMultiplier);
      checkAchievements({ type: 'xp', totalXP: newTotal }, accountToken).catch(() => {});
      checkAchievements({ type: 'time_of_day' }, accountToken).catch(() => {});
    }
    if (finalDelta > 0 && source === 'wager_win') {
      if (!isXpAccountGenerationCurrent(accountToken)) return staleResult(totalMultiplier);
      checkAchievements({ type: 'wager_win' }, accountToken).catch(() => {});
    }

    // XP is local-first. Mark cloud sync as pending; the app-level
    // background/inactive flush decides when to send the phone's state.
    if (!isXpAccountGenerationCurrent(accountToken)) return staleResult(totalMultiplier);
    markCloudSyncPending();

    // Public profile is local-first: user sees XP immediately, server snapshot refreshes rarely.
    if (finalDelta > 0) {
      void (async () => {
        if (!isXpAccountGenerationCurrent(accountToken)) return;
        const streakVal = (await storageGetNumber('streak_count', 0)) || undefined;
        if (!isXpAccountGenerationCurrent(accountToken)) return;
        const frameId = await storageGetString('user_frame');
        if (!isXpAccountGenerationCurrent(accountToken)) return;
        const lsRaw = await storageGetString('league_state_v3');
        if (!isXpAccountGenerationCurrent(accountToken)) return;
        let leagueId: number | undefined;
        try { if (lsRaw) leagueId = JSON.parse(lsRaw).leagueId; } catch (e) { if (__DEV__) console.warn('[xp_manager]', e); }
        const avatar = await storageGetString('user_avatar');
        if (!isXpAccountGenerationCurrent(accountToken)) return;
        await syncPublicProfileSnapshot({
          reason: 'daily_xp',
          name: resolvedName,
          totalXp: newTotal,
          lang,
          avatar: String(avatar || getLevelFromXP(newTotal)),
          streak: streakVal,
          leagueId,
          frame: frameId ?? undefined,
        }, accountToken);
      })().catch(() => {});
    }

    return {
      finalDelta,
      multiplier: totalMultiplier,
      isBonus: totalMultiplier > 1
    };
  } catch (error) {
    if (!isXpAccountGenerationCurrent(accountToken)) return staleResult();
    // A full AsyncStorage database is an environmental persistence condition,
    // not an XP-engine fault. The fallback below keeps the in-process award
    // flow alive, while cloud restore remains the durable recovery path.
    DebugLogger.error(
      'xp_manager.ts:registerXP',
      error,
      isStorageFullError(error) ? 'warning' : 'critical',
    );
    const fallbackDelta = Number.isFinite(appliedDelta) ? appliedDelta : amount;
    const fallbackCommitted = await withXpAccountCommitLock(async () => {
    if (!isXpAccountGenerationCurrent(accountToken)) return false;
    // Fallback: the XP counter is the source of truth. Optional surfaces
    // (leaderboards, boosts, achievements, notifications) must not be able to
    // make a completed lesson look like it awarded nothing.
    if (!totalXpWritten && fallbackDelta !== 0) {
      try {
        const currentTotal = await storageGetNumber('user_total_xp', 0);
        if (!isXpAccountGenerationCurrent(accountToken)) return false;
        const fallbackTotal = Math.max(0, currentTotal + fallbackDelta);
        await storageSetString('user_total_xp', String(fallbackTotal));
        if (!isXpAccountGenerationCurrent(accountToken)) return false;
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
    return isXpAccountGenerationCurrent(accountToken);
    });
    if (!fallbackCommitted) return staleResult();
    if (fallbackDelta > 0 && isXpAccountGenerationCurrent(accountToken)) {
      emitAppEvent('xp_changed');
    }
    if (!scoreWritten && isXpAccountGenerationCurrent(accountToken)) {
      scoreWritten = true;
      void enqueueSecondaryXpProjection(resolvedName, fallbackDelta, lang, undefined, accountToken).catch((scoreError) => {
        if (__DEV__) console.warn('[xp_manager]', scoreError);
      });
    }
    return { finalDelta: fallbackDelta, multiplier: 1, isBonus: false };
  }
  }, staleResult(), options?.xpOperationLease);
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
  resetXpRuntimeState: () => {
    xpQueueByAccount.clear();
    xpMultiplierByAccount.clear();
    activeXpOperationLeases = new WeakMap<object, string>();
  },
  setXpMultiplierSnapshot: (club: number, leagueGroup: number) => {
    const token = captureAccountGeneration();
    const snapshot = getXpMultiplierSnapshot(token);
    snapshot.club = sanitizeLocalXpMultiplier(club);
    snapshot.leagueGroup = sanitizeLocalXpMultiplier(leagueGroup);
  },
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
    // Горячие 2 часа: тот же вклад, что registerXP добавляет при начислении.
    const hotHoursM = await getLeagueHotHoursMultiplier();
    // H13: ранее UI занижал множитель — не учитывал leagueChestM и boonXpContribution,
    // иначе UI прожжёт одноразовый league chest бонус.
    const leagueChestM = await peekLeagueChestXpOverrideMultiplier();
    const boonXpContribution = boonXpMultiplierContribution();
    // Фаза 1: буст карточки II+ — тот же вклад, что registerXP добавляет при начислении.
    const cardM = await readProfileCardXpMultiplier();

    return 1 + (clubM - 1) + (streakM - 1) + (comebackM - 1) + (giftM - 1) + (leagueBoostM - 1) + (leagueGroupBoostM - 1) + (leagueChestM - 1) + boonXpContribution + (cardM - 1) + (hotHoursM - 1);
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
  /** Фаза 1: постоянный XP-буст карточки II+ (×1.02), иначе нейтральная 1. */
  cardM: number;
  /** «Горячие 2 часа» лиги: ×2 для зоны вылета в конце недели, иначе 1. */
  hotHoursM: number;
  total: number;
}

// зачем: PlayerProfileModal раньше монтировался со skeleton и подменял его на
// реальные множители мгновение спустя (заметный "мигающий" reveal). Множители
// нигде не хранятся синхронно (все источники — AsyncStorage/Firestore чтения),
// поэтому держим последний резолвленный снимок в памяти модуля: первый вызов в
// сессии всё ещё асинхронный, но повторное открытие модалки (в течение той же
// сессии) отдаёт синхронный кэш и рендерится сразу в финальном состоянии, а
// свежее значение подтягивается в фоне и тихо обновляет тот же объект.
let lastResolvedMultiplierBreakdown: MultiplierBreakdown | null = null;

/** Синхронный доступ к последнему резолвленному брейкдауну (null = ещё не считали в этой сессии). */
export function peekLastMultiplierBreakdown(): MultiplierBreakdown | null {
  return lastResolvedMultiplierBreakdown;
}

// зачем: module-scope кэш выше НЕ был привязан ни к какому uid — он просто держал
// последний резолвленный брейкдаун процесса. При logout/смене аккаунта БЕЗ
// полного рестарта приложения (общий девайс, QA свитчит тестовые аккаунты)
// PlayerProfileModal синхронно читал peekLastMultiplierBreakdown() и мгновенно
// показывал множители ПРЕДЫДУЩЕГО аккаунта как текущие — до того, как фоновый
// getCurrentMultiplierBreakdown() успевал их молча перезаписать. Это утечка
// данных одного аккаунта в сессию другого. Вызывается из
// wipeLocalAccountDataUnsafe (cloud_sync.ts) и signOutCurrentProvider
// (auth_provider.ts) — единственных точек, через которые проходит любой logout/
// account-switch/account-delete flow.
export function resetMultiplierBreakdownCache(): void {
  lastResolvedMultiplierBreakdown = null;
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
    const hotHoursM = await getLeagueHotHoursMultiplier();
    const leagueChestM = await peekLeagueChestXpOverrideMultiplier();
    const boonXpContribution = boonXpMultiplierContribution();
    // Фаза 1: буст карточки II+ — тот же вклад, что registerXP добавляет при начислении.
    const cardM = await readProfileCardXpMultiplier();
    const total = 1 + (clubM - 1) + (streakM - 1) + (comebackM - 1) + (giftM - 1) + (leagueBoostM - 1) + (leagueGroupBoostM - 1) + (leagueChestM - 1) + boonXpContribution + (cardM - 1) + (hotHoursM - 1);
    const breakdown: MultiplierBreakdown = { clubM, streakM, comebackM, giftM, leagueBoostM, leagueGroupBoostM, leagueChestM, boonXpContribution, cardM, hotHoursM, total };
    lastResolvedMultiplierBreakdown = breakdown;
    return breakdown;
  } catch {
    return lastResolvedMultiplierBreakdown ?? { clubM: 1, streakM: 1, comebackM: 1, giftM: 1, leagueBoostM: 1, leagueGroupBoostM: 1, leagueChestM: 1, boonXpContribution: 0, cardM: 1, hotHoursM: 1, total: 1 };
  }
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
