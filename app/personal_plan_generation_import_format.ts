import type {
  GeneratedEvidenceNeed,
  GeneratedPhraseCandidate,
  GeneratedRecallLink,
  PersonalPlanGenerationMode,
  GeneratedPersonalPlanDayPacket,
} from './personal_plan_generation_contract';
import type { PersonalPlanId } from './personal_plan_catalog';
import type {
  AcceptedCandidateSourceIntakePreflight,
  GeneratedPacketSourceIntakePreflight,
} from './personal_plan_generation_source_intake_preflight';

export type GeneratedContentImportDay = {
  packetId: string;
  packetChecksum: string;
  planId: PersonalPlanId;
  dayIndex: number;
  weekIndex: number;
  dayTheme: string;
  weekRole: string;
  taskModes: PersonalPlanGenerationMode[];
  phrases: GeneratedPhraseCandidate[];
  recallLinks: GeneratedRecallLink[];
  audioNeeds: GeneratedEvidenceNeed[];
  pronunciationNeeds: GeneratedEvidenceNeed[];
  blockers: string[];
  sourceRuntimeWriteAllowed: false;
  liveRegistrationAllowed: false;
  generatedContentCreationAllowed: false;
  nextRequiredStep: 'runtime_source_write_guard';
};

export type GeneratedContentImportFormat = {
  kind: 'personal_plan_generated_content_import_format';
  status: 'ready_for_runtime_write_guard' | 'blocked';
  days: GeneratedContentImportDay[];
  sourceRuntimeWriteAllowed: false;
  liveRegistrationAllowed: false;
  generatedContentCreationAllowed: false;
  nextRequiredStep: 'runtime_source_write_guard';
};

export type GeneratedContentImportIssueCode =
  | 'missing_import_day'
  | 'missing_packet_for_intake_row'
  | 'packet_checksum_mismatch'
  | 'duplicate_import_day'
  | 'source_runtime_write_not_allowed'
  | 'live_registration_not_allowed'
  | 'generated_content_creation_not_allowed';

export type GeneratedContentImportValidation = {
  status: 'valid_non_live_import_format' | 'invalid';
  issueCodes: GeneratedContentImportIssueCode[];
  dayCount: number;
  sourceRuntimeWriteAllowed: false;
  liveRegistrationAllowed: false;
  nextRequiredStep: 'runtime_source_write_guard';
};

export type AcceptedCandidateContentPacketImportDay = {
  candidateId: string;
  candidateChecksum: string;
  planId: PersonalPlanId;
  dayIndex: number;
  sourceLabel: string;
  quality: number;
  importStatus: 'ready_for_non_live_packet_format' | 'blocked';
  contentSourceStatus: 'chat_draft_candidate';
  sourceRuntimeWriteAllowed: false;
  liveRegistrationAllowed: false;
  generatedContentCreationAllowed: false;
  productionReady: false;
  nextRequiredStep: 'runtime_source_write_guard';
};

export type AcceptedCandidateContentPacketImportFormat = {
  kind: 'personal_plan_accepted_candidate_content_packet_import_format';
  status: 'ready_for_runtime_source_write_guard' | 'blocked';
  importDays: AcceptedCandidateContentPacketImportDay[];
  totalCandidateDays: number;
  acceptedRows: number;
  blockedRows: number;
  sourceRuntimeWriteAllowed: false;
  liveRegistrationAllowed: false;
  generatedContentCreationAllowed: false;
  productionReady: false;
  nextRequiredStep: 'runtime_source_write_guard' | 'accepted_candidate_source_intake_rework';
};

export type AcceptedCandidateContentPacketImportIssueCode =
  | 'source_intake_preflight_not_ready'
  | 'missing_import_day'
  | 'candidate_not_accepted_for_import_format'
  | 'candidate_checksum_mismatch'
  | 'duplicate_import_day'
  | 'source_runtime_write_not_allowed'
  | 'live_registration_not_allowed'
  | 'generated_content_creation_not_allowed'
  | 'production_ready_not_allowed';

export type AcceptedCandidateContentPacketImportValidation = {
  status: 'valid_non_live_content_packet_import_format' | 'invalid';
  issueCodes: AcceptedCandidateContentPacketImportIssueCode[];
  totalCandidateDays: number;
  importDayCount: number;
  sourceRuntimeWriteAllowed: false;
  liveRegistrationAllowed: false;
  nextRequiredStep: AcceptedCandidateContentPacketImportFormat['nextRequiredStep'];
};

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function packetById(packets: GeneratedPersonalPlanDayPacket[]): Map<string, GeneratedPersonalPlanDayPacket> {
  return new Map(packets.map((packet) => [packet.packetId, packet]));
}

function hasValidChecksum(value: string): boolean {
  return /^[a-f0-9]{16}$/.test(value) && value !== '0000000000000000';
}

export function buildGeneratedContentImportFormat(
  preflight: GeneratedPacketSourceIntakePreflight,
  packets: GeneratedPersonalPlanDayPacket[],
): GeneratedContentImportFormat {
  const packetsById = packetById(packets);
  const days: GeneratedContentImportDay[] = [];

  for (const row of preflight.rows) {
    if (row.intakeStatus !== 'accepted_for_import_format_design') continue;
    const packet = packetsById.get(row.packetId);
    if (!packet) continue;

    days.push({
      packetId: row.packetId,
      packetChecksum: row.packetChecksum,
      planId: packet.planId,
      dayIndex: packet.dayIndex,
      weekIndex: packet.weekIndex,
      dayTheme: packet.dayTheme,
      weekRole: packet.weekRole,
      taskModes: packet.taskModes.filter((mode): mode is PersonalPlanGenerationMode =>
        mode !== 'lesson' && mode !== 'linked_lesson_slice',
      ),
      phrases: packet.phrases,
      recallLinks: packet.recallLinks,
      audioNeeds: packet.audioNeeds,
      pronunciationNeeds: packet.pronunciationNeeds,
      blockers: packet.blockers,
      sourceRuntimeWriteAllowed: false,
      liveRegistrationAllowed: false,
      generatedContentCreationAllowed: false,
      nextRequiredStep: 'runtime_source_write_guard',
    });
  }

  return {
    kind: 'personal_plan_generated_content_import_format',
    status: days.length === preflight.rows.length && days.length > 0 ? 'ready_for_runtime_write_guard' : 'blocked',
    days,
    sourceRuntimeWriteAllowed: false,
    liveRegistrationAllowed: false,
    generatedContentCreationAllowed: false,
    nextRequiredStep: 'runtime_source_write_guard',
  };
}

export function validateGeneratedContentImportFormat(
  format: GeneratedContentImportFormat,
): GeneratedContentImportValidation {
  const issueCodes: GeneratedContentImportIssueCode[] = [];

  if ((format as { sourceRuntimeWriteAllowed?: boolean }).sourceRuntimeWriteAllowed) {
    issueCodes.push('source_runtime_write_not_allowed');
  }
  if ((format as { liveRegistrationAllowed?: boolean }).liveRegistrationAllowed) {
    issueCodes.push('live_registration_not_allowed');
  }
  if ((format as { generatedContentCreationAllowed?: boolean }).generatedContentCreationAllowed) {
    issueCodes.push('generated_content_creation_not_allowed');
  }

  if (format.days.length === 0) {
    issueCodes.push('missing_import_day');
  }

  const seenDayIds = new Set<string>();
  for (const day of format.days) {
    const dayId = `${day.planId}:${day.dayIndex}`;
    if (seenDayIds.has(dayId)) {
      issueCodes.push('duplicate_import_day');
    }
    seenDayIds.add(dayId);

    if ((day as { sourceRuntimeWriteAllowed?: boolean }).sourceRuntimeWriteAllowed) {
      issueCodes.push('source_runtime_write_not_allowed');
    }
    if ((day as { liveRegistrationAllowed?: boolean }).liveRegistrationAllowed) {
      issueCodes.push('live_registration_not_allowed');
    }
    if ((day as { generatedContentCreationAllowed?: boolean }).generatedContentCreationAllowed) {
      issueCodes.push('generated_content_creation_not_allowed');
    }
    if (!hasValidChecksum(day.packetChecksum)) {
      issueCodes.push('packet_checksum_mismatch');
    }
  }

  const uniqueCodes = unique(issueCodes);
  return {
    status: uniqueCodes.length === 0 ? 'valid_non_live_import_format' : 'invalid',
    issueCodes: uniqueCodes,
    dayCount: format.days.length,
    sourceRuntimeWriteAllowed: false,
    liveRegistrationAllowed: false,
    nextRequiredStep: 'runtime_source_write_guard',
  };
}

export function buildAcceptedCandidateContentPacketImportFormat(
  preflight: AcceptedCandidateSourceIntakePreflight,
): AcceptedCandidateContentPacketImportFormat {
  const preflightReady = preflight.status === 'ready_for_content_packet_import_format'
    && preflight.nextRequiredStep === 'content_packet_import_format'
    && preflight.blockedRows === 0
    && !preflight.sourceRuntimeWriteAllowed
    && !preflight.liveRegistrationAllowed
    && !preflight.generatedContentCreationAllowed
    && !preflight.productionReady;

  const importDays = preflight.rows.map((row): AcceptedCandidateContentPacketImportDay => {
    const accepted = preflightReady && row.intakeStatus === 'accepted_for_content_packet_import_format';
    return {
      candidateId: row.candidateId,
      candidateChecksum: row.candidateChecksum,
      planId: row.planId,
      dayIndex: row.dayIndex,
      sourceLabel: row.sourceLabel,
      quality: row.quality,
      importStatus: accepted ? 'ready_for_non_live_packet_format' : 'blocked',
      contentSourceStatus: 'chat_draft_candidate',
      sourceRuntimeWriteAllowed: false,
      liveRegistrationAllowed: false,
      generatedContentCreationAllowed: false,
      productionReady: false,
      nextRequiredStep: 'runtime_source_write_guard',
    };
  });

  const blockedRows = importDays.filter((day) => day.importStatus === 'blocked').length;
  const acceptedRows = importDays.length - blockedRows;

  return {
    kind: 'personal_plan_accepted_candidate_content_packet_import_format',
    status: preflightReady && blockedRows === 0 && importDays.length > 0
      ? 'ready_for_runtime_source_write_guard'
      : 'blocked',
    importDays,
    totalCandidateDays: preflight.totalCandidateDays,
    acceptedRows,
    blockedRows,
    sourceRuntimeWriteAllowed: false,
    liveRegistrationAllowed: false,
    generatedContentCreationAllowed: false,
    productionReady: false,
    nextRequiredStep: preflightReady && blockedRows === 0
      ? 'runtime_source_write_guard'
      : 'accepted_candidate_source_intake_rework',
  };
}

export function validateAcceptedCandidateContentPacketImportFormat(
  format: AcceptedCandidateContentPacketImportFormat,
): AcceptedCandidateContentPacketImportValidation {
  const issueCodes: AcceptedCandidateContentPacketImportIssueCode[] = [];

  if (format.status !== 'ready_for_runtime_source_write_guard') {
    issueCodes.push('source_intake_preflight_not_ready');
  }
  if ((format as { sourceRuntimeWriteAllowed?: boolean }).sourceRuntimeWriteAllowed) {
    issueCodes.push('source_runtime_write_not_allowed');
  }
  if ((format as { liveRegistrationAllowed?: boolean }).liveRegistrationAllowed) {
    issueCodes.push('live_registration_not_allowed');
  }
  if ((format as { generatedContentCreationAllowed?: boolean }).generatedContentCreationAllowed) {
    issueCodes.push('generated_content_creation_not_allowed');
  }
  if ((format as { productionReady?: boolean }).productionReady) {
    issueCodes.push('production_ready_not_allowed');
  }
  if (format.importDays.length === 0 || format.importDays.length !== format.totalCandidateDays) {
    issueCodes.push('missing_import_day');
  }

  const seenDayIds = new Set<string>();
  for (const day of format.importDays) {
    const dayId = `${day.planId}:${day.dayIndex}`;
    if (seenDayIds.has(dayId)) {
      issueCodes.push('duplicate_import_day');
    }
    seenDayIds.add(dayId);

    if (day.importStatus !== 'ready_for_non_live_packet_format') {
      issueCodes.push('candidate_not_accepted_for_import_format');
    }
    if (!hasValidChecksum(day.candidateChecksum)) {
      issueCodes.push('candidate_checksum_mismatch');
    }
    if ((day as { sourceRuntimeWriteAllowed?: boolean }).sourceRuntimeWriteAllowed) {
      issueCodes.push('source_runtime_write_not_allowed');
    }
    if ((day as { liveRegistrationAllowed?: boolean }).liveRegistrationAllowed) {
      issueCodes.push('live_registration_not_allowed');
    }
    if ((day as { generatedContentCreationAllowed?: boolean }).generatedContentCreationAllowed) {
      issueCodes.push('generated_content_creation_not_allowed');
    }
    if ((day as { productionReady?: boolean }).productionReady) {
      issueCodes.push('production_ready_not_allowed');
    }
  }

  const uniqueCodes = unique(issueCodes);
  return {
    status: uniqueCodes.length === 0 ? 'valid_non_live_content_packet_import_format' : 'invalid',
    issueCodes: uniqueCodes,
    totalCandidateDays: format.totalCandidateDays,
    importDayCount: format.importDays.length,
    sourceRuntimeWriteAllowed: false,
    liveRegistrationAllowed: false,
    nextRequiredStep: format.nextRequiredStep,
  };
}
