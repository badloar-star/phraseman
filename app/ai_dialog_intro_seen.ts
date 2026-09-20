import AsyncStorage from '@react-native-async-storage/async-storage';
import { resolveDialogueStudyTarget } from './dialogue_language_registry';
import { DebugLogger } from './debug-logger';

const KEY_PREFIX = 'ai_dialog_intro_seen:v1';
const seenMemory = new Map<string, boolean>();

export function __resetAiDialogIntroSeenForTests(): void {
  seenMemory.clear();
}

export function aiDialogIntroSeenKey(target: unknown, scenarioId: string): string | null {
  const resolved = resolveDialogueStudyTarget(target);
  return resolved ? `${KEY_PREFIX}:${resolved}:${scenarioId}` : null;
}

export async function hasSeenAiDialogIntro(
  target: unknown,
  scenarioId: string,
): Promise<boolean> {
  const key = aiDialogIntroSeenKey(target, scenarioId);
  if (!key) return false;
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
  target: unknown,
  scenarioId: string,
): boolean | undefined {
  const key = aiDialogIntroSeenKey(target, scenarioId);
  return key ? seenMemory.get(key) : undefined;
}

export async function markAiDialogIntroSeen(
  target: unknown,
  scenarioId: string,
): Promise<void> {
  const key = aiDialogIntroSeenKey(target, scenarioId);
  if (!key) return;
  seenMemory.set(key, true);
  try {
    await AsyncStorage.setItem(key, '1');
  } catch (e) {
      // Best-effort local flag.
      DebugLogger.error('ai_dialog_intro_seen:key', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}
