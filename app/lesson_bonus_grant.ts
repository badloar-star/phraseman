// ════════════════════════════════════════════════════════════════════════════
// lesson_bonus_grant.ts — отметка первого прохождения урока + retry.
// Повтор идемпотентен через lessonBonusGrantedKey.
// зачем: D70 — жемчуг за первое прохождение (и так 0) удалён; сама отметка
// нужна экрану завершения (мягкий апселл по статусу 'granted').
// ════════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Lang } from '../constants/i18n';
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
import { noteSwallowedHandler } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

const PENDING_KEY = 'lesson_bonus_pending_v1';
const PENDING_MAX_ENTRIES = 32;

function accountOperationKey(token: AccountGenerationToken): string | null {
  return accountScopeKey(token);
}

function isAccountOperationCurrent(token: AccountGenerationToken): boolean {
  return isCurrentAccountGeneration(token);
}

export type LessonBonusGrantParams = {
  lessonId: number;
  studyTarget?: RuntimeStudyTarget;
  lang: Lang;
  /** true на retry-пути: выдача без отдельного toast. */
  silent?: boolean;
};

export type LessonBonusGrantOutcome =
  | { status: 'already_granted' }
  | { status: 'granted' }
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
// одного урока — сериализуем, чтобы не задвоить локальную выдачу.
const inFlight = new Map<string, Promise<LessonBonusGrantOutcome>>();
const IN_FLIGHT_MAX_ENTRIES = 32;

/**
 * Отмечает первое прохождение урока.
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
  const { lessonId, studyTarget, lang, silent } = params;
  const guardKey = lessonBonusGrantedKey(lessonId, studyTarget);
  try {
    const already = await AsyncStorage.getItem(guardKey);
    if (!isAccountOperationCurrent(accountToken)) return { status: 'failed' };
    if (already) {
      if (isAccountOperationCurrent(accountToken)) {
        await clearPending(lessonId, studyTarget, accountToken).catch(noteSwallowedHandler('lesson_bonus_grant:promise_1'));
      }
      return { status: 'already_granted' };
    }

    if (!isAccountOperationCurrent(accountToken)) return { status: 'failed' };

    // зачем: D70 — раньше отметку писала выдача жемчуга за первый урок (0 штук);
    // теперь пишем её сами под тем же замком смены аккаунта.
    let marked = false;
    await withAccountTransitionLock(async () => {
      if (!isAccountOperationCurrent(accountToken)) return;
      await AsyncStorage.setItem(guardKey, '1');
      marked = true;
    });
    if (!marked || !isAccountOperationCurrent(accountToken)) {
      DebugLogger.warn('LESSON-BONUS', `mark skipped: account changed lesson=${lessonId} silent=${!!silent}`);
      return { status: 'failed' };
    }
    await clearPending(lessonId, studyTarget, accountToken).catch(noteSwallowedHandler('lesson_bonus_grant:promise_2'));
    return { status: 'granted' };
  } catch (e) {
    logAppWarning('lesson_bonus:grant_failed', e, {
      tags: { lessonId, studyTarget: String(studyTarget ?? 'legacy'), silent: !!silent },
    });
    if (isAccountOperationCurrent(accountToken)) {
      await markPending({ lessonId, studyTarget, lang, at: Date.now() }, accountToken).catch(noteSwallowedHandler('lesson_bonus_grant:promise_3'));
    }
    return { status: 'failed' };
  }
}

/**
 * Повторяет отложенные выдачи (после сбоя хранилища). Вызывается при
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
