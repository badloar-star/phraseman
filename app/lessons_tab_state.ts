import AsyncStorage from '@react-native-async-storage/async-storage';
import { effectiveLessonStarScore } from './lesson_star_score';
import { normalizeLessonPassCount } from './medal_utils';
import {
  LEGACY_FREE_LESSON_MIN,
  normalizeLegacyFreeLessonCap,
} from './legacy_free_lesson_access';
import { IS_STORE_RELEASE } from './config';
import { captureAccountGeneration } from './account_generation';
import {
  legacyFreeLessonCapKey,
  lessonBestScoreKey,
  lessonPassCountKey,
  lessonProgressKey,
  levelExamKey,
  storageStudyTarget,
  unlockedLessonsKey,
  type RuntimeStudyTarget,
} from './target_storage_keys';

/** Last loaded lessons list state (session memory — first paint without «zero flash»). */
export type LessonsTabSnapshot = {
  noLimits: boolean;
  legacyFreeLessonCap: number;
  persistedUnlocked: number[];
  scores: number[];
  progCounts: number[];
  passCounts: number[];
  examResults: Record<string, { pct: number; passed: boolean }>;
  examBestPcts: Record<string, number>;
  examPassCounts: Record<string, number>;
};

// зачем: кэш заштампован поколением аккаунта (2026-08-02) — после смены аккаунта
// синхронный boot-снимок прежнего пользователя (очки/медали/exam best pct) не должен
// мигнуть на первом кадре списка уроков. Тот же паттерн, что у сессионного кэша
// в app/(tabs)/lessons.tsx (замена privacy-крышки убранного таба «Уроки»).
let lastSnapshotByTarget: Partial<Record<string, LessonsTabSnapshot>> = {};
let lastSnapshotGeneration = -1;

function dropSnapshotsOfOtherGenerations(): void {
  const generation = captureAccountGeneration().generation;
  if (generation !== lastSnapshotGeneration) {
    lastSnapshotByTarget = {};
    lastSnapshotGeneration = generation;
  }
}

export function getLessonsTabInitialState(studyTarget?: RuntimeStudyTarget): LessonsTabSnapshot | null {
  dropSnapshotsOfOtherGenerations();
  return lastSnapshotByTarget[storageStudyTarget(studyTarget)] ?? null;
}

const EXAM_LEVELS = ['A1', 'A2', 'B1', 'B2'] as const;

/**
 * Batched read (one multiGet) + in-memory cache for instant tab mount / prefetch on app start.
 */
export async function loadLessonsTabStateFromStorage(
  studyTarget?: RuntimeStudyTarget,
): Promise<LessonsTabSnapshot> {
  const target = storageStudyTarget(studyTarget);
  const unlockedKey = unlockedLessonsKey(studyTarget);
  const legacyCapKey = legacyFreeLessonCapKey(studyTarget);
  const metaKeys = ['tester_no_premium', 'tester_no_limits', unlockedKey, legacyCapKey] as const;
  const lessonKeys: string[] = [];
  for (let i = 1; i <= 32; i++) {
    lessonKeys.push(
      lessonBestScoreKey(i, studyTarget),
      lessonProgressKey(i, studyTarget),
      lessonPassCountKey(i, studyTarget),
    );
  }
  const examKeys: string[] = [];
  for (const lvl of EXAM_LEVELS) {
    examKeys.push(
      levelExamKey(lvl, 'pct', studyTarget),
      levelExamKey(lvl, 'passed', studyTarget),
      levelExamKey(lvl, 'best_pct', studyTarget),
      levelExamKey(lvl, 'pass_count', studyTarget),
    );
  }
  const allKeys = [...metaKeys, ...lessonKeys, ...examKeys];
  // Штамп до чтения: если аккаунт сменится, пока multiGet в полёте, смешанный
  // снимок не должен осесть в кэше (last-write-guard, как у осколков).
  const generationAtLoadStart = captureAccountGeneration().generation;
  const entries = await AsyncStorage.multiGet(allKeys);
  const map: Record<string, string | null> = Object.fromEntries(entries);

  const noLimits = map.tester_no_premium !== 'true'
    && map.tester_no_limits === 'true'
    && !IS_STORE_RELEASE;
  const legacyFreeLessonCap = normalizeLegacyFreeLessonCap(map[legacyCapKey]) ?? LEGACY_FREE_LESSON_MIN;
  let persistedUnlocked: number[] = [];
  if (map[unlockedKey]) {
    try {
      persistedUnlocked = JSON.parse(map[unlockedKey] ?? '[]') as number[];
    } catch {
      persistedUnlocked = [];
    }
  }

  const scores: number[] = new Array(32);
  const progCounts: number[] = new Array(32);
  const passCounts: number[] = new Array(32);

  for (let i = 0; i < 32; i++) {
    const num = i + 1;
    const bestScoreKey = lessonBestScoreKey(num, studyTarget);
    const progressKey = lessonProgressKey(num, studyTarget);
    const passCountKey = lessonPassCountKey(num, studyTarget);
    const { score, correctCount } = effectiveLessonStarScore(
      map[bestScoreKey],
      map[progressKey],
    );
    scores[i] = score;
    progCounts[i] = correctCount;
    passCounts[i] = normalizeLessonPassCount(
      parseInt(map[passCountKey] || '0', 10) || 0,
      score,
    );
  }

  const examResults: Record<string, { pct: number; passed: boolean }> = {};
  const examBestPcts: Record<string, number> = {};
  const examPassCounts: Record<string, number> = {};
  for (const lvl of EXAM_LEVELS) {
    const pctRaw = map[levelExamKey(lvl, 'pct', studyTarget)];
    const passedRaw = map[levelExamKey(lvl, 'passed', studyTarget)];
    const bestRaw = map[levelExamKey(lvl, 'best_pct', studyTarget)];
    const passRaw = map[levelExamKey(lvl, 'pass_count', studyTarget)];
    const pct = parseInt(pctRaw || '0', 10) || 0;
    const bestPct = parseInt(bestRaw || '0', 10) || 0;
    const examPass = parseInt(passRaw || '0', 10) || 0;
    examResults[lvl] = { pct, passed: passedRaw === '1' };
    examBestPcts[lvl] = bestPct;
    examPassCounts[lvl] = examPass;
  }

  const snap: LessonsTabSnapshot = {
    noLimits,
    legacyFreeLessonCap,
    persistedUnlocked,
    scores,
    progCounts,
    passCounts,
    examResults,
    examBestPcts,
    examPassCounts,
  };
  // Сначала сброс чужих поколений, потом запись — снапшот ложится уже в кэш
  // текущего аккаунта и не смешивается с прежним.
  dropSnapshotsOfOtherGenerations();
  // В кэш — только снимок, дочитанный в том же поколении аккаунта; экрану
  // возвращаем в любом случае (его собственный refetch на фокусе догонит).
  if (generationAtLoadStart === captureAccountGeneration().generation) {
    dropSnapshotsOfOtherGenerations();
    lastSnapshotByTarget[target] = snap;
    lastSnapshotGeneration = generationAtLoadStart;
  }
  return snap;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
