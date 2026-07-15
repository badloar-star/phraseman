import { captureAccountGeneration } from './account_generation';

export type ExamBestPctStudyTarget = 'en' | 'fr';
export type ExamBestPctLevel = 'A1' | 'A2' | 'B1' | 'B2';
export type ExamBestPctOverlayKey = `${ExamBestPctStudyTarget}|${ExamBestPctLevel}`;
export type ExamBestPctOverlayValues = Partial<Record<ExamBestPctOverlayKey, number>>;
export type ExamBestPctTabActivity = 'unknown' | 'safe_home' | 'unsafe';

const LEVELS: readonly ExamBestPctLevel[] = ['A1', 'A2', 'B1', 'B2'];

let ownerStableId: string | null = null;
let overlayValues: ExamBestPctOverlayValues = {};
let tabActivity: ExamBestPctTabActivity = 'unknown';

function parseBestPct(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= 0 && value <= 100 ? value : null;
  }
  if (typeof value !== 'string' || !/^(0|[1-9]\d{0,2})$/.test(value)) return null;
  const parsed = Number(value);
  return parsed <= 100 ? parsed : null;
}

export function extractExamBestPctOverlay(progress: Record<string, unknown>): ExamBestPctOverlayValues {
  const extracted: ExamBestPctOverlayValues = {};
  for (const level of LEVELS) {
    const enValue = parseBestPct(progress[`level_exam_${level}_best_pct`]);
    if (enValue !== null) extracted[`en|${level}`] = enValue;

    const frValue = parseBestPct(progress[`level_exams_v2::fr::level_exam_${level}_best_pct`]);
    if (frValue !== null) extracted[`fr|${level}`] = frValue;
  }
  return extracted;
}

export function publishExamBestPctOverlay(
  stableId: string,
  values: ExamBestPctOverlayValues,
): void {
  const normalizedOwner = stableId.trim();
  const entries = Object.entries(values) as [ExamBestPctOverlayKey, number][];
  if (!normalizedOwner || entries.length === 0) return;

  const next: ExamBestPctOverlayValues = ownerStableId === normalizedOwner
    ? { ...overlayValues }
    : {};
  for (const [key, value] of entries) {
    const validated = parseBestPct(value);
    if (validated === null) continue;
    next[key] = Math.max(next[key] ?? 0, validated);
  }
  if (Object.keys(next).length === 0) return;
  ownerStableId = normalizedOwner;
  overlayValues = next;
}

export function peekCurrentExamBestPct(
  studyTarget: ExamBestPctStudyTarget,
  level: ExamBestPctLevel,
): number {
  try {
    const account = captureAccountGeneration();
    if (account.phase !== 'active' || !account.stableId || account.stableId !== ownerStableId) return 0;
    return overlayValues[`${studyTarget}|${level}`] ?? 0;
  } catch {
    return 0;
  }
}

export function setExamBestPctTabActivity(next: ExamBestPctTabActivity): void {
  tabActivity = next;
}

export function isExamBestPctColdRestoreTabSafe(): boolean {
  return tabActivity === 'safe_home';
}

export function __resetExamBestPctOverlayForTests(): void {
  ownerStableId = null;
  overlayValues = {};
  tabActivity = 'unknown';
}
