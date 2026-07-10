import { assertCourseRelease, CANONICAL_RELEASE_SURFACES, type CourseRelease } from './course_release_contract';

export interface ActiveLanguageCatalogEntry {
  readonly surface: string;
  readonly studyTarget: string;
  readonly packId: string;
  readonly revision: number;
  readonly contentHash: string;
  readonly sourceLocale: string;
  readonly canonicalRelease: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function buildActiveLanguageCatalogEntries(
  catalogs: readonly { id: string; data: Record<string, unknown> }[],
  releasesById: ReadonlyMap<string, unknown>,
): ActiveLanguageCatalogEntry[] {
  const entries: ActiveLanguageCatalogEntry[] = [];
  for (const catalogDoc of catalogs) {
    const active = catalogDoc.data.activeRelease;
    if (!isRecord(active) || typeof active.releaseId !== 'string') continue;
    let release: CourseRelease;
    try { release = assertCourseRelease(releasesById.get(active.releaseId)); } catch { continue; }
    if (active.studyTarget !== release.studyTarget || active.learnerSourceLocale !== release.learnerSourceLocale || catalogDoc.id !== `${release.studyTarget}:${release.learnerSourceLocale}`) continue;
    const revision = Number(catalogDoc.data.revision ?? 0);
    if (!Number.isSafeInteger(revision) || revision < 1) continue;
    for (const surface of CANONICAL_RELEASE_SURFACES) {
      entries.push(Object.freeze({ surface, studyTarget: release.studyTarget, packId: release.releaseId, revision, contentHash: release.artifacts[surface].contentHash, sourceLocale: release.learnerSourceLocale, canonicalRelease: true }));
    }
  }
  return entries;
}
