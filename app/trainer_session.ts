// Единый runtime-boundary Plus-доступа к сессиям раздела «Практика».
import { getVerifiedPremiumStatus } from './premium_guard';
import { trainerSessionContentAvailableForTarget } from './trainer_target_gate';
import type { RuntimeStudyTarget } from './target_storage_keys';

// Legacy exports stay stable for storage migrations and external callers. The
// free-session mechanism itself is retired: Practice is now a full Plus section.
export const DAILY_FREE_SESSION_KEY = 'trainer_free_session_v1';
export const TRAINER_SESSION_ENTRY_KEY = 'trainer_session_entry_v1';

export type TrainerSessionRoute =
  | '/trainer_words_session'
  | '/trainer_phrases_session';

export function hasReservedTrainerSessionEntrySync(
  _route: TrainerSessionRoute,
  _studyTarget?: RuntimeStudyTarget,
): boolean {
  return false;
}

export async function hasUsedFreeSessionToday(_studyTarget?: RuntimeStudyTarget): Promise<boolean> {
  return true;
}

export async function markFreeSessionUsed(_studyTarget?: RuntimeStudyTarget): Promise<void> {
  // Intentionally empty. Historical free-session counters no longer affect access.
}

export async function getFreeSessionsLeftToday(_studyTarget?: RuntimeStudyTarget): Promise<number> {
  return 0;
}

export async function reserveTrainerSessionEntry(
  _route: TrainerSessionRoute,
  hasPremium: boolean,
  studyTarget?: RuntimeStudyTarget,
): Promise<boolean> {
  if (!trainerSessionContentAvailableForTarget(studyTarget)) return false;
  return hasPremium;
}

export async function consumeTrainerSessionEntry(
  _route: TrainerSessionRoute,
  studyTarget?: RuntimeStudyTarget,
): Promise<boolean> {
  if (!trainerSessionContentAvailableForTarget(studyTarget)) return false;
  try {
    return await getVerifiedPremiumStatus();
  } catch {
    return false;
  }
}

/**
 * Гейт дневного лимита тренера (таблица §4 мастер-плана Cards 2.0):
 * free — 1 бесплатная сессия/день на весь тренер, премиум — безлимит.
 * Чистая функция — юнит-тестируется без RN.
 */
export function isTrainerSessionLocked(isPremium: boolean, usedFreeToday: boolean): boolean {
  return !isPremium && usedFreeToday;
}

export default function __RouteShim() { return null; }
