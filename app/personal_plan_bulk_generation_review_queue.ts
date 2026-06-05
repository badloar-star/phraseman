import type { PersonalPlanExpansionId } from './personal_plan_cycle_expansion_spec';

export type PersonalPlansFillProgressPlan = {
  id: string;
  name: string;
  filledDays: number;
  totalDays: number;
};

export type PersonalPlansFillProgressDayQuality = {
  label: string;
  status: string;
  quality: number;
  whatExists: string;
  notes: string;
};

export type PersonalPlansFillProgressData = {
  kind: string;
  productionReady: boolean;
  plans: PersonalPlansFillProgressPlan[];
  dayQuality: PersonalPlansFillProgressDayQuality[];
};

export type BulkGenerationReviewQueueRow = {
  candidateId: string;
  planId: PersonalPlanExpansionId;
  dayIndex: number;
  label: string;
  draftStatus: 'chat draft' | 'certified';
  quality: number;
  whatExists: string;
  notes: string;
  sourceLabel: string;
  status: 'queued_for_internal_quality_gate';
  sourceRuntimeWriteAllowed: false;
  liveRegistrationAllowed: false;
  generatedContentCreationAllowed: false;
  productionReady: false;
  nextRequiredStep: 'internal_quality_gate';
};

export type BulkGenerationReviewQueueCoverage = Record<
  PersonalPlanExpansionId,
  { candidateDays: number; expectedCycleDays: 28 }
>;

export type BulkGenerationReviewQueueIssueCode =
  | 'progress_data_production_ready_not_allowed'
  | 'missing_cycle_candidate_days'
  | 'source_runtime_write_not_allowed'
  | 'live_registration_not_allowed'
  | 'generated_content_creation_not_allowed'
  | 'production_ready_not_allowed'
  | 'row_not_queued_for_internal_quality_gate';

export type BulkGenerationReviewQueue = {
  kind: 'personal_plan_bulk_generation_review_queue';
  status: 'ready_for_internal_quality_gate' | 'blocked';
  rows: BulkGenerationReviewQueueRow[];
  coverage: BulkGenerationReviewQueueCoverage;
  totalCandidateDays: number;
  issueCodes: BulkGenerationReviewQueueIssueCode[];
  sourceRuntimeWriteAllowed: false;
  liveRegistrationAllowed: false;
  generatedContentCreationAllowed: false;
  productionReady: false;
  nextRequiredStep: 'internal_quality_gate' | 'complete_28_day_chat_draft_cycle';
};

export type BulkGenerationReviewQueueValidation = {
  status: 'valid_non_live_internal_quality_queue' | 'invalid';
  issueCodes: BulkGenerationReviewQueueIssueCode[];
  totalCandidateDays: number;
  sourceRuntimeWriteAllowed: false;
  liveRegistrationAllowed: false;
  nextRequiredStep: 'internal_quality_gate' | 'complete_28_day_chat_draft_cycle';
};

const PLAN_LABEL_TO_ID: Record<string, PersonalPlanExpansionId> = {
  voyazh: 'voyazh',
  mitap: 'mitap',
  gavan: 'gavan',
  impuls: 'impuls',
  echo: 'echo',
};

const PLAN_IDS: PersonalPlanExpansionId[] = ['voyazh', 'mitap', 'gavan', 'impuls', 'echo'];

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function parseDayLabel(label: string): { planId: PersonalPlanExpansionId; dayIndex: number } | null {
  const match = /^(Voyazh|Mitap|Gavan|Impuls|Echo) Day (\d+)$/i.exec(label.trim());
  if (!match) return null;
  const planId = PLAN_LABEL_TO_ID[match[1].toLowerCase()];
  const dayIndex = Number(match[2]);
  if (!planId || !Number.isInteger(dayIndex)) return null;
  return { planId, dayIndex };
}

function emptyCoverage(): BulkGenerationReviewQueueCoverage {
  return {
    voyazh: { candidateDays: 0, expectedCycleDays: 28 },
    mitap: { candidateDays: 0, expectedCycleDays: 28 },
    gavan: { candidateDays: 0, expectedCycleDays: 28 },
    impuls: { candidateDays: 0, expectedCycleDays: 28 },
    echo: { candidateDays: 0, expectedCycleDays: 28 },
  };
}

export function buildPersonalPlanBulkGenerationReviewQueue(
  data: PersonalPlansFillProgressData,
): BulkGenerationReviewQueue {
  const issueCodes: BulkGenerationReviewQueueIssueCode[] = [];
  if (data.productionReady) {
    issueCodes.push('progress_data_production_ready_not_allowed');
  }

  const rows: BulkGenerationReviewQueueRow[] = [];
  const coverage = emptyCoverage();
  const seen = new Set<string>();

  for (const day of data.dayQuality) {
    if (day.status !== 'chat draft' && day.status !== 'certified') continue;
    const parsed = parseDayLabel(day.label);
    if (!parsed || parsed.dayIndex < 1 || parsed.dayIndex > 28) continue;
    const key = `${parsed.planId}:${parsed.dayIndex}`;
    if (seen.has(key)) continue;
    seen.add(key);
    coverage[parsed.planId].candidateDays += 1;
    rows.push({
      candidateId: `${parsed.planId}_d${String(parsed.dayIndex).padStart(3, '0')}_chat_draft_candidate`,
      planId: parsed.planId,
      dayIndex: parsed.dayIndex,
      label: day.label,
      draftStatus: day.status,
      quality: day.quality,
      whatExists: day.whatExists,
      notes: day.notes,
      sourceLabel: day.label,
      status: 'queued_for_internal_quality_gate',
      sourceRuntimeWriteAllowed: false,
      liveRegistrationAllowed: false,
      generatedContentCreationAllowed: false,
      productionReady: false,
      nextRequiredStep: 'internal_quality_gate',
    });
  }

  if (PLAN_IDS.some((planId) => coverage[planId].candidateDays < 28)) {
    issueCodes.push('missing_cycle_candidate_days');
  }

  return {
    kind: 'personal_plan_bulk_generation_review_queue',
    status: issueCodes.length === 0 ? 'ready_for_internal_quality_gate' : 'blocked',
    rows,
    coverage,
    totalCandidateDays: rows.length,
    issueCodes: unique(issueCodes),
    sourceRuntimeWriteAllowed: false,
    liveRegistrationAllowed: false,
    generatedContentCreationAllowed: false,
    productionReady: false,
    nextRequiredStep: issueCodes.length === 0 ? 'internal_quality_gate' : 'complete_28_day_chat_draft_cycle',
  };
}

export function validatePersonalPlanBulkGenerationReviewQueue(
  queue: BulkGenerationReviewQueue,
): BulkGenerationReviewQueueValidation {
  const issueCodes: BulkGenerationReviewQueueIssueCode[] = [...queue.issueCodes];

  if ((queue as { sourceRuntimeWriteAllowed?: boolean }).sourceRuntimeWriteAllowed) {
    issueCodes.push('source_runtime_write_not_allowed');
  }
  if ((queue as { liveRegistrationAllowed?: boolean }).liveRegistrationAllowed) {
    issueCodes.push('live_registration_not_allowed');
  }
  if ((queue as { generatedContentCreationAllowed?: boolean }).generatedContentCreationAllowed) {
    issueCodes.push('generated_content_creation_not_allowed');
  }
  if ((queue as { productionReady?: boolean }).productionReady) {
    issueCodes.push('production_ready_not_allowed');
  }
  if (PLAN_IDS.some((planId) => queue.coverage[planId].candidateDays < 28)) {
    issueCodes.push('missing_cycle_candidate_days');
  }
  for (const row of queue.rows) {
    if (row.status !== 'queued_for_internal_quality_gate') issueCodes.push('row_not_queued_for_internal_quality_gate');
    if ((row as { sourceRuntimeWriteAllowed?: boolean }).sourceRuntimeWriteAllowed) issueCodes.push('source_runtime_write_not_allowed');
    if ((row as { liveRegistrationAllowed?: boolean }).liveRegistrationAllowed) issueCodes.push('live_registration_not_allowed');
    if ((row as { generatedContentCreationAllowed?: boolean }).generatedContentCreationAllowed) issueCodes.push('generated_content_creation_not_allowed');
    if ((row as { productionReady?: boolean }).productionReady) issueCodes.push('production_ready_not_allowed');
  }

  const uniqueCodes = unique(issueCodes);
  return {
    status: uniqueCodes.length === 0 ? 'valid_non_live_internal_quality_queue' : 'invalid',
    issueCodes: uniqueCodes,
    totalCandidateDays: queue.totalCandidateDays,
    sourceRuntimeWriteAllowed: false,
    liveRegistrationAllowed: false,
    nextRequiredStep: uniqueCodes.length === 0 ? 'internal_quality_gate' : 'complete_28_day_chat_draft_cycle',
  };
}
