import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';
import { DebugLogger } from './debug-logger';

const KEY_PREFIX = 'ai_dialog_intro_seen:v1';
const seenMemory = new Map<string, boolean>();

export function __resetAiDialogIntroSeenForTests(): void {
  seenMemory.clear();
}

export const aiDialogIntroSeenKey = (target: RuntimeStudyTarget | undefined, scenarioId: string): string =>
  `${KEY_PREFIX}:${storageStudyTarget(target)}:${scenarioId}`;

export async function hasSeenAiDialogIntro(
  target: RuntimeStudyTarget | undefined,
  scenarioId: string,
): Promise<boolean> {
  const key = aiDialogIntroSeenKey(target, scenarioId);
  const cached = seenMemory.get(key);
  if (cached !== undefined) return cached;
  try {
    const seen = (await AsyncStorage.getItem(key)) === '1';
    seenMemory.set(key, seen);
    return seen;
  } catch {
    seenMemory.set(key, false);
    return false;
  }
}

/** Synchronous tap-path read after the catalog primes scenario flags. */
export function peekAiDialogIntroSeen(
  target: RuntimeStudyTarget | undefined,
  scenarioId: string,
): boolean | undefined {
  return seenMemory.get(aiDialogIntroSeenKey(target, scenarioId));
}

export async function markAiDialogIntroSeen(
  target: RuntimeStudyTarget | undefined,
  scenarioId: string,
): Promise<void> {
  const key = aiDialogIntroSeenKey(target, scenarioId);
  seenMemory.set(key, true);
  try {
    await AsyncStorage.setItem(key, '1');
  } catch (e) {
      // Best-effort local flag.
      DebugLogger.error('ai_dialog_intro_seen:key', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}
