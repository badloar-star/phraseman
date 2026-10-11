import {
  FRENCH_TARGET_SYNC_KEYS,
  SYNC_STUDY_TARGETS,
  __cloudSyncTestHooks,
  accountLocalDataKeysForToday,
  getRuntimeSyncKeys,
  isAccountLocalJournalStorageKey,
  SYNC_KEYS,
} from '../app/cloud_sync';
import { LEARNING_LANGUAGE_TARGETS } from '../app/learning_language_contour';
import { RETIRED_2_0_ECONOMY_ACCOUNT_LOCAL_KEYS } from '../app/retired_account_local_keys';
import { SOURCE_LOCALES } from '../app/source_locales';
import { languageProfileKey } from '../app/study_languages';
import {
  communityPackCreateDraftKey,
  customFlashcardsKey,
  flashcardsCommunityOwnedPackTitlesKey,
  flashcardsLocalAuthorPacksKey,
  flashcardsOwnedPacksKey,
  flashcardsSavedKey,
  legacyFreeLessonCapKey,
  legacyFreeLessonMigrationKey,
  mistakePracticeEventsKey,
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
  test('derives sync, restore and account cleanup coverage from every canonical learning target', () => {
    expect(SYNC_STUDY_TARGETS).toEqual(LEARNING_LANGUAGE_TARGETS);
    const wipeKeys = accountLocalDataKeysForToday('2026-10-03');

    for (const target of LEARNING_LANGUAGE_TARGETS) {
      expect(SYNC_KEYS).toContain(languageProfileKey(target));
      expect(SYNC_KEYS).toEqual(expect.arrayContaining([
        flashcardsSavedKey(target),
        customFlashcardsKey(target),
      ]));
      expect(wipeKeys).toEqual(expect.arrayContaining([
        languageProfileKey(target),
        flashcardsSavedKey(target),
        customFlashcardsKey(target),
        flashcardsCommunityOwnedPackTitlesKey(target),
        flashcardsLocalAuthorPacksKey(target),
      ]));
      for (const sourceLocale of SOURCE_LOCALES) {
        expect(wipeKeys).toContain(communityPackCreateDraftKey(target, sourceLocale));
      }
      expect(isAccountLocalJournalStorageKey(
        mistakePracticeEventsKey('account-a', target),
      )).toBe(true);
    }

    expect(JSON.parse(__cloudSyncTestHooks.mergeLessonRestoreValue(
      flashcardsOwnedPacksKey('it'),
      JSON.stringify(['cloud-pack']),
      JSON.stringify(['local-pack']),
    ))).toEqual(['cloud-pack', 'local-pack']);
  });

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

  test('retired wager discount keys are no longer synced and are wiped as retired 2.0 economy', () => {
    // зачем (10.10): скидка-ставка снята экономикой 2.0 — ключи переехали в RETIRED_2_0_ECONOMY_ACCOUNT_LOCAL_KEYS
    // (стираются при смене аккаунта) и больше не синхронизируются.
    expect(SYNC_KEYS).not.toContain('wager_discount');
    expect(SYNC_KEYS).not.toContain('wager_discount_uses_v1');
    expect(RETIRED_2_0_ECONOMY_ACCOUNT_LOCAL_KEYS).toEqual(expect.arrayContaining([
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
