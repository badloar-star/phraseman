import fs from 'node:fs';
import path from 'node:path';
import { cleanupRetiredMistakePracticeStorage } from '../app/mistake_practice_legacy_cleanup';

const mockStorageData = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStorageData.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => { mockStorageData.set(key, value); }),
    removeItem: jest.fn(async (key: string) => { mockStorageData.delete(key); }),
  },
}));

const ROOT = path.resolve(__dirname, '..');
const exists = (relativePath: string): boolean =>
  fs.existsSync(path.join(ROOT, relativePath));
const read = (relativePath: string): string =>
  fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

const RETIRED_TRAINER_SIGNALS = [
  ['free', 'trainer', 'sessions', 'per', 'day'].join('_'),
  ['trainer', 'ab', 'a', 'pct'].join('_'),
  ['trainer', 'ab', 'b', 'pct'].join('_'),
  ['trainer', 'ab', 'c', 'pct'].join('_'),
  ['gate', 'smart', 'trainer', 'premium'].join('_'),
  ['gate', 'trainer', 'modes', 'premium'].join('_'),
  ['trainer', 'free', 'session', 'v1'].join('_'),
  ['trainer', 'session', 'entry', 'v1'].join('_'),
  ['trainer', 'store'].join('_'),
  ['mistake', 'log'].join('_'),
  ['active', 'recall'].join('_'),
  ['trainer', 'practice'].join('_'),
  ['irregular', 'verbs', 'srs', 'v1'].join('_'),
  ['srs', 'review'].join('_'),
  ['srs', 'active recall review'].join('/'),
  ['My', 'Practice'].join(' '),
  ['Моя', 'практика'].join(' '),
] as const;

const filesUnder = (relativeRoot: string): string[] => {
  const absoluteRoot = path.join(ROOT, relativeRoot);
  if (!fs.existsSync(absoluteRoot)) return [];
  const output: string[] = [];
  const visit = (absolutePath: string) => {
    for (const entry of fs.readdirSync(absolutePath, { withFileTypes: true })) {
      const child = path.join(absolutePath, entry.name);
      if (entry.isDirectory()) visit(child);
      else if (/\.(?:ts|tsx|js|mjs|html)$/.test(entry.name)) {
        output.push(path.relative(ROOT, child).replace(/\\/g, '/'));
      }
    }
  };
  visit(absoluteRoot);
  return output;
};

const LEGACY_OWNED_FILES = [
  'app/active_recall.ts',
  'app/trainer_store.ts',
  'app/mistake_log.ts',
  'app/trainer.tsx',
  'app/review.tsx',
  'app/trainer_words_session.tsx',
  'app/trainer_phrases_session.tsx',
  'app/trainer_session.ts',
  'app/trainer_session_navigation.ts',
  'app/trainer_session_report.tsx',
  'app/trainer_practice_hall.ts',
  'app/trainer_practice_persist.ts',
  'app/trainer_practice_prefetch.ts',
  'app/trainer_fill_gap_options.ts',
  'app/irregular_verbs_srs.ts',
  'components/PracticeHallTrendChart.tsx',
  'components/TrainerLoadStates.tsx',
  'components/trainer_load_copy.ts',
] as const;

describe('retired My Practice inventory', () => {
  beforeEach(() => {
    mockStorageData.clear();
  });

  test('legacy-owned runtime files stay deleted', () => {
    for (const relativePath of LEGACY_OWNED_FILES) {
      expect({ relativePath, exists: exists(relativePath) }).toEqual({ relativePath, exists: false });
    }
  });

  test('tracks old routes and home entrypoint before their removal', () => {
    const layout = read('app/_layout.tsx');
    const home = read('app/(tabs)/home.tsx');

    expect(layout).not.toContain('<Stack.Screen name="review" />');
    expect(layout).not.toContain('<Stack.Screen name="trainer" />');
    expect(layout).not.toContain('trainer_words_session');
    expect(layout).not.toContain('trainer_phrases_session');
    expect(home).not.toContain("go('/trainer');");
    expect(home).not.toContain('prefetchTrainerPracticeSnapshot');
    expect(layout).toContain('<Stack.Screen name="mistake_practice_session" />');
  });

  test('legacy long-term storage families cannot sync or be recreated', () => {
    const keys = read('app/target_storage_keys.ts');
    const cloud = read('app/cloud_sync.ts');

    for (const legacyKey of ['trainer_store_v1', 'active_recall_items']) {
      expect(keys).not.toContain(legacyKey);
      expect(cloud).not.toContain(legacyKey);
    }
    expect(keys).not.toContain('mistake_log_v1');
    expect(cloud).not.toContain('mistakeLogKey');
    expect(keys).toContain('mistakePracticeEventsKey');
    expect(cloud).toContain('uploadMistakePracticeEvents');
    expect(cloud).toContain('restoreMistakePracticeEvents');
    expect(cloud).not.toContain("mistakePracticeEventsKey('en')");
  });

  test('deletes retired local families once without importing them', () => {
    const cleanup = read('app/mistake_practice_legacy_cleanup.ts');
    const layout = read('app/_layout.tsx');
    expect(cleanup).toContain('cleanupRetiredMistakePracticeStorage');
    expect(cleanup).toContain('removeItem');
    expect(cleanup).not.toContain('captureObjectiveAttempt');
    expect(layout).toContain('cleanupRetiredMistakePracticeStorage');
  });

  test('deletes the exact EN and FR keys produced by the retired irregular-verbs factory', async () => {
    // scopedOrLegacyKey returned raw English storage and scoped only French.
    const rawEnglish = 'irregular_verbs_srs_v1';
    const scopedFrench = 'lesson_progress_v2::fr::irregular_verbs_srs_v1';
    const unrelatedScopedEnglish = 'lesson_progress_v2::en::irregular_verbs_srs_v1';
    const unrelatedTrainerPrefix = 'trainer_practice_v2::en::irregular_verbs_srs_v1';
    for (const key of [rawEnglish, scopedFrench, unrelatedScopedEnglish, unrelatedTrainerPrefix]) {
      mockStorageData.set(key, 'legacy');
    }

    await cleanupRetiredMistakePracticeStorage();

    expect(mockStorageData.has(rawEnglish)).toBe(false);
    expect(mockStorageData.has(scopedFrench)).toBe(false);
    expect(mockStorageData.get(unrelatedScopedEnglish)).toBe('legacy');
    expect(mockStorageData.get(unrelatedTrainerPrefix)).toBe('legacy');
  });

  test('retired Trainer identifiers cannot return outside the explicit cleanup allowlist', () => {
    const allowlist = new Set([
      'app/mistake_practice_legacy_cleanup.ts',
      'tests/mistake_practice_legacy_inventory_contract.test.ts',
    ]);
    const scanned = [
      ...filesUnder('app'),
      ...filesUnder('components'),
      ...filesUnder('modules'),
      ...filesUnder('functions/src'),
      ...filesUnder('admin/v2'),
      ...filesUnder('scripts'),
      ...filesUnder('tests'),
    ].filter((relativePath) => !allowlist.has(relativePath));
    const violations = scanned.flatMap((relativePath) => {
      const source = read(relativePath).toLocaleLowerCase();
      return RETIRED_TRAINER_SIGNALS
        .filter((signal) => source.includes(signal.toLocaleLowerCase()))
        .map((signal) => `${relativePath}: ${signal}`);
    });
    expect(violations).toEqual([]);
  });
});
