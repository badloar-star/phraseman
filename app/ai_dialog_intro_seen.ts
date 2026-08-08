import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';

const KEY_PREFIX = 'ai_dialog_intro_seen:v1';

export const aiDialogIntroSeenKey = (target: RuntimeStudyTarget | undefined, scenarioId: string): string =>
  `${KEY_PREFIX}:${storageStudyTarget(target)}:${scenarioId}`;

export async function hasSeenAiDialogIntro(
  target: RuntimeStudyTarget | undefined,
  scenarioId: string,
): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(aiDialogIntroSeenKey(target, scenarioId))) === '1';
  } catch {
    return false;
  }
}

export async function markAiDialogIntroSeen(
  target: RuntimeStudyTarget | undefined,
  scenarioId: string,
): Promise<void> {
  try {
    await AsyncStorage.setItem(aiDialogIntroSeenKey(target, scenarioId), '1');
  } catch {
    // Best-effort local flag.
  }
}
