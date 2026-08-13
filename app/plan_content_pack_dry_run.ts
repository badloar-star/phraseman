import {
  contentDayToLessonIntroScreens,
  contentDayToLessonPhrases,
  contentVocabularyToRuntimeCards,
} from './plan_content_runtime_adapter';
import {
  PLAN_CONTENT_PARITY_REPORT_SCHEMA_VERSION,
  validatePlanContentParityReport,
  type PlanContentAdapterMismatch,
  type PlanContentAdapterSurface,
  type PlanContentParityReport,
  type PlanContentParityReportValidationResult,
  type PlanContentParityVerdict,
} from './plan_content_pack_parity';
import { listAuthoredPlanContentDays } from './plan_content_registry';
import type { PlanContentDay } from './plan_content_schema';

export type PlanContentDryRunParityVerdict = Exclude<
  PlanContentParityVerdict,
  'activation_candidate'
>;

export type PlanContentDryRunParityReportOptions = {
  manifestId: string;
  manifestHash: string;
  sourceSnapshotId: string;
  generatedAt?: string;
  verdict?: PlanContentDryRunParityVerdict;
};

export type PlanContentDryRunParityReportResult = {
  report: PlanContentParityReport;
  validation: PlanContentParityReportValidationResult;
};

export function buildBundledPlanContentDryRunParityReport(
  options: PlanContentDryRunParityReportOptions,
): PlanContentParityReport {
  const days = listAuthoredPlanContentDays();
  const adapterOutputMismatches = collectAdapterOutputMismatches(days);
  const comparedPlanDayCount = days.length;

  return {
    schemaVersion: PLAN_CONTENT_PARITY_REPORT_SCHEMA_VERSION,
    manifestId: options.manifestId,
    manifestHash: options.manifestHash,
    sourceSnapshotId: options.sourceSnapshotId,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    comparedPlanDayCount,
    addedShadowOnlyRows: [],
    missingRows: [],
    hashMismatches: [],
    adapterOutputMismatches,
    fallbackDecisionMismatches: [],
    reviewerSummary: {
      reviewedRowCount: comparedPlanDayCount,
      reviewStatusCounts: {
        approved: 0,
        shadow: comparedPlanDayCount,
        hold: 0,
        rejected: 0,
      },
      localeGateStatusCounts: {
        passed: 0,
        hold: comparedPlanDayCount,
        failed: 0,
      },
    },
    verdict: resolveDryRunVerdict(options.verdict, adapterOutputMismatches),
  };
}

export function validateBundledPlanContentDryRunParityReport(
  options: PlanContentDryRunParityReportOptions,
): PlanContentDryRunParityReportResult {
  const report = buildBundledPlanContentDryRunParityReport(options);
  return {
    report,
    validation: validatePlanContentParityReport(report),
  };
}

function resolveDryRunVerdict(
  requestedVerdict: unknown,
  adapterOutputMismatches: readonly PlanContentAdapterMismatch[],
): PlanContentDryRunParityVerdict {
  if (requestedVerdict === 'shadow_parity_passed' && adapterOutputMismatches.length === 0) {
    return 'shadow_parity_passed';
  }
  return 'hold';
}

function collectAdapterOutputMismatches(
  days: readonly PlanContentDay[],
): PlanContentAdapterMismatch[] {
  return days.flatMap((day) => [
    ...checkAdapterCount(day, 'intro_screens', () => contentDayToLessonIntroScreens(day).length, day.intro.length),
    ...checkAdapterCount(day, 'phrases', () => contentDayToLessonPhrases(day).length, day.phrases.length),
    ...checkAdapterCount(day, 'vocabulary_cards', () => contentVocabularyToRuntimeCards(day).length, day.vocabulary.length),
  ]);
}

function checkAdapterCount(
  day: PlanContentDay,
  adapter: PlanContentAdapterSurface,
  actualCount: () => number,
  expectedCount: number,
): PlanContentAdapterMismatch[] {
  try {
    const actual = actualCount();
    if (actual === expectedCount) return [];
    return [{
      planId: day.planId,
      dayIndex: day.dayIndex,
      detail: `${adapter} adapter produced ${actual} rows, expected ${expectedCount}`,
      adapter,
    }];
  } catch (error) {
    return [{
      planId: day.planId,
      dayIndex: day.dayIndex,
      detail: `${adapter} adapter threw: ${error instanceof Error ? error.message : String(error)}`,
      adapter,
    }];
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __PlanContentPackDryRunRouteShim() {
  return null;
}
