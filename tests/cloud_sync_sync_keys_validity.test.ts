import { FRENCH_TARGET_SYNC_KEYS, getRuntimeSyncKeys, SYNC_KEYS } from '../app/cloud_sync';
import {
  legacyFreeLessonCapKey,
  legacyFreeLessonMigrationKey,
} from '../app/target_storage_keys';

const FRENCH_TARGET_KEY_RE = /^(?:[a-z_]+_v2::fr(?:$|::)|personal_practice_v2::fr::(?:ru|uk)(?:$|::))/;
const FORBIDDEN_FRENCH_TARGET_LOCALE_SEGMENTS = [
  'en',
  'es',
  'pt-BR',
  'vi',
  'id',
  'tr',
  'pl',
];
const LEGACY_FLAT_FRENCH_KEYS = [
  'study_target_v1',
  'dev_study_target_lang',
  'unlocked_lessons',
  'premium_course_level',
  'lesson_unlock_repair_v3',
  'last_opened_lesson',
  'achievements_v1',
  'user_stats_v1',
  'stats_daily_breakdown_v1',
  'flashcards',
  'flashcards_v1',
  'custom_flashcards_v2',
];

function badKeys(keys: readonly unknown[]) {
  return keys
    .map((key, index) => ({ index, key, type: typeof key }))
    .filter(({ key }) => typeof key !== 'string' || key.length === 0);
}

describe('cloud sync storage key lists', () => {
  test('SYNC_KEYS contains only non-empty string keys', () => {
    expect(badKeys(SYNC_KEYS)).toEqual([]);
  });

  test('FRENCH_TARGET_SYNC_KEYS contains only non-empty string keys', () => {
    expect(badKeys(FRENCH_TARGET_SYNC_KEYS)).toEqual([]);
  });

  test('syncs the immutable legacy lesson cap and marker per study target', () => {
    expect(SYNC_KEYS).toEqual(expect.arrayContaining([
      legacyFreeLessonCapKey('en'),
      legacyFreeLessonMigrationKey('en'),
    ]));
    expect(FRENCH_TARGET_SYNC_KEYS).toEqual(expect.arrayContaining([
      legacyFreeLessonCapKey('fr'),
      legacyFreeLessonMigrationKey('fr'),
    ]));
  });

  test('FRENCH_TARGET_SYNC_KEYS is strictly French target scoped', () => {
    const keys = [...FRENCH_TARGET_SYNC_KEYS];
    expect(keys.length).toBeGreaterThan(40);
    expect(keys.filter((key) => !FRENCH_TARGET_KEY_RE.test(key))).toEqual([]);
    expect(keys.filter((key) => FORBIDDEN_FRENCH_TARGET_LOCALE_SEGMENTS.some((locale) => (
      new RegExp(`(^|::)${locale.replace('-', '\\-')}(::|$)`).test(key)
    )))).toEqual([]);
    expect(keys.filter((key) => LEGACY_FLAT_FRENCH_KEYS.includes(key))).toEqual([]);
  });

  test('study target selection keys are local-only and never cloud synced', () => {
    const runtimeKeys = getRuntimeSyncKeys();
    expect(runtimeKeys).not.toContain('study_target_v1');
    expect(runtimeKeys).not.toContain('dev_study_target_lang');
  });

  test('syncs the queued wager-use count alongside the legacy presence key', () => {
    expect(SYNC_KEYS).toEqual(expect.arrayContaining([
      'wager_discount',
      'wager_discount_uses_v1',
    ]));
  });

  test('French target sync keys do not duplicate English legacy sync keys', () => {
    const legacyEnglishKeys = new Set(SYNC_KEYS.filter((key) => !String(key).includes('_v2::fr')));
    expect(FRENCH_TARGET_SYNC_KEYS.filter((key) => legacyEnglishKeys.has(key))).toEqual([]);
  });

  test('getRuntimeSyncKeys filters invalid runtime entries before AsyncStorage.multiGet', () => {
    expect(getRuntimeSyncKeys(['user_total_xp', undefined, '', null, 'streak_count'])).toEqual([
      'user_total_xp',
      'streak_count',
    ]);
  });
});
