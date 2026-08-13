import { normalizeSourceLocale, type SourceLocale } from './source_locales';
import { isProductionStudyTarget, type ProductionStudyTarget } from './study_target';

export const PLAN_CONTENT_INDEX_SCHEMA_VERSION = 'plan-content-index-v1' as const;
export const PLAN_CONTENT_DAY_SCHEMA_VERSION = 'plan-content-day-v1' as const;

export const PLAN_CONTENT_REVIEW_STATUSES = [
  'approved',
  'shadow',
  'hold',
  'rejected',
] as const;

export const PLAN_CONTENT_LOCALE_GATE_STATUSES = [
  'passed',
  'hold',
  'failed',
] as const;

export type PlanContentReviewStatus = (typeof PLAN_CONTENT_REVIEW_STATUSES)[number];
export type PlanContentLocaleGateStatus = (typeof PLAN_CONTENT_LOCALE_GATE_STATUSES)[number];

export type PlanContentPackIndexEntry = {
  planId: string;
  dayIndex: number;
  path: string;
  contentHash: string;
  sourceLocale: SourceLocale;
  studyTarget: ProductionStudyTarget;
  reviewStatus: PlanContentReviewStatus;
  localeGateStatus: PlanContentLocaleGateStatus;
  schemaVersion: typeof PLAN_CONTENT_DAY_SCHEMA_VERSION;
};

export type PlanContentPackIndex = {
  schemaVersion: typeof PLAN_CONTENT_INDEX_SCHEMA_VERSION;
  studyTarget: ProductionStudyTarget;
  sourceLocale: SourceLocale;
  contentVersion: string;
  entries: PlanContentPackIndexEntry[];
};

export type PlanContentPackIndexValidationOptions = {
  requireActivationReady?: boolean;
};

export type PlanContentPackIndexValidationResult = {
  ok: boolean;
  errors: string[];
};

const SHA256_RE = /^[a-f0-9]{64}$/i;
const VERSION_RE = /^[A-Za-z0-9._-]+$/;
const PLAN_ID_RE = /^[A-Za-z0-9_-]+$/;
const SAFE_JSON_PATH_RE = /^[A-Za-z0-9._/-]+\.json$/;

export function isPlanContentReviewStatus(value: unknown): value is PlanContentReviewStatus {
  return typeof value === 'string' && PLAN_CONTENT_REVIEW_STATUSES.includes(value as PlanContentReviewStatus);
}

export function isPlanContentLocaleGateStatus(value: unknown): value is PlanContentLocaleGateStatus {
  return typeof value === 'string' && PLAN_CONTENT_LOCALE_GATE_STATUSES.includes(value as PlanContentLocaleGateStatus);
}

export function validatePlanContentPackIndex(
  value: unknown,
  options: PlanContentPackIndexValidationOptions = {},
): PlanContentPackIndexValidationResult {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return { ok: false, errors: ['index must be an object'] };
  }

  validateIndexSchemaVersion(value.schemaVersion, errors);
  validateProductionStudyTarget('studyTarget', value.studyTarget, errors);
  validateSourceLocale('sourceLocale', value.sourceLocale, errors);
  validateVersion('contentVersion', value.contentVersion, errors);
  validateEntries(value.entries, value, options, errors);

  return { ok: errors.length === 0, errors };
}

export function assertPlanContentPackIndex(value: unknown): PlanContentPackIndex {
  const result = validatePlanContentPackIndex(value);
  if (!result.ok) {
    throw new Error('Invalid PlanContentPackIndex: ' + result.errors.join('; '));
  }
  return value as PlanContentPackIndex;
}

function validateEntries(
  value: unknown,
  index: Record<string, unknown>,
  options: PlanContentPackIndexValidationOptions,
  errors: string[],
): void {
  if (!Array.isArray(value)) {
    errors.push('entries must be an array');
    return;
  }

  const seenKeys = new Set<string>();
  for (const [entryIndex, entry] of value.entries()) {
    const prefix = `entries[${entryIndex}]`;
    if (!isRecord(entry)) {
      errors.push(`${prefix} must be an object`);
      continue;
    }

    validatePlanId(`${prefix}.planId`, entry.planId, errors);
    validateDayIndex(`${prefix}.dayIndex`, entry.dayIndex, errors);
    validateSafeJsonPath(`${prefix}.path`, entry.path, errors);
    validateSha256(`${prefix}.contentHash`, entry.contentHash, errors);
    validateEntrySourceLocale(prefix, entry.sourceLocale, index.sourceLocale, errors);
    validateEntryStudyTarget(prefix, entry.studyTarget, index.studyTarget, errors);
    validateReviewStatus(`${prefix}.reviewStatus`, entry.reviewStatus, options, errors);
    validateLocaleGateStatus(`${prefix}.localeGateStatus`, entry.localeGateStatus, options, errors);
    validateDaySchemaVersion(`${prefix}.schemaVersion`, entry.schemaVersion, errors);

    if (typeof entry.planId === 'string' && typeof entry.dayIndex === 'number' && Number.isSafeInteger(entry.dayIndex)) {
      const key = `${entry.planId}:${entry.dayIndex}`;
      if (seenKeys.has(key)) {
        errors.push(`${prefix} duplicates planId/dayIndex ${key}`);
      }
      seenKeys.add(key);
    }
  }
}

function validateIndexSchemaVersion(value: unknown, errors: string[]): void {
  if (value !== PLAN_CONTENT_INDEX_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${PLAN_CONTENT_INDEX_SCHEMA_VERSION}`);
  }
}

function validateDaySchemaVersion(field: string, value: unknown, errors: string[]): void {
  if (value !== PLAN_CONTENT_DAY_SCHEMA_VERSION) {
    errors.push(`${field} must be ${PLAN_CONTENT_DAY_SCHEMA_VERSION}`);
  }
}

function validateProductionStudyTarget(field: string, value: unknown, errors: string[]): void {
  if (!isProductionStudyTarget(value)) {
    errors.push(`${field} must be production studyTarget en`);
  }
}

function validateSourceLocale(field: string, value: unknown, errors: string[]): void {
  if (typeof value !== 'string' || normalizeSourceLocale(value) !== value) {
    errors.push(`${field} must be an explicit normalized SourceLocale`);
  }
}

function validateEntrySourceLocale(
  prefix: string,
  value: unknown,
  indexSourceLocale: unknown,
  errors: string[],
): void {
  validateSourceLocale(`${prefix}.sourceLocale`, value, errors);
  if (value !== indexSourceLocale) {
    errors.push(`${prefix}.sourceLocale must match index sourceLocale`);
  }
}

function validateEntryStudyTarget(
  prefix: string,
  value: unknown,
  indexStudyTarget: unknown,
  errors: string[],
): void {
  validateProductionStudyTarget(`${prefix}.studyTarget`, value, errors);
  if (value !== indexStudyTarget) {
    errors.push(`${prefix}.studyTarget must match index studyTarget`);
  }
}

function validateVersion(field: string, value: unknown, errors: string[]): void {
  if (typeof value !== 'string' || !value.trim() || !VERSION_RE.test(value)) {
    errors.push(`${field} must be a non-empty version token`);
  }
}

function validatePlanId(field: string, value: unknown, errors: string[]): void {
  if (typeof value !== 'string' || !value.trim() || !PLAN_ID_RE.test(value)) {
    errors.push(`${field} must be a stable plan id`);
  }
}

function validateDayIndex(field: string, value: unknown, errors: string[]): void {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    errors.push(`${field} must be a positive safe integer`);
  }
}

function validateSafeJsonPath(field: string, value: unknown, errors: string[]): void {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    !SAFE_JSON_PATH_RE.test(value) ||
    value.includes('..') ||
    value.includes('\\') ||
    value.includes('://') ||
    value.startsWith('/') ||
    value.startsWith('\\')
  ) {
    errors.push(`${field} must be a safe relative json path`);
  }
}

function validateSha256(field: string, value: unknown, errors: string[]): void {
  if (typeof value !== 'string' || !SHA256_RE.test(value)) {
    errors.push(`${field} must be a 64 character hex digest`);
  }
}

function validateReviewStatus(
  field: string,
  value: unknown,
  options: PlanContentPackIndexValidationOptions,
  errors: string[],
): void {
  if (!isPlanContentReviewStatus(value)) {
    errors.push(`${field} must be a known review status`);
    return;
  }
  if (options.requireActivationReady && value !== 'approved') {
    errors.push(`${field} must be approved for activation`);
  }
}

function validateLocaleGateStatus(
  field: string,
  value: unknown,
  options: PlanContentPackIndexValidationOptions,
  errors: string[],
): void {
  if (!isPlanContentLocaleGateStatus(value)) {
    errors.push(`${field} must be a known locale gate status`);
    return;
  }
  if (options.requireActivationReady && value !== 'passed') {
    errors.push(`${field} must be passed for activation`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __PlanContentPackIndexRouteShim() {
  return null;
}
