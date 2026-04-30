import AsyncStorage from '@react-native-async-storage/async-storage';

const TOTAL = 50;

type Primed = {
  cell: number;
  order: number[] | null;
  progress: string[] | null;
};

const byLesson: Record<number, Primed> = {};

function parseIntCell(raw: string | null): number {
  if (raw == null || raw === '') return 0;
  return Math.max(0, parseInt(raw, 10) || 0);
}

function applyPrimedFromStorageStrings(
  lessonId: number,
  ci: string | null,
  order: string | null,
  prog: string | null
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
  byLesson[lessonId] = {
    cell: parseIntCell(ci),
    order: orderArr,
    progress: progressArr,
  };
}

/**
 * One native round-trip: load all saved lesson shuffles + cell + progress into RAM.
 * Call from app bootstrap before the first frame that can open /lesson1 (cold start — no in-lesson loader).
 */
export const LESSON_ID_MAX = 32;

export async function primeAllLessonsFromStorageOnAppLaunch(): Promise<void> {
  const keys: string[] = [];
  for (let i = 1; i <= LESSON_ID_MAX; i++) {
    keys.push(`lesson${i}_cellIndex`, `lesson${i}_phraseOrder`, `lesson${i}_progress`);
  }
  const entries = await AsyncStorage.multiGet(keys);
  const map = Object.fromEntries(entries) as Record<string, string | null>;
  for (let i = 1; i <= LESSON_ID_MAX; i++) {
    applyPrimedFromStorageStrings(
      i,
      map[`lesson${i}_cellIndex`] ?? null,
      map[`lesson${i}_phraseOrder`] ?? null,
      map[`lesson${i}_progress`] ?? null
    );
  }
}

/**
 * Read cell / phrase order / progress from storage into memory, then open /lesson1 in the same tick.
 * First paint of LessonScreen can use this synchronously (no 1/50 flash before real position).
 */
export async function primeLessonScreenFromStorage(lessonId: number): Promise<void> {
  if (lessonId < 1) return;
  const [[, ci], [, order], [, prog]] = await AsyncStorage.multiGet([
    `lesson${lessonId}_cellIndex`,
    `lesson${lessonId}_phraseOrder`,
    `lesson${lessonId}_progress`,
  ]);
  applyPrimedFromStorageStrings(lessonId, ci, order, prog);
}

export function getLessonScreenPrimed(lessonId: number): Primed | null {
  return byLesson[lessonId] ?? null;
}

/** Update in-memory copy after the user moved within the lesson (keeps return navigation accurate). */
export function touchLessonScreenPrimed(
  lessonId: number,
  patch: Partial<Pick<Primed, 'cell' | 'order' | 'progress'>>
): void {
  const cur = byLesson[lessonId] ?? { cell: 0, order: null, progress: null };
  byLesson[lessonId] = {
    cell: patch.cell !== undefined ? patch.cell : cur.cell,
    order: patch.order !== undefined ? patch.order : cur.order,
    progress: patch.progress !== undefined ? patch.progress : cur.progress,
  };
}

/**
 * Returns validated initial cell and phrase order. Only uses primed data when a valid saved shuffle exists;
 * otherwise loadData must create the order and apply cellIndex from storage.
 * `n` = LESSON_DATA.length, `effectiveTotal` = min(n, TOTAL).
 */
export function getInitialOrderAndCell(
  lessonId: number,
  n: number,
  effectiveTotal: number
): { startCell: number; initialOrder: number[] } {
  if (n <= 0) return { startCell: 0, initialOrder: [] };
  const primed = getLessonScreenPrimed(lessonId);
  const count = Math.min(n, TOTAL);
  if (primed?.order && primed.order.length === count && primed.order.every((i) => i >= 0 && i < n)) {
    const startCell = Math.max(0, Math.min(primed.cell, Math.max(0, effectiveTotal - 1)));
    return { startCell, initialOrder: primed.order };
  }
  return { startCell: 0, initialOrder: [] };
}

/**
 * Build initial progress array: only when primed length matches.
 */
export function getInitialProgressArray(effectiveTotal: number, lessonId: number): string[] {
  const primed = getLessonScreenPrimed(lessonId);
  const p = primed?.progress;
  if (p && p.length === effectiveTotal) return [...p];
  return new Array(effectiveTotal).fill('empty');
}

export function isLessonScreenPrimedThisSession(lessonId: number, n: number, effectiveTotal: number): boolean {
  return getInitialOrderAndCell(lessonId, n, effectiveTotal).initialOrder.length > 0;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
