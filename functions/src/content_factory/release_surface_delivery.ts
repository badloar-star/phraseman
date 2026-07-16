import { CANONICAL_RELEASE_SURFACES, type CanonicalReleaseSurface } from './course_release_contract';
import { createHash } from 'node:crypto';

const LOCALE_RE = /^[a-z]{2,12}(?:-[A-Z]{2})?$/;
const TOKEN_RE = /^[A-Za-z0-9._-]{1,160}$/;
const HASH_RE = /^[a-f0-9]{64}$/i;

export interface CourseSurfaceEntryRequest {
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
  readonly releaseId: string;
  readonly surface: CanonicalReleaseSurface;
  readonly lessonId: number;
}

export type CourseSurfaceBundleRequest = Omit<CourseSurfaceEntryRequest, 'lessonId'>;

export interface IndexedCourseUnit {
  readonly lessonId: number;
  readonly objectPath: string;
  readonly contentHash: string;
  readonly objectGeneration: string;
  readonly engineResolved: 'legacy' | 'stage';
  readonly configRevision: number;
  readonly comparatorVersion: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseCourseSurfaceEntryRequest(value: unknown): CourseSurfaceEntryRequest {
  if (!isRecord(value)) throw new Error('course_surface_request_invalid');
  const studyTarget = String(value.studyTarget ?? '').trim();
  const learnerSourceLocale = String(value.learnerSourceLocale ?? '').trim();
  const releaseId = String(value.releaseId ?? '').trim();
  const surface = String(value.surface ?? '') as CanonicalReleaseSurface;
  const lessonId = Number(value.lessonId);
  if (!LOCALE_RE.test(studyTarget) || !LOCALE_RE.test(learnerSourceLocale) || !TOKEN_RE.test(releaseId) || !(CANONICAL_RELEASE_SURFACES as readonly string[]).includes(surface) || !Number.isInteger(lessonId) || lessonId < 1 || lessonId > 100) throw new Error('course_surface_request_invalid');
  return Object.freeze({ studyTarget, learnerSourceLocale, releaseId, surface, lessonId });
}

export function parseCourseSurfaceBundleRequest(value: unknown): CourseSurfaceBundleRequest {
  if (!isRecord(value)) throw new Error('course_surface_request_invalid');
  const studyTarget = String(value.studyTarget ?? '').trim();
  const learnerSourceLocale = String(value.learnerSourceLocale ?? '').trim();
  const releaseId = String(value.releaseId ?? '').trim();
  const surface = String(value.surface ?? '') as CanonicalReleaseSurface;
  if (!LOCALE_RE.test(studyTarget) || !LOCALE_RE.test(learnerSourceLocale) || !TOKEN_RE.test(releaseId) || !(CANONICAL_RELEASE_SURFACES as readonly string[]).includes(surface)) throw new Error('course_surface_request_invalid');
  return Object.freeze({ studyTarget, learnerSourceLocale, releaseId, surface });
}

export function resolveIndexedCourseUnits(index: unknown, request: CourseSurfaceBundleRequest): readonly IndexedCourseUnit[] {
  if (!isRecord(index) || index.releaseId !== request.releaseId || index.studyTarget !== request.studyTarget || index.learnerSourceLocale !== request.learnerSourceLocale || index.surface !== request.surface) throw new Error('course_surface_index_identity_mismatch');
  if (!Array.isArray(index.units) || index.units.length < 1 || index.units.length > 100) throw new Error('course_surface_index_invalid');
  const seen = new Set<number>();
  const units: IndexedCourseUnit[] = [];
  for (const value of index.units) {
    if (!isRecord(value)) throw new Error('course_surface_index_invalid');
    const lessonId = Number(value.lessonId);
    const expectedPath = `course-releases/${request.releaseId}/${request.surface}/${lessonId}.json`;
    if (!Number.isInteger(lessonId) || lessonId < 1 || lessonId > 100 || typeof value.objectPath !== 'string' || value.objectPath !== expectedPath || typeof value.contentHash !== 'string' || !HASH_RE.test(value.contentHash) || typeof value.objectGeneration !== 'string' || !value.objectGeneration.trim()) throw new Error('course_surface_index_invalid');
    const engineResolved = value.engineResolved === undefined ? 'legacy' : String(value.engineResolved);
    const configRevision = value.configRevision === undefined ? 0 : Number(value.configRevision);
    const comparatorVersion = value.comparatorVersion === undefined ? '' : String(value.comparatorVersion);
    if (!['legacy', 'stage'].includes(engineResolved) || !Number.isSafeInteger(configRevision) || configRevision < 0 || (engineResolved === 'stage' && comparatorVersion !== 'arena-parity-v1')) throw new Error('course_surface_index_engine_provenance_invalid');
    if (seen.has(lessonId)) throw new Error('course_surface_index_duplicate_lesson');
    seen.add(lessonId);
    units.push(Object.freeze({ lessonId, objectPath: value.objectPath, contentHash: value.contentHash, objectGeneration: value.objectGeneration, engineResolved: engineResolved as 'legacy' | 'stage', configRevision, comparatorVersion }));
  }
  return Object.freeze(units.sort((a, b) => a.lessonId - b.lessonId));
}

export function resolveIndexedCourseUnit(index: unknown, request: CourseSurfaceEntryRequest): IndexedCourseUnit {
  const matched = resolveIndexedCourseUnits(index, request).find((unit) => unit.lessonId === request.lessonId) ?? null;
  if (!matched) throw new Error('course_surface_entry_not_found');
  return matched;
}

export function parseHashedJsonBytes(bytes: Buffer, expectedHash: string): unknown {
  const actualHash = createHash('sha256').update(bytes).digest('hex');
  if (!HASH_RE.test(expectedHash) || actualHash !== expectedHash.toLowerCase()) throw new Error('course_surface_hash_mismatch');
  try { return JSON.parse(bytes.toString('utf8')) as unknown; } catch { throw new Error('course_surface_json_invalid'); }
}
