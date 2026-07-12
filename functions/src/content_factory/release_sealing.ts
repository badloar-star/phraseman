import { assertCourseRelease, CANONICAL_RELEASE_SURFACES, type CanonicalReleaseSurface, type CourseRelease, type CourseReleaseArtifact } from './course_release_contract';

type UnitState = 'queued' | 'running' | 'succeeded' | 'failed';

export interface CourseReleaseSealInput {
  readonly releaseId: string;
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
  readonly blueprintId: string;
  readonly blueprintHash: string;
  readonly contentVersion: string;
  readonly minAppVersion: string;
  readonly reviewStatus: string;
  readonly reviewerId: string;
  readonly unitStates: Readonly<Record<CanonicalReleaseSurface, UnitState>>;
  readonly artifacts: Readonly<Record<CanonicalReleaseSurface, CourseReleaseArtifact>>;
}

export function buildCourseRelease(input: CourseReleaseSealInput, now = new Date().toISOString()): CourseRelease {
  const complete = CANONICAL_RELEASE_SURFACES.every((surface) => input.unitStates[surface] === 'succeeded');
  if (!complete || input.reviewStatus !== 'approved' || !input.reviewerId.trim()) throw new Error('course_release_not_sealable');
  return assertCourseRelease({
    releaseId: input.releaseId,
    studyTarget: input.studyTarget,
    learnerSourceLocale: input.learnerSourceLocale,
    blueprintId: input.blueprintId,
    blueprintLocale: 'en',
    blueprintHash: input.blueprintHash,
    schemaVersion: 'course-release.v1',
    contentVersion: input.contentVersion,
    createdAt: now,
    minAppVersion: input.minAppVersion,
    artifacts: input.artifacts,
  });
}
