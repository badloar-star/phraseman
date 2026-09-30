import type { RuntimeStudyTarget } from '../target_storage_keys';

/** Exact count only after My Packs has settled its full local/cloud merge. */
const MAX_AGE_MS = 15_000;
let snapshot: { studyTarget: string; userId: string | null; count: number; atMs: number } | null = null;

export function publishMyPacksCount(studyTarget: RuntimeStudyTarget, userId: string | null, count: number): void {
  snapshot = { studyTarget: String(studyTarget), userId, count, atMs: Date.now() };
}

export function peekMyPacksCount(studyTarget: RuntimeStudyTarget, userId: string | null): number | null {
  if (snapshot && Date.now() - snapshot.atMs > MAX_AGE_MS) snapshot = null;
  return snapshot?.studyTarget === String(studyTarget) && snapshot.userId === userId ? snapshot.count : null;
}

export function clearMyPacksCount(studyTarget: RuntimeStudyTarget): void {
  if (snapshot?.studyTarget === String(studyTarget)) snapshot = null;
}
