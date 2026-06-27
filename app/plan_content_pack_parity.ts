import {
  isPlanContentLocaleGateStatus,
  isPlanContentReviewStatus,
  type PlanContentLocaleGateStatus,
  type PlanContentReviewStatus,
} from './plan_content_pack_index';

export const PLAN_CONTENT_PARITY_REPORT_SCHEMA_VERSION = 'plan-content-parity-report-v1' as const;

export const PLAN_CONTENT_PARITY_VERDICTS = [
  'hold',
  'shadow_parity_passed',
  'activation_candidate',
] as const;

export const PLAN_CONTENT_ADAPTER_SURFACES = [
  'intro_screens',
  'phrases',
  'vocabulary_cards',
] as const;

export const PLAN_CONTENT_FALLBACK_DECISIONS = [
  'authored_day',
  'template_fallback',
  'blocked',
] as const;

export type PlanContentParityVerdict = (typeof PLAN_CONTENT_PARITY_VERDICTS)[number];
export type PlanContentAdapterSurface = (typeof PLAN_CONTENT_ADAPTER_SURFACES)[number];
export type PlanContentFallbackDecision = (typeof PLAN_CONTENT_FALLBACK_DECISIONS)[number];

export type PlanContentParityRowRef = {
  planId: string;
  dayIndex: number;
  detail: string;
};

export type PlanContentHashMismatch = PlanContentParityRowRef & {
  expectedHash: string;
  actualHash: string;
};

export type PlanContentAdapterMismatch = PlanContentParityRowRef & {
  adapter: PlanContentAdapterSurface;
};

export type PlanContentFallbackMismatch = PlanContentParityRowRef & {
  expectedDecision: PlanContentFallbackDecision;
  actualDecision: PlanContentFallbackDecision;
};

export type PlanContentReviewerSummary = {
  reviewedRowCount: number;
  reviewStatusCounts: Record<PlanContentReviewStatus, number>;
  localeGateStatusCounts: Record<PlanContentLocaleGateStatus, number>;
};

export type PlanContentParityReport = {
  schemaVersion: typeof PLAN_CONTENT_PARITY_REPORT_SCHEMA_VERSION;
  manifestId: string;
  manifestHash: string;
  sourceSnapshotId: string;
  generatedAt: string;
  comparedPlanDayCount: number;
  addedShadowOnlyRows: PlanContentParityRowRef[];
  missingRows: PlanContentParityRowRef[];
  hashMismatches: PlanContentHashMismatch[];
  adapterOutputMismatches: PlanContentAdapterMismatch[];
  fallbackDecisionMismatches: PlanContentFallbackMismatch[];
  reviewerSummary: PlanContentReviewerSummary;
  verdict: PlanContentParityVerdict;
};

export type PlanContentParityReportValidationResult = {
  ok: boolean;
  errors: string[];
};

const SHA256_RE = /^[a-f0-9]{64}$/i;
const TOKEN_RE = /^[A-Za-z0-9._:-]+$/;
const PLAN_ID_RE = /^[A-Za-z0-9_-]+$/;

export function isPlanContentParityVerdict(value: unknown): value is PlanContentParityVerdict {
  return typeof value === 'string' && PLAN_CONTENT_PARITY_VERDICTS.includes(value as PlanContentParityVerdict);
}

export function isPlanContentAdapterSurface(value: unknown): value is PlanContentAdapterSurface {
  return typeof value === 'string' && PLAN_CONTENT_ADAPTER_SURFACES.includes(value as PlanContentAdapterSurface);
}

export function isPlanContentFallbackDecision(value: unknown): value is PlanContentFallbackDecision {
  return typeof value === 'string' && PLAN_CONTENT_FALLBACK_DECISIONS.includes(value as PlanContentFallbackDecision);
}

export function validatePlanContentParityReport(
  value: unknown,
): PlanContentParityReportValidationResult {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return { ok: false, errors: ['parity report must be an object'] };
  }

  validateSchemaVersion(value.schemaVersion, errors);
  validateToken('manifestId', value.manifestId, errors);
  validateSha256('manifestHash', value.manifestHash, errors);
  validateToken('sourceSnapshotId', value.sourceSnapshotId, errors);
  validateIsoDate('generatedAt', value.generatedAt, errors);
  validatePositiveCount('comparedPlanDayCount', value.comparedPlanDayCount, errors);
  validateRowRefs('addedShadowOnlyRows', value.addedShadowOnlyRows, errors);
  validateRowRefs('missingRows', value.missingRows, errors);
  validateHashMismatches(value.hashMismatches, errors);
  validateAdapterMismatches(value.adapterOutputMismatches, errors);
  validateFallbackMismatches(value.fallbackDecisionMismatches, errors);
  validateReviewerSummary(value.reviewerSummary, value, errors);
  validateVerdict(value.verdict, value, errors);

  return { ok: errors.length === 0, errors };
}

export function assertPlanContentParityReport(value: unknown): PlanContentParityReport {
  const result = validatePlanContentParityReport(value);
  if (!result.ok) {
    throw new Error('Invalid PlanContentParityReport: ' + result.errors.join('; '));
  }
  return value as PlanContentParityReport;
}

function validateSchemaVersion(value: unknown, errors: string[]): void {
  if (value !== PLAN_CONTENT_PARITY_REPORT_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${PLAN_CONTENT_PARITY_REPORT_SCHEMA_VERSION}`);
  }
}

function validateToken(field: string, value: unknown, errors: string[]): void {
  if (typeof value !== 'string' || !value.trim() || !TOKEN_RE.test(value)) {
    errors.push(`${field} must be a non-empty stable token`);
  }
}

function validateSha256(field: string, value: unknown, errors: string[]): void {
  if (typeof value !== 'string' || !SHA256_RE.test(value)) {
    errors.push(`${field} must be a 64 character hex digest`);
  }
}

function validateIsoDate(field: string, value: unknown, errors: string[]): void {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    errors.push(`${field} must be an ISO-compatible timestamp`);
  }
}

function validatePositiveCount(field: string, value: unknown, errors: string[]): void {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    errors.push(`${field} must be a positive safe integer`);
  }
}

function validateNonNegativeCount(field: string, value: unknown, errors: string[]): void {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    errors.push(`${field} must be a non-negative safe integer`);
  }
}

function validateRowRefs(field: string, value: unknown, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push(`${field} must be an array`);
    return;
  }

  for (const [index, row] of value.entries()) {
    validateRowRef(`${field}[${index}]`, row, errors);
  }
}

function validateRowRef(prefix: string, value: unknown, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${prefix} must be an object`);
    return;
  }
  validatePlanId(`${prefix}.planId`, value.planId, errors);
  validateDayIndex(`${prefix}.dayIndex`, value.dayIndex, errors);
  validateDetail(`${prefix}.detail`, value.detail, errors);
}

function validateHashMismatches(value: unknown, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push('hashMismatches must be an array');
    return;
  }

  for (const [index, mismatch] of value.entries()) {
    const prefix = `hashMismatches[${index}]`;
    validateRowRef(prefix, mismatch, errors);
    if (!isRecord(mismatch)) continue;
    validateSha256(`${prefix}.expectedHash`, mismatch.expectedHash, errors);
    validateSha256(`${prefix}.actualHash`, mismatch.actualHash, errors);
  }
}

function validateAdapterMismatches(value: unknown, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push('adapterOutputMismatches must be an array');
    return;
  }

  for (const [index, mismatch] of value.entries()) {
    const prefix = `adapterOutputMismatches[${index}]`;
    validateRowRef(prefix, mismatch, errors);
    if (!isRecord(mismatch)) continue;
    if (!isPlanContentAdapterSurface(mismatch.adapter)) {
      errors.push(`${prefix}.adapter must be a known adapter surface`);
    }
  }
}

function validateFallbackMismatches(value: unknown, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push('fallbackDecisionMismatches must be an array');
    return;
  }

  for (const [index, mismatch] of value.entries()) {
    const prefix = `fallbackDecisionMismatches[${index}]`;
    validateRowRef(prefix, mismatch, errors);
    if (!isRecord(mismatch)) continue;
    if (!isPlanContentFallbackDecision(mismatch.expectedDecision)) {
      errors.push(`${prefix}.expectedDecision must be a known fallback decision`);
    }
    if (!isPlanContentFallbackDecision(mismatch.actualDecision)) {
      errors.push(`${prefix}.actualDecision must be a known fallback decision`);
    }
  }
}

function validateReviewerSummary(
  value: unknown,
  report: Record<string, unknown>,
  errors: string[],
): void {
  if (!isRecord(value)) {
    errors.push('reviewerSummary must be an object');
    return;
  }

  validateNonNegativeCount('reviewerSummary.reviewedRowCount', value.reviewedRowCount, errors);
  validateStatusCounts('reviewerSummary.reviewStatusCounts', value.reviewStatusCounts, isPlanContentReviewStatus, errors);
  validateStatusCounts('reviewerSummary.localeGateStatusCounts', value.localeGateStatusCounts, isPlanContentLocaleGateStatus, errors);

  const reviewedRowCount = typeof value.reviewedRowCount === 'number' ? value.reviewedRowCount : null;
  const reviewStatusTotal = sumStatusCounts(value.reviewStatusCounts);
  const localeGateTotal = sumStatusCounts(value.localeGateStatusCounts);
  if (reviewedRowCount !== null && reviewStatusTotal !== null && reviewStatusTotal !== reviewedRowCount) {
    errors.push('reviewerSummary.reviewStatusCounts must sum to reviewedRowCount');
  }
  if (reviewedRowCount !== null && localeGateTotal !== null && localeGateTotal !== reviewedRowCount) {
    errors.push('reviewerSummary.localeGateStatusCounts must sum to reviewedRowCount');
  }

  if (report.verdict === 'activation_candidate') {
    const compared = typeof report.comparedPlanDayCount === 'number' ? report.comparedPlanDayCount : null;
    if (reviewedRowCount !== null && compared !== null && reviewedRowCount !== compared) {
      errors.push('reviewerSummary.reviewedRowCount must equal comparedPlanDayCount for activation_candidate');
    }
    if (countFor(value.reviewStatusCounts, 'approved') !== compared) {
      errors.push('reviewerSummary.reviewStatusCounts.approved must equal comparedPlanDayCount for activation_candidate');
    }
    if (hasAnyStatusCount(value.reviewStatusCounts, ['shadow', 'hold', 'rejected'])) {
      errors.push('reviewerSummary.reviewStatusCounts must not include shadow/hold/rejected for activation_candidate');
    }
    if (countFor(value.localeGateStatusCounts, 'passed') !== compared) {
      errors.push('reviewerSummary.localeGateStatusCounts.passed must equal comparedPlanDayCount for activation_candidate');
    }
    if (hasAnyStatusCount(value.localeGateStatusCounts, ['hold', 'failed'])) {
      errors.push('reviewerSummary.localeGateStatusCounts must not include hold/failed for activation_candidate');
    }
  }
}

function validateStatusCounts(
  field: string,
  value: unknown,
  isKnownStatus: (status: unknown) => boolean,
  errors: string[],
): void {
  if (!isRecord(value)) {
    errors.push(`${field} must be an object`);
    return;
  }

  for (const [status, count] of Object.entries(value)) {
    if (!isKnownStatus(status)) {
      errors.push(`${field}.${status} must be a known status`);
    }
    validateNonNegativeCount(`${field}.${status}`, count, errors);
  }
}

function validateVerdict(
  value: unknown,
  report: Record<string, unknown>,
  errors: string[],
): void {
  if (!isPlanContentParityVerdict(value)) {
    errors.push('verdict must be a known parity verdict');
    return;
  }

  if (value === 'shadow_parity_passed' && hasBlockingParityMismatch(report)) {
    errors.push('verdict shadow_parity_passed requires no missing/hash/adapter/fallback mismatches');
  }

  if (value === 'activation_candidate') {
    if (arrayLength(report.addedShadowOnlyRows) > 0) {
      errors.push('verdict activation_candidate requires no added shadow-only rows');
    }
    if (hasBlockingParityMismatch(report)) {
      errors.push('verdict activation_candidate requires no parity mismatches');
    }
  }
}

function hasBlockingParityMismatch(report: Record<string, unknown>): boolean {
  return (
    arrayLength(report.missingRows) > 0 ||
    arrayLength(report.hashMismatches) > 0 ||
    arrayLength(report.adapterOutputMismatches) > 0 ||
    arrayLength(report.fallbackDecisionMismatches) > 0
  );
}

function arrayLength(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
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

function validateDetail(field: string, value: unknown, errors: string[]): void {
  if (typeof value !== 'string' || !value.trim()) {
    errors.push(`${field} must be a non-empty detail`);
  }
}

function sumStatusCounts(value: unknown): number | null {
  if (!isRecord(value)) return null;
  return Object.values(value).reduce<number | null>((total, count) => {
    if (total === null || typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) {
      return null;
    }
    return total + count;
  }, 0);
}

function countFor(value: unknown, status: string): number | null {
  if (!isRecord(value)) return null;
  const count = value[status];
  return typeof count === 'number' && Number.isSafeInteger(count) && count >= 0 ? count : null;
}

function hasAnyStatusCount(value: unknown, statuses: readonly string[]): boolean {
  if (!isRecord(value)) return false;
  return statuses.some((status) => {
    const count = value[status];
    return typeof count === 'number' && count > 0;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __PlanContentPackParityRouteShim() {
  return null;
}
