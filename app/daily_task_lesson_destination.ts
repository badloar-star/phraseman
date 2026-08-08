import AsyncStorage from '@react-native-async-storage/async-storage';

import { resolveLessonRuntimeGate } from './lesson_premium_gate';
import { lastOpenedLessonKey, type RuntimeStudyTarget } from './target_storage_keys';

const FIRST_LESSON_ID = 1;
const LAST_LESSON_ID = 32;

/** Uses the remembered lesson only while it is currently playable for this account. */
export async function resolveDailyTaskLessonId(
  studyTarget?: RuntimeStudyTarget,
): Promise<number> {
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(lastOpenedLessonKey(studyTarget));
  } catch {
    return FIRST_LESSON_ID;
  }

  const parsed = Number.parseInt(raw ?? '', 10);
  const preferred = Number.isInteger(parsed) && parsed >= FIRST_LESSON_ID && parsed <= LAST_LESSON_ID
    ? parsed
    : FIRST_LESSON_ID;
  if (preferred === FIRST_LESSON_ID) return FIRST_LESSON_ID;

  try {
    return await resolveLessonRuntimeGate(preferred, studyTarget) === 'available'
      ? preferred
      : FIRST_LESSON_ID;
  } catch {
    return FIRST_LESSON_ID;
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
