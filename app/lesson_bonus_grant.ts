// ════════════════════════════════════════════════════════════════════════════
// lesson_bonus_grant.ts — выдача бонуса первого прохождения урока + retry.
//
// Раньше вся выдача жила в lesson_complete.tsx под одним пустым catch: любая
// ошибка (сеть, суточный лимит XP, исключение) молча съедала бонусный XP и
// осколки — без повтора и следа в телеметрии. Теперь неудачная выдача
// помечается pending и повторяется при следующем заходе на экран завершения
// любого урока. Повтор идемпотентен:
//   • registerXP несёт стабильный eventId — серверный леджер отсекает дубль;
//   • lessonBonusGrantedKey ставится ТОЛЬКО после подтверждённой выдачи XP.
// ════════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Lang } from '../constants/i18n';
import { calculateRewardWithBonus } from './variable_reward_system';
import { registerXP } from './xp_manager';
import { grantLocalLessonCompletionSpin } from './local_level_spins';
import { addShards } from './shards_system';
import { lessonBonusGrantedKey, type RuntimeStudyTarget } from './target_storage_keys';
import { logAppWarning } from './app_health';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from './account_generation';
import { accountScopeKey } from './account_scope_key';
import { DebugLogger } from './debug-logger';

const PENDING_KEY = 'lesson_bonus_pending_v1';
const PENDING_MAX_ENTRIES = 32;
const BONUS_BASE_XP = 500;

function accountOperationKey(token: AccountGenerationToken): string | null {
  return accountScopeKey(token);
}

function isAccountOperationCurrent(token: AccountGenerationToken): boolean {
  return isCurrentAccountGeneration(token);
}

const safeEventPart = (value: unknown, max = 60): string =>
  String(value ?? 'na').trim().replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, max) || 'na';

export type LessonBonusGrantParams = {
  lessonId: number;
  studyTarget?: RuntimeStudyTarget;
  lang: Lang;
  userName?: string;
  /** true на retry-пути: без карточки бонуса, XP-событие без анимации сундука. */
  silent?: boolean;
};

export type LessonBonusGrantOutcome =
  | { status: 'already_granted' }
  | {
      status: 'granted';
      hasBonusWon: boolean;
      bonusXP: number;
      baseXp: number;
      finalDelta: number;
      multiplier: number;
      shardsGranted: boolean;
    }
  | { status: 'failed' };

type PendingEntry = {
  lessonId: number;
  studyTarget?: RuntimeStudyTarget;
  lang: Lang;
  at: number;
};

async function readPending(): Promise<PendingEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((e) => e && typeof e.lessonId === 'number') : [];
  } catch {
    return [];
  }
}

async function writePending(
  entries: PendingEntry[],
  accountToken?: AccountGenerationToken,
): Promise<void> {
  try {
    const write = async () => {
      if (entries.length === 0) {
        await AsyncStorage.removeItem(PENDING_KEY);
      } else {
        await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(entries.slice(-PENDING_MAX_ENTRIES)));
      }
    };
    if (!accountToken) {
      await write();
      return;
    }
    await withAccountTransitionLock(async () => {
      if (!isAccountOperationCurrent(accountToken)) return;
      await write();
    });
  } catch (e) {
      // best effort — потеря маркера не хуже прежнего поведения
      DebugLogger.error('lesson_bonus_grant:write', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

async function markPending(entry: PendingEntry, accountToken: AccountGenerationToken): Promise<void> {
  const entries = await readPending();
  if (!isAccountOperationCurrent(accountToken)) return;
  const withoutDup = entries.filter(
    (e) => !(e.lessonId === entry.lessonId && e.studyTarget === entry.studyTarget),
  );
  await writePending([...withoutDup, entry], accountToken);
}

async function clearPending(
  lessonId: number,
  studyTarget: RuntimeStudyTarget | undefined,
  accountToken: AccountGenerationToken,
): Promise<void> {
  const entries = await readPending();
  if (!isAccountOperationCurrent(accountToken)) return;
  const rest = entries.filter((e) => !(e.lessonId === lessonId && e.studyTarget === studyTarget));
  if (rest.length !== entries.length) await writePending(rest, accountToken);
}

// Живой путь (экран завершения) и retry могут стартовать одновременно для
// одного урока — сериализуем, чтобы XP не задвоился локально до леджера.
const inFlight = new Map<string, Promise<LessonBonusGrantOutcome>>();
const IN_FLIGHT_MAX_ENTRIES = 32;

/**
 * Выдаёт бонус первого прохождения урока (сундук XP + осколки lesson_first).
 * Никогда не бросает. При неудаче помечает выдачу pending для повтора.
 */
export function grantLessonFirstCompleteBonus(
  params: LessonBonusGrantParams,
): Promise<LessonBonusGrantOutcome> {
  return grantLessonFirstCompleteBonusForAccount(params, captureAccountGeneration());
}

function grantLessonFirstCompleteBonusForAccount(
  params: LessonBonusGrantParams,
  accountToken: AccountGenerationToken,
): Promise<LessonBonusGrantOutcome> {
  const accountKey = accountOperationKey(accountToken);
  if (!accountKey || !isAccountOperationCurrent(accountToken)) {
    return Promise.resolve({ status: 'failed' });
  }
  const flightKey = `${accountKey}|${params.lessonId}|${String(params.studyTarget ?? '')}`;
  const existing = inFlight.get(flightKey);
  if (existing) return existing;
  if (inFlight.size >= IN_FLIGHT_MAX_ENTRIES) {
    return Promise.resolve({ status: 'failed' });
  }
  const run = doGrantLessonFirstCompleteBonus(params, accountToken).finally(() => {
    inFlight.delete(flightKey);
  });
  inFlight.set(flightKey, run);
  return run;
}

async function doGrantLessonFirstCompleteBonus(
  params: LessonBonusGrantParams,
  accountToken: AccountGenerationToken,
): Promise<LessonBonusGrantOutcome> {
  const { lessonId, studyTarget, lang, userName, silent } = params;
  const guardKey = lessonBonusGrantedKey(lessonId, studyTarget);
  try {
    const already = await AsyncStorage.getItem(guardKey);
    if (!isAccountOperationCurrent(accountToken)) return { status: 'failed' };
    if (already) {
      if (isAccountOperationCurrent(accountToken)) {
        await clearPending(lessonId, studyTarget, accountToken).catch(() => {});
      }
      return { status: 'already_granted' };
    }

    const name = userName ?? ((await AsyncStorage.getItem('user_name')) || '');
    if (!isAccountOperationCurrent(accountToken)) return { status: 'failed' };
    const reward = calculateRewardWithBonus(BONUS_BASE_XP);
    const xpResult = await registerXP(reward.totalXP, 'bonus_chest', name, lang, lessonId, {
      // eventId стабилен между попытками — леджер progress_events отсекает дубль.
      eventId: [
        'bonus_chest',
        'lesson',
        safeEventPart(studyTarget),
        String(lessonId),
        'first_complete',
      ].join(':'),
      payload: {
        surface: silent ? 'lesson_bonus_retry' : 'lesson_complete',
        studyTarget,
        lessonId,
        baseBonus: BONUS_BASE_XP,
        totalReward: reward.totalXP,
        hasBonusWon: reward.hasBonusWon,
        bonusXP: reward.bonusXP,
      },
      accountToken,
    });
    if (!isAccountOperationCurrent(accountToken)) return { status: 'failed' };
    const finalDelta = Math.max(0, Math.round(xpResult.finalDelta || 0));
    if (finalDelta <= 0) {
      throw new Error('lesson_bonus_xp_not_confirmed');
    }
    await grantLocalLessonCompletionSpin(lessonId, studyTarget, accountToken);
    if (!isAccountOperationCurrent(accountToken)) return { status: 'failed' };

    // Осколки за первое прохождение: на живом пути earn-событие подавляется
    // (экран агрегирует batch-тост сам), на retry — стандартное событие.
    const nFirst = await addShards(
      'lesson_first',
      {
        eventId: `lesson:${studyTarget}:${lessonId}:first-complete`,
        localWrites: [[guardKey, '1']],
        suppressEarnEvent: !silent,
      },
    );
    if (!isAccountOperationCurrent(accountToken)) return { status: 'failed' };

    if (!isAccountOperationCurrent(accountToken)) return { status: 'failed' };
    await clearPending(lessonId, studyTarget, accountToken).catch(() => {});
    return {
      status: 'granted',
      hasBonusWon: reward.hasBonusWon,
      bonusXP: reward.bonusXP,
      baseXp: reward.totalXP,
      finalDelta,
      multiplier: xpResult.multiplier,
      shardsGranted: nFirst > 0,
    };
  } catch (e) {
    logAppWarning('lesson_bonus:grant_failed', e, {
      tags: { lessonId, studyTarget: String(studyTarget ?? 'legacy'), silent: !!silent },
    });
    if (isAccountOperationCurrent(accountToken)) {
      await markPending({ lessonId, studyTarget, lang, at: Date.now() }, accountToken).catch(() => {});
    }
    return { status: 'failed' };
  }
}

/**
 * Повторяет отложенные выдачи (после сбоя сети/лимита). Вызывается при
 * следующем заходе на экран завершения урока. Никогда не бросает.
 */
export async function retryPendingLessonBonusGrants(): Promise<number> {
  const accountToken = captureAccountGeneration();
  if (!isAccountOperationCurrent(accountToken)) return 0;
  const entries = await readPending();
  if (!isAccountOperationCurrent(accountToken)) return 0;
  if (entries.length === 0) return 0;
  let granted = 0;
  for (const entry of entries) {
    const outcome = await grantLessonFirstCompleteBonusForAccount({
      lessonId: entry.lessonId,
      studyTarget: entry.studyTarget,
      lang: entry.lang,
      silent: true,
    }, accountToken);
    if (!isAccountOperationCurrent(accountToken)) return granted;
    if (outcome.status === 'granted' || outcome.status === 'already_granted') granted++;
  }
  return granted;
}

// Required by Expo Router — not a screen
export default {};
