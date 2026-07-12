import { CANONICAL_RELEASE_SURFACES, type CanonicalReleaseSurface } from './course_release_contract';

type ReviewUnit = {
  readonly unitId?: unknown;
  readonly jobId?: unknown;
  readonly studyTarget?: unknown;
  readonly learnerSourceLocale?: unknown;
  readonly releaseId?: unknown;
  readonly surface?: unknown;
  readonly lessonId?: unknown;
  readonly state?: unknown;
  readonly contentHash?: unknown;
  readonly objectGeneration?: unknown;
  readonly byteSize?: unknown;
  readonly qaReceipt?: unknown;
};

export interface ReleaseReviewValidationInput {
  readonly jobId: string;
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
  readonly releaseId: string;
  readonly expectedLessonIds: readonly number[];
  readonly expectedBlueprintHash: string;
  readonly expectedEvidenceIds: readonly string[];
  readonly units: readonly ReviewUnit[];
}

export interface ReleaseReviewValidationResult {
  readonly ok: boolean;
  readonly errors: readonly string[];
  readonly blueprintHash: string;
  readonly sourceEvidenceIds: readonly string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sortedUniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}

function unitKey(surface: CanonicalReleaseSurface, lessonId: number): string {
  return `${surface}:${lessonId}`;
}

export function validateReleaseReviewCandidate(input: ReleaseReviewValidationInput): ReleaseReviewValidationResult {
  const errors = new Set<string>();
  const expectedLessonIds = [...new Set(input.expectedLessonIds)];
  const expectedKeys = new Set(expectedLessonIds.flatMap((lessonId) => CANONICAL_RELEASE_SURFACES.map((surface) => unitKey(surface, lessonId))));
  const counts = new Map<string, number>();
  const expectedEvidenceIds = sortedUniqueStrings(input.expectedEvidenceIds);

  for (const unit of input.units) {
    const surface = unit.surface as CanonicalReleaseSurface;
    const lessonId = Number(unit.lessonId);
    if (!(CANONICAL_RELEASE_SURFACES as readonly string[]).includes(String(surface)) || !Number.isInteger(lessonId)) {
      errors.add('unit_scope_invalid');
      continue;
    }
    const key = unitKey(surface, lessonId);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (!expectedKeys.has(key)) errors.add('unit_scope_invalid');
    if (unit.jobId !== input.jobId || unit.studyTarget !== input.studyTarget || unit.learnerSourceLocale !== input.learnerSourceLocale || unit.releaseId !== input.releaseId) errors.add('unit_identity_mismatch');
    if (unit.state !== 'succeeded') errors.add('unit_not_succeeded');
    if (typeof unit.contentHash !== 'string' || !/^[a-f0-9]{64}$/i.test(unit.contentHash) || typeof unit.objectGeneration !== 'string' || !unit.objectGeneration.trim() || !Number.isSafeInteger(unit.byteSize) || Number(unit.byteSize) < 1) errors.add('artifact_receipt_invalid');
    if (!isRecord(unit.qaReceipt) || unit.qaReceipt.status !== 'passed') {
      errors.add('qa_not_passed');
      continue;
    }
    if (unit.qaReceipt.blueprintHash !== input.expectedBlueprintHash) errors.add('qa_blueprint_hash_mismatch');
    const evidenceIds = Array.isArray(unit.qaReceipt.sourceEvidenceIds) ? sortedUniqueStrings(unit.qaReceipt.sourceEvidenceIds.map(String)) : [];
    if (evidenceIds.join('|') !== expectedEvidenceIds.join('|')) errors.add('qa_source_evidence_mismatch');
  }
  for (const key of expectedKeys) {
    const count = counts.get(key) ?? 0;
    if (count === 0) errors.add('unit_missing');
    if (count > 1) errors.add('unit_duplicate');
  }
  return Object.freeze({ ok: errors.size === 0, errors: Object.freeze([...errors]), blueprintHash: input.expectedBlueprintHash, sourceEvidenceIds: Object.freeze(expectedEvidenceIds) });
}
