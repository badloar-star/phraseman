export const CANONICAL_RELEASE_SURFACES = ['lesson', 'quiz', 'flashcard', 'arena'] as const;
export type CanonicalReleaseSurface = (typeof CANONICAL_RELEASE_SURFACES)[number];

export type CourseReleaseArtifact = {
  readonly releaseId: string;
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
  readonly surface: CanonicalReleaseSurface;
  readonly contentHash: string;
  readonly objectGeneration: string;
  readonly byteSize: number;
  readonly entryIndex: string;
};

export type CourseRelease = {
  readonly releaseId: string;
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
  readonly blueprintId: string;
  readonly blueprintLocale: 'en';
  readonly blueprintHash: string;
  readonly schemaVersion: string;
  readonly contentVersion: string;
  readonly createdAt: string;
  readonly minAppVersion: string;
  readonly artifacts: Readonly<Record<CanonicalReleaseSurface, CourseReleaseArtifact>>;
};

const CODE_RE = /^[a-z]{2,12}(?:-[A-Z]{2})?$/;
const TOKEN_RE = /^[A-Za-z0-9._-]{1,160}$/;
const HASH_RE = /^[a-f0-9]{64}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseCourseRelease(value: unknown): CourseRelease {
  if (!isRecord(value)) throw new Error('course_release_invalid:release_required');
  const errors: string[] = [];
  if (typeof value.releaseId !== 'string' || !TOKEN_RE.test(value.releaseId)) errors.push('release_id_invalid');
  if (typeof value.studyTarget !== 'string' || !CODE_RE.test(value.studyTarget)) errors.push('study_target_invalid');
  if (typeof value.learnerSourceLocale !== 'string' || !CODE_RE.test(value.learnerSourceLocale)) errors.push('learner_source_locale_invalid');
  if (typeof value.blueprintId !== 'string' || !TOKEN_RE.test(value.blueprintId)) errors.push('blueprint_id_invalid');
  if (value.blueprintLocale !== 'en') errors.push('blueprint_locale_must_be_en');
  if (typeof value.blueprintHash !== 'string' || !HASH_RE.test(value.blueprintHash)) errors.push('blueprint_hash_invalid');
  if (typeof value.schemaVersion !== 'string' || !TOKEN_RE.test(value.schemaVersion)) errors.push('schema_version_invalid');
  if (typeof value.contentVersion !== 'string' || !TOKEN_RE.test(value.contentVersion)) errors.push('content_version_invalid');
  if (typeof value.createdAt !== 'string' || !Number.isFinite(Date.parse(value.createdAt))) errors.push('created_at_invalid');
  if (typeof value.minAppVersion !== 'string' || !TOKEN_RE.test(value.minAppVersion)) errors.push('min_app_version_invalid');
  if (!isRecord(value.artifacts)) errors.push('artifacts_required');
  for (const surface of CANONICAL_RELEASE_SURFACES) {
    const artifact = isRecord(value.artifacts) ? value.artifacts[surface] : undefined;
    if (!isRecord(artifact)) { errors.push(`artifact_missing_${surface}`); continue; }
    if (artifact.releaseId !== value.releaseId || artifact.studyTarget !== value.studyTarget || artifact.learnerSourceLocale !== value.learnerSourceLocale || artifact.surface !== surface) errors.push('artifact_identity_mismatch');
    if (typeof artifact.contentHash !== 'string' || !HASH_RE.test(artifact.contentHash)) errors.push('artifact_hash_invalid');
    if (typeof artifact.objectGeneration !== 'string' || !artifact.objectGeneration.trim()) errors.push('artifact_generation_invalid');
    if (!Number.isSafeInteger(artifact.byteSize) || Number(artifact.byteSize) < 1) errors.push('artifact_byte_size_invalid');
    if (typeof artifact.entryIndex !== 'string' || !artifact.entryIndex.trim() || artifact.entryIndex.includes('..') || artifact.entryIndex.startsWith('/')) errors.push('artifact_entry_index_invalid');
  }
  if (errors.length) throw new Error(`course_release_invalid:${[...new Set(errors)].join(',')}`);
  return value as CourseRelease;
}

export function resolveCourseReleaseArtifact(
  release: CourseRelease,
  studyTarget: string,
  learnerSourceLocale: string,
  surface: string,
): CourseReleaseArtifact | null {
  if (release.studyTarget !== studyTarget || release.learnerSourceLocale !== learnerSourceLocale) return null;
  if (!(CANONICAL_RELEASE_SURFACES as readonly string[]).includes(surface)) return null;
  return release.artifacts[surface as CanonicalReleaseSurface] ?? null;
}
