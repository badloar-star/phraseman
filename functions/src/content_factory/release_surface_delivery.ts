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

export interface IndexedCourseUnit {
  readonly lessonId: number;
  readonly objectPath: string;
  readonly contentHash: string;
  readonly objectGeneration: string;
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

export function resolveIndexedCourseUnit(index: unknown, request: CourseSurfaceEntryRequest): IndexedCourseUnit {
  if (!isRecord(index) || index.releaseId !== request.releaseId || index.studyTarget !== request.studyTarget || index.learnerSourceLocale !== request.learnerSourceLocale || index.surface !== request.surface) throw new Error('course_surface_index_identity_mismatch');
  if (!Array.isArray(index.units)) throw new Error('course_surface_index_invalid');
  const seen = new Set<number>();
  let matched: IndexedCourseUnit | null = null;
  for (const value of index.units) {
    if (!isRecord(value)) throw new Error('course_surface_index_invalid');
    const lessonId = Number(value.lessonId);
    const expectedPath = `course-releases/${request.releaseId}/${request.surface}/${lessonId}.json`;
    if (!Number.isInteger(lessonId) || lessonId < 1 || lessonId > 100 || typeof value.objectPath !== 'string' || value.objectPath !== expectedPath || typeof value.contentHash !== 'string' || !HASH_RE.test(value.contentHash) || typeof value.objectGeneration !== 'string' || !value.objectGeneration.trim()) throw new Error('course_surface_index_invalid');
    if (seen.has(lessonId)) throw new Error('course_surface_index_duplicate_lesson');
    seen.add(lessonId);
    const unit = Object.freeze({ lessonId, objectPath: value.objectPath, contentHash: value.contentHash, objectGeneration: value.objectGeneration });
    if (lessonId === request.lessonId) matched = unit;
  }
  if (!matched) throw new Error('course_surface_entry_not_found');
  return matched;
}

export function parseHashedJsonBytes(bytes: Buffer, expectedHash: string): unknown {
  const actualHash = createHash('sha256').update(bytes).digest('hex');
  if (!HASH_RE.test(expectedHash) || actualHash !== expectedHash.toLowerCase()) throw new Error('course_surface_hash_mismatch');
  try { return JSON.parse(bytes.toString('utf8')) as unknown; } catch { throw new Error('course_surface_json_invalid'); }
}
