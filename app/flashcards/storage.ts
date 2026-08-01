// AsyncStorage gateway for flashcards-only persistence keys and payloads.
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  customFlashcardsKey,
  flashcardsProgressKey,
  storageStudyTarget,
  type RuntimeStudyTarget,
} from '../target_storage_keys';
import type { StudyTarget } from '../study_target';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from '../account_generation';
import { accountScopeKey } from '../account_scope_key';

export type FlashcardsProgress = {
  cat: string;
  idx: number;
};

const customCardsInMemoryByScope = new Map<string, unknown[]>();
const CUSTOM_CARDS_CACHE_MAX_SCOPES = 8;

function setCustomCardsCache(key: string, cards: unknown[]): void {
  customCardsInMemoryByScope.delete(key);
  customCardsInMemoryByScope.set(key, cards);
  while (customCardsInMemoryByScope.size > CUSTOM_CARDS_CACHE_MAX_SCOPES) {
    const oldest = customCardsInMemoryByScope.keys().next().value as string | undefined;
    if (!oldest) break;
    customCardsInMemoryByScope.delete(oldest);
  }
}

function accountOperationKey(token: AccountGenerationToken): string | null {
  return accountScopeKey(token);
}

function isAccountOperationCurrent(token: AccountGenerationToken): boolean {
  return isCurrentAccountGeneration(token);
}

function scopedTargetKey(token: AccountGenerationToken, target: StudyTarget): string | null {
  const accountKey = accountOperationKey(token);
  return accountKey ? `${accountKey}|target:${target}` : null;
}

function cloneList(cards: unknown[]): unknown[] {
  return cards.map((card) => (
    card && typeof card === 'object'
      ? { ...(card as Record<string, unknown>) }
      : card
  ));
}

function cacheTarget(studyTarget?: RuntimeStudyTarget): StudyTarget {
  return storageStudyTarget(studyTarget);
}

export function peekCustomCardsCache(studyTarget?: RuntimeStudyTarget): unknown[] | null {
  const target = cacheTarget(studyTarget);
  const scopeKey = scopedTargetKey(captureAccountGeneration(), target);
  if (!scopeKey) return null;
  const cached = customCardsInMemoryByScope.get(scopeKey);
  return cached === undefined ? null : cloneList(cached);
}

export async function readCustomCards(studyTarget?: RuntimeStudyTarget): Promise<unknown[]> {
  const accountToken = captureAccountGeneration();
  const target = cacheTarget(studyTarget);
  const scopeKey = scopedTargetKey(accountToken, target);
  if (!scopeKey || !isAccountOperationCurrent(accountToken)) return [];
  const raw = await AsyncStorage.getItem(customFlashcardsKey(target));
  if (!isAccountOperationCurrent(accountToken)) return [];
  if (!raw) {
    setCustomCardsCache(scopeKey, []);
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    setCustomCardsCache(scopeKey, Array.isArray(parsed) ? parsed : []);
    return cloneList(customCardsInMemoryByScope.get(scopeKey) ?? []);
  } catch {
    setCustomCardsCache(scopeKey, []);
    return [];
  }
}

export async function writeCustomCards(
  cards: unknown[],
  studyTarget?: RuntimeStudyTarget,
): Promise<void> {
  const accountToken = captureAccountGeneration();
  const target = cacheTarget(studyTarget);
  if (!isAccountOperationCurrent(accountToken)) return;
  const committed = await withAccountTransitionLock(async () => {
    if (!isAccountOperationCurrent(accountToken)) return false;
    await AsyncStorage.setItem(customFlashcardsKey(target), JSON.stringify(cards));
    return isAccountOperationCurrent(accountToken);
  });
  if (!committed) return;
  const scopeKey = scopedTargetKey(accountToken, target);
  if (!scopeKey) return;
  setCustomCardsCache(scopeKey, cloneList(cards));
}

export async function readFlashcardsProgress(
  studyTarget?: RuntimeStudyTarget,
): Promise<FlashcardsProgress | null> {
  const accountToken = captureAccountGeneration();
  if (!isAccountOperationCurrent(accountToken)) return null;
  const raw = await AsyncStorage.getItem(flashcardsProgressKey(studyTarget));
  if (!isAccountOperationCurrent(accountToken)) return null;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as FlashcardsProgress;
    if (!parsed || typeof parsed.cat !== 'string' || typeof parsed.idx !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeFlashcardsProgress(
  progress: FlashcardsProgress,
  studyTarget?: RuntimeStudyTarget,
): Promise<void> {
  const accountToken = captureAccountGeneration();
  if (!isAccountOperationCurrent(accountToken)) return;
  await withAccountTransitionLock(async () => {
    if (!isAccountOperationCurrent(accountToken)) return;
    await AsyncStorage.setItem(flashcardsProgressKey(studyTarget), JSON.stringify(progress));
  });
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
