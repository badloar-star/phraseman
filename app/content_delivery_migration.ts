import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  lessonCycleEndIntroShownKey,
  lessonIntroShownKey,
  lessonSessionKey,
  type RuntimeStudyTarget,
} from './target_storage_keys';

export const APP_CONTENT_SCHEMA_VERSION = '2026-05-21-content-refresh-v1';

const CONTENT_SCHEMA_STORAGE_KEY = 'app_content_schema_version';
const LESSON_IDS = Array.from({ length: 32 }, (_, index) => index + 1);
const STUDY_TARGETS: RuntimeStudyTarget[] = ['en', 'fr'];
const LESSON_SESSION_FIELDS = [
  'cellIndex',
  'phraseOrder',
  'errorReplayQueue',
  'errorReplaySince',
  'errorReplayOverride',
] as const;

function contentRefreshKeys(): string[] {
  const keys: string[] = [];
  for (const target of STUDY_TARGETS) {
    keys.push(lessonCycleEndIntroShownKey(target));
    for (const lessonId of LESSON_IDS) {
      keys.push(lessonIntroShownKey(lessonId, target));
      for (const field of LESSON_SESSION_FIELDS) {
        keys.push(lessonSessionKey(lessonId, field, target));
      }
    }
  }
  return [...new Set(keys)];
}

/**
 * Delivers rewritten lesson content safely to existing accounts.
 *
 * We only clear transient presentation/session keys that can pin a user to an
 * old lesson order or hide new intro/theory screens. Progress, XP, scores,
 * unlocked lessons, words, purchases, VIP, shards, streaks and achievements stay intact.
 */
export async function applyContentDeliveryMigration(): Promise<boolean> {
  const current = await AsyncStorage.getItem(CONTENT_SCHEMA_STORAGE_KEY).catch(() => null);
  if (current === APP_CONTENT_SCHEMA_VERSION) return false;

  await AsyncStorage.multiRemove(contentRefreshKeys());
  await AsyncStorage.setItem(CONTENT_SCHEMA_STORAGE_KEY, APP_CONTENT_SCHEMA_VERSION);
  return true;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
