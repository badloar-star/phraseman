import { checksumGeneratedDayPacket, validateGeneratedPacketApprovalBundle, type GeneratedPacketApprovalBundle } from './personal_plan_generation_review_workflow';
import type { PersonalPlanId } from './personal_plan_catalog';
import type { PersonalPlanInternalQualityGate } from './personal_plan_internal_quality_gate';

export type GeneratedPacketSourceIntakeStatus =
  | 'accepted_for_import_format_design'
  | 'blocked_unapproved_packet';

export type GeneratedPacketSourceIntakeRow = {
  packetId: string;
  packetChecksum: string;
  planId: PersonalPlanId;
  dayIndex: number;
  weekIndex: number;
  reviewDecision: 'approve_for_source_intake';
  reviewerId: string;
  reviewedAt: string;
  intakeStatus: GeneratedPacketSourceIntakeStatus;
  sourceRuntimeWriteAllowed: false;
  liveRegistrationAllowed: false;
  generatedContentCreationAllowed: false;
  nextRequiredStep: 'content_packet_import_format';
};

export type GeneratedPacketSourceIntakePreflight = {
  kind: 'personal_plan_generated_packet_source_intake_preflight';
  status: 'ready_for_import_format_design' | 'blocked';
  rows: GeneratedPacketSourceIntakeRow[];
  sourceRuntimeWriteAllowed: false;
  liveRegistrationAllowed: false;
  generatedContentCreationAllowed: false;
  nextRequiredStep: 'content_packet_import_format';
};

export type GeneratedPacketSourceIntakeIssueCode =
  | 'approval_bundle_invalid'
  | 'source_runtime_write_not_allowed'
  | 'live_registration_not_allowed'
  | 'generated_content_creation_not_allowed'
  | 'packet_checksum_mismatch'
  | 'unapproved_packet_not_allowed'
  | 'missing_intake_row';

export type GeneratedPacketSourceIntakeValidation = {
  status: 'valid_non_live_source_intake_preflight' | 'invalid';
  issueCodes: GeneratedPacketSourceIntakeIssueCode[];
  acceptedRows: number;
  blockedRows: number;
  sourceRuntimeWriteAllowed: false;
  liveRegistrationAllowed: false;
  nextRequiredStep: 'content_packet_import_format';
};

export type AcceptedCandidateSourceIntakeStatus =
  | 'accepted_for_content_packet_import_format'
  | 'blocked_by_internal_quality_gate';

export type AcceptedCandidateSourceIntakeRow = {
  candidateId: string;
  candidateChecksum: string;
  planId: PersonalPlanId;
  dayIndex: number;
  sourceLabel: string;
  quality: number;
  qualityDecision: 'accepted_for_source_intake_candidate';
  intakeStatus: AcceptedCandidateSourceIntakeStatus;
  sourceRuntimeWriteAllowed: false;
  liveRegistrationAllowed: false;
  generatedContentCreationAllowed: false;
  productionReady: false;
  nextRequiredStep: 'content_packet_import_format';
};

export type AcceptedCandidateSourceIntakePreflight = {
  kind: 'personal_plan_accepted_candidate_source_intake_preflight';
  status: 'ready_for_content_packet_import_format' | 'blocked';
  rows: AcceptedCandidateSourceIntakeRow[];
  totalCandidateDays: number;
  acceptedRows: number;
  blockedRows: number;
  sourceRuntimeWriteAllowed: false;
  liveRegistrationAllowed: false;
  generatedContentCreationAllowed: false;
  productionReady: false;
  nextRequiredStep: 'content_packet_import_format' | 'internal_quality_gate_rework';
};

export type AcceptedCandidateSourceIntakeIssueCode =
  | 'internal_quality_gate_not_ready'
  | 'missing_intake_row'
  | 'candidate_checksum_mismatch'
  | 'candidate_not_accepted_for_source_intake'
  | 'source_runtime_write_not_allowed'
  | 'live_registration_not_allowed'
  | 'generated_content_creation_not_allowed'
  | 'production_ready_not_allowed';

export type AcceptedCandidateSourceIntakeValidation = {
  status: 'valid_non_live_accepted_candidate_source_intake_preflight' | 'invalid';
  issueCodes: AcceptedCandidateSourceIntakeIssueCode[];
  totalCandidateDays: number;
  acceptedRows: number;
  blockedRows: number;
  sourceRuntimeWriteAllowed: false;
  liveRegistrationAllowed: false;
  nextRequiredStep: AcceptedCandidateSourceIntakePreflight['nextRequiredStep'];
};

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function checksumAcceptedCandidateRow(input: {
  candidateId: string;
  planId: string;
  dayIndex: number;
  label: string;
  quality: number;
  requiredMaterialSummary: string;
  notes: string;
}): string {
  const text = JSON.stringify(input);
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= code + index;
    h2 = Math.imul(h2, 0x811c9dc5);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

export function buildGeneratedPacketSourceIntakePreflight(
  bundle: GeneratedPacketApprovalBundle,
): GeneratedPacketSourceIntakePreflight {
  const bundleValidation = validateGeneratedPacketApprovalBundle(bundle);
  const bundleValid = bundleValidation.status === 'valid_for_source_intake_preflight';

  const rows: GeneratedPacketSourceIntakeRow[] = bundle.approvedPackets.map((approved) => ({
    packetId: approved.packet.packetId,
    packetChecksum: approved.packetChecksum,
    planId: approved.packet.planId,
    dayIndex: approved.packet.dayIndex,
    weekIndex: approved.packet.weekIndex,
    reviewDecision: 'approve_for_source_intake',
    reviewerId: approved.review.reviewerId,
    reviewedAt: approved.review.reviewedAt,
    intakeStatus: bundleValid ? 'accepted_for_import_format_design' : 'blocked_unapproved_packet',
    sourceRuntimeWriteAllowed: false,
    liveRegistrationAllowed: false,
    generatedContentCreationAllowed: false,
    nextRequiredStep: 'content_packet_import_format',
  }));

  return {
    kind: 'personal_plan_generated_packet_source_intake_preflight',
    status: bundleValid ? 'ready_for_import_format_design' : 'blocked',
    rows,
    sourceRuntimeWriteAllowed: false,
    liveRegistrationAllowed: false,
    generatedContentCreationAllowed: false,
    nextRequiredStep: 'content_packet_import_format',
  };
}

export function buildAcceptedCandidateSourceIntakePreflight(
  gate: PersonalPlanInternalQualityGate,
): AcceptedCandidateSourceIntakePreflight {
  const gateReady = gate.status === 'ready_for_source_intake_preflight'
    && gate.nextRequiredStep === 'source_intake_preflight'
    && gate.reworkRequiredDays === 0
    && gate.blockedDays === 0
    && !gate.productionReady
    && !gate.sourceRuntimeWriteAllowed
    && !gate.liveRegistrationAllowed
    && !gate.generatedContentCreationAllowed;

  const rows = gate.rows.map((row): AcceptedCandidateSourceIntakeRow => {
    const accepted = gateReady && row.qualityDecision === 'accepted_for_source_intake_candidate';
    return {
      candidateId: row.candidateId,
      candidateChecksum: checksumAcceptedCandidateRow({
        candidateId: row.candidateId,
        planId: row.planId,
        dayIndex: row.dayIndex,
        label: row.label,
        quality: row.quality,
        requiredMaterialSummary: row.requiredMaterialSummary,
        notes: row.notes,
      }),
      planId: row.planId,
      dayIndex: row.dayIndex,
      sourceLabel: row.label,
      quality: row.quality,
      qualityDecision: 'accepted_for_source_intake_candidate',
      intakeStatus: accepted ? 'accepted_for_content_packet_import_format' : 'blocked_by_internal_quality_gate',
      sourceRuntimeWriteAllowed: false,
      liveRegistrationAllowed: false,
      generatedContentCreationAllowed: false,
      productionReady: false,
      nextRequiredStep: 'content_packet_import_format',
    };
  });

  const acceptedRows = rows.filter((row) => row.intakeStatus === 'accepted_for_content_packet_import_format').length;
  const blockedRows = rows.length - acceptedRows;
  return {
    kind: 'personal_plan_accepted_candidate_source_intake_preflight',
    status: gateReady && blockedRows === 0 && rows.length > 0 ? 'ready_for_content_packet_import_format' : 'blocked',
    rows,
    totalCandidateDays: rows.length,
    acceptedRows,
    blockedRows,
    sourceRuntimeWriteAllowed: false,
    liveRegistrationAllowed: false,
    generatedContentCreationAllowed: false,
    productionReady: false,
    nextRequiredStep: gateReady && blockedRows === 0 ? 'content_packet_import_format' : 'internal_quality_gate_rework',
  };
}

export function validateGeneratedPacketSourceIntakePreflight(
  preflight: GeneratedPacketSourceIntakePreflight,
): GeneratedPacketSourceIntakeValidation {
  const issueCodes: GeneratedPacketSourceIntakeIssueCode[] = [];

  if ((preflight as { sourceRuntimeWriteAllowed?: boolean }).sourceRuntimeWriteAllowed) {
    issueCodes.push('source_runtime_write_not_allowed');
  }
  if ((preflight as { liveRegistrationAllowed?: boolean }).liveRegistrationAllowed) {
    issueCodes.push('live_registration_not_allowed');
  }
  if ((preflight as { generatedContentCreationAllowed?: boolean }).generatedContentCreationAllowed) {
    issueCodes.push('generated_content_creation_not_allowed');
  }
  if (preflight.rows.length === 0) {
    issueCodes.push('missing_intake_row');
  }

  let acceptedRows = 0;
  let blockedRows = 0;

  for (const row of preflight.rows) {
    if ((row as { sourceRuntimeWriteAllowed?: boolean }).sourceRuntimeWriteAllowed) {
      issueCodes.push('source_runtime_write_not_allowed');
    }
    if ((row as { liveRegistrationAllowed?: boolean }).liveRegistrationAllowed) {
      issueCodes.push('live_registration_not_allowed');
    }
    if ((row as { generatedContentCreationAllowed?: boolean }).generatedContentCreationAllowed) {
      issueCodes.push('generated_content_creation_not_allowed');
    }
    if (row.intakeStatus !== 'accepted_for_import_format_design') {
      issueCodes.push('unapproved_packet_not_allowed');
      blockedRows += 1;
    } else {
      acceptedRows += 1;
    }

    const approvedPacket = (preflight as unknown as { approvedPackets?: never[] }).approvedPackets;
    void approvedPacket;
    if (!/^[a-f0-9]{16}$/.test(row.packetChecksum) || row.packetChecksum === '0000000000000000') {
      issueCodes.push('packet_checksum_mismatch');
    }
  }

  return {
    status: issueCodes.length === 0 ? 'valid_non_live_source_intake_preflight' : 'invalid',
    issueCodes: unique(issueCodes),
    acceptedRows,
    blockedRows,
    sourceRuntimeWriteAllowed: false,
    liveRegistrationAllowed: false,
    nextRequiredStep: 'content_packet_import_format',
  };
}

export function validateAcceptedCandidateSourceIntakePreflight(
  preflight: AcceptedCandidateSourceIntakePreflight,
): AcceptedCandidateSourceIntakeValidation {
  const issueCodes: AcceptedCandidateSourceIntakeIssueCode[] = [];
  if ((preflight as { sourceRuntimeWriteAllowed?: boolean }).sourceRuntimeWriteAllowed) {
    issueCodes.push('source_runtime_write_not_allowed');
  }
  if ((preflight as { liveRegistrationAllowed?: boolean }).liveRegistrationAllowed) {
    issueCodes.push('live_registration_not_allowed');
  }
  if ((preflight as { generatedContentCreationAllowed?: boolean }).generatedContentCreationAllowed) {
    issueCodes.push('generated_content_creation_not_allowed');
  }
  if ((preflight as { productionReady?: boolean }).productionReady) {
    issueCodes.push('production_ready_not_allowed');
  }
  if (preflight.rows.length === 0) {
    issueCodes.push('missing_intake_row');
  }
  if (preflight.status !== 'ready_for_content_packet_import_format') {
    issueCodes.push('internal_quality_gate_not_ready');
  }

  let acceptedRows = 0;
  let blockedRows = 0;
  for (const row of preflight.rows) {
    if (row.intakeStatus !== 'accepted_for_content_packet_import_format') {
      issueCodes.push('candidate_not_accepted_for_source_intake');
      blockedRows += 1;
    } else {
      acceptedRows += 1;
    }
    if (!/^[a-f0-9]{16}$/.test(row.candidateChecksum) || row.candidateChecksum === '0000000000000000') {
      issueCodes.push('candidate_checksum_mismatch');
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
  }

  const uniqueCodes = unique(issueCodes);
  return {
    status: uniqueCodes.length === 0 ? 'valid_non_live_accepted_candidate_source_intake_preflight' : 'invalid',
    issueCodes: uniqueCodes,
    totalCandidateDays: preflight.totalCandidateDays,
    acceptedRows,
    blockedRows,
    sourceRuntimeWriteAllowed: false,
    liveRegistrationAllowed: false,
    nextRequiredStep: preflight.nextRequiredStep,
  };
}

export function validateGeneratedPacketSourceIntakePreflightWithBundle(
  preflight: GeneratedPacketSourceIntakePreflight,
  bundle: GeneratedPacketApprovalBundle,
): GeneratedPacketSourceIntakeValidation {
  const base = validateGeneratedPacketSourceIntakePreflight(preflight);
  const issueCodes = [...base.issueCodes];

  for (const row of preflight.rows) {
    const approved = bundle.approvedPackets.find((candidate) => candidate.packet.packetId === row.packetId);
    if (!approved || row.packetChecksum !== checksumGeneratedDayPacket(approved.packet)) {
      issueCodes.push('packet_checksum_mismatch');
    }
  }

  const uniqueCodes = unique(issueCodes);
  return {
    ...base,
    status: uniqueCodes.length === 0 ? 'valid_non_live_source_intake_preflight' : 'invalid',
    issueCodes: uniqueCodes,
  };
}
