import type {
  BulkGenerationReviewQueue,
  BulkGenerationReviewQueueRow,
} from './personal_plan_bulk_generation_review_queue';

export type PersonalPlanInternalQualityDecision =
  | 'accepted_for_source_intake_candidate'
  | 'rework_required'
  | 'blocked';

export type PersonalPlanInternalQualityIssueCode =
  | 'queue_not_ready_for_internal_quality_gate'
  | 'quality_below_accept_threshold'
  | 'quality_below_rework_threshold'
  | 'missing_required_materials'
  | 'source_runtime_write_not_allowed'
  | 'live_registration_not_allowed'
  | 'generated_content_creation_not_allowed'
  | 'production_ready_not_allowed';

export type PersonalPlanInternalQualityGateRow = {
  candidateId: string;
  planId: BulkGenerationReviewQueueRow['planId'];
  dayIndex: number;
  label: string;
  quality: number;
  qualityDecision: PersonalPlanInternalQualityDecision;
  issueCodes: PersonalPlanInternalQualityIssueCode[];
  requiredMaterialSummary: string;
  notes: string;
  sourceRuntimeWriteAllowed: false;
  liveRegistrationAllowed: false;
  generatedContentCreationAllowed: false;
  productionReady: false;
  nextRequiredStep: 'source_intake_preflight_candidate' | 'rewrite_candidate_day' | 'resolve_blockers';
};

export type PersonalPlanInternalQualityGateStatus =
  | 'ready_for_source_intake_preflight'
  | 'ready_for_rework_then_source_intake_preflight'
  | 'blocked';

export type PersonalPlanInternalQualityGate = {
  kind: 'personal_plan_internal_quality_gate';
  status: PersonalPlanInternalQualityGateStatus;
  rows: PersonalPlanInternalQualityGateRow[];
  totalCandidateDays: number;
  acceptedCandidateDays: number;
  reworkRequiredDays: number;
  blockedDays: number;
  issueCodes: PersonalPlanInternalQualityIssueCode[];
  sourceRuntimeWriteAllowed: false;
  liveRegistrationAllowed: false;
  generatedContentCreationAllowed: false;
  productionReady: false;
  nextRequiredStep: 'source_intake_preflight' | 'rewrite_rework_rows_before_source_intake' | 'resolve_internal_quality_blockers';
};

export type PersonalPlanInternalQualityGateValidation = {
  status: 'valid_non_live_internal_quality_gate' | 'invalid';
  issueCodes: PersonalPlanInternalQualityIssueCode[];
  totalCandidateDays: number;
  acceptedCandidateDays: number;
  reworkRequiredDays: number;
  blockedDays: number;
  sourceRuntimeWriteAllowed: false;
  liveRegistrationAllowed: false;
  nextRequiredStep: PersonalPlanInternalQualityGate['nextRequiredStep'];
};

const ACCEPT_THRESHOLD = 90;
const REWORK_THRESHOLD = 85;

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function hasRequiredMaterials(row: BulkGenerationReviewQueueRow): boolean {
  const summary = row.whatExists.trim();
  return summary.length >= 24 && !/placeholder|generated shell|fake readiness|source import|live registered/i.test(summary);
}

function rowIssueCodes(row: BulkGenerationReviewQueueRow): PersonalPlanInternalQualityIssueCode[] {
  const issueCodes: PersonalPlanInternalQualityIssueCode[] = [];

  if (row.quality < ACCEPT_THRESHOLD) {
    issueCodes.push(row.quality >= REWORK_THRESHOLD ? 'quality_below_accept_threshold' : 'quality_below_rework_threshold');
  }
  if (!hasRequiredMaterials(row)) {
    issueCodes.push('missing_required_materials');
  }
  if ((row as { sourceRuntimeWriteAllowed?: boolean }).sourceRuntimeWriteAllowed) {
    issueCodes.push('source_runtime_write_not_allowed');
  }
  if ((row as { liveRegistrationAllowed?: boolean }).liveRegistrationAllowed) {
    issueCodes.push('live_registration_not_allowed');
  }
  if ((row as { generatedContentCreationAllowed?: boolean }).generatedContentCreationAllowed) {
    issueCodes.push('generated_content_creation_not_allowed');
  }
  if ((row as { productionReady?: boolean }).productionReady) {
    issueCodes.push('production_ready_not_allowed');
  }

  return unique(issueCodes);
}

function decisionFromIssues(issueCodes: PersonalPlanInternalQualityIssueCode[]): PersonalPlanInternalQualityDecision {
  if (
    issueCodes.includes('quality_below_rework_threshold')
    || issueCodes.includes('missing_required_materials')
    || issueCodes.includes('source_runtime_write_not_allowed')
    || issueCodes.includes('live_registration_not_allowed')
    || issueCodes.includes('generated_content_creation_not_allowed')
    || issueCodes.includes('production_ready_not_allowed')
  ) {
    return 'blocked';
  }
  if (issueCodes.includes('quality_below_accept_threshold')) {
    return 'rework_required';
  }
  return 'accepted_for_source_intake_candidate';
}

function nextStepFromDecision(
  decision: PersonalPlanInternalQualityDecision,
): PersonalPlanInternalQualityGateRow['nextRequiredStep'] {
  if (decision === 'accepted_for_source_intake_candidate') return 'source_intake_preflight_candidate';
  if (decision === 'rework_required') return 'rewrite_candidate_day';
  return 'resolve_blockers';
}

function gateStatus(rows: PersonalPlanInternalQualityGateRow[], issueCodes: PersonalPlanInternalQualityIssueCode[]): PersonalPlanInternalQualityGateStatus {
  if (issueCodes.includes('queue_not_ready_for_internal_quality_gate') || rows.some((row) => row.qualityDecision === 'blocked')) {
    return 'blocked';
  }
  if (rows.some((row) => row.qualityDecision === 'rework_required')) {
    return 'ready_for_rework_then_source_intake_preflight';
  }
  return 'ready_for_source_intake_preflight';
}

function gateNextStep(status: PersonalPlanInternalQualityGateStatus): PersonalPlanInternalQualityGate['nextRequiredStep'] {
  if (status === 'ready_for_source_intake_preflight') return 'source_intake_preflight';
  if (status === 'ready_for_rework_then_source_intake_preflight') return 'rewrite_rework_rows_before_source_intake';
  return 'resolve_internal_quality_blockers';
}

export function buildPersonalPlanInternalQualityGate(
  queue: BulkGenerationReviewQueue,
): PersonalPlanInternalQualityGate {
  const gateIssueCodes: PersonalPlanInternalQualityIssueCode[] = [];
  if (queue.status !== 'ready_for_internal_quality_gate') {
    gateIssueCodes.push('queue_not_ready_for_internal_quality_gate');
  }
  if ((queue as { sourceRuntimeWriteAllowed?: boolean }).sourceRuntimeWriteAllowed) {
    gateIssueCodes.push('source_runtime_write_not_allowed');
  }
  if ((queue as { liveRegistrationAllowed?: boolean }).liveRegistrationAllowed) {
    gateIssueCodes.push('live_registration_not_allowed');
  }
  if ((queue as { generatedContentCreationAllowed?: boolean }).generatedContentCreationAllowed) {
    gateIssueCodes.push('generated_content_creation_not_allowed');
  }
  if ((queue as { productionReady?: boolean }).productionReady) {
    gateIssueCodes.push('production_ready_not_allowed');
  }

  const rows = queue.rows.map((row): PersonalPlanInternalQualityGateRow => {
    const issueCodes = rowIssueCodes(row);
    const qualityDecision = decisionFromIssues(issueCodes);
    return {
      candidateId: row.candidateId,
      planId: row.planId,
      dayIndex: row.dayIndex,
      label: row.label,
      quality: row.quality,
      qualityDecision,
      issueCodes,
      requiredMaterialSummary: row.whatExists,
      notes: row.notes,
      sourceRuntimeWriteAllowed: false,
      liveRegistrationAllowed: false,
      generatedContentCreationAllowed: false,
      productionReady: false,
      nextRequiredStep: nextStepFromDecision(qualityDecision),
    };
  });

  const acceptedCandidateDays = rows.filter((row) => row.qualityDecision === 'accepted_for_source_intake_candidate').length;
  const reworkRequiredDays = rows.filter((row) => row.qualityDecision === 'rework_required').length;
  const blockedDays = rows.filter((row) => row.qualityDecision === 'blocked').length;
  const issueCodes = unique([...gateIssueCodes, ...rows.flatMap((row) => row.issueCodes)]);
  const status = gateStatus(rows, issueCodes);

  return {
    kind: 'personal_plan_internal_quality_gate',
    status,
    rows,
    totalCandidateDays: rows.length,
    acceptedCandidateDays,
    reworkRequiredDays,
    blockedDays,
    issueCodes,
    sourceRuntimeWriteAllowed: false,
    liveRegistrationAllowed: false,
    generatedContentCreationAllowed: false,
    productionReady: false,
    nextRequiredStep: gateNextStep(status),
  };
}

export function validatePersonalPlanInternalQualityGate(
  gate: PersonalPlanInternalQualityGate,
): PersonalPlanInternalQualityGateValidation {
  const issueCodes: PersonalPlanInternalQualityIssueCode[] = [...gate.issueCodes];

  if ((gate as { sourceRuntimeWriteAllowed?: boolean }).sourceRuntimeWriteAllowed) {
    issueCodes.push('source_runtime_write_not_allowed');
  }
  if ((gate as { liveRegistrationAllowed?: boolean }).liveRegistrationAllowed) {
    issueCodes.push('live_registration_not_allowed');
  }
  if ((gate as { generatedContentCreationAllowed?: boolean }).generatedContentCreationAllowed) {
    issueCodes.push('generated_content_creation_not_allowed');
  }
  if ((gate as { productionReady?: boolean }).productionReady) {
    issueCodes.push('production_ready_not_allowed');
  }

  for (const row of gate.rows) {
    if ((row as { sourceRuntimeWriteAllowed?: boolean }).sourceRuntimeWriteAllowed) {
      issueCodes.push('source_runtime_write_not_allowed');
    }
    if ((row as { liveRegistrationAllowed?: boolean }).liveRegistrationAllowed) {
      issueCodes.push('live_registration_not_allowed');
    }
    if ((row as { generatedContentCreationAllowed?: boolean }).generatedContentCreationAllowed) {
      issueCodes.push('generated_content_creation_not_allowed');
    }
    if ((row as { productionReady?: boolean }).productionReady) {
      issueCodes.push('production_ready_not_allowed');
    }
  }

  const uniqueCodes = unique(issueCodes);
  return {
    status: uniqueCodes.length === 0 || (uniqueCodes.length === 1 && uniqueCodes[0] === 'quality_below_accept_threshold')
      ? 'valid_non_live_internal_quality_gate'
      : 'invalid',
    issueCodes: uniqueCodes.filter((code) => code !== 'quality_below_accept_threshold'),
    totalCandidateDays: gate.totalCandidateDays,
    acceptedCandidateDays: gate.acceptedCandidateDays,
    reworkRequiredDays: gate.reworkRequiredDays,
    blockedDays: gate.blockedDays,
    sourceRuntimeWriteAllowed: false,
    liveRegistrationAllowed: false,
    nextRequiredStep: gate.nextRequiredStep,
  };
}
