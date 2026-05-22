import AsyncStorage from '@react-native-async-storage/async-storage';
import { levelExamKey, type RuntimeStudyTarget } from './target_storage_keys';

export function normalizeLevelExamAttemptCount(raw: unknown): number {
  const parsed = parseInt(String(raw ?? '0'), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export async function recordLevelExamAttempt(
  level: string,
  studyTarget?: RuntimeStudyTarget,
): Promise<number> {
  try {
    const key = levelExamKey(level, 'attempt_count', studyTarget);
    const previous = normalizeLevelExamAttemptCount(await AsyncStorage.getItem(key));
    const next = previous + 1;
    await AsyncStorage.setItem(key, String(next));
    return next;
  } catch {
    return 1;
  }
}

export default function __LevelExamAttemptsRouteShim() {
  return null;
}
