import AsyncStorage from '@react-native-async-storage/async-storage';
import { effectiveLessonStarScore } from './lesson_star_score';

/** Last loaded lessons list state (session memory — first paint without «zero flash»). */
export type LessonsTabSnapshot = {
  noLimits: boolean;
  placementLevel: string;
  persistedUnlocked: number[];
  scores: number[];
  progCounts: number[];
  examResults: Record<string, { pct: number; passed: boolean }>;
  examBestPcts: Record<string, number>;
  examPassCounts: Record<string, number>;
};

let lastSnapshot: LessonsTabSnapshot | null = null;

export function getLessonsTabInitialState(): LessonsTabSnapshot | null {
  return lastSnapshot;
}

const EXAM_LEVELS = ['A1', 'A2', 'B1', 'B2'] as const;

/**
 * Batched read (one multiGet) + in-memory cache for instant tab mount / prefetch on app start.
 */
export async function loadLessonsTabStateFromStorage(): Promise<LessonsTabSnapshot> {
  const metaKeys = ['tester_no_limits', 'placement_level', 'unlocked_lessons'] as const;
  const lessonKeys: string[] = [];
  for (let i = 1; i <= 32; i++) {
    lessonKeys.push(`lesson${i}_best_score`, `lesson${i}_progress`);
  }
  const examKeys: string[] = [];
  for (const lvl of EXAM_LEVELS) {
    examKeys.push(
      `level_exam_${lvl}_pct`,
      `level_exam_${lvl}_passed`,
      `level_exam_${lvl}_best_pct`,
      `level_exam_${lvl}_pass_count`,
    );
  }
  const allKeys = [...metaKeys, ...lessonKeys, ...examKeys];
  const entries = await AsyncStorage.multiGet(allKeys);
  const map: Record<string, string | null> = Object.fromEntries(entries);

  const noLimits = map.tester_no_limits === 'true';
  const placementLevel = map.placement_level?.trim() || 'A1';
  let persistedUnlocked: number[] = [];
  if (map.unlocked_lessons) {
    try {
      persistedUnlocked = JSON.parse(map.unlocked_lessons) as number[];
    } catch {
      persistedUnlocked = [];
    }
  }

  const scores: number[] = new Array(32);
  const progCounts: number[] = new Array(32);

  for (let i = 0; i < 32; i++) {
    const num = i + 1;
    const { score, correctCount } = effectiveLessonStarScore(
      map[`lesson${num}_best_score`],
      map[`lesson${num}_progress`],
    );
    scores[i] = score;
    progCounts[i] = correctCount;
  }

  const examResults: Record<string, { pct: number; passed: boolean }> = {};
  const examBestPcts: Record<string, number> = {};
  const examPassCounts: Record<string, number> = {};
  for (const lvl of EXAM_LEVELS) {
    const pctRaw = map[`level_exam_${lvl}_pct`];
    const passedRaw = map[`level_exam_${lvl}_passed`];
    const bestRaw = map[`level_exam_${lvl}_best_pct`];
    const passRaw = map[`level_exam_${lvl}_pass_count`];
    const pct = parseInt(pctRaw || '0', 10) || 0;
    const bestPct = parseInt(bestRaw || '0', 10) || 0;
    const examPass = parseInt(passRaw || '0', 10) || 0;
    examResults[lvl] = { pct, passed: passedRaw === '1' };
    examBestPcts[lvl] = bestPct;
    examPassCounts[lvl] = examPass;
  }

  const snap: LessonsTabSnapshot = {
    noLimits,
    placementLevel,
    persistedUnlocked,
    scores,
    progCounts,
    examResults,
    examBestPcts,
    examPassCounts,
  };
  lastSnapshot = snap;
  return snap;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
