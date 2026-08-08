import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  legacyFreeLessonCapKey,
  legacyFreeLessonMigrationKey,
  lessonBestScoreKey,
  lessonPassCountKey,
  lessonProgressKey,
  unlockedLessonsKey,
  type RuntimeStudyTarget,
} from './target_storage_keys';

export const LEGACY_FREE_LESSON_MIN = 3;
export const LEGACY_FREE_LESSON_MAX = 8;
export const LEGACY_FREE_LESSON_MIGRATION_COMPLETE = 'complete';

export type LegacyLessonRestoreStatus = 'restored' | 'not_found' | 'failed';

export type LegacyFreeLessonMigrationResult =
  | { status: 'already_final'; cap: number }
  | { status: 'finalized'; cap: number }
  | { status: 'pending'; cap: null };

export type LegacyFreeLessonEvidence = Readonly<{
  persistedUnlocked: readonly number[];
  scores: readonly number[];
  progressCounts: readonly number[];
  passCounts: readonly number[];
}>;

const MIGRATION_TARGETS: readonly RuntimeStudyTarget[] = ['en', 'fr'];

export function normalizeLegacyFreeLessonCap(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(
    LEGACY_FREE_LESSON_MAX,
    Math.max(LEGACY_FREE_LESSON_MIN, Math.trunc(parsed)),
  );
}

export function deriveLegacyFreeLessonCap(evidence: LegacyFreeLessonEvidence): number {
  let highest = LEGACY_FREE_LESSON_MIN;
  const persistedUnlocked = new Set(
    evidence.persistedUnlocked.filter((lessonId) => Number.isInteger(lessonId)),
  );

  for (let lessonId = 1; lessonId <= LEGACY_FREE_LESSON_MAX; lessonId += 1) {
    const index = lessonId - 1;
    const hasEvidence =
      persistedUnlocked.has(lessonId) ||
      (evidence.scores[index] ?? 0) > 0 ||
      (evidence.progressCounts[index] ?? 0) > 0 ||
      (evidence.passCounts[index] ?? 0) > 0;
    if (hasEvidence) highest = lessonId;
  }

  return highest;
}

function parseUnlockedLessons(raw: string | null): number[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value >= 1);
  } catch {
    return [];
  }
}

function parseProgressCount(raw: string | null): number {
  if (!raw) return 0;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

async function readLegacyFreeLessonEvidence(
  studyTarget?: RuntimeStudyTarget,
): Promise<LegacyFreeLessonEvidence> {
  const unlockedKey = unlockedLessonsKey(studyTarget);
  const lessonKeys: string[] = [];
  for (let lessonId = 1; lessonId <= LEGACY_FREE_LESSON_MAX; lessonId += 1) {
    lessonKeys.push(
      lessonBestScoreKey(lessonId, studyTarget),
      lessonProgressKey(lessonId, studyTarget),
      lessonPassCountKey(lessonId, studyTarget),
    );
  }

  const entries = await AsyncStorage.multiGet([unlockedKey, ...lessonKeys]);
  const values = Object.fromEntries(entries);
  const scores: number[] = [];
  const progressCounts: number[] = [];
  const passCounts: number[] = [];

  for (let lessonId = 1; lessonId <= LEGACY_FREE_LESSON_MAX; lessonId += 1) {
    scores.push(parseFloat(values[lessonBestScoreKey(lessonId, studyTarget)] ?? '0') || 0);
    progressCounts.push(parseProgressCount(values[lessonProgressKey(lessonId, studyTarget)] ?? null));
    passCounts.push(parseInt(values[lessonPassCountKey(lessonId, studyTarget)] ?? '0', 10) || 0);
  }

  return {
    persistedUnlocked: parseUnlockedLessons(values[unlockedKey] ?? null),
    scores,
    progressCounts,
    passCounts,
  };
}

export async function readLegacyFreeLessonCap(
  studyTarget?: RuntimeStudyTarget,
): Promise<number> {
  const raw = await AsyncStorage.getItem(legacyFreeLessonCapKey(studyTarget)).catch(() => null);
  return normalizeLegacyFreeLessonCap(raw) ?? LEGACY_FREE_LESSON_MIN;
}

export async function migrateLegacyFreeLessonAccess(
  restoreStatus: LegacyLessonRestoreStatus,
  studyTarget?: RuntimeStudyTarget,
): Promise<LegacyFreeLessonMigrationResult> {
  const capKey = legacyFreeLessonCapKey(studyTarget);
  const migrationKey = legacyFreeLessonMigrationKey(studyTarget);
  const stored = Object.fromEntries(await AsyncStorage.multiGet([capKey, migrationKey]));
  const storedCap = normalizeLegacyFreeLessonCap(stored[capKey]);

  if (stored[migrationKey] === LEGACY_FREE_LESSON_MIGRATION_COMPLETE && storedCap !== null) {
    return { status: 'already_final', cap: storedCap };
  }

  const evidence = await readLegacyFreeLessonEvidence(studyTarget);
  const derivedCap = Math.max(storedCap ?? LEGACY_FREE_LESSON_MIN, deriveLegacyFreeLessonCap(evidence));

  if (restoreStatus === 'failed' && derivedCap === LEGACY_FREE_LESSON_MIN) {
    return { status: 'pending', cap: null };
  }

  await AsyncStorage.multiSet([
    [capKey, String(derivedCap)],
    [migrationKey, LEGACY_FREE_LESSON_MIGRATION_COMPLETE],
  ]);
  return { status: 'finalized', cap: derivedCap };
}

export async function migrateLegacyFreeLessonAccessForAllTargets(
  restoreStatus: LegacyLessonRestoreStatus,
): Promise<void> {
  await Promise.all(
    MIGRATION_TARGETS.map((studyTarget) => (
      migrateLegacyFreeLessonAccess(restoreStatus, studyTarget)
    )),
  );
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
