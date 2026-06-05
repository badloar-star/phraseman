import type { AcceptedCandidateSourceIntakePreflight } from '../app/personal_plan_generation_source_intake_preflight';
import {
  buildAcceptedCandidateContentPacketImportFormat,
  validateAcceptedCandidateContentPacketImportFormat,
} from '../app/personal_plan_generation_import_format';

const PLAN_IDS = ['voyazh', 'mitap', 'gavan', 'impuls', 'echo'] as const;

function preflight(): AcceptedCandidateSourceIntakePreflight {
  const rows = PLAN_IDS.flatMap((planId) =>
    Array.from({ length: 28 }, (_, index) => {
      const dayIndex = index + 1;
      return {
        candidateId: `${planId}_d${String(dayIndex).padStart(3, '0')}_chat_draft_candidate`,
        candidateChecksum: `${(dayIndex + planId.length).toString(16).padStart(8, '0')}${(dayIndex * 17).toString(16).padStart(8, '0')}`,
        planId,
        dayIndex,
        sourceLabel: `${planId} Day ${dayIndex}`,
        quality: 92,
        qualityDecision: 'accepted_for_source_intake_candidate' as const,
        intakeStatus: 'accepted_for_content_packet_import_format' as const,
        sourceRuntimeWriteAllowed: false as const,
        liveRegistrationAllowed: false as const,
        generatedContentCreationAllowed: false as const,
        productionReady: false as const,
        nextRequiredStep: 'content_packet_import_format' as const,
      };
    }),
  );

  return {
    kind: 'personal_plan_accepted_candidate_source_intake_preflight',
    status: 'ready_for_content_packet_import_format',
    rows,
    totalCandidateDays: 140,
    acceptedRows: 140,
    blockedRows: 0,
    sourceRuntimeWriteAllowed: false,
    liveRegistrationAllowed: false,
    generatedContentCreationAllowed: false,
    productionReady: false,
    nextRequiredStep: 'content_packet_import_format',
  };
}

describe('accepted candidate content packet import format', () => {
  it('converts 140 accepted candidates into a non-live content packet import format', () => {
    const format = buildAcceptedCandidateContentPacketImportFormat(preflight());

    expect(format.kind).toBe('personal_plan_accepted_candidate_content_packet_import_format');
    expect(format.status).toBe('ready_for_runtime_source_write_guard');
    expect(format.totalCandidateDays).toBe(140);
    expect(format.importDays).toHaveLength(140);
    expect(format.sourceRuntimeWriteAllowed).toBe(false);
    expect(format.liveRegistrationAllowed).toBe(false);
    expect(format.generatedContentCreationAllowed).toBe(false);
    expect(format.productionReady).toBe(false);
    expect(format.nextRequiredStep).toBe('runtime_source_write_guard');
    expect(format.importDays[0]).toEqual(expect.objectContaining({
      candidateId: 'voyazh_d001_chat_draft_candidate',
      planId: 'voyazh',
      dayIndex: 1,
      importStatus: 'ready_for_non_live_packet_format',
      contentSourceStatus: 'chat_draft_candidate',
      sourceRuntimeWriteAllowed: false,
      liveRegistrationAllowed: false,
      productionReady: false,
      nextRequiredStep: 'runtime_source_write_guard',
    }));
  });

  it('validates day coverage, checksums, duplicates, and fake readiness flags', () => {
    const format = buildAcceptedCandidateContentPacketImportFormat(preflight());

    expect(validateAcceptedCandidateContentPacketImportFormat(format)).toEqual({
      status: 'valid_non_live_content_packet_import_format',
      issueCodes: [],
      totalCandidateDays: 140,
      importDayCount: 140,
      sourceRuntimeWriteAllowed: false,
      liveRegistrationAllowed: false,
      nextRequiredStep: 'runtime_source_write_guard',
    });

    expect(validateAcceptedCandidateContentPacketImportFormat({
      ...format,
      productionReady: true as any,
    }).issueCodes).toContain('production_ready_not_allowed');

    expect(validateAcceptedCandidateContentPacketImportFormat({
      ...format,
      importDays: [{ ...format.importDays[0], candidateChecksum: '0000000000000000' }],
    }).issueCodes).toContain('candidate_checksum_mismatch');

    expect(validateAcceptedCandidateContentPacketImportFormat({
      ...format,
      importDays: [format.importDays[0], format.importDays[0]],
    }).issueCodes).toContain('duplicate_import_day');

    expect(validateAcceptedCandidateContentPacketImportFormat({
      ...format,
      importDays: format.importDays.slice(1),
    }).issueCodes).toContain('missing_import_day');
  });

  it('blocks preflight rows that are not accepted for content packet import', () => {
    const blocked = preflight();
    blocked.rows[0] = {
      ...blocked.rows[0],
      intakeStatus: 'blocked_by_internal_quality_gate',
    };

    const format = buildAcceptedCandidateContentPacketImportFormat(blocked);

    expect(format.status).toBe('blocked');
    expect(format.blockedRows).toBe(1);
    expect(validateAcceptedCandidateContentPacketImportFormat(format).issueCodes).toContain('candidate_not_accepted_for_import_format');
  });
});
