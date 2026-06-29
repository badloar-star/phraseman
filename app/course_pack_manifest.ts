import { normalizeSourceLocale, type SourceLocale } from './source_locales';
import { isStudyTarget, type StudyTarget } from './study_target';

export const COURSE_PACK_SCHEMA_VERSION = 'course-pack-v1' as const;

export const COURSE_PACK_SURFACES = [
  'lesson',
  'lesson_intro',
  'quiz',
  'plan_content',
  'audio_metadata',
  'daily_phrase',
  'flashcard',
  'personal_practice',
  'thematic_pack',
] as const;

export type CoursePackSurface = (typeof COURSE_PACK_SURFACES)[number];

export const COURSE_PACK_CACHE_STATES = [
  'missing',
  'downloading',
  'ready',
  'corrupt',
  'stale',
  'offline_fallback',
] as const;

export type CoursePackCacheState = (typeof COURSE_PACK_CACHE_STATES)[number];

export type CoursePackDependency = {
  packId: string;
  minContentVersion: string;
};

export type CoursePackManifest = {
  packId: string;
  studyTarget: StudyTarget;
  sourceLocale: SourceLocale;
  surface: CoursePackSurface;
  schemaVersion: string;
  contentVersion: string;
  minAppVersion: string;
  sha256: string;
  byteSize: number;
  createdAt: string;
  dependencies: CoursePackDependency[];
  entryIndex: string;
};

export type CoursePackManifestValidationResult = {
  ok: boolean;
  errors: string[];
};

export type CoursePackCacheKeyParts = Pick<
  CoursePackManifest,
  'studyTarget' | 'sourceLocale' | 'surface' | 'schemaVersion' | 'contentVersion' | 'sha256'
>;

const SHA256_RE = /^[a-f0-9]{64}$/i;
const VERSION_RE = /^[A-Za-z0-9._-]+$/;
const PACK_ID_RE = /^[A-Za-z0-9._:-]+$/;
const ENTRY_INDEX_RE = /^[A-Za-z0-9._/-]+$/;

export function isCoursePackSurface(value: unknown): value is CoursePackSurface {
  return typeof value === 'string' && COURSE_PACK_SURFACES.includes(value as CoursePackSurface);
}

export function isCoursePackCacheState(value: unknown): value is CoursePackCacheState {
  return typeof value === 'string' && COURSE_PACK_CACHE_STATES.includes(value as CoursePackCacheState);
}

export function buildCoursePackCacheKey(parts: CoursePackCacheKeyParts): string {
  validateCoursePackCacheKeyParts(parts);
  return [
    parts.studyTarget,
    parts.sourceLocale,
    parts.surface,
    parts.schemaVersion,
    parts.contentVersion,
    parts.sha256.toLowerCase(),
  ].join('/');
}

export function validateCoursePackManifest(value: unknown): CoursePackManifestValidationResult {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return { ok: false, errors: ['manifest must be an object'] };
  }

  validatePackId(value.packId, errors);
  validateStudyTarget(value.studyTarget, errors);
  validateSourceLocale(value.sourceLocale, errors);
  validateSurface(value.surface, errors);
  validatePackIdentity(value, errors);
  validateVersion('schemaVersion', value.schemaVersion, errors);
  validateVersion('contentVersion', value.contentVersion, errors);
  validateVersion('minAppVersion', value.minAppVersion, errors);
  validateSha256(value.sha256, errors);
  validateByteSize(value.byteSize, errors);
  validateCreatedAt(value.createdAt, errors);
  validateDependencies(value.dependencies, errors);
  validateEntryIndex(value.entryIndex, errors);

  return { ok: errors.length === 0, errors };
}

export function assertCoursePackManifest(value: unknown): CoursePackManifest {
  const result = validateCoursePackManifest(value);
  if (!result.ok) {
    throw new Error('Invalid CoursePackManifest: ' + result.errors.join('; '));
  }
  return value as CoursePackManifest;
}

function validateCoursePackCacheKeyParts(parts: CoursePackCacheKeyParts): void {
  const result = validateCoursePackManifest({
    ...parts,
    packId: `${parts.studyTarget}.${parts.sourceLocale}.${parts.surface}.cache-key-validation`,
    minAppVersion: '0',
    byteSize: 1,
    createdAt: '1970-01-01T00:00:00.000Z',
    dependencies: [],
    entryIndex: 'index.json',
  });
  if (!result.ok) {
    throw new Error('Invalid CoursePack cache key parts: ' + result.errors.join('; '));
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validatePackId(value: unknown, errors: string[]): void {
  if (typeof value !== 'string' || !value.trim() || !PACK_ID_RE.test(value)) {
    errors.push('packId must be a non-empty stable id');
  }
}

function validatePackIdentity(value: Record<string, unknown>, errors: string[]): void {
  if (
    typeof value.packId !== 'string' ||
    typeof value.studyTarget !== 'string' ||
    typeof value.sourceLocale !== 'string' ||
    typeof value.surface !== 'string'
  ) {
    return;
  }
  const expectedPrefix = `${value.studyTarget}.${value.sourceLocale}.${value.surface}.`;
  if (!value.packId.startsWith(expectedPrefix)) {
    errors.push('packId must start with studyTarget.sourceLocale.surface');
  }
}

function validateStudyTarget(value: unknown, errors: string[]): void {
  if (!isStudyTarget(value)) {
    errors.push('studyTarget must be an explicit supported StudyTarget');
  }
}

function validateSourceLocale(value: unknown, errors: string[]): void {
  if (typeof value !== 'string' || normalizeSourceLocale(value) !== value) {
    errors.push('sourceLocale must be an explicit normalized SourceLocale');
  }
}

function validateSurface(value: unknown, errors: string[]): void {
  if (!isCoursePackSurface(value)) {
    errors.push('surface must be a known CoursePackSurface');
  }
}

function validateVersion(field: string, value: unknown, errors: string[]): void {
  if (typeof value !== 'string' || !value.trim() || !VERSION_RE.test(value)) {
    errors.push(`${field} must be a non-empty version token`);
  }
}

function validateSha256(value: unknown, errors: string[]): void {
  if (typeof value !== 'string' || !SHA256_RE.test(value)) {
    errors.push('sha256 must be a 64 character hex digest');
  }
}

function validateByteSize(value: unknown, errors: string[]): void {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    errors.push('byteSize must be a positive safe integer');
  }
}

function validateCreatedAt(value: unknown, errors: string[]): void {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    errors.push('createdAt must be an ISO-compatible timestamp');
  }
}

function validateDependencies(value: unknown, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push('dependencies must be an array');
    return;
  }
  for (const [index, dependency] of value.entries()) {
    if (!isRecord(dependency)) {
      errors.push(`dependencies[${index}] must be an object`);
      continue;
    }
    if (typeof dependency.packId !== 'string' || !dependency.packId.trim() || !PACK_ID_RE.test(dependency.packId)) {
      errors.push(`dependencies[${index}].packId must be a stable id`);
    }
    if (typeof dependency.minContentVersion !== 'string' || !VERSION_RE.test(dependency.minContentVersion)) {
      errors.push(`dependencies[${index}].minContentVersion must be a version token`);
    }
  }
}

function validateEntryIndex(value: unknown, errors: string[]): void {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    !ENTRY_INDEX_RE.test(value) ||
    value.includes('..') ||
    value.startsWith('/')
  ) {
    errors.push('entryIndex must be a safe relative index path');
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __CoursePackManifestRouteShim() {
  return null;
}
