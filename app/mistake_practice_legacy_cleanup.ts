import AsyncStorage from '@react-native-async-storage/async-storage';

const CLEANUP_MARKER = 'mistake_practice_legacy_cleanup_v1';
const key = (...parts: readonly string[]): string => parts.join('_');

const RETIRED_RAW_KEYS = Object.freeze([
  key('trainer', 'store', 'v1'),
  key('trainer', 'free', 'session', 'v1'),
  key('trainer', 'session', 'entry', 'v1'),
  key('active', 'recall', 'items'),
  key('mistake', 'log', 'v1'),
  key('achievement', 'trainer', 'correct', 'count'),
  key('achievement', 'active', 'recall', 'correct', 'count'),
  key('achievement', 'trainer', 'correct', 'streak', 'v1'),
  key('achievement', 'trainer', 'perfect', 'session', 'count'),
]);

export async function cleanupRetiredMistakePracticeStorage(): Promise<void> {
  if (await AsyncStorage.getItem(CLEANUP_MARKER)) return;
  const targets = ['en', 'fr'] as const;
  const retired = [
    ...RETIRED_RAW_KEYS,
    ...targets.flatMap((target) => RETIRED_RAW_KEYS.map(
      (raw) => `trainer_practice_v2::${target}::${raw}`,
    )),
    key('irregular', 'verbs', 'srs', 'v1'),
    'lesson_progress_v2::fr::irregular_verbs_srs_v1',
  ];
  await Promise.all(retired.map((retiredKey) => AsyncStorage.removeItem(retiredKey)));
  await AsyncStorage.setItem(CLEANUP_MARKER, '1');
}
