import {
  validateGeneratedDayPacket,
  type GeneratedDayPacketIssueCode,
  type GeneratedPersonalPlanDayPacket,
} from './personal_plan_generation_contract';

export type GeneratedPacketReviewDecision = 'approve_for_source_intake' | 'reject';

export type GeneratedPacketReviewRecord = {
  kind: 'personal_plan_generated_packet_review_record';
  packetId: string;
  packetChecksum: string;
  decision: GeneratedPacketReviewDecision;
  reviewerId: string;
  reviewedAt: string;
  notes: string;
  sourceRuntimeWriteAllowed: false;
  liveRegistrationAllowed: false;
};

export type GeneratedPacketReviewInput = {
  kind: 'personal_plan_generated_packet_review_input';
  reviewerId: string;
  reviewedAt: string;
  records: GeneratedPacketReviewRecord[];
};

export type GeneratedPacketApproval = {
  kind: 'personal_plan_generated_packet_approval';
  packet: GeneratedPersonalPlanDayPacket;
  packetChecksum: string;
  review: GeneratedPacketReviewRecord;
  sourceRuntimeWriteAllowed: false;
  liveRegistrationAllowed: false;
};

export type GeneratedPacketReviewIssueCode =
  | GeneratedDayPacketIssueCode
  | 'wrong_review_input_kind'
  | 'missing_review_record'
  | 'duplicate_review_record'
  | 'missing_reviewer_id'
  | 'invalid_review_timestamp'
  | 'packet_checksum_mismatch'
  | 'packet_validation_failed'
  | 'source_runtime_write_not_allowed'
  | 'live_registration_not_allowed';

export type GeneratedPacketReviewResult = {
  status: 'approved_for_source_intake' | 'rejected';
  issueCodes: GeneratedPacketReviewIssueCode[];
  approvedPacket?: GeneratedPacketApproval;
  sourceRuntimeWriteAllowed: false;
  liveRegistrationAllowed: false;
  nextRequiredStep: 'source_intake_preflight' | 'regenerate_or_rewrite_packet';
};

export type GeneratedPacketApprovalBundle = {
  kind: 'personal_plan_generated_packet_approval_bundle';
  approvedPackets: GeneratedPacketApproval[];
};

export type GeneratedPacketApprovalBundleValidation = {
  status: 'valid_for_source_intake_preflight' | 'invalid';
  issueCodes: GeneratedPacketReviewIssueCode[];
  approvedPacketCount: number;
  sourceRuntimeWriteAllowed: false;
  liveRegistrationAllowed: false;
};

type BuildReviewInputOptions = {
  packets: GeneratedPersonalPlanDayPacket[];
  reviewerId: string;
  reviewedAt: string;
  decision: GeneratedPacketReviewDecision;
  notes: string;
};

const ISO_WITH_MILLIS_Z_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function stablePacketJson(packet: GeneratedPersonalPlanDayPacket): string {
  return JSON.stringify({
    packetId: packet.packetId,
    planId: packet.planId,
    dayIndex: packet.dayIndex,
    weekIndex: packet.weekIndex,
    dayTheme: packet.dayTheme,
    weekRole: packet.weekRole,
    selectedDailyTimeAffectsTasks: packet.selectedDailyTimeAffectsTasks,
    productionReady: packet.productionReady,
    reviewStatus: packet.reviewStatus,
    taskModes: packet.taskModes,
    phrases: packet.phrases,
    recallLinks: packet.recallLinks,
    audioNeeds: packet.audioNeeds,
    pronunciationNeeds: packet.pronunciationNeeds,
    blockers: packet.blockers,
  });
}

export function checksumGeneratedDayPacket(packet: GeneratedPersonalPlanDayPacket): string {
  const input = stablePacketJson(packet);
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;

  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= code + index;
    h2 = Math.imul(h2, 0x811c9dc5);
  }

  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

export function buildGeneratedPacketReviewInput(options: BuildReviewInputOptions): GeneratedPacketReviewInput {
  return {
    kind: 'personal_plan_generated_packet_review_input',
    reviewerId: options.reviewerId,
    reviewedAt: options.reviewedAt,
    records: options.packets.map((packet) => ({
      kind: 'personal_plan_generated_packet_review_record',
      packetId: packet.packetId,
      packetChecksum: checksumGeneratedDayPacket(packet),
      decision: options.decision,
      reviewerId: options.reviewerId,
      reviewedAt: options.reviewedAt,
      notes: options.notes,
      sourceRuntimeWriteAllowed: false,
      liveRegistrationAllowed: false,
    })),
  };
}

function recordsByPacketId(records: GeneratedPacketReviewRecord[]): Map<string, GeneratedPacketReviewRecord> {
  const result = new Map<string, GeneratedPacketReviewRecord>();
  for (const record of records) {
    if (!result.has(record.packetId)) {
      result.set(record.packetId, record);
    }
  }
  return result;
}

function duplicateRecordPacketIds(records: GeneratedPacketReviewRecord[]): Set<string> {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const record of records) {
    if (seen.has(record.packetId)) {
      duplicates.add(record.packetId);
    }
    seen.add(record.packetId);
  }
  return duplicates;
}

function uniqueIssueCodes(codes: GeneratedPacketReviewIssueCode[]): GeneratedPacketReviewIssueCode[] {
  return [...new Set(codes)];
}

export function reviewGeneratedDayPacket(
  packet: GeneratedPersonalPlanDayPacket,
  input: GeneratedPacketReviewInput,
): GeneratedPacketReviewResult {
  const issueCodes: GeneratedPacketReviewIssueCode[] = [];

  if (input.kind !== 'personal_plan_generated_packet_review_input') {
    issueCodes.push('wrong_review_input_kind');
  }
  if (!input.reviewerId.trim()) {
    issueCodes.push('missing_reviewer_id');
  }
  if (!ISO_WITH_MILLIS_Z_RE.test(input.reviewedAt)) {
    issueCodes.push('invalid_review_timestamp');
  }

  const duplicates = duplicateRecordPacketIds(input.records);
  if (duplicates.has(packet.packetId)) {
    issueCodes.push('duplicate_review_record');
  }

  const record = recordsByPacketId(input.records).get(packet.packetId);
  if (!record) {
    issueCodes.push('missing_review_record');
  } else {
    if (!record.reviewerId.trim()) {
      issueCodes.push('missing_reviewer_id');
    }
    if (!ISO_WITH_MILLIS_Z_RE.test(record.reviewedAt)) {
      issueCodes.push('invalid_review_timestamp');
    }
    if (record.packetChecksum !== checksumGeneratedDayPacket(packet)) {
      issueCodes.push('packet_checksum_mismatch');
    }
    if (record.sourceRuntimeWriteAllowed) {
      issueCodes.push('source_runtime_write_not_allowed');
    }
    if (record.liveRegistrationAllowed) {
      issueCodes.push('live_registration_not_allowed');
    }
  }

  const packetValidation = validateGeneratedDayPacket(packet);
  if (packetValidation.status === 'invalid') {
    issueCodes.push('packet_validation_failed', ...packetValidation.issueCodes);
  }

  const uniqueCodes = uniqueIssueCodes(issueCodes);
  if (uniqueCodes.length > 0 || record?.decision !== 'approve_for_source_intake') {
    return {
      status: 'rejected',
      issueCodes: uniqueCodes,
      sourceRuntimeWriteAllowed: false,
      liveRegistrationAllowed: false,
      nextRequiredStep: 'regenerate_or_rewrite_packet',
    };
  }

  return {
    status: 'approved_for_source_intake',
    issueCodes: [],
    approvedPacket: {
      kind: 'personal_plan_generated_packet_approval',
      packet,
      packetChecksum: record.packetChecksum,
      review: record,
      sourceRuntimeWriteAllowed: false,
      liveRegistrationAllowed: false,
    },
    sourceRuntimeWriteAllowed: false,
    liveRegistrationAllowed: false,
    nextRequiredStep: 'source_intake_preflight',
  };
}

export function validateGeneratedPacketApprovalBundle(
  bundle: GeneratedPacketApprovalBundle,
): GeneratedPacketApprovalBundleValidation {
  const issueCodes: GeneratedPacketReviewIssueCode[] = [];

  for (const approved of bundle.approvedPackets) {
    if (approved.packetChecksum !== checksumGeneratedDayPacket(approved.packet)) {
      issueCodes.push('packet_checksum_mismatch');
    }
    if (approved.sourceRuntimeWriteAllowed || approved.review.sourceRuntimeWriteAllowed) {
      issueCodes.push('source_runtime_write_not_allowed');
    }
    if (approved.liveRegistrationAllowed || approved.review.liveRegistrationAllowed) {
      issueCodes.push('live_registration_not_allowed');
    }
  }

  const uniqueCodes = uniqueIssueCodes(issueCodes);

  return {
    status: uniqueCodes.length === 0 ? 'valid_for_source_intake_preflight' : 'invalid',
    issueCodes: uniqueCodes,
    approvedPacketCount: bundle.approvedPackets.length,
    sourceRuntimeWriteAllowed: false,
    liveRegistrationAllowed: false,
  };
}
