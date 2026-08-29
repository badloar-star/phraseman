import AsyncStorage from '@react-native-async-storage/async-storage';
import { patchAppSnapshot } from './app_snapshot_store';
import {
  lessonProgressKey,
  lessonSessionKey,
  storageStudyTarget,
  type RuntimeStudyTarget,
} from './target_storage_keys';
import { DebugLogger } from './debug-logger';

const TOTAL = 50;

type Primed = {
  cell: number;
  order: number[] | null;
  progress: string[] | null;
  override: number | null;
};

const byLesson: Record<string, Primed> = {};
const VALID_PROGRESS_STATES = new Set(['empty', 'correct', 'wrong', 'replay_correct']);

type LessonStorageId = string | number;

function primedKey(lessonId: LessonStorageId, studyTarget?: RuntimeStudyTarget): string {
  return `${storageStudyTarget(studyTarget)}:${lessonId}`;
}

function parseIntCell(raw: string | null): number {
  if (raw == null || raw === '') return 0;
  return Math.max(0, parseInt(raw, 10) || 0);
}

function parseOptionalCell(raw: string | null): number | null {
  if (raw == null || raw === '' || raw === 'null') return null;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
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
  lessonId: LessonStorageId,
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
  lessonId: LessonStorageId,
  ci: string | null,
  order: string | null,
  prog: string | null,
  override: string | null,
  studyTarget?: RuntimeStudyTarget,
): void {
  let orderArr: number[] | null = null;
  if (order) {
    try {
      const parsed: number[] = JSON.parse(order);
      if (Array.isArray(parsed) && parsed.length > 0) orderArr = parsed;
    } catch (e) {
      // keep null
      DebugLogger.error('lesson_screen_bootstrap:applyPrimedFromStorageStrings', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  }
  let progressArr: string[] | null = null;
  if (prog) {
    try {
      const p: string[] = JSON.parse(prog);
      if (Array.isArray(p) && p.length > 0) progressArr = p;
    } catch (e) {
      // keep null
      DebugLogger.error('lesson_screen_bootstrap:applyPrimedFromStorageStrings', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  }
  byLesson[primedKey(lessonId, studyTarget)] = {
    cell: parseIntCell(ci),
    order: orderArr,
    progress: progressArr,
    override: parseOptionalCell(override),
  };
}

function publishLessonPrimeSummary(studyTarget?: RuntimeStudyTarget): void {
  patchAppSnapshot((current) => ({
    lessons: {
      source: 'storage',
      updatedAt: Date.now(),
      primedCount: Object.keys(byLesson).length,
      lastOpenedLesson: current.lessons?.lastOpenedLesson ?? null,
    },
  }));
}

export const LESSON_ID_MAX = 32;

export async function primeAllLessonsFromStorageOnAppLaunch(studyTarget?: RuntimeStudyTarget): Promise<void> {
  const keys: string[] = [];
  for (let i = 1; i <= LESSON_ID_MAX; i++) {
    keys.push(
      lessonSessionKey(i, 'cellIndex', studyTarget),
      lessonSessionKey(i, 'phraseOrder', studyTarget),
      lessonProgressKey(i, studyTarget),
      lessonSessionKey(i, 'errorReplayOverride', studyTarget),
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
      map[lessonSessionKey(i, 'errorReplayOverride', studyTarget)] ?? null,
      studyTarget,
    );
  }
  publishLessonPrimeSummary(studyTarget);
}

export async function primeLessonScreenFromStorage(
  lessonId: number,
  studyTarget?: RuntimeStudyTarget,
): Promise<void> {
  if (!Number.isInteger(lessonId) || lessonId < 1 || lessonId > LESSON_ID_MAX) return;
  try {
    const [[, ci], [, order], [, prog], [, override]] = await AsyncStorage.multiGet([
      lessonSessionKey(lessonId, 'cellIndex', studyTarget),
      lessonSessionKey(lessonId, 'phraseOrder', studyTarget),
      lessonProgressKey(lessonId, studyTarget),
      lessonSessionKey(lessonId, 'errorReplayOverride', studyTarget),
    ]);
    applyPrimedFromStorageStrings(lessonId, ci, order, prog, override, studyTarget);
    publishLessonPrimeSummary(studyTarget);
  } catch (e) {
      // Priming is an optimization only. Callers must still be able to navigate to // the lesson; the lesson screen performs its own authoritative storage load.
      DebugLogger.error('lesson_screen_bootstrap:primeLessonScreenFromStorage', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

export function getLessonScreenPrimed(lessonId: LessonStorageId, studyTarget?: RuntimeStudyTarget): Primed | null {
  return byLesson[primedKey(lessonId, studyTarget)] ?? null;
}

export function touchLessonScreenPrimed(
  lessonId: LessonStorageId,
  patch: Partial<Pick<Primed, 'cell' | 'order' | 'progress' | 'override'>>,
  studyTarget?: RuntimeStudyTarget,
): void {
  const key = primedKey(lessonId, studyTarget);
  const cur = byLesson[key] ?? { cell: 0, order: null, progress: null, override: null };
  byLesson[key] = {
    cell: patch.cell !== undefined ? patch.cell : cur.cell,
    order: patch.order !== undefined ? patch.order : cur.order,
    progress: patch.progress !== undefined ? patch.progress : cur.progress,
    override: patch.override !== undefined ? patch.override : cur.override,
  };
  publishLessonPrimeSummary(studyTarget);
}

export function getInitialOrderAndCell(
  lessonId: LessonStorageId,
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
  lessonId: LessonStorageId,
  studyTarget?: RuntimeStudyTarget,
): string[] {
  const primed = getLessonScreenPrimed(lessonId, studyTarget);
  const p = primed?.progress;
  if (p && p.length === effectiveTotal && p.every((value) => VALID_PROGRESS_STATES.has(value))) return [...p];
  return new Array(effectiveTotal).fill('empty');
}

export function getInitialOverridePhraseCell(
  lessonId: LessonStorageId,
  effectiveTotal: number,
  studyTarget?: RuntimeStudyTarget,
): number | null {
  if (effectiveTotal <= 0) return null;
  const primed = getLessonScreenPrimed(lessonId, studyTarget);
  const override = primed?.override;
  if (override == null || override < 0 || override >= effectiveTotal) return null;
  const progress = primed?.progress;
  if (progress && progress[override] !== 'wrong') return null;
  return override;
}

export function isLessonScreenPrimedThisSession(
  lessonId: LessonStorageId,
  n: number,
  effectiveTotal: number,
  studyTarget?: RuntimeStudyTarget,
): boolean {
  return getInitialOrderAndCell(lessonId, n, effectiveTotal, studyTarget).initialOrder.length > 0;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
