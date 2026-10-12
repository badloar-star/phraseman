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
  storedProgressFlagIsTrue,
  storageStudyTarget,
  unlockedLessonsKey,
  type RuntimeStudyTarget,
} from './target_storage_keys';
import { parsePurchasedLessonList, purchasedLessonsKey } from './lessons_pearl_unlock_storage';

/** Last loaded lessons list state (session memory — first paint without «zero flash»). */
export type LessonsTabSnapshot = {
  noLimits: boolean;
  legacyFreeLessonCap: number;
  persistedUnlocked: number[];
  /** Уроки, открытые за 100 жемчужин (владелец 2026-09-17). Навсегда. */
  purchasedLessons: number[];
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

// зачем (координатор 12.10, R1 «Уроки 3,6 с до первого кадра», «сперва логи»): [LESSONS-BOOT] показывает, был ли снимок
// списка готов к монтажу вкладки (hit/miss и его возраст), кто и когда читал хранилище (ранний прогрев _layout, сам экран,
// Диалоги), сколько параллельных чтений шло и сколько заняли multiGet и разбор.
// зачем (Дизайн 12.10, 🟡 №3 «релизные цифры Обучения»): строки живы и в продакшен-JS (Metro --no-dev --minify) — 3–4 на запуск,
// стоимость ничтожна; в стор-сборке (EXPO_PUBLIC_STORE_RELEASE=1) их нет.
const BOOT_TRACE = !IS_STORE_RELEASE;
const MODULE_LOADED_AT_MS = Date.now();
const loadedAtByTarget: Partial<Record<string, number>> = {};
const inflightByTarget: Partial<Record<string, number>> = {};
const initialLogged = new Set<string>();

function lessonsBootTrace(event: string, extra: Record<string, unknown>): void {
  if (!BOOT_TRACE) return;
  console.log(`[LESSONS-BOOT] ${event} ${JSON.stringify({ sinceModuleMs: Date.now() - MODULE_LOADED_AT_MS, atEpochMs: Date.now(), ...extra })}`);
}

function dropSnapshotsOfOtherGenerations(): void {
  const generation = captureAccountGeneration().generation;
  if (generation !== lastSnapshotGeneration) {
    lastSnapshotByTarget = {};
    lastSnapshotGeneration = generation;
  }
}

export function getLessonsTabInitialState(studyTarget?: RuntimeStudyTarget): LessonsTabSnapshot | null {
  dropSnapshotsOfOtherGenerations();
  const target = storageStudyTarget(studyTarget);
  const snap = lastSnapshotByTarget[target] ?? null;
  // Зовётся на КАЖДОМ рендере экрана — пишем только первый вызов и смену промаха на попадание.
  const logKey = `${lastSnapshotGeneration}:${target}:${snap ? 'hit' : 'miss'}`;
  if (BOOT_TRACE && !initialLogged.has(logKey)) {
    initialLogged.add(logKey);
    const loadedAt = loadedAtByTarget[target];
    lessonsBootTrace('initial_state', {
      target,
      result: snap ? 'hit' : 'miss',
      generation: lastSnapshotGeneration,
      snapshotAgeMs: snap && loadedAt ? Date.now() - loadedAt : null,
      inflight: inflightByTarget[target] ?? 0,
      scoredLessons: snap ? snap.scores.filter((score) => score > 0).length : null,
    });
  }
  return snap;
}

const EXAM_LEVELS = ['A1', 'A2', 'B1', 'B2'] as const;

/**
 * Batched read (one multiGet) + in-memory cache for instant tab mount / prefetch on app start.
 */
export async function loadLessonsTabStateFromStorage(
  studyTarget?: RuntimeStudyTarget,
  caller: string = 'unspecified',
): Promise<LessonsTabSnapshot> {
  const target = storageStudyTarget(studyTarget);
  const startedAtMs = Date.now();
  inflightByTarget[target] = (inflightByTarget[target] ?? 0) + 1;
  lessonsBootTrace('load:start', {
    target,
    caller,
    inflight: inflightByTarget[target],
    cached: Boolean(lastSnapshotByTarget[target]),
  });
  try {
    return await readLessonsTabStateFromStorage(studyTarget, target, caller, startedAtMs);
  } finally {
    inflightByTarget[target] = Math.max(0, (inflightByTarget[target] ?? 1) - 1);
  }
}

async function readLessonsTabStateFromStorage(
  studyTarget: RuntimeStudyTarget | undefined,
  target: string,
  caller: string,
  startedAtMs: number,
): Promise<LessonsTabSnapshot> {
  const unlockedKey = unlockedLessonsKey(studyTarget);
  const legacyCapKey = legacyFreeLessonCapKey(studyTarget);
  // зачем: купленные уроки читаются ТЕМ ЖЕ multiGet — отдельное чтение диска
  // на первом кадре списка стоило бы дороже, чем один лишний ключ.
  const purchasedKey = purchasedLessonsKey(studyTarget);
  const metaKeys = ['tester_no_premium', 'tester_no_limits', unlockedKey, legacyCapKey, purchasedKey] as const;
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
  const multiGetStartedAtMs = Date.now();
  const entries = await AsyncStorage.multiGet(allKeys);
  const multiGetMs = Date.now() - multiGetStartedAtMs;
  const parseStartedAtMs = Date.now();
  const map: Record<string, string | null> = Object.fromEntries(entries);

  const noLimits = map.tester_no_premium !== 'true'
    && map.tester_no_limits === 'true'
    && !IS_STORE_RELEASE;
  const legacyFreeLessonCap = normalizeLegacyFreeLessonCap(map[legacyCapKey]) ?? LEGACY_FREE_LESSON_MIN;
  let persistedUnlocked: number[] = [];
  if (map[unlockedKey]) {
    try {
      persistedUnlocked = JSON.parse(map[unlockedKey] ?? '[]') as number[];
    } catch (error) {
      // Битый список открытых уроков: показываем как «ничего не открыто сверх правил», но причину пишем всегда.
      console.warn(`[LESSONS-BOOT] unlocked_parse_failed ${JSON.stringify({ target, bytes: (map[unlockedKey] ?? '').length, error: error instanceof Error ? error.message : String(error) })}`);
      persistedUnlocked = [];
    }
  }
  // Один разбор на всё приложение: правило «что считается купленным уроком»
  // не должно расходиться между снапшотом и проверками доступа.
  const purchasedLessons = parsePurchasedLessonList(map[purchasedKey] ?? null);

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
    examResults[lvl] = { pct, passed: storedProgressFlagIsTrue(passedRaw) };
    examBestPcts[lvl] = bestPct;
    examPassCounts[lvl] = examPass;
  }

  const snap: LessonsTabSnapshot = {
    noLimits,
    legacyFreeLessonCap,
    persistedUnlocked,
    purchasedLessons,
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
  const generationNow = captureAccountGeneration().generation;
  if (generationAtLoadStart === generationNow) {
    dropSnapshotsOfOtherGenerations();
    lastSnapshotByTarget[target] = snap;
    lastSnapshotGeneration = generationAtLoadStart;
    loadedAtByTarget[target] = Date.now();
  }
  lessonsBootTrace('load:done', {
    target,
    caller,
    keys: allKeys.length,
    totalMs: Date.now() - startedAtMs,
    multiGetMs,
    parseMs: Date.now() - parseStartedAtMs,
    cachedResult: generationAtLoadStart === generationNow ? 'stored' : 'skipped_generation_changed',
    scoredLessons: scores.filter((score) => score > 0).length,
  });
  return snap;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
