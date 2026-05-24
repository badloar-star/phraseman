import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  lessonProgressKey,
  lessonSessionKey,
  storageStudyTarget,
  type RuntimeStudyTarget,
} from './target_storage_keys';

const TOTAL = 50;

type Primed = {
  cell: number;
  order: number[] | null;
  progress: string[] | null;
};

const byLesson: Record<string, Primed> = {};
const VALID_PROGRESS_STATES = new Set(['empty', 'correct', 'wrong', 'replay_correct']);

function primedKey(lessonId: number, studyTarget?: RuntimeStudyTarget): string {
  return `${storageStudyTarget(studyTarget)}:${lessonId}`;
}

function parseIntCell(raw: string | null): number {
  if (raw == null || raw === '') return 0;
  return Math.max(0, parseInt(raw, 10) || 0);
}

export function clampStoredLessonCell(raw: string | null, effectiveTotal: number): number {
  if (effectiveTotal <= 0) return 0;
  const parsed = parseInt(raw ?? '', 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(parsed, effectiveTotal - 1));
}

export function parseStoredLessonProgress(raw: string | null, effectiveTotal: number): string[] | null {
  if (!raw || effectiveTotal <= 0) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    if (parsed.length !== effectiveTotal) return null;
    if (!parsed.every((value) => typeof value === 'string' && VALID_PROGRESS_STATES.has(value))) {
      return null;
    }
    return [...parsed];
  } catch {
    return null;
  }
}

export function isValidStoredLessonOrder(value: unknown, n: number, count: number): value is number[] {
  return Array.isArray(value)
    && value.length === count
    && new Set(value).size === value.length
    && value.every((i) => Number.isInteger(i) && i >= 0 && i < n);
}

export function parseStoredLessonOrder(raw: string | null, n: number, count: number): number[] | null {
  if (!raw || n <= 0 || count <= 0) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isValidStoredLessonOrder(parsed, n, count) ? [...parsed] : null;
  } catch {
    return null;
  }
}

export function buildLessonContentSignature(
  lessonId: number,
  studyTarget: RuntimeStudyTarget,
  phraseDescriptors: readonly string[],
): string {
  const base = `${storageStudyTarget(studyTarget)}:${lessonId}:${phraseDescriptors.join('\u001f')}`;
  let hash = 2166136261;
  for (let i = 0; i < base.length; i += 1) {
    hash ^= base.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${storageStudyTarget(studyTarget)}:${lessonId}:${phraseDescriptors.length}:${(hash >>> 0).toString(36)}`;
}

function applyPrimedFromStorageStrings(
  lessonId: number,
  ci: string | null,
  order: string | null,
  prog: string | null,
  studyTarget?: RuntimeStudyTarget,
): void {
  let orderArr: number[] | null = null;
  if (order) {
    try {
      const parsed: number[] = JSON.parse(order);
      if (Array.isArray(parsed) && parsed.length > 0) orderArr = parsed;
    } catch { /* keep null */ }
  }
  let progressArr: string[] | null = null;
  if (prog) {
    try {
      const p: string[] = JSON.parse(prog);
      if (Array.isArray(p) && p.length > 0) progressArr = p;
    } catch { /* keep null */ }
  }
  byLesson[primedKey(lessonId, studyTarget)] = {
    cell: parseIntCell(ci),
    order: orderArr,
    progress: progressArr,
  };
}

export const LESSON_ID_MAX = 32;

export async function primeAllLessonsFromStorageOnAppLaunch(studyTarget?: RuntimeStudyTarget): Promise<void> {
  const keys: string[] = [];
  for (let i = 1; i <= LESSON_ID_MAX; i++) {
    keys.push(
      lessonSessionKey(i, 'cellIndex', studyTarget),
      lessonSessionKey(i, 'phraseOrder', studyTarget),
      lessonProgressKey(i, studyTarget),
    );
  }
  const entries = await AsyncStorage.multiGet(keys);
  const map = Object.fromEntries(entries) as Record<string, string | null>;
  for (let i = 1; i <= LESSON_ID_MAX; i++) {
    applyPrimedFromStorageStrings(
      i,
      map[lessonSessionKey(i, 'cellIndex', studyTarget)] ?? null,
      map[lessonSessionKey(i, 'phraseOrder', studyTarget)] ?? null,
      map[lessonProgressKey(i, studyTarget)] ?? null,
      studyTarget,
    );
  }
}

export async function primeLessonScreenFromStorage(
  lessonId: number,
  studyTarget?: RuntimeStudyTarget,
): Promise<void> {
  if (lessonId < 1) return;
  const [[, ci], [, order], [, prog]] = await AsyncStorage.multiGet([
    lessonSessionKey(lessonId, 'cellIndex', studyTarget),
    lessonSessionKey(lessonId, 'phraseOrder', studyTarget),
    lessonProgressKey(lessonId, studyTarget),
  ]);
  applyPrimedFromStorageStrings(lessonId, ci, order, prog, studyTarget);
}

export function getLessonScreenPrimed(lessonId: number, studyTarget?: RuntimeStudyTarget): Primed | null {
  return byLesson[primedKey(lessonId, studyTarget)] ?? null;
}

export function touchLessonScreenPrimed(
  lessonId: number,
  patch: Partial<Pick<Primed, 'cell' | 'order' | 'progress'>>,
  studyTarget?: RuntimeStudyTarget,
): void {
  const key = primedKey(lessonId, studyTarget);
  const cur = byLesson[key] ?? { cell: 0, order: null, progress: null };
  byLesson[key] = {
    cell: patch.cell !== undefined ? patch.cell : cur.cell,
    order: patch.order !== undefined ? patch.order : cur.order,
    progress: patch.progress !== undefined ? patch.progress : cur.progress,
  };
}

export function getInitialOrderAndCell(
  lessonId: number,
  n: number,
  effectiveTotal: number,
  studyTarget?: RuntimeStudyTarget,
): { startCell: number; initialOrder: number[] } {
  if (n <= 0) return { startCell: 0, initialOrder: [] };
  const primed = getLessonScreenPrimed(lessonId, studyTarget);
  const count = Math.min(n, TOTAL);
  if (primed?.order && isValidStoredLessonOrder(primed.order, n, count)) {
    const startCell = Math.max(0, Math.min(primed.cell, Math.max(0, effectiveTotal - 1)));
    return { startCell, initialOrder: primed.order };
  }
  return { startCell: 0, initialOrder: [] };
}

export function getInitialProgressArray(
  effectiveTotal: number,
  lessonId: number,
  studyTarget?: RuntimeStudyTarget,
): string[] {
  const primed = getLessonScreenPrimed(lessonId, studyTarget);
  const p = primed?.progress;
  if (p && p.length === effectiveTotal && p.every((value) => VALID_PROGRESS_STATES.has(value))) return [...p];
  return new Array(effectiveTotal).fill('empty');
}

export function isLessonScreenPrimedThisSession(
  lessonId: number,
  n: number,
  effectiveTotal: number,
  studyTarget?: RuntimeStudyTarget,
): boolean {
  return getInitialOrderAndCell(lessonId, n, effectiveTotal, studyTarget).initialOrder.length > 0;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
