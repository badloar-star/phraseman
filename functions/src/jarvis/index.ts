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

// ── Департамент «Контент» (четвёртый, завершает Р5) ────────────────────────
export { runContentDepartment, LOW_SCORE_THRESHOLD } from './content_department';
export { buildContentSnapshot } from './content_snapshot';
export { fetchContentSource, MAX_LESSON_STATS_DOCS, MIN_SAMPLES_FOR_VERDICT } from './content_firestore_fetcher';
export type { ContentLessonRow, FetchContentSourceResult } from './content_firestore_fetcher';

// ── Департамент «Платежи» (пятый): ловит сломанное в оплате ────────────────
export { runPaymentsDepartment, DENIAL_SPIKE_THRESHOLD } from './payments_department';
export { buildPaymentsSnapshot } from './payments_snapshot';
export { fetchPaymentsSource, PAYMENT_FAILURE_COLLECTIONS, PAYMENTS_LOOKBACK_MS } from './payments_firestore_fetcher';
export type { PaymentFailureRow, FetchPaymentsSourceResult } from './payments_firestore_fetcher';

// ── Департамент «Безопасность» (шестой): модерация и детские аккаунты ──────
export { runSafetyDepartment, SAFETY_BACKLOG_THRESHOLD, SAFETY_SPIKE_THRESHOLD } from './safety_department';
export { buildSafetySnapshot } from './safety_snapshot';
export { fetchSafetySource, SAFETY_LOOKBACK_MS } from './safety_firestore_fetcher';
export type { FetchSafetySourceResult } from './safety_firestore_fetcher';

// ── Департамент «Скорость поддержки» (седьмой): сколько люди ждут ответа ───
export { runSupportDepartment, SUPPORT_STALE_MS, SUPPORT_QUEUE_THRESHOLD } from './support_department';
export { buildSupportSnapshot } from './support_snapshot';
export { fetchSupportSource, SUPPORT_LOOKBACK_MS, MAX_SUPPORT_DOCS } from './support_firestore_fetcher';
export type { FetchSupportSourceResult } from './support_firestore_fetcher';

// ── Департамент «Фабрика контента» (восьмой): чего НЕ ХВАТАЕТ в курсе ──────
export { runFactoryDepartment, FACTORY_DROPOFF_RATIO, FACTORY_MIN_SAMPLES } from './factory_department';
export { buildFactorySnapshot } from './factory_snapshot';

// ── Суточные планировщики ──────────────────────────────────────────────────
export { jarvisDailyDepartmentsCron, jarvisDailyBusinessHistoryCron } from './jarvis_crons';
export { buildDailyHistoryPoint } from './business_tier_daily_point';

// ── Owner-facing раздел «Стадия роста бизнеса» ─────────────────────────────
export { jarvisGetBusinessTier, jarvisRunBusinessTierBackfill } from './business_tier_callables';
export {
  BUSINESS_TIER_LABELS,
  BUSINESS_TIER_ORDER,
  classifyBusinessTierByHealth,
  computeBusinessHealth,
} from './business_tier';
export type { BusinessTier } from './business_tier';
export { buildBusinessTierSnapshot, MRR_WINDOW_DAYS } from './business_tier_snapshot';
export type { BusinessTierSnapshot } from './business_tier_snapshot';
export { downsampleBusinessHistory, RECENT_DAILY_DAYS } from './business_tier_downsampling';
