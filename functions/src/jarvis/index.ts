export {
  buildDecision,
  decisionConfidence,
  normalizeEvidence,
  JARVIS_DECISION_SCHEMA_VERSION,
  MAX_EVIDENCE_AGE_MS,
} from './decision';
export type {
  BuildDecisionInput,
  Decision,
  DecisionMode,
  DecisionOption,
  DecisionStatus,
  DecisionTrigger,
  Department,
  Evidence,
  EvidenceInput,
  EvidenceState,
  RiskLevel,
} from './decision';

export { aggregateQualityRows, buildQualityEvidence, QUALITY_REPORT_COLLECTIONS } from './quality_source_reader';
export type { QualityAggregate, QualityRawRow, QualityReportCollection, QualitySourceFetchResult } from './quality_source_reader';

export { fetchQualitySource, MAX_QUALITY_ROWS_PER_SOURCE, QUALITY_LOOKBACK_MS } from './quality_firestore_fetcher';
export type { FetchQualitySourceInput, FetchQualitySourceResult } from './quality_firestore_fetcher';

export { runQualityDepartment } from './quality_department';
export type { RunQualityDepartmentInput, RunQualityDepartmentResult } from './quality_department';

export { buildQualitySnapshot } from './quality_snapshot';
export type { BuildQualitySnapshotInput, QualityFetcher, QualityFetcherMap, QualitySnapshot } from './quality_snapshot';

export { jarvisGetQualitySnapshot } from './callables';

export { aggregateMoneyRows, buildMoneyEvidence, MONEY_REPORT_COLLECTIONS } from './money_source_reader';
export type { MoneyAggregate, MoneyRawRow, MoneyReportCollection, MoneySourceFetchResult } from './money_source_reader';

export { fetchMoneySource, MAX_MONEY_ROWS_PER_SOURCE, MONEY_LOOKBACK_MS } from './money_firestore_fetcher';
export type { FetchMoneySourceInput, FetchMoneySourceResult } from './money_firestore_fetcher';

export { runMoneyDepartment } from './money_department';
export type { RunMoneyDepartmentInput, RunMoneyDepartmentResult } from './money_department';

export { buildMoneySnapshot } from './money_snapshot';
export type { BuildMoneySnapshotInput, MoneyFetcher, MoneyFetcherMap, MoneySnapshot } from './money_snapshot';

export { jarvisGetMoneySnapshot } from './money_callables';

export { aggregateGrowthRows, buildGrowthEvidence, GROWTH_REPORT_COLLECTIONS } from './growth_source_reader';
export type { GrowthAggregate, GrowthRawRow, GrowthReportCollection, GrowthSourceFetchResult } from './growth_source_reader';

export { fetchGrowthSource, MAX_GROWTH_ROWS_PER_SOURCE, GROWTH_LOOKBACK_MS } from './growth_firestore_fetcher';
export type { FetchGrowthSourceInput, FetchGrowthSourceResult } from './growth_firestore_fetcher';

export { runGrowthDepartment } from './growth_department';
export type { RunGrowthDepartmentInput, RunGrowthDepartmentResult } from './growth_department';

export { buildGrowthSnapshot } from './growth_snapshot';
export type { BuildGrowthSnapshotInput, GrowthFetcher, GrowthFetcherMap, GrowthSnapshot } from './growth_snapshot';

export { jarvisGetGrowthSnapshot } from './growth_callables';

export { classifyAppTier, APP_TIER_THRESHOLDS, tierThresholdMultiplier, tierAbsoluteThresholdMultiplier } from './app_tier';
export type { AppTier } from './app_tier';

export { fetchActiveUserCount, ACTIVE_USER_WINDOW_MS } from './app_tier_reader';
export type { FetchActiveUserCountInput, FetchActiveUserCountResult, ActiveUserCountState } from './app_tier_reader';

export { resolveAppTier } from './app_tier_resolver';

export { buildAllDepartmentsSnapshot } from './all_departments_snapshot';
export type { AllDepartmentsSnapshot, BuildAllDepartmentsSnapshotInput, DepartmentSnapshotLike } from './all_departments_snapshot';

export { jarvisGetAllDecisions } from './all_departments_callables';
